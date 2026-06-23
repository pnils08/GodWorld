/**
 * compressLifeHistory.dial.test.js — proving ground for the v2.0 STATEFUL
 * inversion (engine.31 Phase 2, S253). Pairs with utilities/compressLifeHistory.js.
 *
 * The point: prove fold-on-trim accretes each event EXACTLY ONCE on the real,
 * heterogeneous O-column data shape that would break a timestamp watermark
 * (null timestamps, [Compressed:] blocks, Engine Event lines, edition-only
 * citizens). Fixtures are real citizens pulled from Simulation_Ledger.
 *
 * Dial logic lives in citizenMemory.js + citizenDialMap.js as Apps Script
 * globals; here we inject them onto `global` before requiring the compressor.
 *
 * Run: node scripts/compressLifeHistory.dial.test.js
 */

const fs = require('fs');
const path = require('path');

// --- inject the Apps Script global surface the compressor calls bare ---
global.Logger = { log() {} };
const E = require('../utilities/citizenMemory.js');
Object.keys(E).forEach(k => { global[k] = E[k]; });   // newCitizen_, deserialize_, applyEvent_, band_, bandIndex_, describe_, DIALS, ...
const M = require('../utilities/citizenDialMap.js');
global.nudgesForEvent_ = M.nudgesForEvent_;
global.nudgesForReflection_ = M.nudgesForReflection_;   // reflection drain composer (S269)
global.baseTag_ = M.baseTag_;

// Capturing mock of the Phase-10 cell-intent queue (writeIntents.js is Apps Script
// globals, no exports). The drain calls this to mark Reflection_Intake rows applied='yes'.
global.queueCellIntent_ = function(ctx, tab, row, col, value, reason, domain, priority) {
  if (!ctx.persist) ctx.persist = { updates: [] };
  var intent = { tab: tab, kind: 'cell', row: row, col: col, value: value, reason: reason, domain: domain, priority: priority };
  ctx.persist.updates.push(intent);
  return intent;
};

const C = require('../utilities/compressLifeHistory.js');

let passed = 0, failed = 0;
function assert(label, cond, detail) {
  if (cond) { console.log(`  ok   ${label}`); passed++; }
  else { console.error(`  FAIL ${label}${detail ? ': ' + detail : ''}`); failed++; }
}

const fixtures = JSON.parse(fs.readFileSync(path.resolve(__dirname, '__fixtures__/realLifeHistory.json'), 'utf8'));
const byId = {};
fixtures.forEach(f => { byId[f.POPID] = f; });

// build a mock ctx.ledger from rows of { POPID, LifeHistory, TraitProfile, DialState }
function makeCtx(citizens, cycle, withDialState) {
  const headers = withDialState
    ? ['POPID', 'LifeHistory', 'TraitProfile', 'DialState']
    : ['POPID', 'LifeHistory', 'TraitProfile'];
  const rows = citizens.map(c => withDialState
    ? [c.POPID, c.LifeHistory, c.TraitProfile || '', c.DialState || '']
    : [c.POPID, c.LifeHistory, c.TraitProfile || '']);
  return { mode: {}, summary: { absoluteCycle: cycle }, ledger: { headers, rows, dirty: false } };
}
const col = (ctx, name) => ctx.ledger.headers.indexOf(name);
function get(ctx, rowIdx, name) { return ctx.ledger.rows[rowIdx][col(ctx, name)]; }

console.log('═══ Section A — the DialState-absent safety (never wipe)');
{
  const ctx = makeCtx([byId['POP-00168']], 100, false); // NO DialState column
  const before = get(ctx, 0, 'TraitProfile');
  C.compressLifeHistory_(ctx);
  assert('A1 no DialState column -> inert no-op (TraitProfile untouched)', get(ctx, 0, 'TraitProfile') === before);
  assert('A2 ...ledger not marked dirty', ctx.ledger.dirty === false);
}

