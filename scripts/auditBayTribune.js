/**
 * Audit bay-tribune container — enumerate every doc, classify by content
 * shape, write inventory JSON for the Phase 1.2 decision pass.
 *
 * Read-only. No writes, no deletes.
 *
 * Plan: docs/plans/2026-04-30-bay-tribune-unified-ingest-rebuild.md (Task 1.1)
 *
 * Method (two-pass, same shape as auditWorldData.js S183):
 *   PASS 1 — POST /v3/documents/list paginates the entire org. Server-side
 *            tag filter is IGNORED, so we list everything and client-side
 *            filter for items whose containerTags array contains
 *            'bay-tribune'. List returns metadata only (no content body),
 *            so PASS 1 only captures id + tags + createdAt.
 *
 *   PASS 2 — GET /v3/documents/{id} for every PASS-1 hit, with concurrency=5,
 *            to fetch the actual content body. Classify against content
 *            shape signature:
 *              bt-canon-wrapped     — opens with [CANON:<type>:<date>]
 *              bt-edition           — masthead THE CYCLE PULSE — EDITION N
 *              bt-dispatch          — masthead THE CYCLE PULSE — DISPATCH N
 *              bt-supplemental      — masthead Supplemental / SUPPLEMENTAL
 *              bt-interview-article — masthead INTERVIEW (article shape)
 *              bt-published-other   — masthead present but type indeterminate
 *              bt-wiki-appearance   — wiki record: "[TYPE: ...] X appeared in Y N in M section(s)"
 *              bt-wiki-returning    — wiki record: "[TYPE: ...] Y N returning citizen:"
 *              bt-wiki-new          — wiki record: "[TYPE: ...] Y N introduced new citizen:"
 *              bt-wiki-storyline    — wiki record: "[TYPE: ...] Y N storyline update:"
 *              bt-wiki-continuity   — wiki record: "[TYPE: ...] Y N continuity note:"
 *              bt-wiki-other        — TYPE-prefixed but doesn't match a known wiki shape
 *              unknown              — escapes all signatures (orphan / manual / test)
 *
 *   Output: output/bay_tribune_inventory.json with totals, per-class counts,
 *           5 sample doc IDs per class, anomalies (multi-class matches),
 *           secondary-tag observed pairs, dual_tagged + customId_present counts.
 *
 * Verify: total matches `npx supermemory tags list` for bay-tribune.
 *
 * Usage:
 *   node scripts/auditBayTribune.js                  # full enumeration
 *   node scripts/auditBayTribune.js --max-pages 3    # quick sanity (Pass 1 only on N pages)
 *   node scripts/auditBayTribune.js --max-fetch 200  # cap Pass 2 GETs (sampling mode)
 *   node scripts/auditBayTribune.js --concurrency 8  # bump GET concurrency
 *   node scripts/auditBayTribune.js --verbose        # log every classification
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
const OUTPUT_PATH = path.join(__dirname, '..', 'output', 'bay_tribune_inventory.json');

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
// Classifier — bay-tribune content-shape signatures
// ───────────────────────────────────────────────────────────────────────────

// /save-to-bay-tribune format wraps content with [CANON:<type>:<date>]. The
// inner type carries through to classification (roster / game-result /
// canon-correction / etc.) so /save-to-bay-tribune writes cluster correctly.
// Date slot accepts any non-`]` token — real saves use both YYYY-MM-DD and
// `cycle-NN` shapes; locking to one form drops valid canon writes into
// `unknown` for no Phase-1-useful reason.
function detectCanonWrapper(content) {
  const m = content.match(/^\[CANON:([a-z0-9-]+):[^\]]+\]/m);
  return m ? m[1] : null;
}

// ingestEdition.js writes chunks whose first line is the masthead. Different
// publication types ship distinct mastheads — extracted here so engine-sheet
// can later sub-tag by type during the Phase 2 retrofit.
function detectMastheadType(content) {
  const head = content.slice(0, 500);
  if (/THE CYCLE PULSE\s*[—-]+\s*EDITION\s+\d+/i.test(head)) return 'bt-edition';
  if (/THE CYCLE PULSE\s*[—-]+\s*DISPATCH\s+\d+/i.test(head)) return 'bt-dispatch';
  if (/THE CYCLE PULSE\s*[—-]+\s*INTERVIEW/i.test(head)) return 'bt-interview-article';
  if (/INTERVIEW TRANSCRIPT/i.test(head)) return 'bt-interview-transcript';
  if (/Supplemental|SUPPLEMENTAL/.test(head)) return 'bt-supplemental';
  if (/THE CYCLE PULSE|Bay Tribune\s*\|\s*Cycle\s*\d+/i.test(head)) return 'bt-published-other';
  return null;
}

// ingestEditionWiki.js emits per-record wiki memories. Post-S189, content
// carries a [TYPE: <type> | C<n>] prefix; pre-S189 memories don't (the
// hardcoded "appeared in Edition N..." shape was the only signal). Classifier
// matches both — prefix-optional regex catches legacy + new in one pattern.
const WIKI_PATTERNS = {
  'bt-wiki-appearance': /(?:^\[TYPE:\s*\w+\s*\|\s*C\d+\]\s+)?[^\n]*\bappeared in\s+\w+\s+\d+[^\n]*\bsection\(s\):/m,
  'bt-wiki-returning':  /(?:^\[TYPE:\s*\w+\s*\|\s*C\d+\]\s+)?\w+\s+\d+\s+returning citizen:/m,
  'bt-wiki-new':        /(?:^\[TYPE:\s*\w+\s*\|\s*C\d+\]\s+)?\w+\s+\d+\s+introduced new citizen:/m,
  'bt-wiki-storyline':  /(?:^\[TYPE:\s*\w+\s*\|\s*C\d+\]\s+)?\w+\s+\d+\s+storyline update:/m,
  'bt-wiki-continuity': /(?:^\[TYPE:\s*\w+\s*\|\s*C\d+\]\s+)?\w+\s+\d+\s+continuity note:/m
};

function detectWikiShape(content) {
  for (const [klass, re] of Object.entries(WIKI_PATTERNS)) {
    if (re.test(content)) return klass;
  }
  // [TYPE:...] prefix without a known wiki shape — bucket separately for
  // Phase 1.2 decision pass to inspect.
  if (/^\[TYPE:\s*\w+\s*\|\s*C\d+\]/m.test(content)) return 'bt-wiki-other';
  return null;
}

// metadata.type fallback signal — chunked editions (Part 2+) lose the
// masthead since ingestEdition.js splits the body across multiple docs but
// only Part 1 carries the masthead text. For those, the writer's
// metadata.type field ('edition' / 'supplemental' / 'dispatch' / 'interview')
// is the surviving signal. Routed through a separate metadata fallback so the
// inventory tracks "no shape match but metadata says X" as its own class —
// Phase 1.2 decision pass needs visibility into how much we're trusting
// metadata vs content.
const METADATA_TYPE_TO_CLASS = {
  'edition': 'bt-edition-chunk',
  'supplemental': 'bt-supplemental-chunk',
  'dispatch': 'bt-dispatch-chunk',
  'interview': 'bt-interview-chunk',
  'interview-article': 'bt-interview-article-chunk',
  'interview-transcript': 'bt-interview-transcript-chunk'
};

function classify(content, metadata) {
  const matches = [];

  const canonType = detectCanonWrapper(content);
  if (canonType) matches.push('bt-canon-' + canonType);

  const wikiShape = detectWikiShape(content);
  if (wikiShape) matches.push(wikiShape);

  const mastheadType = detectMastheadType(content);
  if (mastheadType) matches.push(mastheadType);

  // Metadata fallback only fires when content shape didn't classify
  if (matches.length === 0 && metadata && typeof metadata.type === 'string') {
    const metaClass = METADATA_TYPE_TO_CLASS[metadata.type];
    if (metaClass) matches.push(metaClass);
  }

  if (matches.length === 0) {
    matches.push('unknown');
  }

  return {
    primary: matches[0],
    all: matches,
    multiMatch: matches.length > 1,
    canonType,
    mastheadType,
    wikiShape
  };
}

// ───────────────────────────────────────────────────────────────────────────
// Pass 1 — enumerate bay-tribune IDs from list pagination
// ───────────────────────────────────────────────────────────────────────────

async function pass1EnumerateBayTribuneIds() {
  console.log('=== PASS 1 — enumerate bay-tribune IDs from /v3/documents/list ===');
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

    let pageBayTribune = 0;
    for (const item of items) {
      const tags = Array.isArray(item.containerTags) ? item.containerTags : [];
      if (!tags.includes('bay-tribune')) continue;
      pageBayTribune++;
      for (const t of tags) {
        if (t === 'bay-tribune') continue;
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
        listTitle: item.title || null,
        customId: item.customId || null
      });
    }
    process.stdout.write(`page ${page}/${lastPage}: scanned ${items.length}, +${pageBayTribune} bay-tribune (running ${records.length})\n`);
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
// Pass 2 — GET each bay-tribune doc and classify
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
  let customIdPresent = 0;
  const startMs = Date.now();

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
      // customId may live on the doc body even when the list view didn't return it
      const docCustomId = got.body.customId || rec.customId || null;
      if (docCustomId) customIdPresent++;

      const c = classify(content, meta);
      const b = bucket(c.primary);
      b.count++;
      if (b.samples.length < SAMPLES_PER_CLASS) {
        b.samples.push({
          id: rec.id,
          customId: docCustomId,
          title: meta.title || got.body.title || rec.listTitle,
          tags: rec.tags,
          metadataType: meta.type || null,
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
        console.log(`  ${c.primary.padEnd(24)} ${rec.id} (${content.length}b)`);
      }
    }

    if ((i / CONCURRENCY) % 20 === 0 || (i + CONCURRENCY) >= target.length) {
      const elapsed = ((Date.now() - startMs) / 1000).toFixed(1);
      const rate = (fetched / Math.max(elapsed, 0.1)).toFixed(1);
      process.stdout.write(`  fetched ${fetched}/${target.length} (${rate}/s, ${failed} failed)\n`);
    }
  }
  return { classes, anomalies, fetched, failed, customIdPresent };
}

// ───────────────────────────────────────────────────────────────────────────
// Main
// ───────────────────────────────────────────────────────────────────────────

async function main() {
  const pass1 = await pass1EnumerateBayTribuneIds();
  const bayTribuneCount = pass1.records.length;
  const dualTaggedCount = pass1.records.filter(r => r.tags.length > 1).length;
  const soleTagCount = bayTribuneCount - dualTaggedCount;

  if (bayTribuneCount === 0) {
    console.log('\nNo bay-tribune records found; nothing to classify.');
    return;
  }

  const pass2 = await pass2FetchAndClassify(pass1.records);
  const classSum = Object.values(pass2.classes).reduce((acc, c) => acc + c.count, 0);

  const inventory = {
    auditedAt: new Date().toISOString(),
    plan: 'docs/plans/2026-04-30-bay-tribune-unified-ingest-rebuild.md (Task 1.1)',
    method: 'two-pass: list-enumerate + GET-classify',
    scope: {
      orgTotalItems: pass1.totalItemsAllOrg,
      orgTotalPages: pass1.totalPagesAllOrg,
      pagesScanned: pass1.pagesScanned,
      maxPagesFlag: MAX_PAGES === Infinity ? null : MAX_PAGES,
      itemsScanned: pass1.itemsScanned,
      bayTribuneCount,
      dualTaggedCount,         // already carrying a 2nd tag (forward-compat)
      soleBayTribuneCount: soleTagCount,  // single-tag — needs migration
      customIdPresent: pass2.customIdPresent,
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
  console.log(`bay-tribune tagged:             ${bayTribuneCount}`);
  console.log(`  dual-tagged (bay-tribune + bt-*):  ${dualTaggedCount}`);
  console.log(`  sole bay-tribune (needs migration): ${soleTagCount}`);
  console.log(`  customId present:                  ${pass2.customIdPresent}`);
  console.log(`Pass 2 fetched / failed:        ${pass2.fetched} / ${pass2.failed}`);
  console.log(`Classes:`);
  for (const [k, v] of Object.entries(inventory.classes)) {
    console.log(`  ${k.padEnd(26)} ${String(v.count).padStart(6)}`);
  }
  console.log(`Class sum:                      ${classSum} (matches successful fetches: ${classSum === (pass2.fetched - pass2.failed)})`);
  console.log(`Multi-class anomalies:          ${pass2.anomalies.length}`);
  console.log(`Secondary tags paired w/ bay-tribune:`);
  if (Object.keys(inventory.secondaryTagsObserved).length === 0) console.log('  (none)');
  for (const [t, n] of Object.entries(inventory.secondaryTagsObserved)) {
    console.log(`  ${t.padEnd(30)} ${String(n).padStart(6)}`);
  }
  console.log(`\nOutput: ${OUTPUT_PATH}`);
  console.log('\nVerify (independent count): npx supermemory tags list  # find row for "bay-tribune"');
}

main().catch(err => {
  console.error('[FATAL]', err);
  process.exit(1);
});
