#!/bin/bash
# engine.292 — PROD push of the isolated casino fix (PROD 4d + phase05-citizens/casinoLedgerEngine.js only).
# Bench-proven: SANDBOX 1004 @31 fired C112 on live-C111 state 2026-10-16 — Briar Soto's zero-night 'neg' slip
# settled void-gate (stake back), every other slip as before; EE 4 → 4. Builder's call whether this goes before
# Sunday's C112 fire. Dry-run by default; `--go` pushes and bumps the PROD web app.
set -euo pipefail
cd "$(dirname "$0")/prod-stage"
REPO=/root/GodWorld
echo "stage vs PROD 4d manifest (must differ in exactly phase05-citizens/casinoLedgerEngine.js):"
python3 - <<'PY'
import hashlib,os
diff=[]
for line in open('/root/GodWorld/output/engine-sheet/stage4d-e290.sha256'):
    h,p=line.split()[0],line.split()[-1]; q=p.lstrip('./')
    if not os.path.exists(q): diff.append('MISSING '+q); continue
    if hashlib.sha256(open(q,'rb').read()).hexdigest()!=h: diff.append(q)
print('  differ:', diff)
assert diff==['phase05-citizens/casinoLedgerEngine.js'], 'stage is not PROD 4d + the casino file — STOP'
PY
cmp -s phase05-citizens/casinoLedgerEngine.js $REPO/phase05-citizens/casinoLedgerEngine.js && echo "  casino file == repo HEAD copy" || { echo "  casino file differs from the repo copy — STOP"; exit 1; }
grep -q 1hL59VnByrXfWdz6EKZZQ1ss8DH1PFfDT9vVDvmjqHY_pwLyTB_N1iKW5 .clasp.json && echo "  .clasp.json = PROD script" || { echo "  .clasp.json is not PROD — STOP"; exit 1; }
$REPO/node_modules/.bin/clasp-real deployments
if [ "${1:-}" != "--go" ]; then echo "DRY RUN — pass --go to push + bump the PROD web app"; exit 0; fi
CLAUDE_CTL=1 $REPO/node_modules/.bin/clasp push -f | grep -c "└─"
DEP=$($REPO/node_modules/.bin/clasp-real deployments | grep -v "@HEAD" | grep -o "AKfycb[A-Za-z0-9_-]*" | head -1)
echo "bumping $DEP"
CLAUDE_CTL=1 $REPO/node_modules/.bin/clasp deploy -i "$DEP" -d "engine.292: a zero night pushes (casinoLedgerEngine.js only, over stage 4d) — bench 1004 @31 C112"
$REPO/node_modules/.bin/clasp-real deployments
echo "pull-back check:"; mkdir -p /tmp/e292-pullback && cp .clasp.json /tmp/e292-pullback/ && (cd /tmp/e292-pullback && $REPO/node_modules/.bin/clasp-real pull >/dev/null && cmp phase05-citizens/casinoLedgerEngine.js $REPO/phase05-citizens/casinoLedgerEngine.js && echo "  PROD casinoLedgerEngine.js == repo HEAD")
