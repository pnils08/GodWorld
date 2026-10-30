#!/usr/bin/env node
'use strict';

/**
 * UNDOCKED Phase 2.1 — deterministic episode adapter.
 * Plan: docs/plans/2026-08-07-spacemolt-game-show.md §0.4 + 2.1
 *
 * Local episode JSON is runner telemetry only. Facts come from
 * POST /api/v2/spacemolt_social/get_action_log (category-split).
 * captains_log_list is quoted subjective color — never merged into facts.
 *
 *   node scripts/undockedEpisodeAdapter.js --episode output/spacemolt-show/episodes/undocked-pop00962-2026-08-16T07-26-33.json
 *   node scripts/undockedEpisodeAdapter.js --all-three
 *
 * No LLM. Does not write the sim. Does not print credentials.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const V = 'UNDOCKED-ADAPTER/1';
const BASE = process.env.SPACEMOLT_URL || 'https://game.spacemolt.com/api/v2';
const UA = 'GodWorld-UNDOCKED-adapter/1';
// 'mission' added 2026-10-11: the brief now sends pilots after station
// contracts (1,500–3,500 cr a close vs 5–10 cr/unit raw ore), and the game logs
// those under category 'mission', which this list had never fetched — a closed
// contract would have scored 0 on the board. Category list is the game's own
// (get_action_log: combat, trading, ship, crafting, faction, mission, skill,
// salvage, storage, achievement, mining, navigation, exploration, reputation,
// drone, session, other).
// 'achievement' added 2026-10-30 (research.31, builder ruling C): the board
// ranks the game's own achievement points first, credits alongside. The game
// logs each unlock as `achievement.unlocked` with data.points (verified live
// 2026-10-30 on POP-00816's First Steps, 5 pts).
const CATEGORIES = ['mining', 'trading', 'mission', 'combat', 'navigation', 'session', 'achievement'];
// Reward credit keys a mission-completion entry may carry. The game's typed
// MissionRewardsInfo names `credits`; the action-log data map is untyped, so
// the first key present wins. Only a completion entry counts — an accept entry
// may echo the posted reward without paying it.
const MISSION_CREDIT_KEYS = ['credits_delta', 'credits_earned', 'reward_credits', 'credits'];
const SESSIONS = path.join(ROOT, 'output', 'kimi', 'spacemolt-phase0', 'commander', 'sessions');
const STAGED = path.join(ROOT, 'output', 'spacemolt-show', 'staged');
const DRAW = path.join(ROOT, 'output', 'spacemolt-show', 'draws', 'draw-1.json');

const SYSTEM_KEYS = [
  'system_name', 'system', 'destination', 'to_system', 'from_system',
  'poi_name', 'poi', 'target_poi',
];
const MISHAP_RE = /fail|error|death|destroy|no_fuel|strand|hull|crash|denied|invalid|timeout|wreck/i;

function episodeIdFromPath(p) {
  return path.basename(p, '.json');
}

function popidFromSession(session) {
  const m = String(session || '').match(/^undocked-pop(\d+)$/i);
  if (!m) throw new Error('cannot parse POPID from session "' + session + '"');
  return 'POP-' + m[1].padStart(5, '0');
}

function loadEpisode(jsonPath) {
  const abs = path.isAbsolute(jsonPath) ? jsonPath : path.join(ROOT, jsonPath);
  const raw = JSON.parse(fs.readFileSync(abs, 'utf8'));
  if (!raw.session || !raw.startedAt || !raw.endedAt) {
    throw new Error('episode JSON missing session/startedAt/endedAt: ' + abs);
  }
  return {
    path: abs,
    episode_id: episodeIdFromPath(abs),
    show: raw.show || 'UNDOCKED',
    session: raw.session,
    popid: popidFromSession(raw.session),
    startedAt: raw.startedAt,
    endedAt: raw.endedAt,
    // research.29 Move 3: the runner's idle-stop verdict rides into the staged night.
    // research.31: runners since 10-30 write stopReason instead; a pilot-stopped
    // night is the same idle stop, so the credit annotation still fires.
    stall: raw.stall || (raw.stopReason === 'pilot-stopped'
      ? { stopReason: 'pilot-stopped', toolCalls: raw.toolCalls == null ? null : raw.toolCalls } : null),
    runner: {
      turns: raw.turns,
      exitCode: raw.exitCode,
      capped: raw.capped,
      toolErrors: raw.toolErrors,
      estCostUsd: raw.estCostUsd,
      tokensIn: raw.tokensIn,
      tokensOut: raw.tokensOut,
      log: raw.log || null,
      // research.31: how the night ended (pilot-stopped / window / exit)
      stopReason: raw.stopReason || null,
      toolCalls: raw.toolCalls == null ? null : raw.toolCalls,
    },
  };
}

function loadCredentials(session) {
  const p = path.join(SESSIONS, session, 'credentials.json');
  if (!fs.existsSync(p)) throw new Error('no credentials for ' + session);
  const j = JSON.parse(fs.readFileSync(p, 'utf8'));
  if (!j.username || !j.password) throw new Error('credentials missing username/password for ' + session);
  return { username: j.username, password: j.password, playerId: j.playerId || null };
}

function castName(popid) {
  try {
    const draw = JSON.parse(fs.readFileSync(DRAW, 'utf8'));
    const row = (draw.cast || []).find(function (c) { return c.popid === popid; });
    return row ? row.name : null;
  } catch (_) {
    return null;
  }
}

function parseTs(ts) {
  if (!ts) return NaN;
  let s = String(ts).trim();
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(s) && !/[zZ]|[+-]\d{2}:?\d{2}$/.test(s)) {
    s = s.replace(' ', 'T') + 'Z';
  }
  return Date.parse(s);
}

function inWindow(ts, start, end) {
  const t = parseTs(ts);
  if (!Number.isFinite(t)) return false;
  return t >= parseTs(start) && t <= parseTs(end);
}

function entryTime(entry) {
  return entry.created_at || entry.timestamp || entry.ts || null;
}

function filterWindow(entries, start, end) {
  return (entries || []).filter(function (e) { return inWindow(entryTime(e), start, end); });
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function pickFirst(obj, keys) {
  if (!obj || typeof obj !== 'object') return null;
  for (let i = 0; i < keys.length; i++) {
    if (obj[keys[i]] != null && obj[keys[i]] !== '') return obj[keys[i]];
  }
  return null;
}

function fact(value, extra) {
  return Object.assign({ type: 'FACT', source: 'get_action_log' }, extra || {}, { value: value });
}

function creditDeltaForEntry(e) {
  const d = e.data || {};
  const t = String(e.event_type || '');
  if (t === 'trading.exchange_fill') {
    const total = num(d.total);
    if (total == null) return null;
    if (d.role === 'buyer') return -total;
    return total;
  }
  if (t === 'trading.buy_order_created') {
    const escrow = num(d.escrow);
    return escrow == null ? null : -escrow;
  }
  if (t === 'trading.order_cancelled') {
    return num(d.refunded_credits);
  }
  // research.29 (builder 2026-10-16, "give the citizens their awarded points"):
  // station sales and buys log under their own event types with a plain
  // `credits` field, not `credits_delta` — trading.fuel_sold carried Clarissa
  // Dane's 14 cr on 2026-09-07 and scored nothing. The full sweep of all 55
  // archived nights found this the ONLY credit-bearing shape the adapter
  // skipped. Sold = earned, bought = spent; anything else stays unscored.
  if (e.category === 'trading' && d.credits_delta == null) {
    const c = num(d.credits);
    if (c != null) {
      if (/sold|sell|sale/i.test(t)) return Math.abs(c);
      if (/bought|buy|purchas/i.test(t)) return -Math.abs(c);
    }
  }
  if (e.category === 'mission' || /^mission\./.test(t)) {
    if (!/complet|claim|reward|paid/i.test(t)) return null;
    for (let i = 0; i < MISSION_CREDIT_KEYS.length; i++) {
      const n = num(d[MISSION_CREDIT_KEYS[i]]);
      if (n != null) return n;
    }
    return null;
  }
  const generic = num(d.credits_delta);
  if (generic != null) return generic;
  return null;
}

function deriveCredits(entries) {
  let sum = 0;
  let hits = 0;
  const basis = [];
  entries.forEach(function (e) {
    const n = creditDeltaForEntry(e);
    if (n == null) return;
    sum += n;
    hits++;
    basis.push({ id: e.id, event_type: e.event_type, n: n });
  });
  // research.29: a measured zero is a fact, a missing log is not. A night whose
  // action log has entries (mining, docking, navigation…) but no credit event
  // EARNED NOTHING — that is 0, and the board and the recap say so. Only a
  // window with no entries at all stays null (unknown). Before this, 34 of 55
  // nights read blank and nobody could tell a bad night from a broken fetch.
  // agy review 2026-10-16 hunt 2: the runner's own login writes a `session`
  // entry inside the window even when the pilot never flew (12 of the 33 blank
  // archived nights were session-only — runner crashes and stalls). A measured
  // zero needs gameplay evidence: at least one non-session entry. Session-only
  // or empty stays unknown, and a stalled night is named as such.
  if (!hits) {
    const gameplay = entries.some(function (e) { return e.category && e.category !== 'session'; });
    if (!gameplay) return fact(null, { note: entries.length ? 'no gameplay recorded in window (runner never flew or stalled) — unknown' : 'no action-log entries in window — unknown' });
    return fact(0, { hits: 0, note: 'gameplay in window carries no credit event — measured zero' });
  }
  return fact(sum, { hits: hits, basis: basis.slice(0, 40) });
}

// research.31: a jump names both ends. Before, the first SYSTEM_KEYS hit kept
// only `to_system`, so Eric Taveras's Sol sale + Sol-to-Sirius jump (10-16)
// read Systems ["sirius"] and the city was told he scored in Sirius.
function deriveSystems(entries) {
  const seen = [];
  const add = function (v) {
    if (v == null || v === '') return;
    const s = String(v);
    if (seen.indexOf(s) < 0) seen.push(s);
  };
  entries.slice().sort(function (a, b) {
    return String(entryTime(a) || '').localeCompare(String(entryTime(b) || ''));
  }).forEach(function (e) {
    const d = e.data || {};
    if (d.from_system != null && d.to_system != null) {
      add(d.from_system);
      add(d.to_system);
      return;
    }
    add(pickFirst(d, SYSTEM_KEYS));
  });
  return fact(seen);
}

// research.31 (builder ruling C, 2026-10-30): the night's achievement points —
// the game's own score, read from the pilot's account (get_achievements, each
// unlock carries earned_at). A pilot account acts only in its flights, so an
// unlock belongs to the pilot's latest night that started at or before it —
// NOT to the runner's window: a jump logs at departure and lands ~2 min later,
// and the arrival unlock (Maiden Jump, Wanderer) falls after the window closes
// (Taveras 10-19: last jump 01:40:04, window end 01:40:14, Wanderer 01:43:10).
// `until` is the same pilot's next night's start (null for the latest night).
// Measured zero needs gameplay evidence; otherwise unknown, as for credits.
function derivePoints(account, startedAt, until) {
  if (!account) return fact(null, { source: 'get_achievements', note: 'pilot account not read — unknown' });
  if (account.invalid) {
    return fact(null, { source: 'get_achievements', note: 'pilot account record unusable (' + account.invalid.join('; ') + ') — unknown' });
  }
  const t0 = Date.parse(startedAt);
  const t1 = until ? Date.parse(until) : Infinity;
  if (isNaN(t0) || isNaN(t1)) return fact(null, { source: 'get_achievements', note: 'night window unreadable — unknown' });
  const earned = (account.earned || []).filter(function (a) {
    const t = Date.parse(a.at);
    return t >= t0 && t < t1;
  });
  if (earned.length) {
    return fact(earned.reduce(function (s, a) { return s + a.points; }, 0),
      { source: 'get_achievements', earned: earned });
  }
  // The account is the game's own timestamped record, reconciled to its total
  // (accountFrom): no unlock inside the window is a measured zero whether or not
  // the pilot moved. Blank therefore means only "account not read", which the
  // next daily settle retries (codex research.31 F7).
  return fact(0, { source: 'get_achievements', earned: [], note: 'no achievement earned in window — measured zero' });
}

function deriveCombat(entries) {
  const combat = entries.filter(function (e) { return e.category === 'combat'; });
  const value = { events: combat.length, kills: 0, deaths: 0, other: 0 };
  combat.forEach(function (e) {
    const t = String(e.event_type || e.summary || '');
    if (/death|died|destroyed|wreck/i.test(t)) value.deaths++;
    else if (/kill|victory|win/i.test(t)) value.kills++;
    else value.other++;
  });
  return fact(value);
}

function deriveCargo(entries) {
  const mined = {};
  const sold = {};
  entries.forEach(function (e) {
    const d = e.data || {};
    const t = String(e.event_type || '');
    if (t === 'mining.yield') {
      const name = d.resource_id || d.resource_name;
      const q = num(d.quantity);
      if (name && q != null) mined[name] = (mined[name] || 0) + q;
      return;
    }
    if (t === 'trading.exchange_fill' && d.role === 'seller') {
      const name = d.item_id;
      const q = num(d.quantity);
      if (name && q != null) sold[name] = (sold[name] || 0) + q;
    }
  });
  return fact({ mined: mined, sold: sold });
}

function deriveMishaps(entries) {
  const mishaps = [];
  entries.forEach(function (e) {
    // An unlock is never a mishap, even when its name reads like one.
    if (e.category === 'achievement') return;
    const blob = [e.event_type, e.summary, e.category].join(' ');
    if (!MISHAP_RE.test(blob)) return;
    mishaps.push({
      id: e.id,
      at: entryTime(e),
      category: e.category,
      event_type: e.event_type,
      summary: e.summary || '',
    });
  });
  return fact(mishaps);
}

function slimEntry(e) {
  return {
    id: e.id,
    created_at: entryTime(e),
    category: e.category,
    event_type: e.event_type,
    summary: e.summary || '',
    data: e.data || {},
  };
}

function assemble(episode, byCategory, captains, account) {
  const all = [];
  CATEGORIES.forEach(function (c) {
    (byCategory[c] || []).forEach(function (e) { all.push(e); });
  });
  const counts = {};
  CATEGORIES.forEach(function (c) { counts[c] = (byCategory[c] || []).length; });

  const captainsInWindow = filterWindow(captains, episode.startedAt, episode.endedAt);
  const captainsOut = (captains || []).filter(function (e) {
    return !inWindow(entryTime(e), episode.startedAt, episode.endedAt);
  });

  return {
    v: V,
    show: episode.show,
    episode_id: episode.episode_id,
    popid: episode.popid,
    holder: episode.holder || castName(episode.popid),
    session: episode.session,
    window: { startedAt: episode.startedAt, endedAt: episode.endedAt },
    runner: episode.runner,
    // research.29: the runner's own verdict on the flight (idle-turn stop), so a
    // measured zero on a stalled night reads "runner stall", not "flew badly".
    stall: episode.stall || null,
    source: {
      kind: 'get_action_log',
      categories: CATEGORIES.slice(),
      fetchedAt: new Date().toISOString(),
    },
    facts: {
      credits_delta: (function () {
        const c = deriveCredits(all);
        if (episode.stall && c.value === 0) c.note = 'runner stall — pilot stopped flying after real play; measured zero';
        if (episode.stall && c.value == null) c.note = 'runner stall — pilot never flew; unknown, not zero';
        return c;
      })(),
      // the night being adapted is the pilot's latest, so no `until`
      points_delta: derivePoints(account || null, episode.startedAt, null),
      systems_visited: deriveSystems(all),
      combat_results: deriveCombat(all),
      cargo: deriveCargo(all),
      mishaps: deriveMishaps(all),
      event_counts: fact(counts),
      entries: fact((function () {
        const o = {};
        CATEGORIES.forEach(function (c) {
          o[c] = (byCategory[c] || []).map(slimEntry);
        });
        return o;
      })()),
    },
    captains_log: {
      kind: 'QUOTED_SUBJECTIVE_COLOR',
      type: 'INTERPRETATION',
      provenance: 'captains_log_list',
      windowed: captainsInWindow.length,
      listed: (captains || []).length,
      note: captainsInWindow.length === 0 && (captains || []).length
        ? 'entries exist but created_at is outside startedAt/endedAt (often written at handoff)'
        : undefined,
      entries: captainsInWindow.map(quoteEntry),
      unwindowed: captainsOut.map(quoteEntry),
    },
  };
}

function quoteEntry(e) {
  return {
    index: e.index,
    created_at: entryTime(e),
    text: e.entry || e.text || e.content || '',
  };
}

function assertSplit(staged) {
  const blob = JSON.stringify(staged.facts);
  if (staged.captains_log && staged.captains_log.entries) {
    staged.captains_log.entries.forEach(function (e) {
      if (e.text && e.text.length > 20 && blob.indexOf(e.text) !== -1) {
        throw new Error('captains_log text leaked into facts');
      }
    });
  }
  if (staged.facts.credits_delta.type !== 'FACT') throw new Error('credits_delta must be FACT');
  if (staged.captains_log.kind !== 'QUOTED_SUBJECTIVE_COLOR') throw new Error('captains_log kind');
}

async function api(sessionId, command, payload) {
  const headers = { 'Content-Type': 'application/json', 'User-Agent': UA };
  if (sessionId) headers['X-Session-Id'] = sessionId;
  const resp = await fetch(BASE + '/' + command, {
    method: 'POST',
    headers: headers,
    body: payload ? JSON.stringify(payload) : undefined,
  });
  let body;
  try { body = await resp.json(); }
  catch (_) {
    throw new Error(command + ' HTTP ' + resp.status + ' non-JSON');
  }
  if (body && body.error) {
    const err = body.error;
    throw new Error(command + ' ' + (err.code || resp.status) + ': ' + (err.message || 'error'));
  }
  if (!resp.ok) throw new Error(command + ' HTTP ' + resp.status);
  return body;
}

async function createSession() {
  const resp = await fetch(BASE + '/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': UA },
  });
  const body = await resp.json();
  const id = body && body.session && body.session.id;
  if (!id) throw new Error('session create failed');
  return id;
}

async function login(sessionId, creds) {
  const body = await api(sessionId, 'spacemolt_auth/login', {
    username: creds.username,
    password: creds.password,
  });
  return (body.session && body.session.id) || sessionId;
}

async function fetchCategory(sessionId, category, start, end) {
  const kept = [];
  for (let page = 1; page <= 20; page++) {
    const body = await api(sessionId, 'spacemolt_social/get_action_log', {
      category: category,
      page: page,
      page_size: 100,
    });
    const sc = body.structuredContent || {};
    const entries = sc.entries || [];
    if (!entries.length) break;
    let olderThanWindow = false;
    entries.forEach(function (e) {
      e.category = e.category || category;
      const ts = entryTime(e);
      if (ts && Date.parse(ts) < Date.parse(start)) olderThanWindow = true;
      if (inWindow(ts, start, end)) kept.push(e);
    });
    if (!sc.has_more || olderThanWindow) break;
  }
  return kept;
}

async function fetchCaptains(sessionId) {
  const out = [];
  for (let index = 0; index < 20; index++) {
    const body = await api(sessionId, 'spacemolt_social/captains_log_list', { index: index });
    const sc = body.structuredContent || {};
    const entry = sc.entry || null;
    if (entry) out.push(entry);
    if (!sc.has_next) break;
  }
  return out;
}

async function adaptEpisode(jsonPath, holder) {
  const episode = loadEpisode(jsonPath);
  if (holder) episode.holder = holder;
  const creds = loadCredentials(episode.session);
  let sid = await createSession();
  sid = await login(sid, creds);
  const byCategory = {};
  for (let i = 0; i < CATEGORIES.length; i++) {
    byCategory[CATEGORIES[i]] = await fetchCategory(
      sid, CATEGORIES[i], episode.startedAt, episode.endedAt
    );
  }
  const captains = await fetchCaptains(sid);
  let account = null;
  try { account = await readAccount(sid); }
  catch (e) { console.error('[adapter] get_achievements failed — points unknown tonight, the daily settle retries: ' + (e.message || e)); }
  const staged = assemble(episode, byCategory, captains, account);
  assertSplit(staged);
  return staged;
}

function writeStaged(staged) {
  fs.mkdirSync(STAGED, { recursive: true });
  const p = path.join(STAGED, staged.episode_id + '.json');
  fs.writeFileSync(p, JSON.stringify(staged, null, 2) + '\n');
  return p;
}

function threeEpisodePaths() {
  return [
    'output/spacemolt-show/episodes/undocked-pop00962-2026-08-16T07-26-33.json',
    'output/spacemolt-show/episodes/undocked-pop00143-2026-08-16T07-44-12.json',
    'output/spacemolt-show/episodes/undocked-pop00688-2026-08-16T07-54-19.json',
  ];
}

// ---------------------------------------------------------------------------
// research.29 Move 2 — BACKFILL (builder 2026-10-16: "yes lets back fill her
// missing points and the other missing data on that ledger, scores and names").
// The adapter learned mission rewards on 2026-10-11 and station sales today;
// the archived nights keep their full windowed action-log entries
// (facts.entries), so every past night is re-scored from the record it
// already holds — no API call. Blank holders resolve by POPID against the
// ledger snapshot (the world's record), never invented.
//
//   node scripts/undockedEpisodeAdapter.js --rescore-archive          # table only
//   node scripts/undockedEpisodeAdapter.js --rescore-archive --apply  # writes
//
// --apply writes four places, all keyed by the episode: the archive file
// (facts.credits_delta, holder), the intake row (CreditsDelta, Holder,
// FeedEvent.*), the feed pack event (feed/c<Cycle>.json), and the
// Undocked_Feed tab row by EpisodeId (CreditsDelta, Holder). The board is then
// `node scripts/undockedStandings.js` — a full recompute from the tab, so it
// converges on its own. Read the tab back after.
// ---------------------------------------------------------------------------
const ARCHIVE_DIR = path.join(STAGED, 'archive');
const INTAKE_DIR = path.join(ROOT, 'output', 'spacemolt-show', 'intake');
const FEED_DIR = path.join(ROOT, 'output', 'spacemolt-show', 'feed');
const SNAPSHOT = path.join(ROOT, 'output', 'simulation_ledger_snapshot.jsonl');
const FEED_TAB = 'Undocked_Feed';

function snapshotNames() {
  const out = {};
  if (!fs.existsSync(SNAPSHOT)) return out;
  fs.readFileSync(SNAPSHOT, 'utf8').split('\n').forEach(function (line) {
    if (!line) return;
    try {
      const r = JSON.parse(line);
      if (r.POPID && r.Name) out[String(r.POPID).toUpperCase()] = String(r.Name).trim();
    } catch (_) { /* skip */ }
  });
  return out;
}

