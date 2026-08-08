#!/usr/bin/env node
/**
 * buildEveningSlice.js — Grok-owned evening-life heat slice (pipeline.52 Task 1)
 *
 * Shared substrate pack for culture evening consumers:
 *   Mason (kitchen) · Kai (arts) · Sharon (lifestyle) · Maria (ground) · Graye (faith when overlaps)
 *
 * Parallel to buildJaxSlice / buildPSlayerSlice, NOT a clone:
 *   Jax     = civic stink + contradiction
 *   P       = sports feed pulse + charge bag
 *   Evening = Riley Evening Texture + desk_signal fame/sighting → scored life pulses
 *
 * Hard rule: named venues / people only from sources — never invent.
 *
 * Sources (disk-first, no Sheets required for build):
 *   output/world_summary_c{N}.md  ## Evening Texture
 *   output/desk_signal_c{N}.json  lanes.culture (fame-event, lifestyle-sighting, evening, faith)
 *
 * Artifacts:
 *   output/slices/c{N}/evening.md
 *   output/cron-compare/evening_slice_c{N}.json
 *
 * Usage:
 *   node scripts/buildEveningSlice.js --cycle 102
 *   node scripts/buildEveningSlice.js --cycle 102 --json
 *   const { buildEveningSlice, loadEveningSlice, writeEveningSlice } = require('./buildEveningSlice');
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const EVENING_APPROACH =
  'Evening-life approach (shared culture pack): open from a NAMED place or sighting in this slice — ' +
  'restaurant, bar, festival, TV slate, or fame stop — never invent venues or employees. ' +
  'Use nightlife volume/vibe/movement as scene color only; translate to human language (no raw engine decimals as lead). ' +
  'Pick ONE life pulse; ride the recommended consumer bag when it matches your seat (kitchen / arts / lifestyle / ground / faith). ' +
  'Do not file multi-voice culture-desk average. One room, one night, one truth.';

/** Persona slugs that consume the evening pack */
const EVENING_CONSUMERS = {
  'mason-ortega': {
    slug: 'mason-ortega',
    name: 'Mason Ortega',
    popid: 'POP-00160',
    bag: 'kitchen',
    bagDoc: 'docs/media/MASON_KITCHEN_BAG.md',
    prefers: ['named-restaurant', 'fast-food', 'food-trend', 'quiet-nightlife']
  },
  'kai-marston': {
    slug: 'kai-marston',
    name: 'Kai Marston',
    popid: 'POP-00158',
    bag: 'arts',
    bagDoc: 'docs/media/KAI_ARTS_BAG.md',
    prefers: ['city-event', 'tv-slate', 'movie-slate', 'streaming-trend', 'nightlife-spot', 'quiet-nightlife']
  },
  'sharon-okafor': {
    slug: 'sharon-okafor',
    name: 'Sharon Okafor',
    popid: 'POP-00159',
    bag: 'lifestyle',
    bagDoc: 'docs/media/SHARON_LIFESTYLE_BAG.md',
    prefers: ['quiet-nightlife', 'nightlife-spot', 'fame-sighting', 'food-trend', 'streaming-trend', 'lifestyle-barometer']
  },
  'maria-keen': {
    slug: 'maria-keen',
    name: 'Maria Keen',
    popid: 'POP-00013',
    bag: 'ground',
    bagDoc: 'docs/media/MARIA_GROUND_BAG.md',
    prefers: ['city-event', 'fame-sighting', 'named-restaurant', 'nightlife-spot', 'quiet-nightlife']
  },
  'elliot-graye': {
    slug: 'elliot-graye',
    name: 'Elliot Graye',
    popid: 'POP-00012',
    bag: 'faith',
    bagDoc: 'docs/media/GRAYE_FAITH_BAG.md',
    prefers: ['faith-overlap', 'city-event', 'fame-sighting']
  }
};

const CONSUMER_BY_POPID = {};
for (const c of Object.values(EVENING_CONSUMERS)) CONSUMER_BY_POPID[c.popid] = c;

function arg(flag, def) {
  const i = process.argv.indexOf(flag);
  if (i !== -1 && process.argv[i + 1]) return process.argv[i + 1];
  const eq = process.argv.find(a => a.startsWith(flag + '='));
  return eq ? eq.slice(flag.length + 1) : def;
}

function loadJson(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (_) { return null; }
}
function loadText(p) {
  try { return fs.readFileSync(p, 'utf8'); } catch (_) { return null; }
}

