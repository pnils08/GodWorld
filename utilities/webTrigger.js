// @cycle-status: off-cycle — doGet/doPost are the web-app entry points that CALL runWorldCycle() (upstream of the cycle)
/**
 * ============================================================================
 * webTrigger — remote cycle fire (engine.59 S320, Mike-approved)
 * ============================================================================
 *
 * Deploy as Web App to let the engine-sheet terminal fire sandbox cycles
 * autonomously (curl) during debug loops — no human trigger per fire.
 *
 * SETUP (once per sandbox copy, Apps Script editor):
 *   1. Project Settings → Script Properties → add:
 *        CYCLE_TRIGGER_TOKEN = <random string>
 *      (No token property = endpoint refuses everything. The token is never
 *      in git.)
 *   2. Deploy → New deployment → type: Web app →
 *        Execute as: Me · Who has access: Anyone
 *   3. Copy the Web app URL.
 *
 * FIRE:  curl -L "<url>?token=<token>"
 * Response: JSON {ok:true} on success; {ok:false, error:...} otherwise.
 *
 * Safety: token-gated; LockService refuses overlapping cycles; AIM-GUARD
 * still protects the target sheet exactly as on manual fires. The live
 * script carries this code but stays inert unless a deployment + token are
 * ever created there.
 */
function doGet(e) {
  var out = { ok: false };
  try {
    var token = PropertiesService.getScriptProperties().getProperty('CYCLE_TRIGGER_TOKEN');
    if (!token) {
      out.error = 'CYCLE_TRIGGER_TOKEN script property not set';
    } else if (!e || !e.parameter || String(e.parameter.token || '') !== token) {
      out.error = 'bad token';
    } else {
      var lock = LockService.getScriptLock();
      if (!lock.tryLock(5000)) {
        out.error = 'a cycle is already running';
      } else {
        try {
          var t0 = Date.now();
          runWorldCycle();
          out.ok = true;
          out.ranMs = Date.now() - t0;
          // engine.59 diag-emit: the fire response carries the bond engine's why
          if (typeof ENGINE59_DIAG !== 'undefined' && ENGINE59_DIAG) out.diag59 = ENGINE59_DIAG;
          // engine.61 diag-emit: the rate walk's why (persistence is invisible from outside)
          if (typeof ENGINE61_DIAG !== 'undefined' && ENGINE61_DIAG) out.diag61 = ENGINE61_DIAG;
          // engine.95 Task 2: per-phase timings (no GCP project → clasp logs unavailable)
          if (typeof ENGINE95_TIMING_DIAG !== 'undefined' && ENGINE95_TIMING_DIAG) out.timing = ENGINE95_TIMING_DIAG;
        } finally {
          lock.releaseLock();
        }
      }
    }
  } catch (err) {
    out.error = String((err && err.message) || err);
  }
  return ContentService.createTextOutput(JSON.stringify(out))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Carry-forward prop restore (2026-08-19 recovery). Token-gated POST that
 * reads/writes ONLY the three cross-cycle carry-forward properties — the
 * blobs the S380 crash recovery deleted. Whitelist is the blast-radius
 * guard: no other property can be touched through this door, and there is
 * deliberately no delete action.
 *
 * FIRE:  curl -L -d "token=<t>&action=setprop&key=PREV_EVENING_JSON&value=<json>" <url>
 *        curl -L -d "token=<t>&action=getprop&key=PREV_EVENING_JSON" <url>
 * Response echoes the stored value read back after write (verify-after-write).
 */
var CARRY_FORWARD_PROP_WHITELIST = {
  'PREV_EVENING_JSON': true,
  'PREV_CYCLE_STATE_JSON': true,
  'CHAOS_NBHD_FOLD_JSON': true
};

function doPost(e) {
  var out = { ok: false };
  try {
    var token = PropertiesService.getScriptProperties().getProperty('CYCLE_TRIGGER_TOKEN');
    var p = (e && e.parameter) || {};
    if (!token) {
      out.error = 'CYCLE_TRIGGER_TOKEN script property not set';
    } else if (String(p.token || '') !== token) {
      out.error = 'bad token';
    } else if (!CARRY_FORWARD_PROP_WHITELIST[String(p.key || '')]) {
      out.error = 'key not in carry-forward whitelist';
    } else if (p.action === 'setprop') {
      var value = String(p.value || '');
      JSON.parse(value);  // must be valid JSON — the engine loads it with JSON.parse
      PropertiesService.getScriptProperties().setProperty(p.key, value);
      out.ok = true;
      out.key = p.key;
      out.stored = PropertiesService.getScriptProperties().getProperty(p.key);
    } else if (p.action === 'getprop') {
      out.ok = true;
      out.key = p.key;
      out.stored = PropertiesService.getScriptProperties().getProperty(p.key);
    } else {
      out.error = 'unknown action';
    }
  } catch (err) {
    out.error = String((err && err.message) || err);
  }
  return ContentService.createTextOutput(JSON.stringify(out))
    .setMimeType(ContentService.MimeType.JSON);
}
