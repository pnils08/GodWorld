---
title: engine.286 Task 6 civic-role design review
created: 2026-10-09
updated: 2026-10-09
type: reference
tags: [engine, civic, citizens]
sources:
  - docs/for-claude-review/2026-10-09-codex-engine286-task6-civic-role-TASK.md
  - docs/plans/2026-10-08-engine-286-game-of-life-events.md
  - phase05-citizens/runCivicRoleEngine.js
pointers:
  - "[[plans/2026-10-08-engine-286-game-of-life-events]]"
---

# engine.286 Task 6 — code findings

**Verdict: HOLD the design record as build-complete.** The approved direction is implementable, but the proposed call move is behavior-changing; same-Cycle business openings are later; duplicate protection is absent; and ECL admission alone cannot deliver the proposed graded outcomes. Findings below answer the six assigned questions without proposing a replacement design.

Reviewed working-tree source at HEAD `2b98cdbc9c0c1991753e7c2abada37a42c7159e9`. The inspected code directories had no tracked diff. The shared tree already contained extensive output changes and was three commits ahead of origin/main. This review changes only this requested file. The plan's reported live citizen counts, Approval distribution, Famous distribution, and ECL row counts were not independently read from Sheets.

## 1. Call order and available premises — FIX

Both call sites have the stated sequence: civic role → initiatives → approval → civic-mode → media-mode → business dynamics (`phase01-config/godWorldEngine2.js:635–641`, `:2352–2358`). Moving civic role immediately after business dynamics has these effects:

| Intervening engine | Relevant read/write and consequence |
|---|---|
| Initiatives | Its Simulation_Ledger fallback reads CIV, RoleType, Status and identity, not LifeHistory (`phase05-citizens/civicInitiativeEngine.js:998–1032`). Votes consume the shared RNG (`:114`, `:1252`, `:1285`, `:1322`). Its effects also update city dynamics (`:1753–1775`), which civic role reads (`phase05-citizens/runCivicRoleEngine.js:153–155`). |
| Approval | Reads ledger identity/status/dials and role/SkillTags for candidates (`phase05-citizens/updateCivicApprovalRatings.js:1340–1351`, `:1528–1577`). It does not score the newly appended civic LifeHistory. However, it can change CIV and RoleType on the shared rows through `turnoverLedger_` (`:1364–1379`). At the new slot, a departed holder can lose eligibility and a successor can gain it. |
| Civic-mode | Reads and appends the same LifeHistory cell, writes LastUpdated, and increments eventsGenerated (`phase05-citizens/generateCivicModeEvents.js:468–503`). The append order reverses for overlapping CIV/CIVIC citizens. Its RNG uses `ctx.rng` (`:65–70`). |
| Media-mode | Likewise reads/appends LifeHistory and increments eventsGenerated (`phase05-citizens/generateMediaModeEvents.js:428–462`). Overlap with CIV is possible because the civic-role gate does not exclude MEDIA clocks. |
| Business dynamics | Owner-closure narration reads/appends LifeHistory (`phase05-citizens/applyBusinessDynamics.js:319–353`). Owner mechanics read DialState (`:361–367`), which the civic-role line has not yet folded. Shared owner-history order changes, while that line does not immediately change owner dial bands. |

**No intervening event-count decision was found:** civic-mode and media-mode read `S.eventsGenerated` to increment it, rather than to gate their draws. Their successful append totals are additive, but that does not make the reordering output-neutral.

**P1 — RNG and membership make this a substantive behavior change.** `safeRand_` returns the same `ctx.rng` function (`utilities/safeRand.js:28–33`); civic role consumes it at its chance and wording draws (`phase05-citizens/runCivicRoleEngine.js:293`, `:326`). Moving those draws behind votes and approval changes which rolls those engines receive, including council outcomes and approval-ceiling scandal (`phase05-citizens/updateCivicApprovalRatings.js:839–847`). Equal seed is not unchanged output. The new all-CIV sign/band draws will also change draw volume. The new call slot observes post-turnover CIV membership, not the old cohort.

