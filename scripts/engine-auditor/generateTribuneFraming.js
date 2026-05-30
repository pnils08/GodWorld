/**
 * generateTribuneFraming (Phase 38.4) — translates each ailment + remedy into
 * per-desk story handles threading the three coverage layers. Mutates
 * patterns[] in place. Adds `tribuneFraming` field per §16.2.
 */

const VERSION = '1.0.0';

const DESK_BY_CATEGORY = {
  health: ['civic', 'culture', 'letters'],
  safety: ['civic', 'letters'],
  transit: ['civic', 'business', 'letters'],
  economic: ['business', 'civic', 'letters'],
  housing: ['civic', 'business', 'culture', 'letters'],
  culture: ['culture', 'letters'],
  sports: ['sports', 'business'],
};

function deskHandlesFor(category, pattern) {
  const applicable = DESK_BY_CATEGORY[category] || ['civic', 'letters'];
  const ms = pattern.mitigatorState || {};
  const firstMit = (ms.mitigators && ms.mitigators[0]) || {};
  const nbhds = pattern.affectedEntities.neighborhoods || [];
  const primary = nbhds[0] || null;
  const initiativeId = firstMit.initiativeId || null;
  const initiativeName = firstMit.name || null;
  const phase = firstMit.implementationPhase || null;
  const citizens = (pattern.affectedEntities.citizens || []).slice(0, 3);

  const handles = {
    civic: null,
    business: null,
    culture: null,
    sports: null,
    letters: null,
  };

  if (applicable.includes('civic')) {
    handles.civic = {
      angle: initiativeId
        ? `${initiativeName || initiativeId} ${phase ? `stalled in ${phase}` : 'status'} — remedy path + responsible office`
        : `${category} gap in ${primary || 'city'} — who is accountable, what council has or hasn't done`,
      citizens,
      hookLine: initiativeId
        ? `The ${category} initiative carrying ${primary || 'this work'} has not advanced in ${firstMit.cyclesInPhase || 'several'} cycles.`
        : `No ${category} initiative addresses the ${primary || 'city'} signal surfaced this cycle.`,
    };
  }

  if (applicable.includes('business')) {
    handles.business = {
      angle: `${category} ailment — economic footprint, affected businesses, workforce impact in ${primary || 'the affected area'}`,
      citizens,
      hookLine: `Business conditions in ${primary || 'the district'} track the ${category} picture.`,
    };
  }

  if (applicable.includes('culture')) {
    handles.culture = {
      angle: `${primary || category} neighborhood texture — how residents experience the gap day to day`,
      citizens,
      hookLine: `Residents of ${primary || 'the neighborhood'} describe what ${category === 'health' ? 'access looks like' : 'the gap feels like'} in plain terms.`,
    };
  }

  if (applicable.includes('sports') && category === 'sports') {
    handles.sports = {
      angle: `venue / team / civic-sports initiative status`,
      citizens,
      hookLine: `The sports infrastructure question surfaced this cycle.`,
    };
  }

  if (applicable.includes('letters')) {
    handles.letters = {
      angle: `citizen voice — resident writing in about ${category} in ${primary || 'their neighborhood'}`,
      citizens,
      hookLine: `A resident letter would carry the personal stake of the ${category} ailment.`,
    };
  }

  return handles;
}

function threeLayerFor(pattern) {
  const ms = pattern.mitigatorState || {};
  const rp = pattern.remedyPath || {};
  const firstMit = (ms.mitigators && ms.mitigators[0]) || {};
  const firstRemedy = (rp.worldSide && rp.worldSide[0]) || {};
  const nbhds = pattern.affectedEntities.neighborhoods || [];
  const citizens = pattern.affectedEntities.citizens || [];

  const engineLine = (pattern.description || '') +
    (firstMit.effectEvidence && firstMit.effectEvidence.expectedField
      ? ` (tech anchor: ${firstMit.effectEvidence.expectedField}, observed delta ${firstMit.effectEvidence.observedDelta}).`
      : '.');

  const simulationLine = nbhds.length > 0
    ? `Felt in ${nbhds.slice(0, 3).join(', ')}${citizens.length ? `; candidate voices include ${citizens.slice(0, 2).join(', ')}` : ''}.`
    : citizens.length > 0
      ? `Citizens touched: ${citizens.slice(0, 3).join(', ')}.`
      : 'Scope is city-level or unassigned.';

  const userActionsLine = ms.exists
    ? `${firstMit.name || firstMit.initiativeId || 'mitigator'} in ${firstMit.implementationPhase || 'current phase'}; gap classified as ${ms.gap}. Recommended action: ${firstRemedy.action || ms.recommendedAction}.`
    : `No mitigator exists. Recommended: ${firstRemedy.action || ms.recommendedAction || 'propose an initiative'}.`;

  return {
    engine: engineLine,
    simulation: simulationLine,
    userActions: userActionsLine,
  };
}

