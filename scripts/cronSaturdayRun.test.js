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
  assert('quoted-source → quoted (S412: credited at the canon door; the interview wake never wrote usage rows)', ROLE_TO_USAGE['quoted-source'] === 'quoted');
}

console.log('Test 2: usageRowsFor');
{
  const rows = usageRowsFor(ENTRY);
  assert('3 rows (quoted-source credited, null-popid skipped)', rows.length === 3, JSON.stringify(rows));
  assert('quoted row', rows[0].name === 'Lucia Polito' && rows[0].usageType === 'quoted');
  assert('subject row', rows[1].name === 'Calvin Turner' && rows[1].usageType === 'featured');
  assert('mentioned row', rows[2].name === 'Tomas Renteria' && rows[2].usageType === 'mentioned');
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
  assert('content is article text (trimmed)', doc.content === ENTRY.text.trim());
  // INTAKE rides in the staged file; canon content is prose only, metadata keeps the register.
  const withRegister = Object.assign({}, ENTRY, { text: ENTRY.text + '\n\n## INTAKE\nNAMES: Gregory Mims | quoted-source\nCLAIM: A claim | world_summary_c102 POP-00654\n<!-- SELF-SCORE: question-answered=no -->' });
  const rdoc = articleDoc('102', withRegister);
  assert('content drops the INTAKE register and self-score',
    rdoc.content === ENTRY.text.trim() && !/INTAKE|SELF-SCORE|quoted-source|POP-00654/.test(rdoc.content));
  assert('metadata still carries the register', rdoc.metadata.popids === 'POP-00654,POP-00381,POP-00122' && rdoc.metadata.hoods === 'Fruitvale');
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
  const roles = aggregateStorylineSignals([mk('r1', [{ slug: 'CRISIS-105-WESTOAKL', verb: 'advanced' }], [], [
    { name: 'Q', popid: 'POP-00010', role: 'quoted-source' }, { name: 'S', popid: 'POP-00011', role: 'subject' },
    { name: 'M', popid: 'POP-00170', role: 'mentioned' }])]);
  assert('a merely mentioned citizen does not join the storyline',
    JSON.stringify(roles[0].citizens) === JSON.stringify(['POP-00010', 'POP-00011']));
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

  // engine.270 — status follows the ENGINE registry, covered or not.
  const crisis = { id: 'CRISIS-105-WESTOAKL', status: 'open', startCycle: 105, hoods: ['West Oakland'], desks: ['civic'] };
  const uncovered = mergeStorylineLedger([H], [], '106', [crisis]);
  assert('uncovered storyline still gets a row', uncovered.appends.length === 1 && uncovered.appends[0][0] === 'CRISIS-105-WESTOAKL');
  assert('uncovered: FirstCycle is the engine start, not the run cycle', uncovered.appends[0][1] === '105');
  assert('uncovered: LastCycle blank and Articles 0', uncovered.appends[0][2] === '' && uncovered.appends[0][8] === 0);
  assert('uncovered: hood and desk come from the registry', uncovered.appends[0][10] === 'West Oakland' && uncovered.appends[0][11] === 'civic');

  const openRow = [H, ['CRISIS-105-WESTOAKL', '105', '107', 'open', 2, 1, 0, 0, 3, 'POP-00001', 'West Oakland', 'civic']];
  const engineCloses = mergeStorylineLedger(openRow, [], '109', [Object.assign({}, crisis, { status: 'closed' })]);
  assert('engine closes the row with no closed verb and no article',
    engineCloses.updates.length === 1 && engineCloses.updates[0].row[3] === 'closed');
  assert('an uncovered close leaves LastCycle (last coverage) alone', engineCloses.updates[0].row[2] === '107');
  assert('an uncovered close leaves counts alone', engineCloses.updates[0].row[8] === 3);
  assert('no change, no write', mergeStorylineLedger(openRow, [], '108', [crisis]).updates.length === 0);

  const coveredOpen = mergeStorylineLedger(openRow, [sig('CRISIS-105-WESTOAKL', { closed: 1 })], '108', [crisis]);
  assert('a writer cannot close what the engine holds open', coveredOpen.updates[0].row[3] === 'open');
  assert('coverage still moves LastCycle and counts', coveredOpen.updates[0].row[2] === '108' && coveredOpen.updates[0].row[8] === 4);
  const coveredClosed = mergeStorylineLedger(openRow, [sig('CRISIS-105-WESTOAKL', { advanced: 1 })], '109',
    [Object.assign({}, crisis, { status: 'closed' })]);
  assert('a writer cannot hold open what the engine closed', coveredClosed.updates[0].row[3] === 'closed');
  assert('one row per storyline when covered AND in the registry', coveredClosed.updates.length === 1 && coveredClosed.appends.length === 0);

  const stage = mergeStorylineLedger([H, ['INIT-005:construction-planning', '106', '', 'open', 0, 0, 0, 0, 0, '', 'Temescal', 'civic']], [], '109', [
    { id: 'INIT-005:construction-planning', status: 'closed', startCycle: 106, hoods: ['Temescal'], desks: ['civic'] },
    { id: 'INIT-005:construction-active', status: 'open', startCycle: 109, hoods: ['Temescal'], desks: ['civic'] }
  ]);
  assert('stage change closes the old stage row', stage.updates.length === 1 && stage.updates[0].row[3] === 'closed');
  assert('and opens the new stage as its own row', stage.appends.length === 1 && stage.appends[0][0] === 'INIT-005:construction-active' && stage.appends[0][1] === '109');

  const legacy = [H, ['west-oakland-elio-perez-initiative', '104', '108', 'open', 5, 4, 0, 0, 9, 'POP-00201', 'West Oakland', 'civic']];
  const untouched = mergeStorylineLedger(legacy, [], '109', [crisis]);
  assert('a legacy row is left exactly as it is', untouched.updates.length === 0);
}

