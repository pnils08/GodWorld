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
 *    scopes             (optional) restrict the outcome to these of the vehicle's scopes;
 *                       absent = every scope the vehicle has (citizen still needs a tag)
 *    bizEvent           (business-eligible outcomes, required) signed Growth_Rate event in
 *                       units of bizEventShockScale, read by applyBusinessDynamics_ as the
 *                       chaos-at-business term (engine.193 cut 3b). 0 = nothing happened
 *                       (passed inspection, false alarm, power restored). Summed per business
 *                       per Cycle; the drift clamps the event term at +-2.
 *    peakPp / weeks     (port scope — the ship) the episode's Growth_Rate offset at peak (pp)
 *                       and its length in Cycles; start and end weeks run at half strength,
 *                       the week after releases it (start -> peak -> end -> aftermath).
 *  }
 *  metricImpacts[] {     SCOPE-KEYED (§S265) — applied by scope, not "pick one"
 *    scope              'neighborhood' only (citizen scope writes the col-O dial; business
 *                       scope carries its effect on the outcome's bizEvent — engine.193 cut 3b
 *                       retired the Annual_Revenue/Employee_Count cells, which overwrote the
 *                       dynamics revenue range and applied the same sign to every outcome)
 *    column             Neighborhood_Map: Sentiment/CrimeIndex/RetailVitality/EventAttractiveness
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
      { outcome: 'pulled_over_warning', weight: 0.20, severity: 'low',  lifeHistoryTag: 'Friction',             role: 'subject' }, // engine.201 ruling 5: chaos is never a calm day
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
      { outcome: 'false_alarm',           weight: 0.45, severity: 'low',  bizEvent: 0    },
      { outcome: 'minor_fire',            weight: 0.40, severity: 'low',  bizEvent: -0.5 },
      { outcome: 'major_blaze_contained', weight: 0.15, severity: 'high', bizEvent: -2,
        narrativeSeed: 'Smoke over the rooftops — a blaze contained, but the block smells it for days.' }
    ],
    metricImpacts: [
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
      { outcome: 'passed',                  weight: 0.50, severity: 'low',  bizEvent: 0     },
      { outcome: 'code_violation_cited',    weight: 0.30, severity: 'high', bizEvent: -0.75,
        narrativeSeed: 'A citation taped to the door — fines now, repairs the owner did not budget for.' },
      { outcome: 'forced_temporary_closure', weight: 0.20, severity: 'high', bizEvent: -2,
        narrativeSeed: 'Shuttered pending compliance — staff sent home, regulars turned away at the door.' }
    ],
    metricImpacts: []
  },
  {
    name: 'garbage_truck', displayName: 'Garbage truck',
    scopes: ['neighborhood', 'business'], baseFrequencyWeight: 1.1,
    textureOutcomes: [
      { outcome: 'dumping_cleared',        weight: 0.40, severity: 'low',  bizEvent: 0.25  },
      { outcome: 'missed_pickup',          weight: 0.40, severity: 'low',  bizEvent: -0.25 },
      { outcome: 'sanitation_strike_delay', weight: 0.20, severity: 'high', bizEvent: -0.75,
        narrativeSeed: 'Bags piling at the curb — a sanitation delay the whole block can smell.' }
    ],
    metricImpacts: [
      { scope: 'neighborhood', column: 'Sentiment',      direction: 'down', magnitudeRange: [0.04, 0.12] },
      { scope: 'neighborhood', column: 'RetailVitality', direction: 'down', magnitudeRange: [1, 3]      }
    ]
  },
  {
    name: 'mail_truck', displayName: 'Mail truck',
    scopes: ['citizen', 'business'], baseFrequencyWeight: 1.0,
    textureOutcomes: [
      { outcome: 'vital_document_delivered', weight: 0.50, severity: 'low',  lifeHistoryTag: 'Friction',   role: 'subject', scopes: ['citizen'] }, // engine.201 ruling 5: paperwork that demands a response
      { outcome: 'lost_package',             weight: 0.35, severity: 'low',  lifeHistoryTag: 'Setback',    role: 'victim',  scopes: ['citizen'] },
      { outcome: 'mail_theft_reported',      weight: 0.15, severity: 'high', lifeHistoryTag: 'Setback',    role: 'victim',  scopes: ['citizen'],
        narrativeSeed: 'Mailboxes pried open on the block — a theft reported, trust dented.' },
      // engine.193 cut 3b (builder 2026-09-26: "a business can get bad news from the mail") —
      // the business side, both ways. Lean negative like the fleet (bad 0.55 / good 0.45).
      { outcome: 'new_contract_letter',      weight: 0.25, severity: 'low',  scopes: ['business'], bizEvent: 1    },
      { outcome: 'overdue_payment_arrives',  weight: 0.20, severity: 'low',  scopes: ['business'], bizEvent: 0.5  },
      { outcome: 'insurance_premium_hike',   weight: 0.20, severity: 'low',  scopes: ['business'], bizEvent: -0.5 },
      { outcome: 'tax_audit_notice',         weight: 0.15, severity: 'high', scopes: ['business'], bizEvent: -0.75,
        narrativeSeed: 'An audit notice in the morning mail — the books come out, and the owner stops sleeping.' },
      { outcome: 'lawsuit_served',           weight: 0.10, severity: 'high', scopes: ['business'], bizEvent: -1,
        narrativeSeed: 'Papers served at the counter — a lawsuit, and lawyers the shop never budgeted for.' },
      { outcome: 'lost_contract_notice',     weight: 0.10, severity: 'high', scopes: ['business'], bizEvent: -1.25,
        narrativeSeed: 'A letter ends the biggest account on the books — the owner reads it twice before telling the staff.' }
    ],
    metricImpacts: []
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
      { outcome: 'traffic_jam',           weight: 0.25, severity: 'low', lifeHistoryTag: 'Friction',    role: 'subject' } // engine.201 ruling 5
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
      { outcome: 'planned_shutoff',        weight: 0.45, severity: 'low',  bizEvent: -0.25 },
      { outcome: 'power_outage_restored',  weight: 0.30, severity: 'high', bizEvent: 0,
        narrativeSeed: 'Lights flicker back after hours dark — relief, and the question of why it went out.' },
      { outcome: 'transformer_blowout',    weight: 0.25, severity: 'high', bizEvent: -1.25,
        narrativeSeed: 'A transformer blows — a block goes dark, freezers thaw, registers go cold.' }
    ],
    metricImpacts: [
      { scope: 'neighborhood', column: 'Sentiment',      direction: 'down', magnitudeRange: [0.05, 0.15] }
    ]
  },
  // engine.193 cut 3b (builder 2026-09-26): the ship — the one vehicle that reaches many
  // businesses at once, and the only one that lasts. EPISODIC: never drawn by the per-event
  // picker (weight 0); runChaosShip_ rolls it once a Cycle, only when no episode is running.
  // An episode moves Growth_Rate by peakPp at the Port + port-dependent sectors
  // (CHAOS_SHIP_PORT_SECTORS) and by chaosShipEchoShare of it everywhere else, and hands
  // every point back the week after it ends. Builder ruling S496: one ship is a felt,
  // bounded blow (~7% unemployment at the deepest); citywide hard times need bad luck to stack.
  {
    name: 'cargo_ship', displayName: 'Container ship',
    scopes: ['port'], baseFrequencyWeight: 0, episodic: true,
    textureOutcomes: [
      { outcome: 'cargo_surge',       weight: 0.30, severity: 'low',  peakPp: 4,   weeks: 3,
        narrativeSeed: 'The cranes run all night — a cargo surge, overtime at the terminals, trucks stacked down Maritime Street.' },
      { outcome: 'berth_delay',       weight: 0.30, severity: 'low',  peakPp: -3,  weeks: 1,
        narrativeSeed: 'Ships idle off the breakwater — a berth delay, and shelves across town wait on what is still at sea.' },
      { outcome: 'shipping_slowdown', weight: 0.25, severity: 'high', peakPp: -7,  weeks: 4,
        narrativeSeed: 'Fewer ships every week — a shipping slowdown the Port feels first and the corner stores feel next.' },
      { outcome: 'carrier_reroute',   weight: 0.15, severity: 'high', peakPp: -15, weeks: 8,
        narrativeSeed: 'A major carrier moves its calls to another port — the berths go quiet, and the whole waterfront economy holds its breath.' }
    ],
    metricImpacts: []
  }
];

