#!/usr/bin/env node
'use strict';
/**
 * Run: node scripts/hoodAdmission.test.js
 *
 * engine.135 — Employment System Cascade, Phase F (placement by net worth).
 * Builder point 9: a citizen moves into a hood only if their WealthLevel fits
 * its band — a WL9 does not live in a WL 2–5 hood.
 *
 *   hoodAdmits_(hoodState, wealthLevel)  — phase02-world-state/loadNeighborhoodState.js
 *   processRelocations_                  — destination loop gated by the unit's best-off member
 *   pickDemographicNeighborhood_         — initial placement pool filtered by the band
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
let passed = 0, failed = 0;
function assert(label, cond, detail) { if (cond) { passed++; console.log('ok ' + label); } else { failed++; console.log('FAIL ' + label + ': ' + (detail || 'condition false')); } }

const sandbox = { Logger: { log: () => {} }, Math, JSON, Object, Array, String, Number, Date, isNaN, isFinite, parseInt, parseFloat, console, RegExp };
vm.createContext(sandbox);
const p = path.join(__dirname, '..', 'phase02-world-state', 'loadNeighborhoodState.js');
vm.runInContext(fs.readFileSync(p, 'utf8'), sandbox, { filename: p });
const { hoodAdmits_ } = sandbox;
assert('hoodAdmits_ loaded', typeof hoodAdmits_ === 'function');

const LM = { wealthMin: 8, wealthMax: 12 }, TEM = { wealthMin: 2, wealthMax: 5 }, EO = { wealthMin: 2, wealthMax: 6 }, NONE = { wealthMin: 0, wealthMax: 0 };
assert('Lake Merritt admits WL 9', hoodAdmits_(LM, 9));
assert('Lake Merritt admits WL 12 (open-ended top)', hoodAdmits_(LM, 12));
assert('Lake Merritt refuses WL 7', !hoodAdmits_(LM, 7));
assert('Temescal admits WL 3', hoodAdmits_(TEM, 3));
assert('Temescal refuses WL 9', !hoodAdmits_(TEM, 9));
assert('Temescal refuses WL 1', !hoodAdmits_(TEM, 1));
assert('band edges inclusive', hoodAdmits_(EO, 2) && hoodAdmits_(EO, 6) && !hoodAdmits_(EO, 7));
assert('WL 0 / blank = unpriced → admitted anywhere', hoodAdmits_(LM, 0) && hoodAdmits_(TEM, '') && hoodAdmits_(LM, undefined));
assert('hood without a band admits anyone', hoodAdmits_(NONE, 11) && hoodAdmits_(undefined, 1) && hoodAdmits_({}, 5));
assert('string WealthLevel coerces', hoodAdmits_(LM, '9') && !hoodAdmits_(LM, '7'));

// ── wiring present in the two movers ────────────────────────────────────────
const mig = fs.readFileSync(path.join(__dirname, '..', 'phase05-citizens', 'migrationTrackingEngine.js'), 'utf8');
assert('processRelocations_ gates the destination loop', /hoodAdmits_\(admissionState\[name\], unitWealth\)/.test(mig));
assert('unit wealth = best-off member', /if \(wlU > unitWealth\) unitWealth = wlU;/.test(mig));
const nbh = fs.readFileSync(path.join(__dirname, '..', 'phase05-citizens', 'runNeighborhoodEngine.js'), 'utf8');
assert('pickDemographicNeighborhood_ filters the pool by the band', /hoodAdmits_\(ctx\.summary\.neighborhoodState\[neighborhoods\[af\]\], wlF\)/.test(nbh));
assert('placement never leaves a citizen unplaced', /if \(admitted\.length\) neighborhoods = admitted;/.test(nbh));

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
