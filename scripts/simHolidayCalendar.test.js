#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const holidays = require('../phase02-world-state/getSimHoliday');
const { deriveDeskCalendar_ } = require('./buildDeskPackets');
const { emitHeader } = require('./buildWorldSummary');

const root = path.resolve(__dirname, '..');
const expected = {
  1: ['NewYear', 'New Year', 'major', 'Downtown', 'celebration'],
  7: ['Valentine', "Valentine's", 'minor', null, 'romance'],
  12: ['SpringEquinox', 'Spring Equinox', 'minor', null, 'seasonal'],
  15: ['Easter', 'Easter', 'major', null, 'religious'],
  19: ['MothersDay', "Mother's Day", 'minor', null, 'family'],
  25: ['FathersDay', "Father's Day", 'minor', null, 'family'],
  26: ['SummerSolstice', 'Summer Solstice', 'minor', 'Lake Merritt', 'seasonal'],
  27: ['SecondDawn', 'Second Dawn', 'oakland', null, 'godworld'],
  33: ['BackToSchool', 'Back to School', 'minor', null, 'civic'],
  38: ['FallEquinox', 'Fall Equinox', 'minor', null, 'seasonal'],
  44: ['Halloween', 'Halloween', 'major', 'Temescal', 'celebration'],
  47: ['Thanksgiving', 'Thanksgiving', 'major', null, 'family'],
  48: ['CreationDay', 'Creation Day', 'major', 'Oakland', 'godworld'],
  51: ['Holiday', 'Christmas', 'major', null, 'celebration'],
  52: ['NewYearsEve', "New Year's Eve", 'major', 'Downtown', 'celebration']
};

let passed = 0;
function test(name, fn) {
  fn();
  passed++;
  console.log('PASS ' + name);
}

const context = {
  safeRand_: () => () => 0.5,
  queueCellIntent_: () => {},
  simYearFromCycle_: () => 2026
};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, 'phase02-world-state/getSimHoliday.js'), 'utf8'), context);
vm.runInContext(fs.readFileSync(path.join(root, 'phase01-config/advanceSimulationCalendar.js'), 'utf8'), context);

test('15 exact rows, including existing metadata (Hanukkah dropped 2026-09-30, Second Dawn added 2026-10-02)', () => {
  assert.deepStrictEqual(Object.keys(holidays.SIM_HOLIDAYS).map(Number), Object.keys(expected).map(Number));
  for (const [position, values] of Object.entries(expected)) {
    const row = holidays.SIM_HOLIDAYS[position];
    assert.deepStrictEqual([row.name, row.label, row.priority, row.neighborhood, row.type], values);
  }
});

test('all 52 engine flags and details follow the table', () => {
  for (let position = 1; position <= 52; position++) {
    const row = holidays.SIM_HOLIDAYS[position];
    assert.strictEqual(holidays.getSimHoliday_(position), row ? row.name : 'none');
    const details = holidays.getSimHolidayDetails_(position);
    assert.strictEqual(details.name, row ? row.name : 'none');
    assert.strictEqual(details.label, row ? row.label : 'none');
    assert.strictEqual(details.priority, row ? row.priority : 'none');
    assert.strictEqual(details.neighborhood, row ? row.neighborhood : null);
    assert.strictEqual(details.type, row ? row.type : null);
  }
});

test('13 First Fridays follow the fourth-week cadence and miss kept holidays', () => {
  let count = 0;
  const kept = new Set([1, 7, 15, 19, 25, 27, 44, 47, 48, 51, 52]); // the season markers at 26 and 38 do share a First Friday week
  for (let position = 1; position <= 52; position++) {
    const firstFriday = holidays.isFirstFridayCycle_(position);
    assert.strictEqual(firstFriday, position % 4 === 2);
    if (firstFriday) {
      count++;
      assert.strictEqual(kept.has(position), false);
    }
  }
  assert.strictEqual(count, 13);
});

test('calendar writer and desk context agree at all 52 positions', () => {
  for (let position = 1; position <= 52; position++) {
    const cycle = 104 + position;
    const summary = {};
    context.advanceSimulationCalendar_({
      ss: { getSheetByName: () => ({}) },
      config: { cycleCount: cycle },
      summary
    });
    const row = [summary.godWorldYear, summary.simMonth, summary.cycleInMonth, summary.season, summary.holiday];
    const desk = deriveDeskCalendar_(cycle, row);
    assert.strictEqual(summary.holiday, expected[position] ? expected[position][0] : 'none');
    assert.strictEqual(summary.holidayLabel, expected[position] ? expected[position][1] : 'none');
    assert.strictEqual(summary.isFirstFriday, desk.isFirstFriday);
    assert.strictEqual(summary.isCreationDay, desk.isCreationDay);
    assert.strictEqual(desk.holiday.name, summary.holidayLabel);
    assert.strictEqual(desk.cycleRef, summary.cycleRef);
    assert.strictEqual(Object.hasOwn(desk, 'month'), false);
  }
});

