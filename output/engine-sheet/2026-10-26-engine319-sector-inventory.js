// engine.319 (codex diff gate §3): every live Business_Ledger row, read-only — mint-pool membership under the
// engine.307 gate-6 regex (old) vs engine.319's sports-branch-only exclusion (new), and news-outlet membership.
require('/root/GodWorld/lib/env');
const sheets = require('/root/GodWorld/lib/sheets');
const fs = require('fs'), path = require('path');
const R = (p) => fs.readFileSync(path.resolve('/root/GodWorld', p), 'utf8');
const E = new Function('ECONOMIC_PARAMETERS', 'Logger', ['utilities/citizenDerivation.js', 'phase05-citizens/runCareerEngine.js', 'phase05-citizens/generationalWealthEngine.js',
  'phase05-citizens/educationCareerEngine.js', 'phase05-citizens/processAdvancementIntake.js'].map(R).join('\n') + '\nreturn { buildMintBizPool_, sectorCategory_ };')(JSON.parse(R('data/economic_parameters.json')), { log() {} });
(async () => {
  const data = await sheets.getSheetData('Business_Ledger');
  const h = data[0], iId = h.indexOf('BIZ_ID'), iS = h.indexOf('Sector'), iN = h.indexOf('Name');
  const pool = E.buildMintBizPool_({ getSheetByName: () => ({ getDataRange: () => ({ getValues: () => data }) }) });
  const out = { rows: 0, changed: [], outlets: pool.newsOutlets.map(b => b.id), newsWordSectors: {} };
  for (const r of data.slice(1)) {
    const id = String(r[iId] || '').trim(); if (!id) continue; out.rows++;
    const sec = String(r[iS] || ''), oldField = /sports|stadium|franchise|athletic/i.test(sec) ? null : E.sectorCategory_(sec, true);
    const newField = pool.fieldById[id] || null;
    if (oldField !== newField) out.changed.push(`${id} ${r[iN]} [${sec}] ${oldField} → ${newField}`);
    if (/journalism|news|broadcast/i.test(sec)) out.newsWordSectors[sec] = (out.newsWordSectors[sec] || []).concat(id + ' ' + r[iN]);
  }
  console.log('Business_Ledger rows', out.rows);
  console.log('pool membership changed (old → new):', out.changed.length); out.changed.forEach(x => console.log('  ' + x));
  console.log('news outlets:', out.outlets.join(', '));
  for (const s in out.newsWordSectors) console.log('  [' + s + '] ' + out.newsWordSectors[s].join('; '));
})().catch(e => { console.error(e.message); process.exit(1); });
