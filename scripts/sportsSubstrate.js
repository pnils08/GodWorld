#!/usr/bin/env node
/**
 * sportsSubstrate.js — shared sports feed parse + name resolution (pipeline.52 Task 3)
 *
 * Consumed by:
 *   buildPSlayerSlice  (fan heat scoring — private)
 *   buildAnthonySlice  (analytic board scoring)
 *   buildHalSlice      (historian overlay — future)
 *
 * Disk-first. No Sheets. Never invents roster moves or x-stats.
 *
 *   const sports = require('./sportsSubstrate');
 *   const rows = sports.loadSportsRows(102);
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

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
 * Parse world_summary ## Sports into structured feed rows.
 * Shape from buildWorldSummary emitSports.
 */
function parseSportsSection(md, focusCycle) {
  const sec = extractSection(md, 'Sports') ||
    extractSection(md, 'Sports (literal `Oakland_Sports_Feed.StoryAngle` column per row — current cycle + 2 prior)');
  let body = sec;
  if (!body && md) {
    const m = md.match(/^##\s+Sports[^\n]*$/mi);
    if (m) {
      const start = m.index + m[0].length;
      const rest = md.slice(start);
      const next = rest.search(/^##\s+/m);
      body = (next < 0 ? rest : rest.slice(0, next)).trim();
    }
  }
  if (!body) return [];

  const rows = [];
  let curCycle = null;
  const cycleHead = /^###\s+C(\d+)\b/i;
  // world_summary emitSports: `**header:**` (colon inside bold marks)
  const entryHead = /^-\s+\*\*(.+?)\*\*\s*(.*)$/;

  const lines = body.split('\n');
  let cur = null;

  function flush() {
    if (cur) {
      rows.push(cur);
      cur = null;
    }
  }

  for (const raw of lines) {
    const line = raw.trimEnd();
    const ch = line.match(cycleHead);
    if (ch) {
      flush();
      curCycle = Number(ch[1]);
      continue;
    }
    const eh = line.match(entryHead);
    if (eh) {
      flush();
      const header = eh[1].trim().replace(/:\s*$/, '');
      const names = (eh[2] || '').trim();
      const hm = header.match(/^(.+?)\s*[—–-]\s*(.+?)(?:\s*\(([^)]+)\))?$/);
      const team = hm ? hm[1].trim() : header;
      const eventKind = hm ? hm[2].trim() : '';
      const seasonType = hm && hm[3] ? hm[3].trim() : '';
      cur = {
        cycle: curCycle,
        team,
        eventKind,
        seasonType,
        namesUsed: names,
        storyAngle: '',
        notes: '',
        stats: '',
        record: '',
        streak: '',
        mood: '',
        fanSentiment: '',
        neighborhood: '',
        rawHeader: header
      };
      continue;
    }
    if (!cur) continue;
    const sa = line.match(/^\s*-\s*StoryAngle:\s*(.*)$/i);
    if (sa) { cur.storyAngle = sa[1].trim(); continue; }
    const no = line.match(/^\s*-\s*Notes:\s*(.*)$/i);
    if (no) { cur.notes = no[1].trim(); continue; }
    const st = line.match(/^\s*-\s*Stats:\s*(.*)$/i);
    if (st) { cur.stats = st[1].trim(); continue; }
    const meta = line.match(
      /^\s*-\s*Record\s+([^,]*),\s*Streak\s+([^,]*),\s*Mood\s+([^,]*),\s*FanSentiment\s+([^,]*),\s*Neighborhood\s+(.*)$/i
    );
    if (meta) {
      cur.record = meta[1].trim();
      cur.streak = meta[2].trim();
      cur.mood = meta[3].trim();
      cur.fanSentiment = meta[4].trim();
      cur.neighborhood = meta[5].trim();
      continue;
    }
    if (line.startsWith('  ') && cur.notes && !line.trim().startsWith('-')) {
      cur.notes += ' ' + line.trim();
    }
  }
  flush();

  if (focusCycle != null) {
    return rows.filter(r => r.cycle != null);
  }
  return rows;
}

function loadLedgerNameIndex(root) {
  const byName = new Map();
  const byPop = new Map();
  const p = path.join(root || ROOT, 'output', 'simulation_ledger_snapshot.jsonl');
  try {
    for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
      if (!line) continue;
      let r;
      try { r = JSON.parse(line); } catch (_) { continue; }
      if (r.POPID) byPop.set(r.POPID, r);
      const name = String(r.Name || '').replace(/\s+/g, ' ').trim();
      if (name) byName.set(name.toLowerCase(), r);
    }
  } catch (_) { /* optional */ }
  return { byName, byPop };
}

