/**
 * archiveCitizenExits.js — engine.90 Citizen Archive (clasp-deployed).
 *
 * Simulation_Ledger is the active Oakland cohort. Citizen_Archive is the cold
 * full-row home for citizens who have left it: an exact positional snapshot of
 * the Simulation_Ledger row at exit (same headers, same order) plus seven
 * metadata columns. Uniqueness of a snapshot is (POPID, ExitCycle,
 * ArchiveReason). Simulation_Ledger column adds are append-only for as long
 * as this archive exists; SchemaVersion records the snapshot width so a
 * restore can pad on the right.
 *
 * Commit 3 (S428): the header contract. The Phase-11 mover and the restore
 * land in later commits of docs/plans/2026-08-21-citizen-archive.md.
 */

var CITIZEN_ARCHIVE_META_HEADERS = ['ArchiveReason', 'ExitCycle', 'SourceEventId', 'LastActiveStatus', 'ReturnEligible', 'SchemaVersion', 'ArchiveNote'];

/** Archive header row = the live Simulation_Ledger header + the metadata columns. */
function citizenArchiveHeaders_(slHeader) {
  return (slHeader || []).slice().concat(CITIZEN_ARCHIVE_META_HEADERS);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    CITIZEN_ARCHIVE_META_HEADERS: CITIZEN_ARCHIVE_META_HEADERS,
    citizenArchiveHeaders_: citizenArchiveHeaders_,
    citizenArchiveEnabled_: function(ctx) { return citizenArchiveEnabled_(ctx); },
    citizenArchiveRow_: function() { return citizenArchiveRow_.apply(null, arguments); },
    citizenArchiveCandidates_: function() { return citizenArchiveCandidates_.apply(null, arguments); },
    citizenArchiveLatestByPop_: function() { return citizenArchiveLatestByPop_.apply(null, arguments); },
    citizenExitDefects_: function() { return citizenExitDefects_.apply(null, arguments); },
    citizenArchiveNote_: function() { return citizenArchiveNote_.apply(null, arguments); },
    archiveCitizenExits_: function(ctx) { return archiveCitizenExits_(ctx); }
  };
}

// ───────────────────────────────────────────────────────────────────────────
// Phase11-CitizenArchive — copy → read-back → remove (Commit 5, S428)
//
// Runs after Phase10-ExecuteIntents has committed Simulation_Ledger, after
// Phase11-MediaIntake / BusinessArchive, before MaintainLifeHistoryLog. Reads
// the COMMITTED sheet, never ctx.ledger.rows (Phase 11 consumers already ran
// on those and they are not mutated here). Same transactional shape as
// archiveClosedBusinesses_: nothing leaves Simulation_Ledger until its
// snapshot has been read back from Citizen_Archive by POPID + ExitCycle.
//
// Gate: Number(ctx.config.citizenArchiveEnabled) === 1, else a no-op — the
// requireTab_ sits inside the gate so a live sheet without the tab stays a
// no-op rather than a Phase-11 error. The cycle never creates the tab
// (engine.119); scripts/ensureCitizenArchive.js does.
// ───────────────────────────────────────────────────────────────────────────

var CITIZEN_ARCHIVE_REASON_BY_STATUS = { deceased: 'deceased', traded: 'traded-away' };
var CITIZEN_ARCHIVE_RETURN_ELIGIBLE = { 'traded-away': true, 'permanent-migration': true };
var CITIZEN_ARCHIVE_DIAG = null; // last run's counters — emitted in the fire JSON as out.citizenArchive

function citizenArchiveEnabled_(ctx) {
  return Number(ctx && ctx.config && ctx.config.citizenArchiveEnabled) === 1;
}

/**
 * engine.90 Commit 6 — the one read-side view of Citizen_Archive for engine code.
 * Newest exit snapshot per POPID, each re-shaped to the CALLER's Simulation_Ledger
 * header (by column name, so a ledger that grew a column after the exit still
 * indexes cleanly). Tab absent → {} (never created here; requireTab_ is the
 * mover's, behind its flag). Cached on ctx for the cycle.
 *   → { 'POP-00331': { row: [...SL-shaped...], reason: 'deceased', exitCycle: 107, returnEligible: false } }
 */
