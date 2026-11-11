#!/bin/bash
# Look at the page without a browser window. Rebuilds, screenshots one view in headless Chrome, prints console errors.
#   tools/view.sh <place> <out.png> [options]
#   <place>  neighborhood slug, optionally -at-<percent> down the street: downtown, baylight-district-at-40
#   --cam "x,y,z" --look "x,y,z"   fixed camera (hides the on-screen text)
#   --t0 <seconds>                 start the place's clock here (to catch something mid-animation)
#   --ms <virtual ms>              how long to let it run before the picture (default 3000)
#   --size <W>x<H>                 window size (default 960x620; Chrome's minimum width is about 500)
#   --wx rain|fog|overcast         look-test a kind of weather the week did not have
# Safe to run several at once: every call uses its own files.
HERE="$(cd "$(dirname "$0")/.." && pwd)"
PLACE="$1"; OUT="$2"; shift 2
CAM=""; LOOK=""; T0=""; MS=3000; SIZE="960x620"; WXV=""
while [ $# -gt 0 ]; do case "$1" in --cam) CAM="$2";; --look) LOOK="$2";; --t0) T0="$2";; --ms) MS="$2";; --size) SIZE="$2";; --wx) WXV="$2";; esac; shift 2; done
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
WX="$WXV" node "$HERE/build.js" "$TMP/page.html" >/dev/null || exit 1
DBG="null"
if [ -n "$CAM" ]; then DBG="{cam:[$CAM],look:[${LOOK:-0,2,-1000}],t0:${T0:-0},hide:true}"; elif [ -n "$T0" ]; then DBG="{t0:$T0}"; fi
{ printf '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>[hidden]{display:none!important}body{margin:0}</style><script>window.WV_DEBUG=%s;</script></head><body>' "$DBG"; cat "$TMP/page.html"; printf '</body></html>'; } > "$TMP/p.html"
timeout 150 /opt/google/chrome/chrome --headless=new --no-sandbox --enable-unsafe-swiftshader --use-angle=swiftshader --hide-scrollbars --user-data-dir="$TMP/prof" --window-size="${SIZE/x/,}" --virtual-time-budget="$MS" --enable-logging=stderr --screenshot="$OUT" "file://$TMP/p.html#$PLACE" 2>&1 | grep -E "CONSOLE" | grep -v -i favicon | grep -i -E "error|warn|uncaught|not defined|undefined" | cut -c1-400 | sort -u | head -8
[ -s "$OUT" ] || { echo "no screenshot written"; exit 1; }
