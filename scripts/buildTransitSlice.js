#!/usr/bin/env node
/**
 * buildTransitSlice.js — Trevor Shimizu's transit slice (pipeline.68 Task 4).
 * Source: output/beats/Transit_Metrics.jsonl (this cycle vs the prior cycle in
 * the same table — 8 BART stations + 10 traffic corridors per cycle), transit
 * workers from the roster
 * (Public Transit / Transit & Infrastructure BIZ_IDs), Story_Hook_Deck hooks.
 * Artifacts: output/slices/c{N}/trevor-shimizu.md · output/cron-compare/transit_slice_c{N}.json
 */
'use strict';
const K = require('./beatSliceKit');

const SEAT = {
  slug: 'trevor-shimizu', name: 'Trevor Shimizu', popid: 'POP-00155', desk: 'civic',
  kind: 'beat-transit', domain: 'transit', artifact: 'transit', builder: 'buildTransitSlice.js',
  version: 'TRANSIT-SLICE-1', nameRe: /trevor\s*shimizu/i,
  tabs: ['Transit_Metrics', 'Employment_Roster', 'Business_Ledger', 'Story_Hook_Deck'],
  approach: 'Transit approach: this slice is every station on the record this cycle, what moved against last cycle, and the transit workers on the roster. Dry, technical, timestamp and pattern — but it is a place with people in it. One system, one claim about what changed.',
  roomIsYours: 'the platform at 7:40, the operator\'s cab, who is late and why, what the fare gate sounds like, what a regular rider notices first',
  build
};

function build(cycle, { beats }) {
  const all = beats.Transit_Metrics || [];
  const rows = all.filter(r => Number(r.Cycle) === cycle);
  if (!rows.length) return K.emptySlice(SEAT, cycle, 'no Transit_Metrics rows for C' + cycle);
  const prev = all.filter(r => Number(r.Cycle) === cycle - 1);
  // Composite key: corridor rows carry no Station and used to collide under
  // the empty string — every corridor delta read off one shared prev entry.
  // Stations key by station name, corridors by corridor name.
  const keyOf = r => ((r.Station || '') !== '' ? 'S:' + r.Station : 'C:' + (r.Corridor || ''));
  const prevBy = new Map(prev.map(r => [keyOf(r), r]));
  const src = 'output/beats/Transit_Metrics.jsonl Cycle ' + cycle;
  const isStation = r => (r.Station || '') !== '';
  // Cause: the engine's Factors column (post-causal-frame cycles) names why a
  // row moved; older rows fall back to the Notes texture column.
  const causeOf = r => r.Factors || r.Notes || null;
  const stations = rows.filter(isStation).map(r => {
    const p = prevBy.get(keyOf(r));
    const rid = K.num(r.RidershipVolume), otp = K.num(r.OnTimePerformance);
    const pr = p ? K.num(p.RidershipVolume) : null, po = p ? K.num(p.OnTimePerformance) : null;
    return {
      station: r.Station, ridership: rid, onTime: otp, corridor: r.Corridor || null, cause: causeOf(r),
      dRidership: rid != null && pr != null ? rid - pr : null,
      dOnTime: otp != null && po != null ? Math.round((otp - po) * 100) : null
    };
  });
  const corridors = rows.filter(r => !isStation(r)).map(r => {
    const p = prevBy.get(keyOf(r));
    const tix = K.num(r.TrafficIndex);
    const pt = p ? K.num(p.TrafficIndex) : null;
    return {
      corridor: r.Corridor, traffic: tix, cause: causeOf(r),
      dTraffic: tix != null && pt != null ? tix - pt : null
    };
  });
  const movers = stations.filter(s => s.dRidership != null).sort((a, b) => Math.abs(b.dRidership) - Math.abs(a.dRidership));
  const lead = movers[0] || stations.slice().sort((a, b) => (b.ridership || 0) - (a.ridership || 0))[0];
  const total = stations.reduce((a, s) => a + (s.ridership || 0), 0);
  const prevTotal = prev.filter(isStation).reduce((a, r) => a + (K.num(r.RidershipVolume) || 0), 0);
  const inventory = stations.length + ' stations' + (corridors.length ? ' + ' + corridors.length + ' corridors' : '');
  const facts = [{
    text: inventory + ' on the record this cycle; total ridership ' + K.fmtInt(total) +
      (prev.length ? ' (C' + (cycle - 1) + ': ' + K.fmtInt(prevTotal) + ')' : ' (no prior cycle in the table)'),
    src
  }];
  for (const st of (movers.length ? movers : stations)) {
    facts.push({
      text: st.station + ': ridership ' + K.fmtInt(st.ridership) +
        (st.dRidership != null ? ' (' + (st.dRidership >= 0 ? '+' : '') + K.fmtInt(st.dRidership) + ' vs C' + (cycle - 1) + ')' : '') +
        (st.onTime != null ? ', on-time ' + Math.round(st.onTime * 100) + '%' : '') +
        (st.dOnTime ? ' (' + (st.dOnTime > 0 ? '+' : '') + st.dOnTime + ' pts)' : '') +
        (st.corridor ? ', ' + st.corridor : '') + (st.cause ? ' — ' + st.cause : ''),
      src
    });
  }
  for (const co of corridors) {
    facts.push({
      text: co.corridor + ': traffic index ' + K.fmtInt(co.traffic) +
        (co.dTraffic != null ? ' (' + (co.dTraffic >= 0 ? '+' : '') + K.fmtInt(co.dTraffic) + ' vs C' + (cycle - 1) + ')' : '') +
        (co.cause ? ' — ' + co.cause : ''),
      src
    });
  }
  const people = K.rosterAtSectors(beats, /\bpublic transit\b|\btransit & infrastructure\b/i)
    .map(w => K.person(w.popid, w.name, w.role, null, 'works at ' + w.business + ' (Employment_Roster)', w.business));
  const dir = lead.dRidership == null ? null : (lead.dRidership >= 0 ? 'up' : 'down');
  const label = lead.station + (dir ? ' ridership ' + dir + ' ' + K.fmtInt(Math.abs(lead.dRidership)) + ' vs C' + (cycle - 1)
    : ' ridership ' + K.fmtInt(lead.ridership)) + ' | ' + inventory + ' on the record';
  return K.makeSlice(SEAT, cycle, beats, {
    ref: src, hood: null, label,
    angle: label + ' — the platforms and the people who run them',
    hookLine: lead.station + (dir ? ' moved ' + dir + ' the most' : ' carried the most riders') + ' this cycle' +
      (lead.cause ? ' — ' + lead.cause : '') + '; ' + people.length + ' transit workers on the roster.',
    facts, people,
    deltas: { state: prev.length ? 'PRIOR_CYCLE_IN_TABLE' : 'NO_PRIOR_CYCLE', vs: prev.length ? cycle - 1 : null },
    hooks: K.hooksFor(beats, cycle, SEAT.name),
    note: people.length ? null : 'no transit workers on the roster this cycle',
    extra: { stations, corridors }
  });
}

const W = K.wire(SEAT);
if (require.main === module) W.main();
module.exports = { SEAT, loadSlice: W.load, buildTransitSlice: W.build, writeTransitSlice: W.write, loadTransitSlice: W.load,
  isTransitSeat: W.isSeat, assignmentFromSlice: W.assignmentFromSlice, enrichAssignment: W.enrichAssignment, slicePaths: W.paths };
