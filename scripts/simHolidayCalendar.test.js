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
  33: ['BackToSchool', 'Back to School', 'minor', null, 'civic'],
  38: ['FallEquinox', 'Fall Equinox', 'minor', null, 'seasonal'],
  44: ['Halloween', 'Halloween', 'major', 'Temescal', 'celebration'],
  47: ['Thanksgiving', 'Thanksgiving', 'major', null, 'family'],
  48: ['CreationDay', 'Creation Day', 'major', 'Oakland', 'godworld'],
  50: ['Hanukkah', 'Hanukkah', 'cultural', null, 'religious'],
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

test('15 exact kept and held rows, including existing metadata', () => {
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
  const kept = new Set([1, 7, 15, 19, 25, 44, 47, 48, 51, 52]);
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

console.log(passed + ' tests passed');
