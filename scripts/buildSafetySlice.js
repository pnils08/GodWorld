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
  version: 'SAFETY-SLICE-5', nameRe: /rachel\s*torres/i,
  tabs: ['Crime_Metrics', 'Employment_Roster', 'Business_Ledger', 'Story_Hook_Deck', 'Judicial_Ledger', 'City_Treasury', 'Care_Justice_Census', 'LifeHistory_Log'],
  approach: '',
  roomIsYours: '',
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
  // pipeline.111 (builder 2026-11-23: "looks good"): every hood's row, in name order — no lead hood or slowest hood picked.
  const facts = [{ text: K.fmtInt(total) + ' incidents across ' + rows.length + ' neighborhoods this cycle', src }];
  for (const r of rows.slice().sort((a, b) => String(a.hood).localeCompare(String(b.hood)))) facts.push({ text: fmt(r), src });
  // engine.235: what the engine itself flagged — hotspots against the city's own middle, and which
  // hoods moved this cycle. The engine computed these every cycle and kept them in memory until now.
  const hot = rows.filter(r => r.hotspot != null).sort((a, b) => b.hotspot - a.hotspot);
  if (hot.length) facts.push({ text: 'Hotspots this cycle (over the city\'s own bar): ' + hot.map(r => r.hood + (r.pressure != null ? ' (' + r.pressure + '× the city median)' : '')).join(', '), src });
  const rising = rows.filter(r => r.trend === 'rising').map(r => r.hood), easing = rows.filter(r => r.trend === 'falling').map(r => r.hood);
  if (rising.length || easing.length) facts.push({ text: 'Moved this cycle — rising: ' + (rising.join(', ') || 'none') + '; easing: ' + (easing.join(', ') || 'none'), src });
  // The department's leadership, not every name on its roster (pipeline.111).
  const LEAD_ROLE = /chief|deputy|captain|lieutenant|commander|internal affairs|director|program lead|\blead\b/i;
  const people = K.rosterAtSectors(beats, /\bpublic safety\b|crisis response/i)
    .filter(w => LEAD_ROLE.test(String(w.role || ''))).slice(0, 10)
    .map(w => K.person(w.popid, w.name, w.role, null, 'works at ' + w.business + ' (Employment_Roster)', w.business));

  // engine.254 Task 10 — the court: cases that moved this cycle or still hold
  // someone, with the fine the court took. The defendants are people on the
  // record; a GAME-clock citizen's case is counted, never named (the sports desks').
  const courtSrc = 'output/beats/Judicial_Ledger.jsonl @C' + cycle;
  const court = K.courtCases(beats.Judicial_Ledger, beats.City_Treasury, cycle, profiles, courtSrc);
  for (const c of court.cases.slice(0, 20)) {
    facts.push({ text: 'COURT: ' + c.text, src: c.src });
    if (!people.some(p => p.popid === c.popid)) {
      people.push(K.personFromProfile(profiles, c.popid, c.inCustody ? 'in custody on the court record' : 'on the court record this cycle', c.hood) ||
        K.person(c.popid, c.name, null, c.hood, c.inCustody ? 'in custody on the court record' : 'on the court record this cycle'));
    }
  }
  const fineFacts = K.receiptHookFacts(beats.Story_Hook_Deck, cycle, /^COURT_FINE$/, 'output/beats/Story_Hook_Deck.jsonl');
  for (const f of fineFacts) if (!court.cases.some(c => f.text.startsWith(c.name))) facts.push({ text: 'COURT: ' + f.text, src: f.src });

  // The custody trail, one scope per line: charges (Crime_Metrics IncidentCount,
  // what the engine counts as charges) → arrests → in custody at the close, with
  // the tracked names from the court record or an explicit "none tracked".
  const demandByHood = new Map(rows.map(r => [K.hoodKey(r.hood), r.incidents]));
  const trail = K.censusTrail(beats.Care_Justice_Census, cycle, 'judicial', { demandByHood, namesByHood: K.custodyNamesByHood(beats.Judicial_Ledger, profiles) });
  for (const f of K.censusFacts(trail, 'judicial', 'output/beats/Care_Justice_Census.jsonl judicial @C' + cycle, 30)) facts.push(f);   // every hood (pipeline.111)

  // The chaos events that touched policing and response (patrol-car tickets, OARI calls, crises), from the world summary.
  const summary = K.loadText(path.join(root, 'output', 'world_summary_c' + cycle + '.md'));
  const chaosSec = K.extractSection(summary, 'Chaos Events');
  for (const line of String(chaosSec || '').split('\n')) {
    if (/^- /.test(line) && /cop_car|police|patrol|oari|ticket|arrest|crisis|fire|ems|ambulance/i.test(line)) facts.push({ text: line.slice(2).trim(), src: 'output/world_summary_c' + cycle + '.md ## Chaos Events' });
  }
  for (const line of String(summary || '').split('\n')) {
    if (/^- (deescalated|escalated|incident|crime|chaos)[^|]* \| /i.test(line)) facts.push({ text: line.slice(2).trim(), src: 'output/world_summary_c' + cycle + '.md ## What Moved › chaos-event (Ripple_Ledger)' });
  }
  // Residents whose own line this cycle is about safety, each with the line.
  const SAFETY_LINE = /\b(OARI|police|officer|patrol|arrest|arrested|crime|theft|stolen|break-in|burglar|robbed|cop car|siren|ticket|court|custody|safer|unsafe|de-escalate)\b/i;
  let lived = 0;
  for (const r of (beats.LifeHistory_Log || []).filter(r => String(r.Cycle) === String(cycle) && SAFETY_LINE.test(String(r.EventText || '')))) {
    if (lived >= 12) break;
    const popid = String(r.POPID || '').toUpperCase();
    if (people.some(p => p.popid === popid)) continue;
    const why = 'C' + cycle + (r.Neighborhood ? ' in ' + r.Neighborhood : '') + ': ' + String(r.EventText).trim();
    const p = K.personFromProfile(profiles, popid, why, r.Neighborhood);
    if (p) { p.profile = p.profile + ' — ' + why; people.push(p); lived++; }
  }
  // Never herself or the paper's staff; every person carries the row's age (her craft names officers by age — the row's, never a guess).
  const { simYearFromCycle } = require('../lib/citizenDerivation');
  for (let k = people.length - 1; k >= 0; k--) {
    const p = people[k];
    if (!p || p.popid === SEAT.popid || K.isMediaStaff(profiles, p.popid)) { people.splice(k, 1); continue; }
    const by = K.num((profiles.get(String(p.popid).toUpperCase()) || {}).BirthYear);
    if (by && !/ — age \d+/.test(p.profile)) { p.age = simYearFromCycle(cycle) - by; p.profile = p.profile.replace(/\s+$/, '') + ' — age ' + p.age; }
  }
  const label = 'the public safety record of C' + cycle;   // pipeline.111: no lead hood
  return K.makeSlice(SEAT, cycle, beats, {
    ref: src, hood: null, label,
    angle: label, hookLine: '',
    facts, people,
    deltas: { state: prev.state, vs: prev.vs },
    hooks: [],
    note: null,
    extra: { table: rows, court: { state: court.cases.length ? 'ON_RECORD' : 'NO_CASES', cases: court.cases }, custodyTrail: trail }
  });
}

const W = K.wire(SEAT);
if (require.main === module) W.main();
const sitsOutWhenEmpty = true;
module.exports = { SEAT, sitsOutWhenEmpty, loadSlice: W.load, buildSafetySlice: W.build, writeSafetySlice: W.write, loadSafetySlice: W.load,
  isSafetySeat: W.isSeat, assignmentFromSlice: W.assignmentFromSlice, enrichAssignment: W.enrichAssignment, slicePaths: W.paths, paths: W.paths };
