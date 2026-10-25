#!/usr/bin/env node
'use strict';
// pipeline.73 — Ines Sorensen's Voices slice. Fixture: a page index with self-initiated pages, a
// PRESS reply, a journalist's page, a short line, a stale page and both sides of one conversation.

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const V = require('./buildVoicesSlice');
const L = require('./buildLivesSlice');

const cycle = 111;
const now = new Date('2026-01-02T12:00:00Z');
const fresh = '2026-01-02T02:30:00Z';
const long = s => (s + ' ').repeat(4).trim();
const profiles = new Map([
  ['POP-90001', { POPID: 'POP-90001', Name: 'Test Tech', RoleType: 'Appliance Repair Technician', Neighborhood: 'Laurel', ClockMode: 'ENGINE', 'MED (y/n)': 'no' }],
  ['POP-90002', { POPID: 'POP-90002', Name: 'Test Pitcher', RoleType: 'Pitcher, Oakland A\'s', Neighborhood: 'Rockridge', ClockMode: 'GAME', 'MED (y/n)': 'no' }],
  ['POP-90003', { POPID: 'POP-90003', Name: 'Test Teacher', RoleType: 'Teacher', Neighborhood: 'Rockridge', ClockMode: 'ENGINE', 'MED (y/n)': '' }],
  ['POP-90004', { POPID: 'POP-90004', Name: 'Test Reporter', RoleType: 'Journalist, Social Trends', Neighborhood: 'West Oakland', ClockMode: 'MEDIA', 'MED (y/n)': 'yes' }],
  ['POP-90005', { POPID: 'POP-90005', Name: 'Test Worker', RoleType: 'Paramedic', Neighborhood: 'Fruitvale', ClockMode: 'ENGINE', 'MED (y/n)': 'no' }],
  ['POP-90006', { POPID: 'POP-90006', Name: 'Test Late', RoleType: 'Clerk', Neighborhood: 'Downtown', ClockMode: 'ENGINE', 'MED (y/n)': 'no' }]
]);
const pages = [
  { docId: 'p1', customId: 'cp-POP-90001-c111-night', popId: 'POP-90001', cycle, slot: 'night', affect: 'Content', event: 'Career', createdAt: '2026-01-01T20:00:00Z', content: long('Funny how fixing something so small can feel that big to somebody.') },
  { docId: 'p1b', customId: 'cp-POP-90001-c111-morning', popId: 'POP-90001', cycle, slot: 'morning', affect: 'Calm', event: 'Daily', createdAt: fresh, content: long('A shorter second page from the same person, the same window.').slice(0, 90) },
  { docId: 'p2', customId: 'cp-POP-90002-c111-CONVO', popId: 'POP-90002', cycle, slot: 'CONVO', affect: 'Calm', event: 'Personal', createdAt: fresh, content: long('Maya. Hey. I was just thinking about you and the quiet we used to share this late.') },
  { docId: 'p3', customId: 'cp-POP-90003-c111-CONVO', popId: 'POP-90003', cycle, slot: 'CONVO', affect: 'Content', event: 'Education', createdAt: fresh, content: long('It is good to hear your voice. He has your focus, that is for sure.') },
  { docId: 'p4', customId: 'cp-POP-90004-c111-midday', popId: 'POP-90004', cycle, slot: 'midday', affect: 'Anxious', event: 'Career', createdAt: fresh, content: long('A journalist writing on her own page is the newsroom talking to itself.') },
  { docId: 'p5', customId: 'cp-POP-90005-c111-work', popId: 'POP-90005', cycle, slot: 'work', affect: 'Tired', event: 'Work', createdAt: fresh, content: long('Three calls before dawn and the last one was a kid who just needed someone to sit with him.') },
  { docId: 'p6', customId: 'cp-POP-90001-c111-PRESS', popId: 'POP-90001', cycle, slot: 'PRESS', affect: null, event: null, createdAt: fresh, content: long('A reporter asked me this; it already fed the article.') },
  { docId: 'p7', customId: 'cp-POP-90005-c111-morning-tension', popId: 'POP-90005', cycle, slot: 'morning-tension', affect: null, event: null, createdAt: fresh, content: long('TENSION[c111]: a private strand, not a page she reads.') },
  { docId: 'p8', customId: 'cp-POP-90006-c110-evening', popId: 'POP-90006', cycle: 110, slot: 'evening', affect: 'Calm', event: 'Daily', createdAt: '2025-12-20T20:00:00Z', content: long('Stale: written long before the window opened.') },
  { docId: 'p9', customId: 'cp-POP-90006-c111-morning', popId: 'POP-90006', cycle, slot: 'morning', affect: 'Calm', event: 'Daily', createdAt: fresh, content: 'Too short to carry a passage.' },
  { docId: 'p10', customId: 'cp-POP-99999-c111-morning', popId: 'POP-99999', cycle, slot: 'morning', affect: 'Calm', event: 'Daily', createdAt: fresh, content: long('Not on the ledger snapshot — no name to attribute to.') }
];

