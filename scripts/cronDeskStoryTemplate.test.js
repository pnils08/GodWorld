#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const desk = require('./cron-desk-run');
const slots = require('./s344HumanSlots');
const p = require('./livedExperiencePacket');

assert.throws(() => desk.humanChaseOrThrow(''), /missing/);
assert.throws(() => desk.humanChaseOrThrow('{"focus":"TEST-ONLY"}'), /JSON-shaped/);
assert.throws(() => desk.humanChaseOrThrow('I will verify the assigned fact and talk to POP-00231.'), /JSON-shaped/);
const third = desk.humanChaseOrThrow(
  'The board shows Almanzar\'s debut. The chase is whether one night is a line or a spike. Ask the feed, not the clubhouse.'
);
assert.ok(third.indexOf('Almanzar') >= 0);

assert.throws(() => desk.assertPublishableQuotesStrict([], 'W2'), /zero publishable/);
assert.throws(() => desk.assertPublishableQuotesStrict(null, 'W3'), /zero publishable/);
desk.assertPublishableQuotesStrict([{ quote: 'I saw the hub sit still.' }], 'W2');

const stem = 'zz-s344-task3_';
const storyPath = desk.storyDocPath(stem);
try {
  desk.storyDocOpen(stem, {
    desk: 'civic', cycle: '999', reporter: { name: 'Test Reporter' },
    story: { angle: 'TEST-ONLY hub stall', label: 'TEST-ONLY hub stall', ref: 'TEST', hood: 'Fruitvale' },
    approach: 'test',
    angleRead: { text: third, plan: { focus: 'TEST-ONLY', checks: ['x'] } },
  });
  const md = fs.readFileSync(storyPath, 'utf8');
  const sec2 = slots.storySection(md, 2);
  assert.equal(slots.isJsonShaped(sec2), false);
  assert.ok(sec2.indexOf('Almanzar') >= 0);
  assert.ok(sec2.indexOf('"focus"') < 0, 'structured plan stays out of §2');
} finally {
  try { fs.unlinkSync(storyPath); } catch (_) {}
}

assert.equal(p.chaseIsJsonShaped(JSON.stringify({ focus: 'x', checks: [] }, null, 2)), true);

const gate = require('./s344ArticleGate');
const jaxArt = fs.readFileSync(path.join(__dirname, '__fixtures__/newsroom/s344/jax_c103_article.md'), 'utf8');
const jaxGate = gate.evaluate(jaxArt, {
  desk: 'civic',
  assignment: 'civic gap in city — who is accountable, what council has or hasn\'t done',
  quotes: ['I think the Tribune should ask what\'s really going on with the funding'],
  requireQuote: true,
});
assert.equal(jaxGate.fail, true);
assert(jaxGate.findings.some(f => f.issue === 'assignment-intake-mismatch'), JSON.stringify(jaxGate.findings));
assert(jaxGate.findings.some(f => f.issue === 'frank-ogawa'));

const complete = `# Fruitvale Transit Hub still sits in visioning

The Fruitvale Transit Hub has not left visioning in nine cycles. Rafael Pilgrim
leans on the same cracked shelter panel every morning.

"I take the bus every day and they have had those coming soon signs up for years now," he said.

At what cycle count does coming soon become something you stop believing?

## INTAKE
CLAIM: Fruitvale Transit Hub remains in visioning | TEST-SRC
`;
const passGate = gate.evaluate(complete, {
  assignment: 'Fruitvale Transit Hub Phase II — Visioning stalled',
  quotes: ['I take the bus every day and they have had those coming soon signs up for years now'],
  requireQuote: true,
  packet: { known: [{ text: 'Fruitvale Transit Hub visioning nine cycles' }] },
});
assert.equal(passGate.fail, false, JSON.stringify(passGate.findings));

