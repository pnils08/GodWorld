#!/usr/bin/env node
/**
 * buildSchoolsSlice.js — Angela Reyes's schools slice (pipeline.68 Task 4).
 * Source: Neighborhood_Demographics (Students, SchoolQualityIndex, GraduationRate,
 * CollegeReadinessRate, TeacherQuality, Funding) ranked per hood, deltas vs
 * output/beats/prev/ when it exists; students and educators in the lead hood
 * from the Simulation_Ledger snapshot (Youth_Events is dead by ruling, last row
 * C102, and is not read). Lead hood alternates top/bottom of the table by cycle
 * parity so the seat is not the same school story every cycle.
 * Artifacts: output/slices/c{N}/angela-reyes.md · output/cron-compare/schools_slice_c{N}.json
 */
'use strict';
const K = require('./beatSliceKit');

const SEAT = {
  slug: 'angela-reyes', name: 'Angela Reyes', popid: 'POP-00156', desk: 'civic',
  kind: 'beat-schools', domain: 'schools', artifact: 'schools', builder: 'buildSchoolsSlice.js',
  version: 'SCHOOLS-SLICE-1', nameRe: /angela\s*reyes/i,
  tabs: ['Neighborhood_Demographics', 'Story_Hook_Deck'],
  approach: 'Schools approach: this slice is the school table for every neighborhood — which school is doing well is answerable from the quality index — and the students and teachers on the ledger in the lead neighborhood. Warm, precise. Never invent a named student or teacher; a score trend is colour unless it is on this table.',
  roomIsYours: 'the classroom, the pickup line, what a parent asks at the door, what the teacher is worried about, what the hallway sounds like at 3:05',
  build
};

const PEOPLE_RE = /\b(student|schooler|teacher|principal|school psychologist|after-school|daycare)\b/i;

function build(cycle, { root, beats, profiles }) {
  const rows = (beats.Neighborhood_Demographics || []).map(r => ({
    hood: r.Neighborhood, students: K.num(r.Students), sqi: K.num(r.SchoolQualityIndex), grad: K.num(r.GraduationRate),
    college: K.num(r.CollegeReadinessRate), teacher: K.num(r.TeacherQuality), funding: K.num(r.Funding)
  })).filter(r => r.hood && r.sqi != null)
    .sort((a, b) => b.sqi - a.sqi || (b.students || 0) - (a.students || 0) || String(a.hood).localeCompare(String(b.hood)));
  if (!rows.length) return K.emptySlice(SEAT, cycle, 'no Neighborhood_Demographics school columns');
  const prevDemo = K.prevTabRows(root, 'Neighborhood_Demographics');
  const prevBy = new Map(prevDemo.rows.map(r => [K.hoodKey(r.Neighborhood), K.num(r.SchoolQualityIndex)]));
  const lead = cycle % 2 === 0 ? rows[0] : rows[rows.length - 1];
  const src = 'output/beats/Neighborhood_Demographics.jsonl @C' + cycle;
  const fmt = r => r.hood + ': school quality index ' + r.sqi +
    (prevBy.get(K.hoodKey(r.hood)) != null && prevBy.get(K.hoodKey(r.hood)) !== r.sqi ? ' (was ' + prevBy.get(K.hoodKey(r.hood)) + ' at C' + prevDemo.vs + ')' : '') +
    (r.grad != null ? ', graduation ' + r.grad + '%' : '') + (r.college != null ? ', college-ready ' + r.college + '%' : '') +
    (r.teacher != null ? ', teacher quality ' + r.teacher : '') + (r.funding != null ? ', funding ' + K.fmtInt(r.funding) : '') +
    (r.students != null ? ', ' + K.fmtInt(r.students) + ' students' : '');
  const facts = [
    { text: 'Ranked by school quality index: ' + rows.map(r => r.hood + ' ' + r.sqi).join(', ') + ' (' + rows.length + ' neighborhoods)', src },
    { text: fmt(lead), src }
  ];
  for (const r of [rows[0], rows[rows.length - 1]]) if (r !== lead) facts.push({ text: fmt(r), src });
  const people = [...profiles.values()]
    .filter(p => K.hoodKey(p.Neighborhood) === K.hoodKey(lead.hood) && PEOPLE_RE.test(String(p.RoleType || '')))
    .sort((a, b) => String(a.RoleType).localeCompare(String(b.RoleType)) || String(a.Name).localeCompare(String(b.Name)))
    .map(p => K.person(String(p.POPID).toUpperCase(), String(p.Name).trim(), String(p.RoleType || '').trim() || null, lead.hood,
      'on the ledger in ' + lead.hood + ' (Simulation_Ledger)'));
  const label = lead.hood + (lead === rows[0] ? ' has the strongest school record' : ' has the weakest school record') + ' on the table (index ' + lead.sqi + ')';
  return K.makeSlice(SEAT, cycle, beats, {
    ref: src, hood: lead.hood, label,
    angle: label + ' — the students and teachers who live it',
    hookLine: people.length
      ? people.length + ' students and educators in ' + lead.hood + ' are on the ledger; the table says why their school reads the way it does.'
      : 'No student or educator in ' + lead.hood + ' is on the ledger; the table is the story and the classroom is yours.',
    facts, people,
    deltas: { state: prevDemo.state, vs: prevDemo.vs },
    hooks: K.hooksFor(beats, cycle, SEAT.name),
    note: people.length ? null : 'no students or educators on the ledger in ' + lead.hood,
    extra: { table: rows }
  });
}

const W = K.wire(SEAT);
if (require.main === module) W.main();
module.exports = { SEAT, loadSlice: W.load, buildSchoolsSlice: W.build, writeSchoolsSlice: W.write, loadSchoolsSlice: W.load,
  isSchoolsSeat: W.isSeat, assignmentFromSlice: W.assignmentFromSlice, enrichAssignment: W.enrichAssignment, slicePaths: W.paths };