// The staged file keeps every windowed entry by category — the same list
// assemble() scored from, so a re-derivation is the same computation.
function entriesOf(staged) {
  const byCat = (staged.facts && staged.facts.entries && staged.facts.entries.value) || {};
  const all = [];
  Object.keys(byCat).forEach(function (c) {
    (byCat[c] || []).forEach(function (e) { all.push(Object.assign({ category: c }, e)); });
  });
  return all;
}

function intakeByStagedName() {
  const out = {};
  if (!fs.existsSync(INTAKE_DIR)) return out;
  fs.readdirSync(INTAKE_DIR).filter(function (f) { return f.endsWith('.json'); }).forEach(function (f) {
    const p = path.join(INTAKE_DIR, f);
    try {
      const r = JSON.parse(fs.readFileSync(p, 'utf8'));
      out[path.basename(r.StagedPath || '')] = { row: r, path: p };
    } catch (_) { /* skip */ }
  });
  return out;
}

function planRescore() {
  const names = snapshotNames();
  const intake = intakeByStagedName();
  const changes = [];
  const files = fs.existsSync(ARCHIVE_DIR)
    ? fs.readdirSync(ARCHIVE_DIR).filter(function (f) { return f.endsWith('.json'); }).sort() : [];
  files.forEach(function (f) {
    const p = path.join(ARCHIVE_DIR, f);
    const staged = JSON.parse(fs.readFileSync(p, 'utf8'));
    const before = staged.facts && staged.facts.credits_delta ? staged.facts.credits_delta.value : undefined;
    const after = deriveCredits(entriesOf(staged));
    const holderBefore = staged.holder || '';
    const holderAfter = holderBefore || names[String(staged.popid || '').toUpperCase()] || '';
    const ik = intake[f] || null;
    const creditsChanged = (before == null ? null : Number(before)) !== after.value;
    const holderChanged = holderAfter !== holderBefore;
    if (!creditsChanged && !holderChanged) return;
    changes.push({
      file: f, stagedPath: p, popid: staged.popid,
      holderBefore: holderBefore, holderAfter: holderAfter,
      before: before === undefined ? null : before, after: after.value, note: after.note || '',
      fact: after,
      intakePath: ik ? ik.path : null,
      applied: ik ? ik.row.Applied : null,
      cycle: ik ? ik.row.Cycle : null,
      episodeId: ik && ik.row.FeedEvent ? ik.row.FeedEvent.EpisodeId : null,
    });
  });
  return { scanned: files.length, changes: changes };
}

