---
title: engine.299 Task 3C and Task 7 diff review
created: 2026-10-18
updated: 2026-10-18
type: reference
tags: [engine, citizens, events]
sources:
  - docs/plans/2026-10-18-event-engines-move-dials.md
  - 540f53f03bc41a2366b50ef3f3241edc9d642252
  - 4fe2e9b9a0a14e28e03a75406f983c45722e6686
pointers:
  - ../../output/codex/engine299-task4c.md
---

# Codex verdict: FIX; hold the combined cut

Reviewed exactly `540f53f0` and `4fe2e9b9`, with current source at `4fe2e9b9`. No engine edits, deployment, fire, historical rewrite, commit or push. This requested inbox artifact is the review payload; Claude owns reconciliation into the existing plan. Task 4c is a separate patch delivery.

## Findings

### HIGH — Advancement becoming STRUCTURAL changes the Phase 9 fold

`utilities/citizenDialMap.js:254-257` adds Advancement and Death to STRUCTURAL; `:372` returns before content matching and before graded resolution. Before `540f53f0`, bare Advancement is not a DIAL_MAP key, so its text reaches the content rules at `:288`. `Intake at Tier 3. Synthetic note` and `Updated to Tier 4. Synthetic note` both resolve to `{drive:6}`. Afterward both resolve to `{}`. This is a behavior change, not a reporting-only declaration.

Executed the real `foldNewEntries_` (`utilities/compressLifeHistory.js:1632-1651`) twice in isolated VMs, substituting only the pre-commit versus current dial map. A new citizen receiving the synthetic Tier-3 Advancement entry at C112 previously ends with drive mood 6, drive streak 1, folded 112; afterward mood 0, streak 0, folded 112. Bare Death produces identical state before/after because its existing DIAL_MAP entry at `utilities/citizenDialMap.js:125` was already `{}`.

Scope of proof: `processAdvancementIntake.js:795-797` emits this wording to LifeHistory_Log, not directly to the existing citizen's LifeHistory cell. This probe proves a changed fold contract for a history entry; it does not prove a particular live citizen has such an entry or lost six points. No population/history census was performed. The requested “no fold change” claim nevertheless fails. Preserve resolver behavior and classify reporting markers separately, or explicitly approve and document the changed historical semantics after checking affected history.

### MEDIUM — structural bucketing accepts graded events and removes their diagnostic identity

`scripts/deadBranchScan.js:205-208` classifies by normalized `baseTag_`, after asking the resolver for effects. `Death-Composure-Down-S` and `Advancement-Drive-Up-S` used to carry their stated deltas; STRUCTURAL now suppresses them before graded resolution (`citizenDialMap.js:372-375`). The scan then collapses them into ordinary Death/Advancement totals. Its structural object contains only total and byTag (`deadBranchScan.js:201`), no raw tags, rows, text or engine attribution. `acceptanceEmpty` ignores that bucket (`:251`).

A synthetic two-row log with `Death-Composure-Down-S` and Advancement returns structural=2, inert=0, acceptanceEmpty=true. Thus malformed or unexpectedly graded structural events are not distinguishable from expected bare bookkeeping. The separate source/ECL premise scans still run (`:221-249`); those are not suppressed by the bucket. They do not inspect these log texts. This is not evidence of a deployed graded Death producer; it is a confirmed diagnostic blind spot. Exempt only expected bare markers and retain raw-tag/site provenance for structural rows; flag graded structural tags rather than silently accepting them.

### MEDIUM — some Up pairs still say atmosphere rather than direction

The selection mechanism is repaired, but the data is not uniformly directional. `runNeighborhoodEngine.js:90` signs “sensed the neighborhood's artistic pulse” Up; `:105` signs “felt Fruitvale's cultural energy” Up; `:159` signs “observed the neighborhood's creative pulse” Up. These descriptions do not say more activity, increased participation, or a citizen going out. Compare the unsigned “felt the neighborhood's creative pulse” at `:76`: nearly the same claim has a different admission policy. `:73` explicitly describes “steady business,” yet marks Up.

