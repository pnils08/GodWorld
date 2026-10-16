#!/bin/bash
# engine.293 (1) — PROD push of the promotion-door pay fix over stage 4g (bdcfb5c4: migration-wave and emergence
# arrivals priced by jobReferencePay_ like the intake, lookupIncome_ last). ONE file: phase05-citizens/checkForPromotions.js.
# Stage = fresh PROD pull 2026-10-16 (== stage4g-e291fix.sha256, 168/168) + that file at HEAD. Bench: SANDBOX 1004 @34
# vs @33 on the same live-C111 base: only the 6 wave arrivals' Income (+ NetWorth by a few dollars) differ; 0 else.
# Dry-run by default; `--go` pushes, bumps the pinned PROD web app, pull-back cmp.
set -euo pipefail
cd "$(dirname "$0")/prod-stage"
REPO=/root/GodWorld
F=phase05-citizens/checkForPromotions.js
echo "stage vs PROD 4g manifest (must differ in exactly $F):"
python3 - <<'PY'
import hashlib,os
diff=[]
for line in open('/root/GodWorld/output/engine-sheet/stage4g-e291fix.sha256'):
    h,p=line.split()[0],line.split()[-1]; q=p.lstrip('./')
    if not os.path.exists(q): diff.append('MISSING '+q); continue
    if hashlib.sha256(open(q,'rb').read()).hexdigest()!=h: diff.append(q)
print('  differ:', diff)
assert diff==['phase05-citizens/checkForPromotions.js'], 'stage is not PROD 4g + the one file — STOP'
PY
cmp -s $F $REPO/$F && echo "  $F == repo HEAD copy" || { echo "  $F differs from the repo copy — STOP"; exit 1; }
grep -q 1hL59VnByrXfWdz6EKZZQ1ss8DH1PFfDT9vVDvmjqHY_pwLyTB_N1iKW5 .clasp.json && echo "  .clasp.json = PROD script" || { echo "  .clasp.json is not PROD — STOP"; exit 1; }
$REPO/node_modules/.bin/clasp-real deployments
if [ "${1:-}" != "--go" ]; then echo "DRY RUN — pass --go to push + bump the PROD web app"; exit 0; fi
CLAUDE_CTL=1 $REPO/node_modules/.bin/clasp push -f | grep -c "└─"
# The live web app is the deploymentId pinned in the repo .clasp.json — never the first non-HEAD row.
DEP=$(grep -o '"deploymentId": "[^"]*"' $REPO/.clasp.json | cut -d'"' -f4)
[ -n "$DEP" ] || { echo "no pinned deploymentId in the repo .clasp.json — STOP"; exit 1; }
$REPO/node_modules/.bin/clasp-real deployments | grep -q "$DEP" || { echo "pinned deployment $DEP not in the listing — STOP"; exit 1; }
echo "bumping the pinned PROD web app $DEP"
CLAUDE_CTL=1 $REPO/node_modules/.bin/clasp deploy -i "$DEP" -d "engine.293 (1): promotion-door arrivals priced by the job (1 file over stage 4g) — bench 1004 @34 vs @33 C112"
$REPO/node_modules/.bin/clasp-real deployments
echo "pull-back check:"; PB=$(mktemp -d) && cp .clasp.json "$PB/" && (cd "$PB" && $REPO/node_modules/.bin/clasp-real pull >/dev/null && cmp $F $REPO/$F && echo "  PROD $F == repo HEAD")