function printRescore(plan) {
  console.log('[rescore] ' + plan.scanned + ' archived night(s), ' + plan.changes.length + ' change(s):');
  plan.changes.forEach(function (c) {
    console.log('  ' + (c.episodeId || '(no feed row)') + ' c' + (c.cycle == null ? '?' : c.cycle)
      + ' ' + c.popid + ' ' + (c.holderBefore || '(blank)') + (c.holderAfter !== c.holderBefore ? ' -> ' + c.holderAfter : '')
      + ' | credits ' + (c.before == null ? 'blank' : c.before) + ' -> ' + (c.after == null ? 'blank' : c.after)
      + (c.note ? ' (' + c.note + ')' : ''));
  });
}

async function applyRescore(plan) {
  require('../lib/env');
  const sheets = require('../lib/sheets');
  const tab = await sheets.getSheetData(FEED_TAB);
  if (!tab || !tab.length) throw new Error(FEED_TAB + ' unreadable — refusing to backfill');
  const hdr = tab[0];
  const iEp = hdr.indexOf('EpisodeId'), iCr = hdr.indexOf('CreditsDelta'), iHo = hdr.indexOf('Holder');
  if (iEp < 0 || iCr < 0 || iHo < 0) throw new Error(FEED_TAB + ' missing EpisodeId/CreditsDelta/Holder');
  const rowOf = {};
  for (let r = 1; r < tab.length; r++) {
    const v = String(tab[r][iEp] == null ? '' : tab[r][iEp]).trim();
    if (v) rowOf[v] = r + 1;   // 1-based sheet row
  }
  const updates = [];
  const report = { disk: 0, tab: 0, noFeedRow: [] };
  // The tab FIRST, then disk. planRescore diffs against the archive, so if the
  // disk were rewritten and the sheet call then failed, a re-run would find
  // nothing to do and the board would stay half-wired forever. Tab-then-disk
  // means a failure on either side is repaired by running --apply again.
  plan.changes.forEach(function (c) {
    // approved rows only — only decided-yes events ever left disk
    if (c.applied === 'yes' && c.episodeId && rowOf[c.episodeId]) {
      const r = rowOf[c.episodeId];
      updates.push({ range: FEED_TAB + '!' + sheets.columnIndexToLetter(iCr) + r, values: [[c.after == null ? '' : c.after]] });
      if (c.holderAfter) updates.push({ range: FEED_TAB + '!' + sheets.columnIndexToLetter(iHo) + r, values: [[c.holderAfter]] });
      report.tab++;
    } else if (c.applied === 'yes') {
      report.noFeedRow.push(c.episodeId || c.file);
    }
  });
  if (updates.length) await sheets.batchUpdate(updates);
  plan.changes.forEach(function (c) {
    // 1. archive file
    const staged = JSON.parse(fs.readFileSync(c.stagedPath, 'utf8'));
    staged.facts.credits_delta = Object.assign({}, c.fact, { rescoredAt: new Date().toISOString(), was: c.before });
    if (c.holderAfter && !staged.holder) staged.holder = c.holderAfter;
    fs.writeFileSync(c.stagedPath, JSON.stringify(staged, null, 2) + '\n');
    report.disk++;
    // 2. intake row + 3. feed pack event
    if (c.intakePath) {
      const row = JSON.parse(fs.readFileSync(c.intakePath, 'utf8'));
      row.CreditsDelta = c.after;
      if (c.holderAfter) row.Holder = c.holderAfter;
      if (row.FeedEvent) {
        row.FeedEvent.CreditsDelta = c.after;
        if (c.holderAfter) row.FeedEvent.Holder = c.holderAfter;
      }
      fs.writeFileSync(c.intakePath, JSON.stringify(row, null, 2) + '\n');
      if (c.episodeId && c.cycle != null) {
        const fp = path.join(FEED_DIR, 'c' + c.cycle + '.json');
        if (fs.existsSync(fp)) {
          const pack = JSON.parse(fs.readFileSync(fp, 'utf8'));
          (pack.events || []).forEach(function (e) {
            if (e.EpisodeId !== c.episodeId) return;
            e.CreditsDelta = c.after;
            if (c.holderAfter) e.Holder = c.holderAfter;
          });
          fs.writeFileSync(fp, JSON.stringify(pack, null, 2) + '\n');
        }
      }
    }
  });
  return report;
}