console.log('═══ Section B — derives a valid dial face + state');
{
  const ctx = makeCtx(fixtures.map(f => ({ ...f, TraitProfile: '', DialState: '' })), 100, true);
  C.compressLifeHistory_(ctx, { forceAll: true });
  // citizens with >=3 entries get a face + state
  for (let i = 0; i < fixtures.length; i++) {
    const face = get(ctx, i, 'TraitProfile');
    const state = get(ctx, i, 'DialState');
    if (!face) continue; // <3 entries skip is legal
    assert(`B-${fixtures[i].POPID} face holds Archetype: contract`, /^Archetype:/.test(face), face.slice(0, 40));
    const parsed = C.parseProfileString_(face);
    assert(`B-${fixtures[i].POPID} face parses to a non-empty archetype`, !!parsed.archetype);
    let ok = false;
    try { const o = JSON.parse(state); ok = o && o.base && o.streak && E.DIALS.every(d => typeof o.base[d] === 'number'); } catch (e) {}
    assert(`B-${fixtures[i].POPID} DialState is valid {base,streak} JSON`, ok, state.slice(0, 60));
  }
}

console.log('═══ Section C — inert tags do not move dials (edition-only citizen)');
{
  // POP-00034 = 3 entries, all [E82]/[E83]/[E86] edition citations -> route-by-content -> {} no nudge
  const ctx = makeCtx([{ ...byId['POP-00034'], TraitProfile: '', DialState: '' }], 100, true);
  C.compressLifeHistory_(ctx, { forceAll: true });
  const state = JSON.parse(get(ctx, 0, 'DialState'));
  assert('C1 edition-only citizen keeps every dial at neutral 50', E.DIALS.every(d => state.base[d] === 50), JSON.stringify(state.base));
  assert('C2 ...and reads as Drifter (neutral default)', /Archetype:Drifter/.test(get(ctx, 0, 'TraitProfile')));
}

console.log('═══ Section D — fold MOVES base (synthetic prolific citizen)');
let drive1;
{
  // 32 same-direction Promotion events -> 12 age out of the 20-window -> drive base rises
  const lines = [];
  for (let i = 0; i < 32; i++) lines.push(`2026-01-${String((i % 28) + 1).padStart(2, '0')} 10:0${i % 10} — [Promotion] advanced at work Cycle ${i + 1}`);
  const prolific = { POPID: 'POP-SYNTH', LifeHistory: lines.join('\n'), TraitProfile: '', DialState: '' };
  const ctx = makeCtx([prolific], 100, true);
  C.compressLifeHistory_(ctx, { forceAll: true });
  const state = JSON.parse(get(ctx, 0, 'DialState'));
  drive1 = state.base.drive;
  assert('D1 folding aged-out Promotions raises drive base above 50', drive1 > 50, 'drive=' + drive1);
  assert('D2 only drive moved (Promotion maps drive + a little composure)', state.base.sociability === 50 && state.base.family === 50);
}

console.log('═══ Section E — FOLD-ONCE (the core proof, real heterogeneous citizen)');
{
  // POP-00168: 25 real entries incl. [Compressed], Engine Event, timestamped tags.
  const c0 = { ...byId['POP-00168'], TraitProfile: '', DialState: '' };
  const ctx = makeCtx([c0], 100, true);
  C.compressLifeHistory_(ctx, { forceAll: true });
  const state1 = get(ctx, 0, 'DialState');
  const trimmedLH = get(ctx, 0, 'LifeHistory');   // O after trim — aged-out events physically removed
  const base1 = JSON.parse(state1).base;
  assert('E1 first run produced a DialState + trimmed the window', !!state1 && trimmedLH.length > 0);

  // Re-run at a later cycle with the TRIMMED O and NO new events. The aged-out
  // events are gone -> nothing re-folds -> base MUST be identical (no double-count).
  const ctx2 = makeCtx([{ POPID: 'POP-00168', LifeHistory: trimmedLH, TraitProfile: get(ctx, 0, 'TraitProfile'), DialState: state1 }], 110, true);
  C.compressLifeHistory_(ctx2, { forceAll: true });
  const base2 = JSON.parse(get(ctx2, 0, 'DialState')).base;
  assert('E2 re-run after trim does NOT re-fold (base identical = fold-once)', JSON.stringify(base1) === JSON.stringify(base2), `b1=${JSON.stringify(base1)} b2=${JSON.stringify(base2)}`);

  // And the synthetic prolific citizen: re-run after trim -> drive base stable.
  const lines = [];
  for (let i = 0; i < 32; i++) lines.push(`2026-01-${String((i % 28) + 1).padStart(2, '0')} 10:0${i % 10} — [Promotion] advanced at work Cycle ${i + 1}`);
  const ctxP = makeCtx([{ POPID: 'POP-SYNTH', LifeHistory: lines.join('\n'), TraitProfile: '', DialState: '' }], 100, true);
  C.compressLifeHistory_(ctxP, { forceAll: true });
  const trimmedP = get(ctxP, 0, 'LifeHistory');
  const driveA = JSON.parse(get(ctxP, 0, 'DialState')).base.drive;
  const ctxP2 = makeCtx([{ POPID: 'POP-SYNTH', LifeHistory: trimmedP, TraitProfile: get(ctxP, 0, 'TraitProfile'), DialState: get(ctxP, 0, 'DialState') }], 110, true);
  C.compressLifeHistory_(ctxP2, { forceAll: true });
  const driveB = JSON.parse(get(ctxP2, 0, 'DialState')).base.drive;
  assert('E3 prolific citizen: drive stable across re-run (no double-count)', driveA === driveB, `a=${driveA} b=${driveB}`);
}

