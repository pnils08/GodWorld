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
//   fandom      doesn't follow <-> lives and dies with them  (the SELECTOR for sports / UNDOCKED events; Dial 9, engine.208)
var DIALS = ['drive', 'sociability', 'warmth', 'openness', 'composure', 'integrity', 'family', 'outabout', 'fandom'];

var MIDPOINT = 50;          // bipolar center; below 50 IS the negative pole
var MOOD_DECAY = 0.8;       // temporary swing fades 20%/cycle back toward baseline
// engine.208: a fan's upset fades slower than an ordinary swing (the 2026-09-27 ruling — sports is a
// heavy driver, the fade is slow). Any dial not listed keeps MOOD_DECAY.
var MOOD_DECAY_BY_DIAL = { fandom: 0.9 };
var HARDEN_STREAK = 3;      // same-direction push sustained N times -> permanent baseline shift
var HARDEN_FRACTION = 0.4;  // fraction of a sustained swing that bakes in permanently

// engine.42 chaos-trauma accumulator (S275). A SECOND, faster-threshold accumulator
// running parallel to harden: repeated chaos-cars hits on one citizen escalate to a
// labeled break (wary -> traumatized) that hardens base ONCE per escalation, on TOP of
// each hit's own gradual DIAL_MAP fold. "Random repetition changes the citizen faster"
// (Mike, S275). Chaos is sparse per citizen (~3-15 events/cycle over ~900), so the count
// MUST persist on DialState across cycles or the threshold never fires.
var CHAOS_SEV = { high: 2, low: 1 };  // outcome.severity -> numeric severity
var CHAOS_FADE_GAP = 6;               // chaos-free cycles before exposure fades one step (recovery)

// Band layer (S253 working cut — 5 bands, tune empirically in Phase 1/6).
// BAND_CUTS slice 0-100 into band index 0..4. The middle band (40-60) is the
// wide, quiet "unremarkable / average person"; the ends are where stories live.
var BAND_CUTS = [20, 40, 60, 80];               // <20 |20-40|40-60|60-80| >=80
var BAND_MULT = [0.5, 0.75, 1.0, 1.25, 1.5];    // event-probability multiplier per band index
var BAND_SIGNED = [-2, -1, 0, 1, 2];            // signed band for readability

function clamp100_(n) { return n < 0 ? 0 : (n > 100 ? 100 : n); }
function round1_(n) { return Math.round(n * 10) / 10; }
// S451 (builder ruling 2026-09-13): a base read AT 0/100 is read back AS IS. The five live cells at
// exactly 100 (POP-00001 drive; POP-00170/198/210/231 sociability) are seeder saturation
// (backdateCitizenDials.js tanh curve), not drift — they stay where they were set and move only on a
// real downward event. The engine.201b read-side remap to 97.5/2.5 masked them; it is gone.

// A citizen = permanent self (base) + current swing (mood) + reinforcement (streak), per dial.
function newCitizen_(base) {
  var c = { base: {}, mood: {}, streak: {} };
  for (var i = 0; i < DIALS.length; i++) {
    var d = DIALS[i];
    c.base[d] = (base && base[d] != null) ? clamp100_(base[d]) : MIDPOINT;
    c.mood[d] = 0;
    c.streak[d] = 0;
  }
  return c;
}

// where a dial sits RIGHT NOW = permanent self + current swing
function current_(c, dial) { return clamp100_(c.base[dial] + c.mood[dial]); }

// engine.201 W1e (S449): every signed change shrinks as the CURRENT value (base+mood)
// nears the edge it is heading for — full size up to the midpoint, zero at the pole.
// engine.177 gave only base this room, so base+mood still clamped at 100 (5 live pins at
// C106, 32 on the C131 bench). Toward-middle changes keep full size, so any extreme can
// recover. Never overshoots while |delta| <= 50.
function roomScaled_(cur, delta) {
  if (!delta) return 0;
  var room = delta > 0 ? (100 - cur) : cur;   // distance to the pole this change heads for
  if (room <= 0) return 0;
  var r = room / 50;
  if (r > 1) r = 1;
  var eff = delta * r;
  // codex review S449: a netted cycle can exceed 50 (seven Promotions = +56); never cover more than 95%
  // of the remaining distance, so no single step lands on the pole.
  var cap = room * 0.95;
  if (eff > cap) eff = cap;
  if (eff < -cap) eff = -cap;
  return eff;
}

