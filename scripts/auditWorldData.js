/**
 * Audit world-data container — enumerate every doc, classify by content shape,
 * write inventory JSON for the Phase 1.2 decision pass.
 *
 * Read-only. No writes, no deletes.
 *
 * Plan: docs/plans/2026-04-27-world-data-unified-ingest-rebuild.md (Task 1.1)
 *
 * Method (two-pass):
 *   PASS 1 — POST /v3/documents/list paginates the entire org. Server-side tag filter
 *            is IGNORED, so we list everything and client-side filter for items whose
 *            containerTags array contains 'world-data'. List returns metadata only
 *            (no content body), so PASS 1 only captures id + tags + createdAt.
 *   PASS 2 — GET /v3/documents/{id} for every PASS-1 hit, with concurrency=5, to fetch
 *            the actual content body. Classify against content shape:
 *              citizen-card        — header line matches /\(POP-\d+\)/
 *              business-card       — header matches /\(BIZ-\d+\)/
 *              faith-card          — header matches /\(FAITH-\d+\)/
 *              cultural-card       — Domain: Music|Visual|... + Fame tier|Active since
 *              neighborhood-card   — header + District: D\d
 *              initiative-card     — header matches /\(INIT-\d+\)/
 *              player_truesource   — metadata.source matches ingestPlayerTrueSource.js
 *                                     OR content shape matches roster card
 *              registry-one-liner  — single short line, pre-S131 ingest residue
 *              unknown             — everything else
 *
 *   Output: output/world_data_inventory.json with totals, per-class counts,
 *           5 sample doc IDs per class, anomalies (multi-class matches),
 *           and the secondary-tag observed pairs.
 *
 * Verify: total matches `npx supermemory tags list` for world-data.
 *
 * Usage:
 *   node scripts/auditWorldData.js                  # full enumeration
 *   node scripts/auditWorldData.js --max-pages 3    # quick sanity (Pass 1 only on N pages)
 *   node scripts/auditWorldData.js --max-fetch 200  # cap Pass 2 GETs (sampling mode)
 *   node scripts/auditWorldData.js --concurrency 8  # bump GET concurrency
 *   node scripts/auditWorldData.js --verbose        # log every classification
 */

require('/root/GodWorld/lib/env');
const https = require('https');
const fs = require('fs');
const path = require('path');

const API_HOST = 'api.supermemory.ai';
const API_KEY = process.env.SUPERMEMORY_CC_API_KEY;
const PAGE_SIZE = 100;
const PAGE_SLEEP_MS = 200;
const SAMPLES_PER_CLASS = 5;
const OUTPUT_PATH = path.join(__dirname, '..', 'output', 'world_data_inventory.json');

if (!API_KEY) {
  console.error('[ERROR] SUPERMEMORY_CC_API_KEY not set in env');
  process.exit(1);
}

const args = process.argv.slice(2);
const VERBOSE = args.includes('--verbose');
const MAX_PAGES = (() => {
  const i = args.indexOf('--max-pages');
  return i !== -1 && args[i + 1] ? parseInt(args[i + 1], 10) : Infinity;
})();
const MAX_FETCH = (() => {
  const i = args.indexOf('--max-fetch');
  return i !== -1 && args[i + 1] ? parseInt(args[i + 1], 10) : Infinity;
})();
const CONCURRENCY = (() => {
  const i = args.indexOf('--concurrency');
  return i !== -1 && args[i + 1] ? parseInt(args[i + 1], 10) : 5;
})();

// ───────────────────────────────────────────────────────────────────────────
// API helper
// ───────────────────────────────────────────────────────────────────────────

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

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ───────────────────────────────────────────────────────────────────────────
// Classifier
// ───────────────────────────────────────────────────────────────────────────

const PATTERNS = {
  'citizen-card':       /\(POP-\d{4,}\)/,
  'business-card':      /\(BIZ-\d{3,}\)/,
  'faith-card':         /\(FAITH-\d{2,}\)/,
  'initiative-card':    /\(INIT-\d{2,}\)/
};

