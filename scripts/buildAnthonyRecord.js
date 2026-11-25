#!/usr/bin/env node
/**
 * buildAnthonyRecord.js — Anthony Raines's record: the A's on the sports feed, read live (pipeline.111; builder
 * 2026-11-24: "they see the headlines and they cover the stories"; "just read the sheets live that way anything that
 * happens during the week gets covered and doesn't wait til the cycle runs").
 *
 * Replaces buildAnthonySlice.js for his seat: that builder scored every feed row, made the top score his story, wrote
 * his claim and picked two of his methods. This one hands him every public A's row of the current and the previous
 * Cycle — newest first, each whole as the sheet holds it, no row made the story — from the morning's live copy of the
 * feed (sportsFeedLive.js). The season so far and the players' cards are his tools (sheet_read, dossier_read, Gridiron).
 * Rebuilt every morning (seat.live): a row added mid-week is in front of him the next morning he wakes.
 * No A's row in the window sits him out.
 * Artifacts: output/slices/c{N}/anthony-raines.md · output/cron-compare/anthony_record_slice_c{N}.json
 */
'use strict';
const K = require('./beatSliceKit');
const live = require('./sportsFeedLive');

const SEAT = {
  slug: 'anthony-raines', name: 'Anthony Raines', popid: 'POP-00017', desk: 'sports',
  kind: 'beat-sports-as', domain: 'sports_analytics', artifact: 'anthony_record', builder: 'buildAnthonyRecord.js',
  version: 'ANTHONY-RECORD-1', nameRe: /anthony\s*raines/i, live: true,
  tabs: [],
  approach: '',
  roomIsYours: '',
  build
};

const AS = /\bA['’]s\b|athletics/i;
const MAX_AGE_MS = 20 * 3600 * 1000;   // the 06:15 copy still serves the 18:15 write

function rowText(r) {
  const bits = ['C' + r.Cycle + (r.SeasonType ? ' (' + r.SeasonType + ')' : '') + ' · ' + (r.EventType || 'feed') +
    (r.NamesUsed ? ' · ' + r.NamesUsed : '') + ':', r.Notes || r.StoryAngle || ''];
  if (r.Stats) bits.push('| Stats: ' + r.Stats);
  if (r['Team Record']) bits.push('| Team record: ' + r['Team Record']);
  if (r.Streak) bits.push('| Streak: ' + r.Streak);
  if (r.WeekRecord) bits.push('| Week: ' + r.WeekRecord);
  return bits.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
}

function build(cycle, { root }) {
  const feed = live.load(root);
  if (!feed) return K.emptySlice(SEAT, cycle, 'the morning copy of the sports feed is missing (sportsFeedLive.js)');
  // a copy older than a day is not this morning's: a failed refresh never hands him last week (agy 2026-11-24 step 2 #3)
  const age = Date.now() - Date.parse(feed.readAt || 0);
  if (!(age >= 0 && age < MAX_AGE_MS)) return K.emptySlice(SEAT, cycle, 'the sports feed copy was read ' + (feed.readAt || 'never') + ' — not this morning\'s; he sits the day out');
  const cyc = (r) => (String(r.Cycle || '').trim() === '' ? NaN : Number(r.Cycle));
  const as = feed.rows.filter((r) => AS.test(r.TeamsUsed || '') && cyc(r) >= Number(cycle) - 1 && cyc(r) <= Number(cycle) + 1);
  const read = new Date(feed.readAt).toLocaleDateString('en-CA', { timeZone: 'America/Chicago' });
  const facts = as.sort((a, b) => b.row - a.row).map((r) => ({ text: rowText(r), src: 'Oakland_Sports_Feed row ' + r.row + ' (live, read ' + read + ')' }));
  if (!facts.length) return K.emptySlice(SEAT, cycle, 'no A\'s row on the sports feed for C' + (cycle - 1) + '–C' + cycle);
  const newest = as.reduce((m, r) => Math.max(m, r.row), 0);
  const lo = Math.min(...as.map(cyc)), hi = Math.max(...as.map(cyc));
  return K.makeSlice(SEAT, cycle, {}, {
    ref: 'the A\'s on the sports feed, C' + lo + (hi !== lo ? '–C' + hi : '') + ', through row ' + newest, factChars: 6000,
    hood: null, label: 'the A\'s on the sports feed', angle: 'the A\'s on the sports feed', hookLine: '',
    facts, people: [], factCap: facts.length, deltas: null, hooks: [], note: null,
    extra: { rows: facts.length, readAt: feed.readAt }
  });
}

const sitsOutWhenEmpty = true;
const W = K.wire(SEAT);
if (require.main === module) W.main();
module.exports = { SEAT, sitsOutWhenEmpty, loadSlice: W.load, buildAnthonyRecord: W.build, writeAnthonyRecord: W.write, loadAnthonyRecord: W.load,
  isAnthonySeat: W.isSeat, assignmentFromSlice: W.assignmentFromSlice, enrichAssignment: W.enrichAssignment, slicePaths: W.paths };
