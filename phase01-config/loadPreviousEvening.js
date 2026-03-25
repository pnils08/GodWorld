/**
 * loadPreviousEvening.js v1.0
 *
 * Loads the previous cycle's evening snapshot from PropertiesService.
 * Called in Phase 1 after loadConfig_. Sets ctx.summary.previousEvening
 * so Phase 5 citizen event generators can reference last night's
 * crowd hotspots, nightlife vibe, safety, sports, famous sightings, etc.
 *
 * People's days are shaped by what happened yesterday, not what's
 * happening tonight. This is the carry-forward mechanism.
 */

function loadPreviousEvening_(ctx) {
  var S = ctx.summary || (ctx.summary = {});
  try {
    var json = PropertiesService.getScriptProperties().getProperty('PREV_EVENING_JSON');
    if (json) {
      S.previousEvening = JSON.parse(json);
      Logger.log('loadPreviousEvening_: Loaded evening data from cycle ' + (S.previousEvening.cycle || '?'));
    } else {
      S.previousEvening = null;
      Logger.log('loadPreviousEvening_: No previous evening data found (first cycle or cleared)');
    }
  } catch (e) {
    S.previousEvening = null;
    Logger.log('loadPreviousEvening_: Failed - ' + e.message);
  }
}
