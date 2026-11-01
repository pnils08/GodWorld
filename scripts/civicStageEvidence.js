'use strict';

// Read-only board evidence. Stage transitions/text belong to the shared helper.
// No dial defaults: the current, Cycle-matched dump must supply World_Config.
const { stageCatalogByDomain } = require('../lib/initiativePhaseContract');
const { buildHoodResolver } = require('./civicPetitions');
const { stationServingHoodCohort } = require('./civicTransitCohort');
const unavailable = reason => ({ available:false, metricMoved:false, reason });
function number(value, label) {
  if (!['number','string'].includes(typeof value) || String(value).trim() === '' || !Number.isFinite(Number(value))) {
    throw new Error(label + ' missing/invalid');
  }
  return Number(value);
}
function measureStageMovement(row, context = {}) {
  try {
    const cycle = number(context.cycle, 'observation Cycle');
    if (!Number.isInteger(cycle) || cycle < 1) throw new Error('observation Cycle invalid');
    const catalog = stageCatalogByDomain();
    const domain = String(row.PolicyDomain || '').trim().toLowerCase();
    const entry = Object.hasOwn(catalog, domain) ? catalog[domain] : null;
    if (!entry || !entry.playable) return unavailable('no delivering gate');
    const metric = entry.stage3Metric;
    if (!['hood', 'station-serving-hood'].includes(metric.scope) || metric.column.some(c => /[*/]/.test(c))) return unavailable('metric membership/reader not available');
    let baseline;
    try { baseline = JSON.parse(row.StageBaseline); }
    catch (_) { throw new Error('StageBaseline missing/malformed'); }
    if (!baseline || baseline.v !== 1 || !['conversion','vote'].includes(baseline.origin) ||
        baseline.tab !== metric.tab || baseline.scope !== metric.scope ||
        JSON.stringify(baseline.columns) !== JSON.stringify(metric.column) ||
        baseline.direction !== metric.direction || !Number.isFinite(Number(baseline.cityN)) || !Array.isArray(baseline.city) ||
        !baseline.keys || Array.isArray(baseline.keys) || !baseline.cityMiddle) throw new Error('baseline descriptor unavailable/unsupported');
    const baselineCycle = number(baseline.cycle, 'baseline Cycle');
    if (!Number.isInteger(baselineCycle) || baselineCycle < 1 || baselineCycle >= cycle) throw new Error('baseline must precede observation');
    const config = context.config;
    if (!config) throw new Error(context.configIssue || 'current World_Config dump unavailable');
    const domainMarginKey = 'civicDeliverMargin_' + domain;
    const marginKey = Object.hasOwn(config, domainMarginKey) ? domainMarginKey : 'civicDeliverMargin';
    const margin = number(config[marginKey], marginKey);
    const hold = number(config.civicDeliverHoldCycles, 'civicDeliverHoldCycles');
    if (margin < 0 || !Number.isInteger(hold) || hold < 1) throw new Error('delivery dials invalid');
    if (cycle - hold + 1 <= baselineCycle) throw new Error('post-baseline hold window unavailable');
    if (typeof context.readAudit !== 'function') throw new Error('metric observations unavailable');
    const keys = Object.keys(baseline.keys).sort();
    if (!keys.length) throw new Error('baseline cohort empty');
    const baselineMeans = {};
    for (const column of metric.column) {
      const middle = number(baseline.cityMiddle[column], 'baseline city middle');
      if (middle <= 0) throw new Error('baseline city middle must be positive');
      baselineMeans[column] = keys.reduce((sum, hood) => sum + number(baseline.keys[hood][column], 'baseline '+hood+'.'+column) / middle, 0) / keys.length;
    }
    let metricMoved = true;
    const observations = [];
    for (let c = cycle - hold + 1; c <= cycle; c++) {
      const audit = context.readAudit(c);
      if (!audit || number(audit.cycle, 'audit Cycle') !== c) throw new Error('metric observation C'+c+' unavailable/stale');
      const snapshots = audit.snapshots || {};
      const resolver = buildHoodResolver(snapshots.Neighborhood_Map);
      // The baseline owns the target membership (frozen at capture, as the engine's delivery edge reads it); a later
      // edit to AffectedNeighborhoods does not change what was frozen. The frozen hoods must still be canon hoods.
      if (keys.some(h=>resolver.resolve(h)!==h)) throw new Error('baseline target hood unknown');
      const rows = snapshots[metric.tab];
      if (!Array.isArray(rows)) throw new Error(metric.tab+' observation unavailable');
      const byHood = new Map();
      if (metric.scope === 'station-serving-hood') {
        const cohort = stationServingHoodCohort(rows, c, resolver);
        if (!cohort.available) throw new Error(cohort.reason);
        for (const [hood, values] of Object.entries(cohort.rows)) byHood.set(hood, values);
      } else {
        for (const r of rows) {
          const hood = resolver.resolve(r.Neighborhood);
          if (!hood || byHood.has(hood)) throw new Error(metric.tab+' unknown/duplicate hood');
          const stamp = metric.tab === 'Neighborhood_Map' ? r.Cycle : r.LastUpdated;
          if (number(stamp, metric.tab+' row Cycle') !== c) throw new Error(metric.tab+' row Cycle stale');
          byHood.set(hood,r);
        }
      }
      const differences = {};
      for (const column of metric.column) {
        const cohortHoods = metric.scope === 'station-serving-hood' ? [...byHood.keys()] : resolver.hoods;
        // Same frozen-membership test as the engine's delivery edge: a city reference that
        // changed since the baseline is not comparable.
        if (Number.isFinite(Number(baseline.cityN)) && cohortHoods.length !== Number(baseline.cityN)) throw new Error('city membership changed');
        if (Array.isArray(baseline.city) && [...cohortHoods].sort().join('|') !== baseline.city.join('|')) throw new Error('city membership changed');
        const levels = cohortHoods.map(h=>number((byHood.get(h)||{})[column], h+'.'+column)).sort((a,b)=>a-b);
        if (!levels.length) throw new Error('city metric cohort empty');
        const mid = Math.floor(levels.length/2);
        const middle = levels.length%2 ? levels[mid] : (levels[mid-1]+levels[mid])/2;
        if (middle <= 0) throw new Error('city middle must be positive');
        const mean = keys.reduce((sum,h)=>sum+number(byHood.get(h)[column],h+'.'+column)/middle,0)/keys.length;
        const raw = metric.direction === 'down' ? baselineMeans[column]-mean : mean-baselineMeans[column];
        const delta = Math.round(raw * 1000000) / 1000000; // the engine rounds each edge to 1e-6 before the hold test
        if (!['up','down'].includes(metric.direction)) throw new Error('metric direction unsupported');
        differences[column] = delta;
        // The contract: edge + 1e-9 >= margin.
        if (delta + 1e-9 < margin) metricMoved = false;
      }
      observations.push({cycle:c,differences});
    }
    return { available:true, metricMoved, baselineCycle, throughCycle:cycle, hold, margin, observations };
  } catch (e) { return unavailable(e.message); }
}
module.exports = { measureStageMovement };
