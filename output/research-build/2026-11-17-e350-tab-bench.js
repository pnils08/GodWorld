// engine.350 Task 7 bench tool — the down lines on the bench's content tab, counted against a control.
// SANDBOX 1004 only for every write; the live sheet is read once (a row count, to prove the write missed it).
//   apply                 append the missing scripts/downLinesEclPool.js rows to the BENCH Event_Content_Ledger, read back
//   count <leg> <c...>    the bench's LifeHistory_Log rows of those Cycles: line pushes up / down per dial, tab against
//                         coded pools, the down-pool lines by dial; saved to 2026-11-17-e350-tab-bench-<leg>.json
//   cmp <legA> <legB>     the two saved counts side by side
require('/root/GodWorld/lib/env');
const fs = require('fs');
const path = require('path');
const LIVE = process.env.GODWORLD_SHEET_ID;
const B = '1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA';
if (!LIVE || LIVE === B) throw new Error('live id missing or equal to the bench');
const s = require('/root/GodWorld/lib/sheets');
const M = require('/root/GodWorld/utilities/citizenDialMap.js');
const P = require('/root/GodWorld/scripts/downLinesEclPool.js');
const DIALS = M.GRADED_DIALS;
const F = (leg) => path.join(__dirname, '2026-11-17-e350-tab-bench-' + leg + '.json');
const on = (id) => { process.env.GODWORLD_SHEET_ID = id; };
const norm = (t) => String(t || '').replace(/\s+/g, ' ').trim().toLowerCase();

(async () => {
  const mode = process.argv[2];
  if (mode === 'apply') {
    const v = P.validateRows(P.ROWS); if (!v.valid) throw new Error(v.errors.join('; '));
    on(LIVE); const liveBefore = (await s.getRawSheetData('Event_Content_Ledger')).length - 1;
    on(B); const data = await s.getRawSheetData('Event_Content_Ledger');
    const hdr = data[0]; if (hdr.join('|') !== P.HDR.join('|')) throw new Error('bench header differs: ' + hdr.join('|'));
    const seen = new Set(data.slice(1).map((r) => norm(r[hdr.indexOf('Text')])));
    const missing = P.ROWS.filter((r) => !seen.has(norm(r.Text)));
    if (missing.length) await s.appendRows('Event_Content_Ledger', P.toSheetValues(missing));
    const after = await s.getRawSheetData('Event_Content_Ledger');
    const back = after.slice(1).filter((r) => String(r[hdr.indexOf('PoolKey')]).indexOf('down.') === 0).length;
    on(LIVE); const liveAfter = (await s.getRawSheetData('Event_Content_Ledger')).length - 1;
    console.log(`apply: bench rows ${data.length - 1} -> ${after.length - 1} (appended ${missing.length}); down.* rows read back ${back}; live rows ${liveBefore} -> ${liveAfter}`);
    process.exit(back === P.ROWS.length && liveAfter === liveBefore ? 0 : 1);
  }
  if (mode === 'count') {
    const leg = process.argv[3]; const cycles = process.argv.slice(4).map(Number);
    if (!leg || !cycles.length) throw new Error('count <leg> <cycle...>');
    on(B); const log = await s.getSheetData('LifeHistory_Log'); const h = log[0], ix = (n) => h.indexOf(n);
    const rows = log.slice(1).filter((r) => cycles.indexOf(Number(r[ix('Cycle')])) >= 0);
    const out = { leg, cycles, lines: rows.length, moving: 0, citizens: 0, perDial: {}, kinds: {}, downPool: {}, tabLines: 0 };
    DIALS.forEach((d) => out.perDial[d] = { up: 0, down: 0, tabUp: 0, tabDown: 0, codeUp: 0, codeDown: 0 });
    const pops = new Set();
    for (const r of rows) {
      const full = String(r[ix('EventTag')] || ''); const tag = full.split('|')[0];
      const tab = /\|auth:/.test(full); if (tab) out.tabLines++;
      pops.add(r[ix('POPID')]);
      const fx = M.nudgesForEvent_(tag, 1, r[ix('EventText')]); let moved = false;
      const kind = M.baseTag_(tag); out.kinds[kind] = out.kinds[kind] || { n: 0, up: 0, down: 0 }; out.kinds[kind].n++;
      for (const d in fx) {
        if (!fx[d] || !out.perDial[d]) continue; moved = true;
        const p = out.perDial[d], up = fx[d] > 0;
        p[up ? 'up' : 'down']++; p[(tab ? 'tab' : 'code') + (up ? 'Up' : 'Down')]++; out.kinds[kind][up ? 'up' : 'down']++;
      }
      if (moved) out.moving++;
      if (/\|auth:rb-1117/.test(full)) { const g = M.gradedParts_(tag); const k = g ? g.dial : '(no dial)'; out.downPool[k] = (out.downPool[k] || 0) + 1; }
    }
    out.citizens = pops.size;
    on(B); const ee = await s.getSheetData('Engine_Errors'); out.engineErrors = ee.length - 1;
    fs.writeFileSync(F(leg), JSON.stringify(out, null, 1));
    console.log(`count ${leg} C${cycles.join(',')}: ${out.lines} lines on ${out.citizens} citizens, ${out.tabLines} from the tab, ${out.moving} move a dial; Engine_Errors rows ${out.engineErrors}`);
    DIALS.forEach((d) => { const p = out.perDial[d], t = p.up + p.down; console.log(`  ${d.padEnd(12)} ${p.up} / ${p.down} (${t ? Math.round(100 * p.up / t) : '-'}% up) | tab ${p.tabUp}/${p.tabDown} code ${p.codeUp}/${p.codeDown}`); });
    console.log('  down-pool lines by dial: ' + JSON.stringify(out.downPool));
    process.exit(0);
  }
  if (mode === 'cmp') {
    const a = JSON.parse(fs.readFileSync(F(process.argv[3]), 'utf8')), b = JSON.parse(fs.readFileSync(F(process.argv[4]), 'utf8'));
    console.log(`cmp ${a.leg} -> ${b.leg}: lines ${a.lines} -> ${b.lines}; from the tab ${a.tabLines} -> ${b.tabLines}; Engine_Errors ${a.engineErrors} -> ${b.engineErrors}`);
    const pct = (p) => (p.up + p.down ? Math.round(100 * p.up / (p.up + p.down)) : 0);
    DIALS.forEach((d) => console.log(`  ${d.padEnd(12)} ${a.perDial[d].up}/${a.perDial[d].down} (${pct(a.perDial[d])}% up) -> ${b.perDial[d].up}/${b.perDial[d].down} (${pct(b.perDial[d])}% up)`));
    console.log('  down-pool lines: ' + JSON.stringify(b.downPool));
    process.exit(0);
  }
  throw new Error('mode: apply | count | cmp');
})().catch((e) => { console.error('FAILED', e && e.message); process.exit(1); });
