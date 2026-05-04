/**
 * ============================================================================
 * V3.7 EVENT ARC ENGINE — GODWORLD CALENDAR INTEGRATION
 * ============================================================================
 *
 * Manages multi-cycle story arcs with GodWorld Calendar awareness.
 *
 * v3.7 Changes:
 * - Added staleness pruning: arcs stuck at 'early' for 8+ cycles auto-resolve
 * - Arcs with near-zero tension (<=0.1) for 4+ cycles also auto-resolve
 * - Prevents permanent clogging of the 10-arc cap by stale arcs
 *
 * v3.6 Changes:
 * - Replaced all Math.random() with deterministic ctx.rng
 * - pickNeighborhoodForDomain_ and generateSafeUuid_ now accept rng parameter
 * - All arc generation uses rng() for reproducible neighborhood/tension assignment
 *
 * v3.5 Changes:
 * - Safe UUID generation via generateSafeUuid_() (fixes trigger context errors)
 * - Removes dependency on Utilities.getUuid() which fails in some contexts
 *
 * v3.4 Changes:
 * - Unified currentCycle lookup via getCurrentCycle_
 * - Fixed neighborhood interference (ignores citywide/blank arcs)
 * - Championship intensifies existing sports-fever instead of blocking
 * - Added behavior for strain/education-wave/nightlife-surge arc types
 * - Festival/celebration/sports-fever exempt from passive decay
 * - ES5 compatible
 *
 * v3.3 Enhancements:
 * - Expanded to 12 Oakland neighborhoods
 * - Festival/celebration arc types
 * - Sports-fever arcs (playoff/championship energy signals)
 * - First Friday cultural arcs
 * - Creation Day community arcs
 * - Holiday tension modifiers
 * - Calendar-driven arc generation
 *
 * NOTE: Arcs are SIGNALS, not automated storylines.
 * They provide context for Media Room coverage decisions.
 * The Maker retains full creative control.
 *
 * NO sheet writes — pure functional logic
 *
 * ============================================================================
 */

// ═══════════════════════════════════════════════════════════════════════════
// ARC NEIGHBORHOOD DOMAINS — Domain Affinities (v3.3: expanded to 12)
// NOTE: Renamed from OAKLAND_NEIGHBORHOODS to avoid global collision with v3NeighborhoodWriter.js
// ═══════════════════════════════════════════════════════════════════════════
var ARC_NEIGHBORHOOD_DOMAINS = {
  'Temescal': ['HEALTH', 'EDUCATION', 'COMMUNITY'],
  'Downtown': ['CIVIC', 'INFRASTRUCTURE', 'BUSINESS', 'FESTIVAL'],
  'Fruitvale': ['COMMUNITY', 'CULTURE', 'SAFETY', 'FESTIVAL'],
  'Lake Merritt': ['CULTURE', 'COMMUNITY', 'GENERAL', 'FESTIVAL'],
  'West Oakland': ['INFRASTRUCTURE', 'SAFETY', 'BUSINESS', 'COMMUNITY'],
  'Laurel': ['COMMUNITY', 'CULTURE', 'GENERAL'],
  'Rockridge': ['BUSINESS', 'EDUCATION', 'COMMUNITY'],
  'Jack London': ['BUSINESS', 'NIGHTLIFE', 'CULTURE', 'SPORTS'],
  'Uptown': ['CULTURE', 'NIGHTLIFE', 'ARTS', 'FESTIVAL'],
  'KONO': ['ARTS', 'CULTURE', 'NIGHTLIFE', 'COMMUNITY'],
  'Chinatown': ['CULTURE', 'COMMUNITY', 'BUSINESS', 'FESTIVAL'],
  'Piedmont Ave': ['BUSINESS', 'COMMUNITY', 'EDUCATION']
};


/**
 * Unified cycle lookup (v3.4)
 */
function getCurrentCycle_(ctx) {
  var S = ctx.summary || {};
  var configCycle = (ctx.config && ctx.config.cycleCount) || 0;
  return Number(S.absoluteCycle || S.cycleId || S.cycleCount || configCycle || 0);
}


