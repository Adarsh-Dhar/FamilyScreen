import { API_BASE_URL } from "./config";
import type {
  GamesResponse,
  GameState,
  SportsResponse,
  SportId,
  GameSummary,
  SportDefinition,
  StandingRow,
  ActiveLeague,
  Team,
} from "./types";

export type { SportId, GameSummary, SportDefinition };

async function request<T>(path: string, init?: {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}): Promise<T> {
  const res = await fetch(`${API_BASE_URL}/api${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText}: ${body}`);
  }
  return res.json() as Promise<T>;
}

// Multi-sport endpoints
export function getSports() {
  return request<SportsResponse>("/sports");
}

export function getLiveGames(sportId: SportId) {
  return request<GamesResponse>(`/${sportId}/games`);
}

export function getPastGames(sportId: SportId) {
  return request<GamesResponse>(`/${sportId}/games/past`);
}

export function getGameState(sportId: SportId, gameId: string) {
  return request<GameState>(`/${sportId}/games/${encodeURIComponent(gameId)}`);
}

export function askGameQuestion(sportId: SportId, gameId: string, question: string) {
  return request<{ answer: string }>(`/${sportId}/games/${encodeURIComponent(gameId)}/ask`, {
    method: "POST",
    body: JSON.stringify({ question }),
  });
}

export function getActiveLeagues(sportId: SportId) {
  return request<{ leagues: ActiveLeague[] }>(`/${sportId}/leagues/active`);
}

export function getStandings(sportId: SportId, league: number, season: number | string) {
  return request<{ rows: StandingRow[] }>(`/${sportId}/standings?league=${league}&season=${encodeURIComponent(String(season))}`);
}

export function getTeams(sportId: SportId, league: number, season: number | string) {
  return request<{ teams: Team[] }>(`/${sportId}/teams?league=${league}&season=${encodeURIComponent(String(season))}`);
}

export function getHeadToHead(sportId: SportId, gameId: string) {
  return request<{ games: unknown[] }>(`/${sportId}/games/${encodeURIComponent(gameId)}/h2h`);
}
