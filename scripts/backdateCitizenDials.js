/**
 * backdateCitizenDials.js — engine.31 Phase 3 (S253).
 *
 * Seeds each citizen's 7 dials by replaying their REAL life history (LifeHistory
 * archive tab + their LifeHistory column) through the dial engine. The raw
 * history is ground truth and is NEVER touched — this only derives DialState +
 * the readable TraitProfile face, both pure functions of (history × tag-dial
 * map), so it is always re-runnable. All citizens run the SAME dials, no
 * shielding (Tier-1 included): dials = current state from history.
 *
 *   DRY-RUN (default): writes NOTHING. Prints a distribution report.
 *   --apply --sheet=<id>: writes DialState + TraitProfile to that sheet.
 *     HARD GUARD: refuses the live ledger id. Intended for a throwaway COPY.
 *   --apply --live: THE DEPLOY PATH (engine.31 A-style, S256). Targets the
 *     LIVE ledger. Runs the full sequence: seed DialState + TraitProfile,
 *     append every LifeHistory(O) entry to LifeHistory_Archive (cold store,
 *     verified landed), THEN clear O — kills the double-count seam (seed and
 *     the live fold-on-trim compressor would otherwise both fold the same
 *     events). Clear only fires after the archive append is verified.
 *     Milestones survive via the archive (buildCitizenCards reads it).
 *
 * Run (dry-run, live read):   node scripts/backdateCitizenDials.js
 * Run (dry-run vs copy):      node scripts/backdateCitizenDials.js --sheet=<id>
 * Run (apply to copy):        node scripts/backdateCitizenDials.js --apply --sheet=<id>
 * Run (LIVE deploy):          node scripts/backdateCitizenDials.js --apply --live
 */

require('/root/GodWorld/lib/env'); // loads creds + LIVE id (override:true)

// dial engine + map + compressor face-builder as Apps Script globals
global.Logger = { log() {} };
const E = require('/root/GodWorld/utilities/citizenMemory.js');
Object.keys(E).forEach(k => { global[k] = E[k]; });
const M = require('/root/GodWorld/utilities/citizenDialMap.js');
global.nudgesForEvent_ = M.nudgesForEvent_;
global.baseTag_ = M.baseTag_;
const C = require('/root/GodWorld/utilities/compressLifeHistory.js');

const fs = require('fs');
const LIVE_ID = '1-0GNeCzqrDmmOy1wOScryzdRd82syq0Z_wZ7dTH8Bjk'; // NEVER --apply here
const SEED_CYCLE = 95; // stamps Updated:cN on the seeded face
const SEED_SCALE = 30; // dampened-seed sensitivity: net signal / SCALE -> tanh (tune Phase 6)
const NEUTRAL_BAND = E.bandIndex_(50);

