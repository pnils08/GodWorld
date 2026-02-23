#!/usr/bin/env node
/**
 * buildArticleIndex.js — Article Index Ledger Builder
 *
 * Reads all text files from editions/, output/drive-files/, and docs/archive/,
 * classifies each file, extracts metadata, deduplicates by content fingerprint,
 * and writes a master index (JSON + markdown ledger).
 *
 * Usage:
 *   node scripts/buildArticleIndex.js              # dry-run (default)
 *   node scripts/buildArticleIndex.js --write       # write index files
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from 'fs';
import { join, dirname, relative, basename, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const writeMode = process.argv.includes('--write');

// ---------------------------------------------------------------------------
// File discovery
// ---------------------------------------------------------------------------

function findFiles(dir, extensions = ['.txt', '.md'], results = []) {
  if (!existsSync(dir)) return results;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      findFiles(full, extensions, results);
    } else if (extensions.some(ext => entry.name.endsWith(ext))) {
      results.push(full);
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// Content fingerprint (matches dashboard server.js logic)
// ---------------------------------------------------------------------------

function contentKey(text) {
  return `${text.length}:${text.slice(0, 200).replace(/\s+/g, ' ')}`;
}

// ---------------------------------------------------------------------------
// Classification
// ---------------------------------------------------------------------------

// Known reporter names for author detection and desk mapping
const REPORTERS = {
  'carmen delaine': 'civic',
  'jordan velez': 'business',
  'maria keen': 'culture',
  'p slayer': 'sports',
  'hal richmond': 'sports',
  'anthony': 'sports',
  'selena grant': 'chicago',
  'talia finch': 'chicago',
  'mags corliss': 'editorial',
  'margaret corliss': 'editorial',
  'farrah del rio': 'opinion',
  'reed thompson': 'wire',
  'celeste tran': 'internet',
  'tanya cruz': 'civic',
  'simon leary': 'sports',
  'noah tan': 'weather',
  'mason ortega': 'food',
  'angela reyes': 'education',
  'kai marston': 'arts',
  'elliot graye': 'faith',
  'sharon okafor': 'lifestyle',
  'dr. lila mezran': 'health',
  'lila mezran': 'health',
  'trevor shimizu': 'transit',
  'dana reeve': 'national',
  'rachel torres': 'public-safety',
  'deshawn hartley': 'photo',
  'dj hartley': 'photo',
  'elliot marbury': 'data',
  'luis navarro': 'managing',
};

// Desk detection from folder path
const FOLDER_DESK_MAP = {
  'civic': 'civic',
  'civic affairs': 'civic',
  'sports': 'sports',
  'sports desk': 'sports',
  'p_slayer': 'sports',
  'hal_richmond': 'sports',
  'anthony': 'sports',
  'chicago': 'chicago',
  'bulls': 'chicago',
  'culture': 'culture',
  'cultural': 'culture',
  'human_interest': 'culture',
  'business': 'business',
  'tribune_business': 'business',
  'letters': 'letters',
  'education': 'education',
  'arts_entertainment': 'arts',
  'food_hospitality': 'food',
  'faith_ethics': 'faith',
  'weather_environment': 'weather',
  'health_desk': 'health',
  'public_safety': 'public-safety',
  'transportation': 'transit',
  'opinion_editorial': 'opinion',
  'internet_trend': 'internet',
  'lifestyle': 'lifestyle',
  'national media': 'national',
  'photo_archive': 'photo',
};

function classifyFile(filePath, text, fileName) {
  const relPath = relative(ROOT, filePath);
  const lower = fileName.toLowerCase();
  const textLower = text.toLowerCase();
  const firstLine = text.split('\n')[0] || '';

  // --- Templates ---
  if (/template/i.test(fileName)) return 'template';

  // --- Mirrors / Cannon documents ---
  if (/text_mirror_full|media_cannon/i.test(fileName)) return 'mirror';

  // --- Full editions (Cycle Pulse main editions) ---
  if (/^cycle_pulse_edition_\d+/i.test(fileName)) return 'edition';
  if (/THE CYCLE PULSE — EDITION/i.test(firstLine)) return 'edition';

  // --- Supplementals ---
  if (/supplemental|special edition/i.test(fileName)) return 'supplemental';
  if (/THE CYCLE PULSE — SUPPLEMENTAL/i.test(firstLine)) return 'supplemental';
  if (/THE CYCLE PULSE — SPECIAL EDITION/i.test(firstLine)) return 'supplemental';

  // --- Data files (player cards, stats, CSVs) ---
  if (/datapage|data_card|data card|truesource/i.test(fileName)) return 'data';
  if (relPath.includes('_As Universe Database') || relPath.includes('_Bulls Universe Database')) return 'data';
  if (relPath.includes('_As_Universe_Stats_CSV')) return 'data';
  if (/^(Affiliation:|Position:|Potential:|Bats\/Throws:)/m.test(text.slice(0, 500))) return 'data';

  // --- Profiles ---
  if (/profile/i.test(fileName)) return 'profile';
  if (relPath.includes('_Profile')) return 'profile';

  // --- Reporter assignment briefs ---
  if (/assignment.*brief|assignment_/i.test(fileName)) return 'assignment';

  // --- Indexes ---
  if (/\bindex\b/i.test(fileName) && text.length < 5000) return 'index';
  if (/names index|article index/i.test(firstLine)) return 'index';

  // --- Articles (the main catch) ---
  // Has a byline "By <Name>" in first 500 chars
  if (/^by\s+[A-Z]/m.test(text.slice(0, 500))) return 'article';
  // Has Cycle Pulse header patterns but isn't a full edition
  if (/THE CYCLE PULSE/i.test(firstLine) && !/edition|supplemental|special/i.test(firstLine)) return 'article';
  // Has clear article structure
  if (text.length > 500 && /\n\n/.test(text) && !(/^(Affiliation|Position|Potential)/m.test(text.slice(0, 200)))) {
    // Likely an article if it has paragraph structure and reasonable length
    const lines = text.split('\n').filter(l => l.trim().length > 0);
    const avgLineLen = text.length / Math.max(lines.length, 1);
    if (avgLineLen > 40 && lines.length > 5) return 'article';
  }

  // --- Short content that's hard to classify ---
  if (text.length < 200) return 'unknown';

  // Default: if it's in a reporter/desk folder and has enough text, call it an article
  const folderLower = relPath.toLowerCase();
  for (const key of Object.keys(FOLDER_DESK_MAP)) {
    if (folderLower.includes(key)) return 'article';
  }

  return 'unknown';
}

// ---------------------------------------------------------------------------
// Metadata extraction
// ---------------------------------------------------------------------------

function extractCycle(text, fileName) {
  // From filename
  const fnMatch = fileName.match(/(?:cycle[_\s]*|edition[_\s]*|c)(\d+)/i);
  if (fnMatch) return parseInt(fnMatch[1]);

  // From content header
  const headerMatch = text.match(/THE CYCLE PULSE — (?:EDITION|SUPPLEMENTAL)[^\n]*?(\d+)/i);
  if (headerMatch) return parseInt(headerMatch[1]);

  // From "Cycle XX" in header area
  const cycleMatch = text.slice(0, 500).match(/Cycle\s+(\d+)/i);
  if (cycleMatch) return parseInt(cycleMatch[1]);

  // From C## pattern in header
  const cMatch = text.slice(0, 300).match(/\bC(\d{2,3})\b/);
  if (cMatch) return parseInt(cMatch[1]);

  return null;
}

function extractAuthor(text) {
  // "By <Name>" or "By <Name> | <Desk>"
  const bylineMatch = text.match(/^By\s+(.+?)(?:\s*\|.*)?$/m);
  if (bylineMatch) return bylineMatch[1].trim();

  // "By <Name>" in filename-like patterns won't work here,
  // but we check the first 500 chars for embedded bylines
  const embedded = text.slice(0, 1000).match(/(?:^|\n)By\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})/);
  if (embedded) return embedded[1].trim();

  return null;
}

function extractTitle(text, fileName, classification) {
  const lines = text.split('\n').filter(l => l.trim());

  if (classification === 'edition') {
    const edMatch = text.match(/THE CYCLE PULSE — EDITION (\d+)/i);
    if (edMatch) return `Cycle Pulse Edition ${edMatch[1]}`;
    return lines[0]?.trim() || fileName;
  }

  if (classification === 'supplemental') {
    // Look for the topic line (usually line 2-4, after "THE CYCLE PULSE" header)
    for (const line of lines.slice(1, 6)) {
      const trimmed = line.trim();
      if (trimmed.length < 5) continue;
      if (/^[#=\-~*]{3,}$/.test(trimmed)) continue;
      if (/^THE CYCLE PULSE/i.test(trimmed)) continue;
      if (/^(CYCLE \d|C\d|Post-Cycle)/i.test(trimmed)) continue;
      if (/^\d{4}|^(Oakland|Bay)\s/i.test(trimmed)) continue;
      // This should be the topic line
      return trimmed
        .replace(/\.txt$/i, '')
        .replace(/[|_]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }
    // Fallback: try to extract from filename
    const fnClean = fileName
      .replace(/\.txt$/, '')
      .replace(/^THE CYCLE PULSE[_ ]+/i, '')
      .replace(/SUPPLEMENTAL EDITION[_ ]*/i, '')
      .replace(/SPECIAL EDITION[_ ]*/i, '')
      .replace(/CYCLE[_ ]*\d+[_ ]*/i, '')
      .replace(/[_ ]+/g, ' ')
      .trim();
    if (fnClean.length > 5) return fnClean;
    return 'Supplemental Edition';
  }

  // For articles: first non-empty line that isn't a separator or metadata
  for (const line of lines.slice(0, 5)) {
    const trimmed = line.trim();
    if (trimmed.length < 5) continue;
    if (/^[#=\-~*]{3,}$/.test(trimmed)) continue;
    if (/^(By |Reporter:|Desk:|Context Window:)/i.test(trimmed)) continue;
    return trimmed.replace(/^\*\*(.+)\*\*$/, '$1');
  }

  return fileName.replace(/\.txt$/, '').replace(/_/g, ' ');
}

function detectDesk(text, filePath, author) {
  // From author mapping
  if (author) {
    const authorLower = author.toLowerCase();
    for (const [name, desk] of Object.entries(REPORTERS)) {
      if (authorLower.includes(name) || name.includes(authorLower)) return desk;
    }
  }

  // From folder path
  const relPath = relative(ROOT, filePath).toLowerCase();
  for (const [pattern, desk] of Object.entries(FOLDER_DESK_MAP)) {
    if (relPath.includes(pattern.toLowerCase())) return desk;
  }

  // From content markers
  const firstK = text.slice(0, 1000).toLowerCase();
  if (/civic affairs|city council|initiative/i.test(firstK)) return 'civic';
  if (/chicago|bulls/i.test(firstK)) return 'chicago';
  if (/oakland.*a'?s|athletics|baseball|warriors|basketball/i.test(firstK)) return 'sports';
  if (/dear editor|citizen voice/i.test(firstK)) return 'letters';
  if (/business ticker|economic|market/i.test(firstK)) return 'business';

  return null;
}

function slugify(str, maxLen = 50) {
  return str
    .toLowerCase()
    .replace(/[''""]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLen)
    .replace(/-+$/, '');
}

function generateNewFilename(meta) {
  if (!['article', 'supplemental'].includes(meta.classification)) return null;

  const cycle = meta.cycle ? `c${meta.cycle}` : 'cXX';
  const desk = meta.desk || 'general';
  const authorSlug = meta.author ? slugify(meta.author, 20) : 'unknown';
  const titleSlug = slugify(meta.title, 50);

  if (meta.classification === 'supplemental') {
    return `${cycle}_supplemental_${titleSlug}.txt`;
  }

  return `${cycle}_${desk}_${authorSlug}_${titleSlug}.txt`;
}

// ---------------------------------------------------------------------------
// Edition article extraction (reuses parseEdition pattern from server.js)
// ---------------------------------------------------------------------------

function parseEditionArticles(text) {
  const lines = text.split('\n');
  const articles = [];
  let currentSection = '';
  let currentArticle = null;

  for (const line of lines) {
    if (line.startsWith('####') && !line.startsWith('#####')) {
      const sectionName = line.replace(/#/g, '').trim();
      if (sectionName) currentSection = sectionName;
      continue;
    }

    const bylineMatch = line.match(/^By (.+?) \| (.+)$/);
    if (bylineMatch && currentArticle) {
      currentArticle.author = bylineMatch[1].trim();
      currentArticle.desk = bylineMatch[2].trim();
      continue;
    }

    if (line.startsWith('**') && line.endsWith('**') && !line.includes('Names Index')) {
      const title = line.replace(/\*\*/g, '').trim();
      if (currentArticle && currentArticle.title) {
        if (!currentArticle.subtitle) {
          currentArticle.subtitle = title;
          continue;
        }
      }
      if (currentArticle && currentArticle.title) {
        articles.push(currentArticle);
      }
      currentArticle = { title, section: currentSection, body: '' };
      continue;
    }

    if (line.startsWith('Names Index:') && currentArticle) {
      currentArticle.namesIndex = line.replace('Names Index:', '').trim();
      articles.push(currentArticle);
      currentArticle = null;
      continue;
    }

    if (line === '-----') {
      if (currentArticle && currentArticle.title) {
        articles.push(currentArticle);
        currentArticle = null;
      }
      continue;
    }

    if (currentArticle && line.trim()) {
      currentArticle.body += (currentArticle.body ? '\n' : '') + line;
    }
  }

  if (currentArticle && currentArticle.title) {
    articles.push(currentArticle);
  }

  // Filter garbage
  return articles.filter(a => {
    const t = a.title || '';
    if (t.length < 10) return false;
    if (/^(ACTIVE|MAJOR|NEW|CITIZEN|STORYLINE|APPROVAL|PHASE|STILL|COMING|COUNCIL)/i.test(t) && t.endsWith(':')) return false;
    if (/^(By |Dear Editor|Names Index|Quick Takes:$)/i.test(t)) return false;
    if (/^(ESTABLISHED CANON|PREWRITE|FACTUAL ASSERTIONS)/i.test(t)) return false;
    if ((a.body || '').length < 50) return false;
    return true;
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function buildIndex() {
  console.log('Building article index...\n');

  // Discover all files
  const sources = [
    { dir: join(ROOT, 'editions'), label: 'editions', priority: 1 },
    { dir: join(ROOT, 'output/drive-files'), label: 'drive-files', priority: 2 },
    { dir: join(ROOT, 'docs/archive'), label: 'docs-archive', priority: 3 },
  ];

  const allFiles = [];
  for (const src of sources) {
    const found = findFiles(src.dir);
    for (const f of found) {
      allFiles.push({ path: f, source: src.label, priority: src.priority });
    }
  }

  console.log(`Found ${allFiles.length} files across ${sources.length} sources\n`);

  // Process each file
  const entries = [];
  let idCounter = 1;

  for (const { path: filePath, source, priority } of allFiles) {
    const fileName = basename(filePath);
    let text;
    try {
      text = readFileSync(filePath, 'utf-8');
    } catch (e) {
      console.warn(`  Skip (unreadable): ${relative(ROOT, filePath)}`);
      continue;
    }

    if (!text || text.trim().length === 0) continue;

    const classification = classifyFile(filePath, text, fileName);
    const cycle = extractCycle(text, fileName);
    const author = extractAuthor(text);
    const title = extractTitle(text, fileName, classification);
    const desk = detectDesk(text, filePath, author);
    const fingerprint = contentKey(text);
    const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;

    const meta = {
      id: `art-${String(idCounter++).padStart(4, '0')}`,
      originalPath: relative(ROOT, filePath),
      source,
      priority,
      classification,
      cycle,
      desk,
      author,
      title,
      fingerprint,
      wordCount,
      newFilename: null,
      isDuplicate: false,
      duplicateOf: null,
    };

    meta.newFilename = generateNewFilename(meta);

    // For editions and supplementals, also extract individual articles
    if (classification === 'edition' || classification === 'supplemental') {
      const parsed = parseEditionArticles(text);
      meta.articleCount = parsed.length;
      meta.extractedArticles = parsed.map(a => ({
        title: a.title,
        author: a.author || null,
        desk: a.desk || a.section || null,
        wordCount: (a.body || '').split(/\s+/).length,
      }));
    }

    entries.push(meta);
  }

  // --- Dedup ---
  // Layer 1: exact content fingerprint
  // Layer 2: same cycle + same classification for editions/supplementals (catches near-dupes)
  const fingerprints = new Map(); // fingerprint -> best entry
  const editionKeys = new Map();  // "edition-83" -> best entry
  const dupeCount = { total: 0, bySource: {} };

  // Sort by priority (editions/ first, then drive-files, then docs-archive)
  entries.sort((a, b) => a.priority - b.priority);

  for (const entry of entries) {
    // Layer 1: exact content match
    const existing = fingerprints.get(entry.fingerprint);
    if (existing) {
      entry.isDuplicate = true;
      entry.duplicateOf = existing.id;
      dupeCount.total++;
      dupeCount.bySource[entry.source] = (dupeCount.bySource[entry.source] || 0) + 1;
      continue;
    }
    fingerprints.set(entry.fingerprint, entry);

    // Layer 2: same cycle + type for editions/supplementals (different revisions)
    if ((entry.classification === 'edition' || entry.classification === 'supplemental') && entry.cycle) {
      const eKey = `${entry.classification}-${entry.cycle}`;
      const existingEd = editionKeys.get(eKey);
      if (existingEd) {
        entry.isDuplicate = true;
        entry.duplicateOf = existingEd.id;
        dupeCount.total++;
        dupeCount.bySource[entry.source] = (dupeCount.bySource[entry.source] || 0) + 1;
        continue;
      }
      editionKeys.set(eKey, entry);
    }
  }

  // --- Collision-free new filenames for non-duplicate articles ---
  const usedNames = new Set();
  for (const entry of entries) {
    if (entry.isDuplicate || !entry.newFilename) continue;
    let name = entry.newFilename;
    let counter = 2;
    while (usedNames.has(name)) {
      const ext = extname(name);
      const base = name.slice(0, -ext.length).replace(/-\d+$/, '');
      name = `${base}-${counter}${ext}`;
      counter++;
    }
    usedNames.add(name);
    entry.newFilename = name;
  }

  // --- Stats ---
  const stats = {
    totalFiles: entries.length,
    unique: entries.filter(e => !e.isDuplicate).length,
    duplicates: dupeCount,
    byClassification: {},
    byDesk: {},
    byCycle: {},
    bySource: {},
  };

  for (const e of entries) {
    stats.byClassification[e.classification] = (stats.byClassification[e.classification] || 0) + 1;
    if (e.desk) stats.byDesk[e.desk] = (stats.byDesk[e.desk] || 0) + 1;
    if (e.cycle) stats.byCycle[e.cycle] = (stats.byCycle[e.cycle] || 0) + 1;
    stats.bySource[e.source] = (stats.bySource[e.source] || 0) + 1;
  }

  // --- Report ---
  console.log('=== Classification Breakdown ===');
  for (const [cls, count] of Object.entries(stats.byClassification).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${cls.padEnd(15)} ${count}`);
  }

  console.log('\n=== By Source ===');
  for (const [src, count] of Object.entries(stats.bySource)) {
    console.log(`  ${src.padEnd(15)} ${count}`);
  }

  console.log('\n=== By Desk ===');
  for (const [desk, count] of Object.entries(stats.byDesk).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${desk.padEnd(15)} ${count}`);
  }

  console.log('\n=== Duplicates ===');
  console.log(`  Total: ${dupeCount.total}`);
  for (const [src, count] of Object.entries(dupeCount.bySource)) {
    console.log(`  From ${src}: ${count}`);
  }

  console.log(`\n=== Summary ===`);
  console.log(`  Total files:    ${stats.totalFiles}`);
  console.log(`  Unique:         ${stats.unique}`);
  console.log(`  Duplicates:     ${dupeCount.total}`);
  console.log(`  Cycles found:   ${Object.keys(stats.byCycle).length}`);

  // --- Count extracted articles from editions ---
  const editionEntries = entries.filter(e => (e.classification === 'edition' || e.classification === 'supplemental') && !e.isDuplicate);
  const totalExtracted = editionEntries.reduce((sum, e) => sum + (e.articleCount || 0), 0);
  console.log(`  Edition/supplemental files: ${editionEntries.length}`);
  console.log(`  Extracted articles:         ${totalExtracted}`);

  if (writeMode) {
    // Write JSON index
    const indexPath = join(ROOT, 'output/article-index.json');
    const indexData = {
      generated: new Date().toISOString(),
      stats,
      entries: entries.map(e => {
        const { extractedArticles, ...rest } = e;
        return {
          ...rest,
          articleCount: e.articleCount || (e.classification === 'article' ? 1 : 0),
          extractedArticles: extractedArticles || undefined,
        };
      }),
    };
    mkdirSync(dirname(indexPath), { recursive: true });
    writeFileSync(indexPath, JSON.stringify(indexData, null, 2));
    console.log(`\nWrote: ${relative(ROOT, indexPath)}`);

    // Write markdown ledger
    const ledgerPath = join(ROOT, 'output/article-ledger.md');
    const ledgerLines = ['# Article Index Ledger', '', `Generated: ${new Date().toISOString()}`, ''];

    // Group by cycle
    const cycles = {};
    for (const e of entries.filter(e => !e.isDuplicate)) {
      const key = e.cycle || 'unknown';
      if (!cycles[key]) cycles[key] = [];
      cycles[key].push(e);
    }

    // Sort cycles descending
    const sortedCycles = Object.keys(cycles)
      .sort((a, b) => {
        if (a === 'unknown') return 1;
        if (b === 'unknown') return -1;
        return parseInt(b) - parseInt(a);
      });

    for (const cyc of sortedCycles) {
      ledgerLines.push(`## Cycle ${cyc}`, '');
      ledgerLines.push('| ID | Type | Desk | Author | Title | Words |');
      ledgerLines.push('|----|------|------|--------|-------|-------|');
      for (const e of cycles[cyc]) {
        const title = (e.title || '').slice(0, 60);
        ledgerLines.push(`| ${e.id} | ${e.classification} | ${e.desk || '-'} | ${e.author || '-'} | ${title} | ${e.wordCount} |`);

        // If it's an edition, list extracted articles indented
        if (e.extractedArticles && e.extractedArticles.length > 0) {
          for (const a of e.extractedArticles) {
            const aTitle = (a.title || '').slice(0, 55);
            ledgerLines.push(`| | article | ${a.desk || '-'} | ${a.author || '-'} | \u2514 ${aTitle} | ${a.wordCount} |`);
          }
        }
      }
      ledgerLines.push('');
    }

    // Duplicates section
    const dupes = entries.filter(e => e.isDuplicate);
    if (dupes.length > 0) {
      ledgerLines.push('## Duplicates', '');
      ledgerLines.push('| ID | Duplicate Of | Source | Path |');
      ledgerLines.push('|----|-------------|--------|------|');
      for (const e of dupes) {
        ledgerLines.push(`| ${e.id} | ${e.duplicateOf} | ${e.source} | ${e.originalPath} |`);
      }
      ledgerLines.push('');
    }

    writeFileSync(ledgerPath, ledgerLines.join('\n'));
    console.log(`Wrote: ${relative(ROOT, ledgerPath)}`);
  } else {
    console.log('\n[DRY RUN] No files written. Use --write to generate index files.');
  }

  return { entries, stats };
}

buildIndex();
