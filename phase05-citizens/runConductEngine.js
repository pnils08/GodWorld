/**
 * ============================================================================
 * Conduct Engine v1.0 (engine.32 T7 — the moral-test engine)
 * ============================================================================
 *
 * The 5th memory category. Before this engine, the city carried a
 * Crime_Metrics RATE but not one tracked citizen ever committed a crime —
 * every one of ~900 lives was, mechanically, clean.
 *
 * At a low base rate, an eligible citizen draws a MORAL TEST that resolves —
 * dial-biased — as either a transgression (severity ladder: Petty -> Serious
 * -> Grave) or a Resisted (tempted, didn't — accretes integrity).
 *
 * Emits against the TAG_REGISTRY Conduct vocab already wired in
 * citizenDialMap.js DIAL_MAP:
 *   Transgression-Petty   { integrity: -4 }
 *   Transgression-Serious { integrity: -8,  composure: -2 }
 *   Transgression-Grave   { integrity: -12, composure: -3 }
 *   Resisted              { integrity: +5 }
 * engine.31's bounded-memory engine receives these; a SUSTAINED pattern
 * promotes toward a dark core while the bound keeps a single petty act
 * from damning anyone.
 *
 * Dial biasing (the T5 back-arc pointed at the dark side):
 * - crimeReachable gates COMMIT. The engine.31 accessor contract
 *   (compressLifeHistory.js ~L800: bandIndex <= 0) makes ONLY band -2
 *   (raw integrity < 20) reachable today — everyone else draws tests but
 *   always resists. "No one is safe" arrives via drift to far-low, not via
 *   dice. The commitP formula below is band-generic: if engine.31 ever
 *   widens the contract, the -1 rung opens automatically at .55.
 * - Deeper negative integrity -> higher commit odds + deeper severity.
 * - Low composure -> slightly more tests (stress invites temptation) and
 *   deeper severity on commit.
 *
 * Population counterweight (RimWorld adaptation-factor, research4_1.md:211):
 * when Crime_Metrics cityWide spikes, the engine leans POSITIVE — fewer
 * tests, higher resist odds — a real city's resilience. Without it the
 * moral momentum could cascade the whole tracked cohort dark.
 *
 * INERT PRE-DEPLOY: requires DialState (ledger COPY only until the engine.31
 * deploy) — null bands -> citizen skipped entirely. Live behavior unchanged.
 *
 * ============================================================================
 */

