#!/usr/bin/env node
/**
 * queryFamily.js — Quick family check for session boot.
 * Returns key fields for the Corliss family from Simulation_Ledger
 * AND recent canon mentions from bay-tribune + world-data.
 *
 * Usage: node scripts/queryFamily.js
 */

require('dotenv').config();
const sheets = require('../lib/sheets');
const https = require('https');

const FAMILY_POPIDS = [
  'POP-00005',  // Mags
  'POP-00594',  // Robert
  'POP-00595',  // Sarah
  'POP-00596',  // Michael
];

const FAMILY_NAMES = ['Mags Corliss', 'Robert Corliss', 'Sarah Corliss', 'Michael Corliss'];

function smSearch(q, tag) {
  return new Promise((resolve) => {
    const API_KEY = process.env.SUPERMEMORY_CC_API_KEY;
    if (!API_KEY) { resolve([]); return; }
    const payload = JSON.stringify({ q: q, containerTag: tag, limit: 3, searchMode: 'hybrid' });
    const options = {
      hostname: 'api.supermemory.ai', path: '/v4/search', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + API_KEY, 'Content-Length': Buffer.byteLength(payload) }
    };
    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data).results || []); }
        catch(e) { resolve([]); }
      });
    });
    req.on('error', () => resolve([]));
    req.write(payload);
    req.end();
  });
}

async function main() {
  // Run ledger query and all Supermemory searches in parallel
  const [sl, ...smResults] = await Promise.all([
    sheets.getSheetData('Simulation_Ledger'),
    ...FAMILY_NAMES.flatMap(name => [
      smSearch(name, 'bay-tribune'),
      smSearch(name, 'world-data')
    ])
  ]);

  const header = sl[0];
  const col = {};
  header.forEach((h, i) => { col[h.trim()] = i; });

  let smIdx = 0;
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

    // Supermemory mentions
    const nameIdx = FAMILY_NAMES.indexOf(name);
    if (nameIdx >= 0) {
      const tribune = smResults[nameIdx * 2] || [];
      const world = smResults[nameIdx * 2 + 1] || [];
      if (tribune.length > 0) {
        console.log(`  Canon (bay-tribune):`);
        tribune.slice(0, 2).forEach(r => {
          const mem = r.memory || r.content || '';
          if (mem) console.log(`    - ${mem.substring(0, 120)}`);
        });
      }
      if (world.length > 0) {
        console.log(`  World-data:`);
        world.slice(0, 2).forEach(r => {
          const mem = r.memory || r.content || '';
          if (mem) console.log(`    - ${mem.substring(0, 120)}`);
        });
      }
    }
    console.log('');
  }
}

main().catch(e => { console.error(e.message); process.exit(1); });
