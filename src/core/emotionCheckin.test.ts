import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, beforeEach, test } from "node:test";

let dataDir: string;

before(async () => {
  dataDir = await mkdtemp(join(tmpdir(), "boostboost-test-"));
  process.env.BOOSTBOOST_DATA_FILE = join(dataDir, "emotion-checkins.json");
});

after(async () => {
  await rm(dataDir, { recursive: true, force: true });
});

const { recordCheckin, getHistory, getSummary, ValidationError } = await import("./emotionCheckin.js");

beforeEach(async () => {
  const { writeFile } = await import("node:fs/promises");
  await writeFile(process.env.BOOSTBOOST_DATA_FILE!, "[]\n", "utf8");
});

test("recordCheckin stores and returns a normalized entry", async () => {
  const entry = await recordCheckin({
    userId: "  u1  ",
    mood: "happy",
    intensity: 6,
    note: "  good day  ",
    tags: [" work ", ""],
  });
  assert.equal(entry.userId, "u1");
  assert.equal(entry.note, "good day");
  assert.deepEqual(entry.tags, ["work"]);
  assert.ok(entry.id);
  assert.ok(entry.createdAt);
});

test("recordCheckin rejects an invalid mood", async () => {
  await assert.rejects(
    recordCheckin({ userId: "u1", mood: "ecstatic" as never }),
    ValidationError
  );
});

test("recordCheckin rejects an empty userId", async () => {
  await assert.rejects(recordCheckin({ userId: "  ", mood: "happy" }), ValidationError);
});

test("recordCheckin rejects out-of-range intensity", async () => {
  await assert.rejects(
    recordCheckin({ userId: "u1", mood: "happy", intensity: 11 }),
    ValidationError
  );
});

test("getHistory returns entries newest-first, scoped to the user", async () => {
  await recordCheckin({ userId: "u1", mood: "sad" });
  await recordCheckin({ userId: "u2", mood: "happy" });
  await recordCheckin({ userId: "u1", mood: "very_happy" });

  const history = await getHistory("u1");
  assert.equal(history.length, 2);
  assert.equal(history[0].mood, "very_happy");
  assert.equal(history[1].mood, "sad");
});

test("getHistory respects the limit option", async () => {
  await recordCheckin({ userId: "u1", mood: "sad" });
  await recordCheckin({ userId: "u1", mood: "neutral" });
  await recordCheckin({ userId: "u1", mood: "happy" });

  const history = await getHistory("u1", { limit: 2 });
  assert.equal(history.length, 2);
});

test("getSummary computes average score and mood counts", async () => {
  await recordCheckin({ userId: "u1", mood: "sad" }); // score 2
  await recordCheckin({ userId: "u1", mood: "happy" }); // score 4

  const summary = await getSummary("u1", 7);
  assert.equal(summary.totalCheckins, 2);
  assert.equal(summary.averageScore, 3);
  assert.equal(summary.moodCounts.sad, 1);
  assert.equal(summary.moodCounts.happy, 1);
  assert.equal(summary.latest?.mood, "happy");
});

test("getSummary handles a user with no check-ins", async () => {
  const summary = await getSummary("nobody", 7);
  assert.equal(summary.totalCheckins, 0);
  assert.equal(summary.averageScore, null);
  assert.equal(summary.latest, null);
});
