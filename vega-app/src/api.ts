import { API_BASE_URL } from "./config";
import type {
  MatchesResponse,
  MatchState,
} from "./types";

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

// GET /matches — list of currently live/selectable matches
export function getLiveMatches() {
  return request<MatchesResponse>("/matches");
}

// GET /matches/:id — full state for one match
export function getMatchState(matchId: string) {
  return request<MatchState>(`/matches/${encodeURIComponent(matchId)}`);
}

// POST /matches/:id/ask — optional Q&A endpoint (stretch goal)
export function askQuestion(matchId: string, question: string) {
  return request<{ answer: string }>(`/matches/${encodeURIComponent(matchId)}/ask`, {
    method: "POST",
    body: JSON.stringify({ question }),
  });
}
