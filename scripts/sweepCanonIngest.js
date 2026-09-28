#!/usr/bin/env node
/**
 * sweepCanonIngest.js — engine.91 T2: deterministic canon sweep (rewrite, S502).
 *
 * The builder ruled 2026-09-27: "drive files are canon, all pre cycle articles and articles saved pre cron runs
 * are established canon." The Drive canon folders are the gap every other writer misses — editions and the
 * Saturday per-article sweep already land in `bay-tribune` with deterministic customIds (ingestEdition.js
 * `<type>-c<cycle>-<slug>-<chunk>`, cron-saturday-run.js `article-c<cycle>-<stem>`).
 *
 * Method (no fuzzy search, no LLM):
 *   1. List every text / Google-Doc file under DRIVE_CANON_FOLDERS (Drive API, drive.readonly).
 *   2. Pull the org's document list once (POST /v3/documents/list, paginated; server tag filter is ignored,
 *      so customIds are read client-side).
 *   3. A Drive file is present when `drive-<fileId>-1` exists. Missing files are the sweep's work.
 *   4. --apply: fetch each missing file's text, split into chunks on paragraph breaks (≤ MAX_CHUNK chars),
 *      upsert each chunk with customId `drive-<fileId>-<n>` into `bay-tribune`. Re-running is idempotent.
 *
 * Dry-run is the default; nothing is written without --apply.
 *
 * Usage:
 *   node scripts/sweepCanonIngest.js            # dry-run: list missing files
 *   node scripts/sweepCanonIngest.js --apply    # ingest missing files
 *   node scripts/sweepCanonIngest.js --limit 5  # cap files processed (either mode)
 */
require('/root/GodWorld/lib/env');
const https = require('https');
const { google } = require('googleapis');

// Tribune Media Archive + Deep Canon (pre-cycle / pre-cron articles). docs/plans/2026-07-31-canon-ingest-backfill.md
const DRIVE_CANON_FOLDERS = [
  { id: '10Y-X48HloGv9EEllWSm-Mycpmbj_9DVS', label: 'tribune-archive' },
  { id: '1qC0tJKCYlpe98sZ2BTRt8GA4OPLIQekt', label: 'deep-canon' },
];
const CONTAINER_TAG = 'bay-tribune';
const API_HOST = 'api.supermemory.ai';
const API_KEY = process.env.SUPERMEMORY_CC_API_KEY;
const MAX_CHUNK = 40000; // same margin as ingestEdition.js
const PAGE_SIZE = 100;

const APPLY = process.argv.includes('--apply');
const limIdx = process.argv.indexOf('--limit');
const LIMIT = limIdx >= 0 ? Number(process.argv[limIdx + 1]) : Infinity;

const TEXT_MIME = mt => mt === 'text/plain' || mt === 'application/vnd.google-apps.document' || /^text\//.test(mt || '');

function customIdFor(fileId, n) { return 'drive-' + fileId + '-' + n; }

// Paragraph-boundary chunking; a short file is one chunk.
function chunkText(text, max) {
  max = max || MAX_CHUNK;
  const out = [];
  let pos = 0;
  while (pos < text.length) {
    let end = Math.min(pos + max, text.length);
    if (end < text.length) {
      const brk = text.lastIndexOf('\n\n', end);
      if (brk > pos + max * 0.5) end = brk;
    }
    const piece = text.slice(pos, end).trim();
    if (piece) out.push(piece);
    pos = end;
  }
  return out;
}

