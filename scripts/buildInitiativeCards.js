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
// engine.111 preventative — see the INIT-ID-map block for why a clean projection
// is hardened anyway.
var ALLOW_PARTIAL_WIPE = process.argv.includes('--allow-partial-wipe');
var RECONCILE = process.argv.includes('--reconcile');
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

// ═══════════════════════════════════════════════════════════════════════════
// INIT → DOC MAP + RECONCILE + DELETE classification (engine.111 preventative)
// ═══════════════════════════════════════════════════════════════════════════
// wd-initiative measured 6 docs / 6 initiatives at the S376 census — clean 1.00,
// and the smallest projection in the layer. Hardened anyway: the code path is
// identical to wd-business (435/99) and wd-cultural (95/46), which degraded only
// because they rebuild often. Clean by low traffic, not by construction.
async function buildInitIdMap() {
  console.log('[buildInitiativeCards] enumerating ' + DOMAIN_TAG + ' for INIT-ID→id map…');
  var map = new Map();
  var dupes = [];
  var total = 0;
  var page = 1;
  while (true) {
    var r = await smRequest('POST', '/v3/documents/list', {
      containerTags: [DOMAIN_TAG], limit: 200, page: page
    });
    if (r.status !== 200) throw new Error('INIT-ID-map list failed at page ' + page + ': ' + r.status);
    var mems = (r.body && r.body.memories) || [];
    for (var i = 0; i < mems.length; i++) {
      var m = mems[i];
      var init = m.metadata && m.metadata.init_id;
      total++;
      if (!init) continue;
      var rec = { id: m.id, createdAt: m.createdAt, initId: init };
      var prev = map.get(init);
      if (!prev) { map.set(init, rec); continue; }
      if (new Date(rec.createdAt) > new Date(prev.createdAt)) { map.set(init, rec); dupes.push(prev); }
      else { dupes.push(rec); }
    }
    if (mems.length < 200) break;
    page++;
    if (page > 20) throw new Error('INIT-ID-map pagination overflow (>20 pages)');
  }
  console.log('[buildInitiativeCards] INIT-ID→id map: ' + map.size + ' unique INIT-IDs across ' +
    total + ' docs (' + dupes.length + ' surplus above the one-per-initiative invariant)');
  return { map: map, dupes: dupes, total: total };
}

async function reconcileInitiativeCards() {
  var enumerated = await buildInitIdMap();
  var dupes = enumerated.dupes;

  console.log('\n[reconcile] mode: ' + (APPLY ? 'APPLY' : 'DRY-RUN'));
  console.log('[reconcile] docs: ' + enumerated.total +
    ' | initiatives: ' + enumerated.map.size + ' | surplus to delete: ' + dupes.length);

  if (dupes.length === 0) {
    console.log('[reconcile] one-doc-per-initiative invariant already holds — nothing to do.');
    return;
  }
  dupes.slice(0, 10).forEach(function (d) {
    console.log('  ' + d.initId + ' — delete ' + String(d.createdAt).slice(0, 10) +
      ' | keep ' + String(enumerated.map.get(d.initId).createdAt).slice(0, 10));
  });

  if (!APPLY) {
    console.log('\n[reconcile] DRY-RUN — no deletes issued. Re-run with --reconcile --apply to execute.');
    return;
  }

  var fs = require('fs');
  var path = require('path');
  var stamp = new Date().toISOString().replace(/[:.]/g, '-');
  var logPath = path.join('/root/GodWorld/output', 'wd-initiative-reconcile-' + stamp + '.log');
  fs.writeFileSync(logPath, dupes.map(function (d) {
    return [d.initId, d.id, d.createdAt, 'keep=' + enumerated.map.get(d.initId).id].join('\t');
  }).join('\n') + '\n', 'utf8');
  console.log('[reconcile] delete manifest written: ' + logPath);

  var deleted = 0;
  var alreadyGone = 0;
  var failures = [];
  for (var i = 0; i < dupes.length; i++) {
    var res = await deleteDoc(dupes[i].id);
    if (res.outcome === 'deleted') deleted++;
    else if (res.outcome === 'already-gone') alreadyGone++;
    else failures.push({ id: dupes[i].id, initId: dupes[i].initId, status: res.status });
    await smSleep(250);
  }
  console.log('\n[reconcile] deleted: ' + deleted + ' | already-gone: ' + alreadyGone +
    ' | failed: ' + failures.length);
  if (failures.length > 0) {
    failures.forEach(function (f) {
      console.error('  [FAIL] ' + f.initId + ' ' + f.id + ' → HTTP ' + f.status);
    });
    console.error('[GATE-FAIL] reconcile left ' + failures.length +
      ' surplus doc(s) in place; manifest: ' + logPath);
    process.exit(1);
  }
  console.log('[reconcile] one-doc-per-initiative invariant restored.');
}

