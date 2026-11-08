#!/usr/bin/env node
'use strict';

/**
 * Run: node scripts/wakeOwedMilestone.test.js
 *
 * engine.333 (builder 2026-11-07: "retirement should join the reserve") — LifeHistory_Log is the fifth owed source
 * in lib/wakePerception.owedFrom: a bare `Retirement` EventTag inside the two-Cycle window owes the citizen one of the
 * reserved wakes, pinned on their own `[Retirement]` life line. Pure: fixture records in, owed entries out. No Sheets.
 */

const assert = require('assert');
const wp = require('/root/GodWorld/lib/wakePerception');

const EMPTY = { rows: [['x']] };
function rec(logRows, extra) {
  const chaos = [['CycleId', 'VehicleType', 'TargetScope', 'TargetId', 'DiceOutcome']];
  const casino = [['WagerId', 'POPID', 'CycleSettled', 'Status', 'Stake', 'Payout']];
  const hospital = [['POPID', 'AdmitCycle']];
  const judicial = [['POPID', 'ArrestCycle', 'SourceSystem']];
  const milestone = [['Timestamp', 'POPID', 'Name', 'EventTag', 'EventText', 'Neighborhood', 'Cycle']].concat(logRows || []);
  return Object.assign({ chaos, casino, hospital, judicial, milestone }, extra || {});
}
const logRow = (pop, tag, cycle, text) => [wp.simTag(cycle), pop, 'Someone', tag, text || 'retired from the club', 'Rockridge', String(cycle)];

let n = 0;
const pending = [];
function check(name, fn) {
  const r = fn();
  if (r && typeof r.then === 'function') pending.push(r.then(() => { n++; console.log('ok (async) — ' + name); }));
  else { n++; console.log('ok ' + n + ' — ' + name); }
}
process.on('unhandledRejection', (e) => { console.error(e); process.exit(1); });

check('a bare Retirement row in the window owes a tier-1 milestone wake with a stable id', () => {
  const r = wp.owedFrom(rec([logRow('POP-00001', 'Retirement', 115)]), 115, {});
  assert.strictEqual(r.owed.length, 1);
  const e = r.owed[0];
  assert.deepStrictEqual([e.id, e.pop, e.kind, e.tier, e.cycle], ['milestone:retirement:POP-00001:c115', 'POP-00001', 'milestone', 1, 115]);
  assert.strictEqual(e.pin.stamp, wp.simTag(115));
  assert.strictEqual(r.unknownTabs.length, 0);
});

check('the Cycle before is still in the window; two Cycles back has lapsed', () => {
  assert.strictEqual(wp.owedFrom(rec([logRow('POP-00001', 'Retirement', 114)]), 115, {}).owed.length, 1);
  assert.strictEqual(wp.owedFrom(rec([logRow('POP-00001', 'Retirement', 113)]), 115, {}).owed.length, 0);
  assert.strictEqual(wp.owedFrom(rec([logRow('POP-00001', 'Retirement', 116)]), 115, {}).owed.length, 0);
});

