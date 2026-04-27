#!/usr/bin/env node
/**
 * ingestPlayerTrueSource.js — A's truesource Drive → world-data Supermemory
 * [engine/sheet] — S180 build, ROLLOUT_PLAN "REINGEST: A's truesource → citizen profile cards"
 *
 * Reads rich truesource canon (per-season intake, POP-ID DataPage, TrueSource
 * v1.0 attribute sheets) from Drive `MLB_Roster_Data_Cards/{player}/True_Source/`
 * and ingests as supplemental memories in world-data Supermemory keyed by
 * POPID. Doesn't replace citizen cards — adds a parallel truesource layer
 * MCP lookup_citizen can retrieve for elite Tier-1/Tier-2 A's players.
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
 *   node scripts/ingestPlayerTrueSource.js --dry-run               # default — no writes
 *   node scripts/ingestPlayerTrueSource.js --apply                 # write to world-data
 *   node scripts/ingestPlayerTrueSource.js --player "Danny Horn"   # one player only
 *   node scripts/ingestPlayerTrueSource.js --folder <ID> --apply   # override Drive root
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

const DRIVE_ROOT = '1kJTjCkDBm0fYjU_ca4ul-qliMzdddv9S';  // MLB_Roster_Data_Cards
const CONTAINER_TAG = 'world-data';
const API_HOST = 'api.supermemory.ai';
const PROJECT_ROOT = path.resolve(__dirname, '..');

const APPLY = process.argv.includes('--apply');
const DRY_RUN = !APPLY;

function parseFlag(name) {
  const i = process.argv.indexOf('--' + name);
  if (i === -1 || i === process.argv.length - 1) return null;
  return process.argv[i + 1];
}

const PLAYER_FILTER = parseFlag('player');
const FOLDER_OVERRIDE = parseFlag('folder') || DRIVE_ROOT;

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

let ledgerCache = null;
async function loadLedger() {
  if (ledgerCache) return ledgerCache;
  const rows = await sheets.getSheetData('Simulation_Ledger');
  const headers = rows[0];
  const popIdx = 0;
  const firstIdx = headers.indexOf('First');
  const lastIdx = headers.indexOf('Last');
  const map = new Map();  // first+last lower → popId
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const pop = (r[popIdx] || '').trim();
    const first = (r[firstIdx] || '').trim();
    const last = (r[lastIdx] || '').trim();
    if (pop && first && last) {
      map.set((first + ' ' + last).toLowerCase(), pop);
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
  return ledger.get((first + ' ' + last).toLowerCase()) || null;
}

// ---------------------------------------------------------------------------
// Supermemory POST
// ---------------------------------------------------------------------------
function addDocument(title, content, metadata) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      content,
      containerTags: [CONTAINER_TAG],
      metadata: Object.assign({ title, source: 'player-truesource-ingest' }, metadata),
    });
    const options = {
      hostname: API_HOST,
      path: '/v3/documents',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + API_KEY,
        'Content-Length': Buffer.byteLength(payload),
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ status: res.statusCode, body: data });
        } else {
          reject(new Error('HTTP ' + res.statusCode + ': ' + data));
        }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('=== ingestPlayerTrueSource ===');
  console.log('[METADATA] ' + JSON.stringify({
    driveRoot: FOLDER_OVERRIDE,
    container: CONTAINER_TAG,
    mode: DRY_RUN ? 'DRY-RUN' : 'APPLY',
    playerFilter: PLAYER_FILTER || '(all)',
  }, null, 2));
  console.log('---');

  const drive = getDriveClient();
  const rootChildren = await listFolderChildren(drive, FOLDER_OVERRIDE);
  const playerFolders = rootChildren.filter(f =>
    f.mimeType === 'application/vnd.google-apps.folder' &&
    (!PLAYER_FILTER || f.name.toLowerCase().includes(PLAYER_FILTER.toLowerCase().replace(/\s+/g, '_')))
  );

  if (playerFolders.length === 0) {
    console.log('[INFO] No player folders matched.');
    process.exit(0);
  }

  console.log(`Found ${playerFolders.length} player folder(s): ${playerFolders.map(f => f.name).join(', ')}`);
  console.log('');

  const results = [];

  for (const playerFolder of playerFolders) {
    const playerName = playerFolder.name.trim().replace(/_/g, ' ');
    console.log(`[PLAYER] ${playerName} (${playerFolder.id})`);

    // Walk all .txt files under the player folder (root + True_Source/ +
    // POP_NNNNN/ subdirs all combined). Drive convention varies per player.
    const txtFiles = await walkTextFiles(drive, playerFolder.id);
    if (txtFiles.length === 0) {
      console.log('  No .txt files anywhere under this folder — skip.');
      results.push({ player: playerName, status: 'no_txt_files', filesIngested: 0 });
      continue;
    }

    console.log(`  Found ${txtFiles.length} .txt file(s) total`);

    // Pull each file + concatenate
    const fileContents = [];
    for (const f of txtFiles) {
      const text = await downloadTextFile(drive, f.id);
      fileContents.push({ name: f.name, pathFromPlayer: f.pathFromPlayer, modifiedTime: f.modifiedTime, size: f.size, content: text });
      console.log(`    - ${f.pathFromPlayer} (${f.size || text.length} bytes, modified ${f.modifiedTime})`);
    }

    // Resolve POPID — try DataPage content first, then filename, then ledger lookup
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
    // Legacy POPID detection: filename-only, since narrative content can
    // legitimately reference other people (e.g., Vinnie Keane's Wedding
    // Chronicle mentions Amara Keane / POP-00002 — not a legacy ID).
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
      results.push({ player: playerName, status: 'popid_unresolved', filesIngested: 0 });
      continue;
    }

    console.log(`  POPID: ${popId} (source: ${popIdSource})${legacyPopId ? ' | legacy: ' + legacyPopId : ''}`);

    // Build single content blob with header + concatenated files
    const header = [
      `=== PLAYER TRUESOURCE — ${playerName} ===`,
      `POPID: ${popId}` + (legacyPopId ? ` (legacy: ${legacyPopId})` : ''),
      `Drive folder: MLB_Roster_Data_Cards/${playerFolder.name}/`,
      `Files (${fileContents.length}): ${fileContents.map(f => f.pathFromPlayer).join(', ')}`,
      `Ingested: ${new Date().toISOString()}`,
      '',
    ].join('\n');

    const body = fileContents.map(fc =>
      `\n----------------------------------------\nFILE: ${fc.pathFromPlayer}\nModified: ${fc.modifiedTime}\n----------------------------------------\n\n${fc.content}\n`
    ).join('');

    const fullContent = header + body;
    const docTitle = `Player TrueSource: ${playerName} (${popId})`;
    const metadata = {
      type: 'player_truesource',
      popId,
      playerName,
      sourceFolder: playerFolder.name,
      filesCount: txtFiles.length,
    };
    // Supermemory rejects null metadata values — only include legacyPopId
    // when actually present.
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
        status: 'would_ingest',
        filesIngested: txtFiles.length,
        contentSize: fullContent.length,
      });
    } else {
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
          status: 'ingested',
          filesIngested: txtFiles.length,
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
          status: 'failed',
          filesIngested: txtFiles.length,
          error: err.message,
        });
      }
      // Rate limit between players
      await new Promise(r => setTimeout(r, 500));
    }
    console.log('');
  }

  // Write report
  const outDir = path.join(PROJECT_ROOT, 'output');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'intake_player_truesource.json');
  const report = {
    timestamp: new Date().toISOString(),
    driveRoot: FOLDER_OVERRIDE,
    container: CONTAINER_TAG,
    mode: DRY_RUN ? 'dry-run' : 'apply',
    playerFilter: PLAYER_FILTER || null,
    totals: {
      players: results.length,
      ingested: results.filter(r => r.status === 'ingested').length,
      wouldIngest: results.filter(r => r.status === 'would_ingest').length,
      noTxtFiles: results.filter(r => r.status === 'no_txt_files').length,
      popIdUnresolved: results.filter(r => r.status === 'popid_unresolved').length,
      failed: results.filter(r => r.status === 'failed').length,
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
