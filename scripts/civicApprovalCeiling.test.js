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
// civic.18 4d: the district→hood edge now comes from the Phase-1 canon loader,
// so its accessor rides in the same function scope as the approval source.
const loaderSource = fs.readFileSync(
  path.resolve(__dirname, '../phase01-config/canonNeighborhoodLoader.js'), 'utf8'
);
const CANON_HOODS = {
  list: ['Fruitvale', 'San Antonio', 'Downtown'], set: { fruitvale: true, 'san antonio': true, downtown: true }, core: [],
  district: { Fruitvale: 'D3', 'San Antonio': 'D3', Downtown: 'D2' },
  byDistrict: { D3: ['Fruitvale', 'San Antonio'], D2: ['Downtown'] }
};
const calendarSource = fs.readFileSync(path.resolve(__dirname, '../phase01-config/advanceSimulationCalendar.js'), 'utf8'); // engine.164: simYearOf_
const A = new Function(calendarSource + loaderSource + approvalSource + '\nreturn {' +
  'getApprovalCeilingConfig_: getApprovalCeilingConfig_,' +
  'resolveApprovalCeilingLifecycle_: resolveApprovalCeilingLifecycle_,' +
  'applyApprovalCeilingRisk_: applyApprovalCeilingRisk_,' +
  'updateCivicApprovalRatings_: updateCivicApprovalRatings_,' +
  'classifyInitiativeMotion_: classifyInitiativeMotion_,' +
  'approvalDeltaForInitiative_: approvalDeltaForInitiative_,' +
  'isPerforming_: isPerforming_,' +
  'isFailing_: isFailing_,' +
  'shouldLeaveOffice_: shouldLeaveOffice_,' +
  'shouldStartCampaign_: shouldStartCampaign_,' +
  'parseCampaignNote_: parseCampaignNote_,' +
  'stripCampaignNote_: stripCampaignNote_,' +
  'formatCampaignNote_: formatCampaignNote_,' +
  'pickCampaignChallenger_: pickCampaignChallenger_,' +
  'seedOccupiedPopIds_: seedOccupiedPopIds_,' +
  'ledgerRowByPop_: ledgerRowByPop_,' +
  'turnoverLedger_: turnoverLedger_,' +
  'demotionGrudge_: demotionGrudge_,' +
  'CHALLENGER_NAMED_BELOW_: CHALLENGER_NAMED_BELOW_,' +
  'SEAT_LOST_BELOW_: SEAT_LOST_BELOW_,' +
  'scoreLedgerCitizenForOffice_: scoreLedgerCitizenForOffice_,' +
  'challengerDialStateJson_: challengerDialStateJson_,' +
  'MOTION_LADDERS_: MOTION_LADDERS_' +
  '};')();
// G-PF33: the clock-hold seam lives in civicInitiativeEngine_, but what it
// protects is THIS file's silence scoring — the two are one mechanism, so they
// are proven together.
const initiativeSource = fs.readFileSync(
  path.resolve(__dirname, '../phase05-citizens/civicInitiativeEngine.js'), 'utf8'
);
const I = new Function(initiativeSource + '\nreturn {' +
  'engineClockHold_: engineClockHold_,' +
  'applyEngineClockHold_: applyEngineClockHold_,' +
  'ENGINE_CLOCK_GRACE_: ENGINE_CLOCK_GRACE_' +
'};')();