Under the requested line-owned-direction rule, leave those observations unsigned or author an explicit activity/direction in the line. This is a semantic finding, not a claim that the code stamps the trajectory on plain strings. Clear activity lines such as people gathering and crowds spilling onto sidewalks read as outward activity; the vague mood observations do not establish that on their own.

## Hunt disposition

| Hunt | Verdict | Evidence |
|---|---|---|
| Sign never comes from trajectory alone | SHIP | `runNeighborhoodEngine.js:532-546`: trajectory chooses up/down eligibility; metadata is taken from each pair. Plain strings stay null. Mismatched pairs are omitted. |
| Every pair reads as its direction | FIX | Atmosphere/steady examples above. Mechanically valid metadata is not proof of semantic direction. |
| Unsigned lines never write and are counted | SHIP, texture admission | `:633-640` rejects before the texture cell and queue writes at `:647-669`. Actual-writer synthetic probes show growth/plain-string and steady/signed-pair both write no line and increment noDial once. This counts selected rejections, not every unsigned pool member. Existing independent pressure tint at `:610-620` can write its own pressure text first; it does not publish the unsigned texture. |
| Down lines carry no decline premise | SHIP | Reviewed both complete character and bespoke pools (`:61-186`). Down prose describes quieter activity, thinner crowds or earlier closing, without assigning blight, displacement or a neighborhood decline identity. This is prose review, not evidence that every incidental venue fact occurred. |
| STRUCTURAL additions leave every fold unchanged | FIX | Bare Death unchanged; Advancement fold regression above. Graded structural tags also change. |
| Structural bucket hides nothing | FIX | Counts are visible, but normalized totals conceal graded/raw identity and have no acceptance gate. Source/ECL findings remain visible. |

## Other changed surfaces

- Household quiet/celebration lines describe shared family time; crisis lines describe disruption (`generateCitizensEvents.js:2361-2380`). The tag choice at `:2406` is explicit by authored household kind. Mixed recovery language in the burst-pipe and health-scare lines is present, but each still states a crisis; no trajectory-based sign enters this path.
- PostCareer's five new exact sub-tags carry nonempty deltas (`citizenDialMap.js:108-112`); calendar suffixes still normalize through the existing PostCareer base. These are intentional new resolver effects, separate from the prohibited claim that STRUCTURAL is fold-neutral.
- Task 7 applied changes preserve the scoped mechanics and aliases: new captures normalize the legacy move key (`compressLifeHistory.js:1603-1606,1662-1668`), generator reads alias without mutating stored registers (`generateCitizensEvents.js:1172`), and recall reads either spelling (`lib/resonanceRecall.js:135`). The three file-scoped exact-string allowlist rules retain annotated hits rather than deleting them. They are lexical file rules, not AST guarantees that a future identical literal is read-only.
- Task 7 wording changes and East Oakland character match the requested patch; DisplacementRisk, lane decisions, reason enums and crime modifiers remain. SHIP for this bounded application/alias review, not a claim that every income-fit hook is now backed by a new income computation.

## Validation and limits

Passed locally: `dialWave2Seams.test.js`, `deadBranchScan.offenders.test.js`, `unlivedFold.test.js`, `unlivedEcho.test.js`, `migrationRelocation.test.js`, `citizenDials.test.js`. Additional scratch probes use the actual neighborhood writer and Phase 9 fold, with synthetic fixtures only; log: `/tmp/e299-refresh/review-probes.log`. The neighborhood probe covers growth Up, decay Down, unsigned rejection/count and steady rejection/count. Existing tests pass despite the confirmed fold regression; the added structural assertion only checks the new declaration, not before/after equivalence (`citizenDials.test.js:236`).

No deployment, bench fire, typed persisted history readback, live citizen effect or population-level equivalence is established by these local tests. Task 4c's requested read-only offender scans are reported separately in its delivery MD. Do not treat a new scanner label as proof of unchanged simulation behavior.

