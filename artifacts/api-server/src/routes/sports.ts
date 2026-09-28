import { Router, type IRouter, type Response } from "express";
import { z } from "zod";
import { getAllSports, SPORTS_REGISTRY, type SportId } from "../lib/sports/registry";
import { fetchGameById, getGameState, getLiveGames, getPastGames, touchSport } from "../lib/sports-data";
import { getStandings, getActiveLeagues } from "../lib/sports-standings";
import { answerQuestion } from "../lib/gemini";

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

export default router;
