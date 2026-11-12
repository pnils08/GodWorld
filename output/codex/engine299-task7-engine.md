---
title: engine.299 Task 7 engine-side patch delivery
created: 2026-10-18
updated: 2026-10-18
type: reference
tags: [engine, validation]
sources:
  - docs/for-claude-review/2026-10-18-engine299-task7-engine-side-impl-TASK.md
  - docs/plans/2026-10-18-event-engines-move-dials.md
  - docs/SIM_DOCTRINE.md
pointers:
  - output/codex/engine299-task7-engine.patch
---

# engine.299 Task 7 — patch delivered

The adjacent patch implements the narrative corrections and paired `incomefitmove` rename with historical read aliases. No commit, deployment, bench fire, history rewrite, or shared-source edit. The task file names this artifact pair; registration and plan changes are left to the landing lane.

Revalidated against fresh HEAD `98d11fa84bfd19445b3974524baea34413f89e51` and a separate copy with the current tracked working-tree edits overlaid. The existing patch passes `git apply --check` on both and on the shared checkout; no patch revision was necessary. It contains no hunk for `runNeighborhoodEngine.js` or the plan. The generator and scanner hunks apply alongside their current edits. All 11 changed files pass `node --check`. All five focused suites pass on patched HEAD; four pass on the patched working-tree copy, whose scanner test has a pre-existing assertion failure documented below. Current receipts are in `/tmp/task7-refresh-j8f2akcu/`; the earlier validation below is explicitly historical. Source pointers refer to the patched HEAD unless identified as working-tree pointers.

The reader tables below serve as a source-verified wiring card. No engine-wiring model call was run: this TASK explicitly prohibits model calls. The named TASK registers this exact deliverable pair; no shared index or plan was edited.

## Changes and their readers

| Item | Change and evidence | Reader path / proof |
|---|---|---|
| 1 | `phase05-citizens/migrationTrackingEngine.js:798,801`: replace displacement/priced-out phrases with household-income fit. | Destination is already admitted by fit/burden checks at `:765–778`. `phrase` becomes LifeHistory_Log text at `:823–829` and CITIZEN_RELOCATED description at `:843–857`; `:861` records the hook ripple. This path does **not** directly append to the citizen's LifeHistory cell. The log keeps its existing Neighborhood tag. MigrationReason and household repricing at `:814,833–836` are unchanged. |
| 2 | Same file `:1031,1053`: individual planning and aggregate planning descriptions now name income fit. | Hook types, severity, population identity, neighborhood and atRiskCount stay intact. The aggregate says **residents**, because the loop counts ledger rows, not households. Descriptions enter the hook/ripple/packet readers listed below. Tests assert the exact five-resident description and actual move log/hook text. |
| 3 | `phase06-analysis/applyMigrationDrift.js:253,255,256`: **leave all three factor labels**. | Factors enter `S.migrationDriftFactors` at `:571`; brief generation reads them at `:617`, selects drivers at `:640`, then `humanizeDriver_` maps weather to “weather” and chaos to “instability” at `:660–665` before readable lede/ticker assembly at `:725–776`. `phase10-persistence/buildCyclePacket.js:650` reads that brief. Raw factors enter carry state at `phase09-digest/finalizeCycleState.js:147`, then previous-factor context at `phase06-analysis/economicRippleEngine.js:232,236`. No exact-label decision reader was found. Raw metadata is allowed by the task; these signed random adjustments do not always mean outflow, so an “outflow” replacement would also misdescribe the mechanism. |
| 4 | `utilities/ensureCrimeMetrics.js:106`: East Oakland character becomes “east flatlands, arriving frontier”. | Exact canon source: `docs/canon/INSTITUTIONS.md:392`. Baylight waterfront geography is at `:351`. `crimeProfileFor_` returns profiles at `ensureCrimeMetrics.js:247–249`; seeding reads numeric properties at `:582–606`; `getCrimeProfile_` returns a profile at `:733`. `phase03-population/updateCrimeMetrics.js:255,456–458` consumes numeric modifiers. No active `.character` narrative consumer or external caller of `getCrimeProfile_` was found. This corrects authored metadata; it does not establish a currently published character string. |
| 5 | Paired `displacementmove` → `incomefitmove`, detailed below. | Actual register writer and both narrative readers accept the old key. Existing history and register values remain untouched. The scanner's two old key exceptions are removed. |
| 6 | Migration header `:48–49` and aggregate hook comment `:1044` now describe planning correctly. | Comments are documentation only. `neighborhoodTrajectoryEngine.js:31` still describes the retained risk coupling accurately and is unchanged. Lineage notes remain. |

### Item 5: register writer, aliases and persistence

