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
};

const n = (v: unknown): number => (typeof v === "number" ? v : Number.isFinite(Number(v)) ? Number(v) : 0);

/** Walks the (differently nested per sport) response and maps every row that has a `team`. */
function collectRows(node: unknown, out: StandingRow[]): void {
  if (Array.isArray(node)) return node.forEach((x) => collectRows(x, out));
  if (!node || typeof node !== "object") return;
  const row = node as any;
  if (row.team && (row.position !== undefined || row.rank !== undefined)) {
    out.push({
      position: n(row.position ?? row.rank),
      teamId: n(row.team.id),
      team: String(row.team.name ?? "Team"),
      played: n(row.games?.played ?? row.all?.played ?? row.played),
      won: n(row.games?.win?.total ?? row.all?.win ?? row.won),
      drawn: n(row.games?.draw?.total ?? row.all?.draw ?? row.drawn),
      lost: n(row.games?.lose?.total ?? row.all?.lose ?? row.lost),
      points: typeof row.points === "number" ? row.points : typeof row.points?.for === "number" ? row.points.for : null,
    });
    return;
  }
  Object.values(row).forEach((x) => collectRows(x, out));
}

export async function getStandings(sportId: SportId, league: number, season: string | number): Promise<StandingRow[]> {
  const def = getSportEndpoint(sportId, "standings");
  const result = await guardedCall<unknown[]>(sportId, "standings", def.path, def, { league, season });
  const rows: StandingRow[] = [];
  if (result.ok && result.data) collectRows(result.data, rows);
  return rows.sort((a, b) => a.position - b.position);
}

export function getActiveLeagues(sportId: SportId): Array<{ leagueId: number; name: string; season: number | string }> {
  const seen = new Map<number, { leagueId: number; name: string; season: number | string }>();
  for (const g of getAllGames(sportId).values()) {
    if (g.leagueId) seen.set(g.leagueId, { leagueId: g.leagueId, name: g.competition, season: g.season });
  }
  return [...seen.values()];
}
