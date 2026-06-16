#!/usr/bin/env node
/* THROWAWAY OpenRouter bake-off (S261). Same selection + grounded prompt as
 * _probe_voice_grounded.js, run through DeepSeek + Hermes via OpenRouter, so the
 * output is directly comparable to the Gemini run. Delete after. */
require('/root/GodWorld/lib/env');
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

async function openrouter(model,system,user){
  const r=await fetch("https://openrouter.ai/api/v1/chat/completions",{method:"POST",headers:{Authorization:"Bearer "+process.env.OPENROUTER_API_KEY,"Content-Type":"application/json","HTTP-Referer":"https://godworld.local"},body:JSON.stringify({model,max_tokens:260,temperature:0.85,messages:[{role:"system",content:system},{role:"user",content:user}]})});
  const j=await r.json();
  if(j.error) return "[error] "+(j.error.message||JSON.stringify(j.error));
  return (j.choices?.[0]?.message?.content||"(empty)").trim();
}

(async()=>{
  const rows=await sheets.getRawSheetData('Simulation_Ledger');
  const h=rows[0]; const find=n=>h.findIndex(x=>String(x).toLowerCase()===n.toLowerCase());
  const iName=find('Name'),iFirst=find('First'),iLast=find('Last'),iNh=find('Neighborhood'),iDial=find('DialState'),iOcc=find('Occupation'),iBirth=find('BirthYear'),iLife=find('LifeHistory');
  const pool=[];
  for(let i=1;i<rows.length;i++){
    const r=rows[i],dj=r[iDial];if(!dj||String(dj).trim().length<5)continue;
    const cur=currentDials(dj);if(!cur||dev(cur)<60)continue;
    const life=iLife>=0?String(r[iLife]||'').trim():'';if(life.length<25)continue;
    const name=(iName>=0&&r[iName])?r[iName]:[r[iFirst],r[iLast]].filter(Boolean).join(' ');const nh=iNh>=0?r[iNh]:'';if(!name||!nh)continue;
    pool.push({name,occ:iOcc>=0?r[iOcc]:'',nh,age:(iBirth>=0&&r[iBirth])?(2041-Number(r[iBirth])):'',cur,life:life.split('\n').filter(Boolean).slice(-5).join('\n')});
  }
  // identical deterministic selection to the grounded probe
  const picks=[]; let seed=0,sd=-1;
  for(let i=0;i<pool.length;i++){if(dev(pool[i].cur)>sd){sd=dev(pool[i].cur);seed=i;}}
  picks.push(pool[seed]);
  while(picks.length<4){let bi=-1,bd=-1;for(let i=0;i<pool.length;i++){if(picks.includes(pool[i]))continue;const d=picks.reduce((s,p)=>s+l1(p.cur,pool[i].cur),0);if(d>bd){bd=d;bi=i;}}picks.push(pool[bi]);}

  const prompts=picks.map(p=>{const disp=disposition(p.cur);
    return {p,disp,
      system:`You are ${p.name}, ${p.age?p.age+', ':''}a ${p.occ||'resident'} living in ${p.nh}, Oakland. You are an ordinary person, not a writer. Your temperament: ${disp}.\n\nReal things from your life recently:\n${p.life}`,
      user:`It is evening. You are winding down after an ordinary day. In 4-5 sentences write a private, honest reflection — the small things on your mind, drawing on what's actually been happening in your life. Don't narrate events like a story; just think on the page the way you actually would. First person.`};
  });

  for(const [label,model] of [['DeepSeek V3','deepseek/deepseek-chat'],['Hermes-3 Llama-3.1 70B','nousresearch/hermes-3-llama-3.1-70b']]){
    console.log('\n'+'#'.repeat(80)+`\n# MODEL: ${label}  (${model})\n`+'#'.repeat(80));
    for(const {p,disp,system,user} of prompts){
      console.log('\n--- '+p.name+' ('+(p.occ||'resident')+', '+p.nh+(p.age?', '+p.age:'')+') | '+DIALS.map(d=>d[0]+Math.round(p.cur[d])).join(' ')+' ---');
      console.log('disposition: '+disp);
      try{ console.log(await openrouter(model,system,user)); }catch(e){ console.log('[err] '+e.message); }
    }
  }
  console.log('\n'+'#'.repeat(80));
})().catch(e=>{console.error('FATAL',e.message);process.exit(1);});
