#!/usr/bin/env node
/**
 * buildNeighborhoodCards.js — Compile per-neighborhood wiki cards into world-data
 * [engine/sheet] — S183 unified ingest rebuild (Task W4)
 *
 * Reads Neighborhood_Map (current state) + Neighborhood_Demographics
 * (population/education) + Business_Ledger + Simulation_Ledger to derive
 * NOTABLE BUSINESSES + NOTABLE CITIZENS per neighborhood, searches
 * bay-tribune for neighborhood-name appearances. Writes a compiled
 * neighborhood card to world-data with containerTags ['world-data',
 * 'wd-neighborhood'].
 *
 * The GodWorld MCP get_neighborhood_state tool (Task M4) queries these.
 *
 * Wipe-collision avoidance: NOTABLE entries write IDs WITHOUT parens
 * (e.g., "- BIZ-00035 — Joaquin's Bakery [Food & Bev, 12 emp]") so they
 * stay outside R1's \(POP-\d+\) and W1's \(BIZ-\d+\) wipe regexes. The
 * neighborhood card header is the bare neighborhood name (no ID), matching
 * the W2 org-name-scoped wipe pattern.
 *
 * Usage:
 *   node scripts/buildNeighborhoodCards.js --dry-run                      # preview
 *   node scripts/buildNeighborhoodCards.js --apply                        # write all (no wipe)
 *   node scripts/buildNeighborhoodCards.js --apply --wipe-old             # wipe + write
 *   node scripts/buildNeighborhoodCards.js --apply --name "Temescal"      # one by name
 *
 * Write payload: /v3/documents POST with
 *   containerTags: ['world-data', 'wd-neighborhood']
 *   metadata: { title, neighborhood, district, source: 'buildNeighborhoodCards.js' }
 *
 * Source columns:
 *   Neighborhood_Map: Cycle, Neighborhood, NoiseIndex, CrimeIndex,
 *     RetailVitality, EventAttractiveness, Sentiment, GentrificationPhase,
 *     DisplacementPressure, MedianIncome, MedianRent, WhitePopulationPct,
 *     HighEducationPct, MigrationFlow
 *   Neighborhood_Demographics: Neighborhood, Students, Adults, Seniors,
 *     Unemployed, Sick, SchoolQualityIndex, GraduationRate
 *   Business_Ledger: BIZ_ID, Name, Sector, Neighborhood, Employee_Count
 *   Simulation_Ledger: POPID, First, Last, Tier, RoleType, Neighborhood, UsageCount
 */

require('/root/GodWorld/lib/env');
var https = require('https');
var sheets = require('../lib/sheets');
var districtMap = require('../lib/districtMap');

var API_KEY = process.env.SUPERMEMORY_CC_API_KEY;
var CONTAINER_TAG = 'world-data';
var DOMAIN_TAG = 'wd-neighborhood';
var API_HOST = 'api.supermemory.ai';
var APPLY = process.argv.includes('--apply');
var WIPE_OLD = process.argv.includes('--wipe-old');

var nameArg = process.argv.indexOf('--name');
var NAME_FILTER = nameArg > 0 ? process.argv[nameArg + 1] : null;

var limitArg = process.argv.indexOf('--limit');
var LIMIT = limitArg > 0 ? parseInt(process.argv[limitArg + 1], 10) : 999;

var TOP_BUSINESSES = 5;
var TOP_CITIZENS = 5;

// Wipe-old GET pass tuning (matches W1/W2/W3)
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

