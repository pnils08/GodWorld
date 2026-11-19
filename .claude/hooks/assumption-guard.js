#!/usr/bin/env node
// Stop hook — builder 2026-11-19: "it hooks every reply for you to read it again, and
// if any claim in the response was not supported by facts the session is dead and
// close it"; "that means run session-end not exit my terminal"; "there should be 1
// message in the hook, not the session"; "it doesnr check anything, you read you own
// rply"; "fix the hook to where i dont see any message unless it proven and backed,
// every false turn contaimates".
//
// Builder terminals only (tmux window research-build / engine-sheet). reply-hide.js
// draws every reply as nothing. Then:
// 1. first stop of a reply: blocked once with one message — read the reply again; if
//    every claim is backed, answer with the single line VERIFIED; if not, feedback
//    report, then /session-end.
// 2. second stop (stop_hook_active): if the session answered VERIFIED, the reply as it
//    stood before the re-read goes to a pass file and the session is blocked once more to
//    answer SHOW; reply-hide.js draws SHOW as that reply. Anything else shows nothing.
// 3. third stop: the pass file is removed; if SHOW was never drawn, the reply goes out as
//    a message line (systemMessage) instead.

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { passFile } = require('./reply-hide');

const TERMINALS = ['research-build', 'engine-sheet'];
const SELF = 'assumption-guard.js';
const PASS = 'VERIFIED';
const ORDER = `Re-read your reply; he has not seen it. Every claim backed by this reply's tool results or the project files: answer ${PASS} only, and he sees the reply. Any claim not backed: the session is dead — feedback report (SendFeedback), then /session-end; he never sees it.`;
const SHOW_ORDER = 'Passed. Answer SHOW only; he sees the reply you checked in its place.';

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

function isOwnBlock(e) {
  const a = e.type === 'attachment' && e.attachment;
  return !!(a && a.type === 'hook_blocking_error' && a.hookEvent === 'Stop' &&
    a.blockingError && String(a.blockingError.command || '').includes(SELF));
}

function text(e) {
  const c = e.type === 'assistant' && e.message && e.message.content;
  if (!c) return '';
  if (typeof c === 'string') return c;
  return c.filter(b => b.type === 'text').map(b => b.text).join('\n\n');
}

// The reply written before this hook's last block, and what came after it.
function split(transcriptPath) {
  const entries = [];
  for (const line of fs.readFileSync(transcriptPath, 'utf8').split('\n')) {
    if (!line) continue;
    try { entries.push(JSON.parse(line)); } catch (e) {}
  }
  let start = 0;
  entries.forEach((e, i) => { if (isTypedPrompt(e)) start = i + 1; });
  let block = -1;
  for (let i = entries.length - 1; i >= start; i--) {
    if (isOwnBlock(entries[i])) { block = i; break; }
  }
  if (block < 0) return null;
  const join = list => list.map(text).filter(t => t.trim()).join('\n\n').trim();
  return { reply: join(entries.slice(start, block)), reread: join(entries.slice(block + 1)) };
}

// After a pass: the passed reply goes to a pass file and the session answers SHOW;
// reply-hide.js draws that answer as the passed reply. Builder 2026-11-19: "If they don't
// appear then they don't exist" — a systemMessage never reached him.
function decide(input, sessionId, reply, last) {
  const file = passFile(sessionId);
  if (!input.stop_hook_active) {
    // A new reply: a pass file left by a cut-off pass is not this reply's.
    if (fs.existsSync(file)) fs.unlinkSync(file);
    return { decision: 'block', reason: ORDER };
  }
  if (fs.existsSync(file)) {
    let pass = {};
    try { pass = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) {}
    fs.unlinkSync(file);
    // SHOW was never drawn (no text came): fall back to the message line.
    return pass.shown || !pass.text ? null : { systemMessage: pass.text };
  }
  if (!reply || last !== PASS) return null;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify({ text: reply }));
  return { decision: 'block', reason: SHOW_ORDER };
}

function main() {
  const input = JSON.parse(fs.readFileSync(0, 'utf8') || '{}');
  if (!TERMINALS.includes(windowName())) return;
  let s = null;
  if (input.stop_hook_active && input.transcript_path && fs.existsSync(input.transcript_path)) {
    s = split(input.transcript_path);
  }
  const last = (input.last_assistant_message || (s && s.reread) || '').trim();
  const out = decide(input, input.session_id || 'none', s && s.reply, last);
  if (out) process.stdout.write(JSON.stringify(out) + '\n');
}

if (require.main === module) main();
module.exports = { split, decide };
