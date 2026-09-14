# engine.218 — applied-diff review for Codex (engine-sheet S459, 2026-09-14)

Patch `output/codex/hospital-income-persistence.patch` applied to the working tree at HEAD `60b7e239` with `git apply` (apply --check clean first). NOT committed. No sync, deploy, fire, push, engine.201 revert or owner-draw change.

## Evidence

| Check | Result |
|---|---|
| `git apply --check` | clean |
| `node --check` × 4 substrate files | ok |
| `git diff --check` | clean |
| `scripts/hospitalIncomePersistence.test.js` (no HOSPITAL_ENGINE_ROOT, no preload) | 39 passed, 0 failed |
| `scripts/hoodIncome.test.js` | 74 passed |
| `scripts/careerStage.test.js` | 83 passed |
| `scripts/hospitalTalkback.test.js` | 24 passed |
| `scripts/citizenDialMultiCycle.test.js` | 17 passed |
| `scripts/griefPeriod.test.js` | 38 passed |
| `scripts/auditFunctionCollisions.js` | 1364 top-level names unique, 0 collisions (new: `hospitalIncomeHit_`, `setHospitalIncomeState_`) |
| `scripts/stubEngine.js` regen (engine rule: structure change → STUB_MAP in the same commit) | 183 files / 1391 functions; picks up the two new functions |

Diff stat (substrate): generationalEventsEngine.js +4, generationalWealthEngine.js +42/−2, runCareerEngine.js +7, compressLifeHistory.js +12/−4 → 64 insertions, 7 deletions.

## Review findings (engine-sheet)

1. **Scope of the two helpers.** Defined in `generationalWealthEngine.js` (Phase 5) but called from `generationalEventsEngine.js` (Phase 4) and `runCareerEngine.js` (Phase 5). Apps Script global scope makes this legal and the collision audit is clean; the test's vm sandbox loads all four files so it proves the same shape. Fine as cut; noting the cross-phase definition site for the wiring card.
2. **Parser tags the new line correctly.** `parseLifeHistoryEntries_` tag-only branch (`compressLifeHistory.js` ~:755, `/^\[([^\]]+)\]\s*(.*)$/`) yields `tag='HospitalIncomeState'`, same path `[CareerState]` already takes. Verified, not assumed.
3. **Scheduler order confirmed** as you stated: both entries run Career → Generational health → Wealth (`godWorldEngine2.js:360/364/385` and `:2105/2109/2130`). Career writes the state at the loss; the health transition the same Cycle re-keys it to the new StatusStartCycle; the floors then read the re-keyed line. Consistent with the 39-case proof.
4. **Readers do not see the metadata line.** `citizen-wake.js` and `citizenContextBuilder.js:483` read `LifeHistory_Log` (the tab), not the LifeHistory cell — so `[HospitalIncomeState]` never reaches a citizen's context, same as `[CareerState]` today. No stripper needed.
5. **Fail-loud throw** in `hospitalIncomeHit_` on a malformed state line halts the Phase-4/5 loop for the whole Cycle (Engine_Errors). House style (every former fallback throws); the only writer is `setHospitalIncomeState_`, so a malformed line means a hand edit. Accepting; flagging so the bench readback greps Engine_Errors for "Invalid HospitalIncomeState".
6. **Stub map regen carries engine.214's structure too** (`districtMoodLevel_`, `hoodMoodEma_`, `moodLevelOf_`, `S.canonHoods`, `S.approvalHoodMoodEma`) because engine.214 sits at HEAD un-reverted and was never stub-mapped. The map is a truthful scan of HEAD; it is not a substrate change. If you want the engine.214 lines kept out of this commit, say so and I will commit the map separately.
7. **Docs.** `SIMULATION_LEDGER.md` §Hospital income persistence and the `SPREADSHEET.md` paragraph read correctly against the code: format string matches `setHospitalIncomeState_`, `hit` = original admission key (not the loss Cycle), removal on recovery, floors honour it, owner draw untouched, log keeps the narrative event. One wording nit, not blocking: both say "proposed 2026-09-14" — flip to "landed <sha>" in the landing commit or the doc reads stale the moment it ships. ROLLOUT engine.218 row survived `60b7e239` (one row, pointer + "predicate gaps: plan Changelog 2026-09-14").

## Intended commit paths (single commit, path-specific add)

- phase04-events/generationalEventsEngine.js
- phase05-citizens/runCareerEngine.js
- phase05-citizens/generationalWealthEngine.js
- utilities/compressLifeHistory.js
- scripts/hospitalIncomePersistence.test.js (new)
- docs/SIMULATION_LEDGER.md
- docs/SPREADSHEET.md
- docs/plans/2026-08-29-employment-system-cascade.md (your D7 section + my one changelog line)
- docs/engine/ENGINE_STUB_MAP.md, ENGINE_STUB_REVERSE.md, ENGINE_STUB_REVERSE.json (regen)