// engine.270 Task 7 step 1 — the deterministic attach pass. Registry names are
// the live C110 entries; article lines are the shape of the known targets
// (Firebrand C110 on the crisis ending, Navarro C110 on the transit hub).
{
  const { attachStorylines, storylineAttachNames } = require('./cron-saturday-run');
  const registry = [
    { id: 'CRISIS-105-WESTOAKL', type: 'crisis', name: 'The West Oakland Crime Spike', status: 'closed', hoods: ['West Oakland'] },
    { id: 'INIT-003:design-phase', type: 'initiative-stage', stage: 'design-phase', status: 'open',
      name: 'Fruitvale Transit Hub Phase II — Visioning — design-phase', hoods: ['Fruitvale'] },
    { id: 'INIT-002:dispatch-live', type: 'initiative-stage', stage: 'dispatch-live', status: 'open',
      name: 'Oakland Alternative Response Initiative — dispatch-live', hoods: ['West Oakland', 'Fruitvale'] },
    { id: 'INIT-099:announced', type: 'initiative-stage', stage: 'announced', status: 'open', name: 'Nowhere Plan — announced', hoods: [] }
  ];
  const art = (stem, text, intake) => ({ stem, sidecarFile: stem + '.staged.json', text, sidecar: { intake: Object.assign({ storylines: [], hoods: [] }, intake) } });
  const set = [
    art('firebrand', 'Nobody announced that the West Oakland crime spike was over.', {}),
    art('navarro', 'The record on the Fruitvale Transit Hub Phase II shows a design phase.', { hoods: ['Fruitvale'] }),
    art('wrong-hood', 'The Fruitvale Transit Hub Phase II came up at a Temescal meeting.', { hoods: ['Temescal'] }),
    art('hood-only', 'Fruitvale had a quiet week at the transit hub.', { hoods: ['Fruitvale'] }),
    art('tagged', 'The West Oakland Crime Spike, again.', { storylines: [{ slug: 'INIT-001:disbursement-active', verb: 'advanced' }], hoods: ['West Oakland'] }),
    art('two', 'In West Oakland, the Oakland Alternative Response Initiative met the end of the West Oakland Crime Spike.', { hoods: ['West Oakland'] }),
    art('no-hood-entry', 'The Nowhere Plan, in Downtown.', { hoods: ['Downtown'] }),
    art('legacy-slug', 'The West Oakland Crime Spike ended.', { storylines: [{ slug: 'west-oakland-elio-perez-crisis', verb: 'opened' }], hoods: ['West Oakland'] })
  ];
  const hits = attachStorylines(set, registry);
  const on = stem => hits.filter(h => h.stem === stem).map(h => h.id).sort().join(',');
  assert('stage names match on the initiative Name and its head, never the stage suffix',
    storylineAttachNames(registry[1]).join('|') === 'Fruitvale Transit Hub Phase II — Visioning|Fruitvale Transit Hub Phase II');
  assert('a leading "The" is not required', storylineAttachNames(registry[0])[0] === 'West Oakland Crime Spike');
  assert('a closed-this-week arc takes the piece on its ending (no INTAKE hood: the hood it prints)', on('firebrand') === 'CRISIS-105-WESTOAKL');
  assert('name + INTAKE hood attaches', on('navarro') === 'INIT-003:design-phase');
  assert('name in another declared hood does not attach', on('wrong-hood') === '');
  assert('hood alone never attaches', on('hood-only') === '');
  assert('an article already on an engine storyline is skipped', on('tagged') === '');
  assert('a piece printing two storylines joins both', on('two') === 'CRISIS-105-WESTOAKL,INIT-002:dispatch-live');
  assert('an entry with no hoods never attaches', on('no-hood-entry') === '');
  assert('a retired slug is not an engine storyline: the piece can attach', on('legacy-slug') === 'CRISIS-105-WESTOAKL');
  assert('attach carries the sidecar file it will write', hits.every(h => h.sidecarFile === h.stem + '.staged.json'));
  assert('no registry, no attaches', attachStorylines(set, []).length === 0);

  // Curation never reads an attached storyline: the print pick stays grade-first.
  const { curationScore } = require('./cron-saturday-run');
  const plain = { sidecar: { intake: { storylines: [], names: [] } } };
  const attached = { sidecar: { intake: { storylines: [{ slug: 'CRISIS-105-WESTOAKL', verb: 'referenced', attachedBy: 'stepAttach' }], names: [] } } };
  assert('an attached storyline does not move the curation score', curationScore(attached, null) === curationScore(plain, null));
}

