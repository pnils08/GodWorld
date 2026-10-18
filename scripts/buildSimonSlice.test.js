#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { buildSimonSlice, formatSimonSliceMarkdown, SIMON_APPROACH } = require('./buildSimonSlice');
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
  // Mint-agnostic: the story subject must be present; every player either
  // resolves to a valid POPID or fails closed with null. Never pin the exact
  // player list — the world mints citizens continuously.
  assert.ok(slice.players.some(player => player.name === 'Benji Dillon'));
  assert.ok(slice.players.every(player => player.popid === null || /^POP-\d{5}$/.test(player.popid)));
  const w1 = packet.buildAnglePacket({
    cycle: 103, desk: 'sports', reporter: slice.journalist,
    story: slice.story, approach: slice.approach, slice, lane: [],
  });
  assert.equal(w1.task.creativeBrief.kind, 'sports-long-view');
  assert.deepStrictEqual(w1.task.creativeBrief.anchorFacts, slice.prewrite.anchorFacts);
  assert.ok(w1.exposure.candidates.every(row => /^POP-\d{5}$/.test(row.pop)));
}

// --- engine beat-deck wiring (pipeline.68) — SYNTHETIC fixture root, not canon ---
function synthFixtureRoot(cycle, journalist, withDecks) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gw-beats-simon-'));
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
  const root = synthFixtureRoot(FIX_CYCLE, 'Simon Leary', true);
  const beatsDir = path.join(root, 'output', 'beats');
  const feedRows = [
    { Cycle: FIX_CYCLE, Team: "A's", FranchiseStability: 'Stable', EconomicFootprint: '$12M gate', EventTrigger: 'stadium vote looms', HomeNeighborhood: 'Jack London' },
    { Cycle: FIX_CYCLE, Team: 'Oaks', FranchiseStability: '-', EconomicFootprint: '', EventTrigger: '-', HomeNeighborhood: 'Baylight District' },
    { Cycle: FIX_CYCLE - 1, Team: "A's", FranchiseStability: 'PriorCycleStable', EconomicFootprint: '$9M gate', EventTrigger: 'prior vote', HomeNeighborhood: 'Temescal' }
  ];
  fs.writeFileSync(path.join(beatsDir, 'Oakland_Sports_Feed.jsonl'), feedRows.map(r => JSON.stringify(r)).join('\n') + '\n');

  const slice = buildSimonSlice(FIX_CYCLE, { root: root });
  assert.equal(slice.empty, false);
  assert.ok(slice.hooks.some(h => h.text === 'SYNTH named hook for Simon Leary'));
  assert.deepStrictEqual(slice.prewrite.hooks, slice.hooks);
  assert.ok(!slice.hooks.some(h => /different journalist/.test(h.text)));
  assert.ok(!slice.hooks.some(h => /unnamed/.test(h.text)));
  assert.ok(!slice.hooks.some(h => /civic-domain/.test(h.text)));
  assert.ok(!slice.hooks.some(h => /prior-cycle/.test(h.text)));
  assert.ok(slice.seeds.some(s => s.seedId === 'SEED-SYN-NAMED'));
  assert.ok(!slice.seeds.some(s => s.seedId === 'SEED-SYN-PRIOR'));
  assert.ok(slice.pointers.some(p => /Story_Hook_Deck\.jsonl \+ Story_Seed_Deck\.jsonl \(sports, this cycle\)/.test(p)));

  assert.ok(Array.isArray(slice.civicFacts));
  assert.ok(slice.civicFacts.some(f => f === "FranchiseStability (feed): Stable — A's"));
  assert.ok(slice.civicFacts.some(f => f === 'HomeNeighborhood (feed): Baylight District — Oaks'));
  assert.ok(!slice.civicFacts.some(f => /FranchiseStability \(feed\): -/.test(f)));
  assert.ok(!slice.civicFacts.some(f => /PriorCycleStable/.test(f)));
  assert.ok(slice.civicFacts.length <= 6);

  const md = formatSimonSliceMarkdown(slice);
  assert.match(md, /## CITY HOOKS \/ SEEDS \(colour, not fact\)/);
  assert.match(md, /## FRANCHISE \/ CIVIC COLUMNS \(raw feed\)/);

  const bare = buildSimonSlice(FIX_CYCLE, { root: synthFixtureRoot(FIX_CYCLE, 'Simon Leary', false) });
  assert.deepStrictEqual(bare.hooks, []);
  assert.deepStrictEqual(bare.seeds, []);
  assert.deepStrictEqual(bare.civicFacts, []);
  assert.doesNotMatch(formatSimonSliceMarkdown(bare), /## CITY HOOKS/);
  assert.doesNotMatch(formatSimonSliceMarkdown(bare), /## FRANCHISE \/ CIVIC COLUMNS/);
}

// engine.298 — a record says what it measures and when (SYNTHETIC fixture, the C111 shape:
// an off-season week with no record, last week's World Series row carrying 4-1 / W3).
{
  const sports = require('./sportsSubstrate');
  const at = (seasonType, cycle) => ({ team: "A's", record: '4-1', streak: 'W3', seasonType, cycle });
  assert.equal(sports.recordSentence(at('late-season', 912), 912), "The A's record is 4-1.");
  assert.equal(sports.recordSentence(at('playoffs', 912), 912), "The A's playoff series stands at 4-1.");
  assert.equal(sports.recordSentence(at('post-season', 911), 912), "Last week the A's playoff series stood at 4-1.");
  assert.equal(sports.recordSentence(at('championship', 910), 912), "Two weeks ago the A's postseason record stood at 4-1.");
  assert.equal(sports.recordSentence({ ...at('preseason', 912), team: 'Oaks' }, 912), 'The Oaks preseason record is 4-1.');
  assert.equal(sports.recordSentence({ ...at('off-season', 912), record: '-' }, 912), null);
  assert.equal(sports.streakSentence(at('playoffs', 911), 912), "Last week the A's had won 3 straight.");
  assert.equal(sports.streakSentence(at('playoffs', 912), 912), "The A's have won 3 straight.");
  assert.equal(sports.streakSentence({ ...at('playoffs', 912), streak: 'L2' }, 912), null);

  const FIX_CYCLE = 912;
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gw-simon-series-'));
  fs.mkdirSync(path.join(root, 'output'), { recursive: true });
  fs.writeFileSync(path.join(root, 'output', 'world_summary_c' + FIX_CYCLE + '.md'), [
    '# World Summary C' + FIX_CYCLE + ' (SYNTHETIC TEST FIXTURE — not canon)', '', '## Sports', '',
    '### C' + FIX_CYCLE + ' (1 entries)', '',
    "- **A's — editorial-note (off-season):** Danny Horn (CF)",
    '  - StoryAngle: SYNTH parade rolls through Downtown.',
    '  - Stats: -',
    '  - Record -, Streak -, Mood electric, FanSentiment euphoric, Neighborhood Downtown', '',
    '### C' + (FIX_CYCLE - 1) + ' (1 entries)', '',
    "- **A's — game-result (playoffs):** Danny Horn (CF)",
    '  - StoryAngle: SYNTH game 5 closes the series.',
    '  - Stats: Danny Horn/1HR/2RBI',
    '  - Record 4-1, Streak W3, Mood electric, FanSentiment high, Neighborhood Downtown', ''
  ].join('\n'));
  const ledger = { byPop: new Map(), byName: new Map([['danny horn',
    { Name: 'Danny Horn', POPID: 'POP-99911', RoleType: "Center Fielder, Oakland A's", Neighborhood: 'Downtown' }]]) };
  const slice = buildSimonSlice(FIX_CYCLE, { root, ledger });
  assert.equal(slice.story.label, "Last week the A's playoff series stood at 4-1.");
  assert.deepStrictEqual(slice.prewrite.anchorFacts,
    ["Last week the A's playoff series stood at 4-1.", "Last week the A's had won 3 straight."]);
  assert.ok(slice.prewrite.anchorFacts.every(f => !/record is|have won/.test(f)), 'no present-tense record from an earlier cycle');
}

console.log('buildSimonSlice tests: PASS');
