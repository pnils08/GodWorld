#!/usr/bin/env node
/**
 * scripts/buildWorldState.js — engine.76 W3 (compile-layer rebuild, Mike S328).
 *
 * Assembles output/world_state.json — THE single per-cycle artifact for the
 * cron/agent consumers (mags-discord-bot / discord-reflection via
 * lib/mags.loadWorldState, citizen-wake + citizen-exchange via
 * lib/wakePerception.loadNeighborhoodTexture, cron-desk-writer fallback path).
 * Folds what those consumers previously globbed from four scattered places:
 *
 *   orientation  — live Riley_Digest row + Simulation_Calendar (same fields as
 *                  buildWorldSummary emitHeader; deterministic, verbatim)
 *   canon        — base_context.json canon block (roster/alerts/votes/outcomes),
 *                  staleness-flagged: the edition pipeline that refreshes it is
 *                  FROZEN (S313), so its cycle usually lags the engine's
 *   hoods        — neighborhood_texture_c{N}.md parsed per-hood blocks
 *   dispositions — output/voice-disposition-cache/<POPID>.md phrases
 *   pointers     — paths to the deep artifacts (world_summary, texture, audit)
 *
 * No LLM in the loop — all content verbatim from named sources. Missing
 * optional sources degrade to empty sections + a meta.notes entry, never throw;
 * a missing Riley_Digest row for the cycle DOES throw (the artifact would be
 * orientation-less junk, same fail-loud contract as buildWorldSummary).
 *
 * Pipeline position: run-cycle, AFTER buildWorldSummary + buildNeighborhoodTexture
 * + refreshVoiceDispositionCache (it folds their outputs).
 *
 * Usage:
 *   node scripts/buildWorldState.js <cycle> [--dry-run]
 *   node scripts/buildWorldState.js            # cycle = latest world_summary_c{N}.md
 */

'use strict';

require('/root/GodWorld/lib/env');
const fs = require('fs');
const path = require('path');
const sheets = require('/root/GodWorld/lib/sheets');
const { parseJsonField } = require('/root/GodWorld/scripts/buildWorldSummary');

const SCRIPT_VERSION = '1.0';
const ROOT = path.resolve(__dirname, '..');
const OUT_PATH = path.join(ROOT, 'output', 'world_state.json');
const CACHE_DIR = path.join(ROOT, 'output', 'voice-disposition-cache');
const BASE_CONTEXT_PATH = path.join(ROOT, 'output', 'desk-packets', 'base_context.json');

// Freshest-wins cycle detection — same pattern as cron-desk-writer detectCycle():
// world_summary_c{N}.md is written EVERY cycle; base_context.json is edition-frozen.
function detectCycle() {
  const arg = process.argv.find((a) => /^\d+$/.test(a));
  if (arg) return parseInt(arg, 10);
  const nums = fs.readdirSync(path.join(ROOT, 'output'))
    .map((f) => (f.match(/^world_summary_c(\d+)\.md$/) || [])[1])
    .filter(Boolean).map(Number);
  if (nums.length) return Math.max(...nums);
  throw new Error('buildWorldState: cannot determine cycle — pass it as an argument');
}