function suggestFrontPage(pattern) {
  if (pattern.severity !== 'high') return false;
  if ((pattern.cyclesInState || 0) < 3) return false;
  const gap = pattern.mitigatorState && pattern.mitigatorState.gap;
  if (gap === 'remedy-working' || gap === 'not-applicable') return false;
  return true;
}

function capabilityHooksFor(pattern) {
  const hooks = [];
  const nbhds = pattern.affectedEntities.neighborhoods || [];
  const inits = pattern.affectedEntities.initiatives || [];
  const citizens = pattern.affectedEntities.citizens || [];
  for (const n of nbhds.slice(0, 2)) hooks.push(`covers ${n}`);
  for (const i of inits.slice(0, 2)) hooks.push(`mentions ${i}`);
  if (nbhds.length > 0) hooks.push(`cites a ${nbhds[0]} resident`);
  for (const c of citizens.slice(0, 1)) hooks.push(`quotes ${c}`);
  return hooks;
}

// ---------------------------------------------------------------------------
// Improvement-side framing (G-ER5, S244 ES-3)
// ---------------------------------------------------------------------------
// checkMitigators marks improvement patterns gap:not-applicable, so the empty
// branch below used to hand them blank tribuneFraming — burying good news the
// SKILL Step 6 explicitly says to surface. Improvement patterns DO carry named
// causes + affectedEntities (Baylight phase advance → INIT-006 + Jack London +
// citizens; crime-overshoot → INIT-002 + neighborhoods + expectedField), so we
// thread positive, IMPROVEMENT-tagged handles instead of dropping them.

function improvementCategoryFor(pattern) {
  const f = (pattern.evidence && pattern.evidence.fields) || {};
  const ef = String(f.expectedField || '');
  if (/Crime/i.test(ef)) return 'safety';
  if (/Retail|Economic/i.test(ef)) return 'economic';
  if (/Displacement|Housing/i.test(ef)) return 'housing';
  if (/Sentiment/i.test(ef)) return 'culture';
  const name = String(f.Name || pattern.description || '');
  if (/district|baylight|development|construction|retail|zoning/i.test(name)) return 'economic';
  if (/transit|hub|bart|bus/i.test(name)) return 'transit';
  if (/health|clinic|medical|hospital/i.test(name)) return 'health';
  if (/safety|crime|police|oari|alternative-response/i.test(name)) return 'safety';
  if (/housing|displacement|stabilization/i.test(name)) return 'housing';
  return 'civic';
}

