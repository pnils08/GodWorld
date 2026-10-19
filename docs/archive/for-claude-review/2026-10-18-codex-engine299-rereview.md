---
title: engine.299 re-review of 7ff9d81c and migration-scanner scope
created: 2026-10-18
updated: 2026-10-18
type: reference
tags: [engine, citizens, events]
sources:
  - 7ff9d81c6156a38b0bfd4288e7ea2c53f118c846
  - 967f4c8b31820bdb263a194656c4eaf7ffa72bc1
  - docs/plans/2026-10-18-event-engines-move-dials.md
pointers:
  - 2026-10-18-codex-engine299-task3c-7-diff-review.md
---

# Codex re-review — FIX overall; 7ff9d81c corrections pass

Reviewed HEAD `7ff9d81c`, its repair diff, and the included `967f4c8b` migration/scanner changes. The findings on `540f53f0`, `4fe2e9b9` and `050beedc` targeted by this repair are closed. The three functional findings from the fourth-commit review remain reproducible at this HEAD. No implementation, deployment, Sheet operation, fire, model call, commit or push was performed. Only this requested review file is added; concurrent dirty files remain outside the review's write scope.

## Repair verification — 7ff9d81c

| Earlier finding | Verdict | Fresh evidence |
|---|---|---|
| Advancement/Death STRUCTURAL additions changed folding | CLOSED / SHIP | `utilities/citizenDialMap.js:254` restores the original list. X10 at `scripts/citizenDials.test.js:238` pins the Tier-3 intake content rule. Actual Phase 9 fold comparisons using pre-540f53f0 and current dial maps produce identical complete citizen state for bare Advancement, bare Death, Advancement-Drive-Up-S and Death-Composure-Down-S. “Intake at Tier 3. Synthetic note” again gives drive mood 6 and streak 1. |
| Structural bucket swallowed variants and discarded identity | CLOSED / SHIP for the reported defect | `scripts/deadBranchScan.js:206-214` uses an independent exact-tag REPORT_MARKERS list, after checking real effects. Bare inert Death/Advancement markers retain tag, POPID and a 120-character text excerpt in structural.rows. Death-Bogus stays inert, outside the marker exemption. Compressed-Composure-Down-S also stays inert, outside that exemption. |
| Mood-only hood lines were signed Up | CLOSED / SHIP | Ten prior pairs become plain strings in `runNeighborhoodEngine.js:63-166`; the direction/admission machinery remains line-owned. Fruitvale's new line at `:111` explicitly says the plaza is fuller than a season ago. Reviewed the resulting pools and enumerated all 12 bespoke neighborhoods: each retains at least one Up and one Down pair. Down lines remain activity descriptions, not a decline identity. |
| Sensitive communications awarded integrity without an ethical fact | CLOSED / SHIP | `generateGameModeMicroEvents.js:240` is unsigned. `engine299ModeWriters.test.js:69-71` asserts no write for that line. Fresh writer run: 3,136 admitted outputs and 217 rejected selections, exactly five fewer writes/five more rejections than the prior version. |
| Neighborhood registry and plan's open rename item were stale | CLOSED / SHIP | TAG_REGISTRY `:49` now says the line supplies direction and trajectory only selects matching lines. The plan's Task 4 row `:61` no longer lists the already-landed rename as open. |

Precision on “graded variants stay inert”: **valid graded Death and Advancement now move their stated dial again**, restoring the original fold contract. For example, Death-Composure-Down-S resolves to composure −1, so the scanner correctly counts it as neither inert nor a marker. Death-Bogus is not syntactically graded; the new test covers an invalid variant. A genuinely graded but still-inert Compressed variant was separately tested and remains visible as inert. The repair fixes the normalization/exemption bug without making valid graded events inert.

Marker provenance is improved but bounded: structural.rows has tag, POPID and truncated text, not a physical Sheet row number or source engine. It is sufficient to distinguish the cases tested here; it is not a complete replay receipt. No population-wide historical equivalence claim follows from the focused fold comparisons.

## Remaining HIGH — Relocation's graded kind misses two readers

