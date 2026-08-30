'use strict';
const assert = require('assert');
const { isSummaryArticle } = require('./livedArticleShape');

const brief = `# Dimond cooling

The supplied record establishes:

- Dimond cooling
- Dimond cooling off: foot traffic down

The next reporting question is: What remains to be learned here?
`;
assert.equal(isSummaryArticle(brief).fail, true);
assert.ok(isSummaryArticle(brief).reasons.includes('auditor-lede'));

const lived = `# Nightline still had the lights

Kai stood under the Nightline awning on a quiet West Oakland night and watched
the door stay open for people who were not coming. The winter air sat on the
block the way it does when the room is ready and the city has other plans.
Gregory Mims said:

> “The warehouse been empty since before my daughter was born.”

He said it like a man who has already walked past the same flyer three cycles
running and does not need the paper to tell him the lights are on. That is what
a quiet night is here: a room that can hold a crowd, a bartender wiping a dry
rail, and a neighbor who already knows where the crowd went. The condition is
real. The story is the people standing in it, waiting to see whether tomorrow
sounds any different from the last quiet one.
`;
assert.equal(isSummaryArticle(lived).fail, false, JSON.stringify(isSummaryArticle(lived)));

const { s344Slots } = require('./livedArticleShape');
const complete = `# Fruitvale Transit Hub still sits in visioning

The Fruitvale Transit Hub has not left visioning in nine cycles. Rafael Pilgrim
leans on the same cracked shelter panel every morning and watches the same sign.

"I take the bus every day and they have had those coming soon signs up for years now," he said.

At what cycle count does coming soon become something you stop believing?
`;
const completeSlots = s344Slots(complete, {
  assignment: 'Fruitvale Transit Hub Phase II — Visioning stalled',
  quotes: ['I take the bus every day and they have had those coming soon signs up for years now'],
  requireQuote: true,
});
assert.equal(completeSlots.fail, false, JSON.stringify(completeSlots));

const missingQuote = s344Slots(complete, {
  assignment: 'Fruitvale Transit Hub Phase II',
  quotes: ['This quote was never spoken by anyone in the Packet at all'],
  requireQuote: true,
});
// pipeline.62 — a Packet quote the reporter did not use verbatim is a craft
// note, not a refusal. Zero quotes at all is still a fail (tanya, below).
assert.ok(missingQuote.observations.includes('missing-packet-quote'),
  JSON.stringify(missingQuote));
assert.equal(missingQuote.fail, false, JSON.stringify(missingQuote));

const fs = require('fs');
const path = require('path');
const splitOk = s344Slots(fs.readFileSync(path.join(__dirname, '__fixtures__/newsroom/s344/luis_c103_article.md'), 'utf8'), {
  assignment: 'Fruitvale Transit Hub Phase II — Visioning stalled',
  quotes: ["I take the bus every day and they've had those 'coming soon' signs up for years now. Shouldn't someone be asking why the planning keeps stalling when we're the ones waiting in the rain for buses that don't come?"],
  requireQuote: true,
});
assert.ok(!splitOk.reasons.includes('missing-packet-quote') &&
  !splitOk.observations.includes('missing-packet-quote'),
  'mid-quote attribution is a Packet span: ' + JSON.stringify(splitOk));
const tanya = fs.readFileSync(path.join(__dirname, '__fixtures__/newsroom/s344/tanya_c104_article.md'), 'utf8');
const tanyaSlots = s344Slots(tanya, {
  assignment: 'A\'s late-season update: 126-35 — Vinnie Keane recorded 2-3, HR, 3 RBI',
  quotes: [],
  requireQuote: true,
});
assert.ok(tanyaSlots.reasons.includes('missing-packet-quote'));
assert.ok(tanyaSlots.reasons.includes('missing-scene') || tanyaSlots.fail);

const cronSrc = fs.readFileSync(path.join(__dirname, 'cron-desk-run.js'), 'utf8');
assert.ok(/async function runCanonResearch/.test(cronSrc), 'W1 three-cited-facts sidecar remains wired');
assert.ok(/§2b CANON RESEARCH/.test(cronSrc), 'canon-research section still appends to the story doc');

console.log('livedArticleShape.test.js ok');
