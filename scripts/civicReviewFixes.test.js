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
  write('output/beats/meta.json', JSON.stringify({cycle:999}));
  write('output/simulation_ledger_snapshot.meta.json', JSON.stringify({cycle:999}));
  write('output/beats/Reflection_Intake.jsonl', JSON.stringify({POPID:'POP-99901',Cycle:999,Tag:'Civic',Affect:'Angry',ReflectionExcerpt:'SYNTHETIC'}));
  write('output/simulation_ledger_snapshot.jsonl', JSON.stringify({POPID:'POP-99901',Neighborhood:'Coliseum',Status:'hospitalized'}));
  const result = slice.loadPetitionPool(root, office, ['East Oakland'], {offices:[]}, {coliseum:'East Oakland'});
  assert.equal(result.complaints.length, 1);
  assert.equal(result.complaints[0].hood, 'East Oakland');
  assert.equal(result.complaints[0].snippet, 'SYNTHETIC');
}));
test('R1 petition display includes current and two prior Cycles, labels both windows and excludes invalid/future rows', () => workspace((root, write) => {
  write('output/beats/meta.json', JSON.stringify({cycle:999}));
  write('output/simulation_ledger_snapshot.meta.json', JSON.stringify({cycle:999}));
  write('output/simulation_ledger_snapshot.jsonl', JSON.stringify({POPID:'POP-99901',Neighborhood:'East Oakland'}));
  write('output/beats/Reflection_Intake.jsonl', [996,997,998,999,1000,'bad'].map(Cycle => JSON.stringify({POPID:'POP-99901',Cycle,Tag:'Civic',Affect:'Angry',ReflectionExcerpt:'SYNTHETIC'})).join('\n'));
  const pool = slice.loadPetitionPool(root, office, ['East Oakland'], {offices:[]}, {},999);
  assert.deepEqual(pool.complaints.map(c=>Number(c.cycle)),[999,998,997]);
  assert.match(pool.text,/C997.*C999/);
  assert.match(pool.text,/counter.*C999 only/i);
  assert.equal(pool.invalidCycleRows,1);
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
test('F5 new records drop legacy action before wall rendering and preserve speech and accepted moves', () => {
  const mv = run.validateDatawakeMoves([{type:'answer',text:'SYNTHETIC answer'}], {office});
  const rec = run.datawakeRecord({office,cycle:999,date:'SYNTHETIC-date',answeredModel:'SYNTHETIC-model',
    j:{statement:'SYNTHETIC speech',action:'SYNTHETIC fabricated action',numberMoved:'SYNTHETIC signal'},mv});
  assert.equal(Object.hasOwn(rec, 'action'), false);
  assert.deepEqual(rec.moves, mv.accepted);
  const wall = require('./officeWall');
  assert.doesNotMatch(wall.lineFromDatawake(rec).text, /fabricated action/);
  assert.match(wall.lineFromDatawake(rec).text, /SYNTHETIC speech/);
  assert.match(wall.lineFromDatawake({statement:'historical synthetic',action:'legacy synthetic'}).text, /legacy synthetic/);
});
test('F6 prior terminal outcomes survive the Cycle boundary alongside current pending moves', () => workspace((root, write) => {
  const move = {moveId:'MV-SYNTHETIC',cycle:998,agentDir:office.agentDir,type:'work',payload:{initiativeId:'INIT-SYNTHETIC'},status:'pending',date:'SYNTHETIC'};
  write('output/cron-civic/moves/moves_c998.jsonl', [move,{...move,status:'failed',detail:'SYNTHETIC refusal'}].map(JSON.stringify).join('\n'));
  const blocks = () => slice.buildGameBlocks({root,cycle:999,office,officeMap:{offices:[]}}).lastMove;
  assert.match(blocks().text, /SYNTHETIC refusal/);
  write('output/cron-civic/moves/moves_c999.jsonl', JSON.stringify({...move,cycle:999,moveId:'MV-SYNTHETIC-NEW'}));
  assert.equal(blocks().moves.length, 2);
  assert.match(blocks().text, /awaiting the Sunday fold/);
  assert.match(blocks().text, /SYNTHETIC refusal/);
  write('output/cron-civic/moves/moves_c1000.jsonl', '{broken');
  assert.equal(blocks().moves.length, 2); // future evidence is never read
}));
test('F7 stalled phase takes precedence over every recognized Stage', () => {
  for (const Stage of ['Funded','Standing','Delivering']) {
    assert.match(slice.boardNeedText({Stage,ImplementationPhase:'stalled'}), /stalled/);
    assert.match(slice.boardNeedText({Stage,ImplementationPhase:'active'}), /requirements unavailable/);
  }
  assert.match(slice.boardNeedText({Status:'proposed',VoteCycle:''}), /petition-pending/);
});
test('F8 prompt caps narrative blocks without dropping legal IDs or mutating full pack evidence', () => {
  const entry = {snippet:'SYNTHETIC-RAW-HISTORY'.repeat(500)};
  const game = {boardIds:['INIT-SYNTHETIC-1','INIT-SYNTHETIC-2'],board:[entry],boardText:'SYNTHETIC board',
    lastMove:{text:'SYNTHETIC outcome',moves:Array(1000).fill(entry)},
    petitionPool:{available:true,text:'SYNTHETIC summary',complaints:Array(1000).fill(entry),participation:Array(1000).fill(entry)},
    interventions:{available:true,playable:[{key:'health-service'}],text:'X'.repeat(5000)}};
  const pack = {game};
  const prompt = run.datawakeUserPrompt(pack, '', office);
  assert.equal(prompt.includes('SYNTHETIC-RAW-HISTORY'), false);
  assert.match(prompt, /INIT-SYNTHETIC-2/);
  assert(prompt.length < 6000);
  assert.equal(game.petitionPool.complaints.length,1000);
  assert.equal(game.interventions.text.length,5000);
});
test('F8 board proposals show measured condition counts without enabling housing support', () => workspace((root, write) => {
  const audit = {cycle:999,snapshots:{Neighborhood_Map:[{Neighborhood:'East Oakland',ChildAreas:'Coliseum'}]}};
  write('output/engine_audit_c999.json',JSON.stringify(audit));
  write('output/beats/meta.json',JSON.stringify({cycle:999}));
  write('output/beats/Initiative_Tracker.jsonl',JSON.stringify({InitiativeID:'INIT-SYNTHETIC',ProposingOffice:office.officeId,Status:'proposed',PolicyDomain:'housing',AffectedNeighborhoods:'Coliseum'}));
  write('output/beats/Neighborhood_Demographics.jsonl',JSON.stringify({Neighborhood:'East Oakland',Students:10,Adults:20,Seniors:5,Sick:0}));
  write('output/beats/Household_Ledger.jsonl',JSON.stringify({HouseholdId:'HH-SYNTHETIC',Neighborhood:'Coliseum',Status:'active',HousingType:'rented',MonthlyRent:1000,HouseholdIncome:20000}));
  const game = slice.buildGameBlocks({root,cycle:999,office,officeMap:{offices:[]},hoods:['East Oakland'],audit});
  assert.equal(game.conditions.available,true);
  assert.equal(game.conditions.proposals[0].counts.hardshipHouseholds,1);
  assert.equal(game.conditions.proposals[0].support.cleared,false);
  assert.match(game.conditions.text,/domain-not-playable/);
}));
