/**
 * ============================================================================
 * generateCrisisBuckets_ v3.0 — CRISIS DETECTION (engine.71, S327)
 * ============================================================================
 *
 * DETECTION REPLACES INVENTION (ENGINE_REPAIR Row 28). v2.8 read ONE citywide
 * illnessRate, dice-picked a neighborhood, pool-picked a subtype label —
 * invented specificity with zero citizen attribution, feeding 9 in-cycle
 * S.eventArcs consumers. v3.0 inverts it: a crisis is a state a hood is
 * already in, detected when >=2 INDEPENDENT real channels go bad in the same
 * neighborhood. Citizens/businesses attach at detection from the channel
 * sources. Dice, subtype pools, cooldown throttles, and the MAX_NEW cap are
 * all deleted (SIM_DOCTRINE rule 1 — no hands on the output; rule 2 — causes,
 * then dice; rule 3 — the world is allowed to hurt).
 *
 * CHANNELS (per hood, per cycle):
 *   sentiment   S.neighborhoodState (prev-cycle Neighborhood_Map, engine.33) —
 *               z <= -1.5 vs city AND absolute <= 0.15  [live: mean .36 sd .10]
 *   retail      same source — z <= -1.5 AND absolute <= 5.0 [mean 8.4 sd 2.2]
 *   crime       crimeIndex >= 0.75 (bimodal 0-1 live) OR >=2 carried
 *               crimeSpikes in hood (previousCycleState, engine.45 T3b)
 *   hospital    >=2 prev-cycle hospitalEvents in hood (carried via
 *               finalizeCycleState v1.9 — Hospital_Ledger tab is lazy-created
 *               and absent until the first admission, so the carry is the
 *               reliable grain)
 *   weather     engine.70 salient storm/flood/heat hits this hood (same cycle,
 *               Phase 2)
 *   transit     engine.70 service-disruption touching this hood (same cycle)
 *   migration/  neighborhoodState migrationFlow <= -bar / housingPressure >=
 *   housing     bar — DEFENSIVE ONLY: both columns are 0-filled live today;
 *               the channels arm themselves when their writers populate.
 *
 * LIFECYCLE (mean-reversion physics, no age counters): arcs carry across
 * cycles on previousCycleState.crisisArcs (weatherFrontTracking pattern —
 * NOT the retired v3preLoader ledger load and its L236 clobber class).
 * >=2 channels active -> persists/escalates (early -> rising -> peak by
 * consecutive bad cycles); 1 -> tension bleeds; 0 -> decline -> resolved.
 * Zero crises is a normal cycle; three hoods at once is allowed.
 *
 * OUTPUT CONTRACTS PRESERVED: S.eventArcs arc shape (9 consumers untouched),
 * S.worldEvents event shape, S.auditIssues line. Event_Arc_Ledger gets audit
 * rows at onset/peak/resolved via intents. recordRipple_ causeType
 * 'crisis-event' at onset (0.05) + resolution (0.02).
 *
 * Bars are empirical (live C101 distributions above) and deliberately
 * conservative; first tuning pass rides observed live cycles (Mike rarity
 * target ~2-4 hood-crises per sim year).
 * Plan: docs/plans/2026-07-20-crisis-detection-rebuild.md
 * ============================================================================
 */

