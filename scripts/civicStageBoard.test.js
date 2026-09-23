'use strict';
// Synthetic, in-memory observations only; never writes canon or calls services.
const test = require('node:test');
const assert = require('node:assert/strict');
const slice = require('./buildCivicOfficeSlice');
const contract = require('../lib/initiativePhaseContract');

test('board uses shared Funded rule including the closing-Cycle equality boundary', () => {
  for (const LastWorkCycle of ['', 997, 998, 999]) {
    const row = { Stage:'Funded', ImplementationPhase:'announced', PolicyDomain:'health', LastWorkCycle, LastStageChangeCycle:998 };
    const expected = contract.stageRequirement({stage:row.Stage,phase:row.ImplementationPhase,policyDomain:row.PolicyDomain,
      lastWorkCycle:LastWorkCycle,lastStageChangeCycle:998});
    assert.equal(slice.boardNeedText(row), expected.text);
  }
});
test('board preserves legacy advice, negative-phase priority and unplayable gate text', () => {
  assert.match(slice.boardNeedText({Status:'proposed',VoteCycle:''}), /petition-pending/);
  for (const phase of ['stalled','blocked','suspended','defunded']) {
    const row = {Stage:'Funded',ImplementationPhase:phase};
    assert.equal(slice.boardNeedText(row),contract.stageRequirement({stage:'Funded',phase}).text);
  }
  // housing off the list again — engine.255 budgeted disbursement has a real
  // delivering gate (flagged-at-vote cohort, Task 7 pair 2026-09-22).
  for (const PolicyDomain of ['safety','economic','workforce','sports']) {
    assert.match(slice.boardNeedText({Stage:'Standing',PolicyDomain}), /no delivering gate/);
  }
  assert.match(slice.boardNeedText({Stage:'Standing',PolicyDomain:'health'}), /metric evidence unavailable/);
});

function fixture() {
  const hoods=['SYNTHETIC-A','SYNTHETIC-B','SYNTHETIC-C'];
  const audit = cycle => ({cycle,snapshots:{
    Neighborhood_Map:hoods.map((Neighborhood,i)=>({Neighborhood,ChildAreas:i===0?'SYNTHETIC-child':'',Cycle:cycle})),
    Neighborhood_Demographics:hoods.map((Neighborhood,i)=>({Neighborhood,LastUpdated:cycle,Sick:i===0?5:10})),
  }});
  const row = {InitiativeID:'INIT-SYNTHETIC',Stage:'Standing',ImplementationPhase:'operational',PolicyDomain:'health',
    AffectedNeighborhoods:'SYNTHETIC-child',StageBaseline:JSON.stringify({v:1,origin:'conversion',cycle:995,
      tab:'Neighborhood_Demographics',columns:['Sick'],scope:'hood',keys:{'SYNTHETIC-A':{Sick:10}},cityMiddle:{Sick:10}})};
  return {row,context:{cycle:999,readAudit:audit,config:{civicDeliverMargin:0.2,civicDeliverHoldCycles:3}}};
}
test('board caller computes held city-relative movement and preserves the shared requirement result', () => {
  const {row,context}=fixture();
  const board=slice.boardRowsFor({officeId:'MAYOR-01'},[row],{},context)[0];
  assert.equal(board.requirement.clears,true);
  assert.equal(board.requirement.next,'Delivering');
  assert.equal(board.metricEvidence.available,true);
  assert.equal(board.metricEvidence.metricMoved,true);
});
test('one below-margin observation breaks the consecutive hold', () => {
  const {row,context}=fixture(); const read=context.readAudit;
  context.readAudit=c=>{const a=read(c); if(c===998)a.snapshots.Neighborhood_Demographics[0].Sick=9; return a;};
  const board=slice.boardRowsFor({officeId:'MAYOR-01'},[row],{},context)[0];
  assert.equal(board.metricEvidence.available,true); assert.equal(board.requirement.clears,false);
});
test('missing dials, stale or invalid observations and changed cohorts state absence', () => {
  for(const mutate of [
    f=>{f.context.config={};},
    f=>{f.context.readAudit=()=>null;},
    f=>{const read=f.context.readAudit;f.context.readAudit=c=>({...read(c),cycle:c-1});},
    f=>{f.row.StageBaseline='{bad';},
    f=>{const b=JSON.parse(f.row.StageBaseline);b.cycle=998;f.row.StageBaseline=JSON.stringify(b);},
    f=>{f.row.AffectedNeighborhoods='SYNTHETIC-B';},
    f=>{const read=f.context.readAudit;f.context.readAudit=c=>{const a=read(c);a.snapshots.Neighborhood_Demographics[1].Sick='';return a;};},
  ]) {
    const f=fixture(); mutate(f);
    const b=slice.boardRowsFor({officeId:'MAYOR-01'},[f.row],{},f.context)[0];
    assert.equal(b.metricEvidence.available,false);assert.equal(b.requirement.clears,false);
    assert.match(b.needsNext,/metric evidence unavailable/);
  }
});
test('raw health improvement without relative improvement is insufficient', () => {
  const {row,context}=fixture();
  const read=context.readAudit;
  context.readAudit=c=>{const a=read(c);a.snapshots.Neighborhood_Demographics.forEach(r=>{r.Sick=5;});return a;};
  const board=slice.boardRowsFor({officeId:'MAYOR-01'},[row],{},context)[0];
  assert.equal(board.metricEvidence.available,true);assert.equal(board.requirement.clears,false);
});
test('missing shared helper reports a stated absence instead of a locally invented stage rule', () => {
  const original=contract.stageRequirement;
  try {contract.stageRequirement=undefined;assert.match(slice.boardNeedText({Stage:'Funded'}),/requirements unavailable/);}
  finally {contract.stageRequirement=original;}
});
test('health reads LastUpdated and requires a downward city-relative change', () => {
  const {row,context}=fixture();
  const board=slice.boardRowsFor({officeId:'MAYOR-01'},[row],{},context)[0];
  assert.equal(board.metricEvidence.available,true);assert.equal(board.requirement.clears,true);
  const read=context.readAudit;
  context.readAudit=c=>{const a=read(c);a.snapshots.Neighborhood_Demographics[0].Sick=15;return a;};
  assert.equal(slice.boardRowsFor({officeId:'MAYOR-01'},[row],{},context)[0].requirement.clears,false);
  context.readAudit=c=>{const a=read(c);a.snapshots.Neighborhood_Demographics[0].LastUpdated=c-1;return a;};
  assert.equal(slice.boardRowsFor({officeId:'MAYOR-01'},[row],{},context)[0].metricEvidence.available,false);
});

