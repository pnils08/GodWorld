#!/usr/bin/env node
'use strict';

const assert = require('assert');
const ecl = require('./eclWakeGrain');

const HDR = ['Kind', 'PoolKey', 'Slot', 'Text', 'Weight', 'Conditions', 'Tags', 'Grain', 'Active'];
const ROWS = [
  HDR,
  ['line', 'baseDaily.shop', '', 'opened the oven on $SENSORY, $MOOD', '2', 'hood=Temescal', 'source:occupation', '', ''],
  ['line', 'baseDaily.family', '', 'stood with $CONTACT at the sink, $MOOD', '2', '', 'source:homeLife', '', ''],
  ['line', 'test.void', '', 'stared into $VOID', '50', '', 'source:qol', '', ''],
  ['fragment', '', 'SENSORY', 'a cold-morning crack in the sourdough', '', '', '', '', ''],
  ['fragment', '', 'MOOD', 'glad the regulars still came', '', '', '', '', ''],
  ['fragment', '', 'MOOD', 'fruitvale-only hush', '', 'hood=Fruitvale', '', '', '']
];

const ledger = ecl.compileFromValues(ROWS);
assert.ok(ledger.lines['baseDaily.shop']);
assert.ok(ledger.fragments.SENSORY);
assert.ok((ledger.skipped || 0) >= 0);

const baker = { popId: 'POP-00170', nh: 'Temescal', occ: 'baker', age: 40, marital: 'married' };
const shop = ecl.composeEclGrain(baker, {
  cycle: 103, wake: 'morning', ledger, venue: 'the Temescal counter'
});
assert.strictEqual(shop.source, 'ecl');
assert.strictEqual(shop.poolKey, 'baseDaily.shop');
assert.match(shop.line, /opened the oven on a cold-morning crack in the sourdough/);
assert.match(shop.line, /glad the regulars still came/);
assert.doesNotMatch(shop.line, /\$[A-Z_]+/);

const same = ecl.composeEclGrain(baker, {
  cycle: 103, wake: 'morning', ledger, venue: 'the Temescal counter'
});
assert.strictEqual(same.line, shop.line, 'same citizen+cycle+wake is deterministic');

const fruitvale = ecl.composeEclGrain({ popId: 'POP-00940', nh: 'Fruitvale', occ: 'clerk' }, {
  cycle: 103, wake: 'morning', ledger
});
assert.notStrictEqual(fruitvale.poolKey, 'baseDaily.shop', 'hood gate drops Temescal shop line');

const family = ecl.composeEclGrain(baker, {
  cycle: 103, wake: 'evening', ledger, contact: 'Lucia'
});
assert.match(family.line, /stood with Lucia at the sink/);

const noContact = ecl.composeEclGrain(baker, {
  cycle: 104, wake: 'evening', ledger
});
assert.notStrictEqual(noContact.line, family.line);
assert.doesNotMatch(noContact.line || '', /\$CONTACT/);

assert.strictEqual(ecl.isVagueLifeTail('Y2C51 — [Daily] spent time unwinding in the evening'), true);
assert.strictEqual(ecl.isVagueLifeTail('Y2C51 — [Daily] opened the oven on a cold-morning crack in the sourdough, glad the regulars still came'), false);

console.log('eclWakeGrain.test.js PASS');