Gate: fix or explicitly resolve the Advancement semantic change, expose unexpected structural variants, and finish the ambiguous texture authoring before accepting the combined Task 3C/7 cut. Task 7's scoped alias/wording application itself passes.

## Builder correction — 2026-10-18

The second implementation job is cancelled: the existing 07:41 Task 4c patch is already applied by the owning lane and awaiting commit. Codex did not change either existing Task 4c deliverable or apply it to the shared checkout. Isolated revalidation began before this correction; it is not a review of the forthcoming commit. Append that commit's review here when the builder supplies its hash. The verdict above covers only the two named commits.

## Third commit — 050beedc, Task 4C applied — 2026-10-18

**Verdict: FIX for one line's dial annotation; application and admission mechanics SHIP.** Reviewed `050beedc2aeb46b4037913a12a1d42cd528455b3`, against its parent `4fe2e9b9`. All six changed/added JavaScript files are byte-identical to the delivered patch as independently applied in `/tmp/e299-refresh/work`. TAG_REGISTRY and EVENT_SYSTEM_MAP also match. The remaining differences are the regenerated forward/reverse maps and owning plan. This is the requested third-commit review, not a new patch delivery.

### MEDIUM — sensitive communications do not establish integrity

`phase04-events/generateGameModeMicroEvents.js:240` signs “handled sensitive communications” as `dial:integrity:up`. Handling sensitive information describes a task, not whether the citizen handled it honestly, responsibly, or corruptly. The integrity axis is explicitly corrupt ↔ incorruptible (`utilities/citizenMemory.js:30`); neither pole follows from this line. The role-based pool cannot supply that missing ethical fact.

Instrumented the existing writer test's real-pool enumeration without changing the writer: it emits `C101 — [Civic-Integrity-Up-S] handled sensitive communications` in all five contexts that reach this staff entry. The resolver turns that tag into integrity +1. This defect was in Codex's delivered patch; application did not introduce it. Remove the annotation and let the existing guard skip/count it, or use a dial supported by the actual described action. Do not invent an ethical outcome merely to retain Integrity-Up. Add an explicit assertion for this line: the existing tests establish nonempty effects and selected negative examples, not the meaning of every sign.

### Admission, persistence carriers and seed history

| Contract | Result and source |
|---|---|
| No source/role/mode-derived default sign | SHIP mechanics. GAME `:520-544`, MEDIA `:428-452`, CIVIC `:468-492` require one valid line-authored dial tag when the primary has no effect; source is used only as the rejection counter key. Semantic exception above. |
| No unsigned write or downstream side effect | SHIP. Rejection precedes stamp, LifeHistory, LastUpdated, log, details, eventsGenerated and dirty flag. Tests explicitly assert unchanged history/timestamp/dirty state, no log, and one counted rejection. Missing resolver/helper and invalid/conflicting metadata fail closed. |
| Own-delta kinds stay bare; logs carry the written tag | SHIP. Existing nonempty effects preserve primary; GAME log `:556`, MEDIA `:463`, CIVIC `:503` carry that exact primary. Community fixture remains bare. Search found old wrapper names only in historical compression compatibility data and an auditor comment, not an active exact-wrapper log consumer. |
| Seed append is future-only | SHIP. `scripts/seedTier1EssenceLive.js:127` applies POPID + text deduplication before grading at `:129-144`; append and re-derive inputs share the written tag at `:145-146`. Historical archive tags are not rewritten. |
| Authored essence text/tag unchanged | SHIP. Independent parent/commit comparison: zero changed text or original tag values, unchanged event counts, 54 metadata additions. Four unsigned entries remain: Background “Stood in the loudest moments…”; Background “Settling into a new clubhouse.”; Daily “Two glasses on the terrace…”; Lifestyle “No insurance, no plan…”. They are skipped on future append. |
| No new life transition authored | SHIP for this diff. Essence biography text and own-delta life-history tags remain unchanged; this cut adds metadata and admission, not a new promotion/marriage/birth/death/move event. Existing authored transition records are inventoried in the original delivery MD. |

