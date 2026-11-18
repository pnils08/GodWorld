// engine.350 read — the authored pool on the live Event_Content_Ledger tab, signed the way the generator signs it.
// Read-only: one tab read (+ World_Config for one key). The sign logic is cut out of generateCitizensEvents.js
// by text (DIAL_BY_FACT_TAG .. gradedTagFor_) so this cannot drift from the engine's own rule.
require('/root/GodWorld/lib/env');
const fs = require('fs');
const sheets = require('/root/GodWorld/lib/sheets');
const M = require('/root/GodWorld/utilities/citizenDialMap.js');
const src = fs.readFileSync('/root/GodWorld/phase05-citizens/generateCitizensEvents.js', 'utf8');
const a = src.indexOf('  var DIAL_BY_FACT_TAG = {');
const b = src.indexOf('  function normText_(s) {');
if (a < 0 || b < 0 || b < a) throw new Error('sign block not found');
const gradedTag_ = M.gradedTag_, nudgesForEvent_ = M.nudgesForEvent_;
const gradedTagFor_ = eval('(function(){' + src.slice(a, b) + '; return gradedTagFor_; })()');

(async () => {
  const rows = await sheets.getSheetAsObjects('Event_Content_Ledger');
  const live = rows.filter((r) => String(r.Kind || '').trim().toLowerCase() === 'line' && String(r.Active || '').trim().toLowerCase() !== 'no' && String(r.Text || '').trim());
  console.log('Event_Content_Ledger rows', rows.length, '| active lines', live.length);
  const bySource = {}, byDial = {}; let unsigned = 0; const bandC = { S: 0, M: 0, L: 0 };
  for (const r of live) {
    const tags = String(r.Tags || '').split(',').map((t) => t.trim()).filter(Boolean);
    const source = tags[0] || '(none)';
    const w = Number(r.Weight) || 1;
    const g = gradedTagFor_('K', tags);
    const p = g ? M.gradedParts_(g) : null;
    const s = bySource[source] = bySource[source] || { n: 0, up: 0, down: 0, none: 0, wUp: 0, wDown: 0, wNone: 0, dials: {} };
    s.n++;
    if (!p) { s.none++; s.wNone += w; unsigned++; continue; }
    bandC[p.band]++;
    if (p.up) { s.up++; s.wUp += w; } else { s.down++; s.wDown += w; }
    const dk = p.dial; s.dials[dk] = s.dials[dk] || [0, 0]; s.dials[dk][p.up ? 0 : 1]++;
    const d = byDial[dk] = byDial[dk] || { up: 0, down: 0, wUp: 0, wDown: 0 };
    if (p.up) { d.up++; d.wUp += w; } else { d.down++; d.wDown += w; }
  }
  console.log('lines with no sign of their own (a bare-key kind writes them by its fixed map; otherwise never written):', unsigned);
  console.log('bands on signed lines:', JSON.stringify(bandC));
  console.log('\nper dial, authored lines up / down (share up) | by draw weight up / down');
  for (const d of M.GRADED_DIALS || Object.keys(byDial)) {
    const x = byDial[d]; if (!x) { console.log(String(d).padEnd(12), '0 / 0'); continue; }
    console.log(String(d).padEnd(12), `${x.up} / ${x.down}  (${(100 * x.up / (x.up + x.down)).toFixed(0)}% up) | weight ${x.wUp.toFixed(1)} / ${x.wDown.toFixed(1)}`);
  }
  console.log('\nper source: lines | up / down / no sign | dials (up/down)');
  Object.entries(bySource).sort((x, y) => y[1].n - x[1].n).forEach(([k, v]) => {
    console.log(`  ${k.padEnd(26)} ${String(v.n).padStart(4)} | ${v.up} / ${v.down} / ${v.none} | ${Object.entries(v.dials).map(([d, c]) => `${d} ${c[0]}/${c[1]}`).join('  ')}`);
  });
  const wc = await sheets.getSheetAsObjects('World_Config');
  const keys = ['dialSetbackLossPct', 'dialLineScale', 'dialDirectShare', 'dialMoodFade', 'dialHardenShare', 'dialReflectionShare'];
  const kcol = Object.keys(wc[0] || {});
  console.log('\nWorld_Config columns:', kcol.join(','));
  wc.forEach((r) => { const k = String(r[kcol[0]] || '').trim(); if (keys.indexOf(k) >= 0) console.log('  ', k, '=', r[kcol[1]]); });
})().catch((e) => { console.error('FAILED', e && e.message); process.exit(1); });
