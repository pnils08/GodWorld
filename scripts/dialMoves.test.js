/**
 * dialMoves.test.js — engine.349 Task 6: the dial speed keys and the Dial_Moves / Dial_Pulse record.
 * Pairs with utilities/compressLifeHistory.js (readDialTuning_, buildDialMoves_, foldNewEntries_)
 * and utilities/citizenMemory.js (setDialTuning_).
 *
 * The point: at the seeded key values the fold is the pre-349 fold, cell for cell; the record
 * equals the DialState difference across the Cycle; a bad key is logged and never throws.
 *
 * Run: node scripts/dialMoves.test.js
 */

global.Logger = { log() {} };
const E = require('../utilities/citizenMemory.js');
Object.keys(E).forEach(k => { global[k] = E[k]; });
const M = require('../utilities/citizenDialMap.js');
global.nudgesForEvent_ = M.nudgesForEvent_;
global.nudgesForReflection_ = M.nudgesForReflection_;
global.baseTag_ = M.baseTag_;

const queued = [];
global.queueCellIntent_ = (ctx, tab, row, col, value) => { queued.push({ kind: 'cell', tab, row, col, value }); };
global.queueEnsureTabIntent_ = (ctx, tab, headers) => { queued.push({ kind: 'ensure', tab, headers }); };
global.queueReplaceIntent_ = (ctx, tab, allRows) => { queued.push({ kind: 'replace', tab, rows: allRows }); };
global.queueAppendIntent_ = (ctx, tab, row) => { queued.push({ kind: 'append', tab, row }); };
const errors = [];
global.logEngineError_ = (ctx, phase, err) => { errors.push({ phase, message: err.message }); };

const C = require('../utilities/compressLifeHistory.js');

let passed = 0, failed = 0;
function assert(label, cond, detail) {
  if (cond) { console.log(`  ok   ${label}`); passed++; }
  else { console.error(`  FAIL ${label}${detail ? ': ' + detail : ''}`); failed++; }
}

const CYCLE = 120;
const HEADERS = ['POPID', 'Name', 'LifeHistory', 'TraitProfile', 'DialState'];
const dial = (base, extra) => JSON.stringify(Object.assign({
  base: Object.assign({ drive: 50, sociability: 50, warmth: 50, openness: 50, composure: 50, integrity: 50, family: 50, outabout: 50, fandom: 50 }, base || {}),
  streak: { drive: 0, sociability: 0, warmth: 0, openness: 0, composure: 0, integrity: 0, family: 0, outabout: 0, fandom: 0 },
  mood: { drive: 0, sociability: 0, warmth: 0, openness: 0, composure: 0, integrity: 0, family: 0, outabout: 0, fandom: 0 },
  folded: CYCLE - 1
}, extra || {}));
const line = (cy, tag, text) => `C${cy} — [${tag}] ${text}`;

// A: a third same-way week (streak 2, swing still felt) — this Cycle's Promotion hardens drive.
// B: one new line, no streak — swing only, base unmoved.
// Q: quiet — no new line, no swing.
function citizens() {
  return [
    ['POP-A', 'Ada Reyes', [line(118, 'Work', 'a long week'), line(119, 'Work', 'another'), line(CYCLE, 'Promotion', 'made shift lead')].join('\n'), '',
      dial({}, { streak: { drive: 2, sociability: 0, warmth: 0, openness: 0, composure: 0, integrity: 0, family: 0, outabout: 0, fandom: 0 },
                 mood: { drive: 5, sociability: 0, warmth: 0, openness: 0, composure: 0, integrity: 0, family: 0, outabout: 0, fandom: 0 } })],
    ['POP-B', 'Ben Osei', [line(118, 'Daily', 'home'), line(119, 'Daily', 'home'), line(CYCLE, 'Neighborhood-Sociability-Up-S', 'stopped to talk on the block')].join('\n'), '', dial()],
    ['POP-Q', 'Quinn Tran', [line(110, 'Daily', 'home'), line(111, 'Daily', 'home'), line(112, 'Daily', 'home')].join('\n'), '', dial({ warmth: 64 })]
  ];
}
function makeCtx(opts) {
  opts = opts || {};
  const rows = citizens();
  const ctx = { mode: {}, summary: { absoluteCycle: CYCLE }, ledger: { headers: HEADERS.slice(), rows, dirty: false } };
  if (opts.config) ctx.config = opts.config;
  if (opts.open !== false) {
    ctx.dialOpen = {};
    rows.forEach(r => { ctx.dialOpen[r[0]] = r[4]; });
    if (opts.openOverride) Object.assign(ctx.dialOpen, opts.openOverride);
  }
  return ctx;
}
const dialCells = ctx => ctx.ledger.rows.map(r => r[4]).join('\n');
const SEEDS = { dialLineScale: 1, dialDirectShare: 0, dialMoodFade: 0.8, dialHardenShare: 0.4, dialReflectionShare: 0.225 };

