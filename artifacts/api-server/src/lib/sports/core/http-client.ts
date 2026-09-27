import type { ApiFootballEnvelope, FootballClientConfig, Provider } from "../../football-agent/types";

const HOSTS: Record<string, Record<Provider, string>> = {
  football: {
    "api-sports": "https://v3.football.api-sports.io",
    rapidapi: "https://api-football-v1.p.rapidapi.com/v3",
  },
  basketball: {
    "api-sports": "https://v1.basketball.api-sports.io",
    rapidapi: "https://basketball-api1.p.rapidapi.com",
  },
  baseball: {
    "api-sports": "https://v1.baseball.api-sports.io",
    rapidapi: "https://baseballapi.p.rapidapi.com",
  },
  hockey: {
    "api-sports": "https://v1.hockey.api-sports.io",
    rapidapi: "https://hockey-live-sk-data.p.rapidapi.com",
  },
  handball: {
    "api-sports": "https://v1.handball.api-sports.io",
    rapidapi: "https://handballapi.p.rapidapi.com",
  },
  volleyball: {
    "api-sports": "https://v1.volleyball.api-sports.io",
    rapidapi: "https://volleyball-api.p.rapidapi.com",
  },
  rugby: {
    "api-sports": "https://v1.rugby.api-sports.io",
    rapidapi: "https://rugby-live-data.p.rapidapi.com",
  },
  afl: {
    "api-sports": "https://v1.afl.api-sports.io",
    rapidapi: "https://afl-live-scores.p.rapidapi.com",
  },
  nfl: {
    "api-sports": "https://v1.american-football.api-sports.io",
    rapidapi: "https://nfl-live-scores.p.rapidapi.com",
  },
  nba: {
    "api-sports": "https://v2.nba.api-sports.io",
    rapidapi: "https://api-nba-v1.p.rapidapi.com",
  },
  formula1: {
    "api-sports": "https://v1.formula-1.api-sports.io",
    rapidapi: "https://formula1.p.rapidapi.com",
  },
  mma: {
    "api-sports": "https://v1.mma.api-sports.io",
    rapidapi: "https://mma-api.p.rapidapi.com",
  },
};

export class ApiSportsError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly sportId: string,
    public readonly endpointKey: string,
  ) {
    super(message);
    this.name = "ApiSportsError";
  }
}

export interface ApiSportsClientConfig {
  sportId: string;
  apiKey: string;
  provider: Provider;
  baseUrl?: string;
  timeoutMs?: number;
}

/**
 * Generic API-Sports client that works across all sports. Parameterized by sport ID
 * to select the appropriate host and headers.
 */
export class ApiSportsClient {
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;
  private readonly timeoutMs: number;
  private readonly sportId: string;

  constructor(config: ApiSportsClientConfig) {
    this.sportId = config.sportId;
    this.baseUrl = config.baseUrl ?? HOSTS[config.sportId]?.[config.provider] ?? HOSTS[config.sportId]?.["api-sports"] ?? "";
    this.timeoutMs = config.timeoutMs ?? 10_000;
    this.headers =
      config.provider === "rapidapi"
        ? {
            "x-rapidapi-key": config.apiKey,
            "x-rapidapi-host": this.getRapidApiHost(config.sportId),
          }
        : { "x-apisports-key": config.apiKey };
  }

  private getRapidApiHost(sportId: string): string {
    const hosts: Record<string, string> = {
      football: "api-football-v1.p.rapidapi.com",
      basketball: "basketball-api1.p.rapidapi.com",
      baseball: "baseballapi.p.rapidapi.com",
      hockey: "hockey-live-sk-data.p.rapidapi.com",
      handball: "handballapi.p.rapidapi.com",
      volleyball: "volleyball-api.p.rapidapi.com",
      rugby: "rugby-live-data.p.rapidapi.com",
      afl: "afl-live-scores.p.rapidapi.com",
      nfl: "nfl-live-scores.p.rapidapi.com",
      nba: "api-nba-v1.p.rapidapi.com",
      formula1: "formula1.p.rapidapi.com",
      mma: "mma-api.p.rapidapi.com",
    };
    return hosts[sportId] ?? "api-football-v1.p.rapidapi.com";
  }

  async call<T = unknown>(
    endpointKey: string,
    path: string,
    params: Record<string, string | number | boolean | undefined> = {},
  ): Promise<ApiFootballEnvelope<T>> {
    const url = new URL(this.baseUrl + path);
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
        throw new ApiSportsError(`API-Sports request failed (${response.status})`, response.status, this.sportId, endpointKey);
      }

      const data = (await response.json()) as ApiFootballEnvelope<T>;

      const errors = data.errors;
      const hasErrors = Array.isArray(errors) ? errors.length > 0 : Object.keys(errors ?? {}).length > 0;
      if (hasErrors) {
        throw new ApiSportsError(`API-Sports returned errors: ${JSON.stringify(errors)}`, 200, this.sportId, endpointKey);
      }

      return data;
    } finally {
      clearTimeout(timeout);
    }
  }

  async fetch<T = unknown>(
    endpointKey: string,
    path: string,
    params: Record<string, string | number | boolean | undefined> = {},
  ): Promise<T> {
    const envelope = await this.call<T>(endpointKey, path, params);
    return envelope.response;
  }
}

let sharedClients: Map<string, ApiSportsClient> = new Map();

export function getApiSportsClient(sportId: string, provider?: Provider): ApiSportsClient | undefined {
  const existingClient = sharedClients.get(sportId);
  if (existingClient) return existingClient;

  const apiKey = process.env["API_SPORTS_KEY"] || process.env["API_FOOTBALL_KEY"];
  if (!apiKey) return undefined;

  const actualProvider: Provider = (provider as Provider | undefined) ?? (process.env["API_FOOTBALL_PROVIDER"] as Provider | undefined) ?? "api-sports";

  const client = new ApiSportsClient({ sportId, apiKey, provider: actualProvider });
  sharedClients.set(sportId, client);
  return client;
}