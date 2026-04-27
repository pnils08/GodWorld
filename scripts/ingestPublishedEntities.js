#!/usr/bin/env node
/**
 * ingestPublishedEntities.js — Standing intake from published artifacts to engine sheets
 * [engine/sheet] — S180 build, ROLLOUT_PLAN "BUILD: Standing intake"
 *
 * Reads NAMES INDEX + BUSINESSES NAMED sections from a published .txt
 * (edition / interview / supplemental / dispatch / interview-transcript)
 * and writes new entities to the canonical engine sheets:
 *   - Simulation_Ledger (citizens) — only entities not already present
 *   - Business_Ledger (businesses) — only entities not already present
 *
 * Existing citizens and businesses are NEVER modified; mismatches are logged
 * for editorial review, not silently overwritten. Citizens stay where they
 * are — Simulation_Ledger is canon.
 *
 * New citizens land with Status=`pending`, Tier=4, ClockMode=ENGINE, and
 * blank demographic columns. The engine fills the missing columns next
 * cycle (a future maintenance script will sweep `Status=pending` rows
 * and complete demographics from canon sources). New businesses land with
 * cols A–D filled, E–I blank.
 *
 * Closes the /post-publish Step 5 "NOT WIRED" gap.
 *
 * Usage:
 *   node scripts/ingestPublishedEntities.js editions/cycle_pulse_edition_92.txt --dry-run
 *   node scripts/ingestPublishedEntities.js editions/cycle_pulse_interview_92_santana.txt --type interview --cycle 92 --apply
 *
 * Flags:
 *   --type {edition|interview|supplemental|dispatch|interview-transcript}
 *           Default: edition. Used for output filename + JSON metadata.
 *   --cycle N
 *           Required when --type ≠ edition; for edition, derived from filename.
 *   --dry-run / --apply
 *           Default is --dry-run. --apply writes to the live sheets.
 *
 * Format handling:
 *   NAMES INDEX accepts two row shapes:
 *     T1 strict:    `- POP-00789 | Elias Varek | Founder, Civis Systems`
 *     pre-T1 free:  `- Elias Varek — Founder, Civis Systems`   (em-dash or hyphen)
 *   BUSINESSES NAMED — strict only:
 *     `- BIZ-00042 | Anchor Build | Construction | Brooklyn`
 *     `- NEW | Atlas Bay Architects | Architecture | Downtown`
 *
 * Output: output/intake_published_entities_c<cycle>_<slug>.json
 *
 * Requires: GOOGLE_APPLICATION_CREDENTIALS pointing at the service account.
 */

require('/root/GodWorld/lib/env');
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

const ALLOWED_TYPES = ['edition', 'interview', 'supplemental', 'dispatch', 'interview-transcript'];

// New-citizen defaults (col → value). Cols absent from this map ship blank.
const NEW_CITIZEN_DEFAULTS = {
  'UNI (y/n)': 'no',
  'MED (y/n)': 'no',
  'CIV (y/n)': 'no',
  'ClockMode': 'ENGINE',
  'Tier': '4',
  'Status': 'pending',
};

// ---------------------------------------------------------------------------
// CLI flag parsing — mirrors T6/T7/T9 pattern
// ---------------------------------------------------------------------------
function parseFlag(name) {
  const i = process.argv.indexOf('--' + name);
  if (i === -1 || i === process.argv.length - 1) return null;
  return process.argv[i + 1];
}

