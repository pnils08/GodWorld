// engine.350 read — read-only. Local ledger copy + local wager copy. No sheet access, no writes.
const fs = require('fs');
const ROOT = '/root/GodWorld';
const M = require(ROOT + '/utilities/citizenDialMap.js');
const C = require(ROOT + '/utilities/compressLifeHistory.js');
const DIALS = ['drive', 'sociability', 'warmth', 'openness', 'composure', 'integrity', 'family', 'outabout', 'fandom'];
const lines = (p) => fs.readFileSync(p, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const snap = lines(ROOT + '/output/simulation_ledger_snapshot.jsonl');
const FROM = Number(process.argv[2] || 113), TO = Number(process.argv[3] || 116);

// A. the fold's own input: each citizen's LifeHistory cell, lines stamped FROM..TO, through nudgesForEvent_
const perDial = {}; DIALS.forEach((d) => perDial[d] = { up: 0, down: 0, upPts: 0, downPts: 0, kindsUp: {}, kindsDown: {} });
const kindTot = {}; let nLines = 0, nMoving = 0;
const casino = { win: 0, loss: 0, voidHouse: 0, setbackMost: 0, setbackLast: 0 };
const pilotLines = [];
for (const r of snap) {
  const parsed = C.parseLifeHistoryEntries_(r.LifeHistory || '');
  for (const e of parsed.entries) {
    if (e.cycle == null || e.cycle < FROM || e.cycle > TO) continue;
    nLines++;
    const fx = M.nudgesForEvent_(e.tag, 1, e.text);
    const g = M.gradedParts_ ? M.gradedParts_(e.tag) : null;
    const kind = M.baseTag_(e.tag);
    const fixed = g ? 'graded' : 'fixed';
    kindTot[kind] = kindTot[kind] || { n: 0, moving: 0, up: 0, down: 0, fixed: 0, graded: 0 };
    kindTot[kind].n++; kindTot[kind][fixed]++;
    let moved = false;
    for (const d of Object.keys(fx)) {
      if (!fx[d]) continue; moved = true;
      const p = perDial[d]; if (!p) continue;
      if (fx[d] > 0) { p.up++; p.upPts += fx[d]; p.kindsUp[kind + (g ? '' : '*')] = (p.kindsUp[kind + (g ? '' : '*')] || 0) + 1; kindTot[kind].up++; }
      else { p.down++; p.downPts += -fx[d]; p.kindsDown[kind + (g ? '' : '*')] = (p.kindsDown[kind + (g ? '' : '*')] || 0) + 1; kindTot[kind].down++; }
    }
    if (moved) { nMoving++; kindTot[kind].moving++; }
    if (/the window paid/.test(e.text)) casino.win++;
    else if (/slip came back empty — and it was most/.test(e.text)) casino.setbackMost++;
    else if (/took the last of it/.test(e.text)) casino.setbackLast++;
    else if (/slip came back empty/.test(e.text)) casino.loss++;
    else if (/window closed before/.test(e.text)) casino.voidHouse++;
    if (kind === 'Reputation') pilotLines.push({ pop: r.POPID, cycle: e.cycle, tag: e.tag, text: e.text });
  }
}
console.log(`=== A. LIFE LINES IN THE CELLS, C${FROM}-C${TO} (what the fold reads) ===`);
console.log('lines', nLines, '| lines that move a dial', nMoving, `(${(100 * nMoving / nLines).toFixed(0)}%)`);
console.log('\nper dial: line-pushes up / down (share up) | points up / down   [* = fixed map key or text rule, not a graded tag]');
for (const d of DIALS) {
  const p = perDial[d]; const t = p.up + p.down;
  const top = (o) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, 7).map((e) => `${e[0]}:${e[1]}`).join(' ');
  console.log(`${d.padEnd(12)} ${p.up} / ${p.down}  (${t ? (100 * p.up / t).toFixed(0) : '-'}% up) | pts ${p.upPts} / ${p.downPts}`);
  console.log(`   up from:   ${top(p.kindsUp)}`);
  console.log(`   down from: ${top(p.kindsDown)}`);
}
console.log('\nkinds (n | fixed-key lines | moving | up-pushes / down-pushes), top 40:');
Object.entries(kindTot).sort((a, b) => b[1].n - a[1].n).slice(0, 40).forEach(([k, v]) => console.log(`  ${k.padEnd(24)} n ${String(v.n).padStart(5)} | fixed ${String(v.fixed).padStart(5)} | moving ${String(v.moving).padStart(5)} | ${v.up} / ${v.down}`));

