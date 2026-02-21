import { join } from "node:path";
import { readFile, writeFile, readdir } from "node:fs/promises";
import { normalize, verificationDir } from "./paths.js";

export interface Artifact {
  type: "file" | "url";
  path?: string;
  url?: string;
}

export interface VerificationRequest {
  id: string;
  sessionId: string;
  taskId: string;
  requestedBy: string;
  requestedAt: string;
  type: "visual";
  description: string;
  artifacts: Artifact[];
  status: "pending" | "approved" | "rejected";
  resolution: string | null;
  resolvedAt: string | null;
  feedback: string | null;
}

function requestPath(id: string): string {
  return normalize(join(verificationDir(), `${id}.json`));
}

export async function createVerification(
  data: Omit<VerificationRequest, "requestedAt" | "status" | "resolution" | "resolvedAt" | "feedback">
): Promise<VerificationRequest> {
  const request: VerificationRequest = {
    ...data,
    requestedAt: new Date().toISOString(),
    status: "pending",
    resolution: null,
    resolvedAt: null,
    feedback: null,
  };
  await writeFile(requestPath(data.id), JSON.stringify(request, null, 2));
  return request;
}

export async function getVerification(
  id: string
): Promise<VerificationRequest | null> {
  try {
    const raw = await readFile(requestPath(id), "utf-8");
    return JSON.parse(raw) as VerificationRequest;
  } catch {
    return null;
  }
}

export async function updateVerification(
  id: string,
  updates: Partial<Pick<VerificationRequest, "status" | "resolution" | "feedback">>
): Promise<VerificationRequest | null> {
  const request = await getVerification(id);
  if (!request) return null;
  const updated: VerificationRequest = {
    ...request,
    ...updates,
    resolvedAt:
      updates.status && updates.status !== "pending"
        ? new Date().toISOString()
        : request.resolvedAt,
  };
  await writeFile(requestPath(id), JSON.stringify(updated, null, 2));
  return updated;
}

export async function listVerifications(
  filter?: { status?: string; sessionId?: string }
): Promise<VerificationRequest[]> {
  try {
    const files = await readdir(verificationDir());
    const jsonFiles = files.filter((f) => f.endsWith(".json"));
    const results = await Promise.all(
      jsonFiles.map((f) => getVerification(f.replace(".json", "")))
    );
    let list = results.filter((r): r is VerificationRequest => r !== null);
    if (filter?.status && filter.status !== "all") {
      list = list.filter((r) => r.status === filter.status);
    }
    if (filter?.sessionId) {
      list = list.filter((r) => r.sessionId === filter.sessionId);
    }
    return list;
  } catch {
    return [];
  }
}
