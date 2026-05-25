#!/usr/bin/env node
/**
 * saveToDrive.js — Upload files to Google Drive from the newsroom
 *
 * Uses OAuth2 (user credentials) to write files to the correct Drive folder.
 * The service account handles reads; this handles writes.
 *
 * Scope: SINGLE-FILE uploads only (PDFs, .txt artifacts, .md packets). The
 * /edition-print SKILL.md previously claimed "photos also upload to Drive"
 * but no photo directory upload code has ever existed here (G-PR18, S196).
 * Wave 1 (S197) updated SKILL.md to PDF-only honesty; BUNDLE-H confirms
 * this script aligns to that — passing a directory path is an error, not
 * a silent feature gap. If photo upload is desired in a future cycle,
 * extend with a separate `--directory` flag + per-file iteration; the
 * decision was deferred S197 in favor of doc-truth over feature creep.
 *
 * Usage:
 *   node scripts/saveToDrive.js <local-file> <destination>
 *   node scripts/saveToDrive.js <local-file> --type <type> [--cycle N]
 *   node scripts/saveToDrive.js --test
 *
 * Destinations (shortcuts):
 *   edition              → Publications Archive / 1_The_Cycle_Pulse / Y_001
 *   supplement           → Publications Archive / 2_Oakland_Supplementals
 *   supplemental         → alias of supplement (matches --type spelling)
 *   interview            → alias of supplement (non-edition subfolder, T9)
 *   dispatch             → alias of supplement (non-edition subfolder, T9)
 *   interview-transcript → alias of supplement (non-edition subfolder, T9)
 *   chicago              → Publications Archive / Chicago_Supplementals
 *   mara                 → Publications Archive / Mara_Vance
 *   presser              → Publications Archive / Mike_Paulson_Pressers
 *   player               → As Universe Database / Players / MLB_Roster_Data_Cards
 *   prospect             → As Universe Database / Players / Top_Prospects_Data_Cards
 *   bulls                → Bulls Universe Database / Player_Cards
 *   briefing             → Publications Archive / Mara_Vance
 *   civic                → City_Civic_Database (official civic documents)
 *
 * Or pass a raw folder ID as destination.
 *
 * --type flag (T9, mirrors T6/T7 plumbing pattern):
 *   When --type is given, destination auto-resolves from the type if no
 *   positional <destination> is provided. Edition routes to the edition
 *   folder; non-edition types route to the shared supplement folder
 *   (the "non-edition subfolder" — type-prefixed PDF filenames keep them
 *   distinguishable in shared storage).
 *
 *   --type {edition|interview|supplemental|dispatch|interview-transcript}
 *   --cycle N            informational; required when --type ≠ edition
 *
 * Examples:
 *   node scripts/saveToDrive.js editions/cycle_pulse_edition_82.txt edition
 *   node scripts/saveToDrive.js output/pdfs/bay_tribune_interview_c92_santana.pdf --type interview --cycle 92
 *   node scripts/saveToDrive.js output/mara_directive_c82.txt mara
 *   node scripts/saveToDrive.js --test
 */

require('/root/GodWorld/lib/env');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const ALLOWED_TYPES = ['edition', 'interview', 'supplemental', 'dispatch', 'interview-transcript'];

// Type → destination-key resolution. Edition has its own folder; non-edition
// types share the supplement folder (filename prefix disambiguates).
const TYPE_TO_DEST = {
  'edition': 'edition',
  'supplemental': 'supplement',
  'interview': 'supplement',
  'dispatch': 'supplement',
  'interview-transcript': 'supplement'
};

function parseFlag(name) {
  const i = process.argv.indexOf('--' + name);
  if (i === -1 || i === process.argv.length - 1) return null;
  return process.argv[i + 1];
}

