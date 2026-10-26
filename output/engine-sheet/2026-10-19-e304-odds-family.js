// Read-only: the family-match lottery across every open slot on live.
require('/root/GodWorld/lib/env');
const sheets = require('/root/GodWorld/lib/sheets.js');
(async () => {
  const [sl, gc, her, nm] = await Promise.all(['Simulation_Ledger','Generic_Citizens','Heritage_Ledger','Neighborhood_Map'].map(t => sheets.getSheetAsObjects(t)));
  const adj = {}; for (const r of nm) { const h = String(r.Neighborhood||'').trim(); if (!h) continue; adj[h] = adj[h] || new Set();
    for (const a of String(r.Adjacent||'').split(/[,;|]/).map(x=>x.trim()).filter(Boolean)) { adj[h].add(a); (adj[a] = adj[a] || new Set()).add(h); } }
  const near = (a,b) => a===b || (adj[a] && adj[a].has(b));
  const Y = 2042, pc = v => (String(v||'').match(/POP-\d+/g)||[]).length;
  const herT = {}; for (const h of her) { if (!h.HeritageTier || String(h.Status||'').toLowerCase()==='dormant') continue; let m=[]; try{m=JSON.parse(h.MembersList||'[]')}catch(e){} for (const p of m) herT[p]=h.HeritageTier; }
  const rank = { Founding: 0, Established: 1 }; // weight = 1 + rank + 1 when tiered (code: heritageRank_ index)
  const G = gc.filter(r => String(r.Status||'').toLowerCase()==='active' && String(r.First||'').trim() && String(r.Last||'').trim());
  const gBY = r => Number(r.BirthYear) || (Number(r.Age) ? Y-Number(r.Age) : 0);
  const live = sl.filter(r => String(r.Status||'').toLowerCase()==='active');
  const byPop = {}; for (const r of live) byPop[r.POPID] = r;
  const slots = [];
  for (const r of live) { const by = Number(r.BirthYear)||0; if (!by || !String(r.Last||'').trim()) continue;
    const g = String(r.Gender||'').toLowerCase(), hood = String(r.Neighborhood||'').trim(), t = String(r.Tier||'');
    const w = 1 + (herT[r.POPID] ? (rank[herT[r.POPID]] ?? 0) + 1 : 0);
    if (String(r.MaritalStatus||'').toLowerCase()==='married' && !String(r.SpouseId||'').trim())
      slots.push({ type:'spouse', tier:t, w, hood, sex: g==='female'?'male':g==='male'?'female':'', lo: by-10, hi: by+10 });
    if (Y-by<18 && pc(r.ParentIds)<2) slots.push({ type:'parent', tier:t, w, hood, sex:'', lo: by-45, hi: by-18 });
    if ((Number(r.NumChildren)||0) > pc(r.ChildrenIds)) slots.push({ type:'child', tier:t, w, hood, sex:'', lo: by+18, hi: by+45 }); }
  const W = slots.reduce((s,x)=>s+x.w,0);
  const fits = s => G.filter(g => String(g.Neighborhood||'').trim()===s.hood && (!s.sex || String(g.Sex||'').toLowerCase()===s.sex) && gBY(g)>=s.lo && gBY(g)<=s.hi).length;
  let pLand = 0; const by = {};
  for (const s of slots) { const f = fits(s); s.f = f; pLand += (s.w/W) * (f/G.length);
    const k = s.type; by[k] = by[k] || { n:0, withFit:0 }; by[k].n++; if (f) by[k].withFit++; }
  const tierN = {}; for (const s of slots) tierN[s.tier] = (tierN[s.tier]||0)+1;
  console.log('slots', slots.length, JSON.stringify(by), '| by tier', JSON.stringify(tierN));
  console.log('per spin P(land) =', pLand.toExponential(2), '| at 2 spins x 20% a week: one family arrival per', Math.round(1/(0.4*pLand)), 'weeks citywide');
  const anyFit = slots.filter(s=>s.f>0).length;
  console.log('if the background citizen is drawn from those who fit the drawn spot: spot has a fit', anyFit + '/' + slots.length, '-> one arrival per', Math.round(1/(0.4*anyFit/slots.length)*10)/10, 'weeks citywide');
  const married = live.filter(r=>String(r.MaritalStatus||'').toLowerCase()==='married').length, adults = live.filter(r=>Y-Number(r.BirthYear||0)>=18).length;
  // option A: blind draw, bordering hood counts; tier weight 5-tier on the spot draw
  const tw = s => Math.max(1, 5 - (Number(s.tier)||4)) * s.w;
  const W2 = slots.reduce((a,x)=>a+tw(x),0);
  const fitsNear = s => G.filter(g => near(String(g.Neighborhood||'').trim(), s.hood) && (!s.sex || String(g.Sex||'').toLowerCase()===s.sex) && gBY(g)>=s.lo && gBY(g)<=s.hi).length;
  let pA = 0, anyNearW = 0; for (const x of slots) { x.fn = fitsNear(x); pA += (tw(x)/W2) * (x.fn/G.length); if (x.fn) anyNearW += tw(x)/W2; }
  console.log('A blind + bordering + tier weight: one arrival per', Math.round(1/(0.4*pA)), 'weeks citywide | B search the fit + bordering + tier weight: one per', Math.round(10/(0.4*anyNearW))/10, 'weeks');
  const d = slots.filter(x => x.tier==='1' && x.hood==='Piedmont Ave');
  const dw = slots.find(x => x.type==='spouse' && x.lo===1999 && x.hood==='Piedmont Ave' && x.tier==='1');
  if (dw) console.log('Darrin wife slot: fits same', dw.f, 'bordering', dw.fn, '| A: once per', Math.round(1/(0.4*(tw(dw)/W2)*(dw.fn/G.length))), 'weeks | B: once per', Math.round(1/(0.4*(tw(dw)/W2))), 'weeks');
  console.log('married', married, 'of', adults, 'adults | married with tracked spouse', live.filter(r=>String(r.MaritalStatus||'').toLowerCase()==='married' && String(r.SpouseId||'').trim()).length);
})().catch(e => { console.error(e.message); process.exit(1); });
