import { join } from "node:path";
import { mkdir, readFile, writeFile, readdir } from "node:fs/promises";
import { normalize, sessionsDir } from "./paths.js";

export interface SessionMeta {
  id: string;
  teamName: string;
  projectDir: string;
  plan: string;
  startedAt: string;
  status: "running" | "completed" | "failed";
}

function sessionPath(id: string): string {
  return normalize(join(sessionsDir(), id));
}

function metaPath(id: string): string {
  return normalize(join(sessionPath(id), "meta.json"));
}

export async function createSession(
  data: Omit<SessionMeta, "startedAt" | "status">
): Promise<SessionMeta> {
  const session: SessionMeta = {
    ...data,
    startedAt: new Date().toISOString(),
    status: "running",
  };
  await mkdir(sessionPath(data.id), { recursive: true });
  await writeFile(metaPath(data.id), JSON.stringify(session, null, 2));
  return session;
}

export async function getSession(id: string): Promise<SessionMeta | null> {
  try {
    const raw = await readFile(metaPath(id), "utf-8");
    return JSON.parse(raw) as SessionMeta;
  } catch {
    return null;
  }
}

export async function updateSession(
  id: string,
  updates: Partial<Pick<SessionMeta, "status">>
): Promise<SessionMeta | null> {
  const session = await getSession(id);
  if (!session) return null;
  const updated = { ...session, ...updates };
  await writeFile(metaPath(id), JSON.stringify(updated, null, 2));
  return updated;
}

export async function listSessions(): Promise<SessionMeta[]> {
  try {
    const dirs = await readdir(sessionsDir());
    const results = await Promise.all(dirs.map(getSession));
    return results.filter((s): s is SessionMeta => s !== null);
  } catch {
    return [];
  }
}
