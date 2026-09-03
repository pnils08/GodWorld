/**
 * ============================================================================
 * NEIGHBORHOOD TRAJECTORY ENGINE v1.0
 * ============================================================================
 *
 * v1.0 (S315 / 2026-07-12, Mike-direct):
 * - Full repurpose of gentrificationEngine v1.1 (git mv, same file lineage).
 *   The gentrification block was a real-world Oakland displacement-study
 *   index (5yr income/rent change, WhitePopulationPct, HighEducationPct)
 *   whose input columns were never written by any phase — the detector was
 *   wired but permanently starved, and its premise (scarcity-era Oakland)
 *   contradicts prosperity-era canon. Replaced with a prosperity-native
 *   trajectory system fed entirely by columns the engine already produces
 *   every cycle.
 *
 * Tracks per-neighborhood trajectory through the prosperity era:
 *   decay / steady / growth
 *
 * Inputs (Neighborhood_Map, written by Phase 8 last cycle — 1-cycle lag):
 * - Sentiment, RetailVitality, CrimeIndex, EventAttractiveness (texture block)
 * - MigrationFlow (Phase 6 applyMigrationDrift, numeric −5..+5)
 * Scoring is city-relative (each hood vs this-run city mean), so the detector
 * survives range drift in the underlying signals. Deterministic — no rng.
 *
 * Outputs (Neighborhood_Map, cell-scoped intents only — T1.5 clobber rule):
 * - NeighborhoodTrajectory   decay | steady | growth
 * - TrajectoryMomentum       0–10, 5 = neutral; how entrenched the trajectory is
 * - TrajectoryStartCycle     cycle the current trajectory label began
 * - HousingPressure          0–10 prosperity strain; sustained growth raises it,
 *                            decay/steady bleed it off. Feeds citizen-side
 *                            DisplacementRisk in migrationTrackingEngine (kept:
 *                            in prosperity terms, rent strain on households).
 * - MedianIncome              living column — drifts with trajectory
 * - MedianRent                rendered each cycle from MedianIncome by the one
 *                            hood rent rule (engine.160, hoodRentFromIncome_)
 *
 * ctx.summary export: S.neighborhoodTrajectory = { hood: {trajectory, score,
 * momentum, pressure} } for same-cycle downstream consumers.
 *
 * Story hooks (ctx.summary.storyHooks + Ripple_Ledger via recordHookRipple_):
 * - NEIGHBORHOOD_RISING   (severity 5): trajectory flips to growth
 * - NEIGHBORHOOD_COOLING  (severity 6): trajectory flips to decay
 * - NEIGHBORHOOD_BOOM     (severity 7): growth sustained, momentum >= 8
 * - HOUSING_PRESSURE_HIGH (severity 7): pressure >= 8
 *
 * ============================================================================
 */

// ════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════════════════════════════

var TRAJECTORY_STATES = {
  DECAY: 'decay',
  STEADY: 'steady',
  GROWTH: 'growth'
};

// Score bands: composite score range is −5..+5 (five ±1 signals)
var TRAJECTORY_THRESHOLDS = {
  GROWTH_MIN: 2,   // score >= 2 → growth
  DECAY_MAX: -2    // score <= −2 → decay
};

// Income drift per cycle by trajectory (fractions). engine.160 (S414): rent no
// longer drifts on its own — MedianRent is rendered from MedianIncome by the one
// hood rent rule (hoodRentFromIncome_), so it follows income and nothing else.
var TRAJECTORY_DRIFT = {
  INCOME_GROWTH: 0.002,
  INCOME_DECAY: -0.001
};

// ════════════════════════════════════════════════════════════════════════════
// MAIN ENGINE
// ════════════════════════════════════════════════════════════════════════════

