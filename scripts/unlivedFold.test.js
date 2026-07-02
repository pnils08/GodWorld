/**
 * unlivedFold.test.js — engine.38 B3 (seams Task 8, S283) + the in-world stamp
 * parser fix that unblocks it.
 *
 * Proves:
 *  A. parseHistoryLine_ reads the in-world stamp formats every Phase 4/5 writer
 *     emits ("Y2C48 — [Tag]", "C100 — [Tag]", "C? — [Tag]") with tag + cycle
 *     intact — these previously parsed as Untagged (S283 measure-twice find).
 *  B. foldAgedOutEntries_ captures branch-tagged events LEAVING the raw-20
 *     window into regs.unlived ({tag, txt<=120, cy}), cap 3 oldest-evicted,
 *     non-branch ignored, within-window untouched, regs=null -> fold-only.
 *  C. compressLifeHistory_ integration: capture + bias drain share one register
 *     parse/write; blank cells stay blank when nothing folds.
 *
 * Run: node scripts/unlivedFold.test.js
 */

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

// ═══ Section A — in-world stamp parsing
console.log('═══ Section A — in-world stamp parser');
{
  const p = (line) => C.parseLifeHistoryEntries_(line).entries[0];
  let r = p('Y2C48 — [Divorce] finalized the divorce after months');
  assert('A1 Y2C48 stamp: tag intact', r.tag === 'Divorce');
  assert('A2 Y2C48 stamp: cycle = (2-1)*52+48 = 100', r.cycle === 100);
  r = p('C87 — [CareerShift] turned down the foreman job');
  assert('A3 C87 stamp: tag + absolute cycle', r.tag === 'CareerShift' && r.cycle === 87);
  r = p('C? — [Daily] took a moment of rest');
  assert('A4 C? fallback stamp: tag intact, cycle null', r.tag === 'Daily' && r.cycle === null);
  r = p('2026-06-20 23:35 — [Background] felt a shift');
  assert('A5 legacy datetime stamp still parses', r.tag === 'Background');
  r = p('[Relocation] moved to Laurel');
  assert('A6 bare-tag format still parses', r.tag === 'Relocation');
  r = p('Y3C1 — [Retirement] last shift at the yard');
  assert('A7 year rollover math: Y3C1 = 105', r.cycle === 105);
}

// ═══ Section B — capture mechanics (unit)
console.log('═══ Section B — foldAgedOutEntries_ capture');
{
  const mk = (tag, text, cycle) => ({ tag, text, cycle: cycle == null ? null : cycle, timestamp: null, raw: '' });
  const fill = (n) => Array.from({ length: n }, (_, i) => mk('Daily', 'filler ' + i, 90 + i));

  // B1: branch event aging out is captured with original text + cycle
  let c = E.newCitizen_();
  let regs = C.parseMemoryRegisters_('');
  let entries = [mk('CareerShift', 'turned down the foreman job in Sacramento', 87)].concat(fill(20));
  let n = C.foldAgedOutEntries_(c, entries, 20, regs);
  assert('B1 aged-out CareerShift captured', n === 1 && regs.unlived.length === 1);
  assert('B2 entry stores ACTUAL event {tag, txt, cy}',
    regs.unlived[0].tag === 'CareerShift' && regs.unlived[0].txt === 'turned down the foreman job in Sacramento' && regs.unlived[0].cy === 87);

  // B3: non-branch tags ignored
  regs = C.parseMemoryRegisters_('');
  entries = [mk('Promotion', 'moved up at work', 87), mk('Wedding', 'married in the park', 88)].concat(fill(20));
  n = C.foldAgedOutEntries_(E.newCitizen_(), entries, 20, regs);
  assert('B3 non-branch aged-out tags ignored', n === 0 && regs.unlived.length === 0);

  // B4: branch event INSIDE the window is not captured
  regs = C.parseMemoryRegisters_('');
  entries = fill(5).concat([mk('Divorce', 'still fresh', 101)]);
  n = C.foldAgedOutEntries_(E.newCitizen_(), entries, 20, regs);
  assert('B4 within-window branch event NOT captured (nothing ages out)', n === 0 && regs.unlived.length === 0);

  // B5: cap 3, oldest evicted
  regs = C.parseMemoryRegisters_('');
  entries = [
    mk('CareerShift', 'first branch', 60), mk('Relocation', 'second branch', 65),
    mk('Divorce', 'third branch', 70), mk('Retirement', 'fourth branch', 75),
  ].concat(fill(20));
  n = C.foldAgedOutEntries_(E.newCitizen_(), entries, 20, regs);
  assert('B5 four branch events -> cap 3, oldest evicted',
    n === 4 && regs.unlived.length === 3 && regs.unlived[0].txt === 'second branch');

  // B6: text truncated to 120 chars
  regs = C.parseMemoryRegisters_('');
  entries = [mk('Relocation', 'x'.repeat(200), 80)].concat(fill(20));
  C.foldAgedOutEntries_(E.newCitizen_(), entries, 20, regs);
  assert('B6 txt truncated to 120', regs.unlived[0].txt.length === 120);

  // B7: tag match is case-insensitive; regs=null stays fold-only
  regs = C.parseMemoryRegisters_('');
  entries = [mk('DISPLACEMENTMOVE', 'forced out by rent', 82)].concat(fill(20));
  n = C.foldAgedOutEntries_(E.newCitizen_(), entries, 20, regs);
  assert('B7 case-insensitive branch match', n === 1);
  n = C.foldAgedOutEntries_(E.newCitizen_(), entries, 20, null);
  assert('B8 regs=null -> fold-only, returns 0, no throw', n === 0);

  // B9: dial fold still applied on the same walk (capture is a rider, not a
  // replacement). One event moves mood/streak, NOT base (streak-hardening
  // invariant — base needs a sustained run; the 49-test dial suite owns that).
  const c2 = E.newCitizen_();
  const before = JSON.stringify({ b: c2.base, s: c2.streak, m: c2.mood });
  entries = [mk('Divorce', 'finalized the divorce', 70)].concat(fill(20));
  C.foldAgedOutEntries_(c2, entries, 20, C.parseMemoryRegisters_(''));
  assert('B9 dial fold unchanged by capture rider',
    JSON.stringify({ b: c2.base, s: c2.streak, m: c2.mood }) !== before);
}

