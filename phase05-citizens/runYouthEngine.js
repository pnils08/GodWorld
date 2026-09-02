/**
 * runYouthEngine.js
 *
 * Phase 5 engine: Generates youth-specific events and activities.
 * Gives agency to children who exist as household members.
 *
 * Covers:
 * - School activities and academics
 * - Youth sports and extracurriculars
 * - Coming-of-age milestones
 * - Civic participation (age-appropriate)
 *
 * v1.3 Fixes:
 * - FIX: getNamedYouth_ now computes age from BirthYear when Age column absent
 * - FIX: getGenericYouth_ uses row-based GC-{N} IDs when PopID/ID column absent
 * - FIX: getGenericYouth_ builds name from First+Last (Generic_Citizens has no Name col)
 *
 * v1.2 Fixes:
 * - FIX: No longer creates fake IDs (GEN-N, NAM-N) for citizens without PopID
 * - FIX: getNamedYouth_ now checks POPID column name variant
 * - FIX: Skips rows without valid citizen IDs instead of generating fake ones
 * - FIX: Better name handling (First+Last fallback)
 *
 * v1.1 Enhancements:
 * - crimeMetrics v1.2 integration: QoL-aware probability modifiers
 * - Low-QoL neighborhoods generate more stress/resilience events
 * - Hotspot awareness for youth safety events
 *
 * @version 1.3
 * @tier 6.3
 */

// ============================================================================
// CONSTANTS
// ============================================================================

var YOUTH_ENGINE_VERSION = '1.3';

// Event generation limits
var YOUTH_EVENT_LIMITS = {
  MAX_EVENTS_PER_CYCLE: 25,
  MAX_EVENTS_PER_NEIGHBORHOOD: 5,
  MIN_AGE: 5,
  MAX_AGE: 22
};

// Event probability by school level
var YOUTH_EVENT_PROBS = {
  elementary: 0.15,   // 15% of elementary students get events
  middle: 0.2,        // 20% of middle schoolers
  high: 0.25,         // 25% of high schoolers
  college: 0.15       // 15% of college students
};

// Academic calendar by month — relocated from utilities/youthActivities.js when
// S357 (27776f0a) retired that file; its caller-graph grepped the FILENAME but
// this file referenced the bare identifier, so Phase5-Youth threw
// "ACADEMIC_CALENDAR is not defined" from load (bench C103 catch, S360).
// Consumed by generateSchoolWideEvents_ + adjustProbByCalendar_ below; the
// school-wide events feed the S326 V2-5 youth ripple emitter.
var ACADEMIC_CALENDAR = {
  1: { period: 'winter_break_return', events: ['new semester begins', 'winter sports season'] },
  2: { period: 'mid_winter', events: ['black history month', 'winter formal dances'] },
  3: { period: 'spring_prep', events: ['spring break approaching', 'standardized testing'] },
  4: { period: 'spring', events: ['spring sports', 'prom season begins'] },
  5: { period: 'end_of_year', events: ['AP exams', 'spring concerts', 'senior activities'] },
  6: { period: 'graduation', events: ['graduation ceremonies', 'summer programs begin'] },
  7: { period: 'summer', events: ['summer camp', 'summer jobs', 'college prep'] },
  8: { period: 'late_summer', events: ['back to school prep', 'fall sports tryouts'] },
  9: { period: 'fall_start', events: ['first day of school', 'fall sports season'] },
  10: { period: 'fall', events: ['homecoming', 'fall plays', 'college applications'] },
  11: { period: 'fall_end', events: ['thanksgiving break', 'early college decisions'] },
  12: { period: 'winter', events: ['winter break', 'winter concerts', 'holiday programs'] }
};

// School roster for school-wide events — the real-world OAKLAND_SCHOOLS table
// left with utilities/youthActivities.js at S357 (27776f0a) and this file kept
// calling it, so Phase5-Youth threw "OAKLAND_SCHOOLS is not defined" on every
// graduation (month 6) and homecoming (month 10) cycle (bench C127–C130, S398).
// Rebuilt in canon voice: INSTITUTIONS §Education names ONE district (Oakland
// City Schools, BIZ-00016) and NO canon campus — "write 'an Oakland City Schools
// high school in [neighborhood]'". Real school names never return. Only .high
// is consumed (generateSchoolWideEvents_); hoods are ND hoods with a schools /
// family character in INSTITUTIONS §Neighborhoods. `id` is the stable youthId slug.
var OAKLAND_SCHOOLS = {
  high: [
    { id: 'SCHOOL-OCS-WEST-OAKLAND', name: 'an Oakland City Schools high school in West Oakland', neighborhood: 'West Oakland' },
    { id: 'SCHOOL-OCS-TEMESCAL',     name: 'an Oakland City Schools high school in Temescal',     neighborhood: 'Temescal' },
    { id: 'SCHOOL-OCS-LAUREL',       name: 'an Oakland City Schools high school in Laurel',       neighborhood: 'Laurel' },
    { id: 'SCHOOL-OCS-FRUITVALE',    name: 'an Oakland City Schools high school in Fruitvale',    neighborhood: 'Fruitvale' },
    { id: 'SCHOOL-OCS-EAST-OAKLAND', name: 'an Oakland City Schools high school in East Oakland', neighborhood: 'East Oakland' },
    { id: 'SCHOOL-OCS-LAKE-MERRITT', name: 'an Oakland City Schools high school in Lake Merritt', neighborhood: 'Lake Merritt' }
  ]
};

