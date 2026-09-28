export type GameStatus = "live" | "finished" | "scheduled";

/** Not started yet. */
const SCHEDULED = new Set(["NS", "TBD", "Scheduled", "Not Started"]);
/** Over, with a result. AOT/AP = after over-time / after penalties (basketball, hockey, NFL, handball, rugby). */
const FINISHED = new Set(["FT", "AET", "PEN", "AOT", "AP", "AWD", "WO", "Finished", "Completed"]);
/** Will not be played today (or at all) — never show these as live. */
const DROPPED = new Set(["PST", "POST", "CANC", "ABD", "Postponed", "Cancelled", "Canceled"]);

/**
 * Maps any api-sports status to our 3-state model, or null if the game should be hidden.
 * Everything that is not scheduled/finished/dropped is in play: 1H HT 2H ET BT P LIVE INT SUSP (football),
 * Q1-Q4 OT (basketball/NFL/AFL), P1-P3 PT (hockey), H1 H2 (handball), S1-S5 (volleyball),
 * IN1-IN9 (baseball). NBA v2 sends numeric status.short: 1 scheduled, 2 live, 3 finished.
 */
export function mapStatus(short: string | number | null | undefined, long?: string | null): GameStatus | null {
  if (typeof short === "number") {
    if (short === 1) return "scheduled";
    if (short === 2) return "live";
    if (short === 3) return "finished";
    return null;
  }
  const code = short ?? long ?? "";
  if (!code) return null;
  if (DROPPED.has(code) || (long && DROPPED.has(long))) return null;
  if (SCHEDULED.has(code)) return "scheduled";
  if (FINISHED.has(code)) return "finished";
  return "live";
}

/** Text for the score box: "63'" for football, "Q3" / "P2" / "IN5" / "HT" for the rest, "FT" when done. */
export function periodLabel(status: GameStatus, short: string | number | null | undefined, elapsed?: number | null): string {
  if (status === "finished") return typeof short === "string" && (short === "AOT" || short === "AET" || short === "AP" || short === "PEN") ? short : "FT";
  if (status === "scheduled") return "NS";
  if (typeof elapsed === "number" && elapsed > 0) return `${elapsed}'`;
  return typeof short === "string" && short ? short : "LIVE";
}
