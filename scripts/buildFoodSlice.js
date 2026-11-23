#!/usr/bin/env node
/**
 * buildFoodSlice.js — Mason Ortega's record: Oakland's restaurants, cafés, bars and food businesses as workplaces,
 * and the people who work them (pipeline.111, builder 2026-11-22: "1 - agreed, 2 - yes and he would maybe need which
 * are 'trending' … 3 - correct … yes keep the pattern"). Replaces the food variant of the business desk's economic
 * slice for his seat; Jordan Velez's slice is untouched.
 *
 * The record as the engine wrote it this Cycle, every hood, no kitchen made the story:
 *   Business_Ledger vs output/beats/prev/ — every food and drink business: sector, hood, headcount, revenue and
 *     growth, and how each moved since last Cycle (the trend the engine carries: applyBusinessDynamics moves
 *     Growth_Rate each Cycle from events, the hood, a game week at the bars, the weather)
 *   output/world_summary_c{N}.md ## What Moved › economic-event — closures, job losses, carryovers on a food business
 *   Employment_Roster — who works at each one, in what role
 *   LifeHistory_Log (this Cycle) — each worker's own lines (two each); workers with a line from work come first
 * The engine does not record which cause moved which business in a week; the move is on the record, the why is
 * not. A Cycle with nothing on the record sits him out.
 * Artifacts: output/slices/c{N}/mason-ortega.md · output/cron-compare/food_slice_c{N}.json
 */
'use strict';
const fs = require('fs');
const path = require('path');
const K = require('./beatSliceKit');
const { simYearFromCycle } = require('../lib/citizenDerivation');

const SEAT = {
  slug: 'mason-ortega', name: 'Mason Ortega', popid: 'POP-00160', desk: 'culture',
  kind: 'beat-food', domain: 'food', artifact: 'food', builder: 'buildFoodSlice.js',
  version: 'FOOD-SLICE-3', nameRe: /mason\s*ortega/i,
  tabs: ['Business_Ledger', 'Employment_Roster', 'LifeHistory_Log'],
  approach: '',
  roomIsYours: '',
  build
};

// Food and drink by the ledger's own Sector words; retail, services, transit and salons are not kitchens.
const FOOD_SECTOR = /restaurant|dining|\bfood\b|caf[eé]|\bbar\b|lounge|saloon|bakery|patisserie|brew|coffee|kitchen|grocer|taquer|ramen|pizz|wine|dessert|ice cream|farmers market|nightlife|karaoke|pool hall|music venue|dance club|quick service/i;
const NOT_FOOD = /salon|transit|^retail$|^services$/i;
const LINES_PER_WORKER = 2;
const PEOPLE_CAP = 40;

function money(n) {
  if (n == null) return null;
  const a = Math.abs(n);
  const s = a >= 1e6 ? '$' + (a / 1e6).toFixed(1) + 'M' : a >= 1e3 ? '$' + Math.round(a / 1e3) + 'k' : '$' + Math.round(a);
  return (n < 0 ? '-' : '') + s;
}

