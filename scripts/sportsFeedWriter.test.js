#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  CITIZEN_REQUIRED_HEADERS,
  LIFE_HISTORY_LOG_HEADERS,
  RIPPLE_LEDGER_HEADERS,
  createFileAuditStore,
  createSportsFeedWriter,
  createSportsSourcePreconditions,
  sportsRequestHash,
} = require('./sportsFeedWriter.js');
const {
  FEED_HEADERS,
  projectNewRow,
  validateSportsSubmission,
} = require('./sportsFeedContract.js');

const AS_HEADERS = [
  'POPID', 'First', 'Middle', 'Last', 'Tier', 'Position', 'Team', 'Salary',
  'AB', 'AVG', 'H', 'HR', 'RBI', 'SB', 'SO', 'IP', 'ERA', 'W-L', 'SO', 'BB',
];
const CITIZEN_HEADERS = CITIZEN_REQUIRED_HEADERS.slice();

function draft(overrides = {}) {
  return {
    Cycle: '404',
    SeasonType: 'regular-season',
    EventType: 'game-result',
    TeamsUsed: 'as',
    NamesUsed: 'Synthetic Batter',
    Notes: 'SYNTHETIC NON-CANON write fixture.',
    Stats: 'SYNTHETIC',
    'Team Record': '4-2',
    VideoGameDate: '',
    VideoGame: '',
    StoryAngle: 'Synthetic angle',
    PlayerMood: 'confident',
    EventTrigger: '',
    HomeNeighborhood: 'Downtown',
    Streak: 'W2',
    FanSentiment: 'confident',
    FranchiseStability: 'stable',
    EconomicFootprint: 'steady',
    CommunityInvestment: 'active',
    MediaProfile: '',
    ...overrides,
  };
}

function statSubmission(overrides = {}) {
  const base = {
    draft: draft({
      EventType: 'stat-capture',
      'Team Record': '',
      Streak: '',
      Stats: 'Synthetic reviewed current-season stat line',
    }),
    submissionId: 'synthetic-stat-0001',
    participant: {
      popid: 'POP-90001',
      name: 'Synthetic Batter',
      rosterSource: 'As_Roster',
      sourceRow: 11,
    },
    mutation: {
      kind: 'stat-line',
      action: 'stat-capture',
      changes: [
        { field: 'batting.so', before: '21', after: '22', reviewed: true },
        { field: 'pitching.so', before: '33', after: '34', reviewed: true },
        { field: 'batting.avg', before: '.300', after: '.300', reviewed: false },
      ],
      verification: {
        source: 'screenshot-verified',
        confirmed: true,
      },
    },
  };
  return { ...base, ...overrides };
}

function rosterSubmission(action, changes, overrides = {}) {
  const base = {
    draft: draft({
      EventType: 'roster-move',
      'Team Record': '',
      Streak: '',
      Stats: '',
    }),
    submissionId: `synthetic-${action}-0001`,
    participant: {
      popid: 'POP-90001',
      name: 'Synthetic Batter',
      rosterSource: 'As_Roster',
      sourceRow: 11,
    },
    mutation: {
      kind: 'roster-event',
      action,
      changes: changes.map((change) => ({
        ...change,
        reviewed: true,
      })),
      verification: {
        source: 'manual-verified',
        confirmed: true,
      },
    },
  };
  return { ...base, ...overrides };
}