// engine.193 cut 3b — who takes the ship at full strength (builder ruling S496: the Port,
// retail, food & beverage, construction). Matched on Business_Ledger Sector; the Port of
// Oakland is matched by sector 'Port & Logistics'. Everyone else takes the echo.
var CHAOS_SHIP_PORT_SECTORS = /port|logistic|retail|food|grocery|wholesale|manufactur|construction/i;

/**
 * Return the full vehicle config array. NAMED loadChaosCarsConfig_ (NOT loadConfig_ —
 * that global is already taken by loadPreviousEvening/godWorldEngine2/applyCivicLoadIndicator;
 * Apps Script flat-namespace collision would silently override).
 */
function loadChaosCarsConfig_() {
  return VEHICLE_CONFIGS;
}

/**
 * engine.193 cut 3b — the outcomes a vehicle can roll for a scope: every outcome with no
 * scopes[] of its own, plus those that name this scope. (Citizen additionally needs a
 * lifeHistoryTag — rollOutcome_ applies that.)
 */
function chaosOutcomePool_(vehicle, scope) {
  var out = [];
  var all = vehicle.textureOutcomes || [];
  for (var i = 0; i < all.length; i++) {
    if (all[i].scopes && all[i].scopes.indexOf(scope) < 0) continue;
    out.push(all[i]);
  }
  return out;
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
    'Sentiment': true, 'CrimeIndex': true, 'RetailVitality': true, 'EventAttractiveness': true
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
    // engine.193 cut 3b: weights sum to 1 per non-citizen scope POOL (an outcome's own
    // scopes[] restricts it). The citizen pool is gated by tag + life state and renormalized
    // at roll time, so it is not sum-checked (street_sweeper's is 0.6 by design).
    for (var o0 = 0; o0 < cfg.textureOutcomes.length; o0++) {
      var osc = cfg.textureOutcomes[o0].scopes;
      if (osc) for (var q = 0; q < osc.length; q++) {
        if (cfg.scopes.indexOf(osc[q]) < 0) {
          throw new Error('chaos_cars: vehicle "' + cfg.name + '" outcome "' + cfg.textureOutcomes[o0].outcome + '" scope "' + osc[q] + '" is not a vehicle scope');
        }
      }
    }
    for (var s = 0; s < cfg.scopes.length; s++) {
      var scope = cfg.scopes[s];
      if (scope === 'citizen') continue;
      var pool = chaosOutcomePool_(cfg, scope);
      var sum = 0;
      for (var o = 0; o < pool.length; o++) {
        sum += Number(pool[o].weight) || 0;
        if (scope === 'business' && !isFinite(Number(pool[o].bizEvent))) {
          throw new Error('chaos_cars: vehicle "' + cfg.name + '" business outcome "' + pool[o].outcome + '" has no numeric bizEvent');
        }
        if (scope === 'port' && (!isFinite(Number(pool[o].peakPp)) || !(Number(pool[o].weeks) >= 1))) {
          throw new Error('chaos_cars: vehicle "' + cfg.name + '" port outcome "' + pool[o].outcome + '" needs peakPp and weeks >= 1');
        }
      }
      if (Math.abs(sum - 1) > 0.001) {
        throw new Error('chaos_cars: vehicle "' + cfg.name + '" ' + scope + ' outcome weights sum to ' + sum + ' (expected 1.0)');
      }
    }
    var impacts = isArrayChaos_(cfg.metricImpacts) ? cfg.metricImpacts : [];
    for (var m = 0; m < impacts.length; m++) {
      if (impacts[m].scope !== 'neighborhood') {
        throw new Error('chaos_cars: vehicle "' + cfg.name + '" metricImpact scope "' + impacts[m].scope + '" — only neighborhood impacts write columns (business = bizEvent, engine.193)');
      }
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
    CHAOS_SHIP_PORT_SECTORS: CHAOS_SHIP_PORT_SECTORS,
    chaosOutcomePool_: chaosOutcomePool_,
    loadChaosCarsConfig_: loadChaosCarsConfig_,
    validateAllChaosConfigs_: validateAllChaosConfigs_
  };
}
