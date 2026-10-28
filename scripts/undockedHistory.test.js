'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { readHistory, MAX_EVENTS } = require('./undockedHistory');

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'test-only-undocked-history-'));
const feed = path.join(root, 'output', 'spacemolt-show', 'feed');
fs.mkdirSync(feed, { recursive: true });
fs.writeFileSync(path.join(root, 'output', 'simulation_ledger_snapshot.jsonl'),
  [{ POPID: 'POP-99991', Name: 'TEST-ONLY Pilot' },
    { POPID: 'POP-99992', Name: 'TEST-ONLY Rival' },
    { POPID: 'POP-99993', Name: 'TEST-ONLY Other Pilot' }]
    .map(row => JSON.stringify(row)).join('\n') + '\n');
const event = (cycle, id, holder, credits) => ({
  v: 'UNDOCKED-FEED/1', Cycle: cycle, EventType: 'undocked-episode',
  POPID: id, Holder: holder, EpisodeId: 'TEST-ONLY-' + id + '-C' + cycle,
  CreditsDelta: credits, Systems: ['test_system'], CombatEvents: 0, MishapCount: 0,
});
const pack = (cycle, events) => fs.writeFileSync(path.join(feed, 'c' + cycle + '.json'),
  JSON.stringify({ v: 'UNDOCKED-FEED/1', cycle, events }));

try {
  for (let cycle = 1; cycle <= 7; cycle++) {
    pack(cycle, [event(cycle, 'POP-99991', 'TEST-ONLY Pilot', cycle === 7 ? null : cycle),
      event(cycle, 'POP-99992', 'TEST-ONLY Rival', 0)]);
  }
  pack(8, [event(8, 'POP-99991', 'TEST-ONLY Pilot', 99)]); // current: excluded

  const pilot = readHistory({ pilot: '  test-only   pilot ' }, 8, root);
  assert.equal(pilot.lines.length, 7);
  assert.match(pilot.lines[0].text, /C7 UNDOCKED: TEST-ONLY Pilot — credits unsettled/);
  assert.match(pilot.lines[1].text, /C6 UNDOCKED: TEST-ONLY Pilot — credits 6/);
  assert.ok(pilot.lines.every(x => x.src.startsWith('tool:undocked_history:feed/c')));
  assert.ok(!pilot.text.includes('credits 99'), 'current episode never enters history');
  assert.ok(!pilot.text.includes('StagedPath'), 'no raw or staged path enters result');

  const all = readHistory({}, 8, root);
  assert.deepStrictEqual(readHistory(undefined, 8, root).lines, all.lines,
    'omitting optional input keeps the current Cycle boundary');
  assert.equal(all.lines.length, MAX_EVENTS, 'show-wide result stays bounded');
  assert.match(all.text, /beforeCycle 2\./, 'pagination moves before the last complete Cycle');
  const older = readHistory({ beforeCycle: 2 }, 8, root);
  assert.equal(older.lines.length, 2);
  assert.ok(!older.text.includes('C2 UNDOCKED'), 'page has no duplicate Cycle');
  assert.ok(!all.text.includes('credits 99'));

  const absent = readHistory({ pilot: 'TEST-ONLY Absent' }, 8, root);
  assert.equal(absent.lines.length, 0);
  assert.match(absent.text, /does not prove none ever aired/);
  assert.match(readHistory({ beforeCycle: 9 }, 8, root).text, /history unavailable/);
  assert.equal(readHistory({ beforeCycle: 9 }, 8, root).lines.length, 0);

  pack(3, [event(3, 'POP-99993', 'TEST-ONLY Pilot', 50)]);
  const ambiguous = readHistory({ pilot: 'TEST-ONLY Pilot' }, 8, root);
  assert.equal(ambiguous.lines.length, 0);
  assert.match(ambiguous.text, /more than one POPID/);

  pack(3, [event(3, 'POP-99994', 'TEST-ONLY Ghost', 50)]);
  const ghost = readHistory({}, 8, root);
  assert.equal(ghost.lines.length, 0);
  assert.match(ghost.text, /no ledger row/);
  pack(3, [event(3, 'POP-99993', 'TEST-ONLY Pilot', 50)]);

  fs.writeFileSync(path.join(feed, 'c2.json'), '{broken');
  const malformed = readHistory({}, 8, root);
  assert.equal(malformed.lines.length, 0, 'a damaged approved pack fails closed');
  assert.match(malformed.text, /c2.json could not be parsed/);
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}

console.log('undockedHistory tests: PASS');
