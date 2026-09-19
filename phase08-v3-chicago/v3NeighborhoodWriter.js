/**
 * ============================================================================
 * saveV3NeighborhoodMap_ v3.6 - ES5 Compatible
 * ============================================================================
 *
 * v3.6 Changes:
 * - Deterministic RNG: all randomness uses ctx.rng (no Math.random)
 *
 * v3.5 Changes:
 * - ES5 compatible (removed const/let, arrow functions, .forEach, .filter, .map, .some, .includes)
 * - Maintains direct batch write pattern (replace rows 2:N each cycle)
 *
 * v3.4 Features (preserved):
 * - STRICT schema safety: only appends missing columns at END (never clears)
 * - No auto-wipe / no destructive "needsInit" behavior
 * - Robust parsing of worldEvents (uses subdomain/subtype/description)
 * - Robust demographic drift (handles object vs number)
 * - Batch write rows (faster / less quota)
 *
 * SCHEMA TARGET (15 cols, replace pattern):
 * Timestamp | Cycle | Neighborhood | NightlifeProfile | NoiseIndex | CrimeIndex |
 * RetailVitality | EventAttractiveness | Sentiment | DemographicMarker |
 * Holiday | HolidayPriority | FirstFriday | CreationDay | SportsSeason
 *
 * ============================================================================
 */

var NEIGHBORHOOD_MAP_HEADERS = [
  'Timestamp', 'Cycle', 'Neighborhood', 'NightlifeProfile', 'NoiseIndex',
  'CrimeIndex', 'RetailVitality', 'EventAttractiveness', 'Sentiment',
  'DemographicMarker', 'Holiday', 'HolidayPriority', 'FirstFriday',
  'CreationDay', 'SportsSeason',
  // S215 civic.10b — District column. Canonical neighborhood→district owner
  // per docs/canon/INSTITUTIONS.md §Neighborhoods. Blank when canon hasn't
  // authorized a mapping yet (civic.10c auditor surfaces the orphan).
  'District',
  // S423 engine.99 Finding #9 — ChildAreas: the spoken sub-areas that fold into
  // this hood (comma-separated; "Old Oakland, City Center" under Downtown).
  // Authored data, never engine-written; the Phase-1 loader seeds the
  // child→parent map from it and every fold in the engine reads that map.
  // Self-arms as a blank column here; the values are a hand/replayed write.
  'ChildAreas',
  // engine.148 P2 — authored geography (WeatherZone label, Adjacent comma list)
  // + the one attention knob (0–2). Never engine-written; self-arm as blank
  // columns, the values are a hand/replayed write; the loader throws on blanks.
  'WeatherZone', 'Adjacent', 'AttentionWeight'
];

// S315: the writer owns only the first 15 columns positionally (texture block
// A–O). Everything past SportsSeason on the live sheet belongs to other engines
// (MigrationFlow: Phase 6; trajectory block: Phase 5) and must never be hit by
// a positional write. District is written by live-header lookup instead.
var TEXTURE_COL_COUNT = 15;

var NMAP_NEIGHBORHOODS = [
  'Downtown', 'Temescal', 'Laurel', 'West Oakland', 'Fruitvale', 'Jack London',
  'Rockridge', 'Adams Point', 'Grand Lake', 'Piedmont Ave', 'Chinatown',
  'Brooklyn', 'Eastlake', 'Glenview', 'Dimond', 'Ivy Hill', 'San Antonio',
  // S215 civic.10b — KONO (Koreatown-Northgate) added per canon. Telegraph
  // Avenue corridor north of Downtown, south of Temescal. C92 "KONO Second
  // Song" dispatch is the canon precedent.
  'KONO',
  // S256 neighborhood-roster alignment — three CANON_12/canon hoods where citizens
  // already live but Neighborhood_Map had no row (live set-difference: Lake Merritt 98,
  // Uptown 89 residents) + Baylight District (INIT-006 $2.1B Coliseum redevelopment;
  // forward-looking row, low residents now, grows as the build completes). Mike-approved.
  'Lake Merritt', 'Uptown', 'Baylight District',
  // S328 (Mike-direct): East Oakland is legit Oakland land mass — represent it.
  // Half the engine already spoke it (crime profiles, OARI + Youth Apprenticeship
  // affected hoods, civic approvals, a faith org) while the map excluded it as a
  // "legacy stray." Canonized instead of fought — the training data keeps
  // producing it because it's real geography.
  'East Oakland'
];

// engine.33 pulse fold constants — citizen events accumulated at emit time
// (utilities/neighborhoodPulseMap.js recordPulse_) nudge the 4 citizen-movable
// columns. Dampen/cap sized from live column ranges measured S256 (cycle 96):
// CrimeIndex 0-1, RetailVitality 6.6-15.1, EventAttractiveness 16-79,
// Sentiment 0.55-0.66. Citizens shade the hood; they never overwrite the
// world signals.
var PULSE_FOLD = {
  sentiment:      { dampen: 0.02, cap: 0.15 },
  crime:          { dampen: 0.02, cap: 0.10 },
  vitality:       { dampen: 0.10, cap: 1.00 },
  attractiveness: { dampen: 0.25, cap: 4.00 }
};

