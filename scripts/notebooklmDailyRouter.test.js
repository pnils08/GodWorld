#!/usr/bin/env node
'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const router = require('./notebooklmDailyRouter');

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function put(root, relative, value) {
  const file = path.join(root, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, typeof value === 'string' ? value : JSON.stringify(value, null, 2));
  return file;
}

function staged(root, base, cycle, body) {
  const article = 'output/cron-compare/staged/' + base + '.staged.md';
  put(root, article, body);
  put(root, 'output/cron-compare/staged/' + base + '.staged.json', {
    status: 'staged',
    desk: base.split('_c')[0],
    cycle,
    byline: 'Synthetic Reporter',
    bylinePopid: 'POP-99999',
    article,
    rhea: { pass: true, draftSha256: sha256(body), verdict: 'output/cron-compare/' + base + '.rhea.json' },
    stagedAt: '2099-01-01T00:00:00.000Z',
  });
  return article;
}

function angle(root, base, cycle, chase) {
  put(root, 'output/cron-compare/' + base + '_angle.json', {
    stage: 'angle',
    desk: base.split('_c')[0],
    cycle,
    reporter: { name: 'Synthetic Reporter', popid: 'POP-99999' },
    assignment: { story: { angle: 'SYNTHETIC NON-CANON ASSIGNMENT' } },
    angleRead: {
      text: '{"machine":"shape that must never become the chase"}',
      plan: { chase },
    },
  });
}

