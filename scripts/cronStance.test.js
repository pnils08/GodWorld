/**
 * engine.180 (S438) — the cron reads the game. Proof for: stance/thrown/postureChangedCycle
 * (lib/citizenDials.js), the standing line's "what the last stretch threw" sentence and the
 * pool's postureChangedCycle (lib/wakePerception.js), pushFromResolves_ (the drain), and
 * maneuverApplyPush_ + the phase's consume/clear (phase05-citizens/maneuverEngine.js).
 * Run: node scripts/cronStance.test.js
 */
const fs = require('fs'), path = require('path');
global.Logger = { log() {} };
let passed = 0, failed = 0;
function assert(label, cond, detail) { if (cond) { console.log(`  ok   ${label}`); passed++; } else { console.error(`  FAIL ${label}${detail ? ': ' + detail : ''}`); failed++; } }
const D = require('../lib/citizenDials.js');

// ---- stance / thrown / postureChangedCycle
const ds = JSON.stringify({ base: { drive: 70 }, streak: {}, maneuver: { p: 'climb', g: 'home', a: 66, c: 106 } });
assert('stance reads posture/goal/since', JSON.stringify(D.stance(ds)) === JSON.stringify({ posture: 'climb', goal: 'home', since: 106 }));
assert('stance null without maneuver', D.stance(JSON.stringify({ base: {} })) === null && D.stance('nope') === null);
const life = ['Y3C1 — [Daily] quiet', 'Y3C2 — [Friction] rent took the biggest bite', 'Y3C2 — [Neighborhood] noticed', 'Y3C3 — [Promotion] moved up', 'Y3C3 — [Strain] paid the minimum', 'Y3C3 — [Maneuver-Climb] playing to climb'].join('\n');
assert('absCycleOf Y3C3 = 107', D.absCycleOf('Y3C3 — [x] y') === 107);
const t = D.thrown(life);
assert('thrown words the last 2 cycles, ambient omitted', /hard squeeze/.test(t) && /promotion/.test(t) && /same strain/.test(t) && /decision to push/.test(t) && !/noticed/.test(t), t);
assert('thrown respects lookback 1', !/hard squeeze/.test(D.thrown(life, 1)) && /promotion/.test(D.thrown(life, 1)));
assert('thrown caps at four and dedups', D.thrown(life).split(', ').length <= 4);
assert('thrown empty on ambient-only history', D.thrown('Y3C3 — [Daily] quiet\nY3C3 — [Neighborhood] x') === '');
assert('thrown never emits a digit', !/\d/.test(D.thrown(life)));
assert('postureChangedCycle = newest Maneuver line', D.postureChangedCycle(life) === 107 && D.postureChangedCycle('Y3C1 — [Daily] x') === null);

// ---- wakePerception: standing line + pool flag
const W = require('../lib/wakePerception.js');
const entry = { life, maneuver: { p: 'hold', g: 'home' }, line: null };
const standing = W.renderStanding(entry);
assert('standing: hold with a goal names the goal', /playing for, when the moment comes: the house first/.test(standing), standing);
assert('standing: what the last stretch threw', /What the last stretch threw at you: .*hard squeeze/.test(standing), standing);
assert('standing: climb line unchanged + thrown appended', /playing to climb/.test(W.renderStanding({ life, maneuver: { p: 'climb', g: 'home' } })));
assert('standing: no digits', !/\d/.test(standing), standing);

// ---- the drain: resolves -> push
const E = require('../utilities/citizenMemory.js'); Object.keys(E).forEach(k => { global[k] = E[k]; });
const M = require('../utilities/citizenDialMap.js'); global.nudgesForEvent_ = M.nudgesForEvent_; global.baseTag_ = M.baseTag_; global.nudgesForReflection_ = M.nudgesForReflection_;
global.queueCellIntent_ = () => {};
const C = require('../utilities/compressLifeHistory.js');
assert('push +1: look for', C.pushFromResolves_('I am going to look for a bigger place') === 1);
assert('push +1: apply', C.pushFromResolves_('apply for the opening at the clinic') === 1);
assert('push -1: hold off', C.pushFromResolves_('hold off on the move until spring') === -1);
assert('push -1: stop', C.pushFromResolves_('stop chasing it') === -1);
assert('push 0: no action', C.pushFromResolves_('the light on the lake was good') === 0 && C.pushFromResolves_('') === 0);
{
  // the drain queues the push on DialState.maneuver.push
  const values = [['ts','popId','cycle','wake','event','snippet','applied','affect','bondTarget','tension','resolves'],
    ['t', 'POP-1', 106, 'evening', 'Neighborhood', 'snip', 'no', 'Excited', '', '', 'going to look for a bigger place']];
  const ctx = { mode: {}, summary: { absoluteCycle: 106 }, ss: { getSheetByName: (n) => n === 'Reflection_Intake' ? { getDataRange: () => ({ getValues: () => values }) } : null },
    ledger: { headers: ['POPID', 'LifeHistory', 'TraitProfile', 'DialState'], rows: [['POP-1', 'Y3C2 — [Daily] quiet', '', JSON.stringify({ base: { drive: 60 }, streak: {}, maneuver: { p: 'hold', g: 'home', a: 55, c: 105 } })]], dirty: false } };
  C.compressLifeHistory_(ctx, {});
  const out = JSON.parse(ctx.ledger.rows[0][3]);
  assert('drain queued push {d:+1, u:107}', out.maneuver && out.maneuver.push && out.maneuver.push.d === 1 && out.maneuver.push.u === 107, JSON.stringify(out.maneuver));
  assert('drain stat pushesQueued', ctx.summary.lifeHistoryCompression.pushesQueued === 1);
}

