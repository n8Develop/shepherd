import { randomUUID } from "node:crypto";
import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { registerTools } from "./tools/index.js";

const PORT = parseInt(process.env.SHEPHERD_PORT || "3847", 10);

const server = new McpServer({
  name: "shepherd",
  version: "0.1.0",
});

registerTools(server);

const app = express();
app.use(express.json());

// Map of session ID -> transport for stateful connections
const transports = new Map<string, StreamableHTTPServerTransport>();

app.post("/mcp", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;

  if (sessionId && transports.has(sessionId)) {
    // Existing session — route to its transport
    const transport = transports.get(sessionId)!;
    await transport.handleRequest(req, res, req.body);
    return;
  }

  // New session — create transport
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
  });

  transport.onclose = () => {
    const sid = (transport as unknown as { sessionId?: string }).sessionId;
    if (sid) transports.delete(sid);
  };

  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);

  // Extract session ID from response headers and store
  const newSessionId = res.getHeader("mcp-session-id") as string | undefined;
  if (newSessionId) {
    transports.set(newSessionId, transport);
  }
});

app.get("/mcp", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  if (sessionId && transports.has(sessionId)) {
    const transport = transports.get(sessionId)!;
    await transport.handleRequest(req, res);
    return;
  }
  res.status(400).json({ error: "Missing or invalid session ID" });
});

app.delete("/mcp", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  if (sessionId && transports.has(sessionId)) {
    const transport = transports.get(sessionId)!;
    await transport.handleRequest(req, res);
    transports.delete(sessionId);
    return;
  }
  res.status(400).json({ error: "Missing or invalid session ID" });
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok", sessions: transports.size });
});

app.listen(PORT, () => {
  console.log(`Shepherd MCP server running on http://localhost:${PORT}`);
  console.log(`  MCP endpoint: POST http://localhost:${PORT}/mcp`);
  console.log(`  Health check: GET http://localhost:${PORT}/health`);
});
