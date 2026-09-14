import { Router, type IRouter } from "express";
import {
  ConfirmPairingBody,
  CreatePairingBody,
  DecideTitleBody,
  GetPairingStatusParams,
  GetProfilesParams,
  SearchTitlesQueryParams,
  SelectTitleBody,
  UpdateThresholdsBody,
  UpdateThresholdsParams,
} from "@workspace/api-zod";
import { randomUUID } from "node:crypto";
import { getGuide, getOrCreateAccount, findTitle, demoTitles, getAccounts, type ParentAccount, type ThresholdLevel, type Thresholds, type Title } from "../lib/family-data";
import { broadcast } from "../lib/family-socket";

const router: IRouter = Router();
const pairings = new Map<string, { parentAccountId: string; confirmed: boolean; expiresAt: string }>();
const requests = new Map<string, { parentAccountId: string; childProfileId: string; title: Title }>();
const levelOrder: ThresholdLevel[] = ["none", "mild", "moderate", "severe"];

function asJson<T>(value: T): T {
  return value;
}

function deterministicVerdict(title: Title, childThresholds: Thresholds) {
  const guide = getGuide(title.id);
  const concerns = Object.entries(guide.levels)
    .filter(([category, level]) => level && levelOrder.indexOf(level) > levelOrder.indexOf(childThresholds[category as keyof Thresholds]))
    .map(([category]) => category);
  const verdict = concerns.length === 0 ? "approved" : concerns.length > 1 || concerns.includes("scaryContent") ? "blocked" : "flagged";
  const reason = concerns.length === 0
    ? `${title.title} stays within ${childThresholds === childThresholds ? "this profile's" : "the profile's"} content limits.`
    : `${title.title} includes ${concerns.map((item) => item.replace("sexContent", "sexual content")).join(" and ")} above this profile's limits.`;
  return { verdict, reason, categoriesOfConcern: concerns };
}

async function getContentVerdict(title: Title, child: ParentAccount["children"][number]) {
  const guide = getGuide(title.id);
  const fallback = deterministicVerdict(title, child.thresholds);
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return fallback;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `You are a parental content advisor. Given this content guide data for "${title.title}": "${guide.summary}", and a child profile of age ${child.age} with these thresholds: ${JSON.stringify(child.thresholds)}, respond ONLY with JSON: {"verdict":"approved"|"flagged"|"blocked","reason":"one sentence, plain language","categoriesOfConcern":["violence","language","sexContent","substances","scaryContent"]}`,
          }],
        }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.1 },
      }),
    });
    if (!response.ok) return fallback;
    const payload = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const raw = payload.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!raw) return fallback;
    const parsed = JSON.parse(raw.replace(/^```json\s*/i, "").replace(/```$/i, "").trim()) as Partial<typeof fallback>;
    if (!["approved", "flagged", "blocked"].includes(parsed.verdict ?? "")) return fallback;
    return {
      verdict: parsed.verdict as typeof fallback.verdict,
      reason: parsed.reason || fallback.reason,
      categoriesOfConcern: Array.isArray(parsed.categoriesOfConcern) ? parsed.categoriesOfConcern : fallback.categoriesOfConcern,
    };
  } catch {
    return fallback;
  }
}

function normalizeTmdbResult(item: Record<string, unknown>): Title {
  const mediaTitle = String(item.title ?? item.name ?? "Untitled");
  const releaseDate = String(item.release_date ?? item.first_air_date ?? "");
  return {
    id: `tmdb-${String(item.id)}`,
    title: mediaTitle,
    year: Number(releaseDate.slice(0, 4)) || 2024,
    posterPath: item.poster_path ? `https://image.tmdb.org/t/p/w500${String(item.poster_path)}` : "",
    overview: String(item.overview ?? "No overview available."),
    genres: [],
    service: "Streaming",
  };
}

router.post("/pair", (req, res) => {
  const parsed = CreatePairingBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "A parent account is required." });
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  pairings.set(code, { parentAccountId: parsed.data.parentAccountId, confirmed: false, expiresAt });
  getOrCreateAccount(parsed.data.parentAccountId);
  return res.json(asJson({ code, parentAccountId: parsed.data.parentAccountId, expiresAt }));
});

