/**
 * citizenMemory.js v2 — citizen 7-dial trait engine (engine.31, S253).
 *
 * Every citizen carries the SAME 7 bipolar dials, each 0-100 centered on 50.
 * Nobody is a "type" — a person IS where their 7 dials sit. An event nudges
 * the relevant dials; a one-off fades back toward who they are; a sustained,
 * same-direction pattern HARDENS permanently into baseline (the only way a
 * person actually changes). The dials are chosen for a CITY — sociability,
 * openness, ambition, family — not a Dwarf-Fortress survival sim.
 *
 * The raw 0-100 value drives NOTHING directly. bandIndex_() buckets it
 * (weighted to a wide, quiet middle) and EVERY consumer reads the BAND:
 *   - bandMultiplier_()  -> event-generation probability  (primary, high-volume)
 *   - describe_()        -> voice descriptor word          (secondary)
 * The fine value is only an accumulator, so a sustained run of events drifts a
 * citizen across a band over time; 78 and 73 behave identically (same band).
 *
 * Pure logic, ES5-safe (runs in Node + Apps Script). No sheet I/O.
 * Pairs with citizenDialMap.js (event tag -> { dial: delta }). engine.31 Phase 1.
 * Supersedes the v1 prototype's 8 DF dials (hardworking/warm/anxious/brave/
 * forgiving/greedy/loyal/temper) — mechanic kept, dial list replaced.
 */

// the 8 city dials (low pole <-> high pole):
//   drive       aimless    <-> relentless
//   sociability reclusive  <-> magnetic        (DEPTH of connection to people)
//   warmth      cold       <-> tender
//   openness    set-in-ways<-> adventurous
//   composure   volatile   <-> unshakable
//   integrity   corrupt    <-> incorruptible   (the crime axis — erosion = crime)
//   family      unattached <-> devoted to family
//   outabout    homebody   <-> always out      (PRESENCE at the city's events — feeds the evening engine; not "more social", it's showing up)
var DIALS = ['drive', 'sociability', 'warmth', 'openness', 'composure', 'integrity', 'family', 'outabout'];

var MIDPOINT = 50;          // bipolar center; below 50 IS the negative pole
var MOOD_DECAY = 0.8;       // temporary swing fades 20%/cycle back toward baseline
var HARDEN_STREAK = 3;      // same-direction push sustained N times -> permanent baseline shift
var HARDEN_FRACTION = 0.4;  // fraction of a sustained swing that bakes in permanently

// Band layer (S253 working cut — 5 bands, tune empirically in Phase 1/6).
// BAND_CUTS slice 0-100 into band index 0..4. The middle band (40-60) is the
// wide, quiet "unremarkable / average person"; the ends are where stories live.
var BAND_CUTS = [20, 40, 60, 80];               // <20 |20-40|40-60|60-80| >=80
var BAND_MULT = [0.5, 0.75, 1.0, 1.25, 1.5];    // event-probability multiplier per band index
var BAND_SIGNED = [-2, -1, 0, 1, 2];            // signed band for readability

function clamp100_(n) { return n < 0 ? 0 : (n > 100 ? 100 : n); }
function round1_(n) { return Math.round(n * 10) / 10; }

// A citizen = permanent self (base) + current swing (mood) + reinforcement (streak), per dial.
// Reusable citizen object pool
var citizenPool = [];
var citizenPoolSize = 0;
var MAX_POOL_SIZE = 1000;

function newCitizen_(base) {
  var c;
  if (citizenPoolSize > 0) {
    c = citizenPool[--citizenPoolSize];
    // Reset existing object
    for (var d in c.base) {
      c.base[d] = (base && base[d] != null) ? clamp100_(base[d]) : MIDPOINT;
      c.mood[d] = 0;
      c.streak[d] = 0;
    }
  } else {
    c = { base: {}, mood: {}, streak: {} };
    for (var i = 0; i < DIALS.length; i++) {
      var d = DIALS[i];
      c.base[d] = (base && base[d] != null) ? clamp100_(base[d]) : MIDPOINT;
      c.mood[d] = 0;
      c.streak[d] = 0;
    }
  }
  return c;
}

