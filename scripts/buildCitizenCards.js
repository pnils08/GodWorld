#!/usr/bin/env node
/**
 * buildCitizenCards.js — Compile per-citizen wiki cards into world-data
 * [engine/sheet] — Phase 33.16 + Phase 35.1
 *
 * Reads Simulation_Ledger for base profile, searches bay-tribune for
 * appearance history, and writes/updates a single compiled citizen card
 * to world-data Supermemory container.
 *
 * The GodWorld MCP lookup_citizen tool queries these cards.
 * Cards get richer with each edition as wiki ingest adds memories.
 *
 * Usage:
 *   node scripts/buildCitizenCards.js --dry-run                          # preview new payload shape
 *   node scripts/buildCitizenCards.js --apply                            # write all cards (no wipe)
 *   node scripts/buildCitizenCards.js --apply --wipe-old                 # wipe old un-tagged citizen cards then write
 *   node scripts/buildCitizenCards.js --apply --limit 50                 # first 50 citizens
 *   node scripts/buildCitizenCards.js --apply --tier 1                   # tier 1 only
 *   node scripts/buildCitizenCards.js --apply --name "Beverly Hayes"     # one citizen, no wipe
 *   node scripts/buildCitizenCards.js --apply --name "X" --wipe-old      # one citizen, scoped wipe of that POPID
 *
 * Write payload (post-S182): /v3/documents POST with
 *   containerTags: ['world-data', 'wd-citizens']
 *   metadata: { title, popid, source: 'buildCitizenCards.js' }
 *
 * --wipe-old: enumerate world-data, GET each candidate (no wd-citizens tag
 * yet), match POPID from "(POP-XXXXX)" content header against the citizen
 * set being written, DELETE each match. Other domains (player_truesource,
 * business cards) are not touched.
 *
 * Columns from Simulation_Ledger:
 *   A=POPID, B=First, D=Last, J=Tier, K=RoleType, L=Status, M=BirthYear,
 *   O=LifeHistory (milestones), R=TraitProfile, S=UsageCount, T=Neighborhood,
 *   V=MaritalStatus, W=NumChildren, X=ParentIds, Y=ChildrenIds, Z=WealthLevel,
 *   AA=Income, AC=NetWorth, AF=EducationLevel, AH=CareerStage,
 *   AK=LastPromotionCycle, AS=EmployerBizId, AT=CitizenBio, AU=Gender,
 *   DialState (header-resolved — lands post-engine.31 deploy; absent = no Essence line)
 *
 * Cross-ledger reads (engine.30, S255):
 *   Business_Ledger A:B  — BIZ_ID -> Name (employer renders by name, ID in parens)
 *   Cultural_Ledger A:T  — UniverseLinks POPID -> fame record (Fame line on linked citizens)
 */

require('/root/GodWorld/lib/env');
var fs = require('fs');
var path = require('path');
var https = require('https');
var sheets = require('../lib/sheets');
var coverageAnchors = require('../lib/coverageAnchorRetirements');
var citizenMemory = require('../utilities/citizenMemory'); // engine.31 dial model — describe_/deserialize_ for the Essence line

var API_KEY = process.env.SUPERMEMORY_CC_API_KEY;
var CONTAINER_TAG = 'world-data';
var DOMAIN_TAG = 'wd-citizens';
var API_HOST = 'api.supermemory.ai';
var APPLY = process.argv.includes('--apply');
var WIPE_OLD = process.argv.includes('--wipe-old');
var WIPE_ONLY = process.argv.includes('--wipe-only'); // S183: wipe and exit (no writes) — recovery passes after partial bulk runs
var NO_QUALITY_GATE = process.argv.includes('--no-quality-gate'); // S183: write thin cards too (cold-start fix). Combined with --wipe-old, also wipes already-tagged wd-citizens for a clean rebuild.

// Parse options
var limitArg = process.argv.indexOf('--limit');
var LIMIT = limitArg > 0 ? parseInt(process.argv[limitArg + 1], 10) : 999;

var tierArg = process.argv.indexOf('--tier');
var TIER_FILTER = tierArg > 0 ? parseInt(process.argv[tierArg + 1], 10) : null;

var nameArg = process.argv.indexOf('--name');
var NAME_FILTER = nameArg > 0 ? process.argv[nameArg + 1] : null;

// --batch-size N (default 200) + --batch-pause-sec S (default 60) — chunked
// rebuild to avoid Supermemory rate-limit-as-401 cluster under sustained
// burst (S223 — observed at ~225 successive writes at 500ms inter-write).
var batchSizeArg = process.argv.indexOf('--batch-size');
var BATCH_SIZE = batchSizeArg > 0 ? parseInt(process.argv[batchSizeArg + 1], 10) : 200;
var batchPauseArg = process.argv.indexOf('--batch-pause-sec');
var BATCH_PAUSE_SEC = batchPauseArg > 0 ? parseInt(process.argv[batchPauseArg + 1], 10) : 60;

// --popid-range A:B — inclusive numeric range filter on POPID. Format: 'POP-00802:POP-00951'.
// Used for targeted post-ingest card builds (e.g., S184 female citizen balance).
var rangeArg = process.argv.indexOf('--popid-range');
var POPID_RANGE_LO = null, POPID_RANGE_HI = null;
if (rangeArg > 0) {
  var rangeRaw = String(process.argv[rangeArg + 1] || '').trim();
  var rangeMatch = rangeRaw.match(/^POP-(\d+):POP-(\d+)$/);
  if (!rangeMatch) {
    console.error('[ERROR] --popid-range expects format POP-XXXXX:POP-YYYYY (got: ' + rangeRaw + ')');
    process.exit(1);
  }
  POPID_RANGE_LO = parseInt(rangeMatch[1], 10);
  POPID_RANGE_HI = parseInt(rangeMatch[2], 10);
  if (POPID_RANGE_LO > POPID_RANGE_HI) {
    console.error('[ERROR] --popid-range low > high (' + POPID_RANGE_LO + ' > ' + POPID_RANGE_HI + ')');
    process.exit(1);
  }
}

// --popid X,Y,Z — exact-match list filter on POPID. Format: 'POP-00036,POP-00500'.
// Added engine.27 Phase A (S242): wd-cards daemon detects scattered changed POPIDs
// (not contiguous ranges), so it dispatches a single targeted rebuild with the
// exact set rather than N per-ID spawns each re-reading the full ledger.
var popidArg = process.argv.indexOf('--popid');
var POPID_SET = null;
if (popidArg > 0) {
  POPID_SET = new Set(
    String(process.argv[popidArg + 1] || '')
      .split(',')
      .map(function (s) { return s.trim(); })
      .filter(Boolean)
  );
  if (POPID_SET.size === 0) {
    console.error('[ERROR] --popid expects a comma-separated POPID list (e.g. POP-00036,POP-00500)');
    process.exit(1);
  }
}

