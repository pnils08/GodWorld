#!/usr/bin/env node
/**
 * buildLivesSlice.js — Tamsin Pruitt's Lives slice (pipeline.73; the seat mints at C112).
 * The person events of the Cycle as news — the city's real calendar, one person at a time.
 *
 * Reads (all from the beat dump, step 2 of the plan):
 *   Lived_Events    — the news-grade events the lived wake uses (birth, death, hospital,
 *                     retirement, promotion), so Tamsin and the wake agree on what happened.
 *   LifeHistory_Log — the raw log rows of this Cycle and the one before: the small moments
 *                     (wedding, graduation, relationship, household) and "what came next".
 *   Hospital_Ledger — stays still active that no event row carries.
 *   Household_Ledger — households formed this Cycle.
 *   Story_Hook_Deck — family / household / hospital hooks as colour.
 * Daily, not once a Cycle: the Cycle's events are stamped at the Sunday fire and she runs
 * Mon–Fri, so each day takes the next uncovered batch and marks it in the covered list
 * (output/cron-compare/lives_covered.json, keyed by event id — the Carmen/Luis failure was
 * no memory of who was already written). The slice on disk carries the day it was built;
 * a later day rebuilds, the same day reads the cache (angle → report → write see one slice).
 * Artifacts: output/slices/c{N}/tamsin-pruitt.md · output/cron-compare/lives_slice_c{N}.json
 */
'use strict';
const fs = require('fs');
const path = require('path');
const K = require('./beatSliceKit');

const SEAT = {
  slug: 'tamsin-pruitt', name: 'Tamsin Pruitt', popid: null, desk: 'culture',
  kind: 'beat-lives', domain: 'lives', artifact: 'lives', builder: 'buildLivesSlice.js',
  version: 'LIVES-SLICE-1', nameRe: /tamsin\s*pruitt/i,
  tabs: ['Lived_Events', 'LifeHistory_Log', 'Hospital_Ledger', 'Household_Ledger', 'Story_Hook_Deck'],
  approach: 'Lives approach: this slice is the people something happened to this Cycle — a birth, a death in the house, a hospital stay, a retirement, a promotion — and the smaller moments the record kept. Each person gets their own short passage: the event, the one true detail the record carries, what they did next if the record says. The fact exactly right; never a trend, never a number first; the person, not the system the event belongs to.',
  roomIsYours: 'the plain respect, what the event meant in that house or on that block, the detail the family would have picked — from the lines below, never invented',
  build
};

const PER_DAY = { events: 4, moments: 3, stays: 2 };
const KIND_ORDER = { death: 0, hospital: 1, birth: 2, retirement: 3, promotion: 4 };
const SMALL_TAGS = /^(Wedding|Marriage|Graduation|Relationship|Household|Stabilized)$/i;
const BOOKKEEPING = /Emerged into Tier|Added to Simulation_Ledger|Updated to Tier|Promoted to Tier/i;
const SELF_SLOTS = /^(morning|midday|afternoon|evening|night|work)$/;

function coveredPath(root) { return path.join(root, 'output', 'cron-compare', 'lives_covered.json'); }
function readCovered(root) { return K.loadJson(coveredPath(root)) || {}; }
function writeCovered(root, covered, cycle) {
  // keep two Cycles of memory; an event id carries its Cycle
  const keep = {};
  for (const [id, v] of Object.entries(covered)) if (!v.cycle || Number(v.cycle) >= Number(cycle) - 2) keep[id] = v;
  fs.mkdirSync(path.dirname(coveredPath(root)), { recursive: true });
  fs.writeFileSync(coveredPath(root), JSON.stringify(keep, null, 2));
}
function localDay(d = new Date()) {
  return d.toLocaleDateString('en-CA'); // YYYY-MM-DD in the server's zone — the crons' day
}

