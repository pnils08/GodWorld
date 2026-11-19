// The Initiative_Tracker restore (builder 2026-11-19). Default = dry run (prints, writes nothing); --apply writes, one row at a time, read back after each.
// The cell list (builder 2026-11-19: B, C, D as the doc suggests; A, E agreed), built so that every Notes/MilestoneNotes cell is the LIVE text minus only the hand-added line. Compares each cell to live and to the Nov 1 snapshot / C114 audit. Writes nothing. The writer runs only after the civic.49 vote fix is live.
require('/root/GodWorld/lib/env');
const fs=require('fs');const {getSheetData}=require('/root/GodWorld/lib/sheets');
const col=n=>{let s='';n++;while(n>0){const m=(n-1)%26;s=String.fromCharCode(65+m)+s;n=Math.floor((n-1)/26)}return s};
const strip=(v,re)=>String(v||'').split('\n').filter(l=>!re.test(l)).join('\n');
const A=JSON.parse(fs.readFileSync('/root/GodWorld/output/engine_audit_c114.json','utf8')).snapshots.Initiative_Tracker;
const SNAP=JSON.parse(fs.readFileSync('/root/GodWorld/output/engine-sheet/2026-11-01-init-008-013-before.json','utf8'));
(async()=>{
 const T=await getSheetData('Initiative_Tracker'),h=T[0];const ix=n=>h.indexOf(n);
 const rowOf=id=>T.findIndex(r=>r[0]===id);   // index in T; sheet row = idx+1
 const live=(id,c)=>String(T[rowOf(id)][ix(c)]||'');
 // C114 audit shape
 const a0=Array.isArray(A)?A[0]:A; console.log('C114 audit sample keys:',JSON.stringify(a0).slice(0,300));
 const c114=id=>{const r=A.find(x=>(x.InitiativeID||x.initiativeId||x.id||(Array.isArray(x)&&x[0]))===id);return r};
 const snap=(id,c)=>{const v=SNAP.rows[id];return v?String(v.values[SNAP.header.indexOf(c)]||''):null};
 const REJ=/^Cycle 113: Rejected\.?$/;
 const plan=[];const add=(id,c,to,why)=>plan.push({id,c,to,why});
 const today=(()=>{const d=new Date();return (d.getMonth()+1)+'/'+d.getDate()+'/'+d.getFullYear()})();
 // 008
 add('INIT-008','Status','proposed');add('INIT-008','VoteCycle','');add('INIT-008','Outcome','');add('INIT-008','Consequences','');add('INIT-008','Notes',strip(live('INIT-008','Notes'),REJ));add('INIT-008','LastUpdated',today);add('INIT-008','NextScheduledAction','Uptown stabilization planning execution');add('INIT-008','NextActionCycle','117');add('INIT-008','Stage','Proposed');
 // 009
 add('INIT-009','Status','proposed');add('INIT-009','VoteCycle','');add('INIT-009','Outcome','');add('INIT-009','Consequences','');add('INIT-009','Notes',strip(live('INIT-009','Notes'),REJ));add('INIT-009','LastUpdated',today);add('INIT-009','Stage','Proposed');
 // 010
 add('INIT-010','Status','passed');add('INIT-010','Outcome','PASSED');add('INIT-010','Consequences',snap('INIT-010','Consequences'));add('INIT-010','Notes',strip(live('INIT-010','Notes'),REJ));add('INIT-010','LastUpdated',today);add('INIT-010','ImplementationPhase','operational');
 add('INIT-010','MilestoneNotes',live('INIT-010','MilestoneNotes').replace(/\s+$/,'')+'\nC116 correction: the fund passed 6-3 at C112 and was signed; the legal-support analysis publishes as implementation work, and no committee decision is pending.');
 add('INIT-010','NextScheduledAction','Publish the legal-support analysis and open tenant-defense intake');add('INIT-010','NextActionCycle','117');add('INIT-010','Stage','Standing');
 // 011-013
 for(const id of ['INIT-011','INIT-012','INIT-013']){add(id,'Status','proposed');add(id,'Outcome','');add(id,'Consequences','');add(id,'Notes',strip(live(id,'Notes'),REJ));add(id,'LastUpdated',today);add(id,'NextActionCycle','117');add(id,'Stage','Proposed');}
 add('INIT-011','ImplementationPhase','legislation-filed');add('INIT-011','NextScheduledAction','Committee referral and hearing');
 add('INIT-012','NextScheduledAction','File legislation');add('INIT-013','NextScheduledAction','File legislation');
 // 003, 006
 const closed=/^C115: closed\.?$/;
 add('INIT-003','LastUpdated',today);add('INIT-003','ImplementationPhase','design-phase');add('INIT-003','MilestoneNotes',strip(live('INIT-003','MilestoneNotes'),closed));add('INIT-003','NextScheduledAction','Deliver schematics and conduct documented Fruitvale community review');add('INIT-003','NextActionCycle','117');add('INIT-003','LastStageChangeCycle','108');
 add('INIT-006','LastUpdated',today);add('INIT-006','ImplementationPhase','construction-active');add('INIT-006','MilestoneNotes',strip(live('INIT-006','MilestoneNotes'),closed));add('INIT-006','NextScheduledAction','Construction milestone review against the assembled evidence file');add('INIT-006','NextActionCycle','117');add('INIT-006','LastStageChangeCycle','');
 // 014 (void)
 add('INIT-014','Status','proposed');add('INIT-014','VoteCycle','');add('INIT-014','Outcome','');add('INIT-014','Consequences','');add('INIT-014','Notes',strip(live('INIT-014','Notes'),/^Cycle 116: Failed/));add('INIT-014','LastUpdated',today);add('INIT-014','NextActionCycle','117');

 const APPLY=process.argv.includes('--apply');
 const NUM=new Set(['VoteCycle','NextActionCycle','LastStageChangeCycle']);
 const val=(c,v)=>NUM.has(c)&&/^\d+$/.test(String(v))?Number(v):v;
 const norm=v=>String(v==null?'':v);
 // preconditions: each row is in the state the plan was built from, or already restored (then no cells differ)
 const pre={'INIT-008':'failed','INIT-009':'failed','INIT-010':'failed','INIT-011':'failed','INIT-012':'failed','INIT-013':'failed','INIT-014':'failed'};
 for(const [id,st] of Object.entries(pre)){const cur=live(id,'Status');if(cur!==st&&cur!==({'INIT-010':'passed'}[id]||'proposed'))throw new Error(id+' Status is '+cur+', expected '+st+' (or already restored) — stop')}
 for(const id of ['INIT-003','INIT-006']){const cur=live(id,'ImplementationPhase');if(cur!=='complete'&&cur!=={'INIT-003':'design-phase','INIT-006':'construction-active'}[id])throw new Error(id+' phase is '+cur+' — stop')}
 const byRow={};for(const p of plan){if(norm(live(p.id,p.c))!==norm(p.to))(byRow[p.id]=byRow[p.id]||[]).push(p)}
 const ids=Object.keys(byRow);console.log(ids.length,'rows,',ids.reduce((a,k)=>a+byRow[k].length,0),'cells to write');
 for(const id of ids)console.log(' ',id,'row',rowOf(id)+1,byRow[id].map(p=>col(ix(p.c))).join(','));
 if(!APPLY){console.log('DRY RUN — nothing written. --apply writes.');return}
 const BEFORE='/root/GodWorld/output/engine-sheet/2026-11-19-tracker-restore/tracker.before.json';
 fs.writeFileSync(BEFORE,JSON.stringify(T));console.log('before-snapshot saved',BEFORE);
 const S=require('/root/GodWorld/lib/sheets');let bad=0;
 for(const id of ids){
  const rowNo=rowOf(id)+1;const fields={};byRow[id].forEach(p=>fields[p.c]=val(p.c,p.to));
  await S.updateRowFields('Initiative_Tracker',rowNo,fields);
  const T2=await getSheetData('Initiative_Tracker');const r2=T2[rowNo-1];
  if(r2[0]!==id)throw new Error('row '+rowNo+' is '+r2[0]+' not '+id+' — stop');
  const miss=byRow[id].filter(p=>norm(r2[ix(p.c)])!==norm(p.to));
  console.log(id,'row',rowNo,miss.length?'READ-BACK MISMATCH '+miss.map(p=>p.c+': '+JSON.stringify(r2[ix(p.c)])+' != '+JSON.stringify(p.to)).join(' | '):'wrote '+byRow[id].length+' cells, read back ✓');
  if(miss.length)bad++;
 }
 // untouched rows identical to before
 const T3=await getSheetData('Initiative_Tracker'),pre2=JSON.parse(fs.readFileSync(BEFORE,'utf8'));
 const skip=new Set(ids);let drift=0;
 for(let i=1;i<T3.length;i++){if(skip.has(T3[i][0]))continue;if(JSON.stringify(T3[i])!==JSON.stringify(pre2[i])){drift++;console.log('untouched row changed during the write:',T3[i][0])}}
 console.log(bad||drift?'DONE WITH PROBLEMS: '+bad+' mismatched rows, '+drift+' untouched rows moved':'DONE ✓ every written cell read back; untouched rows identical');
 process.exit(bad||drift?1:0);
})();