function processNeighborhoodTrajectory_(ctx) {
  var cycle = (ctx.summary && ctx.summary.cycleId) || (ctx.config && ctx.config.cycleCount) || 0;

  Logger.log('processNeighborhoodTrajectory_ v1.0: Starting...');

  var results = updateNeighborhoodTrajectories_(ctx, cycle);

  Logger.log('processNeighborhoodTrajectory_ v1.0: Complete. Analyzed: ' + results.analyzed +
    ', Growth: ' + results.growth + ', Decay: ' + results.decay + ', Hooks: ' + results.hooks);

  return results;
}


// ════════════════════════════════════════════════════════════════════════════
// TRAJECTORY DETECTION
// ════════════════════════════════════════════════════════════════════════════

function updateNeighborhoodTrajectories_(ctx, cycle) {
  var ss = ctx.ss;
  var empty = { analyzed: 0, growth: 0, decay: 0, hooks: 0 };
  var sheet = ss.getSheetByName('Neighborhood_Map');
  if (!sheet) return empty;

  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return empty;

  var header = values[0];
  var rows = values.slice(1);

  var idx = function(n) { return header.indexOf(n); };
  var iNeighborhood = idx('Neighborhood');
  var iSentiment = idx('Sentiment');
  var iRetail = idx('RetailVitality');
  var iCrime = idx('CrimeIndex');
  var iEvent = idx('EventAttractiveness');
  var iFlow = idx('MigrationFlow');
  var iTrajectory = idx('NeighborhoodTrajectory');
  var iMomentum = idx('TrajectoryMomentum');
  var iStart = idx('TrajectoryStartCycle');
  var iPressure = idx('HousingPressure');
  var iRent = idx('MedianRent');
  var iIncome = idx('MedianIncome');

  if (iTrajectory < 0 || iNeighborhood < 0) return empty; // schema not migrated — no-op

  // ── City means for relative scoring ──────────────────────────────────────
  var sums = { sent: 0, retail: 0, event: 0 };
  var counted = 0;
  for (var m = 0; m < rows.length; m++) {
    if (!rows[m][iNeighborhood]) continue;
    sums.sent += Number(rows[m][iSentiment]) || 0;
    sums.retail += Number(rows[m][iRetail]) || 0;
    sums.event += Number(rows[m][iEvent]) || 0;
    counted++;
  }
  if (!counted) return empty;
  var meanSent = sums.sent / counted;
  var meanRetail = sums.retail / counted;
  var meanEvent = sums.event / counted;

  var S = ctx.summary || {};
  ctx.summary = S;
  S.neighborhoodTrajectory = {};

  // engine.93 Task 10: last cycle's executed relocations, published by
  // migrationTrackingEngine as { hood: netDelta }. Consumed here because this
  // engine is the ONLY writer of HousingPressure — the alternative (migration
  // writing the column directly) would have made it a two-writer field, the
  // exact class of clobber the T1.5 cell-intent rule exists to prevent.
  var relocationDeltas = (S.relocationPressureDeltas &&
    typeof S.relocationPressureDeltas === 'object') ? S.relocationPressureDeltas : null;
  var relocationApplied = {};

  var analyzed = 0, growthN = 0, decayN = 0, hooks = 0;

  for (var r = 0; r < rows.length; r++) {
    var row = rows[r];
    var neighborhood = row[iNeighborhood];
    if (!neighborhood) continue;

    var sheetRow = r + 2;

    var sent = Number(row[iSentiment]) || 0;
    var retail = Number(row[iRetail]) || 0;
    var crime = Number(row[iCrime]) || 0;
    var eventAttract = Number(row[iEvent]) || 0;
    var flow = Number(row[iFlow]) || 0; // non-numeric legacy values → 0

    var prevTrajectory = String(row[iTrajectory] || TRAJECTORY_STATES.STEADY).toLowerCase();
    var prevMomentum = (iMomentum >= 0 && row[iMomentum] !== '') ? Number(row[iMomentum]) : 5;
    var prevPressure = (iPressure >= 0 && row[iPressure] !== '') ? Number(row[iPressure]) : 0;

    // ── Composite score, city-relative (−5..+5) ─────────────────────────────
    var score = 0;
    if (sent > meanSent + 0.05) score += 1;
    else if (sent < meanSent - 0.05) score -= 1;

    if (retail > meanRetail * 1.15) score += 1;
    else if (retail < meanRetail * 0.85) score -= 1;

    if (eventAttract > meanEvent * 1.2) score += 1;
    else if (eventAttract < meanEvent * 0.8) score -= 1;

    if (crime >= 2) score -= 1;
    else if (crime === 0) score += 1;

    if (flow >= 2) score += 1;
    else if (flow <= -2) score -= 1;

    var trajectory = TRAJECTORY_STATES.STEADY;
    if (score >= TRAJECTORY_THRESHOLDS.GROWTH_MIN) trajectory = TRAJECTORY_STATES.GROWTH;
    else if (score <= TRAJECTORY_THRESHOLDS.DECAY_MAX) trajectory = TRAJECTORY_STATES.DECAY;

    // ── Momentum: 0–10, 5 neutral; entrenchment tracker ─────────────────────
    var momentum = prevMomentum;
    if (trajectory === TRAJECTORY_STATES.GROWTH) momentum += 1;
    else if (trajectory === TRAJECTORY_STATES.DECAY) momentum -= 1;
    else momentum += (momentum > 5 ? -1 : (momentum < 5 ? 1 : 0)); // steady decays toward neutral
    momentum = Math.max(0, Math.min(10, momentum));

    // ── Housing pressure: prosperity strain ─────────────────────────────────
    var pressure = prevPressure;
    if (trajectory === TRAJECTORY_STATES.GROWTH) pressure += (momentum >= 7 ? 1 : 0.5);
    else if (trajectory === TRAJECTORY_STATES.DECAY) pressure -= 1;
    else pressure -= 0.5;

    // engine.93 Task 10: housing-supply response. Before this, pressure moved
    // only on the city-relative trajectory score — actual households moving in
    // and out of a hood changed nothing. migrationTrackingEngine publishes
    // per-hood deltas (+0.1 per arriving household, −0.05 per departing one)
    // and this is their consumer; no second writer of the column. The deltas
    // are LAST cycle's moves by construction (Phase5-Trajectory runs before
    // Phase5-MigrationTracking), which is the honest ordering: people move,
    // then the block feels it. The existing 0–10 clamp below bounds the result,
    // so the >= 8 rent kicker in TRAJECTORY_DRIFT fires on its own.
    if (relocationDeltas && Object.prototype.hasOwnProperty.call(relocationDeltas, neighborhood)) {
      var relDelta = Number(relocationDeltas[neighborhood]);
      if (isFinite(relDelta) && relDelta !== 0) {
        pressure += relDelta;
        relocationApplied[neighborhood] = relDelta;
      }
    }

    // Rounded to 2dp, not 1dp (engine.93 Task 10). At 1dp the −0.05 departure
    // delta rounded away to nothing, so a hood losing one household every cycle
    // never eased — the signal was silently swallowed by the granularity, and
    // consume-and-clear meant the residual was lost rather than carried. The
    // trajectory-only steps (±0.5, ±1) are unaffected by the finer rounding, and
    // no consumer assumes 1dp: loadNeighborhoodState passes the number through,
    // generateCrisisBuckets z-scores it and prints toFixed(2), the rent kicker
    // and hooks are >= 8 threshold tests.
    pressure = Math.round(Math.max(0, Math.min(10, pressure)) * 100) / 100;

    analyzed++;
    if (trajectory === TRAJECTORY_STATES.GROWTH) growthN++;
    if (trajectory === TRAJECTORY_STATES.DECAY) decayN++;

    // ── Persist changed cells (cell-scoped intents only — T1.5 rule) ────────
    if (trajectory !== prevTrajectory) {
      queueCellIntent_(ctx, 'Neighborhood_Map', sheetRow, iTrajectory + 1, trajectory,
        'neighborhood trajectory update', 'civic');
      if (iStart >= 0) {
        queueCellIntent_(ctx, 'Neighborhood_Map', sheetRow, iStart + 1, cycle,
          'trajectory start cycle', 'civic');
      }
    }
    if (iMomentum >= 0 && momentum !== prevMomentum) {
      queueCellIntent_(ctx, 'Neighborhood_Map', sheetRow, iMomentum + 1, momentum,
        'trajectory momentum', 'civic');
    }
    if (iPressure >= 0 && pressure !== prevPressure) {
      queueCellIntent_(ctx, 'Neighborhood_Map', sheetRow, iPressure + 1, pressure,
        'housing pressure', 'civic');
    }

    // ── Income drift: trajectory makes this a living column ─────────────────
    // incomeNow carries the post-drift value into the summary payload so
    // same-cycle consumers (Phase5-MigrationTracking relocation scoring) see
    // this cycle's number — the queued cell intents don't commit until Phase 10.
    var incomeNow = (iIncome >= 0 && row[iIncome] !== '' && !isNaN(Number(row[iIncome]))) ? Number(row[iIncome]) : null;
    if (incomeNow !== null) {
      var incFactor = 0;
      if (trajectory === TRAJECTORY_STATES.GROWTH) incFactor = TRAJECTORY_DRIFT.INCOME_GROWTH;
      else if (trajectory === TRAJECTORY_STATES.DECAY) incFactor = TRAJECTORY_DRIFT.INCOME_DECAY;
      if (incFactor !== 0) {
        var newIncome = Math.round(incomeNow * (1 + incFactor));
        if (newIncome !== incomeNow) {
          queueCellIntent_(ctx, 'Neighborhood_Map', sheetRow, iIncome + 1, newIncome,
            'trajectory income drift', 'civic');
          incomeNow = newIncome;
        }
      }
    }
    // ── engine.160: render MedianRent from the one hood rent rule ────────────
    // The column is a rendering of hoodRentFromIncome_ (share × MedianIncome / 12)
    // for the readers that take the sheet cell (migration re-pricing, crisis
    // buckets, the desk packets). Written only when the cell disagrees.
    var rentNow = hoodRentFromIncome_(ctx, incomeNow);
    if (iRent >= 0 && rentNow !== null) {
      var rentCell = (row[iRent] !== '' && !isNaN(Number(row[iRent]))) ? Number(row[iRent]) : null;
      if (rentCell !== rentNow) {
        queueCellIntent_(ctx, 'Neighborhood_Map', sheetRow, iRent + 1, rentNow,
          'canon rent render', 'civic');
      }
    }

    S.neighborhoodTrajectory[neighborhood] = {
      trajectory: trajectory,
      score: score,
      momentum: momentum,
      pressure: pressure,
      rent: rentNow,      // engine.160: the rule's rent, this cycle (engine.55 relocation scoring)
      income: incomeNow   // post-drift, this cycle
    };

    // ── Story hooks ─────────────────────────────────────────────────────────
    hooks += emitTrajectoryHooks_(ctx, cycle, neighborhood, prevTrajectory, trajectory, momentum, pressure);
  }

  // ── engine.93 Task 10: attribute + consume the relocation deltas ──────────
  // One row per cycle's move batch, not per move — the per-move CITIZEN_RELOCATED
  // hooks already carry each household's story (migrationTrackingEngine); this
  // records what those moves did to the neighborhoods they landed in.
  var appliedHoods = Object.keys(relocationApplied).sort();
  if (appliedHoods.length && typeof recordRipple_ === 'function') {
    var tighter = appliedHoods.filter(function(h) { return relocationApplied[h] > 0; });
    var easier = appliedHoods.filter(function(h) { return relocationApplied[h] < 0; });
    var detail = 'Households moving reset the pressure on ' + appliedHoods.length +
      ' neighborhood(s)' +
      (tighter.length ? '; tighter in ' + tighter.join(', ') : '') +
      (easier.length ? '; easier in ' + easier.join(', ') : '');
    var biggest = 0;
    for (var bh = 0; bh < appliedHoods.length; bh++) {
      var bv = relocationApplied[appliedHoods[bh]];
      if (Math.abs(bv) > Math.abs(biggest)) biggest = bv;
    }
    recordRipple_(ctx, {
      causeType: 'relocation-pressure',
      causeId: 'relocationPressureDeltas',
      causeDetail: detail,
      effectType: 'housing-pressure/relocation',
      targetScope: 'neighborhood',
      targetIds: appliedHoods,
      magnitude: biggest,
      duration: 1,
      sourceEngine: 'neighborhoodTrajectoryEngine'
    });
  }
  // Consume-and-clear: these are per-cycle deltas. Without the clear they would
  // re-apply every cycle and ratchet a hood to the 10 ceiling off one move.
  if (relocationDeltas) S.relocationPressureDeltas = {};

  return { analyzed: analyzed, growth: growthN, decay: decayN, hooks: hooks };
}


