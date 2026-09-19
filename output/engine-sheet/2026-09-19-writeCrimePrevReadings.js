// Civis recalibration, part 2 (2026-09-19): the previous reading each hood's C108 shift is
// measured against = recalibrated level + that hood's own C107 swing (old index − old level),
// not the bare level. Level-as-previous dropped the season/weather/dice overlay every reading
// carries, so bench C108 read 9 hoods 'falling' on the overlay alone; with the hood's own swing,
// 2 hoods cross the 5-point shift threshold (mixed directions) — ordinary cycle noise.
// Touches PropertyCrimeIndex / ViolentCrimeIndex only; levels untouched.
require('/root/GodWorld/lib/env');
const sheets = require('/root/GodWorld/lib/sheets');
const bk = require('/root/GodWorld/output/engine-sheet/2026-09-19-crime-metrics-live-pre-recalibration-c107.json');
const seed = require('/root/GodWorld/output/engine-sheet/2026-09-19-crime-level-seed-grown-c107.json');
const APPLY = process.argv.includes('--apply');
(async () => {
  const BH = bk[0], bi = n => BH.indexOf(n);
  const old = {}; bk.slice(1).forEach(r => { old[r[0]] = { ovP: +r[bi('PropertyCrimeIndex')] - +r[bi('PropertyLevel')], ovV: +r[bi('ViolentCrimeIndex')] - +r[bi('ViolentLevel')] }; });
  const by = {}; seed.forEach(s => { by[s.hood] = s; });
  const raw = await sheets.getSheetData('Crime_Metrics');
  const H = raw[0], iP = H.indexOf('PropertyCrimeIndex'), iV = H.indexOf('ViolentCrimeIndex'), iPL = H.indexOf('PropertyLevel'), iVL = H.indexOf('ViolentLevel');
  const L = i => String.fromCharCode(65 + i);
  const updates = [], want = {};
  for (let r = 1; r < raw.length; r++) {
    const h = raw[r][0], s = by[h], o = old[h]; if (!s || !o) continue;
    if (Number(raw[r][iPL]) !== s.newP || Number(raw[r][iVL]) !== s.newV) throw new Error('level drifted for ' + h + ' — refusing');
    const p = Math.round(s.newP + o.ovP), v = Math.round(s.newV + o.ovV);
    want[h] = [p, v];
    updates.push({ range: `Crime_Metrics!${L(iP)}${r + 1}:${L(iV)}${r + 1}`, values: [[p, v]] });
    console.log(h.padEnd(18), raw[r][iP] + '/' + raw[r][iV], '->', p + '/' + v);
  }
  console.log(updates.length, 'hoods;', APPLY ? 'APPLYING' : 'dry-run');
  if (!APPLY) return;
  await sheets.batchUpdate(updates);
  const back = await sheets.getSheetData('Crime_Metrics'); let ok = 0;
  for (let r = 1; r < back.length; r++) { const w = want[back[r][0]]; if (w && +back[r][iP] === w[0] && +back[r][iV] === w[1] && +back[r][iPL] === by[back[r][0]].newP) ok++; }
  console.log('read-back verified', ok, '/', updates.length);
})().catch(e => console.log('ERR', e.message));
