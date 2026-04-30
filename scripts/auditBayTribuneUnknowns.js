/**
 * Audit bay-tribune `unknown` + `bt-published-other` docs — capture FULL
 * content for the Phase 1.5 per-doc disposition pass.
 *
 * Read-only. Same two-pass enumerate-and-classify as auditBayTribune.js,
 * but for the unknown + published-other classes captures the entire doc
 * (id + customId + title + metadata + full content, up to 8KB) so engine-sheet
 * can apply per-doc judgment to bucket each into one of the 5 dispositions
 * defined in plans/2026-04-30-bay-tribune-unified-ingest-rebuild.md §Task 1.5:
 *   archive-essay         Hal Richmond / P Slayer / Anthony Raines historical
 *   podcast-transcript    Person1/Person2 dialogue
 *   legacy-edition        pre-format-contract editions, no Y<n>C<m> anchor
 *   canon-correction      out-of-band canon notes
 *   delete-no-replacement junk / test / orphan, DELETE in M1
 *
 * Plan: docs/plans/2026-04-30-bay-tribune-unified-ingest-rebuild.md (Task 1.5)
 *
 * Usage:
 *   node scripts/auditBayTribuneUnknowns.js
 *
 * Output: output/bay_tribune_unknowns.json
 */

require('/root/GodWorld/lib/env');
const https = require('https');
const fs = require('fs');
const path = require('path');

const API_HOST = 'api.supermemory.ai';
const API_KEY = process.env.SUPERMEMORY_CC_API_KEY;
const PAGE_SIZE = 100;
const PAGE_SLEEP_MS = 200;
const CONCURRENCY = 5;
const CONTENT_HEAD_BYTES = 8000;
const OUTPUT_PATH = path.join(__dirname, '..', 'output', 'bay_tribune_unknowns.json');

if (!API_KEY) {
  console.error('[ERROR] SUPERMEMORY_CC_API_KEY not set in env');
  process.exit(1);
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

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Same classifier shape as auditBayTribune.js — duplicated here so the two
// scripts stay independently runnable. Kept short.

function detectCanonWrapper(content) {
  const m = content.match(/^\[CANON:([a-z0-9-]+):[^\]]+\]/m);
  return m ? m[1] : null;
}

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
  if (/^\[TYPE:\s*\w+\s*\|\s*C\d+\]/m.test(content)) return 'bt-wiki-other';
  return null;
}

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
  if (matches.length === 0 && metadata && typeof metadata.type === 'string') {
    const metaClass = METADATA_TYPE_TO_CLASS[metadata.type];
    if (metaClass) matches.push(metaClass);
  }
  if (matches.length === 0) matches.push('unknown');
  return matches[0];
}

const TARGET_CLASSES = new Set(['unknown', 'bt-published-other']);

async function main() {
  console.log('=== Pass 1 — enumerate bay-tribune IDs ===');
  const probe = await apiCall('POST', '/v3/documents/list', { limit: PAGE_SIZE, page: 1 });
  if (probe.status !== 200) {
    console.error('[FAIL] /v3/documents/list page 1 returned', probe.status);
    process.exit(2);
  }
  const totalPages = probe.body.pagination.totalPages;

  const records = [];
  for (let page = 1; page <= totalPages; page++) {
    const result = page === 1 ? probe : await apiCall('POST', '/v3/documents/list', { limit: PAGE_SIZE, page });
    if (result.status !== 200) continue;
    const items = result.body.memories || [];
    for (const item of items) {
      const tags = Array.isArray(item.containerTags) ? item.containerTags : [];
      if (!tags.includes('bay-tribune')) continue;
      records.push({
        id: item.id,
        tags,
        createdAt: item.createdAt,
        listTitle: item.title || null,
        customId: item.customId || null
      });
    }
    process.stdout.write(`  page ${page}/${totalPages}: running ${records.length}\n`);
    if (page < totalPages) await sleep(PAGE_SLEEP_MS);
  }
  console.log(`Total bay-tribune docs: ${records.length}`);

  console.log(`\n=== Pass 2 — GET + filter to ${[...TARGET_CLASSES].join(' / ')} ===`);
  const targetDocs = [];

  for (let i = 0; i < records.length; i += CONCURRENCY) {
    const batch = records.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map(async (rec) => {
      const got = await apiCall('GET', '/v3/documents/' + rec.id, null);
      return { rec, got };
    }));

    for (const { rec, got } of results) {
      if (got.status !== 200 || !got.body) continue;
      const content = got.body.content || '';
      const meta = got.body.metadata || {};
      const klass = classify(content, meta);
      if (!TARGET_CLASSES.has(klass)) continue;
      targetDocs.push({
        id: rec.id,
        customId: got.body.customId || rec.customId || null,
        currentClass: klass,
        title: meta.title || got.body.title || rec.listTitle,
        metadataType: meta.type || null,
        tags: rec.tags,
        createdAt: rec.createdAt,
        contentLength: content.length,
        contentHead: content.slice(0, CONTENT_HEAD_BYTES)
      });
    }
  }

  console.log(`Target docs captured: ${targetDocs.length}`);
  for (const d of targetDocs) {
    console.log(`  ${d.currentClass.padEnd(20)} ${d.id}  meta.type=${d.metadataType || '-'}  title=${(d.title || '').substring(0, 60)}`);
  }

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify({
    auditedAt: new Date().toISOString(),
    plan: 'docs/plans/2026-04-30-bay-tribune-unified-ingest-rebuild.md (Task 1.5)',
    targetClasses: [...TARGET_CLASSES],
    docCount: targetDocs.length,
    docs: targetDocs
  }, null, 2));
  console.log(`\nOutput: ${OUTPUT_PATH}`);
}

main().catch(err => {
  console.error('[FATAL]', err);
  process.exit(1);
});
