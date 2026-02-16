#!/usr/bin/env node
/**
 * buildDeskPackets.js v1.0
 *
 * Pulls live data from Google Sheets and splits into per-desk JSON packets
 * for independent agent processing in the Media Room.
 *
 * Usage: node scripts/buildDeskPackets.js [cycleNumber]
 *   e.g. node scripts/buildDeskPackets.js 79
 *
 * Reads from Google Sheets:
 *   Story_Seed_Deck, Story_Hook_Deck, WorldEvents_V3_Ledger, Event_Arc_Ledger,
 *   Civic_Office_Ledger, Initiative_Tracker, Simulation_Ledger, Generic_Citizens,
 *   Chicago_Citizens, Cultural_Ledger, Oakland_Sports_Feed, Chicago_Sports_Feed,
 *   Storyline_Tracker, Cycle_Packet, Press_Drafts, LifeHistory_Log,
 *   Household_Ledger, Relationship_Bonds, World_Population
 *
 * Reads locally:
 *   /tmp/mara_directive_c{XX}.txt
 *   schemas/bay_tribune_roster.json
 *   editions/cycle_pulse_edition_{XX-1}.txt
 *
 * Writes:
 *   /tmp/desk_packets/{desk}_c{XX}.json  (one per desk)
 *   /tmp/desk_packets/base_context.json
 *   /tmp/desk_packets/manifest.json
 */

const fs = require('fs');
const path = require('path');

// ─── CONFIGURATION ─────────────────────────────────────────
const CYCLE = parseInt(process.argv[2]) || 79;
const PROJECT_ROOT = path.resolve(__dirname, '..');
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
      'health center', 'osei', 'civic load', 'vega', 'carter', 'ashford',
      'chen', 'rivers', 'tran', 'mobley', 'delgado', 'infrastructure',
      'initiative', 'mayor', 'city hall', 'opoa', 'ramirez', 'district',
      'household', 'rent burden', 'housing', 'eviction'
    ],
    canonSections: ['council', 'pendingVotes', 'statusAlerts', 'recentOutcomes'],
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
      'green', 'moody', 'championship'
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
      'household', 'family', 'multigenerational', 'marriage', 'birth'
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
      'household', 'income', 'rent', 'housing cost', 'wealth'
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
      'buzelis', 'huerter', 'kessler'
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
const OAKLAND_TEAM_KEYWORDS = ['a\'s', 'warriors', 'keane', 'aitken', 'horn', 'seymour', 'giannis', 'antetokounmpo', 'green', 'moody', 'dillon', 'ramos'];

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

function getInterviewCandidates(genericCitizens, neighborhoods) {
  if (!neighborhoods || neighborhoods.length === 0) return [];
  return genericCitizens.filter(function(c) {
    return c.Status === 'Active' && neighborhoods.indexOf(c.Neighborhood) !== -1;
  }).slice(0, 20).map(function(c) {
    return {
      name: c.First + ' ' + c.Last,
      age: c.Age,
      neighborhood: c.Neighborhood,
      occupation: c.Occupation,
      emergenceCount: c.EmergenceCount
    };
  });
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
      generatedAt: new Date().toISOString()
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
    // Household events this cycle (formations, dissolutions, crises)
    householdEvents: (packet.householdEvents || []).slice(0, 5),
    householdCount: (packet.households || []).length,
    // Economic snapshot
    economicContext: packet.economicContext || {},
    // Top bonds by intensity
    topBonds: (packet.bonds || []).slice(0, 5)
  };

  return summary;
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
      policyDomain: i.PolicyDomain || ''
    };
  });
}

function buildAsRoster(simLedger) {
  return simLedger.filter(function(c) {
    return (c.OriginGame || '') === 'MLB The Show' && c.Tier === '1';
  }).map(function(c) {
    return {
      popId: c.POPID,
      name: (c.First + ' ' + (c.Last || '')).trim(),
      tier: c.Tier,
      roleType: c.RoleType,
      neighborhood: c.Neighborhood,
      status: c.Status
    };
  });
}