// engine.38 S2 — pulse-fold volume normalization reference. The dampen/cap above
// were sized at C96 (~25-52 TOTAL events/cycle -> ~1-3 per hood). After full-
// population coverage (~600-750/cycle -> ~28/hood) the raw per-hood SUMS are
// ~15x larger, so dampen*sum saturated every active hood to +/-cap every cycle,
// erasing inter-neighborhood signal (a vibrant hood and a quiet one both pinned).
// Fix: normalize the sum to a per-hood reference event count, but ONLY above that
// reference — at or below it (the entire C96 regime) the math is byte-identical
// to the old fold, so low-volume behavior is unchanged. Above it, the fold
// reflects net per-event LEAN (direction/intensity), not raw volume.
// NOTE: PULSE_REF_EVENTS=8 covers the C96 per-hood range; confirm against the
// first C99 pulse ranges (the dampen/cap themselves may want a light re-tune once
// live high-volume column ranges are measured — tracked as engine.38 S2 follow-up).
var PULSE_REF_EVENTS = 8;

// G-EC33 fix (sentiment lockstep) — weight of the citywide sentiment scalar when
// it is DEMOTED from per-hood base to a shared nudge. Pre-fix, every hood's
// sentiment was `dynamics.sentiment` (one citywide finalCity scalar, carrying the
// edition-coverage boost) + a frozen profile offset, so a +0.16 citywide swing
// moved all 21 hoods +0.16 in lockstep. The fix bases each hood on its own
// `S.neighborhoodDynamics[hood].sentiment` (input-driven: cluster + adjacency
// bleed + per-hood crime/economy/demographics/weather, persisting 30%/cycle via
// momentum) so hoods move independently. The citywide scalar is retained ONLY as
// a light shared shade at this weight — preserving the S216 coverage→neighborhood
// chain (file header L7-15) without letting it dominate the movement. At 0.15 a
// +0.16 citywide swing contributes ~+0.024 shared, well under the per-hood deltas.
var CITY_SENTIMENT_NUDGE = 0.15;

// ── Hood character from canon (engine-sheet 2026-09-19) ─────────────────────
// Replaces the hand-set per-hood profile table ({ 'West Oakland': { retailMod:
// 0.7, crimeMod: 1.3, sentimentMod: -0.05 }, ... }) read every cycle below.
// Its numbers were 2020s real-world Oakland under canon strings, and the table
// WAS the RetailVitality ranking: C107 West Oakland 3.53 (22 of 22) and
// Baylight 3.66 (21 of 22) at the bottom of the city while canon has West
// Oakland the boom's birthplace (IncomeTier 5, Civis campus, 14 tracked
// employers / 775 jobs) — and Temescal, the one hood the boom left behind,
// 2nd (10.35). The daily news read that contradiction every morning.
//
// Now the profile is a reading of the hood's own canon columns on
// Neighborhood_Map (INSTITUTIONS.md §Neighborhoods, loaded as
// S.neighborhoodState, engine.135 B1): the EmployerCharacter label says what
// kind of place it is; spending power (median income vs the city's median)
// and BoomIndex (how far the boom reached it) scale its retail; its tracked
// employer depth (S.hoodEmployerDepth — the bounded presence signal
// buildHoodEmploymentWeights_ uses) nudges retail as its businesses hire or
// close. Keyed by canon LABEL, never by hood name: a hood's numbers change
// when its canon does. A label with no row throws (hoodTexturePool_ rule,
// engine.148 P3) — a new label needs a row.
//
// crimeMod and sentimentMod are gone. CrimeIndex is Crime_Metrics' own (every
// hood has a row; one without reads the city average), and a hood's mood is
// its own S.neighborhoodDynamics track — a fixed per-hood mood offset was a
// verdict, not a cause.
var HOOD_CHARACTER_MODS = {
  // label            what the street sells, after dark, density, draws a crowd
  'institutional':  { retail: 1.15, nightlife: 0.90, noise: 1.30, event: 1.00 }, // towers, courts; thinner after dark than Uptown / Jack London
  'campus':         { retail: 1.00, nightlife: 0.90, noise: 1.10, event: 0.80 }, // the first campuses — a working landscape that got rich
  'nightlife':      { retail: 1.25, nightlife: 1.30, noise: 1.20, event: 1.30 },
  'arts':           { retail: 1.10, nightlife: 1.15, noise: 1.00, event: 1.20 },
  'retail':         { retail: 1.30, nightlife: 1.00, noise: 0.90, event: 1.10 }, // theater, weekend market, family retail
  'family-retail':  { retail: 1.20, nightlife: 1.00, noise: 1.20, event: 1.10 }, // dense, family businesses older than any campus
  'transit-retail': { retail: 1.20, nightlife: 1.00, noise: 1.10, event: 1.00 }, // the strip over the hub, turning over fast
  'village-retail': { retail: 1.10, nightlife: 0.75, noise: 0.65, event: 0.70 },
  'schools-retail': { retail: 1.00, nightlife: 0.80, noise: 0.75, event: 0.80 },
  'professional':   { retail: 1.05, nightlife: 0.90, noise: 0.60, event: 0.85 },
  'medical':        { retail: 1.05, nightlife: 0.70, noise: 0.60, event: 0.60 }, // clinics, specialists, small storefronts
  'clinic':         { retail: 0.90, nightlife: 0.90, noise: 0.90, event: 0.90 }, // a clinic waiting list where the boom should have been
  'service-labor':  { retail: 0.90, nightlife: 0.95, noise: 1.05, event: 0.80 }, // the dense core the boom's workers live in
  'construction':   { retail: 0.85, nightlife: 0.80, noise: 1.10, event: 0.70 }, // the frontier being built
  'mixed':          { retail: 0.95, nightlife: 0.85, noise: 0.80, event: 0.75 },
  'residential':    { retail: 0.80, nightlife: 0.60, noise: 0.55, event: 0.55 },
  'stadium':        { retail: 1.20, nightlife: 1.20, noise: 1.25, event: 1.35 }  // once a franchise plays there (S.sportsZones)
};
// engine.131 T7, carried: the stadium district before a franchise opens in it
// is a build site — quiet street, construction noise.
var HOOD_STADIUM_BUILD_SITE = { retail: 0.50, nightlife: 0.50, noise: 1.30, event: 0.60 };
var HOOD_RETAIL_SPEND_BAND = [0.85, 1.15];  // sqrt(hood median income ÷ city median income)
var HOOD_RETAIL_BOOM_WEIGHT = 0.10;         // × BoomIndex (−1..+1)
var HOOD_RETAIL_DEPTH_BAND = [0.93, 1.07];  // 1 + 0.1 × log2(hood tracked employees ÷ city median)
var HOOD_RETAIL_MOD_BAND = [0.50, 1.60];    // after centring on the city's own mean (1.0)

