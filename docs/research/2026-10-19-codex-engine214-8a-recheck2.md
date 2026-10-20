---
title: Engine.214 Step 8 Cuts B and C second plan recheck
created: 2026-10-19
updated: 2026-10-19
type: reference
tags: [engine, citizens, draft]
sources:
  - docs/plans/2026-10-10-engine-214-mood-per-hood.md
  - phase05-citizens/generateCitizensEvents.js
  - phase05-citizens/applyBusinessDynamics.js
  - phase04-events/chaosCarsEngine.js
pointers:
  - "[[plans/2026-10-10-engine-214-mood-per-hood]] — Step 8 B/C recheck"
---

# Engine.214 Step 8 — Cuts B and C, recheck 2

**Scope:** the “Contract after the recheck” at `docs/plans/2026-10-10-engine-214-mood-per-hood.md:207-210` (commit `f7f6c9fe`), against the B/C findings in `docs/for-claude-review/2026-10-19-codex-engine214-8a-spot-recheck.md:24-25`, `:46-62` and current source. Cut A is outside this review. Plan/source review only: no code edits, tests, Sheet reads, bench fires, or deployment.

| Cut | Verdict | Gate |
| --- | --- | --- |
| B, trajectory reactions | **HOLD** | Correct the claimed baseline mass and pin an acceptable offered/drawn rate against the whole pool. The signed ratio is coherent, but its total mass collapses at high trajectory intensity. |
| C, citizen's spot | **HOLD** | Wire an outcome to the business without changing the numeric chaos fold, and give each eligible outcome wording that its record actually supports. The four outcomes do not all establish a temporary closure for repairs. |

## Cut B — prior findings

| Prior finding | Status against the new contract | Evidence |
| --- | --- | --- |
| `source:nbhdState` did not match T5 | **Closed in plan; unbuilt.** `react:brag|complain|humble|defend` plus a dedicated T5 branch and one multiplier per entry supplies the missing route. | Plan `:209`; present T5 handles `source:neighborhood` but not `source:nbhdState` at `phase05-citizens/generateCitizensEvents.js:3320-3341`. |
| Defend had no multiplier | **Closed in plan.** Defend is explicitly × sociability. | Plan `:209`; dial multipliers are read at `utilities/compressLifeHistory.js:1245-1262`. |
| Opposite-direction reaction would inherit the trajectory fact's sign | **Closed in plan.** Explicit `dial:outabout:up|down` takes precedence over `state:trajectory-*`; the real trajectory remains context. | Plan `:209`; `generateCitizensEvents.js:1054-1059`, `:1104-1128`. |
| Weight stacking and neutral sign | **Partly closed.** Under the specified tags, the current category and grief rules do not boost these entries, and the current continuity comparison does not match their tags. The claimed ≤6 is not a final enforced cap if wording or tags expand. | Plan `:209`; `generateCitizensEvents.js:134-155`, `:3293-3362`, `:651-657`. |
| Pool competition and net outabout change | **Open.** Offered/drawn by reaction and band is useful, but the plan still calls the new total “today's” mass and does not compare total trajectory mass to all eligible pool mass. | Plan `:209`; `generateCitizensEvents.js:1696-1718`, `:2671-2678`, `:3374-3418`. |

### B mass check

The **existing** two-entry total is `pw(1.1, mi) + pw(1.0, mi)`, with each `pw` capped at 6 (`generateCitizensEvents.js:1696-1718`). The new proposed total is `min(4, 2.1 × (1+4mi))` (`plan:209`). At `mi=0`, both totals are 2.1. At `mi=0.5`, old is 6.3 versus new 4; at `mi=1`, old is 10.5 versus new 4. Thus the proposed rule cuts high-intensity trajectory mass by **62%** before competing entries or any modifier. At neutral dials, its 2/3-with and 1/3-against split gives the correct *sign* but only `M/3` signed mass (1.33 at the cap) versus the old all-with 10.5 at `mi=1`. This may make trajectory reactions rare and sharply reduce outabout movement even while the signed ratio passes. Pin whether that reduction is intentional, and read offered effective mass / whole-pool mass, drawn reactions, and graded up/down by hood and dial band. A one-Cycle zero draw is “eligible but unpicked,” not proof of no candidate (`generateCitizensEvents.js:3374-3418`).

For the exact four-tag shape (`source:nbhdState`, one `state:trajectory-*`, one `react:*`, one `dial:outabout:*`), no archetype category matches: the category loop seeks `source:neighborhood` or other named tags (`generateCitizensEvents.js:3300-3308`). Its text tests can still apply 1.15 for each of `coordinated`, `noticed`, and `work` if future reaction wording uses those words (`:3310-3316`). The grief rules match neither the specified source nor reaction tags (`:134-155`). Continuity compares each entry tag with `mem.recentPrimary`, which stores the **written primary tag** such as `Neighborhood-Outabout-Up-S`, not the source/reaction/fact/dial tags (`:651-657`, `:3348-3362`, `:3563-3575`). On this exact path it therefore does not impose its nominal 0.85 factors; the neutral-dial 2:1 sign is preserved by today's later code. With the 2/3 side mass allowed to concentrate on one entry, its T5 maximum is `4 × 2/3 × 1.5 = 4`, below 6. But all three text boosts would make that `4 × 1.15³ ≈ 6.08`; extra category tags could also stack. Fix the reaction text/tag contract or clamp final effective reaction weight if “≤6” is a hard guarantee. Do not describe a pre-T5 `pw` cap as a post-modifier pin.

## Cut C — prior findings

