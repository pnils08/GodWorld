#!/usr/bin/env node
/**
 * buildNeighborhoodSlice.js — Maria Keen's record: Oakland's neighborhoods and the people living in them
 * (pipeline.111, builder 2026-11-21: "You got it , we are following the Sharon mold and repairing these").
 *
 * The record as the engine wrote it this Cycle, every hood, no hood or line made the story:
 *   output/neighborhood_texture_c{N}.md — the engine's texture paragraph for each hood
 *   LifeHistory_Log (this Cycle, source:neighborhood | nbhdState | communityLife) — residents' own lines about
 *     their block; two residents a hood (POPID order), so every hood with a line is on her list
 *   Community_Programs (active) — each hood's programs and founders
 *   Neighborhood_Demographics vs output/beats/prev/ — each hood's population and its movement
 * She picks the hood and the people. Care, custody, tax and debt lines are the health, safety and business
 * seats' records; her sheet tool reads those tabs. A Cycle with nothing on the record sits her out.
 * Artifacts: output/slices/c{N}/maria-keen.md · output/cron-compare/neighborhood_slice_c{N}.json
 */
'use strict';
const fs = require('fs');
const path = require('path');
const K = require('./beatSliceKit');

const SEAT = {
  slug: 'maria-keen', name: 'Maria Keen', popid: 'POP-00013', desk: 'culture',
  kind: 'beat-neighborhood', domain: 'neighborhood', artifact: 'neighborhood', builder: 'buildNeighborhoodSlice.js',
  version: 'HOOD-SLICE-6', nameRe: /maria\s*keen/i,
  tabs: ['Community_Programs', 'Neighborhood_Demographics', 'LifeHistory_Log'],
  approach: '',
  roomIsYours: '',
  build
};

const PER_HOOD = 1;   // builder 2026-11-23 ("go, do jordan and maria"): a lighter morning; one resident a hood
const PEOPLE_CAP = 22;
const HOOD_LINE = /(^|\|)source:(neighborhood|nbhdState|communityLife)(\||$)/;

function textureBlocks(root, cycle) {
  const file = path.join(root, 'output', 'neighborhood_texture_c' + cycle + '.md');
  if (!fs.existsSync(file)) return [];
  const out = [];
  let hood = null;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^###\s+(.+?)\s*$/);
    if (m) { hood = m[1]; continue; }
    if (hood && line.trim() && !line.startsWith('#')) out.push({ hood, text: line.trim() });
  }
  return out;
}

function populationLine(hood, demo, prevDemo, vs) {
  const bits = [hood + ' this cycle: ' + K.fmtInt(K.num(demo.Students)) + ' students, ' +
    K.fmtInt(K.num(demo.Adults)) + ' adults, ' + K.fmtInt(K.num(demo.Seniors)) + ' seniors'];
  if (prevDemo) {
    const moves = [];
    for (const [col, label] of [['Students', 'students'], ['Adults', 'adults'], ['Seniors', 'seniors']]) {
      const d = K.num(demo[col]) != null && K.num(prevDemo[col]) != null ? K.num(demo[col]) - K.num(prevDemo[col]) : null;
      if (d) moves.push((d > 0 ? '+' : '') + d + ' ' + label);
    }
    if (moves.length) bits.push('moved vs C' + vs + ': ' + moves.join(', '));
  }
  return bits.join(' — ');
}

function build(cycle, { root, beats, profiles }) {
  const facts = [];
  const textureFile = 'output/neighborhood_texture_c' + cycle + '.md';
  for (const b of textureBlocks(root, cycle)) facts.push({ text: b.hood + ': ' + b.text, src: textureFile + ' ### ' + b.hood });

  // Programs leave the morning (builder 2026-11-23); Community_Programs is her sheet tool. One count per hood stays.
  const progs = (beats.Community_Programs || []).filter(p => p.Name && /active/i.test(String(p.Status || '')));
  if (progs.length) {
    const byHood = new Map();
    for (const p of progs) { const h = String(p.Neighborhood || 'Citywide').trim(); byHood.set(h, (byHood.get(h) || 0) + 1); }
    facts.push({ text: progs.length + ' active community programs: ' + [...byHood.entries()].sort((a, b) => b[1] - a[1]).map(([h, n]) => h + ' ' + n).join(', ') + ' — names and founders on Community_Programs',
      src: 'output/beats/Community_Programs.jsonl @C' + cycle });
  }

  const prev = K.prevTabRows(root, 'Neighborhood_Demographics');
  for (const demo of (beats.Neighborhood_Demographics || []).filter(r => r.Neighborhood)) {
    const prevDemo = prev.rows.find(r => K.hoodKey(r.Neighborhood) === K.hoodKey(demo.Neighborhood));
    const moved = prevDemo && ['Students', 'Adults', 'Seniors'].some(c => K.num(demo[c]) != null && K.num(prevDemo[c]) != null && K.num(demo[c]) !== K.num(prevDemo[c]));
    if (prevDemo && !moved) continue;   // a hood whose population held is on Neighborhood_Demographics
    facts.push({ text: populationLine(String(demo.Neighborhood).trim(), demo, prevDemo, prev.vs),
      src: 'output/beats/Neighborhood_Demographics.jsonl @C' + cycle + (prevDemo ? ' vs prev/' : '') });
  }

  // Residents' own lines about their block — two a hood, so no hood is chosen for her.
  const lines = (beats.LifeHistory_Log || [])
    .filter(r => String(r.Cycle) === String(cycle) && HOOD_LINE.test(String(r.EventTag || '')) &&
      /^POP-\d+$/i.test(String(r.POPID || '')) && String(r.EventText || '').trim())
    .sort((a, b) => String(a.POPID).localeCompare(String(b.POPID)));
  const perHood = new Map();
  const people = [];
  for (const r of lines) {
    const popid = String(r.POPID).toUpperCase();
    const hood = String(r.Neighborhood || '').trim();
    if (popid === SEAT.popid || K.isMediaStaff(profiles, popid) || people.some(p => p.popid === popid) || people.length >= PEOPLE_CAP) continue;
    if ((perHood.get(hood) || 0) >= PER_HOOD) continue;
    const why = 'C' + cycle + ' in ' + (hood || 'their neighborhood') + ': ' + String(r.EventText).trim();
    const p = K.personFromProfile(profiles, popid, why, hood);
    if (!p) continue;
    p.profile = p.profile + ' — ' + why;   // the reason rides where every packet prints the person
    people.push(p);
    perHood.set(hood, (perHood.get(hood) || 0) + 1);
  }

  if (!facts.length && !people.length) return K.emptySlice(SEAT, cycle, 'nothing on the neighborhood record this cycle');
  return K.makeSlice(SEAT, cycle, beats, {
    ref: 'the neighborhood record of C' + cycle, hood: null, label: 'the neighborhood record of C' + cycle,
    angle: 'the neighborhood record of C' + cycle, hookLine: '',
    facts, people, peopleCap: PEOPLE_CAP, factCap: Math.max(12, facts.length),
    deltas: { state: prev.state, vs: prev.vs }, hooks: [], note: null,
    extra: { hoodLines: lines.length }
  });
}

const sitsOutWhenEmpty = true;
const W = K.wire(SEAT);
if (require.main === module) W.main();
module.exports = { SEAT, sitsOutWhenEmpty, loadSlice: W.load, buildNeighborhoodSlice: W.build, writeNeighborhoodSlice: W.write, loadNeighborhoodSlice: W.load,
  isNeighborhoodSeat: W.isSeat, assignmentFromSlice: W.assignmentFromSlice, enrichAssignment: W.enrichAssignment, slicePaths: W.paths };
