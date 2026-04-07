/**
 * ============================================================================
 * buildMediaPacket_ v2.4
 * ============================================================================
 *
 * Fully world-aware, aligned with GodWorld Calendar v1.0.
 * Produces the final newsroom packet text.
 *
 * v2.4 Enhancements:
 * - Section 7: Voice guidance on story seeds and hooks
 * - Displays suggestedJournalist, suggestedAngle, matchConfidence, first line of voiceGuidance
 *
 * v2.3 Enhancements:
 * - ES5 syntax for Google Apps Script compatibility
 * - Defensive guards for ctx/summary
 * - for loops instead of forEach
 *
 * v2.2 Features:
 * - Expanded calendar context in CityPulse Snapshot
 * - Holiday with priority level
 * - First Friday indicator
 * - Creation Day indicator
 * - Sports season phase
 * - Expanded crowd map (12 neighborhoods)
 *
 * Previous features (v2.1):
 * - Economic, weather mood, bonds, arcs, media effects
 * - All standard packet sections
 *
 * ============================================================================
 */

function buildMediaPacket_(ctx) {

  // Defensive guard
  if (!ctx) return;
  if (!ctx.summary) ctx.summary = {};

  var s = ctx.summary;
  var pkt = [];

  // Helper for safe access
  var safe = function(val, def) { return val !== undefined && val !== null ? val : def; };

  // ══════════════════════════════════════════════════════════════════════════
  // HEADER
  // ══════════════════════════════════════════════════════════════════════════
  pkt.push('═══════════════════════════════════════════════════════');
  pkt.push('CYCLE ' + s.cycleId + ' — MEDIA PACKET');
  pkt.push('═══════════════════════════════════════════════════════');
  pkt.push('');

  // ══════════════════════════════════════════════════════════════════════════
  // 1. CITYPULSE SNAPSHOT (v2.2 - expanded calendar context)
  // ══════════════════════════════════════════════════════════════════════════
  pkt.push('1. CITYPULSE SNAPSHOT');
  pkt.push('───────────────────────────────────────────────────────');

  var demo = s.demographicDrift || {};
  pkt.push('Population: stable');
  pkt.push('Employment: ' + (demo.employmentRate ? (demo.employmentRate * 100).toFixed(1) + '%' : 'steady'));
  pkt.push('Economy: ' + (demo.economy || s.economy || 'stable'));
  pkt.push('Economic Mood: ' + (s.economicMood || 50) + '/100');
  pkt.push('Health baseline: ' + (demo.illnessRate ? (demo.illnessRate * 100).toFixed(2) + '% illness' : 'normal'));
  
  // ─────────────────────────────────────────────────────────────────────────
  // CALENDAR CONTEXT (v2.2)
  // ─────────────────────────────────────────────────────────────────────────
  pkt.push('');
  pkt.push('── Calendar ──');
  pkt.push('Season: ' + (s.season || '(none)'));

  // Holiday with priority
  var holiday = s.holiday || 'none';
  var holidayPriority = s.holidayPriority || 'none';
  if (holiday !== 'none') {
    pkt.push('Holiday: ' + holiday + ' (priority: ' + holidayPriority + ')');
  } else {
    pkt.push('Holiday: none');
  }

  // First Friday
  var isFirstFriday = s.isFirstFriday || false;
  pkt.push('First Friday: ' + (isFirstFriday ? 'YES — arts district active' : 'no'));

  // Creation Day
  var isCreationDay = s.isCreationDay || false;
  pkt.push('Creation Day: ' + (isCreationDay ? 'YES — Oakland founding celebration' : 'no'));

  // Sports Season
  var sportsSeason = s.sportsSeason || 'off-season';
  pkt.push('Sports Season: ' + sportsSeason);
  
  // ─────────────────────────────────────────────────────────────────────────
  // WEATHER CONTEXT
  // ─────────────────────────────────────────────────────────────────────────
  pkt.push('');
  pkt.push('── Weather ──');
  var weather = s.weather || {};
  var weatherMood = s.weatherMood || {};
  pkt.push('Conditions: ' + (weather.type || '(none)') + ' (impact ' + (weather.impact || '?') + ')');
  pkt.push('Weather Mood: ' + (weatherMood.primaryMood || 'neutral') + ' (comfort: ' + (weatherMood.comfortIndex ? weatherMood.comfortIndex.toFixed(2) : '?') + ')');

  pkt.push('');
  pkt.push('Chaos Events: ' + (s.worldEvents ? s.worldEvents.length : 0));
  pkt.push('');

  // ══════════════════════════════════════════════════════════════════════════
  // 2. DEMOGRAPHIC NOTES
  // ══════════════════════════════════════════════════════════════════════════
  pkt.push('2. DEMOGRAPHIC NOTES');
  pkt.push('───────────────────────────────────────────────────────');
  pkt.push('Intake: ' + safe(s.intakeProcessed, 0));
  pkt.push('Aged: ' + safe(s.citizensUpdated, 0));
  pkt.push('Migration Drift: ' + (demo.migration || s.migrationDrift || 0));
  pkt.push('New Citizens: ' + (s.citizensGenerated || 0));
  pkt.push('Promotions: ' + (s.promotionsCount || 0));
  pkt.push('');

  // ══════════════════════════════════════════════════════════════════════════
  // 3. COMMUNITY BEHAVIOR NOTES
  // ══════════════════════════════════════════════════════════════════════════
  pkt.push('3. COMMUNITY BEHAVIOR NOTES');
  pkt.push('───────────────────────────────────────────────────────');
  pkt.push('Events Generated: ' + (s.eventsGenerated || 0));
  pkt.push('Issues: ' + (s.auditIssues && s.auditIssues.length ? s.auditIssues.slice(0, 5).join('; ') : '(none)'));
  pkt.push('Pattern: ' + (s.patternFlag || 'none'));
  pkt.push('ShockFlag: ' + (s.shockFlag || 'none'));
  if (s.shockReasons && s.shockReasons.length) {
    pkt.push('Shock Reasons: ' + s.shockReasons.join(', '));
  }
  pkt.push('');

  pkt.push('World Events:');
  if (s.worldEvents && s.worldEvents.length) {
    var evSlice = s.worldEvents.slice(0, 8);
    for (var evi = 0; evi < evSlice.length; evi++) {
      var ev = evSlice[evi];
      var desc = ev.description || ev.subdomain || ev.domain || 'event';
      var sev = ev.severity || 'low';
      var neigh = ev.neighborhood || '';
      pkt.push('  - [' + (ev.domain || 'GENERAL') + '] ' + desc + ' (' + sev + ')' + (neigh ? ' @ ' + neigh : ''));
    }
    if (s.worldEvents.length > 8) {
      pkt.push('  ... and ' + (s.worldEvents.length - 8) + ' more');
    }
  } else {
    pkt.push('  - (none)');
  }
  pkt.push('');

  // ══════════════════════════════════════════════════════════════════════════
  // 4. PUBLIC SAFETY & HEALTH WATCH
  // ══════════════════════════════════════════════════════════════════════════
  pkt.push('4. PUBLIC SAFETY & HEALTH WATCH');
  pkt.push('───────────────────────────────────────────────────────');
  pkt.push('Civic Load: ' + (s.civicLoad || 'stable') + ' (score: ' + (s.civicLoadScore || 0) + ')');
  if (s.civicLoadFactors && s.civicLoadFactors.length) {
    pkt.push('Load Factors: ' + s.civicLoadFactors.join(', '));
  }
  pkt.push('Evening Safety: ' + (s.eveningSafety || 'calm'));
  pkt.push('City Sentiment: ' + (s.cityDynamics ? s.cityDynamics.sentiment : 0));
  pkt.push('');

  // ══════════════════════════════════════════════════════════════════════════
  // 5. ECONOMIC SIGNALS
  // ══════════════════════════════════════════════════════════════════════════
  pkt.push('5. ECONOMIC SIGNALS');
  pkt.push('───────────────────────────────────────────────────────');
  pkt.push('Economic Mood: ' + (s.economicMood || 50) + '/100');
  if (s.economicNarrative) {
    pkt.push('Economic Narrative: ' + s.economicNarrative);
  }
  var ripples = s.economicRipples || [];
  if (ripples.length > 0) {
    pkt.push('Active Ripples: ' + ripples.length);
    var ripSlice = ripples.slice(0, 3);
    for (var ri = 0; ri < ripSlice.length; ri++) {
      var r = ripSlice[ri];
      pkt.push('  - ' + (r.domain || 'general') + ': ' + (r.effect || 'ripple'));
    }
  }
  pkt.push('');

  // ══════════════════════════════════════════════════════════════════════════
  // 6. MEDIA LANDSCAPE
  // ══════════════════════════════════════════════════════════════════════════
  pkt.push('6. MEDIA LANDSCAPE');
  pkt.push('───────────────────────────────────────────────────────');
  var media = s.mediaEffects || {};
  pkt.push('Coverage Intensity: ' + (media.coverageIntensity || 'minimal'));
  pkt.push('Crisis Saturation: ' + (media.crisisSaturation ? (media.crisisSaturation * 100).toFixed(0) + '%' : '0%'));
  pkt.push('Public Attention: ' + (media.publicAttention || 'normal'));
  pkt.push('');

  // ══════════════════════════════════════════════════════════════════════════
  // 7. STORY SEEDS & HOOKS
  // ══════════════════════════════════════════════════════════════════════════
  pkt.push('7. STORY SEEDS & HOOKS');
  pkt.push('───────────────────────────────────────────────────────');
  var seeds = s.storySeeds || [];
  if (seeds.length > 0) {
    var seedSlice = seeds.slice(0, 6);
    for (var si = 0; si < seedSlice.length; si++) {
      var x = seedSlice[si];
      if (typeof x === 'object') {
        pkt.push('  - [' + (x.domain || 'GENERAL') + '] ' + (x.seed || x.text || x.description || 'seed'));
        // v2.4: Voice guidance for story seeds
        if (x.suggestedJournalist) {
          pkt.push('    → ' + x.suggestedJournalist + ' | ' + (x.suggestedAngle || 'general angle') + ' [' + (x.matchConfidence || 'low') + ']');
        }
        if (x.voiceGuidance) {
          pkt.push('    Voice: ' + x.voiceGuidance.split('\n')[0]);
        }
      } else {
        pkt.push('  - ' + x);
      }
    }
    if (seeds.length > 6) pkt.push('  ... and ' + (seeds.length - 6) + ' more seeds');
  } else {
    pkt.push('  (no seeds)');
  }

  var hooks = s.storyHooks || [];
  if (hooks.length > 0) {
    pkt.push('Story Hooks:');
    var hookSlice = hooks.slice(0, 4);
    for (var hi = 0; hi < hookSlice.length; hi++) {
      var h = hookSlice[hi];
      pkt.push('  - ' + (h.hook || h.text || h.description || 'hook') + ' (' + (h.priority || 'normal') + ')');
      // v2.4: Voice guidance for story hooks
      if (h.suggestedJournalist) {
        pkt.push('    → ' + h.suggestedJournalist + ' | ' + (h.suggestedAngle || 'general angle') + ' [' + (h.matchConfidence || 'low') + ']');
      }
      if (h.voiceGuidance) {
        pkt.push('    Voice: ' + h.voiceGuidance.split('\n')[0]);
      }
    }
  }
  pkt.push('');

  // ══════════════════════════════════════════════════════════════════════════
  // 8. EVENT ARCS
  // ══════════════════════════════════════════════════════════════════════════
  pkt.push('8. EVENT ARCS');
  pkt.push('───────────────────────────────────────────────────────');
  var arcs = s.eventArcs || [];
  var activeArcs = [];
  for (var ai = 0; ai < arcs.length; ai++) {
    if (arcs[ai] && arcs[ai].phase !== 'resolved') activeArcs.push(arcs[ai]);
  }
  if (activeArcs.length > 0) {
    var arcSlice = activeArcs.slice(0, 5);
    for (var ari = 0; ari < arcSlice.length; ari++) {
      var a = arcSlice[ari];
      pkt.push('  - ' + (a.name || a.arcId || 'arc') + ' [' + (a.phase || '?') + '] tension: ' + (a.tension || 0) + '/10');
    }
  } else {
    pkt.push('  (no active arcs)');
  }
  pkt.push('');

  // ══════════════════════════════════════════════════════════════════════════
  // 9. NAMED SPOTLIGHTS
  // ══════════════════════════════════════════════════════════════════════════
  pkt.push('9. NAMED SPOTLIGHTS');
  pkt.push('───────────────────────────────────────────────────────');
  var spotlights = s.namedSpotlights || [];
  if (spotlights.length > 0) {
    var spSlice = spotlights.slice(0, 5);
    for (var spi = 0; spi < spSlice.length; spi++) {
      var sp = spSlice[spi];
      pkt.push('  - ' + (sp.name || sp.popId) + ' (score: ' + sp.score + ')' + (sp.neighborhood ? ' @ ' + sp.neighborhood : ''));
    }
  } else {
    pkt.push('  (no spotlights)');
  }
  pkt.push('');

  // ══════════════════════════════════════════════════════════════════════════
  // 10. BONDS & RELATIONSHIPS
  // ══════════════════════════════════════════════════════════════════════════
  pkt.push('10. BONDS & RELATIONSHIPS');
  pkt.push('───────────────────────────────────────────────────────');
  var bonds = s.newBonds || [];
  if (bonds.length > 0) {
    var bondSlice = bonds.slice(0, 4);
    for (var bi = 0; bi < bondSlice.length; bi++) {
      var b = bondSlice[bi];
      pkt.push('  - ' + (b.type || 'bond') + ': ' + (b.citizen1 || '?') + ' ↔ ' + (b.citizen2 || '?'));
    }
  } else {
    pkt.push('  (no new bonds)');
  }
  pkt.push('');

  // ══════════════════════════════════════════════════════════════════════════
  // 11. EVENING CYCLE SIGNALS (v2.2 - calendar-aware labels)
  // ══════════════════════════════════════════════════════════════════════════
  pkt.push('11. EVENING CYCLE SIGNALS');
  pkt.push('───────────────────────────────────────────────────────');
  pkt.push('Streaming Trend: ' + (s.streamingTrend || '(none)'));
  pkt.push('Sports: ' + (s.eveningSports || '(none)'));
  pkt.push('Famous Sightings: ' + (s.famousPeople ? s.famousPeople.join(', ') : '(none)'));

  var food = s.eveningFood || {};
  pkt.push('Restaurants: ' + (food.restaurants ? food.restaurants.join(', ') : '(none)'));
  pkt.push('Food Trend: ' + (food.trend || 'normal'));

  pkt.push('City Events: ' + (s.cityEvents ? s.cityEvents.join(', ') : '(none)'));

  var nightlife = s.nightlife || {};
  pkt.push('Nightlife: ' + (nightlife.spots ? nightlife.spots.join(', ') : '(none)'));
  pkt.push('Nightlife Volume: ' + (s.nightlifeVolume || 0) + '/10 (' + (nightlife.vibe || 'steady') + ')');
  pkt.push('Evening Traffic: ' + (s.eveningTraffic || 'light'));
  pkt.push('');

  // ══════════════════════════════════════════════════════════════════════════
  // 12. CROWD MAP (v2.2 - 12 Oakland neighborhoods)
  // ══════════════════════════════════════════════════════════════════════════
  pkt.push('12. CROWD MAP');
  pkt.push('───────────────────────────────────────────────────────');
  var crowd = s.crowdMap || {};
  var hotspots = s.crowdHotspots || [];
  if (hotspots.length > 0) {
    pkt.push('Hotspots: ' + hotspots.join(', '));
  }

  // v2.2: Sort by density for cleaner display (ES5 compatible)
  var crowdKeys = Object.keys(crowd);
  var sortedCrowd = [];
  for (var ci = 0; ci < crowdKeys.length; ci++) {
    sortedCrowd.push({ neigh: crowdKeys[ci], val: crowd[crowdKeys[ci]] });
  }
  sortedCrowd.sort(function(a, b) { return b.val - a.val; });
  for (var cj = 0; cj < sortedCrowd.length; cj++) {
    var item = sortedCrowd[cj];
    var bar = '';
    var barLen = Math.min(item.val, 10);
    for (var bk = 0; bk < barLen; bk++) bar += '█';
    var paddedNeigh = item.neigh;
    while (paddedNeigh.length < 14) paddedNeigh += ' ';
    pkt.push('  ' + paddedNeigh + ' ' + bar + ' (' + item.val + ')');
  }
  pkt.push('');

  // ══════════════════════════════════════════════════════════════════════════
  // 13. EDITOR'S NOTES
  // ══════════════════════════════════════════════════════════════════════════
  pkt.push('13. EDITOR\'S NOTES');
  pkt.push('───────────────────────────────────────────────────────');
  pkt.push('CycleWeight: ' + (s.cycleWeight || 'low-signal') + ' (score: ' + (s.cycleWeightScore || 0) + ')');
  pkt.push('WeightReason: ' + (s.cycleWeightReason || '(none)'));
  pkt.push('SummaryLine: ' + (s.compressedLine || '(none)'));

  // v2.2: Calendar editorial hints
  if (holiday !== 'none' && holidayPriority === 'major') {
    pkt.push('MAJOR HOLIDAY - expect holiday-themed coverage');
  }
  if (holiday !== 'none' && holidayPriority === 'oakland') {
    pkt.push('OAKLAND CELEBRATION - local pride angle recommended');
  }
  if (isFirstFriday) {
    pkt.push('FIRST FRIDAY - arts & culture focus');
  }
  if (isCreationDay) {
    pkt.push('CREATION DAY - Oakland history & heritage angle');
  }
  if (sportsSeason === 'championship') {
    pkt.push('CHAMPIONSHIP SEASON - sports fever citywide');
  }
  if (sportsSeason === 'playoffs') {
    pkt.push('PLAYOFF SEASON - heightened sports attention');
  }
  pkt.push('');

  // ══════════════════════════════════════════════════════════════════════════
  // 14. CULTURAL INDEX
  // ══════════════════════════════════════════════════════════════════════════
  pkt.push('14. CULTURAL INDEX');
  pkt.push('───────────────────────────────────────────────────────');
  var sightings = s.famousSightings || [];
  if (sightings.length > 0) {
    for (var pi = 0; pi < sightings.length; pi++) {
      var p = sightings[pi];
      pkt.push('  - ' + p.name + ' (' + (p.role || 'celebrity') + ')' + (p.neighborhood ? ' @ ' + p.neighborhood : ''));
    }
  } else if (s.famousPeople && s.famousPeople.length > 0) {
    for (var pj = 0; pj < s.famousPeople.length; pj++) {
      pkt.push('  - ' + s.famousPeople[pj]);
    }
  } else {
    pkt.push('  (none)');
  }
  pkt.push('');

  // ══════════════════════════════════════════════════════════════════════════
  // FINAL OUTPUT
  // ══════════════════════════════════════════════════════════════════════════
  pkt.push('═══════════════════════════════════════════════════════');
  pkt.push('END OF CYCLE ' + s.cycleId + ' MEDIA PACKET');
  pkt.push('═══════════════════════════════════════════════════════');

  ctx.summary.mediaPacket = pkt.join("\n");

  // v2.3: Populate mediaIntake for recordMediaLedger_
  populateMediaIntake_(ctx);
}


