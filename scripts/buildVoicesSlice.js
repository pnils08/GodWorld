#!/usr/bin/env node
/**
 * buildVoicesSlice.js — Ines Sorensen's Voices slice (pipeline.73; the seat mints at C112).
 * What citizens said in their own words: the self-initiated wake pages (morning, midday,
 * afternoon, evening, night), the work-wake pages and their own lines in the day's exchange
 * (CONVO), read from output/citizen_pages/index.jsonl. PRESS replies are a reporter's
 * interview and already fed that day's article — never her subject. INTERVIEW and DISCORD
 * pages are the same: someone else asked.
 *
 * No beat-dump dependency on purpose: she runs Wed–Sun and a Sunday run before or after the
 * fire reads the pages like any other day (the kit's dump gate would throw on the Cycle
 * boundary, so this builder never calls it). Daily: the pages written since the last run,
 * minus the ones she already carried (output/cron-compare/voices_covered.json, keyed by page
 * docId). Journalists and the masthead (MEDIA clock) stay out — the newsroom talking to
 * itself is not a citizen's voice. Athletes are in (the sportsSubject exclusion is lifted).
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
  version: 'VOICES-SLICE-1', nameRe: /ines\s*sorensen/i,
  tabs: [],
  approach: 'Voices approach: this slice is what citizens wrote on their own pages — verbatim, attributed, the day it happened. The person\'s own line first, before their name; then who they are in one plain clause; then what in the city they were answering, from the page\'s own tags. Fewer, longer passages; the words are the product. Never a count, never a statistic, never an explanation of what they meant.',
  roomIsYours: 'where they were standing when they wrote it, the one plain clause that says who this is, the silence after their last line — never a word inside the quotation marks that is not on the page',
  build
};

const SELF_SLOTS = /^(morning|midday|afternoon|evening|night|work|CONVO)$/;
const WINDOW_HOURS = 36;      // the pages since the last run, with a day's slack for a skipped run
const PER_DAY = 4;            // two to four citizens, each their own passage
const MIN_CHARS = 80;         // a line too short to carry a passage

function coveredPath(root) { return path.join(root, 'output', 'cron-compare', 'voices_covered.json'); }
function readCovered(root) { return K.loadJson(coveredPath(root)) || {}; }
function writeCovered(root, covered, cycle) {
  const keep = {};
  for (const [id, v] of Object.entries(covered)) if (!v.cycle || Number(v.cycle) >= Number(cycle) - 2) keep[id] = v;
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

function build(cycle, { root, profiles, now = new Date() }) {
  const covered = readCovered(root);
  const day = lives.localDay(now);
  const since = now.getTime() - WINDOW_HOURS * 3600 * 1000;
  const livesCovered = K.loadJson(lives.coveredPath(root)) || {};

  const all = readPages(root);
  const self = all.filter(d => d && d.docId && SELF_SLOTS.test(String(d.slot || '')));
  const inWindow = self.filter(d => { const t = Date.parse(d.createdAt || ''); return Number.isFinite(t) && t >= since; });
  const eligible = inWindow
    .map(d => ({ ...d, popid: String(d.popId || '').toUpperCase(), text: String(d.content || '').trim() }))
    .filter(d => d.popid && d.text.length >= MIN_CHARS)
    .filter(d => { const p = profiles.get(d.popid); return p && String(p.Name || '').trim() && !isMedia(p); });
  const candidates = eligible.filter(d => !covered[d.docId]);
  const trail = 'index ' + all.length + ', self-initiated ' + self.length + ', in the last ' + WINDOW_HOURS + 'h ' + inWindow.length +
    ', long enough and on the ledger ' + eligible.length + ', not yet carried ' + candidates.length;

  // Oldest first so a page is not skipped twice; one page per citizen per day, the longest if several.
  candidates.sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
  const byPop = new Map();
  for (const d of candidates) {
    const cur = byPop.get(d.popid);
    if (!cur || d.text.length > cur.text.length) byPop.set(d.popid, d);
  }
  // One exchange passage a day: both sides of a conversation are one scene, not two voices.
  let convo = 0;
  const todays = Array.from(byPop.values()).filter(d => d.slot !== 'CONVO' || convo++ === 0).slice(0, PER_DAY);
  if (!todays.length) {
    return K.emptySlice(SEAT, cycle, (eligible.length && !candidates.length
      ? 'every page of the last ' + WINDOW_HOURS + ' hours is already carried'
      : 'no self-initiated citizen page to carry (output/citizen_pages/index.jsonl)') + ' — ' + trail);
  }

  const facts = [];
  const people = [];
  for (const d of todays) {
    const p = profiles.get(d.popid);
    const eventCovered = Object.values(livesCovered).find(v => v && v.popid === d.popid && Number(v.cycle) >= Number(cycle) - 1);
    const why = 'wrote it on their own page — ' + slotWord(d.slot) + ', C' + d.cycle +
      (d.event ? ', about ' + String(d.event).toLowerCase() : '') + (d.affect ? ', feeling ' + String(d.affect).toLowerCase() : '') +
      (eventCovered ? '; Lives carried ' + lives.kindWord(eventCovered.kind) + ' this Cycle — you carry the words, not the event' : '');
    const person = K.personFromProfile(profiles, d.popid, why, null);
    if (!person) continue;
    people.push(person);
    facts.push({
      text: '“' + d.text + '” — ' + person.name + (person.role ? ', ' + person.role : '') + (person.neighborhood ? ', ' + person.neighborhood : '') +
        ' (own page, ' + slotWord(d.slot) + ', C' + d.cycle + ')',
      src: 'output/citizen_pages/index.jsonl ' + d.customId,
      docId: d.docId, popid: d.popid, slot: d.slot, cycle: Number(d.cycle)
    });
  }
  if (!facts.length) return K.emptySlice(SEAT, cycle, 'the pages of the day belong to citizens not on the ledger snapshot');

  for (const f of facts) covered[f.docId] = { popid: f.popid, slot: f.slot, cycle: f.cycle, day };
  writeCovered(root, covered, cycle);

  const lead = people[0];
  const label = lead.name + ' in their own words' + (people.length > 1 ? ', and ' + (people.length - 1) + ' more' : '');
  return K.makeSlice(SEAT, cycle, {}, {
    // the day in the ref: the fanout's staleBeatRef drops a seat whose ref was filed this Cycle
    ref: 'output/citizen_pages/index.jsonl (self-initiated pages, last ' + WINDOW_HOURS + 'h) ' + day,
    hood: lead.neighborhood || null, label,
    angle: 'Voices, ' + day + ': ' + label,
    hookLine: 'Open on ' + lead.name + '\'s own line, verbatim. Their words are the piece; yours are the frame.',
    facts, people, hooks: [], pageVoices: facts.map(f => f.text),
    deltas: null,
    note: candidates.length > todays.length ? (byPop.size - todays.length) + ' more citizens wrote today and wait for the next run' : null,
    extra: { day, counted: { index: all.length, self: self.length, inWindow: inWindow.length, candidates: candidates.length, citizens: byPop.size, todays: todays.length } }
  });
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
const sitsOutWhenEmpty = true;
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
  isVoicesSeat: W.isSeat, assignmentFromSlice: W.assignmentFromSlice, enrichAssignment, slicePaths: W.paths, isMedia, coveredPath };
