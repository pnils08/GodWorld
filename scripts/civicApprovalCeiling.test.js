/**
 * civicApprovalCeiling.test.js — engine.94 Task 5 deterministic unit harness.
 *
 * Proves required World_Config validation, streak/chance math, owned lifecycle,
 * manual-status safety, immediate approval correction, and the election seam.
 * Run: node scripts/civicApprovalCeiling.test.js
 */

const fs = require('fs');
const path = require('path');

const approvalSource = fs.readFileSync(
  path.resolve(__dirname, '../phase05-citizens/updateCivicApprovalRatings.js'), 'utf8'
);
const A = new Function(approvalSource + '\nreturn {' +
  'getApprovalCeilingConfig_: getApprovalCeilingConfig_,' +
  'resolveApprovalCeilingLifecycle_: resolveApprovalCeilingLifecycle_,' +
  'applyApprovalCeilingRisk_: applyApprovalCeilingRisk_,' +
  'updateCivicApprovalRatings_: updateCivicApprovalRatings_' +
  '};')();
const electionSource = fs.readFileSync(
  path.resolve(__dirname, '../phase05-citizens/runCivicElectionsv1.js'), 'utf8'
);

const APPROVED = {
  approvalCeilingThreshold: 80,
  approvalCeilingMinStreakCycles: 3,
  approvalCeilingBaseChance: 0.05,
  approvalCeilingChanceStep: 0.05,
  approvalCeilingMaxChance: 0.30,
  approvalCeilingScandalDurationCycles: 3,
  approvalCeilingApprovalDrop: 12,
  approvalCeilingElectionPenalty: 25
};

let passed = 0;
let failed = 0;
function check(name, condition, detail) {
  if (condition) { passed++; console.log('  ok  ' + name); }
  else { failed++; console.error('  FAIL ' + name + (detail ? ': ' + detail : '')); }
}
function throws(fn, pattern) {
  try { fn(); } catch (error) { return pattern.test(String(error && error.message)); }
  return false;
}
function state(overrides) {
  return Object.assign({
    cycle: 113,
    status: 'active',
    approval: 85,
    highStreak: 0,
    untilCycle: '',
    source: ''
  }, overrides || {});
}

console.log('═══ A. World_Config contract');
{
  const cfg = A.getApprovalCeilingConfig_({ config: { ...APPROVED } });
  check('A1 approved calibration parses exactly', cfg.threshold === 80 && cfg.electionPenalty === 25);
  const missing = { ...APPROVED };
  delete missing.approvalCeilingChanceStep;
  check('A2 missing key fails loud', throws(() => A.getApprovalCeilingConfig_({ config: missing }), /approvalCeilingChanceStep/));
  check('A3 nonnumeric key fails loud', throws(() => A.getApprovalCeilingConfig_({
    config: { ...APPROVED, approvalCeilingBaseChance: 'nope' }
  }), /approvalCeilingBaseChance/));
  check('A4 probability above one fails loud', throws(() => A.getApprovalCeilingConfig_({
    config: { ...APPROVED, approvalCeilingMaxChance: 1.1 }
  }), /approvalCeilingMaxChance/));
  check('A5 streak must be an integer', throws(() => A.getApprovalCeilingConfig_({
    config: { ...APPROVED, approvalCeilingMinStreakCycles: 2.5 }
  }), /approvalCeilingMinStreakCycles/));
  check('A6 base chance cannot exceed cap', throws(() => A.getApprovalCeilingConfig_({
    config: { ...APPROVED, approvalCeilingBaseChance: 0.4 }
  }), /exceeds/));
}

const CFG = A.getApprovalCeilingConfig_({ config: { ...APPROVED } });

console.log('═══ B. Owned scandal lifecycle');
{
  const manual = A.resolveApprovalCeilingLifecycle_({
    status: 'scandal', highStreak: 7, untilCycle: '', source: ''
  }, 113);
  check('B1 manual scandal is never cleared', manual.status === 'scandal' && manual.blocked && manual.source === '');

  const activeOwned = A.resolveApprovalCeilingLifecycle_({
    status: 'scandal', highStreak: 0, untilCycle: 115, source: 'approval-ceiling'
  }, 115);
  check('B2 owned scandal remains active through inclusive end Cycle', activeOwned.status === 'scandal' && activeOwned.blocked);

  const expired = A.resolveApprovalCeilingLifecycle_({
    status: 'scandal', highStreak: 0, untilCycle: 115, source: 'approval-ceiling'
  }, 116);
  check('B3 owned scandal expires after end Cycle', expired.status === 'active' && expired.recovered && expired.untilCycle === '' && expired.source === '');

  const external = A.resolveApprovalCeilingLifecycle_({
    status: 'injured', highStreak: 4, untilCycle: 115, source: 'approval-ceiling'
  }, 113);
  check('B4 external status wins over stale owned state', external.status === 'injured' && external.blocked && external.source === '');

  check('B5 malformed owned expiry fails loud', throws(() => A.resolveApprovalCeilingLifecycle_({
    status: 'scandal', highStreak: 0, untilCycle: 'bad', source: 'approval-ceiling'
  }, 113), /AutoScandalUntilCycle/));
}