**P1 — being after approval does not make a fresh office Sheet read current.** Approval, holder/status, and AutoScandal writes are queued until Phase 10 (`phase05-citizens/updateCivicApprovalRatings.js:1039–1054`), while CIV membership changes immediately in `ctx.ledger`. `S.approvalChanges` contains changed approvals, keyed by office/holder rather than POPID (`:996–1005`, `:1112`); it is not a complete post-turnover office snapshot. The aura read must specify which version it consumes and handle the successor/old-holder mismatch. Missing Approval remains unavailable, not zero or the office engine's default.

| Premise at the proposed slot | Verified availability and limit |
|---|---|
| Business closures | **Yes.** `S.businessClosures` has id, name, hood, sector and closedCycle (`phase05-citizens/applyBusinessDynamics.js:632`, `:690`); `S.worldEvents` also carries a closure with businessId and neighborhood (`:641–646`). |
| Business conditions | **Yes.** `S.hoodBusinessMomentum[hood]` supplies growth, closedShare, closures and businesses (`:677–688`). These are not opening receipts. |
| Same-Cycle business openings | **Not all.** The concrete heritage opening producer queues Business_Ledger and creates opening history/hooks at `phase05-citizens/generationalWealthEngine.js:3054–3075`; its structured signal is `S.heritage.businessesOpened` (`:3227–3234`). The owning engine runs later at `phase01-config/godWorldEngine2.js:669` / `:2386`. Moving only past business dynamics cannot expose those openings. |
| Initiative neighborhood effects | **Yes, already before the old slot.** Phase 2 calls implementation effects at `phase01-config/godWorldEngine2.js:574` / `:2291`. `S.initiativeNeighborhoodEffects[hood]` contains aggregate metrics plus `advanced` (`phase02-world-state/applyInitiativeImplementationEffects.js:694–708`, `:847–858`). `advanced` means a positive-intensity phase change, not necessarily construction work. |
| Named initiative site work | **Partial, distinguish the receipts.** `S.initiativeSpend` carries initiativeId, phase, build and debit, but no hood (`phase02-world-state/applyInitiativeImplementationEffects.js:666–667`, `:824`). Implementation ripples carry source name, phase in causeDetail, target hoods and Cycle (`:746–759`; `utilities/rippleLedger.js:78–91`). They describe ongoing implementation effects, not proof of a new cron action or a construction completion. `S.initiativeImplementationTriggers` is explicitly no longer published (`phase02-world-state/applyInitiativeImplementationEffects.js:862–865`). |
| Phase-5 initiative outcomes | `S.initiativeEvents` supplies id/name/type/outcome/Cycle, without neighborhood (`phase05-citizens/civicInitiativeEngine.js:454–461`). Running after this producer does not turn a vote outcome into a hood-specific site-work receipt. |

Required correction: the design must name available signals with their grain and timing, and acknowledge the RNG/cohort change. Neither a generic business count nor an initiative vote proves the claimed opening/site action.

## 2. Aura and the hood pulse — graded tags fit; FIX the additive seam

**Graded pulse tags fit the existing writer directly.** `recordPulse_` resolves a primary tag into raw metric deltas, accumulates those deltas, and adds exactly one to `events` (`utilities/neighborhoodPulseMap.js:86–126`). Sign/band entries in `PULSE_MAP` can therefore reach the existing fold without modifying `v3NeighborhoodWriter`.

The fold is:

`delta = clamp(rawMetric / max(events, 8) * 8 * dampen, -cap, cap)`

Source: `phase08-v3-chicago/v3NeighborhoodWriter.js:82–101`, `:278–286`. It folds all four metrics at `:525–530`. For sentiment, one raw point at one event gives `0.02`; three points give `0.06`. Three points among 24 events give `0.02`. Caps and rounding mean higher aura need not produce a strictly larger persisted value in every neighborhood.

A weight argument could also preserve this writer contract **if it scales the raw metric deltas and still counts one event**. There is no current weight parameter. Weighting the event count as well changes the normalization and can cancel the amplification; calling the function repeatedly also changes event volume. Graded tags use the present API and match the proposed discrete bands.

**P1 — prose and secondary tags add effects independently of the grade.** `pulseForEvent_` adds primary mapping, marker rules and the first matching content rule (`utilities/neighborhoodPulseMap.js:86–103`). “new business” contributes vitality +3/sentiment +1; closure wording contributes vitality -3/sentiment -1 (`:70–72`). Thus differently worded ECL lines can change the mechanical pulse of one outcome. A private observation also pulses if unconditionally passed to this function with matching prose. The proposed public-event gate and the interaction between graded effects and these additive rules must be explicit before sign/weight invariance can be claimed.

