#!/usr/bin/env node
/**
 * buildPSlayerSlice.js — Grok-owned fan-heat pulse slice (pipeline.47 Task 3)
 *
 * Parallel to buildJaxSlice, NOT a clone:
 *   Jax  = civic stink + contradiction + interview citizens
 *   P    = sports feed pulse + charge-bag modes + foil number + prior takes
 *
 * P Slayer (POP-00008) is die-hard fan heat: I/we, hate-the-move → I-was-wrong,
 * friction pivot required. He weaponizes ONE real number; he does not run
 * Anthony's board or Jax's accountability theater.
 *
 * Sources (disk-first, no Sheets required for build):
 *   output/world_summary_c{N}.md  ## Sports  (verbatim StoryAngle rows)
 *   output/desk_signal_c{N}.json  lanes.sports
 *   output/reporters/p-slayer/articles/*.md  prior columns for PriorTake
 *   output/simulation_ledger_snapshot.jsonl  name → POPID (optional)
 *
 * Usage:
 *   node scripts/buildPSlayerSlice.js --cycle 102
 *   node scripts/buildPSlayerSlice.js --cycle 102 --json
 *   const { buildPSlayerSlice, loadPSlayerSlice, writePSlayerSlice } = require('./buildPSlayerSlice');
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const FAN_HEAT_APPROACH =
  'Fan-heat approach (P Slayer pulse): do NOT open from the FO press release or the award board. ' +
  'Open from gut or Oakland sensory (bar, lot, bleacher row, BART after). First-person I/we only. ' +
  'Pick 1–2 charge-bag modes from this slice. Friction pivot required — name the counter-argument, kill it. ' +
  'ONE real foil number max (from FoilNumber / AnchorFacts); never invent x-stats or roster moves. ' +
  'Hook PriorTake when present — eat it or double down ("I was wrong" is craft). ' +
  'End on charge that sticks: dare, confession, or update. Not Anthony. Not Hal. Not multi-voice sports-desk average.';

const BAG_MODES = {
  1: 'Hate the Move',
  2: 'I Was Wrong / I Was Right',
  3: 'Friction Pivot',
  4: 'Loss Hangover / Empty Win',
  5: 'Paper Cuts vs the Nerds',
  6: 'Superman We Asked Him to Be',
  7: 'We Still Believe / We\'re Done',
  8: 'Dugout Pulse',
  9: 'Breakout Feeling',
  10: 'Wire Dare'
};

const CHARGE_PALETTE = ['fury', 'euphoria', 'dread', 'defiance', 'confession', 'grief', 'dare'];

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
 * Parse world_summary ## Sports into structured feed rows.
 * Shape from buildWorldSummary emitSports.
 */
function parseSportsSection(md, focusCycle) {
  const sec = extractSection(md, 'Sports') || extractSection(md, 'Sports (literal `Oakland_Sports_Feed.StoryAngle` column per row — current cycle + 2 prior)');
  // Heading may include the long parenthetical — try looser
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
  // world_summary emitSports uses markdown bold with colon INSIDE the marks:
  //   - **Oaks — front-office (preseason):** Mike Paulson ...
  // i.e. `**header:**` not `**header**:` (colon before closing **).
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
      // strip trailing colon left inside bold: "Oaks — front-office (preseason):"
      const header = eh[1].trim().replace(/:\s*$/, '');
      const names = (eh[2] || '').trim();
      // "A's — re-signing (late-season)" or "Oaks — front-office (preseason)"
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
    const meta = line.match(/^\s*-\s*Record\s+([^,]*),\s*Streak\s+([^,]*),\s*Mood\s+([^,]*),\s*FanSentiment\s+([^,]*),\s*Neighborhood\s+(.*)$/i);
    if (meta) {
      cur.record = meta[1].trim();
      cur.streak = meta[2].trim();
      cur.mood = meta[3].trim();
      cur.fanSentiment = meta[4].trim();
      cur.neighborhood = meta[5].trim();
      continue;
    }
    // continuation of Notes if long wrap (rare in emitSports — single line)
    if (line.startsWith('  ') && cur.notes && !line.trim().startsWith('-')) {
      cur.notes += ' ' + line.trim();
    }
  }
  flush();

  if (focusCycle != null) {
    // Prefer current cycle, keep priors for arc scoring
    return rows.filter(r => r.cycle != null);
  }
  return rows;
}

