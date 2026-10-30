'use strict';

// pipeline.95 — the show record in plain words. Synthetic pilots (POP-9xxxx, "Test …") on a temp disk only.
const fs = require('fs');
const os = require('os');
const path = require('path');
const R = require('./undockedShowRecord');

let failed = 0;
function check(name, cond, detail) {
  if (cond) console.log('  ok  ' + name);
  else { failed++; console.error('  FAIL ' + name + (detail ? ': ' + detail : '')); }
}

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'showrec-'));
fs.mkdirSync(path.join(root, 'intake'));
fs.mkdirSync(path.join(root, 'staged', 'archive'), { recursive: true });
function night(ep, pop, cycle, startedAt, facts, extra) {
  fs.writeFileSync(path.join(root, 'intake', ep + '.json'), JSON.stringify({ POPID: pop, Cycle: cycle, EpisodeId: ep, Holder: 'Test Pilot', Applied: (extra && extra.applied) || 'yes',
    Timestamp: startedAt, CreditsDelta: facts && facts.credits_delta ? facts.credits_delta.value : null }));
  if (extra && extra.noArchive) return;
  fs.writeFileSync(path.join(root, 'staged', 'archive', ep + '.json'), JSON.stringify({ episode_id: ep, popid: pop, window: { startedAt },
    runner: (extra && extra.runner) || { capped: true }, stall: (extra && extra.stall) || null, facts: facts || {},
    captains_log: { entries: (extra && extra.log) || [] } }));
}
const busy = {
  systems_visited: { value: ['sirius', 'Sirius', 'lacaille_9352', 'sol'] },
  entries: { value: { mission: [
    { event_type: 'mission.accepted', data: { title: 'Test Requisition' } },
    { event_type: 'mission.completed', data: { title: 'Test Requisition', credits: 1000 } }] } },
  cargo: { value: { mined: { iron_ore: 12 }, sold: { iron_ore: 12, nickel_ore: 0 } } },
  combat_results: { value: { events: 0 } }, mishaps: { value: [] },
  points_delta: { value: 5, earned: [{ name: 'Test Jump', points: 5 }] },
  credits_delta: { value: 1170 }, event_counts: { value: { navigation: 3, session: 2 } },
};
const idle = { systems_visited: { value: [] }, credits_delta: { value: null }, points_delta: { value: 0, earned: [] }, event_counts: { value: { session: 2 } } };
// 01:30Z on a Wednesday is 20:30 Central on the Tuesday
night('undocked-pop90001-a', 'POP-90001', 112, '2026-10-21T01:30:00Z', busy, { log: [{ text: '[Session Handoff] - **Next Step**: mine' }, { text: 'Tonight was steady.\\n- Sold the ore.' }] });
night('undocked-pop90001-b', 'POP-90001', 113, '2026-10-28T01:30:00Z', idle);
night('undocked-pop90002-a', 'POP-90002', 113, '2026-10-29T01:30:00Z', { credits_delta: { value: -40 }, systems_visited: { value: ['sol'] } }, { stall: { idleTurns: 8 } });
night('undocked-pop90003-a', 'POP-90003', 113, '2026-10-29T01:30:00Z', busy, { applied: 'no' });
night('undocked-pop90004-a', 'POP-90004', 110, '2026-10-07T01:30:00Z', null, { noArchive: true });
fs.writeFileSync(path.join(root, 'standings.json'), JSON.stringify({ v: 'UNDOCKED-STANDINGS/2', rows: [
  { Rank: 1, POPID: 'POP-90001', PointsTotal: 5, CreditsTotal: 1170, CyclesLed: 2, CurrentStreak: 2 },
  { Rank: 2, POPID: 'POP-90002', PointsTotal: 0, CreditsTotal: -40, CyclesLed: 0, CurrentStreak: 0 }] }));

console.log('loadNights');
const N = R.loadNights({ root });
check('applied nights only, oldest first', N.map((n) => n.episodeId).join(',') === 'undocked-pop90004-a,undocked-pop90001-a,undocked-pop90001-b,undocked-pop90002-a', N.map((n) => n.episodeId).join(','));
check('weekday is the Central evening, not the UTC date', N[1].day === 'tue', N[1].day);
check('a missing archive keeps the intake row', N[0].archive === null && N[0].cycle === 110);
check('an absent show dir is no nights', R.loadNights({ root: path.join(root, 'nope') }).length === 0);

