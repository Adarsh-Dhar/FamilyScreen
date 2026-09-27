import { getFootballCache as getCoreFootballCache, TtlCache } from "../sports/core/cache";

// Backward compatibility: use the new core cache manager
export function getFootballCache(): TtlCache {
  return getCoreFootballCache();
}
