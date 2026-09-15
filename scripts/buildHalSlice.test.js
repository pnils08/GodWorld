#!/usr/bin/env node
/**
 * buildHalSlice tests — offline (grok 2026-08-09 pipeline.52 Task 5).
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  buildHalSlice,
  formatHalSliceMarkdown,
  assignmentFromSlice,
  writeHalSlice,
  classifyArchive,
  pickBagModes,
  pickClosing,
  HAL_APPROACH,
  CLOSING_PALETTE
} = require('./buildHalSlice');

let failures = 0;
function ok(label, cond) {
  if (cond) { console.log('  ok — ' + label); return; }
  failures++;
  console.error('  FAIL — ' + label);
}

console.log('classify / modes / closing:');
{
  const era = classifyArchive({
    eventKind: 're-signing',
    storyAngle: 'Isley Kelley resigns, aging star — is this the right move for an aging star?',
    notes: '2-year extension',
    stats: 'Isley Kelley .310AVG',
    team: "A's"
  });
  ok('era-door on resign/aging', era.primary === 'era-door');
  const modes = pickBagModes(era, { storyAngle: 'aging star resigns' }, 1);
  ok('era modes include comparison or legacy', modes.includes(1) || modes.includes(8));
  const close = pickClosing(era, { storyAngle: 'aging star resigns' });
  ok('closing in palette', CLOSING_PALETTE.includes(close));
  ok('elegy or break on resign', close === 'elegy' || close === 'break of continuity');
}
{
  const thresh = classifyArchive({
    eventKind: 'player-feature',
    storyAngle: 'The Kids are Alright. Kevin Clark and Sidney Tumolo more than fill the gap',
    notes: 'future players contributing',
    stats: '-',
    team: "A's"
  });
  ok('threshold on kids', thresh.primary === 'threshold');
  ok('closing threshold crossed', pickClosing(thresh, {}) === 'threshold crossed');
}

console.log('buildHalSlice c102:');
const summaryPath = path.join(__dirname, '..', 'output', 'world_summary_c102.md');
if (!fs.existsSync(summaryPath)) {
  console.log('  skip — no world_summary_c102.md');
} else {
  const slice = buildHalSlice(102);
  ok('not empty', slice && !slice.empty);
  ok('journalist Hal', slice.journalist && slice.journalist.popid === 'POP-00007');
  ok('desk sports never business', slice.desk === 'sports');
  ok('has pulse', !!(slice.pulse && slice.pulse.className));
  ok('has closing note', !!(slice.pulse.closingNote && CLOSING_PALETTE.includes(slice.pulse.closingNote)));
  ok('has bag modes', slice.bag && slice.bag.modes && slice.bag.modes.length >= 1);
  ok('historian approach', /Historian|reflective|era echo/i.test(slice.approach));
  ok('forbids business desk', /business-desk|business desk/i.test(slice.approach));
  ok('forbids fan we / anthony spine', /fan "we"|Anthony|salary/i.test(slice.approach));
  ok('prewrite present facts >= 2', (slice.prewrite.presentFacts || []).length >= 2);
  ok('missing history is explicit', (slice.prewrite.missing || []).some(v => /Historical people/.test(v)));
  ok('scene forbids unsupplied names', /People, places, teams/.test(slice.scene.colorRoom));
  ok('prewrite closing', !!slice.prewrite.closingNote);
  ok('players array', Array.isArray(slice.players));
  ok('candidates', Array.isArray(slice.candidates) && slice.candidates.length >= 1);

  const md = formatHalSliceMarkdown(slice);
  ok('md header archive Hal', /archive \(Hal Richmond\)/i.test(md));
  ok('md never business', /never business/i.test(md));
  ok('md PREWRITE', /## PREWRITE/.test(md));
  ok('md not fan-heat', !/Fan-heat approach/i.test(md));

  const a = assignmentFromSlice(slice);
  ok('assignment persona hal-richmond', a && a.persona === 'hal-richmond');
  ok('assignment desk sports', a && a.desk === 'sports');
  ok('assignment not business', a && a.desk !== 'business');
  ok('assignment historian', a && a.historian === true);
  ok('assignment story', a && a.story && (a.story.angle || a.story.label));
  ok('story has closingNote', a.story.closingNote);

  // enrich would force sports even if mis-tagged business
  const { enrichAssignment } = require('./buildHalSlice');
  const forced = enrichAssignment({
    desk: 'business',
    persona: 'hal-richmond',
    popid: 'POP-00007',
    name: 'Hal Richmond',
    story: { angle: 'wrong' }
  }, 102);
  ok('enrich forces sports desk', forced && forced.desk === 'sports');
  ok('enrich sets historian', forced && forced.historian === true);

  const live = writeHalSlice(102, slice);
  ok('wrote md', fs.existsSync(live.md));
  ok('wrote json', fs.existsSync(live.json));
}

const summary103 = path.join(__dirname, '..', 'output', 'world_summary_c103.md');
if (fs.existsSync(summary103)) {
  const current = buildHalSlice(103);
  ok('c103 missing history is explicit', current.prewrite.missing.some(v =>
    /Historical people, places, teams, events, seasons, and statistics are unsupplied/.test(v)));
  ok('c103 scene is Packet-only', /People, places, teams, seasons, events, and statistics only from the packet/.test(
    current.scene.colorRoom));
  const packet = require('./livedExperiencePacketV2').buildAnglePacket({
    cycle: 103,
    desk: 'sports',
    reporter: { name: 'Hal Richmond', popid: 'POP-00007' },
    story: current.story,
    approach: current.approach,
    slice: current,
    lane: []
  });
  ok('c103 W1 carries typed sports history brief',
    packet.task.creativeBrief && packet.task.creativeBrief.kind === 'sports-history');
  ok('c103 W1 carries feed present facts', current.prewrite.presentFacts.every(text =>
    packet.known.some(row => row.text === text)));
  ok('c103 publishable facts exclude unresolved and misspelled feed names',
    current.prewrite.presentFacts.every(text => !/Pablo|Vinne\b/.test(text)) &&
    !/Pablo|Vinne\b/.test(current.story.label));
  // Mint-agnostic: candidates must all be ledger-resolved with valid POPIDs;
  // never assert which real names are minted — the world mints continuously.
  ok('c103 W1 exposes only ledger-resolved players for W2 (mint-agnostic)',
    packet.exposure.candidates.length >= 1 &&
    packet.exposure.candidates.every(c => /^POP-\d{5}$/.test(c.pop)));
}

ok('HAL_APPROACH', typeof HAL_APPROACH === 'string' && HAL_APPROACH.length > 40);

// --- engine beat-deck wiring (pipeline.68) — SYNTHETIC fixture root, not canon ---
function synthFixtureRoot(cycle, journalist, withDecks) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gw-beats-hal-'));
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

console.log('beat-deck wiring (synthetic fixture root):');
{
  const FIX_CYCLE = 910;
  const root = synthFixtureRoot(FIX_CYCLE, 'Hal Richmond', true);
  const slice = buildHalSlice(FIX_CYCLE, { root: root });
  ok('fixture slice not empty', slice && !slice.empty);
  ok('named SPORTS hook in slice.hooks', (slice.hooks || []).some(h => h.text === 'SYNTH named hook for Hal Richmond'));
  ok('named SPORTS hook mirrored in prewrite.hooks', (slice.prewrite.hooks || []).some(h => h.text === 'SYNTH named hook for Hal Richmond'));
  ok('unnamed SPORTS hook excluded (no opts.unnamed)', !(slice.hooks || []).some(h => /unnamed/.test(h.text)));
  ok('other-journalist hook excluded', !(slice.hooks || []).some(h => /different journalist/.test(h.text)));
  ok('civic-domain hook excluded', !(slice.hooks || []).some(h => /civic-domain/.test(h.text)));
  ok('prior-cycle hook excluded', !(slice.hooks || []).some(h => /prior-cycle/.test(h.text)));
  ok('named sports-desk seed in slice.seeds', (slice.seeds || []).some(s => s.seedId === 'SEED-SYN-NAMED'));
  ok('prior-cycle seed excluded', !(slice.seeds || []).some(s => s.seedId === 'SEED-SYN-PRIOR'));
  ok('beat-decks pointer entry present', (slice.pointers || []).some(p => /Story_Hook_Deck\.jsonl \+ Story_Seed_Deck\.jsonl \(sports, this cycle\)/.test(p)));
  const mdOut = formatHalSliceMarkdown(slice);
  ok('md has ENGINE HOOKS / SEEDS section', /## ENGINE HOOKS \/ SEEDS \(colour, not fact\)/.test(mdOut));

  const bareRoot = synthFixtureRoot(FIX_CYCLE, 'Hal Richmond', false);
  const bare = buildHalSlice(FIX_CYCLE, { root: bareRoot });
  ok('no beats dump → hooks empty', Array.isArray(bare.hooks) && bare.hooks.length === 0);
  ok('no beats dump → seeds empty', Array.isArray(bare.seeds) && bare.seeds.length === 0);
  ok('no beats dump → md omits section', !/## ENGINE HOOKS/.test(formatHalSliceMarkdown(bare)));
}

if (failures) {
  console.error('\nbuildHalSlice tests: ' + failures + ' FAILURE(S)');
  process.exit(1);
}
console.log('\nbuildHalSlice tests: PASS');
