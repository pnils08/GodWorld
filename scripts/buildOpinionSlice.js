#!/usr/bin/env node
/**
 * buildOpinionSlice.js — Farrah Del Rio's record (pipeline.111; builder 2026-11-24: "Ok let's do Carmen, then Luis and
 * then Farrah"; "this is your build and remember instruct dont puppet"). A columnist answers the week, so her record is
 * the week as it stands on her day, with nothing picked for her:
 *   output/cron-compare/staged/*_c{N}_*.staged.md — what the Tribune has published this cycle: headline, byline, opening
 *   output/civic-voice/*_c{N}.json — every decision city hall's offices took this cycle, by speaker and initiative
 *   Initiative_Tracker — every initiative's standing in one line (status, phase, budget, next action and when due)
 *   LifeHistory_Log — citizens whose own line this cycle was about the city's civic life (their words, their hood)
 * People: those citizens (never herself or Tribune staff).
 * Artifacts: output/slices/c{N}/farrah-del-rio.md · output/cron-compare/opinion_slice_c{N}.json
 */
'use strict';
const fs = require('fs');
const path = require('path');
const K = require('./beatSliceKit');
const { cycleStatements } = require('./buildCivicSlice');

const SEAT = {
  slug: 'farrah-del-rio', name: 'Farrah Del Rio', popid: 'POP-00161', desk: 'civic',
  kind: 'beat-opinion', domain: 'opinion', artifact: 'opinion', builder: 'buildOpinionSlice.js',
  version: 'OPINION-SLICE-1', nameRe: /farrah\s*del\s*rio/i,
  tabs: ['Initiative_Tracker', 'Civic_Office_Ledger', 'LifeHistory_Log', 'Story_Hook_Deck'],
  approach: '',
  roomIsYours: '',
  build
};
const PEOPLE_CAP = 25;
const PAGES_CAP = 20;

// The cycle's published pieces: headline, byline, first paragraph — never another seat's draft or a flagged piece.
function publishedThisCycle(root, cycle) {
  const dir = path.join(root, 'output', 'cron-compare', 'staged');
  let files = [];
  try { files = fs.readdirSync(dir).filter(f => new RegExp('_c' + cycle + '_.*\\.staged\\.md$').test(f) && !/_farrah-del-rio_/.test(f)).sort(); } catch (_) { return []; }
  const out = [];
  for (const f of files.slice(0, PAGES_CAP)) {
    const lines = fs.readFileSync(path.join(dir, f), 'utf8').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const head = (lines.find(l => /^#\s/.test(l)) || '').replace(/^#+\s*/, '').replace(/\*\*/g, '');
    if (!head) continue;
    const by = (lines.find(l => /^\*{1,2}By\s|^\*By\s|\|\s*Bay Tribune/i.test(l)) || '').replace(/\*/g, '').trim();
    const first = lines.find(l => !/^#/.test(l) && !/^\*/.test(l) && l.length > 60) || '';
    out.push({ file: f, text: '"' + head + '"' + (by ? ' — ' + by : '') + (first ? ' — opens: ' + first.slice(0, 280) : '') });
  }
  return out;
}

function build(cycle, { root, beats, profiles }) {
  root = root || K.ROOT;
  profiles = profiles || K.loadProfiles(root);
  const facts = [];
  for (const p of publishedThisCycle(root, cycle)) facts.push({ text: 'In the Tribune this cycle: ' + p.text, src: 'output/cron-compare/staged/' + p.file });

  const inits = (beats.Initiative_Tracker || []).filter(r => String(r.InitiativeID || '').trim() && String(r.Name || '').trim())
    .sort((a, b) => String(a.InitiativeID).localeCompare(String(b.InitiativeID), 'en', { numeric: true }));
  const nameOf = new Map(inits.map(r => [String(r.InitiativeID).trim(), String(r.Name).trim()]));
  for (const r of inits) {
    const v = k => String(r[k] == null ? '' : r[k]).trim();
    facts.push({ text: v('Name') + ' — status ' + (v('Status') || 'listed') + (v('ImplementationPhase') ? ', phase ' + v('ImplementationPhase') : '') +
      (v('Budget') ? ', budget ' + v('Budget') : '') + (v('AffectedNeighborhoods') ? ', ' + v('AffectedNeighborhoods') : '') +
      (v('NextScheduledAction') ? '; next: ' + v('NextScheduledAction').slice(0, 160) + (v('NextActionCycle') ? ' (due Cycle ' + v('NextActionCycle') + ')' : '') : ''),
      src: 'output/beats/Initiative_Tracker.jsonl ' + r.InitiativeID + ' @C' + cycle });
  }

  const offices = (beats.Civic_Office_Ledger || []).filter(r => String(r.Holder || '').trim());
  const officeOf = new Map(offices.map(r => [String(r.Holder).trim().toLowerCase(), r]));
  for (const { file, speaker, s } of cycleStatements(root, cycle).filter(x => String(x.s.decision || '').trim())) {
    const o = officeOf.get(speaker.toLowerCase());
    const on = nameOf.get(String(s.initiative || '').trim()) || String(s.topic || '').trim();
    facts.push({ text: speaker + (o && o.Title ? ' (' + String(o.Title).trim() + ')' : '') + ' decided' + (on ? ' on ' + on : '') + ': ' + String(s.decision).trim().slice(0, 200),
      src: 'output/civic-voice/' + file + ' ' + (s.statementId || '') });
  }

  // Citizens whose own line this cycle was about the city's civic life — one line each, in POPID order.
  const people = [];
  const seen = new Set();
  const civic = (beats.LifeHistory_Log || []).filter(r => String(r.Cycle) === String(cycle) && /^Civic/.test(String(r.EventTag || '')) && String(r.EventText || '').trim())
    .sort((a, b) => String(a.POPID).localeCompare(String(b.POPID)));
  for (const r of civic) {
    const id = String(r.POPID || '').toUpperCase();
    if (!/^POP-\d+$/.test(id) || seen.has(id) || id === SEAT.popid || K.isMediaStaff(profiles, id) || people.length >= PEOPLE_CAP) continue;
    seen.add(id);
    const p = K.personFromProfile(profiles, id, 'C' + cycle + (r.Neighborhood ? ' in ' + r.Neighborhood : '') + ': ' + String(r.EventText).trim());
    if (p) { p.profile = p.profile + ' — ' + p.why; people.push(p); }
  }
  if (!facts.length && !people.length) return K.emptySlice(SEAT, cycle, 'nothing published or decided this cycle');

  const label = 'the week in Oakland, C' + cycle;
  return K.makeSlice(SEAT, cycle, beats, {
    ref: 'output/cron-compare/staged @C' + cycle, hood: null, label, angle: label, hookLine: '',
    facts, people, peopleCap: PEOPLE_CAP, factCap: Math.max(12, facts.length),
    hooks: [], note: null,
    extra: { published: facts.filter(f => /staged/.test(f.src)).length, initiatives: inits.length }
  });
}

const sitsOutWhenEmpty = true;
const W = K.wire(SEAT);
if (require.main === module) W.main();
module.exports = { SEAT, sitsOutWhenEmpty, publishedThisCycle, loadSlice: W.load, buildOpinionSlice: W.build, writeOpinionSlice: W.write,
  loadOpinionSlice: W.load, isOpinionSeat: W.isSeat, assignmentFromSlice: W.assignmentFromSlice, enrichAssignment: W.enrichAssignment, slicePaths: W.paths };
