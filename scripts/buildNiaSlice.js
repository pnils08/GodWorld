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
  // research.31: the board ranks achievement points first, credits beside;
  // PointsPending = nights whose points the next settle has yet to read
  const pts = leader.PointsTotal == null ? '' : leader.PointsTotal + ' achievement points' +
    (leader.PointsPending ? ' (' + leader.PointsPending + ' night(s) not yet counted)' : '') + ', ' +
    (leader.CreditsTotal == null ? '' : leader.CreditsTotal + ' credits, ');
  return ' Standings: ' + leader.Holder + ' leads the board — rank #1, ' + pts +
    leader.CyclesLed + ' cycle(s) led, current streak ' + leader.CurrentStreak + '.';
}

// One ledger scan for pilot hood + name — cheap, and hood seats the wake-2
// bench fill (neighborsFromLedger) in the pilot's own part of Oakland. The
// feed pack event never carries a display name (only POPID), so laneEntryFor
// fell back to printing the raw POPID as the pilot's "name" — a canon leak
// caught 2026-09-18 (Nia Rook C107, "POP-00495" printed instead of Rosalind
// Young, who the ledger and Undocked_Draw both name correctly). Same single
// pass now also resolves Name.
function citizenInfoFor(popids) {
  const want = new Set(popids.map(p => String(p).toUpperCase()));
  const out = {};
  if (!want.size || !fs.existsSync(SNAPSHOT)) return out;
  for (const line of fs.readFileSync(SNAPSHOT, 'utf8').split('\n')) {
    if (!line) continue;
    let r;
    try { r = JSON.parse(line); } catch (_) { continue; }
    const pop = String(r.POPID || '').toUpperCase();
    if (!want.has(pop)) continue;
    out[pop] = {
      hood: String(r.Neighborhood || '').trim() || null,
      name: String(r.Name || '').trim() || null,
      // research.29 (builder 2026-10-16): Nia knows WHO is in the chair. The
      // ledger's RoleType is the job line ("Second Baseman, Oakland A's",
      // "District Attorney"); the career lines come from the sports feed below.
      roleType: String(r.RoleType || '').trim() || null,
      employerBizId: String(r.EmployerBizId || '').trim() || null,
      tier: String(r.Tier || '').trim() || null,
    };
    if (Object.keys(out).length === want.size) break;
  }
  return out;
}

// research.29 — the pilot's career, as the sports feed already wrote it.
// Deterministic: every Oakland_Sports_Feed row from the last CAREER_WINDOW
// cycles whose NamesUsed carries the pilot's name, reduced to the sentence(s)
// of Notes that name them. No LLM, no new fact source — the feed is canon the
// sports desk already prints from. Eric Taveras C109-C111: playoff MVP, World
// Series MVP, the parade. A pilot with no feed rows gets []. Civic office
// holders (Clarissa Dane, DA) are covered by RoleType alone.
const SPORTS_FEED = path.join(ROOT, 'output', 'beats', 'Oakland_Sports_Feed.jsonl');
const CAREER_WINDOW = 6;
const CAREER_MAX_LINES = 3;

// agy review 2026-10-16 hunt 6: the feed's Notes carry the sports seat's working
// shorthand — "parade set for Downtown in c111", "rated at 82", "TrueSource" —
// which is apparatus, not canon. Strip the cNNN tokens, drop the sentences that
// are instructions or game ratings. Plain "next cycle" / "this cycle" stays:
// cycles are the city's own clock (.claude/rules/newsroom.md §Standing rules).
const CAREER_DROP_SENTENCE = /TrueSource|rated at \d+|summarize|debate\b/i;
function sanitizeCareerText(text) {
  return String(text || '')
    .replace(/\b(?:in|by|for|at|since)\s+c\d{2,3}\b/gi, '')
    .replace(/\bc\d{2,3}\b/gi, '')
    .replace(/\s{2,}/g, ' ').replace(/\s+([.,;:])/g, '$1').trim();
}
function seasonLabel(seasonType) {
  const s = String(seasonType || '').trim().replace(/-/g, ' ');
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : 'Season';
}
function sentencesNaming(text, name) {
  return String(text || '').split(/(?<=[.!?])\s+/)
    .filter(s => s.toLowerCase().includes(name.toLowerCase()) && !CAREER_DROP_SENTENCE.test(s));
}

