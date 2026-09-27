// Mirrors backend sports-data.ts — keep these in sync with the backend schema.

export interface MatchEvent {
  type: "goal" | "card" | "substitution" | "whistle";
  team: "home" | "away";
  minute: number;
  description: string;
}

export interface CommentaryEntry {
  id: string;
  timestamp: string;
  text: string;
}

export interface WinProbabilitySnapshot {
  home: number;
  away: number;
  timestamp: string;
}

export interface MatchPrediction {
  homeWin: number;
  draw: number;
  awayWin: number;
  rationale: string;
  confidence: "high" | "medium" | "low";
  dataSources: string[];
}

export interface MatchState {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  homeTeamId: number;
  awayTeamId: number;
  leagueId: number;
  season: number;
  competition: string;
  homeScore: number;
  awayScore: number;
  elapsedMinutes: number;
  status: "live" | "finished" | "scheduled";
  events: MatchEvent[];
  commentary: CommentaryEntry[];
  winProbabilityHistory: WinProbabilitySnapshot[];
  currentWinProbability: { home: number; away: number };
  aiPrediction: MatchPrediction | null;
  aiPredictionStatus: "loading" | "ready" | "unavailable";
}

export interface Match {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  homeTeamId: number;
  awayTeamId: number;
  leagueId: number;
  season: number;
  competition: string;
  homeScore: number;
  awayScore: number;
  elapsedMinutes: number;
  status: "live" | "finished" | "scheduled";
}

export interface MatchesResponse {
  matches: Match[];
}

// WebSocket frames
export interface MatchUpdateFrame {
  type: "match_update";
  matchId: string;
  state: MatchState;
}

export interface CommentaryFrame {
  type: "commentary";
  matchId: string;
  commentary: CommentaryEntry;
}
