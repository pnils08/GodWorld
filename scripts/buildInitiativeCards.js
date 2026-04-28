#!/usr/bin/env node
/**
 * buildInitiativeCards.js — Compile per-initiative wiki cards into world-data
 * [engine/sheet] — S183 unified ingest rebuild (Task W5)
 *
 * Reads Initiative_Tracker (current state only — per Open Question 1, defer
 * per-cycle history to revisit if Mara audit flags missing context),
 * searches bay-tribune for appearances, writes a compiled initiative card
 * to world-data with containerTags ['world-data', 'wd-initiative'].
 *
 * The GodWorld MCP lookup_initiative tool already exists and queries
 * world-data broadly; these cards become the canonical hit.
 *
 * Usage:
 *   node scripts/buildInitiativeCards.js --dry-run                       # preview
 *   node scripts/buildInitiativeCards.js --apply                         # write all (no wipe)
 *   node scripts/buildInitiativeCards.js --apply --wipe-old              # wipe + write
 *   node scripts/buildInitiativeCards.js --apply --name "Stabilization"  # one by name
 *   node scripts/buildInitiativeCards.js --apply --init INIT-001         # one by INIT-ID
 *
 * Write payload: /v3/documents POST with
 *   containerTags: ['world-data', 'wd-initiative']
 *   metadata: { title, init_id, source: 'buildInitiativeCards.js' }
 *
 * Initiative_Tracker columns (consumed):
 *   A=InitiativeID, B=Name, C=Type, D=Status, E=Budget, F=VoteRequirement,
 *   G=VoteCycle, I=LeadFaction, J=OppositionFaction, R=AffectedNeighborhoods,
 *   S=PolicyDomain, T=MayoralAction, Y=ImplementationPhase, Z=MilestoneNotes,
 *   AA=NextScheduledAction, AB=NextActionCycle
 */

require('/root/GodWorld/lib/env');
var https = require('https');
var sheets = require('../lib/sheets');

var API_KEY = process.env.SUPERMEMORY_CC_API_KEY;
var CONTAINER_TAG = 'world-data';
var DOMAIN_TAG = 'wd-initiative';
var API_HOST = 'api.supermemory.ai';
var APPLY = process.argv.includes('--apply');
var WIPE_OLD = process.argv.includes('--wipe-old');

var nameArg = process.argv.indexOf('--name');
var NAME_FILTER = nameArg > 0 ? process.argv[nameArg + 1] : null;

var initArg = process.argv.indexOf('--init');
var INIT_FILTER = initArg > 0 ? process.argv[initArg + 1] : null;

var limitArg = process.argv.indexOf('--limit');
var LIMIT = limitArg > 0 ? parseInt(process.argv[limitArg + 1], 10) : 999;

var MILESTONE_NOTES_MAX = 600; // truncate the long blob

// Wipe-old GET pass tuning (matches W1-W4)
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

