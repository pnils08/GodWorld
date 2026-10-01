#!/usr/bin/env node
/**
 * buildMarburySlice.js — Elliot Marbury's data-desk slice (pipeline.68 Task 7 grid seat,
 * seated 2026-09-30 on the builder's go). A records seat: he interviews nobody and the
 * piece is the proof. Source: the player dossier mirror (output/player_truesource_mirror.json,
 * written by ingestPlayerTrueSource.js) — one player's season-by-season line in full, the
 * rates the bag allows derived from it here (never by the writer), two peers at the same
 * job for a band, and this cycle's feed line when the player is on it.
 * Subject: a dossier player named on this cycle's Oakland_Sports_Feed, else the dossier
 * list in rotation — the cycle number picks, so a re-run of the same cycle is the same memo.
 * Authority and modes: docs/media/MARBURY_DATA_BAG.md. Years on a dossier are the sports
 * clock's own.
 * Artifacts: output/slices/c{N}/elliot-marbury.md · output/cron-compare/data_desk_slice_c{N}.json
 */
'use strict';
const path = require('path');
const K = require('./beatSliceKit');

const SEAT = {
  slug: 'elliot-marbury', name: 'Elliot Marbury', popid: 'POP-00166', desk: 'sports',
  kind: 'beat-data-desk', domain: 'data-desk', artifact: 'data_desk', builder: 'buildMarburySlice.js',
  version: 'DATA-DESK-SLICE-1', nameRe: /elliot\s*marbury/i,
  tabs: ['Oakland_Sports_Feed'],
  approach: 'Data-desk approach: this slice is one player\'s season-by-season line off the dossier, the rates worked out from it, and two peers at the same job. Third person, dry, source-forward. One hard claim the numbers carry, with its sample size stated; a thin season is variance, not identity. Say which number next season would kill the claim. No quotes, no scene, no clubhouse — the memo is the proof.',
  roomIsYours: 'the order the columns are read in, which season is the hinge, what the peer band makes ordinary or strange',
  build
};

const PITCHER_COLS = ['G', 'GS', 'W', 'L', 'SV', 'BS', 'HLD', 'IP', 'H', 'R', 'ER', 'HR', 'BB', 'SO', 'ERA'];
const HITTER_COLS = ['G', 'AB', 'R', 'H', '2B', '3B', 'HR', 'RBI', 'BB', 'SO', 'SB', 'CS', 'AVG', 'OBP', 'SLG'];

// Baseball innings notation: .1 and .2 are thirds of an inning.
function innings(ip) {
  const m = String(ip == null ? '' : ip).trim().match(/^(\d+)(?:\.([012]))?$/);
  return m ? Number(m[1]) + Number(m[2] || 0) / 3 : null;
}
function rate(n, d, digits) {
  return d ? (n / d).toFixed(digits) : null;
}
function avg3(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n.toFixed(3).replace(/^0/, '') : String(v);
}

/** One dossier → { name, pop, position, team, type, seasons:[{year, team, ...cols}] } or null. */
function parseCard(card) {
  const content = String(card && card.content || '');
  const lines = content.split('\n').map(l => l.trim());
  const headAt = lines.findIndex(l => /^year\s+team\s+g\b/i.test(l));
  if (headAt < 0) return null;
  const head = lines[headAt].toUpperCase().split(/\s+/).slice(2);
  const type = head.includes('IP') ? 'pitcher' : head.includes('AB') ? 'hitter' : null;
  const cols = type === 'pitcher' ? PITCHER_COLS : HITTER_COLS;
  if (!type || cols.some((c, i) => head[i] !== c)) return null;
  const seasons = [];
  for (const line of lines.slice(headAt + 1)) {
    const cells = line.split(/\s+/);
    if (!/^\d{4}$/.test(cells[0])) break;
    if (cells.length !== cols.length + 2) continue;   // a ragged row stays off the memo
    // ...and so does a row with a cell that is not a plain number (a dash, a footnote mark).
    if (!cells.slice(2).every(v => /^\d*\.?\d+$/.test(v))) continue;
    const row = { year: cells[0], team: cells[1] };
    cols.forEach((c, i) => { row[c] = cells[i + 2]; });
    seasons.push(row);
  }
  if (!seasons.length) return null;
  seasons.sort((a, b) => Number(b.year) - Number(a.year));   // "latest" is the year, not the row order
  const field = re => { const m = content.match(re); return m ? m[1].trim() : null; };
  return {
    pop: String(card.popId || '').toUpperCase(), name: String(card.player || '').trim(),
    position: field(/^Position:\s*(.+)$/m), team: field(/^Team:\s*(.+)$/m), type, seasons
  };
}