console.log('═══ Section A — at the seeded values the fold is the old fold');
{
  const plain = makeCtx({ open: false });            // no keys, no open copy: the pre-349 harness shape
  C.compressLifeHistory_(plain, {});
  const seeded = makeCtx({ config: Object.assign({}, SEEDS) });
  queued.length = 0; errors.length = 0;
  C.compressLifeHistory_(seeded, {});
  assert('A1 DialState identical, cell for cell, with the keys seeded and the record on', dialCells(plain) === dialCells(seeded));
  assert('A2 no Engine_Errors row at the seeded values', errors.length === 0);
  assert('A3 the fold reports the speed it ran at', seeded.summary.lifeHistoryCompression.dialTuning.lineScale === 1 &&
    seeded.summary.lifeHistoryCompression.dialTuning.reflectionShare === 0.225);
  assert('A4 no record without the open copy (dial moves off)', plain.summary.lifeHistoryCompression.dialMoves === null);
  assert('A5 0.225 / 0.5 is exactly the old 0.45 multiplier', 0.225 / C.REFLECTION_ACCRETION_FRAC === C.REFLECTION_MULT);
}

console.log('═══ Section B — the record equals the difference across the Cycle');
{
  const ctx = makeCtx({ config: Object.assign({}, SEEDS) });
  const before = ctx.ledger.rows.map(r => JSON.parse(r[4]).base);
  queued.length = 0;
  C.compressLifeHistory_(ctx, {});
  const kinds = queued.map(q => q.kind + ':' + q.tab);
  assert('B1 both tabs ensured, Dial_Moves replaced, Dial_Pulse appended',
    kinds.filter(k => k === 'ensure:Dial_Moves').length === 1 && kinds.filter(k => k === 'ensure:Dial_Pulse').length === 1 &&
    kinds.filter(k => k === 'replace:Dial_Moves').length === 1 && kinds.filter(k => k === 'append:Dial_Pulse').length === 1, kinds.join(' '));
  const rep = queued.find(q => q.kind === 'replace');
  assert('B2 the replace carries the header row first', JSON.stringify(rep.rows[0]) === JSON.stringify(C.DIAL_MOVES_HEADERS));
  const moves = rep.rows.slice(1);
  const after = ctx.ledger.rows.map(r => JSON.parse(r[4]).base);
  let expect = 0, ok = true;
  ctx.ledger.rows.forEach((r, i) => {
    E.DIALS.forEach(d => {
      const diff = after[i][d] - before[i][d];
      if (Math.abs(diff) < 0.05) return;
      expect++;
      const row = moves.find(m => m[1] === r[0] && m[3] === d);
      if (!row || Math.abs(row[6] - diff) > 0.006) ok = false;
    });
  });
  assert('B3 one row per citizen and dial that moved, Change = the base difference', ok && moves.length === expect && expect >= 1, `rows ${moves.length} expected ${expect}`);
  const a = moves.find(m => m[1] === 'POP-A' && m[3] === 'drive');
  assert('B4 the hardened drive row names lines and the kind that pushed', !!a && /lines \+/.test(a[10]) && /Promotion/.test(a[10]), a && a[10]);
  assert('B5 a swing that did not stick writes no row (POP-B)', !moves.some(m => m[1] === 'POP-B'));
  assert('B6 Felt = the dial with this Cycle\'s swing on it', !!a && a[9] >= a[5]);
  assert('B6b the row carries the citizen\'s name', !!a && a[2] === 'Ada Reyes');
  {
    // most live rows have a blank Name cell: First + Last stands in
    const fl = makeCtx({ config: Object.assign({}, SEEDS) });
    fl.ledger.headers = ['POPID', 'Name', 'LifeHistory', 'TraitProfile', 'DialState', 'First', 'Last'];
    fl.ledger.rows.forEach(r => { r[1] = ''; r.push('Ada', 'Reyes'); });
    queued.length = 0;
    C.compressLifeHistory_(fl, {});
    const row = queued.find(q => q.kind === 'replace').rows.slice(1).find(m => m[1] === 'POP-A');
    assert('B6c a blank Name cell falls back to First + Last', !!row && row[2] === 'Ada Reyes', row && row[2]);
    queued.length = 0;
    C.compressLifeHistory_(makeCtx({ config: Object.assign({}, SEEDS) }), {});
  }
  const pulse = queued.find(q => q.kind === 'append').row;
  const H = C.dialPulseHeaders_();
  const at = name => pulse[H.indexOf(name)];
  assert('B7 pulse row matches its header', pulse.length === H.length);
  assert('B8 pulse: 3 citizens, 1 moved, driveUp 1', at('Citizens') === 3 && at('Moved') === 1 && at('driveUp') === 1 && at('driveDown') === 0);
  assert('B9 pulse: POP-Q (warmth 64) is not all-middle and reads high', at('AllMiddle') === 2 && at('AnyHigh') >= 1 && at('AnyLow') === 0);
}

