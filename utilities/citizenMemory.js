/**
 * ============================================================================
 * citizenMemory.js v0.1 (engine.31 Phase 1 — bounded-memory core)
 * ============================================================================
 *
 * The bounded-memory engine that replaces compressLifeHistory's erase-and-rebuild.
 *
 * Model (Dwarf Fortress, research4_1.md:196): a citizen carries a small, FIXED
 * set of memory slots — 5 categories x 2 slots = 10. Each slot keeps only the
 * STRONGEST memory in its group. Memories that keep recurring PROMOTE
 * (short -> long -> core); a core never decays and permanently shifts the 5
 * personality axes. Memory is never wiped: compression becomes a stateful
 * merge (prev MemoryState + new events -> next MemoryState).
 *
 * This file is PURE LOGIC — no sheet reads/writes, no ctx. It is unit-tested
 * offline (scripts/testCitizenMemory.js) before being wired into
 * compressLifeHistory_ (engine.31 Phase 2). ES5-safe so it drops into Apps
 * Script unchanged; a guarded module.exports tail lets Node require it.
 *
 * Spec: docs/plans/2026-05-31-compression-tag-triage.md (Phase 1 design)
 * Tag map: docs/engine/TAG_REGISTRY.md
 * ============================================================================
 */

var MEMORY_VERSION = '0.1';

// --- tunable knobs (empirically tuned in Phase 5) -------------------------
var SLOTS_PER_CATEGORY = 2;          // the bound (sacred); number tunable
var DECAY_RATE = 0.95;               // per-cycle decay of non-core salience
var THETA_LONG = 0.55;               // short -> long salience gate
var REINFORCE_LONG = 2;              // short -> long: must have recurred
var REINFORCE_CORE = 3;              // long -> core: sustained recurrence
var CORE_MIN_AGE_CYCLES = 52;        // long -> core: held >= ~1 simYear
var CORE_STOCHASTIC = 1;             // long -> core: 1-in-N per eligible run (1 = reliable once sustained+aged; reinforcement+age are the real guard, the dice are decorative)
var CORE_AXIS_GAIN = 2.5;            // a locked core is rare + permanent — its axis push must be strong enough to reshape identity
var CONDUCT_DARK_CORE_THRESHOLD = 3; // dark cores needed for Outlaw eligibility

var CATEGORIES = ['Social', 'Work', 'Family', 'Health', 'Conduct'];

// --- tag -> category routing (from TAG_REGISTRY.md) -----------------------
var CATEGORY_OF = {
  // Social
  Relationship: 'Social', Alliance: 'Social', Rivalry: 'Social',
  Mentorship: 'Social', Neighborhood: 'Social', Community: 'Social',
  Cultural: 'Social', Media: 'Social', CivicRole: 'Social',
  'Civic Role': 'Social', 'Civic Perception': 'Social', Reputation: 'Social',
  Quoted: 'Social', Lifestyle: 'Social',
  // Work
  Career: 'Work', 'Career-Transition': 'Work', 'Career-Training': 'Work',
  Promotion: 'Work', Graduation: 'Work', Education: 'Work', Arc: 'Work',
  // Family
  Household: 'Family', Wedding: 'Family', Birth: 'Family', Divorce: 'Family',
  Retirement: 'Family', PostCareer: 'Family', Arrival: 'Family',
  // Health
  Health: 'Health', Critical: 'Health', Recovering: 'Health',
  Hospitalized: 'Health', Stabilized: 'Health', Setback: 'Health',
  Recovery: 'Health', Death: 'Health',
  // Conduct
  'Transgression-Petty': 'Conduct', 'Transgression-Serious': 'Conduct',
  'Transgression-Grave': 'Conduct', Resisted: 'Conduct'
};

// Texture tags never claim a slot (mood color only).
var TEXTURE_TAGS = {
  Weather: true, Holiday: true, FirstFriday: true, CreationDay: true,
  PrevEvening: true, Sports: true, Daily: true, Background: true,
  QoL: true, Untagged: true, Compressed: true, CareerState: true
};

