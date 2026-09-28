import { guardedCall } from "./sports/core/guarded-call";
import { getSportEndpoint } from "./sports/endpoints";
import type { SportId } from "./sports/registry";
import { getAllGames } from "./sports-data";
import { getSportDefinition } from "./sports/registry";

export type StandingRow = {
  position: number;
  teamId: number;
  team: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  points: number | null;
  group?: string;
  winPct?: number;
};

const n = (v: unknown): number => (typeof v === "number" ? v : Number.isFinite(Number(v)) ? Number(v) : 0);

const NO_DRAW_SPORTS = new Set<SportId>(["basketball", "nba", "baseball", "hockey", "nfl", "afl"]);

/** Walks the (differently nested per sport) response and maps every row that has a `team`. */
function collectRows(node: unknown, out: StandingRow[], currentGroup: string = ""): void {
  if (Array.isArray(node)) return node.forEach((x) => collectRows(x, out, currentGroup));
  if (!node || typeof node !== "object") return;
  const row = node as any;
  
  // Remember the group name if this node looks like a group header
  if (row.name && !row.team && (row.rank === undefined && row.position === undefined)) {
    currentGroup = String(row.name);
  }
  
  if (row.team && (row.position !== undefined || row.rank !== undefined)) {
    const played = n(row.games?.played ?? row.all?.played ?? row.played);
    const won = n(row.games?.win?.total ?? row.all?.win ?? row.won);
    const lost = n(row.games?.lose?.total ?? row.all?.lose ?? row.lost);
    const drawn = n(row.games?.draw?.total ?? row.all?.draw ?? row.drawn);
    
    // For standings points, use league points if available, otherwise use total points scored
    let points: number | null = null;
    if (typeof row.points === "number") {
      points = row.points;
    } else if (row.points && typeof row.points === "object") {
      const pts = row.points as any;
      if (typeof pts.for === "number") {
        points = pts.for; // This is actually total points scored, not standings points
      }
    }
    
    out.push({
      position: n(row.position ?? row.rank),
      teamId: n(row.team.id),
      team: String(row.team.name ?? "Team"),
      played,
      won,
      drawn,
      lost,
      points,
      group: currentGroup || undefined,
      winPct: played > 0 ? (won / played) * 100 : 0,
    });
    return;
  }
  Object.values(row).forEach((x) => collectRows(x, out, currentGroup));
}

export async function getStandings(sportId: SportId, league: number, season: string | number): Promise<StandingRow[]> {
  const def = getSportEndpoint(sportId, "standings");
  const result = await guardedCall<unknown[]>(sportId, "standings", def.path, def, { league, season });
  const rows: StandingRow[] = [];
  if (result.ok && result.data) collectRows(result.data, rows);
  
  // Dedupe by teamId, preferring conference groups over other groups
  const teamMap = new Map<number, StandingRow>();
  for (const row of rows) {
    const existing = teamMap.get(row.teamId);
    if (!existing) {
      teamMap.set(row.teamId, row);
    } else {
      // Prefer conference groups over other groups
      const isConference = row.group?.toLowerCase().includes("conference");
      const existingIsConference = existing.group?.toLowerCase().includes("conference");
      if (isConference && !existingIsConference) {
        teamMap.set(row.teamId, row);
      }
    }
  }
  
  const uniqueRows = Array.from(teamMap.values());
  
  // Sort by win percentage descending
  uniqueRows.sort((a, b) => (b.winPct ?? 0) - (a.winPct ?? 0));
  
  // Renumber positions
  uniqueRows.forEach((row, index) => {
    row.position = index + 1;
  });
  
  return uniqueRows;
}

export function getActiveLeagues(sportId: SportId): Array<{ leagueId: number; name: string; season: number | string }> {
  const seen = new Map<number, { leagueId: number; name: string; season: number | string }>();
  for (const g of getAllGames(sportId).values()) {
    if (g.leagueId) seen.set(g.leagueId, { leagueId: g.leagueId, name: g.competition, season: g.season });
  }
  return [...seen.values()];
}
