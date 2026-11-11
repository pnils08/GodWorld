#!/usr/bin/env bash
# testReporterWrite.sh — run ONE reporter's write in a scratch folder and print the piece.
#
# Builder 2026-11-10: "make a test shell". Before this the only way to see what
# a change to the writer's instructions did was to wait for the 18:15 live run
# across every seat.
#
# What it does: copies that reporter's own stage files (angle, asks, packet,
# state) and the cycle's slices out of output/cron-compare into
# output/test-shell/<stamp>/, then runs the real write stage against the copy
# with --no-gate. The live folder, the sheet and the reporter's page are not
# written (GODWORLD_TEST_COMPARE_DIR: cron-desk-run.js, cron-desk-writer.js,
# cron-rhea-gate.js). It spends one writer model call.
#
# Usage:
#   scripts/testReporterWrite.sh <desk> <persona> [cycle] [live|light]
#   scripts/testReporterWrite.sh civic trevor-shimizu
#   scripts/testReporterWrite.sh culture noah-tan 115 light
# "light" is the lightest prompt (persona, packet, no-invention line, INTAKE footer; no rubric, no job
# description, no opening/closing form) — only the shell can ask for it; a scheduled run cannot.
set -euo pipefail

ROOT=/root/GodWorld
DESK="${1:?desk (civic, culture, sports, business, …)}"
PERSONA="${2:?persona slug (trevor-shimizu, noah-tan, …)}"
LIVE="$ROOT/output/cron-compare"
CYCLE="${3:-$(ls "$LIVE" | sed -n "s/^${DESK}_c\([0-9]\+\)_${PERSONA}_.*/\1/p" | sort -n | tail -1)}"
[ -n "$CYCLE" ] || { echo "no stage files for ${DESK}/${PERSONA} in output/cron-compare"; exit 1; }

VARIANT="${4:-live}"
[ "$VARIANT" = live ] || [ "$VARIANT" = light ] || { echo "variant must be live or light"; exit 1; }
STAMP="$(date +%Y%m%d-%H%M%S)-${PERSONA}-${VARIANT}"
SHELL_DIR="$ROOT/output/test-shell/$STAMP"
mkdir -p "$SHELL_DIR/samples" "$SHELL_DIR/staged" "$SHELL_DIR/flagged"

# the reporter's own stage files + anything keyed to this persona, and the cycle's slices
find "$LIVE" -maxdepth 1 -type f \( -name "${DESK}_c${CYCLE}_${PERSONA}_*" -o -name "${DESK}_c${CYCLE}_packet-v2_${PERSONA}*" \
  -o -name "*_slice_c${CYCLE}.*" -o -name "fanout-*.json" \) -newermt "-10 days" -exec cp -p {} "$SHELL_DIR/" \;
# stage files point at each other by repo-relative path; re-point the copies at the shell
for f in "$SHELL_DIR"/"${DESK}_c${CYCLE}_"*"${PERSONA}"*.json; do
  [ -f "$f" ] && sed -i "s#output/cron-compare/#output/test-shell/$STAMP/#g" "$f"
done
COPIED=$(ls "$SHELL_DIR" | wc -l)
echo "test shell: $SHELL_DIR (cycle $CYCLE, $COPIED files copied)"

cd "$ROOT"
set +e
GODWORLD_TEST_COMPARE_DIR="$SHELL_DIR" GODWORLD_TEST_PROMPT="$VARIANT" /usr/bin/node scripts/cron-desk-run.js \
  --stage=write --desk "$DESK" --persona "$PERSONA" --no-gate > "$SHELL_DIR/run.log" 2>&1
STATUS=$?
set -e
echo "write stage exit: $STATUS (log: $SHELL_DIR/run.log)"

PIECE=$(ls -t "$SHELL_DIR"/samples/*.md 2>/dev/null | head -1 || true)
if [ -z "$PIECE" ]; then
  echo "NO PIECE WRITTEN — last lines of the log:"
  tail -15 "$SHELL_DIR/run.log"
  exit 1
fi
echo "piece: $PIECE ($(wc -w < "$PIECE") words)"
echo "-----"
cat "$PIECE"
