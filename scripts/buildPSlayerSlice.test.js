#!/usr/bin/env node
/**
 * buildPSlayerSlice tests — offline (grok 2026-08-07).
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  buildPSlayerSlice,
  formatPSlayerSliceMarkdown,
  assignmentFromSlice,
  writePSlayerSlice,
  parseSportsSection,
  pickBagModes,
  classifyPulse,
  publicSportsRow,
  FAN_HEAT_APPROACH
} = require('./buildPSlayerSlice');

let failures = 0;
function ok(label, cond) {
  if (cond) { console.log('  ok — ' + label); return; }
  failures++;
  console.error('  FAIL — ' + label);
}
{
  const publicRow = publicSportsRow({
    eventKind: 're-signing',
    storyAngle: 'TEST-ONLY veteran resigns with the club'
  });
  ok('re-signing feed disambiguates resigns as re-signs',
    /re-signs/.test(publicRow.storyAngle) && !/\bresigns\b/.test(publicRow.storyAngle));
}

// Unit: classify + bag modes
console.log('classify / bag modes:');
{
  const roster = classifyPulse({
    eventKind: 're-signing',
    storyAngle: 'Isley Kelley resigns, aging star',
    notes: '2-year $50M contract',
    team: "A's",
    streak: 'W3'
  });
  ok('roster-move primary on resign', roster.primary === 'roster-move');
  const modes = pickBagModes(roster, 1, { storyAngle: 'resign', notes: '' });
  ok('includes friction pivot (3)', modes.includes(3));
  ok('includes hate the move (1)', modes.includes(1));
  ok('priorHits → I was wrong (2)', modes.includes(2));
}

const summary103 = path.join(__dirname, '..', 'output', 'world_summary_c103.md');
if (fs.existsSync(summary103)) {
  const current = buildPSlayerSlice(103);
  ok('c103 feed row owns c103 assignment when available',
    current.empty || current.pulse.feedCycle === 103);
}
{
  const insult = classifyPulse({
    eventKind: 'front-office',
    storyAngle: 'Veteran Green calls out The Oaks',
    notes: 'podcast calling franchise garbage',
    team: 'Oaks',
    streak: '-'
  });
  ok('insult-pulse on garbage podcast', insult.primary === 'insult-pulse');
}

// Parse live world_summary if present
console.log('parseSportsSection c102:');
const summaryPath = path.join(__dirname, '..', 'output', 'world_summary_c102.md');
if (!fs.existsSync(summaryPath)) {
  console.log('  skip — no world_summary_c102.md');
} else {
  const md = fs.readFileSync(summaryPath, 'utf8');
  const rows = parseSportsSection(md, 102);
  ok('parsed some rows', rows.length >= 5);
  ok('has c102 rows', rows.some(r => r.cycle === 102));
  ok('storyAngle on c102', rows.filter(r => r.cycle === 102).every(r => r.storyAngle));
  const kelley = rows.find(r => /Kelley|Kelly/i.test(r.storyAngle || '') && r.cycle === 102);
  ok('found Kelley resign row', !!kelley);
}

console.log('buildPSlayerSlice c102 (live artifacts if present):');
const signalPath = path.join(__dirname, '..', 'output', 'desk_signal_c102.json');
if (!fs.existsSync(summaryPath) && !fs.existsSync(signalPath)) {
  console.log('  skip — no c102 sports artifacts');
} else {
  const slice = buildPSlayerSlice(102);
  ok('not empty on c102', slice && !slice.empty);
  ok('journalist is P Slayer', slice.journalist && slice.journalist.popid === 'POP-00008');
  ok('has pulse class', !!(slice.pulse && slice.pulse.className));
  ok('has score', typeof slice.pulse.score === 'number' && slice.pulse.score > 0);
  ok('has charge bag modes', slice.charge && slice.charge.bagModes && slice.charge.bagModes.length >= 1);
  ok('friction pivot in modes', slice.charge.bagModes.some(m => m.id === 3));
  ok('has fanCharge', CHARGE_OK(slice.charge.fanCharge));
  ok('has approach', typeof slice.approach === 'string' && /Fan-heat/.test(slice.approach));
  ok('approach mentions I/we or charge', /I\/we|charge|PriorTake/i.test(slice.approach));
  ok('prewrite present', !!(slice.prewrite && slice.prewrite.bagModes));
  ok('players array', Array.isArray(slice.players));
  ok('candidates listed', Array.isArray(slice.candidates) && slice.candidates.length >= 1);
  ok('not jax stink language as primary', slice.pulse.className !== 'math-imbalance');

  const mdOut = formatPSlayerSliceMarkdown(slice);
  ok('markdown header', /^# SLICE — fan-heat \(P Slayer\)/m.test(mdOut));
  ok('markdown has CHARGE BAG', /## CHARGE BAG/.test(mdOut));
  ok('markdown has PREWRITE', /## PREWRITE/.test(mdOut));
  ok('markdown has PRIOR TAKES', /## PRIOR TAKES/.test(mdOut));

  const a = assignmentFromSlice(slice);
  ok('assignment persona p-slayer', a && a.persona === 'p-slayer');
  ok('assignment desk sports', a && a.desk === 'sports');
  ok('assignment fanHeat', a && a.fanHeat === true);
  ok('assignment story has angle', a && a.story && (a.story.angle || a.story.label));

  const live = writePSlayerSlice(102, slice);
  ok('wrote md', fs.existsSync(live.md));
  ok('wrote json', fs.existsSync(live.json));
}

function CHARGE_OK(c) {
  return ['fury', 'euphoria', 'dread', 'defiance', 'confession', 'grief', 'dare'].includes(c);
}

ok('FAN_HEAT_APPROACH exported', typeof FAN_HEAT_APPROACH === 'string' && FAN_HEAT_APPROACH.length > 40);

// --- engine beat-deck wiring (pipeline.68) — SYNTHETIC fixture root, not canon ---
function synthFixtureRoot(cycle, journalist, withDecks) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gw-beats-pslayer-'));
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
  const root = synthFixtureRoot(FIX_CYCLE, 'P Slayer', true);
  const slice = buildPSlayerSlice(FIX_CYCLE, { root: root });
  ok('fixture slice not empty', slice && !slice.empty);
  ok('named SPORTS hook in slice.hooks', (slice.hooks || []).some(h => h.text === 'SYNTH named hook for P Slayer'));
  ok('named SPORTS hook mirrored in prewrite.hooks', (slice.prewrite.hooks || []).some(h => h.text === 'SYNTH named hook for P Slayer'));
  ok('unnamed SPORTS hook excluded (no opts.unnamed)', !(slice.hooks || []).some(h => /unnamed/.test(h.text)));
  ok('other-journalist hook excluded', !(slice.hooks || []).some(h => /different journalist/.test(h.text)));
  ok('civic-domain hook excluded', !(slice.hooks || []).some(h => /civic-domain/.test(h.text)));
  ok('prior-cycle hook excluded', !(slice.hooks || []).some(h => /prior-cycle/.test(h.text)));
  ok('named sports-desk seed in slice.seeds', (slice.seeds || []).some(s => s.seedId === 'SEED-SYN-NAMED'));
  ok('prior-cycle seed excluded', !(slice.seeds || []).some(s => s.seedId === 'SEED-SYN-PRIOR'));
  ok('beat-decks pointer entry present', (slice.pointers || []).some(p => /Story_Hook_Deck\.jsonl \+ Story_Seed_Deck\.jsonl \(sports, this cycle\)/.test(p)));
  const mdOut = formatPSlayerSliceMarkdown(slice);
  ok('md has ENGINE HOOKS / SEEDS section', /## ENGINE HOOKS \/ SEEDS \(colour, not fact\)/.test(mdOut));

  const bareRoot = synthFixtureRoot(FIX_CYCLE, 'P Slayer', false);
  const bare = buildPSlayerSlice(FIX_CYCLE, { root: bareRoot });
  ok('no beats dump → hooks empty', Array.isArray(bare.hooks) && bare.hooks.length === 0);
  ok('no beats dump → seeds empty', Array.isArray(bare.seeds) && bare.seeds.length === 0);
  ok('no beats dump → md omits section', !/## ENGINE HOOKS/.test(formatPSlayerSliceMarkdown(bare)));
}

if (failures) {
  console.error('\nbuildPSlayerSlice tests: ' + failures + ' FAILURE(S)');
  process.exit(1);
}
console.log('\nbuildPSlayerSlice tests: PASS');
