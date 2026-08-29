#!/bin/bash
# rm-guard.sh — PreToolUse hook (Mike-direct, S364 2026-08-10; rescoped 2026-08-15; rescoped again 2026-08-29).
#
# Rule: no directory or folder is ever deleted from a Claude session. Single
# files are free. That is the whole rule.
#
# Why this shape: a codex session wiped the entire project because it had no
# "don't delete" memory and did what it was told in a bad window. The gate is
# on the CLASS of action (tree removal), not on particular paths — a path list
# was the 2026-08-15 shape, and it left every other directory deletable while
# also false-positiving on single-file deletes whose NAME contained "-r"
# (first-person-guard.js), which trained the workaround habit the gate exists
# to prevent. Gating behaviour, not access.
#
# Blocked (exit 2, no override — Mike runs it by hand if truly wanted):
#   rm with a recursive flag (-r / -R / --recursive), rmdir, find ... -delete,
#   git clean with -d.
# Allowed (falls through to the normal permission tier): rm <file> [<file>...].
#
# Input: PreToolUse JSON on stdin ({tool_name, tool_input:{command}}).

node -e '
let s = "";
process.stdin.on("data", d => s += d).on("end", () => {
  let cmd = "";
  try { const j = JSON.parse(s); cmd = String((j.tool_input && j.tool_input.command) || ""); }
  catch (e) { process.exit(0); }

  // A recursive flag is a TOKEN: whitespace, then -xyz containing r/R, or
  // --recursive. A hyphen inside a filename (first-person.js) is not a flag.
  const recursiveRm = /(^|[;&|(])\s*(?:sudo\s+)?(?:\/bin\/)?rm\s+(?:[^;&|]*?\s)?-(?:[a-zA-Z]*[rR][a-zA-Z]*|-recursive)(?=\s|$)/.test(cmd);
  const rmdir       = /(^|[;&|(])\s*(?:sudo\s+)?(?:\/bin\/)?rmdir\s/.test(cmd);
  const findDelete  = /(^|[;&|(])\s*find\s+[^;&|]*-delete/.test(cmd);
  const gitCleanDir = /(^|[;&|(])\s*git\s+clean\s+[^;&|]*-[a-zA-Z]*d/.test(cmd);

  if (!(recursiveRm || rmdir || findDelete || gitCleanDir)) process.exit(0);

  process.stderr.write(
    "BLOCKED (rm-guard, Mike-direct 2026-08-29): no directory or folder is deleted from a Claude session — " +
    "recursive rm, rmdir, find -delete and git clean -d never run here, on any path. " +
    "Single-file rm is allowed; use it. If a tree removal is truly wanted, Mike runs it by hand.\n");
  process.exit(2);
});
'
