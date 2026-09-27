import { guardedCall as multiSportGuardedCall } from "./sports/core/guarded-call";
import { getSportEndpoint } from "./sports/endpoints";
import type { SportId } from "./sports/registry";
import { generateMatchPrediction, type MatchPrediction } from "./predict";
import { guardedCall } from "./football-agent/guarded-call";

// Generic sport types
export type GameEvent = {
  type: "score" | "timeout" | "foul" | "substitution" | "whistle" | "goal" | "card";
  team: "home" | "away";
  minute: number;
  description: string;
};

export type CommentaryEntry = {
  id: string;
  timestamp: Date;
  text: string;
};

export type GameState = {
  gameId: string;
  sportId: SportId;
  homeTeam: string;
  awayTeam: string;
  homeTeamId: number;
  awayTeamId: number;
  leagueId: number;
  season: number;
  competition: string;
  homeScore: number | { total: number };
  awayScore: number | { total: number };
  elapsedMinutes: number;
  status: "live" | "finished" | "scheduled";
  events: GameEvent[];
  commentary: CommentaryEntry[];
  // Football-specific prediction data
  aiPrediction: MatchPrediction | null;
  aiPredictionStatus: "loading" | "ready" | "unavailable";
  currentWinProbability: { home: number; away: number };
  winProbabilityHistory: Array<{ home: number; away: number; timestamp: Date }>;
};

export type GameSummary = {
  gameId: string;
  sportId: SportId;
  homeTeam: string;
  awayTeam: string;
  homeTeamId: number;
  awayTeamId: number;
  leagueId: number;
  season: number;
  competition: string;
  homeScore: number | { total: number };
  awayScore: number | { total: number };
  elapsedMinutes: number;
  status: "live" | "finished" | "scheduled";
};

// Multi-sport storage
const sportGames = new Map<string, Map<string, GameState>>(); // sportId -> gameId -> state
const predictedFixtures = new Map<string, Set<string>>(); // sportId -> gameIds

// Football-specific types (for backward compatibility)
export type MatchEvent = GameEvent;
export type MatchState = GameState;
export type Match = GameSummary;

// Football-specific storage (for backward compatibility)
const matches = new Map<string, GameState>();

type LiveGameItem = {
  id: number;
  teams: { home: { id: number; name: string }; away: { id: number; name: string } };
  league: { id: number; name: string; season: number };
  scores: { home: number | null | { total: number }; away: number | null | { total: number } };
  status?: { elapsed: number | null; short: string };
};

/**
 * Generic function to fetch games for any sport
 */