function hoodClamp_(v, band) { return Math.max(band[0], Math.min(band[1], v)); }

function hoodMedian_(vals) {
  if (!vals.length) return null;
  var s = vals.slice().sort(function(a, b) { return a - b; });
  var mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

// A hood's retail reading before centring: label × spending power × boom ×
// employer depth. `city` supplies the medians it is read against.
function hoodRetailRaw_(name, S, city, label) {
  var st = S.neighborhoodState[name];
  var mods = hoodLabelMods_(name, S, label);
  var spend = 1;
  if (city.income && Number(st.medianIncome) > 0) {
    spend = hoodClamp_(Math.sqrt(Number(st.medianIncome) / city.income), HOOD_RETAIL_SPEND_BAND);
  }
  var boom = (st.boomIndex !== null && st.boomIndex !== undefined && isFinite(Number(st.boomIndex)))
    ? 1 + HOOD_RETAIL_BOOM_WEIGHT * Number(st.boomIndex) : 1;
  var depthF = 1;
  var d = (S.hoodEmployerDepth || {})[name];
  if (city.employees && d && Number(d.employees) > 0) {
    depthF = hoodClamp_(1 + 0.1 * (Math.log(Number(d.employees) / city.employees) / Math.LN2), HOOD_RETAIL_DEPTH_BAND);
  }
  return mods.retail * spend * boom * depthF;
}

function hoodLabelOf_(name, S) {
  var st = (S.neighborhoodState || {})[name];
  var label = st ? st.employerCharacter : '';
  if (!label) {
    throw new Error('saveV3NeighborhoodMap_: Neighborhood_Map.EmployerCharacter is blank for ' + name +
      ' (or Phase-2 loadNeighborhoodState_ did not run) — author the cell (engine.148 P3).');
  }
  if (!HOOD_CHARACTER_MODS[label]) {
    throw new Error('saveV3NeighborhoodMap_: no HOOD_CHARACTER_MODS row for EmployerCharacter "' + label +
      '" (' + name + ') — a new label needs a row.');
  }
  return label;
}

function hoodLabelMods_(name, S, label) {
  if (label === 'stadium' && (S.sportsZones || []).indexOf(name) < 0) return HOOD_STADIUM_BUILD_SITE;
  return HOOD_CHARACTER_MODS[label];
}

// The city the hoods are read against: median income and tracked employer
// depth, then the mean raw retail reading — retailMod is centred on it, so the
// profile moves a hood's standing inside the city, never the city's level
// (that stays S.cityDynamics.retail).
function hoodCharacterCity_(S, hoods) {
  var ns = S.neighborhoodState || {};
  var depth = S.hoodEmployerDepth || {};
  var incomes = [], employees = [];
  for (var i = 0; i < hoods.length; i++) {
    var st = ns[hoods[i]];
    if (st && Number(st.medianIncome) > 0) incomes.push(Number(st.medianIncome));
    var d = depth[hoods[i]];
    if (d && Number(d.employees) > 0) employees.push(Number(d.employees));
  }
  var city = { income: hoodMedian_(incomes), employees: hoodMedian_(employees), retailMean: 1 };
  var sum = 0;
  for (var j = 0; j < hoods.length; j++) sum += hoodRetailRaw_(hoods[j], S, city, hoodLabelOf_(hoods[j], S));
  if (hoods.length && sum > 0) city.retailMean = sum / hoods.length;
  return city;
}

// 2026-09-19 (builder ruling: a business loop not felt in its hood is trick code):
// this cycle's business momentum on the hood's street (S.hoodBusinessMomentum,
// applyBusinessDynamics_ Phase 5). Growth is read against the city's median hood
// growth (1% of retail per pp, bounded), and a closure takes its share of the
// hood's tracked revenue off the street the cycle it closes. Change, not size —
// so it moves the big-employer hoods the depth factor saturates on.
var HOOD_BIZ_GROWTH_GAIN = 0.01;          // retail share per pp of growth vs the city median
var HOOD_BIZ_GROWTH_BAND = [0.88, 1.12];
var HOOD_BIZ_CLOSURE_CAP = 0.5;           // a closure never removes more than half the street

function hoodBusinessCity_(S) {
  var mom = S.hoodBusinessMomentum || {};
  var g = [];
  for (var h in mom) if (mom.hasOwnProperty(h) && mom[h] && isFinite(Number(mom[h].growth))) g.push(Number(mom[h].growth));
  return hoodMedian_(g);
}

function hoodBusinessFactor_(name, S, cityGrowth) {
  var m = (S.hoodBusinessMomentum || {})[name];
  if (!m) return 1;
  var f = 1;
  if (cityGrowth !== null && isFinite(Number(m.growth))) {
    f = hoodClamp_(1 + HOOD_BIZ_GROWTH_GAIN * (Number(m.growth) - cityGrowth), HOOD_BIZ_GROWTH_BAND);
  }
  var closed = Math.min(HOOD_BIZ_CLOSURE_CAP, Math.max(0, Number(m.closedShare) || 0));
  return f * (1 - closed);
}

function hoodProfileFromCanon_(name, S, city) {
  var label = hoodLabelOf_(name, S);
  var mods = hoodLabelMods_(name, S, label);
  return {
    retailMod: hoodClamp_(hoodRetailRaw_(name, S, city, label) / city.retailMean, HOOD_RETAIL_MOD_BAND),
    nightlifeMod: mods.nightlife,
    noiseMod: mods.noise,
    eventMod: mods.event
  };
}

// engine.33 — dampened, capped pulse delta for one metric (0 when no pulse).
// engine.38 S2 — volume-normalized (see PULSE_REF_EVENTS).
function pulseFoldDelta_(pulse, key) {
  if (!pulse) return 0;
  var events = Number(pulse.events || 0);
  var denom = events > PULSE_REF_EVENTS ? events : PULSE_REF_EVENTS;
  var raw = (Number(pulse[key] || 0) / denom) * PULSE_REF_EVENTS * PULSE_FOLD[key].dampen;
  var cap = PULSE_FOLD[key].cap;
  if (raw > cap) return cap;
  if (raw < -cap) return -cap;
  return raw;
}

// civic.18 Task 4a — NEIGHBORHOOD_DISTRICT_MAP REMOVED. This writer no longer
// owns the District column.
//
// It held 8 of the 22 live hoods and recomputed the column every cycle as
// `MAP[name] || ''`, then wrote the whole column — so the other 14 were
// blank-overwritten on every single run. That is why the live column read 8
// populated / 14 blank: it was never a ledger, it was a printout of this literal.
// A column a writer regenerates from code cannot be a truth source (ADR-0016),
// and the S215 "canon expands, then the map grows" intent never survived contact
// with a map that only one file could see.
//
// District is now ledger truth, hand-authored in Neighborhood_Map like
// CoreSimRank. Seeded by scripts/seedNeighborhoodDistrict.js; read by consumers.
// 'District' STAYS in NEIGHBORHOOD_MAP_HEADERS so the append-only schema ensure
// keeps the column alive — the column persists, only the value-write is gone.
//
// DO NOT reintroduce a district literal here. If a hood's district is wrong, the
// cell is wrong; fix the cell.


function saveV3NeighborhoodMap_(ctx) {
  var rng = safeRand_(ctx);

  // DRY-RUN FIX: Skip direct sheet writes in dry-run mode
  var isDryRun = ctx.mode && ctx.mode.dryRun;
  if (isDryRun) {
    Logger.log('saveV3NeighborhoodMap_: Skipping (dry-run mode)');
    return;
  }

  var ss = ctx.ss;

  var sheet = ensureNeighborhoodMapSchemaAppendOnly_(ss, 'Neighborhood_Map', NEIGHBORHOOD_MAP_HEADERS);

  var S = ctx.summary || {};
  ctx.summary = S;
  var cycle = (ctx.config && typeof ctx.config.cycleCount !== 'undefined')
    ? ctx.config.cycleCount
    : (S.cycleId || 0);
  var now = inWorldStamp_(ctx); // S290 in-world, not wall-clock (engine.44)

  // Calendar context
  var holiday = S.holiday || 'none';
  var holidayPriority = S.holidayPriority || 'none';
  var isFirstFriday = !!S.isFirstFriday;
  var isCreationDay = !!S.isCreationDay;
  var sportsSeason = S.sportsSeason || 'off-season';

  // Pull simulation signals
  var dynamics = S.cityDynamics || {};
  var weather = S.weather || {};
  var worldEvents = S.worldEvents || [];
  var storySeeds = S.storySeeds || [];
  var storyHooks = S.storyHooks || [];
  var eventArcs = S.eventArcs || S.v3Arcs || [];

  // Base values
  var baseNightlife = Number(dynamics.nightlife || 0.7);

  // Noise derived from traffic + weather impact
  var baseNoise = ((Number(dynamics.traffic || 1) * 5) +
    ((Number(weather.impact || 1) - 1) * 3));

  // Robust event text extraction
  function eventText(ev) {
    var parts = [];
    if (ev.subdomain) parts.push(ev.subdomain);
    if (ev.subtype) parts.push(ev.subtype);
    if (ev.description) parts.push(ev.description);
    if (ev.summary) parts.push(ev.summary);
    if (ev.title) parts.push(ev.title);
    return parts.join(' ').toString().toLowerCase();
  }

  // engine.72 G-EC56: SAFETY-event crime counting RETIRED — CrimeIndex now
  // derives from Crime_Metrics per-hood physics (see the crime derivation in
  // the row loop). Crime_Metrics already ingests chaos/safety events as
  // factors, so event pressure reaches CrimeIndex through the real engine.

  // Event attractiveness: culture/community/holiday/festival + story seeds/hooks
  var baseEventAttract = 0;
  for (var we2 = 0; we2 < worldEvents.length; we2++) {
    var ev2 = worldEvents[we2];
    var domain2 = (ev2.domain || '').toString().toLowerCase();
    var text2 = eventText(ev2);

    if (domain2 === 'culture' || domain2 === 'community' || domain2 === 'holiday' || domain2 === 'festival') {
      baseEventAttract++;
    }
    if (text2.indexOf('festival') >= 0 || text2.indexOf('concert') >= 0 || text2.indexOf('art') >= 0 ||
        text2.indexOf('celebration') >= 0 || text2.indexOf('parade') >= 0 || text2.indexOf('market') >= 0) {
      baseEventAttract++;
    }
  }

  for (var si = 0; si < storySeeds.length; si++) {
    var s = storySeeds[si];
    var seedText = (s.seed || s.text || '').toString().toLowerCase();
    if (seedText.indexOf('community') >= 0 || seedText.indexOf('culture') >= 0 ||
        seedText.indexOf('festival') >= 0 || seedText.indexOf('art') >= 0) {
      baseEventAttract++;
    }
  }

  for (var hi = 0; hi < storyHooks.length; hi++) {
    var h = storyHooks[hi];
    var hookText = (h.hook || h.text || '').toString().toLowerCase();
    if (hookText.indexOf('community') >= 0 || hookText.indexOf('culture') >= 0 ||
        hookText.indexOf('festival') >= 0 || hookText.indexOf('art') >= 0) {
      baseEventAttract++;
    }
  }

  // Retail vitality from dynamics
  var baseRetail = Math.round((Number(dynamics.retail || 1) * 5) + (Number(dynamics.publicSpaces || 1) * 3));

  // Base sentiment
  var baseSentiment = Number(dynamics.sentiment || 0);

  // ── engine.184 (2026-09-10): DemographicMarker is a PER-HOOD column and is now
  // scored per hood. It used to be one city number banded once, here, and handed
  // to all 22 rows — so every hood carried the same label by construction and the
  // only variation in the column came from the override table in
  // getDemographicMarkerV35_ (holiday, First Friday, arc, shock).
  //
  // The band it used (±5/20/35) was written for S.migrationDrift, which
  // applyMigrationDrift.js:44 documents as −50..+50. It was being fed
  // S.demographicDrift.migration instead — the city's net migration COUNT
  // (1306 at C110, clamped ±5000) — which clears +20 every cycle, so the column
  // read 'Inflow surge' everywhere. Before the Phase-8 clobber fix it read a
  // string, coerced to 0, and the column read 'Stable' everywhere. Same flat
  // column, two different constants.
  //
  // The per-hood number is S.neighborhoodMigration[hood].drift — Phase 6,
  // scale −5..+5, built from that hood's own crime/sentiment/retail/event/mood
  // against the city median. Bands below are the original proportions carried
  // onto that scale (±0.1/0.4/0.7 of full range). The city-wide path is kept as
  // the fallback for a cycle where Phase 6 did not run.
  var hoodMig = (S.neighborhoodMigration && typeof S.neighborhoodMigration === 'object')
    ? S.neighborhoodMigration : null;

  var cityDriftNum = (typeof S.migrationDrift === 'number') ? S.migrationDrift : 0;

  // Fallback only: the city band on the ±50 scale it was written for.
  var cityDemoLabel = 'Stable';
  if (cityDriftNum < -35) cityDemoLabel = 'Outflow accelerating';
  else if (cityDriftNum < -20) cityDemoLabel = 'Outflow pressure';
  else if (cityDriftNum < -5) cityDemoLabel = 'Mild outflow';
  else if (cityDriftNum > 20) cityDemoLabel = 'Inflow surge';
  else if (cityDriftNum > 5) cityDemoLabel = 'Mild inflow';

  function hoodDemoLabel_(hoodName) {
    var rec = hoodMig ? hoodMig[hoodName] : null;
    if (!rec || typeof rec.drift !== 'number') return cityDemoLabel;
    var d = rec.drift;                       // −5..+5, this hood's own
    if (d <= -4) return 'Outflow accelerating';
    if (d <= -3) return 'Outflow pressure';
    if (d <= -1) return 'Mild outflow';
    if (d >= 3) return 'Inflow surge';
    if (d >= 1) return 'Mild inflow';
    return 'Stable';
  }

  // Arc lookup by neighborhood
  var arcByNeighborhood = {};
  for (var ai = 0; ai < eventArcs.length; ai++) {
    var arc = eventArcs[ai];
    var hood = arc.neighborhood || arc.Neighborhood || '';
    if (hood && !arcByNeighborhood[hood]) arcByNeighborhood[hood] = arc;
  }

  // Hood profiles are read from canon each cycle (hoodProfileFromCanon_, top of
  // file) — the hand-set per-hood table that stood here is retired.
  var hoodCity = hoodCharacterCity_(S, NMAP_NEIGHBORHOODS);
  var hoodBizGrowthMedian = hoodBusinessCity_(S);

  // Holiday / calendar neighborhood boosts
  var holidayMods = buildHolidayNeighborhoodMods_(holiday, isFirstFriday, isCreationDay, sportsSeason);

  // Helpers
  function round2(n) { return Math.round(n * 100) / 100; }
  function variance() { return (rng() - 0.5) * 0.2; }

  // Ensure we have enough rows (no clearing)
  var neededRows = 1 + NMAP_NEIGHBORHOODS.length;
  if (sheet.getLastRow() < neededRows) {
    sheet.insertRowsAfter(sheet.getLastRow(), neededRows - sheet.getLastRow());
  }

  // Build batch rows
  var out = [];

  for (var i = 0; i < NMAP_NEIGHBORHOODS.length; i++) {
    var name = NMAP_NEIGHBORHOODS[i];
    // engine.131 T7 (the stadium district is a build site until a franchise
    // opens in it) now lives in hoodProfileFromCanon_ as the 'stadium' label's
    // S.sportsZones check.
    var profile = hoodProfileFromCanon_(name, S, hoodCity);
    var hMod = holidayMods[name] || {};

    var effectiveEventMod = profile.eventMod * (hMod.eventMod || 1);
    var effectiveNightlifeMod = profile.nightlifeMod * (hMod.nightlifeMod || 1);
    var effectiveNoiseMod = profile.noiseMod * (hMod.noiseMod || 1);
    var effectiveSentimentMod = hMod.sentimentMod || 0;

    var nightlife = round2(baseNightlife * effectiveNightlifeMod * (1 + variance()));
    var noise = round2(Math.max(0, baseNoise * effectiveNoiseMod + (variance() * 2)));
    // engine.72 G-EC56: CrimeIndex derives from Crime_Metrics per-hood physics
    // (city-average ≈ 1.0; consumer thresholds preserved — migration ≥1.5
    // outflow / ≤0.8 inflow, conduct 0.6×/2 blend). The old base was a
    // SAFETY-event-count proxy (× crimeMod + random +1) that read ~0 for 100
    // cycles because nothing was domain-classed SAFETY, then jumped to 2-3
    // citywide when engine.70/71 emitted the first SAFETY events while real
    // crime FELL 3-4σ. A hood absent from Crime_Metrics reads the city
    // average (every hood has a row since engine.134; the old × crimeMod
    // "flavor" was the real-Oakland table, retired 2026-09-19). Pulse/chaos
    // folds below stay additive — citizens shade the hood.
    var cmByHood = (S.crimeMetrics && S.crimeMetrics.byNeighborhood) || {};
    var cmCity = (S.crimeMetrics && S.crimeMetrics.cityWide) || {};
    var cityCrimeAvg = ((Number(cmCity.avgPropertyCrime) || 50) + (Number(cmCity.avgViolentCrime) || 50)) / 2;
    var hoodCm = cmByHood[name];
    var crime = hoodCm
      ? round2(Math.max(0, ((Number(hoodCm.propertyCrimeIndex) || 50) + (Number(hoodCm.violentCrimeIndex) || 50)) / 2 / 50))
      : round2(Math.max(0, cityCrimeAvg / 50));
    var retail = round2(Math.max(0, baseRetail * profile.retailMod * hoodBusinessFactor_(name, S, hoodBizGrowthMedian) * (1 + variance())));
    var eventAttract = Math.max(0, Math.round(baseEventAttract * effectiveEventMod));
    // G-EC33 fix: per-hood base from the per-hood dynamics track (input-driven,
    // persists 30%/cycle) breaks the citywide-scalar lockstep. Frozen profile
    // offset still separates within-cluster hoods; citywide scalar demoted to a
    // small shared nudge (CITY_SENTIMENT_NUDGE) to keep the coverage chain alive.
    // Fallback to the citywide scalar for any hood with no dynamics entry.
    var nd = (S.neighborhoodDynamics && S.neighborhoodDynamics[name]) || null;
    var hoodBaseSent = (nd && isFinite(Number(nd.sentiment))) ? Number(nd.sentiment) : baseSentiment;
    var sent = round2(hoodBaseSent + effectiveSentimentMod + (baseSentiment * CITY_SENTIMENT_NUDGE) + (variance() * 0.1));

    // engine.33 pulse fold — this cycle's emitted citizen events for this hood
    var pulse = (S.neighborhoodPulse && S.neighborhoodPulse[name]) || null;
    if (pulse) {
      crime = round2(Math.max(0, crime + pulseFoldDelta_(pulse, 'crime')));                   // engine.33 pulse fold
      retail = round2(Math.max(0, retail + pulseFoldDelta_(pulse, 'vitality')));              // engine.33 pulse fold
      eventAttract = round2(Math.max(0, eventAttract + pulseFoldDelta_(pulse, 'attractiveness'))); // engine.33 pulse fold
      sent = round2(sent + pulseFoldDelta_(pulse, 'sentiment'));                              // engine.33 pulse fold
    }

    // engine.11 chaos-cars fold — multi-cycle residual resolved by resolveChaosNeighborhoodFold_
    // (PropertiesService-persisted, decayed in place). Additive on the same 4 movable cols, with
    // the writer's Math.max(0)+round2 guards (§S265). Distinct from the pulse fold: this carries
    // across cycles (negative swings linger; AC#6) where the pulse is this-cycle only.
    var cFold = (S.chaosNeighborhoodFold && S.chaosNeighborhoodFold[name]) || null;
    if (cFold) {
      crime = round2(Math.max(0, crime + (cFold.CrimeIndex || 0)));
      retail = round2(Math.max(0, retail + (cFold.RetailVitality || 0)));
      eventAttract = round2(Math.max(0, eventAttract + (cFold.EventAttractiveness || 0)));
      // engine.185 fix-up (2026-09-10): no floor on sentiment. The §S265 Math.max(0)
      // guard is right for crime/retail/event, which cannot be negative, and was
      // copied onto sentiment, which can. It pinned Brooklyn and San Antonio at
      // exactly 0.00 and meant no hood could ever feel worse than neutral. The
      // engine.165 clamp below already bounds this to [-1, 1].
      sent = round2(sent + (cFold.Sentiment || 0));
    }
    // engine.165: the saved value is bounded like the Phase-2 value it started from ([-1, 1],
    // applyCityDynamics clampSent). Profile mod + city nudge + variance + pulse + chaos are all
    // additive after that clamp, so a holiday cycle (NewYear: +0.4 on the city term, which every
    // cluster inherits) pushed four hoods past 1.0 at C105 and the momentum carry read the
    // fall-back at C106 as decay. The holiday is the world; the unbounded save was the defect.
    sent = round2(Math.max(-1, Math.min(1, sent)));

    var demoLabel = getDemographicMarkerV35_(name, hoodDemoLabel_(name), arcByNeighborhood, S, holiday, isFirstFriday, isCreationDay);

    // civic.18 Task 4a — District no longer computed here; it is ledger truth.

    out.push([
      now, cycle, name,
      nightlife, noise, crime,
      retail, eventAttract, sent,
      demoLabel,
      holiday, holidayPriority, isFirstFriday, isCreationDay, sportsSeason
    ]);
  }

  // S315 clobber fix: the live sheet carries extra columns between SportsSeason
  // (col 15) and District — a positional 16-wide write landed District codes in
  // whatever occupies live col 16 (MigrationFlow) and wiped Phase-6 output every
  // cycle. Texture block writes at fixed width 15 behind a fail-loud header
  // guard; District resolves its live column by header lookup.
  var liveHeader = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  for (var g = 0; g < TEXTURE_COL_COUNT; g++) {
    if (String(liveHeader[g]) !== NEIGHBORHOOD_MAP_HEADERS[g]) {
      throw new Error('saveV3NeighborhoodMap_: live header mismatch at col ' + (g + 1) +
        ' — expected "' + NEIGHBORHOOD_MAP_HEADERS[g] + '", found "' + liveHeader[g] + '". Refusing positional write.');
    }
  }

  // Write texture rows 2:N (cols A–O only)
  sheet.getRange(2, 1, out.length, TEXTURE_COL_COUNT).setValues(out);

  // civic.18 Task 4a — the District write is GONE. This writer owns the texture
  // block (A–O) and nothing else on this tab. District is ledger truth now; every
  // cycle this ran, it blank-overwrote the 14 hoods missing from its private map.

  Logger.log('saveV3NeighborhoodMap_ v3.6: Updated ' + out.length + ' neighborhoods | Cycle ' + cycle + ' | Holiday: ' + holiday);
}


/**
 * Append-only schema enforcement (never clears, never reorders).
 * ES5 compatible version.
 */
function ensureNeighborhoodMapSchemaAppendOnly_(ss, sheetName, headers) {
  var sheet = requireTab_(ss, sheetName); // engine.119: no runtime create (Neighborhood_Map)

  var lastCol = Math.max(sheet.getLastColumn(), 1);
  var existingRaw = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var existing = [];
  for (var e = 0; e < existingRaw.length; e++) {
    existing.push(String(existingRaw[e]));
  }

  // If header row is blank-ish, initialize safely
  var hasAny = false;
  for (var h = 0; h < existing.length; h++) {
    if ((existing[h] || '').trim() !== '') {
      hasAny = true;
      break;
    }
  }
  if (!hasAny) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    return sheet;
  }

  // Append missing headers at end only
  var missing = [];
  for (var m = 0; m < headers.length; m++) {
    if (existing.indexOf(headers[m]) === -1) {
      missing.push(headers[m]);
    }
  }
  if (missing.length > 0) {
    var startCol = existing.length + 1;
    sheet.insertColumnsAfter(existing.length, missing.length);
    sheet.getRange(1, startCol, 1, missing.length).setValues([missing]);
  }

  // If sheet has fewer columns than schema, extend
  if (sheet.getLastColumn() < headers.length) {
    sheet.insertColumnsAfter(sheet.getLastColumn(), headers.length - sheet.getLastColumn());
  }

  // Ensure the first 15 headers exist somewhere
  var finalCols = sheet.getLastColumn();
  var afterRaw = sheet.getRange(1, 1, 1, finalCols).getValues()[0];
  var after = [];
  for (var a = 0; a < afterRaw.length; a++) {
    after.push(String(afterRaw[a]));
  }
  var stillMissing = [];
  for (var sm = 0; sm < headers.length; sm++) {
    if (after.indexOf(headers[sm]) === -1) {
      stillMissing.push(headers[sm]);
    }
  }
  if (stillMissing.length > 0) {
    var startCol2 = after.length + 1;
    sheet.insertColumnsAfter(after.length, stillMissing.length);
    sheet.getRange(1, startCol2, 1, stillMissing.length).setValues([stillMissing]);
  }

  return sheet;
}


