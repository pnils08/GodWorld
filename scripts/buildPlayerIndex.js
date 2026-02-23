#!/usr/bin/env node
/**
 * buildPlayerIndex.js — Player Profile Index Builder
 *
 * Reads player data files from archive/non-articles/data/, classifies and
 * parses each file type, merges multi-file players by normalized name, and
 * writes a master player index JSON.
 *
 * File types parsed:
 *   1. A's TrueSource DataPage — bio + season stats + attributes
 *   2. A's Statcast Player Card — narrative scouting + analysis
 *   3. POP-ID DataPage — canonical POPID link + identity metadata
 *   4. Bulls TrueSource Profile — basketball attribute ratings
 *
 * Usage:
 *   node scripts/buildPlayerIndex.js              # dry-run (default)
 *   node scripts/buildPlayerIndex.js --write       # write output/player-index.json
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from 'fs';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const writeMode = process.argv.includes('--write');

// ---------------------------------------------------------------------------
// File discovery
// ---------------------------------------------------------------------------

function findFiles(dir, extensions = ['.txt'], results = []) {
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
// Name normalization for merge
// ---------------------------------------------------------------------------

// Known name aliases (typos/variants in source data that should merge)
const NAME_ALIASES = {
  'vinnie keene': 'vinnie keane',
};

// Canonical display names for aliased players
const CANONICAL_NAMES = {
  'vinnie keane': 'Vinnie Keane',
};

function normalizeName(name) {
  let norm = name
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')  // strip accents
    .replace(/[^a-z\s]/g, '')                           // strip non-alpha
    .replace(/\s+/g, ' ')
    .trim();
  return NAME_ALIASES[norm] || norm;
}

// ---------------------------------------------------------------------------
// File classification
// ---------------------------------------------------------------------------

// Files to skip entirely — not player data
const SKIP_PATTERNS = [
  /^(anonymous|Copy of|Orgin_Core|TrueSource Team Timeline|TrueSource Transaction|TRUESOURCE_CONTRACT|TRUESOURCE_TEAM|2040_Coaching|2040_Starting|Franchise_Era|Wedding_Chronicle|Mike_Paulson)/i,
  /IMAGE_MANIFEST/i,
  /PHOTO_RECORD/i,
  /Prospect Profile/i,
  /EVENT_RECORD/i,
  /_background\.txt$/i,
];

function classifyFile(fileName) {
  // Skip non-player files
  for (const pat of SKIP_PATTERNS) {
    if (pat.test(fileName)) return 'skip';
  }

  // Bulls TrueSource Profile
  if (/TrueSource_Profile_v1\.0\.txt$/i.test(fileName)) return 'bulls-profile';

  // POP-ID DataPage
  if (/^POP-?\d+.*DataPage/i.test(fileName) || /^POPID_\d+.*DataPage/i.test(fileName)) return 'pop-datapage';

  // POP record files (2040 record) — these are actually full player data files
  if (/^POP_\d+.*_2040_RECORD/i.test(fileName)) return 'as-datapage';

  // A's Statcast Player Card
  if (/STATCAST PLAYER CARD/i.test(fileName) || /^Savant_/i.test(fileName)) return 'statcast-card';

  // A's TrueSource DataPage / Data Card / True Source
  if (/TrueSource DataPage|TrueSource_DataPage|Data Card|True Source v1\.0|TrueSource v1\.0|TrueSource Profile v1\.0\.txt$/i.test(fileName)
      && !/TrueSource_Profile_v1\.0\.txt$/i.test(fileName)) return 'as-datapage';

  // Catch remaining DataPage files
  if (/DataPage v1\.0/i.test(fileName)) return 'as-datapage';

  return 'skip';
}

// ---------------------------------------------------------------------------
// Parser: A's TrueSource DataPage / Data Card / True Source
// ---------------------------------------------------------------------------

function parseAsDataPage(text, fileName) {
  const lines = text.split('\n');
  const player = { sport: 'baseball', team: 'Oakland Athletics', sourceFiles: [fileName] };

  // Extract name from first line (various formats)
  const firstLine = lines[0] || '';
  // "Benji Dillon TrueSource DataPage v1.0 — Benji Dillon"
  // "MARK AITKEN Data Card v1.0 — 1B (First Base)"
  // "Kevin Clark — TrueSource DataPage v1.0"
  // "ISLEY KELLEY True Source v1.0 — SS / 2B / 3B"
  // "John Ellis DataPage v1.0"
  // "VINNIE KEENE — 3B / 2B / SS" (from POP record files)
  let nameMatch = firstLine.match(/^(.+?)(?:\s+(?:TrueSource|True Source|Data Card|DataPage))/i);
  if (!nameMatch) {
    // "VINNIE KEENE — 3B / 2B / SS" format
    nameMatch = firstLine.match(/^([A-Z][A-Za-z.']+(?:\s+[A-Za-z.']+){1,3})\s+[—-]\s*(?:[A-Z]{1,2})/);
  }
  if (nameMatch) {
    player.name = nameMatch[1].replace(/[_]/g, ' ').replace(/\s+/g, ' ').trim();
    // Title-case the name if it's all caps
    if (player.name === player.name.toUpperCase()) {
      player.name = player.name.replace(/\b\w+/g, w => w[0] + w.slice(1).toLowerCase());
    }
  }
  // Try extracting name from filename: "POP_00001_VINNIE_KEANE_2040_RECORD.txt"
  if (!player.name) {
    const fnPop = fileName.match(/POP_?\d+_(.+?)_(?:2040_RECORD|DataPage)/i);
    if (fnPop) {
      player.name = fnPop[1].replace(/_/g, ' ').trim();
      if (player.name === player.name.toUpperCase()) {
        player.name = player.name.replace(/\b\w+/g, w => w[0] + w.slice(1).toLowerCase());
      }
    }
  }

  // Position from first line or body
  const posMatch = firstLine.match(/[—-]\s*([A-Z0-9]{1,2}(?:\s*\/\s*[A-Z0-9]{1,2})*)\s*(?:\(|$)/);
  if (posMatch) player.position = posMatch[1].replace(/\s/g, '');
  if (!player.position) {
    const bodyPosMatch = text.match(/(?:^|\n)(?:Position|PRIMARY POSITION):\s*(.+)/i);
    if (bodyPosMatch) player.position = bodyPosMatch[1].replace(/\s*\(.+\)/, '').trim();
  }

  // Bio fields
  const ageMatch = text.match(/Age[:\s]+(\d+)/i);
  if (ageMatch) player.bio = { ...player.bio, age: parseInt(ageMatch[1]) };

  const htWtMatch = text.match(/Height\s*\/?\s*Weight[:\s]*(\d+[''′]?\d*(?:\s*(?:ft|in))?"?\s*\/?\s*\d+(?:\s*lbs?)?)/i)
    || text.match(/(\d+[''′]\d+"?\s*\/\s*\d+\s*lbs)/i);
  if (htWtMatch) {
    const raw = htWtMatch[1];
    const hMatch = raw.match(/(\d+[''′]\d+"?|(?:\d+\s*ft\s*\d+\s*in))/);
    const wMatch = raw.match(/(\d+)\s*lbs?/i);
    player.bio = {
      ...player.bio,
      height: hMatch ? hMatch[1].replace(/[′']/g, "'").replace(/"/g, '"') : null,
      weight: wMatch ? parseInt(wMatch[1]) : null,
    };
  }

  const btMatch = text.match(/(?:B\/T|Bats\/Throws)[:\s]+(\w+)\s*\/\s*(\w+)/i);
  if (btMatch) player.bio = { ...player.bio, batsThrows: `${btMatch[1]}/${btMatch[2]}` };

  const bornMatch = text.match(/(?:Born|Born:)\s+(.+)/i) || text.match(/(?:Oakland Athletics|ATH)\s*\|\s*(.+?)\s*\|/i);
  if (bornMatch) player.bio = { ...player.bio, born: bornMatch[1].trim() };

  // Affiliation (might not be Oakland)
  const affilMatch = text.match(/Affiliation:\s*(.+)/i);
  if (affilMatch) player.team = affilMatch[1].trim();

  // Overall + Potential
  const ovrMatch = text.match(/Overall[:\s]+(\d+)/i) || text.match(/OVR[:\s]+(\d+)/i);
  if (ovrMatch) player.overall = parseInt(ovrMatch[1]);
  const potMatch = text.match(/Potential[:\s]+([A-D])/i);
  if (potMatch) player.potential = potMatch[1];

  // Service time
  const svcMatch = text.match(/(?:MLB )?Service Time[:\s]+([\d.]+)/i);
  if (svcMatch) player.bio = { ...player.bio, serviceTime: svcMatch[1] };

  // Draft
  const draftMatch = text.match(/Draft(?:ed)?[:\s]+(?:Round\s+)?(\d+)(?:,?\s*(\d{4}))?/i);
  if (draftMatch) {
    player.bio = { ...player.bio, draftRound: parseInt(draftMatch[1]) };
    if (draftMatch[2]) player.bio.draftYear = parseInt(draftMatch[2]);
  }

  // Hitter tendency
  const tendMatch = text.match(/Hitter Tendency[:\s]+(.+)/i);
  if (tendMatch) player.bio = { ...player.bio, hitterTendency: tendMatch[1].trim() };

  // Pitch Repertoire (pitchers)
  const pitchMatch = text.match(/Pitch Repertoire:\s*(.+)/i);
  if (pitchMatch) {
    const pitchStr = pitchMatch[1];
    player.pitchArsenal = pitchStr.split(/,\s*/).map(p => {
      const m = p.match(/(.+?)\s*\((\d+)\s*mph\)/);
      return m ? { name: m[1].trim(), speed: parseInt(m[2]) } : { name: p.trim(), speed: null };
    });
  }

  // Attributes
  const attrBlock = text.match(/Attributes Summary[:\s]*([\s\S]*?)(?=\n\n|\nAwards|\nContract|\nTemplate|\n---)/i);
  if (attrBlock) {
    const attrText = attrBlock[1];
    const attrs = {};
    const attrPairs = attrText.matchAll(/([A-Z][A-Z_ ]+?)\s+(\d+)/g);
    for (const m of attrPairs) {
      const key = m[1].trim().replace(/\s+/g, '_');
      attrs[key] = parseInt(m[2]);
    }
    if (Object.keys(attrs).length > 0) player.attributes = attrs;
  }

  // Season stats table
  // Detect format from stats header line:
  //   Pitcher header: "Year   G   GS   W   L    IP ..."
  //   Hitter header:  "Year Team G AB R H 2B ..." or "Year  Team  G   AB..."
  // Also: hitter data rows have a 3-letter team code, pitcher rows don't
  const hasHitterHeader = lines.some(l => /Year\s+Team\s+G\s+AB/i.test(l.trim()));
  const hasPitcherHeader = lines.some(l => /Year\s+G\s+GS\s+W\s+L/i.test(l.trim()));
  const isPitcher = hasPitcherHeader && !hasHitterHeader;

  const statsLines = [];
  // Pitcher: "2039   32  32   10  10   167.2..."  (year + numbers)
  // Hitter:  "2039  ATH  148  579  84  165..."    (year + team + numbers)
  for (const line of lines) {
    const trimmed = line.trim();
    if (isPitcher) {
      // Year followed by a number (no team code)
      if (/^\s*20\d{2}\s+\d+\s+\d+/.test(trimmed)) {
        statsLines.push(trimmed);
      }
    } else {
      // Year followed by 3-letter team code
      if (/^\s*20\d{2}\s+[A-Z]{3}\s+\d+/.test(trimmed)) {
        statsLines.push(trimmed);
      }
    }
  }

  if (statsLines.length > 0) {
    player.seasonStats = statsLines.map(line => {
      const vals = line.split(/\s+/);
      if (isPitcher) {
        // Year G GS W L IP H R ER HR BB SO ERA
        return {
          year: parseInt(vals[0]), g: parseInt(vals[1]), gs: parseInt(vals[2]),
          w: parseInt(vals[3]), l: parseInt(vals[4]), ip: vals[5],
          h: parseInt(vals[6]), r: parseInt(vals[7]), er: parseInt(vals[8]),
          hr: parseInt(vals[9]), bb: parseInt(vals[10]), so: parseInt(vals[11]),
          era: parseFloat(vals[12]),
        };
      } else {
        // Year Team G AB R H 2B 3B HR RBI BB SO SB CS AVG OBP SLG
        return {
          year: parseInt(vals[0]), team: vals[1], g: parseInt(vals[2]), ab: parseInt(vals[3]),
          r: parseInt(vals[4]), h: parseInt(vals[5]), doubles: parseInt(vals[6]),
          triples: parseInt(vals[7]), hr: parseInt(vals[8]), rbi: parseInt(vals[9]),
          bb: parseInt(vals[10]), so: parseInt(vals[11]), sb: parseInt(vals[12]),
          cs: parseInt(vals[13]), avg: vals[14], obp: vals[15], slg: vals[16],
        };
      }
    });
  }

  // Career totals
  const careerMatch = text.match(/Career(?:\s+(?:Totals|ATH|-))?\s*[:\s]*([\d,.|/ ]+(?:ERA|SLG)?.*)/i);
  if (careerMatch) {
    player.careerTotals = careerMatch[1].replace(/,/g, '').trim();
  }

  // Awards
  const awardsSection = text.match(/Awards(?:\s*&\s*Honors)?[:\s]*([\s\S]*?)(?=\nContract|\nTemplate|\n\n\n|$)/i);
  if (awardsSection) {
    const awardLines = awardsSection[1].split('\n').filter(l => l.trim() && !l.startsWith('---'));
    player.awards = awardLines.map(l => l.trim()).filter(l => l.length > 0);
  }

  // Contract
  const contractMatch = text.match(/Contract(?:\s+Information|\s+Details)?[:\s]*([\s\S]*?)(?=\nRoster|\nAttributes|\nTemplate|\n\n\n|\n---|$)/i);
  if (contractMatch) {
    player.contract = contractMatch[1].split('\n').filter(l => l.trim()).map(l => l.trim()).join('; ');
  }

  // Legacy reference / POPID
  const popMatch = text.match(/Current POPID:\s*(POP-\d+)/i);
  if (popMatch) player.popId = popMatch[1];
  const prevPopMatch = text.match(/Previous POPID:\s*(POP-\d+)/i);
  if (prevPopMatch) player.legacyPopId = prevPopMatch[1];

  return player;
}

