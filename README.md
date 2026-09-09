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
