#!/usr/bin/env node
// MessageDisplay hook — builder 2026-11-19: "fix the hook to where i dont see any message
// unless it proven and backed". In the builder terminals (tmux window research-build /
// engine-sheet) every batch of reply text is drawn as nothing. The reply stays in the
// transcript. When assumption-guard.js passes a reply it leaves the passed text in a pass
// file and has the session answer SHOW; that answer is drawn as the passed reply, so the
// builder sees it as a reply of its own (builder 2026-11-19: "If they don't appear then
// they don't exist" — the guard's systemMessage never reached him).
// Other windows, crons and `claude -p` runs draw the text unchanged.

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const TERMINALS = ['research-build', 'engine-sheet'];
const STATE = path.join(__dirname, '..', 'state');

function windowName() {
  if (!process.env.TMUX_PANE) return '';
  try {
    return execSync(`tmux display-message -t "${process.env.TMUX_PANE}" -p '#W'`, { encoding: 'utf8' }).trim();
  } catch (e) {
    return '';
  }
}

function passFile(sessionId) {
  return path.join(STATE, `reply-pass-${String(sessionId).replace(/[^\w-]/g, '')}.json`);
}

// What to draw for one batch: the passed reply on the first batch of the SHOW answer,
// nothing on every other batch.
function display(input) {
  const file = input.session_id ? passFile(input.session_id) : '';
  let pass = null;
  if (file && fs.existsSync(file)) {
    try { pass = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) {}
  }
  if (!pass || !pass.text || (pass.shown && pass.shown !== input.message_id)) return '';
  if (!pass.shown) {
    pass.shown = input.message_id || 'shown';
    fs.writeFileSync(file, JSON.stringify(pass));
  }
  return input.index ? '' : pass.text;
}

function main() {
  if (!TERMINALS.includes(windowName())) return;
  let input = {};
  try { input = JSON.parse(fs.readFileSync(0, 'utf8') || '{}'); } catch (e) {}
  process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'MessageDisplay', displayContent: display(input) } }) + '\n');
}

if (require.main === module) main();
module.exports = { display, passFile };
