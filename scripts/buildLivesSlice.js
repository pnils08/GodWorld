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
 *   Household_Ledger — households formed this Cycle (a couple's, or a place of one's own).
 *   Casino_Ledger   — wagers settled this Cycle: a win or a loss on the book.
 *   Story_Seed_Deck — the Cycle's engine seeds and the citizens each one reached, with their own event
 *                     line (builder 2026-10-25: "hook her up with the events that attach to citizens").
 *   Story_Hook_Deck — family / household / hospital hooks as colour.
 *   The person's thread (beside every passage): their hospital stay in full, their other log lines
 *   in the dump window, what Lives already wrote them, and the Tribune pieces that named them
 *   (archive/ARTICLE_INDEX.jsonl, gate-passed only) — the record read in order, not the one event.
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
  version: 'LIVES-SLICE-2', nameRe: /tamsin\s*pruitt/i,
  tabs: ['Lived_Events', 'LifeHistory_Log', 'Hospital_Ledger', 'Household_Ledger', 'Casino_Ledger', 'Story_Seed_Deck', 'Story_Hook_Deck'],
  approach: 'Lives approach: this slice is the people something happened to this Cycle — a birth, a death in the house, a hospital stay, a retirement, a promotion; a household set up or a place of their own; a win or a loss on the book; the people a turn of the city reached and what it did to their day; and the smaller moments the record kept. Each person gets their own passage: the event, then the thread under it — the stay or strain that led there, the other lines the record kept for them, what the Tribune or this page already said of them, and what they did next if the record says. Read the thread in order and name where two lines of it do not agree; do not restate a ledger value as the story. The fact exactly right; never a trend, never a number first; the person, not the system the event belongs to.',
  roomIsYours: 'the plain respect, what the event meant in that house or on that block, the detail the family would have picked — from the lines below, never invented',
  build
};

const PER_DAY = { events: 5, households: 2, casino: 2, seeds: 3, moments: 4, stays: 2 };
const KIND_ORDER = { death: 0, hospital: 1, birth: 2, retirement: 3, promotion: 4 };
// The log's event tags that are something that happened to the person, ranked: 0 shapes a life, 1 is
// pressure, 2 a tie or a standing, 3 work and school as lived. The day's colour (Daily, Neighborhood,
// Civic Perception, Personal, PrevEvening, Lifestyle, Sports…) never leads a passage; it rides the thread.
// Plain Health and Recovering are ailment / wellness texture (the plan's news-grade read), not here.
const LIFE_TAGS = [
  [/^(Wedding|Marriage|Graduation|Household|Stabilized|Setback|Maneuver-(Climb|Hold|Retreat)|Career-FieldChange|PostCareer|Business-Gain)$/i, 0],
  [/^(Strain|Friction)$/i, 1],
  [/^(Relationship|Reputation|Community|Cultural|Faith|Rivalry|Public|BoundaryKept|QoL|Household-GameNight)$/i, 2],
  [/^(Work|Education|Career|CareerState|Career-Training)$/i, 3]
];
const lifeRank = tag => { for (const [re, r] of LIFE_TAGS) if (re.test(tag)) return r; return null; };
const BOOKKEEPING = /Emerged into Tier|Added to Simulation_Ledger|Updated to Tier|Promoted to Tier|Intake at Tier|Media usage C\d/i;
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

// the event row already says these; a Promotion line stays — it carries the employer and the years the event row lacks
const OWN_EVENT_TAG = /^(Recovery|Hospitalized|Critical|Birth|Retirement|Death)$/i;
// what happened to the person vs. the day's colour: the signal tags rank first on a thread
const SIGNAL_TAG = /^(Strain|Friction|Relationship|Work|Career|Advancement|Education|Reputation|Household|Wedding|Marriage|Graduation|Stabilized|Faith|Promotion|LifeEvent-Promotion|Maneuver)/i;
const THREAD_MAX = { log: 4, tribune: 3 };
const cleanTag = t => String(t || '').split('|')[0].trim();

