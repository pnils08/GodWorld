#!/usr/bin/env node
'use strict';
/**
 * scripts/gridironCards.js — Gridiron Analytics' record: the team cards, pulled and read to fields (pipeline.111;
 * builder 2026-11-24: "cards are the source, 2041 is the most recent completed season , 2042 is the next season").
 *
 * Source: the sports folder on Drive (SPORTS_FOLDER), one folder per team (As, Oaks), each with Players-active,
 * Players-inactive, Coaches-active, Coaches-inactive, Seasons. Every .txt under a team folder is pulled.
 * Out: output/gridiron/cards.json — { pulledAt, teams: { As: { players: [...], staff: [...] }, Oaks: {...} }, skipped }.
 *
 * A card's season lines are by year (the last completed season is 2041); its profile, contract and roster status are
 * as of now (2042). Lines that talk about how a card was made (screens, Drive, the card itself, its steward and
 * approval footer) are not part of the record and are dropped here, before any reader sees them.
 *
 *   node scripts/gridironCards.js            # pull + parse, write cards.json, print a summary
 *   node scripts/gridironCards.js --local    # parse the last pull on disk only (no Drive)
 *   --write-tabs                             # also write <Team>_Player_Data on the sheet, whole, and read it back
 *   parseCard(text) -> { kind, name, team, position, profile, attributes, pitches, seasons, advanced, career, contract, roster, quirks, awards, notes }
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'output', 'gridiron');
const RAW_DIR = path.join(OUT_DIR, 'raw');
const SPORTS_FOLDER = '13Ft4uQxLKiTeymKIKpfeIktfnKmyG0sB';

// How a card was made is not what it records (CLAUDE.md rule 3: nothing names the builder or the making).
const MAKING = /screen|\bdrive\b|\bcards?\b|builder|claude|steward|verification|ts code|truesource|true source|image verified|in-game|on file/i;

// A value as the record holds it: "95 (trending up)" -> 95, "65 (+4)" -> 65; ".338" -> 0.338; anything else as text.
const num = (s) => {
  const t = String(s == null ? '' : s).trim().replace(/\s*\((?:[+-]\d+|trending \w+)\)\s*$/i, '').replace(/^\./, '0.');
  return /^-?\d+(\.\d+)?$/.test(t) ? Number(t) : t;
};
const trendOf = (s) => { const m = String(s || '').match(/\((?:trending )?(up|down|[+-]\d+)\)/i); return m ? m[1].toLowerCase() : null; };
// A parenthetical about how the record was made comes off the line; the rest of the line stays.
const clean = (l) => String(l).replace(/\s*\([^)]*\)/g, (m) => (MAKING.test(m) ? '' : m)).trim();

// The text as written, with stray escapes off ("\#13", "\-----") and trailing spaces trimmed.
const normalize = (text) => String(text || '').replace(/\r/g, '').split('\n').map((l) => l.replace(/^\\(?=[-#=])/, '').replace(/\\#/g, '#').replace(/\s+$/, ''));

// A card's sections are blocks between ---- (or ====) rules; the first line of each is its heading.
function sections(text) {
  const out = {}, order = [];
  let cur = [];
  const flush = () => { const lines = cur.filter((l) => l.trim()); cur = []; if (!lines.length) return;
    const head = lines[0].trim().replace(/\s*\(.*\)\s*$/, '').toUpperCase(); order.push(head); out[head] = (out[head] || []).concat(lines.slice(1)); };
  for (const l of normalize(text)) { if (/^\s*[-=]{10,}\s*$/.test(l)) flush(); else cur.push(l); }
  flush();
  out._order = order;
  return out;
}

function keyValues(lines) {
  const o = {};
  for (const l of lines || []) {
    if (/^\s*\(/.test(l)) continue;
    const m = l.match(/^\s*([^:]+):\s*(.*)$/);
    if (!m || MAKING.test(m[1])) continue;
    const v = clean(m[2]);
    if (v && !MAKING.test(v)) o[m[1].trim()] = num(v);
  }
  return o;
}
// Attributes with the change the record shows beside them: "CON R: 65 (+4)" -> { 'CON R': 65 } and change { 'CON R': 4 }.
function attributesOf(lines) {
  const value = {}, change = {};
  for (const l of lines || []) {
    const m = l.match(/^\s*([^:(]+):\s*(\d+)(?:\s*\(([+-]?\d+)\))?/);
    if (!m) continue;
    value[m[1].trim()] = Number(m[2]);
    if (m[3] && Number(m[3]) !== 0) change[m[1].trim()] = Number(m[3]);
  }
  return { value, change };
}
// The attribute history table: name, then readings, the last two the reading now and its change.
function historyOf(lines) {
  const out = {};
  for (const l of lines || []) {
    const t = l.trim().split(/\s+/);
    if (t.length < 3 || /^ATTR$/i.test(t[0]) || /^\(/.test(t[0])) continue;
    const firstNum = t.findIndex((x) => /^(-|[+-]?\d+)$/.test(x));
    if (firstNum < 1) continue;
    const ch = t[t.length - 1];
    if (/^[+-]?\d+$/.test(ch) && Number(ch) !== 0) out[t.slice(0, firstNum).join(' ')] = Number(ch);
  }
  return out;
}

// A table: a header line of column names starting YEAR, then one row per line, first column the year.
function table(lines) {
  const rows = [];
  let cols = null;
  for (const l of lines || []) {
    const parts = l.trim().split(/\s+/);
    if (/^YEAR$/i.test(parts[0])) { cols = parts.map((c) => c.toUpperCase()); continue; }
    if (cols && /^\d{4}$/.test(parts[0]) && parts.length >= cols.length) {
      const r = {};
      cols.forEach((c, i) => { r[c] = num(parts[i]); });
      rows.push(r);
    }
  }
  return rows;
}

function bullets(lines) {
  return (lines || []).map((l) => clean(l.replace(/^\s*[-•]\s*/, ''))).filter((l) => l && !/^\(/.test(l) && !MAKING.test(l) && !/^(none|not yet read|end)\b/i.test(l));
}

