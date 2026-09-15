#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { buildTanyaSlice, formatTanyaSliceMarkdown, TANYA_APPROACH } = require('./buildTanyaSlice');
const packet = require('./livedExperiencePacketV2');

assert.match(TANYA_APPROACH, /file from the clubhouse/);
const summary = path.join(__dirname, '..', 'output', 'world_summary_c103.md');
if (fs.existsSync(summary)) {
  const slice = buildTanyaSlice(103);
  assert.equal(slice.kind, 'tanya-sideline');
  assert.equal(slice.journalist.popid, 'POP-00014');
  assert.equal(slice.prewrite.accessEvidence.state, 'ALLOTTED');
  assert.equal(slice.prewrite.quoteEvidence.state, 'NOT_SUPPLIED');
  assert.match(slice.scene.colorRoom, /Clubhouse SET is authorized/);
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

// --- engine beat-deck wiring (pipeline.68) — SYNTHETIC fixture root, not canon ---
function synthFixtureRoot(cycle, journalist, withDecks) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gw-beats-tanya-'));
  const outDir = path.join(root, 'output');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'world_summary_c' + cycle + '.md'), [
    '# World Summary C' + cycle + ' (SYNTHETIC TEST FIXTURE — not canon)',
    '',
    '## Sports',
    '',
    '### C' + cycle + ' (2 entries)',
    '',
    "- **A's — game-result (late-season):** Danny Horn (CF)",
    '  - StoryAngle: Danny Horn stays hot as the club keeps winning',
    '  - Notes: SYNTHETIC fixture row for beat-deck wiring tests only',
    '  - Stats: Danny Horn 2-4, HR, 3 RBI',
    '  - Record 77-25, Streak W5, Mood locked-in, FanSentiment electric, Neighborhood Rockridge',
    "- **A's — player-feature (late-season):** Benji Dillon (SP)",
    '  - StoryAngle: Benji Dillon moves to the bullpen for the remainder of the season',
    '  - Notes: SYNTHETIC fixture row for beat-deck wiring tests only',
    '  - Stats: -',
    '  - Record 77-25, Streak W5, Mood reflective, FanSentiment high, Neighborhood Lake Merritt',
    ''
  ].join('\n'));
  if (withDecks) {
    const beatsDir = path.join(outDir, 'beats');
    fs.mkdirSync(beatsDir, { recursive: true });
    fs.writeFileSync(path.join(beatsDir, 'meta.json'), JSON.stringify({ cycle: cycle }));
    const hooks = [
      { Cycle: cycle, Domain: 'SPORTS', HookText: 'SYNTH named hook for ' + journalist, SuggestedAngle: 'angle-named', Neighborhood: 'Rockridge', SuggestedJournalist: journalist },
      { Cycle: cycle, Domain: 'SPORTS', HookText: 'SYNTH hook for a different journalist', SuggestedAngle: 'angle-other', Neighborhood: 'Fruitvale', SuggestedJournalist: 'Mags Corliss' },
      { Cycle: cycle, Domain: 'SPORTS', HookText: 'SYNTH unnamed sports hook', SuggestedAngle: 'angle-unnamed', Neighborhood: '', SuggestedJournalist: '' },
      { Cycle: cycle, Domain: 'CIVIC', HookText: 'SYNTH civic-domain hook for ' + journalist, SuggestedAngle: 'angle-civic', Neighborhood: 'Downtown', SuggestedJournalist: journalist },
      { Cycle: cycle - 1, Domain: 'SPORTS', HookText: 'SYNTH prior-cycle sports hook', SuggestedAngle: 'angle-prior', Neighborhood: 'Temescal', SuggestedJournalist: journalist }
    ];
    const seeds = [
      { Cycle: cycle, Desk: 'sports', SeedID: 'SEED-SYN-NAMED', SuggestedJournalist: journalist, Neighborhood: 'Rockridge', Citizens: 'Citizen One; Citizen Two', Businesses: 'Biz One', SuggestedAngle: 'seed-angle' },
      { Cycle: cycle, Desk: 'sports', SeedID: 'SEED-SYN-OTHER', SuggestedJournalist: 'Mags Corliss', Neighborhood: 'Fruitvale', Citizens: 'Citizen Three', Businesses: '', SuggestedAngle: 'other-angle' },
      { Cycle: cycle - 1, Desk: 'sports', SeedID: 'SEED-SYN-PRIOR', SuggestedJournalist: journalist, Neighborhood: 'Temescal', Citizens: '', Businesses: '', SuggestedAngle: 'prior-angle' },
      { Cycle: cycle, Desk: 'civic', SeedID: 'SEED-SYN-CIVIC', SuggestedJournalist: journalist, Neighborhood: 'Downtown', Citizens: '', Businesses: '', SuggestedAngle: 'civic-angle' }
    ];
    fs.writeFileSync(path.join(beatsDir, 'Story_Hook_Deck.jsonl'), hooks.map(h => JSON.stringify(h)).join('\n') + '\n');
    fs.writeFileSync(path.join(beatsDir, 'Story_Seed_Deck.jsonl'), seeds.map(s => JSON.stringify(s)).join('\n') + '\n');
  }
  return root;
}

{
  const FIX_CYCLE = 910;
  const root = synthFixtureRoot(FIX_CYCLE, 'Tanya Cruz', true);
  const slice = buildTanyaSlice(FIX_CYCLE, { root: root });
  assert.equal(slice.empty, false);
  assert.ok(slice.hooks.some(h => h.text === 'SYNTH named hook for Tanya Cruz'));
  assert.deepStrictEqual(slice.prewrite.hooks, slice.hooks);
  assert.ok(!slice.hooks.some(h => /different journalist/.test(h.text)));
  assert.ok(!slice.hooks.some(h => /unnamed/.test(h.text)));
  assert.ok(!slice.hooks.some(h => /civic-domain/.test(h.text)));
  assert.ok(!slice.hooks.some(h => /prior-cycle/.test(h.text)));
  assert.ok(slice.seeds.some(s => s.seedId === 'SEED-SYN-NAMED'));
  assert.ok(!slice.seeds.some(s => s.seedId === 'SEED-SYN-PRIOR'));
  assert.ok(slice.pointers.some(p => /Story_Hook_Deck\.jsonl \+ Story_Seed_Deck\.jsonl \(sports, this cycle\)/.test(p)));
  const md = formatTanyaSliceMarkdown(slice);
  assert.match(md, /## ENGINE HOOKS \/ SEEDS \(colour, not fact\)/);

  const bare = buildTanyaSlice(FIX_CYCLE, { root: synthFixtureRoot(FIX_CYCLE, 'Tanya Cruz', false) });
  assert.deepStrictEqual(bare.hooks, []);
  assert.deepStrictEqual(bare.seeds, []);
  assert.doesNotMatch(formatTanyaSliceMarkdown(bare), /## ENGINE HOOKS/);
}

console.log('buildTanyaSlice tests: PASS');
