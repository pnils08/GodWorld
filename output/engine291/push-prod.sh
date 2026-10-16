#!/bin/bash
# engine.291 — PROD push of the isolated pilot-naming change (PROD 4e + generateCitizensEvents.js + loadEventContentLedger.js).
# Bench-proven: SANDBOX 1004 @32 = this exact package fired C112 on live-C111 state 2026-10-16 with 3 bench-only
# token rows: 22 lines naming only the three pilots, leader Eric Taveras, 0 raw, 0 self-naming, 0 compose-null, EE 4 → 4.
# Inert with no token rows on the ECL. Dry-run by default; `--go` pushes and bumps the PROD web app.
set -euo pipefail
cd "$(dirname "$0")/prod-stage"
REPO=/root/GodWorld
echo "stage vs PROD 4e manifest (must differ in exactly the two engine.291 files):"
python3 - <<'PY'
import hashlib,os
diff=[]
for line in open('/root/GodWorld/output/engine-sheet/stage4e-e292.sha256'):
    h,p=line.split()[0],line.split()[-1]; q=p.lstrip('./')
    if not os.path.exists(q): diff.append('MISSING '+q); continue
    if hashlib.sha256(open(q,'rb').read()).hexdigest()!=h: diff.append(q)
print('  differ:', diff)
assert sorted(diff)==['phase02-world-state/loadEventContentLedger.js','phase05-citizens/generateCitizensEvents.js'], 'stage is not PROD 4e + the two 291 files — STOP'
PY
for f in phase05-citizens/generateCitizensEvents.js phase02-world-state/loadEventContentLedger.js; do cmp -s $f $REPO/$f && echo "  $f == repo HEAD copy" || { echo "  $f differs from the repo copy — STOP"; exit 1; }; done
grep -q 1hL59VnByrXfWdz6EKZZQ1ss8DH1PFfDT9vVDvmjqHY_pwLyTB_N1iKW5 .clasp.json && echo "  .clasp.json = PROD script" || { echo "  .clasp.json is not PROD — STOP"; exit 1; }
$REPO/node_modules/.bin/clasp-real deployments
if [ "${1:-}" != "--go" ]; then echo "DRY RUN — pass --go to push + bump the PROD web app"; exit 0; fi
CLAUDE_CTL=1 $REPO/node_modules/.bin/clasp push -f | grep -c "└─"
# The live web app is the deploymentId pinned in the repo .clasp.json (@135 on 2026-10-16) — never the
# first non-HEAD row (that is "@1 - Mags", a different endpoint).
DEP=$(grep -o '"deploymentId": "[^"]*"' .clasp.json | cut -d'"' -f4)
$REPO/node_modules/.bin/clasp-real deployments | grep -q "$DEP" || { echo "pinned deployment $DEP not in the listing — STOP"; exit 1; }
echo "bumping the pinned PROD web app $DEP"
CLAUDE_CTL=1 $REPO/node_modules/.bin/clasp deploy -i "$DEP" -d "engine.291: the city names who is flying UNDOCKED (2 files over stage 4e) — bench 1004 @32 C112"
$REPO/node_modules/.bin/clasp-real deployments
echo "pull-back check:"; mkdir -p /tmp/e291-pullback && cp .clasp.json /tmp/e291-pullback/ && (cd /tmp/e291-pullback && $REPO/node_modules/.bin/clasp-real pull >/dev/null && for f in phase05-citizens/generateCitizensEvents.js phase02-world-state/loadEventContentLedger.js; do cmp $f $REPO/$f && echo "  PROD $f == repo HEAD"; done)
