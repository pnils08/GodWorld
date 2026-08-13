#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { buildTanyaSlice, TANYA_APPROACH } = require('./buildTanyaSlice');
const packet = require('./livedExperiencePacketV2');

assert.match(TANYA_APPROACH, /Do not claim clubhouse access/);
const summary = path.join(__dirname, '..', 'output', 'world_summary_c103.md');
if (fs.existsSync(summary)) {
  const slice = buildTanyaSlice(103);
  assert.equal(slice.kind, 'tanya-sideline');
  assert.equal(slice.journalist.popid, 'POP-00014');
  assert.equal(slice.prewrite.accessEvidence.state, 'NOT_SUPPLIED');
  assert.equal(slice.prewrite.quoteEvidence.state, 'NOT_SUPPLIED');
  assert.match(slice.scene.colorRoom, /No scene is authorized/);
  const w1 = packet.buildAnglePacket({ cycle: 103, desk: 'sports',
    reporter: slice.journalist, story: slice.story, approach: slice.approach, slice, lane: [] });
  assert.equal(w1.task.creativeBrief.kind, 'sideline-dispatch');
  assert.deepStrictEqual(w1.task.creativeBrief.anchorFacts, slice.prewrite.anchorFacts);
  assert.ok(slice.prewrite.anchorFacts.every(text => w1.known.some(row => row.text === text)));
  assert.ok(slice.prewrite.anchorFacts.every(text => !/Dybantsa|NamesUsed/.test(text)));
  assert.ok(slice.prewrite.anchorFacts.every(text => !/\(feed\)|streak|mood|fan sentiment|team-update/i.test(text)));
  assert.ok(slice.prewrite.anchorFacts.some(text => /23 points and 7 assists/.test(text)));
  assert.match(slice.story.label, /preseason update: 0-1/);
  assert.ok(w1.exposure.candidates.every(row => /^POP-\d{5}$/.test(row.pop)));
}
console.log('buildTanyaSlice tests: PASS');
