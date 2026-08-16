#!/usr/bin/env node
/**
 * buildCulturalCards.js — Compile per-cultural-figure wiki cards into world-data
 * [engine/sheet] — S182 unified ingest rebuild (Task W3)
 *
 * Reads Cultural_Ledger for fame/domain profile, searches bay-tribune for
 * appearances, writes a compiled cultural card to world-data with
 * containerTags ['world-data', 'wd-cultural'].
 *
 * The GodWorld MCP lookup_cultural tool (Task M3) queries these cards.
 *
 * Coexistence note: cultural figures often also have wd-citizens cards
 * (Beverly Hayes is both citizen AND cultural figure). The two cards have
 * different content header shapes:
 *   wd-citizens   header: "Beverly Hayes (POP-00772)"
 *   wd-cultural   header: "Beverly Hayes (CUL-XXXXXXXX)"
 * R1's POPID-content-scoped wipe (\(POP-\d+\)) cannot match a CUL- header,
 * so the two domains stay isolated. The optional UniverseLink line writes
 * "Universe link: POP-XXXXX" without parens to stay outside R1's regex.
 *
 * Usage:
 *   node scripts/buildCulturalCards.js --dry-run                          # preview
 *   node scripts/buildCulturalCards.js --apply                            # write all (no wipe)
 *   node scripts/buildCulturalCards.js --apply --wipe-old                 # wipe + write
 *   node scripts/buildCulturalCards.js --apply --name "Beverly Hayes"     # one by name
 *   node scripts/buildCulturalCards.js --apply --cul CUL-3913E3E5         # one by CUL-ID
 *   node scripts/buildCulturalCards.js --reconcile                        # dry-run dedupe report
 *   node scripts/buildCulturalCards.js --reconcile --apply                # delete surplus cards
 *   node scripts/buildCulturalCards.js --apply --wipe-old --allow-partial-wipe
 *
 * engine.110 (S376) — one-doc-per-CUL-ID invariant. Before this, writes were
 * POST-only and `--wipe-old` counted DELETE failures without acting on them, so
 * every partial wipe stacked another version: the live layer held 95 docs for 46
 * figures (38 figures multi-carded, 49 surplus), with April-28 cards surviving
 * every wipe since. Three changes close it:
 *   1. PATCH-if-exists / POST-if-new, keyed on metadata.cul_id — a rebuild now
 *      refreshes the card in place instead of adding a version. Census confirmed
 *      metadata.cul_id present on 95/95 live docs, so the map sees every doc;
 *      list rows carry no content, so metadata-keying also avoids a GET pass.
 *   2. `--wipe-old` DELETE failures are classified (404 = already gone = success)
 *      and any unresolved failure ABORTS before the write pass. Writing on top of
 *      a half-completed wipe is precisely what built the stack.
 *   3. `--reconcile` collapses each CUL-ID to its NEWEST doc.
 * Keep-NEWEST is deliberate and diverges from dedupWdCitizens.js's keep-oldest:
 * that script's oldest-id rule is safe because buildCitizenCards has PATCHed in
 * place since S223, so its oldest doc carries fresh content. wd-cultural has
 * never had PATCH, so here only the newest doc holds current content — keeping
 * oldest would delete the fresh card and preserve an April one. The map below
 * keys on newest for the same reason; map and reconcile MUST agree.
 *
 * Write payload: /v3/documents POST with
 *   containerTags: ['world-data', 'wd-cultural']
 *   metadata: { title, cul_id, popid, source: 'buildCulturalCards.js' }
 *
 * Cultural_Ledger columns:
 *   A=Timestamp, B=CUL-ID, C=Name, D=RoleType, E=FameCategory,
 *   F=CulturalDomain, G=Status, H=UniverseLinks (POP-XXXXX),
 *   I=FirstSeenCycle, J=LastSeenCycle, K=MediaCount, L=FameScore,
 *   M=TrendTrajectory, N=FirstRefSource, O=MediaSpread, P=CityTier,
 *   Q=Neighborhood, R=Holiday, S=HolidayPriority, T=SportsSeason
 */