The new writer at `phase05-citizens/migrationTrackingEngine.js:806-816,841-843` emits graded Relocation. `utilities/compressLifeHistory.js:1603,1661-1666` still recognizes only the exact lowercased `relocation` key for branch memory. It never strips the graded suffix. Current actual-fold probes show:

| Input tag | Dial effect | New unlived entries |
|---|---|---|
| Relocation | Existing content routing | 1 |
| Relocation-Drive-Up-M | drive +2 | 0 |
| Relocation-Composure-Down-M | composure −2 | 0 |

The wake summary has the same mismatch: `lib/citizenDials.js:85,114-118` returns “a move” for bare Relocation but an empty string for Relocation-Drive-Up-M. `lib/wakePerception.js:596` consumes it. Thus the new cell entry moves a dial but misses both the branch-memory path and the specific wake summary intended for a move.

Normalize the graded kind in both readers. Newly captured registers must carry a kind recognized by `generateCitizensEvents.js:1171-1174` and `lib/resonanceRecall.js:135`; accepting a graded key but storing it unchanged would leave downstream exact-key readers broken. Preserve existing stored register history. Add graded writer → fold → register/recall and wake-summary assertions. This remains an integration defect, not evidence that the old log-only Neighborhood line previously entered branch memory.

## Remaining HIGH — settled-in grades an unsupported success

`migrationTrackingEngine.js:519` tests `traj.indexOf('declin') < 0`, while `neighborhoodTrajectoryEngine.js:17,54` defines `decay | steady | growth`. A canonical decay opportunity destination therefore writes “the move worked” with Home-Composure-Up-S (`migrationTrackingEngine.js:524`). Blank trajectory also succeeds. Missing cost-lane housing pressure defaults to 5 (`:511`) and passes the success test at `:517`.

Fresh actual-function probes at the ten-Cycle offset reproduce opportunity/decay → Up and opportunity/blank → Up; cost/pressure 8 → Down and cost/pressure 2 → Up work as expected. The predicate is older, but `967f4c8b` newly turns its verdict into a signed composure effect. Compare the canonical enum and refuse to grade unavailable or invalid facts. Test decay and missing values explicitly. This verdict still writes only the cell; the commit adds no corresponding settled-in log row.

## Remaining MEDIUM — one-word ECL prose escapes premise acceptance

`scripts/deadBranchScan.js:271` uses whitespace in a trimmed string as the prose test, including for known ECL Text cells. On an otherwise-clean synthetic report, active neighborhood.texture Text=`blight` and Text=`displaced` each remain listed but have prose:false and acceptanceEmpty=true. Text=`SYNTHETIC blight` has prose:true and blocks. A one-word authored description is not an identifier.

Treat ECL Text as authored text regardless of word count. For code literals, distinguish known identifier contexts instead of exempting all single-token strings. Comments can remain reported/nonblocking. The new owner/prose test checks flags against a fixture that already contains an inert Daily row; it does not establish the acceptance result on a clean report. Add that acceptance boundary test.

## Migration and scanner hunts that pass

| Hunt | Verdict | Evidence |
|---|---|---|
| Move sign follows its lane fact | SHIP | Pressure intent derives from risk/burden (`migrationTrackingEngine.js:424-430,751`); cost/forced paths choose Composure-Down-M (`:803-810`). Misfit compares destination versus current median income (`:814-816`) after a better-fit/burden gate (`:779-786`), choosing Drive-Up-M for upward moves, Composure-Up-M otherwise. Fresh two-member probes pass all four routes with identical tag/text in member cells and log intents. |
| Added cell write is in-memory ledger, with no new direct write | SHIP | `rows` aliases ctx.ledger.rows (`:622`); dirty is set at `:828`; `:841` appends in memory and `:843` queues the log. Both scheduler paths run migration, Phase 9 fold, then Phase 10 commit (`godWorldEngine2.js:673,807,856` and `:2390,2516,2559`). `commitSimulationLedger.js:25-36` queues the consolidated ledger matrix. Existing Household_Ledger setValues at `migrationTrackingEngine.js:952` is unchanged. |
| Owner ECL life-verb exemptions remain visible | SHIP for scoped routing/visibility | Hits retain pool, row, text, allowed:true and reason (`deadBranchScan.js:258-265`). Generic generation excludes lifeEvent.* and civicRole.* (`generateCitizensEvents.js:3158-3159`); their owner readers select those pools. Premise matching still runs independently of the owner exemption. Unallowed hits omit allowed, interpreted as false by acceptance. |
| Comments/identifiers and anti-framing exception stay visible | SHIP visibility, with acceptance defect above | Every premise hit receives prose at `deadBranchScan.js:271`. `coverageAnchorRetirements.js:72` is inside avoidFramings, so the exact anti-framing exception is justified. Visibility alone does not make the whitespace classifier correct. |

