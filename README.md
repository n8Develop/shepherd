# Shepherd

Claude Code plugin that enables Claude Desktop to orchestrate CLI agent teams with visual verification.

Desktop is the initiator and verifier. CLI is the workforce. Filesystem is the coordination layer.

## Architecture

```
Claude Desktop (human + vision)
  │  initiates plans, visually verifies results
  │  connected via MCP (HTTP, localhost)
  ▼
Shepherd MCP Server (Node.js)
  │  dispatches to CLI, reads team state, manages verification queue
  ▼
Claude Code CLI Lead → Agent Team Teammates
     coordinate, code, test, build
```

## Install

```bash
# Clone
git clone https://github.com/n8Develop/shepherd.git
cd shepherd

# Install dependencies
npm install

# Build
npm run build

# Install as Claude Code plugin
claude plugins install .
```

### System Dependencies

- **Node.js 20+**
- **jq** — required by hook scripts for JSON parsing
  - Windows: `scoop install jq` or `choco install jq`
  - macOS: `brew install jq`
  - Linux: `apt install jq` or `dnf install jq`
  - Hooks fail open (exit 0) if `jq` is missing — they won't silently block Claude
- **Claude CLI** on PATH

## Desktop Setup

Add the Shepherd MCP server to Claude Desktop's config (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "shepherd": {
      "type": "http",
      "url": "http://localhost:3848/mcp"
    }
  }
}
```

Start the server before using Desktop:

```bash
npm start
# or with a custom port:
SHEPHERD_PORT=3848 npm start
```

## MCP Tools

### dispatch-plan

Spawn a Claude Code CLI agent team with a plan.

```
Input:
  plan: string         — The plan to dispatch
  projectDir: string   — Absolute path to the project directory
  teamName?: string    — Optional team name

Output:
  sessionId, status, teamName, projectDir, startedAt
```

### get-team-status

Check the status of a dispatched agent team session.

```
Input:
  sessionId: string    — Session ID from dispatch-plan

Output:
  session metadata, CLI process state, task list, pending verification count
```

### get-verification-queue

List visual verification requests from teammates.

```
Input:
  status?: "pending" | "approved" | "rejected" | "all"  — Filter (default: "pending")
  sessionId?: string   — Filter by session

Output:
  count, queue (array of verification request objects)
```

## Verification Loop

1. CLI teammate produces visual output (rendered page, built UI, image)
2. Teammate calls `/shepherd:request-verification` — writes request to `~/.shepherd/verification-queue/`
3. Teammate tries to mark task complete
4. `TaskCompleted` hook fires → finds pending verification → blocks completion (exit 2)
5. Human prompts Desktop: "check the verification queue"
6. Desktop calls `get-verification-queue` → sees pending request
7. Desktop visually evaluates the artifact
8. Verification resolved (v0.2: via `submit-verification` tool; v0.1: edit the JSON manually)
9. Teammate retries → hook allows completion (exit 0)

## Shared State

All coordination via `~/.shepherd/`:

```
~/.shepherd/
├── config.json                          # Global config
├── sessions/{session-id}/
│   ├── meta.json                        # Session metadata
│   └── log.jsonl                        # CLI output log
├── verification-queue/{uuid}.json       # Verification requests
└── feedback/{uuid}.json                 # Desktop → CLI feedback (v0.2)
```

Override the data directory with `SHEPHERD_DATA_DIR` env var.

## Development

```bash
npm run dev          # Watch mode with tsx
npm test             # Run tests
npm run test:watch   # Watch tests
npm run build        # Compile TypeScript
npm run lint         # ESLint
```

## v0.2 Roadmap

- `submit-verification` MCP tool — approve/reject from Desktop
- `send-feedback` MCP tool — send corrections to CLI
- `TeammateIdle` hook — relay Desktop feedback to teammates
- MCP resources — live task list subscription

## License

MIT