// ============================================================================
// engine.144 loop 4 (S411) — YOUTH TEXTURE: the minors' whole texture
// Loop 3 made this engine the sole texture writer for anyone under 18. The
// helpers this file called for its vocabulary (selectYouthEventType_,
// pickYouthEvent_, generateYouthOutcome_, assignSchoolForYouth_) left with
// utilities/youthActivities.js at S357, so every youth line since has read
// "[Education] youth activity (participated)". They are rebuilt HERE, in the
// daily-life voice the adult decks use, by stage (child 5–12 / teen 13–17 /
// college 18–22) and type, with the calendar the file already keeps.
// batchRecordYouthEvents_ is left undefined ON PURPOSE — Youth_Events is dead
// by ruling; youth lines go to LifeHistory + LifeHistory_Log only.
// Two layers: the EVENT layer (15–25% by school level, capped, feeds
// S.youthEvents) is unchanged; the TEXTURE layer is a second pass over every
// minor 5–17 at the adults' participation rate, uncapped, one line each.
// Under-fives draw nothing here — the household shared moment is their week.
// ============================================================================

var YOUTH_TEXTURE_BASE = 0.65; // per minor 5–17 per cycle before calendar / hood / drive factors (adult decks: 0.72)
var YOUTH_TEXTURE_MAX = 0.95;

function youthStage_(age) { return age <= 12 ? 'child' : (age <= 17 ? 'teen' : 'college'); }

// Fixed key order — the weighted draw must be deterministic.
var YOUTH_TYPE_ORDER = ['academic', 'sports', 'arts', 'clubs', 'civic_participation', 'coming_of_age', 'community_support'];
var YOUTH_TYPE_WEIGHTS = {
  child:   { academic: 0.30, sports: 0.22, arts: 0.18, clubs: 0.14, civic_participation: 0.08, coming_of_age: 0,    community_support: 0.08 },
  teen:    { academic: 0.26, sports: 0.18, arts: 0.14, clubs: 0.10, civic_participation: 0.14, coming_of_age: 0.08, community_support: 0.10 },
  college: { academic: 0.34, sports: 0.14, arts: 0.16, clubs: 0.14, civic_participation: 0.14, coming_of_age: 0.08, community_support: 0 }
};

// Calendar pull on the type mix (ACADEMIC_CALENDAR periods).
function youthTypeCalendarMult_(type, period, age) {
  if (period === 'graduation' || period === 'end_of_year') {
    if (type === 'coming_of_age') return age >= 16 ? 3.0 : 0.5;
    if (type === 'academic') return 1.3;
  }
  if (period === 'summer' || period === 'late_summer') {
    if (type === 'academic') return 0.4;
    if (type === 'sports' || type === 'arts' || type === 'clubs') return 1.4;
  }
  if (period === 'fall_start' || period === 'fall') {
    if (type === 'sports') return 1.3;
    if (type === 'academic') return 1.2;
  }
  if (period === 'winter' || period === 'mid_winter') {
    if (type === 'arts') return 1.3;
  }
  return 1;
}

function selectYouthEventType_(age, month, rng) {
  var stage = youthStage_(age);
  var w = YOUTH_TYPE_WEIGHTS[stage] || YOUTH_TYPE_WEIGHTS.teen;
  var period = (ACADEMIC_CALENDAR && ACADEMIC_CALENDAR[month]) ? ACADEMIC_CALENDAR[month].period : '';
  var total = 0, i, t, adj = [];
  for (i = 0; i < YOUTH_TYPE_ORDER.length; i++) {
    t = YOUTH_TYPE_ORDER[i];
    var v = (w[t] || 0) * youthTypeCalendarMult_(t, period, age);
    adj.push(v); total += v;
  }
  var roll = rng() * total, acc = 0;
  for (i = 0; i < YOUTH_TYPE_ORDER.length; i++) {
    acc += adj[i];
    if (roll < acc) return YOUTH_TYPE_ORDER[i];
  }
  return 'academic';
}

