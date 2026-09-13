/**
 * engine.176 (S438) — pressure tags: the negative pole from causes.
 * Pure-helper tests for utilities/citizenDialMap.js: first breach / ongoing /
 * adapted state off LifeHistory, one tag per citizen per cycle, the ambient
 * retune, and the casino/layoff routing. Run: node scripts/pressureTags.test.js
 */
global.Logger = { log() {} };
const M = require('../utilities/citizenDialMap.js');
let passed = 0, failed = 0;
function assert(label, cond, detail) {
  if (cond) { console.log(`  ok   ${label}`); passed++; }
  else { console.error(`  FAIL ${label}${detail ? ': ' + detail : ''}`); failed++; }
}
const appended = [];
global.queueAppendIntent_ = (ctx, tab, row) => appended.push({ tab, row });

function ctxAt(cycle) { return { summary: { absoluteCycle: cycle }, config: { cycleCount: cycle }, now: 'C' + cycle }; }
const L = 1; // LifeHistory column index in the row shape below
function row(life) { return ['POP-1', life]; }

// ---- stamp parsing
assert('abs cycle from Y2C51', M.pressureAbsCycle_('Y2C51 — [Friction] x') === 103);
assert('abs cycle from C106', M.pressureAbsCycle_('C106 — [Strain] x') === 106);
assert('unstamped -> null', M.pressureAbsCycle_('2026-06-20 23:35 — [Friction] x') === null);

// ---- state machine
assert('no history -> none', M.pressureState_('', 110) === 'none');
assert('tag last cycle -> ongoing', M.pressureState_('C109 — [Friction] rent', 110) === 'ongoing');
assert('tag 3 cycles back -> ongoing (lookback 3)', M.pressureState_('C107 — [Friction] rent', 110) === 'ongoing');
assert('tag 4 cycles back -> none (breach cleared)', M.pressureState_('C106 — [Friction] rent', 110) === 'none');
const six = [104,105,106,107,108,109].map(c => 'C' + c + ' — [Strain] rent').join('\n');
assert('6 consecutive tagged cycles -> adapted', M.pressureState_(six, 110) === 'adapted');
const five = [105,106,107,108,109].map(c => 'C' + c + ' — [Strain] rent').join('\n');
assert('5 consecutive -> still ongoing', M.pressureState_(five, 110) === 'ongoing');
const gap = [103,104,105,106,108,109].map(c => 'C' + c + ' — [Strain] rent').join('\n');
assert('a clean cycle in the run resets adaptation', M.pressureState_(gap, 110) === 'ongoing');

// ---- emit: first / ongoing / adapted / one-per-cycle
let ctx = ctxAt(110), r = row('C100 — [Daily] quiet');
let t = M.emitPressureTag_(ctx, r, L, 'POP-1', 'rent', 'rent bit');
assert('first rent breach -> Friction', t === 'Friction', t);
assert('line appended with stamp + tag', /C110 — \[Friction\] rent bit$/.test(r[L]), r[L]);
assert('LifeHistory_Log intent queued', appended.length === 1 && appended[0].tab === 'LifeHistory_Log');
let t2 = M.emitPressureTag_(ctx, r, L, 'POP-1', 'debt', 'debt bit');
// engine.201 W1f: debt is its own slot — a rent claim no longer erases it; a second housing cause (hood) still yields
assert('second independent cause same cycle -> its own tag (per-cause slots)', t2 === 'Friction', t2);
assert('S.pressureTagged marks the citizen per slot', ctx.summary.pressureTagged['POP-1|housing'] === 'Friction' && ctx.summary.pressureTagged['POP-1|debt'] === 'Friction');
assert('same slot same cycle -> null (hood after rent)', M.emitPressureTag_(ctx, r, L, 'POP-1', 'hood', 'hood bit') === null);
ctx = ctxAt(111);
t = M.emitPressureTag_(ctx, r, L, 'POP-1', 'rent', 'rent again');
assert('next cycle same breach -> Strain', t === 'Strain', t);
ctx = ctxAt(112); t = M.emitPressureTag_(ctx, row('C111 — [Stumble] no work'), L, 'POP-2', 'unemployed', 'x');
assert('unemployed ongoing -> Strain', t === 'Strain');
t = M.emitPressureTag_(ctxAt(112), row(''), L, 'POP-3', 'unemployed', 'x');
assert('unemployed first -> Stumble', t === 'Stumble');
ctx = ctxAt(110); r = row(six);
t = M.emitPressureTag_(ctx, r, L, 'POP-4', 'rent', 'x');
assert('adapted -> nothing emitted', t === null && !/C110/.test(r[L]));
assert('adapted counted', ctx.summary.pressureCounts['rent:adapted'] === 1);
assert('missing config bar throws (ADR-0015)', (() => { try { M.pressureBar_({ config: {} }, 'dialFrictionRentBurden'); return false; } catch (e) { return /engine\.176/.test(e.message); } })());
assert('no LifeHistory column -> null', M.emitPressureTag_(ctxAt(5), row(''), -1, 'POP-9', 'rent', 'x') === null);

