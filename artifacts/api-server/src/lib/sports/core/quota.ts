import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import type { QuotaState, SpendResult } from "../../football-agent/types";

const DEFAULT_DAILY_LIMIT = 100;

/** Reserve this many calls, untouched by on-demand agent questions, for the live-games poll loop. */
const LIVE_POLL_RESERVE = 25;

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

/**
 * Tracks how many API-Sports calls have been spent today (UTC) per sport and refuses to spend
 * more once the account's daily cap is reached. State is persisted to a JSON file so the count
 * survives server restarts. Each sport has its own independent daily quota.
 */
export class QuotaManager {
  private state: QuotaState;
  private readonly filePath: string;
  private readonly sportId: string;

  constructor(filePath: string, sportId: string, dailyLimit: number = DEFAULT_DAILY_LIMIT) {
    this.filePath = filePath;
    this.sportId = sportId;
    this.state = this.load(dailyLimit);
  }

  private load(dailyLimit: number): QuotaState {
    if (existsSync(this.filePath)) {
      try {
        const raw = JSON.parse(readFileSync(filePath, "utf-8")) as QuotaState;
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
    const remaining = this.state.dailyLimit - this.state.totalSpent;

    if (remaining <= 0) {
      return { allowed: false, reason: `Daily API-Sports quota exhausted for ${this.sportId}.`, remainingToday: 0 };
    }

    if (!isLivePollCall && remaining <= LIVE_POLL_RESERVE && endpointKey !== "games.live") {
      return {
        allowed: false,
        reason: `Only ${remaining} calls left today for ${this.sportId}; reserved for the live-games poll loop.`,
        remainingToday: remaining,
      };
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

  snapshot(): QuotaState & { remaining: number; livePollReserve: number; sportId: string } {
    this.rolloverIfNewDay();
    return {
      ...this.state,
      remaining: this.remainingTotal(),
      livePollReserve: LIVE_POLL_RESERVE,
      sportId: this.sportId,
    };
  }
}

let sharedQuotas: Map<string, QuotaManager> = new Map();

export function getQuotaManager(sportId?: string): QuotaManager {
  const quotaKey = sportId ?? "shared";
  const existingQuota = sharedQuotas.get(quotaKey);
  if (existingQuota) return existingQuota;

  const limit = Number(process.env["API_SPORTS_DAILY_LIMIT"] ?? process.env["API_FOOTBALL_DAILY_LIMIT"] ?? DEFAULT_DAILY_LIMIT);
  const quota = new QuotaManager(
    process.env["SPORTS_QUOTA_FILE"] ?? join(process.cwd(), "data", "sports-quota.json"),
    quotaKey,
    Number.isFinite(limit) && limit > 0 ? limit : DEFAULT_DAILY_LIMIT,
  );
  sharedQuotas.set(quotaKey, quota);
  return quota;
}

// Backward compatibility for existing football code
export function getFootballQuotaManager(): QuotaManager {
  return getQuotaManager("football");
}