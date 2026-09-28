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
  icon: string; // Asset key for the tile grid
  kind: SportKind; // Drives which screens apply
  apiSportsHost: string;
  rapidApiHost: string;
  hasPredictions: boolean; // All team-game sports now have predictions
  supportsDraw: boolean; // Whether draws are realistic for this sport
  hasLiveGames: boolean;
  hasStandings: boolean;
  hasTeams: boolean;
  hasHeadToHead: boolean;
  description: string;
}

export const SPORTS_REGISTRY: Record<SportId, SportDefinition> = {
  football: {
    id: "football",
    label: "Football",
    icon: "⚽",
    kind: "team-game",
    apiSportsHost: "https://v3.football.api-sports.io",
    rapidApiHost: "https://api-football-v1.p.rapidapi.com/v3",
    hasPredictions: true,
    supportsDraw: true,
    hasLiveGames: true,
    hasStandings: true,
    hasTeams: true,
    hasHeadToHead: true,
    description: "Live football scores, standings, and AI predictions",
  },
  basketball: {
    id: "basketball",
    label: "Basketball",
    icon: "🏀",
    kind: "team-game",
    apiSportsHost: "https://v1.basketball.api-sports.io",
    rapidApiHost: "https://basketball-api1.p.rapidapi.com",
    hasPredictions: true,
    supportsDraw: false,
    hasLiveGames: true,
    hasStandings: true,
    hasTeams: true,
    hasHeadToHead: true,
    description: "Live basketball scores, standings, and AI predictions",
  },
  baseball: {
    id: "baseball",
    label: "Baseball",
    icon: "⚾",
    kind: "team-game",
    apiSportsHost: "https://v1.baseball.api-sports.io",
    rapidApiHost: "https://baseballapi.p.rapidapi.com",
    hasPredictions: true,
    supportsDraw: false,
    hasLiveGames: true,
    hasStandings: true,
    hasTeams: true,
    hasHeadToHead: true,
    description: "Live baseball scores, standings, and AI predictions",
  },
  hockey: {
    id: "hockey",
    label: "Hockey",
    icon: "🏒",
    kind: "team-game",
    apiSportsHost: "https://v1.hockey.api-sports.io",
    rapidApiHost: "https://hockey-live-sk-data.p.rapidapi.com",
    hasPredictions: true,
    supportsDraw: true,
    hasLiveGames: true,
    hasStandings: true,
    hasTeams: true,
    hasHeadToHead: true,
    description: "Live hockey scores, standings, and AI predictions",
  },
  handball: {
    id: "handball",
    label: "Handball",
    icon: "🤾",
    kind: "team-game",
    apiSportsHost: "https://v1.handball.api-sports.io",
    rapidApiHost: "https://handballapi.p.rapidapi.com",
    hasPredictions: true,
    supportsDraw: true,
    hasLiveGames: true,
    hasStandings: true,
    hasTeams: true,
    hasHeadToHead: true,
    description: "Live handball scores, standings, and AI predictions",
  },
  volleyball: {
    id: "volleyball",
    label: "Volleyball",
    icon: "🏐",
    kind: "team-game",
    apiSportsHost: "https://v1.volleyball.api-sports.io",
    rapidApiHost: "https://volleyball-api.p.rapidapi.com",
    hasPredictions: true,
    supportsDraw: false,
    hasLiveGames: true,
    hasStandings: true,
    hasTeams: true,
    hasHeadToHead: true,
    description: "Live volleyball scores, standings, and AI predictions",
  },
  rugby: {
    id: "rugby",
    label: "Rugby",
    icon: "🏉",
    kind: "team-game",
    apiSportsHost: "https://v1.rugby.api-sports.io",
    rapidApiHost: "https://rugby-live-data.p.rapidapi.com",
    hasPredictions: true,
    supportsDraw: true,
    hasLiveGames: true,
    hasStandings: true,
    hasTeams: true,
    hasHeadToHead: true,
    description: "Live rugby scores, standings, and AI predictions",
  },
  afl: {
    id: "afl",
    label: "AFL",
    icon: "🦘",
    kind: "team-game",
    apiSportsHost: "https://v1.afl.api-sports.io",
    rapidApiHost: "https://afl-live-scores.p.rapidapi.com",
    hasPredictions: true,
    supportsDraw: true,
    hasLiveGames: true,
    hasStandings: true,
    hasTeams: true,
    hasHeadToHead: true,
    description: "Live AFL scores, standings, and AI predictions",
  },
  nfl: {
    id: "nfl",
    label: "NFL",
    icon: "🏈",
    kind: "team-game",
    apiSportsHost: "https://v1.american-football.api-sports.io",
    rapidApiHost: "https://nfl-live-scores.p.rapidapi.com",
    hasPredictions: true,
    supportsDraw: false,
    hasLiveGames: true,
    hasStandings: true,
    hasTeams: true,
    hasHeadToHead: true,
    description: "Live NFL scores, standings, and AI predictions",
  },
  nba: {
    id: "nba",
    label: "NBA",
    icon: "🏀",
    kind: "team-game",
    apiSportsHost: "https://v2.nba.api-sports.io",
    rapidApiHost: "https://api-nba-v1.p.rapidapi.com",
    hasPredictions: true,
    supportsDraw: false,
    hasLiveGames: true,
    hasStandings: true,
    hasTeams: true,
    hasHeadToHead: true,
    description: "Live NBA scores, standings, player stats, and AI predictions",
  },
  formula1: {
    id: "formula1",
    label: "Formula 1",
    icon: "🏎️",
    kind: "motorsport",
    apiSportsHost: "https://v1.formula-1.api-sports.io",
    rapidApiHost: "https://formula1.p.rapidapi.com",
    hasPredictions: false,
    supportsDraw: false,
    hasLiveGames: false,
    hasStandings: true,
    hasTeams: true,
    hasHeadToHead: false,
    description: "F1 races, driver standings, and team rankings",
  },
  mma: {
    id: "mma",
    label: "MMA",
    icon: "🥊",
    kind: "combat",
    apiSportsHost: "https://v1.mma.api-sports.io",
    rapidApiHost: "https://mma-api.p.rapidapi.com",
    hasPredictions: false,
    supportsDraw: false,
    hasLiveGames: false,
    hasStandings: true,
    hasTeams: true,
    hasHeadToHead: false,
    description: "MMA fights and fighter rankings",
  },
};

export function getSportDefinition(sportId: SportId): SportDefinition {
  return SPORTS_REGISTRY[sportId];
}

export function getAllSports(): SportDefinition[] {
  return Object.values(SPORTS_REGISTRY);
}

export function getTeamGameSports(): SportDefinition[] {
  return getAllSports().filter((sport) => sport.kind === "team-game");
}

export function getSportsWithPredictions(): SportDefinition[] {
  return getAllSports().filter((sport) => sport.hasPredictions);
}