async function fetchGames(sportId: SportId, statusFilter: "live" | "past" | "all" = "live"): Promise<GameSummary[]> {
  const endpointKey = "games.live";
  const endpointDef = getSportEndpoint(sportId, endpointKey);
  
  // Different sports have different API patterns
  let params: Record<string, string | number | boolean> = {};
  // Free plan only has access to seasons 2022-2024
  const availableYear = 2024;
  
  if (sportId === "football") {
    params = { live: "all" };
  } else if (sportId === "baseball") {
    // Baseball requires league and season parameters (plain year format)
    params = { league: 1, season: availableYear }; // MLB league ID 1
  } else if (sportId === "basketball") {
    // Basketball uses season format like "2023-2024"
    params = { league: 12, season: `${availableYear - 1}-${availableYear}` }; // NBA league ID 12
  } else if (sportId === "nba") {
    // NBA (dedicated API) requires season parameter
    params = { season: `${availableYear - 1}-${availableYear}` };
  } else if (sportId === "hockey") {
    // Hockey uses season format like "2023-2024"
    params = { league: 57, season: `${availableYear - 1}-${availableYear}` }; // NHL league ID 57
  } else if (sportId === "nfl") {
    // NFL uses plain year format
    params = { league: 1, season: availableYear }; // NFL league ID 1
  } else if (sportId === "handball") {
    params = { league: 1, season: availableYear }; // Default handball league
  } else if (sportId === "volleyball") {
    params = { league: 1, season: availableYear }; // Default volleyball league
  } else if (sportId === "rugby") {
    params = { league: 1, season: availableYear }; // Default rugby league
  } else if (sportId === "afl") {
    params = { league: 1, season: availableYear }; // AFL league ID 1
  } else {
    // Default to live parameter for other sports
    params = { live: "all" };
  }
  
  const result = await multiSportGuardedCall<LiveGameItem[]>(
    sportId,
    endpointKey,
    endpointDef.path,
    endpointDef,
    params,
    { isLivePollCall: true }
  );
  
  if (!result.ok || !result.data) {
    return [];
  }

  // Filter games based on status filter
  const filteredGames = result.data.filter((item) => {
    const status = item.status?.short;
    const finishedStatuses = ["FT", "AET", "PEN", "CAN", "ABD", "PST", "SUSP"];
    
    if (statusFilter === "live") {
      // Include live games and not-started games (upcoming)
      return status && !finishedStatuses.includes(status);
    } else if (statusFilter === "past") {
      // Include only finished games
      return status && finishedStatuses.includes(status);
    } else {
      // Include all games
      return status !== undefined;
    }
  });

  return filteredGames.map((item) => {
    // Handle different score formats across sports
    let homeScore = 0;
    let awayScore = 0;
    
    if (sportId === "baseball") {
      // Baseball has nested score structure
      homeScore = (item.scores.home as any)?.total ?? 0;
      awayScore = (item.scores.away as any)?.total ?? 0;
    } else {
      // Default score structure
      homeScore = item.scores.home ?? 0;
      awayScore = item.scores.away ?? 0;
    }
    
    return {
      gameId: String(item.id),
      sportId,
      homeTeam: item.teams.home.name,
      awayTeam: item.teams.away.name,
      homeTeamId: item.teams.home.id,
      awayTeamId: item.teams.away.id,
      leagueId: item.league.id,
      season: item.league.season,
      competition: item.league.name,
      homeScore,
      awayScore,
      elapsedMinutes: item.status?.elapsed ?? 0,
      status: item.status?.short === "FT" ? "finished" : item.status?.short === "NS" ? "scheduled" : "live",
    };
  });
}

function getOrInitializeGameState(game: GameSummary): GameState {
  const sportGamesMap = sportGames.get(game.sportId);
  if (!sportGamesMap) {
    sportGames.set(game.sportId, new Map());
  }
  
  const gamesMap = sportGames.get(game.sportId)!;
  const existing = gamesMap.get(game.gameId);
  
  if (existing) {
    return existing;
  }

  const newState: GameState = {
    gameId: game.gameId,
    sportId: game.sportId,
    homeTeam: game.homeTeam,
    awayTeam: game.awayTeam,
    homeTeamId: game.homeTeamId,
    awayTeamId: game.awayTeamId,
    leagueId: game.leagueId,
    season: game.season,
    competition: game.competition,
    homeScore: game.homeScore,
    awayScore: game.awayScore,
    elapsedMinutes: game.elapsedMinutes,
    status: game.status,
    events: [],
    commentary: [],
    aiPrediction: null,
    aiPredictionStatus: "loading",
    currentWinProbability: { home: 0.5, away: 0.5 },
    winProbabilityHistory: [],
  };

  gamesMap.set(game.gameId, newState);
  return newState;
}

function detectGameEventChanges(oldState: GameState, newGame: GameSummary): GameEvent[] {
  const events: GameEvent[] = [];
  
  if (oldState.homeScore !== newGame.homeScore) {
    events.push({
      type: "score",
      team: "home",
      minute: newGame.elapsedMinutes,
      description: `Score! ${newGame.homeTeam} scores`,
    });
  }
  
  if (oldState.awayScore !== newGame.awayScore) {
    events.push({
      type: "score",
      team: "away",
      minute: newGame.elapsedMinutes,
      description: `Score! ${newGame.awayTeam} scores`,
    });
  }

  if (oldState.status !== "finished" && newGame.status === "finished") {
    events.push({
      type: "whistle",
      team: "home",
      minute: newGame.elapsedMinutes,
      description: "Game finished",
    });
  }

  return events;
}

/**
 * Generic poll function for any sport
 */
