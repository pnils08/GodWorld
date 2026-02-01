/**
 * ============================================================================
 * compressLifeHistory.js v1.0
 * ============================================================================
 *
 * Scans LifeHistory (column O) and compresses accumulated events into a
 * personality profile stored in TraitProfile (column R, formerly OriginVault).
 *
 * Features:
 * - Tag counting with 0.95 decay (older events fade but don't vanish)
 * - Archetype assignment based on trait clustering
 * - Signature motif extraction (recurring venues/phrases)
 * - Optional LifeHistory trimming (keep last K entries)
 *
 * Output format (pipe-delimited, easy to parse):
 * Archetype:Watcher|reflective:0.73|social:0.45|driven:0.22|TopTags:Relationship,Neighborhood|Motifs:corner store|Updated:c47
 *
 * Integration:
 * - Feeds into generateCitizensEvents v2.6 for archetype-aware pool selection
 * - Readable by Claude for narrative decisions
 *
 * @version 1.0
 * @phase utilities
 * ============================================================================
 */

// ============================================================================
// CONSTANTS
// ============================================================================

var COMPRESS_VERSION = '1.0';

// Decay rate per cycle (0.95 = tag from 20 cycles ago retains ~36% weight)
var TAG_DECAY_RATE = 0.95;

// Keep last N raw entries in LifeHistory (older get trimmed after compression)
var KEEP_RAW_ENTRIES = 20;

// Minimum cycles between compression runs per citizen
var MIN_CYCLES_BETWEEN_COMPRESS = 10;

// Tag → Trait axis mappings
var TAG_TRAIT_MAP = {
  // Relationship-oriented
  'Relationship': { social: 0.8, reflective: 0.2 },
  'relationship:alliance': { social: 0.9, driven: 0.3 },
  'relationship:rivalry': { volatile: 0.7, driven: 0.5 },
  'relationship:mentorship': { social: 0.6, reflective: 0.4 },
  'Alliance': { social: 0.8, driven: 0.3 },
  'Rivalry': { volatile: 0.6, driven: 0.4 },
  'Mentorship': { social: 0.5, reflective: 0.5 },

  // Community/Neighborhood
  'Neighborhood': { grounded: 0.7, social: 0.3 },
  'Community': { social: 0.7, grounded: 0.4 },
  'source:neighborhood': { grounded: 0.6, social: 0.2 },
  'source:community': { social: 0.6, grounded: 0.3 },

  // Reflective/Internal
  'Daily': { grounded: 0.5, reflective: 0.3 },
  'Background': { grounded: 0.4, reflective: 0.2 },
  'Household': { grounded: 0.6, social: 0.2 },
  'Education': { reflective: 0.7, driven: 0.4 },
  'source:daily': { grounded: 0.4 },

  // Work/Achievement
  'Work': { driven: 0.8, grounded: 0.3 },
  'source:occupation': { driven: 0.7, grounded: 0.2 },
  'Arc': { driven: 0.5, volatile: 0.3 },
  'arc:generic': { driven: 0.4, volatile: 0.2 },

  // External/Reactive
  'Weather': { reflective: 0.4, grounded: 0.3 },
  'source:weather': { reflective: 0.3 },
  'Media': { reflective: 0.5, volatile: 0.2 },
  'source:media': { reflective: 0.4 },

  // Calendar/Cultural
  'Holiday': { social: 0.5, grounded: 0.4 },
  'FirstFriday': { social: 0.6, reflective: 0.3 },
  'CreationDay': { grounded: 0.7, reflective: 0.3 },
  'Sports': { social: 0.5, volatile: 0.3 },

  // QoL-driven (from v2.6)
  'QoL': { grounded: 0.4, volatile: 0.3 },
  'qol:low': { volatile: 0.5, grounded: 0.2 },
  'qol:high': { grounded: 0.6, social: 0.3 },

  // Continuity
  'Continuity': { driven: 0.4, reflective: 0.3 }
};

// Archetype definitions based on trait dominance
var ARCHETYPES = {
  'Connector': { social: 0.7, grounded: 0.4 },
  'Watcher': { reflective: 0.7, grounded: 0.3 },
  'Striver': { driven: 0.7, volatile: 0.3 },
  'Anchor': { grounded: 0.8, social: 0.3 },
  'Catalyst': { volatile: 0.6, social: 0.4 },
  'Caretaker': { social: 0.5, grounded: 0.5, reflective: 0.3 },
  'Drifter': { reflective: 0.4, volatile: 0.4 }
};

