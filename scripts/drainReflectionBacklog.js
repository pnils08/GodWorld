/**
 * drainReflectionBacklog.js — MANUAL LEVER for the research.14 reflection write-back drain.
 *
 * WHAT: reads unprocessed Reflection_Intake rows (applied != 'yes'), composes each one's dial
 * nudges with the SAME production functions the in-cycle Phase-9 drain uses
 * (citizenDialMap.nudgesForReflection_ + citizenMemory.accreteReflectionsIntoBase_), accretes a
 * bounded fraction into each citizen's permanent `base` dials (DialState), and flips the drained
 * rows to applied='yes'. No logic fork from the engine — identical math, run out-of-cycle.
 *
 * WHY THIS EXISTS: the drain lives at Phase 9 inside compressLifeHistory_ and only fires when a
 * full cycle runs. If the drain is deployed while no cycle is imminent — or a deploy window ever
 * holds it out and reflections pile up — the intake backlog sits unapplied. This lever closes the
 * loop on demand without forcing a whole-sim advance. First used S277 (2026-06-30) to drain the
 * 50-row C97–C100 backlog after the drain shipped live Jun 29 but the last cycle had run Jun 23.
 *
 * SAFE BY DESIGN:
 *  - DRY-RUN by default (prints per-citizen base deltas + counts, writes nothing). Pass --commit to write.
 *  - Idempotent: it stamps applied='yes', so the next real in-cycle drain skips these rows (no double-count).
 *  - Writes DialState in production format via serializeDialState_ ({base,streak,[chaosExposure]}, NO mood).
 *  - Additive/bounded: base is clamped 0-100 inside accreteReflectionsIntoBase_.
 *
 * USAGE:
 *   node scripts/drainReflectionBacklog.js            # dry-run (inspect)
 *   node scripts/drainReflectionBacklog.js --commit   # apply to the live sheet
 *
 * Registered: docs/engine/ROLLOUT_PLAN.md §research.14 (manual-lever pointer).
 */
require("../lib/env");
const { getRawSheetData, batchUpdate } = require("../lib/sheets.js");
const cm = require("../utilities/citizenMemory.js");
const cdm = require("../utilities/citizenDialMap.js");
const clh = require("../utilities/compressLifeHistory.js");

const COMMIT = process.argv.includes("--commit");
const MULT = clh.REFLECTION_MULT;               // 0.45
const FRAC = clh.REFLECTION_ACCRETION_FRAC;     // 0.5
const RI = { POPID: 2, EVENT: 5, SNIPPET: 6, APPLIED: 7, AFFECT: 8 }; // 1-based (matches readPendingReflections_)
const dialMap = { nudgesForReflection_: cdm.nudgesForReflection_ };

function colLetter(n) { let s = ""; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = (n - m - 1) / 26; } return s; }

(async () => {
  const ri = await getRawSheetData("Reflection_Intake");
  const pend = {};
  for (let r = 1; r < ri.length; r++) {
    const row = ri[r];
    const pid = row[RI.POPID - 1];
    if (!pid) continue;
    if (String(row[RI.APPLIED - 1] || "").toLowerCase() === "yes") continue;
    const event = row[RI.EVENT - 1], affect = row[RI.AFFECT - 1];
    if (!event && !affect) continue;
    (pend[pid] = pend[pid] || []).push({ rowNum: r + 1, event, affect, text: row[RI.SNIPPET - 1] || "" });
  }

  const sl = await getRawSheetData("Simulation_Ledger");
  const h = sl[0], ip = h.indexOf("POPID"), idS = h.indexOf("DialState");
  const byId = {}; for (let i = 1; i < sl.length; i++) byId[sl[i][ip]] = { row: sl[i], sheetRow: i + 1 };

  let cit = 0, rows = 0, moved = 0, noLedger = 0, noState = 0;
  const dialWrites = [], appliedFlips = [], sample = [];
  for (const pid in pend) {
    const hit = byId[pid];
    if (!hit) { noLedger++; continue; }
    const ds = String(hit.row[idS] || "");
    if (!ds) noState++;
    const c = cm.deserialize_(clh.parseDialState_(ds));
    const before = Object.assign({}, c.base);
    const m = cm.accreteReflectionsIntoBase_(c, pend[pid], dialMap, MULT, FRAC);
    const delta = {};
    for (const k in c.base) { const d = (c.base[k] || 0) - (before[k] || 0); if (Math.abs(d) > 0.001) delta[k] = +d.toFixed(2); }
    cit++; rows += pend[pid].length; moved += m;
    if (m > 0) {
      dialWrites.push({ sheetRow: hit.sheetRow, value: clh.serializeDialState_(c) }); // production format
      pend[pid].forEach(p => appliedFlips.push(p.rowNum));
    }
    if (sample.length < 10 && m > 0)
      sample.push(`${pid}  ${pend[pid].length}rfl/${m}moved  Δbase=${JSON.stringify(delta)}  [${pend[pid].map(x => (x.event || "-") + "/" + (x.affect || "-")).join(", ")}]`);
  }

  console.log(`=== reflection-drain backlog (${COMMIT ? "COMMIT" : "DRY-RUN"}) ===`);
  console.log(`pending citizens: ${cit} | pending rows: ${rows} | reflections moved: ${moved}`);
  console.log(`no-ledger-match: ${noLedger} | blank-DialState: ${noState}`);
  console.log(`writes: ${dialWrites.length} DialState cells + ${appliedFlips.length} applied='yes' flips`);
  console.log("--- sample ---\n" + sample.join("\n"));

  if (!COMMIT) { console.log("\n(dry-run — nothing written. re-run with --commit to apply.)"); return; }

  const idColLetter = colLetter(idS + 1);
  const dsData = dialWrites.map(w => ({ range: `Simulation_Ledger!${idColLetter}${w.sheetRow}`, values: [[w.value]] }));
  const apData = appliedFlips.map(rn => ({ range: `Reflection_Intake!${colLetter(RI.APPLIED)}${rn}`, values: [["yes"]] }));
  await batchUpdate(dsData.concat(apData));
  console.log(`COMMITTED: ${dsData.length} DialState + ${apData.length} applied flips.`);
})().catch(e => { console.error(e.stack || e.message); process.exit(1); });
