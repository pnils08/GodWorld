#!/usr/bin/env node
/**
 * canon3_followup_squatters.js — S232 canon.3 follow-up: align remaining
 * E94-ingest squatters (POP-00954/00955/00956/00957) to bay-tribune canon.
 *
 * Companion to canon3_backfill_t9.js which closed Roberto+Carmen (POP-00952
 * + POP-00953). Same problem class, same fix shape: ingestPublishedEntities.js
 * filled defaults that contradict the E94 published narrative.
 *
 * Per S232 Mike approval (follow-up surface from T9 commit body).
 *
 * E94 canon source — published edition .txt:
 *   POP-00954 Rev. Han       — pastor of the Adams Point Methodist church
 *                              (132-year-old church at Adams Point corner).
 *                              Age unstated; default holds.
 *   POP-00955 Keisha Morris  — "— Keisha Morris, 51, West Oakland, counselor"
 *   POP-00956 Miguel Santos  — "— Miguel Santos, 54, Fruitvale, restaurant owner"
 *   POP-00957 David Okonkwo  — "— David Okonkwo, 62, Lake Merritt, retired insurance adjuster"
 *
 * Usage:
 *   node scripts/canon3_followup_squatters.js                 # dry-run
 *   node scripts/canon3_followup_squatters.js --apply         # write
 *
 * Reversibility: re-run updateRowFields with prior values (logged in dry-run).
 */

'use strict';

require('/root/GodWorld/lib/env');

const sheets = require('../lib/sheets');

const APPLY = process.argv.includes('--apply');

const UPDATES = [
  {
    popid: 'POP-00954',
    name: 'Rev. Han',
    rationale: 'E94: "The Methodists have been at this corner in Adams Point for 132 years" — Rev. Han pastors that church. Was: Lake Merritt.',
    fields: {
      Neighborhood: 'Adams Point'
      // RoleType "Senior Pastor / Faith Leader" already correct.
      // Gender male already correct.
      // BirthYear unstated in canon — default holds.
    }
  },
  {
    popid: 'POP-00955',
    name: 'Keisha Morris',
    rationale: 'E94: "— Keisha Morris, 51, West Oakland, counselor". Was: Physical Therapist / Piedmont Ave / BY 2003.',
    fields: {
      RoleType: 'Counselor',
      Neighborhood: 'West Oakland',
      BirthYear: '1990'   // 2041 - 51
      // Gender female already correct.
    }
  },
  {
    popid: 'POP-00956',
    name: 'Miguel Santos',
    rationale: 'E94: "— Miguel Santos, 54, Fruitvale, restaurant owner" (male: "my customers", "my community"). Was: Homeless Outreach Worker / West Oakland / female / BY 2003.',
    fields: {
      RoleType: 'Restaurant Owner',
      Neighborhood: 'Fruitvale',
      BirthYear: '1987',  // 2041 - 54
      Gender: 'male'
    }
  },
  {
    popid: 'POP-00957',
    name: 'David Okonkwo',
    rationale: 'E94: "— David Okonkwo, 62, Lake Merritt, retired insurance adjuster". Was: Immigration Attorney / Fruitvale / BY 2003.',
    fields: {
      RoleType: 'Retired Insurance Adjuster',
      Neighborhood: 'Lake Merritt',
      BirthYear: '1979'  // 2041 - 62
      // Gender male already correct.
    }
  }
];

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

async function main() {
  console.log('[canon3_followup_squatters] reading Simulation_Ledger…');
  const rows = await sheets.getSheetData('Simulation_Ledger');
  console.log('[canon3_followup_squatters] row count: ' + (rows.length - 1));
  console.log('');

  for (const u of UPDATES) {
    let located = null;
    for (let i = 1; i < rows.length; i++) {
      if ((rows[i][0] || '').trim() === u.popid) {
        located = { idx: i, row: rows[i], sheetRowNumber: i + 1 };
        break;
      }
    }
    if (!located) {
      console.log('  ✗ ' + u.popid + ' ' + u.name + ' — NOT FOUND');
      continue;
    }
    console.log('  ✓ ' + u.popid + ' ' + u.name + ' — sheet row ' + located.sheetRowNumber);
    console.log('    rationale: ' + u.rationale);
    for (const [field, newVal] of Object.entries(u.fields)) {
      const colIdx = HEADERS.indexOf(field);
      const prevVal = colIdx >= 0 ? (located.row[colIdx] || '<empty>') : '<no col>';
      console.log('    ' + field + ': "' + prevVal + '" → "' + newVal + '"');
    }
    if (APPLY) {
      await sheets.updateRowFields('Simulation_Ledger', located.sheetRowNumber, u.fields);
      console.log('    ✓ written');
    }
  }

  console.log('');
  if (APPLY) console.log('[canon3_followup_squatters] DONE.');
  else console.log('[canon3_followup_squatters] DRY RUN — pass --apply to execute.');
}

if (require.main === module) {
  main().catch(function (e) { console.error('[FATAL]', e); process.exit(1); });
}

module.exports = { UPDATES: UPDATES };
