'use strict';

const O = require('./cron-undocked-run');

let failed = 0;
function check(name, cond, detail) {
  if (cond) console.log('  ok  ' + name);
  else { failed++; console.error('  FAIL ' + name + (detail ? ': ' + detail : '')); }
}

// Fixture rows in the (a′) contract shape:
// TargetCycle | DrawCycle | Seed | Slot | POPID | Name | BirthYear | Neighborhood | Role | Employer
function row(target, slot, popid, name) {
  return { TargetCycle: String(target), DrawCycle: String(target - 1), Seed: 's',
    Slot: slot, POPID: popid, Name: name, BirthYear: '1990',
    Neighborhood: 'Fruitvale', Role: 'Clerk', Employer: '' };
}
const rows = [
  row(121, 'cast-1', 'POP-01101', 'Cast One'),
  row(121, 'cast-3', 'POP-01103', 'Cast Three'),
  row(121, 'cast-2', 'POP-01102', 'Cast Two'),
  row(121, 'alt-2', 'POP-01202', 'Alt Two'),
  row(121, 'alt-1', 'POP-01201', 'Alt One'),
  row(120, 'cast-1', 'POP-01001', 'Last Cycle Pilot'),
];

const roster = O.drawRowsToRoster(rows, 121);
check('filters to the target cycle', roster.cast.length === 3 && roster.alternates.length === 2);
check('cast in Slot order', roster.cast.map(p => p.popid).join(',') === 'POP-01101,POP-01102,POP-01103');
check('alts in Slot order', roster.alternates.map(p => p.popid).join(',') === 'POP-01201,POP-01202');
check('fields carried', roster.cast[0].name === 'Cast One' && roster.cast[0].birthYear === '1990' &&
  roster.cast[0].neighborhood === 'Fruitvale' && roster.cast[0].role === 'Clerk');
check('slot recorded', roster.cast[0].slot === 'cast-1');

check('wrong cycle -> empty (caller falls back)', O.drawRowsToRoster(rows, 122).cast.length === 0);
check('no rows -> empty', O.drawRowsToRoster([], 121).cast.length === 0);
check('null rows -> empty', O.drawRowsToRoster(null, 121).cast.length === 0);

check('session name convention', O.sessionName('POP-01101') === 'undocked-pop01101');

// research.29 Move 3 (builder 2026-10-16) + research.31 (2026-10-30): a night
// ends when the pilot stops calling the console — IDLE_TURNS turn_end events
// with no tool_call between them (Simone Adesanya 2026-10-10: 2 calls, then 153
// idle turns to the cap). The captain's log no longer ends a night; a night
// with calls every turn never trips the idle stop.
const E = require('./undockedEpisode');
const te = JSON.stringify({ event: 'turn_end', tick: 1 });
const call = cmd => JSON.stringify({ event: 'tool_call', tool: 'game', args: { command: cmd } });
let t = E.createCompletionTracker(8);
for (let i = 0; i < 7; i++) t.push(te);
check('7 idle turns: still flying', !t.complete);
t.push(te);
check('8th idle turn: the pilot stopped, night over', t.complete && t.idleTurns === 8);
t = E.createCompletionTracker(8);
for (let i = 0; i < 30; i++) { t.push(call('spacemolt/mine')); t.push(te); if (i % 3 === 0) t.push(te); }
check('a flight with a call every turn or two keeps flying (Eric 10-16 shape: 29 calls, max 2 idle)', !t.complete && t.toolCalls === 30);
t = E.createCompletionTracker(8);
t.push(call('spacemolt/undock')); t.push(te); t.push(call('spacemolt_social/captains_log_add')); t.push(te); t.push(call('spacemolt/dock'));
check('log + dock does not end the night (research.31)', !t.complete);
t = E.createCompletionTracker(8);
for (let i = 0; i < 5; i++) t.push(te);
t.push(call('spacemolt/get_status'));
for (let i = 0; i < 7; i++) t.push(te);
check('a tool call resets the idle count', !t.complete && t.idleTurns === 7);
// codex research.31 F4: the default tracker uses IDLE_TURNS (the saved-flight
// replay in undockedEpisode.test.js is what justifies its value).
t = E.createCompletionTracker();
for (let i = 0; i < E.IDLE_TURNS - 1; i++) t.push(te);
check('default tracker: IDLE_TURNS - 1 idle turns keep flying', !t.complete);
t.push(te);
check('default tracker: the IDLE_TURNS-th idle turn ends the night', t.complete);

