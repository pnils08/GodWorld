'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { collect, render, bootDigest, missingIn, seatOf } = require('./cronFeedback');

assert.strictEqual(seatOf('civic_c999_synthetic-seat_packet-v2_x-model.wake.json'), 'synthetic-seat');
assert.deepStrictEqual(
  missingIn({ a: { missing: ['one', ' '] }, b: [{ gaps: { missingOrThin: [{ source: 'two', why: 'because' }] } }] }),
  ['one', 'two — because']
);

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cron-feedback-'));
const write = (rel, value) => {
  const file = path.join(root, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, typeof value === 'string' ? value : JSON.stringify(value));
  return file;
};
const compare = 'output/cron-compare/';
write(compare + 'civic_c999_seat-a_packet-v2_angle.json', { task: { creativeBrief: { missing: ['a synthetic lack', 'only a'] } } });
write(compare + 'civic_c999_seat-b_packet-v2_angle.json', { task: { creativeBrief: { missing: ['a synthetic lack'] } } });
write(compare + 'civic_c999_seat-a_packet-v2_x.wake.json', {
  contractScore: { opened: false, closed: true, purposeMet: true, inTarget: true, short: 'The opening missed.' },
  gradeRecord: { line: 'graded: 3/4 — The opening missed.' },
});
write(compare + 'civic_c999_seat-b_packet-v2_x.wake.json', {
  contractScore: { opened: true, closed: true, purposeMet: true, inTarget: true, short: '' },
  gradeRecord: { line: 'graded: 4/4 — nothing fell short' },
});
const stale = write(compare + 'civic_c990_seat-c_packet-v2_x.wake.json', { contractScore: { opened: false, short: 'old' } });
const old = new Date(Date.now() - 30 * 864e5);
fs.utimesSync(stale, old, old);
write(compare + 'flagged/civic_c999_seat-c_packet-v2_x.flags.json', { draft: 'civic_c999_seat-c_packet-v2_x.md', summary: 'a synthetic  finding' });
write('output/civis-journal/civis_journal_c998.json', { cycle: 998, findings: [{ selected: true, civisFinding: 'older point' }] });
write('output/civis-journal/civis_journal_c999.json', { cycle: 999, findings: [{ selected: true, civisFinding: 'a synthetic audit point' }, { selected: false, civisFinding: 'not chosen' }] });
write('output/civis-journal-failed/civis_journal_c997.failed.json', { cycle: 997, passed: false, attempts: [{ failures: ['x'] }, { failures: ['x', 'y'] }] });
write('output/civis-journal-failed/civis_journal_c999.failed.json', { cycle: 999, passed: true, attempts: [{ failures: ['repaired'] }] });
write('output/civis-journal-failed/civis_journal_c998.failed.json', { cycle: 998, passed: false, attempts: [{ failures: ['stale receipt'] }] });
write('output/notebooklm/daily/c999/aaa/manifest.json', {
  cycle: 999, driveLink: 'https://example.invalid/x', generatedAt: '2026-01-02T00:00:00Z', opsReportPath: 'ops.md',
  audioSources: [{ kind: 'article' }, { kind: 'article' }, { kind: 'background' }],
  sources: [{ kind: 'article' }],
});
write('output/notebooklm/daily/c999/bbb/manifest.json', { cycle: 999, generatedAt: '2026-01-03T00:00:00Z' });
write('logs/notebooklm-daily-news.log', 'Daily sources: 3\nDAILY SOURCE SKIPPED (non-blocking): synthetic\nNotebookLM daily news complete\n');

const feedback = collect(root, 7, Date.now());
assert.strictEqual(feedback.wakes, 2, 'the month-old wake is outside the window');
assert.deepStrictEqual(feedback.lacked[0], { text: 'a synthetic lack', seats: ['seat-a', 'seat-b'] });
assert.strictEqual(feedback.lacked.length, 2);
assert.deepStrictEqual(feedback.parts[0], { key: 'opened', label: 'the opening', failed: 1, of: 2, seats: ['seat-a'] });
assert.deepStrictEqual(feedback.shortfalls, [{ seat: 'seat-a', line: 'graded: 3/4 — The opening missed.' }]);
assert.deepStrictEqual(feedback.held, [{ draft: 'civic_c999_seat-c_packet-v2_x', summary: 'a synthetic finding' }]);
assert.deepStrictEqual(feedback.journal, { cycle: 999, points: ['a synthetic audit point'] });
assert.deepStrictEqual(feedback.unwritten, [{ cycle: 997, failures: ['x', 'y'] }], 'a week a repair rescued, or a later run wrote, is not an unwritten week');
assert.deepStrictEqual(feedback.show.kinds, { article: 2, background: 1 });
assert.strictEqual(feedback.show.opsReport, 'made, not sent', 'a downloaded report is not a delivered one; the undelivered run is not the last show');
assert.deepStrictEqual(feedback.skipped, ['DAILY SOURCE SKIPPED (non-blocking): synthetic']);

const page = render(feedback);
assert(page.includes('- a synthetic lack — seat-a, seat-b'));
assert(page.includes('- Cycle 997: no entry passed — x; y'));
const digest = bootDigest(feedback);
assert(digest.split('\n').length <= 6, 'the boot digest stays short');
assert(digest.includes('"a synthetic lack" (2 seats)'));
assert(digest.includes('no entry passed for C997'));

// An empty server still renders.
const empty = fs.mkdtempSync(path.join(os.tmpdir(), 'cron-feedback-empty-'));
assert(render(collect(empty, 7, Date.now())).includes('No entry on disk.'));
fs.rmSync(root, { recursive: true, force: true });
fs.rmSync(empty, { recursive: true, force: true });

console.log('cronFeedback tests: PASS');
