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
 *                    core: [...CoreSimRank hoods, rank order],
 *                    district:   { hood: 'D<n>' }            (civic.18 4c)
 *                    byDistrict: { 'D<n>': [...hoods, row order] },
 *                    children:   { lowercased child area: parent hood },
 *                    childList:  [...child areas, sheet order] }   (engine.99 #9)
 *
 * CHILD AREAS (engine.99 Finding #9, S423): a place the world can SAY without a
 * row the engine has to run — Old Oakland, Brooklyn Basin, Montclair. The
 * ledger's ChildAreas column names them per hood; resolveHoodOrChild_ folds a
 * child to its parent and a hood to itself. Before this the fold lived in
 * three engine files and a Node list, and they disagreed.
 *
 * DISTRICT EDGE (civic.18 4c, S423): the ledger's District column is the one
 * truth for which council seat a hood sits under. Seeded here so the approval
 * engine (4d) reads it through getDistrictHoods_ instead of its own literal —
 * the literal had drifted (KONO under D2 while the sheet says D7; Coliseum,
 * Elmhurst and Montclair listed though none has a row). A blank District cell
 * simply leaves the hood out of every district — never a guessed seat.
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
  var iDistrict = header.indexOf('District');
  var iChildren = header.indexOf('ChildAreas');
  var iZone = header.indexOf('WeatherZone');       // engine.148 P2 — authored geography
  var iAdjacent = header.indexOf('Adjacent');      // engine.148 P2 — authored geography
  var iAttention = header.indexOf('AttentionWeight'); // engine.148 P2 — one shared attention knob

  var list = [];
  var set = {};
  var ranked = [];
  var district = {};
  var byDistrict = {};
  var children = {};
  var childList = [];
  var weatherZone = {};
  var adjacentRaw = {};
  var attention = {};
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
    if (iDistrict >= 0) {
      var d = (values[r][iDistrict] || '').toString().trim().toUpperCase();
      if (d) {
        district[hood] = d;
        if (!byDistrict[d]) byDistrict[d] = [];
        byDistrict[d].push(hood);
      }
    }
    if (iZone >= 0) weatherZone[hood] = (values[r][iZone] || '').toString().trim();
    if (iAdjacent >= 0) adjacentRaw[hood] = (values[r][iAdjacent] || '').toString();
    if (iAttention >= 0) attention[hood] = values[r][iAttention];
    if (iChildren >= 0) {
      var parts = (values[r][iChildren] || '').toString().split(',');
      for (var p = 0; p < parts.length; p++) {
        var child = parts[p].trim();
        if (!child) continue;
        var ck = child.toLowerCase();
        if (set[ck] || children[ck]) continue; // a hood is not a child; first parent wins
        children[ck] = hood;
        childList.push(child);
      }
    }
  }

  if (list.length === 0) {
    throw new Error('loadCanonNeighborhoods_: Neighborhood_Map yielded zero hood names — empty truth source (ADR-0016).');
  }

  ranked.sort(function(a, b) { return a.rank - b.rank; });
  var core = [];
  for (var c = 0; c < ranked.length; c++) core.push(ranked[c].hood);

  S.canonHoods = { list: list, set: set, core: core, district: district, byDistrict: byDistrict, children: children, childList: childList,
    weatherZone: iZone >= 0 ? weatherZone : null, attention: iAttention >= 0 ? attention : null };
  S.canonHoodCount = list.length;
  // engine.148 P2: adjacency is sheet truth (column `Adjacent`, comma list of
  // hood names). Mirrored so spillover is symmetric; a name off the map throws.
  S.neighborhoodAdjacency = iAdjacent >= 0 ? buildAdjacencyFromSheet_(ctx, adjacentRaw) : null;
}

