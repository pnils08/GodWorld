// engine.308 heritage receipt for one fire (plan §engine.308 design + builder 2026-10-22): read-only, stateless. Reads Heritage_Ledger,
// Business_Ledger and Simulation_Ledger and, per line: status, tier, living, the minted list, every firm a living member owns by
// Key_Personnel (the engine's own parseKeyPersonnelOwners_ / resolveOwnerRow_, loaded from phase05-citizens/generationalWealthEngine.js),
// bizCount (what the standing counts), cap (heritageLineBizCap_), LastBizOpenedCycle, and the openings: a member's LifeHistory
// `Y<n>C<m> — [Heritage] opened <Name>` stamp = <cycle>. Rules for each opening at <cycle>: bizCount − (openings this cycle) < cap; the
// previous opening (latest earlier stamp in the line) is ≥ 12 cycles back or none; the staker owned < 2 firms before; the column reads
// <cycle>. Varek (LIN-00005) opens nothing. With the column armed, a line with a stamp carries LastBizOpenedCycle = its latest stamp.
// Writes nothing to any sheet; saves output/engine-sheet/2026-10-22-e308-check-<label>-c<cycle>.json.
// usage: node 2026-10-22-e308-check.js <cycle> <label> [--from <first-cycle>]   (label `live` reads the live sheet; --from lists
//        openings from <first-cycle>..<cycle> — a control read over a roll; the cap rule is then judged on the end state only)
require('/root/GodWorld/lib/env');
const LIVE = process.env.GODWORLD_SHEET_ID;
const BENCH = '1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA', BASE = '1Mbz-sE13iu1RU4qo-rzsczjjPRKAU-KSfnQnrJNXCgA';
if (LIVE === BENCH || LIVE === BASE) throw new Error('env already points at a bench sheet');
const fs = require('fs');
const O = '/root/GodWorld/output/engine-sheet/';
const cyc = Number(process.argv[2]), label = process.argv[3];
const fi = process.argv.indexOf('--from'), from = fi > 0 ? Number(process.argv[fi + 1]) : cyc;
if (!(cyc >= 113) || !label || !(from <= cyc)) throw new Error('usage: <cycle> <label> [--from <first-cycle>]');
const SHEET = label === 'live' ? LIVE : BENCH;
if (label === 'live' && !LIVE) throw new Error('env does not point at live');
const E = new Function(fs.readFileSync('/root/GodWorld/phase05-citizens/generationalWealthEngine.js', 'utf8') +
  '\nreturn { parse: parseKeyPersonnelOwners_, resolve: resolveOwnerRow_, key: ownerNameKey_, cap: heritageLineBizCap_, ROLL: HERITAGE_BIZ_ROLL, CITIZEN_CAP: HERITAGE_BIZ_CITIZEN_CAP, COOLDOWN: HERITAGE_BIZ_COOLDOWN };')();