/**
 * Populates ctx.summary.mediaIntake from famous sightings and spotlights.
 * This enables recordMediaLedger_ to track cultural entity media mentions.
 * v2.3 addition for Media_Ledger integration.
 */
function populateMediaIntake_(ctx) {
  var s = ctx.summary;

  // Gather all names from various sources
  var names = [];
  var entries = [];

  // Source 1: Famous sightings (structured data)
  var sightings = s.famousSightings || [];
  for (var i = 0; i < sightings.length; i++) {
    var sight = sightings[i];
    if (sight && sight.name) {
      names.push(sight.name);
      entries.push({
        name: sight.name,
        role: sight.role || 'celebrity',
        neighborhood: sight.neighborhood || ''
      });
    }
  }

  // Source 2: Famous people (simple names list)
  var famous = s.famousPeople || [];
  for (var j = 0; j < famous.length; j++) {
    var fname = famous[j];
    if (fname && names.indexOf(fname) === -1) {
      names.push(fname);
      entries.push({
        name: fname,
        role: 'celebrity',
        neighborhood: ''
      });
    }
  }

  // Source 3: Named spotlights
  var spotlights = s.namedSpotlights || [];
  for (var k = 0; k < spotlights.length; k++) {
    var sp = spotlights[k];
    if (sp) {
      var spName = sp.name || sp;
      if (typeof spName === 'string' && names.indexOf(spName) === -1) {
        names.push(spName);
        entries.push({
          name: spName,
          role: sp.role || 'spotlight',
          neighborhood: sp.neighborhood || ''
        });
      }
    }
  }

  // Only populate if we have names
  if (names.length > 0) {
    s.mediaIntake = {
      names: names,
      entries: entries,
      journalist: 'Oakland Daily Media',  // Default journalist
      cycle: s.cycleId || 0
    };
    Logger.log('populateMediaIntake_ v2.3: Populated ' + names.length + ' media mentions');
  }
}


/**
 * ============================================================================
 * MEDIA PACKET REFERENCE v2.4
 * ============================================================================
 * 
 * CALENDAR CONTEXT (Section 1):
 * - Season
 * - Holiday (with priority: major/minor/oakland/cultural)
 * - First Friday: YES/no
 * - Creation Day: YES/no
 * - Sports Season: spring-training/early-season/mid-season/late-season/playoffs/championship/off-season
 * 
 * EDITOR'S HINTS (Section 13):
 * - 📅 MAJOR HOLIDAY — expect holiday-themed coverage
 * - 📅 OAKLAND CELEBRATION — local pride angle recommended
 * - 🎨 FIRST FRIDAY — arts & culture focus
 * - 🏛️ CREATION DAY — Oakland history & heritage angle
 * - 🏆 CHAMPIONSHIP SEASON — sports fever citywide
 * - ⚾ PLAYOFF SEASON — heightened sports attention
 * 
 * CROWD MAP (Section 12):
 * Now includes 12 Oakland neighborhoods, sorted by density
 * 
 * ============================================================================
 */