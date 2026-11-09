#!/usr/bin/env node
'use strict';

// Mags' nightly reflection lands on her citizen page and in her `mags` Supermemory container.
// Neither carries a real-world date: the header names the Cycle on the sim clock, the page doc key is a weekday.

const assert = require('assert');
const { simClock } = require('./centralDate');
const { reflectionHeader, normalizeReflectionDate, buildSystemPrompt } = require('./discord-reflection');
const page = require('../lib/citizenPage');
const memoryFence = require('../lib/memoryFence');

const GREG = /\b20\d\d-\d\d-\d\d\b|\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+20\d\d\b/;

// sim clock
assert.strictEqual(simClock(114), 'Y3C10');
assert.strictEqual(simClock(104), 'Y2C52');
assert.strictEqual(simClock(105), 'Y3C1');
assert.strictEqual(simClock(1), 'Y1C1');
assert.strictEqual(simClock(null), null);
assert.strictEqual(simClock('x'), null);
assert.strictEqual(simClock(0), null);

// header
assert.strictEqual(reflectionHeader('Y3C10'), '### Nightly Reflection — Y3C10');
assert.strictEqual(reflectionHeader(null), '### Nightly Reflection');

// the model's own header (hallucinated real date, or a flavor line, or two) is replaced by exactly one sim-clock header
const body = 'The lake went dark early tonight.\n\n— Mags';
for (const modelHeader of [
  '### Nightly Reflection — 2026-11-03\n\n',
  '### Nightly Reflection — Cycle 96, Late Evening\n\n',
  '### Nightly Reflection — 2026-02-23\n### Nightly Reflection — 2026-02-24\n\n',
  '',
]) {
  const out = normalizeReflectionDate(modelHeader + body, 'Y3C10');
  assert.strictEqual(out, '### Nightly Reflection — Y3C10\n\n' + body + '\n', JSON.stringify(modelHeader));
  assert.ok(!GREG.test(out), 'no calendar date in the entry');
}
assert.strictEqual(normalizeReflectionDate('### Nightly Reflection — 2026-11-03\n\n' + body, null), '### Nightly Reflection\n\n' + body + '\n');

// readers still strip the new header (the scrub matches any "### Nightly Reflection" line)
assert.ok(!/Nightly Reflection|Y3C10/.test(memoryFence.scrubNightly(normalizeReflectionDate(body, 'Y3C10'))));

// the prompt teaches the sim-clock header, not a date
const prompt = buildSystemPrompt('IDENTITY', 'Y3C10');
assert.ok(prompt.includes('### Nightly Reflection — Y3C10'));
assert.ok(!GREG.test(prompt), 'system prompt carries no calendar date');

// her page doc key: cycle + daypart + weekday — never a calendar date
const id = page.pageCustomId_('cp-POP-00005', { cycle: 114, daypart: 'NIGHTLY', day: page.pageDayOf(new Date('2026-11-04T01:00:00Z')) });
assert.strictEqual(id, 'cp-POP-00005-c114-NIGHTLY-tue');   // 01:00Z Wed = 19:00 Tue Central
assert.ok(!GREG.test(id));

console.log('discordReflectionHeader: ok');
