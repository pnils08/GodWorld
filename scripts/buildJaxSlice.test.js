#!/usr/bin/env node
/**
 * buildJaxSlice tests — offline where possible (grok 2026-08-07).
 */
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const {
  buildJaxSlice, formatJaxSliceMarkdown, assignmentFromSlice,
  publicStuckFact, buildContradiction
} = require('./buildJaxSlice');
const livedPacketV2 = require('./livedExperiencePacketV2');

let failures = 0;
function ok(label, cond) {
  if (cond) { console.log('  ok — ' + label); return; }
  failures++;
  console.error('  FAIL — ' + label);
}

console.log('candidate-bound two-sided audit:');
{
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'jax-audit-'));
  fs.mkdirSync(path.join(tmp, 'output'), { recursive: true });
  fs.writeFileSync(path.join(tmp, 'output', 'simulation_ledger_snapshot.jsonl'), [
    { POPID: 'POP-99001', Name: 'Test Resident One', RoleType: 'Mechanic', Neighborhood: 'Test Hood', Status: 'active' },
    { POPID: 'POP-99002', Name: 'Test Resident Two', RoleType: 'Teacher', Neighborhood: 'Second Hood', Status: 'active' },
  ].map(row => JSON.stringify(row)).join('\n') + '\n');
  fs.writeFileSync(path.join(tmp, 'output', 'engine_audit_c999.json'), JSON.stringify({
    patterns: [{
      type: 'incoherence',
      affectedEntities: { neighborhoods: ['Test Hood', 'Second Hood'] },
      evidence: { fields: {
        Name: 'TEST-ONLY Safety Initiative', ImplementationPhase: 'operational',
        expected: 'CrimeIndex down',
        contradicting: [
          { name: 'Test Hood', metric: 'CrimeIndex', value: 1.2 },
          { name: 'Second Hood', metric: 'CrimeIndex', value: 1.1 },
        ]
      } },
      measurement: { available: false, reason: 'no-prior-audit' }
    }]
  }));
  const health = {
    label: 'crisis-unattended (high) | TEST-ONLY illness 10.1%',
    ref: 'output/world_summary_c999.md#illness-rate', className: 'crisis-unattended',
    score: 40, kind: 'health-crisis', story: { illnessRate: 10.1 }, popids: []
  };
  const mismatch = {
    label: 'incoherence (high) | TEST-ONLY safety mismatch',
    ref: 'output/engine_audit_c999.json patterns[0]; evidence: Initiative_Tracker row(s) 1',
    className: 'anomaly', score: 38, kind: 'anomaly', hood: 'Test Hood, Second Hood',
    popids: ['POP-99001', 'POP-99002'],
    handle: { citizens: ['Test Resident One (POP-99001)', 'Test Resident Two (POP-99002)'] }
  };
  const slice = buildJaxSlice(999, { root: tmp, report: {
    top: health, candidates: [health, mismatch], illnessRate: 10.1,
    maxScore: 40, shouldForce: true, candidateCount: 2
  } });
  ok('walks from source-less health alert to sourced mismatch', slice.stink.ref === mismatch.ref);
  ok('contradiction stays on selected safety signal',
    /Safety Initiative/.test(slice.contradiction.a) && !/illness/i.test(JSON.stringify(slice.contradiction)));
  ok('second side exposes missing comparison history', /no prior audit/i.test(slice.contradiction.b));
  ok('primary affected hood anchors the story', slice.story.hood === 'Test Hood');
  ok('generic city invention is forbidden', /Do not invent a bar/.test(slice.scene.colorRoom));
  const packet = livedPacketV2.buildAnglePacket({
    cycle: 999, desk: 'civic', reporter: { name: 'Jax Caldera', popid: 'POP-00799' },
    story: slice.story, approach: slice.approach, slice, lane: []
  });
  ok('typed Jax creative brief survives to W1',
    packet.task.creativeBrief && packet.task.creativeBrief.kind === 'data-accountability');
  ok('both mismatch sides retain distinct sources',
    packet.known.some(row => /evidence\.fields$/.test(row.src)) &&
      packet.known.some(row => /\.measurement$/.test(row.src)));
  const secondSide = packet.known.filter(row => row.text === slice.contradiction.b);
  ok('second side appears once with its own provenance',
    secondSide.length === 1 && /\.measurement$/.test(secondSide[0].src));
  fs.rmSync(tmp, { recursive: true, force: true });
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

  ok('formatter preserves contradiction source refs',
    !slice.contradiction.aSrc || /A REF:/.test(md));
}

if (failures) {
  console.error('\nbuildJaxSlice tests: ' + failures + ' FAILURE(S)');
  process.exit(1);
}
console.log('\nbuildJaxSlice tests: PASS');
