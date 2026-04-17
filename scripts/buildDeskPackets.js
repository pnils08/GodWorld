#!/usr/bin/env node
/**
 * buildDeskPackets.js v2.3
 *
 * Pulls live data from Google Sheets and splits into per-desk JSON packets
 * for independent agent processing in the Media Room.
 *
 * v2.3 Changes:
 * - Extended evening context parser to read 4 new Cycle_Packet sections:
 *   EVENING CITY (nightlife spots, restaurants, crowds, safety, vibe)
 *   CRIME SNAPSHOT (city-wide crime rates, hotspots, patrol strategy)
 *   TRANSIT (BART ridership, on-time, traffic index, alerts)
 *   CIVIC LOAD (load level, factors, story hooks)
 * - These give desk agents access to the living city, not just policy numbers
 *
 * v2.2 Changes:
 * - Evening Context — pulls Media_Ledger + Cycle_Packet data into desk packets.
 *   Culture and business desks get nightlife, food scene, media climate, weather mood.
 * - Civic Events — parses civic mode events from LifeHistory_Log for civic desk.
 * - Arc enrichment — adds involved citizens from LifeHistory_Log arc-tagged entries.
 *
 * v1.9 Changes:
 * - Voice Cards — parses TraitProfile from Simulation_Ledger into agent-friendly
 *   personality objects (archetype, modifiers, traits, topTags, motifs).
 *   Added to both full packets and summary files as voiceCards field.
 *
 * v1.8 Changes:
 * - Auto-runs buildArchiveContext.js after packet generation — queries Supermemory
 *   for past coverage and writes per-desk archive files. Skips gracefully if
 *   SUPERMEMORY_CC_API_KEY is not configured. Eliminates forgotten-step pipeline gap.
 *
 * v1.7 Changes:
 * - Executive Branch canon — pulls mayor and deputy mayor from Civic_Office_Ledger
 *   into canon.executiveBranch. Agents and Rhea now have canonical mayor name.
 * - TrueSource Reference — generates truesource_reference.json alongside base_context.
 *   Compact verification file with roster positions, council factions, mayor, initiatives.
 *   Used by Rhea Morgan for cross-checking article claims.
 *
 * v1.5 Changes:
 * - Sports Feed Digest — parses raw feed entries into structured intelligence:
 *   game results, roster moves, player features, front office, fan/civic, editorial notes
 * - Supports both new EventType taxonomy and legacy freeform entries (auto-inferred)
 * - Cross-references feed entries with active storylines for related arcs
 * - Derives team momentum from record + streak + player moods
 * - sportsFeedDigest object added to desk packets and summaries
 *
 * v1.4 Changes:
 * - Story Connections enrichment layer — cross-references data silos at read time:
 *   1. Event-Citizen Links: world events → named citizens in that neighborhood
 *   2. Civic Consequences: initiative outcomes → affected neighborhoods → citizens
 *   3. Citizen Bond Map: per-citizen relationship bonds for story depth
 *   4. Coverage Echo: citizens from previous edition flagged as recently covered
 *   5. Citizen Life Context: last 3 LifeHistory entries per desk citizen
 * - Neighborhood Citizen Index: one-time build maps neighborhoods → named citizens
 * - Fixed variable ordering bug: deskCanon + deskQuotes now defined before
 *   getCitizenNamesFromDeskData (were previously undefined at call site)
 * - storyConnections object added to each desk packet and summary
 *
 * v1.3 Changes:
 * - Household data (Household_Ledger), relationship bonds (Relationship_Bonds),
 *   economic context (World_Population) wired into desk packets
 *
 * Usage: node scripts/buildDeskPackets.js [cycleNumber]
 *   e.g. node scripts/buildDeskPackets.js 79
 *
 * Reads from Google Sheets:
 *   Story_Seed_Deck, Story_Hook_Deck, WorldEvents_V3_Ledger, Event_Arc_Ledger,
 *   Civic_Office_Ledger, Initiative_Tracker, Simulation_Ledger, Generic_Citizens,
 *   Chicago_Citizens, Cultural_Ledger, Oakland_Sports_Feed, Chicago_Sports_Feed,
 *   Storyline_Tracker, Cycle_Packet, LifeHistory_Log,
 *   Household_Ledger, Relationship_Bonds, World_Population, Media_Ledger
 *
 * Reads locally:
 *   /tmp/mara_directive_c{XX}.txt
 *   schemas/bay_tribune_roster.json
 *   editions/cycle_pulse_edition_{XX-1}.txt
 *
 * Writes:
 *   /tmp/desk_packets/{desk}_c{XX}.json  (one per desk)
 *   /tmp/desk_packets/base_context.json
 *   /tmp/desk_packets/truesource_reference.json
 *   /tmp/desk_packets/manifest.json
 */

const fs = require('fs');
const path = require('path');

// ─── CLI HELPERS ──────────────────────────────────────────
function getCliArg(flag) {
  var idx = process.argv.indexOf(flag);
  return (idx !== -1 && process.argv[idx + 1]) ? process.argv[idx + 1] : null;
}

// ─── CONFIGURATION ─────────────────────────────────────────
const getCurrentCycle = require('../lib/getCurrentCycle');
const contextScan = require('../lib/contextScan');
const CYCLE = getCurrentCycle();
const PROJECT_ROOT = path.resolve(__dirname, '..');

// Phase 40.6 Layer 4 — scan any packet we write and abort the build on a hit.
function writeAndScanPacket(filepath, content) {
  fs.writeFileSync(filepath, content);
  const result = contextScan.scanFile(filepath);
  if (!result.safe) {
    const first = result.matches[0] || {};
    throw new Error(
      'Phase 40.6 Layer 4: injection pattern detected in packet ' +
      filepath + ' — patternId=' + (first.patternId || 'unknown') +
      ' line=' + (first.lineNumber || '?') + '. Packet build aborted. ' +
      'See output/injection_blocks.log for full match set.'
    );
  }
}
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'output/desk-packets');
const MARA_PATH = path.join(PROJECT_ROOT, `output/mara_directive_c${CYCLE}.txt`);
const ROSTER_PATH = path.join(PROJECT_ROOT, 'schemas/bay_tribune_roster.json');
const PREV_EDITION_PATH = path.join(PROJECT_ROOT, `editions/cycle_pulse_edition_${CYCLE - 1}.txt`);
const POPID_INDEX_PATH = path.join(PROJECT_ROOT, 'docs/media/ARTICLE_INDEX_BY_POPID.md');

// ─── DESK DEFINITIONS ──────────────────────────────────────
const DESKS = {
  civic: {
    name: 'Civic Desk',
    domains: ['CIVIC', 'INFRASTRUCTURE', 'HEALTH', 'CRIME', 'SAFETY', 'GOVERNMENT', 'TRANSIT'],
    rosterDeskKeys: ['metro'],
    articleBudget: { min: 2, max: 4, recommended: 3 },
    storylineKeywords: [
      'stabilization', 'council', 'vote', 'oari', 'baylight', 'crane',
      'health center', 'osei', 'cortez', 'civic load', 'vega', 'carter', 'ashford',
      'chen', 'rivers', 'tran', 'mobley', 'delgado', 'infrastructure',
      'initiative', 'mayor', 'city hall', 'opoa', 'ramirez', 'district',
      'household', 'rent burden', 'housing', 'eviction',
      'mara vance', 'workforce agreement', 'local hiring', 'transit hub'
    ],
    canonSections: ['council', 'pendingVotes', 'statusAlerts', 'recentOutcomes', 'executiveBranch'],
    getsSportsFeeds: false,
    getsMara: true
  },
  sports: {
    name: 'Sports Desk (Oakland)',
    domains: ['SPORTS'],
    rosterDeskKeys: ['sports'],
    articleBudget: { min: 2, max: 5, recommended: 3 },
    storylineKeywords: [
      "a's", 'spring training', 'keane', 'seymour', 'warriors', 'giannis',
      'dynasty', 'horn', 'aitken', 'davis', 'mesa', 'coliseum', 'dillon',
      'ramos', 'coles', 'ellis', 'paulson', 'oakland sports', 'antetokounmpo',
      'green', 'moody', 'championship', 'expansion', 'nba',
      'richards', 'quintero', 'taveras', 'wade', 'farewell'
    ],
    canonSections: ['asRoster'],
    getsSportsFeeds: 'oakland',
    getsMara: false
  },
  culture: {
    name: 'Culture Desk',
    domains: ['CULTURE', 'FAITH', 'COMMUNITY', 'FESTIVAL', 'ARTS', 'EDUCATION', 'WEATHER', 'ENVIRONMENT', 'FOOD'],
    rosterDeskKeys: ['culture'],
    articleBudget: { min: 2, max: 4, recommended: 3 },
    storylineKeywords: [
      'faith', 'interfaith', 'gallery', 'mei chen', 'first friday', 'mural',
      'community', 'art walk', 'cultural', 'church', 'mosque', 'synagogue',
      'temple', 'concert', 'nightlife', 'restaurant', 'school',
      'household', 'family', 'multigenerational', 'marriage', 'birth',
      'education', 'after-school', 'rec center', 'academy', 'teacher',
      'calvin turner', 'andre lee', 'housing market', 'arts scene'
    ],
    canonSections: ['culturalEntities'],
    getsSportsFeeds: false,
    getsMara: false
  },
  business: {
    name: 'Business Desk',
    domains: ['ECONOMIC', 'NIGHTLIFE', 'RETAIL', 'LABOR'],
    rosterDeskKeys: ['business'],
    articleBudget: { min: 1, max: 2, recommended: 1 },
    storylineKeywords: [
      'economic', 'retail', 'nightlife', 'commerce', 'business', 'port',
      'employment', 'labor', 'restaurant', 'jack london',
      'household', 'income', 'rent', 'housing cost', 'wealth',
      'tech', 'oakmesh', 'gridiron', 'tenth street', 'ridgeline',
      'workforce', 'hiring', 'housing market', 'real estate',
      'stabilization fund', 'disbursement'
    ],
    canonSections: [],
    getsSportsFeeds: false,
    getsMara: false
  },
  chicago: {
    name: 'Chicago Bureau',
    domains: ['SPORTS', 'CHICAGO'],
    rosterDeskKeys: ['chicago'],
    articleBudget: { min: 2, max: 3, recommended: 2 },
    storylineKeywords: [
      'bulls', 'trepagnier', 'chicago', 'paulson', 'giddey', 'simmons',
      'holiday', 'united center', 'bridgeport', 'bronzeville', 'stanley',
      'buzelis', 'huerter', 'kessler', 'romano', 'okafor', 'polk',
      'expansion', 'nba', 'dosunmu'
    ],
    canonSections: ['bullsRoster'],
    getsSportsFeeds: 'chicago',
    getsMara: false
  },
  letters: {
    name: 'Letters Desk',
    domains: ['ALL'],
    rosterDeskKeys: [],
    articleBudget: { min: 2, max: 4, recommended: 3 },
    storylineKeywords: [],
    canonSections: ['council', 'pendingVotes', 'asRoster', 'bullsRoster'],
    getsSportsFeeds: 'both',
    getsMara: false
  }
};

// ─── DOMAIN → DESK ROUTING ────────────────────────────────
const DOMAIN_TO_DESKS = {
  'CIVIC': ['civic'],
  'INFRASTRUCTURE': ['civic'],
  'HEALTH': ['civic'],
  'CRIME': ['civic'],
  'SAFETY': ['civic'],
  'GOVERNMENT': ['civic'],
  'TRANSIT': ['civic'],
  'SPORTS': ['sports', 'chicago'],
  'CULTURE': ['culture'],
  'FAITH': ['culture'],
  'COMMUNITY': ['culture'],
  'FESTIVAL': ['culture'],
  'NIGHTLIFE': ['culture', 'business'],
  'ARTS': ['culture'],
  'EDUCATION': ['culture'],
  'WEATHER': ['culture'],
  'ENVIRONMENT': ['culture'],
  'FOOD': ['culture'],
  'ECONOMIC': ['business'],
  'RETAIL': ['business'],
  'LABOR': ['business'],
  'CHICAGO': ['chicago'],
  'GENERAL': ['civic', 'culture']
};

// Chicago-specific filtering for SPORTS domain
const CHICAGO_TEAM_KEYWORDS = ['bulls', 'chicago', 'trepagnier', 'giddey', 'simmons', 'holiday', 'buzelis', 'huerter', 'kessler', 'stanley'];
const OAKLAND_TEAM_KEYWORDS = ['a\'s', 'warriors', 'keane', 'aitken', 'horn', 'seymour', 'giannis', 'antetokounmpo', 'green', 'moody', 'dillon', 'ramos', 'coles', 'taveras', 'quintero', 'rosales', 'richards', 'rivas', 'kelley', 'davis'];

// ─── SHEETS API SETUP ──────────────────────────────────────
require('dotenv').config({ path: path.join(PROJECT_ROOT, '.env') });
const sheets = require(path.join(PROJECT_ROOT, 'lib/sheets'));

// ─── HELPERS ───────────────────────────────────────────────

function safe(val, def) {
  if (val === undefined || val === null || val === '') return def !== undefined ? def : '';
  return val;
}

function toObj(headers, row) {
  var obj = {};
  for (var i = 0; i < headers.length; i++) {
    obj[headers[i]] = safe(row[i]);
  }
  return obj;
}

function filterByCycle(data, cycle) {
  if (data.length < 2) return [];
  var headers = data[0];
  var cycleCol = headers.indexOf('Cycle');
  if (cycleCol === -1) return [];
  var results = [];
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][cycleCol]) === String(cycle)) {
      results.push(toObj(headers, data[i]));
    }
  }
  return results;
}

function allToObjects(data) {
  if (data.length < 2) return [];
  var headers = data[0];
  var results = [];
  for (var i = 1; i < data.length; i++) {
    results.push(toObj(headers, data[i]));
  }
  return results;
}

function getDesksForDomain(domain, description) {
  var d = (domain || '').toUpperCase().trim();
  var desks = DOMAIN_TO_DESKS[d] || ['civic', 'culture'];

  // For SPORTS domain, further filter by team keywords
  if (d === 'SPORTS' && description) {
    var descLower = description.toLowerCase();
    var isChicago = CHICAGO_TEAM_KEYWORDS.some(function(kw) { return descLower.indexOf(kw) !== -1; });
    var isOakland = OAKLAND_TEAM_KEYWORDS.some(function(kw) { return descLower.indexOf(kw) !== -1; });
    if (isChicago && !isOakland) return ['chicago'];
    if (isOakland && !isChicago) return ['sports'];
    // If both or neither, send to both
  }
  return desks;
}

function matchesStorylineKeywords(description, keywords) {
  if (!keywords || keywords.length === 0) return true; // letters desk gets all
  var descLower = (description || '').toLowerCase();
  return keywords.some(function(kw) { return descLower.indexOf(kw) !== -1; });
}

