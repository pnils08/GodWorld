/**
 * seedTier1EssenceLive.js — Tier-1 dial-essence backfill, NARROW live executor (engine-sheet, S265).
 *
 * The substrate counterpart to the dry-run harness (scripts/seedTier1Essence.js). Executes the
 * engine-sheet half of docs/plans/2026-06-21-tier1-dial-essence-backfill.md for an EXPLICIT,
 * PINNED set of POPIDs — NOT "whatever is in tier1EssenceEvents.js" (research-build is authoring
 * the remaining tiers in parallel; only blessed faces get written).
 *
 * NARROW vs the full backdateCitizenDials.js --live deploy:
 *   - Touches ONLY the target POPIDs. The other ~903 citizens and EVERY LifeHistory column-O are
 *     left untouched (the full --live folds + clears O population-wide; we don't, to keep blast
 *     radius minimal and preserve everyone's recent-journal wake material).
 *   - Seeds each target from its ARCHIVE history ONLY (essence + any pre-existing archive rows),
 *     NOT column O. This is double-count-safe: essence lives in the cold archive (counted once by
 *     the seed); the target keeps its live O entries, which fold normally later. A future full
 *     --live re-derive supersedes this cleanly (essence already in archive → stays).
 *
 * Math + serialization are byte-identical to backdateCitizenDials.js: same dampened-seed curve
 * (50 + 50*tanh(net/30)) via the same citizenDialMap, same C.serializeDialState_ / C.formatDialFace_.
 *
 * Order of operations (transactional, fail-safe):
 *   1. Author-once append of essence rows to LifeHistory_Archive (skips rows already present by
 *      POPID+EventText), VERIFY the landing.
 *   2. Re-read archive, re-derive DialState + TraitProfile for the targets from archive-only.
 *   3. Per-target cell writes; re-read + verify; report deviation vs the wake gate (>=60).
 *
 *   node scripts/seedTier1EssenceLive.js            # DRY-RUN: prints the plan + per-face dev, writes NOTHING
 *   node scripts/seedTier1EssenceLive.js --apply    # LIVE: append archive + write 3 faces
 */

require('/root/GodWorld/lib/env'); // loads creds + LIVE ledger id

global.Logger = { log() {} };
const E = require('/root/GodWorld/utilities/citizenMemory.js');
Object.keys(E).forEach((k) => { global[k] = E[k]; });
const M = require('/root/GodWorld/utilities/citizenDialMap.js');
global.nudgesForEvent_ = M.nudgesForEvent_;
global.baseTag_ = M.baseTag_;
const C = require('/root/GodWorld/utilities/compressLifeHistory.js');
const dials = require('/root/GodWorld/lib/citizenDials.js');
const { TIER1_ESSENCE } = require('/root/GodWorld/utilities/tier1EssenceEvents.js');

// PINNED scope — the blessed-for-live faces only (Mike S265: Deacon held for retune; Tier-2 held).
const TARGETS = ['POP-00001', 'POP-00018', 'POP-00789'];
const SEED_SCALE = 30;   // mirror backdateCitizenDials.js
const SEED_CYCLE = 99;   // current cycle (C99 RAN) — stamps Updated:cN on the seeded face
const ESSENCE_CYCLE = 0; // backstory marker — sorts as oldest, not "recent"
const WAKE_GATE = 60;    // citizen-wake.js SHAPED_MIN

// dampened seed, identical to backdateCitizenDials.js backdate()
function backdate(events) {
  const net = {}; E.DIALS.forEach((d) => (net[d] = 0));
  for (const ev of events) {
    const fx = M.nudgesForEvent_(ev.tag, 1, ev.text);
    for (const d in fx) if (net[d] != null && Object.prototype.hasOwnProperty.call(fx, d)) net[d] += fx[d];
  }
  const c = E.newCitizen_(); // base 50, mood 0, streak 0
  for (const d of E.DIALS) c.base[d] = Math.max(0, Math.min(100, 50 + 50 * Math.tanh(net[d] / SEED_SCALE)));
  return c;
}

