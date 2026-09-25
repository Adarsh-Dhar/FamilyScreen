// Mirrors lib/api-spec/openapi.yaml — keep these in sync with the backend schema.

export type ThresholdLevel = "none" | "mild" | "moderate" | "severe";

export interface Thresholds {
  violence: ThresholdLevel;
  language: ThresholdLevel;
  sexContent: ThresholdLevel;
  substances: ThresholdLevel;
  scaryContent: ThresholdLevel;
}

export interface ChildProfile {
  id: string;
  name: string;
  age: number;
  thresholds: Thresholds;
}

export interface ParentAccount {
  id: string;
  name: string;
  children: ChildProfile[];
}

export interface PairSession {
  code: string;
  parentAccountId: string;
  expiresAt: string;
}

export interface PairStatus {
  confirmed: boolean;
  parentAccount: ParentAccount | null;
}

export interface ProfilesResponse {
  parentAccount: ParentAccount;
}

export interface Title {
  id: string;
  title: string;
  year: number;
  posterPath: string;
  overview: string;
  genres: string[];
  service: string;
}

export interface SearchResponse {
  source: string;
  results: Title[];
}

export type ContentVerdict = "approved" | "flagged" | "blocked";

export interface TitleSelectionResponse {
  requestId: string;
  verdict: ContentVerdict;
  title: Title;
  reason: string;
  categoriesOfConcern: string[];
  service: string;
}

export interface DecisionResponse {
  ok: boolean;
  decision: "approved" | "denied";
}

// Frame the TV receives over the websocket when a parent makes a decision.
export interface ParentDecisionFrame {
  type: "parent_decision";
  requestId: string;
  decision: "approved" | "denied";
}
