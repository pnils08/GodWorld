#!/usr/bin/env node
/**
 * refreshVoiceDispositionCache.js — engine.43 Track A (read direction)
 *
 * For every citizen-voice agent (.claude/agents/citizen-voice-*), read the live
 * DialState off Simulation_Ledger and compute the current disposition phrase via
 * lib/citizenDials.disposition() — the exact call the wake loop uses — so
 * interview/Discord boots read live dial state instead of the static IDENTITY.md
 * disposition block. Agent-count-agnostic (ADR-0014): a fifth voice agent needs
 * no change here.
 *
 * Cache: output/voice-disposition-cache/<POPID>.md (one file per citizen).
 * IDENTITY.md is never touched — ESTABLISHED CANON stays authored.
 *
 * Usage:
 *   node scripts/refreshVoiceDispositionCache.js --dry-run   # print, no writes
 *
 * Plan: docs/plans/2026-07-04-voice-dial-sync-contract-build.md Task 1
 */

require('/root/GodWorld/lib/env');
const fs = require('fs');
const path = require('path');
const sheets = require('/root/GodWorld/lib/sheets');
const dials = require('/root/GodWorld/lib/citizenDials');

const ROOT = path.resolve(__dirname, '..');
const AGENTS_DIR = path.join(ROOT, '.claude/agents');
const CACHE_DIR = path.join(ROOT, 'output/voice-disposition-cache');

// POPIDs from each citizen-voice-*/IDENTITY.md "**POP ID:** POP-#####" line.
// First POP-\d+ on the line wins (suffixes like "(legacy POP-00006)" ignored).
function voicedPopIds() {
  const out = [];
  const dirs = fs.readdirSync(AGENTS_DIR)
    .filter((d) => d.startsWith('citizen-voice-'));
  for (const d of dirs) {
    const idFile = path.join(AGENTS_DIR, d, 'IDENTITY.md');
    if (!fs.existsSync(idFile)) continue;
    const m = fs.readFileSync(idFile, 'utf-8').match(/\*\*POP ID:\*\*\s*(POP-\d+)/);
    if (m) out.push({ popId: m[1].toUpperCase(), agent: d });
  }
  return out;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');

  const voiced = voicedPopIds();
  if (!voiced.length) throw new Error('no citizen-voice-* agents with a POP ID line found');

  // Same read pattern as the wake loop (lib/wakePerception.js buildPool).
  const rows = await sheets.getRawSheetData('Simulation_Ledger');
  const h = rows[0];
  const find = (n) => h.findIndex((x) => String(x).toLowerCase() === n.toLowerCase());
  const iPop = find('POPID'), iDial = find('DialState');
  if (iPop < 0 || iDial < 0) throw new Error('Simulation_Ledger missing POPID or DialState column');

  const byPop = new Map();
  for (let i = 1; i < rows.length; i++) {
    const p = String(rows[i][iPop] || '').toUpperCase();
    if (p) byPop.set(p, rows[i][iDial]);
  }

  for (const v of voiced) {
    if (!byPop.has(v.popId)) {
      console.log(`${v.popId} (${v.agent}): NOT FOUND in Simulation_Ledger — skipped`);
      continue;
    }
    const dj = byPop.get(v.popId);
    const cur = dials.currentDials(dj); // null on empty/unparseable -> neutral phrase
    const phrase = dials.disposition(cur);
    console.log(`${v.popId} (${v.agent}): ${phrase}`);
    if (dryRun) continue;
    // live write mode lands in Task 2
    throw new Error('live write mode not built yet — run with --dry-run (Task 2 adds --live)');
  }
}

main().catch((e) => { console.error(e.message || e); process.exit(1); });
