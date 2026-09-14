# Fire TV Discovery Demo

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/family-screen run dev` — run the family screen (port 5000)
- `pnpm --filter @workspace/mockup-sandbox run dev` — run the mockup sandbox (port 3001)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- Build: esbuild (CJS bundle)
- Frontend: React + Vite + Tailwind CSS

## Where things live

- `artifacts/api-server` — Backend API server
- `artifacts/family-screen` — Family screen frontend
- `artifacts/mockup-sandbox` — Mockup sandbox for development
- `lib/` — Shared libraries and utilities
- `scripts/` — Build and utility scripts

## Architecture decisions

- Using pnpm workspaces for monorepo management
- Separate frontend and backend artifacts for independent development
- Tailwind CSS v4 for styling
- React 19 with modern hooks patterns

## Product

A demo application for Fire TV discovery and family screen functionality.

## User preferences

None configured yet.

## Gotchas

- Ensure all environment variables are set before running the development servers
- The API server runs on port 8080 by default
- Frontend applications use different ports to avoid conflicts# FamilyScreen
