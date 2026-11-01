'use strict';

const crypto = require('crypto');
const { getDistrictForNeighborhood } = require('../lib/districtMap');

const hash = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const finiteMoney = value => typeof value === 'number' && Number.isFinite(value) && value >= 0;

function activeHolder(office, officeRows) {
  const row = (officeRows || []).find(r => String(r.OfficeId || '') === String(office.officeId || ''));
  if (!row) return { available: false, reason: 'office row missing' };
  if (String(row.PopId || row.POPID || '').toUpperCase() !== String(office.popid || '').toUpperCase())
    return { available: false, reason: 'holder changed or POPID mismatch' };
  if (!['active', 'recovering'].includes(String(row.Status || '').toLowerCase()))
    return { available: false, reason: 'office not active' };
  return { available: true, row };
}

function treasuryBalance(rows, cycle) {
  if (!Array.isArray(rows) || !rows.length) return { available: false, reason: 'treasury rows unavailable' };
  const current = rows.filter(r => Number(r.Cycle) === Number(cycle));
  if (!current.length) return { available: false, reason: 'treasury export not current Cycle' };
  const last = current[current.length - 1];
  const value = Number(last.BalanceAfter);
  if (!Number.isFinite(value) || value < 0 || last.BalanceAfter == null || String(last.BalanceAfter).trim() === '')
    return { available: false, reason: 'treasury balance malformed' };
  return { available: true, value, sourceRef: 'City_Treasury C' + cycle + ' ending row',
    revision: hash(current) };
}

function classifyAction(action, office, policy) {
  if (!policy || !policy.version || !finiteMoney(policy.localEventMaxCost) ||
      !finiteMoney(policy.localServiceMaxCost) || !finiteMoney(policy.citywideMaxCost) ||
      !Number.isInteger(policy.localEventMaxCycles) || policy.localEventMaxCycles < 1)
    return { route: 'hold', reason: 'delegated-authority-policy-unavailable' };
  if (!action || !['event', 'service', 'program', 'capital'].includes(action.capability))
    return { route: 'hold', reason: 'unsupported-capability' };
  const hoods = Array.isArray(action.hoods) ? action.hoods : [];
  if (!hoods.length || hoods.some(h => !getDistrictForNeighborhood(h)))
    return { route: 'hold', reason: 'canonical-target-geography-required' };
  if (!finiteMoney(action.cost) || !Number.isInteger(action.durationCycles) || action.durationCycles < 1)
    return { route: 'hold', reason: 'typed-cost-and-duration-required' };
  const isMayor = office.officeId === 'MAYOR-01';
  const district = String(office.district || '');
  if (!isMayor && (!/^D\d$/.test(district) || hoods.some(h => getDistrictForNeighborhood(h) !== district)))
    return { route: 'hold', reason: 'outside-seat-geography' };
  const districts = new Set(hoods.map(getDistrictForNeighborhood));
  const citywide = action.scope === 'citywide' || districts.size > 1;
  if (citywide && !isMayor) return { route: 'vote', reason: 'cross-district-authority' };
  if (action.capability === 'capital' || action.ongoing === true || action.capability === 'program')
    return { route: 'vote', reason: 'ongoing-or-capital-obligation' };
  if (action.capability === 'event' && action.durationCycles > policy.localEventMaxCycles)
    return { route: 'vote', reason: 'event-duration-exceeds-delegation' };
  const maxCost = citywide ? policy.citywideMaxCost : action.capability === 'event'
    ? policy.localEventMaxCost : policy.localServiceMaxCost;
  if (action.cost > maxCost) return { route: 'vote', reason: 'cost-exceeds-delegation' };
  return { route: 'delegated', policyVersion: policy.version, cost: action.cost,
    scope: citywide ? 'citywide' : district };
}

function planReservations(actions, options) {
  const { officeRows, treasuryRows, cycle, policy, existingReservations = [] } = options;
  const balance = treasuryBalance(treasuryRows, cycle);
  if (!balance.available) return { available: false, reason: balance.reason, results: [] };
  if (existingReservations.some(r => !finiteMoney(r.cost) || !r.actionId))
    return { available: false, reason: 'reservation journal malformed', results: [] };
  const reservedById = new Map(existingReservations
    .filter(r => ['reserved', 'scheduled', 'reconciling'].includes(r.status))
    .map(r => [r.actionId, r]));
  let remaining = balance.value - [...reservedById.values()].reduce((n, r) => n + r.cost, 0);
  if (!Number.isFinite(remaining) || remaining < 0)
    return { available: false, reason: 'reservations exceed typed balance', results: [] };
  const results = [];
  for (const item of actions) {
    const holder = activeHolder(item.office, officeRows);
    const classification = classifyAction(item.action, item.office, policy);
    let status = 'held', reason = null;
    if (!holder.available) reason = holder.reason;
    else if (classification.route !== 'delegated') reason = classification.reason;
    else if (reservedById.has(item.actionId)) {
      const old = reservedById.get(item.actionId);
      if (old.cost === item.action.cost && old.payloadHash === hash(item.action)) status = 'already-reserved';
      else reason = 'action-identity-reservation-conflict';
    } else if (item.action.cost > remaining) reason = 'insufficient-unreserved-balance';
    else {
      status = 'reserved'; remaining -= item.action.cost;
      reservedById.set(item.actionId, { actionId: item.actionId, cost: item.action.cost,
        payloadHash: hash(item.action), status: 'reserved' });
    }
    results.push({ actionId: item.actionId, status, reason,
      policyVersion: policy && policy.version || null,
      treasuryRevision: balance.revision,
      cost: item.action && item.action.cost });
  }
  return { available: true, balance: balance.value, remaining, treasuryRevision: balance.revision, results };
}

module.exports = { activeHolder, treasuryBalance, classifyAction, planReservations, hash };
