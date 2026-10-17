#!/bin/bash
# engine.197 + engine.296 fix — PROD push over stage 4l (stage4l-e296.sha256). TWO files:
#   utilities/compressLifeHistory.js             (113e78aa: a LifeHistory line stamped past the current Cycle never folds or moves DialState.folded)
#   phase07-evening-media/buildEveningFamous.js  (01ea836f: a legend is MLB-origin AND retired OR RoleType names a legend — Darrin Davis)
# Stage = stage 4l (== stage4l-e296.sha256 168/168) + those two files at HEAD. Codex SHIP: docs/for-claude-review/2026-10-17-codex-dial-fixes-review.md
# Bench: SANDBOX 1004 @40, C112 on live C111.
# Dry-run by default; `--go` pushes, bumps the pinned PROD web app, pull-back cmp.
set -euo pipefail
cd "$(dirname "$0")/prod-stage"
REPO=/root/GodWorld
FILES="utilities/compressLifeHistory.js phase07-evening-media/buildEveningFamous.js"
echo "stage vs PROD 4l manifest (must differ in exactly the two files):"
python3 - <<'PY'
import hashlib,os
want=['phase07-evening-media/buildEveningFamous.js','utilities/compressLifeHistory.js']
diff=[]
for line in open('/root/GodWorld/output/engine-sheet/stage4l-e296.sha256'):
    h,p=line.split()[0],line.split()[-1]; q=p.lstrip('./')
    if not os.path.exists(q): diff.append('MISSING '+q); continue
    if hashlib.sha256(open(q,'rb').read()).hexdigest()!=h: diff.append(q)
print('  differ:', sorted(diff))
assert sorted(diff)==want, 'stage is not PROD 4l + the two files — STOP'
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
CLAUDE_CTL=1 $REPO/node_modules/.bin/clasp deploy -i "$DEP" -d "engine.197 future-stamp guard + engine.296 Davis legend predicate (2 files over stage 4l) — bench 1004 @40 C112"
$REPO/node_modules/.bin/clasp-real deployments
echo "pull-back check:"; PB=$(mktemp -d) && cp .clasp.json "$PB/" && (cd "$PB" && $REPO/node_modules/.bin/clasp-real pull >/dev/null && for F in $FILES; do cmp $F $REPO/$F && echo "  PROD $F == repo HEAD"; done && find . -name '*.js' -o -name '*.json' | grep -v clasp | sort | xargs sha256sum > $REPO/output/engine-sheet/stage4m-e197.sha256 && wc -l < $REPO/output/engine-sheet/stage4m-e197.sha256)
