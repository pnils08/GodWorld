'use strict';

const assert = require('assert');
const { buildHoodResolver } = require('./civicPetitions');
const { configuredStations, stationServingHoodCohort } = require('./civicTransitCohort');
const { measureStageMovement } = require('./civicStageEvidence');

const stations = configuredStations();
const labels = [...new Set(stations.flatMap(s => [s.neighborhood, ...(s.corridors || [])]))].sort();
const map = c => labels.map(Neighborhood => ({ Neighborhood, ChildAreas: '', Cycle: c }));
const resolver = buildHoodResolver(map(114));
const rows = (c, boost = 0) => stations.map(s => ({ Cycle: c, Station: s.station,
  RidershipVolume: 100 + (s.neighborhood === 'Downtown' ? boost : 0) }));
const baseline = stationServingHoodCohort(rows(114), 114, resolver);
assert(baseline.available && baseline.scope === 'station-serving-hood');
assert.strictEqual(baseline.rows.Downtown.RidershipVolume, 200);
const duplicate = stationServingHoodCohort([...rows(114), rows(114)[0]], 114, resolver);
assert.strictEqual(duplicate.available, false);
assert.match(duplicate.reason, /duplicate-station/);
const stale = stationServingHoodCohort(rows(113), 114, resolver);
assert.strictEqual(stale.available, false);
assert.match(stale.reason, /station-cycle-mismatch/);
const missing = stationServingHoodCohort(rows(114).slice(1), 114, resolver);
assert.strictEqual(missing.available, false);
assert.match(missing.reason, /station-row-missing/);

const levels = Object.values(baseline.rows).map(r => r.RidershipVolume).sort((a, b) => a - b);
const mid = Math.floor(levels.length / 2);
const cityMiddle = levels.length % 2 ? levels[mid] : (levels[mid - 1] + levels[mid]) / 2;
const initiative = { PolicyDomain: 'transit', AffectedNeighborhoods: 'Downtown',
  StageBaseline: JSON.stringify({ v: 1, origin: 'vote', cycle: 114,
    tab: 'Transit_Metrics', columns: ['RidershipVolume'], scope: 'station-serving-hood',
    keys: { Downtown: baseline.rows.Downtown }, cityMiddle: { RidershipVolume: cityMiddle } }) };
const measured = measureStageMovement(initiative, { cycle: 117,
  config: { civicDeliverMargin: 0.01, civicDeliverHoldCycles: 3 },
  readAudit: c => ({ cycle: c, snapshots: { Neighborhood_Map: map(c), Transit_Metrics: rows(c, 80) } }),
});
assert.strictEqual(measured.available, true, measured.reason);
assert.strictEqual(measured.metricMoved, true);
assert(measured.observations.every(o => o.differences.RidershipVolume > 0));
console.log('civic47 transit cohort: ok');
