#!/usr/bin/env node
/**
 * buildOaksGroundSlice.js — Talia Finch's Oaks ground slice (the sports lane,
 * builder-directed 2026-09-10 program). Where Selena reads the board, Talia
 * reads the room: mood, fan sentiment, the neighborhood around the park.
 * pipeline.68 shape via beatSliceKit.
 *
 * Sources:
 *   Oakland_Sports_Feed (the Oaks rows; both clubs share the feed) —
 *     PlayerMood, FanSentiment, Notes, HomeNeighborhood lead; record/stats
 *     ride as context. (Chicago_Sports_Feed is dead legacy — not read.)
 *   Story_Hook_Deck / Story_Seed_Deck — name-matched only (the SPORTS hook
 *     theme monopoly belongs to P Slayer; engine cut filed).
 * Artifacts: output/slices/c{N}/talia-finch.md · output/cron-compare/oaks_ground_slice_c{N}.json
 */
'use strict';
const K = require('./beatSliceKit');
const sports = require('./sportsSubstrate');

const SEAT = {
  slug: 'talia-finch', name: 'Talia Finch', popid: 'POP-00592', desk: 'sports',
  kind: 'beat-oaks-ground', domain: 'oaks', artifact: 'oaks_ground', builder: 'buildOaksGroundSlice.js',
  version: 'OAKS-GROUND-1', nameRe: /talia\s*finch/i,
  tabs: ['Oakland_Sports_Feed', 'Story_Hook_Deck', 'Story_Seed_Deck'],
  approach: 'Oaks ground approach: this slice is what the Oaks feed says about the people — the mood in the room, the fans, the neighborhood around the park — with the record as context. First-person ground report. The moods and sentiments are feed rows, real; the walk to the park, the vendor, the kid with the glove are yours.',
  roomIsYours: 'the walk from the bus stop, the vendor who knows the regulars, what the crowd sounds like when the club is losing, the kid waiting by the tunnel',
  build
};

// Oaks rows only — the feed is A's-dominated; an Oaks-quiet week is an empty
// slice, never A's rows in her mail. Six-cycle window: the Oaks feed is sparse.
function oaksRows(beats, cycle) {
  return (beats.Oakland_Sports_Feed || [])
    .filter(r => Number(r.Cycle) != null && Number(r.Cycle) <= cycle && Number(r.Cycle) >= cycle - 5)
    .filter(r => /oaks/i.test(String(r.TeamsUsed || r.Team || '')));
}

function rowFacts(r) {
  const cyc = Number(r.Cycle);
  const src = 'output/beats/Oakland_Sports_Feed.jsonl C' + cyc;
  const team = String(r.TeamsUsed || 'Oaks').trim();
  const facts = [];
  if (r.FanSentiment) facts.push({ text: team + ' fans, C' + cyc + ': ' + r.FanSentiment, src });
  if (r.PlayerMood) facts.push({ text: 'Room mood, C' + cyc + ': ' + r.PlayerMood, src });
  if (r.Notes) facts.push({ text: 'Notebook (feed): ' + String(r.Notes).slice(0, 200), src });
  facts.push({
    text: team + ' — ' + String(r.EventType || 'event') + (r.SeasonType ? ' (' + r.SeasonType + ')' : '') +
      ', C' + cyc + ': ' + String(r.StoryAngle || '').trim(),
    src
  });
  if (r['Team Record'] && /\d/.test(String(r['Team Record']))) {
    facts.push({ text: 'Context: record ' + r['Team Record'] + (r.Streak ? ' · streak ' + r.Streak : ''), src });
  }
  if (r.HomeNeighborhood) facts.push({ text: 'Home neighborhood (feed): ' + r.HomeNeighborhood, src });
  return facts;
}

function build(cycle, { beats, profiles }) {
  const rows = oaksRows(beats, cycle).sort((a, b) => Number(b.Cycle) - Number(a.Cycle));
  const current = rows.filter(r => Number(r.Cycle) === Number(cycle));
  if (!rows.length) return K.emptySlice(SEAT, cycle, 'no Oaks rows on Oakland_Sports_Feed in the last 6 cycles');
  const facts = [];
  const people = [];
  for (const r of (current.length ? current : rows).slice(0, 3)) {
    facts.push(...rowFacts(r));
    for (const p of sports.resolveFeedPlayers(
      { namesUsed: r.NamesUsed, storyAngle: r.StoryAngle, notes: r.Notes },
      { byName: new Map([...profiles.values()].map(pr => [String(pr.Name || '').toLowerCase(), pr])), byPop: new Map() }, 6)) {
      if (!p.popid || people.some(x => x.popid === p.popid)) continue;
      people.push(K.person(p.popid, p.name, p.role, p.neighborhood, 'named on the Oaks feed C' + r.Cycle + ' (Oakland_Sports_Feed)'));
    }
  }
  const lead = rows[0];
  const team = String(lead.TeamsUsed || 'Oaks').trim();
  const mood = lead.FanSentiment || lead.PlayerMood || null;
  const label = team + ' ground read C' + lead.Cycle + (mood ? ' — ' + String(mood).slice(0, 80) : '');
  return K.makeSlice(SEAT, cycle, beats, {
    ref: 'output/beats/Oakland_Sports_Feed.jsonl @C' + cycle, hood: lead.HomeNeighborhood || null, label,
    angle: label + ' — the people around the second club',
    hookLine: mood ? String(mood).slice(0, 200) : String(lead.StoryAngle || label).slice(0, 200),
    facts, people,
    deltas: null,
    hooks: K.hooksFor(beats, cycle, SEAT.name),
    note: people.length ? null : 'no feed name resolves to a ledger citizen this cycle',
    extra: { feedRows: rows.length, currentCycleRows: current.length }
  });
}

const W = K.wire(SEAT);
if (require.main === module) W.main();
module.exports = { SEAT, loadSlice: W.load, buildOaksGroundSlice: W.build, writeOaksGroundSlice: W.write, loadOaksGroundSlice: W.load,
  isOaksGroundSeat: W.isSeat, assignmentFromSlice: W.assignmentFromSlice, enrichAssignment: W.enrichAssignment, slicePaths: W.paths };
