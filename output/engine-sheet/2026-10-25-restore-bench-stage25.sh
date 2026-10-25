#!/bin/bash
# Restore SANDBOX 1004's script project to stage 25 (manifest stage24-e315-G3.sha256) after an engine.301 / engine.312 bench:
# pull the bench, lay the six files those benches change at their stage-25 copies (engine.301's two at e3266c44^, engine.312's
# four at 4826c757^ — each checked against the stage-25 manifest first), require the whole tree to equal the manifest, push,
# deploy, pull back, compare. (2026-10-25-push-e301-bench.sh e3266c44^ resets only engine.301's two files.)
#   bash output/engine-sheet/2026-10-25-restore-bench-stage25.sh [--dry-run]
set -euo pipefail
cd /root/GodWorld
CLASP=/root/GodWorld/node_modules/.bin/clasp
BENCH_ID=1gbJmGeDilxIhe25TC8SrSei89uJTEgVYgN2aOClEHHKJiykADzPVAIC2
BENCH_DEP=AKfycbxxCwKERRGb3Gk6SYg6T2nrGKf8NrKQ-pY-BOG5sdaKclEkf2jGqS3IBhgrs5IDdlmC
MAN=/root/GodWorld/output/engine-sheet/stage24-e315-G3.sha256
DRY=${1:-}
W=$(mktemp -d); mkdir -p "$W/stage" "$W/pullback"
( cd "$W/stage" && printf '{"scriptId":"%s","rootDir":""}' "$BENCH_ID" > .clasp.json && "$CLASP" pull >/dev/null )
lay() {   # lay <ref> <file>
  local want have; want=$(grep " \./$2\$" "$MAN" | cut -d' ' -f1); have=$(git show "$1:$2" | sha256sum | cut -d' ' -f1)
  [ "$want" = "$have" ] || { echo "$2 at $1 is not its stage-25 copy — stop"; exit 1; }
  git show "$1:$2" > "$W/stage/$2"
}
for f in phase02-world-state/applyCityDynamics.js phase09-digest/finalizeCycleState.js; do lay e3266c44^ "$f"; done
for f in phase07-evening-media/culturalLedger.js phase05-citizens/processAdvancementIntake.js phase07-evening-media/mediaRoomIntake.js phase01-config/godWorldEngine2.js; do lay 4826c757^ "$f"; done
( cd "$W/stage" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ) | diff -q - "$MAN" >/dev/null \
  || { echo "restored tree is not stage 25 — stop"; ( cd "$W/stage" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ) | diff - "$MAN" | head; exit 1; }
echo "stage 25 rebuilt from the bench + six files"
if [ "$DRY" = "--dry-run" ]; then echo "dry run: stopping before the push"; exit 0; fi
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" push --force | tail -1 )
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" deploy -i "$BENCH_DEP" -d "bench 1004 restored = stage 25 (PROD @162)" | tail -1 )
( cd "$W/pullback" && printf '{"scriptId":"%s","rootDir":""}' "$BENCH_ID" > .clasp.json && "$CLASP" pull >/dev/null )
( cd "$W/pullback" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ) | diff -q - "$MAN" >/dev/null \
  || { echo "PULL-BACK MISMATCH — bench is not stage 25"; exit 1; }
echo "bench code = stage 25: pull-back byte-identical to $(basename "$MAN")"
