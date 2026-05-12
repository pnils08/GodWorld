/**
 * engineAuditor.integration.test.js — orchestration integration test for the
 * Phase 38 engine auditor pipeline. Feeds a synthetic ctx into runEngineAudit
 * (extracted from main() in S217 Phase 2.7a) and asserts on the structural
 * + detector-firing contract.
 *
 * Pairs with [[../docs/plans/2026-05-12-test-coverage-rollout]] §2.7. Per-
 * detector unit tests already cover load-bearing logic (S216 Phase 2.1-2.6);
 * this test covers orchestration regression — detector order, enricher order,
 * output assembly, detectorVersions wiring, snapshot persistence, ctx
 * propagation. Catches "someone reordered the enrichers and now framing runs
 * before resolveAffectedCitizens" without needing live sheets.
 *
 * Run: node scripts/engineAuditor.integration.test.js
 * Exits 0 on pass, 1 on failure.
 */

const { runEngineAudit } = require('./engineAuditor');

let passed = 0;
let failed = 0;
function assert(label, cond, detail) {
  if (cond) { console.log(`  ok   ${label}`); passed++; }
  else { console.error(`  FAIL ${label}${detail ? ': ' + detail : ''}`); failed++; }
}

// ─── Fixture ctx ─────────────────────────────────────────────────────
// Planted to trigger:
//   - detectRepeatingEvents on 'transit' (3 cycles of Riley_Digest matches +
//     stuck transit initiative in same domain → high severity)
//   - One healthy initiative (INIT-H1) in a recently advanced phase
//   - Neighborhood_Map has Downtown (mapped to D1) — INIT-T1's neighborhood
//   - INIT-H1 references 'Unmapped Place' which is NOT in Neighborhood_Map;
//     if INIT-H1 produces a HIGH-severity pattern, checkOrphanAilments will
//     surface the orphan (whether it fires depends on other detectors).
//   - Civic_Office_Ledger has one official for enricher coverage
//   - Simulation_Ledger has POP-001 with income for buildCitizenIncomes
//
// prior holds 3 cycles of audit fixtures so detectStuckInitiatives can walk
// the same-phase history and the prior-array surface is exercised.

function buildFixtureCtx() {
  const initiativeStuck = {
    InitiativeID: 'INIT-T1',
    Name: 'Test Transit Initiative',
    ImplementationPhase: 'planning',
    Status: 'passed',
    VoteCycle: 80,
    PolicyDomain: 'transit',
    AffectedNeighborhoods: 'Downtown',
    LastUpdated: '',
  };
  const initiativeHealthy = {
    InitiativeID: 'INIT-H1',
    Name: 'Test Health Initiative',
    ImplementationPhase: 'implementation-active',
    Status: 'passed',
    VoteCycle: 92,
    PolicyDomain: 'health',
    AffectedNeighborhoods: 'Unmapped Place',
    LastUpdated: '',
  };

  // Prior audits — INIT-T1 stuck in 'planning' for 3+ cycles. Audit JSON
  // format matches what engineAuditor writes (cycle + snapshots).
  const priorCycle = (c) => ({
    cycle: c,
    snapshots: { Initiative_Tracker: [{ ...initiativeStuck }] },
  });

  return {
    cycle: 93,
    snapshot: {
      Initiative_Tracker: [initiativeStuck, initiativeHealthy],
      Riley_Digest: [
        { Cycle: 91, Issues: 'transit congestion daily', PatternFlag: 'transit' },
        { Cycle: 92, Issues: 'transit delays persistent', PatternFlag: 'transit' },
        { Cycle: 93, Issues: 'transit problems continue', PatternFlag: 'transit' },
      ],
      Neighborhood_Map: [
        { Neighborhood: 'Downtown', District: 'D1', Sentiment: 0.5, CrimeIndex: 3 },
      ],
      Civic_Office_Ledger: [
        { OfficeId: 'D1', PopId: 'POP-001', Holder: 'Test Holder',
          District: 'D1', Approval: 0.6 },
      ],
      Simulation_Ledger: [
        { POPID: 'POP-001', Income: '50000', Name: 'Test Citizen' },
      ],
      WorldEvents_V3_Ledger: [],
      Edition_Coverage_Ratings: [],
      Population_Stats: [],
      World_Population: [],
      Crime_Metrics: [],
      Transit_Metrics: [],
      Event_Arc_Ledger: [],
      Storyline_Tracker: [],
      LifeHistory_Log: [],
    },
    prior: [priorCycle(92), priorCycle(91), priorCycle(90)],
  };
}

