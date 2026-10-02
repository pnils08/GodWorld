#!/usr/bin/env node
/**
 * buildSafetySlice.js — Sgt. Rachel Torres's public-safety slice (pipeline.68 Task 4;
 * replaces the desk-signal-only build). Source: Crime_Metrics per neighborhood
 * (PropertyCrimeIndex, ViolentCrimeIndex, ResponseTimeAvg, ClearanceRate,
 * IncidentCount) with deltas vs output/beats/prev/ when it exists; public-safety
 * staff from the roster (Public Safety / Crisis Response BIZ_IDs); the desk
 * signal's incident rows as pointers only; Story_Hook_Deck hooks.
 * engine.254 Task 10: the court (Judicial_Ledger joined to the fines on
 * City_Treasury) and the custody trail (Care_Justice_Census, judicial system:
 * charges → arrests → in custody, per hood, tracked names or "none tracked").
 * Artifacts: output/slices/c{N}/rachel-torres.md · output/cron-compare/safety_slice_c{N}.json
 */
'use strict';
const path = require('path');
const K = require('./beatSliceKit');

const SEAT = {
  slug: 'rachel-torres', name: 'Sgt. Rachel Torres', popid: 'POP-00057', desk: 'civic',
  kind: 'beat-safety', domain: 'public-safety', artifact: 'safety', builder: 'buildSafetySlice.js',
  version: 'SAFETY-SLICE-3', nameRe: /rachel\s*torres/i,
  tabs: ['Crime_Metrics', 'Employment_Roster', 'Business_Ledger', 'Story_Hook_Deck', 'Judicial_Ledger', 'City_Treasury', 'Care_Justice_Census'],
  approach: 'Public-safety approach: this slice is the crime table for every neighborhood — incidents, response time, clearance — the public-safety staff on the roster, the court record (who was charged, what the court did, what it cost them) and the custody trail from charges to arrests to who is held, hood by hood. Measured, third person, incident structure and classification gaps. The numbers, the officials and the defendants are real; the block, the call, the aftermath are yours.',
  roomIsYours: 'the corner after the call, the dispatcher\'s pause, who was on the porch, what the neighborhood watch captain saw first',
  build
};