function buildHolidayNeighborhoodMods_(holiday, isFirstFriday, isCreationDay, sportsSeason) {
  var mods = {};

  if (holiday === 'LunarNewYear') {
    mods['Chinatown'] = { eventMod: 2.5, nightlifeMod: 1.5, noiseMod: 1.5, sentimentMod: 0.15 };
    mods['Downtown'] = { eventMod: 1.3, nightlifeMod: 1.2 };
  }

  if (holiday === 'CincoDeMayo' || holiday === 'DiaDeMuertos') {
    mods['Fruitvale'] = { eventMod: 2.5, nightlifeMod: 1.5, noiseMod: 1.4, sentimentMod: 0.15 };
    mods['San Antonio'] = { eventMod: 1.5, nightlifeMod: 1.2 };
  }

  if (holiday === 'Juneteenth') {
    mods['West Oakland'] = { eventMod: 2.0, nightlifeMod: 1.3, sentimentMod: 0.1 };
    mods['Downtown'] = { eventMod: 1.3 };
  }

  if (holiday === 'OaklandPride') {
    mods['Downtown'] = { eventMod: 2.5, nightlifeMod: 1.8, noiseMod: 1.5, sentimentMod: 0.2 };
    mods['Grand Lake'] = { eventMod: 2.0, nightlifeMod: 1.5, sentimentMod: 0.15 };
    mods['Adams Point'] = { eventMod: 1.5, nightlifeMod: 1.3 };
  }

  if (holiday === 'ArtSoulFestival') {
    mods['Downtown'] = { eventMod: 2.5, nightlifeMod: 1.6, noiseMod: 1.4, sentimentMod: 0.15 };
    mods['Jack London'] = { eventMod: 1.5, nightlifeMod: 1.3 };
  }

  if (holiday === 'NewYearsEve') {
    mods['Downtown'] = { eventMod: 2.0, nightlifeMod: 2.0, noiseMod: 1.8, sentimentMod: 0.1 };
    mods['Jack London'] = { eventMod: 1.8, nightlifeMod: 1.8, noiseMod: 1.5 };
    mods['Grand Lake'] = { eventMod: 1.3, nightlifeMod: 1.4 };
  }

  if (holiday === 'Halloween') {
    mods['Temescal'] = { eventMod: 1.8, nightlifeMod: 1.3, noiseMod: 1.2 };
    mods['Rockridge'] = { eventMod: 1.5, nightlifeMod: 1.2 };
    mods['Piedmont Ave'] = { eventMod: 1.3, nightlifeMod: 1.1 };
  }

  if (holiday === 'StPatricksDay') {
    mods['Jack London'] = { eventMod: 1.8, nightlifeMod: 2.0, noiseMod: 1.5 };
    mods['Downtown'] = { eventMod: 1.3, nightlifeMod: 1.5 };
  }

  if (holiday === 'OpeningDay') {
    mods['Jack London'] = { eventMod: 2.5, nightlifeMod: 1.8, noiseMod: 1.6, sentimentMod: 0.1 };
    mods['Downtown'] = { eventMod: 1.5, nightlifeMod: 1.3 };
  }

  if (isFirstFriday) {
    mods['Temescal'] = mods['Temescal'] || {};
    mods['Temescal'].eventMod = (mods['Temescal'].eventMod || 1) * 1.8;
    mods['Temescal'].nightlifeMod = (mods['Temescal'].nightlifeMod || 1) * 1.4;

    mods['Downtown'] = mods['Downtown'] || {};
    mods['Downtown'].eventMod = (mods['Downtown'].eventMod || 1) * 1.5;

    mods['Jack London'] = mods['Jack London'] || {};
    mods['Jack London'].eventMod = (mods['Jack London'].eventMod || 1) * 1.3;
  }

  if (isCreationDay) {
    mods['Downtown'] = mods['Downtown'] || {};
    mods['Downtown'].eventMod = (mods['Downtown'].eventMod || 1) * 1.5;
    mods['Downtown'].sentimentMod = (mods['Downtown'].sentimentMod || 0) + 0.1;

    mods['West Oakland'] = mods['West Oakland'] || {};
    mods['West Oakland'].eventMod = (mods['West Oakland'].eventMod || 1) * 1.3;
  }

  if (sportsSeason === 'championship') {
    mods['Jack London'] = mods['Jack London'] || {};
    mods['Jack London'].eventMod = (mods['Jack London'].eventMod || 1) * 2.0;
    mods['Jack London'].nightlifeMod = (mods['Jack London'].nightlifeMod || 1) * 1.8;
    mods['Jack London'].noiseMod = (mods['Jack London'].noiseMod || 1) * 1.5;

    mods['Downtown'] = mods['Downtown'] || {};
    mods['Downtown'].eventMod = (mods['Downtown'].eventMod || 1) * 1.5;
  } else if (sportsSeason === 'playoffs') {
    mods['Jack London'] = mods['Jack London'] || {};
    mods['Jack London'].eventMod = (mods['Jack London'].eventMod || 1) * 1.5;
    mods['Jack London'].nightlifeMod = (mods['Jack London'].nightlifeMod || 1) * 1.4;
  }

  return mods;
}