Cell-write evidence assumes a valid ledger schema and member POPIDs. The writer still skips the cell if LifeHistory is absent and skips record creation for a blank POPID (`migrationTrackingEngine.js:840-841`). The existing pressure-household test lacks LifeHistory in its base fixture; the separate two-member probes supply it. They isolate the pre-existing Household_Ledger update and establish local cell/log agreement, not persistence or crash recovery.

## Saved evidence drift and validation limits

The saved `output/engine299/offenders-bench-c112-at47.json` still has 49 inert rows, 46 structural rows, and one unallowed prose hit (“displacement intake”), with acceptanceEmpty=false. The plan's @47 changelog says zero unallowed prose; that reflects the later allowlist source change rather than the saved artifact's contents. Its 21 bare Neighborhood moves and 26 mode wrappers also cannot prove the new graded migration/Task 4C output was deployed in that fire. Reconcile the report and claim; no fresh external read or fire was performed here.

Fresh local checks at 7ff9d81c:

- citizenDials: 78 passed, 0 failed; dialWave2Seams: 27 passed, 0 failed.
- engine299ModeWriters: PASS, 3,136 writes / 217 rejected selections; 120 GAME, 52 MEDIA, 54 CIVIC distinct pool lines; fake seed writer 388 future appends. Existing history/deduplication remains covered locally.
- deadBranchScan.offenders: PASS, including owner/prose and marker tests.
- migrationRelocation: 77 passed, 0 failed; unlivedFold: 26 passed, 0 failed. These passing tests do not cover away the reproduced graded-reader and settled-in defects.
- Syntax checks pass on all seven JavaScript files touched by 7ff9d81c; commit whitespace check passes.
- Additional actual-fold, pool inventory, marker/variant and wake-reader probes passed their expected assertions. Current migration/scanner reproduction output: `/tmp/e299-rereview-fourth.log`; synthetic probe source: `/tmp/e299-fourth-probes.js`.

No full-suite rerun or independent confirmation of the author's 292/292 claim this turn. No live citizen effect, typed persisted readback, bench deployment, cron or canon proof. The named prior verdict remains unchanged; this file is the requested new inbox re-review for Claude's reconciliation.

**Gate: SHIP the 7ff9d81c corrections within their bounded scope; FIX the combined cut.** Close the Relocation reader compatibility, settled-in factual predicate and prose-acceptance defects from 967f4c8b before accepting the bundle. The earlier repair findings need not be reopened.

## Added scope — 43c2457d, authored crime-profile removal — 2026-10-18

**Verdict: SHIP for this bounded change. Combined engine.299 verdict remains FIX for the unresolved 967f4c8b findings above.** The supplied `c2457d` is a suffix, not a resolvable Git abbreviation. Reviewed the matching HEAD `43c2457d6717d03ff57efd3d7d1efe7caae7967c`, whose diff and builder-ruling commit message match the requested scope. This changes `ensureCrimeMetrics.js`, its two focused tests and the plan; it does not change Phase 3's calculation implementation.

### Requested hunts