function extractReportersForDesk(roster, deskKeys) {
  var reporters = [];
  var lookup = roster.quickLookup && roster.quickLookup.byName ? roster.quickLookup.byName : {};

  for (var name in lookup) {
    var entry = lookup[name];
    if (!entry || !entry.desk) continue;
    var entryDesk = entry.desk.toLowerCase();
    for (var i = 0; i < deskKeys.length; i++) {
      if (entryDesk.indexOf(deskKeys[i]) !== -1) {
        // Find full profile from roster
        var profile = findFullProfile(roster, name);
        reporters.push({
          name: name,
          role: entry.role || '',
          desk: entry.desk || '',
          tone: entry.tone || '',
          openingStyle: entry.openingStyle || '',
          themes: entry.themes || [],
          beat: profile.beat || [],
          signatureThemes: profile.signatureThemes || [],
          samplePhrases: profile.samplePhrases || [],
          background: profile.background || ''
        });
        break;
      }
    }
  }
  return reporters;
}

function findFullProfile(roster, name) {
  // Search through all desk groups for the full journalist profile
  var deskGroups = roster.desks || {};
  for (var deskName in deskGroups) {
    var desk = deskGroups[deskName];
    var sources = [desk.core, desk.support, desk.reporters, desk.columnists,
                   desk.staff, desk.lead, desk.columnists_opinion];
    for (var s = 0; s < sources.length; s++) {
      var group = sources[s];
      if (!Array.isArray(group)) continue;
      for (var j = 0; j < group.length; j++) {
        if (group[j].name === name) return group[j];
      }
    }
    // Also check if desk itself is a single reporter
    if (desk.name === name) return desk;
  }
  return {};
}

function parsePopIdIndex(filePath) {
  if (!fs.existsSync(filePath)) return {};
  var text = fs.readFileSync(filePath, 'utf-8');
  var lines = text.split('\n');
  var archive = {};
  var current = null;

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    // Match: ## POP-00001 — Vinnie Keane (35)  or  ## CUL-6D596907 — Lena Cross (26)
    var match = line.match(/^## (.+?) — (.+?) \((\d+)\)/);
    if (match) {
      current = { popId: match[1], name: match[2], totalRefs: parseInt(match[3]), articles: [] };
      archive[match[2]] = current; // key by name for easy lookup
      continue;
    }
    // Match article lines: - [Source] Title
    if (current && line.startsWith('- [')) {
      var artMatch = line.match(/^- \[(.+?)\] (.+)/);
      if (artMatch) {
        current.articles.push({ source: artMatch[1], title: artMatch[2] });
      }
    }
  }
  return archive;
}

function getCitizenNamesFromDeskData(deskEvents, deskSeeds, deskHooks, deskArcs, deskStorylines, candidates, deskQuotes, deskCanon) {
  var names = {};
  // Extract from storylines (RelatedCitizens field)
  (deskStorylines || []).forEach(function(s) {
    (s.relatedCitizens || '').split(/[,;|]/).forEach(function(n) {
      var trimmed = n.trim();
      if (trimmed.length > 2 && /[A-Z]/.test(trimmed[0])) names[trimmed] = true;
    });
  });
  // Extract from interview candidates
  (candidates || []).forEach(function(c) { if (c.name) names[c.name] = true; });
  // Extract from recent quotes
  (deskQuotes || []).forEach(function(q) { if (q.name) names[q.name] = true; });
  // Extract from canon roster data (A's, Bulls, council, cultural entities)
  if (deskCanon) {
    (deskCanon.asRoster || []).forEach(function(p) { if (p.name) names[p.name] = true; });
    (deskCanon.bullsRoster || []).forEach(function(p) { if (p.name) names[p.name] = true; });
    (deskCanon.council || []).forEach(function(c) { if (c.member) names[c.member] = true; });
    (deskCanon.culturalEntities || []).forEach(function(e) { if (e.name) names[e.name] = true; });
  }
  // Extract from event/seed/hook descriptions (capitalized multi-word names)
  [deskEvents, deskSeeds, deskHooks].forEach(function(list) {
    (list || []).forEach(function(item) {
      var text = item.description || item.text || '';
      var nameMatches = text.match(/[A-Z][a-z]+ [A-Z][a-z]+/g);
      if (nameMatches) nameMatches.forEach(function(n) { names[n] = true; });
    });
  });
  // Extract from arc summaries
  (deskArcs || []).forEach(function(a) {
    var text = a.summary || a.Summary || '';
    var nameMatches = text.match(/[A-Z][a-z]+ [A-Z][a-z]+/g);
    if (nameMatches) nameMatches.forEach(function(n) { names[n] = true; });
  });
  return Object.keys(names);
}

function buildCitizenArchive(popIdIndex, citizenNames) {
  var MAX_ARTICLES_PER_CITIZEN = 10;
  var archive = {};
  for (var i = 0; i < citizenNames.length; i++) {
    var name = citizenNames[i];
    if (popIdIndex[name]) {
      var allArticles = popIdIndex[name].articles;
      archive[name] = {
        popId: popIdIndex[name].popId,
        totalRefs: popIdIndex[name].totalRefs,
        articles: allArticles.slice(-MAX_ARTICLES_PER_CITIZEN)
      };
      if (allArticles.length > MAX_ARTICLES_PER_CITIZEN) {
        archive[name].note = allArticles.length + ' total articles, showing last ' + MAX_ARTICLES_PER_CITIZEN;
      }
    }
  }
  return archive;
}

function buildReporterHistory(allDrafts, reporterNames) {
  var history = {};
  for (var r = 0; r < reporterNames.length; r++) {
    history[reporterNames[r]] = [];
  }
  for (var i = 0; i < allDrafts.length; i++) {
    var draft = allDrafts[i];
    var reporter = (draft.Reporter || '').trim();
    if (!reporter || !history[reporter]) continue;
    history[reporter].push({
      cycle: parseInt(draft.Cycle) || 0,
      headline: draft.SummaryPrompt || '',
      type: draft.StoryType || '',
      summary: draft.DraftText || ''
    });
  }
  // Sort each reporter's articles by cycle (oldest first)
  for (var name in history) {
    history[name].sort(function(a, b) { return a.cycle - b.cycle; });
  }
  // Remove empty reporters
  for (var name in history) {
    if (history[name].length === 0) delete history[name];
  }
  return history;
}

function extractPreviousCoverage(prevEditionText, reporterNames) {
  if (!prevEditionText) return [];
  var coverage = [];
  var lines = prevEditionText.split('\n');
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    for (var r = 0; r < reporterNames.length; r++) {
      if (line.indexOf('By ' + reporterNames[r]) !== -1) {
        // Look backwards for headline
        for (var j = i - 1; j >= Math.max(0, i - 6); j--) {
          var hline = lines[j].trim();
          if (hline.length > 15 && !hline.startsWith('By ') && !hline.startsWith('---') &&
              !hline.startsWith('#') && hline.length < 200) {
            coverage.push(reporterNames[r] + ': "' + hline + '" (Edition ' + (CYCLE - 1) + ')');
            break;
          }
        }
      }
    }
  }
  return coverage;
}

function filterCulturalByDomain(entities, deskDomains) {
  if (deskDomains.indexOf('ALL') !== -1) return entities;
  return entities.filter(function(e) {
    var cd = (e.CulturalDomain || '').toUpperCase();
    return deskDomains.some(function(d) { return cd.indexOf(d) !== -1; }) ||
           deskDomains.some(function(d) { return d === 'CULTURE'; }); // culture desk gets all cultural entities
  });
}

// Load POPID usage counts for freshness scoring
var USAGE_COUNTS = null;
try {
  USAGE_COUNTS = JSON.parse(fs.readFileSync(path.join(ROOT, 'output', 'popid-usage-counts.json'), 'utf-8'));
} catch (e) {
  // First run or file missing — no freshness scoring
}

function getInterviewCandidates(simLedger, neighborhoods, bizIndex) {
  // v2.4: Return ALL ENGINE citizens with freshness scoring.
  // Citizens who have never appeared in any edition sort higher.
  // Priority citizens (from desk neighborhoods) still come first within each tier.
  var priority = [];
  var other = [];
  var hasPriorityHoods = neighborhoods && neighborhoods.length > 0;

  simLedger.forEach(function(c) {
    var status = (c.Status || '').toLowerCase();
    var clock = (c.ClockMode || '').toUpperCase();
    if (clock !== 'ENGINE') return;
    if (status !== 'active' && status !== 'retired') return;

    var fullName = ((c.First || '') + ' ' + (c.Last || '')).trim();
    if (!fullName) return;
    var income = parseFloat(c.Income) || 0;
    var empBizId = c.EmployerBizId || '';
    var empBiz = (bizIndex && empBizId) ? bizIndex[empBizId] : null;
    var birthYear = parseInt(c.BirthYear) || 0;
    var age = birthYear > 0 ? 2041 - birthYear : '';
    var hood = c.Neighborhood || '';
    var popId = c.POPID || '';

    // Freshness score: 0 appearances = freshest, higher = more used
    var usageCount = (USAGE_COUNTS && popId) ? (USAGE_COUNTS[popId] || 0) : 0;

    var candidate = {
      name: fullName,
      popId: popId,
      age: age,
      neighborhood: hood,
      role: c.RoleType,
      tier: c.Tier,
      income: income,
      economicCategory: income >= 150000 ? 'high' : (income >= 75000 ? 'mid' : (income > 0 ? 'low' : 'unknown')),
      employerBizId: empBizId,
      employerName: empBiz ? empBiz.Name : (empBizId === 'SELF_EMPLOYED' ? 'Self-Employed' : ''),
      usageCount: usageCount,
      fresh: usageCount === 0
    };

    if (hasPriorityHoods && neighborhoods.indexOf(hood) !== -1) {
      priority.push(candidate);
    } else {
      other.push(candidate);
    }
  });

  // Within each group, sort by freshness (least used first)
  function freshSort(a, b) { return (a.usageCount || 0) - (b.usageCount || 0); }
  priority.sort(freshSort);
  other.sort(freshSort);

  // Priority candidates first (from desk's event neighborhoods), then everyone else
  return priority.concat(other);
}

// Get all unique neighborhoods from events/seeds/arcs for a desk
function getDeskNeighborhoods(events, seeds, arcs) {
  var hoods = {};
  [events, seeds, arcs].forEach(function(list) {
    (list || []).forEach(function(item) {
      var n = item.Neighborhood || item.neighborhood;
      if (n && n !== 'city-wide' && n !== '') hoods[n] = true;
    });
  });
  return Object.keys(hoods);
}

// ─── CANON BUILDERS ────────────────────────────────────────

function buildCouncil(civicOfficers) {
  return civicOfficers.filter(function(o) {
    return (o.Type || '').toLowerCase().indexOf('council') !== -1 ||
           (o.Title || '').toLowerCase().indexOf('council') !== -1;
  }).map(function(o) {
    return {
      district: o.District || '',
      member: o.Holder || '',
      popId: o.PopId || '',
      faction: o.Faction || '',
      status: o.Status || 'active'
    };
  });
}

function buildPendingVotes(initiatives) {
  return initiatives.filter(function(i) {
    if (!i.Name || i.Name.trim() === '') return false;
    var status = (i.Status || '').toLowerCase();
    return status !== 'proposed' && status !== 'passed' && status !== 'failed' && status !== 'archived';
  }).map(function(i) {
    return {
      name: i.Name || '',
      initiativeId: i.InitiativeID || '',
      type: i.Type || '',
      status: i.Status || '',
      budget: i.Budget || '',
      voteRequirement: i.VoteRequirement || '',
      voteCycle: i.VoteCycle || '',
      projection: i.Projection || '',
      leadFaction: i.LeadFaction || '',
      oppositionFaction: i.OppositionFaction || '',
      swingVoter: i.SwingVoter || '',
      swingVoter2: i.SwingVoter2 || '',
      swingVoter2Lean: i.SwingVoter2Lean || '',
      policyDomain: i.PolicyDomain || '',
      affectedNeighborhoods: i.AffectedNeighborhoods || '',
      notes: i.Notes || ''
    };
  });
}

// ─── DESK SUMMARY GENERATOR ─────────────────────────────
// Produces a compact 10-25KB summary for agent consumption.
// Agents read this first instead of the full 200-500KB packet.
function generateDeskSummary(packet, deskId, cycle) {
  var cr = packet.canonReference || {};

  // Sort events by priority score, take top 5
  var topEvents = (packet.events || []).slice().sort(function(a, b) {
    return (b.priorityScore || 0) - (a.priorityScore || 0);
  }).slice(0, 5).map(function(e) {
    return {
      domain: e.domain, severity: e.severity, neighborhood: e.neighborhood,
      description: e.description, type: e.type, priorityScore: e.priorityScore
    };
  });

  // Sort seeds by priority score, take top 5
  var topSeeds = (packet.seeds || []).slice().sort(function(a, b) {
    return (b.priorityScore || 0) - (a.priorityScore || 0);
  }).slice(0, 5).map(function(s) {
    return { seedType: s.seedType, domain: s.domain, neighborhood: s.neighborhood, text: s.text };
  });

  // Sort arcs by tension, take top 3
  var topArcs = (packet.arcs || []).slice().sort(function(a, b) {
    return parseFloat(b.tension || 0) - parseFloat(a.tension || 0);
  }).slice(0, 3).map(function(a) {
    return { arcId: a.arcId, domain: a.domain, phase: a.phase, tension: a.tension, summary: a.summary };
  });

  // Active storylines only, cap at 10
  var activeStorylines = (packet.storylines || []).filter(function(s) {
    return s.status === 'active' || s.type === 'new' || s.type === 'developing';
  }).slice(0, 10);

  // Interview candidates, top 10
  var topCandidates = (packet.interviewCandidates || []).slice(0, 10);

  var summary = {
    meta: {
      desk: deskId,
      cycle: cycle,
      fullPacketFile: deskId + '_c' + cycle + '.json',
    },
    councilRoster: cr.council || [],
    pendingVotes: (cr.pendingVotes || []).filter(function(v) {
      return v.name && v.name.trim() !== '';
    }).map(function(v) {
      return { name: v.name, status: v.status, budget: v.budget, voteCycle: v.voteCycle,
               projection: v.projection, swingVoter: v.swingVoter, swingVoter2: v.swingVoter2 };
    }),
    statusAlerts: cr.statusAlerts || [],
    recentOutcomes: cr.recentOutcomes || [],
    topEvents: topEvents,
    topSeeds: topSeeds,
    topArcs: topArcs,
    activeStorylines: activeStorylines,
    reporters: cr.reporters || packet.reporters || [],
    interviewCandidates: topCandidates,
    maraDirective: packet.maraDirective || '',
    sportsFeeds: packet.sportsFeeds || [],
    sportsFeedDigest: packet.sportsFeedDigest || null,
    // Household events this cycle (formations, dissolutions, crises)
    householdEvents: (packet.householdEvents || []).slice(0, 5),
    householdCount: (packet.households || []).length,
    // Economic snapshot
    economicContext: packet.economicContext || {},
    // Top bonds by intensity
    topBonds: (packet.bonds || []).slice(0, 5),
    // v1.9: Voice cards for citizen dialogue (all cards — they're small)
    voiceCards: packet.voiceCards || {},
    // v1.4: Story connections summary (compact enrichment for agent consumption)
    storyConnections: {
      eventCitizenLinks: ((packet.storyConnections || {}).eventCitizenLinks || []).slice(0, 5),
      civicConsequences: ((packet.storyConnections || {}).civicConsequences || []).slice(0, 3),
      coverageEcho: ((packet.storyConnections || {}).coverageEcho || []).slice(0, 10),
      enrichmentNote: ((packet.storyConnections || {}).enrichmentNote || '')
    },
    // v2.2: Evening context — nightlife, media climate, weather mood
    eveningContext: packet.eveningContext || {},
    // v2.2: Civic events from LifeHistory_Log
    civicEvents: (packet.civicEvents || []).slice(0, 10)
  };

  return summary;
}

