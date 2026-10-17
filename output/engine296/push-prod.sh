#!/bin/bash
# engine.296 — PROD push over stage 4k (stage4k-e98.sha256). ONE file:
#   phase07-evening-media/buildEveningFamous.js  (SPORTS_LEGENDS = retired MLB-origin ledger rows, no literal fallback)
# Stage = stage 4k (output/engine98/prod-stage, == stage4k-e98.sha256 168/168) + that file at HEAD (173b9e49).
# Bench: SANDBOX 1004 @39, C112 on live C111 (template rows already Inactive on live).
# Dry-run by default; `--go` pushes, bumps the pinned PROD web app, pull-back cmp.
set -euo pipefail
cd "$(dirname "$0")/prod-stage"
REPO=/root/GodWorld
FILES="phase07-evening-media/buildEveningFamous.js"
echo "stage vs PROD 4k manifest (must differ in exactly the one file):"
python3 - <<'PY'
import hashlib,os
want=['phase07-evening-media/buildEveningFamous.js']
diff=[]
for line in open('/root/GodWorld/output/engine-sheet/stage4k-e98.sha256'):
    h,p=line.split()[0],line.split()[-1]; q=p.lstrip('./')
    if not os.path.exists(q): diff.append('MISSING '+q); continue
    if hashlib.sha256(open(q,'rb').read()).hexdigest()!=h: diff.append(q)
print('  differ:', sorted(diff))
assert sorted(diff)==want, 'stage is not PROD 4k + the one file — STOP'
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
CLAUDE_CTL=1 $REPO/node_modules/.bin/clasp deploy -i "$DEP" -d "engine.296: SPORTS_LEGENDS from the ledger (1 file over stage 4k) — bench 1004 @39 C112"
$REPO/node_modules/.bin/clasp-real deployments
echo "pull-back check:"; PB=$(mktemp -d) && cp .clasp.json "$PB/" && (cd "$PB" && $REPO/node_modules/.bin/clasp-real pull >/dev/null && for F in $FILES; do cmp $F $REPO/$F && echo "  PROD $F == repo HEAD"; done && find . -name '*.js' -o -name '*.json' | grep -v clasp | sort | xargs sha256sum > $REPO/output/engine-sheet/stage4l-e296.sha256 && wc -l < $REPO/output/engine-sheet/stage4l-e296.sha256)
