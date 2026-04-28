#!/usr/bin/env node
/**
 * ingestPlayerTrueSource.js — A's truesource Drive → world-data Supermemory
 * [engine/sheet] — S180 build, S183 R2 retrofit (dual-tagged + wipe-old)
 *
 * Reads rich truesource canon (per-season intake, POP-ID DataPage, TrueSource
 * v1.0 attribute sheets) from Drive `MLB_Roster_Data_Cards/{player}/True_Source/`
 * and ingests as supplemental memories in world-data Supermemory keyed by
 * POPID. Doesn't replace citizen cards — adds a parallel truesource layer
 * MCP lookup_citizen can retrieve for elite Tier-1/Tier-2 A's players.
 *
 * S183 R2 retrofit: writes now carry containerTags ['world-data',
 * 'wd-player-truesource']. Adds --wipe-old flag that wipes prior truesource
 * docs by content signature (=== PLAYER TRUESOURCE — header) before re-ingest.
 * addDocument now uses W1 hardening (retry-on-401/429 with 8s backoff).
 *
 * Drive root (from saveToDrive.js DESTINATIONS.player):
 *   1kJTjCkDBm0fYjU_ca4ul-qliMzdddv9S — MLB_Roster_Data_Cards
 *
 * Each player subfolder may contain a True_Source/ subdirectory with .txt
 * files. Script walks all subfolders, finds True_Source/, fetches .txt
 * files, resolves POPID (from DataPage `POPID:` header OR Simulation_Ledger
 * First+Last lookup), and POSTs to world-data with metadata routing.
 *
 * Usage:
 *   node scripts/ingestPlayerTrueSource.js --dry-run                          # default — no writes
 *   node scripts/ingestPlayerTrueSource.js --apply                            # write to world-data (no wipe)
 *   node scripts/ingestPlayerTrueSource.js --apply --wipe-old                 # wipe prior truesource + re-write
 *   node scripts/ingestPlayerTrueSource.js --apply --include-flat             # add MLB top-level flat-files
 *   node scripts/ingestPlayerTrueSource.js --apply --include-prospects        # add Top_Prospects passes
 *   node scripts/ingestPlayerTrueSource.js --player "Danny Horn"              # one player only
 *   node scripts/ingestPlayerTrueSource.js --folder <ID> --apply              # override Drive root
 *
 * Output: output/intake_player_truesource.json (per-player results +
 * POPID resolution + Drive file inventory).
 *
 * Requires:
 *   GOOGLE_APPLICATION_CREDENTIALS — service account
 *   SUPERMEMORY_CC_API_KEY — Supermemory ingest auth
 *   GODWORLD_SHEET_ID — for POPID fallback lookup
 */

require('/root/GodWorld/lib/env');
const fs = require('fs');
const path = require('path');
const https = require('https');
const { google } = require('googleapis');
const sheets = require('../lib/sheets');

const DRIVE_ROOT_MLB = '1kJTjCkDBm0fYjU_ca4ul-qliMzdddv9S';        // MLB_Roster_Data_Cards
const DRIVE_ROOT_PROSPECTS = '1QBDslfH7zLmUPUa-c_AOkG4bWyHHPKrA';  // Top_Prospects_Data_Cards
const CONTAINER_TAG = 'world-data';
const DOMAIN_TAG = 'wd-player-truesource';                         // S183 R2 — dual-tag retrofit
const API_HOST = 'api.supermemory.ai';
const PROJECT_ROOT = path.resolve(__dirname, '..');

const APPLY = process.argv.includes('--apply');
const DRY_RUN = !APPLY;
const INCLUDE_FLAT = process.argv.includes('--include-flat');           // top-level files in MLB_Roster_Data_Cards
const INCLUDE_PROSPECTS = process.argv.includes('--include-prospects'); // Top_Prospects_Data_Cards
const SKIP_SUBFOLDER = process.argv.includes('--skip-subfolder');       // skip Pass A (use after first --apply)
const WIPE_OLD = process.argv.includes('--wipe-old');                   // S183 R2 — pre-pass wipe of prior truesource docs
const WIPE_ONLY = process.argv.includes('--wipe-only');                 // S183 R2 — wipe and exit (no Drive walk, no writes)

// W1 hardening constants (S183 R2)
const WRITE_MAX_RETRIES = 3;
const WRITE_RETRY_SLEEP_MS = 8000;
const WIPE_LIST_PAGE_SIZE = 100;
const WIPE_LIST_SLEEP_MS = 200;
const WIPE_GET_CONCURRENCY = 3;
const WIPE_GET_EMPTY_RETRY = 2;
const WIPE_LIST_RETRIES = 3;
const WIPE_INDEXING_SLEEP_MS = 30000;

