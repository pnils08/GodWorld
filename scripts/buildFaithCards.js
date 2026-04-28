#!/usr/bin/env node
/**
 * buildFaithCards.js — Compile per-faith-organization wiki cards into world-data
 * [engine/sheet] — S182 unified ingest rebuild (Task W2)
 *
 * Reads Faith_Organizations for base profile, Faith_Ledger for recent events
 * (last 2 cycles), searches bay-tribune for appearances, writes a compiled
 * faith card to world-data with containerTags ['world-data', 'wd-faith'].
 *
 * The GodWorld MCP lookup_faith_org tool (Task M2) queries these cards.
 *
 * Note: Faith_Organizations has no FAITH-XXX ID column (plan spec assumed
 * one). Card header = Organization name only. Wipe scopes by org-name
 * content match (matches W4 neighborhood-name-scoped pattern).
 *
 * Usage:
 *   node scripts/buildFaithCards.js --dry-run                        # preview
 *   node scripts/buildFaithCards.js --apply                          # write all (no wipe)
 *   node scripts/buildFaithCards.js --apply --wipe-old               # wipe + write
 *   node scripts/buildFaithCards.js --apply --name "Masjid Al-Islam" # one org by name
 *
 * Write payload: /v3/documents POST with
 *   containerTags: ['world-data', 'wd-faith']
 *   metadata: { title, organization, source: 'buildFaithCards.js' }
 *
 * --wipe-old: enumerate world-data, GET each candidate, match the first
 * content line against the org-name set being written, DELETE each match.
 * Other domains untouched.
 *
 * Faith_Organizations columns:
 *   A=Organization, B=FaithTradition, C=Neighborhood, D=Founded,
 *   E=Congregation, F=Leader, G=Character, H=ActiveStatus, I=LeaderPOPID
 *
 * Faith_Ledger columns (consumed):
 *   Cycle, Organization, FaithTradition, EventType, EventDescription,
 *   Neighborhood, Attendance, Status
 */

require('/root/GodWorld/lib/env');
var https = require('https');
var sheets = require('../lib/sheets');

var API_KEY = process.env.SUPERMEMORY_CC_API_KEY;
var CONTAINER_TAG = 'world-data';
var DOMAIN_TAG = 'wd-faith';
var API_HOST = 'api.supermemory.ai';
var APPLY = process.argv.includes('--apply');
var WIPE_OLD = process.argv.includes('--wipe-old');

var nameArg = process.argv.indexOf('--name');
var NAME_FILTER = nameArg > 0 ? process.argv[nameArg + 1] : null;

var limitArg = process.argv.indexOf('--limit');
var LIMIT = limitArg > 0 ? parseInt(process.argv[limitArg + 1], 10) : 999;

var RECENT_WINDOW = 2; // cycles back from current cycle for ledger events
var getCurrentCycle = require('../lib/getCurrentCycle');

// Wipe-old GET pass tuning (matches W1 conventions)
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
// SUPERMEMORY API HELPERS (W1 hardening pattern)
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

