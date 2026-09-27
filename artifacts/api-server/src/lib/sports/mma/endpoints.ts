import type { DataTier, EndpointDefinition } from "../../football-agent/types";

export const ENDPOINTS: EndpointDefinition[] = [
  {
    key: "fights",
    category: "games",
    path: "/fights",
    description: "MMA fights schedule and results",
    params: [
      { name: "live", required: false, description: "Filter for live fights only (set to 'all')" },
      { name: "league", required: false, description: "Filter by league/organization ID" },
      { name: "year", required: false, description: "Filter by year" },
      { name: "fighter", required: false, description: "Filter by fighter ID" },
    ],
    tier: "live",
    cacheTtlSeconds: 60,
    vendorRecommendedCallsPerDay: null,
    priority: 5,
  },
  {
    key: "fighters",
    category: "teams",
    path: "/fighters",
    description: "MMA fighter information and statistics",
    params: [
      { name: "id", required: false, description: "Filter by specific fighter ID" },
      { name: "league", required: false, description: "Filter by league/organization ID" },
      { name: "country", required: false, description: "Filter by country" },
    ],
    tier: "semi-static",
    cacheTtlSeconds: 43200,
    vendorRecommendedCallsPerDay: 5,
    priority: 2,
  },
  {
    key: "fighters.statistics",
    category: "teams",
    path: "/fighters/statistics",
    description: "Detailed fighter statistics",
    params: [
      { name: "id", required: true, description: "Fighter ID" },
      { name: "league", required: false, description: "Filter by league/organization ID" },
    ],
    tier: "scheduled",
    cacheTtlSeconds: 7200,
    vendorRecommendedCallsPerDay: 10,
    priority: 2,
  },
  {
    key: "categories",
    category: "meta",
    path: "/categories",
    description: "MMA weight categories and divisions",
    params: [
      { name: "id", required: false, description: "Filter by specific category ID" },
      { name: "league", required: false, description: "Filter by league/organization ID" },
    ],
    tier: "static",
    cacheTtlSeconds: 604800,
    vendorRecommendedCallsPerDay: 1,
    priority: 4,
  },
  {
    key: "leagues",
    category: "leagues",
    path: "/leagues",
    description: "Available MMA organizations and promotions",
    params: [
      { name: "id", required: false, description: "Filter by specific league ID" },
      { name: "name", required: false, description: "Filter by organization name" },
      { name: "country", required: false, description: "Filter by country" },
    ],
    tier: "static",
    cacheTtlSeconds: 604800,
    vendorRecommendedCallsPerDay: 1,
    priority: 4,
  },
  {
    key: "rankings",
    category: "standings",
    path: "/rankings",
    description: "MMA fighter rankings by organization and weight class",
    params: [
      { name: "league", required: false, description: "Filter by league/organization ID" },
      { name: "category", required: false, description: "Filter by weight category" },
    ],
    tier: "scheduled",
    cacheTtlSeconds: 3600,
    vendorRecommendedCallsPerDay: 10,
    priority: 3,
  },
  {
    key: "titles",
    category: "meta",
    path: "/titles",
    description: "Current championship titles and holders",
    params: [
      { name: "league", required: false, description: "Filter by league/organization ID" },
      { name: "category", required: false, description: "Filter by weight category" },
    ],
    tier: "semi-static",
    cacheTtlSeconds: 43200,
    vendorRecommendedCallsPerDay: 5,
    priority: 2,
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