// ---------------------------------------------------------------------------
// Parser: A's Statcast Player Card
// ---------------------------------------------------------------------------

function parseStatcastCard(text, fileName) {
  const player = { sport: 'baseball', sourceFiles: [fileName] };

  // Name from header line 2: "BENJI DILLON — LHP (THE GOLDEN ARM)"
  // Works for both named-filename and generic-filename cards
  const nameMatch = text.match(/(?:STATCAST PLAYER CARD[^\n]*\n)\s*(.+?)(?:\s+[—-])/mi);
  if (nameMatch) {
    player.name = nameMatch[1].trim();
    if (player.name === player.name.toUpperCase()) {
      player.name = player.name.replace(/\b\w+/g, w => w[0] + w.slice(1).toLowerCase());
    }
  }

  // Try to get name from filename: "A_S UNIVERSE STATCAST PLAYER CARD v1.0 BENJI DILLON.txt"
  if (!player.name) {
    const fnMatch = fileName.match(/CARD v1\.0\s+(.+?)\.txt$/i);
    if (fnMatch) {
      player.name = fnMatch[1].trim();
      if (player.name === player.name.toUpperCase()) {
        player.name = player.name.replace(/\b\w+/g, w => w[0] + w.slice(1).toLowerCase());
      }
    }
  }

  // Also try: "Savant_ErnestoQuintero_..."
  if (!player.name) {
    const savantMatch = fileName.match(/^Savant_(.+?)_/i);
    if (savantMatch) {
      player.name = savantMatch[1].replace(/([a-z])([A-Z])/g, '$1 $2').trim();
    }
  }

  // Alias/nickname from the header line
  const aliasMatch = text.match(/\(([^)]+)\)/);
  if (aliasMatch && !aliasMatch[1].match(/\d/)) {
    player.alias = aliasMatch[1].trim();
  }

  // Archetype
  const archMatch = text.match(/Archetype:\s*(.+)/i);
  if (archMatch) player.archetype = archMatch[1].trim();

  // TrueSource reference
  const tsRefMatch = text.match(/TrueSource Reference:\s*(.+)/i);
  if (tsRefMatch) player.trueSourceRef = tsRefMatch[1].trim();

  // Pitch arsenal (detailed)
  const arsenalSection = text.match(/PITCH ARSENAL[\s\S]*?(?=\n[⸻\n]{2,}|STA?TCAST|REVERSE|$)/i);
  if (arsenalSection) {
    const pitches = [];
    const pitchPattern = /^(.+?)\s+[—-]\s*(\d+)\s*mph/gm;
    let m;
    while ((m = pitchPattern.exec(arsenalSection[0])) !== null) {
      pitches.push({ name: m[1].trim(), speed: parseInt(m[2]) });
    }
    if (pitches.length > 0) player.pitchArsenal = pitches;
  }

  // Sim traits
  const simSection = text.match(/SIM-BASED TRAITS[\s\S]*?(?=\n[⸻\n]{2,}|CAREER ARC|$)/i);
  if (simSection) {
    const traits = {};
    const traitPattern = /(\w+):\s*(\d+)/g;
    let m;
    while ((m = traitPattern.exec(simSection[0])) !== null) {
      traits[m[1].toLowerCase()] = parseInt(m[2]);
    }
    if (Object.keys(traits).length > 0) player.simTraits = traits;
  }

  // Tribune notes
  const notes = {};
  const anthonyMatch = text.match(/NOTES\s*\(ANTHONY[^)]*\)([\s\S]*?)(?=\nNOTES|$)/i);
  if (anthonyMatch) notes.anthony = anthonyMatch[1].trim().split('\n').filter(l => l.trim()).map(l => l.replace(/^[•]\s*/, '').trim());

  const pSlayerMatch = text.match(/NOTES\s*\(P SLAYER[^)]*\)([\s\S]*?)(?=\nNOTES|$)/i);
  if (pSlayerMatch) notes.pSlayer = pSlayerMatch[1].trim().replace(/^[""]|[""]$/g, '').trim();

  const halMatch = text.match(/NOTES\s*\(HAL RICHMOND[^)]*\)([\s\S]*?)(?=\nNOTES|$)/i);
  if (halMatch) notes.hal = halMatch[1].trim().replace(/^[""]|[""]$/g, '').trim();

  if (Object.keys(notes).length > 0) player.tribuneNotes = notes;

  return player;
}

