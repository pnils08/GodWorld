#!/usr/bin/env node
'use strict';

const assert = require('assert');
const { centralDate } = require('./centralDate');

const at = (iso) => new Date(iso);

// 18:15 CST Mon Nov 2 2026 is 00:15Z Tue Nov 3 — the case that killed the write wake.
assert.strictEqual(centralDate(0, at('2026-11-03T00:15:00Z')), '2026-11-02');
assert.strictEqual(at('2026-11-03T00:15:00Z').toISOString().slice(0, 10), '2026-11-03');   // what the old code read

// 18:15 CDT the week before is 23:15Z, same date either way.
assert.strictEqual(centralDate(0, at('2026-10-26T23:15:00Z')), '2026-10-26');

// 19:15 CDT Mon is 00:15Z Tue — under CDT the UTC date turns one hour later in the evening.
assert.strictEqual(centralDate(0, at('2026-10-27T00:15:00Z')), '2026-10-26');

// The Tue/Thu 20:18 work wake: 02:18Z (CST) / 01:18Z (CDT) is still the same Central evening.
assert.strictEqual(centralDate(0, at('2026-11-04T02:18:00Z')), '2026-11-03');
assert.strictEqual(centralDate(0, at('2026-10-28T01:18:00Z')), '2026-10-27');

// Morning wakes agree with UTC under both offsets.
assert.strictEqual(centralDate(0, at('2026-11-03T12:15:00Z')), '2026-11-03');
assert.strictEqual(centralDate(0, at('2026-10-27T11:15:00Z')), '2026-10-27');

// Day offsets are calendar arithmetic, across a month edge and a fall-back day.
assert.strictEqual(centralDate(1, at('2026-11-03T00:15:00Z')), '2026-11-01');
assert.strictEqual(centralDate(1, at('2026-12-01T20:00:00Z')), '2026-11-30');
assert.strictEqual(centralDate(1, at('2026-11-01T20:00:00Z')), '2026-10-31');
assert.strictEqual(centralDate(1, at('2026-11-02T06:30:00Z')), '2026-11-01');

// Bad offsets fall back to today.
assert.strictEqual(centralDate('x', at('2026-11-03T12:15:00Z')), '2026-11-03');
assert.strictEqual(centralDate(undefined, at('2026-11-03T12:15:00Z')), '2026-11-03');

console.log('centralDate: ok');
