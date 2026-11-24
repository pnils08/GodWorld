#!/usr/bin/env node
/**
 * buildCivicSlice.js — Carmen Delaine's civic record (pipeline.111; builder 2026-11-23: "Ok let's do Carmen").
 * Was the civic-domain packet (buildCivicDomainSlice): the code scored the cycle's civic entries and handed her the
 * top initiative with a lead line and an approach — West Oakland Stabilization Fund every cycle. Now the whole record:
 *   Initiative_Tracker — every initiative's full row (vote, signature, money, phase, next clock, dated milestones), id order
 *   output/civic-voice/*_c{N}.json — every decision city hall's offices took this cycle, by speaker and initiative
 *   Civic_Office_Ledger — every office with its holder, approval and faction; the council's faction standings
 *   City_Treasury / Judicial_Ledger — the city's money this cycle
 * People: the office holders who took a decision this cycle (she interviews offices, never residents).
 * Artifacts: output/slices/c{N}/carmen-delaine.md · output/cron-compare/civic_slice_c{N}.json
 */
'use strict';
const fs = require('fs');
const path = require('path');
const K = require('./beatSliceKit');
const C = require('./buildCivicDomainSlice');

const SEAT = {
  slug: 'carmen-delaine', name: 'Carmen Delaine', popid: 'POP-00011', desk: 'civic',
  kind: 'beat-civic', domain: 'civic', artifact: 'civic', builder: 'buildCivicSlice.js',
  version: 'CIVIC-SLICE-1', nameRe: /carmen\s*delaine/i,
  tabs: ['Initiative_Tracker', 'Civic_Office_Ledger', 'City_Treasury', 'Judicial_Ledger', 'Story_Hook_Deck'],
  approach: '',
  roomIsYours: '',
  build
};
const PEOPLE_CAP = 30;

function cycleStatements(root, cycle) {
  const dir = path.join(root, 'output', 'civic-voice');
  let files = [];
  try { files = fs.readdirSync(dir).filter(f => f.endsWith('_c' + cycle + '.json')).sort(); } catch (_) { return []; }
  const out = [];
  for (const f of files) {
    let d; try { d = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch (_) { continue; }
    if (!d || Number(d.cycle) !== Number(cycle)) continue;
    for (const s of d.statements || []) out.push({ file: f, speaker: String(d.speaker || '').trim(), s });
  }
  return out;
}

function build(cycle, { root, beats, profiles }) {
  root = root || K.ROOT;
  profiles = profiles || K.loadProfiles(root);
  const inits = (beats.Initiative_Tracker || []).filter(r => String(r.InitiativeID || '').trim() && String(r.Name || '').trim())
    .sort((a, b) => String(a.InitiativeID).localeCompare(String(b.InitiativeID), 'en', { numeric: true }));
  if (!inits.length) return K.emptySlice(SEAT, cycle, 'no Initiative_Tracker rows');
  const nameOf = new Map(inits.map(r => [String(r.InitiativeID).trim(), String(r.Name).trim()]));
  const facts = [];
  const src = 'output/beats/Initiative_Tracker.jsonl @C' + cycle;
  for (const r of inits) {
    const rec = C.initiativeRecordFacts(r);
    if (!rec.length) facts.push({ text: C.initiativeFact(r).replace(/ \[Initiative_Tracker\]$/, ''), src: src + ' ' + r.InitiativeID });
    for (const t of rec) facts.push({ text: t.replace(/ \[Initiative_Tracker\]$/, ''), src: src + ' ' + r.InitiativeID });
  }

  // Every decision the offices took this cycle (city hall's statements), by who and on what.
  const offices = (beats.Civic_Office_Ledger || []).filter(r => String(r.OfficeId || r.Title || r.Holder || '').trim());
  const officeOf = new Map(offices.filter(r => r.Holder).map(r => [String(r.Holder).trim().toLowerCase(), r]));
  const stmts = cycleStatements(root, cycle).filter(x => String(x.s.decision || '').trim());
  for (const { file, speaker, s } of stmts) {
    const o = officeOf.get(speaker.toLowerCase());
    const on = nameOf.get(String(s.initiative || '').trim()) || String(s.topic || '').trim();
    facts.push({ text: speaker + (o && o.Title ? ' (' + String(o.Title).trim() + ')' : '') + ' decided' + (on ? ' on ' + on : '') +
      (s.type ? ' [' + String(s.type).replace(/_/g, ' ') + ']' : '') + ': ' + String(s.decision).trim().slice(0, 200),
      src: 'output/civic-voice/' + file + ' ' + (s.statementId || '') });
  }

  // The offices and the council's standing.
  for (const r of offices) facts.push({ text: C.officeFact(r).replace(/ \[Civic_Office_Ledger\]$/, '') + (r.Faction ? ' — ' + String(r.Faction).trim() : ''), src: 'output/beats/Civic_Office_Ledger.jsonl ' + (r.OfficeId || '') + ' @C' + cycle });
  const deck = { ok: true, cycle, tabs: beats, prevTabs: {}, prevCycle: null };
  for (const t of C.loadFactionStandings ? C.loadFactionStandings(deck) : []) facts.push({ text: t.replace(/ \[[^\]]+\]$/, ''), src: 'output/beats/Civic_Office_Ledger.jsonl @C' + cycle });

  // The city's money.
  for (const t of C.cityMoneyFacts(deck, profiles)) facts.push({ text: t.replace(/ \[[^\]]+\]$/, ''), src: 'output/beats/City_Treasury.jsonl @C' + cycle });

  // People: the office holders who took a decision this cycle; never herself or staff of the paper.
  const people = [];
  const seen = new Set();
  for (const { speaker } of stmts) {
    const o = officeOf.get(speaker.toLowerCase());
    const id = String(o && o.PopId || '').toUpperCase();
    if (!/^POP-\d+$/.test(id) || seen.has(id) || id === SEAT.popid || K.isMediaStaff(profiles, id) || people.length >= PEOPLE_CAP) continue;
    seen.add(id);
    const n = stmts.filter(x => x.speaker === speaker).length;
    const p = K.personFromProfile(profiles, id, String(o.Title || 'office').trim() + '; ' + n + ' decision' + (n === 1 ? '' : 's') + ' this cycle');
    if (p) { p.profile = p.profile + ' — ' + p.why; people.push(p); }
  }

  const label = 'the civic record of C' + cycle;
  return K.makeSlice(SEAT, cycle, beats, {
    ref: src, hood: null, label, angle: label, hookLine: '',
    facts, people, peopleCap: PEOPLE_CAP, factCap: Math.max(12, facts.length),
    hooks: [], note: null,
    extra: { initiatives: inits.length, decisions: stmts.length, offices: offices.length }
  });
}

const sitsOutWhenEmpty = true;
const W = K.wire(SEAT);
if (require.main === module) W.main();
module.exports = { SEAT, sitsOutWhenEmpty, loadSlice: W.load, buildCivicSlice: W.build, writeCivicSlice: W.write, loadCivicSlice: W.load,
  isCivicSeat: W.isSeat, assignmentFromSlice: W.assignmentFromSlice, enrichAssignment: W.enrichAssignment, slicePaths: W.paths };
