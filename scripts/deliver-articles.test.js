'use strict';
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { latestJournal } = require('./deliver-articles');

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'test-only-civis-delivery-'));
try {
  assert.equal(latestJournal(path.join(root, 'absent')), null);
  for (const cycle of [8, 10]) {
    fs.writeFileSync(path.join(root, `civis_journal_c${cycle}.md`), 'synthetic journal\n');
    fs.writeFileSync(path.join(root, `civis_journal_c${cycle}.json`), '{}\n');
  }
  fs.writeFileSync(path.join(root, 'civis_journal_c11.md'), 'incomplete synthetic journal\n');
  fs.writeFileSync(path.join(root, 'civis_journal_c999.json'), '{}\n');
  assert.equal(latestJournal(root), 'civis_journal_c10.md');
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
console.log('deliver-articles.test.js: PASS');