function memoryAuditStore() {
  const records = [];
  return {
    records,
    async find(key) {
      return [...records].reverse().find((record) => (
        record.idempotencyKey === key
      )) || null;
    },
    async append(record) {
      records.push(record);
    },
  };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function writerHarness(options = {}) {
  const auditStore = memoryAuditStore();
  const feedSnapshot = {
    // engine-sheet S349: opt-in header drift for the item-1 regression below.
    // Default stays the exact contract, so every existing case is unaffected.
    headers: options.feedHeaders ? options.feedHeaders.slice() : FEED_HEADERS.slice(),
    rows: [{
      rowNumber: 2,
      values: FEED_HEADERS.map((header) => ({
        Cycle: '403',
        SeasonType: 'regular-season',
        EventType: 'season-state',
        TeamsUsed: "A's",
      })[header] || ''),
    }],
  };
  const rosterSnapshot = {
    headers: AS_HEADERS.slice(),
    rows: [{
      rowNumber: 11,
      values: [
        'POP-90001', 'Synthetic', '', 'Batter', '1', 'CF', "A's", '$1',
        '100', '.300', '30', '5', '20', '4', '21',
        '12.1', '2.50', '2-1', '33', '7',
      ],
    }],
  };
  const citizenSnapshot = {
    headers: CITIZEN_HEADERS.slice(),
    rows: [{
      rowNumber: 22,
      values: [
        'POP-90001',
        'Synthetic',
        'Batter',
        '1',
        "A's Player",
        'Active',
        'C403 — [Synthetic] Prior non-canon event.',
        'Downtown',
        '',
        '',
      ],
    }],
  };
  const lifeHistoryLogSnapshot = {
    headers: LIFE_HISTORY_LOG_HEADERS.slice(),
    rows: [{
      rowNumber: 2,
      values: [
        'C403',
        'POP-99999',
        'Prior Synthetic',
        'Synthetic',
        'Prior non-canon event.',
        'Downtown',
        '403',
        '',
        '',
      ],
    }],
  };
  const rippleLedgerSnapshot = {
    headers: RIPPLE_LEDGER_HEADERS.slice(),
    rows: [{
      rowNumber: 2,
      values: [
        '403',
        'synthetic',
        'prior-synthetic',
        'Prior non-canon ripple.',
        'synthetic-effect',
        'citizen',
        'POP-99999',
        'Downtown',
        '1',
        '1',
        '',
        'synthetic.test',
        'C403',
      ],
    }],
  };
  let batchCalls = 0;
  let formulaReadCalls = 0;
  const capturedBatches = [];
  let appendedRow = null;

  const writer = createSportsFeedWriter({
    auditStore,
    now: () => new Date('2042-01-01T00:00:00.000Z'),
    getSheetIds: async (sheetNames) => {
      const result = {};
      if (sheetNames.includes('Oakland_Sports_Feed')) result.Oakland_Sports_Feed = 101;
      if (sheetNames.includes('As_Roster')) result.As_Roster = 202;
      if (sheetNames.includes('Simulation_Ledger')) result.Simulation_Ledger = 303;
      if (sheetNames.includes('LifeHistory_Log')) result.LifeHistory_Log = 404;
      if (sheetNames.includes('Ripple_Ledger')) result.Ripple_Ledger = 505;
      return result;
    },
    readSportsSource: async (sheetName) => {
      if (sheetName === 'Oakland_Sports_Feed') return clone(feedSnapshot);
      if (sheetName === 'As_Roster') return clone(rosterSnapshot);
      if (sheetName === 'Simulation_Ledger') return clone(citizenSnapshot);
      if (sheetName === 'LifeHistory_Log') return clone(lifeHistoryLogSnapshot);
      if (sheetName === 'Ripple_Ledger') return clone(rippleLedgerSnapshot);
      throw new Error(`unexpected synthetic sheet: ${sheetName}`);
    },
    batchUpdateSpreadsheet: async (requests) => {
      batchCalls += 1;
      capturedBatches.push(clone(requests));
      if (options.batchError) throw options.batchError;
      if (options.batchThrow) throw new Error('synthetic ambiguous batch failure');

      requests.filter((request) => request.appendCells).forEach((request) => {
        const append = request.appendCells;
        const values = append.rows[0].values.map(
          (cell) => cell.userEnteredValue.stringValue
        );
        if (append.sheetId === 101) {
          appendedRow = values;
          feedSnapshot.rows.push({
            rowNumber: feedSnapshot.rows.length + 2,
            values: FEED_HEADERS.map((_, index) => values[index] || ''),
          });
        } else if (append.sheetId === 404) {
          const storedValues = LIFE_HISTORY_LOG_HEADERS.map(
            (_, index) => values[index] || ''
          );
          if (options.lifeReadBackMismatch) storedValues[4] = 'DIFFERENT';
          lifeHistoryLogSnapshot.rows.push({
            rowNumber: lifeHistoryLogSnapshot.rows.length + 2,
            values: storedValues,
          });
        } else if (append.sheetId === 505) {
          rippleLedgerSnapshot.rows.push({
            rowNumber: rippleLedgerSnapshot.rows.length + 2,
            values: RIPPLE_LEDGER_HEADERS.map((_, index) => values[index] || ''),
          });
        } else {
          throw new Error(`unexpected synthetic append sheet: ${append.sheetId}`);
        }
      });

      requests.filter((request) => request.updateCells).forEach((request) => {
        const update = request.updateCells;
        const snapshot = update.start.sheetId === 202
          ? rosterSnapshot
          : update.start.sheetId === 303
            ? citizenSnapshot
            : null;
        if (!snapshot) {
          throw new Error(`unexpected synthetic update sheet: ${update.start.sheetId}`);
        }
        const row = snapshot.rows.find(
          (candidate) => candidate.rowNumber === update.start.rowIndex + 1
        );
        const entered = update.rows[0].values[0].userEnteredValue;
        const value = Object.prototype.hasOwnProperty.call(entered, 'numberValue')
          ? entered.numberValue
          : entered.stringValue;
        row.values[update.start.columnIndex] = String(value);
      });
      return { replies: requests.map(() => ({})) };
    },
    readRange: async (range) => {
      if (/^Oakland_Sports_Feed!A\d+:T\d+$/.test(range)) {
        const row = options.readBackMismatch
          ? appendedRow.map((value, index) => index === 5 ? 'DIFFERENT' : value)
          : appendedRow;
        return [row];
      }
      if (/^LifeHistory_Log!A\d+:G\d+$/.test(range)) {
        return [lifeHistoryLogSnapshot.rows.at(-1).values.slice(0, 7)];
      }
      if (/^Ripple_Ledger!A\d+:M\d+$/.test(range)) {
        return [rippleLedgerSnapshot.rows.at(-1).values.slice(0, 13)];
      }
      throw new Error(`unexpected synthetic read range: ${range}`);
    },
    readFormulaRanges: async (ranges) => {
      const values = ranges.map((range) => {
        const rosterMatch = range.match(/^As_Roster!([A-Z]+)(\d+):[A-Z]+\d+$/);
        if (rosterMatch) {
          const column = rosterMatch[1].split('').reduce(
            (value, character) => value * 26 + character.charCodeAt(0) - 64,
            0,
          ) - 1;
          return {
            range,
            value: options.formulaRange === range
              ? '=SYNTHETIC_FORMULA()'
              : rosterSnapshot.rows[0].values[column],
          };
        }
        const citizenMatch = range.match(
          /^Simulation_Ledger!([A-Z]+)(\d+):[A-Z]+\d+$/
        );
        if (citizenMatch) {
          const column = citizenMatch[1].split('').reduce(
            (value, character) => value * 26 + character.charCodeAt(0) - 64,
            0,
          ) - 1;
          return {
            range,
            value: options.formulaRange === range
              ? '=SYNTHETIC_FORMULA()'
              : citizenSnapshot.rows[0].values[column],
          };
        }
        return {
          range,
          value: options.formulaRange === range
            ? '=SYNTHETIC_FORMULA()'
            : '',
        };
      });
      formulaReadCalls += 1;
      if (formulaReadCalls <= Number(options.appendTargetShifts || 0)) {
        const shiftedSheets = options.appendTargetShiftSheets ||
          ['LifeHistory_Log', 'Ripple_Ledger'];
        if (shiftedSheets.includes('LifeHistory_Log')) {
          lifeHistoryLogSnapshot.rows.push({
            rowNumber: lifeHistoryLogSnapshot.rows.length + 2,
            values: LIFE_HISTORY_LOG_HEADERS.map((_, index) => (
              index === 3 ? `SYNTHETIC-RACE-${formulaReadCalls}` : ''
            )),
          });
        }
        if (shiftedSheets.includes('Ripple_Ledger')) {
          rippleLedgerSnapshot.rows.push({
            rowNumber: rippleLedgerSnapshot.rows.length + 2,
            values: RIPPLE_LEDGER_HEADERS.map((_, index) => (
              index === 2 ? `synthetic-race-${formulaReadCalls}` : ''
            )),
          });
        }
      }
      return values;
    },
  });

  return {
    writer,
    auditStore,
    feedRows: feedSnapshot,
    feedSnapshot,
    rosterSnapshot,
    citizenSnapshot,
    lifeHistoryLogSnapshot,
    rippleLedgerSnapshot,
    capturedBatches,
    get batchCalls() {
      return batchCalls;
    },
    get formulaReadCalls() {
      return formulaReadCalls;
    },
  };
}

function inputFor(value, key, harness) {
  const validation = validateSportsSubmission(value);
  assert.strictEqual(validation.valid, true, validation.errors.join('; '));
  const canonicalMutation = validation.mutation
    ? {
      submissionId: validation.submissionId,
      participant: validation.participant,
      mutation: validation.mutation,
    }
    : null;
  const row = projectNewRow(value.draft || value);
  const participant = validation.participant;
  const sourcePreconditions = createSportsSourcePreconditions({
    feedRows: harness.feedRows,
    rosterSnapshot: participant ? harness.rosterSnapshot : null,
    citizenSnapshot: participant ? harness.citizenSnapshot : null,
    lifeHistoryLogSnapshot: validation.mutation?.kind === 'roster-event'
      ? harness.lifeHistoryLogSnapshot
      : null,
    rippleLedgerSnapshot: validation.mutation?.kind === 'roster-event'
      ? harness.rippleLedgerSnapshot
      : null,
    participant,
    action: validation.mutation?.action || null,
  });
  return {
    draft: value.draft || value,
    submission: value.draft ? value : null,
    expectedRow: row,
    provenance: null,
    sourcePreconditions,
    requestHash: sportsRequestHash(
      row,
      null,
      canonicalMutation,
      sourcePreconditions,
    ),
    idempotencyKey: key,
    actorHash: 'synthetic-actor-hash',
  };
}

async function expectCode(promise, code) {
  await assert.rejects(promise, (error) => {
    assert.strictEqual(error.code, code);
    return true;
  });
}

(async () => {
  const successHarness = writerHarness();
  const firstInput = inputFor(draft(), 'synthetic-key-0001', successHarness);
  const first = await successHarness.writer(firstInput);
  assert.strictEqual(first.writePerformed, true);
  assert.strictEqual(first.replayed, false);
  assert.strictEqual(first.updatedRange, 'Oakland_Sports_Feed!A3:T3');
  assert.deepStrictEqual(first.updatedRanges, ['Oakland_Sports_Feed!A3:T3']);
  assert.strictEqual(first.rowNumber, 3);
  assert.strictEqual(successHarness.batchCalls, 1);
  assert.strictEqual(successHarness.capturedBatches[0].length, 1);
  assert.strictEqual(
    successHarness.capturedBatches[0][0].appendCells.fields,
    'userEnteredValue',
  );
  assert.strictEqual(
    successHarness.capturedBatches[0][0].appendCells.rows[0].values.length,
    20,
  );
  assert.strictEqual(successHarness.auditStore.records.length, 2);
  assert.strictEqual(successHarness.auditStore.records[0].result, 'pending');
  assert.strictEqual(successHarness.auditStore.records[1].result, 'success');
  assert.strictEqual(successHarness.auditStore.records[1].auditVersion, 3);
  assert.strictEqual(successHarness.auditStore.records[1].cellTransitions.length, 20);
  assert.ok(successHarness.auditStore.records[1].cellTransitions.every(
    (transition) => (
      /^[a-f0-9]{64}$/.test(transition.beforeHash) &&
      /^[a-f0-9]{64}$/.test(transition.afterHash)
    )
  ));
  assert.strictEqual(
    JSON.stringify(successHarness.auditStore.records).includes('SYNTHETIC NON-CANON'),
    false,
    'audit records must not duplicate story or stat prose',
  );

  const replay = await successHarness.writer(firstInput);
  assert.strictEqual(replay.replayed, true);
  assert.strictEqual(replay.updatedRange, 'Oakland_Sports_Feed!A3:T3');
  assert.strictEqual(successHarness.batchCalls, 1);

  const concurrentHarness = writerHarness();
  const concurrentInput = inputFor(
    draft(),
    'synthetic-key-concurrent',
    concurrentHarness,
  );
  const concurrentResults = await Promise.all([
    concurrentHarness.writer(concurrentInput),
    concurrentHarness.writer(concurrentInput),
    concurrentHarness.writer(concurrentInput),
  ]);
  assert.strictEqual(concurrentHarness.batchCalls, 1);
  assert.strictEqual(
    concurrentResults.filter((result) => result.replayed).length,
    2,
    'queued confirmations must replay the one atomic result',
  );

  const crossKeyHarness = writerHarness();
  const crossKeyFirst = inputFor(draft(), 'synthetic-cross-key-01', crossKeyHarness);
  const crossKeySecond = {
    ...crossKeyFirst,
    idempotencyKey: 'synthetic-cross-key-02',
  };
  const crossKeyResults = await Promise.allSettled([
    crossKeyHarness.writer(crossKeyFirst),
    crossKeyHarness.writer(crossKeySecond),
  ]);
  assert.strictEqual(crossKeyResults.filter((result) => result.status === 'fulfilled').length, 1);
  assert.strictEqual(crossKeyResults.filter((result) => result.status === 'rejected').length, 1);
  assert.strictEqual(crossKeyResults.find((result) => result.status === 'rejected').reason.code, 'sports_source_changed');
  assert.strictEqual(crossKeyHarness.batchCalls, 1);

  const changed = draft({ Notes: 'DIFFERENT SYNTHETIC NON-CANON fixture.' });
  const conflictInput = inputFor(changed, 'synthetic-key-0001', successHarness);
  await expectCode(
    successHarness.writer(conflictInput),
    'sports_idempotency_conflict',
  );
  assert.strictEqual(successHarness.batchCalls, 1);

  const feedHeaderHarness = writerHarness();
  const feedHeaderInput = inputFor(
    draft(),
    'synthetic-feed-header-01',
    feedHeaderHarness,
  );
  [feedHeaderHarness.feedSnapshot.headers[0], feedHeaderHarness.feedSnapshot.headers[1]] =
    [feedHeaderHarness.feedSnapshot.headers[1], feedHeaderHarness.feedSnapshot.headers[0]];
  await expectCode(
    feedHeaderHarness.writer(feedHeaderInput),
    'sports_source_changed',
  );
  assert.strictEqual(feedHeaderHarness.batchCalls, 0);

  const statHarness = writerHarness();
  const statInput = inputFor(
    statSubmission(),
    'synthetic-stat-key-01',
    statHarness,
  );
  const statResult = await statHarness.writer(statInput);
  assert.strictEqual(statResult.changedFieldCount, 2);
  assert.deepStrictEqual(statResult.updatedRanges, [
    'Oakland_Sports_Feed!A3:T3',
    'As_Roster!O11:O11',
    'As_Roster!S11:S11',
  ]);
  assert.strictEqual(statHarness.capturedBatches[0].length, 3);
  assert.deepStrictEqual(
    statHarness.capturedBatches[0].slice(1).map((request) => ({
      sheetId: request.updateCells.start.sheetId,
      rowIndex: request.updateCells.start.rowIndex,
      columnIndex: request.updateCells.start.columnIndex,
      value: request.updateCells.rows[0].values[0].userEnteredValue,
      fields: request.updateCells.fields,
    })),
    [
      {
        sheetId: 202,
        rowIndex: 10,
        columnIndex: 14,
        value: { numberValue: 22 },
        fields: 'userEnteredValue',
      },
      {
        sheetId: 202,
        rowIndex: 10,
        columnIndex: 18,
        value: { numberValue: 34 },
        fields: 'userEnteredValue',
      },
    ],
  );
  assert.strictEqual(statHarness.rosterSnapshot.rows[0].values[14], '22');
  assert.strictEqual(statHarness.rosterSnapshot.rows[0].values[18], '34');
  assert.strictEqual(statHarness.rosterSnapshot.rows[0].values[9], '.300');
  assert.strictEqual(statHarness.auditStore.records[1].mutationAction, 'stat-capture');
  assert.strictEqual(statHarness.auditStore.records[1].changedFieldCount, 2);
  assert.strictEqual(statHarness.auditStore.records[1].cellTransitions.length, 22);

  const numericHarness = writerHarness();
  const numericValue = statSubmission();
  numericValue.mutation.changes = [
    { field: 'batting.avg', before: '.300', after: '.301', reviewed: true },
  ];
  await numericHarness.writer(inputFor(
    numericValue,
    'synthetic-numeric-key-01',
    numericHarness,
  ));
  assert.deepStrictEqual(
    numericHarness.capturedBatches[0][1].updateCells
      .rows[0].values[0].userEnteredValue,
    { numberValue: 0.301 },
  );

  const middleNameHarness = writerHarness();
  middleNameHarness.rosterSnapshot.rows[0].values[2] = 'Middle';
  const middleNameValue = statSubmission();
  middleNameValue.draft.NamesUsed = 'Synthetic Middle Batter';
  middleNameValue.participant.name = 'Synthetic Middle Batter';
  const middleNameResult = await middleNameHarness.writer(inputFor(
    middleNameValue,
    'synthetic-middle-name-01',
    middleNameHarness,
  ));
  assert.strictEqual(middleNameResult.writePerformed, true);

  const formulaHarness = writerHarness({ formulaRange: 'As_Roster!O11:O11' });
  await expectCode(
    formulaHarness.writer(inputFor(
      statSubmission(),
      'synthetic-formula-key-01',
      formulaHarness,
    )),
    'sports_formula_cell_blocked',
  );
  assert.strictEqual(formulaHarness.batchCalls, 0);

  const injuryHarness = writerHarness();
  const injuryValue = rosterSubmission('injury', [
    { field: 'citizen.status', before: 'Active', after: 'injured' },
    { field: 'citizen.statusStartCycle', before: '', after: '404' },
    {
      field: 'citizen.healthCause',
      before: '',
      after: 'Synthetic verified condition',
    },
  ]);
  const injuryResult = await injuryHarness.writer(inputFor(
    injuryValue,
    'synthetic-injury-key-01',
    injuryHarness,
  ));
  assert.strictEqual(injuryResult.mutationAction, 'injury');
  assert.strictEqual(injuryResult.changedFieldCount, 3);
  assert.deepStrictEqual(injuryResult.updatedRanges, [
    'Oakland_Sports_Feed!A3:T3',
    'Simulation_Ledger!F22:F22',
    'Simulation_Ledger!I22:I22',
    'Simulation_Ledger!J22:J22',
    'Simulation_Ledger!G22:G22',
    'LifeHistory_Log!A3:G3',
    'Ripple_Ledger!A3:M3',
  ]);
  assert.strictEqual(injuryHarness.capturedBatches[0].length, 7);
  assert.strictEqual(injuryHarness.citizenSnapshot.rows[0].values[5], 'injured');
  assert.strictEqual(injuryHarness.citizenSnapshot.rows[0].values[8], '404');
  assert.strictEqual(
    injuryHarness.citizenSnapshot.rows[0].values[9],
    'Synthetic verified condition',
  );
  assert.match(
    injuryHarness.citizenSnapshot.rows[0].values[6],
    /C404 — \[SportsRoster\] Synthetic Batter entered injured status/,
  );
  assert.deepStrictEqual(
    injuryHarness.lifeHistoryLogSnapshot.rows.at(-1).values.slice(0, 7),
    [
      'C404',
      'POP-90001',
      'Synthetic Batter',
      'SportsRoster|source:sports|submission:synthetic-injury-0001|action:injury',
      'entered injured status with cause: Synthetic verified condition.',
      'Downtown',
      '404',
    ],
  );
  assert.strictEqual(
    injuryHarness.rippleLedgerSnapshot.rows.at(-1).values[4],
    'roster-injury',
  );
  assert.strictEqual(
    JSON.stringify(injuryHarness.auditStore.records).includes(
      'Synthetic verified condition'
    ),
    false,
    'engine.77 audit records must not contain HealthCause or LifeHistory prose',
  );
  assert.strictEqual(injuryHarness.auditStore.records[1].cellTransitions.length, 44);
  assert.ok(injuryHarness.auditStore.records[1].cellTransitions.some(
    (transition) => transition.range === 'Simulation_Ledger!J22:J22'
  ));

  const returnHarness = writerHarness();
  returnHarness.citizenSnapshot.rows[0].values[5] = 'serious-condition';
  returnHarness.citizenSnapshot.rows[0].values[8] = '401';
  returnHarness.citizenSnapshot.rows[0].values[9] = 'Synthetic verified condition';
  const returnValue = rosterSubmission('return', [
    { field: 'citizen.status', before: 'serious-condition', after: 'Active' },
    { field: 'citizen.statusStartCycle', before: '401', after: '' },
    {
      field: 'citizen.healthCause',
      before: 'Synthetic verified condition',
      after: '',
    },
  ]);
  const returnResult = await returnHarness.writer(inputFor(
    returnValue,
    'synthetic-return-key-01',
    returnHarness,
  ));
  assert.strictEqual(returnResult.mutationAction, 'return');
  assert.strictEqual(returnHarness.citizenSnapshot.rows[0].values[5], 'Active');
  assert.strictEqual(returnHarness.citizenSnapshot.rows[0].values[8], '');
  assert.strictEqual(returnHarness.citizenSnapshot.rows[0].values[9], '');
  assert.strictEqual(
    returnHarness.rippleLedgerSnapshot.rows.at(-1).values[4],
    'roster-return',
  );

  const callUpHarness = writerHarness();
  callUpHarness.rosterSnapshot.rows[0].values[5] = 'SP';
  callUpHarness.rosterSnapshot.rows[0].values[6] = 'Synthetic Affiliate';
  callUpHarness.citizenSnapshot.rows[0].values[4] = 'Synthetic Minor Leaguer';
  callUpHarness.citizenSnapshot.rows[0].values[5] = 'active';
  const callUpValue = rosterSubmission('call-up', [
    { field: 'roster.team', before: 'Synthetic Affiliate', after: "A's" },
    { field: 'roster.position', before: 'SP', after: 'RP' },
    { field: 'citizen.status', before: 'active', after: 'Active' },
    {
      field: 'citizen.roleType',
      before: 'Synthetic Minor Leaguer',
      after: 'Synthetic Major Leaguer',
    },
  ]);
  const callUpResult = await callUpHarness.writer(inputFor(
    callUpValue,
    'synthetic-call-up-key-01',
    callUpHarness,
  ));
  assert.strictEqual(callUpResult.mutationAction, 'call-up');
  assert.strictEqual(callUpHarness.rosterSnapshot.rows[0].values[5], 'RP');
  assert.strictEqual(callUpHarness.rosterSnapshot.rows[0].values[6], "A's");
  assert.strictEqual(callUpHarness.rosterSnapshot.rows[0].values[7], '$1');
  assert.strictEqual(callUpHarness.citizenSnapshot.rows[0].values[5], 'Active');
  assert.strictEqual(
    callUpHarness.citizenSnapshot.rows[0].values[4],
    'Synthetic Major Leaguer',
  );
  assert.strictEqual(
    callUpHarness.rippleLedgerSnapshot.rows.at(-1).values[4],
    'roster-call-up',
  );

  const tradeHarness = writerHarness();
  const tradeValue = rosterSubmission('trade-away', [
    { field: 'roster.team', before: "A's", after: 'Synthetic Destination' },
    { field: 'roster.position', before: 'CF', after: 'RF' },
    { field: 'citizen.status', before: 'Active', after: 'Traded' },
    {
      field: 'citizen.roleType',
      before: "A's Player",
      after: 'Synthetic Destination Player',
    },
  ]);
  const tradeResult = await tradeHarness.writer(inputFor(
    tradeValue,
    'synthetic-trade-key-01',
    tradeHarness,
  ));
  assert.strictEqual(tradeResult.mutationAction, 'trade-away');
  assert.strictEqual(tradeHarness.rosterSnapshot.rows.length, 1);
  assert.strictEqual(tradeHarness.citizenSnapshot.rows.length, 1);
  assert.strictEqual(tradeHarness.citizenSnapshot.rows[0].values[5], 'Traded');
  assert.strictEqual(
    tradeHarness.rippleLedgerSnapshot.rows.at(-1).values[4],
    'roster-trade-away',
  );
  assert.strictEqual(
    tradeHarness.capturedBatches[0].some((request) => (
      request.deleteDimension || request.deleteRange
    )),
    false,
    'trade-away must never delete a roster or citizen row',
  );

  const appendRaceHarness = writerHarness();
  const appendRaceInput = inputFor(
    injuryValue,
    'synthetic-append-race-01',
    appendRaceHarness,
  );
  appendRaceHarness.lifeHistoryLogSnapshot.rows.push({
    rowNumber: 3,
    values: LIFE_HISTORY_LOG_HEADERS.map(() => 'SYNTHETIC-RACE'),
  });
  const appendRaceResult = await appendRaceHarness.writer(appendRaceInput);
  assert.strictEqual(appendRaceHarness.batchCalls, 1);
  assert.ok(appendRaceResult.updatedRanges.includes('LifeHistory_Log!A4:G4'));

  const preBatchShiftHarness = writerHarness({ appendTargetShifts: 1 });
  const preBatchShiftResult = await preBatchShiftHarness.writer(inputFor(
    injuryValue,
    'synthetic-pre-batch-shift-01',
    preBatchShiftHarness,
  ));
  assert.strictEqual(preBatchShiftHarness.formulaReadCalls, 2);
  assert.strictEqual(preBatchShiftHarness.batchCalls, 1);
  assert.ok(
    preBatchShiftResult.updatedRanges.includes('LifeHistory_Log!A4:G4'),
  );
  assert.ok(
    preBatchShiftResult.updatedRanges.includes('Ripple_Ledger!A4:M4'),
  );
  const shiftedAudit = preBatchShiftHarness.auditStore.records.at(-1);
  assert.strictEqual(shiftedAudit.result, 'success');
  assert.ok(shiftedAudit.cellTransitions.some(
    (transition) => transition.range === 'LifeHistory_Log!A4:A4'
  ));
  assert.ok(shiftedAudit.cellTransitions.some(
    (transition) => transition.range === 'Ripple_Ledger!A4:A4'
  ));
  assert.strictEqual(shiftedAudit.cellTransitions.some(
    (transition) => (
      transition.range.startsWith('LifeHistory_Log!') &&
      transition.range.includes('3:')
    )
  ), false);

  const asymmetricShiftHarness = writerHarness({
    appendTargetShifts: 1,
    appendTargetShiftSheets: ['LifeHistory_Log'],
  });
  const asymmetricShiftResult = await asymmetricShiftHarness.writer(inputFor(
    injuryValue,
    'synthetic-pre-batch-asymmetric-01',
    asymmetricShiftHarness,
  ));
  assert.strictEqual(asymmetricShiftHarness.formulaReadCalls, 2);
  assert.strictEqual(asymmetricShiftHarness.batchCalls, 1);
  assert.ok(
    asymmetricShiftResult.updatedRanges.includes('LifeHistory_Log!A4:G4'),
  );
  assert.ok(
    asymmetricShiftResult.updatedRanges.includes('Ripple_Ledger!A3:M3'),
  );
  const asymmetricAudit = asymmetricShiftHarness.auditStore.records.at(-1);
  assert.ok(asymmetricAudit.cellTransitions.some(
    (transition) => transition.range === 'LifeHistory_Log!A4:A4'
  ));
  assert.ok(asymmetricAudit.cellTransitions.some(
    (transition) => transition.range === 'Ripple_Ledger!A3:A3'
  ));

  const movingTwiceHarness = writerHarness({ appendTargetShifts: 2 });
  await expectCode(
    movingTwiceHarness.writer(inputFor(
      injuryValue,
      'synthetic-pre-batch-shift-02',
      movingTwiceHarness,
    )),
    'sports_source_changed',
  );
  assert.strictEqual(movingTwiceHarness.formulaReadCalls, 2);
  assert.strictEqual(movingTwiceHarness.batchCalls, 0);
  assert.strictEqual(movingTwiceHarness.auditStore.records.at(-1).result, 'error');
  assert.strictEqual(
    movingTwiceHarness.auditStore.records.some(
      (record) => record.result === 'uncertain'
    ),
    false,
  );

  const lifeMismatchHarness = writerHarness({ lifeReadBackMismatch: true });
  await expectCode(
    lifeMismatchHarness.writer(inputFor(
      injuryValue,
      'synthetic-life-mismatch-01',
      lifeMismatchHarness,
    )),
    'sports_readback_mismatch',
  );
  assert.strictEqual(
    lifeMismatchHarness.auditStore.records.at(-1).result,
    'uncertain',
  );
  assert.strictEqual(lifeMismatchHarness.formulaReadCalls, 1);
  assert.strictEqual(lifeMismatchHarness.batchCalls, 1);

  const staleHarness = writerHarness();
  const staleInput = inputFor(
    statSubmission(),
    'synthetic-stale-key-01',
    staleHarness,
  );
  staleHarness.rosterSnapshot.rows[0].values[14] = '999';
  await expectCode(staleHarness.writer(staleInput), 'sports_source_changed');
  assert.strictEqual(staleHarness.batchCalls, 0);
  assert.strictEqual(staleHarness.auditStore.records[1].result, 'error');

  const mismatchHarness = writerHarness({ readBackMismatch: true });
  const mismatchInput = inputFor(draft(), 'synthetic-mismatch-01', mismatchHarness);
  await expectCode(
    mismatchHarness.writer(mismatchInput),
    'sports_readback_mismatch',
  );
  assert.strictEqual(mismatchHarness.batchCalls, 1);
  assert.strictEqual(mismatchHarness.auditStore.records[1].result, 'uncertain');
  const afterMismatch = inputFor(
    draft({ Notes: 'Second synthetic event after uncertain write.' }),
    'synthetic-mismatch-02',
    mismatchHarness,
  );
  await expectCode(
    mismatchHarness.writer(afterMismatch),
    'sports_writer_uncertain',
  );
  assert.strictEqual(mismatchHarness.batchCalls, 1);

  const ambiguousHarness = writerHarness({ batchThrow: true });
  const ambiguousInput = inputFor(draft(), 'synthetic-ambiguous-01', ambiguousHarness);
  await expectCode(
    ambiguousHarness.writer(ambiguousInput),
    'sports_write_uncertain',
  );
  assert.strictEqual(ambiguousHarness.auditStore.records[1].result, 'uncertain');

  for (const status of [400, 429]) {
    const error = new Error(`synthetic structured ${status}`);
    error.response = { status };
    const rejectedHarness = writerHarness({ batchError: error });
    await expectCode(
      rejectedHarness.writer(inputFor(
        draft(),
        `synthetic-rejected-${status}`,
        rejectedHarness,
      )),
      'sports_batch_rejected',
    );
    assert.strictEqual(rejectedHarness.auditStore.records[1].result, 'error');
    assert.strictEqual(rejectedHarness.auditStore.records[1].errorCode, 'sports_batch_rejected');
    const retryError = new Error(`synthetic structured ${status} retry`);
    retryError.response = { status };
    await expectCode(
      rejectedHarness.writer(inputFor(
        draft({ Notes: `Synthetic retry after ${status}.` }),
        `synthetic-rejected-${status}-retry`,
        rejectedHarness,
      )),
      'sports_batch_rejected',
    );
    assert.strictEqual(
      rejectedHarness.auditStore.records.some((record) => record.result === 'uncertain'),
      false,
      `structured ${status} must not latch the writer`,
    );
  }

  const invalidHarness = writerHarness();
  const invalidDraft = draft({ TeamsUsed: 'Warriors' });
  await expectCode(
    invalidHarness.writer({
      draft: invalidDraft,
      expectedRow: [],
      requestHash: 'invalid',
      idempotencyKey: 'synthetic-invalid-01',
    }),
    'sports_validation_failed',
  );
  assert.strictEqual(invalidHarness.batchCalls, 0);

  const auditRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'sports-audit-mode-'));
  try {
    const auditPath = path.join(auditRoot, 'nested', 'audit.jsonl');
    const fileStore = createFileAuditStore(auditPath);
    await fileStore.append({ idempotencyKey: 'synthetic-audit-mode' });
    assert.strictEqual(
      fs.statSync(path.dirname(auditPath)).mode & 0o777,
      0o700,
    );
    assert.strictEqual(fs.statSync(auditPath).mode & 0o777, 0o600);
  } finally {
    fs.rmSync(auditRoot, { recursive: true, force: true });
  }

  // ── engine-sheet S349: item-1 regression (Opus review, FIX-BEFORE-DEPLOY) ──
  // The feed is read BY HEADER NAME but written POSITIONALLY into A..T, and the
  // read-back compares what we wrote to what we wrote. Without an exact-header
  // guard, a column inserted or reordered in Oakland_Sports_Feed makes every
  // append land one column off while read-back still reports success — silent
  // canon corruption, the only critical finding in the review.
  //
  // The fix (exactHeaders: FEED_HEADERS) shipped WITHOUT this test: disabling
  // the guard left the whole suite green, so nothing prevented its removal.
  // This case is the thing that makes the fix stay fixed.
  const driftedHeaders = FEED_HEADERS.slice();
  driftedHeaders.splice(3, 0, 'InsertedColumn');
  const headerDriftHarness = writerHarness({ feedHeaders: driftedHeaders });
  // The guard fires while BUILDING the preconditions — earlier than the writer
  // call, which is the correct place: a drifted feed can't even be described,
  // let alone appended to.
  assert.throws(
    () => inputFor(draft(), 'synthetic-header-drift-01', headerDriftHarness),
    /header layout changed/,
  );
  assert.strictEqual(headerDriftHarness.batchCalls, 0);

  // Reordering without adding a column must fail too — same physical width, so
  // only a name-by-position check catches it.
  const swappedHeaders = FEED_HEADERS.slice();
  const swapTmp = swappedHeaders[1];
  swappedHeaders[1] = swappedHeaders[2];
  swappedHeaders[2] = swapTmp;
  const headerSwapHarness = writerHarness({ feedHeaders: swappedHeaders });
  assert.throws(
    () => inputFor(draft(), 'synthetic-header-swap-01', headerSwapHarness),
    /header layout changed/,
  );
  assert.strictEqual(headerSwapHarness.batchCalls, 0);

  console.log('sportsFeedWriter.test.js: all assertions passed');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