// Base salience per tag. Milestones + Conduct high; routine mid.
var BASE_SALIENCE = {
  Wedding: 0.95, Birth: 0.9, Divorce: 0.9, Graduation: 0.8, Promotion: 0.8,
  Retirement: 0.75, Death: 1.0,
  'Transgression-Grave': 1.0, 'Transgression-Serious': 0.85,
  'Transgression-Petty': 0.6, Resisted: 0.55,
  Critical: 0.9, Hospitalized: 0.85, Setback: 0.7, Recovering: 0.6,
  Stabilized: 0.55, Recovery: 0.6, Health: 0.55,
  Rivalry: 0.6, Alliance: 0.55, Mentorship: 0.5, Relationship: 0.55,
  'Career-Transition': 0.6, Career: 0.5, 'Career-Training': 0.45,
  Education: 0.5, Arc: 0.5, CivicRole: 0.5, Reputation: 0.5, Quoted: 0.45,
  Household: 0.5, Neighborhood: 0.4, Community: 0.45, Cultural: 0.45,
  Media: 0.4, Lifestyle: 0.4, Arrival: 0.5, PostCareer: 0.4
};
var BASE_DEFAULT = 0.4;

// Conduct poles.
var DARK_TAGS = {
  'Transgression-Petty': true, 'Transgression-Serious': true,
  'Transgression-Grave': true
};

// Milestones — singular, irreversible life events. They harden into core on
// their OWN weight (the milestone road), no recurrence required: a wedding
// happens once and still defines you. Recurring memories take the pattern road
// (reinforcement). Decay slower — a milestone stays vivid.
var MILESTONE_TAGS = {
  Wedding: true, Birth: true, Graduation: true, Divorce: true,
  Retirement: true, Death: true
};
var MILESTONE_DECAY_RATE = 0.98;

// Per-tag axis contribution applied when a memory promotes to CORE.
var TAG_AXES = {
  Wedding: { social: 0.2, grounded: 0.15 }, Birth: { grounded: 0.2, social: 0.1 },
  Divorce: { volatile: 0.2, reflective: 0.1 }, Promotion: { driven: 0.2, grounded: 0.1 },
  Graduation: { driven: 0.15, reflective: 0.1 }, Retirement: { reflective: 0.15, grounded: 0.1 },
  Career: { driven: 0.15, grounded: 0.1 }, 'Career-Transition': { volatile: 0.15, driven: 0.1 },
  Education: { reflective: 0.15, driven: 0.1 }, Relationship: { social: 0.2 },
  Alliance: { social: 0.15, driven: 0.1 }, Rivalry: { volatile: 0.2, driven: 0.1 },
  Mentorship: { social: 0.1, reflective: 0.1 }, Neighborhood: { grounded: 0.15, social: 0.1 },
  Community: { social: 0.15, grounded: 0.1 }, CivicRole: { driven: 0.1, social: 0.1 },
  Household: { grounded: 0.15, social: 0.1 }, Health: { grounded: 0.1, volatile: 0.1 },
  Critical: { volatile: 0.15, reflective: 0.1 }, Setback: { volatile: 0.1, reflective: 0.1 },
  'Transgression-Petty': { volatile: 0.15 }, 'Transgression-Serious': { volatile: 0.2, driven: 0.1 },
  'Transgression-Grave': { volatile: 0.25, driven: 0.1 }, Resisted: { grounded: 0.2 }
};

// --- archetypes (R-derived face) ------------------------------------------
var ARCHETYPES = {
  Connector: { social: 0.7, grounded: 0.4 },
  Watcher: { reflective: 0.7, grounded: 0.3 },
  Striver: { driven: 0.7, volatile: 0.3 },
  Anchor: { grounded: 0.8, social: 0.3 },
  Catalyst: { volatile: 0.6, social: 0.4 },
  Caretaker: { social: 0.5, grounded: 0.5, reflective: 0.3 },
  Drifter: { reflective: 0.4, volatile: 0.4 }
};

// ============================================================================
// STATE
// ============================================================================

function newMemoryState_() {
  var slots = {};
  for (var i = 0; i < CATEGORIES.length; i++) slots[CATEGORIES[i]] = [];
  return {
    v: MEMORY_VERSION,
    slots: slots,
    axes: { social: 0, reflective: 0, driven: 0, grounded: 0, volatile: 0 },
    conduct: { dark: 0, integrity: 0 },
    archetype: 'Drifter',
    updatedCycle: 0
  };
}

