'use strict';
/**
 * scripts/sportsRecord.js — a sports seat's record, read live from the sports feed (pipeline.111; builder 2026-11-24:
 * "they see the headlines and they cover the stories"; "just read the sheets live").
 *
 * makeSportsRecord(SEAT, opts) -> the seat's build(cycle, { root }):
 *   opts.teams     RegExp on TeamsUsed — the clubs the seat covers (the A's; or the A's and the Oaks)
 *   opts.colleagues  true: the sports pieces other Tribune seats filed this Cycle ride on the record (who wrote what)
 * Every public row of those clubs for the current and the previous Cycle, newest first, whole as the sheet holds it
 * (the morning's copy, sportsFeedLive.js; a copy over 20 h old sits the seat out). The seat's own pieces already filed
 * this Cycle open the record, so a second piece is another story. No row is made the story; no score, claim or method.
 */
const fs = require('fs');
const path = require('path');
const K = require('./beatSliceKit');
const live = require('./sportsFeedLive');

const MAX_AGE_MS = 20 * 3600 * 1000;   // the 06:15 copy still serves the 18:15 write

function rowText(r) {
  const bits = ['C' + r.Cycle + (r.SeasonType ? ' (' + r.SeasonType + ')' : '') + ' · ' + (r.TeamsUsed ? r.TeamsUsed + ' · ' : '') + (r.EventType || 'feed') +
    (r.NamesUsed ? ' · ' + r.NamesUsed : '') + ':', r.Notes || r.StoryAngle || ''];
  if (r.Stats) bits.push('| Stats: ' + r.Stats);
  if (r['Team Record']) bits.push('| Team record: ' + r['Team Record']);
  if (r.Streak) bits.push('| Streak: ' + r.Streak);
  if (r.WeekRecord) bits.push('| Week: ' + r.WeekRecord);
  return bits.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
}

// Sports pieces filed this Cycle: [{ slug, file, head }] from the staged files.
function filedThisCycle(root, cycle) {
  const staged = path.join(root || path.join(__dirname, '..'), 'output', 'cron-compare', 'staged');
  let files = [];
  try { files = fs.readdirSync(staged).filter((f) => new RegExp('^sports_c' + Number(cycle) + '_([a-z-]+)_.*\\.staged(-\\d+)?\\.md$').test(f)); } catch (e) { return []; }
  return files.sort().map((f) => {
    const slug = f.match(/^sports_c\d+_([a-z-]+?)_packet/) ? f.match(/^sports_c\d+_([a-z-]+?)_packet/)[1] : f.split('_')[2];
    let head = '';
    try { head = (fs.readFileSync(path.join(staged, f), 'utf8').split('\n').find((l) => /^#\s/.test(l)) || '').replace(/^#+\s*/, '').trim(); } catch (e) { head = ''; }
    return { slug, file: f, head };
  }).filter((x) => x.head);
}

function makeSportsRecord(SEAT, opts) {
  const teams = opts.teams;
  const clubs = opts.clubsLabel || 'the sports feed';
  return function build(cycle, { root }) {
    const feed = live.load(root);
    if (!feed) return K.emptySlice(SEAT, cycle, 'the morning copy of the sports feed is missing (sportsFeedLive.js)');
    const age = Date.now() - Date.parse(feed.readAt || 0);
    if (!(age >= 0 && age < MAX_AGE_MS)) return K.emptySlice(SEAT, cycle, 'the sports feed copy was read ' + (feed.readAt || 'never') + ' — not this morning\'s; the seat sits the day out');
    const cyc = (r) => (String(r.Cycle || '').trim() === '' ? NaN : Number(r.Cycle));
    const rows = feed.rows.filter((r) => teams.test(r.TeamsUsed || '') && cyc(r) >= Number(cycle) - 1 && cyc(r) <= Number(cycle) + 1);
    const read = new Date(feed.readAt).toLocaleDateString('en-CA', { timeZone: 'America/Chicago' });
    const facts = rows.sort((a, b) => b.row - a.row).map((r) => ({ text: rowText(r), src: 'Oakland_Sports_Feed row ' + r.row + ' (live, read ' + read + ')' }));
    if (!facts.length) return K.emptySlice(SEAT, cycle, 'no row for ' + clubs + ' on the sports feed for C' + (cycle - 1) + '–C' + cycle);
    const filed = filedThisCycle(root, cycle);
    if (opts.colleagues) {
      const others = filed.filter((x) => x.slug !== SEAT.slug);
      for (const x of others.reverse()) facts.unshift({ text: 'Filed this Cycle by ' + (opts.names && opts.names[x.slug] || x.slug) + ': "' + x.head + '"', src: 'output/cron-compare/staged/' + x.file });
    }
    for (const x of filed.filter((y) => y.slug === SEAT.slug).reverse()) facts.unshift({ text: 'Your piece already filed this Cycle: "' + x.head + '"', src: 'output/cron-compare/staged/' + x.file });
    // opts.people: the people the rows name (players, coaches, the front office) are people the seat can go to — each
    // with the row's own reason; Tribune staff and the seat itself are never sources (K.isMediaStaff)
    const people = [];
    if (opts.people) {
      const sports = require('./sportsSubstrate');
      const index = sports.loadLedgerNameIndex(root);
      const profiles = K.loadProfiles(root);
      for (const r of rows) {
        for (const nm of String(r.NamesUsed || '').split(/,\s*/).map((x) => x.replace(/\s*\([^)]*\)\s*$/, '').trim()).filter(Boolean)) {
          const hit = sports.resolvePlayer(nm, index);
          const id = String(hit.popid || '').toUpperCase();
          if (!/^POP-\d+$/.test(id) || id === SEAT.popid || K.isMediaStaff(profiles, id) || people.some((p) => p.popid === id) || people.length >= 25) continue;
          const p = K.personFromProfile(profiles, id, 'C' + r.Cycle + ' ' + (r.TeamsUsed || '') + ' ' + (r.EventType || 'feed'));
          if (p) { p.profile = p.profile + ' — on the feed: C' + r.Cycle + ' ' + (r.EventType || ''); people.push(p); }
        }
      }
    }
    const newest = rows.reduce((m, r) => Math.max(m, r.row), 0);
    const lo = Math.min(...rows.map(cyc)), hi = Math.max(...rows.map(cyc));
    return K.makeSlice(SEAT, cycle, {}, {
      // the morning's date in the ref: a second day with no new row is still a new day's record
      ref: clubs + ' on the sports feed, C' + lo + (hi !== lo ? '–C' + hi : '') + ', through row ' + newest + ', read ' + read, factChars: 6000,
      hood: null, label: clubs + ' on the sports feed', angle: clubs + ' on the sports feed', hookLine: '',
      facts, people, peopleCap: 25, factCap: facts.length, deltas: null, hooks: [], note: null,
      extra: { rows: rows.length, readAt: feed.readAt }
    });
  };
}

// The Tribune's sports bylines by seat slug, for the colleagues' lines.
const SPORTS_NAMES = { 'anthony-raines': 'Anthony Raines', 'p-slayer': 'P Slayer', 'hal-richmond': 'Hal Richmond', 'elliot-marbury': 'Elliot Marbury',
  'tanya-cruz': 'Tanya Cruz', 'simon-leary': 'Simon Leary', 'selena-grant': 'Selena Grant', 'talia-finch': 'Talia Finch' };

module.exports = { makeSportsRecord, filedThisCycle, rowText, SPORTS_NAMES };
