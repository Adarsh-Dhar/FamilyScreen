import { guardedCall as multiSportGuardedCall } from "./sports/core/guarded-call";
import { getSportEndpoint } from "./sports/endpoints";
import type { SportId } from "./sports/registry";
import { generateMatchPrediction, generateGamePrediction, type MatchPrediction } from "./predict";
import { getSportDefinition } from "./sports/registry";
import { guardedCall } from "./football-agent/guarded-call";

// Football-specific types for backward compatibility
type LiveFixtureItem = {
  fixture: { id: number };
  teams: { home: { id: number; name: string }; away: { id: number; name: string } };
  league: { id: number; name: string; season: number };
  goals: { home: number | null; away: number | null };
  status?: { elapsed: number | null; short: string };
};

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
  homeScore: number;
  awayScore: number;
  elapsedMinutes: number;
  status: "live" | "finished" | "scheduled";
  events: GameEvent[];
  commentary: CommentaryEntry[];
  // Football-specific prediction data
  aiPrediction: MatchPrediction | null;
  aiPredictionStatus: "loading" | "ready" | "unavailable";
  currentWinProbability: { home: number; away: number; draw: number };
  winProbabilityHistory: Array<{ home: number; away: number; draw: number; timestamp: Date }>;
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
  homeScore: number;
  awayScore: number;
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
  scores: { home: number | null | Record<string, number | null>; away: number | null | Record<string, number | null> };
  status?: { elapsed: number | null; short: string };
};

/**
 * Normalizes a raw score value from any api-sports API into a plain number.
 *
 * Different sports return scores in different shapes:
 *  - football: plain number (or null pre-kickoff)
 *  - baseball: { total }
 *  - basketball/NBA/NFL/handball/etc: { quarter_1, quarter_2, quarter_3, quarter_4, over_time, total }
 *    (period keys vary by sport, e.g. sets/halves, but `total` is always present when scoring has started)
 *
 * Every place we pull a score out of a raw API response MUST go through this — the GameState/
 * GameSummary types (and every screen in vega-app) assume `homeScore`/`awayScore` are numbers,
 * so leaking an unnormalized object out of here crashes the UI with "Objects are not valid as a
 * React child" the moment a non-football, non-baseball sport reports a score.
 */
function normalizeScore(raw: number | null | Record<string, number | null> | undefined): number {
  if (typeof raw === "number") return raw;
  if (raw && typeof raw === "object") {
    if (typeof raw.total === "number") return raw.total;
    // No `total` field (some period-based sports omit it until the game ends) — sum whatever
    // numeric period values are present rather than surfacing the raw object.
    return Object.values(raw).reduce<number>((sum, v) => sum + (typeof v === "number" ? v : 0), 0);
  }
  return 0;
}

/**
 * Fetch MMA fights - individual sport with fighters instead of teams
 */
async function fetchMmaFights(statusFilter: "live" | "past" | "all" = "live"): Promise<GameSummary[]> {
  const endpointKey = "fights";
  const endpointDef = getSportEndpoint("mma", endpointKey);

  let params: Record<string, string | number | boolean> = {};
  const availableYear = 2024;

  if (statusFilter === "live") {
    params = { live: "all" };
  } else {
    params = { year: availableYear };
  }

  let result;
  try {
    result = await multiSportGuardedCall<any[]>(
      "mma",
      endpointKey,
      endpointDef.path,
      endpointDef,
      params,
      { isLivePollCall: statusFilter === "live" }
    );
  } catch (error: any) {
    console.warn(`MMA API error: ${error?.message || 'Unknown error'}`);
    return [];
  }

  if (!result.ok || !result.data) {
    if (!result.ok && result.reason) {
      console.warn(`Failed to fetch MMA fights: ${result.reason}`);
    }
    return [];
  }

  // Transform MMA fight data to GameSummary format
  return result.data
    .filter((item: any) => {
      const status = item.status?.short;
      const finishedStatuses = ["FT", "KO", "SUB", "DEC", "NC", "DQ", "CAN", "ABD", "PST", "SUSP"];

      if (statusFilter === "live") {
        return status && !finishedStatuses.includes(status);
      } else if (statusFilter === "past") {
        return status && finishedStatuses.includes(status);
      } else {
        return status !== undefined;
      }
    })
    .map((item: any) => {
      // MMA has fighters instead of home/away teams
      const fighter1 = item.fighters?.[0] || {};
      const fighter2 = item.fighters?.[1] || {};

      return {
        gameId: String(item.id || item.fight?.id || "unknown"),
        sportId: "mma" as SportId,
        homeTeam: fighter1.name || item.homeTeam || "Fighter 1",
        awayTeam: fighter2.name || item.awayTeam || "Fighter 2",
        homeTeamId: fighter1.id || item.homeTeamId || 0,
        awayTeamId: fighter2.id || item.awayTeamId || 0,
        leagueId: item.league?.id || 0,
        season: item.year || item.season || availableYear,
        competition: item.league?.name || item.event?.name || "MMA",
        homeScore: 0, // MMA doesn't have scores in the traditional sense
        awayScore: 0,
        elapsedMinutes: 0, // MMA doesn't have elapsed time like team sports
        status: ["FT", "KO", "SUB", "DEC", "NC", "DQ", "CAN", "ABD", "PST", "SUSP"].includes(item.status?.short ?? "") ? "finished" : item.status?.short === "NS" ? "scheduled" : "live",
      };
    });
}