console.log('═══ Section F — cadence guard (no premature re-fold)');
{
  const c0 = { ...byId['POP-00168'], TraitProfile: '', DialState: '' };
  const ctx = makeCtx([c0], 100, true);
  C.compressLifeHistory_(ctx, { forceAll: true });
  const face1 = get(ctx, 0, 'TraitProfile');
  // re-run at c102 (<5 cycles) WITHOUT forceAll -> skipped
  ctx.summary.absoluteCycle = 102;
  C.compressLifeHistory_(ctx);
  assert('F1 within MIN_CYCLES without forceAll -> skipped (face unchanged)', get(ctx, 0, 'TraitProfile') === face1);
}

console.log('═══ Section G — Phase 5 dial-band seam (getCitizenDialBands_)');
{
  // Build DialState cells at known band positions via the dial engine itself.
  function dialState(overrides) {
    const c = global.newCitizen_();              // all dials -> 50 (neutral)
    Object.keys(overrides).forEach(k => { c.base[k] = overrides[k]; });
    return C.serializeDialState_(c);
  }
  const ctx = {
    citizenLookup: {
      'POP-DRIVE':  { DialState: dialState({ drive: 90 }) },      // far-high drive
      'POP-CRIME':  { DialState: dialState({ integrity: 10 }) },  // far-low integrity
      'POP-FAMILY': { DialState: dialState({ family: 88 }) },     // far-high family
      'POP-FLAT':   { DialState: dialState({}) },                 // all 50 -> neutral
      'POP-EMPTY':  { DialState: '' },                            // never seeded
      'POP-NODIAL': {}                                            // no DialState field
    }
  };
  const drive = C.getCitizenDialBands_(ctx, 'POP-DRIVE');
  assert('G1 high-drive -> careerFreq > 1 (high band multiplier)', !!drive && drive.careerFreq > 1, String(drive && drive.careerFreq));
  assert('G2 high-drive (neutral integrity) -> crime NOT reachable', !!drive && drive.crimeReachable === false);
  const crime = C.getCitizenDialBands_(ctx, 'POP-CRIME');
  assert('G3 low-integrity -> crimeReachable true', !!crime && crime.crimeReachable === true);
  const fam = C.getCitizenDialBands_(ctx, 'POP-FAMILY');
  assert('G4 high-family -> familyFreq > 1', !!fam && fam.familyFreq > 1, String(fam && fam.familyFreq));
  const flat = C.getCitizenDialBands_(ctx, 'POP-FLAT');
  assert('G5 neutral -> mult 1.0, crime not reachable', !!flat && flat.mult.drive === 1.0 && flat.crimeReachable === false);
  assert('G6 empty DialState -> null', C.getCitizenDialBands_(ctx, 'POP-EMPTY') === null);
  assert('G7 no DialState field -> null', C.getCitizenDialBands_(ctx, 'POP-NODIAL') === null);
  assert('G8 unknown popId -> null', C.getCitizenDialBands_(ctx, 'POP-NOPE') === null);
  let inRange = true;
  global.DIALS.forEach(d => {
    if (drive.bands[d] < -2 || drive.bands[d] > 2) inRange = false;
    if (drive.mult[d] < 0.5 || drive.mult[d] > 1.5) inRange = false;
  });
  assert('G9 bands in [-2,2], mult in [0.5,1.5]', inRange);
  assert('G10 cached (same ref on 2nd call)', C.getCitizenDialBands_(ctx, 'POP-DRIVE') === drive);

  // engine.32 T5 — dialStrOpt override (generators that iterate ledger rows
  // directly, before/without citizenLookup)
  const ctxNoLookup = {};
  const ovr = C.getCitizenDialBands_(ctxNoLookup, 'POP-ROW', dialState({ drive: 90 }));
  assert('G11 no citizenLookup + dialStrOpt -> bands resolve', !!ovr && ovr.careerFreq > 1, String(ovr && ovr.careerFreq));
  assert('G12 override result cached (same ref on 2nd call, no override passed)', C.getCitizenDialBands_(ctxNoLookup, 'POP-ROW') === ovr);
  assert('G13 no citizenLookup + no override -> null', C.getCitizenDialBands_(ctxNoLookup, 'POP-OTHER') === null);
  assert('G14 citizenLookup wins over override when both present',
    C.getCitizenDialBands_({ citizenLookup: { 'POP-X': { DialState: dialState({ family: 88 }) } } }, 'POP-X', dialState({ drive: 90 })).familyFreq > 1);
}

