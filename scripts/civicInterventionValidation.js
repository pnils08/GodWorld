'use strict';
const { POLICY_DOMAINS } = require('./createInitiative');
const text = x => typeof x === 'string' && x.trim().length > 0;
module.exports = {};

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

// Initiatives in the World Job 6 — can the council be asked to renew this row?
// Node mirror of the engine's renewalEligibility_ (civicInitiativeEngine.js),
// plus the seat-side rules the engine never sees: one pending renewal per row
// (a vote staged and not yet held, or a pass whose money has not landed), and
// the amount inside the row's category band (budgetIssue). Checked at the wake
// and again at the Sunday fold. `row` is a beats-dump Initiative_Tracker row.
// Returns null when renewable, else the reason.
const RENEWABLE_PHASES = ['implementation-active', 'dispatch-live', 'pilot-active', 'pilot_evaluation', 'operational', 'disbursement-active'];
function renewDryClosePhase(notes) {
  const re = /\(was ([a-z_-]+)\)/g;
  let m, last = null;
  while ((m = re.exec(String(notes == null ? '' : notes))) !== null) last = m[1];
  return last && RENEWABLE_PHASES.includes(last) ? last : null;
}
function renewRowIssue(row, amount) {
  if (!row) return 'renew-row-not-found';
  const id = String(row.InitiativeID || '?');
  const status = String(row.Status || '').trim().toLowerCase();
  const mayoral = String(row.MayoralAction || '').trim().toLowerCase();
  if (!(status === 'override-passed' || (status === 'passed' && mayoral === 'signed'))) return 'renew-not-a-voted-program(' + id + ')';
  const stage = String(row.Stage || '').trim();
  if (stage !== 'Standing' && stage !== 'Delivering') return 'renew-stage-not-running(' + id + ' — Stage ' + (stage || 'blank') + ')';
  const phase = String(row.ImplementationPhase || '').trim().toLowerCase();
  if (phase === 'complete') {
    if (!renewDryClosePhase(row.MilestoneNotes)) return 'renew-complete-never-ran-dry(' + id + ')';
  } else if (!RENEWABLE_PHASES.includes(phase)) {
    return 'renew-phase-not-running(' + id + ' — ' + (phase || 'blank') + ')';
  }
  const voteCycle = String(row.RenewalVoteCycle == null ? '' : row.RenewalVoteCycle).trim();
  const outcome = String(row.RenewalOutcome == null ? '' : row.RenewalOutcome).trim();
  const credit = String(row.RenewalCreditCycle == null ? '' : row.RenewalCreditCycle).trim();
  if (voteCycle && !outcome) return 'renew-vote-already-pending(' + id + ' — C' + voteCycle + ')';
  if (outcome.indexOf('RENEWED') === 0 && !credit) return 'renew-money-not-landed-yet(' + id + ')';
  const band = budgetIssue(row.PolicyDomain, amount);
  return band ? band.replace(/^budget-/, 'renew-amount-') : null;
}

module.exports.renewRowIssue = renewRowIssue;
module.exports.renewDryClosePhase = renewDryClosePhase;
module.exports.RENEWABLE_PHASES = RENEWABLE_PHASES;
module.exports.categoryIssue = categoryIssue;
module.exports.budgetIssue = budgetIssue;
module.exports.reachHoods = reachHoods;
