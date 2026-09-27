/**
 * Hard-coded ids for the leagues almost every question will be about. These never change, so
 * baking them in means "what's the Premier League table look like" costs 1 call (/standings)
 * instead of 2 (/leagues search + /standings). Anything not listed here falls back to a cached
 * /leagues search, resolved once and then cached for a week (see resolve.ts).
 */
export const KNOWN_LEAGUE_IDS: Record<string, number> = {
  "premier league": 39,
  epl: 39,
  "english premier league": 39,
  "la liga": 140,
  "primera division": 140,
  bundesliga: 78,
  "serie a": 135,
  "ligue 1": 61,
  "champions league": 2,
  ucl: 2,
  "europa league": 3,
  "conference league": 848,
  eredivisie: 88,
  "primeira liga": 94,
  championship: 40,
  "saudi pro league": 307,
  mls: 253,
  "world cup": 1,
  "euro": 4,
  "european championship": 4,
};

export function lookupKnownLeagueId(name: string): number | undefined {
  return KNOWN_LEAGUE_IDS[name.trim().toLowerCase()];
}

/** Reasonable default season (api-football uses the year a season *starts* in, e.g. 2025 for 2025-26). */
export function currentSeasonYear(referenceDate = new Date()): number {
  const month = referenceDate.getUTCMonth() + 1; // 1-12
  const year = referenceDate.getUTCFullYear();
  // Most European league seasons start in July/August; before July, we're still in last year's season.
  // Note: Free API-Football plans only have access to seasons 2022-2024, so we cap at 2024
  const calculatedSeason = month >= 7 ? year : year - 1;
  return Math.min(calculatedSeason, 2024);
}