// Modifier words based on secondary traits
var TRAIT_MODIFIERS = {
  social: ['warm', 'outgoing', 'connected'],
  reflective: ['thoughtful', 'observant', 'curious'],
  driven: ['ambitious', 'focused', 'determined'],
  grounded: ['steady', 'reliable', 'rooted'],
  volatile: ['restless', 'reactive', 'intense']
};

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Compress LifeHistory for all citizens and write TraitProfile.
 *
 * @param {Object} ctx - Engine context
 * @param {Object} options - { trimHistory: boolean, forceAll: boolean }
 */
function compressLifeHistory_(ctx, options) {
  options = options || {};
  var trimHistory = options.trimHistory !== false; // default true
  var forceAll = options.forceAll || false;

  var ss = ctx.ss;
  var sheet = ss.getSheetByName('Simulation_Ledger');
  if (!sheet) return;

  var S = ctx.summary || {};
  var cycle = S.absoluteCycle || S.cycleId || 0;

  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return;

  var header = values[0];
  var rows = values.slice(1);

  function idx(n) { return header.indexOf(n); }

  var iPopID = idx('POPID');
  var iLifeHistory = idx('LifeHistory');
  var iTraitProfile = idx('TraitProfile');

  // Fallback: check for OriginVault if TraitProfile doesn't exist
  if (iTraitProfile < 0) {
    iTraitProfile = idx('OriginVault');
  }

  if (iPopID < 0 || iLifeHistory < 0) {
    Logger.log('compressLifeHistory_: Missing required columns');
    return;
  }

  // If TraitProfile column doesn't exist, we can't write
  if (iTraitProfile < 0) {
    Logger.log('compressLifeHistory_: No TraitProfile or OriginVault column found');
    return;
  }

  var updated = 0;
  var skipped = 0;

  for (var r = 0; r < rows.length; r++) {
    var row = rows[r];
    var popId = row[iPopID];
    var lifeHistory = row[iLifeHistory] ? String(row[iLifeHistory]) : '';
    var existingProfile = row[iTraitProfile] ? String(row[iTraitProfile]) : '';

    if (!popId || !lifeHistory) continue;

    // Check if recently compressed (unless forceAll)
    if (!forceAll && existingProfile) {
      var lastUpdate = parseLastUpdateCycle_(existingProfile);
      if (lastUpdate > 0 && (cycle - lastUpdate) < MIN_CYCLES_BETWEEN_COMPRESS) {
        skipped++;
        continue;
      }
    }

    // Parse and compress
    var entries = parseLifeHistoryEntries_(lifeHistory);
    if (entries.length < 3) {
      skipped++;
      continue; // Not enough history to profile
    }

    var profile = computeProfile_(entries, cycle);
    var profileString = formatProfileString_(profile, cycle);

    // Write profile to column R
    row[iTraitProfile] = profileString;

    // Optionally trim old entries
    if (trimHistory && entries.length > KEEP_RAW_ENTRIES) {
      var trimmedHistory = trimLifeHistory_(entries, KEEP_RAW_ENTRIES, profile);
      row[iLifeHistory] = trimmedHistory;
    }

    rows[r] = row;
    updated++;
  }

  // Write back
  if (updated > 0) {
    sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
  }

  // Log results
  S.lifeHistoryCompression = {
    cycle: cycle,
    updated: updated,
    skipped: skipped,
    version: COMPRESS_VERSION
  };

  ctx.summary = S;

  Logger.log('compressLifeHistory_: Updated ' + updated + ' profiles, skipped ' + skipped);
}

// ============================================================================
// PARSING FUNCTIONS
// ============================================================================

/**
 * Parse LifeHistory string into structured entries.
 *
 * @param {string} historyStr
 * @return {Array} Array of { timestamp, tag, text, ageInCycles }
 */
function parseLifeHistoryEntries_(historyStr) {
  var entries = [];
  var lines = historyStr.split('\n');

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (!line) continue;

    var entry = parseHistoryLine_(line);
    if (entry) {
      entries.push(entry);
    }
  }

  return entries;
}

/**
 * Parse a single LifeHistory line.
 * Formats:
 * - "2025-12-22 03:48 — [Tag] description"
 * - "Born into population during Cycle 3."
 * - "Engine Event: description"
 *
 * @param {string} line
 * @return {Object|null}
 */
