// engine.214 8a Cut B paired receipt for one bench fire (plan step 8, recheck 3 acceptance): per trajectory hood,
// eligible citizens, base and effective offer, drawn trajectory lines by reaction / sign / dial band, share of the hood's
// generator lines, saved Sentiment, and the Cycle's full LifeHistory line-set sha. Pre-fire state (trajectory, momentum,
// DialState, hood) comes from BASELINE-1004-C112b, the copy both legs reset from. Not measured: the whole-pool weight a
// citizen saw and the recent-text filter (per-citizen memory) — reported as such, not estimated.
// usage: node 2026-10-20-e214b-receipt.js <cycle> <label>  → output/engine-sheet/2026-10-20-e214b-receipt-<label>-c<cycle>.{json,lines.tsv}
require('/root/GodWorld/lib/env');
const BENCH = '1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA', BASE = '1Mbz-sE13iu1RU4qo-rzsczjjPRKAU-KSfnQnrJNXCgA';
const LIVE = process.env.GODWORLD_SHEET_ID;
if (LIVE === BENCH || LIVE === BASE) throw new Error('env already points at a bench sheet');
const fs = require('fs'), crypto = require('crypto');
global.Logger = { log() {} };
const E = require('/root/GodWorld/utilities/citizenMemory.js'); Object.keys(E).forEach(k => { global[k] = E[k]; });
const C = require('/root/GodWorld/utilities/compressLifeHistory.js');
const cyc = Number(process.argv[2]), label = process.argv[3] || 'receipt';
const pw = (b, i) => Math.min(6, b * (1 + 4 * Math.max(0, Math.min(1, i))));
// [text needle, reaction, sign, dial]; dial '-composure' = 2 − composure multiplier
const B_LINES = [
  ['caught themselves bragging a little about the neighborhood lately', 'brag', 'up', 'sociability'],
  ['felt quietly lucky to call ', 'humble', 'up', 'warmth'],
  ['grumbled about the neighborhood over coffee', 'complain', 'down', '-composure'],
  ['griped about ', 'complain', 'down', '-composure'],
  ["complained about the neighborhood to anyone who'd listen", 'complain', 'down', '-composure'],
  ['vented about ', 'complain', 'down', '-composure'],
  ['shrugged off the grumbling about ', 'humble', 'up', 'warmth'],
  ['stuck up for the neighborhood to a friend across town', 'defend', 'up', 'sociability']
];
const A_LINES = [
  ['noticed another new spot opening up in ', 'A:new-spot', 'up', null], ['caught themselves bragging a little about the neighborhood lately', 'A:brag', 'up', null],
  ['walked past a storefront that never reopened in ', 'A:storefront', 'down', null], ["where the block's energy went", 'A:block-energy', 'down', null]
];
const SET = { growth: { up: 2 / 3, down: 1 / 3 }, decay: { down: 2 / 3, up: 1 / 3 } };
async function tab(id, name) { process.env.GODWORLD_SHEET_ID = id; delete require.cache[require.resolve('/root/GodWorld/lib/sheets')]; return require('/root/GodWorld/lib/sheets').getSheetData(name); }
(async () => {
  const bnm = await tab(BASE, 'Neighborhood_Map'), bh = bnm[0];
  const traj = {};
  bnm.slice(1).forEach(r => {
    const t = String(r[bh.indexOf('NeighborhoodTrajectory')] || '').toLowerCase(), m = Number(r[bh.indexOf('TrajectoryMomentum')]);
    const mi = isNaN(m) ? 0 : Math.abs(m - 5) / 5;
    if (t === 'growth' || t === 'decay') traj[r[bh.indexOf('Neighborhood')]] = { trajectory: t, momentum: m, mi, mass: pw(1.1, mi) + pw(1.0, mi) };
  });
  const bsl = await tab(BASE, 'Simulation_Ledger'), sh = bsl[0];
  const cit = {};
  bsl.slice(1).forEach(r => {
    cit[r[sh.indexOf('POPID')]] = { hood: r[sh.indexOf('Neighborhood')], status: r[sh.indexOf('Status')], dial: r[sh.indexOf('DialState')] || '', trait: String(r[sh.indexOf('TraitProfile')] || '') };
  });
  const bands = (pop) => { const ctx = { citizenLookup: {} }; return C.getCitizenDialBands_(ctx, pop, cit[pop].dial); };
  const nm = await tab(BENCH, 'Neighborhood_Map'), h = nm[0];
  const sent = {}; nm.slice(1).forEach(r => { sent[r[h.indexOf('Neighborhood')]] = Number(r[h.indexOf('Sentiment')]); });
  const lh = await tab(BENCH, 'LifeHistory_Log'), lhh = lh[0];
  const iC = lhh.indexOf('Cycle'), iT = lhh.indexOf('EventTag'), iX = lhh.indexOf('EventText'), iP = lhh.indexOf('POPID');
  const rows = lh.slice(1).filter(r => Number(String(r[iC]).replace(/^C/, '')) === cyc);
  const lines = rows.map(r => [r[iP], r[iT], r[iX]].join('\t')).sort();
  const sha = crypto.createHash('sha256').update(lines.join('\n')).digest('hex');
  const out = {};
  for (const hood of Object.keys(traj)) {
    const t = traj[hood], pops = Object.keys(cit).filter(p => cit[p].hood === hood && cit[p].status === 'Active');
    let eff = 0, effN = 0, reflective = 0;
    for (const p of pops) {
      const b = bands(p);
      const rf = /(?:^|\|)reflective:([0-9.]+)/.exec(cit[p].trait); if (rf && Number(rf[1]) >= 0.6) reflective++; // generateCitizensEvents.js archetype text boost
      if (!b) continue; effN++;
      // B effective offer: four entries, each side's share split in two, times its dial, clamped at 6
      const ents = t.trajectory === 'growth'
        ? [['up', 'sociability'], ['up', 'warmth'], ['down', '-composure'], ['down', '-composure']]
        : [['down', '-composure'], ['down', '-composure'], ['up', 'warmth'], ['up', 'sociability']];
      for (const [sgn, dial] of ents) {
        const w = t.mass * SET[t.trajectory][sgn] / 2;
        const mult = dial === '-composure' ? 2 - b.mult.composure : b.mult[dial];
        eff += Math.min(6, w * mult);
      }
    }
    out[hood] = { trajectory: t.trajectory, momentum: t.momentum, mi: t.mi, activeCitizens: pops.length, baseOfferPerCitizen: +t.mass.toFixed(3),
      bEffectiveOfferMean: effN ? +(eff / effN).toFixed(3) : null, withDialState: effN, aReflectiveTextBoostCitizens: reflective,
      generatorCitizens: 0, generatorLines: 0, drawn: {}, drawnBySign: { up: 0, down: 0 }, drawnByBand: {}, graded: { Up: 0, Down: 0, other: 0 }, sentimentSaved: sent[hood] };
  }
  const gcit = {};
  for (const r of rows) {
    const pop = r[iP], c = cit[pop]; if (!c || !out[c.hood]) continue;
    const tag = String(r[iT] || ''), text = String(r[iX] || ''), o = out[c.hood];
    if (tag.indexOf('|source:') >= 0) { o.generatorLines++; if (!gcit[pop]) { gcit[pop] = 1; o.generatorCitizens++; } }
    const hit = B_LINES.concat(A_LINES).find(l => text.indexOf(l[0]) >= 0 && (l[0].slice(-1) !== ' ' || text.indexOf(l[0] + c.hood) >= 0));
    if (!hit) continue;
    o.drawn[hit[1]] = (o.drawn[hit[1]] || 0) + 1; o.drawnBySign[hit[2]]++;
    const g = /^Neighborhood-[A-Z][a-z]+-(Up|Down)-[SML]/.exec(tag); o.graded[g ? g[1] : 'other']++;
    if (hit[3]) {
      const b = bands(pop), band = b ? (hit[3] === '-composure' ? 'composure' : hit[3]) + ':' + b.bands[hit[3] === '-composure' ? 'composure' : hit[3]] : 'no-dial';
      o.drawnByBand[hit[1] + ' ' + band] = (o.drawnByBand[hit[1] + ' ' + band] || 0) + 1;
    }
  }
  const base = '/root/GodWorld/output/engine-sheet/2026-10-20-e214b-receipt-' + label + '-c' + cyc;
  fs.writeFileSync(base + '.lines.tsv', lines.join('\n') + '\n');
  fs.writeFileSync(base + '.json', JSON.stringify({ cycle: cyc, label, lifeHistoryRows: rows.length, linesSha256: sha,
    notMeasured: 'whole-pool weight per citizen; recent-text filter availability (per-citizen memory)', hoods: out }, null, 1));
  const tot = Object.values(out).reduce((a, o) => { a.up += o.drawnBySign.up; a.down += o.drawnBySign.down; return a; }, { up: 0, down: 0 });
  console.log(label + ' C' + cyc + ': ' + rows.length + ' LifeHistory rows, sha ' + sha.slice(0, 16) + ', trajectory lines drawn up ' + tot.up + ' / down ' + tot.down + ' over ' + Object.keys(out).length + ' hoods');
})().catch(e => { console.error(e.stack || e.message); process.exit(1); });