| Hunt | Verdict | Evidence |
|---|---|---|
| No per-Cycle path reads the authored table | SHIP | The table is empty at `utilities/ensureCrimeMetrics.js:66`. `crimeProfileFor_` at `:94-107` always derives from the supplied hood's finite numeric boomIndex, using flat zero for absent/non-numeric data. `crimeIterationHoods_` at `:79-84` uses canonHoods or neighborhoodState keys. Phase 3 calls these at `updateCrimeMetrics.js:218,255,1149`. The only remaining executable table reads are in the two uncalled legacy helpers below. A throwing Proxy substituted for the table confirms both active helpers ignore it. |
| Every live hood has a Crime_Metrics row, with no seed fallback needed | SHIP at observed read | Read live Neighborhood_Map and Crime_Metrics through the repository loader at **2026-10-18 16:51:39 UTC**. Result: 22 map hoods, 22 crime rows, 22 exact-name matches, no missing hoods, no duplicate crime hoods and no extra hoods. All three persisted-level headers exist; the production reader yields a usable positive level or supported prior-index fallback for every property/violent/QoL component. seedNeeded=[] across all 22 hoods. |
| Real Phase 3 order supplies a nonempty iteration set | SHIP on successful boot; failure is loud | Both scheduler paths invoke Phase1-CanonHoods, Phase2-NeighborhoodState, then Phase3-Crime (`godWorldEngine2.js:555,582,595` and `:2273,2299,2312`). Canon loading rejects missing/empty names before publishing a nonempty list (`canonNeighborhoodLoader.js:65-78,138-146`). The Phase 2 loader fills state keyed by hood (`loadNeighborhoodState.js:54-56,114-124`). A synthetic actual-loader probe returns both hoods normally and still returns both after canonHoods is removed. |
| seedCrimeMetricsFromProfiles_ / getCrimeProfile_ have no callers | SHIP repository-call-site check | Active-source search finds only their definitions at `ensureCrimeMetrics.js:425,579`; the wider search finds additional definitions in historical legacy snapshots, not callers. `seedCrimeMetricsFromProfiles_` still enumerates the now-empty table; `getCrimeProfile_` still has a generic fallback. Neither is reached by the checked scheduler or active source. No external Apps Script trigger inventory was inspected, so this is not a claim about manually invoked helper names. |

### Why existing live numbers do not reset

Phase 3 still constructs a profile for every hood; “seed path not reached” means its seed values do not win the level selection, not that `crimeProfileFor_` is never called. `calculateNeighborhoodCrime_` builds three candidate seeds at `phase03-population/updateCrimeMetrics.js:456-458`, then `crimeLevelFrom_` (`:404-411`) prefers a positive persisted level, next a positive prior index, and only then the seed. The live check used the real `getCrimeMetrics_` reader (`utilities/ensureCrimeMetrics.js:160-215`) rather than assuming row existence was enough. That reader does not provide qualityOfLifeIndex, so checking usable QolLevel is necessary; the live check passes it.

All remaining profile property reads in Phase 3 are these candidate-seed expressions. Clearance and other carried calculations do not return to the table. The changed default therefore affects new/unusable seed cases, not the currently observed 22 carried rows. This does not mean crime stops moving: ordinary causes, overlays, RNG and reversion continue to operate as before. Future additions or damaged level/index values can legitimately enter the derived seed path.

### Empty-context limit and stale comment

`crimeIterationHoods_({})` deliberately returns []; the change does not prove that arbitrary callers always have hoods. `safePhaseCall_` catches loader errors (`godWorldEngine2.js:159-169`), so invocation order alone is not a failure-safety proof. In the actual fresh Cycle path, however, failure to seed canon also leaves adjacency absent: Phase 3 calls `buildCrimeAdjacencyGraph_` at `updateCrimeMetrics.js:197`, before obtaining the iteration set at `:218`, and the graph helper throws on missing adjacency at `:817-820`. Canon publishes adjacency only after its validated nonempty hood list (`canonNeighborhoodLoader.js:146-152`). The synthetic missing-map probe confirmed the canonical loader throws, the state loader leaves an empty object, and the Phase 3 adjacency prerequisite throws. This is a failed phase, not a silent successful empty iteration. External callers that inject adjacency while omitting both hood sources are outside that boot guarantee.

LOW documentation cleanup: `ensureCrimeMetrics.js:73-77` still says the unseeded path falls back to profile keys. The implementation immediately below now correctly uses neighborhoodState. Update that stale comment when convenient; it is not a runtime blocker or permission to restore an authored fallback.

### Verification and limits

