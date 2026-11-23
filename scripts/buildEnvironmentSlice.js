#!/usr/bin/env node
/**
 * buildEnvironmentSlice.js — Noah Tan's weather / environment slice (pipeline.68 Task 4).
 * pipeline.111 (builder 2026-11-23: "Same approach as the rest"): his record is the city's weather and environment —
 *   Cycle_Weather: this cycle's row and the last seven beside it (type, temperature, impact, comfort, mood, streak,
 *     advisories, alerts)
 *   output/world_summary_c{N}.md: the chaos events (fires, outages, crises) and the season-feel citizens (Who Lived It)
 *   output/neighborhood_texture_c{N}.md: each hood's line that names the weather or the air (fog, smoke, wind …)
 *   LifeHistory_Log: citizens' own weather and season lines this cycle, each person with their line
 * No angle, no hooks. The engine keeps one weather row a Cycle; no air quality, rain total or tide is modeled.
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
  version: 'ENVIRONMENT-SLICE-3', nameRe: /noah\s*tan/i,
  tabs: ['Cycle_Weather', 'LifeHistory_Log'],
  approach: '',
  roomIsYours: '',
  build
};

const WEATHER_WORDS = /\b(fog|foggy|rain|rained|raining|drizzle|wind|windy|breeze|breezy|heat|hot|humid|cold|chill|chilly|frost|smoke|smoky|haze|hazy|storm|sunset|sunrise|sunshine|sunny|overcast|cloud|clouds|tide|mist|misty|weather|air)\b/i;
const RECENT = 7;
const PEOPLE_CAP = 25;

function build(cycle, { root, beats, profiles }) {
  const rows = (beats.Cycle_Weather || []).filter(r => K.num(r.CycleID) != null).sort((a, b) => K.num(a.CycleID) - K.num(b.CycleID));
  const now = rows.find(r => K.num(r.CycleID) === cycle);
  if (!now) return K.emptySlice(SEAT, cycle, 'no Cycle_Weather row for C' + cycle);
  const recent = rows.filter(r => K.num(r.CycleID) < cycle).slice(-RECENT);
  const src = 'output/beats/Cycle_Weather.jsonl CycleID ' + cycle;
  const streak = K.num(now.Streak);
  const facts = [{
    text: 'This cycle: ' + now.Type + ', ' + now.Temp + '°F' + (now.Impact ? ', impact ' + now.Impact : '') +
      (now.Comfort ? ', comfort ' + now.Comfort : '') + (now.Mood ? ', mood ' + now.Mood : '') +
      (streak > 1 ? ', ' + streak + ' cycles of ' + now.StreakType : '') + (now.Advisory ? ', advisory: ' + now.Advisory : '') + (now.Alerts ? ', alerts: ' + now.Alerts : ''),
    src
  }];
  if (recent.length) {
    facts.push({ text: 'Last ' + recent.length + ' cycles: ' + recent.map(r => 'C' + r.CycleID + ' ' + r.Type + ' ' + r.Temp + '°F' + (r.Alerts ? ' (alerts: ' + r.Alerts + ')' : '')).join(', '), src: 'output/beats/Cycle_Weather.jsonl' });
  }
  const people = [];
  const add = (p, why) => {
    if (!p || !p.popid || p.popid === SEAT.popid || K.isMediaStaff(profiles, p.popid) || people.some(x => x.popid === p.popid) || people.length >= PEOPLE_CAP) return;
    if (why) p.profile = p.profile + ' — ' + why;
    people.push(p);
  };
  let md = '';
  try { md = fs.readFileSync(path.join(root, 'output', 'world_summary_c' + cycle + '.md'), 'utf8'); } catch (_) { md = ''; }
  if (md) {
    const lines = md.split('\n');
    const ci = lines.findIndex(l => l.startsWith('### chaos-event'));
    for (let k = ci + 1; ci >= 0 && k < lines.length && !lines[k].startsWith('#'); k++) {
      if (lines[k].startsWith('- ')) facts.push({ text: lines[k].slice(2).trim(), src: 'output/world_summary_c' + cycle + '.md ## What Moved › chaos-event (Ripple_Ledger)' });
    }
    try {
      for (const row of seasonFeel.parseSeasonFeel(md, cycle, { root }).moved) {
        if (!WEATHER_WORDS.test(String(row.text || ''))) continue;   // the section carries faith, food and events too — not his
        facts.push({ text: row.text, src: row.src });
        for (const [i, popid] of (row.popids || []).entries()) {
          const p = K.personFromProfile(profiles, popid, 'lived the weather this cycle (Who Lived It)', row.hood) ||
            K.person(popid, String((row.citizens || [])[i] || popid).replace(/\s*\(POP-[\d]+\)\s*/g, '').trim(), null, row.hood || null, 'lived the weather this cycle (Who Lived It)');
          add(p, 'lived the weather this cycle');
        }
      }
    } catch (_) { /* no season-feel section */ }
  }
  // Each hood's texture line that names the weather or the air.
  const tex = path.join(root, 'output', 'neighborhood_texture_c' + cycle + '.md');
  if (fs.existsSync(tex)) {
    let hood = null;
    for (const line of fs.readFileSync(tex, 'utf8').split('\n')) {
      const m = line.match(/^###\s+(.+?)\s*$/);
      if (m) { hood = m[1]; continue; }
      if (hood && line.trim() && WEATHER_WORDS.test(line)) facts.push({ text: hood + ': ' + line.trim(), src: 'output/neighborhood_texture_c' + cycle + '.md ### ' + hood });
    }
  }
  // Citizens' own weather and season lines.
  for (const r of (beats.LifeHistory_Log || []).filter(r => String(r.Cycle) === String(cycle) && String(r.EventText || '').trim() &&
      (/(^|\|)source:season(\||$)/.test(String(r.EventTag || '')) || WEATHER_WORDS.test(String(r.EventText))))) {
    const popid = String(r.POPID || '').toUpperCase();
    const why = 'C' + cycle + (r.Neighborhood ? ' in ' + r.Neighborhood : '') + ': ' + String(r.EventText).trim();
    add(K.personFromProfile(profiles, popid, why, r.Neighborhood), why);
  }
  const last = recent[recent.length - 1];
  return K.makeSlice(SEAT, cycle, beats, {
    ref: 'the weather and environment record of C' + cycle, hood: null, label: 'the weather and environment record of C' + cycle,
    angle: 'the weather and environment record of C' + cycle, hookLine: '',
    facts, people, peopleCap: PEOPLE_CAP, factCap: Math.max(12, facts.length),
    deltas: { state: recent.length ? 'PRIOR_CYCLE_IN_TABLE' : 'NO_PRIOR_CYCLE', vs: last ? K.num(last.CycleID) : null },
    hooks: [], note: null,
    extra: { weather: now, recent }
  });
}

const sitsOutWhenEmpty = true;
const W = K.wire(SEAT);
if (require.main === module) W.main();
module.exports = { SEAT, sitsOutWhenEmpty, loadSlice: W.load, buildEnvironmentSlice: W.build, writeEnvironmentSlice: W.write, loadEnvironmentSlice: W.load,
  isEnvironmentSeat: W.isSeat, assignmentFromSlice: W.assignmentFromSlice, enrichAssignment: W.enrichAssignment, slicePaths: W.paths };