An active LifeHistory emitter of a `DisplacementMove` tag was **not found** in the searched phase, utility, library and script sources. The migration engine currently emits Neighborhood. The branch-key writer is the compressor's **new unlived register capture**, not a new migration event writer.

- `utilities/compressLifeHistory.js:1603` registers the new key; `:1606` maps the historical key on read. `captureUnlived_` at `:1661–1670` normalizes either spelling and writes `incomefitmove` only for the newly captured entry. Arrival and legacy folds call this capture (`:1637,1657`); the existing MemoryRegisters merge/persistence path remains at `:621–654`. Original event tags/text and existing `regs.unlived` objects are not retagged or swept.
- `phase05-citizens/generateCitizensEvents.js:1145,1153` uses the new echo/rhyme map key; `:1172` accepts old persisted keys before lookup. The existing rhyme token `displacement` stays so old history tails still match. Echo text is unchanged, and the same candidate enters the existing event pool. No new personal history content is invented by the rename.
- `lib/resonanceRecall.js:123,135` uses the new phrase key with an old-key read alias. Existing `u.txt` remains as stored. The exported `unlivedCandidates` reader retains the same phrase for both keys.
- `scripts/deadBranchScan.js` removes the old compressor and generator allowlist entries formerly at `:126–129`. Old-key alias strings remain visible to its raw lexical scan. They are compatibility identifiers, not forbidden citizen prose; no new exception hides them.
- `scripts/unlivedFold.test.js:105` onward proves old mixed-case input captures the new key without mutating the event; an existing old register entry survives byte-for-byte beside a new capture; recall produces identical positive output for both keys.
- `scripts/unlivedEcho.test.js:149` onward exercises the actual generator with both old/new register keys and both old/new history-tail tags. Each case requires a nonzero echo count and identical seeded results, so equality cannot pass on two silent failures.

## For the builder

The risk lane, its rates, thresholds, selection, enum values and moved citizens are unchanged. The following is the direct named-field/value reader inventory in active phase/utility/library/script sources, plus the generic downstream hook consumers. Schema declarations and test fixtures are distinguished from production decisions. Cutting the lane remains a separate builder decision.

### MigrationReason = `displaced`

| Site | Dependency |
|---|---|
| `phase05-citizens/migrationTrackingEngine.js:74–80,797,814` | Enum declaration and existing write. Kept exactly. |
| Same file `:488,510–516` | Settled-in check reads MigrationReason; `cost` or `displaced` uses landing-hood pressure below 7, while opportunity follows the trajectory branch. This is the direct production semantic comparison found. |
| `scripts/queryLedger.js:169` | Exports the stored MigrationReason value without renaming it. |
| `scripts/migrationRelocation.test.js:310` | Existing assertion preserves the displaced enum contract. |
| `scripts/canon3_backfill_t9.js:114`; `scripts/canon3_followup_squatters.js:90` | Column-schema declarations, not displaced-value decisions. |
| `phase05-citizens/updateCivicApprovalRatings.js:1635` | Another writer of MigrationReason, not a displaced-value reader. |
| `docs/SIMULATION_LEDGER.md:164,268`; `schemas/SCHEMA_HEADERS.md:287,289,1450,1452` | Documented column contract. Other test fixture headers are schema consumers, not new semantic readers. |

Historical rows retaining `displaced` require no migration because the enum is not changed. Their live count was not inventoried by this task.

### DisplacementRisk

| Site | Dependency |
|---|---|
| `phase05-citizens/migrationTrackingEngine.js:196,290,293` | Field lookup, risk writer, and high-risk assessment count. |
| Same file `:396,417,425,427` | Migration intent: planning/considering thresholds. |
| Same file `:635,656,668,796–797` | Household unit maximum risk; severe-risk enum choice. |
| Same file `:956,968,972` | Severe planned-move summary count. |
| Same file `:998,1013,1025,1035` | Individual hook admission and risk metadata; the following aggregate loop uses the admitted planning counts. |
| `phase05-citizens/generateCitizensEvents.js:370,2923,3103` (patched working-tree copy) | Ledger read and numeric `displacement` ECL context. The concurrent Task 4 edits use DebtLevel for the money prose; DisplacementRisk still feeds the ECL DSL. This patch leaves both intact. |
| `phase02-world-state/loadEventContentLedger.js:73` | Numeric `displacement` DSL condition contract consuming that context. |
| `scripts/buildInitiativePackets.js:321,336,341,348` | Per-citizen values, positive-risk filtering and aggregate atDisplacementRisk count. |
| `scripts/buildCivicVoicePackets.js:162,167,175` | Per-citizen risk and positive-risk aggregate for civic packets. |
| `scripts/queryLedger.js:167` | Raw field export. |
| `scripts/canon3_backfill_t9.js:114`; `scripts/canon3_followup_squatters.js:90`; `docs/SIMULATION_LEDGER.md:266` | Schema declarations/documentation; no rate decision here. |