function improvementHandlesFor(category, pattern) {
  const applicable = DESK_BY_CATEGORY[category] || ['civic', 'business', 'letters'];
  const f = (pattern.evidence && pattern.evidence.fields) || {};
  const nbhds = pattern.affectedEntities.neighborhoods || [];
  const primary = nbhds[0] || null;
  const inits = pattern.affectedEntities.initiatives || [];
  const initiativeId = inits[0] || null;
  const initiativeName = f.Name || initiativeId;
  const advance = (f.fromPhase && f.toPhase)
    ? `advanced from ${f.fromPhase} to ${f.toPhase}`
    : 'posted a positive, named-cause result';
  const citizens = (pattern.affectedEntities.citizens || []).slice(0, 3);

  const handles = { civic: null, business: null, culture: null, sports: null, letters: null };

  if (applicable.includes('civic')) {
    handles.civic = {
      tag: 'IMPROVEMENT',
      angle: initiativeId
        ? `${initiativeName} ${advance} — what the milestone delivers and who carried it`
        : `${category} gain in ${primary || 'the city'} — the positive outcome and its driver`,
      citizens,
      hookLine: initiativeId
        ? `${initiativeName} ${advance}; a milestone worth covering, not burying.`
        : `A ${category} metric improved in ${primary || 'the city'} this cycle.`,
    };
  }
  if (applicable.includes('business')) {
    handles.business = {
      tag: 'IMPROVEMENT',
      angle: `${initiativeName || category} — economic upside, jobs and footprint in ${primary || 'the district'}`,
      citizens,
      hookLine: `Business momentum in ${primary || 'the district'} tracks the ${category} gain.`,
    };
  }
  if (applicable.includes('culture')) {
    handles.culture = {
      tag: 'IMPROVEMENT',
      angle: `${primary || category} neighborhood texture — how residents experience the improvement`,
      citizens,
      hookLine: `Residents of ${primary || 'the neighborhood'} feel the change firsthand.`,
    };
  }
  if (applicable.includes('letters')) {
    handles.letters = {
      tag: 'IMPROVEMENT',
      angle: `citizen voice — a resident writing in about the ${category} improvement in ${primary || 'their neighborhood'}`,
      citizens,
      hookLine: `A resident letter would carry the lived upside of the ${category} gain.`,
    };
  }
  return handles;
}

function improvementThreeLayer(pattern) {
  const f = (pattern.evidence && pattern.evidence.fields) || {};
  const nbhds = pattern.affectedEntities.neighborhoods || [];
  const citizens = pattern.affectedEntities.citizens || [];
  const inits = pattern.affectedEntities.initiatives || [];

  const engine = (pattern.description || '') + (f.expectedField ? ` (tech anchor: ${f.expectedField}).` : '.');
  const simulation = nbhds.length > 0
    ? `Felt in ${nbhds.slice(0, 3).join(', ')}${citizens.length ? `; candidate voices include ${citizens.slice(0, 2).join(', ')}` : ''}.`
    : citizens.length > 0
      ? `Citizens touched: ${citizens.slice(0, 3).join(', ')}.`
      : 'Scope is city-level.';
  const userActions = inits.length > 0
    ? `${f.Name || inits[0]} delivered a positive outcome this cycle — credit the responsible office and cover the milestone.`
    : `A positive trend with a named cause — surface it as good news, don't bury it.`;

  return { engine, simulation, userActions };
}

function enrich(patterns, ctx) {
  for (const pattern of patterns) {
    const ms = pattern.mitigatorState || {};

    // G-ER5 — improvements get positive, IMPROVEMENT-tagged framing (intercept
    // before the not-applicable empty branch, which they'd otherwise hit).
    if (pattern.type === 'improvement') {
      const category = improvementCategoryFor(pattern);
      pattern.tribuneFraming = {
        tag: 'IMPROVEMENT',
        storyHandles: improvementHandlesFor(category, pattern),
        threeLayerCoverage: improvementThreeLayer(pattern),
        suggestedFrontPage: false,
        capabilityHooks: capabilityHooksFor(pattern),
      };
      continue;
    }

    if (ms.gap === 'not-applicable') {
      // Anomaly / other not-applicable classes — no story handle to thread.
      pattern.tribuneFraming = {
        storyHandles: { civic: null, business: null, culture: null, sports: null, letters: null },
        threeLayerCoverage: { engine: '', simulation: '', userActions: '' },
        suggestedFrontPage: false,
        capabilityHooks: [],
      };
      continue;
    }
    const category = ms.ailmentCategory || 'civic';
    pattern.tribuneFraming = {
      storyHandles: deskHandlesFor(category, pattern),
      threeLayerCoverage: threeLayerFor(pattern),
      suggestedFrontPage: suggestFrontPage(pattern),
      capabilityHooks: capabilityHooksFor(pattern),
    };
  }
  return patterns;
}

module.exports = { enrich, version: VERSION };
