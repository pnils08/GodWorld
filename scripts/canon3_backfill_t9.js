#!/usr/bin/env node
/**
 * canon3_backfill_t9.js — T9 canon.3 one-shot data backfill
 *
 * Performs two operations against Simulation_Ledger:
 *
 *   A) UPDATE existing squatter rows so they align with bay-tribune canon.
 *      POP-00952 + POP-00953 were ingestPublishedEntities.js output from E94
 *      /post-publish (CreatedAt 2026-05-16T15:56:00.427Z, same batch as
 *      POP-00954/955/956/957 — all six are the E94 NEW citizens). The ingest
 *      filled defaults for RoleType / Neighborhood / Gender that contradict
 *      the published bay-tribune narrative. Mike S232 ruling: align them
 *      with media canon.
 *
 *   B) APPEND 16 new rows for bay-tribune-only citizens the T8 audit surfaced
 *      as missing from Simulation_Ledger. 14 are sourced from Generic_Citizens
 *      (the pre-Sim_Ledger generation pool we used to surface from — those
 *      citizens got referenced in editions but never migrated). 2 are
 *      synthesized from explicit edition NEW CANON FIGURES / letter bylines.
 *
 * Skipped (out of scope):
 *   - Raymond Polk + Paulette Okafor: both Bridgeport (Chicago context — Bulls
 *     coverage / Mike Paulson hometown). S229 froze Chicago_Citizens. Adding
 *     to Sim_Ledger contradicts geographic scope.
 *   - Other 4 squatters (POP-00954 Rev. Han / POP-00955 Keisha Morris /
 *     POP-00956 Miguel Santos / POP-00957 David Okonkwo): same problem class
 *     as Roberto/Carmen but Mike's S232 ruling was specific to Roberto+Carmen;
 *     I am not widening unilaterally. Flagged as follow-up.
 *
 * Row shape: mirrors POP-00952's filled-column pattern (basic identity + Tier 4
 * + Status pending + ClockMode ENGINE + BirthYear + Neighborhood + RoleType).
 * Career / finance / household fields left empty — those would be fabrication.
 *
 * Usage:
 *   node scripts/canon3_backfill_t9.js                # dry-run preview
 *   node scripts/canon3_backfill_t9.js --apply        # execute writes
 *   node scripts/canon3_backfill_t9.js --apply --skip-updates    # appends only
 *   node scripts/canon3_backfill_t9.js --apply --skip-appends    # updates only
 *
 * Reversibility: appends → delete the rows by POPID. Updates → re-update with
 * the prior values (pre-write values logged in dry-run output for the record).
 *
 * Per plan: docs/plans/2026-05-24-canon-3-cross-layer-citizen-drift.md §Task 9.
 */

'use strict';

require('/root/GodWorld/lib/env');

const sheets = require('../lib/sheets');

const APPLY = process.argv.includes('--apply');
const SKIP_UPDATES = process.argv.includes('--skip-updates');
const SKIP_APPENDS = process.argv.includes('--skip-appends');

// Updates — squatter alignment to bay-tribune E94 canon.
// Field name → new value. Existing fields not in this map are preserved.
const UPDATES = [
  {
    popid: 'POP-00952',
    name: 'Roberto Iglesias',
    rationale: 'E94 canon: "Fruitvale taquería owner... eleven years... Transit Hub Oversight Committee". Squatter ingest had Theater Director / KONO.',
    fields: {
      RoleType: 'Restaurant Owner',
      Neighborhood: 'Fruitvale'
    }
  },
  {
    popid: 'POP-00953',
    name: 'Carmen Solis',
    rationale: 'E94 canon: "Mam-language community advocate, Fruitvale" (she/her). Squatter ingest had Physical Therapist / Piedmont Ave / male.',
    fields: {
      RoleType: 'Community Advocate',
      Neighborhood: 'Fruitvale',
      Gender: 'female'
    }
  }
];

