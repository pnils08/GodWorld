#!/usr/bin/env node
/**
 * buildJaxRecordSlice.js — Jax Caldera's record (pipeline.111; builder 2026-11-24: "1 - yes", the Civis Systems bullshit
 * detector from the citizen's side; "whats the story"). Replaces, for his seat-file wake, buildJaxSlice's scored pick —
 * the top stink, a contradiction the code wrote ("The map says decay; …"), the firebrand approach, the TWO_SIDED_DATA_AUDIT
 * template and the residents of the picked hood. buildJaxSlice stays as it is (pipeline.115 owns its refs and his rulebook).
 * The record, people first, nothing picked (builder 2026-11-24: "go, flip it"):
 *   citizens in their own words — each one's latest page from the last two Cycles (output/citizen_pages, the Voices roster)
 *   who holds what — every business whose ledger row names its key people (owner, founder, who runs it); every office
 *   what the city's dashboard says — every Civis Systems reading this Cycle
 * The neighborhood numbers, city hall's decisions and the paper are a tool call away (sheet_read, canon_search).
 * Artifacts: output/slices/c{N}/freelance-firebrand.md · output/cron-compare/jax_record_slice_c{N}.json
 */
'use strict';
const K = require('./beatSliceKit');
const C = require('./buildCivicDomainSlice');

const SEAT = {
  slug: 'freelance-firebrand', name: 'Jax Caldera', popid: 'POP-00799', desk: 'civic',
  kind: 'beat-jax', domain: 'accountability', artifact: 'jax_record', builder: 'buildJaxRecordSlice.js',
  version: 'JAX-RECORD-SLICE-2', nameRe: /jax\s*caldera/i,
  tabs: ['Business_Ledger', 'Civic_Office_Ledger', 'Story_Hook_Deck'],
  approach: '',
  roomIsYours: '',
  build
};
const PEOPLE_CAP = 40;

function build(cycle, { root, beats, profiles }) {
  root = root || K.ROOT;
  profiles = profiles || K.loadProfiles(root);
  const facts = [];
  const people = [];

  // 1. Citizens in their own words — each one's latest page from the last two Cycles (what they wrote, told a reporter,
  //    or the question they carry), newest first as the Voices roster orders it; never himself or Tribune staff.
  const voices = require('./buildVoicesSlice').buildVoicesSlice(cycle, { root, profiles });
  for (const f of (voices.facts || []).filter(f => Number(f.cycle) >= cycle - 1)) {
    const id = String(f.popid || '').toUpperCase();
    if (id === SEAT.popid || K.isMediaStaff(profiles, id)) continue;
    facts.push({ text: 'In their own words — ' + String(f.text).replace(/; new since your last piece/, '').replace(/; you ran them C\d+/, ''), src: 'output/citizen_pages/index.jsonl ' + (f.docId || id) });
    if (people.length < PEOPLE_CAP) {
      const p = K.personFromProfile(profiles, id, 'has a page on the record, C' + f.cycle);
      if (p) people.push(p);
    }
  }

  // 2. Who holds what — every business whose ledger row names its key people, every office and who sits in it.
  for (const b of (beats.Business_Ledger || []).filter(b => String(b.Key_Personnel || '').trim() && String(b.Name || '').trim())) {
    facts.push({ text: String(b.Name).trim() + ' (' + String(b.Sector || '').trim() + ', ' + String(b.Neighborhood || '').trim() + ')' +
      (K.num(b.Employee_Count) != null ? ', ' + K.fmtInt(K.num(b.Employee_Count)) + ' employees' : '') +
      (K.num(b.Annual_Revenue) != null ? ', revenue $' + K.fmtInt(K.num(b.Annual_Revenue)) : '') + ' — ' + String(b.Key_Personnel).trim(),
      src: 'output/beats/Business_Ledger.jsonl ' + b.BIZ_ID + ' @C' + cycle });
  }
  for (const r of (beats.Civic_Office_Ledger || []).filter(r => String(r.Holder || '').trim())) {
    facts.push({ text: C.officeFact(r).replace(/ \[Civic_Office_Ledger\]$/, '') + (r.Faction ? ' — ' + String(r.Faction).trim() : ''), src: 'output/beats/Civic_Office_Ledger.jsonl ' + (r.OfficeId || '') + ' @C' + cycle });
  }

  // 3. What the city's dashboard says — every Civis Systems reading this Cycle, in its order.
  const readings = C.loadCycleCivicEntries(cycle, root, profiles).filter(e => e.kind === 'anomaly');
  for (const e of readings) facts.push({ text: 'Civis Systems reading: ' + String(e.label).trim(), src: 'output/desk_signal_c' + cycle + '.json ' + (e.ref || '') });
  if (!facts.length) return K.emptySlice(SEAT, cycle, 'no record this cycle');

  const label = 'the city of C' + cycle;
  return K.makeSlice(SEAT, cycle, beats, {
    ref: 'output/desk_signal_c' + cycle + '.json', hood: null, label, angle: label, hookLine: '',
    facts, people, peopleCap: PEOPLE_CAP, factCap: Math.max(12, facts.length),
    hooks: [], note: null,
    extra: { voices: people.length, readings: readings.length }
  });
}

const sitsOutWhenEmpty = true;
const W = K.wire(SEAT);
if (require.main === module) W.main();
module.exports = { SEAT, sitsOutWhenEmpty, loadSlice: W.load, buildJaxRecordSlice: W.build, writeJaxRecordSlice: W.write, loadJaxRecordSlice: W.load,
  isJaxRecordSeat: W.isSeat, assignmentFromSlice: W.assignmentFromSlice, enrichAssignment: W.enrichAssignment, slicePaths: W.paths };