function parseType() {
  const raw = parseFlag('type');
  if (!raw) return null;
  if (ALLOWED_TYPES.indexOf(raw) === -1) {
    console.error('[ERROR] --type must be one of: ' + ALLOWED_TYPES.join(', '));
    process.exit(1);
  }
  return raw;
}

function parseCycleFlag() {
  const raw = parseFlag('cycle');
  if (!raw) return null;
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) {
    console.error('[ERROR] --cycle must be a positive integer');
    process.exit(1);
  }
  return n;
}

// Destination folder IDs — from combined manifest (mapSubfolders overrides at runtime)
var DESTINATIONS = {
  // Publications Archive subfolders
  edition:    '118tCh9stHjuocSUYXj0LjGnuzp5mLFhf',  // 1_The_Cycle_Pulse/Y_001
  supplement: '1rv1mTZ8A1ep8u6dIONsEsGmayNkCJg-F',  // 2_Oakland_Supplementals
  chicago:    '1C2TvHmPWNh0VeYnTA4Tq0XvKS0fNRhTy',  // Chicago_Supplementals
  mara:       '1LEClpCUeRpT91gUR3SUm-Yx-3MldMJ5G',  // Mara_Vance
  presser:    '13ALd2UBqw490b85tunULoPrrLFsST2F_',   // Mike_Paulson_Pressers
  // As Universe Database subfolders
  player:     '1kJTjCkDBm0fYjU_ca4ul-qliMzdddv9S',  // MLB_Roster_Data_Cards
  prospect:   '1QBDslfH7zLmUPUa-c_AOkG4bWyHHPKrA',  // Top_Prospects_Data_Cards
  // Bulls Universe Database
  bulls:      '1RLj9scDEr2wk3o6MeypTcMG54QWX0TLU',  // Player_Cards
  // Podcast audio
  podcast:    '1wLecsc3E1WVuiS-FA1wEoqJm8FNEnSUb',  // Podcasts
  // City Civic Database — official civic documents filed by initiative agents
  civic:      '1_nZbCjbjnW5kfA7aqEjb5CooEcYy4fjL',  // City_Civic_Database
  // Server backups
  backup:     '1o310nbDxw75MGuRF8PIsfuyRFTT2CJVZ',  // GodWorld_Backups
  // Aliases
  briefing:   '1LEClpCUeRpT91gUR3SUm-Yx-3MldMJ5G',  // = mara (Mara directives & briefings)
  pdf:        '118tCh9stHjuocSUYXj0LjGnuzp5mLFhf',  // = edition (PDFs go alongside editions)
  // T9 non-edition aliases — share the supplement folder; type-prefixed
  // filenames disambiguate. Spelling consistency with --type values.
  supplemental:           '1rv1mTZ8A1ep8u6dIONsEsGmayNkCJg-F',  // = supplement
  interview:              '1rv1mTZ8A1ep8u6dIONsEsGmayNkCJg-F',  // = supplement
  dispatch:               '1rv1mTZ8A1ep8u6dIONsEsGmayNkCJg-F',  // = supplement
  'interview-transcript': '1rv1mTZ8A1ep8u6dIONsEsGmayNkCJg-F',  // = supplement
};

// Root folder IDs (fallback if subfolder not mapped)
var ROOTS = {
  tribune:      '10Y-X48HloGv9EEllWSm-Mycpmbj_9DVS',
  sports:       '1KPftAbw3dmjJjlUS9Wo97mFRZ-9Oqq0p',
  publications: '1NEIimxouKHwrVF0Wuhz7rjwX94_-FvNZ',
  as_universe:  '1g3c82HA9iGNUdY7Oxe6cGIWpn5nILJFG',
  bulls_universe: '1VbXGpcierDXN3LCzywgJfXtU1ABGhZZM',
};

function getAuth() {
  var clientId = process.env.GOOGLE_CLIENT_ID;
  var clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  var refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    console.error('OAuth credentials not configured.');
    console.error('Run: node scripts/authorizeDriveWrite.js');
    process.exit(1);
  }

  var oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  return oauth2Client;
}

