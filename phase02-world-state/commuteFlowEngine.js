/**
 * ============================================================================
 * COMMUTE FLOW ENGINE v1.0 — engine.93 Task 9 (Mike-approved Track C)
 * ============================================================================
 *
 * The coupling the sim was missing: people work where they don't live.
 *
 * Every hood-level signal in the engine treated a citizen as if their whole day
 * happened on their own block — transit ridership scored off the station hood's
 * resident demographics, a station outage "affected" only the hood it sat in,
 * and a downtown office tower full of workers from six neighborhoods added
 * nothing to downtown's daytime retail. This builds the matrix that connects
 * them:
 *
 *   S.commuteFlows = { originHood: { destHood: householdWorkerCount } }
 *   S.hoodEmployerDepth = { hood: { rows, employees, growthWeighted } }   // engine.135 B2
 *
 * Origin is the citizen's `Neighborhood` (Simulation_Ledger); destination is
 * their employer's neighborhood (`EmployerBizId` → Business_Ledger.Neighborhood).
 * Self-employed and unemployed citizens work where they live, so they land on
 * the diagonal — that is a real commute pattern, not a gap.
 *
 * DETERMINISM: sorted keys, integer counts, no rng, no clock. Two runs over the
 * same ledger produce a byte-identical matrix — this is a read-and-aggregate
 * pass, not a simulation step.
 *
 * COVERAGE HONESTY: a citizen whose employer can't be resolved to a hood is
 * counted in `S.commuteFlowStats.unresolved`, never silently dropped and never
 * guessed onto the diagonal. The stats block is the diagnostic surface — if
 * coverage falls, that number moves and says so.
 *
 * Outputs (ctx.summary only — this engine writes NO sheet):
 * - S.commuteFlows       origin → dest → worker count
 * - S.commuteInbound     dest → total inbound workers (precomputed for consumers)
 * - S.commuteFlowStats   { citizens, resolved, unresolved, sameHood, crossHood,
 *                          pairs, unresolvedReasons }
 *
 * Consumers (engine.93 Task 9):
 * - updateTransitMetrics_ — ridership weighted by who actually rides in, and
 *   a disruption's affectedHoods expanded to the hoods that commute through it
 * - applyCityDynamics_ — daytime-population lift on employment-center hoods
 *
 * ============================================================================
 */

// Business_Ledger writes workplace neighborhoods in its own namespace; the
// citizen ledger uses another. These are the true aliases between them — NOT a
// fuzzy matcher. An unlisted name that matches no residence hood is counted as
// unresolved rather than guessed, so a new workplace hood shows up in the stats
// instead of quietly landing in the wrong neighborhood.
// engine.99 Cohort 2 — the ALIAS half of the old COMMUTE_HOOD_ALIASES is
// retired: 'Piedmont Avenue' spelling drift was fixed AT Business_Ledger
// (3 rows reconciled S352, ADR-0016 §4 — reconcile ledgers, don't distribute
// alias maps). What remains is GEOGRAPHIC HIERARCHY, not spelling: businesses
// legitimately sit in child areas (Old Oakland, Brooklyn Basin, ...) and the
// commute matrix folds them to their core hood. Do not add spelling entries —
// a misspelled ledger value is a data fix, not a new row here. Child→parent
// hierarchy as ledger truth is filed as engine.99 Finding #9.
var COMMUTE_CHILD_HOOD_FOLD = {
  'Old Oakland': 'Downtown',
  'Telegraph corridor': 'Temescal',
  'Brooklyn Basin': 'Jack London',
  'Coliseum': 'East Oakland'
};

// Workplace values that are real but carry no single hood. 'City-wide' is the
// honest case (a citywide authority); the Chicago-side entries are outside
// Oakland's commute geography entirely. Both are excluded from the matrix and
// reported, not treated as failures to fix.
var COMMUTE_NON_HOOD = ['City-wide', 'Chicago', 'Bridgeport'];


