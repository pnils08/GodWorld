#!/usr/bin/env node
/**
 * buildSchoolsSlice.js — Angela Reyes's schools slice (pipeline.68 Task 4).
 * Sources:
 *   Neighborhood_Demographics (Students, SchoolQualityIndex, GraduationRate,
 *     CollegeReadinessRate, TeacherQuality, Funding) ranked per hood. The
 *     quality table is static backfill — no engine drifts it (drift-engine
 *     proposal filed with engine-sheet, 2026-09-10); enrollment (Students) DOES
 *     drift every cycle, so the slice leads with enrollment movement vs
 *     output/beats/prev/ and says plainly when the quality table is unchanged.
 *   Business_Ledger — the district card (BIZ-00016 by ID, not name: canon.5
 *     holds the OUSD rename).
 *   Story_Hook_Deck — hooks addressed to her by name, plus this cycle's
 *     EDUCATION / DROPOUT_WAVE rows by domain: the engine's deskMap sends
 *     EDUCATION to an "Education Desk" no roster carries, demographic hooks
 *     pre-match a culture generalist, and DROPOUT_WAVE rows carry no desk at
 *     all (engine cuts filed); the domain match is what reaches her until then.
 * Students and educators come from the Simulation_Ledger snapshot — the lead
 *   hood first, then educators citywide when the lead hood has none
 *   (Youth_Events is dead by ruling, last row C102, and is not read).
 * Lead hood alternates top/bottom of the table by cycle parity so the seat is
 * not the same school story every cycle.
 * Artifacts: output/slices/c{N}/angela-reyes.md · output/cron-compare/schools_slice_c{N}.json
 */
'use strict';
const K = require('./beatSliceKit');

const SEAT = {
  slug: 'angela-reyes', name: 'Angela Reyes', popid: 'POP-00156', desk: 'civic',
  kind: 'beat-schools', domain: 'schools', artifact: 'schools', builder: 'buildSchoolsSlice.js',
  version: 'SCHOOLS-SLICE-3', nameRe: /angela\s*reyes/i,
  tabs: ['Neighborhood_Demographics', 'Business_Ledger', 'Employment_Roster', 'Community_Programs', 'LifeHistory_Log'],
  approach: '',
  roomIsYours: '',
  build
};

const PEOPLE_RE = /\b(student|schooler|teacher|principal|school psychologist|after-school|daycare)\b/i;
const EDUCATOR_RE = /\b(teacher|principal|school psychologist|after-school|daycare)\b/i;
const DISTRICT_BIZ_ID = 'BIZ-00016';
const PEOPLE_CAP = 30;
const STAFF_CAP = 15;

/** Name-matched hooks plus this cycle's EDUCATION / DROPOUT_WAVE rows (misrouted or unrouted engine-side). */
function schoolHooks(beats, cycle) {
  const named = K.hooksFor(beats, cycle, SEAT.name);
  const seen = new Set(named.map(h => h.text));
  const domain = (beats.Story_Hook_Deck || [])
    .filter(r => Number(r.Cycle) === Number(cycle) &&
      /^(EDUCATION|DROPOUT_WAVE|SCHOOL_QUALITY_CRISIS)$/.test(String(r.Domain || r.HookType || '').toUpperCase()))
    .map(r => ({
      text: String(r.HookText || r.Description || '').trim(), angle: String(r.SuggestedAngle || '').trim() || null,
      domain: r.Domain || r.HookType || null, hood: r.Neighborhood || null, priority: K.num(r.Priority)
    }))
    .filter(h => h.text && !seen.has(h.text));
  return named.concat(domain);
}

function personOf(p, hood, why) {
  return K.person(String(p.POPID).toUpperCase(), String(p.Name).trim(), String(p.RoleType || '').trim() || null, hood, why);
}

