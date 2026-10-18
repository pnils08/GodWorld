#!/bin/bash
# engine.299 Task 13 — PROD push over stage 4o (stage4o-e299.sha256). The files are the list in
# output/engine299/stage4p-files.txt: the three citywide EVENT_LIMIT caps gone (neighborhood 6, generic 25, game-mode 15),
# the agy fold (neighborhood pool holds writable lines only; generic prefers an unused line, repeats the least-used,
# never nothing) and GameNight as a texture suffix. Every commit on these files since 4o (c8235de3) is Task 13.
# Stage = PROD 4o + those files at 8acd5f30. Bench: SANDBOX 1004 @54, C112 on live-C111 state.
# Review: agy output/antigravity/2026-10-18-engine299-task13-caps-read.md (builder 2026-10-18 13:30: "agy is enough, push the caps").
# Dry-run by default; `--go` pushes, bumps the pinned PROD web app, pull-back cmp.
set -euo pipefail
cd "$(dirname "$0")/prod-stage-4p-8acd5f30"
REPO=/root/GodWorld
FILES=$(cat $REPO/output/engine299/stage4p-files.txt)
echo "stage vs PROD 4o manifest (must differ in exactly the listed files):"
python3 - <<'PY'
import hashlib,os
want=sorted([l.strip() for l in open('/root/GodWorld/output/engine299/stage4p-files.txt') if l.strip()])
diff=[]
for line in open('/root/GodWorld/output/engine-sheet/stage4o-e299.sha256'):
    h,p=line.split()[0],line.split()[-1]; q=p.lstrip('./')
    if not os.path.exists(q): diff.append('MISSING '+q); continue
    if hashlib.sha256(open(q,'rb').read()).hexdigest()!=h: diff.append(q)
print('  differ:', len(diff), 'files')
assert sorted(diff)==want, 'stage is not PROD 4o + the listed files — STOP'
PY
for F in $FILES; do cmp -s $F $REPO/$F || { echo "  $F differs from the repo copy — STOP"; exit 1; }; done; echo "  all listed files == repo HEAD"
grep -q 1hL59VnByrXfWdz6EKZZQ1ss8DH1PFfDT9vVDvmjqHY_pwLyTB_N1iKW5 .clasp.json && echo "  .clasp.json = PROD script" || { echo "  .clasp.json is not PROD — STOP"; exit 1; }
$REPO/node_modules/.bin/clasp-real deployments
if [ "${1:-}" != "--go" ]; then echo "DRY RUN — pass --go to push + bump the PROD web app"; exit 0; fi
CLAUDE_CTL=1 $REPO/node_modules/.bin/clasp push -f | grep -c "└─"
DEP=$(grep -o '"deploymentId": "[^"]*"' $REPO/.clasp.json | cut -d'"' -f4)
[ -n "$DEP" ] || { echo "no pinned deploymentId in the repo .clasp.json — STOP"; exit 1; }
$REPO/node_modules/.bin/clasp-real deployments | grep -q "$DEP" || { echo "pinned deployment $DEP not in the listing — STOP"; exit 1; }
echo "bumping the pinned PROD web app $DEP"
CLAUDE_CTL=1 $REPO/node_modules/.bin/clasp deploy -i "$DEP" -d "engine.299 Task 13: citywide event caps gone, generic variety, GameNight suffix (4 files over stage 4o = stage 4p) — bench 1004 @54 C112"
$REPO/node_modules/.bin/clasp-real deployments
echo "pull-back check:"; PB=$(mktemp -d) && cp .clasp.json "$PB/" && (cd "$PB" && $REPO/node_modules/.bin/clasp-real pull >/dev/null && for F in $FILES; do cmp $F $REPO/$F && echo "  PROD $F == repo HEAD"; done && find . -name '*.js' -o -name '*.json' | grep -v clasp | sort | xargs sha256sum > $REPO/output/engine-sheet/stage4p-e299.sha256 && wc -l < $REPO/output/engine-sheet/stage4p-e299.sha256)
