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
console.log('livedArticleShape.test.js ok');
