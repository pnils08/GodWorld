/**
 * storylineWeavingEngine.chaos.test.js — engine.11 T5.4 chaos arc creation coverage. Node-only.
 * Run: node phase07-evening-media/storylineWeavingEngine.chaos.test.js
 */
'use strict';

let appends = [];
global.queueAppendIntent_ = (ctx, tab, row, reason, domain) => appends.push({ tab, row, reason, domain });
global.Logger = { log: () => {} };

const mod = require('./storylineWeavingEngine');

let passed = 0, failed = 0;
function assert(label, cond, detail) {
  if (cond) { console.log(`  ok   ${label}`); passed++; }
  else { console.error(`  FAIL ${label}${detail ? ': ' + detail : ''}`); failed++; }
}

console.log('Test: createChaosArcs_ appends one 26-col active arc per Tier-1 chaos event');
{
  appends = [];
  const ctx = {
    config: { cycleCount: 99 },
    summary: {
      tier1ChaosEvents: [
        { eventId: 'abc12345', vehicleType: 'cop_car', diceOutcome: 'arrested', targetId: 'POP-00001', narrativeSeed: 'An arrest on the block.' },
        { eventId: 'def67890', vehicleType: 'ambulance', diceOutcome: 'medical_emergency', targetId: 'POP-00042', narrativeSeed: '' }
      ]
    }
  };
  const n = mod.createChaosArcs_(ctx);
  assert('returns count 2', n === 2);
  assert('2 Storyline_Tracker appends queued', appends.length === 2 && appends.every(a => a.tab === 'Storyline_Tracker'));
  const r = appends[0].row;
  assert('row is 26 cols', r.length === 26);
  assert('CycleAdded=99', r[1] === 99);
  assert('StorylineType=chaos_cascade', r[2] === 'chaos_cascade');
  assert('RelatedCitizens=primaryActor', r[5] === 'POP-00001');
  assert('Status=active', r[7] === 'active');
  assert('StorylineId=chaos-{eventId}', r[14] === 'chaos-abc12345');
  assert('Description names source chaos_cars', /chaos_cars/.test(r[3]));
  assert('StaleAfterCycles set (Q3 mitigation)', r[22] === 6);
  assert('ResolutionCondition present', typeof r[21] === 'string' && r[21].length > 0);
}

console.log('\nTest: no Tier-1 events → no arcs');
{
  appends = [];
  assert('empty tier1 → 0', mod.createChaosArcs_({ config: { cycleCount: 99 }, summary: { tier1ChaosEvents: [] } }) === 0);
  assert('missing tier1 → 0', mod.createChaosArcs_({ config: { cycleCount: 99 }, summary: {} }) === 0);
  assert('no appends', appends.length === 0);
}

console.log('\n' + '─'.repeat(60));
if (failed === 0) { console.log(`✓ all ${passed} assertions passed`); process.exit(0); }
else { console.error(`✗ ${failed}/${passed + failed} failed`); process.exit(1); }
