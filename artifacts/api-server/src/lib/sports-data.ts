import { guardedCall } from "./sports/core/guarded-call";
import { getQuotaManager } from "./sports/core/quota";
import { getSportEndpoint } from "./sports/endpoints";
import { getSportDefinition, PREDICTION_SPORTS, type SportId } from "./sports/registry";
import { mapGame, type GameSummary } from "./sports/mappers";
import { byIdQuery, listQuery, type ListFilter } from "./sports/query";
import type { GameStatus } from "./sports/status";
import { generateGamePrediction, type MatchPrediction } from "./predict";
import { logger } from "./logger";

export type { GameSummary };

export type GameEvent = {
  type: "score" | "goal" | "timeout" | "foul" | "substitution" | "whistle" | "card";
  team: "home" | "away";
  minute: number;
  description: string;
};

export type CommentaryEntry = { id: string; timestamp: Date; text: string };

export type GameState = GameSummary & {
  events: GameEvent[];
  commentary: CommentaryEntry[];
  aiPrediction: MatchPrediction | null;
  aiPredictionStatus: "loading" | "ready" | "unavailable";
  currentWinProbability: { home: number; away: number; draw: number };
  winProbabilityHistory: Array<{ home: number; away: number; draw: number; timestamp: Date }>;
};

export type GameUpdateHandler = (gameId: string, state: GameState) => void;

// ---------------------------------------------------------------- state

const sportGames = new Map<SportId, Map<string, GameState>>();
const predicted = new Map<SportId, Set<string>>();

const MAX_PREDICTIONS_PER_POLL = Number(process.env["MAX_PREDICTIONS_PER_POLL"] ?? 2);

// Each sport has its OWN 100-calls/day quota. Polling 10 sports every minute would burn it in ~100 minutes,
// so only sports somebody has looked at recently are polled, and never more often than POLL_MIN_GAP_MS.
const ACTIVE_WINDOW_MS = Number(process.env["ACTIVE_WINDOW_MS"] ?? 10 * 60_000);
const POLL_MIN_GAP_MS = Number(process.env["POLL_MIN_GAP_MS"] ?? 60_000);
const lastTouched = new Map<SportId, number>();
const lastPolled = new Map<SportId, number>();
let updateHandler: GameUpdateHandler = () => undefined;

export function setUpdateHandler(handler: GameUpdateHandler): void {
  updateHandler = handler;
}
export function touchSport(sportId: SportId): void {
  lastTouched.set(sportId, Date.now());
}
export function isSportActive(sportId: SportId): boolean {
  return Date.now() - (lastTouched.get(sportId) ?? 0) < ACTIVE_WINDOW_MS;
}

function gamesFor(sportId: SportId): Map<string, GameState> {
  let map = sportGames.get(sportId);
  if (!map) sportGames.set(sportId, (map = new Map()));
  return map;
}

/** The ONE place a GameState is built, so every code path returns every required field. */
function createState(game: GameSummary): GameState {
  return {
    ...game,
    events: [],
    commentary: [],
    aiPrediction: null,
    aiPredictionStatus: "unavailable",
    currentWinProbability: { home: 0.5, away: 0.5, draw: 0 },
    winProbabilityHistory: [],
  };
}

// ---------------------------------------------------------------- fetching

/** Returns undefined when the call could not be made (quota/network) so callers don't mistake it for "no games". */
async function fetchList(sportId: SportId, filter: ListFilter): Promise<GameSummary[] | undefined> {
  const { endpointKey, params } = listQuery(sportId, filter);
  const def = getSportEndpoint(sportId, endpointKey);
  try {
    const result = await guardedCall<unknown[]>(sportId, endpointKey, def.path, def, params, { isLivePollCall: filter === "live" });
    if (!result.ok || !result.data) {
      logger.warn({ sportId, reason: result.reason }, "game list unavailable");
      return undefined;
    }
    return result.data.map((item) => mapGame(sportId, item)).filter((g): g is GameSummary => g !== null);
  } catch (error) {
    logger.warn({ sportId, err: error instanceof Error ? error.message : String(error) }, "game list fetch failed");
    return undefined;
  }
}

/** Live tab: in-play games only (+ scheduled ones for F1/MMA, which are never polled). */
export async function getLiveGames(sportId: SportId): Promise<GameSummary[]> {
  touchSport(sportId);
  if (getSportDefinition(sportId).kind === "team-game") {
    await pollLiveGames(sportId); // throttled: no-op if polled within POLL_MIN_GAP_MS
    return [...gamesFor(sportId).values()].filter((g) => g.status === "live").map(toSummary);
  }
  const list = (await fetchList(sportId, "live")) ?? [];
  return list.filter((g) => g.status !== "finished");
}

export async function getPastGames(sportId: SportId): Promise<GameSummary[]> {
  return ((await fetchList(sportId, "past")) ?? []).filter((g) => g.status === "finished");
}

