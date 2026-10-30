#!/usr/bin/env node
/**
 * buildVoicesSlice.js — Ines Sorensen's Voices slice (pipeline.73; the seat mints at C112).
 * What citizens said in their own words, read from output/citizen_pages/index.jsonl. Until pipeline.97: the
 * self-initiated wake pages (morning, midday, afternoon, evening, night), the work-wake pages and their own
 * lines in the day's exchange (CONVO); PRESS, INTERVIEW and DISCORD were left out because someone else asked.
 * pipeline.97 (builder 2026-10-30: "everything should be available to the media, I think Ines and Tamsin should
 * have access to all this"): every page the collector admits — interview replies, debates, talks and the
 * questions a citizen carries too — through citizenText (buildLivesSlice EVERY_PAGE, one switch for both seats).
 *
 * pipeline.89 (builder 2026-10-25): the slice is a roster, not the pick. Every citizen with a
 * self-initiated page on the record, one line each; the last 36h are marked "new since your last
 * piece" as information. Ines picks (her angle's targets); the write stage resolves each pick's pages,
 * whole (pagesForPicks). output/cron-compare/voices_covered.json is her memory of who she has run,
 * written when a piece files (recordRan), shown on the roster, never enforced. Journalists and the
 * masthead (MEDIA clock) stay out — the newsroom talking to itself is not a citizen's voice.
 *
 * No beat-dump dependency on purpose: she runs Wed–Sun and a Sunday run before or after the
 * fire reads the pages like any other day (the kit's dump gate would throw on the Cycle
 * boundary, so this builder never calls it).
 * Artifacts: output/slices/c{N}/ines-sorensen.md · output/cron-compare/voices_slice_c{N}.json
 */
'use strict';
const fs = require('fs');
const path = require('path');
const K = require('./beatSliceKit');
const lives = require('./buildLivesSlice');

// The writer's approach names the rule the roster ran (codex pipeline.97 F4).
function approachFor(every) {
  return 'Voices approach: this slice is a roster, a tip sheet, not your assignment — every citizen with a ' + (every ? '' : 'self-initiated ') + 'page on the record, one line each. You pick whose own words carry the day, and why. The person\'s own line first, before their name; then who they are in one plain clause; then what in the city they were answering, from the page\'s own tags. Fewer, longer passages; the words are the product. Never a count, never a statistic, never an explanation of what they meant.';
}

const SEAT = {
  slug: 'ines-sorensen', name: 'Ines Sorensen', popid: null, desk: 'culture',
  kind: 'beat-voices', domain: 'voices', artifact: 'voices', builder: 'buildVoicesSlice.js',
  version: 'VOICES-SLICE-2', nameRe: /ines\s*sorensen/i,
  tabs: [],
  approach: approachFor(lives.EVERY_PAGE),
  roomIsYours: 'where they were standing when they wrote it, the one plain clause that says who this is, the silence after their last line — never a word inside the quotation marks that is not on the page',
  build
};

// every: buildLivesSlice EVERY_PAGE by default; a caller (the tests) may name either rule.
const onPage = every => d => d && d.docId && lives.pageSlot(d.slot, 'voices', every);
const what = every => every ? 'page' : 'self-initiated page';
const WINDOW_HOURS = 36;      // marks a page "new since your last piece" — information only, picks nothing
const MIN_CHARS = 80;         // a line too short to carry a passage

function coveredPath(root) { return path.join(root, 'output', 'cron-compare', 'voices_covered.json'); }
function readCovered(root) { return K.loadJson(coveredPath(root)) || {}; }
function writeCovered(root, covered, cycle) {
  const keep = {};
  for (const [id, v] of Object.entries(covered)) { const at = v.ranCycle || v.cycle; if (!at || Number(at) >= Number(cycle) - 2) keep[id] = v; }
  fs.mkdirSync(path.dirname(coveredPath(root)), { recursive: true });
  fs.writeFileSync(coveredPath(root), JSON.stringify(keep, null, 2));
}

function readPages(root) {
  const out = [];
  let text = '';
  try { text = fs.readFileSync(path.join(root, 'output', 'citizen_pages', 'index.jsonl'), 'utf8'); } catch (_) { return out; }
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    try { out.push(JSON.parse(line)); } catch (_) { /* a bad line is not a page */ }
  }
  return out;
}

function isMedia(profile) {
  if (!profile) return false;
  return String(profile.ClockMode || '').trim().toUpperCase() === 'MEDIA' ||
    /^y/i.test(String(profile['MED (y/n)'] || profile.MED || '').trim());
}

const slotWord = lives.slotWord;

const ROSTER_SRC = 'output/citizen_pages/index.jsonl roster';
const OPENING_CHARS = 150;    // the opening of a citizen's latest line, so the roster reads like a tip sheet

