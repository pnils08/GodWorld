---
title: Kimi engine.256 lease drift — unfinished code, archived
created: 2026-09-23
updated: 2026-10-29
type: archive
tags: [engine, archive, housing]
sources:
  - git stash f70914fd (2026-09-23 21:50, "kimi engine.256 lease WIP"), base c58a1adc "housing off: no housing program in the sim (builder 2026-09-23)"
  - docs/plans/2026-09-22-initiative-budget-disbursement.md §Data reality
pointers:
  - "[[../../plans/2026-09-22-initiative-budget-disbursement]] — the plan engine.256 sat under"
  - "[[../../engine/ROLLOUT_ARCHIVE]] — engine.256 archived wontfix"
---

# Kimi engine.256 lease drift — unfinished code, archived

**What it is.** 117 lines kimi wrote in `phase05-citizens/householdFormationEngine.js` for engine.256, ruled by the builder on 2026-09-23 (forward-only lease drift, dials 0.15 / 13 / 0.25): a lease drawn around the hood rent level by a deterministic per-unit factor at formation and on a move, then closing a share of the gap to the hood level every renewal period. Never committed or deployed; no review of it found. It sat in a git stash from 2026-09-23.

**Why archived.** The builder ruled on 2026-10-17: "Rent does not need to change"; rent is set at move-in and re-set on a move. engine.256 went to `wontfix` and was swept to ROLLOUT_ARCHIVE. The code answers a question the sim no longer asks. The hunk still applies textually to `householdFormationEngine.js` (`git apply --check` clean on 2026-10-29), but that file has changed since (engine.302, engine.304) and nothing here was written against those changes. Kept as a record of the design, not as a candidate.

**Revisiting.** Start from the ruling in the plan above, not from this patch. The patch is against the file as of base `c58a1adc`.

**Disposition (2026-10-29, research-build).** Archived at the builder's word; the stash (commit f70914fd) was dropped after the patch below was checked byte-identical to it.

## The patch (verbatim `git stash show -p`)