const FIX = path.join(__dirname, '__fixtures__', 'newsroom', 's344');
const luisArt = fs.readFileSync(path.join(FIX, 'luis_c103_article.md'), 'utf8');
const luisAssign = 'Fruitvale Transit Hub Phase II — Visioning stalled in construction-planning — remedy path + responsible office';
const luisQuote = "I take the bus every day and they've had those 'coming soon' signs up for years now. Shouldn't someone be asking why the planning keeps stalling when we're the ones waiting in the rain for buses that don't come?";
const luisNear = gate.evaluate(luisArt, {
  desk: 'civic',
  assignment: luisAssign,
  quotes: [luisQuote],
  requireQuote: true,
});
// pipeline.62 — Luis C103 used to fail on assignment-token overlap: his INTAKE
// claim was the citizen's quote rather than the hub's name. That is how a
// reporter writes. The gate no longer counts words.
assert.equal(luisNear.fail, false,
  'Luis C103 passes now — token overlap is not a violation: ' + JSON.stringify(luisNear.findings));
assert(!luisNear.findings.some(f => f.issue === 'missing-packet-quote'),
  'split attribution is a Packet-backed span, not a quote fail: ' + JSON.stringify(luisNear.findings));
assert(!luisNear.findings.some(f => f.issue === 'intake-misses-assignment'),
  'intake token overlap is gone: ' + JSON.stringify(luisNear.findings));

// pipeline.62 acceptance 6 — Friday-class slot misses are observations, never a
// reason Rhea does not see the draft. Jordan: no '?' in the last graf.
const jordanArt = `# The apprenticeship money has not moved

Marla Deene has waited five cycles for the apprenticeship stipend. She checks
the mailbox on Ruby Street before work and finds the same nothing in it.

"They keep telling me it is coming," she said.

The office has not said when it will arrive.
`;
const jordanGate = gate.evaluate(jordanArt, {
  desk: 'civic',
  assignment: 'Apprenticeship stipend — disbursement delay',
  quotes: ['They keep telling me it is coming'],
  requireQuote: true,
});
assert.equal(jordanGate.fail, false,
  'a story that closes on a statement is not a violation: ' + JSON.stringify(jordanGate.findings));
assert(jordanGate.observations.some(o => o.issue === 'missing-unanswered-question'),
  'the missing question is still logged as an observation: ' + JSON.stringify(jordanGate.observations));

// A phase name in the lede is tracker vocabulary a civic desk must be able to
// use — observation, not a refusal (acceptance 3).
const phaseArt = `# Temescal health center enters construction-planning

The Temescal Community Health Center moved into construction-planning this
cycle, and Rosa Villalpando has been watching the lot from her stoop since the
fence went up.

"I want to see them break ground before my knees give out," she said.

Does the schedule hold?
`;
const phaseGate = gate.evaluate(phaseArt, {
  desk: 'civic',
  assignment: 'Temescal health center — construction planning',
  quotes: ['I want to see them break ground before my knees give out'],
  requireQuote: true,
});
assert.equal(phaseGate.fail, false,
  'phase-lede is an observation, not a fail: ' + JSON.stringify(phaseGate.findings));
assert(phaseGate.observations.some(o => o.issue === 'phase-lede'),
  'phase-lede still logged: ' + JSON.stringify(phaseGate.observations));

const posArt = fs.readFileSync(path.join(FIX, 's344-positive-article.md'), 'utf8');
const posPkt = JSON.parse(fs.readFileSync(path.join(FIX, 's344-positive-packet.json'), 'utf8'));
assert.ok(/NOT_CANON/.test(posPkt.note));
const posGate = gate.evaluate(posArt, {
  desk: 'civic',
  assignment: posPkt.task.assignment,
  quotes: posPkt.exposure.sources.map(s => s.quote),
  requireQuote: true,
  packet: posPkt,
});
assert.equal(posGate.fail, false, 'Task 9 positive pair must pass every deterministic check: ' + JSON.stringify(posGate.findings));

console.log('cronDeskStoryTemplate.test.js: PASS');
console.log('  luis near-pass now clean (pipeline.62 — token overlap is not a gate)');
console.log('  jordan missing-? and civic phase-lede are observations, not fails');
console.log('  s344-positive-article.md PASS (synthetic NOT_CANON)');
