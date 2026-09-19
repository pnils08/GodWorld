// Civis recalibration, part 3 (PROPOSED — needs the builder's go): the live Neighborhood_Map's
// CURRENT readings (the C107 row the C108 fire reads as last cycle) still carry the real-Oakland
// CrimeIndex and RetailVitality. Bench C108 on 17233d75 read them and fired a "Downtown under
// strain: crime index 1.00 (city 0.65)" crisis onset, "Temescal boom sustained 10/10" and "West
// Oakland cooling off". This rewrites the two instrument readings the Civis notice already says
// were revised; history (engine audits, world summaries, editions) keeps the old values.
//   CrimeIndex    = (recalibrated PropertyCrimeIndex + ViolentCrimeIndex) / 2 / 50 + that row's own
//                   pulse/chaos residual (old CrimeIndex − old (P+V)/2/50)
//   RetailVitality = old RetailVitality × canon retailMod ÷ retired-table retailMod (keeps that
//                   cycle's city base, variance and folds; swaps only the real-Oakland profile)
require('/root/GodWorld/lib/env');
const sheets = require('/root/GodWorld/lib/sheets');
const fs = require('fs'), vm = require('vm');
const APPLY = process.argv.includes('--apply');
const OLD_RETAIL_MOD = { 'Downtown': 1.3, 'Temescal': 1.2, 'Laurel': 0.9, 'West Oakland': 0.7, 'Fruitvale': 1.0, 'Jack London': 1.1, 'Rockridge': 1.2, 'Adams Point': 0.8, 'Grand Lake': 1.1, 'Piedmont Ave': 1.0, 'Chinatown': 1.0, 'Brooklyn': 0.7, 'Eastlake': 0.8, 'Glenview': 0.7, 'Dimond': 0.8, 'Ivy Hill': 0.5, 'San Antonio': 0.8, 'KONO': 1.1, 'Lake Merritt': 1.0, 'Uptown': 1.2, 'Baylight District': 0.5, 'East Oakland': 0.8 }; // v3NeighborhoodWriter @ b58d8a2b
(async () => {
  const bk = require('/root/GodWorld/output/engine-sheet/2026-09-19-crime-metrics-live-pre-recalibration-c107.json');
  const BH = bk[0]; const oldCM = {}; bk.slice(1).forEach(r => { oldCM[r[0]] = { p: +r[BH.indexOf('PropertyCrimeIndex')], v: +r[BH.indexOf('ViolentCrimeIndex')] }; });
  const cm = await sheets.getSheetAsObjects('Crime_Metrics'); const newCM = {}; cm.forEach(r => { newCM[r.Neighborhood] = { p: +r.PropertyCrimeIndex, v: +r.ViolentCrimeIndex }; });
  // NOT idempotent: it reads the CURRENT readings as the old ones. After the apply, the pre-write
  // tab is the only valid "before" — --verify recomputes from it and compares to live; --apply
  // refuses once that backup exists.
  const BACKUP = '/root/GodWorld/output/engine-sheet/2026-09-19-neighborhood-map-live-pre-recalibration.json';
  const VERIFY = process.argv.includes('--verify');
  if (APPLY && fs.existsSync(BACKUP)) throw new Error('already applied (backup exists) — refusing a second transform; use --verify');
  const live = await sheets.getSheetData('Neighborhood_Map');
  const raw = VERIFY ? JSON.parse(fs.readFileSync(BACKUP, 'utf8')) : live; const H = raw[0];
  const col = n => H.indexOf(n); const L = i => { let s = ''; i++; while (i > 0) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };
  const iH = col('Neighborhood'), iC = col('CrimeIndex'), iR = col('RetailVitality'), iCy = col('Cycle');
  // canon retailMod via the deployed writer code on the live canon columns + tracked employer depth
  const w = { console, Logger: { log() {} } }; vm.createContext(w); vm.runInContext(fs.readFileSync('/root/GodWorld/phase08-v3-chicago/v3NeighborhoodWriter.js', 'utf8'), w);
  const S = { neighborhoodState: {}, hoodEmployerDepth: {}, sportsZones: [] };
  raw.slice(1).forEach(r => { S.neighborhoodState[r[iH]] = { employerCharacter: r[col('EmployerCharacter')], medianIncome: +r[col('MedianIncome')], boomIndex: +r[col('BoomIndex')] }; });
  const biz = await sheets.getSheetAsObjects('Business_Ledger');
  biz.forEach(b => { const h = b.Neighborhood; if (!S.neighborhoodState[h]) return; (S.hoodEmployerDepth[h] = S.hoodEmployerDepth[h] || { employees: 0 }).employees += +b.Employee_Count || 0; });
  const city = w.hoodCharacterCity_(S, w.NMAP_NEIGHBORHOODS);
  const updates = [];
  for (let r = 1; r < raw.length; r++) {
    const h = raw[r][iH]; if (!h || !oldCM[h] || !newCM[h] || !OLD_RETAIL_MOD[h]) continue;
    const oldCI = +raw[r][iC], oldR = +raw[r][iR];
    const ci = Math.round(((newCM[h].p + newCM[h].v) / 2 / 50 + (oldCI - (oldCM[h].p + oldCM[h].v) / 2 / 50)) * 100) / 100;
    const mod = w.hoodProfileFromCanon_(h, S, city).retailMod;
    const rv = Math.round(oldR * mod / OLD_RETAIL_MOD[h] * 100) / 100;
    console.log(h.padEnd(18), 'cycle', raw[r][iCy], '| CrimeIndex', oldCI, '->', ci, '| RetailVitality', oldR, '->', rv);
    updates.push({ range: `Neighborhood_Map!${L(iC)}${r + 1}`, values: [[ci]] }, { range: `Neighborhood_Map!${L(iR)}${r + 1}`, values: [[rv]] });
  }
  if (VERIFY) {
    const LH = live[0], lc = LH.indexOf('CrimeIndex'), lr = LH.indexOf('RetailVitality'), lh = LH.indexOf('Neighborhood');
    const want = {}; for (let u = 0; u < updates.length; u += 2) { const row = Number(updates[u].range.match(/(\d+)$/)[1]); want[row] = [updates[u].values[0][0], updates[u + 1].values[0][0]]; }
    let ok = 0, bad = 0;
    for (const row in want) { const r = live[row - 1]; if (Number(r[lc]) === want[row][0] && Number(r[lr]) === want[row][1]) ok++; else { bad++; console.log('MISMATCH', r[lh], r[lc], r[lr], 'want', want[row]); } }
    console.log('verify against the pre-write backup:', ok, 'match,', bad, 'mismatch');
    return;
  }
  console.log(updates.length / 2, 'hoods;', APPLY ? 'APPLYING' : 'dry-run (no writes)');
  if (!APPLY) return;
  fs.writeFileSync('/root/GodWorld/output/engine-sheet/2026-09-19-neighborhood-map-live-pre-recalibration.json', JSON.stringify(raw));
  await sheets.batchUpdate(updates);
  console.log('written; backup of the pre-write tab saved');
})().catch(e => console.log('ERR', e.message));
