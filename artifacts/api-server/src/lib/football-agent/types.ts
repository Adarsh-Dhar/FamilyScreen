/**
 * Shared types for the API-Football v3 client, quota manager, cache and agent.
 */

/** The four cost/volatility tiers used to size cache TTLs and quota reservations. */
export type DataTier =
  | "static" // countries, timezones, venues, leagues metadata — changes rarely (weeks/months)
  | "semi-static" // teams, squads, coachs, trophies, transfers, injuries — changes daily at most
  | "scheduled" // standings, predictions, fixtures (non-live), h2h, top scorers — changes a few times/day
  | "live"; // live fixtures, live odds, in-play events/stats/lineups — changes every few seconds/minutes

export type EndpointCategory =
  | "meta"
  | "leagues"
  | "teams"
  | "venues"
  | "standings"
  | "fixtures"
  | "injuries"
  | "predictions"
  | "coachs"
  | "players"
  | "transfers"
  | "trophies"
  | "sidelined"
  | "odds";

export interface EndpointParam {
  name: string;
  required?: boolean;
  description: string;
}

/** One row of the API-Football v3 endpoint registry (see docs/API_FOOTBALL_ENDPOINTS.md). */
export interface EndpointDefinition {
  /** Stable key used everywhere else in the codebase, e.g. "fixtures.live". */
  key: string;
  category: EndpointCategory;
  /** Path relative to the API host, e.g. "/fixtures". */
  path: string;
  description: string;
  params: EndpointParam[];
  tier: DataTier;
  /** How long a cached response is considered fresh, in seconds. */
  cacheTtlSeconds: number;
  /**
   * Vendor-recommended max calls per day for this specific endpoint (independent of our
   * own 100/day account cap), taken from api-football's own docs where they publish one
   * (e.g. "Recommended Calls: 1 call per day" on the top-scorers family of endpoints).
   * `null` means the vendor gives no specific guidance beyond the account-wide limit.
   */
  vendorRecommendedCallsPerDay: number | null;
  /** Relative importance when the daily budget is tight. Higher = protected longer. */
  priority: 1 | 2 | 3 | 4 | 5;
}

export interface ApiFootballEnvelope<T> {
  get: string;
  parameters: Record<string, string>;
  errors: unknown[] | Record<string, string>;
  results: number;
  paging: { current: number; total: number };
  response: T;
}

export type Provider = "api-sports" | "rapidapi";

export interface FootballClientConfig {
  apiKey: string;
  provider: Provider;
  /** Optional override, mainly for tests. */
  baseUrl?: string;
  timeoutMs?: number;
}

export interface QuotaState {
  /** UTC calendar day this state belongs to, e.g. "2026-09-27". */
  day: string;
  /** Total calls spent today across all endpoints. */
  totalSpent: number;
  /** Calls spent today, per endpoint key. */
  perEndpoint: Record<string, number>;
  /** Daily account-wide cap (default 100 for the free plan). */
  dailyLimit: number;
}

export interface SpendResult {
  allowed: boolean;
  reason?: string;
  remainingToday: number;
}

export interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  fetchedAt: number;
}

export interface AgentCallLog {
  endpointKey: string;
  params: Record<string, string>;
  fromCache: boolean;
  timestamp: number;
}

export interface AgentAnswer {
  answer: string;
  /** Endpoint keys actually hit (cache or live) to build this answer, for transparency/debugging. */
  callsUsed: AgentCallLog[];
  /** True if the agent had to degrade (skip a call) because the daily budget was exhausted. */
  budgetLimited: boolean;
  quotaRemainingToday: number;
}