function build(cycle, { root, beats, profiles }) {
  const prev = K.prevTabRows(root, 'Business_Ledger');
  const prevById = new Map(prev.rows.map(b => [b.BIZ_ID, b]));
  const food = (beats.Business_Ledger || []).filter(b => b.BIZ_ID && b.Name &&
    FOOD_SECTOR.test(String(b.Sector || '')) && !NOT_FOOD.test(String(b.Sector || '').trim()));
  const foodIds = new Set(food.map(b => b.BIZ_ID));
  const facts = [];
  for (const b of food) {
    const p = prevById.get(b.BIZ_ID);
    const rev = K.num(b.Annual_Revenue), grow = K.num(b.Growth_Rate), emp = K.num(b.Employee_Count);
    const bits = [String(b.Name).trim() + ' (' + String(b.Sector).trim() + ')' + (b.Neighborhood ? ', ' + b.Neighborhood : '')];
    const now = [];
    if (emp != null) now.push(emp + ' employees');
    if (rev != null) now.push('revenue ' + money(rev));
    // Growth_Rate is a yearly rate (revenue moves about rate/52 a Cycle); C117 test day read "growth 13.6%" as a jump since last cycle.
    if (grow != null) now.push('growing ' + grow.toFixed(1) + '% a year');
    if (now.length) bits.push(now.join(', '));
    if (p) {
      const moves = [];
      const dg = grow != null && K.num(p.Growth_Rate) != null ? grow - K.num(p.Growth_Rate) : null;
      const dr = rev != null && K.num(p.Annual_Revenue) != null ? rev - K.num(p.Annual_Revenue) : null;
      const de = emp != null && K.num(p.Employee_Count) != null ? emp - K.num(p.Employee_Count) : null;
      if (dg) moves.push('yearly growth rate ' + (dg > 0 ? '+' : '') + dg.toFixed(1) + ' pts');
      if (dr) moves.push('revenue ' + (dr > 0 ? '+' : '') + money(dr));
      if (de) moves.push((de > 0 ? '+' : '') + de + ' employees');
      if (moves.length) bits.push('since C' + prev.vs + ': ' + moves.join(', '));
    }
    facts.push({ text: bits.join(' — '), src: 'output/beats/Business_Ledger.jsonl @C' + cycle + ' ' + b.BIZ_ID + (p ? ' vs prev/' : '') });
  }

  // The engine's own business events on a food business this Cycle (closure, job loss, carryover).
  const ws = path.join(root, 'output', 'world_summary_c' + cycle + '.md');
  if (fs.existsSync(ws)) {
    const lines = fs.readFileSync(ws, 'utf8').split('\n');
    const i = lines.findIndex(l => l.startsWith('### economic-event'));
    for (let j = i + 1; i >= 0 && j < lines.length && !lines[j].startsWith('#'); j++) {
      const t = lines[j].trim();
      const ids = (t.match(/BIZ-\d+/g) || []);
      if (t.startsWith('- ') && ids.some(id => foodIds.has(id))) {
        facts.push({ text: t.slice(2), src: 'output/world_summary_c' + cycle + '.md ## What Moved › economic-event (Ripple_Ledger)' });
      }
    }
  }

  const life = (beats.LifeHistory_Log || []).filter(r => String(r.Cycle) === String(cycle) && String(r.EventText || '').trim());
  const bizName = new Map(food.map(b => [b.BIZ_ID, String(b.Name).trim()]));
  const workers = (beats.Employment_Roster || [])
    .filter(w => foodIds.has(w.BIZ_ID) && /^POP-\d+$/i.test(String(w.POP_ID || '')) && !/inactive|former|left/i.test(String(w.Status || '')))
    .map(w => {
      const pop = String(w.POP_ID).toUpperCase();
      const own = life.filter(r => String(r.POPID).toUpperCase() === pop);
      const fromWork = own.filter(r => /source:occupation\b/.test(String(r.EventTag || '')));
      return { w, pop, lines: fromWork.concat(own.filter(r => !fromWork.includes(r))).slice(0, LINES_PER_WORKER).map(r => String(r.EventText).trim()), atWork: fromWork.length > 0 };
    })
    .sort((a, b) => (b.atWork - a.atWork) || (b.lines.length - a.lines.length));
  const people = [];
  for (const x of workers) {
    if (x.pop === SEAT.popid || people.some(p => p.popid === x.pop) || people.length >= PEOPLE_CAP) continue;
    const why = String(x.w.RoleType || 'works').trim() + ' at ' + bizName.get(x.w.BIZ_ID) + (x.lines.length ? '; C' + cycle + ': ' + x.lines.join('; ') : '');
    const p = K.personFromProfile(profiles, x.pop, why);
    if (!p) continue;
    // His craft quotes a cook by name and age (voice file); the age is the row's, never his guess (C117 test day: 34 for a 20-year-old).
    const by = K.num((profiles.get(x.pop) || {}).BirthYear);
    if (by) p.age = simYearFromCycle(cycle) - by;
    p.business = bizName.get(x.w.BIZ_ID);
    p.profile = p.profile + (p.age ? ' — age ' + p.age : '') + ' — ' + why;   // the reason rides where every packet prints the person
    people.push(p);
  }

  if (!facts.length && !people.length) return K.emptySlice(SEAT, cycle, 'no food or drink business on the ledger this cycle');
  return K.makeSlice(SEAT, cycle, beats, {
    ref: 'the food and drink record of C' + cycle, hood: null, label: 'the food and drink record of C' + cycle,
    angle: 'the food and drink record of C' + cycle, hookLine: '',
    facts, people, peopleCap: PEOPLE_CAP, factCap: Math.max(12, facts.length),
    deltas: { state: prev.state, vs: prev.vs }, hooks: [], note: null,
    extra: { businesses: food.length, workers: workers.length }
  });
}

const sitsOutWhenEmpty = true;
const W = K.wire(SEAT);
if (require.main === module) W.main();
module.exports = { SEAT, sitsOutWhenEmpty, loadSlice: W.load, buildFoodSlice: W.build, writeFoodSlice: W.write, loadFoodSlice: W.load,
  isFoodSeat: W.isSeat, assignmentFromSlice: W.assignmentFromSlice, enrichAssignment: W.enrichAssignment, slicePaths: W.paths };
