// engine.350 bench tool — the one bench for Task 7 (every kind read by what it says) and the bets of Task 8.
// SANDBOX 1004 only: every read and write here is on the bench.
//   snap <name>            the bench ledger's DialState per citizen + Engine_Errors rows -> 2026-11-18-e350-bench-<name>.json
//   count <name> <c...>    the bench's LifeHistory_Log rows of those Cycles: line pushes and points up / down per dial,
//                          by kind, tab against coded pools, the bet lines by size
//   bands <before> <after> citizens who crossed a band, low-band and pinned counts per dial (base and felt value)
//   pulse                  the bench's Dial_Pulse rows
require('/root/GodWorld/lib/env');
const fs = require('fs');
const path = require('path');
const B = '1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA';
if (!process.env.GODWORLD_SHEET_ID || process.env.GODWORLD_SHEET_ID === B) throw new Error('live id missing or equal to the bench');
process.env.GODWORLD_SHEET_ID = B;
const s = require('/root/GodWorld/lib/sheets');
const M = require('/root/GodWorld/utilities/citizenDialMap.js');
const CD = require('/root/GodWorld/lib/citizenDials.js');
const DIALS = M.GRADED_DIALS;
const F = (n) => path.join(__dirname, '2026-11-18-e350-bench-' + n + '.json');