function build(cycle, { root, beats, profiles }) {
  const rows = (beats.Crime_Metrics || []).map(r => ({
    hood: r.Neighborhood, property: K.num(r.PropertyCrimeIndex), violent: K.num(r.ViolentCrimeIndex), response: K.num(r.ResponseTimeAvg),
    clearance: K.num(r.ClearanceRate), incidents: K.num(r.IncidentCount),
    // engine.235: the engine's own read of the hood (Crime_Metrics K–M; blank before the first fire that arms them)
    trend: String(r.Trend || '').trim() || null, hotspot: K.num(r.Hotspot), pressure: K.num(r.PressureRatio)
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
  // engine.235: what the engine itself flagged — hotspots against the city's own middle, and which
  // hoods moved this cycle. The engine computed these every cycle and kept them in memory until now.
  const hot = rows.filter(r => r.hotspot != null).sort((a, b) => b.hotspot - a.hotspot);
  if (hot.length) facts.push({ text: 'Engine hotspots this cycle (over the city\'s own bar): ' + hot.map(r => r.hood + (r.pressure != null ? ' (' + r.pressure + '× the city median)' : '')).join(', '), src });
  const rising = rows.filter(r => r.trend === 'rising').map(r => r.hood), easing = rows.filter(r => r.trend === 'falling').map(r => r.hood);
  if (rising.length || easing.length) facts.push({ text: 'Moved this cycle — rising: ' + (rising.join(', ') || 'none') + '; easing: ' + (easing.join(', ') || 'none'), src });
  const people = K.rosterAtSectors(beats, /\bpublic safety\b|crisis response/i)
    .map(w => K.person(w.popid, w.name, w.role, null, 'works at ' + w.business + ' (Employment_Roster)', w.business));

  // engine.254 Task 10 — the court: cases that moved this cycle or still hold
  // someone, with the fine the court took. The defendants are people on the
  // record; a GAME-clock citizen's case is counted, never named (the sports desks').
  const courtSrc = 'output/beats/Judicial_Ledger.jsonl @C' + cycle;
  const court = K.courtCases(beats.Judicial_Ledger, beats.City_Treasury, cycle, profiles, courtSrc);
  for (const c of court.cases.slice(0, 8)) {
    facts.push({ text: 'COURT: ' + c.text, src: c.src });
    if (!people.some(p => p.popid === c.popid)) {
      people.push(K.personFromProfile(profiles, c.popid, c.inCustody ? 'in custody on the court record' : 'on the court record this cycle', c.hood) ||
        K.person(c.popid, c.name, null, c.hood, c.inCustody ? 'in custody on the court record' : 'on the court record this cycle'));
    }
  }
  if (court.sportsCases) facts.push({ text: 'COURT: ' + court.sportsCases + ' further case' + (court.sportsCases === 1 ? '' : 's') + ' on the record belong' + (court.sportsCases === 1 ? 's' : '') + ' to the sports desks', src: courtSrc });
  const fineFacts = K.receiptHookFacts(beats.Story_Hook_Deck, cycle, /^COURT_FINE$/, 'output/beats/Story_Hook_Deck.jsonl');
  for (const f of fineFacts) if (!court.cases.some(c => f.text.startsWith(c.name))) facts.push({ text: 'COURT: ' + f.text, src: f.src });

  // The custody trail, one scope per line: charges (Crime_Metrics IncidentCount,
  // what the engine counts as charges) → arrests → in custody at the close, with
  // the tracked names from the court record or an explicit "none tracked".
  const demandByHood = new Map(rows.map(r => [K.hoodKey(r.hood), r.incidents]));
  const trail = K.censusTrail(beats.Care_Justice_Census, cycle, 'judicial', { demandByHood, namesByHood: K.custodyNamesByHood(beats.Judicial_Ledger, profiles) });
  for (const f of K.censusFacts(trail, 'judicial', 'output/beats/Care_Justice_Census.jsonl judicial @C' + cycle, 5)) facts.push(f);

  // Desk-signal incident rows are pointers, not the source (optional file).
  const signal = K.loadJson(path.join(root, 'output', 'desk_signal_c' + cycle + '.json'));
  const pointers = ((signal && signal.lanes && signal.lanes.civic) || [])
    .filter(row => /crime|safety|police|oari|incident|classification|response/i.test(JSON.stringify(row)))
    .map(row => ({ label: String(row.label || (row.handle && row.handle.angle) || '').slice(0, 160), ref: row.ref || null, hood: row.hood || null }))
    .slice(0, 5);
  const label = lead.hood + ' logged the most incidents (' + lead.incidents + ') | ' + rows.length + ' neighborhoods on the table';
  const custody = trail.city && trail.city.complete ? trail.city.closing : null;
  return K.makeSlice(SEAT, cycle, beats, {
    ref: src, hood: lead.hood, label,
    angle: label + ' — what the table says and who answers for it',
    hookLine: lead.hood + ' leads the incident count' + (slowest !== lead ? '; ' + slowest.hood + ' waits longest for a response' : '') +
      (court.cases.length ? '; ' + court.cases.length + ' case' + (court.cases.length === 1 ? '' : 's') + ' on the court record' : '') +
      (custody != null ? '; ' + custody + ' in custody citywide' : '') + '; ' + K.rosterAtSectors(beats, /\bpublic safety\b|crisis response/i).length + ' public-safety staff on the roster.',
    facts, people,
    deltas: { state: prev.state, vs: prev.vs },
    hooks: K.domainHooks(beats, cycle, SEAT.name, /^(COURT_FINE|CITIZEN_ARRESTED|SAFETY)$/),
    note: pointers.length ? 'desk-signal incident rows attached as pointers (' + pointers.length + ')' : null,
    extra: { table: rows, signalPointers: pointers, court: { state: court.cases.length || court.sportsCases ? 'ON_RECORD' : 'NO_CASES', cases: court.cases, sportsCases: court.sportsCases }, custodyTrail: trail }
  });
}

const W = K.wire(SEAT);
if (require.main === module) W.main();
module.exports = { SEAT, loadSlice: W.load, buildSafetySlice: W.build, writeSafetySlice: W.write, loadSafetySlice: W.load,
  isSafetySeat: W.isSeat, assignmentFromSlice: W.assignmentFromSlice, enrichAssignment: W.enrichAssignment, slicePaths: W.paths, paths: W.paths };