The seed test intercepts the full script's require graph and uses fake Sheets; it verifies append admission, preserved historical tag, rejection count, same-tag re-derive input and repeat-append deduplication. Its dial math/serialization dependencies are stubbed. It is not a test of full seed re-derivation math, crash recovery, real Sheets or external readback. The seed executor's existing broader re-derive behavior is not authorized to run by this review.

### Regenerated maps and plan

Ran the read-only-source/local-output `scripts/stubEngine.js` in the isolated patched archive. All three generated files match the commit byte-for-byte: ENGINE_STUB_MAP.md, ENGINE_STUB_REVERSE.md and ENGINE_STUB_REVERSE.json (180 files, 1,708 functions). The regenerated map includes prior wave changes as well as Task 4C; those are derived documentation updates, not additional engine edits.

**LOW, documentation drift:** the edited Task 4 row at `docs/plans/2026-10-18-event-engines-move-dials.md:61` still lists the `displacementmove` rename as Open although Task 7 and `4fe2e9b9` record it landed. Reconcile that item when the owning lane folds this review. The Task 4C application note itself matches the code. TAG_REGISTRY's existing neighborhood trajectory wording at `docs/engine/TAG_REGISTRY.md:49` also predates the line-owned-direction repair; its appended Task 4C clause is accurate, but that older clause remains stale. Neither inconsistency was silently edited here.

### Validation and final gate

- Fresh focused run on the committed files: `engine299ModeWriters.test.js` PASS — GAME 120, MEDIA 52, CIVIC 54 distinct pool lines, 3,141 admitted outputs, 212 rejected selections; fake seed writer 388 future appends. `engine299Graded.test.js`: 12 passed, 0 failed.
- `node --check` passes all six changed/added JavaScript files. `git diff --check 050beedc^ 050beedc` passes.
- The isolated full-suite run begun before the builder's cancellation finished with **285/292 passing**, 171.15 seconds, on JavaScript now proven byte-identical to this commit. Seven failures: cron-civic-tick, employerSuccess, fireGuard, ingestEdition, notebooklmSourceInventory, rateEditionCoverage, undockedMintAccount. Each was rerun on the unpatched parent archive and also failed. The limits include subprocess EPERM, employerSuccess DNS EAI_AGAIN, the inventory test's absolute-root expectation, and missing isolated cast credentials. No full-suite-green claim is made from this environment; the commit's 292/292 statement is the author's separate result.
- No model call, deployment, fire, Sheet write, canon operation, commit or push. No fresh external validation was run for this third-commit review. Earlier scan observations and prior delivery claims are not a bench test of `050beedc`.

**Combined disposition remains FIX.** Correct the Task 4C sensitive-communications annotation and the earlier texture/STRUCTURAL findings before treating the three-commit bundle as accepted. Task 4C mechanics and generated artifacts pass; their passing tests do not resolve the semantic defect or the earlier Phase 9 behavior change. Only this requested verdict file was modified for the third-commit review.

## Fourth commit — 967f4c8b, migration cells and scanner acceptance — 2026-10-18

**Verdict: FIX.** Reviewed `967f4c8b31820bdb263a194656c4eaf7ffa72bc1` and its diff against its parent. The new move-cell write and lane-specific delta selection work locally. Two exact-kind readers miss the graded Relocation form, the settled-in predicate rewards canonical decay, and the prose classifier excludes genuine one-word ECL prose from acceptance.

### HIGH — graded Relocation bypasses branch memory and the wake's move summary

