/**
 * pageLabels.test.js — code-written labels off citizens' memory pages (pipeline.112).
 * Run: node lib/pageLabels.test.js   (exits 0 pass / 1 fail). No API, no sheet.
 */
const pl = require('./pageLabels');

let passed = 0, failed = 0;
function assert(label, cond, detail) {
  if (cond) { console.log(`  ok   ${label}`); passed++; }
  else { console.error(`  FAIL ${label}${detail ? ': ' + detail : ''}`); failed++; }
}
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const SEP = pl.APPEND_SEP;

console.log('Test 1: wallLine — an office position as its holder is shown it');
{
  const cascade = { type: 'office-position', kind: 'cascade', topic: 'Budget', speaker: 'Avery Santana' };
  assert('words + metadata -> the old line', pl.wallLine('I will not sign it.', cascade) === 'stated: [Budget] Avery Santana — I will not sign it.');
  assert('no topic, no speaker', pl.wallLine('We hold.', { type: 'office-position', kind: 'cascade' }) === 'stated: We hold.');
  assert('a data wake with action and signal', pl.wallLine('We moved the patrols.', { type: 'office-position', kind: 'datawake', action: 'shifted two cars', signal: 'response 9 min' }) === 'datawake: We moved the patrols. | action: shifted two cars | signal: response 9 min');
  assert('a data wake, statement only (a worker)', pl.wallLine('Counts are in.', { type: 'office-position', kind: 'datawake' }) === 'datawake: Counts are in.');
  assert('whitespace collapsed', pl.wallLine('a\n\n b', { type: 'office-position', kind: 'datawake' }) === 'datawake: a b');
  assert('a reflection is never given a label', pl.wallLine('a private thought', { type: 'reflection', kind: 'cascade' }) === 'a private thought');
  assert('no metadata, no content', pl.wallLine('x', null) === 'x' && pl.wallLine('', { type: 'office-position' }) === '' && pl.wallLine(null, null) === '');
}

console.log('\nTest 2: recordLine — a reporter\'s filing and grade as the reporter is shown them');
{
  assert('filed', pl.recordLine('The Fund Has Moved', { kind: 'filed' }) === 'filed: The Fund Has Moved');
  assert('graded', pl.recordLine('3/3 — nothing fell short', { kind: 'graded' }) === 'graded: 3/3 — nothing fell short');
  assert('another kind, or none, is left alone', pl.recordLine('a note', { kind: 'reporter-working-note' }) === 'a note' && pl.recordLine('a thought', null) === 'a thought' && pl.recordLine('q?', { type: 'tension', kind: 'open' }) === 'q?');
}

console.log('\nTest 3: splitLabelled — one stored line into its words and its metadata');
{
  assert('tension', same(pl.splitLabelled('TENSION[c116]: Who verifies the closeout?'), { label: 'TENSION', text: 'Who verifies the closeout?', meta: { kind: 'open' } }));
  assert('tension resolved', same(pl.splitLabelled('TENSION-RESOLVED[c116]: Who wins third base?'), { label: 'TENSION-RESOLVED', text: 'Who wins third base?', meta: { kind: 'resolved' } }));
  assert('talk', same(pl.splitLabelled('TALK[c115]: We talked about the yard.'), { label: 'TALK', text: 'We talked about the yard.', meta: {} }));
  assert('filed', same(pl.splitLabelled('filed: Council Sets December Vote'), { label: 'filed', text: 'Council Sets December Vote', meta: { kind: 'filed' } }));
  assert('graded', same(pl.splitLabelled('graded: 3/3 — nothing fell short'), { label: 'graded', text: '3/3 — nothing fell short', meta: { kind: 'graded' } }));
  assert('stated: topic, speaker, words; a dash inside the words stays',
    same(pl.splitLabelled('stated: [Budget] Avery Santana — I will not sign it — not this year.', { holder: 'Avery Santana' }), { label: 'stated', text: 'I will not sign it — not this year.', meta: { topic: 'Budget', speaker: 'Avery Santana' } }));
  assert('stated: a spokesperson who is not the page holder is still a name', pl.splitLabelled('stated: [Transit] Janae Rivers — We back it.', { holder: 'Someone Else' }).meta.speaker === 'Janae Rivers');
  assert('stated: no speaker — a clause before a dash is not taken for one', same(pl.splitLabelled('stated: We wait — and we watch.', { holder: 'Ramon Vega' }), { label: 'stated', text: 'We wait — and we watch.', meta: {} }));
  assert('stated: only a topic holds the topic', same(pl.splitLabelled('stated: [Only a topic] Avery Santana — ', { holder: 'Avery Santana' }), { label: 'stated', text: 'Only a topic', meta: { speaker: 'Avery Santana' } }));
  assert('datawake: statement, action, signal', same(pl.splitLabelled('datawake: We moved the patrols. | action: shifted two cars | signal: response 9 min'), { label: 'datawake', text: 'We moved the patrols.', meta: { signal: 'response 9 min', action: 'shifted two cars' } }));
  assert('datawake: statement only', same(pl.splitLabelled('datawake: Counts are in.'), { label: 'datawake', text: 'Counts are in.', meta: {} }));
  assert('plain text is not split', pl.splitLabelled('Just a thought I had.') === null && pl.splitLabelled('I filed: nothing') === null && pl.splitLabelled('') === null);
  assert('a label inside the text is not a label', pl.splitLabelled('He said TENSION[c1]: no') === null);
}

