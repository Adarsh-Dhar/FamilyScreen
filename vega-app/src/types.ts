// Mirrors backend sports-data.ts — keep these in sync with the backend schema.

export type SportId =
  | "football"
  | "basketball"
  | "baseball"
  | "hockey"
  | "handball"
  | "volleyball"
  | "rugby"
  | "afl"
  | "nfl"
  | "nba"
  | "formula1"
  | "mma";

export type SportKind = "team-game" | "motorsport" | "combat";

export interface SportDefinition {
  id: SportId;
  label: string;
  icon: string;
  kind: SportKind;
  hasPredictions: boolean;
  supportsDraw: boolean;
  hasLiveGames: boolean;
  hasStandings: boolean;
  hasTeams: boolean;
  hasHeadToHead: boolean;
  description: string;
}

// Generic sport types
export interface GameEvent {
  type: "score" | "timeout" | "foul" | "substitution" | "whistle" | "goal" | "card";
  team: "home" | "away";
  minute: number;
  description: string;
}

export interface CommentaryEntry {
  id: string;
  timestamp: string;
  text: string;
}

export interface GameState {
  gameId: string;
  sportId: SportId;
  homeTeam: string;
  awayTeam: string;
  homeTeamId: number;
  awayTeamId: number;
  leagueId: number;
  season: number | string;
  competition: string;
  homeScore: number;
  awayScore: number;
  elapsedMinutes: number;
  /** "63'", "Q3", "P2", "IN5", "HT", "FT", "NS" — print this next to the score. */
  periodLabel: string;
  status: "live" | "finished" | "scheduled";
  events: GameEvent[];
  commentary: CommentaryEntry[];
  // Football-specific prediction data
  aiPrediction: MatchPrediction | null;
  aiPredictionStatus: "loading" | "ready" | "unavailable";
  currentWinProbability: { home: number; away: number; draw: number };
  winProbabilityHistory: Array<{ home: number; away: number; draw: number; timestamp: string }>;
}

export interface GameSummary {
  gameId: string;
  sportId: SportId;
  homeTeam: string;
  awayTeam: string;
  homeTeamId: number;
  awayTeamId: number;
  leagueId: number;
  season: number | string;
  competition: string;
  homeScore: number;
  awayScore: number;
  elapsedMinutes: number;
  periodLabel: string;
  status: "live" | "finished" | "scheduled";
}

// Alias used by components/Tile.tsx (for backward compatibility)
export type Match = GameSummary;

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

export interface GamesResponse {
  games: GameSummary[];
}

export interface SportsResponse {
  sports: SportDefinition[];
}

// WebSocket frames
export interface GameUpdateFrame {
  type: "game_update";
  gameId: string;
  sportId: SportId;
  state: GameState;
}

export interface CommentaryFrame {
  type: "commentary";
  gameId: string;
  sportId: SportId;
  commentary: CommentaryEntry;
}

export type SportFeature = "live" | "past" | "standings";

export interface StandingRow {
  position: number;
  teamId: number;
  team: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  points: number | null;
}

export interface ActiveLeague {
  leagueId: number;
  name: string;
  season: number | string;
}
