import { z } from "zod/v4";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dispatchPlan } from "./dispatch-plan.js";
import { getSession } from "../queue/sessions.js";
import { listVerifications } from "../queue/verification.js";
import { readTeamStatus } from "../cli/teams.js";
import { getActiveProcess } from "../cli/spawn.js";

export function registerTools(server: McpServer): void {
  server.registerTool(
    "dispatch-plan",
    {
      title: "Dispatch Plan",
      description:
        "Dispatch a plan to a Claude Code CLI agent team. Spawns a CLI lead with agent teams enabled and returns a session ID for tracking.",
      inputSchema: z.object({
        plan: z.string().describe("The plan to dispatch to the agent team"),
        projectDir: z
          .string()
          .describe("Absolute path to the project directory"),
        teamName: z
          .string()
          .optional()
          .describe("Optional name for the agent team"),
      }),
    },
    async ({ plan, projectDir, teamName }) => {
      return dispatchPlan({ plan, projectDir, teamName });
    }
  );

  server.registerTool(
    "get-team-status",
    {
      title: "Get Team Status",
      description:
        "Get the current status of an agent team session, including task progress and active teammates.",
      inputSchema: z.object({
        sessionId: z.string().describe("The session ID returned by dispatch-plan"),
      }),
    },
    async ({ sessionId }) => {
      const session = await getSession(sessionId);
      if (!session) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ error: `Session ${sessionId} not found` }),
            },
          ],
        };
      }

      // Check if CLI process is still running
      const process = getActiveProcess(sessionId);
      const processAlive = process !== undefined && process.exitCode === null;

      // Read agent team task state from the project directory
      const teamStatus = await readTeamStatus(session.projectDir);

      // Get pending verifications for this session
      const pendingVerifications = await listVerifications({
        status: "pending",
        sessionId,
      });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                sessionId: session.id,
                teamName: session.teamName,
                projectDir: session.projectDir,
                status: session.status,
                startedAt: session.startedAt,
                cliProcessRunning: processAlive,
                tasks: teamStatus.tasks,
                pendingVerifications: pendingVerifications.length,
                ...(teamStatus.errors.length > 0
                  ? { taskReadErrors: teamStatus.errors }
                  : {}),
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.registerTool(
    "get-verification-queue",
    {
      title: "Get Verification Queue",
      description:
        "List pending visual verification requests from agent team teammates. Each request includes artifacts (files, URLs) that need human visual inspection.",
      inputSchema: z.object({
        status: z
          .enum(["pending", "approved", "rejected", "all"])
          .optional()
          .default("pending")
          .describe("Filter by verification status"),
        sessionId: z
          .string()
          .optional()
          .describe("Filter by session ID"),
      }),
    },
    async ({ status, sessionId }) => {
      const queue = await listVerifications({
        status: status === "all" ? undefined : status,
        sessionId,
      });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                filter: { status, sessionId },
                count: queue.length,
                queue,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );
}
