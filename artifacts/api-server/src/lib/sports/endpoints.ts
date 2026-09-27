import type { EndpointDefinition } from "../football-agent/types";
import { getEndpoint as getFootballEndpoint } from "../football-agent/endpoints";
import { getEndpoint as getBasketballEndpoint } from "./basketball/endpoints";
import { getEndpoint as getBaseballEndpoint } from "./baseball/endpoints";
import { getEndpoint as getHockeyEndpoint } from "./hockey/endpoints";
import { getEndpoint as getHandballEndpoint } from "./handball/endpoints";
import { getEndpoint as getVolleyballEndpoint } from "./volleyball/endpoints";
import { getEndpoint as getRugbyEndpoint } from "./rugby/endpoints";
import { getEndpoint as getAflEndpoint } from "./afl/endpoints";
import { getEndpoint as getNflEndpoint } from "./nfl/endpoints";
import { getEndpoint as getNbaEndpoint } from "./nba/endpoints";
import { getEndpoint as getFormula1Endpoint } from "./formula1/endpoints";
import { getEndpoint as getMmaEndpoint } from "./mma/endpoints";
import type { SportId } from "./registry";

const ENDPOINT_GETTERS: Record<SportId, (key: string) => EndpointDefinition> = {
  football: getFootballEndpoint,
  basketball: getBasketballEndpoint,
  baseball: getBaseballEndpoint,
  hockey: getHockeyEndpoint,
  handball: getHandballEndpoint,
  volleyball: getVolleyballEndpoint,
  rugby: getRugbyEndpoint,
  afl: getAflEndpoint,
  nfl: getNflEndpoint,
  nba: getNbaEndpoint,
  formula1: getFormula1Endpoint,
  mma: getMmaEndpoint,
};

export function getSportEndpoint(sportId: SportId, key: string): EndpointDefinition {
  const getter = ENDPOINT_GETTERS[sportId];
  if (!getter) {
    throw new Error(`No endpoint registry found for sport: ${sportId}`);
  }
  return getter(key);
}

export function hasEndpointRegistry(sportId: SportId): boolean {
  return sportId in ENDPOINT_GETTERS;
}