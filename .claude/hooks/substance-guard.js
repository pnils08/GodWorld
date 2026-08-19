#!/usr/bin/env node
// Substance Guard — Stop hook, Mike-direct 2026-08-19.
// Same mechanism as first-person-guard.js. Blocks two failure modes: (1) a
// bare acknowledgment word/phrase standing alone as the entire reply
// ("Agreed.", "Understood.", "Got it.") and (2) any final reply under 200
// characters. Forces every reply to carry an actual next step, not a nod.

const fs = require('fs');
const path = require('path');

const BARE_ACK_RE = /^(agreed|understood|noted|got it|sounds good|ok|okay|roger|acknowledged|will do|makes sense)\.?!?$/i;
const MIN_LEN = 200;

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

  let lastText = '';
  for (let i = lines.length - 1; i >= 0; i--) {
    let obj;
    try { obj = JSON.parse(lines[i]); } catch { continue; }
    if (obj.type === 'assistant' && obj.message && Array.isArray(obj.message.content)) {
      const text = obj.message.content
        .filter((b) => b.type === 'text')
        .map((b) => b.text || '')
        .join('\n');
      if (text.trim()) { lastText = text.trim(); break; }
    }
  }

  if (!lastText) process.exit(0);

  if (BARE_ACK_RE.test(lastText)) {
    console.log(JSON.stringify({
      decision: 'block',
      reason: 'Response was a bare acknowledgment ("' + lastText + '") — Mike-direct 2026-08-19: every reply needs a real action plan, not a nod.',
    }));
    process.exit(0);
  }

  if (lastText.length < MIN_LEN) {
    console.log(JSON.stringify({
      decision: 'block',
      reason: 'Response is ' + lastText.length + ' chars, under the 200-char floor — Mike-direct 2026-08-19: rewrite with the actual next step spelled out.',
    }));
    process.exit(0);
  }

  process.exit(0);
}

main();
