---
title: engine.313 adversarial plan review
created: 2026-10-23
updated: 2026-10-23
type: reference
tags: [engine, media, reference]
sources:
  - Builder engine.313 plan and hunts, 2026-10-23
  - docs/engine/ROLLOUT_PLAN.md
  - phase07-evening-media/culturalLedger.js
  - phase07-evening-media/buildEveningFamous.js
  - output/engine-sheet/2026-10-22-e297-check.js
pointers:
  - "[[engine/ROLLOUT_PLAN]]"
  - "[[reference/DEPLOY_HISTORY]]"
  - "[[for-claude-review/2026-10-23-codex-engine297-fix-diff-gate]]"
---

# engine.313 — adversarial PLAN review

**Verdict: SHIP-WITH-FIXES.** The POPID fallback addresses the demonstrated duplicate mechanism, but the plan needs the row-identity correction in F1, the metadata decision in F2, and the receipt/test corrections in F3–F4 before implementation acceptance. This is approval of the direction subject to those changes, not a code, bench, or deployment SHIP.

Reviewed HEAD `e78f5d507cfc755cf10900dadbc2d259e46870ec`. The rollout row is `ready` (`docs/engine/ROLLOUT_PLAN.md:80`); the detailed proposal is the builder's message. No separate engine.313 implementation or test block was present. The registrar, Famous builder, proposed test file, receipt script, and rollout file were clean in the inspected checkout; unrelated dirt was preserved. Only this review was written. No engine/test/receipt execution, Sheet read, bench, deploy, or commit was performed.

## Confirmed premise and evidence limits

The defect is real: registration resolves a citizen POPID (`phase07-evening-media/culturalLedger.js:354`) but its existing-row UPDATE selects only by exact Name (`:426-431`); a miss queues a new row carrying that POPID (`:535-547`, `:571`). Famous constructs names from the Simulation_Ledger for legends, players, and the fame bridge (`phase07-evening-media/buildEveningFamous.js:194`, `:217`, `:239-243`) and passes the sighting name to registration (`:552-555`). The stored F1 C116 receipt records a new Dante Reyes, `CUL-B5A3A5B0`, linked to `POP-01066` (`output/engine-sheet/2026-10-22-e297-check-F1-c116.json:109-115`); the source history explicitly records the differently named original and duplicate mechanism (`docs/reference/DEPLOY_HISTORY.md:178`).

The baseline's **10 mismatched rows / 4 at the fame bar**, live's **0**, and the **2026-10-19 reconciliation** are builder-supplied observations, not independently refreshed counts in this review. The receipt identifies the supplied baseline spreadsheet (`output/engine-sheet/2026-10-22-e297-check.js:14`, `:33`), but does not contain the full baseline name comparison. No fresh external-state claim is made here.

## Findings requiring plan changes

### F1 — HIGH: selecting a row and then retaining only its Name loses the identity just established

**Evidence:** the proposed insertion precedes the name-keyed registry lookup (`phase07-evening-media/culturalLedger.js:354`, `:375-376`). The subsequent UPDATE still walks from the first row and stops at the first exact Name (`:426-431`, `:522`); its registry also stores entries under Name (`:493-505`). Nothing in `ensureCulturalLedger_` enforces Name uniqueness (`utilities/ensureCultureLedger.js:9-15`).

**Static counterexample, synthetic/non-canon:** an earlier row has label `Synthetic Shared Label`, links citizen B, and has FameScore 5; a later row has the same label, links citizen A, and has FameScore 40. A call using A's unique Simulation_Ledger name selects the later row by POPID, rebinds to its label, then updates the earlier B row. An earlier dynasty row with that label similarly bypasses the fallback's dynasty exclusion. Even when both rows link A, the first lower-score row wins, contradicting the proposed highest-FameScore rule. If that label is already registered this Cycle, the registry can redirect the call before the UPDATE scan.

