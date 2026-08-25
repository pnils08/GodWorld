#!/usr/bin/env node
/**
 * buildAnthonySlice tests — offline (grok 2026-08-08 pipeline.52 Task 4).
 */
'use strict';

const fs = require('fs');
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
  ok('c103 minted Almanzar resolves from ledger (POP-01078, minted 2026-08-21)',
    current.players.some(p => p.name === 'Pablo Almanzar' && p.popid === 'POP-01078') &&
    !current.prewrite.missing.some(m => /Pablo Almanzar has no Simulation_Ledger POPID/.test(m)));
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
  ok('c103 W1 exposes both ledger-resolved subjects for W2 (Almanzar minted 2026-08-21)',
    packet.exposure.candidates.length === 2 &&
    packet.exposure.candidates.some(c => c.pop === 'POP-01078' && c.name === 'Pablo Almanzar') &&
    packet.exposure.candidates.some(c => c.pop === 'POP-00001' && c.name === 'Vinnie Keane'));
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

if (failures) {
  console.error('\nbuildAnthonySlice tests: ' + failures + ' FAILURE(S)');
  process.exit(1);
}
console.log('\nbuildAnthonySlice tests: PASS');
