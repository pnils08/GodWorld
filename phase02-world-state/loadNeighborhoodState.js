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
 *   trajectory, trajectoryMomentum, housingPressure, medianRent,  // slow cols (engine-owned, S315 trajectory block)
 *   migrationFlow,
 *   noiseIndex, medianIncome,                                     // engine.133 structural layers
 *   incomeTier, boomExposure, boomIndex, employerCharacter,
 *   wealthMin, wealthMax                                          // engine.135 B1 authored hood profile
 * }
 *
 * Read-only — no sheet writes, no intents. ES5-safe.
 * Plan: docs/archive/plans/2026-06-10-engine33-neighborhood-citizen-loop.md Task 5.
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
  var iTraj = idx('NeighborhoodTrajectory');
  var iMom = idx('TrajectoryMomentum');
  var iPress = idx('HousingPressure');
  var iRent = idx('MedianRent');
  var iFlow = idx('MigrationFlow');
  // engine.133 D3 — the two full-coverage structural layers the hood illness
  // envelope weights from (22/22 populated live at C104): density proxy + income.
  var iNoise = idx('NoiseIndex');
  var iIncome = idx('MedianIncome');
  // engine.135 B1 — the authored hood economic profile (INSTITUTIONS
  // §Neighborhoods rendered as Neighborhood_Map columns, ADR-0016: the sheet is
  // the truth, code reads it). Employment envelope, pay bands, business fill
  // and placement all key off these six; a blank reads null, never a default.
  var iTier = idx('IncomeTier');
  var iBoom = idx('BoomExposure');
  var iBoomIdx = idx('BoomIndex');
  var iEmpChar = idx('EmployerCharacter');
  var iWMin = idx('WealthMin');
  var iWMax = idx('WealthMax');

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
      trajectory: iTraj >= 0 ? (row[iTraj] || '').toString().trim() : '',
      trajectoryMomentum: num(row, iMom),
      housingPressure: num(row, iPress),
      medianRent: num(row, iRent),
      migrationFlow: num(row, iFlow),
      noiseIndex: num(row, iNoise),      // engine.133
      medianIncome: num(row, iIncome),   // engine.133
      incomeTier: num(row, iTier),                                            // engine.135 B1 (1 pressured … 6 elite)
      boomExposure: iBoom >= 0 ? (row[iBoom] || '').toString().trim() : '',   // engine.135 B1 (canon label)
      boomIndex: num(row, iBoomIdx),                                          // engine.135 B1 (−1 … +1)
      employerCharacter: iEmpChar >= 0 ? (row[iEmpChar] || '').toString().trim() : '', // engine.135 B1
      wealthMin: num(row, iWMin),                                             // engine.135 B1 (WealthLevel admission band)
      wealthMax: num(row, iWMax)                                              // engine.135 B1
    };
    loaded++;
  }

  S.neighborhoodStateCount = loaded;
}

/**
 * engine.135 F (S399, builder point 9): does this neighborhood admit this
 * money? A citizen moves INTO a hood only if their WealthLevel sits inside
 * the hood's [WealthMin, WealthMax] admission band (B1 profile, INSTITUTIONS
 * canon: Lake Merritt 8+, Temescal 2–5 …). No band on the hood → admits
 * anyone. WealthLevel 0/blank = unpriced (a new arrival, not poverty) → not
 * gated. Residents already inside a hood are never evicted by this.
 */
function hoodAdmits_(hoodState, wealthLevel) {
  if (!hoodState) return true;
  var lo = Number(hoodState.wealthMin) || 0, hi = Number(hoodState.wealthMax) || 0;
  if (lo <= 0 && hi <= 0) return true;
  var wl = Number(wealthLevel) || 0;
  if (wl <= 0) return true;
  if (lo > 0 && wl < lo) return false;
  if (hi > 0 && wl > hi) return false;
  return true;
}
