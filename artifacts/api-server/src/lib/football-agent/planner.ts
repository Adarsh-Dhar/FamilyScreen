import type { Intent } from "./intent";
import { resolveLeagueId, resolveTeamId } from "./resolve";
import { guardedCall } from "./guarded-call";
import { currentSeasonYear } from "./known-leagues";
import type { AgentCallLog } from "./types";

export interface PlanResult {
  /** Human-readable summary of what we couldn't fetch, if anything — surfaced to the user honestly. */
  gaps: string[];
  /** Raw payloads keyed by a short label the synthesizer understands (e.g. "standings", "fixtures"). */
  data: Record<string, unknown>;
  callsUsed: AgentCallLog[];
}

/**
 * Turns one classified `Intent` into the smallest sequence of `guardedCall`s that can answer it,
 * resolving team/league names to ids along the way (itself budget-aware and cached). Every branch
 * degrades gracefully: if a resolve or fetch step is blocked by the daily budget, that's recorded
 * in `gaps` rather than thrown, so the agent can still say "here's what I have" instead of failing
 * outright.
 */
export async function planAndExecute(intent: Intent): Promise<PlanResult> {
  const log: AgentCallLog[] = [];
  const gaps: string[] = [];
  const data: Record<string, unknown> = {};
  const season = currentSeasonYear();

  switch (intent.kind) {
    case "LIVE_SCORES": {
      const res = await guardedCall("fixtures.live", { live: "all" }, { log });
      if (res.ok) data["liveFixtures"] = res.data;
      else gaps.push(res.reason ?? "Could not fetch live fixtures.");
      break;
    }

    case "STANDINGS": {
      const leagueId = await resolveLeagueId(intent.league, log);
      if (leagueId === undefined) {
        gaps.push(`Could not resolve league "${intent.league}".`);
        break;
      }
      const res = await guardedCall("standings", { league: leagueId, season }, { log });
      if (res.ok) data["standings"] = res.data;
      else gaps.push(res.reason ?? "Could not fetch standings.");
      break;
    }

    case "NEXT_FIXTURES":
    case "LAST_FIXTURES": {
      const teamId = await resolveTeamId(intent.team, log);
      if (teamId === undefined) {
        gaps.push(`Could not resolve team "${intent.team}".`);
        break;
      }
      const key = intent.kind === "NEXT_FIXTURES" ? "next" : "last";
      const res = await guardedCall("fixtures.list", { team: teamId, [key]: intent.count }, { log });
      if (res.ok) data["fixtures"] = res.data;
      else gaps.push(res.reason ?? "Could not fetch fixtures.");
      break;
    }

    case "HEAD_TO_HEAD": {
      const [idA, idB] = await Promise.all([resolveTeamId(intent.teamA, log), resolveTeamId(intent.teamB, log)]);
      if (idA === undefined || idB === undefined) {
        gaps.push(`Could not resolve "${idA === undefined ? intent.teamA : intent.teamB}".`);
        break;
      }
      const res = await guardedCall("fixtures.headtohead", { h2h: `${idA}-${idB}`, last: 10 }, { log });
      if (res.ok) data["headToHead"] = res.data;
      else gaps.push(res.reason ?? "Could not fetch head-to-head history.");
      break;
    }

    case "PREDICTION": {
      const fixtureId = await findUpcomingFixtureId(intent.teamA, intent.teamB, log, gaps);
      if (fixtureId === undefined) break;
      const res = await guardedCall("predictions", { fixture: fixtureId }, { log });
      if (res.ok) data["prediction"] = res.data;
      else gaps.push(res.reason ?? "Could not fetch prediction.");
      break;
    }

    case "ODDS": {
      const fixtureId = await findUpcomingFixtureId(intent.teamA, intent.teamB, log, gaps);
      if (fixtureId === undefined) break;
      const res = await guardedCall("odds", { fixture: fixtureId }, { log });
      if (res.ok) data["odds"] = res.data;
      else gaps.push(res.reason ?? "Could not fetch odds.");
      break;
    }

    case "TOP_SCORERS":
    case "TOP_ASSISTS": {
      const leagueId = await resolveLeagueId(intent.league, log);
      if (leagueId === undefined) {
        gaps.push(`Could not resolve league "${intent.league}".`);
        break;
      }
      const endpointKey = intent.kind === "TOP_SCORERS" ? "players.topscorers" : "players.topassists";
      const res = await guardedCall(endpointKey, { league: leagueId, season }, { log });
      if (res.ok) data[intent.kind === "TOP_SCORERS" ? "topScorers" : "topAssists"] = res.data;
      else gaps.push(res.reason ?? "Could not fetch rankings.");
      break;
    }

    case "INJURIES": {
      const teamId = await resolveTeamId(intent.team, log);
      if (teamId === undefined) {
        gaps.push(`Could not resolve team "${intent.team}".`);
        break;
      }
      const res = await guardedCall("injuries", { team: teamId, season }, { log });
      if (res.ok) data["injuries"] = res.data;
      else gaps.push(res.reason ?? "Could not fetch injuries.");
      break;
    }

    case "TEAM_INFO": {
      const res = await guardedCall("teams", { search: intent.team }, { log });
      if (res.ok) data["teamInfo"] = res.data;
      else gaps.push(res.reason ?? "Could not fetch team info.");
      break;
    }

    case "UNKNOWN": {
      gaps.push("Could not understand the question well enough to pick an endpoint.");
      break;
    }
  }

  return { gaps, data, callsUsed: log };
}

/** Shared by PREDICTION and ODDS: both need the next scheduled fixture id between two named teams. */
async function findUpcomingFixtureId(
  teamAName: string,
  teamBName: string,
  log: AgentCallLog[],
  gaps: string[],
): Promise<number | undefined> {
  const teamAId = await resolveTeamId(teamAName, log);
  if (teamAId === undefined) {
    gaps.push(`Could not resolve team "${teamAName}".`);
    return undefined;
  }

  const res = await guardedCall<Array<{ fixture: { id: number }; teams: { home: { id: number }; away: { id: number } } }>>(
    "fixtures.list",
    { team: teamAId, next: 5 },
    { log },
  );
  if (!res.ok || !res.data) {
    gaps.push(res.reason ?? "Could not look up the upcoming fixture.");
    return undefined;
  }

  const teamBId = await resolveTeamId(teamBName, log);
  const match = res.data.find(
    (f) => teamBId !== undefined && (f.teams.home.id === teamBId || f.teams.away.id === teamBId),
  );

  if (!match) {
    gaps.push(`Could not find a scheduled fixture between "${teamAName}" and "${teamBName}" in the next 5 for ${teamAName}.`);
    return undefined;
  }
  return match.fixture.id;
}
