# Shepherd

## Current Priority

**v0.2 complete.** Phases 0–8 done. Full bidirectional loop: Desktop dispatches, verifies, and sends feedback.

## Project Overview

Claude Code plugin + MCP server that enables Claude Desktop to orchestrate CLI agent teams with visual verification. Desktop initiates plans and visually verifies results. CLI does the work. Filesystem-based coordination via `~/.shepherd/`.

**Tech Stack:** TypeScript, Node.js, Express, @modelcontextprotocol/sdk, Zod, Vitest
**Platform:** Windows 11 + Git Bash, Node.js 20+

## Architecture

### Three Layers

```
Claude Desktop (human + vision) → initiates, verifies
  ↓ MCP (HTTP, localhost:3848)
Shepherd MCP Server (Node.js) → dispatches, reads state, manages queue
  ↓ child_process.spawn
Claude Code CLI Lead → Agent Team Teammates
```

### Key Patterns
- All coordination via filesystem (`~/.shepherd/`) — no database, no sockets
- Hooks are bash scripts that read JSON with `jq` — keep data simple
- MCP transport is HTTP — avoids Windows stdio mangling
- Agent teams filesystem reading isolated in `src/cli/teams.ts` — single module to update if Anthropic changes format
- All file paths normalized to forward slashes before writing JSON

### Folder Structure
```
src/
├── server.ts              # Express + MCP server entry point
├── tools/                 # MCP tool implementations
│   ├── index.ts           # Tool registration (5 tools: dispatch-plan, get-team-status, get-verification-queue, submit-verification, send-feedback)
│   └── dispatch-plan.ts   # Spawn CLI agent team
├── queue/                 # Filesystem CRUD layer
│   ├── verification.ts
│   ├── feedback.ts
│   └── sessions.ts
└── cli/
    ├── spawn.ts           # Claude CLI subprocess management
    └── teams.ts           # Agent teams filesystem reader
hooks/                     # Plugin hooks (bash scripts)
skills/                    # Plugin skills (CLI-side)
```

## Conventions

- Tool input schemas defined with Zod — colocated with tool implementation
- Queue operations are pure functions: `(path, data) → Promise<result>` — no singletons
- Session IDs are UUIDs. Verification request IDs are UUIDs.
- JSON files use 2-space indent
- Hook scripts fail open (exit 0) when dependencies missing — never block Claude silently
- CLI spawn uses direct exe path via `where claude` — no shell needed (see decisions.md)

## Key Commands

```bash
# Build
npm run build

# Test
npm test

# Run dev server
npm run dev

# Run production
npm start

# Lint
npm run lint

# Validate plugin structure
claude plugin validate .
```

## Development Status

### Completed (v0.1 MVP)
- [x] Workspace scaffolding (Phase 0)
- [x] MCP server skeleton (Phase 1) — Express + StreamableHTTP on configurable port
- [x] Filesystem queue layer (Phase 2) — sessions, verification, feedback CRUD with 19 tests
- [x] dispatch-plan tool (Phase 3) — resolves claude.exe, spawns directly, logs to session
- [x] Status + queue tools (Phase 4) — get-team-status reads sessions + agent teams fs, get-verification-queue reads queue
- [x] request-verification skill (Phase 5) — CLI-side skill writes to verification queue
- [x] TaskCompleted hook (Phase 6) — blocks completion on pending verifications, fails open without jq
- [x] Integration + README (Phase 7) — .mcp.json, README with install/setup/usage docs

### Completed (v0.2 Feedback Loop)
- [x] submit-verification tool (Phase 8) — Desktop approves/rejects verifications via MCP
- [x] send-feedback tool (Phase 8) — Desktop sends corrections to CLI teammates
- [x] TeammateIdle hook (Phase 8) — relays feedback from Desktop when teammate goes idle

### Next
- [ ] End-to-end test of full bidirectional loop
- [ ] MCP resources (live task list) — deferred

## Compaction Policy

When compacting, always preserve: modified file paths, test/validation commands, current task context, and which phase is in progress.

## Verification Requirement

Every implementation must include verification — tests to run, expected output, or a command to confirm the result works. Never consider a task complete without defining how to verify success.