// Appends — bay-tribune-only citizens missing from Sim_Ledger.
// POPIDs assigned sequentially POP-00958 → POP-00973 (verified max pre-write).
// BirthYear computed as 2041 - age per Age-2041-anchor convention.
const APPENDS = [
  // ─────── Generic_Citizens-sourced (14) ───────
  { popid: 'POP-00958', first: 'Rafael',    last: 'Phillips', birthYear: 2015, neighborhood: 'Fruitvale',    roleType: 'Server',                source: 'GC + E86 NAMES INDEX (Fruitvale, Server, 26)' },
  { popid: 'POP-00959', first: 'Dante',     last: 'Nelson',   birthYear: 2000, neighborhood: 'Downtown',     roleType: 'Security Guard',        source: 'Generic_Citizens (Downtown, Security guard, 41)' },
  { popid: 'POP-00960', first: 'Jalen',     last: 'Hill',     birthYear: 2006, neighborhood: 'Jack London',  roleType: 'Line Cook',             source: 'Generic_Citizens (Jack London, Line cook, 35)' },
  { popid: 'POP-00961', first: 'Darius',    last: 'Clark',    birthYear: 2001, neighborhood: 'West Oakland', roleType: 'Bakery Worker',         source: 'Generic_Citizens (West Oakland, Bakery worker, 40)' },
  { popid: 'POP-00962', first: 'Marcus',    last: 'Walker',   birthYear: 1993, neighborhood: 'Jack London',  roleType: 'Dishwasher',            source: 'Generic_Citizens (Jack London, Dishwasher, 48)' },
  { popid: 'POP-00963', first: 'Jose',      last: 'Wright',   birthYear: 2015, neighborhood: 'Temescal',     roleType: 'Electrician',           source: 'Generic_Citizens (Temescal, Electrician, 26)' },
  { popid: 'POP-00964', first: 'Owen',      last: 'Campbell', birthYear: 2001, neighborhood: 'Jack London',  roleType: 'Bakery Worker',         source: 'GC disambig: E79 snippet "Jack London, bakery worker, 40"' },
  { popid: 'POP-00965', first: 'Bruce',     last: 'Wright',   birthYear: 1993, neighborhood: 'Downtown',     roleType: 'Line Cook',             source: 'Generic_Citizens (Downtown, Line cook, 48)' },
  { popid: 'POP-00966', first: 'Marco',     last: 'Johnson',  birthYear: 2008, neighborhood: 'Adams Point',  roleType: 'Nurse Aide',            source: 'Generic_Citizens (Adams Point, Nurse aide, 33)' },
  { popid: 'POP-00967', first: 'Marco',     last: 'Lopez',    birthYear: 2001, neighborhood: 'Laurel',       roleType: 'Mechanic',              source: 'Generic_Citizens (Laurel, Mechanic, 40)' },
  { popid: 'POP-00968', first: 'Jose',      last: 'Johnson',  birthYear: 1979, neighborhood: 'Temescal',     roleType: 'Warehouse Worker',      source: 'GC disambig: E80 snippet "sixty-two-year-old warehouse worker"' },
  { popid: 'POP-00969', first: 'Elijah',    last: 'Campbell', birthYear: 1985, neighborhood: 'Adams Point',  roleType: 'Taxi Driver',           source: 'Generic_Citizens (Adams Point, Taxi driver, 56)' },
  { popid: 'POP-00970', first: 'Guadalupe', last: 'Lee',      birthYear: 2022, neighborhood: 'Uptown',       roleType: 'Bartender',             source: 'Generic_Citizens (Uptown, Bartender, ~19)' },
  { popid: 'POP-00971', first: 'Shawn',     last: 'Nguyen',   birthYear: 1998, neighborhood: 'Fruitvale',    roleType: 'Construction Laborer',  source: 'Generic_Citizens (Fruitvale, Construction laborer, 43)' },
  // ─────── Edition-canon-synthesized (2) ───────
  { popid: 'POP-00972', first: 'Elena',     last: 'Reyes',    birthYear: 1989, neighborhood: 'Downtown',     roleType: 'Waterfront Resident',   source: 'E82 NEW CANON FIGURES: "Elena Reyes (52, Downtown, waterfront resident)"' },
  { popid: 'POP-00973', first: 'Delia',     last: 'Fuentes',  birthYear: 1997, neighborhood: 'Fruitvale',    roleType: 'Letter Writer',         source: 'E86 letter byline: "Delia Fuentes, 44, Fruitvale"' }
];

// Column index map — matches the live Simulation_Ledger header order (47 cols).
// Source: lib/sheets getSheetData("Simulation_Ledger")[0] inspected S232.
const HEADERS = [
  'POPID', 'First', 'Middle ', 'Last', 'OriginGame',
  'UNI (y/n)', 'MED (y/n)', 'CIV (y/n)', 'ClockMode', 'Tier',
  'RoleType', 'Status', 'BirthYear', 'OrginCity', 'LifeHistory',
  'CreatedAt', 'LastUpdated', 'TraitProfile', 'UsageCount', 'Neighborhood',
  'HouseholdId', 'MaritalStatus', 'NumChildren', 'ParentIds', 'ChildrenIds',
  'WealthLevel', 'Income', 'InheritanceReceived', 'NetWorth', 'SavingsRate',
  'DebtLevel', 'EducationLevel', 'SchoolQuality', 'CareerStage', 'YearsInCareer',
  'CareerMobility', 'LastPromotionCycle', 'DisplacementRisk', 'MigrationIntent', 'MigrationReason',
  'MigrationDestination', 'MigratedCycle', 'ReturnedCycle', 'EconomicProfileKey', 'EmployerBizId',
  'CitizenBio', 'Gender'
];

