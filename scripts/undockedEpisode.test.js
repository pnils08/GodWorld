'use strict';

const E = require('./undockedEpisode');

let failed = 0;
function check(name, cond, detail) {
  if (cond) console.log('  ok  ' + name);
  else { failed++; console.error('  FAIL ' + name + (detail ? ': ' + detail : '')); }
}

const call = cmd => JSON.stringify({ event: 'tool_call', tick: 0, ts: 'x', tool: 'game', args: { command: cmd } });
const err = cmd => JSON.stringify({ event: 'tool_error', tick: 0, ts: 'x', tool: 'game', args: { command: cmd } });
const turn = () => JSON.stringify({ event: 'turn_end', tick: 0, ts: 'x' });
const idle = (t, n) => { let r = false; for (let i = 0; i < n; i++) r = t.push(turn()); return r; };

// research.31 (2026-10-30): the captain's log is not a stop token. Daphne
// Stafford's 10-29 night ended at ~5 min on log + dock under the old rule.
let t = E.createCompletionTracker();
t.push(call('spacemolt/dock'));
check('log while docked does not end the night', t.push(call('spacemolt_social/captains_log_add')) === false && t.complete === false);
check('the pilot keeps flying after the log', t.push(call('spacemolt/undock')) === false);

// The night ends when the pilot stops calling the console for IDLE_TURNS turns.
t = E.createCompletionTracker();
t.push(call('spacemolt/undock'));
check('IDLE_TURNS - 1 idle turns do not end it', idle(t, E.IDLE_TURNS - 1) === false);
check('the IDLE_TURNS-th idle turn ends it', t.push(turn()) === true && t.complete === true);
check('calls are counted', t.toolCalls === 1);

// A console call resets the idle count (Taveras 10-16 never passed 2 idle turns).
t = E.createCompletionTracker();
idle(t, E.IDLE_TURNS - 1);
t.push(call('spacemolt/get_status'));
check('a call resets the idle count', idle(t, E.IDLE_TURNS - 1) === false);

// tool_error events are failed attempts: they do not reset the idle count.
t = E.createCompletionTracker();
idle(t, E.IDLE_TURNS - 1);
t.push(err('spacemolt/mine'));
check('a failed call does not reset the idle count', t.push(turn()) === true);

// Simone Adesanya 10-10: 2 calls, then narration — ends at the idle limit.
t = E.createCompletionTracker();
t.push(call('spacemolt/undock'));
t.push(call('spacemolt/get_poi'));
check('a narrating pilot ends at the idle limit', idle(t, E.IDLE_TURNS) === true && t.toolCalls === 2);

// Non-command lines are inert (status_log has no args.command; junk fails parse).
t = E.createCompletionTracker();
check('non-JSON inert', t.push('not json at all') === false);
check('status_log inert', t.push(JSON.stringify({ event: 'tool_call', tool: 'status_log', args: { category: 'info', message: 'docking now' } })) === false && t.toolCalls === 0);

// The end is sticky: a later call does not reopen the night.
t = E.createCompletionTracker();
idle(t, E.IDLE_TURNS);
check('ended stays ended', t.push(call('spacemolt/undock')) === true);

// codex research.31 F4: replay every saved flight through the tracker. No pilot
// who came back to the console after a pause may be cut before that call.
const fs = require('fs'), path = require('path');
const epDir = path.join(__dirname, '..', 'output', 'spacemolt-show', 'episodes');
const logs = fs.existsSync(epDir) ? fs.readdirSync(epDir).filter(f => f.endsWith('.log')) : [];
const cut = [];
let resumedAfter8 = 0;
logs.forEach(function (f) {
  t = E.createCompletionTracker();
  let endedAt = -1, lastCall = -1, idleRun = 0, maxResumed = 0;
  fs.readFileSync(path.join(epDir, f), 'utf8').split('\n').forEach(function (line, i) {
    if (t.push(line) && endedAt < 0) endedAt = i;
    let e; try { e = JSON.parse(line); } catch (_) { return; }
    if (e.event === 'turn_end') idleRun++;
    if (e.event === 'tool_call' && e.args && typeof e.args.command === 'string') {
      lastCall = i; maxResumed = Math.max(maxResumed, idleRun); idleRun = 0;
    }
  });
  if (maxResumed >= 8) resumedAfter8++;
  if (endedAt >= 0 && endedAt < lastCall) cut.push(f);
});
check('saved flights replay: the idle stop never cuts a pilot who resumed (' + logs.length + ' logs)',
  logs.length > 0 && cut.length === 0, cut.join(', '));
check('the replay includes the pauses that 8 turns cut (Jumper 09-03, Lopez 09-28)', resumedAfter8 >= 2);
check('the default window is the brief\'s twenty minutes',
  E.parseArgs(['node', 'x', '--session', 's']).minutes === require('./undockedMissionBrief').WINDOW_MINUTES);

if (failed) { console.error('undockedEpisode: ' + failed + ' FAIL'); process.exit(1); }
console.log('undockedEpisode: ok');
