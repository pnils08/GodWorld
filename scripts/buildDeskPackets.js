#!/usr/bin/env node
/**
 * buildDeskPackets.js v3.0 (S502, research-build)
 *
 * Pulls the handful of live sheets that still feed base_context.json /
 * truesource_reference.json / citizen_archive.json — the only three of this
 * script's outputs anything still reads (buildWorldState.js's canon fold,
 * the citizen-loop via lib/mags.js + lib/wakePerception.js, the dashboard,
 * cron-civic-run.js). Run as run-cycle Step 5.8 and post-publish Step 5b.
 *
 * v3.0 — the per-desk packet generator (9 desk JSONs, up to ~1.3MB each,
 * every cycle) was cut. It fed 6 autonomous desk agents through /write-edition,
 * a pipeline frozen since S313 and archived since — not in the live skill set,
 * confirmed no live caller anywhere (crontab, cron-desk-run.js's beat-slice
 * fanout, or any current skill). Traced every remaining base_context/
 * truesource/citizen_archive consumer before cutting; full trace in
 * docs/plans/2026-09-07-beat-slices-from-sheets-plan.md and the S502 commits.
 * Prior version history (v1.3-v2.3) is in git log, not repeated here — it
 * described features of the removed per-desk generator.
 *
 * Usage: node scripts/buildDeskPackets.js [cycleNumber]
 *   e.g. node scripts/buildDeskPackets.js 79
 *
 * Reads from Google Sheets:
 *   WorldEvents_V3_Ledger, Civic_Office_Ledger, Initiative_Tracker,
 *   Simulation_Ledger, Household_Ledger, Relationship_Bonds,
 *   World_Population, Simulation_Calendar, Neighborhood_Map, Business_Ledger
 *
 * Reads locally:
 *   docs/media/ARTICLE_INDEX_BY_POPID.md (POPID index → citizen_archive.json)
 *
 * Writes:
 *   output/desk-packets/base_context.json
 *   output/desk-packets/truesource_reference.json
 *   output/desk-packets/citizen_archive.json
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
const sportsFeedContract = require('./sportsFeedContract');
const CYCLE = getCurrentCycle();
const PROJECT_ROOT = path.resolve(__dirname, '..');
// pipeline.12 Task 3 — cap the full packet's interviewCandidates so the bundle
// stops shipping the whole desk-ranked pool (~350/desk). The list is already
// desk-specific (priority-by-neighborhood + freshness in getInterviewCandidates);
// this is the bundle-size cap. The full pool count is preserved as
// interviewCandidatesFullCount. Cap applies ONLY to the emitted packet/summary —
// the unsliced `candidates` still feeds citizen-name extraction (no cascade to
// citizenArchive/voiceCards). (The plan's richer 5-signal score+reasons rubric is
// declined: its +2 voiceCards signal is circular — voiceCards are built downstream
// of candidates — and the existing neighborhood ranking already yields desk-specific
// shortlists.)
const INTERVIEW_CANDIDATE_CAP = 20;

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
      "a's", 'spring training', 'keane', 'seymour', 'oaks', 'warriors', 'giannis',
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
  letters: {
    name: 'Letters Desk',
    domains: ['ALL'],
    rosterDeskKeys: [],
    articleBudget: { min: 2, max: 4, recommended: 3 },
    storylineKeywords: [],
    canonSections: ['council', 'pendingVotes', 'asRoster'],
    getsSportsFeeds: 'oakland',
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
  'SPORTS': ['sports'],
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
  'BUSINESS': ['business'],   // engine.232: the engine emits BUSINESS (HOME_PURCHASE, CAREER_STAGNATION, archetype hooks) — fell to civic+culture
  'CELEBRITY': ['culture'],
  'TRAFFIC': ['civic'],
  'HOLIDAY': ['culture'],
  'GENERAL': ['civic', 'culture']
};

// ─── SHEETS API SETUP ──────────────────────────────────────
require('/root/GodWorld/lib/env');
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
  return DOMAIN_TO_DESKS[d] || ['civic', 'culture'];
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

// ── Storyline_Ledger adapter (S407) ─────────────────────────────────────────
// Storyline_Ledger is the live tab: reporter-authored kebab slugs accumulated
// weekly by cron-saturday-run step 6b, with verb counts and a Desks column.
// The three sites downstream (activeStorylines cap, sports relatedStorylines,
// per-desk keyword filter) were written against the retired Storyline_Tracker
// and read Description / StorylineType / Neighborhood / RelatedCitizens / Status.
// This maps one onto the other so those sites need no change.
//
// Two deliberate choices:
//   Description is the de-kebabbed slug. The slug already carries hood, surname
//   and topic tokens, which is exactly what matchesStorylineKeywords scans; a
//   prettier synthetic sentence would match worse, not better.
//   Status is DERIVED from LastCycle age and never stored — the ledger has no
//   IsStale column on purpose (stored-derived columns are what rotted the old
//   tracker). Under 5 cycles reads active, 5-14 dormant, 15+ is dropped.
var LEDGER_DORMANT_AFTER = 5;
var LEDGER_STALE_AFTER = 15;

function normalizeStorylineLedger(rows, cycle, popidToName) {
  var cyc = parseInt(cycle, 10);
  var out = [];
  (rows || []).forEach(function(r) {
    var slug = String(r.StorylineId || '').trim();
    if (!slug) return;
    if (String(r.Status || '').trim().toLowerCase() === 'closed') return;
    var last = parseInt(r.LastCycle, 10);
    if (!isFinite(last)) last = 0;
    var age = isFinite(cyc) ? cyc - last : 0;
    if (age >= LEDGER_STALE_AFTER) return;
    var names = String(r.Citizens || '').split(',').map(function(p) {
      return (popidToName || {})[p.trim()] || '';
    }).filter(Boolean);
    var desks = String(r.Desks || '').split(',').map(function(d) { return d.trim(); }).filter(Boolean);
    out.push({
      StorylineId: slug,
      Description: slug.replace(/-/g, ' '),
      StorylineType: desks[0] || 'thread',
      Neighborhood: String(r.Hoods || '').trim(),
      RelatedCitizens: names.join(', '),
      Status: age >= LEDGER_DORMANT_AFTER ? 'dormant' : 'active',
      Priority: 'normal',
      CycleAdded: String(r.FirstCycle || ''),
      LastMentionedCycle: String(last),
      // Ledger-native fields — verbatim columns, no derivation.
      advanced: parseInt(r.Advanced, 10) || 0,
      opened: parseInt(r.Opened, 10) || 0,
      referenced: parseInt(r.Referenced, 10) || 0,
      articles: parseInt(r.Articles, 10) || 0,
      desks: desks
    });
  });
  // Freshest first, then most-covered.
  out.sort(function(a, b) {
    return (parseInt(b.LastMentionedCycle, 10) || 0) - (parseInt(a.LastMentionedCycle, 10) || 0)
      || b.articles - a.articles;
  });
  return out;
}

// engine.245: a name found in PROSE is a citizen only if a record already says so.
// The old harvest admitted every TitleCase pair ("West Oakland", "The Rockridge",
// "Housing Squeeze") as a person for a desk to quote, and grew a hand-guard per
// leak. Prose is now searched FOR known names — whole-name match, so hyphenated
// and three-part names land too — and never mined for new ones.
var PROSE_KNOWN_NAMES = [];  // ledger First Last names; set once in main() after the ledger loads
function findKnownNamesInText_(text, knownNames) {
  var found = [];
  text = String(text || '');
  if (!text) return found;
  for (var i = 0; i < knownNames.length; i++) {
    var n = knownNames[i];
    var at = text.indexOf(n);
    while (at !== -1) {
      var before = at > 0 ? text.charAt(at - 1) : '';
      var after = text.charAt(at + n.length);
      if (!/[A-Za-z0-9-]/.test(before) && !/[A-Za-z0-9-]/.test(after)) { found.push(n); break; }
      at = text.indexOf(n, at + 1);
    }
  }
  return found;
}

function getCitizenNamesFromDeskData(deskEvents, deskSeeds, deskHooks, deskArcs, deskStorylines, candidates, deskQuotes, deskCanon, ledgerNames) {
  var names = {};
  // Extract from storylines (RelatedCitizens field)
  // S407: this read `s.relatedCitizens` but is handed the SHEET-shaped rows,
  // whose key is `RelatedCitizens` — so no storyline citizen has ever reached
  // name extraction. Found while repointing the source tab; accept both spellings.
  (deskStorylines || []).forEach(function(s) {
    (s.RelatedCitizens || s.relatedCitizens || '').split(/[,;|]/).forEach(function(n) {
      var trimmed = n.trim();
      if (trimmed.length > 2 && /[A-Z]/.test(trimmed[0])) names[trimmed] = true;
    });
  });
  // Extract from interview candidates
  (candidates || []).forEach(function(c) { if (c.name) names[c.name] = true; });
  // Extract from recent quotes
  (deskQuotes || []).forEach(function(q) { if (q.CitizenName) names[q.CitizenName] = true; });
  // Extract from canon roster data (A's, Bulls, council, cultural entities)
  if (deskCanon) {
    (deskCanon.asRoster || []).forEach(function(p) { if (p.name) names[p.name] = true; });
    (deskCanon.council || []).forEach(function(c) { if (c.member) names[c.member] = true; });
    (deskCanon.culturalEntities || []).forEach(function(e) { if (e.name) names[e.name] = true; });
  }
  // Known names = the ledger (First Last) + every structured source above
  // (rosters and cultural entities carry no POP ids, so the ledger alone would
  // drop a player named in an event line).
  var known = {};
  (ledgerNames || []).forEach(function(n) { if (n && n.indexOf(' ') > 0) known[n] = true; });
  Object.keys(names).forEach(function(n) { known[n] = true; });
  var knownList = Object.keys(known);
  [deskEvents, deskSeeds, deskHooks].forEach(function(list) {
    (list || []).forEach(function(item) {
      findKnownNamesInText_(item.description || item.text || '', knownList)
        .forEach(function(n) { names[n] = true; });
    });
  });
  (deskArcs || []).forEach(function(a) {
    findKnownNamesInText_(a.summary || a.Summary || '', knownList)
      .forEach(function(n) { names[n] = true; });
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
    var age = birthYear > 0 ? require('../lib/citizenDerivation').currentSimYear() - birthYear : '';
    var hood = c.Neighborhood || '';
    var popId = c.POPID || '';

    // Freshness score: 0 appearances = freshest, higher = more used
    var usageCount = (USAGE_COUNTS && popId) ? (USAGE_COUNTS[popId] || 0) : 0;

    var candidate = {
      name: fullName,
      popId: popId,
      age: age,
      gender: c.Gender || '',
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
    // engine.245: count KNOWN citizens, not TitleCase pairs — "West Oakland"
    // scored every hood-named event as carrying a person.
    citizenCount = findKnownNamesInText_(desc, PROSE_KNOWN_NAMES).length;
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
    // S312 — CitizenA/B are POPIDs (canonical); resolved display names ride
    // CitizenAName/BName. Match either so legacy name rows keep working.
    var citizenMatch = deskCitizenNames.indexOf(b.CitizenAName || b.CitizenA) !== -1 ||
                       deskCitizenNames.indexOf(b.CitizenBName || b.CitizenB) !== -1;
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
function buildEveningContext(cycleMedia, packetText, rileyRow) {
  var ctx = {};

  // engine.41 (S271) — full evening layer from Riley_Digest (the structured tab),
  // not the lossy Cycle_Packet-text scrape below. These are the fields desks never
  // saw: TV/movie/streaming lineup, famous-people buzz, city events, food + nightlife
  // detail. Ambient context (the desk decides what to use), NOT seeds — story-worthy
  // distillation rides Story_Seed_Deck. Plan: docs/plans/2026-06-24-engine-output-canon-coverage.md
  if (rileyRow) {
    function rileyJson_(v) { try { return v ? JSON.parse(v) : {}; } catch (e) { return {}; } }
    var em = rileyJson_(rileyRow.EveningMedia);
    var ef = rileyJson_(rileyRow.EveningFood);
    var nl = rileyJson_(rileyRow.NightLife);
    ctx.riley = {
      tv: em.tv || [],
      movies: em.movies || [],
      streaming: em.streaming || rileyRow.StreamingTrend || '',
      sportsBroadcast: em.sportsBroadcast || '',
      famousPeople: rileyRow.FamousPeople || '',
      cityEvents: rileyRow.CityEvents || '',
      restaurants: ef.restaurantDetails || [],
      foodTrend: ef.trend || '',
      nightlifeSpots: nl.spotDetails || [],
      nightlifeVibe: nl.vibe || '',
      citySentiment: rileyRow.CitySentiment || ''
    };
  }

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
        // engine.235: incidents vs last cycle + police headroom (units ÷ demand)
        if (cline.indexOf('IncidentTrend:') === 0) ctx.crimeSnapshot.incidentTrend = parseFloat(cline.replace('IncidentTrend:', '').trim()) || 0;
        if (cline.indexOf('EnforcementHeadroom:') === 0) ctx.crimeSnapshot.enforcementHeadroom = parseFloat(cline.replace('EnforcementHeadroom:', '').trim()) || 0;
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
function buildNeighborhoodCitizenIndex(simLedger, genericCitizens) {
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
      occupation: c.RoleType || '',
      quotable: true
    });
  });

  // ── engine.108: Tier-5 fallback ────────────────────────────────────────────
  // Tracked citizens are primary and always win. A generic surfaces ONLY where a
  // neighborhood has nobody tracked at all — which self-targets the hoods the
  // sample never reached (Glenview, Dimond, Ivy Hill et al hold 85 Tier-5
  // residents between them and zero tracked ones). Snapshot the tracked hoods
  // BEFORE appending, or the first generic pushed into a hood makes it look
  // tracked and blocks the rest.
  //
  // PRESENCE BEFORE VOICE: a Tier-5 may be seen, named, counted and described.
  // It may NEVER be quoted — it has no wake and no voice. Being observed
  // repeatedly is what earns the voice (EmergenceCount -> promotion), so the
  // quoting limit is the mechanism, not a gap to close. `quotable: false` is the
  // machine-readable half of that rule; consumers must honour it.
  var trackedHoods = {};
  Object.keys(index).forEach(function(h) { if (index[h].length) trackedHoods[h] = true; });

  var TIER5_PER_HOOD_CAP = 5;
  (genericCitizens || []).forEach(function(g) {
    var hood = (g.Neighborhood || '').trim();
    if (!hood || trackedHoods[hood]) return;
    var status = (g.Status || '').trim();
    if (status && !/^active$/i.test(status)) return;   // promoted/emerged rows are not waiting-room
    var name = ((g.First || '') + ' ' + (g.Last || '')).trim();
    if (!name) return;
    if (!index[hood]) index[hood] = [];
    if (index[hood].length >= TIER5_PER_HOOD_CAP) return;
    index[hood].push({
      name: name,
      popId: '',                       // Tier-5 has no POPID until it earns one
      tier: '5',
      occupation: g.Occupation || '',
      quotable: false,                 // presence before voice — never quote
      tier5: true
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

// engine.52 D1 — hospital census block from Hospital_Ledger rows.
// Open rows (no DischargeCycle) are the current census; rows closed within
// the last 3 cycles surface as recent outcomes. Returns null when the tab
// is absent/empty so packets degrade cleanly pre-first-admission.
function buildHospitalBlock(rows, cycle) {
  var valid = (rows || []).filter(function(r) { return r.POPID; });
  if (!valid.length) return null;

  var CAPACITY = 40; // matches persistHospitalLedger_ (buildCyclePacket.js)

  function rowOut(r) {
    var admit = parseInt(r.AdmitCycle);
    var inCare = (r.CyclesInCare !== '' && r.CyclesInCare !== undefined && r.CyclesInCare !== null)
      ? Number(r.CyclesInCare)
      : (isNaN(admit) ? 0 : Math.max(0, cycle - admit));
    return {
      popId: r.POPID, name: r.Name || '', neighborhood: r.Neighborhood || '',
      cause: r.Cause || '', status: r.StatusNow || '',
      admitCycle: r.AdmitCycle, cyclesInCare: inCare, outcome: r.Outcome || ''
    };
  }

  var open = valid.filter(function(r) {
    return String(r.DischargeCycle === undefined || r.DischargeCycle === null ? '' : r.DischargeCycle).trim() === '';
  });
  var recentClosed = valid.filter(function(r) {
    var dc = parseInt(r.DischargeCycle);
    return !isNaN(dc) && (cycle - dc) >= 0 && (cycle - dc) <= 3;
  });

  var load = open.length / CAPACITY;
  return {
    census: {
      inCare: open.length,
      capacity: CAPACITY,
      load: Math.round(load * 100) / 100,
      loadState: load > 0.9 ? 'crisis' : (load >= 0.6 ? 'strained' : 'normal')
    },
    inCare: open.map(rowOut),
    recentOutcomes: recentClosed.map(rowOut)
  };
}

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
  // S502 (research-build) — trimmed to the reads base_context.json/
  // truesource_reference.json/citizen_archive.json actually need. The full
  // per-desk packet generation (events/seeds/hooks routing, canon culturalEntities/
  // reporters, sports/evening/storyline/hospital enrichment) was cut in the same
  // change: traced every consumer first (dashboard, lib/mags.js, buildWorldState.js,
  // cron-civic-run.js) and confirmed none of it had a live reader left — the
  // pipeline that consumed it (6 desk agents -> /write-edition) is frozen/archived.
  // See docs/plans/2026-09-07-beat-slices-from-sheets-plan.md for what replaced it.
  var [
    eventsRaw, civicRaw, initiativeRaw, simRaw,
    householdRaw, bondsRaw, worldPopRaw, simCalRaw,
    neighborhoodMapRaw, businessLedgerRaw
  ] = await Promise.all([
    safeGet('WorldEvents_V3_Ledger'),
    safeGet('Civic_Office_Ledger'),
    safeGet('Initiative_Tracker'),
    safeGet('Simulation_Ledger'),
    safeGet('Household_Ledger'),
    safeGet('Relationship_Bonds'),
    safeGet('World_Population'),
    safeGet('Simulation_Calendar'),
    safeGet('Neighborhood_Map'),
    safeGet('Business_Ledger')
  ]);

  console.log('Sheets pulled in ' + (Date.now() - startTime) + 'ms');

  // ── Filter to current cycle where applicable ──
  // S502 (research-build): seeds/hooks/historicalEvents/arcs/hospitalBlock and
  // the whole per-desk packet loop below them were cut — confirmed zero live
  // readers left (the 6-desk-agent/write-edition pipeline they fed is frozen/
  // archived; beat-slices replaced it). See docs/plans/2026-09-07-beat-slices-
  // from-sheets-plan.md.
  var events = filterByCycle(eventsRaw, CYCLE);

  // Civic and initiatives (filter empty rows — sheet has 1000 rows, ~35 filled)
  var civicOfficers = allToObjects(civicRaw).filter(function(o) { return o.Title; });
  var initiatives = allToObjects(initiativeRaw);

  // Citizens
  var simLedger = allToObjects(simRaw);

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

  // S312 bond-key repair — Relationship_Bonds is POPID-keyed (canonical); resolve
  // display names onto each bond so the name-based desk filter below still matches.
  // S328: moved below the activeBonds definition — original placement ran the
  // forEach before `var activeBonds` (hoisted undefined → TypeError, base_context
  // frozen at C101 since S312).
  var nameByPopId = {};
  simLedger.forEach(function(c) {
    var nm = ((c.First || '') + ' ' + (c.Last || '')).trim();
    if (c.POPID && nm) nameByPopId[String(c.POPID).toUpperCase()] = nm;
  });
  activeBonds.forEach(function(b) {
    b.CitizenAName = nameByPopId[String(b.CitizenA || '').toUpperCase()] || String(b.CitizenA || '');
    b.CitizenBName = nameByPopId[String(b.CitizenB || '').toUpperCase()] || String(b.CitizenB || '');
  });

  // Neighborhood Map: economic data per neighborhood
  var neighborhoodMap = allToObjects(neighborhoodMapRaw);

  // Business Ledger
  var businesses = allToObjects(businessLedgerRaw);

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
  console.log('  Events (C' + CYCLE + '):', events.length);
  console.log('  Civic Officers:', civicOfficers.length);
  console.log('  Initiatives:', initiatives.length);
  console.log('  Sim Ledger:', simLedger.length);
  console.log('  Active Households:', activeHouseholds.length);
  console.log('  Household Events (C' + CYCLE + '):', cycleHouseholdEvents.length);
  console.log('  Active Bonds (intensity>=3):', activeBonds.length);
  console.log('  Economy:', economicContext.economyDescription || '(no description)');
  console.log('  Median Income: $' + (economicContext.medianIncome || 0).toLocaleString(),
              '| Citizens w/income:', economicContext.totalCitizensWithIncome,
              '| Neighborhoods:', economicContext.neighborhoodEconomics.length,
              '| Businesses:', (economicContext.businessSnapshot || []).length);

  // ── Read local files ──
  var popIdIndex = parsePopIdIndex(POPID_INDEX_PATH);
  console.log('  POPID index: ' + Object.keys(popIdIndex).length + ' citizens loaded');

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
  // S502: culturalEntities/reporters dropped — confirmed unread by
  // buildWorldState.js's canon fold or any live base_context/truesource
  // consumer (dashboard, lib/mags.js, cron-civic-run.js).
  var canon = {
    council: buildCouncil(civicOfficers),
    pendingVotes: buildPendingVotes(initiatives),
    statusAlerts: buildStatusAlerts(civicOfficers),
    recentOutcomes: buildRecentOutcomes(initiatives),
    executiveBranch: buildExecutiveBranch(civicOfficers),
    asRoster: buildAsRoster(simLedger)
  };

  console.log('\nCanon built:');
  console.log('  Council members:', canon.council.length);
  console.log('  Pending votes:', canon.pendingVotes.length);
  console.log('  Status alerts:', canon.statusAlerts.length);
  console.log('  Executive branch — Mayor:', canon.executiveBranch.mayor || '(not found)');
  console.log('  A\'s roster:', canon.asRoster.length);

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });


  // Write base context
  var baseFile = path.join(OUTPUT_DIR, 'base_context.json');
  writeAndScanPacket(baseFile, JSON.stringify({
    // Env tag: which sheet this context was built from. Readers compare
    // against their own GODWORLD_SHEET_ID to catch a sandbox run clobbering
    // the prod file (S306 mags-bot incident).
    source: {
      sheetId: process.env.GODWORLD_SHEET_ID || null,
      generatedAt: new Date().toISOString()
    },
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
