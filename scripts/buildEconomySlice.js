#!/usr/bin/env node
/**
 * buildEconomySlice.js — Jordan Velez's record: Oakland's economy and labor (pipeline.111, builder 2026-11-22:
 * "1 - agree 2 - ok , i think his casino feed in citizend winning or losing 4 - … yes follow pattern"). Replaces the
 * business desk's economic slice for his seat (buildEconomicSlice.js: its one-hood rotation, angle, hooks, seeds).
 *
 * The record as the engine wrote it this Cycle, the whole city, no business or hood made the story:
 *   Business_Ledger vs output/beats/prev/ — the businesses that moved (headcount changes, negative growth, the 10 biggest
 *     growth-rate moves each way) with headcount, revenue, 'growing X% a year' and the move; one line per sector for the
 *     rest (builder 2026-11-23: the morning carries the movement, the whole ledger is his sheet tool)
 *   output/world_summary_c{N}.md ## What Moved › economic-event — closures, job losses, carryovers
 *   Casino_Ledger — the Cycle's wagers by tracked citizens: who staked what on which market, who won, who lost, voids
 *   Neighborhood_Map — each hood's median income, median rent, housing pressure and trajectory
 *   City_Treasury — the Cycle's money in and out
 *   Employment_Roster + LifeHistory_Log — workers at the businesses that moved, and citizens' own work and money lines
 * A Cycle with nothing on the record sits him out.
 * Artifacts: output/slices/c{N}/business-desk.md · output/cron-compare/economy_slice_c{N}.json
 */
'use strict';
const fs = require('fs');
const path = require('path');
const K = require('./beatSliceKit');

const SEAT = {
  slug: 'business-desk', name: 'Jordan Velez', popid: 'POP-00153', desk: 'business',
  kind: 'beat-economy', domain: 'economy', artifact: 'economy', builder: 'buildEconomySlice.js',
  version: 'ECONOMY-SLICE-3', nameRe: /jordan\s*velez/i,
  tabs: ['Business_Ledger', 'Employment_Roster', 'Casino_Ledger', 'Neighborhood_Map', 'City_Treasury', 'LifeHistory_Log'],
  approach: '',
  roomIsYours: '',
  build
};

const PEOPLE_CAP = 25;
const MOVERS_EACH_WAY = 10;   // builder 2026-11-23 ("go, do jordan and maria"): the morning gets the movement; the whole ledger is his sheet tool
const WORK_LINE = /(^|\|)(source:(economy|occupation)|Promotion|Setback|Strain|Business-Gain|Business-Owner|LifeEvent-Promotion[^|]*)(\||$)/;

function money(n) {
  if (n == null) return null;
  const a = Math.abs(n);
  const s = a >= 1e6 ? '$' + (a / 1e6).toFixed(1) + 'M' : a >= 1e3 ? '$' + Math.round(a / 1e3) + 'k' : '$' + Math.round(a);
  return (n < 0 ? '-' : '') + s;
}

