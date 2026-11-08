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
  let seed = 7, draws = 0;
  const ctx = {
    summary: { sportsFeedEntries: entries, sportsWeek: weeks || {}, cycleId: 110 },
    ledger: { headers, rows, dirty: false },
    ss: { getSheetByName: (n) => (n === 'LifeHistory_Log' && withLog ? logSheet : null) },
    config: { cycleCount: 110 },
    now: 'NOW',
    rng: () => { draws++; seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
  };
  sandbox.applyGameNightMoments_(ctx);
  const tags = {};
  appended.forEach((x) => { (tags[x[1]] = tags[x[1]] || []).push(String(x[3]).split('|')[0]); });
  return { rows, appended, tags, dirty: ctx.ledger.dirty, draws };
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
assert.deepStrictEqual(r.tags['POP-00527'], ['Sports-Sociability-Up-S'], 'any other kind: being named in coverage moves sociability (engine.299 — no inert line)');
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

// 4. engine.331 — one hot/cold decision (the week's hotCold, the streak headline at the World_Config bar)
const bucket = (streak, hotCold, playerMood) => sandbox.gameNightBucket_({ streak, playerMood }, hotCold);
assert.strictEqual(bucket('W4', ''), 'win', 'W4 under the bar is a plain win night (the old W4 literal is gone)');
assert.strictEqual(bucket('W5', 'hot'), 'winStreak');
assert.strictEqual(bucket('W5', ''), 'win', 'a W5 the week\'s result runs against is not hot (no headline, no streak night)');
assert.strictEqual(bucket('L5', 'cold'), 'coldStreak', 'builder 2026-11-06: a cold week has its own night');
assert.strictEqual(bucket('L2', 'hot'), 'loss', 'a loss in a hot week stays a loss');
assert.strictEqual(bucket('L1', '', 'confident'), 'loss', 'the result decides before the mood');
assert.strictEqual(bucket('', '', 'locked-in'), 'win', 'no Streak: the mood sets the tone');
assert.strictEqual(bucket('', '', 'uncertain'), 'loss');
assert.strictEqual(bucket('', '', 'reflective'), 'neutral');
assert.strictEqual(bucket('', '', 'constructor'), 'neutral', 'an off-list mood is no tone (own keys only)');

// 5. builder 2026-11-06 "handle the dropdowm moods add to the night line": every dropdown mood has its clauses
const clauses = vm.runInContext('GAME_NIGHT_MOOD_CLAUSES_', sandbox);
const vocab = require('../utilities/setupSportsFeedValidation.js');
assert.deepStrictEqual(Object.keys(clauses).sort(), vocab.PLAYER_MOOD_VALUES.filter(Boolean).sort(),
  'mood clause keys must equal the PlayerMood dropdown');
assert.deepStrictEqual(Object.keys(vm.runInContext('GAME_NIGHT_MOOD_TONE_', sandbox)).sort(), Object.keys(clauses).sort());
const poolsByBucket = vm.runInContext('GAME_NIGHT_POOLS', sandbox);
const r5 = run([
  { eventType: 'game-result', teamsUsed: 'Oaks', namesUsed: 'AJ Dybantsa (SF)', streak: 'W5', playerMood: 'Locked In' },
  { eventType: 'game-result', teamsUsed: "A's", namesUsed: 'Danny Horn (CF)', streak: 'L5', playerMood: 'energized' },
  { eventType: 'player-feature', teamsUsed: "A's", namesUsed: 'Isley Kelley (SS)', playerMood: 'hungry' }
], { Oaks: Object.assign(week('WIN'), { hotCold: 'hot' }), "A's": { g: 2, w: 0, l: 2, cls: 'LOSING_WEEK', hotCold: 'cold' } });
const lineOf = (id, tag) => r5.appended.find((x) => x[1] === id && String(x[3]).startsWith(tag))[4];
const aj = lineOf('POP-01024', 'Sports-PlayedWin').split(' — ');
assert.ok(poolsByBucket.winStreak.includes(aj[0]), 'hot week W5: the streak night ' + aj[0]);
assert.ok(clauses['locked-in'].includes(aj[1]), '"Locked In" typed reads as locked-in and closes the line: ' + aj[1]);
const horn5 = lineOf('POP-00022', 'Sports-Played');
assert.ok(poolsByBucket.coldStreak.includes(horn5), 'cold week L5: the skid night, and an off-list mood adds nothing: ' + horn5);
assert.ok(lineOf('POP-00019', 'Reputation').indexOf(' — ') < 0, 'a mood colors only the game-night line');

// 6. engine.331 (codex diff review F1): the mood is text only — the same draws, the same staff / fan week lines
const night6 = (mood) => run([{ eventType: 'game-result', teamsUsed: 'Oaks', namesUsed: 'AJ Dybantsa (SF), Wendell Carter Jr (C)', streak: 'W2', playerMood: mood }],
  { Oaks: Object.assign(week('WIN'), { hotCold: '' }) });
const blank6 = night6(''), moody6 = night6('locked-in');
assert.strictEqual(moody6.draws, blank6.draws, 'a mood clause spends no draw of its own');
const named6 = (r) => r.appended.filter((x) => String(x[3]).indexOf('feedNamed') >= 0);
const week6 = (r) => r.appended.filter((x) => String(x[3]).indexOf('feedNamed') < 0).map((x) => x.join('|'));
assert.deepStrictEqual(week6(moody6), week6(blank6), 'staff and fan week lines byte-identical');
named6(moody6).forEach((x, i) => {
  const base = named6(blank6)[i][4];
  assert.ok(x[4].indexOf(base + ' — ') === 0 && clauses['locked-in'].includes(x[4].slice(base.length + 3)), x[4]);
});

// 7. engine.333 — the row's trigger word: a second received line, or a milestone that changes the row
// (builder 2026-11-05/07: a sports retirement leaves the sports layer with Status Active; injury fills the bed;
// the newest life-altering moment leads the bio). Fixture rows carry the milestone cells.
const H7 = headers.concat(['EconomicProfileKey', 'CitizenBio', 'StatusStartCycle', 'HealthCause', 'Tier', 'Income']);
const c7 = (n) => H7.indexOf(n);
const BIO = "DH from Boston playing his farewell 2041 season. 436 career homers, six rings.";
function rows7() {
  return [
    ['POP-00001', 'Vinnie', 'Keane', '', 'Active', 'Rockridge', '', 'GAME', 'BIZ-00005', "Designated Hitter, Oakland A's Legend", '', 'SPORTS_OVERRIDE', BIO, '', '', 1, 1500000],
    ['POP-00025', 'Arturo', 'Ramos', '', 'Active', 'Jack London', '', 'GAME', 'BIZ-00005', "Starting Pitcher, Oakland A's", '', 'SPORTS_OVERRIDE', '', '', '', 2, 900000],
    ['POP-01024', 'AJ', 'Dybantsa', '', 'Active', 'Downtown', '', 'GAME', 'BIZ-00074', 'SF / The Oaks', '', 'SPORTS_OVERRIDE', '', '', '', 2, 4000000],
    ['POP-00022', 'Danny', 'Horn', '', 'injured', 'Jack London', '', 'GAME', 'BIZ-00005', "Center Fielder, Oakland A's", '', 'SPORTS_OVERRIDE', '', 110, 'hamstring, dashboard', 3, 650000],
    ['POP-00019', 'Isley', 'Kelley', '', 'injured', 'Jack London', '', 'GAME', 'BIZ-00005', "Shortstop, Oakland A's Legend", '', 'SPORTS_OVERRIDE', '', 108, 'knee', 1, 1200000],
    ['POP-00527', 'Mike', 'Paulson', '', 'Active', 'Jack London', '', 'GAME', 'BIZ-00005', "General Manager, Oakland A's & The Oaks", '', 'SPORTS_OVERRIDE', '', '', '', 1, 2000000],
    ['POP-00611', 'Teo', 'Vance', '', 'Active', 'Fruitvale', '', 'GAME', 'BIZ-00005', "Relief Pitcher, Oakland A's", '', 'SPORTS_OVERRIDE', '', '', '', 3, 400000]
  ];
}
let priorCalls = [];
sandbox.hospitalPriorStatusForDischarge_ = (ctx, pop) => { priorCalls.push(pop); return 'Active'; };
function run7(entries, rows, weeks) {
  logs.length = 0;
  const appended = [];
  const logSheet = { getLastRow: () => 1, getRange: () => ({ setValues: (v) => { appended.push(...v); } }) };
  let seed = 11;
  const ripples = [];
  sandbox.recordRipple_ = (ctx, r) => ripples.push(r);
  const ctx = {
    summary: { sportsFeedEntries: entries, sportsWeek: weeks || {}, cycleId: 110 },
    ledger: { headers: H7, rows, dirty: false },
    ss: { getSheetByName: (n) => (n === 'LifeHistory_Log' ? logSheet : null) },
    config: Object.assign({ cycleCount: 110, postCareerIncomeTier1: 250000, postCareerIncomeTier2: 120000 }, (weeks && weeks.__config) || {}), now: 'NOW', cache: {},
    rng: () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
  };
  sandbox.applyGameNightMoments_(ctx);
  const tags = {};
  appended.forEach((x) => { (tags[x[1]] = tags[x[1]] || []).push(String(x[3]).split('|')[0]); });
  const rawTags = {};
  appended.forEach((x) => { (rawTags[x[1]] = rawTags[x[1]] || []).push(String(x[3])); });
  return { rows, appended, tags, rawTags, dirty: ctx.ledger.dirty, hospital: ctx.summary.hospitalEvents || [], ripples, logs: logs.slice() };
}
const rowOf = (r, id) => r.rows.find((x) => x[0] === id);

// 7a. the pin: every dropdown word has a route; every texture route's tag moves a dial (engine.299: no inert line)
const routes = vm.runInContext('SPORTS_TRIGGER_ROUTES_', sandbox);
const routeTags = vm.runInContext('SPORTS_TRIGGER_TAGS_', sandbox);
const routePools = vm.runInContext('SPORTS_TRIGGER_POOLS_', sandbox);
const words = vocab.EVENT_TRIGGER_VALUES.filter(Boolean);
assert.deepStrictEqual(Object.keys(routes).sort(), words.slice().sort(), 'dropdown words == route keys (a word 331 adds later fails here)');
assert.ok(!routes['hot-streak'] && !routes['cold-streak'], 'the engine-only words never reach the cell and have no route');
const dialMap = require('../utilities/citizenDialMap.js');
for (const k of Object.keys(routeTags)) {
  assert.ok(Object.keys(dialMap.nudgesForEvent_(routeTags[k], 1, '')).length > 0, 'route tag moves a dial: ' + routeTags[k]);
  assert.ok(Array.isArray(routePools[k]) && routePools[k].length >= 3, 'route pool: ' + k);
}
assert.ok(Object.keys(dialMap.nudgesForEvent_('Retirement', 1, '')).length > 0);

// 7b. retirement leaves the sports layer: clock, key, role, line, bare log tag, bio — Status stays Active
const r7 = run7([{ eventType: 'press-conference', teamsUsed: "A's", namesUsed: 'Vinnie Keane (DH)', eventTrigger: 'retirement' }], rows7());
const vin = rowOf(r7, 'POP-00001');
assert.strictEqual(vin[c7('ClockMode')], 'ENGINE');
assert.strictEqual(vin[c7('EconomicProfileKey')], '');
assert.strictEqual(vin[c7('RoleType')], "Former Designated Hitter, Oakland A's Legend");
assert.strictEqual(vin[c7('Status')], 'Active', 'a sports retirement is not a senior retirement');
assert.strictEqual(vin[c7('StatusStartCycle')], '', 'the health clock is not stamped');
assert.strictEqual(vin[c7('EmployerBizId')], 'BIZ-00005', 'employer of record kept');
assert.ok(/ — \[Retirement\] retired from the A's, announced C110 — the playing salary ends; appearances and the name pay \$250,000 a year$/m.test(vin[c7('LifeHistory')]), vin[c7('LifeHistory')]);
assert.strictEqual(vin[c7('Income')], 250000, 'engine.338: a Tier 1 flip takes the Tier 1 post-career figure');
assert.deepStrictEqual(r7.rawTags['POP-00001'], ['Sports-Sociability-Up-S|source:sports|feedNamed|event:press-conference|team:A\'s', 'Retirement'],
  'the type line, then the milestone with a BARE log tag the wake loop reads');
assert.strictEqual(vin[c7('CitizenBio')], "Now: Former Designated Hitter, Oakland A's Legend; retired C110. " + BIO, 'the Now: sentence leads the authored bio');
assert.ok(r7.ripples[0].causeDetail.indexOf('retirement: Vinnie Keane') > 0, r7.ripples[0].causeDetail);
assert.strictEqual(r7.dirty, true);

// 7c. idempotent: the same row fired again on the flipped row changes nothing and writes no second Retirement
const r7b = run7([{ eventType: 'press-conference', teamsUsed: "A's", namesUsed: 'Vinnie Keane (DH)', eventTrigger: 'retirement' }], r7.rows);
const vin2 = rowOf(r7b, 'POP-00001');
assert.deepStrictEqual(r7b.tags['POP-00001'], ['Sports-Sociability-Up-S'], 'the per-fire type line only');
assert.strictEqual(vin2[c7('RoleType')], "Former Designated Hitter, Oakland A's Legend", 'no Former Former');
assert.strictEqual(vin2[c7('CitizenBio')], "Now: Former Designated Hitter, Oakland A's Legend; retired C110. " + BIO, 'bio untouched');
assert.strictEqual((vin2[c7('LifeHistory')].match(/\[Retirement\]/g) || []).length, 1, 'one Retirement line across two fires');
assert.strictEqual(vin2[c7('Income')], 250000, 'engine.338 (codex F5): the re-fire never re-prices — Income stays the Tier 1 figure');
// a later chapter replaces the Now: sentence, never piles up; the strip anchors on the engine's own ` C<N>.` terminator
assert.strictEqual(sandbox.sportsBioNow_(vin2[c7('CitizenBio')], 'Owner, Keane Academy', 118), 'Now: Owner, Keane Academy C118. ' + BIO);
assert.strictEqual(sandbox.sportsBioNow_('Now: Former Dr. Keane, Oakland A\'s; retired C110. Dr. Keane grew up in Boston. More.', 'Team Physician, Oaks', 120),
  'Now: Team Physician, Oaks C120. Dr. Keane grew up in Boston. More.', 'an abbreviation period inside the Now: sentence does not cut it short (codex claim 6)');
assert.strictEqual(sandbox.sportsBioNow_('An authored bio with no Now: line. Second sentence.', 'Former X; retired', 110), 'Now: Former X; retired C110. An authored bio with no Now: line. Second sentence.');
assert.strictEqual(sandbox.sportsBioNow_('', 'Former Y; retired', 1), 'Now: Former Y; retired C1.');

// 7c2. who retires (codex F2): a row already off the GAME clock is left alone whatever its key; a GAME row not Active too
const halfRows = rows7();
halfRows.push(['POP-00508', 'Freddie', 'Silecki', 'C90 — [Retirement] hung it up', 'Retired', 'Downtown', '', 'ENGINE', '', 'Hall of Famer from old basketball league MUBA', '', 'SPORTS_OVERRIDE', 'Legend of the MUBA.', '', '', 2, 70000]);
halfRows.push(['POP-00018', 'Benji', 'Dillon', '', 'Retired', 'Rockridge', '', 'GAME', 'BIZ-00005', "Starting Pitcher, Oakland A's", '', 'SPORTS_OVERRIDE', '', '', '', 1, 1100000]);
const r7x = run7([{ eventType: 'player-feature', teamsUsed: "A's", namesUsed: 'Freddie Silecki, Benji Dillon (SP)', eventTrigger: 'retirement' }], halfRows);
const sil = rowOf(r7x, 'POP-00508'), dil = rowOf(r7x, 'POP-00018');
assert.deepStrictEqual([sil[c7('ClockMode')], sil[c7('EconomicProfileKey')], sil[c7('RoleType')], sil[c7('CitizenBio')]], ['ENGINE', 'SPORTS_OVERRIDE', 'Hall of Famer from old basketball league MUBA', 'Legend of the MUBA.'], 'the half-state row is untouched');
assert.deepStrictEqual(r7x.tags['POP-00508'], ['Reputation'], 'the type line only, no Retirement');
assert.deepStrictEqual([dil[c7('ClockMode')], dil[c7('Status')]], ['GAME', 'Retired'], 'a GAME row already Retired is not retired again');
assert.deepStrictEqual(r7x.tags['POP-00018'], ['Reputation']);
assert.ok(r7x.logs.some((m) => /retirement row on Freddie Silecki left alone \(off-clock\)/.test(m)) && r7x.logs.some((m) => /Benji Dillon left alone \(status:retired\)/.test(m)), r7x.logs.join(' / '));

// 7c3. engine.338 — the money after the career: Tier 2 takes the Tier 2 figure; Tier 3 keeps its pay and its line
// carries no money clause; a Retired/off-clock row's Income is never touched; a missing key throws (ADR-0015)
assert.strictEqual(sil[c7('Income')], 70000, 'an untouched row keeps its Income');
const r7m = run7([{ eventType: 'press-conference', teamsUsed: "A's", namesUsed: 'Arturo Ramos (SP), Teo Vance (RP)', eventTrigger: 'retirement' }], rows7());
const ram = rowOf(r7m, 'POP-00025'), van = rowOf(r7m, 'POP-00611');
assert.strictEqual(ram[c7('Income')], 120000, 'Tier 2 → postCareerIncomeTier2');
assert.ok(/pay \$120,000 a year$/m.test(ram[c7('LifeHistory')]), ram[c7('LifeHistory')]);
assert.strictEqual(van[c7('Income')], 400000, 'Tier 3: the pools\' row, pay untouched');
assert.ok(/ — \[Retirement\] retired from the A's, announced C110$/m.test(van[c7('LifeHistory')]), 'Tier 3 line carries no money clause: ' + van[c7('LifeHistory')]);
assert.strictEqual(van[c7('ClockMode')], 'ENGINE', 'the flip itself is the same at every Tier');
// codex F1 / R1: a missing key or a missing column refuses the whole phase BEFORE its first line — every row's LifeHistory
// unchanged (no unpaired type line), zero log rows, the retiring row still the player
function runRefused(entries, headers, rows, config) {
  const appended = [];
  const ctx = { summary: { sportsFeedEntries: entries, sportsWeek: {}, cycleId: 110 }, ledger: { headers, rows, dirty: false },
    ss: { getSheetByName: (n) => (n === 'LifeHistory_Log' ? { getLastRow: () => 1, getRange: () => ({ setValues: (v) => { appended.push(...v); } }) } : null) },
    config, now: 'NOW', cache: {}, rng: () => 0.5 };
  let err = null; try { sandbox.applyGameNightMoments_(ctx); } catch (e) { err = e; }
  return { err, appended, dirty: ctx.ledger.dirty };
}
const retireAndAward = [{ eventType: 'press-conference', teamsUsed: "A's", namesUsed: 'Arturo Ramos (SP), Vinnie Keane (DH)', eventTrigger: 'retirement' },
  { eventType: 'player-feature', teamsUsed: "A's", namesUsed: 'Mike Paulson', eventTrigger: 'award' }];
const noKeyRows = rows7(), noKeyBefore = JSON.stringify(noKeyRows);
const rk = runRefused(retireAndAward, H7, noKeyRows, { cycleCount: 110, postCareerIncomeTier2: 120000 });
assert.ok(rk.err && /engine\.338: World_Config postCareerIncomeTier1 missing/.test(rk.err.message), 'a missing key throws, never a silent 0: ' + (rk.err && rk.err.message));
assert.strictEqual(JSON.stringify(noKeyRows), noKeyBefore, 'R1: not one cell on any row moved — no type line, no flip');
assert.deepStrictEqual([rk.appended.length, rk.dirty], [0, false], 'R1: zero log rows, ledger not dirtied');
const H7noInc = H7.filter((h) => h !== 'Income');
const thinRows = rows7().map((r) => r.slice(0, -1)), thinBefore = JSON.stringify(thinRows);
const rc = runRefused(retireAndAward, H7noInc, thinRows, { cycleCount: 110, postCareerIncomeTier1: 250000, postCareerIncomeTier2: 120000 });
assert.ok(rc.err && /engine\.338: Simulation_Ledger Tier \/ Income column missing — the retirement row for Arturo Ramos \(SP\), Vinnie Keane \(DH\)/.test(rc.err.message), 'F3/R2: no Income column → refused, the feed names ride: ' + (rc.err && rc.err.message));
assert.deepStrictEqual([JSON.stringify(thinRows) === thinBefore, rc.appended.length], [true, 0], 'and nothing was written');
// the function's own guard names the citizen (R2) when called outside the phase preflight
assert.throws(() => sandbox.sportsRetire_({ config: {} }, rows7()[0], { iStatus: c7('Status'), iClock: c7('ClockMode'), iEcon: c7('EconomicProfileKey'), iRole: c7('RoleType'), iBio: c7('CitizenBio'), iTier: c7('Tier'), iIncome: c7('Income'), iPop: 0 }, "A's", 110, () => {}, 0),
  /postCareerIncomeTier1 missing.*retirement of POP-00001 refused, row left on the GAME clock/);
// a Cycle with no club retirement row never pays the read: no keys, no throw
const noRetire = runRefused([{ eventType: 'player-feature', teamsUsed: "A's", namesUsed: 'Mike Paulson', eventTrigger: 'award' }], H7, rows7(), { cycleCount: 110 });
assert.strictEqual(noRetire.err, null, 'no retirement row → the contract is not read');
const seeds338 = require('fs').readFileSync(require('path').join(__dirname, '../phase01-config/engine94SheetContract.js'), 'utf8');
assert.ok(/'postCareerIncomeTier1', 250000/.test(seeds338) && /'postCareerIncomeTier2', 120000/.test(seeds338), 'the seed list carries the builder\'s figures');

// 7d. the gates: an NFL row's retirement retires no one (331's team gate); a typed hot-streak writes no streak line
const r7c = run7([{ eventType: 'player-feature', teamsUsed: 'NFL', namesUsed: 'Arturo Ramos (SP)', eventTrigger: 'retirement' },
  { eventType: 'game-result', teamsUsed: "A's", namesUsed: 'Vinnie Keane (DH)', streak: 'W2', eventTrigger: 'hot-streak' }], rows7());
assert.strictEqual(rowOf(r7c, 'POP-00025')[c7('ClockMode')], 'GAME', 'NFL row: still a GAME row');
assert.deepStrictEqual(r7c.tags['POP-00025'], ['Reputation'], 'the type line only');
assert.deepStrictEqual(r7c.tags['POP-00001'], ['Sports-Played'], 'typed hot-streak: no streak line, no second line');
assert.ok(r7c.logs.some((m) => /trigger words with no citizen route, cycle 110: retirement@NFL, hot-streak/.test(m)), r7c.logs.join(' / '));

// 7e. texture routes: a second signed line beside the type line, tag carries the word; the move route for a trade
const r7d = run7([{ eventType: 'game-result', teamsUsed: 'Oaks', namesUsed: 'AJ Dybantsa (SF)', streak: 'W1', eventTrigger: 'buzzer-beater' },
  { eventType: 'roster-move', teamsUsed: "A's", namesUsed: 'Arturo Ramos (SP)', eventTrigger: 'traded' },
  { eventType: 'player-feature', teamsUsed: "A's", namesUsed: 'Mike Paulson', eventTrigger: 'community-outreach' }], rows7());
assert.deepStrictEqual(r7d.tags['POP-01024'], ['Sports-Played', 'Sports-Composure-Up-M']);
assert.ok(/\|trigger:buzzer-beater\|team:Oaks$/.test(r7d.rawTags['POP-01024'][1]));
assert.ok(routePools.celebration.includes(r7d.appended.find((x) => x[1] === 'POP-01024' && /Composure-Up-M/.test(x[3]))[4]));
assert.deepStrictEqual(r7d.tags['POP-00025'], ['Sports-Moved', 'Sports-Moved'], 'type route and trigger route both say moved');
assert.deepStrictEqual(r7d.tags['POP-00527'], ['Reputation', 'Sports-Warmth-Up-S']);
assert.strictEqual(r7d.hospital.length, 0);

// 7f. injury fills the bed — three states of the row
const r7e = run7([{ eventType: 'injury', teamsUsed: "A's", namesUsed: 'Arturo Ramos (SP), Danny Horn (CF), Isley Kelley (SS)', eventTrigger: 'injury', notes: 'hamstring' }], rows7());
const ramos = rowOf(r7e, 'POP-00025'), horn7 = rowOf(r7e, 'POP-00022'), kelley7 = rowOf(r7e, 'POP-00019');
// Active → the engine stamps the row and files the intake
assert.strictEqual(ramos[c7('Status')], 'injured');
assert.strictEqual(ramos[c7('StatusStartCycle')], 110);
assert.strictEqual(ramos[c7('HealthCause')], "injured playing for the A's");
// the dashboard stamped this Cycle (StatusStartCycle = 110, its own cause) → the engine files the bed, touches no Status cell
assert.strictEqual(horn7[c7('Status')], 'injured');
assert.strictEqual(horn7[c7('HealthCause')], 'hamstring, dashboard');
// in a health state from an earlier Cycle → the line only
assert.strictEqual(kelley7[c7('StatusStartCycle')], 108);
const beds = r7e.hospital;
assert.deepStrictEqual(Array.from(beds, (e) => e.popId).sort(), ['POP-00022', 'POP-00025'], 'two intakes, none for the earlier injury'); // host-realm array (hospitalEvents is the vm's)
const bedR = beds.find((e) => e.popId === 'POP-00025'), bedH = beds.find((e) => e.popId === 'POP-00022');
assert.deepStrictEqual([bedR.kind, bedR.intakeType, bedR.sourceSystem, bedR.sourceEventId, bedR.priorStatus, bedR.to],
  ['intake', 'injury', 'sports-feed', 'sports-feed:C110:injury:POP-00025', 'Active', 'injured']);
assert.deepStrictEqual([bedH.priorStatus, bedH.to, bedH.cause], ['Active', 'injured', 'hamstring, dashboard']);
for (const id of ['POP-00025', 'POP-00022', 'POP-00019']) assert.deepStrictEqual(r7e.tags[id], ['Sports-Injured', 'Sports-Injured'], id + ': type line + trigger line');
assert.ok(r7e.ripples[0].causeDetail.indexOf('injury (stamped): Arturo Ramos') > 0 && r7e.ripples[0].causeDetail.indexOf('injury (bed-only): Danny Horn') > 0
  && r7e.ripples[0].causeDetail.indexOf('injury (line-only): Isley Kelley') > 0, r7e.ripples[0].causeDetail);
// a second fire of the same row: same stable sourceEventId (the writer's dedup), no re-stamp of the clock
const r7f = run7([{ eventType: 'injury', teamsUsed: "A's", namesUsed: 'Arturo Ramos (SP)', eventTrigger: 'injury' }], r7e.rows);
assert.strictEqual(r7f.hospital.length, 1, 'the dashboard-stamped shape (StatusStartCycle = this Cycle) files the bed again — same id');
assert.strictEqual(r7f.hospital[0].sourceEventId, 'sports-feed:C110:injury:POP-00025');
assert.strictEqual(rowOf(r7f, 'POP-00025')[c7('HealthCause')], "injured playing for the A's");

// 7f2. who gets a bed (codex F1 + claim 2): a detained citizen named on an injury row gets the line only — no stamp, no
// receipt (the writer refuses a detained PriorStatus mid-loop); a player the ambulance already filed this Cycle gets no second receipt
const custodyRows = rows7();
custodyRows.push(['POP-00700', 'Held', 'Player', '', 'detained', 'Downtown', '', 'GAME', 'BIZ-00005', "Relief Pitcher, Oakland A's", '', 'SPORTS_OVERRIDE', '', '', '', 3]);
const r7y = run7([{ eventType: 'injury', teamsUsed: "A's", namesUsed: 'Held Player (RP)', eventTrigger: 'injury' }], custodyRows);
const held = rowOf(r7y, 'POP-00700');
assert.deepStrictEqual([held[c7('Status')], held[c7('StatusStartCycle')], held[c7('HealthCause')]], ['detained', '', ''], 'custody row untouched');
assert.strictEqual(r7y.hospital.length, 0, 'no receipt for a detained citizen');
assert.deepStrictEqual(r7y.tags['POP-00700'], ['Sports-Injured', 'Sports-Injured'], 'the lines still land');
assert.ok(r7y.ripples[0].causeDetail.indexOf('injury (line-only:detained): Held Player') > 0, r7y.ripples[0].causeDetail);
// the ambulance stamped critical this Cycle and filed its intake before GameNight ran
const ambRows = rows7();
const ramosRow = ambRows.find((x) => x[0] === 'POP-00025');
ramosRow[c7('Status')] = 'critical'; ramosRow[c7('StatusStartCycle')] = 110; ramosRow[c7('HealthCause')] = 'Ambulance: hit crossing Broadway';
const preFiled = { popId: 'POP-00025', kind: 'intake', cycle: 110, to: 'critical', sourceSystem: 'chaos-cars', sourceEventId: 'chaos:C110:POP-00025' };
logs.length = 0;
const appendedZ = [];
const ctxZ = {
  summary: { sportsFeedEntries: [{ eventType: 'injury', teamsUsed: "A's", namesUsed: 'Arturo Ramos (SP)', eventTrigger: 'injury' }], sportsWeek: {}, cycleId: 110, hospitalEvents: [preFiled] },
  ledger: { headers: H7, rows: ambRows, dirty: false },
  ss: { getSheetByName: (n) => (n === 'LifeHistory_Log' ? { getLastRow: () => 1, getRange: () => ({ setValues: (v) => { appendedZ.push(...v); } }) } : null) },
  config: { cycleCount: 110 }, now: 'NOW', cache: {}, rng: () => 0.5
};
sandbox.applyGameNightMoments_(ctxZ);
assert.strictEqual(ctxZ.summary.hospitalEvents.length, 1, 'the ambulance intake stays the only receipt');
assert.strictEqual(ctxZ.summary.hospitalEvents[0].sourceSystem, 'chaos-cars');
assert.deepStrictEqual([ramosRow[c7('Status')], ramosRow[c7('HealthCause')]], ['critical', 'Ambulance: hit crossing Broadway'], 'the ambulance stamp stands');
assert.strictEqual(appendedZ.filter((x) => x[1] === 'POP-00025').length, 2, 'type line + trigger line');

// 7g. injury-return empties the bed the health engine's way
priorCalls = [];
const r7g = run7([{ eventType: 'injury', teamsUsed: "A's", namesUsed: 'Isley Kelley (SS), Vinnie Keane (DH)', eventTrigger: 'injury-return' }], rows7());
const kel = rowOf(r7g, 'POP-00019');
assert.deepStrictEqual(priorCalls, ['POP-00019'], 'PriorStatus read for the injured player only');
assert.deepStrictEqual([kel[c7('Status')], kel[c7('StatusStartCycle')], kel[c7('HealthCause')]], ['Active', '', '']);
assert.strictEqual(r7g.hospital.length, 1);
assert.deepStrictEqual([r7g.hospital[0].kind, r7g.hospital[0].from, r7g.hospital[0].to, r7g.hospital[0].cause], ['transition', 'injured', 'active', 'knee']);
assert.deepStrictEqual(r7g.tags['POP-00019'], ['Sports-Injured', 'Sports-Composure-Up-S']);
assert.deepStrictEqual(r7g.tags['POP-00001'], ['Sports-Injured', 'Sports-Composure-Up-S'], 'already out: the line only');
assert.strictEqual(rowOf(r7g, 'POP-00001')[c7('Status')], 'Active');

// 7i. engine.338 (builder 2026-11-07/08) — `question`: the Notes cell, word for word, is the row's only line; a bare
// Question log tag (the wake loop's shape); no type line, no team gate, no row change, no dial, no seed.
const askRows = rows7();
askRows.push(['POP-00508', 'Freddie', 'Silecki', 'C90 — [Retirement] hung it up', 'Retired', 'Downtown', '', 'ENGINE', '', 'Former MUBA player, Hall of Famer', '', '', 'Legend of the MUBA.', '', '', 2, 70000]);
askRows.push(['POP-00900', 'Gone', 'Man', '', 'deceased', 'Downtown', '', 'ENGINE', '', 'Clerk', '', '', '', '', '', 3, 0]);
const r7i = run7([
  { eventType: 'press-conference', teamsUsed: "A's", namesUsed: 'Vinnie Keane (DH)', eventTrigger: 'question', notes: '  Would you take the hitting-coach job\n next spring?  ' },
  { eventType: 'player-feature', teamsUsed: '', namesUsed: 'Freddie Silecki, Gone Man', eventTrigger: 'question', notes: 'Would you coach the West Oakland youth league?' },
  { eventType: 'game-result', teamsUsed: "A's", namesUsed: 'Arturo Ramos (SP)', streak: 'W1' }
], askRows, { "A's": week('WIN') });
const askedVin = rowOf(r7i, 'POP-00001');
assert.deepStrictEqual(r7i.rawTags['POP-00001'], ['Question', "Sports-Win|source:sports|staffWeek|team:A's|week:WIN"],
  'the question is the row\'s only line — no "named in the papers" texture, bare log tag; the staff week line is the club\'s, as before');
assert.ok(/ — \[Question\] Would you take the hitting-coach job next spring\?$/m.test(askedVin[c7('LifeHistory')]), askedVin[c7('LifeHistory')]);
assert.strictEqual(askedVin[c7('LifeHistory')].split('\n').length, 2, 'whitespace folded: one life line, plus his staff week line');
assert.deepStrictEqual([askedVin[c7('ClockMode')], askedVin[c7('Income')], askedVin[c7('RoleType')], askedVin[c7('CitizenBio')]],
  ['GAME', 1500000, "Designated Hitter, Oakland A's Legend", BIO], 'a question changes nothing on the row');
assert.deepStrictEqual(r7i.rawTags['POP-00508'], ['Question'], 'a Retired MUBA legend on no club is asked the same way');
assert.strictEqual(r7i.appended.find((x) => x[1] === 'POP-00508')[4], 'Would you coach the West Oakland youth league?');
assert.strictEqual(r7i.appended.filter((x) => x[1] === 'POP-00900').length, 0, 'the dead are not asked');
assert.ok(r7i.logs.some((m) => /unresolved feed names.*Gone Man/.test(m)), 'a dead name is unresolved, named in the log');
assert.deepStrictEqual(r7i.tags['POP-00025'], ['Sports-PlayedWin', 'Sports-Win'], 'the game row beside it is untouched (type line + staff week)');
assert.ok(r7i.ripples.length === 1 && r7i.ripples[0].targetIds.indexOf('POP-00508') < 0, 'a question-only citizen is not in the sports seed');
assert.ok(r7i.ripples[0].causeDetail.indexOf('question') < 0 && r7i.ripples[0].causeDetail.indexOf('Silecki') < 0, r7i.ripples[0].causeDetail);
assert.deepStrictEqual(dialMap.nudgesForEvent_('Question', 1, 'Would you coach the injured list after you retire?'), {},
  'builder 2026-11-08: only the answer moves him — the question text never routes a dial');
assert.strictEqual(r7i.dirty, true);
// blank Notes asks nothing: no line, no ledger write, one log line naming the row
const r7j = run7([{ eventType: 'press-conference', teamsUsed: "A's", namesUsed: 'Vinnie Keane (DH)', eventTrigger: 'question', notes: '   ' }], rows7());
assert.strictEqual(r7j.appended.length, 0, 'nothing written');
assert.strictEqual(r7j.dirty, false);
assert.strictEqual(r7j.ripples.length, 0, 'no seed');
assert.ok(r7j.logs.some((m) => /question row names Vinnie Keane with a blank Notes cell/.test(m)), r7j.logs.join('\n'));
// a question only — no club week — writes the line and no seed at all
const r7k = run7([{ eventType: 'player-feature', teamsUsed: '', namesUsed: 'Vinnie Keane', eventTrigger: 'question', notes: 'Coach?' }], rows7());
assert.deepStrictEqual(r7k.rawTags['POP-00001'], ['Question']);
assert.strictEqual(r7k.ripples.length, 0, 'the week reached nobody the desks should hear about');
assert.strictEqual(r7k.dirty, true, 'the ledger still carries the line');

// 7h. a blank trigger: exactly the pre-333 shape (one type line, nothing else)
const r7h = run7([{ eventType: 'game-result', teamsUsed: "A's", namesUsed: 'Vinnie Keane (DH)', streak: 'W1', eventTrigger: '' }], rows7());
assert.deepStrictEqual(r7h.tags['POP-00001'], ['Sports-Played']);
assert.strictEqual(rowOf(r7h, 'POP-00001')[c7('ClockMode')], 'GAME');

console.log('gameNightMoments.test.js: all assertions passed');