function seasonLine(card, s) {
  if (card.type === 'pitcher') {
    return s.year + ' ' + s.team + ': ' + s.G + ' G, ' + s.GS + ' GS, ' + s.W + '-' + s.L + ', ' + s.SV + ' SV, ' +
      s.IP + ' IP, ' + s.H + ' H, ' + s.ER + ' ER, ' + s.HR + ' HR, ' + s.BB + ' BB, ' + s.SO + ' SO, ERA ' + s.ERA;
  }
  return s.year + ' ' + s.team + ': ' + s.G + ' G, ' + s.AB + ' AB, ' + s.H + ' H, ' + s.HR + ' HR, ' + s.RBI + ' RBI, ' +
    s.BB + ' BB, ' + s.SO + ' SO, ' + s.SB + ' SB, AVG ' + avg3(s.AVG) + ', OBP ' + avg3(s.OBP) + ', SLG ' + avg3(s.SLG);
}

// The bag's derived set only: K/9, BB/9, K/BB for an arm; AB per HR and SO per AB for a bat.
function rateLine(card, s) {
  if (card.type === 'pitcher') {
    const ip = innings(s.IP), so = Number(s.SO), bb = Number(s.BB);
    if (!ip || !Number.isFinite(so) || !Number.isFinite(bb)) return null;
    const k9 = rate(so * 9, ip, 1), bb9 = rate(bb * 9, ip, 1), kbb = rate(so, bb, 2);
    return s.year + ' rates (' + s.IP + ' IP): ' + k9 + ' K per 9, ' + bb9 + ' BB per 9' + (kbb ? ', ' + kbb + ' K per BB' : '');
  }
  const ab = Number(s.AB), hr = Number(s.HR), so = Number(s.SO);
  if (!ab || !Number.isFinite(hr) || !Number.isFinite(so)) return null;
  return s.year + ' rates (' + s.AB + ' AB): ' + (hr ? 'one HR every ' + rate(ab, hr, 1) + ' AB' : 'no HR') +
    ', ' + (so ? 'one SO every ' + rate(ab, so, 1) + ' AB' : 'no SO');
}

