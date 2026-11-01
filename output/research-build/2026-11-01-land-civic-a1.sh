#!/bin/bash
# civic.47 A1 landing: copy the 17 reviewed persona files from output/codex/civic-a1/ over the live .claude/agents files
# (same layout the runner loads — no new files), then run the civic suites. Dry run lists the copies only.
#   bash output/research-build/2026-11-01-land-civic-a1.sh [--dry-run]
set -euo pipefail
cd /root/GodWorld
SRC=output/codex/civic-a1; DST=.claude/agents; DRY=${1:-}
n=0
while IFS= read -r f; do
  rel=${f#$SRC/}
  [ -f "$DST/$rel" ] || { echo "NEW FILE not in the live layout: $rel — stop"; exit 1; }
  n=$((n+1)); echo "copy $rel ($(wc -c < "$DST/$rel") → $(wc -c < "$f") bytes)"
  [ "$DRY" = "--dry-run" ] || cp "$f" "$DST/$rel"
done < <(find $SRC -type f -name '*.md' | sort)
[ $n -eq 17 ] || { echo "expected 17 files, found $n — stop"; exit 1; }
[ "$DRY" = "--dry-run" ] && { echo "dry run: $n copies listed"; exit 0; }
grep -rln 'GAP → A2\|civic\.15 contract\|Phase 27\.3\|Approval Rating:\|Seat status:\|Turf:' $DST/civic-office-mayor $DST/civic-office-council-seat $DST/civic-office-council-d? $DST/civic-office-police-chief && { echo "label or stale fact left in a live file — stop"; exit 1; } || true
for t in civicSeat cron-civic-game buildCivicOfficeSlice cron-civic-week-carry civicAutonomyBaseline; do
  out=$(timeout 180 node scripts/$t.test.js 2>&1 | grep -i "passed\|all checks\|^ok \|: ok" | tail -1); echo "$t: $out"
  echo "$out" | grep -qi 'ok\|pass' || { echo "suite $t did not pass — stop (files copied; revert with git checkout -- .claude/agents)"; exit 2; }
done
echo "landed $n files; commit with CLAUDE_CTL=1"
