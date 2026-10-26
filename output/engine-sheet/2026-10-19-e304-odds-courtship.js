// Read-only: live odds for two citizens on the courtship and family-drip paths.
const path = require('path');
require('/root/GodWorld/lib/env');
const sheets = require(path.join('/root/GodWorld', 'lib/sheets.js'));
(async () => {
  const [sl, gc, her, nm, rb] = await Promise.all(['Simulation_Ledger','Generic_Citizens','Heritage_Ledger','Neighborhood_Map','Relationship_Bonds'].map(t => sheets.getSheetAsObjects(t)));
  const Y = 2042;
  // adjacency (canonical hoods only; symmetric)
  const adj = {};
  for (const r of nm) { const h = String(r.Neighborhood||'').trim(); if (!h) continue; adj[h] = adj[h] || new Set();
    for (const a of String(r.Adjacent||'').split(/[,;|]/).map(s=>s.trim()).filter(Boolean)) { adj[h].add(a); (adj[a] = adj[a] || new Set()).add(h); } }
  const near = (a,b) => a===b || (adj[a] && adj[a].has(b));
  // romantic prospects
  const pros = new Set();
  for (const b of rb) { if (String(b.BondType||b.bondType||'').toLowerCase()==='romantic' && String(b.Status||b.status||'').toLowerCase()==='active') { pros.add(String(b.CitizenA||b.citizenA)); pros.add(String(b.CitizenB||b.citizenB)); } }
  const live = sl.filter(r => String(r.Status||'').toLowerCase()==='active');
  const court = new Set(['single','divorced','widowed']);
  const singles = live.filter(r => { const a = Y - Number(r.BirthYear||0); const g=String(r.Gender||'').toLowerCase();
    return court.has(String(r.MaritalStatus||'').toLowerCase()) && !pros.has(r.POPID) && a>=24 && a<=58 && (g==='male'||g==='female'); });
  const gcA = gc.filter(r => String(r.Status||'').toLowerCase()==='active' && String(r.First||'').trim() && String(r.Last||'').trim());
  const gAge = r => Number(r.Age) || (Number(r.BirthYear) ? Y - Number(r.BirthYear) : 0);
  const gcAges = gcA.map(gAge).filter(a=>a>0);
  console.log('ledger active', live.length, '| court-eligible singles 24-58 w/o romance', singles.length, '| active romantic bonds endpoints', pros.size);
  console.log('GC active', gcA.length, '| GC age min/max', Math.min(...gcAges), Math.max(...gcAges), '| GC under 18', gcAges.filter(a=>a<18).length, '| GC no age', gcA.length-gcAges.length);
  // Elias
  const E = live.find(r => r.POPID==='POP-00789'); const eA = Y-Number(E.BirthYear);
  const fit = gcA.filter(r => String(r.Sex||'').toLowerCase()==='female' && gAge(r)>0 && Math.abs(gAge(r)-eA)<=10 && gAge(r)>=24 && gAge(r)<=58);
  const fitNear = fit.filter(r => near(String(r.Neighborhood||'').trim(), E.Neighborhood));
  const fitSame = fit.filter(r => String(r.Neighborhood||'').trim()===E.Neighborhood);
  console.log('Elias', E.MaritalStatus, eA, E.Neighborhood, '| in pool', singles.some(r=>r.POPID===E.POPID), '| GC women who fit', fit.length, 'near', fitNear.length, 'same hood', fitSame.length);
  console.log('  P(Elias drawn in a week) = 0.2/' + singles.length + ' = 1 in', Math.round(singles.length/0.2), 'weeks');
  console.log('  old blind draw P(align | drawn) = same-hood fits / GC =', fitSame.length + '/' + gcA.length, '| widened (near) =', fitNear.length + '/' + gcA.length);
  const eb = rb.filter(b => [b.CitizenA,b.citizenA,b.CitizenB,b.citizenB].includes('POP-00789') && String(b.Status||b.status||'').toLowerCase()==='active');
  console.log('  Elias active bonds', eb.length, eb.map(b => (b.BondType||b.bondType)+':'+(b.Intensity||b.intensity)).join(' '));
  // Darrin — family drip
  const D = live.find(r => r.POPID==='POP-00021'); const dBY = Number(D.BirthYear);
  const herT = {}; for (const h of her) { if (!h.HeritageTier || String(h.Status||'').toLowerCase()==='dormant') continue; let m=[]; try{m=JSON.parse(h.MembersList||'[]')}catch(e){} for (const p of m) herT[p]=h.HeritageTier; }
  const tiers = [...new Set(her.map(h=>h.HeritageTier).filter(Boolean))];
  let slots = [];
  const pc = v => (String(v||'').match(/POP-\d+/g)||[]).length;
  for (const r of live) { const by = Number(r.BirthYear)||0; if (!by || !String(r.Last||'').trim()) continue;
    const w = herT[r.POPID] ? 2 : 1; // weight 1 + rank+1 ≥ 2 for any tier; exact rank below
    if (String(r.MaritalStatus||'').toLowerCase()==='married' && !String(r.SpouseId||'').trim()) slots.push({p:r.POPID,t:'spouse',w});
    if (Y-by<18 && pc(r.ParentIds)<2) slots.push({p:r.POPID,t:'parent',w});
    if ((Number(r.NumChildren)||0) > pc(r.ChildrenIds)) slots.push({p:r.POPID,t:'child',w}); }
  const W = slots.reduce((s,x)=>s+x.w,0);
  const dS = slots.filter(s=>s.p==='POP-00021');
  const gBY = r => Number(r.BirthYear) || (Number(r.Age) ? Y-Number(r.Age) : 0);
  const spFit = gcA.filter(r => String(r.Sex||'').toLowerCase()==='female' && String(r.Neighborhood||'').trim()===D.Neighborhood && gBY(r)>=dBY-10 && gBY(r)<=dBY+10);
  const kFit = gcA.filter(r => String(r.Neighborhood||'').trim()===D.Neighborhood && gBY(r)>=dBY+18 && gBY(r)<=dBY+45);
  console.log('Darrin', D.MaritalStatus, Y-dBY, D.Neighborhood, D.ClockMode, '| heritage', herT['POP-00021']||'none', '| tiers', tiers.join(','), '| his slots', dS.map(s=>s.t+'(w'+s.w+')').join(' '), '| all slots', slots.length, 'weight', W);
  console.log('  GC who fit his spouse slot', spFit.length, '| GC who fit a child slot', kFit.length, '| GC in Piedmont Ave', gcA.filter(r=>String(r.Neighborhood||'').trim()===D.Neighborhood).length);
})().catch(e => { console.error(e.message); process.exit(1); });
// whole-pool comparison: per firing week, P(a courtship starts) under each version
(async () => {
  const [sl, gc, nm] = await Promise.all(['Simulation_Ledger','Generic_Citizens','Neighborhood_Map'].map(t => sheets.getSheetAsObjects(t)));
  const Y = 2042, adj = {};
  for (const r of nm) { const h = String(r.Neighborhood||'').trim(); if (!h) continue; adj[h] = adj[h] || new Set();
    for (const a of String(r.Adjacent||'').split(/[,;|]/).map(s=>s.trim()).filter(Boolean)) { adj[h].add(a); (adj[a] = adj[a] || new Set()).add(h); } }
  const near = (a,b) => a===b || (adj[a] && adj[a].has(b));
  const court = new Set(['single','divorced','widowed']);
  const S = sl.filter(r => { const a = Y-Number(r.BirthYear||0), g=String(r.Gender||'').toLowerCase();
    return String(r.Status||'').toLowerCase()==='active' && court.has(String(r.MaritalStatus||'').toLowerCase()) && a>=24 && a<=58 && (g==='male'||g==='female'); });
  const G = gc.filter(r => String(r.Status||'').toLowerCase()==='active' && String(r.First||'').trim());
  const ga = r => Number(r.Age) || (Number(r.BirthYear) ? Y-Number(r.BirthYear) : 0);
  let same=0, nr=0, any=0;
  for (const p of S) { const a = Y-Number(p.BirthYear), want = String(p.Gender).toLowerCase()==='male'?'female':'male';
    const f = G.filter(g => String(g.Sex||'').toLowerCase()===want && ga(g)>0 && Math.abs(ga(g)-a)<=10 && ga(g)>=24 && ga(g)<=58);
    same += f.filter(g => String(g.Neighborhood||'').trim()===p.Neighborhood).length / G.length;
    nr += f.filter(g => near(String(g.Neighborhood||'').trim(), p.Neighborhood)).length / G.length;
    any += f.length ? 1 : 0; }
  const wk = x => Math.round(1/(0.2*x/S.length));
  console.log('POOL', S.length, 'singles | old blind (same hood): 1 courtship per', wk(same), 'weeks | blind widened (bordering hood): 1 per', wk(nr), 'weeks | as built (search): 1 per', wk(any), 'weeks; singles with no fit at all', S.length-any);
})();
