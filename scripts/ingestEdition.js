#!/usr/bin/env node
/**
 * Ingest a Cycle Pulse publishable artifact into Supermemory — scripts/ingestEdition.js
 *
 * Saves a published .txt (edition, interview, supplemental, dispatch, or
 * interview-transcript companion) as a searchable document in Supermemory,
 * tagged bay-tribune. Future sessions, the Discord bot, and autonomous
 * scripts can then search for past canon content.
 *
 * pipeline.65 (S429): a narrated edition (`THE WEEK'S REPORTING` marker,
 * cron-saturday-run stepPublish shape) ingests as ONE frame doc — masthead +
 * Mags narration. Article bodies are NOT duplicated here: the Saturday sweep
 * (cron-saturday-run stepSweep) already owns one bay-tribune doc per curated
 * article. Stale body chunks from an earlier monolith ingest of the same
 * edition are deleted first (engine.91 T2 shape). Editions without the marker
 * (pre-narration format) keep the full-body chunked path — no sweep exists for
 * them.
 *
 * Usage:
 *   node scripts/ingestEdition.js editions/cycle_pulse_edition_82.txt
 *   node scripts/ingestEdition.js editions/cycle_pulse_edition_82.txt --dry-run
 *   node scripts/ingestEdition.js editions/cycle_pulse_interview_92_santana.txt --type interview --cycle 92
 *   node scripts/ingestEdition.js editions/cycle_pulse_interview-transcript_92_santana.txt --type interview-transcript --cycle 92
 *
 * Flags:
 *   --type {edition|interview|supplemental|dispatch|interview-transcript|lore}
 *           Default: edition. Plumbed into bay-tribune metadata for retrieval filtering.
 *   --cycle N
 *           Overrides cycle extraction from filename/content. Required when --type ≠ edition
 *           (non-edition filenames don't always carry cycle in the legacy regex shape).
 *   --dry-run
 *           Skip the Supermemory API call. Prints the metadata block + per-chunk
 *           preview so the post-publish verifier can confirm shape.
 *   --no-strip
 *           Disable defense-in-depth metadata-leak strip. Default is ON (strip).
 *           Use only for raw-replay debugging — production ingest should always strip.
 *
 * Requires .env: SUPERMEMORY_CC_API_KEY
 */

require('/root/GodWorld/lib/env');
var fs = require('fs');
var path = require('path');
var https = require('https');

var API_KEY = process.env.SUPERMEMORY_CC_API_KEY;
var CONTAINER_TAG = 'bay-tribune';
var API_HOST = 'api.supermemory.ai';
var MAX_CHUNK_SIZE = 40000; // Supermemory doc limit safety margin

// 'lore' (pipeline.59) — a graded deep-background piece; --cycle comes from the
// piece's own Y<n>C<m> tag, same as every other non-edition type.
var ALLOWED_TYPES = ['edition', 'interview', 'supplemental', 'dispatch', 'interview-transcript', 'lore'];

var DRY_RUN = process.argv.includes('--dry-run');
var NO_STRIP = process.argv.includes('--no-strip');
// pipeline.45 (Mike-direct 2026-08-05): the INTAKE block is the standard —
// anyone writing an article adds the section, and ingest is where the
// requirement bites. --require-intake hard-fails a file with no valid block;
// without the flag legacy/backfill content ingests with a loud warning.
// Pipeline callers (Saturday run, post-publish) pass the flag; the warn
// default exists ONLY for pre-INTAKE archive material.
var REQUIRE_INTAKE = process.argv.includes('--require-intake');