**Required correction:** carry the selected row identity into both UPDATE and registry handling. Resolve exact-name precedence first, then the eligible linked target, and use a consistent committed-row/CUL-ID registry identity for that resolved target. Preserve the existing pending-create dedup path. A narrower alternative is to reject an ambiguous selected label explicitly; silently falling through to a different row is unsafe. Add different-POPID, same-POPID/different-score, and dynasty-first label-collision tests, including a registry already populated for the conflicting row. These are reachable source-level counterexamples, not claims that these collisions exist live.

### F2 — MEDIUM: excluding dynasty targets does not exclude dynasty-derived metadata

**Evidence:** `culturalStatusByPop_` chooses the highest-fame linked row without excluding institutions (`phase07-evening-media/culturalLedger.js:107-123`). The fame bridge copies that row's category into the sighting role (`phase07-evening-media/buildEveningFamous.js:231-243`). Registration classifies the incoming role before the proposed fallback (`phase07-evening-media/culturalLedger.js:218-228`) and UPDATE overwrites the selected row's FameCategory and CulturalDomain (`:450-452`). A `dynasty` role reaches the classifier's `unknown`/`Other` default (`:133-179`). Dynasty rows explicitly share their wealthiest member's POPID (`phase05-citizens/generationalWealthEngine.js:3412-3422`).

**Consequence:** with a higher-score dynasty and a differently named personal artist row linked to one citizen, the bridge supplies `dynasty`, the fallback correctly excludes the family and selects the artist, and UPDATE then writes `unknown`/`Other` onto that personal row. The family is untouched, but its metadata still contaminates the citizen's row. The same category-versus-role mismatch also exists for `business-figure`, which does not itself match the business role classifier (`culturalLedger.js:175-179`). These UPDATE refresh semantics predate engine.313; redirecting formerly separate CREATE calls makes them affect the retained personal row.

**Required correction:** define the metadata source for a POP fallback explicitly. Prevent an institutional source category from replacing personal metadata; either select personal metadata upstream or preserve/derive it from the selected personal row on this path. Test a higher-fame family plus a lower-fame personal row through the actual bridge and registrar. The proposed dynasty-with-no-personal-row test does not exercise this case. Keep role inference and fame-bonus inputs explicit: the rebind occurs after both were computed (`culturalLedger.js:218-228`, `:244-330`).

### F3 — MEDIUM: the proposed duplicate receipt also rejects a legitimate new dynasty

**Evidence:** the receipt currently recognizes a new row by absence of its CUL-ID from the baseline (`output/engine-sheet/2026-10-22-e297-check.js:36-37`, `:48-56`). The dynasty writer intentionally appends a separate institutional CUL-ID linked to a citizen (`phase05-citizens/generationalWealthEngine.js:3418-3422`). That citizen may already have a non-dynasty Cultural row.

**Consequence:** “any new row whose UniverseLinks matches a baseline non-dynasty row” would HOLD a legitimate new family institution. It tests identity duplication across different entity kinds. Empty links must also never join each other.

**Required correction:** compare a new **personal/non-institutional** row with baseline personal/non-institutional rows, requiring a non-empty valid POPID. Apply the same dynasty predicate to both sides (`FameCategory dynasty` **or** `RoleType Institution`), with explicit case/whitespace handling. Emit new and baseline CUL-IDs, row identities, and POPID in the HOLD reason. Keep the existing checks. Add receipt fixtures for personal duplicate → HOLD; dynasty-only baseline plus new person → allowed; personal baseline plus new dynasty → allowed; blank links → no duplicate match. This corrects the proposed rule without treating legitimate first-time personal or family entries as failures.

### F4 — MEDIUM: no duplicate append is necessary but does not prove that the intended row was updated

**Evidence:** existing receipt PASS depends on its HOLD list and an optional aggregate bucket hit (`output/engine-sheet/2026-10-22-e297-check.js:70-73`). A wrong-row UPDATE, a fallback never exercised, or a dropped registration can all add no rows. Existing engine.297 tests replace the real registrar and fame-by-POP reader with stubs (`scripts/sportsWeekCity.test.js:374-381`); they cannot prove the proposed mutation behavior.

