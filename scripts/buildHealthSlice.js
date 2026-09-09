#!/usr/bin/env node
/**
 * buildHealthSlice.js — Dr. Lila Mezran's health slice (pipeline.68 Task 4).
 * Source: Neighborhood_Demographics.Sick per hood (the volume, with deltas vs
 * output/beats/prev/ when it exists), Hospital_Ledger and the live rows of
 * Health_Cause_Queue (the named residents; processed rows and retired-export
 * fossils are skipped), Who Lived It ### Health/Recovering and chaos-table
 * hospitalizations from the world summary, Story_Hook_Deck hooks. A pro
 * athlete on the hospital record is a sports story, not a health one (same
 * rule as the civic desk).
 * Artifacts: output/slices/c{N}/lila-mezran.md · output/cron-compare/health_slice_c{N}.json
 */
'use strict';
const K = require('./beatSliceKit');
const { loadHealthEntries } = require('./buildCivicDomainSlice');

const SEAT = {
  slug: 'lila-mezran', name: 'Dr. Lila Mezran', popid: 'POP-00154', desk: 'civic',
  kind: 'beat-health', domain: 'health', artifact: 'health', builder: 'buildHealthSlice.js',
  version: 'HEALTH-SLICE-2', nameRe: /lila\s*mezran/i,
  tabs: ['Neighborhood_Demographics', 'Hospital_Ledger', 'Health_Cause_Queue', 'Story_Hook_Deck'],
  approach: 'Health approach: this slice is the illness count by neighborhood, every resident named on the hospital and live cause records, and the residents the cycle summary names under Health/Recovering. Clinical calm, human cost, no diagnosis beyond what the record says. When the named rows are few, write the neighborhood, not a ward.',
  roomIsYours: 'the waiting room, the walk to the clinic, what a household does when one person is sick, who covers the shift',
  build
};

const ATHLETE_RE = /\b(?:athlete|player|pitcher|catcher|fielder|shortstop|baseman|designated hitter|coach|manager, oakland)\b/i;
function ineligible(profiles, popid) {
  const p = profiles.get(String(popid || '').toUpperCase());
  if (!p) return false;
  return String(p.EconomicProfileKey || '') === 'SPORTS_OVERRIDE' || ATHLETE_RE.test(String(p.RoleType || ''));
}

