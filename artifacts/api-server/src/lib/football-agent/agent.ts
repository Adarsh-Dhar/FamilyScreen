import { classifyIntent } from "./intent";
import { planAndExecute } from "./planner";
import { getQuotaManager } from "./quota";
import type { AgentAnswer } from "./types";

/**
 * Public entry point for the football agent. Ask it a plain-English question; it classifies the
 * intent for free, executes the minimal set of quota/cache-guarded API-Football calls needed to
 * answer it, and returns a grounded answer plus a transparent log of exactly which endpoints were
 * hit (and whether from cache) — nothing here is ever invented from outside knowledge.
 */
export async function askFootballAgent(question: string): Promise<AgentAnswer> {
  const intent = classifyIntent(question);
  const plan = await planAndExecute(intent);
  const answer = await synthesizeAnswer(question, plan.data, plan.gaps);
  const quota = getQuotaManager();

  return {
    answer,
    callsUsed: plan.callsUsed,
    budgetLimited: plan.gaps.some((g) => g.toLowerCase().includes("quota") || g.toLowerCase().includes("budget")),
    quotaRemainingToday: quota.remainingTotal(),
  };
}

/**
 * Turns fetched data into prose. Deterministic templating by default (works with zero extra cost
 * and zero extra dependencies); if GEMINI_API_KEY is set and USE_GEMINI_SYNTHESIS=true, asks
 * Gemini to phrase the same, already-fetched JSON more naturally — the model is explicitly told
 * to use ONLY the provided data, matching the grounding rule already used in lib/gemini.ts.
 */
async function synthesizeAnswer(question: string, data: Record<string, unknown>, gaps: string[]): Promise<string> {
  if (Object.keys(data).length === 0) {
    return gaps.length ? `I couldn't answer that: ${gaps.join(" ")}` : "I couldn't find any data for that question.";
  }

  const useGemini = process.env["USE_GEMINI_SYNTHESIS"] === "true" && Boolean(process.env["GEMINI_API_KEY"]);
  if (useGemini) {
    const polished = await synthesizeWithGemini(question, data, gaps);
    if (polished) return polished;
  }

  const lines = Object.entries(data).map(([label, value]) => `${label}: ${JSON.stringify(value)}`);
  const gapNote = gaps.length ? `\n\n(Note: ${gaps.join(" ")})` : "";
  return `${lines.join("\n")}${gapNote}`;
}

async function synthesizeWithGemini(question: string, data: Record<string, unknown>, gaps: string[]): Promise<string | undefined> {
  const apiKey = process.env["GEMINI_API_KEY"];
  if (!apiKey) return undefined;

  try {
    const prompt = `You are a football (soccer) data assistant. Answer the user's question using ONLY the JSON data below — do not add any fact that isn't present in it. If the data is incomplete, say so plainly instead of guessing.

Question: "${question}"

Data:
${JSON.stringify(data).slice(0, 6000)}

${gaps.length ? `Known gaps: ${gaps.join(" ")}` : ""}

Respond with a concise, natural-language answer (a few sentences max). No JSON, no markdown.`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "text/plain", temperature: 0.3, maxOutputTokens: 300 },
      }),
    });

    if (!response.ok) return undefined;
    const payload = (await response.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    return payload.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  } catch {
    return undefined;
  }
}
