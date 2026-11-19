// engine.350 Task 7, the down side of the coded pools — bench tool. SANDBOX 1004 only for every write.
//   placed                 append the nine PLACED rows of scripts/downLinesEclPool.js to the BENCH Event_Content_Ledger and set
//                          the seniors-lunch flyer row Active = no there; read back; prove the live tab was not touched
//   cellcount <c>          the bench ledger's own life lines stamped Cycle c (what the fold reads): pushes up / down per dial,
//                          by kind, and how many citizens' week nets up or down on each dial; kept in …-e350c-cells.json
//   cellsum                the kept Cycles, summed
//   cellreset              empty the kept Cycles (start of a leg)
// The log counts, bands and the pulse are 2026-11-18-e350-bench.js (snap / count / bands / cross / pulse).
require('/root/GodWorld/lib/env');
const fs = require('fs');
const path = require('path');
const LIVE = process.env.GODWORLD_SHEET_ID;
const B = '1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA';
if (!LIVE || LIVE === B) throw new Error('live id missing or equal to the bench');
const s = require('/root/GodWorld/lib/sheets');
const M = require('/root/GodWorld/utilities/citizenDialMap.js');
const P = require('/root/GodWorld/scripts/downLinesEclPool.js');
const DIALS = M.GRADED_DIALS;
const OUT = path.join(__dirname, '2026-11-18-e350c-cells.json');
const FLYER = 'a flyer for a seniors lunch program flutters on a community bulletin board';
const on = (id) => { process.env.GODWORLD_SHEET_ID = id; };
const norm = (t) => String(t || '').replace(/\s+/g, ' ').trim().toLowerCase();

