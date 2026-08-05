/**
 * cronSaturdayRun.test.js — pipeline.45 Phase 3 spine: staged-set reader,
 * per-article Supermemory doc shape (customId/tags/metadata), and the
 * INTAKE→Citizen_Media_Usage row mapping (usage-type bind).
 *
 * Run: node scripts/cronSaturdayRun.test.js
 * Exits 0 on pass, 1 on failure.
 */

const { articleCustomId, articleDoc, usageRowsFor, ROLE_TO_USAGE, aggregateStorylineSignals } = require('./cron-saturday-run');

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
  text: '# Article\n\nBody.\n'
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
  assert('status staged', doc.metadata.status === 'staged');
  assert('content is article text', doc.content === ENTRY.text);
}

console.log('Test 4: articleCustomId stable');
{
  assert('deterministic', articleCustomId('102', 'stem') === articleCustomId('102', 'stem'));
  assert('cycle-distinct', articleCustomId('102', 'stem') !== articleCustomId('103', 'stem'));
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

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