Not in the commit: ROLLOUT (row already landed), the 55 runtime `output/` drifts, `scripts/notebooklmCanonSources.json`.

Awaiting your go (or corrections) before `git commit`.

## Applied diff (substrate, verbatim)

diff --git a/phase04-events/generationalEventsEngine.js b/phase04-events/generationalEventsEngine.js
index c6728957..3ebc5104 100644
--- a/phase04-events/generationalEventsEngine.js
+++ b/phase04-events/generationalEventsEngine.js
@@ -407,6 +407,10 @@ function runGenerationalEngine_(ctx) {
         });
 
         if (healthResult.newStatus !== status) {
+          var carriedIncomeHit = hospitalIncomeHit_(status, statusStartCycle, row[iLife]);
+          var continuesHospital = healthResult.newStatus === 'hospitalized' || healthResult.newStatus === 'critical';
+          row[iLife] = setHospitalIncomeState_(row[iLife], continuesHospital ? cycle : 0,
+            continuesHospital ? carriedIncomeHit : 0);
           if (iStatusStart >= 0) {
             row[iStatusStart] = (healthResult.newStatus === "active") ? "" : cycle;
           }
diff --git a/phase05-citizens/generationalWealthEngine.js b/phase05-citizens/generationalWealthEngine.js
index 5c8b9074..b64fa0a2 100644
--- a/phase05-citizens/generationalWealthEngine.js
+++ b/phase05-citizens/generationalWealthEngine.js
@@ -573,6 +573,42 @@ function calculateCitizenIncomes_(ctx) {
  * Reads Business_Ledger once (read-only; the Phase-10 ledger persist commits
  * the Income change like every other ctx.ledger mutation).
  */
+// Hospital pay state is separate from the narrative loss event. StatusStartCycle
+// measures the current health status, so transitions carry the original hit
+// forward under the new status start; recovery ends eligibility.
+function hospitalIncomeHit_(status, statusStart, lifeHistory) {
+  status = String(status || '').toLowerCase().trim();
+  var start = Number(statusStart);
+  if ((status !== 'hospitalized' && status !== 'critical') ||
+      !isFinite(start) || start <= 0) return 0;
+  var life = String(lifeHistory || '');
+  var lines = life.split('\n');
+  for (var i = lines.length - 1; i >= 0; i--) {
+    if (lines[i].indexOf('[HospitalIncomeState]') !== 0) continue;
+    var match = lines[i].match(/^\[HospitalIncomeState\] statusStart=(\d+)\|hit=(\d+)$/);
+    if (!match || !isFinite(Number(match[1])) || Number(match[1]) <= 0 ||
+        !isFinite(Number(match[2])) || Number(match[2]) <= 0 || Number(match[2]) > Number(match[1])) {
+      throw new Error('Invalid HospitalIncomeState metadata');
+    }
+    return Number(match[1]) === start ? Number(match[2]) : 0;
+  }
+  // Existing admissions already have a Career-Health marker, but no state line.
+  return life.indexOf('[IncomeHit A' + start + ']') >= 0 ? start : 0;
+}
+
+function setHospitalIncomeState_(lifeHistory, statusStart, hit) {
+  var life = String(lifeHistory || '');
+  var lines = life ? life.split('\n') : [];
+  var out = [];
+  for (var i = 0; i < lines.length; i++) {
+    if (lines[i].indexOf('[HospitalIncomeState]') !== 0) out.push(lines[i]);
+  }
+  if (statusStart > 0 && hit > 0) {
+    out.push('[HospitalIncomeState] statusStart=' + statusStart + '|hit=' + hit);
+  }
+  return out.join('\n');
+}
+
 function applyTrackedEmployerFloor_(ctx) {
   var out = { checked: 0, raised: 0 };
   var header = ctx.ledger && ctx.ledger.headers, rows = ctx.ledger && ctx.ledger.rows;
@@ -580,7 +616,8 @@ function applyTrackedEmployerFloor_(ctx) {
   var idx = function(n) { return header.indexOf(n); };
   var iIncome = idx('Income'), iEmp = idx('EmployerBizId'), iStage = idx('CareerStage'),
       iStatus = idx('Status'), iTier = idx('Tier'), iClock = idx('ClockMode'), iEcon = idx('EconomicProfileKey'),
-      iRole = idx('RoleType'), iTags = idx('SkillTags'), iPop = idx('POPID'); // engine.169
+      iRole = idx('RoleType'), iTags = idx('SkillTags'), iPop = idx('POPID'),
+      iStatusStart = idx('StatusStartCycle'), iLife = idx('LifeHistory'); // hospital income persistence
   if (iIncome < 0 || iEmp < 0 || iStage < 0) return out;
 
   var bizSheet = ctx.ss ? ctx.ss.getSheetByName('Business_Ledger') : null;
@@ -613,6 +650,7 @@ function applyTrackedEmployerFloor_(ctx) {
     if (isSportsLayerRow_(row, iClock, iEcon)) continue; // engine.162: GAME only; CIVIC/MEDIA rejoined 2026-09-04
     var status = String(row[iStatus] || 'active').toLowerCase();
     if (status === 'deceased' || status === 'retired' || status === 'inactive') continue;
+    if (hospitalIncomeHit_(status, row[iStatusStart], row[iLife])) continue;
     var tier = iTier >= 0 ? Number(row[iTier]) : 4;
     if (tier === 1 || tier === 2) continue;
     var employer = String(row[iEmp] || '').trim();
@@ -833,7 +871,8 @@ function applyUntrackedJobReference_(ctx) {
   var idx = function(n) { return header.indexOf(n); };
   var iIncome = idx('Income'), iEmp = idx('EmployerBizId'), iStage = idx('CareerStage'), iStatus = idx('Status'),
       iTier = idx('Tier'), iClock = idx('ClockMode'), iEcon = idx('EconomicProfileKey'), iHood = idx('Neighborhood'),
-      iRole = idx('RoleType'), iTags = idx('SkillTags'), iPop = idx('POPID');
+      iRole = idx('RoleType'), iTags = idx('SkillTags'), iPop = idx('POPID'),
+      iStatusStart = idx('StatusStartCycle'), iLife = idx('LifeHistory');
   if (iIncome < 0 || iEmp < 0 || iStage < 0) return out;
   for (var r = 0; r < rows.length; r++) {
     var row = rows[r];
@@ -841,6 +880,7 @@ function applyUntrackedJobReference_(ctx) {
     if (isSportsLayerRow_(row, iClock, iEcon)) continue; // engine.162: GAME only; CIVIC/MEDIA rejoined 2026-09-04
     var status = String(row[iStatus] || 'active').toLowerCase();
     if (status === 'deceased' || status === 'retired' || status === 'inactive') continue;
+    if (hospitalIncomeHit_(status, row[iStatusStart], row[iLife])) continue;
     var tier = iTier >= 0 ? Number(row[iTier]) : 4;
     if (tier === 1 || tier === 2) continue;
     var employer = String(row[iEmp] || '').trim();
diff --git a/phase05-citizens/runCareerEngine.js b/phase05-citizens/runCareerEngine.js
index 00647fb0..0b470ce5 100644
--- a/phase05-citizens/runCareerEngine.js
+++ b/phase05-citizens/runCareerEngine.js
@@ -935,6 +935,12 @@ function runCareerEngine_(ctx) {
     if (healthStatus === "hospitalized" || healthStatus === "critical") {
       var admitC = iStatusStart >= 0 ? (Number(row[iStatusStart]) || 0) : 0;
       var hitMarker = "[IncomeHit A" + admitC + "]";
+      var priorHit = hospitalIncomeHit_(healthStatus, admitC, existing);
+      if (priorHit) {
+        row[iLife] = setHospitalIncomeState_(existing, admitC, priorHit);
+        if (row[iLife] !== existing) ctx.ledger.dirty = true;
+        continue;
+      }
       var hospIncome = iIncome >= 0 ? (Number(row[iIncome]) || 0) : 0;
       var hospEconOk = iEconKey >= 0 && row[iEconKey] &&
         String(row[iEconKey]).trim() !== "" && String(row[iEconKey]).trim() !== "SPORTS_OVERRIDE";
@@ -944,6 +950,7 @@ function runCareerEngine_(ctx) {
         var hitText = "Extended hospital stay cut into earnings";
         var hitLine = inWorldStamp_(ctx) + " — [Career-Health] " + hitText + " " + hitMarker;
         row[iLife] = existing ? (existing + "\n" + hitLine) : hitLine;
+        row[iLife] = setHospitalIncomeState_(row[iLife], admitC, admitC);
         row[iLastUpd] = ctx.now;
         logRows.push([ctx.now, row[iPopID], '', "Career-Health", hitText, '', cycle]);
         rows[r] = row;
diff --git a/utilities/compressLifeHistory.js b/utilities/compressLifeHistory.js
index f6351dfa..ba6f8560 100644
--- a/utilities/compressLifeHistory.js
+++ b/utilities/compressLifeHistory.js
@@ -500,7 +500,8 @@ function compressLifeHistory_(ctx, options) {
       if (lastUpdate > 0 && (cycle - lastUpdate) < MIN_CYCLES_BETWEEN_COMPRESS) compressEligible = false;
     }
     var entries = lifeHistory ? parseLifeHistoryEntries_(lifeHistory).entries : null;
-    if (compressEligible && (!entries || entries.length < 3)) compressEligible = false;
+    var eventEntries = entries ? entries.filter(function(entry) { return entry.tag !== 'HospitalIncomeState'; }) : [];
+    if (compressEligible && eventEntries.length < 3) compressEligible = false;
 
     // engine.177 (S438): the WATERMARK fold. Every stamped entry (Y<n>C<m> -> entry.cycle)
     // newer than DialState.folded folds THIS cycle, whatever the trim cadence says. The
@@ -513,7 +514,7 @@ function compressLifeHistory_(ctx, options) {
     if (entries && entries.length) {
       for (var ne = 0; ne < entries.length; ne++) {
         var neC = entries[ne].cycle;
-        if (neC != null && neC > 0 && neC > foldedMark && entries[ne].tag !== 'CareerState') newEntries.push(entries[ne]); // cycle <= 0 (C0 / C?) = legacy, folds at trim
+        if (neC != null && neC > 0 && neC > foldedMark && entries[ne].tag !== 'CareerState' && entries[ne].tag !== 'HospitalIncomeState') newEntries.push(entries[ne]); // cycle <= 0 (C0 / C?) = legacy, folds at trim
       }
     }
     var moodPending = false;
@@ -630,8 +631,8 @@ function compressLifeHistory_(ctx, options) {
 
     if (compressEligible) {
       // derive the readable face from BASE (stable identity, no run-to-run flicker)
-      row[iTraitProfile] = formatDialFace_(c, entries, cycle);
-      if (trimHistory && entries.length > KEEP_RAW_ENTRIES) {
+      row[iTraitProfile] = formatDialFace_(c, eventEntries, cycle);
+      if (trimHistory && eventEntries.length > KEEP_RAW_ENTRIES) {
         row[iLifeHistory] = trimLifeHistory_(entries, KEEP_RAW_ENTRIES, dialFaceShim_(c), cycle);
       }
     }
@@ -1058,10 +1059,13 @@ function shortHash_(s) {
 function trimLifeHistory_(entries, keepCount, profile, cycle) {
   // Extract CareerState lines - these must persist (Career Engine reads them back)
   var careerStateEntry = null;
+  var hospitalIncomeEntry = null;
   var filteredEntries = [];
   for (var k = 0; k < entries.length; k++) {
     if (entries[k].tag === 'CareerState') {
       careerStateEntry = entries[k]; // Keep most recent CareerState
+    } else if (entries[k].tag === 'HospitalIncomeState') {
+      hospitalIncomeEntry = entries[k]; // Causal pay state, never a foldable life event
     } else {
       filteredEntries.push(entries[k]);
     }
@@ -1070,6 +1074,7 @@ function trimLifeHistory_(entries, keepCount, profile, cycle) {
   if (filteredEntries.length <= keepCount) {
     var lines = [];
     if (careerStateEntry) lines.push(careerStateEntry.raw);
+    if (hospitalIncomeEntry) lines.push(hospitalIncomeEntry.raw);
     for (var i = 0; i < filteredEntries.length; i++) lines.push(filteredEntries[i].raw);
     return lines.join('\n');
   }
@@ -1082,6 +1087,7 @@ function trimLifeHistory_(entries, keepCount, profile, cycle) {
 
   var newLines = [];
   if (careerStateEntry) newLines.push(careerStateEntry.raw);
+  if (hospitalIncomeEntry) newLines.push(hospitalIncomeEntry.raw);
   newLines.push(compressedLine);
   for (var j = 0; j < recentEntries.length; j++) newLines.push(recentEntries[j].raw);
 
@@ -1444,7 +1450,7 @@ var UNLIVED_BRANCH_TAGS = { careershift: 1, relocation: 1, divorce: 1, retiremen
 function foldAgedOutEntries_(c, entries, keepCount, regs, unstampedOnly) {
   var filtered = [];
   for (var k = 0; k < entries.length; k++) {
-    if (entries[k].tag !== 'CareerState') filtered.push(entries[k]);
+    if (entries[k].tag !== 'CareerState' && entries[k].tag !== 'HospitalIncomeState') filtered.push(entries[k]);
   }
   if (filtered.length <= keepCount) return 0; // nothing ages out -> nothing folds
   var oldCount = filtered.length - keepCount;
