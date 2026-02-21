#!/usr/bin/env bash
set -euo pipefail

# Shepherd TaskCompleted Hook
# Gates task completion until Desktop has verified all pending visual verification requests.
#
# Test: Place pending verification, pipe task JSON, check exit code
#   mkdir -p ~/.shepherd/verification-queue
#   echo '{"status":"pending","taskId":"test-123"}' > ~/.shepherd/verification-queue/test-123.json
#   echo '{"taskId":"test-123"}' | bash hooks/task-completed.sh  → exit 2
#
#   echo '{"status":"approved","taskId":"test-123"}' > ~/.shepherd/verification-queue/test-123.json
#   echo '{"taskId":"test-123"}' | bash hooks/task-completed.sh  → exit 0

# Consume stdin (task completion JSON — not used by this hook, but must be read)
cat > /dev/null

# Check for jq — fail open if missing
if ! command -v jq &> /dev/null; then
  echo "Shepherd: Warning — jq not found, skipping verification gate." >&2
  exit 0
fi

# Resolve data directory
data_dir="${SHEPHERD_DATA_DIR:-$HOME/.shepherd}"
queue_dir="${data_dir}/verification-queue"

# No queue directory — nothing pending
if [[ ! -d "$queue_dir" ]]; then
  exit 0
fi

# Count pending verifications
pending_count=0

for file in "$queue_dir"/*.json; do
  # Handle no-match glob (empty directory)
  [[ -e "$file" ]] || continue

  # Parse status, skip malformed files
  status=$(jq -r '.status // empty' "$file" 2>/dev/null) || continue

  if [[ "$status" == "pending" ]]; then
    pending_count=$((pending_count + 1))
  fi
done

if [[ $pending_count -gt 0 ]]; then
  echo "Shepherd: Blocked — ${pending_count} pending verification request(s). Desktop must verify before this task can complete." >&2
  exit 2
fi

exit 0
