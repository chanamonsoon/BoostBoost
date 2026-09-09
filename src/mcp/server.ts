import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { getHistory, getSummary, recordCheckin, ValidationError } from "../core/emotionCheckin.js";
import { MOODS } from "../core/types.js";

const server = new McpServer({
  name: "boostboost-emotion-checkin",
  version: "0.1.0",
});

function toolError(err: unknown) {
  const message = err instanceof ValidationError ? err.message : "internal_error";
  return {
    content: [{ type: "text" as const, text: `Error: ${message}` }],
    isError: true,
  };
}

server.registerTool(
  "emotion_checkin",
  {
    title: "Record an emotion check-in",
    description:
      "Records how a user is feeling right now. Call this whenever the user shares their mood or an agent " +
      "copilot wants to log a wellbeing check-in on their behalf.",
    inputSchema: {
      userId: z.string().min(1).describe("Stable identifier for the user (e.g. account id)"),
      mood: z.enum(MOODS).describe("Overall mood category"),
      intensity: z.number().min(1).max(10).optional().describe("Optional intensity of the mood, 1 (mild) to 10 (extreme)"),
      note: z.string().max(1000).optional().describe("Optional free-text note about why they feel this way"),
      tags: z.array(z.string()).optional().describe("Optional tags, e.g. ['work', 'sleep']"),
    },
  },
  async (input) => {
    try {
      const entry = await recordCheckin(input);
      return { content: [{ type: "text", text: JSON.stringify(entry) }] };
    } catch (err) {
      return toolError(err);
    }
  }
);

server.registerTool(
  "get_emotion_history",
  {
    title: "Get emotion check-in history",
    description: "Fetches a user's recent emotion check-ins, most recent first.",
    inputSchema: {
      userId: z.string().min(1),
      limit: z.number().int().min(1).max(200).optional(),
      sinceDays: z.number().int().min(1).optional().describe("Only include check-ins from the last N days"),
    },
  },
  async ({ userId, limit, sinceDays }) => {
    try {
      const entries = await getHistory(userId, { limit, sinceDays });
      return { content: [{ type: "text", text: JSON.stringify({ entries }) }] };
    } catch (err) {
      return toolError(err);
    }
  }
);

server.registerTool(
  "get_emotion_summary",
  {
    title: "Get emotion check-in summary",
    description:
      "Summarizes a user's mood over a recent period: average mood score, counts per mood, and the latest check-in. " +
      "Useful for an agent copilot deciding whether to follow up or celebrate progress.",
    inputSchema: {
      userId: z.string().min(1),
      periodDays: z.number().int().min(1).optional().describe("Number of days to summarize, default 7"),
    },
  },
  async ({ userId, periodDays }) => {
    try {
      const summary = await getSummary(userId, periodDays);
      return { content: [{ type: "text", text: JSON.stringify(summary) }] };
    } catch (err) {
      return toolError(err);
    }
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
