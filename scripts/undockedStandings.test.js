'use strict';

// research.31 (builder ruling C, 2026-10-30): the board ranks achievement
// points first, credits alongside. Synthetic rows only; no sheet call.
const assert = require('assert');
const { compute, HEADERS, POINTS_FROM_CYCLE } = require('./undockedStandings');

const HDR = ['TargetCycle', 'Cycle', 'EventType', 'POPID', 'Holder', 'EpisodeId',
  'CreditsDelta', 'Systems', 'CombatEvents', 'MishapCount', 'Magnitude', 'Flags', 'PointsDelta'];
const row = (target, pop, ep, credits, points) =>
  [target, target - 1, 'undocked-episode', pop, 'TEST-ONLY ' + pop, ep, credits, '', 0, 0, 2, '', points];
const col = name => HEADERS.indexOf(name);
const byPop = rows => Object.fromEntries(rows.map(r => [r[col('POPID')], r]));

let n = 0;
const ok = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };

ok('points outrank credits: 10 pts / 5 cr beats 5 pts / 1,000 cr', () => {
  const rows = compute([HDR,
    row(110, 'POP-99991', 'TEST-ONLY-a1', 5, 10),
    row(110, 'POP-99992', 'TEST-ONLY-b1', 1000, 5),
  ]);
  assert.strictEqual(rows[0][col('POPID')], 'POP-99991');
  assert.strictEqual(rows[0][col('PointsTotal')], 10);
  assert.strictEqual(rows[1][col('CreditsTotal')], 1000);
});

ok('equal points fall to credits, then POPID', () => {
  const rows = compute([HDR,
    row(110, 'POP-99993', 'TEST-ONLY-c1', 0, 10),
    row(110, 'POP-99992', 'TEST-ONLY-b1', 300, 10),
    row(110, 'POP-99991', 'TEST-ONLY-a1', 0, 10),
  ]);
  assert.deepStrictEqual(rows.map(r => r[col('POPID')]), ['POP-99992', 'POP-99991', 'POP-99993']);
});

ok('blank PointsDelta is not zero but moves nothing; the flight still counts', () => {
  const p = byPop(compute([HDR,
    row(110, 'POP-99991', 'TEST-ONLY-a1', 4, ''),
    row(111, 'POP-99991', 'TEST-ONLY-a2', '', 5),
  ]));
  assert.strictEqual(p['POP-99991'][col('Episodes')], 2);
  assert.strictEqual(p['POP-99991'][col('PointsTotal')], 5);
  assert.strictEqual(p['POP-99991'][col('CreditsTotal')], 4);
});

ok('a tab without the PointsDelta column ranks by credits (every pilot at 0 pts)', () => {
  const old = HDR.slice(0, 12);
  const rows = compute([old,
    row(110, 'POP-99991', 'TEST-ONLY-a1', 5, 99).slice(0, 12),
    row(110, 'POP-99992', 'TEST-ONLY-b1', 1000, 99).slice(0, 12),
  ]);
  assert.strictEqual(rows[0][col('POPID')], 'POP-99992');
  assert.strictEqual(rows[0][col('PointsTotal')], 0);
});

const P = POINTS_FROM_CYCLE;

ok('from the points cycle on, the leader changes when points pass', () => {
  const p = byPop(compute([HDR,
    row(P, 'POP-99991', 'TEST-ONLY-a1', 1000, 5),
    row(P, 'POP-99992', 'TEST-ONLY-b1', 0, 0),
    row(P + 1, 'POP-99992', 'TEST-ONLY-b2', 0, 10),
    row(P + 2, 'POP-99991', 'TEST-ONLY-a2', 0, 0),
  ]));
  assert.strictEqual(p['POP-99991'][col('CyclesLed')], 1);
  assert.strictEqual(p['POP-99992'][col('CyclesLed')], 2);
  assert.strictEqual(p['POP-99992'][col('CurrentStreak')], 2);
  assert.strictEqual(p['POP-99991'][col('CurrentStreak')], 0);
});

ok('cycles aired before the points cycle keep the leader they were awarded on credits', () => {
  // a1 leads P-2 and P-1 on credits though b has more points; b leads P on points.
  const p = byPop(compute([HDR,
    row(P - 2, 'POP-99991', 'TEST-ONLY-a1', 1000, 5),
    row(P - 2, 'POP-99992', 'TEST-ONLY-b1', 10, 10),
    row(P - 1, 'POP-99992', 'TEST-ONLY-b2', 0, 0),
    row(P, 'POP-99993', 'TEST-ONLY-c1', 0, 0),
  ]));
  assert.strictEqual(p['POP-99991'][col('CyclesLed')], 2);
  assert.strictEqual(p['POP-99992'][col('CyclesLed')], 1);
  assert.strictEqual(p['POP-99992'][col('CurrentStreak')], 1);
  assert.strictEqual(p['POP-99992'][col('Rank')], 1);
});

ok('a leader on both boards keeps the streak across the change', () => {
  const p = byPop(compute([HDR,
    row(P - 2, 'POP-99991', 'TEST-ONLY-a1', 1000, 20),
    row(P - 1, 'POP-99992', 'TEST-ONLY-b1', 300, 10),
    row(P, 'POP-99993', 'TEST-ONLY-c1', 5, 5),
  ]));
  assert.strictEqual(p['POP-99991'][col('CyclesLed')], 3);
  assert.strictEqual(p['POP-99991'][col('CurrentStreak')], 3);
});

ok('nights with unread points are counted as pending, not hidden', () => {
  const rows = compute([HDR,
    row(P, 'POP-99991', 'TEST-ONLY-a1', 5, ''),
    row(P, 'POP-99991', 'TEST-ONLY-a2', 5, 10),
    row(P, 'POP-99992', 'TEST-ONLY-b1', 5, 5),
  ]);
  assert.strictEqual(rows.pending['POP-99991'], 1);
  assert.strictEqual(rows.pending['POP-99992'], 0);
});

console.log('undockedStandings: ok (' + n + ')');
