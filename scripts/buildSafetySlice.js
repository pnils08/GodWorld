#!/usr/bin/env node
/**
 * buildSafetySlice.js — Sgt. Rachel Torres's public-safety slice (pipeline.68 Task 4;
 * replaces the desk-signal-only build). Source: Crime_Metrics per neighborhood
 * (PropertyCrimeIndex, ViolentCrimeIndex, ResponseTimeAvg, ClearanceRate,
 * IncidentCount) with deltas vs output/beats/prev/ when it exists; public-safety
 * staff from the roster (Public Safety / Crisis Response BIZ_IDs); the desk
 * signal's incident rows as pointers only; Story_Hook_Deck hooks.
 * Artifacts: output/slices/c{N}/rachel-torres.md · output/cron-compare/safety_slice_c{N}.json
 */
'use strict';
const path = require('path');
const K = require('./beatSliceKit');

const SEAT = {
  slug: 'rachel-torres', name: 'Sgt. Rachel Torres', popid: 'POP-00057', desk: 'civic',
  kind: 'beat-safety', domain: 'public-safety', artifact: 'safety', builder: 'buildSafetySlice.js',
  version: 'SAFETY-SLICE-2', nameRe: /rachel\s*torres/i,
  tabs: ['Crime_Metrics', 'Employment_Roster', 'Business_Ledger', 'Story_Hook_Deck'],
  approach: 'Public-safety approach: this slice is the crime table for every neighborhood — incidents, response time, clearance — and the public-safety staff on the roster. Measured, third person, incident structure and classification gaps. The numbers and the officials are real; the block, the call, the aftermath are yours.',
  roomIsYours: 'the corner after the call, the dispatcher\'s pause, who was on the porch, what the neighborhood watch captain saw first',
  build
};

function build(cycle, { root, beats }) {
  const rows = (beats.Crime_Metrics || []).map(r => ({
    hood: r.Neighborhood, property: K.num(r.PropertyCrimeIndex), violent: K.num(r.ViolentCrimeIndex), response: K.num(r.ResponseTimeAvg),
    clearance: K.num(r.ClearanceRate), incidents: K.num(r.IncidentCount)
  })).filter(r => r.hood && r.incidents != null)
    .sort((a, b) => b.incidents - a.incidents || (b.violent || 0) - (a.violent || 0) || String(a.hood).localeCompare(String(b.hood)));
  if (!rows.length) return K.emptySlice(SEAT, cycle, 'no Crime_Metrics rows');
  const prev = K.prevTabRows(root, 'Crime_Metrics');
  const prevBy = new Map(prev.rows.map(r => [K.hoodKey(r.Neighborhood), { incidents: K.num(r.IncidentCount), response: K.num(r.ResponseTimeAvg) }]));
  const src = 'output/beats/Crime_Metrics.jsonl @C' + cycle;
  const total = rows.reduce((a, r) => a + r.incidents, 0);
  const lead = rows[0];
  const slowest = rows.slice().sort((a, b) => (b.response || 0) - (a.response || 0))[0];
  const fmt = r => {
    const pv = prevBy.get(K.hoodKey(r.hood));
    return r.hood + ': ' + r.incidents + ' incidents' + (pv && pv.incidents != null ? ' (' + (r.incidents - pv.incidents >= 0 ? '+' : '') + (r.incidents - pv.incidents) + ' vs C' + prev.vs + ')' : '') +
      (r.response != null ? ', response ' + r.response + ' min' : '') + (r.clearance != null ? ', clearance ' + Math.round(r.clearance * 100) + '%' : '') +
      (r.property != null ? ', property index ' + r.property : '') + (r.violent != null ? ', violent index ' + r.violent : '');
  };
  const facts = [{ text: K.fmtInt(total) + ' incidents across ' + rows.length + ' neighborhoods; most in ' + rows.slice(0, 5).map(r => r.hood + ' ' + r.incidents).join(', ') + '; fewest in ' + rows.slice(-3).map(r => r.hood + ' ' + r.incidents).join(', '), src }];
  facts.push({ text: fmt(lead), src });
  if (slowest !== lead) facts.push({ text: 'Slowest response: ' + fmt(slowest), src });
  const people = K.rosterAtSectors(beats, /\bpublic safety\b|crisis response/i)
    .map(w => K.person(w.popid, w.name, w.role, null, 'works at ' + w.business + ' (Employment_Roster)', w.business));
  // Desk-signal incident rows are pointers, not the source (optional file).
  const signal = K.loadJson(path.join(root, 'output', 'desk_signal_c' + cycle + '.json'));
  const pointers = ((signal && signal.lanes && signal.lanes.civic) || [])
    .filter(row => /crime|safety|police|oari|incident|classification|response/i.test(JSON.stringify(row)))
    .map(row => ({ label: String(row.label || (row.handle && row.handle.angle) || '').slice(0, 160), ref: row.ref || null, hood: row.hood || null }))
    .slice(0, 5);
  const label = lead.hood + ' logged the most incidents (' + lead.incidents + ') | ' + rows.length + ' neighborhoods on the table';
  return K.makeSlice(SEAT, cycle, beats, {
    ref: src, hood: lead.hood, label,
    angle: label + ' — what the table says and who answers for it',
    hookLine: lead.hood + ' leads the incident count' + (slowest !== lead ? '; ' + slowest.hood + ' waits longest for a response' : '') + '; ' + people.length + ' public-safety staff on the roster.',
    facts, people,
    deltas: { state: prev.state, vs: prev.vs },
    hooks: K.hooksFor(beats, cycle, SEAT.name),
    note: pointers.length ? 'desk-signal incident rows attached as pointers (' + pointers.length + ')' : null,
    extra: { table: rows, signalPointers: pointers }
  });
}

const W = K.wire(SEAT);
if (require.main === module) W.main();
module.exports = { SEAT, loadSlice: W.load, buildSafetySlice: W.build, writeSafetySlice: W.write, loadSafetySlice: W.load,
  isSafetySeat: W.isSeat, assignmentFromSlice: W.assignmentFromSlice, enrichAssignment: W.enrichAssignment, slicePaths: W.paths, paths: W.paths };
