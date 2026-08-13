'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  validateSpec,
  findUnsourcedVisualDefaults,
} = require('./generate-edition-photos');

const filler = Array(105).fill('frame').join(' ');
function specWith(promptLead) {
  return {
    slug: 'test_only_frame',
    thesis: 'TEST-ONLY supplied visual thesis',
    mood: 'TEST-ONLY restrained',
    motifs: 'light, architecture',
    composition: 'eye level, no identifying signage',
    credit: 'TEST-ONLY Photographer / Bay Tribune',
    image_prompt: `${promptLead} ${filler}`,
  };
}

const imported = specWith("A quiet frame outside Heinold's before dawn.");
assert.deepStrictEqual(findUnsourcedVisualDefaults(imported, 'Packet venue: Nightline Station.'), ["Heinold's"]);
assert.match(validateSpec(imported, 0, 'Packet venue: Nightline Station.').reason, /absent from input bundle/);

const supplied = validateSpec(imported, 0, "Edition location: Heinold's.");
assert.equal(supplied.valid, true, 'a named place may survive only when the exact bundle supplies it');

const unnamed = validateSpec(specWith('An unnamed venue exterior before dawn.'), 0, 'Packet condition: quiet venue.');
assert.equal(unnamed.valid, true, 'unnamed architecture remains available without importing a city landmark');

const directionSource = fs.readFileSync(path.join(__dirname, 'djDirect.js'), 'utf8');
const hartleyBag = fs.readFileSync(path.join(__dirname, '..', 'docs', 'media', 'HARTLEY_VISUAL_BAG.md'), 'utf8');
for (const retiredDefault of [
  'Canon-allowed Oakland landmarks',
  'Heinold',
  'Lake Merritt',
  'Jack London',
  'Coliseum',
  'Oakland Athletics',
  'Walgreens',
  'Starbucks',
  'Buena Vista Hardware',
]) {
  assert.equal(directionSource.includes(retiredDefault), false, `djDirect must not seed retired default: ${retiredDefault}`);
  assert.equal(hartleyBag.includes(retiredDefault), false, `Hartley bag must not seed retired default: ${retiredDefault}`);
}

console.log('generate-edition-photos source-boundary tests: PASS');
