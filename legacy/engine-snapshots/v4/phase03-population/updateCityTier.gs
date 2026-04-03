/**
 * updateCityTier_ v2.1
 *
 * Determines the cultural tier of a public figure using:
 * - fameScore momentum
 * - mediaCount
 * - media spread (unique journalists)
 * - trend trajectory
 *
 * Uses header-based column lookup.
 * Outputs: Local / Regional / National / Global / Iconic
 */

function updateCityTier_(sheet, row, fameScore, mediaCount) {
  if (!sheet) return;

  // Get headers
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var col = function(n) { return headers.indexOf(n) + 1; }; // 1-indexed for getRange

  var spreadCol = col('MediaSpread');
  var trendCol = col('TrendTrajectory');
  var tierCol = col('CityTier');

  // Get spread
  var spread = 1;
  if (spreadCol > 0) {
    spread = Number(sheet.getRange(row, spreadCol).getValue()) || 1;
  }

  // Get trend
  var trend = "stable";
  if (trendCol > 0) {
    trend = (sheet.getRange(row, trendCol).getValue() || "stable").toString().toLowerCase();
  }

  var tierScore = 0;

  // FameScore contribution
  if (fameScore >= 20) tierScore += 2;
  if (fameScore >= 40) tierScore += 4;
  if (fameScore >= 80) tierScore += 6;
  if (fameScore >= 120) tierScore += 10;
  if (fameScore >= 200) tierScore += 8;

  // MediaCount contribution
  if (mediaCount >= 5) tierScore += 2;
  if (mediaCount >= 10) tierScore += 3;
  if (mediaCount >= 20) tierScore += 5;
  if (mediaCount >= 50) tierScore += 5;

  // Spread contribution (unique journalists)
  if (spread >= 3) tierScore += 3;
  if (spread >= 6) tierScore += 5;
  if (spread >= 10) tierScore += 4;

  // Trend trajectory effects
  if (trend === "viral") tierScore += 6;
  if (trend === "surging") tierScore += 4;
  if (trend === "rising") tierScore += 2;
  if (trend === "established") tierScore += 3;
  if (trend === "cooling") tierScore -= 2;
  if (trend === "falling") tierScore -= 4;
  if (trend === "fading") tierScore -= 6;

  // Convert score to tier
  var tier = "Local";

  if (tierScore >= 30) tier = "Iconic";
  else if (tierScore >= 22) tier = "Global";
  else if (tierScore >= 14) tier = "National";
  else if (tierScore >= 6) tier = "Regional";

  // Write tier
  if (tierCol > 0) {
    sheet.getRange(row, tierCol).setValue(tier);
  }
}