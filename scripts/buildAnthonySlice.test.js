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
const { parseSportsSection } = require('./sportsSubstrate');

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