function extractSection(md, heading) {
  if (!md) return null;
  const re = new RegExp('^##\\s+' + heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*$', 'mi');
  const m = md.match(re);
  if (!m) return null;
  const start = m.index + m[0].length;
  const rest = md.slice(start);
  const next = rest.search(/^##\s+/m);
  return (next < 0 ? rest : rest.slice(0, next)).trim();
}

/**
 * Extract Evening Texture body — heading may include parenthetical
 * "Evening Texture (Riley_Digest cycle 102)".
 */
function extractEveningTexture(md) {
  if (!md) return null;
  const exact = extractSection(md, 'Evening Texture');
  if (exact) return exact;
  const m = md.match(/^##\s+Evening Texture[^\n]*$/mi);
  if (!m) return null;
  const start = m.index + m[0].length;
  const rest = md.slice(start);
  const next = rest.search(/^##\s+/m);
  return (next < 0 ? rest : rest.slice(0, next)).trim();
}

function fieldLine(body, label) {
  if (!body) return null;
  const re = new RegExp(
    '^-\\s+\\*\\*' + label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ':\\*\\*\\s*(.*)$',
    'mi'
  );
  const m = body.match(re);
  return m ? m[1].trim() : null;
}

/** **The 44th Table** (Downtown) → { name, hood } */
function parseNamedVenues(text) {
  if (!text || text === '—') return [];
  const out = [];
  const re = /\*\*([^*]+)\*\*(?:\s*\(([^)]+)\))?/g;
  let m;
  while ((m = re.exec(text))) {
    const name = m[1].trim();
    if (!name || name === '—') continue;
    out.push({ name, hood: m[2] ? m[2].trim() : null });
  }
  return out;
}

function parseCommaNames(text) {
  if (!text || text === '—') return [];
  return text
    .split(/,\s*/)
    .map(s => s.replace(/\*\*/g, '').trim())
    .filter(s => s && s !== '—');
}

function parseNightlifeMeta(rest) {
  const meta = { volume: null, vibe: null, movement: null, weatherImpact: null };
  if (!rest) return meta;
  const vol = rest.match(/Volume\s+([0-9]+(?:\.[0-9]+)?|\w+)/i);
  const vibe = rest.match(/vibe\s+([^,.]+)/i);
  const mov = rest.match(/movement\s+([^,.]+)/i);
  // Trailing period after impact (e.g. "1.03.") must not enter Number()
  const wx = rest.match(/Weather impact\s+([0-9]+(?:\.[0-9]+)?)/i);
  if (vol) {
    const n = Number(vol[1]);
    meta.volume = Number.isFinite(n) ? n : vol[1];
  }
  if (vibe) meta.vibe = vibe[1].trim();
  if (mov) meta.movement = mov[1].trim();
  if (wx) {
    const n = Number(wx[1]);
    meta.weatherImpact = Number.isFinite(n) ? n : null;
  }
  return meta;
}

/**
 * Parse ## Evening Texture into structured fields + venue lists.
 */
function parseEveningTexture(md) {
  const body = extractEveningTexture(md);
  if (!body) {
    return {
      empty: true,
      famous: [],
      restaurants: [],
      fastFood: [],
      nightlife: [],
      nightlifeMeta: {},
      cityEvents: [],
      tv: [],
      movies: [],
      sportsBroadcast: null,
      streamingTrend: null,
      foodTrend: null,
      raw: null
    };
  }

  const famousRaw = fieldLine(body, 'Famous people spotted');
  const restRaw = fieldLine(body, 'Restaurants');
  const ffRaw = fieldLine(body, 'Fast food');
  const nightRaw = fieldLine(body, 'Nightlife');
  const eventsRaw = fieldLine(body, 'City events');
  const tvRaw = fieldLine(body, 'Evening media TV');
  const movRaw = fieldLine(body, 'Evening media movies');
  const sportsRaw = fieldLine(body, 'Sports broadcast');
  const streamRaw = fieldLine(body, 'Streaming trend');
  const foodRaw = fieldLine(body, 'Food trend');

  let nightlifeVenues = [];
  let nightlifeMeta = {};
  if (nightRaw) {
    // Venues before first period that starts meta, or whole line for venues
    const periodSplit = nightRaw.split(/\.\s+(?=Volume|vibe)/i);
    const venuePart = periodSplit[0] || nightRaw;
    nightlifeVenues = parseNamedVenues(venuePart);
    nightlifeMeta = parseNightlifeMeta(nightRaw);
  }

  return {
    empty: false,
    famous: parseCommaNames(famousRaw || ''),
    restaurants: parseNamedVenues(restRaw || ''),
    fastFood: parseNamedVenues(ffRaw || ''),
    nightlife: nightlifeVenues,
    nightlifeMeta,
    cityEvents: parseCommaNames(eventsRaw || ''),
    tv: parseNamedVenues(tvRaw || '').map(v => v.name),
    movies: parseNamedVenues(movRaw || '').map(v => v.name),
    sportsBroadcast: sportsRaw && sportsRaw !== '—' ? sportsRaw.replace(/\*\*/g, '').trim() : null,
    streamingTrend: streamRaw && streamRaw !== '—' ? streamRaw.replace(/\*\*/g, '').trim() : null,
    foodTrend: foodRaw && foodRaw !== '—' ? foodRaw.replace(/\*\*/g, '').trim() : null,
    raw: body
  };
}

/**
 * Pull culture-lane fame / sighting / evening / faith seeds from desk_signal.
 */
function parseCultureSignals(signal) {
  const lane = (signal && signal.lanes && signal.lanes.culture) || [];
  const fame = [];
  const sightings = [];
  const faith = [];
  let eveningPointer = null;

  for (const e of lane) {
    const kind = String(e.kind || '');
    const cause = String(e.causeType || '');
    const label = String(e.label || '');

    if (kind === 'evening') {
      eveningPointer = { ref: e.ref, label };
      continue;
    }
    if (kind === 'faith-registry' || /faith/i.test(cause)) {
      faith.push({
        kind: kind || cause,
        label,
        ref: e.ref || null,
        hood: e.hood || null,
        popids: e.popids || []
      });
      continue;
    }
    if (cause === 'fame-event' || /^fame-/i.test(label) || /fame-rise|fame-fall/i.test(label)) {
      const nameM = label.match(/fame-\w+\s*\|\s*([^—]+)—/i) || label.match(/\|\s*([A-Z][^—|]+)/);
      fame.push({
        kind: 'fame-event',
        label,
        name: nameM ? nameM[1].trim() : null,
        ref: e.ref || null,
        hood: e.hood || null,
        popids: e.popids || []
      });
      continue;
    }
    if (cause === 'lifestyle-sighting' || /^sighting\s*\|/i.test(label) || /spotted at/i.test(label)) {
      const sm = label.match(/sighting\s*\|\s*(.+?)\s+spotted at\s+(.+)$/i) ||
        label.match(/(.+?)\s+spotted at\s+(.+)$/i);
      sightings.push({
        kind: 'lifestyle-sighting',
        label,
        name: sm ? sm[1].replace(/^sighting\s*\|\s*/i, '').trim() : null,
        venue: sm ? sm[2].trim() : null,
        ref: e.ref || null,
        hood: e.hood || null,
        popids: e.popids || []
      });
    }
  }

  return { fame, sightings, faith, eveningPointer };
}

function isQuietNightlife(meta) {
  if (!meta) return false;
  const vibe = String(meta.vibe || '').toLowerCase();
  const mov = String(meta.movement || '').toLowerCase();
  const vol = meta.volume;
  if (/quiet|hushed|muted|sparse/.test(vibe)) return true;
  if (/restricted|limited|low/.test(mov)) return true;
  if (typeof vol === 'number' && vol <= 4) return true;
  return false;
}

function artsyEvent(name) {
  return /arts?|festival|showcase|gallery|music|film|cultural|first friday|district/i.test(name || '');
}

function faithyEvent(name) {
  return /faith|church|congregation|mosque|temple|advent|christmas|holy|worship|deacon|pantry/i.test(name || '');
}

/**
 * Emit scored life pulses from parsed texture + desk_signal.
 * Never invents names — only sources.
 */
function emitPulses(texture, signals, cycle) {
  const pulses = [];
  const meta = texture.nightlifeMeta || {};
  const quiet = isQuietNightlife(meta);

  function add(p) {
    if (!p || !p.className) return;
    // Drop empty name-bearing pulses
    if (p.requiresName && !p.named && !(p.names && p.names.length)) return;
    pulses.push(p);
  }

  for (const v of texture.restaurants || []) {
    add({
      className: 'named-restaurant',
      score: 18 + (v.hood ? 2 : 0),
      label: v.name + (v.hood ? ' (' + v.hood + ')' : ''),
      named: v.name,
      hood: v.hood,
      names: [v.name],
      requiresName: true,
      source: 'world_summary ## Evening Texture · Restaurants',
      angle: 'Kitchen / dining room at ' + v.name +
        (v.hood ? ' in ' + v.hood : '') +
        ' — who works the room and what the night costs them',
      hookLine: v.name + ' is on the evening board' + (v.hood ? ' in ' + v.hood : '') + '.',
      sceneBits: [
        'VENUE: ' + v.name,
        v.hood ? 'HOOD: ' + v.hood : null,
        texture.foodTrend ? 'FOOD TREND: ' + texture.foodTrend : null
      ].filter(Boolean)
    });
  }

  for (const v of texture.fastFood || []) {
    add({
      className: 'fast-food',
      score: 12 + (v.hood ? 1 : 0),
      label: v.name + (v.hood ? ' (' + v.hood + ')' : ''),
      named: v.name,
      hood: v.hood,
      names: [v.name],
      requiresName: true,
      source: 'world_summary ## Evening Texture · Fast food',
      angle: 'Counter rush at ' + v.name + ' — speed, labor, and who still shows up',
      hookLine: v.name + ' holds the late-service line' + (v.hood ? ' in ' + v.hood : '') + '.',
      sceneBits: ['VENUE: ' + v.name, v.hood ? 'HOOD: ' + v.hood : null].filter(Boolean)
    });
  }

  for (const v of texture.nightlife || []) {
    const base = quiet ? 'quiet-nightlife' : 'nightlife-spot';
    const score = quiet ? 22 : 16;
    add({
      className: base,
      score: score + (v.hood ? 2 : 0),
      label: v.name + (v.hood ? ' (' + v.hood + ')' : '') +
        (quiet ? ' · quiet night' : ''),
      named: v.name,
      hood: v.hood,
      names: [v.name],
      requiresName: true,
      source: 'world_summary ## Evening Texture · Nightlife',
      angle: quiet
        ? 'Quiet nightlife at ' + v.name + ' — low volume, restricted movement, the room still breathing'
        : 'Nightlife at ' + v.name + ' — who is out and what the block is saying',
      hookLine: quiet
        ? v.name + ' is open but the night is quiet' +
          (meta.volume != null ? ' (volume ' + meta.volume + ', vibe ' + (meta.vibe || '—') + ')' : '') + '.'
        : v.name + ' holds the evening out' + (v.hood ? ' in ' + v.hood : '') + '.',
      sceneBits: [
        'VENUE: ' + v.name,
        v.hood ? 'HOOD: ' + v.hood : null,
        meta.volume != null ? 'VOLUME: ' + meta.volume : null,
        meta.vibe ? 'VIBE: ' + meta.vibe : null,
        meta.movement ? 'MOVEMENT: ' + meta.movement : null,
        meta.weatherImpact != null ? 'WEATHER IMPACT: ' + meta.weatherImpact : null
      ].filter(Boolean),
      nightlifeMeta: meta
    });
  }

  // If quiet city but no named nightlife venue, still emit ambient pulse from meta only when other texture exists
  if (quiet && !(texture.nightlife || []).length &&
      ((texture.restaurants || []).length || (texture.cityEvents || []).length)) {
    add({
      className: 'quiet-nightlife',
      score: 10,
      label: 'City nightlife quiet' +
        (meta.vibe ? ' · vibe ' + meta.vibe : '') +
        (meta.volume != null ? ' · vol ' + meta.volume : ''),
      named: null,
      hood: null,
      names: [],
      requiresName: false,
      source: 'world_summary ## Evening Texture · Nightlife meta',
      angle: 'A quiet night across the city — restricted movement, low volume, where people still go',
      hookLine: 'Nightlife is quiet' +
        (meta.vibe ? ' (' + meta.vibe + ')' : '') +
        (meta.movement ? ', movement ' + meta.movement : '') + '.',
      sceneBits: [
        meta.volume != null ? 'VOLUME: ' + meta.volume : null,
        meta.vibe ? 'VIBE: ' + meta.vibe : null,
        meta.movement ? 'MOVEMENT: ' + meta.movement : null
      ].filter(Boolean),
      nightlifeMeta: meta
    });
  }

  for (const ev of texture.cityEvents || []) {
    const arts = artsyEvent(ev);
    const faith = faithyEvent(ev);
    add({
      className: faith ? 'faith-overlap' : 'city-event',
      score: (arts ? 17 : 14) + (faith ? 4 : 0),
      label: ev,
      named: ev,
      hood: null,
      names: [ev],
      requiresName: true,
      source: 'world_summary ## Evening Texture · City events',
      angle: (faith ? 'Faith-adjacent city event: ' : arts ? 'Arts/cultural event: ' : 'City event: ') +
        ev + ' — present-tense room, not calendar filler',
      hookLine: ev + ' is on the evening board.',
      sceneBits: ['EVENT: ' + ev, arts ? 'ARTS SIGNAL: yes' : null, faith ? 'FAITH SIGNAL: yes' : null].filter(Boolean)
    });
  }

  if ((texture.tv || []).length) {
    add({
      className: 'tv-slate',
      score: 13 + Math.min(texture.tv.length, 3),
      label: 'TV slate: ' + texture.tv.slice(0, 3).join('; '),
      named: texture.tv[0],
      hood: null,
      names: texture.tv.slice(),
      requiresName: true,
      source: 'world_summary ## Evening Texture · Evening media TV',
      angle: 'Evening TV slate — ' + texture.tv.slice(0, 3).join(', ') +
        (texture.sportsBroadcast ? '; sports desk: ' + texture.sportsBroadcast : ''),
      hookLine: 'On the box tonight: ' + texture.tv.slice(0, 2).join(', ') + '.',
      sceneBits: [
        'TV: ' + texture.tv.join('; '),
        texture.sportsBroadcast ? 'SPORTS BROADCAST: ' + texture.sportsBroadcast : null
      ].filter(Boolean)
    });
  }

  if ((texture.movies || []).length) {
    add({
      className: 'movie-slate',
      score: 11 + Math.min(texture.movies.length, 2),
      label: 'Movies: ' + texture.movies.join('; '),
      named: texture.movies[0],
      hood: null,
      names: texture.movies.slice(),
      requiresName: true,
      source: 'world_summary ## Evening Texture · Evening media movies',
      angle: 'Evening movie slate — ' + texture.movies.join(', '),
      hookLine: 'Screens tonight: ' + texture.movies.join(', ') + '.',
      sceneBits: ['MOVIES: ' + texture.movies.join('; ')]
    });
  }

  if (texture.streamingTrend) {
    add({
      className: 'streaming-trend',
      score: 8,
      label: texture.streamingTrend,
      named: texture.streamingTrend,
      hood: null,
      names: [texture.streamingTrend],
      requiresName: true,
      source: 'world_summary ## Evening Texture · Streaming trend',
      angle: 'Streaming trend: ' + texture.streamingTrend + ' — what people choose when they stay in',
      hookLine: 'Streaming leans ' + texture.streamingTrend + '.',
      sceneBits: ['STREAMING: ' + texture.streamingTrend]
    });
  }

  if (texture.foodTrend) {
    add({
      className: 'food-trend',
      score: 9,
      label: texture.foodTrend,
      named: texture.foodTrend,
      hood: null,
      names: [texture.foodTrend],
      requiresName: true,
      source: 'world_summary ## Evening Texture · Food trend',
      angle: 'Food trend under stress: ' + texture.foodTrend,
      hookLine: 'Food trend line: ' + texture.foodTrend + '.',
      sceneBits: ['FOOD TREND: ' + texture.foodTrend]
    });
  }

  // Famous people from texture (names only — no invented venue)
  for (const name of texture.famous || []) {
    add({
      className: 'fame-sighting',
      score: 12,
      label: name + ' spotted (Riley famous list)',
      named: name,
      hood: null,
      names: [name],
      requiresName: true,
      source: 'world_summary ## Evening Texture · Famous people spotted',
      angle: name + ' is on the evening famous list — sighting without inventing a stop',
      hookLine: name + ' is being seen around town.',
      sceneBits: ['NAME: ' + name]
    });
  }

  // desk_signal lifestyle sightings (named person + venue when present)
  for (const s of (signals && signals.sightings) || []) {
    if (!s.name && !s.venue) continue;
    add({
      className: 'fame-sighting',
      score: 19 + (s.venue ? 3 : 0) + (s.hood ? 1 : 0),
      label: (s.name || 'sighting') +
        (s.venue ? ' at ' + s.venue : '') +
        (s.hood ? ' (' + s.hood + ')' : ''),
      named: s.venue || s.name,
      hood: s.hood || null,
      names: [s.name, s.venue].filter(Boolean),
      person: s.name || null,
      venue: s.venue || null,
      popids: s.popids || [],
      requiresName: true,
      source: s.ref || 'desk_signal culture · lifestyle-sighting',
      angle: (s.name || 'Someone known') +
        (s.venue ? ' spotted at ' + s.venue : ' on a lifestyle sighting') +
        (s.hood ? ' in ' + s.hood : '') +
        ' — ground truth only, no invented companions',
      hookLine: s.label || ((s.name || '') + ' spotted' + (s.venue ? ' at ' + s.venue : '')),
      sceneBits: [
        s.name ? 'PERSON: ' + s.name : null,
        s.venue ? 'VENUE: ' + s.venue : null,
        s.hood ? 'HOOD: ' + s.hood : null
      ].filter(Boolean)
    });
  }

  for (const f of (signals && signals.fame) || []) {
    if (!f.name && !f.label) continue;
    add({
      className: 'fame-sighting',
      score: 15 + (f.hood ? 1 : 0),
      label: f.name ? (f.name + ' — fame rise') : f.label,
      named: f.name || null,
      hood: f.hood || null,
      names: f.name ? [f.name] : [],
      person: f.name || null,
      popids: f.popids || [],
      requiresName: !!f.name,
      source: f.ref || 'desk_signal culture · fame-event',
      angle: (f.name || 'Fame signal') + ' — city watching; do not invent the private life',
      hookLine: f.label || (f.name + ' is under the city\'s eye'),
      sceneBits: [
        f.name ? 'PERSON: ' + f.name : null,
        f.hood ? 'HOOD: ' + f.hood : null,
        f.label ? 'LABEL: ' + f.label : null
      ].filter(Boolean)
    });
  }

  // Faith registry pointer — only elevates when evening also has faithy events or Graye is consumer
  if ((signals && signals.faith && signals.faith.length) ||
      (texture.cityEvents || []).some(faithyEvent)) {
    add({
      className: 'faith-overlap',
      score: 11,
      label: 'Faith / quiet work overlap with evening city',
      named: null,
      hood: null,
      names: (texture.cityEvents || []).filter(faithyEvent),
      requiresName: false,
      source: (signals && signals.faith && signals.faith[0] && signals.faith[0].ref) ||
        'desk_signal culture · faith-registry',
      angle: 'Quiet institutional care against the evening board — congregations, not doctrine wars',
      hookLine: 'Faith work continues while the city evenings out.',
      sceneBits: [
        'FAITH REGISTRY: present',
        ...((texture.cityEvents || []).filter(faithyEvent).map(e => 'EVENT: ' + e))
      ]
    });
  }

  // Cycle stamp for sorting (all same cycle from texture)
  for (const p of pulses) {
    p.cycle = Number(cycle);
  }

  pulses.sort((a, b) => b.score - a.score || String(a.className).localeCompare(b.className));
  return pulses;
}

/**
 * Recommend which consumer bag fits top pulse — does not force all four seats.
 */
function recommendConsumer(pulses) {
  if (!pulses || !pulses.length) {
    return { bag: null, slug: null, reason: 'no pulses' };
  }
  const top = pulses[0];
  const cls = top.className;

  const map = {
    'named-restaurant': 'kitchen',
    'fast-food': 'kitchen',
    'food-trend': 'kitchen',
    'quiet-nightlife': 'lifestyle',
    'nightlife-spot': 'lifestyle',
    'lifestyle-barometer': 'lifestyle',
    'city-event': artsyEvent(top.named || top.label) ? 'arts' : 'ground',
    'tv-slate': 'arts',
    'movie-slate': 'arts',
    'streaming-trend': 'arts',
    'fame-sighting': top.venue || top.hood ? 'ground' : 'lifestyle',
    'faith-overlap': 'faith'
  };

  const bag = map[cls] || 'ground';
  const slug = Object.keys(EVENING_CONSUMERS).find(s => EVENING_CONSUMERS[s].bag === bag) || null;
  const consumer = slug ? EVENING_CONSUMERS[slug] : null;

  return {
    bag,
    slug,
    name: consumer ? consumer.name : null,
    popid: consumer ? consumer.popid : null,
    bagDoc: consumer ? consumer.bagDoc : null,
    reason: 'top pulse ' + cls + ' → ' + bag,
    pulseClass: cls,
    pulseLabel: top.label
  };
}

function scoreForPersona(pulse, consumer) {
  if (!pulse || !consumer) return pulse ? pulse.score : 0;
  let s = pulse.score;
  if ((consumer.prefers || []).includes(pulse.className)) s += 8;
  // Graye: only boost faith; soft-penalize pure kitchen/TV without faith
  if (consumer.bag === 'faith') {
    if (pulse.className === 'faith-overlap' || faithyEvent(pulse.named || pulse.label || '')) s += 12;
    else if (['named-restaurant', 'fast-food', 'tv-slate', 'movie-slate'].includes(pulse.className)) s -= 6;
  }
  if (consumer.bag === 'kitchen' && ['named-restaurant', 'fast-food', 'food-trend'].includes(pulse.className)) {
    s += 6;
  }
  if (consumer.bag === 'arts' &&
      (['tv-slate', 'movie-slate', 'streaming-trend', 'city-event'].includes(pulse.className) ||
       artsyEvent(pulse.named || pulse.label || ''))) {
    s += 6;
  }
  return s;
}

function pickPulseForPersona(pulses, personaSlug) {
  const consumer = EVENING_CONSUMERS[personaSlug];
  if (!pulses || !pulses.length) return null;
  if (!consumer) return pulses[0];
  let best = null;
  let bestScore = -1e9;
  for (const p of pulses) {
    const s = scoreForPersona(p, consumer);
    if (s > bestScore) {
      bestScore = s;
      best = p;
    }
  }
  // Graye: if best is not faith-adjacent and score is weak, still return best ambient
  // but mark soft — caller may keep original story
  return best;
}

function approachForConsumer(consumer, pulse) {
  const base = EVENING_APPROACH;
  if (!consumer) return base;
  const bagLines = {
    kitchen:
      'You are Mason (kitchen bag): restaurants are workplaces first. Named workers only from packet. ' +
      'Modes: Line Cook Spine, Service Rush, Menu vs Shift, Owner Math, Hospitality Under Stress.',
    arts:
      'You are Kai (arts bag): present-tense scene; art as neighborhood act. Named events/artists from packet only. ' +
      'Modes: First Friday Pulse, Room Rewriting Itself, Stage/Mic/Block, What the Block Is Saying Tonight.',
    lifestyle:
      'You are Sharon (lifestyle bag): behavior patterns, warm analytical — not arts (Kai) or kitchen labor (Mason). ' +
      'Modes: Venue Shift, Coffee/Night Out Barometer, Habit Under Stress, Pattern Without Diagnosis. No raw nightlife decimals as lead.',
    ground:
      'You are Maria (ground bag): hyper-local witness, one block one truth. Packet-named people/places only. ' +
      'Modes: One Block One Truth, Proud AND Wary, Neighbor Quote Spine, Quiet Joy.',
    faith:
      'You are Graye (faith bag): quiet institutional care, not doctrine wars. Packet institutions only. ' +
      'Modes: Pantry Line, Grief Room, Mutual Aid Through Congregation, Sacred Space Ordinary Time.'
  };
  const line = bagLines[consumer.bag] || '';
  const pulseLine = pulse
    ? ' Assigned pulse: ' + pulse.className + ' — ' + pulse.label + '.'
    : '';
  return base + ' ' + line + pulseLine;
}

function storyFromPulse(pulse, cycle) {
  if (!pulse) return null;
  return {
    angle: pulse.angle,
    label: pulse.label,
    hookLine: pulse.hookLine,
    hood: pulse.hood || null,
    pulseClass: pulse.className,
    citizens: (pulse.person ? [pulse.person] : []).concat(
      (pulse.popids || []).map(id => ({ popid: id }))
    ),
    popids: pulse.popids || [],
    named: pulse.named || null,
    venue: pulse.venue || pulse.named || null,
    ref: pulse.source || ('evening-slice-c' + cycle),
    cycle: Number(cycle)
  };
}

function buildEveningSlice(cycle, opts) {
  const root = (opts && opts.root) || ROOT;
  const c = Number(cycle);
  const summaryPath = path.join(root, 'output', 'world_summary_c' + c + '.md');
  const signalPath = path.join(root, 'output', 'desk_signal_c' + c + '.json');

  const summaryMd = (opts && opts.summaryMd) || loadText(summaryPath);
  const signal = (opts && opts.signal) || loadJson(signalPath);

  const texture = parseEveningTexture(summaryMd);
  const signals = parseCultureSignals(signal);
  const pulses = texture.empty && !(signals.sightings.length || signals.fame.length)
    ? []
    : emitPulses(texture, signals, c);

  if (!pulses.length) {
    return {
      empty: true,
      cycle: c,
      kind: 'evening-life',
      texture,
      signals: {
        fameCount: signals.fame.length,
        sightingCount: signals.sightings.length,
        faithCount: signals.faith.length,
        eveningPointer: signals.eveningPointer
      },
      pulses: [],
      candidates: [],
      pulse: null,
      recommend: { bag: null, slug: null, reason: 'empty' },
      approach: EVENING_APPROACH,
      story: null,
      prewrite: null,
      scene: null,
      pointers: [
        'output/world_summary_c' + c + '.md ## Evening Texture',
        'output/desk_signal_c' + c + '.json lanes.culture'
      ]
    };
  }

  const top = pulses[0];
  const recommend = recommendConsumer(pulses);
  const perSeat = {};
  for (const slug of Object.keys(EVENING_CONSUMERS)) {
    const p = pickPulseForPersona(pulses, slug);
    perSeat[slug] = {
      pulseClass: p && p.className,
      label: p && p.label,
      score: p && scoreForPersona(p, EVENING_CONSUMERS[slug]),
      bag: EVENING_CONSUMERS[slug].bag
    };
  }

  const venues = []
    .concat(texture.restaurants || [])
    .concat(texture.fastFood || [])
    .concat(texture.nightlife || []);

  const slice = {
    empty: false,
    cycle: c,
    kind: 'evening-life',
    journalist: {
      // shared pack — no single byline; recommend names the fit seat
      shared: true,
      consumers: Object.keys(EVENING_CONSUMERS)
    },
    texture: {
      famous: texture.famous,
      restaurants: texture.restaurants,
      fastFood: texture.fastFood,
      nightlife: texture.nightlife,
      nightlifeMeta: texture.nightlifeMeta,
      cityEvents: texture.cityEvents,
      tv: texture.tv,
      movies: texture.movies,
      sportsBroadcast: texture.sportsBroadcast,
      streamingTrend: texture.streamingTrend,
      foodTrend: texture.foodTrend
    },
    signals: {
      fameCount: signals.fame.length,
      sightingCount: signals.sightings.length,
      faithCount: signals.faith.length,
      eveningPointer: signals.eveningPointer,
      sightings: signals.sightings.slice(0, 8),
      fame: signals.fame.slice(0, 8)
    },
    pulse: {
      className: top.className,
      score: top.score,
      label: top.label,
      named: top.named || null,
      hood: top.hood || null,
      person: top.person || null,
      venue: top.venue || null
    },
    candidates: pulses.slice(0, 12).map(p => ({
      className: p.className,
      score: p.score,
      label: p.label,
      named: p.named || null,
      hood: p.hood || null
    })),
    pulses: pulses.slice(0, 20),
    recommend,
    perSeat,
    approach: EVENING_APPROACH,
    story: storyFromPulse(top, c),
    prewrite: {
      pulseClass: top.className,
      angle: top.angle,
      hookLine: top.hookLine,
      anchorFacts: [
        top.named ? 'NAMED: ' + top.named : null,
        top.person ? 'PERSON: ' + top.person : null,
        top.venue ? 'VENUE: ' + top.venue : null,
        top.hood ? 'HOOD: ' + top.hood : null,
        ...(top.sceneBits || [])
      ].filter(Boolean).slice(0, 8),
      bagRecommend: recommend.bag,
      bagSlug: recommend.slug
    },
    scene: {
      venues,
      nightlifeMeta: texture.nightlifeMeta,
      cityEvents: texture.cityEvents,
      tv: texture.tv,
      movies: texture.movies,
      colorRoom:
        'Named places only from Evening Texture / desk_signal. ' +
        (quietColor(texture.nightlifeMeta)) +
        ' Sensory room (weather, light, sound) is free; careers and employees are not.'
    },
    pointers: [
      'output/world_summary_c' + c + '.md ## Evening Texture',
      'output/desk_signal_c' + c + '.json lanes.culture',
      recommend.bagDoc || null,
      'docs/plans/2026-08-08-journalist-heat-slice-packs.md Task 1'
    ].filter(Boolean)
  };

  return slice;
}

function quietColor(meta) {
  if (!meta) return '';
  const bits = [];
  if (meta.volume != null) bits.push('volume ' + meta.volume);
  if (meta.vibe) bits.push('vibe ' + meta.vibe);
  if (meta.movement) bits.push('movement ' + meta.movement);
  return bits.length ? 'Nightlife meta: ' + bits.join(', ') + '. ' : '';
}

function formatEveningSliceMarkdown(slice) {
  if (!slice || slice.empty) {
    return '# SLICE — evening life (EMPTY)\n\n_No Evening Texture / culture fame signals for this cycle._\n';
  }
  const L = [];
  L.push('# SLICE — evening life (shared culture pack)');
  L.push('');
  L.push('Cycle **C' + slice.cycle + '** · kind `' + slice.kind + '`');
  L.push('');
  L.push('## TOP PULSE');
  L.push('- **Class:** ' + slice.pulse.className);
  L.push('- **Score:** ' + slice.pulse.score);
  L.push('- **Label:** ' + slice.pulse.label);
  if (slice.pulse.hood) L.push('- **Hood:** ' + slice.pulse.hood);
  if (slice.pulse.person) L.push('- **Person:** ' + slice.pulse.person);
  if (slice.pulse.venue || slice.pulse.named) {
    L.push('- **Named:** ' + (slice.pulse.venue || slice.pulse.named));
  }
  L.push('');
  L.push('## RECOMMENDED CONSUMER');
  if (slice.recommend && slice.recommend.bag) {
    L.push('- **Bag:** ' + slice.recommend.bag +
      (slice.recommend.name ? ' → ' + slice.recommend.name : '') +
      (slice.recommend.slug ? ' (`' + slice.recommend.slug + '`)' : ''));
    L.push('- **Why:** ' + slice.recommend.reason);
  } else {
    L.push('_No recommendation._');
  }
  L.push('');
  L.push('## PER-SEAT PULSE FIT');
  for (const slug of Object.keys(slice.perSeat || {})) {
    const s = slice.perSeat[slug];
    L.push('- **' + slug + '** (' + s.bag + '): ' +
      (s.pulseClass || '—') + ' — ' + (s.label || '—') +
      (s.score != null ? ' [' + s.score + ']' : ''));
  }
  L.push('');
  L.push('## PREWRITE');
  if (slice.prewrite) {
    L.push('- Angle: ' + slice.prewrite.angle);
    L.push('- Hook: ' + slice.prewrite.hookLine);
    L.push('- Bag: ' + (slice.prewrite.bagRecommend || '—'));
    L.push('Anchor facts (sources only):');
    for (const a of slice.prewrite.anchorFacts || []) L.push('  - ' + a);
  }
  L.push('');
  L.push('## EVENING TEXTURE (named only)');
  const t = slice.texture || {};
  if ((t.restaurants || []).length) {
    L.push('**Restaurants:** ' + t.restaurants.map(v => v.name + (v.hood ? ' (' + v.hood + ')' : '')).join('; '));
  }
  if ((t.fastFood || []).length) {
    L.push('**Fast food:** ' + t.fastFood.map(v => v.name + (v.hood ? ' (' + v.hood + ')' : '')).join('; '));
  }
  if ((t.nightlife || []).length) {
    L.push('**Nightlife:** ' + t.nightlife.map(v => v.name + (v.hood ? ' (' + v.hood + ')' : '')).join('; '));
  }
  if (t.nightlifeMeta && (t.nightlifeMeta.volume != null || t.nightlifeMeta.vibe)) {
    L.push('**Nightlife meta:** volume ' + (t.nightlifeMeta.volume ?? '—') +
      ', vibe ' + (t.nightlifeMeta.vibe || '—') +
      ', movement ' + (t.nightlifeMeta.movement || '—'));
  }
  if ((t.cityEvents || []).length) L.push('**City events:** ' + t.cityEvents.join('; '));
  if ((t.famous || []).length) L.push('**Famous spotted:** ' + t.famous.join('; '));
  if ((t.tv || []).length) L.push('**TV:** ' + t.tv.join('; '));
  if ((t.movies || []).length) L.push('**Movies:** ' + t.movies.join('; '));
  if (t.sportsBroadcast) L.push('**Sports broadcast:** ' + t.sportsBroadcast);
  if (t.streamingTrend) L.push('**Streaming:** ' + t.streamingTrend);
  if (t.foodTrend) L.push('**Food trend:** ' + t.foodTrend);
  L.push('');
  L.push('## DESK SIGNAL (fame / sightings)');
  if (slice.signals) {
    L.push('- fame events: ' + slice.signals.fameCount +
      ' · sightings: ' + slice.signals.sightingCount +
      ' · faith pointers: ' + slice.signals.faithCount);
    for (const s of (slice.signals.sightings || []).slice(0, 5)) {
      L.push('- sighting: ' + (s.name || '?') +
        (s.venue ? ' @ ' + s.venue : '') +
        (s.hood ? ' (' + s.hood + ')' : ''));
    }
    for (const f of (slice.signals.fame || []).slice(0, 4)) {
      L.push('- fame: ' + (f.name || f.label));
    }
  }
  L.push('');
  L.push('## APPROACH');
  L.push(slice.approach);
  L.push('');
  L.push('## SCENE COLOR');
  if (slice.scene && slice.scene.colorRoom) L.push(slice.scene.colorRoom);
  L.push('');
  L.push('## OTHER CANDIDATES (scored)');
  for (const c of slice.candidates || []) {
    L.push('- [' + c.score + '] ' + c.className + ' — ' + c.label);
  }
  L.push('');
  L.push('## POINTERS');
  for (const p of slice.pointers || []) L.push('- ' + p);
  L.push('');
  L.push('_Generated by scripts/buildEveningSlice.js — no LLM. Not a Mags desk-slice. Shared substrate, not a single byline._');
  return L.join('\n') + '\n';
}

function slicePaths(cycle, root) {
  const r = root || ROOT;
  return {
    md: path.join(r, 'output', 'slices', 'c' + cycle, 'evening.md'),
    json: path.join(r, 'output', 'cron-compare', 'evening_slice_c' + cycle + '.json')
  };
}

function writeEveningSlice(cycle, slice, root) {
  const paths = slicePaths(cycle, root);
  fs.mkdirSync(path.dirname(paths.md), { recursive: true });
  fs.mkdirSync(path.dirname(paths.json), { recursive: true });
  fs.writeFileSync(paths.json, JSON.stringify(slice, null, 2));
  fs.writeFileSync(paths.md, formatEveningSliceMarkdown(slice));
  return paths;
}

function loadEveningSlice(cycle, root) {
  const paths = slicePaths(cycle, root);
  const j = loadJson(paths.json);
  if (j && !j.empty) return j;
  const slice = buildEveningSlice(cycle, { root: root || ROOT });
  if (!slice.empty) writeEveningSlice(cycle, slice, root);
  return slice.empty ? null : slice;
}

function isEveningConsumer(assign) {
  if (!assign) return false;
  if (assign.persona && EVENING_CONSUMERS[assign.persona]) return true;
  if (assign.popid && CONSUMER_BY_POPID[assign.popid]) return true;
  const name = String(assign.name || '');
  if (/mason\s*ortega|kai\s*marston|sharon\s*okafor|maria\s*keen|elliot\s*graye/i.test(name)) {
    return true;
  }
  return false;
}

function resolveConsumer(assign) {
  if (!assign) return null;
  if (assign.persona && EVENING_CONSUMERS[assign.persona]) return EVENING_CONSUMERS[assign.persona];
  if (assign.popid && CONSUMER_BY_POPID[assign.popid]) return CONSUMER_BY_POPID[assign.popid];
  const name = String(assign.name || '').toLowerCase();
  for (const c of Object.values(EVENING_CONSUMERS)) {
    if (name.includes(c.name.toLowerCase().split(' ')[0])) return c;
  }
  return null;
}

/** Assignment shape for newsroom-fanout / cron-desk-run */
function assignmentFromSlice(slice, personaSlug) {
  if (!slice || slice.empty) return null;
  const consumer = (personaSlug && EVENING_CONSUMERS[personaSlug]) ||
    (slice.recommend && slice.recommend.slug && EVENING_CONSUMERS[slice.recommend.slug]) ||
    null;
  const pulse = personaSlug
    ? pickPulseForPersona(slice.pulses || [], personaSlug)
    : (slice.pulses && slice.pulses[0]) || null;
  const story = storyFromPulse(pulse, slice.cycle) || slice.story;
  const approach = approachForConsumer(consumer, pulse);

  return {
    desk: 'culture',
    name: consumer ? consumer.name : 'Evening pack',
    popid: consumer ? consumer.popid : null,
    beatDomain: consumer && consumer.bag === 'faith' ? 'COMMUNITY' : 'CULTURE',
    persona: consumer ? consumer.slug : null,
    approach,
    story,
    eveningSlice: true,
    eveningLife: true,
    pulse: pulse ? {
      className: pulse.className,
      score: pulse.score,
      label: pulse.label
    } : slice.pulse,
    recommend: slice.recommend,
    bag: consumer ? consumer.bag : (slice.recommend && slice.recommend.bag)
  };
}

/**
 * Enrich an existing fanout assignment when it is an evening consumer.
 * Upgrades weak/missing story with persona-fit pulse; keeps desk/name.
 */
function enrichAssignment(assign, cycle, root) {
  if (!assign || !isEveningConsumer(assign)) return assign;
  try {
    const slice = loadEveningSlice(cycle, root);
    if (!slice || slice.empty) return assign;
    const consumer = resolveConsumer(assign);
    const slug = consumer ? consumer.slug : assign.persona;
    const pulse = pickPulseForPersona(slice.pulses || [], slug);
    // Graye: only force story rewrite on faith-overlap / faithy events
    if (consumer && consumer.bag === 'faith') {
      const faithy = pulse && (
        pulse.className === 'faith-overlap' ||
        faithyEvent(pulse.named || pulse.label || '')
      );
      if (!faithy && assign.story) {
        return Object.assign({}, assign, {
          eveningSlice: true,
          eveningLife: true,
          approach: approachForConsumer(consumer, pulse),
          pulse: pulse ? { className: pulse.className, score: pulse.score, label: pulse.label } : slice.pulse,
          recommend: slice.recommend,
          bag: consumer.bag
        });
      }
    }
    const from = assignmentFromSlice(slice, slug);
    if (!from) return assign;
    return Object.assign({}, assign, {
      approach: from.approach,
      story: from.story || assign.story,
      eveningSlice: true,
      eveningLife: true,
      pulse: from.pulse,
      recommend: from.recommend,
      bag: from.bag
    });
  } catch (_) {
    return assign;
  }
}

if (require.main === module) {
  const cycle = arg('--cycle', null) || (() => {
    try {
      return require(path.join(ROOT, 'lib', 'getCurrentCycle'))({ soft: true, noArgv: true });
    } catch (_) { return null; }
  })();
  if (cycle == null) {
    console.error('buildEveningSlice: pass --cycle N');
    process.exit(1);
  }
  const slice = buildEveningSlice(cycle);
  const paths = writeEveningSlice(cycle, slice);
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(slice, null, 2));
  } else {
    console.log('evening slice c' + cycle +
      (slice.empty ? ' EMPTY' :
        ' pulse=' + slice.pulse.className +
        ' score=' + slice.pulse.score +
        ' bag=' + (slice.recommend && slice.recommend.bag) +
        ' venues=' + ((slice.scene && slice.scene.venues) || []).length +
        ' candidates=' + (slice.candidates || []).length));
    if (!slice.empty) {
      console.log('  ' + String(slice.pulse.label).slice(0, 120));
      if (slice.recommend && slice.recommend.slug) {
        console.log('  recommend: ' + slice.recommend.slug + ' (' + slice.recommend.bag + ')');
      }
      const names = [];
      for (const v of (slice.texture && slice.texture.restaurants) || []) names.push(v.name);
      for (const v of (slice.texture && slice.texture.nightlife) || []) names.push(v.name);
      if (names.length) console.log('  named: ' + names.join(', '));
    }
    console.log('→ ' + path.relative(ROOT, paths.md));
    console.log('→ ' + path.relative(ROOT, paths.json));
  }
}

module.exports = {
  buildEveningSlice,
  writeEveningSlice,
  loadEveningSlice,
  formatEveningSliceMarkdown,
  assignmentFromSlice,
  enrichAssignment,
  slicePaths,
  parseEveningTexture,
  parseCultureSignals,
  emitPulses,
  recommendConsumer,
  pickPulseForPersona,
  isEveningConsumer,
  EVENING_APPROACH,
  EVENING_CONSUMERS
};
