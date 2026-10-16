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
const CATEGORIES = ['mining', 'trading', 'mission', 'combat', 'navigation', 'session'];
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
    runner: {
      turns: raw.turns,
      exitCode: raw.exitCode,
      capped: raw.capped,
      toolErrors: raw.toolErrors,
      estCostUsd: raw.estCostUsd,
      tokensIn: raw.tokensIn,
      tokensOut: raw.tokensOut,
      log: raw.log || null,
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
  if (!hits) {
    if (!entries.length) return fact(null, { note: 'no action-log entries in window — unknown' });
    return fact(0, { hits: 0, note: 'entries in window carry no credit event — measured zero' });
  }
  return fact(sum, { hits: hits, basis: basis.slice(0, 40) });
}

function deriveSystems(entries) {
  const seen = [];
  entries.forEach(function (e) {
    const d = e.data || {};
    const v = pickFirst(d, SYSTEM_KEYS);
    if (v == null) return;
    const s = String(v);
    if (seen.indexOf(s) < 0) seen.push(s);
  });
  return fact(seen);
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

function assemble(episode, byCategory, captains) {
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
        if (episode.stall && c.value === 0) c.note = 'runner stall — pilot stopped flying; measured zero';
        return c;
      })(),
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
  const staged = assemble(episode, byCategory, captains);
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
  deriveCredits, deriveSystems, deriveCombat, deriveCargo, deriveMishaps,
  assemble, assertSplit, slimEntry,
  creditDeltaForEntry, entriesOf, planRescore, applyRescore,
};

if (require.main === module) {
  const argv = process.argv.slice(2);
  let paths = [];
  let holder = null;
  let rescore = false, apply = false;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--episode') paths.push(argv[++i]);
    else if (argv[i] === '--holder') holder = argv[++i];
    else if (argv[i] === '--all-three') paths = paths.concat(threeEpisodePaths());
    else if (argv[i] === '--rescore-archive') rescore = true;
    else if (argv[i] === '--apply') apply = true;
    else {
      console.error('unknown arg ' + argv[i]);
      process.exit(2);
    }
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
