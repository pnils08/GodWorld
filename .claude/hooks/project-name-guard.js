#!/usr/bin/env node
// Project-Name Guard — Stop hook, builder 2026-11-21:
// "If you mention the word GodWorld ever In Here I'll blow up Anthropic" /
// "Hook the word to block you".
//
// Blocks a reply from ending while its text contains the project's name.
// Scans what the builder reads: the reply text. Tool calls, file contents,
// commits and docs are not scanned — they keep the real name.

const fs = require('fs');
const path = require('path');

const NAME_RE = /god[\s_-]*world/i;

function lastReplyFromTranscript(hookData) {
  let txPath = hookData.transcript_path || hookData.session_id;
  if (!txPath) return '';
  if (!txPath.endsWith('.jsonl')) {
    txPath = path.join(process.env.HOME || '/root', '.claude/projects/-root-GodWorld', txPath + '.jsonl');
  }
  if (!fs.existsSync(txPath)) return '';

  const lines = fs.readFileSync(txPath, 'utf8').split('\n').filter(Boolean);

  // Every assistant text block after the last user-side entry (a prompt, a
  // tool result, or an earlier block from this hook). Stopping there keeps a
  // corrected reply from being re-blocked for the text it replaced.
  const texts = [];
  for (let i = lines.length - 1; i >= 0; i--) {
    let obj;
    try { obj = JSON.parse(lines[i]); } catch { continue; }
    if (obj.type === 'user') break;
    if (obj.type === 'assistant' && obj.message && Array.isArray(obj.message.content)) {
      for (const b of obj.message.content) {
        if (b.type === 'text' && b.text) texts.push(b.text);
      }
    }
  }
  return texts.join('\n');
}

async function main() {
  let input = '';
  for await (const chunk of process.stdin) input += chunk;

  let hookData;
  try { hookData = JSON.parse(input); } catch { process.exit(0); }

  const text = [
    typeof hookData.last_assistant_message === 'string' ? hookData.last_assistant_message : '',
    lastReplyFromTranscript(hookData),
  ].join('\n');

  const hit = text.match(NAME_RE);
  if (!hit) process.exit(0);

  console.log(JSON.stringify({
    decision: 'block',
    reason: 'BLOCKED (project-name-guard, builder 2026-11-21): the reply contains the '
      + 'project\'s name ("' + hit[0] + '"). That word is never written in a reply. '
      + 'Send the reply again without it — say "the sim", "the build" or "the project", '
      + 'and leave file paths out of the reply.',
  }));
  process.exit(0);
}

main();