// ---------------------------------------------------------------------------
// Defense-in-depth metadata strip (S172 — HIGH ROLLOUT item, S180 build)
// ---------------------------------------------------------------------------
// Drops audit-block leaks that occasionally land in compiled .txt artifacts
// when desk reporters append metadata blocks inside article body. Patterns:
//   - `## EVIDENCE`, `## Names Index` (markdown-header forms)
//   - `ARTICLE TABLE ENTRIES:`, `CITIZEN USAGE LOG:`, `CONTINUITY NOTES:`,
//     `FACTUAL ASSERTIONS:` — uppercase WITH colon (distinguishes from T1
//     official sections which use no colon)
//   - `**ARTICLE TABLE ENTRIES:**` etc. — bold variants from desk .md
//   - `Names Index:` followed by content on the same line — single-line drop
//
// Stops on next `---` markdown divider, 60-dash section divider, `===` break,
// or T1 official section header (`NAMES INDEX`, `BUSINESSES NAMED`,
// `ARTICLE TABLE` — those without a trailing colon are the canonical
// post-body sections and stay).
//
// Pairs with the desk-emission FIX (pipeline.9, S249) — the emission-time
// half lives in scripts/validateEdition.js checkMetadataLeak(), which asserts
// this strip would be a no-op on the compiled artifact and fails loud on any
// in-body leak. This stays the "defense-in-depth" safety net at ingest so
// silent regressions can't poison bay-tribune canon retrieval.
// SYNC: keep the blockStart / inlineNamesIndex patterns below in lockstep with
// checkMetadataLeak() in validateEdition.js — they share the leak-marker forms.
function stripMetadataLeaks(content) {
  var lines = content.split('\n');
  var out = [];
  var inLeak = false;
  var blocksStripped = 0;
  var linesStripped = 0;
  var firstSample = null;
  var sampleBuf = [];
  var blockStart = /^(#{1,3}\s+(EVIDENCE|Names\s+Index|Citizen\s+Usage\s+Log|Continuity\s+Notes|Factual\s+Assertions|Article\s+Table\s+Entries)\s*:?\s*$|ARTICLE TABLE ENTRIES:\s*$|CITIZEN USAGE LOG:\s*$|CONTINUITY NOTES:\s*$|FACTUAL ASSERTIONS:\s*$|\*\*\s*(ARTICLE TABLE ENTRIES|CITIZEN USAGE LOG|CONTINUITY NOTES|FACTUAL ASSERTIONS|NAMES INDEX|Names Index)\s*:?\s*\*\*\s*$)/i;
  var inlineNamesIndex = /^Names Index:\s*\S/;
  var stopDash = /^---+\s*$/;
  var stopEquals = /^=+\s*$/;
  var stopSixtyDash = /^-{20,}\s*$/;
  var t1Section = /^(NAMES INDEX|BUSINESSES NAMED|ARTICLE TABLE)\s*$/;

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    if (inLeak) {
      linesStripped++;
      if (sampleBuf.length < 8) sampleBuf.push(line);
      if (stopDash.test(line) || stopEquals.test(line) || stopSixtyDash.test(line) || t1Section.test(line)) {
        inLeak = false;
        if (firstSample === null) firstSample = sampleBuf.join(' \\n ');
        sampleBuf = [];
        out.push(line);
      }
      continue;
    }
    if (blockStart.test(line)) {
      inLeak = true;
      blocksStripped++;
      linesStripped++;
      sampleBuf = [line];
      continue;
    }
    if (inlineNamesIndex.test(line)) {
      blocksStripped++;
      linesStripped++;
      if (firstSample === null) firstSample = '[inline] ' + line.slice(0, 100);
      continue;
    }
    out.push(line);
  }

  return {
    content: out.join('\n'),
    blocksStripped: blocksStripped,
    linesStripped: linesStripped,
    firstSample: firstSample,
  };
}

// ---------------------------------------------------------------------------
// CLI flag parsing — --type / --cycle
// ---------------------------------------------------------------------------
function parseFlag(name) {
  var i = process.argv.indexOf('--' + name);
  if (i === -1 || i === process.argv.length - 1) return null;
  return process.argv[i + 1];
}

