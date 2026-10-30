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
 * Columns: Rank, POPID, Holder, Episodes, PointsTotal, CreditsTotal,
 * CombatTotal, MishapTotal, BestMagnitude, LastAiredCycle, CyclesLed,
 * CurrentStreak.
 *  - Rank/CyclesLed/CurrentStreak rank on cumulative PointsTotal (the game's
 *    own achievement points), then CreditsTotal, then POPID so the output is
 *    stable under re-runs (builder ruling C, research.31, 2026-10-30).
 *  - CyclesLed replays aired cycles in order: after each TargetCycle's rows
 *    land, the leader logs one led cycle. CurrentStreak is the run of
 *    consecutive aired cycles led up to the latest one. A cycle that aired
 *    before POINTS_FROM_CYCLE keeps the leader it was awarded under the credits
 *    board ("Eric Taveras should not lose what he was awarded" — builder
 *    2026-10-30); from it on, the leader is the points board's.
 *  - Blank CreditsDelta / PointsDelta is NOT zero (nullable by contract) — it
 *    just doesn't move the total. Episodes still counts the flight. A blank
 *    PointsDelta means the pilot's account was not read that night; the next
 *    daily settle fills it. The sidecar carries PointsPending (count of such
 *    nights) so a reader can say the total is not final (codex research.31 F7).
 *
 * Usage: node scripts/undockedStandings.js [--dry-run]
 */

require('/root/GodWorld/lib/env');
const fs = require('fs');
const path = require('path');
const sheets = require('../lib/sheets');

const FEED_TAB = 'Undocked_Feed';
const TAB = 'Undocked_Standings';
// Local sidecar (plan (a′) piece 4, 2026-09-08): the same recompute, written
// where the slice builders can read it without a live-sheet call — Nia's
// slice reads this file, never the tab (her data contract is local packs).
const SIDECAR = path.join(__dirname, '..', 'output', 'spacemolt-show', 'standings.json');
// The points board was ruled mid-cycle 114 (C113 had already aired). Cycles
// through 113 were led, and named on air, under the credits board.
const POINTS_FROM_CYCLE = 114;
const HEADERS = ['Rank', 'POPID', 'Holder', 'Episodes', 'PointsTotal', 'CreditsTotal',
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
        iEp = col('EpisodeId'), iCredits = col('CreditsDelta'), iPoints = col('PointsDelta'),
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
      points: iPoints >= 0 ? num(row[iPoints]) : null,
      combat: num(row[iCombat]) || 0,
      mishaps: num(row[iMishap]) || 0,
      magnitude: num(row[iMag]),
    });
  }

  const pilots = {};
  const byCycle = {};
  for (const e of events) {
    const p = pilots[e.pop] || (pilots[e.pop] = {
      pop: e.pop, holder: '', episodes: 0, points: 0, pointsPending: 0, credits: 0, combat: 0,
      mishaps: 0, bestMag: null, lastAired: null,
    });
    p.episodes++;
    if (e.holder) p.holder = e.holder;
    if (e.credits != null) p.credits += e.credits;
    if (e.points != null) p.points += e.points;
    else p.pointsPending++;
    p.combat += e.combat;
    p.mishaps += e.mishaps;
    if (e.magnitude != null && (p.bestMag == null || e.magnitude > p.bestMag)) p.bestMag = e.magnitude;
    if (p.lastAired == null || e.target > p.lastAired) p.lastAired = e.target;
    (byCycle[e.target] || (byCycle[e.target] = [])).push(e);
  }

  // Replay aired cycles for CyclesLed / CurrentStreak.
  const cycles = Object.keys(byCycle).map(Number).sort((a, b) => a - b);
  const running = {};
  const runningPts = {};
  const led = {};
  let lastLeader = null;
  let streak = 0;
  for (const c of cycles) {
    for (const e of byCycle[c]) {
      if (e.credits != null) running[e.pop] = (running[e.pop] || 0) + e.credits;
      else if (!(e.pop in running)) running[e.pop] = 0;
      runningPts[e.pop] = (runningPts[e.pop] || 0) + (e.points || 0);
    }
    const byPoints = c >= POINTS_FROM_CYCLE;
    const leader = Object.keys(running).sort((a, b) =>
      (byPoints ? (runningPts[b] - runningPts[a]) : 0) || (running[b] - running[a]) || (a < b ? -1 : 1))[0];
    if (leader) {
      led[leader] = (led[leader] || 0) + 1;
      streak = leader === lastLeader ? streak + 1 : 1;
      lastLeader = leader;
    }
  }

  const ranked = Object.values(pilots).sort((a, b) =>
    (b.points - a.points) || (b.credits - a.credits) || (a.pop < b.pop ? -1 : 1));
  const rows = ranked.map((p, i) => [
    i + 1, p.pop, p.holder, p.episodes, p.points, p.credits, p.combat, p.mishaps,
    p.bestMag == null ? '' : p.bestMag, p.lastAired == null ? '' : p.lastAired,
    led[p.pop] || 0, p.pop === lastLeader ? streak : 0,
  ]);
  // Sidecar-only (not a tab column): nights whose points are not read yet.
  rows.pending = Object.fromEntries(ranked.map(p => [p.pop, p.pointsPending]));
  return rows;
}