// The vocabulary. Daily-life voice, prosperity Oakland, no real school /
// team / org names (canon: "an Oakland City Schools …"; sports stay generic).
var YOUTH_TEXTURE_POOLS = {
  child: {
    academic: [
      'turned the walk home from school into an expedition',
      'read ahead in the chapter book and had to sit on the ending all week',
      'got the long-division thing, finally, and explained it to the cat',
      'brought home a spelling list and taped it to the fridge like a treaty',
      'asked the teacher a question nobody in the room could answer and liked that',
      'built a volcano for the science fair that erupted twice — once on purpose'
    ],
    sports: [
      'ran the bases at the park until the streetlights came on',
      'learned to ride without training wheels on the flat stretch by the lake',
      'lost the pickup game on the blacktop and argued the last call all the way home',
      'got picked first for once and pretended not to notice',
      'wore the new cleats to school even though there was no practice',
      'practiced free throws against the garage until the neighbor came out to rebound'
    ],
    arts: [
      'drew the whole block from memory and got most of the doors right',
      'sang the school-concert song in the shower until the house knew it too',
      'painted a mural on butcher paper across the kitchen floor',
      'made up a dance to the song from the corner store speaker and taught it at recess',
      'took the library\'s craft hour seriously enough to bring their own scissors',
      'found the hidden chords on a borrowed ukulele and would not put it down'
    ],
    clubs: [
      'built something out of nothing on the living-room floor and defended it fiercely',
      'started a club at recess with two members and a constitution',
      'traded the good sticker for the rare one and called it a fair deal',
      'joined the chess table at lunch and lost to the same kid four times, gladly',
      'organized the block\'s kids into a parade nobody had scheduled',
      'kept a secret code with a best friend that lasted three whole days'
    ],
    civic_participation: [
      'helped hand out flyers for the block party and took the job very seriously',
      'sat through a community meeting with the adults and drew the speakers',
      'picked up litter along the creek trail with the class and counted every piece',
      'made a sign for the neighborhood garden and spelled everything right',
      'asked the librarian how the library decides what to buy and got a real answer'
    ],
    community_support: [
      'got walked to school by a neighbor when the morning went sideways',
      'ate dinner at the family upstairs and came home with a second dessert',
      'found the after-school room open late and a grown-up who remembered their name',
      'got a hand with homework from the retired teacher three doors down'
    ],
    resilience: [
      'had a rough week and still showed up to the spelling bee',
      'kept the good-luck rock in a pocket through the whole hard stretch',
      'learned that a bad day ends, mostly by waiting it out on the stoop'
    ],
    safety_awareness: [
      'practiced the walk to school with the safe corners marked in chalk',
      'learned which porch lights on the block stay on and who answers them'
    ]
  },
  teen: {
    academic: [
      'rewrote the essay at midnight and knew the second draft was the real one',
      'stayed after class to argue a grade and left with a better question instead',
      'studied for the chemistry test on the bus and again at the kitchen table',
      'got the letter about the honors section and read it twice in the hallway',
      'crammed for finals with the whole group at the library until closing',
      'started the college list and crossed off half of it by dinner'
    ],
    sports: [
      'made the cut at tryouts and walked home without touching the ground',
      'ran the hill workout twice because the coach said once',
      'sat the bench for the first half and played the second like it mattered',
      'iced a rolled ankle and watched film of a game they were not in',
      'took the late bus home from an away game, still in uniform, still buzzing',
      'played pickup at the park with people twice their age and held their own'
    ],
    arts: [
      'got a solo in the spring concert and told exactly one person',
      'stayed late in the art room until the janitor turned the lights off',
      'wrote a song about the block and would not play it for anyone yet',
      'shot a short film on a phone with three friends and one very patient dog',
      'sold the first print at a street market and framed the five-dollar bill',
      'joined the drama club for the wrong reasons and stayed for the right ones'
    ],
    clubs: [
      'rewrote a text three times before sending it',
      'stayed out until the exact minute of curfew, not one minute past',
      'ran the robotics meeting because the senior was out and nobody else would',
      'learned to drive in the empty lot on Sunday with a parent gripping the door',
      'took the first shift at the corner store and came home with sore feet and cash',
      'spent the whole weekend on a group project that was mostly group'
    ],
    civic_participation: [
      'spoke for two minutes at the council meeting and did not stop shaking until the bus',
      'registered classmates for the youth advisory board with a clipboard and a grin',
      'volunteered at the food drive and learned every regular\'s name',
      'wrote a letter to the Tribune about the bus route and got a reply',
      'helped run the block cleanup and argued for better trash cans'
    ],
    coming_of_age: [
      'picked up the first paycheck and stood in the bank line like an adult',
      'sat for the senior portrait and did not recognize the adult in it',
      'stayed up past everyone talking about what comes after this',
      'got the acceptance email at lunch and let the table read it first',
      'drove alone for the first time and took the long way home on purpose'
    ],
    community_support: [
      'got a ride to practice from a neighbor when the week fell apart',
      'found the youth center open late and someone who asked how it was really going',
      'had a mentor show up to the game when nobody else could',
      'ate at a friend\'s table for a week and nobody made it a thing'
    ],
    resilience: [
      'kept going to class through the worst week of the year',
      'lost the season and showed up to the banquet anyway',
      'sat with the bad news on the roof and came down with a plan'
    ],
    safety_awareness: [
      'walked the long, lit way home without being asked',
      'texted the group when they got in, the way they had all agreed to'
    ]
  },
  college: {
    academic: [
      'pulled an all-nighter for the midterm and swore it was the last one',
      'switched majors on a Tuesday and told the family on Sunday',
      'got the lab slot and started showing up before the professor',
      'read the syllabus twice and the assigned reading once'
    ],
    sports: [
      'played intramurals on a team named after a bad joke',
      'ran the lake loop at dawn before the eight o\'clock lecture'
    ],
    arts: [
      'put a first show up in a campus hallway and stood near it all afternoon',
      'played an open mic to eleven people and one of them clapped early'
    ],
    clubs: [
      'joined three clubs at the fair and kept one',
      'worked the campus job and studied on the clock when it was slow'
    ],
    civic_participation: [
      'canvassed the neighborhood for the student housing measure',
      'sat on the first committee and learned what a quorum was the hard way'
    ],
    coming_of_age: [
      'signed the first lease with a co-signer and a deep breath',
      'came home for the weekend and noticed the house felt smaller'
    ]
  }
};

function pickYouthEvent_(type, rng, ageOrStage) {
  var stage = typeof ageOrStage === 'number' ? youthStage_(ageOrStage) : (ageOrStage || 'teen');
  var pools = YOUTH_TEXTURE_POOLS[stage] || YOUTH_TEXTURE_POOLS.teen;
  var pool = pools[type] || YOUTH_TEXTURE_POOLS.teen[type] || pools.academic;
  return pool[Math.floor(rng() * pool.length)];
}

// Kept for the event object / S.youthEvents shape; never printed on a line.
function generateYouthOutcome_(eventType, rng) {
  var r = rng();
  if (r < 0.15) return 'recognized';
  if (r < 0.30) return 'completed';
  return 'participated';
}

// Cosmetic: the high-school list is the only roster canon allows.
function assignSchoolForYouth_(age, neighborhood, rng) {
  if (age < 14 || age > 17 || !OAKLAND_SCHOOLS || !OAKLAND_SCHOOLS.high || !OAKLAND_SCHOOLS.high.length) return null;
  var hs = OAKLAND_SCHOOLS.high, i;
  for (i = 0; i < hs.length; i++) if (hs[i].neighborhood === neighborhood) return hs[i];
  var h = 0, nb = String(neighborhood || '');
  for (i = 0; i < nb.length; i++) h = (h + nb.charCodeAt(i)) % 997;
  return hs[h % hs.length];
}

// ============================================================================
// MAIN ENGINE FUNCTION
// ============================================================================

/**
 * Run the youth events engine.
 * Called during Phase 5 (citizens).
 *
 * @param {Object} ctx - Engine context
 * @return {Array} Generated events
 */