function parseType() {
  const raw = parseFlag('type');
  if (!raw) return 'edition';
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

function deriveSlug(filePath, type, cycle) {
  const base = path.basename(filePath, '.txt');
  if (type === 'edition') return 'e' + cycle;
  // cycle_pulse_interview_92_santana → interview_c92_santana
  const m = base.match(new RegExp('^cycle_pulse_' + type + '_\\d+_(.+)$'));
  if (m) return type + '_c' + cycle + '_' + m[1];
  return type + '_c' + cycle;
}

// ---------------------------------------------------------------------------
// Section finder (reuses pattern from ingestEditionWiki.js)
// ---------------------------------------------------------------------------
function findSection(lines, header, endPatterns) {
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (t === header || t.indexOf(header) === 0) {
      start = i + 1;
      while (start < lines.length && /^[=\-─━]+$/.test(lines[start].trim())) start++;
      break;
    }
  }
  if (start < 0) return null;

  let end = lines.length;
  for (let j = start; j < lines.length; j++) {
    for (let ep = 0; ep < endPatterns.length; ep++) {
      if (lines[j].trim().indexOf(endPatterns[ep]) === 0) {
        end = j;
        break;
      }
    }
    if (end !== lines.length) break;
  }
  return lines.slice(start, end);
}

// ---------------------------------------------------------------------------
// NAMES INDEX parser — handles T1 strict + pre-T1 freeform
// ---------------------------------------------------------------------------
function parseNamesIndex(sectionLines) {
  const out = [];
  if (!sectionLines) return out;

  for (const raw of sectionLines) {
    const line = raw.trim();
    if (!line || line[0] !== '-') continue;
    const stripped = line.replace(/^-\s*/, '');

    // T1 strict: `POP-NNNNN | Name | Role`
    if (/^POP-\d+\s*\|/.test(stripped)) {
      const parts = stripped.split('|').map(p => p.trim());
      out.push({
        popId: parts[0] || null,
        fullName: parts[1] || '',
        description: parts[2] || '',
        format: 'strict',
      });
      continue;
    }

    // Pre-T1 freeform: `Name — Description` or `Name - Description`
    const sep = stripped.match(/\s+[—–-]\s+/);
    if (sep) {
      const idx = stripped.indexOf(sep[0]);
      const fullName = stripped.slice(0, idx).trim();
      const description = stripped.slice(idx + sep[0].length).trim();
      if (fullName) {
        out.push({ popId: null, fullName, description, format: 'freeform' });
        continue;
      }
    }

    // Bare name with no description
    if (stripped) {
      out.push({ popId: null, fullName: stripped, description: '', format: 'bare' });
    }
  }

  return out;
}

// ---------------------------------------------------------------------------
// BUSINESSES NAMED parser — strict only (T1 contract)
// ---------------------------------------------------------------------------
function parseBusinessesNamed(sectionLines) {
  const out = [];
  if (!sectionLines) return out;

  for (const raw of sectionLines) {
    const line = raw.trim();
    if (!line || line[0] !== '-') continue;
    const stripped = line.replace(/^-\s*/, '');
    if (stripped.indexOf('|') < 0) continue;

    const parts = stripped.split('|').map(p => p.trim());
    out.push({
      bizId: parts[0] || '',
      name: parts[1] || '',
      sector: parts[2] || '',
      neighborhood: parts[3] || '',
    });
  }

  return out;
}

// ---------------------------------------------------------------------------
// Cycle resolution from filename (edition only)
// ---------------------------------------------------------------------------
function extractCycleFromFilename(filename) {
  const m = filename.match(/edition[_-](\d+)/i);
  return m ? parseInt(m[1], 10) : null;
}

// ---------------------------------------------------------------------------
// Sheet auth helper
// ---------------------------------------------------------------------------
function getSheets(scopes) {
  const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    scopes: scopes || ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return google.sheets({ version: 'v4', auth });
}

