// engine.214 Cut B: dial-predicted with:against per trajectory side from a sheet (usage: node 2026-10-20-e214b-predict.js <sheetId>; baseline 1Mbz-sE13iu1RU4qo-rzsczjjPRKAU-KSfnQnrJNXCgA, bench 1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA)
// dial-predicted with:against for Cut B at C113 from BASELINE-1004-C112b (map + DialState), equal participation assumed
require('/root/GodWorld/lib/env');
process.env.GODWORLD_SHEET_ID = process.argv[2];
global.Logger = { log() {} };
const E = require('/root/GodWorld/utilities/citizenMemory.js'); Object.keys(E).forEach(k => { global[k] = E[k]; });
const C = require('/root/GodWorld/utilities/compressLifeHistory.js');
const sh = require('/root/GodWorld/lib/sheets');
const pw = (b, i) => Math.min(6, b * (1 + 4 * Math.max(0, Math.min(1, i))));
(async () => {
  const nm = await sh.getSheetData('Neighborhood_Map'), h = nm[0];
  const T = {}; nm.slice(1).forEach(r => { const t = String(r[h.indexOf('NeighborhoodTrajectory')]).toLowerCase(), m = Number(r[h.indexOf('TrajectoryMomentum')]); if (t === 'growth' || t === 'decay') T[r[h.indexOf('Neighborhood')]] = { t, M: pw(1.1, Math.abs(m - 5) / 5) + pw(1.0, Math.abs(m - 5) / 5) }; });
  const sl = await sh.getSheetData('Simulation_Ledger'), s = sl[0];
  const acc = { growth: { w: 0, a: 0, n: 0, base: 0 }, decay: { w: 0, a: 0, n: 0, base: 0 } }; const mm = { composure: [], sociability: [], warmth: [] };
  for (const r of sl.slice(1)) {
    const hood = r[s.indexOf('Neighborhood')], st = T[hood]; if (!st || r[s.indexOf('Status')] !== 'Active') continue;
    const b = C.getCitizenDialBands_({ citizenLookup: {} }, r[s.indexOf('POPID')], r[s.indexOf('DialState')] || '');
    const m = b ? b.mult : { composure: 1, sociability: 1, warmth: 1 };
    ['composure', 'sociability', 'warmth'].forEach(d => mm[d].push(m[d]));
    const cx = 2 - m.composure, M = st.M, o = acc[st.t]; o.n++; o.base += M;
    if (st.t === 'growth') { o.w += Math.min(6, M / 3 * m.sociability) + Math.min(6, M / 3 * m.warmth); o.a += 2 * Math.min(6, M / 6 * cx); }
    else { o.w += 2 * Math.min(6, M / 3 * cx); o.a += Math.min(6, M / 6 * m.warmth) + Math.min(6, M / 6 * m.sociability); }
  }
  const mean = a => (a.reduce((x, y) => x + y, 0) / a.length).toFixed(3);
  console.log('mean mult in trajectory hoods: composure', mean(mm.composure), '(complain x', (2 - mean(mm.composure)).toFixed(3) + ')', 'sociability', mean(mm.sociability), 'warmth', mean(mm.warmth));
  for (const k of ['growth', 'decay']) { const o = acc[k]; console.log(k, 'citizens', o.n, 'with:against', (o.w / o.a).toFixed(2) + ':1', 'effective/base', ((o.w + o.a) / o.base).toFixed(3)); }
  const W = acc.growth.w + acc.decay.w, A = acc.growth.a + acc.decay.a; console.log('all', 'with:against', (W / A).toFixed(2) + ':1');
})();
