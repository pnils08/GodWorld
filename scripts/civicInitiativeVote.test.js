#!/usr/bin/env node
// civic.49 — the council vote counts a member once, and a seat that is neither the lead nor the opposition
// votes by the city's mood and need. An IND-led initiative (blank opposition → CRC) used to count both IND
// seats yes by faction and roll the same two again as swing voters (names twice in the roll call), with the 4
// OPP seats never voting: 4 yes at most against 5 needed — it could never pass. Pure function, no sheet.
//   node scripts/civicInitiativeVote.test.js
const fs = require('fs'), path = require('path');
const src = (p) => fs.readFileSync(path.resolve(__dirname, p), 'utf8');
global.Logger = { log() {} };
const { resolveCouncilVote_ } = new Function(src('../phase01-config/advanceSimulationCalendar.js') + '\n' + src('../phase05-citizens/civicInitiativeEngine.js') + '\nreturn { resolveCouncilVote_ };')();
let pass = 0, fail = 0;
const ok = (n, c, d) => { if (c) { pass++; } else { fail++; console.log('FAIL', n, d || ''); } };

const mem = { OPP: ['Carter', 'Delgado', 'Rivers', 'Mobley'], CRC: ['Crane', 'Ashford', 'Chen'], IND: ['Tran', 'Vega'] };
const council = (unavailable) => ({
  totalSeats: 9, filledSeats: 9, availableVotes: 9, vacantSeats: 0, members: [], unavailable: unavailable || [],
  factions: { OPP: { count: 4, available: 4, members: mem.OPP }, CRC: { count: 3, available: 3, members: mem.CRC }, IND: { count: 2, available: 2, members: mem.IND } },
  indMembers: mem.IND.map((name) => ({ name }))
});
const H = ['Name', 'VoteRequirement', 'Projection', 'LeadFaction', 'OppositionFaction', 'Budget'];
const row = (lead, opp) => ['Test', '5-4', 'neutral', lead, opp, '$2M'];
const none = { primary: '', secondary: '', secondaryLean: '' };
const vote = (st, r, swing, rolls) => { const q = rolls.slice(); return resolveCouncilVote_({}, r, H, st, 0, swing, { demographics: [], affectedNeighborhoods: [], policyDomain: '' }, () => (q.length ? q.shift() : 0.5), null); };
// mood 0, no need: every unnamed vote is probability 0.5, yes below it. With nobody named the dice go: the 4 OPP seats (the third faction).

const allYes = vote(council(), row('IND', ''), none, [0.1, 0.1, 0.1, 0.1]);
ok('A1 an IND-led initiative with every third-faction seat yes is 6-3 and passes', allYes.status === 'passed' && allYes.voteCount === '6-3', allYes.voteCount);
const names = allYes.swingVoters.map((v) => v.name);
ok('A2 the roll call is nine seats, each once (no IND name twice)', names.length === 9 && new Set(names).size === 9, names.join(','));
ok('A3 the 4 OPP seats are in the roll call as votes cast', mem.OPP.every((n) => allYes.swingVoters.some((v) => v.name === n && v.vote === 'yes')));
const threeOfFour = vote(council(), row('IND', ''), none, [0.1, 0.1, 0.1, 0.9]);
ok('A4 two IND seats + three of four OPP seats = 5 yes passes', threeOfFour.status === 'passed' && threeOfFour.voteCount === '5-4', threeOfFour.voteCount);
const twoOfFour = vote(council(), row('IND', ''), none, [0.1, 0.1, 0.9, 0.9]);
ok('A5 two of four OPP seats is 4 yes — it fails, and the vote can fail', twoOfFour.status === 'failed' && twoOfFour.voteCount === '4-5', twoOfFour.voteCount);
const allNo = vote(council(), row('IND', ''), none, [0.9, 0.9, 0.9, 0.9]);
ok('A6 every OPP seat no is 2-7', allNo.status === 'failed' && allNo.voteCount === '2-7', allNo.voteCount);
ok('A7 the IND lead seats vote yes by faction, once', ['Tran', 'Vega'].every((n) => allYes.swingVoters.filter((v) => v.name === n).length === 1 && allYes.swingVoters.find((v) => v.name === n).vote === 'yes'));

// an unavailable seat in the third faction does not vote
const oneOut = vote(council([{ name: 'Mobley', reason: 'hospitalized', faction: 'OPP' }]), row('IND', ''), none, [0.1, 0.1, 0.1]);
ok('B1 a hospitalized third-faction seat casts no vote', !oneOut.swingVoters.some((v) => v.name === 'Mobley') && oneOut.swingVoters.length === 8, String(oneOut.swingVoters.length));

// rows that already worked roll the same dice and count the same
const oppLed = vote(council(), row('OPP', 'CRC'), { primary: 'Vega', secondary: 'Tran', secondaryLean: 'lean-yes' }, [0.1, 0.1]);
ok('C1 an OPP-led initiative with CRC opposition: 4 OPP + both named swing voters = 6-3, each seat once', oppLed.voteCount === '6-3' && new Set(oppLed.swingVoters.map((v) => v.name)).size === 9, oppLed.voteCount);
const oppBlank = vote(council(), row('OPP', ''), none, [0.1, 0.1]);
ok('C2 an OPP-led initiative with a blank opposition (CRC): 4 OPP + both unnamed IND yes = 6-3', oppBlank.voteCount === '6-3', oppBlank.voteCount);

// the school board: no faction buckets, every member votes once as an unnamed IND
const board = { totalSeats: 7, filledSeats: 7, availableVotes: 7, vacantSeats: 0, seated: 7, members: [], unavailable: [],
  factions: { OPP: { count: 0, available: 0, members: [] }, CRC: { count: 0, available: 0, members: [] }, IND: { count: 0, available: 0, members: [] } },
  indMembers: ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((name) => ({ name })) };
const b = resolveCouncilVote_({}, row('IND', ''), H, board, 0, none, { demographics: [], affectedNeighborhoods: [], policyDomain: '' }, (() => { const q = [0.1, 0.1, 0.1, 0.1, 0.9, 0.9, 0.9]; return () => q.shift(); })(), { body: 'school board', label: 'Board', votesNeeded: 4 });
ok('D1 the school board still counts seven seats once: 4-3', b.voteCount === '4-3' && b.swingVoters.length === 7, b.voteCount);

console.log(`civicInitiativeVote: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
