#!/usr/bin/env node
// MessageDisplay hook — builder 2026-11-19: "fix the hook to where i dont see any message
// unless it proven and backed". In the builder terminals (tmux window research-build /
// engine-sheet) every batch of reply text is drawn as nothing. The reply stays in the
// transcript; assumption-guard.js shows it after the session's re-read passes it.
// Other windows, crons and `claude -p` runs draw the text unchanged.

const { execSync } = require('child_process');

const TERMINALS = ['research-build', 'engine-sheet'];

function windowName() {
  if (!process.env.TMUX_PANE) return '';
  try {
    return execSync(`tmux display-message -t "${process.env.TMUX_PANE}" -p '#W'`, { encoding: 'utf8' }).trim();
  } catch (e) {
    return '';
  }
}

if (TERMINALS.includes(windowName())) {
  process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'MessageDisplay', displayContent: '' } }) + '\n');
}
