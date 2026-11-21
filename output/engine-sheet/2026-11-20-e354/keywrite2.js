// engine.354 — write a listed set of job keys (node keywrite2.js <list>.json [--apply]); copy of keywrite.js with the list as an argument. Builder 2026-11-20 to the live Simulation_Ledger, key cell only.
//   node keywrite.js          dry: check every row still matches the list, print, write nothing
//   node keywrite.js --apply  before-copy -> one batch of AR cells -> read back
require('/root/GodWorld/lib/env');
const fs = require('fs'), sh = require('/root/GodWorld/lib/sheets');
const APPLY = process.argv.includes('--apply'), LIST = process.argv.find(a => /\.json$/.test(a)) || 'keylist.json', TAG = LIST.replace(/\.json$/, ''), list = require('./' + LIST);
(async () => {
  const client = await sh.getClient();
  const title = (await client.spreadsheets.get({ spreadsheetId: process.env.GODWORLD_SHEET_ID, fields: 'properties.title' })).data.properties.title;
  if (title !== 'Simulation_Narrative') throw new Error('not the live sheet: ' + title);
  const d = await sh.getSheetData('Simulation_Ledger'), h = d[0], ix = n => h.indexOf(n);
  const iK = ix('EconomicProfileKey'), iR = ix('RoleType'), iP = ix('POPID');
  if (sh.columnIndexToLetter(iK) !== 'AR') throw new Error('EconomicProfileKey is not column AR: ' + sh.columnIndexToLetter(iK));
  const bad = [];
  for (const e of list) { const row = d[e.row - 1] || [];
    if (e.cell !== 'AR' + e.row || String(row[iP]) !== e.popid || String(row[iR] || '').trim() !== e.role || String(row[iK] || '').trim() !== e.from) bad.push(e.popid + ' row ' + e.row + ': sheet has ' + row[iP] + ' / ' + row[iR] + ' / ' + row[iK]); }
  console.log('sheet ' + title + ' | list ' + list.length + ' | rows that no longer match the list: ' + bad.length); bad.forEach(b => console.log('  ' + b));
  if (bad.length) { console.log('STOP — nothing written'); process.exit(1); }
  if (!APPLY) { console.log('dry run — nothing written'); return; }
  const before = { header: h, arColumn: d.map(r => r[iK] === undefined ? '' : r[iK]), rows: Object.fromEntries(list.map(e => [e.popid, d[e.row - 1]])) };
  fs.writeFileSync(__dirname + '/' + TAG + '-before.json', JSON.stringify(before));
  await sh.batchUpdate(list.map(e => ({ range: 'Simulation_Ledger!' + e.cell, values: [[e.to]] })));
  const a = await sh.getSheetData('Simulation_Ledger');
  const set = new Map(list.map(e => [e.row - 1, e]));
  let keyOk = 0, otherCells = 0, otherKeys = 0;
  for (const e of list) { const row = a[e.row - 1] || [], was = d[e.row - 1];
    if (String(row[iP]) === e.popid && String(row[iK] || '') === e.to) keyOk++; else console.log('  KEY NOT AS WRITTEN ' + e.popid + ': ' + row[iK]);
    for (let c = 0; c < Math.max(row.length, was.length); c++) if (c !== iK && String(row[c] === undefined ? '' : row[c]) !== String(was[c] === undefined ? '' : was[c])) { otherCells++; console.log('  other cell differs ' + e.popid + ' ' + h[c]); } }
  for (let r = 1; r < Math.max(a.length, d.length); r++) if (!set.has(r) && String((a[r] || [])[iK] || '') !== String((d[r] || [])[iK] || '')) { otherKeys++; console.log('  key changed on a row not on the list: row ' + (r + 1)); }
  console.log('read back: keys as written ' + keyOk + '/' + list.length + ' | other cells changed on those rows ' + otherCells + ' | keys changed on other rows ' + otherKeys + ' | ledger rows ' + (d.length - 1) + ' -> ' + (a.length - 1));
  process.exit(keyOk === list.length && otherCells === 0 && otherKeys === 0 ? 0 : 1);
})().catch(e => { console.error('ERR', e.message); process.exit(2); });