// ── Reflection write-back drain (research.14 S269) ──────────────────────────
// fake ss exposing a Reflection_Intake tab. intakeRows: [ts,popId,cycle,wake,event,snippet,applied,affect]
function fakeSS(intakeRows) {
  const values = [['ts', 'popId', 'cycle', 'wake', 'event', 'snippet', 'applied', 'affect']].concat(intakeRows);
  const sheet = { getDataRange: () => ({ getValues: () => values }) };
  return { getSheetByName: (n) => (n === 'Reflection_Intake' ? sheet : null) };
}
function drainCtx(rowsSpec, intakeRows, cycle) {
  const headers = ['POPID', 'LifeHistory', 'TraitProfile', 'DialState'];
  const rows = rowsSpec.map(s => [s.POPID, s.LifeHistory || '', s.TraitProfile || '', s.DialState || '']);
  return {
    mode: {}, summary: { absoluteCycle: cycle || 100 },
    ledger: { headers, rows, dirty: false, sheet: 'Simulation_Ledger' },
    persist: { updates: [] },
    ss: fakeSS(intakeRows)
  };
}
const dialJSON = (overrides) => { const c = global.newCitizen_(); Object.keys(overrides || {}).forEach(k => { c.base[k] = overrides[k]; }); return C.serializeDialState_(c); };
const baseOf = (ctx, i) => JSON.parse(get(ctx, i, 'DialState')).base;
const intk = (popId, event, affect) => ['t', popId, 100, 'evening', event || '', 'snip', 'no', affect || ''];
// expected per-reflection base move for a single dial = mapDelta × MULT × FRAC
const STEP = C.REFLECTION_MULT * C.REFLECTION_ACCRETION_FRAC;   // 0.45 × 0.5 = 0.225

