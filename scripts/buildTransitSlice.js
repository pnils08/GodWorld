#!/usr/bin/env node
/**
 * buildTransitSlice.js — Trevor Shimizu's transit slice (pipeline.68 Task 4).
 * Source: output/beats/Transit_Metrics.jsonl (this cycle vs the prior cycle in
 * the same table — 8 BART stations + 10 traffic corridors per cycle), transit
 * workers from the roster
 * (Public Transit / Transit & Infrastructure BIZ_IDs), Story_Hook_Deck hooks.
 * TRANSIT-SLICE-2 (engine.290, builder 2026-10-15 "riders fluctuate, holidays,
 * games, any chaos car that lands on transit, citizens that land a transit
 * event as a seed"): a week header (the union of the engine's Factors causes,
 * Cycle_Weather, the sports feed's home weeks), the chaos car on the line from
 * world_summary ## Chaos Events (Chaos_Cars is not a beats tab), and the
 * citizens whose LifeHistory line this cycle is a transit line (ECL
 * `transit:disruption` / `transit:crew` tags, text fallback) as sources.
 * Artifacts: output/slices/c{N}/trevor-shimizu.md · output/cron-compare/transit_slice_c{N}.json
 */
'use strict';
const path = require('path');
const K = require('./beatSliceKit');

const SEAT = {
  slug: 'trevor-shimizu', name: 'Trevor Shimizu', popid: 'POP-00155', desk: 'civic',
  kind: 'beat-transit', domain: 'transit', artifact: 'transit', builder: 'buildTransitSlice.js',
  version: 'TRANSIT-SLICE-2', nameRe: /trevor\s*shimizu/i,
  tabs: ['Transit_Metrics', 'Employment_Roster', 'Business_Ledger', 'Story_Hook_Deck', 'Cycle_Weather', 'Oakland_Sports_Feed', 'LifeHistory_Log', 'Story_Seed_Deck'],
  approach: 'Transit approach: this slice is every station on the record this cycle, what moved against last cycle, and the transit workers on the roster. The week header (weather, home games, the union of causes), the chaos car on the line and the citizens who lived a transit line are record; the Factors on each station row are the engine\'s own causes — riders rise and fall for the reasons written there (holiday, First Friday, game day, events, a stalled train, a short crew, crowded platforms), never for a reason you add. A BART-train chaos hit this cycle reaches the platforms NEXT cycle. Dry, technical, timestamp and pattern — but it is a place with people in it. One system, one claim about what changed.',
  roomIsYours: 'the platform at 7:40, the operator\'s cab, who is late and why, what the fare gate sounds like, what a regular rider notices first',
  build
};

