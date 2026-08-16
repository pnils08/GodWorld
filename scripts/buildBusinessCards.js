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
 *   node scripts/buildBusinessCards.js --reconcile                  # dry-run dedupe report
 *   node scripts/buildBusinessCards.js --reconcile --apply          # delete surplus cards
 *
 * engine.111 (S376) — one-doc-per-BIZ_ID invariant, same fix engine.110 landed on
 * buildCulturalCards.js. Writes were POST-only and --wipe-old counted DELETE
 * failures without acting on them, so every partial wipe stacked another version.
 * The S376 census found this the WORST projection in the card layer: 435 docs for
 * 99 businesses (4.39x), 91 of 99 multi-carded, accumulating since 2026-04-28 —
 * and lookup_business has been retrieving against it that whole time, returning
 * whichever version ranks highest rather than whichever is current.
 * The control case is wd-citizens: 940 docs / 940 POPIDs, ratio exactly 1.00,
 * because buildCitizenCards has PATCHed in place since S223. Stacking is the
 * absence of PATCH, not a property of the write path.
 *   1. PATCH-if-exists / POST-if-new keyed on metadata.biz_id.
 *   2. --wipe-old classifies DELETE status (404 = already gone = success) and
 *      ABORTS before the write pass on any unresolved failure.
 *   3. --reconcile collapses each BIZ_ID to its NEWEST doc.
 * Keep-NEWEST matches engine.110 and diverges from dedupWdCitizens' keep-oldest
 * for the same reason: without a PATCH history only the newest doc holds current
 * content, so keeping oldest would preserve an April card and delete the fresh
 * one. The map and the reconcile must agree on newest or the pair is incoherent.
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
// engine.111: escape hatch to force a write pass over a partial wipe. Off by
// default — the silent version of this is what stacked the layer to 4.39x.
var ALLOW_PARTIAL_WIPE = process.argv.includes('--allow-partial-wipe');
// engine.111: reconcile mode — collapse each BIZ_ID to its newest doc. Dry-run
// unless --apply; every delete is logged to output/ first for reversibility.
var RECONCILE = process.argv.includes('--reconcile');

var nameArg = process.argv.indexOf('--name');
var NAME_FILTER = nameArg > 0 ? process.argv[nameArg + 1] : null;