function buildCommuteFlows_(ctx) {
  var S = ctx.summary || {};
  ctx.summary = S;

  var stats = {
    citizens: 0, resolved: 0, unresolved: 0,
    sameHood: 0, crossHood: 0, pairs: 0,
    nonHoodWorkplace: 0, noEmployer: 0, unknownBiz: 0, unknownHood: 0
  };
  S.commuteFlows = {};
  S.commuteInbound = {};
  S.commuteFlowStats = stats;

  if (!ctx.ledger || !ctx.ledger.rows || !ctx.ledger.headers) {
    Logger.log('buildCommuteFlows_: no ctx.ledger — skipped');
    return S.commuteFlows;
  }

  // ── Business_Ledger: BIZ-ID → workplace hood ───────────────────────────────
  var bizHood = {};
  var bizSheet = ctx.ss && ctx.ss.getSheetByName ? ctx.ss.getSheetByName('Business_Ledger') : null;
  if (!bizSheet) {
    Logger.log('buildCommuteFlows_: Business_Ledger missing — skipped');
    return S.commuteFlows;
  }
  var bizVals = bizSheet.getDataRange().getValues();
  if (bizVals.length < 2) return S.commuteFlows;
  var bizH = bizVals[0];
  var iBid = bizH.indexOf('BIZ_ID');
  var iBnh = bizH.indexOf('Neighborhood');
  if (iBid < 0 || iBnh < 0) {
    Logger.log('buildCommuteFlows_: Business_Ledger schema unexpected — skipped');
    return S.commuteFlows;
  }
  // engine.135 B2 — tracked employer depth per hood, folded into this read
  // (the only Business_Ledger read before Phase 3). Exact Neighborhood match,
  // same as the commute map; 'City-wide' and child-area labels stay out of
  // the hood layer. Consumed by buildHoodEmploymentWeights_ as a bounded
  // presence signal — the ledger is the tracked subset, not a census.
  var iEmpCount = bizH.indexOf('Employee_Count');
  var iGrowth = bizH.indexOf('Growth_Rate');
  var depth = {};
  for (var b = 1; b < bizVals.length; b++) {
    var bid = String(bizVals[b][iBid] || '').trim();
    if (!bid) continue;
    var bh = String(bizVals[b][iBnh] || '').trim();
    bizHood[bid] = bh;
    if (!bh) continue;
    var empN = iEmpCount >= 0 ? (Number(bizVals[b][iEmpCount]) || 0) : 0;
    var grN = iGrowth >= 0 ? (Number(bizVals[b][iGrowth]) || 0) : 0;
    if (!depth[bh]) depth[bh] = { rows: 0, employees: 0, growthWeighted: 0 };
    depth[bh].rows++;
    depth[bh].employees += empN;
    depth[bh].growthWeighted += empN * grN / 100;
  }
  S.hoodEmployerDepth = depth;

  // ── Citizens: home hood → work hood ────────────────────────────────────────
  var headers = ctx.ledger.headers;
  var rows = ctx.ledger.rows;
  var iHood = headers.indexOf('Neighborhood');
  var iEmp = headers.indexOf('EmployerBizId');
  var iStatus = headers.indexOf('Status');
  if (iHood < 0) {
    Logger.log('buildCommuteFlows_: Simulation_Ledger has no Neighborhood — skipped');
    return S.commuteFlows;
  }

  var flows = {};
  for (var r = 0; r < rows.length; r++) {
    var row = rows[r];
    var home = String(row[iHood] || '').trim();
    if (!home) continue;

    // Only people currently living a life in Oakland commute.
    if (iStatus >= 0) {
      var st = String(row[iStatus] || '').toLowerCase();
      if (st === 'deceased' || st === 'inactive' || st === 'departed' || st === 'traded') continue;
    }
    stats.citizens++;

    var work = null;
    var emp = iEmp >= 0 ? String(row[iEmp] || '').trim() : '';

    if (!emp || emp === 'SELF_EMPLOYED') {
      // Works from or near home. The diagonal is a real pattern here — a
      // barber, a taquería owner, someone between jobs — not a data hole.
      work = home;
      stats.noEmployer++;
    } else if (!Object.prototype.hasOwnProperty.call(bizHood, emp)) {
      stats.unresolved++; stats.unknownBiz++;
      continue;
    } else {
      var raw = bizHood[emp];
      if (!raw) { stats.unresolved++; stats.unknownHood++; continue; }
      if (indexOfStr_(COMMUTE_NON_HOOD, raw) >= 0) {
        stats.unresolved++; stats.nonHoodWorkplace++;
        continue;
      }
      work = Object.prototype.hasOwnProperty.call(COMMUTE_CHILD_HOOD_FOLD, raw)
        ? COMMUTE_CHILD_HOOD_FOLD[raw] : raw;
    }

    if (!work) { stats.unresolved++; stats.unknownHood++; continue; }

    stats.resolved++;
    if (work === home) stats.sameHood++; else stats.crossHood++;

    if (!flows[home]) flows[home] = {};
    flows[home][work] = (flows[home][work] || 0) + 1;
  }

  // ── Deterministic ordering: rebuild with sorted keys ───────────────────────
  var ordered = {};
  var origins = Object.keys(flows).sort();
  var inbound = {};
  for (var o = 0; o < origins.length; o++) {
    var oh = origins[o];
    var dests = Object.keys(flows[oh]).sort();
    ordered[oh] = {};
    for (var d = 0; d < dests.length; d++) {
      var dh = dests[d];
      ordered[oh][dh] = flows[oh][dh];
      stats.pairs++;
      inbound[dh] = (inbound[dh] || 0) + flows[oh][dh];
    }
  }

  var inboundOrdered = {};
  var inKeys = Object.keys(inbound).sort();
  for (var ik = 0; ik < inKeys.length; ik++) inboundOrdered[inKeys[ik]] = inbound[inKeys[ik]];

  S.commuteFlows = ordered;
  S.commuteInbound = inboundOrdered;

  Logger.log('buildCommuteFlows_ v1.0: ' + stats.resolved + '/' + stats.citizens +
    ' commuters resolved (' + stats.crossHood + ' cross-hood, ' + stats.sameHood +
    ' local), ' + stats.pairs + ' origin-destination pairs, ' +
    stats.unresolved + ' unresolved');

  return S.commuteFlows;
}


