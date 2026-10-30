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
 *   Their own words this Cycle (output/citizen_pages/index.jsonl): pipeline.97 (builder 2026-10-30) — every
 *   page the collector admits, interviews, exchanges, debates and the questions they carry, not only the wakes.
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
  slug: 'tamsin-pruitt', name: 'Tamsin Pruitt', popid: 'POP-01210', desk: 'culture',
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
// pressure, 2 a tie or a standing, 3 work as lived. A dial suffix (Strain-Composure-Down-S) still ranks.
// A stance (Maneuver-Climb/Hold/Retreat) is a mood, not something that happened: it is colour, never a lead.
// The day's colour (Daily, Neighborhood, Civic Perception, Personal, PrevEvening, Lifestyle, Sports…) and
// the ambient tags that read as colour on the live log (Education, Career, Faith, Health, Recovering) never
// lead a passage; they ride the thread. CareerState is a key=value persistence marker, never prose.
const LIFE_TAGS = [
  [/^(Wedding|Marriage|Graduation|Stabilized|Setback|Career-FieldChange|Career-Hired|LifeEvent-Promotion|Relocation|PostCareer|Business-Gain)(?=$|-)/i, 0],
  [/^(Strain|Friction|Stumble)(?=$|-)/i, 1],
  [/^(Relationship|Reputation|Community|Cultural|Rivalry|Alliance|Public|BoundaryKept|BoundaryCompromised|CivicRole|Civic|QoL|Household)(?=$|-)/i, 2],
  [/^(Work)(?=$|-)/i, 3]
];
// The maneuver rule writes its stance as a short phrase ("playing to climb — the house first"). On the page
// that reads like something the person said; the packet says what it is — a mood, and the step it points at.
const MANEUVER_GOAL = { 'a place of their own first': ['a place of their own', 'a place of their own'], 'the house first': ['buying a house', 'buying a house'], 'the money next': ['more money', 'more money'] };
function plainLife(tag, text) {
  const t = String(text || '').trim();
  if (!/^Maneuver-/i.test(cleanTag(tag))) return t;
  let m = /^playing to climb — (.+)$/.exec(t);
  if (m && MANEUVER_GOAL[m[1]]) return 'feeling bold, ' + MANEUVER_GOAL[m[1]][0] + ' the next step';
  m = /^settling — (.+)$/.exec(t);
  if (m && MANEUVER_GOAL[m[1]]) return 'holding steady, ' + MANEUVER_GOAL[m[1]][1] + ' still the next step';
  if (t === 'pulling in — the debt says so') return 'pulling in because of their debt';
  return t;
}
const lifeRank = tag => { for (const [re, r] of LIFE_TAGS) if (re.test(tag)) return r; return null; };
const BOOKKEEPING = /Emerged into Tier|Added to Simulation_Ledger|Updated to Tier|Promoted to Tier|Intake at Tier|Media usage C\d|^[a-z]+=[^|]*\|[a-z]+=/i;
// The words a covered kind reads as on the page — the Voices seat and the thread say them, never the key.
const KIND_WORD = { death: 'the death in the house', hospital: 'the hospital stay', stay: 'the hospital stay', birth: 'the new child', retirement: 'the retirement', promotion: 'the promotion', household: 'the new household', casino: 'the wager', seed: 'what the Cycle\'s turn reached them with', moment: 'a moment the record kept' };
const kindWord = k => KIND_WORD[String(k || '').toLowerCase()] || String(k || 'an event');
const isMedia = p => !!p && (String(p.ClockMode || '').trim().toUpperCase() === 'MEDIA' || /^y/i.test(String(p['MED (y/n)'] || p.MED || '').trim()));
const SELF_SLOTS = /^(morning|midday|afternoon|evening|night|work)$/;
// pipeline.97 (builder 2026-10-30: "everything should be available to the media, I think Ines and Tamsin should have
// access to all this"): Lives and Voices read every page the collector admits (scanCitizenPages SLOT_RE) — the
// interview replies, exchanges, debates, talks and the questions a citizen carries — through citizenText, so a
// TENSION[c<N>]: tag never reads as their words. One switch for both seats; held off until codex review.
// The collector is required lazily: it loads the env, which the switch-off path never needed.
const EVERY_PAGE = false;
const scan = () => require('./scanCitizenPages');
const VOICES_SLOTS = /^(morning|midday|afternoon|evening|night|work|CONVO)$/;
function pageSlot(slot, seat, every = EVERY_PAGE) {
  const s = String(slot || '');
  return every ? scan().SLOT_RE.test(s) : (seat === 'voices' ? VOICES_SLOTS : SELF_SLOTS).test(s);
}
function pageText(content, every = EVERY_PAGE) { return (every ? scan().citizenText(content) : String(content || '')).trim(); }
// Where the words were said, as the roster and the passage name it — never the slot key.
const SLOT_WORD = { CONVO: 'in conversation', work: 'after work', PRESS: 'to a reporter', INTERVIEW: 'in an interview', DISCORD: 'in a talk', DEBATE: 'in a debate' };
function slotWord(slot) {
  const m = /^([A-Za-z]+)((?:-tension(?:-resolved)?)?)$/.exec(String(slot || ''));
  const base = m ? m[1] : String(slot || '');
  const tail = !m || !m[2] ? '' : m[2] === '-tension' ? ', a question they carry' : ', a question they settled';
  return (SLOT_WORD[base] || 'the ' + base + ' page') + tail;
}

