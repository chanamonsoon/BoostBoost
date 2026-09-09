# BoostBoost — Emotion Check-in

A small service for recording and reviewing how a user is feeling. The same
core logic (`src/core/`) is exposed two ways so any client can use whichever
fits:

- **REST API** (`src/api/server.ts`) — plain HTTP, for web/mobile clients or
  any copilot that calls out over HTTP.
- **MCP tool server** (`src/mcp/server.ts`) — exposes `emotion_checkin`,
  `get_emotion_history`, and `get_emotion_summary` as tools, for an AI agent
  copilot (Claude, or anything speaking MCP) to call directly.

Data is stored in a flat JSON file at `data/emotion-checkins.json` (path
overridable via `BOOSTBOOST_DATA_FILE`) — enough for a single-instance
prototype; swap `src/core/storage.ts` for a real database when this needs to
scale.

## Setup

```bash
npm install
```

## Run the REST API

```bash
npm run dev:api        # ts-node style, for local dev
# or
npm run build && npm run start:api
```

Endpoints:

- `POST /api/emotion-checkin` — body `{ userId, mood, intensity?, note?, tags? }`
- `GET /api/emotion-checkin?userId=...&limit=...&sinceDays=...` — history, newest first
- `GET /api/emotion-checkin/summary?userId=...&periodDays=7` — average mood, counts, latest entry
- `GET /health`

`mood` must be one of: `very_sad`, `sad`, `neutral`, `happy`, `very_happy`.

## Run the MCP tool server

```bash
npm run dev:mcp
# or
npm run build && npm run start:mcp
```

Register it with an MCP-capable copilot (e.g. in a Claude Desktop / Claude
Code MCP config) by pointing a server entry at
`node dist/mcp/server.js` (after `npm run build`) or `npx tsx src/mcp/server.ts`
for local dev. It exposes three tools:

- `emotion_checkin` — record a mood
- `get_emotion_history` — fetch recent check-ins for a user
- `get_emotion_summary` — average mood / counts / latest check-in over a period

## Type-check and test

```bash
npm run typecheck
npm test
```

## Deploying the REST API

Only the REST API is meant to run as a hosted service — the MCP server talks
stdio and is meant to run as a local subprocess next to whatever copilot is
using it, not as something you deploy on its own.

A `Dockerfile` is included (multi-stage build, runs `node dist/api/server.js`
on `$PORT`, defaulting to 3000). Recommended host: **Railway** (or Render) —
both build straight from this Dockerfile, give you a public URL, and support
a persistent volume, which this service needs since check-ins are stored in
a JSON file (`src/core/storage.ts`) rather than a database.

Steps on Railway:

1. New Project → Deploy from GitHub repo → pick this repo/branch. Railway
   detects the `Dockerfile` automatically.
2. Add a **Volume**, mount path `/app/data`. Without this, check-ins are
   lost on every redeploy/restart (the container filesystem is ephemeral).
3. Set the env var `BOOSTBOOST_DATA_FILE=/app/data/emotion-checkins.json`
   (matches the Dockerfile default, but set it explicitly so it's obvious).
4. Deploy. Railway injects `PORT` automatically; the server already reads
   it.
5. Verify: `curl https://<your-app>.up.railway.app/health` → `{"status":"ok"}`.

This is a single JSON-file store, fine for a prototype/single instance but
not for multiple replicas or serious scale — swap `src/core/storage.ts` for
a real database (e.g. Postgres) before that matters.

Set `BOOSTBOOST_API_KEY` on the deployed instance — without it, `/api/*`
routes are unauthenticated (fine for local dev, not for anything public).
Callers must send it back as the `x-api-key` header.

## Microsoft 365 Copilot / Teams agent

See [`teams-agent/`](./teams-agent/) — wires this API into Teams and M365
Copilot as a declarative agent (an "agent copilot" that lives inside Teams
chat), using the deployed REST API as its action backend.
