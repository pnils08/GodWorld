/**
 * ============================================================================
 * canonNeighborhoodLoader v1 (engine.99 Cohort 1 Task 2 — ADR-0016 first application)
 * ============================================================================
 *
 * The canonical neighborhood set, loaded from the Neighborhood_Map ledger.
 * ADR-0016: a data ledger is the truth source for its entity set; code reads
 * truth, it never embeds it. This is the pushed engine-side accessor — lib/
 * cannot serve the engine (.claspignore excludes it; Apps Script has no
 * imports), which is the wall that produced 8 divergent hardcoded hood
 * namespaces across 53 files.
 *
 * Seeds ONE ctx field at Phase 1:
 *   S.canonHoods = { list: [...canonical spellings, sheet row order],
 *                    set:  { lowercased-name: true },
 *                    core: [...CoreSimRank hoods, rank order] }
 *
 * CORE SUBSET (engine.99 Cohort 2): the ledger's CoreSimRank column marks the
 * hoods the citizen/evening/crisis engines operate on (historically the
 * embedded "OAKLAND NEIGHBORHOODS (12)" literal). Rank order IS draw order —
 * seeded rng consumption depends on it, so promoting/reordering core hoods is
 * a sheet edit with sim-wide behavioral reach, by design (Mike's lever).
 *
 * FAIL LOUD (ADR-0016): missing tab, missing Neighborhood header, or an empty
 * hood set throws — never a fallback to an embedded list (a silent fallback
 * recreates the drift with extra steps). safePhaseCall_ swallows the loader
 * throw into Engine_Errors, so the second wall is the accessors: consumers use
 * getCanonNeighborhoods_/isCanonNeighborhood_, which throw when the seed is
 * absent — every consumer phase then errors loud in its own frame instead of
 * running on a private list.
 *
 * Distinct from loadNeighborhoodState_ (Phase 2): that reads last cycle's
 * CONDITION of each hood (one-cycle lag by design). This reads the SET — which
 * hoods exist and how each is spelled — which has no lag semantics. Two reads
 * of a ~22-row sheet is the cost of not entangling them.
 *
 * Node-side mirror: lib/canonNeighborhoods.js (a cache of this ledger truth,
 * reconciled by scripts/auditHoodDrift.js — engine.99 Task 3/4).
 *
 * Read-only — no sheet writes, no intents. ES5-safe.
 * Plan: docs/plans/2026-08-02-neighborhood-truth-source-migration.md Task 2.
 * ============================================================================
 */

function loadCanonNeighborhoods_(ctx) {
  var S = ctx.summary || (ctx.summary = {});

  var sheet = ctx.ss.getSheetByName('Neighborhood_Map');
  if (!sheet) {
    throw new Error('loadCanonNeighborhoods_: Neighborhood_Map tab not found — the neighborhood ledger is the truth source (ADR-0016); refusing to run without it.');
  }

  var values = sheet.getDataRange().getValues();
  if (values.length < 2) {
    throw new Error('loadCanonNeighborhoods_: Neighborhood_Map has no data rows — empty truth source (ADR-0016).');
  }

  var header = values[0];
  var iHood = header.indexOf('Neighborhood');
  if (iHood < 0) {
    throw new Error('loadCanonNeighborhoods_: Neighborhood_Map has no "Neighborhood" header column.');
  }
  var iRank = header.indexOf('CoreSimRank');

  var list = [];
  var set = {};
  var ranked = [];
  for (var r = 1; r < values.length; r++) {
    var hood = (values[r][iHood] || '').toString().trim();
    if (!hood) continue;
    var key = hood.toLowerCase();
    if (set[key]) continue; // writer is one-row-per-hood; dedupe is insurance
    set[key] = true;
    list.push(hood);
    if (iRank >= 0) {
      var rank = Number(values[r][iRank]);
      if (!isNaN(rank) && rank > 0) ranked.push({ hood: hood, rank: rank });
    }
  }

  if (list.length === 0) {
    throw new Error('loadCanonNeighborhoods_: Neighborhood_Map yielded zero hood names — empty truth source (ADR-0016).');
  }

  ranked.sort(function(a, b) { return a.rank - b.rank; });
  var core = [];
  for (var c = 0; c < ranked.length; c++) core.push(ranked[c].hood);

  S.canonHoods = { list: list, set: set, core: core };
  S.canonHoodCount = list.length;
}

/**
 * Canonical hood list (sheet spellings, sheet row order). Throws if the
 * Phase-1 seed is absent — the fail-loud wall for consumers (ADR-0016).
 */
function getCanonNeighborhoods_(ctx) {
  var S = ctx && ctx.summary;
  if (!S || !S.canonHoods || !S.canonHoods.list || !S.canonHoods.list.length) {
    throw new Error('getCanonNeighborhoods_: canonical hood set not seeded — loadCanonNeighborhoods_ (Phase1-CanonHoods) did not run or failed. No embedded fallback (ADR-0016).');
  }
  return S.canonHoods.list.slice(); // copy — callers must not mutate the seed
}

/**
 * Core-sim hood list (CoreSimRank order — draw order for seeded rng). Throws
 * if unseeded OR the ledger marks no core hoods: the citizen/evening/crisis
 * engines cannot run on an empty pool, and an embedded fallback is the drift
 * this replaces (ADR-0016).
 */
function getCoreSimNeighborhoods_(ctx) {
  var S = ctx && ctx.summary;
  if (!S || !S.canonHoods || !S.canonHoods.core) {
    throw new Error('getCoreSimNeighborhoods_: canonical hood set not seeded — loadCanonNeighborhoods_ (Phase1-CanonHoods) did not run or failed. No embedded fallback (ADR-0016).');
  }
  if (!S.canonHoods.core.length) {
    throw new Error('getCoreSimNeighborhoods_: Neighborhood_Map has no CoreSimRank-marked hoods — the core-sim pool is ledger truth and it is empty (ADR-0016).');
  }
  return S.canonHoods.core.slice(); // copy — callers must not mutate the seed
}

/**
 * Case-insensitive membership test against the canonical set. Same throw
 * behavior as getCanonNeighborhoods_ when the seed is absent.
 */
function isCanonNeighborhood_(ctx, name) {
  var S = ctx && ctx.summary;
  if (!S || !S.canonHoods || !S.canonHoods.set) {
    throw new Error('isCanonNeighborhood_: canonical hood set not seeded — loadCanonNeighborhoods_ (Phase1-CanonHoods) did not run or failed. No embedded fallback (ADR-0016).');
  }
  if (!name) return false;
  return S.canonHoods.set[name.toString().trim().toLowerCase()] === true;
}