// research.31: the live grid was exactly 11 columns wide (2026-10-30) and the
// board is now 12. Widen it (appendDimension only adds), never shrink.
async function writeGrown(tab, values) {
  try {
    await sheets.updateRangeByPosition(tab, 1, 0, values); // startCol is 0-indexed: col A
  } catch (e) {
    const m = /exceeds grid limits.*max columns: (\d+)/i.exec(e && e.message || '');
    const need = m ? values[0].length - Number(m[1]) : 0;
    if (!(need > 0)) throw e;
    const ids = await sheets.getSheetIds([tab]);
    await sheets.batchUpdateSpreadsheet([{ appendDimension: {
      sheetId: ids[tab], dimension: 'COLUMNS', length: need } }]);
    await sheets.updateRangeByPosition(tab, 1, 0, values);
  }
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const feed = await sheets.getSheetData(FEED_TAB);
  if (!feed || !feed.length) throw new Error(FEED_TAB + ' unreadable — refusing to compute');
  const rows = compute(feed);
  // Feed rows pushed before the holder fix carry a blank Holder; resolve by POPID
  // against the ledger (the world's record) so the board never shows a bare ID.
  const led = rows.some(r => !r[2]) ? await sheets.getSheetData('Simulation_Ledger') : null;
  if (led && led.length) {
    const h = led[0], iP = h.indexOf('POPID'), iF = h.indexOf('First'), iL = h.indexOf('Last');
    const byPop = {};
    for (let i = 1; i < led.length; i++) {
      const id = String(led[i][iP] || '').trim().toUpperCase();
      if (id) byPop[id] = (String(led[i][iF] || '').trim() + ' ' + String(led[i][iL] || '').trim()).trim();
    }
    rows.forEach(r => { if (!r[2] && byPop[r[1]]) r[2] = byPop[r[1]]; });
  }
  console.log('[standings] ' + rows.length + ' pilot(s):');
  rows.forEach(r => console.log('  #' + r[0] + ' ' + r[2] + ' (' + r[1] + ') — ' +
    r[3] + ' ep, points ' + r[4] + ', credits ' + r[5] + ', led ' + r[10] + ', streak ' + r[11]));
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
  await writeGrown(TAB, values);

  // Verify-after-write (engine rule): read back and confirm shape.
  const back = await sheets.getSheetData(TAB);
  const gotRows = back.filter(r => String(r[1] || '').startsWith('POP-')).length;
  if (gotRows !== rows.length) {
    throw new Error('verify failed: wrote ' + rows.length + ' pilot rows, read back ' + gotRows);
  }
  console.log('[standings] ' + TAB + ' updated + verified (' + rows.length + ' rows)');

  // Sidecar for the slice builders (same data, local file, no sheet read).
  fs.mkdirSync(path.dirname(SIDECAR), { recursive: true });
  fs.writeFileSync(SIDECAR, JSON.stringify({
    v: 'UNDOCKED-STANDINGS/2',
    computedAt: new Date().toISOString(),
    rows: rows.map(r => ({
      Rank: r[0], POPID: r[1], Holder: r[2], Episodes: r[3], PointsTotal: r[4], CreditsTotal: r[5],
      CombatTotal: r[6], MishapTotal: r[7],
      BestMagnitude: r[8] === '' ? null : r[8], LastAiredCycle: r[9] === '' ? null : r[9],
      CyclesLed: r[10], CurrentStreak: r[11], PointsPending: rows.pending[r[1]] || 0,
    })),
  }, null, 2) + '\n');
  console.log('[standings] sidecar written: ' + path.relative(path.join(__dirname, '..'), SIDECAR));
}

module.exports = { compute, HEADERS, POINTS_FROM_CYCLE };

if (require.main === module) {
  main().catch(e => {
    console.error('[standings] FATAL: ' + (e && e.message || e));
    process.exit(1);
  });
}
