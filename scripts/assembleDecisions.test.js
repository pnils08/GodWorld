/**
 * assembleDecisions.test.js — S246 ES-5 / G-R1.
 * Covers the trackerOwner-dispatch logic in pickPrimary (the RB-4 contract).
 * This logic CANNOT be exercised by C95 voice data (the trackerOwner field
 * landed in the agent RULES.md S246, after C95 voice-gen S239) — so it's
 * unit-tested with synthetic fixtures; live exercise is pending C96 voice-gen.
 *
 * Run: node scripts/assembleDecisions.test.js
 */

const { pickPrimary } = require('./assembleDecisions');

let passed = 0, failed = 0;
function assert(label, cond, detail) {
  if (cond) { console.log(`  ok   ${label}`); passed++; }
  else { console.error(`  FAIL ${label}${detail ? ': ' + detail : ''}`); failed++; }
}

// Build a group entry: {statement, voiceBasename}
function entry(basename, stmtId, opts = {}) {
  return {
    voiceBasename: basename,
    statement: {
      statementId: stmtId,
      trackerOwner: opts.trackerOwner,
      position: opts.position || '',
      trackerUpdates: opts.trackerUpdates || {},
    },
  };
}

console.log('Test 1: trackerOwner==init makes the owning agent primary (RB-4 contract)');
{
  // Mayor (priority 100) would normally win, but Webb (stabilization_fund) owns
  // INIT-001 via trackerOwner — owner drives the tracker write.
  const group = [
    entry('mayor', 'STMT-96-MAYOR-002'),                                  // no owner, high priority
    entry('stabilization_fund', 'STMT-96-STAB-001', { trackerOwner: 'INIT-001' }),
  ];
  const primary = pickPrimary(group, 'INIT-001');
  assert('owner (stabilization_fund) is primary, not Mayor',
    primary.voiceBasename === 'stabilization_fund', `got ${primary.voiceBasename}`);
}

console.log('\nTest 2: trackerOwner is case-insensitive + ignores non-matching owners');
{
  const group = [
    entry('health_center', 'STMT-96-HC-001', { trackerOwner: 'init-005' }),  // lowercase, matches INIT-005
    entry('mayor', 'STMT-96-MAYOR-003'),
    entry('oari', 'STMT-96-OARI-001', { trackerOwner: 'INIT-002' }),         // owns a DIFFERENT init
  ];
  const primary = pickPrimary(group, 'INIT-005');
  assert('lowercase init-005 owner matches + wins', primary.voiceBasename === 'health_center', `got ${primary.voiceBasename}`);
}

console.log('\nTest 3: no trackerOwner anywhere → falls back to priority (Mayor wins) — the C95 path');
{
  const group = [
    entry('stabilization_fund', 'STMT-95-STAB-001'),  // no owner field (C95 shape)
    entry('mayor', 'STMT-95-MAYOR-002'),              // no owner field
    entry('okoro', 'STMT-95-OKORO-001'),
  ];
  const primary = pickPrimary(group, 'INIT-001');
  assert('falls back to Mayor (priority 100) when no owner declared',
    primary.voiceBasename === 'mayor', `got ${primary.voiceBasename}`);
}

console.log('\nTest 4: INIT-007 (no owning agent) → priority fallback, no crash');
{
  // RB-4 handoff: INIT-007 Youth Apprenticeship has no owning project agent.
  const group = [
    entry('mayor', 'STMT-96-MAYOR-007'),
    entry('opp_faction', 'STMT-96-OPP-003', { position: 'YES vote' }),
  ];
  const primary = pickPrimary(group, 'INIT-007');
  assert('returns a primary (no owner to dispatch to)', primary != null);
  assert('Mayor wins on priority (no owner)', primary.voiceBasename === 'mayor', `got ${primary.voiceBasename}`);
}

console.log('\nTest 5: okoro trackerOwner="none" is NOT treated as owning any initiative');
{
  // okoro declares trackerOwner:"none" — commentary, never the tracker primary.
  const group = [
    entry('okoro', 'STMT-96-OKORO-001', { trackerOwner: 'none' }),
    entry('stabilization_fund', 'STMT-96-STAB-001', { trackerOwner: 'INIT-001' }),
  ];
  const primary = pickPrimary(group, 'INIT-001');
  assert('"none" does not match INIT-001; real owner wins',
    primary.voiceBasename === 'stabilization_fund', `got ${primary.voiceBasename}`);
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
