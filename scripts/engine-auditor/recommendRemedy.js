/**
 * recommendRemedy (Phase 38.3) — generates remedyPath per pattern based on
 * its gap classification. World-side preferred; tech-side fallback only when
 * writeback chain is structurally broken. Mutates patterns[] in place.
 * Reads declarative templates from remedyTemplates.json.
 */

const fs = require('fs');
const path = require('path');
const VERSION = '1.0.0';

let templatesCache = null;
function loadTemplates() {
  if (templatesCache) return templatesCache;
  const p = path.join(__dirname, 'remedyTemplates.json');
  templatesCache = JSON.parse(fs.readFileSync(p, 'utf8'));
  return templatesCache;
}

function fill(template, pattern) {
  const ms = pattern.mitigatorState || {};
  const firstMit = (ms.mitigators && ms.mitigators[0]) || {};
  const evidence = (firstMit.effectEvidence) || {};
  const neighborhood = (pattern.affectedEntities.neighborhoods || [])[0] || 'the affected area';
  const category = ms.ailmentCategory || 'general';
  const expectedSign = evidence.expectedSign || 'positive';
  const expectedField = evidence.expectedField || 'target metric';

  const resolve = (s) => String(s || '')
    .replace(/\{initiativeId\}/g, firstMit.initiativeId || '')
    .replace(/\{currentPhase\}/g, firstMit.implementationPhase || 'current phase')
    .replace(/\{category\}/g, category)
    .replace(/\{neighborhood\}/g, neighborhood)
    .replace(/\{expectedField\}/g, expectedField)
    .replace(/\{expectedSign\}/g, expectedSign);

  const measurementSpec = evidence.expectedField
    ? {
        field: evidence.expectedField,
        sign: evidence.expectedSign || 'positive',
        magnitudeThreshold: evidence.magnitudeThreshold,
        neighborhoodsChecked: evidence.neighborhoodsChecked || [],
      }
    : null;

  return {
    type: template.type,
    target: resolve(template.target),
    action: resolve(template.action),
    rationale: resolve(template.rationale),
    expectedEngineEffect: resolve(template.expectedEngineEffect),
    measurementSpec,
  };
}

function shouldTriggerTechSide(pattern) {
  const ms = pattern.mitigatorState;
  if (!ms || !ms.exists) return false;
  const firstMit = ms.mitigators[0];
  if (!firstMit) return false;
  const passed = /passed|operational|active/i.test(firstMit.status || '');
  const advancingPhase = /construction-active|rollout|operational|disbursement-active/i.test(firstMit.implementationPhase || '');
  return passed && advancingPhase && !firstMit.effectsFiring && firstMit.effectEvidence.verdict === 'effects-not-firing';
}

function buildTechSide(pattern, templates) {
  const ms = pattern.mitigatorState || {};
  const category = ms.ailmentCategory || 'general';
  const hints = (templates.techSideTriggers && templates.techSideTriggers.bugReportHints) || {};
  const hint = hints[category] || 'Check the writeback chain for this initiative type.';
  const firstMit = (ms.mitigators && ms.mitigators[0]) || {};
  const evidence = firstMit.effectEvidence || {};

  return {
    triggered: true,
    bugReport: {
      file: hint.split('—')[0].replace(/^Check\s+/, '').trim(),
      function: 'writebackHandler',
      ctxField: evidence.expectedField || 'unknown',
      sheetColumn: evidence.expectedField || 'unknown',
      observedBehavior: `${evidence.expectedField} unchanged (observedDelta=${evidence.observedDelta}) despite ${firstMit.initiativeId} in ${firstMit.implementationPhase}`,
      expectedBehavior: `${evidence.expectedField} should move ${evidence.expectedSign} by >= ${evidence.magnitudeThreshold} per cycle`,
      reproSteps: `Run engineAuditor.js on C${pattern._cycle || 'XX'}; inspect mitigatorState.mitigators[0].effectEvidence for ${firstMit.initiativeId}`,
      hint,
    },
  };
}

function confidenceFor(gap, mitigators) {
  if (gap === 'remedy-working') return 'high';
  if (gap === 'mitigator-stuck') {
    const m = mitigators && mitigators[0];
    if (m && m.cyclesInPhase >= 10) return 'high';
    return 'medium';
  }
  if (gap === 'no-mitigator') return 'medium';
  return 'low';
}

function enrich(patterns, ctx) {
  const templates = loadTemplates();
  for (const pattern of patterns) {
    const ms = pattern.mitigatorState;
    if (!ms || ms.gap === 'not-applicable') {
      pattern.remedyPath = {
        worldSide: [],
        techSide: { triggered: false, bugReport: null },
        confidence: 'n/a',
      };
      continue;
    }

    pattern._cycle = ctx.cycle;
    const gap = ms.gap;
    const worldTemplates = (templates.worldSide[gap] && templates.worldSide[gap].default) || [];
    const worldSide = worldTemplates.map(t => fill(t, pattern));

    const techSide = shouldTriggerTechSide(pattern)
      ? buildTechSide(pattern, templates)
      : { triggered: false, bugReport: null };

    pattern.remedyPath = {
      worldSide,
      techSide,
      confidence: confidenceFor(gap, ms.mitigators),
    };
    delete pattern._cycle;
  }
  return patterns;
}

module.exports = { enrich, version: VERSION };
