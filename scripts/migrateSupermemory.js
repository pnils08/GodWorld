/**
 * Migrate Supermemory items from GodWorld org to P N org.
 *
 * Usage: node scripts/migrateSupermemory.js [--dry-run] [--page N] [--tag mags]
 *
 * Reads:
 *   - GodWorld key from shell env (SUPERMEMORY_CC_API_KEY via .bashrc)
 *   - P N key from .env file (parsed directly to bypass dotenv no-override)
 *
 * API notes (discovered S109):
 *   - POST /v3/documents/list returns ALL items (docs + memories) in "memories" array
 *   - Pagination is page-based: { page, limit } -> { pagination: { currentPage, totalPages, totalItems } }
 *   - containerTag filter param is IGNORED by the API — filtering must be done client-side
 *   - Each item has containerTags array showing its actual tags
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// --- Read both keys ---

const GW_KEY = process.env.SUPERMEMORY_CC_API_KEY;

// Parse .env directly to get P N key (dotenv won't override shell env)
const envPath = process.env.GODWORLD_ENV_FILE || '/root/.config/godworld/.env';
const envContent = fs.readFileSync(envPath, 'utf8');
const pnMatch = envContent.match(/^SUPERMEMORY_CC_API_KEY\s*=\s*"?([^"\n]+)"?/m);
const PN_KEY = pnMatch ? pnMatch[1].trim() : null;

if (!GW_KEY) { console.error('No GodWorld key in shell env'); process.exit(1); }
if (!PN_KEY) { console.error('No P N key in .env'); process.exit(1); }
if (GW_KEY === PN_KEY) { console.error('Both keys are the same — nothing to migrate'); process.exit(1); }

console.log(`GodWorld key: ${GW_KEY.slice(0,6)}...${GW_KEY.slice(-4)}`);
console.log(`P N key:      ${PN_KEY.slice(0,6)}...${PN_KEY.slice(-4)}`);

// --- Args ---
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const startPage = (() => {
  const idx = args.indexOf('--page');
  return idx !== -1 && args[idx+1] ? parseInt(args[idx+1]) : 1;
})();
const tagFilter = (() => {
  const idx = args.indexOf('--tag');
  return idx !== -1 && args[idx+1] ? args[idx+1] : null;
})();

const PAGE_SIZE = 100;
const DATE_CUTOFF = new Date('2026-03-18T00:00:00Z'); // Only migrate curated work, not contamination

// Map source tags to PN's 3 clean containers
function mapTags(sourceTags) {
  const mapped = new Set();
  for (const tag of sourceTags) {
    if (tag === 'mags') mapped.add('mags');
    else if (tag === 'mara') mapped.add('mara');
    else if (tag === 'godworld') mapped.add('godworld');
    else if (tag.startsWith('edition')) mapped.add('godworld');
    else if (tag.startsWith('discord_user')) mapped.add('mags');
    // skip junk tags (claudecode_project_*, sm_project_*, pnils08, test, unknown hashes)
  }
  if (mapped.size === 0) return null; // skip items with no mappable tags
  return [...mapped];
}

// --- API helpers ---

function apiCall(apiKey, method, apiPath, body) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: 'api.supermemory.ai',
      port: 443,
      path: apiPath,
      method: method,
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json',
        ...(postData ? { 'Content-Length': Buffer.byteLength(postData) } : {})
      }
    };
    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, data: data }); }
      });
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function listPage(apiKey, page) {
  return apiCall(apiKey, 'POST', '/v3/documents/list', { limit: PAGE_SIZE, page });
}

async function getDoc(apiKey, docId) {
  return apiCall(apiKey, 'GET', '/v3/documents/' + docId);
}

async function addDoc(apiKey, content, containerTags, metadata) {
  const body = { content, containerTags };
  if (metadata) body.metadata = metadata;
  return apiCall(apiKey, 'POST', '/v3/documents', body);
}

// --- Migration ---

async function main() {
  console.log(`\n=== Supermemory Migration: GodWorld → P N ===`);
  if (dryRun) console.log('*** DRY RUN — no writes ***');
  if (tagFilter) console.log(`Tag filter: ${tagFilter}`);
  if (startPage > 1) console.log(`Starting from page: ${startPage}`);

  // Get total count
  const probe = await listPage(GW_KEY, 1);
  if (probe.status !== 200) {
    console.error('Failed to list:', probe.data);
    process.exit(1);
  }
  const totalItems = probe.data.pagination.totalItems;
  const totalPages = probe.data.pagination.totalPages;
  console.log(`Total items in GodWorld org: ${totalItems} (${totalPages} pages of ${PAGE_SIZE})`);

  let migrated = 0;
  let skipped = 0;
  let failed = 0;
  let tagCounts = {};

  for (let page = startPage; page <= totalPages; page++) {
    const result = page === 1 && startPage === 1 ? probe : await listPage(GW_KEY, page);

    if (result.status !== 200) {
      console.error(`Page ${page} failed (${result.status}):`, result.data);
      continue;
    }

    const items = result.data.memories || [];
    console.log(`\n--- Page ${page}/${totalPages} (${items.length} items) ---`);

    let hitOldItems = false;
    for (const item of items) {
      const tags = item.containerTags || [];
      const tagStr = tags.join(',');

      // Date cutoff — only migrate curated work from Mar 18+
      const created = new Date(item.createdAt);
      if (created < DATE_CUTOFF) {
        hitOldItems = true;
        skipped++;
        continue;
      }

      // Client-side tag filter
      if (tagFilter && !tags.includes(tagFilter)) {
        skipped++;
        continue;
      }

      // Map to clean PN containers
      const destTags = mapTags(tags);
      if (!destTags) {
        skipped++;
        continue;
      }

      // Track tag distribution
      for (const t of destTags) { tagCounts[t] = (tagCounts[t] || 0) + 1; }

      const title = (item.title || item.summary || '').slice(0, 60).replace(/\n/g, ' ');

      if (dryRun) {
        console.log(`  DRY RUN [${tagStr}] -> [${destTags}] ${title}`);
        migrated++;
        continue;
      }

      // Get full content
      let content = item.content;
      if (!content && item.id) {
        const full = await getDoc(GW_KEY, item.id);
        if (full.status === 200) {
          content = full.data.content || full.data.text || '';
        }
      }

      if (!content) {
        console.log(`  SKIP — no content (id: ${item.id}) [${tagStr}] ${title}`);
        failed++;
        continue;
      }

      // Write to P N org with mapped tags
      const metadata = item.metadata || {};
      metadata.migrated_from = 'godworld_org';
      metadata.migration_date = new Date().toISOString().split('T')[0];
      if (item.customId) metadata.original_customId = item.customId;

      const writeResult = await addDoc(PN_KEY, content, destTags, metadata);

      if (writeResult.status === 200 || writeResult.status === 201) {
        console.log(`  OK [${tagStr}] ${title}`);
        migrated++;
      } else {
        console.log(`  FAIL (${writeResult.status}) [${tagStr}] ${title}`);
        failed++;
      }

      // Rate limit
      await new Promise(r => setTimeout(r, 150));
    }

    // Items are sorted newest-first — once we hit old items, we're done
    if (hitOldItems) {
      console.log(`\nReached items before ${DATE_CUTOFF.toISOString().slice(0,10)} — stopping.`);
      break;
    }
  }

  console.log(`\n=== MIGRATION COMPLETE ===`);
  console.log(`Migrated: ${migrated} | Skipped: ${skipped} | Failed: ${failed}`);
  console.log('\nTag distribution:');
  for (const [tag, count] of Object.entries(tagCounts).sort((a,b) => b[1] - a[1])) {
    console.log(`  ${tag}: ${count}`);
  }

  if (!dryRun && migrated > 0) {
    console.log(`\nNext steps:`);
    console.log(`1. Verify in P N console: console.supermemory.ai`);
    console.log(`2. Update .bashrc line 102: replace GodWorld key with P N key`);
    console.log(`3. source ~/.bashrc`);
    console.log(`4. Restart Discord bot: pm2 restart mags-bot`);
  }
}

main().catch(err => { console.error('Migration failed:', err); process.exit(1); });