function citizenArchiveLatestByPop_(ctx, slHeader) {
  if (ctx && ctx._citizenArchiveByPop) return ctx._citizenArchiveByPop;
  var out = {};
  var ss = ctx && ctx.ss;
  var ar = ss && ss.getSheetByName ? ss.getSheetByName('Citizen_Archive') : null;
  if (ar && ar.getLastRow() >= 2) {
    var v = ar.getDataRange().getValues();
    var ah = v[0] || [];
    var iPop = ah.indexOf('POPID'), iExit = ah.indexOf('ExitCycle'), iReason = ah.indexOf('ArchiveReason'), iRet = ah.indexOf('ReturnEligible');
    var map = [];
    for (var c = 0; c < slHeader.length; c++) map.push(ah.indexOf(slHeader[c]));
    for (var r = 1; r < v.length; r++) {
      var pop = String(v[r][iPop] || '').trim().toUpperCase();
      if (!pop) continue;
      var exit = Number(v[r][iExit]) || 0;
      if (out[pop] && out[pop].exitCycle > exit) continue;
      var row = [];
      for (var k = 0; k < map.length; k++) row.push(map[k] >= 0 ? v[r][map[k]] : '');
      out[pop] = { row: row, reason: String(v[r][iReason] || ''), exitCycle: exit, returnEligible: String(v[r][iRet]).toUpperCase() === 'TRUE' };
    }
  }
  if (ctx) ctx._citizenArchiveByPop = out;
  return out;
}

/** Bookkeeping key for the exit, never published copy. */
function citizenArchiveSourceEventId_(reason, cycle, popId) {
  return (reason === 'deceased' ? 'death' : 'trade') + ':C' + cycle + ':' + popId;
}

/**
 * Build one archive row from a committed Simulation_Ledger row: A–<width>
 * verbatim, then the seven metadata cells in CITIZEN_ARCHIVE_META_HEADERS order.
 */
/**
 * engine.90 Commit 8 — the measured defect classes on ONE ledger row, derived from
 * that row's own cells (docs/plans/2026-08-17-ledger-trueup-sweep.md §Batch shape).
 * Pure; shared by the mover (ArchiveNote at exit) and the dry-run inventory so
 * there is one rule. Age anchor 2041 (project convention).
 */
var CITIZEN_EXIT_CAREER_STAGE_ENUM = { student: 1, 'entry-level': 1, 'mid-career': 1, senior: 1, retired: 1 };
function citizenExitDefects_(header, row) {
  var g = function(n) { var i = header.indexOf(n); return i < 0 ? '' : String(row[i] == null ? '' : row[i]).trim(); };
  var d = [];
  var sq = g('SchoolQuality'), cs = g('CareerStage');
  if (sq === '' || sq === '5') d.push('schoolQualityUnusable');
  if (!cs) d.push('careerStageBlank');
  else if (!CITIZEN_EXIT_CAREER_STAGE_ENUM[cs.toLowerCase()]) d.push('careerStageSpelling');
  if (g('NetWorth') === '') d.push('netWorthBlank');
  if (g('RoleType') && !g('EmployerBizId')) d.push('employerBlankWithRole');
  if (g('MigrationIntent')) d.push('migrationIntentSet');
  var by = Number(g('BirthYear')) || 0, age = by ? 2041 - by : null;
  if (age === null || age < 0 || age > 110) d.push('birthYearOOB');
  if (g('Income') === '') d.push('incomeBlank');
  return d;
}

/** The ArchiveNote text for an exit — the defect classes the row carried out, or blank. */
function citizenArchiveNote_(header, row) {
  var d = citizenExitDefects_(header, row);
  return d.length ? 'defects-at-exit: ' + d.join(',') : '';
}

function citizenArchiveRow_(slHeader, slRow, reason, cycle) {
  var out = [];
  for (var c = 0; c < slHeader.length; c++) out.push(c < slRow.length ? slRow[c] : '');
  var iStatus = slHeader.indexOf('Status');
  var popId = String(slRow[slHeader.indexOf('POPID')] || '').trim();
  out.push(reason, cycle, citizenArchiveSourceEventId_(reason, cycle, popId),
    iStatus >= 0 ? slRow[iStatus] : '', CITIZEN_ARCHIVE_RETURN_ELIGIBLE[reason] ? 'TRUE' : 'FALSE',
    slHeader.length, citizenArchiveNote_(slHeader, slRow)); // engine.90 Commit 8: the row leaves with its measured defects named, never repaired at exit
  return out;
}

/**
 * Eligibility over the committed sheet body. Returns {rows:[{q, popId, reason, num}], skipped}.
 * q = 0-based index into `body` (sheet row = q + 2). Skips malformed POPIDs and
 * any POPID that also has an Active row (a duplicate is a defect, not a move).
 */