function buildAdjacencyFromSheet_(ctx, raw) {
  var S = ctx.summary;
  var g = {};
  for (var i = 0; i < S.canonHoods.list.length; i++) g[S.canonHoods.list[i]] = [];
  for (var hood in raw) {
    if (!raw.hasOwnProperty(hood)) continue;
    var parts = raw[hood].split(',');
    for (var p = 0; p < parts.length; p++) {
      var name = parts[p].trim();
      if (!name) continue;
      var other = resolveHoodOrChild_(ctx, name);
      if (!other) throw new Error('loadCanonNeighborhoods_: Neighborhood_Map.Adjacent for ' + hood + ' names "' + name + '", which is not a hood or child area on the map (ADR-0016).');
      if (other === hood) continue;
      if (g[hood].indexOf(other) < 0) g[hood].push(other);
      if (g[other].indexOf(hood) < 0) g[other].push(hood);
    }
  }
  return g;
}

function getAdjacentHoods_(ctx, hood) {
  var S = ctx && ctx.summary;
  if (!S || !S.neighborhoodAdjacency) {
    throw new Error('getAdjacentHoods_: Neighborhood_Map has no Adjacent column or Phase1-CanonHoods did not run — adjacency is sheet truth (engine.148 P2).');
  }
  var a = S.neighborhoodAdjacency[hood];
  return a ? a.slice() : [];
}

// engine.148 P2: the zone label a hood carries on the sheet. Blank fails loud —
// weather is computed for every hood on the map, none may be invisible.
function getHoodWeatherZone_(ctx, hood) {
  var S = ctx && ctx.summary;
  if (!S || !S.canonHoods || !S.canonHoods.weatherZone) {
    throw new Error('getHoodWeatherZone_: Neighborhood_Map has no WeatherZone column or Phase1-CanonHoods did not run (engine.148 P2).');
  }
  var z = S.canonHoods.weatherZone[hood];
  if (!z) throw new Error('getHoodWeatherZone_: Neighborhood_Map.WeatherZone is blank for ' + hood + ' — author the cell (engine.148 P2).');
  return z;
}

// engine.148 P2: the one attention knob (0–2) — read by the spotlight bonus
// and, through an affine map, by event priority. Blank/non-numeric fails loud.
function getHoodAttention_(ctx, hood) {
  var S = ctx && ctx.summary;
  if (!S || !S.canonHoods || !S.canonHoods.attention) {
    throw new Error('getHoodAttention_: Neighborhood_Map has no AttentionWeight column or Phase1-CanonHoods did not run (engine.148 P2).');
  }
  var v = Number(S.canonHoods.attention[hood]);
  if (S.canonHoods.attention[hood] === '' || S.canonHoods.attention[hood] === undefined || !isFinite(v)) {
    throw new Error('getHoodAttention_: Neighborhood_Map.AttentionWeight is blank or non-numeric for ' + hood + ' — author the cell (engine.148 P2).');
  }
  return v;
}

// engine.148 P2: an event's neighborhood field. Blank → null (citywide,
// neutral). A non-blank name that is not a hood or child area throws — that
// is the drift signal, not a default.
function eventHoodOrNull_(ctx, name) {
  var raw = String(name || '').trim();
  if (!raw) return null;
  var hood = resolveHoodOrChild_(ctx, raw);
  if (!hood) throw new Error('eventHoodOrNull_: event names neighborhood "' + raw + '", which is not on Neighborhood_Map (ADR-0016).');
  return hood;
}

function countTrackedByHood_(ctx) {
  var S = ctx && ctx.summary;
  var L = ctx && ctx.ledger;
  if (!L || !L.headers || !L.rows) {
    throw new Error('countTrackedByHood_: ctx.ledger not loaded — initSimulationLedger_ must run before the first headcount read.');
  }
  var iN = L.headers.indexOf('Neighborhood'), iS = L.headers.indexOf('Status');
  if (iN < 0) throw new Error('countTrackedByHood_: Simulation_Ledger has no Neighborhood column.');
  var counts = { _other: 0 };
  for (var i = 0; i < S.canonHoods.list.length; i++) counts[S.canonHoods.list[i]] = 0;
  for (var r = 0; r < L.rows.length; r++) {
    var row = L.rows[r];
    if (!row) continue;
    if (iS >= 0 && String(row[iS] || '').trim().toLowerCase() !== 'active') continue;
    var raw = String(row[iN] || '').trim();
    if (!raw) continue;
    var hood = resolveHoodOrChild_(ctx, raw);
    if (hood) counts[hood] += 1; else counts._other += 1;
  }
  return counts;
}

