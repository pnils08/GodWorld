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

// Scope: every authored POPID in tier1EssenceEvents.js EXCEPT the HOLD set, or --pop=POP-XXXX for one.
// HOLD — POP-00527 Mike Paulson: carries an embedded MIKE-CONFIRM flag (the Maker's in-world handle,
// sports-domain = Paulson's lane not Mags'); needs Mike's explicit word, not a batch sweep.
const HOLD = new Set(['POP-00527']);
function argv(name) { const a = process.argv.find((x) => x.startsWith('--' + name + '=')); return a ? a.split('=').slice(1).join('=') : null; }
const onlyPop = argv('pop');
const TARGETS = Object.keys(TIER1_ESSENCE).filter((p) => (onlyPop ? p.toUpperCase() === onlyPop.toUpperCase() : !HOLD.has(p)));
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

  // ledger row lookup — citizens with no live row (e.g. voiced agents without a POPID) are
  // reported + skipped, not fatal (their essence applies when/if they're seeded into the ledger).
  const rowByPop = {};
  for (let r = 1; r < grid.length; r++) if (TARGETS.includes(grid[r][iPop])) rowByPop[grid[r][iPop]] = grid[r];
  const noRow = TARGETS.filter((p) => !rowByPop[p]);
  const active = TARGETS.filter((p) => rowByPop[p]);
  if (noRow.length) console.log('SKIP (no ledger row):', noRow.map((p) => `${p}/${(TIER1_ESSENCE[p] || {}).name || '?'}`).join(', '));
  if (HOLD.size && !onlyPop) console.log('HELD (needs explicit confirm):', [...HOLD].join(', '));

  // ---- 1. build author-once essence append rows ----
  // newByPop = the deduped NEW essence events per target (excludes rows already in the archive).
  // The re-derive (step 2) seeds from prior-archive + newByPop — NEVER the file's essence on top of
  // an archive that already contains it. This keeps a re-run single-count: first run prior=0/new=N,
  // re-run prior=N/new=0, both -> N essence events counted once. (Idempotency bug fix, S265.)
  const appendRows = [], newByPop = {};
  for (const pop of active) {
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
  // Target-miss = combined dial lands outside the authored target band (the Deacon-class divergence
  // that the essence-only dry-run can't see when a citizen has pre-existing archive rows). Reported,
  // not blocking: the derived dials are the true function of history; a miss is a retune signal for
  // research-build, not a reason to withhold a correct seed. Below-gate is likewise reported, not fatal.
  console.log('\nre-derive preview (archive-only seed | dev = wake-gate metric, misses = vs authored target):');
  const TGT_OK = { lo: (b) => b <= 1, neutral: (b) => b === -1, moderate: (b, v) => b === -1 || (b === 2 && v <= 66), high: (b) => b >= 2, vhigh: (b) => b === 3 };
  const writes = {}; let belowGate = 0, withMiss = 0;
  for (const pop of active) {
    const prior = archByPop[pop] || [];
    const events = prior.concat(newByPop[pop]); // single-count: prior already holds any prior essence
    events.forEach((e, i) => (e._i = i));
    events.sort((a, b) => (a.cycle == null && b.cycle == null) ? a._i - b._i : a.cycle == null ? 1 : b.cycle == null ? -1 : (a.cycle - b.cycle || a._i - b._i));
    const c = backdate(events);
    const curRounded = {}; E.DIALS.forEach((d) => (curRounded[d] = Math.round(c.base[d])));
    const dev = dials.deviation(curRounded);
    const ess = TIER1_ESSENCE[pop];
    const misses = E.DIALS.filter((d) => { const tgt = (ess.target && ess.target[d]) || 'neutral'; return !TGT_OK[tgt](dials.bandIdx(curRounded[d]), curRounded[d]); })
      .map((d) => `${d}=${curRounded[d]}/${(ess.target && ess.target[d]) || 'neutral'}`);
    const oParsed = C.parseLifeHistoryEntries_(String(rowByPop[pop][iLife] || ''));
    writes[pop] = { dialState: C.serializeDialState_(c), face: C.formatDialFace_(c, oParsed.entries, SEED_CYCLE) };
    if (dev < WAKE_GATE) belowGate++;
    if (misses.length) withMiss++;
    console.log(`  ${pop} ${(ess.name || '').padEnd(15)} dev=${String(dev).padStart(3)} ${dev >= WAKE_GATE ? 'CLEARS' : '*BELOW*'} | prior=${prior.length} new=${newByPop[pop].length}${misses.length ? '  MISS: ' + misses.join(', ') : ''}`);
  }
  console.log(`\nsummary: ${active.length} writable | ${belowGate} below gate | ${withMiss} with target-miss | ${noRow.length} no-row | ${HOLD.size && !onlyPop ? HOLD.size : 0} held`);

  if (!apply) { console.log('DRY-RUN — no writes. Re-run with --apply to execute.'); return; }

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

  // ONE batched write for all targets — NOT a per-row sequential loop. The sequential version
  // fired 2 updateRange calls per citizen (84 for a 42-citizen run) and hit the Sheets write
  // quota partway, silently aborting the high-row tail (POP-00636/00799 left unwritten S265).
  // sheets.batchUpdate sends every range in a single API call. (Rate-limit fix, S266.)
  function colLetter(n) { let s = ''; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; }
  const dialLetter = colLetter(iDial + 1), traitLetter = colLetter(iTrait + 1);
  const updates = [], wrote = [];
  for (let r = 1; r < grid.length; r++) {
    const pop = grid[r][iPop]; if (!writes[pop]) continue;
    updates.push({ range: `Simulation_Ledger!${dialLetter}${r + 1}`, values: [[writes[pop].dialState]] });
    updates.push({ range: `Simulation_Ledger!${traitLetter}${r + 1}`, values: [[writes[pop].face]] });
    wrote.push(pop);
  }
  await sheets.batchUpdate(updates);
  console.log(`  batch-wrote ${wrote.length} citizens (${updates.length} ranges) in one call`);

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
  console.log(ok === active.length ? `\nVERIFIED — ${ok} citizens seeded live` : `\nWARNING — verify failed (${ok}/${active.length})`);
})().catch((e) => { console.error(e.stack || e.message); process.exit(1); });