require('/root/GodWorld/lib/env');
var https = require('https');
var sheets = require('../lib/sheets');

var API_KEY = process.env.SUPERMEMORY_CC_API_KEY;
var CONTAINER_TAG = 'world-data';
var DOMAIN_TAG = 'wd-cultural';
var API_HOST = 'api.supermemory.ai';
var APPLY = process.argv.includes('--apply');
var WIPE_OLD = process.argv.includes('--wipe-old');
// engine.110: escape hatch so an operator can still force a write pass over a
// partial wipe. Off by default — the silent version of this was the defect.
var ALLOW_PARTIAL_WIPE = process.argv.includes('--allow-partial-wipe');
// engine.110: reconcile mode — collapse each CUL-ID to its newest doc. Dry-run
// unless --apply is also passed; every delete is logged to output/ for reversal.
var RECONCILE = process.argv.includes('--reconcile');

var nameArg = process.argv.indexOf('--name');
var NAME_FILTER = nameArg > 0 ? process.argv[nameArg + 1] : null;

// --cul CUL-XXXXXX[,CUL-YYYYYY,...] — exact-match filter on CUL-ID. Single value or
// comma-separated list (engine.27 Phase A, S242: wd-cards daemon dispatches the
// changed-ID set in one rebuild rather than N per-ID spawns).
var culArg = process.argv.indexOf('--cul');
var CUL_FILTER = culArg > 0 ? process.argv[culArg + 1] : null;
var CUL_SET = CUL_FILTER
  ? new Set(CUL_FILTER.split(',').map(function (s) { return s.trim(); }).filter(Boolean))
  : null;

var limitArg = process.argv.indexOf('--limit');
var LIMIT = limitArg > 0 ? parseInt(process.argv[limitArg + 1], 10) : 999;

