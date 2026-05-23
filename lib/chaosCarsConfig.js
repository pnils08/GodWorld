/**
 * chaosCarsConfig.js — Chaos-cars engine safety constraints + (future) vehicle config.
 *
 * [engine/sheet] — S229 engine.11 T1.4 (chaos-cars plan
 * `docs/plans/2026-05-07-chaos-cars-engine.md` Phase 1 Foundation).
 *
 * Scope (S229 seed commit — T1.4 only):
 *   - FORBIDDEN_OUTCOMES — universal no-death constraint enforced across
 *     every vehicle config + dice roll downstream
 *   - validateOutcome(outcomeText) — throws if any forbidden token is
 *     present (case-insensitive substring match against word boundaries)
 *   - validateVehicleConfig(config) — convenience wrapper that scans a
 *     full per-vehicle config object's textureOutcomes[] for forbidden
 *     outcome strings; throws on first hit
 *
 * Out of scope until T2.1+:
 *   - VEHICLE_CONFIG_SCHEMA constant (Phase 2)
 *   - Per-vehicle outcome tables (Phase 2)
 *   - Dice roll mechanics (Phase 3)
 *   - Cascade integration with Engine A consequenceFloor (Phase 5)
 *
 * Plan reference: docs/plans/2026-05-07-chaos-cars-engine.md §T1.4
 * Acceptance criteria #4: "Universal constraint enforced: zero death-class
 * outcomes (death, died, fatal, kill, killed) across 5+ live cycles.
 * Validator throws if any vehicle config contains a forbidden outcome string."
 *
 * The constraint exists because the chaos-cars engine is designed to break
 * the cookie-cutter equilibrium with high-magnitude metric swings; death-
 * class outcomes are excluded from the design floor regardless of vehicle
 * type, dice probability, or target tier. Enforced at config-load time
 * (Phase 2) AND at dice-roll time (Phase 3) so neither a malformed config
 * nor a runtime-constructed outcome string can slip through.
 */

'use strict';

/**
 * Forbidden outcome tokens. Case-insensitive substring match against word
 * boundaries — `dead-end-street` would match `dead`; intentional, since
 * vehicle outcomes are short descriptors, not prose. False-positive cost
 * (rejecting an outcome containing "dying" in a benign sense) is
 * acceptable; false-negative cost (admitting a death-class outcome) is not.
 *
 * Token list: explicit + redundant to catch every common form. Easier to
 * over-enumerate at config time than to debug at runtime.
 */
const FORBIDDEN_OUTCOMES = Object.freeze([
  'death',
  'died',
  'dying',
  'dies',
  'fatal',
  'fatality',
  'fatalities',
  'kill',
  'kills',
  'killed',
  'killing',
  'deceased',
  'dead',
  'perish',
  'perished',
  'casualty',
  'casualties',
  'homicide',
  'suicide',
  'murder',
  'murdered',
]);

/**
 * Validate an outcome string against the forbidden list.
 *
 * @param {string} outcomeText — outcome descriptor (e.g., 'arrested',
 *   'ticketed', 'helped_by_police', 'minor injury')
 * @returns {true} when the outcome contains no forbidden tokens
 * @throws {Error} when any forbidden token is matched; message includes
 *   the matched token + the originating outcome for diagnostic
 *
 * Matching: lowercase the input, scan each FORBIDDEN_OUTCOMES entry,
 * use word-boundary regex so `dead` matches in `dead-end` but not in
 * `deadline` (substring would false-positive `deadline`). Wait — actually
 * `deadline` starts with `dead`, so a substring match WOULD flag it. The
 * word-boundary regex is the right call here.
 */
function validateOutcome(outcomeText) {
  if (typeof outcomeText !== 'string') {
    throw new Error(
      'chaos_cars: validateOutcome expects a string, got ' + typeof outcomeText
    );
  }
  if (outcomeText.length === 0) {
    throw new Error('chaos_cars: validateOutcome received empty outcome string');
  }

  const lower = outcomeText.toLowerCase();
  for (let i = 0; i < FORBIDDEN_OUTCOMES.length; i++) {
    const token = FORBIDDEN_OUTCOMES[i];
    const pattern = new RegExp('\\b' + escapeRegExp(token) + '\\b', 'i');
    if (pattern.test(lower)) {
      throw new Error(
        'chaos_cars: forbidden outcome detected: "' + token +
        '" in "' + outcomeText + '" — universal no-death constraint ' +
        '(plan §Acceptance #4); revise vehicle config to exclude.'
      );
    }
  }
  return true;
}

/**
 * Validate every textureOutcomes[] entry on a vehicle config. Convenience
 * wrapper for Phase 2 config-load time. Throws on first violation; the
 * thrown Error names both the offending vehicle + the offending outcome.
 *
 * @param {object} config — vehicle config object (see VEHICLE_CONFIG_SCHEMA
 *   when T2.1 ships). Expected fields: `name`, `textureOutcomes[]`. Each
 *   textureOutcomes[] entry must have an `outcome` string.
 * @returns {true} when no entry trips the forbidden list
 * @throws {Error} when any outcome string trips validateOutcome; the
 *   error context names the offending vehicle
 */
function validateVehicleConfig(config) {
  if (!config || typeof config !== 'object') {
    throw new Error(
      'chaos_cars: validateVehicleConfig expects an object, got ' + typeof config
    );
  }
  const vehicleName = config.name || '<unnamed-vehicle>';
  const outcomes = Array.isArray(config.textureOutcomes) ? config.textureOutcomes : [];

  for (let i = 0; i < outcomes.length; i++) {
    const entry = outcomes[i];
    if (!entry || typeof entry.outcome !== 'string') {
      continue; // shape-mismatch is Phase 2's problem; T1.4 only checks the outcome string
    }
    try {
      validateOutcome(entry.outcome);
    } catch (e) {
      throw new Error(
        'chaos_cars: vehicle "' + vehicleName + '" config invalid — ' + e.message
      );
    }
  }
  return true;
}

/**
 * Regex-escape a string. Defensive — every token in FORBIDDEN_OUTCOMES
 * is already a plain word, but if the list ever grows to include hyphens
 * or other regex metachars, the escape keeps the pattern correct.
 */
function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = {
  FORBIDDEN_OUTCOMES,
  validateOutcome,
  validateVehicleConfig,
};