function loadLedgerNameIndex(root) {
  const byName = new Map();
  const byPop = new Map();
  const p = path.join(root, 'output', 'simulation_ledger_snapshot.jsonl');
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
  // Capture "First Last" (optionally Middle) — no sentence glue ("Horn. The")
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
    // last token must look like a surname, not article/pronoun
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
    // partial last-name match among sports-ish roles
    const last = canon.split(/\s+/).pop().toLowerCase();
    for (const [n, r] of ledger.byName) {
      if (n.endsWith(' ' + last) || n === last) {
        const role = String(r.RoleType || '');
        if (/A's|Athletics|Pitcher|Baseman|Fielder|Catcher|Shortstop|Journalist|Fan Columnist|Basketball|Oaks/i.test(role + ' ' + String(r.Name || ''))) {
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
 * Prior P Slayer columns on disk — gold for "I was wrong" arcs.
 */
function loadPriorColumns(root) {
  const dirs = [
    path.join(root, 'output', 'reporters', 'p-slayer', 'articles'),
    path.join(root, 'output', 'reporters', 'p_slayer', 'articles'),
    path.join(root, 'output', 'desks', 'sports', 'articles')
  ];
  const seen = new Set();
  const cols = [];
  for (const dir of dirs) {
    let files;
    try { files = fs.readdirSync(dir); } catch (_) { continue; }
    for (const f of files) {
      if (!/\.md$/i.test(f)) continue;
      if (!/p[-_]?slayer|c\d+/i.test(f) && !dir.includes('p-slayer') && !dir.includes('p_slayer')) continue;
      const full = path.join(dir, f);
      if (seen.has(full)) continue;
      // desks/sports: only p-slayer files
      if (dir.includes('desks') && !/p-slayer|p_slayer/i.test(f)) continue;
      seen.add(full);
      let text;
      try { text = fs.readFileSync(full, 'utf8'); } catch (_) { continue; }
      const headline = (text.match(/^#\s+(.+)$/m) || text.match(/^HEADLINE:\s*(.+)$/mi) || [, ''])[1].trim();
      const byline = (text.match(/^BYLINE:\s*(.+)$/mi) || text.match(/\*\*By P\.?\s*Slayer[^*]*/i) || [, ''])[0];
      const cycleM = f.match(/c(\d+)/i) || text.match(/[Cc]ycle\s*(\d+)/);
      const snippet = text.replace(/^#.*$/m, '').replace(/\*\*[^*]+\*\*/g, '')
        .replace(/\s+/g, ' ').trim().slice(0, 280);
      cols.push({
        file: path.relative(root, full),
        cycle: cycleM ? Number(cycleM[1]) : null,
        headline: headline || path.basename(f, '.md'),
        snippet,
        names: extractPlayerNames(headline + ' ' + snippet.slice(0, 400)),
        isCorrection: /i was wrong|i read it wrong|owe you the correction|i got .* wrong/i.test(headline + ' ' + snippet)
      });
    }
  }
  cols.sort((a, b) => (b.cycle || 0) - (a.cycle || 0));
  return cols;
}

function classifyPulse(row) {
  const angle = String(row.storyAngle || '').toLowerCase();
  const event = String(row.eventKind || '').toLowerCase();
  const blob = [
    row.eventKind, row.storyAngle, row.notes, row.team, row.seasonType
  ].join(' ').toLowerCase();

  const classes = [];
  // Angle/event lead classification — notes mention past trades on every youth row
  if (/re-?sign|contract|signing/.test(angle + ' ' + event) ||
      (/trade|traded|deadline/.test(angle + ' ' + event) && !/kids are|call.?up|prospect/.test(angle))) {
    classes.push('roster-move');
  } else if (/trade|traded|deadline/.test(blob) && /pillar|unthinkable|shaken|farewell/.test(blob)) {
    classes.push('roster-move');
  }
  if (/call[- ]?up|called up|debut|prospect|kids are alright|kids are/.test(angle + ' ' + event) ||
      (/call[- ]?up|called up|debut|prospect/.test(blob) && /player-feature/.test(event))) {
    classes.push('prospect-callup');
  }
  // "come out for a cause" is NOT injury — require medical/absence shape
  if (/injur|acl tear|broken (foot|ankle|wrist|hand|leg)|broke (his|her|a) |out for \d|out for months|out for the season|\bil\b|disabled list/.test(blob)) {
    classes.push('injury-load');
  }
  if (/game-result|sweep|win streak|straight wins|dominate/.test(angle + ' ' + event + ' ' + blob)) {
    classes.push('result-pulse');
  }
  // L-streak alone on a gala/front-office row is not a loss column
  if (/loss|hangover|defeat|blown save/.test(angle) ||
      (/\bL\d+\b/.test(row.streak) && /game-result|season-state|sweep|lost|skid/.test(angle + ' ' + event))) {
    classes.push('loss');
  }
  if (/\bW\d+\b/.test(row.streak) || /win streak|ten straight|pull away/.test(angle + ' ' + blob)) {
    classes.push('win-streak');
  }
  if (/award|mvp|cy young|batting title|elite this award/.test(angle + ' ' + blob)) {
    classes.push('award-board');
  }
  if (/garbage|podcast|call.?out|dont respect|don't respect/.test(blob)) classes.push('insult-pulse');
  if (/kids beat|gala|charity|youth program|youth clinic/.test(blob) || /fan-civic/.test(event)) {
    classes.push('community-pulse');
  }
  if (/front-office|gm hire|owner|stadium|arena|naming rights/.test(angle + ' ' + event) ||
      (/front-office/.test(event) && !classes.includes('insult-pulse'))) {
    classes.push('front-office');
  }
  if (!classes.length) classes.push('quiet-feed');

  // primary class by priority for fan heat (community above ambient L-streak)
  const priority = [
    'roster-move', 'injury-load', 'insult-pulse', 'prospect-callup',
    'loss', 'win-streak', 'award-board', 'result-pulse',
    'community-pulse', 'front-office', 'quiet-feed'
  ];
  // Angle-led override: pure "Kids are Alright" is breakout, not FO trade essay
  if (/kids are alright|kids are|call.?ups? for the/.test(angle) && classes.includes('prospect-callup')) {
    return { primary: 'prospect-callup', all: classes };
  }
  if (/resign|re-sign|resigns|signing/.test(angle) && classes.includes('roster-move')) {
    return { primary: 'roster-move', all: classes };
  }
  const primary = priority.find(c => classes.includes(c)) || classes[0];
  return { primary, all: classes };
}

function scoreRow(row, cycle, priorCols) {
  let score = 0;
  const cls = classifyPulse(row);
  const weights = {
    'roster-move': 28,
    'injury-load': 24,
    'insult-pulse': 22,
    'prospect-callup': 18,
    'loss': 20,
    'win-streak': 14,
    'award-board': 12,
    'result-pulse': 10,
    'front-office': 11,
    'community-pulse': 6,
    'quiet-feed': 2
  };
  score += weights[cls.primary] || 5;
  for (const c of cls.all) {
    if (c !== cls.primary) score += Math.floor((weights[c] || 0) / 4);
  }

  // Cycle proximity: current cycle dominates; prior still usable for arc
  if (row.cycle === Number(cycle)) score += 20;
  else if (row.cycle === Number(cycle) - 1) score += 8;
  else if (row.cycle === Number(cycle) - 2) score += 3;
  else score -= 5;

  // Team: A's is P's spine; Oaks can heat (insult) but lower base
  if (/a'?s/i.test(row.team)) score += 6;
  else if (/oaks/i.test(row.team)) {
    score += cls.primary === 'insult-pulse' ? 8 : 2;
  }

  // Fan sentiment / mood
  const fs_ = String(row.fanSentiment || '').toLowerCase();
  const mood = String(row.mood || '').toLowerCase();
  if (/angry|hostile|frustrated|disappointed|anxious/.test(fs_)) score += 8;
  if (/euphoric|electric|high|excited/.test(fs_)) score += 4;
  if (/frustrated|uncertain|quiet/.test(mood)) score += 3;
  if (/electric|locked-in|dominant|hungry/.test(mood)) score += 2;

  // Streak shape
  const sm = String(row.streak || '').match(/^([WL])(\d+)$/i);
  if (sm) {
    const n = Number(sm[2]);
    if (sm[1].toUpperCase() === 'L') score += 6 + Math.min(n, 5);
    if (sm[1].toUpperCase() === 'W' && n >= 5) score += 5;
  }

  // Prior-take hook (hate → I was wrong) — huge for P
  const names = extractPlayerNames(
    [row.namesUsed, row.storyAngle, row.notes].join(' ')
  ).map(n => n.toLowerCase());
  let priorHits = 0;
  for (const col of priorCols) {
    for (const pn of col.names) {
      if (names.some(n => n.includes(pn.toLowerCase()) || pn.toLowerCase().includes(n.split(' ').pop()))) {
        priorHits++;
        score += col.isCorrection ? 6 : 10;
        break;
      }
    }
  }
  if (priorHits) score += 4;

  // Heat keywords in angle
  if (/right move|farewell|unthinkable|shaken|shocking|garbage|enough\?/.test(
    (row.storyAngle + ' ' + row.notes).toLowerCase()
  )) score += 5;

  // Re-signing / deadline trade on eventKind is pure fan-heat fuel
  const ek = String(row.eventKind || '').toLowerCase();
  if (/re-?sign/.test(ek) || /re-?sign|resigns/.test(String(row.storyAngle || '').toLowerCase())) score += 14;
  if (/trade/.test(ek)) score += 10;

  return { score, cls, priorHits };
}

function pickBagModes(cls, priorHits, row) {
  const modes = new Set([3]); // Friction Pivot always
  const p = cls.primary;
  if (p === 'roster-move') {
    modes.add(1);
    if (priorHits) modes.add(2);
  } else if (p === 'injury-load') {
    modes.add(6);
    modes.add(7);
  } else if (p === 'prospect-callup') {
    modes.add(9);
    if (/trade|gap|fill/.test((row.storyAngle + row.notes).toLowerCase())) modes.add(1);
  } else if (p === 'loss') {
    modes.add(4);
    modes.add(7);
  } else if (p === 'win-streak' || p === 'result-pulse') {
    modes.add(4); // empty win / hangover family includes quiet euphoria with friction
    modes.add(7);
  } else if (p === 'award-board') {
    modes.add(5);
    modes.add(9);
  } else if (p === 'insult-pulse') {
    modes.add(10);
    modes.add(7);
  } else if (p === 'front-office') {
    modes.add(1);
    modes.add(10);
  } else if (p === 'community-pulse') {
    modes.add(8);
    modes.add(7);
  } else {
    modes.add(10);
  }
  // Cap at 3 including required friction
  return [...modes].slice(0, 3).sort((a, b) => a - b);
}

function pickFanCharge(cls, row) {
  const p = cls.primary;
  const fs_ = String(row.fanSentiment || '').toLowerCase();
  if (p === 'roster-move' || p === 'insult-pulse') return 'fury';
  if (p === 'injury-load') return 'grief';
  if (p === 'loss') return 'dread';
  if (p === 'win-streak' && /euphoric|electric|high/.test(fs_)) return 'euphoria';
  if (p === 'prospect-callup') return 'dare';
  if (p === 'award-board') return 'defiance';
  if (p === 'community-pulse') return 'confession';
  if (/\bW\d+\b/.test(row.streak)) return 'euphoria';
  if (/\bL\d+\b/.test(row.streak)) return 'dread';
  return 'defiance';
}

function extractFoilNumber(stats, notes) {
  const blob = [stats, notes].filter(Boolean).join(' | ');
  if (!blob || blob === '-') return null;
  // Prefer WAR, AVG, ERA, HR, W-L, IP lines
  const patterns = [
    /(\d+\.\d+\s*war)/i,
    /(\.\d{3}\s*avg)/i,
    /(\d+-\d+\s*(?:w-l|record)?)/i,
    /(\d+\.\d{2}\s*era)/i,
    /(\d+\s*hr)/i,
    /(\d+\s*rbi)/i,
    /(\d+\s*stl)/i,
    /(\d+\s*ip)/i,
    /(\$\d+M)/i,
    /(\d+-year\s*\$?\d*M?)/i
  ];
  for (const re of patterns) {
    const m = blob.match(re);
    if (m) return m[1].replace(/\s+/g, ' ').trim();
  }
  // first number-ish token cluster
  const loose = blob.match(/[A-Za-z][^,]{0,40}?\d[\d./-]*/);
  return loose ? loose[0].slice(0, 60).trim() : null;
}

function buildAnchorFacts(row, cycle) {
  const facts = [];
  if (row.storyAngle) facts.push('StoryAngle (feed): ' + row.storyAngle);
  if (row.record && /\d/.test(row.record)) {
    facts.push('Team record (feed): ' + row.record + (row.streak ? ' · streak ' + row.streak : ''));
  }
  if (row.stats && row.stats !== '-') facts.push('Stats (feed): ' + row.stats.slice(0, 180));
  if (row.eventKind) facts.push('Event: ' + row.team + ' — ' + row.eventKind + (row.seasonType ? ' (' + row.seasonType + ')' : ''));
  if (row.namesUsed) facts.push('NamesUsed: ' + row.namesUsed.slice(0, 160));
  if (row.fanSentiment) facts.push('FanSentiment: ' + row.fanSentiment + (row.mood ? ' · Mood: ' + row.mood : ''));
  if (row.neighborhood) facts.push('HomeNeighborhood (feed): ' + row.neighborhood);
  facts.push('Cycle: C' + (row.cycle != null ? row.cycle : cycle));
  return facts.slice(0, 8);
}

function matchPriorTakes(row, priorCols, limit) {
  const names = extractPlayerNames(
    [row.namesUsed, row.storyAngle, row.notes].join(' ')
  ).map(n => n.toLowerCase());
  const keywords = (row.storyAngle + ' ' + row.notes).toLowerCase();
  const hits = [];
  for (const col of priorCols) {
    let why = null;
    for (const pn of col.names) {
      const pl = pn.toLowerCase();
      if (names.some(n => n.includes(pl) || pl.includes(n) || n.split(' ').pop() === pl.split(' ').pop())) {
        why = 'named player overlap: ' + pn;
        break;
      }
    }
    if (!why && /taveras|kelley|richards|horn|davis|quintero|morton|clark/i.test(col.headline)) {
      const token = (col.headline.match(/Taveras|Kelley|Richards|Horn|Davis|Quintero|Morton|Clark/i) || [])[0];
      if (token && keywords.includes(token.toLowerCase())) why = 'headline theme: ' + token;
    }
    if (!why && col.isCorrection && /resign|trade|signing|walk/.test(keywords)) {
      why = 'prior correction column (signature arc available)';
    }
    if (why) {
      hits.push({
        file: col.file,
        cycle: col.cycle,
        headline: col.headline,
        snippet: col.snippet.slice(0, 200),
        isCorrection: !!col.isCorrection,
        why
      });
    }
    if (hits.length >= (limit || 4)) break;
  }
  return hits;
}

function buildContradiction(row, cls) {
  // Fan heat "friction" frame — not civic stink, but bleacher vs FO / nerds
  if (cls.primary === 'roster-move') {
    return {
      a: row.storyAngle || 'Roster move on the feed',
      b: 'FO language (transition / flexibility / prepared) or the tidy "genius in hindsight" read',
      frame: 'The stands feel sold out or sold short — write into that gap, not the press release.'
    };
  }
  if (cls.primary === 'injury-load') {
    return {
      a: 'Human cost / load on the feed',
      b: 'We still ask him to be Superman',
      frame: 'Grief without inventing medical private life — we demanded too much.'
    };
  }
  if (cls.primary === 'win-streak' || cls.primary === 'award-board') {
    return {
      a: 'The numbers / streak say dynasty heat',
      b: 'The quiet fear that it cannot last — or the nerds reducing it to WAR',
      frame: 'Euphoria with friction: name the doubter, kill soft contentment.'
    };
  }
  if (cls.primary === 'insult-pulse') {
    return {
      a: 'Public insult / podcast heat',
      b: 'FO silence or "stick to baseball" smugness',
      frame: 'Oakland hears disrespect — answer from the stands, not the boardroom.'
    };
  }
  if (cls.primary === 'prospect-callup') {
    return {
      a: 'Kids producing / call-ups on the feed',
      b: 'Farewell-season eulogy habit',
      frame: 'Handoff feeling vs funeral feeling — pick a side.'
    };
  }
  return {
    a: row.storyAngle || 'Feed pulse',
    b: 'Soft both-sides / FO calm',
    frame: 'Something the stands feel that the release will not say.'
  };
}

function centralFeeling(cls, charge) {
  const map = {
    fury: 'Oakland should feel the FO heard the bleachers.',
    euphoria: 'Oakland should let itself believe — with eyes open.',
    dread: 'Oakland should name the fear before the next drop.',
    defiance: 'Oakland should refuse the soft rewrite of what just happened.',
    confession: 'Oakland should hear a fan tell the truth twice.',
    grief: 'Oakland should feel the cost of what we asked a man to carry.',
    dare: 'Oakland should feel dared to show up louder tomorrow.'
  };
  return map[charge] || 'Oakland should feel this one in the chest, not the box score.';
}

/**
 * Build full P Slayer fan-pulse slice (disk artifacts; no Sheets API).
 */
function buildPSlayerSlice(cycle, opts) {
  const o = opts || {};
  const root = o.root || ROOT;
  const cyc = Number(cycle);
  const summary = loadText(path.join(root, 'output', 'world_summary_c' + cyc + '.md'));
  const signal = loadJson(path.join(root, 'output', 'desk_signal_c' + cyc + '.json'));
  const ledger = loadLedgerNameIndex(root);
  const priorCols = o.priorColumns || loadPriorColumns(root);

  let rows = parseSportsSection(summary, cyc);
  // If summary missing section, degrade from desk_signal labels
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

  if (!rows.length) {
    return {
      cycle: cyc,
      builtAt: new Date().toISOString(),
      empty: true,
      reason: 'no-sports-feed-rows',
      journalist: { name: 'P Slayer', popid: 'POP-00008', persona: 'p-slayer' }
    };
  }

  const scored = rows.map(row => {
    const { score, cls, priorHits } = scoreRow(row, cyc, priorCols);
    return { row, score, cls, priorHits };
  });
  scored.sort((a, b) => b.score - a.score);

  // Prefer a row that still yields at least one anchor fact + names when possible
  let top = scored[0];
  for (const cand of scored) {
    if (cand.score < top.score - 15) break;
    if ((cand.row.storyAngle || cand.row.notes) && cand.row.cycle === cyc) {
      top = cand;
      break;
    }
  }

  const { row, score, cls, priorHits } = top;
  const bagModes = pickBagModes(cls, priorHits, row);
  const fanCharge = pickFanCharge(cls, row);
  const foil = extractFoilNumber(row.stats, row.notes);
  const anchors = buildAnchorFacts(row, cyc);
  const priors = matchPriorTakes(row, priorCols, 4);
  const friction = buildContradiction(row, cls);

  // Prefer NamesUsed (structured) then angle; notes last (noisier prose)
  const namePool = [
    ...extractPlayerNames(row.namesUsed),
    ...extractPlayerNames(row.storyAngle),
    ...extractPlayerNames((row.notes || '').slice(0, 280))
  ].filter((n, i, a) => a.findIndex(x => x.toLowerCase() === n.toLowerCase()) === i);
  const players = [];
  const seenPop = new Set();
  for (const n of namePool) {
    const p = resolvePlayer(n, ledger);
    if (p.popid && seenPop.has(p.popid)) continue;
    if (p.popid) seenPop.add(p.popid);
    // skip pure FO names from "player" list if RoleType is executive-only? keep Mike as FO foil
    players.push({
      name: p.name,
      popid: p.popid,
      role: p.role,
      neighborhood: p.neighborhood,
      why: 'feed-names'
    });
    if (players.length >= 10) break;
  }

  const prewrite = {
    reporter: 'P.Slayer',
    bagModes: bagModes.map(id => ({ id, name: BAG_MODES[id] })),
    fanCharge,
    priorTake: priors.length
      ? priors[0].headline + ' (' + priors[0].file + ')'
      : 'NONE — write cold or invent no prior; wall may still inject at wake',
    anchorFacts: anchors.slice(0, 4),
    foilNumber: foil || 'NONE',
    centralFeeling: centralFeeling(cls, fanCharge)
  };

  const story = {
    ref: row.ref ||
      ('Oakland_Sports_Feed cycle ' + (row.cycle || cyc) +
        '; world_summary_c' + cyc + '.md "## Sports" · ' + (row.storyAngle || row.rawHeader).slice(0, 80)),
    label: row.storyAngle || row.rawHeader,
    kind: cls.primary,
    angle: row.storyAngle || row.rawHeader,
    hookLine: friction.frame,
    hood: row.neighborhood || null,
    team: row.team,
    eventKind: row.eventKind,
    popids: players.map(p => p.popid).filter(Boolean),
    citizens: players.map(p =>
      p.name + (p.role ? ' — ' + p.role : '') + (p.neighborhood ? ', ' + p.neighborhood : '')
    ),
    pulseClass: cls.primary,
    pulseScore: score,
    fanCharge,
    bagModeIds: bagModes
  };

  const scene = {
    neighborhood: row.neighborhood || null,
    record: row.record || null,
    streak: row.streak || null,
    mood: row.mood || null,
    fanSentiment: row.fanSentiment || null,
    colorRoom:
      'You may invent unnamed bar / lot / BART / bleacher texture that contradicts nothing on this slice. ' +
      'Do not invent star players, contracts, stats, or quotes. Named people stay on PLAYERS list or Tribune colleagues (Anthony, Hal, Mags) as foils.'
  };

  const candidates = scored.slice(0, 8).map(s => ({
    score: s.score,
    cycle: s.row.cycle,
    team: s.row.team,
    primary: s.cls.primary,
    angle: (s.row.storyAngle || s.row.rawHeader || '').slice(0, 120),
    priorHits: s.priorHits
  }));

  return {
    cycle: cyc,
    builtAt: new Date().toISOString(),
    empty: false,
    journalist: { name: 'P Slayer', popid: 'POP-00008', persona: 'p-slayer' },
    approach: FAN_HEAT_APPROACH,
    pulse: {
      className: cls.primary,
      classes: cls.all,
      score,
      label: row.storyAngle || row.rawHeader,
      team: row.team,
      eventKind: row.eventKind,
      seasonType: row.seasonType,
      feedCycle: row.cycle,
      record: row.record,
      streak: row.streak,
      mood: row.mood,
      fanSentiment: row.fanSentiment,
      neighborhood: row.neighborhood,
      notes: (row.notes || '').slice(0, 400),
      stats: row.stats
    },
    charge: {
      bagModes: prewrite.bagModes,
      fanCharge,
      foilNumber: foil,
      centralFeeling: prewrite.centralFeeling,
      palette: CHARGE_PALETTE
    },
    prewrite,
    friction,
    priorTakes: priors,
    story,
    players,
    scene,
    candidates,
    pointers: [
      'output/world_summary_c' + cyc + '.md ## Sports',
      'output/desk_signal_c' + cyc + '.json lanes.sports',
      'docs/media/P_SLAYER_CHARGE_BAG.md',
      'docs/media/voices/p_slayer.md',
      'docs/media/P_SLAYER_JOURNEY_INDEX.md',
      story.ref
    ].filter(Boolean),
    gaps: {
      note: 'What would deepen fan-heat further',
      missingOrThin: [
        {
          source: 'cp-POP-00008 live wall at build time',
          status: 'wake-time',
          why: 'reporterWall injects at cron angle; slice uses on-disk prior columns so build stays offline'
        },
        {
          source: 'As_Roster live line for foil',
          status: 'feed-stats-proxy',
          why: 'FoilNumber parsed from feed Stats/Notes; live roster sheet would refine without inventing'
        },
        {
          source: 'TrueSource / truesource injury windows',
          status: 'partial',
          why: 'Injury-load class relies on feed wording; card detail would strengthen Superman mode'
        }
      ]
    }
  };
}

function formatPSlayerSliceMarkdown(slice) {
  if (!slice || slice.empty) {
    return '# SLICE — fan-heat (P Slayer), Cycle ' + (slice && slice.cycle) +
      '\n\n_No sports feed pulse — do not force a column._\n';
  }
  const L = [];
  L.push('# SLICE — fan-heat (P Slayer), Cycle ' + slice.cycle);
  L.push('JOURNALIST: P Slayer (POP-00008) · persona p-slayer · Grok heat seat');
  L.push('');
  L.push('## PULSE (not civic stink — sports feed heat)');
  L.push('CLASS: ' + slice.pulse.className + ' · SCORE: ' + slice.pulse.score +
    ' · FEED_CYCLE: C' + slice.pulse.feedCycle);
  L.push('TEAM: ' + slice.pulse.team + ' · EVENT: ' + slice.pulse.eventKind +
    (slice.pulse.seasonType ? ' (' + slice.pulse.seasonType + ')' : ''));
  L.push('LABEL: ' + slice.pulse.label);
  if (slice.pulse.record) {
    L.push('RECORD: ' + slice.pulse.record +
      (slice.pulse.streak ? ' · STREAK: ' + slice.pulse.streak : '') +
      (slice.pulse.mood ? ' · MOOD: ' + slice.pulse.mood : '') +
      (slice.pulse.fanSentiment ? ' · FAN: ' + slice.pulse.fanSentiment : ''));
  }
  if (slice.pulse.stats && slice.pulse.stats !== '-') L.push('STATS: ' + slice.pulse.stats);
  if (slice.pulse.notes) L.push('NOTES: ' + slice.pulse.notes.slice(0, 320));
  L.push('');
  L.push('## CHARGE BAG');
  L.push('MODES: ' + slice.charge.bagModes.map(m => m.id + ' ' + m.name).join(' · '));
  L.push('FAN CHARGE: ' + slice.charge.fanCharge);
  L.push('FOIL NUMBER: ' + (slice.charge.foilNumber || 'NONE'));
  L.push('CENTRAL FEELING: ' + slice.charge.centralFeeling);
  L.push('');
  L.push('## PREWRITE (required before draft)');
  L.push('```');
  L.push('PREWRITE:');
  L.push('- Reporter: P.Slayer');
  L.push('- BagModes: [' + slice.prewrite.bagModes.map(m => m.id + ' ' + m.name).join('; ') + ']');
  L.push('- FanCharge: ' + slice.prewrite.fanCharge);
  L.push('- PriorTake: ' + slice.prewrite.priorTake);
  L.push('- AnchorFacts:');
  for (const a of slice.prewrite.anchorFacts) L.push('  - ' + a);
  L.push('- FoilNumber: ' + slice.prewrite.foilNumber);
  L.push('- CentralFeeling: ' + slice.prewrite.centralFeeling);
  L.push('```');
  L.push('');
  L.push('## FRICTION (bleacher vs tidy read)');
  L.push('A: ' + slice.friction.a);
  L.push('B: ' + slice.friction.b);
  L.push('FRAME: ' + slice.friction.frame);
  L.push('');
  L.push('## APPROACH');
  L.push(slice.approach);
  L.push('');
  L.push('## PRIOR TAKES (disk columns — hook or eat)');
  if (slice.priorTakes.length) {
    for (const p of slice.priorTakes) {
      L.push('- C' + (p.cycle != null ? p.cycle : '?') + ' **' + p.headline + '**');
      L.push('  ' + p.file + (p.isCorrection ? ' · CORRECTION ARC' : ''));
      L.push('  why: ' + p.why);
      L.push('  ' + p.snippet.slice(0, 160));
    }
  } else {
    L.push('_No on-disk prior column matched this pulse — wall may still inject at wake._');
  }
  L.push('');
  L.push('## PLAYERS (feed names — do not invent; RoleType when ledger-known)');
  for (const p of slice.players) {
    L.push('- ' + p.name +
      (p.popid ? ' (' + p.popid + ')' : ' (no POPID on snapshot)') +
      (p.role ? ' — ' + p.role : '') +
      (p.neighborhood ? ', ' + p.neighborhood : ''));
  }
  if (!slice.players.length) L.push('_No parseable names — use only NamesUsed on pulse; never invent stars._');
  L.push('');
  L.push('## SCENE COLOR');
  if (slice.scene.neighborhood) L.push('HOOD: ' + slice.scene.neighborhood);
  if (slice.scene.record) L.push('RECORD/STREAK: ' + slice.scene.record + ' / ' + (slice.scene.streak || '—'));
  L.push('COLOR ROOM: ' + slice.scene.colorRoom);
  L.push('');
  L.push('## OTHER CANDIDATES (scored)');
  for (const c of slice.candidates) {
    L.push('- [' + c.score + '] C' + c.cycle + ' ' + c.team + ' · ' + c.primary + ' — ' + c.angle +
      (c.priorHits ? ' (priorHits=' + c.priorHits + ')' : ''));
  }
  L.push('');
  L.push('## POINTERS');
  for (const p of slice.pointers) L.push('- ' + p);
  L.push('');
  L.push('_Generated by scripts/buildPSlayerSlice.js — no LLM. Not a Mags desk-slice. Not Jax stink._');
  return L.join('\n') + '\n';
}

function slicePaths(cycle, root) {
  const r = root || ROOT;
  return {
    md: path.join(r, 'output', 'slices', 'c' + cycle, 'p-slayer.md'),
    json: path.join(r, 'output', 'cron-compare', 'pslayer_slice_c' + cycle + '.json')
  };
}

function writePSlayerSlice(cycle, slice, root) {
  const paths = slicePaths(cycle, root);
  fs.mkdirSync(path.dirname(paths.md), { recursive: true });
  fs.mkdirSync(path.dirname(paths.json), { recursive: true });
  fs.writeFileSync(paths.json, JSON.stringify(slice, null, 2));
  fs.writeFileSync(paths.md, formatPSlayerSliceMarkdown(slice));
  return paths;
}

function loadPSlayerSlice(cycle, root) {
  const paths = slicePaths(cycle, root);
  const j = loadJson(paths.json);
  if (j && !j.empty) return j;
  const slice = buildPSlayerSlice(cycle, { root: root || ROOT });
  if (!slice.empty) writePSlayerSlice(cycle, slice, root);
  return slice.empty ? null : slice;
}

/** Assignment shape for newsroom-fanout / cron-desk-run */
function assignmentFromSlice(slice) {
  if (!slice || slice.empty) return null;
  return {
    desk: 'sports',
    name: 'P.Slayer',
    popid: 'POP-00008',
    beatDomain: 'SPORTS',
    persona: 'p-slayer',
    approach: slice.approach,
    story: slice.story,
    pslayerSlice: true,
    fanHeat: true,
    pulse: slice.pulse,
    charge: slice.charge
  };
}

/**
 * Enrich an existing fanout assignment when it is P Slayer.
 * Replaces weak/missing story with pulse story; keeps desk/name.
 */
function enrichAssignment(assign, cycle, root) {
  if (!assign) return assign;
  const isP =
    assign.persona === 'p-slayer' ||
    assign.popid === 'POP-00008' ||
    /p\.?\s*slayer/i.test(assign.name || '');
  if (!isP) return assign;
  try {
    const slice = loadPSlayerSlice(cycle, root);
    if (!slice || slice.empty) return assign;
    const from = assignmentFromSlice(slice);
    return Object.assign({}, assign, {
      approach: from.approach,
      story: from.story,
      pslayerSlice: true,
      fanHeat: true,
      pulse: from.pulse,
      charge: from.charge
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
    console.error('buildPSlayerSlice: pass --cycle N');
    process.exit(1);
  }
  const slice = buildPSlayerSlice(cycle);
  const paths = writePSlayerSlice(cycle, slice);
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(slice, null, 2));
  } else {
    console.log('pslayer slice c' + cycle +
      (slice.empty ? ' EMPTY' : ' pulse=' + slice.pulse.className + ' score=' + slice.pulse.score +
        ' charge=' + slice.charge.fanCharge +
        ' modes=' + slice.charge.bagModes.map(m => m.id).join(',') +
        ' priors=' + slice.priorTakes.length +
        ' players=' + slice.players.length));
    if (!slice.empty) {
      console.log('  ' + String(slice.pulse.label).slice(0, 100));
      if (slice.charge.foilNumber) console.log('  foil: ' + slice.charge.foilNumber);
      if (slice.priorTakes[0]) console.log('  prior: ' + slice.priorTakes[0].headline);
    }
    console.log('→ ' + path.relative(ROOT, paths.md));
    console.log('→ ' + path.relative(ROOT, paths.json));
  }
}

module.exports = {
  buildPSlayerSlice,
  writePSlayerSlice,
  loadPSlayerSlice,
  formatPSlayerSliceMarkdown,
  assignmentFromSlice,
  enrichAssignment,
  slicePaths,
  parseSportsSection,
  classifyPulse,
  scoreRow,
  pickBagModes,
  FAN_HEAT_APPROACH,
  BAG_MODES
};
