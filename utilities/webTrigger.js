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
