/**
 * rosterLookup.js - Bay Tribune Roster Utilities
 *
 * Single source of truth for journalist data.
 * Provides lookup functions for Phase 7 media integration.
 *
 * @version 2.2
 * @tier 2.3
 *
 * v2.2 Enhancements:
 * - matchCitizenToJournalist_(citizenArchetype, neighborhoodContext, storyDomain)
 *   Maps citizen personality archetypes to best-fit journalist for interviews
 *
 * v2.1 Enhancements:
 * - findJournalistsByTheme_(theme) - find journalists by theme keyword
 * - getThemeKeywordsForDomain_(domain, hookType) - map domains to theme keywords
 * - suggestStoryAngle_(eventThemes, signalType) - theme-based journalist matching
 *
 * v2.0 Enhancements:
 * - Full voice profiles with openingStyle, themes, samplePhrases, background
 * - New lookup functions: getJournalistOpeningStyle_(), getJournalistThemes_(), etc.
 * - Enhanced getVoiceGuidance_() with rich persona data
 * - getFullVoiceProfile_() for complete briefing output
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
    version: "2.0",

    // Quick lookup by name -> { desk, role, tone, openingStyle, themes, samplePhrases, background }
    journalists: {
      "Anthony": {
        desk: "sports", role: "Lead Beat Reporter", tone: "Data-centric, analytical, insider access",
        openingStyle: "Atmospheric setting descriptions - fog, lights, quiet mornings before games",
        themes: ["Rhythm", "Blueprint", "Precision", "Controlled burn", "Professional craft"],
        samplePhrases: ["There's a kind of patience to this team you can hear before you see it", "The beauty of this rotation isn't volume — it's placement", "That's its own kind of dominance"],
        background: "Former minor-league scout analyst who transitioned to journalism. Known for having front office sources."
      },
      "P Slayer": {
        desk: "sports", role: "Fan Columnist", tone: "Raw, passionate, unapologetically fan-voiced",
        openingStyle: "Confrontational or sensory - city sounds, smells, fan experiences",
        themes: ["Heartbeat", "Pulse", "Fight", "Loyalty", "This city", "Noise"],
        samplePhrases: ["Oakland's got a pulse, even when the franchise forgets to feel it", "The fans don't want perfection; they want fight", "This city has carried the noise through six championships"],
        background: "Lifelong Oakland native, grew up in the Coliseum bleachers. Started as a message board legend."
      },
      "Hal Richmond": {
        desk: "sports", role: "Senior Historian", tone: "Reverent, long-view, connects past to present",
        openingStyle: "Historical reflection - 'I've stood here for forty years...'",
        themes: ["Memory", "Legacy", "Quiet roads", "Parade days", "Ghosts", "Time"],
        samplePhrases: ["When you've written about the same team for nearly two decades, you learn the rhythm", "The noise between innings", "Men like Brever carry the weight of innings that no spreadsheet can measure"],
        background: "Forty years covering Oakland baseball. Witnessed every championship since the '70s."
      },
      "Tanya Cruz": {
        desk: "sports", role: "Sideline Reporter", tone: "Quick, social-media native, inside access",
        openingStyle: "Breaking update format - timestamps and quick hits",
        themes: ["Breaking", "Clubhouse buzz", "Real-time updates", "Player mood"],
        samplePhrases: ["BREAKING from the clubhouse:", "Mood in the room is [X]", "Just talked to [player] — here's what he said"],
        background: "Started as a team social media intern, now runs the Tribune's real-time game coverage."
      },
      "DJ Hartley": {
        desk: "sports", role: "Senior Photographer", tone: "Observant, minimal commentary, lets images speak",
        openingStyle: "Scene setting with time/place - 'October 23rd. Morning. Coliseum visiting clubhouse.'",
        themes: ["Empty spaces", "Waiting infrastructure", "Light through tunnels", "The morning after"],
        samplePhrases: ["The chair is empty because the season is over, but it's not packed away yet. It's waiting.", "That's the thing about infrastructure in defeat—it doesn't know it's done.", "Light. Quiet. Routine."],
        background: "Award-winning photojournalist who finds stories in empty spaces."
      },
      "Simon Leary": {
        desk: "sports", role: "The Long View Columnist", tone: "Thoughtful, connects sports to broader Oakland identity",
        openingStyle: "Philosophical observation about stability or quiet",
        themes: ["The city underneath the noise", "Stability as foundation", "Quiet months", "Texture"],
        samplePhrases: ["Quiet cycles reveal the city underneath the noise — the real one.", "Stability isn't glamorous, but it is foundational.", "The texture of quiet months"],
        background: "Philosophy minor who writes about sports like it's civic architecture."
      },
      "Elliot Marbury": { desk: "sports", role: "Data Desk", tone: "Factual, monotone, essential for accuracy", background: "Sabermetrics, formerly ran minor-league data blog" },
      "Selena Grant": {
        desk: "chicago", role: "Bulls Beat Reporter", tone: "Professional, analytical, rising star energy",
        openingStyle: "Statistical hook or roster observation",
        themes: ["Roster construction", "Player development", "Statistical outliers", "What the numbers say"],
        background: "Chicago native who grew up watching Bulls games at her grandmother's apartment."
      },
      "Talia Finch": {
        desk: "chicago", role: "Chicago Ground Reporter", tone: "Atmospheric, neighborhood-focused",
        openingStyle: "Street-level scene setting - weather, sounds, neighborhood texture",
        themes: ["Neighborhood pulse", "City texture", "How Chicago feels", "Local voices"],
        background: "Covers Chicago the way Maria Keen covers Oakland — block by block, face by face."
      },
      "Dr. Lila Mezran": {
        desk: "metro", role: "Health Desk", tone: "Calm, clinical, exact",
        openingStyle: "Medical hypothesis followed by timeline - 'When Laurel was classified Level 2, we had a working theory'",
        themes: ["Expansion patterns", "What we didn't predict", "Geographic spread", "Containment failure"],
        samplePhrases: ["We had a working theory. By Cycle 39, that theory was obsolete.", "The expansion timeline:", "Total documented cases: [X]+"],
        background: "Former ER nurse turned journalist. Reads health cluster data the way she used to read patient charts."
      },
      "Luis Navarro": {
        desk: "metro", role: "Investigations", tone: "Persistent, fair, demands answers",
        openingStyle: "Direct statement of facts, then the question nobody's asking",
        themes: ["Accountability", "What they won't say", "Paper trails", "Sources confirm"],
        samplePhrases: ["I've spent three weeks requesting comment from the front office", "Here's what we know. Here's what we don't know.", "I'm not saying X. I'm asking why nobody else is."],
        background: "Former AP wire reporter who joined the Tribune for deeper investigative work."
      },
      "Carmen Delaine": {
        desk: "metro", role: "Civic Ledger", tone: "Methodical, tracks patterns over time",
        openingStyle: "System status reports; 'eleven consecutive calm cycles'",
        themes: ["Civic load", "System health", "Infrastructure pulse", "Calm cycles", "Baseline variation"],
        samplePhrases: ["Peak game-day traffic registered at 0.72", "No anomalies were detected", "Longer calm blocks usually indicate workforce stability"],
        background: "Data journalist who sees the city as interconnected systems."
      },
      "Trevor Shimizu": {
        desk: "metro", role: "Transit & Infrastructure", tone: "Precise, technical, alert-focused",
        openingStyle: "Timestamp and incident - 'November 30th, 11:12 PM: A bus stalled on Broadway'",
        themes: ["Micro-failures accumulating", "Tolerance limits", "Maintenance backlogs", "System symptoms"],
        samplePhrases: ["These events are unrelated. Except they're both symptoms of the same thing.", "That's not routine. That's a maintenance backlog catching up.", "Infrastructure operating at tolerance limits"],
        background: "Civil engineering degree, covered Bay Bridge. Sees micro-failures accumulating into patterns."
      },
      "Sgt. Rachel Torres": {
        desk: "metro", role: "Public Safety", tone: "Official, measured, procedural",
        openingStyle: "Incident summary with paradox framing",
        themes: ["Incident patterns", "Ambient stress", "What 'resolved' means", "The paradox of safety calls"],
        samplePhrases: ["This is standard procedure. But the nature of the calls reveals something.", "Two calls logged and resolved. Both followed the same pattern.", "Concerned citizen report, officer response, no criminal activity found, no report filed."],
        background: "Former OPD public information officer who crossed over to journalism."
      },
      "Maria Keen": {
        desk: "culture", role: "Cultural Liaison", tone: "Warm, street-level, knows everyone",
        openingStyle: "Personal vignette - 'Every playoff game, Rosa Delgado lights a candle'",
        themes: ["Faith", "Family", "Neighborhood rhythm", "Small acts of devotion", "Community memory"],
        samplePhrases: ["She told me over coffee at Tierra Mia", "That's Oakland — not perfect, not rich, not pretty, but permanent", "The everyday life that holds communities together"],
        background: "Grew up in Fruitvale, knows every neighborhood by heart."
      },
      "Sharon Okafor": {
        desk: "culture", role: "Lifestyle", tone: "Warm, analytical, accessible",
        openingStyle: "Data observation that reveals emotional pattern",
        themes: ["What the data means emotionally", "Steady vs. high-energy", "Where Oakland goes to think", "Processing"],
        samplePhrases: ["That's the pattern. When Oakland's nightlife data shows 'steady' rather than 'high energy,' it means the city is processing something.", "I visited on December 2nd", "I talked to five patrons"],
        background: "Psychology degree. Reads nightlife data like a therapist reads body language."
      },
      "Kai Marston": {
        desk: "culture", role: "Arts & Entertainment", tone: "Vivid, energetic, people-focused",
        openingStyle: "Scene-setting with sensory detail - 'By late afternoon, the air was already shifting'",
        themes: ["Canvas", "Energy", "Sound spilling over", "The night stretching long", "Cult followings"],
        samplePhrases: ["The air was already shifting", "Sound spilled over Telegraph like warm static", "A city warming up for a night that planned to stretch long past its bedtime"],
        background: "Former music blogger, deep Oakland roots. Sees the city as a canvas."
      },
      "Mason Ortega": {
        desk: "culture", role: "Food & Hospitality", tone: "Sensory, grounded, realistic",
        openingStyle: "Kitchen scene or shift summary",
        themes: ["Kitchen culture", "Motion under pressure", "Line cooks", "What stability means to hospitality"],
        samplePhrases: ["I spent three shifts shadowing line cooks", "What I found wasn't about food. It was about motion.", "Calm cycles give hospitality businesses the margin they need"],
        background: "Former sous chef who spent twelve years on the line before picking up a notebook."
      },
      "Angela Reyes": {
        desk: "culture", role: "Education", tone: "Empathetic, detail-rich",
        openingStyle: "Status summary - attendance, closures, program participation",
        themes: ["Regular means healthy", "School rhythms", "Stability as success", "What parents say"],
        samplePhrases: ["In education, regular means healthy.", "No closures. No substitute-teacher surges.", "Parent feedback echoed a common theme: 'regular.'"],
        background: "Former teacher who still has her gradebook from her last year in the classroom."
      },
      "Noah Tan": {
        desk: "culture", role: "Weather & Environment", tone: "Clear, science-first, never sensational",
        openingStyle: "Weather data with timestamps - 'Nov 30th, 11 PM: 50°F, rain'",
        themes: ["Meteorologically weird", "What wasn't forecasted", "How weather feels", "Data vs. experience"],
        samplePhrases: ["Not dangerous. Not unprecedented. Just… off.", "I checked with the Bay Area Air Quality Management District.", "Residents reported the fog felt 'heavier' than normal."],
        background: "Atmospheric science major who treats weather anomalies like unsolved puzzles."
      },
      "Jordan Velez": { desk: "business", role: "Economics & Labor", tone: "Neutral, structured, numbers-first", background: "Oakland native, formerly covered port logistics" },
      "Farrah Del Rio": {
        desk: "opinion", role: "Civic & Cultural Opinion", tone: "Sharp, informed, unapologetically Oakland",
        openingStyle: "Provocative observation with timestamp - 'On November 30th at 11:14 PM, the civic simulation registered...'",
        themes: ["What Oakland isn't saying", "Connecting events", "Silence as evidence", "Theory as truth-seeking"],
        samplePhrases: ["Nobody's talking about this. Not the city. Not the front office. Not the media—except me, right now.", "Here's my theory", "Let's be clear about what this means"],
        background: "Longtime essayist who connects dots others miss. Known for calling out silence."
      },
      "Reed Thompson": {
        desk: "wire", role: "TWS Wire", tone: "Dry, concise, fully neutral",
        openingStyle: "Wire format - WHO WHAT WHEN WHERE",
        themes: ["Verified", "Confirmed", "According to", "No comment from"],
        samplePhrases: ["CONFIRMED:", "Sources with direct knowledge state", "No additional comment at this time."],
        background: "Former AP desk journalist who treats every word like it costs money."
      },
      "MintConditionOakTown": {
        desk: "wire", role: "Speculative Internet Reporter", tone: "Messy, impulsive, unverified, internet-native",
        openingStyle: "ALL CAPS declaration followed by 'ok so nobody's talking about this'",
        themes: ["Conspiracy", "What they won't tell you", "Theories", "LIKELY/EXTREMELY POSSIBLE"],
        samplePhrases: ["ok so nobody's talking about this but", "theories:", "WHAT ARE THEY HIDING", "drop your theories below"],
        background: "Unknown (likely college student or warehouse worker). Posts conspiracy threads at 2 AM."
      },
      "Celeste Tran": {
        desk: "wire", role: "Social Trends", tone: "Fast, reactive, semi-chaotic but grounded",
        openingStyle: "Trend observation with data window - 'Between November 30th and December 1st'",
        themes: ["Indoor binge-night", "What Oakland is watching", "Emotional retreat", "Streaming as mood indicator"],
        samplePhrases: ["This isn't random. This is a city responding to environmental stress.", "Oakland collectively decided it wanted to [X]", "Comfort comedy dominated three of five evening cycles"],
        background: "Former social media analyst who reads streaming data like tea leaves."
      },
      "Arman Gutiérrez": {
        desk: "photography", role: "Photo Assistant", tone: "Observant, minimal commentary",
        openingStyle: "Brief caption style - location and light",
        themes: ["Environmental portraits", "City texture", "Warm light", "People in context"],
        background: "Local photography student apprenticing under DJ Hartley."
      },
      "Mags Corliss": {
        desk: "editorial", role: "Editor-in-Chief", tone: "Reflective, literary, connects city soul to team identity",
        openingStyle: "Atmospheric city observations - light over Jack London Square, sounds of Telegraph Avenue",
        themes: ["Continuity", "Renewal", "Gratitude", "Small acts", "The days that keep us"],
        samplePhrases: ["The dynasty years built glory; these days build gratitude", "Renewal here isn't about starting fresh; it's about refusing to fade", "These are the days that keep us — the quiet ones"],
        background: "Longtime Tribune veteran who rose from copy desk to the top chair."
      },
      "Rhea Morgan": { desk: "editorial", role: "Copy Chief", tone: "Invisible precision", background: "Twenty-three years ensuring Tribune articles say what they mean." }
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
 * Get journalist's opening style guidance.
 *
 * @param {string} name - Journalist name
 * @returns {string|null} Opening style description or null
 *
 * @example
 * getJournalistOpeningStyle_("P Slayer")
 * // → "Confrontational or sensory - city sounds, smells, fan experiences"
 */