// ---------------------------------------------------------------------------
// Resolve citizens against Simulation_Ledger
// ---------------------------------------------------------------------------
async function resolveCitizens(parsed, sheetsClient, sheetId) {
  const res = await sheetsClient.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: 'Simulation_Ledger!A1:AU',
  });
  const rows = res.data.values || [];
  const headers = rows[0] || [];
  const data = rows.slice(1);

  const popIdIdx = 0;  // POPID col A
  const firstIdx = headers.indexOf('First');
  const lastIdx = headers.indexOf('Last');

  // Build lookup tables
  const byPopId = new Map();
  const byFirstLast = new Map();
  let maxPopNum = 0;

  for (const row of data) {
    const pop = (row[popIdIdx] || '').trim();
    const first = (row[firstIdx] || '').trim();
    const last = (row[lastIdx] || '').trim();
    if (pop) {
      byPopId.set(pop, { row, first, last });
      const m = pop.match(/^POP-(\d+)$/);
      if (m) {
        const n = parseInt(m[1], 10);
        if (n > maxPopNum) maxPopNum = n;
      }
    }
    if (first && last) {
      const key = (first + ' ' + last).toLowerCase();
      if (byFirstLast.has(key)) {
        byFirstLast.get(key).push({ pop, row });
      } else {
        byFirstLast.set(key, [{ pop, row }]);
      }
    }
  }

  const matched = [];
  const phantom = [];
  const ambiguous = [];
  const candidates = [];

  for (const entry of parsed) {
    if (entry.popId) {
      const hit = byPopId.get(entry.popId);
      if (!hit) {
        phantom.push({ popId: entry.popId, fullName: entry.fullName, reason: 'POP-ID not in ledger' });
        continue;
      }
      // Verify name match (warn on drift; do not overwrite)
      const ledgerName = (hit.first + ' ' + hit.last).trim();
      const driftWarning = ledgerName.toLowerCase() !== entry.fullName.toLowerCase()
        ? `name drift: ledger "${ledgerName}" vs index "${entry.fullName}"`
        : null;
      matched.push({ popId: entry.popId, fullName: entry.fullName, driftWarning });
    } else {
      // Lookup by First+Last
      const tokens = entry.fullName.split(/\s+/).filter(Boolean);
      if (tokens.length < 2) {
        ambiguous.push({ fullName: entry.fullName, reason: 'single-token name; cannot match' });
        continue;
      }
      const first = tokens[0];
      const last = tokens[tokens.length - 1];
      const key = (first + ' ' + last).toLowerCase();
      const hits = byFirstLast.get(key);
      if (!hits || hits.length === 0) {
        // Candidate for new append
        candidates.push({ fullName: entry.fullName, first, last, middle: tokens.length > 2 ? tokens.slice(1, -1).join(' ') : '', description: entry.description });
      } else if (hits.length === 1) {
        matched.push({ popId: hits[0].pop, fullName: entry.fullName, resolved: true });
      } else {
        ambiguous.push({ fullName: entry.fullName, reason: hits.length + ' citizens share this name', popIds: hits.map(h => h.pop) });
      }
    }
  }

  return { headers, matched, phantom, ambiguous, candidates, maxPopNum };
}

// ---------------------------------------------------------------------------
// Resolve businesses against Business_Ledger
// ---------------------------------------------------------------------------
async function resolveBusinesses(parsed, sheetsClient, sheetId) {
  const res = await sheetsClient.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: 'Business_Ledger!A1:I',
  });
  const rows = res.data.values || [];
  const data = rows.slice(1);

  const byBizId = new Map();
  const byName = new Map();
  let maxBizNum = 0;

  for (const row of data) {
    const id = (row[0] || '').trim();
    const name = (row[1] || '').trim();
    if (id) {
      byBizId.set(id, { row, name });
      const m = id.match(/^BIZ-(\d+)$/);
      if (m) {
        const n = parseInt(m[1], 10);
        if (n > maxBizNum) maxBizNum = n;
      }
    }
    if (name) byName.set(name.toLowerCase(), { id, row });
  }

  const matched = [];
  const candidates = [];
  const mismatches = [];

  for (const entry of parsed) {
    const id = entry.bizId;
    if (id && id !== 'NEW' && id.match(/^BIZ-\d+$/)) {
      const hit = byBizId.get(id);
      if (!hit) {
        mismatches.push({ bizId: id, name: entry.name, reason: 'BIZ-ID not in ledger' });
        continue;
      }
      const driftWarning = hit.name.toLowerCase() !== entry.name.toLowerCase()
        ? `name drift: ledger "${hit.name}" vs index "${entry.name}"`
        : null;
      matched.push({ bizId: id, name: entry.name, driftWarning });
    } else {
      // NEW or unrecognized — check by name first
      const nameHit = byName.get(entry.name.toLowerCase());
      if (nameHit) {
        matched.push({ bizId: nameHit.id, name: entry.name, resolvedByName: true });
      } else {
        candidates.push({ name: entry.name, sector: entry.sector, neighborhood: entry.neighborhood });
      }
    }
  }

  return { matched, candidates, mismatches, maxBizNum };
}

