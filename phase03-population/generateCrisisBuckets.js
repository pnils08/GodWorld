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
  RESOLVED_RIPPLE: 0.02, ONSET_RIPPLE: 0.05
};

function generateCrisisBuckets_(ctx) {
  var S = ctx.summary || (ctx.summary = {});
  var cycle = S.absoluteCycle || S.cycleId || (ctx.config && ctx.config.cycleCount) || 0;
  var prev = S.previousCycleState || {};

  if (!S.auditIssues) S.auditIssues = [];
  S.eventArcs = S.eventArcs || [];
  S.worldEvents = S.worldEvents || [];

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
    arc.prevPhase = arc.phase;
    if (ch.count >= CRISIS_DETECT.ONSET_CHANNELS) {
      arc.consecutiveBad = (arc.consecutiveBad || 1) + 1;
      arc.tension = Math.min(10, 2 * ch.count + arc.consecutiveBad);
      var newPhase = arc.consecutiveBad >= 3 ? 'peak' : (arc.consecutiveBad === 2 ? 'rising' : 'early');
      if (newPhase !== arc.phase) {
        arc.phaseStartCycle = cycle;
        if (newPhase === 'peak') {
          emitRipple_(arc, 'crisis-peak', CRISIS_DETECT.ONSET_RIPPLE,
            arc.neighborhood + ' crisis at peak (' + arc.consecutiveBad + ' straight bad cycles): ' + ch.evidence.join('; '));
          queueAppendIntent_(ctx, 'Event_Arc_Ledger', ledgerRow_(arc, 'peak'), 'crisis arc peak', 'events');
        }
      }
      arc.phase = newPhase;
      arc.summary = arc.neighborhood + ' under strain: ' + ch.evidence.join('; ');
      arc.citizens = ch.citizens.length ? ch.citizens : (arc.citizens || []);
    } else if (ch.count === 1) {
      arc.tension = Math.round(arc.tension * 0.7 * 100) / 100;
      if (arc.tension < 3) { arc.phase = 'decline'; arc.phaseStartCycle = cycle; }
      arc.summary = arc.neighborhood + ' still strained: ' + ch.evidence.join('; ');
    } else {
      arc.tension = Math.round(arc.tension * 0.5 * 100) / 100;
      if (arc.phase === 'decline') {
        arc.phase = 'resolved';
        arc.cycleResolved = cycle;
        arc.summary = arc.neighborhood + ' crisis eased — conditions back within city range';
        emitRipple_(arc, 'crisis-resolved', CRISIS_DETECT.RESOLVED_RIPPLE, arc.summary);
        queueAppendIntent_(ctx, 'Event_Arc_Ledger', ledgerRow_(arc, 'resolved'), 'crisis arc resolved', 'events');
      } else {
        arc.phase = 'decline';
        arc.phaseStartCycle = cycle;
        arc.summary = arc.neighborhood + ' recovering — pressure lifting';
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
    var newArc = {
      arcId: 'CRISIS-' + cycle + '-' + hood.replace(/\s+/g, '').toUpperCase().slice(0, 8),
      type: 'crisis',
      phase: 'early',
      tension: Math.min(10, 2 * chk.count + 1),
      age: 0,
      neighborhood: hood,
      domainTag: domain,
      domain: domain,
      summary: hood + ' under strain: ' + chk.evidence.join('; '),
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
