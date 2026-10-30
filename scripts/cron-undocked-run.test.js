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

// pipeline.95: every applied night with no receipt goes to its pilot's page, once (synthetic pilots, temp receipt file).
(async () => {
  const fs = require('fs'), os = require('os'), path = require('path');
  const SR = require('./undockedShowRecord');
  check('the page stage is off until the flip', SR.ON === false);
  const nights = [
    { episodeId: 'undocked-pop90001-a', pop: 'POP-90001', cycle: 112, day: 'tue', archive: null, intake: { CreditsDelta: 0, FeedEvent: { Systems: ['sol'] } } },
    { episodeId: 'undocked-pop90002-a', pop: 'POP-90002', cycle: 113, day: 'wed', archive: null, intake: { CreditsDelta: null, FeedEvent: { Systems: [] } } },
    { episodeId: 'undocked-pop90003-a', pop: 'POP-90003', cycle: 113, day: null, archive: null, intake: {} },
  ];
  check('nightsToPage: receipted nights drop', R.nightsToPage(nights, { 'undocked-pop90001-a': 'x' }).map(n => n.pop).join(',') === 'POP-90002,POP-90003');
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'paged-')), 'paged.json');
  const calls = [];
  let failNext = 'POP-90002';
  const page = {
    pageRefOf: require('../lib/citizenPage').pageRefOf,
    appendReflection_: async (pop, text, o) => {
      calls.push({ pop, text, o });
      if (pop === failNext) return { error: '[err] synthetic 500' };
      return { customId: 'cp-' + pop + '-c' + o.cycle + '-' + o.daypart + '-' + o.day + '-' + o.ref };
    },
  };
  const r1 = await R.pageNights({ nights, page, file, record: SR });
  const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
  check('first run: one written, a failed doc and a no-weekday night left', r1.wrote === 1 && r1.left === 2 && Object.keys(saved).join() === 'undocked-pop90001-a', JSON.stringify(r1));
  check('a night with no weekday is never sent', !calls.some(c => c.pop === 'POP-90003'));
  const c0 = calls[0];
  check('keyed by flown Cycle, daypart UNDOCKED, weekday and the episode\'s six letters', c0.o.cycle === 112 && c0.o.daypart === 'UNDOCKED' && c0.o.day === 'tue' && /^[a-p]{6}$/.test(c0.o.ref));
  check('typed show, the episode on the doc', c0.o.extra.type === 'show' && c0.o.extra.episode === 'undocked-pop90001-a');
  check('the doc is the night in plain words', /^UNDOCKED, Tuesday night, Cycle 112\. Went through Sol; came out even on credits\.$/.test(c0.text), c0.text);
  failNext = null; calls.length = 0;
  const r2 = await R.pageNights({ nights, page, file, record: SR });
  check('next run: only the failed night is retried', r2.wrote === 1 && calls.length === 1 && calls[0].pop === 'POP-90002');
  calls.length = 0;
  await R.pageNights({ nights, page, file, record: SR });
  check('a receipted night is never written twice', calls.length === 0);
  check('receipts are landed with the doc id', JSON.parse(fs.readFileSync(file, 'utf8'))['undocked-pop90001-a'].status === 'landed');
  // codex F3: the doc lands, then the receipt write dies — the night stays pending and is never resent
  const file2 = path.join(path.dirname(file), 'paged2.json');
  const one = [nights[0]];
  let writes = 0;
  const dies = (f, p) => { writes++; if (writes === 2) throw new Error('synthetic crash after the send'); fs.writeFileSync(f, JSON.stringify(p)); };
  calls.length = 0;
  let threw = false;
  try { await R.pageNights({ nights: one, page, file: file2, record: SR, save: dies }); } catch (e) { threw = /synthetic crash/.test(e.message); }
  check('a crash after the send stops the stage', threw && calls.length === 1);
  calls.length = 0;
  const r3 = await R.pageNights({ nights: one, page, file: file2, record: SR });
  check('the interrupted night is pending, reported, and never resent (no doubled doc)', calls.length === 0 && r3.pending === 1 && r3.wrote === 0);
  fs.writeFileSync(file2, '{"undocked-pop90001-a": {"status": "pend');
  let loud = false;
  try { await R.pageNights({ nights: one, page, file: file2, record: SR }); } catch (e) { loud = true; }
  check('an unreadable receipt file stops the stage loudly, sends nothing', loud && calls.length === 0);
  check('receipts are replaced whole (no temp file left behind)', !fs.existsSync(file + '.tmp'));
  fs.rmSync(path.dirname(file), { recursive: true, force: true });

  if (failed) { console.error('cron-undocked-run: ' + failed + ' FAIL'); process.exit(1); }
  console.log('cron-undocked-run: ok');
})();
