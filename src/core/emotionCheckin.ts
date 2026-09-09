import { randomUUID } from "node:crypto";
import { appendCheckin, loadCheckins } from "./storage.js";
import { MOOD_SCORES, MOODS } from "./types.js";
import type { CheckinInput, EmotionCheckin, EmotionSummary, Mood } from "./types.js";

export class ValidationError extends Error {}

function assertValidInput(input: CheckinInput): void {
  if (!input.userId || !input.userId.trim()) {
    throw new ValidationError("userId is required");
  }
  if (!MOODS.includes(input.mood)) {
    throw new ValidationError(`mood must be one of: ${MOODS.join(", ")}`);
  }
  if (input.intensity !== undefined && (input.intensity < 1 || input.intensity > 10)) {
    throw new ValidationError("intensity must be between 1 and 10");
  }
  if (input.note !== undefined && input.note.length > 1000) {
    throw new ValidationError("note must be 1000 characters or fewer");
  }
}

export async function recordCheckin(input: CheckinInput): Promise<EmotionCheckin> {
  assertValidInput(input);
  const entry: EmotionCheckin = {
    id: randomUUID(),
    userId: input.userId.trim(),
    mood: input.mood,
    intensity: input.intensity,
    note: input.note?.trim() || undefined,
    tags: input.tags?.map((tag) => tag.trim()).filter(Boolean),
    createdAt: new Date().toISOString(),
  };
  await appendCheckin(entry);
  return entry;
}

export async function getHistory(
  userId: string,
  options: { limit?: number; sinceDays?: number } = {}
): Promise<EmotionCheckin[]> {
  if (!userId || !userId.trim()) {
    throw new ValidationError("userId is required");
  }
  const all = await loadCheckins();
  let entries = all.filter((entry) => entry.userId === userId.trim());

  if (options.sinceDays !== undefined) {
    const cutoff = Date.now() - options.sinceDays * 24 * 60 * 60 * 1000;
    entries = entries.filter((entry) => new Date(entry.createdAt).getTime() >= cutoff);
  }

  entries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (options.limit !== undefined) {
    entries = entries.slice(0, options.limit);
  }
  return entries;
}

export async function getSummary(userId: string, periodDays = 7): Promise<EmotionSummary> {
  const entries = await getHistory(userId, { sinceDays: periodDays });

  const moodCounts = Object.fromEntries(MOODS.map((mood) => [mood, 0])) as Record<Mood, number>;
  for (const entry of entries) {
    moodCounts[entry.mood] += 1;
  }

  const averageScore = entries.length
    ? entries.reduce((sum, entry) => sum + MOOD_SCORES[entry.mood], 0) / entries.length
    : null;

  return {
    userId: userId.trim(),
    periodDays,
    totalCheckins: entries.length,
    averageScore: averageScore !== null ? Math.round(averageScore * 100) / 100 : null,
    moodCounts,
    latest: entries[0] ?? null,
  };
}