function careerLinesFor(name, cycle, feedPath) {
  const p = feedPath || SPORTS_FEED;
  if (!name || !fs.existsSync(p)) return [];
  const c = Number(cycle);
  const lo = Number.isFinite(c) ? c - CAREER_WINDOW : -Infinity;
  const hi = Number.isFinite(c) ? c : Infinity;
  const needle = String(name).trim().toLowerCase();
  const lines = [];
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    if (!line) continue;
    let r;
    try { r = JSON.parse(line); } catch (_) { continue; }
    const rc = Number(r.Cycle);
    if (!Number.isFinite(rc) || rc < lo || rc > hi) continue;
    if (!String(r.NamesUsed || '').toLowerCase().includes(needle)) continue;
    const sents = sentencesNaming(r.Notes, name);
    if (!sents.length) continue;   // the row names them in NamesUsed but no clean sentence does
    const body = sanitizeCareerText(sents.join(' '));
    if (!body) continue;
    lines.push({ cycle: rc, seasonType: r.SeasonType || '', eventType: r.EventType || '',
      line: seasonLabel(r.SeasonType) + ': ' + body });
  }
  // newest first; the headline moments are the most recent rows
  lines.sort((a, b) => b.cycle - a.cycle);
  return lines.slice(0, CAREER_MAX_LINES);
}

// One line the writer reads before the flight: who this pilot is in the city.
function whoLine(name, info, career) {
  const role = info && info.roleType;
  let s = name + (role ? ' — ' + role : '');
  if (career && career.length) s += '. ' + career.map(l => l.line).join(' ');
  return s.replace(/\.$/, '');   // callers end the sentence
}

// agy review 2026-10-16 hunt 1: the Packet caps task.assignment (the angle) at
// 500 chars and the V2 auditor approves numbers only from known facts — so the
// identity and career ride as typed FACTS (story.facts → W1 known → W3
// approvedFacts), and the angle carries one short "in the chair" clause.
function whoFacts(name, info, career) {
  const out = [];
  if (info && info.roleType) out.push(name + ' — ' + info.roleType + ' (ledger)');
  for (const l of (career || [])) out.push(name + ', ' + l.line);
  return out;
}
function inChair(name, info) {
  return name + ((info && info.roleType) ? ' — ' + info.roleType : '');
}

function creditsPhrase(delta) {
  if (delta == null || delta === '') return 'a night the books can\'t settle yet';
  const n = Number(delta);
  if (n > 0) return 'up ' + n + ' on the night';
  if (n < 0) return 'down ' + Math.abs(n) + ' on the night';
  return 'dead even on the night';
}

function laneEntryFor(e, info, leader, cycle) {
  const hood = info && info.hood;
  const name = e.Holder || (info && info.name) || e.POPID;
  const career = careerLinesFor((info && info.name) || e.Holder, cycle);
  const who = whoLine(name, info, career);
  const label = 'UNDOCKED: ' + name + ' — ' + creditsPhrase(e.CreditsDelta) +
    (e.CombatEvents ? ', ' + e.CombatEvents + ' combat event(s)' : '') +
    (e.MishapCount ? ', ' + e.MishapCount + ' mishap(s)' : '');
  const entry = {
    ref: 'undocked:' + e.EpisodeId,
    label,
    kind: 'undocked',
    popids: [e.POPID],
    handle: {
      angle: 'UNDOCKED episode: ' + (name || 'the pilot') + '. Credits ' +
        (e.CreditsDelta == null ? 'unsettled' : e.CreditsDelta) +
        ', systems ' + ((e.Systems || []).join(', ') || 'unlisted') +
        ', combat ' + (e.CombatEvents || 0) + ', mishaps ' + (e.MishapCount || 0) +
        ', magnitude ' + (e.Magnitude || 1) + '/5' +
        ((e.Flags || []).indexOf('open_escrow') >= 0 ? ', open escrow position' : '') + '.' +
        standingsNote(leader) +
        ' In the chair: ' + inChair(name, info) + '.',
      citizens: [name + ' — ' + ((info && info.roleType) ? info.roleType + ', ' : '') + 'UNDOCKED cast pilot'],
      facts: whoFacts(name, info, career),
    },
    // research.29: the ledger record + career the writer sees (daily and weekly)
    who: { name, roleType: (info && info.roleType) || null, employerBizId: (info && info.employerBizId) || null,
      tier: (info && info.tier) || null, career },
    // typed feed facts ride whole for the write stage — never a new fact source
    undockedEvent: e,
  };
  if (hood) entry.hood = hood;
  return entry;
}

// --- Weekly leaderboard/digest (Mike-direct 2026-09-25, plan §(e) NEXT BUILD) ---
// Daily recaps tag their pilot 'quoted-source' — identical to any same-hood
// color citizen, never the credit path. This is the reliable one: one extra
// filing per cycle naming EVERY pilot who flew that week, deterministically
// tagged 'subject' at write time (see cron-desk-run.js runWrite injection) so
// UsageCount lands regardless of which daily solo piece makes print or how the
// model tags its own INTAKE. Independent recap key ('weekly-c<N>') — never
// touches a real EpisodeId, so it cannot suppress or re-litigate a daily recap.
function weeklyKey(cycle) { return 'weekly-c' + cycle; }

