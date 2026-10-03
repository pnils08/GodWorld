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
for (const f of ['../utilities/safeRand.js', '../utilities/sportsWeekRecord.js', '../phase02-world-state/applySportsSeason.js',
  '../phase05-citizens/applyGameNightMoments.js']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, f), 'utf8'), sandbox);
}
// the real parseDialState_ (utilities/compressLifeHistory.js) is this JSON read with a {} fallback
sandbox.parseDialState_ = (str) => { try { const o = JSON.parse(str); return o && typeof o === 'object' ? o : {}; } catch (e) { return {}; } };
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
const headers = ['POPID', 'First', 'Last', 'LifeHistory', 'Status', 'Neighborhood', 'LastUpdated', 'ClockMode', 'EmployerBizId', 'RoleType', 'DialState'];
const FAN = (v, team) => JSON.stringify({ base: { fandom: v }, mood: {}, streak: {}, ...(team ? { fan: team } : {}) });
const people = [
  ['POP-00025', 'Arturo', 'Ramos', 'GAME', 'BIZ-00005', "Starting Pitcher, Oakland A's", ''],
  ['POP-00022', 'Danny', 'Horn', 'GAME', 'BIZ-00005', "Center Fielder, Oakland A's", ''],
  ['POP-00003', 'Mark', 'Aitken', 'GAME', 'BIZ-00005', "First Baseman, Oakland A's Legend", ''],
  ['POP-01028', 'Wendell', 'Carter Jr.', 'GAME', 'BIZ-00074', 'C / The Oaks', ''],
  ['POP-01024', 'AJ', 'Dybantsa', 'GAME', 'BIZ-00074', 'SF / The Oaks', ''],
  ['POP-00019', 'Isley', 'Kelley', 'GAME', 'BIZ-00005', "Shortstop, Oakland A's Legend", ''],
  ['POP-00527', 'Mike', 'Paulson', 'GAME', 'BIZ-00005', "General Manager, Oakland A's & The Oaks", ''],
  ['POP-00202', 'Marky', 'Beal', 'ENGINE', '', 'Bartender', FAN(85, 'as')],
  ['POP-00900', 'Oaks', 'Fan', 'ENGINE', '', 'Teacher', FAN(65, 'oaks')],
  ['POP-00901', 'Both', 'Fan', 'ENGINE', '', 'Nurse', FAN(60, 'both')],
  ['POP-00902', 'Mild', 'Fan', 'ENGINE', '', 'Clerk', FAN(59.9, 'as')],
  ['POP-00903', 'Organic', 'Fan', 'ENGINE', '', 'Driver', FAN(70)]
];
function run(entries, weeks, statusOf, withLog = true) {
  logs.length = 0;
  const rows = people.map(([id, f, l, clock, emp, role, dial]) =>
    [id, f, l, '', (statusOf && statusOf[id]) || 'Active', 'Jack London', '', clock, emp, role, dial]);
  const appended = [];
  const logSheet = { getLastRow: () => 1, getRange: () => ({ setValues: (v) => { appended.push(...v); } }) };
  let seed = 7;
  const ctx = {
    summary: { sportsFeedEntries: entries, sportsWeek: weeks || {}, cycleId: 110 },
    ledger: { headers, rows, dirty: false },
    ss: { getSheetByName: (n) => (n === 'LifeHistory_Log' && withLog ? logSheet : null) },
    config: { cycleCount: 110 },
    now: 'NOW',
    rng: () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
  };
  sandbox.applyGameNightMoments_(ctx);
  const tags = {};
  appended.forEach((x) => { (tags[x[1]] = tags[x[1]] || []).push(String(x[3]).split('|')[0]); });
  return { rows, appended, tags, dirty: ctx.ledger.dirty };
}
const week = (cls) => ({ g: 2, w: 2, l: 0, cls });
const pools = [].concat(...Object.values(vm.runInContext('GAME_NIGHT_POOLS', sandbox)));