function build(cycle, { root, beats }) {
  const mirror = K.loadJson(path.join(root, 'output', 'player_truesource_mirror.json'));
  const cards = Object.values(mirror || {}).map(parseCard).filter(c => c && /^POP-\d{5}$/.test(c.pop))
    .sort((a, b) => a.pop.localeCompare(b.pop));
  if (!cards.length) return K.emptySlice(SEAT, cycle, 'no readable dossier in player_truesource_mirror.json');

  const feed = (beats.Oakland_Sports_Feed || []).filter(r => Number(r.Cycle) === Number(cycle));
  const feedText = feed.map(r => [r.NamesUsed, r.Stats, r.StoryAngle, r.Notes].join(' ')).join(' ').toLowerCase();
  const onFeed = cards.filter(c => c.name && feedText.includes(c.name.toLowerCase()));
  // The bag's multi-year mode wants three seasons or more; a one-season card is a last resort.
  const named = onFeed.length ? onFeed : cards;
  const deep = named.filter(c => c.seasons.length >= 3);
  const pool = deep.length ? deep : named;
  const subject = pool[Number(cycle) % pool.length];

  const src = 'output/player_truesource_mirror.json ' + subject.pop;
  const facts = [{ text: subject.name + ' — ' + [subject.position, subject.team].filter(Boolean).join(', ') +
    '; ' + subject.seasons.length + ' season' + (subject.seasons.length === 1 ? '' : 's') + ' on the dossier', src }];
  // Every season shown gets its rates — a memo told two of five seasons are "blank" says so in print.
  const shown = subject.seasons.slice(0, 6);
  for (const s of shown) facts.push({ text: subject.name + ' ' + seasonLine(subject, s), src });
  for (const s of shown) {
    const line = rateLine(subject, s);
    if (line) facts.push({ text: subject.name + ' ' + line + ' (worked from the season line)', src });
  }
  // Peer band: the two nearest dossiers at the same job, latest season each.
  // Peer band = same position (the bag: "roster peers at position"). A card listing
  // several positions is read by its first. Fewer than two such cards → a shorter band.
  const primary = c => String(c.position || '').split(/[\s,/]+/)[0].toUpperCase();
  const peers = cards.filter(c => c !== subject && c.type === subject.type && primary(c) && primary(c) === primary(subject))
    .sort((a, b) => a.pop.localeCompare(b.pop))
    .slice(0, 2);
  for (const p of peers) {
    const peerSrc = 'output/player_truesource_mirror.json ' + p.pop;
    facts.push({ text: 'Peer — ' + p.name + ' (' + [p.position, p.team].filter(Boolean).join(', ') + ') ' + seasonLine(p, p.seasons[0]), src: peerSrc });
    // The peer's rates are worked here too — a writer left to divide gets it wrong (bench C109).
    const peerRate = rateLine(p, p.seasons[0]);
    if (peerRate) facts.push({ text: 'Peer — ' + p.name + ' ' + peerRate + ' (worked from the season line)', src: peerSrc });
  }
  // This cycle's feed line, when he is on it — the delta check against the season line.
  const feedSrc = 'output/beats/Oakland_Sports_Feed.jsonl @C' + cycle;
  for (const row of feed) {
    const stat = String(row.Stats || '').split(',').map(x => x.trim())
      .find(x => x.toLowerCase().startsWith(subject.name.toLowerCase()));
    if (stat) { facts.push({ text: 'This cycle (feed, ' + (row.SeasonType || 'season') + '): ' + stat, src: feedSrc }); continue; }
    // Named in the notes but not on the stat line: carry the sentence that names him.
    const said = String(row.Notes || '').split(/(?<=[.!?])\s+/)
      .filter(x => x.toLowerCase().includes(subject.name.toLowerCase())).join(' ').trim().slice(0, 300);
    if (said) facts.push({ text: 'This cycle (feed notes, ' + (row.SeasonType || 'season') + '): ' + said, src: feedSrc });
  }

  const latest = subject.seasons[0];
  const modes = subject.type === 'pitcher' ? 'pitcher command memo, multi-year' : 'hitter density memo, multi-year';
  const label = subject.name + ' — ' + subject.seasons.length + ' season' + (subject.seasons.length === 1 ? '' : 's') +
    ' on the dossier, ' + latest.year + ' the latest | ' + modes;
  const people = [K.person(subject.pop, subject.name, [subject.position, subject.team].filter(Boolean).join(', ') || null, null,
    'dossier on file (player_truesource_mirror)')];
  return K.makeSlice(SEAT, cycle, beats, {
    ref: src + ' @C' + cycle, hood: null, label,
    angle: label + ' — what the line proves, on what sample, and what would disprove it',
    hookLine: subject.name + '\'s ' + latest.year + ' line against ' + (subject.seasons.length - 1) + ' earlier season' +
      (subject.seasons.length - 1 === 1 ? '' : 's') + (peers.length ? ' and ' + peers.length + ' peer' + (peers.length === 1 ? '' : 's') : '') + '.',
    facts, people,
    deltas: { state: 'DOSSIER', vs: null },
    hooks: K.hooksFor(beats, cycle, SEAT.name),
    note: onFeed.length ? 'subject is on this cycle\'s feed' : 'no dossier player on this cycle\'s feed — subject by rotation',
    extra: { subject: { pop: subject.pop, name: subject.name, type: subject.type, seasons: subject.seasons.length },
      peers: peers.map(p => ({ pop: p.pop, name: p.name })) }
  });
}

const W = K.wire(SEAT);
if (require.main === module) W.main();
module.exports = { SEAT, loadSlice: W.load, buildMarburySlice: W.build, writeMarburySlice: W.write, loadMarburySlice: W.load,
  isMarburySeat: W.isSeat, assignmentFromSlice: W.assignmentFromSlice, enrichAssignment: W.enrichAssignment, slicePaths: W.paths, paths: W.paths,
  parseCard, seasonLine, rateLine, innings };
