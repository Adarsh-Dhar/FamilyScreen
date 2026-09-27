import { guardedCall } from "./guarded-call";
import { lookupKnownLeagueId } from "./known-leagues";
import type { AgentCallLog } from "./types";

interface LeagueSearchItem {
  league: { id: number; name: string };
}
interface TeamSearchItem {
  team: { id: number; name: string };
}

/**
 * Resolves a free-text league name to its numeric id. Checks the hard-coded seed list first
 * (free), then falls back to a cached `/leagues?search=` call. Returns undefined if nothing
 * matches or the lookup was budget-blocked.
 */
export async function resolveLeagueId(name: string, log?: AgentCallLog[]): Promise<number | undefined> {
  const known = lookupKnownLeagueId(name);
  if (known !== undefined) return known;

  const result = await guardedCall<LeagueSearchItem[]>("leagues", { search: name }, { log });
  if (!result.ok || !result.data || result.data.length === 0) return undefined;
  return result.data[0]?.league.id;
}

/** Resolves a free-text team name to its numeric id via a cached `/teams?search=` call. */
export async function resolveTeamId(name: string, log?: AgentCallLog[]): Promise<number | undefined> {
  const result = await guardedCall<TeamSearchItem[]>("teams", { search: name }, { log });
  if (!result.ok || !result.data || result.data.length === 0) return undefined;
  return result.data[0]?.team.id;
}
