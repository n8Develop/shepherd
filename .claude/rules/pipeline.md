---
alwaysApply: true
---

# Pipeline Execution Protocol

## Task File Format

Every stage starts with Shepherd writing `tasks/<id>-task.md`:

```markdown
# Task: <id>
## Target Project
<absolute_path>

## Role
<role_name>

## Task
<what to do, in detail>

## Acceptance Criteria
- <criterion 1>
- <criterion 2>

## Previous Stage Output
<path to previous result file, or "None — first stage">

## Instructions
1. Read the target project's CLAUDE.md first and follow its conventions.
2. Complete the task using absolute paths to the target project.
3. Your final response is your deliverable — make it comprehensive.
```

## Verification Task Format

For Tracker verification, write `tasks/<id>-verify-task.md`:

```markdown
# Verification: <id>

## Deliverable
Read: tasks/<original-id>-result.md

## Target Project
<absolute_path>

## Acceptance Criteria
<same criteria from original task>

## Instructions
1. Read the deliverable file.
2. Check the target project state (git diff, new files).
3. Run verification commands (build, tests) in the target project.
4. Evaluate each criterion.
5. Your response must use the VERDICT format from your CLAUDE.md.
```

## Retry Protocol

When Tracker returns FAIL:
1. Read Tracker's specific feedback
2. Write a new task file: `tasks/<id>-attempt<N>-task.md`
3. Include original task + "PREVIOUS ATTEMPT FEEDBACK:" section with Tracker's feedback
4. Spawn the role again with the new task file
5. Max 3 total attempts. On third failure, set stage status to "escalated" and report to Mr. Dtabog with:
   - Original task
   - All attempt results
   - All Tracker feedback
   - Your assessment of why it's failing

## State Transitions

```
pending -> running    (when agent is spawned)
running -> verified   (when Tracker says PASS)
running -> running    (when Tracker says FAIL, retry available)
running -> escalated  (when max retries exhausted)
running -> failed     (when agent errors out / timeout)
```

Update state.json after EVERY transition. This is the source of truth for resume.

## AllowedTools Per Role

When writing runner scripts, use these --allowedTools values:

- **architect**: `Read,Glob,Grep,Bash,Write`
- **developer**: `Read,Write,Edit,Glob,Grep,Bash`
- **qa**: `Read,Write,Edit,Glob,Grep,Bash`
- **tracker**: `Read,Glob,Grep,Bash`

## Timeout

Default poll timeout: 600 seconds (10 minutes) per agent. If timeout is reached, set stage to "failed" with reason "timeout" and escalate.

## Compaction Safety

If context gets large, state.json has everything needed to resume. After compaction, re-read the active project's state.json before taking any action.