(async () => {
  const mode = process.argv[2];
  if (mode === 'placed') {
    const v = P.validateRows(P.ROWS); if (!v.valid) throw new Error(v.errors.join('; '));
    on(LIVE); const live0 = await s.getRawSheetData('Event_Content_Ledger');
    on(B); const data = await s.getRawSheetData('Event_Content_Ledger');
    const hdr = data[0]; if (hdr.join('|') !== P.HDR.join('|')) throw new Error('bench header differs: ' + hdr.join('|'));
    const iText = hdr.indexOf('Text'), iActive = hdr.indexOf('Active');
    const seen = new Set(data.slice(1).map((r) => norm(r[iText])));
    const missing = P.ROWS.filter((r) => !seen.has(norm(r.Text)));
    const notPlaced = missing.filter((r) => r.answers == null);
    if (notPlaced.length) throw new Error(notPlaced.length + ' down.* rows are missing from the bench tab — the sync did not carry the live tab');
    if (missing.length) await s.appendRows('Event_Content_Ledger', P.toSheetValues(missing));
    const hits = []; data.slice(1).forEach((r, i) => { if (norm(r[iText]) === norm(FLYER)) hits.push(i + 2); });
    if (hits.length !== 1) throw new Error('the flyer row matches ' + hits.length + ' bench rows');
    await s.updateRange('Event_Content_Ledger!' + String.fromCharCode(65 + iActive) + hits[0], [['no']]);
    const after = await s.getRawSheetData('Event_Content_Ledger');
    const back = P.ROWS.filter((r) => r.answers != null).filter((r) => after.slice(1).some((a) => norm(a[iText]) === norm(r.Text) && a[hdr.indexOf('PoolKey')] === r.PoolKey && a[hdr.indexOf('Tags')] === r.Tags && String(a[hdr.indexOf('Conditions')] || '') === r.Conditions)).length;
    const flyerOff = String(after[hits[0] - 1][iActive]).trim().toLowerCase() === 'no';
    on(LIVE); const live1 = await s.getRawSheetData('Event_Content_Ledger');
    const liveFlyer = live1.slice(1).filter((r) => norm(r[iText]) === norm(FLYER)).map((r) => String(r[iActive] || '').trim().toLowerCase());
    const liveSame = live0.length === live1.length && !live1.slice(1).some((r) => P.PLACED.some((p) => norm(p[5]) === norm(r[iText])));
    console.log(`placed: bench rows ${data.length - 1} -> ${after.length - 1} (appended ${missing.length}); placed rows read back ${back} of ${P.PLACED.length}; flyer row R${hits[0]} Active=no on the bench: ${flyerOff}; live rows ${live0.length - 1} -> ${live1.length - 1}, no placed row on live: ${liveSame}, live flyer Active: ${liveFlyer.join(',') || '(blank)'}`);
    process.exit(back === P.PLACED.length && flyerOff && liveSame && liveFlyer.length === 1 && liveFlyer[0] !== 'no' ? 0 : 1);
  }
  if (mode === 'cellcount') {
    const c = Number(process.argv[3]); if (!c) throw new Error('cellcount <cycle>');
    const stamp = 'Y' + (Math.floor((c - 1) / 52) + 1) + 'C' + (((c - 1) % 52) + 1);
    on(B); const rows = await s.getSheetAsObjects('Simulation_Ledger');
    const o = { cycle: c, stamp, lines: 0, moving: 0, citizens: 0, perDial: {}, kinds: {} };
    DIALS.forEach((d) => o.perDial[d] = { up: 0, down: 0, upPts: 0, downPts: 0, netUp: 0, netDown: 0, upKinds: {}, downKinds: {} });
    rows.forEach((r) => {
      const net = {}; let any = false;
      String(r.LifeHistory || '').split('\n').forEach((ln) => {
        const m = /^(\S+) — \[([^\]]+)\] (.*)$/.exec(ln); if (!m || m[1] !== stamp) return;
        o.lines++; any = true;
        const fx = M.nudgesForEvent_(m[2], 1, m[3]); const kind = M.baseTag_(m[2]); let moved = false;
        o.kinds[kind] = (o.kinds[kind] || 0) + 1;
        for (const d in fx) {
          if (!fx[d] || !o.perDial[d]) continue; moved = true;
          const p = o.perDial[d], up = fx[d] > 0;
          p[up ? 'up' : 'down']++; p[up ? 'upPts' : 'downPts'] += Math.abs(fx[d]);
          const k = up ? p.upKinds : p.downKinds; k[kind] = (k[kind] || 0) + 1;
          net[d] = (net[d] || 0) + fx[d];
        }
        if (moved) o.moving++;
      });
      if (any) o.citizens++;
      for (const d in net) { if (net[d] > 0) o.perDial[d].netUp++; else if (net[d] < 0) o.perDial[d].netDown++; }
    });
    const all = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};
    all[c] = o; fs.writeFileSync(OUT, JSON.stringify(all));
    console.log(`cells C${c} (${stamp}): ${o.lines} lines on ${o.citizens} citizens, ${o.moving} move a dial | ` +
      ['sociability', 'warmth', 'openness', 'drive'].map((d) => `${d} ${o.perDial[d].up}/${o.perDial[d].down}`).join(' · '));
    process.exit(o.lines > 0 ? 0 : 1);
  }
  if (mode === 'cellreset') { fs.writeFileSync(OUT, '{}'); console.log('cells file emptied'); process.exit(0); }   // start of a leg (no file is deleted on this tree)
  if (mode === 'cellsum') {
    const all = JSON.parse(fs.readFileSync(OUT, 'utf8')); const cs = Object.keys(all).map(Number).sort((a, b) => a - b);
    const T = {}; DIALS.forEach((d) => T[d] = { up: 0, down: 0, upPts: 0, downPts: 0, netUp: 0, netDown: 0, upKinds: {}, downKinds: {} });
    let lines = 0;
    cs.forEach((c) => { lines += all[c].lines; DIALS.forEach((d) => { const p = all[c].perDial[d], t = T[d];
      ['up', 'down', 'upPts', 'downPts', 'netUp', 'netDown'].forEach((k) => t[k] += p[k]);
      for (const k in p.upKinds) t.upKinds[k] = (t.upKinds[k] || 0) + p.upKinds[k];
      for (const k in p.downKinds) t.downKinds[k] = (t.downKinds[k] || 0) + p.downKinds[k]; }); });
    const pct = (a, b) => (a + b ? Math.round(100 * a / (a + b)) : '-');
    const top = (o) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, 7).map(([k, v]) => `${k} ${v}`).join(' · ');
    console.log(`cells C${cs[0]}–C${cs[cs.length - 1]} (${cs.length} Cycles): ${lines} life lines on the citizens' own cells`);
    DIALS.forEach((d) => { const t = T[d];
      console.log(`  ${d.padEnd(12)} lines ${t.up} / ${t.down} (${pct(t.up, t.down)}% up) | points ${t.upPts} / ${t.downPts} (${pct(t.upPts, t.downPts)}%) | citizen-weeks net up / down ${t.netUp} / ${t.netDown} (${pct(t.netUp, t.netDown)}%)`);
      console.log(`      up: ${top(t.upKinds)}`); console.log(`      down: ${top(t.downKinds)}`); });
    process.exit(0);
  }
  throw new Error('mode: placed | cellcount <c> | cellsum | cellreset');
})().catch((e) => { console.error('FAILED', e && e.message); process.exit(1); });