function runConductEngine_(ctx) {

  // Phase 42 §5.6: read/mutate via shared ctx.ledger; commit handled in Phase 10.
  if (!ctx.ledger) {
    throw new Error('runConductEngine_: ctx.ledger not initialized');
  }
  var header = ctx.ledger.headers;
  var rows = ctx.ledger.rows;
  if (!rows.length) return;

  var idx = function(n) { return header.indexOf(n); };

  var iPopID = idx('POPID');
  var iFirst = idx('First');
  var iLast = idx('Last');
  var iTier = idx('Tier');
  var iClock = idx('ClockMode');
  var iUNI = idx('UNI (y/n)');
  var iMED = idx('MED (y/n)');
  var iCIV = idx('CIV (y/n)');
  var iLife = idx('LifeHistory');
  var iLastUpd = idx('LastUpdated');
  var iNeighborhood = idx('Neighborhood');
  var iBirthYear = idx('BirthYear');
  var iDialState = idx('DialState');

  var S = ctx.summary;
  var econMood = S.economicMood || 50;
  var cycle = S.absoluteCycle || S.cycleId || ctx.config.cycleCount || 0;
  var simYear = 2041;

  var cRng = safeRand_(ctx);
  var count = 0;
  var LIMIT = 3; // resolved moral tests per cycle (committed OR resisted)

  // ═══════════════════════════════════════════════════════════════════════════
  // POPULATION COUNTERWEIGHT — read citywide crime pressure (Phase 3 output)
  // ═══════════════════════════════════════════════════════════════════════════
  var cw = (S.crimeMetrics && S.crimeMetrics.cityWide) || {};
  var crimePressure = ((cw.avgPropertyCrime || 50) + (cw.avgViolentCrime || 50)) / 2;
  var spike = crimePressure >= 60;

  // ═══════════════════════════════════════════════════════════════════════════
  // TEXT POOLS — mundane moral tests, prosperity-era Oakland scale.
  // Grave stays rare by the severity ladder, not by pool size.
  // ═══════════════════════════════════════════════════════════════════════════
  var pettyPool = [
    "kept the extra change a cashier handed over by mistake",
    "took credit for a coworker's idea in a small meeting",
    "slipped a paperback into their bag without paying",
    "fudged a number on a reimbursement form",
    "let a friend cover a shared bill and never settled up",
    "took home office supplies that weren't theirs",
    "lied about plans to dodge a commitment they'd made",
    "rode transit on an expired pass and shrugged it off"
  ];

  var seriousPool = [
    "padded an expense report over several weeks",
    "pocketed merchandise from a local shop",
    "forged a signature to push a personal claim through",
    "siphoned small amounts from a shared fund",
    "sold a borrowed item and denied ever having it",
    "took a package from a neighbor's doorstep"
  ];

  var gravePool = [
    "moved money out of an employer's accounts and covered the trail",
    "broke into a storage unit and took what they could carry",
    "got into a confrontation that left someone hurt",
    "ran a small fraud on online buyers before going quiet"
  ];

  var resistPool = [
    "found a wallet full of cash and turned it in untouched",
    "was offered an under-the-table cut and walked away",
    "noticed a billing error in their favor and reported it",
    "had every chance to take credit for someone's work and didn't",
    "returned extra change a cashier handed over by mistake",
    "had access to a shared fund no one audited and left it whole",
    "talked a friend out of a bad idea instead of joining in",
    "found a phone on a bench and tracked down its owner"
  ];

  // Track for summary
  var conductEvents = [];

  // ═══════════════════════════════════════════════════════════════════════════
  // ITERATE CITIZENS
  // ═══════════════════════════════════════════════════════════════════════════
  for (var r = 0; r < rows.length; r++) {

    if (count >= LIMIT) break;

    var row = rows[r];

    var tier = Number(row[iTier] || 0);
    var mode = (row[iClock] || "").toString().trim();
    var isUNI = (row[iUNI] || "").toString().toLowerCase().startsWith("y");
    var isMED = (row[iMED] || "").toString().toLowerCase().startsWith("y");
    var isCIV = (row[iCIV] || "").toString().toLowerCase().startsWith("y");
    var neighborhood = iNeighborhood >= 0 ? (row[iNeighborhood] || '') : '';

    // Eligibility: Tier-3/4 background ENGINE citizens, adults only
    if (mode !== "ENGINE") continue;
    if (tier !== 3 && tier !== 4) continue;
    if (isUNI || isMED || isCIV) continue;
    var birthYear = Number(row[iBirthYear] || 0);
    if (birthYear > 0 && (simYear - birthYear) < 16) continue;

    // Dial bands REQUIRED — the moral test is R-biased by definition, and
    // this keeps the engine inert until DialState deploys (copy-track).
    var popId = (row[iPopID] || "").toString();
    var dialBands = getCitizenDialBands_(ctx, popId, iDialState >= 0 ? (row[iDialState] || "") : "");
    if (!dialBands) continue;

    // ═══════════════════════════════════════════════════════════════════════
    // DOES A MORAL TEST FIRE?
    // ═══════════════════════════════════════════════════════════════════════
    var chance = 0.012;

    // Stress invites temptation
    if (dialBands.bands.composure <= -1) chance *= 1.25;
    if (econMood <= 35) chance *= 1.2;

    // Counterweight: under citywide pressure the engine leans positive —
    // fewer tests fire at all
    if (spike) chance *= 0.7;

    // Cap
    if (chance > 0.03) chance = 0.03;

    if (cRng() >= chance) continue;

    // ═══════════════════════════════════════════════════════════════════════
    // RESOLVE — commit vs resist, integrity-band biased
    // ═══════════════════════════════════════════════════════════════════════
    var intBand = dialBands.bands.integrity;
    var commitP = 0;
    if (dialBands.crimeReachable) {
      // band-generic ladder: -1 -> 0.55, -2 -> 0.75. Today only -2 is
      // reachable (accessor contract); the -1 rung is dormant, not dead.
      commitP = 0.35 + (-intBand * 0.20);
      // Counterweight: resilience under citywide pressure
      if (spike) commitP *= 0.6;
    }

    var committed = cRng() < commitP;
    var eventTag, pick;

    if (!committed) {
      eventTag = "Resisted";
      pick = resistPool[Math.floor(cRng() * resistPool.length)];
    } else {
      // Severity ladder — deeper negative integrity -> deeper severity;
      // low composure shifts further down.
      var graveP = 0.02, seriousP = 0.15;
      if (intBand <= -1) { graveP = 0.05; seriousP = 0.30; }
      if (intBand <= -2) { graveP = 0.10; seriousP = 0.45; }
      if (dialBands.bands.composure <= -1) { seriousP += 0.05; }

      var sevRoll = cRng();
      if (sevRoll < graveP) {
        eventTag = "Transgression-Grave";
        pick = gravePool[Math.floor(cRng() * gravePool.length)];
      } else if (sevRoll < graveP + seriousP) {
        eventTag = "Transgression-Serious";
        pick = seriousPool[Math.floor(cRng() * seriousPool.length)];
      } else {
        eventTag = "Transgression-Petty";
        pick = pettyPool[Math.floor(cRng() * pettyPool.length)];
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // LOG — same write path as the other Phase 5 life engines
    // ═══════════════════════════════════════════════════════════════════════
    var stamp = Utilities.formatDate(ctx.now, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm");
    var line = stamp + " — [" + eventTag + "] " + pick;
    var existing = row[iLife] ? row[iLife].toString() : "";

    row[iLife] = existing ? existing + "\n" + line : line;
    row[iLastUpd] = ctx.now;

    queueAppendIntent_(
      ctx,
      'LifeHistory_Log',
      [
        ctx.now,
        row[iPopID],
        ((row[iFirst] || '') + ' ' + (row[iLast] || '')).trim(),
        eventTag,
        pick,
        neighborhood,
        cycle
      ],
      'conduct event',
      'citizens'
    );

    conductEvents.push({
      citizen: ((row[iFirst] || '') + " " + (row[iLast] || '')).trim(),
      neighborhood: neighborhood,
      event: pick,
      tag: eventTag,
      committed: committed
    });

    rows[r] = row;
    count++;
    S.eventsGenerated = (S.eventsGenerated || 0) + 1;

    // engine.33 — emit-time neighborhood pulse. Resolved tests only (this is
    // the write path); Transgression-* raise local crime, Resisted lowers it.
    if (typeof recordPulse_ === 'function') recordPulse_(S, neighborhood, eventTag, null, pick);
  }

  // Phase 42 §5.6: flip ctx.ledger.dirty; consolidated commit at Phase 10.
  if (conductEvents.length > 0) ctx.ledger.dirty = true;

  S.conductEvents = conductEvents;
  ctx.summary = S;
}


/**
 * ============================================================================
 * CONDUCT EVENT REFERENCE
 * ============================================================================
 *
 * Event Tags (exact DIAL_MAP keys — do not rename without truing
 * utilities/citizenDialMap.js + docs/engine/TAG_REGISTRY.md):
 * - Resisted: tempted, didn't — integrity accretes (+5)
 * - Transgression-Petty: kept-the-change scale (integrity -4)
 * - Transgression-Serious: sustained/deliberate (integrity -8, composure -2)
 * - Transgression-Grave: rare, life-bending (integrity -12, composure -3)
 *
 * Tuning knobs (v1.0):
 * - base test rate 0.012/citizen/cycle, cap 0.03, LIMIT 3 resolutions/cycle
 * - commit odds: only band -2 reachable today (accessor) -> .75; the .55
 *   -1 rung is dormant pending any engine.31 contract widening
 * - severity by band: grave .02/.05/.10, serious .15/.30/.45 (+.05 low composure)
 * - counterweight at crimePressure>=60: tests ×0.7, commit ×0.6
 *
 * The dark loop: commit -> integrity drops -> deeper band -> higher commit
 * odds next test (bad begets bad), BOUNDED by engine.31's promotion ladder
 * (single petty act decays; only sustained patterns promote to a dark core)
 * + the citywide counterweight (no cohort-wide darkening on a metrics spike).
 *
 * ============================================================================
 */
