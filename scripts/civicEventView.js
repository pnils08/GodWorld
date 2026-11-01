'use strict';

// Local export adapter for civic awareness. This module never reads a Sheet.
// Source coordinates identify a record; the content hash identifies its revision.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { getNeighborhoodsForDistricts } = require('../lib/districtMap');

const HOODS = new Map();
for (let n = 1; n <= 9; n++) {
  for (const hood of getNeighborhoodsForDistricts('D' + n)) HOODS.set(hood.toLowerCase(), hood);
}
const STATUS = new Set(['announced', 'occurred', 'cancelled', 'corrected']);
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const concise = value => String(value == null ? '' : value).trim().replace(/\s+/g, ' ');
const canonical = value => HOODS.get(concise(value).toLowerCase()) || null;

function readSource(file) {
  try {
    const body = fs.readFileSync(file, 'utf8');
    return { body, hash: sha(body), exists: true };
  } catch (e) {
    if (e.code === 'ENOENT') return { body: '', hash: null, exists: false };
    throw e;
  }
}

function statusOf(row, fallback) {
  const given = concise(row.EventStatus || row.Status).toLowerCase();
  if (given && STATUS.has(given)) return given;
  return fallback;
}

function sportsEvent(row, line, observedAt) {
  const cycle = Number(row.Cycle);
  if (!Number.isInteger(cycle) || cycle < 0) return null;
  const notes = concise(row.Notes);
  const angle = concise(row.StoryAngle);
  const kind = concise(row.EventType).toLowerCase();
  const season = concise(row.SeasonType).toLowerCase();
  const victory = kind === 'game-result' && season === 'championship' &&
    /\b(won|wins|champions?)\b/i.test(notes + ' ' + angle);
  const parade = /\bparade\b/i.test(notes + ' ' + angle) &&
    (kind === 'editorial-note' || kind === 'city-event');
  const outreach = kind === 'community-outreach';
  if (!victory && !parade && !outreach) return null;
  const hood = canonical(row.HomeNeighborhood);
  // An announced future parade in a championship result is a fact within that
  // result; only the later parade record is the occurrence. Never parse prose
  // place spellings into tracked geography.
  const category = victory ? 'sports-championship' : parade ? 'sports-parade' : 'sports-community';
  const inferred = parade && /\bcelebrated|\bparade (ran|rolled|rolls|held)\b/i.test(notes + ' ' + angle)
    ? 'occurred' : victory || outreach ? 'occurred' : 'announced';
  const sourceKey = concise(row.EventID || row.SourceEventID) || 'line-' + line;
  const sourceRef = 'output/beats/Oakland_Sports_Feed.jsonl:' + line;
  const facts = [angle, notes].filter(Boolean);
  return {
    eventId: 'EV-sports-' + sha(sourceKey).slice(0, 16),
    sourceRef, sourceRevision: sha(JSON.stringify(row)), occurredCycle: cycle,
    status: statusOf(row, inferred), observedAt, category,
    significance: victory || parade ? 'major' : 'local',
    hoods: hood ? [hood] : [], citywideRelevance: victory || parade,
    entityIds: [row.TeamID, row.EventID].map(concise).filter(Boolean),
    facts, aliases: [],
  };
}

function summaryEvents(body, cycle, observedAt) {
  const rows = [];
  let section = '';
  let ripple = '';
  const lines = body.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^## /.test(line)) { section = line.slice(3).trim().toLowerCase(); ripple = ''; continue; }
    if (/^### /.test(line)) { ripple = line.slice(4).replace(/\s*\(\d+\).*$/, '').trim().toLowerCase(); continue; }
    if (section.startsWith('what moved') && ripple === 'city-event' && /^- /.test(line)) {
      const parts = line.slice(2).split('|').map(concise);
      if (parts.length < 2) continue;
      const hood = canonical(parts[2]);
      const text = parts[1];
      const sourceRef = 'output/world_summary_c' + cycle + '.md:' + (i + 1);
      rows.push({
        eventId: 'EV-summary-' + sha(sourceRef).slice(0, 16),
        sourceRef, sourceRevision: sha(line), occurredCycle: Number(cycle),
        status: 'occurred', observedAt, category: 'city-event', significance: 'local',
        hoods: hood ? [hood] : [], citywideRelevance: false, entityIds: [],
        facts: [text], aliases: [],
      });
    }
    if (section.startsWith('world events') && /^- \*\*/.test(line)) {
      const m = /^- \*\*([^*]+?):\*\*\s*(.+)$/.exec(line);
      if (!m) continue;
      const parts = m[1].split(' — ').map(concise);
      if (parts.length < 3) continue;
      const hood = canonical(parts[2]);
      const sourceRef = 'output/world_summary_c' + cycle + '.md:' + (i + 1);
      rows.push({
        eventId: 'EV-world-' + sha(sourceRef).slice(0, 16),
        sourceRef, sourceRevision: sha(line), occurredCycle: Number(cycle),
        status: 'occurred', observedAt,
        category: 'world-' + parts[0].toLowerCase(),
        significance: /medium|high/i.test(m[2]) ? 'noted' : 'local',
        hoods: hood ? [hood] : [], citywideRelevance: false, entityIds: [],
        facts: [concise(m[2])], aliases: [],
      });
    }
  }
  return rows;
}