// Wipe-old GET pass tuning
var WIPE_LIST_PAGE_SIZE = 100;
var WIPE_LIST_SLEEP_MS = 200;
var WIPE_GET_CONCURRENCY = 3;
var WIPE_GET_EMPTY_RETRY = 2;
var WIPE_LIST_RETRIES = 3;
var WIPE_INDEXING_SLEEP_MS = 30000;

if (!API_KEY) {
  console.error('[ERROR] SUPERMEMORY_CC_API_KEY not set');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════
// SUPERMEMORY SEARCH
// ═══════════════════════════════════════════════════════════════════════════

function searchSupermemory(query, container) {
  // Single-arg Promise constructor — searchSupermemory intentionally never
  // rejects; all error paths (parse error, request error, timeout) resolve
  // with [] so callers don't need .catch. Pre-fix had `function(resolve, reject)`
  // with unused reject param.
  return new Promise(function(resolve) {
    var payload = JSON.stringify({
      q: query,
      containerTag: container,
      searchMode: 'hybrid',
      limit: 5
    });

    var options = {
      hostname: API_HOST,
      path: '/v4/search',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + API_KEY,
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    var req = https.request(options, function(res) {
      var data = '';
      res.on('data', function(chunk) { data += chunk; });
      res.on('end', function() {
        try {
          var parsed = JSON.parse(data);
          resolve(parsed.results || []);
        } catch (e) {
          resolve([]);
        }
      });
    });

    req.on('error', function() { resolve([]); });
    req.setTimeout(10000, function() { req.destroy(); resolve([]); });
    req.write(payload);
    req.end();
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// SUPERMEMORY API HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function smRequest(method, apiPath, body) {
  return new Promise(function(resolve, reject) {
    var payload = body ? JSON.stringify(body) : null;
    var headers = {
      'Authorization': 'Bearer ' + API_KEY,
      'Accept': 'application/json'
    };
    if (payload) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(payload);
    }
    var req = https.request({
      hostname: API_HOST,
      path: apiPath,
      method: method,
      headers: headers
    }, function(res) {
      var data = '';
      res.on('data', function(c) { data += c; });
      res.on('end', function() {
        var parsed = null;
        try { parsed = data ? JSON.parse(data) : null; } catch (e) { parsed = data; }
        resolve({ status: res.statusCode, body: parsed });
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, function() { req.destroy(); reject(new Error('Timeout')); });
    if (payload) req.write(payload);
    req.end();
  });
}

function smSleep(ms) { return new Promise(function(r) { setTimeout(r, ms); }); }

// ═══════════════════════════════════════════════════════════════════════════
// WRITE MEMORY TO WORLD-DATA — /v3/documents with dual tags + metadata
//
// Retry policy (S197 BUNDLE-F revision of S182 hardening):
//   - 5xx (server error) → retry up to WRITE_MAX_RETRIES (transient).
//   - 429 (rate limit) → retry with longer backoff (transient).
//   - 401 (unauthorized) → FAIL FAST. Pre-S197, 401 was retried 3× at 8s
//     based on an S182 observation that Supermemory sometimes surfaced
//     rate-limit as 401 instead of 429. C93 bulk run (G-P24) burned ~32s
//     per failed card across 575 attempts before kill — most/all of those
//     32s windows were waste because real 401s don't recover with retry.
//     If a future bulk write surfaces rate-limit-as-401, the right path
//     is fixing it upstream (Supermemory-side or by better backoff
//     spacing), not papering over with retries that hide auth bugs.
//   - 4xx (other) → FAIL FAST (permanent, retry won't help).
//
// authProbe() runs once before any bulk write (in applyCitizens) and
// validates the API key against /v3/documents/list. A 401 there means
// the credential is bad — abort before burning 575 cards' worth of time.
// ═══════════════════════════════════════════════════════════════════════════

var WRITE_MAX_RETRIES = 3;
var WRITE_RETRY_SLEEP_MS = 8000;

async function authProbe() {
  // Cheapest valid POST that exercises auth + write surface. /v3/documents/list
  // returns 200 with empty content for a valid key + unused tag combination,
  // and 401 for a bad key.
  var r = await smRequest('POST', '/v3/documents/list', { limit: 1, page: 1 });
  return r.status;
}

// S247 (G-P-NEW2 part 2 / BUNDLE-401-COHORT): pure decision for an ambiguous 401.
// A Supermemory 401 on a write is ambiguous — real auth failure OR rate-limit
// surfaced as 401 under sustained bulk load (the C93/C95 cohort: 100/448 cards
// failed 401 while 348 SUCCEEDED with the SAME key in the SAME run → key valid →
// rate-limit, not auth). writeMemory probes the key against /v3/documents/list and
// passes the probe status here. Separated from the retry loop so the
// rate-limit-vs-auth branch is unit-testable without HTTP. Returns the action:
//   'retry-rate-limit'          probe 200 (key valid) + attempts remain → cooldown-retry
//   'fail-rate-limit-exhausted' probe 200 but retries exhausted → loud, recoverable by re-run
//   'fail-auth'                 probe != 200 → real auth failure → fail-fast (S197 concern)
function classify401Action(probeStatus, attempt, maxRetries) {
  if (probeStatus === 200) {
    return attempt < maxRetries ? 'retry-rate-limit' : 'fail-rate-limit-exhausted';
  }
  return 'fail-auth';
}

async function writeMemory(content, citizen, popidIdMap) {
  var meta = {
    title: citizen.first + ' ' + citizen.last,
    popid: citizen.popId,
    source: 'buildCitizenCards.js'
  };
  var body = {
    content: content,
    containerTags: [CONTAINER_TAG, DOMAIN_TAG],
    metadata: meta
  };
  // PATCH-if-exists / POST-if-new (one doc per POPID invariant).
  // popidIdMap built once at run-start by buildPopidIdMap; keeps oldest doc
  // id when collisions exist for stability across rebuilds.
  var existing = popidIdMap && popidIdMap.get(citizen.popId);
  var method = existing ? 'PATCH' : 'POST';
  var apiPath = existing ? '/v3/documents/' + existing.id : '/v3/documents';
  for (var attempt = 0; attempt <= WRITE_MAX_RETRIES; attempt++) {
    var r = await smRequest(method, apiPath, body);
    if (r.status >= 200 && r.status < 300) {
      return { status: r.status, id: r.body && r.body.id, op: method };
    }
    // S247: 401 is ambiguous (real auth vs rate-limit-as-401). Probe the key,
    // then classify (implements the authProbe retest the S197 comment deferred).
    // A probe error means we cannot confirm key validity → fail-fast (conservative,
    // preserves the S197 concern that real-401 retries waste 32s/card).
    if (r.status === 401) {
      var probeStatus;
      try {
        probeStatus = await authProbe();
      } catch (e) {
        throw new Error('HTTP 401 on ' + method + ' ' + apiPath + '; authProbe errored (' +
          e.message + ') — cannot confirm key validity, refusing to retry.');
      }
      var action = classify401Action(probeStatus, attempt, WRITE_MAX_RETRIES);
      if (action === 'retry-rate-limit') {
        console.log('  [retry] ' + method + ' got 401 but authProbe=200 (rate-limit-as-401); sleeping ' +
          (WRITE_RETRY_SLEEP_MS / 1000) + 's, attempt ' + (attempt + 2) + '/' + (WRITE_MAX_RETRIES + 1));
        await smSleep(WRITE_RETRY_SLEEP_MS);
        continue;
      }
      if (action === 'fail-rate-limit-exhausted') {
        throw new Error('HTTP 401 (rate-limit-as-401, authProbe=200) on ' + method + ' ' + apiPath +
          ' — exhausted ' + (WRITE_MAX_RETRIES + 1) + ' attempts; re-run after cooldown to recover this card.');
      }
      // fail-auth: probe != 200 → real auth failure
      throw new Error('HTTP 401 (auth, authProbe=' + probeStatus + ') — refusing to retry. Body: ' +
        (typeof r.body === 'string' ? r.body : JSON.stringify(r.body)));
    }
    // Transient retries: 429 (rate limit) + 5xx (server).
    if ((r.status === 429 || r.status >= 500) && attempt < WRITE_MAX_RETRIES) {
      console.log('  [retry] ' + method + ' got ' + r.status + '; sleeping ' +
        (WRITE_RETRY_SLEEP_MS / 1000) + 's, attempt ' + (attempt + 2) +
        '/' + (WRITE_MAX_RETRIES + 1));
      await smSleep(WRITE_RETRY_SLEEP_MS);
      continue;
    }
    throw new Error('HTTP ' + r.status + ' on ' + method + ' ' + apiPath + ': ' + (typeof r.body === 'string' ? r.body : JSON.stringify(r.body)));
  }
  throw new Error('writeMemory exhausted ' + (WRITE_MAX_RETRIES + 1) + ' attempts');
}

// ═══════════════════════════════════════════════════════════════════════════
// POPID→ID MAP — enumerate existing wd-citizens to enable PATCH-in-place writes
// ═══════════════════════════════════════════════════════════════════════════
// Built once per APPLY run. writeMemory uses it to decide PATCH (existing
// POPID) vs POST (new POPID). When a POPID has multiple docs (legacy
// duplicates), keeps the OLDEST id for stability across rebuilds.
async function buildPopidIdMap() {
  console.log('[buildCitizenCards] enumerating wd-citizens for POPID→id map…');
  var map = new Map();
  var collisions = 0;
  var page = 1;
  while (true) {
    var r = await smRequest('POST', '/v3/documents/list', {
      containerTags: [DOMAIN_TAG], limit: 200, page: page
    });
    if (r.status !== 200) throw new Error('POPID-map list failed at page ' + page + ': ' + r.status);
    var mems = (r.body && r.body.memories) || [];
    for (var i = 0; i < mems.length; i++) {
      var m = mems[i];
      var pop = m.metadata && m.metadata.popid;
      if (!pop) continue;
      var existing = map.get(pop);
      if (!existing) { map.set(pop, { id: m.id, createdAt: m.createdAt }); }
      else {
        collisions++;
        // Keep oldest for stability
        if (new Date(m.createdAt) < new Date(existing.createdAt)) {
          map.set(pop, { id: m.id, createdAt: m.createdAt });
        }
      }
    }
    if (mems.length < 200) break;
    page++;
    if (page > 20) throw new Error('POPID-map pagination overflow (>20 pages)');
  }
  console.log('[buildCitizenCards] POPID→id map: ' + map.size + ' unique POPIDs (' + collisions + ' collisions observed, oldest kept)');
  return map;
}

// ═══════════════════════════════════════════════════════════════════════════
// WIPE-OLD — POPID-content-scoped DELETE of un-tagged citizen cards
// ═══════════════════════════════════════════════════════════════════════════
// Filter rationale: after the world-data unified ingest plan landed, citizen
// cards write with ['world-data', 'wd-citizens']; existing pre-retrofit cards
// only have 'world-data'. We want to wipe the OLD un-tagged cards before
// writing fresh ones — but world-data also contains player_truesource (27)
// and a seed business-card (1) sharing the sole-world-data tag, which other
// retrofits (R2, W1) own. So wipe-old uses a POPID-content match scoped to
// the citizen set we're about to write: only DELETEs docs whose content
// header is "(POP-XXXXX)" AND whose POPID is in the target set AND that
// don't already carry the 'wd-citizens' tag.
//
// Behavior:
//   full --apply --wipe-old:    target = all 1,573 citizens → wipes 1,573
//   --apply --name "X" --wipe-old: target = {X's popId}     → wipes only X
//   player_truesource / business-card / engine-state dumps: untouched

function popIdFromContent(content) {
  if (!content) return null;
  var m = content.match(/\(POP-(\d{4,})\)/);
  return m ? 'POP-' + m[1] : null;
}

async function listPageWithRetry(page, retries) {
  var r = await smRequest('POST', '/v3/documents/list', { limit: WIPE_LIST_PAGE_SIZE, page: page });
  var attempt = 0;
  while (attempt < retries && r.status !== 200) {
    console.log('  [retry] list page ' + page + ' returned ' + r.status + '; sleeping 5s');
    await smSleep(5000);
    r = await smRequest('POST', '/v3/documents/list', { limit: WIPE_LIST_PAGE_SIZE, page: page });
    attempt++;
  }
  return r;
}

async function getDocWithRetry(id, retries) {
  var r = await smRequest('GET', '/v3/documents/' + id, null);
  var attempt = 0;
  while (attempt < retries && r.status === 200 && r.body && (!r.body.content || r.body.content.length === 0)) {
    await smSleep(500);
    r = await smRequest('GET', '/v3/documents/' + id, null);
    attempt++;
  }
  return r;
}

async function wipeOldCitizenCards(citizens) {
  console.log('\n[wipe-old] enumerating world-data via /v3/documents/list');
  var probe = await listPageWithRetry(1, WIPE_LIST_RETRIES);
  if (probe.status !== 200) {
    throw new Error('wipe-old: list page 1 returned ' + probe.status);
  }
  var totalPages = probe.body.pagination.totalPages;
  var ids = [];
  for (var page = 1; page <= totalPages; page++) {
    var r = page === 1 ? probe : await listPageWithRetry(page, WIPE_LIST_RETRIES);
    if (r.status !== 200) {
      throw new Error('wipe-old: list page ' + page + ' returned ' + r.status + ' after retries — aborting');
    }
    var items = r.body.memories || [];
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      var tags = Array.isArray(it.containerTags) ? it.containerTags : [];
      if (!tags.includes(CONTAINER_TAG)) continue;
      // Idempotency filter: skip docs already carrying our domain tag so
      // re-runs don't target previous writes. Disabled when --no-quality-gate
      // is set so the flag effectively means "rebuild from scratch": wipe
      // all citizen-shape docs (tagged or not) and re-write all matched
      // citizens, including thin ones that previously hit the line-515 gate.
      if (!NO_QUALITY_GATE && tags.includes(DOMAIN_TAG)) continue;
      ids.push(it.id);
    }
    if (page < totalPages) await smSleep(WIPE_LIST_SLEEP_MS);
  }
  console.log('[wipe-old] world-data candidates (no wd-citizens tag yet): ' + ids.length);

  var allowedPopIds = {};
  citizens.forEach(function(c) { allowedPopIds[c.popId] = true; });
  console.log('[wipe-old] target POPID set size: ' + Object.keys(allowedPopIds).length);

  console.log('[wipe-old] GET pass to extract POPID per doc (concurrency=' + WIPE_GET_CONCURRENCY + ')');
  var matches = [];
  var emptyAfterRetry = 0;
  var fetched = 0;
  for (var i2 = 0; i2 < ids.length; i2 += WIPE_GET_CONCURRENCY) {
    var batch = ids.slice(i2, i2 + WIPE_GET_CONCURRENCY);
    var results = await Promise.all(batch.map(function(id) {
      return getDocWithRetry(id, WIPE_GET_EMPTY_RETRY).then(function(r) { return { id: id, r: r }; });
    }));
    for (var j = 0; j < results.length; j++) {
      fetched++;
      var rr = results[j].r;
      if (rr.status !== 200 || !rr.body) continue;
      var content = rr.body.content || '';
      if (content.length === 0) { emptyAfterRetry++; continue; }
      var popId = popIdFromContent(content);
      if (popId && allowedPopIds[popId]) {
        matches.push({ id: results[j].id, popId: popId });
      }
    }
    if (fetched % 200 === 0 || (i2 + WIPE_GET_CONCURRENCY) >= ids.length) {
      console.log('  GET ' + fetched + '/' + ids.length + ' — wipe matches so far: ' + matches.length + ' | empty-after-retry: ' + emptyAfterRetry);
    }
  }
  if (emptyAfterRetry > 0) {
    throw new Error('wipe-old: ' + emptyAfterRetry + ' docs returned empty content even after retry. Refusing to apply with incomplete data — re-run after rate-limit cooldown.');
  }
  console.log('[wipe-old] matches to DELETE: ' + matches.length);

  console.log('[wipe-old] DELETE pass');
  var deleted = 0;
  var failed = 0;
  for (var k = 0; k < matches.length; k++) {
    var ok = false;
    var lastStatus = null;
    // S183: 4-attempt retry — 409 (indexing settle, 20s) and 401/429 (rate-limit, 8s).
    // Original 409-only retry lost ~70% of DELETEs on R2 first attempt; this
    // pattern recovered the substrate cleanly.
    for (var attempt = 0; attempt < 4 && !ok; attempt++) {
      var del = await smRequest('DELETE', '/v3/documents/' + matches[k].id, null);
      lastStatus = del.status;
      ok = del.status === 204 || del.status === 200;
      if (ok) break;
      if (del.status === 409) {
        await smSleep(20000);
      } else if (del.status === 401 || del.status === 429) {
        await smSleep(WRITE_RETRY_SLEEP_MS);
      } else {
        break; // non-recoverable
      }
    }
    if (ok) deleted++; else { failed++; if (failed <= 5) console.log('    [DEL FAIL] id=' + matches[k].id + ' last_status=' + lastStatus); }
    if ((k + 1) % 100 === 0 || k === matches.length - 1) {
      console.log('  DELETE ' + (k + 1) + '/' + matches.length + ' — ok=' + deleted + ' failed=' + failed);
    }
    await smSleep(200);
  }
  console.log('[wipe-old] DELETE results: ' + deleted + ' ok / ' + failed + ' failed');
  return { candidates: ids.length, matched: matches.length, deleted: deleted, failed: failed };
}

// ═══════════════════════════════════════════════════════════════════════════
// BUILD CITIZEN CARD
// ═══════════════════════════════════════════════════════════════════════════

// ── engine.30 deterministic formatters (S255) ────────────────────────────────
// Pure functions over existing ledger columns. No prose generation, no writes.

// Employer sentinels that aren't Business_Ledger BIZ-IDs (live counts S255:
// 155 SELF_EMPLOYED, 7 SPORTS_OTHER; 496 real BIZ-IDs all align, 0 orphans).
var EMPLOYER_SENTINELS = {
  'SELF_EMPLOYED': 'Self-employed',
  'SPORTS_OTHER': 'Sports (other)'
};

// WealthLevel 1-10 -> coarse label. Deterministic band map, same spirit as the
// dial band layer: the number is the data, the label is the readable face.
function wealthLabel_(level) {
  var n = parseInt(level, 10);
  if (!n || n < 1) return null;
  var label = n <= 2 ? 'struggling' : n <= 4 ? 'getting by' : n <= 6 ? 'comfortable' : n <= 8 ? 'well-off' : 'wealthy';
  return n + '/10 (' + label + ')';
}

// EducationLevel ledger tokens -> readable. Unmapped tokens pass through as-is
// (legacy values like "High School"/"Elementary" are already readable).
var EDUCATION_LABELS = {
  'hs-diploma': 'high school diploma',
  'trade-cert': 'trade certificate',
  'associates': "associate's degree",
  'bachelors': "bachelor's degree",
  'masters': "master's degree",
  'doctorate': 'doctorate'
};

function formatMoney_(raw) {
  var n = parseInt(String(raw).replace(/[^0-9-]/g, ''), 10);
  if (isNaN(n)) return null;
  return '$' + n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// ParentIds/ChildrenIds cells are JSON arrays ('["POP-00005","POP-00594"]'),
// sometimes empty string. Corrupt -> [] (formatter never throws on a cell).
function parseIdList_(raw) {
  var s = (raw || '').trim();
  if (!s || s === '[]') return [];
  try {
    var arr = JSON.parse(s);
    return Array.isArray(arr) ? arr.filter(Boolean) : [];
  } catch (e) { return []; }
}

// Milestone classes worth carrying on the card. LifeHistory(O) also holds
// [Daily]/[Background]/[Career]/[Relationship] texture — that ages into the
// dial fold (engine.31), not the card. These are the dated life anchors that
// must survive the .31 deploy log-clear (ROLLOUT engine.30 dependency note).
var MILESTONE_RE = /\[(Wedding|Marriage|Divorce|Birth|Death|Retirement|Promotion)\]/i;

// Archive Timestamp normalizer — the tab carries two formats ("2026-06-01 23:35"
// engine-stamped, "11/30/2025 3:27:23" legacy). Returns "YYYY-MM-DD" or ''.
function archiveDate_(ts) {
  var s = String(ts || '').trim();
  var iso = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];
  var us = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (us) return us[3] + '-' + ('0' + us[1]).slice(-2) + '-' + ('0' + us[2]).slice(-2);
  return '';
}

// LifeHistory uses both real newlines and literal '\n' two-char sequences
// (observed live: POP-00331). Split on both.
function extractMilestones_(lifeHistory) {
  if (!lifeHistory) return [];
  var lines = String(lifeHistory).split(/\\n|\n/);
  var out = [];
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (!line || !MILESTONE_RE.test(line)) continue;
    // Strip clock time, keep the date: "2026-06-01 23:35 — [Retirement] ..." -> "2026-06-01 [Retirement] ..."
    out.push(line.replace(/^(\d{4}-\d{2}-\d{2})\s+\d{2}:\d{2}\s*—\s*/, '$1 '));
  }
  return out;
}

// DialState (JSON {base,streak}, engine.31) -> "driven, warm, often out".
// Absent/corrupt/all-neutral -> null (no Essence line). Uses the real dial
// model (citizenMemory describe_), not a duplicate band map — the card can
// never drift from the engine's read of the same cell.
function dialEssence_(dialStateRaw) {
  var s = (dialStateRaw || '').trim();
  if (!s) return null;
  var parsed;
  try { parsed = JSON.parse(s); } catch (e) { return null; }
  if (!parsed || typeof parsed !== 'object' || !parsed.base) return null;
  var c = citizenMemory.deserialize_(parsed);
  var desc = citizenMemory.describe_(c);
  return desc || 'even-keeled, unremarkable'; // all dials mid-band — by design the quiet middle
}

async function buildCard(citizen, appearances, refs) {
  refs = refs || {};
  var bizNames = refs.bizNames || {};
  var fameByPopId = refs.fameByPopId || {};
  var lines = [];

  // Header — identity-level fields. Gender included so Mara's canon-fidelity
  // checks can verify pronoun/gender claims against ledger truth.
  lines.push(citizen.first + ' ' + citizen.last + ' (' + citizen.popId + ')');
  var headerParts = [
    'Neighborhood: ' + (citizen.neighborhood || 'Unknown'),
    'Role: ' + (citizen.role || 'Unknown'),
    'Tier: ' + citizen.tier,
    'Birth: ' + (citizen.birthYear || '?')
  ];
  if (citizen.gender) headerParts.push('Gender: ' + citizen.gender);
  // Status only when it carries information (engine.30): Active is the default
  // and stays implicit; Retired/deceased/pending change how the citizen can be used.
  if (citizen.status && citizen.status.toLowerCase() !== 'active') {
    headerParts.push('Status: ' + citizen.status);
  }
  lines.push(headerParts.join(' | '));

  // Employer — render by Business_Ledger name with the ID kept for cross-
  // reference; sentinels (SELF_EMPLOYED etc.) render readable; an unmapped
  // BIZ-ID renders raw so misalignment stays visible, never silently dropped.
  if (citizen.employerBizId) {
    var emp = citizen.employerBizId;
    if (EMPLOYER_SENTINELS[emp]) {
      lines.push('Employer: ' + EMPLOYER_SENTINELS[emp]);
    } else if (bizNames[emp]) {
      lines.push('Employer: ' + bizNames[emp] + ' (' + emp + ')');
    } else {
      lines.push('Employer: ' + emp);
    }
  }

  // Life line (engine.30) — the structured life facts the card always had
  // access to but never stated: marital status, children, parents.
  var lifeParts = [];
  if (citizen.maritalStatus) lifeParts.push(citizen.maritalStatus);
  var childIds = parseIdList_(citizen.childrenIds);
  var parentIds = parseIdList_(citizen.parentIds);
  var numChildren = parseInt(citizen.numChildren || '0', 10) || 0;
  if (childIds.length > 0) {
    lifeParts.push(childIds.length + (childIds.length === 1 ? ' child (' : ' children (') + childIds.join(', ') + ')');
  } else if (numChildren > 0 && parentIds.length === 0) {
    // Guard: a row with parents but no ChildrenIds can carry an inherited
    // sibling count (live: POP-00595) — never claim children for a child.
    lifeParts.push(numChildren + (numChildren === 1 ? ' child' : ' children'));
  }
  if (parentIds.length > 0) lifeParts.push('parents: ' + parentIds.join(', '));
  if (lifeParts.length > 0) lines.push('Life: ' + lifeParts.join(' | '));

  // Work line (engine.30) — career stage, promotion, education, income, wealth.
  var workParts = [];
  if (citizen.careerStage) {
    var careerBit = citizen.careerStage;
    var promo = parseInt(citizen.lastPromotionCycle || '0', 10) || 0;
    if (promo > 0) careerBit += ', promoted C' + promo;
    workParts.push(careerBit);
  }
  if (citizen.educationLevel) {
    workParts.push('education: ' + (EDUCATION_LABELS[citizen.educationLevel] || citizen.educationLevel));
  }
  var incomeStr = formatMoney_(citizen.income);
  if (incomeStr) workParts.push('income ' + incomeStr + '/yr');
  var wealthStr = wealthLabel_(citizen.wealthLevel);
  if (wealthStr) workParts.push('wealth ' + wealthStr);
  var netWorthStr = formatMoney_(citizen.netWorth);
  if (netWorthStr) workParts.push('net worth ' + netWorthStr);
  if (workParts.length > 0) lines.push('Work: ' + workParts.join(' | '));

  // Essence line (engine.30, dial-aware) — renders the 8-dial bands via the
  // real dial model once engine.31's deploy lands DialState; absent today -> no
  // line. The card stays correct across the deploy without re-touching this script.
  var essence = dialEssence_(citizen.dialState);
  if (essence) lines.push('Essence: ' + essence);

  // Trait profile
  if (citizen.traitProfile) {
    lines.push('Traits: ' + citizen.traitProfile);
  }

  // Fame line (engine.30) — threads Cultural_Ledger into the card for the
  // POPID-linked cultural figures (9 live), so fame is visible where agents
  // actually look a citizen up. Unlinked Cultural_Ledger rows are unaffected.
  var fame = fameByPopId[citizen.popId];
  if (fame) {
    var fameParts = [fame.category + (fame.domain ? ' (' + fame.domain + ')' : '')];
    if (fame.score) fameParts.push('score ' + fame.score);
    if (fame.trend) fameParts.push('trend ' + fame.trend);
    if (fame.mediaCount) fameParts.push(fame.mediaCount + ' media mentions');
    if (fame.lastSeen) fameParts.push('last seen C' + fame.lastSeen);
    lines.push('Fame: ' + fameParts.join(', '));
  }

  // Bio
  if (citizen.bio) {
    lines.push('Bio: ' + citizen.bio);
  }

  if (citizen.usageCount && parseInt(citizen.usageCount, 10) > 0) {
    lines.push('Usage: ' + citizen.usageCount + ' mentions');
  }

  // Milestones (engine.30) — dated life anchors from LifeHistory_Archive
  // (post-.31-deploy home of all pre-deploy history) + LifeHistory(O) (events
  // since). Exact-string dedupe covers the append-then-clear window. The card
  // is the preservation surface: end-state lives in columns, the WHEN lives here.
  var archMs = (refs.archMilestones && refs.archMilestones[citizen.popId]) || [];
  var oMs = extractMilestones_(citizen.lifeHistory);
  var milestones = archMs.concat(oMs.filter(function (m) { return archMs.indexOf(m) < 0; }));
  if (milestones.length > 0) {
    lines.push('');
    lines.push('MILESTONES:');
    for (var mi = 0; mi < milestones.length; mi++) {
      lines.push('- ' + milestones[mi]);
    }
  }

  // Appearances from bay-tribune
  if (appearances.length > 0) {
    lines.push('');
    lines.push('APPEARANCES:');
    for (var i = 0; i < appearances.length && i < 8; i++) {
      var a = appearances[i];
      var memText = (a.memory || '').substring(0, 200);
      lines.push('- ' + memText);
    }
  }

  // S235 G-PR8e — Coverage convention block for editorially-retired anchors.
  // Surfaces NEWSROOM_MEMORY §Standing Editorial Conventions retirement
  // inline in the wd-citizens card so Mara + downstream agents reading the
  // card (not just sift Step 4 reading NEWSROOM_MEMORY) see the convention
  // alongside identity/role/bio. POP-00772 Beverly Hayes is the first entry.
  var conventionLines = coverageAnchors.renderConventionBlock(citizen.popId);
  for (var cl = 0; cl < conventionLines.length; cl++) {
    lines.push(conventionLines[cl]);
  }

  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('[buildCitizenCards] Mode: ' + (APPLY ? 'APPLY' : 'DRY-RUN'));
  if (TIER_FILTER) console.log('[buildCitizenCards] Tier filter: ' + TIER_FILTER);
  if (NAME_FILTER) console.log('[buildCitizenCards] Name filter: ' + NAME_FILTER);
  if (LIMIT < 999) console.log('[buildCitizenCards] Limit: ' + LIMIT);
  console.log('');

  // S197 BUNDLE-F (G-P24): pre-flight auth probe in APPLY mode. C93 burned
  // ~32s per failed card across 575 attempts before kill because writeMemory
  // retried 401s 3 times at 8s each. With fail-fast 401 in writeMemory, an
  // auth bug now surfaces on first card — but the probe surfaces it BEFORE
  // any cards run, saving the time it would take to read the sheet + build
  // the first card payload.
  var popidIdMap = null;
  if (APPLY) {
    console.log('[buildCitizenCards] auth probe…');
    var probeStatus = await authProbe();
    if (probeStatus === 401) {
      console.error('[FATAL] Auth probe returned 401. SUPERMEMORY_CC_API_KEY is invalid or has no write scope on this org. Aborting before bulk write.');
      process.exit(1);
    }
    if (probeStatus !== 200) {
      console.error('[WARN] Auth probe returned ' + probeStatus + ' (expected 200). Proceeding but expect failures.');
    } else {
      console.log('[buildCitizenCards] auth probe OK (200).');
    }
    console.log('');
    popidIdMap = await buildPopidIdMap();
    console.log('');
  }

  // Read Simulation_Ledger. Range extends past AU so a post-engine.31 deploy
  // DialState column (header-resolved below) is picked up without a code change.
  var client = await sheets.getClient();
  var spreadsheetId = process.env.GODWORLD_SHEET_ID;

  var res = await client.spreadsheets.values.get({
    spreadsheetId: spreadsheetId,
    range: 'Simulation_Ledger!A:BZ'
  });

  var rows = res.data.values || [];
  if (rows.length < 2) {
    console.error('No data in Simulation_Ledger');
    process.exit(1);
  }

  console.log('[buildCitizenCards] Ledger rows: ' + (rows.length - 1));

  // DialState is header-resolved (engine.31 adds it on deploy); absent = -1,
  // cards simply carry no Essence line until it lands.
  var dialStateIdx = rows[0].indexOf('DialState');
  console.log('[buildCitizenCards] DialState column: ' + (dialStateIdx >= 0 ? 'present (idx ' + dialStateIdx + ')' : 'absent (pre-engine.31 — no Essence lines)'));

  // Cross-ledger reference maps (engine.30) — one read each.
  // Business_Ledger: BIZ_ID -> Name, so employers render by name.
  var bizNames = {};
  try {
    var bizRes = await client.spreadsheets.values.get({
      spreadsheetId: spreadsheetId,
      range: 'Business_Ledger!A:B'
    });
    var bizRows = bizRes.data.values || [];
    for (var bi = 1; bi < bizRows.length; bi++) {
      var bId = (bizRows[bi][0] || '').trim();
      var bName = (bizRows[bi][1] || '').trim();
      if (bId && bName) bizNames[bId] = bName;
    }
  } catch (e) {
    console.error('[WARN] Business_Ledger read failed (' + e.message + ') — employers will render as raw IDs.');
  }
  console.log('[buildCitizenCards] Business names loaded: ' + Object.keys(bizNames).length);

  // Cultural_Ledger: UniverseLinks POPID -> fame record, so linked cultural
  // figures (9 live at S255) carry their fame on the citizen card.
  // Headers: ...RoleType(3), FameCategory(4), CulturalDomain(5), UniverseLinks(7),
  // LastSeenCycle(9), MediaCount(10), FameScore(11), TrendTrajectory(12).
  var fameByPopId = {};
  try {
    var cultRes = await client.spreadsheets.values.get({
      spreadsheetId: spreadsheetId,
      range: 'Cultural_Ledger!A:T'
    });
    var cultRows = cultRes.data.values || [];
    for (var fi = 1; fi < cultRows.length; fi++) {
      var cr = cultRows[fi];
      var links = (cr[7] || '').trim();
      var popMatches = links.match(/POP-\d+/g);
      if (!popMatches) continue;
      var fameRec = {
        category: (cr[4] || '').trim() || (cr[3] || '').trim() || 'cultural figure',
        domain: (cr[5] || '').trim(),
        lastSeen: (cr[9] || '').trim(),
        mediaCount: (cr[10] || '').trim(),
        score: (cr[11] || '').trim(),
        trend: (cr[12] || '').trim()
      };
      for (var pm = 0; pm < popMatches.length; pm++) {
        fameByPopId[popMatches[pm]] = fameRec;
      }
    }
  } catch (e) {
    console.error('[WARN] Cultural_Ledger read failed (' + e.message + ') — cards will carry no Fame lines.');
  }
  console.log('[buildCitizenCards] Cultural figures linked to POPIDs: ' + Object.keys(fameByPopId).length);

  // LifeHistory_Archive: POPID -> dated milestone lines. The engine.31 A-style
  // deploy moves every LifeHistory(O) entry to this cold store and clears O —
  // the card must read BOTH sources or the deploy clear silently drops every
  // pre-deploy milestone (the exact loss engine.30 exists to prevent).
  // Headers: Timestamp(0)/POPID(1)/Name(2)/EventTag(3)/EventText(4)/Neighborhood(5)/Cycle(6).
  var archMilestonesByPop = {};
  try {
    var archRes = await client.spreadsheets.values.get({
      spreadsheetId: spreadsheetId,
      range: 'LifeHistory_Archive!A:G'
    });
    var archRows = archRes.data.values || [];
    var ARCH_MILESTONE_RE = /^(Wedding|Marriage|Divorce|Birth|Death|Retirement|Promotion)$/i;
    for (var ari = 1; ari < archRows.length; ari++) {
      var arow = archRows[ari];
      var aPop = (arow[1] || '').trim();
      var aTag = (arow[3] || '').trim();
      if (!aPop || !ARCH_MILESTONE_RE.test(aTag)) continue;
      var aDate = archiveDate_(arow[0]);
      // Some archived EventText blobs carry ride-along events joined by
      // literal '\n' two-char sequences (pre-archive O cells used both real
      // and literal newlines; the compressor parser only splits on real ones).
      // The milestone is the first segment — the riders are texture-class.
      var aText = (arow[4] || '').trim().split('\\n')[0].trim();
      var aLine = (aDate ? aDate + ' ' : '') + '[' + aTag + '] ' + aText;
      (archMilestonesByPop[aPop] = archMilestonesByPop[aPop] || []).push(aLine);
    }
  } catch (e) {
    console.error('[WARN] LifeHistory_Archive read failed (' + e.message + ') — cards will carry only LifeHistory(O) milestones.');
  }
  console.log('[buildCitizenCards] Archive milestone citizens: ' + Object.keys(archMilestonesByPop).length);

  var cardRefs = { bizNames: bizNames, fameByPopId: fameByPopId, archMilestones: archMilestonesByPop };

  // Column indices (0-based): A=0 POPID, B=1 First, D=3 Last, J=9 Tier,
  // K=10 RoleType, L=11 Status, M=12 BirthYear, O=14 LifeHistory,
  // R=17 TraitProfile, S=18 UsageCount, T=19 Neighborhood, V=21 MaritalStatus,
  // W=22 NumChildren, X=23 ParentIds, Y=24 ChildrenIds, Z=25 WealthLevel,
  // AA=26 Income, AC=28 NetWorth, AF=31 EducationLevel, AH=33 CareerStage,
  // AK=36 LastPromotionCycle, AS=44 EmployerBizId, AT=45 CitizenBio, AU=46 Gender.
  var citizens = [];
  for (var i = 1; i < rows.length; i++) {
    var r = rows[i];
    var popId = (r[0] || '').trim();
    var first = (r[1] || '').trim();
    var last = (r[3] || '').trim();
    var tier = parseInt(r[9] || '0', 10);
    var role = (r[10] || '').trim();
    var status = (r[11] || '').trim();
    var birthYear = (r[12] || '').trim();
    var lifeHistory = (r[14] || '').trim();
    var traitProfile = (r[17] || '').trim();
    var usageCount = (r[18] || '').trim();
    var neighborhood = (r[19] || '').trim();
    var maritalStatus = (r[21] || '').trim();
    var numChildren = (r[22] || '').trim();
    var parentIds = (r[23] || '').trim();
    var childrenIds = (r[24] || '').trim();
    var wealthLevel = (r[25] || '').trim();
    var income = (r[26] || '').trim();
    var netWorth = (r[28] || '').trim();
    var educationLevel = (r[31] || '').trim();
    var careerStage = (r[33] || '').trim();
    var lastPromotionCycle = (r[36] || '').trim();
    var employerBizId = (r[44] || '').trim();
    var bio = (r[45] || '').trim();
    var gender = (r[46] || '').trim();
    var dialState = dialStateIdx >= 0 ? (r[dialStateIdx] || '').trim() : '';

    if (!popId || !first) continue;

    // Filters
    if (TIER_FILTER !== null && tier !== TIER_FILTER) continue;
    if (NAME_FILTER && (first + ' ' + last).toLowerCase().indexOf(NAME_FILTER.toLowerCase()) < 0) continue;
    if (POPID_RANGE_LO !== null) {
      var popMatch = popId.match(/^POP-(\d+)$/);
      if (!popMatch) continue;
      var popNum = parseInt(popMatch[1], 10);
      if (popNum < POPID_RANGE_LO || popNum > POPID_RANGE_HI) continue;
    }
    if (POPID_SET !== null && !POPID_SET.has(popId)) continue;

    citizens.push({
      popId: popId,
      first: first,
      last: last,
      tier: tier,
      role: role,
      status: status,
      birthYear: birthYear,
      lifeHistory: lifeHistory,
      traitProfile: traitProfile,
      usageCount: usageCount,
      neighborhood: neighborhood,
      maritalStatus: maritalStatus,
      numChildren: numChildren,
      parentIds: parentIds,
      childrenIds: childrenIds,
      wealthLevel: wealthLevel,
      income: income,
      netWorth: netWorth,
      educationLevel: educationLevel,
      careerStage: careerStage,
      lastPromotionCycle: lastPromotionCycle,
      employerBizId: employerBizId,
      bio: bio,
      gender: gender,
      dialState: dialState
    });
  }

  console.log('[buildCitizenCards] Citizens matched: ' + citizens.length);
  if (LIMIT < citizens.length) {
    citizens = citizens.slice(0, LIMIT);
    console.log('[buildCitizenCards] Limited to: ' + citizens.length);
  }

  // Wipe-old (R1 retrofit): DELETE old un-tagged citizen cards before writing
  // fresh ones with the dual ['world-data', 'wd-citizens'] tag pair. Opt-in
  // via --wipe-old; defaults OFF so partial reruns / accidental --apply don't
  // sweep the substrate. Scoped by POPID-content match so player_truesource
  // and seed business-card stay untouched.
  var wipeReport = null;
  if (APPLY && (WIPE_OLD || WIPE_ONLY)) {
    wipeReport = await wipeOldCitizenCards(citizens);
    if (WIPE_ONLY) {
      console.log('\n=== --wipe-only set: skipping writes, exiting after wipe ===');
      console.log('[WIPE-OLD] candidates: ' + wipeReport.candidates +
        ' | matched (POPID-scoped): ' + wipeReport.matched +
        ' | deleted: ' + wipeReport.deleted +
        ' | failed: ' + wipeReport.failed);
      return;
    }
    console.log('[wipe-old] sleeping ' + (WIPE_INDEXING_SLEEP_MS / 1000) + 's for async indexing to settle before writes');
    await smSleep(WIPE_INDEXING_SLEEP_MS);
  } else if (APPLY && !WIPE_OLD) {
    console.log('[buildCitizenCards] --wipe-old not set — writes will land alongside any existing un-tagged cards.');
  }

  // Process each citizen
  var written = 0;
  var posted = 0;
  var patched = 0;
  var errors = 0;
  var failureList = [];            // T6 canon.3 — populated on writeMemory catch; dumped at main() end if errors > 0
  var withAppearances = 0;
  var rawAppearancesTotal = 0;     // pre-filter — for cross-contamination metrics
  var filteredOutTotal = 0;        // dropped by full-name post-filter

  for (var ci = 0; ci < citizens.length; ci++) {
    var cit = citizens[ci];
    var fullName = cit.first + ' ' + cit.last;

    // Search bay-tribune for appearances. Hybrid (vector + keyword) search
    // returns first-name matches, so post-filter on the citizen's full name
    // — without this every "Marcus *" card collected every other Marcus's
    // appearances. Strict substring match (case-insensitive); accepts the
    // false-negative cost of dropping last-name-only later mentions in
    // favor of zero false positives. See ENGINE_REPAIR Row 2 / S181.
    var rawResults = [];
    try {
      rawResults = await searchSupermemory(fullName, 'bay-tribune');
    } catch (e) {
      // No appearances — that's fine
    }

    var fullNameLc = fullName.toLowerCase();
    var appearances = rawResults.filter(function(r) {
      return String(r.memory || '').toLowerCase().indexOf(fullNameLc) >= 0;
    });

    rawAppearancesTotal += rawResults.length;
    filteredOutTotal += (rawResults.length - appearances.length);
    if (appearances.length > 0) withAppearances++;

    // Build the card
    var card = await buildCard(cit, appearances, cardRefs);

    // Quality gate — skip thin cards with no appearances, no traits, no bio.
    // Disabled by --no-quality-gate (S183 cold-start fix): thin cards are a
    // discovery surface for "who lives in X / who works as Y" queries, not
    // pollution. Hybrid search ranks by similarity, so thin cards only
    // surface on direct name/role/neighborhood queries — exactly what
    // discovery looks like.
    // engine.30: milestone-bearing citizens always pass — the card is the
    // preservation surface for dated milestones once .31's deploy clears
    // LifeHistory(O); gating them out would silently lose the WHEN.
    var hasMilestones = extractMilestones_(cit.lifeHistory).length > 0 ||
      ((cardRefs.archMilestones && cardRefs.archMilestones[cit.popId]) || []).length > 0;
    if (!NO_QUALITY_GATE && appearances.length === 0 && !cit.traitProfile && !cit.bio && !hasMilestones) {
      // Bare ledger data only — not worth a Supermemory write
      continue;
    }

    if (!APPLY) {
      if (ci < 5 || appearances.length > 0) {
        console.log('--- ' + fullName + ' (' + cit.popId + ') ---');
        console.log('PAYLOAD: containerTags=[' + CONTAINER_TAG + ', ' + DOMAIN_TAG + '] | metadata.title="' + fullName + '" | metadata.popid="' + cit.popId + '"');
        console.log(card.substring(0, 600));
        console.log('  [' + appearances.length + ' appearances]');
        console.log('');
      }
    } else {
      try {
        var wr = await writeMemory(card, cit, popidIdMap);
        written++;
        if (wr.op === 'PATCH') patched++; else posted++;
        if ((ci + 1) % 25 === 0) {
          console.log('  ... ' + (ci + 1) + '/' + citizens.length +
            ' (' + withAppearances + ' with appearances, ' + patched + ' patched / ' + posted + ' posted)');
        }
      } catch (e) {
        console.error('[FAIL] ' + fullName + ': ' + e.message);
        errors++;
        failureList.push({
          popid: cit.popId,
          name: fullName,
          error_message: e.message,
          http_status: (e && e.status) || null
        });
      }

      // Rate limit — 500ms between writes (bumped from 300ms post-S182 W1
      // bulk-apply rate-limit observation; retry-on-401 in writeMemory is the
      // primary defense, this is just inter-write breathing room).
      await smSleep(500);

      // S223: batch-pause between bursts. Supermemory surfaces rate-limit
      // as 401 after ~225 successive writes at 500ms inter-write; chunking
      // into BATCH_SIZE bursts with BATCH_PAUSE_SEC pause between resets
      // the window. Skips pause after the final batch.
      if (written > 0 && written % BATCH_SIZE === 0 && ci + 1 < citizens.length) {
        console.log('  [batch-pause] ' + written + ' writes done — sleeping ' + BATCH_PAUSE_SEC + 's before next burst (' + patched + ' patched / ' + posted + ' posted / ' + errors + ' errors so far)');
        await smSleep(BATCH_PAUSE_SEC * 1000);
      }
    }
  }

  console.log('');
  console.log('[DONE] Citizens: ' + citizens.length +
    ' | With appearances (post-filter): ' + withAppearances +
    ' | Written: ' + written +
    ' (PATCH: ' + patched + ' / POST: ' + posted + ')' +
    ' | Errors: ' + errors);
  console.log('[FILTER] Raw bay-tribune hits: ' + rawAppearancesTotal +
    ' | Filtered out (cross-contamination): ' + filteredOutTotal +
    ' | Kept: ' + (rawAppearancesTotal - filteredOutTotal));
  if (wipeReport) {
    console.log('[WIPE-OLD] candidates: ' + wipeReport.candidates +
      ' | matched (POPID-scoped): ' + wipeReport.matched +
      ' | deleted: ' + wipeReport.deleted +
      ' | failed: ' + wipeReport.failed);
  }

  if (!APPLY && citizens.length > 5) {
    console.log('\nShowed first 5 + citizens with appearances. Use --apply to write all.');
  }

  // T6 canon.3 — Errors-gate: dump failure list + exit non-zero so /post-publish
  // Step 2a + Step 5-bis can stop on partial failure per ADR-0007 §How to Apply.
  // Pre-T6 the script always exited 0; downstream skills had no way to detect
  // silent partial failure beyond grepping stdout.
  if (errors > 0) {
    var failPath = emitErrorGateDump({
      total_attempted: citizens.length,
      written: written,
      errors: errors,
      failures: failureList
    });
    console.error('[GATE-FAIL] ' + errors + ' card write(s) failed; details: ' + failPath);
    process.exit(1);
  }
}

// T6 canon.3 — Extracted for unit-test: callable with stub stats so the gate
// contract (dump-file shape, cycle resolution, file path) is verifiable
// without round-tripping through Sim_Ledger reads + Supermemory writes.
// Returns the dump-file path. Does NOT exit — caller decides exit code.
function emitErrorGateDump(stats) {
  var cycleResolved = process.env.CYCLE || process.env.CYCLE_NUMBER || null;
  if (!cycleResolved) {
    try {
      var bcPath = path.join(__dirname, '..', 'output/desk-packets/base_context.json');
      var bc = JSON.parse(fs.readFileSync(bcPath, 'utf-8'));
      cycleResolved = bc.cycle || bc.cycleNumber || (bc.baseContext && bc.baseContext.cycle) || null;
    } catch (_) { /* base_context unavailable — fall back to timestamp */ }
  }
  var cycleSlug = cycleResolved
    ? ('c' + String(cycleResolved).replace(/^[cC]/, ''))
    : ('ts' + Date.now());
  var failPath = path.join(__dirname, '..', 'output', 'citizen_card_failures_' + cycleSlug + '.json');
  var payload = {
    cycle: cycleResolved,
    timestamp: new Date().toISOString(),
    total_attempted: stats.total_attempted,
    written: stats.written,
    errors: stats.errors,
    failures: stats.failures || []
  };
  fs.writeFileSync(failPath, JSON.stringify(payload, null, 2));
  return failPath;
}

module.exports = {
  emitErrorGateDump: emitErrorGateDump,
  classify401Action: classify401Action,
  // engine.30 formatters — exported for unit tests
  buildCard: buildCard,
  extractMilestones_: extractMilestones_,
  dialEssence_: dialEssence_,
  wealthLabel_: wealthLabel_,
  formatMoney_: formatMoney_,
  parseIdList_: parseIdList_
};

if (require.main === module) {
  main().catch(function(e) { console.error('[FATAL]', e); process.exit(1); });
}
