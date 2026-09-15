#!/usr/bin/env node
/**
 * buildOaksBeatSlice.js — Selena Grant's Oaks beat-analyst slice (the sports lane,
 * builder-directed 2026-09-10 program). The Oaks' own feed, raw — not the
 * distilled world-summary line. pipeline.68 shape via beatSliceKit.
 *
 * Sources:
 *   Oakland_Sports_Feed — the Oaks rows (TeamsUsed = "Oaks"; the feed carries
 *     both clubs, and the raw rows keep what the world summary drops:
 *     EventTrigger, FranchiseStability, EconomicFootprint, full Stats).
 *     (Chicago_Sports_Feed is dead legacy — Bulls rows end C91; not read.)
 *   Story_Hook_Deck / Story_Seed_Deck — name-matched only: SPORTS hooks name
 *     P Slayer 32/38 by theme-scoring (engine cut filed), so a domain fallback
 *     would just hand her his mail.
 * Artifacts: output/slices/c{N}/selena-grant.md · output/cron-compare/oaks_beat_slice_c{N}.json
 */
'use strict';
const K = require('./beatSliceKit');
const sports = require('./sportsSubstrate');

const SEAT = {
  slug: 'selena-grant', name: 'Selena Grant', popid: 'POP-00591', desk: 'sports',
  kind: 'beat-oaks-beat', domain: 'oaks', artifact: 'oaks_beat', builder: 'buildOaksBeatSlice.js',
  version: 'OAKS-BEAT-1', nameRe: /selena\s*grant/i,
  tabs: ['Oakland_Sports_Feed', 'Story_Hook_Deck', 'Story_Seed_Deck'],
  approach: 'Oaks beat-analyst approach: this slice is the Oaks feed raw — the record, the streak, the stats lines, the trigger behind each event. Third-person board read on the second club, not fan heat. Numbers come from the feed only — never invent a stat. The named players are real; the press row, the cage, the bus are yours.',
  roomIsYours: 'the near-empty press row, the bullpen chatter, what the manager says when the record is ugly, the drumbeat of a losing streak',
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
  const team = String(r.TeamsUsed || 'Oaks').trim();
  const facts = [{
    text: team + ' — ' + String(r.EventType || 'event') + (r.SeasonType ? ' (' + r.SeasonType + ')' : '') +
      ', C' + cyc + ': ' + String(r.StoryAngle || r.Notes || '').trim(),
    src: 'output/beats/Oakland_Sports_Feed.jsonl C' + cyc
  }];
  if (r['Team Record'] && /\d/.test(String(r['Team Record']))) {
    facts.push({ text: 'Record ' + r['Team Record'] + (r.Streak ? ' · streak ' + r.Streak : ''), src: 'output/beats/Oakland_Sports_Feed.jsonl C' + cyc });
  }
  if (sports.hasUsableStats({ stats: r.Stats })) {
    facts.push({ text: 'Stats (feed): ' + String(r.Stats).slice(0, 180), src: 'output/beats/Oakland_Sports_Feed.jsonl C' + cyc });
  }
  if (r.EventTrigger) facts.push({ text: 'Trigger: ' + r.EventTrigger, src: 'output/beats/Oakland_Sports_Feed.jsonl C' + cyc });
  if (r.FranchiseStability) facts.push({ text: 'Franchise stability: ' + r.FranchiseStability, src: 'output/beats/Oakland_Sports_Feed.jsonl C' + cyc });
  return facts;
}

function build(cycle, { beats, profiles }) {
  const rows = oaksRows(beats, cycle).sort((a, b) => Number(b.Cycle) - Number(a.Cycle));
  const current = rows.filter(r => Number(r.Cycle) === Number(cycle));
  if (!rows.length) return K.emptySlice(SEAT, cycle, 'no Oaks rows on Oakland_Sports_Feed in the last 6 cycles');
  const facts = [];
  const people = [];
  const ledgerIdx = new Map(); // POPID-keyed profiles already loaded by the kit caller
  for (const r of (current.length ? current : rows).slice(0, 3)) {
    facts.push(...rowFacts(r));
    for (const p of sports.resolveFeedPlayers(
      { namesUsed: r.NamesUsed, storyAngle: r.StoryAngle, notes: r.Notes },
      { byName: new Map([...profiles.values()].map(pr => [String(pr.Name || '').toLowerCase(), pr])), byPop: ledgerIdx }, 6)) {
      if (!p.popid || people.some(x => x.popid === p.popid)) continue;
      people.push(K.person(p.popid, p.name, p.role, p.neighborhood, 'named on the Oaks feed C' + r.Cycle + ' (Oakland_Sports_Feed)'));
    }
  }
  const lead = rows[0];
  const team = String(lead.TeamsUsed || 'Oaks').trim();
  const label = team + ' — ' + (lead.EventType || 'feed') + ' C' + lead.Cycle +
    (lead['Team Record'] ? ' · ' + lead['Team Record'] : '') + (lead.Streak ? ' · ' + lead.Streak : '');
  return K.makeSlice(SEAT, cycle, beats, {
    ref: 'output/beats/Oakland_Sports_Feed.jsonl @C' + cycle, hood: lead.HomeNeighborhood || null, label,
    angle: label + ' — the second club\'s board read',
    hookLine: String(lead.StoryAngle || lead.Notes || label).slice(0, 200),
    facts, people,
    deltas: null,
    hooks: K.hooksFor(beats, cycle, SEAT.name),
    note: people.length ? null : 'no feed name resolves to a ledger citizen this cycle',
    extra: { feedRows: rows.length, currentCycleRows: current.length }
  });
}

const W = K.wire(SEAT);
if (require.main === module) W.main();
module.exports = { SEAT, loadSlice: W.load, buildOaksBeatSlice: W.build, writeOaksBeatSlice: W.write, loadOaksBeatSlice: W.load,
  isOaksBeatSeat: W.isSeat, assignmentFromSlice: W.assignmentFromSlice, enrichAssignment: W.enrichAssignment, slicePaths: W.paths };
