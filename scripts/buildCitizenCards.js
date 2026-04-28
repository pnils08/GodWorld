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
 *   A=POPID, B=First, D=Last, J=Tier, K=RoleType, M=BirthYear,
 *   R=TraitProfile, S=UsageCount, T=Neighborhood, AS=EmployerBizId,
 *   AT=CitizenBio, AU=Gender
 */

require('/root/GodWorld/lib/env');
var fs = require('fs');
var path = require('path');
var https = require('https');
var sheets = require('../lib/sheets');

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
  return new Promise(function(resolve, reject) {
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
// Retry-on-401/429 hardening (S182): bulk applies of 1k+ writes back-to-back
// can trip Supermemory's rolling-window cap, surfacing as 401 "userId or
// orgId not found" rather than 429 (observed during W1 bulk apply). Defensive
// retry on either with 8s backoff, up to 3 retries.
// ═══════════════════════════════════════════════════════════════════════════

var WRITE_MAX_RETRIES = 3;
var WRITE_RETRY_SLEEP_MS = 8000;

async function writeMemory(content, citizen) {
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
  for (var attempt = 0; attempt <= WRITE_MAX_RETRIES; attempt++) {
    var r = await smRequest('POST', '/v3/documents', body);
    if (r.status >= 200 && r.status < 300) {
      return { status: r.status, id: r.body && r.body.id };
    }
    if ((r.status === 401 || r.status === 429) && attempt < WRITE_MAX_RETRIES) {
      console.log('  [retry] write got ' + r.status + ' (rate-limit?); sleeping ' + (WRITE_RETRY_SLEEP_MS / 1000) + 's, attempt ' + (attempt + 2) + '/' + (WRITE_MAX_RETRIES + 1));
      await smSleep(WRITE_RETRY_SLEEP_MS);
      continue;
    }
    throw new Error('HTTP ' + r.status + ': ' + (typeof r.body === 'string' ? r.body : JSON.stringify(r.body)));
  }
  throw new Error('writeMemory exhausted ' + (WRITE_MAX_RETRIES + 1) + ' attempts');
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

async function buildCard(citizen, appearances) {
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
  lines.push(headerParts.join(' | '));

  // Operational metadata — render only when populated so empty cards stay clean.
  if (citizen.employerBizId) {
    lines.push('Employer: ' + citizen.employerBizId);
  }
  if (citizen.usageCount && parseInt(citizen.usageCount, 10) > 0) {
    lines.push('Usage: ' + citizen.usageCount + ' mentions');
  }

  // Trait profile
  if (citizen.traitProfile) {
    lines.push('Traits: ' + citizen.traitProfile);
  }

  // Bio
  if (citizen.bio) {
    lines.push('Bio: ' + citizen.bio);
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

  // Read Simulation_Ledger — columns A,B,D,J,K,M,R,T,AT
  var client = await sheets.getClient();
  var spreadsheetId = process.env.GODWORLD_SHEET_ID;

  var res = await client.spreadsheets.values.get({
    spreadsheetId: spreadsheetId,
    range: 'Simulation_Ledger!A:AU'
  });

  var rows = res.data.values || [];
  if (rows.length < 2) {
    console.error('No data in Simulation_Ledger');
    process.exit(1);
  }

  console.log('[buildCitizenCards] Ledger rows: ' + (rows.length - 1));

  // Column indices (0-based): A=0 POPID, B=1 First, D=3 Last, J=9 Tier,
  // K=10 RoleType, M=12 BirthYear, R=17 TraitProfile, S=18 UsageCount,
  // T=19 Neighborhood, AS=44 EmployerBizId, AT=45 CitizenBio, AU=46 Gender.
  var citizens = [];
  for (var i = 1; i < rows.length; i++) {
    var r = rows[i];
    var popId = (r[0] || '').trim();
    var first = (r[1] || '').trim();
    var last = (r[3] || '').trim();
    var tier = parseInt(r[9] || '0', 10);
    var role = (r[10] || '').trim();
    var birthYear = (r[12] || '').trim();
    var traitProfile = (r[17] || '').trim();
    var usageCount = (r[18] || '').trim();
    var neighborhood = (r[19] || '').trim();
    var employerBizId = (r[44] || '').trim();
    var bio = (r[45] || '').trim();
    var gender = (r[46] || '').trim();

    if (!popId || !first) continue;

    // Filters
    if (TIER_FILTER !== null && tier !== TIER_FILTER) continue;
    if (NAME_FILTER && (first + ' ' + last).toLowerCase().indexOf(NAME_FILTER.toLowerCase()) < 0) continue;

    citizens.push({
      popId: popId,
      first: first,
      last: last,
      tier: tier,
      role: role,
      birthYear: birthYear,
      traitProfile: traitProfile,
      usageCount: usageCount,
      neighborhood: neighborhood,
      employerBizId: employerBizId,
      bio: bio,
      gender: gender
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
  var errors = 0;
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
    var card = await buildCard(cit, appearances);

    // Quality gate — skip thin cards with no appearances, no traits, no bio.
    // Disabled by --no-quality-gate (S183 cold-start fix): thin cards are a
    // discovery surface for "who lives in X / who works as Y" queries, not
    // pollution. Hybrid search ranks by similarity, so thin cards only
    // surface on direct name/role/neighborhood queries — exactly what
    // discovery looks like.
    if (!NO_QUALITY_GATE && appearances.length === 0 && !cit.traitProfile && !cit.bio) {
      // Bare ledger data only — not worth a Supermemory write
      continue;
    }

    if (!APPLY) {
      if (ci < 5 || appearances.length > 0) {
        console.log('--- ' + fullName + ' (' + cit.popId + ') ---');
        console.log('PAYLOAD: containerTags=[' + CONTAINER_TAG + ', ' + DOMAIN_TAG + '] | metadata.title="' + fullName + '" | metadata.popid="' + cit.popId + '"');
        console.log(card.substring(0, 300));
        console.log('  [' + appearances.length + ' appearances]');
        console.log('');
      }
    } else {
      try {
        await writeMemory(card, cit);
        written++;
        if ((ci + 1) % 25 === 0) {
          console.log('  ... ' + (ci + 1) + '/' + citizens.length +
            ' (' + withAppearances + ' with appearances)');
        }
      } catch (e) {
        console.error('[FAIL] ' + fullName + ': ' + e.message);
        errors++;
      }

      // Rate limit — 500ms between writes (bumped from 300ms post-S182 W1
      // bulk-apply rate-limit observation; retry-on-401 in writeMemory is the
      // primary defense, this is just inter-write breathing room).
      await smSleep(500);
    }
  }

  console.log('');
  console.log('[DONE] Citizens: ' + citizens.length +
    ' | With appearances (post-filter): ' + withAppearances +
    ' | Written: ' + written +
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
}

main().catch(function(e) { console.error('[FATAL]', e); process.exit(1); });
