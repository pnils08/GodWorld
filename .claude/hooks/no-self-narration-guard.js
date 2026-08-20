#!/usr/bin/env node
// No-Self-Narration Guard — Stop hook, Mike-direct 2026-08-19.
//
// Blocks the response from ending while it still contains self-narration:
// explaining why something was done, recounting a mistake, listing what went
// wrong, or describing the reasoning behind an action. Mike pays per token and
// none of that solves anything for him.
//
// The one exemption is a solve: if naming the cause IS the deliverable (a bug's
// root cause in a commit message, a diagnosis he asked for), it belongs in the
// artifact — not in the chat reply this hook scans.
//
// Same mechanism as first-person-guard.js: read the transcript at Stop, scan
// the FINAL assistant text turn only, block on a match.

const fs = require('fs');
const path = require('path');

// Confession / mistake-recounting.
const CONFESSION_RE = new RegExp([
  'got (?:it|that|this|those)? ?wrong',
  'was wrong to',
  'here (?:are|is) the ones',
  'which to distrust',
  'the pattern is',
  'inferred instead of',
  'should have',
  'my (?:mistake|error|fault|read|assumption)',
  'that was (?:wrong|my|sloppy|careless)',
  'apolog',
  'sorry',
  'to be fair to',
  'own(?:ing)? (?:it|that)',
].join('|'), 'i');

// Explaining-the-why of one's own action, and process narration.
const NARRATION_RE = new RegExp([
  'what happened (?:was|here)',
  'the reason (?:i|we) ',
  'here(?:\'s| is) (?:why|what happened|the reasoning)',
  'let me explain',
  'to be clear about (?:what|why)',
  'for the record',
  'so you know',
  'so you can see',
  'rather than (?:guess|assert|infer)',
  'instead of (?:guess|assert|inferr?)ing',
  'checked before',
  'verified (?:before|rather)',
  'read (?:it )?back rather than',
  'not (?:an inference|from memory|a guess)',
  'going forward',
  'from here (?:i|on)',
].join('|'), 'i');

async function main() {
  let input = '';
  for await (const chunk of process.stdin) input += chunk;

  let hookData;
  try { hookData = JSON.parse(input); } catch { process.exit(0); }

  const transcriptPath = hookData.transcript_path || hookData.session_id;
  if (!transcriptPath) process.exit(0);

  let txPath = transcriptPath;
  if (!txPath.endsWith('.jsonl')) {
    const dir = path.join(process.env.HOME, '.claude/projects/-root-GodWorld');
    txPath = path.join(dir, transcriptPath + '.jsonl');
  }
  if (!fs.existsSync(txPath)) process.exit(0);

  const lines = fs.readFileSync(txPath, 'utf8').split('\n').filter(Boolean);

  // Last assistant turn that actually spoke — tool-call turns carry no text.
  let lastText = '';
  for (let i = lines.length - 1; i >= 0; i--) {
    let obj;
    try { obj = JSON.parse(lines[i]); } catch { continue; }
    if (obj.type === 'assistant' && obj.message && Array.isArray(obj.message.content)) {
      const text = obj.message.content
        .filter((b) => b.type === 'text')
        .map((b) => b.text || '')
        .join('\n');
      if (text.trim()) { lastText = text; break; }
    }
  }

  if (!lastText) process.exit(0);

  const confession = lastText.match(CONFESSION_RE);
  if (confession) {
    console.log(JSON.stringify({
      decision: 'block',
      reason: 'Response recounts a mistake ("' + confession[0] + '") — Mike-direct 2026-08-19: '
        + 'never narrate what you did wrong. Delete the confession. Send the corrected '
        + 'answer or the fix alone.',
    }));
    process.exit(0);
  }

  const narration = lastText.match(NARRATION_RE);
  if (narration) {
    console.log(JSON.stringify({
      decision: 'block',
      reason: 'Response narrates reasoning or process ("' + narration[0] + '") — Mike-direct '
        + '2026-08-19: never explain why you did something unless the explanation IS the '
        + 'deliverable. Cut it to the result.',
    }));
    process.exit(0);
  }

  process.exit(0);
}

main();