function getJournalistOpeningStyle_(name) {
  var journalist = getJournalist_(name);
  return journalist ? journalist.openingStyle || null : null;
}

/**
 * Get journalist's signature themes.
 *
 * @param {string} name - Journalist name
 * @returns {Array<string>|null} Array of theme keywords or null
 *
 * @example
 * getJournalistThemes_("Hal Richmond")
 * // → ["Memory", "Legacy", "Quiet roads", "Parade days", "Ghosts", "Time"]
 */
function getJournalistThemes_(name) {
  var journalist = getJournalist_(name);
  return journalist ? journalist.themes || null : null;
}

/**
 * Get journalist's sample phrases from actual articles.
 *
 * @param {string} name - Journalist name
 * @returns {Array<string>|null} Array of sample phrases or null
 *
 * @example
 * getJournalistSamplePhrases_("Maria Keen")
 * // → ["She told me over coffee at Tierra Mia", ...]
 */
function getJournalistSamplePhrases_(name) {
  var journalist = getJournalist_(name);
  return journalist ? journalist.samplePhrases || null : null;
}

/**
 * Get journalist's background.
 *
 * @param {string} name - Journalist name
 * @returns {string|null} Background description or null
 */
function getJournalistBackground_(name) {
  var journalist = getJournalist_(name);
  return journalist ? journalist.background || null : null;
}

