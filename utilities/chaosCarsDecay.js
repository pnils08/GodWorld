/**
 * chaosCarsDecay.js — asymmetric decay rules + residual stepper for chaos-cars.
 *
 * [engine/sheet] engine.11 chaos-cars T4.1 (plan §S265 + §Hard Constraints).
 * Clasped dual-use (utilities/, not lib/): read by BOTH the Phase-10 neighborhood
 * writer fold (residual decay) AND Phase-5 applyChaosDecay_ (business rows) — both
 * Apps Script. Module-guard tail for Node (dry-run/report scripts). var+global style
 * required for cross-file global visibility under Apps Script V8.
 *
 * DECAY MODEL — multiplicative fractional revert (S265 engine-sheet correction):
 * §S265's DECAY_RULES were written as flat per-cycle amounts (1.5/0.3/...) sized for
 * the pre-correction 0-100 magnitude scale, and are incompatible with T4.2's
 * `magnitude * pow(1 - rate, n)` formula (rate>1 → sign flip). After the magnitude
 * scale-correction (Sentiment/CrimeIndex → 0.02-0.15 fractional), a flat 1.5 revert is
 * absurd. So the rates here are FRACTIONS in [0,1): each cycle a residual reverts toward
 * baseline by `residual * rate`. Scale-invariant — works for a 0.05 Sentiment residual
 * and a $20 Annual_Revenue residual alike.
 *
 * LOCKED (plan §Hard Constraints): positive swings revert faster than negative on the
 * same metric. "Positive" = the GOOD direction for that column (mood up, crime down,
 * revenue up). The per-metric ratio is tunable (Phase 6 / T6.2); the inequality is not.
 *
 * Decay OWNERSHIP is tri-partite (resolves the double-count, §S265):
 *   - neighborhood (Sentiment/CrimeIndex/RetailVitality/EventAttractiveness)
 *       → decayed in the Phase-10 writer fold residual (ctx.summary.chaosNeighborhoodFold)
 *   - business (Annual_Revenue/Employee_Count) → decayed in Phase-5 applyChaosDecay_
 *   - citizen → NO decay row (the col-O compressLifeHistory fold is one-time)
 *   applyChaosDecay_ MUST filter to business-scope rows, else it double-counts the
 *   neighborhood residual that the writer already decays.
 */

/**
 * Per-column revert fractions. `up`/`down` key the residual's SIGN (up = positive
 * residual still in effect, down = negative). The GOOD direction carries the higher
 * fraction (reverts faster). Employee_Count = 0/0 → churn is permanent (never reverts).
 */
var DECAY_RULES = {
  // mood: good = up → up reverts fast, a sour mood lingers
  'Sentiment':           { up: 0.60, down: 0.15 },
  // crime: good = down → a reduction reverts fast, a spike sticks
  'CrimeIndex':          { up: 0.12, down: 0.60 },
  // retail/event: good = up → up reverts fast, a slump lingers
  'RetailVitality':      { up: 0.50, down: 0.15 },
  'EventAttractiveness': { up: 0.50, down: 0.15 },
  // profit: good = up → gains revert fast, losses linger
  'Annual_Revenue':      { up: 0.40, down: 0.10 },
  // headcount churn: permanent
  'Employee_Count':      { up: 0.00, down: 0.00 }
};

// Residual magnitudes below this snap to 0 (avoid infinite fractional tails).
// Sized for the fractional neighborhood cols; harmless for the larger business cols
// (a sub-0.01 residual is fully reverted there too). Permanent cols (rate 0) never reach it.
var CHAOS_DECAY_EPSILON = 0.01;

/**
 * Revert fraction for a column given the residual sign.
 * @param {string} column
 * @param {number} residual  signed residual (sign selects up/down rate)
 * @returns {number} fraction in [0,1); 0 for unknown columns (no decay rather than throw —
 *   an unknown column is a config bug caught upstream by validateAllChaosConfigs_).
 */
function chaosDecayFraction_(column, residual) {
  var rule = DECAY_RULES[column];
  if (!rule) return 0;
  return residual >= 0 ? rule.up : rule.down;
}

/**
 * Decay a signed residual by one cycle. Returns the residual that remains in effect
 * NEXT cycle (closer to 0). Snaps to 0 under CHAOS_DECAY_EPSILON. Permanent cols
 * (rate 0) return the residual unchanged.
 * @param {number} residual  signed residual currently in effect
 * @param {string} column
 * @returns {number} decayed residual
 */
function chaosDecayResidualOneCycle_(residual, column) {
  var r = Number(residual) || 0;
  if (r === 0) return 0;
  var frac = chaosDecayFraction_(column, r);
  if (frac <= 0) return r;                 // permanent — no revert
  var next = r * (1 - frac);
  if (Math.abs(next) < CHAOS_DECAY_EPSILON) return 0;
  return next;
}

/**
 * Residual still in effect `cyclesSince` cycles after an initial swing — the closed
 * form of repeated chaosDecayResidualOneCycle_ (T4.2 uses this for business rows read
 * from Chaos_Cars). Same sign throughout (a swing doesn't change direction as it decays).
 * @param {number} initialMagnitude  signed initial swing
 * @param {string} column
 * @param {number} cyclesSince  >=0 integer
 * @returns {number} residual after cyclesSince cycles (0 under epsilon)
 */
function chaosResidualAfter_(initialMagnitude, column, cyclesSince) {
  var r = Number(initialMagnitude) || 0;
  var n = Math.max(0, Math.floor(Number(cyclesSince) || 0));
  if (r === 0) return 0;
  var frac = chaosDecayFraction_(column, r);
  if (frac <= 0) return r;                 // permanent
  var remaining = r * Math.pow(1 - frac, n);
  if (Math.abs(remaining) < CHAOS_DECAY_EPSILON) return 0;
  return remaining;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    DECAY_RULES: DECAY_RULES,
    CHAOS_DECAY_EPSILON: CHAOS_DECAY_EPSILON,
    chaosDecayFraction_: chaosDecayFraction_,
    chaosDecayResidualOneCycle_: chaosDecayResidualOneCycle_,
    chaosResidualAfter_: chaosResidualAfter_
  };
}