(async () => {
  const apply = process.argv.includes('--apply');
  const sheets = require('/root/GodWorld/lib/sheets.js');
  console.log(`${apply ? 'APPLY (LIVE)' : 'DRY-RUN'} | targets: ${TARGETS.join(', ')}`);

  const [grid, archiveArr] = await Promise.all([
    sheets.getSheetData('Simulation_Ledger'),
    sheets.getSheetData('LifeHistory_Archive'),
  ]);
  const h = grid[0];
  const iPop = h.indexOf('POPID'), iLife = h.indexOf('LifeHistory'), iTrait = h.indexOf('TraitProfile');
  const iDial = h.indexOf('DialState'), iFirst = h.indexOf('First'), iLast = h.indexOf('Last'), iNbhd = h.indexOf('Neighborhood');
  if (iDial < 0) { console.error('DialState column missing — run the full backdate deploy first.'); process.exit(1); }

  const ah = archiveArr[0];
  const aPop = ah.indexOf('POPID'), aTag = ah.indexOf('EventTag'), aText = ah.indexOf('EventText'), aCyc = ah.indexOf('Cycle');

  // existing archive (by POPID) + a POPID|EventText set for the author-once guard
  const archByPop = {}, seenKey = new Set();
  for (let r = 1; r < archiveArr.length; r++) {
    const p = archiveArr[r][aPop]; if (!p) continue;
    const tag = String(archiveArr[r][aTag] || '').trim(), text = archiveArr[r][aText] || '';
    const cyc = parseInt(archiveArr[r][aCyc], 10);
    (archByPop[p] = archByPop[p] || []).push({ tag, text, cycle: isNaN(cyc) ? null : cyc });
    seenKey.add(p + '|' + text);
  }

  // ledger row lookup for the targets
  const rowByPop = {};
  for (let r = 1; r < grid.length; r++) if (TARGETS.includes(grid[r][iPop])) rowByPop[grid[r][iPop]] = grid[r];
  const missing = TARGETS.filter((p) => !rowByPop[p]);
  if (missing.length) { console.error('targets with no ledger row:', missing.join(', ')); process.exit(1); }

  // ---- 1. build author-once essence append rows ----
  // newByPop = the deduped NEW essence events per target (excludes rows already in the archive).
  // The re-derive (step 2) seeds from prior-archive + newByPop — NEVER the file's essence on top of
  // an archive that already contains it. This keeps a re-run single-count: first run prior=0/new=N,
  // re-run prior=N/new=0, both -> N essence events counted once. (Idempotency bug fix, S265.)
  const appendRows = [], newByPop = {};
  for (const pop of TARGETS) {
    const ess = TIER1_ESSENCE[pop];
    if (!ess) { console.error(`no essence authored for ${pop}`); process.exit(1); }
    const row = rowByPop[pop];
    const name = [(iFirst >= 0 ? row[iFirst] : ''), (iLast >= 0 ? row[iLast] : '')].filter(Boolean).join(' ');
    const nbhd = (iNbhd >= 0 ? row[iNbhd] : '') || '';
    newByPop[pop] = [];
    let skipped = 0;
    for (const ev of ess.events) {
      if (seenKey.has(pop + '|' + ev.text)) { skipped++; continue; } // author-once
      appendRows.push(['', pop, name, ev.tag, ev.text, nbhd, ESSENCE_CYCLE]);
      newByPop[pop].push({ tag: ev.tag, text: ev.text, cycle: ESSENCE_CYCLE });
      seenKey.add(pop + '|' + ev.text);
    }
    console.log(`  ${pop} ${ess.name.padEnd(14)} essence: +${newByPop[pop].length} new${skipped ? `, ${skipped} already present (skip)` : ''} | prior archive rows: ${(archByPop[pop] || []).length}`);
  }
  console.log(`append plan: ${appendRows.length} rows -> LifeHistory_Archive (currently ${archiveArr.length - 1} data rows)`);

  // ---- 2. preview the re-derive (archive-only: prior archive + the NEW essence, NOT column O) ----
  console.log('\nre-derive preview (archive-only seed):');
  const writes = {};
  for (const pop of TARGETS) {
    const prior = archByPop[pop] || [];
    const events = prior.concat(newByPop[pop]); // single-count: prior already holds any prior essence
    events.forEach((e, i) => (e._i = i));
    events.sort((a, b) => (a.cycle == null && b.cycle == null) ? a._i - b._i : a.cycle == null ? 1 : b.cycle == null ? -1 : (a.cycle - b.cycle || a._i - b._i));
    const c = backdate(events);
    const curRounded = {}; E.DIALS.forEach((d) => (curRounded[d] = Math.round(c.base[d])));
    const dev = dials.deviation(curRounded);
    const oParsed = C.parseLifeHistoryEntries_(String(rowByPop[pop][iLife] || ''));
    writes[pop] = { dialState: C.serializeDialState_(c), face: C.formatDialFace_(c, oParsed.entries, SEED_CYCLE) };
    console.log(`  ${pop} dev=${dev} ${dev >= WAKE_GATE ? 'CLEARS' : '**FAILS**'} gate(${WAKE_GATE}) | ${dials.disposition(curRounded)}`);
    if (dev < WAKE_GATE) { console.error(`  ABORT: ${pop} below wake gate — essence too weak.`); process.exit(1); }
  }

  if (!apply) { console.log('\nDRY-RUN — no writes. Re-run with --apply to execute.'); return; }

  // ---- 3. LIVE: append archive (verify), then write the 3 faces (verify) ----
  if (appendRows.length) {
    const before = archiveArr.length - 1;
    await sheets.appendRows('LifeHistory_Archive', appendRows);
    const back = await sheets.getSheetData('LifeHistory_Archive');
    if (back.length - 1 !== before + appendRows.length) {
      console.error(`ABORT before dial write: archive verify failed — expected ${before + appendRows.length} data rows, found ${back.length - 1}. Dials untouched.`);
      process.exit(1);
    }
    console.log(`\narchived ${appendRows.length} essence rows -> LifeHistory_Archive (${before} -> ${back.length - 1}) VERIFIED`);
  } else {
    console.log('\nno new essence rows to append (author-once: all already present)');
  }

  function colLetter(n) { let s = ''; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; }
  const dialLetter = colLetter(iDial + 1), traitLetter = colLetter(iTrait + 1);
  for (let r = 1; r < grid.length; r++) {
    const pop = grid[r][iPop]; if (!writes[pop]) continue;
    await sheets.updateRange(`Simulation_Ledger!${dialLetter}${r + 1}`, [[writes[pop].dialState]]);
    await sheets.updateRange(`Simulation_Ledger!${traitLetter}${r + 1}`, [[writes[pop].face]]);
    console.log(`  wrote ${pop} -> DialState ${dialLetter}${r + 1} + TraitProfile ${traitLetter}${r + 1}`);
  }

  // verify
  const back = await sheets.getSheetData('Simulation_Ledger');
  let ok = 0;
  for (let r = 1; r < back.length; r++) {
    const pop = back[r][iPop]; if (!writes[pop]) continue;
    let valid = false;
    try { const o = JSON.parse(back[r][iDial]); valid = o && o.base && /^Archetype:/.test(back[r][iTrait]); } catch (e) {}
    if (valid) ok++;
    console.log(`  verify ${pop}: DialState ${valid ? 'set' : 'BAD'} | ${String(back[r][iTrait]).slice(0, 40)}`);
  }
  console.log(ok === TARGETS.length ? '\nVERIFIED — 3 faces seeded live' : '\nWARNING — verify failed');
})().catch((e) => { console.error(e.stack || e.message); process.exit(1); });
