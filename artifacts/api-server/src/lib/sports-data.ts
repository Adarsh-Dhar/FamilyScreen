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
  competition: string;
  homeScore: number;
  awayScore: number;
  elapsedMinutes: number;
  status: "live" | "finished" | "scheduled";
  events: MatchEvent[];
  commentary: CommentaryEntry[];
  winProbabilityHistory: WinProbabilitySnapshot[];
  currentWinProbability: { home: number; away: number };
};

export type Match = {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  competition: string;
  homeScore: number;
  awayScore: number;
  elapsedMinutes: number;
  status: "live" | "finished" | "scheduled";
};

const matches = new Map<string, MatchState>();

function calculateWinProbability(
  homeScore: number,
  awayScore: number,
  elapsedMinutes: number,
  homeTeam: string,
  awayTeam: string
): { home: number; away: number } {
  const scoreDifferential = homeScore - awayScore;
  const timeWeight = Math.min(elapsedMinutes / 90, 1);
  const homeAdvantage = 0.05;
  
  let homeProb = 0.5 + homeAdvantage + (scoreDifferential * 0.15 * timeWeight);
  homeProb = Math.max(0.05, Math.min(0.95, homeProb));
  
  return {
    home: Math.round(homeProb * 100) / 100,
    away: Math.round((1 - homeProb) * 100) / 100,
  };
}

async function fetchLiveFixtures(): Promise<Match[]> {
  const apiKey = process.env.API_FOOTBALL_KEY;
  if (!apiKey) {
    return [];
  }

  try {
    const response = await fetch("https://api-football-v1.p.rapidapi.com/v3/fixtures?live=all", {
      headers: {
        "x-rapidapi-key": apiKey,
        "x-rapidapi-host": "api-football-v1.p.rapidapi.com",
      },
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json() as { response?: Array<{ fixture: { id: number }; teams: { home: { name: string }; away: { name: string } }; league: { name: string }; goals: { home: number | null; away: number | null }; status: { elapsed: number | null; short: string } }> };
    
    return (data.response ?? []).map((item) => ({
      matchId: String(item.fixture.id),
      homeTeam: item.teams.home.name,
      awayTeam: item.teams.away.name,
      competition: item.league.name,
      homeScore: item.goals.home ?? 0,
      awayScore: item.goals.away ?? 0,
      elapsedMinutes: item.status.elapsed ?? 0,
      status: item.status.short === "FT" ? "finished" : item.status.short === "NS" ? "scheduled" : "live",
    }));
  } catch (error) {
    return [];
  }
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
    competition: match.competition,
    homeScore: match.homeScore,
    awayScore: match.awayScore,
    elapsedMinutes: match.elapsedMinutes,
    status: match.status,
    events: [],
    commentary: [],
    winProbabilityHistory: [],
    currentWinProbability: calculateWinProbability(
      match.homeScore,
      match.awayScore,
      match.elapsedMinutes,
      match.homeTeam,
      match.awayTeam
    ),
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
    
    const newWinProbability = calculateWinProbability(
      match.homeScore,
      match.awayScore,
      match.elapsedMinutes,
      match.homeTeam,
      match.awayTeam
    );
    
    if (!oldState || 
        oldState.currentWinProbability.home !== newWinProbability.home ||
        oldState.currentWinProbability.away !== newWinProbability.away) {
      newState.currentWinProbability = newWinProbability;
      newState.winProbabilityHistory.push({
        home: newWinProbability.home,
        away: newWinProbability.away,
        timestamp: new Date(),
      });
    }
    
    matches.set(match.matchId, newState);
    
    if (newEvents.length > 0 || 
        (oldState && oldState.currentWinProbability.home !== newWinProbability.home)) {
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