// ### <Hood> blocks out of neighborhood_texture_c{N}.md → { hood: text }.
function parseHoodBlocks(md) {
  const hoods = {};
  const sections = md.split(/^### /m).slice(1);
  for (const s of sections) {
    const nl = s.indexOf('\n');
    if (nl === -1) continue;
    const name = s.slice(0, nl).trim();
    const body = s.slice(nl + 1).trim();
    if (name && body) hoods[name] = body;
  }
  return hoods;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const cycle = detectCycle();
  const notes = [];

  // --- orientation (live, fail-loud) ---
  const [rileyAll, calendarAll] = await Promise.all([
    sheets.getSheetAsObjects('Riley_Digest'),
    sheets.getSheetData('Simulation_Calendar')
  ]);
  const riley = rileyAll.find((r) => String(r.Cycle) === String(cycle));
  if (!riley) throw new Error(`buildWorldState: no Riley_Digest row for cycle ${cycle}`);

  const calRow = calendarAll.slice(1).find((r) => r && r.length >= 4 && r[0] && r[1]) || [];
  const nightlife = parseJsonField(riley.NightLife, {});
  const orientation = {
    cycle,
    simYear: calRow[0] ?? null,
    simMonth: calRow[1] ?? null,
    simDay: calRow[2] ?? null,
    season: calRow[3] ?? null,
    holiday: calRow[4] || 'none',
    weather: parseJsonField(riley.Weather, {}),
    citySentiment: riley.CitySentiment ?? null,
    cycleWeight: riley.CycleWeight || null,
    cycleWeightReason: riley.CycleWeightReason || null,
    patternFlag: riley.PatternFlag || null,
    shockFlag: riley.ShockFlag || null,
    civicLoad: riley.CivicLoad || null,
    sportsSeason: nightlife.calendarContext?.sportsSeason || null,
    firstFriday: !!nightlife.calendarContext?.isFirstFriday
  };

  // --- canon (base_context fold, staleness-flagged) ---
  let canon = null;
  try {
    const raw = JSON.parse(fs.readFileSync(BASE_CONTEXT_PATH, 'utf-8'));
    const bcCycle = raw.cycle || raw.cycleNumber || (raw.baseContext && raw.baseContext.cycle) || null;
    canon = {
      sourceCycle: bcCycle,
      stale: bcCycle !== null && String(bcCycle) !== String(cycle),
      sourceSheetId: (raw.source && raw.source.sheetId) || null,
      asRoster: (raw.canon && raw.canon.asRoster) || [],
      statusAlerts: (raw.canon && raw.canon.statusAlerts) || [],
      pendingVotes: (raw.canon && raw.canon.pendingVotes) || [],
      recentOutcomes: (raw.canon && raw.canon.recentOutcomes) || []
    };
    if (canon.stale) notes.push(`canon folded from base_context c${bcCycle} (edition pipeline frozen S313) — engine is at c${cycle}`);
  } catch (err) {
    notes.push('canon absent: base_context.json unreadable — ' + err.message);
  }

  // --- hoods (texture fold) ---
  let hoods = {};
  const texturePath = path.join(ROOT, 'output', `neighborhood_texture_c${cycle}.md`);
  try {
    hoods = parseHoodBlocks(fs.readFileSync(texturePath, 'utf-8'));
    if (!Object.keys(hoods).length) notes.push(`hoods empty: no ### blocks parsed from ${path.basename(texturePath)}`);
  } catch (err) {
    notes.push(`hoods absent: ${path.basename(texturePath)} unreadable — ` + err.message);
  }

  // --- dispositions (voice cache fold) ---
  const dispositions = {};
  try {
    for (const f of fs.readdirSync(CACHE_DIR).filter((f) => /^POP-\d+\.md$/.test(f))) {
      const body = fs.readFileSync(path.join(CACHE_DIR, f), 'utf-8');
      const refreshed = (body.match(/Refreshed:\s*c(\d+)/) || [])[1];
      dispositions[f.replace(/\.md$/, '')] = {
        text: body.split(/\n\s*Refreshed:/)[0].trim(),
        refreshedCycle: refreshed ? parseInt(refreshed, 10) : null
      };
    }
    if (!Object.keys(dispositions).length) notes.push('dispositions empty: no POP-*.md in voice-disposition-cache');
  } catch (err) {
    notes.push('dispositions absent: voice-disposition-cache unreadable — ' + err.message);
  }

  // --- pointers ---
  const pointers = {};
  for (const [key, rel] of [
    ['worldSummary', `output/world_summary_c${cycle}.md`],
    ['deskSignal', `output/desk_signal_c${cycle}.json`],
    ['neighborhoodTexture', `output/neighborhood_texture_c${cycle}.md`],
    ['engineAudit', `output/engine_audit_c${cycle}.json`],
    ['engineReview', `output/engine_review_c${cycle}.md`]
  ]) {
    if (fs.existsSync(path.join(ROOT, rel))) pointers[key] = rel;
  }

  const state = {
    meta: {
      cycle,
      builtAt: new Date().toISOString(),
      sheetId: process.env.GODWORLD_SHEET_ID || null,
      script: `buildWorldState.js v${SCRIPT_VERSION}`,
      notes
    },
    orientation,
    canon,
    hoods,
    dispositions,
    pointers
  };

  const json = JSON.stringify(state, null, 2);
  if (dryRun) {
    console.log(json);
    console.log(`\n[dry-run] would write ${OUT_PATH} (${json.length} bytes)`);
    return;
  }
  fs.writeFileSync(OUT_PATH, json + '\n');
  console.log(`wrote ${OUT_PATH} (${json.length} bytes) — cycle ${cycle}, ` +
    `${Object.keys(hoods).length} hoods, ${Object.keys(dispositions).length} dispositions, ` +
    `canon ${canon ? (canon.stale ? `STALE c${canon.sourceCycle}` : 'current') : 'absent'}` +
    (notes.length ? `\nnotes:\n  - ${notes.join('\n  - ')}` : ''));
}

if (require.main === module) {
  main().catch((err) => { console.error(err.message || err); process.exit(1); });
}

module.exports = { parseHoodBlocks, detectCycle };