**Required correction:** retain the planned separate engine.313 block on the real registrar, and add mixed alias order (citizen name then Cultural label, and the reverse), F1 collisions, equal-score tie behavior, F2's dual family/personal case, and direct-helper assertions. For two neutral-context calls, assert one registry target, one initial set of cell intents, MediaCount +2 and FameScore +10, unchanged CUL-ID/Name/UniverseLinks, zero append, and helpers called once on the intended row. The +10 expectation assumes zero bonuses (`culturalLedger.js:245-330`, `:383-391`, `:444-448`); do not inherit the holiday-rich engine.297 fixture (`sportsWeekCity.test.js:383-386`).

For the bench, preserve the supplied stale-name baseline rather than replacing it from live, and record its mismatch/eligible counts before the leg. Require positive evidence that at least one known mismatched personal row was reached by a citizen-name registration and updated under its original CUL-ID, with no personal duplicate. LastSeenCycle alone does not distinguish direct titled-bucket selection from the citizen-name bridge: both reach registration (`buildEveningFamous.js:552-555`). If the natural leg never exercises the fallback, report coverage HOLD. The present aggregate receipt cannot certify that path merely by passing.

## Remaining hunts and boundaries

### Registry and intent accumulation — sound for a uniquely identified target, subject to F1/F4

Moving resolution before the registry is the right order. For one unambiguous retained row, both spellings converge before lookup; repeat UPDATE calls mutate the same intent objects and return early (`phase07-evening-media/culturalLedger.js:375-398`). `queueCellIntent_` returns the actual object placed in `ctx.persist.updates` (`utilities/writeIntents.js:91-105`). This supports one intent set with accumulating fame/media counts. A repeated new-person call similarly mutates its pending append (`culturalLedger.js:401-420`; `utilities/writeIntents.js:147-161`). Neither path implies cross-Cycle retry idempotency or coordination with separate fame writers such as decay (`culturalLedger.js:71-89`) and advancement dimming (`processAdvancementIntake.js:1220-1235`); that is existing behavior, not repaired by this plan.

### Direct helpers and summary — additional writes must be included in verification

The selected UPDATE calls three helpers before installing the registry (`phase07-evening-media/culturalLedger.js:481-505`). They take **sheet and row number**, not entity Name, so a correct row target needs no name adaptation. They do direct writes: FirstRefSource when blank and MediaSpread +1 (`phase07-evening-media/updateMediaSpread.js:29-42`), TrendTrajectory (`phase07-evening-media/updateTrendTrajectory.js:84-86`), and CityTier (`phase03-population/updateCityTier.js:74-76`). Normal repeat registration skips them (`culturalLedger.js:395-398`). Test with a mutable fake sheet and the real helpers, or independently assert every helper's target and call count; cell-intent assertions alone omit these effects.

These helpers have no dryRun/replay guard; the executor's guard only governs queued intents (`phase10-persistence/persistenceExecutor.js:60-71`). A helper exception also occurs before registry installation, leaving partial direct writes/queued intents possible. Those are inherited UPDATE limitations newly reached by the redirected calls; do not characterize this plan as making registration atomic or entirely deferred. No live/dry-run registrar was executed during review.

The UPDATE summary uses the rebound name and retained CUL-ID (`culturalLedger.js:508-520`); repeat calls deliberately leave its first-call values stale (`:395-397`). No explicit consumer of `culturalEntityCreates`, `culturalEntityUpdates`, or `culturalRegistry` was found outside the registrar in the inspected runtime/scripts. Famous sightings, names, and ripple causeIds remain the original caller name (`buildEveningFamous.js:503-504`, `:516-517`, `:536-555`): rebinding a local string cannot rename those already-built objects.

### CREATE dependencies and dynasty exclusion — bounded SHIP

Both runtime call sites ignore the returned CUL-ID (`buildEveningFamous.js:555`; `processAdvancementIntake.js:1271-1273`). Neither branches on `culturalEntityCreates`. The advancement wrapper already detects a linked row through `culturalFameOf_` and usually avoids registration when one exists (`processAdvancementIntake.js:1247-1277`); it is not an unconditional duplicate creator. Its `'registered'` return does not require an append result.

