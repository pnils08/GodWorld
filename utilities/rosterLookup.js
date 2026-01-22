/**
 * rosterLookup.js - Bay Tribune Roster Utilities
 *
 * Single source of truth for journalist data.
 * Provides lookup functions for Phase 7 media integration.
 *
 * @version 1.0
 * @tier 2.3
 */

/**
 * Load roster data from JSON schema.
 * In Apps Script context, this would read from a sheet or PropertiesService.
 * For now, returns the embedded roster structure.
 *
 * @returns {Object} Full roster object
 */
function loadRoster_() {
  // In production, this could read from:
  // - PropertiesService.getScriptProperties().getProperty('ROSTER_JSON')
  // - A BayTribune_Roster sheet
  // - An external JSON file

  return {
    version: "1.0",

    // Quick lookup by name -> { desk, role, tone }
    journalists: {
      "Anthony": { desk: "sports", role: "Lead Beat Reporter", tone: "Data-centric, analytical, insider access" },
      "P Slayer": { desk: "sports", role: "Fan Columnist", tone: "Raw, passionate, unapologetically fan-voiced" },
      "Hal Richmond": { desk: "sports", role: "Senior Historian", tone: "Reverent, long-view, connects past to present" },
      "Tanya Cruz": { desk: "sports", role: "Sideline Reporter", tone: "Quick, social-media native, inside access" },
      "DJ Hartley": { desk: "sports", role: "Senior Photographer", tone: "Observant, minimal commentary, lets images speak" },
      "Simon Leary": { desk: "sports", role: "The Long View Columnist", tone: "Thoughtful, connects sports to broader Oakland identity" },
      "Elliot Marbury": { desk: "sports", role: "Data Desk", tone: "Factual, monotone, essential for accuracy" },
      "Selena Grant": { desk: "chicago", role: "Bulls Beat Reporter", tone: "Professional, analytical, rising star energy" },
      "Talia Finch": { desk: "chicago", role: "Chicago Ground Reporter", tone: "Atmospheric, neighborhood-focused" },
      "Dr. Lila Mezran": { desk: "metro", role: "Health Desk", tone: "Calm, clinical, exact" },
      "Luis Navarro": { desk: "metro", role: "Investigations", tone: "Persistent, fair, demands answers" },
      "Carmen Delaine": { desk: "metro", role: "Civic Ledger", tone: "Methodical, tracks patterns over time" },
      "Trevor Shimizu": { desk: "metro", role: "Transit & Infrastructure", tone: "Precise, technical, alert-focused" },
      "Sgt. Rachel Torres": { desk: "metro", role: "Public Safety", tone: "Official, measured, procedural" },
      "Maria Keen": { desk: "culture", role: "Cultural Liaison", tone: "Warm, street-level, knows everyone" },
      "Sharon Okafor": { desk: "culture", role: "Lifestyle", tone: "Warm, analytical, accessible" },
      "Kai Marston": { desk: "culture", role: "Arts & Entertainment", tone: "Vivid, energetic, people-focused" },
      "Mason Ortega": { desk: "culture", role: "Food & Hospitality", tone: "Sensory, grounded, realistic" },
      "Angela Reyes": { desk: "culture", role: "Education", tone: "Empathetic, detail-rich" },
      "Noah Tan": { desk: "culture", role: "Weather & Environment", tone: "Clear, science-first, never sensational" },
      "Jordan Velez": { desk: "business", role: "Economics & Labor", tone: "Neutral, structured, numbers-first" },
      "Farrah Del Rio": { desk: "opinion", role: "Civic & Cultural Opinion", tone: "Sharp, informed, unapologetically Oakland" },
      "Reed Thompson": { desk: "wire", role: "TWS Wire", tone: "Dry, concise, fully neutral" },
      "MintConditionOakTown": { desk: "wire", role: "Speculative Internet Reporter", tone: "Messy, impulsive, unverified, internet-native" },
      "Celeste Tran": { desk: "wire", role: "Social Trends", tone: "Fast, reactive, semi-chaotic but grounded" },
      "Arman Gutiérrez": { desk: "photography", role: "Photo Assistant", tone: "Observant, minimal commentary" },
      "Mags Corliss": { desk: "editorial", role: "Editor-in-Chief", tone: null },
      "Rhea Morgan": { desk: "editorial", role: "Copy Chief", tone: null }
    },

    // Signal type -> primary journalist mapping
    signalAssignments: {
      "health_arc": "Dr. Lila Mezran",
      "health-crisis": "Dr. Lila Mezran",
      "illness": "Dr. Lila Mezran",
      "shock_event": "Luis Navarro",
      "anomaly": "Luis Navarro",
      "crisis": "Luis Navarro",
      "civic": "Carmen Delaine",
      "government": "Carmen Delaine",
      "election": "Carmen Delaine",
      "infrastructure": "Trevor Shimizu",
      "transit": "Trevor Shimizu",
      "crime": "Sgt. Rachel Torres",
      "safety": "Sgt. Rachel Torres",
      "athletics_baseball": "Anthony",
      "sports": "Anthony",
      "athletics_basketball_bulls": "Selena Grant",
      "sports_opinion": "P Slayer",
      "fan_pulse": "P Slayer",
      "sports_history": "Hal Richmond",
      "history": "Hal Richmond",
      "chicago_street": "Talia Finch",
      "neighborhood_culture": "Maria Keen",
      "arts": "Kai Marston",
      "music": "Kai Marston",
      "cultural_ledger": "Kai Marston",
      "first_friday": "Kai Marston",
      "food": "Mason Ortega",
      "restaurants": "Mason Ortega",
      "education": "Angela Reyes",
      "youth": "Angela Reyes",
      "weather": "Noah Tan",
      "environment": "Noah Tan",
      "economics": "Jordan Velez",
      "labor": "Jordan Velez",
      "business": "Jordan Velez",
      "civic_opinion": "Farrah Del Rio",
      "opinion": "Farrah Del Rio",
      "rumor_verified": "Reed Thompson",
      "rumor_chaotic": "MintConditionOakTown",
      "social_trends": "Celeste Tran",
      "human_interest": "Mags Corliss",
      "feature": "Mags Corliss",
      "community": "Sharon Okafor",
      "lifestyle": "Sharon Okafor"
    },

    // Desk -> array of journalist names
    desks: {
      "sports": ["Anthony", "P Slayer", "Hal Richmond", "Tanya Cruz", "DJ Hartley", "Simon Leary", "Elliot Marbury"],
      "chicago": ["Selena Grant", "Talia Finch"],
      "metro": ["Dr. Lila Mezran", "Luis Navarro", "Carmen Delaine", "Trevor Shimizu", "Sgt. Rachel Torres"],
      "culture": ["Maria Keen", "Sharon Okafor", "Kai Marston", "Mason Ortega", "Angela Reyes", "Noah Tan"],
      "business": ["Jordan Velez"],
      "opinion": ["Farrah Del Rio", "P Slayer"],
      "wire": ["Reed Thompson", "MintConditionOakTown", "Celeste Tran"],
      "photography": ["DJ Hartley", "Arman Gutiérrez"],
      "editorial": ["Mags Corliss", "Rhea Morgan", "Luis Navarro"]
    }
  };
}

