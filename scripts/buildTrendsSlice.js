#!/usr/bin/env node
/**
 * buildTrendsSlice.js — Celeste Tran's social-trends slice (the culture-lane
 * program; the seat exists on the ledger, POP-00164 — scripts half built before
 * her voice agent). pipeline.68 shape via beatSliceKit.
 *
 * What the city is doing together this week:
 *   Cultural_Ledger — who/what the city is talking about (MediaCount x trend),
 *     and who just appeared.
 *   Neighborhood_Demographics vs output/beats/prev/ — where people are moving
 *     (adults/students deltas per hood; the drift that IS live).
 *   Story_Hook_Deck — name-matched, plus NEIGHBORHOOD_BOOM / RISING / COOLING /
 *     CITIZEN_RELOCATED / RENT_BURDEN_CRISIS by domain.
 * Not yet readable: the evening-media slate (what Oakland is watching) lives in
 * S.eveningMedia → world-summary texture, not a dumped tab — noted for the
 * persona build (her roster themes are streaming/mood).
 * Artifacts: output/slices/c{N}/celeste-tran.md · output/cron-compare/trends_slice_c{N}.json
 */
'use strict';
const K = require('./beatSliceKit');

const SEAT = {
  slug: 'celeste-tran', name: 'Celeste Tran', popid: 'POP-00164', desk: 'wire',
  kind: 'beat-trends', domain: 'trends', artifact: 'trends', builder: 'buildTrendsSlice.js',
  version: 'TRENDS-SLICE-1', nameRe: /celeste\s*tran/i,
  tabs: ['Cultural_Ledger', 'Neighborhood_Demographics', 'Story_Hook_Deck'],
  approach: 'Social-trends approach: this slice is what the city is doing together — the names climbing the culture record, where people are moving, what the engine\'s hooks say is shifting. Fast, reactive, grounded: a trend claim needs a window and a number from this slice. The names and moves are real; the group chat, the binge-night, the collective mood swing are yours.',
  roomIsYours: 'the group chat, the third rewatch, who suddenly has an opinion about something nobody mentioned last month, what the city collectively decided to care about',
  build
};

const ACTIVE_RE = /inactive|retired|closed/i;

function build(cycle, { root, beats, profiles }) {
  const figures = (beats.Cultural_Ledger || [])
    .filter(r => r.Name && !ACTIVE_RE.test(String(r.Status || '')))
    .map(r => ({
      name: String(r.Name).trim(),
      role: String(r.RoleType || '').trim() || null,
      domain: String(r.CulturalDomain || '').trim() || null,
      hood: String(r.Neighborhood || '').trim() || null,
      fame: K.num(r.FameScore),
      mediaCount: K.num(r.MediaCount),
      trend: String(r.TrendTrajectory || '').trim() || null,
      firstSeen: K.num(r.FirstSeenCycle),
      popids: String(r.UniverseLinks || '').split(/[;,\s]+/).filter(t => /^POP-/i.test(t)).map(t => t.toUpperCase())
    }));
  const demoRows = beats.Neighborhood_Demographics || [];
  if (!figures.length && !demoRows.length) return K.emptySlice(SEAT, cycle, 'no Cultural_Ledger or Neighborhood_Demographics rows');

  const facts = [];
  const people = [];
  const seenNames = new Set();
  const culSrc = 'output/beats/Cultural_Ledger.jsonl @C' + cycle;

  // What the city is talking about: most-mentioned active figures, trend first.
  const talkedAbout = figures.filter(f => f.mediaCount != null)
    .sort((a, b) => (b.mediaCount - a.mediaCount) || ((b.fame || 0) - (a.fame || 0)));
  for (const f of talkedAbout.slice(0, 3)) {
    seenNames.add(f.name);
    facts.push({
      text: f.name + (f.role ? ' (' + f.role + ')' : '') + (f.domain ? ', ' + f.domain : '') + ' — ' + f.mediaCount +
        ' media mentions' + (f.trend ? ', ' + f.trend : '') + (f.fame != null ? ', fame ' + f.fame : ''),
      src: culSrc
    });
    for (const popid of f.popids) {
      if (people.some(p => p.popid === popid)) continue;
      const p = K.personFromProfile(profiles, popid, 'the city is talking about them (Cultural_Ledger)', f.hood);
      if (p) people.push(p);
    }
  }
  // Who just appeared.
  const appeared = figures.filter(f => f.firstSeen != null && f.firstSeen >= cycle - 1 && !seenNames.has(f.name));
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

  const hooks = K.domainHooks(beats, cycle, SEAT.name,
    /^(NEIGHBORHOOD_BOOM|NEIGHBORHOOD_RISING|NEIGHBORHOOD_COOLING|CITIZEN_RELOCATED|RENT_BURDEN_CRISIS)$/).slice(0, 8);

  const lead = talkedAbout[0];
  const label = (lead ? lead.name + ' leads the conversation (' + lead.mediaCount + ' mentions)' : 'a quiet week on the culture record') +
    (moves.length ? '; ' + moves[0].hood + ' moves the most' : '');
  return K.makeSlice(SEAT, cycle, beats, {
    ref: culSrc, hood: (lead && lead.hood) || (moves[0] && moves[0].hood) || null, label,
    angle: label + ' — what Oakland is doing together this week',
    hookLine: lead
      ? lead.name + ' — ' + lead.mediaCount + ' mentions' + (lead.trend ? ', ' + lead.trend : '') + '. The trend is the story; the mood is yours.'
      : 'Nobody spiked this week — a flat trend line is also a story.',
    facts, people,
    deltas: { state: prev.state, vs: prev.vs },
    hooks,
    note: people.length ? null : 'no talked-about figure links to a ledger citizen this cycle',
    extra: { talkedAbout: talkedAbout.length, appeared: appeared.length, moves: moves.length }
  });
}

const W = K.wire(SEAT);
if (require.main === module) W.main();
module.exports = { SEAT, loadSlice: W.load, buildTrendsSlice: W.build, writeTrendsSlice: W.write, loadTrendsSlice: W.load,
  isTrendsSeat: W.isSeat, assignmentFromSlice: W.assignmentFromSlice, enrichAssignment: W.enrichAssignment, slicePaths: W.paths };
