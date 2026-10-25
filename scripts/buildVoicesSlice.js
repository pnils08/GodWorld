#!/usr/bin/env node
/**
 * buildVoicesSlice.js — Ines Sorensen's Voices slice (pipeline.73; the seat mints at C112).
 * What citizens said in their own words: the self-initiated wake pages (morning, midday,
 * afternoon, evening, night), the work-wake pages and their own lines in the day's exchange
 * (CONVO), read from output/citizen_pages/index.jsonl. PRESS replies are a reporter's
 * interview and already fed that day's article — never her subject. INTERVIEW and DISCORD
 * pages are the same: someone else asked.
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

const SEAT = {
  slug: 'ines-sorensen', name: 'Ines Sorensen', popid: null, desk: 'culture',
  kind: 'beat-voices', domain: 'voices', artifact: 'voices', builder: 'buildVoicesSlice.js',
  version: 'VOICES-SLICE-2', nameRe: /ines\s*sorensen/i,
  tabs: [],
  approach: 'Voices approach: this slice is a roster, a tip sheet, not your assignment — every citizen with a self-initiated page on the record, one line each. You pick whose own words carry the day, and why. The person\'s own line first, before their name; then who they are in one plain clause; then what in the city they were answering, from the page\'s own tags. Fewer, longer passages; the words are the product. Never a count, never a statistic, never an explanation of what they meant.',
  roomIsYours: 'where they were standing when they wrote it, the one plain clause that says who this is, the silence after their last line — never a word inside the quotation marks that is not on the page',
  build
};

const SELF_SLOTS = /^(morning|midday|afternoon|evening|night|work|CONVO)$/;
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

function slotWord(slot) {
  return slot === 'CONVO' ? 'in conversation' : slot === 'work' ? 'after work' : 'the ' + slot + ' page';
}

const ROSTER_SRC = 'output/citizen_pages/index.jsonl roster';
const OPENING_CHARS = 150;    // the opening of a citizen's latest line, so the roster reads like a tip sheet

function dayOf(iso) { return String(iso || '').slice(0, 10); }
function opening(text) {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  return t.length > OPENING_CHARS ? t.slice(0, OPENING_CHARS).replace(/\s+\S*$/, '') + '…' : t;
}

// pipeline.89 (builder 2026-10-25): the slice is the roster, not the pick. Every citizen with a
// self-initiated page in the store, one line each; the 36h set is marked "new since your last piece"
// as information. Nothing here chooses, caps, or counts her — covered is her memory, shown, never enforced.
function build(cycle, { root, profiles, now = new Date() }) {
  const covered = readCovered(root);
  const day = lives.localDay(now);
  const since = now.getTime() - WINDOW_HOURS * 3600 * 1000;
  const livesCovered = K.loadJson(lives.coveredPath(root)) || {};

  const all = readPages(root);
  const self = all.filter(d => d && d.docId && SELF_SLOTS.test(String(d.slot || '')));
  const eligible = self
    .map(d => ({ ...d, popid: String(d.popId || '').toUpperCase(), text: String(d.content || '').trim() }))
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
  const trail = 'index ' + all.length + ', self-initiated ' + self.length + ', long enough and on the ledger ' + eligible.length +
    ', citizens ' + byPop.size;
  if (!byPop.size) {
    return K.emptySlice(SEAT, cycle, 'no self-initiated citizen page on the ledger (output/citizen_pages/index.jsonl) — ' + trail);
  }

  // Newest latest-page first: an order to read in, not a choice made for her.
  const roster = Array.from(byPop.values()).sort((a, b) => Date.parse(b.latest.createdAt || '') - Date.parse(a.latest.createdAt || ''));
  const facts = [];
  const people = [];
  for (const r of roster) {
    const d = r.latest;
    const eventCovered = Object.values(livesCovered).find(v => v && v.popid === r.popid && Number(v.cycle) >= Number(cycle) - 1);
    const person = K.personFromProfile(profiles, r.popid, 'has ' + r.pages + ' self-initiated page' + (r.pages === 1 ? '' : 's') + ' on the record', null);
    if (!person) continue;
    people.push(person);
    const notes = [r.pages + ' page' + (r.pages === 1 ? '' : 's'),
      'latest ' + slotWord(d.slot) + ', C' + d.cycle + ', ' + dayOf(d.createdAt),
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
  if (!facts.length) return K.emptySlice(SEAT, cycle, 'the pages belong to citizens not on the ledger snapshot — ' + trail);

  const fresh = roster.filter(r => r.fresh).length;
  const label = 'Voices roster, ' + day + ': ' + people.length + ' citizens with pages' + (fresh ? ', ' + fresh + ' new since your last piece' : '');
  return K.makeSlice(SEAT, cycle, {}, {
    // the day in the ref: the fanout's staleBeatRef drops a seat whose ref was filed this Cycle
    ref: 'output/citizen_pages/index.jsonl (self-initiated pages, whole store) ' + day,
    hood: null, label,
    angle: 'Voices, ' + day + ': you pick whose own words carry the day',
    hookLine: 'Pick whoever you want from the roster; open on their own line, verbatim. Their words are the piece; yours are the frame.',
    facts, people, hooks: [], pageVoices: [],
    deltas: null, factCap: people.length, peopleCap: people.length,
    note: null,
    extra: { day, counted: { index: all.length, self: self.length, eligible: eligible.length, citizens: byPop.size, fresh } }
  });
}

// What Ines picked, resolved: every self-initiated page of each citizen she named, whole, as FACT lines in
// the slice's own shape. Read at the write stage from the angle's targets; the roster lines drop out there.
function pagesForPicks(pops, { root = K.ROOT, profiles } = {}) {
  const want = new Set((pops || []).map(p => String(p).toUpperCase()));
  const prof = profiles || K.loadProfiles(root);
  const out = [];
  if (!want.size) return out;
  const mine = readPages(root)
    .filter(d => d && d.docId && SELF_SLOTS.test(String(d.slot || '')))
    .map(d => ({ ...d, popid: String(d.popId || '').toUpperCase(), text: String(d.content || '').trim() }))
    .filter(d => want.has(d.popid) && d.text)
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
  const slice = SEAT.build(Number(cycle), { root, profiles, now: opts.now });
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
