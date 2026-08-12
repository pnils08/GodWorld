#!/usr/bin/env node
/**
 * buildJaxSlice tests — offline where possible (grok 2026-08-07).
 */
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const {
  buildJaxSlice, formatJaxSliceMarkdown, assignmentFromSlice, writeJaxSlice,
  publicStuckFact, buildContradiction
} = require('./buildJaxSlice');

let failures = 0;
function ok(label, cond) {
  if (cond) { console.log('  ok — ' + label); return; }
  failures++;
  console.error('  FAIL — ' + label);
}

console.log('public stuck-Initiative language:');
{
  const top = {
    label: 'stuck-initiative (high) | Initiative "TEST-ONLY Transit Visioning" in phase "construction-planning" for 9 cycles',
    handle: { hookLine: 'The TEST-ONLY transit Initiative has not advanced in 9 cycles.' }
  };
  const publicFact = publicStuckFact(top);
  const contradiction = buildContradiction(top, null);
  ok('public fact omits classifier and phase enum',
    !/stuck-initiative|construction-planning|severity/i.test(publicFact));
  ok('contradiction stays on supplied record',
    !/official voice|stuck-initiative|construction-planning/i.test(JSON.stringify(contradiction)));
}

console.log('buildJaxSlice c102 (live artifacts if present):');
const signalPath = path.join(__dirname, '..', 'output', 'desk_signal_c102.json');
if (!fs.existsSync(signalPath)) {
  console.log('  skip — no desk_signal_c102.json');
} else {
  const slice = buildJaxSlice(102);
  ok('not empty on c102', slice && !slice.empty);
  ok('has stink class', !!(slice.stink && slice.stink.className));
  ok('has contradiction', !!(slice.contradiction && slice.contradiction.frame));
  ok('has approach', typeof slice.approach === 'string' && /Firebrand/.test(slice.approach));
  ok('citizens array', Array.isArray(slice.citizens));
  ok('scene pack present', !!(slice.scene && slice.scene.colorRoom));
  ok('gaps documented', !!(slice.gaps && slice.gaps.missingOrThin && slice.gaps.missingOrThin.length));
  const md = formatJaxSliceMarkdown(slice);
  ok('markdown has SLICE header', /^# SLICE — firebrand/m.test(md));
  ok('markdown has SCENE COLOR', /SCENE COLOR/.test(md));
  const a = assignmentFromSlice(slice);
  ok('assignment has persona', a && a.persona === 'freelance-firebrand');
  ok('assignment story has popids or label', a && a.story && (a.story.label || a.story.angle));

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'jax-slice-'));
  // write into temp root shape
  fs.mkdirSync(path.join(tmp, 'output', 'slices', 'c102'), { recursive: true });
  fs.mkdirSync(path.join(tmp, 'output', 'cron-compare'), { recursive: true });
  // writeJaxSlice uses ROOT paths — just verify format paths on live
  const live = writeJaxSlice(102, slice);
  ok('wrote md', fs.existsSync(live.md));
  ok('wrote json', fs.existsSync(live.json));
  fs.rmSync(tmp, { recursive: true, force: true });
}

if (failures) {
  console.error('\nbuildJaxSlice tests: ' + failures + ' FAILURE(S)');
  process.exit(1);
}
console.log('\nbuildJaxSlice tests: PASS');
