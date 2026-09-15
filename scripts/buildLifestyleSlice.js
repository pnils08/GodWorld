#!/usr/bin/env node
/**
 * buildLifestyleSlice.js — Sharon Okafor's lifestyle slice (the culture lane,
 * builder-directed 2026-09-10 program; pipeline.68 shape). Rides ALONGSIDE the
 * shared evening pack.
 *
 * The lifestyle read on the culture ledger: who the city knows (top fame),
 * who is fading (the where-are-they-now file), who just appeared. Fame is a
 * behavior story — who people follow, not who issued a statement.
 *
 * Sources:
 *   Cultural_Ledger (Name, RoleType, CulturalDomain, FameScore,
 *     TrendTrajectory, MediaCount, CityTier, UniverseLinks POPIDs, ...).
 *   Story_Hook_Deck — hooks addressed to Sharon by name, plus this cycle's
 *     CELEBRITY / FAME_WATCH rows by domain (CELEBRITY falls through the
 *     engine's deskMap to City Desk and lands on a metro generalist;
 *     FAME_WATCH rows are raw-carried with no desk at all — engine cuts filed).
 * Artifacts: output/slices/c{N}/sharon-okafor.md · output/cron-compare/lifestyle_slice_c{N}.json
 */
'use strict';
const K = require('./beatSliceKit');

const SEAT = {
  slug: 'sharon-okafor', name: 'Sharon Okafor', popid: 'POP-00159', desk: 'culture',
  kind: 'beat-lifestyle', domain: 'lifestyle', artifact: 'lifestyle', builder: 'buildLifestyleSlice.js',
  version: 'LIFESTYLE-SLICE-1', nameRe: /sharon\s*okafor/i,
  tabs: ['Cultural_Ledger', 'Story_Hook_Deck'],
  approach: 'Lifestyle approach: this slice is the fame record — who the city knows, who is fading, who just arrived — with their domains, tiers and neighborhoods. Behavior patterns, warm analytical. The names and trajectories are real; the morning routine, the regular order, what the neighbors think are yours.',
  roomIsYours: 'the coffee order, the dog\'s name, who recognizes them at the farmers market and who pretends not to',
  build
};

const ACTIVE_RE = /inactive|retired|closed/i;
const DOWN_RE = /fading|cooling|quiet|declin/i;

function figures(beats) {
  return (beats.Cultural_Ledger || [])
    .filter(r => r.Name && !ACTIVE_RE.test(String(r.Status || '')))
    .map(r => ({
      name: String(r.Name).trim(),
      role: String(r.RoleType || '').trim() || null,
      domain: String(r.CulturalDomain || '').trim() || null,
      category: String(r.FameCategory || '').trim() || null,
      hood: String(r.Neighborhood || '').trim() || null,
      fame: K.num(r.FameScore),
      trend: String(r.TrendTrajectory || '').trim() || null,
      mediaCount: K.num(r.MediaCount),
      firstSeen: K.num(r.FirstSeenCycle),
      lastSeen: K.num(r.LastSeenCycle),
      tier: r.CityTier || null,
      popids: String(r.UniverseLinks || '').split(/[;,\s]+/).filter(t => /^POP-/i.test(t)).map(t => t.toUpperCase())
    }));
}

function figureLine(f, why) {
  return f.name + (f.role ? ' (' + f.role + ')' : '') + (f.domain ? ', ' + f.domain : '') +
    (f.hood ? ', ' + f.hood : '') + (f.tier ? ', ' + f.tier + '-tier' : '') + ' — ' + why +
    (f.fame != null ? ' (fame ' + f.fame + (f.trend ? ', ' + f.trend : '') + ')' : '') +
    (f.mediaCount != null ? ', ' + f.mediaCount + ' media mentions' : '');
}

function build(cycle, { beats, profiles }) {
  const all = figures(beats);
  if (!all.length) return K.emptySlice(SEAT, cycle, 'no active Cultural_Ledger rows');
  const src = 'output/beats/Cultural_Ledger.jsonl @C' + cycle;
  const known = all.filter(f => f.fame != null).sort((a, b) => b.fame - a.fame);
  const fading = all.filter(f => f.trend && DOWN_RE.test(f.trend) && f.fame != null)
    .sort((a, b) => b.fame - a.fame);
  const appeared = all.filter(f => f.firstSeen != null && f.firstSeen >= cycle - 1)
    .sort((a, b) => (b.firstSeen - a.firstSeen) || ((b.fame || 0) - (a.fame || 0)));

  const facts = [];
  const people = [];
  const seenNames = new Set();
  const addFigure = (f, why) => {
    if (seenNames.has(f.name)) return;
    seenNames.add(f.name);
    facts.push({ text: figureLine(f, why), src });
    for (const popid of f.popids) {
      if (people.some(p => p.popid === popid)) continue;
      const p = K.personFromProfile(profiles, popid, why + ' (Cultural_Ledger)', f.hood);
      if (p) people.push(p);
    }
  };
  for (const f of fading.slice(0, 3)) addFigure(f, 'fading — the where-are-they-now file');
  for (const f of known.slice(0, 2)) addFigure(f, 'the city knows them');
  for (const f of appeared.slice(0, 2)) addFigure(f, 'new on the culture record' + (f.firstSeen === cycle ? ' this cycle' : ' last cycle'));

  const hooks = K.domainHooks(beats, cycle, SEAT.name, /^(CELEBRITY|FAME_WATCH|LIFESTYLE)$/);
  const label = known.length
    ? known[0].name + ' leads the fame table; ' + fading.length + ' fading, ' + appeared.length + ' new'
    : 'the fame record, quiet this week';
  return K.makeSlice(SEAT, cycle, beats, {
    ref: src, hood: (fading[0] || known[0] || {}).hood || null, label,
    angle: (fading[0] ? fading[0].name + ' is fading' : known[0] ? known[0].name + ' is who the city knows' : 'a quiet week on the fame record') + ' — how the city follows its names',
    hookLine: fading[0]
      ? figureLine(fading[0], 'fading') + '.'
      : (known[0] ? figureLine(known[0], 'the city knows them') + '.' : 'Nobody on the fame record this week — the city\'s attention itself is the story.'),
    facts, people,
    deltas: null,
    hooks,
    note: people.length ? null : 'no figure on this slice links to a ledger citizen',
    extra: { known: known.length, fading: fading.length, appeared: appeared.length }
  });
}

const W = K.wire(SEAT);
if (require.main === module) W.main();
module.exports = { SEAT, loadSlice: W.load, buildLifestyleSlice: W.build, writeLifestyleSlice: W.write, loadLifestyleSlice: W.load,
  isLifestyleSeat: W.isSeat, assignmentFromSlice: W.assignmentFromSlice, enrichAssignment: W.enrichAssignment, slicePaths: W.paths };
