#!/usr/bin/env node
// Reply check — builder 2026-11-19: "it hooks every reply for you to read it again";
// "fix the hook to where i dont see any message unless it proven and backed, every false
// turn contaimates"; "Nothing reaches me unless it verified first , I don't need verified ,
// if the message appears it passed , the hook fires before the reply lands"; "I refuse to
// pay for this to land in my context . Figure it out on your side and return the correct
// reply"; "Never send me 2 messages ever"; "The first comes correct or not at all".
//
// A Stop hook runs after a reply is already sent, so any order it gives means a second
// message, and a pass answered with no text drew Claude Code's "no visible output" prompt.
// The check now runs before the reply, through a draft file:
//   UserPromptSubmit — adds the draft rule to the session before it answers.
//   Stop — silent: if the reply matches the checked draft, the draft is removed; if not,
//   the miss is logged to .claude/state/reply-draft-misses.jsonl. It never blocks and never
//   adds context, so it can never cause a second message.
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
  return `Reply check (builder rule): he sees one message per prompt, and it comes correct or not at all. Before sending any text, write the whole reply to ${draft}, re-read it against this session's tool results and the project files, and fix any claim they do not back. Then send exactly that file's text as your only text this turn: no status lines, no second message.`;
}

const norm = t => String(t || '').replace(/\s+/g, ' ').trim();

// Stop: true when the sent reply is the checked draft.
function matches(input) {
  const file = draftPath(input);
  if (!fs.existsSync(file)) return false;
  const ok = norm(fs.readFileSync(file, 'utf8')) === norm(input.last_assistant_message);
  if (ok) fs.unlinkSync(file);
  return ok;
}

function main() {
  const input = JSON.parse(fs.readFileSync(0, 'utf8') || '{}');
  if (!TERMINALS.includes(windowName())) return;
  if (input.hook_event_name === 'UserPromptSubmit') {
    process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'UserPromptSubmit', additionalContext: rule(draftPath(input)) } }) + '\n');
    return;
  }
  if (input.hook_event_name === 'Stop' && !input.stop_hook_active && !matches(input)) {
    try {
      fs.mkdirSync(path.dirname(MISSES), { recursive: true });
      fs.appendFileSync(MISSES, JSON.stringify({ at: new Date().toISOString(), session: input.session_id, reply: String(input.last_assistant_message || '').slice(0, 300) }) + '\n');
    } catch (e) {}
  }
}

if (require.main === module) main();
module.exports = { matches, rule, draftPath };
