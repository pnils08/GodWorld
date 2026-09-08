'use strict';

/**
 * buildNiaSlice.js — UNDOCKED recap lane builder (pipeline.60; plan §2.5,
 * docs/plans/2026-08-07-spacemolt-game-show.md).
 *
 * Nia Rook's lane is feed-built, not desk_signal-built: her facts come ONLY
 * from the gate-approved feed pack (output/spacemolt-show/feed/c{N}.json),
 * never raw episodes or the Undocked_Feed tab (her bag's data contract). The
 * one addition (plan (a′) piece 4, 2026-09-08): the standings sidecar
 * (output/spacemolt-show/standings.json, written by undockedStandings.js at
 * each recompute) — the recap names the board leader with Rank / CyclesLed /
 * CurrentStreak. Still fully local: no live-sheet reads in this builder.
 *
 * The slice turns each APPROVED, NOT-YET-RECAPPED feed event into a lane
 * entry shaped for the standard fanout/wake machinery (laneSeeds ->
 * storyFromSeed -> collectQuoteAsks). story.popids carries the pilot, so the
 * wake-2 citizen-quote pass interviews the pilot themselves — the pilot's
 * words come from the same citizenVoice machinery as every other quoted
 * citizen in the paper. That IS the sanctioned source-of-speech (§2.5
 * decision 4): no captains_log ever rides into prose.
 *
 * Recap ledger (output/spacemolt-show/recaps.json) records which EpisodeIds
 * have a filed draft — marked at write time by cron-desk-run's nia branch —
 * so a daily-cadence pack never re-litigates already-covered episodes.
 * Empty slice (no unwritten events) => Nia's desk has no lane => every wake
 * stage skips cleanly. That skip IS the conditional dispatch.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SHOW = path.join(ROOT, 'output', 'spacemolt-show');
const RECAPS = path.join(SHOW, 'recaps.json');
const STANDINGS = path.join(SHOW, 'standings.json');
const SNAPSHOT = path.join(ROOT, 'output', 'simulation_ledger_snapshot.jsonl');
const V = 'NIA-SLICE/1';

function loadJson(p, fallback) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (_) { return fallback; }
}

function loadRecaps() {
  return loadJson(RECAPS, {});
}

// Standings sidecar (written by undockedStandings.js at each recompute). The
// leader is the recap's editorial hook: Nia names who's on top.
function loadStandings() {
  const s = loadJson(STANDINGS, null);
  return s && Array.isArray(s.rows) && s.rows.length ? s : null;
}

function standingsLeader(standings) {
  if (!standings) return null;
  return standings.rows.find(r => Number(r.Rank) === 1) || null;
}

function standingsNote(leader) {
  if (!leader) return '';
  return ' Standings: ' + leader.Holder + ' leads the board — rank #1, ' +
    leader.CyclesLed + ' cycle(s) led, current streak ' + leader.CurrentStreak + '.';
}

// One ledger scan for pilot hoods — cheap, and hood seats the wake-2 bench
// fill (neighborsFromLedger) in the pilot's own part of Oakland.
function hoodsFor(popids) {
  const want = new Set(popids.map(p => String(p).toUpperCase()));
  const out = {};
  if (!want.size || !fs.existsSync(SNAPSHOT)) return out;
  for (const line of fs.readFileSync(SNAPSHOT, 'utf8').split('\n')) {
    if (!line) continue;
    let r;
    try { r = JSON.parse(line); } catch (_) { continue; }
    const pop = String(r.POPID || '').toUpperCase();
    if (!want.has(pop)) continue;
    out[pop] = String(r.Neighborhood || '').trim() || null;
    if (Object.keys(out).length === want.size) break;
  }
  return out;
}

function creditsPhrase(delta) {
  if (delta == null || delta === '') return 'a night the books can\'t settle yet';
  const n = Number(delta);
  if (n > 0) return 'up ' + n + ' on the night';
  if (n < 0) return 'down ' + Math.abs(n) + ' on the night';
  return 'dead even on the night';
}

function laneEntryFor(e, hood, leader) {
  const label = 'UNDOCKED: ' + (e.Holder || e.POPID) + ' — ' + creditsPhrase(e.CreditsDelta) +
    (e.CombatEvents ? ', ' + e.CombatEvents + ' combat event(s)' : '') +
    (e.MishapCount ? ', ' + e.MishapCount + ' mishap(s)' : '');
  const entry = {
    ref: 'undocked:' + e.EpisodeId,
    label,
    kind: 'undocked',
    popids: [e.POPID],
    handle: {
      angle: 'Recap ' + (e.Holder || 'the pilot') + '\'s UNDOCKED episode — who\'s up, who\'s down, ' +
        'what the city argues about tomorrow. Facts: credits ' +
        (e.CreditsDelta == null ? 'unsettled' : e.CreditsDelta) +
        ', systems ' + ((e.Systems || []).join(', ') || 'unlisted') +
        ', combat ' + (e.CombatEvents || 0) + ', mishaps ' + (e.MishapCount || 0) +
        ', magnitude ' + (e.Magnitude || 1) + '/5' +
        ((e.Flags || []).indexOf('open_escrow') >= 0 ? ', open escrow position' : '') + '.' +
        standingsNote(leader),
      citizens: [(e.Holder || e.POPID) + ' — UNDOCKED cast pilot'],
    },
    // typed feed facts ride whole for the write stage — never a new fact source
    undockedEvent: e,
  };
  if (hood) entry.hood = hood;
  return entry;
}

function buildNiaSlice(cycle) {
  const c = Number(cycle);
  const empty = { v: V, cycle: c, empty: true, events: [], laneEntries: [] };
  if (!Number.isFinite(c)) return empty;
  const pack = loadJson(path.join(SHOW, 'feed', 'c' + c + '.json'), null);
  if (!pack || !Array.isArray(pack.events) || !pack.events.length) return empty;
  const recaps = loadRecaps();
  const unwritten = pack.events.filter(e => e && e.EpisodeId && !recaps[e.EpisodeId]);
  if (!unwritten.length) return empty;
  const hoods = hoodsFor(unwritten.map(e => e.POPID));
  const standings = loadStandings();
  const leader = standingsLeader(standings);
  return {
    v: V,
    cycle: c,
    empty: false,
    events: unwritten,
    laneEntries: unwritten.map(e => laneEntryFor(e, hoods[String(e.POPID).toUpperCase()], leader)),
    standings: leader ? { asOf: standings.computedAt, leader } : null,
    generatedAt: new Date().toISOString(),
  };
}

function slicePath(cycle, root) {
  return path.join(root || ROOT, 'output', 'cron-compare', 'nia_slice_c' + cycle + '.json');
}

function writeNiaSlice(cycle, slice, root) {
  const p = slicePath(cycle, root);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(slice, null, 2) + '\n');
  return p;
}

function loadNiaSlice(cycle, root) {
  return loadJson(slicePath(cycle, root), null);
}

// Called by cron-desk-run's write stage after Nia's draft lands (gate pass or
// flagged — either way she FILED; re-running the wake on a flagged draft is a
// human recovery step, not an automatic re-litigation).
function markRecapped(episodeIds, meta) {
  const recaps = loadRecaps();
  const at = new Date().toISOString();
  for (const id of episodeIds || []) {
    if (!id) continue;
    recaps[id] = Object.assign({ at }, meta || {});
  }
  fs.mkdirSync(path.dirname(RECAPS), { recursive: true });
  fs.writeFileSync(RECAPS, JSON.stringify(recaps, null, 2) + '\n');
  return recaps;
}

module.exports = { V, buildNiaSlice, writeNiaSlice, loadNiaSlice, markRecapped, slicePath, standingsLeader, standingsNote };
