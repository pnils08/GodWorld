/**
 * ============================================================================
 * PHASE 5 SHEET HEADER AUDIT (Session 44)
 * ============================================================================
 *
 * Checks that columns referenced by indexOf() header lookups in Phase 5/6
 * citizen engines actually exist in the target sheets.
 *
 * Unlike Phase 10 writers (positional append), Phase 5 engines use
 * headers.indexOf('ColumnName') to find columns dynamically. A missing
 * header returns -1, causing silent data loss or skipped logic.
 *
 * Usage:
 *   node scripts/auditPhase5Headers.js
 *
 * ============================================================================
 */

const sheets = require('../lib/sheets');

// ════════════════════════════════════════════════════════════════════════════
// EXPECTED COLUMNS PER SHEET (from indexOf() calls in the codebase)
// ════════════════════════════════════════════════════════════════════════════

const SHEET_COLUMNS = {
  'Simulation_Ledger': {
    readers: [
      'citizenContextBuilder.js',
      'householdFormationEngine.js',
      'processIntakeV3.js',
      'bondEngine.js'
    ],
    required: [
      'POPID', 'First', 'Last', 'Tier', 'RoleType', 'Status',
      'BirthYear', 'Neighborhood', 'HouseholdId', 'MaritalStatus',
      'NumChildren', 'ParentIds', 'ChildrenIds', 'Income'
    ],
    // citizenContextBuilder checks both 'Middle ' and 'Middle', 'OrginCity' and 'OriginCity'
    alternates: {
      'Middle': ['Middle ', 'Middle'],
      'OriginCity': ['OrginCity', 'OriginCity']
    }
  },

  'Generic_Citizens': {
    readers: ['citizenContextBuilder.js'],
    required: [
      'First', 'Last', 'Age', 'BirthYear', 'Neighborhood',
      'Occupation', 'EmergenceCount', 'Status'
    ]
  },

  'Household_Ledger': {
    readers: ['householdFormationEngine.js'],
    required: [
      'HouseholdId', 'HeadOfHousehold', 'HouseholdType', 'Members',
      'Neighborhood', 'HousingType', 'MonthlyRent', 'HousingCost',
      'HouseholdIncome', 'FormedCycle', 'Status', 'DissolvedCycle'
    ]
  },

  'Civic_Office_Ledger': {
    readers: ['updateCivicLedgerFactions.js', 'civicInitiativeEngine.js'],
    required: [
      'OfficeId', 'Title', 'Type', 'Holder', 'PopId',
      'Faction', 'VotingPower'
    ]
  },

  'Initiative_Tracker': {
    readers: ['civicInitiativeEngine.js'],
    required: ['SwingVoter'],
    // SwingVoter2 is optional — code checks if header exists
    optional: ['SwingVoter2']
  },

  'Relationship_Bonds': {
    readers: ['citizenContextBuilder.js', 'bondPersistence.js'],
    required: [
      'CitizenA', 'CitizenB', 'BondType', 'Intensity',
      'Status', 'CycleCreated', 'Neighborhood'
    ],
    // bondEngine checks these exist but handles absence gracefully
    optional: ['UNI', 'MED', 'CIV', 'NH']
  },

  'LifeHistory_Log': {
    readers: ['citizenContextBuilder.js'],
    required: [
      'POPID', 'Timestamp'
    ],
    // citizenContextBuilder now checks both old and new names
    alternates: {
      'Cycle': ['Cycle', 'EngineCycle'],
      'EventTag': ['EventTag', 'EventType'],
      'EventText': ['EventText', 'Description']
    },
    optional: ['Source']  // column doesn't exist, code handles -1 gracefully
  },

  'Citizen_Media_Usage': {
    readers: ['citizenContextBuilder.js'],
    required: ['Cycle', 'UsageType', 'Context', 'Reporter'],
    // citizenContextBuilder checks both 'CitizenName' and 'Name'
    alternates: {
      'CitizenName': ['CitizenName', 'Name']
    }
  },

  'Storyline_Tracker': {
    readers: ['updateStorylineStatusv1.2.js', 'storylineHealthEngine.js'],
    required: [
      'StorylineId', 'Description', 'Neighborhood',
      'LinkedArc', 'Status', 'LastMentionedCycle', 'Priority',
      'Title', 'LastCoverageCycle', 'MentionCount', 'CoverageGap',
      'ResolutionCondition', 'StaleAfterCycles', 'IsStale', 'WrapUpGenerated'
    ],
    // updateStorylineStatusv1.2.js uses findColByArray_ for these
    alternates: {
      'Type': ['StorylineType', 'Type']
    }
  },

  'Story_Hook_Deck': {
    readers: ['hookLifecycleEngine.js'],
    required: [
      'HookId', 'HookType', 'Priority', 'Severity',
      'CreatedCycle', 'HookAge', 'ExpiresAfter', 'IsExpired',
      'PickedUp', 'PickupCycle'
    ]
  },

  'World_Population': {
    readers: ['finalizeWorldPopulation.js'],
    required: [],
    optional: ['season']  // code handles absence
  }
};


