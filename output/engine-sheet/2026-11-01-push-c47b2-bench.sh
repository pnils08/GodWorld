#!/bin/bash
# civic.47 B2 F7 bench push: SANDBOX 1004 script project = stage 37 = stage 36 (PROD @172, manifest stage36-e329.sha256)
# + civicInitiativeEngine.js at <commit>; or, with "stage36", the bench restored to stage 36 (= PROD). The bench may be pulled
# at stage 35 (processAdvancementIntake.js at 41160fe3 makes it stage 36), stage 36, or a stage 37 (the engine file back at the
# stage 36 blob makes it stage 36). The tree outside the one file must equal stage 36.
#   bash output/engine-sheet/2026-11-01-push-c47b2-bench.sh <commit> <manifest-out> [--dry-run]
#   bash output/engine-sheet/2026-11-01-push-c47b2-bench.sh stage36 [--dry-run]
set -euo pipefail
cd /root/GodWorld
CLASP=/root/GodWorld/node_modules/.bin/clasp
BENCH_ID=1gbJmGeDilxIhe25TC8SrSei89uJTEgVYgN2aOClEHHKJiykADzPVAIC2
BENCH_DEP=AKfycbxxCwKERRGb3Gk6SYg6T2nrGKf8NrKQ-pY-BOG5sdaKclEkf2jGqS3IBhgrs5IDdlmC
OUT=/root/GodWorld/output/engine-sheet
S35_MAN=$OUT/stage35-e316.sha256
S36_MAN=$OUT/stage36-e329.sha256
S37_MAN=$OUT/stage37-c47b2.sha256
E329_FILE=phase05-citizens/processAdvancementIntake.js
E329_COMMIT=41160fe3
FILE=phase05-citizens/civicInitiativeEngine.js
BASE_ENGINE=2a6ccb214^          # the engine blob PROD stage 36 carries (hash-checked below against the manifest)
SRC=${1:?commit or stage36}
if [ "$SRC" = "stage36" ]; then MAN=$S36_MAN; DRY=${2:-}; else MAN=${2:?manifest}; DRY=${3:-}; fi
W=$(mktemp -d); mkdir -p "$W/stage" "$W/pullback"
tree() { ( cd "$W/stage" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ) 2>/dev/null; }
( cd "$W/stage" && printf '{"scriptId":"%s","rootDir":""}' "$BENCH_ID" > .clasp.json && "$CLASP" pull >/dev/null )
if tree | diff -q - "$S36_MAN" >/dev/null; then echo "bench pulled = stage 36"
elif tree | diff -q - "$S35_MAN" >/dev/null; then
  git show "$E329_COMMIT:$E329_FILE" > "$W/stage/$E329_FILE"
  tree | diff -q - "$S36_MAN" >/dev/null || { echo "stage 35 with $E329_FILE at $E329_COMMIT is not stage 36 — stop"; exit 1; }
  echo "bench pulled = stage 35; $E329_FILE at $E329_COMMIT = stage 36"
elif [ -f "$S37_MAN" ] && tree | diff -q - "$S37_MAN" >/dev/null; then
  git show "$BASE_ENGINE:$FILE" > "$W/stage/$FILE"
  tree | diff -q - "$S36_MAN" >/dev/null || { echo "stage 37 with $FILE at $BASE_ENGINE is not stage 36 — stop"; exit 1; }
  echo "bench pulled = stage 37; $FILE back at $BASE_ENGINE = stage 36"
else echo "bench is neither stage 35, 36 nor 37 — stop"; exit 1; fi
if [ "$SRC" = "stage36" ]; then
  if [ "$(sha256sum "$W/stage/$FILE" | cut -d' ' -f1)" != "$(grep " ./$FILE\$" "$S36_MAN" | cut -d' ' -f1)" ]; then echo "stage 36 engine blob mismatch — stop"; exit 1; fi
  LABEL="bench 1004 restored = stage 36 (PROD @172)"
else
  git merge-base --is-ancestor 2a6ccb214 "$SRC" || { echo "$SRC does not carry the civic.47 B2 F7 commit — stop"; exit 1; }
  git show "$SRC:$FILE" > "$W/stage/$FILE"
  tree > "$MAN"
  grep -v "$FILE\$" "$MAN" | diff -q - <(grep -v "$FILE\$" "$S36_MAN") >/dev/null \
    || { echo "built stage differs from stage 36 outside $FILE — stop"; exit 1; }
  echo "stage 37 = stage 36 + $FILE at $SRC; manifest $MAN"; LABEL="bench 1004 = stage 37: stage 36 + civic.47 B2 F7 at $SRC"
fi
if [ "$DRY" = "--dry-run" ]; then echo "dry run: stopping before the push ($W/stage)"; exit 0; fi
grep -q "$BENCH_ID" "$W/stage/.clasp.json" || { echo "staged .clasp.json is not the bench — stop"; exit 1; }
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" push --force | tail -1 )
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" deploy -i "$BENCH_DEP" -d "$LABEL" | tail -1 )
( cd "$W/pullback" && printf '{"scriptId":"%s","rootDir":""}' "$BENCH_ID" > .clasp.json && "$CLASP" pull >/dev/null )
( cd "$W/pullback" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ) | diff -q - "$MAN" >/dev/null \
  || { echo "PULL-BACK MISMATCH — bench is not the stage"; exit 1; }
echo "pull-back $(find "$W/pullback" -name '*.js' | wc -l) js + manifest byte-identical to $(basename "$MAN")"