(async () => {
  const mode = process.argv[2];
  if (mode === 'snap') {
    const name = process.argv[3]; if (!name) throw new Error('snap <name>');
    const rows = await s.getSheetAsObjects('Simulation_Ledger');
    const out = { name, citizens: {}, engineErrors: 0, cycle: null };
    rows.forEach((r) => { if (r.POPID && r.DialState) out.citizens[r.POPID] = r.DialState; });
    out.engineErrors = (await s.getSheetData('Engine_Errors')).length - 1;
    const wc = await s.getSheetData('World_Config');
    out.cycle = Number((wc.find((r) => r[0] === 'cycleCount') || [])[1]);
    out.betKeys = ['dialBetMediumPct', 'dialBetLargePct'].map((k) => k + '=' + ((wc.find((r) => r[0] === k) || [])[1] === undefined ? 'absent' : (wc.find((r) => r[0] === k) || [])[1])).join(' ');
    fs.writeFileSync(F(name), JSON.stringify(out));
    console.log(`snap ${name}: cycleCount ${out.cycle}, ${Object.keys(out.citizens).length} citizens with a DialState, Engine_Errors rows ${out.engineErrors}, ${out.betKeys}`);
    process.exit(0);
  }
  if (mode === 'count') {
    const name = process.argv[3]; const cycles = process.argv.slice(4).map(Number);
    if (!name || !cycles.length) throw new Error('count <name> <cycle...>');
    const log = await s.getSheetData('LifeHistory_Log'); const h = log[0], ix = (n) => h.indexOf(n);
    const rows = log.slice(1).filter((r) => cycles.indexOf(Number(r[ix('Cycle')])) >= 0);
    const out = { name, cycles, lines: rows.length, moving: 0, citizens: 0, perDial: {}, kinds: {}, bets: {}, bare: {}, tabLines: 0 };
    DIALS.forEach((d) => out.perDial[d] = { up: 0, down: 0, upPts: 0, downPts: 0, tabUp: 0, tabDown: 0 });
    const pops = new Set();
    for (const r of rows) {
      const full = String(r[ix('EventTag')] || ''); const tag = full.split('|')[0];
      const tab = /\|auth:/.test(full); if (tab) out.tabLines++;
      pops.add(r[ix('POPID')]);
      const fx = M.nudgesForEvent_(tag, 1, r[ix('EventText')]); let moved = false;
      const kind = M.baseTag_(tag); const K = out.kinds[kind] = out.kinds[kind] || { n: 0, up: 0, down: 0 }; K.n++;
      if (/^Casino-(Win|Loss)-[SML]$/.test(tag)) out.bets[tag] = (out.bets[tag] || 0) + 1;
      // the kinds engine.350 cut: a line still written bare is a miss
      if (/^(Work|Media|Education|Education-Cultural|Career|Cultural|Community|Graduation|Stabilized|Casino|Money)$/.test(tag)) {
        out.bare[tag] = out.bare[tag] || { n: 0, ex: [] }; out.bare[tag].n++; if (out.bare[tag].ex.length < 3) out.bare[tag].ex.push(String(r[ix('EventText')]).slice(0, 90));
      }
      for (const d in fx) {
        if (!fx[d] || !out.perDial[d]) continue; moved = true;
        const p = out.perDial[d], up = fx[d] > 0;
        p[up ? 'up' : 'down']++; p[up ? 'upPts' : 'downPts'] += Math.abs(fx[d]); p[(tab ? 'tab' : 'x') + (up ? 'Up' : 'Down')] = (p[(tab ? 'tab' : 'x') + (up ? 'Up' : 'Down')] || 0) + 1;
        K[up ? 'up' : 'down']++;
      }
      if (moved) out.moving++;
    }
    out.citizens = pops.size;
    fs.writeFileSync(F(name), JSON.stringify(out, null, 1));
    console.log(`count ${name} C${cycles[0]}–C${cycles[cycles.length - 1]}: ${out.lines} log lines on ${out.citizens} citizens, ${out.tabLines} from the tab, ${out.moving} move a dial`);
    DIALS.forEach((d) => { const p = out.perDial[d], t = p.up + p.down, tp = p.upPts + p.downPts;
      console.log(`  ${d.padEnd(12)} lines ${p.up} / ${p.down} (${t ? Math.round(100 * p.up / t) : '-'}% up) | points ${p.upPts} / ${p.downPts} (${tp ? Math.round(100 * p.upPts / tp) : '-'}% up)`); });
    console.log('  bets by size: ' + JSON.stringify(out.bets));
    console.log('  bare lines of a cut kind: ' + JSON.stringify(out.bare));
    const top = Object.entries(out.kinds).sort((a, b) => b[1].n - a[1].n).slice(0, 18).map(([k, v]) => `${k} ${v.n} (${v.up}/${v.down})`).join(' · ');
    console.log('  kinds: ' + top);
    process.exit(0);
  }
  if (mode === 'bands') {
    const a = JSON.parse(fs.readFileSync(F(process.argv[3]), 'utf8')), b = JSON.parse(fs.readFileSync(F(process.argv[4]), 'utf8'));
    const D8 = DIALS.filter((d) => d !== 'fandom');
    const base = (js) => { try { return JSON.parse(js).base || null; } catch (e) { return null; } };
    const felt = (js) => { try { return CD.currentDials(js); } catch (e) { return null; } };
    const stat = (get, label) => {
      let both = 0, crossed = 0, moved = 0; const low = {}, vlow = {}, high = {}, pin0 = {}, pin100 = {}, crossBy = {}, mean = {};
      D8.forEach((d) => { low[d] = vlow[d] = high[d] = pin0[d] = pin100[d] = crossBy[d] = 0; mean[d] = 0; });
      let n = 0;
      for (const pop in b.citizens) {
        const y = get(b.citizens[pop]); if (!y) continue; n++;
        D8.forEach((d) => { const v = Number(y[d]); mean[d] += v; if (v < 40) low[d]++; if (v < 20) vlow[d]++; if (v >= 60) high[d]++; if (v <= 0) pin0[d]++; if (v >= 100) pin100[d]++; });
        const x = a.citizens[pop] ? get(a.citizens[pop]) : null; if (!x) continue; both++;
        let c = false, m = false;
        D8.forEach((d) => { if (CD.bandIdx(Number(x[d])) !== CD.bandIdx(Number(y[d]))) { c = true; crossBy[d]++; } if (Math.abs(Number(x[d]) - Number(y[d])) > 1e-9) m = true; });
        if (c) crossed++; if (m) moved++;
      }
      console.log(`bands (${label}) ${a.name} -> ${b.name}: ${both} citizens in both; moved ${moved} (${Math.round(100 * moved / both)}%); crossed a band on any of 8 dials ${crossed} (${Math.round(100 * crossed / both)}%)`);
      D8.forEach((d) => console.log(`  ${d.padEnd(12)} mean ${(mean[d] / n).toFixed(1)} | under 40: ${low[d]} | under 20: ${vlow[d]} | 60 and over: ${high[d]} | at 0: ${pin0[d]} | at 100: ${pin100[d]} | crossed ${crossBy[d]}`));
    };
    stat(base, 'permanent base'); stat(felt, 'felt value');
    console.log(`Engine_Errors rows ${a.engineErrors} -> ${b.engineErrors}; ${b.betKeys}`);
    process.exit(0);
  }
  if (mode === 'cells') {   // the ledger's own life lines of those Cycles, by tag — the lines no log row carries (bets, money)
    const cycles = process.argv.slice(3).map(Number); if (!cycles.length) throw new Error('cells <cycle...>');
    const stamps = cycles.map((c) => 'Y' + (Math.floor((c - 1) / 52) + 1) + 'C' + (((c - 1) % 52) + 1));
    const rows = await s.getSheetAsObjects('Simulation_Ledger');
    const byTag = {}, ex = {}; let n = 0;
    rows.forEach((r) => String(r.LifeHistory || '').split('\n').forEach((ln) => {
      const m = /^(\S+) — \[([^\]]+)\] (.*)$/.exec(ln); if (!m || stamps.indexOf(m[1]) < 0) return; n++;
      if (!/^(Casino|Setback|Money|Work|Media|Education|Career|Personal|Cultural|Community|Graduation|Stabilized)/.test(m[2])) return;
      const k = /^(Work|Media|Education|Career|Personal|Cultural|Community)-/.test(m[2]) ? m[2].replace(/-(Up|Down)-[SML]$/, '-$1').replace(/^([A-Za-z]+)-[A-Za-z]+-(Up|Down)$/, '$1 graded $2') : m[2];
      byTag[k] = (byTag[k] || 0) + 1; if (!ex[k]) ex[k] = m[3].slice(0, 80);
    }));
    console.log(`cells ${stamps.join(',')}: ${n} stamped lines on the ledger`);
    Object.keys(byTag).sort().forEach((k) => console.log(`  ${String(byTag[k]).padStart(5)}  [${k}]  e.g. ${ex[k]}`));
    fs.writeFileSync(F('cells'), JSON.stringify({ stamps, n, byTag, ex }, null, 1));
    process.exit(0);
  }
  if (mode === 'cross') {   // which kinds carry each dial up and down (lines), from the log
    const cycles = process.argv.slice(3).map(Number); if (!cycles.length) throw new Error('cross <cycle...>');
    const log = await s.getSheetData('LifeHistory_Log'); const h = log[0], ix = (n) => h.indexOf(n);
    const rows = log.slice(1).filter((r) => cycles.indexOf(Number(r[ix('Cycle')])) >= 0);
    const X = {}; DIALS.forEach((d) => X[d] = { up: {}, down: {} });
    for (const r of rows) {
      const full = String(r[ix('EventTag')] || ''); const tag = full.split('|')[0];
      const src = /\|auth:rb-1117/.test(full) ? 'tab down pool' : (/\|auth:/.test(full) ? 'tab ' : '') + M.baseTag_(tag);
      const fx = M.nudgesForEvent_(tag, 1, r[ix('EventText')]);
      for (const d in fx) { if (!fx[d] || !X[d]) continue; const b = X[d][fx[d] > 0 ? 'up' : 'down']; b[src] = (b[src] || 0) + 1; }
    }
    const topN = (o) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, 9).map(([k, v]) => `${k} ${v}`).join(' · ');
    console.log(`cross C${cycles[0]}–C${cycles[cycles.length - 1]}: ${rows.length} log lines`);
    DIALS.forEach((d) => { console.log(`  ${d} up: ${topN(X[d].up)}`); console.log(`  ${d} down: ${topN(X[d].down)}`); });
    fs.writeFileSync(F('cross'), JSON.stringify({ cycles, X }, null, 1));
    process.exit(0);
  }
  if (mode === 'pulse') {
    const p = await s.getSheetAsObjects('Dial_Pulse').catch(() => null);
    if (!p || !p.length) { console.log('Dial_Pulse: no rows on the bench'); process.exit(0); }
    console.log('Dial_Pulse cols: ' + Object.keys(p[0]).join(' | '));
    p.forEach((r) => console.log('  ' + Object.values(r).join(' | ')));
    process.exit(0);
  }
  throw new Error('mode: snap | count | bands | cells | cross | pulse');
})().catch((e) => { console.error('FAILED', e && e.message); process.exit(1); });
