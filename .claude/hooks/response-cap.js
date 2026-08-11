#!/usr/bin/env node
/**
 * response-cap.js — Stop hook (Mike-direct, S364 2026-08-10).
 * No assistant reply may exceed 50 characters. Longer content must be
 * written to disk (output/replies/) and referenced by path.
 *
 * Blocks the stop (exit 2) once per response when the final assistant
 * message exceeds the cap; stop_hook_active guards against retry loops
 * (max one forced rewrite per response — bounded token cost).
 *
 * Kill switch: `touch .claude/hooks/response-cap.off` disables the cap.
 */
const fs = require('fs');
const path = require('path');

const OFF_SWITCH = path.join(__dirname, 'response-cap.off');
const CAP = 50;

let input = '';
try { input = fs.readFileSync(0, 'utf8'); } catch (e) { process.exit(0); }

let data = {};
try { data = JSON.parse(input); } catch (e) { process.exit(0); }

if (fs.existsSync(OFF_SWITCH)) process.exit(0);
if (data.stop_hook_active) process.exit(0); // one retry max — no loops

const tp = data.transcript_path;
if (!tp || !fs.existsSync(tp)) process.exit(0);

let lastText = '';
try {
  const lines = fs.readFileSync(tp, 'utf8').trim().split('\n');
  for (let i = lines.length - 1; i >= 0; i--) {
    let entry;
    try { entry = JSON.parse(lines[i]); } catch (e) { continue; }
    const msg = entry.message || entry;
    if ((entry.type === 'assistant' || msg.role === 'assistant') && msg.content) {
      const blocks = Array.isArray(msg.content) ? msg.content : [{ type: 'text', text: String(msg.content) }];
      const texts = blocks.filter(b => b.type === 'text').map(b => b.text || '');
      if (texts.length) { lastText = texts.join('\n'); break; }
    }
  }
} catch (e) { process.exit(0); }

if (lastText.length <= CAP) process.exit(0);

process.stderr.write(
  'RESPONSE CAP (Mike-direct S364): reply exceeded ' + CAP + ' chars (' +
  lastText.length + '). Write the full content to output/replies/<name>.md ' +
  'and answer again in ≤' + CAP + ' chars (e.g. "Done. output/replies/x.md").'
);
process.exit(2);
