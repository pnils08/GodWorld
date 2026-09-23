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
const confrontation = {id:'CONF-999-'+office.agentDir,cycle:999,agentDir:office.agentDir};
function workspace(fn) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'civic-review-synthetic-'));
  const write = (file, value) => { const dest = path.join(root, file); fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.writeFileSync(dest, value); };
  try { fn(root, write); } finally { fs.rmSync(root, { recursive: true, force: true }); }
}
test('F1 inherited and malformed interventions cannot consume the valid move', () => {
  const proposal = intervention => ({ type: 'propose', intervention, title: 'SYNTHETIC', problem: 'SYNTHETIC', hoods: ['East Oakland'], budget: '$20M' });
  const malformed = { ...catalog, broken: { policyDomain: 'health' }, shape: { playable: true, policyDomain: 'health' } };
  // housing-program dropped from this list — it flipped playable:true (engine.251,
  // builder-ruled rate 0.20/margin 0.15, 2026-09-22), so it's no longer an
  // unplayable-intervention rejection case; safety-program stays a live example.
  for (const key of ['constructor', 'toString', '__proto__', ['health-service'], 'broken', 'shape', 'safety-program']) {
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
test('R4 working city selects latest per staff member before spending its character budget', () => workspace((root, write) => {
  write('output/beats/meta.json',JSON.stringify({cycle:999}));
  const row = (POPID,Cycle,Timestamp,ReflectionExcerpt) => ({POPID,Cycle,Timestamp,Daypart:'work',ReflectionExcerpt});
  write('output/beats/Reflection_Intake.jsonl', [
    row('POP-99901',999,'01','SYNTHETIC older'), row('POP-99901',999,'02','SYNTHETIC newest'),
    row('POP-99901',998,'99','SYNTHETIC prior'), row('POP-99901',1000,'99','SYNTHETIC future'),
    row('POP-99902',999,'01','SYNTHETIC second'), row('POP-99903',999,'01','SYNTHETIC third'),
    row('POP-99904',999,'01','SYNTHETIC fourth'), row('POP-99905',999,'01','SYNTHETIC fifth')
  ].map(JSON.stringify).join('\n'));
  const officeMap={projects:Array.from({length:5},(_,i)=>({projectId:'SYNTHETIC-'+i,popid:'POP-9990'+(i+1),holder:'SYNTHETIC staff '+i}))};
  const result=slice.loadWorkingCity(root,999,officeMap);
  assert.match(result.text,/SYNTHETIC newest/);
  assert.doesNotMatch(result.text,/SYNTHETIC (older|prior|future)/);
  assert.match(result.text,/SYNTHETIC fifth/);
  assert(result.text.length<=slice.BLOCK_CAP);
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
  const moves = run.validateDatawakeMoves([{type:'canvass',hood:'East Oakland'},{type:'answer',confrontationId:confrontation.id,text:'SYNTHETIC'}],
    {office,cycle:999,confrontations:[confrontation],geographyIssue:'ambiguous-map'});
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
  const mv = run.validateDatawakeMoves([{type:'answer',confrontationId:confrontation.id,text:'SYNTHETIC answer'}], {office,cycle:999,confrontations:[confrontation]});
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
    assert.equal(slice.boardNeedText({Stage,ImplementationPhase:'active'}),
      require('../lib/initiativePhaseContract').stageRequirement({stage:Stage,phase:'active'}).text);
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
test('R3 unanswered directives persist, answers bind Cycle and seat, and a second accepted answer is refused', () => workspace((root, write) => {
  const directive = (seat, text) => '## SYNTHETIC demand\n- **Agent:** `.claude/agents/'+seat+'/`\n- **Address:** '+text+'\n';
  write('output/mara-directives/mara_directive_c997_AUTO.txt',directive(office.agentDir,'SYNTHETIC prior'));
  write('output/mara-directives/mara_directive_c998_AUTO.txt',directive('SYNTHETIC-other','SYNTHETIC other'));
  write('output/mara-directives/mara_directive_c999_AUTO.txt',directive(office.agentDir,'SYNTHETIC current'));
  const oldId='CONF-997-'+office.agentDir;
  assert.equal(slice.loadConfrontation(root,999,office.agentDir).id,oldId);
  const priorAnswer={moveId:'MV-SYNTHETIC-ANSWER',cycle:998,agentDir:office.agentDir,type:'answer',payload:{confrontationId:oldId},status:'pending'};
  write('output/cron-civic/moves/moves_c998.jsonl',JSON.stringify(priorAnswer));
  const state=slice.loadConfrontations(root,999,office.agentDir);
  assert.deepEqual(state.open.map(c=>c.id),[confrontation.id]);
  assert.equal(slice.loadConfrontation(root,999,office.agentDir).id,confrontation.id);
  const answer=confrontationId=>({type:'answer',confrontationId,text:'SYNTHETIC reply'});
  const ctx={office,cycle:999,confrontations:state.open,answeredConfrontationIds:new Set(state.answeredIds)};
  const result=run.validateDatawakeMoves([answer(oldId),answer('CONF-999-SYNTHETIC-other'),answer(confrontation.id)],ctx);
  assert.equal(result.rejected.length,2);
  assert.match(result.rejected[0].reason,/already-answered/);
  assert.equal(result.accepted[0].payload.directiveCycle,999);
  assert.equal(result.accepted[0].payload.confrontationSeat,office.agentDir);
  assert.equal(run.validateDatawakeMoves([answer(confrontation.id)],{office,cycle:999}).accepted.length,0);
  write('output/cron-civic/moves/moves_c999.jsonl',JSON.stringify({...priorAnswer,cycle:999,moveId:'MV-SYNTHETIC-NEW',payload:{confrontationId:confrontation.id}}));
  assert.equal(slice.loadConfrontation(root,999,office.agentDir),null);
}));
test('R2 passed-over problems require prior visible evidence and an empty closed-Cycle ledger; current relief or landed hood work resolves them', () => workspace((root, write) => {
  const audit={cycle:999,snapshots:{Neighborhood_Map:[{Neighborhood:'East Oakland',ChildAreas:'Coliseum'}]}};
  write('output/engine_audit_c999.json',JSON.stringify(audit));
  write('output/beats/meta.json',JSON.stringify({cycle:999}));
  write('output/beats/Neighborhood_Demographics.jsonl',JSON.stringify({Neighborhood:'East Oakland',Students:10,Adults:20,Seniors:5,Sick:0}));
  write('output/beats/Hospital_Ledger.jsonl','');
  write('output/beats/Crime_Metrics.jsonl',JSON.stringify({Neighborhood:'East Oakland',ViolentLevel:1}));
  const home={HouseholdId:'HH-SYNTHETIC',Neighborhood:'Coliseum',Status:'active',HousingType:'rented',MonthlyRent:1000,HouseholdIncome:20000};
  write('output/beats/Household_Ledger.jsonl',JSON.stringify(home));
  write('output/beats/Initiative_Tracker.jsonl',JSON.stringify({InitiativeID:'INIT-SYNTHETIC',ProposingOffice:office.officeId,AffectedNeighborhoods:'Coliseum'}));
  const blocks=()=>slice.buildGameBlocks({root,cycle:999,office,officeMap:{offices:[]},hoods:['East Oakland'],audit});
  const first=blocks().problemContinuity;
  assert.equal(first.passedOver.length,0);
  assert.equal(first.visibleProblems[0].conditionKey,'housing.hardshipHouseholds');
  write('output/cron-civic/packs/COUNCIL-D5_c998.json',JSON.stringify({actor:{officeId:office.officeId,agentDir:office.agentDir},game:{board:blocks().board,problemContinuity:{cycle:998,visibleProblems:first.visibleProblems}}}));
  assert.equal(blocks().problemContinuity.passedOver.length,0); // missing ledger is not proof of inaction
  write('output/cron-civic/moves/moves_c998.jsonl','');
  assert.equal(blocks().problemContinuity.passedOver.length,1);
  assert.match(blocks().problemContinuity.text,/passed over C998/);
  const m={moveId:'MV-SYNTHETIC-WORK',cycle:998,agentDir:office.agentDir,type:'work',payload:{initiativeId:'INIT-SYNTHETIC'},status:'applied'};
  write('output/cron-civic/moves/moves_c998.jsonl',JSON.stringify(m));
  assert.equal(blocks().problemContinuity.passedOver.length,0);
  write('output/cron-civic/moves/moves_c998.jsonl','');
  write('output/beats/Household_Ledger.jsonl',JSON.stringify({...home,MonthlyRent:100}));
  assert.equal(blocks().problemContinuity.passedOver.length,0);
  assert.equal(blocks().problemContinuity.problems.length,0);
}));
test('R2 each move type addresses only evidenced hoods; pending proposals, rejected moves and missing readings cannot fabricate resolution', () => {
  const {deriveProblemContinuity:derive}=require('./civicProblemContinuity');
  const data={cycle:999,Neighborhood_Map:[{Neighborhood:'East Oakland',ChildAreas:'Coliseum'},{Neighborhood:'West Oakland',ChildAreas:''}],
    Neighborhood_Demographics:['East Oakland','West Oakland'].map(Neighborhood=>({Neighborhood,Students:1,Adults:2,Seniors:1,Sick:0})),
    Household_Ledger:[{HouseholdId:'HH-SYNTHETIC',Neighborhood:'East Oakland',Status:'active',HousingType:'rented',MonthlyRent:1000,HouseholdIncome:20000}],
    Hospital_Ledger:[],Crime_Metrics:['East Oakland','West Oakland'].map(Neighborhood=>({Neighborhood,ViolentLevel:1}))};
  const old={cycle:998,visibleProblems:[{hood:'East Oakland',conditionKey:'housing.hardshipHouseholds',count:1}]};
  const args={data,hoods:['East Oakland'],previousPacks:[{game:{problemContinuity:old}}],moves:[],
    trackerRows:[{InitiativeID:'INIT-SYNTHETIC',AffectedNeighborhoods:'Coliseum'}],
    directives:[{...confrontation,sourceText:'SYNTHETIC demand for Coliseum'}],closedLedgerCycles:new Set([998]),agentDir:office.agentDir};
  const m=(type,payload,status='pending',cycle=999)=>({moveId:'MV-SYNTHETIC',type,payload,status,cycle,agentDir:office.agentDir});
  const result=move=>derive({...args,moves:[move]});
  assert.equal(result(m('propose',{hoods:['Coliseum']},'pending',998)).passedOver.length,0);
  assert.equal(result(m('propose',{hoods:['Coliseum']})).passedOver.length,1);
  assert.equal(result(m('propose',{hoods:['Coliseum']},'applied')).passedOver.length,0);
  assert.equal(result(m('propose',{hoods:['West Oakland']},'applied')).passedOver.length,1);
  assert.equal(result(m('canvass',{hood:'Coliseum'})).passedOver.length,0);
  assert.equal(result(m('canvass',{hood:'Coliseum'},'rejected',998)).passedOver.length,1);
  assert.equal(result(m('work',{initiativeId:'INIT-SYNTHETIC'},'applied')).passedOver.length,0);
  assert.equal(result(m('answer',{confrontationId:confrontation.id})).passedOver.length,0);
  assert.equal(result(m('answer',{confrontationId:'CONF-999-SYNTHETIC-other',hoods:['Coliseum']})).passedOver.length,1);
  const unknown=result(m('work',{initiativeId:'INIT-SYNTHETIC'},'applied',998));
  assert.equal(unknown.available,false); // no historical board to locate this work
  const missing=derive({...args,data:{...data,Household_Ledger:null}});
  assert.equal(missing.available,false);
  assert.match(missing.text,/readings unavailable/);
  assert(missing.text.length<=600);
});
