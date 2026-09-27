# Fire TV Sports Companion

A channel-agnostic live sports companion for Fire TV featuring real-time win probability visualization and AI-powered commentary.

## Features

- **Live Match Tracking**: Real-time score and time updates for live football/soccer matches
- **Win Probability Bar**: Dynamic visualization of match outcome probabilities using a deterministic model
- **AI Commentary**: Gemini-powered live commentary that responds to match events and probability shifts
- **D-pad Navigation**: TV-optimized interface designed for Fire TV remote control
- **WebSocket Updates**: Real-time push updates for scores, commentary, and probability changes

## Run & Operate

- `pnpm run start` — Start API server only
- `pnpm run start:tv` — Start TV app with Vega virtual device + API server
- `pnpm run stop:all` — Stop all running services
- `pnpm run build:debug` — Build Vega TV app for debug
- `pnpm run build:release` — Build Vega TV app for release

## Required Environment Variables

Create `artifacts/api-server/.env` with:

```bash
GEMINI_API_KEY=your_gemini_api_key_here
API_FOOTBALL_KEY=your_api_football_key_here
PORT=8080
```

Get your API keys:
- **Gemini**: https://aistudio.google.com/app/apikey
- **API-Football**: https://api-football.com/

## Stack

- pnpm workspaces, Node.js 20+, TypeScript 5.9
- API: Express 5
- Data: In-memory state (no database required)
- Validation: Zod (`zod/v4`)
- Build: esbuild (CJS bundle)
- Frontend: React Native + Vega SDK
- AI: Google Gemini 2.5 Flash

## Football Agent (all 38 API-Football endpoints, 100 req/day budget)

`artifacts/api-server/src/lib/football-agent/` gives the app access to the full API-Football v3
surface (fixtures, standings, players, odds, predictions, transfers, trophies, etc.) through one
agent that enforces the free plan's 100-requests/day cap via aggressive per-endpoint caching and a
protected reserve for the live-score poll loop. See `docs/FOOTBALL_AGENT_DESIGN.md` for the
architecture and `docs/API_FOOTBALL_ENDPOINTS.md` for the full endpoint reference.

```bash
curl -X POST http://localhost:8080/api/agent/ask -H 'content-type: application/json' \
  -d '{"question": "what is the premier league table?"}'
curl http://localhost:8080/api/agent/status   # today's quota usage
```

## Where things live

- `vega-app/` — Fire TV app for virtual device deployment
- `artifacts/api-server/` — Backend API server with sports data integration
- `lib/api-zod/` — Shared Zod validation schemas

## Architecture

### Backend (`artifacts/api-server/`)
- **Express server** running on port 8080
- **Sports data integration** with API-Football for live match data
- **In-memory state** storing match scores, events, win probability history, and commentary
- **WebSocket server** for real-time updates to connected TV clients
- **Gemini integration** for AI-powered commentary generation
- **Deterministic win probability model** based on score differential, elapsed time, and home advantage

### TV App (`vega-app/`)
- **React Native** app built with Vega SDK for Fire TV
- **Match list screen** showing live matches with D-pad navigation
- **Match detail screen** with win probability bar and live commentary feed
- **WebSocket client** for real-time match updates
- **D-pad optimized** interface for TV remote control

## Product

A live sports companion that transforms passive viewing into an interactive experience. Fans can see real-time win probabilities and receive AI-generated commentary that explains momentum shifts and key moments.

## Development

### Start API Server Only
```bash
pnpm run start
```

### Start Full Stack (TV App + API)
```bash
pnpm run start:tv
```

### Build TV App
```bash
pnpm run build:debug
```

## Gotchas

- **API Keys Required**: The app requires both GEMINI_API_KEY and API_FOOTBALL_KEY to function properly
- **Live Matches Only**: The app only shows matches that are currently live; check during match hours
- **Vega SDK Required**: TV app development requires the Vega SDK to be installed
- **No Database**: The app uses in-memory state; data is lost on server restart
- **Soccer Only (MVP)**: Current implementation supports football/soccer only; basketball and NFL are planned for future expansion
