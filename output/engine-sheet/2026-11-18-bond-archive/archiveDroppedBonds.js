#!/usr/bin/env node
// One-shot (builder 2026-11-18): move the history rows of every bond that is not in the live snapshot
// (Relationship_Bonds) out of Relationship_Bond_Ledger into Relationship_Bond_Archive. Nothing is restored
// to the snapshot; the engine reads only the snapshot, and the death lookups read the history ledger — after
// this they stop seeing the dropped bonds. Reversible: a full local backup of the ledger is written first,
// the archive keeps every row verbatim, and the move is copy → verify → delete.
// Default is a dry run. --apply writes. Re-run safe: refuses if the archive already holds rows.
'use strict';
require('/root/GodWorld/lib/env');
const fs = require('fs'), path = require('path');
const S = require('/root/GodWorld/lib/sheets');
const APPLY = process.argv.includes('--apply');
const LEDGER = 'Relationship_Bond_Ledger', ARCHIVE = 'Relationship_Bond_Archive', SNAP = 'Relationship_Bonds';
const HERE = __dirname;
const die = (m) => { console.error('ABORT: ' + m); process.exit(1); };

(async () => {
  const snap = await S.getRawSheetData(SNAP);
  const sh = snap[0] || [], sIdI = sh.indexOf('BondId');
  if (sIdI < 0) die('Relationship_Bonds has no BondId column');
  const snapIds = new Set(snap.slice(1).map((r) => String(r[sIdI] || '').trim()).filter(Boolean));
  if (snapIds.size < 500) die('snapshot reads ' + snapIds.size + ' bonds — refusing to treat the rest as dropped');

  const led = await S.getRawSheetData(LEDGER);
  const lh = led[0] || [], lIdI = lh.indexOf('BondId');
  if (lIdI < 0 || lh.length !== 19) die('ledger header is not the 19-column history shape');
  const body = led.slice(1);
  const dropIdx = [];                        // 0-based body index of each row to move
  body.forEach((r, i) => { const id = String(r[lIdI] || '').trim(); if (id && !snapIds.has(id)) dropIdx.push(i); });
  const dropIds = new Set(dropIdx.map((i) => String(body[i][lIdI]).trim()));
  const keepRows = body.length - dropIdx.length;
  console.log(`ledger rows ${body.length} | snapshot bonds ${snapIds.size} | rows to move ${dropIdx.length} across ${dropIds.size} bond ids | rows that stay ${keepRows}`);
  const blanks = body.filter((r) => !String(r[lIdI] || '').trim()).length;
  console.log(`rows with no BondId (stay): ${blanks}`);
  if (!APPLY) { console.log('DRY RUN — nothing written. Re-run with --apply.'); return; }
  if (dropIds.size !== 2424) die('expected 2424 dropped bond ids (measured 2026-11-18), found ' + dropIds.size + ' — the ledger moved; re-measure first');

  // 1. backup
  const bak = path.join(HERE, 'Relationship_Bond_Ledger.backup-before-archive.json');
  fs.writeFileSync(bak, JSON.stringify(led));
  console.log('backup: ' + bak + ' (' + led.length + ' rows incl. header)');

  // 2. archive tab: create if absent, must be empty
  const titles = new Set((await S.listSheets()).map((s) => s.title));
  if (!titles.has(ARCHIVE)) { await S.createSheet(ARCHIVE, lh); console.log('created ' + ARCHIVE); }
  const arch0 = await S.getRawSheetData(ARCHIVE);
  if (arch0.length > 1) die(ARCHIVE + ' already holds ' + (arch0.length - 1) + ' rows — not appending twice');
  const moving = dropIdx.map((i) => body[i]);
  for (let c = 0; c < moving.length; c += 500) await S.appendRows(ARCHIVE, moving.slice(c, c + 500));
  const arch = await S.getRawSheetData(ARCHIVE);
  const norm = (r) => lh.map((_, k) => String(r[k] === undefined ? '' : r[k])).join('\u0001');
  if (arch.length - 1 !== moving.length) die('archive holds ' + (arch.length - 1) + ' rows, expected ' + moving.length + ' — ledger untouched');
  const a = arch.slice(1).map(norm), m = moving.map(norm);
  for (let i = 0; i < m.length; i++) if (a[i] !== m[i]) die('archive row ' + (i + 2) + ' differs from its source — ledger untouched');
  console.log('archive verified: ' + moving.length + ' rows, every cell equal to its source');

  // 3. delete from the ledger: re-read, assert nothing moved since the plan, delete contiguous runs bottom-up
  const led2 = await S.getRawSheetData(LEDGER);
  if (led2.length !== led.length || led2.slice(1).some((r, i) => String(r[lIdI] || '') !== String(body[i][lIdI] || ''))) die('the ledger changed since the plan was read — archive kept, nothing deleted');
  const runs = []; let s0 = null, prev = null;
  for (const i of dropIdx) { if (s0 === null) { s0 = i; prev = i; } else if (i === prev + 1) prev = i; else { runs.push([s0, prev]); s0 = i; prev = i; } }
  runs.push([s0, prev]);
  const gid = (await S.getSheetIds([LEDGER]))[LEDGER];
  const reqs = runs.reverse().map(([a0, b0]) => ({ deleteDimension: { range: { sheetId: gid, dimension: 'ROWS', startIndex: a0 + 1, endIndex: b0 + 2 } } }));  // +1 header, end exclusive
  console.log('deleting ' + dropIdx.length + ' rows in ' + reqs.length + ' runs (bottom-up)');
  for (let c = 0; c < reqs.length; c += 100) await S.batchUpdateSpreadsheet(reqs.slice(c, c + 100));

  // 4. read back
  const led3 = await S.getRawSheetData(LEDGER);
  const left = led3.slice(1).filter((r) => String(r[lIdI] || '').trim() && !snapIds.has(String(r[lIdI]).trim())).length;
  const kept = body.filter((_, i) => !dropIdx.includes(i)).map(norm), now = led3.slice(1).map(norm);
  const same = kept.length === now.length && kept.every((x, i) => x === now[i]);
  console.log(`ledger now ${led3.length - 1} rows (expected ${keepRows}) | dropped-bond rows left ${left} | kept rows identical and in order: ${same}`);
  if (led3.length - 1 !== keepRows || left !== 0 || !same) die('READ-BACK MISMATCH — restore from the backup / archive');
  console.log('DONE ✓');
})().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
