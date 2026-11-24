#!/usr/bin/env node
/**
 * buildInvestigationsSlice.js — Luis Navarro's record (pipeline.111; builder 2026-11-24: "2 - looked good").
 * Was the civic-domain packet scored for him: the top "anomaly" (the engine's own self-check findings — stuck
 * initiatives, math-imbalance, coverage-gap), a lead line, an approach, a known/unknown template and three residents
 * of the picked hood. Now the city's record of what was promised and when:
 *   Initiative_Tracker — every initiative's clock: phase and the cycle it entered it, the last cycle anyone worked it
 *     and which office, the next action and the cycle it is due, its dated milestones; id order
 *   output/civic-voice/*_c{N}.json — every decision city hall's offices took this cycle, by speaker and initiative
 *   Civic_Office_Ledger — every office with its holder and faction; the faction standings
 * People: the office holders who took a decision this cycle.
 * Artifacts: output/slices/c{N}/luis-navarro.md · output/cron-compare/investigations_slice_c{N}.json
 */
'use strict';
const K = require('./beatSliceKit');
const C = require('./buildCivicDomainSlice');
const { cycleStatements } = require('./buildCivicSlice');

const SEAT = {
  slug: 'luis-navarro', name: 'Luis Navarro', popid: 'POP-00636', desk: 'civic',
  kind: 'beat-investigations', domain: 'investigations', artifact: 'investigations', builder: 'buildInvestigationsSlice.js',
  version: 'INVESTIGATIONS-SLICE-1', nameRe: /luis\s*navarro/i,
  tabs: ['Initiative_Tracker', 'Civic_Office_Ledger', 'Story_Hook_Deck'],
  approach: '',
  roomIsYours: '',
  build
};
const PEOPLE_CAP = 30;

// "civic-office-council-d5" → "the District 5 council office"; "proj-transit-hub" → "the transit hub project office".
function workedBy(seats) {
  return String(seats || '').split(/\s*,\s*/).filter(Boolean).map(s => {
    const d = s.match(/^civic-office-council-d(\d)$/);
    if (d) return 'the District ' + d[1] + ' council office';
    const p = s.match(/^proj-(.+)$/);
    if (p) return 'the ' + p[1].replace(/-/g, ' ') + ' project office';
    return s.replace(/^civic-office-/, 'the ').replace(/-/g, ' ') + ' office';
  }).join(' and ');
}

function clockFacts(r, cycle) {
  const v = k => String(r[k] == null ? '' : r[k]).trim();
  const name = v('Name');
  const out = [];
  const phase = v('ImplementationPhase') || v('Status');
  out.push(name + ' — ' + (v('Status') ? 'status ' + v('Status') + ', ' : '') + 'phase ' + (phase || 'none') +
    (v('LastStageChangeCycle') ? ' since Cycle ' + v('LastStageChangeCycle') : '') + (v('PriorPhase') ? ' (before: ' + v('PriorPhase') + ')' : '') +
    (v('ProposedCycle') ? '; proposed Cycle ' + v('ProposedCycle') + (v('Proposer') ? ' by ' + v('Proposer') : '') : '') +
    (v('VoteCycle') ? '; voted Cycle ' + v('VoteCycle') + (v('Outcome') ? ', ' + v('Outcome') : '') : ''));
  if (v('LastWorkCycle')) out.push(name + ' — last worked Cycle ' + v('LastWorkCycle') + (v('LastWorkSeat') ? ', by ' + workedBy(v('LastWorkSeat')) : ''));
  if (v('NextScheduledAction')) out.push(name + ' — next action: ' + v('NextScheduledAction') + (v('NextActionCycle') ? ', due Cycle ' + v('NextActionCycle') : ''));
  for (const t of C.initiativeRecordFacts(r).filter(t => / milestone — /.test(t))) out.push(t.replace(/ \[Initiative_Tracker\]$/, ''));
  return out;
}

function build(cycle, { root, beats, profiles }) {
  root = root || K.ROOT;
  profiles = profiles || K.loadProfiles(root);
  const inits = (beats.Initiative_Tracker || []).filter(r => String(r.InitiativeID || '').trim() && String(r.Name || '').trim())
    .sort((a, b) => String(a.InitiativeID).localeCompare(String(b.InitiativeID), 'en', { numeric: true }));
  if (!inits.length) return K.emptySlice(SEAT, cycle, 'no Initiative_Tracker rows');
  const nameOf = new Map(inits.map(r => [String(r.InitiativeID).trim(), String(r.Name).trim()]));
  const src = 'output/beats/Initiative_Tracker.jsonl @C' + cycle;
  const facts = [];
  for (const r of inits) for (const t of clockFacts(r, cycle)) facts.push({ text: t, src: src + ' ' + r.InitiativeID });

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
  for (const r of offices) facts.push({ text: C.officeFact(r).replace(/ \[Civic_Office_Ledger\]$/, '') + (r.Faction ? ' — ' + String(r.Faction).trim() : ''), src: 'output/beats/Civic_Office_Ledger.jsonl ' + (r.OfficeId || '') + ' @C' + cycle });
  const deck = { ok: true, cycle, tabs: beats, prevTabs: {}, prevCycle: null };
  for (const t of C.loadFactionStandings(deck)) facts.push({ text: t.replace(/ \[[^\]]+\]$/, ''), src: 'output/beats/Civic_Office_Ledger.jsonl @C' + cycle });

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

  const label = 'the investigations record of C' + cycle;
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
module.exports = { SEAT, sitsOutWhenEmpty, workedBy, loadSlice: W.load, buildInvestigationsSlice: W.build, writeInvestigationsSlice: W.write,
  loadInvestigationsSlice: W.load, isInvestigationsSeat: W.isSeat, assignmentFromSlice: W.assignmentFromSlice, enrichAssignment: W.enrichAssignment, slicePaths: W.paths };
