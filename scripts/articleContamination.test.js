#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { scan, scanFile } = require('./articleContamination');

const vacuum = fs.readFileSync(
  path.join(__dirname, '..', 'output/desks/civic/articles/c103_the_west_oakland_vacuum.md'), 'utf8'
);
const v = scan(vacuum, { desk: 'civic' });
assert.equal(v.fail, true, 'e103 vacuum must fail');
assert(v.findings.some(f => f.check === 'blight-import'), JSON.stringify(v.findings));
assert(v.findings.some(f => f.check === 'real-oakland-leak'), 'International Blvd / Allen Temple bus stop');

const caldera = fs.readFileSync(
  path.join(__dirname, '..', 'editions/cycle_pulse_edition_102.txt'), 'utf8'
);
const civicStart = caldera.indexOf('### The Decay Is On the Record');
const civicEnd = caldera.indexOf('------------------------------------------------------------', civicStart + 10);
const excerpt = caldera.slice(civicStart, civicEnd);
const c = scan(excerpt, { desk: 'civic' });
assert.equal(c.fail, true, 'E102 Caldera civic must fail');
assert(c.findings.some(f => f.check === 'lattice-quote'), 'lattice printed as people');
assert(c.findings.some(f => f.check === 'invented-voice' && /Colon/i.test(f.issue)),
  'Colon never-woken/athlete: ' + JSON.stringify(c.findings));
assert(c.findings.some(f => f.check === 'blight-import' || f.check === 'unnamed-bartender' || /bartender|decay|struggles/.test(JSON.stringify(c.findings))));

const clean = scan([
  '# A\'s · player-feature — Pablo Almanzar throws a No No in his MLB debut',
  '',
  'Pablo Almanzar threw a 9-inning no-hitter. The A\'s sit at 124-34.',
].join('\n'), { desk: 'sports' });
assert.equal(clean.fail, false, 'sheet-backed sports recap must pass: ' + JSON.stringify(clean.findings));

console.log('articleContamination.test.js PASS');
console.log('  vacuum findings:', v.findings.length);
console.log('  caldera findings:', c.findings.length);
