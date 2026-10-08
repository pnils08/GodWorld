#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const m = require('./buildMarburySlice');

const pitcherCard = pop => ({ player: 'Test Closer ' + pop.slice(-2), popId: pop, content: [
  'Test Closer — TrueSource DataPage', 'Team: TEST-ONLY Club', 'Position: CP', '',
  'YEAR  TEAM  G   GS  W  L  SV  BS  HLD  IP     H   R   ER  HR  BB  SO  ERA',
  '2041  TST   60  0   8  3  42  3   0    63.2   35  14  13  6   14  82  1.84',
  '2040  TST   58  0   1  5  38  4   0    56.0   56  27  26  8   13  56  4.18',
  '2039  TST   67  0   10 6  2   1   9    77.2   52  19  18  4   26  77  2.09',
  '', 'AWARDS', '2042 projected',
].join('\n') });
const hitterCard = { player: 'Test Slugger', popId: 'POP-90003', content: [
  'Team: TEST-ONLY Club', 'Position: 1B', '',
  'Year  Team  G    AB   R   H    2B  3B  HR  RBI  BB  SO   SB  CS  AVG   OBP   SLG',
  '2041  TST   148  621  152 210  48  9   56  113  35  65   80  9   0.338 0.382 0.715',
  '2040  TST   147  607  94  170  36  8   32',   // ragged — stays off the memo
].join('\n') };

assert.equal(m.innings('63.2').toFixed(3), '63.667', 'a .2 is two thirds of an inning');
assert.equal(m.innings('56.0'), 56);
assert.equal(m.innings('63.5'), null, 'not baseball notation');

const closer = m.parseCard(pitcherCard('POP-90001'));
assert.equal(closer.type, 'pitcher');
assert.equal(closer.position, 'CP');
assert.deepStrictEqual(closer.seasons.map(s => s.year), ['2041', '2040', '2039'], 'the table stops at the first non-season line');
assert.equal(m.seasonLine(closer, closer.seasons[0]),
  '2041 TST: 60 G, 0 GS, 8-3, 42 SV, 63.2 IP, 35 H, 13 ER, 6 HR, 14 BB, 82 SO, ERA 1.84');
assert.equal(m.rateLine(closer, closer.seasons[0]), '2041 rates (63.2 IP): 11.6 K per 9, 2.0 BB per 9, 5.86 K per BB');

const slugger = m.parseCard(hitterCard);
assert.equal(slugger.type, 'hitter');
assert.equal(slugger.seasons.length, 1, 'a ragged row is dropped, never padded');
assert.equal(m.seasonLine(slugger, slugger.seasons[0]),
  '2041 TST: 148 G, 621 AB, 210 H, 56 HR, 113 RBI, 35 BB, 65 SO, 80 SB, AVG .338, OBP .382, SLG .715');