/**
 * Fetch Formula 1 races - individual sport with drivers instead of teams
 */
async function fetchFormula1Races(statusFilter: "live" | "past" | "all" = "live"): Promise<GameSummary[]> {
  const endpointKey = "races";
  const endpointDef = getSportEndpoint("formula1", endpointKey);

  let params: Record<string, string | number | boolean> = {};
  const availableYear = 2024;

  // Formula 1 uses the same endpoint for both live and past, filtering by status
  params = { season: availableYear };

  let result;
  try {
    result = await multiSportGuardedCall<any[]>(
      "formula1",
      endpointKey,
      endpointDef.path,
      endpointDef,
      params,
      { isLivePollCall: statusFilter === "live" }
    );
  } catch (error: any) {
    console.warn(`Formula 1 API error: ${error?.message || 'Unknown error'}`);
    return [];
  }

  if (!result.ok || !result.data) {
    if (!result.ok && result.reason) {
      console.warn(`Failed to fetch Formula 1 races: ${result.reason}`);
    }
    return [];
  }

  // Transform F1 race data to GameSummary format
  console.log(`Formula 1 filtering - statusFilter: ${statusFilter}, total races: ${result.data.length}`);

  // Transform F1 race data to GameSummary format
  const finishedStatuses = ["Finished", "Completed", "DNF", "DNS", "DSQ", "Retired"];

  const filtered = result.data.filter((item: any) => {
    // Formula 1 uses status directly, not status.short
    const status = item.status;

    if (statusFilter === "live") {
      return status && !finishedStatuses.includes(status);
    } else if (statusFilter === "past") {
      return status && finishedStatuses.includes(status);
    } else {
      return status !== undefined;
    }
  });

  return filtered.map((item: any) => {
    // F1 has circuits and drivers, not home/away teams
    // Use the grand prix name as the competition and circuit as context
    const circuit = item.circuit || {};
    const competition = item.competition?.name || circuit.name || "Formula 1";

    return {
      gameId: String(item.id || item.competition?.id || "unknown"),
      sportId: "formula1" as SportId,
      homeTeam: competition, // Use GP name instead of fake driver
      awayTeam: circuit.name || "Circuit", // Use circuit name instead of fake driver
      homeTeamId: 0, // F1 doesn't have team IDs in the traditional sense
      awayTeamId: 0,
      leagueId: circuit.id || item.competition?.id || 0,
      season: item.season || availableYear,
      competition,
      homeScore: 0, // F1 doesn't have scores
      awayScore: 0,
      elapsedMinutes: 0, // F1 doesn't have elapsed time like team sports
      status: finishedStatuses.includes(item.status) ? "finished" : item.status === "NS" ? "scheduled" : "live",
    };
  });
}

/**
 * Generic function to fetch games for any sport
 */
