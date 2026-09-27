import type { AgentCallLog, EndpointDefinition } from "../../football-agent/types";
import { getApiSportsClient } from "./http-client";
import { getQuotaManager } from "./quota";
import { getSportsCache, TtlCache } from "./cache";

export interface GuardedCallResult<T> {
  data: T | undefined;
  fromCache: boolean;
  /** false if we skipped the real call because quota/budget said no and there was nothing cached. */
  ok: boolean;
  reason?: string;
}

/**
 * The single choke point every real network call to api-sports goes through:
 *   1. Check cache first — a hit costs nothing and doesn't touch quota.
 *   2. On a miss, ask the QuotaManager for permission (account-wide cap + per-endpoint vendor cap
 *      + live-poll reserve).
 *   3. If allowed, call the API, cache the result for that endpoint's configured TTL, and record
 *      the spend. If not allowed, return `ok: false` with a human-readable reason instead of
 *      throwing — callers (the planner) decide whether a stale cache entry or an honest "I don't
 *      have that right now" is the better fallback.
 */
export async function guardedCall<T = unknown>(
  sportId: string,
  endpointKey: string,
  path: string,
  endpointDef: EndpointDefinition,
  params: Record<string, string | number | boolean | undefined> = {},
  opts: { isLivePollCall?: boolean; log?: AgentCallLog[] } = {},
): Promise<GuardedCallResult<T>> {
  const cache = getSportsCache(sportId);
  const cacheKey = TtlCache.buildKey(sportId, endpointKey, params);

  const cached = cache.get<T>(cacheKey);
  if (cached !== undefined) {
    opts.log?.push({ endpointKey, params: stringifyParams(params), fromCache: true, timestamp: Date.now() });
    return { data: cached, fromCache: true, ok: true };
  }

  const quota = getQuotaManager(sportId);
  const permission = quota.canSpend(endpointKey, opts.isLivePollCall ?? false);
  if (!permission.allowed) {
    return { data: undefined, fromCache: false, ok: false, reason: permission.reason };
  }

  const client = getApiSportsClient(sportId);
  if (!client) {
    return { data: undefined, fromCache: false, ok: false, reason: "API_SPORTS_KEY is not configured." };
  }

  const response = await client.fetch<T>(endpointKey, path, params);
  quota.spend(endpointKey);
  cache.set(cacheKey, response, endpointDef.cacheTtlSeconds);
  opts.log?.push({ endpointKey, params: stringifyParams(params), fromCache: false, timestamp: Date.now() });

  return { data: response, fromCache: false, ok: true };
}

function stringifyParams(params: Record<string, string | number | boolean | undefined>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) out[k] = String(v);
  }
  return out;
}