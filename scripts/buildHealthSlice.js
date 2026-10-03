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
 * engine.254 Task 10: the care trail (Care_Justice_Census, hospital system:
 * sick residents → admissions → in care and beds, per hood, tracked names or
 * "none tracked").
 * Hood illness spike (care-and-justice plan, 2026-10-02): a hood whose Sick
 * share of residents is at or over the 6% watch bar, or up a quarter on the
 * previous cycle, puts up to two of its tracked residents on the slice as
 * neighbours — people to quote about a block where illness is up, never
 * patients.
 * Artifacts: output/slices/c{N}/lila-mezran.md · output/cron-compare/health_slice_c{N}.json
 */
'use strict';
const K = require('./beatSliceKit');
const { loadHealthEntries } = require('./buildCivicDomainSlice');

const SEAT = {
  slug: 'lila-mezran', name: 'Dr. Lila Mezran', popid: 'POP-00154', desk: 'civic',
  kind: 'beat-health', domain: 'health', artifact: 'health', builder: 'buildHealthSlice.js',
  version: 'HEALTH-SLICE-4', nameRe: /lila\s*mezran/i,
  tabs: ['Neighborhood_Demographics', 'Hospital_Ledger', 'Health_Cause_Queue', 'Story_Hook_Deck', 'Care_Justice_Census'],
  approach: 'Health approach: this slice is the illness count by neighborhood, every resident named on the hospital and live cause records, the residents the cycle summary names under Health/Recovering, and the care trail — sick residents to admissions to who is in a bed, hood by hood, tracked and other residents apart. A person listed as living in a neighborhood where illness is up is a neighbour to quote about the block, not a patient — nothing on the record says they are sick. Clinical calm, human cost, no diagnosis beyond what the record says. When the named rows are few, write the neighborhood, not a ward.',
  roomIsYours: 'the waiting room, the walk to the clinic, what a household does when one person is sick, who covers the shift',
  build
};

const ineligible = K.sportsSubject;

// The engine's own illness measure (applyStorySeeds hood health seed): Sick
// over Students + Adults + Seniors. SPIKE_WATCH is its 6% watch bar; SPIKE_RISE
// is the plan's "up a quarter on the previous Cycle".
const SPIKE_WATCH = 0.06;
const SPIKE_RISE = 1.25;
const SPIKE_NEIGHBOURS = 2;

function sickShare(r) {
  const pop = (K.num(r.Students) || 0) + (K.num(r.Adults) || 0) + (K.num(r.Seniors) || 0);
  return pop > 0 && K.num(r.Sick) != null ? K.num(r.Sick) / pop : null;
}

/**
 * Spike hoods this cycle: share at or over the watch bar, or up a quarter on
 * the previous cycle (no prev/ → the bar alone). Sorted by share, the top one
 * carries the neighbours.
 */
function spikeHoods(demo, prevRows) {
  const prevShare = new Map(prevRows.map(r => [K.hoodKey(r.Neighborhood), sickShare(r)]));
  return demo.filter(r => r.share != null).map(r => {
    const prev = prevShare.get(K.hoodKey(r.hood));
    const prevOk = prev != null && prev > 0;
    return { hood: r.hood, sick: r.sick, pop: r.pop, share: r.share, prevShare: prevOk ? prev : null,
      overBar: r.share >= SPIKE_WATCH, risen: prevOk && r.share >= prev * SPIKE_RISE };
  }).filter(s => s.overBar || s.risen).sort((a, b) => b.share - a.share || String(a.hood).localeCompare(String(b.hood)));
}

/** Up to SPIKE_NEIGHBOURS tracked residents of the hood not already on the slice: alive, not a sports subject, by POPID from a cycle-rotated start. */
function spikeNeighbours(profiles, hood, cycle, people) {
  const want = K.hoodKey(hood);
  const pool = [];
  for (const [popid, p] of profiles) {
    if (K.hoodKey(p.Neighborhood) !== want || !String(p.Name || '').trim()) continue;
    // Dead, in a bed (the ledger's own status, whatever the dump's hospital tab
    // caught) or a sports subject: never a neighbour.
    if (/deceased|dead|hospital/i.test(String(p.Status || '')) || ineligible(profiles, popid)) continue;
    if (people.some(q => q.popid === popid)) continue;
    pool.push(popid);
  }
  pool.sort();
  if (!pool.length) return [];
  const start = Number(cycle) % pool.length;
  const picked = pool.slice(start).concat(pool.slice(0, start)).slice(0, SPIKE_NEIGHBOURS);
  return picked.map(popid => K.personFromProfile(profiles, popid, 'lives in ' + hood + ', where illness is up this cycle — a neighbour to quote, not a patient', hood));
}

