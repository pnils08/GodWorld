#!/usr/bin/env node
/**
 * buildFaithSlice.js — Elliot Graye's faith and quiet-work slice (pipeline.68 Task 4).
 *
 * Sources:
 *   Faith_Ledger (Timestamp, Cycle, Organization, FaithTradition, EventType,
 *     EventDescription, Neighborhood, Attendance, Status) — the beat itself.
 *     Phase4-FaithEvents writes up to 5 events a cycle; Graye publishes
 *     Thursdays, so the slice covers the last 7 cycles, crisis and holy-day
 *     events first.
 *   Faith_Organizations — every active congregation (tradition, hood, size, founding, leader, members on the ledger,
 *     character), and every leader as a person on his list (pipeline.111: no congregation in focus).
 *   LifeHistory_Log (source:faith) — the citizens who went to a congregation this cycle, with their own line.
 *   Community_Programs (Name, Founder_POPID, Type, Status) — the quiet work
 *     around the focus congregation.
 *   Story_Hook_Deck — hooks addressed to him by name, plus this cycle's
 *     FAITH-domain rows: the engine's deskMap has no FAITH key, so they land
 *     on "City Desk" with no journalist (engine-side fix filed with
 *     engine-sheet); the domain match is what reaches him until then.
 *
 * Artifacts: output/slices/c{N}/elliot-graye.md · output/cron-compare/faith_slice_c{N}.json
 */
'use strict';
const K = require('./beatSliceKit');

// C109 Graye (2026-10-01): "founded 1982, led by Bhai Manjit Singh" became "has tended the
// kitchen since the founding in 1982" — a leader born 1993. The slice gives the age of the
// house, not a year, and says who leads it TODAY so a tenure cannot be read off the founding.
function foundedAgo(founded) {
  const year = Number(founded);
  if (!(year > 0)) return '';
  const simYear = require('../lib/citizenDerivation').currentSimYear();
  const age = simYear - year;
  if (!(age >= 0)) return '';
  return age < 2 ? ', founded this year' : ', founded ' + age + ' years ago';
}

const SEAT = {
  slug: 'elliot-graye', name: 'Elliot Graye', popid: 'POP-00012', desk: 'culture',
  kind: 'beat-faith', domain: 'faith', artifact: 'faith', builder: 'buildFaithSlice.js',
  version: 'FAITH-SLICE-4', nameRe: /elliot\s*graye/i,
  tabs: ['Faith_Organizations', 'Faith_Ledger', 'LifeHistory_Log'],
  approach: '',
  roomIsYours: '',
  build
};

const EVENT_WINDOW = 7;   // weekly seat — the record since his last slot
const MAX_EVENTS = 20;
const PEOPLE_CAP = 30;
const EVENT_PRIORITY = { crisis_response: 0, holy_day: 1, interfaith_dialogue: 2, community_program: 3, outreach: 4, regular_service: 5 };

function parseMembers(s) {
  try { const v = JSON.parse(String(s || '[]')); return Array.isArray(v) ? v.map(x => String(x).toUpperCase()) : []; }
  catch (_) { return String(s || '').split(/[,;]/).map(t => t.trim().toUpperCase()).filter(t => /^POP-/.test(t)); }
}

function typeWords(t) { return String(t || 'event').replace(/_/g, ' '); }

function weekEvents(beats, cycle) {
  return (beats.Faith_Ledger || [])
    .filter(e => e.Organization && K.num(e.Cycle) != null && K.num(e.Cycle) > cycle - EVENT_WINDOW && K.num(e.Cycle) <= cycle)
    .sort((a, b) => {
      const pa = EVENT_PRIORITY[String(a.EventType || '')] != null ? EVENT_PRIORITY[String(a.EventType || '')] : 6;
      const pb = EVENT_PRIORITY[String(b.EventType || '')] != null ? EVENT_PRIORITY[String(b.EventType || '')] : 6;
      return pa - pb || K.num(b.Cycle) - K.num(a.Cycle);
    })
    .slice(0, MAX_EVENTS);
}

/** Name-matched hooks plus this cycle's FAITH-domain rows (misrouted to "City Desk" engine-side). */
function faithHooks(beats, cycle) {
  const named = K.hooksFor(beats, cycle, SEAT.name);
  const seen = new Set(named.map(h => h.text));
  const domain = (beats.Story_Hook_Deck || [])
    .filter(r => Number(r.Cycle) === Number(cycle) && String(r.Domain || '').toUpperCase() === 'FAITH')
    .map(r => ({
      text: String(r.HookText || '').trim(), angle: String(r.SuggestedAngle || '').trim() || null,
      domain: r.Domain || null, hood: r.Neighborhood || null, priority: K.num(r.Priority)
    }))
    .filter(h => h.text && !seen.has(h.text));
  return named.concat(domain);
}

