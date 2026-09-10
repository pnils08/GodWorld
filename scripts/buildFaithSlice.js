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
 *   Faith_Organizations (Organization, FaithTradition, Neighborhood,
 *     Congregation, Leader, LeaderPOPID, MembersList) — one congregation in
 *     focus each cycle, rotating through the active list by cycle number; its
 *     leader and members are on the record, and so are the leaders of any
 *     congregation that had an event this week.
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

const SEAT = {
  slug: 'elliot-graye', name: 'Elliot Graye', popid: 'POP-00012', desk: 'culture',
  kind: 'beat-faith', domain: 'faith', artifact: 'faith', builder: 'buildFaithSlice.js',
  version: 'FAITH-SLICE-2', nameRe: /elliot\s*graye/i,
  tabs: ['Faith_Organizations', 'Community_Programs', 'Faith_Ledger', 'Story_Hook_Deck'],
  approach: 'Faith and quiet-work approach: this slice is the week\'s faith events on the record — services, holy days, outreach, crisis response, with the congregations and neighborhoods named — plus one congregation in focus and the community programs around it. Dignity, not doctrine wars. The events, institutions and people are real; the sanctuary on a weeknight, the basement kitchen, the Tuesday meeting are yours.',
  roomIsYours: 'the sanctuary on a weeknight, the folding chairs, who sets up and who stays late, what the leader says when the room is half empty',
  build
};

const EVENT_WINDOW = 7;   // weekly seat — the record since his last slot
const MAX_EVENTS = 8;
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