// B. bets
console.log(`\n=== B. BETS ===`);
console.log('casino lines in the cells this window:', JSON.stringify(casino));
const wag = lines(ROOT + '/output/beats/Casino_Ledger.jsonl').filter((w) => w.POPID);
const byPop = {}; snap.forEach((r) => byPop[r.POPID] = r);
const st = {}; wag.forEach((w) => { st[w.Status] = (st[w.Status] || 0) + 1; });
console.log('wagers on the tab copy:', wag.length, JSON.stringify(st));
const fam = {}; wag.forEach((w) => { fam[w.MarketFamily] = (fam[w.MarketFamily] || 0) + 1; }); console.log('by market:', JSON.stringify(fam));
const cyc = {}; wag.forEach((w) => { const k = w.CycleSettled || '(open)'; cyc[k] = (cyc[k] || 0) + 1; }); console.log('settled per Cycle:', JSON.stringify(cyc));
const q = (a, f) => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(s.length * f))] : null; };
const stakes = wag.map((w) => Number(w.Stake) || 0);
console.log('stake $: min', q(stakes, 0), 'p25', q(stakes, 0.25), 'median', q(stakes, 0.5), 'p75', q(stakes, 0.75), 'max', q(stakes, 0.999));
// size against what the citizen holds NOW (net worth today, weekly income) — the tab keeps no net worth at placement
const pctNW = [], pctWk = [], rows = [];
wag.forEach((w) => {
  const c = byPop[w.POPID]; if (!c) return;
  const nw = Number(c.NetWorth) || 0, inc = Number(c.Income) || 0, wk = inc / 52, s = Number(w.Stake) || 0;
  const won = /win/.test(w.Status), lost = /loss/.test(w.Status);
  const amount = won ? Math.max(0, (Number(w.Payout) || 0) - s) : s;
  if (nw > 0) pctNW.push(100 * amount / nw);
  if (wk > 0) pctWk.push(100 * amount / wk);
  rows.push({ pop: w.POPID, status: w.Status, stake: s, amount, nw, wk: Math.round(wk), pNW: nw > 0 ? 100 * amount / nw : null, pWk: wk > 0 ? 100 * amount / wk : null, cyc: w.CycleSettled });
});
const f2 = (x) => x == null ? '-' : x.toFixed(2);
console.log('amount won or lost as % of net worth today: p10', f2(q(pctNW, 0.1)), 'median', f2(q(pctNW, 0.5)), 'p90', f2(q(pctNW, 0.9)), 'max', f2(q(pctNW, 0.999)), `(n ${pctNW.length})`);
console.log('amount won or lost as % of one week of pay:   p10', f2(q(pctWk, 0.1)), 'median', f2(q(pctWk, 0.5)), 'p90', f2(q(pctWk, 0.9)), 'max', f2(q(pctWk, 0.999)), `(n ${pctWk.length})`);
const bucket = (v, edges) => { for (let i = 0; i < edges.length; i++) if (v < edges[i]) return i; return edges.length; };
for (const [label, key, edges] of [['% of net worth', 'pNW', [0.1, 0.5, 1, 2, 5]], ['% of a week of pay', 'pWk', [5, 10, 15, 20, 25]]]) {
  const b = { win: new Array(edges.length + 1).fill(0), loss: new Array(edges.length + 1).fill(0) };
  rows.forEach((r) => { if (r[key] == null) return; const k = /win/.test(r.status) ? 'win' : /loss/.test(r.status) ? 'loss' : null; if (k) b[k][bucket(r[key], edges)]++; });
  console.log(`settled bets by ${label}  [<${edges.join(', <')}, more]  wins ${b.win.join('/')}  losses ${b.loss.join('/')}`);
}
const bettors = {}; rows.forEach((r) => { bettors[r.pop] = (bettors[r.pop] || 0) + 1; });
console.log('distinct bettors', Object.keys(bettors).length, '| most bets by one citizen', Math.max(...Object.values(bettors)));

// C. UNDOCKED
console.log(`\n=== C. UNDOCKED ===`);
console.log('Reputation lines in the cells this window:', pilotLines.length);
pilotLines.slice(0, 12).forEach((l) => console.log(`  C${l.cycle} ${l.pop} [${l.tag}] ${l.text.slice(0, 90)}`));
const s = JSON.parse(fs.readFileSync(ROOT + '/output/spacemolt-show/standings.json', 'utf8'));
console.log('board rows', s.rows.length, '| computed', s.computedAt);
const ep = s.rows.map((r) => r.Episodes), pts = s.rows.map((r) => r.PointsTotal);
console.log('episodes per pilot: median', q(ep, 0.5), 'max', q(ep, 0.999), '| points total: min', q(pts, 0), 'median', q(pts, 0.5), 'max', q(pts, 0.999));
console.log('pilots at 0 points:', s.rows.filter((r) => !r.PointsTotal).length, '| with a mishap:', s.rows.filter((r) => r.MishapTotal).length, '| with combat:', s.rows.filter((r) => r.CombatTotal).length);