async function tab(id, name) {
  process.env.GODWORLD_SHEET_ID = id; delete require.cache[require.resolve('/root/GodWorld/lib/sheets')];
  return require('/root/GodWorld/lib/sheets').getSheetData(name);
}
const STAMP = /Y(\d+)C(\d+) — \[Heritage\] opened (.+?) in /g;
(async () => {
  const [hl, bl, led] = [await tab(SHEET, 'Heritage_Ledger'), await tab(SHEET, 'Business_Ledger'), await tab(SHEET, 'Simulation_Ledger')];
  const H = hl[0], hc = n => H.indexOf(n), B = bl[0], L = led[0], lc = n => L.indexOf(n);
  const rowByPop = {}, rowByPopLiving = {}, rowByNameLiving = {};
  for (const r of led.slice(1)) {
    const p = String(r[lc('POPID')] || '').trim(); if (!p) continue;
    rowByPop[p] = r;
    if (String(r[lc('Status')] || 'active').toLowerCase() === 'deceased') continue;
    rowByPopLiving[p] = r;
    const k = E.key((r[lc('First')] || '') + ' ' + (r[lc('Last')] || '')); if (k && !rowByNameLiving[k]) rowByNameLiving[k] = r;
  }
  const ownedByPop = {}, active = {};
  for (const r of bl.slice(1)) {
    const id = String(r[B.indexOf('BIZ_ID')] || '').trim(); if (!id) continue;
    active[id] = String(r[B.indexOf('Name')] || '');
    for (const en of E.parse(r[B.indexOf('Key_Personnel')])) {
      if (!en.owner) continue;
      const row = E.resolve(en, rowByPopLiving, rowByNameLiving); if (!row) continue;
      const p = String(row[lc('POPID')]).trim(); (ownedByPop[p] = ownedByPop[p] || new Set()).add(id);
    }
  }
  const out = { cycle: cyc, from, label, sheet: label === 'live' ? 'live' : 'bench 1004', columnArmed: hc('LastBizOpenedCycle') >= 0, lines: [], openings: [], hold: [] };
  for (const r of hl.slice(1)) {
    const lin = String(r[hc('LineageId')] || '').trim(); if (!lin) continue;
    let members = []; try { members = JSON.parse(String(r[hc('MembersList')] || '[]')); } catch (e) {}
    let minted = []; try { minted = JSON.parse(String(r[hc('BusinessesOwned')] || '[]')); } catch (e) {}
    const tier = String(r[hc('HeritageTier')] || ''), living = Number(r[hc('LivingMembers')]) || 0, status = String(r[hc('Status')] || '');
    const set = new Set(minted.filter(id => active[id]));
    const stamps = [];
    for (const m of members) {
      const p = String(m).trim(); if (rowByPopLiving[p]) for (const id of ownedByPop[p] || []) set.add(id);
      const row = rowByPop[p]; if (!row) continue;
      let x; STAMP.lastIndex = 0;
      while ((x = STAMP.exec(String(row[lc('LifeHistory')] || ''))) !== null) stamps.push({ cycle: (Number(x[1]) - 1) * 52 + Number(x[2]), pop: p, name: x[3] });
    }
    stamps.sort((a, b) => a.cycle - b.cycle);
    const cap = E.ROLL[tier] ? E.cap(living, tier) : null;
    const lastOpen = out.columnArmed ? (r[hc('LastBizOpenedCycle')] === '' ? null : Number(r[hc('LastBizOpenedCycle')])) : undefined;
    const latest = stamps.length ? stamps[stamps.length - 1].cycle : null;
    const rec = { lin, family: String(r[hc('FamilyName')] || ''), status, tier, living, minted, bizCount: set.size, cap, lastOpen, latestStamp: latest };
    out.lines.push(rec);
    if (out.columnArmed && latest !== null && lastOpen !== latest) out.hold.push(lin + ' LastBizOpenedCycle ' + lastOpen + ' != latest stamp ' + latest);
    const openedNow = stamps.filter(s => s.cycle >= from && s.cycle <= cyc);
    for (const s of openedNow) {
      const prior = stamps.filter(t => t.cycle < s.cycle).map(t => t.cycle);
      const prevOpen = prior.length ? Math.max(...prior) : null;
      const sameCycle = stamps.filter(t => t.cycle === s.cycle).length;
      const later = stamps.filter(t => t.cycle > s.cycle).length;
      const stakerOwned = (ownedByPop[s.pop] ? ownedByPop[s.pop].size : 0) - stamps.filter(t => t.pop === s.pop && t.cycle >= s.cycle).length;
      const o = { lin, family: rec.family, cycle: s.cycle, staker: s.pop, name: s.name, prevOpen, gap: prevOpen === null ? null : s.cycle - prevOpen,
        countBefore: set.size - sameCycle - later, cap, stakerOwnedBefore: stakerOwned };
      out.openings.push(o);
      if (o.gap !== null && o.gap < E.COOLDOWN) out.hold.push(lin + ' opened C' + s.cycle + ' only ' + o.gap + ' cycles after C' + prevOpen);
      if (cap !== null && o.countBefore >= cap) out.hold.push(lin + ' opened C' + s.cycle + ' at ' + o.countBefore + ' firms >= cap ' + cap + (from < cyc ? ' (end-state cap)' : ''));
      if (o.stakerOwnedBefore >= E.CITIZEN_CAP) out.hold.push(lin + ' staker ' + s.pop + ' owned ' + o.stakerOwnedBefore + ' firms before C' + s.cycle);
      if (lin === 'LIN-00005') out.hold.push('Varek opened ' + s.name + ' at C' + s.cycle);
    }
  }
  out.verdict = out.hold.length ? 'HOLD' : 'PASS';
  fs.writeFileSync(O + '2026-10-22-e308-check-' + label + '-c' + cyc + '.json', JSON.stringify(out, null, 1));
  console.log('e308 ' + label + ' C' + (from < cyc ? from + '..' : '') + cyc + ' ' + out.verdict + ' | column ' + (out.columnArmed ? 'armed' : 'absent') + ' | openings ' +
    (out.openings.map(o => o.family + ' C' + o.cycle + ' ' + o.name + ' (' + o.countBefore + '/' + o.cap + ', gap ' + o.gap + ', staker ' + o.stakerOwnedBefore + ')').join('; ') || 'none'));
  for (const l of out.lines) console.log('  ' + l.lin + ' ' + l.family + ' ' + (l.tier || '-') + ' ' + l.status + ' living ' + l.living + ' firms ' + l.bizCount + '/' + (l.cap === null ? '-' : l.cap) + ' clock ' + (l.lastOpen === undefined ? 'n/a' : l.lastOpen) + ' stamp ' + l.latestStamp);
  for (const h of out.hold) console.log('  HOLD ' + h);
  process.exit(out.hold.length ? 1 : 0);
})().catch(e => { console.error(e.message); process.exit(2); });
