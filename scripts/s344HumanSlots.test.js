'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const slots = require('./s344HumanSlots');

const DIR = path.join(__dirname, '__fixtures__', 'newsroom', 's344');

function load(name) {
  return fs.readFileSync(path.join(DIR, name), 'utf8');
}

const jax = slots.scanControl({
  story: load('jax_c103_story.md'),
  article: load('jax_c103_article.md'),
});
assert.equal(jax.jsonChase, true, 'Jax §2 is the serialized plan');
assert.ok(jax.tribuneAsActor.length >= 2, 'Jax §3 reprints Tribune-should-ask');
assert.ok(jax.tribuneAsActor.every(l => /Tribune should ask/i.test(l)));
assert.ok(jax.realWorld.indexOf('bart') >= 0, 'Jax names BART');
assert.ok(jax.realWorld.indexOf('frank-ogawa') >= 0, 'Jax names Frank Ogawa Plaza');
assert.equal(jax.assignmentIntakeMismatch, true, 'Jax Article is transit; INTAKE is faith coverage-gap');
assert.equal(jax.emptyInterviews, false, 'Jax landed quotes — they are the fail, not an empty W2');

const tanya = slots.scanControl({
  story: load('tanya_c104_story.md'),
  article: load('tanya_c104_article.md'),
});
assert.equal(tanya.jsonChase, true, 'Tanya §2 is the serialized plan');
assert.equal(tanya.emptyInterviews, true, 'Tanya W2 landed no answers — W3 should not have opened');
assert.ok(tanya.unsuppliedAccess.indexOf('clubhouse') >= 0, 'Tanya invents clubhouse access');
assert.ok(/Vinnie Keane|126-35/.test(slots.articleBody(load('tanya_c104_article.md'))),
  'Tanya lede still carries the assigned fact');
assert.equal(tanya.assignmentIntakeMismatch, false);

const luis = slots.scanControl({
  story: load('luis_c103_story.md'),
  article: load('luis_c103_article.md'),
});
const luisBody = slots.articleBody(load('luis_c103_article.md'));
assert.ok(/Fruitvale Transit Hub/i.test(luis.assignmentAngle), 'Luis assignment is the hub');
assert.ok(/Fruitvale Transit Hub Phase II/i.test(luisBody), 'Luis Article stays on the assignment');
assert.ok(/Rafael Pilgrim/i.test(luisBody), 'Luis names a rider');
assert.ok(/coming soon/i.test(luisBody), 'Luis carries a Packet quote');
assert.ok(/at what cycle count/i.test(luisBody), 'Luis ends on an unanswered question');
assert.equal(luis.jsonChase, true, 'Luis story §2 is still JSON — not a full pass');
assert.equal(luis.emptyInterviews, true, 'Luis §3 empty — Article quote did not land on the story doc');
assert.equal(luis.assignmentIntakeMismatch, false);
assert.equal(luis.realWorld.length, 0, 'Luis has no BART/Ogawa import');
assert.equal(luis.unsuppliedAccess.length, 0);

assert.equal(slots.isJsonShaped('{"focus":"x"}'), true);
assert.equal(slots.isJsonShaped('I will verify the assigned fact and talk to POP-00231.'), true);
assert.equal(slots.isJsonShaped(
  'The board shows Almanzar\'s debut. The chase is whether one night is a line or a spike. Ask the feed, not the clubhouse.'
), false, 'third-person beat plan is not JSON-shaped');

console.log('s344HumanSlots.test.js: PASS');
console.log('  jax: fail (json chase, tribune-as-actor, BART, Ogawa, faith/transit mismatch)');
console.log('  tanya: boundary (json chase, empty W2, clubhouse)');
console.log('  luis: near-pass Article on assignment; story doc still json/empty-W2');