function runYouthEngine_(ctx) {
  var ss = ctx.ss;
  var S = ctx.summary || {};
  var cycle = S.absoluteCycle || 0;
  var rng = safeRand_(ctx);

  // Ensure schema exists
  if (typeof ensureYouthEventsSchema_ === 'function') {
    ensureYouthEventsSchema_(ss);
  }

  // Get calendar context
  var month = Number(S.simMonth) || 1; // S290 sim month, not wall-clock month (engine.44)
  var season = S.season || 'spring';

  // v1.1: Get crimeMetrics context for QoL awareness
  var crimeMetrics = S.crimeMetrics || {};
  var neighborhoodCrime = crimeMetrics.neighborhoodBreakdown || {};
  var crimeHotspots = crimeMetrics.hotspots || [];

  function getNeighborhoodQoL_(nh) {
    if (neighborhoodCrime[nh] && typeof neighborhoodCrime[nh].qualityOfLifeIndex === 'number') {
      return neighborhoodCrime[nh].qualityOfLifeIndex;
    }
    return crimeMetrics.qualityOfLifeIndex || 0.5;
  }

  // Get demographics for youth populations
  var demographics = {};
  if (typeof getNeighborhoodDemographics_ === 'function') {
    demographics = getNeighborhoodDemographics_(ss);
  }

  // T6 (research.24, S313): Community_Programs hood-keyed read (active-only,
  // fail-soft — same pattern as contractSeedBackdropIndex_). A ctx.rng share
  // of youth events in a program's neighborhood names the program, so canon
  // programs (Keane academy et al.) accrete life through youth events.
  var programsByHood = {};
  try {
    var pSheet = ss && typeof ss.getSheetByName === 'function' ? ss.getSheetByName('Community_Programs') : null;
    if (pSheet && pSheet.getLastRow() > 1) {
      var pVals = pSheet.getDataRange().getValues();
      var pHead = pVals[0];
      var ipName = pHead.indexOf('Name');
      var ipHood = pHead.indexOf('Neighborhood');
      var ipStatus = pHead.indexOf('Status');
      if (ipName >= 0 && ipHood >= 0) {
        for (var pr = 1; pr < pVals.length; pr++) {
          var prName = String(pVals[pr][ipName] || '').trim();
          var prHood = String(pVals[pr][ipHood] || '').trim();
          if (!prName || !prHood) continue;
          if (ipStatus >= 0 && String(pVals[pr][ipStatus] || '').toLowerCase() !== 'active') continue;
          if (!programsByHood[prHood]) programsByHood[prHood] = [];
          programsByHood[prHood].push(prName);
        }
      }
    }
  } catch (progErr) {
    try { Logger.log('runYouthEngine_ Community_Programs read failed (fail-soft): ' + progErr); } catch (ig) {}
  }

  // Get named citizens who are youth (Phase 42 §5.6: pass ctx for ctx.ledger access)
  var namedYouth = getNamedYouth_(ctx);

  // S205 Path B: Generic_Citizens youth pool dropped — generator disabled S205;
  // GC has 0 youth anyway per ENGINE_REPAIR Row 20 (generator wrote ages 18-75
  // only). SL is single source. getGenericYouth_ retained below as archaeology.
  var allYouth = namedYouth;

  // Generate events
  var events = [];
  var eventsPerNeighborhood = {};
  var totalEvents = 0;

  // Shuffle youth for variety
  allYouth = shuffleYouth_(allYouth, rng);

  for (var i = 0; i < allYouth.length && totalEvents < YOUTH_EVENT_LIMITS.MAX_EVENTS_PER_CYCLE; i++) {
    var youth = allYouth[i];
    var neighborhood = youth.neighborhood || 'Downtown';

    // Check neighborhood limit
    eventsPerNeighborhood[neighborhood] = eventsPerNeighborhood[neighborhood] || 0;
    if (eventsPerNeighborhood[neighborhood] >= YOUTH_EVENT_LIMITS.MAX_EVENTS_PER_NEIGHBORHOOD) {
      continue;
    }

    // Determine probability based on school level
    var level = getSchoolLevel_(youth.age);
    var prob = YOUTH_EVENT_PROBS[level] || 0.15;

    // Adjust by season
    prob = adjustProbByCalendar_(prob, month, season);

    // v1.1: Adjust by neighborhood QoL
    var nhQoL = getNeighborhoodQoL_(neighborhood);
    var isHotspot = crimeHotspots.indexOf(neighborhood) >= 0;
    if (nhQoL <= 0.35) {
      prob *= 1.15; // More events in stressed neighborhoods (resilience stories)
    } else if (nhQoL >= 0.75) {
      prob *= 1.05; // Slightly more in thriving neighborhoods
    }
    if (isHotspot) {
      prob *= 1.1; // Youth in hotspots have more notable events
    }

    // engine.32 T5 — Drive dial scales youth-event frequency (0.5..1.5).
    // null bands (no DialState) -> base rates unchanged.
    var dialBands = getCitizenDialBands_(ctx, youth.id, youth.dialState || "");
    if (dialBands) prob *= dialBands.mult.drive;

    // Roll for event
    if (rng() < prob) {
      // v1.1: Pass QoL context to event generator
      var qolContext = { qol: nhQoL, isHotspot: isHotspot };
      var event = generateYouthEventForCitizen_(youth, month, rng, qolContext, programsByHood);
      if (event) {
        // v1.1: Tag event with QoL context
        event.qolContext = qolContext;
        events.push(event);
        eventsPerNeighborhood[neighborhood]++;
        totalEvents++;
      }
    }
  }

  // Generate school-wide events
  var schoolEvents = generateSchoolWideEvents_(ctx, month, rng);
  for (var s = 0; s < schoolEvents.length; s++) {
    events.push(schoolEvents[s]);
    // V2-5 (S326): a school-wide event (graduation / homecoming / season
    // kickoff) enters the story surface as hood texture (0.02). The school is
    // the entity; the seed builder's Grade-1 fill attaches the hood's own
    // citizens at seed time. Individual dial-molding events stay silent —
    // the sim's private life (Mike-approved spec).
    if (typeof recordRipple_ === 'function') {
      var sev = schoolEvents[s];
      recordRipple_(ctx, {
        causeType: 'youth-event',
        causeId: sev.school || sev.youthId || '',
        causeDetail: sev.description || '',
        effectType: sev.eventType || 'school_event',
        targetScope: 'school',
        targetIds: [sev.school || sev.youthId || ''],
        neighborhood: sev.neighborhood || '',
        magnitude: 0.02,
        duration: 1,
        sourceEngine: 'runYouthEngine'
      });
    }
  }

  // ── engine.144 loop 4 (S411): TEXTURE PASS — every minor 5–17, one line at
  // the adults' rate. Same calendar / hood / drive factors as the event layer;
  // no cap; not counted in S.youthEvents (the event layer keeps its signals).
  var textureLines = [], textureCohort = 0;
  for (var ti = 0; ti < allYouth.length; ti++) {
    var ty = allYouth[ti];
    if (ty.age < YOUTH_EVENT_LIMITS.MIN_AGE || ty.age > 17) continue;
    textureCohort++;
    var tHood = ty.neighborhood || 'Downtown';
    var tProb = adjustProbByCalendar_(YOUTH_TEXTURE_BASE, month, season);
    var tQoL = getNeighborhoodQoL_(tHood);
    var tHot = crimeHotspots.indexOf(tHood) >= 0;
    if (tQoL <= 0.35) tProb *= 1.15; else if (tQoL >= 0.75) tProb *= 1.05;
    if (tHot) tProb *= 1.1;
    var tBands = getCitizenDialBands_(ctx, ty.id, ty.dialState || "");
    if (tBands) tProb *= tBands.mult.drive;
    if (tProb > YOUTH_TEXTURE_MAX) tProb = YOUTH_TEXTURE_MAX;
    if (rng() >= tProb) continue;
    var tType = selectYouthEventType_(ty.age, month, rng);
    if (tQoL <= 0.35 && rng() < 0.2) tType = rng() < 0.5 ? 'resilience' : 'community_support';
    else if (tHot && rng() < 0.1) tType = 'safety_awareness';
    var tText = pickYouthEvent_(tType, rng, ty.age);
    var tPrograms = programsByHood[tHood];
    if (tPrograms && tPrograms.length && rng() < 0.2) {
      var tProg = tPrograms[Math.floor(rng() * tPrograms.length)];
      var tTemplates = youthStage_(ty.age) === 'child'
        ? [{ text: 'ran the whole way to ' + tProg + ' and was still early', type: 'sports' },
           { text: 'made something at ' + tProg + ' and carried it home like glass', type: 'arts' },
           { text: 'got their name on the wall at ' + tProg, type: 'community_support' }]
        : [{ text: 'trained weekends at ' + tProg + ' and felt it on Monday', type: 'sports' },
           { text: 'volunteered a shift at ' + tProg + ' and stayed past it', type: 'civic_participation' },
           { text: 'got pulled aside at ' + tProg + ' and told to keep going', type: 'community_support' }];
      var tt = tTemplates[Math.floor(rng() * tTemplates.length)];
      tType = tt.type; tText = tt.text;
    }
    textureLines.push({
      youthName: ty.name, youthId: ty.id, age: ty.age, eventType: tType,
      description: tText, neighborhood: tHood, outcome: '', status: 'texture',
      source: ty.source, program: '', layer: 'texture'
    });
  }
  if (textureLines.length > 0) recordYouthLifeHistory_(ctx, textureLines);
  S.youthTexture = { cohort: textureCohort, generated: textureLines.length, cycle: cycle };
  Logger.log('runYouthEngine_ loop 4 texture: ' + textureLines.length + ' line(s) on ' + textureCohort + ' minor(s) 5–17');

  // Record events (batchRecordYouthEvents_ is undefined by ruling — Youth_Events stays dead)
  if (events.length > 0 && typeof batchRecordYouthEvents_ === 'function') {
    batchRecordYouthEvents_(ctx, events);
  }

  // Store in summary for Phase 6
  S.youthEvents = {
    generated: events.length,
    cycle: cycle,
    byType: countYouthEventsByType_(events),
    byLevel: countYouthEventsByLevel_(events)
  };

  // Add to life history log for named youth
  var namedEvents = events.filter(function(e) {
    return e.youthId && e.youthId.indexOf('GEN-') !== 0;
  });

  if (namedEvents.length > 0) {
    recordYouthLifeHistory_(ctx, namedEvents);
  }

  return events;
}