// Wipe-old GET pass tuning (matches W1 / W2)
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
  // engine.92 (S349): transport consolidated into lib/supermemory.js — v4
  // hybrid, limit 5, fail-soft [] — identical semantics to the removed copy.
  return require('../lib/supermemory').search(query, {
    containerTag: container, searchMode: 'hybrid', limit: 5, apiVersion: 'v4'
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// WRITE — /v3/documents with dual tags + metadata, retry-on-401/429
// ═══════════════════════════════════════════════════════════════════════════

var WRITE_MAX_RETRIES = 3;
var WRITE_RETRY_SLEEP_MS = 8000;

async function writeMemory(content, fig, culIdMap) {
  var meta = {
    title: fig.name,
    cul_id: fig.culId,
    source: 'buildCulturalCards.js'
  };
  if (fig.popId) meta.popid = fig.popId;
  var body = {
    content: content,
    containerTags: [CONTAINER_TAG, DOMAIN_TAG],
    metadata: meta
  };
  // engine.110: PATCH-if-exists / POST-if-new (one doc per CUL-ID invariant),
  // ported from buildCitizenCards.js S223. culIdMap is built once per APPLY run
  // by buildCulIdMap(); it holds the NEWEST doc id per CUL-ID — see header.
  // Without this a rebuild POSTs a second doc whenever the wipe misses one.
  var existing = culIdMap && culIdMap.get(fig.culId);
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
// CUL-ID → DOC MAP — enumerate wd-cultural to enable PATCH-in-place writes
// ═══════════════════════════════════════════════════════════════════════════
// engine.110. Built once per APPLY run and reused by --reconcile. Keys on
// metadata.cul_id (census 2026-08-16: present on 95/95 live docs, and list rows
// carry no content — so metadata-keying is both complete and one pass cheaper
// than the content-scoped extraction the wipe path uses on un-tagged legacy).
// Keeps the NEWEST doc per CUL-ID; see header for why this diverges from
// dedupWdCitizens.js's keep-oldest. `dupes` carries every superseded doc so
// reconcile can act on the same grouping the writer trusts.
async function buildCulIdMap() {
  console.log('[buildCulturalCards] enumerating ' + DOMAIN_TAG + ' for CUL-ID→id map…');
  var map = new Map();
  var dupes = [];
  var total = 0;
  var page = 1;
  while (true) {
    var r = await smRequest('POST', '/v3/documents/list', {
      containerTags: [DOMAIN_TAG], limit: 200, page: page
    });
    if (r.status !== 200) throw new Error('CUL-ID-map list failed at page ' + page + ': ' + r.status);
    var mems = (r.body && r.body.memories) || [];
    for (var i = 0; i < mems.length; i++) {
      var m = mems[i];
      var cul = m.metadata && m.metadata.cul_id;
      total++;
      if (!cul) continue;
      var rec = { id: m.id, createdAt: m.createdAt, culId: cul };
      var prev = map.get(cul);
      if (!prev) { map.set(cul, rec); continue; }
      // Keep newest; the loser is a surplus doc.
      if (new Date(rec.createdAt) > new Date(prev.createdAt)) {
        map.set(cul, rec);
        dupes.push(prev);
      } else {
        dupes.push(rec);
      }
    }
    if (mems.length < 200) break;
    page++;
    if (page > 20) throw new Error('CUL-ID-map pagination overflow (>20 pages)');
  }
  console.log('[buildCulturalCards] CUL-ID→id map: ' + map.size + ' unique CUL-IDs across ' +
    total + ' docs (' + dupes.length + ' surplus docs above the one-per-figure invariant)');
  return { map: map, dupes: dupes, total: total };
}

// ═══════════════════════════════════════════════════════════════════════════
// RECONCILE — collapse each CUL-ID to its newest doc
// ═══════════════════════════════════════════════════════════════════════════
// engine.110. Legacy-state pass for the versions already stacked; PATCH-if-exists
// above is what stops new ones. Dry-run unless --apply. Every delete is written
// to output/wd-cultural-reconcile-<ts>.log before it happens, so the set is
// recoverable from the log if a delete turns out to have been wrong.
async function reconcileCulturalCards() {
  var enumerated = await buildCulIdMap();
  var dupes = enumerated.dupes;

  console.log('\n[reconcile] mode: ' + (APPLY ? 'APPLY' : 'DRY-RUN'));
  console.log('[reconcile] docs: ' + enumerated.total +
    ' | figures: ' + enumerated.map.size +
    ' | surplus to delete: ' + dupes.length);

  if (dupes.length === 0) {
    console.log('[reconcile] one-doc-per-CUL-ID invariant already holds — nothing to do.');
    return;
  }

  var byCul = {};
  dupes.forEach(function (d) { (byCul[d.culId] = byCul[d.culId] || []).push(d); });
  var culs = Object.keys(byCul).sort();
  console.log('[reconcile] figures holding surplus: ' + culs.length);
  culs.slice(0, 10).forEach(function (c) {
    var keep = enumerated.map.get(c);
    console.log('  ' + c + ' — keep ' + String(keep.createdAt).slice(0, 10) +
      ' | delete ' + byCul[c].map(function (d) { return String(d.createdAt).slice(0, 10); }).join(', '));
  });
  if (culs.length > 10) console.log('  … +' + (culs.length - 10) + ' more figures');

  if (!APPLY) {
    console.log('\n[reconcile] DRY-RUN — no deletes issued. Re-run with --reconcile --apply to execute.');
    return;
  }

  var fs = require('fs');
  var path = require('path');
  var stamp = new Date().toISOString().replace(/[:.]/g, '-');
  var logPath = path.join('/root/GodWorld/output', 'wd-cultural-reconcile-' + stamp + '.log');
  var logLines = dupes.map(function (d) {
    return [d.culId, d.id, d.createdAt, 'keep=' + enumerated.map.get(d.culId).id].join('\t');
  });
  fs.writeFileSync(logPath, logLines.join('\n') + '\n', 'utf8');
  console.log('[reconcile] delete manifest written: ' + logPath);

  var deleted = 0;
  var alreadyGone = 0;
  var failures = [];
  for (var i = 0; i < dupes.length; i++) {
    var res = await deleteDoc(dupes[i].id);
    if (res.outcome === 'deleted') deleted++;
    else if (res.outcome === 'already-gone') alreadyGone++;
    else failures.push({ id: dupes[i].id, culId: dupes[i].culId, status: res.status });
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
      console.error('  [FAIL] ' + f.culId + ' ' + f.id + ' → HTTP ' + f.status);
    });
    console.error('[GATE-FAIL] reconcile left ' + failures.length +
      ' surplus doc(s) in place; manifest: ' + logPath);
    process.exit(1);
  }
  console.log('[reconcile] one-doc-per-CUL-ID invariant restored.');
}

// ═══════════════════════════════════════════════════════════════════════════
// WIPE-OLD — CUL-ID-content-scoped DELETE
// ═══════════════════════════════════════════════════════════════════════════
// Filter: enumerate world-data, for each doc extract "(CUL-XXXXXXXX)" header
// from content; DELETE if CUL-ID is in the target write set. Cannot collide
// with citizen wipe (POP-) or business wipe (BIZ-) — pattern is unique to
// wd-cultural by construction. Inventory confirms green-field for wd-cultural.

function culIdFromContent(content) {
  if (!content) return null;
  var m = content.match(/\(CUL-([A-F0-9]{6,})\)/i);
  return m ? 'CUL-' + m[1].toUpperCase() : null;
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

async function wipeOldCulturalCards(figures) {
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

  var allowedCulIds = {};
  figures.forEach(function(f) { allowedCulIds[f.culId] = true; });
  console.log('[wipe-old] target CUL-ID set size: ' + Object.keys(allowedCulIds).length);

  console.log('[wipe-old] GET pass to extract CUL-ID per doc (concurrency=' + WIPE_GET_CONCURRENCY + ')');
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
      var culId = culIdFromContent(content);
      if (culId && allowedCulIds[culId]) {
        matches.push({ id: results[j].id, culId: culId });
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
    else failures.push({ id: matches[k].id, culId: matches[k].culId, status: res.status });
    if ((k + 1) % 25 === 0 || k === matches.length - 1) {
      console.log('  DELETE ' + (k + 1) + '/' + matches.length +
        ' — deleted=' + deleted + ' already-gone=' + alreadyGone + ' failed=' + failures.length);
    }
    await smSleep(200);
  }
  console.log('[wipe-old] DELETE results: ' + deleted + ' deleted / ' + alreadyGone +
    ' already-gone / ' + failures.length + ' failed');
  // engine.110: the defect. Pre-fix this counted `failed` and returned; main()
  // logged the number and wrote anyway, so every undeleted doc became a stacked
  // version. Failures are now itemised with their HTTP status (previously the
  // status was discarded, which is why "14 failed" was never diagnosable) and
  // abort the run BEFORE the write pass — matching the emptyAfterRetry refusal
  // above. 404 is NOT a failure: the doc is gone, which is the goal.
  if (failures.length > 0) {
    failures.slice(0, 20).forEach(function (f) {
      console.error('  [FAIL] wipe ' + f.culId + ' ' + f.id + ' → HTTP ' + f.status);
    });
    if (failures.length > 20) console.error('  … +' + (failures.length - 20) + ' more');
    if (!ALLOW_PARTIAL_WIPE) {
      throw new Error('wipe-old: ' + failures.length + ' of ' + matches.length +
        ' DELETEs failed. Refusing to write on top of a partial wipe — that is what stacked ' +
        'the card layer. Re-run to retry, or pass --allow-partial-wipe to override deliberately.');
    }
    console.error('[wipe-old] --allow-partial-wipe set — proceeding over ' + failures.length +
      ' failed delete(s); expect duplicate cards for those figures.');
  }
  return {
    candidates: ids.length, matched: matches.length,
    deleted: deleted, alreadyGone: alreadyGone, failed: failures.length
  };
}

// engine.110: single DELETE with status classification, shared by wipe-old and
// reconcile. 404 = the document is already absent, which satisfies the caller's
// intent — counting it as a failure would turn a benign race into a hard stop.
// 409 keeps the pre-existing 20s indexing-conflict retry.
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
// BUILD CULTURAL CARD
// ═══════════════════════════════════════════════════════════════════════════

function clean(s) {
  return (s == null ? '' : String(s)).trim();
}

function indexHeader(headers, name) {
  for (var i = 0; i < headers.length; i++) {
    if ((headers[i] || '').trim() === name) return i;
  }
  return -1;
}

function buildCard(fig, appearances) {
  var lines = [];

  // Header — Name (CUL-ID). CUL-ID is the wipe-extractable primary key.
  lines.push(fig.name + ' (' + fig.culId + ')');

  // Identity line
  var headerParts = [];
  if (fig.neighborhood) headerParts.push('Neighborhood: ' + fig.neighborhood);
  if (fig.culturalDomain) headerParts.push('Domain: ' + fig.culturalDomain);
  if (fig.fameCategory) headerParts.push('Category: ' + fig.fameCategory);
  if (fig.cityTier) headerParts.push('Tier: ' + fig.cityTier);
  if (headerParts.length) lines.push(headerParts.join(' | '));

  // Activity line
  var actParts = [];
  if (fig.firstSeenCycle && fig.lastSeenCycle) {
    actParts.push('Active: cycles ' + fig.firstSeenCycle + '-' + fig.lastSeenCycle);
  }
  if (fig.fameScore) actParts.push('Fame score: ' + fig.fameScore);
  if (fig.trendTrajectory) actParts.push('Trend: ' + fig.trendTrajectory);
  if (fig.mediaCount) actParts.push('Media mentions: ' + fig.mediaCount);
  if (actParts.length) lines.push(actParts.join(' | '));

  // Cross-reference line — POP-XXXXX without parens (stays outside R1's wipe regex)
  var refParts = [];
  if (fig.popId) refParts.push('Universe link: ' + fig.popId);
  if (fig.roleType) refParts.push('Role: ' + fig.roleType);
  if (fig.status) refParts.push('Status: ' + fig.status);
  if (refParts.length) lines.push(refParts.join(' | '));

  // Spread / context line
  var ctxParts = [];
  if (fig.mediaSpread) ctxParts.push('Spread: ' + fig.mediaSpread);
  if (fig.firstRefSource) ctxParts.push('First ref: ' + fig.firstRefSource);
  if (fig.sportsSeason) ctxParts.push('Season: ' + fig.sportsSeason);
  if (ctxParts.length) lines.push(ctxParts.join(' | '));

  // Appearances from bay-tribune (full-name post-filtered)
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
  // engine.110: reconcile is a standalone legacy-state pass over the card layer
  // — it reads no sheet and writes no cards, so it returns before the build path.
  if (RECONCILE) {
    await reconcileCulturalCards();
    return;
  }

  console.log('[buildCulturalCards] Mode: ' + (APPLY ? 'APPLY' : 'DRY-RUN'));
  if (NAME_FILTER) console.log('[buildCulturalCards] Name filter: ' + NAME_FILTER);
  if (CUL_FILTER) console.log('[buildCulturalCards] CUL-ID filter: ' + CUL_FILTER);
  if (LIMIT < 999) console.log('[buildCulturalCards] Limit: ' + LIMIT);
  console.log('');

  var data = await sheets.getSheetData('Cultural_Ledger');
  if (!data || data.length < 2) {
    console.error('No data in Cultural_Ledger');
    process.exit(1);
  }
  console.log('[buildCulturalCards] Cultural_Ledger rows: ' + (data.length - 1));

  var headers = data[0];
  var idx = {
    culId: indexHeader(headers, 'CUL-ID'),
    name: indexHeader(headers, 'Name'),
    roleType: indexHeader(headers, 'RoleType'),
    fameCategory: indexHeader(headers, 'FameCategory'),
    culturalDomain: indexHeader(headers, 'CulturalDomain'),
    status: indexHeader(headers, 'Status'),
    universeLinks: indexHeader(headers, 'UniverseLinks'),
    firstSeenCycle: indexHeader(headers, 'FirstSeenCycle'),
    lastSeenCycle: indexHeader(headers, 'LastSeenCycle'),
    mediaCount: indexHeader(headers, 'MediaCount'),
    fameScore: indexHeader(headers, 'FameScore'),
    trendTrajectory: indexHeader(headers, 'TrendTrajectory'),
    firstRefSource: indexHeader(headers, 'FirstRefSource'),
    mediaSpread: indexHeader(headers, 'MediaSpread'),
    cityTier: indexHeader(headers, 'CityTier'),
    neighborhood: indexHeader(headers, 'Neighborhood'),
    sportsSeason: indexHeader(headers, 'SportsSeason')
  };
  if (idx.culId < 0 || idx.name < 0) {
    console.error('Cultural_Ledger missing CUL-ID or Name column');
    process.exit(1);
  }

  // Build cultural records
  var figures = [];
  for (var i = 1; i < data.length; i++) {
    var r = data[i];
    var culId = clean(r[idx.culId]);
    var name = clean(r[idx.name]);
    if (!culId || !name) continue;

    var fig = {
      culId: culId,
      name: name,
      roleType: clean(r[idx.roleType]),
      fameCategory: clean(r[idx.fameCategory]),
      culturalDomain: clean(r[idx.culturalDomain]),
      status: clean(r[idx.status]),
      popId: clean(r[idx.universeLinks]),
      firstSeenCycle: clean(r[idx.firstSeenCycle]),
      lastSeenCycle: clean(r[idx.lastSeenCycle]),
      mediaCount: clean(r[idx.mediaCount]),
      fameScore: clean(r[idx.fameScore]),
      trendTrajectory: clean(r[idx.trendTrajectory]),
      firstRefSource: clean(r[idx.firstRefSource]),
      mediaSpread: clean(r[idx.mediaSpread]),
      cityTier: clean(r[idx.cityTier]),
      neighborhood: clean(r[idx.neighborhood]),
      sportsSeason: clean(r[idx.sportsSeason])
    };

    if (CUL_SET && !CUL_SET.has(fig.culId)) continue;
    if (NAME_FILTER && name.toLowerCase().indexOf(NAME_FILTER.toLowerCase()) < 0) continue;

    figures.push(fig);
  }

  console.log('[buildCulturalCards] Cultural figures matched: ' + figures.length);
  if (LIMIT < figures.length) {
    figures = figures.slice(0, LIMIT);
    console.log('[buildCulturalCards] Limited to: ' + figures.length);
  }

  // Wipe-old (W1 pattern)
  var wipeReport = null;
  if (APPLY && WIPE_OLD) {
    wipeReport = await wipeOldCulturalCards(figures);
    console.log('[wipe-old] sleeping ' + (WIPE_INDEXING_SLEEP_MS / 1000) + 's for async indexing to settle before writes');
    await smSleep(WIPE_INDEXING_SLEEP_MS);
  } else if (APPLY && !WIPE_OLD) {
    console.log('[buildCulturalCards] --wipe-old not set — un-tagged legacy cards are left in place; ' +
      'tagged cards are PATCHed in place, not duplicated.');
  }

  // engine.110: built after the wipe so it reflects post-delete state. This is
  // what makes a rebuild idempotent — every figure already carrying a card is
  // PATCHed rather than POSTed a second time.
  var culIdMap = null;
  if (APPLY) {
    culIdMap = (await buildCulIdMap()).map;
  }

  // Process each figure
  var written = 0;
  var patched = 0;
  var posted = 0;
  var errors = 0;
  var failureList = [];
  var withAppearances = 0;
  var rawAppearancesTotal = 0;
  var filteredOutTotal = 0;

  for (var fi = 0; fi < figures.length; fi++) {
    var fig = figures[fi];

    // Search bay-tribune for appearances. Hybrid + full-name post-filter.
    var rawResults = [];
    try {
      rawResults = await searchSupermemory(fig.name, 'bay-tribune');
    } catch (e) { /* no appearances — fine */ }

    var nameLc = fig.name.toLowerCase();
    var appearances = rawResults.filter(function(r) {
      return String(r.memory || '').toLowerCase().indexOf(nameLc) >= 0;
    });

    rawAppearancesTotal += rawResults.length;
    filteredOutTotal += (rawResults.length - appearances.length);
    if (appearances.length > 0) withAppearances++;

    var card = buildCard(fig, appearances);

    if (!APPLY) {
      console.log('--- ' + fig.name + ' (' + fig.culId + ') ---');
      console.log('PAYLOAD: containerTags=[' + CONTAINER_TAG + ', ' + DOMAIN_TAG + '] | metadata.title="' + fig.name + '" | metadata.cul_id="' + fig.culId + '"' + (fig.popId ? ' | metadata.popid="' + fig.popId + '"' : ''));
      console.log(card);
      console.log('  [' + appearances.length + ' appearances]');
      console.log('');
    } else {
      try {
        var wr = await writeMemory(card, fig, culIdMap);
        written++;
        if (wr.op === 'PATCH') patched++; else posted++;
        if ((fi + 1) % 10 === 0) {
          console.log('  ... ' + (fi + 1) + '/' + figures.length + ' written (' + withAppearances + ' with appearances)');
        }
      } catch (e) {
        console.error('[FAIL] ' + fig.name + ' (' + fig.culId + '): ' + e.message);
        failureList.push({ culId: fig.culId, name: fig.name, error: e.message });
        errors++;
      }
      await smSleep(500);
    }
  }

  console.log('');
  console.log('[DONE] Cultural figures: ' + figures.length +
    ' | With appearances: ' + withAppearances +
    ' | Written: ' + written +
    (APPLY ? ' (PATCH: ' + patched + ' / POST: ' + posted + ')' : '') +
    ' | Errors: ' + errors);
  console.log('[FILTER] Raw bay-tribune hits: ' + rawAppearancesTotal +
    ' | Filtered out: ' + filteredOutTotal +
    ' | Kept: ' + (rawAppearancesTotal - filteredOutTotal));
  if (wipeReport) {
    console.log('[WIPE-OLD] candidates: ' + wipeReport.candidates +
      ' | matched (CUL-ID-scoped): ' + wipeReport.matched +
      ' | deleted: ' + wipeReport.deleted +
      ' | already-gone: ' + wipeReport.alreadyGone +
      ' | failed: ' + wipeReport.failed);
  }

  // engine.110: errors-gate, same contract buildCitizenCards.js has carried since
  // canon.3 T6 — /post-publish Step 2a-cul and wdCardsDaemon dispatch this script
  // and had no way to detect a partial failure beyond grepping stdout.
  if (errors > 0) {
    console.error('\n[GATE-FAIL] ' + errors + ' cultural card write(s) failed:');
    failureList.forEach(function (f) {
      console.error('  ' + f.culId + ' ' + f.name + ' — ' + f.error);
    });
    process.exit(1);
  }
}

main().catch(function(e) { console.error('[FATAL]', e); process.exit(1); });
