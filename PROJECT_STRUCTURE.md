# Fire TV Sports Companion - Project Structure

## Current App Structure

The project contains exactly two components:

### 1. Vega TV App (`vega-app/`)
- **Purpose**: Fire TV app for live sports companion features
- **Framework**: React Native + Vega SDK
- **Build**: Vega .vpkg packages
- **Features**: Match list screen, match detail screen with win probability bar, live commentary feed
- **Network**: Uses Vega-specific network (10.0.2.2:8080)

### 2. Backend API Server (`artifacts/api-server/`)
- **Purpose**: Sports data API with live match tracking and AI commentary
- **Framework**: Express 5 + TypeScript
- **Features**: Live match polling, win probability calculation, Gemini commentary generation, WebSocket broadcasts
- **Network**: Runs on port 8080

## Complete Directory Structure

```
Fire-TV-Discovery-Demo/
├── vega-app/                          # Vega TV app (for Fire TV virtual device)
│   ├── src/
│   │   ├── App.tsx                   # Main TV app state machine (MatchListScreen ⇄ MatchScreen)
│   │   ├── screens/                  # TV screens
│   │   │   ├── MatchListScreen.tsx   # Live match list with D-pad navigation
│   │   │   └── MatchScreen.tsx       # Match detail with win probability and commentary
│   │   ├── components/
│   │   │   └── Tile.tsx              # Match tile component (repurposed from movie tiles)
│   │   ├── api.ts                    # Sports API integration
│   │   ├── config.ts                 # Network configuration
│   │   ├── storage.ts                # Storage utilities (empty for MVP)
│   │   ├── theme.ts                  # Theme colors
│   │   ├── types.ts                  # Match and sports types
│   │   └── useMatchSocket.ts         # WebSocket hook for live updates
│   ├── build/                        # Vega build outputs
│   ├── manifest.toml                 # Vega package manifest
│   └── package.json                  # Dependencies
│
├── artifacts/
│   └── api-server/                   # Backend API server
│       ├── src/
│       │   ├── app.ts                # Express app configuration
│       │   ├── index.ts              # Server entry point with WebSocket
│       │   ├── lib/
│       │   │   ├── sports-data.ts    # Match types, in-memory store, win probability model
│       │   │   ├── gemini.ts         # Gemini commentary generation
│       │   │   ├── sports-socket.ts  # WebSocket connection management
│       │   │   └── logger.ts         # Logging utilities
│       │   └── routes/
│       │       ├── sports.ts         # Sports endpoints (/matches, /matches/:id, /matches/:id/ask)
│       │       ├── health.ts         # Health check endpoint
│       │       └── index.ts          # Route aggregation
│       ├── .env.example              # Environment variables template
│       └── dist/                     # Compiled server
│
├── lib/
│   └── api-zod/                      # Shared Zod validation schemas (health check only)
│
├── scripts/                          # Utility scripts
├── node_modules/                     # Root dependencies
├── package.json                      # Root package config
├── pnpm-workspace.yaml              # PNPM workspace config
├── start_all.sh                      # Start API server + Vega TV app
├── stop_all.sh                       # Stop all services
└── render.yaml                       # Render deployment config
```

## How the Components Work Together

### Data Flow
1. **API Server** polls API-Football every 60-90 seconds for live match data
2. **Win Probability Model** calculates outcome probabilities based on score, time, and home advantage
3. **Gemini Integration** generates commentary when significant events occur (goals, probability shifts)
4. **WebSocket Server** broadcasts match updates, commentary, and probability changes to connected clients
5. **TV App** displays match list, allows selection, and shows real-time updates via WebSocket

### Network Architecture
- **Backend API**: Runs on host machine (port 8080)
- **TV App**: Connects via Vega network (10.0.2.2:8080)
- **WebSocket**: Same endpoint (/ws) for real-time updates

## Development Commands

### TV App (Vega)
```bash
cd vega-app
pnpm run build:debug              # Build Vega packages for debug
pnpm run build:release           # Build Vega packages for release
```

### Backend API
```bash
cd artifacts/api-server
pnpm start                       # Start API server on port 8080
pnpm run dev                     # Start API server with auto-reload
```

### Full Stack
```bash
pnpm run start:tv                # Start API server + Vega TV app
pnpm run stop:all                # Stop all services
```

## Key Architecture Decisions

- **In-Memory State**: No database required; match state lives in memory and resets on server restart
- **Deterministic Win Probability**: Simple logistic model based on score differential and time (no ML)
- **WebSocket-First**: Real-time updates via WebSocket with polling fallback
- **TV-Only Interface**: No mobile/web companion apps; TV is self-contained
- **D-pad Navigation**: All UI optimized for Fire TV remote control
- **Channel-Agnostic**: Works with any live sports data source (API-Football for MVP)

## Environment Variables

Required for API server (`artifacts/api-server/.env`):
- `GEMINI_API_KEY`: For AI commentary generation
- `API_FOOTBALL_KEY`: For live football/soccer data
- `PORT`: Server port (default: 8080)

## Summary

The project has a streamlined structure with:
- ✅ **One TV app** for Fire TV with live sports features
- ✅ **One backend API** with sports data integration and AI commentary
- ✅ **No pairing/account complexity** - TV is self-contained
- ✅ **No database dependency** - in-memory state for simplicity
- ✅ **Clear separation** between presentation (TV) and data (API)