function looksLikeNeighborhood(content) {
  const head = content.slice(0, 300);
  return /^[A-Z][\w \-']+\s*\nDistrict:\s*D\d/m.test(head);
}

function looksLikeCultural(content) {
  const head = content.slice(0, 400);
  return /Domain:\s*(Music|Visual|Literary|Theater|Film|Dance|Culinary|Performance)/i.test(head)
      && /Fame tier|Active since/i.test(head);
}

function looksLikePlayerTrueSource(content, metadata) {
  if (metadata && typeof metadata.source === 'string'
      && /ingestPlayerTrueSource/i.test(metadata.source)) return true;
  if (/TRUE\s*SOURCE/i.test(content.slice(0, 500))) return true;
  if (/Pitcher Stats|Batter Stats|Career Highlights/i.test(content.slice(0, 1000))) return true;
  return false;
}

function looksLikeRegistryOneLiner(content) {
  const trimmed = content.trim();
  return trimmed.length > 0
      && trimmed.length < 200
      && trimmed.indexOf('\n') === -1;
}

function classify(content, metadata) {
  const matches = [];
  for (const [klass, re] of Object.entries(PATTERNS)) {
    if (re.test(content)) matches.push(klass);
  }
  if (looksLikeNeighborhood(content)) matches.push('neighborhood-card');
  if (looksLikeCultural(content)) matches.push('cultural-card');
  if (looksLikePlayerTrueSource(content, metadata)) matches.push('player_truesource');

  if (matches.length === 0) {
    if (looksLikeRegistryOneLiner(content)) matches.push('registry-one-liner');
    else matches.push('unknown');
  }
  return {
    primary: matches[0],
    all: matches,
    multiMatch: matches.length > 1
  };
}

// ───────────────────────────────────────────────────────────────────────────
// Pass 1 — enumerate world-data IDs from list pagination
// ───────────────────────────────────────────────────────────────────────────

async function pass1EnumerateWorldDataIds() {
  console.log('=== PASS 1 — enumerate world-data IDs from /v3/documents/list ===');
  const probe = await apiCall('POST', '/v3/documents/list', { limit: PAGE_SIZE, page: 1 });
  if (probe.status !== 200) {
    console.error('[FAIL] /v3/documents/list page 1 returned', probe.status);
    console.error(JSON.stringify(probe.body, null, 2));
    process.exit(2);
  }
  const totalItemsAllOrg = probe.body.pagination.totalItems;
  const totalPagesAllOrg = probe.body.pagination.totalPages;
  console.log(`Org total: ${totalItemsAllOrg} items across ${totalPagesAllOrg} pages of ${PAGE_SIZE}`);
  if (MAX_PAGES !== Infinity) console.log(`--max-pages ${MAX_PAGES} (Pass 1 sample only)`);

  const lastPage = Math.min(totalPagesAllOrg, MAX_PAGES);
  const records = [];
  const tagSecondary = {};
  let scannedCount = 0;
  let oldestCreatedAt = null;
  let newestCreatedAt = null;

  for (let page = 1; page <= lastPage; page++) {
    const result = page === 1 ? probe : await apiCall('POST', '/v3/documents/list', { limit: PAGE_SIZE, page });
    if (result.status !== 200) {
      console.error(`[WARN] page ${page} returned ${result.status}; skipping`);
      continue;
    }
    const items = result.body.memories || [];
    scannedCount += items.length;

    let pageWorldData = 0;
    for (const item of items) {
      const tags = Array.isArray(item.containerTags) ? item.containerTags : [];
      if (!tags.includes('world-data')) continue;
      pageWorldData++;
      for (const t of tags) {
        if (t === 'world-data') continue;
        tagSecondary[t] = (tagSecondary[t] || 0) + 1;
      }
      if (item.createdAt) {
        if (!oldestCreatedAt || item.createdAt < oldestCreatedAt) oldestCreatedAt = item.createdAt;
        if (!newestCreatedAt || item.createdAt > newestCreatedAt) newestCreatedAt = item.createdAt;
      }
      records.push({
        id: item.id,
        tags,
        createdAt: item.createdAt,
        listTitle: item.title || null
      });
    }
    process.stdout.write(`page ${page}/${lastPage}: scanned ${items.length}, +${pageWorldData} world-data (running ${records.length})\n`);
    if (page < lastPage) await sleep(PAGE_SLEEP_MS);
  }
  return {
    totalItemsAllOrg,
    totalPagesAllOrg,
    pagesScanned: lastPage,
    itemsScanned: scannedCount,
    records,
    tagSecondary,
    oldestCreatedAt,
    newestCreatedAt
  };
}

// ───────────────────────────────────────────────────────────────────────────
// Pass 2 — GET each world-data doc and classify
// ───────────────────────────────────────────────────────────────────────────

async function pass2FetchAndClassify(records) {
  const target = MAX_FETCH === Infinity ? records : records.slice(0, MAX_FETCH);
  console.log(`\n=== PASS 2 — GET + classify (${target.length} docs, concurrency=${CONCURRENCY}) ===`);

  const classes = {};
  function bucket(klass) {
    if (!classes[klass]) classes[klass] = { count: 0, samples: [] };
    return classes[klass];
  }
  const anomalies = [];
  let fetched = 0;
  let failed = 0;
  const startMs = Date.now();

  // Process in batches of CONCURRENCY
  for (let i = 0; i < target.length; i += CONCURRENCY) {
    const batch = target.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map(async (rec) => {
      const got = await apiCall('GET', '/v3/documents/' + rec.id, null);
      return { rec, got };
    }));

    for (const { rec, got } of results) {
      fetched++;
      if (got.status !== 200 || !got.body) {
        failed++;
        if (VERBOSE) console.log(`  [${rec.id}] GET ${got.status} — skipping`);
        continue;
      }
      const content = got.body.content || '';
      const meta = got.body.metadata || {};
      const c = classify(content, meta);
      const b = bucket(c.primary);
      b.count++;
      if (b.samples.length < SAMPLES_PER_CLASS) {
        b.samples.push({
          id: rec.id,
          title: meta.title || got.body.title || rec.listTitle,
          tags: rec.tags,
          createdAt: rec.createdAt,
          contentHead: content.slice(0, 200).replace(/\n/g, ' \\n ')
        });
      }
      if (c.multiMatch) {
        anomalies.push({
          id: rec.id,
          allMatches: c.all,
          tags: rec.tags,
          contentHead: content.slice(0, 160).replace(/\n/g, ' \\n ')
        });
      }
      if (VERBOSE) {
        console.log(`  ${c.primary.padEnd(20)} ${rec.id} (${content.length}b)`);
      }
    }

    if ((i / CONCURRENCY) % 20 === 0 || (i + CONCURRENCY) >= target.length) {
      const elapsed = ((Date.now() - startMs) / 1000).toFixed(1);
      const rate = (fetched / Math.max(elapsed, 0.1)).toFixed(1);
      process.stdout.write(`  fetched ${fetched}/${target.length} (${rate}/s, ${failed} failed)\n`);
    }
  }
  return { classes, anomalies, fetched, failed };
}

