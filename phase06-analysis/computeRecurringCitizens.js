/**
 * computeRecurringCitizens.js — v1.0
 *
 * Populates ctx.summary.recurringCitizens for buildContinuityHints_().
 * Aggregates citizen appearances across this cycle's data sources.
 * Citizens appearing in 2+ distinct sources are "recurring."
 *
 * Sources:
 *  1. namedSpotlights  — citizens scored for media spotlight
 *  2. cycleActiveCitizens — all citizens with events this cycle
 *  3. eventArcs — citizens involved in multi-cycle arcs
 *  4. relationshipBonds — citizens in active bonds
 *
 * Called in Phase 6 after applyNamedCitizenSpotlights_().
 * Consumed by buildContinuityHints_() in Phase 11 (exportCycleArtifacts).
 */

function computeRecurringCitizens_(ctx) {
  var S = ctx.summary;
  var tally = Object.create(null); // popId → { name, sources: {} }

  // Build reverse name→popId lookup from namedCitizenMap
  var nameToPopId = Object.create(null);
  if (ctx.namedCitizenMap) {
    var pids = Object.keys(ctx.namedCitizenMap);
    for (var p = 0; p < pids.length; p++) {
      var c = ctx.namedCitizenMap[pids[p]];
      if (c && c.name) nameToPopId[c.name] = pids[p];
    }
  }

  function addEntry(popId, name, source) {
    if (!popId) return;
    if (!tally[popId]) tally[popId] = { name: name || popId, sources: Object.create(null) };
    tally[popId].sources[source] = true;
  }

  function resolveId(idOrName) {
    if (ctx.namedCitizenMap && ctx.namedCitizenMap[idOrName]) return idOrName;
    return nameToPopId[idOrName] || idOrName;
  }

  function resolveName(popId) {
    if (ctx.namedCitizenMap && ctx.namedCitizenMap[popId]) {
      return ctx.namedCitizenMap[popId].name || popId;
    }
    return popId;
  }

  // --- Source 1: Named Spotlights ---
  var spots = S.namedSpotlights || [];
  for (var i = 0; i < spots.length; i++) {
    if (spots[i].popId) addEntry(spots[i].popId, spots[i].name, 'spotlight');
  }

  // --- Source 2: Cycle Active Citizens ---
  var actives = S.cycleActiveCitizens || [];
  for (var a = 0; a < actives.length; a++) {
    var aid = resolveId(actives[a]);
    addEntry(aid, resolveName(aid), 'active');
  }

  // --- Source 3: Event Arcs (involvedCitizens) ---
  var arcs = S.eventArcs || [];
  for (var j = 0; j < arcs.length; j++) {
    var arc = arcs[j];
    if (!arc || arc.phase === 'resolved') continue;
    var involved = arc.involvedCitizens || arc.keyCitizens || [];
    for (var k = 0; k < involved.length; k++) {
      var cit = involved[k];
      var arcId = cit.popId || cit.POPID || cit;
      var arcName = cit.name || cit.Name || arcId;
      addEntry(arcId, arcName, 'arc');
    }
  }

  // --- Source 4: Relationship Bonds ---
  var bonds = S.relationshipBonds || [];
  for (var b = 0; b < bonds.length; b++) {
    var bond = bonds[b];
    if (!bond || bond.status === 'severed') continue;
    var bNames = [bond.citizenA, bond.citizenB];
    for (var n = 0; n < bNames.length; n++) {
      if (!bNames[n]) continue;
      var bId = resolveId(bNames[n]);
      addEntry(bId, bNames[n], 'bond');
    }
  }

  // --- Filter: 2+ distinct sources ---
  var result = [];
  var ids = Object.keys(tally);
  for (var r = 0; r < ids.length; r++) {
    var entry = tally[ids[r]];
    var distinctCount = Object.keys(entry.sources).length;
    if (distinctCount >= 2) {
      result.push({
        popId: ids[r],
        name: entry.name,
        appearances: distinctCount
      });
    }
  }

  // Sort by appearances descending, cap at 15
  result.sort(function(a, b) { return b.appearances - a.appearances; });
  if (result.length > 15) result = result.slice(0, 15);

  S.recurringCitizens = result;
}