## 3. Graded dial tags and readers — FIX, with one false dependency removed

**P1 — change both event representations.** Current LifeHistory uses `[Civic Role]` (`phase05-citizens/runCivicRoleEngine.js:379`), while LifeHistory_Log receives `CivicRole` (`:392`). Grading only the log leaves the actual dial fold flat. Both legacy names currently map to sociability +5/drive +2 (`utilities/citizenDialMap.js:43–44`).

| Reader | Effect of new tags |
|---|---|
| Live parser and dial fold | The parser accepts hyphenated tags intact (`utilities/compressLifeHistory.js:818–830`), and the fold calls `nudgesForEvent_(e.tag, 1, e.text)` (`:1624`). `baseTag_` strips only known calendar suffixes (`utilities/citizenDialMap.js:270–279`), so `CivicRole-Down-L` requires its own exact mapping. An unmapped grade can score from prose instead (`:302–320`). |
| Legacy TAG_TRAIT_MAP | Exact old keys exist (`utilities/compressLifeHistory.js:219–220`), but this is **not a live-fold blocker**. `computeProfile_` has no JS call site in the repository search; the live path calls `foldNewEntries_` (`:619–624`) and derives the face from dials (`:702–710`). The legacy lookup would ignore an unknown grade (`:949–954`). Do not present it as the active weighting mechanism. |
| General wake magnitude | Uses the same dial mapper and can recognize mapped grades without a new parser (`lib/wakePerception.js:34–43`). |
| General wake salience | Neither legacy civic tag nor the proposed grades is in `SALIENT_TAG` (`lib/wakePerception.js:374`). All are texture and compete for the remaining five-line-tail slots (`:410–418`). A large negative grade alone does not protect the setback from five later routine lines. This remains an acceptance gap, not a newly introduced loss of legacy salience. |
| Baseline brief scanner | Exact structural allowlist includes `CivicRole` (`scripts/engine-auditor/generateBaselineBriefs.js:49`); the filter checks exact EventTag membership (`:253–254`). Graded log tags drop out. Its old hint says “Civic role assumed” (`:289`), which is also factually unsuitable for the new neighborhood-observation meaning. |
| Other legacy producers | `utilities/tier1EssenceEvents.js:111–112`, `:435–436` still emit `Civic Role`. Retaining historical aliases matters; adding new grades is not permission to remove the old mappings or retag stored history. |
| Existing texture tests | `scripts/hoodBlindTexture.test.js:41` includes the civic pools and `:126` includes the engine in its source checks. Those are existing fallback/hood contracts, not proof of six graded outcomes. |

No existing dedicated CivicRole-Up/Down test was found in the code search. The new grades need proof through the actual LifeHistory parser, map, per-Cycle fold, log reader and wake tail; the baseline suites below do not supply that proof.

## 4. Negative draw versus civic-mode and AutoScandal — HOLD the non-duplication claim

**P1 — cannot confirm “cannot duplicate.”** There is no shared source-event receipt or cross-generator guard in the current civic-role engine. Its current `Status === scandal` branch simply emits another scandal line (`phase05-citizens/runCivicRoleEngine.js:261–263`). CIV flag eligibility and CIVIC ClockMode eligibility overlap (`:239–240`; `phase05-citizens/generateCivicModeEvents.js:397–399`).

Civic-mode's `usedObj` exists only inside that invocation; its key is Cycle + POPID + candidate text (`phase05-citizens/generateCivicModeEvents.js:355–374`). It cannot see a civic-role draw or recognize two phrasings of one incident. Its pools already cover personal burden, civic observances and public discontent (`:309–329`), so restricting the new engine to “hood events” alone is not proof of disjoint experiences. Its details expose POPID/Cycle/text/tags but no discrete source-event identity (`:490–500`).

