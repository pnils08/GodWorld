'use strict';

/**
 * What this season did in GodWorld — not the ledger's weather line.
 * The snapshot (Winter, 49°F) is context. The story is who moved differently.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SEASON_RE = /winter|cold|seasonal|holiday|christmas|advent|lunch|homework|restricted movement|weather impact/i;

function section(md, heading) {
  const lines = String(md || '').split(/\r?\n/);
  const start = lines.findIndex(line => new RegExp('^## ' + heading + '\\b', 'i').test(line));
  if (start < 0) return '';
  const out = [];
  for (let i = start + 1; i < lines.length; i++) {
    if (/^## /.test(lines[i])) break;
    out.push(lines[i]);
  }
  return out.join('\n');
}

function cleanWeather(raw) {
  return String(raw || '').replace(/,?\s*[^,]*\(frontState\s+[^)]+\)/gi, '')
    .replace(/\s*,\s*,/g, ',').replace(/\s+/g, ' ').trim();
}

function loadProfiles(root) {
  const file = path.join(root, 'output', 'simulation_ledger_snapshot.jsonl');
  const out = new Map();
  try {
    for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean)) {
      const row = JSON.parse(line);
      const pop = String(row.POPID || '').trim().toUpperCase();
      if (pop) out.set(pop, row);
    }
  } catch (_) { /* optional */ }
  return out;
}

function parseSeasonFeel(summaryMd, cycle, opts) {
  const root = (opts && opts.root) || ROOT;
  const profiles = (opts && opts.profiles) || loadProfiles(root);
  const md = String(summaryMd || '');
  const season = ((md.match(/\*\*Season:\*\*\s*([^|\n]+)/) || [])[1] || '').trim();
  const weather = cleanWeather((md.match(/\*\*Weather:\*\*\s*([^\n]+)/) || [])[1] || '');
  const holiday = /holiday=Holiday/i.test(md);
  const sportsOff = /Sports season:\s*off-season/i.test(md);
  const illness = (md.match(/Illness rate\s+([\d.]+)%/) || [])[1] || null;
  const night = md.match(/\*\*Nightlife:\*\*\s*\*\*([^*]+)\*\*\s*\(([^)]+)\)\.\s*Volume\s+(\d+),\s*vibe\s+([^.,]+).*?Weather impact\s+([\d.]+)/i);

  const moved = [];
  const who = section(md, 'Who Lived It');
  for (const line of who.split('\n')) {
    if (!SEASON_RE.test(line)) continue;
    const m = line.match(/^[-*]\s+(POP-\d+)\s*(.*?)\s+—\s+(.+?)(?:\s+\(([^)]+)\))?\s*$/i);
    if (!m) continue;
    const pop = m[1].toUpperCase();
    const row = profiles.get(pop);
    const name = String(m[2] || '').trim() || (row && String(row.Name || '').trim());
    if (!name) continue;
    const rest = m[3].trim();
    const hood = (m[4] || (row && row.Neighborhood) || '').trim() || null;
    moved.push({
      kind: 'lived',
      text: name + ' — ' + rest,
      hood,
      popids: [pop],
      citizens: [name + ' (' + pop + ')'],
      src: 'output/world_summary_c' + cycle + '.md ## Who Lived It'
    });
  }

  const events = section(md, 'World Events');
  for (const line of events.split('\n')) {
    if (!/FAITH|holy_day|Christmas|Advent|Holiday/i.test(line)) continue;
    const place = ((line.match(/targets?\s+(.+)$/i) || line.match(/\*\*([^*]+)\*\*/) || [])[1] || '').trim();
    const hood = ((line.match(/—\s+([A-Za-z ]+):/) || [])[1] || '').trim() || null;
    if (!place && !/Christmas|Advent|Holiday/i.test(line)) continue;
    moved.push({
      kind: 'holy-day',
      text: line.replace(/^[-*]\s+/, '').replace(/\*\*/g, '').trim(),
      hood,
      popids: [],
      citizens: [],
      src: 'output/world_summary_c' + cycle + '.md ## World Events'
    });
  }

  if (night) {
    moved.push({
      kind: 'evening',
      text: night[1].trim() + ' in ' + night[2].trim() + ' is quiet; movement restricted on this weather.',
      hood: night[2].trim(),
      popids: [],
      citizens: [],
      src: 'output/world_summary_c' + cycle + '.md ## Evening Texture'
    });
  }

  const evening = section(md, 'Evening Texture');
  for (const line of evening.split('\n')) {
    if (!/\*\*City events:\*\*/.test(line) && !/\*\*Restaurants:\*\*/.test(line) &&
        !/\*\*Fast food:\*\*/.test(line) && !/holiday|festive|lights|parade|market/i.test(line)) {
      continue;
    }
    const text = line.replace(/^[-*]\s+/, '').replace(/\*\*/g, '').trim();
    if (text) {
      moved.push({
        kind: 'evening-calendar',
        text,
        hood: null,
        popids: [],
        citizens: [],
        src: 'output/world_summary_c' + cycle + '.md ## Evening Texture'
      });
    }
  }

  return {
    cycle: Number(cycle),
    context: {
      season: season || null,
      weather: weather || null,
      holiday,
      sportsOff,
      illnessRate: illness,
    },
    moved,
    topLived: moved.find(row => row.kind === 'lived') || moved[0] || null
  };
}

function loadSeasonFeel(cycle, root = ROOT) {
  const summaryPath = path.join(root, 'output', 'world_summary_c' + cycle + '.md');
  const md = fs.readFileSync(summaryPath, 'utf8');
  return parseSeasonFeel(md, cycle, { root });
}

module.exports = { parseSeasonFeel, loadSeasonFeel, SEASON_RE };