function buildExecutiveBranch(civicOfficers) {
  var mayor = null;
  var deputyMayor = null;
  civicOfficers.forEach(function(o) {
    var title = (o.Title || '').toLowerCase();
    if (title.indexOf('mayor') !== -1 && title.indexOf('deputy') === -1) {
      mayor = {
        name: o.Holder || '',
        title: o.Title || '',
        popId: o.PopId || '',
        status: o.Status || 'active',
        approvalRating: o.Approval || ''
      };
    } else if (title.indexOf('deputy mayor') !== -1) {
      deputyMayor = {
        name: o.Holder || '',
        title: o.Title || '',
        popId: o.PopId || '',
        status: o.Status || 'active'
      };
    }
  });
  return {
    mayor: mayor ? mayor.name : '',
    mayorDetail: mayor,
    deputyMayor: deputyMayor ? deputyMayor.name : '',
    deputyMayorDetail: deputyMayor
  };
}

function buildStatusAlerts(civicOfficers) {
  return civicOfficers.filter(function(o) {
    var s = (o.Status || '').toLowerCase();
    return s !== 'active' && s !== '' && s !== 'vacant';
  }).map(function(o) {
    return { name: o.Holder, title: o.Title, status: o.Status };
  });
}

function buildRecentOutcomes(initiatives) {
  return initiatives.filter(function(i) {
    var s = (i.Status || '').toLowerCase();
    return s === 'passed' || s === 'failed';
  }).map(function(i) {
    return {
      name: i.Name || '',
      initiativeId: i.InitiativeID || '',
      status: (i.Status || '').toUpperCase(),
      outcome: i.Outcome || '',
      budget: i.Budget || '',
      voteRequirement: i.VoteRequirement || '',
      voteCycle: i.VoteCycle || '',
      voteBreakdown: i.Notes || '',
      affectedNeighborhoods: i.AffectedNeighborhoods || '',
      policyDomain: i.PolicyDomain || '',
      // Implementation tracking (populated when columns exist on sheet)
      implementationPhase: i.ImplementationPhase || null,
      milestoneNotes: i.MilestoneNotes || null,
      nextScheduledAction: i.NextScheduledAction || null,
      nextActionCycle: i.NextActionCycle ? parseInt(i.NextActionCycle) : null
    };
  });
}

function buildAsRoster(simLedger) {
  // v2.3: Pull from all GAME-mode citizens + enrich with player-index data
  var playerIndex = null;
  try {
    var piPath = path.join(PROJECT_ROOT, 'output', 'player-index.json');
    if (fs.existsSync(piPath)) {
      playerIndex = JSON.parse(fs.readFileSync(piPath, 'utf-8'));
    }
  } catch (e) { /* player index optional */ }

  var piByPopId = {};
  if (playerIndex && playerIndex.players) {
    playerIndex.players.forEach(function(p) {
      if (p.popId) piByPopId[p.popId.toUpperCase()] = p;
    });
  }

  return simLedger.filter(function(c) {
    var clock = (c.ClockMode || '').toUpperCase();
    return clock === 'GAME';
  }).map(function(c) {
    var popId = c.POPID || '';
    var pi = piByPopId[popId.toUpperCase()] || {};
    return {
      popId: popId,
      name: (c.First + ' ' + (c.Last || '')).trim(),
      tier: c.Tier,
      roleType: c.RoleType,
      neighborhood: c.Neighborhood,
      status: c.Status,
      position: pi.position || null,
      overall: pi.overall || null,
      potential: pi.potential || null,
      contract: pi.contract || null,
      quirks: pi.quirks || null,
      seasonStats: pi.seasonStats ? pi.seasonStats.slice(-2) : null,  // last 2 seasons
      awards: pi.awards ? pi.awards.slice(0, 5) : null,
      playerStatus: pi.playerStatus || null
    };
  });
}

function buildBullsRoster(simLedger, chiSports) {
  var nameSet = {};

  // 1. Check Simulation_Ledger for any Bulls-related citizens
  simLedger.forEach(function(c) {
    var role = (c.RoleType || '').toLowerCase();
    if (role.indexOf('bull') !== -1) {
      var name = (c.First + ' ' + (c.Last || '')).trim();
      if (name) nameSet[name] = { name: name, popId: c.POPID || '', source: 'Simulation_Ledger' };
    }
  });

  // 2. Parse full roster from Season/Roster entries (roster is in Notes field)
  (chiSports || []).forEach(function(entry) {
    var evType = (entry.EventType || '').trim().toLowerCase();
    if (evType === 'season' || evType === 'roster') {
      // Notes field contains: "(PG) Josh Giddey, Tre Jones, Adash Stanley-rookie (SG) ..."
      var notes = entry.Notes || '';
      var cleaned = notes.replace(/\((?:PG|SG|SF|PF|C)\)/gi, ',')
                         .replace(/-rookie/gi, '').replace(/-veteran/gi, '');
      var parts = cleaned.split(',').map(function(p) { return p.trim(); })
                         .filter(function(p) {
                           return p.length > 3 && /[A-Z]/.test(p[0]) && p.indexOf(' ') !== -1;
                         });
      parts.forEach(function(name) {
        if (!nameSet[name]) nameSet[name] = { name: name, source: 'Chicago_Sports_Feed_Roster' };
      });
    }
  });

  // 3. Add C79 acquisitions and other known current players from feed text
  var knownCurrent = [
    'Hank Trepagnier', 'Josh Giddey', 'Adash Stanley', 'Matas Buzelis',
    'Walker Kessler', 'Kevin Huerter', 'Ayo Dosunmu', 'Isaac Okoro',
    'Patrick Williams', 'Jrue Holiday', 'Ben Simmons', 'Noa Essengue',
    'Jalen Smith', 'Keshad Johnson', 'Tyrese Martin', 'Simon Fontecchio'
  ];
  var allText = JSON.stringify(chiSports || []);
  knownCurrent.forEach(function(name) {
    if (!nameSet[name] && allText.indexOf(name) !== -1) {
      nameSet[name] = { name: name, source: 'Chicago_Sports_Feed' };
    }
  });

  return Object.values(nameSet);
}

function buildReporterList(roster) {
  var reporters = [];
  var lookup = roster.quickLookup && roster.quickLookup.byName ? roster.quickLookup.byName : {};
  for (var name in lookup) {
    reporters.push({ name: name, desk: lookup[name].desk, role: lookup[name].role });
  }
  return reporters;
}

function buildCulturalEntitiesCanon(culturalLedger) {
  return culturalLedger.filter(function(e) {
    return parseInt(e.FameScore || '0') >= 20 && e.Status === 'Active';
  }).map(function(e) {
    return {
      name: e.Name,
      roleType: e.RoleType,
      domain: e.CulturalDomain,
      fameScore: parseInt(e.FameScore || '0'),
      neighborhood: e.Neighborhood || ''
    };
  }).sort(function(a, b) { return b.fameScore - a.fameScore; });
}

// ─── VOICE CARDS (v1.9: Citizen Voice Pipeline) ──────────

/**
 * Build voice cards from TraitProfile data on the Simulation_Ledger.
 * Maps citizen names to parsed personality profiles so desk agents
 * know how citizens should sound when quoted.
 */
function buildVoiceCards(simLedger, citizenNames) {
  // Build name→TraitProfile lookup from ledger
  var profileLookup = {};
  simLedger.forEach(function(c) {
    var name = ((c.First || '') + ' ' + (c.Last || '')).trim();
    if (name && c.TraitProfile) profileLookup[name] = c.TraitProfile;
  });

  var cards = {};
  for (var i = 0; i < citizenNames.length; i++) {
    var name = citizenNames[i];
    var profileStr = profileLookup[name];
    if (!profileStr) continue;

    var parsed = parseVoiceCard(profileStr);
    if (parsed) cards[name] = parsed;
  }
  return cards;
}

/**
 * Parse a TraitProfile string into an agent-friendly voice card.
 * Strips internal metadata (V, Hash, Updated, Basis, Entries).
 */
function parseVoiceCard(profileStr) {
  if (!profileStr) return null;

  var card = { archetype: 'Drifter', modifiers: [], traits: {}, topTags: [], motifs: [] };
  var parts = String(profileStr).split('|');

  for (var i = 0; i < parts.length; i++) {
    var part = parts[i];
    var colonIdx = part.indexOf(':');
    if (colonIdx < 0) continue;

    var key = part.substring(0, colonIdx);
    var value = part.substring(colonIdx + 1);

    if (key === 'Archetype') card.archetype = value;
    else if (key === 'Mods') card.modifiers = value ? value.split(',') : [];
    else if (key === 'TopTags') card.topTags = value ? value.split(',') : [];
    else if (key === 'Motifs') card.motifs = value ? value.split(',') : [];
    else if (['V', 'Hash', 'Updated', 'Basis', 'Entries'].indexOf(key) === -1) {
      var num = parseFloat(value);
      if (!isNaN(num)) card.traits[key] = num;
    }
  }

  return card;
}

// ─── JOURNALISM AI OPTIMIZATIONS (v1.2) ───────────────────

/**
 * Calculate statistical variance for anomaly detection
 * Returns number of standard deviations from baseline mean
 */
function calculateVariance(current, baseline) {
  if (!baseline || baseline.length === 0) return 0;

  var sum = baseline.reduce(function(a, b) { return a + b; }, 0);
  var mean = sum / baseline.length;

  var squaredDiffs = baseline.map(function(x) { return Math.pow(x - mean, 2); });
  var variance = squaredDiffs.reduce(function(a, b) { return a + b; }, 0) / baseline.length;
  var stdDev = Math.sqrt(variance);

  if (stdDev === 0) return 0;
  return (current - mean) / stdDev;
}

/**
 * Calculate priority score for signals
 * Formula: (severity × 10) + (citizen_count × 2) + (variance × 5) + neighborhood_weight
 */
function calculatePriorityScore(signal, variance) {
  var severity = parseInt(signal.severity || signal.Severity || 3);
  var citizenCount = 0;

  // Count citizens mentioned in description
  if (signal.description || signal.EventDescription) {
    var desc = signal.description || signal.EventDescription || '';
    var names = desc.match(/[A-Z][a-z]+ [A-Z][a-z]+/g) || [];
    citizenCount = names.length;
  }

  var neighborhood = signal.neighborhood || signal.Neighborhood || '';
  var neighborhoodWeight = (neighborhood && neighborhood !== 'GENERAL' && neighborhood !== 'Multiple') ? 2 : 0;

  var varianceScore = Math.abs(variance) * 5;

  return (severity * 10) + (citizenCount * 2) + varianceScore + neighborhoodWeight;
}

/**
 * Detect anomalies in event data by comparing to historical baseline
 * Returns events with variance and anomalyFlag fields added
 */
function detectAnomalies(events, historicalEvents) {
  if (!events || events.length === 0) return [];
  if (!historicalEvents || historicalEvents.length === 0) {
    // No baseline - mark all as normal
    return events.map(function(e) {
      e.variance = 0;
      e.anomalyFlag = 'NORMAL';
      return e;
    });
  }

  // Build baseline: count events by severity over last cycles
  var severityBaseline = [];
  var cycleGroups = {};

  historicalEvents.forEach(function(e) {
    var cycle = e.Cycle || e.CycleId;
    if (!cycleGroups[cycle]) cycleGroups[cycle] = [];
    cycleGroups[cycle].push(parseInt(e.Severity || 3));
  });

  // Get severity counts per cycle
  for (var cycle in cycleGroups) {
    var cycleSeverities = cycleGroups[cycle];
    var highSeverityCount = cycleSeverities.filter(function(s) { return s >= 4; }).length;
    severityBaseline.push(highSeverityCount);
  }

  // Calculate variance for current cycle
  var currentHighSeverity = events.filter(function(e) {
    return parseInt(e.Severity || 3) >= 4;
  }).length;

  var variance = calculateVariance(currentHighSeverity, severityBaseline);

  return events.map(function(e) {
    var eventSeverity = parseInt(e.Severity || 3);
    var eventVariance = eventSeverity >= 4 ? variance : 0;

    e.variance = Math.round(eventVariance * 100) / 100;
    e.anomalyFlag = Math.abs(eventVariance) > 2.5 ? 'HIGH' :
                    Math.abs(eventVariance) > 1.5 ? 'MEDIUM' : 'NORMAL';
    e.priorityScore = calculatePriorityScore(e, eventVariance);

    return e;
  });
}

/**
 * Add priority scores to seeds and hooks
 */
function addPriorityScores(signals, varianceDefault) {
  return signals.map(function(s) {
    s.priorityScore = calculatePriorityScore(s, varianceDefault || 0);
    return s;
  });
}

/**
 * Sort and flag top priority signals
 */
function flagTopPriority(signals, topN) {
  if (!signals || signals.length === 0) return signals;

  // Sort by priority score descending
  signals.sort(function(a, b) {
    return (b.priorityScore || 0) - (a.priorityScore || 0);
  });

  // Flag top N as priority
  for (var i = 0; i < Math.min(topN, signals.length); i++) {
    signals[i].priority = true;
  }

  return signals;
}

// ─── HOUSEHOLD / BOND / ECONOMIC BUILDERS ─────────────────

/**
 * Filter households relevant to a desk by neighborhood overlap
 */
function filterHouseholdsForDesk(households, deskNeighborhoods, deskDomains) {
  if (deskDomains.indexOf('ALL') !== -1) return households;
  if (!deskNeighborhoods || deskNeighborhoods.length === 0) return [];
  return households.filter(function(h) {
    return deskNeighborhoods.indexOf(h.Neighborhood || h.neighborhood) !== -1;
  });
}

/**
 * Filter bonds relevant to a desk by citizen overlap with desk data
 */
function filterBondsForDesk(bonds, deskCitizenNames, deskNeighborhoods, deskDomains) {
  if (deskDomains.indexOf('ALL') !== -1) return bonds;
  return bonds.filter(function(b) {
    var citizenMatch = deskCitizenNames.indexOf(b.CitizenA) !== -1 ||
                       deskCitizenNames.indexOf(b.CitizenB) !== -1;
    var hoodMatch = deskNeighborhoods.indexOf(b.Neighborhood) !== -1;
    return citizenMatch || hoodMatch;
  });
}

/**
 * Build economic context from World_Population + citizen data + Neighborhood_Map
 * v2.0: Dollar-amount income buckets, median income, neighborhood economics
 */
