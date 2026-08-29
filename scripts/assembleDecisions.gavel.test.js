'use strict';

const { pickPrimary, buildDecisions, hearingHasPhase, outputContract, validateVoiceJson } = (function () {
  const a = require('./assembleDecisions');
  const c = require('./cron-civic-run');
  return { pickPrimary: a.pickPrimary, buildDecisions: a.buildDecisions, hearingHasPhase: c.hearingHasPhase, outputContract: c.outputContract, validateVoiceJson: c.validateVoiceJson };
})();

let failed = 0;
function check(name, cond, detail) {
  if (cond) console.log('  ok  ' + name);
  else { failed++; console.error('  FAIL ' + name + (detail ? ': ' + detail : '')); }
}

const hearingPhase = {
  voiceBasename: 'council_d7',
  statement: {
    statementId: 'STMT-104-council_d7-001',
    topic: 'health',
    trackerUpdates: { initiative: 'INIT-005', ImplementationPhase: 'stalled', MilestoneNotes: 'hearing wants stall' },
  },
};
const gavelPhase = {
  voiceBasename: 'mayor_gavel',
  statement: {
    statementId: 'STMT-104-mayor_gavel-001',
    topic: 'health',
    trackerUpdates: { initiative: 'INIT-005', ImplementationPhase: 'construction-active', MilestoneNotes: 'gavel advances' },
  },
};
const extraHearing = {
  voiceBasename: 'council_d1',
  statement: {
    statementId: 'STMT-104-council_d1-001',
    topic: 'health',
    trackerUpdates: { initiative: 'INIT-005', ImplementationPhase: 'blocked', MilestoneNotes: 'carter blocked' },
  },
};

const group = [hearingPhase, extraHearing, gavelPhase];
const primary = pickPrimary(group, 'INIT-005');
check('primary is gavel', primary.voiceBasename === 'mayor_gavel');

const { payload } = buildDecisions('INIT-005', group, 104);
check('phase is gavel only', payload.trackerUpdates.ImplementationPhase === 'construction-active');
check('notes are gavel only', payload.trackerUpdates.MilestoneNotes === 'gavel advances');
check('does not concat hearing phases', !String(payload.trackerUpdates.MilestoneNotes).includes('stall'));

check('hearing JSON with phase is rejected', hearingHasPhase({
  statements: [{ trackerUpdates: { ImplementationPhase: 'stalled' } }],
}) === true);
check('gavel JSON with phase is allowed by the helper (caller-side)', hearingHasPhase({
  statements: [{ trackerUpdates: { ImplementationPhase: 'construction-active' } }],
}) === true);
check('hearing JSON without phase passes', hearingHasPhase({
  statements: [{ decision: 'stand with KONO', trackerUpdates: {} }],
}) === false);

const agenda = outputContract('mayor_open', 104, [{ id: 'INIT-005', name: 'Temescal Community Health Center' }], { forbidPhase: true });
check('agenda contract forbids ImplementationPhase', /trackerUpdates MUST be \{\}/.test(agenda) && !/fill trackerUpdates as a FLAT/.test(agenda));
const gavel = outputContract('mayor_gavel', 104, [{ id: 'INIT-005', name: 'Temescal Community Health Center' }]);
check('gavel contract still offers ImplementationPhase', /fill trackerUpdates as a FLAT/.test(gavel));
const hyphenated = validateVoiceJson(JSON.stringify({
  office: 'mayor_gavel', cycle: 104, speaker: 'Avery Santana',
  statements: [{ decision: 'advance', quote: 'q', fullStatement: 'full', trackerUpdates: { ImplementationPhase: 'pilot_active' } }],
}));
check('underscore phase rewrites to hyphen', hyphenated.ok && hyphenated.json.statements[0].trackerUpdates.ImplementationPhase === 'pilot-active');
const stillDark = validateVoiceJson(JSON.stringify({
  office: 'mayor_gavel', cycle: 104, speaker: 'Avery Santana',
  statements: [{ decision: 'advance', quote: 'q', fullStatement: 'full', trackerUpdates: { ImplementationPhase: 'not-a-phase' } }],
}));
check('unknown phase still rejected', !stillDark.ok);

if (failed) { console.error(failed + ' failed'); process.exit(1); }
console.log('assembleDecisions.gavel: ok');
