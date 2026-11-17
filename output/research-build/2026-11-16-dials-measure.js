// Read-only measurement of the dial system on local ledger copies. No sheet access, no writes.
const fs = require('fs');
const { execSync } = require('child_process');
const E = require('/root/GodWorld/utilities/citizenMemory.js');
const M = require('/root/GodWorld/utilities/citizenDialMap.js');
const ROOT = '/root/GodWorld';
const DIALS = E.DIALS;

function loadLines(txt) { return txt.split('\n').filter(Boolean).map((l) => JSON.parse(l)); }
function loadSnap(ref) {
  const txt = ref ? execSync(`git -C ${ROOT} show ${ref}:output/simulation_ledger_snapshot.jsonl`, { maxBuffer: 1 << 28 }).toString()
                  : fs.readFileSync(`${ROOT}/output/simulation_ledger_snapshot.jsonl`, 'utf8');
  const out = {};
  for (const r of loadLines(txt)) {
    let ds = null;
    try { ds = r.DialState ? JSON.parse(r.DialState) : null; } catch (e) { ds = null; }
    out[r.POPID] = { row: r, ds };
  }
  return out;
}
const band = (v) => E.bandIndex_(v) - 2;
const cur = (ds, d) => Math.max(0, Math.min(100, (ds.base[d] == null ? 50 : ds.base[d]) + ((ds.mood && ds.mood[d]) || 0)));
function stats(a) { const n = a.length; if (!n) return { n: 0 }; const m = a.reduce((x, y) => x + y, 0) / n; const sd = Math.sqrt(a.reduce((x, y) => x + (y - m) * (y - m), 0) / n); const s = a.slice().sort((x, y) => x - y); return { n, mean: +m.toFixed(2), sd: +sd.toFixed(2), p10: +s[Math.floor(n * 0.1)].toFixed(1), p50: +s[Math.floor(n * 0.5)].toFixed(1), p90: +s[Math.floor(n * 0.9)].toFixed(1) }; }