// ============================================================================
// YOUTH RETRIEVAL FUNCTIONS
// ============================================================================

/**
 * Get generic citizens who are youth-aged.
 *
 * @param {SpreadsheetApp.Spreadsheet} ss
 * @return {Array}
 */
function getGenericYouth_(ss) {
  var sheet = ss.getSheetByName('Generic_Citizens');
  if (!sheet || sheet.getLastRow() < 2) {
    return [];
  }

  var data = sheet.getDataRange().getValues();
  var header = data[0];
  var rows = data.slice(1);

  var idx = function(name) { return header.indexOf(name); };

  var iId = idx('PopID') !== -1 ? idx('PopID') : idx('ID');
  var iFirst = idx('First');
  var iLast = idx('Last');
  var iName = idx('Name');
  var iAge = idx('Age');
  var iNeighborhood = idx('Neighborhood');
  var iStatus = idx('Status');

  // v1.3: Generic_Citizens may not have a PopID/ID column.
  // Use row-based synthetic ID (GC-{row}) when no ID column exists.
  var hasIdCol = (iId >= 0);

  var result = [];
  for (var r = 0; r < rows.length; r++) {
    var row = rows[r];
    var age = Number(row[iAge]) || 0;
    var status = String(row[iStatus] || '').toLowerCase();

    // Build citizen ID: use PopID/ID column if available, otherwise row-based
    var citizenId = hasIdCol ? String(row[iId] || '').trim() : '';
    if (!citizenId) {
      citizenId = 'GC-' + (r + 2); // row index (1-based, +1 for header)
    }

    // Build name: try Name, then First+Last
    var citizenName = '';
    if (iName >= 0 && row[iName]) {
      citizenName = String(row[iName]);
    } else if (iFirst >= 0 || iLast >= 0) {
      var first = iFirst >= 0 ? String(row[iFirst] || '') : '';
      var last = iLast >= 0 ? String(row[iLast] || '') : '';
      citizenName = (first + ' ' + last).trim();
    }

    // engine.67 step 4 (S325, caught live on bench C109): gate was deceased-only —
    // a pending citizen drew youth-civic_participation. The gone draw nothing.
    if (age >= YOUTH_EVENT_LIMITS.MIN_AGE && age <= YOUTH_EVENT_LIMITS.MAX_AGE &&
        status !== 'deceased' && status !== 'inactive' && status !== 'traded' && status !== 'pending') {
      result.push({
        id: citizenId,
        name: citizenName,
        age: age,
        neighborhood: String(row[iNeighborhood] || ''),
        source: 'generic'
      });
    }
  }

  return result;
}