function buildEconomicContext(worldPopRaw, simLedger, activeHouseholds, neighborhoodMap) {
  var ctx = {
    employment: '',
    economyDescription: '',
    incomeDistribution: { under50k: 0, '50k_100k': 0, '100k_150k': 0, '150k_200k': 0, over200k: 0 },
    medianIncome: 0,
    totalCitizensWithIncome: 0,
    educationDistribution: {},
    householdStats: {
      total: activeHouseholds.length,
      rentBurdenCount: 0,
      averageIncome: 0
    },
    neighborhoodEconomics: []
  };

  // Extract from World_Population row 2
  if (worldPopRaw && worldPopRaw.length >= 2) {
    var headers = worldPopRaw[0] || [];
    var row = worldPopRaw[1] || [];
    var empIdx = headers.indexOf('Employment');
    var econIdx = headers.indexOf('EconomyDescription');
    if (empIdx !== -1) ctx.employment = safe(row[empIdx], '');
    if (econIdx !== -1) ctx.economyDescription = safe(row[econIdx], '');
  }

  // Income distribution from Simulation_Ledger — real dollar amounts
  var allIncomes = [];
  simLedger.forEach(function(c) {
    var income = parseFloat(c.Income);
    if (!income || income <= 0) return;
    allIncomes.push(income);
    if (income < 50000) ctx.incomeDistribution.under50k++;
    else if (income < 100000) ctx.incomeDistribution['50k_100k']++;
    else if (income < 150000) ctx.incomeDistribution['100k_150k']++;
    else if (income < 200000) ctx.incomeDistribution['150k_200k']++;
    else ctx.incomeDistribution.over200k++;
  });

  // Median income
  if (allIncomes.length > 0) {
    var sorted = allIncomes.slice().sort(function(a, b) { return a - b; });
    ctx.medianIncome = sorted[Math.floor(sorted.length / 2)];
  }
  ctx.totalCitizensWithIncome = allIncomes.length;

  // Education distribution from Simulation_Ledger
  simLedger.forEach(function(c) {
    var edu = c.EducationLevel || '';
    if (edu) {
      ctx.educationDistribution[edu] = (ctx.educationDistribution[edu] || 0) + 1;
    }
  });

  // Household income stats
  var totalIncome = 0;
  var incomeCount = 0;
  activeHouseholds.forEach(function(h) {
    var income = parseFloat(h.HouseholdIncome || 0);
    if (income > 0) {
      totalIncome += income;
      incomeCount++;
    }
    var rent = parseFloat(h.MonthlyRent || 0);
    if (income > 0 && rent > 0 && (rent * 12) / income > 0.40) {
      ctx.householdStats.rentBurdenCount++;
    }
  });
  ctx.householdStats.averageIncome = incomeCount > 0 ? Math.round(totalIncome / incomeCount) : 0;

  // Neighborhood economics from Neighborhood_Map
  if (neighborhoodMap && neighborhoodMap.length > 0) {
    ctx.neighborhoodEconomics = neighborhoodMap
      .filter(function(n) { return n.Neighborhood && (parseFloat(n.MedianIncome) > 0); })
      .map(function(n) {
        return {
          neighborhood: n.Neighborhood,
          medianIncome: parseFloat(n.MedianIncome) || 0,
          medianRent: parseFloat(n.MedianRent) || 0
        };
      })
      .sort(function(a, b) { return b.medianIncome - a.medianIncome; });
  }

  return ctx;
}

/**
 * v2.2: Build evening context from Media_Ledger + Cycle_Packet text.
 * Extracts nightlife, food scene, media climate, weather mood, and cultural activity.
 */
function buildEveningContext(cycleMedia, packetText) {
  var ctx = {};

  // Media Ledger entries — structured evening data
  if (cycleMedia.length > 0) {
    ctx.mediaEntries = cycleMedia.map(function(m) {
      return {
        name: m.Name || '',
        role: m.RoleType || m.Role || '',
        neighborhood: m.Neighborhood || '',
        domain: m.CulturalDomain || m.Domain || '',
        nightlifeVolume: parseFloat(m.NightlifeVolume) || 0,
        fameScore: parseInt(m.FameScore) || 0,
        sentiment: m.Sentiment || '',
        economicMood: m.EconomicMood || ''
      };
    });
  }

  // Parse Cycle_Packet text for city dynamics and media climate
  if (packetText) {
    // City Dynamics section
    var dynMatch = packetText.match(/--- CITY DYNAMICS ---\n([\s\S]*?)(?=\n---|\n\n$)/);
    if (dynMatch) {
      ctx.cityDynamics = {};
      var lines = dynMatch[1].split('\n');
      for (var i = 0; i < lines.length; i++) {
        var parts = lines[i].split(':');
        if (parts.length >= 2) {
          var key = parts[0].trim().toLowerCase();
          var val = parseFloat(parts[1].trim());
          if (!isNaN(val)) ctx.cityDynamics[key] = val;
        }
      }
    }

    // Media Climate section
    var mediaMatch = packetText.match(/--- MEDIA CLIMATE ---\n([\s\S]*?)(?=\n---|\n\n$)/);
    if (mediaMatch) {
      ctx.mediaClimate = {};
      var mlines = mediaMatch[1].split('\n');
      for (var j = 0; j < mlines.length; j++) {
        var line = mlines[j].trim();
        if (line.indexOf('Narrative:') === 0) {
          var nparts = line.split('|');
          ctx.mediaClimate.narrative = (nparts[0] || '').replace('Narrative:', '').trim();
          ctx.mediaClimate.intensity = (nparts[1] || '').replace('Intensity:', '').trim();
        }
        if (line.indexOf('Crisis Saturation:') === 0) {
          ctx.mediaClimate.crisisSaturation = line.replace('Crisis Saturation:', '').trim();
        }
        if (line.indexOf('Celebrity Buzz:') === 0) {
          ctx.mediaClimate.celebrityBuzz = line.replace('Celebrity Buzz:', '').trim();
        }
      }
    }

    // Weather Mood section
    var weatherMatch = packetText.match(/--- WEATHER MOOD ---\n([\s\S]*?)(?=\n---|\n\n$)/);
    if (weatherMatch) {
      ctx.weatherMood = {};
      var wlines = weatherMatch[1].split('\n');
      for (var k = 0; k < wlines.length; k++) {
        var wline = wlines[k].trim();
        if (wline.indexOf('Conditions:') === 0) ctx.weatherMood.conditions = wline.replace('Conditions:', '').trim();
        if (wline.indexOf('Mood:') === 0) ctx.weatherMood.mood = wline.replace('Mood:', '').trim();
        if (wline.indexOf('Streak:') === 0) ctx.weatherMood.streak = wline.replace('Streak:', '').trim();
        if (wline.indexOf('Perfect weather') >= 0) ctx.weatherMood.perfectWeather = true;
        if (wline.indexOf('Alerts:') >= 0) ctx.weatherMood.alerts = wline.replace(/.*Alerts:\s*/, '').trim();
      }
    }

    // Extract nightlife and cultural activity from city dynamics
    if (ctx.cityDynamics) {
      ctx.nightlife = ctx.cityDynamics.nightlife || 0;
      ctx.culturalActivity = ctx.cityDynamics.culturalactivity || 0;
      ctx.retail = ctx.cityDynamics.retail || 0;
      ctx.tourism = ctx.cityDynamics.tourism || 0;
    }

    // v3.8: Evening City section (Phase 7 nightlife, restaurants, crowds)
    var eveningMatch = packetText.match(/--- EVENING CITY ---\n([\s\S]*?)(?=\n---|\n\n$)/);
    if (eveningMatch) {
      ctx.eveningCity = {};
      var elines = eveningMatch[1].split('\n');
      for (var ei = 0; ei < elines.length; ei++) {
        var eline = elines[ei].trim();
        if (eline.indexOf('Nightlife:') === 0) ctx.eveningCity.nightlifeSpots = eline.replace('Nightlife:', '').trim();
        if (eline.indexOf('NightlifeVibe:') === 0) ctx.eveningCity.vibe = eline.replace('NightlifeVibe:', '').trim();
        if (eline.indexOf('NightlifeVolume:') === 0) ctx.eveningCity.volume = parseFloat(eline.replace('NightlifeVolume:', '').trim()) || 0;
        if (eline.indexOf('NightlifeMovement:') === 0) ctx.eveningCity.movement = eline.replace('NightlifeMovement:', '').trim();
        if (eline.indexOf('Restaurants:') === 0) ctx.eveningCity.restaurants = eline.replace('Restaurants:', '').trim();
        if (eline.indexOf('FoodTrend:') === 0) ctx.eveningCity.foodTrend = eline.replace('FoodTrend:', '').trim();
        if (eline.indexOf('FastFood:') === 0) ctx.eveningCity.fastFood = eline.replace('FastFood:', '').trim();
        if (eline.indexOf('CrowdHotspots:') === 0) ctx.eveningCity.crowdHotspots = eline.replace('CrowdHotspots:', '').trim();
        if (eline.indexOf('CrowdMap:') === 0) ctx.eveningCity.crowdMap = eline.replace('CrowdMap:', '').trim();
        if (eline.indexOf('EveningSafety:') === 0) ctx.eveningCity.safety = eline.replace('EveningSafety:', '').trim();
        if (eline.indexOf('EveningTraffic:') === 0) ctx.eveningCity.traffic = parseFloat(eline.replace('EveningTraffic:', '').trim()) || 0;
      }
    }

    // v3.8: Crime Snapshot section (Phase 3)
    var crimeMatch = packetText.match(/--- CRIME SNAPSHOT ---\n([\s\S]*?)(?=\n---|\n\n$)/);
    if (crimeMatch) {
      ctx.crimeSnapshot = {};
      var clines = crimeMatch[1].split('\n');
      for (var ci = 0; ci < clines.length; ci++) {
        var cline = clines[ci].trim();
        if (cline.indexOf('PropertyCrime:') === 0) ctx.crimeSnapshot.property = parseFloat(cline.replace('PropertyCrime:', '').trim()) || 0;
        if (cline.indexOf('ViolentCrime:') === 0) ctx.crimeSnapshot.violent = parseFloat(cline.replace('ViolentCrime:', '').trim()) || 0;
        if (cline.indexOf('Incidents:') === 0) ctx.crimeSnapshot.incidents = parseFloat(cline.replace('Incidents:', '').trim()) || 0;
        if (cline.indexOf('ResponseTime:') === 0) ctx.crimeSnapshot.responseTime = cline.replace('ResponseTime:', '').trim();
        if (cline.indexOf('ClearanceRate:') === 0) ctx.crimeSnapshot.clearanceRate = parseFloat(cline.replace('ClearanceRate:', '').trim()) || 0;
        if (cline.indexOf('Hotspots:') === 0) ctx.crimeSnapshot.hotspots = cline.replace('Hotspots:', '').trim();
        if (cline.indexOf('PatrolStrategy:') === 0) ctx.crimeSnapshot.patrolStrategy = cline.replace('PatrolStrategy:', '').trim();
      }
    }

    // v3.8: Transit section (Phase 2)
    var transitMatch = packetText.match(/--- TRANSIT ---\n([\s\S]*?)(?=\n---|\n\n$)/);
    if (transitMatch) {
      ctx.transit = {};
      var tlines = transitMatch[1].split('\n');
      for (var ti = 0; ti < tlines.length; ti++) {
        var tline = tlines[ti].trim();
        if (tline.indexOf('BARTRidership:') === 0) ctx.transit.ridership = parseFloat(tline.replace('BARTRidership:', '').trim()) || 0;
        if (tline.indexOf('OnTimeRate:') === 0) ctx.transit.onTimeRate = parseFloat(tline.replace('OnTimeRate:', '').trim()) || 0;
        if (tline.indexOf('TrafficIndex:') === 0) ctx.transit.trafficIndex = parseFloat(tline.replace('TrafficIndex:', '').trim()) || 0;
        if (tline.indexOf('Alerts:') === 0) ctx.transit.alerts = tline.replace('Alerts:', '').trim();
      }
    }

    // v3.8: Civic Load section (Phase 6)
    var civicMatch = packetText.match(/--- CIVIC LOAD ---\n([\s\S]*?)(?=\n---|\n\n$)/);
    if (civicMatch) {
      ctx.civicLoad = {};
      var cvlines = civicMatch[1].split('\n');
      for (var cvi = 0; cvi < cvlines.length; cvi++) {
        var cvline = cvlines[cvi].trim();
        if (cvline.indexOf('Level:') === 0) ctx.civicLoad.level = cvline.replace('Level:', '').trim();
        if (cvline.indexOf('Score:') === 0) ctx.civicLoad.score = parseFloat(cvline.replace('Score:', '').trim()) || 0;
        if (cvline.indexOf('Factors:') === 0) ctx.civicLoad.factors = cvline.replace('Factors:', '').trim();
        if (cvline.indexOf('StoryHooks:') === 0) ctx.civicLoad.storyHookCount = parseInt(cvline.replace('StoryHooks:', '').trim()) || 0;
        if (cvline.indexOf('  - ') === 0) {
          if (!ctx.civicLoad.storyHooks) ctx.civicLoad.storyHooks = [];
          ctx.civicLoad.storyHooks.push(cvline.replace('  - ', ''));
        }
      }
    }

    // v3.9: Neighborhood Dynamics (Phase 2 per-neighborhood texture)
    var nhDynMatch = packetText.match(/--- NEIGHBORHOOD DYNAMICS ---\n([\s\S]*?)(?=\n---|\n\n$)/);
    if (nhDynMatch) {
      ctx.neighborhoodDynamics = {};
      var ndlines = nhDynMatch[1].split('\n');
      for (var ndi = 0; ndi < ndlines.length; ndi++) {
        var ndline = ndlines[ndi].trim();
        if (!ndline || ndline.indexOf('---') === 0) continue;
        var ndColonIdx = ndline.indexOf(':');
        if (ndColonIdx > 0) {
          var ndHood = ndline.substring(0, ndColonIdx).trim();
          var ndVals = ndline.substring(ndColonIdx + 1).trim();
          ctx.neighborhoodDynamics[ndHood] = {};
          var ndPairs = ndVals.split(',');
          for (var ndp = 0; ndp < ndPairs.length; ndp++) {
            var ndEq = ndPairs[ndp].trim().split('=');
            if (ndEq.length === 2) {
              ctx.neighborhoodDynamics[ndHood][ndEq[0].trim()] = parseFloat(ndEq[1].trim()) || 0;
            }
          }
        }
      }
    }

    // v3.9: Story Hooks (engine says "this is newsworthy")
    var hooksMatch = packetText.match(/--- STORY HOOKS \(\d+\) ---\n([\s\S]*?)(?=\n---|\n\n$)/);
    if (hooksMatch) {
      ctx.storyHooks = [];
      var hklines = hooksMatch[1].split('\n');
      for (var hki = 0; hki < hklines.length; hki++) {
        var hkline = hklines[hki].trim();
        if (hkline.indexOf('- ') === 0) {
          ctx.storyHooks.push(hkline.substring(2));
        }
      }
    }

    // v3.9: Shock Context (Phase 6 anomaly details)
    var shockMatch = packetText.match(/--- SHOCK CONTEXT ---\n([\s\S]*?)(?=\n---|\n\n$)/);
    if (shockMatch) {
      ctx.shockContext = {};
      var sklines = shockMatch[1].split('\n');
      ctx.shockContext.reasons = [];
      for (var ski = 0; ski < sklines.length; ski++) {
        var skline = sklines[ski].trim();
        if (skline.indexOf('Flag:') === 0) ctx.shockContext.flag = skline.replace('Flag:', '').trim();
        if (skline.indexOf('Score:') === 0) ctx.shockContext.score = parseFloat(skline.replace('Score:', '').trim()) || 0;
        if (skline.indexOf('Duration:') === 0) ctx.shockContext.duration = skline.replace('Duration:', '').trim();
        if (skline.indexOf('  - ') === 0) ctx.shockContext.reasons.push(skline.replace('  - ', ''));
      }
    }

    // v3.9: Migration (Phase 6 who's moving where)
    var migMatch = packetText.match(/--- MIGRATION ---\n([\s\S]*?)(?=\n---|\n\n$)/);
    if (migMatch) {
      ctx.migration = {};
      var mglines = migMatch[1].split('\n');
      ctx.migration.byNeighborhood = {};
      var inNeighborhoods = false;
      for (var mgi = 0; mgi < mglines.length; mgi++) {
        var mgline = mglines[mgi].trim();
        if (mgline.indexOf('NetDrift:') === 0) ctx.migration.netDrift = parseFloat(mgline.replace('NetDrift:', '').trim()) || 0;
        if (mgline.indexOf('Inflow:') === 0) ctx.migration.inflow = mgline.replace('Inflow:', '').trim();
        if (mgline.indexOf('Outflow:') === 0) ctx.migration.outflow = mgline.replace('Outflow:', '').trim();
        if (mgline.indexOf('Summary:') === 0) ctx.migration.summary = mgline.replace('Summary:', '').trim();
        if (mgline === 'ByNeighborhood:') { inNeighborhoods = true; continue; }
        if (inNeighborhoods && mgline.indexOf(':') > 0) {
          var mgParts = mgline.split(':');
          ctx.migration.byNeighborhood[mgParts[0].trim()] = parseFloat(mgParts[1].trim()) || 0;
        }
      }
    }

    // v3.9: Spotlight Detail (citizens with names, neighborhoods, reasons)
    var spotMatch = packetText.match(/--- SPOTLIGHT DETAIL ---\n([\s\S]*?)(?=\n---|\n\n$)/);
    if (spotMatch) {
      ctx.spotlightDetail = [];
      var splines = spotMatch[1].split('\n');
      for (var spi = 0; spi < splines.length; spi++) {
        var spline = splines[spi].trim();
        if (spline.indexOf('- ') === 0) {
          ctx.spotlightDetail.push(spline.substring(2));
        }
      }
    }

    // v3.9: Neighborhood Economies (Phase 6 per-neighborhood economic state)
    var nhEconMatch = packetText.match(/--- NEIGHBORHOOD ECONOMIES ---\n([\s\S]*?)(?=\n---|\n\n$)/);
    if (nhEconMatch) {
      ctx.neighborhoodEconomies = {};
      var nelines = nhEconMatch[1].split('\n');
      for (var nei = 0; nei < nelines.length; nei++) {
        var neline = nelines[nei].trim();
        if (!neline) continue;
        var neColonIdx = neline.indexOf(':');
        if (neColonIdx > 0) {
          var neHood = neline.substring(0, neColonIdx).trim();
          ctx.neighborhoodEconomies[neHood] = neline.substring(neColonIdx + 1).trim();
        }
      }
    }

    // v3.9: Cycle Summary (Phase 9 one-line narrative)
    var sumMatch = packetText.match(/--- CYCLE SUMMARY ---\n([\s\S]*?)(?=\n---|\n\n$)/);
    if (sumMatch) {
      ctx.cycleSummary = {};
      var smlines = sumMatch[1].split('\n');
      for (var smi = 0; smi < smlines.length; smi++) {
        var smline = smlines[smi].trim();
        if (smline.indexOf('OneLine:') === 0) ctx.cycleSummary.oneLine = smline.replace('OneLine:', '').trim();
        if (smline.indexOf('Headline:') === 0) ctx.cycleSummary.headline = smline.replace('Headline:', '').trim();
        if (smline.indexOf('KeyEvents:') === 0) ctx.cycleSummary.keyEvents = smline.replace('KeyEvents:', '').trim();
      }
    }

    // v3.9: Demographic Shifts (Phase 3 population movement)
    var demoMatch = packetText.match(/--- DEMOGRAPHIC SHIFTS ---\n([\s\S]*?)(?=\n---|\n\n$)/);
    if (demoMatch) {
      ctx.demographicShifts = [];
      var dmlines = demoMatch[1].split('\n');
      for (var dmi = 0; dmi < dmlines.length; dmi++) {
        var dmline = dmlines[dmi].trim();
        if (dmline.indexOf('- ') === 0) {
          ctx.demographicShifts.push(dmline.substring(2));
        }
      }
    }

    // v3.9: City Events (Phase 4 festivals, openings, rallies)
    var cityEvMatch = packetText.match(/--- CITY EVENTS ---\n([\s\S]*?)(?=\n---|\n\n$)/);
    if (cityEvMatch) {
      ctx.cityEvents = [];
      var celines = cityEvMatch[1].split('\n');
      for (var cei = 0; cei < celines.length; cei++) {
        var celine = celines[cei].trim();
        if (celine.indexOf('- ') === 0) {
          ctx.cityEvents.push(celine.substring(2));
        }
      }
    }
  }

  return ctx;
}

