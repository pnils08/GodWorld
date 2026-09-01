// @cycle-status: off-cycle — one-shot S380 incident recovery, run once from the Apps Script editor
/**
 * restoreCarryForward103 — one-shot recovery (2026-08-19).
 *
 * The S380 crash recovery deleted the three cross-cycle carry-forward script
 * properties, so C104 booted with no memory of C103's evening. This restores
 * them, rebuilt field-by-field from persisted C103 sources (Riley_Digest Y2C51,
 * Ripple_Ledger c103 rows, Chaos_Cars decay closed-form, world_summary_c103).
 * Rebuild provenance: output/recovered/carry_forward_c103_rebuild.json.
 *
 * RUN ONCE from the Apps Script editor BEFORE re-firing cycle 104.
 * Logs each stored value read back (verify-after-write).
 */
function restoreCarryForward103() {
  var props = PropertiesService.getScriptProperties();
  var blobs = {
    PREV_EVENING_JSON: "{\"cycle\":103,\"crowdHotspots\":[],\"nightlifeVolume\":3,\"nightlifeVibe\":\"quiet\",\"eveningSafety\":\"normal\",\"eveningTraffic\":\"restricted\",\"foodTrend\":\"Holiday celebration dining - festive atmosphere\",\"streamingTrend\":\"holiday movie marathon\",\"eveningSports\":\"Oakland Sports Tonight\",\"famousNames\":[\"Claire Ashford in Piedmont Ave\",\"Mark Aitken in Lake Merritt\",\"Tara Ellison in Downtown\"],\"cityEvents\":[{\"name\":\"Jack London Holiday Market\",\"neighborhood\":\"Jack London\",\"tags\":[]},{\"name\":\"Fruitvale Emergency Town Briefing\",\"neighborhood\":\"Fruitvale\",\"tags\":[]},{\"name\":\"Lake Merritt Community Joy Parade\",\"neighborhood\":\"Lake Merritt\",\"tags\":[]}],\"topCrowds\":{}}",
    PREV_CYCLE_STATE_JSON: "{\"cycle\":103,\"events\":2025,\"chaosCount\":11,\"sentiment\":0.44,\"econMood\":50,\"pattern\":\"strain-trend\",\"shockFlag\":\"shock-flag\",\"shockStartCycle\":69,\"civicLoad\":\"minor-variance\",\"civicLoadScore\":0,\"weatherType\":\"overcast\",\"weatherImpact\":1.05,\"cycleWeight\":\"high-signal\",\"cycleWeightScore\":0,\"recoveryLevel\":\"none\",\"overloadScore\":0,\"activeCooldowns\":\"none\",\"holiday\":\"Holiday\",\"holidayPriority\":\"major\",\"isFirstFriday\":false,\"isCreationDay\":false,\"sportsSeason\":\"off-season\",\"season\":\"Winter\",\"mediaEffects\":null,\"neighborhoodDynamics\":null,\"domainPresence\":null,\"dominantDomain\":\"FAITH\",\"economicRipples\":[],\"initiativeRipples\":[],\"migrationDrift\":-8,\"migrationDriftFactors\":[],\"bankRate\":null,\"crimeSpikes\":[]}",
    CHAOS_NBHD_FOLD_JSON: "{\"KONO\":{\"Sentiment\":-0.15},\"Uptown\":{\"CrimeIndex\":-0.01},\"Glenview\":{\"Sentiment\":0.01},\"Downtown\":{\"CrimeIndex\":-0.15},\"Ivy Hill\":{\"CrimeIndex\":-0.02},\"San Antonio\":{\"Sentiment\":-0.09,\"CrimeIndex\":-0.1},\"Rockridge\":{\"CrimeIndex\":-0.03,\"Sentiment\":0.04},\"Piedmont Ave\":{\"Sentiment\":-0.08},\"Laurel\":{\"Sentiment\":0.02},\"Fruitvale\":{\"RetailVitality\":1.26},\"Baylight District\":{\"CrimeIndex\":-0.09},\"Dimond\":{\"Sentiment\":0.09}}"
  };
  for (var key in blobs) {
    JSON.parse(blobs[key]);  // sanity: must be valid JSON before storing
    props.setProperty(key, blobs[key]);
    var back = props.getProperty(key);
    Logger.log('restoreCarryForward103: ' + key + ' stored, ' + back.length + ' bytes, readback ' +
      (back === blobs[key] ? 'MATCHES' : 'MISMATCH — DO NOT RE-FIRE'));
  }
  Logger.log('restoreCarryForward103: done — cycle 104 will now load cycle 103 carry-forward');
}
