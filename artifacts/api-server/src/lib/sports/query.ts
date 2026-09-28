import type { SportId } from "./registry";

export type ListFilter = "live" | "past";
type Params = Record<string, string | number | boolean>;

const isoDay = (offsetDays: number): string =>
  new Date(Date.now() + offsetDays * 86_400_000).toISOString().slice(0, 10);

/**
 * Which endpoint + params returns a sport's game list. No hard-coded league ids or seasons:
 *  - team sports, live  → live=all (every game in play right now, worldwide, 1 call)
 *  - anything, past     → date=<SPORTS_PAST_DATE or yesterday> (1 call, all leagues)
 *  - F1 / MMA "live"    → date=today (they have no live=all; the UI shows today's card)
 * On a free plan that only serves old seasons, set SPORTS_PAST_DATE=YYYY-MM-DD to a date inside your window.
 */
export function listQuery(sportId: SportId, filter: ListFilter): { endpointKey: string; params: Params } {
  const pastDate = process.env["SPORTS_PAST_DATE"] || isoDay(-1);

  if (sportId === "formula1") return { endpointKey: "races", params: { date: filter === "live" ? isoDay(0) : pastDate } };
  if (sportId === "mma") return { endpointKey: "fights", params: { date: filter === "live" ? isoDay(0) : pastDate } };

  if (filter === "live") {
    return { endpointKey: sportId === "football" ? "fixtures.live" : "games.live", params: { live: "all" } };
  }
  return { endpointKey: sportId === "football" ? "fixtures.list" : "games", params: { date: pastDate } };
}

/** Single game by id. Football calls it fixtures, everyone else games. */
export function byIdQuery(sportId: SportId, id: string): { endpointKey: string; params: Params } {
  const n = Number(id);
  if (sportId === "formula1") return { endpointKey: "races", params: { id: n } };
  if (sportId === "mma") return { endpointKey: "fights", params: { id: n } };
  return { endpointKey: sportId === "football" ? "fixtures.list" : "games", params: { id: n } };
}
