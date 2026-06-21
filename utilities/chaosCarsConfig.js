/**
 * chaosCarsConfig.js — Chaos-cars engine config + safety constraints.
 *
 * [engine/sheet] engine.11 chaos-cars (docs/plans/2026-05-07-chaos-cars-engine.md).
 *   - T1.4 (S229): FORBIDDEN_OUTCOMES + validateOutcome + validateVehicleConfig
 *   - T2.1/T2.2 (S265): VEHICLE_CONFIG_SCHEMA + 10-vehicle VEHICLE_CONFIGS table
 *     finalized in plan §S265 Design Finalization; loadChaosCarsConfig_().
 *
 * RELOCATED S265 from lib/chaosCarsConfig.js → utilities/. Reason: `lib/**` is
 * .claspignored, so the live engine (Apps Script) could never load the config it
 * reads at dice-roll/config-load time. utilities/ IS clasped. Dual-runtime via the
 * module-guard tail (Apps Script: `module` undefined → globals; Node: require).
 * Pattern mirrors utilities/rosterLookup.js + priorityEngine.js + bylineEngine.js.
 *
 * ES5/var + global function style is REQUIRED, not stylistic: Apps Script V8 only
 * reliably shares top-level `var` + `function` across concatenated files. Top-level
 * `const`/`let` are script-scoped and may not be visible to phase04 at cycle-time.
 *
 * No-death constraint (plan §Acceptance #4): the engine breaks cookie-cutter
 * equilibrium with high-magnitude swings; death-class outcomes are excluded from
 * the design floor regardless of vehicle, dice probability, or target tier.
 * Enforced at config-load time (validateAllChaosConfigs_) AND dice-roll time
 * (validateOutcome in phase04 rollOutcome_).
 */

// ════════════════════════════════════════════════════════════════════════════
// No-death constraint (T1.4)
// ════════════════════════════════════════════════════════════════════════════

/**
 * Forbidden outcome tokens. Word-boundary match (\b) — `dead` matches in
 * `dead-end` but not `deadline`. Over-enumerated on purpose: false-positive cost
 * (rejecting a benign "dying" descriptor) << false-negative cost (admitting a
 * death-class outcome). Frozen — the contract Phase 3/4 dice-roll relies on.
 */
var FORBIDDEN_OUTCOMES = Object.freeze([
  'death', 'died', 'dying', 'dies',
  'fatal', 'fatality', 'fatalities',
  'kill', 'kills', 'killed', 'killing',
  'deceased', 'dead',
  'perish', 'perished',
  'casualty', 'casualties',
  'homicide', 'suicide', 'murder', 'murdered'
]);

/**
 * Validate an outcome string against the forbidden list.
 * @param {string} outcomeText
 * @returns {true} when no forbidden token is present
 * @throws {Error} naming the matched token + originating outcome
 */
function validateOutcome(outcomeText) {
  if (typeof outcomeText !== 'string') {
    throw new Error('chaos_cars: validateOutcome expects a string, got ' + typeof outcomeText);
  }
  if (outcomeText.length === 0) {
    throw new Error('chaos_cars: validateOutcome received empty outcome string');
  }
  var lower = outcomeText.toLowerCase();
  for (var i = 0; i < FORBIDDEN_OUTCOMES.length; i++) {
    var token = FORBIDDEN_OUTCOMES[i];
    var pattern = new RegExp('\\b' + escapeRegExpChaos_(token) + '\\b', 'i');
    if (pattern.test(lower)) {
      throw new Error(
        'chaos_cars: forbidden outcome detected: "' + token + '" in "' + outcomeText +
        '" — universal no-death constraint (plan §Acceptance #4); revise vehicle config.'
      );
    }
  }
  return true;
}

/**
 * Validate every textureOutcomes[] entry on a vehicle config object.
 * Throws on first violation, naming the offending vehicle.
 */
function validateVehicleConfig(config) {
  if (!config || typeof config !== 'object') {
    throw new Error('chaos_cars: validateVehicleConfig expects an object, got ' + typeof config);
  }
  var vehicleName = config.name || '<unnamed-vehicle>';
  var outcomes = isArrayChaos_(config.textureOutcomes) ? config.textureOutcomes : [];
  for (var i = 0; i < outcomes.length; i++) {
    var entry = outcomes[i];
    if (!entry || typeof entry.outcome !== 'string') continue;
    try {
      validateOutcome(entry.outcome);
    } catch (e) {
      throw new Error('chaos_cars: vehicle "' + vehicleName + '" config invalid — ' + e.message);
    }
  }
  return true;
}

