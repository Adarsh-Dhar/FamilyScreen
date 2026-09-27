import type { DataTier, EndpointDefinition } from "../../football-agent/types";

export const ENDPOINTS: EndpointDefinition[] = [
  {
    key: "games.live",
    category: "games",
    path: "/games",
    description: "Live hockey games with scores and game status",
    params: [
      { name: "league", required: true, description: "Filter by league ID (required)" },
      { name: "season", required: true, description: "Filter by season year (required)" },
    ],
    tier: "live",
    cacheTtlSeconds: 60,
    vendorRecommendedCallsPerDay: null,
    priority: 5,
  },
  {
    key: "games",
    category: "games",
    path: "/games",
    description: "Hockey games schedule and results",
    params: [
      { name: "league", required: false, description: "Filter by league ID" },
      { name: "season", required: false, description: "Filter by season year" },
      { name: "date", required: false, description: "Filter by specific date (YYYY-MM-DD)" },
      { name: "team", required: false, description: "Filter by team ID" },
    ],
    tier: "scheduled",
    cacheTtlSeconds: 3600,
    vendorRecommendedCallsPerDay: null,
    priority: 3,
  },
  {
    key: "games.h2h",
    category: "games",
    path: "/games/h2h",
    description: "Head-to-head record between two teams",
    params: [
      { name: "h2h", required: true, description: "Two team IDs separated by hyphen (e.g., '1-2')" },
      { name: "league", required: false, description: "Filter by league ID" },
      { name: "season", required: false, description: "Filter by season year" },
    ],
    tier: "scheduled",
    cacheTtlSeconds: 86400,
    vendorRecommendedCallsPerDay: 10,
    priority: 2,
  },
  {
    key: "leagues",
    category: "leagues",
    path: "/leagues",
    description: "Available hockey leagues",
    params: [
      { name: "id", required: false, description: "Filter by specific league ID" },
      { name: "name", required: false, description: "Filter by league name" },
      { name: "country", required: false, description: "Filter by country name" },
    ],
    tier: "static",
    cacheTtlSeconds: 604800,
    vendorRecommendedCallsPerDay: 1,
    priority: 4,
  },
  {
    key: "teams",
    category: "teams",
    path: "/teams",
    description: "Hockey teams information",
    params: [
      { name: "id", required: false, description: "Filter by specific team ID" },
      { name: "league", required: false, description: "Filter by league ID" },
      { name: "season", required: false, description: "Filter by season year" },
    ],
    tier: "semi-static",
    cacheTtlSeconds: 43200,
    vendorRecommendedCallsPerDay: 5,
    priority: 3,
  },
  {
    key: "teams.statistics",
    category: "teams",
    path: "/teams/statistics",
    description: "Team statistics for a specific league and season",
    params: [
      { name: "league", required: true, description: "League ID" },
      { name: "season", required: true, description: "Season year" },
      { name: "team", required: true, description: "Team ID" },
      { name: "date", required: false, description: "Filter by specific date" },
    ],
    tier: "scheduled",
    cacheTtlSeconds: 7200,
    vendorRecommendedCallsPerDay: 10,
    priority: 2,
  },
  {
    key: "standings",
    category: "standings",
    path: "/standings",
    description: "League standings and rankings",
    params: [
      { name: "league", required: true, description: "League ID" },
      { name: "season", required: true, description: "Season year" },
      { name: "team", required: false, description: "Filter by specific team" },
    ],
    tier: "scheduled",
    cacheTtlSeconds: 3600,
    vendorRecommendedCallsPerDay: 10,
    priority: 3,
  },
  {
    key: "players",
    category: "players",
    path: "/players",
    description: "Player information and statistics",
    params: [
      { name: "id", required: false, description: "Filter by specific player ID" },
      { name: "team", required: false, description: "Filter by team ID" },
      { name: "league", required: false, description: "Filter by league ID" },
      { name: "season", required: false, description: "Filter by season year" },
    ],
    tier: "semi-static",
    cacheTtlSeconds: 43200,
    vendorRecommendedCallsPerDay: 5,
    priority: 2,
  },
  {
    key: "players.statistics",
    category: "players",
    path: "/players/statistics",
    description: "Detailed player statistics",
    params: [
      { name: "id", required: true, description: "Player ID" },
      { name: "league", required: false, description: "Filter by league ID" },
      { name: "season", required: false, description: "Filter by season year" },
    ],
    tier: "scheduled",
    cacheTtlSeconds: 7200,
    vendorRecommendedCallsPerDay: 10,
    priority: 2,
  },
  {
    key: "odds",
    category: "odds",
    path: "/odds",
    description: "Betting odds for games",
    params: [
      { name: "game", required: false, description: "Filter by game ID" },
      { name: "league", required: false, description: "Filter by league ID" },
      { name: "season", required: false, description: "Filter by season year" },
      { name: "bookmaker", required: false, description: "Filter by bookmaker" },
    ],
    tier: "live",
    cacheTtlSeconds: 300,
    vendorRecommendedCallsPerDay: null,
    priority: 1,
  },
];

export const ENDPOINTS_BY_KEY: Record<string, EndpointDefinition> = ENDPOINTS.reduce(
  (acc, endpoint) => {
    acc[endpoint.key] = endpoint;
    return acc;
  },
  {} as Record<string, EndpointDefinition>
);

export function getEndpoint(key: string): EndpointDefinition {
  const endpoint = ENDPOINTS_BY_KEY[key];
  if (!endpoint) {
    throw new Error(`Unknown endpoint key: ${key}`);
  }
  return endpoint;
}