function parseType() {
  var raw = parseFlag('type');
  if (!raw) return 'edition';
  if (ALLOWED_TYPES.indexOf(raw) === -1) {
    console.error('[ERROR] --type must be one of: ' + ALLOWED_TYPES.join(', '));
    process.exit(1);
  }
  return raw;
}

function parseCycleFlag() {
  var raw = parseFlag('cycle');
  if (!raw) return null;
  var n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) {
    console.error('[ERROR] --cycle must be a positive integer');
    process.exit(1);
  }
  return n;
}

function titleCaseType(type) {
  // edition → Edition; interview-transcript → Interview Transcript
  return type.split('-').map(function(w) {
    return w.charAt(0).toUpperCase() + w.slice(1);
  }).join(' ');
}

// ---------------------------------------------------------------------------
// Extract cycle number from edition content or filename
// ---------------------------------------------------------------------------
function extractCycle(content, filename) {
  // Filename first — most reliable
  // supplemental_education_first_week_c88.txt → 88
  var cMatch = filename.match(/[_-]c(\d+)\./i);
  if (cMatch) return parseInt(cMatch[1], 10);
  // c100_martin_richards_trade.txt → 100
  var prefixMatch = filename.match(/^c(\d+)_/i);
  if (prefixMatch) return parseInt(prefixMatch[1], 10);
  // cycle_pulse_edition_88.txt → 88
  var fileMatch = filename.match(/edition[_-](\d+)/i);
  if (fileMatch) return parseInt(fileMatch[1], 10);
  // Content fallback: "Cycle 88" in header
  var cycleMatch = content.match(/Cycle\s+(\d+)/i);
  if (cycleMatch) return parseInt(cycleMatch[1], 10);
  // No default-cycle fallback (reviewed 2026-08-05): a silently-guessed cycle
  // mistags canon — caller fail-louds on null and asks for --cycle instead.
  return null;
}