// ---------------------------------------------------------------------------
// Append rows + verify
// ---------------------------------------------------------------------------
async function appendCitizens(candidates, headers, maxPopNum, sheetsClient, sheetId) {
  if (candidates.length === 0) return [];

  const now = new Date().toISOString();
  const rowsToAppend = [];
  const popIds = [];

  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i];
    const popNum = maxPopNum + 1 + i;
    const popId = 'POP-' + String(popNum).padStart(5, '0');
    popIds.push(popId);

    // Build row aligned with headers
    const row = headers.map(h => {
      if (h === 'POPID') return popId;
      if (h === 'First') return c.first;
      if (h === 'Middle') return c.middle || '';
      if (h === 'Last') return c.last;
      if (h === 'CreatedAt') return now;
      if (h === 'Last Updated') return now;
      if (NEW_CITIZEN_DEFAULTS[h] !== undefined) return NEW_CITIZEN_DEFAULTS[h];
      return '';
    });
    rowsToAppend.push(row);
  }

  await sheetsClient.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: 'Simulation_Ledger!A1',
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: rowsToAppend },
  });

  // Verify by readback
  const verifyRes = await sheetsClient.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: 'Simulation_Ledger!A1:D',
  });
  const allRows = verifyRes.data.values || [];
  const lastRows = allRows.slice(-candidates.length);
  const verified = [];
  for (let i = 0; i < candidates.length; i++) {
    const row = lastRows[i] || [];
    verified.push({
      popId: row[0] || '',
      first: row[1] || '',
      last: row[3] || '',
      expected: popIds[i],
      ok: row[0] === popIds[i],
    });
  }
  return verified;
}