// ---------------------------------------------------------------------------
// research.31 — POINTS BACK-SCORE + DAILY SETTLE (builder ruling C,
// 2026-10-30). Archived nights before 10-30 never read points; and a live
// night's arrival unlocks can land after its adapter ran. Both are settled from
// the game's own record of the pilot's account (get_achievements, earned_at),
// attributed by derivePoints: the pilot's latest night that started at or
// before the unlock. An unlock older than every night is reported, never placed.
// Only nights whose value changes are written. One account read per pilot.
//
//   node scripts/undockedEpisodeAdapter.js --rescore-points                  # all pilots, table only
//   node scripts/undockedEpisodeAdapter.js --rescore-points --apply          # writes
//   node scripts/undockedEpisodeAdapter.js --rescore-points --recent 7 --apply   # daily settle (cron)
//
// --apply writes PointsDelta to the Undocked_Feed tab (approved rows, by
// EpisodeId), then facts.points_delta on the archive file, the intake row and
// the feed pack event. Then `node scripts/undockedStandings.js`.
// ---------------------------------------------------------------------------
async function readAccount(sid) {
  const body = await api(sid, 'spacemolt/get_achievements', {});
  const sc = body.structuredContent || body;
  if (!Array.isArray(sc.achievements)) throw new Error('get_achievements returned no achievements list');
  return accountFrom(sc);
}

