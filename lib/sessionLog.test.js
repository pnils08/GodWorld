/**
 * sessionLog.test.js — Phase 40.1
 *
 * Run: node lib/sessionLog.test.js
 * Exits 0 on pass, 1 on failure.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const sessionLog = require('./sessionLog');

let passed = 0;
let failed = 0;

function assert(label, cond, detail) {
  if (cond) { console.log(`  ok   ${label}`); passed++; }
  else { console.error(`  FAIL ${label}${detail ? ': ' + detail : ''}`); failed++; }
}

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sessionLog-'));

function writeFixture(name, content) {
  const p = path.join(tmpDir, name);
  fs.writeFileSync(p, content);
  return p;
}

console.log('Test 1: empty file — both readers return []');
{
  const empty = writeFixture('empty.md', '');
  assert('readLast returns []', sessionLog.readLast(empty, 5).length === 0);
  assert('readSince returns []', sessionLog.readSince(empty, '2026-01-01').length === 0);
}

console.log('\nTest 2: nonexistent path — both readers return []');
{
  const ghost = path.join(tmpDir, 'does_not_exist.md');
  assert('readLast returns []', sessionLog.readLast(ghost, 5).length === 0);
  assert('readSince returns []', sessionLog.readSince(ghost, '2026-01-01').length === 0);
}

console.log('\nTest 3: single event');
{
  const single = writeFixture('single.md', `# Title
**Started:** 2026-04-09 03:30 UTC

## Step 0: Session State
- only event
`);
  const last = sessionLog.readLast(single, 3);
  assert('readLast(_, 3) returns 1', last.length === 1, `got ${last.length}`);
  assert('event.step parsed', last[0].step === 'Step 0: Session State');
  assert('event.body present', last[0].body.includes('only event'));
  const since = sessionLog.readSince(single, '2026-01-01');
  assert('readSince(_, oldTs) returns 1', since.length === 1);
}

console.log('\nTest 4: five events, readLast(_, 3) returns 3');
{
  const five = writeFixture('five.md', `# Five Events

## Step 0: Session State
body 0

## Step 1: World Summary
body 1

## Step 2: Stories Picked
body 2

## Step 3: Citizens Verified
body 3

## Step 4: Reporter Results
body 4
`);
  const last3 = sessionLog.readLast(five, 3);
  assert('readLast(_, 3) returns 3', last3.length === 3, `got ${last3.length}`);
  assert('order preserved (oldest first)', last3[0].step === 'Step 2: Stories Picked' && last3[2].step === 'Step 4: Reporter Results');
  const last10 = sessionLog.readLast(five, 10);
  assert('readLast(_, 10) returns all 5', last10.length === 5);
}

console.log('\nTest 5: readSince — Session-style heading dates');
{
  const journal = writeFixture('journal.md', `# Journal

## Session 145 — 2026-04-14
entry 145

## Session 146 — 2026-04-15
entry 146

## Session 147 — 2026-04-15
entry 147
`);
  const sinceMid = sessionLog.readSince(journal, '2026-04-15');
  assert('readSince(_, 2026-04-15) returns 2', sinceMid.length === 2, `got ${sinceMid.length}`);
  assert('first match is 146', sinceMid[0].step === 'Session 146 — 2026-04-15');
  const sinceFuture = sessionLog.readSince(journal, '2030-01-01');
  assert('readSince future returns []', sinceFuture.length === 0);
  const sincePast = sessionLog.readSince(journal, '2020-01-01');
  assert('readSince past returns all 3', sincePast.length === 3);
}

console.log('\nTest 6: readSince — undated block after first match is included');
{
  const mixed = writeFixture('mixed.md', `# Mixed

## Session 145 — 2026-04-14
entry 145

## Session 146 — 2026-04-15
entry 146

## Coda for Session 146
no date in heading

## Session 147 — 2026-04-16
entry 147
`);
  const since = sessionLog.readSince(mixed, '2026-04-15');
  assert('readSince includes undated mid-log block', since.length === 3, `got ${since.length}`);
  assert('undated block present', since.some(e => e.step === 'Coda for Session 146'));
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
process.exit(0);
