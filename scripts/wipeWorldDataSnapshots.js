/**
 * Wipe engine-state aggregate dumps from world-data (Task R0).
 *
 * Plan: docs/plans/2026-04-27-world-data-unified-ingest-rebuild.md
 *
 * Background: Task 1.1 inventory found 8 docs in world-data that are aggregate
 * engine-state dumps (World Summary, Neighborhood Map, Neighborhood Demographics,
 * Employment Roster) rather than per-entity cards. These predate the unified
 * ingest project and clog `lookup_*` retrieval with snapshot blobs. Task 1.2
 * decision: DELETE them before Task R1 citizen retrofit so it runs on a clean
 * substrate.
 *
 * Method (two-pass — list endpoint titles are unreliable for this filter
 * because the LIST response often returns boilerplate "Direct memories (1)"
 * while metadata.title in the GET response holds the real title):
 *   - Pass 1: list world-data IDs (same pagination as auditWorldData.js).
 *   - Pass 2: GET each doc, match on metadata.title + top-level title +
 *     content head against engine-state-dump signatures. Concurrency=5.
 *   - Dry-run (default): print matched docs and stop.
 *   - --apply: DELETE each via /v3/documents/{id}, sleep 30s for indexing,
 *     recount world-data total to verify the delta.
 *
 * Title-prefix filter (not classifier 'unknown' bucket) keeps the wipe target
 * explicit and auditable; future content of other shapes that happens to fall
 * into 'unknown' won't be swept blindly.
 *
 * Usage:
 *   node scripts/wipeWorldDataSnapshots.js            # dry-run
 *   node scripts/wipeWorldDataSnapshots.js --apply    # DELETE
 */

require('/root/GodWorld/lib/env');
const https = require('https');

const API_HOST = 'api.supermemory.ai';
const API_KEY = process.env.SUPERMEMORY_CC_API_KEY;
const PAGE_SIZE = 100;
const PAGE_SLEEP_MS = 200;
const POST_DELETE_SLEEP_MS = 30000;

if (!API_KEY) {
  console.error('[ERROR] SUPERMEMORY_CC_API_KEY not set in env');
  process.exit(1);
}

const APPLY = process.argv.includes('--apply');
const CONCURRENCY = 3;
const EMPTY_RETRY = 2;

const TITLE_PATTERNS = [
  /^World Summary\b/i,
  /^Oakland City and Sports Summary\b/i,
  /^Neighborhood Demographics\b/i,
  /^Neighborhood Map\b/i,
  /^Employment Roster\b/i,
  /^Faith Organizations\b/i,
  /^Business Registry\b/i,
  /^Cultural Ledger\b/i
];

const CONTENT_HEAD_PATTERNS = [
  /^#\s*World Summary/i,
  /^OAKLAND NEIGHBORHOOD MAP/i,
  /^OAKLAND NEIGHBORHOOD DEMOGRAPHICS/i,
  /^OAKLAND EMPLOYMENT ROSTER/i,
  /^OAKLAND FAITH ORGANIZATIONS/i,
  /^OAKLAND BUSINESS REGISTRY/i,
  /^OAKLAND CULTURAL LEDGER/i
];

function matchesSnapshot(doc) {
  const candidates = [
    doc.title,
    doc.metadata && doc.metadata.title
  ].filter(Boolean);
  for (const t of candidates) {
    if (TITLE_PATTERNS.some(re => re.test(t))) return true;
  }
  const head = (doc.content || '').slice(0, 200).trim();
  return CONTENT_HEAD_PATTERNS.some(re => re.test(head));
}

