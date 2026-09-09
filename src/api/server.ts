import express from "express";
import { getHistory, getSummary, recordCheckin, ValidationError } from "../core/emotionCheckin.js";

export function createApp() {
  const app = express();
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/emotion-checkin", async (req, res) => {
    try {
      const entry = await recordCheckin(req.body ?? {});
      res.status(201).json(entry);
    } catch (err) {
      if (err instanceof ValidationError) {
        res.status(400).json({ error: err.message });
        return;
      }
      res.status(500).json({ error: "internal_error" });
    }
  });

  app.get("/api/emotion-checkin", async (req, res) => {
    try {
      const userId = String(req.query.userId ?? "");
      const limit = req.query.limit !== undefined ? Number(req.query.limit) : undefined;
      const sinceDays = req.query.sinceDays !== undefined ? Number(req.query.sinceDays) : undefined;
      const entries = await getHistory(userId, { limit, sinceDays });
      res.json({ entries });
    } catch (err) {
      if (err instanceof ValidationError) {
        res.status(400).json({ error: err.message });
        return;
      }
      res.status(500).json({ error: "internal_error" });
    }
  });

  app.get("/api/emotion-checkin/summary", async (req, res) => {
    try {
      const userId = String(req.query.userId ?? "");
      const periodDays = req.query.periodDays !== undefined ? Number(req.query.periodDays) : undefined;
      const summary = await getSummary(userId, periodDays);
      res.json(summary);
    } catch (err) {
      if (err instanceof ValidationError) {
        res.status(400).json({ error: err.message });
        return;
      }
      res.status(500).json({ error: "internal_error" });
    }
  });

  return app;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.env.PORT ?? 3000);
  createApp().listen(port, () => {
    console.log(`BoostBoost emotion check-in API listening on :${port}`);
  });
}
