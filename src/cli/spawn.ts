import { spawn, execSync, type ChildProcess } from "node:child_process";
import { appendFile } from "node:fs/promises";
import { join } from "node:path";
import { normalize, sessionsDir } from "../queue/paths.js";

export interface SpawnOptions {
  plan: string;
  projectDir: string;
  sessionId: string;
}

export interface SpawnResult {
  process: ChildProcess;
  sessionId: string;
}

/** Active CLI processes keyed by session ID */
const activeProcesses = new Map<string, ChildProcess>();

export function getActiveProcess(sessionId: string): ChildProcess | undefined {
  return activeProcesses.get(sessionId);
}

export function getActiveSessionIds(): string[] {
  return [...activeProcesses.keys()];
}

/** Cache the resolved claude.exe path */
let claudePath: string | null = null;

/**
 * Find the full path to claude executable.
 * Resolves once and caches. Uses `where` on Windows, `which` elsewhere.
 */
function resolveClaudePath(): string {
  if (claudePath) return claudePath;
  try {
    const cmd = process.platform === "win32" ? "where claude" : "which claude";
    const result = execSync(cmd, { encoding: "utf-8" }).trim().split("\n")[0].trim();
    claudePath = result;
    return result;
  } catch {
    // Fallback — hope it's on PATH
    claudePath = "claude";
    return "claude";
  }
}

/**
 * Spawn a Claude CLI process with agent teams enabled.
 * Uses `claude -p` (print mode) with the plan as input.
 * Spawns directly by resolved exe path — no shell needed.
 */
export function spawnCli(options: SpawnOptions): SpawnResult {
  const { plan, projectDir, sessionId } = options;

  const logPath = normalize(join(sessionsDir(), sessionId, "log.jsonl"));
  const exe = resolveClaudePath();

  // Strip CLAUDECODE to avoid nesting guard when server runs inside a Claude session
  const { CLAUDECODE: _, ...parentEnv } = process.env;

  const child = spawn(exe, ["-p", plan], {
    cwd: projectDir,
    env: {
      ...parentEnv,
      CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: "1",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  activeProcesses.set(sessionId, child);

  // Stream stdout/stderr to session log
  const logLine = async (stream: string, data: Buffer) => {
    const line = JSON.stringify({
      timestamp: new Date().toISOString(),
      stream,
      data: data.toString("utf-8").trimEnd(),
    });
    try {
      await appendFile(logPath, line + "\n");
    } catch {
      // Log dir may not exist yet on first write — non-fatal
    }
  };

  child.stdout?.on("data", (data: Buffer) => logLine("stdout", data));
  child.stderr?.on("data", (data: Buffer) => logLine("stderr", data));

  child.on("error", (err) => {
    activeProcesses.delete(sessionId);
    logLine("system", Buffer.from(`Spawn error: ${err.message}`));
  });

  child.on("close", (code) => {
    activeProcesses.delete(sessionId);
    logLine("system", Buffer.from(`Process exited with code ${code}`));
  });

  return { process: child, sessionId };
}