// Cache the roster to avoid repeated loading
var _rosterCache = null;

/**
 * Get the roster, loading once and caching.
 * @returns {Object} Roster data
 */
function getRoster_() {
  if (!_rosterCache) {
    _rosterCache = loadRoster_();
  }
  return _rosterCache;
}

/**
 * Get journalist info by name.
 *
 * @param {string} name - Journalist name (e.g., "Anthony", "Carmen Delaine")
 * @returns {Object|null} { desk, role, tone } or null if not found
 *
 * @example
 * getJournalist_("Anthony")
 * // → { desk: "sports", role: "Lead Beat Reporter", tone: "Data-centric, analytical, insider access" }
 */
function getJournalist_(name) {
  var roster = getRoster_();
  return roster.journalists[name] || null;
}

/**
 * Get journalist's tone/voice profile.
 *
 * @param {string} name - Journalist name
 * @returns {string|null} Tone description or null
 *
 * @example
 * getJournalistTone_("P Slayer")
 * // → "Raw, passionate, unapologetically fan-voiced"
 */
function getJournalistTone_(name) {
  var journalist = getJournalist_(name);
  return journalist ? journalist.tone : null;
}

/**
 * Get journalist's desk assignment.
 *
 * @param {string} name - Journalist name
 * @returns {string|null} Desk name or null
 */
function getJournalistDesk_(name) {
  var journalist = getJournalist_(name);
  return journalist ? journalist.desk : null;
}

/**
 * Get the primary journalist for a signal type.
 *
 * @param {string} signalType - Signal type (e.g., "health-crisis", "civic", "sports")
 * @returns {string|null} Journalist name or null
 *
 * @example
 * getJournalistBySignal_("health-crisis")
 * // → "Dr. Lila Mezran"
 */
function getJournalistBySignal_(signalType) {
  var roster = getRoster_();
  return roster.signalAssignments[signalType] || roster.signalAssignments[signalType.toLowerCase()] || null;
}

/**
 * Get all journalists on a specific desk.
 *
 * @param {string} deskName - Desk name (e.g., "sports", "metro", "culture")
 * @returns {Array<string>} Array of journalist names
 *
 * @example
 * getJournalistsByDesk_("sports")
 * // → ["Anthony", "P Slayer", "Hal Richmond", "Tanya Cruz", "DJ Hartley", "Simon Leary", "Elliot Marbury"]
 */
function getJournalistsByDesk_(deskName) {
  var roster = getRoster_();
  return roster.desks[deskName] || [];
}

/**
 * Format journalist name with role for briefing output.
 * Matches existing patterns in mediaRoomBriefingGenerator.js
 *
 * @param {string} name - Journalist name
 * @param {string} [suffix] - Optional suffix like "lead", "support"
 * @returns {string} Formatted string like "Anthony (Lead Beat Reporter)"
 *
 * @example
 * formatJournalist_("Carmen Delaine", "lead")
 * // → "Carmen Delaine (Civic Ledger) lead"
 */
