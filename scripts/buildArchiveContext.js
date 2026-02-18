#!/usr/bin/env node
/**
 * Build Supermemory archive context for desk briefings and Rhea verification.
 * scripts/buildArchiveContext.js
 *
 * Searches Supermemory for relevant past coverage based on the current desk
 * packet data (citizens, storylines, initiatives, players). Writes per-desk
 * archive context files that Mags can include in briefings, plus a Rhea
 * archive reference file for verification cross-checks.
 *
 * Usage:
 *   node scripts/buildArchiveContext.js [cycle]
 *   node scripts/buildArchiveContext.js 83
 *   node scripts/buildArchiveContext.js --dry-run
 *
 * Outputs:
 *   output/desk-briefings/civic_archive_c{XX}.md
 *   output/desk-briefings/sports_archive_c{XX}.md
 *   output/desk-briefings/culture_archive_c{XX}.md
 *   output/desk-briefings/business_archive_c{XX}.md
 *   output/desk-briefings/chicago_archive_c{XX}.md
 *   output/desk-briefings/letters_archive_c{XX}.md
 *   output/desk-briefings/rhea_archive_c{XX}.md
 *
 * Requires .env: SUPERMEMORY_CC_API_KEY
 */

require('dotenv').config();
var fs = require('fs');
var path = require('path');
var https = require('https');

var API_KEY = process.env.SUPERMEMORY_CC_API_KEY;
var CONTAINER_TAG = 'sm_project_godworld';
var API_HOST = 'api.supermemory.ai';
var OUTPUT_DIR = path.join(__dirname, '..', 'output', 'desk-briefings');
var PACKETS_DIR = path.join(__dirname, '..', 'output', 'desk-packets');

var DRY_RUN = process.argv.includes('--dry-run');

// ---------------------------------------------------------------------------
// Detect cycle number
// ---------------------------------------------------------------------------
function detectCycle() {
  var explicit = process.argv.find(function(a) { return /^\d+$/.test(a); });
  if (explicit) return parseInt(explicit, 10);

  var baseCtx = path.join(PACKETS_DIR, 'base_context.json');
  if (fs.existsSync(baseCtx)) {
    try {
      var ctx = JSON.parse(fs.readFileSync(baseCtx, 'utf-8'));
      return ctx.cycleNumber || ctx.cycle;
    } catch (e) { /* fall through */ }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Search Supermemory
// ---------------------------------------------------------------------------
function searchSupermemory(query, limit) {
  limit = limit || 3;
  return new Promise(function(resolve) {
    var payload = JSON.stringify({
      q: query,
      containerTags: [CONTAINER_TAG],
      limit: limit
    });

    var options = {
      hostname: API_HOST,
      path: '/v3/search',
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
        try {
          if (res.statusCode !== 200) { resolve(''); return; }
          var parsed = JSON.parse(data);
          if (!parsed.results || !parsed.results.length) { resolve(''); return; }
          var context = parsed.results.map(function(r) {
            var chunks = (r.chunks || []).filter(function(c) { return c.isRelevant; });
            return chunks.map(function(c) { return c.content; }).join('\n');
          }).filter(Boolean).join('\n\n---\n\n');
          resolve(context);
        } catch (err) { resolve(''); }
      });
    });

    req.on('error', function() { resolve(''); });
    req.setTimeout(8000, function() { req.destroy(); resolve(''); });
    req.write(payload);
    req.end();
  });
}

function sleep(ms) { return new Promise(function(r) { setTimeout(r, ms); }); }

// ---------------------------------------------------------------------------
// Read desk summary to extract search terms
// ---------------------------------------------------------------------------
function readSummary(desk, cycle) {
  var summaryPath = path.join(PACKETS_DIR, desk + '_summary_c' + cycle + '.json');
  if (!fs.existsSync(summaryPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(summaryPath, 'utf-8'));
  } catch (e) { return null; }
}

