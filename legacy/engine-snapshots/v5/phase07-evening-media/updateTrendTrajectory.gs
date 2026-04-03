/**
 * updateTrendTrajectory_ v2.2
 *
 * Produces a meaningful trend signal:
 * - rising
 * - surging
 * - cooling
 * - falling
 * - stable
 *
 * Based on:
 * - FameScore change
 * - MediaCount velocity
 * - Journalist spread
 *
 * Uses header-based column lookup.
 *
 * v2.2 Enhancements:
 * - ES5 syntax for Google Apps Script compatibility
 * - Defensive guards for sheet/row
 */

function updateTrendTrajectory_(sheet, row, fameScore) {
  // Defensive guards
  if (!sheet) return;
  if (!row || row < 2) return;

  // Get headers
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  // Helper function for column lookup (1-indexed for getRange)
  function col(name) {
    return headers.indexOf(name) + 1;
  }

  var fameCol = col('FameScore');
  var mediaCol = col('MediaCount');
  var trendCol = col('TrendTrajectory');
  var spreadCol = col('MediaSpread');

  // Get previous fame score
  var prev = 0;
  if (fameCol > 0) {
    prev = Number(sheet.getRange(row, fameCol).getValue()) || 0;
  }

  // Get media count
  var mediaCount = 0;
  if (mediaCol > 0) {
    mediaCount = Number(sheet.getRange(row, mediaCol).getValue()) || 0;
  }

  // Get spread
  var spread = 1;
  if (spreadCol > 0) {
    spread = Number(sheet.getRange(row, spreadCol).getValue()) || 1;
  }

  var delta = fameScore - prev;

  var trend = "stable";

  // === Fame momentum ===
  if (delta >= 15) trend = "viral";
  else if (delta >= 10) trend = "surging";
  else if (delta >= 3) trend = "rising";
  else if (delta <= -8) trend = "fading";
  else if (delta <= -5) trend = "falling";
  else if (delta <= -1) trend = "cooling";
  else trend = "stable";

  // === Media reach modifications ===
  if (spread >= 5 && delta >= 3) trend = "surging";
  if (spread >= 8 && delta >= 5) trend = "viral";
  if (spread >= 5 && delta <= 0) trend = "cooling";

  // === Media volume ===
  if (mediaCount >= 15 && delta >= 2) trend = "viral";
  else if (mediaCount >= 10 && delta >= 2) trend = "surging";

  // === Sustained presence ===
  if (mediaCount >= 20 && Math.abs(delta) <= 2) trend = "established";

  // === Final write ===
  if (trendCol > 0) {
    sheet.getRange(row, trendCol).setValue(trend);
  }
}