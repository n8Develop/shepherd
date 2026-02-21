---
paths:
  - "src/**"
  - "hooks/**"
  - "skills/**"
---

# Shepherd Plugin Conventions

When working with Shepherd source code:

- All filesystem paths normalize to forward slashes before writing to JSON — never write backslashes to `~/.shepherd/` data files
- Queue operations (`src/queue/`) are pure functions: `(basePath, data) → Promise<result>` — no module-level state, no singletons
- Tool input schemas use Zod and live in the same file as the tool implementation — not a separate schemas file
- Hook scripts (`hooks/`) must fail open: check for `jq` availability, exit 0 with stderr warning if missing
- `child_process.spawn` always uses `shell: true` — Claude CLI is a shim on Windows
- MCP transport is HTTP only — never stdio (Windows mangling issues)
- `${CLAUDE_PLUGIN_ROOT}` resolves to the plugin install directory in hook commands — use it for paths to hook scripts
- Agent teams filesystem format is undocumented and may change — all reads go through `src/cli/teams.ts`, nowhere else
