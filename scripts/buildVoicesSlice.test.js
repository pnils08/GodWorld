#!/usr/bin/env node
'use strict';
// pipeline.73 — Ines Sorensen's Voices slice. Fixture: a page index with self-initiated pages, a
// PRESS reply, a journalist's page, a short line, a stale page and both sides of one conversation.
// pipeline.97: plus a debate page and an interview question; both rules run — the self-initiated rule
// (everyPage false) and every admitted page (everyPage true) — and the default follows L.EVERY_PAGE.

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
  ['POP-90006', { POPID: 'POP-90006', Name: 'Test Late', RoleType: 'Clerk', Neighborhood: 'Downtown', ClockMode: 'ENGINE', 'MED (y/n)': 'no' }],
  ['POP-90007', { POPID: 'POP-90007', Name: 'Test Debater', RoleType: 'Bus Driver', Neighborhood: 'Fruitvale', ClockMode: 'ENGINE', 'MED (y/n)': 'no' }],
  ['POP-90008', { POPID: 'POP-90008', Name: 'Test Asked', RoleType: 'Nurse', Neighborhood: 'Temescal', ClockMode: 'ENGINE', 'MED (y/n)': 'no' }]
]);
const pages = [
  { docId: 'p1', customId: 'cp-POP-90001-c111-night', popId: 'POP-90001', cycle, slot: 'night', affect: 'Content', event: 'Career', createdAt: '2026-01-01T20:00:00Z', content: long('Funny how fixing something so small can feel that big to somebody.') },
  { docId: 'p1b', customId: 'cp-POP-90001-c111-morning', popId: 'POP-90001', cycle, slot: 'morning', affect: 'Calm', event: 'Daily', createdAt: fresh, content: long('A shorter second page from the same person, the same window.').slice(0, 90) },
  { docId: 'p2', customId: 'cp-POP-90002-c111-CONVO', popId: 'POP-90002', cycle, slot: 'CONVO', affect: 'Calm', event: 'Personal', createdAt: fresh, content: long('Maya. Hey. I was just thinking about you and the quiet we used to share this late.') },
  { docId: 'p3', customId: 'cp-POP-90003-c111-CONVO', popId: 'POP-90003', cycle, slot: 'CONVO', affect: 'Content', event: 'Education', createdAt: fresh, content: long('It is good to hear your voice. He has your focus, that is for sure.') },
  { docId: 'p4', customId: 'cp-POP-90004-c111-midday', popId: 'POP-90004', cycle, slot: 'midday', affect: 'Anxious', event: 'Career', createdAt: fresh, content: long('A journalist writing on her own page is the newsroom talking to itself.') },
  { docId: 'p5', customId: 'cp-POP-90005-c111-work', popId: 'POP-90005', cycle, slot: 'work', affect: 'Tired', event: 'Work', createdAt: fresh, content: long('Three calls before dawn and the last one was a kid who just needed someone to sit with him.') },
  { docId: 'p6', customId: 'cp-POP-90001-c111-PRESS', popId: 'POP-90001', cycle, slot: 'PRESS', affect: null, event: null, createdAt: fresh, content: long('A reporter asked me about the shop and I told her the truth about the hours.') },
  { docId: 'p7', customId: 'cp-POP-90005-c111-morning-tension', popId: 'POP-90005', cycle, slot: 'morning-tension', affect: null, event: null, createdAt: fresh, content: 'TENSION[c111]: ' + long('Will the night shift ever get a second medic on the rig before winter?') },
  { docId: 'p8', customId: 'cp-POP-90006-c110-evening', popId: 'POP-90006', cycle: 110, slot: 'evening', affect: 'Calm', event: 'Daily', createdAt: '2025-12-20T20:00:00Z', content: long('Stale: written long before the window opened.') },
  { docId: 'p9', customId: 'cp-POP-90006-c111-morning', popId: 'POP-90006', cycle, slot: 'morning', affect: 'Calm', event: 'Daily', createdAt: fresh, content: 'Too short to carry a passage.' },
  { docId: 'p11', customId: 'cp-POP-90007-c111-DEBATE-fri', popId: 'POP-90007', cycle, slot: 'DEBATE', day: 'fri', affect: null, event: null, createdAt: fresh, content: long('I said it at the forum: the bus line matters more to this block than the stadium does.') },
  { docId: 'p12', customId: 'cp-POP-90008-c111-PRESS-tension', popId: 'POP-90008', cycle, slot: 'PRESS-tension', affect: null, event: null, createdAt: fresh, content: 'TENSION[c111]: ' + long('Who decides whether the clinic stays open on Sundays, and do they ever ride the bus there?') },
  { docId: 'p13', customId: 'cp-POP-90004-c111-PRESS', popId: 'POP-90004', cycle, slot: 'PRESS', affect: null, event: null, createdAt: fresh, content: 'filed: Sample headline on the reporter\'s own page, her filing record and never her words' },
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

  // pipeline.89: the slice is the roster, not the pick. Every citizen with a self-initiated page, once,
  // however old the page; the journalist, the PRESS reply, the tension strand, the short line and the
  // unknown POPID are not citizens' own voices.
  const day1 = V.buildVoicesSlice(cycle, { root, profiles, now, everyPage: false });
  assert.equal(day1.empty, false, day1.reason);
  const pops = day1.citizens.map(c => c.popid).sort();
  assert.deepStrictEqual(pops, ['POP-90001', 'POP-90002', 'POP-90003', 'POP-90005', 'POP-90006']);
  assert.ok(!pops.includes('POP-90004') && !pops.includes('POP-99999'));
  assert.equal(day1.facts.length, day1.citizens.length, 'one line per citizen — nothing cut, no per-day cap');
  assert.ok(!/\b20\d\d-\d\d-\d\d\b/.test(JSON.stringify([day1.story, day1.pulse, day1.prewrite, day1.facts])), 'no wall-clock date reaches the writer (builder 2026-10-28)');
  assert.equal(day1.prewrite.factCap, day1.facts.length);
  assert.equal(day1.prewrite.peopleCap, day1.citizens.length);
  const tech = day1.facts.find(f => f.popid === 'POP-90001');
  assert.equal(tech.docId, 'p1b', 'the latest page leads the line');
  assert.ok(/Test Tech, Appliance Repair Technician, Laurel \(POP-90001\) — 2 pages; latest the morning page, C111; new since your last piece/.test(tech.text), tech.text);
  assert.ok(/Lives carried the promotion/.test(tech.text));
  const late = day1.facts.find(f => f.popid === 'POP-90006');
  assert.ok(late && /1 page; latest the evening page, C110: /.test(late.text) && !/new since/.test(late.text), 'the old page is on the roster, not marked new; the short line is not a page');
  assert.ok(day1.story.ref.endsWith(' ' + L.dayToken(day1.day)), 'the ref carries a per-day token, never a wall-clock date (builder 2026-10-28)');
  assert.deepStrictEqual(day1.prewrite.pageVoices, []);
  assert.ok(/pick whoever you want/i.test(day1.story.hookLine));
  assert.ok(/not your assignment/.test(day1.approach) && /every citizen with a self-initiated page on the record/.test(day1.approach));
  // Building the roster chooses nothing and remembers nothing.
  assert.ok(!fs.existsSync(V.coveredPath(root)), 'building the slice writes no covered file');
  // A page from before the window is still on the roster, marked as not new.
  const stale = V.buildVoicesSlice(cycle, { root, profiles, now: new Date('2026-03-01T00:00:00Z'), everyPage: false });
  assert.equal(stale.empty, false);
  assert.ok(stale.facts.length === day1.facts.length && !/new since your last piece/.test(stale.facts.map(f => f.text).join('\n')));

  // Her pick, resolved: every self-initiated page of the citizens she named, whole, oldest first.
  const picked = V.pagesForPicks(['POP-90001', 'pop-90005'], { root, profiles, everyPage: false });
  assert.deepStrictEqual(picked.map(f => f.docId), ['p1', 'p1b', 'p5']);
  assert.ok(picked[0].text.startsWith('“Funny how fixing something so small') && picked[0].text.includes(pages[0].content), 'whole page, verbatim');
  assert.ok(/— Test Tech, Appliance Repair Technician, Laurel \(own page, the night page, C111\)$/.test(picked[0].text), picked[0].text);
  assert.deepStrictEqual(V.pagesForPicks([], { root, profiles }), []);
  assert.deepStrictEqual(V.pagesForPicks(['POP-90004'], { root, profiles, everyPage: false }).length, 1, 'a pick is hers — the resolver does not second-guess');

  // Her memory: recorded when a piece files, shown on the roster, never enforced.
  V.recordRan(picked, cycle, root);
  const covered = JSON.parse(fs.readFileSync(V.coveredPath(root), 'utf8'));
  assert.deepStrictEqual(Object.keys(covered).sort(), ['p1', 'p1b', 'p5']);
  const day2 = V.buildVoicesSlice(cycle, { root, profiles, now, everyPage: false });
  assert.equal(day2.facts.length, day1.facts.length, 'having run them removes no one from the roster');
  const tech2 = day2.facts.find(f => f.popid === 'POP-90001').text;
  assert.ok(/you ran them C111/.test(tech2) && !/new since your last piece/.test(tech2), tech2);
  assert.ok(/new since your last piece/.test(day2.facts.find(f => f.popid === 'POP-90002').text));
  // No pages in the store at all.
  const bareRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'voices-nopages-'));
  try {
    const none = V.buildVoicesSlice(cycle, { root: bareRoot, profiles, now, everyPage: false });
    assert.ok(none.empty && /no self-initiated citizen page/.test(none.reason));
    const noneAll = V.buildVoicesSlice(cycle, { root: bareRoot, profiles, now, everyPage: true });
    assert.ok(noneAll.empty && /no citizen page/.test(noneAll.reason));
  } finally { fs.rmSync(bareRoot, { recursive: true, force: true }); }

  // pipeline.97 (builder 2026-10-30: "Ines and Tamsin should have access to all this"): every page the collector
  // admits — the interview reply, the debate, the question a citizen carries — on the roster and in her picks,
  // the TENSION tag stripped so it never reads as their words. The journalist and the unknown POPID stay out.
  const everyRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'voices-every-'));
  try {
    fs.mkdirSync(path.join(everyRoot, 'output', 'citizen_pages'), { recursive: true });
    fs.writeFileSync(path.join(everyRoot, 'output', 'citizen_pages', 'index.jsonl'), pages.map(p => JSON.stringify(p)).join('\n') + '\n');
    const all = V.buildVoicesSlice(cycle, { root: everyRoot, profiles, now, everyPage: true });
    assert.equal(all.empty, false, all.reason);
    assert.deepStrictEqual(all.citizens.map(c => c.popid).sort(), ['POP-90001', 'POP-90002', 'POP-90003', 'POP-90005', 'POP-90006', 'POP-90007', 'POP-90008']);
    const text = all.facts.map(f => f.text).join('\n');
    assert.ok(!/TENSION\[/.test(text), 'the tension tag is never the citizen\'s words');
    assert.ok(/Test Debater, Bus Driver, Fruitvale \(POP-90007\) — 1 page; latest in a debate, C111; new since your last piece: “I said it at the forum/.test(text), text);
    assert.ok(/\(POP-90008\) — 1 page; latest to a reporter, a question they carry, C111; new since your last piece: “Who decides whether the clinic/.test(text), text);
    assert.ok(/\(POP-90001\) — 3 pages;/.test(text) && /\(POP-90005\) — 2 pages;/.test(text), 'the PRESS reply and the question count as their pages');
    assert.ok(/every citizen with a page on the record/.test(all.approach) && !/self-initiated/.test(all.approach), 'the approach names the rule this build ran (codex F4)');
    const picks = V.pagesForPicks(['POP-90001', 'POP-90005'], { root: everyRoot, profiles, everyPage: true });
    assert.deepStrictEqual(picks.map(f => f.docId), ['p1', 'p1b', 'p5', 'p6', 'p7']);
    const q = picks.find(f => f.docId === 'p7').text;
    assert.ok(q.startsWith('“Will the night shift ever get a second medic') && !/TENSION\[/.test(q), q);
    assert.ok(/\(own page, the morning page, a question they carry, C111\)$/.test(q), q);
    assert.ok(/\(own page, to a reporter, C111\)$/.test(picks.find(f => f.docId === 'p6').text));
    // codex F2: a reporter she names resolves by the old rule — her own wake page, never her filing record.
    const reporterPick = V.pagesForPicks(['POP-90004'], { root: everyRoot, profiles, everyPage: true });
    assert.deepStrictEqual(reporterPick.map(f => f.docId), ['p4']);
    // The default follows the one switch in buildLivesSlice.
    const dflt = V.buildVoicesSlice(cycle, { root: everyRoot, profiles, now });
    const named = V.buildVoicesSlice(cycle, { root: everyRoot, profiles, now, everyPage: L.EVERY_PAGE });
    assert.deepStrictEqual(dflt.facts.map(f => f.text), named.facts.map(f => f.text));
  } finally { fs.rmSync(everyRoot, { recursive: true, force: true }); }

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
