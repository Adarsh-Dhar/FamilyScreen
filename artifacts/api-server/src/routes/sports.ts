import { Router, type IRouter } from "express";
import { z } from "zod";
import { getLiveMatches, getMatchState, getAllMatches } from "../lib/sports-data";
import { answerQuestion } from "../lib/gemini";

const router: IRouter = Router();

const MatchIdSchema = z.object({
  id: z.string(),
});

const AskQuestionSchema = z.object({
  question: z.string().min(1).max(200),
});

router.get("/matches", (_req, res) => {
  const matches = getLiveMatches();
  res.json({ matches });
});

router.get("/matches/:id", (req, res) => {
  const parsed = MatchIdSchema.safeParse(req.params);
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
  const params = MatchIdSchema.safeParse(req.params);
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