// 2a. NAMED, no signed week (EVEN): game rows -> Sports-Played; feature -> Reputation; one line per resolving ROW
const r = run([
  { eventType: 'game-result', teamsUsed: "A's", namesUsed: 'Arturo Ramos (SP), Danny Horn (CF), Mark Aiken (1B)', streak: 'W2' },
  { eventType: 'game-result', teamsUsed: 'Oaks', namesUsed: 'AJ Dybantsa (SF), Wendell Carter Jr (C)', streak: 'L2' },
  { eventType: 'game-result', teamsUsed: "A's", namesUsed: 'Danny Horn (CF), Danny Horn (CF), Peter Busch (OF)', streak: 'W3' },
  { eventType: 'player-feature', teamsUsed: "A's", namesUsed: 'Isley Kelley (SS)' },
  { eventType: 'injury', teamsUsed: "A's", namesUsed: 'Arturo Ramos (SP)' },
  { eventType: 'roster-move', teamsUsed: 'Oaks', namesUsed: 'AJ Dybantsa (SF)' },
  { eventType: 'front-office', teamsUsed: "A's", namesUsed: 'Mike Paulson' }
], { "A's": week('EVEN'), Oaks: week('EVEN') });
assert.deepStrictEqual(r.tags['POP-00022'], ['Sports-Played', 'Sports-Played'], 'two game rows = two receipts; a name twice in one row = one');
assert.deepStrictEqual(r.tags['POP-00025'], ['Sports-Played', 'Sports-Injured']);
assert.deepStrictEqual(r.tags['POP-01024'], ['Sports-Played', 'Sports-Moved']);
assert.deepStrictEqual(r.tags['POP-01028'], ['Sports-Played'], 'Jr. matched');
assert.deepStrictEqual(r.tags['POP-00019'], ['Reputation']);
assert.deepStrictEqual(r.tags['POP-00527'], ['Sports'], 'any other kind: a plain, inert life event');
assert.ok(!r.tags['POP-00003'], 'a typo never resolves');
assert.ok(!r.tags['POP-00202'], 'EVEN week: no fan line');
for (const x of r.appended.filter((x) => String(x[3]).startsWith('Sports-Played'))) {
  assert.ok(pools.includes(x[4]), 'game lines draw the going-home pool: ' + x[4]);
}
assert.ok(r.appended.every((x) => x[4] && x[4] !== 'undefined'), 'no blank pick');
const horn = r.rows.find((x) => x[0] === 'POP-00022')[3];
assert.ok(/ — \[Sports-Played\] /.test(horn), 'the ledger line carries the bracket tag the fold reads');
assert.ok(logs.some((m) => /unresolved feed names, cycle 110: Mark Aiken, Peter Busch/.test(m)));

// 2b. STAFF + FANS on a signed week (the C110 shape: A's TITLE, Oaks LOSING_WEEK)
const r2 = run([{ eventType: 'game-result', teamsUsed: "A's", namesUsed: 'Danny Horn (CF)', streak: 'W2' }],
  { "A's": week('TITLE'), Oaks: { g: 2, w: 0, l: 2, cls: 'LOSING_WEEK' } });
assert.deepStrictEqual(r2.tags['POP-00022'], ['Sports-PlayedWin', 'Sports-Title'], 'named in a title week + the staff week line');
assert.deepStrictEqual(r2.tags['POP-00003'], ['Sports-Title'], 'every A\'s staff member, named or not');
assert.deepStrictEqual(r2.tags['POP-01024'], ['Sports-LosingWeek'], 'Oaks staff carry the Oaks week');
assert.deepStrictEqual(r2.tags['POP-00527'].sort(), ['Sports-LosingWeek', 'Sports-Title'], 'the two-team GM carries both weeks');
assert.deepStrictEqual(r2.tags['POP-00202'], ['Sports-Title'], 'an A\'s fan at 85');
assert.deepStrictEqual(r2.tags['POP-00900'], ['Sports-LosingWeek'], 'an Oaks fan feels every losing week (ruling v)');
assert.deepStrictEqual(r2.tags['POP-00901'].sort(), ['Sports-LosingWeek', 'Sports-Title'], 'a fan of both');
assert.ok(!r2.tags['POP-00902'], 'base 59.9 is not a fan');
assert.deepStrictEqual(r2.tags['POP-00903'], ['Sports-Title'], 'an organic fan with no team follows the A\'s');
assert.strictEqual(r2.dirty, true);

// 3. guards: the dead draw nothing; no log tab -> throw before any ledger write; no entries -> nothing
const r3 = run([{ eventType: 'game-result', teamsUsed: "A's", namesUsed: 'Arturo Ramos (SP)' }], {}, { 'POP-00025': 'Deceased' });
assert.ok(!r3.tags['POP-00025']);
const r3b = run([{ eventType: 'game-result', teamsUsed: "A's", namesUsed: 'Arturo Ramos (SP)' }], {}, { 'POP-00025': 'Retired' });
assert.deepStrictEqual(r3b.tags['POP-00025'], ['Sports-Played'], 'a retired legend named on a row still lives it');
assert.throws(() => run([{ eventType: 'game-result', teamsUsed: "A's", namesUsed: 'Arturo Ramos (SP)' }], {}, null, false), /LifeHistory_Log tab missing/);
const r4 = run([], { "A's": week('TITLE') });
assert.strictEqual(r4.appended.length, 0);
assert.strictEqual(r4.dirty, false);

console.log('gameNightMoments.test.js: all assertions passed');