const now = loadSnap(null);
const pops = Object.keys(now);
const live = pops.filter((p) => now[p].ds && now[p].ds.base && !/deceased|dead|departed|emigrat/i.test(String(now[p].row.Status || '')));
console.log('=== A. POPULATION NOW (C116) ===');
console.log('ledger rows', pops.length, '| with DialState', pops.filter((p) => now[p].ds && now[p].ds.base).length, '| measured (not dead/departed)', live.length);
const statusCounts = {}; pops.forEach((p) => { const s = String(now[p].row.Status || '(blank)'); statusCounts[s] = (statusCounts[s] || 0) + 1; });
console.log('status', JSON.stringify(statusCounts));
console.log('\nper dial: BASE stats, and band share of CURRENT (base+mood)  [-2,-1,0,+1,+2]');
for (const d of DIALS) {
  const b = live.map((p) => now[p].ds.base[d] == null ? 50 : now[p].ds.base[d]);
  const bands = [0, 0, 0, 0, 0]; live.forEach((p) => bands[band(cur(now[p].ds, d)) + 2]++);
  const exact50 = b.filter((v) => v === 50).length;
  console.log(d.padEnd(12), JSON.stringify(stats(b)), 'bands%', bands.map((x) => (100 * x / live.length).toFixed(0)).join('/'), 'exactly50:', exact50);
}
// sameness
function vec(p, dials) { return dials.map((d) => band(cur(now[p].ds, d))).join(','); }
const D8 = DIALS.filter((d) => d !== 'fandom');
for (const [label, dl] of [['9 dials', DIALS], ['8 dials (no fandom)', D8]]) {
  const cnt = {}; live.forEach((p) => { const v = vec(p, dl); cnt[v] = (cnt[v] || 0) + 1; });
  const top = Object.entries(cnt).sort((a, b) => b[1] - a[1]);
  const shared = top.filter((t) => t[1] > 1).reduce((x, t) => x + t[1], 0);
  console.log(`\nband-vector sameness (${label}): ${top.length} distinct among ${live.length}; citizens sharing a vector with someone: ${shared} (${(100 * shared / live.length).toFixed(0)}%)`);
  console.log(' top 8:', top.slice(0, 8).map((t) => `[${t[0]}]x${t[1]}`).join('  '));
  const top10 = top.slice(0, 10).reduce((x, t) => x + t[1], 0);
  console.log(` top-10 vectors hold ${top10} citizens (${(100 * top10 / live.length).toFixed(0)}%)`);
}
const offN = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]; live.forEach((p) => { offN[D8.filter((d) => band(cur(now[p].ds, d)) !== 0).length]++; });
console.log('\n# of the 8 dials outside the middle band, per citizen (0..8):', offN.slice(0, 9).join(' / '));
// archetype share from the face
const arch = {}; live.forEach((p) => { const m = /Archetype:([^|]+)/.exec(String(now[p].row.TraitProfile || '')); const a = m ? m[1] : '(none)'; arch[a] = (arch[a] || 0) + 1; });
console.log('archetypes', JSON.stringify(Object.entries(arch).sort((a, b) => b[1] - a[1])));
// by tier
const tierOff = {}; live.forEach((p) => { const t = 'T' + (now[p].row.Tier || '?'); tierOff[t] = tierOff[t] || { n: 0, off: 0 }; tierOff[t].n++; tierOff[t].off += D8.filter((d) => band(cur(now[p].ds, d)) !== 0).length; });
console.log('mean dials outside middle, by Tier:', Object.entries(tierOff).map(([t, v]) => `${t}:${(v.off / v.n).toFixed(2)} (n${v.n})`).join('  '));
// mood/streak presence
let moodAny = 0, streakAny = 0; live.forEach((p) => { const ds = now[p].ds; if (DIALS.some((d) => Math.abs((ds.mood && ds.mood[d]) || 0) >= 0.5)) moodAny++; if (DIALS.some((d) => (ds.streak && ds.streak[d]) || 0)) streakAny++; });
console.log('citizens carrying any mood swing now:', moodAny, '| any live streak:', streakAny);
const foldedHist = {}; live.forEach((p) => { const f = now[p].ds.folded || 0; const k = f >= 116 ? '116' : f >= 115 ? '115' : f >= 113 ? '113-114' : f >= 108 ? '108-112' : f > 0 ? '<108' : 'none'; foldedHist[k] = (foldedHist[k] || 0) + 1; });
console.log('last Cycle an event folded for the citizen:', JSON.stringify(foldedHist));

console.log('\n=== B. MOVEMENT BETWEEN LEDGER COPIES ===');
const refs = [['C115', 'd722b6b3c'], ['C113', '02d94d365'], ['C112', 'ffb3db920'], ['C111', 'a259e770c'], ['C108', '3d1a20fa8']];
for (const [label, ref] of refs) {
  let old; try { old = loadSnap(ref); } catch (e) { console.log(label, 'unreadable'); continue; }
  const both = live.filter((p) => old[p] && old[p].ds && old[p].ds.base);
  let baseMoved = 0, bandChanged = 0, bandChangedBase = 0, curMoved = 0; const perDial = {}; const absBase = [];
  DIALS.forEach((d) => perDial[d] = { moved: 0, sum: 0, up: 0, down: 0, band: 0 });
  both.forEach((p) => {
    let anyB = false, anyBand = false, anyBandBase = false, anyC = false, tot = 0;
    DIALS.forEach((d) => {
      const a = old[p].ds.base[d] == null ? 50 : old[p].ds.base[d], b = now[p].ds.base[d] == null ? 50 : now[p].ds.base[d];
      const dl = b - a; tot += Math.abs(dl);
      if (Math.abs(dl) >= 0.05) { anyB = true; perDial[d].moved++; perDial[d].sum += Math.abs(dl); if (dl > 0) perDial[d].up++; else perDial[d].down++; }
      if (band(a) !== band(b)) { anyBandBase = true; perDial[d].band++; }
      if (band(cur(old[p].ds, d)) !== band(cur(now[p].ds, d))) anyBand = true;
      if (Math.abs(cur(old[p].ds, d) - cur(now[p].ds, d)) >= 0.5) anyC = true;
    });
    absBase.push(tot);
    if (anyB) baseMoved++; if (anyBand) bandChanged++; if (anyBandBase) bandChangedBase++; if (anyC) curMoved++;
  });
  console.log(`\n${label} -> C116  (${both.length} citizens in both)`);
  console.log(`  any base dial moved (>=0.05): ${baseMoved} (${(100 * baseMoved / both.length).toFixed(0)}%) | any felt value moved >=0.5: ${curMoved} (${(100 * curMoved / both.length).toFixed(0)}%)`);
  console.log(`  crossed a band (felt value): ${bandChanged} (${(100 * bandChanged / both.length).toFixed(0)}%) | crossed a band (permanent base): ${bandChangedBase} (${(100 * bandChangedBase / both.length).toFixed(0)}%)`);
  console.log('  total |base move| across 9 dials per citizen:', JSON.stringify(stats(absBase)));
  console.log('  per dial moved/up/down/meanAbs/bandCross:', DIALS.map((d) => `${d}:${perDial[d].moved}/${perDial[d].up}/${perDial[d].down}/${perDial[d].moved ? (perDial[d].sum / perDial[d].moved).toFixed(2) : 0}/${perDial[d].band}`).join('  '));
}