// event = { label, effects: { dial: deltaInt, ... } } — effects come from citizenDialMap.
// Chaos exposure does NOT route through here (the fold sees only the col-O primary tag,
// which can't distinguish a chaos Setback from an ordinary one). The accumulator is fed
// at chaos-cars emission time via accrueChaos_ below — see header note.
// The Phase-9 fold calls this ONCE PER CYCLE with that cycle's netted effects
// (compressLifeHistory.js foldNewEntries_), so a streak counts cycles, not log lines.
function applyEvent_(c, event) {
  var fx = (event && event.effects) || {};
  for (var d in fx) {
    if (!fx.hasOwnProperty(d) || c.base[d] == null) continue;
    var delta = fx[d];
    if (!delta) continue;
    c.mood[d] += roomScaled_(current_(c, d), delta);
    // reinforcement: same direction again -> streak builds; a flip resets it
    if (delta > 0) c.streak[d] = c.streak[d] >= 0 ? c.streak[d] + 1 : 1;
    else c.streak[d] = c.streak[d] <= 0 ? c.streak[d] - 1 : -1;
    // a sustained pattern hardens into who they ARE (permanent), then streak resets.
    // engine.177 (S438): hardening TOWARD an edge has diminishing room (1 at 50, 0 at
    // 0/100) so accumulation approaches an extreme and never pins it — the bounded
    // accumulator every source game keeps (research4_1 §3). Hardening back toward
    // the middle keeps full room, so a pinned citizen can always recover.
    // engine.201 W1d (S449): only the swing that points the streak's way hardens. A
    // positive streak sitting on a large negative residual mood no longer bakes the
    // negative residual into base — the sequence just ends.
    if (Math.abs(c.streak[d]) >= HARDEN_STREAK) {
      if (c.mood[d] !== 0 && (c.mood[d] > 0) === (c.streak[d] > 0)) {
        var towardEdge = (c.mood[d] > 0) === (c.base[d] >= MIDPOINT);
        var room = towardEdge ? (1 - Math.abs(c.base[d] - MIDPOINT) / 50) : 1;
        c.base[d] = clamp100_(c.base[d] + c.mood[d] * HARDEN_FRACTION * room);
        c.mood[d] = c.mood[d] * (1 - HARDEN_FRACTION);
      }
      c.streak[d] = 0;
    }
  }
}

// engine.201 W1c (S449): one cycle of lived experience. netFx = the cycle's summed
// { dial: delta }, applied once — three lines in one cycle are one step, not a habit.
// A push continues a streak only while the previous swing is still FELT: the dial's
// residual mood points the same way. Once settleCycle_ has faded that swing to zero,
// the sequence is over and the next push starts a new one. So a household moment every
// few cycles can harden into who someone is, while two pushes, thirty quiet cycles and
// a third do not (the pre-S449 event counter hardened that).
function applyCycleEffects_(c, netFx) {
  var fx = netFx || {};
  for (var i = 0; i < DIALS.length; i++) {
    var d = DIALS[i];
    if (!fx[d] || c.base[d] == null) continue;
    if (c.mood[d] === 0 || (c.mood[d] > 0) !== (fx[d] > 0)) c.streak[d] = 0;
  }
  applyEvent_(c, { label: 'cycle', effects: fx });
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
// which the v2.0 fold zeroed every compress). Since engine.177 (S438) mood persists and decays,
// but the drain keeps the direct-base path so a lone reflection still registers durably.
// Retained for the offline composer test (Test 7) + as the mood-path reference. No live cycle caller.
function applyReflectionDualTag_(c, eventTag, affectTag, dialMap, severityMult) {
  var effects = dialMap && dialMap.nudgesForReflection_
    ? dialMap.nudgesForReflection_(eventTag, affectTag, severityMult)
    : {};
  applyEvent_(c, { label: (eventTag || '') + '|' + (affectTag || ''), effects: effects });
}

// Direct-base reflection accretion — the LIVE write-back path (citizen-loop research.14, S269).
// Why not applyReflectionDualTag_/applyEvent_: those land deltas in `mood`, which decays 0.8/cycle
// (persisted since engine.177, S438; zeroed at fold before that), so a lone reflection's effect
// would fade out; and `base` is reached objectively ONLY via a >=HARDEN_STREAK
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
      c.base[d] = clamp100_(c.base[d] + roomScaled_(current_(c, d), delta)); // engine.201 W1e
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
    c.mood[d] = c.mood[d] * (MOOD_DECAY_BY_DIAL[d] != null ? MOOD_DECAY_BY_DIAL[d] : MOOD_DECAY);
    if (Math.abs(c.mood[d]) < 0.5) c.mood[d] = 0;
  }
}