function packet(root, base, cycle) {
  put(root, 'output/cron-compare/' + base + '_packet.json', {
    stage: 'report',
    packetContract: 'LEP/2',
    cycle,
    quotes: [{
      name: 'Synthetic Citizen', pop: 'POP-99998', quote: 'I saw the synthetic test signal.',
      claims: { factIds: ['F-SYNTHETIC'], basis: 'direct-reaction' },
    }, {
      name: 'Synthetic Assignment Note', pop: 'POP-99997',
      quote: 'The Tribune should ask the next synthetic question.',
      claims: { factIds: ['F-SYNTHETIC'], basis: 'direct-reaction' },
    }],
  });
}

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nlm-daily-router-'));
try {
  const now = Date.now();
  const passedBase = 'civic_c104_synthetic-pass_packet-v2_deepseek';
  const angleBase = 'civic_c104_synthetic-pass_packet-v2';
  angle(root, angleBase, 104, 'Walk the synthetic block and ask who owns the supplied test fact.');
  packet(root, angleBase, 104);
  put(root, 'output/cron-compare/' + angleBase + '_asks.json', [{
    pop: 'POP-99998', packetContract: 'LEP/2', inputPacket: { wake: 'W2' },
  }]);
  const passedArticle = staged(root, passedBase, 104, '# SYNTHETIC PASS\n\nA non-canon test Article.');
  put(root, 'output/cron-compare/' + passedBase + '.wake.json', {
    cycle: 104, disposition: 'staged', rheaPass: true, rheaFlagCount: 0, article: passedArticle,
  });

  const rheaBase = 'business_c104_synthetic-rhea_packet-v2';
  angle(root, rheaBase, 104, 'Ask why the synthetic number moved.');
  put(root, 'output/cron-compare/' + rheaBase + '_model.wake.json', {
    cycle: 104, disposition: 'flagged', rheaPass: false, rheaFlagCount: 2,
  });
  put(root, 'output/cron-compare/' + rheaBase + '_model.rhea.json', {
    cycle: 104, pass: false, flags: [{ issue: 'synthetic contradiction' }],
  });
  put(root, 'output/cron-compare/flagged/' + rheaBase + '_model.flags.json', {
    flags: [{ issue: 'synthetic contradiction' }], contamination: [],
  });

  const neverBase = 'sports_c104_synthetic-shape_packet-v2';
  angle(root, neverBase, 104, 'Check the synthetic scorecard.');
  put(root, 'output/cron-compare/' + neverBase + '_model.wake.json', {
    cycle: 104, disposition: 'flagged', rheaPass: null, rheaFlagCount: null,
  });
  put(root, 'output/cron-compare/' + neverBase + '_model.rhea.json', {
    cycle: 104, pass: true, flags: [],
  });
  put(root, 'output/cron-compare/flagged/' + neverBase + '_model.flags.json', {
    flags: [], contamination: [{ check: 's344-slot', issue: 'synthetic malformed article' }],
  });

  const w1OnlyBase = 'culture_c104_synthetic-w1-only_packet-v2';
  angle(root, w1OnlyBase, 104, 'Pursue the synthetic culture signal without inventing a source.');

  staged(root, 'civic_c103_synthetic-prior_packet-v2_model', 103,
    '# SYNTHETIC PRIOR\n\nA prior-cycle non-canon test Article.');
  put(root, 'output/cron-compare/fanout-2099-01-01.json', {
    date: '2099-01-01', cycle: 104,
    assignments: [{ desk: 'civic', name: 'Synthetic Reporter', popid: 'POP-99999' }],
  });
  put(root, 'output/cron-compare/fanout-2099-01-01.angle.results.json', {
    date: '2099-01-01', stage: 'angle', results: [{ ok: true }],
  });

  // Test fixtures use current mtimes, so a normal 36h collection sees them.
  const pulse = router.collectNewsroomPulse({ root, cycle: 104, hours: 36, nowMs: now + 1000 });
  assert.strictEqual(pulse.priorCompletedCycle, 103);
  assert.strictEqual(pulse.cycleChanged, true);
  assert.strictEqual(pulse.counts.asks, 1);
  assert.strictEqual(pulse.counts.fanoutAssignments, 1);
  assert.strictEqual(pulse.counts.flagged, 2);
  assert.strictEqual(pulse.counts.pending, 1);
  assert.strictEqual(pulse.counts.rheaFlagged, 1);
  assert.strictEqual(pulse.counts.neverGated, 1);
  assert.strictEqual(pulse.counts.passed, 1,
    'a stale Rhea sidecar must not override a newer never-gated wake');
  assert.strictEqual(pulse.counts.w2Ready, 1);
  assert.strictEqual(pulse.counts.quotes, 1);
  assert.strictEqual(pulse.filings.previous.length, 1);
  assert.strictEqual(pulse.fanout.rotationPath, 'output/cron-compare/fanout-2099-01-01.json');
  assert.deepStrictEqual(pulse.fanout.resultPaths,
    ['output/cron-compare/fanout-2099-01-01.angle.results.json']);
  const passedAssignment = pulse.assignments.find((assignment) => assignment.key === angleBase);
  assert(passedAssignment, 'passed assignment must be present in pulse');
  assert.strictEqual(passedAssignment.askPath,
    'output/cron-compare/' + angleBase + '_asks.json');
  assert.strictEqual(passedAssignment.chase,
    'Walk the synthetic block and ask who owns the supplied test fact.');
  assert(!passedAssignment.chase.includes('machine'), 'angleRead.text must never substitute for plan.chase');
  assert.deepStrictEqual(passedAssignment.quotes[0].factIds, ['F-SYNTHETIC']);
  assert.strictEqual(passedAssignment.quotes.length, 1,
    'S344 Tribune-as-actor assignment notes must not enter safe-to-quote coverage');
  assert(!JSON.stringify(pulse).includes('A non-canon test Article.'), 'pulse carries paths, never Article bodies');
  const w1Only = pulse.assignments.find((assignment) => assignment.key === w1OnlyBase);
  assert(w1Only && w1Only.chase && !w1Only.wakePath && !w1Only.packetPath,
    'W1-only assignment must remain distinct from W2/W3 state');
  const neverGated = pulse.assignments.find((assignment) => assignment.key === neverBase);
  assert.strictEqual(neverGated.disposition, router.RHEA_DISPOSITIONS.NEVER_GATED);

  const c104Open = router.routeDailyNews({
    counts: { passed: 0, angles: 2, quotes: 1, rheaFlagged: 1, neverGated: 1 },
    cycleChanged: true,
    filings: { previous: pulse.filings.previous },
    materialSignals: ['WORLD_HIGH_SIGNAL'],
  }, { reportedDayThreshold: 2 });
  assert.strictEqual(c104Open.profile, router.PROFILES.CYCLE_OPEN);
  assert.deepStrictEqual(c104Open.dispositionCounts, { passed: 0, rheaFlagged: 1, neverGated: 1 });

  const flaggedOnly = router.routeDailyNews({
    counts: { passed: 0, angles: 0, quotes: 0, rheaFlagged: 0, neverGated: 2 },
    cycleChanged: false,
    filings: { previous: [] },
    materialSignals: [],
  }, { reportedDayThreshold: 2 });
  assert.strictEqual(flaggedOnly.profile, router.PROFILES.CYCLE_OPEN);
  assert(flaggedOnly.reasonCodes.includes('NEVER_GATED_2'));

  const reported = router.routeDailyNews({
    counts: { passed: 2, angles: 3, quotes: 2, rheaFlagged: 0, neverGated: 0 },
    cycleChanged: true,
    filings: { previous: [] },
    materialSignals: [],
  }, { reportedDayThreshold: 2 });
  assert.strictEqual(reported.profile, router.PROFILES.REPORTED_DAY);
  assert.strictEqual(reported.format, 'deep_dive');
  assert.strictEqual(reported.activationEligible, true);

  const provisional = router.routeDailyNews({
    counts: { passed: 1, angles: 1, quotes: 1, rheaFlagged: 0, neverGated: 0 },
    cycleChanged: true,
    filings: { previous: [] },
    materialSignals: [],
  });
  assert.strictEqual(provisional.profile, router.PROFILES.CYCLE_OPEN);
  assert.strictEqual(provisional.reportedDayThreshold, null);
  assert.strictEqual(provisional.activationEligible, true);
  assert(provisional.reasonCodes.includes('REPORTED_THRESHOLD_UNSET_OBSERVE_ONLY'));

  const debate = router.routeDailyNews({
    counts: { passed: 1, angles: 1, quotes: 2, rheaFlagged: 0, neverGated: 0 },
    cycleChanged: false,
    filings: { previous: [] },
    materialSignals: [],
    provenOpposition: true,
  }, { reportedDayThreshold: 2 });
  assert.strictEqual(debate.profile, router.PROFILES.VERIFIED_OPPOSITION);
  assert.strictEqual(debate.format, 'debate');

  const quiet = router.routeDailyNews({
    counts: { passed: 0, angles: 0, quotes: 0, rheaFlagged: 0, neverGated: 0 },
    cycleChanged: false,
    filings: { previous: [] },
    materialSignals: [],
  }, { reportedDayThreshold: 2 });
  assert.strictEqual(quiet.profile, router.PROFILES.QUIET_DESK);
  assert.strictEqual(quiet.format, 'brief');

  assert.deepStrictEqual(
    router.detectMaterialSignals('**Cycle Weight:** high-signal | **Shock:** shock-flag\n\n## Civic Decisions\n\n- Synthetic vote\n\n### High-Severity Patterns\n- Synthetic finding'),
    ['WORLD_HIGH_SIGNAL', 'WORLD_SHOCK', 'CIVIC_DECISIONS', 'ENGINE_HIGH_SEVERITY']
  );
  assert.strictEqual(router.routeDailyNews(pulse).fingerprint, router.routeDailyNews(pulse).fingerprint);
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}

console.log('notebooklmDailyRouter tests: PASS');