function parseFlag(name) {
  const i = process.argv.indexOf('--' + name);
  if (i === -1 || i === process.argv.length - 1) return null;
  return process.argv[i + 1];
}

const PLAYER_FILTER = parseFlag('player');
const FOLDER_OVERRIDE = parseFlag('folder') || DRIVE_ROOT_MLB;

const API_KEY = process.env.SUPERMEMORY_CC_API_KEY;
if (APPLY && !API_KEY) {
  console.error('[ERROR] SUPERMEMORY_CC_API_KEY not set — cannot apply.');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Drive helpers
// ---------------------------------------------------------------------------
function getDriveClient() {
  const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });
  return google.drive({ version: 'v3', auth });
}

async function listFolderChildren(drive, folderId) {
  const res = await drive.files.list({
    q: `'${folderId}' in parents and trashed=false`,
    fields: 'files(id, name, mimeType, modifiedTime, size)',
    pageSize: 200,
    orderBy: 'name',
  });
  return res.data.files || [];
}

async function downloadTextFile(drive, fileId) {
  const res = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'arraybuffer' }
  );
  return Buffer.from(res.data).toString('utf8');
}

// Walk a player folder recursively, collecting all .txt files. Captures the
// path-from-player-folder so the ingested blob preserves directory shape.
// Drive convention varies: some players have True_Source/ subdir, some have
// .txt files at the root, some have a POP_NNNNN_Player/ subdir, some mix all.
async function walkTextFiles(drive, folderId, pathPrefix = '') {
  const collected = [];
  const children = await listFolderChildren(drive, folderId);
  for (const child of children) {
    if (child.mimeType === 'application/vnd.google-apps.folder') {
      const sub = await walkTextFiles(drive, child.id, pathPrefix ? pathPrefix + '/' + child.name : child.name);
      collected.push(...sub);
      continue;
    }
    if (!child.name || !child.name.toLowerCase().endsWith('.txt')) continue;
    // Skip the pathological "(anonymous)\n\n.txt" Drive artifact
    if (child.name.indexOf('(anonymous)') === 0) continue;
    if (!child.size || parseInt(child.size, 10) < 32) continue;  // skip near-empty stubs
    collected.push({
      id: child.id,
      name: child.name,
      pathFromPlayer: pathPrefix ? pathPrefix + '/' + child.name : child.name,
      modifiedTime: child.modifiedTime,
      size: child.size,
    });
  }
  return collected;
}

// ---------------------------------------------------------------------------
// POPID resolution
// ---------------------------------------------------------------------------
// Normalize POP IDs to canonical POP-NNNNN form (filenames sometimes use
// underscores: POP_00003_AITKEN_IMAGE_MANIFEST.txt → POP-00003).
function normalizePopId(raw) {
  if (!raw) return null;
  const m = raw.match(/POP[-_](\d+)/i);
  if (!m) return null;
  return 'POP-' + m[1].padStart(5, '0');
}

function extractPopIdFromContent(content) {
  // DataPage format: `POPID: POP-00022` near top of file (canonical)
  const m = content.match(/^\s*POPID:\s*(POP[-_]\d+)/m);
  if (m) return normalizePopId(m[1]);
  return null;
}

function extractPopIdFromFilename(filename) {
  const m = filename.match(/POP[-_]\d+/i);
  return m ? normalizePopId(m[0]) : null;
}

// Strip combining diacritics so "López" matches "Lopez" in the ledger.
function stripDiacritics(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

let ledgerCache = null;
async function loadLedger() {
  if (ledgerCache) return ledgerCache;
  const rows = await sheets.getSheetData('Simulation_Ledger');
  const headers = rows[0];
  const popIdx = 0;
  const firstIdx = headers.indexOf('First');
  const lastIdx = headers.indexOf('Last');
  // Two-tier map: keyed both with and without diacritics so accented input
  // names (Allen López, José Colón) match ledger rows stored without accents
  // (or vice versa).
  const map = new Map();
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const pop = (r[popIdx] || '').trim();
    const first = (r[firstIdx] || '').trim();
    const last = (r[lastIdx] || '').trim();
    if (pop && first && last) {
      const exact = (first + ' ' + last).toLowerCase();
      const stripped = stripDiacritics(exact);
      if (!map.has(exact)) map.set(exact, pop);
      if (!map.has(stripped)) map.set(stripped, pop);
    }
  }
  ledgerCache = map;
  return map;
}

async function resolvePopIdByName(playerName) {
  const ledger = await loadLedger();
  const tokens = playerName.replace(/_/g, ' ').split(/\s+/).filter(Boolean);
  if (tokens.length < 2) return null;
  const first = tokens[0];
  const last = tokens[tokens.length - 1];
  const exact = (first + ' ' + last).toLowerCase();
  return ledger.get(exact) || ledger.get(stripDiacritics(exact)) || null;
}