function loadEventView(root, cycle) {
  const at = Number(cycle);
  const meta = readSource(path.join(root, 'output', 'beats', 'meta.json'));
  const sports = readSource(path.join(root, 'output', 'beats', 'Oakland_Sports_Feed.jsonl'));
  const summary = readSource(path.join(root, 'output', 'world_summary_c' + cycle + '.md'));
  let parsedMeta = null;
  try { parsedMeta = meta.exists ? JSON.parse(meta.body) : null; } catch (_) { /* unavailable */ }
  const observedAt = parsedMeta && typeof parsedMeta.generatedAt === 'string' ? parsedMeta.generatedAt : null;
  const sportsFresh = sports.exists && parsedMeta && Number(parsedMeta.cycle) === at && observedAt;
  const summaryFresh = summary.exists && new RegExp('^# World Summary \\u2014 Cycle ' + at + '\\s*$', 'm').test(summary.body);
  const events = [];
  const issues = [];
  if (!sportsFresh) issues.push('sports export missing, invalid or from another Cycle');
  if (!summaryFresh) issues.push('world summary missing or from another Cycle for C' + cycle);
  if (sportsFresh) {
    const lines = sports.body.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      try {
        const ev = sportsEvent(JSON.parse(lines[i]), i + 1, observedAt);
        if (ev && ev.occurredCycle <= at) events.push(ev);
      } catch (_) { issues.push('sports row ' + (i + 1) + ' unreadable'); }
    }
  }
  if (summaryFresh) events.push(...summaryEvents(summary.body, cycle, observedAt));
  // Explicit shared source IDs can point to the same event. Preserve aliases
  // and one event effect identity; never infer sameness from a title alone.
  const byId = new Map();
  for (const ev of events) {
    const old = byId.get(ev.eventId);
    if (!old) { byId.set(ev.eventId, ev); continue; }
    if (old.sourceRef !== ev.sourceRef) old.aliases.push(ev.sourceRef);
    if (old.sourceRevision !== ev.sourceRevision) byId.set(ev.eventId, { ...ev, aliases: old.aliases });
  }
  const generation = {
    cycle: at, observedAt,
    sources: {
      sports: { available: !!sportsFresh, hash: sports.hash },
      summary: { available: !!summaryFresh, hash: summary.hash },
    },
    hash: sha(JSON.stringify({ cycle: at, meta: meta.hash, sports: sports.hash, summary: summary.hash })),
    completeThrough: observedAt, issues,
  };
  return { generation, events: [...byId.values()] };
}

function eventsForSeat(view, office) {
  const district = concise(office.district);
  const mayor = concise(office.officeId) === 'MAYOR-01';
  const hoods = new Set((/^D\d$/.test(district)
    ? getNeighborhoodsForDistricts(district) : (office.neighborhoods || [])).map(h => h.toLowerCase()));
  return (view.events || []).filter(ev =>
    (mayor && ev.citywideRelevance) || ev.hoods.some(h => hoods.has(h.toLowerCase()))
  ).sort((a, b) => b.occurredCycle - a.occurredCycle || a.eventId.localeCompare(b.eventId));
}

module.exports = { loadEventView, eventsForSeat, sportsEvent, summaryEvents, canonical, sha };
