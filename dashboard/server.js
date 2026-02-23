import express from 'express';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const app = express();
const PORT = process.env.DASHBOARD_PORT || 3001;

// --- Live Sheets Integration ---
let sheetsLib = null;
try {
  sheetsLib = require(join(ROOT, 'lib/sheets.js'));
} catch (e) {
  console.warn('Sheets API not available:', e.message);
}

// Cache for live sheet data (10-minute TTL)
const sheetCache = {};
const SHEET_CACHE_TTL = 10 * 60 * 1000;

async function getLiveSheetData(sheetName) {
  if (!sheetsLib) return null;
  const now = Date.now();
  const cached = sheetCache[sheetName];
  if (cached && now - cached.ts < SHEET_CACHE_TTL) return cached.data;
  try {
    const data = await sheetsLib.getSheetAsObjects(sheetName);
    sheetCache[sheetName] = { data, ts: now };
    return data;
  } catch (e) {
    console.error(`Sheets API error (${sheetName}):`, e.message);
    return cached?.data || null;
  }
}

// --- Helpers ---

function readJSON(path) {
  try {
    if (!existsSync(path)) return null;
    return JSON.parse(readFileSync(path, 'utf-8'));
  } catch { return null; }
}

function readText(path) {
  try {
    if (!existsSync(path)) return null;
    return readFileSync(path, 'utf-8');
  } catch { return null; }
}

function parseTSV(text) {
  const lines = text.split('\n').filter(l => l.trim() && !l.startsWith('==='));
  const headerLine = lines.find(l => l.includes('\t'));
  if (!headerLine) return [];
  const headers = headerLine.split('\t').map(h => h.trim());
  const dataLines = lines.slice(lines.indexOf(headerLine) + 1);

  // Rejoin multi-line fields: lines that don't start with a valid record key
  // (e.g. LifeHistory continuation lines) get appended to the previous row's last field
  const popIdIdx = headers.indexOf('POPID');
  const officeIdx = headers.indexOf('OfficeId');
  const neighIdx = headers.indexOf('Neighborhood');
  const tsIdx = headers.indexOf('Timestamp');
  const merged = [];
  for (const line of dataLines) {
    const vals = line.split('\t');
    const hasPrimary = (popIdIdx >= 0 && vals[popIdIdx]?.trim().startsWith('POP-'))
      || (officeIdx >= 0 && vals[officeIdx]?.trim())
      || (neighIdx >= 0 && vals[neighIdx]?.trim() && vals.length >= headers.length * 0.5)
      || (tsIdx >= 0 && vals[tsIdx]?.trim());
    if (hasPrimary || merged.length === 0) {
      merged.push(vals);
    } else if (merged.length > 0) {
      // Continuation line — append to last field of previous row
      const prev = merged[merged.length - 1];
      const lastIdx = prev.length - 1;
      prev[lastIdx] = (prev[lastIdx] || '') + '\n' + line;
    }
  }

  return merged.map(vals => {
    const row = {};
    headers.forEach((h, i) => { row[h] = (vals[i] || '').trim(); });
    return row;
  }).filter(r => r.POPID || r.OfficeId || r.Neighborhood || r.Timestamp);
}

function getLatestCycleDir() {
  const ledgersDir = join(ROOT, 'ledgers');
  if (!existsSync(ledgersDir)) return null;
  const dirs = readdirSync(ledgersDir)
    .filter(d => d.startsWith('cycle-'))
    .sort((a, b) => {
      const na = parseInt(a.replace('cycle-', ''));
      const nb = parseInt(b.replace('cycle-', ''));
      return nb - na;
    });
  return dirs[0] ? join(ledgersDir, dirs[0]) : null;
}

function getLatestEdition() {
  const edDir = join(ROOT, 'editions');
  if (!existsSync(edDir)) return null;
  const files = readdirSync(edDir)
    .filter(f => f.match(/^cycle_pulse_edition_\d+\.txt$/))
    .sort((a, b) => {
      const na = parseInt(a.match(/\d+/)[0]);
      const nb = parseInt(b.match(/\d+/)[0]);
      return nb - na;
    });
  return files[0] ? join(edDir, files[0]) : null;
}

function parseEdition(text) {
  const lines = text.split('\n');
  // Header metadata
  const header = {};
  const headerMatch = text.match(/THE CYCLE PULSE — EDITION (\d+)/);
  if (headerMatch) header.cycle = parseInt(headerMatch[1]);

  const line3 = lines[2] || '';
  const parts = line3.split('|').map(s => s.trim());
  if (parts.length >= 1) header.theme = parts[0];
  if (parts.length >= 2) header.season = parts[1];
  if (parts.length >= 3) header.holiday = parts[2];

  const weatherLine = lines.find(l => l.startsWith('Weather:'));
  if (weatherLine) header.weather = weatherLine.replace('Weather:', '').trim();

  const sentLine = lines.find(l => l.startsWith('Sentiment:'));
  if (sentLine) {
    const sentParts = sentLine.split('|').map(s => s.trim());
    header.sentiment = sentParts[0]?.replace('Sentiment:', '').trim();
    header.migration = sentParts[1]?.replace('Migration:', '').trim();
    header.pattern = sentParts[2]?.replace('Pattern:', '').trim();
  }

  // Parse articles
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
        // This might be a subtitle
        if (!currentArticle.subtitle) {
          currentArticle.subtitle = title;
          continue;
        }
      }
      // Save previous article
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

  // Filter out garbage "articles" — metadata lines, section labels, etc.
  const filtered = articles.filter(a => {
    const t = a.title || '';
    // Too short to be a real title
    if (t.length < 10) return false;
    // Metadata patterns that aren't articles
    if (/^(ACTIVE|MAJOR|NEW|CITIZEN|STORYLINE|APPROVAL|PHASE|STILL|COMING|COUNCIL)/i.test(t) && t.endsWith(':')) return false;
    if (/^(By |Dear Editor|Names Index|Quick Takes:$)/i.test(t)) return false;
    if (/^(ESTABLISHED CANON|PREWRITE|FACTUAL ASSERTIONS)/i.test(t)) return false;
    // Must have some body content (not just a label)
    if ((a.body || '').length < 50) return false;
    return true;
  });

  return { header, articles: filtered };
}

// --- API Routes ---

// Health / status
app.get('/api/health', (req, res) => {
  const cycleDir = getLatestCycleDir();
  const editionPath = getLatestEdition();
  const baseCtx = readJSON(join(ROOT, 'output/desk-packets/base_context.json'));

  res.json({
    status: 'online',
    engine: 'GodWorld Dashboard v1.0',
    timestamp: new Date().toISOString(),
    data: {
      baseContext: !!baseCtx,
      latestCycleArchive: cycleDir ? cycleDir.split('/').pop() : null,
      latestEdition: editionPath ? editionPath.split('/').pop() : null,
    },
  });
});

// World state — the big one. Agents and bot hit this.
app.get('/api/world-state', async (req, res) => {
  // Try base_context.json first (generated by buildDeskPackets)
  const baseCtx = readJSON(join(ROOT, 'output/desk-packets/base_context.json'));
  if (baseCtx) {
    // Enrich with live weather + world config
    const weather = await getLiveSheetData('Cycle_Weather');
    const config = await getLiveSheetData('World_Config');
    const population = await getLiveSheetData('World_Population');
    return res.json({
      source: 'base_context',
      data: baseCtx,
      weather: weather || [],
      config: config || [],
      population: population?.[0] || null,
    });
  }

  // Fallback: build from live sheets + ledger archives
  const result = { source: 'live-sheet' };

  const editionPath = getLatestEdition();
  if (editionPath) {
    const parsed = parseEdition(readText(editionPath));
    result.edition = parsed.header;
    result.articleCount = parsed.articles.length;
  }

  const neighborhoods = await getLiveSheetData('Neighborhood_Map');
  if (neighborhoods) {
    result.neighborhoods = neighborhoods.map(r => ({
      name: r.Neighborhood,
      sentiment: parseFloat(r.Sentiment) || 0,
      crimeIndex: parseInt(r.CrimeIndex) || 0,
      nightlife: parseFloat(r.NightlifeProfile) || 0,
      retailVitality: parseFloat(r.RetailVitality) || 0,
    }));
  }

  const weather = await getLiveSheetData('Cycle_Weather');
  result.weather = weather || [];

  const config = await getLiveSheetData('World_Config');
  result.config = config || [];

  const population = await getLiveSheetData('World_Population');
  result.population = population?.[0] || null;

  res.json(result);
});

