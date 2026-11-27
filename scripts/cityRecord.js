'use strict';
/**
 * scripts/cityRecord.js — a seat's record with its city feed entries leading (pipeline.118; builder 2026-11-26: "the
 * cron wakes with what to chase"). A wrap, not a swap (agy 2026-11-26 #4): the seat's own builder still runs and still
 * supplies its people, its scrubbed rows and its sits-out rule.
 *
 * withCityFeed(SEAT, build) -> build(cycle, ctx):
 *   the seat's entries for the Cycle and the one before open the facts, whole, newest first;
 *   behind them ride only the record rows that name a place or person an entry names (the rest of the record is a
 *   sheet_read away); the people pool is the builder's, whole.
 * Entries come from the feed's copy: GODWORLD_CITY_FEED_FILE (a test day's file) or output/city-feed-live.json.
 * No copy, or no entry for the seat: the builder's record, unchanged.
 */
const fs = require('fs');
const path = require('path');

function feedFile(root) { return process.env.GODWORLD_CITY_FEED_FILE || path.join(root || path.join(__dirname, '..'), 'output', 'city-feed-live.json'); }
function hasFeed(root) { try { return fs.existsSync(feedFile(root)); } catch (e) { return false; } }
function loadEntries(root) {
  try { const j = JSON.parse(fs.readFileSync(feedFile(root), 'utf8')); return Array.isArray(j) ? j : (j.rows || []); } catch (e) { return []; }
}
function entryText(r) {
  return ('C' + r.Cycle + ' · ' + (r.Beat || 'city') + ' · ' + (r.EventType || 'event') + (r.NamesUsed ? ' · ' + r.NamesUsed : '') + ': ' + (r.Notes || '')).replace(/\s+/g, ' ').trim();
}
function seatEntries(rows, slug, cycle) {
  return (rows || []).filter((r) => String(r.Seats || '').split(/,\s*/).includes(slug) && Number(r.Cycle) >= Number(cycle) - 1 && Number(r.Cycle) <= Number(cycle))
    .sort((a, b) => Number(b.Cycle) - Number(a.Cycle));
}
// The names an entry carries, without the role in brackets.
function entryNames(r) { return String(r.NamesUsed || '').split(/,\s*(?![^()]*\))/).map((n) => n.replace(/\s*\([^)]*\)\s*$/, '').trim()).filter((n) => n.length > 3); }

function withCityFeed(SEAT, build) {
  return function buildWithFeed(cycle, ctx) {
    const slice = build(cycle, ctx);
    if (!slice || slice.empty) return slice;
    const entries = seatEntries(loadEntries(ctx && ctx.root), SEAT.slug, cycle);
    if (!entries.length) return slice;
    const names = Array.from(new Set(entries.flatMap(entryNames))).map((n) => n.toLowerCase());
    const lead = entries.map((r) => ({ text: entryText(r), src: 'City_Feed ' + (r.EntryId || '') + (r.Refs ? ' — ' + r.Refs : '') }));
    const behind = (slice.facts || []).filter((f) => names.some((n) => String(f.text || '').toLowerCase().includes(n)));
    const facts = lead.concat(behind);
    slice.facts = facts;
    slice.prewrite.anchorFacts = facts.map((f) => f.text);
    slice.prewrite.evidence = facts;
    slice.prewrite.factCap = Math.max(slice.prewrite.factCap || 0, facts.length);
    slice.prewrite.factChars = Math.max(slice.prewrite.factChars || 0, 6000);
    slice.cityFeed = { entries: entries.map((r) => r.EntryId), rowsBehind: behind.length, rowsLeft: (slice.prewrite.evidence.length - facts.length) };
    return slice;
  };
}

module.exports = { withCityFeed, hasFeed, loadEntries, seatEntries, entryText, entryNames, feedFile };