function apiCall(method, apiPath, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const headers = {
      'Authorization': 'Bearer ' + API_KEY,
      'Accept': 'application/json'
    };
    if (payload) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(payload);
    }
    const req = https.request({
      hostname: API_HOST,
      port: 443,
      path: apiPath,
      method,
      headers
    }, (res) => {
      let data = '';
      res.on('data', (c) => data += c);
      res.on('end', () => {
        let parsed = null;
        try { parsed = data ? JSON.parse(data) : null; } catch (e) { parsed = data; }
        resolve({ status: res.statusCode, body: parsed });
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function listPageWithRetry(page, retries) {
  let r = await apiCall('POST', '/v3/documents/list', { limit: PAGE_SIZE, page });
  let attempt = 0;
  while (attempt < retries && r.status !== 200) {
    console.log(`  [retry] page ${page} returned ${r.status}; sleeping 5s`);
    await sleep(5000);
    r = await apiCall('POST', '/v3/documents/list', { limit: PAGE_SIZE, page });
    attempt++;
  }
  return r;
}

async function enumerateWorldData(label) {
  console.log(`\n--- enumerate world-data (${label}) ---`);
  const probe = await listPageWithRetry(1, 3);
  if (probe.status !== 200) {
    console.error(`[FAIL] /v3/documents/list page 1: ${probe.status}`);
    process.exit(2);
  }
  const totalPages = probe.body.pagination.totalPages;
  const records = [];
  for (let page = 1; page <= totalPages; page++) {
    const r = page === 1 ? probe : await listPageWithRetry(page, 3);
    if (r.status !== 200) {
      console.error(`[FAIL] /v3/documents/list page ${page}: ${r.status} after retries — ABORTING (incomplete enumeration is unsafe for --apply)`);
      process.exit(5);
    }
    const items = r.body.memories || [];
    for (const item of items) {
      const tags = Array.isArray(item.containerTags) ? item.containerTags : [];
      if (!tags.includes('world-data')) continue;
      records.push({
        id: item.id,
        title: item.title || null,
        createdAt: item.createdAt,
        tags
      });
    }
    if (page < totalPages) await sleep(PAGE_SLEEP_MS);
  }
  console.log(`  ${records.length} world-data docs`);
  return records;
}

async function getWithRetry(id) {
  let r = await apiCall('GET', '/v3/documents/' + id, null);
  let attempts = 0;
  while (attempts < EMPTY_RETRY && r.status === 200 && r.body && (!r.body.content || r.body.content.length === 0)) {
    await sleep(500);
    r = await apiCall('GET', '/v3/documents/' + id, null);
    attempts++;
  }
  return r;
}

async function findSnapshots(records) {
  console.log(`\n--- GET-pass to identify snapshots (${records.length} docs, concurrency=${CONCURRENCY}, empty-retry=${EMPTY_RETRY}) ---`);
  const matched = [];
  const emptyAfterRetry = [];
  let fetched = 0;
  for (let i = 0; i < records.length; i += CONCURRENCY) {
    const batch = records.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map(async (rec) => {
      const got = await getWithRetry(rec.id);
      return { rec, got };
    }));
    for (const { rec, got } of results) {
      fetched++;
      if (got.status !== 200 || !got.body) continue;
      const content = got.body.content || '';
      if (content.length === 0) { emptyAfterRetry.push(rec.id); continue; }
      if (matchesSnapshot(got.body)) {
        matched.push({
          id: rec.id,
          createdAt: rec.createdAt,
          title: (got.body.metadata && got.body.metadata.title) || got.body.title || rec.title,
          contentHead: content.slice(0, 120).replace(/\n/g, ' \\n ')
        });
      }
    }
    if (fetched % 200 === 0 || (i + CONCURRENCY) >= records.length) {
      process.stdout.write(`  fetched ${fetched}/${records.length}, matched ${matched.length}, empty-after-retry ${emptyAfterRetry.length}\n`);
    }
  }
  if (emptyAfterRetry.length) {
    console.log(`\n[WARN] ${emptyAfterRetry.length} docs returned empty content after ${EMPTY_RETRY} retries — these were skipped, not classified.`);
    console.log(`       If wipe count seems short, re-run after a cooldown to retry these.`);
  }
  return { matched, emptyAfterRetry };
}

async function main() {
  console.log('=== wipeWorldDataSnapshots — Task R0 ===');
  console.log(APPLY ? 'MODE: --apply (will DELETE)' : 'MODE: dry-run');

  const preRecords = await enumerateWorldData('pre');
  const { matched, emptyAfterRetry } = await findSnapshots(preRecords);

  console.log(`\nMatched ${matched.length} engine-state dump(s):`);
  matched.forEach((r, i) => {
    console.log(`  [${i + 1}] ${r.id}  ${r.createdAt}`);
    console.log(`       title: ${r.title}`);
    console.log(`       head:  ${r.contentHead}`);
  });
  if (emptyAfterRetry.length && APPLY) {
    console.log(`\n[ABORT] ${emptyAfterRetry.length} docs returned empty content even after retry.`);
    console.log(`        Refusing to --apply with incomplete classification — re-run dry-run after cooldown first.`);
    process.exit(4);
  }

  if (matched.length === 0) {
    console.log('\nNothing to delete. Exiting.');
    return;
  }

  if (!APPLY) {
    console.log('\nDry-run complete. Re-run with --apply to DELETE.');
    return;
  }

  // Apply mode
  console.log('\n--- DELETE pass ---');
  const deleteResults = [];
  for (const r of matched) {
    const del = await apiCall('DELETE', '/v3/documents/' + r.id, null);
    let ok = del.status === 204 || del.status === 200;
    if (!ok && del.status === 409) {
      console.log(`  [${r.id}] 409 — sleeping 20s and retrying`);
      await sleep(20000);
      const del2 = await apiCall('DELETE', '/v3/documents/' + r.id, null);
      ok = del2.status === 204 || del2.status === 200;
      deleteResults.push({ id: r.id, status: del2.status, ok });
      console.log(`  [${r.id}] retry status: ${del2.status} ${ok ? 'OK' : 'FAIL'}`);
    } else {
      deleteResults.push({ id: r.id, status: del.status, ok });
      console.log(`  [${r.id}] ${del.status} ${ok ? 'OK' : 'FAIL'}`);
    }
  }
  const failed = deleteResults.filter(d => !d.ok);

  console.log(`\nDelete results: ${deleteResults.length - failed.length}/${deleteResults.length} OK`);

  console.log(`\nSleeping ${POST_DELETE_SLEEP_MS / 1000}s for async indexing to settle...`);
  await sleep(POST_DELETE_SLEEP_MS);

  const postRecords = await enumerateWorldData('post');

  console.log('\n=== SUMMARY ===');
  console.log(`Pre-count world-data:        ${preRecords.length}`);
  console.log(`Matched for deletion:        ${matched.length}`);
  console.log(`DELETE OK:                   ${deleteResults.length - failed.length}`);
  console.log(`DELETE failed:               ${failed.length}`);
  console.log(`Post-count world-data:       ${postRecords.length}`);
  console.log(`Delta (pre - post):          ${preRecords.length - postRecords.length}`);

  const expectedDelta = matched.length - failed.length;
  const cleanResult = (preRecords.length - postRecords.length) === expectedDelta;
  console.log(`Expected delta:              ${expectedDelta} (${cleanResult ? 'matches' : 'MISMATCH'})`);
  console.log(`\nOVERALL: ${cleanResult && failed.length === 0 ? 'CLEAN — substrate ready for R1' : 'CHECK — see above'}`);

  if (failed.length || !cleanResult) process.exit(3);
}

main().catch(err => {
  console.error('[FATAL]', err);
  process.exit(1);
});
