#!/usr/bin/env node
/**
 * buildHalSlice tests — offline (grok 2026-08-09 pipeline.52 Task 5).
 */
'use strict';

const fs = require('fs');
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

ok('HAL_APPROACH', typeof HAL_APPROACH === 'string' && HAL_APPROACH.length > 40);

if (failures) {
  console.error('\nbuildHalSlice tests: ' + failures + ' FAILURE(S)');
  process.exit(1);
}
console.log('\nbuildHalSlice tests: PASS');