// ---------------------------------------------------------------------------
// Flat-file player-name extraction
// ---------------------------------------------------------------------------
// Filenames vary widely:
//   "Allen López — TrueSource DataPage v1.0.txt"          → Allen López
//   "Bryan Franco FULL STAT TRUE SOURCE — BATTER.txt"     → Bryan Franco
//   "Carmen Mesa FULL STAT TRUE SOURCE — PITCHER.txt"     → Carmen Mesa
//   "Eric Taveras_2040.txt"                               → Eric Taveras
//   "John Ellis DataPage v1.0.txt"                        → John Ellis
//   "JOSÉ COLÓN Data Card v1.0.txt"                       → José Colón
//   "Mariano Rosales_TrueSource.txt"                      → Mariano Rosales
//   "Travis_Cole_TrueSource_DataPage_v1.0.txt"            → Travis Cole
//   "VLADIMIR GONZALEZ Data Card v1.0.txt"                → Vladimir Gonzalez
//   "HENRY RIVAS — TrueSource DataPage v1.0.txt"          → Henry Rivas
function extractPlayerNameFromFlatFilename(filename) {
  let name = filename.replace(/\.txt$/i, '');
  // Normalize: convert underscores to spaces FIRST so all suffix patterns
  // can use whitespace consistently. Filenames mix `_TrueSource_DataPage`
  // and ` — TrueSource DataPage` and hybrid `— TrueSource_DataPage` forms.
  name = name.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
  // Strip known suffix patterns
  const suffixPatterns = [
    /\s+FULL\s+STAT\s+TRUE\s+SOURCE\s+[—–-]\s+(BATTER|PITCHER).*$/i,
    /\s+[—–-]\s+TrueSource\s+DataPage.*$/i,
    /\s+TrueSource\s+DataPage(\s+v[\d.]+)?$/i,
    /\s+TrueSource$/i,
    /\s+DataPage(\s+v[\d.]+)?$/i,
    /\s+Data\s+Card(\s+v[\d.]+)?$/i,
    /\s+2040$/,
    /\s+[—–-]\s+Player\s+Profile.*$/i,
    /\s+[—–-]\s+Prospect\s+Profile.*$/i,
  ];
  for (const re of suffixPatterns) {
    name = name.replace(re, '');
  }
  name = name.replace(/\s+/g, ' ').trim();
  if (!name) return null;
  // Title-case if all-uppercase (preserves diacritics) — split on whitespace
  // and only capitalize the FIRST character of each token, leaving the rest
  // lowercase. Avoids the `\b\w` Unicode boundary bug where `Ó` next to `N`
  // gets the `N` recapitalized.
  const isAllCaps = /^[A-ZÁÀÂÄÃÅÉÈÊËÍÌÎÏÓÒÔÖÕÚÙÛÜÑÇ\s.'-]+$/.test(name) &&
                    /[A-Z]{3,}/.test(name);
  if (isAllCaps) {
    name = name.split(/\s+/).map(token => {
      if (!token) return token;
      return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
    }).join(' ');
  }
  return name;
}

// Group flat files by extracted player name (some players have 2 files, e.g.
// Buford Park has both a FULL STAT and a DataPage).
function groupFilesByPlayer(flatFiles) {
  const groups = new Map();
  const skipped = [];
  for (const f of flatFiles) {
    const name = extractPlayerNameFromFlatFilename(f.name);
    if (!name) {
      skipped.push({ file: f.name, reason: 'name_unparseable' });
      continue;
    }
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name).push(f);
  }
  return { groups, skipped };
}

// ---------------------------------------------------------------------------
// Supermemory API helpers (S183 R2 — W1 hardening pattern)
// ---------------------------------------------------------------------------
function smRequest(method, apiPath, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const headers = {
      'Authorization': 'Bearer ' + API_KEY,
      'Accept': 'application/json',
    };
    if (payload) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(payload);
    }
    const req = https.request({
      hostname: API_HOST,
      path: apiPath,
      method,
      headers,
    }, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => {
        let parsed = null;
        try { parsed = data ? JSON.parse(data) : null; } catch { parsed = data; }
        resolve({ status: res.statusCode, body: parsed });
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('Timeout')); });
    if (payload) req.write(payload);
    req.end();
  });
}

function smSleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

