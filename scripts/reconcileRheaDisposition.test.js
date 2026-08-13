#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  sha256File,
  reconcileVerdict
} = require('./reconcileRheaDisposition');

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'godworld-rhea-disposition-'));
const compare = path.join(root, 'output', 'cron-compare');
const flagged = path.join(compare, 'flagged');
const staged = path.join(compare, 'staged');
fs.mkdirSync(flagged, { recursive: true });

function writeJson(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2));
}

function fixture(stem, pass, hashOverride) {
  const draft = path.join(compare, stem + '.md');
  fs.writeFileSync(draft, [
    '# TEST-ONLY Article', '', 'Supplied test fact.', '',
    '## INTAKE', 'HOOD: TEST-HOOD', 'CLAIM: Supplied test fact | TEST-SOURCE'
  ].join('\n'));
  writeJson(path.join(compare, stem + '.wake.json'), {
    desk: 'civic', cycle: '999', persona: 'test-reporter',
    byline: { name: 'Test Reporter', popid: 'POP-99999' },
    disposition: pass ? 'flagged' : 'staged', article: 'TEST-OLD-PATH'
  });
  writeJson(path.join(compare, stem + '.state.json'), { exposure: { sources: [] } });
  const verdict = path.join(compare, stem + '.rhea.json');
  writeJson(verdict, {
    draft: path.relative(root, draft), cycle: '999', model: 'test/rhea', pass,
    draftSha256: hashOverride || sha256File(draft),
    flags: pass ? [] : [{ claim: 'TEST', issue: 'TEST failure', severity: 'high' }],
    flagCount: pass ? 0 : 1, summary: pass ? 'pass' : 'fail',
    reviewProfile: { manifestId: 'AM-TEST' }, ranAt: '2026-08-13T08:00:00.000Z'
  });
  return { draft, verdict };
}

try {
  console.log('Test 1: pass promotes current reviewed Article and archives active failure');
  const pass = fixture('civic_c999_test-pass', true);
  fs.writeFileSync(path.join(flagged, 'civic_c999_test-pass.md'), 'old failed Article');
  writeJson(path.join(flagged, 'civic_c999_test-pass.flags.json'), { flags: ['old'] });
  const promoted = reconcileVerdict({ root, verdictPath: pass.verdict, apply: true,
    now: new Date('2026-08-13T08:30:00.000Z') });
  assert.equal(promoted.disposition, 'staged');
  assert.equal(sha256File(path.join(staged, 'civic_c999_test-pass.staged.md')), sha256File(pass.draft));
  const promotedSide = JSON.parse(fs.readFileSync(
    path.join(staged, 'civic_c999_test-pass.staged.json'), 'utf8'));
  assert.equal(promotedSide.rhea.draftSha256, sha256File(pass.draft));
  assert.deepStrictEqual(promotedSide.intake.hoods, ['TEST-HOOD']);
  assert.equal(JSON.parse(fs.readFileSync(path.join(compare, 'civic_c999_test-pass.wake.json'))).disposition, 'staged');
  assert(!fs.existsSync(path.join(flagged, 'civic_c999_test-pass.flags.json')));
  assert(fs.readdirSync(path.join(flagged, 'history')).some(file => file.includes('.cleared.')));

  console.log('Test 2: failed re-review removes live stage and restores active review pair');
  const failedVerdict = JSON.parse(fs.readFileSync(pass.verdict, 'utf8'));
  failedVerdict.pass = false;
  failedVerdict.flags = [{ claim: 'TEST', issue: 'TEST failure', severity: 'high' }];
  failedVerdict.flagCount = 1;
  writeJson(pass.verdict, failedVerdict);
  const demoted = reconcileVerdict({ root, verdictPath: pass.verdict, apply: true,
    now: new Date('2026-08-13T08:45:00.000Z') });
  assert.equal(demoted.disposition, 'flagged');
  assert(!fs.existsSync(path.join(staged, 'civic_c999_test-pass.staged.json')));
  assert.equal(sha256File(path.join(flagged, 'civic_c999_test-pass.md')), sha256File(pass.draft));
  assert.equal(JSON.parse(fs.readFileSync(path.join(flagged,
    'civic_c999_test-pass.flags.json'))).flags.length, 1);
  assert.equal(JSON.parse(fs.readFileSync(path.join(compare,
    'civic_c999_test-pass.wake.json'))).disposition, 'flagged');

  console.log('Test 3: stale hash fails closed');
  const stale = fixture('civic_c999_test-stale', true, '0'.repeat(64));
  assert.throws(() => reconcileVerdict({ root, verdictPath: stale.verdict, apply: true }),
    /stale Rhea verdict/);
  assert(!fs.existsSync(path.join(staged, 'civic_c999_test-stale.staged.md')));

  console.log('Test 4: dry-run does not mutate');
  const dry = fixture('civic_c999_test-dry', true);
  const planned = reconcileVerdict({ root, verdictPath: dry.verdict, apply: false });
  assert.equal(planned.disposition, 'staged');
  assert(!fs.existsSync(path.join(staged, 'civic_c999_test-dry.staged.md')));

  console.log('reconcileRheaDisposition.test.js: PASS');
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