test('Christmas keeps its engine flag and prints its label', () => {
  const details = holidays.getSimHolidayDetails_(51);
  assert.strictEqual(details.name, 'Holiday');
  assert.strictEqual(details.label, 'Christmas');
  const desk = deriveDeskCalendar_(51, [1, 12, 3, 'Winter', 'Holiday']);
  assert.strictEqual(desk.holiday.name, 'Christmas');
  const header = emitHeader(51, {}, [[1, 12, 3, 'Winter', 'Holiday']], []);
  assert(header.some(line => line.includes('Y1C51, Winter, holiday=Christmas')));
});

test('deleted helpers are absent from the Apps Script global', () => {
  for (const name of ['isCreationDay_', 'getCreationDayAnniversary_', 'getMonthFromCycle_', 'getSimMonthFromCycle_', 'getHolidayPriority_']) {
    assert.strictEqual(context[name], undefined, name);
  }
});

test('missing calendar data fails loudly; a pre-wave-1 flag prints as written with a warning', () => {
  assert.throws(() => deriveDeskCalendar_(1, null), /Simulation_Calendar/);
  const warn = console.warn; const warned = []; console.warn = m => warned.push(m);
  try {
    assert.strictEqual(deriveDeskCalendar_(6, [3, 2, 1, 'Winter', 'BlackHistoryMonth']).holiday.name, 'BlackHistoryMonth');
    assert.strictEqual(deriveDeskCalendar_(6, [3, 2, 1, 'Winter', 'BlackHistoryMonth'], 'NewYear').holiday.name, 'New Year');
  } finally { console.warn = warn; }
  assert(warned.length >= 1 && /pre-wave-1/.test(warned[0]));
});

test('rendered packet calendar lines carry no English month', () => {
  const rows = [];
  const packetSheet = {
    getLastRow: () => rows.length + 1,
    getRange: () => ({ setValues: values => rows.push(...values) })
  };
  const ss = { getSheetByName: name => name === 'Cycle_Packet' ? packetSheet : null };
  const packetContext = {
    Logger: { log: () => {} },
    inWorldStamp_: () => 'C_SYNTHETIC',
    requireTab_: (spreadsheet, name) => {
      assert.strictEqual(name, 'Cycle_Packet');
      return spreadsheet.getSheetByName(name);
    }
  };
  vm.createContext(packetContext);
  vm.runInContext(fs.readFileSync(path.join(root, 'phase10-persistence/buildCyclePacket.js'), 'utf8'), packetContext);
  packetContext.persistHospitalLedger_ = () => null;
  packetContext.persistJudicialLedger_ = () => null;

  for (let position = 1; position <= 52; position++) {
    const holiday = holidays.getSimHolidayDetails_(position);
    const summary = {};
    context.advanceSimulationCalendar_({
      ss: { getSheetByName: () => ({}) },
      config: { cycleCount: 104 + position },
      summary
    });
    packetContext.buildCyclePacket_({ ss, summary });
    const packet = rows[rows.length - 1][2];
    const calendar = packet.split('--- CALENDAR ---\n')[1].split('\n\n')[0];
    assert(calendar, 'calendar missing at position ' + position);
    assert(!/\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\b/i.test(calendar),
      'English month in calendar at position ' + position + ': ' + calendar);
    assert(calendar.includes('Holiday: ' + (holiday.name === 'none' ? 'none' : holiday.label)),
      'holiday label missing at position ' + position);
  }
});

test('a throwing ledger writer never costs the packet (engine.254 Task 8 R1-4)', () => {
  const rows = [];
  const packetSheet = { getLastRow: () => rows.length + 1, getRange: () => ({ setValues: values => rows.push(...values) }) };
  const ss = { getSheetByName: name => name === 'Cycle_Packet' ? packetSheet : null };
  const logged = [];
  const packetContext = {
    Logger: { log: () => {} },
    inWorldStamp_: () => 'C_SYNTHETIC',
    requireTab_: (spreadsheet, name) => spreadsheet.getSheetByName(name),
    logEngineError_: (ctx, phase, err) => logged.push(phase + ':' + err.message)
  };
  vm.createContext(packetContext);
  vm.runInContext(fs.readFileSync(path.join(root, 'phase10-persistence/buildCyclePacket.js'), 'utf8'), packetContext);
  packetContext.persistHospitalLedger_ = () => { throw new Error('hospital boom'); };
  packetContext.persistJudicialLedger_ = () => { throw new Error('judicial boom'); };
  const summary = {};
  context.advanceSimulationCalendar_({ ss: { getSheetByName: () => ({}) }, config: { cycleCount: 110 }, summary });
  packetContext.buildCyclePacket_({ ss, summary });
  assert.strictEqual(rows.length, 1, 'packet row still written');
  assert.strictEqual(JSON.stringify(summary.careJusticeWriteStatus), JSON.stringify({ hospital: 'failed', judicial: 'failed' })); // VM realm: compare by value
  assert.deepStrictEqual(logged, ['Phase10-HospitalLedger:hospital boom', 'Phase10-JudicialLedger:judicial boom']);
});