| Prior finding | Status against the new contract | Evidence |
| --- | --- | --- |
| `d.disrupted` was not repairs | **Closed.** The contract removes it. | Plan `:206`, `:210`; `applyBusinessDynamics.js:451-454`. |
| Streak floor and prior-Cycle availability | **Closed in plan.** Floor is 2; `ps.streak` is loaded before this Cycle's `d.streak`, and collection is after the close/shed decisions. | Plan `:206`, `:210`; `applyBusinessDynamics.js:525`, `:574-580`, `:619`, `:647-695`. |
| `S.businessDeclines` was not yet assigned; specific worker was invented | **Closed in plan.** It uses local `declines[id]` after shedding and says only “let some staff go.” | Plan `:210`; `applyBusinessDynamics.js:690-695`, `:712-714`. |
| Recovery claimed measured traffic | **Closed in plan.** “Steadier again” follows the streak ending without inventing patrons. | Plan `:210`; `applyBusinessDynamics.js:478-485`. |
| Home-game/bar/packed claim | **Mostly closed.** It now says food-class, drops home and packed, and uses positive `barTerm`. “Buzzing” is still an inference from modeled economic reach, not an attendance count. | Plan `:210`; `applyBusinessDynamics.js:281-285`, `:597-616`; `utilities/sportsWeekRecord.js:344-360`. |
| Repairs cause and duration | **Open.** The four eligible outcomes do not all state that this business closed, needed repair, or reopened next Cycle. | Plan `:206`, `:210`; `utilities/chaosCarsConfig.js:190-201`, `:233-243`, `:308-319`. |
| Contradictory earlier Step 8 items | **Closed in plan.** “Supersedes the matching items above” identifies the new authority; old bullets remain historical text. | Plan `:190-197`, `:207`. |

### C chaos wiring and reachability

The outcome **name is not in scope** at `accumulateBusinessEvent_(ctx, bizId, bizEvent)` (`phase04-events/chaosCarsEngine.js:601-612`). Its vehicle caller has `outcome.outcome` at `:725-729`, `:765-767`; the weather caller at `:1004-1013` passes only `-1` and has no vehicle outcome. Appending a name inside the current helper without a fourth parameter cannot work. Changing `S.chaosBusinessFold[id]` from its summed number to an object would break the `Number(chaosBiz[id])` reader in `phase05-citizens/applyBusinessDynamics.js:525-528`, `:604-606`. Pass the outcome key from the vehicle caller into a separate per-BIZ_ID list, leaving the numeric fold and weather path intact; or use the **already assembled** `S.chaosCarsEvents` records, which carry `targetScope`, `targetId`, and `diceOutcome` before BusinessDynamics (`chaosCarsEngine.js:771-787`; `phase01-config/godWorldEngine2.js:609-657`, `:2326-2374`). Preserve multiple outcomes on one BIZ_ID rather than overwriting with the last one.

All four outcomes **can** reach business scope in the checked config: `fire_engine` has business scope and positive weight, with `minor_fire` 0.40 and `major_blaze_contained` 0.15 (`utilities/chaosCarsConfig.js:190-197`); `building_inspector` is business-only with `forced_temporary_closure` 0.20 (`:233-243`); `pge_truck` has business scope with `transformer_blowout` 0.25 (`:308-319`). `chaosOutcomePool_` admits outcomes without narrower `scopes`, and the loop selects a positive-weight vehicle, one of its scopes, then an outcome (`chaosCarsConfig.js:383-395`; `chaosCarsEngine.js:117-129`, `:153-169`, `:967-974`). A business target is sampled from Business_Ledger rows (`chaosCarsEngine.js:319-365`). This proves code-path reachability, not a fresh live frequency or that a particular citizen's open spot was hit.

The cause-to-line mapping remains the C blocker. `minor_fire` says only a minor fire; `major_blaze_contained` says the blaze was contained; `transformer_blowout` says a block lost power; none records that the named business closed for repairs (`chaosCarsConfig.js:194-197`, `:311-315`). `forced_temporary_closure` explicitly shutters pending **compliance**, which supports “temporarily closed pending compliance,” not the blanket repair cause (`:237-241`). The chaos fold is a growth-rate event, while permanent business closure is a separate streak/revenue branch (`chaosCarsEngine.js:601-612`; `applyBusinessDynamics.js:647-688`). Use outcome-specific, same-Cycle wording, and do not assert a next-Cycle reopening without a persisted state/receipt. Keep the plan's open-row exclusion; a temporary compliance closure can still have an open Business_Ledger row (`applyBusinessDynamics.js:647-695`).

### C sports wording

`barTerm > 0` is a sum of `wk.signed × hood share`; the share includes home venue and away-game watch-party reach (`utilities/sportsWeekRecord.js:344-360`). `wk.signed` is weighted **surprise against expectation**, not a patron count (`:101-132`, `:281-293`). A positive term does imply some contributing franchise had `w > 0`, since its win fraction exceeded a nonnegative expectation, so “after **a** win” is defensible without naming a team. A food-class row can receive that modeled uplift, including a restaurant rather than a bar (`applyBusinessDynamics.js:281-285`, `:597-616`). “Buzzing” remains a soft activity inference; if the rule is strictly row facts only, say the spot “felt a lift after a win.” The plan's old home-game/packed claim is resolved, but no crowd or sales measurement follows from `barTerm` alone.

**Gate to resume B/C:** correct and explicitly accept or revise B's intensity-dependent mass reduction, and prove its effective mass/sign against the full pool. For C, define the per-business outcome source and multi-hit behavior, then map each outcome to text it supports; keep the numerical chaos fold unchanged. Review the concrete diffs and bench separately.