// raw 0-100 -> band index 0..4 (the ONLY thing consumers read)
function bandIndex_(v) {
  for (var i = 0; i < BAND_CUTS.length; i++) { if (v < BAND_CUTS[i]) return i; }
  return BAND_CUTS.length; // top band
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
  outabout:    ['homebody', 'stays in', '', 'often out', 'always out'],
  fandom:      ["doesn't follow the teams", 'half an eye on the scores', '', 'a real fan', 'lives and dies with them']
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

// storage round-trip (Phase 2 will persist this in TraitProfile/JSON) — pure objects, no I/O.
// chaosExposure rides along only when present (additive; old DialState rows lack it and
// deserialize to no exposure — backward compatible with the S256-live dial spine).
function serialize_(c) {
  var o = { base: c.base, mood: c.mood, streak: c.streak };
  if (c.chaosExposure) o.chaosExposure = c.chaosExposure;
  if (c.pressure) o.pressure = c.pressure;
  if (c.wear) o.wear = c.wear;
  if (c.debtDefault) o.debtDefault = c.debtDefault;
  if (c.grief) o.grief = c.grief;
  if (c.fan) o.fan = c.fan; // engine.208 the team a fan follows: 'as' | 'oaks' | 'both'
  return o;
}
function deserialize_(obj) {
  var c = newCitizen_(obj && obj.base);
  if (obj) {
    for (var i = 0; i < DIALS.length; i++) {
      var d = DIALS[i];
      if (obj.mood && obj.mood[d] != null) c.mood[d] = obj.mood[d];
      if (obj.streak && obj.streak[d] != null) c.streak[d] = obj.streak[d];
    }
    if (obj.chaosExposure) c.chaosExposure = obj.chaosExposure;
    if (obj.maneuver) c.maneuver = obj.maneuver; // engine.157 posture memory rides along
    if (obj.folded > 0) c.folded = obj.folded;   // engine.177 watermark (last folded cycle)
    if (obj.pressure) c.pressure = obj.pressure; // engine.201 W1f per-cause pressure run {cause:{n,l}}
    if (obj.wear) c.wear = obj.wear;             // engine.272 integrity wear {d, l}
    if (obj.debtDefault) c.debtDefault = obj.debtDefault; // engine.276 default mark {l, n} — the money loop writes it, the home roll reads it
    if (obj.grief) c.grief = obj.grief; // engine.94 B.1 latest bereavement Cycle
    if (obj.fan) c.fan = obj.fan;                 // engine.208 the team a fan follows — seed / household / mint write it
  }
  return c;
}

// engine.42 chaos-trauma (S275) — three pure helpers feeding c.chaosExposure, the
// persisted cross-cycle accumulator. Fed at chaos-cars emission (accrueChaos_), broken
// once per escalation (applyChaosReaction_), healed over chaos-free time (decayChaosExposure_).
// All operate on c.base + c.chaosExposure; no I/O, ES5-safe (Node + Apps Script clasped).

// A chaos-cars hit lands: bump the persisted exposure. severity is the outcome's
// 'high'/'low' (mapped to 2/1) — no string-parsing of tags (the old draft's bug). type
// is the vehicle name. reactedLevel tracks which labeled break has already fired.
function accrueChaos_(c, severity, type, cycle) {
  if (!c) return;
  var sev = (typeof severity === 'number') ? severity : (CHAOS_SEV[String(severity)] || 1);
  var cyc = (cycle != null) ? cycle : 0;
  var ctype = type || 'general';
  if (!c.chaosExposure) {
    c.chaosExposure = { firstSeen: cyc, lastSeen: cyc, count: 1, severity: sev, types: {}, reactedLevel: 0 };
  } else {
    c.chaosExposure.lastSeen = cyc;
    c.chaosExposure.count++;
    c.chaosExposure.severity = Math.max(c.chaosExposure.severity, sev);
  }
  c.chaosExposure.types[ctype] = true;
}

// escalating reaction to accumulated chaos. Reads c.chaosExposure; pure read (no mutation).
function checkChaosReaction_(c) {
  if (!c || !c.chaosExposure) return null;
  var ce = c.chaosExposure;
  var typeArr = [];
  for (var t in ce.types) { if (ce.types.hasOwnProperty(t)) typeArr.push('chaos-type:' + t); }
  if (ce.count >= 3 && ce.severity >= 2) {
    return { reaction: 'traumatized', level: 2, dialEffects: { composure: -8, openness: -4 },
             tags: ['chaos:trauma'].concat(typeArr) };
  }
  if (ce.count >= 2) {
    return { reaction: 'wary', level: 1, dialEffects: { composure: -4, openness: -2 },
             tags: ['chaos:wary'].concat(typeArr) };
  }
  return null;
}

// Apply the labeled break to base ONCE per escalation (transition-gated by reactedLevel),
// so a citizen who stays traumatized doesn't re-take -8 composure every cycle (runaway to
// floor). The per-hit gradual DIAL_MAP fold is the separate, always-on first tier; this is
// the second tier that fires only when repetition crosses a threshold. Returns the reaction
// (for provenance tagging) on a fresh break, else null.
function applyChaosReaction_(c) {
  var r = checkChaosReaction_(c);
  if (!r) return null;
  var ce = c.chaosExposure;
  if (r.level <= (ce.reactedLevel || 0)) return null;   // already broke at/above this level
  for (var d in r.dialEffects) {
    if (r.dialEffects.hasOwnProperty(d) && c.base[d] != null) {
      c.base[d] = clamp100_(c.base[d] + roomScaled_(current_(c, d), r.dialEffects[d])); // engine.201 W1e
    }
  }
  ce.reactedLevel = r.level;
  return r;
}

// Recovery: chaos-free time fades the accumulator one step per CHAOS_FADE_GAP cycles, and
// drops the labeled break as exposure recedes — so positive folds (Faith/Recovery/Community)
// and quiet weeks heal a citizen instead of locking trauma forever. Clears the field at 0.
// Lazy (called when the citizen is next touched in compress), advancing lastSeen by exactly
// the consumed gaps so the remainder carries forward. Returns true if anything changed.
function decayChaosExposure_(c, currentCycle) {
  if (!c || !c.chaosExposure) return false;
  var ce = c.chaosExposure;
  var gap = (currentCycle != null ? currentCycle : 0) - (ce.lastSeen || 0);
  if (gap < CHAOS_FADE_GAP) return false;
  var steps = Math.floor(gap / CHAOS_FADE_GAP);
  ce.count -= steps;
  if (ce.count <= 0) { delete c.chaosExposure; return true; }
  if (ce.count < 2) ce.reactedLevel = 0;
  else if (ce.count < 3 && (ce.reactedLevel || 0) > 1) ce.reactedLevel = 1;
  ce.lastSeen = (ce.lastSeen || 0) + steps * CHAOS_FADE_GAP;
  return true;
}

// engine.201 S453 / engine.274: where a CAPPED scan of the ledger starts this Cycle.
// A coprime stride visits every start exactly once per n Cycles; it sits near the
// golden-ratio fraction so short runs spread too. No RNG draw, no row reorder, no
// persisted cursor. The conduct engine (3 moral tests a Cycle) and the career engine
// (10 texture events a Cycle) both walk (start + i) % n, so a cap never hands every
// Cycle's events to the same early rows.
function rotatedScanStart_(n, cycle) {
  n = Math.floor(Number(n) || 0);
  if (n <= 0) return 0;
  var stride = Math.max(1, Math.floor(n * 0.618033988749895));
  while (stride > 1) {
    var a = n, b = stride;
    while (b) { var rem = a % b; a = b; b = rem; }
    if (a === 1) break;
    stride--;
  }
  var c = Math.floor(Number(cycle) || 0);
  return (((c % n) * stride) % n + n) % n;
}

// ============================================================================
// engine.272 — INTEGRITY WEAR (the crime axis gets a cause that reaches it)
// ----------------------------------------------------------------------------
// Before this, nothing in ordinary life lowered integrity: the only crime-sized
// down-movers were crimes, which only an already-reachable citizen commits. A
// standing hardship now wears the dial in BASE (mood fades x0.8 a Cycle and reaches
// base only on a three-Cycle run, so a wear landed in mood never arrives), one step
// a Cycle, down to a floor; when the hardship lifts the citizen regains at the same
// rate. DialState.wear = { d, l }: d = points currently worn off, l = last Cycle a
// step ran. Rate and floor are World_Config dials (integrityWearRate 0 = off).
// Pure, ES5-safe. The fold (compressLifeHistory_) is the only caller.
// ============================================================================
// Causes that count as a standing hardship. overwork is the citizen's own drive
// (PRESSURE_NO_ADAPT), not the world's pressure — out until the builder rules it in.
var INTEGRITY_WEAR_CAUSES = { debt: true, rent: true, hood: true, unemployed: true };

// true when a counted cause's pressure was admitted THIS Cycle (pressure[cause].l,
// written in Phase 5 by pressureRunFromState_ — through adaptation too).
function integrityWornByPressure_(pressure, cycle) {
  if (!pressure || typeof pressure !== 'object') return false;
  for (var cause in INTEGRITY_WEAR_CAUSES) {
    if (!INTEGRITY_WEAR_CAUSES.hasOwnProperty(cause)) continue;
    var rec = pressure[cause];
    if (rec && Number(rec.l) === cycle) return true;
  }
  return false;
}

// Would a step move this citizen this Cycle? Reads the PARSED DialState object (no
// deserialize), so the fold can decide before it commits to a read-modify-write.
// 'wear' | 'regain' | null. Rate 0, no parsed base, or a step already run this Cycle -> null.
function integrityWearDue_(ds, cycle, rate, floor) {
  if (!(rate > 0) || !ds || !ds.base || typeof ds.base !== 'object') return null;
  var w = ds.wear;
  if (w && Number(w.l) === cycle) return null;
  var base = ds.base.integrity != null ? Number(ds.base.integrity) : MIDPOINT;
  if (integrityWornByPressure_(ds.pressure, cycle)) return base > floor ? 'wear' : null;
  return (w && Number(w.d) > 0) ? 'regain' : null;
}

// One step. worn=true: down by rate, never past floor (floor is where WEAR stops; an
// event may still take a citizen lower). worn=false: back up by rate, never more than
// was worn off. Returns true when the citizen changed.
function applyIntegrityWear_(c, worn, cycle, rate, floor) {
  if (!c || !c.base || !(rate > 0)) return false;
  var w = c.wear || { d: 0, l: 0 };
  if (Number(w.l) === cycle) return false;
  var base = c.base.integrity, d = Number(w.d) || 0, moved;
  if (worn) {
    moved = Math.min(rate, Math.max(0, base - floor));
    if (!(moved > 0)) return false;
    c.base.integrity = base - moved;
    d += moved;
  } else {
    if (!(d > 0)) return false;
    moved = Math.min(rate, d, Math.max(0, 100 - base));
    c.base.integrity = base + moved;
    d = moved > 0 ? d - moved : 0;   // at the pole there is nothing left to regain
  }
  if (d < 1e-6) delete c.wear;
  else c.wear = { d: d, l: cycle };
  return true;
}

// ============================================================================
// engine.179 (S438) — CONTESTS RESOLVED BY CHARACTER (research.28 Cut D)
// ----------------------------------------------------------------------------
// Two citizens want the same thing. Exactly TWO terms per contest, weight 1 each,
// every term on the signed band scale -2..+2 (a credential is converted, never an
// ordinal). gap = Σ(a − b) ∈ [−8, +8]; p(a wins) = clamp(0.5 + 0.08·gap, 0.2, 0.8):
// the fully polar mismatch caps at 4:1, the underdog always can win (doctrine §2:
// causes, then dice). The CK3 scheme-against-resistance shape. Fenced by §10: the
// GC family-match and marriage lotteries never call this.
// ============================================================================
var CONTEST_GAIN = 0.08, CONTEST_FLOOR = 0.2, CONTEST_CEIL = 0.8;
var CREDENTIAL_BAND = {
  'none': -2, 'hs-dropout': -2, 'dropout': -2,
  'hs-diploma': -1, 'ged': -1, 'high school': -1,
  'some-college': 0, 'associates': 0, 'associate': 0, 'trade-cert': 0, 'trade': 0, 'certificate': 0,
  'bachelors': 1, 'bachelor': 1,
  'masters': 2, 'master': 2, 'doctorate': 2, 'phd': 2, 'professional': 2, 'jd': 2, 'md': 2
};
function credentialBand_(edu) {
  var k = String(edu || '').trim().toLowerCase().replace(/[’']s$/, 's');
  if (!k) return 0;
  if (CREDENTIAL_BAND.hasOwnProperty(k)) return CREDENTIAL_BAND[k];
  for (var key in CREDENTIAL_BAND) { if (CREDENTIAL_BAND.hasOwnProperty(key) && k.indexOf(key) === 0) return CREDENTIAL_BAND[key]; }
  return 0;
}
function bandClamp_(v) { var n = Number(v) || 0; return n < -2 ? -2 : (n > 2 ? 2 : n); }
// contestRoll_(S, rng, aTerms, bTerms, site, aId, bId) -> { aWins, p, gap, roll }
//   aTerms/bTerms: { <term>: signedBand } with exactly the same two keys each.
//   S (ctx.summary) receives S.contests = { n, aWins, underdogWins, bySite:{site:n}, gaps:{gap:n} }.
function contestRoll_(S, rng, aTerms, bTerms, site, aId, bId) {
  var keys = [];
  for (var k in aTerms) { if (aTerms.hasOwnProperty(k)) keys.push(k); }
  if (keys.length !== 2) throw new Error('contestRoll_: exactly two terms per contest (' + keys.length + ' given at ' + site + ')');
  var gap = 0;
  for (var i = 0; i < 2; i++) gap += bandClamp_(aTerms[keys[i]]) - bandClamp_(bTerms[keys[i]]);
  var p = 0.5 + CONTEST_GAIN * gap;
  if (p < CONTEST_FLOOR) p = CONTEST_FLOOR;
  if (p > CONTEST_CEIL) p = CONTEST_CEIL;
  var roll = typeof rng === 'function' ? rng() : 0.5;
  var aWins = roll < p;
  if (S) {
    var c = S.contests || (S.contests = { n: 0, aWins: 0, underdogWins: 0, bySite: {}, gaps: {} });
    c.n++; if (aWins) c.aWins++;
    if ((gap > 0 && !aWins) || (gap < 0 && aWins)) c.underdogWins++;
    c.bySite[site || '?'] = (c.bySite[site || '?'] || 0) + 1;
    c.gaps[String(gap)] = (c.gaps[String(gap)] || 0) + 1;
  }
  return { aWins: aWins, p: p, gap: gap, roll: roll, a: aId, b: bId };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    contestRoll_: contestRoll_, credentialBand_: credentialBand_, CREDENTIAL_BAND: CREDENTIAL_BAND,
    CONTEST_GAIN: CONTEST_GAIN, CONTEST_FLOOR: CONTEST_FLOOR, CONTEST_CEIL: CONTEST_CEIL,
    DIALS: DIALS, MIDPOINT: MIDPOINT, BAND_CUTS: BAND_CUTS, BAND_MULT: BAND_MULT,
    HARDEN_STREAK: HARDEN_STREAK,
    newCitizen_: newCitizen_, current_: current_,
    applyEvent_: applyEvent_, applyTaggedEvent_: applyTaggedEvent_,
    roomScaled_: roomScaled_, applyCycleEffects_: applyCycleEffects_,
    applyReflectionDualTag_: applyReflectionDualTag_,
    accreteReflectionsIntoBase_: accreteReflectionsIntoBase_, settleCycle_: settleCycle_,
    bandIndex_: bandIndex_, band_: band_, bandMultiplier_: bandMultiplier_,
    describe_: describe_, snapshot_: snapshot_,
    serialize_: serialize_, deserialize_: deserialize_,
    accrueChaos_: accrueChaos_, checkChaosReaction_: checkChaosReaction_,
    applyChaosReaction_: applyChaosReaction_, decayChaosExposure_: decayChaosExposure_,
    INTEGRITY_WEAR_CAUSES: INTEGRITY_WEAR_CAUSES, integrityWornByPressure_: integrityWornByPressure_,
    integrityWearDue_: integrityWearDue_, applyIntegrityWear_: applyIntegrityWear_,
    rotatedScanStart_: rotatedScanStart_
  };
}
