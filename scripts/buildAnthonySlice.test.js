#!/usr/bin/env node
/**
 * buildAnthonySlice tests — offline (grok 2026-08-08 pipeline.52 Task 4).
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  buildAnthonySlice,
  formatAnthonySliceMarkdown,
  assignmentFromSlice,
  writeAnthonySlice,
  classifyAnalytic,
  scoreAnalyticRow,
  pickBagTools,
  ANTHONY_APPROACH
} = require('./buildAnthonySlice');
const {
  parseSportsSection,
  parseStatsLine,
  extractPlayerNames,
  resolveFeedPlayers,
  extractFoilNumber
} = require('./sportsSubstrate');

let failures = 0;
function ok(label, cond) {
  if (cond) { console.log('  ok — ' + label); return; }
  failures++;
  console.error('  FAIL — ' + label);
}

console.log('classify / bag tools:');
{
  const resign = classifyAnalytic({
    eventKind: 're-signing',
    storyAngle: 'Isley Kelley resigns, aging star',
    notes: '2-year $50M contract',
    stats: '-',
    team: "A's",
    streak: 'W3'
  });
  ok('roster-architecture on resign', resign.primary === 'roster-architecture');
  const tools = pickBagTools(resign, {
    eventKind: 're-signing',
    storyAngle: 'resign',
    notes: '2-year $50M',
    stats: '-'
  });
  ok('includes role-fit (2)', tools.includes(2));
}
{
  const line = classifyAnalytic({
    eventKind: 'player-feature',
    storyAngle: 'Danny Horn on pace for all-time season',
    notes: 'leading AL MVP voting',
    stats: 'Danny Horn 384AB/.336AVG/32HR/71RBI/50SB',
    team: "A's",
    streak: 'W10'
  });
  ok('award or line on Horn MVP pace', line.primary === 'award-board' || line.primary === 'line-card');
  ok('hasStats', line.hasStats === true);
  const sc = scoreAnalyticRow({
    cycle: 102,
    eventKind: 'player-feature',
    storyAngle: 'Danny Horn on pace for all-time season',
    notes: 'MVP',
    stats: 'Danny Horn 384AB/.336AVG/32HR/71RBI/50SB',
    team: "A's",
    streak: 'W10',
    record: '77-25'
  }, 102);
  ok('stats row scores high', sc.score >= 40);
}
{
  const soft = classifyAnalytic({
    eventKind: 'fan-civic',
    storyAngle: 'Cycle celebration with autographs',
    notes: 'carnival',
    stats: '-',
    team: "A's"
  });
  ok('soft-context on fan-civic', soft.primary === 'soft-context');
}

console.log('parseSportsSection still shared:');
const summaryPath = path.join(__dirname, '..', 'output', 'world_summary_c102.md');
if (fs.existsSync(summaryPath)) {
  const md = fs.readFileSync(summaryPath, 'utf8');
  const rows = parseSportsSection(md, 102);
  ok('parsed sports rows', rows.length >= 5);
}

console.log('shared sports canon boundaries:');
{
  const parts = parseStatsLine('Pablo Almanza 9IP, 0H, 1BB, 10Ks Vinnie Keane 2-3 , HR, 3 RBI');
  ok('missing comma still splits player stat ownership',
    parts.length === 2 &&
    parts[0].name === 'Pablo Almanza' && parts[0].line === '9IP, 0H, 1BB, 10Ks' &&
    parts[1].name === 'Vinnie Keane' && parts[1].line === '2-3, HR, 3 RBI');
  const initials = parseStatsLine('Adash Stanley 23pt/7asst, AJ Dybantsa 19pts/6rebs');
  ok('initialed player begins a second stat line',
    initials.length === 2 && initials[1].name === 'AJ Dybantsa' && initials[1].line === '19pts/6rebs');
  ok('pitching workload wins mixed-line foil',
    extractFoilNumber('Pablo Almanza 9IP, 0H, 1BB, 10Ks Vinnie Keane 2-3 , HR, 3 RBI', '') === '9IP');
  ok('headline no-no phrase is not a player',
    !extractPlayerNames('Pablo Almanzar throws a No No in his debut').includes('No No'));

  const ledgerRow = {
    POPID: 'POP-00001',
    Name: 'Vinnie Keane',
    RoleType: "Designated Hitter, Oakland A's Legend",
    Neighborhood: 'Rockridge'
  };
  const players = resolveFeedPlayers({
    namesUsed: 'Pablo Almanzar (SP), Vinne Keane (DH)',
    storyAngle: 'Pablo Almanzar throws a No No in his debut',
    notes: 'Pablo Alamazar made the start.'
  }, {
    byName: new Map([['vinnie keane', ledgerRow]]),
    byPop: new Map([['POP-00001', ledgerRow]])
  }, 10);
  ok('explicit feed subjects exclude prose misspelling and false name',
    players.length === 2 &&
    players[0].name === 'Pablo Almanzar' && players[0].popid === null &&
    players[1].name === 'Vinnie Keane' && players[1].popid === 'POP-00001');
}

const summary103 = path.join(__dirname, '..', 'output', 'world_summary_c103.md');
if (fs.existsSync(summary103)) {
  const current = buildAnthonySlice(103);
  ok('c103 stat typo aligns to explicit feed subject',
    current.prewrite.lineFacts.includes('Pablo Almanzar line (feed): 9IP, 0H, 1BB, 10Ks') &&
    !current.prewrite.lineFacts.some(f => /Pablo Almanza line/.test(f)));
  // Mint-agnostic: never pin whether a real name is in the ledger — citizens
  // mint continuously by design. Assert the fail-closed SHAPE only: every
  // player is either resolved (valid POPID) or explicitly null, and every
  // null player carries a missing-POPID note.
  ok('c103 every player resolves to valid POPID or fails closed with a note',
    current.players.length >= 1 &&
    current.players.every(p =>
      (p.popid === null &&
        current.prewrite.missing.some(m => m.includes(p.name + ' has no Simulation_Ledger POPID'))) ||
      /^POP-\d{5}$/.test(p.popid)));
  const packet = require('./livedExperiencePacketV2').buildAnglePacket({
    cycle: 103,
    desk: 'sports',
    reporter: { name: 'Anthony Raines', popid: 'POP-00017' },
    story: current.story,
    approach: current.approach,
    slice: current,
    lane: []
  });
  ok('c103 W1 carries typed sports analytics brief',
    packet.task.creativeBrief && packet.task.creativeBrief.kind === 'sports-analytics' &&
    packet.task.creativeBrief.lineFacts.includes('Pablo Almanzar line (feed): 9IP, 0H, 1BB, 10Ks'));
  ok('c103 W1 exposes only ledger-resolved players for W2 (mint-agnostic)',
    packet.exposure.candidates.length >= 1 &&
    packet.exposure.candidates.every(c => /^POP-\d{5}$/.test(c.pop)) &&
    packet.exposure.candidates.every(c => current.players.some(p => p.name === c.name && p.popid === c.pop)));
}

console.log('buildAnthonySlice c102:');
if (!fs.existsSync(summaryPath)) {
  console.log('  skip — no world_summary_c102.md');
} else {
  const slice = buildAnthonySlice(102);
  ok('not empty', slice && !slice.empty);
  ok('journalist Anthony', slice.journalist && slice.journalist.popid === 'POP-00017');
  ok('has pulse', !!(slice.pulse && slice.pulse.className));
  ok('has score', typeof slice.pulse.score === 'number' && slice.pulse.score > 0);
  ok('has bag tools', slice.bag && slice.bag.tools && slice.bag.tools.length >= 1);
  ok('has claim', !!(slice.bag && slice.bag.claim));
  ok('third-person approach', /third-person/i.test(slice.approach));
  ok('forbids fan we', /never fan ["']we/i.test(slice.approach) || /fan "we"/i.test(slice.approach));
  ok('not fan charge palette as primary identity', slice.charge === null);
  ok('prewrite has LineFacts', Array.isArray(slice.prewrite.lineFacts) && slice.prewrite.lineFacts.length >= 1);
  ok('prewrite has Missing', Array.isArray(slice.prewrite.missing) && slice.prewrite.missing.length >= 1);
  ok('players array', Array.isArray(slice.players));
  ok('candidates', Array.isArray(slice.candidates) && slice.candidates.length >= 1);
  // Prefer analytic classes over pure soft-context when better rows exist
  ok('not soft-context as top when better exists',
    slice.pulse.className !== 'soft-context' ||
    !slice.candidates.some(c => c.primary !== 'soft-context' && c.score > slice.pulse.score));

  const mdOut = formatAnthonySliceMarkdown(slice);
  ok('md header', /^# SLICE — analytic \(Anthony Raines\)/m.test(mdOut));
  ok('md PREWRITE', /## PREWRITE/.test(mdOut));
  ok('md no we-first heat', !/Fan-heat approach/i.test(mdOut));

  const a = assignmentFromSlice(slice);
  ok('assignment persona anthony-raines', a && a.persona === 'anthony-raines');
  ok('assignment desk sports', a && a.desk === 'sports');
  ok('assignment analytic', a && a.analytic === true);
  ok('assignment story', a && a.story && (a.story.angle || a.story.label));

  const live = writeAnthonySlice(102, slice);
  ok('wrote md', fs.existsSync(live.md));
  ok('wrote json', fs.existsSync(live.json));
}

ok('ANTHONY_APPROACH exported', typeof ANTHONY_APPROACH === 'string' && ANTHONY_APPROACH.length > 40);

// --- engine beat-deck wiring (pipeline.68) — SYNTHETIC fixture root, not canon ---
function synthFixtureRoot(cycle, journalist, withDecks) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gw-beats-anthony-'));
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
  const root = synthFixtureRoot(FIX_CYCLE, 'Anthony Raines', true);
  const slice = buildAnthonySlice(FIX_CYCLE, { root: root });
  ok('fixture slice not empty', slice && !slice.empty);
  ok('named SPORTS hook in slice.hooks', (slice.hooks || []).some(h => h.text === 'SYNTH named hook for Anthony Raines'));
  ok('named SPORTS hook mirrored in prewrite.hooks', (slice.prewrite.hooks || []).some(h => h.text === 'SYNTH named hook for Anthony Raines'));
  ok('unnamed SPORTS hook included for Anthony (opts.unnamed)', (slice.hooks || []).some(h => h.text === 'SYNTH unnamed sports hook'));
  ok('other-journalist hook excluded', !(slice.hooks || []).some(h => /different journalist/.test(h.text)));
  ok('civic-domain hook excluded', !(slice.hooks || []).some(h => /civic-domain/.test(h.text)));
  ok('prior-cycle hook excluded', !(slice.hooks || []).some(h => /prior-cycle/.test(h.text)));
  ok('named sports-desk seed in slice.seeds', (slice.seeds || []).some(s => s.seedId === 'SEED-SYN-NAMED'));
  ok('prior-cycle seed excluded', !(slice.seeds || []).some(s => s.seedId === 'SEED-SYN-PRIOR'));
  ok('beat-decks pointer entry present', (slice.pointers || []).some(p => /Story_Hook_Deck\.jsonl \+ Story_Seed_Deck\.jsonl \(sports, this cycle\)/.test(p)));
  const mdOut = formatAnthonySliceMarkdown(slice);
  ok('md has ENGINE HOOKS / SEEDS section', /## ENGINE HOOKS \/ SEEDS \(colour, not fact\)/.test(mdOut));

  const bareRoot = synthFixtureRoot(FIX_CYCLE, 'Anthony Raines', false);
  const bare = buildAnthonySlice(FIX_CYCLE, { root: bareRoot });
  ok('no beats dump → hooks empty', Array.isArray(bare.hooks) && bare.hooks.length === 0);
  ok('no beats dump → seeds empty', Array.isArray(bare.seeds) && bare.seeds.length === 0);
  ok('no beats dump → md omits section', !/## ENGINE HOOKS/.test(formatAnthonySliceMarkdown(bare)));
}

if (failures) {
  console.error('\nbuildAnthonySlice tests: ' + failures + ' FAILURE(S)');
  process.exit(1);
}
console.log('\nbuildAnthonySlice tests: PASS');