function getDemographicMarkerV35_(neighborhood, baseLabel, arcByNeighborhood, summary, holiday, isFirstFriday, isCreationDay) {

  // Calendar-first markers
  if (holiday === 'LunarNewYear' && neighborhood === 'Chinatown') return 'Lunar New Year celebration zone';
  if ((holiday === 'CincoDeMayo' || holiday === 'DiaDeMuertos') && neighborhood === 'Fruitvale') {
    return holiday === 'CincoDeMayo' ? 'Cinco de Mayo celebration zone' : 'Día de los Muertos observance zone';
  }
  if (holiday === 'OaklandPride' && (neighborhood === 'Downtown' || neighborhood === 'Grand Lake')) return 'Pride celebration zone';
  if (holiday === 'ArtSoulFestival' && neighborhood === 'Downtown') return 'Art & Soul Festival zone';
  if (holiday === 'Juneteenth' && neighborhood === 'West Oakland') return 'Juneteenth celebration zone';
  if (isFirstFriday && neighborhood === 'Temescal') return 'First Friday arts walk zone';
  if (isCreationDay && neighborhood === 'Downtown') return 'Creation Day celebration zone';

  // Arc influence
  var arc = arcByNeighborhood[neighborhood];
  if (arc && arc.phase !== 'resolved') {
    var arcType = (arc.type || arc.Type || '').toString().toLowerCase();
    if (arcType === 'health-crisis') return 'Health crisis zone';
    if (arcType === 'crisis') return 'Civic pressure zone';
    if (arcType === 'pattern-wave') return 'Pattern-wave zone';
    if (arcType === 'demographic') return 'Demographic pressure zone';
    if (arcType === 'economic-crisis') return 'Economic strain zone';
  }

  // Shock hinting
  var shockFlag = (summary.shockFlag || '').toString();
  if (neighborhood === 'Downtown' && shockFlag === 'shock-flag') return 'Shock event zone';

  return baseLabel;
}
