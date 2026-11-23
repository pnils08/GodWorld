#!/usr/bin/env node
/**
 * buildArtsSlice.js — Kai Marston's record: Oakland's arts and its other media (pipeline.111, builder 2026-11-22:
 * "1 - both, 2 - approved - 3 - … keep it to the arts you listed … kai can cover the other media types as well").
 *
 * The record as the engine wrote it this Cycle, no figure made the story:
 *   Cultural_Ledger (active, Arts | Music | Media | Literature, linked to a ledger citizen) — the city's artists, musicians,
 *     actors, writers, curators, streamers and other media figures: role, domain, trajectory, fame, mentions
 *   LifeHistory_Log (this Cycle) — each figure's own lines (two each), and the young artists' Cultural lines
 *   Community_Programs (active, type arts) — the mural collective, the sound archive, the arts fund
 * Sports figures and the fame table as such are off; the evening TV / movie slate is Sharon's.
 * A Cycle with nothing on the record sits him out.
 * Artifacts: output/slices/c{N}/kai-marston.md · output/cron-compare/arts_slice_c{N}.json
 */
'use strict';
const K = require('./beatSliceKit');

const SEAT = {
  slug: 'kai-marston', name: 'Kai Marston', popid: 'POP-00158', desk: 'culture',
  kind: 'beat-arts', domain: 'arts', artifact: 'arts', builder: 'buildArtsSlice.js',
  version: 'ARTS-SLICE-2', nameRe: /kai\s*marston/i,
  tabs: ['Cultural_Ledger', 'Community_Programs', 'LifeHistory_Log'],
  approach: '',
  roomIsYours: '',
  build
};

const ARTS_DOMAIN = /^(arts|music|media|literature)$/i;
const LINES_PER_FIGURE = 2;
const PEOPLE_CAP = 40;

function build(cycle, { beats, profiles }) {
  const facts = [];
  const people = [];
  const has = popid => people.some(p => p.popid === popid);
  const add = (popid, why) => {
    if (popid === SEAT.popid || has(popid) || people.length >= PEOPLE_CAP) return;
    const p = K.personFromProfile(profiles, popid, why);
    if (!p) return;
    p.profile = p.profile + ' — ' + why;   // the reason rides where every packet prints the person
    people.push(p);
  };
  const lines = (beats.LifeHistory_Log || []).filter(r => String(r.Cycle) === String(cycle) && String(r.EventText || '').trim());
  const linesOf = popid => lines.filter(r => String(r.POPID).toUpperCase() === popid).slice(0, LINES_PER_FIGURE).map(r => String(r.EventText).trim());

  const figures = (beats.Cultural_Ledger || [])
    .filter(r => r.Name && ARTS_DOMAIN.test(String(r.CulturalDomain || '').trim()) && /active/i.test(String(r.Status || '')))
    .map(r => ({ r, popid: (String(r.UniverseLinks || '').match(/POP-\d+/i) || [])[0] }))
    .filter(f => f.popid)
    .sort((a, b) => (K.num(b.r.FameScore) || 0) - (K.num(a.r.FameScore) || 0));
  for (const { r, popid } of figures) {
    const id = popid.toUpperCase();
    if (id === SEAT.popid) continue;
    const fame = K.num(r.FameScore);
    // The ledger's Neighborhood is where a sighting was staged, not a home: the citizen row's hood wins (K.figureHood).
    const hood = K.figureHood(profiles, [id], r.Neighborhood).hood;
    facts.push({
      text: String(r.Name).trim() + ' (' + String(r.RoleType || '').trim() + '), ' + String(r.CulturalDomain).trim() +
        (hood ? ', ' + hood : '') + (r.TrendTrajectory ? ' — ' + r.TrendTrajectory : '') +
        (fame != null ? ' (fame ' + fame + ')' : '') + (K.num(r.MediaCount) != null ? ', ' + K.num(r.MediaCount) + ' media mentions' : ''),
      src: 'output/beats/Cultural_Ledger.jsonl @C' + cycle + (r['CUL-ID'] ? ' ' + r['CUL-ID'] : '')
    });
    const own = linesOf(id);
    add(id, String(r.RoleType || '').trim() + ' on the culture record' + (own.length ? '; C' + cycle + ': ' + own.join('; ') : ''));
  }

  for (const r of lines.filter(x => /^Cultural(\||$)/.test(String(x.EventTag || '')))) {
    add(String(r.POPID).toUpperCase(), 'C' + cycle + ': ' + String(r.EventText).trim());
  }

  for (const pr of (beats.Community_Programs || []).filter(p => p.Name && /^arts$/i.test(String(p.Type || '').trim()) && /active/i.test(String(p.Status || '')))) {
    const founder = pr.Founder_POPID ? profiles.get(String(pr.Founder_POPID).toUpperCase()) : null;
    facts.push({
      text: String(pr.Name).trim() + ' (arts)' + (pr.Neighborhood ? ', ' + pr.Neighborhood : '') +
        (founder && founder.Name ? ' — founded by ' + String(founder.Name).trim() : '') + (pr.Founded_Cycle ? ', since C' + pr.Founded_Cycle : ''),
      src: 'output/beats/Community_Programs.jsonl @C' + cycle + (pr.Program_ID ? ' ' + pr.Program_ID : '')
    });
  }

  if (!facts.length && !people.length) return K.emptySlice(SEAT, cycle, 'nothing on the arts record this cycle');
  return K.makeSlice(SEAT, cycle, beats, {
    ref: 'the arts record of C' + cycle, hood: null, label: 'the arts record of C' + cycle,
    angle: 'the arts record of C' + cycle, hookLine: '',
    facts, people, peopleCap: PEOPLE_CAP, factCap: Math.max(12, facts.length),
    deltas: null, hooks: [], note: null,
    extra: { figures: figures.length }
  });
}

const sitsOutWhenEmpty = true;
const W = K.wire(SEAT);
if (require.main === module) W.main();
module.exports = { SEAT, sitsOutWhenEmpty, loadSlice: W.load, buildArtsSlice: W.build, writeArtsSlice: W.write, loadArtsSlice: W.load,
  isArtsSeat: W.isSeat, assignmentFromSlice: W.assignmentFromSlice, enrichAssignment: W.enrichAssignment, slicePaths: W.paths };