async function appendBusinesses(candidates, maxBizNum, sheetsClient, sheetId) {
  if (candidates.length === 0) return [];

  const rowsToAppend = [];
  const bizIds = [];

  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i];
    const bizNum = maxBizNum + 1 + i;
    const bizId = 'BIZ-' + String(bizNum).padStart(5, '0');
    bizIds.push(bizId);
    // Cols A-I: BIZ_ID, Name, Sector, Neighborhood, Employee_Count, Avg_Salary, Annual_Revenue, Growth_Rate, Key_Personnel
    rowsToAppend.push([bizId, c.name, c.sector, c.neighborhood, '', '', '', '', '']);
  }

  await sheetsClient.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: 'Business_Ledger!A1',
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: rowsToAppend },
  });

  const verifyRes = await sheetsClient.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: 'Business_Ledger!A1:D',
  });
  const allRows = verifyRes.data.values || [];
  const lastRows = allRows.slice(-candidates.length);
  const verified = [];
  for (let i = 0; i < candidates.length; i++) {
    const row = lastRows[i] || [];
    verified.push({
      bizId: row[0] || '',
      name: row[1] || '',
      expected: bizIds[i],
      ok: row[0] === bizIds[i],
    });
  }
  return verified;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const dryRun = !apply;
  const type = parseType();
  const cycleFlag = parseCycleFlag();

  // First positional that isn't a flag value (skip --type/--cycle's value)
  let sourcePath = null;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith('--')) continue;
    const prev = args[i - 1];
    if (prev === '--type' || prev === '--cycle') continue;
    sourcePath = a;
    break;
  }

  if (!sourcePath) {
    console.log('Usage: node scripts/ingestPublishedEntities.js <source.txt> [--type <type>] [--cycle N] [--dry-run|--apply]');
    process.exit(1);
  }

  const fullPath = path.resolve(sourcePath);
  if (!fs.existsSync(fullPath)) {
    console.error('[ERROR] File not found: ' + fullPath);
    process.exit(1);
  }

  // Cycle resolution
  let cycle = cycleFlag;
  if (cycle === null) {
    if (type === 'edition') cycle = extractCycleFromFilename(path.basename(fullPath));
    if (cycle === null) {
      console.error('[ERROR] --cycle is required for --type ' + type + ' (no fallback extraction).');
      process.exit(1);
    }
  }

  const slug = deriveSlug(fullPath, type, cycle);
  const sheetId = process.env.GODWORLD_SHEET_ID;
  if (!sheetId) {
    console.error('[ERROR] GODWORLD_SHEET_ID not set in env');
    process.exit(1);
  }

  console.log('=== ingestPublishedEntities ===');
  console.log('[METADATA] ' + JSON.stringify({
    type,
    cycle,
    slug,
    source: path.basename(fullPath),
    mode: dryRun ? 'DRY-RUN' : 'APPLY',
  }, null, 2));
  console.log('---');

  // Parse
  const text = fs.readFileSync(fullPath, 'utf8');
  const lines = text.split('\n');
  const namesSection = findSection(lines, 'NAMES INDEX', ['CITIZEN USAGE LOG', 'BUSINESSES NAMED', 'ARTICLE TABLE', 'STORYLINES UPDATED', 'CONTINUITY NOTES', 'COMING NEXT', 'END EDITION', '---']);
  const bizSection = findSection(lines, 'BUSINESSES NAMED', ['ARTICLE TABLE', 'STORYLINES UPDATED', 'CONTINUITY NOTES', 'COMING NEXT', 'END EDITION', '---']);

  const parsedCitizens = parseNamesIndex(namesSection);
  const parsedBusinesses = parseBusinessesNamed(bizSection);

  console.log(`Parsed: ${parsedCitizens.length} citizen rows, ${parsedBusinesses.length} business rows`);
  if (!namesSection) console.log('  (no NAMES INDEX section in source)');
  if (!bizSection) console.log('  (no BUSINESSES NAMED section in source)');
  console.log('');

  if (parsedCitizens.length === 0 && parsedBusinesses.length === 0) {
    console.log('0 entities — pure-atmosphere artifact. Nothing to ingest.');
    process.exit(0);
  }

  // Resolve
  const sheetsClient = getSheets();
  const citizenResolution = await resolveCitizens(parsedCitizens, sheetsClient, sheetId);
  const bizResolution = await resolveBusinesses(parsedBusinesses, sheetsClient, sheetId);

  console.log('CITIZENS:');
  console.log('  matched:    ' + citizenResolution.matched.length);
  console.log('  candidates: ' + citizenResolution.candidates.length + ' (new — would append)');
  console.log('  ambiguous:  ' + citizenResolution.ambiguous.length);
  console.log('  phantom:    ' + citizenResolution.phantom.length);
  console.log('  next POPID: POP-' + String(citizenResolution.maxPopNum + 1).padStart(5, '0'));
  console.log('');
  console.log('BUSINESSES:');
  console.log('  matched:    ' + bizResolution.matched.length);
  console.log('  candidates: ' + bizResolution.candidates.length + ' (new — would append)');
  console.log('  mismatches: ' + bizResolution.mismatches.length);
  console.log('  next BIZ-ID: BIZ-' + String(bizResolution.maxBizNum + 1).padStart(5, '0'));
  console.log('');

  // Detail dump (helpful for dry-run inspection)
  if (citizenResolution.candidates.length > 0) {
    console.log('Citizen candidates (would append):');
    citizenResolution.candidates.forEach((c, i) => {
      const popNum = citizenResolution.maxPopNum + 1 + i;
      console.log('  ' + 'POP-' + String(popNum).padStart(5, '0') + '  ' + c.first + ' ' + c.last + (c.description ? ' — ' + c.description.slice(0, 60) : ''));
    });
    console.log('');
  }
  if (bizResolution.candidates.length > 0) {
    console.log('Business candidates (would append):');
    bizResolution.candidates.forEach((b, i) => {
      const bizNum = bizResolution.maxBizNum + 1 + i;
      console.log('  ' + 'BIZ-' + String(bizNum).padStart(5, '0') + '  ' + b.name + (b.sector ? ' (' + b.sector + ')' : '') + (b.neighborhood ? ' — ' + b.neighborhood : ''));
    });
    console.log('');
  }
  if (citizenResolution.ambiguous.length > 0) {
    console.log('Ambiguous citizens (skipped — editorial review):');
    citizenResolution.ambiguous.forEach(a => console.log('  ' + a.fullName + ' — ' + a.reason));
    console.log('');
  }
  if (citizenResolution.phantom.length > 0) {
    console.log('Phantom POP-IDs (in source but not in ledger):');
    citizenResolution.phantom.forEach(p => console.log('  ' + p.popId + '  ' + p.fullName + ' — ' + p.reason));
    console.log('');
  }

  // Write phase
  let citizenAppended = [];
  let businessAppended = [];
  if (apply) {
    console.log('--apply: writing to live sheets');
    citizenAppended = await appendCitizens(citizenResolution.candidates, citizenResolution.headers, citizenResolution.maxPopNum, sheetsClient, sheetId);
    businessAppended = await appendBusinesses(bizResolution.candidates, bizResolution.maxBizNum, sheetsClient, sheetId);

    const allOk = citizenAppended.every(r => r.ok) && businessAppended.every(r => r.ok);
    console.log('  citizen rows verified: ' + citizenAppended.filter(r => r.ok).length + '/' + citizenAppended.length);
    console.log('  business rows verified: ' + businessAppended.filter(r => r.ok).length + '/' + businessAppended.length);
    if (!allOk) {
      console.error('[WARN] Some appended rows did not verify on read-back. Inspect output JSON.');
    }
  } else {
    console.log('Mode: DRY-RUN — no writes performed. Run with --apply to write.');
  }

  // Write JSON output
  const outPath = path.join(__dirname, '..', 'output', 'intake_published_entities_c' + cycle + '_' + slug + '.json');
  const outDir = path.dirname(outPath);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const report = {
    timestamp: new Date().toISOString(),
    source: path.basename(fullPath),
    type,
    cycle,
    slug,
    mode: dryRun ? 'dry-run' : 'apply',
    citizens: {
      parsed: parsedCitizens.length,
      matched: citizenResolution.matched,
      candidates: citizenResolution.candidates.map((c, i) => ({
        ...c,
        proposedPopId: 'POP-' + String(citizenResolution.maxPopNum + 1 + i).padStart(5, '0'),
      })),
      ambiguous: citizenResolution.ambiguous,
      phantom: citizenResolution.phantom,
      appended: citizenAppended,
    },
    businesses: {
      parsed: parsedBusinesses.length,
      matched: bizResolution.matched,
      candidates: bizResolution.candidates.map((b, i) => ({
        ...b,
        proposedBizId: 'BIZ-' + String(bizResolution.maxBizNum + 1 + i).padStart(5, '0'),
      })),
      mismatches: bizResolution.mismatches,
      appended: businessAppended,
    },
  };
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log('');
  console.log('Report written: ' + outPath);
}

main().catch(err => {
  console.error('[FATAL]', err);
  process.exit(1);
});
