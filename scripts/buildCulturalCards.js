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

var nameArg = process.argv.indexOf('--name');
var NAME_FILTER = nameArg > 0 ? process.argv[nameArg + 1] : null;

var culArg = process.argv.indexOf('--cul');
var CUL_FILTER = culArg > 0 ? process.argv[culArg + 1] : null;

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

async function writeMemory(content, fig) {
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

    if (CUL_FILTER && fig.culId !== CUL_FILTER) continue;
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
    console.log('[buildCulturalCards] --wipe-old not set — writes will land alongside any existing un-tagged cards.');
  }

  // Process each figure
  var written = 0;
  var errors = 0;
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
        await writeMemory(card, fig);
        written++;
        if ((fi + 1) % 10 === 0) {
          console.log('  ... ' + (fi + 1) + '/' + figures.length + ' written (' + withAppearances + ' with appearances)');
        }
      } catch (e) {
        console.error('[FAIL] ' + fig.name + ' (' + fig.culId + '): ' + e.message);
        errors++;
      }
      await smSleep(500);
    }
  }

  console.log('');
  console.log('[DONE] Cultural figures: ' + figures.length +
    ' | With appearances: ' + withAppearances +
    ' | Written: ' + written +
    ' | Errors: ' + errors);
  console.log('[FILTER] Raw bay-tribune hits: ' + rawAppearancesTotal +
    ' | Filtered out: ' + filteredOutTotal +
    ' | Kept: ' + (rawAppearancesTotal - filteredOutTotal));
  if (wipeReport) {
    console.log('[WIPE-OLD] candidates: ' + wipeReport.candidates +
      ' | matched (CUL-ID-scoped): ' + wipeReport.matched +
      ' | deleted: ' + wipeReport.deleted +
      ' | failed: ' + wipeReport.failed);
  }
}

main().catch(function(e) { console.error('[FATAL]', e); process.exit(1); });
