import { join } from "node:path";
import { readFile, writeFile, readdir } from "node:fs/promises";
import { normalize, feedbackDir } from "./paths.js";

export interface FeedbackEntry {
  id: string;
  sessionId: string;
  verificationId: string;
  content: string;
  createdAt: string;
}

function feedbackPath(id: string): string {
  return normalize(join(feedbackDir(), `${id}.json`));
}

export async function createFeedback(
  data: Omit<FeedbackEntry, "createdAt">
): Promise<FeedbackEntry> {
  const entry: FeedbackEntry = {
    ...data,
    createdAt: new Date().toISOString(),
  };
  await writeFile(feedbackPath(data.id), JSON.stringify(entry, null, 2));
  return entry;
}

export async function getFeedback(
  id: string
): Promise<FeedbackEntry | null> {
  try {
    const raw = await readFile(feedbackPath(id), "utf-8");
    return JSON.parse(raw) as FeedbackEntry;
  } catch {
    return null;
  }
}

export async function listFeedback(
  filter?: { sessionId?: string }
): Promise<FeedbackEntry[]> {
  try {
    const files = await readdir(feedbackDir());
    const jsonFiles = files.filter((f) => f.endsWith(".json"));
    const results = await Promise.all(
      jsonFiles.map((f) => getFeedback(f.replace(".json", "")))
    );
    let list = results.filter((r): r is FeedbackEntry => r !== null);
    if (filter?.sessionId) {
      list = list.filter((r) => r.sessionId === filter.sessionId);
    }
    return list;
  } catch {
    return [];
  }
}