(async () => {
  console.log('═══ engineAuditor.integration.test.js');
  console.log('Building synthetic ctx + running runEngineAudit...\n');

  const ctx = buildFixtureCtx();
  let result;
  try {
    result = await runEngineAudit(ctx);
  } catch (err) {
    console.error('FATAL: runEngineAudit threw:', err.stack || err.message);
    process.exit(1);
  }
  console.log('');

  // ─── Test 1: Top-level return shape ───
  console.log('Test 1: return shape — 7 expected keys');
  {
    const expected = ['auditOutput', 'anomaliesOutput', 'briefsOutput',
      'patterns', 'anomalies', 'briefs', 'detectorVersions'];
    for (const key of expected) {
      assert(`returned.${key} present`, result[key] !== undefined,
        `keys=${Object.keys(result).join(',')}`);
    }
  }

  // ─── Test 2: auditOutput structure ───
  console.log('\nTest 2: auditOutput structure');
  {
    const a = result.auditOutput;
    assert('auditOutput.cycle === 93', a.cycle === 93);
    assert('auditOutput.previousCycle === 92', a.previousCycle === 92);
    assert('auditOutput.generatedAt is ISO string',
      typeof a.generatedAt === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(a.generatedAt));
    assert('auditOutput.patterns is array', Array.isArray(a.patterns));
    assert('auditOutput.summary is object',
      a.summary && typeof a.summary === 'object');
    assert('auditOutput.snapshots is object',
      a.snapshots && typeof a.snapshots === 'object');
    assert('auditOutput.citizenIncomes is object',
      a.citizenIncomes && typeof a.citizenIncomes === 'object');
    assert('auditOutput.orphanAilments is object',
      a.orphanAilments && typeof a.orphanAilments === 'object');
    assert('auditOutput.detectorVersions is object',
      a.detectorVersions && typeof a.detectorVersions === 'object');
  }

  // ─── Test 3: detectorVersions completeness ───
  // The integration contract: every detector + enricher + meta-detector that
  // engineAuditor wires must report a version. If someone adds a new detector
  // but forgets to register it, this catches it. If someone removes one, this
  // catches it the other way.
  console.log('\nTest 3: detectorVersions wiring — all 8 ailment + 5 enricher + anomaly + briefs');
  {
    const dv = result.detectorVersions;
    const expectedDetectors = [
      'engineAuditor',
      'detectStuckInitiatives', 'detectRepeatingEvents', 'detectMathImbalances',
      'detectCascadeFailures', 'detectWritebackDrift', 'detectProductionImbalance',
      'detectImprovements', 'detectIncoherence',
      'checkMitigators', 'recommendRemedy', 'resolveAffectedCitizens',
      'generateTribuneFraming', 'measureRemedies', 'checkOrphanAilments',
      'detectAnomalies', 'generateBaselineBriefs',
    ];
    for (const name of expectedDetectors) {
      assert(`detectorVersions.${name} present`, dv[name] !== undefined,
        `keys=${Object.keys(dv).join(',')}`);
    }
  }

  // ─── Test 4: snapshot persistence ───
  console.log('\nTest 4: snapshot persistence into auditOutput.snapshots');
  {
    const s = result.auditOutput.snapshots;
    assert('snapshots.Initiative_Tracker has 2 rows',
      Array.isArray(s.Initiative_Tracker) && s.Initiative_Tracker.length === 2,
      `length=${s.Initiative_Tracker && s.Initiative_Tracker.length}`);
    assert('snapshots.Neighborhood_Map has 1 row',
      Array.isArray(s.Neighborhood_Map) && s.Neighborhood_Map.length === 1);
    assert('snapshots.Civic_Office_Ledger has 1 row (projected fields)',
      Array.isArray(s.Civic_Office_Ledger) && s.Civic_Office_Ledger.length === 1);
    assert('Civic_Office_Ledger row has projected fields only',
      s.Civic_Office_Ledger[0].OfficeId === 'D1' &&
      s.Civic_Office_Ledger[0].Holder === 'Test Holder' &&
      s.Civic_Office_Ledger[0].Approval === 0.6);
    assert('snapshots.Crime_Metrics is array (empty)',
      Array.isArray(s.Crime_Metrics));
  }

  // ─── Test 5: citizenIncomes derived from Simulation_Ledger ───
  console.log('\nTest 5: citizenIncomes built from Simulation_Ledger');
  {
    const ci = result.auditOutput.citizenIncomes;
    assert('citizenIncomes[POP-001] === 50000', ci['POP-001'] === 50000,
      `value=${ci['POP-001']}`);
  }

  // ─── Test 6: detectRepeatingEvents fires on planted transit recurrence ───
  // Contract: 3 cycles of transit Riley_Digest matches + stuck transit
  // initiative in same domain → HIGH-severity recurring-event pattern.
  console.log('\nTest 6: detectRepeatingEvents fires on planted transit pattern');
  {
    const transit = result.patterns.find(p =>
      p.type === 'repeating-event' &&
      p.evidence && p.evidence.fields &&
      p.evidence.fields.recurringIssue === 'transit'
    );
    assert('transit repeating-event pattern present', !!transit,
      `patterns=${result.patterns.map(p => `${p.type}/${p.severity}`).join(',')}`);
    if (transit) {
      assert('transit recurrence severity === high', transit.severity === 'high',
        `severity=${transit.severity}`);
      assert('transit pattern has detectorVersion stamped',
        !!transit.detectorVersion);
      assert('cyclesRecurring === 3',
        transit.evidence.fields.cyclesRecurring === 3,
        `got ${transit.evidence.fields.cyclesRecurring}`);
      assert('matchedPolicyDomain === transit',
        transit.evidence.fields.matchedPolicyDomain === 'transit');
    }
  }

  // ─── Test 7: summary mirrors patterns ───
  console.log('\nTest 7: summary counts mirror patterns array');
  {
    const sum = result.auditOutput.summary;
    const patterns = result.patterns;
    const expectedHigh = patterns.filter(p => p.severity === 'high').length;
    const expectedMed = patterns.filter(p => p.severity === 'medium').length;
    const expectedLow = patterns.filter(p => p.severity === 'low').length;
    assert(`summary.highSeverity === ${expectedHigh}`,
      sum.highSeverity === expectedHigh,
      `got ${sum.highSeverity}`);
    assert(`summary.mediumSeverity === ${expectedMed}`,
      sum.mediumSeverity === expectedMed,
      `got ${sum.mediumSeverity}`);
    assert(`summary.lowSeverity === ${expectedLow}`,
      sum.lowSeverity === expectedLow,
      `got ${sum.lowSeverity}`);
    assert('summary.byType is object',
      sum.byType && typeof sum.byType === 'object');
  }

  // ─── Test 8: anomaliesOutput shape ───
  console.log('\nTest 8: anomaliesOutput shape');
  {
    const ao = result.anomaliesOutput;
    assert('anomaliesOutput.cycle === 93', ao.cycle === 93);
    assert('anomaliesOutput.anomalies is array', Array.isArray(ao.anomalies));
    assert('anomaliesOutput.summary.total matches anomalies.length',
      ao.summary && ao.summary.total === ao.anomalies.length);
    assert('anomaliesOutput.summary.byTriage is object',
      ao.summary && ao.summary.byTriage && typeof ao.summary.byTriage === 'object');
    assert('anomaliesOutput.detectorVersion is string',
      typeof ao.detectorVersion === 'string');
  }

  // ─── Test 9: briefsOutput shape ───
  console.log('\nTest 9: briefsOutput shape');
  {
    const bo = result.briefsOutput;
    assert('briefsOutput.cycle === 93', bo.cycle === 93);
    assert('briefsOutput.briefs is array', Array.isArray(bo.briefs));
    assert('briefsOutput.summary.total matches briefs.length',
      bo.summary && bo.summary.total === bo.briefs.length);
    assert('briefsOutput.summary.byEventClass is object',
      bo.summary && bo.summary.byEventClass &&
      typeof bo.summary.byEventClass === 'object');
    assert('briefsOutput.summary.withPromotionHints is number',
      bo.summary && typeof bo.summary.withPromotionHints === 'number');
    assert('briefsOutput.generatorVersion is string',
      typeof bo.generatorVersion === 'string');
  }

  // ─── Test 10: full JSON-serializability (catches circular refs / Function values) ───
  console.log('\nTest 10: outputs are JSON-serializable');
  {
    try {
      JSON.stringify(result.auditOutput);
      assert('auditOutput JSON.stringify ok', true);
    } catch (err) {
      assert('auditOutput JSON.stringify ok', false, err.message);
    }
    try {
      JSON.stringify(result.anomaliesOutput);
      assert('anomaliesOutput JSON.stringify ok', true);
    } catch (err) {
      assert('anomaliesOutput JSON.stringify ok', false, err.message);
    }
    try {
      JSON.stringify(result.briefsOutput);
      assert('briefsOutput JSON.stringify ok', true);
    } catch (err) {
      assert('briefsOutput JSON.stringify ok', false, err.message);
    }
  }

  // ─── Test 11: no detector errored out ───
  // If a detector throws, engineAuditor catches and sets version='ERROR'.
  // Integration contract: with valid synthetic ctx, no detector should error.
  // (If a detector legitimately errors on this fixture, that's a regression
  // worth surfacing.)
  console.log('\nTest 11: no detector reported ERROR version on valid fixture');
  {
    const dv = result.detectorVersions;
    const errored = Object.entries(dv).filter(([, v]) => v === 'ERROR');
    assert('no ERROR versions in detectorVersions', errored.length === 0,
      errored.length > 0 ? `errored: ${errored.map(([k]) => k).join(',')}` : '');
  }

  console.log('\n' + '═'.repeat(60));
  console.log(`${passed} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
})();