/** Common sports name aliases that appear misspelled on the feed */
const NAME_ALIASES = {
  'isely kelley': 'Isley Kelley',
  'isely kelly': 'Isley Kelley',
  'isley kelly': 'Isley Kelley',
  'ernesto quitero': 'Ernesto Quintero',
  'eric tavares': 'Eric Taveras',
  'pabla almanzar': 'Pablo Almanzar',
  'pablos almanzar': 'Pablo Almanzar',
  'vinne keane': 'Vinnie Keane',
  'draymond greed': 'Draymond Green'
};

const NON_NAME_FIRST = new Set([
  'the', 'this', 'that', 'with', 'word', 'granted', 'trading', 'having', 'after',
  'before', 'when', 'while', 'from', 'into', 'over', 'under', 'about', 'since',
  'storyangle', 'notes', 'stats', 'record', 'oakland', 'athletics', 'bay',
  'veteran', 'late', 'early', 'some', 'many', 'most', 'and', 'but', 'for'
]);

function extractPlayerNames(text) {
  if (!text) return [];
  const out = [];
  const re = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z'-]+){1,2})\b/g;
  let m;
  while ((m = re.exec(text))) {
    let n = m[1].replace(/\s+/g, ' ').trim();
    n = n.replace(/[.,;:]+$/, '');
    if (n.length < 5 || n.length > 36) continue;
    const parts = n.split(/\s+/);
    if (parts.some(p => p.length < 2)) continue;
    const first = parts[0].toLowerCase();
    if (NON_NAME_FIRST.has(first)) continue;
    const last = parts[parts.length - 1].toLowerCase();
    if (['the', 'a', 'an', 'and', 'of', 'for', 'to', 'in', 'on', 'as', 'at', 'by', 'or'].includes(last)) continue;
    if (/^(Oakland|Bay Tribune|World Series|All Star|Summer League)/i.test(n)) continue;
    out.push(n);
  }
  return [...new Set(out)];
}

function resolvePlayer(name, ledger) {
  const raw = String(name || '').replace(/\s+/g, ' ').trim();
  const key = raw.toLowerCase();
  const canon = NAME_ALIASES[key] || raw;
  let row = ledger.byName.get(canon.toLowerCase());
  if (!row) {
    const last = canon.split(/\s+/).pop().toLowerCase();
    for (const [n, r] of ledger.byName) {
      if (n.endsWith(' ' + last) || n === last) {
        const role = String(r.RoleType || '');
        if (/A's|Athletics|Pitcher|Baseman|Fielder|Catcher|Shortstop|Journalist|Fan Columnist|Basketball|Oaks/i.test(
          role + ' ' + String(r.Name || '')
        )) {
          row = r;
          break;
        }
      }
    }
  }
  return {
    name: row ? String(row.Name).replace(/\s+/g, ' ').trim() : canon,
    popid: row ? row.POPID : null,
    role: row ? (row.RoleType || null) : null,
    neighborhood: row ? (row.Neighborhood || null) : null
  };
}

/**
 * Pull real number tokens from feed Stats/Notes only — never invent.
 */
function extractFoilNumber(stats, notes) {
  const blob = [stats, notes].filter(Boolean).join(' | ');
  if (!blob || blob === '-') return null;
  const patterns = [
    /(\d+\.\d+\s*war)/i,
    /(\.\d{3}\s*avg)/i,
    /(\d+-\d+\s*(?:w-l|record)?)/i,
    /(\d+\.\d{2}\s*era)/i,
    /(\d+\s*hr)/i,
    /(\d+\s*rbi)/i,
    /(\d+\s*sb)/i,
    /(\d+\s*stl)/i,
    /(\d+\s*ip)/i,
    /(\$\d+M)/i,
    /(\d+-year\s*\$?\d*M?)/i
  ];
  for (const re of patterns) {
    const m = blob.match(re);
    if (m) return m[1].replace(/\s+/g, ' ').trim();
  }
  const loose = blob.match(/[A-Za-z][^,]{0,40}?\d[\d./-]*/);
  return loose ? loose[0].slice(0, 60).trim() : null;
}