console.log('═══ Section C — a move made before Phase 9 is in the difference');
{
  // the ledger opened with POP-Q composure 50; a Phase-4 break took it to 46 before the fold
  const ctx = makeCtx({ config: Object.assign({}, SEEDS) });
  ctx.ledger.rows[2][4] = dial({ warmth: 64, composure: 46 });
  queued.length = 0;
  C.compressLifeHistory_(ctx, {});
  const moves = queued.find(q => q.kind === 'replace').rows.slice(1);
  const q = moves.find(m => m[1] === 'POP-Q' && m[3] === 'composure');
  assert('C1 the earlier move is recorded (50 -> 46)', !!q && q[4] === 50 && q[5] === 46 && q[6] === -4);
  assert('C2 ...and named as earlier in the Cycle', !!q && /earlier in the Cycle -4/.test(q[10]), q && q[10]);
  const fresh = makeCtx({ config: Object.assign({}, SEEDS) });
  delete fresh.dialOpen['POP-Q'];
  queued.length = 0;
  C.compressLifeHistory_(fresh, {});
  const fm = queued.find(q2 => q2.kind === 'replace').rows.slice(1).find(m => m[1] === 'POP-Q' && m[3] === 'warmth');
  assert('C3 a citizen the ledger did not open with reads new this Cycle', !!fm && /new this Cycle/.test(fm[10]), fm && fm[10]);
}

console.log('═══ Section D — the keys turn the speed');
{
  const slow = makeCtx({ config: Object.assign({}, SEEDS) });
  C.compressLifeHistory_(slow, {});
  const fast = makeCtx({ config: Object.assign({}, SEEDS, { dialLineScale: 2, dialDirectShare: 0.25 }) });
  C.compressLifeHistory_(fast, {});
  const b = ctx => JSON.parse(ctx.ledger.rows[1][4]);
  assert('D1 seed speed: a single 1-point line leaves base at 50', b(slow).base.sociability === 50 && b(slow).mood.sociability === 1);
  // the swing is room-scaled against the dial after its direct share landed: 1.5 x (100 - 50.5) / 50
  assert('D2 doubled, a quarter direct: base 50.5, swing 1.485', Math.abs(b(fast).base.sociability - 50.5) < 1e-9 && Math.abs(b(fast).mood.sociability - 1.485) < 1e-9,
    JSON.stringify([b(fast).base.sociability, b(fast).mood.sociability]));
  const slowFade = makeCtx({ config: Object.assign({}, SEEDS, { dialMoodFade: 0.5 }) });
  C.compressLifeHistory_(slowFade, {});
  const aSeed = JSON.parse(slow.ledger.rows[0][4]), aFade = JSON.parse(slowFade.ledger.rows[0][4]);
  assert('D3 dialMoodFade reaches the settle (a 0.5 fade leaves less swing than 0.8)', aFade.mood.drive < aSeed.mood.drive);
  const harden = makeCtx({ config: Object.assign({}, SEEDS, { dialHardenShare: 0.8 }) });
  C.compressLifeHistory_(harden, {});
  assert('D4 dialHardenShare reaches the harden (0.8 bakes more than 0.4)', JSON.parse(harden.ledger.rows[0][4]).base.drive > aSeed.base.drive);
}

console.log('═══ Section E — a bad key is logged, never thrown');
{
  errors.length = 0;
  const bad = makeCtx({ config: Object.assign({}, SEEDS, { dialLineScale: 'fast', dialDirectShare: 7 }) });
  let threw = false;
  try { C.compressLifeHistory_(bad, {}); } catch (e) { threw = true; }
  const good = makeCtx({ config: Object.assign({}, SEEDS) });
  C.compressLifeHistory_(good, {});
  assert('E1 the fold does not throw', !threw);
  assert('E2 two Engine_Errors rows, both under Phase9-DialTuning', errors.length === 2 && errors.every(e => e.phase === 'Phase9-DialTuning'), JSON.stringify(errors));
  assert('E3 the Cycle folds at the seed values', dialCells(bad) === dialCells(good));
  const t = C.readDialTuning_({});
  assert('E4 no config at all = the seed values, no error', t.lineScale === 1 && t.directShare === 0 && t.moodFade === 0.8 && t.hardenShare === 0.4 && t.reflectionShare === 0.225);
}

E.setDialTuning_(null); // leave the shared module at its defaults
assert('Z1 tuning reset to the code values', E.DIAL_TUNING.moodFade === E.MOOD_DECAY && E.DIAL_TUNING.hardenShare === E.HARDEN_FRACTION);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
