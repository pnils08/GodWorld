/**
 * Economic Profile Lookup Utility
 *
 * Shared functions for mapping citizen RoleType to economic parameters.
 * Used by:
 *   - scripts/applyEconomicProfiles.js (Node.js seeding)
 *   - phase05-citizens/generationalWealthEngine.js (Apps Script, via copy)
 *
 * Usage:
 *   const econ = require('./lib/economicLookup');
 *   const profile = econ.lookupProfile('Longshoreman (Port of Oakland)', roleMapping, econParams);
 *   const income = econ.calculateIncome(profile, 3, rng);
 */

/**
 * Build an index from the economic parameters array for O(1) lookup by role name.
 * @param {Array} econParams - Array of economic parameter objects from economic_parameters.json
 * @returns {Object} Map of role name → economic profile object
 */
function buildParamIndex(econParams) {
  var index = {};
  for (var i = 0; i < econParams.length; i++) {
    index[econParams[i].role] = econParams[i];
  }
  return index;
}

/**
 * Look up the economic profile for a citizen's RoleType.
 * @param {string} roleType - The citizen's RoleType from Simulation_Ledger
 * @param {Object} roleMapping - The role_mapping.json object (roleType → paramName)
 * @param {Object} paramIndex - Index built by buildParamIndex()
 * @returns {Object|null} Economic profile, or null if SPORTS_OVERRIDE or unmapped
 */
function lookupProfile(roleType, roleMapping, paramIndex) {
  if (!roleType) return null;

  var mappedName = roleMapping[roleType.trim()];
  if (!mappedName) return null;
  if (mappedName === 'SPORTS_OVERRIDE') return null;

  return paramIndex[mappedName] || null;
}

/**
 * Calculate a role-based income for a citizen.
 *
 * Uses weighted-median distribution: 60% of the time the income clusters
 * near the median, 40% it spreads across the full range. This produces
 * realistic income distributions where most people earn near the median
 * but outliers exist in both directions.
 *
 * @param {Object} profile - Economic profile from lookupProfile()
 * @param {number} tier - Citizen tier (1-4). Tier 1 = elite, Tier 4 = generic.
 * @param {function} rng - Random number generator (0-1). Use ctx.rng or seeded RNG.
 * @param {Object} [opts] - Optional overrides
 * @param {number} [opts.careerMod] - Career modifier (0.8-1.2), default 1.0
 * @param {boolean} [opts.isRetired] - Apply pension modifier (0.55-0.65x)
 * @returns {number} Annual income in dollars, rounded to nearest integer
 */
function calculateIncome(profile, tier, rng, opts) {
  if (!profile) return 0;
  opts = opts || {};

  var min = profile.incomeRange[0];
  var max = profile.incomeRange[1];
  var median = profile.medianIncome;

  // Weighted distribution: 60% near median, 40% across range
  var base;
  if (rng() < 0.6) {
    // Cluster near median with +/- 20% of range width
    var spread = (max - min) * 0.2;
    base = median + (rng() - 0.5) * spread;
  } else {
    // Spread across full range
    base = min + rng() * (max - min);
  }

  // Tier modifier
  var tierMod = { 1: 1.3, 2: 1.15, 3: 1.0, 4: 0.95 }[tier] || 1.0;

  // Career modifier from Career Engine (promotions/layoffs affect this)
  var careerMod = opts.careerMod || 1.0;

  // Retirement pension modifier
  var retireMod = opts.isRetired ? (0.55 + rng() * 0.10) : 1.0;

  var income = base * tierMod * careerMod * retireMod;

  // Clamp to range (after modifiers, allow tier to push slightly above max)
  var floor = min * 0.8;
  var ceiling = max * tierMod * 1.1;
  income = Math.max(floor, Math.min(ceiling, income));

  return Math.round(income);
}

/**
 * WealthLevel is NOT derived here. (engine.120, S381)
 *
 * `deriveWealthLevel(income, netWorth)` lived here as the v14.2 income-proxy
 * formula and was retired by v15 (engine.103, S363) in favour of pure NetWorth
 * bands. The v15 formula lives at `phase05-citizens/generationalWealthEngine.js`
 * `deriveWealthLevel_` and runs unconditionally every cycle at
 * Phase5-GenerationalWealth — that is the column's SOLE writer.
 *
 * The old function stayed live here and `scripts/applyEconomicProfiles.js` kept
 * calling it, so any run of that script wrote v14.2 values over the engine's.
 * Deleted rather than redirected: a second copy of the bands is how this drift
 * class recurs. Anything needing a wealth band reads the WealthLevel column.
 * Plan: docs/plans/2026-08-18-wealthlevel-dual-writer-drift.md
 */

/**
 * Derive savings rate from consumer profile and income.
 * @param {string} consumerProfile - "low", "moderate", or "high-discretionary"
 * @param {number} income - Annual income
 * @param {function} rng - Random number generator
 * @returns {number} Savings rate as decimal (0.02 - 0.20)
 */
function deriveSavingsRate(consumerProfile, income, rng) {
  var ranges = {
    'low': [0.02, 0.05],
    'moderate': [0.05, 0.12],
    'high-discretionary': [0.12, 0.20]
  };
  var range = ranges[consumerProfile] || ranges['moderate'];
  return range[0] + rng() * (range[1] - range[0]);
}

/**
 * Check if a RoleType indicates a retired citizen.
 * @param {string} roleType - The citizen's RoleType
 * @returns {boolean}
 */
function isRetiredRole(roleType) {
  if (!roleType) return false;
  return /^retired\b/i.test(roleType.trim());
}

module.exports = {
  buildParamIndex: buildParamIndex,
  lookupProfile: lookupProfile,
  calculateIncome: calculateIncome,
  deriveSavingsRate: deriveSavingsRate,
  isRetiredRole: isRetiredRole
};