// ---------------------------------------------------------------------------
// Supermemory POST — dual-tagged write with retry-on-401/429
// ---------------------------------------------------------------------------
async function addDocument(title, content, metadata) {
  const body = {
    content,
    containerTags: [CONTAINER_TAG, DOMAIN_TAG],
    metadata: Object.assign({ title, source: 'player-truesource-ingest' }, metadata),
  };
  for (let attempt = 0; attempt <= WRITE_MAX_RETRIES; attempt++) {
    const r = await smRequest('POST', '/v3/documents', body);
    if (r.status >= 200 && r.status < 300) {
      const responseBody = typeof r.body === 'string' ? r.body : JSON.stringify(r.body);
      return { status: r.status, body: responseBody };
    }
    if ((r.status === 401 || r.status === 429) && attempt < WRITE_MAX_RETRIES) {
      console.log('  [retry] write got ' + r.status + ' (rate-limit?); sleeping ' + (WRITE_RETRY_SLEEP_MS / 1000) + 's, attempt ' + (attempt + 2) + '/' + (WRITE_MAX_RETRIES + 1));
      await smSleep(WRITE_RETRY_SLEEP_MS);
      continue;
    }
    throw new Error('HTTP ' + r.status + ': ' + (typeof r.body === 'string' ? r.body : JSON.stringify(r.body)));
  }
  throw new Error('addDocument exhausted ' + (WRITE_MAX_RETRIES + 1) + ' attempts');
}

// ---------------------------------------------------------------------------
// Wipe-old — content-signature-scoped DELETE of prior truesource docs (S183 R2)
// ---------------------------------------------------------------------------
// Filter: docs with 'world-data' tag AND no 'wd-player-truesource' tag AND
// content starts with `=== PLAYER TRUESOURCE — ` (the canonical header
// added by processPlayerGroup). Cannot collide with citizen / business /
// faith / cultural / neighborhood / initiative cards because their content
// signatures differ.
//
// Spec deviation from R2 plan: plan called for POPID-content-scoped wipe,
// but POPIDs are discovered DURING the passes (Drive walk + DataPage parse
// + ledger fallback) — not knowable ahead of time without a full duplicate
// pre-discovery pass. Content-signature-scope is functionally equivalent
// when re-ingesting the same roster (deletes the same set), and safer when
// the roster changes (cleanly removes orphans rather than leaving stale
// truesource for departed players).
async function listPageWithRetry(page, retries) {
  let r = await smRequest('POST', '/v3/documents/list', { limit: WIPE_LIST_PAGE_SIZE, page });
  let attempt = 0;
  while (attempt < retries && r.status !== 200) {
    console.log('  [retry] list page ' + page + ' returned ' + r.status + '; sleeping 5s');
    await smSleep(5000);
    r = await smRequest('POST', '/v3/documents/list', { limit: WIPE_LIST_PAGE_SIZE, page });
    attempt++;
  }
  return r;
}

async function getDocWithRetry(id, retries) {
  let r = await smRequest('GET', '/v3/documents/' + id, null);
  let attempt = 0;
  while (attempt < retries && r.status === 200 && r.body && (!r.body.content || r.body.content.length === 0)) {
    await smSleep(500);
    r = await smRequest('GET', '/v3/documents/' + id, null);
    attempt++;
  }
  return r;
}

function isTruesourceContent(content) {
  if (!content) return false;
  // Header signature canonical from processPlayerGroup line ~356
  return /^===\s*PLAYER TRUESOURCE\s+[—-]/.test(content);
}

