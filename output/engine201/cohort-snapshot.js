// engine.201 fixed-cohort proof snapshot (research-build 2026-10-08). Read-only: reads the live Simulation_Ledger and
// output/beats/Reflection_Intake.jsonl, writes only under output/engine201/.
//   node output/engine201/cohort-snapshot.js            -> draws the cohort, writes cohort-baseline.json (do NOT rerun: it redraws)
//   node output/engine201/cohort-snapshot.js --resnap   -> re-reads the SAME 48 POPIDs, writes cohort-c<cycle>.json
// Plan: docs/plans/2026-09-10-inactivity-is-regression.md §Fixed-cohort causal proof.
require('/root/GodWorld/lib/env');
const s=require('/root/GodWorld/lib/sheets');const fs=require('fs');
const getCycle=require('/root/GodWorld/lib/getCurrentCycle');
const h=(str)=>{let x=2166136261;for(const c of str){x^=c.charCodeAt(0);x=Math.imul(x,16777619)>>>0}return x};
(async()=>{
const CYCLE=getCycle({soft:true,noArgv:true});
const L=await s.getSheetAsObjects('Simulation_Ledger');
const wake={},last={};
for(const l of fs.readFileSync('/root/GodWorld/output/beats/Reflection_Intake.jsonl','utf8').split('\n').filter(Boolean)){const r=JSON.parse(l);wake[r.POPID]=(wake[r.POPID]||0)+1;last[r.POPID]=Math.max(last[r.POPID]||0,Number(r.Cycle)||0)}
const age=r=>2042-Number(r.BirthYear);
const band=a=>a<18?'<18':a<30?'18-29':a<45?'30-44':a<60?'45-59':a<75?'60-74':'75+';
const RESNAP=process.argv.includes('--resnap');
if(RESNAP){
  const base=JSON.parse(fs.readFileSync('/root/GodWorld/output/engine201/cohort-baseline.json','utf8'));
  const byId=Object.fromEntries(L.map(r=>[r.POPID,r]));
  const rows=base.cohort.map(b=>{const r=byId[b.popId];if(!r)return {popId:b.popId,missing:true};
    return {popId:b.popId,name:b.name,status:r.Status,age:age(r),neighborhood:r.Neighborhood,careerStage:r.CareerStage,role:r.RoleType,maritalStatus:r.MaritalStatus,numChildren:r.NumChildren,householdId:r.HouseholdId,employerBizId:r.EmployerBizId,income:r.Income,netWorth:r.NetWorth,debtLevel:r.DebtLevel,wealthLevel:r.WealthLevel,
    woken:!!wake[r.POPID],wakeCount:wake[r.POPID]||0,lastWakeCycle:last[r.POPID]||null,dialState:r.DialState,lifeHistoryLength:(r.LifeHistory||'').length,lifeHistoryTail:(r.LifeHistory||'').slice(-1800)}});
  fs.writeFileSync(`/root/GodWorld/output/engine201/cohort-c${CYCLE}.json`,JSON.stringify({cycle:CYCLE,of:'cohort-baseline.json',cohort:rows},null,1));
  console.log('resnap cycle',CYCLE,'n',rows.length,'missing',rows.filter(r=>r.missing).length);process.exit(0);
}
if(fs.existsSync('/root/GodWorld/output/engine201/cohort-baseline.json')){console.error('cohort-baseline.json exists - the cohort is fixed. Use --resnap.');process.exit(1);}
const pool=L.filter(r=>r.Status==='Active'&&r.POPID!=='POP-00005'&&r.DialState&&r.DialState.length>10);
const quota=[['1',true,5],['1',false,1],['2',true,5],['2',false,5],['3',true,7],['3',false,7],['4',true,9],['4',false,9]];
const dims={age:r=>band(age(r)),stage:r=>r.CareerStage,hood:r=>r.Neighborhood,clock:r=>r.ClockMode};
const seen={age:new Set(),stage:new Set(),hood:new Set(),clock:new Set()};
const chosen=[];
for(const [tier,woken,n] of quota){
  let cand=pool.filter(r=>r.Tier===tier&&(!!wake[r.POPID])===woken&&!chosen.includes(r));
  for(let i=0;i<n&&cand.length;i++){
    cand.sort((a,b)=>{const sc=r=>Object.keys(dims).reduce((t,k)=>t+(seen[k].has(dims[k](r))?0:1),0);return sc(b)-sc(a)||h(a.POPID)-h(b.POPID)});
    const p=cand.shift();chosen.push(p);for(const k in dims)seen[k].add(dims[k](p));
  }
}
const rows=chosen.map(r=>({popId:r.POPID,name:`${r.First} ${r.Last}`,tier:Number(r.Tier),age:age(r),ageBand:band(age(r)),neighborhood:r.Neighborhood,careerStage:r.CareerStage,clockMode:r.ClockMode,role:r.RoleType,maritalStatus:r.MaritalStatus,numChildren:r.NumChildren,householdId:r.HouseholdId,employerBizId:r.EmployerBizId,income:r.Income,netWorth:r.NetWorth,debtLevel:r.DebtLevel,wealthLevel:r.WealthLevel,
 woken:!!wake[r.POPID],wakeCount:wake[r.POPID]||0,lastWakeCycle:last[r.POPID]||null,
 dialState:r.DialState,lifeHistoryLength:(r.LifeHistory||'').length,lifeHistoryTail:(r.LifeHistory||'').slice(-1800)}));
const out={cycle:CYCLE,takenAt:'live ledger read, before the C111 fire',purpose:'engine.201 fixed-cohort causal proof (codex acceptance definition: condition -> personal response -> persistent change -> different later choice, including never-woken citizens). Baseline snapshot; re-snapshot after C111, C112, C113.',method:'48 Active citizens, POP-00005 excluded. Quota tier x woken (woken = at least one Reflection_Intake row as of this read): T1 5w+1n, T2 5+5, T3 7+7, T4 9+9. Within each quota, greedy pick maximizing new age band / career stage / neighborhood / ClockMode coverage, ties by FNV hash of POPID (deterministic).',
 coverage:{ageBands:[...seen.age],stages:[...seen.stage],hoods:seen.hood.size,clocks:[...seen.clock]},cohort:rows};
fs.writeFileSync('/root/GodWorld/output/engine201/cohort-baseline.json',JSON.stringify(out,null,1));
console.log('cycle',CYCLE,'n',rows.length,'woken',rows.filter(r=>r.woken).length);
console.log(JSON.stringify(out.coverage));
const cnt=(f)=>{const m={};rows.forEach(r=>{m[f(r)]=(m[f(r)]||0)+1});return m};
console.log(cnt(r=>'T'+r.tier+(r.woken?'w':'n')),cnt(r=>r.ageBand),cnt(r=>r.careerStage));
})();