// ---------------------------------------------------------------------------
// Parser: POP-ID DataPage
// ---------------------------------------------------------------------------

function parsePopDataPage(text, fileName) {
  const player = { sourceFiles: [fileName] };

  // POPID
  const popMatch = text.match(/(?:Current )?POPID:\s*(POP-?\d+)/i);
  if (popMatch) player.popId = popMatch[1].replace(/^POP(\d)/, 'POP-$1');

  // Name
  const nameMatch = text.match(/Name:\s*(.+)/i);
  if (nameMatch) player.name = nameMatch[1].trim();

  // Alias
  const aliasMatch = text.match(/Alias:\s*[""]?(.+?)[""]?\s*$/mi);
  if (aliasMatch) player.alias = aliasMatch[1].trim();

  // Tier
  const tierMatch = text.match(/Tier:\s*(\d)/i);
  if (tierMatch) player.tier = parseInt(tierMatch[1]);
  // Handle "Tier: 1 – Legend Core" format
  if (!player.tier) {
    const tierAlt = text.match(/Tier:\s*(\d)\s*[–-]/i);
    if (tierAlt) player.tier = parseInt(tierAlt[1]);
  }

  // Role type
  const roleMatch = text.match(/Role(?:\s*Type)?:\s*(.+)/i);
  if (roleMatch) player.roleType = roleMatch[1].trim();

  // Position (check both "Position:" and "Role:" fields)
  const posMatchPop = text.match(/Position:\s*(.+)/i);
  if (posMatchPop) player.position = posMatchPop[1].replace(/\s*\(.+\)/, '').trim();
  if (!player.position) {
    const roleAsPosMatch = text.match(/Role:\s*(?:Shortstop|Catcher|Pitcher|First Base|Second Base|Third Base|Left Field|Right Field|Center Field|Outfield|Infield)(?:\s*\(([^)]+)\))?/i);
    if (roleAsPosMatch) player.position = roleAsPosMatch[1] || roleAsPosMatch[0].match(/Role:\s*(\w+)/i)?.[1];
  }

  // Bio from BIOGRAPHICAL DATA section
  const birthYearMatch = text.match(/Birth Year:\s*(\d{4})/i);
  if (birthYearMatch) player.bio = { ...player.bio, birthYear: parseInt(birthYearMatch[1]) };

  const birthplaceMatch = text.match(/Birthplace:\s*(.+)/i);
  if (birthplaceMatch) player.bio = { ...player.bio, born: birthplaceMatch[1].trim() };

  // Overall + Potential from PROFESSIONAL DATA
  const ovrMatch = text.match(/Overall(?:\s+Rating)?:\s*(\d+)/i);
  if (ovrMatch) player.overall = parseInt(ovrMatch[1]);
  const potMatch = text.match(/Potential:\s*([A-D])/i);
  if (potMatch) player.potential = potMatch[1];

  // Team / Franchise
  const teamMatch = text.match(/(?:Team|Franchise):\s*(.+)/i);
  if (teamMatch) {
    const team = teamMatch[1].trim();
    if (/athletics/i.test(team)) player.sport = 'baseball';
    else if (/bulls/i.test(team)) player.sport = 'basketball';
    player.team = team;
  }

  // Awards
  const awardsMatch = text.match(/Notable Awards:\s*(.+)/i);
  if (awardsMatch) player.awards = awardsMatch[1].split(/,\s*/);

  // Legacy reference
  const legacyMatch = text.match(/Previous POPID:\s*(POP-?\d+)/i);
  if (legacyMatch) player.legacyPopId = legacyMatch[1].replace(/^POP(\d)/, 'POP-$1');

  const currentMatch = text.match(/Current POPID:\s*(POP-?\d+)/i);
  if (currentMatch) player.popId = currentMatch[1].replace(/^POP(\d)/, 'POP-$1');

  return player;
}