var poolStats = { hits: 0, misses: 0, releases: 0 };

function releaseCitizen_(citizen) {
  if (citizenPoolSize < MAX_POOL_SIZE) {
    citizen._pooled = true;
    citizenPool[citizenPoolSize++] = citizen;
    poolStats.releases++;
  }
}

function getPoolStats() {
  return {
    hits: poolStats.hits,
    misses: poolStats.misses,
    releases: poolStats.releases,
    size: citizenPoolSize,
    utilization: (poolStats.hits / (poolStats.hits + poolStats.misses) * 100).toFixed(1) + '%'
  };
}

// where a dial sits RIGHT NOW = permanent self + current swing
// Cache current calcs within citizen cycle
function current_(c, dial) {
  if (!c._currentCache) c._currentCache = {};
  if (c._currentCache.hasOwnProperty(dial)) return c._currentCache[dial];
  
  c._currentCache[dial] = clamp100_(c.base[dial] + c.mood[dial]);
  return c._currentCache[dial]; 
}

// Clear cache when mood changes

// event = { label, effects: { dial: deltaInt, ... } } — effects come from citizenDialMap.
function applyEvent_(c, event) {
  c._currentCache = {}; // Clear cached current values
  
  // Track chaos impact with severity levels
  if (event.tags) {
    const chaosTag = event.tags.find(t => t.startsWith('source:chaos'));
    if (chaosTag) {
      if (!c.chaosExposure) {
        c.chaosExposure = {
          firstSeen: (ctx && ctx.cycle) || 0,
          lastSeen: (ctx && ctx.cycle) || 0,
          count: 1,
          severity: chaosTag.includes('major') ? 2 : 1,
          types: new Set([chaosTag.split(':')[1] || 'general'])
        };
      } else {
        c.chaosExposure.lastSeen = (ctx && ctx.cycle) || c.chaosExposure.lastSeen;
        c.chaosExposure.count++;
        c.chaosExposure.severity = Math.max(c.chaosExposure.severity, 
          chaosTag.includes('major') ? 2 : 1);
        if (chaosTag.includes(':')) {
          c.chaosExposure.types.add(chaosTag.split(':')[1]);
        }
      }
      
      // Apply temporary composure penalty based on chaos severity
      const severityMult = chaosTag.includes('major') ? 1.5 : 1;
      if (!event.effects) event.effects = {};
      event.effects.composure = (event.effects.composure || 0) - (2 * severityMult);
    }
  }
  
  // Track story-worthy state changes
  if (event.effects) {
    for (var d in event.effects) {
      if (Math.abs(event.effects[d]) >= 5) { // Significant dial movement
        if (!c._storySeeds) c._storySeeds = [];
        c._storySeeds.push({
          dial: d,
          delta: event.effects[d],
          label: event.label || '',
          cycle: (ctx && ctx.summary && ctx.summary.cycleId) || 0
        });
      }
    }
  }
  var fx = (event && event.effects) || {};
  for (var d in fx) {
    if (!fx.hasOwnProperty(d) || c.base[d] == null) continue;
    var delta = fx[d];
    if (!delta) continue;
    c.mood[d] += delta;
    // reinforcement: same direction again -> streak builds; a flip resets it
    if (delta > 0) c.streak[d] = c.streak[d] >= 0 ? c.streak[d] + 1 : 1;
    else c.streak[d] = c.streak[d] <= 0 ? c.streak[d] - 1 : -1;
    // a sustained pattern hardens into who they ARE (permanent), then streak resets
    if (Math.abs(c.streak[d]) >= HARDEN_STREAK) {
      c.base[d] = clamp100_(c.base[d] + c.mood[d] * HARDEN_FRACTION);
      c.mood[d] = c.mood[d] * (1 - HARDEN_FRACTION);
      c.streak[d] = 0;
    }
  }
}

