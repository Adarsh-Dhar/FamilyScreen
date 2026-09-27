import { guardedCall } from "./sports/core/guarded-call";
import { getSportEndpoint } from "./sports/endpoints";
import type { AgentCallLog } from "./football-agent/types";

export interface MatchPrediction {
  homeWin: number; // 0-100
  draw: number; // 0-100
  awayWin: number; // 0-100
  rationale: string;
  confidence: "high" | "medium" | "low";
  dataSources: string[];
}

export interface PredictionRequest {
  fixtureId: number;
  homeTeamId: number;
  awayTeamId: number;
  leagueId: number;
  season: number;
  homeTeamName: string;
  awayTeamName: string;
}

/**
 * Subagent for generating AI-powered match predictions. Calls multiple API-Football endpoints
 * in parallel (team statistics, head-to-head, injuries, predictions) and uses Gemini to synthesize
 * a three-way probability (home/draw/away) with grounding-strict JSON output.
 * 
 * Uses 5 API calls per prediction, so should only be called once per fixture (on first sight),
 * not on every poll tick.
 */
export async function generateMatchPrediction(
  request: PredictionRequest,
  log?: AgentCallLog[]
): Promise<MatchPrediction | undefined> {
  const { fixtureId, homeTeamId, awayTeamId, leagueId, season, homeTeamName, awayTeamName } = request;

  // Cap season at 2024 for free API plan compatibility
  const cappedSeason = Math.min(season, 2024);

  // Call multiple endpoints in parallel for comprehensive data
  // Use Promise.allSettled to handle individual failures gracefully
  // Reduced to 3 calls to avoid rate limiting while still providing good data
  const [homeStats, awayStats, h2h] = await Promise.allSettled([
    guardedCall("football", "teams.statistics", getSportEndpoint("football", "teams.statistics").path, getSportEndpoint("football", "teams.statistics"), { league: leagueId, season: cappedSeason, team: homeTeamId }, { log }),
    guardedCall("football", "teams.statistics", getSportEndpoint("football", "teams.statistics").path, getSportEndpoint("football", "teams.statistics"), { league: leagueId, season: cappedSeason, team: awayTeamId }, { log }),
    guardedCall("football", "fixtures.headtohead", getSportEndpoint("football", "fixtures.headtohead").path, getSportEndpoint("football", "fixtures.headtohead"), { h2h: `${homeTeamId}-${awayTeamId}` }, { log }),
  ]);

  // Collect available data sources for transparency
  const dataSources: string[] = [];
  if (homeStats.status === "fulfilled" && homeStats.value?.ok) dataSources.push("home-team-stats");
  if (awayStats.status === "fulfilled" && awayStats.value?.ok) dataSources.push("away-team-stats");
  if (h2h.status === "fulfilled" && h2h.value?.ok) dataSources.push("head-to-head");

  // If we got no data at all, return undefined
  if (dataSources.length === 0) {
    return undefined;
  }

  // Assemble the data for Gemini
  const predictionData = {
    fixture: {
      id: fixtureId,
      homeTeam: homeTeamName,
      awayTeam: awayTeamName,
      leagueId,
      season: cappedSeason,
    },
    homeStats: homeStats.status === "fulfilled" && homeStats.value?.ok ? homeStats.value.data : null,
    awayStats: awayStats.status === "fulfilled" && awayStats.value?.ok ? awayStats.value.data : null,
    headToHead: h2h.status === "fulfilled" && h2h.value?.ok ? h2h.value.data : null,
    availableDataSources: dataSources,
  };

  // Call Gemini to synthesize the prediction
  const aiPrediction = await callGeminiForPrediction(predictionData);
  if (!aiPrediction) {
    return undefined;
  }

  return {
    ...aiPrediction,
    dataSources,
  };
}

async function callGeminiForPrediction(data: any): Promise<Omit<MatchPrediction, "dataSources"> | undefined> {
  const apiKey = process.env["GEMINI_API_KEY"];
  if (!apiKey) {
    console.warn("GEMINI_API_KEY not set, skipping AI prediction");
    return undefined;
  }

  try {
    const prompt = `You are a football prediction expert. Analyze the following match data and predict the outcome as three probabilities: home win, draw, away win.

Match: ${data.fixture.homeTeam} vs ${data.fixture.awayTeam}
League ID: ${data.fixture.leagueId}, Season: ${data.fixture.season}

Available data sources: ${data.availableDataSources.join(", ")}

${data.homeStats ? `Home team stats: ${JSON.stringify(data.homeStats).slice(0, 2000)}` : "Home team stats: not available"}
${data.awayStats ? `Away team stats: ${JSON.stringify(data.awayStats).slice(0, 2000)}` : "Away team stats: not available"}
${data.headToHead ? `Head-to-head: ${JSON.stringify(data.headToHead).slice(0, 2000)}` : "Head-to-head: not available"}

IMPORTANT RULES:
1. Return ONLY valid JSON in this exact format:
{
  "homeWin": number between 0-100,
  "draw": number between 0-100,
  "awayWin": number between 0-100,
  "rationale": "brief explanation (2-3 sentences)",
  "confidence": "high" or "medium" or "low"
}
2. The three probabilities MUST sum to exactly 100
3. If data is missing, mention it in the rationale but still provide your best estimate
4. Be realistic - don't give extreme probabilities without strong evidence
5. Use only the provided data - do not add outside knowledge about teams`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.4,
            maxOutputTokens: 500,
          },
        }),
      }
    );

    if (!response.ok) {
      console.error("Gemini API error:", response.status, response.statusText);
      return undefined;
    }

    const payload = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = payload.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!text) {
      console.error("No response from Gemini");
      return undefined;
    }

    const prediction = JSON.parse(text) as Omit<MatchPrediction, "dataSources">;

    // Validate the response
    if (
      typeof prediction.homeWin !== "number" ||
      typeof prediction.draw !== "number" ||
      typeof prediction.awayWin !== "number" ||
      typeof prediction.rationale !== "string" ||
      !["high", "medium", "low"].includes(prediction.confidence)
    ) {
      console.error("Invalid prediction format from Gemini:", prediction);
      return undefined;
    }

    // Ensure probabilities sum to 100
    const total = prediction.homeWin + prediction.draw + prediction.awayWin;
    if (Math.abs(total - 100) > 5) {
      // Normalize if significantly off
      const factor = 100 / total;
      prediction.homeWin = Math.round(prediction.homeWin * factor);
      prediction.draw = Math.round(prediction.draw * factor);
      prediction.awayWin = 100 - prediction.homeWin - prediction.draw;
    }

    return prediction;
  } catch (error) {
    console.error("Error calling Gemini for prediction:", error);
    return undefined;
  }
}