check('the pin matches this Cycle\'s life line under either stamp spelling, and no other line', () => {
  const e = wp.owedFrom(rec([logRow('POP-00001', 'Retirement', 113)]), 113, {}).owed[0];
  const feedLine = wp.simTag(113) + ' — [Retirement] retired from the A\'s, announced C113'; // the feed milestone (inWorldStamp_)
  const engineLine = 'C113 — [Retirement] transitioned into retirement';                      // applyMilestone_ (bare C stamp; live POP-00366)
  const others = [
    wp.simTag(113) + ' — [Sports-Played] got home late from the park',
    wp.simTag(112) + ' — [Retirement] retired from the A\'s',
    'C108 — [Retirement] announced their retirement after a long career', // another Cycle's retirement
    'C1130 — [Retirement] not this one either',
  ];
  // through the shown-set the wake uses: either spelling shows the event; a block with neither does not
  assert.strictEqual(wp.owedShownSet([e], [feedLine].concat(others).join('\n'), null).length, 1);
  assert.strictEqual(wp.owedShownSet([e], [engineLine].concat(others).join('\n'), null).length, 1);
  assert.strictEqual(wp.owedShownSet([e], others.join('\n'), null).length, 0);
  // a single-stamp pin (every other owed class) still works as before
  const jud = { id: 'j', pop: 'POP-00001', kind: 'judicial', tier: 1, cycle: 113, pin: { stamp: wp.simTag(113), re: /^\[Transgression-/ } };
  assert.strictEqual(wp.owedShownSet([jud], wp.simTag(113) + ' — [Transgression-Serious] arrested.', null).length, 1);
  assert.strictEqual(wp.owedShownSet([jud], 'C113 — [Transgression-Serious] arrested.', null).length, 0);
});

check('a piped sports tag and a near-miss tag are texture, not a milestone', () => {
  const r = wp.owedFrom(rec([
    logRow('POP-00001', 'Sports-Played|source:sports|feedNamed|event:game-result|team:A\'s', 115),
    logRow('POP-00001', 'Retirement|source:sports', 115),
    logRow('POP-00001', 'PostCareer-Retirement', 115),
    logRow('POP-00001', 'Wedding', 115),
  ]), 115, {});
  assert.strictEqual(r.owed.length, 0);
});

check('two log rows for one retirement in one Cycle owe one wake; the tag is case-tolerant', () => {
  const r = wp.owedFrom(rec([logRow('POP-00001', 'Retirement', 115), logRow('POP-00001', 'retirement', 115, 'a second writer\'s row')]), 115, {});
  assert.strictEqual(r.owed.length, 1);
});

check('a blank POPID owes nothing; two citizens owe two', () => {
  const r = wp.owedFrom(rec([logRow('', 'Retirement', 115), logRow('POP-00001', 'Retirement', 115), logRow('POP-00196', 'Retirement', 114)]), 115, {});
  assert.deepStrictEqual(r.owed.map((e) => e.pop).sort(), ['POP-00001', 'POP-00196']);
});

check('a log read without its columns is a loud skip and an unknown tab, never a quiet empty', () => {
  const r = wp.owedFrom(rec([], { milestone: [['Timestamp', 'POPID', 'Name', 'EventText']] }), 115, {});
  assert.strictEqual(r.owed.length, 0);
  assert.ok(r.skipped.some((s) => /LifeHistory_Log: no EventTag, Cycle column/.test(s)), r.skipped.join(' | '));
  assert.ok(r.unknownTabs.indexOf('LifeHistory_Log') >= 0);
  const r2 = wp.owedFrom(rec([], { milestone: null }), 115, {});
  assert.ok(r2.unknownTabs.indexOf('LifeHistory_Log') >= 0);
});

check('a milestone sits beside the ruled classes at tier 1 and loadOwedRecords asks for the log', () => {
  const r = wp.owedFrom(rec([logRow('POP-00001', 'Retirement', 115)], { hospital: [['POPID', 'AdmitCycle'], ['POP-00528', 115]] }), 115, {});
  assert.deepStrictEqual(r.owed.map((e) => e.kind + ':' + e.tier).sort(), ['hospital:1', 'milestone:1']);
  const asked = [];
  return wp.loadOwedRecords(async (t) => { asked.push(t); return [['x']]; }).then((out) => {
    assert.ok(asked.indexOf('LifeHistory_Log') >= 0, asked.join(','));
    assert.ok(out.milestone);
  });
});

check('owedCandidates reserves the retiree only when the life line is on the page', () => {
  const owed = wp.owedFrom(rec([logRow('POP-00001', 'Retirement', 115)]), 115, {}).owed;
  const withLine = [{ popId: 'POP-00001', eventMag: 8, lifeLines: [wp.simTag(115) + ' — [Retirement] retired from the A\'s'] }];
  const without = [{ popId: 'POP-00001', eventMag: 8, lifeLines: [wp.simTag(115) + ' — [Sports-Played] a quiet night'] }];
  assert.strictEqual(wp.owedCandidates(withLine, owed, {}, [], {}).ready.length, 1);
  const oc = wp.owedCandidates(without, owed, {}, [], {});
  assert.strictEqual(oc.ready.length, 0);
  assert.strictEqual(oc.unshowable.length, 1);
});

// engine.338 — the builder's question is the second owed milestone; one citizen owed both in a window gets ONE wake carrying both pins
check('a bare Question row owes a milestone wake pinned on the [Question] line; retirement + question = one wake, two pins', () => {
  const owed = wp.owedFrom(rec([logRow('POP-00001', 'Retirement', 115), logRow('POP-00001', 'Question', 115, 'Would you coach?')]), 115, {}).owed;
  assert.deepStrictEqual(owed.map((e) => e.id).sort(), ['milestone:question:POP-00001:c115', 'milestone:retirement:POP-00001:c115']);
  assert.deepStrictEqual(owed.map((e) => e.milestone).sort(), ['question', 'retirement']);
  const q = owed.find((e) => e.milestone === 'question');
  assert.ok(q.pin.re.test('[Question] Would you coach?') && !q.pin.re.test('[Retirement] retired'));
  const pool = [{ popId: 'POP-00001', eventMag: 8, lifeLines: [wp.simTag(115) + ' — [Retirement] retired from the A\'s', wp.simTag(115) + ' — [Question] Would you coach?'] }];
  const oc = wp.owedCandidates(pool, owed, {}, [], {});
  assert.strictEqual(oc.ready.length, 1, 'one wake for the citizen');
  const mine = wp.owedFor('POP-00001', owed, {});
  assert.strictEqual(mine.length, 2, 'both events ride it');
  const life = wp.lifeTailOf(pool[0].lifeLines, mine.map((e) => e.pin));
  assert.strictEqual(wp.owedShownSet(mine, life, null).length, 2, 'both pins show, both spend');
  // a piped sports tag is texture, not a question
  assert.strictEqual(wp.owedFrom(rec([logRow('POP-00001', 'Question|source:sports', 115)]), 115, {}).owed.length, 0);
});

Promise.all(pending).then(() => console.log('\nwakeOwedMilestone: ' + n + ' checks passed'));
