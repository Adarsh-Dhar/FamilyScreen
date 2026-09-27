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

export interface MatchState {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  competition: string;
  homeScore: number;
  awayScore: number;
  elapsedMinutes: number;
  status: "live" | "finished" | "scheduled";
  events: MatchEvent[];
  commentary: CommentaryEntry[];
  winProbabilityHistory: WinProbabilitySnapshot[];
  currentWinProbability: { home: number; away: number };
}

export interface Match {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
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

export interface ProbabilityUpdateFrame {
  type: "probability_update";
  matchId: string;
  probability: { home: number; away: number };
}