/**
 * Format households for packet inclusion
 */
function formatHouseholdsForPacket(households) {
  return households.map(function(h) {
    var members = [];
    try { members = JSON.parse(h.Members || '[]'); } catch(e) {}
    return {
      householdId: h.HouseholdId || h.householdId || '',
      head: h.HeadOfHousehold || h.headOfHousehold || '',
      type: h.HouseholdType || h.householdType || '',
      neighborhood: h.Neighborhood || h.neighborhood || '',
      housingType: h.HousingType || h.housingType || '',
      memberCount: Array.isArray(members) ? members.length : 0,
      income: parseFloat(h.HouseholdIncome || 0),
      monthlyRent: parseFloat(h.MonthlyRent || h.monthlyRent || 0),
      formedCycle: h.FormedCycle || h.formedCycle || '',
      dissolvedCycle: h.DissolvedCycle || h.dissolvedCycle || '',
      status: h.Status || h.status || ''
    };
  });
}

/**
 * Format bonds for packet inclusion
 */
function formatBondsForPacket(bonds) {
  return bonds.map(function(b) {
    return {
      citizenA: b.CitizenA || '',
      citizenB: b.CitizenB || '',
      bondType: b.BondType || '',
      intensity: parseFloat(b.Intensity || 0),
      status: b.Status || '',
      neighborhood: b.Neighborhood || '',
      domainTag: b.DomainTag || '',
      notes: b.Notes || ''
    };
  }).sort(function(a, b) { return b.intensity - a.intensity; });
}

// ─── STORY CONNECTIONS / ENRICHMENT (v1.4) ──────────────────

/**
 * Build a neighborhood → named citizens index (one-time, pre-loop)
 * Returns: { "Downtown": [{name, popId, tier, occupation}], ... }
 */
function buildNeighborhoodCitizenIndex(simLedger) {
  var index = {};
  simLedger.forEach(function(c) {
    var hood = c.Neighborhood || '';
    var first = c.First || '';
    var last = c.Last || '';
    var name = (first + ' ' + last).trim();
    if (!hood || !name) return;
    if (!index[hood]) index[hood] = [];
    index[hood].push({
      name: name,
      popId: c.POPID || '',
      tier: c.Tier || '',
      occupation: c.RoleType || ''
    });
  });
  return index;
}

/**
 * For each desk event, find named citizens who live in that neighborhood.
 * Returns array of {event, neighborhood, domain, severity, citizens[]}
 * Does NOT mutate original events.
 */
function buildEventCitizenLinks(deskEvents, neighborhoodIndex) {
  var links = [];
  deskEvents.forEach(function(e) {
    var hood = e.Neighborhood || '';
    var citizens = (neighborhoodIndex[hood] || []).slice(0, 5);
    if (citizens.length > 0) {
      links.push({
        event: (e.EventDescription || e.description || '').substring(0, 120),
        neighborhood: hood,
        domain: e.Domain || '',
        severity: e.Severity || '',
        citizens: citizens.map(function(c) {
          return { name: c.name, popId: c.popId, occupation: c.occupation };
        })
      });
    }
  });
  return links;
}

/**
 * Tag passed/failed/active initiatives with affected neighborhoods and citizens.
 * Returns array of {initiative, status, domain, neighborhoods[], citizens[], voteResult}
 */
function buildCivicConsequences(initiatives, neighborhoodIndex) {
  return initiatives
    .filter(function(i) {
      var status = (i.Status || '').toLowerCase();
      return status === 'passed' || status === 'failed' || status === 'active';
    })
    .map(function(i) {
      var hoodsRaw = i.AffectedNeighborhoods || i.Neighborhood || '';
      var hoods = hoodsRaw.split(/[,;|]/).map(function(s) { return s.trim(); }).filter(Boolean);
      var citizens = [];
      hoods.forEach(function(h) {
        (neighborhoodIndex[h] || []).slice(0, 3).forEach(function(c) {
          citizens.push({ name: c.name, neighborhood: h, occupation: c.occupation });
        });
      });
      return {
        initiative: i.Name || i.InitiativeName || '',
        status: i.Status || '',
        domain: i.PolicyDomain || i.Domain || '',
        neighborhoods: hoods,
        citizens: citizens.slice(0, 12),
        voteResult: i.VoteResult || i.Result || i.Outcome || '',
        implementationPhase: i.ImplementationPhase || null,
        nextScheduledAction: i.NextScheduledAction || null,
        nextActionCycle: i.NextActionCycle ? parseInt(i.NextActionCycle) : null
      };
    })
    .filter(function(c) { return c.citizens.length > 0; });
}

/**
 * For a set of citizen names, build a map of name → strongest bonds.
 * Returns: { "Alice Wong": [{partner, bondType, intensity, domain}], ... }
 */
function buildCitizenBondMap(citizenNames, activeBonds) {
  var map = {};
  citizenNames.forEach(function(name) {
    var bonds = activeBonds.filter(function(b) {
      return b.CitizenA === name || b.CitizenB === name;
    });
    if (bonds.length > 0) {
      map[name] = bonds.map(function(b) {
        return {
          partner: b.CitizenA === name ? b.CitizenB : b.CitizenA,
          bondType: b.BondType || '',
          intensity: parseFloat(b.Intensity || 0),
          domain: b.DomainTag || ''
        };
      }).sort(function(a, b) { return b.intensity - a.intensity; }).slice(0, 5);
    }
  });
  return map;
}

/**
 * Scan previous edition text for citizen names.
 * Returns set-like object: { "Carmen Delaine": true, ... }
 */
function buildCoverageEchoMap(prevEdition, simLedger) {
  if (!prevEdition) return {};
  var echo = {};
  simLedger.forEach(function(c) {
    var name = c.Name || c.CitizenName || '';
    if (name && name.length > 4 && prevEdition.indexOf(name) !== -1) {
      echo[name] = true;
    }
  });
  return echo;
}

/**
 * For a set of citizen names, pull their most recent LifeHistory entries.
 * Returns: { "Marcus Chen": [{cycle, tag, note, mood}], ... }
 */
function buildCitizenLifeContext(citizenNames, allHistory, limit) {
  limit = limit || 3;
  // Pre-build a name → entries index for performance (avoid N*M scan)
  var historyByName = {};
  allHistory.forEach(function(h) {
    var name = h.Name || h.CitizenName || '';
    if (!name) return;
    if (!historyByName[name]) historyByName[name] = [];
    historyByName[name].push(h);
  });

  var context = {};
  citizenNames.forEach(function(name) {
    var entries = historyByName[name];
    if (entries && entries.length > 0) {
      context[name] = entries.slice(-limit).map(function(h) {
        return {
          cycle: h.Cycle || '',
          tag: h.EventTag || '',
          note: (h.EventNote || '').substring(0, 150),
          mood: h.MoodShift || ''
        };
      });
    }
  });
  return context;
}

/**
 * Assemble the storyConnections enrichment object for a desk packet.
 */
function buildStoryConnections(deskEvents, deskCitizenNames, initiatives, activeBonds,
                                allHistory, neighborhoodIndex, coverageEchoMap, deskId) {
  // Event → citizen links
  var eventLinks = buildEventCitizenLinks(deskEvents, neighborhoodIndex);

  // Civic consequences (civic + letters desks get full view, others get their domain)
  var civicConsequences = (deskId === 'civic' || deskId === 'letters')
    ? buildCivicConsequences(initiatives, neighborhoodIndex)
    : [];

  // Per-citizen bond map
  var bondMap = buildCitizenBondMap(deskCitizenNames, activeBonds);

  // Per-citizen recent life context
  var lifeContext = buildCitizenLifeContext(deskCitizenNames, allHistory, 3);

  // Coverage echo — which desk citizens were in last edition
  var recentlyCovered = deskCitizenNames.filter(function(name) {
    return coverageEchoMap[name];
  });

  return {
    eventCitizenLinks: eventLinks,
    civicConsequences: civicConsequences,
    citizenBonds: bondMap,
    citizenLifeContext: lifeContext,
    coverageEcho: recentlyCovered,
    enrichmentNote: eventLinks.length + ' event-citizen links, ' +
                    Object.keys(bondMap).length + ' citizens with bonds, ' +
                    Object.keys(lifeContext).length + ' with life context, ' +
                    recentlyCovered.length + ' recently covered'
  };
}

// ─── SPORTS FEED DIGEST (v1.5) ──────────────────────────────

/**
 * Parse sports feed entries into a structured digest.
 * Handles both new structured format (EventType taxonomy) and legacy freeform entries.
 * Returns: { gameResults, rosterMoves, playerFeatures, frontOffice, fanCivic,
 *            editorialNotes, currentRecord, seasonState, activeStoryAngles,
 *            playerMoods, teamMomentum, digestNote }
 */
