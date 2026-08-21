#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const desk = require('./cron-desk-run');
const slots = require('./s344HumanSlots');
const p = require('./livedExperiencePacket');

assert.throws(() => desk.humanChaseOrThrow(''), /missing/);
assert.throws(() => desk.humanChaseOrThrow('{"focus":"TEST-ONLY"}'), /JSON-shaped/);
assert.throws(() => desk.humanChaseOrThrow('I will verify the assigned fact and talk to POP-00231.'), /JSON-shaped/);
const third = desk.humanChaseOrThrow(
  'The board shows Almanzar\'s debut. The chase is whether one night is a line or a spike. Ask the feed, not the clubhouse.'
);
assert.ok(third.indexOf('Almanzar') >= 0);

assert.throws(() => desk.assertPublishableQuotesStrict([], 'W2'), /zero publishable/);
assert.throws(() => desk.assertPublishableQuotesStrict(null, 'W3'), /zero publishable/);
desk.assertPublishableQuotesStrict([{ quote: 'I saw the hub sit still.' }], 'W2');

const stem = 'zz-s344-task3_';
const storyPath = desk.storyDocPath(stem);
try {
  desk.storyDocOpen(stem, {
    desk: 'civic', cycle: '999', reporter: { name: 'Test Reporter' },
    story: { angle: 'TEST-ONLY hub stall', label: 'TEST-ONLY hub stall', ref: 'TEST', hood: 'Fruitvale' },
    approach: 'test',
    angleRead: { text: third, plan: { focus: 'TEST-ONLY', checks: ['x'] } },
  });
  const md = fs.readFileSync(storyPath, 'utf8');
  const sec2 = slots.storySection(md, 2);
  assert.equal(slots.isJsonShaped(sec2), false);
  assert.ok(sec2.indexOf('Almanzar') >= 0);
  assert.ok(sec2.indexOf('"focus"') < 0, 'structured plan stays out of §2');
} finally {
  try { fs.unlinkSync(storyPath); } catch (_) {}
}

assert.equal(p.chaseIsJsonShaped(JSON.stringify({ focus: 'x', checks: [] }, null, 2)), true);

console.log('cronDeskStoryTemplate.test.js: PASS');