// codex research.31 F2: an earned unlock without finite points or a parseable
// earned_at cannot be placed, and an account whose earned unlocks do not add up
// to the game's own summary total cannot be trusted with any night. Either marks
// the account invalid — its nights stay unknown (never zero) and the back-score
// leaves them as they are.
function accountFrom(sc) {
  const problems = [];
  const earned = (sc.achievements || []).filter(function (a) { return a.earned; }).map(function (a) {
    const pts = (a.points === '' || a.points == null) ? null : num(a.points);
    if (pts == null) problems.push((a.id || a.name) + ' points ' + JSON.stringify(a.points));
    if (isNaN(Date.parse(a.earned_at))) problems.push((a.id || a.name) + ' earned_at ' + JSON.stringify(a.earned_at));
    return { id: a.id, name: a.name, points: pts, at: a.earned_at || null };
  });
  const total = sc.summary ? num(sc.summary.points) : null;
  if (total == null) problems.push('no summary points total');
  else if (!problems.length) {
    const sum = earned.reduce(function (s, a) { return s + a.points; }, 0);
    if (sum !== total) problems.push('earned unlocks add to ' + sum + ', summary says ' + total);
  }
  return { total: total, earned: earned, invalid: problems.length ? problems : null };
}

async function fetchAchievements(session) {
  const creds = loadCredentials(session);
  let lastErr = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      let sid = await createSession();
      sid = await login(sid, creds);
      return await readAccount(sid);
    } catch (e) {
      lastErr = e;
      await new Promise(function (r) { setTimeout(r, 20000); });
    }
  }
  throw lastErr;
}

