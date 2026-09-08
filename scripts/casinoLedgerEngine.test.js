'use strict';

global.Logger = { log: function () {} };
global.safeRand_ = function (ctx) { return ctx.rng; };
global.queueAppendIntent_ = function (ctx, tab, row) {
  ctx._appends = ctx._appends || [];
  ctx._appends.push({ tab: tab, row: row });
};
global.queueCellIntent_ = function (ctx, tab, r, c, v) {
  ctx._cells = ctx._cells || [];
  ctx._cells.push({ tab: tab, r: r, c: c, v: v });
};

// engine.148: the calendar's year helper, from the real source — the flat Apps Script namespace resolves it the same way
global.simYearOf_ = new Function(require('fs').readFileSync(require('path').resolve(__dirname, '../phase01-config/advanceSimulationCalendar.js'), 'utf8') + '\nreturn simYearOf_;')();

const E = require('../phase05-citizens/casinoLedgerEngine.js');

let failed = 0;
function check(name, cond, detail) {
  if (cond) console.log('  ok  ' + name);
  else { failed++; console.error('  FAIL ' + name + (detail ? ': ' + detail : '')); }
}

check('house biz', E.CASINO_HOUSE_BIZ === 'BIZ-00100');
check('headers 15 cols', E.CASINO_HEADERS.length === 15);
check('wagerId stable', E.casinoWagerId_(105, 'POP-TEST-1', 'credits_sign', 'ep-a') ===
  E.casinoWagerId_(105, 'POP-TEST-1', 'credits_sign', 'ep-a'));

check('pilot blocked on show', E.casinoEligible_('Active', 30, 52000, 8000, 'BIZ-00018', 'undocked', true) === false);
check('pilot allowed on sports', E.casinoEligible_('Active', 30, 52000, 8000, 'BIZ-00018', 'sports', true) === true);
check('house staff blocked', E.casinoEligible_('Active', 29, 200000, 50000, 'BIZ-00100', 'sports', false) === false);
check('minor blocked', E.casinoEligible_('Active', 16, 52000, 8000, 'BIZ-00018', 'sports', false) === false);

const money = E.casinoApplyMoney_(50, 2, 100, 0, false);
check('zeroed NW bumps debt', money.netWorth === 0 && money.debtLevel === 3);

const sports = E.casinoParseSports_([
  { eventType: 'game-result', teamsUsed: "A's", streak: 'W1', cycle: 105 }
], 'as');
check('sports W1 settles win', sports.kind === 'settle' && sports.franchiseWon === true);
const quiet = E.casinoParseSports_([
  { eventType: 'game-result', teamsUsed: "A's", streak: '', cycle: 105 }
], 'as');
check('blank streak carries', quiet.kind === 'carry');

const undocked = [{ popId: 'POP-TEST-1', episodeId: 'ep-a', creditsDelta: 42, mishapCount: 0 }];
const win = E.casinoResolve_({
  status: 'open', marketFamily: 'undocked', marketId: 'credits_sign',
  eventId: 'ep-a', side: 'pos'
}, { undocked: undocked });
check('engine credits_sign pos wins', win.status === E.CASINO_ST.WIN);
const blank = E.casinoResolve_({
  status: 'open', marketFamily: 'undocked', marketId: 'credits_sign',
  eventId: 'ep-c', side: 'pos'
}, { undocked: [{ popId: 'POP-TEST-1', episodeId: 'ep-c', creditsDelta: null }] });
check('blank delta voids', blank.status === E.CASINO_ST.VOID_GATE);

function sheet(values) {
  return {
    getDataRange: function () { return { getValues: function () { return values; } }; },
    getRange: function () {
      return { setValues: function (v) { this._written = v; } };
    }
  };
}

const headers = E.CASINO_HEADERS;
function rowFrom(obj) {
  return headers.map(function (h) { return obj[h] != null ? obj[h] : ''; });
}

check('missing tab is no-op', (function () {
  var ctx = {
    ledger: { headers: ['POPID', 'NetWorth'], rows: [['POP-TEST-1', 1000]], dirty: false },
    ss: { getSheetByName: function () { return null; } },
    rng: function () { return 0.99; },
    summary: {}
  };
  var r = E.processCasinoLedger_(ctx, 105);
  return r.missingTab === true && ctx.ledger.rows[0][1] === 1000;
})());

const casinoValues = [
  headers,
  rowFrom({
    WagerId: 'w-open', CyclePlaced: 104, POPID: 'POP-TEST-1', HouseholdId: 'HH-T',
    MarketFamily: 'undocked', MarketId: 'credits_sign', EventId: 'ep-a',
    Side: 'pos', Stake: 40, Odds: 1.83, Payout: 0, Status: 'open', HouseFloatAfter: ''
  }),
  rowFrom({
    WagerId: 'HOUSE', Status: 'house', HouseFloatAfter: 250000
  })
];

