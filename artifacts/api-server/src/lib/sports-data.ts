import { guardedCall } from "./football-agent/guarded-call";
import { generateMatchPrediction, type MatchPrediction } from "./predict";

export type MatchEvent = {
  type: "goal" | "card" | "substitution" | "whistle";
  team: "home" | "away";
  minute: number;
  description: string;
};

export type CommentaryEntry = {
  id: string;
  timestamp: Date;
  text: string;
};

export type WinProbabilitySnapshot = {
  home: number;
  away: number;
  timestamp: Date;
};

export type MatchState = {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  homeTeamId: number;
  awayTeamId: number;
  leagueId: number;
  season: number;
  competition: string;
  homeScore: number;
  awayScore: number;
  elapsedMinutes: number;
  status: "live" | "finished" | "scheduled";
  events: MatchEvent[];
  commentary: CommentaryEntry[];
  winProbabilityHistory: WinProbabilitySnapshot[];
  currentWinProbability: { home: number; away: number };
  aiPrediction: MatchPrediction | null;
  aiPredictionStatus: "loading" | "ready" | "unavailable";
};

export type Match = {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  homeTeamId: number;
  awayTeamId: number;
  leagueId: number;
  season: number;
  competition: string;
  homeScore: number;
  awayScore: number;
  elapsedMinutes: number;
  status: "live" | "finished" | "scheduled";
};

const matches = new Map<string, MatchState>();
const predictedFixtures = new Set<string>(); // Track fixtures we've already predicted

type LiveFixtureItem = {
  fixture: { id: number };
  teams: { home: { id: number; name: string }; away: { id: number; name: string } };
  league: { id: number; name: string; season: number };
  goals: { home: number | null; away: number | null };
  status?: { elapsed: number | null; short: string };
};

/**
 * Routed through `guardedCall` (football-agent) rather than a raw fetch: this respects the
 * account-wide 100/day cap, the reserved live-poll budget, and the 60s cache TTL configured for
 * "fixtures.live" in endpoints.ts, so polling on a short interval doesn't burn quota faster than
 * the cache refreshes.
 */
async function fetchLiveFixtures(): Promise<Match[]> {
  const result = await guardedCall<LiveFixtureItem[]>("fixtures.live", { live: "all" }, { isLivePollCall: true });
  if (!result.ok || !result.data) {
    return [];
  }

  return result.data.map((item) => ({
    matchId: String(item.fixture.id),
    homeTeam: item.teams.home.name,
    awayTeam: item.teams.away.name,
    homeTeamId: item.teams.home.id,
    awayTeamId: item.teams.away.id,
    leagueId: item.league.id,
    season: item.league.season,
    competition: item.league.name,
    homeScore: item.goals.home ?? 0,
    awayScore: item.goals.away ?? 0,
    elapsedMinutes: item.status?.elapsed ?? 0,
    status: item.status?.short === "FT" ? "finished" : item.status?.short === "NS" ? "scheduled" : "live",
  }));
}

function getOrInitializeMatchState(match: Match): MatchState {
  const existing = matches.get(match.matchId);
  if (existing) {
    return existing;
  }

  const newState: MatchState = {
    matchId: match.matchId,
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    homeTeamId: match.homeTeamId,
    awayTeamId: match.awayTeamId,
    leagueId: match.leagueId,
    season: match.season,
    competition: match.competition,
    homeScore: match.homeScore,
    awayScore: match.awayScore,
    elapsedMinutes: match.elapsedMinutes,
    status: match.status,
    events: [],
    commentary: [],
    winProbabilityHistory: [],
    currentWinProbability: { home: 0.5, away: 0.5 },
    aiPrediction: null,
    aiPredictionStatus: "loading",
  };

  matches.set(match.matchId, newState);
  return newState;
}

function detectEventChanges(oldState: MatchState, newMatch: Match): MatchEvent[] {
  const events: MatchEvent[] = [];
  
  if (oldState.homeScore !== newMatch.homeScore) {
    events.push({
      type: "goal",
      team: "home",
      minute: newMatch.elapsedMinutes,
      description: `Goal! ${newMatch.homeTeam} scores`,
    });
  }
  
  if (oldState.awayScore !== newMatch.awayScore) {
    events.push({
      type: "goal",
      team: "away",
      minute: newMatch.elapsedMinutes,
      description: `Goal! ${newMatch.awayTeam} scores`,
    });
  }

  if (oldState.status !== "finished" && newMatch.status === "finished") {
    events.push({
      type: "whistle",
      team: "home",
      minute: newMatch.elapsedMinutes,
      description: "Full time whistle",
    });
  }

  return events;
}

export async function pollLiveMatches(onUpdate: (matchId: string, state: MatchState) => void): Promise<void> {
  const liveMatches = await fetchLiveFixtures();
  
  for (const match of liveMatches) {
    const oldState = matches.get(match.matchId);
    const newState = getOrInitializeMatchState(match);
    
    newState.homeScore = match.homeScore;
    newState.awayScore = match.awayScore;
    newState.elapsedMinutes = match.elapsedMinutes;
    newState.status = match.status;
    
    const newEvents = detectEventChanges(oldState ?? newState, match);
    if (newEvents.length > 0) {
      newState.events.push(...newEvents);
    }
    
    // Trigger AI prediction only on first sight of a fixture (fire-and-forget)
    if (!oldState && !predictedFixtures.has(match.matchId)) {
      predictedFixtures.add(match.matchId);
      
      // Generate prediction in background, don't block the poll
      generateMatchPrediction({
        fixtureId: Number(match.matchId),
        homeTeamId: match.homeTeamId,
        awayTeamId: match.awayTeamId,
        leagueId: match.leagueId,
        season: match.season,
        homeTeamName: match.homeTeam,
        awayTeamName: match.awayTeam,
      }).then((prediction) => {
        const state = matches.get(match.matchId);
        if (state) {
          if (prediction) {
            state.aiPrediction = prediction;
            state.aiPredictionStatus = "ready";
          } else {
            state.aiPredictionStatus = "unavailable";
          }
          // Update win probability from AI prediction
          if (prediction) {
            state.currentWinProbability = {
              home: prediction.homeWin / 100,
              away: prediction.awayWin / 100,
            };
          }
          onUpdate(match.matchId, state);
        }
      }).catch((error) => {
        console.error(`Failed to generate prediction for ${match.matchId}:`, error);
        const state = matches.get(match.matchId);
        if (state) {
          state.aiPredictionStatus = "unavailable";
        }
      });
    }
    
    matches.set(match.matchId, newState);
    
    // Only trigger update on events, not on probability changes
    if (newEvents.length > 0) {
      onUpdate(match.matchId, newState);
    }
  }
}

export function getLiveMatches(): Match[] {
  return Array.from(matches.values())
    .filter((state) => state.status === "live")
    .map((state) => ({
      matchId: state.matchId,
      homeTeam: state.homeTeam,
      awayTeam: state.awayTeam,
      homeTeamId: state.homeTeamId,
      awayTeamId: state.awayTeamId,
      leagueId: state.leagueId,
      season: state.season,
      competition: state.competition,
      homeScore: state.homeScore,
      awayScore: state.awayScore,
      elapsedMinutes: state.elapsedMinutes,
      status: state.status,
    }));
}

export function getMatchState(matchId: string): MatchState | undefined {
  return matches.get(matchId);
}

export function addCommentary(matchId: string, text: string): void {
  const state = matches.get(matchId);
  if (!state) return;
  
  state.commentary.push({
    id: `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
    timestamp: new Date(),
    text,
  });
}

export function getAllMatches(): Map<string, MatchState> {
  return matches;
}
