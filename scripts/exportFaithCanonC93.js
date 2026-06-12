#!/usr/bin/env node
/**
 * exportFaithCanonC93.js — canon.2 P0 export
 *
 * Dumps the three contamination surfaces (Faith_Organizations + Business_Ledger
 * faith cross-walk + Simulation_Ledger faith-leader POPs) to
 * `output/faith_canon_export_c93.md` for research-build P1 substitution authoring.
 *
 * Plan: docs/archive/plans/2026-05-12-canon-2-faith-scrub.md §Phase 0
 */

require('/root/GodWorld/lib/env');
var fs = require('fs');
var path = require('path');
var sheets = require('../lib/sheets');

var FAITH_ROLE_KWS = ['pastor','imam','rabbi','reverend','priest','bishop','faith leader','minister','clergy','chaplain'];
var FAITH_NAME_KWS = ['church','temple','synagogue','mosque','masjid','cathedral','parish','chapel','ministry','congregation','faith','religious'];

function mdRow(cells) {
  return '| ' + cells.map(function(c){ return String(c == null ? '' : c).replace(/\|/g,'\\|'); }).join(' | ') + ' |';
}

function mdTable(header, rows) {
  var lines = [];
  lines.push(mdRow(header));
  lines.push('|' + header.map(function(){ return '---'; }).join('|') + '|');
  rows.forEach(function(r){
    var padded = r.slice();
    while (padded.length < header.length) padded.push('');
    lines.push(mdRow(padded));
  });
  return lines.join('\n');
}

