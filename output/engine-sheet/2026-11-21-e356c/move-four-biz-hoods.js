#!/usr/bin/env node
// engine.356 — builder go 2026-11-21 ("Ok"): four Business_Ledger rows filed under a sub-area move to their
// tracked hood (Neighborhood_Map.ChildAreas parent). Reads live, checks each row is still the expected
// name + old hood, writes the Neighborhood cell, reads it back. Backup written before any write.
//   node output/engine-sheet/2026-11-21-e356c/move-four-biz-hoods.js [--go]
'use strict';
require('/root/GodWorld/lib/env');
const fs = require('fs');
const sheets = require('/root/GodWorld/lib/sheets');
const MOVES = [
  ['BIZ-00010', 'Portside Bio', 'Brooklyn Basin', 'Jack London'],
  ['BIZ-00011', 'Tenth Street Digital', 'Old Oakland', 'Downtown'],
  ['BIZ-00029', 'Coliseum District Development', 'Coliseum', 'East Oakland'],
  ['BIZ-00062', "Dario's Bar", 'Telegraph corridor', 'Temescal'],
];
(async () => {
  const go = process.argv.includes('--go');
  console.log('sheet', sheets.getSpreadsheetId ? sheets.getSpreadsheetId() : '(id)');
  const data = await sheets.getSheetData('Business_Ledger');
  const h = data[0].map(x => String(x).trim());
  const iId = h.indexOf('BIZ_ID'), iName = h.indexOf('Name'), iHood = h.indexOf('Neighborhood');
  if (iId < 0 || iName < 0 || iHood < 0) throw new Error('header missing');
  const plan = [];
  for (const [id, name, from, to] of MOVES) {
    const r = data.findIndex((row, k) => k > 0 && String(row[iId]).trim() === id);
    if (r < 0) throw new Error(id + ' not on Business_Ledger');
    const row = data[r];
    if (String(row[iName]).trim() !== name) throw new Error(id + ' name is ' + row[iName] + ', expected ' + name);
    if (String(row[iHood]).trim() !== from) throw new Error(id + ' hood is ' + row[iHood] + ', expected ' + from);
    plan.push({ id, name, from, to, sheetRow: r + 1 });
  }
  const backup = __dirname + '/move-four-biz-hoods.backup.json';
  fs.writeFileSync(backup, JSON.stringify(plan, null, 2));
  plan.forEach(p => console.log(`${p.id} row ${p.sheetRow} ${p.name}: ${p.from} -> ${p.to}`));
  if (!go) { console.log('dry run — pass --go to write'); return; }
  for (const p of plan) await sheets.updateCell('Business_Ledger', p.sheetRow, 'Neighborhood', p.to);
  const after = await sheets.getSheetData('Business_Ledger');
  let ok = 0;
  for (const p of plan) {
    const v = String(after[p.sheetRow - 1][iHood]).trim(), idv = String(after[p.sheetRow - 1][iId]).trim();
    console.log(`readback ${idv}: ${v}`); if (idv === p.id && v === p.to) ok++;
  }
  console.log(ok === plan.length ? 'READBACK OK 4/4' : 'READBACK MISMATCH ' + ok + '/4');
})().catch(e => { console.error('STOP: ' + e.message); process.exit(1); });