function buildSportsFeedDigest(feedEntries, storylines, teamLabel) {
  if (!feedEntries || feedEntries.length === 0) {
    return { empty: true, teamLabel: teamLabel || '', digestNote: 'No feed entries' };
  }

  var gameResults = [];
  var rosterMoves = [];
  var playerFeatures = [];
  var frontOffice = [];
  var fanCivic = [];
  var editorialNotes = [];
  var seasonStateEntries = [];
  var uncategorized = [];

  // Track across all entries
  var latestRecord = '';
  var latestSeasonState = '';
  var allPlayerMoods = {};
  var allStoryAngles = [];
  var allNamesUsed = {};

  // Franchise context — latest non-empty value wins
  var franchiseContext = {
    fanSentiment: '',
    franchiseStability: '',
    economicFootprint: '',
    communityInvestment: '',
    mediaProfile: ''
  };

  feedEntries.forEach(function(entry) {
    var eventType = (entry.EventType || entry.eventType || '').toString().trim().toLowerCase();
    var notes = (entry.Notes || entry.notes || '').toString().trim();
    var stats = (entry.Stats || entry.stats || '').toString().trim();
    var record = (entry['Team Record'] || entry.TeamRecord || entry.teamRecord || '').toString().trim();
    var seasonState = (entry.SeasonState || entry.seasonState || entry.SeasonType || entry.seasonType || '').toString().trim().toLowerCase();
    var storyAngle = (entry.StoryAngle || entry.storyAngle || '').toString().trim();
    var playerMood = (entry.PlayerMood || entry.playerMood || '').toString().trim().toLowerCase();
    var namesRaw = (entry.NamesUsed || entry.namesUsed || '').toString().trim();
    var neighborhood = (entry.HomeNeighborhood || entry.homeNeighborhood || '').toString().trim();
    var trigger = (entry.EventTrigger || entry.eventTrigger || '').toString().trim();
    var cycle = (entry.Cycle || entry.cycle || '').toString().trim();

    // Track latest record and season state
    if (record) latestRecord = record;
    if (seasonState) latestSeasonState = seasonState;

    // Track franchise context — latest non-empty value wins
    var fs = (entry.FanSentiment || '').toString().trim();
    var fst = (entry.FranchiseStability || '').toString().trim();
    var ef = (entry.EconomicFootprint || '').toString().trim();
    var ci = (entry.CommunityInvestment || '').toString().trim();
    var mp = (entry.MediaProfile || '').toString().trim();
    if (fs) franchiseContext.fanSentiment = fs;
    if (fst) franchiseContext.franchiseStability = fst;
    if (ef) franchiseContext.economicFootprint = ef;
    if (ci) franchiseContext.communityInvestment = ci;
    if (mp) franchiseContext.mediaProfile = mp;

    // Parse player names
    var names = namesRaw.split(/[,;]/).map(function(n) { return n.trim(); }).filter(Boolean);
    names.forEach(function(n) { allNamesUsed[n] = true; });

    // Track story angles
    if (storyAngle) allStoryAngles.push(storyAngle);

    // Track player moods
    if (playerMood && names.length > 0) {
      names.forEach(function(n) { allPlayerMoods[n] = playerMood; });
    }

    // Build structured entry
    var structured = {
      cycle: cycle,
      names: names,
      notes: notes.substring(0, 250),
      neighborhood: neighborhood
    };
    if (stats) structured.stats = stats;
    if (record) structured.record = record;
    if (storyAngle) structured.storyAngle = storyAngle;
    if (playerMood) structured.playerMood = playerMood;
    if (trigger) structured.trigger = trigger;

    // Route by event type
    if (eventType === 'game-result' || eventType === 'game' || eventType === 'result') {
      // Parse score from notes if present
      var scoreMatch = notes.match(/(\d+)\s*[-–,]\s*(\w+)\s+(\d+)/);
      if (scoreMatch) {
        structured.scoreLine = scoreMatch[0];
      }
      gameResults.push(structured);
    } else if (eventType === 'roster-move' || eventType === 'roster' || eventType === 'trade' || eventType === 'injury') {
      rosterMoves.push(structured);
    } else if (eventType === 'player-feature' || eventType === 'feature' || eventType === 'community') {
      playerFeatures.push(structured);
    } else if (eventType === 'front-office' || eventType === 'front office' || eventType === 'coaching') {
      frontOffice.push(structured);
    } else if (eventType === 'fan-civic' || eventType === 'civic' || eventType === 'fan' || eventType === 'stadium') {
      fanCivic.push(structured);
    } else if (eventType === 'season-state' || eventType === 'season' || eventType === 'standings') {
      seasonStateEntries.push(structured);
    } else if (eventType === 'editorial-note' || eventType === 'editorial' || eventType === 'note') {
      editorialNotes.push(structured);
    } else {
      // Legacy entries without taxonomy — try to infer from content
      var notesLower = notes.toLowerCase();
      if (notesLower.match(/\d+\s*[-–]\s*\d+/) && notesLower.match(/pts|ast|reb|hr|rbi|era/i)) {
        gameResults.push(structured);
      } else if (notesLower.match(/trade|sign|cut|waiv|injur|IR|DL/i)) {
        rosterMoves.push(structured);
      } else if (notesLower.match(/communit|charit|clinic|event|appearance/i)) {
        playerFeatures.push(structured);
      } else if (notesLower.match(/GM|front office|coach|hire|fire|draft/i)) {
        frontOffice.push(structured);
      } else if (notesLower.match(/stadium|fan|civic|environment|media avail/i)) {
        fanCivic.push(structured);
      } else {
        uncategorized.push(structured);
      }
    }
  });

  // Cross-reference with storylines for active story angles
  var storylineAngles = (storylines || [])
    .filter(function(s) {
      var desc = (s.description || s.Description || '').toLowerCase();
      var status = (s.status || s.Status || '').toLowerCase();
      return (status === 'active' || s.type === 'new' || s.type === 'developing') &&
             Object.keys(allNamesUsed).some(function(name) {
               return desc.indexOf(name.toLowerCase()) !== -1;
             });
    })
    .map(function(s) {
      return {
        description: s.description || s.Description || '',
        status: s.status || s.Status || '',
        cycleAdded: s.cycleAdded || s.CycleAdded || '',
        priority: s.priority || s.Priority || ''
      };
    });

  // Derive team momentum from recent entries
  var momentum = 'steady';
  if (latestRecord) {
    var winPct = parseWinPctFromRecord(latestRecord);
    if (winPct !== null) {
      if (winPct >= 0.600) momentum = 'rising';
      else if (winPct >= 0.500) momentum = 'steady';
      else if (winPct >= 0.400) momentum = 'struggling';
      else momentum = 'sinking';
    }
  }
  // Adjust for mood signals
  var moodValues = Object.values(allPlayerMoods);
  var positiveCount = moodValues.filter(function(m) {
    return m === 'confident' || m === 'dominant' || m === 'locked-in';
  }).length;
  var negativeCount = moodValues.filter(function(m) {
    return m === 'frustrated' || m === 'uncertain';
  }).length;
  if (positiveCount > negativeCount + 1) momentum = 'rising';
  if (negativeCount > positiveCount + 1 && momentum !== 'sinking') momentum = 'struggling';

  // Only include franchise context if any field is populated
  var hasFranchiseContext = franchiseContext.fanSentiment || franchiseContext.franchiseStability ||
    franchiseContext.economicFootprint || franchiseContext.communityInvestment || franchiseContext.mediaProfile;

  var digest = {
    teamLabel: teamLabel || '',
    currentRecord: latestRecord,
    seasonState: latestSeasonState,
    teamMomentum: momentum,
    franchiseContext: hasFranchiseContext ? franchiseContext : null,
    gameResults: gameResults,
    rosterMoves: rosterMoves,
    playerFeatures: playerFeatures,
    frontOffice: frontOffice,
    fanCivic: fanCivic,
    editorialNotes: editorialNotes,
    activeStoryAngles: allStoryAngles,
    playerMoods: allPlayerMoods,
    relatedStorylines: storylineAngles.slice(0, 8),
    digestNote: gameResults.length + ' games, ' +
                rosterMoves.length + ' roster moves, ' +
                playerFeatures.length + ' features, ' +
                frontOffice.length + ' front office, ' +
                fanCivic.length + ' fan/civic, ' +
                Object.keys(allPlayerMoods).length + ' player moods'
  };

  // Include uncategorized if any (legacy entries)
  if (uncategorized.length > 0) {
    digest.uncategorized = uncategorized;
    digest.digestNote += ', ' + uncategorized.length + ' uncategorized (legacy format)';
  }

  return digest;
}

/**
 * Parse win percentage from record string like "39-16" → 0.709
 */
function parseWinPctFromRecord(record) {
  if (!record) return null;
  var match = record.match(/(\d+)\s*[-–]\s*(\d+)/);
  if (!match) return null;
  var wins = parseInt(match[1], 10);
  var losses = parseInt(match[2], 10);
  var total = wins + losses;
  if (total === 0) return null;
  return wins / total;
}

// ─── MAIN ──────────────────────────────────────────────────

