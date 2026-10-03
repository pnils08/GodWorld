'use strict';
// scanCitizenPages.test.js — pipeline.70: the admission gate, the page-text cleaner, the stance-conflict detector.
const assert = require('assert');
const p = require('./scanCitizenPages');

// admission gate
assert.deepStrictEqual(p.admit({ customId: 'cp-POP-00324-c109-morning', metadata: { type: 'reflection' } }, 109), { popId: 'POP-00324', cycle: 109, slot: 'morning', type: 'reflection' });
assert.strictEqual(p.admit({ customId: 'cp-POP-00005-c109-NIGHTLY-2026-10-02', metadata: { type: 'reflection' } }, 109).reject, 'slot', 'the desk journal never lands');
assert.strictEqual(p.admit({ customId: 'cp-POP-00100-c109-CIVIC-cascade-STMT-109-mayor_open-001', metadata: { type: 'office-position' } }, 109).reject, 'type', 'office statements never land');
assert.strictEqual(p.admit({ customId: 'cp-POP-00324-c119-PRESS-tension', metadata: { type: 'tension' } }, 109).reject, 'cycle', 'bench cycles never land');
assert.strictEqual(p.admit({ customId: 'cp-POP-00324-c109-deskwork-note1', metadata: { type: 'reflection' } }, 109).reject, 'slot');
assert.strictEqual(p.admit({ customId: 'cp-POP-00324-c109-PRESS-tension-resolved', metadata: { type: 'tension' } }, 109).slot, 'PRESS-tension-resolved');

// cleaner
assert.strictEqual(p.citizenText('```json { "answer": "quote", "quote": "I don\'t follow the Oaks too close." }').trim(), "I don't follow the Oaks too close.");
assert.strictEqual(p.citizenText('--- I feel like the Oaks team is trying.').trim(), 'I feel like the Oaks team is trying.');
assert.strictEqual(p.citizenText('TENSION[c108]: Will the Oaks improve?').trim(), 'Will the Oaks improve?');

// stance conflict
const docs = [
  { customId: 'cp-POP-90001-c108-evening', popId: 'POP-90001', cycle: 108, type: 'reflection', affect: 'Resentful', content: 'The council keeps dragging its feet on the transit hub and I am sick of it.' },
  { customId: 'cp-POP-90001-c105-morning', popId: 'POP-90001', cycle: 105, type: 'reflection', affect: 'Content', content: 'Good coffee, quiet morning.' },
  { customId: 'cp-POP-90001-c109-PRESS-tension', popId: 'POP-90001', cycle: 109, type: 'tension', content: 'TENSION[c109]: Will the council move?' }
];
const hit = p.stanceConflict('I am proud of the council this week, they finally moved on transit.', docs);
assert.ok(hit, 'cheering the council against a resentful council page is a conflict');
assert.strictEqual(hit.customId, 'cp-POP-90001-c108-evening');
assert.strictEqual(hit.quotePolarity, 1); assert.strictEqual(hit.pagePolarity, -1);
assert.ok(['the council', 'transit'].includes(hit.entity), 'entity is a shared theme: ' + hit.entity);
assert.strictEqual(p.stanceConflict('I am sick of the council dragging on transit.', docs), null, 'agreement is silent');
assert.strictEqual(p.stanceConflict('I am proud of my church this week.', docs), null, 'a different entity is not a conflict');
assert.strictEqual(p.stanceConflict('The council met on Tuesday.', docs), null, 'no polarity in the quote = nothing to contradict');
assert.strictEqual(p.stanceConflict('I am proud of the council this week.', docs, { skipCustomIds: ['cp-POP-90001-c108-evening'] }), null, 'the page the quote answered is skipped');
assert.strictEqual(p.stanceConflict('I am proud of the council this week.', [docs[2]]), null, 'a tension doc is never the page side');
console.log('scanCitizenPages.test.js: PASS');

// codex review 2026-10-03 (seams 4+5) — the repros that held
const T = (q, page, extra) => p.stanceConflict(q, [{ customId: 'cp-POP-90009-c108-PRESS', popId: 'POP-90009', cycle: 108, type: 'reflection', content: page }], extra);
assert.strictEqual(T('I support transit. The council met.', 'I hate the council. Transit was discussed.'), null, 'F2: polarity does not leak from the council sentence onto transit');
assert.ok(T('I love transit. I hate the council.', 'I hate transit. I love the council.'), 'F3: two reversals on two entities do not cancel');
assert.ok(T('I am proud of transit improving now.', 'I am proud of transit improving now. --- I hate transit this week.'), 'F4: only the quoted sentence is removed, the rest of the doc is read');
assert.strictEqual(T('I love transit.', 'I love transit. --- The council met.'), null, 'own utterance removed, nothing else conflicts');
assert.strictEqual(T('I love transit.', 'I hate transit.', { skipCustomIds: ['cp-POP-90009-c108-PRESS'] }), null, 'skip is honoured');
console.log('scanCitizenPages.test.js (codex fold): PASS');
