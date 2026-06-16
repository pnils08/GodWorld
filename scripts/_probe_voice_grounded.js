#!/usr/bin/env node
/* THROWAWAY grounded confirming probe (S261). 4 strongly-shaped divergent
 * citizens, GROUNDED in their real LifeHistory tail (kills confabulation), same
 * scenario, Gemini CLI. Warm-up + long timeout. Delete after. */
require('/root/GodWorld/lib/env');
const { execSync } = require('child_process');
const fs = require('fs');
const sheets = require('/root/GodWorld/lib/sheets');

const DIALS = ['drive','sociability','warmth','openness','composure','integrity','family','outabout'];
const POLES = {
  drive:['drifting, no urgency','easygoing, unhurried','driven, hard to sit still',"relentless, can't stop working"],
  sociability:['a loner, keeps to themselves','private, few close ties','draws people in, deep with them','magnetic, center of every room'],
  warmth:['cold, hard to reach','reserved, guarded','warm, tender with people','openly affectionate, big-hearted'],
  openness:['rigid, set in their ways','prefers the familiar','curious, open to new things','restless for the new, adventurous'],
  composure:['volatile, feels everything hard','quick to rattle','steady, hard to shake','unshakable, calm under anything'],
  integrity:['willing to cut any corner','bends rules when it suits','principled, plays it straight','incorruptible, rigid about right'],
  family:['unattached, family distant',"keeps family at arm's length",'close to family','devoted, family is everything'],
  outabout:['a homebody, rarely out','stays in mostly','often out in the neighborhood','always out, never home'],
};
const bandIdx=v=>v<20?0:v<40?1:v<60?-1:v<80?2:3;
const disposition=cur=>{const ph=[];for(const d of DIALS){const b=bandIdx(cur[d]);if(b>=0)ph.push(POLES[d][b]);}return ph.length?ph.join('; '):'even-keeled, unremarkable';};
const currentDials=j=>{let c;try{c=JSON.parse(j);}catch(e){return null;}const cur={};for(const d of DIALS){const base=(c.base&&c.base[d]!=null)?c.base[d]:50;const mood=(c.mood&&c.mood[d])||0;cur[d]=Math.max(0,Math.min(100,base+mood));}return cur;};
const dev=cur=>DIALS.reduce((s,d)=>s+Math.abs(cur[d]-50),0);
const l1=(a,b)=>DIALS.reduce((s,d)=>s+Math.abs(a[d]-b[d]),0);
function gemini(prompt){const tmp='/tmp/_gp.txt';fs.writeFileSync(tmp,prompt);const out=execSync(`gemini -p "$(cat ${tmp})" 2>/dev/null`,{encoding:'utf8',timeout:240000,maxBuffer:1e7});return out.trim();}

(async()=>{
  const rows=await sheets.getRawSheetData('Simulation_Ledger');
  const h=rows[0]; const find=n=>h.findIndex(x=>String(x).toLowerCase()===n.toLowerCase());
  const iName=find('Name'),iFirst=find('First'),iLast=find('Last'),iNh=find('Neighborhood'),iDial=find('DialState'),iOcc=find('Occupation'),iBirth=find('BirthYear'),iLife=find('LifeHistory');
  const pool=[];
  for(let i=1;i<rows.length;i++){
    const r=rows[i],dj=r[iDial];if(!dj||String(dj).trim().length<5)continue;
    const cur=currentDials(dj);if(!cur||dev(cur)<60)continue;
    const life=iLife>=0?String(r[iLife]||'').trim():'';if(life.length<25)continue; /* must have real events */
    const name=(iName>=0&&r[iName])?r[iName]:[r[iFirst],r[iLast]].filter(Boolean).join(' ');const nh=iNh>=0?r[iNh]:'';if(!name||!nh)continue;
    const lifeTail=life.split('\n').filter(Boolean).slice(-5).join('\n');
    pool.push({name,occ:iOcc>=0?r[iOcc]:'',nh,age:(iBirth>=0&&r[iBirth])?(2041-Number(r[iBirth])):'',cur,life:lifeTail});
  }
  console.log(`strongly-shaped + has-lifehistory pool: ${pool.length}`);
  if(pool.length<4){console.log('not enough');return;}
  // greedily pick 4 maximizing spread
  const picks=[]; let seed=0,sd=-1;
  for(let i=0;i<pool.length;i++){if(dev(pool[i].cur)>sd){sd=dev(pool[i].cur);seed=i;}}
  picks.push(pool[seed]);
  while(picks.length<4){let bi=-1,bd=-1;for(let i=0;i<pool.length;i++){if(picks.includes(pool[i]))continue;const d=picks.reduce((s,p)=>s+l1(p.cur,pool[i].cur),0);if(d>bd){bd=d;bi=i;}}picks.push(pool[bi]);}

  console.log('warming Gemini…'); try{gemini('Reply with only: READY');}catch(e){console.log('warmup err '+e.message);}

  for(const p of picks){
    const disp=disposition(p.cur);
    const prompt=`You are ${p.name}, ${p.age?p.age+', ':''}a ${p.occ||'resident'} living in ${p.nh}, Oakland. You are an ordinary person, not a writer. Your temperament: ${disp}.\n\nReal things from your life recently:\n${p.life}\n\nIt is evening. You are winding down after an ordinary day. In 4-5 sentences write a private, honest reflection — the small things on your mind, drawing on what's actually been happening in your life above. Don't narrate events like a story; just think on the page the way you actually would. First person.`;
    console.log('\n'+'='.repeat(80));
    console.log(`${p.name} — ${p.occ||'resident'}, ${p.nh}${p.age?', '+p.age:''} | `+DIALS.map(d=>d[0]+Math.round(p.cur[d])).join(' '));
    console.log('disposition: '+disp);
    console.log('recent life:\n'+p.life);
    console.log('-'.repeat(80));
    try{ console.log(gemini(prompt)); }catch(e){ console.log('[gemini error] '+e.message); }
  }
  console.log('\n'+'='.repeat(80));
})().catch(e=>{console.error('FATAL',e.message);process.exit(1);});