function serializeMemoryState_(state) {
  return JSON.stringify(state);
}

function parseMemoryState_(str) {
  if (!str) return newMemoryState_();
  try {
    var s = JSON.parse(str);
    if (!s || !s.slots) return newMemoryState_();
    // backfill any missing category arrays
    for (var i = 0; i < CATEGORIES.length; i++) {
      if (!s.slots[CATEGORIES[i]]) s.slots[CATEGORIES[i]] = [];
    }
    if (!s.axes) s.axes = { social: 0, reflective: 0, driven: 0, grounded: 0, volatile: 0 };
    if (!s.conduct) s.conduct = { dark: 0, integrity: 0 };
    return s;
  } catch (e) {
    return newMemoryState_();
  }
}

// ============================================================================
// ROUTING + SALIENCE
// ============================================================================

// event = { tag, gist, intensity }  (intensity optional, default 1)
function routeCategory_(tag) {
  if (TEXTURE_TAGS[tag]) return null;
  return CATEGORY_OF[tag] || null;
}

function baseSalience_(tag) {
  return (BASE_SALIENCE.hasOwnProperty(tag)) ? BASE_SALIENCE[tag] : BASE_DEFAULT;
}

// citizen = { CareerStage, CareerMobility, NumChildren, MaritalStatus, Age, Status, socialAxis }
function relevance_(category, citizen, tag, state) {
  citizen = citizen || {};
  var r = 1.0;
  if (category === 'Work') {
    var mob = num_(citizen.CareerMobility);
    if (mob > 0) r += Math.min(0.4, mob * 0.1);
    if (/(Rising|Ascending|Striver)/i.test(String(citizen.CareerStage || ''))) r += 0.2;
  } else if (category === 'Family') {
    var kids = num_(citizen.NumChildren);
    if (kids > 0) r += Math.min(0.4, kids * 0.15);
    if (/Married/i.test(String(citizen.MaritalStatus || ''))) r += 0.1;
  } else if (category === 'Health') {
    var age = num_(citizen.Age);
    if (age >= 60) r += 0.3; else if (age >= 45) r += 0.15;
    if (/Recovering|Critical/i.test(String(citizen.Status || ''))) r += 0.2;
  } else if (category === 'Conduct') {
    // dark momentum: transgressions resonate with the already-dark;
    // resistance resonates with the already-upright.
    if (DARK_TAGS[tag]) r += Math.min(0.5, num_(state && state.conduct && state.conduct.dark) * 0.15);
    else r += Math.min(0.4, num_(state && state.conduct && state.conduct.integrity) * 0.12);
  } else if (category === 'Social') {
    var sa = num_(citizen.socialAxis) || (state && state.axes ? num_(state.axes.social) : 0);
    if (sa > 0.5) r += 0.2;
  }
  return r;
}

function num_(v) {
  var n = parseFloat(v);
  return isNaN(n) ? 0 : n;
}

// ============================================================================
// THE STATEFUL MERGE (one cycle)
// ============================================================================

// rng() -> [0,1). Pass ctx.rng in production; a seeded rng in tests.
function mergeCycle_(state, events, citizen, cycle, rng) {
  state = state || newMemoryState_();
  rng = rng || function () { return 0.5; };
  events = events || [];

  // 1. decay non-core slots, age everything
  for (var ci = 0; ci < CATEGORIES.length; ci++) {
    var arr = state.slots[CATEGORIES[ci]];
    for (var s = 0; s < arr.length; s++) {
      if (arr[s].tier === 'core') continue;
      var rate = MILESTONE_TAGS[arr[s].tag] ? MILESTONE_DECAY_RATE : DECAY_RATE;
      arr[s].salience = round3_(arr[s].salience * rate);
    }
  }

  // 2. fold in new events
  for (var e = 0; e < events.length; e++) {
    var ev = events[e];
    var tag = String(ev.tag || 'Untagged');
    var cat = routeCategory_(tag);
    if (!cat) continue; // texture: tints axes elsewhere, never a slot

    var sal = round3_(baseSalience_(tag)
      * relevance_(cat, citizen, tag, state)
      * (ev.intensity || 1));

    // conduct signal accretes immediately (drives momentum + dark-core gate)
    if (cat === 'Conduct') {
      if (DARK_TAGS[tag]) state.conduct.dark = round3_(state.conduct.dark + sal * 0.5);
      else state.conduct.integrity = round3_(state.conduct.integrity + sal * 0.5);
    }

    insertMemory_(state.slots[cat], {
      tag: tag, gist: ev.gist || tag, salience: sal,
      bornCycle: cycle, lastSeenCycle: cycle, reinforced: 0, tier: 'short'
    });
  }

  // 3. promotion ladder
  runPromotion_(state, cycle, rng);

  // 4. derive face
  state.archetype = deriveArchetype_(state);
  state.updatedCycle = cycle;
  return state;
}