test('Second Dawn: position 27, the city\'s-own tier, citywide, label in the packet and never the flag', () => {
  const details = holidays.getSimHolidayDetails_(27);
  assert.deepStrictEqual([details.name, details.label, details.priority, details.neighborhood], ['SecondDawn', 'Second Dawn', 'oakland', null]);
  assert.strictEqual(holidays.isFirstFridayCycle_(27), false);
  assert.strictEqual(holidays.getSimHoliday_(28), 'none');
  // C131 is the first live Cycle at position 27
  const summary = {};
  context.advanceSimulationCalendar_({ ss: { getSheetByName: () => ({}) }, config: { cycleCount: 131 }, summary });
  assert.deepStrictEqual([summary.cycleOfYear, summary.holiday, summary.holidayLabel, summary.holidayPriority, summary.holidayNeighborhood, summary.isCreationDay],
    [27, 'SecondDawn', 'Second Dawn', 'oakland', null, false]);
  const rows = [];
  const packetSheet = { getLastRow: () => rows.length + 1, getRange: () => ({ setValues: values => rows.push(...values) }) };
  const ss = { getSheetByName: name => name === 'Cycle_Packet' ? packetSheet : null };
  const packetContext = { Logger: { log: () => {} }, inWorldStamp_: () => 'C_SYNTHETIC', requireTab_: (spreadsheet, name) => spreadsheet.getSheetByName(name) };
  vm.createContext(packetContext);
  vm.runInContext(fs.readFileSync(path.join(root, 'phase10-persistence/buildCyclePacket.js'), 'utf8'), packetContext);
  packetContext.persistHospitalLedger_ = () => null;
  packetContext.persistJudicialLedger_ = () => null;
  packetContext.buildCyclePacket_({ ss, summary });
  const packet = rows[0][2];
  assert(/^Holiday: Second Dawn \[oakland\]$/m.test(packet), 'packet holiday line: label, tier, no hood');
  assert(!/SecondDawn/.test(packet), 'flag leaked into the packet');
  const desk = deriveDeskCalendar_(131, [summary.godWorldYear, summary.simMonth, summary.cycleInMonth, summary.season, summary.holiday]);
  assert.strictEqual(desk.holiday.name, 'Second Dawn');
  const header = emitHeader(131, {}, [[summary.godWorldYear, summary.simMonth, summary.cycleInMonth, summary.season, summary.holiday]], []);
  assert(header.some(line => line.includes('Y3C27') && line.includes('holiday=Second Dawn')), 'world summary calendar line');
});

test('engine prose built from the holiday prints the label, never the flag (source rule)', () => {
  // The flag is a machine key ("holiday:" tags, map lookups, log lines); prose that reaches a sheet or a packet uses S.holidayLabel.
  const sites = {
    'phase09-digest/applyCycleWeight.js': /holiday \(' \+ holiday \+/,
    'phase06-analysis/economicRippleEngine.js': /description: cal\.holiday \+/,
    'phase07-evening-media/buildMediaPacket.js': /'Holiday: ' \+ holiday \+/,
    'phase05-citizens/generateMediaModeEvents.js': /ev\("[^"]*" \+ holiday \+/,
    'phase05-citizens/generateCivicModeEvents.js': /ev\("[^"]*" \+ holiday \+/,
    'phase05-citizens/bondEngine.js': /during ' \+ holiday \+/
  };
  for (const [file, bare] of Object.entries(sites)) {
    const src = fs.readFileSync(path.join(root, file), 'utf8');
    assert(!bare.test(src), 'bare holiday flag in prose: ' + file);
    assert(/holidayLabel/.test(src), 'label not read: ' + file);
  }
});

test('the cycle-weight reason names Second Dawn by its label (runtime)', () => {
  const sb = { Logger: { log: () => {} }, safeRand_: () => () => 0.5,
    ctx: { config: { cycleCount: 131 }, ss: { getSheetByName: () => null }, writeIntents: [],
      summary: { cycleId: 131, season: 'Summer', month: 7, holiday: 'SecondDawn', holidayLabel: 'Second Dawn', holidayPriority: 'oakland',
        sportsSeason: 'off-season', worldEvents: [], citizenEvents: [], eventArcs: [], storySeeds: [], cityDynamics: { sentiment: 0.1 }, weather: { impact: 1 } } } };
  vm.createContext(sb);
  for (const rel of ['phase06-analysis/applyShockMonitor.js', 'phase09-digest/applyCycleWeight.js']) vm.runInContext(fs.readFileSync(path.join(root, rel), 'utf8'), sb, { filename: rel });
  vm.runInContext('applyCycleWeight_(ctx)', sb);
  const reason = String(sb.ctx.summary.cycleWeightReason || '');
  assert(reason.includes('Oakland holiday (Second Dawn)'), 'reason: ' + reason);
  assert(!/SecondDawn/.test(reason), 'flag in reason: ' + reason);
});

console.log(passed + ' tests passed');
