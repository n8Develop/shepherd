import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  normalize,
  shepherdRoot,
  sessionsDir,
  verificationDir,
  feedbackDir,
  ensureDirs,
} from "./paths.js";

let testDir: string;

beforeEach(async () => {
  testDir = await mkdtemp(join(tmpdir(), "shepherd-test-"));
  process.env.SHEPHERD_DATA_DIR = testDir;
});

afterEach(async () => {
  delete process.env.SHEPHERD_DATA_DIR;
  await rm(testDir, { recursive: true, force: true });
});

describe("paths", () => {
  it("normalize converts backslashes to forward slashes", () => {
    expect(normalize("C:\\Users\\test\\path")).toBe("C:/Users/test/path");
  });

  it("shepherdRoot uses SHEPHERD_DATA_DIR when set", () => {
    expect(shepherdRoot()).toBe(normalize(testDir));
  });

  it("ensureDirs creates all subdirectories", async () => {
    await ensureDirs();
    const sessions = await stat(sessionsDir());
    const verification = await stat(verificationDir());
    const feedback = await stat(feedbackDir());
    expect(sessions.isDirectory()).toBe(true);
    expect(verification.isDirectory()).toBe(true);
    expect(feedback.isDirectory()).toBe(true);
  });
});
