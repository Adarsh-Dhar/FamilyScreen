export type ThresholdLevel = "none" | "mild" | "moderate" | "severe";

export type Thresholds = {
  violence: ThresholdLevel;
  language: ThresholdLevel;
  sexContent: ThresholdLevel;
  substances: ThresholdLevel;
  scaryContent: ThresholdLevel;
};

export type ChildProfile = {
  id: string;
  name: string;
  age: number;
  thresholds: Thresholds;
};

export type ParentAccount = {
  id: string;
  name: string;
  children: ChildProfile[];
};

export type Title = {
  id: string;
  title: string;
  year: number;
  posterPath: string;
  overview: string;
  genres: string[];
  service: string;
};

type GuideEntry = {
  summary: string;
  levels: Partial<Record<keyof Thresholds, ThresholdLevel>>;
};

const openThresholds: Thresholds = {
  violence: "mild",
  language: "mild",
  sexContent: "none",
  substances: "none",
  scaryContent: "mild",
};

const familyAccounts = new Map<string, ParentAccount>();

const seedAccounts: ParentAccount[] = [
  {
    id: "family-aurora",
    name: "The Aurora family",
    children: [
      {
        id: "child-maya",
        name: "Maya",
        age: 8,
        thresholds: { ...openThresholds, scaryContent: "none" },
      },
      {
        id: "child-leo",
        name: "Leo",
        age: 12,
        thresholds: { ...openThresholds, violence: "moderate", scaryContent: "moderate" },
      },
    ],
  },
  {
    id: "family-rivera",
    name: "The Rivera family",
    children: [
      {
        id: "child-nina",
        name: "Nina",
        age: 10,
        thresholds: { ...openThresholds, language: "none" },
      },
    ],
  },
];

for (const account of seedAccounts) {
  familyAccounts.set(account.id, account);
}

export const demoTitles: Title[] = [
  {
    id: "finding-nemo",
    title: "Finding Nemo",
    year: 2003,
    posterPath: "https://image.tmdb.org/t/p/w500/eHuGQ10FUzK1mdOY69wF5pGgEf5.jpg",
    overview: "An overprotective clownfish crosses the ocean to find his son and discovers courage along the way.",
    genres: ["Animation", "Family", "Adventure"],
    service: "Disney+",
  },
  {
    id: "paddington",
    title: "Paddington",
    year: 2014,
    posterPath: "https://image.tmdb.org/t/p/w500/y7yIUVX7kVx2K7t6x1kP0q3N5xO.jpg",
    overview: "A kind-hearted bear finds a new home with a London family and brings unexpected joy to their lives.",
    genres: ["Family", "Comedy"],
    service: "Max",
  },
  {
    id: "into-the-spider-verse",
    title: "Spider-Man: Into the Spider-Verse",
    year: 2018,
    posterPath: "https://image.tmdb.org/t/p/w500/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg",
    overview: "Miles Morales becomes Spider-Man and meets a team of heroes from parallel dimensions.",
    genres: ["Animation", "Action", "Adventure"],
    service: "Netflix",
  },
  {
    id: "the-incredibles",
    title: "The Incredibles",
    year: 2004,
    posterPath: "https://image.tmdb.org/t/p/w500/2LqaLgk4Z226KkgPJuiOQ58dYv0.jpg",
    overview: "A family of superheroes steps back into action when a new threat asks them to work together.",
    genres: ["Animation", "Family", "Action"],
    service: "Disney+",
  },
  {
    id: "avatar-way-of-water",
    title: "Avatar: The Way of Water",
    year: 2022,
    posterPath: "https://image.tmdb.org/t/p/w500/t6HIqrRAclMCA60NsSmeqe9RmNV.jpg",
    overview: "The Sully family seeks safety and belonging among the ocean clans of Pandora.",
    genres: ["Adventure", "Science Fiction"],
    service: "Disney+",
  },
  {
    id: "the-dark-knight",
    title: "The Dark Knight",
    year: 2008,
    posterPath: "https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
    overview: "Batman faces a criminal mastermind who pushes Gotham and its heroes to their limits.",
    genres: ["Action", "Crime", "Drama"],
    service: "Max",
  },
  {
    id: "stranger-things",
    title: "Stranger Things",
    year: 2016,
    posterPath: "https://image.tmdb.org/t/p/w500/49WJfeN0moxb9IPfGn8AIqMGskD.jpg",
    overview: "A group of friends uncover a strange mystery that changes their small town forever.",
    genres: ["Drama", "Fantasy", "Horror"],
    service: "Netflix",
  },
  {
    id: "the-wild-robot",
    title: "The Wild Robot",
    year: 2024,
    posterPath: "https://image.tmdb.org/t/p/w500/wTnV3PCVW5O92JMrFvvrRcV39RU.jpg",
    overview: "A shipwrecked robot learns to survive on a remote island and care for an orphaned gosling.",
    genres: ["Animation", "Science Fiction", "Family"],
    service: "Peacock",
  },
];