console.log('═══ C. Streak and seeded risk');
{
  let draws = 0;
  const low = A.applyApprovalCeilingRisk_(state({ approval: 79, highStreak: 8 }), CFG, () => { draws++; return 0; });
  check('C1 below threshold resets streak without a draw', low.highStreak === 0 && draws === 0);

  const first = A.applyApprovalCeilingRisk_(state({ highStreak: 0 }), CFG, () => { draws++; return 0; });
  const second = A.applyApprovalCeilingRisk_(state({ highStreak: 1 }), CFG, () => { draws++; return 0; });
  check('C2 first two high Cycles accumulate without risk', first.highStreak === 1 && second.highStreak === 2 && draws === 0);

  const baseMiss = A.applyApprovalCeilingRisk_(state({ highStreak: 2 }), CFG, () => 0.05);
  check('C3 minimum streak uses 5% base chance', baseMiss.highStreak === 3 && baseMiss.chance === 0.05 && !baseMiss.triggered);

  const elevatedHit = A.applyApprovalCeilingRisk_(state({ highStreak: 3 }), CFG, () => 0.06);
  check('C4 fourth high Cycle raises chance to 10%', elevatedHit.chance === 0.10 && elevatedHit.triggered);
  check('C5 trigger applies approved correction and owned state',
    elevatedHit.approval === 73 && elevatedHit.status === 'scandal' && elevatedHit.highStreak === 0 &&
      elevatedHit.untilCycle === 115 && elevatedHit.source === 'approval-ceiling');

  const capped = A.applyApprovalCeilingRisk_(state({ highStreak: 20 }), CFG, () => 0.99);
  check('C6 chance is capped at 30%', capped.chance === 0.30 && !capped.triggered);

  const recovering = A.applyApprovalCeilingRisk_(state({ status: 'recovering', highStreak: 7 }), CFG, () => { draws++; return 0; });
  check('C7 recovering officials do not roll', recovering.highStreak === 0 && !recovering.triggered);

  const seededA = A.applyApprovalCeilingRisk_(state({ highStreak: 3 }), CFG, () => 0.04);
  const seededB = A.applyApprovalCeilingRisk_(state({ highStreak: 3 }), CFG, () => 0.04);
  check('C8 identical seeded draw is deterministic', JSON.stringify(seededA) === JSON.stringify(seededB));
}

console.log('═══ D. Election seam and forbidden randomness');
check('D1 election penalty reads approved config', electionSource.includes('approvalCeilingConfig.electionPenalty'));
check('D2 turnover clears all three owned-state fields',
  electionSource.includes("officeRow[iHighApprovalStreak] = 0") &&
  electionSource.includes("officeRow[iAutoScandalUntil] = ''") &&
  electionSource.includes("officeRow[iAutoScandalSource] = ''"));
check('D3 changed engine files contain no Math.random call',
  !/Math\.random\s*\(/.test(approvalSource) && !/Math\.random\s*\(/.test(electionSource));

console.log('═══ E. Every-Cycle writer integration');
{
  const headers = [
    'OfficeId', 'Title', 'District', 'Holder', 'PopId', 'Status', 'Approval', 'Faction',
    'HighApprovalStreak', 'AutoScandalUntilCycle', 'AutoScandalSource'
  ];
  const official = ['MAYOR', 'Mayor', 'CITYWIDE', 'Synthetic Official', 'POP-TEST01',
    'active', 90, 'OPP', 2, '', ''];
  const intents = [];
  const ripples = [];
  global.Logger = { log() {} };
  global.safeRand_ = () => () => 0.01;
  global.queueCellIntent_ = (ctx, sheet, row, col, value, reason) => {
    intents.push({ sheet, row, col, value, reason });
  };
  global.recordHookRipple_ = (ctx, causeType, hook) => {
    ripples.push({ causeType, hook });
    return true;
  };
  const ctx = {
    mode: {},
    config: { ...APPROVED, cycleCount: 113 },
    summary: { cycleId: 113, economicMood: 50 },
    ss: {
      getSheetByName(name) {
        if (name !== 'Civic_Office_Ledger') return null;
        return { getDataRange: () => ({ getValues: () => [headers.slice(), official.slice()] }) };
      }
    }
  };
  A.updateCivicApprovalRatings_(ctx);
  const byColumn = new Map(intents.map(intent => [headers[intent.col - 1], intent.value]));
  check('E1 every-Cycle writer queues approved approval drop', byColumn.get('Approval') === 77, JSON.stringify(intents));
  check('E2 writer queues owned scandal state',
    byColumn.get('Status') === 'scandal' && byColumn.get('HighApprovalStreak') === 0 &&
      byColumn.get('AutoScandalUntilCycle') === 115 && byColumn.get('AutoScandalSource') === 'approval-ceiling');
  check('E3 writer emits one persisted story hook',
    ctx.summary.approvalCeilingEvents.length === 1 && ripples.length === 1 &&
      ripples[0].hook.hookType === 'CIVIC_APPROVAL_SCANDAL');
  check('E4 writer does not mutate Sheet-read row directly',
    official[5] === 'active' && official[6] === 90 && official[8] === 2);

  const missingHeaderCtx = {
    mode: {},
    config: { ...APPROVED, cycleCount: 113 },
    summary: { cycleId: 113 },
    ss: {
      getSheetByName(name) {
        if (name !== 'Civic_Office_Ledger') return null;
        return { getDataRange: () => ({ getValues: () => [headers.slice(0, -1), official.slice(0, -1)] }) };
      }
    }
  };
  check('E5 missing owned-state column fails loud', throws(() =>
    A.updateCivicApprovalRatings_(missingHeaderCtx), /missing AutoScandalSource/));
}

console.log(`\n${passed}/${passed + failed} passed`);
process.exit(failed ? 1 : 0);
