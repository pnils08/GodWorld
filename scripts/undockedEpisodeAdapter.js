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
const CATEGORIES = ['mining', 'trading', 'combat', 'navigation', 'session'];
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
  if (!hits) return fact(null, { note: 'no credit fields on windowed entries' });
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
    holder: castName(episode.popid),
    session: episode.session,
    window: { startedAt: episode.startedAt, endedAt: episode.endedAt },
    runner: episode.runner,
    source: {
      kind: 'get_action_log',
      categories: CATEGORIES.slice(),
      fetchedAt: new Date().toISOString(),
    },
    facts: {
      credits_delta: deriveCredits(all),
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

async function adaptEpisode(jsonPath) {
  const episode = loadEpisode(jsonPath);
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
};

if (require.main === module) {
  const argv = process.argv.slice(2);
  let paths = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--episode') paths.push(argv[++i]);
    else if (argv[i] === '--all-three') paths = paths.concat(threeEpisodePaths());
    else {
      console.error('unknown arg ' + argv[i]);
      process.exit(2);
    }
  }
  if (!paths.length) {
    console.error('usage: --episode <json> | --all-three');
    process.exit(2);
  }
  (async function () {
    for (let i = 0; i < paths.length; i++) {
      const staged = await adaptEpisode(paths[i]);
      const out = writeStaged(staged);
      console.log(summarize(staged));
      console.log('  wrote ' + path.relative(ROOT, out));
    }
  })().catch(function (err) {
    console.error(err.message || err);
    process.exit(1);
  });
}