function build(cycle, { root, beats, profiles }) {
  const demo = (beats.Neighborhood_Demographics || []).map(r => ({ hood: r.Neighborhood, sick: K.num(r.Sick),
    pop: (K.num(r.Students) || 0) + (K.num(r.Adults) || 0) + (K.num(r.Seniors) || 0), share: sickShare(r) }))
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
  // engine.254 Task 10 — the care trail, one scope per line: sick residents
  // (Neighborhood_Demographics.Sick, the demand side) → admissions → in care and
  // beds at the close, tracked and other residents apart, with the tracked names
  // off the hospital record or an explicit "none tracked".
  const trail = K.censusTrail(beats.Care_Justice_Census, cycle, 'hospital', {
    demandByHood: new Map(demo.map(r => [K.hoodKey(r.hood), r.sick])),
    namesByHood: K.careNamesByHood(beats.Hospital_Ledger, profiles)
  });
  for (const f of K.censusFacts(trail, 'hospital', 'output/beats/Care_Justice_Census.jsonl hospital @C' + cycle, 5)) facts.push(f);
  const inCare = trail.city && trail.city.complete ? trail.city.closing : null;

  // The record count and the lead name are fixed here: the neighbours below
  // are sources on a block, not rows on the hospital or cause records.
  const onRecord = people.length;
  const firstNamed = people[0] || null;

  // Hood illness spike — the top spike hood puts up to two of its tracked
  // residents on the slice as neighbours. The hood's share is the engine's own
  // number (the Sick count already rides above), so the fact is a read, not a
  // second echo.
  const spikes = spikeHoods(demo, prevDemo.rows);
  const spike = spikes[0] || null;
  const neighbours = spike ? spikeNeighbours(profiles, spike.hood, cycle, people) : [];
  if (spike) {
    const pct = v => (Math.round(v * 1000) / 10) + '%';
    facts.push({
      text: spike.hood + ': ' + spike.sick + ' sick of ' + K.fmtInt(spike.pop) + ' residents, ' + pct(spike.share) +
        (spike.overBar ? ' — at or over the 6% watch bar' : '') +
        (spike.risen ? (spike.overBar ? ', and' : ' —') + ' up from ' + pct(spike.prevShare) + ' at C' + prevDemo.vs : '') +
        (neighbours.length ? '' : '; no tracked resident of the block is free to quote'),
      src: 'output/beats/Neighborhood_Demographics.jsonl Sick/Students+Adults+Seniors @C' + cycle + (spike.risen ? ' vs prev/' : '')
    });
    for (const p of neighbours) people.push(p);
  }

  const label = lead.hood + ' carries the most sick residents (' + lead.sick + ') | ' + onRecord + ' named on the hospital and cause records';
  return K.makeSlice(SEAT, cycle, beats, {
    ref: demoSrc + ' + Hospital_Ledger.jsonl + Health_Cause_Queue.jsonl', hood: lead.hood, label,
    angle: label,
    hookLine: (firstNamed
      ? firstNamed.name + ' is one of ' + onRecord + ' residents on the record this cycle; ' + lead.hood + ' carries the most illness'
      : lead.hood + ' carries the most illness this cycle; no resident is named on the hospital or cause records') +
      (inCare != null ? '; ' + inCare + ' in hospital care citywide' + (trail.city.beds != null ? ', ' + trail.city.beds + ' beds occupied' : '') : '') +
      (spike ? '; illness is up in ' + spike.hood + (neighbours.length ? ' — ' + neighbours.map(p => p.name).join(' and ') + ' can speak for the block' : '') : '') + '.',
    facts, people,
    deltas: { state: prevDemo.state, vs: prevDemo.vs },
    hooks: K.hooksFor(beats, cycle, SEAT.name),
    note: onRecord < 5 ? 'named rows are few (' + onRecord + ') — write the neighborhood, not a ward' : null,
    extra: { byHood: demo, careTrail: trail,
      spikeHood: spike ? { hood: spike.hood, share: spike.share, prevShare: spike.prevShare, overBar: spike.overBar, risen: spike.risen,
        neighbours: neighbours.map(p => p.popid), others: spikes.slice(1).map(s => s.hood) } : null }
  });
}

const W = K.wire(SEAT);
if (require.main === module) W.main();
module.exports = { SEAT, loadSlice: W.load, buildHealthSlice: W.build, writeHealthSlice: W.write, loadHealthSlice: W.load,
  isHealthSeat: W.isSeat, assignmentFromSlice: W.assignmentFromSlice, enrichAssignment: W.enrichAssignment, slicePaths: W.paths };
