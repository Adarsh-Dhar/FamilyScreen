# API-Football v3 — full endpoint reference

Source: https://www.api-football.com/documentation-v3. 38 GET-only endpoints across 13 categories.
Auth: header `x-apisports-key` (direct api-sports.io subscription) or `x-rapidapi-key` +
`x-rapidapi-host: api-football-v1.p.rapidapi.com` (RapidAPI marketplace) — same data either way.
Every response is wrapped: `{ get, parameters, errors, results, paging, response }`.

This table is also encoded as data in
[`artifacts/api-server/src/lib/football-agent/endpoints.ts`](../artifacts/api-server/src/lib/football-agent/endpoints.ts),
which is what the agent actually reads at runtime — this file is the human-readable version of the
same registry, plus our caching/tier decisions.

| Category | Endpoint | Path | Key params | Our cache TTL | Vendor cap/day |
|---|---|---|---|---|---|
| Meta | Status | `/status` | – | 6h | – |
| Meta | Timezone | `/timezone` | – | 30d | – |
| Meta | Countries | `/countries` | name, code, search | 30d | – |
| Leagues | Leagues | `/leagues` | id, name, country, season, type, current, search | 7d | 1 |
| Leagues | Leagues seasons | `/leagues/seasons` | – | 30d | – |
| Teams | Teams | `/teams` | id, name, league, season, country, search | 7d | – |
| Teams | Team statistics | `/teams/statistics` | league*, season*, team* | 6h | – |
| Teams | Team seasons | `/teams/seasons` | team* | 30d | – |
| Teams | Team countries | `/teams/countries` | – | 30d | – |
| Venues | Venues | `/venues` | id, name, city, country, search | 30d | – |
| Standings | Standings | `/standings` | league*, season*, team | 3h | – |
| Fixtures | Fixtures (live) | `/fixtures?live=all` | live | 60s | – |
| Fixtures | Fixtures (list) | `/fixtures` | id, date, league, season, team, last, next, from, to, round, status, venue | 1h | – |
| Fixtures | Rounds | `/fixtures/rounds` | league*, season*, current, dates | 24h | – |
| Fixtures | Head-to-head | `/fixtures/headtohead` | h2h* (`id-id`), last, next, date range | 24h | – |
| Fixtures | Statistics | `/fixtures/statistics` | fixture*, team, type, half | 5m | – |
| Fixtures | Events | `/fixtures/events` | fixture*, team, player, type | 60s | – |
| Fixtures | Lineups | `/fixtures/lineups` | fixture*, team, player, type | 5m | – |
| Fixtures | Players stats | `/fixtures/players` | fixture*, team | 5m | – |
| Injuries | Injuries | `/injuries` | league, season, fixture, team, player, date | 12h | 1 |
| Predictions | Predictions | `/predictions` | fixture* | 12h | – |
| Coachs | Coachs | `/coachs` | id, team, search | 7d | 1 |
| Players | Players | `/players` | id, team, league, season*, search | 24h | – |
| Players | Player seasons | `/players/seasons` | player | 30d | – |
| Players | Squads | `/players/squads` | team, player | 7d | – |
| Players | Player's teams | `/players/teams` | player* | 30d | – |
| Players | Top scorers | `/players/topscorers` | league*, season* | 24h | 1 |
| Players | Top assists | `/players/topassists` | league*, season* | 24h | 1 |
| Players | Top yellow cards | `/players/topyellowcards` | league*, season* | 24h | 1 |
| Players | Top red cards | `/players/topredcards` | league*, season* | 24h | 1 |
| Transfers | Transfers | `/transfers` | player, team | 24h | 1 |
| Trophies | Trophies | `/trophies` | player, coach | 30d | 1 |
| Sidelined | Sidelined | `/sidelined` | player, coach | 24h | 1 |
| Odds | Pre-match odds | `/odds` | fixture, league, season, date, bookmaker, bet | 6h | – |
| Odds | Odds mapping | `/odds/mapping` | page | 7d | – |
| Odds | Bookmakers | `/odds/bookmakers` | id, search | 30d | – |
| Odds | Bet types | `/odds/bets` | id, search | 30d | – |
| Odds | Live odds | `/odds/live` | fixture, league, bet | 30s | – |
| Odds | Live bet types | `/odds/live/bets` | id, search | 30d | – |

`*` = required. "Vendor cap/day" is api-football's own published recommendation for endpoints whose
underlying data only refreshes once a day (mostly the low-frequency player/team reference data) —
we enforce it in `quota.ts` independently of the account-wide 100/day cap, so the agent won't
"waste" 5 of your 100 calls re-fetching the same top-scorers list five times in one afternoon.

## Notes from api-football's own docs worth knowing
- `/fixtures?live=all` returns **every** live match worldwide in one call — always prefer this over
  polling individual fixtures.
- Lineups are only populated 20–40 minutes before kickoff (check the `leagues` coverage flag for
  whether a competition supports lineups at all).
- The `leagues` endpoint's `coverage` object tells you, per competition, which of
  events/lineups/statistics/players/predictions/odds are actually available — worth caching and
  checking before spending a call on a competition that won't have the data anyway.
- Season is always the 4-digit year the season *started* in (2025 for the 2025–26 Premier League).