router.post("/pair/confirm", (req, res) => {
  const parsed = ConfirmPairingBody.safeParse(req.body);
  const session = parsed.success ? pairings.get(parsed.data.code) : undefined;
  if (!session || new Date(session.expiresAt).getTime() < Date.now()) return res.status(404).json({ error: "Pairing code not found or expired." });
  session.confirmed = true;
  return res.json(getOrCreateAccount(session.parentAccountId));
});

router.get("/pair/status/:code", (req, res) => {
  const parsed = GetPairingStatusParams.safeParse(req.params);
  const session = parsed.success ? pairings.get(parsed.data.code) : undefined;
  if (!session || new Date(session.expiresAt).getTime() < Date.now()) return res.json({ confirmed: false, parentAccount: null });
  return res.json({ confirmed: session.confirmed, parentAccount: session.confirmed ? getOrCreateAccount(session.parentAccountId) : null });
});

router.get("/profiles/:parentId", (req, res) => {
  const parsed = GetProfilesParams.safeParse(req.params);
  if (!parsed.success) return res.status(400).json({ error: "Parent account is required." });
  return res.json({ parentAccount: getOrCreateAccount(parsed.data.parentId) });
});

router.post("/profiles/:childId/thresholds", (req, res) => {
  const path = UpdateThresholdsParams.safeParse(req.params);
  const body = UpdateThresholdsBody.safeParse(req.body);
  if (!path.success || !body.success) return res.status(400).json({ error: "Invalid thresholds." });
  for (const account of getAccounts().values()) {
    const child = account.children.find((item) => item.id === path.data.childId);
    if (child) {
      child.thresholds = body.data;
      broadcast(account.id, { type: "thresholds_updated", childProfileId: child.id, thresholds: child.thresholds });
      return res.json(child);
    }
  }
  return res.status(404).json({ error: "Child profile not found." });
});

router.get("/search", async (req, res) => {
  const parsed = SearchTitlesQueryParams.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: "Search text is required." });
  const query = parsed.data.q.trim().toLowerCase();
  const apiKey = process.env.TMDB_API_KEY;
  if (apiKey) {
    try {
      const response = await fetch(`https://api.themoviedb.org/3/search/multi?api_key=${encodeURIComponent(apiKey)}&query=${encodeURIComponent(parsed.data.q)}&include_adult=false`);
      if (response.ok) {
        const payload = await response.json() as { results?: Array<Record<string, unknown>> };
        const results = (payload.results ?? []).filter((item) => item.media_type === "movie" || item.media_type === "tv").slice(0, 12).map(normalizeTmdbResult);
        return res.json({ source: "TMDB", results });
      }
    } catch {
      // Use the local demo catalog when TMDB is not available.
    }
  }
  const results = demoTitles.filter((title) => `${title.title} ${title.genres.join(" ")}`.toLowerCase().includes(query)).slice(0, 12);
  return res.json({ source: "Demo catalog", results });
});

router.post("/select-title", async (req, res) => {
  const parsed = SelectTitleBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Title, child, and parent account are required." });
  const title = findTitle(parsed.data.titleId);
  const account = getOrCreateAccount(parsed.data.parentAccountId);
  const child = account.children.find((item) => item.id === parsed.data.childProfileId);
  if (!title || !child) return res.status(404).json({ error: "Title or child profile not found." });
  const verdict = await getContentVerdict(title, child);
  const requestId = randomUUID();
  requests.set(requestId, { parentAccountId: account.id, childProfileId: child.id, title });
  const response = { requestId, verdict: verdict.verdict, title, reason: verdict.reason, categoriesOfConcern: verdict.categoriesOfConcern, service: title.service };
  if (verdict.verdict !== "approved") broadcast(account.id, { type: "title_flagged", ...response, childProfileId: child.id, parentAccountId: account.id });
  return res.json(response);
});

router.post("/approve", (req, res) => {
  const parsed = DecideTitleBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "A request and decision are required." });
  const pending = requests.get(parsed.data.requestId);
  if (!pending || pending.parentAccountId !== parsed.data.parentAccountId) return res.status(404).json({ error: "Approval request not found." });
  requests.delete(parsed.data.requestId);
  broadcast(parsed.data.parentAccountId, { type: "parent_decision", requestId: parsed.data.requestId, decision: parsed.data.decision, title: pending.title });
  return res.json({ ok: true, decision: parsed.data.decision });
});

export default router;