function kindLine(e) {
  const hood = e.neighborhood ? ', ' + e.neighborhood : '';
  switch (e.kind) {
    case 'birth': return (e.subjectName || 'a parent') + ' welcomed a new child' + hood;
    case 'death': {
      const who = (e.recipients || [])[0] || {};
      return (who.name || 'the household') + ' lost ' + (e.deceasedName || 'a family member') +
        (who.rel && who.rel !== 'self' ? ' (' + who.rel + ')' : '') + hood;
    }
    case 'hospital': return (e.subjectName || 'a citizen') + (e.phase === 'discharged' ? ' came home from the hospital' : ' was admitted to the hospital') +
      (e.cause ? ' — ' + e.cause : '') + hood;
    case 'retirement': return (e.subjectName || 'a citizen') + ' retired' + (e.roleType ? ' from work as ' + e.roleType : '') + hood;
    case 'promotion': return (e.subjectName || 'a citizen') + ' was promoted' + (e.roleType ? '; the record lists their work as ' + e.roleType : '') + hood;
    default: return (e.subjectName || 'a citizen') + ' — ' + e.kind + hood;
  }
}

// The person a passage is about: the subject, or for a death the first survivor.
function personFor(e) {
  if (e.kind === 'death') { const r = (e.recipients || [])[0]; return r ? r.pop : null; }
  return e.subject;
}

// "What came next": the person's own log line from a LATER Cycle, if the log carries one. Lines from the
// event's own Cycle are the person's day, not a consequence — the log does not order them within a Cycle.
function cameNext(logByPop, popid, afterCycle, notText) {
  const rows = (logByPop.get(String(popid || '').toUpperCase()) || [])
    .filter(r => Number(r.Cycle) > Number(afterCycle) && String(r.EventText || '').trim() &&
      String(r.EventText).trim() !== String(notText || '').trim() && !BOOKKEEPING.test(String(r.EventText)));
  rows.sort((a, b) => Number(b.Cycle) - Number(a.Cycle));
  return rows[0] || null;
}

// The citizen's own page this Cycle (the lived wake lands the day it happened).
function ownPageLines(root, cycle, popids) {
  const want = new Set(popids.map(p => String(p).toUpperCase()));
  const out = [];
  let text = '';
  try { text = fs.readFileSync(path.join(root, 'output', 'citizen_pages', 'index.jsonl'), 'utf8'); } catch (_) { return out; }
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    let d; try { d = JSON.parse(line); } catch (_) { continue; }
    if (Number(d.cycle) !== Number(cycle) || !SELF_SLOTS.test(String(d.slot || '')) || !want.has(String(d.popId || '').toUpperCase())) continue;
    const content = String(d.content || '').trim();
    if (!content) continue;
    out.push({ popid: String(d.popId).toUpperCase(), slot: d.slot, customId: d.customId, text: content });
  }
  return out;
}