// ═══ Section C — compressor integration
console.log('═══ Section C — compressLifeHistory_ integration');
{
  function makeCtx(citizens, cycle, opts) {
    opts = opts || {};
    const headers = ['POPID', 'LifeHistory', 'TraitProfile', 'DialState', 'MemoryRegisters'];
    const rows = citizens.map(c => [c.POPID, c.LifeHistory || '', c.TraitProfile || '', c.DialState || '', c.MemoryRegisters || '']);
    return { mode: {}, summary: { absoluteCycle: cycle, biasIntents: opts.biasIntents }, ledger: { headers, rows, dirty: false } };
  }
  const get = (ctx, r) => ctx.ledger.rows[r][4];
  // 23 in-world-stamped lines: 3 old branch events + 20 filler -> 3 age out
  const branchLife = [
    'C60 — [CareerShift] turned down the foreman job in Sacramento',
    'C65 — [Relocation] left Fruitvale when the building sold',
    'C70 — [Wedding] married at the lake pergola',
  ].concat(Array.from({ length: 20 }, (_, i) => `C${80 + i} — [Daily] filler day ${i}`)).join('\n');

  let ctx = makeCtx([{ POPID: 'POP-1', LifeHistory: branchLife }], 101);
  C.compressLifeHistory_(ctx);
  let regs = JSON.parse(get(ctx, 0));
  assert('C1 two branch events captured end-to-end (parser -> fold -> register)',
    regs.unlived.length === 2, JSON.stringify(regs.unlived));
  assert('C2 Wedding (non-branch) not captured',
    regs.unlived.every(u => u.tag !== 'Wedding'));
  assert('C3 captured entries carry stamp-derived cycles',
    regs.unlived[0].cy === 60 && regs.unlived[1].cy === 65);
  assert('C4 summary unlivedApplied counted', ctx.summary.lifeHistoryCompression.unlivedApplied === 2);

  // C5: existing biases survive the unlived write (shared cell, additive)
  const seeded = JSON.stringify({ biases: [{ t: 'K', s: 2, o: '', r: 0, c: 0, cy: 88 }], unlived: [] });
  ctx = makeCtx([{ POPID: 'POP-2', LifeHistory: branchLife, MemoryRegisters: seeded }], 102);
  C.compressLifeHistory_(ctx);
  regs = JSON.parse(get(ctx, 0));
  assert('C5 existing biases preserved through unlived capture',
    regs.biases.length === 1 && regs.biases[0].t === 'K' && regs.unlived.length === 2);

  // C6: bias drain + unlived capture, one citizen, one write
  ctx = makeCtx([{ POPID: 'POP-3', LifeHistory: branchLife }], 103, {
    biasIntents: { 'POP-3': [{ t: 'Marcus Webb', s: -1, o: 'source:bias|c103' }] }
  });
  C.compressLifeHistory_(ctx);
  regs = JSON.parse(get(ctx, 0));
  assert('C6 combined: bias + unlived land in the same cell',
    regs.biases.length === 1 && regs.unlived.length === 2);

  // C7: nothing ages out + no intents -> blank cell stays blank (no churn)
  const shortLife = Array.from({ length: 5 }, (_, i) => `C${95 + i} — [Daily] quiet day ${i}`).join('\n');
  ctx = makeCtx([{ POPID: 'POP-4', LifeHistory: shortLife }], 104);
  C.compressLifeHistory_(ctx);
  assert('C7 compress-eligible, nothing folds -> register cell stays blank', get(ctx, 0) === '');
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