function opening(text) {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  return t.length > OPENING_CHARS ? t.slice(0, OPENING_CHARS).replace(/\s+\S*$/, '') + '…' : t;
}

// pipeline.89 (builder 2026-10-25): the slice is the roster, not the pick. Every citizen with a
// self-initiated page in the store, one line each; the 36h set is marked "new since your last piece"
// as information. Nothing here chooses, caps, or counts her — covered is her memory, shown, never enforced.
function build(cycle, { root, profiles, now = new Date(), everyPage = lives.EVERY_PAGE }) {
  const seat = { ...SEAT, approach: approachFor(everyPage) };
  const covered = readCovered(root);
  const day = lives.localDay(now);
  const since = now.getTime() - WINDOW_HOURS * 3600 * 1000;
  const livesCovered = K.loadJson(lives.coveredPath(root)) || {};

  const all = readPages(root);
  const self = all.filter(onPage(everyPage));
  const eligible = self
    .map(d => ({ ...d, popid: String(d.popId || '').toUpperCase(), text: lives.pageText(d.content, everyPage) }))
    .filter(d => d.popid && d.text.length >= MIN_CHARS)
    .filter(d => { const p = profiles.get(d.popid); return p && String(p.Name || '').trim() && !isMedia(p); });
  const ranBefore = new Map();
  for (const v of Object.values(covered)) if (v && v.popid) ranBefore.set(v.popid, Math.max(ranBefore.get(v.popid) || 0, Number(v.ranCycle || v.cycle) || 0));

  const byPop = new Map();
  for (const d of eligible) {
    const cur = byPop.get(d.popid) || { popid: d.popid, pages: 0, latest: null, fresh: false };
    cur.pages += 1;
    if (!cur.latest || Date.parse(d.createdAt || '') > Date.parse(cur.latest.createdAt || '')) cur.latest = d;
    const t = Date.parse(d.createdAt || '');
    if (Number.isFinite(t) && t >= since && !covered[d.docId]) cur.fresh = true;
    byPop.set(d.popid, cur);
  }
  const trail = 'index ' + all.length + ', ' + (everyPage ? 'readable ' : 'self-initiated ') + self.length + ', long enough and on the ledger ' + eligible.length +
    ', citizens ' + byPop.size;
  if (!byPop.size) {
    return K.emptySlice(seat, cycle, 'no ' + (everyPage ? '' : 'self-initiated ') + 'citizen page on the ledger (output/citizen_pages/index.jsonl) — ' + trail);
  }

  // Newest latest-page first: an order to read in, not a choice made for her.
  const roster = Array.from(byPop.values()).sort((a, b) => Date.parse(b.latest.createdAt || '') - Date.parse(a.latest.createdAt || ''));
  const facts = [];
  const people = [];
  for (const r of roster) {
    const d = r.latest;
    const eventCovered = Object.values(livesCovered).find(v => v && v.popid === r.popid && Number(v.cycle) >= Number(cycle) - 1);
    const person = K.personFromProfile(profiles, r.popid, 'has ' + r.pages + ' ' + what(everyPage) + (r.pages === 1 ? '' : 's') + ' on the record', null);
    if (!person) continue;
    people.push(person);
    const notes = [r.pages + ' page' + (r.pages === 1 ? '' : 's'),
      'latest ' + slotWord(d.slot) + ', C' + d.cycle,
      r.fresh ? 'new since your last piece' : null,
      ranBefore.has(r.popid) ? 'you ran them C' + ranBefore.get(r.popid) : null,
      eventCovered ? 'Lives carried ' + lives.kindWord(eventCovered.kind) + ' this Cycle' : null].filter(Boolean);
    facts.push({
      text: person.name + (person.role ? ', ' + person.role : '') + (person.neighborhood ? ', ' + person.neighborhood : '') +
        ' (' + r.popid + ') — ' + notes.join('; ') + ': “' + opening(d.text) + '”',
      src: ROSTER_SRC,
      docId: d.docId, popid: r.popid, slot: d.slot, cycle: Number(d.cycle)
    });
  }
  if (!facts.length) return K.emptySlice(seat, cycle, 'the pages belong to citizens not on the ledger snapshot — ' + trail);

  const fresh = roster.filter(r => r.fresh).length;
  const label = 'Voices roster, C' + cycle + ': ' + people.length + ' citizens with pages' + (fresh ? ', ' + fresh + ' new since your last piece' : '');
  return K.makeSlice(seat, cycle, {}, {
    // the day in the ref: the fanout's staleBeatRef drops a seat whose ref was filed this Cycle
    ref: 'output/citizen_pages/index.jsonl (' + what(everyPage) + 's, whole store) ' + lives.dayToken(day),
    hood: null, label,
    angle: 'Voices, C' + cycle + ': you pick whose own words carry the day',
    hookLine: 'Pick whoever you want from the roster; open on their own line, verbatim. Their words are the piece; yours are the frame.',
    facts, people, hooks: [], pageVoices: [],
    deltas: null, factCap: people.length, peopleCap: people.length,
    note: null,
    extra: { day, counted: { index: all.length, self: self.length, eligible: eligible.length, citizens: byPop.size, fresh } }
  });
}

