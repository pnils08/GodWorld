# Adversarial Review: Care & Justice Schema vs. Engine Codebase

**Date:** 2026-09-29  
**Reviewer:** Antigravity (Standing Adversarial Reviewer)  
**Target Specification:** `docs/plans/2026-09-21-care-and-justice-system.md` section "Schema — receipt and census" (commit `1e3aad5f`)  
**Scope Inspected:**
- [`phase10-persistence/buildCyclePacket.js:811-1009`](file:///root/GodWorld/phase10-persistence/buildCyclePacket.js#L811-L1009) (`persistHospitalLedger_`, open-bed indexing, ghost-bed and missed-admission reconciles, census object)
- [`phase03-population/applyDemographicDrift.js:215-245`](file:///root/GodWorld/phase03-population/applyDemographicDrift.js#L215-L245) (Hospital talk-back, open admission count, illness strain)
- [`phase04-events/generationalEventsEngine.js:382-413`](file:///root/GodWorld/phase04-events/generationalEventsEngine.js#L382-L413) (Health lifecycle transition execution, event logging, status updates)
- [`phase03-population/updateNeighborhoodDemographics.js:118-135`](file:///root/GodWorld/phase03-population/updateNeighborhoodDemographics.js#L118-L135) (Tracked neighborhood demographics table sum vs. `S.worldPopulation.totalPopulation`)

---

## Executive Summary

| Item | Question / Area | Verdict | Summary Finding |
|---|---|---|---|
| **Q1** | Status precedence & ghost-bed / recovery stall | **CLEAN PASS (WITH LIFECYCLE DEFECT)** | Ranking the 5 health states above `detained` completely prevents the ghost-bed reconcile (`buildCyclePacket.js:945`) from releasing beds and ensures `processHealthLifecycle_` (`generationalEventsEngine.js:382-387`) executes. However, upon recovery, `generationalEventsEngine.js:390` unconditionally sets `Status` to `'active'`, erasing custody instead of restoring `'detained'`. |
| **Q2** | Invariant B under `in-custody` measure | **MATHEMATICAL PASS** | Invariant B ($Closing = Opening + Intakes + TransfersIn - Exits - TransfersOut + Corrections$) holds across arrest ($C$), next-Cycle decision ($C+1$), held states ($C+2$), release ($C+3$), and transfer-to-treatment. Every flow is partitioned without leak or double-counting. |
| **Q3** | Invariant C & `unallocated` scope population | **CANONICAL PASS** | Neither Invariant C nor `unallocated` forces a neighborhood population to be invented. `unallocated` is an anonymous residual ($Total - TableSum$) using `updateNeighborhoodDemographics.js:125-135` figures, leaving `Neighborhood` strictly blank per canon rules. |
| **Q4** | Absent typed rows & `-2` row-id suffix | **FAIL (SAFETY) / CONDITIONAL PASS (INDEX)** | "Absent typed row = zero when complete" is **unsafe** for general readers, creating an omission trap for `incomplete`/`unavailable` scopes. The `-2` row-id suffix survives `openByPopId` because the map keys on `POPID` (`data[r][1]`), but `buildCyclePacket.js:893` hardcodes ID generation without suffix logic. |
| **Diff** | Schema vs. Code Contradictions | **7 CONTRADICTIONS IDENTIFIED** | Row truncation (11 cols vs 15 cols), missing `SourceSystem = 'reconcile'`, talk-back measuring `in-care` rather than `beds`, duplicate same-cycle row IDs, hardcoded 5-column discharge ranges, and custody erasure on recovery. |

---

## Closed Question Evaluations

### (1) With the five health states ranked above 'detained' in Status, can the ghost-bed reconcile or the health lifecycle ever drop a bed or stall a recovery for a citizen with an open judicial case?

**Verdict: NO.**

#### File:Line Evidence & Mechanism Analysis

1. **Ghost-Bed Reconcile Protection:**
   In [`phase10-persistence/buildCyclePacket.js:930-945`](file:///root/GodWorld/phase10-persistence/buildCyclePacket.js#L930-L945):
   ```javascript
   930:   var HEALTH_STATES_102 = ['hospitalized', 'critical', 'recovering', 'injured', 'serious-condition'];
   ...
   943:         var gStatus = liveStatus[gPop];
   944:         if (gStatus === undefined) continue; // not in ledger — leave for manual triage, don't guess
   945:         if (HEALTH_STATES_102.indexOf(gStatus) >= 0) continue; // genuinely still a patient
   946:         var gRow = openByPopId[gPop];
   947:         var gAdmit = Number(data[gRow][5]) || cycle;
   948:         var gOutcome = (gStatus === 'deceased') ? 'deceased' : 'recovered';
   949:         persistWithRetry_(function() {
   950:           sheet.getRange(gRow + 1, 7, 1, 5).setValues([[
   951:             gStatus, cycle, cycle, gOutcome + '-reconciled', Math.max(0, cycle - gAdmit)
   952:           ]]);
   953:         }, 'Hospital_Ledger ghost-release');
   ```
   - When a citizen with an open judicial case is admitted to care, their ledger `Status` holds one of the five health states (`hospitalized`, `critical`, `serious-condition`, `injured`, `recovering`) because health states outrank `detained` per schema §Custody and care overlap.
   - At line 945, `HEALTH_STATES_102.indexOf(gStatus) >= 0` evaluates to `true`.
   - The reconcile triggers `continue;`, entirely skipping lines 946–959. The hospital row remains open in `openByPopId`, and the bed is **never dropped**.
   - *(Note: Had `detained` outranked health states, `gStatus` would be `'detained'`, line 945 would evaluate to `false`, and lines 949–955 would erroneously release the bed as a ghost).*

2. **Health Lifecycle Non-Stall Guarantee:**
   In [`phase04-events/generationalEventsEngine.js:382-387`](file:///root/GodWorld/phase04-events/generationalEventsEngine.js#L382-L387):
   ```javascript
   382:     if (status === "hospitalized" || status === "critical" || status === "recovering" ||
   383:         status === "injured" || status === "serious-condition") {
   384:       var healthResult = processHealthLifecycle_(
   385:         ctx, popId, name, status, statusDuration, age, tier,
   386:         healthCause, neighborhood, cycle, calendarContext
   387:       );
   ```
   - Because `status` reflects the health state rather than `detained`, the conditional expression at lines 382–383 evaluates to `true`.
   - `processHealthLifecycle_` executes every cycle as intended. The recovery arc advances without interruption. Recovery is **never stalled**.
   - *(Note: Had `detained` outranked health states, line 382 would evaluate to `false`, completely skipping lifecycle execution for the citizen).*

3. **Downstream Defect (Care Exit Does Not Restore Custody):**
   While the bed is preserved and recovery is not stalled *during* care, the code currently fails on recovery completion. At [`phase04-events/generationalEventsEngine.js:390`](file:///root/GodWorld/phase04-events/generationalEventsEngine.js#L390):
   ```javascript
   390:         row[iStatus] = healthResult.newStatus;
   ```
   `healthResult.newStatus` returns `'active'`. The engine assigns `'active'` directly to `row[iStatus]`. Because `generationalEventsEngine.js` has no hook checking `Judicial_Ledger` for an open case, it overwrites `Status` with `'active'` rather than restoring `'detained'`, violating schema line 203 ("When care ends, Status becomes detained if the case is still open").

---

### (2) Does invariant B hold for the judicial system under the 'in-custody' measure across arrest, next-Cycle decision, held, release and transfer-to-treatment? Walk one case Cycle by Cycle.

**Verdict: YES.**

#### Invariant B Specification
From `docs/plans/2026-09-21-care-and-justice-system.md:231`:
$$\text{ClosingOccupancy} = \text{OpeningOccupancy} + \text{TotalIntakes} + \text{TransfersIn} - \text{Exits} - \text{TransfersOut} + \text{Corrections}$$

- **Occupancy Measure:** `in-custody` = count of open cases with $\text{StatusNow} \in \{\text{`pending`}, \text{`held`}\}$ (line 219).
- **Intake:** $\text{EntryType} = \text{`arrest`}$ counts as $\text{TotalIntakes} = 1$ (line 220).
- **Transfers Out:** $\text{Outcome} = \text{`diverted`}$ with `TransferToId` set counts strictly as $\text{TransfersOut} = 1$ (line 221).
- **Exits:** $\text{Outcome} \in \{\text{`released`}, \text{`held-served`}, \text{`diverted` (no bed)}, \text{`deceased`}\}$ counts strictly as $\text{Exits} = 1$ (line 221).
- **Exclusivity:** A departing case is an Exit or a Transfer, "never both" (line 221).

#### Cycle-by-Cycle Case Walkthrough

Let the baseline system occupancy before this citizen's case be $O$.

```
 Cycle C (Arrest)          Cycle C+1 (Decision)      Cycle C+2 (Held)          Cycle C+3 (Release)
┌────────────────────┐    ┌────────────────────┐    ┌────────────────────┐    ┌────────────────────┐
│ Opening: O         │    │ Opening: O + 1     │    │ Opening: O + 1     │    │ Opening: O + 1     │
│ Intakes: +1        │    │ Intakes: 0         │    │ Intakes: 0         │    │ Intakes: 0         │
│ Flows: 0           │    │ Flows: 0           │    │ Flows: 0           │    │ Exits: -1          │
│ Status: 'pending'  │    │ Status: 'held'     │    │ Status: 'held'     │    │ Status: 'released' │
│ Closing: O + 1     │    │ Closing: O + 1     │    │ Closing: O + 1     │    │ Closing: O         │
└────────────────────┘    └────────────────────┘    └────────────────────┘    └────────────────────┘
```

1. **Cycle C — Arrest:**
   - **OpeningOccupancy:** $O$
   - **Event:** Citizen is arrested. `TotalIntakes` = 1.
   - **Case State:** Row opens with `StatusNow = 'pending'`.
   - **Flows:** $\text{TransfersIn} = 0$, $\text{Exits} = 0$, $\text{TransfersOut} = 0$, $\text{Corrections} = 0$.
   - **Closing StatusNow:** `'pending'` $\in \{\text{`pending`}, \text{`held`}\} \implies \text{ClosingOccupancy} = O + 1$.
   - **Invariant B Check:**
     $$\text{Closing} = O + 1 + 0 - 0 - 0 + 0 = O + 1 \quad \text{(HOLDS)}$$

2. **Cycle C+1 — Next-Cycle Decision (Branch A: Held):**
   - **OpeningOccupancy:** $O + 1$ (carried forward from Cycle C).
   - **Event:** `DecisionCycle = C + 1` arrives. Judge orders detention until Cycle $C+3$.
   - **Case State:** `StatusNow` transitions from `'pending'` to `'held'`.
   - **Flows:** Citizen did not enter or leave custody. $\text{TotalIntakes} = 0$, $\text{TransfersIn} = 0$, $\text{Exits} = 0$, $\text{TransfersOut} = 0$, $\text{Corrections} = 0$.
   - **Closing StatusNow:** `'held'` $\in \{\text{`pending`}, \text{`held`}\} \implies \text{ClosingOccupancy} = O + 1$.
   - **Invariant B Check:**
     $$\text{Closing} = (O + 1) + 0 + 0 - 0 - 0 + 0 = O + 1 \quad \text{(HOLDS)}$$

3. **Cycle C+2 — Serving Detention:**
   - **OpeningOccupancy:** $O + 1$.
   - **Event:** Case remains open; citizen serves sentence.
   - **Case State:** `StatusNow` remains `'held'`.
   - **Flows:** $\text{TotalIntakes} = 0$, $\text{TransfersIn} = 0$, $\text{Exits} = 0$, $\text{TransfersOut} = 0$, $\text{Corrections} = 0$.
   - **Closing StatusNow:** `'held'` $\in \{\text{`pending`}, \text{`held`}\} \implies \text{ClosingOccupancy} = O + 1$.
   - **Invariant B Check:**
     $$\text{Closing} = (O + 1) + 0 - 0 = O + 1 \quad \text{(HOLDS)}$$

4. **Cycle C+3 — Release / Held-Served:**
   - **OpeningOccupancy:** $O + 1$.
   - **Event:** `HeldUntilCycle = C + 3` reached. Outcome stamped `held-served`.
   - **Case State:** `StatusNow` transitions to `'released'` (or `'closed'`).
   - **Flows:** Per schema line 221, `held-served` maps to $\text{Exits} = 1$. $\text{TotalIntakes} = 0$, $\text{TransfersIn} = 0$, $\text{TransfersOut} = 0$, $\text{Corrections} = 0$.
   - **Closing StatusNow:** Not in $\{\text{`pending`}, \text{`held`}\} \implies \text{ClosingOccupancy} = O$.
   - **Invariant B Check:**
     $$\text{Closing} = (O + 1) + 0 + 0 - 1 - 0 + 0 = O \quad \text{(HOLDS)}$$

5. **Alternative Branch: Transfer-to-Treatment (e.g., at Cycle C+1 Decision):**
   - **OpeningOccupancy:** $O + 1$.
   - **Event:** At Decision Cycle $C+1$, citizen is diverted to treatment with `TransferToId` populated.
   - **Case State:** `StatusNow` transitions to `'diverted'`.
   - **Flows:** Per schema line 221, diversion with a bed maps strictly to $\text{TransfersOut} = 1$ and $\text{Exits} = 0$. $\text{TotalIntakes} = 0$, $\text{TransfersIn} = 0$, $\text{Corrections} = 0$.
   - **Closing StatusNow:** Not in $\{\text{`pending`}, \text{`held`}\} \implies \text{ClosingOccupancy} = O$.
   - **Invariant B Check:**
     $$\text{Closing} = (O + 1) + 0 + 0 - 0 - 1 + 0 = O \quad \text{(HOLDS)}$$

---

### (3) Does any invariant or the 'unallocated' scope force a neighbourhood population value to be invented?

**Verdict: NO.**

#### File:Line Evidence & Mathematical Derivation

1. **Tracked Neighborhood Table vs. City Population:**
   In [`phase03-population/updateNeighborhoodDemographics.js:125-135`](file:///root/GodWorld/phase03-population/updateNeighborhoodDemographics.js#L125-L135):
   ```javascript
   125:   var tableSum249 = 0, sizeWeightSum249 = 0;
   126:   for (var h249 = 0; h249 < liveHoodNames.length; h249++) {
   127:     var d249 = demographics[liveHoodNames[h249]];
   128:     var pop249 = (Number(d249.students) || 0) + (Number(d249.adults) || 0) + (Number(d249.seniors) || 0);
   129:     tableSum249 += pop249;
   130:     var mod249 = neighborhoodModifiers[liveHoodNames[h249]] || { inflowMod: 1 };
   131:     sizeWeightSum249 += pop249 * (Number(mod249.inflowMod) || 0);
   132:   }
   133:   var cityPop249 = Number(S.worldPopulation && S.worldPopulation.totalPopulation);
   134:   if (!(cityPop249 > 0)) throw new Error('updateNeighborhoodDemographics_: S.worldPopulation.totalPopulation missing — cannot scale migration to the tracked table (engine.249)');
   135:   var appliedMigration249 = migration * (tableSum249 / cityPop249);
   ```
   - As documented in line 119, the tracked neighborhood table accounts for only $\sim 11\%$ of the total city population (`tableSum249`), while the rest of the city ($\sim 89\%$) exists as background population within `S.worldPopulation.totalPopulation` (`cityPop249`).

2. **Schema Definition of `unallocated` Scope:**
   From `docs/plans/2026-09-21-care-and-justice-system.md:217-218`:
   - `GeographicScope = 'unallocated'`: explicitly defined as `(city population minus the hood table's sum; Neighborhood blank; never a named place)`.
   - `PopulationBasis = 'city-remainder'`: dynamically calculated as $\text{CoveredPopulation} = \text{cityPop249} - \text{tableSum249}$.
   - Line 224: `"Tracked citizens are counted inside the hood they live in, once. Other residents are numbers only: no POPID, no name."`
   - Invariant C (line 232): `city row = sum of hood rows + unallocated, per System and IntakeType`.

3. **Canon Integrity:**
   - GodWorld canon rules (`AGENTS.md` §World and canon rules) explicitly forbid fabricating neighborhoods, populations, or statistics.
   - `unallocated` acts as an anonymous arithmetic balancing bucket. It leaves `Neighborhood` empty and attributes zero individuals to synthetic geographic names.
   - Invariant C balances mathematically without inventing any named places or estimating demographic splits for untracked areas.

---

### (4) Is 'absent typed row = zero when complete' safe, and does the '-2' row-id suffix survive the POPID-keyed open index?

**Verdict:**
- **Part A ('absent typed row = zero when complete'): UNSAFE.**
- **Part B ('-2' row-id suffix in open index): SURVIVES (CONDITIONAL ON UNIQUE ROWS), BUT GENERATION CODE IS MISSING.**

#### Part A: Safety Analysis of Sparse Typed Rows

1. **The Omission Trap:**
   - In `docs/plans/2026-09-21-care-and-justice-system.md:222-223`, typed rows are sparse (omitted if counts are zero), while `all` is always written. In a scope marked `complete`, an absent typed row represents zero.
   - However, if write failures occur (`incomplete`) or source data is absent (`unavailable`), the typed row is *also* absent.
   - Any naive reader filtering by `IntakeType` (e.g. `rows.filter(r => r.IntakeType === 'heat')`, matching the pattern seen in `applyDemographicDrift.js:225-235` or `buildDeskPackets.js`) will find 0 rows and default to count = 0. It will fail to detect that the parent scope was `incomplete` or `unavailable`.
   - To safely distinguish true zero from missing data, every consumer is forced to implement a non-trivial two-tier lookup: first locate the parent `all` row for that `(Cycle, System, GeographicScope, Neighborhood)` tuple, verify `Completeness === 'complete'`, and only then interpret the missing typed row as zero.
   - This directly conflicts with Invariant G (line 236: `"Missing source → unavailable, counts blank; known none → 0"`), which dictates explicit zero representation.

#### Part B: `-2` Suffix in `openByPopId`

1. **Keying Independence:**
   In [`phase10-persistence/buildCyclePacket.js:868-873`](file:///root/GodWorld/phase10-persistence/buildCyclePacket.js#L868-L873):
   ```javascript
   868:   // Index open rows (DischargeCycle empty) by POPID — sheet row = index + 1.
   869:   var openByPopId = {};
   870:   for (var r = 1; r < data.length; r++) {
   871:     if (data[r][8] === '' || data[r][8] === null) {
   872:       openByPopId[String(data[r][1])] = r;
   873:     }
   874:   }
   ```
   - Column index 0 (`data[r][0]`) stores the `AdmissionId` (`H-C106-POP-00801` or `H-C106-POP-00801-2`).
   - Column index 1 (`data[r][1]`) stores the bare `POPID` (`POP-00801`).
   - Because `openByPopId` keys strictly on `String(data[r][1])`, an ID ending in `-2` in column 0 has **zero impact** on the dictionary key.
   - Under Invariant E (line 234), a second intake for the same citizen occurs only *after* the prior row has closed. When closed, `data[r][8]` holds `DischargeCycle`, so line 870 skips the closed row. The new admission row with suffix `-2` takes over `openByPopId[key]` cleanly.

2. **The Code Defect (Missing Suffix Logic in Line 893):**
   In [`phase10-persistence/buildCyclePacket.js:893-895`](file:///root/GodWorld/phase10-persistence/buildCyclePacket.js#L893-L895):
   ```javascript
   893:         var newRow = ['H-C' + ev.cycle + '-' + key, ev.popId, ev.name || '',
   894:                       ev.neighborhood || '', ev.cause || '', ev.cycle, ev.to,
   895:                       ev.cycle, '', '', ''];
   ```
   - The writer hardcodes `'H-C' + ev.cycle + '-' + key`.
   - It contains no collision detection or logic to inspect existing rows in `data` to append `-2`.
   - If a citizen is admitted, discharged, and readmitted in the same cycle, line 893 generates a duplicate `AdmissionId`, breaking unique receipt identity.
3. **Single-Open-Row Limit:**
   If two rows for the same POPID were ever open simultaneously in the sheet, line 871 would overwrite `openByPopId[POPID]`, blinding ghost-bed and missed-admission reconciles to the earlier open row.

---

## Codebase vs. Schema Contradictions

Beyond the four primary questions, the following 7 contradictions exist between the specification in `docs/plans/2026-09-21-care-and-justice-system.md` and the four inspected code files:

### 1. Recovery Overwrites `Status` with `'active'`, Obliterating Custody
- **Schema (§Custody and care overlap, line 203):**  
  `"When care ends, Status becomes detained if the case is still open, else PriorStatus."`
- **Code ([`generationalEventsEngine.js:390, 417, 421`](file:///root/GodWorld/phase04-events/generationalEventsEngine.js#L390)):**  
  ```javascript
  390: row[iStatus] = healthResult.newStatus;
  417: row[iStatusStart] = (healthResult.newStatus === "active") ? "" : cycle;
  421: if (healthResult.newStatus === "active" && iHealthCause >= 0) row[iHealthCause] = "";
  ```
  `generationalEventsEngine.js` unconditionally assigns `healthResult.newStatus` (which evaluates to `'active'`) to `row[iStatus]`. It does not check `Judicial_Ledger` or prior status, releasing citizens from detention upon medical recovery.

### 2. Hardcoded 11-Column Arrays Truncate New Columns L–O
- **Schema (§Hospital_Ledger, lines 160–168):**  
  Appends 4 new columns (L–O: `IntakeType`, `SourceSystem`, `SourceEventId`, `TransferFromId`), expanding `Hospital_Ledger` width from 11 to 15 columns.
- **Code ([`buildCyclePacket.js:893-895, 980-981`](file:///root/GodWorld/phase10-persistence/buildCyclePacket.js#L893-L895)):**  
  ```javascript
  893: var newRow = ['H-C' + ev.cycle + '-' + key, ev.popId, ev.name || '',
  894:               ev.neighborhood || '', ev.cause || '', ev.cycle, ev.to,
  895:               ev.cycle, '', '', ''];
  ...
  980: var mRow = ['H-C' + mAdmit + '-' + mPop, mPop, mp.name, mp.neighborhood,
  981:             mp.cause, mAdmit, mp.status, cycle, '', '', ''];
  ```
  Both `newRow` (new admissions) and `mRow` (missed-admission reconcile) write fixed 11-element arrays. Appending these via `appendRowWithRetry_` writes only columns A–K, leaving columns L–O truncated on all newly created rows.

### 3. Missed-Admission Reconcile Fails to Stamp `SourceSystem = 'reconcile'`
- **Schema (§Hospital_Ledger, line 165, 170):**  
  `"SourceSystem = reconcile marks a missed-admission repair: a correction, never a same-Cycle intake."`
- **Code ([`buildCyclePacket.js:980-982`](file:///root/GodWorld/phase10-persistence/buildCyclePacket.js#L980-L982)):**  
  `mRow` omits column M (`SourceSystem`) and column L (`IntakeType`), preventing missed admissions from being identified or audited as corrections in the ledger or census.

### 4. Hospital Talk-Back Measures `in-care` Rather Than `beds`
- **Schema (§OccupancyMeasure & Invariant J, lines 149, 219, 239):**  
  The schema establishes two distinct measures: `beds` (`hospitalized` + `critical` only) and `in-care` (all five open states). Invariant J specifies that non-bed intakes (such as `injured`) occupy no bed.
- **Code ([`applyDemographicDrift.js:228-235`](file:///root/GodWorld/phase03-population/applyDemographicDrift.js#L228-L235)):**  
  ```javascript
  230: for (var hRow102 = 1; hRow102 < hospVals.length; hRow102++) {
  231:   var dv = hospVals[hRow102][hIdxDischarge];
  232:   if (dv === '' || dv === null) hospitalOpen++;
  233: }
  ```
  `applyDemographicDrift.js` counts *all* rows with blank `DischargeCycle` as `hospitalOpen`, regardless of severity. Outpatient/non-bed care states (`injured`, `recovering`) directly inflate `hospitalLoadUnits` and trigger `hospitalStrainApplied`, violating the boundary separating bed capacity strain from general care visits.

### 5. Missing `-2` Row-ID Suffix Collision Handler
- **Schema (§Shared receipt identity, line 157):**  
  `"Row ids stay H-C<cycle>-<POPID> / J-C<cycle>-<POPID>; a second row for the same citizen in the same Cycle takes suffix -2."`
- **Code ([`buildCyclePacket.js:893`](file:///root/GodWorld/phase10-persistence/buildCyclePacket.js#L893)):**  
  `buildCyclePacket.js` hardcodes `'H-C' + ev.cycle + '-' + key`. If a citizen is admitted, discharged, and readmitted within the same cycle, it generates an identical duplicate `AdmissionId`.

### 6. Ghost-Bed Outcome Defaults to `'recovered-reconciled'` Regardless of Custody
- **Schema (§Judicial_Ledger & §Hospital_Ledger, lines 194, 203):**  
  Outcomes must accurately reflect legal/medical disposition (`released`, `diverted`, `held-served`, etc.).
- **Code ([`buildCyclePacket.js:948-952`](file:///root/GodWorld/phase10-persistence/buildCyclePacket.js#L948-L952)):**  
  ```javascript
  948: var gOutcome = (gStatus === 'deceased') ? 'deceased' : 'recovered';
  949: persistWithRetry_(function() {
  950:   sheet.getRange(gRow + 1, 7, 1, 5).setValues([[
  951:     gStatus, cycle, cycle, gOutcome + '-reconciled', Math.max(0, cycle - gAdmit)
  952:   ]]);
  ```
  If an open hospital row is closed by reconcile while the citizen's ledger status is anything other than `'deceased'` (for instance, if an errant write set their status to `'detained'`), line 948 forces `gOutcome = 'recovered'`, writing `'recovered-reconciled'` into column J regardless of true medical outcome.

### 7. Hardcoded 5-Column Write Range (Columns 7–11)
- **Code ([`buildCyclePacket.js:906, 950`](file:///root/GodWorld/phase10-persistence/buildCyclePacket.js#L906)):**  
  `sheet.getRange(openRow + 1, 7, 1, 5).setValues([[...]])`
  The discharge and ghost-release writes explicitly address a 5-column span starting at column 7 (G through K). While this leaves columns L–O untouched in the current append layout, it hardcodes an assumption of column order and width that creates data corruption hazards if schema columns are reordered.