```diff
diff --git a/phase05-citizens/householdFormationEngine.js b/phase05-citizens/householdFormationEngine.js
index b227258e..a9bf3a73 100644
--- a/phase05-citizens/householdFormationEngine.js
+++ b/phase05-citizens/householdFormationEngine.js
@@ -925,6 +925,123 @@ function estimateRent_(neighborhood, ctx) {
   return Math.round(med);
 }
 
+// engine.256 (ruled 2026-09-23, builder: forward-only + drift, dials
+// 0.15 / 13 / 0.25): a lease is a fact of its unit, not a hood stamp. At
+// formation and on a move the lease draws around the hood level by a
+// deterministic per-unit factor — replay-safe (a re-fired Cycle draws the
+// same lease) and no rng consumed. The hood level stays the one engine.160
+// income rule; there is no price table.
+function leaseDrawFactor_(seedKey, spread) {
+  var s = String(seedKey);
+  var h = 0;
+  for (var i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) | 0; }
+  var u = ((h >>> 0) % 10000) / 10000;
+  return 1 + (u * 2 - 1) * spread;
+}
+function leaseDial_(ctx, key) {
+  var v = ctx && ctx.config ? Number(ctx.config[key]) : NaN;
+  if (!isFinite(v) || v <= 0) {
+    throw new Error('leaseDial_: World_Config ' + key + ' missing or ≤ 0 — the engine.256 self-arm did not run (ADR-0015).');
+  }
+  return v;
+}
+function leaseForUnit_(ctx, neighborhood, seedKey) {
+  var level = estimateRent_(neighborhood, ctx); // throws off-ledger (ADR-0016)
+  return Math.max(1, Math.round(level * leaseDrawFactor_(seedKey, leaseDial_(ctx, 'leaseSpread'))));
+}
+
+// engine.256 renewal drift: every leaseRenewalCycles from FormedCycle an
+// active rented row closes leaseDriftShare of the gap to its hood's current
+// level — a column that moves per row as a function of its own inputs (§16),
+// forward-only (existing leases keep their stamp and converge; no retcon).
+// LastLeaseDriftCycle arms on the first drift so a same-Cycle rerun does not
+// drift twice. Loud-not-fatal, same class as the disbursement writer.
+var LEASE_DRIFT_COLUMN_ = 'LastLeaseDriftCycle';
+function driftLeases_(ctx, cycle) {
+  var out = { drifted: 0, armed: false, noLevel: 0, reason: null, error: null };
+  try {
+    return driftLeasesBody_(ctx, cycle, out);
+  } catch (e) {
+    out.error = String(e && e.message ? e.message : e);
+    out.reason = 'error';
+    Logger.log('householdFormationEngine: engine.256 lease drift ERROR — ' + out.error);
+    if (typeof logEngineError_ === 'function') {
+      try { logEngineError_(ctx, 'Phase5-LeaseDrift', e); } catch (e2) { /* the log itself must not throw */ }
+    }
+    return out;
+  }
+}
+function driftLeasesBody_(ctx, cycle, out) {
+  var every = leaseDial_(ctx, 'leaseRenewalCycles');
+  var share = leaseDial_(ctx, 'leaseDriftShare');
+  var sheet = ctx.ss ? ctx.ss.getSheetByName('Household_Ledger') : null;
+  if (!sheet) { out.reason = 'no-sheet'; return out; }
+  var header = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
+  var idx = function (n) { return header.indexOf(n); };
+  var iType = idx('HousingType'), iRent = idx('MonthlyRent'), iStatus = idx('Status'),
+      iFormed = idx('FormedCycle'), iHood = idx('Neighborhood'), iDrift = idx(LEASE_DRIFT_COLUMN_);
+  if (iRent < 0 || iType < 0 || iFormed < 0 || iHood < 0) { out.reason = 'columns-missing'; return out; }
+  var data = sheet.getDataRange().getValues();
+  if (data.length < 2) { out.reason = 'no-households'; return out; }
+  var body = data.slice(1);
+  var state = ctx.summary && ctx.summary.neighborhoodState ? ctx.summary.neighborhoodState : {};
+  var due = [];
+  for (var r = 0; r < body.length; r++) {
+    var row = body[r];
+    if (iStatus >= 0 && String(row[iStatus] == null ? 'active' : row[iStatus]).trim().toLowerCase() !== 'active') continue;
+    if (String(row[iType] == null ? '' : row[iType]).trim().toLowerCase() !== 'rented') continue;
+    var formed = Number(row[iFormed]);
+    if (!isFinite(formed) || formed < 1) continue;
+    var age = Number(cycle) - formed;
+    if (age <= 0 || age % every !== 0) continue;
+    if (iDrift >= 0 && Number(row[iDrift]) === Number(cycle)) continue; // already drifted this Cycle (rerun)
+    var rent = Number(row[iRent]);
+    if (!(rent > 0)) continue;
+    var stH = state[String(row[iHood] == null ? '' : row[iHood]).trim()];
+    var med = stH ? Number(stH.medianRent) : NaN;
+    if (!(med > 0)) { out.noLevel++; continue; } // unpriced geography: the lease is its own number
+    due.push({ r: r, rent: rent, level: Math.round(med) });
+  }
+  if (!due.length) { out.reason = 'none-due'; return out; }
+  if (iDrift < 0) {
+    var lastCol = sheet.getLastColumn();
+    if (lastCol + 1 > sheet.getMaxColumns()) sheet.insertColumnsAfter(sheet.getMaxColumns(), 1);
+    sheet.getRange(1, lastCol + 1, 1, 1).setValues([[LEASE_DRIFT_COLUMN_]]);
+    out.armed = true;
+    header = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
+    data = sheet.getDataRange().getValues();
+    body = data.slice(1);
+    idx = function (n) { return header.indexOf(n); };
+    iRent = idx('MonthlyRent'); iDrift = idx(LEASE_DRIFT_COLUMN_);
+  }
+  var n = body.length;
+  var dueByRow = {};
+  for (var d = 0; d < due.length; d++) dueByRow[due[d].r] = due[d];
+  var rentVec = [], driftVec = [];
+  var touched = false;
+  for (var rr = 0; rr < n; rr++) {
+    var cur = body[rr][iRent];
+    var curD = body[rr][iDrift];
+    var du = dueByRow[rr];
+    if (du) {
+      var next = Math.round(du.rent + (du.level - du.rent) * share);
+      if (next !== du.rent) { cur = next; body[rr][iRent] = next; out.drifted++; }
+      curD = Number(cycle); body[rr][iDrift] = curD;
+      touched = true;
+    }
+    rentVec.push([cur === undefined ? '' : cur]);
+    driftVec.push([curD === undefined ? '' : curD]);
+  }
+  if (touched) {
+    sheet.getRange(2, iRent + 1, n, 1).setValues(rentVec);
+    sheet.getRange(2, iDrift + 1, n, 1).setValues(driftVec);
+  }
+  out.reason = 'written';
+  Logger.log('householdFormationEngine: engine.256 lease drift — ' + out.drifted + ' lease(s) drifted toward hood levels' +
+    (out.armed ? ' (receipt column armed)' : '') + (out.noLevel ? ', ' + out.noLevel + ' unpriced skipped' : ''));
+  return out;
+}
+
 
 // ════════════════════════════════════════════════════════════════════════════
 // BIRTHS, MARRIAGES, DIVORCES
```