function resolveDestination(dest) {
  // If it looks like a Drive folder ID, use it directly
  if (dest && dest.length > 20 && !dest.includes('/')) {
    return dest;
  }

  // Check named destinations
  if (DESTINATIONS[dest]) return DESTINATIONS[dest];

  // Fallback to root folders
  if (ROOTS[dest]) return ROOTS[dest];

  // Default fallback based on file type
  return ROOTS.publications;
}

// S235 G-PR11 — Derive a stem prefix from a filename to identify prior-version
// files of the same type+cycle in the destination folder. Stems strip the
// trailing slug (for non-edition types) so a re-run of supplemental C94
// `let_walks_reset` matches earlier `let_walks_initial` etc. of the same
// (type, cycle) pair when present. Examples:
//   bay_tribune_e94.pdf                              → bay_tribune_e94
//   bay_tribune_supplemental_c94_let_walks_reset.pdf → bay_tribune_supplemental_c94
//   bay_tribune_interview_c92_santana.pdf            → bay_tribune_interview_c92
//   bay_tribune_dispatch_c93_kono.pdf                → bay_tribune_dispatch_c93
// Returns null when the filename doesn't match a canonical stem shape — in
// that case --supersede is a no-op (defensive default; better than wild
// regex matches deleting unrelated files).
function deriveStemForSupersede(fileName) {
  var base = fileName.replace(/\.[a-zA-Z0-9]+$/, '');
  // Edition stem
  var editionMatch = base.match(/^(bay_tribune_e\d+)$/);
  if (editionMatch) return editionMatch[1];
  // Non-edition stem: bay_tribune_<type>_c<cycle>[_<slug>]
  var nonEditionMatch = base.match(/^(bay_tribune_(?:interview|supplemental|dispatch|interview-transcript)_c\d+)(?:_.*)?$/);
  if (nonEditionMatch) return nonEditionMatch[1];
  return null;
}

// Find or create the archive subfolder inside a destination folder. Used by
// --supersede archive mode (the default disposition). Returns the archive
// folder ID. Idempotent — name-search first, create only if absent.
async function findOrCreateArchiveSubfolder(drive, parentFolderId) {
  var list = await drive.files.list({
    q: "'" + parentFolderId + "' in parents and name = 'archive' and mimeType = 'application/vnd.google-apps.folder' and trashed = false",
    fields: 'files(id, name)',
    pageSize: 5
  });
  var existing = (list.data.files || [])[0];
  if (existing) return existing.id;
  var created = await drive.files.create({
    requestBody: {
      name: 'archive',
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentFolderId]
    },
    fields: 'id'
  });
  console.log('Created archive subfolder: ' + created.data.id);
  return created.data.id;
}

// List files in destFolder whose name starts with the derived stem. Excludes
// the archive subfolder itself + already-archived files (which live under
// archive/, not the dest folder). Returns the array of {id, name} objects.
async function findPriorVersions(drive, folderId, stem) {
  // Drive search: `name contains` matches anywhere; we filter for prefix in
  // memory because Drive's search doesn't support startsWith.
  var list = await drive.files.list({
    q: "'" + folderId + "' in parents and name contains '" + stem + "' and trashed = false and mimeType != 'application/vnd.google-apps.folder'",
    fields: 'files(id, name)',
    pageSize: 100
  });
  var all = list.data.files || [];
  return all.filter(function (f) { return f.name.indexOf(stem) === 0; });
}

