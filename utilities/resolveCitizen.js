/**
 * resolveCitizen.js — engine.90 shared citizen resolver (clasp-deployed core).
 *
 * One function, two runtimes, same semantics: this file is the pure core over
 * header+rows arrays; lib/resolveCitizen.js (Node) requires it and supplies
 * the sheets. Search order: Simulation_Ledger exact POPID → Citizen_Archive
 * every snapshot for that POPID (newest ExitCycle last). Name lookup: active
 * exact First+Last first, archive second; ambiguity throws (same rule as the
 * intake name index — a guess here is a wrong citizen).
 *
 *   resolveCitizen_(query, src) →
 *     { location: 'active' | 'archive' | 'missing',
 *       living: boolean,          // active AND Status not terminal
 *       row: object|null,         // header-mapped row (archive rows carry the metadata)
 *       archiveHistory: array }   // every exit snapshot, oldest → newest; [] if none
 *
 * src = { slHeaders, slRows, arHeaders, arRows } — arrays, no header row in rows.
 * Archived rows never go onto ctx.ledger.rows; event-loop consumers keep
 * iterating Simulation_Ledger only.
 */

var RESOLVE_TERMINAL_STATUS = { deceased: true, dead: true };

function resolveNameKey_(first, last) {
  return String(first || '').replace(/\s+/g, ' ').trim().toLowerCase() + '|' + String(last || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function resolveRowObject_(headers, row) {
  var o = {};
  for (var i = 0; i < headers.length; i++) o[headers[i]] = (row && row[i] !== undefined && row[i] !== null) ? row[i] : '';
  return o;
}

function resolveIsPopId_(q) { return /^POP-\d+$/.test(String(q || '').trim().toUpperCase()); }

function resolveCitizen_(query, src) {
  var q = String(query || '').trim();
  var out = { location: 'missing', living: false, row: null, archiveHistory: [] };
  if (!q) return out;
  var slH = (src && src.slHeaders) || [], slR = (src && src.slRows) || [];
  var arH = (src && src.arHeaders) || [], arR = (src && src.arRows) || [];
  var iPopS = slH.indexOf('POPID'), iFS = slH.indexOf('First'), iLS = slH.indexOf('Last'), iStS = slH.indexOf('Status');
  var iPopA = arH.indexOf('POPID'), iFA = arH.indexOf('First'), iLA = arH.indexOf('Last'), iExit = arH.indexOf('ExitCycle');
  var byPop = resolveIsPopId_(q);
  var popId = byPop ? q.toUpperCase() : null;
  var nameKey = null;
  if (!byPop) {
    var parts = q.replace(/\s+/g, ' ').split(' ');
    if (parts.length < 2) throw new Error('resolveCitizen_: a name needs First and Last ("' + q + '")');
    nameKey = resolveNameKey_(parts[0], parts.slice(1).join(' '));
  }
  // 1. active
  var hits = [];
  for (var r = 0; r < slR.length; r++) {
    var row = slR[r]; if (!row) continue;
    if (byPop) { if (String(row[iPopS] || '').trim().toUpperCase() === popId) hits.push(row); }
    else if (resolveNameKey_(row[iFS], row[iLS]) === nameKey) hits.push(row);
  }
  if (hits.length > 1) throw new Error('resolveCitizen_: "' + q + '" is ambiguous on Simulation_Ledger (' + hits.length + ' rows)');
  if (hits.length === 1) {
    out.location = 'active';
    out.row = resolveRowObject_(slH, hits[0]);
    var st = String(hits[0][iStS] || '').trim().toLowerCase();
    out.living = !RESOLVE_TERMINAL_STATUS[st];
    if (!popId) popId = String(hits[0][iPopS] || '').trim().toUpperCase();
  }
  // 2. archive — every snapshot for that POPID (or that name, when no active row named it)
  var snaps = [];
  for (var a = 0; a < arR.length; a++) {
    var ar = arR[a]; if (!ar) continue;
    var match = popId ? String(ar[iPopA] || '').trim().toUpperCase() === popId : resolveNameKey_(ar[iFA], ar[iLA]) === nameKey;
    if (match) snaps.push(ar);
  }
  if (!popId && snaps.length) {
    var pops = {}; for (var s0 = 0; s0 < snaps.length; s0++) pops[String(snaps[s0][iPopA] || '').trim().toUpperCase()] = true;
    var keys = Object.keys(pops);
    if (keys.length > 1) throw new Error('resolveCitizen_: "' + q + '" is ambiguous on Citizen_Archive (' + keys.join(', ') + ')');
  }
  snaps.sort(function(x, y) { return (Number(x[iExit]) || 0) - (Number(y[iExit]) || 0); });
  for (var s = 0; s < snaps.length; s++) out.archiveHistory.push(resolveRowObject_(arH, snaps[s]));
  if (out.location === 'missing' && snaps.length) {
    out.location = 'archive';
    out.row = out.archiveHistory[out.archiveHistory.length - 1];
    out.living = false;
  }
  return out;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    RESOLVE_TERMINAL_STATUS: RESOLVE_TERMINAL_STATUS,
    resolveNameKey_: resolveNameKey_,
    resolveRowObject_: resolveRowObject_,
    resolveIsPopId_: resolveIsPopId_,
    resolveCitizen_: resolveCitizen_
  };
}
