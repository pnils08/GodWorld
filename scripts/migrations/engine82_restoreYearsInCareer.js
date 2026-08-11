#!/usr/bin/env node
'use strict';
// Restore Simulation_Ledger.YearsInCareer (col AI, 0-indexed 34) from
// output/simulation_ledger_snapshot.jsonl after the S366 startCol off-by-one
// clobber. Keyed by POPID. Dry-run without --apply.

const fs = require('fs');
const path = require('path');
const REPO = '/root/GodWorld';
require(path.join(REPO, 'lib', 'env'));
const sheets = require(path.join(REPO, 'lib', 'sheets.js'));

const STAGE_STRINGS = new Set(['student', 'entry', 'mid', 'senior', 'retired', 'entry-level', 'mid-career', 'early', 'early-career']);

(async () => {
  const apply = process.argv.includes('--apply');
  const snap = new Map();
  for (const line of fs.readFileSync(path.join(REPO, 'output', 'simulation_ledger_snapshot.jsonl'), 'utf8').split('\n')) {
    if (!line.trim()) continue;
    const o = JSON.parse(line);
    snap.set(o.POPID, o.YearsInCareer !== undefined ? o.YearsInCareer : null);
  }
  console.log('snapshot rows:', snap.size, 'sample years POP-00001:', JSON.stringify(snap.get('POP-00001')));

  const data = await sheets.getSheetData('Simulation_Ledger');
  const h = data[0];
  const iPop = h.indexOf('POPID'), iY = h.indexOf('YearsInCareer');
  if (iY !== 34) throw new Error('YearsInCareer not at 0-idx 34, got ' + iY);

  const col = [];
  let restored = 0, missing = 0, notClobbered = 0;
  for (let r = 1; r < data.length; r++) {
    const pop = data[r][iPop];
    const cur = String(data[r][iY] === undefined ? '' : data[r][iY]).trim();
    const snapVal = snap.has(pop) ? snap.get(pop) : undefined;
    if (snapVal === undefined) {
      missing++;
      console.log('NO SNAPSHOT VALUE for', pop, 'current="' + cur + '" — keeping current');
      col.push([data[r][iY]]);
      continue;
    }
    if (!STAGE_STRINGS.has(cur.toLowerCase())) notClobbered++;
    const num = snapVal === '' || snapVal === null ? '' : Number(snapVal);
    col.push([num === '' || isNaN(num) ? String(snapVal || '') : num]);
    restored++;
  }
  console.log('restored:', restored, 'missing-from-snapshot:', missing, 'cells-not-stage-strings(pre-write):', notClobbered);

  if (!apply) { console.log('DRY RUN'); return; }
  await sheets.updateRangeByPosition('Simulation_Ledger', 2, iY, col); // 0-indexed col → AI
  const back = await sheets.getSheetData('Simulation_Ledger');
  let bad = 0, stillStage = 0;
  for (let r = 1; r < back.length; r++) {
    const v = String(back[r][iY] === undefined ? '' : back[r][iY]).trim();
    if (v !== String(col[r - 1][0])) bad++;
    if (STAGE_STRINGS.has(v.toLowerCase())) stillStage++;
  }
  console.log('read-back: mismatches=' + bad + ' stage-strings-remaining=' + stillStage);
  if (bad || stillStage) process.exit(1);
  console.log('RESTORED + VERIFIED');
})().catch(e => { console.error(e); process.exit(1); });