// research.31: the runner window defaults to the brief's window (builder 20).
const B = require('./undockedMissionBrief');
const R = require('./cron-undocked-run');
check('window default is the brief window', R.windowMinutes([]) === String(B.WINDOW_MINUTES) && B.WINDOW_MINUTES === 20);
check('--minutes overrides the window', R.windowMinutes(['--minutes', '5']) === '5');

// pipeline.95: every applied night goes to its pilot's page once — never doubled, a lost send found (synthetic pilots,
// a fake store, a temp receipt file). The store keeps every append per key: a doubled night is a count of 2.
(async () => {
  const fs = require('fs'), os = require('os'), path = require('path');
  const SR = require('./undockedShowRecord');
  const CP = require('../lib/citizenPage');
  const nights = [
    { episodeId: 'undocked-pop90001-a', pop: 'POP-90001', cycle: 112, day: 'tue', archive: null, intake: { CreditsDelta: 0, FeedEvent: { Systems: ['sol'] } } },
    { episodeId: 'undocked-pop90002-a', pop: 'POP-90002', cycle: 113, day: 'wed', archive: null, intake: { CreditsDelta: null, FeedEvent: { Systems: [] } } },
    { episodeId: 'undocked-pop90003-a', pop: 'POP-90003', cycle: 113, day: null, archive: null, intake: {} },
  ];
  check('nightsToPage: receipted nights drop', R.nightsToPage(nights, { 'undocked-pop90001-a': 'x' }).map(n => n.pop).join(',') === 'POP-90002,POP-90003');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'paged-'));
  const store = new Map(); // customId -> appends
  const calls = [];
  const mode = {}; // pop -> 'refused' (error, nothing stored) | 'lost' (stored, error returned) ; default ok
  let unreadable = false;
  const page = {
    pageRefOf: CP.pageRefOf, pageTagFor: CP.pageTagFor, pageCustomId_: CP.pageCustomId_,
    appendReflection_: async (pop, text, o) => {
      const id = CP.pageCustomId_(CP.pageTagFor(pop), o);
      calls.push({ pop, text, o, id });
      if (mode[pop] === 'refused') return { error: '[err] synthetic 400', customId: id };
      store.set(id, (store.get(id) || 0) + 1);
      if (mode[pop] === 'lost') return { error: '[err] synthetic response lost', customId: id };
      return { id: 'd', customId: id };
    },
    pageHasDoc_: async (pop, id) => (unreadable ? null : store.has(id)),
  };
  const doubled = () => [...store.values()].some(n => n > 1);
  const file = path.join(dir, 'paged.json');

  mode['POP-90002'] = 'refused';
  const r1 = await R.pageNights({ nights, page, file, record: SR });
  const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
  check('first run: one landed, a refused send and a no-weekday night left', r1.wrote === 1 && r1.left === 2 && saved['undocked-pop90001-a'].status === 'landed' && saved['undocked-pop90002-a'].status === 'pending', JSON.stringify(saved));
  check('a night with no weekday is never sent', !calls.some(c => c.pop === 'POP-90003'));
  const c0 = calls[0];
  check('keyed by flown Cycle, daypart UNDOCKED, weekday and the episode\'s six letters', c0.o.cycle === 112 && c0.o.daypart === 'UNDOCKED' && c0.o.day === 'tue' && /^[a-p]{6}$/.test(c0.o.ref) && c0.id === saved['undocked-pop90001-a'].id);
  check('the pending receipt carries the key the send used', saved['undocked-pop90002-a'].id === calls[1].id && saved['undocked-pop90002-a'].pop === 'POP-90002');
  check('typed show, the episode on the doc', c0.o.extra.type === 'show' && c0.o.extra.episode === 'undocked-pop90001-a');
  check('the doc is the night in plain words', /^UNDOCKED, Tuesday night, Cycle 112\. Went through Sol; came out even on credits\.$/.test(c0.text), c0.text);

  delete mode['POP-90002']; calls.length = 0;
  const r2 = await R.pageNights({ nights, page, file, record: SR });
  check('next run: the refused night is not on the page, so it is sent again — once', r2.wrote === 1 && calls.length === 1 && calls[0].pop === 'POP-90002' && !doubled());
  calls.length = 0;
  await R.pageNights({ nights, page, file, record: SR });
  check('a landed night is never sent again', calls.length === 0 && !doubled());

  // re-review R1: the send lands but its response is lost — the next run finds it on the page and does not resend
  const lostNight = [{ ...nights[0], episodeId: 'undocked-pop90004-a', pop: 'POP-90004' }];
  const file2 = path.join(dir, 'paged2.json');
  mode['POP-90004'] = 'lost'; calls.length = 0;
  await R.pageNights({ nights: lostNight, page, file: file2, record: SR });
  delete mode['POP-90004']; calls.length = 0;
  await R.pageNights({ nights: lostNight, page, file: file2, record: SR });
  check('a lost response: found on the page, receipted landed, never doubled', calls.length === 0 && JSON.parse(fs.readFileSync(file2, 'utf8'))['undocked-pop90004-a'].status === 'landed' && !doubled());

  // a crash after the send (the landed receipt never saved): found on the page next run, never doubled
  const crashNight = [{ ...nights[0], episodeId: 'undocked-pop90005-a', pop: 'POP-90005' }];
  const file3 = path.join(dir, 'paged3.json');
  let writes = 0;
  const dies = (f, p) => { writes++; if (writes === 2) throw new Error('synthetic crash after the send'); fs.writeFileSync(f, JSON.stringify(p)); };
  calls.length = 0;
  let threw = false;
  try { await R.pageNights({ nights: crashNight, page, file: file3, record: SR, save: dies }); } catch (e) { threw = /synthetic crash/.test(e.message); }
  check('a crash after the send stops the stage', threw && calls.length === 1);
  calls.length = 0;
  await R.pageNights({ nights: crashNight, page, file: file3, record: SR });
  check('the interrupted night is found on the page, not resent', calls.length === 0 && JSON.parse(fs.readFileSync(file3, 'utf8'))['undocked-pop90005-a'].status === 'landed' && !doubled());

  // a crash after pending but before the send: not on the page, so sent next run
  const preNight = [{ ...nights[0], episodeId: 'undocked-pop90006-a', pop: 'POP-90006' }];
  const file4 = path.join(dir, 'paged4.json');
  writes = 0;
  const diesFirst = (f, p) => { writes++; fs.writeFileSync(f, JSON.stringify(p)); if (writes === 1) throw new Error('synthetic crash before the send'); };
  calls.length = 0;
  try { await R.pageNights({ nights: preNight, page, file: file4, record: SR, save: diesFirst }); } catch (e) { /* stopped before the send */ }
  check('a crash before the send sends nothing', calls.length === 0);
  await R.pageNights({ nights: preNight, page, file: file4, record: SR });
  check('next run: not on the page, sent once', calls.length === 1 && store.get(calls[0].id) === 1);

  // the page cannot be read: a pending night stays pending, nothing resent
  const heldNight = [{ ...nights[0], episodeId: 'undocked-pop90007-a', pop: 'POP-90007' }];
  const file5 = path.join(dir, 'paged5.json');
  mode['POP-90007'] = 'lost';
  await R.pageNights({ nights: heldNight, page, file: file5, record: SR });
  delete mode['POP-90007']; unreadable = true; calls.length = 0;
  const r5 = await R.pageNights({ nights: heldNight, page, file: file5, record: SR });
  unreadable = false;
  check('an unreadable page: left pending, said, not resent', calls.length === 0 && r5.pending === 1 && !doubled());

  fs.writeFileSync(file5, '{"undocked-pop90007-a": {"status": "pend');
  let loud = false;
  calls.length = 0;
  try { await R.pageNights({ nights: heldNight, page, file: file5, record: SR }); } catch (e) { loud = true; }
  check('an unreadable receipt file stops the stage loudly, sends nothing', loud && calls.length === 0);
  check('receipts are replaced whole (no temp file left behind)', !fs.existsSync(file + '.tmp'));
  fs.rmSync(dir, { recursive: true, force: true });

  if (failed) { console.error('cron-undocked-run: ' + failed + ' FAIL'); process.exit(1); }
  console.log('cron-undocked-run: ok');
})();