var CRISIS_DETECT = {
  SENTIMENT_Z: -1.5, SENTIMENT_ABS: 0.15,
  RETAIL_Z: -1.5, RETAIL_ABS: 5.0,
  // Groundhog C114 correction: absolute-only bars mass-fired on the bench
  // (crime 0.93-1.0 on five hoods; HousingPressure runs a ~0-10 scale there,
  // not the 0-1 the first bar assumed). Every stock channel is now
  // relative-AND-absolute — a hood only counts as exceptional when it stands
  // out from the city AND clears a floor. When half the city is at 1.0,
  // no hood is exceptional (city-wide pressure is a different story class).
  CRIME_Z: 1.5, CRIME_ABS: 0.75, CRIME_SPIKES_MIN: 2,
  HOSPITAL_CLUSTER_MIN: 2,
  MIGRATION_OUT_MIN: -30,      // defensive; column 0-filled on prod
  HOUSING_Z: 1.5,              // defensive; z-relative (scale differs bench vs prod)
  ONSET_CHANNELS: 2,
  // engine.186 (2026-09-10): resolution MIRRORS onset. It used to demand ZERO bad
  // channels on two consecutive cycles while onset fired at two — so a hood that
  // was chronically slightly-bad (one channel, the normal state of a real place)
  // could enter a crisis but never leave it. Measured on the live ledger before
  // this change: 36 of 38 arcs reached peak (95%), 1 reached resolved (3%), and
  // arcs oscillated peak<->decline ~6.6 times each instead of completing.
  // Three consecutive bad cycles make a peak; three consecutive cycles back under
  // the onset bar now close it.
  RESOLVE_CYCLES: 3,
  RESOLVED_RIPPLE: 0.02, ONSET_RIPPLE: 0.05
};


/**
 * ── CRISIS NAMING + THE REFERENCED LINK (engine.243) ────────────────────────
 * SIM_DOCTRINE §15 ends its chain on "can it be referenced afterwards as that
 * event." A detected arc carried an arcId (CRISIS-105-WESTOAKL) and a summary
 * rebuilt from scratch every cycle — nothing a citizen, a desk, or a later
 * cycle could ever name. This gives the arc ONE name at onset that never
 * changes, and a small city memory of the crises that ended.
 *
 * The name is DERIVED, never invented (engine.106 was filed because crisis arcs
 * once fed fabricated specificity to the desks). It reads only what the
 * detector already proved: the hood, and the single highest-priority channel
 * that fired. No dice — zero rng draws are added, so every downstream draw
 * keeps its position (engine.212 discipline). And no synthesized causation:
 * two channels firing in the same hood is CO-OCCURRENCE, not cause, so the name
 * comes from ONE channel and never welds two into a phenomenon the detector
 * never established ("Heat Sickness" would be a claim; "Heat Wave" is the
 * channel).
 */
var CRISIS_NAME_CHANNELS = [
  // order = naming priority: acute and physical before slow and diffuse.
  { key: 'heat',      match: 'heat wave hit',        noun: 'Heat Wave' },
  { key: 'flood',     match: 'flood conditions hit', noun: 'Flood' },
  { key: 'storm',     match: 'storm hit',            noun: 'Storm' },
  { key: 'hospital',  match: 'hospitalizations',     noun: 'Hospital Run' },
  { key: 'crime',     match: 'crime ',               noun: 'Crime Spike' },
  { key: 'transit',   match: 'transit disruption',   noun: 'Transit Snarl' },
  { key: 'retail',    match: 'retail vitality',      noun: 'Retail Slide' },
  { key: 'housing',   match: 'housing pressure',     noun: 'Housing Squeeze' },
  { key: 'migration', match: 'migration outflow',    noun: 'Outflow' },
  { key: 'sentiment', match: 'sentiment ',           noun: 'Hard Stretch' }
];

function crisisNameChannel_(evidence) {
  var joined = (evidence || []).join('|');
  for (var cni = 0; cni < CRISIS_NAME_CHANNELS.length; cni++) {
    if (joined.indexOf(CRISIS_NAME_CHANNELS[cni].match) >= 0) return CRISIS_NAME_CHANNELS[cni];
  }
  return null;
}

function crisisArcName_(hood, evidence) {
  var ch = crisisNameChannel_(evidence);
  if (!hood || !ch) return '';
  return 'The ' + hood + ' ' + ch.noun;
}

/** Prefix the arc's name onto whatever the lifecycle just wrote. One name, every phase. */
function crisisNamed_(arc, body) {
  return (arc && arc.name) ? arc.name + ' — ' + body : body;
}

