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
  'scoreLedgerCitizenForOffice_: scoreLedgerCitizenForOffice_,' +
  'challengerDialStateJson_: challengerDialStateJson_' +
  '};')();
// G-PF33: the clock-hold seam lives in civicInitiativeEngine_, but what it
// protects is THIS file's silence scoring — the two are one mechanism, so they
// are proven together.
const initiativeSource = fs.readFileSync(
  path.resolve(__dirname, '../phase05-citizens/civicInitiativeEngine.js'), 'utf8'
);
const I = new Function(initiativeSource + '\nreturn {' +
  'engineClockHold_: engineClockHold_,' +
  'ENGINE_CLOCK_GRACE_: ENGINE_CLOCK_GRACE_' +
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
  check('F5 complete and fail classify first',
    A.classifyInitiativeMotion_('complete', 90, 104) === 'complete' &&
    A.classifyInitiativeMotion_('stalled', 90, 104) === 'failed');
  check('F6 only complete (or opposed-fail) can raise',
    A.approvalDeltaForInitiative_('complete', true, false).delta === 3 &&
    A.approvalDeltaForInitiative_('failed', false, true).delta === 1 &&
    A.approvalDeltaForInitiative_('sitting', true, false).delta === -2 &&
    A.approvalDeltaForInitiative_('silence', true, false).delta === -6 &&
    A.approvalDeltaForInitiative_('sitting', false, false).delta < 0 &&
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
  check('F8 C103-style six sitters cannot raise a mayor', c103 === -12, String(c103));

  const silentSunday = [
    { motion: 'silence' }, { motion: 'silence' }, { motion: 'silence' },
    { motion: 'silence' }, { motion: 'silence' }, { motion: 'silence' }
  ].reduce((n, i) => n + A.approvalDeltaForInitiative_(i.motion, true, false).delta, 0);
  check('F9 six silences drop a mayor off the ceiling in one cycle',
    95 + silentSunday + (-1) <= 58, String(95 + silentSunday - 1));
}

console.log('═══ G. v1.4 leave office — unfit node leaves the chair');
{
  check('G1 crossing below 20 unseats',
    A.shouldLeaveOffice_('active', 18, 22, 0) === true);
  check('G2 already low and still silent unseats',
    A.shouldLeaveOffice_('active', 10, 12, 2) === true);
  check('G3 already low but they moved (no silence) stays',
    A.shouldLeaveOffice_('active', 16, 18, 0) === false);
  check('G4 above 20 never unseats',
    A.shouldLeaveOffice_('active', 58, 95, 6) === false);
  check('G5 vacant seat is not unseated twice',
    A.shouldLeaveOffice_('vacant', 10, 10, 6) === false);
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
    { ledger }, 'D3', 'POP-00034', { 'POP-00034': true }
  );
  check('H5 prefers local civic-adjacent over remote higher tier',
    pick && pick.popId === 'POP-00900', JSON.stringify(pick));
  const again = A.pickCampaignChallenger_(
    { ledger }, 'D3', 'POP-00034', { 'POP-00034': true }
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
    A.scoreLedgerCitizenForOffice_(lazy, scoreHeaders, 'D3', 'POP-00034', {}) === null);
  check('H8 high-Drive principled local scores',
    !!(A.scoreLedgerCitizenForOffice_(fit, scoreHeaders, 'D3', 'POP-00034', {})));

  const emptyPool = {
    headers,
    rows: [
      ['POP-00034', 'Avery', 'Santana', 'Avery Santana', 1, 'Downtown', 'y', 'active', 'Mayor']
    ]
  };
  const minted = A.pickCampaignChallenger_(
    { ledger: emptyPool }, 'D3', 'POP-00034', { 'POP-00034': true }, 'COUNCIL-D3', 104
  );
  check('H9 empty qualified pool mints an out-of-town challenger',
    minted && minted.origin === 'out-of-town' && /^POP-/.test(minted.popId), JSON.stringify(minted));
  check('H10 mint is deterministic',
    A.pickCampaignChallenger_(
      { ledger: { headers, rows: [emptyPool.rows[0].slice()] } }, 'D3', 'POP-00034', { 'POP-00034': true }, 'COUNCIL-D3', 104
    ).name === minted.name);
  const defaults = JSON.parse(A.challengerDialStateJson_());
  check('H11 out-of-town defaults pump Drive/Integrity/Composure and dump Family',
    defaults.base.drive >= 70 && defaults.base.integrity >= 60 &&
    defaults.base.composure >= 60 && defaults.base.family < 50);
}

