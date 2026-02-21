import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { setupTestDir } from "./test-helpers.js";
import { createFeedback, getFeedback, listFeedback } from "./feedback.js";

const helper = setupTestDir();

beforeEach(() => helper.setup());
afterEach(() => helper.teardown());

describe("feedback", () => {
  const base = {
    id: "fb-001",
    sessionId: "session-001",
    verificationId: "ver-001",
    content: "The header needs to be smaller on mobile",
  };

  it("creates and reads feedback", async () => {
    const created = await createFeedback(base);
    expect(created.createdAt).toBeTruthy();
    expect(created.content).toBe(base.content);

    const read = await getFeedback("fb-001");
    expect(read).toEqual(created);
  });

  it("returns null for nonexistent feedback", async () => {
    const result = await getFeedback("nope");
    expect(result).toBeNull();
  });

  it("lists all feedback", async () => {
    await createFeedback(base);
    await createFeedback({ ...base, id: "fb-002" });
    const list = await listFeedback();
    expect(list).toHaveLength(2);
  });

  it("filters by sessionId", async () => {
    await createFeedback(base);
    await createFeedback({ ...base, id: "fb-002", sessionId: "session-002" });

    const filtered = await listFeedback({ sessionId: "session-002" });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe("fb-002");
  });
});