const YEAR_KEY = /^\d{4}(\s*[–-]\s*\d{4})?$/;
function parseCard(text) {
  const lines = normalize(text);
  const first = lines[0] || '';
  const kind = /—\s*PITCHER/i.test(first) ? 'pitcher' : /—\s*BATTER/i.test(first) ? 'batter' : null;
  if (!kind) return null;
  const s = sections(text);
  const top = keyValues(s[s._order[0]] || []);
  const profRaw = keyValues(s.PROFILE);
  const popidRaw = String(profRaw['Canonical POPID'] || '');
  const popid = (popidRaw.match(/POP-\d{5}/i) || [null])[0];
  const profile = Object.assign({}, profRaw);
  delete profile['Canonical POPID'];
  const overallLine = (s.PROFILE || []).find((l) => /^\s*Overall:/i.test(l));
  const attrs = attributesOf(s.ATTRIBUTES);
  const change = Object.assign({}, historyOf(s['ATTRIBUTE HISTORY']), attrs.change);
  const pitches = (s['PITCH REPERTOIRE'] || []).map((l) => l.trim()).filter((l) => /mph/i.test(l));
  const statLines = s['MLB STATS'] || [];
  const seasons = table(statLines);
  const advanced = table(s.ADVANCED);
  const rates = table(s.RATES);
  const career = keyValues(s['CAREER TOTALS']);
  // contract years and roster status: some records keep both under CONTRACT, others in two sections
  const contract = {}, roster = {};
  for (const [k, v] of Object.entries(Object.assign(keyValues(s.CONTRACT), keyValues(s['CONTRACT STATUS'])))) (YEAR_KEY.test(k) ? contract : roster)[k] = v;
  Object.assign(roster, keyValues(s['ROSTER STATUS']));
  const noStats = !seasons.length ? (statLines.map((l) => clean(l)).find((l) => /^none\b/i.test(l)) || null) : null;
  return { kind, popid, name: top.Name || null, team: top.Team || null, position: top.Position || null, jersey: top.Jersey || null,
    profile, trend: trendOf(overallLine), attributes: attrs.value, attributeChange: change, pitches, seasons, advanced, rates, career,
    noStats: noStats ? noStats.replace(/\.\s.*$/, '.') : null, contract, roster,
    quirks: bullets(s.QUIRKS), awards: bullets(s.AWARDS), milestones: bullets(s['CAREER MILESTONES']), notes: bullets(s.NOTES) };
}

