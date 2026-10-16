#!/bin/bash
# engine.291 fixes + engine.294 — PROD push over stage 4f: a6bdf1de $LEADER never on the leader's own LifeHistory;
# ebd0091a "a $PILOTROLE" takes its article from the role; 71637c7a a fragment that is itself a token ("$MOOD", live
# ECL R291) never loads or prints raw. TWO files: generateCitizensEvents.js + loadEventContentLedger.js.
# Stage = fresh PROD pull 2026-10-16 (== stage4f-e291.sha256, 168/168) + those files at HEAD. Bench: SANDBOX 1004 @33.
# Dry-run by default; `--go` pushes, bumps the pinned PROD web app, pull-back cmp. Then rb releases the 9 held rows.
set -euo pipefail
cd "$(dirname "$0")/prod-stage-fix"
REPO=/root/GodWorld
echo "stage vs PROD 4f manifest (must differ in exactly the two files):"
python3 - <<'PY'
import hashlib,os
diff=[]
for line in open('/root/GodWorld/output/engine-sheet/stage4f-e291.sha256'):
    h,p=line.split()[0],line.split()[-1]; q=p.lstrip('./')
    if not os.path.exists(q): diff.append('MISSING '+q); continue
    if hashlib.sha256(open(q,'rb').read()).hexdigest()!=h: diff.append(q)
print('  differ:', diff)
assert sorted(diff)==['phase02-world-state/loadEventContentLedger.js','phase05-citizens/generateCitizensEvents.js'], 'stage is not PROD 4f + the two fixed files — STOP'
PY
for f in phase05-citizens/generateCitizensEvents.js phase02-world-state/loadEventContentLedger.js; do cmp -s $f $REPO/$f && echo "  $f == repo HEAD copy" || { echo "  $f differs from the repo copy — STOP"; exit 1; }; done
grep -q 1hL59VnByrXfWdz6EKZZQ1ss8DH1PFfDT9vVDvmjqHY_pwLyTB_N1iKW5 .clasp.json && echo "  .clasp.json = PROD script" || { echo "  .clasp.json is not PROD — STOP"; exit 1; }
$REPO/node_modules/.bin/clasp-real deployments
if [ "${1:-}" != "--go" ]; then echo "DRY RUN — pass --go to push + bump the PROD web app"; exit 0; fi
CLAUDE_CTL=1 $REPO/node_modules/.bin/clasp push -f | grep -c "└─"
# The live web app is the deploymentId pinned in the repo .clasp.json — never the first non-HEAD row.
DEP=$(grep -o '"deploymentId": "[^"]*"' $REPO/.clasp.json | cut -d'"' -f4)
[ -n "$DEP" ] || { echo "no pinned deploymentId in the repo .clasp.json — STOP"; exit 1; }
$REPO/node_modules/.bin/clasp-real deployments | grep -q "$DEP" || { echo "pinned deployment $DEP not in the listing — STOP"; exit 1; }
echo "bumping the pinned PROD web app $DEP"
CLAUDE_CTL=1 $REPO/node_modules/.bin/clasp deploy -i "$DEP" -d "engine.291 fixes + engine.294: \$LEADER self-exclusion, a/an before \$PILOTROLE, no raw-token fragment (2 files over stage 4f) — bench 1004 @33 C112"
$REPO/node_modules/.bin/clasp-real deployments
echo "pull-back check:"; PB=$(mktemp -d) && cp .clasp.json "$PB/" && (cd "$PB" && $REPO/node_modules/.bin/clasp-real pull >/dev/null && for f in phase05-citizens/generateCitizensEvents.js phase02-world-state/loadEventContentLedger.js; do cmp $f $REPO/$f && echo "  PROD $f == repo HEAD"; done)