/**
 * Build voice guidance for a journalist based on story type.
 * Enhanced v2.0: Now includes opening style, themes, and sample phrases.
 *
 * @param {string} journalistName - Journalist name
 * @param {string} storyType - Type of story (breaking, feature, opinion, profile, etc.)
 * @returns {string} Voice guidance string
 */
function getVoiceGuidance_(journalistName, storyType) {
  var journalist = getJournalist_(journalistName);
  if (!journalist || !journalist.tone) return '';

  var lines = [];

  // Core voice
  lines.push('Voice: ' + journalist.tone);

  // Opening style guidance
  if (journalist.openingStyle) {
    lines.push('Opening: ' + journalist.openingStyle);
  }

  // Themes to incorporate
  if (journalist.themes && journalist.themes.length > 0) {
    lines.push('Themes: ' + journalist.themes.join(', '));
  }

  // Sample phrase for tone calibration
  if (journalist.samplePhrases && journalist.samplePhrases.length > 0) {
    lines.push('Sample: "' + journalist.samplePhrases[0] + '"');
  }

  // Add story-type modifiers
  if (storyType === 'breaking') {
    lines.push('Mode: Prioritize clarity and facts.');
  } else if (storyType === 'feature') {
    lines.push('Mode: Allow more narrative depth.');
  } else if (storyType === 'opinion') {
    lines.push('Mode: Lean into perspective and analysis.');
  } else if (storyType === 'profile') {
    lines.push('Mode: Focus on human element.');
  }

  return lines.join('\n');
}

