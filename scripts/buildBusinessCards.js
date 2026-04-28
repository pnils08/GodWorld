#!/usr/bin/env node
/**
 * buildBusinessCards.js — Compile per-business wiki cards into world-data
 * [engine/sheet] — Phase 33.16 + S182 unified ingest rebuild (Task W1)
 *
 * Reads Business_Ledger for base profile, searches bay-tribune for
 * appearance history, writes a compiled business card to world-data
 * with containerTags ['world-data', 'wd-business'].
 *
 * The GodWorld MCP lookup_business tool (Task M1) queries these cards.
 *
 * Usage:
 *   node scripts/buildBusinessCards.js --dry-run                    # preview new payload shape
 *   node scripts/buildBusinessCards.js --apply                      # write all cards (no wipe)
 *   node scripts/buildBusinessCards.js --apply --wipe-old           # wipe old un-tagged + prior wd-business, then write
 *   node scripts/buildBusinessCards.js --apply --name "Civis"       # one business by name substring
 *   node scripts/buildBusinessCards.js --apply --biz BIZ-00052      # one business by BIZ_ID
 *
 * Write payload: /v3/documents POST with
 *   containerTags: ['world-data', 'wd-business']
 *   metadata: { title, biz_id, source: 'buildBusinessCards.js' }
 *
 * --wipe-old: enumerate world-data, GET each candidate, match BIZ-XXXXX
 * from "(BIZ-XXXXX)" content header against the business set being written,
 * DELETE each match. Other domains untouched. Mirrors R1 design.
 *
 * Columns from Business_Ledger:
 *   A=BIZ_ID, B=Name, C=Sector, D=Neighborhood, E=Employee_Count,
 *   F=Avg_Salary, G=Annual_Revenue, H=Growth_Rate, I=Key_Personnel
 */

require('/root/GodWorld/lib/env');
var https = require('https');
var sheets = require('../lib/sheets');

var API_KEY = process.env.SUPERMEMORY_CC_API_KEY;
var CONTAINER_TAG = 'world-data';
var DOMAIN_TAG = 'wd-business';
var API_HOST = 'api.supermemory.ai';
var APPLY = process.argv.includes('--apply');
var WIPE_OLD = process.argv.includes('--wipe-old');

var nameArg = process.argv.indexOf('--name');
var NAME_FILTER = nameArg > 0 ? process.argv[nameArg + 1] : null;

var bizArg = process.argv.indexOf('--biz');
var BIZ_FILTER = bizArg > 0 ? process.argv[bizArg + 1] : null;

var limitArg = process.argv.indexOf('--limit');
var LIMIT = limitArg > 0 ? parseInt(process.argv[limitArg + 1], 10) : 999;

// Wipe-old GET pass tuning (matches R1 / wipeWorldDataSnapshots conventions)
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
// WRITE — /v3/documents with dual tags + metadata
// ═══════════════════════════════════════════════════════════════════════════