/**
 * Peak and resolution used to emit a ripple and an Event_Arc_Ledger row and
 * nothing else — S.worldEvents only ever saw the ONSET, so the newsroom could
 * report a crisis starting and never report it peaking or ending. Same class as
 * the engine.187 shock-LIFTED line.
 *
 * subdomain 'crisis-lifecycle' is load-bearing: updateCrimeMetrics_ (engine.212)
 * runs next in Phase 3 and counts any SAFETY world event in a hood as a crime
 * CAUSE. A crisis ending must never push crime up, and a peak must not
 * double-count pressure the crime engine already reads from its own channels —
 * so updateCrimeMetrics_ skips this subdomain and live crime numbers are
 * unchanged by this cut.
 */
function pushCrisisLifecycleEvent_(ctx, arc, stage, description, severity, cycle) {
  var S = ctx.summary;
  S.worldEvents = S.worldEvents || [];
  S.worldEvents.push({
    cycle: cycle,
    domain: arc.domainTag || arc.domain || 'CIVIC',
    subdomain: 'crisis-lifecycle',
    stage: stage,
    arcId: arc.arcId,
    arcName: arc.name || '',
    neighborhood: arc.neighborhood,
    severity: severity,
    description: description,
    impactScore: severity === 'high' ? 40 : severity === 'medium' ? 25 : 10,
    source: 'DETECTED',
    timestamp: ctx.now
  });
  S.eventsGenerated = (S.eventsGenerated || 0) + 1;
}

/**
 * The city's memory of crises that ENDED. Capped small and city-wide (not per
 * hood) because it rides previousCycleState into the 9KB PropertiesService
 * budget. Live onset rate is ~1 in 6 cycles, so six entries is years of city
 * memory, not a rolling window.
 */
var CRISIS_MEMORY_CAP = 6;

function rememberCrisis_(S, arc, cycle) {
  if (!arc || !arc.name) return;
  S.crisisMemory = S.crisisMemory || [];
  S.crisisMemory.unshift({
    name: arc.name,
    hood: arc.neighborhood,
    channel: arc.nameChannel || '',
    cycle: cycle,
    cycleRef: S.cycleRef || ('C' + cycle)
  });
  if (S.crisisMemory.length > CRISIS_MEMORY_CAP) S.crisisMemory.length = CRISIS_MEMORY_CAP;
}

/** Most recent remembered crisis in this hood, or null. */
function lastCrisisIn_(S, hood) {
  var mem = (S && S.crisisMemory) || [];
  for (var mi = 0; mi < mem.length; mi++) if (mem[mi].hood === hood) return mem[mi];
  return null;
}