function build(cycle, { root, beats, profiles }) {
  const cyc = Number(cycle);
  const facts = [];
  const people = [];
  const add = (popid, why) => {
    const id = String(popid || '').toUpperCase();
    if (!/^POP-\d+$/.test(id) || id === SEAT.popid || K.isMediaStaff(profiles, id) || people.some(p => p.popid === id) || people.length >= PEOPLE_CAP) return;
    const p = K.personFromProfile(profiles, id, why);
    if (!p) return;
    p.profile = p.profile + ' — ' + why;   // the reason rides where every packet prints the person
    people.push(p);
  };
  const life = (beats.LifeHistory_Log || []).filter(r => String(r.Cycle) === String(cycle) && String(r.EventText || '').trim());

  // Every business, the movers first.
  const prev = K.prevTabRows(root, 'Business_Ledger');
  const prevById = new Map(prev.rows.map(b => [b.BIZ_ID, b]));
  const rows = (beats.Business_Ledger || []).filter(b => b.BIZ_ID && b.Name).map(b => {
    const p = prevById.get(b.BIZ_ID);
    const rev = K.num(b.Annual_Revenue), grow = K.num(b.Growth_Rate), emp = K.num(b.Employee_Count);
    const dg = p && grow != null && K.num(p.Growth_Rate) != null ? grow - K.num(p.Growth_Rate) : null;
    const dr = p && rev != null && K.num(p.Annual_Revenue) != null ? rev - K.num(p.Annual_Revenue) : null;
    const de = p && emp != null && K.num(p.Employee_Count) != null ? emp - K.num(p.Employee_Count) : null;
    return { b, rev, grow, emp, dg, dr, de, hasPrev: !!p };
  }).sort((x, y) => ((y.de ? 1 : 0) - (x.de ? 1 : 0)) || (((y.grow != null && y.grow < 0) ? 1 : 0) - ((x.grow != null && x.grow < 0) ? 1 : 0)) ||
    (Math.abs(y.dg || 0) - Math.abs(x.dg || 0)));
  // The morning carries the movement: every headcount change and every business in negative growth, the biggest
  // growth-rate moves each way, and one line per sector. Every other business is on the Business_Ledger his sheet tool reads.
  const keep = new Set(rows.filter(x => x.de || (x.grow != null && x.grow < 0)).map(x => x.b.BIZ_ID));
  for (const x of rows.filter(x => x.dg > 0).sort((a, b) => b.dg - a.dg).slice(0, MOVERS_EACH_WAY)) keep.add(x.b.BIZ_ID);
  for (const x of rows.filter(x => x.dg < 0).sort((a, b) => a.dg - b.dg).slice(0, MOVERS_EACH_WAY)) keep.add(x.b.BIZ_ID);
  const sectors = new Map();
  for (const x of rows) {
    const k = String(x.b.Sector || 'Other').trim();
    const t = sectors.get(k) || { n: 0, emp: 0, up: 0, down: 0 };
    t.n++; t.emp += x.emp || 0; if (x.dg > 0) t.up++; if (x.dg < 0) t.down++;
    sectors.set(k, t);
  }
  const sectorLine = [...sectors.entries()].sort((a, b) => b[1].emp - a[1].emp)
    .map(([k, t]) => k + ' ' + t.n + ' (' + t.emp + ' jobs, ' + t.up + ' up, ' + t.down + ' down)').join('; ');
  if (rows.length) facts.push({ text: 'All ' + rows.length + ' businesses by sector, C' + cycle + ': ' + sectorLine + ' — the rest of the ledger is on Business_Ledger',
    src: 'output/beats/Business_Ledger.jsonl @C' + cycle + ' vs prev/' });   // agy 2026-11-23 #3: an empty ledger adds no line, so an empty record still sits him out
  for (const x of rows.filter(x => keep.has(x.b.BIZ_ID))) {
    const bits = [String(x.b.Name).trim() + ' (' + String(x.b.Sector || '').trim() + ')' + (x.b.Neighborhood ? ', ' + x.b.Neighborhood : '')];
    const now = [];
    if (x.emp != null) now.push(x.emp + ' employees');
    if (x.rev != null) now.push('revenue ' + money(x.rev));
    if (x.grow != null) now.push('growing ' + x.grow.toFixed(1) + '% a year');
    if (now.length) bits.push(now.join(', '));
    const moves = [];
    if (x.dg) moves.push('yearly growth rate ' + (x.dg > 0 ? '+' : '') + x.dg.toFixed(1) + ' pts');
    if (x.dr) moves.push('revenue ' + (x.dr > 0 ? '+' : '') + money(x.dr));
    if (x.de) moves.push((x.de > 0 ? '+' : '') + x.de + ' employees');
    if (moves.length) bits.push('since C' + prev.vs + ': ' + moves.join(', '));
    facts.push({ text: bits.join(' — '), src: 'output/beats/Business_Ledger.jsonl @C' + cycle + ' ' + x.b.BIZ_ID + (x.hasPrev ? ' vs prev/' : '') });
  }
  // The engine's own business events.
  const ws = path.join(root, 'output', 'world_summary_c' + cycle + '.md');
  if (fs.existsSync(ws)) {
    const lines = fs.readFileSync(ws, 'utf8').split('\n');
    const i = lines.findIndex(l => l.startsWith('### economic-event'));
    for (let j = i + 1; i >= 0 && j < lines.length && !lines[j].startsWith('#'); j++) {
      const t = lines[j].trim();
      if (t.startsWith('- ')) facts.push({ text: t.slice(2), src: 'output/world_summary_c' + cycle + '.md ## What Moved › economic-event (Ripple_Ledger)' });
    }
  }

  // The casino: citizens winning and losing this cycle.
  const wagers = (beats.Casino_Ledger || []).filter(r => String(r.WagerId || '').toUpperCase() !== 'HOUSE' &&
    (Number(r.CyclePlaced) === cyc || Number(r.CycleSettled) === cyc));
  if (wagers.length) {
    const fam = {};
    for (const w of wagers.filter(w => Number(w.CyclePlaced) === cyc)) fam[w.MarketFamily || 'other'] = (fam[w.MarketFamily || 'other'] || 0) + 1;
    const settled = wagers.filter(w => Number(w.CycleSettled) === cyc && /^settled-(win|loss)$/.test(String(w.Status || '')));
    const voids = wagers.filter(w => Number(w.CycleSettled) === cyc && /void/.test(String(w.Status || ''))).length;
    facts.push({ text: 'Casino C' + cycle + ': ' + Object.entries(fam).map(([k, n]) => n + ' ' + k + ' wagers placed').join(', ') +
      '; ' + settled.length + ' settled, ' + voids + ' voided', src: 'output/beats/Casino_Ledger.jsonl @C' + cycle });
    const houseRow = (beats.Casino_Ledger || []).find(r => String(r.WagerId || '').toUpperCase() === 'HOUSE');
    if (houseRow && K.num(houseRow.HouseFloatAfter) != null) facts.push({ text: 'Casino house float: ' + money(K.num(houseRow.HouseFloatAfter)), src: 'output/beats/Casino_Ledger.jsonl HOUSE' });
    for (const w of settled) {
      const prof = profiles.get(String(w.POPID || '').toUpperCase());
      if (!prof || !prof.Name) continue;
      const won = /win/.test(w.Status);
      const line = String(prof.Name).trim() + ' ' + (won ? 'won' : 'lost') + ' on ' + (w.MarketFamily || 'a market') + ' (' + (w.Side || '') + ')' +
        ' — staked ' + money(K.num(w.Stake)) + (won ? ', paid ' + money(K.num(w.Payout)) : ', the house kept it');
      facts.push({ text: line, src: 'output/beats/Casino_Ledger.jsonl ' + w.WagerId });
      add(w.POPID, 'C' + cycle + ': ' + line.replace(String(prof.Name).trim() + ' ', ''));
    }
    for (const w of wagers.filter(w => Number(w.CyclePlaced) === cyc).slice(0, 6)) {
      add(w.POPID, 'C' + cycle + ': staked ' + money(K.num(w.Stake)) + ' on ' + (w.MarketFamily || 'a market') + ' (' + (w.Side || '') + '), ' + String(w.Status || 'open'));
    }
  }

  // Workers at the businesses that shed or added staff, or sit in negative growth — after the casino's winners and
  // losers, so a heavy week of movers cannot crowd every bettor off his list (agy 2026-11-23 #3).
  const moved = new Map(rows.filter(x => x.de || (x.grow != null && x.grow < 0)).map(x => [x.b.BIZ_ID, x]));
  for (const w of (beats.Employment_Roster || []).filter(w => moved.has(w.BIZ_ID))) {
    const x = moved.get(w.BIZ_ID);
    const own = life.filter(r => String(r.POPID).toUpperCase() === String(w.POP_ID).toUpperCase()).slice(0, 1).map(r => String(r.EventText).trim());
    add(w.POP_ID, String(w.RoleType || 'works').trim() + ' at ' + String(x.b.Name).trim() +
      (x.de ? ' (' + (x.de > 0 ? '+' : '') + x.de + ' employees this cycle)' : ' (negative growth)') + (own.length ? '; C' + cycle + ': ' + own[0] : ''));
  }

  // Each hood's money: income, rent, pressure.
  for (const h of (beats.Neighborhood_Map || []).filter(h => h.Neighborhood)) {
    const bits = [];
    if (K.num(h.MedianIncome) != null) bits.push('median income ' + money(K.num(h.MedianIncome)));
    if (K.num(h.MedianRent) != null) bits.push('median rent ' + money(K.num(h.MedianRent)));
    if (h.HousingPressure !== '' && h.HousingPressure != null) bits.push('housing pressure ' + h.HousingPressure);
    if (h.Trajectory || h.NeighborhoodTrajectory) bits.push('trajectory ' + (h.Trajectory || h.NeighborhoodTrajectory));
    if (bits.length) facts.push({ text: String(h.Neighborhood).trim() + ': ' + bits.join(', '), src: 'output/beats/Neighborhood_Map.jsonl @C' + cycle });
  }

  // The city's money this cycle.
  for (const t of (beats.City_Treasury || []).filter(t => String(t.Cycle) === String(cycle))) {
    facts.push({ text: 'City treasury C' + cycle + ': ' + String(t.Entry || '').toLowerCase() + ' ' + money(K.num(t.Amount)) + ' (' + (t.Note || t.Counterparty || '') + '), balance after ' + money(K.num(t.BalanceAfter)),
      src: 'output/beats/City_Treasury.jsonl @C' + cycle });
  }

  // Citizens' own work and money lines.
  for (const r of life.filter(r => WORK_LINE.test(String(r.EventTag || '')))) add(r.POPID, 'C' + cycle + ': ' + String(r.EventText).trim());

  if (!facts.length && !people.length) return K.emptySlice(SEAT, cycle, 'nothing on the economy record this cycle');
  return K.makeSlice(SEAT, cycle, beats, {
    ref: 'the economy record of C' + cycle, hood: null, label: 'the economy record of C' + cycle,
    angle: 'the economy record of C' + cycle, hookLine: '',
    facts, people, peopleCap: PEOPLE_CAP, factCap: Math.max(12, facts.length),
    deltas: { state: prev.state, vs: prev.vs }, hooks: [], note: null,
    extra: { businesses: rows.length, wagers: wagers.length }
  });
}

const sitsOutWhenEmpty = true;
const W = K.wire(SEAT);
if (require.main === module) W.main();
module.exports = { SEAT, sitsOutWhenEmpty, loadSlice: W.load, buildEconomySlice: W.build, writeEconomySlice: W.write, loadEconomySlice: W.load,
  isEconomySeat: W.isSeat, assignmentFromSlice: W.assignmentFromSlice, enrichAssignment: W.enrichAssignment, slicePaths: W.paths };