// convenience: route a tagged event through the map + apply it (map injected to keep this file I/O-free)
function applyTaggedEvent_(c, tag, dialMap, severityMult) {
  var effects = dialMap && dialMap.nudgesForEvent_ ? dialMap.nudgesForEvent_(tag, severityMult) : {};
  applyEvent_(c, { label: tag, effects: effects });
}

// dual-tag reflection write-back (citizen-loop): EVENT tag -> non-composure dials, AFFECT tag ->
// composure (composure-as-affect-only) + its own deltas, composed by dialMap.nudgesForReflection_.
// Distinct from applyTaggedEvent_ (objective single tag): this is the SUBJECTIVE wake-reflection path.
// SUPERSEDED for the live drain by accreteReflectionsIntoBase_ (S269 finding: this moves MOOD,
// which zeroMood_ wipes every compress — it never persists). Retained for the offline composer
// test (Test 7) + as the mood-path reference. No live cycle caller.
function applyReflectionDualTag_(c, eventTag, affectTag, dialMap, severityMult) {
  var effects = dialMap && dialMap.nudgesForReflection_
    ? dialMap.nudgesForReflection_(eventTag, affectTag, severityMult)
    : {};
  applyEvent_(c, { label: (eventTag || '') + '|' + (affectTag || ''), effects: effects });
}

// Direct-base reflection accretion — the LIVE write-back path (citizen-loop research.14, S269).
// Why not applyReflectionDualTag_/applyEvent_: those land deltas in `mood`, and the compressor's
// serializeDialState_ persists only {base, streak} (zeroMood_ wipes mood each cycle), so a
// reflection's effect would evaporate; and `base` is reached objectively ONLY via a >=HARDEN_STREAK
// run, so a lone reflection aged out among real events never durably registers. The subjective
// wake-reflection must reach durable `base` WITHOUT that streak gate. So: compose the dual-tag
// deltas (nudgesForReflection_ — event's non-composure dials + affect's full deltas) and accrete a
// SMALL bounded fraction directly into base. A one-off nudges base a hair, later movement dilutes it
// ("fades"); a sustained same-direction run sums into permanent lock-in. base clamped 0-100.
// Pure (dialMap injected, ES5, no I/O). reflections = [{ event, affect, text }]. Returns #moved.
function accreteReflectionsIntoBase_(c, reflections, dialMap, mult, frac) {
  if (!c || !reflections || !reflections.length || !dialMap || !dialMap.nudgesForReflection_) return 0;
  var moved = 0;
  for (var i = 0; i < reflections.length; i++) {
    var rfl = reflections[i] || {};
    var fx = dialMap.nudgesForReflection_(rfl.event, rfl.affect, mult, rfl.text);
    var any = false;
    for (var d in fx) {
      if (!fx.hasOwnProperty(d) || c.base[d] == null) continue;
      var delta = fx[d] * frac;
      if (!delta) continue;
      c.base[d] = clamp100_(c.base[d] + delta);
      any = true;
    }
    if (any) moved++;
  }
  return moved;
}

// end-of-cycle: temporary swings fade back toward the permanent self
function settleCycle_(c) {
  for (var i = 0; i < DIALS.length; i++) {
    var d = DIALS[i];
    c.mood[d] = c.mood[d] * MOOD_DECAY;
    if (Math.abs(c.mood[d]) < 0.5) c.mood[d] = 0;
  }
}

// raw 0-100 -> band index 0..4 (the ONLY thing consumers read)
// Cache band index lookups since they're called very frequently
var BAND_INDEX_CACHE = [];
function initBandCache_() {
  for (var v = 0; v <= 100; v++) {
    for (var i = 0; i < BAND_CUTS.length; i++) { 
      if (v < BAND_CUTS[i]) {
        BAND_INDEX_CACHE[v] = i;
        break;
      }
    }
    if (BAND_INDEX_CACHE[v] === undefined) BAND_INDEX_CACHE[v] = BAND_CUTS.length;
  }
}
initBandCache_();

