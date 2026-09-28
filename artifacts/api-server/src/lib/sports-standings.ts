import { guardedCall } from "./sports/core/guarded-call";
import { getSportEndpoint } from "./sports/endpoints";
import type { SportId } from "./sports/registry";
import { getAllGames } from "./sports-data";

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
function collectRows(node: unknown, out: StandingRow[], currentGroup: string = "", sportId?: SportId): void {
  if (Array.isArray(node)) return node.forEach((x) => collectRows(x, out, currentGroup, sportId));
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
        // For no-draw sports, points.for is total points scored, not standings points
        // Set to null and use winPct instead
        if (sportId && NO_DRAW_SPORTS.has(sportId)) {
          points = null;
        } else {
          points = pts.for;
        }
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
      group: row.group?.name || currentGroup || undefined,
      winPct: played > 0 ? (won / played) * 100 : 0,
    });
    return;
  }
  Object.values(row).forEach((x) => collectRows(x, out, currentGroup, sportId));
}

export async function getStandings(sportId: SportId, league: number, season: string | number): Promise<StandingRow[]> {
  const def = getSportEndpoint(sportId, "standings");
  const apiResult = await guardedCall<unknown[]>(sportId, "standings", def.path, def, { league, season });
  const rows: StandingRow[] = [];
  if (apiResult.ok && apiResult.data) collectRows(apiResult.data, rows, "", sportId);
  
  // Dedupe by teamId, preferring conference groups over other groups
  const teamMap = new Map<number, StandingRow>();
  for (const row of rows) {
    const existing = teamMap.get(row.teamId);
    if (!existing) {
      teamMap.set(row.teamId, row);
    } else {
      // Prefer conference groups over other groups, but be smarter about it
      // For sports like NFL and hockey, "Conference" might be part of the actual conference name
      const isConference = row.group?.toLowerCase().includes("conference");
      const existingIsConference = existing.group?.toLowerCase().includes("conference");
      
      // If both have conference in the name, prefer the one that looks more like a division
      if (isConference && existingIsConference) {
        // Prefer more specific names (e.g., "Eastern Conference" over "Conference")
        if (row.group && row.group.length > (existing.group?.length || 0)) {
          teamMap.set(row.teamId, row);
        }
      } else if (isConference && !existingIsConference) {
        teamMap.set(row.teamId, row);
      }
    }
  }
  
  const uniqueRows = Array.from(teamMap.values());
  
  // Group by group name and sort within each group
  const groupedRows = new Map<string, StandingRow[]>();
  for (const row of uniqueRows) {
    const group = row.group || "Overall";
    if (!groupedRows.has(group)) {
      groupedRows.set(group, []);
    }
    groupedRows.get(group)!.push(row);
  }
  
  // Sort by win percentage descending within each group
  for (const groupRows of groupedRows.values()) {
    groupRows.sort((a, b) => (b.winPct ?? 0) - (a.winPct ?? 0));
  }
  
  // Renumber positions within each group
  const finalResult: StandingRow[] = [];
  for (const groupRows of groupedRows.values()) {
    groupRows.forEach((row, index) => {
      row.position = index + 1;
      finalResult.push(row);
    });
  }
  
  return finalResult;
}

export function getActiveLeagues(sportId: SportId): Array<{ leagueId: number; name: string; season: number | string }> {
  const seen = new Map<number, { leagueId: number; name: string; season: number | string }>();
  for (const g of getAllGames(sportId).values()) {
    if (g.leagueId) seen.set(g.leagueId, { leagueId: g.leagueId, name: g.competition, season: g.season });
  }
  return [...seen.values()];
}
