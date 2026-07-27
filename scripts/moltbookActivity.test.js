#!/usr/bin/env node

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const activity = require('./moltbookActivity');

function writeJson(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2));
}

function run() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'moltbook-activity-'));
  const cursor = path.join(tmp, '.reflection-cursor.json');
  const today = '2026-07-27';
  const yesterday = '2026-07-26';

  try {
    writeJson(path.join(tmp, yesterday + '.json'), [
      { timestamp: '2026-07-26T19:00:00.000Z', type: 'reply', targetId: 'old' },
    ]);
    writeJson(path.join(tmp, today + '.json'), [
      { timestamp: '2026-07-27T19:00:01.000Z', type: 'read' },
      { timestamp: '2026-07-27T19:00:02.000Z', type: 'upvote', postId: 'p1' },
      { timestamp: '2026-07-27T19:00:03.000Z', type: 'reply', targetId: 'p2' },
    ]);

    const now = new Date('2026-07-27T20:00:00.000Z');
    const first = activity.loadUnconsumed(tmp, cursor, { now });
    assert.deepStrictEqual(first.map((entry) => entry.type), ['upvote', 'reply']);
    assert(!first.some((entry) => entry.targetId === 'old'), 'initial deployment must not replay history');

    const marked = activity.markConsumed(cursor, first, { now });
    assert.strictEqual(marked.lastConsumedAt, '2026-07-27T19:00:03.000Z');
    assert.strictEqual(activity.loadUnconsumed(tmp, cursor, { now }).length, 0);

    const current = JSON.parse(fs.readFileSync(path.join(tmp, today + '.json'), 'utf8'));
    current.push(
      { timestamp: '2026-07-27T19:00:03.000Z', type: 'reply', targetId: 'duplicate-at-cursor' },
      { timestamp: '2026-07-27T21:00:00.000Z', type: 'post', title: 'New thought' },
    );
    writeJson(path.join(tmp, today + '.json'), current);
    const second = activity.loadUnconsumed(tmp, cursor, { now });
    assert.deepStrictEqual(second.map((entry) => entry.type), ['post']);

    assert.strictEqual(
      activity.isScheduledVisitWindow(new Date('2026-07-27T19:15:00.000Z'), 14),
      true,
      '14:00 Central is the scheduled visit window',
    );
    assert.strictEqual(
      activity.isScheduledVisitWindow(new Date('2026-07-27T07:15:00.000Z'), 14),
      false,
      '02:00 Central must not spend an API call',
    );
    assert.strictEqual(
      activity.hasVisitedToday('2026-07-27T07:00:00.000Z', now),
      true,
      'an earlier Central-time visit suppresses a second scheduled visit',
    );
    assert.strictEqual(
      activity.hasVisitedToday('not-a-date', now),
      false,
      'a malformed legacy state value must fail open to the scheduled visit',
    );

    console.log('moltbookActivity.test.js: all assertions passed');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

run();