/**
 * Pick neighborhood based on domain affinity
 * @param {string} domain
 * @param {Function} [rng] - Deterministic RNG function (falls back to Math.random)
 */
function pickNeighborhoodForDomain_(domain, rng) {
  if (typeof rng !== 'function') throw new Error('eventArcEngine.pickNeighborhoodForDomain_: rng parameter required (Phase 40.3 Path 1)');
  var _rng = rng;
  var matches = [];
  var nhKeys = Object.keys(ARC_NEIGHBORHOOD_DOMAINS);
  for (var i = 0; i < nhKeys.length; i++) {
    var nh = nhKeys[i];
    var affinities = ARC_NEIGHBORHOOD_DOMAINS[nh];
    if (affinities.indexOf(domain) >= 0) {
      matches.push(nh);
    }
  }
  if (matches.length > 0) {
    return matches[Math.floor(_rng() * matches.length)];
  }
  return nhKeys[Math.floor(_rng() * nhKeys.length)];
}


/**
 * Updates tension and phase for existing arcs in ctx.summary.eventArcs.
 */
function eventArcEngine_(ctx) {
  var arcs = ctx.summary.eventArcs || [];
  if (arcs.length === 0) return;

  var S = ctx.summary || {};
  var currentCycle = getCurrentCycle_(ctx);

  // ═══════════════════════════════════════════════════════════════════════════
  // CALENDAR CONTEXT (v3.3)
  // ═══════════════════════════════════════════════════════════════════════════
  var holiday = S.holiday || 'none';
  var holidayPriority = S.holidayPriority || 'none';
  var isFirstFriday = S.isFirstFriday || false;
  var isCreationDay = S.isCreationDay || false;
  var sportsSeason = S.sportsSeason || 'off-season';

  // Pre-calculate neighborhood arc counts for interference
  // v3.4: Ignore citywide/blank neighborhoods
  var neighborhoodCounts = {};
  for (var pi = 0; pi < arcs.length; pi++) {
    var preArc = arcs[pi];
    if (!preArc || preArc.phase === 'resolved') continue;
    var nh = (preArc.neighborhood || '').toString().trim();
    if (!nh) continue; // ignore citywide arcs for neighborhood interference
    neighborhoodCounts[nh] = (neighborhoodCounts[nh] || 0) + 1;
  }

  for (var ai = 0; ai < arcs.length; ai++) {
    var arc = arcs[ai];
    if (!arc || arc.phase === 'resolved') continue;

    var t = Number(arc.tension) || 0;
    var arcAge = currentCycle - (arc.cycleCreated || currentCycle);

    // ═══════════════════════════════════════════════════════════
    // BASE SIGNAL MODIFIERS
    // ═══════════════════════════════════════════════════════════

    if (S.cycleWeight === 'high-signal') t += 1;
    if (S.shockFlag && S.shockFlag !== 'none') t += 2;
    if (S.cycleWeight === 'medium-signal') t += 0.5;

    // ═══════════════════════════════════════════════════════════
    // ARC-TYPE SPECIFIC BEHAVIOR
    // ═══════════════════════════════════════════════════════════

    // Crisis arcs: escalate faster with shocks, decay faster without
    if (arc.type === 'crisis') {
      if (S.shockFlag && S.shockFlag !== 'none') {
        t += 1;
      } else if (S.cycleWeight !== 'high-signal') {
        t -= 0.5;
      }
    }

    // Pattern-wave arcs: slow-burn, always creeping
    if (arc.type === 'pattern-wave') {
      t += 0.25;
    }

    // Instability arcs: volatile, respond to migration
    if (arc.type === 'instability') {
      var drift = S.migrationDrift || 0;
      if (drift < -30) t += 1;
      else if (drift < -15) t += 0.5;
      else if (drift > 20) t += 0.5;
    }

    // Health arcs: respond to illness rate
    if (arc.type === 'health-crisis') {
      var pop = S.worldPopulation || {};
      if (pop.illnessRate > 0.08) t += 1;
      else if (pop.illnessRate > 0.06) t += 0.5;
      else t -= 0.3;
    }

    // Infrastructure arcs: respond to weather severity
    if (arc.type === 'infrastructure') {
      var weather = S.weather || {};
      if (weather.impact >= 1.4) t += 1;
      else if (weather.impact >= 1.2) t += 0.5;
    }

    // Community arcs: respond to sentiment
    if (arc.type === 'community') {
      var dyn = S.cityDynamics || {};
      if (dyn.sentiment >= 0.3) t += 0.5;
      else if (dyn.sentiment <= -0.3) t -= 0.3;
    }

    // Cultural arcs: tied to cultural activity
    if (arc.type === 'cultural-moment') {
      var domains = S.domainPresence || {};
      if ((domains['CULTURE'] || 0) >= 2) t += 0.5;
      if (isFirstFriday) t += 1;
    }

    // Safety arcs: respond to safety domain
    if (arc.type === 'safety-concern') {
      var safeDomains = S.domainPresence || {};
      if ((safeDomains['SAFETY'] || 0) >= 2) t += 0.5;
      else t -= 0.2;
    }

    // Business arcs: respond to retail/economy
    if (arc.type === 'business-disruption') {
      var bizDyn = S.cityDynamics || {};
      if (bizDyn.retail >= 1.2) t += 0.3;
      var bizPop = S.worldPopulation || {};
      if (bizPop.economy === 'weak') t += 0.5;
    }

    // Rivalry arcs: escalate with civic tension
    if (arc.type === 'rivalry') {
      if (S.civicLoad === 'load-strain') t += 1;
      else if (S.civicLoad === 'minor-variance') t += 0.3;
    }

    // v3.4: Strain arcs: creep up under civic load, decay otherwise
    if (arc.type === 'strain') {
      if (S.civicLoad === 'load-strain') t += 0.8;
      else if (S.civicLoad === 'minor-variance') t += 0.2;
      else t -= 0.4;
    }

    // v3.4: Education-wave arcs: respond to education domain
    if (arc.type === 'education-wave') {
      var eduDomains = S.domainPresence || {};
      if ((eduDomains['EDUCATION'] || 0) >= 2) t += 0.5;
      else t -= 0.2;
    }

    // v3.4: Nightlife-surge arcs: respond to cityDynamics.nightlife
    if (arc.type === 'nightlife-surge') {
      var nlDyn = S.cityDynamics || {};
      if (nlDyn.nightlife >= 1.4) t += 0.6;
      else if (nlDyn.nightlife >= 1.2) t += 0.2;
      else t -= 0.3;
    }

    // ═══════════════════════════════════════════════════════════
    // v3.3: CALENDAR-SPECIFIC ARC BEHAVIOR
    // ═══════════════════════════════════════════════════════════

    // Festival arcs: respond to holiday activity
    if (arc.type === 'festival') {
      if (holiday !== 'none' && holidayPriority === 'oakland') t += 1;
      else if (holiday !== 'none') t += 0.5;
      else t -= 0.5;
    }

    // Celebration arcs: respond to major holidays
    if (arc.type === 'celebration') {
      if (holidayPriority === 'major') t += 1;
      else if (holiday !== 'none') t += 0.3;
      else t -= 0.4;
    }

    // Sports-fever arcs: respond to sports season
    if (arc.type === 'sports-fever') {
      if (sportsSeason === 'championship') t += 1.5;
      else if (sportsSeason === 'playoffs') t += 1;
      else if (sportsSeason === 'late-season') t += 0.5;
      else t -= 0.5;
    }

    // Parade arcs: short-lived, intense
    if (arc.type === 'parade') {
      if (holiday !== 'none') t += 0.5;
      else t -= 1;
    }

    // Arts-walk arcs: respond to First Friday
    if (arc.type === 'arts-walk') {
      if (isFirstFriday) t += 2;
      else t -= 0.5;
    }

    // Heritage arcs: respond to Creation Day
    if (arc.type === 'heritage') {
      if (isCreationDay) t += 2;
      else t -= 0.3;
    }

    // ═══════════════════════════════════════════════════════════
    // v3.3: CALENDAR TENSION MODIFIERS (all arcs)
    // ═══════════════════════════════════════════════════════════

    // Major party holidays boost all active arcs slightly
    if (holiday === 'NewYearsEve' || holiday === 'OaklandPride' || holiday === 'ArtSoulFestival') {
      t += 0.3;
    }

    // Quiet family holidays dampen non-family arcs
    if (holiday === 'Thanksgiving' || holiday === 'Easter') {
      if (arc.type !== 'community' && arc.type !== 'celebration') {
        t -= 0.3;
      }
    }

    // ═══════════════════════════════════════════════════════════
    // CROSS-ARC NEIGHBORHOOD INTERFERENCE
    // v3.4: Only apply to real neighborhoods
    // ═══════════════════════════════════════════════════════════

    var nhKey = (arc.neighborhood || '').toString().trim();
    if (nhKey) {
      var nhCount = neighborhoodCounts[nhKey] || 0;
      if (nhCount > 1) {
        t += 0.5 * (nhCount - 1);
      }
    }

    // ═══════════════════════════════════════════════════════════
    // PASSIVE DECAY
    // v3.4: Exempt festival/celebration/sports-fever from double-decay
    // ═══════════════════════════════════════════════════════════

    var noPassiveDecay = (arc.type === 'festival' || arc.type === 'celebration' || arc.type === 'sports-fever');
    if (!noPassiveDecay) {
      if (S.cycleWeight !== 'high-signal' && !(S.shockFlag && S.shockFlag !== 'none')) {
        t -= 0.3;
      }
    }

    // ═══════════════════════════════════════════════════════════
    // AGE-BASED FATIGUE
    // ═══════════════════════════════════════════════════════════

    if (arcAge > 10) {
      t -= 0.2 * Math.floor((arcAge - 10) / 5);
    }

    // ═══════════════════════════════════════════════════════════
    // CLAMP 0–10
    // ═══════════════════════════════════════════════════════════
    if (t < 0) t = 0;
    if (t > 10) t = 10;

    arc.tension = Math.round(t * 100) / 100;

    // ═══════════════════════════════════════════════════════════
    // PHASE PROGRESSION
    // ═══════════════════════════════════════════════════════════

    var prevPhase = arc.phase;

    if (arc.phase === 'early' && t >= 3) {
      arc.phase = 'rising';
    } else if (arc.phase === 'rising' && t >= 5) {
      arc.phase = 'peak';
    } else if (arc.phase === 'peak' && t <= 4) {
      arc.phase = 'decline';
    } else if (arc.phase === 'decline' && t <= 1.5) {
      arc.phase = 'resolved';
      arc.cycleResolved = currentCycle;
    }

    // ═══════════════════════════════════════════════════════════
    // STALENESS PRUNING (v3.7)
    // Arcs stuck at 'early' for 8+ cycles or with near-zero tension
    // are resolved to prevent permanent clogging of the arc cap.
    // ═══════════════════════════════════════════════════════════

    if (arc.phase === 'early' && arcAge >= 8) {
      arc.phase = 'resolved';
      arc.cycleResolved = currentCycle;
    } else if (arc.phase !== 'resolved' && t <= 0.1 && arcAge >= 4) {
      arc.phase = 'resolved';
      arc.cycleResolved = currentCycle;
    }

    if (arc.phase !== prevPhase) {
      Logger.log('eventArcEngine v3.7: Arc ' + arc.arcId + ' phase ' + prevPhase + ' -> ' + arc.phase + ' (tension: ' + t + ', age: ' + arcAge + ', cycle: ' + currentCycle + ')');
    }
  }

  // v3.7: Log summary of all arc states after processing
  var phaseCount = {};
  for (var si = 0; si < arcs.length; si++) {
    var sa = arcs[si];
    if (!sa) continue;
    phaseCount[sa.phase] = (phaseCount[sa.phase] || 0) + 1;
  }
  var phaseSummary = [];
  for (var pk in phaseCount) {
    phaseSummary.push(pk + ':' + phaseCount[pk]);
  }
  Logger.log('eventArcEngine v3.7: Processed ' + arcs.length + ' arcs | cycle: ' + currentCycle + ' | phases: ' + phaseSummary.join(', '));
}


