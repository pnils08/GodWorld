#!/bin/bash
# engine.356 cut C BENCH push — stage 89 (PROD, e356u-prod.sha256) + one file at <commit> onto the sandbox. Never PROD. <commit> = d09eedf38 pushes stage 89 itself (the base run).
#   bash output/engine-sheet/2026-11-26-e356v/bench-push.sh <commit> [--dry-run]
# Pattern: ../2026-11-21-e356h/bench-push.sh.
set -euo pipefail
cd /root/GodWorld
SRC=${1:?commit}; DRY=${2:-}
CLASP=/root/GodWorld/node_modules/.bin/clasp
PROD_ID=1hL59VnByrXfWdz6EKZZQ1ss8DH1PFfDT9vVDvmjqHY_pwLyTB_N1iKW5
BENCH_ID=1gbJmGeDilxIhe25TC8SrSei89uJTEgVYgN2aOClEHHKJiykADzPVAIC2
BENCH_DEP=AKfycbxxCwKERRGb3Gk6SYg6T2nrGKf8NrKQ-pY-BOG5sdaKclEkf2jGqS3IBhgrs5IDdlmC
OUT=/root/GodWorld/output/engine-sheet/2026-11-26-e356v; MAN=$OUT/e356v.sha256
BASEMAN=/root/GodWorld/output/engine-sheet/2026-11-25-e356u/e356u-prod.sha256; BASEC=d09eedf38
FILES="phase05-citizens/generateCitizensEvents.js"
W=$(mktemp -d); mkdir -p "$W/stage" "$W/pullback"
tree() { ( cd "$1" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ); }
( cd "$W/stage" && printf '{"scriptId":"%s","rootDir":""}' "$PROD_ID" > .clasp.json && "$CLASP" pull >/dev/null )
tree "$W/stage" | diff -q - "$BASEMAN" >/dev/null || { echo "PROD pull is not stage 89 (e356u-prod.sha256) — stop"; exit 1; }
echo "PROD pull = stage 89 (e356u-prod.sha256)"
for F in $FILES; do
  [ "$(git show "$BASEC:$F" | sha256sum | cut -d' ' -f1)" = "$(sha256sum "$W/stage/$F" | cut -d' ' -f1)" ] || { echo "$F on PROD is not the repo copy at $BASEC — stop"; exit 1; }
  git show "$SRC:$F" > "$W/stage/$F"; node --check "$W/stage/$F" || { echo "$F does not parse — stop"; exit 1; }
done
[ "$SRC" = "$BASEC" ] || { grep -q "spotPickByPop_" "$W/stage/phase05-citizens/generateCitizensEvents.js" || { echo "the cut C code is not in the staged tree — stop"; exit 1; }; }

[ "$(tree "$W/stage" | wc -l)" = "$(wc -l < "$BASEMAN")" ] || { echo "file count differs from base — stop"; exit 1; }
CHG=$(join -j 2 <(tree "$W/stage" | sort -k2) <(sort -k2 "$BASEMAN") | awk '$2 != $3' | wc -l)
[ "$CHG" -le 2 ] || { echo "$CHG files changed vs base, expected two at most — stop"; exit 1; }; echo "$CHG file(s) changed vs stage 89"
[ "$SRC" = "$BASEC" ] && MAN=$OUT/e356v-base.sha256; tree "$W/stage" > "$MAN"; echo "manifest written: $MAN"
if [ "$DRY" = "--dry-run" ]; then echo "dry run: stopping before the push"; exit 0; fi
printf '{"scriptId":"%s","rootDir":""}' "$BENCH_ID" > "$W/stage/.clasp.json"; grep -q "$PROD_ID" "$W/stage/.clasp.json" && { echo "bench staging carries the PROD id — stop"; exit 1; }
cp "$W/stage/appsscript.json" "$W/manifest.orig"; printf '\n' >> "$W/stage/appsscript.json"
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" push --force | tail -1 )
cp "$W/manifest.orig" "$W/stage/appsscript.json"
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" push --force | tail -1 )
( cd "$W/pullback" && printf '{"scriptId":"%s","rootDir":""}' "$BENCH_ID" > .clasp.json && "$CLASP" pull >/dev/null )
tree "$W/pullback" | diff -q - "$MAN" >/dev/null || { echo "PULL-BACK MISMATCH — bench is not the manifest"; exit 1; }
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" deploy -i "$BENCH_DEP" -d "bench = stage 89 + engine.356 cut C a stored spot pick at $SRC" | tail -1 )
echo "bench pull-back byte-identical to $MAN"