async function wipeOldTruesourceCards() {
  console.log('\n=== R2 wipe-old: enumerating world-data via /v3/documents/list ===');
  const probe = await listPageWithRetry(1, WIPE_LIST_RETRIES);
  if (probe.status !== 200) {
    throw new Error('wipe-old: list page 1 returned ' + probe.status);
  }
  const totalPages = probe.body.pagination.totalPages;
  const ids = [];
  for (let page = 1; page <= totalPages; page++) {
    const r = page === 1 ? probe : await listPageWithRetry(page, WIPE_LIST_RETRIES);
    if (r.status !== 200) {
      throw new Error('wipe-old: list page ' + page + ' returned ' + r.status + ' after retries — aborting');
    }
    for (const it of (r.body.memories || [])) {
      const tags = Array.isArray(it.containerTags) ? it.containerTags : [];
      if (!tags.includes(CONTAINER_TAG)) continue;
      // Idempotency: skip docs already carrying our domain tag — re-runs
      // must not target the dual-tagged writes we just made.
      if (tags.includes(DOMAIN_TAG)) continue;
      ids.push(it.id);
    }
    if (page < totalPages) await smSleep(WIPE_LIST_SLEEP_MS);
  }
  console.log('[wipe-old] world-data candidates: ' + ids.length);

  console.log('[wipe-old] GET pass to filter by truesource content signature (concurrency=' + WIPE_GET_CONCURRENCY + ')');
  const matches = [];
  let emptyAfterRetry = 0;
  let fetched = 0;
  for (let i = 0; i < ids.length; i += WIPE_GET_CONCURRENCY) {
    const batch = ids.slice(i, i + WIPE_GET_CONCURRENCY);
    const results = await Promise.all(batch.map((id) =>
      getDocWithRetry(id, WIPE_GET_EMPTY_RETRY).then((r) => ({ id, r }))
    ));
    for (const { id, r } of results) {
      fetched++;
      if (r.status !== 200 || !r.body) continue;
      const content = r.body.content || '';
      if (content.length === 0) { emptyAfterRetry++; continue; }
      if (isTruesourceContent(content)) {
        matches.push({ id });
      }
    }
    if (fetched % 200 === 0 || (i + WIPE_GET_CONCURRENCY) >= ids.length) {
      console.log('  GET ' + fetched + '/' + ids.length + ' — wipe matches so far: ' + matches.length + ' | empty-after-retry: ' + emptyAfterRetry);
    }
  }
  if (emptyAfterRetry > 0) {
    throw new Error('wipe-old: ' + emptyAfterRetry + ' docs returned empty content after retry. Refusing to apply with incomplete data.');
  }
  console.log('[wipe-old] truesource matches to DELETE: ' + matches.length);

  console.log('[wipe-old] DELETE pass');
  let deleted = 0;
  let failed = 0;
  for (let k = 0; k < matches.length; k++) {
    let ok = false;
    let lastStatus = null;
    // Try up to 4 times: handle 409 (indexing settle, 20s) and 401/429 (rate-limit, 8s)
    for (let attempt = 0; attempt < 4 && !ok; attempt++) {
      const del = await smRequest('DELETE', '/v3/documents/' + matches[k].id, null);
      lastStatus = del.status;
      ok = del.status === 204 || del.status === 200;
      if (ok) break;
      if (del.status === 409) {
        await smSleep(20000);
      } else if (del.status === 401 || del.status === 429) {
        await smSleep(WRITE_RETRY_SLEEP_MS);
      } else {
        // Non-recoverable status — bail
        break;
      }
    }
    if (ok) deleted++; else { failed++; if (failed <= 5) console.log('    [DEL FAIL] id=' + matches[k].id + ' last_status=' + lastStatus); }
    if ((k + 1) % 25 === 0 || k === matches.length - 1) {
      console.log('  DELETE ' + (k + 1) + '/' + matches.length + ' — ok=' + deleted + ' failed=' + failed);
    }
    await smSleep(200);
  }
  console.log('[wipe-old] DELETE results: ' + deleted + ' ok / ' + failed + ' failed');
  console.log('[wipe-old] sleeping ' + (WIPE_INDEXING_SLEEP_MS / 1000) + 's for async indexing to settle before writes');
  await smSleep(WIPE_INDEXING_SLEEP_MS);
  return { candidates: ids.length, matched: matches.length, deleted, failed };
}