const usableTitle = t => { const x = String(t || '').trim(); return x.length >= 4 && x.length <= 120 && !/^[#*_=\-\s]/.test(x); };

// Gate-passed Tribune pieces that name a citizen (the article index carries the cited citizens per piece).
function tribuneByPop(root) {
  const byPop = new Map();
  let text = '';
  try { text = fs.readFileSync(path.join(root, 'archive', 'ARTICLE_INDEX.jsonl'), 'utf8'); } catch (_) { return byPop; }
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    let a; try { a = JSON.parse(line); } catch (_) { continue; }
    if (!(a.canon === true || a.published === true) || a.stage === 'canon-violation') continue;
    if (/^(profile|lore)$/.test(String(a.source || '')) || !usableTitle(a.title)) continue; // internal dossiers and lore are not Tribune pieces; a headline-less file indexes its first sentence

    for (const c of a.citizens || []) {
      const k = String(c && c.popid || '').toUpperCase();
      if (!k) continue;
      if (!byPop.has(k)) byPop.set(k, []);
      byPop.get(k).push(a);
    }
  }
  return byPop;
}

// The person's thread, in the order the record gives it: the stay, the other log lines, what Lives and the
// Tribune already wrote. Each line is a fact with its own source; nothing is inferred. `skipTexts` are the
// lines the passage's own event already carries.
function threadFor(pop, { name, skipTexts, includeStay, dropOwn, beats, logByPop, covered, ownId, tribune }) {
  const who = (name || 'This person') + ' — ';
  const skip = new Set((skipTexts || []).map(t => String(t || '').trim()).filter(Boolean));
  const P = String(pop || '').toUpperCase();
  const out = [];
  if (includeStay) {
    for (const r of beats.Hospital_Ledger || []) {
      if (String(r.POPID || '').toUpperCase() !== P || !String(r.AdmitCycle || '').trim()) continue;
      const done = String(r.DischargeCycle || '').trim();
      out.push({ text: who + 'on the hospital record: admitted C' + r.AdmitCycle + (r.Cause ? ' for ' + String(r.Cause).trim() : '') +
        (done ? ', discharged C' + done + (r.CyclesInCare ? ' after ' + r.CyclesInCare + ' cycles in care' : '') + (r.Outcome ? ', ' + String(r.Outcome).trim() : '') : ', still in care'),
        src: 'output/beats/Hospital_Ledger.jsonl ' + (r.AdmissionId || P) });
    }
  }
  const lines = (logByPop.get(P) || []).filter(r => {
    const t = String(r.EventText || '').trim();
    return t && !skip.has(t) && !BOOKKEEPING.test(t) && !(dropOwn && OWN_EVENT_TAG.test(cleanTag(r.EventTag)));
  });
  const signal = r => SIGNAL_TAG.test(cleanTag(r.EventTag));
  // newest first inside each rank, one line per distinct text, then back into cycle order for reading
  const fresh = [];
  const seenText = new Set();
  for (const r of lines.slice().sort((a, b) => Number(b.Cycle) - Number(a.Cycle))) {
    const t = String(r.EventText).trim();
    if (seenText.has(t)) continue;
    seenText.add(t); fresh.push(r);
  }
  const kept = fresh.filter(signal).concat(fresh.filter(r => !signal(r))).slice(0, THREAD_MAX.log)
    .sort((a, b) => Number(a.Cycle) - Number(b.Cycle));
  for (const r of kept) out.push({ text: who + 'on the log, C' + r.Cycle + ': ' + String(r.EventText).trim(), src: 'output/beats/LifeHistory_Log.jsonl @C' + r.Cycle });
  const before = Object.entries(covered).filter(([id, v]) => id !== ownId && v && String(v.popid || '').toUpperCase() === P);
  if (before.length) out.push({ text: who + 'Lives already wrote this person: ' + before.map(([, v]) => v.kind + ' (C' + (v.eventCycle != null ? v.eventCycle : v.cycle) + ')').join(', '), src: 'output/cron-compare/lives_covered.json' });
  const seen = (tribune.get(P) || []).slice().sort((a, b) => Number(b.cycle || 0) - Number(a.cycle || 0)).slice(0, THREAD_MAX.tribune);
  for (const a of seen) out.push({ text: who + 'the Tribune named them in a piece headlined ' + String(a.title).trim() + ' (' + (a.desk || 'desk unknown') + (a.cycle != null ? ', C' + a.cycle : '') + ')', src: 'archive/ARTICLE_INDEX.jsonl ' + (a.id || '') });
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
  const tribune = tribuneByPop(root);
  const nameOf = (pop, fallback) => String((profiles.get(String(pop || '').toUpperCase()) || {}).Name || fallback || '').trim();
  const hoodOf = pop => String((profiles.get(String(pop || '').toUpperCase()) || {}).Neighborhood || '').trim() || null;

  // Today's batch of news-grade events: uncovered, heaviest first, then oldest.
  const pending = events.filter(e => !covered[e.id])
    .sort((a, b) => ((KIND_ORDER[a.kind] ?? 9) - (KIND_ORDER[b.kind] ?? 9)) || (Number(a.cycle) - Number(b.cycle)));
  const todays = pending.slice(0, PER_DAY.events);

  // One passage per person per Cycle: today's people, plus anyone already written this Cycle.
  const seenPop = new Set(todays.map(e => String(personFor(e) || '').toUpperCase()));
  for (const e of todays) if (e.kind === 'death' && e.subject) seenPop.add(String(e.subject).toUpperCase()); // the one who died is not also a stay
  for (const v of Object.values(covered)) if (v && v.popid && Number(v.cycle) === Number(cycle)) seenPop.add(String(v.popid).toUpperCase());
  const take = (pop, id) => { if (!pop || covered[id] || seenPop.has(pop)) return false; seenPop.add(pop); return true; };

  // Households formed this Cycle: a couple's, or a place of one's own. Couples first.
  const households = [];
  for (const h of (beats.Household_Ledger || []).filter(h => Number(h.FormedCycle) === Number(cycle))
    .sort((a, b) => String(b.Members || '').length - String(a.Members || '').length)) {
    let members = [];
    try { members = JSON.parse(h.Members || '[]'); } catch (_) { members = String(h.Members || '').match(/POP-\d{5}/g) || []; }
    members = members.map(m => String(m).toUpperCase()).filter(m => /^POP-\d{5}$/.test(m));
    const id = 'household:' + String(h.HouseholdId || members.join('+')) + ':' + cycle;
    if (!members.length || covered[id] || members.some(m => seenPop.has(m))) continue;
    const named = members.map(m => nameOf(m)).filter(Boolean);
    if (!named.length) continue;
    for (const m of members) seenPop.add(m);
    households.push({ id, pop: members.find(m => nameOf(m)) || members[0], members, named, unnamed: members.length - named.length,
      housing: String(h.HousingType || '').trim().toLowerCase(), hood: String(h.Neighborhood || '').trim() || null });
    if (households.length >= PER_DAY.households) break;
  }

  // Wagers settled this Cycle: a win or a loss on the book, the biggest swing first.
  const casino = [];
  const settled = (beats.Casino_Ledger || []).filter(w => Number(w.CycleSettled) === Number(cycle) && /^settled-(win|loss)$/i.test(String(w.Status || '').trim()))
    .map(w => { const won = /win$/i.test(String(w.Status).trim()); const stake = K.num(w.Stake) || 0, payout = K.num(w.Payout) || 0;
      return { w, won, stake, payout, swing: won ? payout - stake : stake }; })
    .sort((a, b) => b.swing - a.swing);
  for (const { w, won, stake, payout } of settled) {
    const pop = String(w.POPID || '').toUpperCase();
    const id = 'casino:' + String(w.WagerId || pop) + ':' + cycle;
    if (!nameOf(pop) || !take(pop, id)) continue;
    casino.push({ id, pop, won, stake, payout, book: /^undocked$/i.test(String(w.MarketFamily || '')) ? 'the UNDOCKED book' : 'the ' + (String(w.MarketFamily || '').trim() || 'casino') + ' book' });
    if (casino.length >= PER_DAY.casino) break;
  }

  // The citizens the Cycle's engine seeds reached — one person per seed, major seeds first — with the
  // event line the engine kept for them (Story_Seed_Deck.CitizenEvents: "those citizens' actual event lines").
  const reached = [];
  const seeds = K.seedsFor(beats, cycle, /./).sort((a, b) => (a.cls === 'major' ? 0 : 1) - (b.cls === 'major' ? 0 : 1));
  for (const sd of seeds) {
    if (reached.length >= PER_DAY.seeds) break;
    for (const c of sd.citizens) {
      const pop = String(c.popid || '').toUpperCase();
      const id = 'seed:' + String(sd.seedId || '') + ':' + pop;
      const own = sd.citizenEvents.map(t => { const m = /^(.+?)\s+—\s+(.+)$/.exec(t); return m ? { name: m[1].trim(), text: m[2].trim() } : null; })
        .find(x => x && x.name.toLowerCase() === String(c.name || '').trim().toLowerCase());
      if (!own || !nameOf(pop) || !take(pop, id)) continue;
      reached.push({ id, pop, line: own.text, hood: sd.hood && !/^citywide$/i.test(sd.hood) ? sd.hood : hoodOf(pop),
        domain: String(sd.domain || sd.desk || 'city').toLowerCase().replace(/_/g, ' ').replace(/^general$/, 'city'), count: sd.citizens.length, why: String(sd.why || '').split('|')[0].trim().slice(0, 140) });
      break;
    }
  }

  // The log's own life events this Cycle, one per person, ranked (life-shape, pressure, ties, work), not bookkeeping.
  const momentPool = [];
  for (const r of log) {
    if (Number(r.Cycle) !== Number(cycle)) continue;
    const tag = cleanTag(r.EventTag);
    const rank = lifeRank(tag);
    const text = String(r.EventText || '').trim();
    if (rank == null || !text || BOOKKEEPING.test(text)) continue;
    momentPool.push({ rank, r, tag, text });
  }
  momentPool.sort((a, b) => a.rank - b.rank);
  const moments = [];
  for (const { r, tag, text } of momentPool) {
    const pop = String(r.POPID).toUpperCase();
    const id = 'moment:' + pop + ':' + cycle + ':' + tag;
    if (!nameOf(pop) || !take(pop, id)) continue;
    moments.push({ id, pop, tag, text, hood: String(r.Neighborhood || '').trim() || hoodOf(pop) });
    if (moments.length >= PER_DAY.moments) break;
  }

  // Stays still active that no event row carries.
  const stays = [];
  for (const r of beats.Hospital_Ledger || []) {
    // a stay is open only with no discharge Cycle — StatusNow has read 'active' on discharged rows
    if (!/^active$/i.test(String(r.StatusNow || '').trim()) || String(r.DischargeCycle || '').trim()) continue;
    const pop = String(r.POPID || '').toUpperCase();
    if (events.some(e => e.kind === 'hospital' && String(e.subject).toUpperCase() === pop)) continue;
    const id = 'stay:' + String(r.AdmissionId || pop) + ':' + cycle;
    if (!take(pop, id)) continue;
    stays.push({ id, pop, name: String(r.Name || '').trim(), cause: String(r.Cause || '').trim(), admit: K.num(r.AdmitCycle), hood: String(r.Neighborhood || '').trim() || null });
    if (stays.length >= PER_DAY.stays) break;
  }

  if (!todays.length && !households.length && !casino.length && !reached.length && !moments.length && !stays.length) {
    return K.emptySlice(SEAT, cycle, events.length || log.length || seeds.length
      ? 'every life event of C' + cycle + ' is already covered — nothing new for today'
      : 'no Lived_Events, LifeHistory_Log or Story_Seed_Deck rows in the dump for C' + cycle);
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
  // A passage: the person's fact, then their thread directly under it.
  const passage = (fact, threadOpts) => {
    facts.push(fact);
    if (fact.popid) for (const t of threadFor(fact.popid, { beats, logByPop, covered, tribune, ownId: fact.id, ...threadOpts })) facts.push({ ...t, kind: 'thread', popid: fact.popid });
  };

  for (const e of todays) {
    const pop = personFor(e);
    const p = pop ? addPerson(pop, e.kind === 'death' ? 'lost ' + (e.deceasedName || 'a family member') + ' this Cycle' : kindLine(e).replace(/^[^—]*?\s(welcomed|came|was|retired)/, '$1'), e.neighborhood) : null;
    let text = kindLine(e) + ' (C' + e.cycle + ')';
    const next = pop ? cameNext(logByPop, pop, e.cycle, null) : null;
    if (next) text += '. Since then, on the record: ' + String(next.EventText).trim() + ' (C' + next.Cycle + ')';
    else text += '. What came next: the record does not say yet';
    if (!p && pop) text += ' — not on the ledger snapshot; name only as the event row gives it';
    passage({ text, src: evSrc, id: e.id, kind: e.kind, eventCycle: e.cycle, popid: pop ? String(pop).toUpperCase() : null },
      { name: nameOf(pop, e.kind === 'death' ? ((e.recipients || [])[0] || {}).name : e.subjectName), skipTexts: [next && next.EventText], includeStay: e.kind === 'hospital', dropOwn: true });
  }
  for (const h of households) {
    const who = h.named.join(' and ') + (h.unnamed ? ' and ' + h.unnamed + ' other' + (h.unnamed > 1 ? 's' : '') + ' not on the ledger snapshot' : '');
    const what = h.members.length > 1 ? 'set up a household together' : 'moved into a place of their own';
    const how = h.housing === 'rented' ? ', renting' : h.housing === 'owned' ? ', a home they own' : '';
    for (const m of h.members) addPerson(m, what + ' this Cycle', h.hood);
    passage({ text: who + ' ' + what + (h.hood ? ' in ' + h.hood : '') + how + ' (C' + cycle + ')', src: 'output/beats/Household_Ledger.jsonl @C' + cycle, id: h.id, kind: 'household', popid: h.pop },
      { name: nameOf(h.pop), skipTexts: [], includeStay: false, dropOwn: false });
  }
  for (const c of casino) {
    addPerson(c.pop, (c.won ? 'won' : 'lost') + ' on ' + c.book + ' this Cycle', hoodOf(c.pop));
    passage({ text: nameOf(c.pop) + (c.won ? ' won on ' + c.book + ' — staked ' + c.stake + ', paid ' + c.payout : ' lost on ' + c.book + ' — staked ' + c.stake + ', the book kept it') + (hoodOf(c.pop) ? ', ' + hoodOf(c.pop) : '') + ' (C' + cycle + ')',
      src: 'output/beats/Casino_Ledger.jsonl @C' + cycle, id: c.id, kind: 'casino', popid: c.pop }, { name: nameOf(c.pop), skipTexts: [], includeStay: false, dropOwn: false });
  }
  for (const r of reached) {
    addPerson(r.pop, 'reached by the Cycle\'s ' + r.domain + ' turn: ' + r.line, r.hood);
    passage({ text: nameOf(r.pop) + ' — ' + r.line + (r.hood ? ', ' + r.hood : '') + ' — one of ' + r.count + ' people the Cycle\'s ' + r.domain + ' turn reached' + (r.why ? ' (' + r.why + ')' : '') + ' (C' + cycle + ', seed)',
      src: 'output/beats/Story_Seed_Deck.jsonl @C' + cycle, id: r.id, kind: 'seed', popid: r.pop }, { name: nameOf(r.pop), skipTexts: [r.line], includeStay: false, dropOwn: false });
  }
  for (const m of moments) {
    addPerson(m.pop, m.tag.toLowerCase() + ' this Cycle: ' + m.text, m.hood);
    passage({ text: nameOf(m.pop) + ' — ' + m.text + (m.hood ? ', ' + m.hood : '') + ' (C' + cycle + ', ' + m.tag + ')', src: logSrc, id: m.id, kind: 'moment', popid: m.pop },
      { name: nameOf(m.pop), skipTexts: [m.text], includeStay: false, dropOwn: false });
  }
  for (const st of stays) {
    addPerson(st.pop, 'still in hospital care' + (st.cause ? ' — ' + st.cause : ''), st.hood);
    passage({ text: (nameOf(st.pop, st.name) || 'a citizen') + ' is still in hospital care' + (st.cause ? ' after ' + st.cause : '') + (st.admit != null ? ', admitted C' + st.admit : '') + (st.hood ? ', ' + st.hood : ''), src: 'output/beats/Hospital_Ledger.jsonl @C' + cycle, id: st.id, kind: 'stay', popid: st.pop },
      { name: nameOf(st.pop, st.name), skipTexts: [], includeStay: false, dropOwn: true });
  }

  // The person's own words this Cycle, when the lived wake landed: colour and sourcing, verbatim.
  const pages = ownPageLines(root, cycle, people.map(p => p.popid));
  const pageVoices = pages.slice(0, 5).map(pg => {
    const who = people.find(p => p.popid === pg.popid);
    return (who ? who.name : pg.popid) + ', own page (' + pg.slot + ', C' + cycle + '): “' + pg.text.slice(0, 240) + (pg.text.length > 240 ? '…' : '') + '”';
  });

  const hooks = K.domainHooks(beats, cycle, SEAT.name,
    /^(FAMILY_CRISIS|FAMILY_CELEBRATION|FAMILY_REALIZED|HOUSEHOLD_DISSOLVED|HOUSEHOLD_ARRIVED|HOUSEHOLD_FORMED|CITIZEN_HOSPITALIZED|HOME_PURCHASE|CITIZEN_RELOCATED|CASINO_WIN)$/).slice(0, 6);

  // Mark today's batch covered — the next day takes the next batch.
  for (const f of facts) if (f.id) covered[f.id] = { popid: f.popid, kind: f.kind, cycle: Number(cycle), ...(f.eventCycle != null ? { eventCycle: Number(f.eventCycle) } : {}), day };
  writeCovered(root, covered, cycle);

  const passages = facts.filter(f => f.kind !== 'thread');
  const leadFact = passages[0];
  const leadName = (people.find(p => p.popid === leadFact.popid) || {}).name || (todays[0] && todays[0].subjectName) || 'the first person';
  const label = leadFact.text.replace(/\s*\(C\d+[^)]*\)\.?.*$/, '').replace(/\. Since then.*$/, '');
  const leadHood = (todays[0] && todays[0].neighborhood) || (people.find(p => p.popid === leadFact.popid) || {}).hood || null;
  // The ref carries the day: the fanout drops a beat seat whose ref was already filed this Cycle
  // (newsroom-fanout.js staleBeatRef) — right for a weekly seat, fatal for a daily one.
  return K.makeSlice(SEAT, cycle, beats, {
    ref: evSrc + ' ' + day, hood: leadHood,
    label,
    angle: 'The lives of C' + cycle + ', ' + day + ': ' + passages.length + ' people — ' + label,
    hookLine: leadName + ' first. The event is the lead; one true detail; what came next only if the record says.',
    facts, people, hooks, pageVoices, factCap: 90,
    deltas: null,
    note: [pending.length > todays.length ? (pending.length - todays.length) + ' more news-grade events wait for the next day' : null,
      pages.length ? null : 'none of today\'s people has written their own page this Cycle — no quotes'].filter(Boolean).join('; ') || null,
    extra: { day, counted: { events: events.length, pending: pending.length, todays: todays.length, households: households.length, casino: casino.length, seeds: reached.length, moments: moments.length, stays: stays.length } }
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
  // Nothing new on the record today → null: the fanout drops the seat for the day. Returning the bare
  // assignment sent her to the generic culture packet (C112 Friday: 45 words on "one world event").
  return slice ? W.assignmentFromSlice(slice, assign) : null;
}
const sitsOutWhenEmpty = true;
if (require.main === module) W.main();
module.exports = { SEAT, sitsOutWhenEmpty, loadSlice, buildLivesSlice: W.build, writeLivesSlice: W.write, loadLivesSlice: loadSlice,
  isLivesSeat: W.isSeat, assignmentFromSlice: W.assignmentFromSlice, enrichAssignment, slicePaths: W.paths,
  kindLine, cameNext, localDay, coveredPath };
