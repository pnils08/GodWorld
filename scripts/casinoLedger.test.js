'use strict';

const C = require('./casinoLedger');

let failed = 0;
function check(name, cond, detail) {
  if (cond) console.log('  ok  ' + name);
  else { failed++; console.error('  FAIL ' + name + (detail ? ': ' + detail : '')); }
}

function rngSeq(vals) {
  var i = 0;
  return function () { return vals[Math.min(i++, vals.length - 1)]; };
}

const PILOT = 'POP-TEST-PILOT';
const BETTOR = 'POP-TEST-1';
const BETTOR2 = 'POP-TEST-2';

check('house biz is BIZ-00100', C.HOUSE_BIZ === 'BIZ-00100');
check('debt is a level cap 6', C.DEBT_MAX === 6);
check('wagerId is stable', C.wagerId(105, BETTOR, 'credits_sign', 'ep-1') === C.wagerId(105, BETTOR, 'credits_sign', 'ep-1'));
check('wagerId changes with event', C.wagerId(105, BETTOR, 'credits_sign', 'ep-1') !== C.wagerId(105, BETTOR, 'credits_sign', 'ep-2'));

check('adult active with income is eligible', C.isEligible({
  status: 'Active', age: 29, income: 52000, netWorth: 8000, employerBizId: 'BIZ-00018',
}, 'undocked', { isPilot: false }));
check('minor rejected', !C.isEligible({
  status: 'Active', age: 16, income: 52000, netWorth: 8000,
}, 'undocked', {}));
check('BIZ-00100 rejected', !C.isEligible({
  status: 'Active', age: 29, income: 200000, netWorth: 50000, employerBizId: 'BIZ-00100',
}, 'sports', {}));
check('pilot rejected on show market', !C.isEligible({
  status: 'Active', age: 34, income: 52000, netWorth: 8000, employerBizId: 'BIZ-00016',
}, 'undocked', { isPilot: true }));
check('pilot accepted on sports', C.isEligible({
  status: 'Active', age: 34, income: 52000, netWorth: 8000, employerBizId: 'BIZ-00016',
}, 'sports', { isPilot: true }));
check('deceased rejected', !C.isEligible({
  status: 'deceased', age: 40, income: 52000, netWorth: 8000,
}, 'sports', {}));

const stakeMid = C.computeStake({ income: 52000, netWorth: 40000, wealthLevel: 5 }, rngSeq([0.5]));
check('stake is a number', typeof stakeMid === 'number' && stakeMid >= C.STAKE_FLOOR);
check('stake respects ceiling', C.computeStake({ income: 1e9, netWorth: 1e9, wealthLevel: 12 }, rngSeq([1])) <= C.STAKE_CEIL);
check('WL<=3 tighter cap can still place', C.computeStake({ income: 52000, netWorth: 80000, wealthLevel: 3 }, rngSeq([1])) <= Math.round((52000 / 52) * 0.10));
check('too-poor returns null', C.computeStake({ income: 100, netWorth: 50, wealthLevel: 0 }, rngSeq([0.5])) === null);

check('credits_sign even juice', C.oddsCreditsSign().pos === C.JUICE && C.oddsCreditsSign().neg === C.JUICE);
check('night_winner field of 3 is worse than even', C.oddsNightWinner(3).win > C.JUICE);
check('sports with no record is juice even', C.oddsSportsMoneyline('').win === C.JUICE);
const heavy = C.oddsSportsMoneyline('126-35');
check('126-35 is a favorite', heavy.win < heavy.loss);
check('126-35 is not 1.01', heavy.win >= C.SPORTS_ODDS_FLOOR || heavy.win >= 1.05);

const undocked = [
  { popId: PILOT, episodeId: 'ep-a', creditsDelta: 42, mishapCount: 0 },
  { popId: BETTOR2, episodeId: 'ep-b', creditsDelta: 42, mishapCount: 2 },
  { popId: 'POP-TEST-3', episodeId: 'ep-c', creditsDelta: null, mishapCount: 1 },
];

const posWin = C.resolveUndocked({ marketId: 'credits_sign', eventId: 'ep-a', side: 'pos' }, undocked);
check('credits_sign pos on +42 is win', posWin.status === C.STATUS.WIN);
const posLoss = C.resolveUndocked({ marketId: 'credits_sign', eventId: 'ep-a', side: 'neg' }, undocked);
check('credits_sign neg on +42 is loss', posLoss.status === C.STATUS.LOSS);
const blankVoid = C.resolveUndocked({ marketId: 'credits_sign', eventId: 'ep-c', side: 'pos' }, undocked);
check('blank CreditsDelta is void-gate not a loss', blankVoid.status === C.STATUS.VOID_GATE);
const missingCarry = C.resolveUndocked({ marketId: 'credits_sign', eventId: 'ep-zzz', side: 'pos' }, undocked);
check('missing episode carries', missingCarry.status === C.STATUS.CARRY);

const mishapNo = C.resolveUndocked({ marketId: 'mishap', eventId: 'ep-a', side: 'no' }, undocked);
check('mishap no on 0 is win', mishapNo.status === C.STATUS.WIN);
const mishapYes = C.resolveUndocked({ marketId: 'mishap', eventId: 'ep-b', side: 'yes' }, undocked);
check('mishap yes on 2 is win', mishapYes.status === C.STATUS.WIN);