// ---------------------------------------------------------------------------
// Per-player ingest helper — used by all three passes
// ---------------------------------------------------------------------------
async function processPlayerGroup(playerName, fileContents, opts, results) {
  // opts: { sourceLabel, recordType, sourceFolder, sourcePass, alreadyResolvedPopIds }
  const { sourceLabel, recordType, sourceFolder, sourcePass, alreadyResolvedPopIds } = opts;

  // Resolve POPID — DataPage content first, then filename, then ledger lookup
  let popId = null;
  let popIdSource = null;
  let legacyPopId = null;
  for (const fc of fileContents) {
    const fromContent = extractPopIdFromContent(fc.content);
    if (fromContent && !popId) {
      popId = fromContent;
      popIdSource = 'datapage:' + fc.name;
    }
    const fromName = extractPopIdFromFilename(fc.name);
    if (fromName && !popId) {
      popId = fromName;
      popIdSource = 'filename:' + fc.name;
    }
  }
  if (!popId) {
    const ledgerPop = await resolvePopIdByName(playerName);
    if (ledgerPop) {
      popId = ledgerPop;
      popIdSource = 'ledger_lookup';
    }
  }
  // Legacy POPID detection: filename-only (content scans were too noisy —
  // see Wedding Chronicle / Amara Keane case from earlier S180 build).
  if (popId) {
    for (const fc of fileContents) {
      const fromName = extractPopIdFromFilename(fc.name);
      if (fromName && fromName !== popId && !legacyPopId) {
        legacyPopId = fromName;
      }
    }
  }

  if (!popId) {
    console.log(`  POPID UNRESOLVED — skip.`);
    results.push({ player: playerName, sourcePass, status: 'popid_unresolved', filesIngested: 0 });
    return null;
  }

  // Determine final type — supplementary if Pass A already covered this POPID
  let finalType = recordType;
  if (alreadyResolvedPopIds && alreadyResolvedPopIds.has(popId) && recordType === 'player_truesource') {
    finalType = 'player_truesource_supplementary';
  }

  console.log(`  POPID: ${popId} (source: ${popIdSource})${legacyPopId ? ' | legacy: ' + legacyPopId : ''}${finalType !== recordType ? ' | type: ' + finalType : ''}`);

  // Build content blob with header + concatenated files
  const header = [
    `=== PLAYER TRUESOURCE — ${playerName} ===`,
    `POPID: ${popId}` + (legacyPopId ? ` (legacy: ${legacyPopId})` : ''),
    `Source: ${sourceLabel}`,
    `Files (${fileContents.length}): ${fileContents.map(f => f.pathFromPlayer || f.name).join(', ')}`,
    `Ingested: ${new Date().toISOString()}`,
    '',
  ].join('\n');

  const body = fileContents.map(fc =>
    `\n----------------------------------------\nFILE: ${fc.pathFromPlayer || fc.name}\nModified: ${fc.modifiedTime}\n----------------------------------------\n\n${fc.content}\n`
  ).join('');

  const fullContent = header + body;
  const titlePrefix = finalType === 'player_truesource_supplementary' ? 'Player TrueSource (supplementary)'
    : finalType === 'player_truesource_prospect' ? 'Player TrueSource (prospect)'
    : 'Player TrueSource';
  const docTitle = `${titlePrefix}: ${playerName} (${popId})`;
  const metadata = {
    type: finalType,
    popId,
    playerName,
    sourceFolder,
    filesCount: fileContents.length,
    sourcePass,
  };
  if (legacyPopId) metadata.legacyPopId = legacyPopId;

  if (DRY_RUN) {
    console.log(`  [DRY] Would POST ${fullContent.length} chars to world-data`);
    console.log(`        title: "${docTitle}"`);
    console.log(`        metadata: ${JSON.stringify(metadata)}`);
    results.push({
      player: playerName,
      popId,
      legacyPopId,
      popIdSource,
      sourcePass,
      finalType,
      status: 'would_ingest',
      filesIngested: fileContents.length,
      contentSize: fullContent.length,
    });
    return popId;
  }

  try {
    const resp = await addDocument(docTitle, fullContent, metadata);
    let docId = null;
    try { const j = JSON.parse(resp.body); docId = j.id || j.documentId || null; } catch {}
    console.log(`  [OK] Ingested — HTTP ${resp.status}${docId ? ', doc ' + docId : ''}`);
    results.push({
      player: playerName,
      popId,
      legacyPopId,
      popIdSource,
      sourcePass,
      finalType,
      status: 'ingested',
      filesIngested: fileContents.length,
      contentSize: fullContent.length,
      docId,
      httpStatus: resp.status,
    });
  } catch (err) {
    console.error(`  [FAIL] ${err.message}`);
    results.push({
      player: playerName,
      popId,
      legacyPopId,
      popIdSource,
      sourcePass,
      finalType,
      status: 'failed',
      filesIngested: fileContents.length,
      error: err.message,
    });
  }
  // Rate limit between players
  await new Promise(r => setTimeout(r, 500));
  return popId;
}

// ---------------------------------------------------------------------------
// Pass A — subfolder walk (existing behavior)
// ---------------------------------------------------------------------------
async function runPassSubfolders(drive, results, resolvedPopIds) {
  const rootChildren = await listFolderChildren(drive, FOLDER_OVERRIDE);
  const playerFolders = rootChildren.filter(f =>
    f.mimeType === 'application/vnd.google-apps.folder' &&
    (!PLAYER_FILTER || f.name.toLowerCase().includes(PLAYER_FILTER.toLowerCase().replace(/\s+/g, '_')))
  );

  console.log(`=== Pass A: Subfolder walk — ${playerFolders.length} player folder(s) ===`);
  if (playerFolders.length === 0) return;
  console.log(`Folders: ${playerFolders.map(f => f.name).join(', ')}`);
  console.log('');

  for (const playerFolder of playerFolders) {
    const playerName = playerFolder.name.trim().replace(/_/g, ' ');
    console.log(`[PLAYER] ${playerName} (${playerFolder.id})`);

    const txtFiles = await walkTextFiles(drive, playerFolder.id);
    if (txtFiles.length === 0) {
      console.log('  No .txt files anywhere — skip.');
      results.push({ player: playerName, sourcePass: 'subfolder', status: 'no_txt_files', filesIngested: 0 });
      console.log('');
      continue;
    }
    console.log(`  Found ${txtFiles.length} .txt file(s) total`);
    const fileContents = [];
    for (const f of txtFiles) {
      const text = await downloadTextFile(drive, f.id);
      fileContents.push({ name: f.name, pathFromPlayer: f.pathFromPlayer, modifiedTime: f.modifiedTime, size: f.size, content: text });
      console.log(`    - ${f.pathFromPlayer} (${f.size || text.length} bytes)`);
    }
    const popId = await processPlayerGroup(playerName, fileContents, {
      sourceLabel: `MLB_Roster_Data_Cards/${playerFolder.name}/`,
      recordType: 'player_truesource',
      sourceFolder: playerFolder.name,
      sourcePass: 'subfolder',
      alreadyResolvedPopIds: null,
    }, results);
    if (popId) resolvedPopIds.add(popId);
    console.log('');
  }
}

