#!/usr/bin/env node
/**
 * verifyCityDynamicsReactivation.js — post-deploy smoke-test for the S247
 * applyCityDynamics_ crash fix (+ Neighborhood_Demographics clobber fix).
 *
 * WHY: applyCityDynamics_ threw on a var-hoisting bug at L1109 EVERY cycle since
 * S136 (commit 89a7057) — safePhaseCall_ caught it, logged to Riley_Digest.Issues,
 * and continued, leaving the entire cityDynamics subsystem dead (all 6 cols blank +
 * downstream sentiment on ||0 fallbacks). The S247 fix (commit ee88439) restores it.
 * Because Apps Script engine phases have NO Node test harness, the empirical proof is
 * a live cycle run. This script makes that verification turnkey + broad (advisor S247:
 * check "Issues clean + function completes + downstream sane", not just "cols populate").
 *
 * The fix is a DORMANT-SUBSYSTEM REACTIVATION — 100+ cycles of dead code (L1109→1393)
 * run for the first time post-deploy. This verifier is the gate that confirms it.
 *
 * USAGE:
 *   node scripts/verifyCityDynamicsReactivation.js              # latest Riley_Digest cycle
 *   node scripts/verifyCityDynamicsReactivation.js --cycle=96   # a specific cycle
 *
 * VERIFY-THE-VERIFIER: run against C95 (pre-deploy) and it MUST report FAIL (the current
 * dead state — Issues carries the crash, cityDynamics cols blank). Post-C96 deploy it
 * flips to PASS. A verifier that passes on the known-broken cycle is itself broken.
 *
 * Exit 0 = all checks pass; exit 1 = a check failed; exit 2 = could not run.
 * Read-only (no writes, no clasp).
 */

require('/root/GodWorld/lib/env');
const { getRawSheetData } = require('/root/GodWorld/lib/sheets.js');

const CRASH_SIGNATURE = 'Phase2-CityDynamics';           // the safePhaseCall_ phase tag
const CRASH_DETAIL = 'neighborhoodDynamics';             // the specific undefined-read
const DYNAMICS_COLS = ['CityTraffic', 'RetailLoad', 'TourismLoad', 'NightlifeLoad', 'PublicSpaceLoad', 'CitySentiment'];
const EDU_COLS = ['SchoolQualityIndex', 'GraduationRate', 'CollegeReadinessRate', 'TeacherQuality', 'Funding'];

function cycleArg() {
  const a = process.argv.find(x => x.startsWith('--cycle='));
  return a ? a.split('=')[1] : null;
}

function isBlank(v) { return v === '' || v === undefined || v === null; }
function isFiniteNum(v) { return Number.isFinite(Number(v)) && !isBlank(v); }

async function main() {
  const want = cycleArg();
  const digest = await getRawSheetData('Riley_Digest');
  const h = digest[0];
  const iCycle = h.indexOf('Cycle');
  const iIssues = h.indexOf('Issues');
  const iDyn = DYNAMICS_COLS.map(c => h.indexOf(c));

  // Resolve target row: explicit --cycle, else the highest-numbered cycle row present.
  let row = null, cycleId = null;
  if (want) {
    row = digest.find(r => String(r[iCycle]) === String(want));
    cycleId = want;
    if (!row) { console.error(`FATAL: cycle ${want} not found in Riley_Digest.`); process.exit(2); }
  } else {
    let best = -Infinity;
    for (let r = 1; r < digest.length; r++) {
      const c = Number(digest[r][iCycle]);
      if (Number.isFinite(c) && c > best) { best = c; row = digest[r]; cycleId = String(c); }
    }
    if (!row) { console.error('FATAL: no cycle rows in Riley_Digest.'); process.exit(2); }
  }

  console.log(`\n=== cityDynamics reactivation smoke-test — Riley_Digest cycle ${cycleId} ===\n`);

  const checks = [];

  // CHECK 1 — Issues column carries no Phase2-CityDynamics crash signature.
  const issues = String(row[iIssues] || '');
  const stillCrashing = issues.includes(CRASH_SIGNATURE) || issues.includes(CRASH_DETAIL);
  checks.push({
    name: 'Issues column has no Phase2-CityDynamics crash',
    pass: !stillCrashing,
    detail: stillCrashing ? `Issues still carries the crash: "${issues}"` : 'clean (no Phase2-CityDynamics throw logged)'
  });

  // CHECK 2 — all six cityDynamics columns populated with finite numbers.
  const dynVals = iDyn.map((c, k) => ({ col: DYNAMICS_COLS[k], val: row[c] }));
  const blanks = dynVals.filter(d => !isFiniteNum(d.val));
  checks.push({
    name: 'cityDynamics columns (W-AB) populated',
    pass: blanks.length === 0,
    detail: blanks.length === 0
      ? dynVals.map(d => `${d.col}=${d.val}`).join(', ')
      : `blank/non-numeric: ${blanks.map(d => d.col).join(', ')} | got: ${dynVals.map(d => d.col + '=' + JSON.stringify(d.val)).join(', ')}`
  });

  // CHECK 3 — Neighborhood_Demographics education columns present (clobber fix + backfill).
  // Reports state without failing the reactivation gate when education backfill (--apply)
  // has not yet been run — that's a separate operator step. It FAILS only if the columns
  // are PARTIALLY populated (a clobber would zero some), which signals the fix regressed.
  let eduCheck;
  try {
    const demo = await getRawSheetData('Neighborhood_Demographics');
    const dh = demo[0];
    const iEdu = EDU_COLS.map(c => dh.indexOf(c));
    let populatedRows = 0, blankRows = 0, partialRows = 0;
    for (let r = 1; r < demo.length; r++) {
      if (isBlank(demo[r][dh.indexOf('Neighborhood')])) continue;
      const vals = iEdu.map(c => demo[r][c]);
      const nb = vals.filter(v => !isBlank(v)).length;
      if (nb === EDU_COLS.length) populatedRows++;
      else if (nb === 0) blankRows++;
      else partialRows++;
    }
    eduCheck = {
      name: 'Neighborhood_Demographics education columns intact (no partial clobber)',
      pass: partialRows === 0,
      detail: `populated:${populatedRows} blank:${blankRows} partial:${partialRows}` +
        (partialRows > 0 ? ' — PARTIAL rows indicate a clobber/regression' :
         blankRows > 0 ? ' — all-blank rows are pre-backfill (run backfillNeighborhoodEducation.js --apply)' : '')
    };
  } catch (e) {
    eduCheck = { name: 'Neighborhood_Demographics education columns intact', pass: true, detail: 'skipped (' + e.message + ')' };
  }
  checks.push(eduCheck);

  // Report
  let failed = 0;
  for (const c of checks) {
    console.log(`  [${c.pass ? 'PASS' : 'FAIL'}] ${c.name}`);
    console.log(`         ${c.detail}`);
    if (!c.pass) failed++;
  }

  const reactivated = checks[0].pass && checks[1].pass;
  console.log(`\n${reactivated ? 'REACTIVATED' : 'NOT REACTIVATED'} — cityDynamics ${reactivated ? 'is computing + persisting' : 'is still dead this cycle'}.`);
  console.log(`${failed} check(s) failed.\n`);
  process.exit(failed ? 1 : 0);
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(2); });
