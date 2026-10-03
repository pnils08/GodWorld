#!/usr/bin/env node
'use strict';

// engine.208 M1: the athlete going-home seam. Before the fix no live LifeHistory_Log row ever
// carried a GAME_NIGHT_POOLS line — feed names carry positions ("Arturo Ramos (SP)") against an
// exact "first last" match, and safeRand_(ctx) (a function) was multiplied as a number (NaN pick).
// NamesUsed strings below are copied from output/beats/Oakland_Sports_Feed.jsonl (C108–C110);
// the ledger rows are fixtures carrying those citizens' real names, no sheet reads or writes.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const logs = [];
const sandbox = { Logger: { log: (m) => logs.push(String(m)) } };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../utilities/safeRand.js'), 'utf8'), sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../phase05-citizens/applyGameNightMoments.js'), 'utf8'), sandbox);
const parse = (s) => Array.from(sandbox.parseNamesUsed_({ namesUsed: s }));

// 1. parser shapes seen on the live feed
assert.deepStrictEqual(parse('Arturo Ramos (SP), Danny Horn (CF), Mark Aitken (1B)'),
  ['Arturo Ramos', 'Danny Horn', 'Mark Aitken']);
assert.deepStrictEqual(parse('Kevin Clark (3B). Sidney Tumolo (2B)'), ['Kevin Clark', 'Sidney Tumolo']);
assert.deepStrictEqual(parse('Ernesto Quintero (3B/1B/DH), Jose Colon (C)'), ['Ernesto Quintero', 'Jose Colon']);
assert.deepStrictEqual(parse('Benji Dillon (SP, Pablo Almanzar (SP)'), ['Benji Dillon', 'Pablo Almanzar']);
assert.deepStrictEqual(parse('AJ Dybantsa (SF), Wendell Carter Jr (C)'), ['AJ Dybantsa', 'Wendell Carter Jr']);
assert.deepStrictEqual(parse('Mike Paulson, Deacon Seymour'), ['Mike Paulson', 'Deacon Seymour']);
assert.deepStrictEqual(parse('Benji Dillon (SP/RP) Pablo Almanzar (SP)'), ['Benji Dillon', 'Pablo Almanzar']);
assert.deepStrictEqual(parse(''), []);
assert.strictEqual(sandbox.gameNightNameKey_('Wendell Carter Jr.'), sandbox.gameNightNameKey_('Wendell Carter Jr'));

// 2. the whole path: real entry point, a fixture ledger, a counted log sheet
const headers = ['POPID', 'First', 'Last', 'LifeHistory', 'Status', 'Neighborhood', 'LastUpdated'];
const people = [
  ['POP-00025', 'Arturo', 'Ramos'], ['POP-00022', 'Danny', 'Horn'], ['POP-00003', 'Mark', 'Aitken'],
  ['POP-01028', 'Wendell', 'Carter Jr.'], ['POP-01024', 'AJ', 'Dybantsa'], ['POP-00019', 'Isley', 'Kelley']
];
function run(entries, statusOf) {
  logs.length = 0;
  const rows = people.map(([id, f, l]) => [id, f, l, '', (statusOf && statusOf[id]) || 'Active', 'Jack London', '']);
  const appended = [];
  const logSheet = {
    getLastRow: () => 1,
    getRange: () => ({ setValues: (v) => { appended.push(...v); } })
  };
  let seed = 7;
  const ctx = {
    summary: { sportsFeedEntries: entries, cycleId: 110 },
    ledger: { headers, rows, dirty: false },
    ss: { getSheetByName: (n) => (n === 'LifeHistory_Log' ? logSheet : null) },
    config: { cycleCount: 110 },
    now: 'NOW',
    rng: () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
  };
  sandbox.applyGameNightMoments_(ctx);
  return { rows, appended, dirty: ctx.ledger.dirty };
}

const pools = [].concat(...Object.values(vm.runInContext('GAME_NIGHT_POOLS', sandbox)));
const r = run([
  { eventType: 'game-result', namesUsed: 'Arturo Ramos (SP), Danny Horn (CF), Mark Aiken (1B)', streak: 'W2' },
  { eventType: 'game-result', namesUsed: 'AJ Dybantsa (SF), Wendell Carter Jr (C)', streak: 'L2' },
  { eventType: 'game-result', namesUsed: 'Danny Horn (CF), Peter Busch (OF)', streak: 'W3' },
  { eventType: 'player-feature', namesUsed: 'Isley Kelley (SS)' }
]);
const got = r.appended.map((x) => x[1]).sort();
assert.deepStrictEqual(got, ['POP-00022', 'POP-00025', 'POP-01024', 'POP-01028'],
  'positions stripped, Jr. matched, one night per player, typo + no-POPID name + feature row skipped');
for (const x of r.appended) {
  assert.ok(pools.includes(x[4]), 'pick is a real pool line, not undefined: ' + x[4]);
}
assert.strictEqual(r.dirty, true);
const horn = r.rows.find((x) => x[0] === 'POP-00022')[3];
assert.ok(/ — \[Sports\] /.test(horn) && !/undefined/.test(horn), 'ledger LifeHistory carries the line');
assert.ok(logs.some((m) => /unresolved feed names, cycle 110: Mark Aiken, Peter Busch/.test(m)),
  'unresolved names are named in the execution log');

// 3. unchanged behaviour: inactive citizens are not reached; no game rows -> nothing written
const r2 = run([{ eventType: 'game-result', namesUsed: 'Arturo Ramos (SP)' }], { 'POP-00025': 'Retired' });
assert.strictEqual(r2.appended.length, 0);
const r3 = run([{ eventType: 'roster-move', namesUsed: 'Arturo Ramos (SP)' }]);
assert.strictEqual(r3.appended.length, 0);
assert.strictEqual(r3.dirty, false);

console.log('gameNightMoments.test.js: all assertions passed');