### FORCED_MIGRATION / MASS_EXODUS and generic downstream readers

The exact hook-type literals occur in the producer (`migrationTrackingEngine.js:1028,1050`) and migration tests (`scripts/migrationRelocation.test.js:283`). No other active production exact-name comparison was found. Their generic passage still exposes the names as data, so this patch **keeps both names**.

| Reader | What it carries |
|---|---|
| `utilities/rippleLedger.js:104–117` | `recordHookRipple_`: description → causeDetail, hookType → effectType; severity and target metadata preserved. `:57–84` writes the ripple row and in-memory event. |
| `phase07-evening-media/storyHook.js:1401–1426` | Merges carried hooks, normalizes description to text and severity to priority. Journalist routing at `:138–201` is generic/domain-first. |
| `phase07-evening-media/buildContractSeeds.js:38,144,414,464,563` | Migration → COMMUNITY routing; reads ripple events/causeDetail and carries effectType in seed text. Names therefore can remain visible metadata even without a literal-name predicate. |
| `phase07-evening-media/buildMediaPacket.js:224` | Exports generic story hooks. |
| `phase10-persistence/buildCyclePacket.js:577,614` | Generic story-hook lists. |
| `scripts/buildWorldSummary.js:260–284,1052,1415` | Reads Ripple_Ledger and builds the world-summary digest. |
| `scripts/buildVoiceWorkspaces.js:167–170,288,322,576` | Hook text bullets, evening context, domain-filtered desk material and statistics. |
| `scripts/buildNeighborhoodSlice.js:13,31` | Generic COMMUNITY Story_Hook_Deck consumer. This is a legacy deck route, not proof the new hooks persist there: `phase10-persistence/saveV3Seeds.js:16` marks that deck path retired. |

### Rates left for the builder

`utilities/ensureCrimeMetrics.js:94–106`: West Oakland property 1.2, violent 0.9, response 0.85, base incidents 10; East Oakland property 1.15, violent 1.0, response 0.8, base incidents 7. All remain unchanged. No numerical or lane recommendation is implied by correcting the East Oakland character. The risk/intent thresholds above also remain unchanged.

## Current validation refresh

Fresh HEAD plus patch: migrationRelocation **76/76**, unlivedFold **26/26**, unlivedEcho **10/10**, deadBranchScan.offenders **PASS**, hoodIdentityRemainder **39/39**. The copied working tree plus patch gives the same passing counts except deadBranchScan.offenders: its concurrent structural-marker change expects one inert row but still expects `{syntheticEngine: 2}` at line 29; actual is `{syntheticEngine: 1}`. This assertion also fails without the Task 7 patch. No repair to another lane's edits is included.

Live `node scripts/deadBranchScan.js --offenders` was rerun on the isolated HEAD archive before/after application at **11:34:22 / 11:34:28 UTC**, using existing loaders. Initial sandbox attempts were incomplete; the network-enabled read-only retry succeeded. Current `before.json` / `after.json` receipts show migrationTrackingEngine **39 → 34**, applyMigrationDrift **3 → 3**, ensureCrimeMetrics **0 → 0**, neighborhoodTrajectoryEngine **4 → 4**: **46 → 41** total. Whole-source premise hits are **65 → 62**. Both scans read C111, **2,771** log rows, **2,348** inert. These are lexical counts, including allowed internal identifiers; they are not a claim that all-engine acceptance is clear. No shared offenders artifact was overwritten.

`GODWORLD_LEDGER_FAILS=0 npm test` completed on the patched working-tree copy: **281/291 files pass, 10 fail, 163.85 seconds** (`suite.log`). Every failing file was rerun without the Task 7 patch and failed there too (`baseline-*.log`):

- `citizensEventsFame.t3`: Y.7 household shared-moment assertion returns zero.
- `deadBranchScan.offenders`: structural-marker count mismatch described above.
- `dialWave2Seams`: three neighborhood trajectory assertions fail (24 pass); the copied concurrent neighborhood changes are preserved.
- `cron-civic-tick`, `fireGuard`, `ingestEdition`, `rateEditionCoverage`: subprocess execution/assertion failures in this sandbox, including `spawnSync node EPERM`; environment limitations, not passing production evidence.
- `employerSuccess`: attempted Sheets read fails with DNS `EAI_AGAIN`; no network-enabled suite rerun.
- `notebooklmSourceInventory`: hardcoded repository output path differs from the isolated archive path.
- `undockedMintAccount`: required local cast-credential state is absent; no credentials were inspected or copied.