function citizenArchiveCandidates_(header, body) {
  var iPop = header.indexOf('POPID'), iSt = header.indexOf('Status');
  var out = { rows: [], skipped: 0, skippedWhy: {} };
  if (iPop < 0 || iSt < 0) return out;
  var activeByPop = {};
  for (var a = 0; a < body.length; a++) {
    var st0 = String((body[a] && body[a][iSt]) || '').trim().toLowerCase();
    if (!CITIZEN_ARCHIVE_REASON_BY_STATUS[st0]) activeByPop[String(body[a][iPop] || '').trim().toUpperCase()] = true;
  }
  var skip = function(why) { out.skipped++; out.skippedWhy[why] = (out.skippedWhy[why] || 0) + 1; };
  var count = {};
  for (var n0 = 0; n0 < body.length; n0++) { var p0 = String((body[n0] && body[n0][iPop]) || '').trim().toUpperCase(); if (p0) count[p0] = (count[p0] || 0) + 1; }
  for (var q = 0; q < body.length; q++) {
    var row = body[q]; if (!row) continue;
    var st = String(row[iSt] || '').trim().toLowerCase();
    var reason = CITIZEN_ARCHIVE_REASON_BY_STATUS[st];
    if (!reason) continue;
    var popId = String(row[iPop] || '').trim().toUpperCase();
    var m = /^POP-(\d+)$/.exec(popId);
    if (!m) { skip('malformed-popid'); continue; }
    if (activeByPop[popId]) { skip('active-duplicate'); continue; }
    if (count[popId] > 1) { skip('duplicate-in-batch'); Logger.log('archiveCitizenExits_ engine.90: ' + popId + ' appears ' + count[popId] + ' times on Simulation_Ledger — no row moves; fix the duplicate'); continue; }
    out.rows.push({ q: q, popId: popId, reason: reason, num: +m[1] });
  }
  return out;
}

function archiveCitizenExits_(ctx) {
  var out = { enabled: false, candidates: 0, archived: 0, skipped: 0, skippedWhy: {}, remaining: null, highWaterBumped: false };
  CITIZEN_ARCHIVE_DIAG = out;
  if (!citizenArchiveEnabled_(ctx)) { Logger.log('archiveCitizenExits_ engine.90: citizenArchiveEnabled is not 1 — no-op'); return out; }
  out.enabled = true;
  if (!ctx.ss) return out;
  var cycle = (ctx.summary && ctx.summary.cycleId) || (ctx.config && ctx.config.cycleCount) || 0;
  var sl = requireTab_(ctx.ss, 'Simulation_Ledger');
  var ar = requireTab_(ctx.ss, 'Citizen_Archive');

  var v = sl.getDataRange().getValues();
  var header = v[0] || [], body = v.slice(1);
  var ah = ar.getDataRange().getValues()[0] || [];
  var want = citizenArchiveHeaders_(header);
  if (JSON.stringify(ah) !== JSON.stringify(want)) {
    throw new Error('engine.90: Citizen_Archive header does not match Simulation_Ledger header + metadata (' + ah.length + ' vs ' + want.length + ' cols) — nothing moved; re-run scripts/ensureCitizenArchive.js');
  }
  var iPopA = ah.indexOf('POPID'), iExitA = ah.indexOf('ExitCycle'), iReasonA = ah.indexOf('ArchiveReason');

  var cand = citizenArchiveCandidates_(header, body);
  out.skipped = cand.skipped; out.skippedWhy = cand.skippedWhy;
  // a re-fire of the same cycle must not double-snapshot: (POPID, ExitCycle, ArchiveReason) is unique
  var existing = {};
  var av = ar.getDataRange().getValues();
  for (var e = 1; e < av.length; e++) existing[String(av[e][iPopA] || '').trim().toUpperCase() + '|' + String(av[e][iExitA]) + '|' + String(av[e][iReasonA])] = true;
  var moves = [];
  for (var k = 0; k < cand.rows.length; k++) {
    var c = cand.rows[k];
    if (existing[c.popId + '|' + cycle + '|' + c.reason]) { out.skipped++; out.skippedWhy['already-archived-this-cycle'] = (out.skippedWhy['already-archived-this-cycle'] || 0) + 1; continue; }
    moves.push(c);
  }
  out.candidates = moves.length;
  if (!moves.length) { out.remaining = body.length; Logger.log('archiveCitizenExits_ engine.90 C' + cycle + ': no eligible rows'); return out; }

  // 1. copy — one block append
  var block = [];
  for (var b = 0; b < moves.length; b++) block.push(citizenArchiveRow_(header, body[moves[b].q], moves[b].reason, cycle));
  var start = ar.getLastRow() + 1;
  ar.getRange(start, 1, block.length, want.length).setValues(block);

  // 2. read back — every POPID + ExitCycle, in order
  var back = ar.getRange(start, 1, block.length, want.length).getValues();
  var verified = [];
  for (var r = 0; r < moves.length; r++) {
    var got = back[r] || [];
    var okRow = String(got[iPopA] || '').trim().toUpperCase() === moves[r].popId && String(got[iExitA]) === String(cycle);
    if (okRow) verified.push(moves[r]);
    else Logger.log('archiveCitizenExits_ engine.90: read-back mismatch for ' + moves[r].popId + ' — source row kept');
  }
  out.skipped += moves.length - verified.length;

  // 3. remove — verified rows only, bottom-up, contiguous runs in one call each
  verified.sort(function(x, y) { return y.q - x.q; });
  var i = 0, maxNum = 0;
  while (i < verified.length) {
    var j = i;
    while (j + 1 < verified.length && verified[j + 1].q === verified[j].q - 1) j++;
    var topQ = verified[j].q, n = verified[i].q - topQ + 1;
    sl.deleteRows(topQ + 2, n);
    for (var t = i; t <= j; t++) { out.archived++; if (verified[t].num > maxNum) maxNum = verified[t].num; Logger.log('archiveCitizenExits_ engine.90: ' + verified[t].popId + ' archived (' + verified[t].reason + ', C' + cycle + ')'); }
    i = j + 1;
  }
  out.remaining = sl.getLastRow() - 1;

  // 4. the mark never sits below an archived POPID (hand-appended-then-archived leak)
  var hw = Number(ctx.config && ctx.config.popIdHighWater);
  if (maxNum > 0 && (isNaN(hw) || maxNum > hw)) {
    if (!ctx._popIdAlloc) ctx._popIdAlloc = { last: maxNum, seededFrom: { highWater: isNaN(hw) ? null : hw, activeMax: null, archiveBump: true } };
    else if (maxNum > ctx._popIdAlloc.last) ctx._popIdAlloc.last = maxNum;
    out.highWaterBumped = persistPopIdHighWater_(ctx);
  }
  Logger.log('archiveCitizenExits_ engine.90 C' + cycle + ': ' + out.archived + ' archived, ' + out.skipped + ' skipped, ' + out.remaining + ' remain on Simulation_Ledger');
  return out;
}

