#!/bin/bash
# rm-guard.sh — PreToolUse hook (Mike-direct, S364 2026-08-10; rescoped 2026-08-15 HOUSE-PROCESS GATE).
#
# Original version blocked ALL recursive rm from any Claude session, anywhere —
# a direct reaction to codex rm -rf'ing output/, logs/, backups/, .venv/ on
# 2026-08-11. That blanket ban was broader than the incident it exists to
# prevent (clearing a scratch dir needed Mike to run it by hand) and Mike
# asked directly to loosen it, scoped to the paths that actually matter.
#
# Now: hard-blocked (exit 2, no override) only for (a) whole-tree/repo-root/home
# wipes and (b) the paths that fed the 2026-08-11 loss and feed the Drive
# publish pipeline (output/, logs/, backups/). Recursive rm anywhere else falls
# through to the normal Bash "ask" permission tier — still a prompt, no longer
# an unconditional block.
#
# Input: PreToolUse JSON on stdin ({tool_name, tool_input:{command}}).
# Exit 2 = block with message.

node -e '
let s = "";
process.stdin.on("data", d => s += d).on("end", () => {
  let cmd = "";
  try { const j = JSON.parse(s); cmd = String((j.tool_input && j.tool_input.command) || ""); }
  catch (e) { process.exit(0); }

  const isRecursiveRm = /(^|[;&|])\s*rm\s+[^;&|]*-[a-zA-Z]*[rR]/.test(cmd);
  const isFindDelete = /find\s+[^;&|]*-delete/.test(cmd);
  if (!isRecursiveRm && !isFindDelete) process.exit(0);

  // Whole-tree / repo-root / home wipes — never allowed regardless of path.
  const wipesRoot = /rm\s+[^;&|]*-[a-zA-Z]*[rR][a-zA-Z]*\s+(\.|\*|\.\/\*|~\/?|\/|\/root\/?GodWorld\/?)(\s|$)/.test(cmd);

  // The 2026-08-11 casualties / Drive-publish-pipeline paths — still hard-blocked.
  const protectedPaths = /(^|[\s\/])(output|logs|backups)(\/|\s|$)/.test(cmd);

  if (wipesRoot || protectedPaths) {
    process.stderr.write("BLOCKED (rm-guard, Mike-direct S364/2026-08-15 rescope): recursive delete of a whole-tree wipe or a Drive-pipeline path (output/, logs/, backups/) never runs from a Claude session. If this delete is truly wanted, Mike runs it by hand.\n");
    process.exit(2);
  }
  process.exit(0);
});
'
