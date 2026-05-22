#!/usr/bin/env node
/**
 * dedupWdCitizens.js — One-time consolidation of wd-citizens duplicates
 * [engine/sheet] — S223
 *
 * Enumerates wd-citizens, groups by metadata.popid, keeps OLDEST doc id per
 * POPID (matches buildCitizenCards.js buildPopidIdMap stability rule), and
 * DELETEs the rest. Logs every delete to output/wd-citizens-dedup-<ts>.log
 * for reversibility audit.
 *
 * Background: buildCitizenCards.js --wipe-old only catches untagged legacy
 * cards. Tagged-but-stale duplicates with same POPID accumulated across
 * rebuilds (40% of canon citizens — 332 POPIDs / 340 stale docs as of
 * 2026-05-22). The new PATCH-if-exists / POST-if-new writeMemory logic
 * (S223) prevents future accumulation; this script resolves the legacy
 * state in one pass.
 *
 * Usage:
 *   node scripts/dedupWdCitizens.js                  # dry-run (default)
 *   node scripts/dedupWdCitizens.js --apply          # execute deletes
 */

require('/root/GodWorld/lib/env');
var fs = require('fs');
var path = require('path');
var https = require('https');

var API_KEY = process.env.SUPERMEMORY_CC_API_KEY;
var DOMAIN_TAG = 'wd-citizens';
var APPLY = process.argv.includes('--apply');
var DELETE_SLEEP_MS = 250; // be polite to rate-limit

function smRequest(method, apiPath, body) {
  return new Promise(function(resolve, reject) {
    var payload = body ? JSON.stringify(body) : null;
    var headers = { 'Authorization': 'Bearer ' + API_KEY, 'Accept': 'application/json' };
    if (payload) { headers['Content-Type'] = 'application/json'; headers['Content-Length'] = Buffer.byteLength(payload); }
    var req = https.request({ hostname: 'api.supermemory.ai', path: apiPath, method: method, headers: headers }, function(res) {
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

async function enumerate() {
  var all = [];
  var page = 1;
  while (true) {
    var r = await smRequest('POST', '/v3/documents/list', { containerTags: [DOMAIN_TAG], limit: 200, page: page });
    if (r.status !== 200) throw new Error('list failed at page ' + page + ': ' + r.status);
    var mems = (r.body && r.body.memories) || [];
    all = all.concat(mems);
    if (mems.length < 200) break;
    page++;
    if (page > 20) throw new Error('pagination overflow');
  }
  return all;
}

async function main() {
  console.log('[dedupWdCitizens] Mode: ' + (APPLY ? 'APPLY' : 'DRY-RUN'));
  console.log('');
  console.log('[dedupWdCitizens] enumerating wd-citizens…');
  var all = await enumerate();
  console.log('[dedupWdCitizens] total docs: ' + all.length);

  // Group by popid
  var byPopid = new Map();
  var noPopid = [];
  for (var i = 0; i < all.length; i++) {
    var d = all[i];
    var pop = d.metadata && d.metadata.popid;
    if (!pop) { noPopid.push(d); continue; }
    if (!byPopid.has(pop)) byPopid.set(pop, []);
    byPopid.get(pop).push(d);
  }
  console.log('[dedupWdCitizens] unique POPIDs: ' + byPopid.size);
  console.log('[dedupWdCitizens] docs with no popid metadata: ' + noPopid.length + ' (skipped — needs separate audit)');

  // Identify keep-set (oldest per POPID) and delete-set (rest)
  var toDelete = [];
  var collisions = 0;
  byPopid.forEach(function(ds, pop) {
    if (ds.length <= 1) return;
    collisions++;
    ds.sort(function(a, b) { return new Date(a.createdAt) - new Date(b.createdAt); });
    var keep = ds[0];
    for (var k = 1; k < ds.length; k++) {
      toDelete.push({
        popid: pop,
        delete_id: ds[k].id,
        delete_createdAt: ds[k].createdAt,
        delete_title: ds[k].title,
        keep_id: keep.id,
        keep_createdAt: keep.createdAt,
        keep_title: keep.title
      });
    }
  });
  console.log('[dedupWdCitizens] collision POPIDs: ' + collisions);
  console.log('[dedupWdCitizens] docs to delete: ' + toDelete.length);
  console.log('');

  if (!APPLY) {
    console.log('[dedupWdCitizens] DRY-RUN — first 10 planned deletes:');
    toDelete.slice(0, 10).forEach(function(t) {
      console.log('  ' + t.popid + ' DELETE ' + t.delete_id + ' (' + t.delete_createdAt + ') → keep ' + t.keep_id + ' (' + t.keep_createdAt + ')');
    });
    console.log('');
    console.log('[dedupWdCitizens] Re-run with --apply to execute.');
    return;
  }

  // Apply
  var ts = new Date().toISOString().replace(/[:.]/g, '-');
  var logPath = path.join(__dirname, '..', 'output', 'wd-citizens-dedup-' + ts + '.log');
  var logLines = [
    '# wd-citizens dedup log — ' + new Date().toISOString(),
    '# Total docs before: ' + all.length,
    '# Collision POPIDs: ' + collisions,
    '# Planned deletes: ' + toDelete.length,
    '#',
    '# Each line: timestamp | popid | delete_id | keep_id | status'
  ];
  fs.writeFileSync(logPath, logLines.join('\n') + '\n');
  console.log('[dedupWdCitizens] log: ' + logPath);
  console.log('[dedupWdCitizens] starting DELETE pass (' + toDelete.length + ' docs, ~' + Math.ceil(toDelete.length * (DELETE_SLEEP_MS / 1000)) + 's at ' + DELETE_SLEEP_MS + 'ms inter-delete)…');
  console.log('');

  var ok = 0, failed = 0, rate429 = 0;
  for (var j = 0; j < toDelete.length; j++) {
    var t = toDelete[j];
    var r = await smRequest('DELETE', '/v3/documents/' + t.delete_id, null);
    var line = new Date().toISOString() + ' | ' + t.popid + ' | ' + t.delete_id + ' | ' + t.keep_id + ' | ' + r.status;
    fs.appendFileSync(logPath, line + '\n');
    if (r.status >= 200 && r.status < 300) {
      ok++;
    } else {
      failed++;
      if (r.status === 429) rate429++;
      console.error('  [FAIL] ' + t.popid + ' ' + t.delete_id + ': ' + r.status + ' ' + JSON.stringify(r.body).slice(0, 200));
      // Halt on sustained 429 pressure
      if (rate429 >= 5) {
        console.error('[HALT] 5+ 429s — stopping to avoid rate-limit storm. Resume after waiting.');
        break;
      }
    }
    if ((j + 1) % 25 === 0) {
      console.log('  ... ' + (j + 1) + '/' + toDelete.length + ' (ok=' + ok + ' failed=' + failed + ')');
    }
    await smSleep(DELETE_SLEEP_MS);
  }

  console.log('');
  console.log('[DONE] deleted: ' + ok + ' / failed: ' + failed + ' / total planned: ' + toDelete.length);
  console.log('[DONE] log: ' + logPath);
}

main().catch(function(e) { console.error(e); process.exit(1); });