function writeMemory(content, biz) {
  return new Promise(function(resolve, reject) {
    var meta = {
      title: biz.name,
      biz_id: biz.bizId,
      source: 'buildBusinessCards.js'
    };
    var payload = JSON.stringify({
      content: content,
      containerTags: [CONTAINER_TAG, DOMAIN_TAG],
      metadata: meta
    });
    var options = {
      hostname: API_HOST,
      path: '/v3/documents',
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
        if (res.statusCode >= 200 && res.statusCode < 300) {
          var parsed = null;
          try { parsed = JSON.parse(data); } catch (e) {}
          resolve({ status: res.statusCode, id: parsed && parsed.id });
        } else {
          reject(new Error('HTTP ' + res.statusCode + ': ' + data));
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, function() { req.destroy(); reject(new Error('Timeout')); });
    req.write(payload);
    req.end();
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// WIPE-OLD — BIZ-content-scoped DELETE of un-tagged + prior wd-business cards
// ═══════════════════════════════════════════════════════════════════════════
// Filter: enumerate world-data, for each doc extract "(BIZ-XXXXX)" header
// from content; DELETE if BIZ_ID is in the target write set. Catches both
// un-tagged seed cards (e.g., Civis Systems pre-W1) AND prior wd-business
// cards from re-runs. Other domains (citizens, player_truesource, faith,
// etc.) untouched because their headers don't match the BIZ-XXXXX pattern.

function bizIdFromContent(content) {
  if (!content) return null;
  var m = content.match(/\(BIZ-(\d{3,})\)/);
  return m ? 'BIZ-' + m[1] : null;
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

async function wipeOldBusinessCards(businesses) {
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

  var allowedBizIds = {};
  businesses.forEach(function(b) { allowedBizIds[b.bizId] = true; });
  console.log('[wipe-old] target BIZ_ID set size: ' + Object.keys(allowedBizIds).length);

  console.log('[wipe-old] GET pass to extract BIZ_ID per doc (concurrency=' + WIPE_GET_CONCURRENCY + ')');
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
      var bizId = bizIdFromContent(content);
      if (bizId && allowedBizIds[bizId]) {
        matches.push({ id: results[j].id, bizId: bizId });
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
// BUILD BUSINESS CARD
// ═══════════════════════════════════════════════════════════════════════════

function clean(s) {
  return (s == null ? '' : String(s)).trim();
}

async function buildCard(biz, appearances) {
  var lines = [];

  // Header
  lines.push(biz.name + ' (' + biz.bizId + ')');
  var headerParts = [
    'Neighborhood: ' + (biz.neighborhood || 'Unknown'),
    'Sector: ' + (biz.sector || 'Unknown')
  ];
  if (biz.employeeCount) headerParts.push('Employees: ' + biz.employeeCount);
  lines.push(headerParts.join(' | '));

  // Financials line — render only if any populated
  var finParts = [];
  if (biz.avgSalary) finParts.push('Avg Salary: ' + biz.avgSalary);
  if (biz.annualRevenue) finParts.push('Annual Revenue: ' + biz.annualRevenue);
  if (biz.growthRate) finParts.push('Growth: ' + biz.growthRate);
  if (finParts.length) lines.push(finParts.join(' | '));

  // Key Personnel
  if (biz.keyPersonnel) {
    lines.push('Key Personnel: ' + biz.keyPersonnel);
  }

  // Appearances from bay-tribune (full-name post-filtered on business name)
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
  console.log('[buildBusinessCards] Mode: ' + (APPLY ? 'APPLY' : 'DRY-RUN'));
  if (NAME_FILTER) console.log('[buildBusinessCards] Name filter: ' + NAME_FILTER);
  if (BIZ_FILTER) console.log('[buildBusinessCards] BIZ_ID filter: ' + BIZ_FILTER);
  if (LIMIT < 999) console.log('[buildBusinessCards] Limit: ' + LIMIT);
  console.log('');

  var data = await sheets.getSheetData('Business_Ledger');
  if (!data || data.length < 2) {
    console.error('No data in Business_Ledger');
    process.exit(1);
  }
  console.log('[buildBusinessCards] Ledger rows: ' + (data.length - 1));

  // Build business records
  var businesses = [];
  for (var i = 1; i < data.length; i++) {
    var r = data[i];
    var bizId = clean(r[0]);
    var name = clean(r[1]);
    if (!bizId || !name) continue;

    var biz = {
      bizId: bizId,
      name: name,
      sector: clean(r[2]),
      neighborhood: clean(r[3]),
      employeeCount: clean(r[4]),
      avgSalary: clean(r[5]),
      annualRevenue: clean(r[6]),
      growthRate: clean(r[7]),
      keyPersonnel: clean(r[8])
    };

    if (BIZ_FILTER && biz.bizId !== BIZ_FILTER) continue;
    if (NAME_FILTER && name.toLowerCase().indexOf(NAME_FILTER.toLowerCase()) < 0) continue;

    businesses.push(biz);
  }

  console.log('[buildBusinessCards] Businesses matched: ' + businesses.length);
  if (LIMIT < businesses.length) {
    businesses = businesses.slice(0, LIMIT);
    console.log('[buildBusinessCards] Limited to: ' + businesses.length);
  }

  // Wipe-old (R1 pattern)
  var wipeReport = null;
  if (APPLY && WIPE_OLD) {
    wipeReport = await wipeOldBusinessCards(businesses);
    console.log('[wipe-old] sleeping ' + (WIPE_INDEXING_SLEEP_MS / 1000) + 's for async indexing to settle before writes');
    await smSleep(WIPE_INDEXING_SLEEP_MS);
  } else if (APPLY && !WIPE_OLD) {
    console.log('[buildBusinessCards] --wipe-old not set — writes will land alongside any existing un-tagged cards.');
  }

  // Process each business
  var written = 0;
  var errors = 0;
  var withAppearances = 0;
  var rawAppearancesTotal = 0;
  var filteredOutTotal = 0;

  for (var bi = 0; bi < businesses.length; bi++) {
    var biz = businesses[bi];

    // Search bay-tribune for appearances. Same hybrid + full-name post-filter
    // pattern as buildCitizenCards.js (S181). Generic words like "Bakery"
    // pollute hybrid hits — strict business-name substring match.
    var rawResults = [];
    try {
      rawResults = await searchSupermemory(biz.name, 'bay-tribune');
    } catch (e) { /* no appearances — fine */ }

    var nameLc = biz.name.toLowerCase();
    var appearances = rawResults.filter(function(r) {
      return String(r.memory || '').toLowerCase().indexOf(nameLc) >= 0;
    });

    rawAppearancesTotal += rawResults.length;
    filteredOutTotal += (rawResults.length - appearances.length);
    if (appearances.length > 0) withAppearances++;

    var card = await buildCard(biz, appearances);

    if (!APPLY) {
      console.log('--- ' + biz.name + ' (' + biz.bizId + ') ---');
      console.log('PAYLOAD: containerTags=[' + CONTAINER_TAG + ', ' + DOMAIN_TAG + '] | metadata.title="' + biz.name + '" | metadata.biz_id="' + biz.bizId + '"');
      console.log(card);
      console.log('  [' + appearances.length + ' appearances]');
      console.log('');
    } else {
      try {
        await writeMemory(card, biz);
        written++;
        if ((bi + 1) % 10 === 0) {
          console.log('  ... ' + (bi + 1) + '/' + businesses.length + ' written (' + withAppearances + ' with appearances)');
        }
      } catch (e) {
        console.error('[FAIL] ' + biz.name + ': ' + e.message);
        errors++;
      }
      await smSleep(300);
    }
  }

  console.log('');
  console.log('[DONE] Businesses: ' + businesses.length +
    ' | With appearances: ' + withAppearances +
    ' | Written: ' + written +
    ' | Errors: ' + errors);
  console.log('[FILTER] Raw bay-tribune hits: ' + rawAppearancesTotal +
    ' | Filtered out: ' + filteredOutTotal +
    ' | Kept: ' + (rawAppearancesTotal - filteredOutTotal));
  if (wipeReport) {
    console.log('[WIPE-OLD] candidates: ' + wipeReport.candidates +
      ' | matched (BIZ_ID-scoped): ' + wipeReport.matched +
      ' | deleted: ' + wipeReport.deleted +
      ' | failed: ' + wipeReport.failed);
  }
}

main().catch(function(e) { console.error('[FATAL]', e); process.exit(1); });