console.log('═══ Section H — reflection drain accretes into base');
{
  // H1 lone Anxious (composure -3): base.composure down a SMALL bounded amount, not zero
  const ctx = drainCtx([{ POPID: 'POP-A', LifeHistory: '' }], [intk('POP-A', '', 'Anxious')], 100);
  C.compressLifeHistory_(ctx, { forceAll: true });
  const comp = baseOf(ctx, 0).composure;
  assert('H1 lone Anxious moves composure base down a hair (not zero, not huge)',
    Math.abs(comp - (50 - 3 * STEP)) < 1e-9 && comp < 50 && comp > 49, 'composure=' + comp);

  // H2 five sustained Anxious: meaningfully more than one (lock-in)
  const ctx2 = drainCtx([{ POPID: 'POP-B', LifeHistory: '' }],
    [0, 1, 2, 3, 4].map(() => intk('POP-B', '', 'Anxious')), 100);
  C.compressLifeHistory_(ctx2, { forceAll: true });
  const comp5 = baseOf(ctx2, 0).composure;
  assert('H2 5 sustained Anxious accrete ~5x (lock-in)', Math.abs(comp5 - (50 - 5 * 3 * STEP)) < 1e-9 && comp5 < comp, 'composure=' + comp5);

  // H3 resentful Promotion: composure nets DOWN (affect-only), drive still UP — not the +2 bug
  const ctx3 = drainCtx([{ POPID: 'POP-C', LifeHistory: '' }], [intk('POP-C', 'Promotion', 'Resentful')], 100);
  C.compressLifeHistory_(ctx3, { forceAll: true });
  const b3 = baseOf(ctx3, 0);
  assert('H3 resentful Promotion nets composure DOWN', b3.composure < 50 && Math.abs(b3.composure - (50 - 3 * STEP)) < 1e-9, 'composure=' + b3.composure);
  assert('H3 ...and drive still UP (event non-composure carried)', b3.drive > 50 && Math.abs(b3.drive - (50 + 8 * STEP)) < 1e-9, 'drive=' + b3.drive);

  // H4 each drained row gets an applied='yes' cell intent on Reflection_Intake col 7
  const ups = ctx2.persist.updates;
  assert('H4 one applied=yes intent per pending row (5)', ups.length === 5);
  assert('H4 ...targeting Reflection_Intake col 7 value yes, rows 2..6',
    ups.every((u, k) => u.tab === 'Reflection_Intake' && u.col === 7 && u.value === 'yes' && u.row === k + 2),
    JSON.stringify(ups.map(u => [u.row, u.col, u.value])));

  // H5 clamp: a near-floor citizen never goes below 0
  const ctx5 = drainCtx([{ POPID: 'POP-D', DialState: dialJSON({ composure: 1 }) }],
    [0, 1, 2, 3, 4].map(() => intk('POP-D', '', 'Anxious')), 100);
  C.compressLifeHistory_(ctx5, { forceAll: true });
  assert('H5 base clamps at 0 (no negative composure)', baseOf(ctx5, 0).composure === 0, 'composure=' + baseOf(ctx5, 0).composure);

  // H6 drain-only citizen (no LifeHistory -> no compress) still persists DialState + marks dirty
  const ctx6 = drainCtx([{ POPID: 'POP-E', LifeHistory: '' }], [intk('POP-E', '', 'Anxious')], 100);
  C.compressLifeHistory_(ctx6, { forceAll: true });
  assert('H6 drain-only citizen marks ledger dirty', ctx6.ledger.dirty === true);
  assert('H6 ...writes DialState but leaves TraitProfile untouched (no face recompute)',
    !!get(ctx6, 0, 'DialState') && get(ctx6, 0, 'TraitProfile') === '');
}

console.log('═══ Section I — no-pending byte-identical regression (objective path unperturbed)');
{
  // Same fixture citizen, three intake conditions that must all read as "no pending":
  //   (a) no ss at all   (b) empty intake   (c) intake rows present but all applied='yes' / other popIds
  const f = { ...byId['POP-00168'], TraitProfile: '', DialState: '' };
  const noSS = makeCtx([f], 100, true);
  C.compressLifeHistory_(noSS, { forceAll: true });

  const empty = drainCtx([{ POPID: f.POPID, LifeHistory: f.LifeHistory, TraitProfile: '', DialState: '' }], [], 100);
  C.compressLifeHistory_(empty, { forceAll: true });

  const otherApplied = drainCtx([{ POPID: f.POPID, LifeHistory: f.LifeHistory, TraitProfile: '', DialState: '' }],
    [['t', f.POPID, 100, 'evening', '', 'snip', 'yes', 'Anxious'], intk('POP-OTHER', '', 'Angry')], 100);
  C.compressLifeHistory_(otherApplied, { forceAll: true });

  assert('I1 empty intake -> DialState byte-identical to no-ss run', get(empty, 0, 'DialState') === get(noSS, 0, 'DialState'));
  assert('I2 empty intake -> TraitProfile byte-identical', get(empty, 0, 'TraitProfile') === get(noSS, 0, 'TraitProfile'));
  assert('I3 applied=yes/other-pop intake -> DialState still byte-identical (filtered out)', get(otherApplied, 0, 'DialState') === get(noSS, 0, 'DialState'));
  assert('I4 ...and no applied intent queued for this citizen', otherApplied.persist.updates.length === 0);
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
