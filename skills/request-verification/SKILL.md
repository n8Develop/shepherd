---
name: request-verification
description: Flag visual output for verification by Claude Desktop. Use when you produce a file, page, or artifact that needs human or Desktop visual review before the task can be marked complete.
---

# Request Verification

You are requesting visual verification from Claude Desktop via the Shepherd verification queue.

Follow these steps exactly.

## 1. Determine verification details

From the user's invocation and current context, gather:

- **description**: What to verify. Use the skill argument text. If empty, ask.
- **artifacts**: Files or URLs to check. Infer from context (files you just created/modified, dev server URLs). If ambiguous, ask the user which artifacts need verification.
- **taskId**: The current task ID if you have one. Default: `"unknown"`.
- **sessionId**: Read from `$CLAUDE_SESSION_ID` if set. Default: `"unknown"`.
- **requestedBy**: Use `"teammate"` unless you know a more specific name.

## 2. Generate a UUID

Run one of these (first that works):

```bash
UUID=$(uuidgen 2>/dev/null || cat /proc/sys/kernel/random/uuid 2>/dev/null || date +%s%N)
```

## 3. Create the queue directory

```bash
mkdir -p ~/.shepherd/verification-queue
```

## 4. Write the verification request

Build the artifacts array from what you gathered in step 1. Each artifact is either:
- `{ "type": "file", "path": "/absolute/path" }` — for local files
- `{ "type": "url", "url": "http://..." }` — for URLs

All file paths must be absolute and use forward slashes.

Write the JSON file using a heredoc. Replace all placeholder values with actual values from steps 1-2.

```bash
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

cat > ~/.shepherd/verification-queue/${UUID}.json << ENDJSON
{
  "id": "${UUID}",
  "sessionId": "${SESSION_ID}",
  "taskId": "${TASK_ID}",
  "requestedBy": "${REQUESTED_BY}",
  "requestedAt": "${TIMESTAMP}",
  "type": "visual",
  "description": "${DESCRIPTION}",
  "artifacts": [
    ${ARTIFACTS}
  ],
  "status": "pending",
  "resolution": null,
  "resolvedAt": null,
  "feedback": null
}
ENDJSON
```

Construct the `ARTIFACTS` variable by joining artifact objects with commas. Example for two artifacts:

```bash
ARTIFACTS='{ "type": "file", "path": "/c/Users/User/project/output.png" },
    { "type": "url", "url": "http://localhost:5173/" }'
```

## 5. Verify and report

After writing, confirm the file exists:

```bash
cat ~/.shepherd/verification-queue/${UUID}.json
```

Then tell the user:

> Verification request `{UUID}` written to `~/.shepherd/verification-queue/{UUID}.json`.
> Claude Desktop will pick this up for visual review.
> **Do not mark this task as complete until Desktop resolves the verification request.**

## Important

- Always create the queue directory before writing. It may not exist yet.
- Escape any double quotes in the description string.
- This runs in Git Bash on Windows. Use bash-compatible commands only.
- If you cannot determine any artifacts to verify, ask the user — do not write an empty artifacts array.