function archivedNights() {
  const files = fs.existsSync(ARCHIVE_DIR)
    ? fs.readdirSync(ARCHIVE_DIR).filter(function (f) { return f.endsWith('.json'); }).sort() : [];
  return files.map(function (f) {
    const p = path.join(ARCHIVE_DIR, f);
    return { file: f, stagedPath: p, staged: JSON.parse(fs.readFileSync(p, 'utf8')) };
  });
}

// One value, four copies: the tab cell, the archive fact, the intake row (+ its
// FeedEvent), the feed-pack event. `undefined` = the copy has no value yet.
function samePoints(have, want) {
  if (have === undefined) return false;
  const h = (have === '' || have == null) ? null : Number(have);
  return h === (want == null ? null : want);
}

// accounts: { session: {total, earned[], invalid} } — a session missing here,
// or whose record is invalid, is not re-scored (its nights keep what they have).
// codex research.31 F1: `stale` names every disk copy that disagrees with the
// derived value, so a run that died between copies is finished by the next run;
// the tab copy is compared in applyPointsRescore, where the tab is read.
function planPointsRescore(accounts, nightsIn) {
  const intake = intakeByStagedName();
  const all = nightsIn || archivedNights();
  const packs = {};
  const packEvent = function (cycle, episodeId) {
    if (!episodeId || cycle == null) return undefined;
    if (!(cycle in packs)) {
      const fp = path.join(FEED_DIR, 'c' + cycle + '.json');
      packs[cycle] = fs.existsSync(fp) ? JSON.parse(fs.readFileSync(fp, 'utf8')) : null;
    }
    return ((packs[cycle] && packs[cycle].events) || []).find(function (e) { return e.EpisodeId === episodeId; });
  };
  const skipped = [];
  const bySession = {};
  all.forEach(function (n) {
    const s = n.staged.session;
    (bySession[s] || (bySession[s] = [])).push(n);
  });
  const nights = [];
  const unplaced = [];
  Object.keys(bySession).forEach(function (session) {
    const acct = accounts[session];
    if (!acct) return;
    if (acct.invalid) { skipped.push({ session: session, problems: acct.invalid }); return; }
    const list = bySession[session].sort(function (a, b) {
      return String(a.staged.window.startedAt).localeCompare(String(b.staged.window.startedAt));
    });
    const firstStart = Date.parse(list[0].staged.window.startedAt);
    acct.earned.forEach(function (a) {
      if (!(Date.parse(a.at) >= firstStart)) unplaced.push({ session: session, name: a.name, points: a.points, at: a.at });
    });
    list.forEach(function (n, i) {
      const until = i + 1 < list.length ? list[i + 1].staged.window.startedAt : null;
      const f = derivePoints(acct, n.staged.window.startedAt, until);
      const before = n.staged.facts && n.staged.facts.points_delta ? n.staged.facts.points_delta.value : undefined;
      const ik = intake[n.file] || null;
      const cycle = ik ? ik.row.Cycle : null;
      const episodeId = ik && ik.row.FeedEvent ? ik.row.FeedEvent.EpisodeId : null;
      const stale = [];
      if (!samePoints(before, f.value)) stale.push('archive');
      if (ik && (!samePoints(ik.row.PointsDelta, f.value) ||
          (ik.row.FeedEvent && !samePoints(ik.row.FeedEvent.PointsDelta, f.value)))) stale.push('intake');
      const ev = packEvent(cycle, episodeId);
      if (ev && !samePoints(ev.PointsDelta, f.value)) stale.push('pack');
      nights.push({
        file: n.file, stagedPath: n.stagedPath, popid: n.staged.popid, holder: n.staged.holder || '',
        session: session, fact: f, before: before,
        stale: stale, changed: stale.length > 0,
        intakePath: ik ? ik.path : null,
        applied: ik ? ik.row.Applied : null,
        cycle: cycle,
        episodeId: episodeId,
      });
    });
  });
  return { scanned: all.length, nights: nights, unplaced: unplaced, skipped: skipped, accounts: accounts };
}