function readBaseContext(cycle) {
  var ctxPath = path.join(PACKETS_DIR, 'base_context.json');
  if (!fs.existsSync(ctxPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(ctxPath, 'utf-8'));
  } catch (e) { return null; }
}

// ---------------------------------------------------------------------------
// Extract search queries per desk from summary data
// ---------------------------------------------------------------------------
function buildDeskQueries(desk, summary, baseCtx) {
  var queries = [];

  // Every desk gets a general query for recent edition coverage
  queries.push('Bay Tribune edition coverage ' + desk);

  if (!summary) return queries;

  // Extract citizen names from summary storylines
  var storylines = summary.storylines || summary.activeStorylines || [];
  if (Array.isArray(storylines)) {
    storylines.slice(0, 3).forEach(function(s) {
      var name = s.citizen || s.name || s.subject || '';
      if (name) queries.push(name + ' Oakland Bay Tribune');
    });
  }

  // Desk-specific queries
  switch (desk) {
    case 'civic':
      queries.push('council vote initiative OARI Baylight civic');
      if (baseCtx && baseCtx.canon && baseCtx.canon.pendingVotes) {
        baseCtx.canon.pendingVotes.slice(0, 2).forEach(function(v) {
          if (v.name) queries.push(v.name + ' initiative vote');
        });
      }
      break;

    case 'sports':
      queries.push('Oakland A\'s roster players dynasty season');
      if (baseCtx && baseCtx.canon && baseCtx.canon.asRoster) {
        // Search for key players
        var keyPlayers = baseCtx.canon.asRoster.filter(function(p) {
          return p.tier === 1 || p.tier === 'Tier-1';
        }).slice(0, 3);
        keyPlayers.forEach(function(p) {
          if (p.name) queries.push(p.name + ' Oakland A\'s');
        });
      }
      break;

    case 'culture':
      queries.push('Oakland culture community neighborhood arts faith');
      break;

    case 'business':
      queries.push('Oakland business economic Stabilization Fund development');
      break;

    case 'chicago':
      queries.push('Chicago Bulls basketball Trepagnier Giddey Paulson');
      break;

    case 'letters':
      queries.push('citizen voice letter community Oakland concerns');
      break;
  }

  return queries;
}

// ---------------------------------------------------------------------------
// Build Rhea-specific queries from base context
// ---------------------------------------------------------------------------
function buildRheaQueries(baseCtx) {
  var queries = [
    'Bay Tribune edition errors corrections canon',
    'citizen names phantom fabricated characters',
    'council vote positions faction breakdown'
  ];

  if (baseCtx && baseCtx.canon) {
    // Mayor
    if (baseCtx.canon.executiveBranch && baseCtx.canon.executiveBranch.mayor) {
      queries.push('mayor ' + baseCtx.canon.executiveBranch.mayor + ' Oakland');
    }
    // Key players for position verification
    if (baseCtx.canon.asRoster) {
      baseCtx.canon.asRoster.slice(0, 5).forEach(function(p) {
        if (p.name) queries.push(p.name + ' position stats');
      });
    }
  }

  return queries;
}