// MOCK DATA — replace with licensed Common Sense Media / IMDb Parents Guide API in production.
export const contentGuides = new Map<string, GuideEntry>([
  ["finding-nemo", { summary: "A few tense ocean scenes and a brief separation from family. No sexual content, no strong language, and no substance use.", levels: { violence: "mild", scaryContent: "mild" } }],
  ["paddington", { summary: "Mild peril and cartoon slapstick. No sexual content, no substance use, and no strong language.", levels: { violence: "mild", scaryContent: "mild" } }],
  ["into-the-spider-verse", { summary: "Frequent superhero fights with stylized peril and some scary moments. Mild language and no sexual content.", levels: { violence: "moderate", language: "mild", scaryContent: "mild" } }],
  ["the-incredibles", { summary: "Superhero action includes explosions, danger, and characters in peril. No sexual content; mild language and scary moments.", levels: { violence: "moderate", language: "mild", scaryContent: "moderate" } }],
  ["avatar-way-of-water", { summary: "Extended fantasy battle scenes with deaths, weapons, and peril. Some frightening creatures and moderate language.", levels: { violence: "moderate", language: "mild", scaryContent: "moderate" } }],
  ["the-dark-knight", { summary: "Intense violence, armed crime, threats, torture imagery, and disturbing scenes. Strong language is used throughout; brief sexual references.", levels: { violence: "severe", language: "moderate", sexContent: "mild", scaryContent: "severe" } }],
  ["stranger-things", { summary: "Frequent horror, monsters, frightening imagery, violence, and strong language. Some teen romance and brief substance references.", levels: { violence: "moderate", language: "moderate", sexContent: "mild", substances: "mild", scaryContent: "severe" } }],
  ["the-wild-robot", { summary: "Some survival peril and emotional loss, with brief animal danger. No sexual content or strong language.", levels: { violence: "mild", scaryContent: "mild" } }],
]);

export function getOrCreateAccount(parentAccountId: string): ParentAccount {
  const existing = familyAccounts.get(parentAccountId);
  if (existing) return existing;
  const account: ParentAccount = {
    id: parentAccountId,
    name: "Your family",
    children: [
      {
        id: `${parentAccountId}-child`,
        name: "Avery",
        age: 9,
        thresholds: { ...openThresholds },
      },
    ],
  };
  familyAccounts.set(account.id, account);
  return account;
}

export function findTitle(titleId: string): Title | undefined {
  return demoTitles.find((title) => title.id === titleId);
}

export function getGuide(titleId: string): GuideEntry {
  return contentGuides.get(titleId) ?? {
    summary: "Content details are still being reviewed. Some general action and peril may be present.",
    levels: { violence: "mild", scaryContent: "mild" },
  };
}

export function getAccounts(): Map<string, ParentAccount> {
  return familyAccounts;
}