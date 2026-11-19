/**
 * lib/employmentRoster.js — who works where, read off Simulation_Ledger (builder 2026-11-18).
 *
 * The Employment_Roster TAB is a one-shot March copy nobody maintains; a citizen's employer changes
 * only on the ledger (the career engine's hire / layoff, the mint, the Advancement_Intake door), so the
 * roster is built from the ledger every time it is read. Row shape = the tab's, so every reader holds:
 * BIZ_ID, POP_ID, CitizenName, RoleType, Status, MappingLayer.
 *
 * A row = an Active citizen whose EmployerBizId is a tracked business (BIZ-…). No row for: a blank
 * employer (the engine's hiring pool), SELF_EMPLOYED / UNTRACKED (not at a tracked business), or a
 * Retired / any non-Active citizen (not working there now). Pure; reads nothing, writes nothing.
 */
'use strict';

const HEAD = ['BIZ_ID', 'POP_ID', 'CitizenName', 'RoleType', 'Status', 'MappingLayer'];

function rosterFromLedger(ledgerRaw) {
  const h = (ledgerRaw && ledgerRaw[0]) || [], ix = (k) => h.indexOf(k);
  const iPop = ix('POPID'), iFirst = ix('First'), iLast = ix('Last'), iStat = ix('Status'), iRole = ix('RoleType'), iEmp = ix('EmployerBizId');
  if (iPop < 0 || iEmp < 0) throw new Error('rosterFromLedger: Simulation_Ledger has no ' + (iPop < 0 ? 'POPID' : 'EmployerBizId') + ' column');
  const out = [];
  for (const r of (ledgerRaw || []).slice(1)) {
    const pop = String(r[iPop] || '').trim(), emp = String(r[iEmp] || '').trim();
    if (!pop || !/^BIZ-/.test(emp)) continue;
    if (iStat >= 0 && String(r[iStat] || 'active').trim().toLowerCase() !== 'active') continue;
    const name = (String(iFirst >= 0 ? r[iFirst] || '' : '').trim() + ' ' + String(iLast >= 0 ? r[iLast] || '' : '').trim()).trim();
    if (!name) continue;
    out.push({ BIZ_ID: emp, POP_ID: pop, CitizenName: name, RoleType: iRole >= 0 ? String(r[iRole] || '').trim() : '', Status: 'Active', MappingLayer: 'ledger' });
  }
  return out;
}

// the same rows as a raw grid (header row first) — for a reader that works on sheet grids
function rosterGridFromLedger(ledgerRaw) {
  return [HEAD.slice()].concat(rosterFromLedger(ledgerRaw).map((o) => HEAD.map((k) => o[k])));
}

module.exports = { rosterFromLedger, rosterGridFromLedger, HEAD };
