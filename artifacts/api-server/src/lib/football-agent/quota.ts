import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import type { QuotaState, SpendResult } from "./types";
import { getEndpoint } from "./endpoints";

const DEFAULT_DAILY_LIMIT = 100;

/** Reserve this many calls, untouched by on-demand agent questions, for the live-fixtures poll loop. */
const LIVE_POLL_RESERVE = 25;

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

/**
 * Tracks how many API-Football calls have been spent today (UTC) and refuses to spend more once
 * the account's daily cap is reached. State is persisted to a JSON file so the count survives
 * server restarts — the free plan's 100/day limit is enforced by api-football itself regardless
 * of whether *our* process remembers it, so losing count on a restart would silently start
 * returning 429s with no warning.
 *
 * Budget policy:
 *  1. A fixed reserve (`LIVE_POLL_RESERVE`) is set aside for the live-fixtures polling loop, so a
 *     burst of user questions can never fully starve live score tracking.
 *  2. Every endpoint also has its own vendor-recommended daily cap (see endpoints.ts) which is
 *     enforced independently of the account-wide total — e.g. top-scorers is capped at 1/day even
 *     if 90 requests are still free, because the underlying data only updates once a day anyway.
 *  3. Everything else competes for the remaining shared budget on a priority basis (see planner.ts).
 */
export class QuotaManager {
  private state: QuotaState;
  private readonly filePath: string;

  constructor(filePath: string, dailyLimit: number = DEFAULT_DAILY_LIMIT) {
    this.filePath = filePath;
    this.state = this.load(dailyLimit);
  }

  private load(dailyLimit: number): QuotaState {
    if (existsSync(this.filePath)) {
      try {
        const raw = JSON.parse(readFileSync(this.filePath, "utf-8")) as QuotaState;
        if (raw.day === todayUtc()) {
          return { ...raw, dailyLimit };
        }
      } catch {
        // fall through to a fresh state below
      }
    }
    return { day: todayUtc(), totalSpent: 0, perEndpoint: {}, dailyLimit };
  }

  private persist(): void {
    mkdirSync(dirname(this.filePath), { recursive: true });
    writeFileSync(this.filePath, JSON.stringify(this.state, null, 2));
  }

  private rolloverIfNewDay(): void {
    const day = todayUtc();
    if (this.state.day !== day) {
      this.state = { day, totalSpent: 0, perEndpoint: {}, dailyLimit: this.state.dailyLimit };
      this.persist();
    }
  }

  /** Budget left today for non-live, on-demand agent calls (i.e. total minus the live-poll reserve). */
  remainingSharedBudget(): number {
    this.rolloverIfNewDay();
    return Math.max(0, this.state.dailyLimit - LIVE_POLL_RESERVE - this.state.totalSpent);
  }

  remainingTotal(): number {
    this.rolloverIfNewDay();
    return Math.max(0, this.state.dailyLimit - this.state.totalSpent);
  }

  /**
   * Checks (without spending) whether calling `endpointKey` again today is allowed, honoring
   * both the account-wide cap and that endpoint's own vendor-recommended per-day cap.
   */
  canSpend(endpointKey: string, isLivePollCall = false): SpendResult {
    this.rolloverIfNewDay();
    const def = getEndpoint(endpointKey);
    const remaining = this.state.dailyLimit - this.state.totalSpent;

    if (remaining <= 0) {
      return { allowed: false, reason: "Daily API-Football quota exhausted.", remainingToday: 0 };
    }

    if (!isLivePollCall && remaining <= LIVE_POLL_RESERVE && endpointKey !== "fixtures.live") {
      return {
        allowed: false,
        reason: `Only ${remaining} calls left today; reserved for the live-fixtures poll loop.`,
        remainingToday: remaining,
      };
    }

    if (def.vendorRecommendedCallsPerDay !== null) {
      const usedToday = this.state.perEndpoint[endpointKey] ?? 0;
      if (usedToday >= def.vendorRecommendedCallsPerDay) {
        return {
          allowed: false,
          reason: `"${endpointKey}" already called ${usedToday}x today (vendor recommends ${def.vendorRecommendedCallsPerDay}/day; the underlying data won't have changed).`,
          remainingToday: remaining,
        };
      }
    }

    return { allowed: true, remainingToday: remaining };
  }

  /** Records that a call actually happened. Call this only after a successful API response. */
  spend(endpointKey: string): void {
    this.rolloverIfNewDay();
    this.state.totalSpent += 1;
    this.state.perEndpoint[endpointKey] = (this.state.perEndpoint[endpointKey] ?? 0) + 1;
    this.persist();
  }

  snapshot(): QuotaState & { remaining: number; livePollReserve: number } {
    this.rolloverIfNewDay();
    return {
      ...this.state,
      remaining: this.remainingTotal(),
      livePollReserve: LIVE_POLL_RESERVE,
    };
  }
}

let sharedQuota: QuotaManager | undefined;

export function getQuotaManager(): QuotaManager {
  if (!sharedQuota) {
    const limit = Number(process.env["API_FOOTBALL_DAILY_LIMIT"] ?? DEFAULT_DAILY_LIMIT);
    sharedQuota = new QuotaManager(
      process.env["FOOTBALL_QUOTA_FILE"] ?? join(process.cwd(), "data", "football-quota.json"),
      Number.isFinite(limit) && limit > 0 ? limit : DEFAULT_DAILY_LIMIT,
    );
  }
  return sharedQuota;
}
