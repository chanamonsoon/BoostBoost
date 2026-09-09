import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { EmotionCheckin } from "./types.js";

const DATA_FILE = process.env.BOOSTBOOST_DATA_FILE ?? new URL("../../data/emotion-checkins.json", import.meta.url).pathname;

let writeQueue: Promise<unknown> = Promise.resolve();

async function ensureFile(): Promise<void> {
  await mkdir(dirname(DATA_FILE), { recursive: true });
  try {
    await readFile(DATA_FILE, "utf8");
  } catch {
    await writeFile(DATA_FILE, "[]\n", "utf8");
  }
}

export async function loadCheckins(): Promise<EmotionCheckin[]> {
  await ensureFile();
  const raw = await readFile(DATA_FILE, "utf8");
  return raw.trim().length ? (JSON.parse(raw) as EmotionCheckin[]) : [];
}

export async function appendCheckin(entry: EmotionCheckin): Promise<void> {
  // Serialize writes so concurrent check-ins never clobber each other's read-modify-write.
  writeQueue = writeQueue.then(async () => {
    const all = await loadCheckins();
    all.push(entry);
    await writeFile(DATA_FILE, `${JSON.stringify(all, null, 2)}\n`, "utf8");
  });
  await writeQueue;
}