async function fetchGames(sportId: SportId, statusFilter: "live" | "past" | "all" = "live"): Promise<GameSummary[]> {
  // Handle individual sports (MMA, Formula 1) separately
  if (sportId === "mma") {
    return fetchMmaFights(statusFilter);
  }
  if (sportId === "formula1") {
    return fetchFormula1Races(statusFilter);
  }

  let params: Record<string, string | number | boolean> = {};
  const availableYear = 2024;

  // Set parameters based on sport
  if (sportId === "football") {
    // Football uses the football-agent system (guardedCall)
    const footballEndpointKey = statusFilter === "live" ? "fixtures.live" : "fixtures.list";
    if (statusFilter === "past") {
      params = { season: availableYear, last: 100 };
    } else if (statusFilter === "live") {
      params = { live: "all" };
    } else {
      params = { season: availableYear };
    }
    try {
      const result = await guardedCall<any[]>(footballEndpointKey, params, { isLivePollCall: statusFilter === "live" });
      if (!result.ok || !result.data) {
        if (!result.ok && result.reason) {
          console.warn(`Failed to fetch games for ${sportId}: ${result.reason}`);
        }
        return [];
      }
      // Transform football-agent response to GameSummary format
      return result.data.map((item) => ({
        gameId: String(item.fixture?.id || item.id),
        sportId: "football" as SportId,
        homeTeam: item.teams?.home?.name || item.homeTeam,
        awayTeam: item.teams?.away?.name || item.awayTeam,
        homeTeamId: item.teams?.home?.id || item.homeTeamId || 0,
        awayTeamId: item.teams?.away?.id || item.awayTeamId || 0,
        leagueId: item.league?.id || item.leagueId || 0,
        season: item.league?.season || item.season || availableYear,
        competition: item.league?.name || item.competition || "Competition",
        homeScore: normalizeScore(item.goals?.home ?? item.scores?.home),
        awayScore: normalizeScore(item.goals?.away ?? item.scores?.away),
        elapsedMinutes: item.status?.elapsed ?? 0,
        status: item.status?.short === "FT" ? "finished" : item.status?.short === "NS" ? "scheduled" : "live",
      }));
    } catch (error: any) {
      // Handle rate limiting (429) and other errors gracefully
      console.warn(`Football API error (${error?.status || 'unknown'}): ${error?.message || 'Unknown error'}`);
      return [];
    }
  }

  // For other team sports, use a unified approach
  let endpointKey = "games";
  const endpointDef = getSportEndpoint(sportId, endpointKey);

  if (sportId === "baseball") {
    params = { league: 1, season: availableYear };
  } else if (sportId === "basketball") {
    params = { league: 12, season: `${availableYear - 1}-${availableYear}` };
  } else if (sportId === "nba") {
    // NBA uses a different endpoint for live games
    if (statusFilter === "live") {
      endpointKey = "games.live";
      params = { season: availableYear };
    } else {
      params = { season: availableYear };
    }
  } else if (sportId === "hockey") {
    params = { league: 57, season: availableYear };
  } else if (sportId === "nfl") {
    params = { league: 1, season: availableYear };
  } else if (sportId === "handball") {
    params = { league: 1, season: availableYear };
  } else if (sportId === "volleyball") {
    params = { league: 1, season: availableYear };
  } else if (sportId === "rugby") {
    params = { league: 1, season: availableYear };
  } else if (sportId === "afl") {
    params = { league: 1, season: availableYear };
  } else {
    params = { season: availableYear };
  }

  // Re-fetch endpointDef if we changed endpointKey for NBA
  if (sportId === "nba" && statusFilter === "live") {
    const liveEndpointDef = getSportEndpoint(sportId, endpointKey);
    const result = await multiSportGuardedCall<any[]>(
      sportId,
      endpointKey,
      liveEndpointDef.path,
      liveEndpointDef,
      params,
      { isLivePollCall: true }
    );
    if (!result.ok || !result.data) {
      if (!result.ok && result.reason) {
        console.warn(`Failed to fetch games for ${sportId}: ${result.reason}`);
      }
      return [];
    }
    return transformGameData(result.data, sportId, statusFilter);
  }

  let result;
  try {
    result = await multiSportGuardedCall<LiveGameItem[]>(
      sportId,
      endpointKey,
      endpointDef.path,
      endpointDef,
      params,
      { isLivePollCall: statusFilter === "live" }
    );
  } catch (error: any) {
    console.warn(`API error for ${sportId}: ${error?.message || 'Unknown error'}`);
    return [];
  }

  if (!result.ok || !result.data) {
    if (!result.ok && result.reason) {
      console.warn(`Failed to fetch games for ${sportId}: ${result.reason}`);
    }
    return [];
  }

  return transformGameData(result.data, sportId, statusFilter);
}

/**
 * Transform raw game data into GameSummary format
 */