function bandIndex_(v) {
  return BAND_INDEX_CACHE[Math.round(v)] || 0;
}
// signed band -2..+2 (for readable output / engine.32 seam)
function band_(c, dial) { return BAND_SIGNED[bandIndex_(current_(c, dial))]; }
// event-probability multiplier for the events this dial governs (the back-arc consumer)
function bandMultiplier_(c, dial) { return BAND_MULT[bandIndex_(current_(c, dial))]; }

// band -> voice descriptor; neutral band = '' (an average citizen is unremarkable)
var PHRASE = {
  drive:       ['aimless', 'unmotivated', '', 'driven', 'relentless'],
  sociability: ['reclusive', 'reserved', '', 'outgoing', 'magnetic'],
  warmth:      ['cold', 'guarded', '', 'warm', 'tender'],
  openness:    ['set in their ways', 'cautious', '', 'curious', 'adventurous'],
  composure:   ['volatile', 'anxious', '', 'steady', 'unshakable'],
  integrity:   ['corrupt', 'slippery', '', 'principled', 'incorruptible'],
  family:      ['unattached', 'independent', '', 'family-minded', 'devoted to family'],
  outabout:    ['homebody', 'stays in', '', 'often out', 'always out']
};
function describe_(c) {
  var notes = [];
  for (var i = 0; i < DIALS.length; i++) {
    var d = DIALS[i], word = PHRASE[d][bandIndex_(current_(c, d))];
    if (word) notes.push(word);
  }
  return notes.join(', ');
}

// current dial values (rounded) — the readable face derives from this
function snapshot_(c) {
  var o = {};
  for (var i = 0; i < DIALS.length; i++) o[DIALS[i]] = round1_(current_(c, DIALS[i]));
  return o;
}

// storage round-trip (Phase 2 will persist this in TraitProfile/JSON) — pure objects, no I/O
function serialize_(c) { return { base: c.base, mood: c.mood, streak: c.streak }; }
function deserialize_(obj) {
  var c = newCitizen_(obj && obj.base);
  if (obj) {
    for (var i = 0; i < DIALS.length; i++) {
      var d = DIALS[i];
      if (obj.mood && obj.mood[d] != null) c.mood[d] = obj.mood[d];
      if (obj.streak && obj.streak[d] != null) c.streak[d] = obj.streak[d];
    }
  }
  return c;
}

// Chaos reaction thresholds
function checkChaosReaction_(citizen) {
  if (!citizen.chaosExposure) return null;
  
  const { count, severity, types } = citizen.chaosExposure;
  const typeArr = Array.from(types);
  
  if (count >= 3 && severity >= 2) {
    return {
      reaction: 'traumatized',
      dialEffects: { composure: -8, openness: -4 },
      tags: ['chaos:trauma', ...typeArr.map(t => `chaos-type:${t}`)]
    };
  }
  if (count >= 2) {
    return {
      reaction: 'wary',
      dialEffects: { composure: -4, openness: -2 },
      tags: ['chaos:wary', ...typeArr.map(t => `chaos-type:${t}`)]
    };
  }
  return null;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    DIALS: DIALS, MIDPOINT: MIDPOINT, BAND_CUTS: BAND_CUTS, BAND_MULT: BAND_MULT,
    HARDEN_STREAK: HARDEN_STREAK,
    newCitizen_: newCitizen_, current_: current_,
    applyEvent_: applyEvent_, applyTaggedEvent_: applyTaggedEvent_,
    applyReflectionDualTag_: applyReflectionDualTag_,
    accreteReflectionsIntoBase_: accreteReflectionsIntoBase_, settleCycle_: settleCycle_,
    bandIndex_: bandIndex_, band_: band_, bandMultiplier_: bandMultiplier_,
    describe_: describe_, snapshot_: snapshot_,
    serialize_: serialize_, deserialize_: deserialize_,
    checkChaosReaction_: checkChaosReaction_
  };
}
