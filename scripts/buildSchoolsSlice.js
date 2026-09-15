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
  version: 'SCHOOLS-SLICE-2', nameRe: /angela\s*reyes/i,
  tabs: ['Neighborhood_Demographics', 'Story_Hook_Deck', 'Business_Ledger'],
  approach: 'Schools approach: this slice is the school table for every neighborhood, the enrollment movement this cycle, the district card, and the students and teachers on the ledger. The quality table is stable cycle to cycle — never write as if a score moved when it did not; enrollment is the number that moves. Warm, precise. Never invent a named student or teacher; a score trend is colour unless it is on this table.',
  roomIsYours: 'the classroom, the pickup line, what a parent asks at the door, what the teacher is worried about, what the hallway sounds like at 3:05',
  build
};

const PEOPLE_RE = /\b(student|schooler|teacher|principal|school psychologist|after-school|daycare)\b/i;
const EDUCATOR_RE = /\b(teacher|principal|school psychologist|after-school|daycare)\b/i;
const DISTRICT_BIZ_ID = 'BIZ-00016';

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
  const lead = cycle % 2 === 0 ? rows[0] : rows[rows.length - 1];
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

  const facts = [];
  if (moved.length) {
    facts.push({
      text: 'Enrollment moved: ' + moved.slice(0, 6).map(m => m.hood + ' ' + (m.to - m.from > 0 ? '+' : '') + (m.to - m.from) + ' students').join(', ') +
        ' vs C' + prevDemo.vs,
      src: 'output/beats/prev/Neighborhood_Demographics.jsonl vs current @C' + cycle
    });
  }
  if (prevDemo.state === 'PRIOR_CYCLE_ON_DISK' && !sqiMoved) {
    facts.push({ text: 'The school quality table is unchanged since C' + prevDemo.vs + ' — no score moved this cycle.', src });
  }
  facts.push({ text: 'Ranked by school quality index: ' + rows.map(r => r.hood + ' ' + r.sqi).join(', ') + ' (' + rows.length + ' neighborhoods)', src });
  facts.push({ text: fmt(lead), src });
  for (const r of [rows[0], rows[rows.length - 1]]) if (r !== lead) facts.push({ text: fmt(r), src });

  // The district card (by BIZ_ID — canon.5 holds the rename). A school
  // district has no revenue line; a negative one is a ledger artifact (engine.191).
  const district = (beats.Business_Ledger || []).find(b => b.BIZ_ID === DISTRICT_BIZ_ID);
  if (district) {
    facts.push({
      text: 'The district: ' + district.Name + ' — ' + K.fmtInt(K.num(district.Employee_Count)) + ' employees citywide' +
        (K.num(district.Growth_Rate) != null ? ', growth ' + district.Growth_Rate + '%' : '') +
        '; per-hood funding on the table totals ' + K.fmtInt(rows.reduce((s, r) => s + (r.funding || 0), 0)),
      src: 'output/beats/Business_Ledger.jsonl ' + DISTRICT_BIZ_ID + ' @C' + cycle
    });
  }

  const inLead = [...profiles.values()]
    .filter(p => K.hoodKey(p.Neighborhood) === K.hoodKey(lead.hood) && PEOPLE_RE.test(String(p.RoleType || '')))
    .sort((a, b) => String(a.RoleType).localeCompare(String(b.RoleType)) || String(a.Name).localeCompare(String(b.Name)));
  const people = inLead.map(p => personOf(p, lead.hood, 'on the ledger in ' + lead.hood + ' (Simulation_Ledger)'));
  let peopleNote = null;
  if (!people.length) {
    const citywide = [...profiles.values()]
      .filter(p => EDUCATOR_RE.test(String(p.RoleType || '')))
      .sort((a, b) => String(a.RoleType).localeCompare(String(b.RoleType)) || String(a.Name).localeCompare(String(b.Name)))
      .slice(0, 5);
    for (const p of citywide) {
      people.push(personOf(p, String(p.Neighborhood || '').trim() || null,
        'educator on the ledger in ' + (p.Neighborhood || 'the city') + ' — none in ' + lead.hood + ' (Simulation_Ledger)'));
    }
    peopleNote = 'no students or educators on the ledger in ' + lead.hood +
      (citywide.length ? ' — the educators below are elsewhere in the city' : ' or anywhere on the ledger');
  }

  const label = lead.hood + (lead === rows[0] ? ' has the strongest school record' : ' has the weakest school record') + ' on the table (index ' + lead.sqi + ')';
  return K.makeSlice(SEAT, cycle, beats, {
    ref: src, hood: lead.hood, label,
    angle: (moved.length ? 'Enrollment moved in ' + moved[0].hood + ' — ' : '') + label + ' — the students and teachers who live it',
    hookLine: people.length
      ? people.length + (inLead.length ? ' students and educators in ' + lead.hood : ' educators on the ledger') + '; the table says why their school reads the way it does.'
      : 'No student or educator in ' + lead.hood + ' is on the ledger; the table is the story and the classroom is yours.',
    facts, people,
    deltas: { state: prevDemo.state, vs: prevDemo.vs },
    hooks: schoolHooks(beats, cycle),
    note: peopleNote,
    extra: { table: rows, enrollmentMoves: moved, district: district ? district.Name : null }
  });
}

const W = K.wire(SEAT);
if (require.main === module) W.main();
module.exports = { SEAT, loadSlice: W.load, buildSchoolsSlice: W.build, writeSchoolsSlice: W.write, loadSchoolsSlice: W.load,
  isSchoolsSeat: W.isSeat, assignmentFromSlice: W.assignmentFromSlice, enrichAssignment: W.enrichAssignment, slicePaths: W.paths };
