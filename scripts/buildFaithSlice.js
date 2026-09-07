#!/usr/bin/env node
/**
 * buildFaithSlice.js — Elliot Graye's faith and quiet-work slice (pipeline.68 Task 4).
 * Source: Faith_Organizations (Organization, FaithTradition, Neighborhood,
 * Congregation, Leader, LeaderPOPID, MembersList) and Community_Programs
 * (Name, Founder_POPID, Type, Status). One congregation leads each cycle,
 * rotating through the active list by cycle number; its leader and members
 * and the programs in its neighborhood are the people on the record.
 * Artifacts: output/slices/c{N}/elliot-graye.md · output/cron-compare/faith_slice_c{N}.json
 */
'use strict';
const K = require('./beatSliceKit');

const SEAT = {
  slug: 'elliot-graye', name: 'Elliot Graye', popid: 'POP-00159', desk: 'culture',
  kind: 'beat-faith', domain: 'faith', artifact: 'faith', builder: 'buildFaithSlice.js',
  version: 'FAITH-SLICE-1', nameRe: /elliot\s*graye/i,
  tabs: ['Faith_Organizations', 'Community_Programs', 'Story_Hook_Deck'],
  approach: 'Faith and quiet-work approach: this slice is one congregation from the record — its tradition, its size, its leader and members — and the community programs around it. Dignity, not doctrine wars. The institution and the people are real; the service, the basement kitchen, the Tuesday meeting are yours.',
  roomIsYours: 'the sanctuary on a weeknight, the folding chairs, who sets up and who stays late, what the leader says when the room is half empty',
  build
};

function parseMembers(s) {
  try { const v = JSON.parse(String(s || '[]')); return Array.isArray(v) ? v.map(x => String(x).toUpperCase()) : []; }
  catch (_) { return String(s || '').split(/[,;]/).map(t => t.trim().toUpperCase()).filter(t => /^POP-/.test(t)); }
}

function build(cycle, { beats, profiles }) {
  const orgs = (beats.Faith_Organizations || []).filter(o => o.Organization && !/inactive|closed/i.test(String(o.ActiveStatus || '')));
  if (!orgs.length) return K.emptySlice(SEAT, cycle, 'no active Faith_Organizations rows');
  const lead = orgs[cycle % orgs.length];
  const src = 'output/beats/Faith_Organizations.jsonl "' + lead.Organization + '"';
  const facts = [{
    text: lead.Organization + (lead.FaithTradition ? ' — ' + lead.FaithTradition : '') + (lead.Neighborhood ? ', ' + lead.Neighborhood : '') +
      (K.num(lead.Congregation) != null ? ', congregation ' + K.fmtInt(K.num(lead.Congregation)) : '') + (lead.Founded ? ', founded ' + lead.Founded : '') +
      (lead.Leader ? ', led by ' + lead.Leader : '') + (lead.Character ? ' — ' + lead.Character : ''),
    src
  }];
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
  const label = lead.Organization + (lead.Neighborhood ? ' in ' + lead.Neighborhood : '') + ' | ' + people.length + ' named on the record';
  return K.makeSlice(SEAT, cycle, beats, {
    ref: src, hood: lead.Neighborhood || null, label,
    angle: label + ' — the congregation and the quiet work around it',
    hookLine: (lead.Leader ? lead.Leader + ' leads ' : '') + lead.Organization + (K.num(lead.Congregation) != null ? ', ' + K.fmtInt(K.num(lead.Congregation)) + ' strong' : '') +
      (programs.length ? '; ' + programs.length + ' active programs share the neighborhood.' : '.'),
    facts, people,
    deltas: null,
    hooks: K.hooksFor(beats, cycle, SEAT.name),
    note: people.length ? null : 'no leader or member of ' + lead.Organization + ' resolves on the ledger',
    extra: { organization: lead, programs: programs.map(pr => pr.Name), rotation: { index: cycle % orgs.length, of: orgs.length } }
  });
}

const W = K.wire(SEAT);
if (require.main === module) W.main();
module.exports = { SEAT, loadSlice: W.load, buildFaithSlice: W.build, writeFaithSlice: W.write, loadFaithSlice: W.load,
  isFaithSeat: W.isSeat, assignmentFromSlice: W.assignmentFromSlice, enrichAssignment: W.enrichAssignment, slicePaths: W.paths };