console.log('\nTest 4: round trip — what the rewrite stores is shown the way the old entry read');
{
  const lines = [
    ['stated: [Budget] Avery Santana — I will not sign it.', { type: 'office-position', kind: 'cascade', holder: 'Avery Santana' }],
    ['stated: Avery Santana — We hold.', { type: 'office-position', kind: 'cascade', holder: 'Avery Santana' }],
    ['datawake: We moved the patrols. | action: shifted two cars | signal: response 9 min', { type: 'office-position', kind: 'datawake' }],
    ['datawake: Counts are in. | signal: 14 open', { type: 'office-position', kind: 'datawake' }],
  ];
  for (const [line, meta] of lines) {
    const hit = pl.splitLabelled(line, meta);
    assert('office: ' + line.slice(0, 40), pl.wallLine(hit.text, Object.assign({}, meta, hit.meta)) === line);
  }
  for (const line of ['filed: Council Sets December Vote', 'graded: 2/3 — The opening read as a recap.']) {
    const hit = pl.splitLabelled(line);
    assert('reporter: ' + line.slice(0, 40), pl.recordLine(hit.text, hit.meta) === line);
  }
}

console.log('\nTest 4b: an entry holding several writes is shown write by write');
{
  const oldG = 'graded: 4/4 — nothing fell short' + SEP + 'graded: 3/3 — nothing fell short';
  const g = pl.cleanContent(oldG);
  assert('grade: every write shown with its kind', pl.recordLine(g.content, g.meta) === oldG);
  const meta = { type: 'office-position', kind: 'cascade', topic: 'Budget', speaker: 'Avery Santana' };
  assert('office: every write shown as it read', pl.wallLine('I will not sign it.' + SEP + 'I said what I said.', meta) === 'stated: [Budget] Avery Santana — I will not sign it. --- stated: [Budget] Avery Santana — I said what I said.');
}

console.log('\nTest 5: cleanContent — a whole stored doc');
{
  const one = pl.cleanContent('TENSION[c116]: Who verifies the closeout?');
  assert('one line', one.changed && one.content === 'Who verifies the closeout?' && same(one.meta, { kind: 'open' }) && same(one.labels, ['TENSION']));
  const two = pl.cleanContent('graded: 2/3 — recap.' + SEP + 'graded: 3/3 — nothing fell short');
  assert('two appended writes, each cleaned, the join kept', two.content === '2/3 — recap.' + SEP + '3/3 — nothing fell short' && two.labels.length === 2);
  const mixed = pl.cleanContent('graded: 2/3 — recap.' + SEP + '3/3 — nothing fell short');
  assert('one part labelled, one already plain', mixed.changed && mixed.content === '2/3 — recap.' + SEP + '3/3 — nothing fell short' && mixed.labels.length === 1);
  const plain = pl.cleanContent('3/3 — nothing fell short');
  assert('already plain: nothing to rewrite', plain.changed === false && plain.content === '3/3 — nothing fell short' && same(plain.meta, {}));
  assert('a rerun on a cleaned doc changes nothing', pl.cleanContent(two.content).changed === false);
  const dw = pl.cleanContent('datawake: a | action: old' + SEP + 'datawake: b | action: new | signal: s');
  assert('the newest part\'s metadata stands', dw.content === 'a' + SEP + 'b' && dw.meta.action === 'new' && dw.meta.signal === 's');
  assert('nothing in, nothing out', pl.cleanContent('').changed === false && pl.cleanContent(null).content === '');
}

console.log('\nTest 6: a doc holding several writes keeps each write\'s facts (metadata.writes)');
{
  const writes = JSON.stringify([{ topic: 'Baylight Vote', speaker: 'Ramon Vega' }, { topic: 'Stabilization Fund', speaker: 'Ramon Vega' }]);
  const meta = { type: 'office-position', kind: 'cascade', topic: 'Stabilization Fund', speaker: 'Ramon Vega', writes };
  const both = 'stated: [Baylight Vote] Ramon Vega — Four bidders. --- stated: [Stabilization Fund] Ramon Vega — Receipts.';
  assert('each write under its own topic', pl.wallLine('Four bidders.' + SEP + 'Receipts.', meta) === both);
  assert('a search hit joins the writes "\\n\\n--- ": the same line', pl.wallLine('Four bidders.\n\n--- Receipts.', meta) === both);
  assert('a hit holding one write of two: a fact the writes disagree on is left off, never the wrong one',
    pl.wallLine('Four bidders.', meta) === 'stated: Ramon Vega — Four bidders.');
  assert('no list: the doc\'s own facts', pl.wallLine('Four bidders.', { type: 'office-position', kind: 'cascade', topic: 'Baylight Vote' }) === 'stated: [Baylight Vote] Four bidders.');
  assert('a list that does not parse is no list', pl.writesOf({ writes: '[{"topic":"cut off' }) === null && pl.writesOf({}) === null);
  const dw = { type: 'office-position', kind: 'datawake', action: 'two cars', signal: '9 min', writes: JSON.stringify([{ action: 'one car' }, { action: 'two cars', signal: '9 min' }]) };
  assert('a data wake, write by write', pl.wallLine('a' + SEP + 'b', dw) === 'datawake: a | action: one car --- datawake: b | action: two cars | signal: 9 min');
}

