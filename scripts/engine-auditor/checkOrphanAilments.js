/**
 * checkOrphanAilments.js — Phase 38.4 final enricher (closes civic.10c)
 *
 * Fail-loud detector for HIGH-severity patterns whose affected neighborhoods
 * lack a council-district owner mapping. Triggered by C93 G-12: KONO
 * surfaced as the highest single-event impactScore that cycle (50), got
 * raised in pending decisions as Mayor-citywide because no district owner
 * could be resolved, propagated the structural gap silently through the
 * cascade. Same class as G-S2 / G-S3 (neighborhood-shaped data without
 * the human-stakeholder layer) but on the OWNERSHIP axis: who governs this?
 *
 * What "orphan" means: a neighborhood named in a HIGH pattern's
 * affectedEntities that doesn't resolve to a council-district owner via
 * Neighborhood_Map.District. Pre-civic.10b, Neighborhood_Map has no
 * District column → every neighborhood is an orphan → every HIGH pattern
 * flags. That IS the right behavior: surfaces the structural gap civic.10b
 * is supposed to close, and once 10b ships, the orphan check naturally
 * filters down to genuinely-orphaned neighborhoods (like KONO until 10b
 * adds it).
 *
 * Must run AFTER detectors emit patterns AND after resolveAffectedCitizens /
 * generateTribuneFraming (those enrichers don't touch neighborhoods, but
 * keeping orphan detection last makes the audit JSON's orphanAilments field
 * the authoritative summary).
 *
 * Surfacing strategy:
 *   - Mutate each affected pattern: attach affectedEntities.orphanNeighborhoods
 *     listing the unmapped neighborhoods (downstream skills can read this).
 *   - Emit stdout WARN per orphan pattern (visible in /post-publish + manual
 *     auditor runs).
 *   - Attach a top-level `orphanAilments` summary to ctx.orphanAilments so
 *     engineAuditor.js can fold it into the audit JSON output.
 *
 * Exit-code policy: this enricher does NOT exit non-zero. Auditor's existing
 * contract is "complete writes regardless of severity" and downstream skills
 * (sift, city-hall-prep) read the audit JSON for severity grading. Adding a
 * non-zero exit would break /pre-mortem + manual runs that expect the JSON
 * to land.
 */

const VERSION = '1.0.0';

function buildDistrictMap(neighborhoodMapRows) {
  // Map: lowercase neighborhood name -> District column value.
  // Skip rows missing either field. The District column is added by
  // civic.10b — until then, the map is empty and every neighborhood is
  // an orphan (the surfacing behavior is correct in that state).
  const map = {};
  for (const row of neighborhoodMapRows || []) {
    const name = (row.Neighborhood || '').trim();
    const district = (row.District || '').trim();
    if (!name || !district) continue;
    map[name.toLowerCase()] = district;
  }
  return map;
}

function enrich(patterns, ctx) {
  const nbhdMap = (ctx.snapshot && ctx.snapshot.Neighborhood_Map) || [];
  const districtMap = buildDistrictMap(nbhdMap);

  const orphans = [];  // [{patternId, severity, neighborhoods: [orphaned], category}]
  let highImpactChecked = 0;

  for (const pattern of patterns) {
    if (!pattern || !pattern.affectedEntities) continue;
    const severity = (pattern.severity || '').toLowerCase();
    if (severity !== 'high') continue;
    highImpactChecked++;

    const neighborhoods = pattern.affectedEntities.neighborhoods || [];
    if (neighborhoods.length === 0) continue;

    const orphaned = neighborhoods.filter(n => {
      const key = (n || '').trim().toLowerCase();
      return key && !districtMap[key];
    });

    if (orphaned.length > 0) {
      pattern.affectedEntities.orphanNeighborhoods = orphaned;
      orphans.push({
        patternId: pattern.id || pattern.patternId || null,
        category: pattern.category || pattern.eventClass || null,
        severity: pattern.severity,
        affectedNeighborhoods: neighborhoods,
        orphanNeighborhoods: orphaned,
        description: pattern.description || null,
      });
    }
  }

  // Visible alert — stderr-style stdout block so /post-publish + manual
  // runs surface the gap without having to read the JSON.
  if (orphans.length > 0) {
    console.warn('  [ORPHAN-AILMENT] ' + orphans.length + ' of ' + highImpactChecked +
      ' HIGH-severity patterns reference neighborhoods with no district-owner mapping.');
    const allOrphans = new Set();
    for (const o of orphans) {
      for (const n of o.orphanNeighborhoods) allOrphans.add(n);
    }
    console.warn('  [ORPHAN-AILMENT] Unmapped neighborhoods: ' + Array.from(allOrphans).join(', '));
    console.warn('  [ORPHAN-AILMENT] Fix: extend Neighborhood_Map.District column (civic.10b) ' +
      'so the orphan list filters down to genuine canon gaps (KONO-class).');
  }

  // Top-level summary for the audit JSON.
  ctx.orphanAilments = {
    highImpactChecked,
    orphanCount: orphans.length,
    unmappedNeighborhoods: Array.from(new Set(orphans.flatMap(o => o.orphanNeighborhoods))),
    patterns: orphans,
  };
}

module.exports = { enrich, version: VERSION };
