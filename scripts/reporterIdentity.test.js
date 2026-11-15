#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { voiceFileFor, essenceOf, sheetLine, reporterIdentity } = require('./reporterIdentity');

// essenceOf: the Essence body only; nothing from the sections that say how to open, close or not write
const voice = '# Voice\n\n**Ledger:** POP-00001\n\n## Essence\n\nCovered the bridge. Reads logs for fun.\n\n## Opening Pattern\n\nAlways open on a time.\n\n## DO NOT\n\n- preach\n';
assert.strictEqual(essenceOf(voice), 'Covered the bridge. Reads logs for fun.');
assert.strictEqual(essenceOf('# Voice\n\n### Voice Essence\nHeat first.\n'), '', 'a file with no "## Essence" gives nothing');
assert.strictEqual(essenceOf(''), '');
assert.strictEqual(essenceOf('## Essence\n\nLast section, no heading after.\n'), 'Last section, no heading after.');

// voiceFileFor: the folder's own pointer decides; a missing file or no pointer is ''
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'reporter-identity-'));
fs.mkdirSync(path.join(root, 'docs', 'media', 'voices'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs', 'media', 'voices', 'test_seat.md'), voice);
const seat = path.join(root, 'seat'), bare = path.join(root, 'bare'), gone = path.join(root, 'gone');
[seat, bare, gone].forEach((d) => fs.mkdirSync(d));
fs.writeFileSync(path.join(seat, 'IDENTITY.md'), 'You are Test Seat.');
fs.writeFileSync(path.join(seat, 'LENS.md'), 'sources:\n  - docs/media/voices/test_seat.md\n');
fs.writeFileSync(path.join(bare, 'IDENTITY.md'), 'You are Bare Seat.');
fs.writeFileSync(path.join(gone, 'RULES.md'), 'Read `docs/media/voices/not_there.md`.');
assert.strictEqual(voiceFileFor(seat, root), path.join(root, 'docs', 'media', 'voices', 'test_seat.md'));
assert.strictEqual(voiceFileFor(bare, root), '');
assert.strictEqual(voiceFileFor(gone, root), '');
assert.strictEqual(voiceFileFor(path.join(root, 'no-such-folder'), root), '');

const pool = [{ popId: 'POP-00014', name: 'Test Seat', age: 39, occ: 'Sideline Reporter', nh: 'Laurel', cur: {} }];
const wp = { buildPool: async () => pool, identityLine: require('../lib/wakePerception').identityLine };
const deps = { wp, dials: { disposition: () => 'steady, hard to shake' } };

(async () => {
  // sheetLine: the daily wake's sentence + temperament; never the "not a writer" station line
  const sl = await sheetLine('pop-00014', deps);
  assert.strictEqual(sl.line, 'You are Test Seat, 39, a Sideline Reporter living in Laurel, Oakland. Your temperament: steady, hard to shake.');
  assert.ok(!/not a writer/.test(sl.line));
  assert.strictEqual((await sheetLine('POP-99999', deps)).line, '');
  assert.ok(/not on the citizen ledger/.test((await sheetLine('POP-99999', deps)).error));
  assert.ok(/no POPID/.test((await sheetLine(null, deps)).error));
  // an unreadable sheet fails open
  const down = await sheetLine('POP-00014', { wp: { buildPool: async () => { throw new Error('sheet down'); } }, dials: deps.dials });
  assert.deepStrictEqual(down, { line: '', error: 'sheet down' });
  // no dials: the sentence stands alone
  const flat = await sheetLine('POP-00014', { wp, dials: { disposition: () => { throw new Error('x'); } } });
  assert.strictEqual(flat.line, 'You are Test Seat, 39, a Sideline Reporter living in Laurel, Oakland.');

  // the sheet's family line rides with the sheet line
  const fam = await sheetLine('POP-00014', { wp: { ...wp, loadFamily: async () => "You're married to Pat Seat." }, dials: deps.dials });
  assert.ok(fam.line.endsWith("steady, hard to shake.\n\nYou're married to Pat Seat."));

  // both parts, sheet line first
  const who = await reporterIdentity({ popid: 'POP-00014', agentDir: seat, root }, deps);
  assert.strictEqual(who.block, sl.line + '\n\nCovered the bridge. Reads logs for fun.');
  assert.deepStrictEqual(who.notes, []);
  assert.ok(!/Always open on a time|preach/.test(who.block), 'no opening pattern or DO NOT line reaches the seat');
  // a folder with no voice file: the sheet line alone, and it says why
  const thin = await reporterIdentity({ popid: 'POP-00014', agentDir: bare, root }, deps);
  assert.strictEqual(thin.block, sl.line);
  assert.ok(thin.notes.some((n) => /names no voice file/.test(n)));
  // neither: an empty block, never a throw
  const none = await reporterIdentity({ popid: null, agentDir: bare, root }, deps);
  assert.strictEqual(none.block, '');

  fs.rmSync(root, { recursive: true, force: true });
  console.log('reporterIdentity.test.js: all assertions passed');
})().catch((e) => { console.error(e); process.exit(1); });

// essenceForPop: a seat holder's Essence by POPID; nobody else gets one
{
  const { essenceForPop } = require('./reporterIdentity');
  const r = fs.mkdtempSync(path.join(os.tmpdir(), 'reporter-identity-pop-'));
  fs.mkdirSync(path.join(r, 'docs', 'media', 'voices'), { recursive: true });
  fs.mkdirSync(path.join(r, '.claude', 'agents', 'seat-a'), { recursive: true });
  fs.writeFileSync(path.join(r, 'docs', 'media', 'voices', 'seat_a.md'), '# V\n\n## Essence\n\nReads logs for fun.\n\n## Exemplar\n\n> x\n');
  fs.writeFileSync(path.join(r, '.claude', 'agents', 'seat-a', 'LENS.md'), '- docs/media/voices/seat_a.md');
  const personaMap = { _comment: 'x', 'seat-a': { popid: 'POP-00014' }, 'seat-a-weekly': { popid: 'POP-00014', voiceDir: 'seat-a' }, 'seat-b': { popid: 'POP-00015' } };
  assert.strictEqual(essenceForPop('pop-00014', { personaMap, root: r }), 'Reads logs for fun.');
  assert.strictEqual(essenceForPop('POP-00015', { personaMap, root: r }), '', 'a seat whose folder names no voice file');
  assert.strictEqual(essenceForPop('POP-00001', { personaMap, root: r }), '', 'not a seat holder');
  assert.strictEqual(essenceForPop('', { personaMap, root: r }), '');
  fs.rmSync(r, { recursive: true, force: true });
}

// Traits ride after the Essence; an Exemplar never does; Traits with no Essence is nothing
assert.strictEqual(essenceOf('## Essence\n\nWho.\n\n## Traits\n\n- Dry.\n- Fair.\n\n## Exemplar\n\n> BREAKING\n'), 'Who.\n\n- Dry.\n- Fair.');
assert.strictEqual(essenceOf('## Traits\n\n- Dry.\n'), '');
