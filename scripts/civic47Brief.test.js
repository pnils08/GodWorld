'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { loadEventView, eventsForSeat, sha } = require('./civicEventView');
const { makeBrief, readBriefEvidence, promptBrief, filterEvidenceDependentMoves } = require('./civicBrief');
const { datawakeUserPrompt } = require('./cron-civic-run');

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'civic47-brief-'));
try {
  fs.mkdirSync(path.join(root, 'output', 'beats'), { recursive: true });
  const beats = path.join(root, 'output', 'beats');
  const sports = path.join(beats, 'Oakland_Sports_Feed.jsonl');
  const metaFile = path.join(beats, 'meta.json');
  const publishMeta = (cycle, generatedAt) => fs.writeFileSync(metaFile, JSON.stringify({
    cycle, generatedAt,
    sourceHashes: { Oakland_Sports_Feed: sha(fs.readFileSync(sports, 'utf8')) },
  }));
  const championship = { Cycle: '110', SeasonType: 'championship', EventType: 'game-result',
    TeamsUsed: "A's", Notes: "The Oakland A's won their 7th championship.",
    StoryAngle: "A's win the championship", HomeNeighborhood: '' };
  const parade = { Cycle: '111', SeasonType: 'off-season', EventType: 'editorial-note',
    TeamsUsed: "A's", Notes: 'The parade ran through Downtown and Jake London Square.',
    StoryAngle: "A's parade in Downtown", HomeNeighborhood: 'Downtown' };
  fs.writeFileSync(sports, [championship, parade].map(JSON.stringify).join('\n') + '\n');
  publishMeta(113, '2026-11-01T10:00:00Z');
  fs.writeFileSync(path.join(root, 'output', 'world_summary_c113.md'),
    '# World Summary — Cycle 113\n## What Moved (Ripple_Ledger, cycle 113)\n### city-event (1)\n' +
    '- city-event | Synthetic film night | Jack London | mag 0.02\n');

  const view = loadEventView(root, 113);
  assert.strictEqual(view.generation.issues.length, 0);
  const mayor = { officeId: 'MAYOR-01', district: 'citywide' };
  const d2 = { officeId: 'COUNCIL-D2', district: 'D2' };
  const d1 = { officeId: 'COUNCIL-D1', district: 'D1' };
  const mayorEvents = eventsForSeat(view, mayor);
  const districtEvents = eventsForSeat(view, d2);
  assert(mayorEvents.some(e => e.category === 'sports-championship' && e.hoods.length === 0));
  assert(mayorEvents.some(e => e.category === 'sports-parade'));
  assert(districtEvents.some(e => e.category === 'sports-parade' && e.occurredCycle === 111 && e.hoods[0] === 'Downtown'));
  assert(districtEvents.some(e => e.category === 'city-event' && e.hoods[0] === 'Jack London'));
  assert(!eventsForSeat(view, d1).some(e => e.category === 'sports-parade'));
  assert(!districtEvents.some(e => e.hoods.includes('Jake London Square')));

  const audit = { cycle: 113, snapshots: { Neighborhood_Map: [
    { Neighborhood: 'Downtown', Sentiment: '0.5' },
    { Neighborhood: 'Jack London', Sentiment: '0.6' },
    { Neighborhood: 'Chinatown', Sentiment: '0.4' },
    { Neighborhood: 'Baylight District', Sentiment: '0.3' },
  ] } };
  const priorMoveId = 'MV-112-COUNCIL-D2-2026-10-30:a:D1';
  const pack = { pulse: null, game: { board: [], categories: { available: true, list: [] },
    lastMove: { available: true, moves: [{ moveId: priorMoveId, status: 'pending', type: 'work', cycle: 112 }] },
    petitionPool: { complaints: [], participation: [] } } };
  const situation = makeBrief({ root, cycle: 113, office: d2, pack, audit });
  pack.brief = situation.brief;
  pack._briefEvidence = situation.evidence;
  assert.strictEqual(pack.brief.version, 'CIVIC-BRIEF/2');
  assert(pack.brief.sections.events.items.some(e => e.category === 'sports-parade' && e.ageCycles === 2));
  const paradeId = districtEvents.find(e => e.category === 'sports-parade').eventId;
  assert(readBriefEvidence(pack, { type: 'event', id: paradeId }).available);
  assert(readBriefEvidence(pack, { type: 'prior', id: priorMoveId }).available,
    'a listed prior move ID with colons must be retrievable');
  assert(!readBriefEvidence(pack, { type: 'district', id: 'D1' }).available);
  assert(!readBriefEvidence(pack, { type: 'project', id: '../../etc/passwd' }).available);
  const gated = filterEvidenceDependentMoves([
    { type: 'work', requiresEvidence: ['event/' + paradeId] },
    { type: 'work', requiresEvidence: ['event/EV-not-read'] },
    { type: 'answer' },
  ], [{ replies: [readBriefEvidence(pack, { type: 'event', id: paradeId })] }]);
  assert.strictEqual(gated.eligible.length, 2);
  assert.strictEqual(gated.rejected.length, 1);
  assert(!('_briefEvidence' in promptBrief(pack)));
  const prompt = datawakeUserPrompt({ ...pack, task: { goal: 'Choose freely' } }, '',
    { agentDir: 'civic-office-council-d2', holder: 'Synthetic Holder', district: 'D2' });
  assert(prompt.includes('"ageCycles":2') && prompt.includes('Downtown'));
  assert(!prompt.includes('_briefEvidence'));

  const firstHash = view.generation.hash;
  fs.appendFileSync(sports, JSON.stringify({ Cycle: '113', EventType: 'community-outreach',
    Notes: 'Synthetic clinic visit', HomeNeighborhood: 'Downtown' }) + '\n');
  const torn = loadEventView(root, 113);
  assert(torn.generation.issues.some(x => x.includes('hash-mismatched')));
  assert(!torn.events.some(e => e.category === 'sports-community'),
    'an unmanifested same-Cycle file cannot become a current event');
  publishMeta(113, '2026-11-01T10:05:00Z');
  const changed = loadEventView(root, 113);
  assert.notStrictEqual(changed.generation.hash, firstHash);
  assert(eventsForSeat(changed, d2).some(e => e.occurredCycle === 113));
  const cancelled = { ...parade, EventStatus: 'cancelled' };
  fs.writeFileSync(sports, [championship, cancelled].map(JSON.stringify).join('\n') + '\n');
  publishMeta(113, '2026-11-01T10:10:00Z');
  const cancelView = loadEventView(root, 113);
  assert.strictEqual(eventsForSeat(cancelView, d2).find(e => e.category === 'sports-parade').status, 'cancelled');
  publishMeta(112, '2026-11-01T10:10:00Z');
  const stale = loadEventView(root, 113);
  assert(stale.generation.issues.some(x => x.includes('another Cycle')));
  assert(!stale.events.some(e => e.category === 'sports-parade'), 'stale sports export cannot supply a current fact');
  const staleBrief = makeBrief({ root, cycle: 113, office: d2, pack, audit }).brief;
  assert(staleBrief.generation.statement.includes('unavailable or incomplete'));
  console.log('civic47 brief: ok');
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
