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

function enrich(patterns, ctx) {
  for (const pattern of patterns) {
    const ms = pattern.mitigatorState || {};
    if (ms.gap === 'not-applicable') {
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