function arg(name) {
  const a = process.argv.find(x => x.startsWith('--' + name + '='));
  return a ? a.split('=').slice(1).join('=') : null;
}
function colLetter(n) { var s = ''; while (n > 0) { var m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; }

// DAMPENED SEED: sum each dial's net signal across the whole life, then map
// through a saturating curve so EVERY event leaves a proportional mark but
// prolific citizens asymptote toward the poles (never blow past 0/100). No
// streak/harden here — that's the LIVE compressor's job going forward; the seed
// just reflects the net shape of a life. base 50 = no signal.
function backdate(events) {
  const net = {}; E.DIALS.forEach(d => net[d] = 0);
  for (const ev of events) {
    const fx = M.nudgesForEvent_(ev.tag, 1, ev.text);
    for (const d in fx) if (net[d] != null && Object.prototype.hasOwnProperty.call(fx, d)) net[d] += fx[d];
  }
  const c = E.newCitizen_(); // base 50, mood 0, streak 0 (live harden starts fresh)
  for (const d of E.DIALS) {
    c.base[d] = Math.max(0, Math.min(100, 50 + 50 * Math.tanh(net[d] / SEED_SCALE)));
  }
  return c;
}

(async () => {
  const apply = process.argv.includes('--apply');
  const live = process.argv.includes('--live');
  const sheetArg = arg('sheet');

  if (sheetArg) process.env.GODWORLD_SHEET_ID = sheetArg; // override AFTER lib/env (read at call-time)
  const targetId = process.env.GODWORLD_SHEET_ID;

  if (apply) {
    if (live) {
      if (sheetArg && sheetArg !== LIVE_ID) { console.error('--live with a non-live --sheet: pick one.'); process.exit(1); }
      if (targetId !== LIVE_ID) { console.error('--live but env target is not the live ledger. Aborting.'); process.exit(1); }
      console.log('*** LIVE DEPLOY: seed + archive-append + clear-O on the LIVE ledger ***');
    } else {
      if (!sheetArg) { console.error('--apply requires --sheet=<copy-id> (refusing to default). LIVE deploy requires --live.'); process.exit(1); }
      if (targetId === LIVE_ID) { console.error('REFUSING: --apply target is the LIVE ledger. Use a copy, or pass --live for the deploy path.'); process.exit(1); }
    }
  }
  const sheets = require('/root/GodWorld/lib/sheets.js');
  console.log(`${apply ? 'APPLY' : 'DRY-RUN'} | target sheet: ${String(targetId).slice(0, 14)} ${targetId === LIVE_ID ? '(LIVE)' : '(copy/other)'}`);

  const [grid, archive] = await Promise.all([
    sheets.getSheetData('Simulation_Ledger'),     // arrays incl header — preserves row order for write-back
    sheets.getSheetAsObjects('LifeHistory_Archive')
  ]);
  const header = grid[0];
  const iPop = header.indexOf('POPID');
  const iLife = header.indexOf('LifeHistory');
  const iTrait = header.indexOf('TraitProfile');
  const iFirst = header.indexOf('First');
  const iLast = header.indexOf('Last');
  const iNbhd = header.indexOf('Neighborhood');
  let iDial = header.indexOf('DialState');

  const archByPop = {};
  for (const a of archive) {
    if (!a.POPID) continue;
    const cyc = parseInt(a.Cycle, 10);
    (archByPop[a.POPID] = archByPop[a.POPID] || []).push({ tag: String(a.EventTag || '').trim(), text: a.EventText || '', cycle: isNaN(cyc) ? null : cyc });
  }

  const dialCol = [], faceCol = [], clearCol = [], archAppendRows = [];
  const archetypeDist = {}; const dialMove = {}; E.DIALS.forEach(d => dialMove[d] = 0);
  let offNeutral = 0, allNeutral = 0;
  const vivid = [];

  for (let r = 1; r < grid.length; r++) {
    const row = grid[r];
    const pop = row[iPop];
    const oParsed = C.parseLifeHistoryEntries_(String(row[iLife] || ''));
    const oEvents = oParsed.entries.map(e => ({ tag: e.tag, text: e.text || '', cycle: e.cycle != null ? e.cycle : null }));
    // A-style clear-O bookkeeping (live deploy): every O entry moves to the
    // archive (modern schema: Timestamp/POPID/Name/EventTag/EventText/Neighborhood/Cycle),
    // then O is cleared so the live fold-on-trim compressor never re-folds
    // events the seed already counted.
    clearCol.push(['']);
    for (const e of oParsed.entries) {
      archAppendRows.push([
        e.timestamp || '',
        pop || '',
        [(iFirst >= 0 ? row[iFirst] : ''), (iLast >= 0 ? row[iLast] : '')].filter(Boolean).join(' '),
        e.tag || '',
        e.text || '',
        (iNbhd >= 0 ? row[iNbhd] : '') || '',
        e.cycle != null ? e.cycle : ''
      ]);
    }
    const events = (archByPop[pop] || []).concat(oEvents);
    events.forEach((e, i) => e._i = i);
    events.sort((a, b) => (a.cycle == null && b.cycle == null) ? a._i - b._i : a.cycle == null ? 1 : b.cycle == null ? -1 : (a.cycle - b.cycle || a._i - b._i));

    const c = backdate(events);
    dialCol.push([C.serializeDialState_(c)]);
    faceCol.push([C.formatDialFace_(c, oParsed.entries, SEED_CYCLE)]);

    const arche = C.deriveArchetypeFromBands_(c);
    archetypeDist[arche] = (archetypeDist[arche] || 0) + 1;
    const off = E.DIALS.filter(d => E.bandIndex_(c.base[d]) !== NEUTRAL_BAND);
    if (off.length) { offNeutral++; off.forEach(d => dialMove[d]++); } else allNeutral++;
    if (off.length >= 2) vivid.push(`${pop} ${row[header.indexOf('FullName')] || ''} — ${arche} — ${off.join('+')} — ${E.DIALS.map(d => Math.round(c.base[d])).join('/')}`);
  }
  const N = grid.length - 1;

  console.log(`citizens=${N}  off-neutral=${offNeutral} (${(offNeutral/N*100).toFixed(0)}%)  all-neutral=${allNeutral}`);
  console.log('archetypes:', Object.entries(archetypeDist).sort((a,b)=>b[1]-a[1]).map(([a,n])=>`${a}:${n}`).join('  '));
  console.log('dial moves:', E.DIALS.map(d=>`${d}:${dialMove[d]}`).join('  '));
  console.log(`clear-O plan: ${archAppendRows.length} O entries -> LifeHistory_Archive (currently ${archive.length} rows), then clear O for ${N} citizens`);

  if (!apply) {
    fs.writeFileSync('/root/GodWorld/output/engine31_backdate_dryrun.md',
      `# back-date dry-run\ncitizens ${N} | off-neutral ${offNeutral} | all-neutral ${allNeutral} | O entries to archive ${archAppendRows.length}\n\n## vivid\n` + vivid.slice(0,20).map(v=>'- '+v).join('\n'));
    console.log('dry-run only — no writes. report -> output/engine31_backdate_dryrun.md');
    return;
  }

  // ---- APPLY ----
  // LIVE deploy order matters: (1) archive-append + VERIFY the landing,
  // (2) seed DialState + TraitProfile, (3) clear O only after (1) verified.
  // If anything fails mid-sequence, O is never cleared before its copy exists.
  if (live) {
    if (archAppendRows.length > 0) {
      const beforeCount = archive.length;
      const CHUNK = 500;
      for (let a = 0; a < archAppendRows.length; a += CHUNK) {
        await sheets.appendRows('LifeHistory_Archive', archAppendRows.slice(a, a + CHUNK));
      }
      const archBack = await sheets.getSheetAsObjects('LifeHistory_Archive');
      if (archBack.length !== beforeCount + archAppendRows.length) {
        console.error(`ABORT before clear-O: archive verify failed — expected ${beforeCount + archAppendRows.length} rows, found ${archBack.length}. O untouched.`);
        process.exit(1);
      }
      console.log(`archived ${archAppendRows.length} O entries -> LifeHistory_Archive (${beforeCount} -> ${archBack.length} rows) VERIFIED`);
    } else {
      console.log('no O entries to archive');
    }
  }
  if (iDial < 0) {
    iDial = header.length; // new column at the end
    await sheets.resizeSheet('Simulation_Ledger', iDial + 1); // expand grid (rows unchanged) before writing
    const letter = colLetter(iDial + 1);
    await sheets.updateRange(`Simulation_Ledger!${letter}1`, [['DialState']]);
    console.log(`expanded grid to ${iDial + 1} cols; added DialState column at ${letter}1`);
  }
  const dialLetter = colLetter(iDial + 1);
  const traitLetter = colLetter(iTrait + 1);
  await sheets.updateRange(`Simulation_Ledger!${dialLetter}2:${dialLetter}${N + 1}`, dialCol);
  await sheets.updateRange(`Simulation_Ledger!${traitLetter}2:${traitLetter}${N + 1}`, faceCol);
  console.log(`wrote ${dialCol.length} DialState (${dialLetter}) + ${faceCol.length} TraitProfile (${traitLetter})`);

  // clear O — live deploy only, and only after the archive append verified above.
  if (live) {
    const lifeLetter = colLetter(iLife + 1);
    await sheets.updateRange(`Simulation_Ledger!${lifeLetter}2:${lifeLetter}${N + 1}`, clearCol);
    console.log(`cleared LifeHistory (${lifeLetter}) for ${N} citizens — double-count seam dead`);
  }

  // verify: re-read 3 rows
  const back = await sheets.getSheetData('Simulation_Ledger');
  let ok = 0;
  for (const ri of [1, Math.floor(N / 2), N]) {
    const ds = back[ri][iDial], tp = back[ri][iTrait];
    const oCleared = !live || !String(back[ri][iLife] || '').trim();
    let valid = false; try { const o = JSON.parse(ds); valid = o && o.base && /^Archetype:/.test(tp) && oCleared; } catch (e) {}
    if (valid) ok++;
    console.log(`  verify row ${ri}: DialState ${ds ? 'set' : 'EMPTY'} | face ${String(tp).slice(0, 30)}${live ? ' | O ' + (oCleared ? 'cleared' : 'NOT CLEARED') : ''}`);
  }
  console.log(ok === 3 ? 'VERIFIED — writes landed' : 'WARNING — verify failed');
})().catch(e => { console.error(e.stack || e.message); process.exit(1); });
