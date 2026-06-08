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
global.baseTag_ = M.baseTag_;

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

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
