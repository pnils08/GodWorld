#!/usr/bin/env node
/**
 * auditSimulationLedger.js — Health snapshot of the live Simulation_Ledger.
 *
 * Read-only. Surfaces:
 *   - Headcount, POPID continuity (gaps), post-cutoff additions
 *   - Per-column completeness across all 47 columns
 *   - Tier × ClockMode matrix
 *   - Status enum drift, RoleType "Citizen" sentinel hits
 *   - BirthYear sanity (2041 anchor: age = 2041 − BirthYear, expect 0–100)
 *   - Narrative-column population (LifeHistory / TraitProfile / CitizenBio)
 *
 * Usage:
 *   node scripts/auditSimulationLedger.js              # default: brief
 *   node scripts/auditSimulationLedger.js --json       # full structured output for ingestion
 *   node scripts/auditSimulationLedger.js --since=789  # report POPIDs >= POP-00789 separately
 */

require('../lib/env');
const { google } = require('googleapis');
const path = require('path');

const SHEET = 'Simulation_Ledger';

async function getClient() {
  const auth = new google.auth.GoogleAuth({
    keyFile: path.resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS || '/root/.config/godworld/credentials/service-account.json'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
  return google.sheets({ version: 'v4', auth });
}

function parsePopId(v) {
  const m = String(v || '').match(/POP-0*(\d+)/);
  return m ? Number(m[1]) : null;
}

async function main() {
  const argv = process.argv.slice(2);
  const wantJson = argv.includes('--json');
  const sinceArg = argv.find(a => a.startsWith('--since='));
  const sinceN = sinceArg ? Number(sinceArg.split('=')[1]) : 789; // default cutoff = first post-S94 ID

  const sheets = await getClient();
  const resp = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GODWORLD_SHEET_ID,
    range: `'${SHEET}'`
  });
  const rows = resp.data.values || [];
  const headers = rows[0] || [];
  const data = rows.slice(1);

  const idx = h => headers.indexOf(h);
  const colMap = {};
  headers.forEach((h, i) => { colMap[h.trim()] = i; });
  const c = (name) => colMap[name] != null ? colMap[name] : idx(name);

  const completeness = headers.map(() => 0);
  const popids = [];
  const tierClockMatrix = {};
  const statusEnum = {};
  const roleTypeCitizen = [];
  const birthYearOOB = [];          // out-of-bounds age (negative or > 110)
  const nonCanonNeighborhood = {};
  const narrative = { LifeHistory: 0, TraitProfile: 0, CitizenBio: 0 };
  const postSinceRows = [];         // rows with POPID >= sinceN

  // Canon-12 (per CANON_RULES neighborhood layer in Simulation_Ledger)
  const CANON12 = new Set([
    'Downtown', 'West Oakland', 'East Oakland', 'Fruitvale',
    'Temescal', 'Rockridge', 'Lake Merritt', 'Jack London',
    'Chinatown', 'Montclair', 'Piedmont Avenue', 'Adams Point'
  ]);

  let extantCount = 0;
  for (let r = 0; r < data.length; r++) {
    const row = data[r];
    const popidRaw = row[c('POPID')];
    const popN = parsePopId(popidRaw);
    const first = String(row[c('First')] || '').trim();
    const last = String(row[c('Last')] || '').trim();
    if (!popidRaw && !first && !last) continue;
    extantCount++;
    if (popN) popids.push(popN);

    for (let cc = 0; cc < headers.length; cc++) {
      const v = row[cc];
      if (v != null && String(v).trim() !== '') completeness[cc]++;
    }

    const tier = String(row[c('Tier')] || '').trim();
    const clock = String(row[c('ClockMode')] || '').trim();
    const key = `T${tier || '?'}/${clock || '?'}`;
    tierClockMatrix[key] = (tierClockMatrix[key] || 0) + 1;

    const status = String(row[c('Status')] || '').trim();
    statusEnum[status || '(empty)'] = (statusEnum[status || '(empty)'] || 0) + 1;

    const role = String(row[c('RoleType')] || '').trim();
    if (role === 'Citizen') {
      roleTypeCitizen.push({ popid: popidRaw, name: `${first} ${last}`.trim() });
    }

    const by = Number(row[c('BirthYear')]);
    if (by && (2041 - by < 0 || 2041 - by > 110)) {
      birthYearOOB.push({ popid: popidRaw, name: `${first} ${last}`.trim(), birthYear: by, age: 2041 - by });
    }

    const nbhd = String(row[c('Neighborhood')] || '').trim();
    if (nbhd && !CANON12.has(nbhd)) {
      nonCanonNeighborhood[nbhd] = (nonCanonNeighborhood[nbhd] || 0) + 1;
    }

    if (String(row[c('LifeHistory')] || '').trim()) narrative.LifeHistory++;
    if (String(row[c('TraitProfile')] || '').trim()) narrative.TraitProfile++;
    if (String(row[c('CitizenBio')] || '').trim()) narrative.CitizenBio++;

    if (popN && popN >= sinceN) {
      postSinceRows.push({
        popid: popidRaw,
        name: `${first} ${last}`.trim(),
        roleType: role,
        tier, clockMode: clock,
        neighborhood: nbhd,
        birthYear: by || null,
        education: String(row[c('EducationLevel')] || '').trim(),
        gender: String(row[c('Gender')] || '').trim()
      });
    }
  }

  // POPID continuity
  popids.sort((a, b) => a - b);
  const minId = popids[0];
  const maxId = popids[popids.length - 1];
  const idSet = new Set(popids);
  const gaps = [];
  for (let i = minId; i <= maxId; i++) {
    if (!idSet.has(i)) gaps.push(i);
  }

  const summary = {
    snapshotDate: new Date().toISOString().split('T')[0],
    sheet: SHEET,
    columns: headers.length,
    totalRows: data.length,
    extantCitizens: extantCount,
    popidRange: { min: minId, max: maxId },
    popidGapCount: gaps.length,
    popidGapsSample: gaps.slice(0, 10),
    tierClockMatrix,
    statusEnum,
    roleTypeCitizenCount: roleTypeCitizen.length,
    roleTypeCitizens: roleTypeCitizen,
    birthYearOOB,
    nonCanonNeighborhoodCounts: nonCanonNeighborhood,
    narrative,
    completeness: headers.map((h, i) => ({ col: h, n: completeness[i], pct: extantCount ? +(100 * completeness[i] / extantCount).toFixed(1) : 0 })),
    postSinceCutoff: sinceN,
    postSinceCount: postSinceRows.length,
    postSinceRows
  };

  if (wantJson) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  // Brief human output
  console.log(`=== ${SHEET} audit — ${summary.snapshotDate} ===\n`);
  console.log(`Headers: ${summary.columns} cols | Total rows: ${summary.totalRows} | Extant citizens: ${summary.extantCitizens}`);
  console.log(`POPID range: POP-${String(minId).padStart(5,'0')} → POP-${String(maxId).padStart(5,'0')} | Gaps: ${gaps.length}` + (gaps.length ? ` (sample: ${summary.popidGapsSample.map(g => 'POP-' + String(g).padStart(5,'0')).join(', ')}${gaps.length > 10 ? '…' : ''})` : ''));
  console.log('');
  console.log('Tier × ClockMode matrix:');
  Object.entries(tierClockMatrix).sort(([a],[b]) => a.localeCompare(b)).forEach(([k, v]) => console.log(`  ${k.padEnd(16)} ${v}`));
  console.log('');
  console.log('Status enum:');
  Object.entries(statusEnum).sort(([,a],[,b]) => b - a).forEach(([k, v]) => console.log(`  ${k.padEnd(16)} ${v}`));
  console.log('');
  console.log('Drift sentinels:');
  console.log(`  RoleType="Citizen":     ${roleTypeCitizen.length}` + (roleTypeCitizen.length ? ' — ' + roleTypeCitizen.slice(0,5).map(x => `${x.popid} ${x.name}`).join('; ') : ''));
  console.log(`  BirthYear age OOB:      ${birthYearOOB.length}` + (birthYearOOB.length ? ' — ' + birthYearOOB.slice(0,5).map(x => `${x.popid} age=${x.age}`).join('; ') : ''));
  const nonCanonTotal = Object.values(nonCanonNeighborhood).reduce((a,b)=>a+b,0);
  console.log(`  Non-canon-12 neighborhood: ${nonCanonTotal} citizens across ${Object.keys(nonCanonNeighborhood).length} variants`);
  if (nonCanonTotal) {
    Object.entries(nonCanonNeighborhood).sort(([,a],[,b]) => b - a).slice(0, 8).forEach(([k, v]) => console.log(`    ${v.toString().padStart(4)} ${k}`));
  }
  console.log('');
  console.log('Narrative-column population:');
  Object.entries(narrative).forEach(([k, v]) => console.log(`  ${k.padEnd(16)} ${v} / ${extantCount} (${(100*v/extantCount).toFixed(1)}%)`));
  console.log('');
  console.log('Per-column completeness (cols < 100% only):');
  summary.completeness.forEach(({ col, n, pct }) => {
    if (pct < 100) console.log(`  ${col.padEnd(24)} ${String(n).padStart(4)} / ${extantCount} (${pct}%)`);
  });
  console.log('');
  console.log(`Post-cutoff additions (POPID >= POP-${String(sinceN).padStart(5,'0')}): ${postSinceRows.length}`);
  postSinceRows.forEach(r => console.log(`  ${r.popid}  ${r.name.padEnd(30)} role=${(r.roleType || '(empty)').padEnd(20)} T${r.tier} ${r.clockMode.padEnd(7)} nbhd=${r.neighborhood || '(empty)'} edu=${r.education || '(empty)'} gen=${r.gender || '(empty)'}`));
}

main().catch(e => { console.error(e); process.exit(1); });
