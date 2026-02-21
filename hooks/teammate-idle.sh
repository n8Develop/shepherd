#!/usr/bin/env bash
set -euo pipefail

# Shepherd TeammateIdle Hook
# Relays Desktop feedback to CLI teammates when they go idle.
# Feedback files are NOT deleted after delivery — teammates may need to re-read.
#
# Test: Place feedback file, pipe idle JSON, check stdout
#   mkdir -p ~/.shepherd/feedback
#   echo '{"verificationId":"v-001","content":"Button color should be darker"}' > ~/.shepherd/feedback/v-001.json
#   echo '{}' | bash hooks/teammate-idle.sh  → prints feedback line
#
#   rm ~/.shepherd/feedback/v-001.json
#   echo '{}' | bash hooks/teammate-idle.sh  → silent exit 0

# Consume stdin (idle event JSON — not used by this hook, but must be read)
cat > /dev/null

# Check for jq — fail open if missing
if ! command -v jq &> /dev/null; then
  echo "Shepherd: Warning — jq not found, skipping feedback relay." >&2
  exit 0
fi

# Resolve data directory
data_dir="${SHEPHERD_DATA_DIR:-$HOME/.shepherd}"
feedback_dir="${data_dir}/feedback"

# No feedback directory — nothing to relay
if [[ ! -d "$feedback_dir" ]]; then
  exit 0
fi

# Relay each feedback file to stdout
for file in "$feedback_dir"/*.json; do
  # Handle no-match glob (empty directory)
  [[ -e "$file" ]] || continue

  # Parse fields, skip malformed files
  verification_id=$(jq -r '.verificationId // empty' "$file" 2>/dev/null) || continue
  content=$(jq -r '.content // empty' "$file" 2>/dev/null) || continue

  # Skip if missing required fields
  [[ -n "$verification_id" && -n "$content" ]] || continue

  echo "Shepherd feedback (from verification ${verification_id}): ${content}"
done

exit 0