function parseHistoryLine_(line) {
  // Standard format: "YYYY-MM-DD HH:MM — [Tag] text"
  var standardMatch = line.match(/^(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2})\s*[—-]\s*\[([^\]]+)\]\s*(.*)$/);
  if (standardMatch) {
    return {
      timestamp: standardMatch[1],
      tag: standardMatch[2],
      text: standardMatch[3],
      raw: line
    };
  }

  // Engine event format: "Engine Event: description"
  var engineMatch = line.match(/^Engine\s+Event:\s*(.*)$/i);
  if (engineMatch) {
    return {
      timestamp: null,
      tag: 'EngineEvent',
      text: engineMatch[1],
      raw: line
    };
  }

  // Birth format: "Born into population during Cycle N."
  var birthMatch = line.match(/^Born\s+into\s+population/i);
  if (birthMatch) {
    return {
      timestamp: null,
      tag: 'Birth',
      text: line,
      raw: line
    };
  }

  // Fallback: treat as untagged
  return {
    timestamp: null,
    tag: 'Untagged',
    text: line,
    raw: line
  };
}

/**
 * Extract last update cycle from existing profile string.
 *
 * @param {string} profileStr
 * @return {number}
 */
function parseLastUpdateCycle_(profileStr) {
  var match = profileStr.match(/Updated:c(\d+)/);
  if (match) {
    return parseInt(match[1], 10);
  }
  return 0;
}

// ============================================================================
// PROFILE COMPUTATION
// ============================================================================

/**
 * Compute personality profile from entries.
 *
 * @param {Array} entries
 * @param {number} currentCycle
 * @return {Object}
 */
function computeProfile_(entries, currentCycle) {
  // Count tags with decay
  var tagCounts = {};
  var traitScores = { social: 0, reflective: 0, driven: 0, grounded: 0, volatile: 0 };
  var motifCounts = {};
  var totalWeight = 0;

  for (var i = 0; i < entries.length; i++) {
    var entry = entries[i];
    var age = entries.length - i; // Older entries have higher age
    var weight = Math.pow(TAG_DECAY_RATE, age);

    var tag = entry.tag;
    tagCounts[tag] = (tagCounts[tag] || 0) + weight;
    totalWeight += weight;

    // Map tag to traits
    applyTagToTraits_(tag, weight, traitScores);

    // Extract motifs from text
    extractMotifs_(entry.text, weight, motifCounts);
  }

  // Normalize trait scores to 0-1 range
  var maxTrait = 0;
  for (var t in traitScores) {
    if (traitScores[t] > maxTrait) maxTrait = traitScores[t];
  }
  if (maxTrait > 0) {
    for (var t2 in traitScores) {
      traitScores[t2] = Math.round((traitScores[t2] / maxTrait) * 100) / 100;
    }
  }

  // Determine archetype
  var archetype = assignArchetype_(traitScores);

  // Get modifiers (secondary traits)
  var modifiers = getModifiers_(traitScores, archetype);

  // Get top tags
  var topTags = getTopN_(tagCounts, 5);

  // Get top motifs
  var topMotifs = getTopN_(motifCounts, 3);

  return {
    archetype: archetype,
    modifiers: modifiers,
    traitScores: traitScores,
    topTags: topTags,
    topMotifs: topMotifs,
    entryCount: entries.length
  };
}

/**
 * Apply tag weight to trait scores.
 *
 * @param {string} tag
 * @param {number} weight
 * @param {Object} traitScores
 */
function applyTagToTraits_(tag, weight, traitScores) {
  var mapping = TAG_TRAIT_MAP[tag];
  if (mapping) {
    for (var trait in mapping) {
      traitScores[trait] = (traitScores[trait] || 0) + (mapping[trait] * weight);
    }
  }
}

/**
 * Extract motifs (recurring phrases/venues) from text.
 *
 * @param {string} text
 * @param {number} weight
 * @param {Object} motifCounts
 */
function extractMotifs_(text, weight, motifCounts) {
  if (!text) return;

  var lowerText = text.toLowerCase();

  // Common venue patterns
  var venuePatterns = [
    'corner store', 'local park', 'home', 'at work', 'neighborhood',
    'quiet time', 'coffee', 'cafe', 'lakeside', 'downtown', 'waterfront',
    'gallery', 'community', 'church', 'school', 'library'
  ];

  for (var i = 0; i < venuePatterns.length; i++) {
    if (lowerText.indexOf(venuePatterns[i]) >= 0) {
      motifCounts[venuePatterns[i]] = (motifCounts[venuePatterns[i]] || 0) + weight;
    }
  }

  // Action patterns
  var actionPatterns = [
    'reached out', 'felt distant', 'quiet moment', 'adjusted', 'reflected',
    'noticed', 'engaged', 'comfortable', 'uncomfortable', 'tension'
  ];

  for (var j = 0; j < actionPatterns.length; j++) {
    if (lowerText.indexOf(actionPatterns[j]) >= 0) {
      motifCounts[actionPatterns[j]] = (motifCounts[actionPatterns[j]] || 0) + weight;
    }
  }
}

