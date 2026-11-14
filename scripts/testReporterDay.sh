#!/usr/bin/env bash
# testReporterDay.sh — run ONE reporter's whole day (angle -> report -> write) in a scratch folder.
#
# Builder 2026-11-14: "Go" (pipeline.111, the build that is owed, step 1). codex-rb wrote the runner;
# research-build added the variants. The seat's saved fanout assignment is handed to each real
# cron-desk-run.js stage with --no-gate; everything lands in output/test-shell/<stamp>/. No sheet row,
# no page line, no interview recorded on a citizen. Run it under the write guard (NODE_OPTIONS is
# passed through untouched).
#
# Usage:
#   scripts/testReporterDay.sh <desk> <persona> [cycle] [today|free-rows|free-week]
#   today      what the scheduled day does: the assignment, the approach, today's writer prompt
#   free-rows  nothing assigned: the seat sees its own beat record and who it can call, picks or passes;
#              the light writer prompt
#   free-week  nothing assigned: the seat sees the city's week and who it can call, picks or passes;
#              the light writer prompt
# The free variants exist only here: cron-desk-run.js reads GODWORLD_TEST_ANGLE only with the test
# folder set. A boot-file swap, when wanted, comes from the caller's own preload (BOOT_SWAP).
set -euo pipefail

ROOT=/root/GodWorld
LIVE="$ROOT/output/cron-compare"
DESK="${1:?desk (civic, culture, sports, business, …)}"
PERSONA="${2:?persona slug (for example lila-mezran)}"
REQUESTED_CYCLE="${3:-}"
VARIANT="${4:-today}"
case "$VARIANT" in today|free-rows|free-week) ;; *) echo "variant must be today, free-rows or free-week"; exit 2 ;; esac
[[ "$DESK" =~ ^[a-z0-9][a-z0-9-]*$ ]] || { echo "invalid desk slug: $DESK"; exit 2; }
[[ "$PERSONA" =~ ^[a-z0-9][a-z0-9-]{0,23}$ ]] || { echo "invalid persona slug: $PERSONA"; exit 2; }