const nw = C.nightWinner(undocked);
check('night_winner ties break by POPID', nw && nw.popId === BETTOR2);
const nightHit = C.resolveUndocked({ marketId: 'night_winner', side: BETTOR2 }, undocked);
check('night_winner side hit', nightHit.status === C.STATUS.WIN);
const nightMiss = C.resolveUndocked({ marketId: 'night_winner', side: PILOT }, undocked);
check('night_winner side miss', nightMiss.status === C.STATUS.LOSS);

const sportsWin = [
  { eventType: 'stat-capture', teamsUsed: "A's", streak: 'W4', cycle: 105 },
  { eventType: 'game-result', teamsUsed: "A's", streak: 'W1', cycle: 105 },
  { eventType: 'game-result', teamsUsed: "A's", streak: 'L1', cycle: 105 },
];
const first = C.parseSportsMoneyline(sportsWin, 'as');
check('sports takes first parseable game-result', first.kind === 'settle' && first.franchiseWon === true && /W1/.test(first.eventId));
check('extra game-result is ignored', first.eventId.indexOf('L1') === -1);

const quiet = C.parseSportsMoneyline([{ eventType: 'game-result', teamsUsed: "A's", streak: '', cycle: 105 }], 'as');
check('missing streak carries', quiet.kind === 'carry');
const winSide = C.resolveSports({ marketFamily: 'sports', franchiseId: 'as', side: 'win' }, sportsWin);
check('sports win side on W-streak', winSide.status === C.STATUS.WIN);
const lossSide = C.resolveSports({ marketFamily: 'sports', franchiseId: 'as', side: 'loss' }, sportsWin);
check('sports loss side on W-streak', lossSide.status === C.STATUS.LOSS);

const broke = C.applyCitizenMoney({ netWorth: 50, debtLevel: 2 }, 100, 0, false);
check('loss that zeros NetWorth bumps DebtLevel', broke.netWorth === 0 && broke.debtLevel === 3);
const capped = C.applyCitizenMoney({ netWorth: 0, debtLevel: 6 }, 100, 0, false);
check('debt does not exceed 6', capped.debtLevel === 6);
const won = C.applyCitizenMoney({ netWorth: 1000, debtLevel: 1 }, 40, 73, true);
check('win adds payout not stake', won.netWorth === 1073 && won.debtLevel === 1);

const hhSkip = C.householdSavingsDelta({ weekly: 1000, stake: 40, payout: 73, won: true, householdSavings: 12000 });
check('small win skips household', hhSkip.applied === 0);
const hhHit = C.householdSavingsDelta({ weekly: 50, stake: 80, payout: 0, won: false, householdSavings: 200 });
check('big loss debits HouseholdSavings', hhHit.householdSavings === 120 && hhHit.applied === -80);

const hist = [
  { status: C.STATUS.LOSS, cycleSettled: 103, stake: 40 },
  { status: C.STATUS.LOSS, cycleSettled: 104, stake: 40 },
  { status: C.STATUS.LOSS, cycleSettled: 105, stake: 40 },
];
check('three losses cool for 3 cycles', C.cooldownUntil(hist, 105, 1000) === 108);
check('cooled at 105+1', C.isCooled(hist, 106, 1000) === true);
check('open again at 108', C.isCooled(hist, 108, 1000) === false);

const already = {
  wagerId: 'aaa',
  status: C.STATUS.WIN,
  stake: 40,
  odds: 1.83,
  netWorth: 1000,
  debtLevel: 0,
};
const batch1 = C.settleBatch([
  {
    wagerId: 'b-win', marketFamily: 'undocked', marketId: 'credits_sign', eventId: 'ep-a',
    side: 'pos', stake: 40, odds: 1.83, netWorth: 1000, debtLevel: 0, weekly: 1000, householdSavings: 0,
  },
  {
    wagerId: 'c-loss', marketFamily: 'undocked', marketId: 'credits_sign', eventId: 'ep-a',
    side: 'neg', stake: 40, odds: 1.83, netWorth: 1000, debtLevel: 0, weekly: 1000, householdSavings: 0,
  },
], { undocked: undocked }, C.HOUSE_SEED, 105);
const winRow = batch1.results.find(function (r) { return r.wager.wagerId === 'b-win'; });
const lossRow = batch1.results.find(function (r) { return r.wager.wagerId === 'c-loss'; });
check('batch win pays', winRow && winRow.status === C.STATUS.WIN && winRow.payout === C.payoutFor(40, 1.83));
check('batch loss collects', lossRow && lossRow.status === C.STATUS.LOSS && lossRow.money.netWorth === 960);

const rerun = C.settleBatch([already], { undocked: undocked }, C.HOUSE_SEED, 105);
check('re-run of settled row is a no-op', rerun.results[0].alreadySettled === true && rerun.houseFloat === C.HOUSE_SEED);

const brokeHouse = C.settleBatch([
  {
    wagerId: 'z-huge', marketFamily: 'undocked', marketId: 'credits_sign', eventId: 'ep-a',
    side: 'pos', stake: 2000, odds: 8, netWorth: 50000, debtLevel: 0, weekly: 1000, householdSavings: 0,
  },
], { undocked: undocked }, 100, 105);
check('house exhaustion voids the slip', brokeHouse.results[0].status === C.STATUS.VOID_HOUSE);
check('void-house does not move money', brokeHouse.results[0].money === null);
check('void-house does not print float', brokeHouse.houseFloat === 100);

const aged = C.ageOpenWager({ cyclePlaced: 100 }, 103);
check('unmatched after 3 cycles voids', aged === C.STATUS.VOID_GATE);

if (failed) { console.error(failed + ' failed'); process.exit(1); }
console.log('casinoLedger: ok');