function insertMemory_(arr, mem) {
  // reinforce if same tag already present
  for (var i = 0; i < arr.length; i++) {
    if (arr[i].tag === mem.tag) {
      arr[i].salience = round3_(Math.max(arr[i].salience, mem.salience) + 0.1);
      arr[i].reinforced += 1;
      arr[i].lastSeenCycle = mem.lastSeenCycle;
      return;
    }
  }
  if (arr.length < SLOTS_PER_CATEGORY) { arr.push(mem); return; }
  // full: displace weakest non-core if the newcomer beats it. "Strength" is
  // salience reinforced by recurrence — a recurring pattern (reliving) resists
  // being knocked out by a one-off spike whose raw salience is momentarily
  // higher. This is what lets a sustained memory survive to consolidate.
  var weakIdx = -1, weakStrength = Infinity;
  for (var j = 0; j < arr.length; j++) {
    if (arr[j].tier === 'core') continue;
    var st = effectiveStrength_(arr[j]);
    if (st < weakStrength) { weakStrength = st; weakIdx = j; }
  }
  if (weakIdx >= 0 && effectiveStrength_(mem) > weakStrength) arr[weakIdx] = mem;
  // else discard (couldn't out-muscle the slot)
}

function runPromotion_(state, cycle, rng) {
  for (var ci = 0; ci < CATEGORIES.length; ci++) {
    var arr = state.slots[CATEGORIES[ci]];
    for (var s = 0; s < arr.length; s++) {
      var m = arr[s];
      var isMilestone = !!MILESTONE_TAGS[m.tag];
      if (m.tier === 'short') {
        // milestone road: an irreversible event is significant immediately.
        // pattern road: a recurring memory must have recurred.
        if (isMilestone && m.salience >= THETA_LONG) m.tier = 'long';
        else if (m.salience >= THETA_LONG && m.reinforced >= REINFORCE_LONG) m.tier = 'long';
      } else if (m.tier === 'long') {
        var age = cycle - m.bornCycle;
        var coreEligible = age >= CORE_MIN_AGE_CYCLES
          && (isMilestone || m.reinforced >= REINFORCE_CORE);
        if (coreEligible && Math.floor(rng() * CORE_STOCHASTIC) === 0) {
          m.tier = 'core';
          applyCoreToAxes_(state, m);
        }
      }
    }
  }
}

function applyCoreToAxes_(state, mem) {
  var ax = TAG_AXES[mem.tag];
  if (!ax) return;
  for (var k in ax) {
    if (!ax.hasOwnProperty(k)) continue;
    state.axes[k] = round3_(clamp01_(state.axes[k] + ax[k] * CORE_AXIS_GAIN));
  }
}

// ============================================================================
// R-DERIVED FACE
// ============================================================================

function deriveArchetype_(state) {
  // dark core dominates if conduct locked enough
  if (countCores_(state, 'Conduct', true) >= CONDUCT_DARK_CORE_THRESHOLD
      || state.conduct.dark >= CONDUCT_DARK_CORE_THRESHOLD) {
    return 'Outlaw';
  }
  var best = 'Drifter', bestScore = -1;
  for (var a in ARCHETYPES) {
    if (!ARCHETYPES.hasOwnProperty(a)) continue;
    var req = ARCHETYPES[a], score = 0, matches = 0;
    for (var t in req) {
      if (!req.hasOwnProperty(t)) continue;
      if ((state.axes[t] || 0) >= req[t] * 0.7) { score += state.axes[t]; matches++; }
    }
    if (matches > 0 && score > bestScore) { bestScore = score; best = a; }
  }
  return best;
}

