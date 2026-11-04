#!/usr/bin/env node
'use strict';

// civic.47 M1 item 7 — the one-time copy of in-world entries from the
// manual-era `mara` container onto her citizen page (scripts/maraMemory.js).
// The entries and their exact text live in
// output/mara-directives/mara-memory-seed.json, which the builder approved
// (2026-11-03) before any write. Default is a check (screen only, no writes);
// --write copies every entry that passes the screen, reads each back, and
// writes a receipt. Nothing here reads the `mara` container.
//
//   node scripts/maraMemorySeed.js            # screen the list
//   node scripts/maraMemorySeed.js --write    # copy + readback + receipt

const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const LIST = path.join(ROOT, 'output', 'mara-directives', 'mara-memory-seed.json');
const RECEIPT = path.join(ROOT, 'output', 'mara-directives', 'mara-memory-seed-receipt.json');

// Out-of-world markers: the builder, the project and its machinery, real dates.
const SCREEN = [
  /\bowner\b/i, /\bbuilder\b/i, /\bMike\b/, /\bP FEEDBACK\b/i, /\bthe user\b/i,
  /claude|anthropic|openai|supermemory|notebooklm|github/i, /\bsession\b/i, /\b(?<!ferry )terminal\b/i, /\bcanon\b/i, /\brepo\b/i,
  /\bcron\b/i, /\bprompt\b/i, /\bmodel\b/i, /\bLLM\b/, /\bAI\b/, /\bcontainer\b/i, /\binstance\b/i,
  /\bengine\b/i, /\bledger\b/i, /\bagent/i, /\btemplate\b/i, /\.md\b|\.json\b|\.txt\b/i, /\bGodWorld\b/i,
  /\b20\d\d-\d\d-\d\d\b/, /\b(January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2}, 20\d\d\b/,
  /real[- ]world/i, /\bcycles? but cannot\b/i,
];
function screen(text) {
  return SCREEN.filter(re => re.test(String(text || ''))).map(re => re.source);
}

async function main() {
  const WRITE = process.argv.includes('--write');
  const list = JSON.parse(fs.readFileSync(LIST, 'utf8'));
  const results = [];
  for (const e of list.entries || []) {
    const hits = screen(e.text);
    results.push({ sourceId: e.sourceId, title: e.title, pass: !hits.length, hits });
  }
  for (const r of results) console.log((r.pass ? 'PASS ' : 'FAIL ') + r.sourceId + ' — ' + r.title + (r.hits.length ? ' [' + r.hits.join(' | ') + ']' : ''));
  if (!WRITE) { console.log('\ncheck only — re-run with --write to copy the passing entries'); return; }
  require('../lib/env');
  const memory = require('./maraMemory');
  const prior = fs.existsSync(RECEIPT) ? JSON.parse(fs.readFileSync(RECEIPT, 'utf8')) : { writes: {} };
  const receipt = { list: path.relative(ROOT, LIST), writes: prior.writes || {}, ranAt: new Date().toISOString() };
  for (const r of results) {
    const customId = memory.CONTAINER + '-seed-' + r.sourceId;
    if (!r.pass) { receipt.writes[customId] = { ok: false, why: 'screen: ' + r.hits.join(', ') }; continue; }
    if (receipt.writes[customId] && receipt.writes[customId].ok) continue;
    const e = list.entries.find(x => x.sourceId === r.sourceId);
    receipt.writes[customId] = await memory.upsert(customId, e.text, { type: 'desk-record', kind: 'seed', sourceId: e.sourceId, asOf: e.asOf || null });
  }
  receipt.complete = results.every(r => { const w = receipt.writes[memory.CONTAINER + '-seed-' + r.sourceId]; return w && w.ok; });
  fs.writeFileSync(RECEIPT, JSON.stringify(receipt, null, 2));
  console.log('\nreceipt → ' + path.relative(ROOT, RECEIPT) + (receipt.complete ? ' (complete)' : ' (INCOMPLETE)'));
  if (!receipt.complete) process.exit(1);
}

if (require.main === module) main().catch(e => { console.error(e.message); process.exit(1); });
module.exports = { screen, SCREEN };