// ════════════════════════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║   Phase 5 Sheet Header Audit                                      ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝');
  console.log('');

  console.log('Connecting to Google Sheets...');
  const conn = await sheets.testConnection();
  console.log(`Connected: ${conn.title}\n`);

  const results = [];
  const sheetNames = Object.keys(SHEET_COLUMNS);

  for (const sheetName of sheetNames) {
    const spec = SHEET_COLUMNS[sheetName];

    let data;
    try {
      data = await sheets.getSheetData(sheetName);
    } catch (e) {
      results.push({
        sheet: sheetName,
        status: 'NOT_FOUND',
        readers: spec.readers,
        issues: ['Sheet does not exist']
      });
      continue;
    }

    if (!data || data.length === 0) {
      results.push({
        sheet: sheetName,
        status: 'EMPTY',
        readers: spec.readers,
        issues: ['Sheet is empty (no headers)']
      });
      continue;
    }

    const actual = data[0];
    const issues = [];
    const found = [];
    const missing = [];

    // Check required columns
    for (const col of spec.required) {
      if (actual.includes(col)) {
        found.push(col);
      } else {
        missing.push(col);
        issues.push(`MISSING: "${col}" — indexOf returns -1`);
      }
    }

    // Check alternate columns (where code checks multiple names)
    if (spec.alternates) {
      for (const [logical, variants] of Object.entries(spec.alternates)) {
        const hasAny = variants.some(v => actual.includes(v));
        if (hasAny) {
          const which = variants.find(v => actual.includes(v));
          found.push(`${logical} (as "${which}")`);
        } else {
          missing.push(logical);
          issues.push(`MISSING: "${logical}" — none of [${variants.join(', ')}] found`);
        }
      }
    }

    // Check optional columns (note but don't flag as error)
    const optionalStatus = [];
    if (spec.optional) {
      for (const col of spec.optional) {
        if (actual.includes(col)) {
          optionalStatus.push(`${col}: present`);
        } else {
          optionalStatus.push(`${col}: absent (handled gracefully)`);
        }
      }
    }

    results.push({
      sheet: sheetName,
      readers: spec.readers,
      totalCols: actual.length,
      rows: data.length - 1,
      requiredCount: spec.required.length + (spec.alternates ? Object.keys(spec.alternates).length : 0),
      foundCount: found.length,
      missingCount: missing.length,
      status: issues.length === 0 ? 'OK' : 'MISSING_COLUMNS',
      issues,
      found,
      missing,
      optionalStatus,
      allHeaders: actual
    });
  }

  // ──────────────────────────────────────────────────────────────────────
  // REPORT
  // ──────────────────────────────────────────────────────────────────────

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('RESULTS');
  console.log('═══════════════════════════════════════════════════════════════\n');

  let okCount = 0;
  let badCount = 0;

  for (const r of results) {
    const icon = r.status === 'OK' ? '✓' : r.status === 'NOT_FOUND' ? '?' : '✗';
    console.log(`${icon} ${r.sheet}`);
    console.log(`  Readers: ${r.readers.join(', ')}`);

    if (r.totalCols !== undefined) {
      console.log(`  Columns: ${r.totalCols} in sheet | ${r.requiredCount} required by code | ${r.foundCount} found | ${r.missingCount} missing`);
      console.log(`  Rows: ${r.rows}`);
    }

    if (r.optionalStatus && r.optionalStatus.length > 0) {
      for (const os of r.optionalStatus) {
        console.log(`  Optional: ${os}`);
      }
    }

    if (r.issues.length > 0) {
      badCount++;
      for (const issue of r.issues) {
        console.log(`  ⚠  ${issue}`);
      }
    } else {
      okCount++;
    }

    console.log('');
  }

  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`SUMMARY: ${okCount} OK, ${badCount} have missing columns, ${results.length} total`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  // If any missing, dump their full header rows for diagnosis
  if (badCount > 0) {
    console.log('─── HEADER DUMPS (misaligned sheets) ───\n');
    for (const r of results) {
      if (r.status === 'MISSING_COLUMNS' && r.allHeaders) {
        console.log(`${r.sheet}:`);
        r.allHeaders.forEach((h, i) => {
          console.log(`  Col ${i}: "${h}"`);
        });
        console.log('');
      }
    }
  }
}

main().catch(err => {
  console.error('ERROR:', err.message);
  process.exit(1);
});