function countCores_(state, category, darkOnly) {
  var arr = state.slots[category] || [], n = 0;
  for (var i = 0; i < arr.length; i++) {
    if (arr[i].tier !== 'core') continue;
    if (darkOnly && !DARK_TAGS[arr[i].tag]) continue;
    n++;
  }
  return n;
}

// Build the pipe-delimited TraitProfile string the 6 existing readers consume.
function deriveTraitProfile_(state, cycle) {
  var parts = ['Archetype:' + state.archetype];
  var axes = state.axes;
  for (var t in axes) {
    if (!axes.hasOwnProperty(t)) continue;
    if (axes[t] >= 0.15) parts.push(t + ':' + axes[t].toFixed(2));
  }
  var top = topTags_(state, 5);
  if (top.length) parts.push('TopTags:' + top.join(','));
  var cond = conductSignal_(state);
  if (cond) parts.push('Conduct:' + cond);
  parts.push('V:' + MEMORY_VERSION);
  parts.push('Updated:c' + (cycle || state.updatedCycle || 0));
  return parts.join('|');
}

function topTags_(state, n) {
  var all = [];
  for (var ci = 0; ci < CATEGORIES.length; ci++) {
    var arr = state.slots[CATEGORIES[ci]];
    for (var s = 0; s < arr.length; s++) all.push(arr[s]);
  }
  all.sort(function (a, b) {
    var ta = a.tier === 'core' ? 2 : a.tier === 'long' ? 1 : 0;
    var tb = b.tier === 'core' ? 2 : b.tier === 'long' ? 1 : 0;
    if (tb !== ta) return tb - ta;
    return b.salience - a.salience;
  });
  var out = [];
  for (var i = 0; i < Math.min(n, all.length); i++) out.push(all[i].tag);
  return out;
}

function conductSignal_(state) {
  var dark = countCores_(state, 'Conduct', true);
  if (state.archetype === 'Outlaw' || dark >= CONDUCT_DARK_CORE_THRESHOLD) return 'dark-' + Math.max(dark, 1);
  if (state.conduct.dark >= 1) return 'dark-0';
  if (state.conduct.integrity >= 1) return 'integrity-' + Math.round(state.conduct.integrity);
  return '';
}

// ============================================================================
// HELPERS
// ============================================================================

// Displacement strength = raw salience, lifted by recurrence (reliving keeps
// it) and by tier (a consolidated long-term memory outranks a fresh one, even
// a vivid one). Core never reaches here — it's excluded from displacement.
var TIER_MULT = { short: 1, long: 2.0, core: 99 };
function effectiveStrength_(mem) {
  return mem.salience
    * (1 + (mem.reinforced || 0) * 0.15)
    * (TIER_MULT[mem.tier] || 1);
}

function round3_(n) { return Math.round(n * 1000) / 1000; }
function clamp01_(n) { return n < 0 ? 0 : (n > 1 ? 1 : n); }

// --- Node export shim (ignored by Apps Script) ----------------------------
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    MEMORY_VERSION: MEMORY_VERSION,
    CATEGORIES: CATEGORIES,
    newMemoryState_: newMemoryState_,
    serializeMemoryState_: serializeMemoryState_,
    parseMemoryState_: parseMemoryState_,
    routeCategory_: routeCategory_,
    mergeCycle_: mergeCycle_,
    deriveTraitProfile_: deriveTraitProfile_,
    deriveArchetype_: deriveArchetype_,
    countCores_: countCores_,
    _knobs: {
      SLOTS_PER_CATEGORY: SLOTS_PER_CATEGORY, THETA_LONG: THETA_LONG,
      REINFORCE_LONG: REINFORCE_LONG, REINFORCE_CORE: REINFORCE_CORE,
      CORE_MIN_AGE_CYCLES: CORE_MIN_AGE_CYCLES, CORE_STOCHASTIC: CORE_STOCHASTIC
    }
  };
}