// What Ines picked, resolved: every readable page (onPage) of each citizen she named, whole, as FACT lines in
// the slice's own shape. Read at the write stage from the angle's targets; the roster lines drop out there.
function pagesForPicks(pops, { root = K.ROOT, profiles, everyPage = lives.EVERY_PAGE } = {}) {
  const want = new Set((pops || []).map(p => String(p).toUpperCase()));
  const prof = profiles || K.loadProfiles(root);
  const out = [];
  if (!want.size) return out;
  // A pick is hers (the resolver does not second-guess it); a reporter she names reads by the old rule (readsEvery).
  const mine = readPages(root)
    .map(d => ({ ...d, popid: String(d.popId || '').toUpperCase() }))
    .map(d => ({ ...d, rule: lives.readsEvery(everyPage, prof.get(d.popid)) }))
    .filter(d => want.has(d.popid) && onPage(d.rule)(d))
    .map(d => ({ ...d, text: lives.pageText(d.content, d.rule) }))
    .filter(d => d.text)
    .sort((a, b) => Date.parse(a.createdAt || '') - Date.parse(b.createdAt || ''));
  for (const d of mine) {
    const person = K.personFromProfile(prof, d.popid, '', null);
    if (!person) continue;
    out.push({
      text: '“' + d.text + '” — ' + person.name + (person.role ? ', ' + person.role : '') + (person.neighborhood ? ', ' + person.neighborhood : '') +
        ' (own page, ' + slotWord(d.slot) + ', C' + d.cycle + ')',
      src: 'output/citizen_pages/index.jsonl ' + d.customId,
      docId: d.docId, popid: d.popid, slot: d.slot, cycle: Number(d.cycle)
    });
  }
  return out;
}

// Her memory of who she has run: written when a piece is filed, from the pages her picks resolved to.
function recordRan(pagesFound, cycle, root = K.ROOT) {
  const covered = readCovered(root);
  const day = lives.localDay();
  for (const f of pagesFound) covered[f.docId] = { popid: f.popid, slot: f.slot, cycle: f.cycle, day, ranCycle: Number(cycle) };
  writeCovered(root, covered, cycle);
}

const W = K.wire(SEAT);
function buildSlice(cycle, opts = {}) {
  const root = opts.root || K.ROOT;
  const profiles = opts.profiles || K.loadProfiles(root);
  const slice = SEAT.build(Number(cycle), { root, profiles, now: opts.now, everyPage: opts.everyPage });
  if (slice && !slice.empty) slice.seat.builder = SEAT.builder;
  return slice;
}
function loadSlice(cycle, root = K.ROOT) {
  const cached = K.loadJson(W.paths(cycle, root).json);
  if (cached && cached.version === SEAT.version && !cached.empty && cached.day === lives.localDay()) return cached;
  const slice = buildSlice(cycle, { root });
  W.write(cycle, slice, root);
  return slice.empty ? null : slice;
}
function enrichAssignment(assign, cycle, root = K.ROOT) {
  if (!W.isSeat(assign)) return assign;
  const slice = loadSlice(cycle, root);
  // Nothing new on the pages today → null: the fanout (or a --persona wake) sits the seat out, never the generic packet.
  return slice ? W.assignmentFromSlice(slice, assign) : null;
}
const sitsOutWhenEmpty = true;   // an empty page store only; the whole-store roster is never empty otherwise
function main() {
  const cycle = K.arg('--cycle', null) || (() => {
    try { return require(path.join(K.ROOT, 'lib', 'getCurrentCycle'))({ soft: true, noArgv: true }); } catch (_) { return null; }
  })();
  if (!cycle) { console.error('usage: node scripts/buildVoicesSlice.js --cycle N'); process.exit(2); }
  const slice = buildSlice(cycle);
  const p = W.write(cycle, slice);
  console.log((slice.empty ? 'EMPTY — ' + slice.reason : slice.label) + ' → ' + path.relative(K.ROOT, p.md));
}
if (require.main === module) main();
module.exports = { SEAT, sitsOutWhenEmpty, loadSlice, buildVoicesSlice: buildSlice, writeVoicesSlice: W.write, loadVoicesSlice: loadSlice,
  pagesForPicks, recordRan, ROSTER_SRC, isVoicesSeat: W.isSeat, assignmentFromSlice: W.assignmentFromSlice, enrichAssignment, slicePaths: W.paths, isMedia, coveredPath };