assert.equal(m.rateLine(slugger, slugger.seasons[0]), '2041 rates (621 AB): one HR every 11.1 AB, one SO every 9.6 AB');
assert.equal(m.parseCard({ player: 'No Table', popId: 'POP-90009', content: 'Recorded 0 MLB innings.' }), null);
// A cell that is not a plain number keeps its whole row off the memo; rows are read newest first whatever their order.
const messy = m.parseCard({ player: 'Test Messy', popId: 'POP-90008', content: [
  'Position: RP', 'YEAR TEAM G GS W L SV BS HLD IP H R ER HR BB SO ERA',
  '2040  TST   58  0   1  5  38  4   0    56.0   56  27  26  8   13  56  4.18',
  '2041  TST   60  0   8  3  42  3   0    63.2   35  14  13  6   14  —   1.84',
  '2039  TST   67  0   10 6  2   1   9    77.2   52  19  18  4   0   77  2.09',
].join('\n') });
assert.deepStrictEqual(messy.seasons.map(s => s.year), ['2040', '2039'], 'the dash row is gone and 2040 leads');
assert.equal(m.rateLine(messy, messy.seasons[1]), '2039 rates (77.2 IP): 8.9 K per 9, 0.0 BB per 9', 'no walks → no K-per-BB, never a NaN');
assert.equal(m.rateLine({ type: 'hitter' }, { year: '2041', AB: '100', HR: '5', SO: '0' }), '2041 rates (100 AB): one HR every 20.0 AB, no SO');
assert.equal(m.rateLine({ type: 'hitter' }, { year: '2041', AB: '100', HR: 'x', SO: '3' }), null);

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'marbury-slice-'));
try {
  fs.mkdirSync(path.join(root, 'output'), { recursive: true });
  fs.writeFileSync(path.join(root, 'output', 'player_truesource_mirror.json'), JSON.stringify({
    'POP-90001': pitcherCard('POP-90001'), 'POP-90002': pitcherCard('POP-90002'), 'POP-90003': hitterCard,
  }));
  const beats = { Oakland_Sports_Feed: [
    { Cycle: '999', SeasonType: 'playoffs', NamesUsed: 'Test Closer 02 (CP)', Stats: 'Test Closer 02/1IP/0ER/2SO', StoryAngle: 'TEST-ONLY', Notes: '' },
    { Cycle: '998', SeasonType: 'playoffs', NamesUsed: 'Test Slugger (1B)', Stats: 'Test Slugger/2HR', StoryAngle: 'TEST-ONLY', Notes: '' },
  ], Story_Hook_Deck: [] };
  const slice = m.buildMarburySlice(999, { root, beats });
  assert.equal(slice.empty, false);
  assert.equal(slice.seat.slug, 'elliot-marbury');
  assert.equal(slice.subject.pop, 'POP-90002', 'the dossier player on THIS cycle\'s feed is the subject');
  assert.deepStrictEqual(slice.story.popids, ['POP-90002']);
  assert.ok(slice.story.ref.endsWith('@C999'), 'the ref carries the cycle so a seat is not dropped as stale next cycle');
  assert.ok(![slice.story.ref, ...slice.facts.map(f => f.src)].some(x => /POP-\d{5}/.test(x)), 'no POPID in a source cite — it becomes the published INTAKE CLAIM ref and trips the Rhea popid-leak scan');
  const text = slice.facts.map(f => f.text);
  assert.ok(text.some(t => /2041 TST: 60 G/.test(t)) && text.some(t => /2039 TST: 67 G/.test(t)), 'every season line is a fact');
  assert.ok(text.some(t => /11\.6 K per 9.*worked from the season line/.test(t)), 'rates are worked here, not by the writer');
  assert.ok(text.some(t => /^Peer — Test Closer 01 .*2041 TST/.test(t)), 'a same-job peer rides along');
  assert.ok(text.some(t => /^Peer — Test Closer 01 2041 rates/.test(t)), 'with its rates worked too');
  assert.ok(!text.some(t => /Test Slugger/.test(t)), 'a hitter is not a pitcher\'s peer');
  assert.ok(text.some(t => /This cycle \(feed, playoffs\): Test Closer 02\/1IP\/0ER\/2SO/.test(t)));
  // Named only in the notes: the sentence that names him is the delta.
  const notesOnly = m.buildMarburySlice(999, { root, beats: { Story_Hook_Deck: [], Oakland_Sports_Feed: [
    { Cycle: '999', SeasonType: 'playoffs', NamesUsed: '', Stats: 'Somebody Else/2HR', StoryAngle: '',
      Notes: 'A tight one. Test Closer 02 allowed two runs in relief. The bats answered.' }] } });
  assert.ok(notesOnly.facts.some(f => f.text === 'This cycle (feed notes, playoffs): Test Closer 02 allowed two runs in relief.'));
  assert.deepStrictEqual(m.buildMarburySlice(999, { root, beats }).subject, slice.subject, 'the same cycle is the same memo');
  // Nobody with a dossier on the feed → the dossier list in rotation, never an empty seat.
  const quiet = m.buildMarburySlice(999, { root, beats: { Oakland_Sports_Feed: [], Story_Hook_Deck: [] } });
  assert.equal(quiet.empty, false);
  assert.match(quiet.prewrite.note, /by rotation/);
  // No mirror at all → an empty slice with its reason.
  const bare = fs.mkdtempSync(path.join(os.tmpdir(), 'marbury-bare-'));
  assert.equal(m.buildMarburySlice(999, { root: bare, beats }).empty, true);
  fs.rmSync(bare, { recursive: true, force: true });
  console.log('buildMarburySlice tests: PASS');
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