// ---------------------------------------------------------------------------
// Pass B — flat-file walk in MLB_Roster_Data_Cards (top-level files)
// ---------------------------------------------------------------------------
async function runPassFlatMLB(drive, results, resolvedPopIds) {
  const rootChildren = await listFolderChildren(drive, FOLDER_OVERRIDE);
  const flatFiles = rootChildren.filter(f =>
    f.mimeType !== 'application/vnd.google-apps.folder' &&
    f.name.toLowerCase().endsWith('.txt')
  );

  if (flatFiles.length === 0) {
    console.log('=== Pass B: MLB flat-files — none found ===');
    return;
  }

  const { groups, skipped } = groupFilesByPlayer(flatFiles);
  console.log(`=== Pass B: MLB flat-files — ${flatFiles.length} files, ${groups.size} player(s) ===`);
  if (skipped.length > 0) {
    console.log('Unparseable filenames (skipped):');
    skipped.forEach(s => console.log(`  - ${s.file} (${s.reason})`));
  }
  console.log('');

  for (const [playerName, files] of groups) {
    if (PLAYER_FILTER && !playerName.toLowerCase().includes(PLAYER_FILTER.toLowerCase())) continue;
    console.log(`[PLAYER] ${playerName} (flat — ${files.length} file(s))`);
    const fileContents = [];
    for (const f of files) {
      const text = await downloadTextFile(drive, f.id);
      fileContents.push({ name: f.name, pathFromPlayer: f.name, modifiedTime: f.modifiedTime, size: f.size, content: text });
      console.log(`    - ${f.name} (${f.size || text.length} bytes)`);
    }
    const popId = await processPlayerGroup(playerName, fileContents, {
      sourceLabel: 'MLB_Roster_Data_Cards/ (top-level flat-files)',
      recordType: 'player_truesource',
      sourceFolder: '(flat)',
      sourcePass: 'flat_mlb',
      alreadyResolvedPopIds: resolvedPopIds,
    }, results);
    if (popId) resolvedPopIds.add(popId);
    console.log('');
  }
}

