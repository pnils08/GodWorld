#!/usr/bin/env node
'use strict';
/**
 * deadBranchScan.js — /health Scan 4 (S441, SIM_DOCTRINE §15).
 *
 * "A gate that can't fire is a trick." Signature: a bare numeric threshold
 * compared against a sheet-derived metric whose LIVE range never crosses it.
 * NEVER-FIRES = the branch has no way to run. ALWAYS-TRUE = a constant wearing
 * a gate's clothes. Both keep the output plausible while the mechanism is inert
 * — the defect class that hid 62 dead sentiment branches and a shock gate true
 * 19 of 19 cycles.
 *
 * Read-only. Defaults to the live sheet (what production runs against);
 * --sheet-id=<id> targets a bench (set AFTER lib/env, per DEPLOY.md trap 2b).
 * Exit 0 always — this reports, it does not gate.
 */
require('/root/GodWorld/lib/env');
const _sid=(process.argv.find(a=>a.startsWith('--sheet-id='))||'').split('=')[1];
if(_sid) process.env.GODWORLD_SHEET_ID=_sid;
const fs=require('fs'), path=require('path'), cp=require('child_process');
const sheets=require('/root/GodWorld/lib/sheets');

// Tabs whose numeric columns engines gate on.
const TABS=['Neighborhood_Map','World_Population','Riley_Digest','Crime_Metrics',
            'Transit_Metrics','Neighborhood_Demographics','Hospital_Ledger'];

const norm=s=>String(s).toLowerCase().replace(/[^a-z0-9]/g,'');

(async()=>{
  // 1. Live range per column.
  const ranges={};   // normalizedName -> {tab, col, min, max, n}
  for(const t of TABS){
    let d; try{ d=await sheets.getSheetData(t); }catch(e){ continue; }
    if(!d||d.length<2) continue;
    const hdr=d[0].map(x=>String(x).trim());
    for(let c=0;c<hdr.length;c++){
      if(!hdr[c]) continue;
      const vals=d.slice(1).map(r=>Number(r[c])).filter(Number.isFinite);
      if(vals.length<3) continue;
      const key=norm(hdr[c]);
      // first tab wins; Neighborhood_Map is listed first deliberately
      if(!ranges[key]) ranges[key]={tab:t,col:hdr[c],min:Math.min(...vals),max:Math.max(...vals),n:vals.length};
    }
  }
  console.log(`target ${process.env.GODWORLD_SHEET_ID.slice(0,12)}… | indexed ${Object.keys(ranges).length} numeric columns across ${TABS.length} tabs\n`);

  // 2. Scan engine sources for bare-number comparisons.
  const files=cp.execSync(
    "find phase* utilities -name '*.js' -not -name '*.test.js' 2>/dev/null || true",
    {cwd:'/root/GodWorld',encoding:'utf8'}).trim().split('\n').filter(Boolean);

  const RE=/([A-Za-z_$][A-Za-z0-9_$.]*)\s*(>=|<=|>|<)\s*(-?\d+(?:\.\d+)?)\b/g;
  const findings=[];
  for(const f of files){
    const src=fs.readFileSync(path.join('/root/GodWorld',f),'utf8').split('\n');
    src.forEach((line,idx)=>{
      const code=line.replace(/\/\/.*$/,'');
      if(/^\s*[*/]/.test(line)) return;            // comment block
      let m;
      RE.lastIndex=0;
      while((m=RE.exec(code))){
        const [ ,ident,op,numS]=m; const num=Number(numS);
        const leaf=ident.split('.').pop();
        const k=norm(leaf);
        // STRICT matching. Loose substring matching produced nonsense like
        // `col >= 1` binding to CollegeReadinessRate. A hit requires either an
        // exact normalized name match, or the identifier to END with the full
        // column name (nhSentiment -> Sentiment, hoodCrimeIndex -> CrimeIndex).
        const STOP=new Set(['length','index','count','row','col','idx','size','len','n','i','j','c','r','x','y','id','rowidx','colidx','total','num','max','min','sum']);
        if(k.length<6||STOP.has(k)) continue;
        let hit=ranges[k];
        if(!hit){
          for(const rk of Object.keys(ranges)){
            if(rk.length>=7 && k.endsWith(rk) && k.length-rk.length<=6){ hit=ranges[rk]; break; }
          }
        }
        if(!hit) continue;
        // A column whose live values are all identical carries no information —
        // every comparison against it is trivially always/never. Skip.
        if(hit.min===hit.max) continue;
        // can this branch ever fire given the live range?
        let fires;
        if(op==='>=') fires=hit.max>=num; else if(op==='>') fires=hit.max>num;
        else if(op==='<=') fires=hit.min<=num; else fires=hit.min<num;
        // always-true is the mirror defect: a constant, not a gate
        let always;
        if(op==='>=') always=hit.min>=num; else if(op==='>') always=hit.min>num;
        else if(op==='<=') always=hit.max<=num; else always=hit.max<num;
        if(!fires||always) findings.push({f,line:idx+1,ident,op,num,hit,verdict:fires?'ALWAYS-TRUE':'NEVER-FIRES',text:line.trim().slice(0,105)});
      }
    });
  }
  const never=findings.filter(x=>x.verdict==='NEVER-FIRES');
  const always=findings.filter(x=>x.verdict==='ALWAYS-TRUE');
  const show=(title,arr)=>{
    console.log(`\n===== ${title} (${arr.length}) =====`);
    const byFile={}; arr.forEach(x=>{(byFile[x.f]=byFile[x.f]||[]).push(x);});
    for(const f of Object.keys(byFile).sort()){
      console.log('\n'+f);
      for(const x of byFile[f]) console.log(`  :${String(x.line).padEnd(5)} ${x.ident} ${x.op} ${x.num}   [${x.hit.col} live ${x.hit.min}..${x.hit.max}]`);
    }
  };
  show('NEVER FIRES — threshold outside the metric\'s live range',never);
  show('ALWAYS TRUE — a constant wearing a gate\'s clothes',always);
  console.log(`\nTOTAL: ${never.length} never-fire, ${always.length} always-true, across ${new Set(findings.map(x=>x.f)).size} files`);
})();