function printPointsRescore(plan) {
  const byPop = {};
  plan.nights.forEach(function (n) {
    const b = byPop[n.popid] || (byPop[n.popid] = { holder: n.holder, nights: 0, points: 0, unknown: 0, changed: 0, names: [] });
    b.nights++;
    if (n.changed) b.changed++;
    if (n.fact.value == null) b.unknown++;
    else b.points += n.fact.value;
    (n.fact.earned || []).forEach(function (a) { b.names.push(a.name + ' ' + a.points); });
  });
  console.log('[rescore-points] ' + plan.scanned + ' archived night(s), ' + Object.keys(plan.accounts).length + ' account(s) read');
  Object.keys(byPop).sort(function (a, b) { return byPop[b].points - byPop[a].points; }).forEach(function (k) {
    const b = byPop[k];
    const total = (plan.accounts[plan.nights.find(function (n) { return n.popid === k; }).session] || {}).total;
    console.log('  ' + k + ' ' + (b.holder || '(blank)') + ' | ' + b.points + ' pts over ' + b.nights + ' night(s)'
      + ' (game total ' + total + ')' + (b.unknown ? ', ' + b.unknown + ' unknown' : '') + ', ' + b.changed + ' to write'
      + (b.names.length ? ' — ' + b.names.join(', ') : ''));
  });
  (plan.skipped || []).forEach(function (k) {
    console.log('  SKIPPED ' + k.session + ' — account record unusable, nights left as they are: ' + k.problems.join('; '));
  });
  if (plan.unplaced.length) {
    console.log('  NOT PLACED (earned before the pilot\'s first archived night):');
    plan.unplaced.forEach(function (u) { console.log('    ' + u.session + ' ' + u.name + ' ' + u.points + ' @ ' + u.at); });
  }
}

async function applyPointsRescore(plan) {
  require('../lib/env');
  const sheets = require('../lib/sheets');
  const report = { disk: 0, tab: 0, noFeedRow: [], mismatched: [] };
  const readTab = async function () {
    const tab = await sheets.getSheetData(FEED_TAB);
    if (!tab || !tab.length) throw new Error(FEED_TAB + ' unreadable — refusing to backfill');
    const hdr = tab[0];
    const iEp = hdr.indexOf('EpisodeId'), iPt = hdr.indexOf('PointsDelta');
    if (iEp < 0 || iPt < 0) throw new Error(FEED_TAB + ' missing EpisodeId/PointsDelta — the header cell comes first (undockedShowGate ensureFeedHeader)');
    const cell = {};
    const rowOf = {};
    for (let r = 1; r < tab.length; r++) {
      const v = String(tab[r][iEp] == null ? '' : tab[r][iEp]).trim();
      if (!v) continue;
      rowOf[v] = r + 1;
      cell[v] = tab[r][iPt] === undefined ? '' : tab[r][iPt];
    }
    return { iPt: iPt, rowOf: rowOf, cell: cell };
  };
  // Only approved rows live on the tab.
  const tabStale = function (t, n) {
    return n.applied === 'yes' && n.episodeId && t.rowOf[n.episodeId] && !samePoints(t.cell[n.episodeId], n.fact.value);
  };
  const t = await readTab();
  const updates = [];
  plan.nights.forEach(function (n) {
    if (tabStale(t, n)) {
      updates.push({ range: FEED_TAB + '!' + sheets.columnIndexToLetter(t.iPt) + t.rowOf[n.episodeId],
        values: [[n.fact.value == null ? '' : n.fact.value]] });
      report.tab++;
    } else if (n.applied === 'yes' && !(n.episodeId && t.rowOf[n.episodeId])) {
      report.noFeedRow.push(n.episodeId || n.file);
    }
  });
  if (updates.length) await sheets.batchUpdate(updates);
  plan.nights.filter(function (n) { return n.changed; }).forEach(function (n) {
    if (n.stale.indexOf('archive') >= 0) {
      const staged = JSON.parse(fs.readFileSync(n.stagedPath, 'utf8'));
      staged.facts.points_delta = Object.assign({}, n.fact, { rescoredAt: new Date().toISOString() });
      fs.writeFileSync(n.stagedPath, JSON.stringify(staged, null, 2) + '\n');
    }
    if (n.stale.indexOf('intake') >= 0) {
      const row = JSON.parse(fs.readFileSync(n.intakePath, 'utf8'));
      row.PointsDelta = n.fact.value;
      if (row.FeedEvent) row.FeedEvent.PointsDelta = n.fact.value;
      fs.writeFileSync(n.intakePath, JSON.stringify(row, null, 2) + '\n');
    }
    if (n.stale.indexOf('pack') >= 0) {
      const fp = path.join(FEED_DIR, 'c' + n.cycle + '.json');
      const pack = JSON.parse(fs.readFileSync(fp, 'utf8'));
      (pack.events || []).forEach(function (e) { if (e.EpisodeId === n.episodeId) e.PointsDelta = n.fact.value; });
      fs.writeFileSync(fp, JSON.stringify(pack, null, 2) + '\n');
    }
    report.disk++;
  });
  // Read every copy back: a fresh plan from disk must find nothing stale, and
  // the re-read tab must hold the derived value on every approved row.
  const again = planPointsRescore(plan.accounts, archivedNights());
  const t2 = await readTab();
  again.nights.forEach(function (n) {
    const where = n.stale.slice();
    if (tabStale(t2, n)) where.push('tab');
    if (where.length) report.mismatched.push((n.episodeId || n.file) + ' [' + where.join(',') + ']');
  });
  return report;
}

