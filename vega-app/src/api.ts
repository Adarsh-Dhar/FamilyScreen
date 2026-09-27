import { API_BASE_URL } from "./config";
import type {
  MatchesResponse,
  MatchState,
  GamesResponse,
  GameState,
  SportsResponse,
  SportId,
  GameSummary,
  SportDefinition,
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

// Legacy football endpoints (for backward compatibility)
export function getLiveMatches() {
  return request<MatchesResponse>("/matches");
}

export function getMatchState(matchId: string) {
  return request<MatchState>(`/matches/${encodeURIComponent(matchId)}`);
}

export function askQuestion(matchId: string, question: string) {
  return request<{ answer: string }>(`/matches/${encodeURIComponent(matchId)}/ask`, {
    method: "POST",
    body: JSON.stringify({ question }),
  });
}
