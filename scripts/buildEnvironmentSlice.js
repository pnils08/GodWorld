#!/usr/bin/env node
/**
 * buildEnvironmentSlice.js — Noah Tan's weather / environment slice (pipeline.68 Task 4).
 * Source: Cycle_Weather (this cycle + the streak + the last three cycles in the
 * same table), the season-feel citizens the world summary says lived the weather
 * (buildSeasonFeelSlice, optional), Story_Hook_Deck hooks.
 * Artifacts: output/slices/c{N}/noah-tan.md · output/cron-compare/environment_slice_c{N}.json
 */
'use strict';
const fs = require('fs');
const path = require('path');
const K = require('./beatSliceKit');
const seasonFeel = require('./buildSeasonFeelSlice');

const SEAT = {
  slug: 'noah-tan', name: 'Noah Tan', popid: 'POP-00157', desk: 'civic',
  kind: 'beat-weather', domain: 'environment', artifact: 'environment', builder: 'buildEnvironmentSlice.js',
  version: 'ENVIRONMENT-SLICE-1', nameRe: /noah\s*tan/i,
  tabs: ['Cycle_Weather', 'Story_Hook_Deck'],
  approach: 'Weather and environment approach: this slice is the cycle\'s weather row, the streak, and the last three cycles beside it, plus whoever the record says lived it. Science-first ground translation — temperature is context, never the lede. Show what this weather moved.',
  roomIsYours: 'the sidewalk, the coats, what this weather does to a plan, who is out in it and who stayed in, what the bay smells like today',
  build
};

function build(cycle, { root, beats, profiles }) {
  const rows = (beats.Cycle_Weather || []).filter(r => K.num(r.CycleID) != null).sort((a, b) => K.num(a.CycleID) - K.num(b.CycleID));
  const now = rows.find(r => K.num(r.CycleID) === cycle);
  if (!now) return K.emptySlice(SEAT, cycle, 'no Cycle_Weather row for C' + cycle);
  const recent = rows.filter(r => K.num(r.CycleID) < cycle).slice(-3);
  const src = 'output/beats/Cycle_Weather.jsonl CycleID ' + cycle;
  const streak = K.num(now.Streak);
  const facts = [{
    text: 'This cycle: ' + now.Type + ', ' + now.Temp + '°F' + (now.Comfort ? ', comfort ' + now.Comfort : '') + (now.Mood ? ', mood ' + now.Mood : '') +
      (streak > 1 ? ', ' + streak + ' cycles of ' + now.StreakType : '') + (now.Advisory ? ', advisory: ' + now.Advisory : '') + (now.Alerts ? ', alerts: ' + now.Alerts : ''),
    src
  }];
  if (recent.length) {
    facts.push({ text: 'Last ' + recent.length + ' cycles: ' + recent.map(r => 'C' + r.CycleID + ' ' + r.Type + ' ' + r.Temp + '°F').join(', '), src: 'output/beats/Cycle_Weather.jsonl' });
  }
  // The people who lived the weather — optional, from the world summary.
  const people = [];
  try {
    const md = fs.readFileSync(path.join(root, 'output', 'world_summary_c' + cycle + '.md'), 'utf8');
    for (const row of seasonFeel.parseSeasonFeel(md, cycle, { root }).moved) {
      for (const [i, popid] of (row.popids || []).entries()) {
        if (people.some(p => p.popid === popid)) continue;
        const p = K.personFromProfile(profiles, popid, 'lived the weather this cycle (Who Lived It)', row.hood) ||
          K.person(popid, String((row.citizens || [])[i] || popid).replace(/\s*\(POP-[\d]+\)\s*/g, '').trim(), null, row.hood || null, 'lived the weather this cycle (Who Lived It)');
        people.push(p);
        facts.push({ text: row.text, src: row.src });
      }
    }
  } catch (_) { /* no world summary on disk: the weather row stands alone */ }
  const last = recent[recent.length - 1];
  const label = 'C' + cycle + ' ' + now.Type + ', ' + now.Temp + '°F' +
    (streak > 1 ? ' — ' + streak + ' cycles of ' + now.StreakType : (last && last.Type !== now.Type ? ' after ' + last.Type : ''));
  return K.makeSlice(SEAT, cycle, beats, {
    ref: src, hood: null, label,
    angle: label + ' — what this weather does to a day in the city',
    hookLine: label + (people.length ? '; ' + people.length + ' residents on the record lived it.' : '.'),
    facts, people,
    deltas: { state: recent.length ? 'PRIOR_CYCLE_IN_TABLE' : 'NO_PRIOR_CYCLE', vs: last ? K.num(last.CycleID) : null },
    hooks: K.hooksFor(beats, cycle, SEAT.name),
    note: people.length ? null : 'no resident on the record lived the weather this cycle — the people out in it are yours, unnamed',
    extra: { weather: now, recent }
  });
}

const W = K.wire(SEAT);
if (require.main === module) W.main();
module.exports = { SEAT, loadSlice: W.load, buildEnvironmentSlice: W.build, writeEnvironmentSlice: W.write, loadEnvironmentSlice: W.load,
  isEnvironmentSeat: W.isSeat, assignmentFromSlice: W.assignmentFromSlice, enrichAssignment: W.enrichAssignment, slicePaths: W.paths };
