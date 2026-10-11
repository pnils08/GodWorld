#!/bin/bash
# Stage 2 isolated PROD push — builder runs:  ! bash output/engine-sheet/push-stage3-prod.sh
#   (add --dry-run to build + verify the stage and stop before the push)
# Stage 3 = stage 2 (PROD 63754ca8 + engine.203d + Open Court Week + engine.193 b) + engine.194 (game-week
# mood = the week's result vs the franchise's own expectation). Bench 1004 @22: C111 + C112 clean
# (readback: output/engine-sheet/2026-10-11-engine203d-bench-readback.md §Stage 3). Choose ONE of stage 2 / stage 3.
# Self-contained: needs only the repo. Fresh PROD pull is checked against prod-63754ca8.sha256
# (no drift), the six engine files come from git ae9278aa, the contract gets the three seed rows
# from ae9278aa, and the built stage must match stage3.sha256 (the benched package) byte for byte.
set -euo pipefail
cd /root/GodWorld
DRY=${1:-}
CLASP=/root/GodWorld/node_modules/.bin/clasp
PROD_ID=1hL59VnByrXfWdz6EKZZQ1ss8DH1PFfDT9vVDvmjqHY_pwLyTB_N1iKW5
OUT=/root/GodWorld/output/engine-sheet
W=$(mktemp -d)
mkdir -p "$W/stage" "$W/pullback"
( cd "$W/stage" && printf '{"scriptId":"%s","rootDir":""}' "$PROD_ID" > .clasp.json && "$CLASP" pull >/dev/null )
( cd "$W/stage" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ) | diff -q - "$OUT/prod-63754ca8.sha256" >/dev/null \
  || { echo "PROD drifted from 63754ca8 since the stage was benched — stop"; exit 1; }
echo "fresh PROD pull = 63754ca8 (no drift)"
for f in phase02-world-state/applySportsSeason.js utilities/sportsWeekRecord.js phase05-citizens/generateCitizensEvents.js \
         phase02-world-state/getSimHoliday.js phase09-digest/applyCompressionDigestSummary.js phase05-citizens/applyBusinessDynamics.js; do
  git show ae9278aa:$f > "$W/stage/$f"
done
git show ae9278aa:phase01-config/engine94SheetContract.js > "$W/contract.ae9278aa.js"
python3 - "$W/stage/phase01-config/engine94SheetContract.js" "$W/contract.ae9278aa.js" <<'PY'
import sys
p, src = sys.argv[1], open(sys.argv[2]).read()
s = open(p).read()
floor = "  ['franchiseWeightFloor', 0.1, 'engine.209 the least any franchise can weigh once it has played (the Oaks start at 0.35)', 0, 1, false]\n];"
i = src.index("  ['franchiseWeightFloor'"); j = src.index("];", i) + 2
assert s.count(floor) == 1; s = s.replace(floor, src[i:j])
ship = "  ['chaosShipChancePerCycle', 0.18,"
a = src.index("  ['bizSettleRate'"); b = src.index(ship)
assert s.count(ship) == 1; s = s.replace(ship, src[a:b] + ship)
open(p, 'w').write(s)
PY
( cd "$W/stage" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ) | diff -q - "$OUT/stage3.sha256" >/dev/null \
  || { echo "built stage does not match the benched stage 3 — stop"; exit 1; }
echo "stage = the benched stage 3, byte for byte (7 files over PROD)"
if [ "$DRY" = "--dry-run" ]; then echo "dry run: stopping before the push ($W/stage)"; exit 0; fi
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" push --force | tail -1 )
( cd "$W/pullback" && printf '{"scriptId":"%s","rootDir":""}' "$PROD_ID" > .clasp.json && "$CLASP" pull >/dev/null )
( cd "$W/pullback" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ) | diff -q - "$OUT/stage3.sha256" >/dev/null \
  || { echo "PULL-BACK MISMATCH — PROD is not the benched stage"; exit 1; }
N=$(find "$W/pullback" -name '*.js' | wc -l)
echo "pull-back $N js + manifest byte-identical to stage 3"
echo "$(date -Iseconds) stage3 on PROD; pull-back $N js + manifest = stage3.sha256" > "$OUT/push-stage3-prod.DONE"