// ---------------------------------------------------------------------------
// Format archive context as markdown
// ---------------------------------------------------------------------------
function formatArchiveContext(desk, results, cycle) {
  var header = '# Archive Context — ' + desk.charAt(0).toUpperCase() + desk.slice(1) + ' Desk\n';
  header += '**Cycle ' + cycle + ' | Auto-generated from Supermemory**\n\n';
  header += 'This file contains relevant past coverage from the Tribune archive.\n';
  header += 'Use it for continuity — character history, past coverage angles, established facts.\n\n---\n\n';

  if (!results.length || results.every(function(r) { return !r.context; })) {
    return header + '*No relevant archive context found for this desk.*\n';
  }

  var body = '';
  results.forEach(function(r) {
    if (!r.context) return;
    body += '### Query: "' + r.query + '"\n\n';
    body += r.context + '\n\n---\n\n';
  });

  return header + body;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  if (!API_KEY) {
    console.error('[ERROR] SUPERMEMORY_CC_API_KEY not set in .env');
    process.exit(1);
  }

  var cycle = detectCycle();
  if (!cycle) {
    console.error('[ERROR] Could not detect cycle. Pass cycle number: node scripts/buildArchiveContext.js 83');
    process.exit(1);
  }

  console.log('[INFO] Building Supermemory archive context for Cycle ' + cycle);
  if (DRY_RUN) console.log('[INFO] Mode: DRY RUN');

  // Ensure output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  var baseCtx = readBaseContext(cycle);
  var desks = ['civic', 'sports', 'culture', 'business', 'chicago', 'letters'];
  var totalQueries = 0;

  // Process each desk
  for (var d = 0; d < desks.length; d++) {
    var desk = desks[d];
    var summary = readSummary(desk, cycle);
    var queries = buildDeskQueries(desk, summary, baseCtx);
    console.log('\n[' + desk.toUpperCase() + '] ' + queries.length + ' queries');

    var results = [];
    for (var q = 0; q < queries.length; q++) {
      var query = queries[q];
      totalQueries++;

      if (DRY_RUN) {
        console.log('  [DRY] Would search: "' + query + '"');
        results.push({ query: query, context: '' });
        continue;
      }

      console.log('  [SEARCH] "' + query + '"');
      var context = await searchSupermemory(query, 2);
      results.push({ query: query, context: context });

      if (context) {
        console.log('  [OK] ' + context.length + ' chars');
      } else {
        console.log('  [EMPTY]');
      }

      // Rate limit
      await sleep(300);
    }

    if (!DRY_RUN) {
      var md = formatArchiveContext(desk, results, cycle);
      var outPath = path.join(OUTPUT_DIR, desk + '_archive_c' + cycle + '.md');
      fs.writeFileSync(outPath, md);
      console.log('  [WROTE] ' + outPath + ' (' + md.length + ' chars)');
    }
  }

  // Rhea archive reference
  console.log('\n[RHEA] Building verification archive reference');
  var rheaQueries = buildRheaQueries(baseCtx);
  console.log('[RHEA] ' + rheaQueries.length + ' queries');

  var rheaResults = [];
  for (var r = 0; r < rheaQueries.length; r++) {
    var rq = rheaQueries[r];
    totalQueries++;

    if (DRY_RUN) {
      console.log('  [DRY] Would search: "' + rq + '"');
      rheaResults.push({ query: rq, context: '' });
      continue;
    }

    console.log('  [SEARCH] "' + rq + '"');
    var rctx = await searchSupermemory(rq, 3);
    rheaResults.push({ query: rq, context: rctx });

    if (rctx) {
      console.log('  [OK] ' + rctx.length + ' chars');
    } else {
      console.log('  [EMPTY]');
    }

    await sleep(300);
  }

  if (!DRY_RUN) {
    var rheaHeader = '# Archive Reference — Rhea Morgan Verification\n';
    rheaHeader += '**Cycle ' + cycle + ' | Auto-generated from Supermemory**\n\n';
    rheaHeader += 'Cross-reference this archive context when verifying the edition.\n';
    rheaHeader += 'Check article claims against past coverage for continuity errors.\n\n---\n\n';

    var rheaBody = '';
    rheaResults.forEach(function(r) {
      if (!r.context) return;
      rheaBody += '### Query: "' + r.query + '"\n\n';
      rheaBody += r.context + '\n\n---\n\n';
    });

    var rheaMd = rheaHeader + (rheaBody || '*No relevant archive context found.*\n');
    var rheaPath = path.join(OUTPUT_DIR, 'rhea_archive_c' + cycle + '.md');
    fs.writeFileSync(rheaPath, rheaMd);
    console.log('  [WROTE] ' + rheaPath + ' (' + rheaMd.length + ' chars)');
  }

  console.log('\n[DONE] ' + totalQueries + ' total Supermemory queries across ' + (desks.length + 1) + ' targets');
}

main().catch(function(err) {
  console.error('[FATAL]', err);
  process.exit(1);
});
