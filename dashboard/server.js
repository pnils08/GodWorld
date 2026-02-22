import express from 'express';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const app = express();
const PORT = process.env.DASHBOARD_PORT || 3001;

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
  return dataLines.map(line => {
    const vals = line.split('\t');
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

  return { header, articles };
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
app.get('/api/world-state', (req, res) => {
  // Try base_context.json first (generated by buildDeskPackets)
  const baseCtx = readJSON(join(ROOT, 'output/desk-packets/base_context.json'));
  if (baseCtx) {
    return res.json({ source: 'base_context', data: baseCtx });
  }

  // Fallback: build from ledger archives + edition
  const cycleDir = getLatestCycleDir();
  const editionPath = getLatestEdition();
  const fallback = { source: 'ledger_fallback' };

  if (editionPath) {
    const parsed = parseEdition(readText(editionPath));
    fallback.edition = parsed.header;
    fallback.articleCount = parsed.articles.length;
  }

  if (cycleDir) {
    const neighborhoodText = readText(join(cycleDir, `Neighborhood_Map_${cycleDir.split('/').pop().replace('cycle-', 'Cycle_')}.txt`));
    if (neighborhoodText) {
      const rows = parseTSV(neighborhoodText);
      fallback.neighborhoods = rows.map(r => ({
        name: r.Neighborhood,
        sentiment: parseFloat(r.Sentiment) || 0,
        crimeIndex: parseInt(r.CrimeIndex) || 0,
        nightlife: parseFloat(r.NightlifeProfile) || 0,
        retailVitality: parseFloat(r.RetailVitality) || 0,
      }));
    }

    const cycleNum = cycleDir.split('/').pop().replace('cycle-', '');
    fallback.cycle = parseInt(cycleNum);
  }

  res.json(fallback);
});

// Citizens
app.get('/api/citizens', (req, res) => {
  const cycleDir = getLatestCycleDir();
  if (!cycleDir) return res.json({ citizens: [], source: 'none' });

  const cycleNum = cycleDir.split('/').pop().replace('cycle-', '');
  const simText = readText(join(cycleDir, `Simulation_Ledger_Cycle_${cycleNum}.txt`));
  if (!simText) return res.json({ citizens: [], source: 'none' });

  const rows = parseTSV(simText);
  const { tier, neighborhood, search, limit: limitStr } = req.query;

  let citizens = rows.map(r => ({
    popId: r.POPID,
    firstName: r.First,
    lastName: r.Last,
    tier: parseInt(r.Tier) || 4,
    role: r.RoleType,
    status: r.Status,
    birthYear: r.BirthYear,
    neighborhood: r.Neighborhood,
    source: r.OriginGame || r.OriginVault || 'engine',
    clockMode: r.ClockMode,
  }));

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

  const limit = parseInt(limitStr) || 100;
  res.json({
    total: citizens.length,
    showing: Math.min(limit, citizens.length),
    source: `cycle-${cycleNum}`,
    citizens: citizens.slice(0, limit),
  });
});

// Council
app.get('/api/council', (req, res) => {
  const cycleDir = getLatestCycleDir();
  if (!cycleDir) return res.json({ council: [], source: 'none' });

  const cycleNum = cycleDir.split('/').pop().replace('cycle-', '');
  const civicText = readText(join(cycleDir, `Civic_Office_Ledger_Cycle_${cycleNum}.txt`));
  if (!civicText) return res.json({ council: [], source: 'none' });

  const rows = parseTSV(civicText);
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

  res.json({ source: `cycle-${cycleNum}`, council, staff });
});

// Neighborhoods
app.get('/api/neighborhoods', (req, res) => {
  const cycleDir = getLatestCycleDir();
  if (!cycleDir) return res.json({ neighborhoods: [], source: 'none' });

  const cycleNum = cycleDir.split('/').pop().replace('cycle-', '');
  const text = readText(join(cycleDir, `Neighborhood_Map_Cycle_${cycleNum}.txt`));
  if (!text) return res.json({ neighborhoods: [], source: 'none' });

  const rows = parseTSV(text);
  const neighborhoods = rows.map(r => ({
    name: r.Neighborhood,
    sentiment: parseFloat(r.Sentiment) || 0,
    crimeIndex: parseInt(r.CrimeIndex) || 0,
    noiseIndex: parseFloat(r.NoiseIndex) || 0,
    nightlife: parseFloat(r.NightlifeProfile) || 0,
    retailVitality: parseFloat(r.RetailVitality) || 0,
    eventAttractiveness: parseFloat(r.EventAttractiveness) || 0,
    demographic: r.DemographicMarker,
  }));

  res.json({ source: `cycle-${cycleNum}`, neighborhoods });
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

// Edition list
app.get('/api/editions', (req, res) => {
  const edDir = join(ROOT, 'editions');
  if (!existsSync(edDir)) return res.json({ editions: [] });

  const files = readdirSync(edDir)
    .filter(f => f.match(/^cycle_pulse_edition_\d+/))
    .sort((a, b) => {
      const na = parseInt(a.match(/\d+/)[0]);
      const nb = parseInt(b.match(/\d+/)[0]);
      return nb - na;
    })
    .map(f => ({
      file: f,
      cycle: parseInt(f.match(/\d+/)[0]),
    }));

  res.json({ editions: files });
});

// Roster — Bay Tribune journalists
app.get('/api/roster', (req, res) => {
  const roster = readJSON(join(ROOT, 'schemas/bay_tribune_roster.json'));
  if (!roster) return res.json({ roster: null });
  res.json({ roster });
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
  console.log(`GodWorld Dashboard API running on http://localhost:${PORT}`);
  console.log(`  /api/health         — Service status`);
  console.log(`  /api/world-state    — World state (for agents/bot)`);
  console.log(`  /api/citizens       — Citizen registry (?tier=1&neighborhood=&search=)`);
  console.log(`  /api/council        — Council + city staff`);
  console.log(`  /api/neighborhoods  — 17 Oakland neighborhoods`);
  console.log(`  /api/edition/latest — Latest Cycle Pulse edition`);
  console.log(`  /api/editions       — All editions list`);
  console.log(`  /api/roster         — Bay Tribune journalist roster`);
});
