#!/usr/bin/env node
'use strict';

/**
 * undockedHealthcheck.js — UNDOCKED show canary (builder ask 2026-09-08:
 * "so we know if the show isn't running").
 *
 * Two checks, both fail-loud:
 *   1. Clerk key — GET /api/registration-code with SPACEMOLT_CLERK_API_KEY.
 *      401 = the key is dead and NO new pilot can be minted (the 2026-09-08
 *      discovery: the draw-1-era key expired/rotated silently). Any non-200
 *      is a failure worth seeing; the body is never printed beyond a
 *      redacted snippet (key material never leaves this process).
 *   2. Episode recency — newest output/spacemolt-show/episodes/ sidecar must
 *      be < 28h old (the flight runs daily 20:30). Stale = last night's
 *      pipeline broke somewhere upstream of this check.
 *
 * One-shot, crontab-scheduled. Exit 0 = healthy, exit 1 = something is wrong
 * (the log line says which). Log: logs/undocked-health.log.
 */

const fs = require('fs');
const path = require('path');
const { loadClerkKey } = require('./undockedMintAccount');

const ROOT = path.resolve(__dirname, '..');
const EP_DIR = path.join(ROOT, 'output', 'spacemolt-show', 'episodes');
const MAX_EPISODE_AGE_MS = 28 * 60 * 60 * 1000;

function classifyKeyStatus(status) {
  if (status === 200) return 'ok';
  if (status === 401 || status === 403) return 'key-dead';
  return 'server-error';
}

function newestEpisodeMtime(dir) {
  let newest = null;
  let entries;
  try { entries = fs.readdirSync(dir); } catch (_) { return null; }
  for (const f of entries) {
    if (!f.endsWith('.json') || f.startsWith('.')) continue;
    const m = fs.statSync(path.join(dir, f)).mtimeMs;
    if (newest === null || m > newest) newest = m;
  }
  return newest;
}

function episodeFresh(mtimeMs, nowMs) {
  return mtimeMs !== null && (nowMs - mtimeMs) < MAX_EPISODE_AGE_MS;
}

function log(msg) {
  console.log('[undocked-health ' + new Date().toISOString() + '] ' + msg);
}

async function main() {
  let failures = 0;

  const key = loadClerkKey();
  if (!key) {
    log('FAIL clerk-key: SPACEMOLT_CLERK_API_KEY not found in env files — minting impossible');
    failures++;
  } else {
    try {
      const r = await fetch('https://game.spacemolt.com/api/registration-code', {
        headers: { authorization: 'Bearer ' + key, accept: 'application/json' },
      });
      const cls = classifyKeyStatus(r.status);
      if (cls === 'ok') {
        log('ok clerk-key: registration endpoint reachable, key accepted');
      } else {
        log('FAIL clerk-key: ' + r.status + ' (' + cls + ') — pilot minting is DOWN until the key is regenerated on the website');
        failures++;
      }
    } catch (e) {
      log('FAIL clerk-key: request error — ' + (e && e.message || e));
      failures++;
    }
  }

  const newest = newestEpisodeMtime(EP_DIR);
  if (episodeFresh(newest, Date.now())) {
    log('ok episode-recency: latest sidecar ' + Math.round((Date.now() - newest) / 3600000) + 'h old');
  } else {
    log('FAIL episode-recency: ' + (newest === null
      ? 'no episode sidecars at all'
      : 'latest sidecar ' + Math.round((Date.now() - newest) / 3600000) + 'h old (>28h) — last night\'s flight did not land'));
    failures++;
  }

  if (failures) {
    log('UNHEALTHY — ' + failures + ' check(s) failing');
    process.exit(1);
  }
  log('healthy');
}

module.exports = { classifyKeyStatus, newestEpisodeMtime, episodeFresh, MAX_EPISODE_AGE_MS };

if (require.main === module) {
  main().catch(e => { log('FATAL: ' + (e && e.message || e)); process.exit(1); });
}