// The staff record: one block per role (MANAGER:, HITTING COACH:, ...), Name / Years Left / Salary / Boosts; then the
// team's money lines (STAFF SALARY TOTAL, PROJECTED SURPLUS, AVAILABLE BUDGET).
function parseStaff(text) {
  const lines = String(text || '').replace(/\r/g, '').split('\n').map((l) => l.trim());
  const season = (lines.find((l) => /^Season:/i.test(l)) || '').replace(/^Season:\s*/i, '') || null;
  const staff = [], money = {};
  let cur = null, inBoosts = false;
  for (const l of lines) {
    if (!l || MAKING.test(l) || /^END\b/.test(l) || /^CHANGES FROM/i.test(l)) { if (/^CHANGES FROM/i.test(l)) cur = 'stop'; continue; }
    if (cur === 'stop') continue;
    const role = l.match(/^([A-Z0-9 ]+):$/);
    if (role && !/BOOSTS/.test(role[1])) { cur = { role: role[1].trim(), boosts: {} }; staff.push(cur); inBoosts = false; continue; }
    if (/^Boosts:/i.test(l)) { inBoosts = true; continue; }
    const kv = l.match(/^([^:]+):\s*(.+)$/);
    if (!kv) continue;
    if (/^(STAFF SALARY TOTAL|PROJECTED SURPLUS|AVAILABLE BUDGET)$/i.test(kv[1].trim())) { money[kv[1].trim()] = kv[2].trim(); cur = null; continue; }
    if (!cur || typeof cur !== 'object') continue;
    if (inBoosts && !/^(Name|Years Left|Salary|Attribute Grade)$/i.test(kv[1].trim())) cur.boosts[kv[1].trim()] = kv[2].trim();
    else cur[kv[1].trim().replace(/\s+/g, '')] = num(kv[2].trim());
  }
  return { season, staff, money };
}

async function drive() {
  const { google } = require(path.join(ROOT, 'node_modules', 'googleapis'));
  const auth = new google.auth.GoogleAuth({ keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS, scopes: ['https://www.googleapis.com/auth/drive.readonly'] });
  return google.drive({ version: 'v3', auth });
}

async function list(d, folderId) {
  const out = [];
  let pageToken;
  do {
    const r = await d.files.list({ q: "'" + folderId + "' in parents and trashed=false", fields: 'nextPageToken, files(id,name,mimeType,modifiedTime)', pageSize: 200, pageToken });
    out.push(...r.data.files);
    pageToken = r.data.nextPageToken;
  } while (pageToken);
  return out;
}

// Pull every .txt under each team folder into output/gridiron/raw/<team>/<subfolder>/<name>.
async function pull() {
  require(path.join(ROOT, 'lib', 'env'));
  const d = await drive();
  const pulled = [];
  for (const team of (await list(d, SPORTS_FOLDER)).filter((f) => f.mimeType === 'application/vnd.google-apps.folder')) {
    const walk = async (folder, rel) => {
      for (const f of await list(d, folder.id)) {
        if (f.mimeType === 'application/vnd.google-apps.folder') { await walk(f, path.join(rel, f.name)); continue; }
        if (!/\.txt$/i.test(f.name)) continue;
        const res = await d.files.get({ fileId: f.id, alt: 'media' }, { responseType: 'text' });
        const dest = path.join(RAW_DIR, rel, f.name);
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.writeFileSync(dest, String(res.data));
        pulled.push({ team: team.name, rel: path.join(rel, f.name), modifiedTime: f.modifiedTime });
      }
    };
    await walk(team, team.name);
  }
  return pulled;
}

