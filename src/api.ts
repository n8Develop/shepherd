import { Router } from "express";
import { listSessions, getSession } from "./queue/sessions.js";
import {
  listVerifications,
  updateVerification,
} from "./queue/verification.js";
import { listFeedback, createFeedback } from "./queue/feedback.js";
import { readTeamStatus } from "./cli/teams.js";
import { getActiveProcess } from "./cli/spawn.js";

export function createApiRouter(): Router {
  const router = Router();

  // Sessions
  router.get("/sessions", async (_req, res) => {
    const sessions = await listSessions();
    res.json(sessions);
  });

  router.get("/sessions/:id", async (req, res) => {
    const session = await getSession(req.params.id);
    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    const teamStatus = await readTeamStatus(session.projectDir);
    const process = getActiveProcess(session.id);

    res.json({
      ...session,
      teamStatus,
      processAlive: process !== undefined,
    });
  });

  // Verifications
  router.get("/verifications", async (req, res) => {
    const status = req.query.status as string | undefined;
    const sessionId = req.query.sessionId as string | undefined;
    const verifications = await listVerifications({ status, sessionId });
    res.json(verifications);
  });

  router.post("/verifications/:id/submit", async (req, res) => {
    const { status, resolution, feedback } = req.body;
    const updated = await updateVerification(req.params.id, {
      status,
      resolution,
      feedback,
    });
    if (!updated) {
      res.status(404).json({ error: "Verification not found" });
      return;
    }
    res.json(updated);
  });

  // Feedback
  router.get("/feedback", async (req, res) => {
    const sessionId = req.query.sessionId as string | undefined;
    const feedbackList = await listFeedback({ sessionId });
    res.json(feedbackList);
  });

  router.post("/feedback", async (req, res) => {
    const { id, sessionId, verificationId, content } = req.body;
    if (!id || !sessionId || !verificationId || !content) {
      res.status(400).json({ error: "Missing required fields: id, sessionId, verificationId, content" });
      return;
    }
    const entry = await createFeedback({ id, sessionId, verificationId, content });
    res.json(entry);
  });

  return router;
}