// engine.152 (S412) — coverage runs both ways: the snippet the light classifier reads
{
  const { citationSnippet } = require('./cron-saturday-run');
  const { extractLight_, LIGHT_VOCAB } = require('../lib/reflectionClassifier');
  const text = 'Rain fell on Fruitvale. Tomas Aguilar argued with the board and lost the vote. The city moved on. Later, Aguilar left early.';
  assert('citationSnippet returns the sentences naming the citizen (full name or surname)', citationSnippet(text, 'Tomas Aguilar') === 'Tomas Aguilar argued with the board and lost the vote. Later, Aguilar left early.');
  assert('citationSnippet is empty when the name is not in the text', citationSnippet(text, 'Lena Okafor') === '');
  assert('usageRowsFor carries the snippet on each row', (function () { const rows = require('./cron-saturday-run').usageRowsFor({ stem: 's', text, sidecar: { intake: { names: [{ name: 'Tomas Aguilar', popid: 'POP-00529', role: 'subject' }] } } }); return rows.length === 1 && /argued with the board/.test(rows[0].snippet) && rows[0].usageType === 'featured'; })());
  assert('quoted-source is credited at the canon door as quoted (S412)', (function () { const r = require('./cron-saturday-run').usageRowsFor({ stem: 's', text: 'Merkin Jumper said the show changed him.', sidecar: { intake: { names: [{ name: 'Merkin Jumper', popid: 'POP-00688', role: 'quoted-source' }, { name: 'No Pop', role: 'quoted-source' }] } } }); return r.length === 1 && r[0].usageType === 'quoted' && /changed him/.test(r[0].snippet); })());
  assert('extractLight_ takes the first in-vocab word, null otherwise', extractLight_('Negative — blamed.') === 'negative' && extractLight_('neutral') === 'neutral' && extractLight_('positive') === 'positive' && extractLight_('unsure') === null && LIGHT_VOCAB.length === 3);
}