function formatJournalist_(name, suffix) {
  var journalist = getJournalist_(name);
  if (!journalist) return name;

  var formatted = name + ' (' + journalist.role + ')';
  if (suffix) {
    formatted += ' ' + suffix;
  }
  return formatted;
}

/**
 * Format journalist with desk name (shorter format).
 *
 * @param {string} name - Journalist name
 * @returns {string} Formatted string like "Carmen Delaine (Civic)"
 *
 * @example
 * formatJournalistShort_("Dr. Lila Mezran")
 * // → "Dr. Lila Mezran (Health)"
 */
function formatJournalistShort_(name) {
  var journalist = getJournalist_(name);
  if (!journalist) return name;

  // Extract short desk name from role
  var shortDesk = journalist.role.split(' ')[0];
  if (shortDesk === 'Lead') shortDesk = 'Sports';
  if (shortDesk === 'Fan') shortDesk = 'Opinion';
  if (shortDesk === 'Senior') shortDesk = journalist.role.includes('Historian') ? 'History' : 'Photo';
  if (shortDesk === 'Civic') shortDesk = 'Civic';
  if (shortDesk === 'Bulls') shortDesk = 'Chicago';
  if (shortDesk === 'Chicago') shortDesk = 'Chicago';

  return name + ' (' + shortDesk + ')';
}

/**
 * Get arc reporter based on arc type and domain.
 * Replaces hardcoded getArcReporter_() in mediaRoomBriefingGenerator.js
 *
 * @param {string} arcType - Arc type (e.g., "health-crisis", "crisis")
 * @param {string} domain - Domain (e.g., "CIVIC", "TRANSIT", "SAFETY")
 * @returns {string} Reporter assignment string
 */
function getArcReporterFromRoster_(arcType, domain) {
  // Health crisis always goes to Dr. Lila Mezran
  if (arcType === 'health-crisis') {
    return getJournalistBySignal_('health-crisis');
  }

  // Crisis in CIVIC domain
  if (arcType === 'crisis' && domain === 'CIVIC') {
    return getJournalistBySignal_('civic');
  }

  // General crisis
  if (arcType === 'crisis') {
    return getJournalistBySignal_('shock_event');
  }

  // Domain-based assignment
  if (domain === 'TRANSIT' || domain === 'INFRASTRUCTURE') {
    return getJournalistBySignal_('transit');
  }

  if (domain === 'SAFETY' || domain === 'CRIME') {
    return getJournalistBySignal_('crime');
  }

  if (domain === 'HEALTH') {
    return getJournalistBySignal_('health_arc');
  }

  if (domain === 'BUSINESS' || domain === 'ECONOMIC') {
    return getJournalistBySignal_('business');
  }

  if (domain === 'CULTURE' || domain === 'ARTS') {
    return getJournalistBySignal_('arts');
  }

  // Default fallback
  return 'Luis Navarro or Carmen Delaine';
}

/**
 * Get sports desk assignment based on season.
 *
 * @param {string} sportsSeason - Season (championship, playoffs, spring-training, etc.)
 * @returns {string} Assignment string
 */
function getSportsAssignment_(sportsSeason) {
  var anthony = getJournalist_('Anthony');
  var pslayer = getJournalist_('P Slayer');
  var hal = getJournalist_('Hal Richmond');

  if (sportsSeason === 'championship') {
    return 'Anthony (Lead) + Full Sports Desk — P Slayer on fan pulse, Hal Richmond on history';
  }
  if (sportsSeason === 'playoffs') {
    return 'Anthony (Lead) + Hal Richmond (History)';
  }
  if (sportsSeason === 'spring-training') {
    return 'Anthony on roster coverage, P Slayer on fan expectations';
  }

  // Default
  return 'Core three (Anthony/P Slayer/Hal) + support';
}

/**
 * Check if a journalist name is valid (exists in roster).
 *
 * @param {string} name - Journalist name to validate
 * @returns {boolean} True if journalist exists
 */
function isValidJournalist_(name) {
  return getJournalist_(name) !== null;
}

/**
 * Get all journalist names as array.
 *
 * @returns {Array<string>} All journalist names
 */
function getAllJournalistNames_() {
  var roster = getRoster_();
  return Object.keys(roster.journalists);
}

/**
 * Build voice guidance for a journalist based on story type.
 *
 * @param {string} journalistName - Journalist name
 * @param {string} storyType - Type of story (breaking, feature, opinion, profile, etc.)
 * @returns {string} Voice guidance string
 */
function getVoiceGuidance_(journalistName, storyType) {
  var tone = getJournalistTone_(journalistName);
  if (!tone) return '';

  var guidance = 'Voice: ' + tone;

  // Add story-type modifiers
  if (storyType === 'breaking') {
    guidance += ' — Prioritize clarity and facts.';
  } else if (storyType === 'feature') {
    guidance += ' — Allow more narrative depth.';
  } else if (storyType === 'opinion') {
    guidance += ' — Lean into perspective and analysis.';
  } else if (storyType === 'profile') {
    guidance += ' — Focus on human element.';
  }

  return guidance;
}
