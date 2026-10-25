// engine.297 fame receipt (plan 2026-10-16 Task 9 + builder 2026-10-17): read-only. Compares a sheet's Cultural_Ledger against
// the C112 baseline (BASELINE-1004-C112b = the bench after every reset) over the window <from>..<cycle>:
//   sighted = rows whose LastSeenCycle (digits) falls in the window; new = rows whose CUL-ID the baseline lacks.
// HOLD when: a new row was minted by the sighting path (FirstRefSource SystemEngine) for a name that is no living citizen on the
// sheet's Simulation_Ledger (active / retired — the A's / legend paths mint a row the first time a ledger player is seen); any of
// the 42 retired literal pool names appears in a new row; a row sighted THIS cycle was Inactive at the baseline, or links (POP-)
// to a citizen who is not living on the ledger now; or (end of a roll, --final) no pre-existing non-athlete row was sighted at
// all. Neighborhood rewrites are the registration's own refresh — not judged. engine.315 (2026-10-25): a pre-existing row whose authored
// FameCategory (not blank / unknown) or its CulturalDomain differs from the baseline → HOLD. engine.314: a new row whose HolidayPriority
// equals its Holiday, or whose SportsSeason carries a joined calendar string (", ") → HOLD (the positional repeat-write signature).
// engine.313 (2026-10-24, codex plan review F3/F4; diff gate 2026-10-25): HOLD when a new personal row (not FameCategory dynasty / RoleType
// Institution, the same test on both sides) carries a POPID (canonical POP-ddddd only) a baseline personal row or an earlier new personal row
// already carries — one citizen, two fame rows; a new dynasty, blank and malformed links never match. --e313 binds, per Cycle, a citizen-name
// sighting to the row it reached: for each baseline personal row named differently from its citizen, when this Cycle's Riley_Digest
// FamousPeople carries the citizen's ledger spelling (the ledger-name pools — fame bridge, A's players, legends — sight and register under
// it) and not the row's own label, the row must keep its CUL-ID and Name, read LastSeenCycle = this Cycle, and carry MediaCount up by exactly
// the number of those sightings over the previous Cycle's receipt (C<from>: the baseline) — only the registrar writes MediaCount. Run it after
// every fire: a missing previous receipt is a HOLD. With --final, no bound sighting across the window's receipts = coverage HOLD.
// E297_FIXTURES=<dir> reads <dir>/{base,now}-<tab>.json instead of the sheets and E297_OUT=<dir> moves the saved receipt (the fixture test).
// Writes nothing to any sheet; saves output/engine-sheet/2026-10-22-e297-check-<label>-c<cycle>.json.
// usage: node 2026-10-22-e297-check.js <cycle> <label> [--from <first>] [--final] [--base <file.json>]   (label `ctl`/`F<n>` read the bench;
//        `live` reads live — pass --base output/engine-sheet/2026-10-22-e297-live-cultural-c112.json, the live pre-C113 snapshot) [--e313]
require('/root/GodWorld/lib/env');
const LIVE = process.env.GODWORLD_SHEET_ID;
const BENCH = '1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA', BASE = '1Mbz-sE13iu1RU4qo-rzsczjjPRKAU-KSfnQnrJNXCgA';
if (LIVE === BENCH || LIVE === BASE) throw new Error('env already points at a bench sheet');
const fs = require('fs');
const O = process.env.E297_OUT ? process.env.E297_OUT.replace(/\/?$/, '/') : '/root/GodWorld/output/engine-sheet/';
const cyc = Number(process.argv[2]), label = process.argv[3];
const fi = process.argv.indexOf('--from'), from = fi > 0 ? Number(process.argv[fi + 1]) : cyc;
const final = process.argv.includes('--final'), e313 = process.argv.includes('--e313');
if (!(cyc >= 113) || !label || !(from <= cyc)) throw new Error('usage: <cycle> <label> [--from <first>] [--final]');
const SHEET = label === 'live' ? LIVE : BENCH;
const OLD = JSON.parse('[' + /const oldNames = \[([^\]]+)\]/.exec(fs.readFileSync('/root/GodWorld/scripts/sportsWeekCity.test.js', 'utf8'))[1] + ']');
if (OLD.length !== 42) throw new Error('expected the 42 retired pool names, read ' + OLD.length);
async function tab(id, name) {
  if (process.env.E297_FIXTURES) return JSON.parse(fs.readFileSync(process.env.E297_FIXTURES + '/' + (id === BASE ? 'base' : 'now') + '-' + name + '.json', 'utf8'));
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
    sighted: [], minted: [], hold: [], note: [], e313: [], e313state: {} };
  // engine.313: personal = not a family institution, judged the same way on the baseline and the sheet
  const personal = (cat, role) => !/^dynasty$/i.test(String(cat || '').trim()) && !/^institution$/i.test(String(role || '').trim());
  const popOf = v => { const x = String(v || '').trim().toUpperCase(); return /^POP-\d{5}$/.test(x) ? x : ''; };
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
      const hol = String(r[c('Holiday')] || '').trim(), hpri = String(r[c('HolidayPriority')] || '').trim(), sea = String(r[c('SportsSeason')] || '');
      if ((hpri && hpri === hol) || sea.indexOf(', ') >= 0)
        out.hold.push('engine.314: new row ' + id + ' "' + name + '" calendar columns written by position — Holiday "' + hol + '", HolidayPriority "' + hpri + '", SportsSeason "' + sea + '"');
      if (src === 'SystemEngine' && !livingName[name.toLowerCase()]) out.hold.push('sighting minted ' + id + ' "' + name + '" — no living citizen by that name');
      const np = popOf(link);
      if (np && personal(r[c('FameCategory')], r[c('RoleType')])) {
        const prior = (basePersonalByPop[np] || []).concat(newPersonalByPop[np] || []);
        if (prior.length) out.hold.push('engine.313: new row ' + id + ' "' + name + '" doubles ' + np + ' — already ' + prior.join(', '));
        (newPersonalByPop[np] = newPersonalByPop[np] || []).push(id + ' "' + name + '"');
      }
      continue;
    }
    const bCat = String(b[bh.indexOf('FameCategory')] || '').trim(), bDom = String(b[bh.indexOf('CulturalDomain')] || '').trim();
    const nCat = String(r[c('FameCategory')] || '').trim(), nDom = String(r[c('CulturalDomain')] || '').trim();
    if (bCat && bCat.toLowerCase() !== 'unknown' && (nCat !== bCat || (bDom && nDom !== bDom)))
      out.hold.push('engine.315: ' + id + ' "' + name + '" authored ' + bCat + '/' + bDom + ' rewritten to ' + nCat + '/' + nDom);
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
    const nameByPop = {};   // living citizens only (active / retired) — the pools that sight a ledger spelling admit no one else
    for (const r of led.slice(1)) if (/^(active|retired)$/i.test(String(r[lc('Status')] || '').trim()))
      nameByPop[String(r[lc('POPID')]).trim().toUpperCase()] = (String(r[lc('First')] || '') + ' ' + String(r[lc('Last')] || '')).trim();
    const mcOf = v => (v === '' || v === null || v === undefined || !Number.isFinite(Number(v))) ? null : Number(v);
    const dig = await tab(SHEET, 'Riley_Digest'), dh = dig[0];
    const digRow = dig.slice(1).filter(r => (Number(r[dh.indexOf('Cycle')]) || 0) === cyc).pop();
    const famous = digRow ? String(digRow[dh.indexOf('FamousPeople')] || '').split(',').map(x => x.trim()).filter(Boolean) : null;
    if (!famous) out.hold.push('engine.313: no Riley_Digest row for C' + cyc);
    const priorFile = n => O + '2026-10-22-e297-check-' + label + '-c' + n + '.json';
    let prior = null;
    if (cyc > from) {
      // the previous receipt counts only as this leg's PASS for the Cycle before (codex gate 2: no reuse across labels / windows / verdicts)
      const pj = fs.existsSync(priorFile(cyc - 1)) ? JSON.parse(fs.readFileSync(priorFile(cyc - 1), 'utf8')) : null;
      if (pj && pj.e313state && pj.cycle === cyc - 1 && pj.label === label && pj.from === from && pj.verdict === 'PASS') prior = pj.e313state;
      else out.hold.push('engine.313: no PASS C' + (cyc - 1) + ' ' + label + ' receipt (from C' + from + ') with e313state — ' +
        (pj ? 'found ' + [pj.label, 'C' + pj.cycle, 'from C' + pj.from, pj.verdict].join(' / ') : 'missing') + '; the per-Cycle binding needs the receipt after every fire');
    }
    const nowById = {};
    for (const r of now.slice(1)) nowById[String(r[c('CUL-ID')]).trim()] = r;
    for (const b of base.slice(1)) {
      const p = popOf(b[bh.indexOf('UniverseLinks')]), bName = String(b[bh.indexOf('Name')] || '').trim(), id = String(b[bh.indexOf('CUL-ID')]).trim();
      if (!p || !personal(b[bh.indexOf('FameCategory')], b[bh.indexOf('RoleType')]) || !nameByPop[p] || nameByPop[p] === bName) continue;
      const r = nowById[id];
      const st = { mediaCount: r ? mcOf(r[c('MediaCount')]) : null, lastSeen: r ? seen(r[c('LastSeenCycle')]) : null, name: r ? String(r[c('Name')] || '').trim() : null };
      out.e313state[id] = st;
      if (!famous) continue;
      const byCitizen = famous.filter(n => n === nameByPop[p]).length, byLabel = famous.filter(n => n === bName).length;
      if (!byCitizen) continue;
      const was = cyc === from ? { mediaCount: mcOf(b[bh.indexOf('MediaCount')]) } : (prior && prior[id]);
      const e = { cycle: cyc, citizen: nameByPop[p], pop: p, row: id + ' "' + bName + '"', lastSeen: st.lastSeen,
        mediaCount: (was ? was.mediaCount : '?') + '→' + st.mediaCount, bound: false };
      if (byLabel) { e.why = 'its own label was sighted this Cycle too — not attributable'; out.e313.push(e); out.note.push('engine.313: ' + e.citizen + ' and ' + e.row + ' both sighted C' + cyc + ' — not bound'); continue; }
      if (!r || st.name !== bName) e.why = r ? 'renamed to "' + st.name + '"' : 'row gone';
      else if (st.lastSeen !== cyc) e.why = 'LastSeenCycle ' + st.lastSeen;
      else if (!was || was.mediaCount === null || st.mediaCount === null) e.why = 'MediaCount not a number (prior ' + (was ? was.mediaCount : 'none') + ', now ' + st.mediaCount + ')';
      else if (st.mediaCount - was.mediaCount !== byCitizen) e.why = 'MediaCount ' + e.mediaCount + ' for ' + byCitizen + ' sighting(s)';
      else e.bound = true;
      out.e313.push(e);
      if (!e.bound) out.hold.push('engine.313: ' + e.citizen + ' sighted C' + cyc + ' but ' + e.row + ' was not reached (' + e.why + ')');
    }
    if (final) {
      let bound = out.e313.filter(x => x.bound).length;
      for (let n = from; n < cyc; n++) {
        if (!fs.existsSync(priorFile(n))) continue;
        const pj = JSON.parse(fs.readFileSync(priorFile(n), 'utf8'));
        if (pj.cycle === n && pj.label === label && pj.from === from && pj.verdict === 'PASS') bound += (pj.e313 || []).filter(x => x.bound).length;
      }
      if (!bound) out.hold.push('engine.313 coverage: no citizen-name sighting bound to a differently named row across C' + from + '..' + cyc + ' — the fallback was never exercised');
    }
  }
  out.verdict = out.hold.length ? 'HOLD' : 'PASS';
  fs.writeFileSync(O + '2026-10-22-e297-check-' + label + '-c' + cyc + '.json', JSON.stringify(out, null, 1));
  console.log('e297 ' + label + ' C' + (from < cyc ? from + '..' : '') + cyc + ' ' + out.verdict + ' | rows ' + out.baseRows + '→' + out.rows +
    ' | sighted ' + out.sighted.length + ' (ledger buckets ' + bucketHits + ') | minted ' + out.minted.length);
  for (const s of out.sighted) console.log('  seen C' + s.lastSeen + ' ' + s.name + ' [' + (s.baseCategory || '-') + (s.bucket ? ', bucket' : '') + '] fame ' + s.fame);
  for (const m of out.minted) console.log('  new  ' + m.id + ' ' + m.name + ' (' + m.role + ') src ' + m.src + ' C' + m.lastSeen);
  for (const n of out.note) console.log('  note ' + n);
  for (const x of out.e313) console.log('  e313 C' + x.cycle + ' ' + x.citizen + ' → ' + x.row + ' last seen C' + x.lastSeen + ', MediaCount ' + x.mediaCount + (x.bound ? ' bound' : ' NOT BOUND: ' + x.why));
  for (const x of out.hold) console.log('  HOLD ' + x);
  process.exit(out.hold.length ? 1 : 0);
})().catch(e => { console.error(e.message); process.exit(2); });
