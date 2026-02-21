import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { ensureDirs } from "./paths.js";

let testDir: string;

export function setupTestDir() {
  return {
    async setup() {
      testDir = await mkdtemp(join(tmpdir(), "shepherd-test-"));
      process.env.SHEPHERD_DATA_DIR = testDir;
      await ensureDirs();
      return testDir;
    },
    async teardown() {
      delete process.env.SHEPHERD_DATA_DIR;
      await rm(testDir, { recursive: true, force: true });
    },
  };
}