async function main() {
  console.log('=== buildDeskPackets v1.8 (Auto Archive Context) ===');
  console.log('Cycle:', CYCLE);
  console.log('Pulling live data from Google Sheets...\n');

  // ── Pull all sheet data in parallel ──
  // Each fetch wrapped with sheet name for diagnostics on failure
  var startTime = Date.now();
  function safeGet(sheetName) {
    return sheets.getSheetData(sheetName).catch(function(err) {
      console.error('  WARN: Failed to fetch ' + sheetName + ': ' + err.message);
      return [];
    });
  }
  var [
    seedsRaw, hooksRaw, eventsRaw, arcsRaw,
    civicRaw, initiativeRaw, simRaw, genericRaw,
    chicagoRaw, culturalRaw, oakSportsRaw, chiSportsRaw,
    storylineRaw, packetRaw, historyRaw,
    householdRaw, bondsRaw, worldPopRaw, simCalRaw,
    neighborhoodMapRaw, businessLedgerRaw, mediaLedgerRaw
  ] = await Promise.all([
    safeGet('Story_Seed_Deck'),
    safeGet('Story_Hook_Deck'),
    safeGet('WorldEvents_V3_Ledger'),
    safeGet('Event_Arc_Ledger'),
    safeGet('Civic_Office_Ledger'),
    safeGet('Initiative_Tracker'),
    safeGet('Simulation_Ledger'),
    safeGet('Generic_Citizens'),
    safeGet('Chicago_Citizens'),
    safeGet('Cultural_Ledger'),
    safeGet('Oakland_Sports_Feed'),
    safeGet('Chicago_Sports_Feed'),
    safeGet('Storyline_Tracker'),
    safeGet('Cycle_Packet'),
    safeGet('LifeHistory_Log'),
    safeGet('Household_Ledger'),
    safeGet('Relationship_Bonds'),
    safeGet('World_Population'),
    safeGet('Simulation_Calendar'),
    safeGet('Neighborhood_Map'),
    safeGet('Business_Ledger'),
    safeGet('Media_Ledger')
  ]);

  console.log('Sheets pulled in ' + (Date.now() - startTime) + 'ms');

  // ── Filter to current cycle where applicable ──
  var seeds = filterByCycle(seedsRaw, CYCLE).filter(function(s) {
    return parseInt(s.Priority || '1') > 1;  // Drop Priority 1 filler seeds
  });
  var hooks = filterByCycle(hooksRaw, CYCLE);
  var events = filterByCycle(eventsRaw, CYCLE);
  // Press_Drafts removed S98 — draftsRaw no longer fetched
  var prevDrafts = [];
  var allDrafts = [];

  // ── Pull historical events for anomaly detection baseline (last 10 cycles) ──
  var historicalEvents = [];
  var allEvents = allToObjects(eventsRaw);
  for (var i = Math.max(1, CYCLE - 10); i < CYCLE; i++) {
    var cycleEvents = allEvents.filter(function(e) {
      return parseInt(e.Cycle || e.CycleId) === i;
    });
    historicalEvents = historicalEvents.concat(cycleEvents);
  }
  console.log('  Historical events (baseline):', historicalEvents.length);

  // Arcs: get active (not resolved)
  var allArcs = allToObjects(arcsRaw);
  var arcs = allArcs.filter(function(a) {
    return (a.Phase || '').toLowerCase() !== 'resolved' && a.ArcId;
  });

  // Civic and initiatives (filter empty rows — sheet has 1000 rows, ~35 filled)
  var civicOfficers = allToObjects(civicRaw).filter(function(o) { return o.Title; });
  var initiatives = allToObjects(initiativeRaw);

  // Citizens
  var simLedger = allToObjects(simRaw);
  // v2.0: Index simLedger by name for fast citizen lookups
  var simLedgerByName = {};
  simLedger.forEach(function(c) {
    var name = ((c.First || '') + ' ' + (c.Last || '')).trim();
    if (name) simLedgerByName[name] = c;
  });
  var genericCitizens = allToObjects(genericRaw);
  var chicagoCitizens = allToObjects(chicagoRaw);

  // Cultural
  var culturalLedger = allToObjects(culturalRaw);

  // Sports feeds: current cycle for desk packets, full history for roster building
  var allOakSports = allToObjects(oakSportsRaw);
  var allChiSports = allToObjects(chiSportsRaw);
  var oakSports = filterByCycle(oakSportsRaw, CYCLE);
  if (oakSports.length === 0) oakSports = allOakSports; // fallback to all
  var chiSports = filterByCycle(chiSportsRaw, CYCLE);
  if (chiSports.length === 0) chiSports = allChiSports;

  // Storylines: active/recent
  var allStorylines = allToObjects(storylineRaw);
  var storylines = allStorylines.filter(function(s) {
    var status = (s.Status || '').toLowerCase();
    return status === 'active' || status === 'new' || status === 'developing' ||
           status === 'urgent' || status === 'high';
  });

  // Recent quotes from LifeHistory
  var allHistory = allToObjects(historyRaw);
  var recentQuotes = allHistory.filter(function(h) {
    return (h.EventTag || '').toLowerCase() === 'quoted' &&
           String(h.Cycle) === String(CYCLE);
  });

  // Households: active + recently formed/dissolved this cycle
  var allHouseholds = allToObjects(householdRaw);
  var activeHouseholds = allHouseholds.filter(function(h) {
    return (h.Status || '').toLowerCase() === 'active';
  });
  var cycleHouseholdEvents = allHouseholds.filter(function(h) {
    return String(h.FormedCycle) === String(CYCLE) ||
           String(h.DissolvedCycle) === String(CYCLE);
  });

  // Relationship bonds: active, interesting intensity
  var allBonds = allToObjects(bondsRaw);
  var activeBonds = allBonds.filter(function(b) {
    var status = (b.Status || '').toLowerCase();
    var intensity = parseFloat(b.Intensity || 0);
    return status !== 'dissolved' && status !== 'broken' && intensity >= 3;
  });

  // Neighborhood Map: economic data per neighborhood
  var neighborhoodMap = allToObjects(neighborhoodMapRaw);

  // Business Ledger
  var businesses = allToObjects(businessLedgerRaw);
  // v2.1: Index businesses by BIZ_ID for citizen employer lookups
  var bizByIdMap = {};
  businesses.forEach(function(b) {
    var bid = (b.BIZ_ID || '').trim();
    if (bid) bizByIdMap[bid] = b;
  });

  // v2.2: Media Ledger — evening media, nightlife, cultural activity
  var allMedia = allToObjects(mediaLedgerRaw);
  var cycleMedia = allMedia.filter(function(m) {
    return String(m.Cycle) === String(CYCLE);
  });
  console.log('  Media Ledger entries (C' + CYCLE + '):', cycleMedia.length);

  // v2.2: Parse Cycle_Packet for evening context (city dynamics, media climate)
  var cyclePacketText = '';
  var allPackets = allToObjects(packetRaw);
  var currentPacket = allPackets.filter(function(p) {
    return String(p.Cycle) === String(CYCLE);
  });
  if (currentPacket.length > 0) {
    cyclePacketText = currentPacket[0].PacketText || '';
  }
  var eveningContext = buildEveningContext(cycleMedia, cyclePacketText);
  console.log('  Evening context:', eveningContext.nightlife ? 'populated' : 'empty',
              '| Media entries:', (eveningContext.mediaEntries || []).length,
              '| Dynamics:', eveningContext.cityDynamics ? 'yes' : 'no',
              '| v3.9: hooks=' + (eveningContext.storyHooks || []).length,
              'hoods=' + Object.keys(eveningContext.neighborhoodDynamics || {}).length,
              'nhEcon=' + Object.keys(eveningContext.neighborhoodEconomies || {}).length,
              'shock=' + (eveningContext.shockContext ? 'yes' : 'no'),
              'migration=' + (eveningContext.migration ? 'yes' : 'no'),
              'summary=' + (eveningContext.cycleSummary ? 'yes' : 'no'));

  // v2.2: Civic events from LifeHistory_Log — CIVIC clock mode events this cycle
  var civicEvents = allHistory.filter(function(h) {
    return String(h.Cycle) === String(CYCLE) &&
           ((h.Category || '').toUpperCase() === 'CIVIC' ||
            (h.EventTag || '').toUpperCase() === 'CIVIC_MODE' ||
            (h.NeighborhoodOrEngine || '').toUpperCase() === 'CIVIC_ENGINE');
  });
  console.log('  Civic events (C' + CYCLE + '):', civicEvents.length);

  // v2.2: Arc-citizen links from LifeHistory_Log — find citizens mentioned in arc events
  var arcCitizenMap = {};
  allHistory.forEach(function(h) {
    if (String(h.Cycle) === String(CYCLE) && h.Category === 'ARC' && h.POPID) {
      var arcId = (h.EventTag || '').replace('ARC_', '');
      if (!arcCitizenMap[arcId]) arcCitizenMap[arcId] = [];
      arcCitizenMap[arcId].push({ popId: h.POPID, name: h.Name || '' });
    }
  });

  // Economic context from World_Population + Simulation_Ledger + Neighborhood_Map
  var economicContext = buildEconomicContext(worldPopRaw, simLedger, activeHouseholds, neighborhoodMap);

  // v2.1: Business snapshot from Business_Ledger
  economicContext.businessSnapshot = businesses
    .filter(function(b) { return b.Name && (parseInt(b.Employee_Count) > 0 || b.Sector); })
    .map(function(b) {
      return {
        bizId: (b.BIZ_ID || '').trim(),
        name: b.Name,
        sector: b.Sector || '',
        neighborhood: b.Neighborhood || '',
        employeeCount: parseInt(b.Employee_Count) || 0,
        avgSalary: parseInt(String(b.Avg_Salary || '0').replace(/[$,\s]/g, '')) || 0,
        growthRate: b.Growth_Rate || ''
      };
    })
    .sort(function(a, b) { return b.employeeCount - a.employeeCount; });

  console.log('\nData counts:');
  console.log('  Seeds (C' + CYCLE + '):', seeds.length);
  console.log('  Hooks (C' + CYCLE + '):', hooks.length);
  console.log('  Events (C' + CYCLE + '):', events.length);
  console.log('  Active Arcs:', arcs.length);
  console.log('  Civic Officers:', civicOfficers.length);
  console.log('  Initiatives:', initiatives.length);
  console.log('  Sim Ledger:', simLedger.length);
  console.log('  Generic Citizens:', genericCitizens.length);
  console.log('  Chicago Citizens:', chicagoCitizens.length);
  console.log('  Cultural Entities:', culturalLedger.length);
  console.log('  Oakland Sports:', oakSports.length);
  console.log('  Chicago Sports:', chiSports.length);
  console.log('  Active Storylines:', storylines.length);
  console.log('  Previous Drafts (C' + (CYCLE - 1) + '):', prevDrafts.length);
  console.log('  Recent Quotes:', recentQuotes.length);
  console.log('  Active Households:', activeHouseholds.length);
  console.log('  Household Events (C' + CYCLE + '):', cycleHouseholdEvents.length);
  console.log('  Active Bonds (intensity>=3):', activeBonds.length);
  console.log('  Economy:', economicContext.economyDescription || '(no description)');
  console.log('  Median Income: $' + (economicContext.medianIncome || 0).toLocaleString(),
              '| Citizens w/income:', economicContext.totalCitizensWithIncome,
              '| Neighborhoods:', economicContext.neighborhoodEconomics.length,
              '| Businesses:', (economicContext.businessSnapshot || []).length);

  // ── Read local files ──
  var maraText = '';
  if (fs.existsSync(MARA_PATH)) {
    maraText = fs.readFileSync(MARA_PATH, 'utf-8');
    console.log('  Mara directive: loaded (' + maraText.length + ' chars)');
  } else {
    console.log('  Mara directive: not found at ' + MARA_PATH);
  }

  var roster = JSON.parse(fs.readFileSync(ROSTER_PATH, 'utf-8'));
  console.log('  Roster: loaded');

  var prevEdition = '';
  if (fs.existsSync(PREV_EDITION_PATH)) {
    prevEdition = fs.readFileSync(PREV_EDITION_PATH, 'utf-8');
    console.log('  Previous edition: loaded (' + prevEdition.length + ' chars)');
  }

  var popIdIndex = parsePopIdIndex(POPID_INDEX_PATH);
  console.log('  POPID index: ' + Object.keys(popIdIndex).length + ' citizens loaded');

  // ── Build enrichment indexes (one-time, reused per desk) ──
  var neighborhoodCitizenIndex = buildNeighborhoodCitizenIndex(simLedger);
  var coverageEchoMap = buildCoverageEchoMap(prevEdition, simLedger);
  console.log('  Neighborhood citizen index:', Object.keys(neighborhoodCitizenIndex).length, 'neighborhoods mapped');
  console.log('  Coverage echo:', Object.keys(coverageEchoMap).length, 'citizens from previous edition');

  // ── Build base context ──
  // Calendar from Simulation_Calendar sheet — the simulation's own timeline.
  // NEVER derive from system date. GodWorld is its own world.
  var monthNames = ['','January','February','March','April','May','June',
    'July','August','September','October','November','December'];
  var seasonFromCal = '';
  var monthFromCal = '';
  var holidayFromCal = 'none';
  var simYear = '';
  var simMonth = 0;
  var isFirstFridayFromCal = false;
  var isCreationDayFromCal = false;
  if (simCalRaw.length <= 1) {
    console.warn('  WARN: Simulation_Calendar is empty — season/month/holiday will default to "unknown"');
  }
  if (simCalRaw.length > 1) {
    var calRow = simCalRaw[1]; // row 0 is headers
    simYear = calRow[0] || '';
    simMonth = parseInt(calRow[1]) || 0;
    monthFromCal = monthNames[simMonth] || '';
    seasonFromCal = calRow[3] || '';
    holidayFromCal = calRow[4] || 'none';

    // Derive isFirstFriday/isCreationDay from cycle number
    // Same logic as advanceSimulationCalendar.js
    var cycleOfYear = ((CYCLE - 1) % 52) + 1;
    var firstFridayCycles = [1, 6, 10, 14, 18, 23, 27, 31, 36, 40, 45, 49];
    isFirstFridayFromCal = firstFridayCycles.indexOf(cycleOfYear) >= 0;
    isCreationDayFromCal = (cycleOfYear === 48);
  }

  // CLI overrides: --season Summer --month August --holiday "none" --sports-season mid-season
  var cliSeason = getCliArg('--season');
  var cliMonth = getCliArg('--month');
  var cliHoliday = getCliArg('--holiday');
  var cliSportsSeason = getCliArg('--sports-season');

  var baseContext = {
    cycle: CYCLE,
    simYear: simYear,
    season: cliSeason || seasonFromCal || 'unknown',
    month: cliMonth || monthFromCal || 'unknown',
    holiday: {
      name: cliHoliday || holidayFromCal,
      priority: holidayFromCal !== 'none' ? 'active' : 'none'
    },
    isFirstFriday: isFirstFridayFromCal,
    isCreationDay: isCreationDayFromCal,
    sportsSeason: cliSportsSeason || '',
    weather: extractWeatherFromEvents(events),
    sentiment: extractFieldFromEvents(events, 'CitySentiment'),
    cycleWeight: determineCycleWeight(events),
    economicContext: economicContext
  };

  // ── Build canon sections (shared data) ──
  var canon = {
    council: buildCouncil(civicOfficers),
    pendingVotes: buildPendingVotes(initiatives),
    statusAlerts: buildStatusAlerts(civicOfficers),
    recentOutcomes: buildRecentOutcomes(initiatives),
    executiveBranch: buildExecutiveBranch(civicOfficers),
    asRoster: buildAsRoster(simLedger),
    bullsRoster: buildBullsRoster(simLedger, allChiSports),
    culturalEntities: buildCulturalEntitiesCanon(culturalLedger),
    reporters: buildReporterList(roster)
  };

  console.log('\nCanon built:');
  console.log('  Council members:', canon.council.length);
  console.log('  Pending votes:', canon.pendingVotes.length);
  console.log('  Status alerts:', canon.statusAlerts.length);
  console.log('  Executive branch — Mayor:', canon.executiveBranch.mayor || '(not found)');
  console.log('  A\'s roster:', canon.asRoster.length);
  console.log('  Bulls roster:', canon.bullsRoster.length);
  console.log('  Cultural entities:', canon.culturalEntities.length);
  console.log('  Reporters:', canon.reporters.length);

  // ── Build per-desk packets ──
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.mkdirSync(path.join(PROJECT_ROOT, 'output/desk-briefings'), { recursive: true });

  var manifest = {
    cycle: CYCLE,
    generator: 'buildDeskPackets v1.7',
    packets: []
  };

  for (var deskId in DESKS) {
    var desk = DESKS[deskId];
    console.log('\n--- Building ' + desk.name + ' ---');

    // Filter events by domain
    var deskEvents = desk.domains.indexOf('ALL') !== -1 ? events :
      events.filter(function(e) {
        var targetDesks = getDesksForDomain(e.Domain, e.EventDescription);
        return targetDesks.indexOf(deskId) !== -1;
      });

    // Apply anomaly detection and priority scoring to events
    deskEvents = detectAnomalies(deskEvents, historicalEvents);
    deskEvents = flagTopPriority(deskEvents, 3);

    // Filter seeds by domain
    var deskSeeds = desk.domains.indexOf('ALL') !== -1 ? seeds :
      seeds.filter(function(s) {
        var targetDesks = getDesksForDomain(s.Domain, s.SeedText);
        return targetDesks.indexOf(deskId) !== -1;
      });

    // Add priority scores to seeds
    deskSeeds = addPriorityScores(deskSeeds, 0);
    deskSeeds = flagTopPriority(deskSeeds, 3);

    // Filter hooks by domain
    var deskHooks = desk.domains.indexOf('ALL') !== -1 ? hooks :
      hooks.filter(function(h) {
        var targetDesks = getDesksForDomain(h.Domain, h.HookText);
        return targetDesks.indexOf(deskId) !== -1;
      });

    // Add priority scores to hooks
    deskHooks = addPriorityScores(deskHooks, 0);
    deskHooks = flagTopPriority(deskHooks, 3);

    // Filter arcs by domain
    var deskArcs = desk.domains.indexOf('ALL') !== -1 ? arcs :
      arcs.filter(function(a) {
        var targetDesks = getDesksForDomain(a.DomainTag, a.Summary);
        return targetDesks.indexOf(deskId) !== -1;
      });

    // Filter storylines by keywords, cap at 25 per desk (letters gets 30)
    var maxStorylines = deskId === 'letters' ? 30 : 25;
    var seenDescriptions = {};
    var deskStorylines = storylines.filter(function(s) {
      var desc = (s.Description || '').trim();
      if (!desc || seenDescriptions[desc]) return false;
      seenDescriptions[desc] = true;
      return matchesStorylineKeywords(
        desc + ' ' + (s.StorylineType || '') + ' ' + (s.Neighborhood || '') + ' ' + (s.RelatedCitizens || ''),
        desk.storylineKeywords
      );
    }).slice(0, maxStorylines);

    // Filter cultural entities
    var deskCultural = filterCulturalByDomain(culturalLedger, desk.domains);

    // Get reporters for this desk
    var reporters = extractReportersForDesk(roster, desk.rosterDeskKeys);
    var reporterNames = reporters.map(function(r) { return r.name; });

    // Get interview candidates from neighborhoods in this desk's data
    var neighborhoods = getDeskNeighborhoods(deskEvents, deskSeeds, deskArcs);
    var candidates = getInterviewCandidates(simLedger, neighborhoods, bizByIdMap);

    // Get previous coverage + full reporter history
    var prevCoverage = extractPreviousCoverage(prevEdition, reporterNames);
    var reporterHistory = buildReporterHistory(allDrafts, reporterNames);

    // Build canon reference for this desk (must precede citizen name extraction)
    var deskCanon = { reporters: canon.reporters };
    for (var ci = 0; ci < desk.canonSections.length; ci++) {
      var section = desk.canonSections[ci];
      deskCanon[section] = canon[section];
    }

    // Recent quotes for this desk (must precede citizen name extraction)
    var deskQuotes = desk.domains.indexOf('ALL') !== -1 ? recentQuotes :
      recentQuotes.filter(function(q) {
        return matchesStorylineKeywords(
          (q.EventNote || '') + ' ' + (q.Name || ''),
          desk.storylineKeywords
        );
      });

    // Build citizen archive for this desk's relevant citizens
    var deskCitizenNames = getCitizenNamesFromDeskData(deskEvents, deskSeeds, deskHooks, deskArcs, deskStorylines, candidates, deskQuotes, deskCanon);
    var citizenArchive = buildCitizenArchive(popIdIndex, deskCitizenNames);

    // Voice cards — parsed personality profiles for citizen dialogue (v1.9)
    var voiceCards = buildVoiceCards(simLedger, deskCitizenNames);

    // Build story connections enrichment (v1.4)
    var storyConnections = buildStoryConnections(
      deskEvents, deskCitizenNames, initiatives, activeBonds,
      allHistory, neighborhoodCitizenIndex, coverageEchoMap, deskId
    );

    // Sports feeds
    var deskSportsFeeds = null;
    if (desk.getsSportsFeeds === 'oakland') deskSportsFeeds = oakSports;
    else if (desk.getsSportsFeeds === 'chicago') deskSportsFeeds = chiSports;
    else if (desk.getsSportsFeeds === 'both') deskSportsFeeds = { oakland: oakSports, chicago: chiSports };

    // Sports feed digest (v1.6) — structured intelligence from raw feed, team-separated
    var sportsFeedDigest = null;
    if (desk.getsSportsFeeds === 'oakland') {
      // Oakland feed contains both A's and Warriors — split by TeamsUsed
      var asEntries = oakSports.filter(function(e) {
        return (e.TeamsUsed || '').toString().trim().toLowerCase() === "a's";
      });
      var warriorsEntries = oakSports.filter(function(e) {
        return (e.TeamsUsed || '').toString().trim().toLowerCase() === 'warriors';
      });
      sportsFeedDigest = {
        as: buildSportsFeedDigest(asEntries, deskStorylines, "A's"),
        warriors: buildSportsFeedDigest(warriorsEntries, deskStorylines, 'Warriors')
      };
    } else if (desk.getsSportsFeeds === 'chicago') {
      sportsFeedDigest = buildSportsFeedDigest(chiSports, deskStorylines, 'Bulls');
    } else if (desk.getsSportsFeeds === 'both') {
      var asEntriesAll = oakSports.filter(function(e) {
        return (e.TeamsUsed || '').toString().trim().toLowerCase() === "a's";
      });
      var warriorsEntriesAll = oakSports.filter(function(e) {
        return (e.TeamsUsed || '').toString().trim().toLowerCase() === 'warriors';
      });
      sportsFeedDigest = {
        as: buildSportsFeedDigest(asEntriesAll, deskStorylines, "A's"),
        warriors: buildSportsFeedDigest(warriorsEntriesAll, deskStorylines, 'Warriors'),
        chicago: buildSportsFeedDigest(chiSports, deskStorylines, 'Bulls')
      };
    }

    // Mara directive
    var deskMara = desk.getsMara ? maraText : null;

    // Assemble packet
    var packet = {
      meta: {
        desk: deskId,
        deskName: desk.name,
        cycle: CYCLE,
        generator: 'buildDeskPackets v2.2'
      },
      baseContext: baseContext,
      deskBrief: {
        name: desk.name,
        coverageDomains: desk.domains,
        articleBudget: desk.articleBudget,
        note: 'You decide what to cover. No stories are pre-assigned.'
      },
      reporters: reporters,
      events: deskEvents.map(function(e) {
        return {
          domain: e.Domain, severity: e.Severity, neighborhood: e.Neighborhood,
          description: e.EventDescription, type: e.EventType,
          healthFlag: e.HealthFlag, civicFlag: e.CivicFlag,
          shockFlag: e.ShockFlag, sentimentShift: e.SentimentShift,
          variance: e.variance || 0,
          anomalyFlag: e.anomalyFlag || 'NORMAL',
          priorityScore: e.priorityScore || 0,
          priority: e.priority || false
        };
      }),
      seeds: deskSeeds.map(function(s) {
        return {
          seedType: s.SeedType, domain: s.Domain, neighborhood: s.Neighborhood,
          priority: parseInt(s.Priority || '1'), text: s.SeedText,
          themes: s.themes || '',
          suggestedJournalist: s.SuggestedJournalist || s.suggestedJournalist || '',
          suggestedAngle: s.SuggestedAngle || s.suggestedAngle || '',
          voiceGuidance: s.VoiceGuidance || s.voiceGuidance || '',
          matchConfidence: s.MatchConfidence || s.matchConfidence || '',
          priorityScore: s.priorityScore || 0,
          autoPriority: s.priority || false
        };
      }),
      hooks: deskHooks.map(function(h) {
        return {
          hookType: h.HookType, domain: h.Domain, neighborhood: h.Neighborhood,
          priority: parseInt(h.Priority || '1'), text: h.HookText,
          suggestedDesks: h.SuggestedDesks || '',
          themes: h.themes || '',
          suggestedJournalist: h.SuggestedJournalist || h.suggestedJournalist || '',
          suggestedAngle: h.SuggestedAngle || h.suggestedAngle || '',
          voiceGuidance: h.VoiceGuidance || h.voiceGuidance || '',
          matchConfidence: h.MatchConfidence || h.matchConfidence || '',
          priorityScore: h.priorityScore || 0,
          autoPriority: h.priority || false
        };
      }),
      arcs: deskArcs.map(function(a) {
        var citizens = arcCitizenMap[a.ArcId] || [];
        return {
          arcId: a.ArcId, domain: a.DomainTag, phase: a.Phase,
          tension: a.Tension, neighborhood: a.Neighborhood,
          summary: a.Summary, arcAge: a.ArcAge,
          involvedCitizens: citizens
        };
      }),
      storylines: deskStorylines.map(function(s) {
        return {
          type: s.StorylineType || '', description: s.Description || '',
          status: s.Status || '', neighborhood: s.Neighborhood || '',
          relatedCitizens: s.RelatedCitizens || '',
          cycleAdded: s.CycleAdded || '', priority: s.Priority || ''
        };
      }),
      culturalEntities: deskCultural.map(function(e) {
        return {
          name: e.Name, roleType: e.RoleType, domain: e.CulturalDomain,
          fameScore: parseInt(e.FameScore || '0'), neighborhood: e.Neighborhood || '',
          status: e.Status
        };
      }),
      interviewCandidates: candidates,
      canonReference: deskCanon,
      sportsFeeds: deskSportsFeeds,
      sportsFeedDigest: sportsFeedDigest,
      maraDirective: deskMara,
      previousCoverage: prevCoverage,
      reporterHistory: reporterHistory,
      citizenArchive: citizenArchive,
      // v1.9: Voice cards — personality profiles for citizen dialogue
      voiceCards: voiceCards,
      recentQuotes: deskQuotes.map(function(q) {
        return { name: q.Name || q.CitizenName || '', text: q.EventNote || q.Quote || '', cycle: q.Cycle || '' };
      }),
      // Task 1: Household data
      households: formatHouseholdsForPacket(
        filterHouseholdsForDesk(activeHouseholds, neighborhoods, desk.domains)
      ),
      householdEvents: formatHouseholdsForPacket(
        filterHouseholdsForDesk(cycleHouseholdEvents, neighborhoods, desk.domains)
      ),
      // Task 2: Economic context
      economicContext: economicContext,
      // Task 3: Relationship bonds
      bonds: formatBondsForPacket(
        filterBondsForDesk(activeBonds, deskCitizenNames, neighborhoods, desk.domains)
      ),
      // v1.4: Story connections enrichment — cross-referenced data for editorial coherence
      storyConnections: storyConnections,
      // v2.2: Evening context — nightlife, food, media climate, weather mood
      eveningContext: eveningContext,
      // v2.2: Civic events — CIVIC clock mode actions from LifeHistory_Log
      civicEvents: (deskId === 'civic' || deskId === 'letters') ? civicEvents.map(function(h) {
        return {
          popId: h.POPID || '', name: h.Name || '',
          category: h.Category || '', tag: h.EventTag || '',
          text: h.EventNote || h.Text || '',
          neighborhood: h.NeighborhoodOrEngine || ''
        };
      }) : undefined
    };

    // Write packet
    var filename = deskId + '_c' + CYCLE + '.json';
    var filepath = path.join(OUTPUT_DIR, filename);
    var jsonStr = JSON.stringify(packet, null, 2);
    writeAndScanPacket(filepath, jsonStr);

    // Generate desk summary (compact version for agent consumption)
    var summary = generateDeskSummary(packet, deskId, CYCLE);
    var summaryFilename = deskId + '_summary_c' + CYCLE + '.json';
    var summaryFilepath = path.join(OUTPUT_DIR, summaryFilename);
    var summaryStr = JSON.stringify(summary, null, 2);
    writeAndScanPacket(summaryFilepath, summaryStr);

    var packetSizeKB = Math.round(jsonStr.length / 1024 * 10) / 10;
    var summarySizeKB = Math.round(summaryStr.length / 1024 * 10) / 10;

    var stats = {
      desk: deskId,
      file: filename,
      sizeKB: packetSizeKB,
      summaryFile: summaryFilename,
      summarySizeKB: summarySizeKB,
      reporters: reporterNames,
      events: deskEvents.length,
      seeds: deskSeeds.length,
      hooks: deskHooks.length,
      arcs: deskArcs.length,
      storylines: deskStorylines.length,
      interviewCandidates: candidates.length
    };
    manifest.packets.push(stats);

    console.log('  Events:', deskEvents.length, '| Seeds:', deskSeeds.length,
                '| Hooks:', deskHooks.length, '| Arcs:', deskArcs.length,
                '| Storylines:', deskStorylines.length,
                '| Households:', (packet.households || []).length,
                '| Bonds:', (packet.bonds || []).length);
    console.log('  Story connections:', storyConnections.enrichmentNote);
    if (sportsFeedDigest && !sportsFeedDigest.empty) {
      var digestLabel = sportsFeedDigest.oakland ? 'Oakland + Chicago' : (sportsFeedDigest.teamLabel || 'sports');
      var digestNote = sportsFeedDigest.oakland
        ? sportsFeedDigest.oakland.digestNote + ' | ' + sportsFeedDigest.chicago.digestNote
        : sportsFeedDigest.digestNote;
      console.log('  Sports digest (' + digestLabel + '):', digestNote);
    }
    console.log('  Reporters:', reporterNames.join(', ') || '(citizen voices)');
    var historyCount = Object.keys(reporterHistory).reduce(function(sum, k) { return sum + reporterHistory[k].length; }, 0);
    console.log('  Reporter history:', Object.keys(reporterHistory).length, 'reporters,', historyCount, 'articles');
    console.log('  Citizen archive:', Object.keys(citizenArchive).length, 'citizens matched (of', deskCitizenNames.length, 'extracted)');
    console.log('  Voice cards:', Object.keys(voiceCards).length, 'citizens with personality profiles');
    console.log('  Full packet:', packetSizeKB, 'KB →', filepath);
    console.log('  Summary:', summarySizeKB, 'KB →', summaryFilepath);
    if (packetSizeKB > 200) {
      console.log('  WARNING: Packet exceeds 200KB — agents should use summary file.');
    }
  }

  // Write base context
  var baseFile = path.join(OUTPUT_DIR, 'base_context.json');
  writeAndScanPacket(baseFile, JSON.stringify({
    baseContext: baseContext,
    canon: canon,
    householdStats: {
      activeHouseholds: activeHouseholds.length,
      cycleEvents: cycleHouseholdEvents.length,
      rentBurdenCount: economicContext.householdStats.rentBurdenCount
    },
    bondStats: {
      activeBonds: activeBonds.length
    }
  }, null, 2));

  // Write TrueSource reference (compact verification file for Rhea Morgan)
  var truesourceRef = {
    cycle: CYCLE,
    mayor: canon.executiveBranch.mayor,
    executiveBranch: canon.executiveBranch,
    council: canon.council.map(function(c) {
      return { name: c.member, district: c.district, faction: c.faction, status: c.status };
    }),
    asRoster: canon.asRoster.map(function(p) {
      var entry = { name: p.name, position: p.roleType, popId: p.popId, tier: p.tier, status: p.status };
      if (p.overall) entry.overall = p.overall;
      if (p.potential) entry.potential = p.potential;
      if (p.contract) entry.contract = p.contract;
      if (p.quirks) entry.quirks = p.quirks;
      if (p.seasonStats) entry.recentStats = p.seasonStats;
      if (p.awards) entry.awards = p.awards;
      if (p.playerStatus) entry.playerStatus = p.playerStatus;
      return entry;
    }),
    initiatives: canon.pendingVotes.concat(canon.recentOutcomes).map(function(i) {
      return {
        name: i.name, id: i.initiativeId, status: i.status,
        voteBreakdown: i.voteBreakdown || i.notes || '',
        implementationPhase: i.implementationPhase || null,
        nextScheduledAction: i.nextScheduledAction || null,
        nextActionCycle: i.nextActionCycle || null
      };
    })
  };
  var truesourceFile = path.join(OUTPUT_DIR, 'truesource_reference.json');
  writeAndScanPacket(truesourceFile, JSON.stringify(truesourceRef, null, 2));
  console.log('\nTrueSource reference: ' + truesourceFile);

  // Write full citizen archive (standalone reference for agents)
  var archiveFile = path.join(OUTPUT_DIR, 'citizen_archive.json');
  writeAndScanPacket(archiveFile, JSON.stringify(popIdIndex, null, 2));
  console.log('Citizen archive: ' + Object.keys(popIdIndex).length + ' citizens → ' + archiveFile);

  // Add newsroom memory path to manifest
  manifest.newsroomMemoryPath = path.join(PROJECT_ROOT, 'docs/mags-corliss/NEWSROOM_MEMORY.md');
  manifest.deskBriefingsDir = path.join(PROJECT_ROOT, 'output/desk-briefings');

  // Write manifest
  var manifestFile = path.join(OUTPUT_DIR, 'manifest.json');
  writeAndScanPacket(manifestFile, JSON.stringify(manifest, null, 2));

  console.log('\n=== DESK PACKETS COMPLETE ===');
  console.log('Output directory:', OUTPUT_DIR);
  console.log('Packets generated:', manifest.packets.length);
  console.log('\nManifest summary:');
  manifest.packets.forEach(function(p) {
    console.log('  ' + p.desk + ': ' + p.sizeKB + 'KB | ' +
                p.events + ' events, ' + p.seeds + ' seeds, ' +
                p.hooks + ' hooks, ' + p.storylines + ' storylines');
  });

  // ── Auto-run buildArchiveContext.js ──────────────────────────
  // Queries Supermemory for past coverage relevant to this cycle's
  // desk packets. Writes per-desk archive context files that Mags
  // weaves into briefings. Skips gracefully if API key is missing.
  var archiveScript = path.join(__dirname, 'buildArchiveContext.js');
  if (fs.existsSync(archiveScript)) {
    var hasApiKey = !!(process.env.SUPERMEMORY_CC_API_KEY);
    if (!hasApiKey) {
      // Check .env file directly
      var envPath = path.join(__dirname, '..', '.env');
      if (fs.existsSync(envPath)) {
        var envContent = fs.readFileSync(envPath, 'utf-8');
        hasApiKey = /SUPERMEMORY_CC_API_KEY\s*=\s*.+/.test(envContent);
      }
    }

    if (hasApiKey) {
      console.log('\n=== BUILDING ARCHIVE CONTEXT ===');
      console.log('Running buildArchiveContext.js for Cycle ' + CYCLE + '...');
      try {
        var { execSync } = require('child_process');
        execSync('node ' + archiveScript + ' ' + CYCLE, {
          stdio: 'inherit',
          cwd: path.join(__dirname, '..')
        });
      } catch (archiveErr) {
        console.warn('[WARN] Archive context build failed (non-fatal): ' + archiveErr.message);
        console.warn('Run manually: node scripts/buildArchiveContext.js ' + CYCLE);
      }
    } else {
      console.log('\n[INFO] Skipping archive context — SUPERMEMORY_CC_API_KEY not configured');
      console.log('Run manually: node scripts/buildArchiveContext.js ' + CYCLE);
    }
  }

  console.log('\n=== ALL DONE ===');
}

// ─── WEATHER/FIELD EXTRACTORS ──────────────────────────────

function extractWeatherFromEvents(events) {
  for (var i = 0; i < events.length; i++) {
    if (events[i].WeatherType) {
      return {
        type: events[i].WeatherType || '',
        impact: events[i].WeatherImpact || ''
      };
    }
  }
  return { type: 'unknown', impact: '' };
}

function extractFieldFromEvents(events, field) {
  for (var i = 0; i < events.length; i++) {
    if (events[i][field]) return events[i][field];
  }
  return '';
}

function determineCycleWeight(events) {
  var shockCount = 0;
  var highSeverity = 0;
  for (var i = 0; i < events.length; i++) {
    if (events[i].ShockFlag === 'TRUE' || events[i].ShockFlag === '1') shockCount++;
    if ((events[i].Severity || '').toLowerCase() === 'high') highSeverity++;
  }
  if (shockCount > 0 || highSeverity >= 2) return 'high-signal';
  if (events.length >= 20) return 'elevated';
  return 'normal';
}

// ─── RUN ───────────────────────────────────────────────────
main().catch(function(err) {
  console.error('FATAL:', err.message);
  if (err.stack) console.error(err.stack);
  process.exit(1);
});
