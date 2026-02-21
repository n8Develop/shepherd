import { randomUUID } from "node:crypto";
import { ensureDirs } from "../queue/paths.js";
import { createSession } from "../queue/sessions.js";
import { spawnCli } from "../cli/spawn.js";

export interface DispatchPlanInput {
  plan: string;
  projectDir: string;
  teamName?: string;
}

export async function dispatchPlan(input: DispatchPlanInput) {
  const { plan, projectDir, teamName } = input;
  const sessionId = randomUUID();

  // Ensure ~/.shepherd/ structure exists
  await ensureDirs();

  // Write session metadata
  const session = await createSession({
    id: sessionId,
    teamName: teamName || "default",
    projectDir,
    plan,
  });

  // Spawn CLI process
  spawnCli({ plan, projectDir, sessionId });

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            sessionId: session.id,
            status: session.status,
            teamName: session.teamName,
            projectDir: session.projectDir,
            startedAt: session.startedAt,
          },
          null,
          2
        ),
      },
    ],
  };
}
