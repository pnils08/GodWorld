#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

(async () => {
  const { parseHitterSeasonStats } = await import('./buildPlayerIndex.js');
  const hornPath = path.resolve(
    __dirname,
    '..',
    'docs',
    'archive',
    'horn-truesource.txt',
  );
  const horn = parseHitterSeasonStats(fs.readFileSync(hornPath, 'utf8'));

  assert.strictEqual(horn.length, 7);
  assert.deepStrictEqual(horn[0], {
    year: 2039,
    team: 'ATH',
    g: 154,
    ab: 614,
    r: 120,
    h: 198,
    doubles: 44,
    triples: 13,
    hr: 43,
    rbi: 103,
    bb: 66,
    so: 104,
    sb: 28,
    avg: '.322',
    obp: '.391',
    slg: '.598',
  });
  assert.strictEqual(
    Object.prototype.hasOwnProperty.call(horn[0], 'cs'),
    false,
    'a source without a CS header must not shift AVG into a synthetic CS field',
  );

  const withCaughtStealing = parseHitterSeasonStats([
    'Year Team G AB R H 2B 3B HR RBI BB SO SB CS AVG OBP SLG',
    '2099 SYN 10 20 3 7 2 1 1 4 5 6 2 1 .350 .480 .700',
  ]);
  assert.deepStrictEqual(withCaughtStealing[0], {
    year: 2099,
    team: 'SYN',
    g: 10,
    ab: 20,
    r: 3,
    h: 7,
    doubles: 2,
    triples: 1,
    hr: 1,
    rbi: 4,
    bb: 5,
    so: 6,
    sb: 2,
    cs: 1,
    avg: '.350',
    obp: '.480',
    slg: '.700',
  });

  assert.throws(
    () => parseHitterSeasonStats([
      'Year Team G AB R H 2B 3B HR RBI BB SO SB EXTRA AVG OBP SLG',
      '2099 SYN 10 20 3 7 2 1 1 4 5 6 2 0 .350 .480 .700',
    ]),
    /Unsupported hitter season header/,
  );
  assert.throws(
    () => parseHitterSeasonStats([
      'Year Team G AB R H 2B 3B HR RBI BB SO SB AVG OBP SLG',
      '2099 SYN 10 20 3 7 2 1 1 4 5 6 2 .350 .480',
    ]),
    /values for 16 headers/,
  );

  const warnings = [];
  const lenient = parseHitterSeasonStats([
    'Year Team G AB R H 2B 3B HR RBI BB SO SB AVG OBP SLG',
    '2097 SYN 10 20 3 7 2 1 1 4 5 — — .350 .480 .700',
    '2098 SYN 10 20 3 7 2 1 1 4 5 6 2 .350 .480',
    '2099 SYN 10 20 3 7 2 1 1 4 5 6 2 .350 .480 .700',
  ], {
    strict: false,
    onWarning: (message) => warnings.push(message),
  });
  assert.strictEqual(lenient.length, 2);
  assert.strictEqual(lenient[0].so, null);
  assert.strictEqual(lenient[0].sb, null);
  assert.strictEqual(lenient[1].year, 2099);
  assert.strictEqual(warnings.length, 3);
  assert.match(warnings[0], /SO must be a whole number/);
  assert.match(warnings[1], /SB must be a whole number/);
  assert.match(warnings[2], /15 values for 16 headers/);

  console.log('buildPlayerIndex.seasonStats.test.js: all assertions passed');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