/**
 * Get full voice profile for a journalist.
 * Returns complete briefing block for Media Room use.
 *
 * @param {string} name - Journalist name
 * @returns {string} Full voice profile block
 *
 * @example
 * getFullVoiceProfile_("Luis Navarro")
 * // → Multi-line profile with all persona details
 */
function getFullVoiceProfile_(name) {
  var journalist = getJournalist_(name);
  if (!journalist) return 'Unknown journalist: ' + name;

  var lines = [];
  lines.push('═══ ' + name + ' (' + journalist.role + ') ═══');
  lines.push('Desk: ' + journalist.desk);

  if (journalist.tone) {
    lines.push('Tone: ' + journalist.tone);
  }

  if (journalist.openingStyle) {
    lines.push('Opening Style: ' + journalist.openingStyle);
  }

  if (journalist.themes && journalist.themes.length > 0) {
    lines.push('Signature Themes: ' + journalist.themes.join(', '));
  }

  if (journalist.samplePhrases && journalist.samplePhrases.length > 0) {
    lines.push('Sample Phrases:');
    journalist.samplePhrases.forEach(function(phrase) {
      lines.push('  • "' + phrase + '"');
    });
  }

  if (journalist.background) {
    lines.push('Background: ' + journalist.background);
  }

  return lines.join('\n');
}

