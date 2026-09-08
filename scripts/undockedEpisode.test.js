'use strict';

const E = require('./undockedEpisode');

let failed = 0;
function check(name, cond, detail) {
  if (cond) console.log('  ok  ' + name);
  else { failed++; console.error('  FAIL ' + name + (detail ? ': ' + detail : '')); }
}

const call = cmd => JSON.stringify({ event: 'tool_call', tick: 0, ts: 'x', tool: 'game', args: { command: cmd } });
const err = cmd => JSON.stringify({ event: 'tool_error', tick: 0, ts: 'x', tool: 'game', args: { command: cmd } });

// Ship starts docked (mission brief preconditions): a log entry written
// without ever undocking is still a completion signal.
let t = E.createCompletionTracker();
check('log while docked completes', t.push(call('spacemolt_social/captains_log_add')) === true);

// Canonical mission order: undock, fly, dock, then log.
t = E.createCompletionTracker();
t.push(call('spacemolt/undock'));
check('dock after undock does not complete', t.push(call('spacemolt/dock')) === false && t.complete === false);
check('log after dock completes', t.push(call('spacemolt_social/captains_log_add')) === true);

// Reverse order (2026-09-08 episode): log while flying, then dock.
t = E.createCompletionTracker();
t.push(call('spacemolt/undock'));
check('log while flying does not complete', t.push(call('spacemolt_social/captains_log_add')) === false);
check('dock after log completes', t.push(call('spacemolt/dock')) === true);

// tool_error events never move state.
t = E.createCompletionTracker();
t.push(err('spacemolt_social/captains_log_add'));
check('failed log attempt ignored', t.push(call('spacemolt/dock')) === false);

// The 2026-09-08 pattern: wrong-namespace error, then right-namespace success.
t = E.createCompletionTracker();
t.push(err('spacemolt/captains_log_add'));
check('wrong-namespace error ignored', t.complete === false);
check('right-namespace success completes', t.push(call('spacemolt_social/captains_log_add')) === true);

// 'undock' ends in 'dock' but must not read as docking: a log written after
// undocking must NOT complete. (If undock were misread as dock, it would.)
t = E.createCompletionTracker();
t.push(call('spacemolt/undock'));
check('undock is not dock', t.push(call('spacemolt_social/captains_log_add')) === false);

// Non-command lines are inert (status_log has no args.command; junk fails parse).
t = E.createCompletionTracker();
check('non-JSON inert', t.push('not json at all') === false);
check('status_log inert', t.push(JSON.stringify({ event: 'tool_call', tool: 'status_log', args: { category: 'info', message: 'docking now' } })) === false);

// Completion is sticky: a later undock does not un-complete.
t = E.createCompletionTracker();
t.push(call('spacemolt_social/captains_log_add'));
check('complete stays complete', t.push(call('spacemolt/undock')) === true);

if (failed) { console.error('undockedEpisode: ' + failed + ' FAIL'); process.exit(1); }
console.log('undockedEpisode: ok');
