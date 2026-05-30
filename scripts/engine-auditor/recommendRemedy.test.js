/**
 * recommendRemedy.test.js — covers the G-ER4 coverage-gap fix (S244 ES-3).
 * A coverage-gap pattern (a domain producing events with zero Tribune coverage)
 * is a Tribune-side editorial gap, not a council/engine ailment. It used to
 * resolve to gap:no-mitigator → "propose a new initiative" + mayoral pressure.
 * The fix routes coverage-gap to an editorial-pickup remedy.
 *
 * Run: node scripts/engine-auditor/recommendRemedy.test.js
 * Exits 0 on pass, 1 on failure.
 */

const { enrich } = require('./recommendRemedy');

let passed = 0;
let failed = 0;
function assert(label, cond, detail) {
  if (cond) { console.log(`  ok   ${label}`); passed++; }
  else { console.error(`  FAIL ${label}${detail ? ': ' + detail : ''}`); failed++; }
}

console.log('Test 1: G-ER4 — coverage-gap routes to editorial-pickup, not council');
{
  // Real C95 shape: faith domain, 5 events, no coverage, gap:no-mitigator.
  const pattern = {
    type: 'coverage-gap',
    severity: 'medium',
    description: 'Domain "faith" produced 5 events this cycle with zero Tribune coverage last cycle',
    affectedEntities: { citizens: [], neighborhoods: [], initiatives: [], councilSeats: [] },
    evidence: { fields: { domain: 'faith', eventCount: 5, priorCycleCoverage: 0, routingHint: 'roundup-thread-acceptable' } },
    mitigatorState: { exists: false, mitigators: [], gap: 'no-mitigator', recommendedAction: 'propose new initiative', ailmentCategory: null },
  };
  enrich([pattern], { cycle: 95 });
  const ws = pattern.remedyPath.worldSide;
  assert('worldSide has one remedy', ws.length === 1, JSON.stringify(ws));
  assert('remedy type is editorial-pickup', ws[0].type === 'editorial-pickup', ws[0].type);
  assert('NOT propose-new-initiative', ws[0].type !== 'propose-new-initiative');
  assert('target is sift/desk, not council', /sift|desk/i.test(ws[0].target) && !/council/i.test(ws[0].target), ws[0].target);
  assert('action names the faith domain', /faith/.test(ws[0].action));
  assert('roundup hint → roundup/thread action', /roundup|thread/i.test(ws[0].action), ws[0].action);
  assert('no techSide trigger', pattern.remedyPath.techSide.triggered === false);
}

console.log('\nTest 2: G-ER4 — high-weight domain → dedicated piece');
{
  const pattern = {
    type: 'coverage-gap',
    severity: 'high',
    description: 'Domain "civic" produced 11 events this cycle with zero Tribune coverage',
    affectedEntities: { citizens: [], neighborhoods: [], initiatives: [], councilSeats: [] },
    evidence: { fields: { domain: 'civic', eventCount: 11, routingHint: 'dedicated-piece-warranted' } },
    mitigatorState: { exists: false, mitigators: [], gap: 'no-mitigator', ailmentCategory: null },
  };
  enrich([pattern], { cycle: 95 });
  const r = pattern.remedyPath.worldSide[0];
  assert('dedicated hint → dedicated brief action', /dedicated/i.test(r.action), r.action);
}

console.log('\nTest 3: control — a genuine no-mitigator ailment still gets council remedy');
{
  const pattern = {
    type: 'math-imbalance',
    severity: 'medium',
    description: 'Downtown decay with no mitigator',
    affectedEntities: { citizens: [], neighborhoods: ['Downtown'], initiatives: [], councilSeats: [] },
    evidence: { fields: {} },
    mitigatorState: { exists: false, mitigators: [], gap: 'no-mitigator', ailmentCategory: 'economic' },
  };
  enrich([pattern], { cycle: 95 });
  const ws = pattern.remedyPath.worldSide;
  assert('non-coverage-gap still uses gap-keyed templates', ws.every(r => r.type !== 'editorial-pickup'), JSON.stringify(ws.map(r => r.type)));
}

console.log('\nTest 4: control — not-applicable pattern still empty worldSide');
{
  const pattern = {
    type: 'improvement',
    severity: 'low',
    description: 'x',
    affectedEntities: { citizens: [], neighborhoods: [], initiatives: [], councilSeats: [] },
    evidence: { fields: {} },
    mitigatorState: { gap: 'not-applicable' },
  };
  enrich([pattern], { cycle: 95 });
  assert('not-applicable → empty worldSide', pattern.remedyPath.worldSide.length === 0);
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
process.exit(0);