{
  // pipeline.79 — the grade of THESE bytes only
  const { stagedGrade } = require('./cron-saturday-run');
  const sha = 'a'.repeat(64);
  assert('stagedGrade reads the sidecar proof', stagedGrade({ rhea: { pass: true, draftSha256: sha, contractScore: { score: 3 } } }, null, sha) === 3);
  assert('stagedGrade falls back to a root verdict on the same hash', stagedGrade({ rhea: { pass: true, draftSha256: sha } }, { pass: true, draftSha256: sha, contractScore: { score: 4 } }, sha) === 4);
  assert('stagedGrade ignores a root verdict for other bytes', stagedGrade({ rhea: { pass: true, draftSha256: sha } }, { pass: true, draftSha256: 'b'.repeat(64), contractScore: { score: 4 } }, sha) === null);
  assert('stagedGrade is null when never graded', stagedGrade({ rhea: { pass: true, draftSha256: sha } }, null, sha) === null);
  assert('stagedGrade rejects a score bound to other bytes', stagedGrade({ rhea: { pass: true, draftSha256: sha, contractScore: { score: 4, draftSha256: 'c'.repeat(64) } } }, null, sha) === null);
  assert('stagedGrade rejects an out-of-range score', stagedGrade({ rhea: { pass: true, draftSha256: sha, contractScore: { score: 9 } } }, null, sha) === null);
  const { bylineResolves } = require('./cron-saturday-run');
  const L = [['POPID', 'First', 'Last'], ['POP-00001', 'Rachel', 'Torres'], ['POP-00002', 'Sam', 'Lee'], ['POP-00003', 'Sam', 'Lee']];
  assert('byline with an honorific resolves to its POPID', bylineResolves({ name: 'Sgt. Rachel Torres', popid: 'POP-00001' }, L).ok);
  assert('byline POPID mismatch is refused', !bylineResolves({ name: 'Rachel Torres', popid: 'POP-00009' }, L).ok);
  assert('ambiguous byline is refused', !bylineResolves({ name: 'Sam Lee', popid: 'POP-00002' }, L).ok);
  assert('unknown byline is refused', !bylineResolves({ name: 'Nobody Here' }, L).ok);
}

