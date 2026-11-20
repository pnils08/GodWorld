'use strict';
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { journalFor } = require('./deliver-articles');

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'test-only-civis-delivery-'));
try {
  assert.equal(journalFor(path.join(root, 'absent'), 10), null);
  for (const cycle of [8, 10]) {
    fs.writeFileSync(path.join(root, `civis_journal_c${cycle}.md`), 'synthetic journal\n');
    fs.writeFileSync(path.join(root, `civis_journal_c${cycle}.json`), JSON.stringify({ cycle }) + '\n');
  }
  fs.writeFileSync(path.join(root, 'civis_journal_c11.md'), 'incomplete synthetic journal\n');
  fs.writeFileSync(path.join(root, 'civis_journal_c12.md'), 'synthetic journal\n');
  fs.writeFileSync(path.join(root, 'civis_journal_c12.json'), '{}\n');
  fs.writeFileSync(path.join(root, 'civis_journal_c13.md'), 'synthetic journal\n');
  fs.writeFileSync(path.join(root, 'civis_journal_c13.json'), 'not json');
  assert.equal(journalFor(root, 10), 'civis_journal_c10.md');
  assert.equal(journalFor(root, 9), null, 'a skipped week sends nothing, never an older entry');
  assert.equal(journalFor(root, 11), null, 'half a pair is not a journal');
  assert.equal(journalFor(root, 12), null, 'the record must name its Cycle');
  assert.equal(journalFor(root, 13), null, 'an unreadable record is not a journal');
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
// pipeline.114: how many times a piece went back to its writer, from its staged sidecar or its flags file
{
  const { sentBackRounds } = require('./deliver-articles');
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'test-only-sent-back-'));
  try {
    fs.writeFileSync(path.join(d, 'culture_c116_x.staged.json'), JSON.stringify({ sentBack: [{ round: 1 }, { round: 2 }] }));
    fs.writeFileSync(path.join(d, 'culture_c116_y.flags.json'), JSON.stringify({ flags: [], sentBack: [{ round: 1 }] }));
    fs.writeFileSync(path.join(d, 'culture_c116_z.staged.json'), JSON.stringify({ status: 'staged' }));
    assert.equal(sentBackRounds(path.join(d, 'culture_c116_x.staged.md'), false), 2, 'staged: the rounds on its sidecar');
    assert.equal(sentBackRounds(path.join(d, 'culture_c116_y.md'), true), 1, 'flagged: the rounds on its flags file');
    assert.equal(sentBackRounds(path.join(d, 'culture_c116_z.staged.md'), false), 0, 'never sent back');
    assert.equal(sentBackRounds(path.join(d, 'absent.md'), true), 0, 'no record');
  } finally { fs.rmSync(d, { recursive: true, force: true }); }
}
console.log('deliver-articles.test.js: PASS');
