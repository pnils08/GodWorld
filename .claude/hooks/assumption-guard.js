#!/usr/bin/env node
// Stop hook — builder 2026-11-19: "it hooks every reply for you to read it again, and
// if any claim in the response was not supported by facts the session is dead and
// close it"; "that means run session-end not exit my terminal"; "there should be 1
// message in the hook, not the session"; "it doesnr check anything, you read you own
// rply"; "fix the hook to where i dont see any message unless it proven and backed,
// every false turn contaimates"; "Nothing reaches me unless it verified first , I don't
// need verified , if the message appears it passed"; later: "I refuse to pay for this to
// land in my context . Figure it out on your side and return the correct reply".
//
// Builder terminals only (tmux window research-build / engine-sheet). reply-hide.js
// draws every reply as nothing. Each stop of a reply gets one message, added as context:
// read the reply again; every claim backed → answer VERIFIED only; any claim not backed →
// write the corrected reply with only backed claims, which is read again the same way.
// A pass is answered with no text at all (builder 2026-11-19: "Get that mother fucking
// verified out of my chat now"): he reads the session away from the terminal, where
// every reply and every VERIFIED answer showed — the terminal's screen, captured, had
// hidden both, so reply-hide.js never reached what he reads, and it is unwired. A pass,
// or the corrected reply, ends the turn: one order per reply (builder 2026-11-19:
// "there should be 1 message in the hook"; "It's firing more than once").

const { execSync } = require('child_process');
const fs = require('fs');

const TERMINALS = ['research-build', 'engine-sheet'];
const SELF = 'assumption-guard.js';
const MAX_TRIES = 1;
const ORDER = `Re-read your reply; he has not seen it. Every claim backed by this reply's tool results or the project files: end your turn with no text at all. Any claim not backed: write the corrected reply with only backed claims.`;

function windowName() {
  if (!process.env.TMUX_PANE) return '';
  try {
    return execSync(`tmux display-message -t "${process.env.TMUX_PANE}" -p '#W'`, { encoding: 'utf8' }).trim();
  } catch (e) {
    return '';
  }
}

function isTypedPrompt(e) {
  if (e.type !== 'user' || !e.message) return false;
  const c = e.message.content;
  if (typeof c === 'string') return !c.startsWith('Stop hook feedback:');
  return Array.isArray(c) && !c.some(b => b.type === 'tool_result');
}

// The re-read order goes in as added context, not a block: a block draws a hook notice
// in his chat, added context does not (tested 2026-11-19 with `claude -p`: the session
// took a second turn, stop_hook_active was set, the transcript holds a
// hook_additional_context entry and no block).
function isOwnBlock(e) {
  const a = e.type === 'attachment' && e.attachment;
  if (!a || a.hookEvent !== 'Stop') return false;
  if (a.type === 'hook_additional_context') return [].concat(a.content || []).some(c => String(c).includes(ORDER));
  return a.type === 'hook_blocking_error' && !!a.blockingError && String(a.blockingError.command || '').includes(SELF);
}

function text(e) {
  const c = e.type === 'assistant' && e.message && e.message.content;
  if (!c) return '';
  if (typeof c === 'string') return c;
  return c.filter(b => b.type === 'text').map(b => b.text).join('\n\n');
}

// The reply the last order checked: the text after the order before it (or after the
// typed prompt) and before the last one; what came after; and how many orders this
// prompt has had.
function split(transcriptPath) {
  const entries = [];
  for (const line of fs.readFileSync(transcriptPath, 'utf8').split('\n')) {
    if (!line) continue;
    try { entries.push(JSON.parse(line)); } catch (e) {}
  }
  let start = 0;
  entries.forEach((e, i) => { if (isTypedPrompt(e)) start = i + 1; });
  const orders = [];
  for (let i = start; i < entries.length; i++) if (isOwnBlock(entries[i])) orders.push(i);
  if (!orders.length) return null;
  const last = orders[orders.length - 1];
  const from = orders.length > 1 ? orders[orders.length - 2] + 1 : start;
  const join = list => list.map(text).filter(t => t.trim()).join('\n\n').trim();
  return { reply: join(entries.slice(from, last)), reread: join(entries.slice(last + 1)), orders: orders.length };
}

// A pass is no text after the last order.
function decide(input, orders, reread) {
  if (input.stop_hook_active && (reread === '' || orders >= MAX_TRIES)) return null;
  return { hookSpecificOutput: { hookEventName: 'Stop', additionalContext: ORDER } };
}

function main() {
  const input = JSON.parse(fs.readFileSync(0, 'utf8') || '{}');
  if (!TERMINALS.includes(windowName())) return;
  let s = null;
  if (input.stop_hook_active && input.transcript_path && fs.existsSync(input.transcript_path)) {
    s = split(input.transcript_path);
  }
  const out = decide(input, s ? s.orders : 0, s ? s.reread : null);
  if (out) process.stdout.write(JSON.stringify(out) + '\n');
}

if (require.main === module) main();
module.exports = { split, decide };