`utilities/compressLifeHistory.js:1603` lists the exact `relocation` branch key. `captureUnlived_` at `:1661-1666` lowercases the entire raw tag and handles the old move-key alias, but never strips a graded suffix. Thus `Relocation-Drive-Up-M` and `Relocation-Composure-Down-M` written by `migrationTrackingEngine.js:806-816,841` do not match. The real Phase 9 `foldNewEntries_` calls this reader at `compressLifeHistory.js:1637`: a synthetic bare Relocation captures one unlived entry; both graded tags capture zero, while their dial effects correctly apply +2 drive / −2 composure. The added move exists in the cell but does not enter the branch-memory path named for it.

There is a second exact reader: `lib/citizenDials.js:85,114-118` maps `relocation` to “a move” but does not normalize graded tags. `lib/wakePerception.js:596` consumes this summary. Direct calls to `thrown('C200 — [Relocation] SYNTHETIC moved from A to B')` return “a move”; the same call with `Relocation-Drive-Up-M` returns an empty string.

Normalize graded tags at these semantic-kind readers. For newly captured registers, preserve a canonical branch kind that the existing echo/recall readers recognize (`generateCitizensEvents.js:1171-1174`, `lib/resonanceRecall.js:135`); merely admitting the graded tag while storing it unchanged leaves a second exact-key mismatch downstream. Preserve historical stored rows. Add actual graded-move → fold → register → recall/wake coverage. This is a new writer/reader incompatibility, not a claim that the old log-only Neighborhood event was already captured in memory.

### HIGH — the newly graded settled-in verdict rewards decay and missing facts

`migrationTrackingEngine.js:519` tests `traj.indexOf('declin') < 0`; the canonical trajectory enum is `decay | steady | growth` (`neighborhoodTrajectoryEngine.js:17,54`). At ten Cycles, an opportunity move into a `decay` neighborhood therefore writes `Home-Composure-Up-S` and “the move worked” (`migrationTrackingEngine.js:523-526`). A blank trajectory also succeeds. For cost/displaced moves, missing housing pressure defaults to 5 (`:511`) and likewise satisfies the success threshold.

Executed the actual settled-in function with synthetic rows: opportunity + decay → Up; opportunity + blank trajectory → Up; cost + pressure 8 → Down; cost + pressure 2 → Up. The condition predates this commit, but this commit newly turns its unsupported verdict into a composure delta. Match the actual enum and reject unavailable/invalid facts before signing. Test decay and missing-data paths, not only whether the output tag has graded syntax. The verdict is still cell-only; this diff does not add a settled-in LifeHistory_Log row.

### MEDIUM — whitespace is not a prose/identifier distinction

`scripts/deadBranchScan.js:271` marks every matched string as prose only if its trimmed value contains whitespace. That applies even to ECL **Text** cells, which are already known to be authored output text. Synthetic active ECL rows with Text=`blight` or Text=`displaced`, PoolKey=`neighborhood.texture`, remain visible as hits but acquire `prose:false`; with a clean graded log, `acceptanceEmpty` becomes true (`:273`). Text=`SYNTHETIC blight` correctly blocks. A one-word rendered description is not a column identifier merely because it lacks a space.

Keep ECL Text matches eligible for premise acceptance regardless of word count. For source strings, classify known identifier contexts rather than globally exempting all single-token strings; comments can remain visible/nonblocking as requested. Add acceptance-level assertions for these boundary cases. Existing new tests use a log containing an inert Daily row, so they verify flags but cannot demonstrate that the acceptance boolean is correct in an otherwise-clean report.

### Hunt disposition and persistence trace

