// engine.301 F1 bench receipt (plan 2026-10-10-engine-214 §engine.301 F1; codex plan review 2026-10-25 §2-§4). Read-only on SANDBOX 1004.
// Per Cycle C (run after the fire of C):
//   carry   — Carry_Forward_Store PREV_CYCLE_STATE_JSON rows for C and C-1, typed: crimeSpikes array, crimeWaveHoods array of strings.
//             HOLD on a missing / stale / malformed blob, a missing crimeWaveHoods key, a wave name not in C's crimeSpikes, or a wave
//             name that C-1 did not carry (it did not rise the Cycle before).
//   levels  — the ladder level Cycle C's Phase 2 read: C-1's crimeSpikes counted per hood, 3 for C-1's crimeWaveHoods.
//   rises   — Crime_Metrics now vs the previous receipt's snapshot (C113: the baseline sheet): every +5 property / violent increase
//             (pre-cap), against C's carried crimeSpikes (post-cap); qualifying rises the cap dropped are listed.
//   lines   — LifeHistory_Log rows of Cycle C carrying one of the three crime-carry texts, by the citizen's ledger hood. HOLD on any
//             line in a hood at level 0. Per-hood count reported (a pool draw: a small hood may draw none).
//   receipt — Ripple_Ledger causeType crime rows of Cycle C: the hoods at level >= 2, magnitude = max level, a wave hood named
//             "rising two Cycles running". HOLD on a mismatch.
//   errors  — Engine_Errors rows of Cycle C.
// --final <from>: the window summary (rises, rung-2 hoods, waves, max simultaneous level 3) over the saved receipts <from>..C.
// Writes nothing to any sheet; saves output/engine-sheet/2026-10-25-e301-receipt-<label>-c<C>.json (+ the Crime_Metrics snapshot).
// usage: node 2026-10-25-e301-receipt.js <cycle> <label> [--final <from>]
require('/root/GodWorld/lib/env');
const LIVE = process.env.GODWORLD_SHEET_ID;
const BENCH = '1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA', BASE = '1Mbz-sE13iu1RU4qo-rzsczjjPRKAU-KSfnQnrJNXCgA';
if (LIVE === BENCH || LIVE === BASE) throw new Error('env already points at a bench sheet');
const fs = require('fs');
const O = '/root/GodWorld/output/engine-sheet/';
const C = Number(process.argv[2]), label = process.argv[3];
const fi = process.argv.indexOf('--final'), from = fi > 0 ? Number(process.argv[fi + 1]) : null;
if (!(C >= 113) || !label) throw new Error('usage: <cycle> <label> [--final <from>]');
const CRIME = /took a different route home after the recent break-ins around|counted the register twice before closing up, just in case|swapped stories with a neighbor about what got taken up the block/;
async function tab(id, name) {
  process.env.GODWORLD_SHEET_ID = id; delete require.cache[require.resolve('/root/GodWorld/lib/sheets')];
  return require('/root/GodWorld/lib/sheets').getSheetData(name);
}
const col = (h, n) => { const i = h.indexOf(n); if (i < 0) throw new Error('no column ' + n + ' in [' + h.join(', ') + ']'); return i; };
const out = { cycle: C, label, hold: [] };
const HOLD = (m) => out.hold.push(m);
function blobFor(cfs, cyc) {
  const h = cfs[0], iK = col(h, 'Key'), iC = col(h, 'Cycle'), iJ = col(h, 'JSON');
  const rows = cfs.slice(1).filter(r => r[iK] === 'PREV_CYCLE_STATE_JSON' && Number(r[iC]) === cyc);
  if (rows.length !== 1) { HOLD('PREV_CYCLE_STATE_JSON for C' + cyc + ': ' + rows.length + ' ring rows'); return null; }
  let j; try { j = JSON.parse(rows[0][iJ]); } catch (e) { HOLD('PREV_CYCLE_STATE_JSON C' + cyc + ' does not parse: ' + e.message); return null; }
  if (Number(j.cycle) !== cyc) HOLD('PREV_CYCLE_STATE_JSON C' + cyc + ' carries cycle ' + j.cycle);
  if (!Array.isArray(j.crimeSpikes)) HOLD('C' + cyc + ' crimeSpikes is not an array');
  return j;
}
(async () => {
  const cfs = await tab(BENCH, 'Carry_Forward_Store');
  const now = blobFor(cfs, C), prev = blobFor(cfs, C - 1);
  if (!now || !prev) return finish();
  if (!Array.isArray(now.crimeWaveHoods) || !now.crimeWaveHoods.every(x => typeof x === 'string' && x)) HOLD('C' + C + ' crimeWaveHoods missing or malformed: ' + JSON.stringify(now.crimeWaveHoods));
  const spikeHoods = j => (j.crimeSpikes || []).map(s => s && s.neighborhood).filter(Boolean);
  const prevCarried = new Set(spikeHoods(prev).concat(Array.isArray(prev.crimeWaveHoods) ? prev.crimeWaveHoods : []));
  for (const w of (now.crimeWaveHoods || [])) {
    if (!spikeHoods(now).includes(w)) HOLD('wave ' + w + ' is not in C' + C + ' crimeSpikes');
    if (!prevCarried.has(w)) HOLD('wave ' + w + ' did not rise at C' + (C - 1));
  }
  // the levels C's Phase 2 read (from C-1's carry)
  const levels = {};
  for (const h of spikeHoods(prev)) levels[h] = (levels[h] || 0) + 1;
  for (const w of (Array.isArray(prev.crimeWaveHoods) ? prev.crimeWaveHoods : [])) levels[w] = 3;
  out.levels = levels;
  out.carry = { crimeSpikes: now.crimeSpikes, crimeWaveHoods: now.crimeWaveHoods };
  // pre-cap rises from Crime_Metrics deltas
  const cm = await tab(BENCH, 'Crime_Metrics'); const ch = cm[0];
  const iN = col(ch, 'Neighborhood'), iP = col(ch, 'PropertyCrimeIndex'), iV = col(ch, 'ViolentCrimeIndex'), iU = col(ch, 'LastUpdated');
  const snapNow = {}; for (const r of cm.slice(1)) if (r[iN]) snapNow[r[iN]] = { p: Number(r[iP]), v: Number(r[iV]), u: Number(r[iU]) };
  fs.writeFileSync(O + '2026-10-25-e301-crime-' + label + '-c' + C + '.json', JSON.stringify(snapNow));
  let snapPrev;
  const prevFile = O + '2026-10-25-e301-crime-' + label + '-c' + (C - 1) + '.json';
  if (fs.existsSync(prevFile)) snapPrev = JSON.parse(fs.readFileSync(prevFile, 'utf8'));
  else if (C === 113) { const b = await tab(BASE, 'Crime_Metrics'); snapPrev = {}; for (const r of b.slice(1)) if (r[iN]) snapPrev[r[iN]] = { p: Number(r[iP]), v: Number(r[iV]) }; }
  else HOLD('no Crime_Metrics snapshot for C' + (C - 1));
  const rises = [];
  if (snapPrev) for (const h in snapNow) {
    const a = snapPrev[h]; if (!a) continue;
    if (snapNow[h].p - a.p >= 5) rises.push(h + ' property +' + +(snapNow[h].p - a.p).toFixed(2));
    if (snapNow[h].v - a.v >= 5) rises.push(h + ' violent +' + +(snapNow[h].v - a.v).toFixed(2));
  }
  out.risesPreCap = rises;
  const carriedKeys = new Set((now.crimeSpikes || []).map(s => s.neighborhood + ' ' + (s.metric === 'violentCrime' ? 'violent' : 'property')));
  out.risesDroppedByCap = rises.filter(r => !carriedKeys.has(r.replace(/ \+[\d.]+$/, '')));
  if (Object.values(snapNow).some(x => x.u !== C)) HOLD('Crime_Metrics LastUpdated is not C' + C + ' on every row');
  // crime-carry lines by the citizen's ledger hood
  const sl = await tab(BENCH, 'Simulation_Ledger'); const sh = sl[0];
  const hoodOf = {}; const iPop = col(sh, 'POPID'), iHood = col(sh, 'Neighborhood');
  for (const r of sl.slice(1)) hoodOf[r[iPop]] = r[iHood];
  const lh = await tab(BENCH, 'LifeHistory_Log'); const lhh = lh[0];
  const iLP = col(lhh, 'POPID'), iLT = col(lhh, 'EventText'), iLC = col(lhh, 'Cycle'), iLG = col(lhh, 'EventTag');
  const lines = {}, tags = new Set(); let n = 0;
  for (const r of lh.slice(1)) {
    if (Number(r[iLC]) !== C || !CRIME.test(String(r[iLT]))) continue;
    n++; const hood = hoodOf[r[iLP]] || '(no ledger hood)'; lines[hood] = (lines[hood] || 0) + 1; tags.add(r[iLG]);
    if (!(levels[hood] >= 1)) HOLD('crime-carry line in ' + hood + ' at level 0: ' + r[iLP] + ' ' + String(r[iLT]).slice(0, 80));
  }
  out.lines = { total: n, byHood: lines, tags: [...tags] };
  // the crime receipt
  const rl = await tab(BENCH, 'Ripple_Ledger'); const rh = rl[0];
  const iRC = col(rh, 'Cycle'), iRT = col(rh, 'CauseType'), iRS = col(rh, 'SourceEngine'), iRI = col(rh, 'TargetIds'), iRM = col(rh, 'Magnitude'), iRD = col(rh, 'CauseDetail');
  const rows = rl.slice(1).filter(r => Number(r[iRC]) === C && r[iRT] === 'crime' && /applyCrimeLadder_/.test(String(r[iRS])));
  const atTwo = Object.keys(levels).filter(h => levels[h] >= 2).sort();
  out.receipt = rows.map(r => ({ targets: String(r[iRI]), magnitude: r[iRM], detail: String(r[iRD]) }));
  if (atTwo.length === 0 && rows.length) HOLD('crime receipt with no hood at level >= 2');
  if (atTwo.length) {
    if (rows.length !== 1) HOLD(rows.length + ' crime receipts for ' + atTwo.join(', '));
    else {
      const t = String(rows[0][iRI]).split(/[|,]\s*/).filter(Boolean).sort();
      if (t.join() !== atTwo.join()) HOLD('receipt targets ' + t.join() + ' vs level>=2 ' + atTwo.join());
      if (Number(rows[0][iRM]) !== Math.max(...atTwo.map(h => levels[h]))) HOLD('receipt magnitude ' + rows[0][iRM]);
      for (const w of (prev.crimeWaveHoods || [])) if (!new RegExp(w + '[^;]*rising two Cycles running').test(String(rows[0][iRD]))) HOLD('receipt does not name ' + w + ' as rising two Cycles running');
    }
  }
  const ee = await tab(BENCH, 'Engine_Errors'); const eh = ee[0];
  out.engineErrors = ee.slice(1).filter(r => Number(r[col(eh, 'Cycle')]) === C).map(r => String(r[col(eh, 'Phase')]) + ': ' + String(r[col(eh, 'Error')]).slice(0, 120));
  out.level3 = Object.keys(levels).filter(h => levels[h] === 3);
  finish();
})().catch(e => { console.error(e.stack || e.message); process.exit(1); });
function finish() {
  fs.writeFileSync(O + '2026-10-25-e301-receipt-' + label + '-c' + C + '.json', JSON.stringify(out, null, 1));
  const L = out.levels || {};
  console.log('C' + C + ' ' + (out.hold.length ? 'HOLD' : 'PASS') + ' | levels ' + JSON.stringify(L) + ' | carried spikes ' +
    ((out.carry && out.carry.crimeSpikes) || []).length + ' waves ' + JSON.stringify((out.carry && out.carry.crimeWaveHoods) || null) +
    ' | rises pre-cap ' + (out.risesPreCap || []).length + ' dropped ' + (out.risesDroppedByCap || []).length +
    ' | lines ' + JSON.stringify(out.lines || {}) + ' | receipt ' + (out.receipt || []).length + ' | EE ' + (out.engineErrors || []).length);
  for (const h of out.hold) console.log('  HOLD ' + h);
  if (from) {
    const win = [];
    for (let c = from; c <= C; c++) { const f = O + '2026-10-25-e301-receipt-' + label + '-c' + c + '.json'; if (fs.existsSync(f)) win.push(JSON.parse(fs.readFileSync(f, 'utf8'))); }
    const sum = { cycles: win.length, holds: win.filter(w => w.hold.length).length,
      rises: win.reduce((a, w) => a + (w.risesPreCap || []).length, 0), droppedByCap: win.reduce((a, w) => a + (w.risesDroppedByCap || []).length, 0),
      rung2HoodCycles: win.reduce((a, w) => a + Object.values(w.levels || {}).filter(v => v === 2).length, 0),
      waveHoodCycles: win.reduce((a, w) => a + (w.level3 || []).length, 0), maxSimultaneousWaves: Math.max(0, ...win.map(w => (w.level3 || []).length)),
      crimeLines: win.reduce((a, w) => a + ((w.lines && w.lines.total) || 0), 0), cyclesWithLines: win.filter(w => w.lines && w.lines.total).length,
      engineErrors: win.reduce((a, w) => a + (w.engineErrors || []).length, 0) };
    console.log('WINDOW C' + from + '-C' + C + ' ' + JSON.stringify(sum));
    fs.writeFileSync(O + '2026-10-25-e301-window-' + label + '-c' + from + '-c' + C + '.json', JSON.stringify(sum, null, 1));
  }
  process.exit(out.hold.length ? 1 : 0);
}
