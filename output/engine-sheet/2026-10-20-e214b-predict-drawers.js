// leg B C113-C117 on the bench: dial-predicted growth-side with:against from the citizens who actually drew a growth-side
// reaction line, each weighted by their lines (current DialState), vs the observed 142:87
require('/root/GodWorld/lib/env');
process.env.GODWORLD_SHEET_ID = '1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA';
global.Logger = { log() {} };
const E = require('/root/GodWorld/utilities/citizenMemory.js'); Object.keys(E).forEach(k => { global[k] = E[k]; });
const C = require('/root/GodWorld/utilities/compressLifeHistory.js');
const sh = require('/root/GodWorld/lib/sheets');
const G = ['caught themselves bragging', 'felt quietly lucky to call', 'grumbled about the neighborhood over coffee', 'griped about'];
(async () => {
  const sl = await sh.getSheetData('Simulation_Ledger'), s = sl[0];
  const dial = {}; sl.slice(1).forEach(r => { dial[r[s.indexOf('POPID')]] = r[s.indexOf('DialState')] || ''; });
  const lh = await sh.getSheetData('LifeHistory_Log'), h = lh[0], iC = h.indexOf('Cycle'), iX = h.indexOf('EventText'), iP = h.indexOf('POPID');
  const n = {}; let obs = { brag: 0, humble: 0, complain: 0 };
  for (const r of lh.slice(1)) { const c = Number(String(r[iC]).replace(/^C/, '')); if (c < 113 || c > 117) continue; const t = String(r[iX] || ''); const k = G.findIndex(g => t.indexOf(g) === 0); if (k < 0) continue;
    n[r[iP]] = (n[r[iP]] || 0) + 1; obs[['brag', 'humble', 'complain', 'complain'][k]]++; }
  let w = 0, a = 0, cnt = 0, comp = [], wb = 0, wh = 0;
  for (const p of Object.keys(n)) { const b = C.getCitizenDialBands_({ citizenLookup: {} }, p, dial[p]); const m = b ? b.mult : { sociability: 1, warmth: 1, composure: 1 };
    const tot = m.sociability + m.warmth + (2 - m.composure); // brag 3.5×soc, humble 3.5×warmth, complain 2×1.75×(2−comp)
    wb += n[p] * m.sociability / tot; wh += n[p] * m.warmth / tot; a += n[p] * (2 - m.composure) / tot; cnt += n[p]; comp.push(m.composure); }
  console.log('drawers', Object.keys(n).length, 'lines', cnt, 'observed', JSON.stringify(obs));
  console.log('predicted from the drawers: brag', wb.toFixed(1), 'humble', wh.toFixed(1), 'complain', a.toFixed(1), '→ with:against', ((wb + wh) / a).toFixed(2) + ':1');
  console.log('drawers mean composure mult', (comp.reduce((x, y) => x + y, 0) / comp.length).toFixed(3));
})();
