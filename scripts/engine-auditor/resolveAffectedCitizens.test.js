/**
 * resolveAffectedCitizens.test.js — covers the G-ER3 token→neighborhood fix
 * (S244 ES-3). Repeating-event patterns carry their signal in evidence tokens,
 * not affectedEntities.neighborhoods, so "kono" (the canonical KONO neighborhood)
 * shipped with neighborhoods:[] → no residents resolved → filler brief. The fix
 * promotes neighborhood-named tokens into affectedEntities.neighborhoods so the
 * citizen resolver fills residents. Error-fragment clusters stay city-level.
 *
 * Run: node scripts/engine-auditor/resolveAffectedCitizens.test.js
 * Exits 0 on pass, 1 on failure.
 */

const { enrich } = require('./resolveAffectedCitizens');

let passed = 0;
let failed = 0;
function assert(label, cond, detail) {
  if (cond) { console.log(`  ok   ${label}`); passed++; }
  else { console.error(`  FAIL ${label}${detail ? ': ' + detail : ''}`); failed++; }
}

// ctx mirrors the live shape: Neighborhood_Map has KONO; the ledger has KONO
// residents (incl. a Tier-1) plus a Downtown resident.
function makeCtx() {
  return {
    snapshot: {
      Neighborhood_Map: [
        { Neighborhood: 'KONO' },
        { Neighborhood: 'Downtown' },
        { Neighborhood: 'Temescal' },
      ],
      Simulation_Ledger: [
        { First: 'Michael', Last: 'Corliss', POPID: 'POP-00010', Neighborhood: 'KONO', Tier: '1', Status: 'Active', UsageCount: '' },
        { First: 'Sahana', Last: 'Joshi', POPID: 'POP-00200', Neighborhood: 'KONO', Tier: '4', Status: 'Active', UsageCount: '0' },
        { First: 'Amal', Last: 'Nair', POPID: 'POP-00201', Neighborhood: 'KONO', Tier: '4', Status: 'Active', UsageCount: '0' },
        { First: 'Dee', Last: 'Bevan', POPID: 'POP-00300', Neighborhood: 'Downtown', Tier: '2', Status: 'Active', UsageCount: '5' },
      ],
    },
  };
}

console.log('Test 1: G-ER3 — "kono" token scopes the pattern to KONO + resolves residents');
{
  const pattern = {
    type: 'repeating-event',
    severity: 'high',
    description: 'Issue "kono" recurred 3 cycles',
    affectedEntities: { citizens: [], neighborhoods: [], initiatives: [], councilSeats: [] },
    evidence: { fields: { recurringIssue: 'kono', recurringTokens: ['kono'], cyclesRecurring: 3 } },
  };
  enrich([pattern], makeCtx());
  assert('neighborhoods scoped to KONO', JSON.stringify(pattern.affectedEntities.neighborhoods) === '["KONO"]', JSON.stringify(pattern.affectedEntities.neighborhoods));
  assert('citizens resolved (non-empty)', pattern.affectedEntities.citizens.length > 0, JSON.stringify(pattern.affectedEntities.citizens));
  assert('Tier-1 resident ranks first', /Michael Corliss/.test(pattern.affectedEntities.citizens[0] || ''), pattern.affectedEntities.citizens[0]);
}

console.log('\nTest 2: G-ER3 — "strain" error-fragment cluster stays city-level (no false match)');
{
  const pattern = {
    type: 'repeating-event',
    severity: 'high',
    description: 'Issue "strain" (+ 12 co-occurring tokens) recurred 4 cycles',
    affectedEntities: { citizens: [], neighborhoods: [], initiatives: [], councilSeats: [] },
    evidence: { fields: { recurringIssue: 'strain', recurringTokens: ['strain', 'trend', 'phase2', 'cannot', 'read', 'properties', 'undefined', 'reading', 'civic', 'inflow', 'high'], cyclesRecurring: 4 } },
  };
  enrich([pattern], makeCtx());
  assert('neighborhoods stays empty', pattern.affectedEntities.neighborhoods.length === 0, JSON.stringify(pattern.affectedEntities.neighborhoods));
  assert('citizens stays empty', pattern.affectedEntities.citizens.length === 0);
}

console.log('\nTest 3: control — pattern with neighborhoods already set is not overwritten');
{
  const pattern = {
    type: 'math-imbalance',
    severity: 'low',
    description: 'Downtown decay',
    affectedEntities: { citizens: [], neighborhoods: ['Downtown'], initiatives: [], councilSeats: [] },
    evidence: { fields: {} },
  };
  enrich([pattern], makeCtx());
  assert('neighborhoods unchanged', JSON.stringify(pattern.affectedEntities.neighborhoods) === '["Downtown"]');
  assert('Downtown resident resolved', /Dee Bevan/.test(JSON.stringify(pattern.affectedEntities.citizens)));
}

console.log('\nTest 4: control — token matching is case-insensitive ("KONO" / "Kono")');
{
  const pattern = {
    type: 'repeating-event',
    severity: 'medium',
    description: 'Issue "Kono" recurred',
    affectedEntities: { citizens: [], neighborhoods: [], initiatives: [], councilSeats: [] },
    evidence: { fields: { recurringIssue: 'Kono', recurringTokens: ['Kono'] } },
  };
  enrich([pattern], makeCtx());
  assert('case-insensitive token resolves to canonical KONO', JSON.stringify(pattern.affectedEntities.neighborhoods) === '["KONO"]', JSON.stringify(pattern.affectedEntities.neighborhoods));
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
process.exit(0);