AutoScandal is a distinct owned process: approval processing creates a `CIVIC_APPROVAL_SCANDAL` hook with POPID, officeId and Cycle and appends it to `S.approvalCeilingEvents` (`phase05-citizens/updateCivicApprovalRatings.js:850–869`); it queues office Status/expiry/source updates (`:906–915`). That path does not append a matching civic-role LifeHistory line or claim its event slot. Reading Simulation_Ledger.Status alone cannot detect office AutoScandal, and reading the office Sheet after the call still misses queued changes.

The later daily generator also considers **every** loaded ECL pool, rather than reserving `civic.*`/`hood.*` to civic role (`phase05-citizens/generateCitizensEvents.js:2921–2943`). ECL pool names are not ownership or deduplication boundaries.

N15/N24 therefore remain unproved. The implementation must demonstrate one owned experience/scoring consequence for the same citizen/source event/Cycle across these paths, including same meaning with different text and replay. A negative neighborhood experience must not assert an office scandal, resignation, vote, or cron action merely because the sign roll is down. This does not prohibit different citizens from experiencing the same real neighborhood event.

## 5. Complete write boundary — direct writes fit; state the downstream effects

The redesigned implementation does not yet exist. This is the complete write surface implied by the approved Task 6 outputs and the existing plumbing, not a claim that an unseen diff has been audited.

| Write | Owner and evidence | Forbidden category touched? |
|---|---|---|
| Simulation_Ledger LifeHistory append | Civic role mutates the shared row (`phase05-citizens/runCivicRoleEngine.js:378–381`). | No office/approval/status/money/job/household field. Text must obey the same boundary. |
| Simulation_Ledger LastUpdated | Existing bookkeeping write at `:382`; omitted from the task's shorthand “line, log and pulse.” | None of the forbidden categories. |
| LifeHistory_Log append intent | Current seven values: date, POPID, name, category, text, neighborhood, Cycle (`:385–399`). Intent persistence is separate from the row mutation. | None. |
| In-memory ledger dirty marker and counters | `ctx.ledger.dirty`, `S.eventsGenerated`, `S.civicRoleEvents`, summary assignment (`:402–413`). | None. No reader of `S.civicRoleEvents` was found. |
| In-memory hood pulse | `S.neighborhoodPulse[hood]` metric accumulators and `events` (`utilities/neighborhoodPulseMap.js:122–126`). | None of the forbidden citizen/office categories. |
| Downstream DialState and derived face/history | Compressor folds the emitted primary tag (`utilities/compressLifeHistory.js:1624–1635`) and writes DialState, TraitProfile/OriginVault fallback, and possible history compression (`:378–379`, `:702–710`). Shared rows persist at `phase01-config/godWorldEngine2.js:855` / `:2558`. | Dials/essence are intended effects. No direct office, approval, status, money, job or household write is required. |
| Downstream Neighborhood_Map | Existing writer adds pulse to Sentiment, CrimeIndex, RetailVitality, EventAttractiveness (`phase08-v3-chicago/v3NeighborhoodWriter.js:525–530`), called at `phase01-config/godWorldEngine2.js:823` / `:2531`. | These are persistent world metrics, explicitly intended by the pulse design. |

Approval, Famous, Tier, office membership, and premise receipts are **reads** for this engine. No initiative advance, approval update, business mint/closure, income/NetWorth change, status change, job assignment, household mutation, or direct bond write belongs to Task 6's event emitter. The existing compressor can drain independent reflection/bond/grief work in the same invocation; those writes must not be attributed to a civic-role event merely because it was present.

“Non-canon-altering” cannot mean “no persistent state changes”: history, dials and neighborhood metrics intentionally persist and influence later owning engines. Source already shows owner dials affecting closure thresholds (`phase05-citizens/applyBusinessDynamics.js:613–626`) and integrity affecting approval scandal odds (`phase05-citizens/updateCivicApprovalRatings.js:830–847`). The meaningful boundary here is no direct award or mutation of the forbidden categories by this event path.

## 6. ECL contract — FIX