// recentDays: only pilots with a night started within that many days (the
// daily settle) — then ALL archived nights of those pilots are checked, since a
// late unlock can belong to any of them; null = every pilot ever archived (the
// one-time back-score).
async function readAccounts(nights, recentDays) {
  const cutoff = recentDays ? Date.now() - recentDays * 86400000 : -Infinity;
  const sessions = [];
  nights.forEach(function (n) {
    const s = n.staged.session;
    if (s && sessions.indexOf(s) < 0 && Date.parse(n.staged.window.startedAt) >= cutoff) sessions.push(s);
  });
  const accounts = {};
  for (let i = 0; i < sessions.length; i++) {
    try { accounts[sessions[i]] = await fetchAchievements(sessions[i]); }
    catch (e) { console.error('[rescore-points] ' + sessions[i] + ': ' + (e.message || e) + ' — not re-scored'); }
    // 60 req/min per IP across the fleet; 3 calls per account
    await new Promise(function (r) { setTimeout(r, 4000); });
  }
  return accounts;
}

function summarize(staged) {
  const f = staged.facts;
  return staged.episode_id
    + ' ' + staged.popid
    + ' mining=' + f.event_counts.value.mining
    + ' trading=' + f.event_counts.value.trading
    + ' combat=' + f.event_counts.value.combat
    + ' nav=' + f.event_counts.value.navigation
    + ' session=' + f.event_counts.value.session
    + ' credits=' + f.credits_delta.value
    + ' captains=' + staged.captains_log.windowed;
}

module.exports = {
  V, CATEGORIES,
  loadEpisode, popidFromSession, inWindow, filterWindow,
  deriveCredits, deriveSystems, deriveCombat, deriveCargo, deriveMishaps, derivePoints,
  accountFrom, planPointsRescore,
  assemble, assertSplit, slimEntry,
  creditDeltaForEntry, entriesOf, planRescore, applyRescore,
};

if (require.main === module) {
  const argv = process.argv.slice(2);
  let paths = [];
  let holder = null;
  let rescore = false, rescorePoints = false, apply = false, recentDays = null;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--episode') paths.push(argv[++i]);
    else if (argv[i] === '--holder') holder = argv[++i];
    else if (argv[i] === '--all-three') paths = paths.concat(threeEpisodePaths());
    else if (argv[i] === '--rescore-archive') rescore = true;
    else if (argv[i] === '--rescore-points') rescorePoints = true;
    else if (argv[i] === '--recent') {
      // codex research.31 F8: a bad bound must not silently widen to every pilot
      recentDays = Number(argv[++i]);
      if (!(Number.isFinite(recentDays) && recentDays > 0)) {
        console.error('--recent needs a positive number of days, got ' + JSON.stringify(argv[i]));
        process.exit(2);
      }
    }
    else if (argv[i] === '--apply') apply = true;
    else {
      console.error('unknown arg ' + argv[i]);
      process.exit(2);
    }
  }
  if (rescorePoints) {
    const nights = archivedNights();
    console.log('[rescore-points] scope: ' + (recentDays
      ? 'pilots with a night in the last ' + recentDays + ' day(s), every archived night of each'
      : 'every archived pilot, every night'));
    readAccounts(nights, recentDays).then(function (accounts) {
      const plan = planPointsRescore(accounts, nights);
      printPointsRescore(plan);
      if (!apply) { console.log('[rescore-points] dry-run — no write (add --apply)'); return; }
      return applyPointsRescore(plan).then(function (rep) {
        console.log('[rescore-points] wrote ' + rep.disk + ' archive/intake/feed set(s), ' + rep.tab + ' tab row(s)'
          + (rep.noFeedRow.length ? '; approved but not on the tab: ' + rep.noFeedRow.join(', ') : ''));
        if (rep.mismatched.length) {
          console.error('[rescore-points] READBACK MISMATCH (re-run --apply to finish): ' + rep.mismatched.join(', '));
          process.exit(1);
        }
        console.log('[rescore-points] read back: every copy agrees');
        console.log('[rescore-points] next: node scripts/undockedStandings.js');
      });
    }).catch(function (err) { console.error(err.message || err); process.exit(1); });
    return;
  }
  if (rescore) {
    const plan = planRescore();
    printRescore(plan);
    if (!apply) { console.log('[rescore] dry-run — no write (add --apply)'); process.exit(0); }
    applyRescore(plan).then(function (rep) {
      console.log('[rescore] wrote ' + rep.disk + ' archive/intake/feed set(s), ' + rep.tab + ' tab row(s)'
        + (rep.noFeedRow.length ? '; approved but not on the tab: ' + rep.noFeedRow.join(', ') : ''));
      console.log('[rescore] next: node scripts/undockedStandings.js  (full recompute from the tab)');
    }).catch(function (err) { console.error(err.message || err); process.exit(1); });
    return;
  }
  if (holder && paths.length !== 1) {
    console.error('--holder applies to exactly one --episode');
    process.exit(2);
  }
  if (!paths.length) {
    console.error('usage: --episode <json> | --all-three');
    process.exit(2);
  }
  (async function () {
    for (let i = 0; i < paths.length; i++) {
      const staged = await adaptEpisode(paths[i], holder);
      const out = writeStaged(staged);
      console.log(summarize(staged));
      console.log('  wrote ' + path.relative(ROOT, out));
    }
  })().catch(function (err) {
    console.error(err.message || err);
    process.exit(1);
  });
}