function buildBullsRoster(simLedger, chicagoCitizens, chiSports) {
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
 * Build economic context from World_Population + citizen data
 */
function buildEconomicContext(worldPopRaw, simLedger, activeHouseholds) {
  var ctx = {
    employment: '',
    economyDescription: '',
    incomeDistribution: { low: 0, mid: 0, high: 0, unknown: 0 },
    educationDistribution: {},
    householdStats: {
      total: activeHouseholds.length,
      rentBurdenCount: 0,
      averageIncome: 0
    }
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

  // Income distribution from Simulation_Ledger
  var totalIncome = 0;
  var incomeCount = 0;
  simLedger.forEach(function(c) {
    var income = (c.Income || '').toString().toLowerCase();
    if (income === 'low') ctx.incomeDistribution.low++;
    else if (income === 'mid' || income === 'medium') ctx.incomeDistribution.mid++;
    else if (income === 'high') ctx.incomeDistribution.high++;
    else if (income) ctx.incomeDistribution.unknown++;
  });

  // Education distribution from Simulation_Ledger
  simLedger.forEach(function(c) {
    var edu = c.EducationLevel || '';
    if (edu) {
      ctx.educationDistribution[edu] = (ctx.educationDistribution[edu] || 0) + 1;
    }
  });

  // Household income stats
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

// ─── MAIN ──────────────────────────────────────────────────

async function main() {
  console.log('=== buildDeskPackets v1.3 (Household + Bonds + Economic Context) ===');
  console.log('Cycle:', CYCLE);
  console.log('Pulling live data from Google Sheets...\n');

  // ── Pull all sheet data in parallel ──
  var startTime = Date.now();
  var [
    seedsRaw, hooksRaw, eventsRaw, arcsRaw,
    civicRaw, initiativeRaw, simRaw, genericRaw,
    chicagoRaw, culturalRaw, oakSportsRaw, chiSportsRaw,
    storylineRaw, packetRaw, draftsRaw, historyRaw,
    householdRaw, bondsRaw, worldPopRaw
  ] = await Promise.all([
    sheets.getSheetData('Story_Seed_Deck'),
    sheets.getSheetData('Story_Hook_Deck'),
    sheets.getSheetData('WorldEvents_V3_Ledger'),
    sheets.getSheetData('Event_Arc_Ledger'),
    sheets.getSheetData('Civic_Office_Ledger'),
    sheets.getSheetData('Initiative_Tracker'),
    sheets.getSheetData('Simulation_Ledger'),
    sheets.getSheetData('Generic_Citizens'),
    sheets.getSheetData('Chicago_Citizens'),
    sheets.getSheetData('Cultural_Ledger'),
    sheets.getSheetData('Oakland_Sports_Feed'),
    sheets.getSheetData('Chicago_Sports_Feed'),
    sheets.getSheetData('Storyline_Tracker'),
    sheets.getSheetData('Cycle_Packet'),
    sheets.getSheetData('Press_Drafts'),
    sheets.getSheetData('LifeHistory_Log'),
    sheets.getSheetData('Household_Ledger').catch(function() { return []; }),
    sheets.getSheetData('Relationship_Bonds').catch(function() { return []; }),
    sheets.getSheetData('World_Population').catch(function() { return []; })
  ]);

  console.log('Sheets pulled in ' + (Date.now() - startTime) + 'ms');

  // ── Filter to current cycle where applicable ──
  var seeds = filterByCycle(seedsRaw, CYCLE);
  var hooks = filterByCycle(hooksRaw, CYCLE);
  var events = filterByCycle(eventsRaw, CYCLE);
  var prevDrafts = filterByCycle(draftsRaw, CYCLE - 1);
  var allDrafts = allToObjects(draftsRaw);

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

  // Economic context from World_Population + Simulation_Ledger
  var economicContext = buildEconomicContext(worldPopRaw, simLedger, activeHouseholds);

  // Cycle packet text
  var packetRows = filterByCycle(packetRaw, CYCLE);
  var cyclePacketText = packetRows.length > 0 ? (packetRows[0].PacketText || packetRows[0].Briefing || JSON.stringify(packetRows[0])) : '';

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

  // ── Build base context ──
  var baseContext = {
    cycle: CYCLE,
    season: seeds.length > 0 ? seeds[0].Season || 'Unknown' : 'Unknown',
    month: seeds.length > 0 ? seeds[0].Holiday || '' : '',
    holiday: seeds.length > 0 ? {
      name: seeds[0].Holiday || 'none',
      priority: seeds[0].HolidayPriority || 'none'
    } : { name: 'none', priority: 'none' },
    isFirstFriday: seeds.length > 0 ? seeds[0].IsFirstFriday === 'TRUE' : false,
    isCreationDay: seeds.length > 0 ? seeds[0].IsCreationDay === 'TRUE' : false,
    sportsSeason: seeds.length > 0 ? seeds[0].SportsSeason || 'unknown' : 'unknown',
    weather: extractWeatherFromEvents(events),
    sentiment: extractFieldFromEvents(events, 'CitySentiment'),
    migrationDrift: '', // from cycle packet if available
    cycleWeight: determineCycleWeight(events),
    economicContext: economicContext
  };

  // ── Build canon sections (shared data) ──
  var canon = {
    council: buildCouncil(civicOfficers),
    pendingVotes: buildPendingVotes(initiatives),
    statusAlerts: buildStatusAlerts(civicOfficers),
    recentOutcomes: buildRecentOutcomes(initiatives),
    asRoster: buildAsRoster(simLedger),
    bullsRoster: buildBullsRoster(simLedger, chicagoCitizens, allChiSports),
    culturalEntities: buildCulturalEntitiesCanon(culturalLedger),
    reporters: buildReporterList(roster)
  };

  console.log('\nCanon built:');
  console.log('  Council members:', canon.council.length);
  console.log('  Pending votes:', canon.pendingVotes.length);
  console.log('  Status alerts:', canon.statusAlerts.length);
  console.log('  A\'s roster:', canon.asRoster.length);
  console.log('  Bulls roster:', canon.bullsRoster.length);
  console.log('  Cultural entities:', canon.culturalEntities.length);
  console.log('  Reporters:', canon.reporters.length);

  // ── Build per-desk packets ──
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.mkdirSync(path.join(PROJECT_ROOT, 'output/desk-briefings'), { recursive: true });

  var manifest = {
    cycle: CYCLE,
    generated: new Date().toISOString(),
    generator: 'buildDeskPackets v1.3',
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
    var candidates = getInterviewCandidates(genericCitizens, neighborhoods);

    // Get previous coverage + full reporter history
    var prevCoverage = extractPreviousCoverage(prevEdition, reporterNames);
    var reporterHistory = buildReporterHistory(allDrafts, reporterNames);

    // Build citizen archive for this desk's relevant citizens
    var deskCitizenNames = getCitizenNamesFromDeskData(deskEvents, deskSeeds, deskHooks, deskArcs, deskStorylines, candidates, deskQuotes, deskCanon);
    var citizenArchive = buildCitizenArchive(popIdIndex, deskCitizenNames);

    // Build canon reference for this desk
    var deskCanon = { reporters: canon.reporters };
    for (var ci = 0; ci < desk.canonSections.length; ci++) {
      var section = desk.canonSections[ci];
      deskCanon[section] = canon[section];
    }

    // Sports feeds
    var deskSportsFeeds = null;
    if (desk.getsSportsFeeds === 'oakland') deskSportsFeeds = oakSports;
    else if (desk.getsSportsFeeds === 'chicago') deskSportsFeeds = chiSports;
    else if (desk.getsSportsFeeds === 'both') deskSportsFeeds = { oakland: oakSports, chicago: chiSports };

    // Mara directive
    var deskMara = desk.getsMara ? maraText : null;

    // Recent quotes for this desk
    var deskQuotes = desk.domains.indexOf('ALL') !== -1 ? recentQuotes :
      recentQuotes.filter(function(q) {
        return matchesStorylineKeywords(
          (q.EventNote || '') + ' ' + (q.Name || ''),
          desk.storylineKeywords
        );
      });

    // Assemble packet
    var packet = {
      meta: {
        desk: deskId,
        deskName: desk.name,
        cycle: CYCLE,
        generated: new Date().toISOString(),
        generator: 'buildDeskPackets v1.3'
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
          themes: s.themes || '', suggestedJournalist: s.suggestedJournalist || '',
          matchConfidence: s.matchConfidence || '',
          priorityScore: s.priorityScore || 0,
          autoPriority: s.priority || false
        };
      }),
      hooks: deskHooks.map(function(h) {
        return {
          hookType: h.HookType, domain: h.Domain, neighborhood: h.Neighborhood,
          priority: parseInt(h.Priority || '1'), text: h.HookText,
          suggestedDesks: h.SuggestedDesks || '',
          themes: h.themes || '', suggestedJournalist: h.suggestedJournalist || '',
          matchConfidence: h.matchConfidence || '',
          priorityScore: h.priorityScore || 0,
          autoPriority: h.priority || false
        };
      }),
      arcs: deskArcs.map(function(a) {
        return {
          arcId: a.ArcId, domain: a.DomainTag, phase: a.Phase,
          tension: a.Tension, neighborhood: a.Neighborhood,
          summary: a.Summary, arcAge: a.ArcAge
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
      maraDirective: deskMara,
      previousCoverage: prevCoverage,
      reporterHistory: reporterHistory,
      citizenArchive: citizenArchive,
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
      )
    };

    // Write packet
    var filename = deskId + '_c' + CYCLE + '.json';
    var filepath = path.join(OUTPUT_DIR, filename);
    var jsonStr = JSON.stringify(packet, null, 2);
    fs.writeFileSync(filepath, jsonStr);

    // Generate desk summary (compact version for agent consumption)
    var summary = generateDeskSummary(packet, deskId, CYCLE);
    var summaryFilename = deskId + '_summary_c' + CYCLE + '.json';
    var summaryFilepath = path.join(OUTPUT_DIR, summaryFilename);
    var summaryStr = JSON.stringify(summary, null, 2);
    fs.writeFileSync(summaryFilepath, summaryStr);

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
    console.log('  Reporters:', reporterNames.join(', ') || '(citizen voices)');
    var historyCount = Object.keys(reporterHistory).reduce(function(sum, k) { return sum + reporterHistory[k].length; }, 0);
    console.log('  Reporter history:', Object.keys(reporterHistory).length, 'reporters,', historyCount, 'articles');
    console.log('  Citizen archive:', Object.keys(citizenArchive).length, 'citizens matched (of', deskCitizenNames.length, 'extracted)');
    console.log('  Full packet:', packetSizeKB, 'KB →', filepath);
    console.log('  Summary:', summarySizeKB, 'KB →', summaryFilepath);
    if (packetSizeKB > 200) {
      console.log('  WARNING: Packet exceeds 200KB — agents should use summary file.');
    }
  }

  // Write base context
  var baseFile = path.join(OUTPUT_DIR, 'base_context.json');
  fs.writeFileSync(baseFile, JSON.stringify({
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

  // Write full citizen archive (standalone reference for agents)
  var archiveFile = path.join(OUTPUT_DIR, 'citizen_archive.json');
  fs.writeFileSync(archiveFile, JSON.stringify(popIdIndex, null, 2));
  console.log('\nCitizen archive: ' + Object.keys(popIdIndex).length + ' citizens → ' + archiveFile);

  // Add newsroom memory path to manifest
  manifest.newsroomMemoryPath = path.join(PROJECT_ROOT, 'docs/mags-corliss/NEWSROOM_MEMORY.md');
  manifest.deskBriefingsDir = path.join(PROJECT_ROOT, 'output/desk-briefings');

  // Write manifest
  var manifestFile = path.join(OUTPUT_DIR, 'manifest.json');
  fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2));

  console.log('\n=== COMPLETE ===');
  console.log('Output directory:', OUTPUT_DIR);
  console.log('Packets generated:', manifest.packets.length);
  console.log('\nManifest summary:');
  manifest.packets.forEach(function(p) {
    console.log('  ' + p.desk + ': ' + p.sizeKB + 'KB | ' +
                p.events + ' events, ' + p.seeds + ' seeds, ' +
                p.hooks + ' hooks, ' + p.storylines + ' storylines');
  });
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