function build(cycle, { root, beats, profiles }) {
  root = root || K.ROOT;
  profiles = profiles || K.loadProfiles(root);
  const all = beats.Transit_Metrics || [];
  const rows = all.filter(r => Number(r.Cycle) === cycle);
  if (!rows.length) return K.emptySlice(SEAT, cycle, 'no Transit_Metrics rows for C' + cycle);
  // engine.290 move 3: the engine moved to the ledger-share base this cycle —
  // every row carries `rebased` in Factors, and last cycle's numbers were on
  // the old authored table. No delta, lead mover or total comparison is true.
  const rebased = rows.some(r => /\brebased\b/.test(r.Factors || ''));
  const prev = rebased ? [] : all.filter(r => Number(r.Cycle) === cycle - 1);
  const REBASED = 'rebased this cycle — not comparable';
  // Composite key: corridor rows carry no Station and used to collide under
  // the empty string — every corridor delta read off one shared prev entry.
  // Stations key by station name, corridors by corridor name.
  const keyOf = r => ((r.Station || '') !== '' ? 'S:' + r.Station : 'C:' + (r.Corridor || ''));
  const prevBy = new Map(prev.map(r => [keyOf(r), r]));
  const src = 'output/beats/Transit_Metrics.jsonl Cycle ' + cycle;
  const isStation = r => (r.Station || '') !== '';
  // Cause: the engine's Factors column (post-causal-frame cycles) names why a
  // row moved; older rows fall back to the Notes texture column.
  const causeOf = r => r.Factors || r.Notes || null;
  const stations = rows.filter(isStation).map(r => {
    const p = prevBy.get(keyOf(r));
    const rid = K.num(r.RidershipVolume), otp = K.num(r.OnTimePerformance);
    const pr = p ? K.num(p.RidershipVolume) : null, po = p ? K.num(p.OnTimePerformance) : null;
    return {
      station: r.Station, ridership: rid, onTime: otp, corridor: r.Corridor || null, cause: causeOf(r),
      dRidership: rid != null && pr != null ? rid - pr : null,
      dOnTime: otp != null && po != null ? Math.round((otp - po) * 100) : null
    };
  });
  const corridors = rows.filter(r => !isStation(r)).map(r => {
    const p = prevBy.get(keyOf(r));
    const tix = K.num(r.TrafficIndex);
    const pt = p ? K.num(p.TrafficIndex) : null;
    return {
      corridor: r.Corridor, traffic: tix, cause: causeOf(r),
      dTraffic: tix != null && pt != null ? tix - pt : null
    };
  });
  const movers = stations.filter(s => s.dRidership != null).sort((a, b) => Math.abs(b.dRidership) - Math.abs(a.dRidership));
  const lead = movers[0] || stations.slice().sort((a, b) => (b.ridership || 0) - (a.ridership || 0))[0];
  const total = stations.reduce((a, s) => a + (s.ridership || 0), 0);
  const prevTotal = prev.filter(isStation).reduce((a, r) => a + (K.num(r.RidershipVolume) || 0), 0);
  const inventory = stations.length + ' stations' + (corridors.length ? ' + ' + corridors.length + ' corridors' : '');
  const facts = [];
  // --- the week on the line (TRANSIT-SLICE-2): the engine's causes across every row, once each
  const seenCause = new Set();
  const causes = [];
  for (const r of rows) {
    for (const tok of String(r.Factors || '').split(';').map(t => t.trim()).filter(Boolean)) {
      if (/^base: |^rebased$|^no row: /.test(tok) || seenCause.has(tok)) continue;
      seenCause.add(tok); causes.push(tok);
    }
  }
  if (causes.length) facts.push({ text: 'The week on the line — every cause the engine named this cycle, once: ' + causes.join('; '), src: 'output/beats/Transit_Metrics.jsonl Cycle ' + cycle + ' Factors' });
  const weather = (beats.Cycle_Weather || []).find(w => Number(w.CycleID) === cycle);
  if (weather) {
    facts.push({
      text: 'Weather this cycle: ' + (weather.Type || 'unrecorded') + (weather.Temp ? ', ' + weather.Temp + '°F' : '') +
        (weather.Advisory ? ', advisory: ' + weather.Advisory : '') + (weather.Alerts ? ', alerts: ' + weather.Alerts : '') +
        (Number(weather.Streak) > 1 ? ' (' + weather.Streak + ' cycles of ' + (weather.StreakType || weather.Type) + ')' : ''),
      src: 'output/beats/Cycle_Weather.jsonl CycleID ' + cycle
    });
  }
  // games = game-result rows only (applySportsSeason_ accepts games on that EventType alone); features and notes are not crowds
  const games = (beats.Oakland_Sports_Feed || []).filter(g => Number(g.Cycle) === cycle && /^game-result$/i.test(String(g.EventType || '').trim()) && String(g.HomeNeighborhood || '').trim());
  for (const g of games.slice(0, 4)) {
    facts.push({
      text: 'Game on the sports feed this cycle: ' + (g.TeamsUsed || 'the home side') + ' at ' + String(g.HomeNeighborhood).trim() +
        (g.Notes ? ' — ' + String(g.Notes).trim() : g.StoryAngle ? ' — ' + String(g.StoryAngle).trim() : '') + ' (the rider lift is real only where a station row says "game day")',
      src: 'output/beats/Oakland_Sports_Feed.jsonl Cycle ' + cycle
    });
  }
  if (!games.length) facts.push({ text: 'No game-result row on the sports feed this cycle — no game-day crowds on the platforms', src: 'output/beats/Oakland_Sports_Feed.jsonl Cycle ' + cycle });
  // --- the chaos car on the line: world_summary ## Chaos Events (Chaos_Cars is not a beats tab)
  const summaryPath = 'output/world_summary_c' + cycle + '.md';
  const summary = K.loadText(path.join(root, summaryPath));
  const chaosSec = K.extractSection(summary, 'Chaos Events');
  const chaos = [];
  if (chaosSec) {
    const transitHit = cells => /^bart_train$/i.test(cells[0]) || /BIZ-00013|BIZ-00014/.test(cells[2] || '');
    for (const line of chaosSec.split('\n')) {
      const t = line.trim();
      if (t.startsWith('|')) {
        const cells = t.split('|').slice(1, -1).map(c => c.trim());
        if (cells.length < 5 || /^Vehicle$/i.test(cells[0]) || /^-+$/.test(cells[0])) continue;
        if (transitHit(cells)) chaos.push({ vehicle: cells[0], outcome: cells[1], target: cells[2], metric: cells[3], magnitude: cells[4], seed: null });
      } else if (t.startsWith('- ')) {
        const m = t.match(/^- (\S+) → (.+?): (.+)$/);
        if (m && (/^bart_train$/i.test(m[1]) || /BIZ-00013|BIZ-00014/.test(m[2]))) {
          const row = chaos.find(c => c.vehicle === m[1] && !c.seed && (c.target || '').indexOf(m[2]) >= 0) || chaos.find(c => c.vehicle === m[1] && !c.seed);
          if (row) row.seed = m[3]; else chaos.push({ vehicle: m[1], outcome: null, target: m[2], metric: null, magnitude: null, seed: m[3] });
        }
      }
    }
    if (chaos.length) {
      for (const c of chaos) {
        facts.push({
          text: 'Chaos car on the line this cycle: ' + c.vehicle + (c.outcome ? ' — ' + c.outcome.replace(/_/g, ' ') : '') + ' → ' + c.target +
            (c.metric && c.magnitude ? ' (' + c.metric + ' ' + c.magnitude + ')' : '') + (c.seed ? ' — ' + c.seed : '') +
            (/^bart_train$/i.test(c.vehicle) ? '. The engine carries a train hit one cycle: it reaches the platforms on NEXT cycle\'s station rows as "BART train: … (last week)"' : ''),
          src: summaryPath + ' ## Chaos Events'
        });
      }
    } else {
      facts.push({ text: 'No chaos car touched the trains or the transit agencies this cycle (Chaos_Cars rows read; none on bart_train, BART or AC Transit)', src: summaryPath + ' ## Chaos Events' });
    }
  }
  facts.push({
    text: inventory + ' on the record this cycle; total ridership ' + K.fmtInt(total) +
      (rebased ? ' (' + REBASED + ')' : prev.length ? ' (C' + (cycle - 1) + ': ' + K.fmtInt(prevTotal) + ')' : ' (no prior cycle in the table)'),
    src
  });
  for (const st of (movers.length ? movers : stations)) {
    facts.push({
      text: st.station + ': ridership ' + K.fmtInt(st.ridership) +
        (st.dRidership != null ? ' (' + (st.dRidership >= 0 ? '+' : '') + K.fmtInt(st.dRidership) + ' vs C' + (cycle - 1) + ')' : rebased ? ' (' + REBASED + ')' : '') +
        (st.onTime != null ? ', on-time ' + Math.round(st.onTime * 100) + '%' : '') +
        (st.dOnTime ? ' (' + (st.dOnTime > 0 ? '+' : '') + st.dOnTime + ' pts)' : '') +
        (st.corridor ? ', ' + st.corridor : '') + (st.cause ? ' — ' + st.cause : ''),
      src
    });
  }
  for (const co of corridors) {
    facts.push({
      text: co.corridor + ': traffic index ' + K.fmtInt(co.traffic) +
        (co.dTraffic != null ? ' (' + (co.dTraffic >= 0 ? '+' : '') + K.fmtInt(co.dTraffic) + ' vs C' + (cycle - 1) + ')' : rebased ? ' (' + REBASED + ')' : '') +
        (co.cause ? ' — ' + co.cause : ''),
      src
    });
  }
  const people = K.rosterAtSectors(beats, /\bpublic transit\b|\btransit & infrastructure\b/i)
    .map(w => K.person(w.popid, w.name, w.role, null, 'works at ' + w.business + ' (Employment_Roster)', w.business));
  const byPop = new Map(people.map(p => [p.popid, p]));
  const addPerson = (popid, why, hood, fallbackName) => {
    const id = String(popid || '').toUpperCase();
    if (!/^POP-\d+$/.test(id)) return;
    if (byPop.has(id)) { byPop.get(id).why += '; ' + why; return; }
    const p = K.personFromProfile(profiles, id, why, hood) || (fallbackName ? K.person(id, fallbackName, null, hood, why) : null);
    if (p) { byPop.set(id, p); people.push(p); }
  };
  // citizens who lived a transit line this cycle — the ECL rows tag them transit:*; older lines fall back to the text
  const life = (beats.LifeHistory_Log || []).filter(r => Number(r.Cycle) === cycle);
  const tagged = life.filter(r => /(^|\|)transit:/.test(String(r.EventTag || '')));
  const transitText = /\bBART\b|\btrain\b|\bplatform\b|\bcommut|\bfare gate\b|\btransit\b|\bstation\b/i;
  const rosterCount = people.length;
  const lived = tagged.concat(life.filter(r => tagged.indexOf(r) < 0 && transitText.test(String(r.EventText || '')))).slice(0, 8);
  for (const r of lived) {
    if (String(r.POPID || '').toUpperCase() === SEAT.popid) continue; // the reporter is not his own source
    const tag = /(^|\|)transit:crew\b/.test(String(r.EventTag || '')) ? 'crew line' : /(^|\|)transit:disruption\b/.test(String(r.EventTag || '')) ? 'rode the disruption' : 'transit line';
    addPerson(r.POPID, 'lived it this cycle (' + tag + '): "' + String(r.EventText || '').trim() + '" (LifeHistory_Log)', r.Neighborhood || null, String(r.Name || '').trim() || null);
  }
  for (const c of chaos) {
    const m = String(c.target || '').match(/citizen\s+(POP-\d+)/i);
    if (m) addPerson(m[1], 'the chaos car found them this cycle: ' + c.vehicle + (c.outcome ? ' ' + c.outcome.replace(/_/g, ' ') : '') + ' (world_summary Chaos_Cars)', null, null);
  }
  // Story_Seed_Deck rows on the civic desk that speak transit — colour, like hooks
  const seedHooks = K.seedsFor(beats, cycle, /civic/i)
    .filter(sd => /\btransit\b|\bBART\b|\btrain\b|\bstation\b|\brail\b/i.test(JSON.stringify(sd))).slice(0, 4)
    .map(sd => ({ text: 'Story seed' + (sd.seedId ? ' ' + sd.seedId : '') + (sd.hood ? ' (' + sd.hood + ')' : '') + ': ' +
      sd.citizens.map(c => c.name).filter(Boolean).join(', ') + (sd.citizenEvents.length ? ' — ' + sd.citizenEvents.join('; ') : ''), angle: sd.domain || null }));
  const dir = lead.dRidership == null ? null : (lead.dRidership >= 0 ? 'up' : 'down');
  const label = lead.station + (dir ? ' ridership ' + dir + ' ' + K.fmtInt(Math.abs(lead.dRidership)) + ' vs C' + (cycle - 1)
    : ' ridership ' + K.fmtInt(lead.ridership)) + ' | ' + inventory + ' on the record' + (rebased ? ' (' + REBASED + ')' : '');
  const slice = K.makeSlice(SEAT, cycle, beats, {
    ref: src, hood: null, label,
    angle: label + ' — the platforms and the people who run them',
    hookLine: lead.station + (dir ? ' moved ' + dir + ' the most' : ' carried the most riders') + ' this cycle' +
      (lead.cause ? ' — ' + lead.cause : '') + '; ' + rosterCount + ' transit workers on the roster' + (people.length > rosterCount ? ', ' + (people.length - rosterCount) + ' citizens who lived a transit line' : '') + (chaos.length ? ', a chaos car on the line' : '') + '.',
    facts, people,
    deltas: { state: rebased ? 'REBASED' : prev.length ? 'PRIOR_CYCLE_IN_TABLE' : 'NO_PRIOR_CYCLE', vs: prev.length ? cycle - 1 : null },
    hooks: K.hooksFor(beats, cycle, SEAT.name).concat(seedHooks),
    note: people.length ? null : 'no transit workers on the roster this cycle',
    extra: { stations, corridors, week: { causes, weather: weather || null, homeGames: games.length }, chaos, lived: lived.map(r => ({ popid: r.POPID, text: r.EventText, tag: r.EventTag })) }
  });
  slice.pointers.push('output/beats/LifeHistory_Log.jsonl Cycle ' + cycle + ' (transit lines)');
  if (chaosSec) slice.pointers.push(summaryPath + ' ## Chaos Events');
  return slice;
}

const W = K.wire(SEAT);
if (require.main === module) W.main();
module.exports = { SEAT, loadSlice: W.load, buildTransitSlice: W.build, writeTransitSlice: W.write, loadTransitSlice: W.load,
  isTransitSeat: W.isSeat, assignmentFromSlice: W.assignmentFromSlice, enrichAssignment: W.enrichAssignment, slicePaths: W.paths };