Excluding dynasty/institution rows is correct because their link represents a family anchor, not personal identity (`generationalWealthEngine.js:3418-3422`). This was the only runtime dynasty Cultural append writer found. No Status filter preserves current UPDATE semantics (`culturalLedger.js:426-429`), but also preserves Inactive status: UPDATE never activates the row. The fame-by-POP reader likewise has no Status filter (`:111-123`). Do not promise that every retained row becomes eligible for active-only readers. Exact original-name precedence preserves the old behavior, including any pre-existing mislinked exact-name row; this plan is not a repair of existing links or already-created duplicates.

### Readers — stable IDs benefit; name-only gaps remain

POPID fame reads retain the carrier (`culturalLedger.js:107-123`), and cards retain the same CUL-ID, name and POPID (`scripts/buildCulturalCards.js:588-613`). Trends deltas join by CUL-ID (`scripts/buildTrendsSlice.js:41-43`, `:70-71`); the retained row avoids a false newly-created record. These readers need no rename for this fix, subject to the metadata effects in F2.

Two existing name-only readers can still miss a citizen-name mention when the retained Cultural label differs: `recordMediaLedger_` (`phase10-persistence/recordMediaLedger.js:75-95`) and `logCulturalMention_` (`phase07-evening-media/mediaRoomIntake.js:675-698`). The latter is fed article mention text (`:247-255`). Preventing the duplicate removes the accidental future exact-name match that CREATE would have supplied. `getCulturalStatus_` has substring matching (`phase05-citizens/citizenContextBuilder.js:738-752`), which accommodates a title prefix but not an arbitrary alias. Record these as existing reader limitations exposed by preserving aliases, not justification for creating duplicates. Scope any future POPID reader repair separately; engine.313 must not claim all name joins are solved.

### Simulation_Ledger rename claim — verified within the inspected runtime writers

Searches of `phase*/` and `utilities/` for First/Last lookups, assignments, setters and cell writes found no existing-citizen First/Last rename path. The actual assignments traced to:

- Birth: a new array receives First/Last and is appended (`phase04-events/generationalEventsEngine.js:1167-1188`).
- Advancement: First/Last are written to `newRow` (`phase05-citizens/processAdvancementIntake.js:904-908`) and appended (`:1073-1077`); the existing-row branch updates tier/role/income rather than names (`:784-829`).
- Promotion: a fresh array receives a fresh POPID and First/Last (`phase05-citizens/checkForPromotions.js:340-358`).
- Civic challenger: a fresh array/fresh POPID receives First/Last (`phase05-citizens/updateCivicApprovalRatings.js:1595-1610`) and is appended (`:1640`).
- Generic generation: First/Last populate a new generic row (`phase05-citizens/generateGenericCitizens.js:663-664`). The cited surname release and family-match changes mutate `gData`, sourced from Generic_Citizens (`processAdvancementIntake.js:1988-1996`, `:2009`, `:2160-2170`).

The apparent `row[iLast]` assignment in `godWorldEngine2.js:1914` targets **LastUpdated**, as declared at `:1902`. This verifies the engine-code premise; it does not certify manual, historical, or external Sheet edits. Resolver uniqueness is exact-name and cached per ctx (`culturalLedger.js:618-635`), not a general alias resolver or live-updating identity index. Preserve the planned ambiguity refusal and test it on a fresh context.

## Acceptance gate

Keep the five proposed tests, add F1–F4 coverage, and carry row identity through selection, registry, helpers and UPDATE. Make the personal metadata policy and both sides of the receipt's dynasty exclusion explicit. Preserve the mismatched-name bench fixture and require exercised-path evidence. Then review the actual diff and receipts. No code or external state was changed by this review.

## Changelog

- 2026-10-23 (codex) — Reviewed engine.313's proposed identity fallback, caller/reader effects, direct writes, registry behavior, receipt gate and no-runtime-rename premise; filed SHIP-WITH-FIXES.
