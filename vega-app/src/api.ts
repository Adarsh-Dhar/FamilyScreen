import { API_BASE_URL } from "./config";
import type {
  PairSession,
  PairStatus,
  ProfilesResponse,
  SearchResponse,
  TitleSelectionResponse,
} from "./types";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
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

// POST /pair — TV creates a short-lived pairing code for a parent account id.
export function createPairing(parentAccountId: string) {
  return request<PairSession>("/pair", {
    method: "POST",
    body: JSON.stringify({ parentAccountId }),
  });
}

// GET /pair/status/{code} — TV polls this until the parent confirms.
export function getPairingStatus(code: string) {
  return request<PairStatus>(`/pair/status/${encodeURIComponent(code)}`);
}

// GET /profiles/{parentId} — children + their thresholds for this household.
export function getProfiles(parentId: string) {
  return request<ProfilesResponse>(`/profiles/${encodeURIComponent(parentId)}`);
}

// GET /search?q=... — catalog search across connected streaming services.
export function searchTitles(q: string) {
  const params = new URLSearchParams({ q });
  return request<SearchResponse>(`/search?${params.toString()}`);
}

// POST /select-title — ask the content advisor to evaluate a title for a child.
export function selectTitle(input: {
  titleId: string;
  childProfileId: string;
  parentAccountId: string;
}) {
  return request<TitleSelectionResponse>("/select-title", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