/**
 * Workers commuting INTO a hood from elsewhere — the daytime population a hood
 * gains. Excludes its own residents working locally, since they are already in
 * every resident-based signal.
 */
function commuteInboundExternal_(S, hood) {
  var flows = (S && S.commuteFlows) || {};
  var total = 0;
  var origins = Object.keys(flows);
  for (var i = 0; i < origins.length; i++) {
    if (origins[i] === hood) continue;
    var dests = flows[origins[i]];
    if (dests && dests[hood]) total += dests[hood];
  }
  return total;
}


/**
 * Hoods whose residents commute INTO the given hood — the blast radius of a
 * disruption at that hood's station. A broken station in Downtown is not a
 * Downtown story; it is a story in every neighborhood that rides through it.
 */
function commuteOriginsFor_(S, hood, minWorkers) {
  var flows = (S && S.commuteFlows) || {};
  var floor = minWorkers || 1;
  var out = [];
  var origins = Object.keys(flows).sort();
  for (var i = 0; i < origins.length; i++) {
    if (origins[i] === hood) continue;
    var dests = flows[origins[i]];
    if (dests && dests[hood] >= floor) out.push(origins[i]);
  }
  return out;
}


// Apps Script has no Array.prototype.includes on older runtimes; keep the
// helper local so this file has no cross-file dependency.
function indexOfStr_(arr, v) {
  for (var i = 0; i < arr.length; i++) if (arr[i] === v) return i;
  return -1;
}
