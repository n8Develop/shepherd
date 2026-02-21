import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { setupTestDir } from "./test-helpers.js";
import {
  createVerification,
  getVerification,
  updateVerification,
  listVerifications,
} from "./verification.js";

const helper = setupTestDir();

beforeEach(() => helper.setup());
afterEach(() => helper.teardown());

describe("verification", () => {
  const base = {
    id: "ver-001",
    sessionId: "session-001",
    taskId: "task-001",
    requestedBy: "teammate-frontend",
    type: "visual" as const,
    description: "Check login page layout",
    artifacts: [
      { type: "url" as const, url: "http://localhost:5173/login" },
      { type: "file" as const, path: "/c/Users/User/project/screenshot.png" },
    ],
  };

  it("creates and reads a verification request", async () => {
    const created = await createVerification(base);
    expect(created.status).toBe("pending");
    expect(created.resolution).toBeNull();
    expect(created.resolvedAt).toBeNull();
    expect(created.feedback).toBeNull();
    expect(created.requestedAt).toBeTruthy();

    const read = await getVerification("ver-001");
    expect(read).toEqual(created);
  });

  it("returns null for nonexistent request", async () => {
    const result = await getVerification("nope");
    expect(result).toBeNull();
  });

  it("updates status to approved with resolvedAt timestamp", async () => {
    await createVerification(base);
    const updated = await updateVerification("ver-001", {
      status: "approved",
      resolution: "Looks good",
    });
    expect(updated?.status).toBe("approved");
    expect(updated?.resolution).toBe("Looks good");
    expect(updated?.resolvedAt).toBeTruthy();
  });

  it("updates status to rejected with feedback", async () => {
    await createVerification(base);
    const updated = await updateVerification("ver-001", {
      status: "rejected",
      resolution: "Layout broken",
      feedback: "Header overlaps the form on mobile",
    });
    expect(updated?.status).toBe("rejected");
    expect(updated?.feedback).toBe("Header overlaps the form on mobile");
  });

  it("lists all verifications", async () => {
    await createVerification(base);
    await createVerification({ ...base, id: "ver-002", sessionId: "session-002" });
    const list = await listVerifications();
    expect(list).toHaveLength(2);
  });

  it("filters by status", async () => {
    await createVerification(base);
    await createVerification({ ...base, id: "ver-002" });
    await updateVerification("ver-002", { status: "approved" });

    const pending = await listVerifications({ status: "pending" });
    expect(pending).toHaveLength(1);
    expect(pending[0].id).toBe("ver-001");

    const approved = await listVerifications({ status: "approved" });
    expect(approved).toHaveLength(1);
    expect(approved[0].id).toBe("ver-002");
  });

  it("filters by sessionId", async () => {
    await createVerification(base);
    await createVerification({ ...base, id: "ver-002", sessionId: "session-002" });

    const filtered = await listVerifications({ sessionId: "session-002" });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe("ver-002");
  });

  it("filters by both status and sessionId", async () => {
    await createVerification(base);
    await createVerification({ ...base, id: "ver-002", sessionId: "session-002" });
    await createVerification({ ...base, id: "ver-003", sessionId: "session-002" });
    await updateVerification("ver-003", { status: "approved" });

    const filtered = await listVerifications({
      status: "pending",
      sessionId: "session-002",
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe("ver-002");
  });
});