// ---------------------------------------------------------------------------
// Parser: Bulls TrueSource Profile
// ---------------------------------------------------------------------------

function parseBullsProfile(text, fileName) {
  const player = { sport: 'basketball', team: 'Chicago Bulls', sourceFiles: [fileName] };

  // Name
  const nameMatch = text.match(/PLAYER:\s*(.+)/i);
  if (nameMatch) player.name = nameMatch[1].trim();

  // Jersey
  const jerseyMatch = text.match(/Jersey:\s*(\d+)/i);
  if (jerseyMatch) player.bio = { ...player.bio, jersey: parseInt(jerseyMatch[1]) };

  // Position
  const primaryPosMatch = text.match(/Primary:\s*(\w+)/i);
  const secondaryPosMatch = text.match(/Secondary:\s*(\w+)/i);
  if (primaryPosMatch) {
    player.position = primaryPosMatch[1];
    if (secondaryPosMatch) player.position += `/${secondaryPosMatch[1]}`;
  }

  // Bio
  const ageMatch = text.match(/Age:\s*(\d+)/i);
  if (ageMatch) player.bio = { ...player.bio, age: parseInt(ageMatch[1]) };

  const htMatch = text.match(/Height:\s*(.+)/i);
  if (htMatch) player.bio = { ...player.bio, height: htMatch[1].trim() };

  const wtMatch = text.match(/Weight:\s*(\d+)\s*lbs/i);
  if (wtMatch) player.bio = { ...player.bio, weight: parseInt(wtMatch[1]) };

  const fromMatch = text.match(/From:\s*(.+)/i);
  if (fromMatch) player.bio = { ...player.bio, born: fromMatch[1].trim() };

  const draftMatch = text.match(/Draft Status:\s*(.+)/i);
  if (draftMatch) player.bio = { ...player.bio, draftStatus: draftMatch[1].trim() };

  const yrsProMatch = text.match(/Years Pro:\s*(\d+)/i);
  if (yrsProMatch) player.bio = { ...player.bio, yearsPro: parseInt(yrsProMatch[1]) };

  const personalityMatch = text.match(/Personality:\s*(\w+)/i);
  if (personalityMatch) player.bio = { ...player.bio, personality: personalityMatch[1] };

  // Overall + Potential
  const ovrMatch = text.match(/OVR:\s*(\d+)/i);
  if (ovrMatch) player.overall = parseInt(ovrMatch[1]);
  const potMatch = text.match(/Potential:\s*([A-D])/i);
  if (potMatch) player.potential = potMatch[1];

  // Physical Attributes
  const physical = {};
  const physSection = text.match(/PHYSICAL ATTRIBUTES:\s*([\s\S]*?)(?=\nOFFENSE:|$)/i);
  if (physSection) {
    for (const m of physSection[1].matchAll(/(\w[\w ]+?):\s*(\d+)/g)) {
      physical[camelCase(m[1].trim())] = parseInt(m[2]);
    }
  }

  // Offense
  const offense = {};
  const offSection = text.match(/OFFENSE:\s*([\s\S]*?)(?=\nBALL HANDLING|$)/i);
  if (offSection) {
    for (const m of offSection[1].matchAll(/(\w[\w ]+?):\s*(\d+)/g)) {
      offense[camelCase(m[1].trim())] = parseInt(m[2]);
    }
  }

  // Ball Handling & Passing
  const ballHandling = {};
  const bhSection = text.match(/BALL HANDLING & PASSING:\s*([\s\S]*?)(?=\nDEFENSE|$)/i);
  if (bhSection) {
    for (const m of bhSection[1].matchAll(/(\w[\w ]+?):\s*(\d+)/g)) {
      ballHandling[camelCase(m[1].trim())] = parseInt(m[2]);
    }
  }

  // Defense & Rebounding
  const defense = {};
  const defSection = text.match(/DEFENSE & REBOUNDING:\s*([\s\S]*?)(?=\nNOTES:|END|$)/i);
  if (defSection) {
    for (const m of defSection[1].matchAll(/(\w[\w ]+?):\s*(\d+)/g)) {
      defense[camelCase(m[1].trim())] = parseInt(m[2]);
    }
  }

  // Assemble attributes
  const hasAttrs = [physical, offense, ballHandling, defense].some(o => Object.keys(o).length > 0);
  if (hasAttrs) {
    player.attributes = {};
    if (Object.keys(physical).length) player.attributes.physical = physical;
    if (Object.keys(offense).length) player.attributes.offense = offense;
    if (Object.keys(ballHandling).length) player.attributes.ballHandling = ballHandling;
    if (Object.keys(defense).length) player.attributes.defense = defense;
  }

  // Notes
  const notesSection = text.match(/NOTES:\s*([\s\S]*?)(?=END|$)/i);
  if (notesSection) {
    const noteLines = notesSection[1].split('\n')
      .map(l => l.replace(/^[•]\s*/, '').trim())
      .filter(l => l.length > 0);
    if (noteLines.length > 0) player.notes = noteLines;
  }

  return player;
}

