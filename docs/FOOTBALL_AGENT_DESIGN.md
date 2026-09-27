# Football Agent — design

Goal: give the app access to the **entire** API-Football v3 surface (all 38 endpoints) through one
agent, without ever exceeding the free plan's **100 requests/day**. The whole design is built
around one fact: 100/day is roughly 4/hour — nowhere near enough to poll freely, so the system has
to spend every call deliberately.

## Architecture

User question ("what's the Premier League table?")
        │
        ▼
 ┌─────────────┐   free, no network call
 │  intent.ts  │   regex/keyword classifier → { kind: "STANDINGS", league: "premier league" }
 └──────┬──────┘
        ▼
 ┌─────────────┐   resolves names → ids (cached), decides which endpoint(s) are needed
 │ planner.ts  │
 └──────┬──────┘
        ▼
 ┌──────────────────┐  cache hit? → free.  cache miss? → ask quota.ts for permission.
 │ guarded-call.ts  │  denied → return a reason, never throws.
 └────────┬─────────┘  allowed → client.ts hits the real API, then caches + spends.
          ▼
 ┌─────────────┐
 │  client.ts  │  thin typed fetch() wrapper, one function per endpoint via endpoints.ts registry
 └─────────────┘
        │
        ▼
 answer synthesis (deterministic by default; optional Gemini polish, always grounded-only)

Every real HTTP call to api-football flows through exactly one function — `guardedCall()` in
`guarded-call.ts`. Nothing else is allowed to call `client.ts` directly. That's what makes the
100/day limit enforceable: there's a single choke point, not a rule every call site has to
remember to follow.

## The three layers that make 100/day workable

**1. Registry-driven caching (`endpoints.ts`).** Every endpoint is tagged with a data-volatility
tier (`static` / `semi-static` / `scheduled` / `live`) and a matching cache TTL — from 30 seconds
(live odds) to 30 days (venues, bookmakers, trophies). Most of the 38 endpoints are reference data
that barely changes: countries, venues, coachs, team profiles. Cache those aggressively and they
cost effectively nothing.

**2. A hard daily budget with a protected reserve (`quota.ts`).** A JSON file on disk
(`data/football-quota.json`) tracks calls spent today (UTC), survives restarts, and resets itself
at UTC midnight. Two extra rules on top of the raw 100 cap:
- **25 calls are reserved** for the live-fixtures poll loop, untouchable by on-demand questions —
  so a flurry of user questions during a big match can never starve the live score tracker.
- Endpoints where **api-football itself publishes a "1 call/day" recommendation** (top scorers,
  injuries, transfers, trophies, sidelined, coachs) are capped at that, regardless of how much of
  the 100 is still free — there's no point spending call #40 re-fetching a list that only updates
  once a day.

**3. Free intent classification, paid data only (`intent.ts` + `planner.ts`).** Understanding what
the user is asking costs nothing — it's a regex/keyword classifier, not an LLM call. Only once we
know *exactly* which endpoint(s) answer the question does anything touch the network, and the
planner always resolves the smallest possible set of calls (e.g. head-to-head is 1–3 calls total:
resolve team A, resolve team B, one `/fixtures/headtohead` call — not five).

## What happens when the budget runs out

`guardedCall()` never throws on a budget denial — it returns `{ ok: false, reason }`. The planner
collects these as "gaps" and the agent still answers with whatever it *could* fetch (including
anything already cached), appending an honest note like:

> "premierleague standings: [...] (Note: Could not fetch injuries for Arsenal — only 3 calls left
> today; reserved for the live-fixtures poll loop.)"

This is a deliberate choice: a partial, honestly-labeled answer beats a hard failure, and it beats
silently guessing.

## Extending it

- **New endpoint**: add one row to `ENDPOINTS` in `endpoints.ts` (path, tier, TTL, vendor cap). It's
  immediately available to `guardedCall("your.key", params)` everywhere.
- **New question type**: add a branch to `classifyIntent()` and a matching `case` in
  `planAndExecute()`. The quota/cache machinery is unconditional — you don't need to think about
  the budget when adding a new intent, only about which endpoint(s) it needs.
- **Smarter classification**: `intent.ts` is deliberately dumb (regex) so it's free. If you want to
  swap in an LLM-based classifier later, gate it behind its own budget the same way `agent.ts`
  already gates Gemini answer-synthesis behind `USE_GEMINI_SYNTHESIS`.

## API surface added to the app

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/agent/ask` | `{ question }` → grounded answer + exactly which endpoints/cache were used |
| `GET` | `/api/agent/status` | Today's quota used/remaining, live-poll reserve, cache size |
| `GET` | `/api/agent/endpoints` | The full 38-endpoint registry (paths, params, tiers, TTLs) |

Example:

```bash
curl -X POST http://localhost:8080/api/agent/ask \
  -H 'content-type: application/json' \
  -d '{"question": "what is the premier league table?"}'

curl http://localhost:8080/api/agent/status
```

## Files

```
artifacts/api-server/src/lib/football-agent/
├── types.ts            # shared types (EndpointDefinition, QuotaState, AgentAnswer, ...)
├── endpoints.ts         # registry of all 38 endpoints + tier/TTL/vendor-cap/priority
├── known-leagues.ts     # free hard-coded ids for the ~15 most-asked-about leagues
├── client.ts            # thin typed fetch() wrapper over the raw API
├── quota.ts             # disk-persisted daily budget enforcement
├── cache.ts             # disk-persisted TTL cache
├── guarded-call.ts       # the single choke point: cache → quota → client → cache write
├── resolve.ts           # team/league name → id, itself cached
├── intent.ts            # free regex classifier: question → Intent
├── planner.ts           # Intent → minimal guardedCall sequence, degrades gracefully
├── agent.ts             # askFootballAgent(question) → AgentAnswer
└── index.ts             # barrel export
artifacts/api-server/src/routes/agent.ts   # /api/agent/* Express routes
```