// Citizens — pulls from live Google Sheet, falls back to ledger archive
app.get('/api/citizens', async (req, res) => {
  const { tier, neighborhood, search, limit: limitStr } = req.query;

  // Load citizen archive for ref counts
  const citizenArchiveForList = readJSON(join(ROOT, 'output/desk-packets/citizen_archive.json')) || {};
  const refCountMap = {};
  for (const [name, data] of Object.entries(citizenArchiveForList)) {
    if (data.popId) refCountMap[data.popId.toLowerCase()] = data.totalRefs || 0;
  }

  let rows = null;
  let source = 'none';

  // Primary: live Google Sheet
  const liveData = await getLiveSheetData('Simulation_Ledger');
  if (liveData && liveData.length > 0) {
    rows = liveData;
    source = 'live-sheet';
  }

  // Fallback: ledger archive TSV
  if (!rows) {
    const cycleDir = getLatestCycleDir();
    if (cycleDir) {
      const cycleNum = cycleDir.split('/').pop().replace('cycle-', '');
      const simText = readText(join(cycleDir, `Simulation_Ledger_Cycle_${cycleNum}.txt`));
      if (simText) {
        rows = parseTSV(simText);
        source = `cycle-${cycleNum}`;
      }
    }
  }

  if (!rows) return res.json({ citizens: [], source: 'none' });

  // Map rows to citizen objects + deduplicate by POPID
  const seen = new Map();
  const duplicates = [];
  for (const r of rows) {
    const popId = r.POPID;
    if (!popId) continue;
    const citizen = {
      popId,
      firstName: r.First,
      lastName: r.Last,
      tier: parseInt(r.Tier) || 4,
      role: r.RoleType,
      status: r.Status,
      birthYear: r.BirthYear,
      neighborhood: r.Neighborhood,
      source: r.OriginGame || r.OrginVault || 'engine',
      clockMode: r.ClockMode,
      originCity: r.OrginCity || null,
      totalRefs: refCountMap[popId.toLowerCase()] || 0,
      maritalStatus: r.MaritalStatus || null,
      wealthLevel: r.WealthLevel ? parseInt(r.WealthLevel) : null,
      educationLevel: r.EducationLevel || null,
      careerStage: r.CareerStage || null,
    };
    if (seen.has(popId)) {
      duplicates.push({ popId, name: `${r.First} ${r.Last}`, existingName: `${seen.get(popId).firstName} ${seen.get(popId).lastName}` });
    } else {
      seen.set(popId, citizen);
    }
  }
  let citizens = Array.from(seen.values());

  // Filters
  if (tier) citizens = citizens.filter(c => c.tier === parseInt(tier));
  if (neighborhood) citizens = citizens.filter(c => c.neighborhood?.toLowerCase() === neighborhood.toLowerCase());
  if (search) {
    const q = search.toLowerCase();
    citizens = citizens.filter(c =>
      c.firstName?.toLowerCase().includes(q) ||
      c.lastName?.toLowerCase().includes(q) ||
      c.role?.toLowerCase().includes(q) ||
      c.popId?.toLowerCase().includes(q)
    );
  }

  // Diagnostics
  const allCitizens = Array.from(seen.values());
  const tierCounts = {};
  let missingNeighborhood = 0;
  let missingRole = 0;
  const nameCounts = {};
  for (const c of allCitizens) {
    tierCounts[c.tier] = (tierCounts[c.tier] || 0) + 1;
    if (!c.neighborhood) missingNeighborhood++;
    if (!c.role) missingRole++;
    const fullName = `${c.firstName} ${c.lastName}`;
    nameCounts[fullName] = (nameCounts[fullName] || 0) + 1;
  }
  const duplicateNames = Object.entries(nameCounts).filter(([, n]) => n > 1).map(([name, count]) => ({ name, count }));

  const limit = parseInt(limitStr) || 100;
  res.json({
    total: citizens.length,
    showing: Math.min(limit, citizens.length),
    source,
    citizens: citizens.slice(0, limit),
    diagnostics: {
      totalUnique: allCitizens.length,
      tierCounts,
      missingNeighborhood,
      missingRole,
      duplicatePopIds: duplicates,
      duplicateNames,
    },
  });
});

// Council
app.get('/api/council', async (req, res) => {
  let rows = null;
  let source = 'none';

  // Primary: live sheet
  const liveData = await getLiveSheetData('Civic_Office_Ledger');
  if (liveData && liveData.length > 0) {
    rows = liveData;
    source = 'live-sheet';
  }

  // Fallback: cycle archive
  if (!rows) {
    const cycleDir = getLatestCycleDir();
    if (cycleDir) {
      const cycleNum = cycleDir.split('/').pop().replace('cycle-', '');
      const civicText = readText(join(cycleDir, `Civic_Office_Ledger_Cycle_${cycleNum}.txt`));
      if (civicText) {
        rows = parseTSV(civicText);
        source = `cycle-${cycleNum}`;
      }
    }
  }

  if (!rows) return res.json({ council: [], staff: [], source: 'none' });

  const council = rows
    .filter(r => r.OfficeId?.startsWith('COUNCIL-') || r.OfficeId === 'MAYOR-01')
    .map(r => ({
      officeId: r.OfficeId,
      title: r.Title,
      district: r.District,
      holder: r.Holder,
      popId: r.PopId,
      faction: r.Faction,
      status: r.Status,
      notes: r.Notes,
      votingPower: r.VotingPower === 'yes',
    }));

  const staff = rows
    .filter(r => r.OfficeId?.startsWith('STAFF-') || r.OfficeId?.startsWith('CHIEF-') || r.OfficeId?.startsWith('DA-') || r.OfficeId?.startsWith('PD-') || r.OfficeId?.startsWith('DCOP-') || r.OfficeId?.startsWith('IAD-'))
    .map(r => ({
      officeId: r.OfficeId,
      title: r.Title,
      holder: r.Holder,
      popId: r.PopId,
      status: r.Status,
      notes: r.Notes,
    }));

  res.json({ source, council, staff });
});