function coveredPath(root) { return path.join(root, 'output', 'cron-compare', 'lives_covered.json'); }
function readCovered(root) { return K.loadJson(coveredPath(root)) || {}; }
function writeCovered(root, covered, cycle) {
  // keep two Cycles of memory; an event id carries its Cycle
  const keep = {};
  for (const [id, v] of Object.entries(covered)) if (!v.cycle || Number(v.cycle) >= Number(cycle) - 1) keep[id] = v;
  fs.mkdirSync(path.dirname(coveredPath(root)), { recursive: true });
  fs.writeFileSync(coveredPath(root), JSON.stringify(keep, null, 2));
}
// A per-day token for refs the writer sees: unique per day (the fanout's stale-ref check needs that),
// never a wall-clock date (sim-facing text carries Cycles only — builder 2026-10-28).
function dayToken(day) { return 'batch ' + require('crypto').createHash('sha1').update(String(day)).digest('hex').slice(0, 6); }
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
function ownPageLines(root, cycle, popids, every = EVERY_PAGE) {
  const want = new Set(popids.map(p => String(p).toUpperCase()));
  const out = [];
  let text = '';
  try { text = fs.readFileSync(path.join(root, 'output', 'citizen_pages', 'index.jsonl'), 'utf8'); } catch (_) { return out; }
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    let d; try { d = JSON.parse(line); } catch (_) { continue; }
    if (Number(d.cycle) !== Number(cycle) || !pageSlot(d.slot, 'lives', every) || !want.has(String(d.popId || '').toUpperCase())) continue;
    const content = pageText(d.content, every);
    if (!content) continue;
    out.push({ popid: String(d.popId).toUpperCase(), slot: d.slot, where: every ? slotWord(d.slot) : d.slot, customId: d.customId, text: content });
  }
  return out;
}