/**
 * Get named citizens who are youth-aged.
 * Phase 42 §5.6: reads SL via shared ctx.ledger.
 *
 * @param {Object} ctx - Engine context with ctx.ledger initialized
 * @return {Array}
 */
function getNamedYouth_(ctx) {
  if (!ctx || !ctx.ledger || ctx.ledger.rows.length === 0) {
    return [];
  }

  var header = ctx.ledger.headers;
  var rows = ctx.ledger.rows;

  var idx = function(name) { return header.indexOf(name); };

  var iId = idx('PopID') !== -1 ? idx('PopID') : idx('POPID');
  if (iId < 0) iId = idx('ID');
  var iName = idx('Name');
  var iFirst = idx('First');
  var iLast = idx('Last');
  var iAge = idx('Age');
  var iBirthYear = idx('BirthYear');
  var iNeighborhood = idx('Neighborhood');
  var iStatus = idx('Status');
  var iDialState = idx('DialState'); // engine.32 T5 — Drive dial -> youth-event frequency

  // v1.2 FIX: Require valid ID column
  if (iId < 0) {
    Logger.log('getNamedYouth_: No PopID, POPID, or ID column found in Simulation_Ledger');
    return [];
  }

  // v1.3: Compute current simulation year for age calculation from BirthYear
  // engine.144 loop 4 (S411): the calendar's year, never a hardcoded one —
  // 2041 sat here while the world reached 2042 and every youth read a year young.
  var Sy = ctx.summary || {};
  var currentYear = Number(Sy.simYear) || (2040 + Math.floor((Number(Sy.absoluteCycle) || 0) / 52)) || 2041;

  var result = [];
  for (var r = 0; r < rows.length; r++) {
    var row = rows[r];
    // v1.3: Compute age from BirthYear if Age column doesn't exist
    var age = 0;
    if (iBirthYear >= 0 && row[iBirthYear]) {
      age = currentYear - (Number(row[iBirthYear]) || currentYear); // computed live (loop 4)
    } else if (iAge >= 0 && row[iAge]) {
      age = Number(row[iAge]) || 0;
    }
    var status = String(row[iStatus] || '').toLowerCase();
    var citizenId = String(row[iId] || '').trim();

    // v1.2 FIX: Skip rows without valid citizen ID
    if (!citizenId) {
      continue;
    }

    // Get name - try Name first, then First+Last
    var citizenName = '';
    if (iName >= 0 && row[iName]) {
      citizenName = String(row[iName]);
    } else if (iFirst >= 0 || iLast >= 0) {
      var first = iFirst >= 0 ? String(row[iFirst] || '') : '';
      var last = iLast >= 0 ? String(row[iLast] || '') : '';
      citizenName = (first + ' ' + last).trim();
    }

    // engine.67 step 4 (S325, caught live on bench C109): gate was deceased-only —
    // a pending citizen drew youth-civic_participation. The gone draw nothing.
    if (age >= YOUTH_EVENT_LIMITS.MIN_AGE && age <= YOUTH_EVENT_LIMITS.MAX_AGE &&
        status !== 'deceased' && status !== 'inactive' && status !== 'traded' && status !== 'pending') {
      result.push({
        id: citizenId,
        name: citizenName,
        age: age,
        neighborhood: String(row[iNeighborhood] || ''),
        dialState: iDialState >= 0 ? String(row[iDialState] || '') : '', // engine.32 T5
        source: 'named'
      });
    }
  }

  return result;
}

// ============================================================================
// EVENT GENERATION
// ============================================================================

/**
 * Generate an event for a specific youth.
 *
 * @param {Object} youth - { id, name, age, neighborhood }
 * @param {number} month
 * @param {Function} rng
 * @param {Object} qolContext - v1.1: { qol, isHotspot }
 * @return {Object|null}
 */