function build(cycle, { beats, profiles }) {
  const orgs = (beats.Faith_Organizations || []).filter(o => o.Organization && !/inactive|closed/i.test(String(o.ActiveStatus || '')));
  if (!orgs.length) return K.emptySlice(SEAT, cycle, 'no active Faith_Organizations rows');
  const lead = orgs[cycle % orgs.length];
  const events = weekEvents(beats, cycle);
  const src = 'output/beats/Faith_Organizations.jsonl "' + lead.Organization + '"';
  const facts = [];
  for (const e of events) {
    facts.push({
      text: e.Organization + (e.Neighborhood ? ' (' + e.Neighborhood + ')' : '') + ', C' + K.num(e.Cycle) + ' — ' +
        typeWords(e.EventType) + ': ' + String(e.EventDescription || '').trim() +
        (K.num(e.Attendance) != null ? ' (attendance ' + K.fmtInt(K.num(e.Attendance)) + ')' : ''),
      src: 'output/beats/Faith_Ledger.jsonl C' + K.num(e.Cycle) + ' "' + e.Organization + '"'
    });
  }
  facts.push({
    text: 'In focus: ' + lead.Organization + (lead.FaithTradition ? ' — ' + lead.FaithTradition : '') + (lead.Neighborhood ? ', ' + lead.Neighborhood : '') +
      (K.num(lead.Congregation) != null ? ', congregation ' + K.fmtInt(K.num(lead.Congregation)) : '') + (lead.Founded ? ', founded ' + lead.Founded : '') +
      (lead.Leader ? ', led by ' + lead.Leader : '') + (lead.Character ? ' — ' + lead.Character : ''),
    src
  });
  const people = [];
  if (lead.LeaderPOPID) {
    const p = K.personFromProfile(profiles, lead.LeaderPOPID, 'leads ' + lead.Organization + ' (Faith_Organizations)', lead.Neighborhood) ||
      K.person(String(lead.LeaderPOPID).toUpperCase(), String(lead.Leader || '').trim(), 'Faith leader', lead.Neighborhood || null, 'leads ' + lead.Organization + ' (Faith_Organizations)');
    if (p.name) people.push(p);
  }
  for (const popid of parseMembers(lead.MembersList)) {
    if (people.some(p => p.popid === popid)) continue;
    const p = K.personFromProfile(profiles, popid, 'member of ' + lead.Organization + ' (Faith_Organizations.MembersList)', lead.Neighborhood);
    if (p) people.push(p);
  }
  // The leaders of congregations that had an event this week are on the record too.
  const orgByName = new Map(orgs.map(o => [String(o.Organization).toLowerCase(), o]));
  for (const e of events) {
    const org = orgByName.get(String(e.Organization).toLowerCase());
    if (!org || !org.LeaderPOPID) continue;
    const popid = String(org.LeaderPOPID).toUpperCase();
    if (people.some(p => p.popid === popid)) continue;
    const p = K.personFromProfile(profiles, popid, 'leads ' + org.Organization + ' — ' + typeWords(e.EventType) + ' this week (Faith_Ledger)', org.Neighborhood) ||
      K.person(popid, String(org.Leader || '').trim(), 'Faith leader', org.Neighborhood || null, 'leads ' + org.Organization + ' (Faith_Organizations)');
    if (p.name) people.push(p);
  }
  const programs = (beats.Community_Programs || []).filter(pr => /active/i.test(String(pr.Status || '')) &&
    (K.hoodKey(pr.Neighborhood) === K.hoodKey(lead.Neighborhood)));
  for (const pr of programs.slice(0, 5)) {
    const founder = pr.Founder_POPID ? K.personFromProfile(profiles, pr.Founder_POPID, 'founded ' + pr.Name + ' (Community_Programs)', pr.Neighborhood) : null;
    facts.push({
      text: pr.Name + (pr.Type ? ' (' + pr.Type + ')' : '') + (pr.Neighborhood ? ', ' + pr.Neighborhood : '') + (founder ? ', founded by ' + founder.name : '') +
        (pr.Founded_Cycle ? ', since C' + pr.Founded_Cycle : ''),
      src: 'output/beats/Community_Programs.jsonl ' + (pr.Program_ID || pr.Name)
    });
    if (founder && !people.some(p => p.popid === founder.popid)) people.push(founder);
  }
  const others = orgs.filter(o => o !== lead && K.hoodKey(o.Neighborhood) === K.hoodKey(lead.Neighborhood));
  if (others.length) {
    facts.push({ text: 'Also in ' + lead.Neighborhood + ': ' + others.map(o => o.Organization + (o.FaithTradition ? ' (' + o.FaithTradition + ')' : '')).join('; '), src: 'output/beats/Faith_Organizations.jsonl' });
  }
  const weekLine = events.length
    ? events.length + ' faith event' + (events.length === 1 ? '' : 's') + ' on the record since C' + (cycle - EVENT_WINDOW + 1)
    : null;
  const label = (weekLine ? weekLine + ' · ' : '') + lead.Organization + (lead.Neighborhood ? ' in ' + lead.Neighborhood : '') + ' | ' + people.length + ' named on the record';
  const top = events[0] || null;
  return K.makeSlice(SEAT, cycle, beats, {
    ref: src, hood: lead.Neighborhood || null, label,
    angle: top
      ? typeWords(top.EventType) + ' at ' + top.Organization + (top.Neighborhood ? ' (' + top.Neighborhood + ')' : '') + ' — the week in faith, and ' + lead.Organization + ' in focus'
      : label + ' — the congregation and the quiet work around it',
    hookLine: top
      ? top.Organization + (top.Neighborhood ? ' (' + top.Neighborhood + ')' : '') + ', C' + K.num(top.Cycle) + ': ' + String(top.EventDescription || '').trim()
      : (lead.Leader ? lead.Leader + ' leads ' : '') + lead.Organization + (K.num(lead.Congregation) != null ? ', ' + K.fmtInt(K.num(lead.Congregation)) + ' strong' : '') +
        (programs.length ? '; ' + programs.length + ' active programs share the neighborhood.' : '.'),
    facts, people,
    deltas: null,
    hooks: faithHooks(beats, cycle),
    note: events.length
      ? (people.length ? null : 'no leader or member of ' + lead.Organization + ' resolves on the ledger')
      : 'no Faith_Ledger events in the last ' + EVENT_WINDOW + ' cycles — a quiet week on the record; the congregation and its programs are the story',
    extra: {
      organization: lead, programs: programs.map(pr => pr.Name), rotation: { index: cycle % orgs.length, of: orgs.length },
      weekEvents: events.map(e => ({ cycle: K.num(e.Cycle), organization: e.Organization, type: e.EventType, hood: e.Neighborhood || null }))
    }
  });
}

const W = K.wire(SEAT);
if (require.main === module) W.main();
module.exports = { SEAT, loadSlice: W.load, buildFaithSlice: W.build, writeFaithSlice: W.write, loadFaithSlice: W.load,
  isFaithSeat: W.isSeat, assignmentFromSlice: W.assignmentFromSlice, enrichAssignment: W.enrichAssignment, slicePaths: W.paths };