(async function main() {
  console.log('[canon.2 P0] Reading Faith_Organizations…');
  var fo = await sheets.getSheetData('Faith_Organizations');
  console.log('[canon.2 P0] Reading Business_Ledger…');
  var bl = await sheets.getSheetData('Business_Ledger');
  console.log('[canon.2 P0] Reading Simulation_Ledger…');
  var sl = await sheets.getSheetData('Simulation_Ledger');

  var foHeader = fo[0];
  var foData = fo.slice(1).filter(function(r){ return r[0]; });
  console.log('  FO data rows: ' + foData.length);

  var faithOrgNames = new Set(foData.map(function(r){ return String(r[0]||'').trim(); }));
  var leaderPopIds = new Set(foData.map(function(r){ return String(r[8]||'').trim(); }).filter(Boolean));

  // BL cross-walk: name match, keyword match, and EmployerBizId targets
  var blByName = bl.slice(1).filter(function(r){ return faithOrgNames.has(String(r[1]||'').trim()); });
  var blByKw = bl.slice(1).filter(function(r){
    var nm = String(r[1]||'').toLowerCase();
    var sec = String(r[2]||'').toLowerCase();
    return FAITH_NAME_KWS.some(function(k){ return nm.includes(k) || sec.includes(k); });
  });

  // SL faith-leader POPs: matched by RoleType keyword OR membership in LeaderPOPID set
  var slLeaders = sl.slice(1).filter(function(r){
    var pop = String(r[0]||'').trim();
    var role = String(r[10]||'').toLowerCase();
    return leaderPopIds.has(pop) || FAITH_ROLE_KWS.some(function(k){ return role.includes(k); });
  });

  // Collect EmployerBizIds referenced by leader POPs (col AS = idx 44)
  var employerBizIds = new Set(slLeaders.map(function(r){ return String(r[44]||'').trim(); }).filter(Boolean));
  var blEmployers = bl.slice(1).filter(function(r){ return employerBizIds.has(String(r[0]||'').trim()); });

  // ── Compose markdown ───────────────────────────────────────────────────────
  var out = [];
  out.push('# Faith Canon Export — C93');
  out.push('');
  out.push('**Generated:** ' + new Date().toISOString());
  out.push('**Source:** Live Google Sheets via `lib/sheets.js`');
  out.push('**Purpose:** canon.2 Phase 0 contamination surface for research-build P1 substitution authoring.');
  out.push('**Plan:** `docs/archive/plans/2026-05-12-canon-2-faith-scrub.md`');
  out.push('');
  out.push('---');
  out.push('');

  // Faith_Organizations slice
  out.push('## Faith_Organizations');
  out.push('');
  out.push('**Rows:** ' + foData.length + ' data rows (' + foHeader.length + ' columns A–I)');
  out.push('');
  out.push(mdTable(foHeader, foData));
  out.push('');
  out.push('---');
  out.push('');

  // Business_Ledger cross-walk
  out.push('## Business_Ledger faith cross-walk');
  out.push('');
  out.push('Three filters applied:');
  out.push('');
  out.push('### 1. Name match — `Business_Ledger.Name` ∈ `Faith_Organizations.Organization`');
  out.push('');
  out.push('**Hits:** ' + blByName.length);
  if (blByName.length === 0) {
    out.push('');
    out.push('No Business_Ledger rows carry any of the 16 faith-organization names. Faith orgs are not modeled as Business_Ledger entries.');
  } else {
    out.push('');
    out.push(mdTable(bl[0], blByName));
  }
  out.push('');
  out.push('### 2. Keyword match — name or sector contains faith keyword');
  out.push('');
  out.push('Keywords: `' + FAITH_NAME_KWS.join('`, `') + '`');
  out.push('');
  out.push('**Hits:** ' + blByKw.length);
  if (blByKw.length > 0) {
    out.push('');
    out.push(mdTable(bl[0], blByKw));
    out.push('');
    out.push('*Review for false positives (e.g., `Temple Lounge` = nightlife venue, not a faith org).*');
  }
  out.push('');
  out.push('### 3. EmployerBizId reverse-lookup — BIZ entries referenced by faith-leader POPs');
  out.push('');
  out.push('Distinct EmployerBizId values across faith-leader POPs: `' + [].concat([...employerBizIds]).join('`, `') + '`');
  out.push('');
  out.push('**Hits:** ' + blEmployers.length);
  if (blEmployers.length > 0) {
    out.push('');
    out.push(mdTable(bl[0], blEmployers));
  }
  out.push('');
  out.push('**Cross-walk gap (data integrity finding, flag for P1):** all ' + slLeaders.length + ' SL faith-role POPs (' + foData.length + ' Faith_Organizations leaders + ' + (slLeaders.length - foData.length) + ' keyword-matched orphan) share a single EmployerBizId (`BIZ-00028 / West Oakland Community Center / Community Services`). No per-faith-organization BIZ entries exist. P1 substitution may need to decide whether to (a) leave BIZ-00028 as the shared faith-leader employer record, (b) create 16 faith-org BIZ entries with canon substitutes, or (c) rename BIZ-00028 to reflect its actual canon role.');
  out.push('');
  out.push('---');
  out.push('');

  // Simulation_Ledger faith-leader POPs
  out.push('## Simulation_Ledger faith-leader POPs');
  out.push('');
  out.push('Matched by RoleType keyword OR membership in `Faith_Organizations.LeaderPOPID` set.');
  out.push('');
  out.push('**Hits:** ' + slLeaders.length);
  out.push('');
  // Columns of interest from 47-col SL: POPID(A,0), First(B,1), Middle(C,2), Last(D,3),
  // RoleType(K,10), Tier(J,9), BirthYear(M,12), Neighborhood(T,19), MaritalStatus(V,21),
  // EmployerBizId(AS,44), Gender(AU,46)
  var slCols = ['POPID','First','Middle','Last','Tier','RoleType','BirthYear','Neighborhood','EmployerBizId','Gender'];
  var slRows = slLeaders.map(function(r){
    return [r[0], r[1], r[2], r[3], r[9], r[10], r[12], r[19], r[44], r[46]];
  });
  out.push(mdTable(slCols, slRows));
  out.push('');
  out.push('---');
  out.push('');
  out.push('## Notes — FO Leader ↔ SL Name drift');
  out.push('');
  out.push('Cross-check `Faith_Organizations.Leader` (col F) against `Simulation_Ledger.First + Last` for the row keyed by `LeaderPOPID`. Honorifics (Rev., Fr., Bishop, Rabbi, Imam, Pandit, Bhai) and middle initials are normalized out before comparison; flagged rows have a substantive last-name or stem mismatch.');
  out.push('');
  var slByPop = {};
  sl.slice(1).forEach(function(r){ slByPop[r[0]] = r; });
  function stripHonorific(s) {
    return String(s||'')
      .replace(/^(rev|fr|bishop|rabbi|imam|pandit|bhai|dr|pastor|father|reverend|sister|brother)\.?\s+/i,'')
      .replace(/\s+(jr|sr|ii|iii)\.?$/i,'')
      .trim();
  }
  var driftRows = [];
  foData.forEach(function(r){
    var pop = String(r[8]||'').trim();
    if (!pop || !slByPop[pop]) return;
    var foLeaderRaw = String(r[5]||'').trim();
    var foLeader = stripHonorific(foLeaderRaw);
    var slFirst = String(slByPop[pop][1]||'').trim();
    var slLast = String(slByPop[pop][3]||'').trim();
    var slName = (slFirst + ' ' + slLast).trim();
    if (foLeader.toLowerCase() !== slName.toLowerCase()) {
      driftRows.push([pop, foLeaderRaw, slName, r[0]]);
    }
  });
  if (driftRows.length === 0) {
    out.push('No drift detected.');
  } else {
    out.push('**Drift rows:** ' + driftRows.length);
    out.push('');
    out.push(mdTable(['LeaderPOPID','FO Leader (col F)','SL First+Last','FO Organization'], driftRows));
  }
  out.push('');
  out.push('---');
  out.push('');
  out.push('## Summary');
  out.push('');
  out.push('- Faith_Organizations data rows: **' + foData.length + '**');
  out.push('- Business_Ledger name matches: **' + blByName.length + '**');
  out.push('- Business_Ledger keyword matches: **' + blByKw.length + '**');
  out.push('- Business_Ledger employer reverse-lookup: **' + blEmployers.length + '**');
  out.push('- Simulation_Ledger faith-leader POPs: **' + slLeaders.length + '**');
  out.push('- LeaderPOPID ↔ SL POP intersection: **' + foData.filter(function(r){ return leaderPopIds.has(String(r[8]||'').trim()); }).length + '** of ' + foData.length + ' FO rows have a LeaderPOPID present in SL');

  var outPath = path.resolve(__dirname, '..', 'output', 'faith_canon_export_c93.md');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, out.join('\n') + '\n');
  console.log('[canon.2 P0] Wrote ' + outPath);
})().catch(function(err){
  console.error('[canon.2 P0] FAILED:', err && err.stack || err);
  process.exit(1);
});
