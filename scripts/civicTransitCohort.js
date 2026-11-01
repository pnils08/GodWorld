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
  // A hood's value is the sum of the stations located in it (the station's own
  // neighborhood). Corridor labels are catchment: no station is counted in two hoods.
  const stationHood = new Map();
  const values = {};
  for (const def of stationDefs) {
    const station = String(def?.station || '').trim();
    if (!station || stationHood.has(station)) return fail('station-map-invalid');
    const raw = String(def.neighborhood || '').trim();
    const hood = raw ? resolver.resolve(raw) : null;
    if (!hood || !resolver.hoods.includes(hood)) return fail('station-hood-unresolved:' + station + ':' + raw);
    stationHood.set(station, hood);
    values[hood] = 0;
  }
  const byStation = new Map();
  for (const row of rows) {
    const station = String(row?.Station || '').trim();
    if (!station) continue; // Transit_Metrics also contains corridor rows.
    // The tab appends every Cycle; only the observation Cycle's rows are evidence.
    if (Number(row.Cycle) !== Number(cycle)) continue;
    if (!stationHood.has(station)) return fail('station-not-configured:' + station);
    if (byStation.has(station)) return fail('duplicate-station:' + station);
    if (!(['number', 'string'].includes(typeof row.RidershipVolume) &&
          String(row.RidershipVolume).trim() !== '' && Number.isFinite(Number(row.RidershipVolume)) && Number(row.RidershipVolume) >= 0)) {
      return fail('station-ridership-invalid:' + station);
    }
    byStation.set(station, Number(row.RidershipVolume));
  }
  for (const [station, hood] of stationHood) {
    if (!byStation.has(station)) return fail('station-row-missing:' + station);
    values[hood] += byStation.get(station);
  }
  const cohortRows = Object.fromEntries(Object.keys(values).sort().map(hood => [hood, { RidershipVolume: values[hood] }]));
  return { available: true, reason: null, cycle: Number(cycle), tab: 'Transit_Metrics', scope: 'station-serving-hood', rows: cohortRows };
}

module.exports = { configuredStations, stationServingHoodCohort };
