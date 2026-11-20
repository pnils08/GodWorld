#!/usr/bin/env node
// Reply guard — builder 2026-11-19: "it hooks every reply for you to read it again";
// "fix the hook to where i dont see any message unless it proven and backed, every false
// turn contaimates"; "Nothing reaches me unless it verified first , I don't need verified ,
// if the message appears it passed , the hook fires before the reply lands"; "Never send me
// 2 messages ever"; "The first comes correct or not at all"; "You read it nothing checks
// it"; "It worked before just fine" (the Stop-hook re-read caught 18 replies, S735-S752,
// but only after he had them).
//
// The hook forces the re-read, before he sees anything, through a draft file:
//   UserPromptSubmit — clears the last draft and gives the rule: write the reply to the
//     draft file first.
//   PostToolUse (Write/Edit of the draft) — the re-read order goes in as added context;
//     the session re-reads and fixes the draft, then sends exactly its text, once.
//   Stop — silent always: a reply matching the draft removes it; anything else is logged
//     to .claude/state/reply-draft-misses.jsonl. An order at Stop would be a second message.
// Why not at Stop: a stop with no text never reaches the Stop hooks — Claude Code answers
// it with its own "no visible output" prompt first (silent_turn_reminder in the transcript,
// live run 2026-11-19), and a stop with text has already reached him.
// Builder terminals only (tmux window research-build / engine-sheet).

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const TERMINALS = ['research-build', 'engine-sheet'];
const MISSES = path.join(__dirname, '..', 'state', 'reply-draft-misses.jsonl');

function windowName() {
  if (!process.env.TMUX_PANE) return '';
  try {
    return execSync(`tmux display-message -t "${process.env.TMUX_PANE}" -p '#W'`, { encoding: 'utf8' }).trim();
  } catch (e) {
    return '';
  }
}

function draftPath(input) {
  return path.join(input.scratchpad_dir || input.cwd || '.', 'reply-draft.md');
}

function rule(draft) {
  return `Reply guard (builder rule): he sees one message per prompt, correct or not at all. Write the whole reply to ${draft} first; the guard orders the re-read when it is written. Then send exactly the fixed draft's text as your only text this turn.`;
}

function reread(draft) {
  return `Re-read ${draft}; he has not seen it. Claim by claim: keep only what this session's tool results or the project files back; cut or fix anything else (a guess, a recall line taken as the file, a conclusion wider than what was read, a mechanism not read in code, a count not counted). Save the fixed draft (saving it orders this re-read again), then send exactly its text as your only text.`;
}

function log(input) {
  try {
    fs.mkdirSync(path.dirname(MISSES), { recursive: true });
    fs.appendFileSync(MISSES, JSON.stringify({ at: new Date().toISOString(), session: input.session_id, reply: String(input.last_assistant_message || '').slice(0, 300) }) + '\n');
  } catch (e) {}
}

const norm = t => String(t || '').replace(/\s+/g, ' ').trim();

// What the hook prints for one event; null prints nothing.
function decide(input) {
  const draft = draftPath(input);
  if (input.hook_event_name === 'UserPromptSubmit') {
    if (fs.existsSync(draft)) fs.unlinkSync(draft);
    return { hookSpecificOutput: { hookEventName: 'UserPromptSubmit', additionalContext: rule(draft) } };
  }
  if (input.hook_event_name === 'PostToolUse') {
    const f = (input.tool_input && input.tool_input.file_path) || '';
    return path.resolve(f) === path.resolve(draft)
      ? { hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: reread(draft) } } : null;
  }
  if (input.hook_event_name !== 'Stop' || input.stop_hook_active) return null;
  const sent = norm(input.last_assistant_message);
  if (fs.existsSync(draft) && norm(fs.readFileSync(draft, 'utf8')) === sent) fs.unlinkSync(draft);
  else log(input);
  return null;
}

function main() {
  const input = JSON.parse(fs.readFileSync(0, 'utf8') || '{}');
  if (!TERMINALS.includes(windowName())) return;
  const out = decide(input);
  if (out) process.stdout.write(JSON.stringify(out) + '\n');
}

if (require.main === module) main();
module.exports = { decide, draftPath };