function generateYouthEventForCitizen_(youth, month, rng, qolContext, programsByHood) {
  qolContext = qolContext || { qol: 0.5, isHotspot: false };
  programsByHood = programsByHood || {};

  // Get school assignment
  var school = null;
  if (typeof assignSchoolForYouth_ === 'function') {
    school = assignSchoolForYouth_(youth.age, youth.neighborhood, rng);
  }

  // Select event type
  var eventType = 'academic';
  if (typeof selectYouthEventType_ === 'function') {
    eventType = selectYouthEventType_(youth.age, month, rng);
  }

  // v1.1: QoL-influenced event type selection
  if (qolContext.qol <= 0.35 && rng() < 0.25) {
    // Low-QoL neighborhoods: resilience/challenge events
    var stressTypes = ['resilience', 'community_support', 'safety_awareness'];
    eventType = stressTypes[Math.floor(rng() * stressTypes.length)];
  } else if (qolContext.isHotspot && rng() < 0.15) {
    eventType = 'safety_awareness';
  }

  // Get event description
  var description = '';
  if (typeof pickYouthEvent_ === 'function') {
    description = pickYouthEvent_(eventType, rng, youth.age); // loop 4: stage-aware vocabulary
  } else {
    // v1.1: Fallback descriptions for new types
    if (eventType === 'resilience') {
      description = 'showed resilience amid neighborhood challenges';
    } else if (eventType === 'community_support') {
      description = 'received support from community mentors';
    } else if (eventType === 'safety_awareness') {
      description = 'participated in youth safety program';
    } else {
      description = 'youth activity';
    }
  }

  // T6 (research.24, S313): a ctx.rng share of youth events in a neighborhood
  // with an active Community_Program names the program — type + text set
  // together so the event stays coherent (dial tags derive from eventType).
  // Runs AFTER the QoL override so program events compose with, not under, it.
  var programName = '';
  var hoodPrograms = programsByHood[youth.neighborhood];
  if (hoodPrograms && hoodPrograms.length && rng() < 0.25) {
    programName = hoodPrograms[Math.floor(rng() * hoodPrograms.length)];
    var programTemplates = [
      { text: 'joined the ' + programName + ' season', type: 'sports' },
      { text: 'trained weekends at ' + programName, type: 'sports' },
      { text: 'volunteered at ' + programName, type: 'civic_participation' },
      { text: 'was recognized at ' + programName, type: 'achievement' }
    ];
    var pt = programTemplates[Math.floor(rng() * programTemplates.length)];
    eventType = pt.type;
    description = pt.text;
  }

  // Generate outcome
  var outcome = 'participated';
  if (typeof generateYouthOutcome_ === 'function') {
    outcome = generateYouthOutcome_(eventType, rng);
  }

  return {
    youthName: youth.name,
    youthId: youth.id,
    age: youth.age,
    eventType: eventType,
    description: description,
    school: school ? school.name : '',
    neighborhood: youth.neighborhood,
    outcome: outcome,
    status: 'occurred',
    source: youth.source,
    program: programName
  };
}

/**
 * Generate school-wide events (not tied to individuals).
 *
 * @param {Object} ctx
 * @param {number} month
 * @param {Function} rng
 * @return {Array}
 */
