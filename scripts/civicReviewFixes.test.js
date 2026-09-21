'use strict';
// Synthetic local fixtures only; no cron entrypoint, model call or external writes.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const run = require('./cron-civic-run');
const slice = require('./buildCivicOfficeSlice');
const { INTERVENTION_CATALOG: catalog } = require('../lib/initiativePhaseContract');
const office = { officeId: 'COUNCIL-D5', agentDir: 'SYNTHETIC-seat', district: 'D5' };
function workspace(fn) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'civic-review-synthetic-'));
  const write = (file, value) => { const dest = path.join(root, file); fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.writeFileSync(dest, value); };
  try { fn(root, write); } finally { fs.rmSync(root, { recursive: true, force: true }); }
}
test('F1 inherited and malformed interventions cannot consume the valid move', () => {
  const proposal = intervention => ({ type: 'propose', intervention, title: 'SYNTHETIC', problem: 'SYNTHETIC', hoods: ['East Oakland'] });
  const malformed = { ...catalog, broken: { policyDomain: 'health' }, shape: { playable: true, policyDomain: 'health' } };
  for (const key of ['constructor', 'toString', '__proto__', ['health-service'], 'broken', 'shape', 'housing-program']) {
    const result = run.validateDatawakeMoves([proposal(key), proposal('health-service')], { office, catalog: malformed });
    assert.equal(result.rejected.length, 1);
    assert.equal(result.accepted[0].payload.intervention, 'health-service');
  }
});
test('F3 petition join folds child areas and needs no display name or active status', () => workspace((root, write) => {
  write('output/beats/Reflection_Intake.jsonl', JSON.stringify({POPID:'POP-99901',Cycle:999,Tag:'Civic',Affect:'Angry',ReflectionExcerpt:'SYNTHETIC'}));
  write('output/simulation_ledger_snapshot.jsonl', JSON.stringify({POPID:'POP-99901',Neighborhood:'Coliseum',Status:'hospitalized'}));
  const result = slice.loadPetitionPool(root, office, ['East Oakland'], {offices:[]}, {coliseum:'East Oakland'});
  assert.equal(result.complaints.length, 1);
  assert.equal(result.complaints[0].hood, 'East Oakland');
  assert.equal(result.complaints[0].snippet, 'SYNTHETIC');
}));
test('F4 corrupt rows and ambiguous geography cannot produce partial authority', () => workspace((root, write) => {
  write('broken.jsonl', '{"InitiativeID":"SYNTHETIC"}\n{broken');
  assert.throws(() => slice.readJsonl(path.join(root, 'broken.jsonl')), /:2:/);
  assert.throws(() => slice.childToParentFromAudit({}), /Neighborhood_Map/);
  assert.throws(() => slice.childToParentFromAudit({snapshots:{Neighborhood_Map:[
    {Neighborhood:'West Oakland',ChildAreas:'SYNTHETIC-child'},
    {Neighborhood:'East Oakland',ChildAreas:'SYNTHETIC-child'}
  ]}}), /multiple parents/);
}));
test('F4 stale board and citizen snapshots are unavailable, not empty evidence', () => workspace((root, write) => {
  const audit = {cycle:999,snapshots:{Neighborhood_Map:[{Neighborhood:'East Oakland',ChildAreas:'Coliseum'}]}};
  write('output/beats/meta.json', JSON.stringify({cycle:998}));
  write('output/beats/Initiative_Tracker.jsonl', JSON.stringify({InitiativeID:'INIT-SYNTHETIC',ProposingOffice:office.officeId}));
  let game = slice.buildGameBlocks({root,cycle:999,office,officeMap:{offices:[]},hoods:['East Oakland'],audit});
  assert.equal(game.boardAvailable, false);
  assert.match(game.boardText, /cycle/i);
  assert.deepEqual(game.boardIds, []);
  write('output/beats/meta.json', JSON.stringify({cycle:999}));
  write('output/beats/Reflection_Intake.jsonl', '{}');
  write('output/simulation_ledger_snapshot.jsonl', '{}');
  write('output/simulation_ledger_snapshot.meta.json', JSON.stringify({cycle:998}));
  game = slice.buildGameBlocks({root,cycle:999,office,officeMap:{offices:[]},hoods:['East Oakland'],audit});
  assert.equal(game.boardAvailable, true);
  assert.equal(game.petitionPool.available, false);
  assert.match(game.petitionPool.text, /cycle/i);
  const moves = run.validateDatawakeMoves([{type:'canvass',hood:'East Oakland'},{type:'answer',text:'SYNTHETIC'}],
    {office,geographyIssue:'ambiguous-map'});
  assert.match(moves.rejected[0].reason, /ambiguous-map/);
  assert.equal(moves.accepted[0].type, 'answer');
}));
test('F4 fallback audits must match the requested Cycle and office overrides cannot change authority', () => workspace((root, write) => {
  write('output/engine_audit.json', JSON.stringify({cycle:998}));
  assert.throws(() => slice.loadAudit(root, 999), /cycle mismatch/);
  write('output/engine_audit.json', JSON.stringify({cycle:999}));
  assert.equal(slice.loadAudit(root, 999).cycle, 999);
  const audit = {cycle:999,snapshots:{Neighborhood_Map:[{Neighborhood:'East Oakland',ChildAreas:'Coliseum'}]}};
  const game = slice.buildGameBlocks({root,cycle:999,office:{...office,neighborhoods:['West Oakland']},officeMap:{offices:[]},audit});
  assert.match(game.geographyIssue, /turf disagrees/);
}));
