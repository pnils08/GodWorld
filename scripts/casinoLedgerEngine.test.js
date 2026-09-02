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

if (failed) { console.error(failed + ' failed'); process.exit(1); }
console.log('casinoLedgerEngine: ok');