| Surface | Existing behavior and required coverage |
|---|---|
| Pool keys | Loader accepts any nonempty PoolKey (`phase02-world-state/loadEventContentLedger.js:243–250`). No pool-name whitelist change is needed merely for `civic.*` or `hood.*`. Conditions and source tags still govern admission. |
| Source whitelist | `source:civicRole` is absent (`:41–60`); such a row is rejected when its first tag fails the whitelist (`:248`). Existing `source:civicNews` is accepted. The repair utility explicitly converts unsupported `source:civic` to `source:civicNews` (`scripts/repairContentLedgerCivicTags.js:45–46`). |
| Primary mapping | Daily `primaryFromTags` routes civicNews to `Civic Perception`, then unknown sources to Daily (`phase05-citizens/generateCitizensEvents.js:966–971`); both are dial-neutral (`utilities/citizenDialMap.js:48–49` and its Daily mapping). Adding the whitelist entry without corresponding routing violates the loader's documented paired contract (`phase02-world-state/loadEventContentLedger.js:25–28`). The realized sign/band must reach the LifeHistory primary tag; source alone does not encode it. This function is nested in the daily generator, not a shared helper automatically available to civic role. |
| Tier | **Already numeric** in the DSL (`phase02-world-state/loadEventContentLedger.js:80`) and present in daily condition scopes (`phase05-citizens/generateCitizensEvents.js:2877`). The civic-role consumer must supply the validated row value itself. |
| Fame | **Already numeric**, but means Cultural_Ledger FameScore, not Simulation_Ledger.Famous (`phase02-world-state/loadEventContentLedger.js:82–85`; daily producer `phase05-citizens/generateCitizensEvents.js:2880`). Reusing this name for the builder's Famous flag silently changes the authored contract. Famous is not currently a DSL field. |
| Approval | **Absent.** The DSL table has no approval field (`phase02-world-state/loadEventContentLedger.js:64–122`); unknown fields reject the entire row (`:149–150`, `:218–219`). A numeric approval condition needs both parser admission and the consumer scope, including unavailable/malformed handling. Approval lookup must also respect the queued-write timing in question 1. |
| Current premise, sign and band | There is no current DSL field for civic sign/band or explicit business-open/site-work receipts in that table. `hoodclosed` is a folk-memory count, not this Cycle's business-closure receipt (`:121`). Existing hood/season/trend fields cannot establish every proposed premise. The design record must specify which conditions select the realized outcome's wording. |
| Condition evaluation and composition | Loader only compiles terms. The evaluator is nested in the daily generator; absent/null/empty scope values fail terms (`phase05-citizens/generateCitizensEvents.js:1068–1092`). Its admission also verifies fillable slots (`:2933–2938`). Civic role currently calls none of this. Whitelist/DSL edits alone do not supply a working consumer or safe `$SLOT` composition. |
| Weight | ECL Weight is stored as wording weight (`phase02-world-state/loadEventContentLedger.js:231–240`) and enters the daily candidate weight (`phase05-citizens/generateCitizensEvents.js:2936`). It is not the dial/pulse band. Library volume and wording weights must not silently redefine the builder's sign/band odds. |

The existing source supports adding the required fields and graded routing, but does not yet guarantee conditional civic draws, one outcome per CIV citizen per Cycle, cross-generator ownership, or compatible fallback. Those are implementation and proving gates. This review supplies no aura numbers or new probability ruling.

## Local verification and gate

Read-only local checks completed:

- `node scripts/contentLedgerLoader.test.js` — 33/33 passed.
- `node utilities/neighborhoodPulseMap.test.js` — all checks passed.
- `node scripts/compressLifeHistory.dial.test.js` — 50 passed, 0 failed.
- `node scripts/citizenDials.test.js` — 67 passed, 0 failed.
- In-memory Node VM probes against the current mapper, pulse code, loader and neighborhood writer confirmed: graded suffix preservation; an unmapped down-tag with business wording receives positive drive/openness from the prose fallback; an unmapped grade with neutral prose produces no pulse; legacy CivicRole plus closure prose nets zero sentiment; approval/Famous conditions and civicRole source are absent; and the fold gives sentiment deltas `0.02`, `0.06`, `0.02` for the three numeric examples above. Synthetic probe inputs stayed in process memory.

These establish baseline mechanics only. No engine redesign, full-Cycle reorder proof, sandbox fire, deployment, live readback, or production validation occurred. **HOLD until the design record resolves premise timing, approval snapshot/cohort semantics, tag-reader compatibility, pulse weighting invariance, duplicate ownership and the ECL consumer contract; then review the implementation and its targeted proofs.**
