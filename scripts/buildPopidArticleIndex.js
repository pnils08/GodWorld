#!/usr/bin/env node
/**
 * buildPopidArticleIndex.js — Rebuild ARTICLE_INDEX_BY_POPID.md
 *
 * Cross-references citizen names from the Simulation_Ledger against all
 * edition text to produce a per-citizen article appearance index.
 *
 * Data sources:
 *   - Dashboard API: /api/citizens (all citizens with POPIDs)
 *   - Dashboard API: /api/search/articles (full article search)
 *   - Edition files: editions/ + archive/articles/ (text scan)
 *
 * Usage:
 *   node scripts/buildPopidArticleIndex.js [--write]
 *
 * Without --write, prints stats only. With --write, overwrites
 * docs/media/ARTICLE_INDEX_BY_POPID.md.
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT = path.resolve(__dirname, '..');
const OUTPUT = path.join(ROOT, 'docs', 'media', 'ARTICLE_INDEX_BY_POPID.md');
const WRITE = process.argv.includes('--write');

// Load .env for dashboard auth
require('dotenv').config({ path: path.join(ROOT, '.env') });
const DASH_AUTH = process.env.DASHBOARD_USER && process.env.DASHBOARD_PASS
  ? 'Basic ' + Buffer.from(`${process.env.DASHBOARD_USER}:${process.env.DASHBOARD_PASS}`).toString('base64')
  : '';

// Simple HTTP GET for dashboard API
function fetchJSON(urlPath) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'localhost',
      port: 3001,
      path: urlPath,
      headers: DASH_AUTH ? { 'Authorization': DASH_AUTH } : {}
    };
    http.get(opts, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`Parse error on ${urlPath}: ${e.message}`)); }
      });
    }).on('error', reject);
  });
}

// Read all edition files from disk
function loadEditionTexts() {
  const editions = [];
  const dirs = [
    path.join(ROOT, 'editions'),
    path.join(ROOT, 'archive', 'articles')
  ];

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.txt'));
    for (const file of files) {
      // Skip junk/mirror files
      if (file.includes('Mirror') || file.includes('mirror')) continue;
      if (file.includes('TEMPLATE')) continue;

      const text = fs.readFileSync(path.join(dir, file), 'utf-8');

      // Extract cycle from filename
      const cycleMatch = file.match(/c(\d+)/i) || file.match(/cycle.?(\d+)/i);
      const cycle = cycleMatch ? parseInt(cycleMatch[1]) : null;

      // Extract title from first heading or filename
      const titleMatch = text.match(/^#\s+(.+)$/m);
      const title = titleMatch ? titleMatch[1].trim() : file.replace('.txt', '');

      // Extract reporter
      const byMatch = text.match(/^(?:By|BY)\s+(.+?)(?:\s*\||\s*$)/m);
      const reporter = byMatch ? byMatch[1].trim() : null;

      editions.push({ file, cycle, title, reporter, text });
    }
  }

  return editions;
}

async function main() {
  console.log('Fetching citizens from dashboard...');
  let citizenData;
  try {
    citizenData = await fetchJSON('/api/citizens?limit=9999');
  } catch (e) {
    console.error('Dashboard not reachable. Is it running on port 3001?');
    console.error(e.message);
    process.exit(1);
  }

  const citizens = citizenData?.citizens || citizenData;
  if (!Array.isArray(citizens)) {
    console.error('Unexpected response from /api/citizens');
    process.exit(1);
  }

  console.log(`  ${citizens.length} citizens loaded`);

  console.log('Loading edition texts from disk...');
  const editions = loadEditionTexts();
  console.log(`  ${editions.length} edition files loaded`);

  // Build citizen name → POPID map (dedup by full name)
  const citizenMap = new Map();
  for (const c of citizens) {
    const fullName = `${c.firstName} ${c.lastName}`.trim();
    if (!fullName || fullName === ' ') continue;
    // Skip very short names (< 4 chars) to avoid false positives
    if (fullName.length < 4) continue;

    if (!citizenMap.has(fullName)) {
      citizenMap.set(fullName, {
        popId: c.popId,
        name: fullName,
        tier: c.tier,
        role: c.role || '',
        articles: []
      });
    }
  }

  console.log(`  ${citizenMap.size} unique citizen names to match`);

  // Search each edition for citizen name mentions
  let totalRefs = 0;
  for (const edition of editions) {
    const textLower = edition.text.toLowerCase();

    for (const [name, citizen] of citizenMap) {
      // Case-insensitive full name search
      if (textLower.includes(name.toLowerCase())) {
        // Avoid duplicate entries for same article
        const key = `${edition.file}`;
        if (!citizen.articles.some(a => a.file === key)) {
          citizen.articles.push({
            file: edition.file,
            cycle: edition.cycle,
            title: edition.title,
            reporter: edition.reporter
          });
          totalRefs++;
        }
      }
    }
  }

  // Sort citizens by POPID
  const indexed = [...citizenMap.values()]
    .filter(c => c.articles.length > 0)
    .sort((a, b) => {
      const aNum = parseInt(a.popId?.replace('POP-', '') || '99999');
      const bNum = parseInt(b.popId?.replace('POP-', '') || '99999');
      return aNum - bNum;
    });

  console.log(`\nResults:`);
  console.log(`  Citizens with articles: ${indexed.length}`);
  console.log(`  Total references: ${totalRefs}`);
  console.log(`  Top 10 by appearances:`);
  const top10 = [...indexed].sort((a, b) => b.articles.length - a.articles.length).slice(0, 10);
  for (const c of top10) {
    console.log(`    ${c.popId} ${c.name} — ${c.articles.length} articles`);
  }

  // Generate markdown
  const now = new Date().toISOString().split('T')[0];
  let md = `# Article Index by POP-ID\n\n`;
  md += `**Generated:** ${now} (by buildPopidArticleIndex.js)\n`;
  md += `**Sources:** ${editions.length} edition files (editions/ + archive/articles/)\n`;
  md += `**Citizens indexed:** ${indexed.length}\n`;
  md += `**Total references:** ${totalRefs}\n\n`;
  md += `---\n\n`;

  for (const citizen of indexed) {
    md += `## ${citizen.popId} — ${citizen.name}`;
    if (citizen.tier) md += ` (T${citizen.tier})`;
    if (citizen.role) md += ` — ${citizen.role}`;
    md += `\n\n`;

    // Sort articles by cycle
    const sorted = citizen.articles.sort((a, b) => (a.cycle || 0) - (b.cycle || 0));
    for (const article of sorted) {
      const cycleTag = article.cycle ? `C${article.cycle}` : '—';
      const reporter = article.reporter ? ` — ${article.reporter}` : '';
      md += `- [${cycleTag}] ${article.title}${reporter}\n`;
    }
    md += `\n`;
  }

  if (WRITE) {
    fs.writeFileSync(OUTPUT, md);
    console.log(`\nWritten to ${OUTPUT}`);
  } else {
    console.log(`\nDry run — use --write to save to ${OUTPUT}`);
  }

  // Always write JSON usage counts for buildDeskPackets.js freshness scoring
  const usageCounts = {};
  for (const [name, citizen] of citizenMap) {
    usageCounts[citizen.popId] = citizen.articles.length;
  }
  const jsonPath = path.join(ROOT, 'output', 'popid-usage-counts.json');
  fs.writeFileSync(jsonPath, JSON.stringify(usageCounts, null, 2));
  console.log(`\nUsage counts written to ${jsonPath} (${Object.keys(usageCounts).length} citizens)`);
}

main().catch(e => { console.error(e); process.exit(1); });