async function writeMemory(content, init) {
  var meta = {
    title: init.name,
    init_id: init.initId,
    source: 'buildInitiativeCards.js'
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
// WIPE-OLD — INIT-ID-content-scoped DELETE
// ═══════════════════════════════════════════════════════════════════════════

function initIdFromContent(content) {
  if (!content) return null;
  var m = content.match(/\(INIT-(\d{3,})\)/);
  return m ? 'INIT-' + m[1] : null;
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

async function wipeOldInitiativeCards(inits) {
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

  var allowedInitIds = {};
  inits.forEach(function(it) { allowedInitIds[it.initId] = true; });
  console.log('[wipe-old] target INIT-ID set size: ' + Object.keys(allowedInitIds).length);

  console.log('[wipe-old] GET pass to extract INIT-ID per doc (concurrency=' + WIPE_GET_CONCURRENCY + ')');
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
      var initId = initIdFromContent(content);
      if (initId && allowedInitIds[initId]) {
        matches.push({ id: results[j].id, initId: initId });
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
// BUILD INITIATIVE CARD
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

function truncate(s, max) {
  if (!s || s.length <= max) return s;
  return s.substring(0, max) + '…';
}

function buildCard(init, appearances) {
  var lines = [];

  // Header — Name (INIT-ID). INIT-ID is wipe-extractable.
  lines.push(init.name + ' (' + init.initId + ')');

  // Status line
  var statusParts = [];
  if (init.status) statusParts.push('Status: ' + init.status);
  if (init.implementationPhase) statusParts.push('Phase: ' + init.implementationPhase);
  if (init.policyDomain) statusParts.push('Domain: ' + init.policyDomain);
  if (init.budget) statusParts.push('Budget: ' + init.budget);
  if (statusParts.length) lines.push(statusParts.join(' | '));

  // Vote line
  var voteParts = [];
  if (init.voteCycle) voteParts.push('Vote: C' + init.voteCycle);
  if (init.voteRequirement) voteParts.push('Threshold: ' + init.voteRequirement);
  if (init.outcome) voteParts.push('Outcome: ' + init.outcome);
  if (init.mayoralAction && init.mayoralAction !== 'none') {
    voteParts.push('Mayor: ' + init.mayoralAction + (init.mayoralActionCycle ? ' (C' + init.mayoralActionCycle + ')' : ''));
  }
  if (voteParts.length) lines.push(voteParts.join(' | '));

  // Faction line
  var facParts = [];
  if (init.leadFaction) facParts.push('Lead: ' + init.leadFaction);
  if (init.oppositionFaction) facParts.push('Opposition: ' + init.oppositionFaction);
  if (init.swingVoter) facParts.push('Swing: ' + init.swingVoter);
  if (init.affectedNeighborhoods) facParts.push('Neighborhoods: ' + init.affectedNeighborhoods);
  if (facParts.length) lines.push(facParts.join(' | '));

  // Next action
  if (init.nextScheduledAction || init.nextActionCycle) {
    lines.push('');
    var nextLine = 'NEXT';
    if (init.nextActionCycle) nextLine += ' (C' + init.nextActionCycle + ')';
    nextLine += ': ' + (init.nextScheduledAction || '(unspecified)');
    lines.push(nextLine);
  }

  // Recent milestone notes (truncated blob)
  if (init.milestoneNotes) {
    lines.push('');
    lines.push('RECENT MILESTONES:');
    lines.push(truncate(init.milestoneNotes, MILESTONE_NOTES_MAX));
  }

  // Consequences
  if (init.consequences) {
    lines.push('');
    lines.push('CONSEQUENCES: ' + init.consequences);
  }

  // Appearances from bay-tribune
  if (appearances && appearances.length > 0) {
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
  console.log('[buildInitiativeCards] Mode: ' + (APPLY ? 'APPLY' : 'DRY-RUN'));
  if (NAME_FILTER) console.log('[buildInitiativeCards] Name filter: ' + NAME_FILTER);
  if (INIT_FILTER) console.log('[buildInitiativeCards] INIT-ID filter: ' + INIT_FILTER);
  if (LIMIT < 999) console.log('[buildInitiativeCards] Limit: ' + LIMIT);
  console.log('');

  var data = await sheets.getSheetData('Initiative_Tracker');
  if (!data || data.length < 2) {
    console.error('No data in Initiative_Tracker');
    process.exit(1);
  }
  console.log('[buildInitiativeCards] Initiative_Tracker rows: ' + (data.length - 1));

  var headers = data[0];
  var idx = {
    initId: indexHeader(headers, 'InitiativeID'),
    name: indexHeader(headers, 'Name'),
    type: indexHeader(headers, 'Type'),
    status: indexHeader(headers, 'Status'),
    budget: indexHeader(headers, 'Budget'),
    voteRequirement: indexHeader(headers, 'VoteRequirement'),
    voteCycle: indexHeader(headers, 'VoteCycle'),
    leadFaction: indexHeader(headers, 'LeadFaction'),
    oppositionFaction: indexHeader(headers, 'OppositionFaction'),
    swingVoter: indexHeader(headers, 'SwingVoter'),
    outcome: indexHeader(headers, 'Outcome'),
    consequences: indexHeader(headers, 'Consequences'),
    affectedNeighborhoods: indexHeader(headers, 'AffectedNeighborhoods'),
    policyDomain: indexHeader(headers, 'PolicyDomain'),
    mayoralAction: indexHeader(headers, 'MayoralAction'),
    mayoralActionCycle: indexHeader(headers, 'MayoralActionCycle'),
    implementationPhase: indexHeader(headers, 'ImplementationPhase'),
    milestoneNotes: indexHeader(headers, 'MilestoneNotes'),
    nextScheduledAction: indexHeader(headers, 'NextScheduledAction'),
    nextActionCycle: indexHeader(headers, 'NextActionCycle')
  };
  if (idx.initId < 0 || idx.name < 0) {
    console.error('Initiative_Tracker missing InitiativeID or Name column');
    process.exit(1);
  }

  // Build initiative records
  var inits = [];
  for (var i = 1; i < data.length; i++) {
    var r = data[i];
    var initId = clean(r[idx.initId]);
    var name = clean(r[idx.name]);
    if (!initId || !name) continue;

    var init = {
      initId: initId,
      name: name,
      type: clean(r[idx.type]),
      status: clean(r[idx.status]),
      budget: clean(r[idx.budget]),
      voteRequirement: clean(r[idx.voteRequirement]),
      voteCycle: clean(r[idx.voteCycle]),
      leadFaction: clean(r[idx.leadFaction]),
      oppositionFaction: clean(r[idx.oppositionFaction]),
      swingVoter: clean(r[idx.swingVoter]),
      outcome: clean(r[idx.outcome]),
      consequences: clean(r[idx.consequences]),
      affectedNeighborhoods: clean(r[idx.affectedNeighborhoods]),
      policyDomain: clean(r[idx.policyDomain]),
      mayoralAction: clean(r[idx.mayoralAction]),
      mayoralActionCycle: clean(r[idx.mayoralActionCycle]),
      implementationPhase: clean(r[idx.implementationPhase]),
      milestoneNotes: clean(r[idx.milestoneNotes]),
      nextScheduledAction: clean(r[idx.nextScheduledAction]),
      nextActionCycle: clean(r[idx.nextActionCycle])
    };

    if (INIT_FILTER && init.initId !== INIT_FILTER) continue;
    if (NAME_FILTER && name.toLowerCase().indexOf(NAME_FILTER.toLowerCase()) < 0) continue;

    inits.push(init);
  }

  console.log('[buildInitiativeCards] Initiatives matched: ' + inits.length);
  if (LIMIT < inits.length) {
    inits = inits.slice(0, LIMIT);
    console.log('[buildInitiativeCards] Limited to: ' + inits.length);
  }

  // Wipe-old (W1 pattern, INIT-ID-scoped)
  var wipeReport = null;
  if (APPLY && WIPE_OLD) {
    wipeReport = await wipeOldInitiativeCards(inits);
    console.log('[wipe-old] sleeping ' + (WIPE_INDEXING_SLEEP_MS / 1000) + 's for async indexing to settle before writes');
    await smSleep(WIPE_INDEXING_SLEEP_MS);
  } else if (APPLY && !WIPE_OLD) {
    console.log('[buildInitiativeCards] --wipe-old not set — writes will land alongside any existing un-tagged cards.');
  }

  // Process each initiative
  var written = 0;
  var errors = 0;
  var withAppearances = 0;
  var withMilestones = 0;
  var rawAppearancesTotal = 0;
  var filteredOutTotal = 0;

  for (var ii = 0; ii < inits.length; ii++) {
    var init = inits[ii];

    // Search bay-tribune for appearances. Hybrid + name post-filter on
    // initiative name (fragile if name is generic — same risk as W1).
    var rawResults = [];
    try {
      rawResults = await searchSupermemory(init.name, 'bay-tribune');
    } catch (e) { /* fine */ }

    var nameLc = init.name.toLowerCase();
    var appearances = rawResults.filter(function(r) {
      return String(r.memory || '').toLowerCase().indexOf(nameLc) >= 0;
    });

    rawAppearancesTotal += rawResults.length;
    filteredOutTotal += (rawResults.length - appearances.length);
    if (appearances.length > 0) withAppearances++;
    if (init.milestoneNotes) withMilestones++;

    var card = buildCard(init, appearances);

    if (!APPLY) {
      console.log('--- ' + init.name + ' (' + init.initId + ') ---');
      console.log('PAYLOAD: containerTags=[' + CONTAINER_TAG + ', ' + DOMAIN_TAG + '] | metadata.title="' + init.name + '" | metadata.init_id="' + init.initId + '"');
      console.log(card);
      console.log('  [' + appearances.length + ' appearances]');
      console.log('');
    } else {
      try {
        await writeMemory(card, init);
        written++;
      } catch (e) {
        console.error('[FAIL] ' + init.name + ' (' + init.initId + '): ' + e.message);
        errors++;
      }
      await smSleep(500);
    }
  }

  console.log('');
  console.log('[DONE] Initiatives: ' + inits.length +
    ' | With milestones: ' + withMilestones +
    ' | With appearances: ' + withAppearances +
    ' | Written: ' + written +
    ' | Errors: ' + errors);
  console.log('[FILTER] Raw bay-tribune hits: ' + rawAppearancesTotal +
    ' | Filtered out: ' + filteredOutTotal +
    ' | Kept: ' + (rawAppearancesTotal - filteredOutTotal));
  if (wipeReport) {
    console.log('[WIPE-OLD] candidates: ' + wipeReport.candidates +
      ' | matched (INIT-ID-scoped): ' + wipeReport.matched +
      ' | deleted: ' + wipeReport.deleted +
      ' | failed: ' + wipeReport.failed);
  }
}

main().catch(function(e) { console.error('[FATAL]', e); process.exit(1); });
