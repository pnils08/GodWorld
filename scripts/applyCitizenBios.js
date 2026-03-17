#!/usr/bin/env node
/**
 * applyCitizenBios.js — Add CitizenBio column (AT/46) + fix EconomicProfileKey
 *
 * Two operations:
 *   1. Add "CitizenBio" header at column AT (46) on Simulation_Ledger
 *   2. Write 1-2 sentence bios for 17 T2 citizens (condensed from batch canon build)
 *   3. Fix EconomicProfileKey for 6 civic officials
 *
 * Usage:
 *   node -r dotenv/config scripts/applyCitizenBios.js --dry-run
 *   node -r dotenv/config scripts/applyCitizenBios.js --apply
 */

const { getSheetData, updateRange, batchUpdate } = require('../lib/sheets');

// ── Bio data (condensed from batch T2 canon build) ─────────────────────────

const CITIZEN_BIOS = [
  {
    popId: 'POP-00001',
    bio: 'DH from Boston playing his farewell 2041 season. 436 career homers, six rings. Hit the home run that won the 2031 championship. Founded the Vinnie Keane West Oakland Baseball Academy in a rehabbed Mandela Parkway firehouse — free baseball at all levels.'
  },
  {
    popId: 'POP-00029',
    bio: 'Retired closer who spent his career in Oakland. Stays connected to the A\'s organization from Jack London. Keeps a quiet, private profile since retirement.'
  },
  {
    popId: 'POP-00034',
    bio: 'Mayor of Oakland during the dynasty era. Signed the OARI ordinance, pushed Stabilization Fund accountability, designated Temescal Health Center as priority. Frames tech-sector relationship as conditional — companies must commit to Oakland neighborhoods.'
  },
  {
    popId: 'POP-00035',
    bio: 'Chief of Staff to Mayor Santana. Operational gatekeeper for the Mayor\'s office during OARI implementation and Stabilization Fund accountability push. Stepped back from public spotlight briefly. Lives in Uptown.'
  },
  {
    popId: 'POP-00036',
    bio: 'Deputy Mayor of Oakland. Has not appeared publicly in several weeks due to a serious health condition. His absence has created a visible gap in city executive operations during a critical policy period.'
  },
  {
    popId: 'POP-00038',
    bio: 'Communications Director for the City of Oakland. Center of the city\'s messaging apparatus during OARI implementation and the Deputy Mayor\'s unexplained absence. Lives in Temescal, balances public duties with personal boundaries.'
  },
  {
    popId: 'POP-00040',
    bio: 'School principal in Rockridge. Locally embedded educator operating in direct proximity to several high-profile Oakland families including the Dillons. Steady civic presence in the neighborhood.'
  },
  {
    popId: 'POP-00042',
    bio: 'City Council President, District 4, Independent. Controls the floor schedule. Voted NO on OARI but later signaled data-contingent openness. Calendared the Fruitvale Transit Hub Phase II ($230M) for full council vote. Process-oriented, skeptical but movable.'
  },
  {
    popId: 'POP-00129',
    bio: 'Former A\'s player turned youth baseball coach in Chinatown. Part of the pattern of dynasty-era athletes investing in local youth development, paralleling Vinnie Keane\'s West Oakland Academy.'
  },
  {
    popId: 'POP-00508',
    bio: 'Retired MUBA Hall of Famer living in Piedmont Ave. One of three HOFers who settled in Oakland after their careers, reflecting the city\'s gravitational pull during the dynasty era.'
  },
  {
    popId: 'POP-00509',
    bio: 'Retired MUBA Hall of Famer living in Rockridge. One of three HOFers in Oakland post-career. Shares the neighborhood with the Dillon family and fellow HOFer Billy.'
  },
  {
    popId: 'POP-00510',
    bio: 'Retired MUBA Hall of Famer living in Rockridge. Third of three HOFers residing in Oakland — the concentration itself is a dynasty-era artifact.'
  },
  {
    popId: 'POP-00555',
    bio: 'Athletic training specialist in Jack London. Part of the support infrastructure surrounding Oakland\'s professional sports ecosystem. Not the same person as Mariano Rosales, the A\'s closer.'
  },
  {
    popId: 'POP-00589',
    bio: 'Former baseball manager living in Temescal. Post-career presence in a neighborhood with significant civic activity including the Temescal Community Health Center.'
  },
  {
    popId: 'POP-00598',
    bio: 'Right fielder living in Fruitvale. Active player in GAME mode. Neighborhood adjacent to the Fruitvale Transit Hub Phase II project.'
  },
  {
    popId: 'POP-00599',
    bio: 'Catcher living in Chinatown. Active player in GAME mode. Shares the neighborhood with youth baseball coach Dalton.'
  },
  {
    popId: 'POP-00742',
    bio: 'High school science teacher with a marine biology background. Married to Benji Dillon (five-time Cy Young). Maintains her own professional identity in education while being married to one of Oakland\'s most prominent athletes. Lives in Rockridge.'
  }
];

// ── EconomicProfileKey fixes ───────────────────────────────────────────────

