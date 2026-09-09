import express from "express";
import { getHistory, getSummary, recordCheckin, ValidationError } from "../core/emotionCheckin.js";

export function createApp() {
  const app = express();
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/privacy", (_req, res) => {
    res.type("html").send(
      "<h1>BoostBoost Emotion Check-in — Privacy</h1>" +
        "<p>This service stores the check-ins you or an agent copilot submit on your behalf: " +
        "a user identifier, mood, and any optional note, intensity, or tags you include. " +
        "Data is used only to show your own mood history and summaries back to you or the " +
        "copilot acting for you, and is not shared with third parties. " +
        "Contact your BoostBoost administrator to have your data reviewed or deleted.</p>"
    );
  });

  app.get("/terms", (_req, res) => {
    res.type("html").send(
      "<h1>BoostBoost Emotion Check-in — Terms of Use</h1>" +
        "<p>This is an internal wellbeing tool provided as-is, without warranty, for use by " +
        "members of your organization. Don't use it to store data about people who haven't " +
        "consented to a check-in being logged on their behalf. Access may be revoked or the " +
        "service discontinued at any time.</p>"
    );
  });

  const requiredApiKey = process.env.BOOSTBOOST_API_KEY;
  if (!requiredApiKey) {
    console.warn(
      "BOOSTBOOST_API_KEY is not set — /api routes are unauthenticated. Set it before exposing this server publicly."
    );
  }

  app.use("/api", (req, res, next) => {
    if (!requiredApiKey) {
      next();
      return;
    }
    if (req.header("x-api-key") !== requiredApiKey) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    next();
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