ASSIGNMENT_SOURCE="$(/usr/bin/node - "$LIVE" "$DESK" "$PERSONA" "$REQUESTED_CYCLE" <<'NODE'
const fs = require('fs');
const path = require('path');
const [dir, desk, persona, requestedCycle] = process.argv.slice(2);
const files = fs.readdirSync(dir).filter(f => /^fanout-\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort().reverse();
for (const file of files) {
  let fanout;
  try { fanout = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')); } catch (_) { continue; }
  if (requestedCycle && String(fanout.cycle) !== String(requestedCycle)) continue;
  const assignment = (fanout.assignments || []).find(a => a && a.desk === desk && a.persona === persona);
  if (!assignment) continue;
  const checked = require('./scripts/newsroomWakePackages').gateAssignments([assignment]);
  if (!checked.eligible.length) continue;
  process.stdout.write(JSON.stringify({ file, date: fanout.date, cycle: fanout.cycle, assignment: checked.eligible[0] }));
  process.exit(0);
}
console.error('no saved fanout assignment found for ' + desk + '/' + persona + (requestedCycle ? ' at c' + requestedCycle : ''));
process.exit(1);
NODE
)"

FANOUT_FILE="$(/usr/bin/node -e 'process.stdout.write(JSON.parse(process.argv[1]).file)' "$ASSIGNMENT_SOURCE")"
DATE="$(/usr/bin/node -e 'process.stdout.write(JSON.parse(process.argv[1]).date)' "$ASSIGNMENT_SOURCE")"
CYCLE="$(/usr/bin/node -e 'process.stdout.write(String(JSON.parse(process.argv[1]).cycle))' "$ASSIGNMENT_SOURCE")"
CONTRACT="$(/usr/bin/node -e 'process.stdout.write(String(JSON.parse(process.argv[1]).assignment.packetContract || ""))' "$ASSIGNMENT_SOURCE")"
STAMP="$(date +%Y%m%d-%H%M%S)-${PERSONA}-day-${VARIANT}-$$"
SHELL_DIR="$ROOT/output/test-shell/$STAMP"
TAG="day-$(date +%Y%m%d%H%M%S)-$$"
mkdir -p "$SHELL_DIR/samples" "$SHELL_DIR/staged" "$SHELL_DIR/flagged"

# Keep the source rota and all cycle slices the angle stage can read. The reporter's
# angle/packet/state files are deliberately excluded: this run produces them.
cp -p "$LIVE/$FANOUT_FILE" "$SHELL_DIR/"
find "$LIVE" -maxdepth 1 -type f -name "*_slice_c${CYCLE}.*" -exec cp -p {} "$SHELL_DIR/" \;
/usr/bin/node - "$ASSIGNMENT_SOURCE" "$SHELL_DIR/assignment.json" <<'NODE'
const fs = require('fs');
const data = JSON.parse(process.argv[2]);
fs.writeFileSync(process.argv[3], JSON.stringify(data.assignment, null, 2) + '\n');
NODE

echo "test shell: $SHELL_DIR (fanout $DATE, cycle $CYCLE, $DESK/$PERSONA, $VARIANT)"
cd "$ROOT"
PACKET_STEM=""
[ -z "$CONTRACT" ] || PACKET_STEM="packet-${CONTRACT}_"
STEM="${DESK}_c${CYCLE}_${PERSONA}_${PACKET_STEM}benchmark-${TAG}_"
run_stage() {
  local stage="$1" artifact="$2" log="$SHELL_DIR/$1.log" status artifact_missing=0
  local angle_mode="" prompt_mode=""
  if [ "$VARIANT" != today ]; then angle_mode="$VARIANT"; prompt_mode=light; fi
  set +e
  GODWORLD_TEST_COMPARE_DIR="$SHELL_DIR" GODWORLD_TEST_ANGLE="$angle_mode" GODWORLD_TEST_PROMPT="$prompt_mode" \
    /usr/bin/node scripts/cron-desk-run.js \
    --stage="$stage" --desk "$DESK" --persona "$PERSONA" --cycle "$CYCLE" \
    --evaluate-package "$PERSONA" --evaluation-tag "$TAG" \
    --test-assignment "$SHELL_DIR/assignment.json" --no-gate >"$log" 2>&1
  status=$?
  set -e
  if grep -Fq "$PERSONA sits the day out" "$log"; then
    echo "PASS: $PERSONA sits the day out at $stage (cycle $CYCLE)."
    tail -8 "$log"
    exit 0
  fi
  if [ "$artifact" = sample ]; then
    compgen -G "$SHELL_DIR/samples/${STEM}"'*.sample.md' >/dev/null || artifact_missing=1
  elif [ ! -f "$SHELL_DIR/$artifact" ]; then
    artifact_missing=1
  fi
  if [ "$status" -ne 0 ] || [ "$artifact_missing" -ne 0 ]; then
    echo "${stage} stage failed or left no artifact (exit $status): $log"
    tail -20 "$log"
    exit 1
  fi
  echo "$stage stage: ran ($log)"
  if grep -Fq "$PERSONA passes the day" "$log"; then
    echo "----- $PERSONA passes the day -----"
    grep -F "$PERSONA passes the day" "$log" | tail -1
    exit 0
  fi
}

run_stage angle "${STEM}angle.json"
run_stage report "${STEM}packet.json"
run_stage write sample

echo '----- angle read -----'
/usr/bin/node - "$SHELL_DIR/${STEM}angle.json" <<'NODE'
const a = JSON.parse(require('fs').readFileSync(process.argv[2], 'utf8'));
console.log(a.angleRead && a.angleRead.text || '(no angle text)');
NODE
echo '----- asks and answers -----'
/usr/bin/node - "$SHELL_DIR/${STEM}asks.json" "$SHELL_DIR/${STEM}packet.json" <<'NODE'
const fs = require('fs');
const asks = fs.existsSync(process.argv[2]) ? JSON.parse(fs.readFileSync(process.argv[2], 'utf8')) : [];
const packet = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
console.log(JSON.stringify(asks.map(a => ({ pop: a.pop, ask: a.ask, record: a.record })), null, 2));
console.log(JSON.stringify(packet.quotes || [], null, 2));
NODE
PIECE="$(ls -t "$SHELL_DIR/samples"/*.sample.md 2>/dev/null | head -1 || true)"
[ -n "$PIECE" ] || { echo 'NO PIECE WRITTEN — write log tail:'; tail -20 "$SHELL_DIR/write.log"; exit 1; }
echo "----- piece: $PIECE ($(wc -w < "$PIECE") words) -----"
cat "$PIECE"
