'use strict';

// Read-only mirror of civicTransitStageCohort_ in the protected engine patch.
// The station service geography comes from the engine's own configuration.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const STATION_SOURCE = path.join(__dirname, '..', 'utilities', 'ensureTransitMetrics.js');

function configuredStations(sourceFile = STATION_SOURCE) {
  const source = fs.readFileSync(sourceFile, 'utf8');
  const match = source.match(/var OAKLAND_BART_STATIONS\s*=\s*(\[[\s\S]*?\n\]);/);
  if (!match) throw new Error('station-map-unavailable');
  const stations = vm.runInNewContext('(' + match[1] + ')', Object.create(null), { timeout: 100 });
  if (!Array.isArray(stations) || !stations.length) throw new Error('station-map-unavailable');
  return stations;
}

function stationServingHoodCohort(rows, cycle, resolver, stationDefs = configuredStations()) {
  const fail = reason => ({ available: false, reason, cycle, tab: 'Transit_Metrics', scope: 'station-serving-hood', rows: null });
  if (!Number.isInteger(Number(cycle)) || Number(cycle) < 1) return fail('bad-observation-cycle');
  if (!Array.isArray(rows) || !rows.length) return fail('transit-tab-empty');
  if (!resolver || !Array.isArray(resolver.hoods) || !resolver.hoods.length || typeof resolver.resolve !== 'function') return fail('canon-hoods-unavailable');
  if (!Array.isArray(stationDefs) || !stationDefs.length) return fail('station-map-unavailable');
  const serves = new Map();
  for (const def of stationDefs) {
    const station = String(def?.station || '').trim();
    if (!station || serves.has(station)) return fail('station-map-invalid');
    const hoods = new Set();
    for (const label of [def.neighborhood, ...(Array.isArray(def.corridors) ? def.corridors : [])]) {
      const raw = String(label || '').trim();
      if (!raw) continue;
      const hood = resolver.resolve(raw);
      if (!hood || !resolver.hoods.includes(hood)) return fail('station-hood-unresolved:' + station + ':' + raw);
      hoods.add(hood);
    }
    if (!hoods.size) return fail('station-has-no-hood:' + station);
    serves.set(station, [...hoods]);
  }
  const byStation = new Map();
  for (const row of rows) {
    const station = String(row?.Station || '').trim();
    if (!station) continue; // Transit_Metrics also contains corridor rows.
    if (!serves.has(station)) return fail('station-not-configured:' + station);
    if (byStation.has(station)) return fail('duplicate-station:' + station);
    if (Number(row.Cycle) !== Number(cycle)) return fail('station-cycle-mismatch:' + station);
    if (!(['number', 'string'].includes(typeof row.RidershipVolume) &&
          String(row.RidershipVolume).trim() !== '' && Number.isFinite(Number(row.RidershipVolume)) && Number(row.RidershipVolume) >= 0)) {
      return fail('station-ridership-invalid:' + station);
    }
    byStation.set(station, Number(row.RidershipVolume));
  }
  const values = Object.fromEntries(resolver.hoods.map(h => [h, 0]));
  for (const [station, hoods] of serves) {
    if (!byStation.has(station)) return fail('station-row-missing:' + station);
    for (const hood of hoods) values[hood] += byStation.get(station);
  }
  const cohortRows = Object.fromEntries(Object.entries(values).filter(([, value]) => value > 0)
    .map(([hood, value]) => [hood, { RidershipVolume: value }]));
  if (!Object.keys(cohortRows).length) return fail('no-station-served-hoods');
  return { available: true, reason: null, cycle: Number(cycle), tab: 'Transit_Metrics', scope: 'station-serving-hood', rows: cohortRows };
}

module.exports = { configuredStations, stationServingHoodCohort };
