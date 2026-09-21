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
