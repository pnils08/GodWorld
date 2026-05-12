#!/usr/bin/env node
/**
 * applyFaithCanonSubsP3.js — canon.2 P3 sheet writes
 *
 * Parses docs/canon/INSTITUTIONS.md §Canon substitution table (16 rows),
 * resolves current Faith_Organizations + Simulation_Ledger row indices, and
 * applies the substitution via lib/sheets.js batchUpdate.
 *
 *   Faith_Organizations:  16 rows × {col A Organization, col F Leader}
 *   Simulation_Ledger:    15 rows × {col B First, col D Last}
 *                         (POP-00758 Jaston SL already canon — skipped)
 *
 * Default: --dry-run (prints proposed writes; no sheet contact for writes).
 * Use --apply to execute the batch.
 *
 * Plan: docs/plans/2026-05-12-canon-2-faith-scrub.md §Phase 3 Tasks 3.1, 3.2
 */

require('/root/GodWorld/lib/env');
var fs = require('fs');
var path = require('path');
var sheets = require('../lib/sheets');

var APPLY = process.argv.includes('--apply');
var INSTITUTIONS_PATH = path.resolve(__dirname, '..', 'docs', 'canon', 'INSTITUTIONS.md');

// ── 1. Parse INSTITUTIONS.md §Canon substitution table ──────────────────────
function parseSubstitutionTable() {
  var md = fs.readFileSync(INSTITUTIONS_PATH, 'utf8');
  var lines = md.split('\n');
  var inTable = false;
  var headerSeen = false;
  var rows = [];
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    if (/^### Canon substitution table/.test(line)) { inTable = true; continue; }
    if (inTable && /^### /.test(line)) break;
    if (!inTable) continue;
    if (!/^\|/.test(line)) continue;
    if (/^\|[\s-|]+\|$/.test(line)) { headerSeen = true; continue; }
    if (!headerSeen) continue;
    var cells = line.split('|').slice(1, -1).map(function(s){ return s.trim(); });
    if (cells.length < 7) continue;
    rows.push({
      popid: cells[0],
      realOrg: cells[1],
      tradition: cells[2],
      neighborhood: cells[3],
      canonOrg: cells[4],
      canonLeader: cells[5],
      notes: cells[6]
    });
  }
  return rows;
}

function displayTitle(notes) {
  var m = notes.match(/display title:\s*([^;]+?)(?:;|$)/i);
  return m ? m[1].trim() : '';
}

function foLeaderString(canonLeader, notes) {
  var t = displayTitle(notes);
  return t ? (t + ' ' + canonLeader) : canonLeader;
}

function splitName(name) {
  var parts = name.trim().split(/\s+/);
  if (parts.length < 2) throw new Error('Cannot split single-token name: "' + name + '"');
  return { first: parts[0], last: parts.slice(1).join(' ') };
}

(async function main() {
  var subs = parseSubstitutionTable();
  console.log('[canon.2 P3] Parsed substitution rows: ' + subs.length);
  if (subs.length !== 16) {
    console.error('[canon.2 P3] FAILED: expected 16 substitution rows, got ' + subs.length);
    process.exit(1);
  }

  console.log('[canon.2 P3] Reading Faith_Organizations…');
  var fo = await sheets.getSheetData('Faith_Organizations');
  console.log('[canon.2 P3] Reading Simulation_Ledger…');
  var sl = await sheets.getSheetData('Simulation_Ledger');

  // Index FO rows by LeaderPOPID (col I = idx 8)
  var foRowByPop = {};
  for (var i = 1; i < fo.length; i++) {
    var pop = String(fo[i][8] || '').trim();
    if (pop) foRowByPop[pop] = i + 1; // 1-indexed for A1
  }
  // Index SL rows by POPID (col A = idx 0)
  var slRowByPop = {};
  for (var j = 1; j < sl.length; j++) {
    var spop = String(sl[j][0] || '').trim();
    if (spop) slRowByPop[spop] = j + 1;
  }

  var updates = [];
  var foPlan = [];
  var slPlan = [];

  subs.forEach(function(s) {
    var foRow = foRowByPop[s.popid];
    var slRow = slRowByPop[s.popid];
    if (!foRow) { console.error('[canon.2 P3] FAILED: FO row not found for ' + s.popid); process.exit(1); }
    if (!slRow) { console.error('[canon.2 P3] FAILED: SL row not found for ' + s.popid); process.exit(1); }

    var newOrg = s.canonOrg;
    var newLeader = foLeaderString(s.canonLeader, s.notes);
    var oldOrg = fo[foRow - 1][0];
    var oldLeader = fo[foRow - 1][5];
    foPlan.push({ popid: s.popid, foRow: foRow, oldOrg: oldOrg, newOrg: newOrg, oldLeader: oldLeader, newLeader: newLeader });

    // FO writes: col A (Organization) + col F (Leader)
    updates.push({ range: 'Faith_Organizations!A' + foRow, values: [[newOrg]] });
    updates.push({ range: 'Faith_Organizations!F' + foRow, values: [[newLeader]] });

    // SL writes: col B (First) + col D (Last); skip POP-00758 per Mike directive
    if (s.popid === 'POP-00758') {
      slPlan.push({ popid: s.popid, slRow: slRow, skip: true, reason: 'already canon (SL.First+Last = Robert Jaston)' });
      return;
    }
    var name = splitName(s.canonLeader);
    var oldFirst = sl[slRow - 1][1];
    var oldLast = sl[slRow - 1][3];
    slPlan.push({ popid: s.popid, slRow: slRow, oldFirst: oldFirst, newFirst: name.first, oldLast: oldLast, newLast: name.last });

    updates.push({ range: 'Simulation_Ledger!B' + slRow, values: [[name.first]] });
    updates.push({ range: 'Simulation_Ledger!D' + slRow, values: [[name.last]] });
  });

  // Print plan
  console.log('');
  console.log('═══ Faith_Organizations writes (16 rows) ═══');
  foPlan.forEach(function(p) {
    console.log('  Row ' + p.foRow + ' (' + p.popid + '):');
    console.log('    A: "' + p.oldOrg + '" → "' + p.newOrg + '"');
    console.log('    F: "' + p.oldLeader + '" → "' + p.newLeader + '"');
  });
  console.log('');
  console.log('═══ Simulation_Ledger writes (' + slPlan.filter(function(p){ return !p.skip; }).length + ' rows; 1 skipped) ═══');
  slPlan.forEach(function(p) {
    if (p.skip) {
      console.log('  Row ' + p.slRow + ' (' + p.popid + '): SKIP — ' + p.reason);
      return;
    }
    console.log('  Row ' + p.slRow + ' (' + p.popid + '):');
    console.log('    B: "' + p.oldFirst + '" → "' + p.newFirst + '"');
    console.log('    D: "' + p.oldLast + '" → "' + p.newLast + '"');
  });
  console.log('');
  console.log('═══ Batch payload ═══');
  console.log('Total ranges: ' + updates.length + ' (' + (foPlan.length * 2) + ' FO + ' + (slPlan.filter(function(p){ return !p.skip; }).length * 2) + ' SL)');
  console.log('Mode: ' + (APPLY ? 'APPLY (will execute batchUpdate)' : 'DRY-RUN (no writes)'));

  if (!APPLY) {
    console.log('');
    console.log('Re-run with --apply to execute.');
    return;
  }

  // Execute batchUpdate
  console.log('');
  console.log('[canon.2 P3] Executing batchUpdate…');
  await sheets.batchUpdate(updates);
  console.log('[canon.2 P3] Wrote ' + updates.length + ' ranges.');

  // Verify pass
  console.log('');
  console.log('═══ Verify ═══');
  var foAfter = await sheets.getSheetData('Faith_Organizations');
  var slAfter = await sheets.getSheetData('Simulation_Ledger');

  var verifyFail = false;
  foPlan.forEach(function(p) {
    var actualOrg = foAfter[p.foRow - 1][0];
    var actualLeader = foAfter[p.foRow - 1][5];
    if (actualOrg !== p.newOrg) { console.error('  MISMATCH FO row ' + p.foRow + ' A: expected "' + p.newOrg + '" got "' + actualOrg + '"'); verifyFail = true; }
    if (actualLeader !== p.newLeader) { console.error('  MISMATCH FO row ' + p.foRow + ' F: expected "' + p.newLeader + '" got "' + actualLeader + '"'); verifyFail = true; }
  });
  slPlan.forEach(function(p) {
    if (p.skip) return;
    var actualFirst = slAfter[p.slRow - 1][1];
    var actualLast = slAfter[p.slRow - 1][3];
    if (actualFirst !== p.newFirst) { console.error('  MISMATCH SL row ' + p.slRow + ' B: expected "' + p.newFirst + '" got "' + actualFirst + '"'); verifyFail = true; }
    if (actualLast !== p.newLast) { console.error('  MISMATCH SL row ' + p.slRow + ' D: expected "' + p.newLast + '" got "' + actualLast + '"'); verifyFail = true; }
  });

  if (verifyFail) {
    console.error('[canon.2 P3] FAILED: post-write readback did not match expected values.');
    process.exit(1);
  }

  // Blocklist grep — fail loudly if any of these survive
  var blocklist = [
    'Acts Full Gospel','Allen Temple','Cathedral of Christ the Light','Beth Jacob','Kehilla',
    'Masjid Al-Islam','Lake Merritt United Methodist','Temple Sinai','Shiva Vishnu','Gurdwara Sahib',
    'Bishop Robert Jackson','Bishop Calvin Reeves','Greater Hope','First Presbyterian Church',
    'East Bay Meditation Center','Oakland Buddhist Temple','Islamic Center of Oakland',
    'First Unitarian Church','Margaret Chen','Jacqueline Thompson','Michael Barber','Ramon Torres',
    'David Park','Jacqueline Mates-Muchin','Yehuda Ferris','Abdul Rahman','Faheem Shuaibe',
    'Kodo Umezu','Larry Yang','Venkatesh Sharma','Gurpreet Singh','Dev Noily','Michelle Collins',
    'St. Columba'
  ];
  // Compose strings to grep across only the touched rows
  var touchedFoStrings = foPlan.map(function(p){ return foAfter[p.foRow - 1].join('\t'); }).join('\n');
  var touchedSlStrings = slPlan.filter(function(p){ return !p.skip; }).map(function(p){
    return slAfter[p.slRow - 1].slice(0, 5).join('\t');
  }).join('\n');
  var hits = [];
  blocklist.forEach(function(bad) {
    if (touchedFoStrings.indexOf(bad) >= 0) hits.push({ where: 'FO', token: bad });
    if (touchedSlStrings.indexOf(bad) >= 0) hits.push({ where: 'SL', token: bad });
  });
  if (hits.length > 0) {
    console.error('[canon.2 P3] FAILED: blocklist tokens still present after write:');
    hits.forEach(function(h){ console.error('  ' + h.where + ' contains "' + h.token + '"'); });
    process.exit(1);
  }

  console.log('  All ' + (foPlan.length + slPlan.filter(function(p){ return !p.skip; }).length) + ' touched rows match expected values.');
  console.log('  Blocklist grep: 0 hits against ' + blocklist.length + ' Tier-3 tokens.');
  console.log('');
  console.log('[canon.2 P3] DONE.');
})().catch(function(err){
  console.error('[canon.2 P3] FAILED:', err && err.stack || err);
  process.exit(1);
});