function buildAppendRow(spec) {
  const row = new Array(HEADERS.length).fill('');
  row[0] = spec.popid;
  row[1] = spec.first;
  row[3] = spec.last;
  row[5] = 'no';                // UNI
  row[6] = 'no';                // MED
  row[7] = 'no';                // CIV
  row[8] = 'ENGINE';            // ClockMode
  row[9] = '4';                 // Tier
  row[10] = spec.roleType;
  row[11] = 'pending';          // Status
  row[12] = String(spec.birthYear);
  row[15] = new Date().toISOString();   // CreatedAt
  row[19] = spec.neighborhood;
  // Gender, MaritalStatus, NumChildren, finance, career, education — left empty.
  // ingestPublishedEntities.js sparseness is preserved here intentionally;
  // those fields are operator-fillable later if/when narrative supplies signal.
  return row;
}

async function locateRowByPopid(rows, popid) {
  for (let i = 1; i < rows.length; i++) {
    if ((rows[i][0] || '').trim() === popid) {
      return { idx: i, row: rows[i], sheetRowNumber: i + 1 }; // sheets are 1-based with header at row 1
    }
  }
  return null;
}

async function previewUpdate(rows, u) {
  const located = await locateRowByPopid(rows, u.popid);
  if (!located) {
    console.log('  ✗ ' + u.popid + ' ' + u.name + ' — NOT FOUND in Sim_Ledger');
    return null;
  }
  console.log('  ✓ ' + u.popid + ' ' + u.name + ' — sheet row ' + located.sheetRowNumber);
  console.log('    rationale: ' + u.rationale);
  for (const [field, newVal] of Object.entries(u.fields)) {
    const colIdx = HEADERS.indexOf(field);
    if (colIdx < 0) {
      console.log('    ✗ field "' + field + '" NOT FOUND in headers — skipping');
      continue;
    }
    const prevVal = located.row[colIdx] || '<empty>';
    console.log('    ' + field + ': "' + prevVal + '" → "' + newVal + '"');
  }
  return located;
}

async function applyUpdate(u, located) {
  await sheets.updateRowFields('Simulation_Ledger', located.sheetRowNumber, u.fields);
  console.log('  ✓ wrote ' + u.popid + ' ' + u.name);
}

async function main() {
  console.log('[canon3_backfill_t9] reading Simulation_Ledger…');
  const rows = await sheets.getSheetData('Simulation_Ledger');
  console.log('[canon3_backfill_t9] current rows: ' + (rows.length - 1));

  // Verify max POPID matches expectation
  let maxPop = 0;
  for (let i = 1; i < rows.length; i++) {
    const m = (rows[i][0] || '').match(/^POP-(\d+)/);
    if (m) maxPop = Math.max(maxPop, parseInt(m[1], 10));
  }
  console.log('[canon3_backfill_t9] current max POPID: POP-' + String(maxPop).padStart(5, '0'));
  if (maxPop >= 958) {
    console.error('[canon3_backfill_t9] WARNING: max POPID is POP-' + String(maxPop).padStart(5, '0') +
      ', which collides with proposed append range POP-00958..POP-00973. Aborting.');
    process.exit(1);
  }

  // ─────── UPDATES ───────
  if (!SKIP_UPDATES) {
    console.log('\n[A] UPDATES — squatter alignment (' + UPDATES.length + ' rows):');
    for (const u of UPDATES) {
      const located = await previewUpdate(rows, u);
      if (APPLY && located) {
        await applyUpdate(u, located);
      }
    }
  } else {
    console.log('\n[A] UPDATES — skipped (--skip-updates)');
  }

  // ─────── APPENDS ───────
  if (!SKIP_APPENDS) {
    console.log('\n[B] APPENDS — bay-tribune-only citizen backfill (' + APPENDS.length + ' rows):');
    for (const a of APPENDS) {
      console.log('  ' + a.popid + ' | ' + a.first + ' ' + a.last + ' | ' +
        a.neighborhood + ' | ' + a.roleType + ' | BY=' + a.birthYear);
      console.log('    source: ' + a.source);
    }
    if (APPLY) {
      const rowsToAppend = APPENDS.map(buildAppendRow);
      console.log('\n[canon3_backfill_t9] appending ' + rowsToAppend.length + ' rows to Simulation_Ledger…');
      await sheets.appendRows('Simulation_Ledger', rowsToAppend);
      console.log('[canon3_backfill_t9] ✓ ' + rowsToAppend.length + ' rows appended');
    }
  } else {
    console.log('\n[B] APPENDS — skipped (--skip-appends)');
  }

  console.log('');
  if (APPLY) {
    console.log('[canon3_backfill_t9] DONE.');
  } else {
    console.log('[canon3_backfill_t9] DRY RUN — pass --apply to execute.');
  }
}

if (require.main === module) {
  main().catch(function (e) { console.error('[FATAL]', e); process.exit(1); });
}

module.exports = { UPDATES: UPDATES, APPENDS: APPENDS, buildAppendRow: buildAppendRow };
