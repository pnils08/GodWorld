/**
 * lib/resolveCitizen.js — engine.90 Node half of the citizen resolver.
 * Same core as the clasp file (utilities/resolveCitizen.js is required, not
 * copied, so the two runtimes cannot drift); this half supplies the sheets.
 *
 *   const { resolveCitizen } = require('./lib/resolveCitizen');
 *   await resolveCitizen('POP-01052')        // or 'Herbert Jones'
 *   → { location, living, row, archiveHistory }
 *
 * Citizen_Archive absent on the sheet → treated as empty (the tab is ensured
 * per sheet by scripts/ensureCitizenArchive.js); loadSources() is exported so
 * a batch caller reads both tabs once.
 */
const sheets = require('./sheets');
const core = require('../utilities/resolveCitizen');

async function loadSources() {
  const sl = await sheets.getSheetData('Simulation_Ledger');
  let ar = [];
  const titles = (await sheets.listSheets()).map((s) => s.title);
  if (titles.includes('Citizen_Archive')) ar = await sheets.getSheetData('Citizen_Archive');
  return { slHeaders: sl[0] || [], slRows: sl.slice(1), arHeaders: ar[0] || [], arRows: ar.slice(1), archiveTabPresent: titles.includes('Citizen_Archive') };
}

async function resolveCitizen(query, src) {
  const s = src || await loadSources();
  return core.resolveCitizen_(query, s);
}

module.exports = { resolveCitizen, loadSources, resolveCitizen_: core.resolveCitizen_ };