/**
 * Get voice profile as structured object.
 * Useful for programmatic access to all persona fields.
 *
 * @param {string} name - Journalist name
 * @returns {Object|null} Voice profile object or null
 */
function getVoiceProfileObject_(name) {
  var journalist = getJournalist_(name);
  if (!journalist) return null;

  return {
    name: name,
    desk: journalist.desk,
    role: journalist.role,
    tone: journalist.tone || null,
    openingStyle: journalist.openingStyle || null,
    themes: journalist.themes || [],
    samplePhrases: journalist.samplePhrases || [],
    background: journalist.background || null
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// v2.1: THEME-AWARE JOURNALIST MATCHING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Find journalists whose themes match a given keyword.
 * Uses partial case-insensitive matching.
 *
 * @param {string} theme - Theme keyword to search (e.g., "Legacy", "Pulse")
 * @returns {Array<Object>} Array of { name, desk, matchedThemes, tone }
 *
 * @example
 * findJournalistsByTheme_("Legacy")
 * // → [{ name: "Hal Richmond", desk: "sports", matchedThemes: ["Legacy"], tone: "Reverent..." }]
 */
function findJournalistsByTheme_(theme) {
  if (!theme) return [];

  var roster = getRoster_();
  var results = [];
  var themeLower = String(theme).toLowerCase();

  var names = Object.keys(roster.journalists);
  for (var i = 0; i < names.length; i++) {
    var name = names[i];
    var journalist = roster.journalists[name];
    var themes = journalist.themes || [];

    // Check for partial match in any theme
    var matchedThemes = [];
    for (var ti = 0; ti < themes.length; ti++) {
      if (String(themes[ti]).toLowerCase().indexOf(themeLower) >= 0) {
        matchedThemes.push(themes[ti]);
      }
    }

    if (matchedThemes.length > 0) {
      results.push({
        name: name,
        desk: journalist.desk,
        matchedThemes: matchedThemes,
        tone: journalist.tone || ''
      });
    }
  }

  return results;
}

/**
 * Get theme keywords associated with a domain or hook type.
 * Used for mapping story domains to journalist themes.
 *
 * @param {string} domain - Domain (e.g., "CIVIC", "SPORTS", "HEALTH")
 * @param {string} [hookType] - Optional hook type for more specific matching
 * @returns {Array<string>} Theme keywords to use for journalist matching
 */
function getThemeKeywordsForDomain_(domain, hookType) {
  var domainThemes = {
    'CIVIC': ['civic', 'accountability', 'system', 'baseline'],
    'SPORTS': ['rhythm', 'legacy', 'pulse', 'fight'],
    'HEALTH': ['health', 'expansion', 'containment', 'patterns'],
    'SAFETY': ['incident', 'stress', 'resolved', 'paradox'],
    'CULTURE': ['canvas', 'energy', 'sound', 'texture'],
    'COMMUNITY': ['faith', 'family', 'neighborhood', 'rhythm'],
    'BUSINESS': ['economic', 'labor', 'stability'],
    'INFRASTRUCTURE': ['micro-failures', 'tolerance', 'maintenance', 'system'],
    'WEATHER': ['meteorologically', 'forecast', 'data', 'experience'],
    'GENERAL': ['stability', 'quiet', 'texture']
  };

  var hookTypeThemes = {
    'arc': ['legacy', 'continuity', 'ongoing'],
    'shock': ['breaking', 'accountability'],
    'pattern': ['patterns', 'accumulating', 'system'],
    'holiday': ['community', 'celebration', 'tradition'],
    'demographic': ['neighborhood', 'shift', 'change'],
    'relationship': ['conflict', 'alliance', 'tension'],
    'sentiment': ['mood', 'pulse', 'emotional'],
    'initiative-passed': ['civic', 'victory', 'implementation'],
    'initiative-failed': ['accountability', 'fallout']
  };

  var themes = domainThemes[domain] || ['general'];

  if (hookType && hookTypeThemes[hookType]) {
    themes = themes.concat(hookTypeThemes[hookType]);
  }

  return themes;
}

/**
 * Suggest a story angle based on event themes and signal type.
 * Returns journalist match, suggested angle, and voice guidance.
 *
 * @param {Array<string>} eventThemes - Themes from the event/hook (e.g., ["tension", "civic"])
 * @param {string} [signalType] - Optional signal type for fallback matching
 * @returns {Object} { journalist, angle, voiceGuidance, confidence }
 *
 * @example
 * suggestStoryAngle_(["Legacy", "Memory"], "sports_history")
 * // → { journalist: "Hal Richmond", angle: "historical reflection", voiceGuidance: "...", confidence: "high" }
 */
function suggestStoryAngle_(eventThemes, signalType) {
  var result = {
    journalist: null,
    angle: 'general coverage',
    voiceGuidance: '',
    confidence: 'low'
  };

  if (!eventThemes || eventThemes.length === 0) {
    // Fall back to signal-based assignment
    if (signalType) {
      var bySignal = getJournalistBySignal_(signalType);
      if (bySignal) {
        result.journalist = bySignal;
        result.angle = 'signal-matched coverage';
        result.voiceGuidance = getVoiceGuidance_(bySignal, 'feature') || '';
        result.confidence = 'medium';
      }
    }
    return result;
  }

  // Theme-to-angle mapping
  var THEME_ANGLES = {
    'legacy': 'historical reflection',
    'memory': 'retrospective piece',
    'pulse': 'street-level mood piece',
    'fight': 'conflict/tension coverage',
    'rhythm': 'observational analysis',
    'stability': 'baseline context piece',
    'accountability': 'investigative angle',
    'civic': 'civic affairs coverage',
    'faith': 'human interest/community',
    'canvas': 'arts/culture feature',
    'breaking': 'breaking news',
    'conspiracy': 'skeptical/alternative',
    'health': 'public health coverage',
    'infrastructure': 'systems analysis'
  };

  // Score each journalist by theme overlap
  var roster = getRoster_();
  var bestMatch = null;
  var bestScore = 0;
  var matchedAngle = 'general coverage';

  var names = Object.keys(roster.journalists);
  for (var i = 0; i < names.length; i++) {
    var name = names[i];
    var journalist = roster.journalists[name];
    var journoThemes = journalist.themes || [];

    var score = 0;
    for (var ei = 0; ei < eventThemes.length; ei++) {
      var eventTheme = String(eventThemes[ei]).toLowerCase();

      for (var ji = 0; ji < journoThemes.length; ji++) {
        var journoTheme = String(journoThemes[ji]).toLowerCase();

        // Exact match
        if (journoTheme === eventTheme) {
          score += 3;
        }
        // Partial match
        else if (journoTheme.indexOf(eventTheme) >= 0 || eventTheme.indexOf(journoTheme) >= 0) {
          score += 1;
        }
      }

      // Track matched angle
      if (THEME_ANGLES[eventTheme]) {
        matchedAngle = THEME_ANGLES[eventTheme];
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = name;
    }
  }

  if (bestMatch && bestScore >= 2) {
    result.journalist = bestMatch;
    result.angle = matchedAngle;
    result.voiceGuidance = getVoiceGuidance_(bestMatch, 'feature') || '';
    result.confidence = bestScore >= 4 ? 'high' : 'medium';
  } else if (signalType) {
    // Fall back to signal-based
    var bySignalFallback = getJournalistBySignal_(signalType);
    if (bySignalFallback) {
      result.journalist = bySignalFallback;
      result.angle = matchedAngle;
      result.voiceGuidance = getVoiceGuidance_(bySignalFallback, 'feature') || '';
      result.confidence = 'medium';
    }
  }

  return result;
}

/**
 * Match a citizen archetype to the best-fit journalist for interview coverage.
 * Uses archetype personality traits to derive theme keywords, then scores
 * journalists the same way suggestStoryAngle_ does.
 *
 * Citizens come from: Simulation_Ledger, Generic_Citizens, Culture_Ledger,
 * Faith_Organizations, Chicago_Citizens.
 *
 * @param {string} citizenArchetype - Citizen archetype (Connector|Watcher|Striver|Anchor|Catalyst|Caretaker|Drifter)
 * @param {string} [neighborhoodContext] - Oakland neighborhood (e.g., "Fruitvale", "Temescal")
 * @param {string} [storyDomain] - Event domain (e.g., "CIVIC", "CULTURE", "HEALTH")
 * @returns {Object} { journalist, interviewAngle, voiceGuidance, confidence }
 *
 * @example
 * matchCitizenToJournalist_("Caretaker", "Fruitvale", "HEALTH")
 * // → { journalist: "Dr. Lila Mezran", interviewAngle: "human interest / who they look after", ... }
 *
 * @example
 * matchCitizenToJournalist_("Catalyst", null, "CIVIC")
 * // → { journalist: "Luis Navarro", interviewAngle: "tension driver / change agent angle", ... }
 */
function matchCitizenToJournalist_(citizenArchetype, neighborhoodContext, storyDomain) {
  var result = {
    journalist: null,
    interviewAngle: 'general profile',
    voiceGuidance: '',
    confidence: 'low'
  };

  // ── Archetype → theme keywords ──────────────────────────────────────────
  var ARCHETYPE_THEMES = {
    'Connector':  ['community', 'neighborhood', 'family', 'alliance'],
    'Watcher':    ['memory', 'legacy', 'quiet', 'patterns'],
    'Striver':    ['precision', 'economic', 'labor', 'blueprint'],
    'Anchor':     ['baseline', 'system', 'civic', 'stability'],
    'Catalyst':   ['pulse', 'fight', 'breaking', 'accountability'],
    'Caretaker':  ['faith', 'family', 'health', 'devotion'],
    'Drifter':    ['texture', 'quiet', 'general']
  };

  // ── Archetype → interview angle ─────────────────────────────────────────
  var ARCHETYPE_ANGLES = {
    'Connector':  'community perspective / relationship angle',
    'Watcher':    'observational reflection / what they\'ve noticed',
    'Striver':    'ambition narrative / where they\'re headed',
    'Anchor':     'neighborhood roots / stability story',
    'Catalyst':   'tension driver / change agent angle',
    'Caretaker':  'human interest / who they look after',
    'Drifter':    'general profile / slice of life'
  };

  // ── Neighborhoods with cultural/civic weight ────────────────────────────
  var CULTURE_NEIGHBORHOODS = ['Temescal', 'Fruitvale', 'Chinatown', 'Uptown', 'Jack London'];
  var CIVIC_NEIGHBORHOODS = ['Downtown', 'West Oakland', 'Old Oakland', 'Lake Merritt'];

  // Build theme list from archetype
  var archetype = citizenArchetype || 'Drifter';
  var themes = ARCHETYPE_THEMES[archetype] || ARCHETYPE_THEMES['Drifter'];

  // Add domain themes if provided
  if (storyDomain && typeof getThemeKeywordsForDomain_ === 'function') {
    var domainThemes = getThemeKeywordsForDomain_(storyDomain);
    themes = themes.concat(domainThemes);
  }

  // Set interview angle from archetype
  result.interviewAngle = ARCHETYPE_ANGLES[archetype] || ARCHETYPE_ANGLES['Drifter'];

  // ── Score journalists by theme overlap ──────────────────────────────────
  var roster = getRoster_();
  var bestMatch = null;
  var bestScore = 0;

  var names = Object.keys(roster.journalists);
  for (var i = 0; i < names.length; i++) {
    var name = names[i];
    var journalist = roster.journalists[name];
    var journoThemes = journalist.themes || [];

    var score = 0;
    for (var ti = 0; ti < themes.length; ti++) {
      var theme = String(themes[ti]).toLowerCase();

      for (var ji = 0; ji < journoThemes.length; ji++) {
        var journoTheme = String(journoThemes[ji]).toLowerCase();

        if (journoTheme === theme) {
          score += 3; // Exact match
        } else if (journoTheme.indexOf(theme) >= 0 || theme.indexOf(journoTheme) >= 0) {
          score += 1; // Partial match
        }
      }
    }

    // ── Neighborhood affinity bonus ─────────────────────────────────────
    if (neighborhoodContext) {
      var hood = String(neighborhoodContext);
      var desk = journalist.desk || '';

      // Culture desk journalists fit culture-heavy neighborhoods
      if (desk === 'culture') {
        for (var ci = 0; ci < CULTURE_NEIGHBORHOODS.length; ci++) {
          if (CULTURE_NEIGHBORHOODS[ci] === hood) { score += 2; break; }
        }
      }

      // Metro desk journalists fit civic-heavy neighborhoods
      if (desk === 'metro') {
        for (var mi = 0; mi < CIVIC_NEIGHBORHOODS.length; mi++) {
          if (CIVIC_NEIGHBORHOODS[mi] === hood) { score += 2; break; }
        }
      }

      // Chicago desk journalists for Chicago context
      if (desk === 'chicago' && hood.toLowerCase().indexOf('chicago') >= 0) {
        score += 2;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = name;
    }
  }

  // ── Build result ────────────────────────────────────────────────────────
  if (bestMatch && bestScore >= 2) {
    result.journalist = bestMatch;
    result.voiceGuidance = (typeof getVoiceGuidance_ === 'function')
      ? (getVoiceGuidance_(bestMatch, 'feature') || '')
      : '';
    result.confidence = bestScore >= 4 ? 'high' : 'medium';
  }

  return result;
}