// Supersede prior versions of the same stem before upload. mode='archive'
// (default) moves matched files into the archive/ subfolder; mode='delete'
// trashes them. Logs each action so the operator can audit later. Returns
// the count of files acted on.
async function supersedePriorVersions(drive, folderId, fileName, mode) {
  var stem = deriveStemForSupersede(fileName);
  if (!stem) {
    console.log('[supersede] filename "' + fileName + '" does not match a canonical stem shape — skipping (no-op).');
    return 0;
  }
  console.log('[supersede] mode=' + mode + ' stem=' + stem + ' folder=' + folderId);
  var priors = await findPriorVersions(drive, folderId, stem);
  if (priors.length === 0) {
    console.log('[supersede] no prior versions found — proceeding with upload.');
    return 0;
  }
  console.log('[supersede] found ' + priors.length + ' prior version(s):');
  for (var i = 0; i < priors.length; i++) {
    console.log('  - ' + priors[i].name + ' (' + priors[i].id + ')');
  }

  if (mode === 'delete') {
    for (var d = 0; d < priors.length; d++) {
      await drive.files.delete({ fileId: priors[d].id });
      console.log('  [delete] ' + priors[d].name);
    }
  } else {
    var archiveFolderId = await findOrCreateArchiveSubfolder(drive, folderId);
    for (var m = 0; m < priors.length; m++) {
      await drive.files.update({
        fileId: priors[m].id,
        addParents: archiveFolderId,
        removeParents: folderId,
        fields: 'id, name, parents'
      });
      console.log('  [archive] ' + priors[m].name + ' → archive/');
    }
  }
  return priors.length;
}

async function uploadFile(filePath, destKey, opts) {
  opts = opts || {};
  var auth = getAuth();
  var drive = google.drive({ version: 'v3', auth });

  var fileName = path.basename(filePath);
  var folderId = resolveDestination(destKey);

  // S235 G-PR11 — when --supersede is set, move/delete prior same-stem
  // versions in the destination folder before uploading. Default disposition
  // is archive (safer; recoverable). Use --supersede-mode delete to trash.
  if (opts.supersede) {
    await supersedePriorVersions(drive, folderId, fileName, opts.supersedeMode || 'archive');
  }

  // Detect MIME type and read mode from extension
  var ext = path.extname(filePath).toLowerCase();
  var mimeTypes = {
    '.txt': 'text/plain', '.md': 'text/plain', '.json': 'application/json',
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.gif': 'image/gif', '.webp': 'image/webp', '.pdf': 'application/pdf'
  };
  var mimeType = mimeTypes[ext] || 'application/octet-stream';
  var isBinary = !ext.match(/^\.(txt|md|json|csv)$/);
  var content = isBinary
    ? fs.createReadStream(filePath)
    : fs.readFileSync(filePath, 'utf-8');

  console.log('Uploading: ' + fileName);
  console.log('To folder: ' + destKey + ' (' + folderId + ')');

  var res = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
    },
    media: {
      mimeType: mimeType,
      body: content,
    },
    fields: 'id, name, webViewLink',
  });

  console.log('');
  console.log('Uploaded: ' + res.data.name);
  console.log('ID: ' + res.data.id);
  if (res.data.webViewLink) console.log('Link: ' + res.data.webViewLink);
  return res.data;
}

async function runTest() {
  var auth = getAuth();
  var drive = google.drive({ version: 'v3', auth });

  console.log('Testing Drive write access...');
  var folderId = ROOTS.publications;

  var res = await drive.files.create({
    requestBody: {
      name: '_MAGS_WRITE_TEST_' + new Date().toISOString().substring(0, 10) + '.txt',
      parents: [folderId],
    },
    media: {
      mimeType: 'text/plain',
      body: 'Write test from Mags Corliss — ' + new Date().toISOString(),
    },
    fields: 'id, name',
  });

  console.log('Created: ' + res.data.name + ' (ID: ' + res.data.id + ')');

  await drive.files.delete({ fileId: res.data.id });
  console.log('Test file deleted.');
  console.log('');
  console.log('Drive write access confirmed!');
}

