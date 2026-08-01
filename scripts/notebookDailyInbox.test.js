#!/usr/bin/env node

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { readDailyInbox, validDriveLink } = require('./notebookDailyInbox');

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'godworld-notebook-inbox-synthetic-'));

function writeRun(cycle, hash, overrides = {}) {
  const runDir = path.join(tempRoot, 'c' + cycle, hash);
  fs.mkdirSync(runDir, { recursive: true });
  const manifest = Object.assign({
    artifactClass: 'NLM_DAILY_RUN',
    canonStatus: 'NOT_CANON',
    cycle,
    packHash: hash + 'syntheticpackhash',
    generatedAt: '2042-01-01T00:00:00.000Z',
    archiveNotebookId: 'must-not-leak',
    newsroomNotebookId: 'must-not-leak',
    sourceIds: ['must-not-leak'],
    driveLink: 'https://drive.google.com/file/d/synthetic/view',
    audioPath: 'output/notebooklm/daily/synthetic.m4a',
  }, overrides.manifest || {});
  const brief = Object.assign({
    answer: 'SYNTHETIC NON-CANON daily brief.',
    sources_used: [{ id: 'must-not-leak' }, { id: 'also-must-not-leak' }],
  }, overrides.brief || {});
  fs.writeFileSync(path.join(runDir, 'manifest.json'), JSON.stringify(manifest));
  fs.writeFileSync(path.join(runDir, 'daily-brief.json'), JSON.stringify(brief));
  fs.writeFileSync(path.join(runDir, 'daily-brief.md'), overrides.markdown || [
    '# Synthetic daily brief', '', 'Canon status: NOT CANON.', '', 'SYNTHETIC NON-CANON.',
  ].join('\n'));
}

try {
  writeRun(999, 'abcdef123456');
  writeRun(1000, 'abcdef123457', { manifest: { generatedAt: '2042-01-02T00:00:00.000Z' } });
  const inbox = readDailyInbox({ dailyRoot: tempRoot, limit: 7 });
  assert.strictEqual(inbox.items.length, 2);
  assert.strictEqual(inbox.items[0].cycle, 1000, 'newest artifact comes first');
  assert.deepStrictEqual(inbox.items[0], {
    cycle: 1000,
    generatedAt: '2042-01-02T00:00:00.000Z',
    answer: 'SYNTHETIC NON-CANON daily brief.',
    citationCount: 2,
    canonStatus: 'NOT_CANON',
    driveLink: 'https://drive.google.com/file/d/synthetic/view',
  });
  assert(!JSON.stringify(inbox).includes('must-not-leak'));
  assert(!JSON.stringify(inbox).includes('audioPath'));

  writeRun(1001, 'abcdef123458', { manifest: { canonStatus: 'CANON' } });
  writeRun(1002, 'abcdef123459', { markdown: '# Synthetic\n\nCanon status: CANON.' });
  fs.mkdirSync(path.join(tempRoot, 'c1003', 'abcdef123460'), { recursive: true });
  fs.writeFileSync(path.join(tempRoot, 'c1003', 'abcdef123460', 'manifest.json'), '{ malformed');
  const rejected = readDailyInbox({ dailyRoot: tempRoot, limit: 7 });
  assert.strictEqual(rejected.items.length, 2, 'incomplete and canon-drift artifacts are excluded');
  assert.strictEqual(rejected.warnings.length, 3);

  assert.strictEqual(validDriveLink('https://drive.google.com/file/d/synthetic/view'), 'https://drive.google.com/file/d/synthetic/view');
  assert.strictEqual(validDriveLink('https://example.invalid/synthetic'), null);
  assert.strictEqual(validDriveLink('file:///tmp/synthetic.m4a'), null);
  assert.throws(() => readDailyInbox({ dailyRoot: tempRoot, limit: 0 }), /limit must be an integer/);

  const symlinkHash = 'abcdef123461';
  writeRun(1004, symlinkHash);
  const symlinkBrief = path.join(tempRoot, 'c1004', symlinkHash, 'daily-brief.md');
  fs.unlinkSync(symlinkBrief);
  fs.symlinkSync('/tmp', symlinkBrief);
  const traversal = readDailyInbox({ dailyRoot: tempRoot, limit: 7 });
  assert.strictEqual(traversal.items.length, 2, 'symlink/path traversal artifact is excluded');
  assert.strictEqual(traversal.warnings.length, 4);

  console.log('notebookDailyInbox tests: PASS');
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