// ---- engine.182: overwork — Strain from the first week, never adapts
t = M.emitPressureTag_(ctxAt(120), row(''), L, 'POP-5', 'overwork', 'x');
assert('overwork first week -> Strain (not Friction)', t === 'Strain', t);
const sixOW = [114,115,116,117,118,119].map(c => 'C' + c + ' — [Strain] worked through').join('\n');
ctx = ctxAt(120); r = row(sixOW);
t = M.emitPressureTag_(ctx, r, L, 'POP-6', 'overwork', 'x');
assert('overwork never adapts (6 consecutive still emits)', t === 'Strain' && /C120 — \[Strain\]/.test(r[L]), t);
t = M.emitPressureTag_(ctxAt(120), row(sixOW), L, 'POP-7', 'rent', 'x');
assert('rent still adapts after 6', t === null);
assert('overwork text pool', /switch off|late night|weekend/.test(M.pressureText_('overwork', 1)));

// ---- engine.182: burnout + slipping integrity opens the dark end
{
  const E2 = require('../utilities/citizenMemory.js'); Object.keys(E2).forEach(k => { global[k] = E2[k]; });
  global.nudgesForEvent_ = M.nudgesForEvent_; global.baseTag_ = M.baseTag_;
  const C2 = require('../utilities/compressLifeHistory.js');
  const mk = (over) => { const c = E2.newCitizen_(); Object.assign(c.base, over); return C2.serializeDialState_(c); };
  const reach = (over, id) => C2.getCitizenDialBands_({}, id, mk(over)).crimeReachable;
  assert('integrity 15 -> reachable', reach({ integrity: 15 }, 'P-A') === true);
  assert('integrity 30 + composure 15 (burnout) -> reachable', reach({ integrity: 30, composure: 15 }, 'P-B') === true);
  assert('integrity 30 + composure 50 -> not reachable', reach({ integrity: 30, composure: 50 }, 'P-C') === false);
  assert('integrity 50 + composure 15 -> not reachable (integrity must slip)', reach({ integrity: 50, composure: 15 }, 'P-D') === false);
}

// ---- the map: ambient tints, pressure tags move, casino/layoff route
const sum = fx => Object.keys(fx).reduce((a, k) => a + fx[k], 0);
assert('Neighborhood is a plain day (engine.201 ruling 1b)', sum(M.nudgesForEvent_('Neighborhood', 1, 'x')) === 0);
assert('pressure line carries its cause: overwork Strain -> composure -1 family -1', JSON.stringify(M.nudgesForEvent_('Strain', 1, M.pressureText_('overwork', 0))) === JSON.stringify({ composure: -1, family: -1 }));
assert('pressure line carries its cause: hood Friction -> outabout -1', M.nudgesForEvent_('Friction', 1, M.pressureText_('hood', 1)).outabout === -1);
assert('a Friction line outside the pressure pools keeps its plain state effect', JSON.stringify(M.nudgesForEvent_('Friction', 1, 'parking ticket')) === JSON.stringify({ composure: -2 }));
assert('Daily is a plain day and moves nothing (engine.201 ruling 1)', sum(M.nudgesForEvent_('Daily', 1, 'x')) === 0);
assert('Friction -2 composure', M.nudgesForEvent_('Friction', 1, 'x').composure === -2);
assert('Strain -1 composure', M.nudgesForEvent_('Strain', 1, 'x').composure === -1);
assert('Stumble hits composure and drive', sum(M.nudgesForEvent_('Stumble', 1, 'x')) === -3);
assert('Career-Layoff is negative', sum(M.nudgesForEvent_('Career-Layoff', 1, 'x')) < 0);
assert('casino loss text routes negative', M.nudgesForEvent_('Casino', 1, 'the slip came back empty').composure === -3);
assert('casino win text routes positive', M.nudgesForEvent_('Casino', 1, 'the window paid — the week changed color').composure === 2);
assert('Promotion still reshapes (+8 drive)', M.nudgesForEvent_('Promotion', 1, 'x').drive === 8);
assert('Divorce still reshapes (-8 family)', M.nudgesForEvent_('Divorce', 1, 'x').family === -8);
assert('text pool deterministic', M.pressureText_('rent', 7) === M.pressureText_('rent', 7) && M.pressureText_('hood', 0).length > 10);