// ---------------------------------------------------------------------------
// Pass C — flat-file walk in Top_Prospects_Data_Cards
// ---------------------------------------------------------------------------
async function runPassProspects(drive, results, resolvedPopIds) {
  const rootChildren = await listFolderChildren(drive, DRIVE_ROOT_PROSPECTS);
  const flatFiles = rootChildren.filter(f =>
    f.mimeType !== 'application/vnd.google-apps.folder' &&
    f.name.toLowerCase().endsWith('.txt')
  );

  if (flatFiles.length === 0) {
    console.log('=== Pass C: Top_Prospects flat-files — none found ===');
    return;
  }

  const { groups, skipped } = groupFilesByPlayer(flatFiles);
  console.log(`=== Pass C: Top_Prospects flat-files — ${flatFiles.length} files, ${groups.size} prospect(s) ===`);
  if (skipped.length > 0) {
    console.log('Unparseable filenames (skipped):');
    skipped.forEach(s => console.log(`  - ${s.file} (${s.reason})`));
  }
  console.log('');

  for (const [playerName, files] of groups) {
    if (PLAYER_FILTER && !playerName.toLowerCase().includes(PLAYER_FILTER.toLowerCase())) continue;
    console.log(`[PROSPECT] ${playerName} (${files.length} file(s))`);
    const fileContents = [];
    for (const f of files) {
      const text = await downloadTextFile(drive, f.id);
      fileContents.push({ name: f.name, pathFromPlayer: f.name, modifiedTime: f.modifiedTime, size: f.size, content: text });
      console.log(`    - ${f.name} (${f.size || text.length} bytes)`);
    }
    const popId = await processPlayerGroup(playerName, fileContents, {
      sourceLabel: 'Top_Prospects_Data_Cards/',
      recordType: 'player_truesource_prospect',
      sourceFolder: 'Top_Prospects_Data_Cards',
      sourcePass: 'prospects',
      alreadyResolvedPopIds: resolvedPopIds,
    }, results);
    if (popId) resolvedPopIds.add(popId);
    console.log('');
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('=== ingestPlayerTrueSource ===');
  console.log('[METADATA] ' + JSON.stringify({
    driveRoot: FOLDER_OVERRIDE,
    container: CONTAINER_TAG,
    domainTag: DOMAIN_TAG,
    mode: DRY_RUN ? 'DRY-RUN' : 'APPLY',
    wipeOld: WIPE_OLD,
    playerFilter: PLAYER_FILTER || '(all)',
    passes: {
      subfolders: true,
      flatMLB: INCLUDE_FLAT,
      prospects: INCLUDE_PROSPECTS,
    },
  }, null, 2));
  console.log('---');

  const drive = getDriveClient();
  const results = [];
  const resolvedPopIds = new Set();
  let wipeReport = null;

  // R2 wipe pass — runs BEFORE any ingest pass so re-writes land on a clean substrate
  if (APPLY && (WIPE_OLD || WIPE_ONLY)) {
    wipeReport = await wipeOldTruesourceCards();
    if (WIPE_ONLY) {
      console.log('\n=== --wipe-only set: skipping all ingest passes, exiting after wipe ===');
      const outDir = path.join(PROJECT_ROOT, 'output');
      if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
      const outPath = path.join(outDir, 'intake_player_truesource_wipe_only.json');
      fs.writeFileSync(outPath, JSON.stringify({ timestamp: new Date().toISOString(), mode: 'wipe-only', wipeReport }, null, 2));
      console.log('Report: ' + outPath);
      return;
    }
  } else if (APPLY && !WIPE_OLD) {
    console.log('[ingestPlayerTrueSource] --wipe-old not set — writes will land alongside any existing un-tagged truesource docs.');
  }

  if (!SKIP_SUBFOLDER) {
    await runPassSubfolders(drive, results, resolvedPopIds);
  } else {
    // Pre-seed resolvedPopIds from the prior report (if present) so
    // supplementary detection still works in flat/prospects passes.
    const priorReportPath = path.join(PROJECT_ROOT, 'output', 'intake_player_truesource.json');
    if (fs.existsSync(priorReportPath)) {
      try {
        const prior = JSON.parse(fs.readFileSync(priorReportPath, 'utf8'));
        const seeded = (prior.results || [])
          .filter(r => r.sourcePass === 'subfolder' && (r.status === 'ingested' || r.status === 'would_ingest'))
          .map(r => r.popId)
          .filter(Boolean);
        seeded.forEach(p => resolvedPopIds.add(p));
        console.log(`=== Pass A skipped (--skip-subfolder). Pre-seeded ${seeded.length} POPID(s) from prior report. ===`);
        console.log('');
      } catch {
        console.log('=== Pass A skipped (--skip-subfolder). Prior report unreadable; supplementary detection disabled. ===');
        console.log('');
      }
    } else {
      console.log('=== Pass A skipped (--skip-subfolder). No prior report; supplementary detection disabled. ===');
      console.log('');
    }
  }
  if (INCLUDE_FLAT) await runPassFlatMLB(drive, results, resolvedPopIds);
  if (INCLUDE_PROSPECTS) await runPassProspects(drive, results, resolvedPopIds);

  // Write report
  const outDir = path.join(PROJECT_ROOT, 'output');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'intake_player_truesource.json');
  const report = {
    timestamp: new Date().toISOString(),
    driveRootMLB: FOLDER_OVERRIDE,
    driveRootProspects: INCLUDE_PROSPECTS ? DRIVE_ROOT_PROSPECTS : null,
    container: CONTAINER_TAG,
    domainTag: DOMAIN_TAG,
    wipeOld: WIPE_OLD,
    wipeReport,
    mode: DRY_RUN ? 'dry-run' : 'apply',
    playerFilter: PLAYER_FILTER || null,
    passes: {
      subfolders: true,
      flatMLB: INCLUDE_FLAT,
      prospects: INCLUDE_PROSPECTS,
    },
    totals: {
      records: results.length,
      ingested: results.filter(r => r.status === 'ingested').length,
      wouldIngest: results.filter(r => r.status === 'would_ingest').length,
      noTxtFiles: results.filter(r => r.status === 'no_txt_files').length,
      popIdUnresolved: results.filter(r => r.status === 'popid_unresolved').length,
      failed: results.filter(r => r.status === 'failed').length,
      bySourcePass: {
        subfolder: results.filter(r => r.sourcePass === 'subfolder').length,
        flat_mlb: results.filter(r => r.sourcePass === 'flat_mlb').length,
        prospects: results.filter(r => r.sourcePass === 'prospects').length,
      },
      uniquePopIdsResolved: resolvedPopIds.size,
    },
    results,
  };
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log('---');
  console.log('Summary: ' + JSON.stringify(report.totals));
  console.log('Report: ' + outPath);
}

main().catch(err => {
  console.error('[FATAL]', err);
  process.exit(1);
});