export async function fetchGameById(sportId: SportId, gameId: string): Promise<GameState | undefined> {
  const { endpointKey, params } = byIdQuery(sportId, gameId);
  const def = getSportEndpoint(sportId, endpointKey);
  const result = await guardedCall<unknown[]>(sportId, endpointKey, def.path, def, params, { isLivePollCall: false });
  const summary = result.ok && result.data?.[0] ? mapGame(sportId, result.data[0]) : null;
  return summary ? createState(summary) : undefined;
}

function toSummary(s: GameState): GameSummary {
  const { events: _e, commentary: _c, aiPrediction: _a, aiPredictionStatus: _s, currentWinProbability: _p, winProbabilityHistory: _h, ...summary } = s;
  return summary;
}

// ---------------------------------------------------------------- polling

function detectEvents(old: GameState, next: GameSummary): GameEvent[] {
  const type = next.sportId === "football" ? "goal" : "score";
  const events: GameEvent[] = [];
  if (next.homeScore !== old.homeScore) events.push({ type, team: "home", minute: next.elapsedMinutes, description: `${next.homeTeam} scores (${next.homeScore}-${next.awayScore})` });
  if (next.awayScore !== old.awayScore) events.push({ type, team: "away", minute: next.elapsedMinutes, description: `${next.awayTeam} scores (${next.homeScore}-${next.awayScore})` });
  if (old.status !== "finished" && next.status === "finished") events.push({ type: "whistle", team: "home", minute: next.elapsedMinutes, description: "Game finished" });
  return events;
}

function maybePredict(state: GameState, budget: { left: number }, onUpdate: GameUpdateHandler): void {
  const { sportId, gameId } = state;
  const done = predicted.get(sportId) ?? new Set<string>();
  predicted.set(sportId, done);

  if (state.status !== "live" || done.has(gameId)) return;
  if (!getSportDefinition(sportId).hasPredictions) return;
  if (budget.left <= 0) return;                                    // cap per poll tick
  if (getQuotaManager(sportId).remainingSharedBudget() < 10) return; // keep budget for the live poll itself

  budget.left -= 1;
  done.add(gameId);
  state.aiPredictionStatus = "loading";

  generateGamePrediction(sportId, {
    fixtureId: Number(gameId), homeTeamId: state.homeTeamId, awayTeamId: state.awayTeamId,
    leagueId: state.leagueId, season: Number.parseInt(String(state.season), 10) || new Date().getUTCFullYear(), homeTeamName: state.homeTeam, awayTeamName: state.awayTeam,
  })
    .then((p) => {
      if (p) {
        state.aiPrediction = p;
        state.aiPredictionStatus = "ready";
        state.currentWinProbability = { home: p.homeWin / 100, away: p.awayWin / 100, draw: p.draw / 100 };
      } else {
        state.aiPredictionStatus = "unavailable";
      }
      onUpdate(gameId, state);
    })
    .catch(() => {
      state.aiPredictionStatus = "unavailable";
      onUpdate(gameId, state);
    });
}

/** One poll tick for one team sport. F1/MMA are never polled (no live=all) — they are fetched on demand. */
export async function pollLiveGames(sportId: SportId): Promise<void> {
  const onUpdate = updateHandler;
  if (Date.now() - (lastPolled.get(sportId) ?? 0) < POLL_MIN_GAP_MS) return;
  lastPolled.set(sportId, Date.now());
  const live = await fetchList(sportId, "live");
  if (!live) return; // call failed → keep existing state, don't mark anything finished

  const games = gamesFor(sportId);
  const seen = new Set<string>();
  const budget = { left: MAX_PREDICTIONS_PER_POLL };

  for (const game of live) {
    if (game.status !== "live") continue;
    seen.add(game.gameId);
    let state = games.get(game.gameId);
    const isNew = !state;
    if (!state) {
      state = createState(game);
      games.set(game.gameId, state);
    }

    const events = isNew ? [] : detectEvents(state, game);
    const changed = events.length > 0 || state.periodLabel !== game.periodLabel;
    Object.assign(state, {
      homeScore: game.homeScore, awayScore: game.awayScore, elapsedMinutes: game.elapsedMinutes,
      periodLabel: game.periodLabel, status: game.status,
    });
    state.events.push(...events);

    maybePredict(state, budget, onUpdate);
    if (changed) onUpdate(game.gameId, state);
  }

  // Games that were live last tick but are absent from live=all have ended — close them out.
  for (const [id, state] of games) {
    if (state.status === "live" && !seen.has(id)) {
      state.status = "finished";
      state.periodLabel = "FT";
      state.events.push({ type: "whistle", team: "home", minute: state.elapsedMinutes, description: "Game finished" });
      onUpdate(id, state);
    }
  }
}

// ---------------------------------------------------------------- accessors

export function getGameState(sportId: SportId, gameId: string): GameState | undefined {
  return sportGames.get(sportId)?.get(gameId);
}

export function getAllGames(sportId: SportId): Map<string, GameState> {
  return gamesFor(sportId);
}

export function addCommentary(sportId: SportId, gameId: string, text: string): CommentaryEntry | undefined {
  const state = sportGames.get(sportId)?.get(gameId);
  if (!state) return undefined;
  const entry: CommentaryEntry = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`, timestamp: new Date(), text };
  state.commentary.push(entry);
  return entry;
}

export type { GameStatus };