// ───────────────────────────────────────────────────────────────────────────
// Restore — Status=Active brings a traded POPID back to Oakland (Commit 9)
//
// Pure planner over header+rows arrays (clasp-deployable; no cycle-path
// caller yet — the operator surface is scripts/restoreCitizen.js, which runs
// this same planner and executes the plan against a named spreadsheet).
// Same POPID, never a new identity. Archive history is kept: restore copies
// the latest snapshot onto Simulation_Ledger; nothing on Citizen_Archive is
// edited or deleted.
//
//   restoreCitizenPlan_(popId, src, cycle, opts) →
//     { action: 'noop' | 'flip' | 'restore', popId, slIndex, row, fields, reason }
//   src = { slHeaders, slRows, arHeaders, arRows }; opts.canonHoods = Set/array
//   Throws (fail-loud) on: missing everywhere; deceased latest exit; an SL row
//   already present alongside an archive-only expectation with mismatched
//   identity; snapshot header not a prefix-compatible layout of the SL header.
// ───────────────────────────────────────────────────────────────────────────

function restoreStampDate_(d) {
  var p = function(n) { return (n < 10 ? '0' : '') + n; };
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}

function restoreCitizenPlan_(popId, src, cycle, opts) {
  opts = opts || {};
  var id = String(popId || '').trim().toUpperCase();
  if (!/^POP-\d+$/.test(id)) throw new Error('restore: "' + popId + '" is not a POPID');
  var slH = src.slHeaders || [], slR = src.slRows || [], arH = src.arHeaders || [], arR = src.arRows || [];
  var iPop = slH.indexOf('POPID'), iSt = slH.indexOf('Status'), iRet = slH.indexOf('ReturnedCycle'), iUpd = slH.indexOf('LastUpdated');
  var iCause = slH.indexOf('HealthCause'), iSSC = slH.indexOf('StatusStartCycle'), iDest = slH.indexOf('MigrationDestination'), iHood = slH.indexOf('Neighborhood'), iLH = slH.indexOf('LifeHistory');
  if (iPop < 0 || iSt < 0) throw new Error('restore: Simulation_Ledger header lacks POPID/Status');
  var now = opts.now || new Date();
  var stamp = restoreStampDate_(now);
  var hoods = {};
  (opts.canonHoods || []).forEach(function(h) { hoods[String(h).trim().toLowerCase()] = true; });

  // 1. on Simulation_Ledger?
  var slHits = [];
  for (var r = 0; r < slR.length; r++) if (slR[r] && String(slR[r][iPop] || '').trim().toUpperCase() === id) slHits.push(r);
  if (slHits.length > 1) throw new Error('restore: ' + id + ' appears ' + slHits.length + ' times on Simulation_Ledger — fix the duplicate first');
  if (slHits.length === 1) {
    var row = slR[slHits[0]];
    var st = String(row[iSt] || '').trim().toLowerCase();
    if (st === 'active') return { action: 'noop', popId: id, slIndex: slHits[0], row: null, fields: {}, reason: 'already Active on Simulation_Ledger' };
    if (st === 'deceased') throw new Error('restore: ' + id + ' is deceased on Simulation_Ledger — not ReturnEligible');
    if (st !== 'traded') throw new Error('restore: ' + id + ' is "' + row[iSt] + '" on Simulation_Ledger — only Traded flips to Active here');
    var flip = {}; flip[slH[iSt]] = 'Active';
    if (iRet >= 0) flip[slH[iRet]] = cycle;
    if (iUpd >= 0) flip[slH[iUpd]] = stamp;
    return { action: 'flip', popId: id, slIndex: slHits[0], row: null, fields: flip, reason: 'Traded row still on Simulation_Ledger' };
  }

  // 2. archive-only: latest exit snapshot
  var aPop = arH.indexOf('POPID'), aExit = arH.indexOf('ExitCycle'), aReason = arH.indexOf('ArchiveReason'), aSchema = arH.indexOf('SchemaVersion');
  var snaps = [];
  for (var a = 0; a < arR.length; a++) if (arR[a] && String(arR[a][aPop] || '').trim().toUpperCase() === id) snaps.push(arR[a]);
  if (!snaps.length) throw new Error('restore: ' + id + ' is on neither Simulation_Ledger nor Citizen_Archive');
  snaps.sort(function(x, y) { return (Number(x[aExit]) || 0) - (Number(y[aExit]) || 0); });
  var latest = snaps[snaps.length - 1];
  var reason = String(latest[aReason] || '').trim();
  if (!CITIZEN_ARCHIVE_RETURN_ELIGIBLE[reason]) throw new Error('restore: ' + id + ' latest exit is "' + reason + '" (C' + latest[aExit] + ') — not ReturnEligible');
  var width = Number(latest[aSchema]) || 0;
  if (width < 1 || width > slH.length) throw new Error('restore: ' + id + ' snapshot SchemaVersion ' + latest[aSchema] + ' vs Simulation_Ledger width ' + slH.length + ' — restore must header-map, not pad');
  for (var c = 0; c < width; c++) {
    if (String(arH[c]) !== String(slH[c])) throw new Error('restore: Citizen_Archive column ' + (c + 1) + ' is "' + arH[c] + '" but Simulation_Ledger has "' + slH[c] + '" — layout drift, restore must header-map');
  }
  var out = [];
  for (var c2 = 0; c2 < slH.length; c2++) out.push(c2 < width ? (latest[c2] === undefined || latest[c2] === null ? '' : latest[c2]) : ''); // pad on the right when SL grew
  out[iSt] = 'Active';
  if (iRet >= 0) out[iRet] = cycle;
  if (iUpd >= 0) out[iUpd] = stamp;
  if (iCause >= 0) out[iCause] = '';
  if (iSSC >= 0) out[iSSC] = '';
  var backInOakland = iHood >= 0 && hoods[String(out[iHood] || '').trim().toLowerCase()];
  if (iDest >= 0 && backInOakland) out[iDest] = '';
  if (iLH >= 0) {
    var line = stamp + ' — [Return] Returned to Oakland (C' + cycle + ')';
    out[iLH] = String(out[iLH] || '').trim() ? String(out[iLH]).trim() + ' | ' + line : line;
  }
  return { action: 'restore', popId: id, slIndex: -1, row: out, fields: { Status: 'Active', ReturnedCycle: cycle }, reason: 'latest exit ' + reason + ' C' + latest[aExit] + (backInOakland ? '; hood is canon, MigrationDestination cleared' : '') };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports.restoreCitizenPlan_ = function() { return restoreCitizenPlan_.apply(null, arguments); };
  module.exports.CITIZEN_ARCHIVE_RETURN_ELIGIBLE = CITIZEN_ARCHIVE_RETURN_ELIGIBLE;
}
