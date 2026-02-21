import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { setupTestDir } from "./test-helpers.js";
import {
  createSession,
  getSession,
  updateSession,
  listSessions,
} from "./sessions.js";

const helper = setupTestDir();

beforeEach(() => helper.setup());
afterEach(() => helper.teardown());

describe("sessions", () => {
  const base = {
    id: "session-001",
    teamName: "test-team",
    projectDir: "/c/Users/User/project",
    plan: "Build the thing",
  };

  it("creates and reads a session", async () => {
    const created = await createSession(base);
    expect(created.id).toBe("session-001");
    expect(created.status).toBe("running");
    expect(created.startedAt).toBeTruthy();

    const read = await getSession("session-001");
    expect(read).toEqual(created);
  });

  it("returns null for nonexistent session", async () => {
    const result = await getSession("nope");
    expect(result).toBeNull();
  });

  it("updates session status", async () => {
    await createSession(base);
    const updated = await updateSession("session-001", {
      status: "completed",
    });
    expect(updated?.status).toBe("completed");

    const read = await getSession("session-001");
    expect(read?.status).toBe("completed");
  });

  it("lists all sessions", async () => {
    await createSession(base);
    await createSession({ ...base, id: "session-002" });
    const list = await listSessions();
    expect(list).toHaveLength(2);
    const ids = list.map((s) => s.id).sort();
    expect(ids).toEqual(["session-001", "session-002"]);
  });
});
