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
 *
 * Run (dry-run, live read):   node scripts/backdateCitizenDials.js
 * Run (dry-run vs copy):      node scripts/backdateCitizenDials.js --sheet=<id>
 * Run (apply to copy):        node scripts/backdateCitizenDials.js --apply --sheet=<id>
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
const NEUTRAL_BAND = E.bandIndex_(50);

function arg(name) {
  const a = process.argv.find(x => x.startsWith('--' + name + '='));
  return a ? a.split('=').slice(1).join('=') : null;
}
function colLetter(n) { var s = ''; while (n > 0) { var m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; }

// chronological replay of a citizen's events -> dials (settle as cycles advance,
// so a one-off fades and only a sustained pattern hardens into base).
function backdate(events) {
  const c = E.newCitizen_();
  let lastCycle = null;
  for (const ev of events) {
    if (ev.cycle != null && lastCycle != null && ev.cycle > lastCycle) {
      const gap = Math.min(ev.cycle - lastCycle, 10);
      for (let k = 0; k < gap; k++) E.settleCycle_(c);
    }
    E.applyEvent_(c, { label: ev.tag, effects: M.nudgesForEvent_(ev.tag, 1, ev.text) });
    if (ev.cycle != null) lastCycle = ev.cycle;
  }
  for (const d of E.DIALS) c.mood[d] = 0; // base is the seed; mood not persisted
  return c;
}

(async () => {
  const apply = process.argv.includes('--apply');
  const sheetArg = arg('sheet');

  if (sheetArg) process.env.GODWORLD_SHEET_ID = sheetArg; // override AFTER lib/env (read at call-time)
  const targetId = process.env.GODWORLD_SHEET_ID;

  if (apply) {
    if (!sheetArg) { console.error('--apply requires --sheet=<copy-id> (refusing to default).'); process.exit(1); }
    if (targetId === LIVE_ID) { console.error('REFUSING: --apply target is the LIVE ledger. Use a copy.'); process.exit(1); }
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
  let iDial = header.indexOf('DialState');

  const archByPop = {};
  for (const a of archive) {
    if (!a.POPID) continue;
    const cyc = parseInt(a.Cycle, 10);
    (archByPop[a.POPID] = archByPop[a.POPID] || []).push({ tag: String(a.EventTag || '').trim(), text: a.EventText || '', cycle: isNaN(cyc) ? null : cyc });
  }

  const dialCol = [], faceCol = [];
  const archetypeDist = {}; const dialMove = {}; E.DIALS.forEach(d => dialMove[d] = 0);
  let offNeutral = 0, allNeutral = 0;
  const vivid = [];

  for (let r = 1; r < grid.length; r++) {
    const row = grid[r];
    const pop = row[iPop];
    const oParsed = C.parseLifeHistoryEntries_(String(row[iLife] || ''));
    const oEvents = oParsed.entries.map(e => ({ tag: e.tag, text: e.text || '', cycle: e.cycle != null ? e.cycle : null }));
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

  if (!apply) {
    fs.writeFileSync('/root/GodWorld/output/engine31_backdate_dryrun.md',
      `# back-date dry-run\ncitizens ${N} | off-neutral ${offNeutral} | all-neutral ${allNeutral}\n\n## vivid\n` + vivid.slice(0,20).map(v=>'- '+v).join('\n'));
    console.log('dry-run only — no writes. report -> output/engine31_backdate_dryrun.md');
    return;
  }

  // ---- APPLY (copy only, guarded above) ----
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

  // verify: re-read 3 rows
  const back = await sheets.getSheetData('Simulation_Ledger');
  let ok = 0;
  for (const ri of [1, Math.floor(N / 2), N]) {
    const ds = back[ri][iDial], tp = back[ri][iTrait];
    let valid = false; try { const o = JSON.parse(ds); valid = o && o.base && /^Archetype:/.test(tp); } catch (e) {}
    if (valid) ok++;
    console.log(`  verify row ${ri}: DialState ${ds ? 'set' : 'EMPTY'} | face ${String(tp).slice(0, 30)}`);
  }
  console.log(ok === 3 ? 'VERIFIED — writes landed' : 'WARNING — verify failed');
})().catch(e => { console.error(e.stack || e.message); process.exit(1); });
