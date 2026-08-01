#!/usr/bin/env node
'use strict';

const assert = require('assert');
const {
  createSportsFeedWriter,
  sportsRequestHash,
} = require('./sportsFeedWriter.js');
const { projectNewRow } = require('./sportsFeedContract.js');

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

function writerHarness(options = {}) {
  const auditStore = memoryAuditStore();
  let appendCalls = 0;
  let appendedRow = null;
  const writer = createSportsFeedWriter({
    auditStore,
    now: () => new Date('2042-01-01T00:00:00.000Z'),
    appendRowsDetailed: async (sheetName, rows) => {
      appendCalls += 1;
      assert.strictEqual(sheetName, 'Oakland_Sports_Feed');
      assert.strictEqual(rows.length, 1);
      appendedRow = rows[0];
      return {
        updatedRange: 'Oakland_Sports_Feed!A55:T55',
        updatedRows: 1,
        updatedColumns: 20,
        updatedCells: 20,
      };
    },
    readRange: async (range) => {
      assert.strictEqual(range, 'Oakland_Sports_Feed!A55:T55');
      const row = options.readBackMismatch
        ? appendedRow.map((value, index) => index === 5 ? 'DIFFERENT' : value)
        : appendedRow.slice(0, 19);
      return [row];
    },
  });
  return {
    writer,
    auditStore,
    get appendCalls() {
      return appendCalls;
    },
  };
}

function inputFor(value, key) {
  const row = projectNewRow(value);
  return {
    draft: value,
    expectedRow: row,
    provenance: null,
    requestHash: sportsRequestHash(row, null),
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
  const firstInput = inputFor(draft(), 'synthetic-key-0001');
  const first = await successHarness.writer(firstInput);
  assert.strictEqual(first.writePerformed, true);
  assert.strictEqual(first.replayed, false);
  assert.strictEqual(first.updatedRange, 'Oakland_Sports_Feed!A55:T55');
  assert.strictEqual(first.rowNumber, 55);
  assert.strictEqual(successHarness.appendCalls, 1);
  assert.strictEqual(successHarness.auditStore.records.length, 2);
  assert.strictEqual(successHarness.auditStore.records[0].result, 'pending');
  assert.deepStrictEqual(
    Object.keys(successHarness.auditStore.records[1]).sort(),
    [
      'actorHash', 'auditVersion', 'cycle', 'eventType', 'idempotencyKey',
      'requestHash', 'result', 'rowNumber', 'team', 'timestamp', 'updatedRange',
    ]
  );
  assert.strictEqual(
    JSON.stringify(successHarness.auditStore.records).includes('SYNTHETIC NON-CANON'),
    false,
    'audit records must not duplicate story text'
  );

  const replay = await successHarness.writer(firstInput);
  assert.strictEqual(replay.replayed, true);
  assert.strictEqual(successHarness.appendCalls, 1);

  const concurrentHarness = writerHarness();
  const concurrentInput = inputFor(draft(), 'synthetic-key-concurrent');
  const concurrentResults = await Promise.all([
    concurrentHarness.writer(concurrentInput),
    concurrentHarness.writer(concurrentInput),
    concurrentHarness.writer(concurrentInput),
  ]);
  assert.strictEqual(concurrentHarness.appendCalls, 1);
  assert.strictEqual(
    concurrentResults.filter((result) => result.replayed).length,
    2,
    'queued confirmations must replay the one append result'
  );

  const changed = draft({ Notes: 'DIFFERENT SYNTHETIC NON-CANON fixture.' });
  await expectCode(
    successHarness.writer(inputFor(changed, 'synthetic-key-0001')),
    'sports_idempotency_conflict'
  );
  assert.strictEqual(successHarness.appendCalls, 1);

  const mismatchHarness = writerHarness({ readBackMismatch: true });
  const mismatchInput = inputFor(draft(), 'synthetic-key-0002');
  await expectCode(
    mismatchHarness.writer(mismatchInput),
    'sports_readback_mismatch'
  );
  assert.strictEqual(mismatchHarness.appendCalls, 1);
  assert.strictEqual(mismatchHarness.auditStore.records[0].result, 'pending');
  assert.strictEqual(mismatchHarness.auditStore.records[1].result, 'error');
  assert.strictEqual(
    mismatchHarness.auditStore.records[1].errorCode,
    'sports_readback_mismatch'
  );
  await expectCode(
    mismatchHarness.writer(mismatchInput),
    'sports_readback_mismatch'
  );
  assert.strictEqual(mismatchHarness.appendCalls, 1);

  const invalidHarness = writerHarness();
  const invalidDraft = draft({ TeamsUsed: 'Warriors' });
  await expectCode(
    invalidHarness.writer({
      draft: invalidDraft,
      expectedRow: [],
      requestHash: 'invalid',
      idempotencyKey: 'synthetic-key-0003',
    }),
    'sports_validation_failed'
  );
  assert.strictEqual(invalidHarness.appendCalls, 0);

  console.log('sportsFeedWriter.test.js: all assertions passed');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