async function mapSubfolders() {
  // Auto-discover subfolder IDs from the manifest. Manifest is built by
  // scripts/buildCombinedManifest.js (separate workflow); when absent, the
  // hardcoded DESTINATIONS table at file-top is authoritative.
  // G-PR20 (S215): previously logged "No manifest found" every run as if
  // it were an error — the fallback path is the standard operational state.
  var manifestPath = path.join(__dirname, '..', 'output', 'drive-manifest.json');
  if (!fs.existsSync(manifestPath)) return;

  var manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  var folders = manifest.entries.filter(function(e) { return e.isFolder; });

  var mappings = {
    edition:    { path: '/Publications Archive/1_The_Cycle_Pulse/Y_001' },
    supplement: { path: '/Publications Archive/2_Oakland_Supplementals' },
    chicago:    { path: '/Publications Archive/Chicago_Supplementals' },
    mara:       { path: '/Publications Archive/Mara_Vance' },
    presser:    { path: '/Publications Archive/Mike_Paulson_Pressers' },
    player:     { path: '/As Universe Database/Players/MLB_Roster_Data_Cards' },
    prospect:   { path: '/As Universe Database/Players/Top_Prospects_Data_Cards' },
    bulls:      { path: '/Bulls Universe Database/Player_Cards' },
  };

  Object.keys(mappings).forEach(function(key) {
    var targetPath = mappings[key].path;
    var folder = folders.find(function(f) {
      return (f.path + '/' + f.name) === targetPath || f.path === targetPath;
    });
    if (folder) {
      DESTINATIONS[key] = folder.id;
    }
  });

  // Re-sync T9 non-edition aliases to the (possibly updated) supplement ID.
  // Aliases must follow when mapSubfolders refreshes the supplement folder.
  ['supplemental', 'interview', 'dispatch', 'interview-transcript'].forEach(function(alias) {
    DESTINATIONS[alias] = DESTINATIONS.supplement;
  });
}