// ---------------------------------------------------------------------------
// Split a publishable artifact into sections for chunked ingestion
// ---------------------------------------------------------------------------
function splitEdition(content, cycle, type) {
  var sections = [];
  var label = 'Cycle Pulse ' + titleCaseType(type) + ' ' + cycle;

  if (content.length <= MAX_CHUNK_SIZE) {
    sections.push({
      title: label + ' (Full)',
      content: content,
      tags: []
    });
    return sections;
  }

  // Split on section header blocks: ####...####\nTITLE\n####...####
  var parts = content.split(/\n(?=#{10,}\n)/);

  if (parts.length <= 1) {
    // Fallback: split at roughly MAX_CHUNK_SIZE boundaries on paragraph breaks
    var pos = 0;
    var chunkNum = 0;
    while (pos < content.length) {
      chunkNum++;
      var end = Math.min(pos + MAX_CHUNK_SIZE, content.length);
      // Find nearest paragraph break before the limit
      if (end < content.length) {
        var breakAt = content.lastIndexOf('\n\n', end);
        if (breakAt > pos + MAX_CHUNK_SIZE * 0.5) end = breakAt;
      }
      sections.push({
        title: label + ' (Part ' + chunkNum + ')',
        content: content.slice(pos, end).trim(),
        tags: []
      });
      pos = end;
    }
    return sections;
  }

  // Chunk by section, merging small adjacent sections
  var currentChunk = '';
  var chunkIndex = 0;
  for (var i = 0; i < parts.length; i++) {
    var part = parts[i];
    if (currentChunk.length + part.length > MAX_CHUNK_SIZE && currentChunk.length > 0) {
      chunkIndex++;
      sections.push({
        title: label + ' (Part ' + chunkIndex + ')',
        content: currentChunk.trim(),
        tags: []
      });
      currentChunk = '';
    }
    currentChunk += (currentChunk ? '\n' : '') + part;
  }
  if (currentChunk.trim()) {
    chunkIndex++;
    sections.push({
      title: label + ' (Part ' + chunkIndex + ')',
      content: currentChunk.trim(),
      tags: []
    });
  }

  return sections;
}

// ---------------------------------------------------------------------------
// pipeline.65 — the edition frame. cron-saturday-run stepPublish assembles:
//   masthead (3 lines) / ==== / narration / ==== / THE WEEK'S REPORTING / bodies
// The frame is everything before the divider that precedes THE WEEK'S
// REPORTING. Returns null when the marker is absent (legacy full-body shape).
// ---------------------------------------------------------------------------
var EDITION_FRAME_MARKER = /\n={10,}\n+THE WEEK'S REPORTING\n/;
function editionFrame(content) {
  var m = EDITION_FRAME_MARKER.exec(String(content || ''));
  if (!m) return null;
  var frame = content.slice(0, m.index).trim();
  return frame || null;
}

// ---------------------------------------------------------------------------
// engine.46 Phase 1 Task 2 — per-chunk byline/desk extraction so bay-tribune
// queries can filter on who wrote it and which desk it ran under (the
// "what I've said" self-knowledge axis). Published byline forms:
//   `By <Name> | Bay Tribune <Desk>`  and  `By Bay Tribune <Desk>` (desk-only).
// ---------------------------------------------------------------------------
function extractBylineMeta(text) {
  var bylines = [];
  var desks = [];
  var re = /^By\s+([^|\n]+?)(?:\s*\|\s*([^\n]+))?$/gm;
  var m;
  while ((m = re.exec(text)) !== null) {
    var name = (m[1] || '').trim();
    var after = (m[2] || '').trim();
    var desk = '';
    var dm = after.match(/Bay Tribune\s+([A-Za-z ]+)/i);
    if (dm) desk = dm[1].trim().toLowerCase().replace(/\s+(section|desk)$/, '');
    if (!desk) {
      var dm2 = name.match(/^Bay Tribune\s+([A-Za-z ]+)$/i);
      if (dm2) { desk = dm2[1].trim().toLowerCase(); name = ''; }
    }
    if (name && name.toLowerCase().indexOf('bay tribune') !== 0 && bylines.indexOf(name) < 0) bylines.push(name);
    if (desk && desks.indexOf(desk) < 0) desks.push(desk);
  }
  var out = {};
  if (bylines.length) out.byline = bylines.join(', ');
  if (desks.length) out.desk = desks.join(', ');
  return out;
}

// ---------------------------------------------------------------------------
// pipeline.45 (2026-08-05) — INTAKE block → Supermemory metadata. Parses the
// `## INTAKE` section (lib/articleIntake, same parser as the Rhea gate) and
// flattens it into filterable metadata: popids (explicit ids first, ledger
// resolution via canon-name-check for the id-free model form), hoods,
// storylines, claim count. Returns { parsed, meta } — meta is {} when the
// block is absent so callers can Object.assign unconditionally.
// ---------------------------------------------------------------------------
function intakeMeta(text) {
  var parsed = require('../lib/articleIntake').parse(text);
  if (!parsed.found) return { parsed: parsed, meta: {} };
  var meta = {};
  var pops = [];
  var resolved = [];
  try {
    resolved = require('./canon-name-check').resolveCitizens(
      parsed.names.map(function(n) { return n.name; }));
  } catch (e) { /* snapshot missing — explicit ids still count */ }
  for (var i = 0; i < parsed.names.length; i++) {
    var id = parsed.names[i].popid || (resolved[i] && resolved[i].popid) || null;
    if (id && pops.indexOf(id) === -1) pops.push(id);
  }
  if (pops.length) meta.popids = pops.join(',');
  if (parsed.hoods.length) meta.hoods = parsed.hoods.map(function(h) { return h.name; }).join(',');
  if (parsed.storylines.length) meta.storylines = parsed.storylines.map(function(s) { return s.slug; }).join(',');
  if (parsed.claims.length) meta.intakeClaims = parsed.claims.length;
  return { parsed: parsed, meta: meta };
}

// ---------------------------------------------------------------------------
// engine.91 T1 (2026-08-05) — customId so re-ingest UPSERTS instead of
// duplicating (E89 got 6 copies). Scheme: <type>-c<cycle>-<slug>-<chunk>.
// ---------------------------------------------------------------------------
function deriveCustomId(type, cycle, filename, chunkIndex) {
  var slug = String(filename).replace(/\.(txt|md)$/i, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return type + '-c' + cycle + '-' + slug + '-' + chunkIndex;
}

// ---------------------------------------------------------------------------
// POST a document to Supermemory
// ---------------------------------------------------------------------------
function addDocument(title, content, extraTags, metaExtras, customId) {
  return new Promise(function(resolve, reject) {
    var tags = [CONTAINER_TAG].concat(extraTags || []);
    var metadata = Object.assign({
      title: title,
      source: 'edition-ingest'
    }, metaExtras || {});
    var body = {
      content: content,
      containerTags: tags,
      metadata: metadata
    };
    if (customId) body.customId = customId;
    var payload = JSON.stringify(body);

    var options = {
      hostname: API_HOST,
      path: '/v3/documents',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + API_KEY,
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    var req = https.request(options, function(res) {
      var data = '';
      res.on('data', function(chunk) { data += chunk; });
      res.on('end', function() {
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
// DELETE a document by customId (Supermemory accepts id OR customId on the
// path). Resolves the HTTP status; 404 = nothing there, which callers treat
// as a clean stop.
// ---------------------------------------------------------------------------
function deleteDocument(customId) {
  return new Promise(function(resolve, reject) {
    var req = https.request({
      hostname: API_HOST,
      path: '/v3/documents/' + encodeURIComponent(customId),
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + API_KEY }
    }, function(res) {
      var data = '';
      res.on('data', function(chunk) { data += chunk; });
      res.on('end', function() { resolve({ status: res.statusCode, body: data }); });
    });
    req.on('error', reject);
    req.end();
  });
}

// pipeline.65 — engine.91 T2 shape: before the frame upserts as chunk 1,
// remove body chunks 2..N left by an earlier monolith ingest of the same
// file. Probe upward until the first 404. Bounded so a bad key or a
// misbehaving endpoint cannot loop.
var STALE_CHUNK_PROBE_CAP = 20;
async function deleteStaleChunks(type, cycle, filename) {
  var deleted = 0;
  for (var k = 2; k <= STALE_CHUNK_PROBE_CAP; k++) {
    var id = deriveCustomId(type, cycle, filename, k);
    var r = await deleteDocument(id);
    if (r.status === 404) break;
    if (r.status < 200 || r.status >= 300) throw new Error('DELETE ' + id + ' → HTTP ' + r.status + ': ' + r.body);
    console.log('[DELETE] stale chunk ' + id);
    deleted++;
  }
  return deleted;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  var type = parseType();
  var cycleFlag = parseCycleFlag();
  var editionPath = process.argv.find(function(a) { return a.endsWith('.txt') || a.endsWith('.md'); });
  if (!editionPath) {
    console.error('Usage: node scripts/ingestEdition.js <source.txt|source.md> [--type <type>] [--cycle N] [--dry-run]');
    process.exit(1);
  }

  if (!API_KEY) {
    console.error('[ERROR] SUPERMEMORY_CC_API_KEY not set in .env');
    process.exit(1);
  }

  if (!fs.existsSync(editionPath)) {
    console.error('[ERROR] File not found: ' + editionPath);
    process.exit(1);
  }

  var rawContent = fs.readFileSync(editionPath, 'utf-8').trim();
  var filename = path.basename(editionPath);

  // Defense-in-depth metadata strip (S172 ROLLOUT) — ON by default.
  var content = rawContent;
  var stripStats = null;
  if (!NO_STRIP) {
    var stripResult = stripMetadataLeaks(rawContent);
    content = stripResult.content;
    stripStats = stripResult;
  }

  // Cycle resolution: --cycle wins. Otherwise fall back to filename/content
  // for edition only — non-edition types must pass --cycle so a stray "Cycle 92"
  // mention in body doesn't mistag canon.
  var cycle = cycleFlag;
  if (cycle === null) {
    if (type === 'edition') {
      cycle = extractCycle(content, filename);
    }
    if (cycle === null) {
      console.error('[ERROR] --cycle is required for --type ' + type +
        ' (no fallback extraction for non-edition types).');
      process.exit(1);
    }
  }

  var label = titleCaseType(type);
  console.log('[INFO] Ingesting ' + label + ' (cycle ' + cycle + ') into Supermemory');
  console.log('[INFO] File: ' + editionPath + ' (' + Math.round(rawContent.length / 1024) + 'KB raw)');
  if (stripStats) {
    if (stripStats.blocksStripped > 0) {
      console.log('[STRIP] Metadata leaks removed: ' + stripStats.blocksStripped +
        ' block(s), ' + stripStats.linesStripped + ' line(s). Post-strip: ' +
        Math.round(content.length / 1024) + 'KB');
      if (stripStats.firstSample) {
        console.log('[STRIP] Sample of first stripped block: ' +
          stripStats.firstSample.slice(0, 200));
      }
    } else {
      console.log('[STRIP] No metadata leaks detected.');
    }
  } else {
    console.log('[STRIP] Disabled (--no-strip). Raw content will be ingested.');
  }
  if (DRY_RUN) console.log('[INFO] Mode: DRY RUN');

  // pipeline.65 — narrated edition → frame only (masthead + narration). The
  // article bodies live in the Saturday per-article sweep; ingesting them here
  // too put every body in canon twice.
  var frameMode = false;
  if (type === 'edition') {
    var frame = editionFrame(content);
    if (frame) {
      frameMode = true;
      console.log('[FRAME] narrated edition — ingesting masthead + narration only (' + frame.length +
        ' of ' + content.length + ' chars); article bodies stay with the Saturday sweep');
      content = frame;
    } else {
      console.log('[WARN] No THE WEEK\'S REPORTING marker — legacy edition shape, full body ingested (no per-article sweep exists for it).');
    }
  }

  // pipeline.45 — INTAKE standard, enforced at ingest. File-level parse feeds
  // every chunk's metadata; per-section blocks (multi-article editions) merge
  // on top in the loop below. A frame has no INTAKE block by design — the
  // blocks ride with the articles the sweep owns.
  var fileIntake = intakeMeta(content);
  if (frameMode && !fileIntake.parsed.found) {
    console.log('[FRAME] no INTAKE block by design (INTAKE lives on the swept articles)');
  } else if (!fileIntake.parsed.found) {
    if (REQUIRE_INTAKE) {
      console.error('[ERROR] No ## INTAKE block found and --require-intake is set. Every');
      console.error('        article entering canon carries the INTAKE section (pipeline.45).');
      process.exit(1);
    }
    console.log('[WARN] No ## INTAKE block — ingesting as legacy content. New articles');
    console.log('       REQUIRE the section; pipeline callers pass --require-intake.');
  } else if (fileIntake.parsed.errors.length) {
    var intakeErrs = fileIntake.parsed.errors.map(function(e) {
      return e.code + (e.lineNumber ? '@L' + e.lineNumber : '');
    }).join('; ');
    if (REQUIRE_INTAKE) {
      console.error('[ERROR] INTAKE block malformed (' + intakeErrs + ') and --require-intake is set.');
      process.exit(1);
    }
    console.log('[WARN] INTAKE grammar errors (ingested anyway, legacy mode): ' + intakeErrs);
  } else {
    console.log('[INTAKE] ' + JSON.stringify(fileIntake.meta));
  }

  var metaExtras = Object.assign({ type: type, cycle: cycle }, fileIntake.meta);
  if (frameMode) metaExtras.scope = 'frame';

  // Print the metadata block prominently — post-publish verifier reads stdout
  // to confirm type/cycle plumbed correctly.
  console.log('[METADATA] ' + JSON.stringify({
    title: 'Cycle Pulse ' + label + ' ' + cycle,
    source: 'edition-ingest',
    type: type,
    cycle: cycle,
    container: CONTAINER_TAG
  }, null, 2));

  var sections = splitEdition(content, cycle, type);
  if (frameMode) sections.forEach(function(sec) { sec.title = sec.title.replace(/ \((Full|Part \d+)\)$/, ' (Frame)'); });
  console.log('[INFO] Split into ' + sections.length + ' chunk(s)');

  // pipeline.65 delete-first: clear body chunks 2..N from an earlier monolith
  // ingest of this file so the frame is the only edition-level doc.
  if (frameMode) {
    var probeFrom = deriveCustomId(type, cycle, filename, 2);
    if (DRY_RUN) {
      console.log('[DRY] Would probe-delete stale chunks from ' + probeFrom + ' upward (stop at first 404)');
    } else {
      var staleDeleted = await deleteStaleChunks(type, cycle, filename);
      console.log('[INFO] stale body chunks deleted: ' + staleDeleted);
    }
  }

  var success = 0;
  var errors = 0;

  for (var i = 0; i < sections.length; i++) {
    var section = sections[i];
    // engine.91 T1: stable per-chunk customId — re-ingest upserts, never dups.
    var customId = deriveCustomId(type, cycle, filename, i + 1);
    if (DRY_RUN) {
      console.log('[DRY] Would ingest: ' + section.title + ' (' + section.content.length + ' chars, tags: ' + section.tags.join(', ') + ', customId: ' + customId + ')');
      success++;
      continue;
    }

    try {
      // engine.46 T2: per-chunk byline/desk ride along with the run-level
      // extras; pipeline.45: a section carrying its OWN INTAKE block (multi-
      // article editions) overrides the file-level intake metadata.
      var resp = await addDocument(section.title, section.content, section.tags,
        Object.assign({}, metaExtras, extractBylineMeta(section.content), intakeMeta(section.content).meta),
        customId);
      // ES-1 (G-P-C100-1): surface the returned doc id on its own line so
      // autonomous callers can capture it (mirrors ingestPlayerTrueSource).
      var docId = '';
      try { docId = (JSON.parse(resp.body) || {}).id || ''; } catch (e) { /* non-JSON body */ }
      console.log('[OK] ' + section.title + ' (' + section.content.length + ' chars)' + (docId ? ' doc ' + docId : ''));
      success++;
    } catch (err) {
      console.error('[FAIL] ' + section.title + ' — ' + err.message);
      errors++;
    }

    // Rate limit between chunks
    if (i < sections.length - 1) {
      await new Promise(function(r) { setTimeout(r, 500); });
    }
  }

  console.log('\n[DONE] Success: ' + success + ', Errors: ' + errors);
  // engine.114: a partial ingest is a failure. Every chunk that landed is an
  // idempotent customId upsert (engine.91 T1), so a rerun repairs it — but
  // only if the exit code tells the caller to rerun.
  if (errors > 0) {
    console.error('[FATAL] ' + errors + ' of ' + sections.length + ' chunk(s) failed to ingest — canon is partial; rerun this command (upserts are idempotent).');
    process.exit(1);
  }
  if (errors === 0 && !DRY_RUN) {
    console.log('[INFO] ' + label + ' ' + cycle + ' is now searchable in Supermemory (type=' + type + ')');
  }
}

if (require.main === module) {
  main().catch(function(err) {
    console.error('[FATAL]', err);
    process.exit(1);
  });
}

module.exports = {
  extractCycle: extractCycle,
  splitEdition: splitEdition,
  editionFrame: editionFrame,
  extractBylineMeta: extractBylineMeta,
  intakeMeta: intakeMeta,
  deriveCustomId: deriveCustomId,
  stripMetadataLeaks: stripMetadataLeaks
};
