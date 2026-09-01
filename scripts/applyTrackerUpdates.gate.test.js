// Test for the writer-normalization gate (S265 civic.14 Phase 3).
var { normalizeTrackerWrite } = require('./applyTrackerUpdates');

var pass = 0, fail = 0;
function ok(cond, label) { if (cond) { pass++; console.log('  PASS  ' + label); } else { fail++; console.log('  FAIL  ' + label); } }

console.log('=== normalizeTrackerWrite (C98 write-path cases) ===');
var CY = 98;

// Mappable drift → canonicalized into updates (G-R1)
var a = normalizeTrackerWrite({ ImplementationPhase: 'disbursement-recovery' }, { ImplementationPhase: 'implementation-active' }, CY);
ok(a.updates.ImplementationPhase === 'disbursement-active', 'mappable phase canonicalized into the write');
ok(a.warnings.some(w => /normalized/.test(w)), 'normalization surfaced as a warning');

// Unresolvable phase → NOT written, prior kept, loud warn (G-R1)
var b = normalizeTrackerWrite({ ImplementationPhase: 'Active — Council Floor Vote Pending' }, { ImplementationPhase: 'vote-ready' }, CY);
ok(b.updates.ImplementationPhase === undefined, 'unresolvable phase is NOT written (engine never sees a dark string)');
ok(b.warnings.some(w => /UNRESOLVABLE/.test(w)), 'unresolvable phase warns loudly');

// vote-scheduled advance, no VoteCycle → stamp VoteCycle + NextActionCycle = cycle+1 (G-PREP1)
var c = normalizeTrackerWrite({ ImplementationPhase: 'vote-scheduled' }, { ImplementationPhase: 'legislation-filed', VoteCycle: '', NextActionCycle: '' }, CY);
ok(c.updates.VoteCycle === '99', 'G-PREP1: VoteCycle stamped cycle+1');
ok(c.updates.NextActionCycle === '99', 'G-PREP1: NextActionCycle stamped cycle+1');

// vote-scheduled WITH an emitted VoteCycle → not overwritten
var d = normalizeTrackerWrite({ ImplementationPhase: 'vote-scheduled', VoteCycle: 101 }, { ImplementationPhase: 'legislation-filed', VoteCycle: '' }, CY);
ok(d.updates.VoteCycle === '101', 'emitted VoteCycle respected, not overwritten by the stamp');

// stale NextActionCycle on any write → advanced (G-PREP2)
var e = normalizeTrackerWrite({ ImplementationPhase: 'operational' }, { ImplementationPhase: 'implementation-active', NextActionCycle: '94' }, CY);
ok(e.updates.NextActionCycle === '99', 'G-PREP2: stale NextActionCycle advanced to cycle+1 on a write');

// phase advance with no MilestoneNotes → motion recorded (G-R3)
var f = normalizeTrackerWrite({ ImplementationPhase: 'dispatch-live' }, { ImplementationPhase: 'pilot-active', MilestoneNotes: 'old note' }, CY);
ok(/^C98: advanced to dispatch-live/.test(f.updates.MilestoneNotes || ''), 'G-R3: phase advance with no emitted note → default cycle-stamped MilestoneNotes');

// explicit MilestoneNotes respected (no default override)
var g = normalizeTrackerWrite({ ImplementationPhase: 'dispatch-live', MilestoneNotes: 'C98: crews live in D7' }, { ImplementationPhase: 'pilot-active' }, CY);
ok(g.updates.MilestoneNotes === 'C98: crews live in D7', 'emitted MilestoneNotes respected over the default');

// no-op (same canonical phase, nothing else) → empty updates, no stale-advance churn
var h = normalizeTrackerWrite({ ImplementationPhase: 'operational' }, { ImplementationPhase: 'operational', NextActionCycle: '120' }, CY);
ok(Object.keys(h.updates).length === 0, 'no-op write produces empty updates (no churn)');

// garbage / stale emitted NextActionCycle → cycle+1 fallback, not the bad literal (S265 review LOW)
var i = normalizeTrackerWrite({ ImplementationPhase: 'operational', NextActionCycle: '99abc' }, { ImplementationPhase: 'implementation-active' }, CY);
ok(i.updates.NextActionCycle === '99', 'garbage NextActionCycle "99abc" → cycle+1, not written verbatim');
var j = normalizeTrackerWrite({ ImplementationPhase: 'operational', NextActionCycle: 90 }, { ImplementationPhase: 'implementation-active' }, CY);
ok(j.updates.NextActionCycle === '99', 'stale NextActionCycle (90 < 98) → cycle+1');
var k = normalizeTrackerWrite({ ImplementationPhase: 'operational', NextActionCycle: 105 }, { ImplementationPhase: 'implementation-active' }, CY);
ok(k.updates.NextActionCycle === '105', 'valid forward NextActionCycle (105) respected');


