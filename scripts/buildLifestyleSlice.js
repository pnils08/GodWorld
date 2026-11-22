#!/usr/bin/env node
/**
 * buildLifestyleSlice.js — Sharon Okafor's record: Oakland's nightlife and evenings (pipeline.111, builder
 * 2026-11-21: "fame isnt her beat but she may she famous people crossover into her beat, but her tools will give
 * her that context"; "instruct her on what her beat is and to report on the nightlight around Oakland").
 *
 * The record as the engine wrote it this Cycle, no line made the story:
 *   output/world_summary_c{N}.md  ## Evening Texture (Riley_Digest): venues, nightlife, city events, sightings, media
 *   output/world_summary_c{N}.md  ## What Moved › city-event, lifestyle-sighting, game-night-texture rows
 *   LifeHistory_Log (this Cycle, source:prevEvening) — each citizen's own line about the night before:
 *     evening:nightlife, cityEventAttend, crowd, safety, traffic. These are the people her beat touched.
 * Sighted names resolve to their ledger rows. Fame (Cultural_Ledger) is no longer on the slice; her sheet tool
 * reads it. A Cycle with nothing on the evening record leaves her slice empty, and she sits the day out.
 * Artifacts: output/slices/c{N}/sharon-okafor.md · output/cron-compare/lifestyle_slice_c{N}.json
 */
'use strict';
const fs = require('fs');
const path = require('path');
const K = require('./beatSliceKit');

const SEAT = {
  slug: 'sharon-okafor', name: 'Sharon Okafor', popid: 'POP-00159', desk: 'culture',
  kind: 'beat-lifestyle', domain: 'lifestyle', artifact: 'lifestyle', builder: 'buildLifestyleSlice.js',
  version: 'LIFESTYLE-SLICE-2', nameRe: /sharon\s*okafor/i,
  tabs: ['LifeHistory_Log'],
  approach: '',
  roomIsYours: '',
  build
};

// Most-night-out first: a citizen with two evening lines keeps the higher one.
const EVENING_RANK = ['nightlife', 'cityEventAttend', 'crowd', 'safety', 'traffic'];
const PEOPLE_CAP = 30;

function summaryLines(root, cycle) {
  const file = path.join(root, 'output', 'world_summary_c' + cycle + '.md');
  return fs.readFileSync(file, 'utf8').split('\n');   // no summary is a broken chain: loud, like every beat seat
}

function sectionRows(lines, startsWith) {
  const i = lines.findIndex(l => l.startsWith(startsWith));
  if (i < 0) return [];
  const out = [];
  for (let j = i + 1; j < lines.length && !lines[j].startsWith('#'); j++) {
    const t = lines[j].trim();
    if (t.startsWith('- ')) out.push(t.slice(2).replace(/\*\*/g, ''));
  }
  return out;
}

function eveningLines(beats, cycle) {
  return (beats.LifeHistory_Log || [])
    .filter(r => String(r.Cycle) === String(cycle) && /(^|\|)source:prevEvening(\||$)/.test(String(r.EventTag || '')))
    .map(r => ({
      popid: String(r.POPID || '').toUpperCase(),
      text: String(r.EventText || '').trim(),
      kind: (String(r.EventTag).match(/(?:^|\|)evening:([^|]+)/) || [])[1] || null,
      hood: String(r.Neighborhood || '').trim() || null
    }))
    .filter(e => /^POP-\d+$/.test(e.popid) && e.text);
}

function build(cycle, { root, beats, profiles }) {
  const ws = summaryLines(root, cycle);
  const facts = [];
  for (const t of sectionRows(ws, '## Evening Texture')) facts.push({ text: t, src: 'output/world_summary_c' + cycle + '.md ## Evening Texture' });
  for (const t of sectionRows(ws, '### city-event')) facts.push({ text: t, src: 'output/world_summary_c' + cycle + '.md ## What Moved › city-event (Ripple_Ledger)' });
  for (const t of sectionRows(ws, '### lifestyle-sighting')) facts.push({ text: t, src: 'output/world_summary_c' + cycle + '.md ## What Moved › lifestyle-sighting (Ripple_Ledger)' });
  for (const t of ws.filter(l => /^- game-night-texture\b/.test(l))) facts.push({ text: t.slice(2), src: 'output/world_summary_c' + cycle + '.md ## What Moved › game-night-texture (Ripple_Ledger)' });

  const byName = new Map();
  for (const [popid, p] of profiles) if (p && p.Name) byName.set(String(p.Name).trim(), popid);
  const people = [];
  const has = popid => people.some(p => p.popid === popid);
  const add = (popid, why) => {
    if (popid === SEAT.popid || has(popid) || people.length >= PEOPLE_CAP) return;   // never her own source
    const p = K.personFromProfile(profiles, popid, why);
    if (!p) return;
    p.profile = p.profile + ' — ' + why;   // the reason rides where every packet prints the person
    people.push(p);
  };
  for (const t of sectionRows(ws, '### lifestyle-sighting')) {
    const m = t.match(/^sighting \| (.+?) spotted at (.+?) \| ([^|]+)/);
    if (m && byName.has(m[1].trim())) add(byName.get(m[1].trim()), 'C' + cycle + ': spotted at ' + m[2].trim() + ' (' + m[3].trim() + ')');
  }
  const evenings = eveningLines(beats, cycle)
    .sort((a, b) => (EVENING_RANK.indexOf(a.kind) + 1 || 99) - (EVENING_RANK.indexOf(b.kind) + 1 || 99));
  for (const e of evenings) add(e.popid, 'C' + cycle + ' evening: ' + e.text);

  if (!facts.length && !people.length) return K.emptySlice(SEAT, cycle, 'nothing on the evening record this cycle');
  return K.makeSlice(SEAT, cycle, beats, {
    ref: 'the evening record of C' + cycle, hood: null, label: 'the evening record of C' + cycle,
    angle: 'the evening record of C' + cycle, hookLine: '',
    facts, people, peopleCap: PEOPLE_CAP, factCap: Math.max(12, facts.length),
    deltas: null, hooks: [],
    note: null,
    extra: { evenings: evenings.length }
  });
}

const sitsOutWhenEmpty = true;
const W = K.wire(SEAT);
if (require.main === module) W.main();
module.exports = { SEAT, sitsOutWhenEmpty, loadSlice: W.load, buildLifestyleSlice: W.build, writeLifestyleSlice: W.write, loadLifestyleSlice: W.load,
  isLifestyleSeat: W.isSeat, assignmentFromSlice: W.assignmentFromSlice, enrichAssignment: W.enrichAssignment, slicePaths: W.paths };