/**
 * v3.5: Safe UUID generation that works in all contexts
 * Falls back to manual generation if Utilities.getUuid() fails
 * @param {Function} [rng] - Deterministic RNG function (falls back to Math.random)
 */
function generateSafeUuid_(rng) {
  if (typeof rng !== 'function') throw new Error('eventArcEngine.generateSafeUuid_: rng parameter required (Phase 40.3 Path 1)');
  var _rng = rng;
  try {
    if (typeof Utilities !== 'undefined' && typeof Utilities.getUuid === 'function') {
      return Utilities.getUuid();
    }
  } catch (e) {
    // Utilities.getUuid() failed, use fallback
  }

  // Fallback: manual UUID generation (RFC 4122 v4 format)
  var chars = '0123456789abcdef';
  var uuid = '';
  for (var i = 0; i < 32; i++) {
    uuid += chars[Math.floor(_rng() * 16)];
    if (i === 7 || i === 11 || i === 15 || i === 19) {
      uuid += '-';
    }
  }
  return uuid;
}


// S185 dead-code scan removals: generateNewArcs_, attachCitizenToArc_, getArcEventBoost_
// — internal helpers from a path no longer invoked. eventArcEngine_ runs without them.



/**
 * Helper: Check if citizen is in any active arc.
 */
