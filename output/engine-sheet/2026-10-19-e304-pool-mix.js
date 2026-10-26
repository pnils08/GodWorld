// Read-only: background pool mix vs family-slot demand on live.
require('/root/GodWorld/lib/env');
const sheets = require('/root/GodWorld/lib/sheets.js');
(async () => {
  const [sl, gc, wc] = await Promise.all(['Simulation_Ledger','Generic_Citizens','World_Config'].map(t => sheets.getSheetAsObjects(t)));
  const Y = 2042, pc = v => (String(v||'').match(/POP-\d+/g)||[]).length;
  const cfg = {}; for (const r of wc) cfg[String(r.Key||r.key||'').trim()] = r.Value ?? r.value;
  console.log('floors F/M', cfg.gcPoolFloorFemale, cfg.gcPoolFloorMale);
  const G = gc.filter(r => String(r.Status||'').toLowerCase()==='active');
  const st = {}; for (const r of gc) { const s = String(r.Status||'').toLowerCase(); st[s] = (st[s]||0)+1; }
  const gBY = r => Number(r.BirthYear) || (Number(r.Age) ? Y-Number(r.Age) : 0);
  const band = a => a<18?'<18':a<25?'18-24':a<35?'25-34':a<45?'35-44':a<55?'45-54':a<65?'55-64':'65+';
  const mix = {}; for (const r of G) { const k = String(r.Sex||'?').toLowerCase()+' '+band(Y-gBY(r)); mix[k]=(mix[k]||0)+1; }
  console.log('GC status', JSON.stringify(st));
  console.log('GC active by sex/age', JSON.stringify(Object.fromEntries(Object.entries(mix).sort())));
  const ageCol = G.filter(r => Number(r.Age) && Number(r.BirthYear) && Number(r.Age) !== Y-Number(r.BirthYear)).length;
  console.log('GC rows where Age != 2042-BirthYear', ageCol, 'of', G.length);
  const live = sl.filter(r => String(r.Status||'').toLowerCase()==='active');
  let wantF=0, wantM=0, kidAges={};
  for (const r of live) { const by=Number(r.BirthYear)||0; if (!by) continue; const g=String(r.Gender||'').toLowerCase();
    if (String(r.MaritalStatus||'').toLowerCase()==='married' && !String(r.SpouseId||'').trim()) { if (g==='male') wantF++; else if (g==='female') wantM++; }
    if ((Number(r.NumChildren)||0) > pc(r.ChildrenIds)) { const a = Y-by; const k = a<37?'parent<37 (kids all <19)':a<63?'parent 37-62':'parent 63+'; kidAges[k]=(kidAges[k]||0)+1; } }
  console.log('spouse slots wanting a woman', wantF, '| wanting a man', wantM, '| child slots by parent age', JSON.stringify(kidAges));
  const ledF = live.filter(r=>String(r.Gender||'').toLowerCase()==='female').length, ledM = live.filter(r=>String(r.Gender||'').toLowerCase()==='male').length;
  console.log('ledger active F/M', ledF, ledM);
})().catch(e => { console.error(e.message); process.exit(1); });