// ───────────────────────────────────────────────────────────────────────────
// Main
// ───────────────────────────────────────────────────────────────────────────

async function main() {
  const pass1 = await pass1EnumerateWorldDataIds();
  const worldDataCount = pass1.records.length;
  const worldDataNoSecondaryCount = pass1.records.filter(r => r.tags.length === 1).length;

  if (worldDataCount === 0) {
    console.log('\nNo world-data records found; nothing to classify.');
    return;
  }

  const pass2 = await pass2FetchAndClassify(pass1.records);
  const classSum = Object.values(pass2.classes).reduce((acc, c) => acc + c.count, 0);

  const inventory = {
    auditedAt: new Date().toISOString(),
    plan: 'docs/plans/2026-04-27-world-data-unified-ingest-rebuild.md (Task 1.1)',
    method: 'two-pass: list-enumerate + GET-classify',
    scope: {
      orgTotalItems: pass1.totalItemsAllOrg,
      orgTotalPages: pass1.totalPagesAllOrg,
      pagesScanned: pass1.pagesScanned,
      maxPagesFlag: MAX_PAGES === Infinity ? null : MAX_PAGES,
      itemsScanned: pass1.itemsScanned,
      worldDataCount,
      worldDataNoSecondaryTag: worldDataNoSecondaryCount,
      pass2Fetched: pass2.fetched,
      pass2Failed: pass2.failed,
      maxFetchFlag: MAX_FETCH === Infinity ? null : MAX_FETCH,
      classSumCheck: classSum,
      sumMatchesFetched: classSum === (pass2.fetched - pass2.failed),
      oldestCreatedAt: pass1.oldestCreatedAt,
      newestCreatedAt: pass1.newestCreatedAt
    },
    classes: Object.fromEntries(
      Object.entries(pass2.classes)
        .sort(([, a], [, b]) => b.count - a.count)
        .map(([k, v]) => [k, { count: v.count, samples: v.samples }])
    ),
    secondaryTagsObserved: Object.fromEntries(
      Object.entries(pass1.tagSecondary).sort(([, a], [, b]) => b - a)
    ),
    anomalies: pass2.anomalies.slice(0, 50)
  };

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(inventory, null, 2));

  console.log('\n=== INVENTORY SUMMARY ===');
  console.log(`Org-total items scanned:        ${pass1.itemsScanned}`);
  console.log(`world-data tagged:              ${worldDataCount}`);
  console.log(`  (sole world-data tag, no wd-*): ${worldDataNoSecondaryCount}`);
  console.log(`Pass 2 fetched / failed:        ${pass2.fetched} / ${pass2.failed}`);
  console.log(`Classes:`);
  for (const [k, v] of Object.entries(inventory.classes)) {
    console.log(`  ${k.padEnd(22)} ${String(v.count).padStart(6)}`);
  }
  console.log(`Class sum:                      ${classSum} (matches successful fetches: ${classSum === (pass2.fetched - pass2.failed)})`);
  console.log(`Multi-class anomalies:          ${pass2.anomalies.length}`);
  console.log(`Secondary tags paired w/ world-data:`);
  if (Object.keys(inventory.secondaryTagsObserved).length === 0) console.log('  (none)');
  for (const [t, n] of Object.entries(inventory.secondaryTagsObserved)) {
    console.log(`  ${t.padEnd(30)} ${String(n).padStart(6)}`);
  }
  console.log(`\nOutput: ${OUTPUT_PATH}`);
  console.log('\nVerify (independent count): npx supermemory tags list  # find row for "world-data"');
}

main().catch(err => {
  console.error('[FATAL]', err);
  process.exit(1);
});
