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
console.log('deliver-articles.test.js: PASS');
