import { Router, type IRouter, type Response } from "express";
import { z } from "zod";
import { getAllSports, SPORTS_REGISTRY, type SportId } from "../lib/sports/registry";
import { fetchGameById, getGameState, getLiveGames, getPastGames, touchSport } from "../lib/sports-data";
import { getStandings, getActiveLeagues } from "../lib/sports-standings";
import { answerQuestion } from "../lib/gemini";
import { guardedCall } from "../lib/sports/core/guarded-call";
import { getSportEndpoint } from "../lib/sports/endpoints";
import { mapGame } from "../lib/sports/mappers";

const router: IRouter = Router();

const SPORT_IDS = Object.keys(SPORTS_REGISTRY) as [SportId, ...SportId[]];
const SportParam = z.enum(SPORT_IDS);
const AskBody = z.object({ question: z.string().min(1).max(200) });

/** Validates :sport; on failure it answers 400 itself and returns null. */
function sportOr400(raw: unknown, res: Response): SportId | null {
  const parsed = SportParam.safeParse(raw);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid sport ID" });
    return null;
  }
  touchSport(parsed.data);
  return parsed.data;
}

router.get("/sports", (_req, res) => {
  res.json({ sports: getAllSports() });
});

router.get("/:sport/games", async (req, res) => {
  const sport = sportOr400(req.params.sport, res);
  if (!sport) return;
  res.json({ games: await getLiveGames(sport) });
});

router.get("/:sport/games/past", async (req, res) => {
  const sport = sportOr400(req.params.sport, res);
  if (!sport) return;
  res.json({ games: await getPastGames(sport) });
});

router.get("/:sport/games/:id", async (req, res) => {
  const sport = sportOr400(req.params.sport, res);
  if (!sport) return;
  const id = String(req.params.id);
  const state = getGameState(sport, id) ?? (await fetchGameById(sport, id));
  if (!state) {
    res.status(404).json({ error: "Game not found" });
    return;
  }
  res.json(state);
});

/** Q&A works for every sport: it only reads the game's own score/events/commentary. */
router.post("/:sport/games/:id/ask", async (req, res) => {
  const sport = sportOr400(req.params.sport, res);
  if (!sport) return;
  const body = AskBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid question" });
    return;
  }
  const id = String(req.params.id);
  const state = getGameState(sport, id) ?? (await fetchGameById(sport, id));
  if (!state) {
    res.status(404).json({ error: "Game not found" });
    return;
  }
  res.json({ answer: await answerQuestion(state, body.data.question) });
});

/** Leagues that currently have a live game — feeds the standings picker without a hard-coded league list. */
router.get("/:sport/leagues/active", (req, res) => {
  const sport = sportOr400(req.params.sport, res);
  if (!sport) return;
  res.json({ leagues: getActiveLeagues(sport) });
});

/** All leagues for a sport — uses the sport's leagues endpoint if available. */
router.get("/:sport/leagues", async (req, res) => {
  const sport = sportOr400(req.params.sport, res);
  if (!sport) return;

  try {
    // Try to use the sport's leagues endpoint if it exists
    const def = getSportEndpoint(sport, "leagues");
    const result = await guardedCall<unknown[]>(sport, "leagues", def.path, def, {});
    
    if (result.ok && result.data) {
      // Extract league info from the response
      const leagues = extractLeagues(result.data);
      res.json({ leagues });
    } else {
      // Fallback to active leagues
      res.json({ leagues: getActiveLeagues(sport) });
    }
  } catch (error) {
    // If leagues endpoint doesn't exist, fall back to active leagues
    console.error("Failed to fetch leagues, using active leagues:", error);
    res.json({ leagues: getActiveLeagues(sport) });
  }
});

function extractLeagues(data: unknown[]): Array<{ leagueId: number; name: string; season: number | string }> {
  const leagues: Array<{ leagueId: number; name: string; season: number | string }> = [];
  for (const item of data) {
    const obj = item as any;
    if (obj.id && obj.name) {
      leagues.push({
        leagueId: typeof obj.id === "number" ? obj.id : Number(obj.id),
        name: String(obj.name),
        season: obj.season ?? new Date().getUTCFullYear(),
      });
    }
  }
  return leagues;
}

