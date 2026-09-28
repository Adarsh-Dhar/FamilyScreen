import type { DataTier, EndpointDefinition } from "../../football-agent/types";

export const ENDPOINTS: EndpointDefinition[] = [
  {
    key: "races",
    category: "games",
    path: "/races",
    description: "Formula 1 races schedule and results",
    params: [
      { name: "season", required: false, description: "Filter by season year" },
      { name: "type", required: false, description: "Filter by race type (e.g., 'Race', 'Qualifying')" },
      { name: "circuit", required: false, description: "Filter by circuit ID" },
    ],
    tier: "scheduled",
    cacheTtlSeconds: 3600,
    vendorRecommendedCallsPerDay: null,
    priority: 3,
  },
  {
    key: "races.live",
    category: "games",
    path: "/races",
    description: "Live Formula 1 races with real-time data",
    params: [
      { name: "live", required: false, description: "Filter for live races only (set to 'all')" },
    ],
    tier: "live",
    cacheTtlSeconds: 60,
    vendorRecommendedCallsPerDay: null,
    priority: 5,
  },
  {
    key: "rankings.drivers",
    category: "standings",
    path: "/rankings/drivers",
    description: "Driver championship standings",
    params: [
      { name: "season", required: false, description: "Filter by season year" },
    ],
    tier: "scheduled",
    cacheTtlSeconds: 3600,
    vendorRecommendedCallsPerDay: 10,
    priority: 3,
  },
  {
    key: "rankings.teams",
    category: "standings",
    path: "/rankings/teams",
    description: "Team (constructor) championship standings",
    params: [
      { name: "season", required: false, description: "Filter by season year" },
    ],
    tier: "scheduled",
    cacheTtlSeconds: 3600,
    vendorRecommendedCallsPerDay: 10,
    priority: 3,
  },
  {
    key: "drivers",
    category: "teams",
    path: "/drivers",
    description: "Formula 1 driver information",
    params: [
      { name: "id", required: false, description: "Filter by specific driver ID" },
      { name: "team", required: false, description: "Filter by team ID" },
    ],
    tier: "semi-static",
    cacheTtlSeconds: 43200,
    vendorRecommendedCallsPerDay: 5,
    priority: 2,
  },
  {
    key: "teams",
    category: "teams",
    path: "/teams",
    description: "Formula 1 team (constructor) information",
    params: [
      { name: "id", required: false, description: "Filter by specific team ID" },
    ],
    tier: "semi-static",
    cacheTtlSeconds: 43200,
    vendorRecommendedCallsPerDay: 5,
    priority: 2,
  },
  {
    key: "circuits",
    category: "meta",
    path: "/circuits",
    description: "Formula 1 circuit information",
    params: [
      { name: "id", required: false, description: "Filter by specific circuit ID" },
    ],
    tier: "static",
    cacheTtlSeconds: 604800,
    vendorRecommendedCallsPerDay: 1,
    priority: 4,
  },
  {
    key: "laps",
    category: "games",
    path: "/laps",
    description: "Lap times and information for a specific race",
    params: [
      { name: "race", required: true, description: "Race ID" },
      { name: "driver", required: false, description: "Filter by driver ID" },
    ],
    tier: "live",
    cacheTtlSeconds: 300,
    vendorRecommendedCallsPerDay: null,
    priority: 2,
  },
  {
    key: "pitstops",
    category: "games",
    path: "/pitstops",
    description: "Pit stop information for a specific race",
    params: [
      { name: "race", required: true, description: "Race ID" },
      { name: "driver", required: false, description: "Filter by driver ID" },
    ],
    tier: "live",
    cacheTtlSeconds: 300,
    vendorRecommendedCallsPerDay: null,
    priority: 2,
  },
  {
    key: "seasons",
    category: "meta",
    path: "/seasons",
    description: "Available Formula 1 seasons",
    params: [],
    tier: "static",
    cacheTtlSeconds: 604800,
    vendorRecommendedCallsPerDay: 1,
    priority: 4,
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