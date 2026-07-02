/**
 * biasFold.test.js — engine.38 B1 (seams Task 6, S283). Proves the asymmetric
 * bias fold: S.biasIntents (Phase-5 emit tally) drains into the ledger's
 * MemoryRegisters.biases inside the Phase-9 compressor per-row RMW.
 *
 * Rules under test (seams plan 2026-07-01 Design B1):
 *   - insert: new target -> {t, s:±1, o, r:0, c:0, cy}
 *   - reinforce: same sign -> r++, s steps 0.5 toward pole, |s| capped 3
 *   - challenge: opposite sign -> c++, s steps 1.0 toward 0; hit/cross 0
 *     resets r/c (cross flips allegiance) — challenge outweighs reinforcement
 *   - cap 5: evict lowest |s|, oldest first
 *   - drain is unconditional (compress-ineligible citizens still fold)
 *   - column absent -> inert; corrupt cell -> fresh registers; unlived untouched
 *   - sentiment NEVER touches DialState (opinion is not identity)
 *
 * Run: node scripts/biasFold.test.js
 */

// --- inject the Apps Script global surface the compressor calls bare ---
global.Logger = { log() {} };
const E = require('../utilities/citizenMemory.js');
Object.keys(E).forEach(k => { global[k] = E[k]; });
const M = require('../utilities/citizenDialMap.js');
global.nudgesForEvent_ = M.nudgesForEvent_;
global.nudgesForReflection_ = M.nudgesForReflection_;
global.baseTag_ = M.baseTag_;
global.queueCellIntent_ = function(ctx) {
  if (!ctx.persist) ctx.persist = { updates: [] };
  ctx.persist.updates.push(Array.prototype.slice.call(arguments, 1));
};

const C = require('../utilities/compressLifeHistory.js');

let passed = 0, failed = 0;
function assert(label, cond, detail) {
  if (cond) { console.log(`  ok   ${label}`); passed++; }
  else { console.error(`  FAIL ${label}${detail ? ': ' + detail : ''}`); failed++; }
}

function makeCtx(citizens, cycle, opts) {
  opts = opts || {};
  const headers = opts.noRegisterCol
    ? ['POPID', 'LifeHistory', 'TraitProfile', 'DialState']
    : ['POPID', 'LifeHistory', 'TraitProfile', 'DialState', 'MemoryRegisters'];
  const rows = citizens.map(c => {
    const base = [c.POPID, c.LifeHistory || '', c.TraitProfile || '', c.DialState || ''];
    if (!opts.noRegisterCol) base.push(c.MemoryRegisters || '');
    return base;
  });
  return {
    mode: {},
    summary: { absoluteCycle: cycle, biasIntents: opts.biasIntents || undefined },
    ledger: { headers, rows, dirty: false }
  };
}
const col = (ctx, name) => ctx.ledger.headers.indexOf(name);
const get = (ctx, r, name) => ctx.ledger.rows[r][col(ctx, name)];

// ═══ Section A — parseMemoryRegisters_ (defensive parse, additive contract)
console.log('═══ Section A — parseMemoryRegisters_');
{
  const a = C.parseMemoryRegisters_('');
  assert('A1 empty cell -> fresh {biases:[], unlived:[]}',
    Array.isArray(a.biases) && a.biases.length === 0 && Array.isArray(a.unlived) && a.unlived.length === 0);

  const b = C.parseMemoryRegisters_('{not json!!');
  assert('A2 corrupt cell -> fresh registers, no throw',
    Array.isArray(b.biases) && b.biases.length === 0);

  const c = C.parseMemoryRegisters_('[1,2]');
  assert('A3 non-object JSON (array) -> fresh registers',
    Array.isArray(c.biases) && !Array.isArray(c.slice));

  const d = C.parseMemoryRegisters_('{"biases":[{"t":"X","s":2}],"unlived":[{"tag":"CareerShift"}],"future":{"k":1}}');
  assert('A4 valid cell round-trips biases', d.biases.length === 1 && d.biases[0].t === 'X');
  assert('A5 unlived array preserved', d.unlived.length === 1 && d.unlived[0].tag === 'CareerShift');
  assert('A6 unknown top-level field survives (additive contract)', d.future && d.future.k === 1);
}

