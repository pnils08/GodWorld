/**
 * cronSaturdayRun.test.js — pipeline.45 Phase 3 spine: staged-set reader,
 * per-article Supermemory doc shape (customId/tags/metadata), and the
 * INTAKE→Citizen_Media_Usage row mapping (usage-type bind).
 *
 * Run: node scripts/cronSaturdayRun.test.js
 * Exits 0 on pass, 1 on failure.
 */

const { articleCustomId, articleDoc, usageRowsFor, ROLE_TO_USAGE,
  aggregateStorylineSignals, mergeStorylineLedger, STORYLINE_LEDGER_HEADERS,
  verifyStagedProof } = require('./cron-saturday-run');

let passed = 0;
let failed = 0;
function assert(label, cond, detail) {
  if (cond) { console.log(`  ok   ${label}`); passed++; }
  else { console.error(`  FAIL ${label}${detail ? ': ' + detail : ''}`); failed++; }
}

const ENTRY = {
  stem: 'business_c102_dana-reeve_deepseek-deepseek-chat',
  sidecar: {
    status: 'staged', desk: 'business', cycle: '102',
    byline: 'Dana Reeve', bylinePopid: 'POP-00010',
    intake: {
      names: [
        { name: 'Lucia Polito', role: 'quoted-source', popid: 'POP-00654' },
        { name: 'Calvin Turner', role: 'subject', popid: 'POP-00381' },
        { name: 'Ghost Person', role: 'mentioned', popid: null },
        { name: 'Tomas Renteria', role: 'mentioned', popid: 'POP-00122' }
      ],
      businesses: [{ name: "Rico's Auto", bizId: null, role: 'mentioned' }],
      storylines: [{ slug: 'fruitvale-transit-hub', verb: 'advanced' }],
      hoods: ['Fruitvale'],
      claims: [{ claim: 'A claim', sourceRef: 'world_summary_c102' }]
    }
  },
  text: '# Nightline still had the lights\n\nKai stood under the Nightline awning on a quiet West Oakland night and watched the door stay open for people who were not coming. The winter air sat on the block the way it does when the room is ready and the city has other plans. Gregory Mims said:\n\n> “The warehouse been empty since before my daughter was born.”\n\nHe said it like a man who has already walked past the same flyer three cycles running. That is what a quiet night is here: a room that can hold a crowd, and a neighbor who already knows where the crowd went. The condition is real. The story is the people standing in it.\n'
};

console.log('Test 1: usage-type bind (ROLE_TO_USAGE)');
{
  assert('subject → featured', ROLE_TO_USAGE.subject === 'featured');
  assert('mentioned → mentioned', ROLE_TO_USAGE.mentioned === 'mentioned');
  assert('quoted-source NOT mapped (wake-2 owns that class)', !('quoted-source' in ROLE_TO_USAGE));
}

console.log('Test 2: usageRowsFor');
{
  const rows = usageRowsFor(ENTRY);
  assert('2 rows (quoted-source skipped, null-popid skipped)', rows.length === 2, JSON.stringify(rows));
  assert('subject row', rows[0].name === 'Calvin Turner' && rows[0].usageType === 'featured');
  assert('mentioned row', rows[1].name === 'Tomas Renteria' && rows[1].usageType === 'mentioned');
  assert('context is stem', rows.every(r => r.context === ENTRY.stem));
  assert('no intake → no rows', usageRowsFor({ stem: 'x', sidecar: {}, text: '' }).length === 0);
}

console.log('Test 3: articleDoc (Supermemory shape)');
{
  const doc = articleDoc('102', ENTRY);
  assert('customId scheme', doc.customId === 'article-c102-business_c102_dana-reeve_deepseek-deepseek-chat');
  assert('tags: container + journalist + cycle + desk',
    JSON.stringify(doc.containerTags) === JSON.stringify(['bay-tribune', 'journalist-POP-00010', 'cycle-102', 'business']));
  assert('metadata byline/desk/cycle', doc.metadata.byline === 'Dana Reeve' && doc.metadata.desk === 'business' && doc.metadata.cycle === '102');
  assert('metadata popids flat string, nulls dropped', doc.metadata.popids === 'POP-00654,POP-00381,POP-00122');
  assert('metadata hoods + storylines', doc.metadata.hoods === 'Fruitvale' && doc.metadata.storylines === 'fruitvale-transit-hub');
  assert('all Saturday-swept Articles become canon', doc.metadata.status === 'canon');
  assert('content is article text', doc.content === ENTRY.text);
}

console.log('Test 4: articleCustomId stable');
{
  assert('deterministic', articleCustomId('102', 'stem') === articleCustomId('102', 'stem'));
  assert('cycle-distinct', articleCustomId('102', 'stem') !== articleCustomId('103', 'stem'));
}