// ===========================================================================
// engine.138 / G-PF18 — the civic sentiment CARRIER, reader half.
//
// This file already covers the civic write path, and the carrier's two halves
// belong together: applyTrackerUpdates.js --apply writes the World_Config key
// pair, and loadCivicVoiceSentiment_ (phase02) reads it back at Phase 2.
//
// v1.0 read the score through require('fs'), which Apps Script does not have,
// so the value was 0 for the entire life of the feature. The bench fire proved
// the ABSENT path in situ (no key -> 0, no throw, 0 engine errors). These cases
// cover the three paths a bench fire cannot cheaply reach — loaded, stale, and
// malformed — because the staleness gate is the only new arithmetic and a
// silent 0 is exactly the failure this replaced.
// ===========================================================================
console.log('\n=== loadCivicVoiceSentiment_ v2.0 (engine.138 / G-PF18) ===');
(function () {
  var fs = require('fs'), path = require('path');
  var src = fs.readFileSync(path.resolve(__dirname, '../phase02-world-state/applyInitiativeImplementationEffects.js'), 'utf8');
  var start = src.indexOf('function loadCivicVoiceSentiment_');
  var end = src.indexOf('\nfunction ', start + 10);
  var fnSrc = src.slice(start, end === -1 ? undefined : end);

  function load(cfg, cycleId) {
    var logs = [];
    var scope = { Logger: { log: function (m) { logs.push(String(m)); } } };
    var factory = new Function('Logger', fnSrc + '\nreturn loadCivicVoiceSentiment_;');
    var fn = factory(scope.Logger);
    var ctx = { summary: { cycleId: cycleId }, config: cfg };
    fn(ctx);
    return { value: ctx.summary.civicVoiceSentiment, logs: logs.join(' | ') };
  }

  // Loaded — stamped for the engine's own cycle
  var r = load({ civicVoiceSentiment: 0.41, civicVoiceSentimentCycle: 106 }, 106);
  ok(r.value === 0.41, 'score stamped for the current cycle is loaded');
  ok(/Loaded sentiment 0\.41/.test(r.logs), 'load is logged with the value');

  // Loaded — one cycle behind: the civic close runs a cycle behind the fire
  r = load({ civicVoiceSentiment: 0.41, civicVoiceSentimentCycle: 105 }, 106);
  ok(r.value === 0.41, 'score stamped one cycle back is accepted (civic close lags the fire)');

  // Stale — two cycles back is refused, and says so with BOTH numbers
  r = load({ civicVoiceSentiment: 0.41, civicVoiceSentimentCycle: 104 }, 106);
  ok(r.value === 0, 'two-cycle-old score is REFUSED, not silently used');
  ok(/STALE/.test(r.logs) && /104/.test(r.logs) && /106/.test(r.logs),
    'stale refusal names the stamped cycle AND the engine cycle (a stalled civic chain must not read as a silent 0)');

  // Ahead-stamped — the UndockedFeed cycle+1 convention would land here
  r = load({ civicVoiceSentiment: 0.41, civicVoiceSentimentCycle: 107 }, 106);
  ok(r.value === 0 && /STALE/.test(r.logs), 'a score stamped AHEAD of the engine is refused, not trusted');

  // Never written — the state at first deploy, before any civic close
  r = load({}, 106);
  ok(r.value === 0, 'absent key defaults to 0');
  ok(/not set/.test(r.logs) && !/STALE/.test(r.logs), 'absent key logs distinctly from stale (different operator action)');

  // Malformed
  r = load({ civicVoiceSentiment: 'weather', civicVoiceSentimentCycle: 106 }, 106);
  ok(r.value === 0 && /not numeric/.test(r.logs), 'non-numeric score is refused and named');

  // No stamp at all
  r = load({ civicVoiceSentiment: 0.41 }, 106);
  ok(r.value === 0 && /STALE/.test(r.logs), 'score with no cycle stamp is refused (the pair travels together)');

  // Zero is a legitimate reading, not an absence
  r = load({ civicVoiceSentiment: 0, civicVoiceSentimentCycle: 106 }, 106);
  ok(r.value === 0 && /Loaded sentiment 0/.test(r.logs), 'a genuine 0.0 reading loads and logs as loaded, not as missing');

  // No cycle on the summary
  r = load({ civicVoiceSentiment: 0.41, civicVoiceSentimentCycle: 106 }, 0);
  ok(r.value === 0 && /no cycleId/.test(r.logs), 'missing cycleId refuses rather than guessing');
})();


console.log((fail === 0 ? 'ALL ' + pass + ' PASS' : fail + ' FAILURES / ' + pass + ' pass'));
process.exit(fail === 0 ? 0 : 1);