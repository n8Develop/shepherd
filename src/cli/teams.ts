/**
 * Agent teams filesystem reader.
 *
 * Isolated module — if Anthropic changes the agent teams storage format,
 * only this file needs updating.
 *
 * Agent teams store task state in `{projectDir}/.claude/tasks/`.
 * Format is experimental and undocumented, so we read defensively
 * and return raw data with minimal assumptions.
 */

import { join } from "node:path";
import { readFile, readdir, stat } from "node:fs/promises";
import { normalize } from "../queue/paths.js";

export interface TeamTask {
  /** Raw task data from the filesystem — shape may change */
  [key: string]: unknown;
}

export interface TeamStatus {
  projectDir: string;
  tasksDir: string;
  tasks: TeamTask[];
  /** Files that couldn't be parsed */
  errors: string[];
}

/**
 * Read agent team task state from a project directory.
 * Looks in `{projectDir}/.claude/tasks/` for JSON files.
 */
export async function readTeamStatus(projectDir: string): Promise<TeamStatus> {
  const tasksDir = normalize(join(projectDir, ".claude", "tasks"));
  const result: TeamStatus = {
    projectDir: normalize(projectDir),
    tasksDir,
    tasks: [],
    errors: [],
  };

  try {
    const entries = await readdir(tasksDir);

    for (const entry of entries) {
      const entryPath = normalize(join(tasksDir, entry));

      try {
        const info = await stat(entryPath);

        if (info.isFile() && entry.endsWith(".json")) {
          const raw = await readFile(entryPath, "utf-8");
          const data = JSON.parse(raw) as TeamTask;
          result.tasks.push(data);
        } else if (info.isDirectory()) {
          // Agent teams may nest task data in subdirectories
          const subFiles = await readdir(entryPath);
          for (const sub of subFiles) {
            if (!sub.endsWith(".json")) continue;
            try {
              const subPath = normalize(join(entryPath, sub));
              const raw = await readFile(subPath, "utf-8");
              const data = JSON.parse(raw) as TeamTask;
              result.tasks.push(data);
            } catch {
              result.errors.push(normalize(join(entryPath, sub)));
            }
          }
        }
      } catch {
        result.errors.push(entryPath);
      }
    }
  } catch {
    // Directory doesn't exist or can't be read — not an error,
    // team may not have written tasks yet
  }

  return result;
}
