// engine.301 F1 bench receipt (plan 2026-10-10-engine-214 §engine.301 F1; codex plan review + diff gate 1, 2026-10-25). Read-only on
// SANDBOX 1004 (and the frozen baseline for C113's Crime_Metrics start). Per Cycle C (run after the fire of C):
//   carry   — Carry_Forward_Store PREV_CYCLE_STATE_JSON rows for C and C-1, typed: one ring row each, its own cycle; crimeSpikes an
//             array of {neighborhood: string, metric: propertyCrime|violentCrime, magnitude: number}; crimeWaveHoods an array of unique
//             strings (absent allowed only on the C112 baseline blob). HOLD on any break; HOLD on a C wave not in C's crimeSpikes or not
//             in C-1's crimeSpikes (it did not rise the Cycle before).
//   levels  — the ladder level Cycle C's Phase 2 derived: C-1's spikes counted per hood, 3 for C-1's waves that C-1 also carried as a
//             spike; canon (Crime_Metrics) hoods only. The published S.crimeByNeighborhood is not persisted — its effects are read here.
//   rises   — Crime_Metrics now vs the previous receipt's snapshot (C113: the baseline sheet): every +5 property / violent increase
//             (pre-cap) against C's carried crimeSpikes (post-cap); qualifying rises the cap dropped are listed.
//   lines   — LifeHistory_Log rows of Cycle C carrying one of the three crime-carry texts, by the citizen's ledger hood. HOLD on any
//             line in a hood at level 0.
//   receipt — Ripple_Ledger crime-ladder rows of Cycle C: exactly the hoods at level >= 2, magnitude = the max level, each level-3 hood
//             named "rising two Cycles running (level 3)". HOLD on any mismatch.
//   errors  — any Engine_Errors row of Cycle C is a HOLD.
// Expectations (the probe leg): --expect-wave <hood> (level 3 at C and named in the receipt), --expect-lines <hood> (> 0 crime-carry
// lines there), --expect-carry-wave <hood> (C's carried crimeWaveHoods names it), --expect-calm <hood> (level 0 at C). Repeatable.
// --final <from>: the window summary; HOLD unless every receipt <from>..C exists and passed.
// Writes nothing to any sheet; saves output/engine-sheet/2026-10-25-e301-receipt-<label>-c<C>.json (+ the Crime_Metrics snapshot).
// usage: node 2026-10-25-e301-receipt.js <cycle> <label> [--final <from>] [--expect-wave <hood>] [--expect-lines <hood>] ...
require('/root/GodWorld/lib/env');
const LIVE = process.env.GODWORLD_SHEET_ID;
const BENCH = '1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA', BASE = '1Mbz-sE13iu1RU4qo-rzsczjjPRKAU-KSfnQnrJNXCgA';
if (LIVE === BENCH || LIVE === BASE) throw new Error('env already points at a bench sheet');
const fs = require('fs');
const O = '/root/GodWorld/output/engine-sheet/';
const argv = process.argv.slice(2);
const C = Number(argv[0]), label = argv[1];
const flag = (k) => { const v = []; argv.forEach((a, i) => { if (a === k && argv[i + 1]) v.push(argv[i + 1]); }); return v; };
const from = flag('--final').length ? Number(flag('--final')[0]) : null;
const EXPECT = { wave: flag('--expect-wave'), lines: flag('--expect-lines'), carryWave: flag('--expect-carry-wave'), calm: flag('--expect-calm') };
if (!(C >= 113) || !label || label.startsWith('--')) throw new Error('usage: <cycle> <label> [--final <from>] [--expect-* <hood>]');
const CRIME = /took a different route home after the recent break-ins around|counted the register twice before closing up, just in case|swapped stories with a neighbor about what got taken up the block/;
const METRICS = ['propertyCrime', 'violentCrime'];
async function tab(id, name) {
  process.env.GODWORLD_SHEET_ID = id; delete require.cache[require.resolve('/root/GodWorld/lib/sheets')];
  return require('/root/GodWorld/lib/sheets').getSheetData(name);
}
const col = (h, n) => { const i = h.indexOf(n); if (i < 0) throw new Error('no column ' + n + ' in [' + h.join(', ') + ']'); return i; };
const out = { cycle: C, label, expect: EXPECT, hold: [] };
const HOLD = (m) => out.hold.push(m);
function blobFor(cfs, cyc) {
  const h = cfs[0], iK = col(h, 'Key'), iC = col(h, 'Cycle'), iJ = col(h, 'JSON');
  const rows = cfs.slice(1).filter(r => r[iK] === 'PREV_CYCLE_STATE_JSON' && Number(r[iC]) === cyc);
  if (rows.length !== 1) { HOLD('PREV_CYCLE_STATE_JSON for C' + cyc + ': ' + rows.length + ' ring rows'); return null; }
  let j; try { j = JSON.parse(rows[0][iJ]); } catch (e) { HOLD('PREV_CYCLE_STATE_JSON C' + cyc + ' does not parse: ' + e.message); return null; }
  if (!j || typeof j !== 'object' || Array.isArray(j)) { HOLD('PREV_CYCLE_STATE_JSON C' + cyc + ' is not an object: ' + JSON.stringify(j)); return null; }
  if (Number(j.cycle) !== cyc) HOLD('PREV_CYCLE_STATE_JSON C' + cyc + ' carries cycle ' + j.cycle);
  if (!Array.isArray(j.crimeSpikes)) { HOLD('C' + cyc + ' crimeSpikes is not an array'); j.crimeSpikes = []; }
  if (j.crimeSpikes.length > 12) HOLD('C' + cyc + ' crimeSpikes carries ' + j.crimeSpikes.length + ' > the 12-spike cap');
  const seen = new Set();
  j.crimeSpikes.forEach((s, k) => {
    const num = (x) => typeof x === 'number' && isFinite(x);
    if (!s || typeof s !== 'object' || typeof s.neighborhood !== 'string' || !s.neighborhood || METRICS.indexOf(s.metric) < 0 || !num(s.magnitude) || !num(s.newValue))
      HOLD('C' + cyc + ' crimeSpikes[' + k + '] malformed: ' + JSON.stringify(s));
    const key = s && (s.neighborhood + '|' + s.metric);
    if (seen.has(key)) HOLD('C' + cyc + ' crimeSpikes duplicates ' + key); seen.add(key);
  });
  j.crimeSpikes = j.crimeSpikes.filter(s => s && typeof s === 'object');
  if (j.crimeWaveHoods === undefined && cyc === 112) j.crimeWaveHoods = [];   // the baseline blob predates the key
  if (!Array.isArray(j.crimeWaveHoods) || !j.crimeWaveHoods.every(x => typeof x === 'string' && x) ||
      new Set(j.crimeWaveHoods).size !== j.crimeWaveHoods.length) {
    HOLD('C' + cyc + ' crimeWaveHoods missing or malformed: ' + JSON.stringify(j.crimeWaveHoods)); j.crimeWaveHoods = [];
  }
  return j;
}
(async () => {
  const cfs = await tab(BENCH, 'Carry_Forward_Store');
  const now = blobFor(cfs, C), prev = blobFor(cfs, C - 1);
  if (!now || !prev) return finish();
  const hoodsOf = j => j.crimeSpikes.map(s => s && s.neighborhood).filter(Boolean);
  for (const w of now.crimeWaveHoods) {
    if (hoodsOf(now).indexOf(w) < 0) HOLD('wave ' + w + ' is not in C' + C + ' crimeSpikes');
    if (hoodsOf(prev).indexOf(w) < 0) HOLD('wave ' + w + ' did not rise at C' + (C - 1) + ' (not in its crimeSpikes)');
  }
  out.carry = { crimeSpikes: now.crimeSpikes, crimeWaveHoods: now.crimeWaveHoods };
  // Crime_Metrics: the canon hood list and the pre-cap rises
  const cm = await tab(BENCH, 'Crime_Metrics'); const ch = cm[0];
  const iN = col(ch, 'Neighborhood'), iP = col(ch, 'PropertyCrimeIndex'), iV = col(ch, 'ViolentCrimeIndex'), iU = col(ch, 'LastUpdated');
  const snapNow = {}; for (const r of cm.slice(1)) if (r[iN]) snapNow[r[iN]] = { p: Number(r[iP]), v: Number(r[iV]), u: Number(r[iU]) };
  // canon = the engine's own list (Phase-1 canonNeighborhoodLoader reads Neighborhood_Map); HOLD unless Crime_Metrics names the same set
  const nm = await tab(BENCH, 'Neighborhood_Map'); const canon = new Set(nm.slice(1).map(r => r[col(nm[0], 'Neighborhood')]).filter(Boolean));
  const cmSet = Object.keys(snapNow);
  if (cmSet.length !== canon.size || cmSet.some(h => !canon.has(h))) HOLD('Crime_Metrics hoods ' + cmSet.length + ' vs Neighborhood_Map canon ' + canon.size + ' disagree');
  // the levels C's Phase 2 derived (from C-1's carry), canon hoods only
  const levels = {};
  for (const h of hoodsOf(prev)) if (canon.has(h)) levels[h] = (levels[h] || 0) + 1;
  for (const w of prev.crimeWaveHoods) if (levels[w] >= 1) levels[w] = 3;
  out.levels = levels;
  fs.writeFileSync(O + '2026-10-25-e301-crime-' + label + '-c' + C + '.json', JSON.stringify(snapNow));
  let snapPrev;
  const prevFile = O + '2026-10-25-e301-crime-' + label + '-c' + (C - 1) + '.json';
  if (fs.existsSync(prevFile)) snapPrev = JSON.parse(fs.readFileSync(prevFile, 'utf8'));
  else if (C === 113) { const b = await tab(BASE, 'Crime_Metrics'); snapPrev = {}; for (const r of b.slice(1)) if (r[iN]) snapPrev[r[iN]] = { p: Number(r[iP]), v: Number(r[iV]) }; }
  else HOLD('no Crime_Metrics snapshot for C' + (C - 1));
  // the producer: every +5 rise (calculateCrimeShifts_, THRESHOLD 5) measured from the snapshots, against the carried list
  const rises = [];
  if (snapPrev) for (const h in snapNow) {
    const a = snapPrev[h]; if (!a) continue;
    if (snapNow[h].p - a.p >= 5) rises.push({ key: h + '|propertyCrime', magnitude: snapNow[h].p - a.p, newValue: snapNow[h].p });
    if (snapNow[h].v - a.v >= 5) rises.push({ key: h + '|violentCrime', magnitude: snapNow[h].v - a.v, newValue: snapNow[h].v });
  }
  rises.sort((x, y) => y.magnitude - x.magnitude);
  out.risesPreCap = rises.map(r => r.key + ' +' + r.magnitude);
  const carried = {}; for (const sp of now.crimeSpikes) carried[sp.neighborhood + '|' + sp.metric] = sp;
  const expectN = Math.min(12, rises.length), floor = rises.length > 12 ? rises[11].magnitude : -Infinity;
  out.risesDroppedByCap = rises.filter(r => !carried[r.key]).map(r => r.key + ' +' + r.magnitude);
  if (snapPrev) {
    if (now.crimeSpikes.length !== expectN) HOLD('C' + C + ' carries ' + now.crimeSpikes.length + ' spikes; the measured rises call for ' + expectN);
    for (const r of rises) {
      const c = carried[r.key];
      if (!c) { if (r.magnitude > floor) HOLD('rise ' + r.key + ' +' + r.magnitude + ' was not carried (not displaced by the cap)'); continue; }
      if (c.magnitude !== r.magnitude || c.newValue !== r.newValue) HOLD('carried ' + r.key + ' +' + c.magnitude + ' to ' + c.newValue + ' vs measured +' + r.magnitude + ' to ' + r.newValue);
    }
    for (const k in carried) if (!rises.some(r => r.key === k)) HOLD('carried spike ' + k + ' has no measured +5 rise');
  }
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
  // the crime-ladder receipt
  const rl = await tab(BENCH, 'Ripple_Ledger'); const rh = rl[0];
  const iRC = col(rh, 'Cycle'), iRT = col(rh, 'CauseType'), iRS = col(rh, 'SourceEngine'), iRI = col(rh, 'TargetIds'), iRM = col(rh, 'Magnitude'), iRD = col(rh, 'CauseDetail');
  const rows = rl.slice(1).filter(r => Number(r[iRC]) === C && r[iRT] === 'crime' && /applyCrimeLadder_/.test(String(r[iRS])));
  const atTwo = Object.keys(levels).filter(h => levels[h] >= 2).sort();
  out.receipt = rows.map(r => ({ targets: String(r[iRI]), magnitude: r[iRM], detail: String(r[iRD]) }));
  if (!atTwo.length && rows.length) HOLD('crime receipt with no hood at level >= 2');
  if (atTwo.length) {
    if (rows.length !== 1) HOLD(rows.length + ' crime receipts for ' + atTwo.join(', '));
    else {
      const t = String(rows[0][iRI]).split(/[|,]\s*/).filter(Boolean).sort();
      if (t.join() !== atTwo.join()) HOLD('receipt targets ' + t.join() + ' vs level>=2 ' + atTwo.join());
      if (Number(rows[0][iRM]) !== Math.max(...atTwo.map(h => levels[h]))) HOLD('receipt magnitude ' + rows[0][iRM] + ' is not the max level');
      for (const h of atTwo.filter(x => levels[x] === 3)) {
        const re = new RegExp(h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[^;]*rising two Cycles running \\(level 3\\)');
        if (!re.test(String(rows[0][iRD]))) HOLD('receipt does not name ' + h + ' as rising two Cycles running (level 3)');
      }
    }
  }
  const ee = await tab(BENCH, 'Engine_Errors'); const eh = ee[0];
  out.engineErrors = ee.slice(1).filter(r => Number(r[col(eh, 'Cycle')]) === C).map(r => String(r[col(eh, 'Phase')]) + ': ' + String(r[col(eh, 'Error')]).slice(0, 120));
  for (const e of out.engineErrors) HOLD('Engine_Errors C' + C + ': ' + e);
  out.level3 = Object.keys(levels).filter(h => levels[h] === 3);
  for (const h of EXPECT.wave) if (levels[h] !== 3 || !out.receipt.some(r => r.detail.indexOf(h) >= 0 && /level 3/.test(r.detail))) HOLD('expected wave ' + h + ' at level 3 in the receipt');
  for (const h of EXPECT.lines) if (!(lines[h] > 0)) HOLD('expected crime-carry lines in ' + h + ', got 0');
  for (const h of EXPECT.carryWave) if (now.crimeWaveHoods.indexOf(h) < 0) HOLD('expected C' + C + ' to carry ' + h + ' as a wave');
  for (const h of EXPECT.calm) if (levels[h] >= 1) HOLD('expected ' + h + ' at level 0, read ' + levels[h]);
  finish();
})().catch(e => { console.error(e.stack || e.message); process.exit(1); });
function finish() {
  if (from) {
    const missing = [], held = [];
    const win = [];
    for (let c = from; c <= C; c++) {
      if (c === C) { win.push(out); if (out.hold.length) held.push(c); continue; }
      const f = O + '2026-10-25-e301-receipt-' + label + '-c' + c + '.json';
      if (!fs.existsSync(f)) { missing.push(c); continue; }
      const w = JSON.parse(fs.readFileSync(f, 'utf8')); win.push(w); if (w.hold.length) held.push(c);
    }
    if (missing.length) HOLD('window: no receipt for C' + missing.join(', C'));
    if (held.filter(c => c !== C).length) HOLD('window: held receipts at C' + held.filter(c => c !== C).join(', C'));
    out.window = { from, cycles: win.length, missing, held,
      rises: win.reduce((a, w) => a + (w.risesPreCap || []).length, 0), droppedByCap: win.reduce((a, w) => a + (w.risesDroppedByCap || []).length, 0),
      rung2HoodCycles: win.reduce((a, w) => a + Object.values(w.levels || {}).filter(v => v === 2).length, 0),
      waveHoodCycles: win.reduce((a, w) => a + (w.level3 || []).length, 0), maxSimultaneousWaves: Math.max(0, ...win.map(w => (w.level3 || []).length)),
      wavesCarried: win.reduce((a, w) => a + ((w.carry && w.carry.crimeWaveHoods) || []).length, 0),
      crimeLines: win.reduce((a, w) => a + ((w.lines && w.lines.total) || 0), 0), cyclesWithLines: win.filter(w => w.lines && w.lines.total).length,
      engineErrors: win.reduce((a, w) => a + (w.engineErrors || []).length, 0) };
  }
  fs.writeFileSync(O + '2026-10-25-e301-receipt-' + label + '-c' + C + '.json', JSON.stringify(out, null, 1));
  const L = out.levels || {};
  console.log('C' + C + ' ' + (out.hold.length ? 'HOLD' : 'PASS') + ' | levels ' + JSON.stringify(L) + ' | carried spikes ' +
    ((out.carry && out.carry.crimeSpikes) || []).length + ' waves ' + JSON.stringify((out.carry && out.carry.crimeWaveHoods) || null) +
    ' | rises pre-cap ' + (out.risesPreCap || []).length + ' dropped ' + (out.risesDroppedByCap || []).length +
    ' | lines ' + JSON.stringify(out.lines || {}) + ' | receipt ' + JSON.stringify((out.receipt || []).map(r => r.detail)) + ' | EE ' + (out.engineErrors || []).length);
  for (const h of out.hold) console.log('  HOLD ' + h);
  if (out.window) console.log('WINDOW C' + from + '-C' + C + ' ' + JSON.stringify(out.window));
  process.exit(out.hold.length ? 1 : 0);
}
