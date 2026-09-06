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
const { CANONICAL_HOODS } = require('../lib/canonNeighborhoods'); // S247: shared canon set (kills audit/pre-mortem list drift)
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

  // engine.90 Commit 12 — archive integrity. Citizen_Archive holds every exit snapshot;
  // World_Config popIdHighWater is the allocator mark. Invariants: no POPID twice on the
  // ledger; every POPID on either tab ≤ the mark; a POPID on both tabs is a restore
  // (ReturnEligible exit + Active row) — a deceased latest exit back on the ledger is a
  // ghost, and an exit-status row that already has a snapshot is a pending re-archive.
  const archive = { present: false, rows: 0, maxId: null, highWater: null, duplicates: [], overMark: [], onBoth: [] };
  try {
    const wc = (await sheets.spreadsheets.values.get({ spreadsheetId: process.env.GODWORLD_SHEET_ID, range: `'World_Config'!A:B` })).data.values || [];
    const hw = wc.find(r => String(r[0] || '').trim() === 'popIdHighWater');
    archive.highWater = hw ? Number(hw[1]) : null;
  } catch (e) { archive.highWaterError = e.message; }
  let arRows = [];
  try {
    arRows = (await sheets.spreadsheets.values.get({ spreadsheetId: process.env.GODWORLD_SHEET_ID, range: `'Citizen_Archive'` })).data.values || [];
    archive.present = true;
  } catch (e) { archive.present = false; }
  {
    const iPop = headers.indexOf('POPID'), iSt = headers.indexOf('Status');
    const seen = {};
    for (const r of data) { const p = String(r[iPop] || '').trim().toUpperCase(); if (p) seen[p] = (seen[p] || 0) + 1; }
    archive.duplicates = Object.keys(seen).filter(p => seen[p] > 1);
    const arH = arRows[0] || [], arB = arRows.slice(1);
    archive.rows = arB.length;
    const aPop = arH.indexOf('POPID'), aExit = arH.indexOf('ExitCycle'), aReason = arH.indexOf('ArchiveReason'), aRet = arH.indexOf('ReturnEligible');
    const latest = {};
    for (const r of arB) {
      const p = String(r[aPop] || '').trim().toUpperCase(); const n = parsePopId(p);
      if (n != null && (archive.maxId == null || n > archive.maxId)) archive.maxId = n;
      if (!latest[p] || (Number(r[aExit]) || 0) >= (Number(latest[p][aExit]) || 0)) latest[p] = r;
    }
    if (archive.highWater != null) {
      for (const p of Object.keys(seen)) { const n = parsePopId(p); if (n != null && n > archive.highWater) archive.overMark.push(p); }
      for (const p of Object.keys(latest)) { const n = parsePopId(p); if (n != null && n > archive.highWater) archive.overMark.push(p + ' (archive)'); }
    }
    for (const r of data) {
      const p = String(r[iPop] || '').trim().toUpperCase();
      if (!latest[p]) continue;
      const st = String(r[iSt] || '').trim().toLowerCase();
      const reason = String(latest[p][aReason] || '');
      const kind = (st === 'traded' || st === 'deceased') ? 'pending-re-archive' : reason === 'deceased' ? 'GHOST-deceased-back-on-ledger' : (String(latest[p][aRet]).toUpperCase() === 'TRUE' ? 'restored' : 'on-both-not-return-eligible');
      archive.onBoth.push({ popid: p, status: r[iSt], latestExit: `${reason} C${latest[p][aExit]}`, kind });
    }
  }

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
  const untrimmedName = [];         // leading/trailing whitespace in First/Last/MaidenName
  const narrative = { LifeHistory: 0, TraitProfile: 0, CitizenBio: 0 };
  const postSinceRows = [];         // rows with POPID >= sinceN

  // Canon-12 (per CANON_RULES neighborhood layer in Simulation_Ledger)
  const CANON12 = new Set([
    'Downtown', 'West Oakland', 'East Oakland', 'Fruitvale',
    'Temescal', 'Rockridge', 'Lake Merritt', 'Jack London',
    'Chinatown', 'Montclair', 'Piedmont Avenue', 'Adams Point'
  ]);
  // S247: the drift check now uses the FULL canonical set (core-12 + Map-17 + children
  // from lib/canonNeighborhoods), not just CANON12. Pre-S247 it flagged VALID Map-17
  // neighborhoods (Uptown 89, Laurel 65, Piedmont Ave 59, KONO 12, Ivy Hill 1) as
  // "drift" — 226 false positives inflating the boot-state count. Union is ADDITIVE:
  // CANON12's own members (incl. 'East Oakland'/'Montclair'/'Piedmont Avenue', which the
  // audit has always treated as canon) stay canon, so nothing newly flags. Case-insensitive.
  const VALID_HOODS = new Set([...CANON12].map(s => s.toLowerCase()));
  for (const h of CANONICAL_HOODS) VALID_HOODS.add(h);

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

    const byRaw = String(row[c('BirthYear')] ?? '').trim();
    const by = Number(byRaw);
    // S431: a non-numeric cell ("2--6", a hand-mint typo on POP-01083) used to
    // pass silently — Number() gave NaN, `by &&` skipped it. Non-empty + not a
    // finite year is out-of-bounds by definition.
    if (byRaw && (!Number.isFinite(by) || 2041 - by < 0 || 2041 - by > 110)) {
      birthYearOOB.push({ popid: popidRaw, name: `${first} ${last}`.trim(), birthYear: Number.isFinite(by) ? by : byRaw, age: Number.isFinite(by) ? 2041 - by : 'n/a' });
    }

    const nbhd = String(row[c('Neighborhood')] || '').trim();
    if (nbhd && !VALID_HOODS.has(nbhd.toLowerCase())) {
      nonCanonNeighborhood[nbhd] = (nonCanonNeighborhood[nbhd] || 0) + 1;
    }

    // Untrimmed name fields. Every consumer composes a display name as
    // First + ' ' + Last, so a trailing space in First reaches print as a
    // double space — "Elias  Varek" appeared that way in C101 exchange
    // transcripts. Name matching all normalizes, so nothing errors and the
    // defect only ever surfaces in published canon. Found 2026-08-22 on 3 rows
    // (Varek, Caldera, Carter Jr.) while verifying the canon bond mint.
    for (const f of ['First', 'Last', 'MaidenName']) {
      const idx = c(f);
      if (idx < 0) continue;
      const raw = row[idx];
      if (raw == null) continue;
      const s = String(raw);
      if (s !== '' && s !== s.trim()) {
        untrimmedName.push({ popid: popidRaw, field: f, value: s, name: `${first} ${last}`.trim() });
      }
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
    archiveIntegrity: archive,
    tierClockMatrix,
    statusEnum,
    roleTypeCitizenCount: roleTypeCitizen.length,
    roleTypeCitizens: roleTypeCitizen,
    untrimmedNameCount: untrimmedName.length,
    untrimmedNames: untrimmedName,
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
  console.log(`  Untrimmed name field:   ${untrimmedName.length}` + (untrimmedName.length ? ' — ' + untrimmedName.slice(0,5).map(x => `${x.popid} ${x.field}=${JSON.stringify(x.value)}`).join('; ') : ''));
  const nonCanonTotal = Object.values(nonCanonNeighborhood).reduce((a,b)=>a+b,0);
  console.log(`  Non-canon neighborhood: ${nonCanonTotal} citizens across ${Object.keys(nonCanonNeighborhood).length} variants`);
  if (nonCanonTotal) {
    Object.entries(nonCanonNeighborhood).sort(([,a],[,b]) => b - a).slice(0, 8).forEach(([k, v]) => console.log(`    ${v.toString().padStart(4)} ${k}`));
  }
  console.log('');
  console.log('Archive integrity (engine.90):');
  console.log(`  Citizen_Archive:        ${archive.present ? archive.rows + ' rows, max ' + (archive.maxId == null ? '—' : 'POP-' + String(archive.maxId).padStart(5, '0')) : 'ABSENT'} | popIdHighWater ${archive.highWater == null ? 'MISSING' : archive.highWater} (ledger max POP-${String(maxId).padStart(5,'0')})`);
  console.log(`  Duplicate POPIDs:       ${archive.duplicates.length}` + (archive.duplicates.length ? ' — ' + archive.duplicates.slice(0, 5).join(', ') : ''));
  console.log(`  POPID above the mark:   ${archive.overMark.length}` + (archive.overMark.length ? ' — ' + archive.overMark.slice(0, 5).join(', ') : ''));
  const bad = archive.onBoth.filter(x => x.kind !== 'restored');
  console.log(`  On ledger AND archive:  ${archive.onBoth.length} (${archive.onBoth.length - bad.length} restored, ${bad.length} flagged)` + (bad.length ? ' — ' + bad.slice(0, 5).map(x => `${x.popid} ${x.status} / ${x.latestExit} → ${x.kind}`).join('; ') : ''));
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