function generateCrisisBuckets_(ctx) {
  var S = ctx.summary || (ctx.summary = {});
  var cycle = S.absoluteCycle || S.cycleId || (ctx.config && ctx.config.cycleCount) || 0;
  var prev = S.previousCycleState || {};

  if (!S.auditIssues) S.auditIssues = [];
  S.eventArcs = S.eventArcs || [];
  S.worldEvents = S.worldEvents || [];
  // engine.243: the city's memory of ended crises, carried on previousCycleState.
  S.crisisMemory = S.crisisMemory || (prev.crisisMemory || []).slice();

  // ── channel state per hood ────────────────────────────────────────────────
  var nbState = S.neighborhoodState || {};
  var hoods = [];
  var sentVals = [], retailVals = [], crimeVals = [], hpVals = [];
  for (var h in nbState) {
    if (!nbState.hasOwnProperty(h)) continue;
    hoods.push(h);
    sentVals.push(Number(nbState[h].sentiment) || 0);
    retailVals.push(Number(nbState[h].retailVitality) || 0);
    crimeVals.push(Number(nbState[h].crimeIndex) || 0);
    hpVals.push(Number(nbState[h].housingPressure) || 0);
  }
  if (!hoods.length) {
    Logger.log('generateCrisisBuckets_ v3.0: no neighborhoodState — detector idle this cycle');
    return;
  }
  function meanSd_(a) {
    var m = 0, i;
    for (i = 0; i < a.length; i++) m += a[i];
    m /= a.length;
    var v = 0;
    for (i = 0; i < a.length; i++) v += (a[i] - m) * (a[i] - m);
    return { mean: m, sd: Math.sqrt(v / a.length) || 1e-9 };
  }
  var sentStat = meanSd_(sentVals);
  var retailStat = meanSd_(retailVals);
  var crimeStat = meanSd_(crimeVals);
  var hpStat = meanSd_(hpVals);

  // carried crime spikes per hood (engine.45 T3b snapshot channel)
  var spikesByHood = {};
  var cs = prev.crimeSpikes || [];
  for (var ci = 0; ci < cs.length; ci++) {
    var csh = cs[ci] && cs[ci].neighborhood;
    if (csh) spikesByHood[csh] = (spikesByHood[csh] || 0) + 1;
  }
  // carried hospital events per hood (engine.71 snapshot channel)
  var hospByHood = {}, hospPopsByHood = {};
  var he = prev.hospitalEvents || [];
  for (var hi = 0; hi < he.length; hi++) {
    var heh = he[hi] && he[hi].neighborhood;
    if (!heh) continue;
    hospByHood[heh] = (hospByHood[heh] || 0) + 1;
    if (!hospPopsByHood[heh]) hospPopsByHood[heh] = [];
    if (he[hi].popId) hospPopsByHood[heh].push(String(he[hi].popId));
  }
  // engine.70 same-cycle events
  var weatherHitByHood = {}, weatherTypeByHood = {};
  var wev = S.weatherEvents || [];
  for (var wi = 0; wi < wev.length; wi++) {
    if (!wev[wi].salient || !wev[wi].hoods) continue;
    for (var wh = 0; wh < wev[wi].hoods.length; wh++) {
      weatherHitByHood[wev[wi].hoods[wh]] = true;
      weatherTypeByHood[wev[wi].hoods[wh]] = wev[wi].type;
    }
  }
  var transitHoods = {};
  if (S.transitState && S.transitState.disruptionOngoing) {
    var th = S.transitState.affectedHoods || [];
    for (var ti = 0; ti < th.length; ti++) transitHoods[th[ti]] = true;
  }

  // evaluate channels for one hood → { count, evidence[], citizens[] }
  function evalChannels_(hood) {
    var st = nbState[hood] || {};
    var active = [], citizens = [];
    var sent = Number(st.sentiment) || 0;
    var sentZ = (sent - sentStat.mean) / sentStat.sd;
    if (sentZ <= CRISIS_DETECT.SENTIMENT_Z && sent <= CRISIS_DETECT.SENTIMENT_ABS) {
      active.push('sentiment ' + sent.toFixed(2) + ' (city ' + sentStat.mean.toFixed(2) + ')');
    }
    var retail = Number(st.retailVitality) || 0;
    var retailZ = (retail - retailStat.mean) / retailStat.sd;
    if (retailZ <= CRISIS_DETECT.RETAIL_Z && retail <= CRISIS_DETECT.RETAIL_ABS) {
      active.push('retail vitality ' + retail.toFixed(1) + ' (city ' + retailStat.mean.toFixed(1) + ')');
    }
    var crime = Number(st.crimeIndex) || 0;
    var crimeZ = (crime - crimeStat.mean) / crimeStat.sd;
    var crimeExceptional = crime >= CRISIS_DETECT.CRIME_ABS && crimeZ >= CRISIS_DETECT.CRIME_Z;
    if (crimeExceptional || (spikesByHood[hood] || 0) >= CRISIS_DETECT.CRIME_SPIKES_MIN) {
      active.push('crime ' + (crimeExceptional ? 'index ' + crime.toFixed(2) + ' (city ' + crimeStat.mean.toFixed(2) + ')' : (spikesByHood[hood] || 0) + ' spikes last cycle'));
    }
    if ((hospByHood[hood] || 0) >= CRISIS_DETECT.HOSPITAL_CLUSTER_MIN) {
      active.push((hospByHood[hood]) + ' hospitalizations last cycle');
      citizens = citizens.concat(hospPopsByHood[hood] || []);
    }
    if (weatherHitByHood[hood]) {
      active.push(String(weatherTypeByHood[hood]).replace(/_/g, ' ') + ' hit');
    }
    if (transitHoods[hood]) {
      active.push('transit disruption');
    }
    var migFlow = Number(st.migrationFlow) || 0;
    if (migFlow <= CRISIS_DETECT.MIGRATION_OUT_MIN) active.push('migration outflow ' + migFlow);
    var hp = Number(st.housingPressure) || 0;
    var hpZ = (hp - hpStat.mean) / hpStat.sd;
    if (hp > 0 && hpZ >= CRISIS_DETECT.HOUSING_Z) {
      active.push('housing pressure ' + hp.toFixed(2) + ' (city ' + hpStat.mean.toFixed(2) + ')');
    }
    return { count: active.length, evidence: active, citizens: citizens };
  }

  // domain for the desk: dominant evidence class
  function domainFor_(evidence) {
    var joined = evidence.join('|');
    if (joined.indexOf('hospitalizations') >= 0 || joined.indexOf('heat wave') >= 0) return 'HEALTH';
    if (joined.indexOf('crime') >= 0) return 'SAFETY';
    if (joined.indexOf('storm') >= 0 || joined.indexOf('flood') >= 0 || joined.indexOf('transit') >= 0) return 'INFRASTRUCTURE';
    if (joined.indexOf('retail') >= 0) return 'ECONOMIC';
    return 'CIVIC';
  }

  function ledgerRow_(arc, note) {
    // Event_Arc_Ledger audit row — matches the live 32-col header (fossil tab,
    // C70-81 rows untouched per doctrine rule 8). Blanks for retired cols.
    return [
      rippleStamp_(), cycle, arc.arcId, arc.type, arc.phase, arc.tension,
      arc.neighborhood, arc.domainTag, arc.summary, (arc.citizens || []).length,
      arc.cycleCreated, arc.cycleResolved || '', '', S.holiday || 'none',
      S.holidayPriority || 'none', !!S.isFirstFriday, !!S.isCreationDay,
      S.sportsSeason || '', note || '', '', arc.phase === 'resolved' ? 'natural' : '',
      arc.phase === 'resolved' ? cycle : '', arc.prevPhase || '', '', arc.phaseStartCycle || '',
      '', '', '', '', '', note || '', ''
    ];
  }
  function rippleStamp_() {
    return (typeof inWorldStamp_ === 'function') ? inWorldStamp_(ctx) : (S.cycleRef || '');
  }
  function emitRipple_(arc, effectType, magnitude, detail) {
    if (typeof recordRipple_ !== 'function') return;
    recordRipple_(ctx, {
      causeType: 'crisis-event',
      causeId: arc.arcId,
      causeDetail: detail,
      effectType: effectType,
      targetScope: 'neighborhood',
      targetIds: [arc.neighborhood],
      neighborhood: arc.neighborhood,
      magnitude: magnitude,
      duration: 1,
      sourceEngine: 'generateCrisisBuckets'
    });
  }

  // ── lifecycle: re-evaluate carried arcs ───────────────────────────────────
  var carried = prev.crisisArcs || [];
  var liveArcs = [];
  var carriedHoods = {};
  for (var ai = 0; ai < carried.length; ai++) {
    var arc = carried[ai];
    if (!arc || !arc.neighborhood) continue;
    carriedHoods[arc.neighborhood] = true;
    var ch = evalChannels_(arc.neighborhood);
    // engine.243: an arc already in flight when naming shipped carried no name,
    // and would have run its whole life anonymous. Name it on the first
    // evaluation that can derive one — from its OWN carried summary first, which
    // still holds the evidence it was detected on, so a hospital crisis in
    // recovery is not renamed after whichever channel happens to be last active.
    if (!arc.name) {
      var nameSrc = arc.summary ? [String(arc.summary)] : ch.evidence;
      var backfill = crisisNameChannel_(nameSrc) ? nameSrc : ch.evidence;
      var bfCh = crisisNameChannel_(backfill);
      if (bfCh) {
        arc.name = crisisArcName_(arc.neighborhood, backfill);
        arc.nameChannel = bfCh.key;
      }
    }
    arc.prevPhase = arc.phase;
    if (ch.count >= CRISIS_DETECT.ONSET_CHANNELS) {
      arc.consecutiveBad = (arc.consecutiveBad || 1) + 1;
      arc.consecutiveGood = 0;                       // engine.186: a bad cycle restarts recovery
      arc.tension = Math.min(10, 2 * ch.count + arc.consecutiveBad);
      var newPhase = arc.consecutiveBad >= 3 ? 'peak' : (arc.consecutiveBad === 2 ? 'rising' : 'early');
      if (newPhase !== arc.phase) {
        arc.phaseStartCycle = cycle;
        if (newPhase === 'peak') {
          var peakLine = crisisNamed_(arc, arc.neighborhood + ' crisis at peak (' +
            arc.consecutiveBad + ' straight bad cycles): ' + ch.evidence.join('; '));
          emitRipple_(arc, 'crisis-peak', CRISIS_DETECT.ONSET_RIPPLE, peakLine);
          queueAppendIntent_(ctx, 'Event_Arc_Ledger', ledgerRow_(arc, 'peak'), 'crisis arc peak', 'events');
          // engine.243: the peak reaches the newsroom, not just the ledger.
          pushCrisisLifecycleEvent_(ctx, arc, 'peak', peakLine,
            ch.count >= 4 ? 'high' : 'medium', cycle);
        }
      }
      arc.phase = newPhase;
      arc.summary = crisisNamed_(arc, arc.neighborhood + ' under strain: ' + ch.evidence.join('; '));
      arc.citizens = ch.citizens.length ? ch.citizens : (arc.citizens || []);
    } else {
      // engine.186: BELOW the onset bar is recovery, whether that is one channel
      // or none. Tension still bleeds at the old two rates so a fully-clear cycle
      // recovers faster than a lingering one, but both now COUNT toward closing.
      arc.consecutiveGood = (arc.consecutiveGood || 0) + 1;
      arc.consecutiveBad = 0;
      arc.tension = Math.round(arc.tension * (ch.count === 1 ? 0.7 : 0.5) * 100) / 100;

      if (arc.consecutiveGood >= CRISIS_DETECT.RESOLVE_CYCLES) {
        arc.phase = 'resolved';
        arc.cycleResolved = cycle;
        arc.summary = crisisNamed_(arc, arc.neighborhood + ' crisis eased after ' +
          arc.consecutiveGood + ' cycles back within city range');
        emitRipple_(arc, 'crisis-resolved', CRISIS_DETECT.RESOLVED_RIPPLE, arc.summary);
        queueAppendIntent_(ctx, 'Event_Arc_Ledger', ledgerRow_(arc, 'resolved'), 'crisis arc resolved', 'events');
        // engine.243: an ending the desks can cover, and a name the city keeps.
        pushCrisisLifecycleEvent_(ctx, arc, 'resolved', arc.summary, 'low', cycle);
        rememberCrisis_(S, arc, cycle);
      } else {
        if (arc.phase !== 'decline') arc.phaseStartCycle = cycle;
        arc.phase = 'decline';
        arc.summary = crisisNamed_(arc, ch.count === 1
          ? arc.neighborhood + ' easing but still strained: ' + ch.evidence.join('; ')
          : arc.neighborhood + ' recovering — pressure lifting');
      }
    }
    S.eventArcs.push(arc);
    if (arc.phase !== 'resolved') liveArcs.push(arc);
  }

  // ── detection: new onsets ─────────────────────────────────────────────────
  for (var hj = 0; hj < hoods.length; hj++) {
    var hood = hoods[hj];
    if (carriedHoods[hood]) continue; // one arc per hood; persistence handles it
    var chk = evalChannels_(hood);
    if (chk.count < CRISIS_DETECT.ONSET_CHANNELS) continue;

    var domain = domainFor_(chk.evidence);
    var severity = chk.count >= 4 ? 'high' : chk.count === 3 ? 'medium' : 'low';
    // engine.243: one name, minted at onset from the dominant detected channel,
    // and the city's last crisis here if it remembers one.
    var nameChannel = crisisNameChannel_(chk.evidence);
    var arcName = crisisArcName_(hood, chk.evidence);
    var priorHere = lastCrisisIn_(S, hood);
    var onsetBody = hood + ' under strain: ' + chk.evidence.join('; ') +
      (priorHere ? ' — first crisis here since ' + priorHere.name + ' (' + priorHere.cycleRef + ')' : '');
    var newArc = {
      arcId: 'CRISIS-' + cycle + '-' + hood.replace(/\s+/g, '').toUpperCase().slice(0, 8),
      type: 'crisis',
      phase: 'early',
      tension: Math.min(10, 2 * chk.count + 1),
      age: 0,
      neighborhood: hood,
      domainTag: domain,
      domain: domain,
      name: arcName,
      nameChannel: nameChannel ? nameChannel.key : '',
      summary: arcName ? arcName + ' — ' + onsetBody : onsetBody,
      subtype: chk.evidence[0],
      citizens: chk.citizens,
      consecutiveBad: 1,
      cycleCreated: cycle,
      cycleResolved: null,
      phaseStartCycle: cycle,
      source: 'DETECTED',
      resolutionConditions: getResolutionConditions_(domain),
      holidayContext: (S.holiday && S.holiday !== 'none') ? S.holiday : null,
      seasonContext: S.season
    };
    S.eventArcs.push(newArc);
    liveArcs.push(newArc);

    S.auditIssues.push(domain + ' – detected crisis – ' + hood + ' – ' + severity);
    S.worldEvents.push({
      cycle: cycle,
      domain: domain,
      subdomain: 'neighborhood-crisis',
      neighborhood: hood,
      severity: severity,
      description: newArc.summary,
      impactScore: severity === 'high' ? 50 : severity === 'medium' ? 30 : 15,
      source: 'DETECTED',
      timestamp: ctx.now
    });
    S.eventsGenerated = (S.eventsGenerated || 0) + 1;

    emitRipple_(newArc, 'crisis-onset', CRISIS_DETECT.ONSET_RIPPLE, newArc.summary +
      (chk.citizens.length ? ' — ' + chk.citizens.join(', ') + ' among the affected' : ''));
    queueAppendIntent_(ctx, 'Event_Arc_Ledger', ledgerRow_(newArc, 'onset'), 'crisis arc onset', 'events');
  }

  // carry surface for finalizeCycleState (compactCrisisArcs_ v1.9)
  S.crisisArcsActive = liveArcs;
  // engine.243: named crises the city still remembers, carried for the next cycle.
  S.crisisMemoryActive = S.crisisMemory;

  Logger.log('generateCrisisBuckets_ v3.0: ' + liveArcs.length + ' active crisis arc(s)' +
    (carried.length ? ' (' + carried.length + ' carried in)' : '') + ' | cycle ' + cycle);
  ctx.summary = S;
}