console.log('\nTest 7: writesAfter — the list after one more write lands');
{
  const prior = { type: 'office-position', kind: 'cascade', topic: 'A', speaker: 'Nina Chen' };
  assert('same facts: no list', pl.writesAfter('one', prior, { topic: 'A', speaker: 'Nina Chen', office: 'x' }) === null);
  assert('different topic: both writes listed', pl.writesAfter('one', prior, { topic: 'B', speaker: 'Nina Chen' }) === JSON.stringify([{ topic: 'A', speaker: 'Nina Chen' }, { topic: 'B', speaker: 'Nina Chen' }]));
  const listed = Object.assign({}, prior, { topic: 'B', writes: JSON.stringify([{ topic: 'A' }, { topic: 'B' }]) });
  assert('a prior list grows by one', pl.writesAfter('one' + SEP + 'two', listed, { topic: 'C' }) === JSON.stringify([{ topic: 'A' }, { topic: 'B' }, { topic: 'C' }]));
  assert('a prior list that does not match its writes: each write takes the doc\'s facts', pl.writesAfter('one' + SEP + 'two' + SEP + 'three', listed, { topic: 'C' }) ===
    JSON.stringify([{ topic: 'B', speaker: 'Nina Chen' }, { topic: 'B', speaker: 'Nina Chen' }, { topic: 'B', speaker: 'Nina Chen' }, { topic: 'C' }]));
  assert('an empty prior doc: nothing to keep', pl.writesAfter('', prior, { topic: 'B' }) === null);
}

console.log('\nTest 8: shownLine — any entry as a model is shown it');
{
  assert('office', pl.shownLine('We hold.', { type: 'office-position', kind: 'cascade', topic: 'Budget' }) === 'stated: [Budget] We hold.');
  assert('filing', pl.shownLine('The Fund Has Moved', { type: 'reflection', kind: 'filed' }) === 'filed: The Fund Has Moved');
  assert('grade', pl.shownLine('3/3 — fine', { type: 'reflection', kind: 'graded' }) === 'graded: 3/3 — fine');
  assert('a citizen\'s own words stay as stored', pl.shownLine('a quiet morning\n\nand coffee', { type: 'reflection' }) === 'a quiet morning\n\nand coffee' && pl.shownLine('why?', { type: 'tension', kind: 'open' }) === 'why?');
  assert('no metadata, no content', pl.shownLine('x', null) === 'x' && pl.shownLine(null, null) === '');
}

console.log('\nTest 9: officeWall.recordPosition — a write on a taken key carries the writes list (store stubbed)');
(async () => {
  const sent = [];
  let prior = false;
  const stub = {
    ensurePagePointer_: async () => ({ tag: 'cp-POP-00042' }),
    pageCustomId_: (tag, o) => tag + '-c' + o.cycle + '-' + o.daypart + '-' + o.key,
    pageDocByCustomId_: async () => prior,
    appendReflection_: async (pop, text, o) => { sent.push({ text, o }); return { id: 'd1', customId: 'k' }; },
  };
  require.cache[require.resolve('./citizenPage')] = { id: require.resolve('./citizenPage'), filename: require.resolve('./citizenPage'), loaded: true, exports: stub };
  const ow = require('../scripts/officeWall');
  await ow.recordPosition('POP-00042', 'Receipts.', { cycle: 104, key: 'cascade-STMT-1', kind: 'cascade', extra: { topic: 'Fund', speaker: 'Ramon Vega' } });
  assert('a new key: no list', sent[0] && sent[0].o.extra.writes === undefined && sent[0].o.extra.topic === 'Fund');
  prior = { id: 'd1', content: 'Four bidders.', metadata: { type: 'office-position', kind: 'cascade', topic: 'Baylight', speaker: 'Ramon Vega' } };
  await ow.recordPosition('POP-00042', 'Receipts.', { cycle: 104, key: 'cascade-STMT-1', kind: 'cascade', extra: { topic: 'Fund', speaker: 'Ramon Vega' } });
  assert('a taken key with another topic: both writes listed', sent[1] && sent[1].o.extra.writes === JSON.stringify([{ topic: 'Baylight', speaker: 'Ramon Vega' }, { topic: 'Fund', speaker: 'Ramon Vega' }]));
  prior = null;
  const r = await ow.recordPosition('POP-00042', 'Receipts.', { cycle: 104, key: 'cascade-STMT-1', kind: 'cascade', extra: { topic: 'Fund' } });
  assert('a failed read writes as before', r.recorded === true && sent[2] && sent[2].o.extra.writes === undefined);
  delete require.cache[require.resolve('./citizenPage')];
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
