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

const jax = fs.readFileSync(path.join(__dirname, '__fixtures__/newsroom/s344/jax_c103_article.md'), 'utf8');
const jaxScan = scan(jax, { desk: 'civic' });
assert.equal(jaxScan.fail, true);
assert(jaxScan.findings.some(f => f.issue === 'bart'), 'Jax BART: ' + JSON.stringify(jaxScan.findings));
assert(jaxScan.findings.some(f => f.issue === 'frank-ogawa'), 'Jax Ogawa');

const tanya = fs.readFileSync(path.join(__dirname, '__fixtures__/newsroom/s344/tanya_c104_article.md'), 'utf8');
const tanyaScan = scan(tanya, { desk: 'sports', packet: { known: [{ text: 'Vinnie Keane 2-3 HR 3 RBI' }] } });
assert.equal(tanyaScan.findings.filter(f => f.check === 'unsupplied-access').length, 0,
  'Tanya SET (clubhouse) is persona texture, not a leak: ' + JSON.stringify(tanyaScan.findings));

const setOk = scan('BREAKING from the clubhouse: Vinnie Keane went 2-for-3.\n', {
  desk: 'sports', packet: { known: [{ text: 'Vinnie Keane 2-3' }] },
});
assert.equal(setOk.findings.filter(f => f.check === 'unsupplied-access').length, 0,
  'sideline SET must pass: ' + JSON.stringify(setOk.findings));

const roomTalk = scan('In the locker room, an unnamed starter said the room was broken.\n', {
  desk: 'sports', packet: {},
});
assert(roomTalk.findings.some(f => f.check === 'unsupplied-access' && f.issue === 'room-sourced-speech'),
  'invented speech from the room still fails: ' + JSON.stringify(roomTalk.findings));

const chrome = scan('Here\'s the corrected article with all unapproved quotes removed:\n\nNightline was open.', { desk: 'culture' });
assert(chrome.findings.some(f => f.check === 'repair-chrome'));

const texture = scan([
  '# Nightline still had the lights',
  '',
  'An unnamed regular leaned on the rail while the door stayed open. No new business, no invented count.',
].join('\n'), { desk: 'culture' });
assert.equal(texture.fail, false, 'anonymous texture must pass: ' + JSON.stringify(texture.findings));

console.log('articleContamination.test.js PASS');
console.log('  vacuum findings:', v.findings.length);
console.log('  caldera findings:', c.findings.length);
