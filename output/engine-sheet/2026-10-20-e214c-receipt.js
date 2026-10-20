// engine.214 8a Cut C receipt for one bench fire (codex Cut C recheck, reach hunt): per hood — active citizens, their spots
// (open food / retail Business_Ledger rows of BASELINE-1004-C112b, folded to the parent hood) with holders by the generator's
// own spotRank_, each spot's state this Cycle (streak from the bench's post-fire PREV_CYCLE_STATE_JSON, last Cycle's from the
// bench ring (the baseline's C112 after a reset), the four chaos outcomes from the bench Chaos_Cars rows), citizens eligible per state, spot lines drawn per event,
// the drawn name vs the citizen's computed spot, graded tags, saved Sentiment, and the Cycle's LifeHistory line-set sha.
// Not observable from the sheets: the game-week lift (barTerm is not persisted) — lift lines are counted as drawn only.
// usage: node 2026-10-20-e214c-receipt.js <cycle> <label>  → output/engine-sheet/2026-10-20-e214c-receipt-<label>-c<cycle>.{json,lines.tsv}
require('/root/GodWorld/lib/env');
const BENCH = '1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA', BASE = '1Mbz-sE13iu1RU4qo-rzsczjjPRKAU-KSfnQnrJNXCgA';
if (process.env.GODWORLD_SHEET_ID === BENCH || process.env.GODWORLD_SHEET_ID === BASE) throw new Error('env already points at a bench sheet');
const fs = require('fs'), crypto = require('crypto');
global.Logger = { log() {} };
const BD = require('/root/GodWorld/phase05-citizens/applyBusinessDynamics.js');
const genSrc = fs.readFileSync('/root/GodWorld/phase05-citizens/generateCitizensEvents.js', 'utf8');
const spotRank_ = new Function(genSrc.match(/function spotRank_[\s\S]*?\n}\n/)[0] + '\nreturn spotRank_;')();
const cyc = Number(process.argv[2]), label = process.argv[3] || 'receipt';
const EVENTS = [['had a small fire this week', 'minor_fire'], ['had a fire this week — contained', 'major_blaze_contained'],
  ['went dark when a transformer blew', 'transformer_blowout'], ['was temporarily shut pending an inspection', 'forced_temporary_closure'],
  ['go quiet lately', 'quiet'], ['let some staff go', 'shed'], ['steadier again', 'recovery'], ['felt a lift at ', 'lift']];