async function writeMemory(content, nbh) {
  var meta = {
    title: nbh.name,
    neighborhood: nbh.name,
    source: 'buildNeighborhoodCards.js'
  };
  if (nbh.district) meta.district = nbh.district;
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
// WIPE-OLD — Neighborhood-name-content-scoped DELETE
// ═══════════════════════════════════════════════════════════════════════════

function nbhFromContent(content) {
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

async function wipeOldNeighborhoodCards(nbhs) {
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

  var allowedNbhs = {};
  nbhs.forEach(function(n) { allowedNbhs[n.name] = true; });
  console.log('[wipe-old] target Neighborhood set size: ' + Object.keys(allowedNbhs).length);

  console.log('[wipe-old] GET pass to extract neighborhood from content (concurrency=' + WIPE_GET_CONCURRENCY + ')');
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
      var nbhName = nbhFromContent(content);
      if (nbhName && allowedNbhs[nbhName]) {
        matches.push({ id: results[j].id, name: nbhName });
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
// LOAD HELPERS
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

function parseNum(s) {
  var n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

function fmtMoney(n) {
  if (n == null) return null;
  if (n >= 1000) return '$' + Math.round(n / 1000) + 'k';
  return '$' + n;
}

function fmtThousands(n) {
  if (n == null) return null;
  if (n >= 1000) return Math.round(n / 100) / 10 + 'k';
  return String(n);
}

async function loadDemographics() {
  var rows = await sheets.getSheetData('Neighborhood_Demographics');
  if (!rows || rows.length < 2) return {};
  var headers = rows[0];
  var idx = {
    nbh: indexHeader(headers, 'Neighborhood'),
    students: indexHeader(headers, 'Students'),
    adults: indexHeader(headers, 'Adults'),
    seniors: indexHeader(headers, 'Seniors'),
    unemployed: indexHeader(headers, 'Unemployed'),
    sick: indexHeader(headers, 'Sick'),
    schoolQuality: indexHeader(headers, 'SchoolQualityIndex'),
    gradRate: indexHeader(headers, 'GraduationRate')
  };
  var byNbh = {};
  for (var i = 1; i < rows.length; i++) {
    var r = rows[i];
    var name = clean(r[idx.nbh]);
    if (!name) continue;
    var students = parseNum(r[idx.students]);
    var adults = parseNum(r[idx.adults]);
    var seniors = parseNum(r[idx.seniors]);
    byNbh[name] = {
      students: students,
      adults: adults,
      seniors: seniors,
      population: (students || 0) + (adults || 0) + (seniors || 0),
      unemployed: parseNum(r[idx.unemployed]),
      sick: parseNum(r[idx.sick]),
      schoolQuality: idx.schoolQuality >= 0 ? parseNum(r[idx.schoolQuality]) : null,
      gradRate: idx.gradRate >= 0 ? parseNum(r[idx.gradRate]) : null
    };
  }
  return byNbh;
}

async function loadBusinessesByNbh() {
  var rows = await sheets.getSheetData('Business_Ledger');
  if (!rows || rows.length < 2) return {};
  var byNbh = {};
  for (var i = 1; i < rows.length; i++) {
    var r = rows[i];
    var bizId = clean(r[0]);
    var name = clean(r[1]);
    var sector = clean(r[2]);
    var nbh = clean(r[3]);
    var emp = parseNum(r[4]);
    if (!nbh || !name || !bizId) continue;
    if (!byNbh[nbh]) byNbh[nbh] = [];
    byNbh[nbh].push({ bizId: bizId, name: name, sector: sector, employees: emp });
  }
  Object.keys(byNbh).forEach(function(n) {
    byNbh[n].sort(function(a, b) { return (b.employees || 0) - (a.employees || 0); });
  });
  return byNbh;
}

async function loadCitizensByNbh() {
  var rows = await sheets.getSheetData('Simulation_Ledger');
  if (!rows || rows.length < 2) return {};
  var headers = rows[0];
  var idx = {
    popid: indexHeader(headers, 'POPID'),
    first: indexHeader(headers, 'First'),
    last: indexHeader(headers, 'Last'),
    tier: indexHeader(headers, 'Tier'),
    role: indexHeader(headers, 'RoleType'),
    nbh: indexHeader(headers, 'Neighborhood'),
    usage: indexHeader(headers, 'UsageCount')
  };
  var byNbh = {};
  for (var i = 1; i < rows.length; i++) {
    var r = rows[i];
    var nbh = clean(r[idx.nbh]);
    var popid = clean(r[idx.popid]);
    var first = clean(r[idx.first]);
    var last = clean(r[idx.last]);
    var tier = parseNum(r[idx.tier]);
    if (!nbh || !popid || !first) continue;
    if (!byNbh[nbh]) byNbh[nbh] = [];
    byNbh[nbh].push({
      popid: popid,
      name: (first + ' ' + last).trim(),
      tier: tier,
      role: clean(r[idx.role]),
      usage: parseNum(r[idx.usage]) || 0
    });
  }
  // Sort: usage desc, then tier asc (lower tier = more central)
  Object.keys(byNbh).forEach(function(n) {
    byNbh[n].sort(function(a, b) {
      if (b.usage !== a.usage) return b.usage - a.usage;
      return (a.tier || 9) - (b.tier || 9);
    });
  });
  return byNbh;
}

// ═══════════════════════════════════════════════════════════════════════════
// BUILD NEIGHBORHOOD CARD
// ═══════════════════════════════════════════════════════════════════════════

function buildCard(nbh, demo, businesses, citizens, appearances) {
  var lines = [];

  // Header — bare neighborhood name (wipe key)
  lines.push(nbh.name);

  // Identity line
  var idParts = [];
  if (nbh.district) idParts.push('District: ' + nbh.district);
  if (nbh.gentrificationPhase) idParts.push('Phase: ' + nbh.gentrificationPhase);
  if (demo && demo.population) idParts.push('Population: ~' + fmtThousands(demo.population));
  if (nbh.medianIncome) idParts.push('Median income: ' + fmtMoney(nbh.medianIncome));
  if (nbh.medianRent) idParts.push('Median rent: ' + fmtMoney(nbh.medianRent));
  if (idParts.length) lines.push(idParts.join(' | '));

  // State line
  var stateParts = [];
  if (nbh.sentiment != null) stateParts.push('Sentiment: ' + nbh.sentiment);
  if (nbh.crimeIndex != null) stateParts.push('Crime index: ' + nbh.crimeIndex);
  if (nbh.retailVitality != null) stateParts.push('Retail vitality: ' + nbh.retailVitality);
  if (nbh.eventAttractiveness != null) stateParts.push('Event draw: ' + nbh.eventAttractiveness);
  if (nbh.displacementPressure) stateParts.push('Displacement pressure: ' + nbh.displacementPressure);
  if (stateParts.length) lines.push(stateParts.join(' | '));

  // Demographic line
  var demoParts = [];
  if (nbh.whitePopulationPct) demoParts.push('White pop: ' + nbh.whitePopulationPct + '%');
  if (nbh.highEducationPct) demoParts.push('Higher ed: ' + nbh.highEducationPct + '%');
  if (demo && demo.unemployed != null) demoParts.push('Unemployed: ' + demo.unemployed);
  if (nbh.migrationFlow) demoParts.push('Migration flow: ' + nbh.migrationFlow);
  if (demoParts.length) lines.push(demoParts.join(' | '));

  // NOTABLE BUSINESSES — IDs without parens, sectors in square brackets
  if (businesses && businesses.length > 0) {
    lines.push('');
    lines.push('NOTABLE BUSINESSES:');
    for (var i = 0; i < businesses.length && i < TOP_BUSINESSES; i++) {
      var b = businesses[i];
      var meta = [];
      if (b.sector) meta.push(b.sector);
      if (b.employees) meta.push(b.employees + ' emp');
      var tail = meta.length ? ' [' + meta.join(', ') + ']' : '';
      lines.push('- ' + b.bizId + ' — ' + b.name + tail);
    }
  }

  // NOTABLE CITIZENS — POP-IDs without parens
  if (citizens && citizens.length > 0) {
    lines.push('');
    lines.push('NOTABLE CITIZENS:');
    for (var ci = 0; ci < citizens.length && ci < TOP_CITIZENS; ci++) {
      var c = citizens[ci];
      var meta2 = [];
      if (c.role) meta2.push(c.role);
      if (c.tier) meta2.push('tier ' + c.tier);
      var tail2 = meta2.length ? ' [' + meta2.join(', ') + ']' : '';
      lines.push('- ' + c.popid + ' — ' + c.name + tail2);
    }
  }

  // Appearances from bay-tribune
  if (appearances && appearances.length > 0) {
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
  console.log('[buildNeighborhoodCards] Mode: ' + (APPLY ? 'APPLY' : 'DRY-RUN'));
  if (NAME_FILTER) console.log('[buildNeighborhoodCards] Name filter: ' + NAME_FILTER);
  if (LIMIT < 999) console.log('[buildNeighborhoodCards] Limit: ' + LIMIT);
  console.log('');

  var data = await sheets.getSheetData('Neighborhood_Map');
  if (!data || data.length < 2) {
    console.error('No data in Neighborhood_Map');
    process.exit(1);
  }
  console.log('[buildNeighborhoodCards] Neighborhood_Map rows: ' + (data.length - 1));

  var headers = data[0];
  var idx = {
    cycle: indexHeader(headers, 'Cycle'),
    nbh: indexHeader(headers, 'Neighborhood'),
    noise: indexHeader(headers, 'NoiseIndex'),
    crime: indexHeader(headers, 'CrimeIndex'),
    retail: indexHeader(headers, 'RetailVitality'),
    event: indexHeader(headers, 'EventAttractiveness'),
    sentiment: indexHeader(headers, 'Sentiment'),
    gentrificationPhase: indexHeader(headers, 'GentrificationPhase'),
    displacementPressure: indexHeader(headers, 'DisplacementPressure'),
    medianIncome: indexHeader(headers, 'MedianIncome'),
    medianRent: indexHeader(headers, 'MedianRent'),
    whitePop: indexHeader(headers, 'WhitePopulationPct'),
    highEd: indexHeader(headers, 'HighEducationPct'),
    migrationFlow: indexHeader(headers, 'MigrationFlow')
  };
  if (idx.nbh < 0) {
    console.error('Neighborhood_Map missing Neighborhood column');
    process.exit(1);
  }

  // Build per-neighborhood records (most-recent row wins if duplicates exist)
  var byNbh = {};
  for (var i = 1; i < data.length; i++) {
    var r = data[i];
    var name = clean(r[idx.nbh]);
    if (!name) continue;
    var cycle = parseNum(r[idx.cycle]) || 0;
    var existing = byNbh[name];
    if (existing && (existing._cycle || 0) > cycle) continue;
    byNbh[name] = {
      _cycle: cycle,
      name: name,
      district: districtMap.getDistrictForNeighborhood(name) || null,
      noiseIndex: parseNum(r[idx.noise]),
      crimeIndex: parseNum(r[idx.crime]),
      retailVitality: parseNum(r[idx.retail]),
      eventAttractiveness: parseNum(r[idx.event]),
      sentiment: parseNum(r[idx.sentiment]),
      gentrificationPhase: clean(r[idx.gentrificationPhase]),
      displacementPressure: clean(r[idx.displacementPressure]),
      medianIncome: parseNum(r[idx.medianIncome]),
      medianRent: parseNum(r[idx.medianRent]),
      whitePopulationPct: clean(r[idx.whitePop]),
      highEducationPct: clean(r[idx.highEd]),
      migrationFlow: clean(r[idx.migrationFlow])
    };
  }

  var nbhs = Object.values(byNbh);
  if (NAME_FILTER) {
    var nf = NAME_FILTER.toLowerCase();
    nbhs = nbhs.filter(function(n) { return n.name.toLowerCase().indexOf(nf) >= 0; });
  }

  console.log('[buildNeighborhoodCards] Neighborhoods matched: ' + nbhs.length);
  if (LIMIT < nbhs.length) {
    nbhs = nbhs.slice(0, LIMIT);
    console.log('[buildNeighborhoodCards] Limited to: ' + nbhs.length);
  }

  // Load demographics, businesses, citizens
  console.log('[buildNeighborhoodCards] Loading Demographics + Business_Ledger + Simulation_Ledger...');
  var [demoByNbh, bizByNbh, citByNbh] = await Promise.all([
    loadDemographics(),
    loadBusinessesByNbh(),
    loadCitizensByNbh()
  ]);
  console.log('[buildNeighborhoodCards] Demographics: ' + Object.keys(demoByNbh).length +
    ' | Businesses by nbh: ' + Object.keys(bizByNbh).length +
    ' | Citizens by nbh: ' + Object.keys(citByNbh).length);

  // Wipe-old (W2 pattern — first-line org-name match, repurposed for nbh-name)
  var wipeReport = null;
  if (APPLY && WIPE_OLD) {
    wipeReport = await wipeOldNeighborhoodCards(nbhs);
    console.log('[wipe-old] sleeping ' + (WIPE_INDEXING_SLEEP_MS / 1000) + 's for async indexing to settle before writes');
    await smSleep(WIPE_INDEXING_SLEEP_MS);
  } else if (APPLY && !WIPE_OLD) {
    console.log('[buildNeighborhoodCards] --wipe-old not set — writes will land alongside any existing un-tagged cards.');
  }

  // Process each neighborhood
  var written = 0;
  var errors = 0;
  var withAppearances = 0;
  var withBusinesses = 0;
  var withCitizens = 0;
  var rawAppearancesTotal = 0;
  var filteredOutTotal = 0;

  for (var ni = 0; ni < nbhs.length; ni++) {
    var nbh = nbhs[ni];
    var demo = demoByNbh[nbh.name];
    var businesses = bizByNbh[nbh.name] || [];
    var citizens = citByNbh[nbh.name] || [];

    if (businesses.length > 0) withBusinesses++;
    if (citizens.length > 0) withCitizens++;

    // Search bay-tribune
    var rawResults = [];
    try {
      rawResults = await searchSupermemory(nbh.name, 'bay-tribune');
    } catch (e) { /* fine */ }

    var nameLc = nbh.name.toLowerCase();
    var appearances = rawResults.filter(function(r) {
      return String(r.memory || '').toLowerCase().indexOf(nameLc) >= 0;
    });

    rawAppearancesTotal += rawResults.length;
    filteredOutTotal += (rawResults.length - appearances.length);
    if (appearances.length > 0) withAppearances++;

    var card = buildCard(nbh, demo, businesses, citizens, appearances);

    if (!APPLY) {
      console.log('--- ' + nbh.name + ' ---');
      console.log('PAYLOAD: containerTags=[' + CONTAINER_TAG + ', ' + DOMAIN_TAG + '] | metadata.title="' + nbh.name + '"' + (nbh.district ? ' | metadata.district="' + nbh.district + '"' : ''));
      console.log(card);
      console.log('  [' + businesses.length + ' biz, ' + citizens.length + ' cit, ' + appearances.length + ' appearances]');
      console.log('');
    } else {
      try {
        await writeMemory(card, nbh);
        written++;
        if ((ni + 1) % 5 === 0) {
          console.log('  ... ' + (ni + 1) + '/' + nbhs.length + ' written');
        }
      } catch (e) {
        console.error('[FAIL] ' + nbh.name + ': ' + e.message);
        errors++;
      }
      await smSleep(500);
    }
  }

  console.log('');
  console.log('[DONE] Neighborhoods: ' + nbhs.length +
    ' | With businesses: ' + withBusinesses +
    ' | With citizens: ' + withCitizens +
    ' | With appearances: ' + withAppearances +
    ' | Written: ' + written +
    ' | Errors: ' + errors);
  console.log('[FILTER] Raw bay-tribune hits: ' + rawAppearancesTotal +
    ' | Filtered out: ' + filteredOutTotal +
    ' | Kept: ' + (rawAppearancesTotal - filteredOutTotal));
  if (wipeReport) {
    console.log('[WIPE-OLD] candidates: ' + wipeReport.candidates +
      ' | matched (Nbh-name-scoped): ' + wipeReport.matched +
      ' | deleted: ' + wipeReport.deleted +
      ' | failed: ' + wipeReport.failed);
  }
}

main().catch(function(e) { console.error('[FATAL]', e); process.exit(1); });