/**
 * Resolution-condition prose per domain (v2.6 shape, retained — consumers
 * render it in neighborhood packets).
 */
function getResolutionConditions_(category) {
  var conditions = {
    'HEALTH': { naturalResolution: 'hospitalization cluster clears', timeToResolve: '3-6 cycles', accelerators: ['improved weather', 'treatment rollout'] },
    'ECONOMIC': { naturalResolution: 'retail vitality returns to city range', timeToResolve: '4-8 cycles', accelerators: ['new investment', 'holiday shopping'] },
    'CIVIC': { naturalResolution: 'conditions return to city range', timeToResolve: '5-10 cycles', accelerators: ['housing availability', 'community programs'] },
    'INFRASTRUCTURE': { naturalResolution: 'weather/transit normalize', timeToResolve: '2-4 cycles', accelerators: ['weather improvement', 'repair completion'] },
    'SAFETY': { naturalResolution: 'crime pressure subsides', timeToResolve: '3-5 cycles', accelerators: ['community engagement', 'patrols'] },
    'ENVIRONMENT': { naturalResolution: 'weather normalizes', timeToResolve: '2-5 cycles', accelerators: ['rain', 'cleanup efforts'] }
  };
  return conditions[category] || { naturalResolution: 'conditions improve', timeToResolve: '4-8 cycles', accelerators: [] };
}
