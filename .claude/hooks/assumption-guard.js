#!/usr/bin/env node
// Stop hook — builder 2026-11-19: "it hooks every reply for you to read it again, and
// if any claim in the response was not supported by facts the session is dead and
// close it"; then: "that means run session-end not exit my terminal", "there should be
// 1 message in the hook, not the session". Rebuilt 2026-11-19 on "it doesnr check
// anything, you read you own rply": no checker run, no model, no verdict. The reply
// goes back to the session that wrote it, once.
//
// Builder terminals only (tmux window research-build / engine-sheet). After each reply
// the stop is blocked once with one message: read this reply again; a claim not
// supported by facts means the session is dead — feedback report, then /session-end.
// A stop already driven by this hook (stop_hook_active) passes, so it does not loop.

const { execSync } = require('child_process');
const fs = require('fs');

const TERMINALS = ['research-build', 'engine-sheet'];

function windowName() {
  if (!process.env.TMUX_PANE) return '';
  try {
    return execSync(`tmux display-message -t "${process.env.TMUX_PANE}" -p '#W'`, { encoding: 'utf8' }).trim();
  } catch (e) {
    return '';
  }
}

function main() {
  const input = JSON.parse(fs.readFileSync(0, 'utf8') || '{}');
  if (!TERMINALS.includes(windowName())) return;
  if (input.stop_hook_active) return;
  const reason = 'Read the reply you just wrote again. If any claim in it is not supported by facts, the session is dead (builder 2026-11-19): file a feedback report (SendFeedback) naming those claims, then run /session-end.';
  process.stdout.write(JSON.stringify({ decision: 'block', reason }) + '\n');
}

main();
