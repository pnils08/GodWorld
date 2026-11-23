#!/usr/bin/env node
/**
 * buildTrendsSlice.js — Celeste Tran's social-trends slice (the culture-lane
 * program; the seat exists on the ledger, POP-00164 — scripts half built before
 * her voice agent). pipeline.68 shape via beatSliceKit.
 *
 * What the city is doing together this week:
 *   Cultural_Ledger — who the city is talking about THIS cycle (MediaCount gained vs
 *     output/beats/prev/, pipeline.81), and who just appeared. Only figures linked to a
 *     ledger citizen ride (no-POPID rows are engine template names Rhea cannot verify).
 *   Neighborhood_Demographics vs output/beats/prev/ — where people are moving
 *     (adults/students deltas per hood; the drift that IS live).
 *   Story_Hook_Deck — name-matched, plus NEIGHBORHOOD_BOOM / RISING / COOLING /
 *     CITIZEN_RELOCATED / RENT_BURDEN_CRISIS by domain.
 * pipeline.111 (builder 2026-11-22: "celeste seems to be more about what shows are trending and who is watching it and
 * where … undocked watch parties"): what Oakland is watching and doing together —
 *   output/world_summary_c{N}.md ## Evening Texture — the show slate (TV, movies, broadcast, the streaming trend)
 *   LifeHistory_Log (this Cycle) — UNDOCKED's audience (source:undocked: who watched, argued, wagered, where),
 *     game-night watchers (the game-night-texture row's citizens, their own sports lines), and the moments the
 *     most citizens shared this week, counted
 *   the city's mood across the last three Cycles (world summary)
 * The engine ties a watcher to UNDOCKED and the A's only; no row says who watched which show (a trending page is
 * a future build). No code-written angle or hook.
 *   The pulse (pipeline.70 seam 3) — output/cron-compare/pulse_c{N}.json from buildPulseSlice.js:
 *     what the citizens' own pages are talking about (THE PAGES SAY) and the loudest voice on each
 *     of the top themes as a person on the record. Absent pulse = no section, a note, nothing else.
 * Artifacts: output/slices/c{N}/celeste-tran.md · output/cron-compare/trends_slice_c{N}.json
 */
'use strict';
const fs = require('fs');
const path = require('path');
const K = require('./beatSliceKit');
const pulseSlice = require('./buildPulseSlice');

const SEAT = {
  slug: 'celeste-tran', name: 'Celeste Tran', popid: 'POP-00164', desk: 'wire',
  kind: 'beat-trends', domain: 'trends', artifact: 'trends', builder: 'buildTrendsSlice.js',
  version: 'TRENDS-SLICE-7', nameRe: /celeste\s*tran/i,
  tabs: ['Cultural_Ledger', 'Neighborhood_Demographics', 'LifeHistory_Log'],
  // + output/cron-compare/pulse_c{N}.json (pipeline.70), read soft
  approach: '',
  roomIsYours: '',
  build
};

const ACTIVE_RE = /inactive|retired|closed/i;
const PEOPLE_CAP = 40;
const UNDOCKED_PEOPLE = 12;
const GAME_PEOPLE = 8;
const SHARED_MIN = 5;
const SHARED_TOP = 12;

