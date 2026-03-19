#!/usr/bin/env node
/**
 * queryFamily.js — Quick family check for session boot.
 * Returns key fields for the Corliss family from Simulation_Ledger.
 *
 * Usage: node scripts/queryFamily.js
 */

require('dotenv').config();
const sheets = require('../lib/sheets');

const FAMILY_POPIDS = [
  'POP-00005',  // Mags
  'POP-00594',  // Robert
  'POP-00595',  // Sarah
  'POP-00596',  // Michael
];

async function main() {
  const sl = await sheets.getSheetData('Simulation_Ledger');
  const header = sl[0];

  // Build column index from header
  const col = {};
  header.forEach((h, i) => { col[h.trim()] = i; });

  for (const row of sl) {
    if (!FAMILY_POPIDS.includes(row[0])) continue;

    const name = [row[col['First']], row[col['Middle ']], row[col['Last']]]
      .filter(Boolean).join(' ');

    console.log(`--- ${name} (${row[0]}) ---`);
    console.log(`  Role: ${row[col['RoleType']] || '—'}`);
    console.log(`  Status: ${row[col['Status']] || '—'}`);
    console.log(`  Neighborhood: ${row[col['Neighborhood']] || '—'}`);
    console.log(`  ClockMode: ${row[col['ClockMode']] || '—'}`);
    console.log(`  Tier: ${row[col['Tier']] || '—'}`);
    console.log(`  HouseholdId: ${row[col['HouseholdId']] || '—'}`);
    console.log(`  Income: ${row[col['Income']] ? '$' + Number(row[col['Income']]).toLocaleString() : '—'}`);
    console.log(`  CareerStage: ${row[col['CareerStage']] || '—'}`);
    console.log(`  Last Updated: ${row[col['Last Updated']] || '—'}`);

    // Last line of LifeHistory (most recent event)
    const lh = row[col['LifeHistory']] || '';
    const lines = lh.split('\n').filter(Boolean);
    const recent = lines.length > 1 ? lines[lines.length - 1] : '—';
    console.log(`  Latest: ${recent}`);
    console.log('');
  }
}

main().catch(e => { console.error(e.message); process.exit(1); });