// pipeline.111 (builder 2026-11-23: "1 - keep it 2 go 3 go"): his record is the city's faith life — the week's events and
// the last few cycles', every congregation, every leader, and the citizens who went to them. No congregation in focus,
// no angle, no hooks; community programs are his sheet tool.
function build(cycle, { beats, profiles }) {
  const orgs = (beats.Faith_Organizations || []).filter(o => o.Organization && !/inactive|closed/i.test(String(o.ActiveStatus || '')));
  const events = weekEvents(beats, cycle);
  if (!orgs.length && !events.length) return K.emptySlice(SEAT, cycle, 'nothing on the faith record this cycle');
  const facts = [];
  for (const e of events) {
    facts.push({
      text: e.Organization + (e.Neighborhood ? ' (' + e.Neighborhood + ')' : '') + ', C' + K.num(e.Cycle) + ' — ' +
        typeWords(e.EventType) + ': ' + String(e.EventDescription || '').trim() +
        (K.num(e.Attendance) != null ? ' (attendance ' + K.fmtInt(K.num(e.Attendance)) + ')' : ''),
      src: 'output/beats/Faith_Ledger.jsonl C' + K.num(e.Cycle) + ' "' + e.Organization + '"'
    });
  }
  for (const o of orgs) {
    const members = parseMembers(o.MembersList).length;
    facts.push({
      text: o.Organization + (o.FaithTradition ? ' — ' + o.FaithTradition : '') + (o.Neighborhood ? ', ' + o.Neighborhood : '') +
        (K.num(o.Congregation) != null ? ', congregation ' + K.fmtInt(K.num(o.Congregation)) : '') + foundedAgo(o.Founded) +
        (o.Leader ? ', led today by ' + o.Leader : '') + (members ? ', ' + members + ' members on the ledger' : '') + (o.Character ? ' — ' + o.Character : ''),
      src: 'output/beats/Faith_Organizations.jsonl "' + o.Organization + '"'
    });
  }
  const people = [];
  const add = (p) => { if (p && p.name && p.popid !== SEAT.popid && !K.isMediaStaff(profiles, p.popid) && !people.some(x => x.popid === p.popid) && people.length < PEOPLE_CAP) people.push(p); };
  // agy pass 2 #5.2: the first event per congregation is its highest-priority one (weekEvents is sorted); a placeholder leader id is no person.
  const eventBy = new Map();
  for (const e of events) { const k = String(e.Organization).toLowerCase(); if (!eventBy.has(k)) eventBy.set(k, e); }
  for (const o of orgs.filter(o => /^POP-\d+$/i.test(String(o.LeaderPOPID || '').trim()))) {
    const e = eventBy.get(String(o.Organization).toLowerCase());
    const why = 'leads ' + o.Organization + (e ? ' — ' + typeWords(e.EventType) + ', C' + K.num(e.Cycle) + ': ' + String(e.EventDescription || '').trim() : '');
    const popid = String(o.LeaderPOPID).toUpperCase();
    const p = K.personFromProfile(profiles, popid, why, o.Neighborhood) || K.person(popid, String(o.Leader || '').trim(), 'Faith leader', o.Neighborhood || null, why);
    if (p) p.profile = p.profile + ' — ' + why;
    add(p);
  }
  // The citizens who went to a congregation this cycle, each with their own line.
  for (const r of (beats.LifeHistory_Log || []).filter(r => String(r.Cycle) === String(cycle) && /(^|\|)source:faith(\||$)/.test(String(r.EventTag || '')))) {
    const why = 'C' + cycle + ': ' + String(r.EventText || '').trim();
    const p = K.personFromProfile(profiles, String(r.POPID || '').toUpperCase(), why, r.Neighborhood);
    if (p) { p.profile = p.profile + ' — ' + why; add(p); }
  }
  return K.makeSlice(SEAT, cycle, beats, {
    ref: 'the faith record of C' + cycle, hood: null, label: 'the faith record of C' + cycle,
    angle: 'the faith record of C' + cycle, hookLine: '',
    facts, people, peopleCap: PEOPLE_CAP, factCap: Math.max(12, facts.length),
    deltas: null, hooks: [],
    note: events.length ? null : 'no Faith_Ledger events in the last ' + EVENT_WINDOW + ' cycles',
    extra: { organizations: orgs.length, weekEvents: events.map(e => ({ cycle: K.num(e.Cycle), organization: e.Organization, type: e.EventType, hood: e.Neighborhood || null })) }
  });
}

const sitsOutWhenEmpty = true;
const W = K.wire(SEAT);
if (require.main === module) W.main();
module.exports = { SEAT, sitsOutWhenEmpty, loadSlice: W.load, buildFaithSlice: W.build, writeFaithSlice: W.write, loadFaithSlice: W.load,
  isFaithSeat: W.isSeat, assignmentFromSlice: W.assignmentFromSlice, enrichAssignment: W.enrichAssignment, slicePaths: W.paths };
