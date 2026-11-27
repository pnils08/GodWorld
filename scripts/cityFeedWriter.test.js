'use strict';
// pipeline.118 — the city feed writer's check: a sentence passes only against the ONE unit it cites.
const assert = require('assert');
const C = require('./cityFeedWriter');
let n = 0; const t = (name, fn) => { fn(); n++; };

const unitA = 'Faith_Ledger row 212 | Cycle: 116 | Organization: Temple Beth Or | EventType: community_program | EventDescription: food pantry serves neighbors in need | Neighborhood: Rockridge | Attendance: 89';
const unitB = 'Faith_Ledger row 40 | Cycle: 97 | Organization: Foothill Baptist Tabernacle | EventType: holy_day | EventDescription: Thanksgiving service | Attendance: 2659';
const canon = '[C114 · daily · Elliot Graye] Temple Beth Or opened its pantry line early after the rent notices went out on Claremont Avenue.';

t('a true sentence passes', () => assert.ok(C.checkSentence('Temple Beth Or ran its food pantry in C116, with 89 attending.', unitA).ok));
t('a figure from another row fails', () => assert.ok(!C.checkSentence('Temple Beth Or drew 2,659 in C116.', unitA).ok));
t('a name from another row fails', () => { const r = C.checkSentence('Foothill Baptist Tabernacle ran a food pantry in C116, with 89 attending.', unitA); assert.ok(!r.ok); assert.ok(r.why.some((w) => /Foothill/.test(w))); });
t('a wrong cycle fails', () => assert.ok(!C.checkSentence('Temple Beth Or ran its food pantry in C115, with 89 attending.', unitA).ok));
t('a cycle that is only another number in the row fails', () => assert.ok(!C.checkSentence('Temple Beth Or ran its food pantry in C89.', unitA).ok));
t('an added cause fails', () => { const r = C.checkSentence('Temple Beth Or ran its food pantry in C116 because of rising rents.', unitA); assert.ok(!r.ok); assert.ok(r.why.some((w) => /causal/.test(w))); });
t('a cause the unit states passes only with its own word', () => {
  assert.ok(!C.checkSentence('The pantry line at Temple Beth Or opened early in C114 because of rent notices on Claremont Avenue.', canon).ok);
  assert.ok(C.checkSentence('Temple Beth Or opened its pantry line early in C114, after the rent notices went out on Claremont Avenue.', canon).ok);
});
t('thousands separators match', () => assert.ok(C.checkSentence('Foothill Baptist Tabernacle drew 2,659 at its Thanksgiving service in C97.', unitB).ok));
t('a sentence opener is not a name', () => assert.ok(C.checkSentence('The food pantry at Temple Beth Or served 89 in C116.', unitA).ok));
t('a count word must be in the unit', () => assert.ok(!C.checkSentence('Temple Beth Or ran three food pantry days in C116.', unitA).ok));
t('an empty unit fails', () => assert.ok(!C.checkSentence('Anything.', '').ok));

const facts = [{ text: 'Temple Beth Or (Rockridge), C117 — crisis response: vigil held for community healing (attendance 91)', src: 'output/beats/Faith_Ledger.jsonl C117 "Temple Beth Or"' }];
const units = new Map([['u1', { text: unitA, ref: 'Faith_Ledger row 212' }], ['u2', { text: unitB, ref: 'Faith_Ledger row 40' }]]);
t('an entry keeps what passes and drops the rest', () => {
  const r = C.buildEntry({ rows: [1], event: 'Temple Beth Or in Rockridge held a vigil for community healing in C117, with 91 attending.', names: ['Temple Beth Or', 'Naomi Sterling (Rabbi)'],
    history: [{ s: 'Temple Beth Or ran its food pantry in C116, with 89 attending.', unit: 'u1' }, { s: 'Temple Beth Or drew 2,659 at Thanksgiving in C97.', unit: 'u2' }, { s: 'It has done so since C90.', unit: 'u9' }],
    questions: ['What was the vigil at Temple Beth Or for?', 'Did the vigil follow the Claremont fire?', 'The record gives no reason.'] }, facts, units, [], 117);
  assert.ok(r.entry);
  assert.strictEqual(r.entry.history.length, 1);
  assert.deepStrictEqual(r.entry.questions, ['What was the vigil at Temple Beth Or for?']);
  assert.deepStrictEqual(r.entry.names, ['Temple Beth Or']);
  assert.strictEqual(r.dropped.length, 5 + (/C117/.test(r.entry.event) ? 0 : 0));
});
t('an event that adds to the rows is replaced by the rows own text', () => { const r = C.buildEntry({ rows: [1], event: 'Temple Beth Or held a vigil in C117 after a death in the congregation, with 91 attending.', history: [], questions: ['What was the vigil for?'] }, facts, units, [], 117); assert.ok(r.entry); assert.ok(!/death/.test(r.entry.event)); assert.ok(/vigil held for community healing/.test(r.entry.event)); });
t('a row short form covers its long word', () => assert.deepStrictEqual(C.novelWordsOf('a closure of magnitude 25', 'closure | mag -25'), []));
t('a question may ask the cause', () => assert.ok(C.checkSentence('What was the vigil at Temple Beth Or responding to?', unitA, { question: true }).ok));
t('a statement may not', () => assert.ok(!C.checkSentence('The vigil at Temple Beth Or was responding to a food pantry.', unitA).ok));
t('an entry with no surviving question is not written', () => assert.strictEqual(C.buildEntry({ rows: [1], event: 'Temple Beth Or held a vigil for community healing in C117.', history: [], questions: ['Was it for Dana Whitlock?'] }, facts, units, []).entry, null));
t('an entry naming no handed row is not written', () => assert.strictEqual(C.buildEntry({ rows: [7], event: 'x', questions: ['y?'] }, facts, units, []).entry, null));

const pk = { packages: { a: { models: { write: 'm1' } }, b: { models: { write: 'm1' } }, c: { models: { write: 'm2' } }, 'p-slayer': { models: { write: 'm3' } } } };
t('two seats share only with different write models', () => { assert.deepStrictEqual(C.seatsFor('a', 'b', pk), ['a']); assert.deepStrictEqual(C.seatsFor('a', 'c', pk), ['a', 'c']); });
t('a free seat gets no entry', () => { assert.deepStrictEqual(C.seatsFor('a', 'p-slayer', pk), ['a']); for (const s of C.FREE_SEATS) assert.deepStrictEqual(C.seatsFor(s, 'a', pk), []); });
t('the hook and seed decks are not readable', () => { assert.ok(!C.RECORD_TABS.includes('Story_Hook_Deck')); assert.ok(!C.RECORD_TABS.includes('Story_Seed_Deck')); assert.ok(/No such record/.test(C.recordRead({ tab: 'Story_Seed_Deck', match: 'x' }))); });
t('the row shape matches the header', () => { const row = C.toRow('faith', 117, 1, { rows: [1], event: 'E.', history: [], questions: ['Q?'], names: ['Temple Beth Or'] }, facts, ['elliot-graye']); assert.deepStrictEqual(Object.keys(row), C.HEADER); assert.strictEqual(row.StoryAngle, 'Q?'); });
console.log('cityFeedWriter.test.js — ' + n + ' passed');
