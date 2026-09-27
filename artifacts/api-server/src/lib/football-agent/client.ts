import type { ApiFootballEnvelope, FootballClientConfig, Provider } from "./types";
import { getEndpoint } from "./endpoints";

const HOSTS: Record<Provider, string> = {
  "api-sports": "https://v3.football.api-sports.io",
  rapidapi: "https://api-football-v1.p.rapidapi.com/v3",
};

export class FootballApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly endpointKey: string,
  ) {
    super(message);
    this.name = "FootballApiError";
  }
}

/**
 * Thin, typed wrapper around the raw API-Football v3 HTTP surface. This class does NOT know
 * about quota or caching — call it through `agent.ts` / the planner, which enforce the daily
 * budget before a request ever reaches here. Calling `client.call()` directly always spends a
 * real request against your api-football account.
 */
export class FootballApiClient {
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;
  private readonly timeoutMs: number;

  constructor(config: FootballClientConfig) {
    this.baseUrl = config.baseUrl ?? HOSTS[config.provider];
    this.timeoutMs = config.timeoutMs ?? 10_000;
    this.headers =
      config.provider === "rapidapi"
        ? { "x-rapidapi-key": config.apiKey, "x-rapidapi-host": "api-football-v1.p.rapidapi.com" }
        : { "x-apisports-key": config.apiKey };
  }

  /**
   * Calls any registered endpoint by key with query params. `T` is the shape of one element of
   * the `response` array — see api-football's docs for each endpoint's response shape, or just
   * read `data.response` as `unknown` and narrow it where you use it.
   */
  async call<T = unknown>(
    endpointKey: string,
    params: Record<string, string | number | boolean | undefined> = {},
  ): Promise<ApiFootballEnvelope<T>> {
    const def = getEndpoint(endpointKey);
    const url = new URL(this.baseUrl + def.path);
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url.toString(), {
        headers: this.headers,
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new FootballApiError(`API-Football request failed (${response.status})`, response.status, endpointKey);
      }

      const data = (await response.json()) as ApiFootballEnvelope<T>;

      const errors = data.errors;
      const hasErrors = Array.isArray(errors) ? errors.length > 0 : Object.keys(errors ?? {}).length > 0;
      if (hasErrors) {
        throw new FootballApiError(`API-Football returned errors: ${JSON.stringify(errors)}`, 200, endpointKey);
      }

      return data;
    } finally {
      clearTimeout(timeout);
    }
  }

  /** Convenience accessor: just the `response` array/object for one call. */
  async fetch<T = unknown>(
    endpointKey: string,
    params: Record<string, string | number | boolean | undefined> = {},
  ): Promise<T> {
    const envelope = await this.call<T>(endpointKey, params);
    return envelope.response;
  }
}

let sharedClient: FootballApiClient | undefined;

/** Builds (once) the client from env vars, matching the existing project's `.env` convention. */
export function getFootballApiClient(): FootballApiClient | undefined {
  if (sharedClient) return sharedClient;

  const apiKey = process.env["API_FOOTBALL_KEY"];
  if (!apiKey) return undefined;

  const provider: Provider = (process.env["API_FOOTBALL_PROVIDER"] as Provider | undefined) ?? "rapidapi";

  sharedClient = new FootballApiClient({ apiKey, provider });
  return sharedClient;
}
