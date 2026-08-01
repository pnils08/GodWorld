#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const sourcePath = path.join(
  __dirname,
  '..',
  'phase02-world-state',
  'applySportsSeason.js'
);
const logs = [];
const sandbox = {
  Logger: {
    log(message) {
      logs.push(String(message));
    },
  },
};

vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(sourcePath, 'utf8'), sandbox, {
  filename: sourcePath,
});

const normalize = sandbox.normalizeOaklandFeedTeam_;
const derive = sandbox.deriveActiveSportsFromFeed_;

assert.strictEqual(typeof normalize, 'function');
assert.strictEqual(typeof derive, 'function');

assert.strictEqual(normalize("A's"), "A's");
assert.strictEqual(normalize('as'), "A's");
assert.strictEqual(
  normalize("A's vs Synthetic Visitors"),
  "A's",
  "historical free-text A's values must remain readable"
);
assert.strictEqual(normalize('Oaks'), 'Oaks');
assert.strictEqual(normalize('The Oaks vs Synthetic Visitors'), 'Oaks');
assert.strictEqual(normalize('NBA legacy label'), 'Oaks');
assert.strictEqual(normalize('Warriors legacy label'), 'Oaks');
assert.strictEqual(
  normalize('NFL historical label'),
  'NFL',
  'historical NFL values must remain readable'
);

assert.deepStrictEqual(
  Array.from(
    derive([
      { teamsUsed: "A's vs Synthetic Visitors" },
      { teamsUsed: 'NBA legacy label' },
      { teamsUsed: 'NFL historical label' },
    ])
  ),
  ['baseball', 'basketball', 'football']
);

logs.length = 0;
assert.strictEqual(normalize('Synthetic Unknown Club'), '');
assert.strictEqual(logs.length, 1, 'unknown nonblank values must log once');
assert.match(logs[0], /unknown nonblank TeamsUsed/);

assert.strictEqual(normalize(''), '');
assert.strictEqual(normalize('   '), '');
assert.strictEqual(logs.length, 1, 'blank values must remain silent');

console.log('applySportsSeason team compatibility: all assertions passed');