// Read the pull on disk into the record.
function build(pulled) {
  const teams = {}, skipped = [];
  const files = [];
  const walk = (dir, rel) => { let es = []; try { es = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return; }
    for (const e of es) e.isDirectory() ? walk(path.join(dir, e.name), path.join(rel, e.name)) : files.push(path.join(rel, e.name)); };
  walk(RAW_DIR, '');
  // a pull reads only what is in the folder now: a card moved between folders leaves its old copy on disk
  const now = pulled && pulled.length ? new Set(pulled.map((x) => x.rel)) : null;
  for (const rel of files.sort().filter((f) => !now || now.has(f))) {
    const [team, sub] = rel.split(path.sep);
    const t = teams[team] || (teams[team] = { players: [], staff: null });
    const text = fs.readFileSync(path.join(RAW_DIR, rel), 'utf8');
    if (/^Players-/i.test(sub)) {
      const c = parseCard(text);
      if (!c) { skipped.push(rel + ' (not a player card)'); continue; }
      c.status = /inactive/i.test(sub) ? 'inactive' : 'active';
      t.players.push(c);
    } else if (/^Coaches-active/i.test(sub)) {
      t.staff = parseStaff(text);
    } else if (!/^Coaches-inactive/i.test(sub)) skipped.push(rel + ' (not read: ' + sub + ')');
  }
  // the sim's own clock: the Cycle the pull runs ahead of (the last fired Cycle + 1)
  let forCycle = null; try { const c = Number(require(path.join(ROOT, 'lib', 'getCurrentCycle'))({ noArgv: true })); forCycle = isFinite(c) ? c + 1 : null; } catch (e) { forCycle = null; }
  return { pulledAt: new Date().toISOString(), forCycle, lastCompletedSeason: 2041, currentSeason: 2042, teams, skipped,
    pulled: (pulled || []).length || null };
}

// ---- the team's player data tab (builder 2026-11-24: "Approved use it so its useful"). One tab per team, <Team>_Player_Data,
// written whole by this pull and by nothing else. Not the roster tabs: the dashboard's sports page and the feed writer
// refuse a roster tab whose columns differ from their exact list (sportsWorkspaceProjection validateRosterHeaders,
// sportsFeedWriter selectedRosterRow), so added columns there would stop the builder's feed entry.
const HIT_ATTRS = ['CON R', 'CON L', 'POW R', 'POW L', 'VIS', 'DISC', 'CLT', 'SPD', 'STEAL', 'BR AGG', 'FLD', 'ARM', 'ACC', 'REAC', 'DUR', 'BUNT', 'DBUNT'];
const PIT_ATTRS = ['STA', 'H/9', 'K/9', 'BB/9', 'HR/9', 'PCLT', 'CTRL', 'VEL', 'BRK'];
const TAB_HEADERS = ['POPID', 'Name', 'Status', 'Level', 'Kind', 'Position', 'Secondary', 'Bats', 'Throws', 'Age', 'Overall', 'Trend', 'Potential', 'Service',
  'Contract', 'Options', '40-Man', 'Active Roster', ...HIT_ATTRS, ...PIT_ATTRS, 'Pitches', 'Last Season', 'Last Season Line', 'Last Season WAR', 'Quirks', 'Awards', 'Notes', 'Pulled For Cycle'];