function searchSupermemory(query, container) {
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
// WRITE — /v3/documents with dual tags + metadata, retry-on-401/429
// ═══════════════════════════════════════════════════════════════════════════

var WRITE_MAX_RETRIES = 3;
var WRITE_RETRY_SLEEP_MS = 8000;

async function writeMemory(content, faith) {
  var meta = {
    title: faith.organization,
    organization: faith.organization,
    source: 'buildFaithCards.js'
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
// WIPE-OLD — Org-name-content-scoped DELETE
// ═══════════════════════════════════════════════════════════════════════════
// First non-blank line of card content is the org name. Match against the
// org-name set being written; DELETE on match. Inventory confirms green-field
// for wd-faith — pattern remains for idempotency on re-runs.

function orgFromContent(content) {
  if (!content) return null;
  var firstLine = content.split('\n')[0] || '';
  return firstLine.trim() || null;
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

async function wipeOldFaithCards(faiths) {
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
      ids.push(it.id);
    }
    if (page < totalPages) await smSleep(WIPE_LIST_SLEEP_MS);
  }
  console.log('[wipe-old] world-data candidates: ' + ids.length);

  var allowedOrgs = {};
  faiths.forEach(function(f) { allowedOrgs[f.organization] = true; });
  console.log('[wipe-old] target Organization set size: ' + Object.keys(allowedOrgs).length);

  console.log('[wipe-old] GET pass to extract org from content (concurrency=' + WIPE_GET_CONCURRENCY + ')');
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
      var org = orgFromContent(content);
      if (org && allowedOrgs[org]) {
        matches.push({ id: results[j].id, organization: org });
      }
    }
    if (fetched % 200 === 0 || (i2 + WIPE_GET_CONCURRENCY) >= ids.length) {
      console.log('  GET ' + fetched + '/' + ids.length + ' — wipe matches so far: ' + matches.length + ' | empty-after-retry: ' + emptyAfterRetry);
    }
  }
  if (emptyAfterRetry > 0) {
    throw new Error('wipe-old: ' + emptyAfterRetry + ' docs returned empty content after retry. Refusing to apply with incomplete data.');
  }
  console.log('[wipe-old] matches to DELETE: ' + matches.length);

  console.log('[wipe-old] DELETE pass');
  var deleted = 0;
  var failed = 0;
  for (var k = 0; k < matches.length; k++) {
    var del = await smRequest('DELETE', '/v3/documents/' + matches[k].id, null);
    var ok = del.status === 204 || del.status === 200;
    if (!ok && del.status === 409) {
      await smSleep(20000);
      var del2 = await smRequest('DELETE', '/v3/documents/' + matches[k].id, null);
      ok = del2.status === 204 || del2.status === 200;
    }
    if (ok) deleted++; else failed++;
    if ((k + 1) % 25 === 0 || k === matches.length - 1) {
      console.log('  DELETE ' + (k + 1) + '/' + matches.length + ' — ok=' + deleted + ' failed=' + failed);
    }
    await smSleep(200);
  }
  console.log('[wipe-old] DELETE results: ' + deleted + ' ok / ' + failed + ' failed');
  return { candidates: ids.length, matched: matches.length, deleted: deleted, failed: failed };
}

// ═══════════════════════════════════════════════════════════════════════════
// FAITH_LEDGER — recent events per org
// ═══════════════════════════════════════════════════════════════════════════

function indexHeader(headers, name) {
  for (var i = 0; i < headers.length; i++) {
    if ((headers[i] || '').trim() === name) return i;
  }
  return -1;
}

async function loadRecentLedgerEvents(currentCycle) {
  var rows = await sheets.getSheetData('Faith_Ledger');
  if (!rows || rows.length < 2) return {};
  var headers = rows[0];
  var idx = {
    cycle: indexHeader(headers, 'Cycle'),
    organization: indexHeader(headers, 'Organization'),
    eventType: indexHeader(headers, 'EventType'),
    description: indexHeader(headers, 'EventDescription'),
    attendance: indexHeader(headers, 'Attendance')
  };
  if (idx.cycle < 0 || idx.organization < 0) return {};

  var cutoff = currentCycle - RECENT_WINDOW;
  var byOrg = {};
  for (var i = 1; i < rows.length; i++) {
    var r = rows[i];
    var c = parseInt(r[idx.cycle], 10);
    if (!Number.isFinite(c) || c < cutoff || c > currentCycle) continue;
    var org = (r[idx.organization] || '').trim();
    if (!org) continue;
    if (!byOrg[org]) byOrg[org] = [];
    byOrg[org].push({
      cycle: c,
      eventType: idx.eventType >= 0 ? (r[idx.eventType] || '').trim() : '',
      description: idx.description >= 0 ? (r[idx.description] || '').trim() : '',
      attendance: idx.attendance >= 0 ? (parseInt(r[idx.attendance], 10) || null) : null
    });
  }
  // Sort each org's events most-recent-first
  Object.keys(byOrg).forEach(function(o) {
    byOrg[o].sort(function(a, b) { return b.cycle - a.cycle; });
  });
  return byOrg;
}

// ═══════════════════════════════════════════════════════════════════════════
// BUILD FAITH CARD
// ═══════════════════════════════════════════════════════════════════════════

