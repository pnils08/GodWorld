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
 * - MedianRent / MedianIncome  living columns — drift with trajectory
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

// Rent/income drift per cycle by trajectory (fractions)
var TRAJECTORY_DRIFT = {
  RENT_GROWTH: 0.003,
  RENT_DECAY: -0.0015,
  RENT_PRESSURE_KICKER: 0.002,  // extra when HousingPressure >= 8
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
    pressure = Math.round(Math.max(0, Math.min(10, pressure)) * 10) / 10;

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

    // ── Rent/income drift: trajectory makes these living columns ────────────
    if (iRent >= 0 && row[iRent] !== '' && !isNaN(Number(row[iRent]))) {
      var rentFactor = 0;
      if (trajectory === TRAJECTORY_STATES.GROWTH) rentFactor = TRAJECTORY_DRIFT.RENT_GROWTH;
      else if (trajectory === TRAJECTORY_STATES.DECAY) rentFactor = TRAJECTORY_DRIFT.RENT_DECAY;
      if (pressure >= 8) rentFactor += TRAJECTORY_DRIFT.RENT_PRESSURE_KICKER;
      if (rentFactor !== 0) {
        var newRent = Math.round(Number(row[iRent]) * (1 + rentFactor));
        if (newRent !== Number(row[iRent])) {
          queueCellIntent_(ctx, 'Neighborhood_Map', sheetRow, iRent + 1, newRent,
            'trajectory rent drift', 'civic');
        }
      }
    }
    if (iIncome >= 0 && row[iIncome] !== '' && !isNaN(Number(row[iIncome]))) {
      var incFactor = 0;
      if (trajectory === TRAJECTORY_STATES.GROWTH) incFactor = TRAJECTORY_DRIFT.INCOME_GROWTH;
      else if (trajectory === TRAJECTORY_STATES.DECAY) incFactor = TRAJECTORY_DRIFT.INCOME_DECAY;
      if (incFactor !== 0) {
        var newIncome = Math.round(Number(row[iIncome]) * (1 + incFactor));
        if (newIncome !== Number(row[iIncome])) {
          queueCellIntent_(ctx, 'Neighborhood_Map', sheetRow, iIncome + 1, newIncome,
            'trajectory income drift', 'civic');
        }
      }
    }

    S.neighborhoodTrajectory[neighborhood] = {
      trajectory: trajectory,
      score: score,
      momentum: momentum,
      pressure: pressure
    };

    // ── Story hooks ─────────────────────────────────────────────────────────
    hooks += emitTrajectoryHooks_(ctx, cycle, neighborhood, prevTrajectory, trajectory, momentum, pressure);
  }

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