// ═══ Section B — foldBiasIntents_ rule mechanics
console.log('═══ Section B — foldBiasIntents_ rules');
{
  // B1: insert
  let regs = C.parseMemoryRegisters_('');
  let n = C.foldBiasIntents_(regs, [{ t: 'Marcus Webb', s: 1, o: 'source:bias|c101' }], 101);
  assert('B1 insert new target', n === 1 && regs.biases.length === 1);
  const rec = regs.biases[0];
  assert('B2 insert shape {t,s:+1,o,r:0,c:0,cy}',
    rec.t === 'Marcus Webb' && rec.s === 1 && rec.o === 'source:bias|c101' && rec.r === 0 && rec.c === 0 && rec.cy === 101);

  // B3: reinforce same sign
  C.foldBiasIntents_(regs, [{ t: 'Marcus Webb', s: 1, o: 'x' }], 102);
  assert('B3 reinforce: s 1 -> 1.5, r=1, cy touched',
    regs.biases[0].s === 1.5 && regs.biases[0].r === 1 && regs.biases[0].cy === 102);

  // B4: reinforce cap at |3|
  for (let i = 0; i < 10; i++) C.foldBiasIntents_(regs, [{ t: 'Marcus Webb', s: 1, o: 'x' }], 103 + i);
  assert('B4 reinforcement caps at s=3', regs.biases[0].s === 3 && regs.biases[0].r === 11);

  // B5: challenge moderates (stronger than reinforce: full 1.0 step)
  C.foldBiasIntents_(regs, [{ t: 'Marcus Webb', s: -1, o: 'x' }], 120);
  assert('B5 challenge: s 3 -> 2, c=1, r preserved',
    regs.biases[0].s === 2 && regs.biases[0].c === 1 && regs.biases[0].r === 11);

  // B6: challenges walk to zero -> counters reset
  C.foldBiasIntents_(regs, [{ t: 'Marcus Webb', s: -1, o: 'x' }], 121);
  C.foldBiasIntents_(regs, [{ t: 'Marcus Webb', s: -1, o: 'x' }], 122);
  assert('B6 hit zero: s=0, r/c reset 0/0',
    regs.biases[0].s === 0 && regs.biases[0].r === 0 && regs.biases[0].c === 0);

  // B7: from undecided (s=0), next intent reinforces toward its pole
  C.foldBiasIntents_(regs, [{ t: 'Marcus Webb', s: -1, o: 'x' }], 123);
  assert('B7 from 0: reinforce toward new pole, s=-0.5, r=1',
    regs.biases[0].s === -0.5 && regs.biases[0].r === 1);

  // B8: crossing zero flips allegiance + resets counters
  C.foldBiasIntents_(regs, [{ t: 'Marcus Webb', s: 1, o: 'x' }], 124);
  assert('B8 challenge crosses 0: s=-0.5 -> +0.5, r/c reset',
    regs.biases[0].s === 0.5 && regs.biases[0].r === 0 && regs.biases[0].c === 0);

  // B9: cap 5 — evict lowest |s|, oldest first
  regs = C.parseMemoryRegisters_(JSON.stringify({
    biases: [
      { t: 'A', s: 3,   o: '', r: 0, c: 0, cy: 90 },
      { t: 'B', s: -2,  o: '', r: 0, c: 0, cy: 91 },
      { t: 'C', s: 1,   o: '', r: 0, c: 0, cy: 95 }, // |s|=1, newer
      { t: 'D', s: -1,  o: '', r: 0, c: 0, cy: 92 }, // |s|=1, OLDEST of the 1s -> evicted
      { t: 'E', s: 2.5, o: '', r: 0, c: 0, cy: 93 }
    ],
    unlived: []
  }));
  C.foldBiasIntents_(regs, [{ t: 'F', s: 1, o: 'x' }], 130);
  const names = regs.biases.map(b => b.t).join(',');
  assert('B9 cap 5: lowest-|s|-oldest (D) evicted, F inserted',
    regs.biases.length === 5 && names.indexOf('D') < 0 && names.indexOf('F') >= 0, names);

  // B10: malformed intents skipped
  regs = C.parseMemoryRegisters_('');
  n = C.foldBiasIntents_(regs, [null, {}, { s: 1 }, { t: 'OK', s: -1, o: '' }], 131);
  assert('B10 malformed intents skipped, valid applied', n === 1 && regs.biases.length === 1 && regs.biases[0].s === -1);
}