function build(cycle, { root, beats, profiles }) {
  const demo = (beats.Neighborhood_Demographics || []).map(r => ({ hood: r.Neighborhood, sick: K.num(r.Sick) }))
    .filter(r => r.hood && r.sick != null).sort((a, b) => b.sick - a.sick || String(a.hood).localeCompare(String(b.hood)));
  if (!demo.length) return K.emptySlice(SEAT, cycle, 'no Neighborhood_Demographics rows');
  const prevDemo = K.prevTabRows(root, 'Neighborhood_Demographics');
  const prevBy = new Map(prevDemo.rows.map(r => [K.hoodKey(r.Neighborhood), K.num(r.Sick)]));
  const total = demo.reduce((a, r) => a + r.sick, 0);
  const lead = demo[0];
  const demoSrc = 'output/beats/Neighborhood_Demographics.jsonl Sick @C' + cycle;
  const facts = [{
    text: 'Sick residents by neighborhood: ' + demo.slice(0, 8).map(r => {
      const pv = prevBy.get(K.hoodKey(r.hood));
      return r.hood + ' ' + r.sick + (pv != null ? ' (' + (r.sick - pv >= 0 ? '+' : '') + (r.sick - pv) + ' vs C' + prevDemo.vs + ')' : '');
    }).join(', ') + ' — ' + K.fmtInt(total) + ' across ' + demo.length + ' neighborhoods',
    src: demoSrc
  }];
  const ok = r => r.POPID && r.Name && !ineligible(profiles, r.POPID);
  const people = [];
  for (const r of (beats.Hospital_Ledger || []).filter(ok)) {
    const p = K.personFromProfile(profiles, r.POPID, 'on Hospital_Ledger this cycle', r.Neighborhood) ||
      K.person(r.POPID, String(r.Name).trim(), null, r.Neighborhood || null, 'on Hospital_Ledger this cycle');
    people.push(p);
    facts.push({
      text: p.name + (r.Neighborhood ? ' (' + r.Neighborhood + ')' : '') + ' — in hospital care, ' + (r.StatusNow || 'status unrecorded') +
        (K.num(r.AdmitCycle) != null ? ', admitted C' + K.num(r.AdmitCycle) : '') + (r.Cause ? ' after ' + r.Cause : ''),
      src: 'output/beats/Hospital_Ledger.jsonl ' + r.POPID
    });
  }
  // Only live queue rows ride the slice: processed rows and fossils from the
  // retired intake export (StatusStartCycle 0, zeroed counters) are skipped.
  const liveQueue = (beats.Health_Cause_Queue || []).filter(r =>
    ok(r) && !String(r.Processed || '').trim() && (K.num(r.StatusStartCycle) || 0) > 0);
  for (const r of liveQueue) {
    if (people.some(p => p.popid === String(r.POPID).toUpperCase())) continue;
    const p = K.personFromProfile(profiles, r.POPID, 'on Health_Cause_Queue this cycle', r.Neighborhood) ||
      K.person(r.POPID, String(r.Name).trim(), null, r.Neighborhood || null, 'on Health_Cause_Queue this cycle');
    people.push(p);
    facts.push({
      text: p.name + (r.Neighborhood ? ' (' + r.Neighborhood + ')' : '') + (K.num(r.Age) != null ? ', ' + K.num(r.Age) : '') + ' — ' +
        (r.Status || 'status unrecorded') + (r.AssignedCause ? ', ' + r.AssignedCause : '') + (K.num(r.CyclesSick) ? ', ' + K.num(r.CyclesSick) + ' cycles' : ''),
      src: 'output/beats/Health_Cause_Queue.jsonl ' + r.POPID
    });
  }
  // World-summary material — the same parse the civic-domain fallback uses:
  // Who Lived It ### Health/Recovering residents, chaos-table hospitalizations,
  // hood HEALTH clusters, and the city illness/hospital line. A flat-numbers
  // cycle still has the people living the record.
  for (const e of loadHealthEntries(cycle, root, profiles)) {
    const popid = (e.popids || [])[0];
    if (popid && people.some(p => p.popid === popid)) continue;
    if (popid) {
      people.push(K.personFromProfile(profiles, popid, 'named in the cycle health record', e.hood) ||
        K.person(popid, String(e.label).split(' — ')[0], null, e.hood || null, 'named in the cycle health record'));
    }
    facts.push({ text: (e.handle && e.handle.angle) || e.label, src: e.ref });
  }
  const label = lead.hood + ' carries the most sick residents (' + lead.sick + ') | ' + people.length + ' named on the hospital and cause records';
  return K.makeSlice(SEAT, cycle, beats, {
    ref: demoSrc + ' + Hospital_Ledger.jsonl + Health_Cause_Queue.jsonl', hood: lead.hood, label,
    angle: label,
    hookLine: people.length
      ? people[0].name + ' is one of ' + people.length + ' residents on the record this cycle; ' + lead.hood + ' carries the most illness.'
      : lead.hood + ' carries the most illness this cycle; no resident is named on the hospital or cause records.',
    facts, people,
    deltas: { state: prevDemo.state, vs: prevDemo.vs },
    hooks: K.hooksFor(beats, cycle, SEAT.name),
    note: people.length < 5 ? 'named rows are few (' + people.length + ') — write the neighborhood, not a ward' : null,
    extra: { byHood: demo }
  });
}

const W = K.wire(SEAT);
if (require.main === module) W.main();
module.exports = { SEAT, loadSlice: W.load, buildHealthSlice: W.build, writeHealthSlice: W.write, loadHealthSlice: W.load,
  isHealthSeat: W.isSeat, assignmentFromSlice: W.assignmentFromSlice, enrichAssignment: W.enrichAssignment, slicePaths: W.paths };