const EPK_FIXES = [
  { popId: 'POP-00034', field: 'EconomicProfileKey', value: 'Mayor' },
  { popId: 'POP-00035', field: 'EconomicProfileKey', value: 'Chief of Staff' },
  { popId: 'POP-00036', field: 'EconomicProfileKey', value: 'Deputy Mayor' },
  { popId: 'POP-00038', field: 'EconomicProfileKey', value: 'Communications Director' },
  { popId: 'POP-00040', field: 'EconomicProfileKey', value: 'School Principal' },
  { popId: 'POP-00042', field: 'EconomicProfileKey', value: 'City Council President' }
];

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const dryRun = !process.argv.includes('--apply');

  if (dryRun) {
    console.log('DRY RUN — no changes will be made. Use --apply to write.\n');
  } else {
    console.log('APPLY MODE — will modify Simulation_Ledger.\n');
  }

  // 1. Read ledger
  console.log('Reading Simulation_Ledger...');
  const data = await getSheetData('Simulation_Ledger');
  const headers = data[0];
  const rows = data.slice(1);
  console.log(`  ${rows.length} citizens, ${headers.length} columns`);

  const popIdCol = headers.indexOf('POPID');
  const epkCol = headers.indexOf('EconomicProfileKey');
  const bioCol = 45; // AT (0-indexed) — new column

  if (popIdCol === -1) {
    console.error('Cannot find POPID column. Aborting.');
    process.exit(1);
  }
  if (epkCol === -1) {
    console.error('Cannot find EconomicProfileKey column. Aborting.');
    process.exit(1);
  }

  // Build POPID → row number lookup (1-indexed for sheet)
  const popIdToRow = {};
  for (let i = 0; i < rows.length; i++) {
    const pid = String(rows[i][popIdCol] || '').trim();
    if (pid) popIdToRow[pid] = i + 2; // +2 for header + 0-index
  }

  // 2. Validate all POPIDs exist
  console.log('\nValidating POPIDs...');
  let allFound = true;

  for (const bio of CITIZEN_BIOS) {
    const row = popIdToRow[bio.popId];
    if (!row) {
      console.log(`  MISSING: ${bio.popId}`);
      allFound = false;
    }
  }
  for (const fix of EPK_FIXES) {
    const row = popIdToRow[fix.popId];
    if (!row) {
      console.log(`  MISSING: ${fix.popId}`);
      allFound = false;
    } else {
      const currentEPK = rows[row - 2][epkCol] || '(empty)';
      console.log(`  ${fix.popId}: EPK "${currentEPK}" → "${fix.value}"`);
    }
  }

  if (!allFound) {
    console.error('\nSome POPIDs not found. Aborting.');
    process.exit(1);
  }
  console.log('  All POPIDs found.\n');

  // 3. Report planned changes
  console.log('=== PLANNED CHANGES ===\n');

  console.log('A. Add CitizenBio column header at AT (col 46):');
  console.log('   Simulation_Ledger!AT1 = "CitizenBio"\n');

  console.log(`B. Write ${CITIZEN_BIOS.length} citizen bios:`);
  for (const bio of CITIZEN_BIOS) {
    const row = popIdToRow[bio.popId];
    const name = `${rows[row - 2][1]} ${rows[row - 2][3]}`.trim();
    console.log(`   Row ${row}: ${bio.popId} (${name}) — ${bio.bio.length} chars`);
  }

  console.log(`\nC. Fix ${EPK_FIXES.length} EconomicProfileKey values:`);
  for (const fix of EPK_FIXES) {
    const row = popIdToRow[fix.popId];
    const name = `${rows[row - 2][1]} ${rows[row - 2][3]}`.trim();
    const current = rows[row - 2][epkCol] || '(empty)';
    console.log(`   Row ${row}: ${fix.popId} (${name}) — "${current}" → "${fix.value}"`);
  }

  console.log(`\nTotal writes: 1 header + ${CITIZEN_BIOS.length} bios + ${EPK_FIXES.length} EPK fixes = ${1 + CITIZEN_BIOS.length + EPK_FIXES.length} cells`);

  if (dryRun) {
    console.log('\nDRY RUN complete. Run with --apply to write changes.');
    return;
  }

  // 4. Apply changes
  console.log('\nApplying changes...');

  const updates = [];

  // 4a. Add header
  updates.push({
    range: 'Simulation_Ledger!AT1',
    values: [['CitizenBio']]
  });

  // 4b. Write bios
  for (const bio of CITIZEN_BIOS) {
    const row = popIdToRow[bio.popId];
    updates.push({
      range: `Simulation_Ledger!AT${row}`,
      values: [[bio.bio]]
    });
  }

  // 4c. Fix EconomicProfileKey
  // EPK is at column AR+1 = AS... let me compute the letter
  const epkLetter = epkCol < 26
    ? String.fromCharCode(65 + epkCol)
    : 'A' + String.fromCharCode(65 + epkCol - 26);

  for (const fix of EPK_FIXES) {
    const row = popIdToRow[fix.popId];
    updates.push({
      range: `Simulation_Ledger!${epkLetter}${row}`,
      values: [[fix.value]]
    });
  }

  await batchUpdate(updates);

  console.log(`  Written: 1 header + ${CITIZEN_BIOS.length} bios + ${EPK_FIXES.length} EPK fixes`);
  console.log('\nDone. CitizenBio column added and populated. EconomicProfileKey corrected.');
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
