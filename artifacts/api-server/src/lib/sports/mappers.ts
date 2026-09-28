import type { SportId } from "./registry";
import { mapStatus, periodLabel, type GameStatus } from "./status";

export type GameSummary = {
  gameId: string;
  sportId: SportId;
  homeTeam: string;
  awayTeam: string;
  homeTeamId: number;
  awayTeamId: number;
  leagueId: number;
  /** number (2025) for most sports, string ("2025-2026") for basketball — pass through untouched. */
  season: number | string;
  competition: string;
  homeScore: number;
  awayScore: number;
  elapsedMinutes: number;
  /** "63'", "Q3", "P2", "IN5", "HT", "FT", "NS" — what the UI prints next to the score. */
  periodLabel: string;
  status: GameStatus;
};

type RawScore = number | null | undefined | Record<string, unknown>;

/**
 * Raw score → number. Sports differ: football sends a number, basketball/NFL/hockey send
 * { total, quarter_1... }, NBA sends { points }, AFL sends { score, goals, behinds }.
 * NEVER sum the sub-keys — for AFL that adds goals+behinds+score and inflates the total.
 */
export function normalizeScore(raw: RawScore): number {
  if (typeof raw === "number") return raw;
  if (raw && typeof raw === "object") {
    for (const key of ["total", "points", "score"]) {
      const v = raw[key];
      if (typeof v === "number") return v;
    }
  }
  return 0;
}

const num = (v: unknown, fallback = 0): number => (typeof v === "number" && Number.isFinite(v) ? v : fallback);

function build(sportId: SportId, p: {
  id: unknown; home: any; away: any; leagueId: unknown; season: unknown; competition: unknown;
  homeScore: RawScore; awayScore: RawScore; statusShort: any; statusLong?: any; elapsed?: unknown;
}): GameSummary | null {
  const status = mapStatus(p.statusShort, p.statusLong);
  if (!status || p.id === undefined || p.id === null) return null; // no stable id → skip, never invent one
  const elapsed = typeof p.elapsed === "number" ? p.elapsed : 0;
  return {
    gameId: String(p.id),
    sportId,
    homeTeam: p.home?.name ?? "Home",
    awayTeam: p.away?.name ?? "Away",
    homeTeamId: num(p.home?.id),
    awayTeamId: num(p.away?.id),
    leagueId: num(p.leagueId),
    season: typeof p.season === "string" && p.season ? p.season : num(p.season, new Date().getUTCFullYear()),
    competition: typeof p.competition === "string" ? p.competition : "Competition",
    homeScore: normalizeScore(p.homeScore),
    awayScore: normalizeScore(p.awayScore),
    elapsedMinutes: elapsed,
    periodLabel: periodLabel(status, p.statusShort, elapsed),
    status,
  };
}

/** football: /fixtures → { fixture:{id,status}, league, teams, goals } */
function mapFootball(item: any): GameSummary | null {
  return build("football", {
    id: item.fixture?.id, home: item.teams?.home, away: item.teams?.away,
    leagueId: item.league?.id, season: item.league?.season, competition: item.league?.name,
    homeScore: item.goals?.home, awayScore: item.goals?.away,
    statusShort: item.fixture?.status?.short, statusLong: item.fixture?.status?.long, elapsed: item.fixture?.status?.elapsed,
  });
}

/** NBA v2: teams.visitors (not away), scores.visitors.points, numeric status.short, league is a string. */
function mapNba(item: any): GameSummary | null {
  return build("nba", {
    id: item.id, home: item.teams?.home, away: item.teams?.visitors ?? item.teams?.away,
    leagueId: 0, season: item.league?.season ?? item.season, competition: "NBA",
    homeScore: item.scores?.home, awayScore: item.scores?.visitors ?? item.scores?.away,
    statusShort: item.status?.short, statusLong: item.status?.long,
  });
}

/** basketball, baseball, hockey, handball, volleyball, rugby, afl, nfl: /games → { id, teams, scores, league, status } */
function mapGeneric(sportId: SportId, item: any): GameSummary | null {
  return build(sportId, {
    id: item.id ?? item.game?.id, home: item.teams?.home, away: item.teams?.away,
    leagueId: item.league?.id, season: item.league?.season ?? item.season, competition: item.league?.name,
    homeScore: item.scores?.home, awayScore: item.scores?.away,
    statusShort: item.status?.short, statusLong: item.status?.long,
  });
}

/** F1 /races returns one row per SESSION (practice, qualifying, sprint, race). Keep only the Grand Prix itself. */
function mapF1(item: any): GameSummary | null {
  if (item.type && item.type !== "Race") return null;
  const status = mapStatus(item.status);
  if (!status) return null;
  return {
    gameId: String(item.id), sportId: "formula1",
    homeTeam: item.competition?.name ?? "Grand Prix", awayTeam: item.circuit?.name ?? "Circuit",
    homeTeamId: 0, awayTeamId: 0, leagueId: num(item.competition?.id), season: num(item.season),
    competition: item.competition?.name ?? "Formula 1", homeScore: 0, awayScore: 0,
    elapsedMinutes: 0, periodLabel: status === "finished" ? "FT" : status === "scheduled" ? "NS" : "LIVE", status,
  };
}

/** MMA /fights. Fighters may be { first, second } or an array depending on API version — accept both. */
function mapMma(item: any): GameSummary | null {
  const status = mapStatus(item.status?.short, item.status?.long);
  if (!status || item.id === undefined) return null;
  const f1 = item.fighters?.first ?? item.fighters?.[0] ?? {};
  const f2 = item.fighters?.second ?? item.fighters?.[1] ?? {};
  return {
    gameId: String(item.id), sportId: "mma",
    homeTeam: f1.name ?? "Fighter 1", awayTeam: f2.name ?? "Fighter 2",
    homeTeamId: num(f1.id), awayTeamId: num(f2.id), leagueId: 0, season: num(item.year, new Date().getUTCFullYear()),
    competition: item.slug ?? item.category ?? "MMA", homeScore: 0, awayScore: 0,
    elapsedMinutes: 0, periodLabel: status === "finished" ? "FT" : status === "scheduled" ? "NS" : "LIVE", status,
  };
}

export function mapGame(sportId: SportId, item: unknown): GameSummary | null {
  switch (sportId) {
    case "football": return mapFootball(item);
    case "nba": return mapNba(item);
    case "formula1": return mapF1(item);
    case "mma": return mapMma(item);
    default: return mapGeneric(sportId, item);
  }
}
