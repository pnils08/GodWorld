'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const TAB = 'Oakland_Sports_Feed';
const MAX_AGE = 3;
const MAX_ITEMS = 5;

function sha(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function unavailable(reason) {
  return { available: false, reason, items: [], omitted: 0 };
}

function isParade(row) {
  return String(row.EventType || '').toLowerCase() === 'editorial-note' &&
    /\bparade\b/i.test(String(row.StoryAngle || '')) &&
    /\bparade\b/i.test(String(row.Notes || ''));
}

function isChampionship(row) {
  return String(row.EventType || '').toLowerCase() === 'game-result' &&
    String(row.SeasonType || '').toLowerCase() === 'championship' &&
    String(row.EventTrigger || '').toLowerCase() === 'championship';
}

// This is an awareness adapter. Source records cannot execute a city event or
// credit an official. A local source coordinate keeps identity when a row is
// corrected; the revision hash changes so a later brief can show the update.
function loadMajorSportsEvents({ root, cycle, office, hoods, canonicalHoods }) {
  const target = Number(cycle);
  if (!Number.isSafeInteger(target) || target < 1) return unavailable('invalid requested Cycle');
  const dir = path.join(root, 'output', 'beats');
  let meta, raw;
  try {
    meta = JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8'));
    raw = fs.readFileSync(path.join(dir, TAB + '.jsonl'), 'utf8');
  } catch (e) { return unavailable('sports snapshot missing or unreadable: ' + e.message); }
  if (Number(meta.cycle) !== target || !Number.isSafeInteger(Number(meta.cycle))) {
    return unavailable('sports snapshot Cycle ' + String(meta.cycle) + ' differs from C' + target);
  }
  if (typeof meta.generatedAt !== 'string' || !Number.isFinite(Date.parse(meta.generatedAt))) {
    return unavailable('sports snapshot generation time missing');
  }
  const lines = raw.split(/\r?\n/).filter(Boolean);
  if (!meta.rows || Number(meta.rows[TAB]) !== lines.length) {
    return unavailable('sports snapshot row count disagrees with metadata');
  }
  const mayor = office && office.officeId === 'MAYOR-01';
  const turf = new Set((hoods || []).map(h => String(h).trim().toLowerCase()));
  const canonical = new Map((canonicalHoods || []).map(h => [String(h).trim().toLowerCase(), String(h).trim()]));
  const items = [];
  for (let i = 0; i < lines.length; i++) {
    let row;
    try { row = JSON.parse(lines[i]); }
    catch (e) { return unavailable('sports snapshot has invalid JSON at row ' + (i + 1)); }
    const occurredCycle = Number(row.Cycle);
    if (!Number.isSafeInteger(occurredCycle) || occurredCycle < 1 || occurredCycle > target) continue;
    if (target - occurredCycle > MAX_AGE) continue;
    const parade = isParade(row);
    const championship = isChampionship(row);
    if (!parade && !championship) continue;
    const sourceHood = String(row.HomeNeighborhood || '').trim();
    const hood = canonical.get(sourceHood.toLowerCase()) || '';
    const citywideRelevance = championship || parade;
    if (!((mayor && citywideRelevance) || (hood && turf.has(hood.toLowerCase())))) continue;
    const story = String(row.StoryAngle || '').trim();
    if (!story) continue;
    items.push({
      eventId: 'sports-feed:' + (i + 1),
      sourceRef: TAB + ':' + (i + 1),
      sourceRevision: sha(lines[i]),
      occurredCycle,
      observedAt: meta.generatedAt,
      status: 'occurred',
      category: parade ? 'sports-parade' : 'sports-championship',
      significance: 'major',
      hoods: hood ? [hood] : [],
      unresolvedPlace: sourceHood && !hood ? sourceHood : null,
      citywideRelevance,
      team: String(row.TeamsUsed || '').trim(),
      fact: story,
    });
  }
  items.sort((a, b) => b.occurredCycle - a.occurredCycle || a.eventId.localeCompare(b.eventId));
  return {
    available: true,
    snapshotCycle: target,
    snapshotGeneratedAt: meta.generatedAt,
    snapshotHash: sha(raw),
    coverageNote: 'Source snapshot through ' + meta.generatedAt + '; later updates are not verified by this brief.',
    items: items.slice(0, MAX_ITEMS),
    omitted: Math.max(0, items.length - MAX_ITEMS),
  };
}

module.exports = { loadMajorSportsEvents };
