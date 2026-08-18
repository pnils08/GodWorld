#!/usr/bin/env node
'use strict';

/**
 * undockedStandings.js — UNDOCKED standings recompute (plan §2.5 decision 3,
 * docs/plans/2026-08-07-spacemolt-game-show.md; Mike sign-off 2026-08-18).
 *
 * Deterministic full recompute: Undocked_Feed rows -> Undocked_Standings tab.
 * No incremental state, no "applied" bookkeeping — every run derives the whole
 * table from the feed tab, so a re-run after any upstream correction converges
 * (same doctrine as loadUndockedFeed_: the tab is the authority).
 *
 * This is the accumulation layer only — the casino-4b substrate and the future
 * mobility engine's input. NOTHING promotes on these numbers yet (§2.4 build
 * split: the mobility engine gets its own daylight design).
 *
 * Columns: Rank, POPID, Holder, Episodes, CreditsTotal, CombatTotal,
 * MishapTotal, BestMagnitude, LastAiredCycle, CyclesLed, CurrentStreak.
 *  - Rank/CyclesLed/CurrentStreak rank on cumulative CreditsTotal; ties break
 *    by POPID so the output is stable under re-runs.
 *  - CyclesLed replays aired cycles in order: after each TargetCycle's rows
 *    land, whoever leads cumulative credits logs one led cycle. CurrentStreak
 *    is the run of consecutive aired cycles led up to the latest one.
 *  - Blank CreditsDelta is NOT zero (nullable by contract) — it just doesn't
 *    move the total. Episodes still counts the flight.
 *
 * Usage: node scripts/undockedStandings.js [--dry-run]
 */

require('/root/GodWorld/lib/env');
const sheets = require('../lib/sheets');

const FEED_TAB = 'Undocked_Feed';
const TAB = 'Undocked_Standings';
const HEADERS = ['Rank', 'POPID', 'Holder', 'Episodes', 'CreditsTotal',
  'CombatTotal', 'MishapTotal', 'BestMagnitude', 'LastAiredCycle',
  'CyclesLed', 'CurrentStreak'];

function num(v) {
  if (v === '' || v == null) return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

function compute(feedRows) {
  const hdr = feedRows[0];
  const col = name => hdr.indexOf(name);
  const iTarget = col('TargetCycle'), iPop = col('POPID'), iHolder = col('Holder'),
        iEp = col('EpisodeId'), iCredits = col('CreditsDelta'),
        iCombat = col('CombatEvents'), iMishap = col('MishapCount'), iMag = col('Magnitude');
  if (iTarget < 0 || iPop < 0 || iEp < 0) {
    throw new Error(FEED_TAB + ' missing TargetCycle/POPID/EpisodeId — refusing to compute');
  }

  const events = [];
  for (let r = 1; r < feedRows.length; r++) {
    const row = feedRows[r];
    const pop = String(row[iPop] == null ? '' : row[iPop]).trim().toUpperCase();
    const ep = String(row[iEp] == null ? '' : row[iEp]).trim();
    const target = num(row[iTarget]);
    if (!pop || !ep || target == null) continue;
    events.push({
      pop, ep, target,
      holder: iHolder >= 0 ? String(row[iHolder] || '').trim() : '',
      credits: num(row[iCredits]),
      combat: num(row[iCombat]) || 0,
      mishaps: num(row[iMishap]) || 0,
      magnitude: num(row[iMag]),
    });
  }

  const pilots = {};
  const byCycle = {};
  for (const e of events) {
    const p = pilots[e.pop] || (pilots[e.pop] = {
      pop: e.pop, holder: '', episodes: 0, credits: 0, combat: 0,
      mishaps: 0, bestMag: null, lastAired: null,
    });
    p.episodes++;
    if (e.holder) p.holder = e.holder;
    if (e.credits != null) p.credits += e.credits;
    p.combat += e.combat;
    p.mishaps += e.mishaps;
    if (e.magnitude != null && (p.bestMag == null || e.magnitude > p.bestMag)) p.bestMag = e.magnitude;
    if (p.lastAired == null || e.target > p.lastAired) p.lastAired = e.target;
    (byCycle[e.target] || (byCycle[e.target] = [])).push(e);
  }

  // Replay aired cycles for CyclesLed / CurrentStreak.
  const cycles = Object.keys(byCycle).map(Number).sort((a, b) => a - b);
  const running = {};
  const led = {};
  let lastLeader = null;
  let streak = 0;
  for (const c of cycles) {
    for (const e of byCycle[c]) {
      if (e.credits != null) running[e.pop] = (running[e.pop] || 0) + e.credits;
      else if (!(e.pop in running)) running[e.pop] = 0;
    }
    const leader = Object.keys(running).sort((a, b) =>
      (running[b] - running[a]) || (a < b ? -1 : 1))[0];
    if (leader) {
      led[leader] = (led[leader] || 0) + 1;
      streak = leader === lastLeader ? streak + 1 : 1;
      lastLeader = leader;
    }
  }

  const ranked = Object.values(pilots).sort((a, b) =>
    (b.credits - a.credits) || (a.pop < b.pop ? -1 : 1));
  return ranked.map((p, i) => [
    i + 1, p.pop, p.holder, p.episodes, p.credits, p.combat, p.mishaps,
    p.bestMag == null ? '' : p.bestMag, p.lastAired == null ? '' : p.lastAired,
    led[p.pop] || 0, p.pop === lastLeader ? streak : 0,
  ]);
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const feed = await sheets.getSheetData(FEED_TAB);
  if (!feed || !feed.length) throw new Error(FEED_TAB + ' unreadable — refusing to compute');
  const rows = compute(feed);
  console.log('[standings] ' + rows.length + ' pilot(s):');
  rows.forEach(r => console.log('  #' + r[0] + ' ' + r[2] + ' (' + r[1] + ') — ' +
    r[3] + ' ep, credits ' + r[4] + ', led ' + r[9] + ', streak ' + r[10]));
  if (dryRun) { console.log('[standings] dry-run — no write'); return; }

  const existing = await sheets.getSheetData(TAB).catch(() => null);
  if (!existing) {
    await sheets.createSheet(TAB, HEADERS);
  }
  // Full overwrite from row 1; pad with blank rows so a shrinking table never
  // leaves stale pilots behind (recompute means recompute).
  const values = [HEADERS].concat(rows);
  const oldLen = existing ? existing.length : 0;
  while (values.length < oldLen) values.push(HEADERS.map(() => ''));
  await sheets.updateRangeByPosition(TAB, 1, 1, values);

  // Verify-after-write (engine rule): read back and confirm shape.
  const back = await sheets.getSheetData(TAB);
  const gotRows = back.filter(r => String(r[1] || '').startsWith('POP-')).length;
  if (gotRows !== rows.length) {
    throw new Error('verify failed: wrote ' + rows.length + ' pilot rows, read back ' + gotRows);
  }
  console.log('[standings] ' + TAB + ' updated + verified (' + rows.length + ' rows)');
}

main().catch(e => {
  console.error('[standings] FATAL: ' + (e && e.message || e));
  process.exit(1);
});