function generateSchoolWideEvents_(ctx, month, rng) {
  var events = [];
  var calendar = ACADEMIC_CALENDAR ? ACADEMIC_CALENDAR[month] : null;

  if (!calendar) return events;

  var period = calendar.period;
  var seasonalEvents = calendar.events || [];

  // Major school events during key periods
  if (period === 'graduation' && rng() < 0.8) {
    var highSchools = OAKLAND_SCHOOLS.high;
    for (var h = 0; h < highSchools.length; h++) {
      if (rng() < 0.5) {
        events.push({
          youthName: 'Class of ' + (ctx.summary.simYear || 'Y?'),
          youthId: highSchools[h].id,
          age: 18,
          eventType: 'coming_of_age',
          description: 'graduation ceremony at ' + highSchools[h].name,
          school: highSchools[h].name,
          neighborhood: highSchools[h].neighborhood,
          outcome: 'celebrated',
          status: 'school_event'
        });
      }
    }
  }

  // Fall sports season kickoff
  if (period === 'fall_start' && rng() < 0.6) {
    events.push({
      youthName: 'Oakland City Schools',
      youthId: 'SCHOOL-OCS',
      age: 0,
      eventType: 'sports',
      description: 'fall sports season begins across Oakland schools',
      school: 'Oakland City Schools',
      neighborhood: 'Downtown',
      outcome: 'announced',
      status: 'school_event'
    });
  }

  // Homecoming season
  if (period === 'fall' && rng() < 0.7) {
    var homecomingSchool = OAKLAND_SCHOOLS.high[Math.floor(rng() * OAKLAND_SCHOOLS.high.length)];
    events.push({
      youthName: homecomingSchool.neighborhood + ' high school community',
      youthId: homecomingSchool.id,
      age: 0,
      eventType: 'coming_of_age',
      description: 'homecoming celebration at ' + homecomingSchool.name,
      school: homecomingSchool.name,
      neighborhood: homecomingSchool.neighborhood,
      outcome: 'celebrated',
      status: 'school_event'
    });
  }

  return events;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get school level from age.
 *
 * @param {number} age
 * @return {string}
 */
function getSchoolLevel_(age) {
  if (age >= 5 && age <= 10) return 'elementary';
  if (age >= 11 && age <= 13) return 'middle';
  if (age >= 14 && age <= 17) return 'high';
  if (age >= 18 && age <= 22) return 'college';
  return 'elementary';
}

/**
 * Adjust event probability by calendar period.
 *
 * @param {number} baseProb
 * @param {number} month
 * @param {string} season
 * @return {number}
 */
function adjustProbByCalendar_(baseProb, month, season) {
  var calendar = ACADEMIC_CALENDAR ? ACADEMIC_CALENDAR[month] : null;

  if (!calendar) return baseProb;

  var period = calendar.period;

  // More events during key periods
  if (period === 'graduation' || period === 'end_of_year') {
    return baseProb * 1.5;
  }
  if (period === 'fall_start' || period === 'fall') {
    return baseProb * 1.3;
  }
  if (period === 'summer') {
    return baseProb * 0.7; // Fewer school events in summer
  }

  return baseProb;
}

/**
 * Shuffle array of youth.
 *
 * @param {Array} arr
 * @param {Function} rng
 * @return {Array}
 */
function shuffleYouth_(arr, rng) {
  var result = arr.slice();
  for (var i = result.length - 1; i > 0; i--) {
    var j = Math.floor(rng() * (i + 1));
    var temp = result[i];
    result[i] = result[j];
    result[j] = temp;
  }
  return result;
}

/**
 * Count events by type.
 *
 * @param {Array} events
 * @return {Object}
 */
function countYouthEventsByType_(events) {
  var counts = {};
  for (var i = 0; i < events.length; i++) {
    var type = events[i].eventType || 'other';
    counts[type] = (counts[type] || 0) + 1;
  }
  return counts;
}

/**
 * Count events by school level.
 *
 * @param {Array} events
 * @return {Object}
 */
function countYouthEventsByLevel_(events) {
  var counts = { elementary: 0, middle: 0, high: 0, college: 0, school_event: 0 };
  for (var i = 0; i < events.length; i++) {
    var age = events[i].age || 0;
    var status = events[i].status || '';

    if (status === 'school_event') {
      counts.school_event++;
    } else {
      var level = getSchoolLevel_(age);
      counts[level]++;
    }
  }
  return counts;
}

/**
 * Record youth events to life history log for named citizens.
 *
 * @param {Object} ctx
 * @param {Array} events
 */
// engine.69b (S325, Mike ruling): YOUTH EVENTS MOLD CHILDREN. This engine
// wrote log rows only — school years never reached col-O LifeHistory, so the
// compressor never folded them and a child's dials were untouched by their
// own growing up. Now every youth event lands on the citizen row with a
// DIAL_MAP-routable tag: school pushes drive/openness, sports pushes
// out-and-about, community pushes sociability/warmth — the kid the events
// describe becomes the adult the dials remember.
var YOUTH_DIAL_TAG = {
  academic: 'Education',
  graduation: 'Graduation',
  coming_of_age: 'Graduation',
  sports: 'Team',
  arts: 'Cultural',
  clubs: 'Community',
  community_support: 'Community',
  civic_participation: 'Civic',
  resilience: 'Stabilized',
  safety_awareness: 'Neighborhood'
};

function recordYouthLifeHistory_(ctx, events) {
  var cycle = (ctx.summary && ctx.summary.absoluteCycle) || 0;
  var timestamp = inWorldStamp_(ctx);

  // popId -> ledger row index for the col-O write (shared ctx.ledger, §5.6)
  var rowByPop = {};
  var iLifeY = -1, iLastUY = -1;
  if (ctx.ledger && ctx.ledger.rows) {
    var yh = ctx.ledger.headers;
    var iPopY = yh.indexOf('POPID');
    iLifeY = yh.indexOf('LifeHistory');
    iLastUY = yh.indexOf('LastUpdated');
    if (iPopY >= 0) for (var yr = 0; yr < ctx.ledger.rows.length; yr++) {
      var yp = ctx.ledger.rows[yr][iPopY];
      if (yp) rowByPop[String(yp).trim().toUpperCase()] = yr;
    }
  }

  for (var i = 0; i < events.length; i++) {
    var e = events[i];
    var dialTag = YOUTH_DIAL_TAG[e.eventType] || 'Education';

    // col-O: the child LIVES it — compressor folds it into dials next Phase 9
    var yIdx = rowByPop[String(e.youthId || '').trim().toUpperCase()];
    if (yIdx !== undefined && iLifeY >= 0) {
      var yRow = ctx.ledger.rows[yIdx];
      var yLine = timestamp + ' — [' + dialTag + '] ' + e.description; // loop 4: the sentence is the line — no "(participated)" suffix
      yRow[iLifeY] = (yRow[iLifeY] ? yRow[iLifeY] + '\n' : '') + yLine;
      if (iLastUY >= 0) yRow[iLastUY] = timestamp;
      ctx.ledger.rows[yIdx] = yRow;
      ctx.ledger.dirty = true;
    }

    if (typeof queueAppendIntent_ === 'function') {
      queueAppendIntent_(ctx, 'LifeHistory_Log', [
        timestamp,
        e.youthId,
        e.youthName,
        dialTag + '|youth-' + e.eventType + (e.layer === 'texture' ? '|texture' : ''),
        e.description,
        e.neighborhood,
        cycle
      ], 'youth life history', 'citizens', 100);
    }
  }
}

// ============================================================================
// STORY SIGNALS FOR PHASE 6
// ============================================================================

/**
 * Get story signals from youth events.
 *
 * @param {Object} ctx
 * @return {Array}
 */
function getYouthStorySignals_(ctx) {
  var S = ctx.summary || {};
  var youthData = S.youthEvents || {};
  var byType = youthData.byType || {};
  var byLevel = youthData.byLevel || {};

  var signals = [];

  // Graduation stories (high priority in May/June)
  if (byType.coming_of_age >= 3) {
    signals.push({
      type: 'youth_milestone',
      priority: 3,
      headline: 'Oakland youth celebrate milestones',
      desk: 'education',
      data: { count: byType.coming_of_age }
    });
  }

  // Academic achievement cluster
  if (byType.academic >= 4) {
    signals.push({
      type: 'youth_academic',
      priority: 2,
      headline: 'Students excel across Oakland schools',
      desk: 'education',
      data: { count: byType.academic }
    });
  }

  // Youth sports coverage
  if (byType.sports >= 3) {
    signals.push({
      type: 'youth_sports',
      priority: 2,
      headline: 'Youth athletics update',
      desk: 'sports',
      data: { count: byType.sports }
    });
  }

  // Civic participation (notable)
  if (byType.civic_participation >= 2) {
    signals.push({
      type: 'youth_civic',
      priority: 3,
      headline: 'Youth voices heard in Oakland civic life',
      desk: 'metro',
      data: { count: byType.civic_participation }
    });
  }

  // Arts & culture
  if (byType.arts >= 3) {
    signals.push({
      type: 'youth_arts',
      priority: 2,
      headline: 'Young artists shine',
      desk: 'culture',
      data: { count: byType.arts }
    });
  }

  return signals;
}
