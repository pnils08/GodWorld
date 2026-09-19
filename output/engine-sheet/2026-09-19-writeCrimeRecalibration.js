// Civis recalibration (builder go 2026-09-19): write the grown levels + matching previous
// readings to LIVE Crime_Metrics before the C108 fire. Backup: output/backups/crime_metrics_live_pre_recalibration_c107.json
require('/root/GodWorld/lib/env');
const sheets = require('/root/GodWorld/lib/sheets');
const seed = require('/root/GodWorld/output/engine-sheet/2026-09-19-crime-level-seed-grown-c107.json');
const APPLY = process.argv.includes('--apply');
(async () => {
  const raw = await sheets.getSheetData('Crime_Metrics');
  const H = raw[0];
  const col = n => { const i = H.indexOf(n); if (i < 0) throw new Error('no col ' + n); return i; };
  const L = i => String.fromCharCode(65 + i);
  const iP = col('PropertyCrimeIndex'), iV = col('ViolentCrimeIndex'), iPL = col('PropertyLevel'), iVL = col('ViolentLevel'), iQL = col('QolLevel');
  const bySeed = {}; seed.forEach(s => { bySeed[s.hood] = s; });
  const updates = []; let n = 0;
  for (let r = 1; r < raw.length; r++) {
    const hood = raw[r][0]; const s = bySeed[hood];
    if (!s) { console.log('NO SEED for', hood, '— untouched'); continue; }
    const row = r + 1;
    updates.push({ range: `Crime_Metrics!${L(iP)}${row}:${L(iV)}${row}`, values: [[Math.round(s.newP), Math.round(s.newV)]] });
    updates.push({ range: `Crime_Metrics!${L(iPL)}${row}:${L(iQL)}${row}`, values: [[s.newP, s.newV, s.newQ]] });
    console.log(hood.padEnd(18), 'index', raw[r][iP] + '/' + raw[r][iV], '->', Math.round(s.newP) + '/' + Math.round(s.newV), '| level', raw[r][iPL] + '/' + raw[r][iVL] + '/' + raw[r][iQL], '->', s.newP + '/' + s.newV + '/' + s.newQ);
    n++;
  }
  console.log(n, 'hoods;', APPLY ? 'APPLYING' : 'dry-run');
  if (!APPLY) return;
  await sheets.batchUpdate(updates);
  const back = await sheets.getSheetData('Crime_Metrics');
  let ok = 0;
  for (let r = 1; r < back.length; r++) { const s = bySeed[back[r][0]]; if (!s) continue;
    if (Number(back[r][iPL]) === s.newP && Number(back[r][iVL]) === s.newV && Number(back[r][iQL]) === s.newQ && Number(back[r][iP]) === Math.round(s.newP) && Number(back[r][iV]) === Math.round(s.newV)) ok++; else console.log('READBACK MISMATCH', back[r].join(',')); }
  console.log('read-back verified', ok, '/', n);
})().catch(e => console.log('ERR', e.message));
