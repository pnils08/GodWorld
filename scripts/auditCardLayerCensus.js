#!/usr/bin/env node
/**
 * auditCardLayerCensus.js — READ-ONLY census of the wd-* card layer
 * [engine/sheet] — engine.111 (S376)
 *
 * Counts documents vs unique entity keys per world-data domain tag, so the
 * one-card-per-entity invariant is measurable instead of assumed. Writes
 * nothing, deletes nothing — safe to run any time, including against
 * production mid-cycle.
 *
 * Why this exists: wd-cultural held 95 documents for 46 figures and wd-business
 * held 435 for 99 businesses, both accumulating since 2026-04-28, and nothing
 * surfaced it for nearly four months. The builders reported success the whole
 * time (see governance.48 — writer-fixed, artifact-persists). A ratio is the
 * cheapest signal that a projection has drifted; this makes it a one-liner.
 *
 * Reading the output:
 *   ratio 1.00              — invariant holds, one card per entity
 *   ratio > 1.00            — surplus cards; run that builder's --reconcile
 *   no-key > 0              — documents the builders' PATCH map cannot see,
 *                             so they can never be refreshed in place
 *
 * Usage:
 *   node scripts/auditCardLayerCensus.js              # all projections
 *   node scripts/auditCardLayerCensus.js --tag wd-business
 *   node scripts/auditCardLayerCensus.js --json       # machine-readable
 *
 * Pointer: docs/plans/2026-08-16-writer-fixed-artifact-persists-audit.md §Census
 */

require('/root/GodWorld/lib/env');
var https = require('https');

var API_KEY = process.env.SUPERMEMORY_CC_API_KEY;
var API_HOST = 'api.supermemory.ai';

if (!API_KEY) {
  console.error('[ERROR] SUPERMEMORY_CC_API_KEY not set');
  process.exit(1);
}

var tagArg = process.argv.indexOf('--tag');
var TAG_FILTER = tagArg > 0 ? process.argv[tagArg + 1] : null;
var AS_JSON = process.argv.includes('--json');

// Each projection's key is the metadata field its builder writes and its
// PATCH-if-exists map reads. Keep in step with the build*Cards.js writeMemory
// meta blocks — a mismatch here reports false surplus.
var PROJECTIONS = [
  { tag: 'wd-citizens', key: 'popid', builder: 'buildCitizenCards.js' },
  { tag: 'wd-business', key: 'biz_id', builder: 'buildBusinessCards.js' },
  { tag: 'wd-cultural', key: 'cul_id', builder: 'buildCulturalCards.js' },
  { tag: 'wd-faith', key: 'organization', builder: 'buildFaithCards.js' },
  { tag: 'wd-neighborhood', key: 'neighborhood', builder: 'buildNeighborhoodCards.js' },
  { tag: 'wd-initiative', key: 'init_id', builder: 'buildInitiativeCards.js' }
];

function smRequest(method, apiPath, body) {
  return new Promise(function (resolve, reject) {
    var payload = body ? JSON.stringify(body) : null;
    var headers = { Authorization: 'Bearer ' + API_KEY, Accept: 'application/json' };
    if (payload) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(payload);
    }
    var req = https.request({
      hostname: API_HOST, path: apiPath, method: method, headers: headers
    }, function (res) {
      var data = '';
      res.on('data', function (c) { data += c; });
      res.on('end', function () {
        var parsed = null;
        try { parsed = data ? JSON.parse(data) : null; } catch (e) { parsed = data; }
        resolve({ status: res.statusCode, body: parsed });
      });
    });
    req.on('error', reject);
    req.setTimeout(25000, function () { req.destroy(); reject(new Error('Timeout')); });
    if (payload) req.write(payload);
    req.end();
  });
}

function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

