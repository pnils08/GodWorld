# Adversarial Review — `engine.357` (`92424fe53`)

Scope: commit `92424fe53`, plan [`2026-11-22-checker-reads-its-own-record.md`](file:///root/GodWorld/docs/plans/2026-11-22-checker-reads-its-own-record.md), per [`2026-11-23-es-brief-agy-engine357.md`](file:///root/GodWorld/docs/for-claude-review/2026-11-23-es-brief-agy-engine357.md). Read-only review; tested against C115/C116/C117 snapshots and `output/beats/Initiative_Tracker.jsonl` on disk (no Sheets reads, no code edits).

---

## Findings

### 1. `stalled → defunded` (failing → failing) is classified as `type: 'improvement'` (`"advanced"`)
**Where:** `scripts/engine-auditor/detectImprovements.js:56-60`, `:77` (`lib/initiativePhaseContract.js:34-37`)  
**What breaks:** Line `:56` defines `const setback = failingPhase(curr.ImplementationPhase) && !failingPhase(prev.ImplementationPhase);`. Because `PHASE_INTENSITY` gives all four negative phases `< 0` (`stalled: -0.50`, `suspended: -0.60`, `blocked: -0.70`, `defunded: -1.00`), any transition from one failing phase into another (including worsening from `stalled` to `defunded`) fails `!failingPhase(prev.ImplementationPhase)`, sets `setback = false`, and emits `type: 'improvement'`, `severity: 'low'`, `"advanced: stalled → defunded"`. (Dropping `&& !failingPhase(prev.ImplementationPhase)` still leaves recovery moves like `stalled → design-phase` as `improvement`, since `failingPhase(curr)` is already `false`.)  
**Concrete input → wrong output:** `prev.ImplementationPhase = "stalled"`, `curr.ImplementationPhase = "defunded"` → `detectImprovements.detect` outputs `{ type: "improvement", severity: "low", description: 'Initiative "Test Fail-to-Fail" advanced: stalled → defunded' }`.

---

### 2. `checkMitigators` → `recommendRemedy` → `measureRemedies` runs a false-remedy feedback loop on `setback` (not caught by C117 A/B)
**Where:** `scripts/engine-auditor/checkMitigators.js:239`, `scripts/engine-auditor/recommendRemedy.js:150-163`, `scripts/engine-auditor/generateTribuneFraming.js:39-47`, `:240-264`, `scripts/engine-auditor/measureRemedies.js:130-165`  
**What breaks:** Plan §Surfaced notes that `checkMitigators` gives a `setback` `gap: 'remedy-working'`, treating the stalled program as its own mitigator — because `checkMitigators.js:239` skips `improvement`, `anomaly`, and `ledger-completeness`, but not `setback`. Downstream, that causes three concrete failures that the single-cycle C117 A/B did not test:
1. **`measureRemedies` loop next cycle (`N+1`):** `recommendRemedy.js:152` attaches a `measurementSpec` to `setback.remedyPath.worldSide[0]` even when `action` is `'no remedy needed — monitor'` (`remedy-working`) or `'add parallel mitigator or character intervention'` (`mitigator-firing-but-insufficient`). In Cycle `N+1`, `measureRemedies.js:130-165` grades that `setback`'s `measurementSpec`; if the neighborhood metric moves above threshold, `detectImprovements.js:118-165` files a spurious `type: 'improvement'` (`"... — from prior \"setback\""`).
2. **Wrong-category / multi-cycle wording in `generateTribuneFraming`:** Because `setback` is not intercepted at `generateTribuneFraming.js:240`, it enters `deskHandlesFor` (`:264`).
3. **Different routing across live C117 stalls (`INIT-007`, `INIT-008`, `INIT-013`):** Tested against `output/beats/Initiative_Tracker.jsonl` + `engine_audit_c117.json` snapshots + `engine_audit_c116.json`:
   - `INIT-007` (`implementation-active → stalled`) and `INIT-008` (`vote-scheduled → stalled`): `checkMitigators` returns `remedy-working` (`action: 'none — monitor'`), `recommendRemedy` attaches `measurementSpec: Neighborhood_Map.RetailVitality`, and `generateTribuneFraming` writes `storyHandles.civic.angle = "... stalled in stalled — remedy path + responsible office"` and `hookLine = "The ... initiative carrying ... has not advanced in several cycles."` on a 1st-cycle stall (`cyclesInPhase: 0`).
   - `INIT-013` (`announced → stalled`, `PolicyDomain: safety`, `"Ivy Hill Community Revitalization"`): `checkMitigators.js:51-54` matches `"Revitalization"` into `culture` (no `PolicyDomain` `"safety"` match or `"Revitalization"` keyword takes priority depending on category order; `mitigators[0]` did not fire → `gap: 'mitigator-firing-but-insufficient'`), `recommendRemedy` returns `{ type: 'propose-new-initiative', action: 'layer a second culture initiative alongside the existing one', measurementSpec.field: 'Crime_Metrics.ViolentCrimeIndex' }`, and `generateTribuneFraming` (`DESK_BY_CATEGORY.culture = ['culture', 'letters']`) leaves `storyHandles.civic = null` (so `buildWorldSummary.js:1317` omits `framed: true` on the `desk_signal` civic entry and drops its `stink-scanner` score from `34` to `31`).

---

### 3. `detectImprovements` measurement dedup key collides across distinct neighborhood/remedy pairs and drops second-source metadata
**Where:** `scripts/engine-auditor/detectImprovements.js:129-163` (`scripts/buildWorldSummary.js:1300-1302`, `scripts/cron-civic-run.js:636`)  
**What breaks:** `const mKey = [field, expected, observed, v].join('|');` omits which neighborhoods (`measureRemedies.js:88-96` takes `max` over a pattern's own `neighborhoodsChecked`), which initiative, and `priorRemedyType`.
**Concrete input → wrong output:**
- **Distinct-measurement collision:** Supply two separate prior patterns in `priorAudit.patterns`:
  - `INIT-A` (`stuck-initiative`, `Temescal`, `RetailVitality`, `expected: 0.02`, `observed: 0.5`, `verdict: 'remedy-overshot'`, `priorRemedyType: 'advance-initiative'`, citizen `Citizen A`)
  - `INIT-B` (`math-imbalance`, `Rockridge`, `RetailVitality`, `expected: 0.02`, `observed: 0.5`, `verdict: 'remedy-overshot'`, `priorRemedyType: 'staffing-action'`, citizen `Citizen B`)
  `detectImprovements.detect` collapses them into one `improvement` pattern whose `evidence.fields.priorRemedyType` (`"advance-initiative"`) and `description` (`'... — from prior "stuck-initiative"'`) drop `INIT-B`'s `staffing-action` / `math-imbalance` source while unioning `citizens: ['Citizen A', 'Citizen B']`, `neighborhoods: ['Temescal', 'Rockridge']`, `initiatives: ['INIT-A', 'INIT-B']`.
- **Single-measurement merge (`C117` `#14` + `#15`) downstream effects:**
  - `description` and `evidence.fields.priorPatternType` still read only `'stuck-initiative'`, omitting `'production-imbalance'` from `description` even though `priorPatternTypes` records `['stuck-initiative', 'production-imbalance']`.
  - City-hall neighborhood routing (`cron-civic-run.js:679`) filters `p.severity === 'high'`, so a `severity: 'low'` joined `improvement` does **not** route extra districts via neighborhoods; `auditByInit` (`:622`) keeps `INIT-007` only (`#15` had `initiatives: []`), and `:646` suppresses `expectedField` improvements from `flagNotes` (though `:636` `flagged.length` would still mark an otherwise-quiet joined `INIT-B` as a `hotInit` if two different initiatives collided on `mKey`).
  - In `buildWorldSummary.js:1300-1302`, the surviving `desk_signal` `INIT-007` `improvement` entry gains all 18 neighborhoods (`hood`) and all 6 `popids` (`Juliet Choi`, `Renée Cabrera`, `Quinn Adeyemi`, `Jordan Velez`, `Mason Ortega`, `Ines Sorensen`), while `generateTribuneFraming.js:244` keeps only the first 3 citizens (`#14`'s) in `handle.citizens`.

---

### 4. Minor gaps / A/B blind spots not exercised on C117
- **`scripts/buildJaxSlice.js:315-378` (`buildContradiction`):** Has handlers for `math-imbalance`, `stuck-initiative`, `incoherence`, and `health-crisis`, but none for `setback` (falls through to `:371-377` `'The tidy official read of the same cycle'`). Also **`scripts/stink-scanner.js:44`** matches `/stalled/i` (`score = 34` for a framed `stalled` setback, 1 under `FORCE_THRESHOLD = 35`), whereas `blocked` / `suspended` / `defunded` setbacks get `0` class bonus (`score = 28`, `className: 'anomaly'`).
- **`scripts/engineAuditor.js:152-168` (`summarize`):** Increments `summary.improvements` and `summary.incoherence` alongside `byType[p.type]`; has no `summary.setbacks` rollup field (safe for `buildWorldSummary.js:605-609`, which computes `ailments` as `t !== 'improvement' && t !== 'incoherence'`, placing `setback` into `Ailments` and the `### Medium-Severity Patterns` count table).

---

## Checked Clean

- **`detectRepeatingEvents.js:52-59` (`Attack 3`):** `EMPTY_TOKENS = new Set(['none', 'null', 'undefined'])` checks exact lowercase tokens (`t.length >= 4 && !EMPTY_TOKENS.has(t)`), so prefix/substring words like `"nonessential"` or `"nullify"` are untouched, real issue words alongside `"none"` still emit, and `C115–C117` snapshots yield `0` `"none"` patterns.
- **No initiative reader stranded on `type === 'improvement'` (`Attack 1`):**
  - `cron-civic-run.js:390-394` (`ailmentPerception`) handles `case 'setback':` identically to `improvement`, `:622` indexes `auditByInit` across all pattern types, and `:646` intentionally excludes only `improvement` + `expectedField` (keeping `setback`).
  - `civisJournal.js:99` (`'setback'`) translates `project + ' fell from ' + stageWords(f.fromPhase) + ' to ' + stageWords(f.toPhase) + '.'`; `loadFrame` (`:252-259`) resolves `target` from `neighborhoods[0]` or `Initiative_Tracker.Name` cleanly for all C117 live stalls.
  - `buildWorldSummary.js:605-616` classifies `setback` under `Ailments` and `### Medium-Severity Patterns`, and `:1290` emits every pattern to `desk_signal`.
  - `tierClassifier.js:114, 162`, `assertHighestSeverityAilmentCoveredOnFrontPage.js:31`, `engineCycleAudit.js:112-177`, and `buildCivicDomainSlice.js` neither break nor mis-route on `setback` (`severity: 'medium'`). No `dashboard/` code reads `audit.patterns`.

---

Verdict: SHIP-WITH-FIXES
