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
assert('second cause same cycle -> null (one tag per citizen per cycle)', t2 === null);
assert('S.pressureTagged marks the citizen', ctx.summary.pressureTagged['POP-1'] === 'Friction');
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

// ---- the map: ambient tints, pressure tags move, casino/layoff route
const sum = fx => Object.keys(fx).reduce((a, k) => a + fx[k], 0);
assert('Neighborhood is a +1 tint', sum(M.nudgesForEvent_('Neighborhood', 1, 'x')) === 1);
assert('Daily is a +1 tint', sum(M.nudgesForEvent_('Daily', 1, 'x')) === 1);
assert('Friction -2 composure', M.nudgesForEvent_('Friction', 1, 'x').composure === -2);
assert('Strain -1 composure', M.nudgesForEvent_('Strain', 1, 'x').composure === -1);
assert('Stumble hits composure and drive', sum(M.nudgesForEvent_('Stumble', 1, 'x')) === -3);
assert('Career-Layoff is negative', sum(M.nudgesForEvent_('Career-Layoff', 1, 'x')) < 0);
assert('casino loss text routes negative', M.nudgesForEvent_('Casino', 1, 'the slip came back empty').composure === -3);
assert('casino win text routes positive', M.nudgesForEvent_('Casino', 1, 'the window paid — the week changed color').composure === 2);
assert('Promotion still reshapes (+8 drive)', M.nudgesForEvent_('Promotion', 1, 'x').drive === 8);
assert('Divorce still reshapes (-8 family)', M.nudgesForEvent_('Divorce', 1, 'x').family === -8);
assert('text pool deterministic', M.pressureText_('rent', 7) === M.pressureText_('rent', 7) && M.pressureText_('hood', 0).length > 10);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