function transformGameData(data: any[], sportId: SportId, statusFilter: "live" | "past" | "all"): GameSummary[] {
  const finishedStatuses = ["FT", "AET", "PEN", "CAN", "ABD", "PST", "SUSP", "AOT", "AP"];

  return data
    .filter((item: any) => {
      const status = item.status?.short;

      if (statusFilter === "live") {
        return status && !finishedStatuses.includes(status);
      } else if (statusFilter === "past") {
        return status && finishedStatuses.includes(status);
      } else {
        return status !== undefined;
      }
    })
    .map((item: any) => {
      const homeScore = normalizeScore(item.scores?.home);
      const awayScore = normalizeScore(item.scores?.away);

      // Generate a unique gameId if id is missing (AFL case)
      const uniqueId = item.id || item.game?.id || `${item.teams?.home?.id}-${item.teams?.away?.id}-${item.date || Date.now()}`;

      return {
        gameId: String(uniqueId),
        sportId,
        homeTeam: item.teams?.home?.name || "Home Team",
        awayTeam: item.teams?.away?.name || "Away Team",
        homeTeamId: item.teams?.home?.id || 0,
        awayTeamId: item.teams?.away?.id || 0,
        leagueId: item.league?.id || 0,
        season: item.league?.season || 2024,
        competition: item.league?.name || "Competition",
        homeScore,
        awayScore,
        elapsedMinutes: item.status?.elapsed ?? 0,
        status: finishedStatuses.includes(item.status?.short ?? "") ? "finished" : item.status?.short === "NS" ? "scheduled" : "live",
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

  const sportDef = getSportDefinition(game.sportId);
  const hasPredictions = sportDef.hasPredictions;

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
    aiPredictionStatus: hasPredictions ? "loading" : "unavailable",
    currentWinProbability: { home: 0.5, away: 0.5, draw: 0 },
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
  try {
    const liveGames = await fetchGames(sportId, "live");

    const sportDef = getSportDefinition(sportId);
    const hasPredictions = sportDef.hasPredictions;

    const sportPredictedFixtures = predictedFixtures.get(sportId) || new Set();
    predictedFixtures.set(sportId, sportPredictedFixtures);

    for (const game of liveGames) {
      const gamesMap = sportGames.get(sportId);
      const oldState = gamesMap?.get(game.gameId);
      const newState = getOrInitializeGameState(game);

      // `game` came from fetchGames(), which already normalized scores via normalizeScore() —
      // no per-sport handling needed here.
      newState.homeScore = game.homeScore;
      newState.awayScore = game.awayScore;
      newState.elapsedMinutes = game.elapsedMinutes;
      newState.status = game.status;

      const newEvents = detectGameEventChanges(oldState ?? newState, game);
      if (newEvents.length > 0) {
        newState.events.push(...newEvents);
      }

      // Trigger AI prediction for any sport with predictions enabled on first sight of a fixture (fire-and-forget)
      if (hasPredictions && !oldState && !sportPredictedFixtures.has(game.gameId)) {
        sportPredictedFixtures.add(game.gameId);

      generateGamePrediction(sportId, {
        fixtureId: Number(game.gameId),
        homeTeamId: game.homeTeamId,
        awayTeamId: game.awayTeamId,
        leagueId: game.leagueId,
        season: game.season,
        homeTeamName: game.homeTeam,
        awayTeamName: game.awayTeam,
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
              draw: prediction.draw / 100,
            };
          }
          onUpdate(game.gameId, state);
        }
      }).catch((error) => {
        // Silently handle prediction errors to avoid log spam
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
  } catch (error: any) {
    console.warn(`Failed to poll live games for ${sportId}: ${error?.message || 'Unknown error'}`);
  }
}

export function getLiveGames(sportId: SportId): GameSummary[] {
  const gamesMap = sportGames.get(sportId);
  if (!gamesMap) return [];
  
  return Array.from(gamesMap.values())
    .filter((state) => state.status === "live" || state.status === "scheduled")
    .map((state) => {
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
        homeScore: normalizeScore(state.homeScore as unknown as number | Record<string, number>),
        awayScore: normalizeScore(state.awayScore as unknown as number | Record<string, number>),
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
  const homeScore = normalizeScore(item.scores.home);
  const awayScore = normalizeScore(item.scores.away);

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
    status: ["FT", "AET", "PEN", "CAN", "ABD", "PST", "SUSP", "AOT", "AP"].includes(item.status?.short ?? "") ? "finished" : item.status?.short === "NS" ? "scheduled" : "live",
    commentary: [],
    events: [],
    aiPrediction: null,
    aiPredictionStatus: "unavailable",
    currentWinProbability: { home: 0, away: 0, draw: 0 },
    winProbabilityHistory: [],
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

async function fetchLiveFixtures(): Promise<Match[]> {
  const result = await guardedCall<LiveFixtureItem[]>("fixtures.live", { live: "all" }, { isLivePollCall: true });
  if (!result.ok || !result.data) {
    // Log the reason for debugging but don't throw - just return empty array
    if (!result.ok && result.reason) {
      console.warn(`Failed to fetch live fixtures: ${result.reason}`);
    }
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
    homeScore: normalizeScore(item.goals.home),
    awayScore: normalizeScore(item.goals.away),
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
    currentWinProbability: { home: 0.5, away: 0.5, draw: 0 },
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
              draw: prediction.draw / 100,
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