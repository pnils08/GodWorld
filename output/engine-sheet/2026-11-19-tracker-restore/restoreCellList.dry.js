// Read-only: the Initiative_Tracker restore cell list (builder 2026-11-19: B, C, D as the doc suggests; A, E agreed), built so that every Notes/MilestoneNotes cell is the LIVE text minus only the hand-added line. Compares each cell to live and to the Nov 1 snapshot / C114 audit. Writes nothing. The writer runs only after the civic.49 vote fix is live.
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
 let changed=0;const out=[];
 for(const p of plan){const cur=live(p.id,p.c);const same=cur===String(p.to);if(!same)changed++;
  // source check
  let src='';const s=snap(p.id,p.c);
  if(s!==null&&['INIT-008','INIT-009','INIT-010','INIT-011','INIT-012','INIT-013'].includes(p.id)){src=(s===String(p.to))?'= Nov1 snapshot':'snapshot has: '+JSON.stringify(s.slice(0,70))}
  out.push(`${p.id} ${col(ix(p.c))}${rowOf(p.id)+1} ${p.c} | live ${JSON.stringify(cur.slice(0,40))} -> ${JSON.stringify(String(p.to).slice(0,60))} ${same?'(already)':''} ${src}`);}
 console.log(plan.length,'cells;',changed,'differ from live');console.log(out.join('\n'));
 // 003/006 vs C114 audit
 for(const id of ['INIT-003','INIT-006']){const r=c114(id);console.log('\nC114 audit',id,JSON.stringify(r).slice(0,500))}
})();