const slHeaders = [
  'POPID', 'Status', 'BirthYear', 'Income', 'NetWorth', 'DebtLevel', 'LifeHistory',
  'WealthLevel', 'EmployerBizId', 'HouseholdId', 'DialState', 'TraitProfile',
  'First', 'Last', 'Neighborhood', 'Tier', 'RoleType', 'CareerStage'
];
const slRow = [
  'POP-TEST-1', 'Active', 2010, 52000, 1000, 0, '',
  5, 'BIZ-00018', 'HH-T', '', 'Archetype:Drifter|drive:50',
  'Test', 'Citizen', 'Temescal', '4', 'Clerk', 'mid'
];

const ctxLive = {
  ledger: { headers: slHeaders, rows: [slRow.slice()], dirty: false },
  ss: {
    getSheetByName: function (name) {
      if (name === 'Casino_Ledger') return sheet(casinoValues);
      if (name === 'Undocked_Feed') return sheet([['TargetCycle', 'POPID', 'EpisodeId']]);
      if (name === 'Household_Ledger') {
        return sheet([['HouseholdId', 'HouseholdSavings'], ['HH-T', 12000]]);
      }
      return null;
    }
  },
  rng: function () { return 0.99; },
  summary: {
    undockedFeedEntries: undocked,
    undockedPilots: {},
    sportsFeedEntries: [],
    storyHooks: []
  },
  persist: { updates: [] }
};

const ran = E.processCasinoLedger_(ctxLive, 105);
check('armed tab settled', ran.settled === 1);
check('NetWorth moved by payout', ctxLive.ledger.rows[0][4] === 1000 + Math.round(40 * 1.83));
check('LifeHistory got [Casino]', String(ctxLive.ledger.rows[0][6]).indexOf('[Casino]') >= 0);
check('Tier untouched', ctxLive.ledger.rows[0][15] === '4');
check('RoleType untouched', ctxLive.ledger.rows[0][16] === 'Clerk');
check('CareerStage untouched', ctxLive.ledger.rows[0][17] === 'mid');
check('Employer untouched', ctxLive.ledger.rows[0][8] === 'BIZ-00018');
check('ledger marked dirty', ctxLive.ledger.dirty === true);
check('status cell queued', (ctxLive._cells || []).some(function (c) {
  return c.v === 'settled-win';
}));

const ctxRerun = {
  ledger: { headers: slHeaders, rows: [slRow.slice()], dirty: false },
  ss: {
    getSheetByName: function (name) {
      if (name === 'Casino_Ledger') {
        var settled = [
          headers,
          rowFrom({
            WagerId: 'w-open', CyclePlaced: 104, CycleSettled: 105, POPID: 'POP-TEST-1',
            MarketFamily: 'undocked', MarketId: 'credits_sign', EventId: 'ep-a',
            Side: 'pos', Stake: 40, Odds: 1.83, Payout: 73, Status: 'settled-win',
            HouseFloatAfter: 249927
          }),
          rowFrom({ WagerId: 'HOUSE', Status: 'house', HouseFloatAfter: 249927 })
        ];
        return sheet(settled);
      }
      if (name === 'Undocked_Feed') return sheet([['TargetCycle', 'POPID', 'EpisodeId']]);
      return null;
    }
  },
  rng: function () { return 0.99; },
  summary: { undockedFeedEntries: undocked, undockedPilots: {}, sportsFeedEntries: [] }
};
const rerun = E.processCasinoLedger_(ctxRerun, 105);
check('re-run does not double-pay', rerun.settled === 0 && ctxRerun.ledger.rows[0][4] === 1000);


// ---------------------------------------------------------------------------
// engine.175 (S438): the draw + pilot-keyed show markets
// ---------------------------------------------------------------------------
check('draw headers 10 cols', E.UNDOCKED_DRAW_HEADERS.length === 10 && E.UNDOCKED_DRAW_HEADERS[0] === 'TargetCycle');

const drawHeaders = ['POPID', 'Status', 'BirthYear', 'First', 'Last', 'Neighborhood', 'RoleType', 'EmployerBizId',
  'MigrationDestination', 'MigratedCycle', 'ReturnedCycle', 'NetWorth', 'Income'];
