'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { buildOutcomeFeed } = require('./civic47OutcomeFeed');
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
  fs.writeFileSync(path.join(beats, 'meta.json'), JSON.stringify({ cycle: 120 }));
  fs.writeFileSync(path.join(beats, 'Civic_Action_Ledger.jsonl'), JSON.stringify(base) + '\n');
  fs.writeFileSync(path.join(dir, 'experiences_c120.jsonl'), experience.map(JSON.stringify).join('\n') + '\n');
  fs.writeFileSync(path.join(dir, 'reactions_c120.jsonl'), reactions.map(JSON.stringify).join('\n') + '\n');
  fs.writeFileSync(path.join(dir, 'published_c120.jsonl'), publications.map(JSON.stringify).join('\n') + '\n');
  fs.writeFileSync(path.join(dir, 'outcome_feed_c120.json'), JSON.stringify(feed));
  const entries = loadCycleCivicEntries(120, root);
  assert(entries.some(e => e.actionId === 'CA-SYN1' && e.ref === 'Civic_Action_Ledger:CA-SYN1'));
  fs.writeFileSync(path.join(dir, 'outcome_feed_c120.json'), JSON.stringify({ ...feed, actions: [] }));
  assert(loadCycleCivicEntries(120, root).some(e => e.actionId === 'CA-SYN1'), 'stale saved feed never hides journal source');
  console.log('civic47 outcome feed: ok');
} finally { fs.rmSync(root, { recursive: true, force: true }); }