function apiCall(method, apiPath, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const headers = { Authorization: 'Bearer ' + API_KEY, Accept: 'application/json' };
    if (payload) { headers['Content-Type'] = 'application/json'; headers['Content-Length'] = Buffer.byteLength(payload); }
    const req = https.request({ hostname: API_HOST, port: 443, path: apiPath, method, headers }, res => {
      let data = '';
      res.on('data', c => { data += c; });
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

async function listExistingCustomIds() {
  const ids = new Set();
  const first = await apiCall('POST', '/v3/documents/list', { limit: PAGE_SIZE, page: 1 });
  if (first.status !== 200) throw new Error('/v3/documents/list page 1 returned ' + first.status + ': ' + JSON.stringify(first.body).slice(0, 200));
  const pages = first.body.pagination.totalPages;
  for (let page = 1; page <= pages; page++) {
    const r = page === 1 ? first : await apiCall('POST', '/v3/documents/list', { limit: PAGE_SIZE, page });
    if (r.status !== 200) throw new Error('/v3/documents/list page ' + page + ' returned ' + r.status); // a gap would re-ingest — fail loud
    for (const m of (r.body.memories || [])) if (m.customId) ids.add(m.customId);
  }
  return ids;
}

async function listDriveFiles(drive, folderId, pathPrefix) {
  const files = [];
  let pageToken = null;
  do {
    const r = await drive.files.list({
      q: "'" + folderId + "' in parents and trashed = false",
      fields: 'nextPageToken, files(id, name, mimeType, modifiedTime)',
      pageSize: 200, pageToken: pageToken || undefined,
      supportsAllDrives: true, includeItemsFromAllDrives: true,
    });
    for (const f of r.data.files || []) {
      if (f.mimeType === 'application/vnd.google-apps.folder') {
        files.push(...await listDriveFiles(drive, f.id, pathPrefix + '/' + f.name));
      } else if (TEXT_MIME(f.mimeType)) {
        files.push({ id: f.id, name: f.name, mimeType: f.mimeType, modifiedTime: f.modifiedTime, path: pathPrefix });
      }
    }
    pageToken = r.data.nextPageToken;
  } while (pageToken);
  return files;
}

async function fetchText(drive, f) {
  if (f.mimeType === 'application/vnd.google-apps.document') {
    const r = await drive.files.export({ fileId: f.id, mimeType: 'text/plain' });
    return String(r.data || '');
  }
  const r = await drive.files.get({ fileId: f.id, alt: 'media' }, { responseType: 'arraybuffer' });
  return Buffer.from(r.data).toString('utf8');
}

async function main() {
  if (!API_KEY) throw new Error('SUPERMEMORY_CC_API_KEY missing');
  const auth = new google.auth.GoogleAuth({ keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS, scopes: ['https://www.googleapis.com/auth/drive.readonly'] });
  const drive = google.drive({ version: 'v3', auth });

  const files = [];
  for (const folder of DRIVE_CANON_FOLDERS) {
    const got = await listDriveFiles(drive, folder.id, folder.label);
    console.log(folder.label + ': ' + got.length + ' text file(s)');
    files.push(...got);
  }
  const existing = await listExistingCustomIds();
  console.log('org customIds seen: ' + existing.size);

  const missing = files.filter(f => !existing.has(customIdFor(f.id, 1)));
  console.log('present: ' + (files.length - missing.length) + ' | missing: ' + missing.length + (APPLY ? '' : ' (dry-run — nothing written)'));

  let done = 0, chunks = 0, failed = 0;
  for (const f of missing) {
    if (done >= LIMIT) break;
    if (!APPLY) { console.log('  would ingest  ' + f.path + ' / ' + f.name); done++; continue; }
    try {
      const text = (await fetchText(drive, f)).trim();
      if (!text) { console.log('  empty, skipped  ' + f.name); done++; continue; }
      const parts = chunkText(text);
      for (let i = 0; i < parts.length; i++) {
        const title = f.name + (parts.length > 1 ? ' (Part ' + (i + 1) + ')' : '');
        const r = await apiCall('POST', '/v3/documents', {
          content: parts[i], containerTags: [CONTAINER_TAG], customId: customIdFor(f.id, i + 1),
          metadata: { title, source: 'drive-canon', type: 'archive', driveFileId: f.id, drivePath: f.path, driveModified: f.modifiedTime || '' },
        });
        if (r.status < 200 || r.status >= 300) throw new Error('HTTP ' + r.status + ': ' + JSON.stringify(r.body).slice(0, 200));
        chunks++;
      }
      console.log('  ingested  ' + f.path + ' / ' + f.name + ' (' + parts.length + ' chunk' + (parts.length > 1 ? 's' : '') + ')');
      done++;
    } catch (e) {
      failed++;
      console.error('  FAILED  ' + f.name + ': ' + e.message);
    }
  }
  console.log((APPLY ? 'ingested ' + (done - failed) + ' file(s), ' + chunks + ' chunk(s), ' + failed + ' failed' : done + ' file(s) listed'));
  if (failed) process.exit(1); // a partial ingest exits non-zero (engine.114 contract)
}

if (require.main === module) {
  main().catch(e => { console.error('sweepCanonIngest: ' + e.message); process.exit(1); });
}

module.exports = { chunkText, customIdFor, DRIVE_CANON_FOLDERS };
