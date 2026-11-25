#!/usr/bin/env node
'use strict';
/**
 * scripts/sportsFeedLive.js — the sports feed as it stands this morning (pipeline.111; builder 2026-11-24: "just read the
 * sheets live that way anything that happens during the week gets covered and doesn't wait til the cycle runs").
 *
 * The sports seats' records were built from the world summary's sports section, frozen when the Cycle fired; a row the
 * builder added on a Tuesday reached no reporter until the next Sunday. This reads Oakland_Sports_Feed live, drops the
 * builder's private question rows (engine.338, lib/feedPrivacy.js), keeps each row's place on the sheet, and writes the
 * morning's copy to output/sports/feed_live.json. The newsroom's morning run refreshes it before the seats' records are
 * built; every stage of the day reads the same copy.
 *
 *   refresh() -> { readAt, rows: [{ row, Cycle, SeasonType, EventType, TeamsUsed, NamesUsed, Notes, Stats, ... }] }
 *   load() -> the morning's copy, or null
 *   node scripts/sportsFeedLive.js     # refresh now and print the count
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const FILE = path.join(ROOT, 'output', 'sports', 'feed_live.json');

async function refresh(deps) {
  const sheets = (deps && deps.sheets) || require('../lib/sheets');
  const fp = require('../lib/feedPrivacy');
  const data = await sheets.getRawSheetData('Oakland_Sports_Feed');
  const head = (data[0] || []).map((h) => String(h || '').trim());
  const it = head.indexOf('EventTrigger');
  const rows = [];
  data.slice(1).forEach((r, i) => {
    if (!r.some((v) => String(v == null ? '' : v).trim() !== '')) return;   // a sheet's blank tail is not rows
    if (fp.isPrivateFeedRow(r, it)) return;
    const o = { row: i + 2 };
    head.forEach((h, k) => { if (h && !(h in o)) o[h] = r[k] == null ? '' : String(r[k]).trim(); });
    rows.push(o);
  });
  const out = { readAt: new Date().toISOString(), rows };
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(out));
  return out;
}

function load(root) {
  try { return JSON.parse(fs.readFileSync(root ? path.join(root, 'output', 'sports', 'feed_live.json') : FILE, 'utf8')); } catch (e) { return null; }
}

if (require.main === module) {
  require('/root/GodWorld/lib/env');
  refresh().then((o) => console.log('sports feed live: ' + o.rows.length + ' public rows → ' + FILE)).catch((e) => { console.error(e); process.exit(1); });
}
module.exports = { refresh, load, FILE };