assert.ok(V.isMedia(profiles.get('POP-90004')) && !V.isMedia(profiles.get('POP-90002')) && !V.isMedia(profiles.get('POP-90003')));

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'voices-slice-'));
try {
  fs.mkdirSync(path.join(root, 'output', 'citizen_pages'), { recursive: true });
  fs.mkdirSync(path.join(root, 'output', 'cron-compare'), { recursive: true });
  fs.writeFileSync(path.join(root, 'output', 'citizen_pages', 'index.jsonl'), pages.map(p => JSON.stringify(p)).join('\n') + '\n');
  // Lives carried the tech's event this Cycle — Ines carries the words, the slice says so.
  fs.writeFileSync(L.coveredPath(root), JSON.stringify({ 'promotion:POP-90001:111': { popid: 'POP-90001', kind: 'promotion', cycle, day: '2026-01-02' } }));

  const day1 = V.buildVoicesSlice(cycle, { root, profiles, now });
  assert.equal(day1.empty, false, day1.reason);
  const pops = day1.citizens.map(c => c.popid);
  // The tech (longest of two pages), the worker, one side of the conversation; never the journalist,
  // the PRESS reply, the tension strand, the stale page, the short line or the unknown POPID.
  assert.ok(pops.includes('POP-90001') && pops.includes('POP-90005'), pops.join(','));
  assert.equal(pops.filter(p => p === 'POP-90002' || p === 'POP-90003').length, 1, 'one conversation passage a day');
  assert.ok(!pops.includes('POP-90004') && !pops.includes('POP-90006') && !pops.includes('POP-99999'));
  const tech = day1.facts.find(f => f.popid === 'POP-90001');
  assert.equal(tech.docId, 'p1', 'the longer of the two pages');
  assert.ok(tech.text.startsWith('“Funny how fixing something so small'), 'the quote first, verbatim');
  assert.ok(/— Test Tech, Appliance Repair Technician, Laurel \(own page, the night page, C111\)$/.test(tech.text), tech.text);
  assert.ok(/Lives carried the promotion/.test(day1.citizens.find(c => c.popid === 'POP-90001').why));
  assert.ok(/in conversation/.test(day1.facts.find(f => f.slot === 'CONVO').text));
  assert.ok(day1.story.ref.endsWith(' ' + day1.day), 'the ref carries the day');
  assert.equal(day1.prewrite.pageVoices.length, day1.facts.length);
  assert.ok(day1.story.hookLine.startsWith('Open on Test Tech\'s own line'));

  const covered = JSON.parse(fs.readFileSync(V.coveredPath(root), 'utf8'));
  assert.deepStrictEqual(Object.keys(covered).sort(), day1.facts.map(f => f.docId).sort());

  // Day 2 (same window): the other side of the conversation and the tech's second page are left.
  const day2 = V.buildVoicesSlice(cycle, { root, profiles, now });
  assert.equal(day2.empty, false, day2.reason);
  assert.ok(!day2.facts.some(f => covered[f.docId]), 'no page is carried twice');
  // Day 3: carried out.
  const day3 = V.buildVoicesSlice(cycle, { root, profiles, now });
  assert.ok(day3.empty && /already carried/.test(day3.reason), day3.reason);
  // No pages in the window at all.
  const none = V.buildVoicesSlice(cycle, { root, profiles, now: new Date('2026-03-01T00:00:00Z') });
  assert.ok(none.empty && /no self-initiated citizen page/.test(none.reason));

  // Seat wiring; the builder never touches the beat dump (no output/beats in this root).
  assert.ok(V.isVoicesSeat({ persona: 'ines-sorensen' }) && V.isVoicesSeat({ name: 'Ines Sorensen' }) && !V.isVoicesSeat({ persona: 'tamsin-pruitt' }));
  assert.equal(V.enrichAssignment({ persona: 'celeste-tran' }, cycle, root).persona, 'celeste-tran');
  // nothing on the pages → null: Ines sits the day out (the fanout drops the seat), never the generic culture packet
  {
    const bare = fs.mkdtempSync(path.join(os.tmpdir(), 'voices-empty-'));
    try {
      assert.strictEqual(V.enrichAssignment({ persona: 'ines-sorensen', desk: 'culture' }, cycle, bare), null);
      assert.strictEqual(V.sitsOutWhenEmpty, true);
    } finally { fs.rmSync(bare, { recursive: true, force: true }); }
  }
  assert.deepStrictEqual(V.SEAT.tabs, []);
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
console.log('buildVoicesSlice.test.js OK');
