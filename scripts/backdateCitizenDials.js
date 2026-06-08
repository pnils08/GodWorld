/**
 * backdateCitizenDials.js — engine.31 Phase 3 (S253). READ-ONLY DRY-RUN by default.
 *
 * Seeds each citizen's 7 dials by replaying their REAL life history (LifeHistory
 * archive tab + their LifeHistory column) through the dial engine. The raw history
 * is ground truth and is NEVER touched — this only derives DialState + the readable
 * face, both pure functions of (history × tag-dial map), so it is always re-runnable.
 *
 * DRY-RUN (default): writes NOTHING to the sheet. Produces a distribution report
 * (output/engine31_backdate_dryrun.md) so we can see what back-dating WOULD do
 * across the whole population before any write. The --apply path is intentionally
 * NOT built yet (it's the deploy-gated write step, rehearsed on a ledger copy).
 *
 * Run: node scripts/backdateCitizenDials.js
 */

require('/root/GodWorld/lib/env');
const fs = require('fs');
const sheets = require('/root/GodWorld/lib/sheets.js');

// inject the Apps Script global surface the compressor/engine call bare
global.Logger = { log() {} };
const E = require('/root/GodWorld/utilities/citizenMemory.js');
Object.keys(E).forEach(k => { global[k] = E[k]; });
const M = require('/root/GodWorld/utilities/citizenDialMap.js');
global.nudgesForEvent_ = M.nudgesForEvent_;
global.baseTag_ = M.baseTag_;
const C = require('/root/GodWorld/utilities/compressLifeHistory.js');

const NEUTRAL_BAND = E.bandIndex_(50); // 2

// Replay a citizen's chronological events into dials. Settle (decay) as cycles
// advance so a one-off fades and only a sustained pattern hardens into base.
function backdate(events) {
  const c = E.newCitizen_();
  let lastCycle = null;
  for (const ev of events) {
    if (ev.cycle != null && lastCycle != null && ev.cycle > lastCycle) {
      const gap = Math.min(ev.cycle - lastCycle, 10); // bound settle iterations
      for (let k = 0; k < gap; k++) E.settleCycle_(c);
    }
    E.applyEvent_(c, { label: ev.tag, effects: M.nudgesForEvent_(ev.tag, 1, ev.text) });
    if (ev.cycle != null) lastCycle = ev.cycle;
  }
  for (const d of E.DIALS) c.mood[d] = 0; // base is the seed; mood not persisted
  return c;
}

function offNeutralDials(c) {
  return E.DIALS.filter(d => E.bandIndex_(c.base[d]) !== NEUTRAL_BAND);
}

