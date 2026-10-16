#!/bin/bash
# engine.285 hazards 2–6 — PROD push over stage 4i (fe348e1d). SIX files:
#   phase10-persistence/persistenceExecutor.js  (6: append tail fixed outside the retry; 5: empty existing tab gets its headers)
#   utilities/writeIntents.js                   (5: reference comment)
#   phase05-citizens/applyBusinessDynamics.js   (2: identical copy on Business_Archive → remove only; removals bottom-up by row)
#   utilities/archiveCitizenExits.js            (3: identical snapshot on Citizen_Archive → remove only)
#   phase07-evening-media/mediaRoomIntake.js    (4: routing in blocks, marks per target; intake readers write then mark)
#   phase05-citizens/processAdvancementIntake.js (4: advancementLogBuffer_ takes a retry label)
# Stage = fresh PROD pull 2026-10-16 (== stage4i-e285.sha256, 168/168) + those files at HEAD. Bench: SANDBOX 1004 @37, C112 on live C111. (The @141 version text says @36 — written before the DialState fix; the pushed code is 0d4f2ca2 = @37.)
# Dry-run by default; `--go` pushes, bumps the pinned PROD web app, pull-back cmp.
set -euo pipefail
cd "$(dirname "$0")/prod-stage-2to6"
REPO=/root/GodWorld
FILES="phase10-persistence/persistenceExecutor.js utilities/writeIntents.js phase05-citizens/applyBusinessDynamics.js utilities/archiveCitizenExits.js phase07-evening-media/mediaRoomIntake.js phase05-citizens/processAdvancementIntake.js"
echo "stage vs PROD 4i manifest (must differ in exactly the six files):"
python3 - <<'PY'
import hashlib,os
want=sorted(['phase10-persistence/persistenceExecutor.js','utilities/writeIntents.js','phase05-citizens/applyBusinessDynamics.js','utilities/archiveCitizenExits.js','phase07-evening-media/mediaRoomIntake.js','phase05-citizens/processAdvancementIntake.js'])
diff=[]
for line in open('/root/GodWorld/output/engine-sheet/stage4i-e285.sha256'):
    h,p=line.split()[0],line.split()[-1]; q=p.lstrip('./')
    if not os.path.exists(q): diff.append('MISSING '+q); continue
    if hashlib.sha256(open(q,'rb').read()).hexdigest()!=h: diff.append(q)
print('  differ:', sorted(diff))
assert sorted(diff)==want, 'stage is not PROD 4i + the six files — STOP'
PY
for F in $FILES; do cmp -s $F $REPO/$F && echo "  $F == repo HEAD copy" || { echo "  $F differs from the repo copy — STOP"; exit 1; }; done
grep -q 1hL59VnByrXfWdz6EKZZQ1ss8DH1PFfDT9vVDvmjqHY_pwLyTB_N1iKW5 .clasp.json && echo "  .clasp.json = PROD script" || { echo "  .clasp.json is not PROD — STOP"; exit 1; }
$REPO/node_modules/.bin/clasp-real deployments
if [ "${1:-}" != "--go" ]; then echo "DRY RUN — pass --go to push + bump the PROD web app"; exit 0; fi
CLAUDE_CTL=1 $REPO/node_modules/.bin/clasp push -f | grep -c "└─"
# The live web app is the deploymentId pinned in the repo .clasp.json — never the first non-HEAD row.
DEP=$(grep -o '"deploymentId": "[^"]*"' $REPO/.clasp.json | cut -d'"' -f4)
[ -n "$DEP" ] || { echo "no pinned deploymentId in the repo .clasp.json — STOP"; exit 1; }
$REPO/node_modules/.bin/clasp-real deployments | grep -q "$DEP" || { echo "pinned deployment $DEP not in the listing — STOP"; exit 1; }
echo "bumping the pinned PROD web app $DEP"
CLAUDE_CTL=1 $REPO/node_modules/.bin/clasp deploy -i "$DEP" -d "engine.285 hazards 2-6: kill-safe archives, routing, ensure, append retry (6 files over stage 4i) — bench 1004 @37 C112"
$REPO/node_modules/.bin/clasp-real deployments
echo "pull-back check:"; PB=$(mktemp -d) && cp .clasp.json "$PB/" && (cd "$PB" && $REPO/node_modules/.bin/clasp-real pull >/dev/null && for F in $FILES; do cmp $F $REPO/$F && echo "  PROD $F == repo HEAD"; done)