/** Split feed Stats field into discrete line tokens (feed only). */
function parseStatsLine(stats) {
  if (!stats || stats === '-' || stats === '—') return [];
  // "Danny Horn 384AB/.336AVG/32HR/71RBI/50SB" or multi-player "John Ellis 117IP/..., Eric Taveras ..."
  const chunks = String(stats).split(/,\s*(?=[A-Z])/);
  const out = [];
  for (const chunk of chunks) {
    const c = chunk.trim();
    if (!c) continue;
    const nameM = c.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z'-]+)+)\s+(.+)$/);
    if (nameM) {
      out.push({ name: nameM[1].trim(), line: nameM[2].trim(), raw: c });
    } else {
      out.push({ name: null, line: c, raw: c });
    }
  }
  return out;
}

function hasUsableStats(row) {
  const s = String(row.stats || '').trim();
  return !!(s && s !== '-' && s !== '—' && /\d/.test(s));
}

/**
 * Load sports feed rows for a cycle: world_summary first, desk_signal sports fallback.
 */
function loadSportsRows(cycle, opts) {
  const o = opts || {};
  const root = o.root || ROOT;
  const cyc = Number(cycle);
  const summary = o.summaryMd != null
    ? o.summaryMd
    : loadText(path.join(root, 'output', 'world_summary_c' + cyc + '.md'));
  const signal = o.signal != null
    ? o.signal
    : loadJson(path.join(root, 'output', 'desk_signal_c' + cyc + '.json'));

  let rows = parseSportsSection(summary, cyc);
  if (!rows.length && signal && signal.lanes && signal.lanes.sports) {
    rows = (signal.lanes.sports || []).filter(e => e.kind === 'feed' || !e.kind).map((e, i) => ({
      cycle: cyc,
      team: /oaks/i.test(e.label || '') ? 'Oaks' : "A's",
      eventKind: (e.label || '').split('|')[1] || 'feed',
      seasonType: '',
      namesUsed: e.label || '',
      storyAngle: e.label || '',
      notes: '',
      stats: '',
      record: '',
      streak: '',
      mood: '',
      fanSentiment: '',
      neighborhood: e.hood || '',
      rawHeader: e.label || ('signal-' + i),
      ref: e.ref || null
    }));
  }
  return rows;
}

/**
 * Resolve feed name pool → player objects with optional ledger POPID/RoleType.
 */
function resolveFeedPlayers(row, ledger, limit) {
  const namePool = [
    ...extractPlayerNames(row.namesUsed),
    ...extractPlayerNames(row.storyAngle),
    ...extractPlayerNames((row.notes || '').slice(0, 280))
  ].filter((n, i, a) => a.findIndex(x => x.toLowerCase() === n.toLowerCase()) === i);

  const players = [];
  const seenPop = new Set();
  const led = ledger || { byName: new Map(), byPop: new Map() };
  for (const n of namePool) {
    const p = resolvePlayer(n, led);
    if (p.popid && seenPop.has(p.popid)) continue;
    if (p.popid) seenPop.add(p.popid);
    players.push({
      name: p.name,
      popid: p.popid,
      role: p.role,
      neighborhood: p.neighborhood,
      why: 'feed-names'
    });
    if (players.length >= (limit || 10)) break;
  }
  return players;
}

function buildFeedAnchorFacts(row, cycle) {
  const facts = [];
  if (row.storyAngle) facts.push('StoryAngle (feed): ' + row.storyAngle);
  if (row.record && /\d/.test(row.record)) {
    facts.push('Team record (feed): ' + row.record + (row.streak ? ' · streak ' + row.streak : ''));
  }
  if (hasUsableStats(row)) facts.push('Stats (feed): ' + String(row.stats).slice(0, 180));
  if (row.eventKind) {
    facts.push('Event: ' + row.team + ' — ' + row.eventKind +
      (row.seasonType ? ' (' + row.seasonType + ')' : ''));
  }
  if (row.namesUsed) facts.push('NamesUsed: ' + row.namesUsed.slice(0, 160));
  if (row.fanSentiment) {
    facts.push('FanSentiment: ' + row.fanSentiment + (row.mood ? ' · Mood: ' + row.mood : ''));
  }
  if (row.neighborhood) facts.push('HomeNeighborhood (feed): ' + row.neighborhood);
  facts.push('Cycle: C' + (row.cycle != null ? row.cycle : cycle));
  return facts.slice(0, 8);
}

module.exports = {
  ROOT,
  loadJson,
  loadText,
  extractSection,
  parseSportsSection,
  loadLedgerNameIndex,
  extractPlayerNames,
  resolvePlayer,
  extractFoilNumber,
  parseStatsLine,
  hasUsableStats,
  loadSportsRows,
  resolveFeedPlayers,
  buildFeedAnchorFacts,
  NAME_ALIASES,
  NON_NAME_FIRST
};
