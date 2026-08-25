#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { buildSimonSlice, SIMON_APPROACH } = require('./buildSimonSlice');
const packet = require('./livedExperiencePacketV2');

assert.match(SIMON_APPROACH, /third-person essayist/);
assert.match(SIMON_APPROACH, /may not add a person, place, institution/);

const summary = path.join(__dirname, '..', 'output', 'world_summary_c103.md');
if (fs.existsSync(summary)) {
  const slice = buildSimonSlice(103);
  assert.equal(slice.kind, 'simon-longview');
  assert.equal(slice.journalist.popid, 'POP-00016');
  assert.match(slice.story.label, /124-34/);
  assert.match(slice.story.label, /Benji Dillon is moving to the bullpen/);
  assert.ok(slice.prewrite.anchorFacts.some(fact => /won 15 straight/.test(fact)));
  assert.ok(slice.prewrite.anchorFacts.every(fact => !/Pablo|W15|StoryAngle|feed|mood/i.test(fact)));
  // Almanzar resolves from the ledger since his 2026-08-21 mint (POP-01078)
  assert.deepStrictEqual(slice.players.map(player => player.name), ['Benji Dillon', 'Pablo Almanzar']);
  const w1 = packet.buildAnglePacket({
    cycle: 103, desk: 'sports', reporter: slice.journalist,
    story: slice.story, approach: slice.approach, slice, lane: [],
  });
  assert.equal(w1.task.creativeBrief.kind, 'sports-long-view');
  assert.deepStrictEqual(w1.task.creativeBrief.anchorFacts, slice.prewrite.anchorFacts);
  assert.ok(w1.exposure.candidates.every(row => /^POP-\d{5}$/.test(row.pop)));
}

console.log('buildSimonSlice tests: PASS');
