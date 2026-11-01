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
// A station's riders count in the hood it sits in and nowhere else: corridor-only hoods are not in the cohort.
const stationHoods = [...new Set(stations.map(s => s.neighborhood))].sort();
assert.deepStrictEqual(Object.keys(baseline.rows).sort(), stationHoods);
assert(!('Chinatown' in baseline.rows) && !('Dimond' in baseline.rows));
assert.strictEqual(Object.values(baseline.rows).reduce((sum, r) => sum + r.RidershipVolume, 0), 100 * stations.length);
const duplicate = stationServingHoodCohort([...rows(114), rows(114)[0]], 114, resolver);
assert.strictEqual(duplicate.available, false);
assert.match(duplicate.reason, /duplicate-station/);
const stale = stationServingHoodCohort(rows(113), 114, resolver);
assert.strictEqual(stale.available, false);
assert.match(stale.reason, /station-row-missing/);
// The live tab appends every Cycle: older and newer rows are history, not conflicts.
const history = stationServingHoodCohort([...rows(112, 50), ...rows(114), ...rows(115, 900)], 114, resolver);
assert(history.available && history.rows.Downtown.RidershipVolume === 200);
const missing = stationServingHoodCohort(rows(114).slice(1), 114, resolver);
assert.strictEqual(missing.available, false);
assert.match(missing.reason, /station-row-missing/);

const levels = Object.values(baseline.rows).map(r => r.RidershipVolume).sort((a, b) => a - b);
const mid = Math.floor(levels.length / 2);
const cityMiddle = levels.length % 2 ? levels[mid] : (levels[mid - 1] + levels[mid]) / 2;
const initiative = { PolicyDomain: 'transit', AffectedNeighborhoods: 'Downtown',
  StageBaseline: JSON.stringify({ v: 1, origin: 'vote', cycle: 114, captureCycle: 115,
    tab: 'Transit_Metrics', columns: ['RidershipVolume'], scope: 'station-serving-hood', direction: 'up',
    cityN: stationHoods.length, city: stationHoods,
    keys: { Downtown: baseline.rows.Downtown }, cityMiddle: { RidershipVolume: cityMiddle } }) };
const measured = measureStageMovement(initiative, { cycle: 117,
  config: { civicDeliverMargin: 0.01, civicDeliverHoldCycles: 3 },
  readAudit: c => ({ cycle: c, snapshots: { Neighborhood_Map: map(c), Transit_Metrics: rows(c, 80) } }),
});
assert.strictEqual(measured.available, true, measured.reason);
assert.strictEqual(measured.metricMoved, true);
assert(measured.observations.every(o => o.differences.RidershipVolume > 0));
// The frozen city reference is part of the baseline: a changed membership is not comparable (same test as the engine's edge).
const framed = (extra) => ({ ...initiative, StageBaseline: JSON.stringify({ ...JSON.parse(initiative.StageBaseline), ...extra }) });
const measure = row => measureStageMovement(row, { cycle: 117, config: { civicDeliverMargin: 0.01, civicDeliverHoldCycles: 3 },
  readAudit: c => ({ cycle: c, snapshots: { Neighborhood_Map: map(c), Transit_Metrics: [...rows(c - 5, 900), ...rows(c, 80)] } }) });
const same = measure(framed({}));
assert(same.available && same.metricMoved, same.reason);
// The baseline owns the target membership: editing AffectedNeighborhoods afterwards changes nothing that was frozen.
const edited = measure({ ...initiative, AffectedNeighborhoods: 'Downtown, Fruitvale' });
assert(edited.available && edited.metricMoved, edited.reason);
// The descriptor's required fields are checked at the read boundary: a flipped direction or a missing city reference is unusable.
const flipped = measure(framed({ direction: 'down' }));
assert.strictEqual(flipped.available, false);
assert.match(flipped.reason, /baseline descriptor unavailable/);
const noCity = measure(framed({ cityN: undefined, city: undefined }));
assert.strictEqual(noCity.available, false);
assert.match(noCity.reason, /baseline descriptor unavailable/);
const grown = measure(framed({ cityN: stationHoods.length + 1 }));
assert.strictEqual(grown.available, false);
assert.match(grown.reason, /city membership changed/);
const swapped = measure(framed({ cityN: stationHoods.length, city: [...stationHoods.slice(1), 'Elsewhere'].sort() }));
assert.strictEqual(swapped.available, false);
assert.match(swapped.reason, /city membership changed/);
console.log('civic47 transit cohort: ok');