// Neighborhoods
app.get('/api/neighborhoods', async (req, res) => {
  let rows = null;
  let source = 'none';

  const liveData = await getLiveSheetData('Neighborhood_Map');
  if (liveData && liveData.length > 0) {
    rows = liveData;
    source = 'live-sheet';
  }

  if (!rows) {
    const cycleDir = getLatestCycleDir();
    if (cycleDir) {
      const cycleNum = cycleDir.split('/').pop().replace('cycle-', '');
      const text = readText(join(cycleDir, `Neighborhood_Map_Cycle_${cycleNum}.txt`));
      if (text) {
        rows = parseTSV(text);
        source = `cycle-${cycleNum}`;
      }
    }
  }

  if (!rows) return res.json({ neighborhoods: [], source: 'none' });

  // Enrich with demographics + crime if available
  const demographics = await getLiveSheetData('Neighborhood_Demographics');
  const demoMap = {};
  if (demographics) {
    for (const d of demographics) {
      if (d.Neighborhood) demoMap[d.Neighborhood] = d;
    }
  }

  const crimeData = await getLiveSheetData('Crime_Metrics');
  const crimeMap = {};
  if (crimeData) {
    for (const c of crimeData) {
      if (c.Neighborhood) crimeMap[c.Neighborhood] = c;
    }
  }

  const neighborhoods = rows.map(r => {
    const demo = demoMap[r.Neighborhood] || {};
    const crime = crimeMap[r.Neighborhood] || {};
    return {
      name: r.Neighborhood,
      sentiment: parseFloat(r.Sentiment) || 0,
      crimeIndex: parseInt(r.CrimeIndex) || 0,
      noiseIndex: parseFloat(r.NoiseIndex) || 0,
      nightlife: parseFloat(r.NightlifeProfile) || 0,
      retailVitality: parseFloat(r.RetailVitality) || 0,
      eventAttractiveness: parseFloat(r.EventAttractiveness) || 0,
      demographic: r.DemographicMarker,
      // Demographics enrichment
      students: parseInt(demo.Students) || null,
      adults: parseInt(demo.Adults) || null,
      seniors: parseInt(demo.Seniors) || null,
      unemployed: parseInt(demo.Unemployed) || null,
      sick: parseInt(demo.Sick) || null,
      // Crime enrichment
      propertyCrime: parseFloat(crime.PropertyCrimeIndex) || null,
      violentCrime: parseFloat(crime.ViolentCrimeIndex) || null,
      responseTime: parseFloat(crime.ResponseTimeAvg) || null,
      clearanceRate: parseFloat(crime.ClearanceRate) || null,
    };
  });

  res.json({ source, neighborhoods });
});

// Latest edition
app.get('/api/edition/latest', (req, res) => {
  const editionPath = getLatestEdition();
  if (!editionPath) return res.json({ edition: null });

  const text = readText(editionPath);
  const parsed = parseEdition(text);

  res.json({
    file: editionPath.split('/').pop(),
    ...parsed,
  });
});

// Edition list — full archive including Drive downloads
app.get('/api/editions', (req, res) => {
  const allEditions = getAllEditions();
  const editions = [];
  const archiveArticles = [];

  for (const e of allEditions) {
    const entry = {
      file: e.file,
      cycle: e.cycle,
      source: e.source,
      isSupplemental: e.isSupplemental || false,
      isBundle: e.isBundle || false,
      articleCount: e.articles.length,
    };
    if (e.source === 'drive-article') {
      archiveArticles.push(entry);
    } else {
      editions.push(entry);
    }
  }

  editions.sort((a, b) => (b.cycle || 0) - (a.cycle || 0));

  res.json({
    total: editions.length,
    editions,
    archiveArticleCount: archiveArticles.length,
  });
});

// --- Article-Initiative Cross-Reference ---

// Recursively find all .txt files in a directory
function findTextFiles(dir, results = []) {
  if (!existsSync(dir)) return results;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      findTextFiles(fullPath, results);
    } else if (entry.name.endsWith('.txt')) {
      results.push(fullPath);
    }
  }
  return results;
}

// Edition cache — rebuilt on first request, cleared every 5 minutes
let _editionCache = null;
let _editionCacheTime = 0;
const EDITION_CACHE_TTL = 5 * 60 * 1000;

function getAllEditions() {
  if (_editionCache && Date.now() - _editionCacheTime < EDITION_CACHE_TTL) {
    return _editionCache;
  }

  const editions = [];
  const seenFiles = new Set();     // Dedup by filename (same file in different dirs)
  const seenContent = new Set();   // Dedup by content hash (same content, different filename)
  const canonicalCycles = new Set(); // Track cycles covered by canonical editions/

  // Simple content fingerprint: first 200 chars + length
  function contentKey(text) {
    return `${text.length}:${text.slice(0, 200).replace(/\s+/g, ' ')}`;
  }

  // Source 1: editions/ directory (canonical, current pipeline — takes priority)
  const edDir = join(ROOT, 'editions');
  if (existsSync(edDir)) {
    for (const f of readdirSync(edDir)) {
      if (!f.endsWith('.txt') || f.endsWith('TEMPLATE.md')) continue;
      const text = readText(join(edDir, f));
      if (!text) continue;
      const parsed = parseEdition(text);
      const cKey = contentKey(text);
      if (seenContent.has(cKey)) continue;
      seenContent.add(cKey);
      seenFiles.add(f);
      const cycle = parsed.header.cycle;
      if (cycle) canonicalCycles.add(cycle);
      editions.push({ file: f, path: join(edDir, f), cycle, articles: parsed.articles, source: 'editions' });
    }
  }

  // Source 2: output/drive-files/ (Drive archive — older editions, supplementals)
  const driveDir = join(ROOT, 'output/drive-files');
  if (existsSync(driveDir)) {
    const driveFiles = findTextFiles(driveDir);
    for (const fullPath of driveFiles) {
      const f = fullPath.split('/').pop();
      // Skip non-edition files (indexes, manifests, mirrors)
      if (f.startsWith('_') || /Text_Mirror_Full|Media_Cannon/i.test(f)) continue;
      // Skip if same filename already loaded from editions/
      if (seenFiles.has(f)) continue;
      const text = readText(fullPath);
      if (!text) continue;

      // Content-level dedup
      const cKey = contentKey(text);
      if (seenContent.has(cKey)) continue;
      seenContent.add(cKey);

      const parsed = parseEdition(text);
      let cycle = parsed.header.cycle;

      if (!cycle) {
        const cycleMatch = f.match(/(?:Cycle[_\s]*(\d+)|EDITION\s*(\d+))/i);
        if (cycleMatch) cycle = parseInt(cycleMatch[1] || cycleMatch[2]);
      }
      if (!cycle) {
        const rangeMatch = f.match(/(?:Cycle[s_\s]*(\d+)[-_](\d+))/i);
        if (rangeMatch) cycle = parseInt(rangeMatch[2]);
      }

      const isSupplemental = /supplemental|special/i.test(f);
      const isBundle = /\d+[-_]\d+/.test(f);
      const isDraft = /DRAFT|UNCORRECTED/i.test(f);

      // Skip Drive editions for cycles that have a canonical version (unless supplemental)
      if (cycle && canonicalCycles.has(cycle) && !isSupplemental && !isBundle) continue;
      // Skip drafts when a final version exists for the same cycle
      if (isDraft && cycle && canonicalCycles.has(cycle)) continue;

      seenFiles.add(f);

      // If the edition parser found articles, treat as an edition
      if (parsed.articles.length > 0) {
        editions.push({
          file: f,
          path: fullPath,
          cycle,
          articles: parsed.articles,
          source: 'drive-archive',
          isSupplemental,
          isBundle,
        });
      } else {
        // Individual article file — wrap as a single-article "edition" for search
        // Extract a title from the filename
        const title = f.replace(/\.txt$/, '').replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
        if (text.length > 100) {
          editions.push({
            file: f,
            path: fullPath,
            cycle,
            articles: [{ title, section: 'Archive', body: text, author: null }],
            source: 'drive-article',
            isSupplemental: false,
            isBundle: false,
          });
        }
      }
    }
  }

  // Sort by cycle descending (newest first), then alphabetical
  editions.sort((a, b) => (b.cycle || 0) - (a.cycle || 0));

  _editionCache = editions;
  _editionCacheTime = Date.now();
  return editions;
}

