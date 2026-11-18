/**
 * moneyLineSign.test.js — engine.350 Task 7: the money lines signed at their writer.
 * Six shapes of [Money] line had no map entry and no word the content rules catch, so they moved
 * nothing: a debt cleared, a week absorbed by savings, a default, a loan, the debts crossing a line,
 * a bad week borrowed against (142 lines on the ledger after C116), plus the six-figure milestone.
 * Each is now written under the dial it moves, sized by the fact. The windfall, the two mobility
 * lines, the judicial hold and the ticket keep the bare [Money] and what they did before.
 *
 * Run: node scripts/moneyLineSign.test.js
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const M = require('../utilities/citizenDialMap.js');
const src = fs.readFileSync(path.join(__dirname, '..', 'phase05-citizens', 'generationalWealthEngine.js'), 'utf8');
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };

// [tag, sentence start, dial, delta]
const SIGNED = [
  ['Money-Composure-Down-S', 'an unplanned $', 'composure', -1],
  ['Money-Composure-Down-M', 'the bad week cost more than the savings could hold — borrowed to cover it', 'composure', -2],
  ['Money-Composure-Down-M', 'the debts crossed a line this week — sleep comes harder now', 'composure', -2],
  ['Money-Composure-Down-S', 'borrowed against tomorrow to keep the household afloat', 'composure', -1],
  ['Money-Composure-Up-M', 'the last debt cleared — the ledger finally reads clean', 'composure', 2],
  ['Money-Composure-Down-L', 'defaulted on the debts — the savings are gone and the record carries it', 'composure', -4],
  ['Money-Drive-Up-M', 'savings crossed six figures — years of steady weeks did that', 'drive', 2]
];
SIGNED.forEach(function (s) {
  ok(src.indexOf("'[" + s[0] + '] ' + s[1]) > 0, 'written graded: [' + s[0] + '] ' + s[1]);
  ok(src.indexOf("'[Money] " + s[1]) < 0, 'no bare copy left: ' + s[1]);
  const fx = M.nudgesForEvent_(s[0], 1, s[1]), keys = Object.keys(fx);
  ok(keys.length === 1 && fx[s[2]] === s[3], s[0] + ' folds ' + JSON.stringify(fx));
  ok(M.baseTag_(s[0]) === 'Money', 'kind stays Money');
  // what it did before: nothing
  ok(Object.keys(M.nudgesForEvent_('Money', 1, s[1] + (s[1] === 'an unplanned $' ? '2400 week — savings took the hit' : ''))).length === 0, 'the bare line moved nothing: ' + s[1]);
});

// left as they were
ok(src.indexOf("'[Money] a windfall landed — $'") > 0, 'the windfall keeps its bare tag');
let fx = M.nudgesForEvent_('Money', 1, 'a windfall landed — $4200, banked');
ok(fx.composure === 3 && fx.family === 2, 'windfall as before ' + JSON.stringify(fx));
fx = M.nudgesForEvent_('Money', 1, 'the ground gave a little — 2 rungs down in one season');
ok(fx.composure === -6 && fx.drive === 2, 'a fall in standing as before ' + JSON.stringify(fx));
fx = M.nudgesForEvent_('Money', 1, 'moved up in the world — the ledger says so');
ok(fx.drive === 4 && fx.composure === 4, 'a rise in standing as before ' + JSON.stringify(fx));
ok(Object.keys(M.nudgesForEvent_('Money', 1, '1 week held with no pay — savings covered it [IncomeHit J100]')).length === 0, 'the judicial hold line still moves nothing');

// the engine's own readers of its line take the graded bracket
ok(src.indexOf("life.indexOf(stamp + ' — [Money') >= 0") > 0, 'one money line a citizen a Cycle: the guard sees a graded line');
ok((src.match(/line\.replace\(\/\^\\\[Money\[\^\\\]\]\*\\\] \/, ''\)/g) || []).length === 4 && src.indexOf("line.replace('[Money] ', '')") < 0, 'the story hook strips the bracket whatever its tail');
ok('[Money-Composure-Down-L] defaulted on the debts'.replace(/^\[Money[^\]]*\] /, '') === 'defaulted on the debts' && '[Money] moved up'.replace(/^\[Money[^\]]*\] /, '') === 'moved up', 'strip works on both forms');

console.log('moneyLineSign.test.js: ' + n + ' assertions passed');
