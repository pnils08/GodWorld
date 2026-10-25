// engine.297 fame receipt (plan 2026-10-16 Task 9 + builder 2026-10-17): read-only. Compares a sheet's Cultural_Ledger against
// the C112 baseline (BASELINE-1004-C112b = the bench after every reset) over the window <from>..<cycle>:
//   sighted = rows whose LastSeenCycle (digits) falls in the window; new = rows whose CUL-ID the baseline lacks.
// HOLD when: a new row was minted by the sighting path (FirstRefSource SystemEngine) for a name that is no living citizen on the
// sheet's Simulation_Ledger (active / retired — the A's / legend paths mint a row the first time a ledger player is seen); any of
// the 42 retired literal pool names appears in a new row; a row sighted THIS cycle was Inactive at the baseline, or links (POP-)
// to a citizen who is not living on the ledger now; or (end of a roll, --final) no pre-existing non-athlete row was sighted at
// all. FameCategory / Neighborhood rewrites are the registration's own refresh (culturalLedger.js :270/:275) — not judged.
// engine.313 (2026-10-24, codex plan review F3/F4): HOLD when a new personal row (not FameCategory dynasty / RoleType Institution, the same
// test on both sides) carries a POPID a baseline personal row (or another new personal row) already carries — one citizen, two fame rows;
// a new dynasty and blank links never match. --e313: each baseline row named differently from its citizen is checked against Riley_Digest
// FamousPeople — when the citizen's ledger name was sighted in a Cycle of the window (only the fame bridge sights that spelling), the row
// must still be there under its CUL-ID and Name with LastSeenCycle >= that Cycle; with --final, no such sighting at all = coverage HOLD.
// Writes nothing to any sheet; saves output/engine-sheet/2026-10-22-e297-check-<label>-c<cycle>.json.
// usage: node 2026-10-22-e297-check.js <cycle> <label> [--from <first>] [--final] [--base <file.json>]   (label `ctl`/`F<n>` read the bench;
//        `live` reads live — pass --base output/engine-sheet/2026-10-22-e297-live-cultural-c112.json, the live pre-C113 snapshot) [--e313]
require('/root/GodWorld/lib/env');
const LIVE = process.env.GODWORLD_SHEET_ID;
const BENCH = '1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA', BASE = '1Mbz-sE13iu1RU4qo-rzsczjjPRKAU-KSfnQnrJNXCgA';
if (LIVE === BENCH || LIVE === BASE) throw new Error('env already points at a bench sheet');
const fs = require('fs');
const O = '/root/GodWorld/output/engine-sheet/';
const cyc = Number(process.argv[2]), label = process.argv[3];
const fi = process.argv.indexOf('--from'), from = fi > 0 ? Number(process.argv[fi + 1]) : cyc;
const final = process.argv.includes('--final'), e313 = process.argv.includes('--e313');
if (!(cyc >= 113) || !label || !(from <= cyc)) throw new Error('usage: <cycle> <label> [--from <first>] [--final]');
const SHEET = label === 'live' ? LIVE : BENCH;
const OLD = JSON.parse('[' + /const oldNames = \[([^\]]+)\]/.exec(fs.readFileSync('/root/GodWorld/scripts/sportsWeekCity.test.js', 'utf8'))[1] + ']');
if (OLD.length !== 42) throw new Error('expected the 42 retired pool names, read ' + OLD.length);
async function tab(id, name) {
  process.env.GODWORLD_SHEET_ID = id; delete require.cache[require.resolve('/root/GodWorld/lib/sheets')];
  return require('/root/GodWorld/lib/sheets').getSheetData(name);
}
const BUCKETED = /^(actor|musician|influencer|journalist|chef|streamer|author|civic-figure|activist|business-figure|artist|curator|dancer|community-leader|cultural-leader|cultural-figure)$/;
(async () => {
  // --base <file.json>: a saved Cultural_Ledger (e.g. the live C112 snapshot 2026-10-22-e297-live-cultural-c112.json) instead of the bench baseline sheet
  const bi = process.argv.indexOf('--base');
  const base = bi > 0 ? JSON.parse(fs.readFileSync(process.argv[bi + 1], 'utf8')) : await tab(BASE, 'Cultural_Ledger'), now = await tab(SHEET, 'Cultural_Ledger'), led = await tab(SHEET, 'Simulation_Ledger');
  const bh = base[0], h = now[0], c = n => h.indexOf(n), L = led[0], lc = n => L.indexOf(n);
  const seen = v => Number(String(v || '').replace(/[^0-9]/g, '')) || 0;
  const baseById = {};
  for (const r of base.slice(1)) baseById[String(r[bh.indexOf('CUL-ID')]).trim()] = r;
  const living = {}, livingName = {};
  for (const r of led.slice(1)) {
    const st = String(r[lc('Status')] || '').trim();
    if (!/^(active|retired)$/i.test(st)) continue;
    living[String(r[lc('POPID')]).trim().toUpperCase()] = r;
    livingName[(String(r[lc('First')] || '') + ' ' + String(r[lc('Last')] || '')).trim().toLowerCase()] = r;
  }
  const out = { cycle: cyc, from, label, sheet: label === 'live' ? 'live' : 'bench 1004', rows: now.length - 1, baseRows: base.length - 1,
    sighted: [], minted: [], hold: [], note: [], e313: [] };
  // engine.313: personal = not a family institution, judged the same way on the baseline and the sheet
  const personal = (cat, role) => !/^dynasty$/i.test(String(cat || '').trim()) && !/^institution$/i.test(String(role || '').trim());
  const popOf = v => { const x = String(v || '').trim().toUpperCase(); return x.indexOf('POP-') === 0 ? x : ''; };
  const basePersonalByPop = {};
  for (const r of base.slice(1)) {
    const p = popOf(r[bh.indexOf('UniverseLinks')]);
    if (p && personal(r[bh.indexOf('FameCategory')], r[bh.indexOf('RoleType')]))
      (basePersonalByPop[p] = basePersonalByPop[p] || []).push(String(r[bh.indexOf('CUL-ID')]).trim() + ' "' + String(r[bh.indexOf('Name')] || '').trim() + '"');
  }
  const newPersonalByPop = {};
  for (const r of now.slice(1)) {
    const id = String(r[c('CUL-ID')]).trim(), name = String(r[c('Name')] || '').trim(), ls = seen(r[c('LastSeenCycle')]);
    const b = baseById[id], link = String(r[c('UniverseLinks')] || '').trim().toUpperCase();
    if (!b) {
      const src = String(r[c('FirstRefSource')] || '').trim();
      const m = { id, name, role: String(r[c('RoleType')] || ''), src, lastSeen: ls, link };
      out.minted.push(m);
      if (OLD.includes(name)) out.hold.push('new row ' + id + ' carries a retired literal name: ' + name);
      if (src === 'SystemEngine' && !livingName[name.toLowerCase()]) out.hold.push('sighting minted ' + id + ' "' + name + '" — no living citizen by that name');
      const np = popOf(link);
      if (np && personal(r[c('FameCategory')], r[c('RoleType')])) {
        const prior = (basePersonalByPop[np] || []).concat(newPersonalByPop[np] || []);
        if (prior.length) out.hold.push('engine.313: new row ' + id + ' "' + name + '" doubles ' + np + ' — already ' + prior.join(', '));
        (newPersonalByPop[np] = newPersonalByPop[np] || []).push(id + ' "' + name + '"');
      }
      continue;
    }
    if (ls < from || ls > cyc) continue;
    const bs = String(b[bh.indexOf('Status')] || '').trim(), bcat = String(b[bh.indexOf('FameCategory')] || '').trim().toLowerCase();
    const bFame = Number(b[bh.indexOf('FameScore')]) || 0, fame = Number(r[c('FameScore')]) || 0;
    const s = { id, name, lastSeen: ls, baseCategory: bcat, role: String(r[c('RoleType')] || ''), fame: bFame + '→' + fame, link,
      bucket: BUCKETED.test(bcat) || BUCKETED.test(String(b[bh.indexOf('RoleType')] || '').trim().toLowerCase().replace(/\s+/g, '-')) };
    out.sighted.push(s);
    if (ls === cyc && !/^active$/i.test(bs)) out.hold.push(id + ' ' + name + ' sighted C' + cyc + ' but was ' + (bs || 'blank') + ' at the baseline');
    if (ls === cyc && link.indexOf('POP-') === 0 && !living[link]) out.hold.push(id + ' ' + name + ' sighted C' + cyc + ' but ' + link + ' is not living on the ledger');
    if (ls === cyc && !s.bucket && !/^(athlete|sports-figure)$/.test(bcat) && !/player|legend|athlete|coach|manager/i.test(s.role))
      out.hold.push(id + ' ' + name + ' sighted C' + cyc + ' outside every pool (no bucket category, not the A\'s / legend path)');
    if (fame < bFame + 5) out.note.push(id + ' ' + name + ' sighted, FameScore ' + bFame + '→' + fame + ' (under +5: a dim or decay rode the window)');
  }
  const bucketHits = out.sighted.filter(s => s.bucket).length;
  out.bucketSighted = bucketHits;
  if (final && bucketHits === 0) out.hold.push('no pre-existing non-athlete Cultural_Ledger row sighted across C' + from + '..' + cyc);
  if (e313) {
    const nameByPop = {};
    for (const r of led.slice(1)) nameByPop[String(r[lc('POPID')]).trim().toUpperCase()] = (String(r[lc('First')] || '') + ' ' + String(r[lc('Last')] || '')).trim();
    const dig = await tab(SHEET, 'Riley_Digest'), dh = dig[0], famousIn = {};
    for (const r of dig.slice(1)) {
      const cy = Number(r[dh.indexOf('Cycle')]) || 0;
      if (cy >= from && cy <= cyc) famousIn[cy] = String(r[dh.indexOf('FamousPeople')] || '').split(',').map(x => x.trim()).filter(Boolean);
    }
    const nowById = {};
    for (const r of now.slice(1)) nowById[String(r[c('CUL-ID')]).trim()] = r;
    for (const b of base.slice(1)) {
      const p = popOf(b[bh.indexOf('UniverseLinks')]), bName = String(b[bh.indexOf('Name')] || '').trim(), id = String(b[bh.indexOf('CUL-ID')]).trim();
      if (!p || !personal(b[bh.indexOf('FameCategory')], b[bh.indexOf('RoleType')]) || !nameByPop[p] || nameByPop[p] === bName) continue;
      for (const cy of Object.keys(famousIn).map(Number).sort((x, y) => x - y)) {
        if (!famousIn[cy].includes(nameByPop[p])) continue;
        const r = nowById[id], ls = r ? seen(r[c('LastSeenCycle')]) : 0;
        const ok = !!r && String(r[c('Name')] || '').trim() === bName && ls >= cy;
        out.e313.push({ cycle: cy, citizen: nameByPop[p], pop: p, row: id + ' "' + bName + '"', lastSeen: ls, ok });
        if (!ok) out.hold.push('engine.313: ' + nameByPop[p] + ' sighted C' + cy + ' but ' + id + ' "' + bName + '" was not reached (LastSeenCycle ' + ls + (r ? '' : ', row gone') + ')');
      }
    }
    if (final && !out.e313.length) out.hold.push('engine.313 coverage: no citizen whose fame row is named differently was sighted across C' + from + '..' + cyc + ' — the fallback was never exercised');
  }
  out.verdict = out.hold.length ? 'HOLD' : 'PASS';
  fs.writeFileSync(O + '2026-10-22-e297-check-' + label + '-c' + cyc + '.json', JSON.stringify(out, null, 1));
  console.log('e297 ' + label + ' C' + (from < cyc ? from + '..' : '') + cyc + ' ' + out.verdict + ' | rows ' + out.baseRows + '→' + out.rows +
    ' | sighted ' + out.sighted.length + ' (ledger buckets ' + bucketHits + ') | minted ' + out.minted.length);
  for (const s of out.sighted) console.log('  seen C' + s.lastSeen + ' ' + s.name + ' [' + (s.baseCategory || '-') + (s.bucket ? ', bucket' : '') + '] fame ' + s.fame);
  for (const m of out.minted) console.log('  new  ' + m.id + ' ' + m.name + ' (' + m.role + ') src ' + m.src + ' C' + m.lastSeen);
  for (const n of out.note) console.log('  note ' + n);
  for (const x of out.e313) console.log('  e313 C' + x.cycle + ' ' + x.citizen + ' → ' + x.row + ' last seen C' + x.lastSeen + (x.ok ? ' ok' : ' MISSED'));
  for (const x of out.hold) console.log('  HOLD ' + x);
  process.exit(out.hold.length ? 1 : 0);
})().catch(e => { console.error(e.message); process.exit(2); });