function pilotRosterFor(events) {
  const byPop = new Map();
  for (const e of events || []) {
    if (!e || !e.POPID) continue;
    const key = String(e.POPID).toUpperCase();
    if (!byPop.has(key)) {
      byPop.set(key, { POPID: e.POPID, episodes: 0, creditsDelta: 0, combatEvents: 0, mishapCount: 0, hasWindowed: false });
    }
    const row = byPop.get(key);
    row.episodes += 1;
    if (e.CreditsDelta == null) row.hasWindowed = true;
    else row.creditsDelta += Number(e.CreditsDelta) || 0;
    row.combatEvents += Number(e.CombatEvents) || 0;
    row.mishapCount += Number(e.MishapCount) || 0;
  }
  return Array.from(byPop.values());
}

function buildNiaWeeklySlice(cycle) {
  const c = Number(cycle);
  const empty = { v: V, cycle: c, empty: true, pilots: [], story: null };
  if (!Number.isFinite(c)) return empty;
  const recaps = loadRecaps();
  if (recaps[weeklyKey(c)]) return empty;   // already filed this cycle's digest
  const pack = loadJson(path.join(SHOW, 'feed', 'c' + c + '.json'), null);
  if (!pack || !Array.isArray(pack.events) || !pack.events.length) return empty;
  const roster = pilotRosterFor(pack.events);
  if (!roster.length) return empty;
  const citizenInfo = citizenInfoFor(roster.map(r => r.POPID));
  const standings = loadStandings();
  const leader = standingsLeader(standings);
  const pilots = roster.map(r => {
    const info = citizenInfo[String(r.POPID).toUpperCase()] || {};
    const name = info.name || r.POPID;
    const career = careerLinesFor(info.name, c);
    return Object.assign({}, r, { name, hood: info.hood || null,
      roleType: info.roleType || null, employerBizId: info.employerBizId || null, tier: info.tier || null,
      career, who: whoLine(name, info, career) });
  });
  // The angle stays under the Packet's 500-char assignment cap; the per-pilot
  // numbers and careers are typed facts below (agy hunt 1).
  const angle = 'UNDOCKED week: pilots who flew this cycle (' +
    pilots.map(p => p.name).join(', ') + ').' +
    standingsNote(leader) + ' In the chair: ' + pilots.map(p => inChair(p.name, p)).join('; ') + '.';
  const facts = [].concat(
    pilots.map(p => p.name + ' — ' + p.episodes + ' episode(s) this cycle, ' + (p.hasWindowed ? 'partial ' : '') +
      'credits ' + p.creditsDelta + ', combat ' + p.combatEvents + ', mishaps ' + p.mishapCount + ' (UNDOCKED feed)'),
    ...pilots.map(p => whoFacts(p.name, p, p.career))
  );
  return {
    v: V,
    cycle: c,
    empty: false,
    pilots,
    standings: leader ? { asOf: standings.computedAt, leader } : null,
    story: {
      ref: 'undocked-week:' + weeklyKey(c),
      label: 'UNDOCKED week-in-review c' + c,
      kind: 'undocked-digest',
      angle,
      facts,
      citizens: pilots.map(p => p.name + ' — ' + (p.roleType ? p.roleType + ', ' : '') + 'UNDOCKED cast pilot'),
      popids: pilots.map(p => p.POPID),
    },
    generatedAt: new Date().toISOString(),
  };
}

function weeklySlicePath(cycle, root) {
  return path.join(root || ROOT, 'output', 'cron-compare', 'nia_weekly_slice_c' + cycle + '.json');
}

function writeNiaWeeklySlice(cycle, slice, root) {
  const p = weeklySlicePath(cycle, root);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(slice, null, 2) + '\n');
  return p;
}

function loadNiaWeeklySlice(cycle, root) {
  return loadJson(weeklySlicePath(cycle, root), null);
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
  const citizenInfo = citizenInfoFor(unwritten.map(e => e.POPID));
  const standings = loadStandings();
  const leader = standingsLeader(standings);
  return {
    v: V,
    cycle: c,
    empty: false,
    events: unwritten,
    laneEntries: unwritten.map(e => laneEntryFor(e, citizenInfo[String(e.POPID).toUpperCase()], leader, c)),
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

module.exports = {
  V, buildNiaSlice, writeNiaSlice, loadNiaSlice, markRecapped, slicePath, standingsLeader, standingsNote,
  weeklyKey, buildNiaWeeklySlice, writeNiaWeeklySlice, loadNiaWeeklySlice, weeklySlicePath,
  citizenInfoFor, careerLinesFor, whoLine, whoFacts, sanitizeCareerText,
};