// ---- maneuver: apply after recompute, clamped, consumed
global.queueAppendIntent_ = () => {}; global.queueBatchAppendIntent_ = () => {};
global.simYearOf_ = new Function(fs.readFileSync(path.resolve(__dirname, '../phase01-config/advanceSimulationCalendar.js'), 'utf8') + '\nreturn simYearOf_;')();
global.safeRand_ = (ctx) => ctx.rng;
const MV = require('../phase05-citizens/maneuverEngine.js');
assert('push: hold -> climb', MV.maneuverApplyPush_({ posture: 'hold', reason: 'even' }, { d: 1, u: 107 }, 107).posture === 'climb');
assert('push: climb -> hold on -1', MV.maneuverApplyPush_({ posture: 'climb', reason: 'ambition' }, { d: -1, u: 107 }, 107).posture === 'hold');
assert('push: climb +1 stays climb', MV.maneuverApplyPush_({ posture: 'climb', reason: 'ambition' }, { d: 1, u: 107 }, 107).posture === 'climb');
assert('push: never lifts a debt retreat', MV.maneuverApplyPush_({ posture: 'retreat', reason: 'debt' }, { d: 1, u: 107 }, 107).posture === 'retreat');
assert('push: never lifts a standing retreat', MV.maneuverApplyPush_({ posture: 'retreat', reason: 'standing' }, { d: 1, u: 107 }, 107).posture === 'retreat');
assert('push: expired does nothing', MV.maneuverApplyPush_({ posture: 'hold', reason: 'even' }, { d: 1, u: 106 }, 107).posture === 'hold');
assert('push: reason wake-push', MV.maneuverApplyPush_({ posture: 'hold', reason: 'even' }, { d: 1, u: 107 }, 107).reason === 'wake-push');
{
  const CFG = { maneuverClimbBar: 60, maneuverRetreatDebt: 6, maneuverStandingMargin: 5, maneuverClimbOdds: 1.5, maneuverRetreatOdds: 0.5, maneuverDriveWeight: 0.7 };
  const dial = (base, extra) => JSON.stringify(Object.assign({ base: Object.assign({ drive: 50, sociability: 50, warmth: 50, openness: 50, composure: 50, integrity: 50, family: 50, outabout: 50 }, base), streak: {} }, extra || {}));
  const H = ['POPID', 'Status', 'ClockMode', 'BirthYear', 'DebtLevel', 'HouseholdId', 'LineageId', 'DialState', 'TraitProfile', 'LifeHistory', 'LastUpdated'];
  const mk = (rows) => ({ config: Object.assign({ cycleCount: 107 }, CFG), summary: { absoluteCycle: 107, cycleId: 107 }, now: 'x', rng: () => 0.5,
    ledger: { headers: H.slice(), rows, dirty: false }, ss: { getSheetByName: () => null } });
  const rows = [
    ['POP-A', 'Active', 'ENGINE', 1990, 0, '', '', dial({ drive: 50 }, { maneuver: { p: 'hold', g: 'establish', a: 50, c: 100, push: { d: 1, u: 107 } } }), '', '', ''],
    ['POP-B', 'Active', 'ENGINE', 1990, 7, '', '', dial({ drive: 50 }, { maneuver: { p: 'retreat', g: 'establish', a: 50, c: 100, push: { d: 1, u: 107 } } }), '', '', ''],
    ['POP-C', 'Active', 'ENGINE', 1990, 0, '', '', dial({ drive: 80 }, { maneuver: { p: 'climb', g: 'establish', a: 71, c: 100, push: { d: 1, u: 107 } } }), '', '', ''],
  ];
  const ctx = mk(rows);
  const res = MV.runManeuverEngine_(ctx);
  const a = JSON.parse(rows[0][7]).maneuver, b = JSON.parse(rows[1][7]).maneuver, c = JSON.parse(rows[2][7]).maneuver;
  assert('phase: hold + push -> climb this cycle, line written', a.p === 'climb' && /Maneuver-Climb/.test(rows[0][9]) && /said so out loud/.test(rows[0][9]), rows[0][9]);
  assert('phase: debt retreat + push stays retreat', b.p === 'retreat');
  assert('phase: push consumed on every row', !a.push && !b.push && !c.push, JSON.stringify([a, b, c]));
  assert('phase: counts pushed/blocked', res.counts.pushed === 1 && res.counts.pushBlocked === 2, JSON.stringify(res.counts));
  // next cycle: the push is gone, the citizen returns to what causes say
  const ctx2 = mk(rows); ctx2.config.cycleCount = 108; ctx2.summary.absoluteCycle = 108; ctx2.summary.cycleId = 108;
  MV.runManeuverEngine_(ctx2);
  assert('phase: one cycle only — hold again from causes', JSON.parse(rows[0][7]).maneuver.p === 'hold');
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
