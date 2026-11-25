#!/usr/bin/env node
/**
 * buildPSlayerRecord.js — P Slayer's record: the A's and the Oaks on the sports feed, read live (pipeline.111; builder
 * 2026-11-25: "I think he can report on the Oaks as well" — "Sounds good and we can make sure Talia has a different
 * approach"). Replaces buildPSlayerSlice.js for his seat: that builder scored the feed, made the top score his story and
 * wrote his charge, his modes, his foil number and how Oakland should feel. This hands him every public A's and Oaks
 * row of the current and previous Cycle, the pieces the other sports seats filed this Cycle, and his own — no row made
 * the story (scripts/sportsRecord.js). Rebuilt every morning (seat.live). No row sits him out.
 * Artifacts: output/slices/c{N}/p-slayer.md · output/cron-compare/pslayer_record_slice_c{N}.json
 */
'use strict';
const K = require('./beatSliceKit');
const R = require('./sportsRecord');

const SEAT = {
  slug: 'p-slayer', name: 'P Slayer', popid: 'POP-00008', desk: 'sports',
  kind: 'beat-sports-oakland', domain: 'sports', artifact: 'pslayer_record', builder: 'buildPSlayerRecord.js',
  version: 'PSLAYER-RECORD-1', nameRe: /p\.?\s*slayer/i, live: true,
  tabs: [],
  approach: '',
  roomIsYours: '',
  build: null
};
SEAT.build = R.makeSportsRecord(SEAT, { teams: /\bA['’]s\b|athletics|\boaks\b/i, clubsLabel: 'the A\'s and the Oaks', colleagues: true, people: true, names: R.SPORTS_NAMES });

const sitsOutWhenEmpty = true;
const W = K.wire(SEAT);
if (require.main === module) W.main();
module.exports = { SEAT, sitsOutWhenEmpty, loadSlice: W.load, buildPSlayerRecord: W.build, writePSlayerRecord: W.write, loadPSlayerRecord: W.load,
  isPSlayerSeat: W.isSeat, assignmentFromSlice: W.assignmentFromSlice, enrichAssignment: W.enrichAssignment, slicePaths: W.paths };