console.log('nightClauses / pageText / nightLine');
const a = R.nightClauses(N[1]);
check('systems deduped and named', a.clauses[0] === 'went through Sirius, Lacaille 9352 and Sol', a.clauses[0]);
check('contract taken and finished with its pay', a.clauses.includes('took the Test Requisition contract') && a.clauses.includes('finished Test Requisition for 1,000 credits'));
check('cargo mined and sold, zero lots dropped', a.clauses.includes('mined 12 iron ore') && a.clauses.includes('sold 12 iron ore'));
check('points by name', a.clauses.includes('earned Test Jump (5 points)'));
check('credits up', a.clauses.includes('came out 1,170 credits up'));
check('window end', a.ended === "flew until the show's time ran out");
const b = R.nightClauses(N[2]);
check('a night the ship never moved says only that', b.clauses.length === 0 && b.ended === 'never got the ship moving' && !b.moved);
const c = R.nightClauses(N[3]);
check('credits down; a stalled night stopped early', c.clauses.includes('came out 40 credits down') && c.ended === 'stopped flying before the time ran out');
const d = R.nightClauses(N[0]);
check('no archive and no feed: nothing claimed about the night', d.clauses.join() === 'flew a night whose details never came back' && d.ended === '' && d.moved === null, JSON.stringify(d));
const emptyFeed = R.nightClauses({ ...N[0], intake: { ...N[0].intake, FeedEvent: { Systems: [] } } });
check('no archive and an empty feed list: still unknown, never "never moved" (codex F5)', emptyFeed.moved === null && emptyFeed.clauses.join() === 'flew a night whose details never came back');
const fed = R.nightClauses({ ...N[0], intake: { ...N[0].intake, CreditsDelta: null, FeedEvent: { Systems: ['Sol', 'sol'] } } });
check('no archive: the feed\'s systems and unsettled credits carry the night', fed.clauses[0] === 'went through Sol' && fed.clauses.includes("the night's credits never settled") && fed.moved === true, JSON.stringify(fed));
check('captain\'s log: the working note is skipped, the sign-off kept and cleaned', R.captainsLog(N[1]) === 'Tonight was steady. Sold the ore.', R.captainsLog(N[1]));
const withLog = (t) => R.captainsLog({ archive: { captains_log: { entries: [{ text: t }] } } });
check('a log naming a POPID is not quoted (codex F6)', withLog('Flew for POP-90001 tonight.') === '');
check('a log naming an episode is not quoted', withLog('Logged for undocked-pop90001-a.') === '');
check('a log carrying a date is not quoted', withLog('Mined ore on 2026-10-30, sold it.') === '');
check('a handoff in other words is not quoted', withLog('Handoff to the next pilot: dock first.') === '');
check('a log naming a model is not quoted', withLog('Running on deepseek tonight.') === '');
check('a plain sign-off is quoted', withLog('Quiet night in the belt. Sold the iron.') === 'Quiet night in the belt. Sold the iron.');
const pt = R.pageText(N[1]);
check('page text: weekday and Cycle, no date', /^UNDOCKED, Tuesday night, Cycle 112\. Went through/.test(pt) && !/20\d\d|-\d\d-|T\d\d:/.test(pt), pt);
check('page text quotes the log', /Captain's log: "Tonight was steady\. Sold the ore\."$/.test(pt), pt);
check('night line in the second person', /^Tuesday night, you went through Sirius/.test(R.nightLine(N[1])));
check('a never-moved night line', R.nightLine(N[2]) === 'Tuesday night, you never got the ship moving.', R.nightLine(N[2]));

console.log('showBlock');
const mine = R.nightsFor(N, 'pop-90001');
const blk = R.showBlock(mine, R.loadStanding('POP-90001', { root }), 113);
check('opens on the show', blk.split('\n')[0] === 'You have flown on UNDOCKED, the show the city watches.');
check('grouped by week, this week first', /This week:\n- Tuesday night, you never got the ship moving\.\nLast week:\n- Tuesday night, you went through/.test(blk), blk);
check('board line', /On the show's board you stand 1st of 2, with 5 points and 1,170 credits; you have led the board 2 weeks, 2 in a row now\.$/.test(blk), blk);
check('never flew -> empty', R.showBlock([], null, 113) === '' && R.showBlockFor(N, 'POP-90009', 113, {}) === '');
check('a night after the wake Cycle is not shown', R.showBlock(mine, null, 112).includes('This week:\n- Tuesday night, you went through') && !R.showBlock(mine, null, 112).includes('never got'));
const many = [];
for (let i = 0; i < 5; i++) many.push({ ...N[2], episodeId: 'x' + i, cycle: 105 + i });
const mb = R.showBlock(many, null, 113);
check('the latest three nights told, the rest one line', (mb.match(/^- /gm) || []).length === 3 && /Before that you flew 2 more nights, the first 8 weeks ago\./.test(mb), mb);
check('no ids or dates reach the block', !/POP-|undocked-pop|20\d\d-/.test(blk + mb));
fs.writeFileSync(path.join(root, 'standings.json'), '{not json');
const logged = [];
check('an unreadable board leaves the board line out, never the nights', /This week:/.test(R.showBlockFor(N, 'POP-90001', 113, { root, log: (m) => logged.push(m) })) && logged.length === 1);

fs.rmSync(root, { recursive: true, force: true });
if (failed) { console.error('undockedShowRecord: ' + failed + ' FAIL'); process.exit(1); }
console.log('undockedShowRecord: all ok');