/**
 * Assign archetype based on trait scores.
 *
 * @param {Object} traitScores
 * @return {string}
 */
function assignArchetype_(traitScores) {
  var bestArchetype = 'Drifter';
  var bestScore = -1;

  for (var archetype in ARCHETYPES) {
    var requirements = ARCHETYPES[archetype];
    var score = 0;
    var matches = 0;

    for (var trait in requirements) {
      var required = requirements[trait];
      var actual = traitScores[trait] || 0;
      if (actual >= required * 0.7) { // 70% threshold
        score += actual;
        matches++;
      }
    }

    // Require at least 1 trait match
    if (matches > 0 && score > bestScore) {
      bestScore = score;
      bestArchetype = archetype;
    }
  }

  return bestArchetype;
}

/**
 * Get modifier words based on secondary traits.
 *
 * @param {Object} traitScores
 * @param {string} archetype
 * @return {Array}
 */
function getModifiers_(traitScores, archetype) {
  // Sort traits by score
  var sorted = [];
  for (var trait in traitScores) {
    sorted.push({ trait: trait, score: traitScores[trait] });
  }
  sorted.sort(function(a, b) { return b.score - a.score; });

  var modifiers = [];

  // Take top 2 traits as modifiers (skip if they define the archetype)
  for (var i = 0; i < sorted.length && modifiers.length < 2; i++) {
    var trait = sorted[i].trait;
    var score = sorted[i].score;

    if (score < 0.3) continue; // Too weak

    var words = TRAIT_MODIFIERS[trait];
    if (words && words.length > 0) {
      // Pick word based on score intensity
      var wordIdx = score >= 0.7 ? 0 : (score >= 0.5 ? 1 : 2);
      wordIdx = Math.min(wordIdx, words.length - 1);
      modifiers.push(words[wordIdx]);
    }
  }

  return modifiers;
}

/**
 * Get top N items from a counts object.
 *
 * @param {Object} counts
 * @param {number} n
 * @return {Array}
 */
function getTopN_(counts, n) {
  var items = [];
  for (var key in counts) {
    items.push({ key: key, count: counts[key] });
  }
  items.sort(function(a, b) { return b.count - a.count; });

  var result = [];
  for (var i = 0; i < Math.min(n, items.length); i++) {
    result.push(items[i].key);
  }
  return result;
}

// ============================================================================
// OUTPUT FORMATTING
// ============================================================================

/**
 * Format profile as pipe-delimited string.
 *
 * @param {Object} profile
 * @param {number} cycle
 * @return {string}
 */
function formatProfileString_(profile, cycle) {
  var parts = [];

  // Archetype
  parts.push('Archetype:' + profile.archetype);

  // Modifiers
  if (profile.modifiers.length > 0) {
    parts.push('Mods:' + profile.modifiers.join(','));
  }

  // Trait scores (only significant ones)
  for (var trait in profile.traitScores) {
    var score = profile.traitScores[trait];
    if (score >= 0.3) {
      parts.push(trait + ':' + score.toFixed(2));
    }
  }

  // Top tags
  if (profile.topTags.length > 0) {
    parts.push('TopTags:' + profile.topTags.join(','));
  }

  // Motifs
  if (profile.topMotifs.length > 0) {
    parts.push('Motifs:' + profile.topMotifs.join(','));
  }

  // Metadata
  parts.push('Entries:' + profile.entryCount);
  parts.push('Updated:c' + cycle);

  return parts.join('|');
}

/**
 * Trim LifeHistory to keep only recent entries, with compressed summary.
 *
 * @param {Array} entries
 * @param {number} keepCount
 * @param {Object} profile
 * @return {string}
 */
function trimLifeHistory_(entries, keepCount, profile) {
  if (entries.length <= keepCount) {
    // Nothing to trim, return original
    var lines = [];
    for (var i = 0; i < entries.length; i++) {
      lines.push(entries[i].raw);
    }
    return lines.join('\n');
  }

  // Split into old (to compress) and recent (to keep)
  var oldCount = entries.length - keepCount;
  var oldEntries = entries.slice(0, oldCount);
  var recentEntries = entries.slice(oldCount);

  // Create compressed summary of old entries
  var compressedLine = createCompressedBlock_(oldEntries, profile);

  // Build new history
  var newLines = [compressedLine];
  for (var j = 0; j < recentEntries.length; j++) {
    newLines.push(recentEntries[j].raw);
  }

  return newLines.join('\n');
}

/**
 * Create a compressed summary block for old entries.
 *
 * @param {Array} oldEntries
 * @param {Object} profile
 * @return {string}
 */
