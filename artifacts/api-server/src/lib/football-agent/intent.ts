export type Intent =
  | { kind: "LIVE_SCORES" }
  | { kind: "STANDINGS"; league: string }
  | { kind: "NEXT_FIXTURES"; team: string; count: number }
  | { kind: "LAST_FIXTURES"; team: string; count: number }
  | { kind: "HEAD_TO_HEAD"; teamA: string; teamB: string }
  | { kind: "PREDICTION"; teamA: string; teamB: string }
  | { kind: "TOP_SCORERS"; league: string }
  | { kind: "TOP_ASSISTS"; league: string }
  | { kind: "INJURIES"; team: string }
  | { kind: "TEAM_INFO"; team: string }
  | { kind: "ODDS"; teamA: string; teamB: string }
  | { kind: "UNKNOWN"; raw: string };

const DEFAULT_LEAGUE = "premier league";

/**
 * A small, deterministic keyword/regex classifier — intentionally NOT an LLM call, so classifying
 * intent never touches the api-football budget and never costs a Gemini token either. It only
 * needs to be good enough to pick the right endpoint plan; the actual grounding always comes from
 * live API data, never from the classifier's guesses.
 */
export function classifyIntent(question: string): Intent {
  const q = question.trim().toLowerCase();

  if (/\blive\b|in.?play|right now|currently playing/.test(q)) {
    return { kind: "LIVE_SCORES" };
  }

  const vsMatch = q.match(/([a-z .'-]+?)\s+(?:vs\.?|v\.?|versus|against)\s+([a-z .'-]+)/);
  if (vsMatch?.[1] && vsMatch?.[2]) {
    const teamA = cleanTeamName(vsMatch[1]);
    const teamB = cleanTeamName(vsMatch[2]);
    if (/predict|who.?s? (going to|gonna) win|win probability|forecast/.test(q)) {
      return { kind: "PREDICTION", teamA, teamB };
    }
    if (/odds|betting|bookmaker|moneyline/.test(q)) {
      return { kind: "ODDS", teamA, teamB };
    }
    return { kind: "HEAD_TO_HEAD", teamA, teamB };
  }

  const tableMatch = /table|standings|rankings|points table/;
  if (tableMatch.test(q)) {
    return { kind: "STANDINGS", league: extractLeague(q) ?? DEFAULT_LEAGUE };
  }

  if (/top scorer|golden boot|most goals/.test(q)) {
    return { kind: "TOP_SCORERS", league: extractLeague(q) ?? DEFAULT_LEAGUE };
  }

  if (/top assist|most assists/.test(q)) {
    return { kind: "TOP_ASSISTS", league: extractLeague(q) ?? DEFAULT_LEAGUE };
  }

  const injuredMatch = q.match(/(?:injuries|injured|out injured|fitness) (?:for|on|at)?\s*([a-z .'-]+)/);
  if (injuredMatch?.[1]) {
    return { kind: "INJURIES", team: cleanTeamName(injuredMatch[1]) };
  }

  const nextMatch = q.match(/next\s+(\d+)?\s*(?:fixtures?|matches?|games?)\s*(?:for|of)?\s*([a-z .'-]+)?/);
  if (nextMatch) {
    const count = nextMatch[1] ? Number(nextMatch[1]) : 5;
    const team = nextMatch[2] ? cleanTeamName(nextMatch[2]) : extractTrailingTeam(q);
    if (team) return { kind: "NEXT_FIXTURES", team, count: Math.min(count, 10) };
  }

  const lastMatch = q.match(/last\s+(\d+)?\s*(?:fixtures?|matches?|games?|results?)\s*(?:for|of)?\s*([a-z .'-]+)?/);
  if (lastMatch) {
    const count = lastMatch[1] ? Number(lastMatch[1]) : 5;
    const team = lastMatch[2] ? cleanTeamName(lastMatch[2]) : extractTrailingTeam(q);
    if (team) return { kind: "LAST_FIXTURES", team, count: Math.min(count, 10) };
  }

  const infoMatch = q.match(/(?:about|info(?:rmation)? on|tell me about)\s+([a-z .'-]+)/);
  if (infoMatch?.[1]) {
    return { kind: "TEAM_INFO", team: cleanTeamName(infoMatch[1]) };
  }

  return { kind: "UNKNOWN", raw: question };
}

function extractLeague(q: string): string | undefined {
  for (const league of ["premier league", "la liga", "bundesliga", "serie a", "ligue 1", "champions league", "eredivisie", "mls"]) {
    if (q.includes(league)) return league;
  }
  return undefined;
}

function extractTrailingTeam(q: string): string | undefined {
  const words = q.split(/\s+/).filter((w) => !["what", "are", "the", "next", "last", "fixtures", "matches", "games", "for", "of", "results", "show", "me"].includes(w));
  return words.length ? cleanTeamName(words.slice(-2).join(" ")) : undefined;
}

function cleanTeamName(raw: string): string {
  return raw.replace(/[?.!]/g, "").trim();
}