// engine.201 W1f: synthetic rows carry their actual DialState across fresh contexts.
{
  const E = require('../utilities/citizenMemory.js');
  function w1Row(id) { return [id, '', JSON.stringify(E.newCitizen_())]; }
  function w1Ctx(cycle, r) {
    return Object.assign(ctxAt(cycle), { ledger: { headers: ['POPID', 'LifeHistory', 'DialState'], rows: [r], dirty: false } });
  }
  function w1Emit(cycle, r, cause) {
    return M.emitPressureTag_(w1Ctx(cycle, r), r, 1, r[0], cause, M.pressureText_(cause, cycle));
  }
  const continuous = w1Row('SYNTHETIC-W1-ADAPTED');
  const emitted = [];
  for (let cycle = 101; cycle <= 115; cycle++) emitted.push(w1Emit(cycle, continuous, 'rent'));
  const rent = (JSON.parse(continuous[2]).pressure || {}).rent;
  assert('W1f adapted rent stays silent across its own silent Cycles',
    emitted[0] === 'Friction' && emitted.slice(1, 6).every(t => t === 'Strain') &&
    emitted.slice(6).every(t => t === null) && rent && rent.n === 15 && rent.l === 115,
    JSON.stringify({ emitted, rent: rent || null }));

  const absent = w1Row('SYNTHETIC-W1-ABSENT');
  for (let cycle = 101; cycle <= 106; cycle++) w1Emit(cycle, absent, 'rent');
  // No rent breach at all in C107: distinguish absence from an adapted silent call.
  const returning = w1Emit(108, absent, 'rent');
  const reset = (JSON.parse(absent[2]).pressure || {}).rent;
  assert('W1f a genuinely absent Cycle resets rent to first breach',
    returning === 'Friction' && reset && reset.n === 1 && reset.l === 108,
    JSON.stringify({ returning, rent: reset || null }));

  const concurrent = w1Row('SYNTHETIC-W1-SLOTS');
  const ctx = w1Ctx(101, concurrent);
  const emit = cause => M.emitPressureTag_(ctx, concurrent, 1, concurrent[0], cause, M.pressureText_(cause, 101));
  const tags = { rent: emit('rent'), hood: emit('hood'), overwork: emit('overwork'), debt: emit('debt'), unemployed: emit('unemployed') };
  assert('W1f housing shares one slot but cannot suppress overwork, debt, or unemployment',
    tags.rent === 'Friction' && tags.hood === null && tags.overwork === 'Strain' && tags.debt === 'Friction' && tags.unemployed === 'Stumble',
    JSON.stringify(tags));
}

// engine.201 W2 regression: exact cause text composes with every pressure state.
{
  for (const [cause, dial] of [['rent', 'outabout'], ['debt', 'outabout'], ['hood', 'outabout'], ['unemployed', 'drive'], ['overwork', 'family']]) {
    const observations = [];
    for (const [tag, stateFx] of [['Friction', { composure: -2 }], ['Strain', { composure: -1 }], ['Stumble', { composure: -2, drive: -1 }]]) {
      for (let seed = 0; seed < 3; seed++) {
        const text = M.pressureText_(cause, seed);
        const expected = Object.assign({}, stateFx);
        expected[dial] = (expected[dial] || 0) - 1;
        const fx = M.nudgesForEvent_(tag, 1, text), scaled = M.nudgesForEvent_(tag, 2, text);
        observations.push({ tag, text, fx, ok: Object.keys(fx).length === Object.keys(expected).length &&
          Object.keys(expected).every(d => fx[d] === expected[d] && scaled[d] === expected[d] * 2) });
      }
    }
    const plain = M.nudgesForEvent_('Friction', 1, 'Synthetic friction outside all pressure pools');
    assert(`W2 pressure ${cause} adds ${dial}-1; plain Friction stays composure-only`,
      observations.every(o => o.ok) && JSON.stringify(plain) === '{"composure":-2}',
      JSON.stringify({ mismatches: observations.filter(o => !o.ok).map(o => ({ tag: o.tag, fx: o.fx })), plain }));
  }
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