function createCompressedBlock_(oldEntries, profile) {
  // Count tags in old entries
  var tagCounts = {};
  for (var i = 0; i < oldEntries.length; i++) {
    var tag = oldEntries[i].tag;
    tagCounts[tag] = (tagCounts[tag] || 0) + 1;
  }

  // Get top 3 tags
  var topTags = getTopN_(tagCounts, 3);

  // Get date range
  var firstDate = oldEntries[0].timestamp || '?';
  var lastDate = oldEntries[oldEntries.length - 1].timestamp || '?';

  // Build compressed line
  var summary = '[Compressed: ' + oldEntries.length + ' entries, ' +
                firstDate + ' to ' + lastDate + '] ' +
                'Dominant: ' + topTags.join(', ') +
                ' | Profile: ' + profile.archetype;

  return summary;
}

// ============================================================================
// ACCESSOR FOR EVENT GENERATION
// ============================================================================

/**
 * Get citizen's archetype from TraitProfile.
 * Used by generateCitizensEvents v2.6 for archetype-aware pool selection.
 *
 * @param {Object} ctx
 * @param {string} popId
 * @return {Object|null} { archetype, modifiers, traits }
 */
function getCitizenArchetype_(ctx, popId) {
  // Check cache first
  if (ctx._archetypeCache && ctx._archetypeCache[popId]) {
    return ctx._archetypeCache[popId];
  }

  // Initialize cache
  if (!ctx._archetypeCache) {
    ctx._archetypeCache = {};
  }

  // Look up from citizenLookup if TraitProfile was loaded
  var citizen = ctx.citizenLookup && ctx.citizenLookup[popId];
  if (!citizen || !citizen.TraitProfile) {
    return null;
  }

  var profile = parseProfileString_(citizen.TraitProfile);
  ctx._archetypeCache[popId] = profile;
  return profile;
}

/**
 * Parse a TraitProfile string back into an object.
 *
 * @param {string} profileStr
 * @return {Object}
 */
function parseProfileString_(profileStr) {
  if (!profileStr) return null;

  var result = {
    archetype: 'Drifter',
    modifiers: [],
    traits: {}
  };

  var parts = profileStr.split('|');
  for (var i = 0; i < parts.length; i++) {
    var part = parts[i];
    var colonIdx = part.indexOf(':');
    if (colonIdx < 0) continue;

    var key = part.substring(0, colonIdx);
    var value = part.substring(colonIdx + 1);

    if (key === 'Archetype') {
      result.archetype = value;
    } else if (key === 'Mods') {
      result.modifiers = value.split(',');
    } else if (key === 'TopTags' || key === 'Motifs' || key === 'Entries' || key === 'Updated') {
      // Skip metadata
    } else {
      // Trait score
      result.traits[key] = parseFloat(value) || 0;
    }
  }

  return result;
}


/**
 * ============================================================================
 * COMPRESS LIFE HISTORY REFERENCE v1.0
 * ============================================================================
 *
 * PURPOSE:
 * Compresses LifeHistory (column O) into a personality profile stored in
 * TraitProfile (column R). Prevents cell bloat while preserving identity.
 *
 * INPUT:
 * Column O (LifeHistory): Timestamped event entries with [Tag] markers
 *
 * OUTPUT:
 * Column R (TraitProfile): Pipe-delimited profile string
 * Format: Archetype:Watcher|Mods:curious,steady|social:0.65|...
 *
 * ARCHETYPES:
 * - Connector: High social, moderate grounded
 * - Watcher: High reflective, moderate grounded
 * - Striver: High driven, moderate volatile
 * - Anchor: High grounded, moderate social
 * - Catalyst: High volatile, moderate social
 * - Caretaker: Balanced social/grounded/reflective
 * - Drifter: Default/balanced
 *
 * TRAITS:
 * - social: Relationship-oriented, outgoing
 * - reflective: Thoughtful, observant
 * - driven: Achievement-oriented, ambitious
 * - grounded: Stable, community-rooted
 * - volatile: Reactive, intense, changeable
 *
 * DECAY RATE: 0.95 per entry age
 * - Tag from 20 entries ago: ~36% weight
 * - Tag from 50 entries ago: ~8% weight
 *
 * HISTORY TRIMMING:
 * - Keeps last 20 raw entries
 * - Older entries compressed into summary block
 *
 * USAGE:
 * compressLifeHistory_(ctx, { trimHistory: true, forceAll: false })
 *
 * ACCESSOR:
 * getCitizenArchetype_(ctx, popId) → { archetype, modifiers, traits }
 *
 * ============================================================================
 */