function escapeRegExpChaos_(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isArrayChaos_(x) {
  return Object.prototype.toString.call(x) === '[object Array]';
}

// ════════════════════════════════════════════════════════════════════════════
// Vehicle config (T2.1/T2.2 — finalized plan §S265)
// ════════════════════════════════════════════════════════════════════════════

/**
 * VEHICLE_CONFIG_SCHEMA (documentation; the data below conforms).
 *
 *  name                 snake_case id (Chaos_Cars col C)
 *  displayName          human label for desk packets
 *  scopes[]             which target scopes this vehicle can hit: citizen|business|neighborhood
 *  baseFrequencyWeight  picker weight (multiplier; §S265 "Wt" column)
 *  textureOutcomes[] {
 *    outcome            snake_case id (Chaos_Cars col G); passes validateOutcome
 *    weight             dice weight within this vehicle (per-vehicle weights sum ~1.0)
 *    severity           'low' | 'high'  (high = cascade-capable when it hits a Tier-1 citizen)
 *    lifeHistoryTag     DIAL_MAP tag emitted on a CITIZEN hit (col O bracket tag) — must be a
 *                       real DIAL_MAP key (verified S265), else it falls through to DEFAULT_AMBIENT
 *                       (+composure), the INVERSE of intended adversity. Absent for outcomes whose
 *                       vehicle has no citizen scope.
 *    role               'agent' (own conduct → integrity tag) | 'victim'/'subject' (composure/warmth).
 *                       Documentation of intent; the actual dial is the lifeHistoryTag→DIAL_MAP delta.
 *    coverageContribution  (OARI only) true = evidence for the C95 D2 expansion coverage anchor
 *    narrativeSeed      one-line desk-packet seed (Chaos_Cars col K); present on high-severity
 *  }
 *  metricImpacts[] {     SCOPE-KEYED (§S265) — applied by scope, not "pick one"
 *    scope              'business' | 'neighborhood'  (citizen scope has no metric impact; the
 *                       writeback is the col-O dial)
 *    column             REAL ledger column name (Business_Ledger: Annual_Revenue/Employee_Count;
 *                       Neighborhood_Map: Sentiment/CrimeIndex/RetailVitality/EventAttractiveness)
 *    direction          'up' | 'down'  (sign of the swing; decay rates keyed to direction in DECAY_RULES)
 *    magnitudeRange     [min,max] integer sample (signed by direction at sample time)
 *    onOutcome          (optional) string|string[] — apply only when this outcome was rolled
 *                       (e.g. Employee_Count loss only on forced_temporary_closure)
 *  }
 *
 * ORCHESTRATOR CONTRACT (T3.12): pick scope from vehicle.scopes, then apply ALL
 * metricImpacts whose `scope` matches AND whose `onOutcome` (if present) includes the
 * rolled outcome. NOT pickFromArray (the draft's naive single-pick was superseded by §S265).
 * The first scope-matching impact is recorded as Chaos_Cars PrimaryMetric/MetricMagnitude
 * (cols H/I); all matching impacts write to their scope ledger/residual.
 *
 * Frequency-weighted exposure (§S265): negative-dominant vehicles ≈ 62%, positive ≈ 29%,
 * mixed ≈ 9% — Mike's "lean negative" dial. ice_cream + street_sweeper carry no high-severity
 * outcome by design → never trigger a Tier-1 scandal (intentional levity contrast).
 *
 * Starter weights/magnitudes — Phase 6 tuning (T6.2) may adjust; the no-death floor,
 * scope-keying, and direction asymmetry are locked (plan §Hard Constraints).
 *
 * S265 SCALE CALIBRATION (engine-sheet, Mike-approved): §S265's neighborhood magnitudes
 * were written on a 0-100 mental scale; the live columns are far smaller — Sentiment is a
 * 0-1 mood index (live 0.20-0.33), CrimeIndex an integer incident count (live 0-1). The
 * engine.33 pulse fold caps its own deltas at Sentiment ±0.15 / CrimeIndex ±0.10. So the
 * Sentiment/CrimeIndex magnitudes here are fractional (0.02-0.15), sized just above the
 * pulse-fold caps — chaos hits harder than ambient texture but does not floor a hood (a
 * -0.15 pge hit on a 0.27 hood → 0.12). RetailVitality (live ~7-11, cap 1.0) and
 * EventAttractiveness (live ~15-25, cap 4.0) were already in scale → unchanged. Business
 * Annual_Revenue/Employee_Count magnitudes await a Business_Ledger scale check (T3.9/T6.2).
 * FLAG for research-build: no vehicle currently RAISES CrimeIndex (cop/oari both push down
 * on a ~0 baseline) → that channel is low-signal until a crime-spiking outcome exists.
 */

var VEHICLE_CONFIGS = [
  {
    name: 'cop_car', displayName: 'Cop car',
    scopes: ['citizen', 'neighborhood'], baseFrequencyWeight: 1.2,
    textureOutcomes: [
      { outcome: 'ticket',              weight: 0.40, severity: 'low',  lifeHistoryTag: 'Setback',              role: 'victim'  },
      { outcome: 'pulled_over_warning', weight: 0.20, severity: 'low',  lifeHistoryTag: 'Background',           role: 'subject' },
      { outcome: 'helped_by_police',    weight: 0.25, severity: 'low',  lifeHistoryTag: 'Recovering',           role: 'victim'  },
      { outcome: 'arrested',            weight: 0.15, severity: 'high', lifeHistoryTag: 'Transgression-Serious', role: 'agent',
        narrativeSeed: 'An arrest on the block — the booking, and the morning after for everyone who watched.' }
    ],
    metricImpacts: [
      { scope: 'neighborhood', column: 'CrimeIndex', direction: 'down', magnitudeRange: [0.05, 0.15] }
    ]
  },
  {
    name: 'fire_engine', displayName: 'Fire engine',
    scopes: ['business', 'neighborhood'], baseFrequencyWeight: 0.8,
    textureOutcomes: [
      { outcome: 'false_alarm',           weight: 0.45, severity: 'low'  },
      { outcome: 'minor_fire',            weight: 0.40, severity: 'low'  },
      { outcome: 'major_blaze_contained', weight: 0.15, severity: 'high',
        narrativeSeed: 'Smoke over the rooftops — a blaze contained, but the block smells it for days.' }
    ],
    metricImpacts: [
      { scope: 'business',     column: 'Annual_Revenue', direction: 'down', magnitudeRange: [10, 25]    },
      { scope: 'neighborhood', column: 'Sentiment',      direction: 'down', magnitudeRange: [0.04, 0.12] }
    ]
  },
  {
    name: 'ambulance', displayName: 'Ambulance',
    scopes: ['citizen', 'neighborhood'], baseFrequencyWeight: 0.9,
    textureOutcomes: [
      { outcome: 'minor_injury',       weight: 0.55, severity: 'low',  lifeHistoryTag: 'Health',       role: 'victim' },
      { outcome: 'medical_emergency',  weight: 0.25, severity: 'high', lifeHistoryTag: 'Critical',     role: 'victim',
        narrativeSeed: 'Lights and sirens at the curb — a medical emergency the neighbors will retell.' },
      { outcome: 'workplace_accident', weight: 0.20, severity: 'high', lifeHistoryTag: 'Hospitalized', role: 'victim',
        narrativeSeed: 'An accident on the job floor — a stretcher out the loading door.' }
    ],
    metricImpacts: [
      { scope: 'neighborhood', column: 'Sentiment', direction: 'down', magnitudeRange: [0.03, 0.08] }
    ]
  },
  {
    name: 'oari_van', displayName: 'OARI response van',
    scopes: ['citizen', 'neighborhood'], baseFrequencyWeight: 1.0,
    textureOutcomes: [
      { outcome: 'welfare_check',         weight: 0.50, severity: 'low',  lifeHistoryTag: 'Recovering', role: 'victim' },
      { outcome: 'deescalated',           weight: 0.25, severity: 'high', lifeHistoryTag: 'Stabilized', role: 'victim', coverageContribution: true,
        narrativeSeed: 'OARI talks it down — a crisis ended without cuffs, and the data point everyone cites.' },
      { outcome: 'substance_intervention', weight: 0.25, severity: 'high', lifeHistoryTag: 'Recovery',  role: 'victim', coverageContribution: true,
        narrativeSeed: 'A quiet intervention, a ride to treatment instead of a cell — the program working as promised.' }
    ],
    metricImpacts: [
      { scope: 'neighborhood', column: 'Sentiment',  direction: 'up',   magnitudeRange: [0.04, 0.10] },
      { scope: 'neighborhood', column: 'CrimeIndex',  direction: 'down', magnitudeRange: [0.04, 0.12] }
    ]
  },
  {
    name: 'building_inspector', displayName: 'Building inspector',
    scopes: ['business'], baseFrequencyWeight: 0.7,
    textureOutcomes: [
      { outcome: 'passed',                  weight: 0.50, severity: 'low'  },
      { outcome: 'code_violation_cited',    weight: 0.30, severity: 'high',
        narrativeSeed: 'A citation taped to the door — fines now, repairs the owner did not budget for.' },
      { outcome: 'forced_temporary_closure', weight: 0.20, severity: 'high',
        narrativeSeed: 'Shuttered pending compliance — staff sent home, regulars turned away at the door.' }
    ],
    metricImpacts: [
      { scope: 'business', column: 'Annual_Revenue', direction: 'down', magnitudeRange: [5, 15] },
      { scope: 'business', column: 'Employee_Count', direction: 'down', magnitudeRange: [0, 2], onOutcome: 'forced_temporary_closure' }
    ]
  },
  {
    name: 'garbage_truck', displayName: 'Garbage truck',
    scopes: ['neighborhood', 'business'], baseFrequencyWeight: 1.1,
    textureOutcomes: [
      { outcome: 'dumping_cleared',        weight: 0.40, severity: 'low'  },
      { outcome: 'missed_pickup',          weight: 0.40, severity: 'low'  },
      { outcome: 'sanitation_strike_delay', weight: 0.20, severity: 'high',
        narrativeSeed: 'Bags piling at the curb — a sanitation delay the whole block can smell.' }
    ],
    metricImpacts: [
      { scope: 'neighborhood', column: 'Sentiment',      direction: 'down', magnitudeRange: [0.04, 0.12] },
      { scope: 'neighborhood', column: 'RetailVitality', direction: 'down', magnitudeRange: [1, 3]      },
      { scope: 'business',     column: 'Annual_Revenue', direction: 'down', magnitudeRange: [3, 8]      }
    ]
  },
  {
    name: 'mail_truck', displayName: 'Mail truck',
    scopes: ['citizen', 'business'], baseFrequencyWeight: 1.0,
    textureOutcomes: [
      { outcome: 'vital_document_delivered', weight: 0.50, severity: 'low',  lifeHistoryTag: 'Background', role: 'subject' },
      { outcome: 'lost_package',             weight: 0.35, severity: 'low',  lifeHistoryTag: 'Setback',    role: 'victim'  },
      { outcome: 'mail_theft_reported',      weight: 0.15, severity: 'high', lifeHistoryTag: 'Setback',    role: 'victim',
        narrativeSeed: 'Mailboxes pried open on the block — a theft reported, trust dented.' }
    ],
    metricImpacts: [
      { scope: 'business', column: 'Annual_Revenue', direction: 'up', magnitudeRange: [1, 3] }
    ]
  },
  {
    name: 'ice_cream_truck', displayName: 'Ice cream truck',
    scopes: ['neighborhood'], baseFrequencyWeight: 0.5,
    textureOutcomes: [
      { outcome: 'summer_morale_boost',  weight: 0.45, severity: 'low' },
      { outcome: 'block_party_catalyst', weight: 0.30, severity: 'low' },
      { outcome: 'noise_complaint',      weight: 0.25, severity: 'low' }
    ],
    metricImpacts: [
      { scope: 'neighborhood', column: 'Sentiment',           direction: 'up', magnitudeRange: [0.04, 0.10] },
      { scope: 'neighborhood', column: 'EventAttractiveness', direction: 'up', magnitudeRange: [1, 4]       }
    ]
  },
  {
    name: 'street_sweeper', displayName: 'Street sweeper',
    scopes: ['neighborhood', 'citizen'], baseFrequencyWeight: 0.8,
    textureOutcomes: [
      { outcome: 'street_beautification', weight: 0.40, severity: 'low' },
      { outcome: 'parking_ticket',        weight: 0.35, severity: 'low', lifeHistoryTag: 'Setback',    role: 'victim'  },
      { outcome: 'traffic_jam',           weight: 0.25, severity: 'low', lifeHistoryTag: 'Background',  role: 'subject' }
    ],
    metricImpacts: [
      { scope: 'neighborhood', column: 'RetailVitality', direction: 'up',   magnitudeRange: [1, 3]      },
      { scope: 'neighborhood', column: 'Sentiment',      direction: 'down', magnitudeRange: [0.02, 0.05] }
    ]
  },
  {
    name: 'pge_truck', displayName: 'PG&E truck',
    scopes: ['neighborhood', 'business'], baseFrequencyWeight: 0.7,
    textureOutcomes: [
      { outcome: 'planned_shutoff',        weight: 0.45, severity: 'low'  },
      { outcome: 'power_outage_restored',  weight: 0.30, severity: 'high',
        narrativeSeed: 'Lights flicker back after hours dark — relief, and the question of why it went out.' },
      { outcome: 'transformer_blowout',    weight: 0.25, severity: 'high',
        narrativeSeed: 'A transformer blows — a block goes dark, freezers thaw, registers go cold.' }
    ],
    metricImpacts: [
      { scope: 'neighborhood', column: 'Sentiment',      direction: 'down', magnitudeRange: [0.05, 0.15] },
      { scope: 'business',     column: 'Annual_Revenue', direction: 'down', magnitudeRange: [5, 15]       }
    ]
  }
];

/**
 * Return the full vehicle config array. NAMED loadChaosCarsConfig_ (NOT loadConfig_ —
 * that global is already taken by loadPreviousEvening/godWorldEngine2/applyCivicLoadIndicator;
 * Apps Script flat-namespace collision would silently override).
 */
function loadChaosCarsConfig_() {
  return VEHICLE_CONFIGS;
}

/**
 * Config-load-time validation (plan §Acceptance #4 + schema sanity). Throws on:
 *  - any forbidden outcome token (no-death floor)
 *  - per-vehicle texture weights that don't sum to ~1.0 (±0.001)
 *  - an empty scopes[] or textureOutcomes[]
 *  - a metricImpact column not in the known real-column set
 * @returns {true}
 */
function validateAllChaosConfigs_() {
  var KNOWN_COLUMNS = {
    'Sentiment': true, 'CrimeIndex': true, 'RetailVitality': true, 'EventAttractiveness': true,
    'Annual_Revenue': true, 'Employee_Count': true
  };
  for (var v = 0; v < VEHICLE_CONFIGS.length; v++) {
    var cfg = VEHICLE_CONFIGS[v];
    validateVehicleConfig(cfg);
    if (!isArrayChaos_(cfg.scopes) || cfg.scopes.length === 0) {
      throw new Error('chaos_cars: vehicle "' + cfg.name + '" has no scopes');
    }
    if (!isArrayChaos_(cfg.textureOutcomes) || cfg.textureOutcomes.length === 0) {
      throw new Error('chaos_cars: vehicle "' + cfg.name + '" has no textureOutcomes');
    }
    var sum = 0;
    for (var o = 0; o < cfg.textureOutcomes.length; o++) {
      sum += Number(cfg.textureOutcomes[o].weight) || 0;
    }
    if (Math.abs(sum - 1) > 0.001) {
      throw new Error('chaos_cars: vehicle "' + cfg.name + '" texture weights sum to ' + sum + ' (expected 1.0)');
    }
    var impacts = isArrayChaos_(cfg.metricImpacts) ? cfg.metricImpacts : [];
    for (var m = 0; m < impacts.length; m++) {
      if (!KNOWN_COLUMNS[impacts[m].column]) {
        throw new Error('chaos_cars: vehicle "' + cfg.name + '" metricImpact unknown column "' + impacts[m].column + '"');
      }
    }
    // B11 (S265 verify): a lifeHistoryTag must be a REAL DIAL_MAP key, else the citizen col-O
    // fold routes it to DEFAULT_AMBIENT (+composure) — inverting intended adversity. Checked
    // only when DIAL_MAP is in scope (Apps Script global, or Node test injects it); a typo'd
    // tag throws here at config-load rather than silently mis-folding every cycle.
    if (typeof DIAL_MAP !== 'undefined') {
      for (var t = 0; t < cfg.textureOutcomes.length; t++) {
        var tag = cfg.textureOutcomes[t].lifeHistoryTag;
        if (tag && !DIAL_MAP[tag]) {
          throw new Error('chaos_cars: vehicle "' + cfg.name + '" outcome "' + cfg.textureOutcomes[t].outcome +
            '" lifeHistoryTag "' + tag + '" is not a DIAL_MAP key (would fold to +composure).');
        }
      }
    }
  }
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// Node dual-runtime export. In Apps Script `module` is undefined → skipped, and
// the globals above are visible across concatenated files. In Node → require.
// ─────────────────────────────────────────────────────────────────────────────
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    FORBIDDEN_OUTCOMES: FORBIDDEN_OUTCOMES,
    validateOutcome: validateOutcome,
    validateVehicleConfig: validateVehicleConfig,
    VEHICLE_CONFIGS: VEHICLE_CONFIGS,
    loadChaosCarsConfig_: loadChaosCarsConfig_,
    validateAllChaosConfigs_: validateAllChaosConfigs_
  };
}
