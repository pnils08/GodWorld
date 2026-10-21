// engine.306 gate-3 FIX step 0 (codex plan review 2026-10-21 item 0): before any reset, read SANDBOX 1004's C113 as left by pair 2
// leg B2 — Riley_Digest (full S.worldEvents JSON + StorySeeds count), Story_Hook_Deck (HookText = h.text only) and WorldEvents_Ledger
// (StorySeedCount per event row) — keyed by typed Cycle, raw cells preserved. A cross-check for the tapped B2t, not a base receipt.
// The caller first proves the bench is still on B2 (readers LifeHistory sha = readers-B2-c113.json). Writes nothing to any sheet.
// usage: node 2026-10-21-e306-step0.js  → 2026-10-21-e306-step0-B2-c113.json
require('/root/GodWorld/lib/env');
const BENCH = '1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA';
if (process.env.GODWORLD_SHEET_ID === BENCH) throw new Error('env already points at the bench');
process.env.GODWORLD_SHEET_ID = BENCH;
const fs = require('fs');
const { getSheetData } = require('/root/GodWorld/lib/sheets');
const num = (v) => Number(String(v).replace(/^C/, ''));
(async () => {
  const out = { bench: BENCH, cycle: 113 };
  for (const [tab, cycCol] of [['Riley_Digest', 'Cycle'], ['Story_Hook_Deck', 'Cycle'], ['WorldEvents_Ledger', 'Cycle']]) {
    const d = await getSheetData(tab);
    const h = d[0], ci = h.indexOf(cycCol);
    if (ci < 0) throw new Error(tab + ': no ' + cycCol + ' column in ' + JSON.stringify(h));
    const rows = d.slice(1).filter(r => num(r[ci]) === 113);
    out[tab] = { header: h, rows };
    console.log(tab + ': ' + rows.length + ' C113 row(s)');
  }
  const rd = out.Riley_Digest, wi = rd.header.indexOf('WorldEvents');
  if (rd.rows.length !== 1) throw new Error('Riley_Digest C113 rows = ' + rd.rows.length + ', want 1');
  const ev = JSON.parse(rd.rows[0][wi] || '[]');
  out.worldEvents = ev;
  const tally = {};
  ev.forEach(e => { const k = [e.domain, e.subdomain, e.source].map(x => x || '-').join('|'); tally[k] = (tally[k] || 0) + 1; });
  console.log('worldEvents ' + ev.length + ' ' + JSON.stringify(tally));
  const si = rd.header.findIndex(x => /seed/i.test(x));
  if (si >= 0) console.log('Riley ' + rd.header[si] + ' = ' + rd.rows[0][si]);
  fs.writeFileSync(__dirname + '/2026-10-21-e306-step0-B2-c113.json', JSON.stringify(out, null, 1));
  console.log('→ 2026-10-21-e306-step0-B2-c113.json');
})().catch(e => { console.error(e.message); process.exit(1); });
