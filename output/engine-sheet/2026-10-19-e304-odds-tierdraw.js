// Read-only: 2 citizens with an open family spot drawn per week, tier-weighted.
require('/root/GodWorld/lib/env');
const sheets = require('/root/GodWorld/lib/sheets.js');
(async () => {
  const [sl, her] = await Promise.all(['Simulation_Ledger','Heritage_Ledger'].map(t => sheets.getSheetAsObjects(t)));
  const Y = 2042, pc = v => (String(v||'').match(/POP-\d+/g)||[]).length;
  const herT = {}; for (const h of her) { if (!h.HeritageTier || String(h.Status||'').toLowerCase()==='dormant') continue; let m=[]; try{m=JSON.parse(h.MembersList||'[]')}catch(e){} for (const p of m) herT[p]=h.HeritageTier; }
  const tierW = { 1: 10, 2: 5, 3: 2, 4: 1 }, herW = { Founding: 2, Established: 1.5 };
  const C = [];
  for (const r of sl) { if (String(r.Status||'').toLowerCase()!=='active') continue; const by=Number(r.BirthYear)||0; if (!by) continue;
    const open = (String(r.MaritalStatus||'').toLowerCase()==='married' && !String(r.SpouseId||'').trim()) || (Y-by<18 && pc(r.ParentIds)<2) || ((Number(r.NumChildren)||0) > pc(r.ChildrenIds));
    if (open) C.push({ p: r.POPID, t: Number(r.Tier)||4, w: (tierW[Number(r.Tier)||4]||1) * (herW[herT[r.POPID]]||1) }); }
  const W = C.reduce((a,c)=>a+c.w,0);
  const wk = c => Math.round(1/(2*c.w/W));
  const byT = {}; for (const c of C) byT[c.t] = (byT[c.t]||0)+1;
  console.log('citizens with an open spot', C.length, JSON.stringify(byT), '| total weight', W);
  const d = C.find(c=>c.p==='POP-00021');
  console.log('Darrin drawn once per', wk(d), 'weeks | a plain tier-4 once per', wk({w:1}), 'weeks | tier-1 Founding line once per', wk({w:20}), 'weeks');
})().catch(e => { console.error(e.message); process.exit(1); });