function measuredHealthFixture() {
  const f=fixture(); const read=f.context.readAudit;
  f.row.PolicyDomain=' HEALTH ';
  const b=JSON.parse(f.row.StageBaseline);b.keys['SYNTHETIC-A'].Sick=100;b.cityMiddle.Sick=100;
  f.row.StageBaseline=JSON.stringify(b);
  f.context.readAudit=c=>{const a=read(c);a.snapshots.Neighborhood_Demographics.forEach((r,i)=>{r.Sick=i===0?82:100;});return a;};
  return f;
}
test('domain margin overrides the default; absent override uses the default', () => {
  const {row,context}=measuredHealthFixture();
  const measure=()=>slice.boardRowsFor({officeId:'MAYOR-01'},[row],{},context)[0].metricEvidence;
  assert.equal(measure().metricMoved,false);assert.equal(measure().margin,0.2);
  context.config.civicDeliverMargin_health='0.15';
  assert.equal(measure().metricMoved,true);assert.equal(measure().margin,0.15);
  delete context.config.civicDeliverMargin;
  assert.equal(measure().available,true);assert.equal(measure().metricMoved,true);
  context.config.civicDeliverMargin_health=0;
  assert.equal(measure().available,true);assert.equal(measure().margin,0);
});
test('invalid domain margins fail closed instead of silently using the default', () => {
  for (const value of ['',null,'bad',-1,Infinity]) {
    const {row,context}=measuredHealthFixture();context.config.civicDeliverMargin_health=value;
    const evidence=slice.boardRowsFor({officeId:'MAYOR-01'},[row],{},context)[0].metricEvidence;
    assert.equal(evidence.available,false);assert.equal(evidence.metricMoved,false);
  }
});
test('domain margin selection is isolated to the row domain', () => {
  const {row,context}=fixture();row.PolicyDomain='education';
  const b=JSON.parse(row.StageBaseline);b.columns=['SchoolQualityIndex'];
  b.keys={'SYNTHETIC-A':{SchoolQualityIndex:50}};b.cityMiddle={SchoolQualityIndex:50};row.StageBaseline=JSON.stringify(b);
  const read=context.readAudit;
  context.readAudit=c=>{const a=read(c);a.snapshots.Neighborhood_Demographics.forEach((r,i)=>{r.SchoolQualityIndex=i===0?59:50;});return a;};
  context.config.civicDeliverMargin_health=0.15;
  const measure=()=>slice.boardRowsFor({officeId:'MAYOR-01'},[row],{},context)[0].metricEvidence;
  assert.equal(measure().available,true);assert.equal(measure().metricMoved,false);assert.equal(measure().margin,0.2);
  context.config.civicDeliverMargin_education=0.17;
  assert.equal(measure().metricMoved,true);assert.equal(measure().margin,0.17);
});
test('actual pack builder supplies local observations; corrupt optional config preserves the board', () => {
  const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'civic-stage-synthetic-'));
  const write=(p,s)=>{const file=path.join(root,p);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,s);};
  try {
    const {row,context}=measuredHealthFixture();
    context.config.civicDeliverMargin_health=0.15;
    write('output/beats/meta.json',JSON.stringify({cycle:999}));
    write('output/beats/Initiative_Tracker.jsonl',JSON.stringify(row));
    write('output/beats/World_Config.jsonl',Object.entries(context.config).map(([Key,Value])=>JSON.stringify({Key,Value})).join('\n'));
    for(const c of [997,998])write('output/engine_audit_c'+c+'.json',JSON.stringify(context.readAudit(c)));
    const opts={root,cycle:999,office:{officeId:'MAYOR-01',agentDir:'SYNTHETIC-seat'},officeMap:{offices:[]},hoods:[],audit:context.readAudit(999)};
    const game=slice.buildGameBlocks(opts);
    assert.equal(game.boardAvailable,true);assert.equal(game.board[0].requirement.clears,true);
    write('output/beats/World_Config.jsonl','{bad');
    const degraded=slice.buildGameBlocks(opts);
    assert.equal(degraded.boardAvailable,true);assert.equal(degraded.board[0].requirement.clears,false);
    assert.match(degraded.board[0].needsNext,/metric evidence unavailable.*World_Config/);
  } finally {fs.rmSync(root,{recursive:true,force:true});}
});
