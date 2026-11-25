#!/usr/bin/env node
/**
 * buildTaliaRecord.js — Talia Finch's record: the Oaks on the sports feed, read live (pipeline.111; builder 2026-11-25:
 * "we should be sticking to the As build types and going section bu section"). Replaces buildOaksGroundSlice.js for her
 * seat: that builder made the newest row's FanSentiment / PlayerMood word her hook ("excited", C116), her angle and her
 * hood, and named the feed's people her sources. This hands her every public Oaks row of the current and previous
 * Cycle, the pieces the other sports seats filed this Cycle, her own, and the feed's people — no row made the story
 * (scripts/sportsRecord.js). Whom she goes to is hers (any citizen; cron-desk-run reporterPicks). Rebuilt every
 * morning (seat.live).
 * Artifacts: output/slices/c{N}/talia-finch.md · output/cron-compare/talia_record_slice_c{N}.json
 */
'use strict';
const K = require('./beatSliceKit');
const R = require('./sportsRecord');

const SEAT = {
  slug: 'talia-finch', name: 'Talia Finch', popid: 'POP-00592', desk: 'sports',
  kind: 'beat-sports-oaks-ground', domain: 'sports', artifact: 'talia_record', builder: 'buildTaliaRecord.js',
  version: 'TALIA-RECORD-1', nameRe: /talia\s*finch/i, live: true,
  tabs: [],
  approach: '',
  roomIsYours: '',
  build: null
};
SEAT.build = R.makeSportsRecord(SEAT, { teams: /\boaks\b/i, clubsLabel: 'the Oaks', colleagues: true, people: true, names: R.SPORTS_NAMES });

const sitsOutWhenEmpty = true;
const W = K.wire(SEAT);
if (require.main === module) W.main();
module.exports = { SEAT, sitsOutWhenEmpty, loadSlice: W.load, buildTaliaRecord: W.build, writeTaliaRecord: W.write, loadTaliaRecord: W.load,
  isTaliaSeat: W.isSeat, assignmentFromSlice: W.assignmentFromSlice, enrichAssignment: W.enrichAssignment, slicePaths: W.paths };