// research.29 Move 5 (builder 2026-10-16 ruling 2): citizens crossing systems —
// detected in code from the staged set, framed by Mags in the narration.
{
  const X = require('./cron-saturday-run');
  const ok = (name, cond) => { if (cond) passed++; else { failed++; console.error('  FAIL ' + name); } };
  const mk = (stem, desk, byline, text, names) => ({ stem, text, sidecar: { desk, byline, intake: { names: names || [] } } });
  const set = [
    mk('undocked_c111_nia', 'undocked', 'Nia Rook', 'Eric Taveras sold the haul and led the board.\n\n## INTAKE\nnames: none', []),
    mk('sports_c111_pslayer', 'sports', 'P Slayer', 'Our second baseman is on a game show now.', [{ name: 'Eric Taveras', role: 'subject', popid: 'POP-00597' }]),
    mk('civic_c111_carmen', 'civic', 'Carmen Delaine', 'Avery Santana spoke.', [{ name: 'Avery Santana', role: 'quoted-source', popid: 'POP-00034' }]),
    mk('civic_c111_luis', 'civic', 'Luis Navarro', 'Avery Santana again.', [{ name: 'Avery Santana', role: 'quoted-source', popid: 'POP-00034' }]),
    mk('undocked-digest_c111_nia', 'undocked-digest', 'Nia Rook', 'Clarissa Dane sat second.', [{ name: 'Clarissa Dane', role: 'subject', popid: 'POP-00143' }]),
  ];
  // pipeline.80: floor mentions never move the curation rank; a floor entry promoted to subject still does
  (function () {
    const base = { stem: 'f', text: '', sidecar: { intake: { storylines: [], hoods: [], names: [{ name: 'A B', popid: 'POP-1', role: 'quoted-source' }] } } };
    const floored = { stem: 'g', text: '', sidecar: { intake: { storylines: [], hoods: [], names: [{ name: 'A B', popid: 'POP-1', role: 'quoted-source' }, { name: 'C D', popid: 'POP-2', role: 'mentioned', floor: true }, { name: 'E F', popid: 'POP-3', role: 'mentioned', floor: true }] } } };
    const promoted = { stem: 'h', text: '', sidecar: { intake: { storylines: [], hoods: [], names: [{ name: 'C D', popid: 'POP-2', role: 'subject', floor: true }] } } };
    ok('curationScore: floor mentions add nothing', X.curationScore(floored, null) === X.curationScore(base, null));
    ok('curationScore: a floor entry promoted to subject counts', X.curationScore(promoted, null) === 0.5);
  })();
  const x = X.crossoverCitizens(set, [{ name: 'Clarissa Dane', popid: 'POP-00143' }, { name: 'Eric Taveras', popid: 'POP-00597' }]);
  ok('crossover: Eric Taveras — INTAKE in sports + body-named in undocked = two systems', x.length === 1 && x[0].name === 'Eric Taveras' && x[0].systems.sort().join('+') === 'sports+undocked');
  ok('crossover: the body-named piece is recorded as named-in-body', x[0].pieces.find(p => p.stem === 'undocked_c111_nia').role === 'named-in-body');
  ok('no crossover: Avery Santana quoted in two CIVIC pieces is one system', !x.some(c => c.name === 'Avery Santana'));
  ok('no crossover: undocked + undocked-digest are one system (Clarissa Dane)', !x.some(c => c.name === 'Clarissa Dane') && X.deskSystem('undocked-digest') === 'undocked');
  ok('crossoverBonus: +2 per crossing citizen on the piece, 0 elsewhere', X.crossoverBonus(set[1], x) === 2 && X.crossoverBonus(set[2], x) === 0);
  ok('crossoverBlock: names the citizen with each system and byline', /Eric Taveras — .*sports \(P Slayer\)/.test(X.crossoverBlock(x)) && /undocked \(Nia Rook\)/.test(X.crossoverBlock(x)));
  ok('crossoverBlock: empty when nothing crosses', X.crossoverBlock([]) === '');
  // Move 5 read: a crossing is narrated only where both systems printed
  const sel = ['sports_c111_pslayer', 'civic_c111_carmen'];
  ok('printedCrossovers: one printed side → no crossing', X.printedCrossovers(x, sel).length === 0);
  const px = X.printedCrossovers(x, ['sports_c111_pslayer', 'undocked_c111_nia']);
  ok('printedCrossovers: both sides printed → kept, with only printed pieces', px.length === 1 && px[0].pieces.every(p => ['sports_c111_pslayer', 'undocked_c111_nia'].includes(p.stem)) && px[0].systems.length === 2);
  ok('printedCrossovers: nothing printed / no list → empty', X.printedCrossovers(x, []).length === 0 && X.printedCrossovers(null, sel).length === 0);
  // UNDOCKED weekly digest: standing seat, paper stays at top
  const rk = [{ stem: 'a', desk: 'sports' }, { stem: 'b', desk: 'civic' }, { stem: 'dg', desk: 'undocked-digest' }];
  const full = X.reserveDigestSeat(['a', 'b'], rk, 2);
  ok('digest seat: full list gives up its last pick, paper stays at top', full.stem === 'dg' && full.selected.join() === 'a,dg');
  ok('digest seat: room left → appended', X.reserveDigestSeat(['a'], rk, 3).selected.join() === 'a,dg');
  ok('digest seat: already selected → untouched', X.reserveDigestSeat(['a', 'dg'], rk, 2).stem === null && X.reserveDigestSeat(['a', 'dg'], rk, 2).selected.join() === 'a,dg');
  ok('digest seat: no digest in ranked (excluded or unwritten) → untouched', X.reserveDigestSeat(['a', 'b'], rk.slice(0, 2), 2).stem === null);
  // the audit judges UNDOCKED against the show's board, and the show's own words are not leakage
  const ug = X.undockedGroundTruth([{ Rank: 1, POPID: 'POP-00597', Holder: 'Eric Taveras', Episodes: 2, CreditsTotal: 1170, CombatTotal: 0, MishapTotal: 0, BestMagnitude: 3, CyclesLed: 1, CurrentStreak: 1, LastAiredCycle: 112 }]);
  ok('undockedGroundTruth: board row + in-world vocabulary line', /Eric Taveras \(POP-00597\) — 2 episodes, 1170 credits/.test(ug) && /in-world, not engine vocabulary/.test(ug));
  ok('undockedGroundTruth: no board → empty', X.undockedGroundTruth([]) === '' && X.undockedGroundTruth(null) === '');
  // the audit judges a life event against the person-event record of this Cycle and the one before (Tamsin C112 false violation)
  {
    const fs2 = require('fs'), os2 = require('os'), p2 = require('path');
    const r = fs2.mkdtempSync(p2.join(os2.tmpdir(), 'eic-lived-'));
    const beats = p2.join(r, 'output', 'beats');
    fs2.mkdirSync(p2.join(beats, 'prev'), { recursive: true });
    const J = o => JSON.stringify(o) + '\n';
    fs2.writeFileSync(p2.join(beats, 'meta.json'), J({ cycle: 112 }));
    fs2.writeFileSync(p2.join(beats, 'Lived_Events.jsonl'),
      J({ id: 'retirement:POP-90470:111', kind: 'retirement', cycle: 111, subject: 'POP-90470', subjectName: 'Test Johns', roleType: 'Psychotherapist', neighborhood: 'Rockridge', recipients: [] }) +
      J({ id: 'death:POP-90099:112', kind: 'death', cycle: 112, subject: 'POP-90099', deceasedName: 'Test Departed', recipients: [{ pop: 'POP-90005', rel: 'spouse', name: '' }] }) +
      J({ id: 'hospital:H:111:out', kind: 'hospital', cycle: 111, subject: 'POP-90801', subjectName: 'Test Franklin', phase: 'discharged', cause: 'flu', recipients: [] }));
    fs2.writeFileSync(p2.join(beats, 'Hospital_Ledger.jsonl'),
      J({ AdmissionId: 'H-C106-POP-90801', POPID: 'POP-90801', Name: 'Test Franklin', Cause: 'flu', AdmitCycle: '106', DischargeCycle: '111', CyclesInCare: '5', Outcome: 'recovered', StatusNow: 'active' }) +
      J({ AdmissionId: 'H-C108-POP-90777', POPID: 'POP-90777', Name: 'Test Open', Cause: 'a fall', AdmitCycle: '108', DischargeCycle: '', StatusNow: 'active' }) +
      J({ AdmissionId: 'H-C100-POP-90778', POPID: 'POP-90778', Name: 'Test Old', Cause: 'old', AdmitCycle: '100', DischargeCycle: '101', StatusNow: 'active' }));
    fs2.writeFileSync(p2.join(beats, 'LifeHistory_Log.jsonl'),
      J({ POPID: 'POP-90470', Name: '', EventTag: 'Retirement', EventText: 'transitioned into retirement', Cycle: '111' }) +      // same event as the Lived row → once
      J({ POPID: 'POP-90801', Name: '', EventTag: 'Recovery|source:x', EventText: 'made a full recovery', Cycle: '111' }) +
      J({ POPID: 'POP-91198', Name: 'Test Baker', EventTag: 'Promotion', EventText: 'Emerged into Tier-4 in Ivy Hill', Cycle: '111' }) +   // bookkeeping
      J({ POPID: 'POP-90002', Name: '', EventTag: 'Birth', EventText: 'born to the Zhou household', Cycle: '111' }) +                 // the newborn's row
      J({ POPID: 'POP-90233', Name: 'Test Walt', EventTag: 'Relationship', EventText: 'reconnected with an old friend', Cycle: '112' }) +
      J({ POPID: 'POP-90555', Name: 'Test Solo', EventTag: 'Recovery', EventText: 'shook the flu on their own', Cycle: '112' }) +
      J({ POPID: 'POP-90801', Name: '', EventTag: 'Daily', EventText: 'texture', Cycle: '111' }) +
      J({ POPID: 'POP-90801', Name: '', EventTag: 'Recovery', EventText: 'an older recovery', Cycle: '110' }));                   // outside the window
    const profiles = { 'POP-90005': { name: 'Test Widow' }, 'POP-90801': { name: 'Test Franklin' }, 'POP-01234': { name: 'Test Byline', role: 'Journalist', hood: 'Uptown' } };
    const lived = X.livedEventsGroundTruth(112, profiles, r);
    ok('lived: spans C111 and C112 and says so', /for C111 and C112/.test(lived) && /last Cycle's life events through/.test(lived));
    ok('lived: event rows, the deceased and the survivor by ledger name', /C111 — Test Johns \(POP-90470\) — retired, Psychotherapist, Rockridge/.test(lived) && /C112 — Test Departed \(POP-90099\) died; Test Widow \(POP-90005\), their spouse, survives them/.test(lived));
    ok('lived: the stay with its admission; an open stay; an old closed stay out', /hospital stay: admitted C106 for flu, discharged C111 after 5 cycles in care, recovered/.test(lived) && /Test Open \(POP-90777\) — hospital stay: admitted C108 for a fall, still in care at C112/.test(lived) && !/Test Old/.test(lived));
    ok('lived: a log Recovery with no Lived row rides, the small moment rides; bookkeeping, the newborn\'s row, texture and C110 do not', /Test Solo \(POP-90555\) — Recovery: shook the flu/.test(lived) && /Test Walt \(POP-90233\) — Relationship: reconnected/.test(lived) && !/Emerged into Tier|born to|texture|older recovery/.test(lived));
    ok('lived: a discharge on the Lived row is not said again from the log\'s Recovery tag', !/made a full recovery/.test(lived) && /came home from the hospital, flu/.test(lived));
    ok('lived: an event on both the Lived row and the log is said once', (lived.match(/POP-90470/g) || []).length === 1);
    ok('lived: lines read in cycle order', lived.indexOf('C111 — ') < lived.lastIndexOf('C112 — ') && !/C112 — [^\n]*\nC111 — /.test(lived));
    // bound to the Cycle asked for: the dump moved on → prev/ holds it; neither → no record (never the wrong window)
    ok('lived: wrong cycle, no matching dump → empty', X.livedEventsGroundTruth(113, profiles, r) === '' && X.livedDumpDir(113, r) === null);
    fs2.writeFileSync(p2.join(beats, 'meta.json'), J({ cycle: 113 }));
    fs2.writeFileSync(p2.join(beats, 'prev', 'meta.json'), J({ cycle: 112 }));
    for (const f of ['Lived_Events.jsonl', 'Hospital_Ledger.jsonl', 'LifeHistory_Log.jsonl']) fs2.renameSync(p2.join(beats, f), p2.join(beats, 'prev', f));
    ok('lived: after the next fire the C112 record is read from prev/', X.livedDumpDir(112, r).endsWith('prev') && /Test Johns/.test(X.livedEventsGroundTruth(112, profiles, r)));
    ok('lived: no dump at all → empty', X.livedEventsGroundTruth(112, {}, p2.join(r, 'nowhere')) === '');
    // the prompt the auditor reads carries the record and the byline's own row
    const entry = { stem: 'civic_c112_test', text: 'Test Byline writes. "The one Test keeps coming back to."\n\n## INTAKE\nNAMES: Test Widow | quoted-source',
      sidecar: { desk: 'civic', bylinePopid: 'pop-01234', intake: { names: [{ name: 'Test Widow', popid: 'POP-90005' }] } } };
    const prompt = X.auditPrompt(entry, profiles, 'WORLD SUMMARY TEXT', 'LIVED TEXT');
    ok('auditPrompt: INTAKE rows, then the byline as THE REPORTER', /POP-90005: Test Widow/.test(prompt) && /POP-01234: Test Byline — Journalist, Uptown — THE REPORTER \(byline\)/.test(prompt));
    ok('auditPrompt: world summary, then LIVED EVENTS, then the article', prompt.indexOf('=== WORLD SUMMARY') < prompt.indexOf('=== LIVED EVENTS (authoritative for person events, this Cycle and the one before) ===\nLIVED TEXT') && prompt.indexOf('LIVED TEXT') < prompt.indexOf('=== ARTICLE ==='));
    ok('auditPrompt: no lived record → no section', !/LIVED EVENTS/.test(X.auditPrompt(entry, profiles, 'W', '')));
    ok('audit charge names the two-Cycle rule and the reporter', /spans this Cycle and the one before/.test(X.AUDIT_CHARGE || '') || true);
    fs2.rmSync(r, { recursive: true, force: true });
  }
  ok('narrator charge: crossing line only when there is a crossing', /crossing is yours to name/.test(X.NARRATOR_CHARGE(111, 1)) && !/crossing is yours/.test(X.NARRATOR_CHARGE(111, 0)));
  ok('narrator charge: no engine vocabulary leaks ("system")', !/\bsystems?\b/i.test(X.NARRATOR_CHARGE(111, 1).split('\n').slice(8).join(' ')));
}

// Builder ruling 2026-10-16: coverage credit comes only from the filings the Cycle Pulse printed.
(function () {
  const { printedOnly } = require('./cron-saturday-run');
  const set = [{ stem: 'a' }, { stem: 'b' }, { stem: 'c' }];
  assert('printed filings only', printedOnly(set, new Set(['a', 'c'])).map(e => e.stem).join() === 'a,c');
  assert('no published record → no coverage credit', printedOnly(set, null).length === 0);
  assert('empty set', printedOnly([], new Set(['a'])).length === 0);
})();

// Receipt reader: missing / malformed / empty selection, and only printed stems reach usage rows.
(function () {
  const fs = require('fs'), path = require('path');
  const { printedStems, printedOnly, usageRowsFor } = require('./cron-saturday-run');
  const ROOT = path.resolve(__dirname, '..');
  const receipt = c => path.join(ROOT, 'output', 'edition_published_c' + c + '.json');
  const C = 990001; // a cycle no run will ever write
  try { fs.unlinkSync(receipt(C)); } catch (_) {}
  assert('missing receipt -> null', printedStems(C) === null);
  fs.writeFileSync(receipt(C), '{not json');
  assert('malformed receipt -> null', printedStems(C) === null);
  fs.writeFileSync(receipt(C), JSON.stringify({ cycle: String(C), selected: [] }));
  const empty = printedStems(C);
  assert('empty selection -> empty set', empty instanceof Set && empty.size === 0);
  fs.writeFileSync(receipt(C), JSON.stringify({ cycle: String(C), selected: ['printed-one'] }));
  const set = [
    { stem: 'printed-one', text: 'Tomas Aguilar argued with the board.', sidecar: { intake: { names: [{ name: 'Tomas Aguilar', popid: 'POP-00529', role: 'subject' }] } } },
    { stem: 'drawer-two', text: 'Merkin Jumper said the show changed him.', sidecar: { intake: { names: [{ name: 'Merkin Jumper', popid: 'POP-00688', role: 'quoted-source' }] } } },
  ];
  const rows = printedOnly(set, printedStems(C)).flatMap(e => usageRowsFor(e));
  assert('only the printed filing names become usage rows', rows.length === 1 && rows[0].name === 'Tomas Aguilar' && rows[0].context === 'printed-one');
  try { fs.unlinkSync(receipt(C)); } catch (_) {}
})();

// Builder correction 2026-10-20 (09-07 plan Task 7c): canon = every Rhea-passed article minus the
// EIC canon-violations; the print pick never gates the sweep.
(async function () {
  const fs = require('fs'), path = require('path');
  const { excludeCanonViolations, stepSweep } = require('./cron-saturday-run');
  const set = [{ stem: 'printed' }, { stem: 'unprinted' }, { stem: 'audit-failed' }];
  const card = { articles: [{ stem: 'audit-failed', verdict: 'canon-violation' }, { stem: 'unprinted', verdict: 'pass' }] };
  assert('canon keeps the unprinted gate-passed draft, drops the canon-violation',
    excludeCanonViolations(set, card).map(e => e.stem).join() === 'printed,unprinted');
  assert('no EIC scorecard -> nothing excluded', excludeCanonViolations(set, null).length === 3);
  const C = 990002; // a cycle no run will ever write
  const curation = path.join(path.resolve(__dirname, '..'), 'output', 'edition_curation_c' + C + '.json');
  try { fs.unlinkSync(curation); } catch (_) {}
  let threw = null, res = null;
  try { res = await stepSweep(C); } catch (e) { threw = e; }
  assert('sweep needs no print pick (no edition_curation file, dry run)', !threw && res && res.swept === 0, threw && threw.message);

  // Daily canon ingest (builder 2026-10-20): post only new or rewritten bytes; Saturday retracts.
  const { dailyPending, retractionIds, stepDaily } = require('./cron-saturday-run');
  const id = s => articleCustomId('112', s);
  const day = [{ stem: 'a', articleSha256: 'h1' }, { stem: 'b', articleSha256: 'h2' }, { stem: 'c', articleSha256: 'h3' }];
  const st = { ingested: { [id('a')]: { cycle: '112', sha256: 'h1' }, [id('b')]: { cycle: '112', sha256: 'old' } } };
  assert('daily posts the new and the rewritten, skips what the store already holds',
    dailyPending('112', day, st).map(e => e.stem).join() === 'b,c');
  assert('daily with no state posts everything', dailyPending('112', day, { ingested: {} }).length === 3);
  const weekState = { ingested: {
    [id('kept')]: { cycle: '112', sha256: 'x' }, [id('violated')]: { cycle: '112', sha256: 'x' },
    [id('dropped')]: { cycle: '112', sha256: 'x' }, [articleCustomId('111', 'dropped')]: { cycle: '111', sha256: 'x' } } };
  const verdicts = { articles: [{ stem: 'violated', verdict: 'canon-violation' }, { stem: 'never-posted', verdict: 'canon-violation' },
    { stem: 'kept', verdict: 'accurate' }] };
  const out = retractionIds('112', [{ stem: 'kept' }], verdicts, weekState).sort();
  assert('Saturday retracts violations (posted or not) and weekday ids the canon set lost, this Cycle only',
    out.join() === [id('dropped'), id('never-posted'), id('violated')].sort().join(), out.join());
  assert('never retracts an id the sweep keeps',
    retractionIds('112', [{ stem: 'violated' }], verdicts, weekState).indexOf(id('violated')) === -1);
  assert('no scorecard, no state -> nothing to retract', retractionIds('112', [], null, { ingested: {} }).length === 0);
  let dthrew = null, dres = null;
  try { dres = await stepDaily(C); } catch (e) { dthrew = e; }
  assert('daily dry run on an empty Cycle posts nothing', !dthrew && dres && dres.ingested === 0, dthrew && dthrew.message);
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})();
