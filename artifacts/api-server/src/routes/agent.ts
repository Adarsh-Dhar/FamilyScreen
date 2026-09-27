import { Router, type IRouter } from "express";
import { z } from "zod";
import { askFootballAgent } from "../lib/football-agent/agent";
import { getQuotaManager } from "../lib/football-agent/quota";
import { getFootballCache } from "../lib/football-agent/cache";
import { ENDPOINTS } from "../lib/football-agent/endpoints";

const router: IRouter = Router();

const AskSchema = z.object({
  question: z.string().min(1).max(300),
});

/** POST /api/agent/ask { question } -> grounded answer + which endpoints were used. */
router.post("/agent/ask", async (req, res) => {
  const parsed = AskSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Body must be { question: string }, 1-300 chars." });
  }

  try {
    const result = await askFootballAgent(parsed.data.question);
    res.json(result);
  } catch (error) {
    res.status(502).json({ error: "Football agent failed.", detail: error instanceof Error ? error.message : String(error) });
  }
});

/** GET /api/agent/status -> today's quota usage/remaining and cache size. */
router.get("/agent/status", (_req, res) => {
  res.json({ quota: getQuotaManager().snapshot(), cache: getFootballCache().stats() });
});

/** GET /api/agent/endpoints -> the full 38-endpoint registry with caching/priority metadata. */
router.get("/agent/endpoints", (_req, res) => {
  res.json({ count: ENDPOINTS.length, endpoints: ENDPOINTS });
});

export default router;
