/**
 * updateTrendTrajectory_ v2.1
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
 */

function updateTrendTrajectory_(sheet, row, fameScore) {
  if (!sheet) return;

  // Get headers
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const col = n => headers.indexOf(n) + 1; // 1-indexed for getRange

  const fameCol = col('FameScore');
  const mediaCol = col('MediaCount');
  const trendCol = col('TrendTrajectory');
  const spreadCol = col('MediaSpread');

  // Get previous fame score
  let prev = 0;
  if (fameCol > 0) {
    prev = Number(sheet.getRange(row, fameCol).getValue()) || 0;
  }

  // Get media count
  let mediaCount = 0;
  if (mediaCol > 0) {
    mediaCount = Number(sheet.getRange(row, mediaCol).getValue()) || 0;
  }

  // Get spread
  let spread = 1;
  if (spreadCol > 0) {
    spread = Number(sheet.getRange(row, spreadCol).getValue()) || 1;
  }

  const delta = fameScore - prev;

  let trend = "stable";

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