/** Teams in a league/season. Uses sport-specific endpoint keys (teams for football, games with league filter for others). */
router.get("/:sport/teams", async (req, res) => {
  const sport = sportOr400(req.params.sport, res);
  if (!sport) return;
  const q = z.object({ league: z.coerce.number().int().positive(), season: z.string().min(1) }).safeParse(req.query);
  if (!q.success) {
    res.status(400).json({ error: "league and season are required" });
    return;
  }

  try {
    let result;
    if (sport === "football") {
      const def = getSportEndpoint(sport, "teams");
      result = await guardedCall<unknown[]>(sport, "teams", def.path, def, { league: q.data.league, season: q.data.season });
    } else {
      // For other sports, use games endpoint with league/season filter to get unique teams
      const def = getSportEndpoint(sport, "games");
      result = await guardedCall<unknown[]>(sport, "games", def.path, def, { league: q.data.league, season: q.data.season });
    }

    if (!result.ok || !result.data) {
      res.status(500).json({ error: "Failed to fetch teams" });
      return;
    }

    // Extract unique teams from the response
    const teams = sport === "football" 
      ? result.data 
      : extractUniqueTeams(result.data);
    
    res.json({ teams });
  } catch (error) {
    console.error("Failed to fetch teams:", error);
    res.status(500).json({ error: "Failed to fetch teams" });
  }
});

/** Head-to-head history between two teams. Uses dedicated h2h endpoint when available. */
router.get("/:sport/games/:id/h2h", async (req, res) => {
  const sport = sportOr400(req.params.sport, res);
  if (!sport) return;
  const id = String(req.params.id);

  try {
    // First get the game to find the team IDs
    const gameState = getGameState(sport, id) ?? (await fetchGameById(sport, id));
    if (!gameState) {
      res.status(404).json({ error: "Game not found" });
      return;
    }

    const homeTeamId = gameState.homeTeamId;
    const awayTeamId = gameState.awayTeamId;

    // Sports with dedicated h2h endpoint: football, afl, baseball, basketball, handball, hockey, nba, nfl, rugby, volleyball
    const sportsWithH2hEndpoint = new Set<SportId>([
      "football", "afl", "baseball", "basketball", "handball", "hockey", "nba", "nfl", "rugby", "volleyball"
    ]);

    let result;
    if (sportsWithH2hEndpoint.has(sport)) {
      const endpointKey = sport === "football" ? "fixtures.headtohead" : "games.h2h";
      const def = getSportEndpoint(sport, endpointKey);
      result = await guardedCall<unknown[]>(sport, endpointKey, def.path, def, { 
        h2h: `${homeTeamId}-${awayTeamId}`,
        ...(sport === "football" ? { last: 10 } : {}),
      });
    } else {
      // Fallback for sports without h2h endpoint: fetch all games for home team in league/season
      const def = getSportEndpoint(sport, "games");
      result = await guardedCall<unknown[]>(sport, "games", def.path, def, { 
        league: gameState.leagueId, 
        season: gameState.season,
        team: homeTeamId,
      });
    }

    if (!result.ok || !result.data) {
      res.status(500).json({ error: "Failed to fetch head-to-head" });
      return;
    }

    // Map the raw API data to GameSummary format
    const mappedGames = (result.data as any[])
      .map((item) => mapGame(sport, item))
      .filter((game): game is NonNullable<typeof game> => game !== null);

    // For sports without dedicated h2h endpoint, filter to games between the two teams
    const filteredGames = sportsWithH2hEndpoint.has(sport)
      ? mappedGames
      : mappedGames.filter((game) => {
          const teamsMatch = 
            (game.homeTeamId === homeTeamId && game.awayTeamId === awayTeamId) ||
            (game.homeTeamId === awayTeamId && game.awayTeamId === homeTeamId);
          return teamsMatch;
        });

    res.json({ games: filteredGames });
  } catch (error) {
    console.error("Failed to fetch head-to-head:", error);
    res.status(500).json({ error: "Failed to fetch head-to-head" });
  }
});

/** Extract unique teams from games response for non-football sports */
function extractUniqueTeams(games: unknown[]): Array<{ id: number; name: string }> {
  const teamMap = new Map<number, string>();
  for (const game of games) {
    const item = game as any;
    if (item.teams?.home?.id && item.teams.home.name) {
      teamMap.set(item.teams.home.id, item.teams.home.name);
    }
    if (item.teams?.away?.id && item.teams.away.name) {
      teamMap.set(item.teams.away.id, item.teams.away.name);
    }
  }
  return Array.from(teamMap.entries()).map(([id, name]) => ({ id, name }));
}