| Hunt | Verdict | Evidence |
|---|---|---|
| Move sign follows the lane's fact | SHIP | Risk/intent establishes the pressure route (`migrationTrackingEngine.js:424-430,751`); maxRisk ≥9 and pressure write Composure-Down-M (`:803-810`). Misfit compares destination versus current median income and chooses Drive-Up-M only for upward moves, otherwise Composure-Up-M (`:812-816`). The destination first clears the fit/burden margin (`:779-786`). No tier or hood name supplies a sign. |
| Every member's own cell and log agree | SHIP for the expected ledger schema | Synthetic two-member probes exercise pressure, forced, upward and lateral routes through the actual `processRelocations_`; both member cells preserve their existing text and append the same tag/text queued for that member's log, with ledger.dirty=true. The new code still silently skips the cell when LifeHistory is absent (`:841`) and skips both records for a missing POPID (`:840`); production schema/population validity was not established here. |
| No new direct Sheet write | SHIP | `rows` aliases `ctx.ledger.rows` (`:622`); the added assignment at `:841` changes the row array. Dirty is set at `:828`; the log uses `queueAppendIntent_` at `:843`. Both scheduler paths order migration → Phase 9 fold → Phase 10 commit (`godWorldEngine2.js:673,807,856` and `:2390,2516,2559`). `commitSimulationLedger.js:25-36` queues the consolidated row matrix. The existing Household_Ledger direct `setValues` at `migrationTrackingEngine.js:952` is unchanged, not a new LifeHistory write. |
| Relocation has no exact-kind collision | FIX | Branch-memory capture and wake summary miss the new form; detailed probes above. Graded dial resolution itself works. |
| Scanner keeps allowed/prose decisions visible | SHIP visibility; FIX acceptance | Owner ECL life-verb hits remain in `lifeVerbs` with row, text, pool, allowed:true and a reason (`deadBranchScan.js:258-265`). All premise hits retain an explicit prose boolean (`:271`). Nonallowlisted hits omit allowed rather than storing false; current acceptance treats that omission as unallowed. The whitespace heuristic still makes the wrong exemption. |

Owner-pool routing is source-supported: generic generation skips both `civicRole.*` and `lifeEvent.*` (`generateCitizensEvents.js:3158-3159`); the civic, promotion and home engines select their own corresponding pools (`runCivicRoleEngine.js:310`, `runCareerEngine.js:536`, `generationalWealthEngine.js:2072`). The exclusion applies only to life-verbs; ECL premise matching still runs first. `coverageAnchorRetirements.js:72` really is within avoidFramings, so that narrow anti-framing allowlist entry is justified and remains reported. These are prefix/file-literal rules, not proof that every future owner-pool line is correct.

### Bench artifact and documentation drift

The committed `output/engine299/offenders-bench-c112-at47.json` records C112, 2,250 scanned rows, 49 inert, 46 structural, 62 premise hits, 20 life-verb hits, and acceptanceEmpty=false. Its unallowed prose count is **1**, not the plan changelog's 0: `lib/coverageAnchorRetirements.js:72`, “displacement intake,” is not yet annotated as allowed in that saved JSON. The current source adds that justified exception, but the saved artifact predates its resulting classification. Reconcile the artifact/claim rather than citing the old report as proof of zero. Its 21 bare Neighborhood moves and 26 mode wrappers also mean it does not prove the newly graded migration and Task 4C output reached that bench fire.

### Local validation and gate

Passed: `migrationRelocation.test.js` 77/77; `unlivedFold.test.js` 26/26; `deadBranchScan.offenders.test.js`; syntax checks on the two production JS files; commit whitespace check. Additional actual-function probes are in `/tmp/e299-fourth-probes.js` with results in `/tmp/e299-fourth-probes.log`: four move branches, two members per move, fold/register behavior, settled-in canonical/missing trajectory, scanner acceptance and visible owner/comment flags. The move probe isolates the existing separate Household_Ledger update; it does not prove its persistence. The committed pressure-household test's base fixture lacks LifeHistory, so its passing log-count assertion alone is not cell-write proof.

No full-suite rerun, Sheet read/write, fire, deployment, model call, commit or push for this review. No live population or typed Phase 10 readback claim. The only repository edit is this appended verdict section.

**Fourth-commit and combined verdict: FIX.** Normalize the Relocation readers, correct the settled-in predicate before awarding its delta, and stop exempting one-word authored prose. Reconcile the saved scan/plan discrepancy. Earlier findings remain open; successful in-memory move writes do not close them.