// ── G-PF19 (engine.138, S406): lock the C105 civic-contradiction ruling ──────
// Six live Initiative_Tracker rows, read off the sheet at C105. All six scored
// "sitting" and the Mayor took -13. This block proves that reading is what the
// code MEANS to do, so the contradiction is not re-chased as a defect.
{
  const C105 = [
    { id: 'INIT-001', phase: 'disbursement-active',   next: 105 },
    { id: 'INIT-002', phase: 'implementation-active', next: 105 },
    { id: 'INIT-003', phase: 'visioning',             next: 105 },
    { id: 'INIT-005', phase: 'construction-active',   next: 106 },
    { id: 'INIT-006', phase: 'vote-scheduled',        next: 105 },
    { id: 'INIT-007', phase: 'pilot-active',          next: 106 }
  ];
  C105.forEach(function (row) {
    check('P1 ' + row.id + ' (' + row.phase + ') classifies sitting at C105',
      A.classifyInitiativeMotion_(row.phase, row.next, 105) === 'sitting',
      A.classifyInitiativeMotion_(row.phase, row.next, 105));
  });

  // The ruling itself: phase ADVANCEMENT is invisible to this scorer. An
  // initiative that moved a phase this cycle and one that did not both score
  // "sitting" — only finishing pays. Four of these six were counted as
  // improvements by the engine audit in the same cycle; that is a different
  // question, not a disagreement.
  check('P2 advancement is invisible — advanced and un-advanced score alike',
    A.classifyInitiativeMotion_('implementation-active', 105, 105) ===
    A.classifyInitiativeMotion_('planning', 105, 105));
  check('P3 only a complete phase pays',
    A.isPerforming_('implementation-active') === false &&
    A.isPerforming_('construction-complete') === true);

  // The C105 arithmetic: 6 owned sitting rows = -12 on the Mayor.
  check('P4 sitting scores -2 owned / -1 nearby',
    A.approvalDeltaForInitiative_('sitting', true, false).delta === -2 &&
    A.approvalDeltaForInitiative_('sitting', false, false).delta === -1);
  const mayorC105 = C105.reduce(function (sum, row) {
    return sum + A.approvalDeltaForInitiative_(
      A.classifyInitiativeMotion_(row.phase, row.next, 105), true, false).delta;
  }, 0);
  check('P5 the six C105 rows total -12 for an owning Mayor',
    mayorC105 === -12, String(mayorC105));

  // Cadence dependency: NextActionCycle is written ONLY by the offline civic
  // chain (scripts/applyTrackerUpdates.js). A row stamped 105 that the chain
  // does not re-stamp becomes overdue the next cycle and falls to silence.
  check('P6 an un-restamped NextActionCycle=105 row is silence at C106',
    A.classifyInitiativeMotion_('implementation-active', 105, 106) === 'silence');
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
  const second = I.engineClockHold_(first.notes, 106, 107, false);
  const third  = I.engineClockHold_(second.notes, 107, 108, false);
  check('Q3 grace accrues and the origin cycle is preserved',
    second.grace === 2 && third.grace === 3 && /from=C106/.test(third.notes),
    JSON.stringify([second.grace, third.grace, third.notes]));

  // Budget spent -> released to silence. The drain is delayed, never removed.
  const fourth = I.engineClockHold_(third.notes, 108, 109, false);
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

console.log(`\n${passed}/${passed + failed} passed`);
process.exit(failed ? 1 : 0);