// the event row already says these; a Promotion line stays — it carries the employer and the years the event row lacks
const OWN_EVENT_TAG = /^(Recovery|Hospitalized|Critical|Birth|Retirement|Death)$/i;
// what happened to the person vs. the day's colour: the signal tags rank first on a thread
const SIGNAL_TAG = /^(Strain|Friction|Relationship|Work|Career|Advancement|Education|Reputation|Household|Wedding|Marriage|Graduation|Stabilized|Faith|Promotion|LifeEvent-Promotion)/i;
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
  for (const r of kept) out.push({ text: who + 'in their life, C' + r.Cycle + ': ' + plainLife(r.EventTag, r.EventText), src: 'output/beats/LifeHistory_Log.jsonl @C' + r.Cycle });
  const before = Object.entries(covered).filter(([id, v]) => id !== ownId && v && String(v.popid || '').toUpperCase() === P);
  if (before.length) out.push({ text: who + 'Lives already wrote this person: ' + before.map(([, v]) => kindWord(v.kind) + ' (C' + (v.eventCycle != null ? v.eventCycle : v.cycle) + ')').join(', '), src: 'output/cron-compare/lives_covered.json' });
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
  // the Tribune's own people are not her subjects (her own household row sits on the live tab)
  const take = (pop, id) => { if (!pop || covered[id] || seenPop.has(pop) || isMedia(profiles.get(pop))) return false; seenPop.add(pop); return true; };
  const extraCovered = [];   // covered marks beyond the fact ids (every member of a household)

  // Households formed this Cycle: a couple's, or a place of one's own. Couples first. A member who already
  // has a passage this Cycle (a discharge, a birth) is named but the passage belongs to the others; the
  // household is a different event from theirs. Every member it covers is marked covered.
  const households = [];
  for (const h of (beats.Household_Ledger || []).filter(h => Number(h.FormedCycle) === Number(cycle))
    .sort((a, b) => String(b.Members || '').length - String(a.Members || '').length)) {
    let members = [];
    try { members = JSON.parse(h.Members || '[]'); } catch (_) { members = String(h.Members || '').match(/POP-\d{5}/g) || []; }
    members = members.map(m => String(m).toUpperCase()).filter(m => /^POP-\d{5}$/.test(m));
    const id = 'household:' + String(h.HouseholdId || members.join('+')) + ':' + cycle;
    if (!members.length || covered[id]) continue;
    const free = members.filter(m => nameOf(m) && !seenPop.has(m) && !isMedia(profiles.get(m)));
    if (!free.length) continue;
    const head = String(h.HeadOfHousehold || '').toUpperCase();
    const pop = free.includes(head) ? head : free[0];
    for (const m of free) seenPop.add(m);
    households.push({ id, pop, members, free, named: members.map(m => nameOf(m)).filter(Boolean), unnamed: members.filter(m => !nameOf(m)).length,
      housing: String(h.HousingType || '').trim().toLowerCase(), hood: String(h.Neighborhood || '').trim() || null });
    if (households.length >= PER_DAY.households) break;
  }

  // Wagers settled this Cycle: a win or a loss on the book, the biggest swing first.
  const casino = [];
  const settled = (beats.Casino_Ledger || []).filter(w => Number(w.CycleSettled) === Number(cycle) && /^settled-(win|loss)$/i.test(String(w.Status || '').trim()))
    .map(w => { const won = /win$/i.test(String(w.Status).trim()); const stake = K.num(w.Stake) || 0, payout = K.num(w.Payout) || 0;
      return { w, won, stake, payout, swing: won ? payout - stake : stake }; })
    .sort((a, b) => b.swing - a.swing);
  for (const { w, won, stake, payout, swing } of settled) {
    if (stake <= 0 || swing <= 0) continue;   // a push, a zero stake: nothing happened to the person
    const pop = String(w.POPID || '').toUpperCase();
    const id = 'casino:' + String(w.WagerId || pop) + ':' + cycle;
    if (!nameOf(pop) || !take(pop, id)) continue;
    casino.push({ id, pop, won, stake, payout, book: /^undocked$/i.test(String(w.MarketFamily || '')) ? 'the UNDOCKED book' : 'the ' + (String(w.MarketFamily || '').trim() || 'casino') + ' book' });
    if (casino.length >= PER_DAY.casino) break;
  }

  // The citizens the Cycle's engine seeds reached — one person per seed per Cycle, major seeds first — with
  // the event line the engine kept for them (Story_Seed_Deck.CitizenEvents: "those citizens' actual event
  // lines", index-aligned with Citizens). The seed's Why rides only when it is about this person or about
  // the system, never another citizen's relocation line, never an engine carryover counter.
  const reached = [];
  const seedsUsed = new Set(Object.keys(covered).filter(k => k.startsWith('seed:')).map(k => k.split(':')[1]));
  const seeds = K.seedsFor(beats, cycle, /./).sort((a, b) => (a.cls === 'major' ? 0 : 1) - (b.cls === 'major' ? 0 : 1));
  for (const sd of seeds) {
    if (reached.length >= PER_DAY.seeds) break;
    if (!sd.seedId || seedsUsed.has(String(sd.seedId))) continue;
    const lines = sd.citizenEvents.map(t => { const m = /^(.+?)\s+—\s+(.+)$/.exec(t); return m ? { name: m[1].trim(), text: m[2].trim() } : null; });
    const names = sd.citizens.map(c => String(c.name || '').trim().toLowerCase()).filter(Boolean);
    for (let i = 0; i < sd.citizens.length; i++) {
      const c = sd.citizens[i];
      const pop = String(c.popid || '').toUpperCase();
      const id = 'seed:' + String(sd.seedId) + ':' + cycle + ':' + pop;
      const own = (lines[i] && lines[i].name.toLowerCase() === String(c.name || '').trim().toLowerCase()) ? lines[i]
        : lines.find(x => x && x.name.toLowerCase() === String(c.name || '').trim().toLowerCase());
      if (!own || BOOKKEEPING.test(own.text) || !nameOf(pop) || !take(pop, id)) continue;
      const me = String(c.name || '').trim().toLowerCase();
      const segs = String(sd.why || '').split('|').map(t => t.trim()).filter(t => t && !/^carryover/i.test(t));
      const why = segs.find(t => t.toLowerCase().includes(me)) || segs.find(t => !names.some(n => n !== me && t.toLowerCase().includes(n))) || '';
      reached.push({ id, pop, line: own.text, hood: sd.hood && !/^citywide$/i.test(sd.hood) ? sd.hood : hoodOf(pop),
        domain: String(sd.domain || sd.desk || 'city').toLowerCase().replace(/_/g, ' ').replace(/^general$/, 'city'), count: sd.citizens.length,
        why: why.length > 140 ? why.slice(0, 140).replace(/\s+\S*$/, '') + '…' : why });
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
    momentPool.push({ rank, r, tag, text, pop: String(r.POPID).toUpperCase() });
  }
  momentPool.sort((a, b) => a.rank - b.rank);
  // A family event is each member's event (every citizen carries their own dials) and one family passage
  // (builder 2026-10-25): members of one household with the same line this Cycle share the passage, each
  // with their own thread and their own covered mark. Strangers with the same texture line do not merge.
  const householdOf = new Map();
  for (const h of beats.Household_Ledger || []) {
    if (String(h.DissolvedCycle || '').trim()) continue;
    let members = [];
    try { members = JSON.parse(h.Members || '[]'); } catch (_) { members = String(h.Members || '').match(/POP-\d{5}/g) || []; }
    for (const m of members) householdOf.set(String(m).toUpperCase(), String(h.HouseholdId || ''));
  }
  const moments = [];
  for (const m of momentPool) {
    const id = 'moment:' + m.pop + ':' + cycle + ':' + m.tag;
    if (!nameOf(m.pop) || !take(m.pop, id)) continue;
    const hh = householdOf.get(m.pop);
    const family = hh ? momentPool.filter(o => o !== m && o.text === m.text && householdOf.get(o.pop) === hh && nameOf(o.pop) && take(o.pop, 'moment:' + o.pop + ':' + cycle + ':' + o.tag)).map(o => o.pop) : [];
    moments.push({ id, pop: m.pop, family, tag: m.tag, text: m.text, hood: String(m.r.Neighborhood || '').trim() || hoodOf(m.pop) });
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
    const who = h.named.join(' and ') + (h.unnamed ? ' and ' + (h.unnamed > 1 ? h.unnamed + ' others' : 'one other') : '');
    const what = h.members.length > 1 ? 'set up a household together' : 'moved into a place of their own';
    const how = h.housing === 'rented' ? ', renting' : h.housing === 'owned' ? ', a home they own' : '';
    for (const m of h.free) addPerson(m, what + ' this Cycle', h.hood);
    passage({ text: who + ' ' + what + (h.hood ? ' in ' + h.hood : '') + how + ' (C' + cycle + ')', src: 'output/beats/Household_Ledger.jsonl @C' + cycle, id: h.id, kind: 'household', popid: h.pop },
      { name: nameOf(h.pop), skipTexts: [], includeStay: false, dropOwn: false });
    for (const m of h.free.filter(m => m !== h.pop)) {
      for (const t of threadFor(m, { beats, logByPop, covered, tribune, ownId: h.id, name: nameOf(m), skipTexts: [], includeStay: false, dropOwn: false })) facts.push({ ...t, kind: 'thread', popid: m });
      extraCovered.push([h.id + ':' + m, { popid: m, kind: 'household', cycle: Number(cycle), day }]);
    }
  }
  for (const c of casino) {
    addPerson(c.pop, (c.won ? 'won' : 'lost') + ' on ' + c.book + ' this Cycle', hoodOf(c.pop));
    passage({ text: nameOf(c.pop) + (c.won ? ' won on ' + c.book + ' — staked ' + c.stake + ', paid ' + c.payout : ' lost on ' + c.book + ' — staked ' + c.stake + ', the book kept it') + (hoodOf(c.pop) ? ', ' + hoodOf(c.pop) : '') + ' (C' + cycle + ')',
      src: 'output/beats/Casino_Ledger.jsonl @C' + cycle, id: c.id, kind: 'casino', popid: c.pop }, { name: nameOf(c.pop), skipTexts: [], includeStay: false, dropOwn: false });
  }
  for (const r of reached) {
    addPerson(r.pop, 'reached by the Cycle\'s ' + r.domain + ' turn: ' + r.line, r.hood);
    passage({ text: nameOf(r.pop) + ' — ' + r.line + (r.hood ? ', ' + r.hood : '') + ' — one of ' + r.count + ' people the Cycle\'s ' + r.domain + ' turn reached' + (r.why ? ' (' + r.why + ')' : '') + ' (C' + cycle + ')',
      src: 'output/beats/Story_Seed_Deck.jsonl @C' + cycle, id: r.id, kind: 'seed', popid: r.pop }, { name: nameOf(r.pop), skipTexts: [r.line], includeStay: false, dropOwn: false });
  }
  for (const m of moments) {
    const all = [m.pop].concat(m.family);
    for (const pop of all) addPerson(pop, m.tag.toLowerCase() + ' this Cycle: ' + m.text, m.hood);
    passage({ text: all.map(pop => nameOf(pop)).join(' and ') + ' — ' + plainLife(m.tag, m.text) + (m.hood ? ', ' + m.hood : '') + ' (C' + cycle + ' — what happened in their life, not words they said)', src: logSrc, id: m.id, kind: 'moment', popid: m.pop },
      { name: nameOf(m.pop), skipTexts: [m.text], includeStay: false, dropOwn: false });
    for (const pop of m.family) {
      for (const t of threadFor(pop, { beats, logByPop, covered, tribune, ownId: m.id, name: nameOf(pop), skipTexts: [m.text], includeStay: false, dropOwn: false })) facts.push({ ...t, kind: 'thread', popid: pop });
      extraCovered.push(['moment:' + pop + ':' + cycle + ':' + m.tag, { popid: pop, kind: 'moment', cycle: Number(cycle), day }]);
    }
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
    return (who ? who.name : pg.popid) + ', own page (' + pg.where + ', C' + cycle + '): “' + pg.text.slice(0, 240) + (pg.text.length > 240 ? '…' : '') + '”';
  });

  const hooks = K.domainHooks(beats, cycle, SEAT.name,
    /^(FAMILY_CRISIS|FAMILY_CELEBRATION|FAMILY_REALIZED|HOUSEHOLD_DISSOLVED|HOUSEHOLD_ARRIVED|HOUSEHOLD_FORMED|CITIZEN_HOSPITALIZED|HOME_PURCHASE|CITIZEN_RELOCATED|CASINO_WIN)$/).slice(0, 6);

  // Mark today's batch covered — the next day takes the next batch.
  for (const f of facts) if (f.id) covered[f.id] = { popid: f.popid, kind: f.kind, cycle: Number(cycle), ...(f.eventCycle != null ? { eventCycle: Number(f.eventCycle) } : {}), day };
  for (const [k, v] of extraCovered) covered[k] = v;
  writeCovered(root, covered, cycle);

  const passages = facts.filter(f => f.kind !== 'thread');
  const leadFact = passages[0];
  const leadName = (people.find(p => p.popid === leadFact.popid) || {}).name || (todays[0] && todays[0].subjectName) || 'the first person';
  const label = leadFact.text.replace(/\s*\(C\d+[^)]*\)\.?.*$/, '').replace(/\. Since then.*$/, '');
  const leadHood = (todays[0] && todays[0].neighborhood) || (people.find(p => p.popid === leadFact.popid) || {}).hood || null;
  // The ref carries the day: the fanout drops a beat seat whose ref was already filed this Cycle
  // (newsroom-fanout.js staleBeatRef) — right for a weekly seat, fatal for a daily one.
  return K.makeSlice(SEAT, cycle, beats, {
    ref: evSrc + ' ' + dayToken(day), hood: leadHood,
    label,
    angle: 'The lives of C' + cycle + ': ' + passages.length + ' people — ' + label,
    hookLine: leadName + ' first. The event is the lead; one true detail; what came next only if the record says.',
    facts, people, hooks, pageVoices, factCap: 120, peopleCap: 16,
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
module.exports = { plainLife, lifeRank, SEAT, sitsOutWhenEmpty, kindWord, loadSlice, dayToken, buildLivesSlice: W.build, writeLivesSlice: W.write, loadLivesSlice: loadSlice,
  isLivesSeat: W.isSeat, assignmentFromSlice: W.assignmentFromSlice, enrichAssignment, slicePaths: W.paths,
  kindLine, cameNext, localDay, coveredPath, EVERY_PAGE, pageSlot, pageText, slotWord, ownPageLines };