(async () => {
  const apply = process.argv.includes('--apply');
  if (apply) { console.error('--apply is not built yet (deploy-gated write step). Dry-run only.'); process.exit(1); }

  const [ledger, archive] = await Promise.all([
    sheets.getSheetAsObjects('Simulation_Ledger'),
    sheets.getSheetAsObjects('LifeHistory_Archive')
  ]);

  // index archive events by POPID
  const archByPop = {};
  let archMapped = 0, archInert = 0;
  for (const a of archive) {
    if (!a.POPID) continue;
    const tag = String(a.EventTag || '').trim();
    if (M.hasTag_(tag)) archMapped++; else archInert++;
    const cyc = parseInt(a.Cycle, 10);
    (archByPop[a.POPID] = archByPop[a.POPID] || []).push({ tag, text: a.EventText || '', cycle: isNaN(cyc) ? null : cyc, src: 'archive' });
  }

  const rows = [];
  const archetypeDist = {};
  const dialMoveCount = {}; E.DIALS.forEach(d => dialMoveCount[d] = 0);
  let offNeutral = 0, allNeutral = 0, allInertHistory = 0, withCitizens = 0;

  for (const cit of ledger) {
    if (!cit.POPID) continue;
    withCitizens++;

    // events = archive (older) + parsed O column (recent), chronological
    const oParsed = C.parseLifeHistoryEntries_(String(cit.LifeHistory || ''));
    const oEvents = oParsed.entries.map((e) => ({ tag: e.tag, text: e.text || '', cycle: e.cycle != null ? e.cycle : null, src: 'O' }));
    const events = (archByPop[cit.POPID] || []).concat(oEvents);
    // stable chronological sort: known cycles ascending, unknown-cycle events keep relative order at the end
    events.forEach((e, i) => e._i = i);
    events.sort((a, b) => {
      if (a.cycle == null && b.cycle == null) return a._i - b._i;
      if (a.cycle == null) return 1;
      if (b.cycle == null) return -1;
      return a.cycle - b.cycle || a._i - b._i;
    });

    const mappedHere = events.filter(e => M.hasTag_(e.tag)).length;
    if (events.length > 0 && mappedHere === 0) allInertHistory++;

    const c = backdate(events);
    const archetype = C.deriveArchetypeFromBands_(c);
    archetypeDist[archetype] = (archetypeDist[archetype] || 0) + 1;

    const off = offNeutralDials(c);
    if (off.length) { offNeutral++; off.forEach(d => dialMoveCount[d]++); } else allNeutral++;

    rows.push({ POPID: cit.POPID, name: cit.FullName || cit.Name || '', archetype,
      events: events.length, mapped: mappedHere, off: off.join('+') || '-',
      base: E.DIALS.map(d => Math.round(c.base[d])).join('/') });
  }

  // vivid sample (most dials moved)
  const vivid = rows.slice().sort((a, b) => b.off.length - a.off.length).slice(0, 12);

  const lines = [];
  lines.push('# engine.31 Phase 3 — back-date DRY-RUN report (read-only, no writes)');
  lines.push('');
  lines.push(`Citizens processed: **${withCitizens}**`);
  lines.push(`Archive events: ${archive.length} (mapped ${archMapped} / inert ${archInert})`);
  lines.push('');
  lines.push('## Outcome');
  lines.push(`- Citizens who developed a personality (≥1 dial off neutral): **${offNeutral}** (${(offNeutral/withCitizens*100).toFixed(0)}%)`);
  lines.push(`- Citizens still fully neutral (50s — "a mystery"): **${allNeutral}** (${(allNeutral/withCitizens*100).toFixed(0)}%)`);
  lines.push(`- Citizens whose ENTIRE history is unmapped/inert (map-coverage gap): **${allInertHistory}**`);
  lines.push('');
  lines.push('## Archetype distribution');
  Object.entries(archetypeDist).sort((a,b)=>b[1]-a[1]).forEach(([a,n]) => lines.push(`- ${a}: ${n}`));
  lines.push('');
  lines.push('## Which dials moved (count of citizens off-neutral on each)');
  E.DIALS.forEach(d => lines.push(`- ${d}: ${dialMoveCount[d]}`));
  lines.push('');
  lines.push('## Vivid sample (most dials moved) — base = ' + E.DIALS.join('/'));
  vivid.forEach(v => lines.push(`- ${v.POPID} ${v.name} — ${v.archetype} — moved:${v.off} — ${v.base} (${v.events} ev, ${v.mapped} mapped)`));

  const out = '/root/GodWorld/output/engine31_backdate_dryrun.md';
  fs.writeFileSync(out, lines.join('\n'));

  // console summary
  console.log(`\nDRY-RUN (no writes). Citizens=${withCitizens}`);
  console.log(`  off-neutral=${offNeutral} (${(offNeutral/withCitizens*100).toFixed(0)}%)  all-neutral=${allNeutral} (${(allNeutral/withCitizens*100).toFixed(0)}%)  all-inert-history=${allInertHistory}`);
  console.log('  archetypes:', Object.entries(archetypeDist).sort((a,b)=>b[1]-a[1]).map(([a,n])=>`${a}:${n}`).join('  '));
  console.log('  dial moves:', E.DIALS.map(d=>`${d}:${dialMoveCount[d]}`).join('  '));
  console.log(`  report -> ${out}`);
})().catch(e => { console.error(e.stack || e.message); process.exit(1); });