// ════════════════════════════════════════════════════════════════════════════
// STORY HOOKS
// ════════════════════════════════════════════════════════════════════════════

function emitTrajectoryHooks_(ctx, cycle, neighborhood, prevTrajectory, trajectory, momentum, pressure) {
  var S = ctx.summary;
  var emitted = 0;

  var push = function(hook) {
    S.storyHooks = S.storyHooks || [];
    S.storyHooks.push(hook);
    // engine.45 T1 instrumentation kept from gentrification lineage: hooks must
    // reach a sheet, not just ctx (trace E4).
    if (typeof recordHookRipple_ === 'function') recordHookRipple_(ctx, 'trajectory', hook, 'neighborhoodTrajectoryEngine');
    emitted++;
  };

  if (trajectory === TRAJECTORY_STATES.GROWTH && prevTrajectory !== TRAJECTORY_STATES.GROWTH) {
    push({
      hookType: 'NEIGHBORHOOD_RISING',
      severity: 5,
      description: neighborhood + ' turning upward: retail busy, events drawing crowds, people moving in',
      cycleGenerated: cycle,
      neighborhood: neighborhood,
      momentum: momentum
    });
  }

  if (trajectory === TRAJECTORY_STATES.DECAY && prevTrajectory !== TRAJECTORY_STATES.DECAY) {
    push({
      hookType: 'NEIGHBORHOOD_COOLING',
      severity: 6,
      description: neighborhood + ' cooling off: foot traffic down, storefronts quieter than the rest of the city',
      cycleGenerated: cycle,
      neighborhood: neighborhood,
      momentum: momentum
    });
  }

  if (trajectory === TRAJECTORY_STATES.GROWTH && momentum >= 8) {
    push({
      hookType: 'NEIGHBORHOOD_BOOM',
      severity: 7,
      description: neighborhood + ' boom sustained — momentum ' + momentum + '/10, the block everyone wants onto',
      cycleGenerated: cycle,
      neighborhood: neighborhood,
      momentum: momentum
    });
  }

  if (pressure >= 8) {
    push({
      hookType: 'HOUSING_PRESSURE_HIGH',
      severity: 7,
      description: neighborhood + ' housing pressure at ' + pressure + '/10: rents climbing, households stretching to stay',
      cycleGenerated: cycle,
      neighborhood: neighborhood,
      housingPressure: pressure
    });
  }

  return emitted;
}


// ════════════════════════════════════════════════════════════════════════════
// ENTRY POINT
// ════════════════════════════════════════════════════════════════════════════

// Called from godWorldEngine2.js as safePhaseCall_(ctx, 'Phase5-Trajectory',
// function() { processNeighborhoodTrajectory_(ctx); }) — both entry points.