async function census(proj) {
  var all = [];
  var page = 1;
  while (true) {
    var r = await smRequest('POST', '/v3/documents/list', {
      containerTags: [proj.tag], limit: 200, page: page
    });
    if (r.status !== 200) throw new Error(proj.tag + ' list page ' + page + ' → HTTP ' + r.status);
    var mems = (r.body && r.body.memories) || [];
    all = all.concat(mems);
    if (mems.length < 200) break;
    page++;
    if (page > 30) throw new Error(proj.tag + ' pagination overflow (>30 pages)');
    await sleep(150);
  }

  var byKey = {};
  var noKey = 0;
  all.forEach(function (m) {
    var k = m.metadata && m.metadata[proj.key];
    if (!k) { noKey++; return; }
    (byKey[k] = byKey[k] || []).push(m);
  });

  var keys = Object.keys(byKey);
  var dupKeys = keys.filter(function (k) { return byKey[k].length > 1; });
  var surplus = dupKeys.reduce(function (n, k) { return n + byKey[k].length - 1; }, 0);

  // Oldest surviving duplicate answers "how long has this been drifting?" —
  // the wd-cultural and wd-business piles both dated to 2026-04-28.
  var oldestDup = null;
  dupKeys.forEach(function (k) {
    byKey[k].forEach(function (m) {
      if (!oldestDup || new Date(m.createdAt) < new Date(oldestDup)) oldestDup = m.createdAt;
    });
  });

  return {
    tag: proj.tag,
    builder: proj.builder,
    key: proj.key,
    docs: all.length,
    entities: keys.length,
    surplus: surplus,
    multiCarded: dupKeys.length,
    noKey: noKey,
    oldestDup: oldestDup,
    ratio: keys.length ? Number((all.length / keys.length).toFixed(2)) : 0
  };
}

async function main() {
  var targets = TAG_FILTER
    ? PROJECTIONS.filter(function (p) { return p.tag === TAG_FILTER; })
    : PROJECTIONS;

  if (targets.length === 0) {
    console.error('[ERROR] unknown --tag "' + TAG_FILTER + '". Known: ' +
      PROJECTIONS.map(function (p) { return p.tag; }).join(', '));
    process.exit(1);
  }

  var rows = [];
  var failed = [];
  for (var i = 0; i < targets.length; i++) {
    try {
      rows.push(await census(targets[i]));
    } catch (e) {
      // Degrade per-projection: one unreachable tag must not blank the report.
      failed.push({ tag: targets[i].tag, error: e.message });
      console.error('[' + targets[i].tag + '] CENSUS FAILED: ' + e.message);
    }
    await sleep(300);
  }

  if (AS_JSON) {
    console.log(JSON.stringify({ projections: rows, failed: failed }, null, 2));
  } else {
    console.log('\nprojection        docs  entities  surplus  multi  ratio  oldest-dup');
    rows.forEach(function (r) {
      console.log(
        r.tag.padEnd(18) +
        String(r.docs).padEnd(6) +
        String(r.entities).padEnd(10) +
        String(r.surplus).padEnd(9) +
        String(r.multiCarded).padEnd(7) +
        String(r.ratio).padEnd(7) +
        (r.oldestDup ? String(r.oldestDup).slice(0, 10) : '—'));
    });
    var totalSurplus = rows.reduce(function (n, r) { return n + r.surplus; }, 0);
    var totalNoKey = rows.reduce(function (n, r) { return n + r.noKey; }, 0);
    console.log('\nTOTAL SURPLUS: ' + totalSurplus + ' | docs with no key: ' + totalNoKey);
    rows.filter(function (r) { return r.surplus > 0; }).forEach(function (r) {
      console.log('  → ' + r.tag + ': node scripts/' + r.builder + ' --reconcile');
    });
  }

  // Non-zero on a failed enumeration only. Surplus is a finding to report, not
  // a script error — gating on it would make the audit unusable in a pipeline
  // whose whole job is to surface the number.
  if (failed.length > 0) process.exit(1);
}

main().catch(function (e) { console.error('[FATAL]', e); process.exit(1); });
