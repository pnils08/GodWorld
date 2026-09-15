#!/usr/bin/env node
/**
 * buildArtsSlice.js — Kai Marston's arts & entertainment slice (the culture lane,
 * builder-directed 2026-09-10 program; pipeline.68 shape, one slice per journalist).
 * Rides ALONGSIDE the shared evening pack — the pack keeps the nightlife/TV
 * texture; this slice gives Kai the culture ledger itself.
 *
 * Sources:
 *   Cultural_Ledger (CUL-ID, Name, RoleType, FameCategory, CulturalDomain,
 *     FameScore, TrendTrajectory, LastSeenCycle, UniverseLinks POPIDs, ...) —
 *     who is rising, who just appeared, who is fading. The engine drifts this
 *     weekly; until now only the wd-cultural cards read it.
 *   Story_Seed_Deck — this cycle's culture-desk seeds (citizens/businesses
 *     attached; the What/Why metric strings are never quoted).
 *   Story_Hook_Deck — hooks addressed to Kai by name, plus this cycle's
 *     ARTS / CULTURE / NIGHTLIFE / CULTURAL / FESTIVAL rows by domain (ARTS and
 *     FESTIVAL fall through the engine's deskMap to City Desk; engine cut filed).
 * Artifacts: output/slices/c{N}/kai-marston.md · output/cron-compare/arts_slice_c{N}.json
 */
'use strict';
const K = require('./beatSliceKit');

const SEAT = {
  slug: 'kai-marston', name: 'Kai Marston', popid: 'POP-00158', desk: 'culture',
  kind: 'beat-arts', domain: 'arts', artifact: 'arts', builder: 'buildArtsSlice.js',
  version: 'ARTS-SLICE-1', nameRe: /kai\s*marston/i,
  tabs: ['Cultural_Ledger', 'Story_Hook_Deck', 'Story_Seed_Deck'],
  approach: 'Arts & entertainment approach: this slice is the culture ledger — who is rising, who just appeared, who is fading, with their domains and neighborhoods — plus the engine\'s culture seeds this cycle. Present-tense, neighborhood act not gallery PR. The names and trajectories are real; the garage rehearsal, the opening-night crowd, the set list are yours.',
  roomIsYours: 'the rehearsal space, the flyer on the pole, who showed up, what the room felt like when the second act started',
  build
};

const ACTIVE_RE = /inactive|retired|closed/i;
const UP_RE = /rising|surging|ascending|climbing/i;
const DOWN_RE = /fading|cooling|quiet|declin/i;

function figures(beats) {
  return (beats.Cultural_Ledger || [])
    .filter(r => r.Name && !ACTIVE_RE.test(String(r.Status || '')))
    .map(r => ({
      culId: r['CUL-ID'] || null,
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
    (f.hood ? ', ' + f.hood : '') + ' — ' + why +
    (f.fame != null ? ' (fame ' + f.fame + (f.trend ? ', ' + f.trend : '') + ')' : '') +
    (f.lastSeen != null ? ', last seen C' + f.lastSeen : '');
}

function build(cycle, { beats, profiles }) {
  const all = figures(beats);
  if (!all.length) return K.emptySlice(SEAT, cycle, 'no active Cultural_Ledger rows');
  const src = 'output/beats/Cultural_Ledger.jsonl @C' + cycle;
  const rising = all.filter(f => f.trend && UP_RE.test(f.trend)).sort((a, b) => (b.fame || 0) - (a.fame || 0));
  const appeared = all.filter(f => f.firstSeen != null && f.firstSeen >= cycle - 1)
    .sort((a, b) => (b.firstSeen - a.firstSeen) || ((b.fame || 0) - (a.fame || 0)));
  const fading = all.filter(f => f.trend && DOWN_RE.test(f.trend) && f.fame != null && f.fame >= 20)
    .sort((a, b) => (b.fame || 0) - (a.fame || 0));

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
  for (const f of rising.slice(0, 4)) addFigure(f, 'fame rising');
  for (const f of appeared.slice(0, 3)) addFigure(f, 'new on the culture record' + (f.firstSeen === cycle ? ' this cycle' : ' last cycle'));
  for (const f of fading.slice(0, 2)) addFigure(f, 'fading — the where-are-they-now file');

  const seeds = K.seedsFor(beats, cycle, /^culture$/i);
  for (const sd of seeds.slice(0, 3)) {
    const who = sd.citizens.slice(0, 3).map(c => c.name).join('; ');
    facts.push({
      text: 'ENGINE SEED' + (sd.hood ? ' (' + sd.hood + ')' : '') + ': ' + (who || 'no citizens attached') +
        (sd.businesses.length ? ' · at ' + sd.businesses.slice(0, 2).join('; ') : ''),
      src: 'output/beats/Story_Seed_Deck.jsonl @C' + cycle
    });
    for (const c of sd.citizens) {
      if (!c.popid || people.some(p => p.popid === c.popid)) continue;
      const p = K.personFromProfile(profiles, c.popid, 'culture seed this cycle (Story_Seed_Deck)', sd.hood);
      if (p) people.push(p);
    }
  }

  const hooks = K.domainHooks(beats, cycle, SEAT.name, /^(ARTS|CULTURE|NIGHTLIFE|CULTURAL|FESTIVAL)$/);
  const lead = rising[0] || appeared[0] || all.slice().sort((a, b) => (b.fame || 0) - (a.fame || 0))[0];
  const label = rising.length
    ? rising.length + ' culture figures rising; ' + appeared.length + ' new on the record'
    : appeared.length ? appeared.length + ' new on the culture record' : 'the culture ledger, quiet this week';
  return K.makeSlice(SEAT, cycle, beats, {
    ref: src, hood: lead && lead.hood, label,
    angle: (rising[0] ? rising[0].name + ' is rising' : appeared[0] ? appeared[0].name + ' just appeared on the record' : 'a quiet week on the culture ledger') + ' — the acts and the rooms they play',
    hookLine: lead ? figureLine(lead, rising.includes(lead) ? 'fame rising' : 'on the culture record') + '.' : 'Nobody moved on the culture ledger this week — the scene itself is the story.',
    facts, people,
    deltas: null,
    hooks,
    note: people.length ? null : 'no culture figure on this slice links to a ledger citizen',
    extra: { rising: rising.length, appeared: appeared.length, fading: fading.length, seeds: seeds.length }
  });
}

const W = K.wire(SEAT);
if (require.main === module) W.main();
module.exports = { SEAT, loadSlice: W.load, buildArtsSlice: W.build, writeArtsSlice: W.write, loadArtsSlice: W.load,
  isArtsSeat: W.isSeat, assignmentFromSlice: W.assignmentFromSlice, enrichAssignment: W.enrichAssignment, slicePaths: W.paths };