const APPROVED = {
  approvalCeilingThreshold: 80,
  approvalCeilingMinStreakCycles: 3,
  approvalCeilingBaseChance: 0.05,
  approvalCeilingChanceStep: 0.05,
  approvalCeilingMaxChance: 0.30,
  approvalCeilingScandalDurationCycles: 3,
  approvalCeilingApprovalDrop: 12,
  approvalCeilingElectionPenalty: 25,
  // engine.213 (S455): approval reads the city — the six state/press keys
  approvalLevelBase: 50,
  approvalLevelInertia: 0.2,
  approvalStateGainDistrict: 5,
  approvalStateGainCity: 8,
  approvalStateGainPress: 3,
  approvalStateCouncilCityShare: 0.5,
  approvalStateCitySentimentUnit: 0.25, approvalMoodSmoothing: 0.3,
  approvalMediaStep1: 1,
  approvalMediaStep2: 3
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

console.log('═══ D. Forbidden randomness (the calendar election seam is gone — engine.94 B.3 v3, 2026-10-08)');
check('D1 the approval writer contains no Math.random call', !/Math\.random\s*\(/.test(approvalSource));
check('D2 no scheduled election is wired on either schedule',
  !/Phase5-Elections|runCivicElections_/.test(fs.readFileSync(path.resolve(__dirname, '../phase01-config/godWorldEngine2.js'), 'utf8')) &&
  !fs.existsSync(path.resolve(__dirname, '../phase05-citizens/runCivicElectionsv1.js')));

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
  global.nextPopIdLocked_ = require('../utilities/popIdAllocator').nextPopIdLocked_; // engine.90: the real allocator
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
    summary: { cycleId: 113, economicMood: 50, canonHoods: CANON_HOODS },
    ss: {
      getSheetByName(name) {
        if (name !== 'Civic_Office_Ledger') return null;
        return { getDataRange: () => ({ getValues: () => [headers.slice(), official.slice()] }) };
      }
    }
  };
  A.updateCivicApprovalRatings_(ctx);
  const byColumn = new Map(intents.map(intent => [headers[intent.col - 1], intent.value]));
  // engine.213: 'decay toward 50' retired (the level base is the anchor); with no neighborhood state the level term is inert → 90 − 12 scandal drop = 78
  check('E1 every-Cycle writer queues approved approval drop', byColumn.get('Approval') === 78, JSON.stringify(intents));
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
    summary: { cycleId: 113, canonHoods: CANON_HOODS },
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

console.log('═══ F. v1.3 motion physics — nothing free, silence costs most');
{
  check('F1 only complete is performing',
    A.isPerforming_('complete') === true &&
    A.isPerforming_('operational') === false &&
    A.isPerforming_('disbursement-active') === false &&
    A.isPerforming_('construction-active') === false &&
    A.isPerforming_('pilot-active') === false &&
    A.isPerforming_('construction-planning') === false &&
    A.isPerforming_('visioning-complete') === false);
  check('F2 fail phases stay fail',
    A.isFailing_('stalled') && A.isFailing_('blocked') && !A.isFailing_('operational'));
  check('F3 overdue or unscheduled is silence',
    A.classifyInitiativeMotion_('construction-planning', 103, 104) === 'silence' &&
    A.classifyInitiativeMotion_('operational', null, 103) === 'silence');
  check('F4 due-this-cycle live phase is sitting, not a win',
    A.classifyInitiativeMotion_('disbursement-active', 103, 103) === 'sitting' &&
    A.classifyInitiativeMotion_('pilot-active', 104, 103) === 'sitting');
  // engine.139: `complete` split into the EVENT (`completed`) and the STATE
  // (`complete-held`). Both still classify ahead of the clock.
  check('F5 complete and fail classify first',
    A.classifyInitiativeMotion_('complete', 90, 104, 'operational') === 'completed' &&
    A.classifyInitiativeMotion_('complete', 90, 104, 'complete') === 'complete-held' &&
    A.classifyInitiativeMotion_('stalled', 90, 104, null) === 'failed');
  check('F5b civic.38 Task 5 revival guard: stalled → live phase is sitting even on an overdue clock; live → live still advances; blocked → complete is complete-held, not a +3',
    A.classifyInitiativeMotion_('construction-active', 90, 107, 'stalled') === 'sitting' &&
    A.classifyInitiativeMotion_('construction-active', 107, 107, 'construction-planning') === 'advanced' &&
    A.classifyInitiativeMotion_('complete', 107, 107, 'blocked') === 'complete-held');
  check('F6 finishing, advancing, or being right about a failure can raise',
    A.approvalDeltaForInitiative_('completed', true, false).delta === 3 &&
    A.approvalDeltaForInitiative_('complete-held', true, false).delta === 0 &&
    A.approvalDeltaForInitiative_('advanced', true, false).delta === 2 &&
    A.approvalDeltaForInitiative_('failed', false, true).delta === 1 &&
    // engine.213 (S455, Mike-direct): on the clock costs nothing; silence still drains (halved)
    A.approvalDeltaForInitiative_('sitting', true, false).delta === 0 &&
    A.approvalDeltaForInitiative_('silence', true, false).delta === -3 &&
    A.approvalDeltaForInitiative_('sitting', false, false).delta === 0 &&
    A.approvalDeltaForInitiative_('silence', false, false).delta <
      A.approvalDeltaForInitiative_('sitting', true, false).delta);
  check('F7 silence is the biggest owner drain',
    A.approvalDeltaForInitiative_('silence', true, false).delta <
      A.approvalDeltaForInitiative_('failed', true, false).delta &&
    A.approvalDeltaForInitiative_('failed', true, false).delta <
      A.approvalDeltaForInitiative_('sitting', true, false).delta);

  // C103-shaped mayor: 4 live-sounding + 2 planning, all due this cycle → sitting, not +12.
  const c103 = [
    { motion: 'sitting' }, { motion: 'sitting' }, { motion: 'sitting' },
    { motion: 'sitting' }, { motion: 'sitting' }, { motion: 'sitting' }
  ].reduce((n, i) => n + A.approvalDeltaForInitiative_(i.motion, true, false).delta, 0);
  check('F8 C103-style six sitters cannot raise a mayor (engine.213: nor drain one — 0)', c103 === 0, String(c103));

  const silentSunday = [
    { motion: 'silence' }, { motion: 'silence' }, { motion: 'silence' },
    { motion: 'silence' }, { motion: 'silence' }, { motion: 'silence' }
  ].reduce((n, i) => n + A.approvalDeltaForInitiative_(i.motion, true, false).delta, 0);
  check('F9 six silences: per-row rule -3 each (engine.213 halved), the width ladder bounds the engine to -6',
    silentSunday === -18 && A.MOTION_LADDERS_.silence.owned.reduce(function (x, y) { return x + y; }, 0) === -6, String(silentSunday));
}

console.log('═══ G. engine.94 B.3 v3 — the seat is lost under 30 (builder 2026-10-08: "a civic office loses its seat at 30, at 40 the challenger is named")');
{
  check('G1 under 30 loses the seat',
    A.shouldLeaveOffice_('active', 29) === true && A.shouldLeaveOffice_('active', 12) === true);
  check('G2 30 and above keeps it — the v1.4 crossing and silence clauses are retired by the ruling',
    A.shouldLeaveOffice_('active', 30) === false && A.shouldLeaveOffice_('active', 58) === false);
  check('G3 vacant is never unseated',
    A.shouldLeaveOffice_('vacant', 10) === false);
  check('G4 the two lines are 40 (named) and 30 (lost)',
    A.CHALLENGER_NAMED_BELOW_ === 40 && A.SEAT_LOST_BELOW_ === 30);
}

console.log('═══ H. v1.5 demotion campaign — the drop is the vote');
{
  check('H1 campaign starts below 40',
    A.shouldStartCampaign_('active', 39, null) === true &&
    A.shouldStartCampaign_('active', 40, null) === false);
  check('H2 existing campaign is not replaced',
    A.shouldStartCampaign_('active', 22, { pop: 'POP-1', name: 'A', since: 100 }) === false);
  const note = A.formatCampaignNote_({ pop: 'POP-00999', name: 'Test Challenger', since: 104 }, 'old note');
  const parsed = A.parseCampaignNote_(note);
  check('H3 campaign note round-trips',
    parsed && parsed.pop === 'POP-00999' && parsed.name === 'Test Challenger' && parsed.since === 104);
  check('H4 strip leaves the rest',
    A.stripCampaignNote_(note) === 'old note');

  const headers = ['POPID', 'First', 'Last', 'FullName', 'Tier', 'Neighborhood', 'CIV (y/n)', 'Status', 'TierRole'];
  const ledger = {
    headers,
    rows: [
      ['POP-00034', 'Avery', 'Santana', 'Avery Santana', 1, 'Downtown', 'y', 'active', 'Mayor'],
      ['POP-00901', 'Local', 'Organizer', 'Local Organizer', 3, 'Fruitvale', 'n', 'active', 'community organizer'],
      ['POP-00902', 'Far', 'Away', 'Far Away', 2, 'Montclair', 'n', 'active', 'mechanic'],
      ['POP-00900', 'Better', 'Local', 'Better Local', 2, 'Fruitvale', 'n', 'active', 'educator']
    ]
  };
  const pick = A.pickCampaignChallenger_(
    { ledger, summary: { canonHoods: CANON_HOODS } }, 'D3', 'POP-00034', { 'POP-00034': true }
  );
  check('H5 prefers local civic-adjacent over remote higher tier',
    pick && pick.popId === 'POP-00900', JSON.stringify(pick));
  const again = A.pickCampaignChallenger_(
    { ledger, summary: { canonHoods: CANON_HOODS } }, 'D3', 'POP-00034', { 'POP-00034': true }
  );
  check('H6 pick is deterministic', again && again.popId === pick.popId);

  const dialsOk = JSON.stringify({
    base: { drive: 72, integrity: 68, composure: 64, sociability: 50, warmth: 50, openness: 50, family: 50, outabout: 50 },
    streak: {}
  });
  const dialsLowDrive = JSON.stringify({
    base: { drive: 30, integrity: 68, composure: 64, sociability: 50, warmth: 50, openness: 50, family: 50, outabout: 50 },
    streak: {}
  });
  const scoreHeaders = headers.concat(['DialState', 'BirthYear', 'RoleType']);
  const fit = ['POP-00910', 'Fit', 'Local', 'Fit Local', 3, 'Fruitvale', 'n', 'active', '', dialsOk, 1988, 'community organizer'];
  const lazy = ['POP-00911', 'Lazy', 'Local', 'Lazy Local', 3, 'Fruitvale', 'n', 'active', '', dialsLowDrive, 1988, 'community organizer'];
  check('H7 low-Drive citizen is not built to run',
    A.scoreLedgerCitizenForOffice_(lazy, scoreHeaders, 'D3', CANON_HOODS.byDistrict.D3, 'POP-00034', {}, 2042) === null);
  check('H8 high-Drive principled local scores',
    !!(A.scoreLedgerCitizenForOffice_(fit, scoreHeaders, 'D3', CANON_HOODS.byDistrict.D3, 'POP-00034', {}, 2042)));

  // civic.31 (builder 2026-09-04): "the path in is always Generic_Citizens —
  // you emerge from there." An empty qualified pool no longer mints an
  // out-of-town challenger straight onto the ledger. The arrival lands in
  // Generic_Citizens by intent, this Cycle returns nobody, and the GC feeder
  // promotes them next Cycle. An office CAN go a Cycle unopposed.
  const gcHeaders = ['First', 'Last', 'Age', 'BirthYear', 'Neighborhood', 'Occupation',
    'EmergenceCount', 'EmergedCycle', 'EmergenceContext', 'Status', 'Sex', 'EmployerBizId'];
  const gcRows = [gcHeaders.slice()];
  const ssStub = { getSheetByName: n => n === 'Generic_Citizens'
    ? { getDataRange: () => ({ getValues: () => gcRows.map(r => r.slice()) }) } : null };
  const queued = [];
  global.queueAppendIntent_ = (ctx, tab, row) => { queued.push({ tab, row: row.slice() }); };
  const emptyPool = {
    headers,
    rows: [
      ['POP-00034', 'Avery', 'Santana', 'Avery Santana', 1, 'Downtown', 'y', 'active', 'Mayor']
    ]
  };
  const minted = A.pickCampaignChallenger_(
    { ledger: emptyPool, ss: ssStub, summary: { canonHoods: CANON_HOODS } }, 'D3', 'POP-00034', { 'POP-00034': true }, 'COUNCIL-D3', 104
  );
  check('H9 empty qualified pool mints NOBODY onto the ledger this Cycle',
    minted === null && emptyPool.rows.length === 1, JSON.stringify(minted));
  check('H9b the arrival lands in Generic_Citizens by intent, with a job and the office marked',
    queued.length === 1 && queued[0].tab === 'Generic_Citizens' &&
    queued[0].row[gcHeaders.indexOf('Occupation')] === 'Community organizer' &&
    /challenge COUNCIL-D3/.test(queued[0].row[gcHeaders.indexOf('EmergenceContext')]) &&
    queued[0].row[gcHeaders.indexOf('Status')] === 'Active', JSON.stringify(queued));
  const arrivalName = queued[0].row[0] + ' ' + queued[0].row[1];
  const queued2 = [];
  global.queueAppendIntent_ = (ctx, tab, row) => { queued2.push({ tab, row: row.slice() }); };
  A.pickCampaignChallenger_(
    { ledger: { headers, rows: [emptyPool.rows[0].slice()] }, ss: ssStub, summary: { canonHoods: CANON_HOODS } }, 'D3', 'POP-00034', { 'POP-00034': true }, 'COUNCIL-D3', 104
  );
  check('H10 the arrival is deterministic for the same office and Cycle',
    queued2.length === 1 && (queued2[0].row[0] + ' ' + queued2[0].row[1]) === arrivalName);
  // Phase 10 ran: the arrival is in the pool. Next under-40 Cycle, tier 2 finds
  // them and promotes them through the same GC feeder every citizen uses.
  gcRows.push(queued[0].row.slice());
  const queued3 = [];
  global.queueAppendIntent_ = (ctx, tab) => { queued3.push(tab); };
  const nextPool = { headers, rows: [emptyPool.rows[0].slice()] };
  const promoted = A.pickCampaignChallenger_(
    { ledger: nextPool, ss: ssStub, summary: { canonHoods: CANON_HOODS } }, 'D3', 'POP-00034', { 'POP-00034': true }, 'COUNCIL-D3', 105
  );
  check('H10b next Cycle the GC feeder promotes the arrival — origin generic, on the ledger, nobody new queued',
    !!promoted && promoted.origin === 'generic' && promoted.name === arrivalName &&
    /^POP-/.test(promoted.popId) && nextPool.rows.length === 2 && queued3.length === 0,
    JSON.stringify({ promoted, queued3 }));
  delete global.queueAppendIntent_;
  const defaults = JSON.parse(A.challengerDialStateJson_());
  check('H11 out-of-town defaults pump Drive/Integrity/Composure and dump Family',
    defaults.base.drive >= 70 && defaults.base.integrity >= 60 &&
    defaults.base.composure >= 60 && defaults.base.family < 50);
  // engine.208: the challenger's DialState is not blank, so the fold never seeds it — it carries dial 9 itself
  check('H11b challenger carries all nine dials (fandom 50, no team: no household at mint)',
    defaults.base.fandom === 50 && defaults.streak.fandom === 0 && !defaults.fan &&
    require('../utilities/citizenMemory.js').DIALS.every(d => defaults.base[d] != null));

  // civic.32 — one citizen, one race. Bench C112 readback: Shai Diaz ran for D3
  // (since 111) and D5 (since 112); Ingrid Bautista seated as Mayor at C112 and
  // was picked as D2's challenger the same pass. The occupied set is seeded from
  // holders AND every campaign note, before the office loop.
  const oH = ['OfficeId', 'PopId', 'Status', 'Notes'];
  const oNote = A.formatCampaignNote_({ pop: 'POP-00900', name: 'Better Local', since: 111 }, '');
  const offices = [
    oH,
    ['MAYOR',      'POP-00034', 'active', oNote],   // Better Local is already running here
    ['COUNCIL-D3', 'POP-00777', 'active', ''],
    ['COUNCIL-D5', '',          'vacant', ''],      // a vacant seat holds nobody
    ['COUNCIL-D7', 'POP-00778', 'active', oNote.replace('POP-00900', 'POP-00901').replace('Better Local', 'Local Organizer')]
  ];
  const seeded = A.seedOccupiedPopIds_(offices, 1, 2, 3);
  check('H12 holders are occupied, a vacant seat is not',
    seeded['POP-00034'] === true && seeded['POP-00777'] === true && seeded['POP-00778'] === true &&
    Object.keys(seeded).length === 5, JSON.stringify(seeded));
  check('H12b every citizen already campaigning in ANY office is occupied',
    seeded['POP-00900'] === true && seeded['POP-00901'] === true, JSON.stringify(seeded));
  const secondRace = A.pickCampaignChallenger_({ ledger, summary: { canonHoods: CANON_HOODS } }, 'D3', 'POP-00777', seeded);
  check('H12c a citizen running one race is not picked for a second — the pool falls to the next name',
    !!secondRace && secondRace.popId === 'POP-00902', JSON.stringify(secondRace));
  const noNotes = A.seedOccupiedPopIds_(offices, 1, 2, -1);
  check('H12d without a Notes column the seed is holders only (old behaviour, no throw)',
    Object.keys(noNotes).length === 3 && !noNotes['POP-00900']);
}

// ── G-PF19 + G-PF34: the civic scoring contract ─────────────────────────────
// G-PF19's RULING stands (three systems, three questions, three correct
// answers). Its DESIGN was superseded the same session by engine.139/G-PF34,
// builder-direct: positives are EVENTS, negatives are CONDITIONS.
{
  const C105 = [
    { id: 'INIT-001', phase: 'disbursement-active',   next: 105 },
    { id: 'INIT-002', phase: 'implementation-active', next: 105 },
    { id: 'INIT-003', phase: 'visioning',             next: 105 },
    { id: 'INIT-005', phase: 'construction-active',   next: 106 },
    { id: 'INIT-006', phase: 'vote-scheduled',        next: 105 },
    { id: 'INIT-007', phase: 'pilot-active',          next: 106 }
  ];
  // With no prior-phase data (no carry-forward), nothing reads as a transition
  // and the classifier degrades to exactly the C105 live behaviour.
  C105.forEach(function (row) {
    check('P1 ' + row.id + ' (' + row.phase + ') is sitting with no prior data',
      A.classifyInitiativeMotion_(row.phase, row.next, 105, null) === 'sitting',
      A.classifyInitiativeMotion_(row.phase, row.next, 105, null));
  });

  // P2 INVERTED by G-PF34. Advancement used to be invisible; it is now the
  // whole point. A row that moved scores `advanced`, one that did not scores
  // `sitting` — on identical clocks.
  check('P2 a phase transition is now visible and outranks sitting',
    A.classifyInitiativeMotion_('implementation-active', 105, 105, 'planning') === 'advanced' &&
    A.classifyInitiativeMotion_('implementation-active', 105, 105, 'implementation-active') === 'sitting');
  check('P2b advancement outranks an expired clock — somebody acted',
    A.classifyInitiativeMotion_('implementation-active', 99, 105, 'planning') === 'advanced' &&
    A.classifyInitiativeMotion_('implementation-active', 99, 105, null) === 'silence');

  check('P3 only a complete phase can finish',
    A.isPerforming_('implementation-active') === false &&
    A.isPerforming_('construction-complete') === true);

  // THE DEFUSED PIN: `complete` paid +3 to its owner every cycle, forever.
  check('P4 finishing pays once, then the terminal state pays nothing',
    A.classifyInitiativeMotion_('complete', 105, 105, 'operational') === 'completed' &&
    A.classifyInitiativeMotion_('complete', 105, 105, 'complete') === 'complete-held' &&
    A.approvalDeltaForInitiative_('completed', true, false).delta === 3 &&
    A.approvalDeltaForInitiative_('complete-held', true, false).delta === 0);
  check('P4b a parked complete row cannot pay even without prior data',
    A.classifyInitiativeMotion_('complete', 105, 105, null) === 'complete-held');

  check('P5 sitting scores 0 owned / 0 nearby (engine.213: the seat is graded on the district, not the clock)',
    A.approvalDeltaForInitiative_('sitting', true, false).delta === 0 &&
    A.approvalDeltaForInitiative_('sitting', false, false).delta === 0);
  check('P6 an un-restamped NextActionCycle=105 row is silence at C106',
    A.classifyInitiativeMotion_('implementation-active', 105, 106, null) === 'silence');

  // Advancement pays owner AND district (builder named districts explicitly).
  check('P7 advancement pays the owner +2 and a nearby district seat +1',
    A.approvalDeltaForInitiative_('advanced', true, false).delta === 2 &&
    A.approvalDeltaForInitiative_('advanced', false, false).delta === 1);
  check('P8 an opponent of an advancing initiative gains nothing, loses nothing',
    A.approvalDeltaForInitiative_('advanced', false, true).delta === 0);

  // Portfolio-width ladders — the pile-on that took Santana 82→69.
  const L = A.MOTION_LADDERS_;
  const sum = function (a) { return a.reduce(function (x, y) { return x + y; }, 0); };
  check('P9 sitting ladder is empty — a scheduled row costs nothing (engine.213)',
    sum(L.sitting.owned) === 0 && sum(L.sitting.nearby) === 0, JSON.stringify(L.sitting));
  check('P10 advanced mirrors it at +4 owned / +2 nearby',
    sum(L.advanced.owned) === 4 && sum(L.advanced.nearby) === 2, JSON.stringify(L.advanced));
  check('P11 silence keeps a heavier curve than advancement pays (-6 owned / -3 nearby, engine.213 halved v1.7)',
    sum(L.silence.owned) === -6 && sum(L.silence.nearby) === -3, JSON.stringify(L.silence));
  check('P12 no ladder can be farmed past its rungs',
    L.silence.owned.length === 3 && L.advanced.owned.length === 3);

  // The C105 counterfactual: six rows, none moving, under the new ladder.
  const mayorFlat = C105.reduce(function (acc, row) {
    const m = A.classifyInitiativeMotion_(row.phase, row.next, 105, null);
    const rung = L[m] ? L[m].owned : null;
    return { n: acc.n + 1, total: acc.total + (rung ? (acc.n < rung.length ? rung[acc.n] : 0) : 0) };
  }, { n: 0, total: 0 });
  check('P13 a fully-scheduled C105 costs 0 (engine.213), not -12 or -4',
    mayorFlat.total === 0, String(mayorFlat.total));
}

// ── G-PF34: civic media is symmetric and inside the live range ───────────────
// 15 cycles of live CIVIC ratings: 1,0,2,1,0,2,3,-2,-2,-1,2,1,2,-2,-2 (-2..+3).
// The old `<= -3` threshold never fired once in that record.
{
  const grade = function (r) {
    if (r >= 4) return 2;
    if (r >= 2) return 1;
    if (r <= -4) return -2;
    if (r <= -2) return -1;
    return 0;
  };
  check('R1 the old -3 threshold never fired on the live record',
    [1,0,2,1,0,2,3,-2,-2,-1,2,1,2,-2,-2].filter(function (r) { return r <= -3; }).length === 0);
  check('R2 positive coverage now pays', grade(2) === 1 && grade(3) === 1 && grade(4) === 2);
  check('R3 negative coverage still costs', grade(-2) === -1 && grade(-4) === -2);
  check('R4 the grading is symmetric about zero',
    grade(2) === -grade(-2) && grade(4) === -grade(-4));
  check('R5 the dead band is only -1..+1', grade(1) === 0 && grade(0) === 0 && grade(-1) === 0);
  const live = [1,0,2,1,0,2,3,-2,-2,-1,2,1,2,-2,-2].map(grade);
  check('R6 on the live record the channel is near-neutral, not an inflator',
    live.reduce(function (a, b) { return a + b; }, 0) === 1, JSON.stringify(live));
}

// ── G-PF33 (engine.138, S406): the engine clock hold ────────────────────────
// NextActionCycle is chain-written and engine-judged. These prove the engine
// covers the cadence gap it cannot close, WITHOUT erasing the silence signal
// for a row that is genuinely stalled.
{
  check('Q0 grace budget is 3', I.ENGINE_CLOCK_GRACE_ === 3, String(I.ENGINE_CLOCK_GRACE_));

  // The C105 board at C106: four rows stamped 105, no chain apply behind them.
  const first = I.engineClockHold_('', 105, 106, false);
  check('Q1 an expired clock the engine cannot move is held forward',
    first.action === 'hold' && first.nextActionCycle === 107 && first.grace === 1,
    JSON.stringify(first));
  check('Q2 the hold is recorded in Notes with its origin cycle',
    /\[ENGINE-CLOCK n=1 from=C106\]/.test(first.notes), first.notes);

  // Grace accrues across consecutive uncovered cycles, keeping the ORIGIN.
  // S409: chained through the hold's OWN outputs — the clock it wrote (cycle+1)
  // is what the next cycle reads. The old case fed an already-expired clock the
  // loop can never produce, which is how the clear-branch bug hid (bench C107:
  // "re-armed by the chain — grace cleared" with no chain run).
  const second = I.engineClockHold_(first.notes, first.nextActionCycle, 107, false);
  const third  = I.engineClockHold_(second.notes, second.nextActionCycle, 108, false);
  check('Q3 grace accrues and the origin cycle is preserved',
    second.action === 'hold' && second.grace === 2 && second.nextActionCycle === 108 &&
    third.action === 'hold' && third.grace === 3 && third.nextActionCycle === 109 && /from=C106/.test(third.notes),
    JSON.stringify([second, third]));
  check('Q3b the hold\'s own stamp arriving (clock === cycle, marker present) is NOT read as a chain re-arm',
    I.engineClockHold_(first.notes, 107, 107, false).action === 'hold');

  // S410 (builder call): a passed+signed row is skipped by the initiative loop
  // but still scored by the approval engine. The hold must land on it BEFORE the
  // skip — the live C105 board had INIT-002/INIT-006 at 105, un-held, −9/cycle.
  {
    const iNotes = 0, iNext = 1, iLU = 2;
    const row = ['Cycle 82: Passed 5-4.', 105, ''];
    const changed = I.applyEngineClockHold_({ now: 'T' }, row, 106, false, 'INIT-002', iNext, iNotes, iLU);
    check('Q3c applyEngineClockHold_ holds a signed row in place (clock 105 → 107, marker, LastUpdated)',
      changed === true && row[iNext] === 107 && /\[ENGINE-CLOCK n=1 from=C106\] Cycle 82/.test(row[iNotes]) && row[iLU] === 'T',
      JSON.stringify(row));
    const untouched = ['', 110, ''];
    check('Q3d a row the chain re-armed beyond the cycle is left alone (no marker, no change)',
      I.applyEngineClockHold_({ now: 'T' }, untouched, 106, false, 'X', iNext, iNotes, iLU) === false && untouched[iNext] === 110);
    check('Q3e missing Notes column → no hold (unbounded grace would erase the silence signal)',
      I.applyEngineClockHold_({ now: 'T' }, ['', 105, ''], 106, false, 'X', iNext, -1, iLU) === false);
  }

  // Budget spent -> released to silence. The drain is delayed, never removed.
  const fourth = I.engineClockHold_(third.notes, third.nextActionCycle, 109, false);
  check('Q4 grace exhausts and the row is released to silence',
    fourth.action === 'expire' && fourth.grace === 3, JSON.stringify(fourth));
  check('Q5 an expired row still classifies silence downstream',
    A.classifyInitiativeMotion_('implementation-active', 108, 109) === 'silence');

  // A chain apply re-arms the clock, which retires the marker and the budget.
  const rearmed = I.engineClockHold_(third.notes, 112, 109, false);
  check('Q6 a chain re-arm clears the marker and resets the budget',
    rearmed.action === 'clear' && !/ENGINE-CLOCK/.test(rearmed.notes) && rearmed.grace === 0,
    JSON.stringify(rearmed));
  const afterRearm = I.engineClockHold_(rearmed.notes, 112, 113, false);
  check('Q7 the budget is spent from zero again after a re-arm',
    afterRearm.action === 'hold' && afterRearm.grace === 1 && /from=C113/.test(afterRearm.notes),
    JSON.stringify(afterRearm));

  // Never mask a row the engine IS acting on, and never touch a live clock.
  check('Q8 a row the engine will resolve this cycle is left alone',
    I.engineClockHold_('', 105, 106, true).action === 'none');
  check('Q9 an unexpired clock with no marker is untouched',
    I.engineClockHold_('', 106, 106, false).action === 'none');
  check('Q10 a blank/absent NextActionCycle is not treated as expired',
    I.engineClockHold_('', '', 106, false).action === 'none');

  // Operator notes on the row must survive the marker round-trip.
  const withNotes = I.engineClockHold_('Cycle 104: Vote scheduled C105.', 105, 106, false);
  check('Q11 existing Notes survive the hold',
    /Cycle 104: Vote scheduled C105\./.test(withNotes.notes), withNotes.notes);
  const cleared = I.engineClockHold_(withNotes.notes, 120, 106, false);
  check('Q12 existing Notes survive the clear',
    cleared.action === 'clear' && cleared.notes === 'Cycle 104: Vote scheduled C105.',
    JSON.stringify(cleared.notes));
}

console.log('═══ B3v3. engine.94 B.3 v3 — the seat turns over on the real writer (demotion + grudge, fill, ledger turnover, pool consumed)');
{
  const G = global;
  const bondSource = fs.readFileSync(path.resolve(__dirname, '../phase05-citizens/bondEngine.js'), 'utf8');
  const B = new Function(bondSource + '\nreturn { createBond_: createBond_, BOND_TYPES: BOND_TYPES };')();
  G.createBond_ = B.createBond_; G.BOND_TYPES = B.BOND_TYPES;
  const SR = new Function(fs.readFileSync(path.resolve(__dirname, '../utilities/safeRand.js'), 'utf8') + '\nreturn { seedGeneratedIds_: seedGeneratedIds_, uniqueGeneratedId_: uniqueGeneratedId_ };')();
  G.seedGeneratedIds_ = SR.seedGeneratedIds_; G.uniqueGeneratedId_ = SR.uniqueGeneratedId_;
  const BP = new Function(fs.readFileSync(path.resolve(__dirname, '../phase05-citizens/bondPersistence.js'), 'utf8') + '\nreturn { normalizeBondCitizenId_: normalizeBondCitizenId_ };')();
  G.normalizeBondCitizenId_ = BP.normalizeBondCitizenId_;
  G.nextPopIdLocked_ = require('../utilities/popIdAllocator').nextPopIdLocked_;
  G.safeRand_ = () => () => 0.5;
  G.Logger = { log() {} };
  const COL_HEAD = ['OfficeId','Title','Type','District','Holder','PopId','TermStart','TermEnd','TermYears','ElectionGroup','Status','LastElection','NextElection','Notes','','VotingPower','Faction','ExecutiveActions','Approval','HighApprovalStreak','AutoScandalUntilCycle','AutoScandalSource'];
  const seat = (o) => [o.officeId || 'COUNCIL-D3', o.title || 'City Council District 3', 'elected', o.district || 'D3',
    o.holder === undefined ? 'Rose Delgado' : o.holder, o.pop === undefined ? 'POP-00503' : o.pop, 1, 209, 4, 'A',
    o.status || 'active', '', '', o.notes || '', '', o.vp || 'yes', 'OPP', '', o.approval == null ? 64 : o.approval, o.hs || 0, '', ''];
  const LH = ['POPID', 'First', 'Last', 'FullName', 'Tier', 'Neighborhood', 'CIV (y/n)', 'Status', 'RoleType', 'BirthYear'];
  const INCUMBENT = ['POP-00503', 'Rose', 'Delgado', 'Rose Delgado', 2, 'Lake Merritt', 'y', 'Active', 'City Council District 3', 1985];
  const CHALLENGER = ['POP-00800', 'Marcus', 'Webb', 'Marcus Webb', 3, 'Fruitvale', 'n', 'Active', 'community organizer', 1988]; // D3-local + civic-adjacent
  const NOTE = A.formatCampaignNote_({ pop: 'POP-00800', name: 'Marcus Webb', since: 110 }, '');
  const GC_HEAD = ['First', 'Last', 'Age', 'BirthYear', 'Neighborhood', 'Occupation', 'EmergenceCount', 'EmergedCycle', 'EmergenceContext', 'Status', 'Sex', 'EmployerBizId'];
  const fire = (o) => {
    const intents = [], ripples = [], gcAppends = [];
    G.queueCellIntent_ = (ctx, sheet, row, col, value, reason) => intents.push({ sheet, row, col, value, reason });
    G.queueAppendIntent_ = (ctx, tab, row) => gcAppends.push({ tab, row: row.slice() });
    G.recordHookRipple_ = (ctx, causeType, hook) => { ripples.push({ causeType, hook }); return true; };
    const offices = [COL_HEAD.slice()].concat((o.seats || [seat(o.seat || {})]).map(r => r.slice()));
    const gcRows = [GC_HEAD.slice()].concat((o.gc || []).map(r => r.slice()));
    const tabs = {
      Civic_Office_Ledger: { getDataRange: () => ({ getValues: () => offices.map(r => r.slice()) }) },
      Generic_Citizens: o.gc ? { getDataRange: () => ({ getValues: () => gcRows.map(r => r.slice()) }) } : null
    };
    const ctx = {
      mode: {}, config: { ...APPROVED, cycleCount: 113 },
      summary: { cycleId: 113, economicMood: 50, canonHoods: CANON_HOODS, relationshipBonds: (o.bonds || []).slice(),
        relationshipBondsLoaded: o.loaded === undefined ? true : o.loaded },
      ss: { getSheetByName: n => tabs[n] || null }
    };
    if (!o.noLedger) ctx.ledger = { headers: LH.slice(), rows: (o.rows || [INCUMBENT, CHALLENGER]).map(r => r.slice()), dirty: false };
    A.updateCivicApprovalRatings_(ctx);
    const cell = (rowNum, col) => {
      const hits = intents.filter(i => i.sheet === 'Civic_Office_Ledger' && i.row === rowNum && i.col === COL_HEAD.indexOf(col) + 1);
      return hits.length ? hits[hits.length - 1].value : undefined;
    };
    const led = (pop) => { const r = (ctx.ledger ? ctx.ledger.rows : []).find(r => r[0] === pop); return r ? { civ: r[6], role: r[8], status: r[7] } : null; };
    return { ctx, intents, ripples, gcAppends, cell, led, bonds: ctx.summary.relationshipBonds, hooks: ctx.summary.storyHooks || [], dep: ctx.summary.officeDepartures };
  };

  const d = fire({ seat: { approval: 25, notes: NOTE, hs: 2 } });
  check('B3v3.1 under 30 with a named challenger: Holder / PopId / Approval 50 / streak cleared by intent (Status and VotingPower already active/yes — unchanged cells queue nothing)',
    d.cell(2, 'Holder') === 'Marcus Webb' && d.cell(2, 'PopId') === 'POP-00800' && d.cell(2, 'VotingPower') === undefined &&
    d.cell(2, 'Approval') === 50 && d.cell(2, 'Status') === undefined && d.cell(2, 'HighApprovalStreak') === 0, JSON.stringify(d.intents));
  check('B3v3.2 the campaign note is cleared by the seating and the record names the drop',
    /C113: Rose Delgado demoted \(approval 25, under 30\)\. Marcus Webb \(POP-00800\) seated, named since C110\./.test(d.cell(2, 'Notes')) && !/\[CAMPAIGN/.test(d.cell(2, 'Notes')), d.cell(2, 'Notes'));
  check('B3v3.3 one TENSION bond challenger ↔ incumbent, origin demotion, domain civic, the incumbent\'s hood, the race in the notes',
    d.bonds.length === 1 && d.bonds[0].bondType === 'tension' && d.bonds[0].origin === 'demotion' && d.bonds[0].domainTag === 'civic' &&
    d.bonds[0].citizenA === 'POP-00800' && d.bonds[0].citizenB === 'POP-00503' && d.bonds[0].neighborhood === 'Lake Merritt' &&
    /^demotion C113 COUNCIL-D3: Marcus Webb took the seat from Rose Delgado$/.test(d.bonds[0].notes), JSON.stringify(d.bonds));
  const demo = d.hooks.find(h => h.hookType === 'CIVIC_DEMOTION');
  check('B3v3.4 the CIVIC_DEMOTION description ends with the bond id (F6: it rides in HookText) and the departure carries it',
    !!demo && demo.description.endsWith('(bond ' + d.bonds[0].bondId + ')') && demo.grudgeBond === d.bonds[0].bondId &&
    d.dep.length === 1 && d.dep[0].type === 'demoted' && d.dep[0].grudgeBond === d.bonds[0].bondId && d.ripples.some(r => r.causeType === 'demotion'), demo && demo.description);
  check('B3v3.5 the ledger turns over (F4): successor CIV y + office Title, displaced CIV n + Former Title, ledger dirty',
    d.led('POP-00800').civ === 'y' && d.led('POP-00800').role === 'City Council District 3' &&
    d.led('POP-00503').civ === 'n' && d.led('POP-00503').role === 'Former City Council District 3' && d.ctx.ledger.dirty === true,
    JSON.stringify([d.led('POP-00800'), d.led('POP-00503')]));

  const k = fire({ seat: { approval: 25 }, rows: [INCUMBENT], gc: [] });
  check('B3v3.6 under 30 with nobody named: the holder keeps the seat — nothing seated, no departure, no bond, approval cell untouched',
    k.cell(2, 'Holder') === undefined && k.cell(2, 'Status') === undefined && k.dep.length === 0 && k.bonds.length === 0 && k.intents.length === 0, JSON.stringify(k.intents));
  check('B3v3.6b … and one out-of-town arrival is queued to Generic_Citizens', k.gcAppends.length === 1 && k.gcAppends[0].tab === 'Generic_Citizens');
  A.updateCivicApprovalRatings_(k.ctx);
  check('B3v3.6c a replayed call before Phase 10 queues no second arrival (in-run set, F2)', k.gcAppends.length === 1, String(k.gcAppends.length));

  const INC5 = ['POP-00504', 'Omar', 'Reyes', 'Omar Reyes', 2, 'Montclair', 'y', 'Active', 'City Council District 5', 1980];
  const GC1 = ['Dina', 'Farrow', 38, 2004, 'Fruitvale', 'Community organizer', 1, 'Cycle 100', '', 'Active', 'F', ''];
  const two = fire({ seats: [seat({ approval: 35 }), seat({ officeId: 'COUNCIL-D5', title: 'City Council District 5', district: 'D5', holder: 'Omar Reyes', pop: 'POP-00504', approval: 35 })],
    rows: [INCUMBENT, INC5], gc: [GC1] });
  const emerged = two.intents.filter(i => i.sheet === 'Generic_Citizens');
  check('B3v3.7 two under-40 seats, one pool candidate (F2): one mint, the pool row consumed once (Emerged by cell intent, row 2), the other seat gets one arrival queued',
    two.ctx.ledger.rows.length === 3 && emerged.length === 1 && emerged[0].row === 2 && emerged[0].col === GC_HEAD.indexOf('Status') + 1 && emerged[0].value === 'Emerged' &&
    two.gcAppends.length === 1, JSON.stringify({ rows: two.ctx.ledger.rows.length, emerged, appends: two.gcAppends.length }));
  check('B3v3.7b the first seat carries the named challenger (note written), the second has nobody yet; neither is seated at 35; the minted row dirties the ledger',
    /\[CAMPAIGN pop=POP-\d{5} name=Dina Farrow since=113\]/.test(two.cell(2, 'Notes')) && two.cell(3, 'Notes') === undefined &&
    two.cell(2, 'Holder') === undefined && two.cell(3, 'Holder') === undefined && two.ctx.ledger.dirty === true, String(two.cell(2, 'Notes')));

  const n = fire({ seat: { approval: 35, notes: NOTE } });
  check('B3v3.8 a named challenger stays named (no stand-down): note kept as is, no new campaign hook, no seating',
    n.cell(2, 'Notes') === undefined && !n.hooks.some(h => h.hookType === 'CIVIC_CHALLENGER_CAMPAIGN') && n.cell(2, 'Holder') === undefined &&
    n.ctx.summary.civicCampaigns.length === 1 && n.ctx.summary.civicCampaigns[0].since === 110, JSON.stringify(n.intents));
  const up = fire({ seat: { approval: 45, notes: NOTE } });
  check('B3v3.8b back over 40 the challenger is still named (ruled 2026-10-08) — nothing clears the note',
    up.cell(2, 'Notes') === undefined && up.ctx.summary.civicCampaigns.length === 1, JSON.stringify(up.intents));

  const nf = fire({ seat: { approval: 25, notes: NOTE }, loaded: false });
  check('B3v3.9 bond load not certified (F5): seated, no bond, the hook carries no bond id',
    nf.cell(2, 'Holder') === 'Marcus Webb' && nf.bonds.length === 0 && !/\(bond/.test(nf.hooks.find(h => h.hookType === 'CIVIC_DEMOTION').description) && nf.dep[0].grudgeBond === null);
  const pb = fire({ seat: { approval: 25, notes: NOTE }, bonds: [{ bondId: 'B-1', citizenA: 'POP-00503', citizenB: 'POP-00800', bondType: 'professional', status: 'active' }] });
  check('B3v3.10 a pair already bonded (either order) gets no second bond', pb.bonds.length === 1 && pb.bonds[0].bondId === 'B-1' && pb.dep[0].grudgeBond === null, JSON.stringify(pb.bonds));
  const bad = fire({ seat: { approval: 25, notes: '[CAMPAIGN pop=POP-800 name=Marcus Webb since=110]' } });
  check('B3v3.11 a malformed challenger id seats by the row, makes no bond, touches no successor ledger row',
    bad.cell(2, 'PopId') === 'POP-800' && bad.bonds.length === 0 && bad.led('POP-00800').civ === 'n' && bad.led('POP-00503').civ === 'n');
  const far = ['POP-00801', 'Nina', 'Park', 'Nina Park', 3, 'Fruitvale', 'n', 'Active', 'community organizer', 1990];
  const miss = fire({ seat: { approval: 25, notes: NOTE }, rows: [INCUMBENT, far] });
  check('B3v3.11b a named challenger with no ledger row seats by the row but makes no bond (both rows required)',
    miss.cell(2, 'Holder') === 'Marcus Webb' && miss.bonds.length === 0, JSON.stringify(miss.bonds));

  const rt = fire({ seat: { status: 'retired' } });
  check('B3v3.12 office row retired (F3): pick-and-seat at 50, no grudge, departed CIV n with RoleType untouched, successor CIV y, CIVIC_SEAT_FILLED',
    rt.cell(2, 'Holder') === 'Marcus Webb' && rt.cell(2, 'Approval') === 50 && rt.cell(2, 'Status') === 'active' && rt.bonds.length === 0 &&
    rt.led('POP-00503').civ === 'n' && rt.led('POP-00503').role === 'City Council District 3' && rt.led('POP-00800').civ === 'y' &&
    rt.hooks.some(h => h.hookType === 'CIVIC_SEAT_FILLED') && rt.dep[0].type === 'retired' && /Rose Delgado retired\. Marcus Webb \(POP-00800\) seated\./.test(rt.cell(2, 'Notes')),
    JSON.stringify([rt.intents, rt.dep]));
  const dead = INCUMBENT.slice(); dead[7] = 'deceased';
  const dc = fire({ rows: [dead, CHALLENGER] });
  check('B3v3.13 the holder\'s ledger row deceased (office row active): the seat is filled, the record says died in office',
    dc.cell(2, 'Holder') === 'Marcus Webb' && /died in office/.test(dc.cell(2, 'Notes')) && dc.dep[0].type === 'deceased' && dc.bonds.length === 0, String(dc.cell(2, 'Notes')));
  const nv = fire({ seat: { status: 'retired' }, rows: [INCUMBENT], gc: [] });
  check('B3v3.14 can\'t serve and nobody qualified: the seat goes vacant (Holder TBD, PopId blank, VotingPower vacant, Status vacant), CIVIC_LEFT_OFFICE, departed CIV n',
    nv.cell(2, 'Holder') === 'TBD' && nv.cell(2, 'PopId') === '' && nv.cell(2, 'VotingPower') === 'vacant' && nv.cell(2, 'Status') === 'vacant' &&
    nv.hooks.some(h => h.hookType === 'CIVIC_LEFT_OFFICE') && nv.led('POP-00503').civ === 'n' && nv.dep[0].successor === null, JSON.stringify(nv.intents));
  const vf = fire({ seat: { holder: 'TBD', pop: '', status: 'vacant', vp: 'vacant', approval: 65 }, rows: [CHALLENGER] });
  check('B3v3.15 a vacant elected seat is filled at approval 50 (Status active, VotingPower yes), departure vacant-filled, no bond',
    vf.cell(2, 'Holder') === 'Marcus Webb' && vf.cell(2, 'PopId') === 'POP-00800' && vf.cell(2, 'Approval') === 50 && vf.cell(2, 'Status') === 'active' &&
    vf.cell(2, 'VotingPower') === 'yes' && vf.dep[0].type === 'vacant-filled' && vf.bonds.length === 0 && vf.led('POP-00800').civ === 'y', JSON.stringify(vf.intents));
  const vw = fire({ seat: { holder: 'TBD', pop: '', status: 'vacant', vp: 'vacant' }, rows: [], gc: [] });
  check('B3v3.16 a vacant seat with nobody qualified waits: nothing written, one arrival queued', vw.intents.length === 0 && vw.gcAppends.length === 1 && vw.dep.length === 0);

  const ok = fire({ seat: { approval: 65 } });
  check('B3v3.17 at 65 nothing moves: no intents, no campaign, no departure, no bond', ok.intents.length === 0 && ok.ctx.summary.civicCampaigns.length === 0 && ok.dep.length === 0 && ok.bonds.length === 0);
  const nm = fire({ seat: { approval: 35 } });
  check('B3v3.18 under 40 names the challenger: note written, CIVIC_CHALLENGER_CAMPAIGN hook, the seat kept',
    /\[CAMPAIGN pop=POP-00800 name=Marcus Webb since=113\]/.test(nm.cell(2, 'Notes')) && nm.hooks.some(h => h.hookType === 'CIVIC_CHALLENGER_CAMPAIGN') &&
    nm.cell(2, 'Holder') === undefined && nm.dep.length === 0, String(nm.cell(2, 'Notes')));
  const nm2 = fire({ seat: { approval: 25, notes: nm.cell(2, 'Notes') } });
  check('B3v3.19 … and under 30 the next Cycle the named challenger takes the seat with the grudge', nm2.cell(2, 'Holder') === 'Marcus Webb' && nm2.bonds.length === 1);
  const nl = fire({ seat: { approval: 25 }, noLedger: true });
  check('B3v3.20 a ctx without a ledger (the E-section shape) runs: under 30 with no pool keeps the holder, no throw',
    nl.cell(2, 'Holder') === undefined && nl.dep.length === 0);
  const nlr = fire({ seat: { status: 'retired' }, noLedger: true });
  check('B3v3.20b … and a retired office row with no ledger goes vacant without a throw', nlr.cell(2, 'Status') === 'vacant' && nlr.cell(2, 'Holder') === 'TBD');

  delete G.queueCellIntent_; delete G.queueAppendIntent_; delete G.recordHookRipple_;
}

console.log('═══ F5. engine.94 B.3 v3 — the bond load certifies; a failed load holds the save');
{
  const G = global;
  const BPsrc = fs.readFileSync(path.resolve(__dirname, '../phase05-citizens/bondPersistence.js'), 'utf8');
  const BPm = new Function(BPsrc + '\nreturn { loadRelationshipBonds_: loadRelationshipBonds_, saveRelationshipBonds_: saveRelationshipBonds_, missingBondHeaders_: missingBondHeaders_, BOND_REQUIRED_HEADERS_: BOND_REQUIRED_HEADERS_ };')();
  const errors = []; G.logEngineError_ = (ctx, phase, e) => errors.push(phase + ': ' + e.message);
  G.requireTab_ = (ss, n) => { const t = ss.getSheetByName(n); if (!t) throw new Error('missing tab ' + n); return t; };
  const replaces = []; G.queueReplaceIntent_ = (ctx, tab, rows) => replaces.push({ tab, rows: rows.length });
  G.initializePersistContext_ = (ctx) => { ctx.persist = {}; };
  G.Logger = { log() {} };
  const mk = (rows) => ({ summary: {}, config: { cycleCount: 113 }, ss: { getSheetByName: n => n === 'Relationship_Bonds' ? {
    getDataRange: () => ({ getValues: () => rows.map(r => r.slice()) }),
    getLastColumn: () => (rows[0] || []).length,
    getRange: (r, c, nr, nc) => ({ getValues: () => [(rows[0] || []).slice(c - 1, c - 1 + nc)] }),
    getLastRow: () => rows.length
  } : null } });
  const FULL = ['BondId', 'CitizenA', 'CitizenB', 'BondType', 'Intensity', 'Status', 'Origin', 'DomainTag', 'Neighborhood', 'CycleCreated', 'LastUpdate', 'Notes', 'Holiday', 'HolidayPriority', 'FirstFriday', 'CreationDay', 'SportsSeason'];
  const c1 = mk([FULL]); BPm.loadRelationshipBonds_(c1);
  check('F5.1 a header-only tab certifies the load (true) with 0 bonds', c1.summary.relationshipBondsLoaded === true && c1.summary.relationshipBonds.length === 0);
  const c2 = mk([FULL, ['B-1', 'POP-00001', 'POP-00002', 'friendship', 5, 'active', 'seed', '', 'Downtown', 100, 100, '', 'none', 'none', false, false, 'off-season']]); BPm.loadRelationshipBonds_(c2);
  check('F5.2 a full load certifies with the rows loaded', c2.summary.relationshipBondsLoaded === true && c2.summary.relationshipBonds.length === 1);
  const c3 = mk([FULL.filter(h => h !== 'Intensity'), ['B-1', 'POP-00001', 'POP-00002', 'friendship', 'active']]); errors.length = 0; BPm.loadRelationshipBonds_(c3);
  check('F5.3 a missing required header: flag stays false, one Engine_Errors row names it, nothing loaded',
    c3.summary.relationshipBondsLoaded === false && errors.length === 1 && /Phase5-LoadBonds: Relationship_Bonds missing header\(s\): Intensity/.test(errors[0]) && c3.summary.relationshipBonds.length === 0, errors.join(';'));
  const c4 = mk([['Timestamp', 'Cycle', 'Action'], ['t', 1, 'x']]); errors.length = 0; BPm.loadRelationshipBonds_(c4);
  check('F5.4 ledger-schema headers: flag false, one Engine_Errors row, nothing loaded', c4.summary.relationshipBondsLoaded === false && errors.length === 1 && c4.summary.relationshipBonds.length === 0);
  const c0 = mk([]); errors.length = 0; BPm.loadRelationshipBonds_(c0);
  check('F5.4b an empty tab (no header row) is a failed load, not a quiet empty state', c0.summary.relationshipBondsLoaded === false && errors.length === 1);
  c3.summary.relationshipBonds = [{ bondId: 'B-9', citizenA: 'POP-00001', citizenB: 'POP-00002', bondType: 'tension' }]; replaces.length = 0; BPm.saveRelationshipBonds_(c3);
  check('F5.5 the saver queues no master replace behind a failed load (every bond write held, not only the grudge)', replaces.length === 0);
  replaces.length = 0; BPm.saveRelationshipBonds_(c2);
  check('F5.6 the saver queues the replace behind a certified load', replaces.length === 1 && replaces[0].tab === 'Relationship_Bonds' && replaces[0].rows === 2, JSON.stringify(replaces));
  const c5 = mk([FULL]); c5.summary.relationshipBonds = [{ bondId: 'x' }]; replaces.length = 0; BPm.saveRelationshipBonds_(c5);
  check('F5.7 a Cycle where the loader never ran saves nothing', replaces.length === 0);
  check('F5.8 one required list, shared with the validator', BPm.BOND_REQUIRED_HEADERS_.join() === 'BondId,CitizenA,CitizenB,BondType,Intensity,Status' &&
    /var requiredHeaders = BOND_REQUIRED_HEADERS_/.test(fs.readFileSync(path.resolve(__dirname, '../utilities/ensureRelationshipBonds.js'), 'utf8')));
  delete G.logEngineError_; delete G.queueReplaceIntent_; delete G.initializePersistContext_;
}

console.log(`\n${passed}/${passed + failed} passed`);
process.exit(failed ? 1 : 0);