// engine.148: tracked headcount per hood, counted once per cycle on first use
// from the ledger already in ctx (initSimulationLedger_ runs before Phase 1).
// Child spellings fold to their parent; names off the map land in `_other`.
function getHoodHeadcount_(ctx, hood) {
  var S = ctx && ctx.summary;
  if (!S || !S.canonHoods) {
    throw new Error('getHoodHeadcount_: canonical hood set not seeded — loadCanonNeighborhoods_ (Phase1-CanonHoods) did not run or failed.');
  }
  if (!S.hoodHeadcount) S.hoodHeadcount = countTrackedByHood_(ctx);
  var n = S.hoodHeadcount[hood];
  return n === undefined ? 0 : n;
}

// engine.148: 0 when the hood holds its floor, else (floor − count) / floor in
// (0, 1]. The floor is World_Config hoodCitizenFloor — missing fails loud
// (ADR-0015 §4); 0 on the cell switches the whole floor mechanism off.
function hoodFloorDeficit_(ctx, hood) {
  var floor = ctx && ctx.config ? Number(ctx.config.hoodCitizenFloor) : NaN;
  if (!isFinite(floor)) {
    throw new Error('hoodFloorDeficit_: World_Config hoodCitizenFloor missing — the engine.148 self-arm did not run (ADR-0015).');
  }
  if (floor <= 0) return 0;
  var n = getHoodHeadcount_(ctx, hood);
  return n >= floor ? 0 : (floor - n) / floor;
}

function underFloorHoods_(ctx) {
  var core = getCoreSimNeighborhoods_(ctx);
  var out = [];
  for (var i = 0; i < core.length; i++) {
    if (hoodFloorDeficit_(ctx, core[i]) > 0) out.push(core[i]);
  }
  return out;
}

/**
 * Hoods under one council district, sheet row order (civic.18 4c/4d). Throws
 * when the seed is absent — same wall as the accessors above. A district the
 * ledger names no hood for returns [] (the approval engine reads that as
 * city-wide, as it always did for an unknown seat). Case-insensitive on the
 * district key; a copy, never the seed.
 */
function getDistrictHoods_(ctx, districtId) {
  var S = ctx && ctx.summary;
  if (!S || !S.canonHoods || !S.canonHoods.byDistrict) {
    throw new Error('getDistrictHoods_: canonical hood set not seeded — loadCanonNeighborhoods_ (Phase1-CanonHoods) did not run or failed. No embedded fallback (ADR-0016).');
  }
  var key = String(districtId || '').trim().toUpperCase();
  var hoods = S.canonHoods.byDistrict[key];
  return hoods ? hoods.slice() : [];
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

/**
 * Fold any spoken place to the hood the engine simulates (engine.99 #9, S423):
 * a hood returns its own canonical spelling (case/space tolerant); a child area
 * returns its parent; anything else — City-wide, a Chicago hood, a typo — is
 * null, and the caller decides what null means there. Throws when the seed is
 * absent, like every accessor above. Never a substring match.
 */
function resolveHoodOrChild_(ctx, name) {
  var S = ctx && ctx.summary;
  if (!S || !S.canonHoods || !S.canonHoods.set || !S.canonHoods.children) {
    throw new Error('resolveHoodOrChild_: canonical hood set not seeded — loadCanonNeighborhoods_ (Phase1-CanonHoods) did not run or failed. No embedded fallback (ADR-0016).');
  }
  var key = String(name || '').trim().toLowerCase();
  if (!key) return null;
  if (S.canonHoods.set[key]) {
    var list = S.canonHoods.list;
    for (var i = 0; i < list.length; i++) if (list[i].toLowerCase() === key) return list[i];
  }
  return S.canonHoods.children[key] || null;
}