function build(cycle, { root, beats, profiles }) {
  const rows = (beats.Neighborhood_Demographics || []).map(r => ({
    hood: r.Neighborhood, students: K.num(r.Students), sqi: K.num(r.SchoolQualityIndex), grad: K.num(r.GraduationRate),
    college: K.num(r.CollegeReadinessRate), teacher: K.num(r.TeacherQuality), funding: K.num(r.Funding)
  })).filter(r => r.hood && r.sqi != null)
    .sort((a, b) => b.sqi - a.sqi || (b.students || 0) - (a.students || 0) || String(a.hood).localeCompare(String(b.hood)));
  if (!rows.length) return K.emptySlice(SEAT, cycle, 'no Neighborhood_Demographics school columns');
  const prevDemo = K.prevTabRows(root, 'Neighborhood_Demographics');
  const prevBy = new Map(prevDemo.rows.map(r => [K.hoodKey(r.Neighborhood), { sqi: K.num(r.SchoolQualityIndex), students: K.num(r.Students) }]));
  const src = 'output/beats/Neighborhood_Demographics.jsonl @C' + cycle;

  // Enrollment is the live number on this table — it drifts every cycle.
  const moved = rows.filter(r => {
    const p = prevBy.get(K.hoodKey(r.hood));
    return p && p.students != null && r.students != null && p.students !== r.students;
  }).map(r => ({ hood: r.hood, from: prevBy.get(K.hoodKey(r.hood)).students, to: r.students }))
    .sort((a, b) => Math.abs(b.to - b.from) - Math.abs(a.to - a.from));
  const sqiMoved = rows.some(r => {
    const p = prevBy.get(K.hoodKey(r.hood));
    return p && p.sqi != null && p.sqi !== r.sqi;
  });

  const fmt = r => r.hood + ': school quality index ' + r.sqi +
    (prevBy.get(K.hoodKey(r.hood)) && prevBy.get(K.hoodKey(r.hood)).sqi != null && prevBy.get(K.hoodKey(r.hood)).sqi !== r.sqi
      ? ' (was ' + prevBy.get(K.hoodKey(r.hood)).sqi + ' at C' + prevDemo.vs + ')' : '') +
    (r.grad != null ? ', graduation ' + r.grad + '%' : '') + (r.college != null ? ', college-ready ' + r.college + '%' : '') +
    (r.teacher != null ? ', teacher quality ' + r.teacher : '') + (r.funding != null ? ', funding ' + K.fmtInt(r.funding) : '') +
    (r.students != null ? ', ' + K.fmtInt(r.students) + ' students' : '');

  // pipeline.111 (builder 2026-11-23: "This looks good"): every hood's row in name order; no strongest/weakest pick.
  const facts = [];
  if (moved.length) {
    facts.push({
      text: 'Enrollment moved: ' + moved.map(m => m.hood + ' ' + (m.to - m.from > 0 ? '+' : '') + (m.to - m.from) + ' students').join(', ') + ' vs C' + prevDemo.vs,
      src: 'output/beats/prev/Neighborhood_Demographics.jsonl vs current @C' + cycle
    });
  }
  if (prevDemo.state === 'PRIOR_CYCLE_ON_DISK' && !sqiMoved) facts.push({ text: 'The school quality table is unchanged since C' + prevDemo.vs + ' — no score moved this cycle.', src });
  for (const r of rows.slice().sort((a, b) => String(a.hood).localeCompare(String(b.hood)))) facts.push({ text: fmt(r), src });

  // The schools, colleges and childcare as businesses, and the programs for the young.
  const SCHOOL_BIZ = /education|school|college|university|academy|childcare|preschool|tutor/i;
  const schools = (beats.Business_Ledger || []).filter(b => b.BIZ_ID && b.Name && SCHOOL_BIZ.test(String(b.Sector || '') + ' ' + String(b.Name)) && !/dental|medical|cafe/i.test(String(b.Name)));
  for (const b of schools) {
    facts.push({ text: String(b.Name).trim() + ' (' + String(b.Sector || '').trim() + ')' + (b.Neighborhood ? ', ' + b.Neighborhood : '') +
      (K.num(b.Employee_Count) != null ? ' — ' + K.fmtInt(K.num(b.Employee_Count)) + ' employees' : '') + (K.num(b.Growth_Rate) != null ? ', growing ' + K.num(b.Growth_Rate).toFixed(1) + '% a year' : ''),
      src: 'output/beats/Business_Ledger.jsonl ' + b.BIZ_ID + ' @C' + cycle });
  }
  for (const pr of (beats.Community_Programs || []).filter(p => p.Name && /active/i.test(String(p.Status || '')) && /youth|tech-education|school|academy|apprentice|league|tutor/i.test(String(p.Type || '') + ' ' + String(p.Name)))) {
    const founder = pr.Founder_POPID ? profiles.get(String(pr.Founder_POPID).toUpperCase()) : null;
    facts.push({ text: String(pr.Name).trim() + ' (' + String(pr.Type || '') + ')' + (pr.Neighborhood ? ', ' + pr.Neighborhood : '') +
      (founder && founder.Name ? ' — founded by ' + String(founder.Name).trim() : '') + (pr.Founded_Cycle ? ', since C' + pr.Founded_Cycle : ''),
      src: 'output/beats/Community_Programs.jsonl ' + (pr.Program_ID || pr.Name) + ' @C' + cycle });
  }

  // People: the staff on the schools' roster, and the citizens whose week was about school, learning or a graduation.
  const { simYearFromCycle } = require('../lib/citizenDerivation');
  const people = [];
  const add = (popid, why) => {
    const id = String(popid || '').toUpperCase();
    if (!/^POP-\d+$/.test(id) || id === SEAT.popid || K.isMediaStaff(profiles, id) || people.some(p => p.popid === id) || people.length >= PEOPLE_CAP) return;
    const p = K.personFromProfile(profiles, id, why);
    if (!p) return;
    const by = K.num((profiles.get(id) || {}).BirthYear);
    if (by) p.age = simYearFromCycle(cycle) - by;   // her craft names a teacher by years in the room — the row's age, never a guess
    p.profile = p.profile + (p.age ? ' — age ' + p.age : '') + ' — ' + why;
    people.push(p);
  };
  const life = (beats.LifeHistory_Log || []).filter(r => String(r.Cycle) === String(cycle) && String(r.EventText || '').trim());
  const schoolIds = new Map(schools.map(b => [b.BIZ_ID, String(b.Name).trim()]));
  for (const w of (beats.Employment_Roster || []).filter(w => schoolIds.has(w.BIZ_ID)).slice(0, STAFF_CAP)) {   // room left for the students and families
    const own = life.find(r => String(r.POPID).toUpperCase() === String(w.POP_ID).toUpperCase());
    add(w.POP_ID, String(w.RoleType || 'works').trim() + ' at ' + schoolIds.get(w.BIZ_ID) + (own ? '; C' + cycle + ': ' + String(own.EventText).trim() : ''));
  }
  // The ledger's students with a line this cycle, before the adults' learning lines.
  const studentIds = new Set([...profiles.values()].filter(p => /\b(student|schooler)\b/i.test(String(p.RoleType || ''))).map(p => String(p.POPID).toUpperCase()));
  for (const r of life.filter(r => studentIds.has(String(r.POPID).toUpperCase())).slice(0, 10)) {
    add(r.POPID, 'student, C' + cycle + (r.Neighborhood ? ' in ' + r.Neighborhood : '') + ': ' + String(r.EventText).trim());
  }
  const SCHOOL_LINE = /\b(school|class|classes|teacher|student|homework|graduat\w*|diploma|tutor\w*|recess|principal|classroom|campus|commencement|semester|exam|enroll\w*)\b/i;
  for (const r of life.filter(r => /^(Education|Graduation)/.test(String(r.EventTag || '')) || SCHOOL_LINE.test(String(r.EventText)))) {
    add(r.POPID, 'C' + cycle + (r.Neighborhood ? ' in ' + r.Neighborhood : '') + ': ' + String(r.EventText).trim());
  }

  const label = 'the schools and youth record of C' + cycle;
  return K.makeSlice(SEAT, cycle, beats, {
    ref: src, hood: null, label, angle: label, hookLine: '',
    facts, people, peopleCap: PEOPLE_CAP, factCap: Math.max(12, facts.length),
    deltas: { state: prevDemo.state, vs: prevDemo.vs },
    hooks: [], note: null,
    extra: { table: rows, enrollmentMoves: moved }
  });
}

const sitsOutWhenEmpty = true;
const W = K.wire(SEAT);
if (require.main === module) W.main();
module.exports = { SEAT, sitsOutWhenEmpty, loadSlice: W.load, buildSchoolsSlice: W.build, writeSchoolsSlice: W.write, loadSchoolsSlice: W.load,
  isSchoolsSeat: W.isSeat, assignmentFromSlice: W.assignmentFromSlice, enrichAssignment: W.enrichAssignment, slicePaths: W.paths };