function tabRows(team, rec) {
  const t = rec.teams[team];
  return (t ? t.players : []).map((p) => {
    const f = p.profile || {}, r = p.roster || {}, a = p.attributes || {};
    const s = (p.seasons || []).find((x) => Number(x.G) > 0) || null;
    const adv = s ? (p.advanced || []).find((x) => x.YEAR === s.YEAR && x.TEAM === s.TEAM) || {} : {};
    const line = !s ? '' : p.kind === 'pitcher'
      ? [s.G + ' G', s.GS + ' GS', s.W + '-' + s.L, s.SV + ' SV', s.IP + ' IP', s.ERA + ' ERA', s.SO + ' SO', s.BB + ' BB'].join(', ')
      : [s.G + ' G', [s.AVG, s.OBP, s.SLG].join('/'), s.HR + ' HR', s.RBI + ' RBI', s.SB + ' SB'].join(', ');
    const level = p.status === 'inactive' ? 'gone' : /AAA|Aviators/i.test(String(p.team || '') + ' ' + String(r.Level || '')) || /^NO$/i.test(String(r['On Active Roster'] || '')) ? 'AAA' : 'MLB';
    return [p.popid || '', p.name, p.status, level, p.kind, p.position || '', f['Secondary Position'] || '', f.Bats || '', f.Throws || '', f.Age == null ? '' : f.Age,
      f.Overall == null ? '' : f.Overall, p.trend || '', f.Potential || '', f['MLB Service'] == null ? '' : f['MLB Service'],
      Object.entries(p.contract || {}).map(([y, v]) => y + ' ' + v).join('; '), r['Minor League Option'] || r['Minor League Options'] || '', r['On 40-Man Roster'] || '', r['On Active Roster'] || '',
      ...HIT_ATTRS.map((k) => (p.kind === 'batter' && a[k] != null ? a[k] : '')), ...PIT_ATTRS.map((k) => (p.kind === 'pitcher' && a[k] != null ? a[k] : '')),
      (p.pitches || []).join('; '), s ? s.YEAR + ' ' + s.TEAM : '', line, adv.WAR == null ? '' : adv.WAR, (p.quirks || []).join('; '), (p.awards || []).join('; '), (p.notes || []).join('; '), rec.forCycle == null ? '' : rec.forCycle];
  });
}
async function writeTabs(rec) {
  const sheets = require(path.join(ROOT, 'lib', 'sheets'));
  const out = [];
  for (const team of Object.keys(rec.teams)) {
    const rows = tabRows(team, rec);
    if (!rows.length) { out.push(team + ': no players in the folder, tab not written'); continue; }
    const tab = team + '_Player_Data';
    const have = (await sheets.listSheets()).some((x) => x.title === tab);
    if (!have) await sheets.createSheet(tab, TAB_HEADERS);
    await sheets.resizeSheet(tab, TAB_HEADERS.length, Math.max(rows.length + 20, 60));
    const client = await sheets.getClient();
    await client.spreadsheets.values.clear({ spreadsheetId: process.env.GODWORLD_SHEET_ID, range: tab });
    await sheets.updateRange(tab + '!A1', [TAB_HEADERS].concat(rows));
    // read back: every row's POPID / name where it was written
    const back = await sheets.getRawSheetData(tab);
    const ok = back.length === rows.length + 1 && rows.every((r, i) => String(back[i + 1][1]) === String(r[1]) && String(back[i + 1][0] || '') === String(r[0]));
    if (!ok) throw new Error(tab + ' read back does not match what was written (' + (back.length - 1) + ' rows read, ' + rows.length + ' written)');
    out.push(tab + ': ' + rows.length + ' players written and read back');
  }
  return out;
}

async function main() {
  const local = process.argv.includes('--local');
  const pulled = local ? null : await pull();
  const rec = build(pulled);
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, 'cards.json'), JSON.stringify(rec, null, 1));
  if (process.argv.includes('--write-tabs')) for (const l of await writeTabs(rec)) console.log(l);
  for (const [team, t] of Object.entries(rec.teams)) {
    const act = t.players.filter((p) => p.status === 'active');
    console.log(team + ': ' + t.players.length + ' players (' + act.length + ' active), staff ' + (t.staff ? t.staff.staff.length : 0));
    for (const p of t.players) console.log('  ' + [p.popid || 'NO-POPID', p.name, p.position, p.kind, p.status, 'seasons ' + p.seasons.length,
      'contract ' + Object.keys(p.contract).length, p.attributes && Object.keys(p.attributes).length ? 'attrs' : 'NO-ATTRS'].join(' | '));
  }
  if (rec.skipped.length) console.log('skipped:\n  ' + rec.skipped.join('\n  '));
}

if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
module.exports = { parseCard, parseStaff, build, tabRows, writeTabs, TAB_HEADERS, SPORTS_FOLDER, OUT_DIR };