export async function pollLiveGames(
  sportId: SportId,
  onUpdate: (gameId: string, state: GameState) => void
): Promise<void> {
  const liveGames = await fetchGames(sportId, "live");
  
  const sportPredictedFixtures = predictedFixtures.get(sportId) || new Set();
  predictedFixtures.set(sportId, sportPredictedFixtures);
  
  for (const game of liveGames) {
    const gamesMap = sportGames.get(sportId);
    const oldState = gamesMap?.get(game.gameId);
    const newState = getOrInitializeGameState(game);
    
    // Handle different score formats across sports
    let homeScore = game.homeScore;
    let awayScore = game.awayScore;
    
    if (sportId === "baseball") {
      // Baseball stores scores as objects with total property
      homeScore = (game.homeScore as any)?.total ?? game.homeScore;
      awayScore = (game.awayScore as any)?.total ?? game.awayScore;
    }
    
    newState.homeScore = homeScore;
    newState.awayScore = awayScore;
    newState.elapsedMinutes = game.elapsedMinutes;
    newState.status = game.status;
    
    const newEvents = detectGameEventChanges(oldState ?? newState, game);
    if (newEvents.length > 0) {
      newState.events.push(...newEvents);
    }
    
    // Trigger AI prediction only for football on first sight of a fixture (fire-and-forget)
    if (sportId === "football" && !oldState && !sportPredictedFixtures.has(game.gameId)) {
      sportPredictedFixtures.add(game.gameId);
      
      generateMatchPrediction({
        fixtureId: Number(game.gameId),
        homeTeamId: game.homeTeamId,
        awayTeamId: game.awayTeamId,
        leagueId: game.leagueId,
        season: game.season,
        homeTeamName: game.homeTeam,
        awayTeamName: game.away,
      }).then((prediction) => {
        const state = sportGames.get(sportId)?.get(game.gameId);
        if (state) {
          if (prediction) {
            state.aiPrediction = prediction;
            state.aiPredictionStatus = "ready";
          } else {
            state.aiPredictionStatus = "unavailable";
          }
          if (prediction) {
            state.currentWinProbability = {
              home: prediction.homeWin / 100,
              away: prediction.awayWin / 100,
            };
          }
          onUpdate(game.gameId, state);
        }
      }).catch((error) => {
        console.error(`Failed to generate prediction for ${game.gameId}:`, error);
        const state = sportGames.get(sportId)?.get(game.gameId);
        if (state) {
          state.aiPredictionStatus = "unavailable";
        }
      });
    }
    
    gamesMap?.set(game.gameId, newState);
    
    if (newEvents.length > 0) {
      onUpdate(game.gameId, newState);
    }
  }
}

export function getLiveGames(sportId: SportId): GameSummary[] {
  const gamesMap = sportGames.get(sportId);
  if (!gamesMap) return [];
  
  return Array.from(gamesMap.values())
    .filter((state) => state.status === "live" || state.status === "scheduled")
    .map((state) => {
      // Handle different score formats across sports
      let homeScore = state.homeScore;
      let awayScore = state.awayScore;
      
      if (sportId === "baseball") {
        // Baseball stores scores as objects with total property
        homeScore = (state.homeScore as any)?.total ?? state.homeScore;
        awayScore = (state.awayScore as any)?.total ?? state.awayScore;
      }
      
      return {
        gameId: state.gameId,
        sportId: state.sportId,
        homeTeam: state.homeTeam,
        awayTeam: state.awayTeam,
        homeTeamId: state.homeTeamId,
        awayTeamId: state.awayTeamId,
        leagueId: state.leagueId,
        season: state.season,
        competition: state.competition,
        homeScore,
        awayScore,
        elapsedMinutes: state.elapsedMinutes,
        status: state.status,
      };
    });
}

export async function getPastGames(sportId: SportId): Promise<GameSummary[]> {
  return await fetchGames(sportId, "past");
}

/**
 * Fetch a specific game by ID from the API
 */
export async function fetchGameById(sportId: SportId, gameId: string): Promise<GameState | undefined> {
  const endpointKey = "games.live";
  const endpointDef = getSportEndpoint(sportId, endpointKey);
  
  // API requires id parameter to be used alone (cannot combine with league/season)
  const params: Record<string, string | number | boolean> = { id: parseInt(gameId) };
  
  const result = await multiSportGuardedCall<LiveGameItem[]>(
    sportId,
    endpointKey,
    endpointDef.path,
    endpointDef,
    params,
    { isLivePollCall: false }
  );
  
  if (!result.ok || !result.data || result.data.length === 0) {
    return undefined;
  }

  const item = result.data[0];
  
  // Handle different score formats across sports
  let homeScore = 0;
  let awayScore = 0;
  
  if (sportId === "baseball") {
    homeScore = (item.scores.home as any)?.total ?? 0;
    awayScore = (item.scores.away as any)?.total ?? 0;
  } else {
    homeScore = item.scores.home ?? 0;
    awayScore = item.scores.away ?? 0;
  }
  
  return {
    gameId: String(item.id),
    sportId,
    homeTeam: item.teams.home.name,
    awayTeam: item.teams.away.name,
    homeTeamId: item.teams.home.id,
    awayTeamId: item.teams.away.id,
    leagueId: item.league.id,
    season: item.league.season,
    competition: item.league.name,
    homeScore,
    awayScore,
    elapsedMinutes: item.status?.elapsed ?? 0,
    status: item.status?.short === "FT" ? "finished" : item.status?.short === "NS" ? "scheduled" : "live",
    commentary: [],
  };
}