// --biz BIZ-XXXXX[,BIZ-YYYYY,...] — exact-match filter on BIZ_ID. Single value or
// comma-separated list (engine.27 Phase A, S242: wd-cards daemon dispatches the
// changed-ID set in one rebuild rather than N per-ID spawns).
var bizArg = process.argv.indexOf('--biz');
var BIZ_FILTER = bizArg > 0 ? process.argv[bizArg + 1] : null;
var BIZ_SET = BIZ_FILTER
  ? new Set(BIZ_FILTER.split(',').map(function (s) { return s.trim(); }).filter(Boolean))
  : null;

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
  // engine.92 (S349): transport consolidated into lib/supermemory.js — v4
  // hybrid, limit 5, fail-soft [] — identical semantics to the removed copy.
  return require('../lib/supermemory').search(query, {
    containerTag: container, searchMode: 'hybrid', limit: 5, apiVersion: 'v4'
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// WRITE — /v3/documents with dual tags + metadata, retry-on-401/429
// ═══════════════════════════════════════════════════════════════════════════
// Rate-limit hardening (S182): bulk applies of 52+ writes back-to-back can
// trip Supermemory's rolling-window cap, surfacing as 401 "userId or orgId
// not found" rather than 429 — defensive retry on either with 8s backoff,
// up to 3 retries. Combined with bumped inter-write sleep this kept a 52-row
// W1 bulk run alive after partial failure.

var WRITE_MAX_RETRIES = 3;
var WRITE_RETRY_SLEEP_MS = 8000;

async function writeMemory(content, biz, bizIdMap) {
  var meta = {
    title: biz.name,
    biz_id: biz.bizId,
    source: 'buildBusinessCards.js'
  };
  var body = {
    content: content,
    containerTags: [CONTAINER_TAG, DOMAIN_TAG],
    metadata: meta
  };
  // engine.111: PATCH-if-exists / POST-if-new (one doc per BIZ_ID invariant).
  // bizIdMap is built once per APPLY run and holds the NEWEST doc per BIZ_ID.
  var existing = bizIdMap && bizIdMap.get(biz.bizId);
  var method = existing ? 'PATCH' : 'POST';
  var apiPath = existing ? '/v3/documents/' + existing.id : '/v3/documents';
  for (var attempt = 0; attempt <= WRITE_MAX_RETRIES; attempt++) {
    var r = await smRequest(method, apiPath, body);
    if (r.status >= 200 && r.status < 300) {
      return { status: r.status, id: r.body && r.body.id, op: method };
    }
    if ((r.status === 401 || r.status === 429) && attempt < WRITE_MAX_RETRIES) {
      console.log('  [retry] ' + method + ' got ' + r.status + ' (rate-limit?); sleeping ' + (WRITE_RETRY_SLEEP_MS / 1000) + 's, attempt ' + (attempt + 2) + '/' + (WRITE_MAX_RETRIES + 1));
      await smSleep(WRITE_RETRY_SLEEP_MS);
      continue;
    }
    throw new Error('HTTP ' + r.status + ' on ' + method + ' ' + apiPath + ': ' + (typeof r.body === 'string' ? r.body : JSON.stringify(r.body)));
  }
  throw new Error('writeMemory exhausted ' + (WRITE_MAX_RETRIES + 1) + ' attempts');
}

// ═══════════════════════════════════════════════════════════════════════════
// BIZ_ID → DOC MAP + RECONCILE (engine.111, mirrors engine.110)
// ═══════════════════════════════════════════════════════════════════════════
// Keys on metadata.biz_id — census 2026-08-16 confirmed it present on 435/435
// live docs, and list rows carry no content, so metadata-keying is both complete
// and cheaper than the content extraction the wipe path uses on legacy cards.
async function buildBizIdMap() {
  console.log('[buildBusinessCards] enumerating ' + DOMAIN_TAG + ' for BIZ_ID→id map…');
  var map = new Map();
  var dupes = [];
  var total = 0;
  var page = 1;
  while (true) {
    var r = await smRequest('POST', '/v3/documents/list', {
      containerTags: [DOMAIN_TAG], limit: 200, page: page
    });
    if (r.status !== 200) throw new Error('BIZ_ID-map list failed at page ' + page + ': ' + r.status);
    var mems = (r.body && r.body.memories) || [];
    for (var i = 0; i < mems.length; i++) {
      var m = mems[i];
      var biz = m.metadata && m.metadata.biz_id;
      total++;
      if (!biz) continue;
      var rec = { id: m.id, createdAt: m.createdAt, bizId: biz };
      var prev = map.get(biz);
      if (!prev) { map.set(biz, rec); continue; }
      if (new Date(rec.createdAt) > new Date(prev.createdAt)) { map.set(biz, rec); dupes.push(prev); }
      else { dupes.push(rec); }
    }
    if (mems.length < 200) break;
    page++;
    if (page > 30) throw new Error('BIZ_ID-map pagination overflow (>30 pages)');
  }
  console.log('[buildBusinessCards] BIZ_ID→id map: ' + map.size + ' unique BIZ_IDs across ' +
    total + ' docs (' + dupes.length + ' surplus above the one-per-business invariant)');
  return { map: map, dupes: dupes, total: total };
}

async function reconcileBusinessCards() {
  var enumerated = await buildBizIdMap();
  var dupes = enumerated.dupes;

  console.log('\n[reconcile] mode: ' + (APPLY ? 'APPLY' : 'DRY-RUN'));
  console.log('[reconcile] docs: ' + enumerated.total +
    ' | businesses: ' + enumerated.map.size +
    ' | surplus to delete: ' + dupes.length);

  if (dupes.length === 0) {
    console.log('[reconcile] one-doc-per-BIZ_ID invariant already holds — nothing to do.');
    return;
  }

  var byBiz = {};
  dupes.forEach(function (d) { (byBiz[d.bizId] = byBiz[d.bizId] || []).push(d); });
  var bizIds = Object.keys(byBiz).sort();
  console.log('[reconcile] businesses holding surplus: ' + bizIds.length);
  bizIds.slice(0, 10).forEach(function (b) {
    var keep = enumerated.map.get(b);
    console.log('  ' + b + ' — keep ' + String(keep.createdAt).slice(0, 10) +
      ' | delete ' + byBiz[b].length + ' older');
  });
  if (bizIds.length > 10) console.log('  … +' + (bizIds.length - 10) + ' more businesses');

  if (!APPLY) {
    console.log('\n[reconcile] DRY-RUN — no deletes issued. Re-run with --reconcile --apply to execute.');
    return;
  }

  var fs = require('fs');
  var path = require('path');
  var stamp = new Date().toISOString().replace(/[:.]/g, '-');
  var logPath = path.join('/root/GodWorld/output', 'wd-business-reconcile-' + stamp + '.log');
  fs.writeFileSync(logPath, dupes.map(function (d) {
    return [d.bizId, d.id, d.createdAt, 'keep=' + enumerated.map.get(d.bizId).id].join('\t');
  }).join('\n') + '\n', 'utf8');
  console.log('[reconcile] delete manifest written: ' + logPath);

  var deleted = 0;
  var alreadyGone = 0;
  var failures = [];
  for (var i = 0; i < dupes.length; i++) {
    var res = await deleteDoc(dupes[i].id);
    if (res.outcome === 'deleted') deleted++;
    else if (res.outcome === 'already-gone') alreadyGone++;
    else failures.push({ id: dupes[i].id, bizId: dupes[i].bizId, status: res.status });
    if ((i + 1) % 25 === 0 || i === dupes.length - 1) {
      console.log('  DELETE ' + (i + 1) + '/' + dupes.length +
        ' — deleted=' + deleted + ' already-gone=' + alreadyGone + ' failed=' + failures.length);
    }
    await smSleep(250);
  }

  console.log('\n[reconcile] deleted: ' + deleted + ' | already-gone: ' + alreadyGone +
    ' | failed: ' + failures.length);
  if (failures.length > 0) {
    failures.slice(0, 20).forEach(function (f) {
      console.error('  [FAIL] ' + f.bizId + ' ' + f.id + ' → HTTP ' + f.status);
    });
    console.error('[GATE-FAIL] reconcile left ' + failures.length +
      ' surplus doc(s) in place; manifest: ' + logPath);
    process.exit(1);
  }
  console.log('[reconcile] one-doc-per-BIZ_ID invariant restored.');
}

// engine.111: single DELETE with status classification, shared by wipe-old and
// reconcile. 404 = already absent, which satisfies the caller's intent.
async function deleteDoc(id) {
  var del = await smRequest('DELETE', '/v3/documents/' + id, null);
  if (del.status === 204 || del.status === 200) return { outcome: 'deleted', status: del.status };
  if (del.status === 404) return { outcome: 'already-gone', status: 404 };
  if (del.status === 409) {
    await smSleep(20000);
    var del2 = await smRequest('DELETE', '/v3/documents/' + id, null);
    if (del2.status === 204 || del2.status === 200) return { outcome: 'deleted', status: del2.status };
    if (del2.status === 404) return { outcome: 'already-gone', status: 404 };
    return { outcome: 'failed', status: del2.status };
  }
  return { outcome: 'failed', status: del.status };
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
  var alreadyGone = 0;
  var failures = [];
  for (var k = 0; k < matches.length; k++) {
    var res = await deleteDoc(matches[k].id);
    if (res.outcome === 'deleted') deleted++;
    else if (res.outcome === 'already-gone') alreadyGone++;
    else failures.push({ id: matches[k].id, bizId: matches[k].bizId, status: res.status });
    if ((k + 1) % 25 === 0 || k === matches.length - 1) {
      console.log('  DELETE ' + (k + 1) + '/' + matches.length +
        ' — deleted=' + deleted + ' already-gone=' + alreadyGone + ' failed=' + failures.length);
    }
    await smSleep(200);
  }
  console.log('[wipe-old] DELETE results: ' + deleted + ' deleted / ' + alreadyGone +
    ' already-gone / ' + failures.length + ' failed');
  // engine.111: previously this counted `failed` and returned; main() printed the
  // number and wrote anyway, so each undeleted doc became a stacked version.
  // Failures now carry their HTTP status and abort BEFORE the write pass.
  if (failures.length > 0) {
    failures.slice(0, 20).forEach(function (f) {
      console.error('  [FAIL] wipe ' + f.bizId + ' ' + f.id + ' → HTTP ' + f.status);
    });
    if (failures.length > 20) console.error('  … +' + (failures.length - 20) + ' more');
    if (!ALLOW_PARTIAL_WIPE) {
      throw new Error('wipe-old: ' + failures.length + ' of ' + matches.length +
        ' DELETEs failed. Refusing to write on top of a partial wipe — that is what stacked ' +
        'this layer to 4.39x. Re-run to retry, or pass --allow-partial-wipe to override.');
    }
    console.error('[wipe-old] --allow-partial-wipe set — proceeding over ' + failures.length +
      ' failed delete(s); expect duplicate cards for those businesses.');
  }
  return {
    candidates: ids.length, matched: matches.length,
    deleted: deleted, alreadyGone: alreadyGone, failed: failures.length
  };
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
  // engine.111: reconcile is a standalone legacy-state pass — reads no sheet and
  // writes no cards, so it returns before the build path.
  if (RECONCILE) {
    await reconcileBusinessCards();
    return;
  }

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

    if (BIZ_SET && !BIZ_SET.has(biz.bizId)) continue;
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
    console.log('[buildBusinessCards] --wipe-old not set — un-tagged legacy cards are left in place; ' +
      'tagged cards are PATCHed in place, not duplicated.');
  }

  // engine.111: built after the wipe so it reflects post-delete state. This is
  // what makes a rebuild idempotent instead of additive.
  var bizIdMap = null;
  if (APPLY) {
    bizIdMap = (await buildBizIdMap()).map;
  }

  // Process each business
  var written = 0;
  var patched = 0;
  var posted = 0;
  var errors = 0;
  var failureList = [];
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
        var wr = await writeMemory(card, biz, bizIdMap);
        written++;
        if (wr.op === 'PATCH') patched++; else posted++;
        if ((bi + 1) % 10 === 0) {
          console.log('  ... ' + (bi + 1) + '/' + businesses.length + ' written (' + withAppearances + ' with appearances)');
        }
      } catch (e) {
        console.error('[FAIL] ' + biz.name + ': ' + e.message);
        failureList.push({ bizId: biz.bizId, name: biz.name, error: e.message });
        errors++;
      }
      await smSleep(500); // bumped from 300ms — survived 52-row bulk apply post-S182
    }
  }

  console.log('');
  console.log('[DONE] Businesses: ' + businesses.length +
    ' | With appearances: ' + withAppearances +
    ' | Written: ' + written +
    (APPLY ? ' (PATCH: ' + patched + ' / POST: ' + posted + ')' : '') +
    ' | Errors: ' + errors);
  console.log('[FILTER] Raw bay-tribune hits: ' + rawAppearancesTotal +
    ' | Filtered out: ' + filteredOutTotal +
    ' | Kept: ' + (rawAppearancesTotal - filteredOutTotal));
  if (wipeReport) {
    console.log('[WIPE-OLD] candidates: ' + wipeReport.candidates +
      ' | matched (BIZ_ID-scoped): ' + wipeReport.matched +
      ' | deleted: ' + wipeReport.deleted +
      ' | already-gone: ' + wipeReport.alreadyGone +
      ' | failed: ' + wipeReport.failed);
  }

  // engine.111: errors-gate — same contract buildCitizenCards has carried since
  // canon.3 T6, so wdCardsDaemon and /post-publish can detect a partial failure
  // instead of grepping stdout.
  if (errors > 0) {
    console.error('\n[GATE-FAIL] ' + errors + ' business card write(s) failed:');
    failureList.forEach(function (f) {
      console.error('  ' + f.bizId + ' ' + f.name + ' — ' + f.error);
    });
    process.exit(1);
  }
}

main().catch(function(e) { console.error('[FATAL]', e); process.exit(1); });
