/**
 * checkMitigators (Phase 38.2) — ailment-to-mitigator join. For each pattern,
 * determines whether a world-side mitigator exists and whether it's actually
 * moving the engine field it should. Mutates patterns[] in place, adding a
 * `mitigatorState` field per §14.3.
 */

const fs = require('fs');
const path = require('path');
const VERSION = '1.1.0';

let registryCache = null;
function loadRegistry() {
  if (registryCache) return registryCache;
  const p = path.join(__dirname, 'mitigatorRegistry.json');
  registryCache = JSON.parse(fs.readFileSync(p, 'utf8'));
  return registryCache;
}

function num(v) {
  if (v == null || v === '') return null;
  const n = parseFloat(v);
  return Number.isNaN(n) ? null : n;
}

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function descriptionMatchesKeyword(desc, keyword) {
  const re = new RegExp('\\b' + escapeRegex(keyword) + '\\b', 'i');
  return re.test(desc);
}

function categoryForPattern(pattern, registry) {
  const f = (pattern.evidence && pattern.evidence.fields) || {};
  const domain = (f.PolicyDomain || f.matchedPolicyDomain || '').toLowerCase();
  if (domain) {
    for (const [cat, def] of Object.entries(registry.categories)) {
      if ((def.initiativeDomains || []).includes(domain)) return cat;
    }
  }
  const signals = f.signals || [];
  for (const sig of signals) {
    const s = String(sig).toLowerCase();
    if (s.includes('crimeindex') && /=\s*([2-9]|1\.[5-9])/.test(s)) return 'safety';
    if (s.includes('retailvitality') && /=\s*0\.[0-3]/.test(s)) return 'economic';
    if (s.includes('displacementpressure') && /=\s*0\.[6-9]/.test(s)) return 'housing';
    if (s.includes('sentiment') && /=\s*(-|0\.[0-3])/.test(s)) return 'culture';
  }
  const desc = String(pattern.description || '');
  for (const [cat, def] of Object.entries(registry.categories)) {
    if ((def.keywords || []).some(k => descriptionMatchesKeyword(desc, k))) return cat;
  }
  return null;
}

function lookupInitiative(id, snapshot) {
  const rows = (snapshot.Initiative_Tracker || []);
  return rows.find(r => (r.InitiativeID || r.Name) === id) || null;
}

function cyclesInPhase(initRow, pattern, prior) {
  if (pattern.type === 'stuck-initiative' && pattern.cyclesInState) return pattern.cyclesInState;
  const phase = initRow.ImplementationPhase;
  let count = 0;
  for (const p of prior) {
    const priorInits = (p.snapshots && p.snapshots.Initiative_Tracker) || [];
    const pr = priorInits.find(r => (r.InitiativeID || r.Name) === (initRow.InitiativeID || initRow.Name));
    if (pr && pr.ImplementationPhase === phase) count++;
    else break;
  }
  return count;
}

function readMetric(sheetName, neighborhoodOrKey, field, snapshot) {
  const rows = snapshot[sheetName] || [];
  if (sheetName === 'Neighborhood_Map') {
    const r = rows.find(x => x.Neighborhood === neighborhoodOrKey);
    return r ? num(r[field]) : null;
  }
  if (sheetName === 'Crime_Metrics') {
    const r = rows.find(x => x.Neighborhood === neighborhoodOrKey);
    return r ? num(r[field]) : null;
  }
  return null;
}

function priorMetric(sheetName, neighborhood, field, priorAudits) {
  for (const p of priorAudits) {
    const sheet = (p.snapshots && p.snapshots[sheetName]) || [];
    const row = sheet.find(x => x.Neighborhood === neighborhood);
    if (row) {
      const v = num(row[field]);
      if (v != null) return v;
    }
  }
  return null;
}

function computeEffect(initRow, category, ctx, registry) {
  const cat = registry.categories[category];
  if (!cat || !cat.expectedMetric) return { observedDelta: 0, verdict: 'unknown', expectedField: null };
  const { sheet, field, sign, magnitudeThreshold } = cat.expectedMetric;
  const neighborhoods = (initRow.AffectedNeighborhoods || '')
    .split(/[,;]/).map(s => s.trim()).filter(Boolean);

  let maxPositiveMove = 0;
  let anySignalRead = false;
  for (const n of neighborhoods) {
    const curr = readMetric(sheet, n, field, ctx.snapshot);
    const prev = priorMetric(sheet, n, field, ctx.prior);
    if (curr == null || prev == null) continue;
    anySignalRead = true;
    const delta = curr - prev;
    const directional = sign === 'positive' ? delta : -delta;
    if (directional > maxPositiveMove) maxPositiveMove = directional;
  }

  const verdict = !anySignalRead
    ? 'no-history'
    : maxPositiveMove >= magnitudeThreshold
      ? 'effects-firing'
      : 'effects-not-firing';

  return {
    expectedField: `${sheet}.${field}`,
    observedDelta: Number(maxPositiveMove.toFixed(4)),
    expectedSign: sign,
    magnitudeThreshold,
    verdict,
    neighborhoodsChecked: neighborhoods,
  };
}

