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

console.log('Test 1: wallLine — an office position as its holder is shown it, either shape stored');
{
  const cascade = { type: 'office-position', kind: 'cascade', topic: 'Budget', speaker: 'Avery Santana' };
  assert('words + metadata -> the old line', pl.wallLine('I will not sign it.', cascade) === 'stated: [Budget] Avery Santana — I will not sign it.');
  assert('an entry stored with its label is shown as it is', pl.wallLine('stated: [Budget] Avery Santana — I will not sign it.', cascade) === 'stated: [Budget] Avery Santana — I will not sign it.');
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
  assert('stored with its label: as it is', pl.recordLine('filed: The Fund Has Moved', { kind: 'filed' }) === 'filed: The Fund Has Moved');
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
  assert('grade: one write stored with its label, one without', pl.recordLine('graded: 2/3 — recap.' + SEP + '3/3 — fine', { kind: 'graded' }) === 'graded: 2/3 — recap.' + SEP + 'graded: 3/3 — fine');
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

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