const FOUR = { minor_fire: 1, major_blaze_contained: 1, transformer_blowout: 1, forced_temporary_closure: 1 };
const num = (v) => Number(String(v).replace(/^C/, ''));
async function tab(id, name) { process.env.GODWORLD_SHEET_ID = id; delete require.cache[require.resolve('/root/GodWorld/lib/sheets')]; return require('/root/GodWorld/lib/sheets').getSheetData(name); }
async function blob(id, cycle) {
  const cf = await tab(id, 'Carry_Forward_Store');
  const r = cf.slice(1).find(x => x[0] === 'PREV_CYCLE_STATE_JSON' && num(x[1]) === cycle);
  return r ? (JSON.parse(r[3]).businessDynamics || {}) : null;
}
(async () => {
  const bnm = await tab(BASE, 'Neighborhood_Map'), bh = bnm[0];
  const canon = {}, child = {};
  bnm.slice(1).forEach(r => {
    const hood = String(r[bh.indexOf('Neighborhood')]).trim(); canon[hood.toLowerCase()] = hood;
    String(r[bh.indexOf('ChildAreas')] || '').split(',').map(s => s.trim()).filter(Boolean).forEach(c => { if (!child[c.toLowerCase()]) child[c.toLowerCase()] = hood; });
  });
  const fold = (h) => { const k = String(h || '').trim().toLowerCase(); return canon[k] || child[k] || null; };
  const prev = (await blob(BENCH, cyc - 1)) || (await blob(BASE, cyc - 1)), now = await blob(BENCH, cyc);   // after a reset the bench ring carries the baseline's C112
  if (!prev || !now) throw new Error('carry-forward blob missing: base C' + (cyc - 1) + ' ' + !!prev + ', bench C' + cyc + ' ' + !!now);
  const cc = await tab(BENCH, 'Chaos_Cars'), ch = cc[0], chaos = {};
  cc.slice(1).forEach(r => {
    if (num(r[ch.indexOf('CycleId')]) !== cyc || r[ch.indexOf('TargetScope')] !== 'business' || !FOUR[r[ch.indexOf('DiceOutcome')]]) return;
    (chaos[r[ch.indexOf('TargetId')]] = chaos[r[ch.indexOf('TargetId')]] || []).push(r[ch.indexOf('DiceOutcome')]);
  });
  const bl = await tab(BASE, 'Business_Ledger'), bbh = bl[0];
  const spots = {};
  bl.slice(1).forEach(r => {
    const id = String(r[bbh.indexOf('BIZ_ID')] || '').trim(), name = String(r[bbh.indexOf('Name')] || '').trim();
    const cls = BD.bizSectorClass_(r[bbh.indexOf('Sector')]), hood = fold(r[bbh.indexOf('Neighborhood')]);
    const st = now[id] || [0, 0, 0], ps = prev[id] || [0, 0, 0];
    if (!id || !name || !hood || (cls !== 'food' && cls !== 'retail') || ps[2] || st[2]) return;   // wind-down or closed this Cycle: no spot
    const streak = Number(st[0]) || 0, prevStreak = Number(ps[0]) || 0, ev = (chaos[id] || []).slice();
    if (streak >= 2) ev.push('quiet');
    if (streak > 4) ev.push('shed');
    if (prevStreak >= 2 && streak === 0) ev.push('recovery');
    (spots[hood] = spots[hood] || []).push({ id, name, cls, streak, prevStreak, events: ev, holders: 0 });
  });
  const sl = await tab(BASE, 'Simulation_Ledger'), sh = sl[0], cit = {};
  sl.slice(1).forEach(r => {
    if (r[sh.indexOf('Status')] !== 'Active') return;
    const pop = r[sh.indexOf('POPID')], hood = fold(r[sh.indexOf('Neighborhood')]) || String(r[sh.indexOf('Neighborhood')] || '');
    let best = null, br = -1;
    for (const s of spots[hood] || []) { const rk = spotRank_(pop, s.id); if (rk > br || (rk === br && s.id < best.id)) { best = s; br = rk; } }
    if (best) best.holders++;
    cit[pop] = { hood, spot: best };
  });
  const nm = await tab(BENCH, 'Neighborhood_Map'), h = nm[0], sent = {};
  nm.slice(1).forEach(r => { sent[r[h.indexOf('Neighborhood')]] = Number(r[h.indexOf('Sentiment')]); });
  const lh = await tab(BENCH, 'LifeHistory_Log'), lhh = lh[0];
  const iC = lhh.indexOf('Cycle'), iT = lhh.indexOf('EventTag'), iX = lhh.indexOf('EventText'), iP = lhh.indexOf('POPID');
  const rows = lh.slice(1).filter(r => num(r[iC]) === cyc);
  const lines = rows.map(r => [r[iP], r[iT], r[iX]].join('\t')).sort();
  const sha = crypto.createHash('sha256').update(lines.join('\n')).digest('hex');
  const out = {};
  for (const hood of Object.keys(spots).sort()) {
    const eligible = {};
    spots[hood].forEach(s => s.events.forEach(e => { eligible[e] = (eligible[e] || 0) + s.holders; }));
    out[hood] = { activeCitizens: Object.values(cit).filter(c => c.hood === hood).length, spots: spots[hood].map(s => ({ id: s.id, name: s.name, cls: s.cls, holders: s.holders, streak: s.streak, prevStreak: s.prevStreak, events: s.events })),
      eligibleByEvent: eligible, drawnByEvent: {}, drawnNotTheirSpot: 0, graded: { Up: 0, Down: 0, other: 0 }, sentimentSaved: sent[hood] };
  }
  let total = 0; const strays = [];
  for (const r of rows) {
    const text = String(r[iX] || ''), hit = EVENTS.find(([n]) => text.indexOf(n) >= 0); if (!hit) continue;
    const c = cit[r[iP]]; total++;
    if (!c || !out[c.hood]) { strays.push(r[iP] + ' ' + text); continue; }
    const o = out[c.hood]; o.drawnByEvent[hit[1]] = (o.drawnByEvent[hit[1]] || 0) + 1;
    if (!c.spot || text.indexOf(c.spot.name) < 0) o.drawnNotTheirSpot++;
    const g = /^Neighborhood-Outabout-(Up|Down)-[SML]/.exec(String(r[iT] || '')); o.graded[g ? g[1] : 'other']++;
  }
  const base = '/root/GodWorld/output/engine-sheet/2026-10-20-e214c-receipt-' + label + '-c' + cyc;
  fs.writeFileSync(base + '.lines.tsv', lines.join('\n') + '\n');
  fs.writeFileSync(base + '.json', JSON.stringify({ cycle: cyc, label, lifeHistoryRows: rows.length, linesSha256: sha, spotLinesDrawn: total,
    spotLinesOutsideAKnownCitizen: strays, chaosOnSpotsThisCycle: chaos, notObservable: 'game-week lift eligibility (barTerm not persisted); whole-pool weight per citizen (see the draw probe)', hoods: out }, null, 1));
  const ev = {}; Object.values(out).forEach(o => Object.entries(o.drawnByEvent).forEach(([k, v]) => { ev[k] = (ev[k] || 0) + v; }));
  const el = {}; Object.values(out).forEach(o => Object.entries(o.eligibleByEvent).forEach(([k, v]) => { el[k] = (el[k] || 0) + v; }));
  const wrong = Object.values(out).reduce((n, o) => n + o.drawnNotTheirSpot, 0);
  console.log(label + ' C' + cyc + ': ' + rows.length + ' LifeHistory rows, sha ' + sha.slice(0, 16) + ', spot lines drawn ' + total + ' ' + JSON.stringify(ev) +
    ', eligible citizens ' + JSON.stringify(el) + ', not their spot ' + wrong + ', strays ' + strays.length);
})().catch(e => { console.error(e.stack || e.message); process.exit(1); });
