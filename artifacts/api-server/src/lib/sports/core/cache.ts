import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import type { CacheEntry } from "../../football-agent/types";

/**
 * A tiny disk-backed TTL cache keyed by `sportId + endpointKey + sorted params`. Every successful
 * API-Sports response is written here before it's returned, so the *next* identical question
 * (same sport, same endpoint, same params) is free until the entry's TTL — defined per-endpoint
 * in the sport's endpoints.ts — expires. Disk-backed (not just in-memory) so a server restart doesn't
 * throw away same-day cache and force re-spending quota on data that hasn't changed.
 */
export class TtlCache {
  private store: Record<string, CacheEntry<unknown>> = {};
  private readonly filePath: string;
  private dirty = false;

  constructor(filePath: string) {
    this.filePath = filePath;
    if (existsSync(filePath)) {
      try {
        this.store = JSON.parse(readFileSync(filePath, "utf-8")) as Record<string, CacheEntry<unknown>>;
      } catch {
        this.store = {};
      }
    }
  }

  static buildKey(sportId: string, endpointKey: string, params: Record<string, string | number | boolean | undefined>): string {
    if (!params || typeof params !== 'object') {
      return `${sportId}:${endpointKey}`;
    }
    const normalized = Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== "")
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${String(v)}`)
      .join("&");
    return `${sportId}:${endpointKey}?${normalized}`;
  }

  get<T>(key: string): T | undefined {
    const entry = this.store[key];
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      delete this.store[key];
      this.dirty = true;
      return undefined;
    }
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlSeconds: number): void {
    this.store[key] = { value, expiresAt: Date.now() + ttlSeconds * 1000, fetchedAt: Date.now() };
    this.dirty = true;
    this.persist();
  }

  /** Persists eagerly but cheaply; call sites are infrequent enough (max ~100/day per sport) for this to be fine. */
  private persist(): void {
    if (!this.dirty) return;
    mkdirSync(dirname(this.filePath), { recursive: true });
    writeFileSync(this.filePath, JSON.stringify(this.store));
    this.dirty = false;
  }

  stats(): { entries: number; oldestFetchedAt: number | null } {
    const values = Object.values(this.store);
    return {
      entries: values.length,
      oldestFetchedAt: values.length ? Math.min(...values.map((v) => v.fetchedAt)) : null,
    };
  }
}

let sharedCaches: Map<string, TtlCache> = new Map();

export function getSportsCache(sportId?: string): TtlCache {
  const cacheKey = sportId ?? "shared";
  const existingCache = sharedCaches.get(cacheKey);
  if (existingCache) return existingCache;

  const path = process.env["SPORTS_CACHE_FILE"] ?? join(process.cwd(), "data", "sports-cache.json");
  const cache = new TtlCache(path);
  sharedCaches.set(cacheKey, cache);
  return cache;
}

// Backward compatibility for existing football code
export function getFootballCache(): TtlCache {
  return getSportsCache("football");
}