function build(cycle, { root, beats, profiles }) {
  // pipeline.81: mentions gained since the previous dump, keyed by CUL-ID (Name as fallback).
  const prevCul = K.prevTabRows(root, 'Cultural_Ledger');
  const prevCount = new Map(prevCul.rows.map(r => [String(r['CUL-ID'] || r.Name || '').trim(), K.num(r.MediaCount) || 0]));
  // A delta is "this cycle" only against the dump of the cycle before (codex 2026-10-16: a stale or
  // same-cycle prev/ is not last week). Without that baseline, gained is null and the slice says so.
  const hasPrevCul = prevCul.state === 'PRIOR_CYCLE_ON_DISK' && prevCul.rows.length > 0 && Number(prevCul.vs) === Number(cycle) - 1;
  const baselineNote = hasPrevCul ? null : (prevCul.state === 'PRIOR_CYCLE_ON_DISK' && prevCul.rows.length
    ? 'no usable culture-record baseline (prev/ is C' + prevCul.vs + ', not C' + (Number(cycle) - 1) + ') — movement unavailable, sightings this cycle stand in'
    : 'no prior culture-record dump — movement unavailable, sightings this cycle stand in');
  const figures = (beats.Cultural_Ledger || [])
    .filter(r => r.Name && !ACTIVE_RE.test(String(r.Status || '')))
    // pipeline.81 Task 2: a figure with no ledger citizen is a template name — off the slice.
    .filter(r => /POP-/i.test(String(r.UniverseLinks || '')))
    .map(r => ({
      name: String(r.Name).trim(),
      role: String(r.RoleType || '').trim() || null,
      domain: String(r.CulturalDomain || '').trim() || null,
      // hood: the citizen row's Neighborhood when the figure links to one (K.figureHood) —
      // the Cultural_Ledger column is a staged-sighting hood, not a residence.
      ...K.figureHood(profiles, String(r.UniverseLinks || '').split(/[;,\s]+/).filter(t => /^POP-/i.test(t)), r.Neighborhood),
      fame: K.num(r.FameScore),
      mediaCount: K.num(r.MediaCount),
      trend: String(r.TrendTrajectory || '').trim() || null,
      firstSeen: K.num(r.FirstSeenCycle),
      lastSeen: K.num(r.LastSeenCycle),
      // gained this cycle: vs prev/ when on disk (a row new since the dump gains its whole count);
      // with no prev/, null — sighted-this-cycle stands in for movement.
      // A row absent from a valid prev/ is new ONLY if it was first seen after that dump; an older row the
      // dump simply lacks has unknown movement (null), never its whole lifetime count (codex 2026-10-16).
      gained: !hasPrevCul ? null : prevCount.has(String(r['CUL-ID'] || r.Name || '').trim())
        ? (K.num(r.MediaCount) || 0) - prevCount.get(String(r['CUL-ID'] || r.Name || '').trim())
        : (K.num(r.FirstSeenCycle) != null && K.num(r.FirstSeenCycle) > Number(prevCul.vs) ? (K.num(r.MediaCount) || 0) : null),
      popids: String(r.UniverseLinks || '').split(/[;,\s]+/).filter(t => /^POP-/i.test(t)).map(t => t.toUpperCase())
    }));
  const demoRows = beats.Neighborhood_Demographics || [];
  if (!figures.length && !demoRows.length) return K.emptySlice(SEAT, cycle, 'no Cultural_Ledger or Neighborhood_Demographics rows');

  const facts = [];
  const people = [];
  const seenNames = new Set();
  const culSrc = 'output/beats/Cultural_Ledger.jsonl @C' + cycle;

  // What the city is talking about THIS cycle (pipeline.81): mentions gained vs prev/, then
  // sighted this cycle, then the lifetime count. A figure that did not move never leads —
  // a lifetime leader would hand the seat the same angle every cycle (C109–C111).
  const movedNow = f => hasPrevCul ? (f.gained != null && f.gained > 0) : f.lastSeen === Number(cycle) && f.mediaCount > 0;
  // pipeline.111 (builder 2026-11-22: "1 and 2 yes"): A's players rising are the sports desk's; the paper's staff are not hers.
  const notHers = f => /^sports$/i.test(String(f.domain || '')) || f.popids.some(id => K.isMediaStaff(profiles, id));
  const talkedAbout = figures.filter(f => !notHers(f) && f.mediaCount != null && movedNow(f))
    .sort((a, b) => ((b.gained || 0) - (a.gained || 0)) ||
      ((b.lastSeen === Number(cycle)) - (a.lastSeen === Number(cycle))) ||
      (b.mediaCount - a.mediaCount) || ((b.fame || 0) - (a.fame || 0)));
  const movedText = f => (f.gained != null ? 'gained ' + f.gained + ' mention' + (f.gained === 1 ? '' : 's') + ' this cycle (' + f.mediaCount + ' total)'
    : 'on the record this cycle (' + f.mediaCount + ' mentions total)');
  for (const f of talkedAbout.slice(0, 3)) {
    seenNames.add(f.name);
    facts.push({
      text: f.name + (f.role ? ' (' + f.role + ')' : '') + (f.domain ? ', ' + f.domain : '') + ' — ' + movedText(f) +
        (f.trend ? ', ' + f.trend : '') + (f.fame != null ? ', fame ' + f.fame : ''),
      src: hasPrevCul ? culSrc + ' vs output/beats/prev/Cultural_Ledger.jsonl @C' + prevCul.vs : culSrc
    });
    for (const popid of f.popids) {
      if (popid === SEAT.popid || K.isMediaStaff(profiles, popid) || people.some(p => p.popid === popid) || people.length >= PEOPLE_CAP) continue;   // agy 2026-11-23 #5
      const p = K.personFromProfile(profiles, popid, 'the city is talking about them (Cultural_Ledger)', f.hood);
      if (p) people.push(p);
    }
  }
  // Who just appeared.
  const appeared = figures.filter(f => !notHers(f) && f.firstSeen != null && f.firstSeen >= cycle - 1 && !seenNames.has(f.name));
  for (const f of appeared.slice(0, 2)) {
    seenNames.add(f.name);
    facts.push({ text: f.name + (f.domain ? ' (' + f.domain + ')' : '') + ' — new on the culture record C' + f.firstSeen, src: culSrc });
  }

  // Where people are moving (the drift that is live).
  const prev = K.prevTabRows(root, 'Neighborhood_Demographics');
  const prevBy = new Map(prev.rows.map(r => [K.hoodKey(r.Neighborhood), r]));
  const moves = [];
  for (const r of demoRows) {
    const p = prevBy.get(K.hoodKey(r.Neighborhood));
    if (!p) continue;
    const dA = K.num(r.Adults) != null && K.num(p.Adults) != null ? K.num(r.Adults) - K.num(p.Adults) : 0;
    const dS = K.num(r.Students) != null && K.num(p.Students) != null ? K.num(r.Students) - K.num(p.Students) : 0;
    if (dA || dS) moves.push({ hood: r.Neighborhood, dA, dS, total: Math.abs(dA) + Math.abs(dS) });
  }
  moves.sort((a, b) => b.total - a.total);
  if (moves.length) {
    facts.push({
      text: 'Movement vs C' + prev.vs + ': ' + moves.slice(0, 5).map(m =>
        m.hood + ' ' + ((m.dA + m.dS) > 0 ? '+' : '') + (m.dA + m.dS) + ' people').join(', '),
      src: 'output/beats/prev/Neighborhood_Demographics.jsonl vs current @C' + cycle
    });
  }

  // pipeline.111: what Oakland is watching and doing together this week.
  const add = (popid, why) => {
    const id = String(popid || '').toUpperCase();
    if (!/^POP-\d+$/.test(id) || id === SEAT.popid || K.isMediaStaff(profiles, id) || people.some(p => p.popid === id) || people.length >= PEOPLE_CAP) return;
    const p = K.personFromProfile(profiles, id, why);
    if (!p) return;
    p.profile = p.profile + ' — ' + why;   // the reason rides where every packet prints the person
    people.push(p);
  };
  const wsFile = path.join(root, 'output', 'world_summary_c' + cycle + '.md');
  const ws = fs.existsSync(wsFile) ? fs.readFileSync(wsFile, 'utf8').split('\n') : [];
  const evI = ws.findIndex(l => l.startsWith('## Evening Texture'));
  for (let k = evI + 1; evI >= 0 && k < ws.length && !ws[k].startsWith('#'); k++) {
    const t = ws[k].trim().replace(/\*\*/g, '');
    if (/^- (Evening media TV|Evening media movies|Sports broadcast|Streaming trend):/.test(t)) facts.push({ text: t.slice(2), src: 'output/world_summary_c' + cycle + '.md ## Evening Texture' });
  }
  const mood = ws.find(l => /^- \*\*City sentiment:\*\* C\d+/.test(l));
  if (mood) facts.push({ text: 'City mood ' + mood.replace(/^- \*\*City sentiment:\*\*\s*/, ''), src: 'output/world_summary_c' + cycle + '.md (Riley_Digest CitySentiment)' });

  const life = (beats.LifeHistory_Log || []).filter(r => String(r.Cycle) === String(cycle) && String(r.EventText || '').trim());
  const undocked = life.filter(r => /(^|\|)Undocked-Audience(\||$)/.test(String(r.EventTag || '')));
  if (undocked.length) {
    const kinds = {};
    for (const r of undocked) { const k = (String(r.EventTag).match(/ecl:kind:([^|]+)/) || [])[1] || 'watch'; kinds[k] = (kinds[k] || 0) + 1; }
    const hoods = new Set(undocked.map(r => r.Neighborhood).filter(Boolean));
    facts.push({ text: 'UNDOCKED audience C' + cycle + ': ' + undocked.length + ' citizens in ' + hoods.size + ' neighborhoods — ' +
      Object.entries(kinds).sort((a, b) => b[1] - a[1]).map(([k, n]) => n + ' ' + k).join(', '), src: 'output/beats/LifeHistory_Log.jsonl @C' + cycle + ' Undocked-Audience' });
    for (const r of undocked.slice(0, UNDOCKED_PEOPLE)) add(r.POPID, 'UNDOCKED audience, C' + cycle + ': ' + String(r.EventText).trim());
  }
  const gn = ws.find(l => /^- game-night-texture\b/.test(l));
  if (gn) {
    facts.push({ text: gn.slice(2), src: 'output/world_summary_c' + cycle + '.md ## What Moved › game-night-texture (Ripple_Ledger)' });
    for (const pop of (gn.match(/POP-\d+/g) || []).slice(0, GAME_PEOPLE)) {
      const own = life.find(r => String(r.POPID).toUpperCase() === pop && /source:sports\b/.test(String(r.EventTag || '')));
      add(pop, 'game night shaped their day, C' + cycle + (own ? ': ' + String(own.EventText).trim() : ''));
    }
  }
  const shared = new Map();
  for (const r of life) {
    const t = String(r.EventText).replace(/\s+near\s+.*$/i, '').trim();
    if (!shared.has(t)) shared.set(t, []);
    shared.get(t).push(r);
  }
  const top = [...shared.entries()].filter(([, rs]) => rs.length >= SHARED_MIN).sort((a, b) => b[1].length - a[1].length).slice(0, SHARED_TOP);
  for (const [t, rs] of top) {
    const hoods = new Set(rs.map(r => r.Neighborhood).filter(Boolean));
    facts.push({ text: rs.length + ' citizens in ' + hoods.size + ' neighborhoods, C' + cycle + ': ' + t, src: 'output/beats/LifeHistory_Log.jsonl @C' + cycle + ' (shared line, counted)' });
    for (const r of rs.slice(0, 1)) add(r.POPID, 'one of ' + rs.length + ' citizens this cycle who ' + t);
  }

  // pipeline.70 seam 3: the pages. The loudest voice on each of the top three themes becomes a
  // person on the record (her sources), the top five themes ride as colour. Athletes count like
  // anyone (pipeline.73); MEDIA seats stay out (buildPulseSlice).
  const pulse = pulseSlice.load(cycle, root);
  const pageVoices = pulse ? pulseSlice.voiceLines(pulse, 5) : [];
  if (pulse) {
    for (const t of pulse.themes.filter(t => t.voices.length).slice(0, 3)) {
      const v = t.voices[0];
      if (v.popid === SEAT.popid || K.isMediaStaff(profiles, v.popid) || people.some(p => p.popid === v.popid) || people.length >= PEOPLE_CAP) continue;   // agy 2026-11-23 #5
      const p = K.personFromProfile(profiles, v.popid, 'has been saying it on their own page — ' + t.label + ', C' + v.cycle + ': “' + v.excerpt + '”', v.hood);
      if (p) people.push(p);
    }
  }

  if (!facts.length && !people.length) return K.emptySlice(SEAT, cycle, 'nothing on the trends record this cycle');
  return K.makeSlice(SEAT, cycle, beats, {
    ref: 'the trends record of C' + cycle, hood: null, label: 'the trends record of C' + cycle,
    angle: 'the trends record of C' + cycle, hookLine: '',
    facts, people, peopleCap: PEOPLE_CAP, factCap: Math.max(12, facts.length),
    deltas: { state: prev.state, vs: prev.vs },
    hooks: [],
    pageVoices,
    note: [baselineNote, pulse ? null : 'no pulse on disk for this Cycle (buildPulseSlice.js) — the pages are silent in this slice'].filter(Boolean).join('; ') || null,
    extra: { talkedAbout: talkedAbout.length, appeared: appeared.length, moves: moves.length, undocked: undocked.length,
      pulse: pulse ? { generatedAt: pulse.generatedAt, docs: pulse.counted.docs, citizens: pulse.counted.citizens } : null }
  });
}

const sitsOutWhenEmpty = true;
const W = K.wire(SEAT);
if (require.main === module) W.main();
module.exports = { SEAT, sitsOutWhenEmpty, loadSlice: W.load, buildTrendsSlice: W.build, writeTrendsSlice: W.write, loadTrendsSlice: W.load,
  isTrendsSeat: W.isSeat, assignmentFromSlice: W.assignmentFromSlice, enrichAssignment: W.enrichAssignment, slicePaths: W.paths };