console.log('Test 4b: staged proof is exact and fail-closed');
{
  const crypto = require('crypto');
  const sha = crypto.createHash('sha256').update(ENTRY.text).digest('hex');
  assert('inline Rhea proof accepted', verifyStagedProof({ status: 'staged', rhea: { pass: true, draftSha256: sha } }, ENTRY.text, null).ok);
  assert('legacy adjacent verdict accepted', verifyStagedProof({ status: 'staged' }, ENTRY.text, { pass: true, draftSha256: sha }).ok);
  assert('non-staged status rejected', !verifyStagedProof({ status: 'flagged', rhea: { pass: true, draftSha256: sha } }, ENTRY.text, null).ok);
  assert('missing Rhea pass rejected', !verifyStagedProof({ status: 'staged' }, ENTRY.text, null).ok);
  assert('post-review Article mutation rejected', !verifyStagedProof({ status: 'staged', rhea: { pass: true, draftSha256: sha } }, ENTRY.text + 'changed', null).ok);
  const lattice = '# Test\n\nCalvin Turner said: “This deserves a closer look. What happens next? I am going to keep watching this.”';
  const latticeSha = crypto.createHash('sha256').update(lattice).digest('hex');
  const blocked = verifyStagedProof({ status: 'staged', desk: 'civic',
    rhea: { pass: true, draftSha256: latticeSha } }, lattice, null);
  assert('exact Rhea pass cannot override deterministic contamination',
    !blocked.ok && blocked.contamination && blocked.contamination.fail, JSON.stringify(blocked));
  const brief = '# Dimond cooling\n\nThe supplied record establishes:\n\n- Dimond cooling\n\nThe next reporting question is: What remains to be learned here?\n';
  const briefSha = crypto.createHash('sha256').update(brief).digest('hex');
  const briefBlocked = verifyStagedProof({ status: 'staged', desk: 'business',
    rhea: { pass: true, draftSha256: briefSha } }, brief, null);
  assert('code-rendered source brief cannot become Saturday canon',
    !briefBlocked.ok && /code-rendered/.test(briefBlocked.reason || ''), JSON.stringify(briefBlocked));
}

console.log('Test 5: aggregateStorylineSignals');
{
  const mk = (stem, storylines, hoods, names) => ({
    stem, text: '', sidecar: { intake: { storylines, hoods, names, businesses: [], claims: [] } }
  });
  const set = [
    mk('a1', [{ slug: 'transit-hub', verb: 'advanced' }], ['Fruitvale'], [{ name: 'X', popid: 'POP-00001', role: 'subject' }]),
    mk('a2', [{ slug: 'transit-hub', verb: 'advanced' }, { slug: 'quiet-arc', verb: 'referenced' }], ['Uptown'], []),
    mk('a3', [{ slug: 'new-thread', verb: 'opened' }], [], [{ name: 'Y', popid: null, role: 'mentioned' }]),
    { stem: 'a4', text: '', sidecar: {} }   // legacy, no intake — skipped
  ];
  const sig = aggregateStorylineSignals(set);
  assert('3 slugs', sig.length === 3, JSON.stringify(sig.map(s => s.slug)));
  assert('moves rank above references', sig[0].slug === 'transit-hub' && sig[sig.length - 1].slug === 'quiet-arc');
  assert('verb counts', sig[0].advanced === 2 && sig[0].opened === 0);
  assert('articles collected', JSON.stringify(sig[0].articles) === JSON.stringify(['a1', 'a2']));
  assert('hoods deduped across articles', JSON.stringify(sig[0].hoods) === JSON.stringify(['Fruitvale', 'Uptown']));
  assert('citizens: resolved popids only', JSON.stringify(sig[0].citizens) === JSON.stringify(['POP-00001']));
  assert('free-form slug accepted (no registry check)', sig.some(s => s.slug === 'new-thread'));
}

console.log('Test 6: mergeStorylineLedger');
{
  const sig = (slug, verbs, extra) => Object.assign({
    slug, advanced: 0, opened: 0, closed: 0, referenced: 0,
    articles: ['a1'], citizens: [], hoods: [], desks: []
  }, verbs, extra || {});
  const H = STORYLINE_LEDGER_HEADERS;

  // fresh tab (headers only) → all appends
  const fresh = mergeStorylineLedger([H], [sig('new-thread', { opened: 1 })], '103');
  assert('fresh: 1 append 0 updates', fresh.appends.length === 1 && fresh.updates.length === 0);
  assert('fresh: keyed + cycles + status', fresh.appends[0][0] === 'new-thread' &&
    fresh.appends[0][1] === '103' && fresh.appends[0][2] === '103' && fresh.appends[0][3] === 'open');

  // existing row accumulates + repositions LastCycle
  const existing = [H, ['transit-hub', '101', '102', 'open', 3, 1, 0, 2, 4, 'POP-00001', 'Fruitvale', 'civic']];
  const m = mergeStorylineLedger(existing,
    [sig('transit-hub', { advanced: 2, referenced: 1 }, { citizens: ['POP-00002', 'POP-00001'], hoods: ['Uptown'], desks: ['business'], articles: ['a1', 'a2'] })], '103');
  assert('update not append', m.updates.length === 1 && m.appends.length === 0);
  const row = m.updates[0].row;
  assert('sheetRow preserved', m.updates[0].sheetRow === 2);
  assert('counts accumulate', row[4] === 5 && row[7] === 3 && row[8] === 6);
  assert('LastCycle bumped, FirstCycle kept', row[2] === '103' && row[1] === '101');
  assert('lists deduped-merged', row[9] === 'POP-00001,POP-00002' && row[10] === 'Fruitvale,Uptown' && row[11] === 'civic,business');

  // status transitions
  const closedRow = [H, ['done-arc', '99', '100', 'open', 1, 0, 0, 0, 1, '', '', '']];
  const closes = mergeStorylineLedger(closedRow, [sig('done-arc', { closed: 1 })], '103');
  assert('closed verb closes', closes.updates[0].row[3] === 'closed');
  const reopens = mergeStorylineLedger([H, ['done-arc', '99', '100', 'closed', 1, 0, 1, 0, 1, '', '', '']],
    [sig('done-arc', { advanced: 1 })], '104');
  assert('advance reopens', reopens.updates[0].row[3] === 'open');
  const refOnly = mergeStorylineLedger([H, ['done-arc', '99', '100', 'closed', 1, 0, 1, 0, 1, '', '', '']],
    [sig('done-arc', { referenced: 1 })], '104');
  assert('reference never flips status', refOnly.updates[0].row[3] === 'closed');
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
