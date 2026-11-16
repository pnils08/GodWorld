#!/usr/bin/env node
'use strict';

/**
 * Run: node scripts/eveningSeedHoods.test.js
 *
 * engine.289 (builder 2026-11-16: "Fix the culture bar", "fix the night life", "Of course restaurants matter").
 * The evening layer's seeds carry the hood the evening layer placed them in, so next Cycle's CULTURE / NIGHTLIFE
 * gates (applyCityDynamics.js) can credit a hood. Before: every city-event and famous-sighting seed had
 * neighborhood '' and counted citywide; spots and restaurants made no seed.
 *
 *   A. applyStorySeeds_ — city events, famous sightings, nightlife spots, the dinner crowd land on their hood.
 *   B. eventAttractBase_ (v3NeighborhoodWriter.js) — the new place seeds add no EventAttractiveness hit.
 *   C. compactStorySeeds_ (finalizeCycleState.js) — the hood and domain reach next Cycle's carry.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

let passed = 0;
let failed = 0;
function assert(label, cond, detail) {
  if (cond) { passed++; console.log('ok ' + label); }
  else { failed++; console.log('FAIL ' + label + ': ' + (detail || 'condition false')); }
}

function load(rel) {
  let uu = 0;
  const real = { Utilities: { getUuid: () => 'uuid-' + (++uu) }, Logger: { log: () => {} }, safeRand_: ctx => ctx.rng,
    Math, JSON, Object, Array, String, Number, Date, RegExp, Error, isNaN, isFinite, parseInt, parseFloat };
  const sb = new Proxy(real, { has: () => true, get: (t, k) => (k in t) ? t[k] : (typeof k === 'symbol' ? undefined : function () { return undefined; }) });
  vm.createContext(sb);
  const p = path.join(__dirname, '..', rel);
  vm.runInContext(fs.readFileSync(p, 'utf8'), sb, { filename: p });
  return real;
}

// The C116 evening as Riley_Digest recorded it (restaurants and the spot), plus two staged events and three sightings.
function evening() {
  return {
    cycleId: 116, neighborhoodDemographics: {}, demographicDrift: {}, generationalEvents: [], worldEvents: [], weather: {},
    cityDynamics: {}, worldPopulation: {}, domainPresence: {}, eventArcs: [], crimeMetrics: {},
    cityEvents: ['The Kelley Family Block Party', 'Lakeside Jazz Night'],
    cityEventDetails: [{ name: 'The Kelley Family Block Party', neighborhood: 'Fruitvale' }, { name: 'Lakeside Jazz Night', neighborhood: 'Lake Merritt' }],
    famousPeople: ['Theo Banks', 'Ernesto Quintero', 'Desmond Morton'],
    famousSightings: [{ name: 'Theo Banks', neighborhood: 'Uptown' }, { name: 'Ernesto Quintero', neighborhood: 'Uptown' }, { name: 'Desmond Morton', neighborhood: '' }],
    nightlife: { spots: ['Bridge & Barrel'], spotDetails: [{ name: 'Bridge & Barrel', neighborhood: 'Jack London' }] },
    eveningFood: { restaurants: ['Harborline Grill', 'Port Grind', 'Art House Kitchen'], restaurantDetails: [
      { bizId: 'BIZ-00044', name: 'Harborline Grill', neighborhood: 'Jack London' },
      { name: 'Port Grind', neighborhood: 'Jack London' },
      { name: 'Art House Kitchen', neighborhood: 'Temescal' }] },
    eveningMedia: { streaming: 'documentary run' }
  };
}

// ═════════════════════════════════════════════════════════════════
// A. the seeds land on their hood
// ═════════════════════════════════════════════════════════════════
const seedsMod = load('phase07-evening-media/applyStorySeeds.js');
const ctx = { ss: null, config: {}, summary: evening(), rng: () => 0.6, ledger: null };
seedsMod.applyStorySeeds_(ctx);
const seeds = ctx.summary.storySeeds || [];
const of = t => seeds.filter(s => s.seedType === t);

const ce = of('city-event');
assert('A1 each city event carries its own hood', ce.length === 2 && ce.some(s => s.neighborhood === 'Fruitvale' && /Kelley/.test(s.text)) && ce.some(s => s.neighborhood === 'Lake Merritt'), JSON.stringify(ce.map(s => [s.neighborhood, s.text])));
const fsd = of('famous-sighting');
assert('A2 sightings group by hood; the hoodless one stays citywide', fsd.length === 2
  && fsd.some(s => s.neighborhood === 'Uptown' && /Theo Banks/.test(s.text) && /Ernesto Quintero/.test(s.text) && s.domain === 'CULTURE')
  && fsd.some(s => s.neighborhood === '' && /Famous around town/.test(s.text) && /Desmond Morton/.test(s.text)), JSON.stringify(fsd.map(s => [s.neighborhood, s.text])));
const ns = of('nightlife-spot');
assert('A3 the night spot is a NIGHTLIFE seed at its hood', ns.length === 1 && ns[0].neighborhood === 'Jack London' && ns[0].domain === 'NIGHTLIFE' && /Bridge & Barrel/.test(ns[0].text), JSON.stringify(ns));
const ds = of('dining-spot');
assert('A4 each restaurant is a NIGHTLIFE seed at its hood', ds.length === 3 && ds.filter(s => s.neighborhood === 'Jack London').length === 2 && ds.some(s => s.neighborhood === 'Temescal') && ds.every(s => s.domain === 'NIGHTLIFE'), JSON.stringify(ds.map(s => [s.neighborhood, s.text])));
const tr = of('culture-trend');
assert('A5 the streaming trend stays citywide', tr.length === 1 && tr[0].neighborhood === '', JSON.stringify(tr));
assert('A6 every new seed is priority 2', [].concat(ce, fsd, ns, ds).every(s => s.priority === 2), JSON.stringify([].concat(ce, fsd, ns, ds).map(s => s.priority)));

// a spot or a restaurant with no hood makes no seed; no sightings list falls back to the names, citywide
{
  const S = evening();
  S.nightlife.spotDetails = [{ name: 'Nowhere Bar', neighborhood: '' }];
  S.eveningFood.restaurantDetails = [{ name: 'Ghost Diner' }];
  delete S.famousSightings;
  const c2 = { ss: null, config: {}, summary: S, rng: () => 0.6, ledger: null };
  seedsMod.applyStorySeeds_(c2);
  const sd2 = c2.summary.storySeeds || [];
  assert('A7 a hoodless spot or restaurant makes no seed', !sd2.some(s => s.seedType === 'nightlife-spot' || s.seedType === 'dining-spot'), JSON.stringify(sd2.filter(s => /spot/.test(s.seedType))));
  const f2 = sd2.filter(s => s.seedType === 'famous-sighting');
  assert('A8 no sightings list: one citywide line from the names, as before', f2.length === 1 && f2[0].neighborhood === '' && /Famous around town this cycle: Theo Banks, Ernesto Quintero, Desmond Morton/.test(f2[0].text), JSON.stringify(f2));
}

// ═════════════════════════════════════════════════════════════════
// B. EventAttractiveness unchanged by the place seeds ("Art House Kitchen" would hit the story-word test)
// ═════════════════════════════════════════════════════════════════
{
  const nw = load('phase08-v3-chicago/v3NeighborhoodWriter.js');
  const base = nw.eventAttractBase_({ cityEvents: [], worldEvents: [], storyHooks: [], storySeeds: seeds.filter(s => !/^(famous-sighting|nightlife-spot|dining-spot)$/.test(s.seedType)) });
  const withPlaces = nw.eventAttractBase_({ cityEvents: [], worldEvents: [], storyHooks: [], storySeeds: seeds });
  assert('B1 the place seeds add no EventAttractiveness seed hit', withPlaces.hits.seed === base.hits.seed, base.hits.seed + ' vs ' + withPlaces.hits.seed);
}

// ═════════════════════════════════════════════════════════════════
// C. the hood reaches next Cycle's carry
// ═════════════════════════════════════════════════════════════════
{
  const fc = load('phase09-digest/finalizeCycleState.js');
  const blob = fc.compactStorySeeds_({ cycleId: 116, storySeeds: seeds });
  const carried = blob.seeds;
  assert('C1 the carry keeps hood and domain of the evening seeds', carried.some(s => s.n === 'Jack London' && s.d === 'NIGHTLIFE' && s.t === 'dining-spot')
    && carried.some(s => s.n === 'Uptown' && s.d === 'CULTURE' && s.t === 'famous-sighting') && carried.some(s => s.n === 'Fruitvale' && s.t === 'city-event'), JSON.stringify(carried.filter(s => s.n)));
  // the Phase-2 gate's sum for Jack London NIGHTLIFE: three p2 seeds = 6 before the hood profile's weighting
  const jl = carried.filter(s => s.n === 'Jack London' && s.d === 'NIGHTLIFE').reduce((a, s) => a + s.p, 0);
  assert('C2 a hood with a spot and two busy restaurants carries NIGHTLIFE priority 6', jl === 6, String(jl));
}

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
