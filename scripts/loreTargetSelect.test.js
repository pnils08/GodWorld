#!/usr/bin/env node
'use strict';

const assert = require('assert');
const { pickNext } = require('./loreTargetSelect');

const candidates = [
  { popid: 'POP-00001', name: 'Vinnie Keane', tier: '1' },
  { popid: 'POP-00013', name: 'Mark Aitken', tier: '2' },
  { popid: 'POP-00019', name: 'Isley Kelley', tier: '1' },
  { popid: 'POP-00131', name: 'Lorenzo Jordan', tier: '2' },
];

// No lore yet, no cursor: picks the first candidate.
assert.deepStrictEqual(
  pickNext(candidates, new Set(), { lastPopid: null }),
  candidates[0]
);

// Cursor mid-list: picks the next one after the cursor, skipping lored ones.
assert.deepStrictEqual(
  pickNext(candidates, new Set(['POP-00013']), { lastPopid: 'POP-00001' }),
  candidates[2] // POP-00013 is lored, so POP-00019 is next
);

// Cursor at the end: wraps around to the first unlored candidate.
assert.deepStrictEqual(
  pickNext(candidates, new Set(), { lastPopid: 'POP-00131' }),
  candidates[0]
);

// Everyone lored: throws rather than silently returning nothing.
assert.throws(
  () => pickNext(candidates, new Set(candidates.map((c) => c.popid)), { lastPopid: null }),
  /No eligible/
);

// Lored candidates are never returned even from a fresh cursor.
assert.deepStrictEqual(
  pickNext(candidates, new Set(['POP-00001']), { lastPopid: null }),
  candidates[1]
);

console.log('loreTargetSelect tests: PASS');
