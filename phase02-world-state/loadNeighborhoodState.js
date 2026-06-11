/**
 * ============================================================================
 * loadNeighborhoodState_ v1 (engine.33 Task 5 — inbound half of the loop)
 * ============================================================================
 *
 * Reads Neighborhood_Map (written by phase08 v3NeighborhoodWriter LAST cycle,
 * pulse-folded since engine.33 T4) into S.neighborhoodState so phase04/05
 * generators can flavor citizen events with their hood's current condition.
 * One-cycle lag by design: citizens react to the neighborhood the city
 * recorded, the way a resident reads yesterday's street.
 *
 * S.neighborhoodState[hood] = {
 *   sentiment, crimeIndex, retailVitality, eventAttractiveness,   // fast cols (citizen-movable)
 *   gentrificationPhase, displacementPressure, medianRent,        // slow cols (engine-owned)
 *   migrationFlow
 * }
 *
 * Read-only — no sheet writes, no intents. ES5-safe.
 * Plan: docs/plans/2026-06-10-engine33-neighborhood-citizen-loop.md Task 5.
 * ============================================================================
 */

function loadNeighborhoodState_(ctx) {
  var S = ctx.summary || (ctx.summary = {});
  S.neighborhoodState = {};

  var sheet = ctx.ss.getSheetByName('Neighborhood_Map');
  if (!sheet) return;

  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return;

  var header = values[0];
  function idx(n) { return header.indexOf(n); }

  var iCycle = idx('Cycle');
  var iHood = idx('Neighborhood');
  var iCrime = idx('CrimeIndex');
  var iRetail = idx('RetailVitality');
  var iAttract = idx('EventAttractiveness');
  var iSent = idx('Sentiment');
  var iGent = idx('GentrificationPhase');
  var iDisp = idx('DisplacementPressure');
  var iRent = idx('MedianRent');
  var iFlow = idx('MigrationFlow');

  if (iHood < 0) return;

  // Writer is replace-pattern (one live row per hood), but filter to the max
  // Cycle value anyway — cheap insurance if the write pattern ever changes.
  var rows = values.slice(1);
  var maxCycle = null;
  if (iCycle >= 0) {
    for (var m = 0; m < rows.length; m++) {
      var c = Number(rows[m][iCycle]);
      if (!isNaN(c) && (maxCycle === null || c > maxCycle)) maxCycle = c;
    }
  }

  function num(row, i) {
    if (i < 0) return null;
    var v = Number(row[i]);
    return isNaN(v) ? null : v;
  }

  var loaded = 0;
  for (var r = 0; r < rows.length; r++) {
    var row = rows[r];
    var hood = (row[iHood] || '').toString().trim();
    if (!hood) continue;
    if (maxCycle !== null && Number(row[iCycle]) !== maxCycle) continue;

    S.neighborhoodState[hood] = {
      sentiment: num(row, iSent),
      crimeIndex: num(row, iCrime),
      retailVitality: num(row, iRetail),
      eventAttractiveness: num(row, iAttract),
      gentrificationPhase: iGent >= 0 ? (row[iGent] || '').toString().trim() : '',
      displacementPressure: num(row, iDisp),
      medianRent: num(row, iRent),
      migrationFlow: num(row, iFlow)
    };
    loaded++;
  }

  S.neighborhoodStateCount = loaded;
}
