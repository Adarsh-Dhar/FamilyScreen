export interface CommentaryContext {
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  elapsedMinutes: number;
  recentEvents: string[];
  scoreChange?: boolean;
  /** e.g. "basketball" — keeps the prompt from talking about goals/minutes in every sport. */
  sport?: string;
  /** "63'", "Q3", "P2", "IN5" … */
  periodLabel?: string;
  probabilityChange?: { oldHome: number; newHome: number; oldAway: number; newAway: number };
}

export async function generateCommentary(context: CommentaryContext): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return generateFallbackCommentary(context);
  }

  try {
    const eventDescription = context.recentEvents.length > 0 
      ? context.recentEvents.join(". ") 
      : "No major events recently";

    const probabilityContext = context.probabilityChange
      ? `Win probability shifted from ${context.probabilityChange.oldHome}%/${context.probabilityChange.oldAway}% to ${context.probabilityChange.newHome}%/${context.probabilityChange.newAway}%`
      : "Win probability remains stable";

    const prompt = `You are a ${context.sport ?? "sports"} commentator. Given this game context:
- ${context.homeTeam} vs ${context.awayTeam}
- Current score: ${context.homeScore}-${context.awayScore}
- Game clock: ${context.periodLabel ?? `${context.elapsedMinutes}'`}
- Recent events: ${eventDescription}
- ${probabilityContext}

Generate ONE concise, exciting commentary line (under 140 characters) that captures the moment. Be dramatic but factual. Respond with ONLY the commentary text, no JSON.`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt,
          }],
        }],
        generationConfig: { 
          responseMimeType: "text/plain",
          temperature: 0.7,
          maxOutputTokens: 100,
        },
      }),
    });

    if (!response.ok) {
      return generateFallbackCommentary(context);
    }

    const payload = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const raw = payload.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    
    if (!raw) {
      return generateFallbackCommentary(context);
    }

    const cleaned = raw.replace(/^["']|["']$/g, "").trim();
    return cleaned.length > 140 ? cleaned.substring(0, 137) + "..." : cleaned;
  } catch {
    return generateFallbackCommentary(context);
  }
}

function generateFallbackCommentary(context: CommentaryContext): string {
  if (context.scoreChange) {
    if (context.homeScore > context.awayScore) {
      return `${context.homeTeam} takes the lead!`;
    } else if (context.awayScore > context.homeScore) {
      return `${context.awayTeam} strikes back!`;
    } else {
      return "All square now!";
    }
  }

  if (context.probabilityChange) {
    const homeShift = context.probabilityChange.newHome - context.probabilityChange.oldHome;
    if (Math.abs(homeShift) > 0.1) {
      return homeShift > 0 
        ? `Momentum shifting ${context.homeTeam}'s way!`
        : `${context.awayTeam} building pressure!`;
    }
  }

  const timePhrases = [
    "Intense battle unfolding",
    "Neither side giving an inch",
    "Tactical chess match",
    "Fans on the edge of their seats",
  ];
  return timePhrases[Math.floor(Math.random() * timePhrases.length)];
}

export async function answerQuestion(matchState: { sportId?: string; homeTeam?: string; awayTeam?: string; homeScore?: number; awayScore?: number; periodLabel?: string; events: Array<{ description: string }>; commentary: Array<{ text: string }> }, question: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return "AI commentary unavailable. Check the match events for details.";
  }

  try {
    const eventHistory = matchState.events.map(e => e.description).join(". ");
    const commentaryHistory = matchState.commentary.slice(-5).map(c => c.text).join(". ");
    
    const prompt = `You are a ${matchState.sportId ?? "sports"} analyst. Given this game information:
- Game: ${matchState.homeTeam ?? "Home"} ${matchState.homeScore ?? 0} - ${matchState.awayScore ?? 0} ${matchState.awayTeam ?? "Away"} (${matchState.periodLabel ?? "in progress"})
- Event history: ${eventHistory || "No major events yet"}
- Recent commentary: ${commentaryHistory || "No commentary yet"}

Answer this fan question: "${question}"

Base your answer ONLY on the provided match information. Do not use outside knowledge. Keep your answer under 200 characters. Respond with ONLY the answer text, no JSON.`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt,
          }],
        }],
        generationConfig: { 
          responseMimeType: "text/plain",
          temperature: 0.5,
          maxOutputTokens: 150,
        },
      }),
    });

    if (!response.ok) {
      return "Unable to process question at this time.";
    }

    const payload = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const raw = payload.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    
    if (!raw) {
      return "Unable to process question at this time.";
    }

    const cleaned = raw.replace(/^["']|["']$/g, "").trim();
    return cleaned.length > 200 ? cleaned.substring(0, 197) + "..." : cleaned;
  } catch {
    return "Unable to process question at this time.";
  }
}
