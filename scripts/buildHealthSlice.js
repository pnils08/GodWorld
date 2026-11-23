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
const path = require('path');
const K = require('./beatSliceKit');
const { loadHealthEntries } = require('./buildCivicDomainSlice');

const SEAT = {
  slug: 'lila-mezran', name: 'Dr. Lila Mezran', popid: 'POP-00154', desk: 'civic',
  kind: 'beat-health', domain: 'health', artifact: 'health', builder: 'buildHealthSlice.js',
  version: 'HEALTH-SLICE-7', nameRe: /lila\s*mezran/i,
  tabs: ['Neighborhood_Demographics', 'Hospital_Ledger', 'Health_Cause_Queue', 'Care_Justice_Census'],
  approach: '',
  roomIsYours: '',
  build
};


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
    if (/deceased|dead|hospital/i.test(String(p.Status || ''))) continue; // pipeline.73 (builder 2026-10-13): "Citizens are citizens" — an athlete on the record is on every beat; sports keeps the availability/team-effect angle.
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
  const ok = r => r.POPID && r.Name; // a manager in the hospital is the health headline (pipeline.73 (builder 2026-10-13): "Citizens are citizens" — an athlete on the record is on every beat; sports keeps the availability/team-effect angle.)
  const people = [];
  for (const r of (beats.Hospital_Ledger || []).filter(ok)) {
    const p = K.personFromProfile(profiles, r.POPID, 'on Hospital_Ledger this cycle', r.Neighborhood) ||
      K.person(r.POPID, String(r.Name).trim(), null, r.Neighborhood || null, 'on Hospital_Ledger this cycle');
    people.push(p);
    // pipeline.111 (builder 2026-11-23): the row whole — a discharge on file is said, not hidden behind the status field
    // (C117: three rows read StatusNow 'active' with DischargeCycle and Outcome 'recovered' filled; Lila printed them as in care).
    const dis = K.num(r.DischargeCycle);
    const where = p.name + (r.Neighborhood ? ' (' + r.Neighborhood + ')' : '');
    const admitted = (K.num(r.AdmitCycle) != null ? 'admitted C' + K.num(r.AdmitCycle) : 'admitted') + (r.Cause ? ' after ' + r.Cause : '');
    facts.push({
      text: dis != null && dis <= cycle
        ? where + ' — ' + admitted + '; discharged C' + dis + (r.Outcome ? ', ' + r.Outcome : '') + (K.num(r.CyclesInCare) != null ? ' after ' + K.num(r.CyclesInCare) + ' cycles in care' : '') +
          '; the ledger status still reads ' + (r.StatusNow || 'unrecorded')
        : where + ' — in hospital care, ' + (r.StatusNow || 'status unrecorded') + ', ' + admitted,
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
  // pipeline.111 (builder 2026-11-23): every hood's hospital line, not the top five — a hood the census puts at zero
  // reads as a zero from the record, never as an absence the reporter fills ("no one in KONO is going to the hospital").
  for (const f of K.censusFacts(trail, 'hospital', 'output/beats/Care_Justice_Census.jsonl hospital @C' + cycle, 30)) facts.push(f);
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
  // pipeline.111: no bystander picked to quote (builder 2026-09-30: interview the citizens a story touched, or none).
  const neighbours = [];
  if (spike) {
    const pct = v => (Math.round(v * 1000) / 10) + '%';
    facts.push({
      text: spike.hood + ': ' + spike.sick + ' sick of ' + K.fmtInt(spike.pop) + ' residents, ' + pct(spike.share) +
        (spike.overBar ? ' — at or over the 6% watch bar' : '') +
        (spike.risen ? (spike.overBar ? ', and' : ' —') + ' up from ' + pct(spike.prevShare) + ' at C' + prevDemo.vs : '') +
        '',
      src: 'output/beats/Neighborhood_Demographics.jsonl Sick/Students+Adults+Seniors @C' + cycle + (spike.risen ? ' vs prev/' : '')
    });
    for (const p of neighbours) people.push(p);
  }

  // The engine's health events this cycle (the health center, a hospital strain, a clinic) from the world summary.
  const ws = K.loadText(path.join(root, 'output', 'world_summary_c' + cycle + '.md'));
  for (const line of String(ws || '').split('\n')) {
    if (/^- [a-z][A-Za-z_\/:-]* \| /.test(line) && !/^- approval\//.test(line) && /health|clinic|hospital|illness|medical|\bEMS\b/i.test(line) && !facts.some(f => f.text === line.slice(2).trim())) {   // approval tallies are the civic beat's
      facts.push({ text: line.slice(2).trim(), src: 'output/world_summary_c' + cycle + '.md ## What Moved (Ripple_Ledger)' });
    }
  }
  // Never herself, never the paper's staff.
  for (let k = people.length - 1; k >= 0; k--) if (people[k].popid === SEAT.popid || K.isMediaStaff(profiles, people[k].popid)) people.splice(k, 1);
  const label = 'the health record of C' + cycle;   // pipeline.111: no code-picked hood
  return K.makeSlice(SEAT, cycle, beats, {
    ref: demoSrc + ' + Hospital_Ledger.jsonl + Health_Cause_Queue.jsonl', hood: null, label,
    angle: label, hookLine: '',
    facts, people,
    deltas: { state: prevDemo.state, vs: prevDemo.vs },
    hooks: [],
    note: null,
    extra: { byHood: demo, careTrail: trail,
      spikeHood: spike ? { hood: spike.hood, share: spike.share, prevShare: spike.prevShare, overBar: spike.overBar, risen: spike.risen,
        neighbours: neighbours.map(p => p.popid), others: spikes.slice(1).map(s => s.hood) } : null }
  });
}

const W = K.wire(SEAT);
if (require.main === module) W.main();
const sitsOutWhenEmpty = true;
module.exports = { SEAT, sitsOutWhenEmpty, loadSlice: W.load, buildHealthSlice: W.build, writeHealthSlice: W.write, loadHealthSlice: W.load,
  isHealthSeat: W.isSeat, assignmentFromSlice: W.assignmentFromSlice, enrichAssignment: W.enrichAssignment, slicePaths: W.paths,
  sickShare, SPIKE_WATCH, SPIKE_RISE }; // research.32 — the Discord lookups read the same bar, not a copy