async function main() {
  await mapSubfolders();

  if (process.argv.includes('--test')) {
    return runTest();
  }

  var args = process.argv.slice(2);
  var typeFlag = parseType();
  var cycleFlag = parseCycleFlag();
  var dryRun = args.includes('--dry-run');

  // First positional that isn't a flag value (skip --type/--cycle's value).
  var positionals = [];
  for (var ai = 0; ai < args.length; ai++) {
    var a = args[ai];
    if (a.startsWith('--')) continue;
    var prev = args[ai - 1];
    if (prev === '--type' || prev === '--cycle') continue;
    positionals.push(a);
  }

  var filePath = positionals[0];
  var dest = positionals[1];

  // --type drives destination resolution when no positional <destination> is given.
  if (!dest && typeFlag) {
    dest = TYPE_TO_DEST[typeFlag];
  }

  if (!filePath || !dest) {
    console.log('Usage: node scripts/saveToDrive.js <local-file> <destination>');
    console.log('       node scripts/saveToDrive.js <local-file> --type <type> [--cycle N]');
    console.log('');
    console.log('Destinations: edition, supplement, supplemental, interview, dispatch,');
    console.log('              interview-transcript, chicago, mara, presser, player,');
    console.log('              prospect, bulls, briefing, pdf, civic, podcast, backup');
    console.log('Or pass a raw Drive folder ID.');
    console.log('');
    console.log('--type {edition|interview|supplemental|dispatch|interview-transcript}');
    console.log('--cycle N      required when --type ≠ edition (informational metadata)');
    console.log('--dry-run      log the resolved destination + metadata; skip upload');
    console.log('--supersede    before upload, move/delete prior-version PDFs of the');
    console.log('               same type+cycle stem in the destination folder.');
    console.log('--supersede-mode {archive|delete}  default: archive (safer). archive');
    console.log('               moves prior versions to an archive/ subfolder; delete');
    console.log('               trashes them via Drive API.');
    console.log('');
    console.log('Run --test to verify write access.');
    process.exit(0);
  }

  // T9 contract: --cycle required when --type ≠ edition. Informational here
  // (Drive upload doesn't tag with cycle), but enforced for pipeline symmetry.
  if (typeFlag && typeFlag !== 'edition' && cycleFlag === null) {
    console.error('[ERROR] --cycle is required for --type ' + typeFlag);
    process.exit(1);
  }

  if (!fs.existsSync(filePath)) {
    console.error('File not found: ' + filePath);
    process.exit(1);
  }

  // S197 BUNDLE-H (G-PR18) — directory args are not supported. Pre-S197
  // the /edition-print SKILL.md text implied photo-directory upload was
  // wired here; it never was. Fail-loud instead of silently treating a
  // directory as a missing file or attempting upload-via-readFile (which
  // would throw an opaque EISDIR). Caller should iterate the directory
  // and pass each file individually if photo upload is added later.
  if (fs.statSync(filePath).isDirectory()) {
    console.error('[ERROR] saveToDrive uploads single files only. Got directory: ' + filePath);
    console.error('  Photo-directory upload is not implemented (G-PR18 / S197 BUNDLE-H);');
    console.error('  /edition-print SKILL.md was updated Wave 1 to reflect PDF-only behavior.');
    console.error('  If photo upload is needed, iterate the directory and call this script per file.');
    process.exit(1);
  }

  // Print the metadata block — post-publish verifier reads stdout to confirm
  // type/cycle plumbed through the print pipeline.
  // G-PR19 (S215): if --cycle wasn't passed, try to derive from filename.
  // Accepts `bay_tribune_e93.pdf`, `bay_tribune_cycle93.pdf`, or any filename
  // containing `e<NN>` / `c<NN>` / `cycle<NN>`. Cosmetic but the metadata
  // audit trail now reflects the actual cycle instead of null.
  var cycleResolved = cycleFlag;
  if (cycleResolved === null) {
    var fnBase = path.basename(filePath);
    var fnMatch = fnBase.match(/(?:^|[_\-])(?:e|c|cycle)?(\d{1,4})\.(?:pdf|html|md|txt|json)$/i)
      || fnBase.match(/(?:^|[_\-])(?:e|c|cycle)(\d{1,4})(?:[_\-.]|$)/i);
    if (fnMatch) cycleResolved = parseInt(fnMatch[1], 10);
  }

  console.log('[METADATA] ' + JSON.stringify({
    type: typeFlag || null,
    cycle: cycleResolved,
    cycleSource: cycleFlag !== null ? 'flag' : (cycleResolved !== null ? 'filename' : 'unset'),
    destinationKey: dest,
    destinationFolder: resolveDestination(dest),
    file: path.basename(filePath),
    dryRun: dryRun
  }, null, 2));

  // S235 G-PR11 — supersede flag plumbing
  var supersede = process.argv.includes('--supersede');
  var supersedeMode = parseFlag('supersede-mode') || 'archive';
  if (supersedeMode !== 'archive' && supersedeMode !== 'delete') {
    console.error('[ERROR] --supersede-mode must be "archive" or "delete" (got "' + supersedeMode + '")');
    process.exit(1);
  }

  if (dryRun) {
    console.log('[DRY] Would upload ' + path.basename(filePath) +
      ' → ' + dest + ' (' + resolveDestination(dest) + ')' +
      (supersede ? ' [supersede=' + supersedeMode + ', stem=' + deriveStemForSupersede(path.basename(filePath)) + ']' : ''));
    return;
  }

  await uploadFile(filePath, dest, { supersede: supersede, supersedeMode: supersedeMode });
}

// S235 G-PR11 — exports for unit testing the pure deriveStemForSupersede
// helper. require.main guard keeps main() side-effect-free when required.
module.exports = {
  deriveStemForSupersede: deriveStemForSupersede
};

if (require.main === module) {
  main().catch(function(err) {
    console.error('Fatal:', err.message);
    process.exit(1);
  });
}
