#!/bin/bash
# engine.299 Task 1 — PROD push over stage 4m (stage4m-e197.sha256). TWO files at HEAD d5266294:
#   utilities/citizenDialMap.js                 (graded form <Kind>-<Dial>-<Up|Down>-<S|M|L>; bare {} kinds stay history)
#   phase05-citizens/generateCitizensEvents.js  (admission first; a {} kind is written only graded, by the entry's own signed fact; else not written)
# Stage = PROD 4m pull (168/168 = stage4m-e197.sha256) + those two files. Codex: review 3 (docs/for-claude-review/2026-10-18-codex-engine299-task1-diff-review-3.md).
# Bench: SANDBOX 1004 @43, C112 on live-C111 state. Dry-run by default; `--go` pushes, bumps the pinned PROD web app, pull-back cmp.
set -euo pipefail
cd "$(dirname "$0")/prod-stage"
REPO=/root/GodWorld
FILES="utilities/citizenDialMap.js phase05-citizens/generateCitizensEvents.js"
echo "stage vs PROD 4m manifest (must differ in exactly the two files):"
python3 - <<'PY'
import hashlib,os
want=['phase05-citizens/generateCitizensEvents.js','utilities/citizenDialMap.js']
diff=[]
for line in open('/root/GodWorld/output/engine-sheet/stage4m-e197.sha256'):
    h,p=line.split()[0],line.split()[-1]; q=p.lstrip('./')
    if not os.path.exists(q): diff.append('MISSING '+q); continue
    if hashlib.sha256(open(q,'rb').read()).hexdigest()!=h: diff.append(q)
print('  differ:', sorted(diff))
assert sorted(diff)==want, 'stage is not PROD 4m + the two files — STOP'
PY
for F in $FILES; do cmp -s $F $REPO/$F && echo "  $F == repo HEAD copy" || { echo "  $F differs from the repo copy — STOP"; exit 1; }; done
grep -q 1hL59VnByrXfWdz6EKZZQ1ss8DH1PFfDT9vVDvmjqHY_pwLyTB_N1iKW5 .clasp.json && echo "  .clasp.json = PROD script" || { echo "  .clasp.json is not PROD — STOP"; exit 1; }
$REPO/node_modules/.bin/clasp-real deployments
if [ "${1:-}" != "--go" ]; then echo "DRY RUN — pass --go to push + bump the PROD web app"; exit 0; fi
CLAUDE_CTL=1 $REPO/node_modules/.bin/clasp push -f | grep -c "└─"
DEP=$(grep -o '"deploymentId": "[^"]*"' $REPO/.clasp.json | cut -d'"' -f4)
[ -n "$DEP" ] || { echo "no pinned deploymentId in the repo .clasp.json — STOP"; exit 1; }
$REPO/node_modules/.bin/clasp-real deployments | grep -q "$DEP" || { echo "pinned deployment $DEP not in the listing — STOP"; exit 1; }
echo "bumping the pinned PROD web app $DEP"
CLAUDE_CTL=1 $REPO/node_modules/.bin/clasp deploy -i "$DEP" -d "engine.299 Task 1: every event that fires moves a dial — graded tags, admission first (2 files over stage 4m) — bench 1004 @43 C112"
$REPO/node_modules/.bin/clasp-real deployments
echo "pull-back check:"; PB=$(mktemp -d) && cp .clasp.json "$PB/" && (cd "$PB" && $REPO/node_modules/.bin/clasp-real pull >/dev/null && for F in $FILES; do cmp $F $REPO/$F && echo "  PROD $F == repo HEAD"; done && find . -name '*.js' -o -name '*.json' | grep -v clasp | sort | xargs sha256sum > $REPO/output/engine-sheet/stage4n-e299.sha256 && wc -l < $REPO/output/engine-sheet/stage4n-e299.sha256)