// citizenInActiveArc_ def deleted S199 (Phase B.5 collision dedup) —
// canonical impl lives in phase05-citizens/runRelationshipEngine.js,
// resolved via Apps Script flat namespace.



/**
 * ============================================================================
 * EVENT ARC ENGINE REFERENCE v3.6
 * ============================================================================
 *
 * v3.6: All Math.random() replaced with deterministic ctx.rng
 *
 * v3.5: Safe UUID generation (generateSafeUuid_) - handles trigger contexts
 *
 * NEIGHBORHOODS (12):
 * - Temescal: HEALTH, EDUCATION, COMMUNITY
 * - Downtown: CIVIC, INFRASTRUCTURE, BUSINESS, FESTIVAL
 * - Fruitvale: COMMUNITY, CULTURE, SAFETY, FESTIVAL
 * - Lake Merritt: CULTURE, COMMUNITY, GENERAL, FESTIVAL
 * - West Oakland: INFRASTRUCTURE, SAFETY, BUSINESS, COMMUNITY
 * - Laurel: COMMUNITY, CULTURE, GENERAL
 * - Rockridge: BUSINESS, EDUCATION, COMMUNITY
 * - Jack London: BUSINESS, NIGHTLIFE, CULTURE, SPORTS
 * - Uptown: CULTURE, NIGHTLIFE, ARTS, FESTIVAL
 * - KONO: ARTS, CULTURE, NIGHTLIFE, COMMUNITY
 * - Chinatown: CULTURE, COMMUNITY, BUSINESS, FESTIVAL
 * - Piedmont Ave: BUSINESS, COMMUNITY, EDUCATION
 *
 * ARC TYPES:
 * - crisis, pattern-wave, instability, health-crisis, infrastructure
 * - community, cultural-moment, safety-concern, business-disruption
 * - rivalry, strain, education-wave, nightlife-surge
 * - festival, celebration, sports-fever, parade, arts-walk, heritage
 *
 * v3.4 FIXES:
 * - Unified getCurrentCycle_ (absoluteCycle → cycleId → cycleCount)
 * - Neighborhood interference ignores citywide/blank arcs
 * - Championship intensifies existing sports-fever arc
 * - Added behavior for strain/education-wave/nightlife-surge
 * - Festival/celebration/sports-fever exempt from passive decay
 *
 * MAX ACTIVE ARCS: 10
 *
 * NOTE: Arcs are SIGNALS for Media Room context.
 * They do NOT automate storylines or override Maker control.
 *
 * ============================================================================
 */