function camelCase(str) {
  return str.split(/\s+/).map((w, i) =>
    i === 0 ? w.toLowerCase() : w[0].toUpperCase() + w.slice(1).toLowerCase()
  ).join('');
}

// ---------------------------------------------------------------------------
// Merge logic
// ---------------------------------------------------------------------------

function mergePlayer(existing, incoming) {
  // Merge sourceFiles
  const files = new Set([...(existing.sourceFiles || []), ...(incoming.sourceFiles || [])]);
  const merged = { ...existing };

  // Incoming values overwrite only if existing is missing
  for (const [key, val] of Object.entries(incoming)) {
    if (val === null || val === undefined) continue;
    if (key === 'sourceFiles') continue;

    if (key === 'bio') {
      merged.bio = { ...(merged.bio || {}), ...(val || {}) };
    } else if (key === 'attributes' && merged.attributes && typeof val === 'object') {
      merged.attributes = { ...(merged.attributes || {}), ...val };
    } else if (key === 'tribuneNotes') {
      merged.tribuneNotes = { ...(merged.tribuneNotes || {}), ...val };
    } else if (key === 'simTraits') {
      merged.simTraits = { ...(merged.simTraits || {}), ...val };
    } else if (key === 'pitchArsenal' && !merged.pitchArsenal) {
      merged.pitchArsenal = val;
    } else if (key === 'awards' && val && (!merged.awards || val.length > merged.awards.length)) {
      merged.awards = val;
    } else if (key === 'seasonStats' && !merged.seasonStats) {
      merged.seasonStats = val;
    } else if (key === 'careerTotals' && !merged.careerTotals) {
      merged.careerTotals = val;
    } else if (merged[key] === undefined || merged[key] === null) {
      merged[key] = val;
    }
  }

  merged.sourceFiles = Array.from(files);
  return merged;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function buildPlayerIndex() {
  console.log('Building player index...\n');

  const dataDir = join(ROOT, 'archive/non-articles/data');
  const files = findFiles(dataDir);
  console.log(`Found ${files.length} files in ${dataDir}\n`);

  // Classify and parse
  const parsed = [];  // { classification, player }
  const skipped = [];

  for (const filePath of files) {
    const fileName = basename(filePath);
    const classification = classifyFile(fileName);

    if (classification === 'skip') {
      skipped.push(fileName);
      continue;
    }

    let text;
    try {
      text = readFileSync(filePath, 'utf-8');
    } catch {
      console.warn(`  Skip (unreadable): ${fileName}`);
      continue;
    }

    if (!text || text.trim().length < 20) {
      skipped.push(fileName);
      continue;
    }

    let player;
    try {
      switch (classification) {
        case 'as-datapage':
          player = parseAsDataPage(text, fileName);
          break;
        case 'statcast-card':
          player = parseStatcastCard(text, fileName);
          break;
        case 'pop-datapage':
          player = parsePopDataPage(text, fileName);
          break;
        case 'bulls-profile':
          player = parseBullsProfile(text, fileName);
          break;
      }
    } catch (e) {
      console.warn(`  Parse error (${classification}): ${fileName} — ${e.message}`);
      continue;
    }

    if (player && player.name) {
      parsed.push({ classification, player });
    } else {
      console.warn(`  No name extracted: ${fileName} (${classification})`);
      skipped.push(fileName);
    }
  }

  // Merge players by normalized name
  const playerMap = new Map();  // normalizedName -> merged player

  for (const { player } of parsed) {
    const key = normalizeName(player.name);
    if (playerMap.has(key)) {
      playerMap.set(key, mergePlayer(playerMap.get(key), player));
    } else {
      playerMap.set(key, { ...player });
    }
  }

  // Build final array
  const players = Array.from(playerMap.values());

  // Post-process: clean up names and positions
  for (const p of players) {
    // Strip trailing em dashes, hyphens, underscores from names
    if (p.name) {
      p.name = p.name.replace(/\s*[—\-_]+\s*$/, '').trim();
      // Apply canonical name overrides
      const canonical = CANONICAL_NAMES[normalizeName(p.name)];
      if (canonical) p.name = canonical;
    }
    // Clean position: remove "Secondary Position:" text
    if (p.position) {
      p.position = p.position
        .replace(/\s*[|;]\s*Secondary Positions?:.*$/i, '')
        .replace(/\s*\(.*?\)\s*/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }
  }

  // Ensure sport is set
  for (const p of players) {
    if (!p.sport) {
      if (/athletics|ATH/i.test(p.team || '')) p.sport = 'baseball';
      else if (/bulls/i.test(p.team || '')) p.sport = 'basketball';
      else p.sport = 'baseball';  // default for Oakland universe
    }
  }

  // Sort: tier 1 first, then by name
  players.sort((a, b) => {
    const ta = a.tier || 99;
    const tb = b.tier || 99;
    if (ta !== tb) return ta - tb;
    return (a.name || '').localeCompare(b.name || '');
  });

  // Stats
  const stats = {
    total: players.length,
    baseball: players.filter(p => p.sport === 'baseball').length,
    basketball: players.filter(p => p.sport === 'basketball').length,
    withPopId: players.filter(p => p.popId).length,
    withStats: players.filter(p => p.seasonStats?.length > 0).length,
    withAttributes: players.filter(p => p.attributes).length,
    withStatcast: players.filter(p => p.tribuneNotes || p.simTraits).length,
  };

  // Classification breakdown
  const classBreakdown = {};
  for (const { classification } of parsed) {
    classBreakdown[classification] = (classBreakdown[classification] || 0) + 1;
  }

  // Report
  console.log('=== File Classification ===');
  for (const [cls, count] of Object.entries(classBreakdown).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${cls.padEnd(20)} ${count}`);
  }
  console.log(`  ${'skipped'.padEnd(20)} ${skipped.length}`);

  console.log('\n=== Player Stats ===');
  console.log(`  Total players:     ${stats.total}`);
  console.log(`  Baseball:          ${stats.baseball}`);
  console.log(`  Basketball:        ${stats.basketball}`);
  console.log(`  With POPID:        ${stats.withPopId}`);
  console.log(`  With season stats: ${stats.withStats}`);
  console.log(`  With attributes:   ${stats.withAttributes}`);
  console.log(`  With Statcast:     ${stats.withStatcast}`);

  console.log('\n=== Player List ===');
  for (const p of players) {
    const flags = [
      p.popId || '-',
      p.sport,
      p.position || '-',
      `OVR:${p.overall || '?'}`,
      p.tier ? `T${p.tier}` : '',
    ].filter(Boolean).join(' | ');
    console.log(`  ${(p.name || 'UNKNOWN').padEnd(25)} ${flags}`);
  }

  if (writeMode) {
    const indexPath = join(ROOT, 'output/player-index.json');
    const indexData = {
      generated: new Date().toISOString(),
      stats,
      players,
    };
    mkdirSync(dirname(indexPath), { recursive: true });
    writeFileSync(indexPath, JSON.stringify(indexData, null, 2));
    console.log(`\nWrote: ${indexPath}`);
  } else {
    console.log('\n[DRY RUN] No files written. Use --write to generate output/player-index.json.');
  }

  return { players, stats };
}

buildPlayerIndex();