router.get("/:sport/standings", async (req, res) => {
  const sport = sportOr400(req.params.sport, res);
  if (!sport) return;
  const q = z.object({ league: z.coerce.number().int().positive(), season: z.string().min(1) }).safeParse(req.query);
  if (!q.success) {
    res.status(400).json({ error: "league and season are required" });
    return;
  }
  res.json({ rows: await getStandings(sport, q.data.league, q.data.season) });
});

/** F1-specific race results endpoint */
router.get("/formula1/races/:id/results", async (req, res) => {
  const sport = sportOr400("formula1", res);
  if (!sport) return;
  const raceId = String(req.params.id);

  try {
    // Fetch race details to get circuit name
    const racesDef = getSportEndpoint("formula1", "races");
    const racesResult = await guardedCall<unknown[]>(sport, "races", racesDef.path, racesDef, { id: raceId });

    // Use the rankings/races endpoint for final classification
    const rankingsDef = getSportEndpoint("formula1", "rankings.races");
    const rankingsResult = await guardedCall<unknown[]>(sport, "rankings.races", rankingsDef.path, rankingsDef, { race: raceId });

    // Use the rankings/fastestlaps endpoint for fastest lap info
    const fastestLapsDef = getSportEndpoint("formula1", "rankings.fastestlaps");
    const fastestLapsResult = await guardedCall<unknown[]>(sport, "rankings.fastestlaps", fastestLapsDef.path, fastestLapsDef, { race: raceId });

    if (!rankingsResult.ok || !rankingsResult.data) {
      res.status(500).json({ error: "Failed to fetch race results" });
      return;
    }

    // Extract circuit name from race details
    let circuitName = "Grand Prix";
    if (racesResult.ok && racesResult.data && (racesResult.data as any[]).length > 0) {
      const race = (racesResult.data as any[])[0];
      circuitName = race.circuit?.name || race.competition?.name || "Grand Prix";
    }

    // Log first row for debugging
    if ((rankingsResult.data as any[]).length > 0) {
      console.warn("F1 rankings sample:", JSON.stringify((rankingsResult.data as any[])[0]));
    }

    // Parse the rankings data into our F1RaceData format with robust optional chaining
    const classification = (rankingsResult.data as any[]).map((item) => ({
      position: item.position ?? 0,
      driver: item.driver?.name ?? item.driver ?? "Unknown",
      team: item.team?.name ?? item.team ?? "Unknown",
      time: item.time ?? item.gap ?? (item.position === 0 ? "DNF" : "Unknown"),
      points: calculateF1Points(item.position),
    }));

    // Extract podium (top 3)
    const podium = classification.slice(0, 3);

    // Extract winner (position 1)
    const winner = classification.length > 0 && classification[0].position === 1 ? classification[0].driver : undefined;

    // Extract fastest lap from fastest laps data
    let fastestLap;
    if (fastestLapsResult.ok && fastestLapsResult.data && (fastestLapsResult.data as any[]).length > 0) {
      const fastest = (fastestLapsResult.data as any[])[0];
      console.warn("F1 fastest lap sample:", JSON.stringify(fastest));
      fastestLap = {
        driver: fastest.driver?.name ?? fastest.driver ?? "Unknown",
        team: fastest.team?.name ?? fastest.team ?? "Unknown",
        time: fastest.time ?? "Unknown",
        lap: fastest.lap ?? 0,
      };
    }

    // Get total laps from the first entry with fallback
    const laps = (rankingsResult.data as any[]).length > 0 
      ? ((rankingsResult.data as any[])[0].laps?.total ?? (rankingsResult.data as any[])[0].laps ?? 0) 
      : 0;

    res.json({
      circuit: circuitName,
      laps,
      winner,
      fastestLap,
      podium,
      classification,
    });
  } catch (error) {
    console.error("Failed to fetch F1 race results:", error);
    res.status(500).json({ error: "Failed to fetch race results" });
  }
});

/** Calculate F1 points based on finishing position */
function calculateF1Points(position: number): number | undefined {
  const pointsTable: Record<number, number> = {
    1: 25,
    2: 18,
    3: 15,
    4: 12,
    5: 10,
    6: 8,
    7: 6,
    8: 4,
    9: 2,
    10: 1,
  };
  return pointsTable[position] ?? undefined;
}

export default router;