// engine.111: 404 = already absent, which satisfies the caller's intent.
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

async function writeMemory(content, init, initIdMap) {
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
  // engine.111: PATCH-if-exists / POST-if-new (one doc per INIT-ID).
  var existing = initIdMap && initIdMap.get(init.initId);
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
  var alreadyGone = 0;
  var failures = [];
  for (var k = 0; k < matches.length; k++) {
    var res = await deleteDoc(matches[k].id);
    if (res.outcome === 'deleted') deleted++;
    else if (res.outcome === 'already-gone') alreadyGone++;
    else failures.push({ id: matches[k].id, initId: matches[k].initId, status: res.status });
    if ((k + 1) % 25 === 0 || k === matches.length - 1) {
      console.log('  DELETE ' + (k + 1) + '/' + matches.length +
        ' — deleted=' + deleted + ' already-gone=' + alreadyGone + ' failed=' + failures.length);
    }
    await smSleep(200);
  }
  console.log('[wipe-old] DELETE results: ' + deleted + ' deleted / ' + alreadyGone +
    ' already-gone / ' + failures.length + ' failed');
  // engine.111: abort before writing rather than stacking over the survivors.
  if (failures.length > 0) {
    failures.forEach(function (f) {
      console.error('  [FAIL] wipe ' + f.initId + ' ' + f.id + ' → HTTP ' + f.status);
    });
    if (!ALLOW_PARTIAL_WIPE) {
      throw new Error('wipe-old: ' + failures.length + ' of ' + matches.length +
        ' DELETEs failed. Refusing to write on top of a partial wipe. Re-run to retry, ' +
        'or pass --allow-partial-wipe to override deliberately.');
    }
    console.error('[wipe-old] --allow-partial-wipe set — proceeding over ' + failures.length +
      ' failed delete(s); expect duplicate cards for those initiatives.');
  }
  return {
    candidates: ids.length, matched: matches.length,
    deleted: deleted, alreadyGone: alreadyGone, failed: failures.length
  };
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
  // engine.111: standalone legacy-state pass — reads no sheet, writes no cards.
  if (RECONCILE) {
    await reconcileInitiativeCards();
    return;
  }

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

  // engine.111: built after the wipe so it reflects post-delete state.
  var initIdMap = null;
  if (APPLY) {
    initIdMap = (await buildInitIdMap()).map;
  }

  // Process each initiative
  var written = 0;
  var patched = 0;
  var posted = 0;
  var errors = 0;
  var failureList = [];
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
        var wr = await writeMemory(card, init, initIdMap);
        written++;
        if (wr.op === 'PATCH') patched++; else posted++;
      } catch (e) {
        console.error('[FAIL] ' + init.name + ' (' + init.initId + '): ' + e.message);
        failureList.push({ initId: init.initId, name: init.name, error: e.message });
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
    (APPLY ? ' (PATCH: ' + patched + ' / POST: ' + posted + ')' : '') +
    ' | Errors: ' + errors);
  console.log('[FILTER] Raw bay-tribune hits: ' + rawAppearancesTotal +
    ' | Filtered out: ' + filteredOutTotal +
    ' | Kept: ' + (rawAppearancesTotal - filteredOutTotal));
  if (wipeReport) {
    console.log('[WIPE-OLD] candidates: ' + wipeReport.candidates +
      ' | matched (INIT-ID-scoped): ' + wipeReport.matched +
      ' | deleted: ' + wipeReport.deleted +
      ' | already-gone: ' + wipeReport.alreadyGone +
      ' | failed: ' + wipeReport.failed);
  }

  // engine.111: errors-gate, matching canon.3 T6.
  if (errors > 0) {
    console.error('\n[GATE-FAIL] ' + errors + ' initiative card write(s) failed:');
    failureList.forEach(function (f) {
      console.error('  ' + f.initId + ' ' + f.name + ' — ' + f.error);
    });
    process.exit(1);
  }
}

main().catch(function(e) { console.error('[FATAL]', e); process.exit(1); });