function buildMitigatorEntry(initRow, category, ctx, registry, pattern) {
  const phase = initRow.ImplementationPhase || '';
  const effect = computeEffect(initRow, category, ctx, registry);
  const effectsFiring = effect.verdict === 'effects-firing';
  return {
    initiativeId: initRow.InitiativeID || initRow.Name,
    name: initRow.Name,
    status: initRow.Status,
    implementationPhase: phase,
    cyclesInPhase: cyclesInPhase(initRow, pattern, ctx.prior),
    effectsFiring,
    effectEvidence: effect,
  };
}

function classifyGap(mitigators, pattern, registry) {
  if (mitigators.length === 0) return 'no-mitigator';
  const anyFiring = mitigators.some(m => m.effectsFiring);
  const ailmentHighSeverity = pattern.severity === 'high';
  if (anyFiring && !ailmentHighSeverity) return 'remedy-working';
  if (anyFiring && ailmentHighSeverity) return 'mitigator-firing-but-insufficient';
  const anyStuck = mitigators.some(m => {
    const cat = Object.values(registry.categories).find(c => (c.initiativeDomains || []).length);
    const threshold = (cat && cat.stuckPhaseThreshold) || 5;
    return !m.effectsFiring && (m.cyclesInPhase || 0) >= threshold;
  });
  return anyStuck ? 'mitigator-stuck' : 'mitigator-firing-but-insufficient';
}

function findMitigatorsByCategory(category, pattern, ctx, registry) {
  const cat = registry.categories[category];
  if (!cat) return [];
  const initiatives = ctx.snapshot.Initiative_Tracker || [];
  const targetNbhd = new Set(pattern.affectedEntities.neighborhoods || []);
  const matching = initiatives.filter(i => {
    if (!(cat.initiativeDomains || []).includes((i.PolicyDomain || '').toLowerCase())) return false;
    if (targetNbhd.size === 0) return true;
    const affected = (i.AffectedNeighborhoods || '').split(/[,;]/).map(s => s.trim()).filter(Boolean);
    return affected.some(n => targetNbhd.has(n));
  });
  return matching;
}

function recommendedActionFor(gap, mitigators) {
  if (gap === 'no-mitigator') return 'propose new initiative';
  if (gap === 'mitigator-stuck') {
    const m = mitigators[0];
    return `advance ${m ? m.initiativeId : 'initiative'} out of ${m ? m.implementationPhase : 'current phase'}`;
  }
  if (gap === 'mitigator-firing-but-insufficient') return 'add parallel mitigator or character intervention';
  if (gap === 'remedy-working') return 'none — monitor';
  return 'none';
}

function enrich(patterns, ctx) {
  const registry = loadRegistry();
  for (const pattern of patterns) {
    if (pattern.type === 'improvement' || pattern.type === 'anomaly') {
      pattern.mitigatorState = { exists: false, mitigators: [], gap: 'not-applicable', recommendedAction: 'none' };
      continue;
    }
    const category = categoryForPattern(pattern, registry);
    let mitigators = [];

    const linkedIds = pattern.affectedEntities.initiatives || [];
    if (linkedIds.length > 0) {
      for (const id of linkedIds) {
        const row = lookupInitiative(id, ctx.snapshot);
        if (!row) continue;
        const rowCategory = categoryForPattern({ evidence: { fields: { PolicyDomain: row.PolicyDomain } } }, registry);
        if (!category) continue;
        if (!rowCategory) continue;
        if (category !== rowCategory) continue;
        mitigators.push(buildMitigatorEntry(row, category, ctx, registry, pattern));
      }
    } else if (category) {
      const candidates = findMitigatorsByCategory(category, pattern, ctx, registry);
      for (const row of candidates) {
        mitigators.push(buildMitigatorEntry(row, category, ctx, registry, pattern));
      }
    }

    const gap = classifyGap(mitigators, pattern, registry);
    pattern.mitigatorState = {
      exists: mitigators.length > 0,
      mitigators,
      gap,
      recommendedAction: recommendedActionFor(gap, mitigators),
      ailmentCategory: category,
    };
  }
  return patterns;
}

module.exports = { enrich, version: VERSION };
