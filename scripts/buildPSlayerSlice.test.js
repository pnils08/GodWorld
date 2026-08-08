#!/usr/bin/env node
/**
 * buildPSlayerSlice tests — offline (grok 2026-08-07).
 */
'use strict';

const fs = require('fs');
const path = require('path');
const {
  buildPSlayerSlice,
  formatPSlayerSliceMarkdown,
  assignmentFromSlice,
  writePSlayerSlice,
  parseSportsSection,
  pickBagModes,
  classifyPulse,
  FAN_HEAT_APPROACH
} = require('./buildPSlayerSlice');

let failures = 0;
function ok(label, cond) {
  if (cond) { console.log('  ok — ' + label); return; }
  failures++;
  console.error('  FAIL — ' + label);
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

if (failures) {
  console.error('\nbuildPSlayerSlice tests: ' + failures + ' FAILURE(S)');
  process.exit(1);
}
console.log('\nbuildPSlayerSlice tests: PASS');