export function getGameState(sportId: SportId, gameId: string): GameState | undefined {
  return sportGames.get(sportId)?.get(gameId);
}

export function addCommentary(sportId: SportId, gameId: string, text: string): void {
  const state = sportGames.get(sportId)?.get(gameId);
  if (!state) return;
  
  state.commentary.push({
    id: `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
    timestamp: new Date(),
    text,
  });
}

export function getAllGames(sportId: SportId): Map<string, GameState> {
  return sportGames.get(sportId) || new Map();
}

// ========== BACKWARD COMPATIBILITY: Football-specific functions ==========

type LiveFixtureItem = {
  fixture: { id: number };
  teams: { home: { id: number; name: string }; away: { id: number; name: string } };
  league: { id: number; name: string; season: number };
  goals: { home: number | null; away: number | null };
  status?: { elapsed: number | null; short: string };
};

async function fetchLiveFixtures(): Promise<Match[]> {
  const result = await guardedCall<LiveFixtureItem[]>("fixtures.live", { live: "all" }, { isLivePollCall: true });
  if (!result.ok || !result.data) {
    return [];
  }

  return result.data.map((item) => ({
    gameId: String(item.fixture.id),
    sportId: "football" as SportId,
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
  const existing = matches.get(match.gameId);
  if (existing) {
    return existing;
  }

  const newState: MatchState = {
    gameId: match.gameId,
    sportId: match.sportId,
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

  matches.set(match.gameId, newState);
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
    const oldState = matches.get(match.gameId);
    const newState = getOrInitializeMatchState(match);
    
    newState.homeScore = match.homeScore;
    newState.awayScore = match.awayScore;
    newState.elapsedMinutes = match.elapsedMinutes;
    newState.status = match.status;
    
    const newEvents = detectEventChanges(oldState ?? newState, match);
    if (newEvents.length > 0) {
      newState.events.push(...newEvents);
    }
    
    if (!oldState && !predictedFixtures.get("football")?.has(match.gameId)) {
      const footballPredictions = predictedFixtures.get("football") || new Set();
      predictedFixtures.set("football", footballPredictions);
      footballPredictions.add(match.gameId);
      
      generateMatchPrediction({
        fixtureId: Number(match.gameId),
        homeTeamId: match.homeTeamId,
        awayTeamId: match.awayTeamId,
        leagueId: match.leagueId,
        season: match.season,
        homeTeamName: match.homeTeam,
        awayTeamName: match.awayTeam,
      }).then((prediction) => {
        const state = matches.get(match.gameId);
        if (state) {
          if (prediction) {
            state.aiPrediction = prediction;
            state.aiPredictionStatus = "ready";
          } else {
            state.aiPredictionStatus = "unavailable";
          }
          if (prediction) {
            state.currentWinProbability = {
              home: prediction.homeWin / 100,
              away: prediction.awayWin / 100,
            };
          }
          onUpdate(match.gameId, state);
        }
      }).catch((error) => {
        console.error(`Failed to generate prediction for ${match.gameId}:`, error);
        const state = matches.get(match.gameId);
        if (state) {
          state.aiPredictionStatus = "unavailable";
        }
      });
    }
    
    matches.set(match.gameId, newState);
    
    if (newEvents.length > 0) {
      onUpdate(match.gameId, newState);
    }
  }
}

export function getLiveMatches(): Match[] {
  return Array.from(matches.values())
    .filter((state) => state.status === "live")
    .map((state) => ({
      gameId: state.gameId,
      sportId: state.sportId,
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

export function addCommentaryToMatch(matchId: string, text: string): void {
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