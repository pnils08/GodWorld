/**
 * sweepCanonIngest.js — DRAFT (house-guest, ~S349; landed at S354 tree-clean).
 *
 * engine.91 T2 target path (docs/plans/2026-07-31-canon-ingest-backfill.md),
 * but this draft does NOT yet meet the T2 spec: it dedups via fuzzy /v4/search
 * similarity (0.7+ scores) instead of a deterministic customId diff against
 * /v3/documents/list, and has no --dry-run default. Since 2026-08-05
 * ingestEdition.js stamps customId <type>-c<cycle>-<slug>-<chunk> on every
 * POST (upsert = idempotent), so the T2 rewrite is: enumerate sources →
 * derive customIds → diff against the document list → ingest the missing.
 * Do not wire this draft into any cron until that rewrite lands.
 */
require('/root/GodWorld/lib/env');
const fs = require('fs');
const path = require('path');
const https = require('https');

const API_KEY = process.env.SUPERMEMORY_CC_API_KEY;

function searchSupermemoryJSON(query, limit = 1) {
  return new Promise(function(resolve) {
    const payload = JSON.stringify({
      q: query,
      containerTag: 'bay-tribune',
      searchMode: 'hybrid',
      limit: limit
    });
    const options = {
      hostname: 'api.supermemory.ai',
      path: '/v4/search',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + API_KEY,
        'Content-Length': Buffer.byteLength(payload)
      }
    };
    const req = https.request(options, function(res) {
      let data = '';
      res.on('data', function(chunk) { data += chunk; });
      res.on('end', function() {
        if (res.statusCode !== 200) { resolve({ error: data }); return; }
        try {
          resolve(JSON.parse(data).results || []);
        } catch (e) { resolve({ error: e.message }); }
      });
    });
    req.on('error', function(e) { resolve({ error: e.message }); });
    req.write(payload);
    req.end();
  });
}

function findReporterFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const stat = fs.statSync(path.join(dir, file));
    if (stat.isDirectory()) {
      findReporterFiles(path.join(dir, file), fileList);
    } else if (file.endsWith('.txt') || file.endsWith('.md')) {
      fileList.push(path.join(dir, file));
    }
  }
  return fileList;
}

async function run() {
  console.log("Scanning output/reporters/** for published articles...");
  const files = findReporterFiles('/root/GodWorld/output/reporters');
  const publishedFiles = [];
  
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    if (content.includes('NAMES INDEX') && content.includes('ARTICLE TABLE')) {
      publishedFiles.push(file);
    }
  }
  
  console.log(`Found ${publishedFiles.length} published files. Checking Supermemory...`);
  
  const results = { found: [], missing: [], errors: [] };
  
  for (const file of publishedFiles) {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    let searchString = '';
    
    // Fallback: pick any line between Byline and ###
    for (const line of lines) {
      if (line.trim().length > 50 && !line.startsWith('#') && !line.startsWith('By ') && !line.startsWith('---')) {
        searchString = line.split('. ')[0].trim();
        break;
      }
    }
    
    if (!searchString) {
      console.log(`[SKIP] Could not extract unique string from ${path.basename(file)}`);
      continue;
    }
    
    const hits = await searchSupermemoryJSON(searchString, 3);
    
    if (hits.error) {
      console.log(`[ERROR] ${path.basename(file)}: ${hits.error}`);
      results.errors.push(file);
    } else {
      const queryWords = searchString.toLowerCase().split(/\W+/).filter(w => w.length > 3);
      let isMatch = false;
      
      for (const hit of hits) {
        const text = (hit.memory || hit.content || '').toLowerCase();
        let matchCount = 0;
        for (const w of queryWords) {
          if (text.includes(w)) matchCount++;
        }
        if (queryWords.length === 0 || matchCount / queryWords.length > 0.4) {
          isMatch = true;
          break;
        }
      }
      
      if (isMatch) {
        console.log(`[FOUND] ${file.replace('/root/GodWorld/', '')}`);
        results.found.push(file);
      } else {
        console.log(`[MISSING] ${file.replace('/root/GodWorld/', '')}`);
        results.missing.push(file);
      }
    }
    
    await new Promise(r => setTimeout(r, 400));
  }
  
  console.log('\n--- SUMMARY ---');
  console.log(`Found in Supermemory: ${results.found.length}`);
  console.log(`Missing from Supermemory: ${results.missing.length}`);
  
  if (results.missing.length > 0) {
    console.log('\nMissing files:');
    results.missing.forEach(f => console.log(f));
  }
}

run();