function matchArticlesToInitiatives(editions, initiatives) {
  const results = {};
  for (const init of initiatives) {
    const keywords = init.keywords || [init.name];
    const patterns = keywords.map(k => new RegExp(k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
    results[init.id] = [];

    for (const ed of editions) {
      for (const article of ed.articles) {
        const searchText = `${article.title || ''} ${article.subtitle || ''} ${article.body || ''}`;
        const matched = patterns.some(p => p.test(searchText));
        if (matched) {
          results[init.id].push({
            cycle: ed.cycle,
            title: article.title,
            section: article.section,
            author: article.author || null,
            desk: article.desk || null,
          });
        }
      }
    }
  }
  return results;
}

// Civic Initiatives — engine outcomes + editorial tracking + related articles
app.get('/api/initiatives', (req, res) => {
  // Layer 1: Engine data (recentOutcomes from civic desk packet)
  const civicPackets = readdirSync(join(ROOT, 'output/desk-packets'))
    .filter(f => f.match(/^civic_c\d+\.json$/))
    .sort((a, b) => {
      const na = parseInt(a.match(/\d+/)[0]);
      const nb = parseInt(b.match(/\d+/)[0]);
      return nb - na;
    });

  let engineOutcomes = [];
  if (civicPackets[0]) {
    const packet = readJSON(join(ROOT, 'output/desk-packets', civicPackets[0]));
    if (packet?.canonReference?.recentOutcomes) {
      engineOutcomes = packet.canonReference.recentOutcomes;
    }
  }

  // Layer 2: Editorial tracker (manually maintained implementation status)
  const tracker = readJSON(join(ROOT, 'output/initiative_tracker.json'));

  // Layer 3: Cross-reference articles from all editions
  const editions = getAllEditions();
  const allTracked = tracker?.initiatives || [];
  const articleMap = matchArticlesToInitiatives(editions, allTracked);

  // Merge: engine data + editorial tracking + related articles
  const initiatives = allTracked.map(tracked => {
    const engine = engineOutcomes.find(e => e.initiativeId === tracked.id);
    return {
      ...tracked,
      relatedArticles: articleMap[tracked.id] || [],
      engine: engine ? {
        voteBreakdown: engine.voteBreakdown,
        policyDomain: engine.policyDomain,
        affectedNeighborhoods: engine.affectedNeighborhoods,
      } : null,
    };
  });

  // Include any engine initiatives not in tracker
  const trackedIds = new Set(allTracked.map(t => t.id));
  const untrackedEngine = engineOutcomes
    .filter(e => !trackedIds.has(e.initiativeId))
    .map(e => ({
      id: e.initiativeId,
      name: e.name,
      status: e.status,
      voteCycle: parseInt(e.voteCycle),
      vote: e.voteRequirement,
      budget: e.budget,
      domain: e.policyDomain,
      keywords: [e.name],
      implementation: { status: 'untracked', summary: 'No editorial tracking yet.', pendingItems: [] },
      relatedArticles: [],
      engine: { voteBreakdown: e.voteBreakdown, policyDomain: e.policyDomain, affectedNeighborhoods: e.affectedNeighborhoods },
    }));

  res.json({
    lastUpdated: tracker?.lastUpdated || null,
    updatedBy: tracker?.updatedBy || null,
    cycle: tracker?.cycle || null,
    initiatives: [...initiatives, ...untrackedEngine],
    summary: {
      total: initiatives.length + untrackedEngine.length,
      blocked: initiatives.filter(i => i.implementation?.status === 'blocked').length,
      stalled: initiatives.filter(i => i.implementation?.status === 'stalled').length,
      clockRunning: initiatives.filter(i => i.implementation?.status === 'clock-running').length,
      inProgress: initiatives.filter(i => i.implementation?.status === 'in-progress').length,
    },
  });
});

// Roster — Bay Tribune journalists
app.get('/api/roster', (req, res) => {
  const roster = readJSON(join(ROOT, 'schemas/bay_tribune_roster.json'));
  if (!roster) return res.json({ roster: null });
  res.json({ roster });
});

// --- Live Sheet Endpoints ---

// Weather
app.get('/api/weather', async (req, res) => {
  const data = await getLiveSheetData('Cycle_Weather');
  if (!data) return res.json({ weather: [], source: 'none' });
  const weather = data.map(r => ({
    cycleId: r.CycleID,
    type: r.Type,
    temp: r.Temp,
    impact: r.Impact,
    advisory: r.Advisory,
    comfort: r.Comfort,
    description: r.Description || null,
  }));
  res.json({ source: 'live-sheet', weather });
});

// Cultural Ledger
app.get('/api/culture', async (req, res) => {
  const data = await getLiveSheetData('Cultural_Ledger');
  if (!data) return res.json({ culture: [], source: 'none' });
  const culture = data.map(r => ({
    id: r['CUL-ID'],
    name: r.Name,
    role: r.RoleType,
    fameCategory: r.FameCategory,
    domain: r.CulturalDomain,
    neighborhood: r.Neighborhood,
    influence: r.InfluenceLevel,
    status: r.Status,
  }));
  res.json({ source: 'live-sheet', total: culture.length, culture });
});

// Transit Metrics
app.get('/api/transit', async (req, res) => {
  const data = await getLiveSheetData('Transit_Metrics');
  if (!data) return res.json({ transit: [], source: 'none' });
  const transit = data.map(r => ({
    cycle: r.Cycle,
    station: r.Station,
    ridership: parseInt(r.RidershipVolume) || 0,
    onTime: parseFloat(r.OnTimePerformance) || 0,
    trafficIndex: parseFloat(r.TrafficIndex) || 0,
    crowding: r.CrowdingLevel || null,
    dayType: r.DayType || null,
  }));
  res.json({ source: 'live-sheet', total: transit.length, transit });
});

// Faith Organizations
app.get('/api/faith', async (req, res) => {
  const data = await getLiveSheetData('Faith_Organizations');
  if (!data) return res.json({ organizations: [], source: 'none' });
  const organizations = data.map(r => ({
    name: r.Organization,
    tradition: r.FaithTradition,
    neighborhood: r.Neighborhood,
    founded: r.Founded,
    congregation: parseInt(r.Congregation) || 0,
    leader: r.Leader,
    status: r.Status || 'active',
  }));
  res.json({ source: 'live-sheet', total: organizations.length, organizations });
});

// Domain Tracker (civic/crime/transit/economic heat over time)
app.get('/api/domains', async (req, res) => {
  const data = await getLiveSheetData('Domain_Tracker');
  if (!data) return res.json({ domains: [], source: 'none' });
  const domains = data.map(r => ({
    cycle: r.Cycle,
    civic: parseFloat(r.CIVIC) || 0,
    crime: parseFloat(r.CRIME) || 0,
    transit: parseFloat(r.TRANSIT) || 0,
    economic: parseFloat(r.ECONOMIC) || 0,
    cultural: parseFloat(r.CULTURAL) || 0,
    sports: parseFloat(r.SPORTS) || 0,
    health: parseFloat(r.HEALTH) || 0,
    faith: parseFloat(r.FAITH) || 0,
  }));
  res.json({ source: 'live-sheet', total: domains.length, domains });
});

// --- Article Index ---
// Returns the pre-built article index with optional filters
let _articleIndexCache = null;
let _articleIndexCacheTime = 0;

function getArticleIndex() {
  const indexPath = join(ROOT, 'output/article-index.json');
  if (!existsSync(indexPath)) return null;
  const now = Date.now();
  if (_articleIndexCache && now - _articleIndexCacheTime < SHEET_CACHE_TTL) return _articleIndexCache;
  try {
    _articleIndexCache = JSON.parse(readFileSync(indexPath, 'utf-8'));
    _articleIndexCacheTime = now;
    return _articleIndexCache;
  } catch { return null; }
}

app.get('/api/articles/index', (req, res) => {
  const index = getArticleIndex();
  if (!index) {
    return res.status(404).json({ error: 'Article index not built. Run: node scripts/buildArticleIndex.js --write' });
  }

  let entries = index.entries.filter(e => !e.isDuplicate);

  // Optional filters
  const { cycle, desk, author, classification, q, limit: limitStr } = req.query;
  if (cycle) entries = entries.filter(e => e.cycle === parseInt(cycle));
  if (desk) entries = entries.filter(e => e.desk === desk);
  if (author) entries = entries.filter(e => e.author?.toLowerCase().includes(author.toLowerCase()));
  if (classification) entries = entries.filter(e => e.classification === classification);
  if (q) {
    const pattern = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    entries = entries.filter(e => pattern.test(e.title || '') || pattern.test(e.author || ''));
  }

  const limit = parseInt(limitStr) || 200;
  res.json({
    generated: index.generated,
    stats: index.stats,
    total: entries.length,
    showing: Math.min(limit, entries.length),
    entries: entries.slice(0, limit),
  });
});

// --- Full-Text Article Search ---
// Searches across ALL editions and supplementals by keyword, author, section, citizen
app.get('/api/search/articles', (req, res) => {
  const { q, author, section, citizen, cycle: cycleFilter, limit: limitStr } = req.query;
  if (!q && !author && !section && !citizen) {
    return res.json({ error: 'Provide at least one: q, author, section, or citizen', results: [] });
  }

  const editions = getAllEditions();
  let results = [];

  for (const ed of editions) {
    if (cycleFilter && ed.cycle !== parseInt(cycleFilter)) continue;

    for (const article of ed.articles) {
      const searchText = `${article.title || ''} ${article.subtitle || ''} ${article.body || ''}`;
      let match = true;

      if (q) {
        const pattern = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        if (!pattern.test(searchText)) match = false;
      }
      if (author && match) {
        if (!article.author?.toLowerCase().includes(author.toLowerCase())) match = false;
      }
      if (section && match) {
        if (!article.section?.toLowerCase().includes(section.toLowerCase())) match = false;
      }
      if (citizen && match) {
        const citizenPattern = new RegExp(citizen.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        const nameHit = citizenPattern.test(searchText) ||
          (article.namesIndex && citizenPattern.test(article.namesIndex));
        if (!nameHit) match = false;
      }

      if (match) {
        // Extract snippet around the match
        let snippet = '';
        if (q) {
          const idx = searchText.toLowerCase().indexOf(q.toLowerCase());
          if (idx >= 0) {
            const start = Math.max(0, idx - 80);
            const end = Math.min(searchText.length, idx + q.length + 80);
            snippet = (start > 0 ? '...' : '') + searchText.slice(start, end) + (end < searchText.length ? '...' : '');
          }
        } else {
          snippet = (article.body || '').split('\n')[0]?.slice(0, 200) || '';
        }

        results.push({
          cycle: ed.cycle,
          file: ed.file,
          articleIndex: ed.articles.indexOf(article),
          title: article.title,
          subtitle: article.subtitle || null,
          section: article.section,
          author: article.author || null,
          desk: article.desk || null,
          namesIndex: article.namesIndex || null,
          snippet,
          bodyLength: (article.body || '').length,
        });
      }
    }
  }

  const limit = parseInt(limitStr) || 50;
  res.json({
    query: { q, author, section, citizen, cycle: cycleFilter },
    total: results.length,
    showing: Math.min(limit, results.length),
    results: results.slice(0, limit),
  });
});

// --- Full Article ---
// Retrieve a single article's full body by file + articleIndex
app.get('/api/article', (req, res) => {
  const { file, index } = req.query;
  if (!file || index === undefined) {
    return res.status(400).json({ error: 'Provide file and index params' });
  }

  const editions = getAllEditions();
  const ed = editions.find(e => e.file === file);
  if (!ed) return res.status(404).json({ error: `Edition file not found: ${file}` });

  const articleIdx = parseInt(index);
  const article = ed.articles[articleIdx];
  if (!article) return res.status(404).json({ error: `Article index ${index} not found in ${file}` });

  res.json({
    cycle: ed.cycle,
    file: ed.file,
    source: ed.source,
    title: article.title,
    subtitle: article.subtitle || null,
    section: article.section,
    author: article.author || null,
    desk: article.desk || null,
    namesIndex: article.namesIndex || null,
    body: article.body || '',
  });
});

// --- Citizen Detail ---
// Full citizen record: ledger data + archive appearances + desk packet data
app.get('/api/citizens/:popId', async (req, res) => {
  const { popId } = req.params;

  // Layer 1: Ledger data — live sheet first, fallback to cycle archive
  let ledgerRecord = null;
  const liveData = await getLiveSheetData('Simulation_Ledger');
  if (liveData) {
    const row = liveData.find(r => r.POPID?.toLowerCase() === popId.toLowerCase());
    if (row) ledgerRecord = { ...row };
  }
  if (!ledgerRecord) {
    const cycleDir = getLatestCycleDir();
    if (cycleDir) {
      const cycleNum = cycleDir.split('/').pop().replace('cycle-', '');
      const simText = readText(join(cycleDir, `Simulation_Ledger_Cycle_${cycleNum}.txt`));
      if (simText) {
        const rows = parseTSV(simText);
        const row = rows.find(r => r.POPID?.toLowerCase() === popId.toLowerCase());
        if (row) ledgerRecord = { ...row };
      }
    }
  }

  // Layer 2: Citizen archive (from desk packets — article appearances)
  let archiveData = null;
  const packetDir = join(ROOT, 'output/desk-packets');
  const latestCivic = readdirSync(packetDir)
    .filter(f => f.match(/^civic_c\d+\.json$/))
    .sort((a, b) => parseInt(b.match(/\d+/)[0]) - parseInt(a.match(/\d+/)[0]))[0];

  if (latestCivic) {
    const packet = readJSON(join(packetDir, latestCivic));
    const ca = packet?.citizenArchive || {};
    for (const [name, data] of Object.entries(ca)) {
      if (data.popId?.toLowerCase() === popId.toLowerCase()) {
        archiveData = { name, ...data };
        break;
      }
    }
  }

  // Layer 3: Edition appearances (search all editions for this citizen)
  const editions = getAllEditions();
  const editionAppearances = [];
  const searchName = ledgerRecord
    ? `${ledgerRecord.First} ${ledgerRecord.Last}`
    : (archiveData?.name || popId);

  if (searchName && searchName !== popId) {
    const namePattern = new RegExp(searchName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    for (const ed of editions) {
      for (const article of ed.articles) {
        const searchText = `${article.body || ''} ${article.namesIndex || ''}`;
        if (namePattern.test(searchText)) {
          editionAppearances.push({
            cycle: ed.cycle,
            title: article.title,
            section: article.section,
            author: article.author || null,
          });
        }
      }
    }
  }

  // Layer 4: Voice card (from citizen_archive.json if exists)
  const citizenArchiveFile = readJSON(join(packetDir, 'citizen_archive.json'));
  let voiceCard = null;
  if (citizenArchiveFile) {
    for (const [name, data] of Object.entries(citizenArchiveFile)) {
      if (data.popId?.toLowerCase() === popId.toLowerCase()) {
        voiceCard = { name, ...data };
        break;
      }
    }
  }

  if (!ledgerRecord && !archiveData && editionAppearances.length === 0) {
    return res.status(404).json({ error: `Citizen ${popId} not found`, popId });
  }

  // Parse LifeHistory into structured events
  let lifeEvents = [];
  if (ledgerRecord?.LifeHistory) {
    const raw = ledgerRecord.LifeHistory;
    const parts = raw.split(/(?=\d{4}-\d{2}-\d{2})|(?=Engine Event:)/g).filter(s => s.trim());
    for (const part of parts) {
      const dateMatch = part.match(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})?\s*[—-]*\s*(?:\[(\w+)\])?\s*(.*)/s);
      if (dateMatch) {
        lifeEvents.push({
          date: dateMatch[1],
          time: dateMatch[2] || null,
          tag: dateMatch[3] || 'General',
          text: dateMatch[4]?.trim() || part.trim(),
        });
      } else {
        const engineMatch = part.match(/^Engine Event:\s*(.*)/);
        if (engineMatch) {
          lifeEvents.push({ date: null, time: null, tag: 'Engine', text: engineMatch[1].trim() });
        } else if (part.trim()) {
          lifeEvents.push({ date: null, time: null, tag: 'General', text: part.trim() });
        }
      }
    }
  }

  // Extract flags
  const flags = {};
  if (ledgerRecord) {
    flags.universe = ledgerRecord['UNI (y/n)']?.toLowerCase() === 'yes';
    flags.media = ledgerRecord['MED (y/n)']?.toLowerCase() === 'yes';
    flags.civic = ledgerRecord['CIV (y/n)']?.toLowerCase() === 'yes';
    flags.originCity = ledgerRecord.OrginCity || null;
    flags.usageCount = parseInt(ledgerRecord.UsageCount) || 0;
    flags.createdAt = ledgerRecord.CreatedAt || null;
    flags.lastUpdated = ledgerRecord['Last Updated'] || null;
  }

  // Extended fields from live sheet
  const extended = {};
  if (ledgerRecord) {
    if (ledgerRecord.MaritalStatus) extended.maritalStatus = ledgerRecord.MaritalStatus;
    if (ledgerRecord.NumChildren) extended.numChildren = parseInt(ledgerRecord.NumChildren) || 0;
    if (ledgerRecord.WealthLevel) extended.wealthLevel = parseInt(ledgerRecord.WealthLevel);
    if (ledgerRecord.Income) extended.income = parseInt(ledgerRecord.Income);
    if (ledgerRecord.EducationLevel) extended.educationLevel = ledgerRecord.EducationLevel;
    if (ledgerRecord.CareerStage) extended.careerStage = ledgerRecord.CareerStage;
    if (ledgerRecord.YearsInCareer) extended.yearsInCareer = parseInt(ledgerRecord.YearsInCareer);
    if (ledgerRecord.MigrationIntent) extended.migrationIntent = ledgerRecord.MigrationIntent;
    if (ledgerRecord.HouseholdId) extended.householdId = ledgerRecord.HouseholdId;
  }

  res.json({
    popId,
    ledger: ledgerRecord,
    flags,
    extended,
    lifeEvents,
    archive: archiveData,
    voiceCard,
    editionAppearances,
    totalAppearances: editionAppearances.length + (archiveData?.totalRefs || 0),
  });
});

// --- Citizen Coverage Trail ---
// Which articles mention a citizen across all editions (by name search)
app.get('/api/citizen-coverage/:nameOrId', (req, res) => {
  const query = decodeURIComponent(req.params.nameOrId);
  const editions = getAllEditions();
  const pattern = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const trail = [];

  for (const ed of editions) {
    for (const article of ed.articles) {
      const searchText = `${article.title || ''} ${article.body || ''} ${article.namesIndex || ''}`;
      if (pattern.test(searchText)) {
        // Count mentions
        const mentions = (searchText.match(new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')) || []).length;

        // Extract first quote or context
        let context = '';
        const bodyLines = (article.body || '').split('\n');
        for (const line of bodyLines) {
          if (pattern.test(line)) {
            context = line.slice(0, 200);
            break;
          }
        }

        trail.push({
          cycle: ed.cycle,
          title: article.title,
          section: article.section,
          author: article.author || null,
          mentions,
          context,
        });
      }
    }
  }

  res.json({
    query,
    totalArticles: trail.length,
    totalMentions: trail.reduce((s, t) => s + t.mentions, 0),
    trail,
  });
});

// --- Story Hooks ---
// Active hooks from the latest desk packet
app.get('/api/hooks', (req, res) => {
  const { desk, domain, priority } = req.query;
  const packetDir = join(ROOT, 'output/desk-packets');
  const allHooks = [];

  // Gather hooks from all desk packets for the latest cycle
  const packets = readdirSync(packetDir)
    .filter(f => f.match(/^(civic|sports|culture|business|chicago|letters)_c\d+\.json$/))
    .sort((a, b) => parseInt(b.match(/\d+/)[0]) - parseInt(a.match(/\d+/)[0]));

  // Group by cycle — only latest
  const latestCycle = packets[0] ? parseInt(packets[0].match(/\d+/)[0]) : null;
  if (!latestCycle) return res.json({ hooks: [], cycle: null });

  const latestPackets = packets.filter(f => parseInt(f.match(/\d+/)[0]) === latestCycle);

  for (const pFile of latestPackets) {
    const deskName = pFile.replace(/_c\d+\.json$/, '');
    const packet = readJSON(join(packetDir, pFile));
    const hooks = packet?.hooks || [];
    for (const hook of hooks) {
      allHooks.push({ ...hook, sourceDesk: deskName });
    }
  }

  let filtered = allHooks;
  if (desk) filtered = filtered.filter(h => h.sourceDesk === desk || h.suggestedDesks?.toLowerCase().includes(desk.toLowerCase()));
  if (domain) filtered = filtered.filter(h => h.domain?.toLowerCase() === domain.toLowerCase());
  if (priority) filtered = filtered.filter(h => h.priority >= parseInt(priority));

  // Sort by priority score descending
  filtered.sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0));

  res.json({ cycle: latestCycle, total: filtered.length, hooks: filtered });
});

// --- Arcs ---
// Multi-cycle storylines from desk packets
app.get('/api/arcs', (req, res) => {
  const { domain, phase } = req.query;
  const packetDir = join(ROOT, 'output/desk-packets');
  const arcMap = new Map();

  // Gather arcs from all desk packets for latest cycle
  const packets = readdirSync(packetDir)
    .filter(f => f.match(/^(civic|sports|culture|business|chicago|letters)_c\d+\.json$/))
    .sort((a, b) => parseInt(b.match(/\d+/)[0]) - parseInt(a.match(/\d+/)[0]));

  const latestCycle = packets[0] ? parseInt(packets[0].match(/\d+/)[0]) : null;
  if (!latestCycle) return res.json({ arcs: [], cycle: null });

  const latestPackets = packets.filter(f => parseInt(f.match(/\d+/)[0]) === latestCycle);

  for (const pFile of latestPackets) {
    const packet = readJSON(join(packetDir, pFile));
    const arcs = packet?.arcs || [];
    for (const arc of arcs) {
      if (!arcMap.has(arc.arcId)) {
        arcMap.set(arc.arcId, arc);
      }
    }
  }

  let arcs = Array.from(arcMap.values());
  if (domain) arcs = arcs.filter(a => a.domain?.toLowerCase() === domain.toLowerCase());
  if (phase) arcs = arcs.filter(a => a.phase?.toLowerCase() === phase.toLowerCase());

  // Sort by tension descending
  arcs.sort((a, b) => parseFloat(b.tension || 0) - parseFloat(a.tension || 0));

  res.json({ cycle: latestCycle, total: arcs.length, arcs });
});

// --- Storylines ---
// Active storylines from desk packets
app.get('/api/storylines', (req, res) => {
  const { status, priority, neighborhood } = req.query;
  const packetDir = join(ROOT, 'output/desk-packets');
  const storylineMap = new Map();

  const packets = readdirSync(packetDir)
    .filter(f => f.match(/^(civic|sports|culture|business|chicago|letters)_c\d+\.json$/))
    .sort((a, b) => parseInt(b.match(/\d+/)[0]) - parseInt(a.match(/\d+/)[0]));

  const latestCycle = packets[0] ? parseInt(packets[0].match(/\d+/)[0]) : null;
  if (!latestCycle) return res.json({ storylines: [], cycle: null });

  const latestPackets = packets.filter(f => parseInt(f.match(/\d+/)[0]) === latestCycle);

  for (const pFile of latestPackets) {
    const deskName = pFile.replace(/_c\d+\.json$/, '');
    const packet = readJSON(join(packetDir, pFile));
    const storylines = packet?.storylines || [];
    for (const sl of storylines) {
      const key = sl.description?.slice(0, 50) || JSON.stringify(sl);
      if (!storylineMap.has(key)) {
        storylineMap.set(key, { ...sl, desks: [deskName] });
      } else {
        storylineMap.get(key).desks.push(deskName);
      }
    }
  }

  let storylines = Array.from(storylineMap.values());
  if (status) storylines = storylines.filter(s => s.status?.toLowerCase() === status.toLowerCase());
  if (priority) storylines = storylines.filter(s => s.priority?.toLowerCase() === priority.toLowerCase());
  if (neighborhood) storylines = storylines.filter(s => s.neighborhood?.toLowerCase().includes(neighborhood.toLowerCase()));

  res.json({ cycle: latestCycle, total: storylines.length, storylines });
});

// --- Edition Score History ---
app.get('/api/scores', (req, res) => {
  const scores = readJSON(join(ROOT, 'output/edition_scores.json'));
  if (!scores) return res.json({ scores: [] });
  res.json(scores);
});

// --- Sports Feeds ---
// Oakland + Chicago sports data from desk packets
app.get('/api/sports', (req, res) => {
  const packetDir = join(ROOT, 'output/desk-packets');
  const latestSports = readdirSync(packetDir)
    .filter(f => f.match(/^sports_c\d+\.json$/))
    .sort((a, b) => parseInt(b.match(/\d+/)[0]) - parseInt(a.match(/\d+/)[0]))[0];

  if (!latestSports) return res.json({ feeds: null, digest: null });

  const packet = readJSON(join(packetDir, latestSports));
  const feeds = packet?.sportsFeeds || {};
  const digest = packet?.sportsFeedDigest || '';

  // Also get Chicago feeds
  const latestChicago = readdirSync(packetDir)
    .filter(f => f.match(/^chicago_c\d+\.json$/))
    .sort((a, b) => parseInt(b.match(/\d+/)[0]) - parseInt(a.match(/\d+/)[0]))[0];

  let chicagoFeeds = {};
  let chicagoDigest = '';
  if (latestChicago) {
    const cp = readJSON(join(packetDir, latestChicago));
    chicagoFeeds = cp?.sportsFeeds || {};
    chicagoDigest = cp?.sportsFeedDigest || '';
  }

  res.json({
    oakland: { feeds, digest },
    chicago: { feeds: chicagoFeeds, digest: chicagoDigest },
  });
});

// --- Mara Directives ---
// Latest Mara Vance directive and audit history
app.get('/api/mara', (req, res) => {
  const outputDir = join(ROOT, 'output');
  const directives = readdirSync(outputDir)
    .filter(f => f.match(/^mara_directive_c\d+\.txt$/))
    .sort((a, b) => {
      const na = parseInt(a.match(/\d+/)[0]);
      const nb = parseInt(b.match(/\d+/)[0]);
      return nb - na;
    });

  const latest = directives[0] ? readText(join(outputDir, directives[0])) : null;
  const history = directives.map(f => ({
    file: f,
    cycle: parseInt(f.match(/\d+/)[0]),
  }));

  res.json({
    latest: latest ? { file: directives[0], cycle: parseInt(directives[0].match(/\d+/)[0]), text: latest } : null,
    history,
  });
});

// --- Edition Full Text ---
// Returns full parsed edition by cycle number
app.get('/api/edition/:cycle', (req, res) => {
  const cycle = parseInt(req.params.cycle);
  const edDir = join(ROOT, 'editions');
  if (!existsSync(edDir)) return res.status(404).json({ error: 'No editions directory' });

  // Check for main edition and supplementals
  const files = readdirSync(edDir).filter(f => {
    const match = f.match(/(\d+)/);
    return match && parseInt(match[1]) === cycle && f.endsWith('.txt');
  });

  if (files.length === 0) return res.status(404).json({ error: `No edition for cycle ${cycle}` });

  const editions = files.map(f => {
    const text = readText(join(edDir, f));
    const parsed = parseEdition(text);
    return {
      file: f,
      isSupplemental: f.includes('supplemental'),
      ...parsed,
    };
  });

  res.json({ cycle, editions });
});

// --- Newsroom Operations ---
// Aggregated operational view: editor state, desk status, agent health, pipeline metrics
app.get('/api/newsroom', (req, res) => {
  const packetDir = join(ROOT, 'output/desk-packets');
  const outputDir = join(ROOT, 'output');

  // 1. Editor state — latest journal entry
  let journalLatest = null;
  const journalPath = join(ROOT, 'docs/mags-corliss/JOURNAL_RECENT.md');
  const journalText = readText(journalPath);
  if (journalText) {
    // Extract latest entry header + first paragraph
    const entries = journalText.split(/^## Session/m).filter(s => s.trim());
    if (entries.length > 0) {
      const latest = entries[entries.length - 1];
      const lines = latest.split('\n').filter(l => l.trim());
      const sessionMatch = latest.match(/(\d+)\s*[—-]\s*([\d-]+)/);
      const entryMatch = latest.match(/### Entry (\d+):\s*(.+)/);
      // Get first meaningful paragraph (skip headers)
      const bodyLines = lines.filter(l => !l.startsWith('#') && !l.startsWith('---') && l.trim().length > 20);
      journalLatest = {
        session: sessionMatch ? parseInt(sessionMatch[1]) : null,
        date: sessionMatch ? sessionMatch[2] : null,
        entryNumber: entryMatch ? parseInt(entryMatch[1]) : null,
        entryTitle: entryMatch ? entryMatch[2].trim() : null,
        preview: bodyLines.slice(0, 3).join(' ').slice(0, 300),
      };
    }
  }

  // 2. Desk status — latest packet cycle per desk, article counts from latest edition
  const deskNames = ['civic', 'sports', 'culture', 'business', 'chicago', 'letters'];
  const deskStatus = {};
  for (const desk of deskNames) {
    const packets = readdirSync(packetDir)
      .filter(f => f.match(new RegExp(`^${desk}_c\\d+\\.json$`)))
      .sort((a, b) => parseInt(b.match(/\d+/)[0]) - parseInt(a.match(/\d+/)[0]));
    const latestCycle = packets[0] ? parseInt(packets[0].match(/\d+/)[0]) : null;
    const packetCount = packets.length;

    // Get hook count from latest packet
    let hookCount = 0;
    let arcCount = 0;
    if (packets[0]) {
      const pkt = readJSON(join(packetDir, packets[0]));
      hookCount = (pkt?.hooks || []).length;
      arcCount = (pkt?.arcs || []).length;
    }

    deskStatus[desk] = { latestCycle, packetCount, hookCount, arcCount };
  }

  // Count articles per desk in latest edition
  const latestEd = getLatestEdition();
  if (latestEd) {
    const parsed = parseEdition(readText(latestEd));
    const sectionDeskMap = {
      'CIVIC AFFAIRS': 'civic', 'SPORTS': 'sports', 'CULTURE & COMMUNITY': 'culture',
      'BUSINESS TICKER': 'business', 'CHICAGO BUREAU': 'chicago', 'LETTERS TO THE EDITOR': 'letters',
      'FRONT PAGE': 'civic',
    };
    for (const article of parsed.articles) {
      const desk = sectionDeskMap[article.section];
      if (desk && deskStatus[desk]) {
        deskStatus[desk].latestArticles = (deskStatus[desk].latestArticles || 0) + 1;
      }
    }
  }

  // 3. Mara audit — latest directive + score summary
  const directives = readdirSync(outputDir)
    .filter(f => f.match(/^mara_directive_c\d+\.txt$/))
    .sort((a, b) => parseInt(b.match(/\d+/)[0]) - parseInt(a.match(/\d+/)[0]));
  const latestDirective = directives[0] ? {
    cycle: parseInt(directives[0].match(/\d+/)[0]),
    file: directives[0],
  } : null;

  const scoresData = readJSON(join(outputDir, 'edition_scores.json'));
  const scores = scoresData?.scores || [];
  const latestScore = scores.length > 0 ? scores[scores.length - 1] : null;

  // 4. Pipeline metrics — edition history
  const editions = getAllEditions();
  const editionsBySource = { editions: 0, 'drive-archive': 0 };
  const supplementals = editions.filter(e => e.isSupplemental).length;
  editions.forEach(e => { editionsBySource[e.source] = (editionsBySource[e.source] || 0) + 1; });

  // Article count trend (last 5 main editions)
  const mainEditions = editions
    .filter(e => e.source === 'editions' && !e.isSupplemental)
    .sort((a, b) => (b.cycle || 0) - (a.cycle || 0))
    .slice(0, 5);
  const articleTrend = mainEditions.map(e => ({
    cycle: e.cycle,
    articles: e.articles.length,
  }));

  // 5. Roster summary
  const roster = readJSON(join(ROOT, 'schemas/bay_tribune_roster.json'));
  let reporterCount = 0;
  let deskList = [];
  if (roster) {
    const desks = roster.desks || {};
    for (const [deskName, deskData] of Object.entries(desks)) {
      const reporters = deskData.reporters || [];
      const columnists = deskData.columnists || [];
      const total = reporters.length + columnists.length;
      reporterCount += total;
      if (total > 0) {
        deskList.push({
          desk: deskName,
          reporters: reporters.map(r => ({ name: r.name, beat: r.beat || r.role })),
          columnists: columnists.map(c => ({ name: c.name, column: c.column || c.role })),
        });
      }
    }
  }

  // 6. Bot/process status — read PM2 dump file directly
  let processes = [];
  try {
    const pm2Home = join(process.env.HOME || '/root', '.pm2');
    const dumpPath = join(pm2Home, 'dump.pm2');
    const pidDir = join(pm2Home, 'pids');
    if (existsSync(dumpPath)) {
      const dump = JSON.parse(readFileSync(dumpPath, 'utf-8'));
      processes = dump.map(p => {
        const name = p.name || 'unknown';
        // Check if process is actually running by looking for pid file
        const pidFile = join(pidDir, `${name}-0.pid`);
        let isRunning = false;
        let pid = null;
        if (existsSync(pidFile)) {
          pid = parseInt(readFileSync(pidFile, 'utf-8').trim());
          try { process.kill(pid, 0); isRunning = true; } catch { isRunning = false; }
        }
        return {
          name,
          status: isRunning ? 'online' : 'stopped',
          pid,
          restarts: p.pm2_env?.restart_time || 0,
          uptime: p.pm2_env?.pm_uptime ? new Date(p.pm2_env.pm_uptime).toISOString() : null,
          memory: null,
          cpu: 0,
        };
      });
    }
  } catch { /* PM2 not available */ }

  // 7. Citizen archive stats
  const citizenArchive = readJSON(join(packetDir, 'citizen_archive.json'));
  const archiveStats = citizenArchive ? {
    totalCitizens: Object.keys(citizenArchive).length,
    totalRefs: Object.values(citizenArchive).reduce((s, c) => s + (c.totalRefs || 0), 0),
    topCitizens: Object.entries(citizenArchive)
      .map(([name, data]) => ({ name, refs: data.totalRefs || 0, popId: data.popId }))
      .sort((a, b) => b.refs - a.refs)
      .slice(0, 10),
  } : null;

  // 8. Article index stats (if index is built)
  const articleIndex = getArticleIndex();
  const indexStats = articleIndex ? {
    generated: articleIndex.generated,
    totalFiles: articleIndex.stats.totalFiles,
    unique: articleIndex.stats.unique,
    duplicates: articleIndex.stats.duplicates.total,
    byClassification: articleIndex.stats.byClassification,
    byDesk: articleIndex.stats.byDesk,
    cyclesCovered: Object.keys(articleIndex.stats.byCycle).length,
  } : null;

  res.json({
    timestamp: new Date().toISOString(),
    editor: {
      name: 'Mags Corliss',
      role: 'Editor-in-Chief',
      journal: journalLatest,
    },
    desks: deskStatus,
    audit: {
      mara: latestDirective,
      latestScore: latestScore ? {
        edition: latestScore.edition,
        grade: latestScore.grade || latestScore.maraGrade,
        total: latestScore.total,
        criticals: latestScore.criticals,
        warnings: latestScore.warnings,
        deskErrors: latestScore.deskErrors,
      } : null,
      scoreHistory: scores.map(s => ({
        edition: s.edition,
        grade: s.grade || s.maraGrade,
        total: s.total,
        criticals: s.criticals,
      })),
    },
    pipeline: {
      totalEditions: editions.length,
      mainEditions: editionsBySource.editions || 0,
      archiveEditions: editionsBySource['drive-archive'] || 0,
      supplementals,
      articleTrend,
      latestCycle: mainEditions[0]?.cycle || null,
    },
    roster: {
      totalReporters: reporterCount,
      desks: deskList,
    },
    processes,
    citizenArchive: archiveStats,
    articleIndex: indexStats,
  });
});

// Serve static React build in production
const distPath = join(__dirname, 'dist');
if (existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(join(distPath, 'index.html'));
    }
  });
}

app.listen(PORT, () => {
  console.log(`GodWorld Dashboard API v3.0 running on http://localhost:${PORT}`);
  console.log(`\n  DATA`);
  console.log(`  /api/health              — Service status`);
  console.log(`  /api/world-state         — World state (agents/bot)`);
  console.log(`  /api/citizens            — Citizen registry (?tier=&neighborhood=&search=&limit=)`);
  console.log(`  /api/citizens/:popId     — Full citizen detail + coverage trail`);
  console.log(`  /api/council             — Council + city staff`);
  console.log(`  /api/neighborhoods       — 17 Oakland neighborhoods`);
  console.log(`  /api/sports              — Oakland + Chicago sports feeds`);
  console.log(`  /api/roster              — Bay Tribune journalist roster`);
  console.log(`\n  SEARCH`);
  console.log(`  /api/search/articles     — Full-text article search (?q=&author=&section=&citizen=&cycle=)`);
  console.log(`  /api/citizen-coverage/:n — Coverage trail for citizen by name`);
  console.log(`\n  EDITORIAL`);
  console.log(`  /api/edition/latest      — Latest Cycle Pulse edition`);
  console.log(`  /api/edition/:cycle      — Full edition + supplementals by cycle`);
  console.log(`  /api/editions            — All editions list`);
  console.log(`  /api/initiatives         — Civic initiatives + implementation tracker`);
  console.log(`  /api/hooks               — Story hooks (?desk=&domain=&priority=)`);
  console.log(`  /api/arcs                — Multi-cycle arcs (?domain=&phase=)`);
  console.log(`  /api/storylines          — Active storylines (?status=&priority=&neighborhood=)`);
  console.log(`  /api/scores              — Edition score history`);
  console.log(`  /api/mara                — Mara Vance directives`);
  console.log(`  /api/newsroom            — Newsroom operations dashboard`);
  console.log(`  /api/article             — Full article body (?file=&index=)`);
  console.log(`  /api/weather             — Cycle weather (live sheet)`);
  console.log(`  /api/culture             — Cultural ledger (live sheet)`);
  console.log(`  /api/transit             — Transit metrics (live sheet)`);
  console.log(`  /api/faith               — Faith organizations (live sheet)`);
  console.log(`  /api/domains             — Domain heat tracker (live sheet)`);
});