function clean(s) {
  return (s == null ? '' : String(s)).trim();
}

function buildCard(faith, recentEvents, appearances) {
  var lines = [];

  // Header — org name only (no synthetic ID)
  lines.push(faith.organization);

  // Identity line
  var headerParts = [
    'Neighborhood: ' + (faith.neighborhood || 'Unknown'),
    'Tradition: ' + (faith.tradition || 'Unknown')
  ];
  if (faith.leader) headerParts.push('Leader: ' + faith.leader);
  if (faith.congregation) headerParts.push('Congregation: ' + faith.congregation);
  lines.push(headerParts.join(' | '));

  // Profile line — render only if any populated
  var profParts = [];
  if (faith.founded) profParts.push('Founded: ' + faith.founded);
  if (faith.character) profParts.push('Character: ' + faith.character);
  if (faith.activeStatus) profParts.push('Status: ' + faith.activeStatus);
  if (profParts.length) lines.push(profParts.join(' | '));

  // Recent activity (last 2 cycles, max 5 lines)
  if (recentEvents && recentEvents.length > 0) {
    lines.push('');
    lines.push('RECENT ACTIVITY (last ' + RECENT_WINDOW + ' cycles):');
    for (var i = 0; i < recentEvents.length && i < 5; i++) {
      var e = recentEvents[i];
      var line = '- C' + e.cycle + ': ' + (e.eventType || 'event');
      if (e.description) line += ' — ' + e.description;
      if (e.attendance) line += ' (~' + e.attendance + ')';
      lines.push(line);
    }
  }

  // Appearances from bay-tribune (full-name post-filtered on org name)
  if (appearances.length > 0) {
    lines.push('');
    lines.push('APPEARANCES:');
    for (var ai = 0; ai < appearances.length && ai < 8; ai++) {
      var a = appearances[ai];
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
  console.log('[buildFaithCards] Mode: ' + (APPLY ? 'APPLY' : 'DRY-RUN'));
  if (NAME_FILTER) console.log('[buildFaithCards] Name filter: ' + NAME_FILTER);
  if (LIMIT < 999) console.log('[buildFaithCards] Limit: ' + LIMIT);

  var currentCycle = getCurrentCycle();
  if (!currentCycle) {
    console.error('[ERROR] Could not resolve current cycle.');
    process.exit(1);
  }
  console.log('[buildFaithCards] Cycle: ' + currentCycle + ' (recent window = last ' + RECENT_WINDOW + ' cycles)');
  console.log('');

  var data = await sheets.getSheetData('Faith_Organizations');
  if (!data || data.length < 2) {
    console.error('No data in Faith_Organizations');
    process.exit(1);
  }
  console.log('[buildFaithCards] Faith_Organizations rows: ' + (data.length - 1));

  var headers = data[0];
  var idx = {
    organization: indexHeader(headers, 'Organization'),
    tradition: indexHeader(headers, 'FaithTradition'),
    neighborhood: indexHeader(headers, 'Neighborhood'),
    founded: indexHeader(headers, 'Founded'),
    congregation: indexHeader(headers, 'Congregation'),
    leader: indexHeader(headers, 'Leader'),
    character: indexHeader(headers, 'Character'),
    activeStatus: indexHeader(headers, 'ActiveStatus'),
    leaderPopId: indexHeader(headers, 'LeaderPOPID')
  };
  if (idx.organization < 0) {
    console.error('Faith_Organizations missing Organization column');
    process.exit(1);
  }

  // Build faith records
  var faiths = [];
  for (var i = 1; i < data.length; i++) {
    var r = data[i];
    var organization = clean(r[idx.organization]);
    if (!organization) continue;

    var faith = {
      organization: organization,
      tradition: clean(r[idx.tradition]),
      neighborhood: clean(r[idx.neighborhood]),
      founded: clean(r[idx.founded]),
      congregation: clean(r[idx.congregation]),
      leader: clean(r[idx.leader]),
      character: clean(r[idx.character]),
      activeStatus: clean(r[idx.activeStatus]),
      leaderPopId: clean(r[idx.leaderPopId])
    };

    if (NAME_FILTER && organization.toLowerCase().indexOf(NAME_FILTER.toLowerCase()) < 0) continue;
    faiths.push(faith);
  }

  console.log('[buildFaithCards] Faith orgs matched: ' + faiths.length);
  if (LIMIT < faiths.length) {
    faiths = faiths.slice(0, LIMIT);
    console.log('[buildFaithCards] Limited to: ' + faiths.length);
  }

  // Load Faith_Ledger recent events
  var recentByOrg = await loadRecentLedgerEvents(currentCycle);
  console.log('[buildFaithCards] Faith_Ledger orgs with recent events: ' + Object.keys(recentByOrg).length);

  // Wipe-old (W1 pattern)
  var wipeReport = null;
  if (APPLY && WIPE_OLD) {
    wipeReport = await wipeOldFaithCards(faiths);
    console.log('[wipe-old] sleeping ' + (WIPE_INDEXING_SLEEP_MS / 1000) + 's for async indexing to settle before writes');
    await smSleep(WIPE_INDEXING_SLEEP_MS);
  } else if (APPLY && !WIPE_OLD) {
    console.log('[buildFaithCards] --wipe-old not set — writes will land alongside any existing un-tagged cards.');
  }

  // Process each faith org
  var written = 0;
  var errors = 0;
  var withAppearances = 0;
  var withRecentEvents = 0;
  var rawAppearancesTotal = 0;
  var filteredOutTotal = 0;

  for (var fi = 0; fi < faiths.length; fi++) {
    var faith = faiths[fi];

    // Search bay-tribune for appearances. Hybrid + full-name post-filter
    // on org name (matches W1 / R1 pattern).
    var rawResults = [];
    try {
      rawResults = await searchSupermemory(faith.organization, 'bay-tribune');
    } catch (e) { /* no appearances — fine */ }

    var nameLc = faith.organization.toLowerCase();
    var appearances = rawResults.filter(function(r) {
      return String(r.memory || '').toLowerCase().indexOf(nameLc) >= 0;
    });

    rawAppearancesTotal += rawResults.length;
    filteredOutTotal += (rawResults.length - appearances.length);
    if (appearances.length > 0) withAppearances++;

    var recentEvents = recentByOrg[faith.organization] || [];
    if (recentEvents.length > 0) withRecentEvents++;

    var card = buildCard(faith, recentEvents, appearances);

    if (!APPLY) {
      console.log('--- ' + faith.organization + ' ---');
      console.log('PAYLOAD: containerTags=[' + CONTAINER_TAG + ', ' + DOMAIN_TAG + '] | metadata.title="' + faith.organization + '"');
      console.log(card);
      console.log('  [' + recentEvents.length + ' recent events, ' + appearances.length + ' appearances]');
      console.log('');
    } else {
      try {
        await writeMemory(card, faith);
        written++;
        if ((fi + 1) % 5 === 0) {
          console.log('  ... ' + (fi + 1) + '/' + faiths.length + ' written (' + withAppearances + ' with appearances, ' + withRecentEvents + ' with recent events)');
        }
      } catch (e) {
        console.error('[FAIL] ' + faith.organization + ': ' + e.message);
        errors++;
      }
      await smSleep(500);
    }
  }

  console.log('');
  console.log('[DONE] Faith orgs: ' + faiths.length +
    ' | With recent events: ' + withRecentEvents +
    ' | With appearances: ' + withAppearances +
    ' | Written: ' + written +
    ' | Errors: ' + errors);
  console.log('[FILTER] Raw bay-tribune hits: ' + rawAppearancesTotal +
    ' | Filtered out: ' + filteredOutTotal +
    ' | Kept: ' + (rawAppearancesTotal - filteredOutTotal));
  if (wipeReport) {
    console.log('[WIPE-OLD] candidates: ' + wipeReport.candidates +
      ' | matched (Org-name-scoped): ' + wipeReport.matched +
      ' | deleted: ' + wipeReport.deleted +
      ' | failed: ' + wipeReport.failed);
  }
}

main().catch(function(e) { console.error('[FATAL]', e); process.exit(1); });
