'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { buildOutcomeFeed } = require('./civic47OutcomeFeed');
const { buildLocal } = require('./buildCivicOutcomeFeed');
const { makeBrief } = require('./civicBrief');
const { loadCycleCivicEntries } = require('./buildCivicDomainSlice');

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'civic47-outcome-'));
try {
  const base = { ActionId: 'CA-SYN1', OfficeId: 'COUNCIL-D2', HolderPopid: 'POP-SYN01',
    ActionKind: 'event', Status: 'applied', RequestedCycle: '119', EffectiveCycle: '120',
    SourceEvidenceHash: 'syn-evidence', EffectReceiptIds: 'RCPT-SYN1',
    ReadbackVerified: 'true', TargetHoods: 'Downtown', Cost: '40',
    Result: 'Synthetic event occurred', EventId: 'EV-SYN1' };
  const experience = [{ ActionId: 'CA-SYN1', POPID: 'POP-SYN02', Mode: 'attended',
    ExperienceId: 'EXP-SYN1', ReceiptId: 'RCPT-SYN-ATTEND', OccurredCycle: '120' },
    { ActionId: 'CA-SYN1', POPID: 'POP-SYN02', Mode: 'attended',
      ExperienceId: 'EXP-SYN1-DUP', ReceiptId: 'RCPT-SYN-ATTEND', OccurredCycle: '120' },
    { ActionId: 'CA-SYN1', POPID: 'POP-SYN03', Mode: 'nearby',
      ExperienceId: 'EXP-SYN-NEAR', ReceiptId: 'RCPT-SYN-NEAR' }];
  const reactions = [{ ActionId: 'CA-SYN1', POPID: 'POP-SYN02',
    ExperienceId: 'EXP-SYN1', ReactionId: 'REACT-SYN1', Stance: 'mixed' },
  { ActionId: 'CA-SYN1', POPID: 'POP-SYN03',
    ExperienceId: 'EXP-SYN-NEAR', ReactionId: 'REACT-SYN-NEAR', Stance: 'positive' }];
  const publications = [{ ActionId: 'CA-SYN1', Status: 'draft',
    PublicationReceiptId: 'PUB-SYN-DRAFT' }, { ActionId: 'CA-SYN1', Status: 'published',
    PublicationReceiptId: 'PUB-SYN1' }, { ActionId: 'CA-SYN1', Status: 'published',
    PublicationReceiptId: 'PUB-SYN1' }];
  assert(!buildOutcomeFeed([{ ...base, ReadbackVerified: 'false' }], [], [], [], 120).available);
  const feed = buildOutcomeFeed([base], experience, reactions, publications, 120);
  assert(feed.available);
  assert.strictEqual(feed.experiences.length, 1);
  assert.strictEqual(feed.officialFeedback[0].sampleCount, 1);
  assert.strictEqual(feed.officialFeedback[0].publishedCoverage.length, 1);
  assert.strictEqual(feed.mediaSources[0].published, false);
  assert.strictEqual(feed.mediaSources[0].quote, null);
  const dir = path.join(root, 'output', 'cron-civic');
  fs.mkdirSync(dir, { recursive: true });
  const beats = path.join(root, 'output', 'beats');
  fs.mkdirSync(beats, { recursive: true });
  const journalFile = path.join(beats, 'Civic_Action_Ledger.jsonl');
  const journalBody = JSON.stringify(base) + '\n';
  const journalHash = crypto.createHash('sha256').update(journalBody).digest('hex');
  fs.writeFileSync(path.join(beats, 'meta.json'), JSON.stringify({ cycle: 120,
    sourceHashes: { Civic_Action_Ledger: journalHash } }));
  fs.writeFileSync(journalFile, journalBody);
  fs.writeFileSync(path.join(dir, 'experiences_c120.jsonl'), experience.map(JSON.stringify).join('\n') + '\n');
  fs.writeFileSync(path.join(dir, 'reactions_c120.jsonl'), reactions.map(JSON.stringify).join('\n') + '\n');
  fs.writeFileSync(path.join(dir, 'published_c120.jsonl'), publications.map(JSON.stringify).join('\n') + '\n');
  fs.writeFileSync(path.join(dir, 'outcome_feed_c120.json'), JSON.stringify(feed));
  const entries = loadCycleCivicEntries(120, root);
  assert(entries.some(e => e.actionId === 'CA-SYN1' && e.ref === 'Civic_Action_Ledger:CA-SYN1'));
  fs.writeFileSync(path.join(dir, 'outcome_feed_c120.json'), JSON.stringify({ ...feed, actions: [] }));
  assert(loadCycleCivicEntries(120, root).some(e => e.actionId === 'CA-SYN1'), 'stale saved feed never hides journal source');
  fs.writeFileSync(path.join(beats, 'meta.json'), JSON.stringify({ cycle: 121,
    sourceHashes: { Civic_Action_Ledger: journalHash } }));
  fs.writeFileSync(path.join(dir, 'reactions_c122.jsonl'), JSON.stringify({
    ActionId: 'CA-SYN1', POPID: 'POP-SYN02', ExperienceId: 'EXP-SYN1',
    ReactionId: 'REACT-FUTURE', Stance: 'positive',
  }) + '\n');
  const nextCycle = buildLocal(root, 121);
  assert.strictEqual(nextCycle.officialFeedback[0].sampleCount, 1,
    'a saved C120 reaction remains in the C121 brief');
  assert.strictEqual(nextCycle.officialFeedback[0].reactions[0].reactionId, 'REACT-SYN1',
    'a future Cycle receipt is not read early');
  assert.strictEqual(nextCycle.officialFeedback[0].publishedCoverage.length, 1);
  const nextBrief = makeBrief({ root, cycle: 121,
    office: { officeId: 'COUNCIL-D2', district: 'D2' },
    pack: { game: { board: [], lastMove: { available: true, moves: [] } } },
    audit: { snapshots: { Neighborhood_Map: [] } },
  }).brief;
  assert.strictEqual(nextBrief.sections.response.committedResponse[0].reactions[0].reactionId,
    'REACT-SYN1', 'the official actually sees the saved prior-Cycle response');
  fs.writeFileSync(journalFile, journalBody + journalBody);
  assert.throws(() => buildLocal(root, 121), /hash mismatch/,
    'a changed journal file cannot certify an applied outcome under old metadata');
  console.log('civic47 outcome feed: ok');
} finally { fs.rmSync(root, { recursive: true, force: true }); }