console.log('\n=== C. REFLECTION ROWS (what the wakes and the press put on the ledger) ===');
const ri = loadLines(fs.readFileSync(`${ROOT}/output/beats/Reflection_Intake.jsonl`, 'utf8'));
console.log('rows', ri.length, '| keys', Object.keys(ri[0]).join(','));
const byCycle = {}; ri.forEach((r) => { byCycle[r.Cycle] = (byCycle[r.Cycle] || 0) + 1; });
console.log('rows per Cycle (last 8):', Object.entries(byCycle).sort((a, b) => a[0] - b[0]).slice(-8).map((e) => `C${e[0]}:${e[1]}`).join(' '));
const recent = ri.filter((r) => Number(r.Cycle) >= 114);
const dp = {}; recent.forEach((r) => { dp[r.Daypart] = (dp[r.Daypart] || 0) + 1; }); console.log('C114+ rows by Daypart:', JSON.stringify(dp));
function rowFx(r) { const fx = M.nudgesForReflection_(r.Tag, r.Affect, 0.45, r.ReflectionExcerpt); const o = {}; for (const k in fx) if (fx[k]) o[k] = fx[k] * 0.5; return o; }
for (const [label, set] of [['ALL rows', ri], ['C114+ rows', recent]]) {
  const combo = {}, tagC = {}, affC = {}; let zero = 0; const mag = []; const dialSum = {}; const dialUpDown = {};
  set.forEach((r) => {
    const k = `${r.Tag || '(none)'}|${r.Affect || '(none)'}`; combo[k] = (combo[k] || 0) + 1; tagC[r.Tag || '(none)'] = (tagC[r.Tag || '(none)'] || 0) + 1; affC[r.Affect || '(none)'] = (affC[r.Affect || '(none)'] || 0) + 1;
    const fx = rowFx(r); const ks = Object.keys(fx); if (!ks.length) zero++;
    mag.push(ks.reduce((x, d) => x + Math.abs(fx[d]), 0));
    ks.forEach((d) => { dialSum[d] = (dialSum[d] || 0) + fx[d]; dialUpDown[d] = dialUpDown[d] || [0, 0]; dialUpDown[d][fx[d] > 0 ? 0 : 1]++; });
  });
  console.log(`\n${label}: ${set.length}`);
  console.log('  rows that move NO dial:', zero, `(${(100 * zero / set.length).toFixed(0)}%)`);
  console.log('  total |move| per row (all dials summed, before edge-scaling):', JSON.stringify(stats(mag)));
  console.log('  affect:', Object.entries(affC).sort((a, b) => b[1] - a[1]).map((e) => `${e[0]}:${e[1]}`).join(' '));
  console.log('  event tag top 14:', Object.entries(tagC).sort((a, b) => b[1] - a[1]).slice(0, 14).map((e) => `${e[0]}:${e[1]}`).join(' '));
  console.log('  top 10 pairs:', Object.entries(combo).sort((a, b) => b[1] - a[1]).slice(0, 10).map((e) => `${e[0]}x${e[1]}`).join('  '));
  console.log('  per dial rows up/down and net sum:', Object.keys(dialSum).map((d) => `${d}: ${dialUpDown[d][0]}up/${dialUpDown[d][1]}down net ${dialSum[d].toFixed(1)}`).join(' | '));
}
// per citizen
const perPop = {}; recent.forEach((r) => { perPop[r.POPID] = (perPop[r.POPID] || 0) + 1; });
const allPop = {}; ri.forEach((r) => { allPop[r.POPID] = (allPop[r.POPID] || 0) + 1; });
console.log('\ncitizens with any reflection row ever:', Object.keys(allPop).length, '| in C114+:', Object.keys(perPop).length, 'of', live.length, 'measured');
console.log('rows per citizen C114+ :', JSON.stringify(stats(Object.values(perPop))), '| top 8:', Object.entries(perPop).sort((a, b) => b[1] - a[1]).slice(0, 8).map((e) => `${e[0]}:${e[1]}`).join(' '));
const applied = {}; ri.forEach((r) => { const k = String(r.Applied || '(blank)').toLowerCase(); applied[k] = (applied[k] || 0) + 1; }); console.log('Applied column:', JSON.stringify(applied));

