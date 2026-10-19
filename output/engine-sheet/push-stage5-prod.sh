#!/bin/bash
# Stage 5 PROD push = PROD stage 4p (@147, 8acd5f30) + the engine.214 wave, ten files at 81bca5ba:
#   engine.214/287/288 stack (7): applyCityDynamics, applyInitiativeImplementationEffects, v3NeighborhoodWriter,
#     finalizeCycleState, engine94SheetContract, loadPreviousEvening, godWorldEngine2 (agy fold 81bca5ba in two of them)
#   engine.299 main-only (3): runNeighborhoodEngine (a7564342, 014f31bc), processAdvancementIntake + chaosCarsConfig (7acb6a25)
# Bench: SANDBOX 1004 @57 = this tree byte for byte (clasp pull --versionNumber 57), soak from BASELINE-1004-C112b.
# The fresh PROD pull must match stage4p-e299.sha256 (no drift); the built stage must match stage5-e214.sha256.
#   bash output/engine-sheet/push-stage5-prod.sh [--dry-run]
# Bumps the pinned PROD web-app deployment (repo .clasp.json deploymentId) after the push; PROD versions are at @147 of the 200 cap.
# AFTER the push (live sheet, separate, builder-approved): delete the five clusterAnchors_* World_Config rows (engine.214 Acceptance 6).
set -euo pipefail
cd /root/GodWorld
DRY=${1:-}
CLASP=/root/GodWorld/node_modules/.bin/clasp
PROD_ID=1hL59VnByrXfWdz6EKZZQ1ss8DH1PFfDT9vVDvmjqHY_pwLyTB_N1iKW5
OUT=/root/GodWorld/output/engine-sheet
SRC=81bca5ba
FILES="phase02-world-state/applyCityDynamics.js phase02-world-state/applyInitiativeImplementationEffects.js phase08-v3-chicago/v3NeighborhoodWriter.js phase09-digest/finalizeCycleState.js phase01-config/engine94SheetContract.js phase01-config/loadPreviousEvening.js phase01-config/godWorldEngine2.js phase05-citizens/runNeighborhoodEngine.js phase05-citizens/processAdvancementIntake.js utilities/chaosCarsConfig.js"
W=$(mktemp -d)
mkdir -p "$W/stage" "$W/pullback"
( cd "$W/stage" && printf '{"scriptId":"%s","rootDir":""}' "$PROD_ID" > .clasp.json && "$CLASP" pull >/dev/null )
( cd "$W/stage" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ) | diff -q - "$OUT/stage4p-e299.sha256" >/dev/null \
  || { echo "PROD drifted from stage 4p since the bench — stop"; exit 1; }
echo "fresh PROD pull = stage 4p (no drift)"
for f in $FILES; do git show "$SRC:$f" > "$W/stage/$f"; done
( cd "$W/stage" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ) | diff -q - "$OUT/stage5-e214.sha256" >/dev/null \
  || { echo "built stage does not match the benched stage 5 — stop"; exit 1; }
echo "stage = the benched stage 5 (@57), byte for byte (10 files over PROD)"
if [ "$DRY" = "--dry-run" ]; then echo "dry run: stopping before the push ($W/stage)"; exit 0; fi
DEP=$(grep -o '"deploymentId": "[^"]*"' /root/GodWorld/.clasp.json | cut -d'"' -f4)
[ -n "$DEP" ] || { echo "no pinned deploymentId in the repo .clasp.json — STOP"; exit 1; }
/root/GodWorld/node_modules/.bin/clasp-real deployments 2>/dev/null | grep -q "$DEP" || { echo "pinned deployment $DEP not in the listing — STOP"; exit 1; }
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" push --force | tail -1 )
# S325 class: the web app serves a pinned version — cut one after the push (as push-prod-4p.sh did → @147); the menu fire runs HEAD.
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" deploy -i "$DEP" -d "engine.214 wave = stage 5: stage 4p + 10 files at 81bca5ba (stack 214/287/288 + agy fold, engine.299 three) — bench 1004 @57" | tail -1 )
/root/GodWorld/node_modules/.bin/clasp-real deployments 2>/dev/null | grep "$DEP"
( cd "$W/pullback" && printf '{"scriptId":"%s","rootDir":""}' "$PROD_ID" > .clasp.json && "$CLASP" pull >/dev/null )
( cd "$W/pullback" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ) | diff -q - "$OUT/stage5-e214.sha256" >/dev/null \
  || { echo "PULL-BACK MISMATCH — PROD is not the benched stage"; exit 1; }
N=$(find "$W/pullback" -name '*.js' | wc -l)
echo "pull-back $N js + manifest byte-identical to stage 5"
echo "$(date -Iseconds) stage5 on PROD; pull-back $N js + manifest = stage5-e214.sha256" > "$OUT/push-stage5-prod.DONE"