// ═══ Section C — compressor integration (drain path)
console.log('═══ Section C — compressLifeHistory_ drain integration');
{
  // C1: bias-only citizen (no LifeHistory, no reflections) still drains
  let ctx = makeCtx([{ POPID: 'POP-1' }], 101, {
    biasIntents: { 'POP-1': [{ t: 'Marcus Webb', s: 1, o: 'source:bias|c101' }] }
  });
  C.compressLifeHistory_(ctx);
  let cell = get(ctx, 0, 'MemoryRegisters');
  let parsed = JSON.parse(cell);
  assert('C1 bias-only citizen: register written', parsed.biases.length === 1 && parsed.biases[0].t === 'Marcus Webb');
  assert('C2 summary counts biasApplied/biasCitizens',
    ctx.summary.lifeHistoryCompression.biasApplied === 1 && ctx.summary.lifeHistoryCompression.biasCitizens === 1);
  assert('C3 ledger flagged dirty', ctx.ledger.dirty === true);

  // C4: DialState untouched by bias sentiment (neutral serialize only — no nudge)
  const ds = JSON.parse(get(ctx, 0, 'DialState'));
  const allNeutral = Object.keys(ds.base).every(k => ds.base[k] === (E.newCitizen_().base[k]));
  assert('C4 bias fold leaves dials neutral (opinion is not identity)', allNeutral);

  // C5: existing register + unlived survives, bias folds in
  ctx = makeCtx([{
    POPID: 'POP-2',
    MemoryRegisters: JSON.stringify({ biases: [{ t: 'X', s: 2, o: '', r: 1, c: 0, cy: 90 }], unlived: [{ tag: 'Relocation', txt: 'moved once', cy: 80 }] })
  }], 102, {
    biasIntents: { 'POP-2': [{ t: 'X', s: -1, o: 'y' }] }
  });
  C.compressLifeHistory_(ctx);
  parsed = JSON.parse(get(ctx, 1 - 1, 'MemoryRegisters'));
  assert('C5 existing bias challenged: s 2 -> 1, c=1', parsed.biases[0].s === 1 && parsed.biases[0].c === 1);
  assert('C6 unlived array untouched by bias fold', parsed.unlived.length === 1 && parsed.unlived[0].tag === 'Relocation');

  // C7: corrupt existing cell -> fresh registers, intent still lands, no throw
  ctx = makeCtx([{ POPID: 'POP-3', MemoryRegisters: '{corrupt!!' }], 103, {
    biasIntents: { 'POP-3': [{ t: 'Z', s: 1, o: '' }] }
  });
  C.compressLifeHistory_(ctx);
  parsed = JSON.parse(get(ctx, 0, 'MemoryRegisters'));
  assert('C7 corrupt cell degrades gracefully, intent applied', parsed.biases.length === 1 && parsed.biases[0].t === 'Z');

  // C8: no intents for citizen -> MemoryRegisters cell byte-identical
  const before = JSON.stringify({ biases: [{ t: 'K', s: 1, o: '', r: 0, c: 0, cy: 88 }], unlived: [] });
  ctx = makeCtx([{ POPID: 'POP-4', MemoryRegisters: before }], 104, {
    biasIntents: { 'POP-OTHER': [{ t: 'Q', s: 1, o: '' }] }
  });
  C.compressLifeHistory_(ctx);
  assert('C8 no intents -> cell byte-identical', get(ctx, 0, 'MemoryRegisters') === before);

  // C9: column absent -> inert, no throw
  ctx = makeCtx([{ POPID: 'POP-5' }], 105, {
    noRegisterCol: true,
    biasIntents: { 'POP-5': [{ t: 'W', s: 1, o: '' }] }
  });
  let threw = false;
  try { C.compressLifeHistory_(ctx); } catch (e) { threw = true; }
  assert('C9 MemoryRegisters column absent -> inert no-op, no throw',
    !threw && ctx.summary.lifeHistoryCompression.biasApplied === 0);
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