console.log('\n=== D. ENGINE EVENT LINES, C115-C116 (what the engine logged to lives) ===');
const lh = loadLines(fs.readFileSync(`${ROOT}/output/beats/LifeHistory_Log.jsonl`, 'utf8'));
for (const cy of ['115', '116']) {
  const set = lh.filter((r) => String(r.Cycle) === cy);
  const tagC = {}; let zero = 0; const popFx = {}; const popAny = {};
  set.forEach((r) => {
    const tag = String(r.EventTag || '').split('|')[0];
    const fx = M.nudgesForEvent_(tag, 1, r.EventText); const ks = Object.keys(fx).filter((k) => fx[k]);
    const base = M.baseTag_ ? M.baseTag_(tag) : tag;
    tagC[base] = tagC[base] || { n: 0, moving: 0 }; tagC[base].n++; if (ks.length) tagC[base].moving++; else zero++;
    popAny[r.POPID] = true; if (ks.length) { popFx[r.POPID] = popFx[r.POPID] || {}; ks.forEach((d) => popFx[r.POPID][d] = (popFx[r.POPID][d] || 0) + fx[d]); }
  });
  const netMag = Object.values(popFx).map((f) => Object.values(f).reduce((x, y) => x + Math.abs(y), 0));
  const up = {}, down = {}; Object.values(popFx).forEach((f) => { for (const d in f) { if (f[d] > 0) up[d] = (up[d] || 0) + 1; else if (f[d] < 0) down[d] = (down[d] || 0) + 1; } });
  console.log(`\nC${cy}: ${set.length} lines on ${Object.keys(popAny).length} citizens; lines that move no dial: ${zero} (${(100 * zero / Math.max(1, set.length)).toFixed(0)}%); citizens with a dial-moving line: ${Object.keys(popFx).length}`);
  console.log('  net |push| per moved citizen:', JSON.stringify(stats(netMag)));
  console.log('  citizens pushed up/down per dial:', DIALS.map((d) => `${d}:${up[d] || 0}/${down[d] || 0}`).join('  '));
  console.log('  kinds (n / moving):', Object.entries(tagC).sort((a, b) => b[1].n - a[1].n).slice(0, 30).map((e) => `${e[0]}:${e[1].n}/${e[1].moving}`).join('  '));
}
