import { Router, type IRouter } from "express";
import { z } from "zod";
import { getLiveMatches, getMatchState, getAllMatches, getLiveGames, getGameState, getAllGames, getPastGames } from "../lib/sports-data";
import { answerQuestion } from "../lib/gemini";
import { getAllSports, type SportId } from "../lib/sports/registry";

const router: IRouter = Router();

const SportIdSchema = z.object({
  sport: z.enum(["football", "basketball", "baseball", "hockey", "handball", "volleyball", "rugby", "afl", "nfl", "nba", "formula1", "mma"]),
});

const GameIdSchema = z.object({
  id: z.string(),
});

const AskQuestionSchema = z.object({
  question: z.string().min(1).max(200),
});

// Get all available sports
router.get("/sports", (_req, res) => {
  const sports = getAllSports();
  res.json({ sports });
});

// Multi-sport games endpoints
router.get("/:sport/games", (req, res) => {
  const sportParsed = SportIdSchema.safeParse(req.params);
  if (!sportParsed.success) {
    return res.status(400).json({ error: "Invalid sport ID" });
  }

  const games = getLiveGames(sportParsed.data.sport);
  res.json({ games });
});

router.get("/:sport/games/past", async (req, res) => {
  const sportParsed = SportIdSchema.safeParse(req.params);
  if (!sportParsed.success) {
    return res.status(400).json({ error: "Invalid sport ID" });
  }

  try {
    const games = await getPastGames(sportParsed.data.sport);
    res.json({ games });
  } catch (error) {
    console.error("Failed to fetch past games:", error);
    res.status(500).json({ error: "Failed to fetch past games" });
  }
});

router.get("/:sport/games/:id", async (req, res) => {
  const sportParsed = SportIdSchema.safeParse(req.params);
  const gameParsed = GameIdSchema.safeParse(req.params);
  
  if (!sportParsed.success) {
    return res.status(400).json({ error: "Invalid sport ID" });
  }
  
  if (!gameParsed.success) {
    return res.status(400).json({ error: "Invalid game ID" });
  }

  // First check in-memory state (for live games)
  let gameState = getGameState(sportParsed.data.sport, gameParsed.data.id);
  
  // If not found in memory, fetch from API (for past games)
  if (!gameState) {
    try {
      const { fetchGameById } = await import("../lib/sports-data");
      gameState = await fetchGameById(sportParsed.data.sport, gameParsed.data.id);
    } catch (error) {
      console.error("Failed to fetch game by ID:", error);
      return res.status(500).json({ error: "Failed to fetch game details" });
    }
  }
  
  if (!gameState) {
    return res.status(404).json({ error: "Game not found" });
  }

  res.json(gameState);
});

// Football-specific question answering (Q&A agent)
router.post("/:sport/games/:id/ask", async (req, res) => {
  const sportParsed = SportIdSchema.safeParse(req.params);
  const gameParsed = GameIdSchema.safeParse(req.params);
  const body = AskQuestionSchema.safeParse(req.body);

  if (!sportParsed.success) {
    return res.status(400).json({ error: "Invalid sport ID" });
  }
  
  if (!gameParsed.success) {
    return res.status(400).json({ error: "Invalid game ID" });
  }

  if (!body.success) {
    return res.status(400).json({ error: "Invalid question" });
  }

  // Q&A only available for football currently
  if (sportParsed.data.sport !== "football") {
    return res.status(400).json({ error: "Q&A not available for this sport" });
  }

  const gameState = getGameState(sportParsed.data.sport, gameParsed.data.id);
  if (!gameState) {
    return res.status(404).json({ error: "Game not found" });
  }

  const answer = await answerQuestion(gameState, body.data.question);
  res.json({ answer });
});

// Legacy football endpoints (for backward compatibility)
router.get("/matches", (_req, res) => {
  const matches = getLiveMatches();
  res.json({ matches });
});

router.get("/matches/:id", (req, res) => {
  const parsed = GameIdSchema.safeParse(req.params);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid match ID" });
  }

  const matchState = getMatchState(parsed.data.id);
  if (!matchState) {
    return res.status(404).json({ error: "Match not found" });
  }

  res.json(matchState);
});

router.post("/matches/:id/ask", async (req, res) => {
  const params = GameIdSchema.safeParse(req.params);
  const body = AskQuestionSchema.safeParse(req.body);

  if (!params.success) {
    return res.status(400).json({ error: "Invalid match ID" });
  }

  if (!body.success) {
    return res.status(400).json({ error: "Invalid question" });
  }

  const matchState = getMatchState(params.data.id);
  if (!matchState) {
    return res.status(404).json({ error: "Match not found" });
  }

  const answer = await answerQuestion(matchState, body.data.question);
  res.json({ answer });
});

export default router;
