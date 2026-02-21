import { join } from "node:path";
import { homedir } from "node:os";
import { mkdir } from "node:fs/promises";

/** Normalize path to forward slashes (Windows compat for JSON storage) */
export function normalize(p: string): string {
  return p.replace(/\\/g, "/");
}

/** Base directory for all Shepherd state. Override with SHEPHERD_DATA_DIR for testing. */
export function shepherdRoot(): string {
  return normalize(process.env.SHEPHERD_DATA_DIR || join(homedir(), ".shepherd"));
}

export function sessionsDir(): string {
  return normalize(join(shepherdRoot(), "sessions"));
}

export function verificationDir(): string {
  return normalize(join(shepherdRoot(), "verification-queue"));
}

export function feedbackDir(): string {
  return normalize(join(shepherdRoot(), "feedback"));
}

/** Ensure all ~/.shepherd/ subdirectories exist */
export async function ensureDirs(): Promise<void> {
  await Promise.all([
    mkdir(sessionsDir(), { recursive: true }),
    mkdir(verificationDir(), { recursive: true }),
    mkdir(feedbackDir(), { recursive: true }),
  ]);
}