function drawRow(pid, over) {
  var base = { POPID: pid, Status: 'Active', BirthYear: 1990, First: 'F' + pid.slice(-2), Last: 'L', Neighborhood: 'Temescal',
    RoleType: 'Clerk', EmployerBizId: 'BIZ-00018', MigrationDestination: '', MigratedCycle: '', ReturnedCycle: '', NetWorth: 5000, Income: 52000 };
  Object.keys(over || {}).forEach(function (k) { base[k] = over[k]; });
  return drawHeaders.map(function (h) { return base[h]; });
}
const drawRows = [
  drawRow('POP-00001'), drawRow('POP-00002'), drawRow('POP-00003'), drawRow('POP-00004'),
  drawRow('POP-00005'), drawRow('POP-00006'), drawRow('POP-00007'),
  drawRow('POP-00008', { BirthYear: 2030 }),                       // minor
  drawRow('POP-00009', { Status: 'Traded' }),                       // not Active
  drawRow('POP-00010', { MigrationDestination: 'Reno', MigratedCycle: 100, ReturnedCycle: '' }), // away
  drawRow('POP-00011', { MigrationDestination: 'Reno', MigratedCycle: 100, ReturnedCycle: 103 }), // back — eligible
  drawRow('POP-00012', { Neighborhood: '' })                         // no hood
];
function seq(vals) { var i = 0; return function () { var v = vals[i % vals.length]; i++; return v; }; }

const drawCtx = {
  ledger: { headers: drawHeaders, rows: drawRows.map(function (r) { return r.slice(); }), dirty: false },
  ss: { getSheetByName: function (n) { return n === 'Undocked_Draw' ? sheet([E.UNDOCKED_DRAW_HEADERS.slice()]) : null; } },
  rng: seq([0.11, 0.5, 0.25, 0.9, 0.1, 0.3, 0.7]),
  summary: {}
};
const dr = E.undockedDrawCast_(drawCtx, 105);
const drawAppends = (drawCtx._appends || []).filter(function (a) { return a.tab === 'Undocked_Draw'; });
check('draw appends 6 rows', dr.drawn === 6 && drawAppends.length === 6);
check('draw rows are 10 wide, target 106, draw 105', drawAppends.every(function (a) { return a.row.length === 10 && a.row[0] === 106 && a.row[1] === 105; }));
check('draw slots cast-1..3 then alt-1..3', drawAppends.map(function (a) { return a.row[3]; }).join(',') === 'cast-1,cast-2,cast-3,alt-1,alt-2,alt-3');
check('draw cast on S (3)', drawCtx.summary.undockedNextCast.length === 3 && drawCtx.summary.undockedNextCast[0].targetCycle === 106);
const drawnIds = drawAppends.map(function (a) { return a.row[4]; });
check('draw excludes minor/traded/away/no-hood', ['POP-00008', 'POP-00009', 'POP-00010', 'POP-00012'].every(function (x) { return drawnIds.indexOf(x) < 0; }));
check('draw no duplicate', new Set(drawnIds).size === 6);
check('draw name from First Last', /^F\d\d L$/.test(drawAppends[0].row[5]));
check('draw carries role + employer', drawAppends[0].row[8] === 'Clerk' && drawAppends[0].row[9] === 'BIZ-00018');

const drawCtx2 = {
  ledger: drawCtx.ledger, rng: seq([0.11, 0.5, 0.25, 0.9, 0.1, 0.3, 0.7]), summary: {},
  ss: { getSheetByName: function (n) { return n === 'Undocked_Draw' ? sheet([E.UNDOCKED_DRAW_HEADERS.slice()]) : null; } }
};
E.undockedDrawCast_(drawCtx2, 105);
check('draw deterministic on same rng', drawCtx2._appends.map(function (a) { return a.row[4]; }).join() === drawnIds.join());

const existingVals = [E.UNDOCKED_DRAW_HEADERS.slice(),
  [106, 105, '0.1', 'cast-1', 'POP-00099', 'Ex One', 1980, 'Temescal', 'Clerk', ''],
  [106, 105, '0.1', 'cast-2', 'POP-00098', 'Ex Two', 1981, 'Temescal', 'Clerk', ''],
  [106, 105, '0.1', 'cast-3', 'POP-00097', 'Ex Three', 1982, 'Temescal', 'Clerk', ''],
  [106, 105, '0.1', 'alt-1', 'POP-00096', 'Ex Alt', 1983, 'Temescal', 'Clerk', ''],
  [105, 104, '0.2', 'cast-1', 'POP-00050', 'Old One', 1980, 'Temescal', 'Clerk', '']];
const drawCtx3 = { ledger: drawCtx.ledger, rng: seq([0.5]), summary: {},
  ss: { getSheetByName: function (n) { return n === 'Undocked_Draw' ? sheet(existingVals) : null; } } };
const dr3 = E.undockedDrawCast_(drawCtx3, 105);
check('re-run reads, never redraws', dr3.drawn === 0 && dr3.existing === 4 && !(drawCtx3._appends || []).length);
check('re-run cast off the tab (3, not the old cycle)', drawCtx3.summary.undockedNextCast.map(function (c) { return c.popId; }).join() === 'POP-00099,POP-00098,POP-00097');