- `crimeCarryForward.test.js`: **55 passed, 0 failed**, including a 30-Cycle injected-table-entry invariance check and clearance invariance; tests use local fixtures, not current live data.
- `hoodIdentityRemainder.test.js`: **38/38 passed**, covering the empty table, derived boom profile, canonical/state iteration and one metrics result per canonical hood.
- Independent actual-loader and table-access-trap probes pass. Syntax checks pass for all three changed JS files; commit whitespace check passes.
- Live coverage verification was read-only, limited to the two tabs. Initial sandbox DNS failed with EAI_AGAIN; the authorized read-only retry succeeded. The check printed coverage and seed eligibility only; no credentials were inspected or emitted. Helper: `/tmp/e299-crime-live-read.js`.
- No full-suite rerun, deployment, Cycle fire, Sheet mutation, external trigger audit, model call, commit or push. This is source + local-test + current input-coverage proof, not proof that the new commit is deployed or that a future Cycle persisted the expected outputs.

**Final gate for the added scope: SHIP 43c2457d.** The earlier combined FIX remains solely for the still-open migration/readers/scanner issues; removing the authored crime table introduces no additional blocking finding in these hunts. Only this verdict file was edited in the repository.

## Added scope — 3d10fd05, sports named-pool tag — 2026-10-18

**Verdict: SHIP for this small writer change.** Reviewed `3d10fd05bc26a7ebeae7b700eb9b2fae00347d57` and its parent diff. `sportsNamedRoute_` now returns Sports-Sociability-Up-S for its existing named pool (`phase05-citizens/applyGameNightMoments.js:146-148`). Other routes, texts, selection odds, name resolution and RNG draws are unchanged.

The three lines at `applyGameNightMoments.js:111-115` describe seeing one's name in the sports pages, hearing it on the radio, and being asked about the club at a family dinner. The first two are public recognition; the third is social engagement. Sociability-Up is consistent with the simulation's existing explicit Public/recognition → sociability mapping (`utilities/citizenDialMap.js:88,286`), here at the smaller S magnitude of +1. This is not a new claim that recognition changes integrity or that an arbitrary sports result is positive: result, injury, roster and feature routes remain separate at `applyGameNightMoments.js:139-145`.

The named feed row resolves an actual living ledger name before selecting text (`:219-230`). The writer uses the route tag for the LifeHistory cell and for the log's primary component (`:205-211,231`); log metadata still follows the primary after `|`. No direct-write or side-effect path is added by this diff. Existing historical bare Sports remains inert (`citizenDialMap.js:197`); only newly written lines receive the graded tag.

### Verification

- `node scripts/gameNightMoments.test.js`: all assertions pass, including the re-trued named route, other sports routes, deceased/retired handling and missing-log guard.
- Independently forced each of the three actual named-pool texts through the real entry point using the existing isolated test fixtures. For each, the cell and log primary agree on Sports-Sociability-Up-S and their text agrees. Parsing the resulting cell and executing the actual Phase 9 `foldNewEntries_` produces sociability mood +1. No fixture entered Sheets or canon.
- Syntax checks pass for both changed JS files; commit whitespace check passes. No full-suite rerun; the author's 292/292 claim is not independently re-established here.
- LOW documentation drift: `applyGameNightMoments.js:23` still describes the default as a plain Sports line. The implementation and changed test are correct; update that header comment in a later authorized cleanup.

### Bench @48 evidence boundary

Read the committed `output/engine299/offenders-bench-c112-at48.json`: C112, **2,249 scanned lines; 1 inert Sports line; 7 bookkeeping markers** (6 Advancement, 1 CareerState); **0 unallowed prose-premise hits; 0 unallowed life-verb hits**. The inert source is labeled `inferred:phase05-citizens/applyGameNightMoments.js`, not a recorded SourceEngine receipt. The report's acceptanceEmpty remains **false** because that inert line remains in the pre-fix log.

Per the builder's deployment boundary, @48 predates both 43c2457d and this tag change. It supports the supplied pre-fix census, not a post-fix zero-inert claim, deployment of the two later commits, or typed persistence of this new tag. The local writer/fold probes supply the post-change behavior evidence available here. The scanner's zero premise count also does not resolve its previously reported one-word prose blind spot or the Relocation/settled-in defects.

**Gate: SHIP 3d10fd05 within this scope; the combined verdict remains FIX for the earlier unresolved 967f4c8b findings.** No new live read, Sheet write, Cycle fire, deployment, model call, commit or push. Only this re-review file was edited in the repository.