function build(cycle, { root, beats, profiles }) {
  const events = (beats.Lived_Events || []).filter(e => e && e.id && e.kind);
  const log = (beats.LifeHistory_Log || []).filter(r => r && r.POPID);
  const logByPop = new Map();
  for (const r of log) {
    const k = String(r.POPID).toUpperCase();
    if (!logByPop.has(k)) logByPop.set(k, []);
    logByPop.get(k).push(r);
  }
  const covered = readCovered(root);
  const day = localDay();

  // Today's batch of news-grade events: uncovered, heaviest first, then oldest.
  const pending = events.filter(e => !covered[e.id])
    .sort((a, b) => ((KIND_ORDER[a.kind] ?? 9) - (KIND_ORDER[b.kind] ?? 9)) || (Number(a.cycle) - Number(b.cycle)));
  const todays = pending.slice(0, PER_DAY.events);

  // The small moments: this Cycle's log rows under the small tags, one per person, not bookkeeping.
  // One passage per person per Cycle: today's people, plus anyone already written this Cycle.
  const seenPop = new Set(todays.map(e => String(personFor(e) || '').toUpperCase()));
  for (const v of Object.values(covered)) if (v && v.popid && Number(v.cycle) === Number(cycle)) seenPop.add(String(v.popid).toUpperCase());
  const moments = [];
  for (const r of log) {
    if (Number(r.Cycle) !== Number(cycle) || !SMALL_TAGS.test(String(r.EventTag || '').trim())) continue;
    const text = String(r.EventText || '').trim();
    if (!text || BOOKKEEPING.test(text)) continue;
    const pop = String(r.POPID).toUpperCase();
    const id = 'moment:' + pop + ':' + cycle + ':' + String(r.EventTag).trim();
    if (covered[id] || seenPop.has(pop)) continue;
    const p = profiles.get(pop);
    if (!p || !String(p.Name || '').trim()) continue;
    seenPop.add(pop);
    moments.push({ id, pop, tag: String(r.EventTag).trim(), text, hood: String(r.Neighborhood || p.Neighborhood || '').trim() || null });
    if (moments.length >= PER_DAY.moments) break;
  }

  // Stays still active that no event row carries.
  const stays = [];
  for (const r of beats.Hospital_Ledger || []) {
    // a stay is open only with no discharge Cycle — StatusNow has read 'active' on discharged rows
    if (!/^active$/i.test(String(r.StatusNow || '').trim()) || String(r.DischargeCycle || '').trim()) continue;
    const pop = String(r.POPID || '').toUpperCase();
    if (!pop || seenPop.has(pop) || events.some(e => e.kind === 'hospital' && String(e.subject).toUpperCase() === pop)) continue;
    const id = 'stay:' + String(r.AdmissionId || pop) + ':' + cycle;
    if (covered[id]) continue;
    seenPop.add(pop);
    stays.push({ id, pop, name: String(r.Name || '').trim(), cause: String(r.Cause || '').trim(), admit: K.num(r.AdmitCycle), hood: String(r.Neighborhood || '').trim() || null });
    if (stays.length >= PER_DAY.stays) break;
  }

  if (!todays.length && !moments.length && !stays.length) {
    return K.emptySlice(SEAT, cycle, events.length || log.length
      ? 'every life event of C' + cycle + ' is already covered — nothing new for today'
      : 'no Lived_Events or LifeHistory_Log rows in the dump for C' + cycle);
  }

  const facts = [];
  const people = [];
  const evSrc = 'output/beats/Lived_Events.jsonl @C' + cycle;
  const logSrc = 'output/beats/LifeHistory_Log.jsonl @C' + cycle;
  const addPerson = (pop, why, hood) => {
    const p = K.personFromProfile(profiles, pop, why, hood);
    if (p && !people.some(x => x.popid === p.popid)) people.push(p);
    return p;
  };

  for (const e of todays) {
    const pop = personFor(e);
    const p = pop ? addPerson(pop, e.kind === 'death' ? 'lost ' + (e.deceasedName || 'a family member') + ' this Cycle' : kindLine(e).replace(/^[^—]*?\s(welcomed|came|was|retired)/, '$1'), e.neighborhood) : null;
    let text = kindLine(e) + ' (C' + e.cycle + ')';
    const next = pop ? cameNext(logByPop, pop, e.cycle, null) : null;
    if (next) text += '. Since then, on the record: ' + String(next.EventText).trim() + ' (C' + next.Cycle + ')';
    else text += '. What came next: the record does not say yet';
    facts.push({ text, src: evSrc, id: e.id, kind: e.kind, popid: pop ? String(pop).toUpperCase() : null });
    if (!p && pop) facts[facts.length - 1].text += ' — not on the ledger snapshot; name only as the event row gives it';
  }
  for (const m of moments) {
    addPerson(m.pop, m.tag.toLowerCase() + ' this Cycle: ' + m.text, m.hood);
    facts.push({ text: (profiles.get(m.pop).Name || '').trim() + ' — ' + m.text + (m.hood ? ', ' + m.hood : '') + ' (C' + cycle + ', ' + m.tag + ')', src: logSrc, id: m.id, kind: 'moment', popid: m.pop });
  }
  for (const s of stays) {
    addPerson(s.pop, 'still in hospital care' + (s.cause ? ' — ' + s.cause : ''), s.hood);
    facts.push({ text: (s.name || 'a citizen') + ' is still in hospital care' + (s.cause ? ' after ' + s.cause : '') + (s.admit != null ? ', admitted C' + s.admit : '') + (s.hood ? ', ' + s.hood : ''), src: 'output/beats/Hospital_Ledger.jsonl @C' + cycle, id: s.id, kind: 'stay', popid: s.pop });
  }

  // The person's own words this Cycle, when the lived wake landed: colour and sourcing, verbatim.
  const pages = ownPageLines(root, cycle, people.map(p => p.popid));
  const pageVoices = pages.slice(0, 5).map(pg => {
    const who = people.find(p => p.popid === pg.popid);
    return (who ? who.name : pg.popid) + ', own page (' + pg.slot + ', C' + cycle + '): “' + pg.text.slice(0, 240) + (pg.text.length > 240 ? '…' : '') + '”';
  });

  const hooks = K.domainHooks(beats, cycle, SEAT.name,
    /^(FAMILY_CRISIS|FAMILY_CELEBRATION|FAMILY_REALIZED|HOUSEHOLD_DISSOLVED|HOUSEHOLD_ARRIVED|HOUSEHOLD_FORMED|CITIZEN_HOSPITALIZED)$/).slice(0, 6);

  // Mark today's batch covered — the next day takes the next batch.
  for (const f of facts) covered[f.id] = { popid: f.popid, kind: f.kind, cycle: Number(cycle), day };
  writeCovered(root, covered, cycle);

  const lead = todays[0];
  const leadName = lead ? ((people.find(p => p.popid === String(personFor(lead) || '').toUpperCase()) || {}).name || lead.subjectName) : (moments[0] ? (profiles.get(moments[0].pop).Name || '').trim() : stays[0].name);
  const label = (lead ? kindLine(lead) : moments[0] ? leadName + ' — ' + moments[0].text : leadName + ' still in hospital care');
  // The ref carries the day: the fanout drops a beat seat whose ref was already filed this Cycle
  // (newsroom-fanout.js staleBeatRef) — right for a weekly seat, fatal for a daily one.
  return K.makeSlice(SEAT, cycle, beats, {
    ref: evSrc + ' ' + day, hood: (lead && lead.neighborhood) || (moments[0] && moments[0].hood) || (stays[0] && stays[0].hood) || null,
    label,
    angle: 'The lives of C' + cycle + ', ' + day + ': ' + facts.length + ' people — ' + label,
    hookLine: leadName + ' first. The event is the lead; one true detail; what came next only if the record says.',
    facts, people, hooks, pageVoices,
    deltas: null,
    note: [pending.length > todays.length ? (pending.length - todays.length) + ' more news-grade events wait for the next day' : null,
      pages.length ? null : 'none of today\'s people has written their own page this Cycle — no quotes'].filter(Boolean).join('; ') || null,
    extra: { day, counted: { events: events.length, pending: pending.length, todays: todays.length, moments: moments.length, stays: stays.length } }
  });
}

const W = K.wire(SEAT);
// Day-aware cache: the same day reads one slice across angle → report → write; a new day rebuilds.
function loadSlice(cycle, root = K.ROOT) {
  const cached = K.loadJson(W.paths(cycle, root).json);
  if (cached && cached.version === SEAT.version && !cached.empty && cached.day === localDay()) return cached;
  const slice = W.build(cycle, { root });
  W.write(cycle, slice, root);
  return slice.empty ? null : slice;
}
function enrichAssignment(assign, cycle, root = K.ROOT) {
  if (!W.isSeat(assign)) return assign;
  const slice = loadSlice(cycle, root);
  return slice ? W.assignmentFromSlice(slice, assign) : assign;
}
if (require.main === module) W.main();
module.exports = { SEAT, loadSlice, buildLivesSlice: W.build, writeLivesSlice: W.write, loadLivesSlice: loadSlice,
  isLivesSeat: W.isSeat, assignmentFromSlice: W.assignmentFromSlice, enrichAssignment, slicePaths: W.paths,
  kindLine, cameNext, localDay, coveredPath };
