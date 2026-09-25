'use strict';
const { POLICY_DOMAINS } = require('./createInitiative');
const { LIFECYCLE } = require('../lib/initiativePhaseContract');
const object = x => x && typeof x === 'object' && !Array.isArray(x);
const text = x => typeof x === 'string' && x.trim().length > 0;
function interventionIssue(catalog, key) {
  if (!object(catalog)) return 'catalog-not-landed';
  if (typeof key !== 'string' || !Object.hasOwn(catalog, key)) return 'unknown-intervention';
  const entry = catalog[key];
  if (!object(entry)) return 'invalid-intervention';
  if (entry.playable !== true) return 'domain-not-playable';
  const metric = entry.stage3Metric;
  if (!POLICY_DOMAINS.includes(entry.policyDomain) || !Object.hasOwn(LIFECYCLE, entry.type) ||
      !text(entry.effectChannel) || !object(metric) || !text(metric.tab) || !text(metric.scope) ||
      !['up', 'down'].includes(metric.direction) ||
      !(text(metric.column) || (Array.isArray(metric.column) && metric.column.length && metric.column.every(text)))) {
    return 'invalid-intervention';
  }
  return null;
}
module.exports = { interventionIssue };

// Initiatives in the World Job 2 — no menu. A propose files under a category
// (lib PROPOSAL_CATEGORIES, written straight to PolicyDomain) and a reach.
// Shared by the wake gate (cron-civic-run validateDatawakeMoves), the close
// gate (validateTrackerUpdates) and the mint (applyTrackerUpdates) so the three
// cannot drift.
function categoryIssue(category) {
  const { PROPOSAL_CATEGORIES } = require('../lib/initiativePhaseContract');
  if (!text(category)) return 'propose-missing-category';
  const c = category.trim().toLowerCase();
  if (!Object.hasOwn(PROPOSAL_CATEGORIES, c) || !POLICY_DOMAINS.includes(c)) return 'unknown-category';
  return null;
}

// Budget inside the category's band. Re-checked at the fold, not only at the
// wake: a move written before a rule landed must not mint around it (INIT-008,
// C108 — minted with no budget because only the wake gate checked).
function budgetIssue(category, budget) {
  const { parseBudgetMoney, BUDGET_BANDS } = require('../lib/initiativePhaseContract');
  if (budget === null || budget === undefined || String(budget).trim() === '') return 'budget-missing';
  const amount = parseBudgetMoney(budget);
  if (amount === null) return 'budget-unparseable(' + String(budget).slice(0, 40) + ')';
  const c = String(category || '').trim().toLowerCase();
  const band = Object.hasOwn(BUDGET_BANDS, c) ? BUDGET_BANDS[c] : null;
  if (!band) return 'budget-outside-band(no band for category ' + (c || '?') + ')';
  if (amount < band.min || amount > band.max) return 'budget-outside-band(' + c + ' band ' + band.min + '-' + band.max + ', got ' + amount + ')';
  return null;
}

// Reach → the explicit hood list the row mints with. `hood` keeps the named
// hoods (authority is checked per hood by the caller); `district` is every hood
// in a district seat's district; `all` is every canonical hood and belongs to
// citywide seats only. Returns { hoods } or { issue }. Never an empty list —
// an empty AffectedNeighborhoods fails the engine baseline (no-target-hoods).
function reachHoods(office, reach, namedHoods) {
  const { PROPOSAL_REACHES } = require('../lib/initiativePhaseContract');
  const { getNeighborhoodsForDistricts, getAllNeighborhoods } = require('../lib/districtMap');
  if (!text(reach)) return { issue: 'propose-missing-reach' };
  const r = reach.trim().toLowerCase();
  if (!PROPOSAL_REACHES.includes(r)) return { issue: 'unknown-reach(' + reach + ')' };
  const district = String((office && office.district) || '');
  const districtSeat = /^D\d$/.test(district);
  if (r === 'hood') {
    return Array.isArray(namedHoods) && namedHoods.length ? { hoods: namedHoods.slice() } : { issue: 'propose-missing-hoods' };
  }
  if (r === 'district') {
    if (!districtSeat) return { issue: 'reach-district-needs-a-district-seat' };
    const hoods = getNeighborhoodsForDistricts(district);
    return hoods.length ? { hoods } : { issue: 'reach-district-has-no-hoods(' + district + ')' };
  }
  if (districtSeat) return { issue: 'reach-all-is-citywide-seats-only' };
  return { hoods: getAllNeighborhoods() };
}

module.exports.categoryIssue = categoryIssue;
module.exports.budgetIssue = budgetIssue;
module.exports.reachHoods = reachHoods;