const drawCtx4 = { ledger: drawCtx.ledger, rng: seq([0.5]), summary: {}, ss: { getSheetByName: function () { return null; } } };
const dr4 = E.undockedDrawCast_(drawCtx4, 105);
check('missing tab = no draw, empty cast', dr4.missingTab === true && drawCtx4.summary.undockedNextCast.length === 0);

// placement keys to the pilot for the cycle
const placeHeaders = slHeaders;
const placeCtx = {
  ledger: { headers: placeHeaders, rows: [slRow.slice()], dirty: false },
  ss: { getSheetByName: function (name) {
    if (name === 'Casino_Ledger') return sheet([headers, rowFrom({ WagerId: 'HOUSE', Status: 'house', HouseFloatAfter: 250000 })]);
    return null;
  } },
  // p-roll (place), pickShow roll, stake roll(s), seed, epPick, kindRoll(<0.55 → credits_sign), side
  rng: seq([0.0, 0.1, 0.5, 0.5, 0.5, 0.0, 0.1, 0.1, 0.1, 0.1]),
  summary: { undockedFeedEntries: [], undockedPilots: {}, sportsFeedEntries: [],
    undockedNextCast: [{ popId: 'POP-00099', name: 'Ex One', slot: 'cast-1', targetCycle: 106 }] }
};
const placed = E.processCasinoLedger_(placeCtx, 105);
const slip = (placeCtx._appends || []).filter(function (a) { return a.tab === 'Casino_Ledger'; }).map(function (a) { return a.row; })
  .filter(function (r) { return r[0] !== 'HOUSE'; })[0];
check('show slip placed against the cast', placed.placed === 1 && !!slip);
check('show slip keyed c106:<POPID>', !!slip && slip[headers.indexOf('MarketFamily')] === 'undocked' && slip[headers.indexOf('EventId')] === 'c106:POP-00099');

const noCastCtx = { ledger: placeCtx.ledger, ss: placeCtx.ss, rng: seq([0.0, 0.1, 0.5, 0.5, 0.5, 0.0, 0.1]),
  summary: { undockedFeedEntries: [], undockedPilots: {}, sportsFeedEntries: [], undockedNextCast: [] } };
E.processCasinoLedger_(noCastCtx, 105);
const noCastSlips = (noCastCtx._appends || []).filter(function (a) { return a.tab === 'Casino_Ledger' && a.row[0] !== 'HOUSE'; });
check('no cast → no show slip (sports only)', noCastSlips.every(function (a) { return a.row[headers.indexOf('MarketFamily')] === 'sports'; }));

// resolve: aggregate the pilot's aired rows for the cycle
const pilotFeed = [
  { popId: 'POP-00099', episodeId: 'e1', creditsDelta: 30, mishapCount: 0 },
  { popId: 'POP-00099', episodeId: 'e2', creditsDelta: -50, mishapCount: 2 },
  { popId: 'POP-00098', episodeId: 'e3', creditsDelta: 900, mishapCount: 0 }
];
function ures(mkt, ev, side, cycle, feed) {
  return E.casinoResolve_({ status: 'open', marketFamily: 'undocked', marketId: mkt, eventId: ev, side: side }, { undocked: feed || pilotFeed }, cycle).status;
}
check('credits_sign sums the pilot (30-50<0): pos loses', ures('credits_sign', 'c106:POP-00099', 'pos', 106) === E.CASINO_ST.LOSS);
check('credits_sign neg wins on the same sum', ures('credits_sign', 'c106:POP-00099', 'neg', 106) === E.CASINO_ST.WIN);
check('mishap any>0: yes wins', ures('mishap', 'c106:POP-00099', 'yes', 106) === E.CASINO_ST.WIN);
check('mishap none: no wins', ures('mishap', 'c106:POP-00098', 'no', 106) === E.CASINO_ST.WIN);
check('before the cycle: carry', ures('credits_sign', 'c106:POP-00099', 'pos', 105) === 'carry');
check('after the cycle: void', ures('credits_sign', 'c106:POP-00099', 'pos', 107) === E.CASINO_ST.VOID_GATE);
check('pilot never flew: void', ures('credits_sign', 'c106:POP-00001', 'pos', 106) === E.CASINO_ST.VOID_GATE);
check('all credits windowed (null): void', ures('credits_sign', 'c106:POP-00099', 'pos', 106,
  [{ popId: 'POP-00099', episodeId: 'e1', creditsDelta: null, mishapCount: 1 }]) === E.CASINO_ST.VOID_GATE);
check('night_winner past its cycle: void', ures('night_winner', 'night-106', 'POP-00098', 107) === E.CASINO_ST.VOID_GATE);
check('night_winner on its cycle resolves', ures('night_winner', 'night-106', 'POP-00098', 106) === E.CASINO_ST.WIN);

if (failed) { console.error(failed + ' failed'); process.exit(1); }
console.log('casinoLedgerEngine: ok');
