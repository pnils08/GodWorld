#!/usr/bin/env node
// MessageDisplay hook — builder 2026-11-19: "fix the hook to where i dont see any message
// unless it proven and backed"; "Nothing reaches me unless it verified first , I don't
// need verified , if the message appears it passed". In the builder terminals (tmux window
// research-build / engine-sheet) every batch of reply text is drawn as nothing, except a
// VERIFIED answer to assumption-guard.js's re-read: that is drawn as the reply it passed,
// read back from the transcript. The transcript keeps every reply as written.
// Other windows, crons and `claude -p` runs draw the text unchanged.

const { execSync } = require('child_process');
const fs = require('fs');
const { split, PASS } = require('./assumption-guard');

const TERMINALS = ['research-build', 'engine-sheet'];

function windowName() {
  if (!process.env.TMUX_PANE) return '';
  try {
    return execSync(`tmux display-message -t "${process.env.TMUX_PANE}" -p '#W'`, { encoding: 'utf8' }).trim();
  } catch (e) {
    return '';
  }
}

// What to draw for one batch: the passed reply in place of a VERIFIED answer,
// nothing for every other batch.
function display(input) {
  if (input.index || String(input.delta || '').trim() !== PASS) return '';
  const t = input.transcript_path;
  if (!t || !fs.existsSync(t)) return '';
  const s = split(t);
  return s && s.reply ? s.reply : '';
}

function main() {
  if (!TERMINALS.includes(windowName())) return;
  let input = {};
  try { input = JSON.parse(fs.readFileSync(0, 'utf8') || '{}'); } catch (e) {}
  const shown = display(input);
  // Trace while the VERIFIED swap is proven live (builder 2026-11-19: "Still broke").
  try {
    fs.appendFileSync(require('path').join(__dirname, '..', 'state', 'reply-hide-trace.jsonl'), JSON.stringify({
      at: new Date().toISOString(), keys: Object.keys(input), index: input.index, final: input.final,
      delta: String(input.delta || '').slice(0, 40), shownChars: shown.length,
    }) + '\n');
  } catch (e) {}
  process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'MessageDisplay', displayContent: shown } }) + '\n');
}

if (require.main === module) main();
module.exports = { display };