Final shared-checkout `git apply --check` passes. SHA-256 comparisons show all tracked engine/script/utility/plan files that were dirty at task start unchanged. The patch SHA-256 is `a99fda57f5586fa07e8d1ef615a640e74a1f57b8e92729c1fa5bb37df625ebe0`. Only this named report was refreshed in the shared workspace; the existing valid patch is retained byte-for-byte. No commit or push occurred.

## Earlier validation (retained receipt history)

| Check | Result |
|---|---|
| `node --check` on all 11 changed JS files | PASS. |
| `node scripts/migrationRelocation.test.js` | 76 passed, 0 failed. |
| `node scripts/unlivedFold.test.js` | 26 passed, 0 failed. |
| `node scripts/unlivedEcho.test.js` | 10 passed, 0 failed. |
| `node scripts/deadBranchScan.offenders.test.js` | PASS, including removal of the legacy-key exception. |
| `node scripts/hoodIdentityRemainder.test.js` | 39/39 passed. |
| `GODWORLD_LEDGER_FAILS=0 npm test` in patched archive | 284/291 files passed, 7 failed, 156.14 seconds. |
| Narrative-only mechanism comparison | Parsed AST comparison for migrationTrackingEngine and ensureCrimeMetrics, excluding strings, locations, and narrative phrase/description RHS, is identical. No numeric/control-flow change outside narrative expressions. |
| `git apply --check output/codex/engine299-task7-engine.patch` | PASS against current shared checkout/HEAD, including concurrent unrelated dirt; patch not applied there. |

Full-suite failures, each reproduced by running its test in the pristine archive:

- `cron-civic-tick`: `spawnSync node EPERM` (69 passed, 1 failed).
- `fireGuard`: subprocess phase-order scanner returns no slot count (113 passed, 1 failed).
- `ingestEdition`: subprocess ingest-loop/rerun assertions (23 passed, 2 failed).
- `rateEditionCoverage`: subprocess result assertions (4/16 passed).
- `employerSuccess`: attempts a Sheets read; DNS `EAI_AGAIN`. No network escalation was used for this test.
- `notebooklmSourceInventory`: hardcoded `/root/GodWorld/output/codex` expectation differs from fresh `/tmp/.../output/codex` archive path.
- `undockedMintAccount`: “existing cast creds detected” depends on local state absent from archive. Credentials were not inspected or copied to satisfy it.

These are baseline/environment limitations, not a claim that a production-environment suite is green. Detailed local receipts: `/tmp/engine299-task7-suite.log`, `/tmp/engine299-task7-base-*.log`, and focused `/tmp/engine299-task7-{migration,fold,echo}.log`.

### Earlier live read-only offender scan

Ran `node scripts/deadBranchScan.js --offenders` from the isolated archive before and after the patch, using the repository's existing loaders. Only the explicitly authorized scan received network access; no Sheet write occurred. Receipts: `/tmp/engine299-task7-before.json` (10:47:48.971 UTC) and `/tmp/engine299-task7-after.json` (10:49:14.539 UTC), 2026-10-18.

| File | Raw premise hits before | After |
|---|---:|---:|
| `phase05-citizens/migrationTrackingEngine.js` | 39 | 34 |
| `phase06-analysis/applyMigrationDrift.js` | 3 | 3 |
| `utilities/ensureCrimeMetrics.js` | 0 | 0 |
| `phase05-citizens/neighborhoodTrajectoryEngine.js` | 4 | 4 |
| **Four-file total** | **46** | **41** |

Four outward narrative strings and one false hook comment account for the five removed hits. Baylight geography is not matched by this regex. Retained hits include allowed identifiers, enum values, internal factor labels and lineage. Whole-repository raw hits are 66 → 63 because historical read aliases remain visible elsewhere. Live C111 log totals were unchanged: 2,771 scanned, 2,348 inert. This task neither clears all-engine acceptance nor changes prior histories. Bench/live execution of the proposed code remains unverified.

## Landing boundary

Deliverable is the reviewable patch plus this report. Eleven existing files change; no new runtime file, dependency, schema, rate, writer lane or engine rebuild is introduced. Apply through the authorized engine lane. Current scanner/generator edits were included in the isolated applicability and focused-test checks; no manual conflict resolution was needed. No future Task 3/4 re-review is included.

## Changelog

- 2026-10-18 (codex) — Delivered Task 7 engine-side patch, historical read aliases, reader inventory and bounded validation evidence; no commit.
- 2026-10-18 (codex) — Revalidated the patch against current HEAD and concurrent working edits; refreshed live read-only counts and full-suite baseline failures; preserved shared source and plan.
