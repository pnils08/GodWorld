---
title: Housing initiative lever — tenant rent relief design
created: 2026-09-20
updated: 2026-09-20
type: plan
tags: [civic, engine, draft]
sources:
  - Builder request 2026-09-20 — design only; housing before safety; engine-sheet executes
  - docs/plans/2026-09-19-civic-wake-game-loop.md — Tasks 4 and 6, housing open question
  - docs/SIM_DOCTRINE.md section 15
  - phase02-world-state/applyInitiativeImplementationEffects.js
  - phase05-citizens/householdFormationEngine.js
  - phase05-citizens/generationalWealthEngine.js
  - phase05-citizens/migrationTrackingEngine.js
  - output/beats/meta.json — local C108 export generated 2026-09-20T21:49:34.662Z
pointers:
  - "[[plans/2026-09-19-civic-wake-game-loop]] — parent civic.38 rollout pointer and engine stage work"
  - "[[research/2026-09-20-codex-civic38-tasks1-3-adversarial-review]] — gate and evidence defects"
  - "[[SIM_DOCTRINE]] — an initiative must move its gate input"
  - "[[plans/PLAN_TEMPLATE]] — plan shape"
  - "[[index]] — registered with this design"
---

# Housing initiative lever

**Goal:** A voted, deployed housing initiative lowers the recorded monthly rent burden of actual households in its target hoods, and its later Delivering decision is backed by persisted relief rather than a phase label or falling sample size.

**Architecture:** Introduce an explicitly recorded tenant rent discount: preserve the gross lease amount and calculate the tenant's net MonthlyRent from it each Cycle. Publish housing relief on the initiative neighborhood bus, then apply it through the Household_Ledger writer before household stress and money/displacement readers. Measure the same annualized ratio used by civicPetitions; keep income formation, market rent, and approval consequences in their existing engines.

**Terminal:** engine-sheet executes; codex authored this design only. No engine, schema, config, cron or Sheet change is authorized by this document's existence. Track under the existing civic.38 row through its parent plan, not a duplicate work item.

**Status:** Builder ruled 2026-09-22 (tenant discount, 10%, four columns, migration) — engine-sheet executing. Implementation tasks below are in progress. Numeric policy recommendations are proposals, not recorded builder rulings. Housing remains unplayable and petition support remains disabled in current code.

**Pointers:**
- Parent stage and sponsor work: [[plans/2026-09-19-civic-wake-game-loop]] Tasks 4–6.
- Engine wiring: verified card below; Haiku engine-wiring run completed for Household_Ledger.MonthlyRent, then each dependency re-read locally.
- Existing columns: `schemas/SCHEMA_HEADERS.md:853-872`; existing catalog: `lib/initiativePhaseContract.js`, INTERVENTION_CATALOG.housing-program.

**Acceptance criteria:**
1. Matched sandbox baseline/control and treatment Cycles prove an actual Household_Ledger.MonthlyRent reduction caused by a qualified housing initiative; the same civicPetitions formula observes it.
2. Repeated Cycles do not multiply the discount; duplicate/overlapping initiatives cannot stack it or farm delivery credit; stall removes the service discount and revival restores only the existing benefit.
3. Unaffected hoods, owned households, gross market pricing, and earned Income remain unchanged by the direct relief writer. Legitimate downstream stress/savings/migration changes remain observable.
4. A deployed Standing row can move its stage-3 input before it becomes Delivering. Missing baseline, unknown geography, invalid money or absent service provenance cannot manufacture improvement.
5. Housing catalog playability is enabled only with the actual writer, schema, shared metric implementation and passing causal tests. This does not set a housing petition support band or equate households with population signatures.

## Recommended behavior for review

Choose **rent relief**, not an increment to HouseholdIncome. `updateHouseholdIncomes_` recomputes annual income from citizens/off-camera household rules (`householdFormationEngine.js:962-1036`); a later optional wealth pass can write it again (`generationalWealthEngine.js:1454-1525`). Adding relief to wages would be transient or require changing salary, savings, home-carry and household-income semantics across several engines. A rent discount directly moves the approved catalog expression and leaves earned income intact.

The initial housing-program should mean **tenant rent discount**. Narrow the existing catalog label, which currently groups rent relief, tenant protection and construction: one scalar discount cannot honestly simulate all three. No new citizen, initiative, organization, home, municipal transfer or budget is minted by this plan. This first lever reduces a tenant obligation; it does not claim a treasury has paid a subsidy or a landlord has lost revenue in an absent landlord ledger. A future cash-funded grant requires its own funded writer.

Proposed policy: a uniform **10% discount** on the gross monthly rent of active rented households in the program's folded target hoods while deployed. This is a recommended starting dial for review, not authorization to activate it. No means test or dependency on positive income: zero-income renters can receive a lower obligation, but their ratio stays undefined and they remain in a separate counter. Incomes are never filled in to make ratios calculable.

Persist proposed World_Config keys `civicHousingReliefEnabled` (false until reviewed activation) and `civicHousingReliefRate` (recommended 0.10; finite 0–1). Use the repository's config loader/ensure pattern; do not bury a second rate in the catalog, writer or cron. Rates at 0 and 1 are valid arithmetic boundaries. Do not scale rent by the unrelated PHASE_INTENSITY values: becoming operational must not reduce aid from 1.0 to 0.9. Phase is an eligibility condition, not an arbitrary price multiplier.

For gross rent G and qualified hood rate r:

```text
HousingReliefMonthly = roundToCents(G * r)
MonthlyRent = max(0, roundToCents(G - HousingReliefMonthly))
```

Always recompute from G. Never compute next Cycle's G from last Cycle's discounted MonthlyRent. Missing/non-finite/negative G is a printed invalid-money case; no fake zero lease. Owned households keep MonthlyRent as their mortgage payment. Dissolved rows receive no service and are excluded from live metrics.

## Baseline and sensitivity — local evidence, not a live effect

Command: `node scripts/civicPetitions.js --dry-run --json`, run after counter repair `3274f309`. Source is the matching local C108 beats and audit, not a fresh Sheet read. Observed: **392 active rented households, 392 evaluable, 106 strictly above 0.30**, and zero missing/zero/invalid-income or invalid-rent cases in that subset. Mapped population is 41,962; 106/392 is **27.04% of tracked rented households**, not a citywide prevalence estimate or a petition support percentage.

Hypothetical static copies of those rows, changing only active renters' MonthlyRent and rerunning the actual counter, give:

| Discount applied to all local active renters for sensitivity only | Households over 0.30 | Fewer than baseline |
|---|---:|---:|
| None | 106 | 0 |
| 5% | 89 | 17 |
| 10% | 78 | 28 |
| 20% | 51 | 55 |

These are mathematical sensitivities with frozen incomes, memberships and leases, **not forecast Cycle outcomes**. No initiative targets all those hoods in this measurement. Coverage is uneven: Lake Merritt 29/47, West Oakland 19/31, Rockridge 13/33, Piedmont Ave 10/26; East Oakland has only one tracked active renter and zero above-band cases. Dimond, Glenview, Ivy Hill and Eastlake have no tracked active rented rows in this snapshot. Do not invent beneficiaries or extrapolate household signatures to fill those gaps. A zero-evaluable target can neither supply a delivery baseline nor prove a burden reduction; the proposal/pack should state that limitation before consuming a move.

Reproduction of sensitivity: loadLocalData(); structuredClone(data); multiply only active/rented MonthlyRent by 1-rate with cent rounding; call countPetition({policyDomain:'housing',hoods:buildHoodResolver(data.Neighborhood_Map).hoods}, clone). No files or external state written.

## Verified wiring card and order

All pointers were checked in local source through the engine.250 and catalog cuts, with Kimi's concurrent pack changes excluded from this engine design. The generated card incorrectly repeated the old bus-clear defect, named stress detection as dissolution, and described direct writes as Phase-10 persistence. This verified card supersedes those claims.

| Link | Verified source and implication |
|---|---|
| Initiative source | `phase02-world-state/applyInitiativeImplementationEffects.js:141-159` reads Initiative_Tracker Name, Status, ImplementationPhase, PolicyDomain, AffectedNeighborhoods, Budget and InitiativeID. Housing DOMAIN_EFFECTS at `:228-230` contains only sentiment/engagement; no rent field exists. |
| Existing bus producer | Same file `:388-405,517-531` builds per-hood numeric effects and merges them additively into S.initiativeNeighborhoodEffects. Adding a structured object to that generic merge is unsafe; housing needs explicit max-rate handling and separate source metadata. |
| Both engine entrypoints | `phase01-config/godWorldEngine2.js:293,2042` produce initiative effects in Phase 2; `:355,2104` run initiative votes/stages in Phase 5; `:386-390,2135-2139` run household formation, wealth, then migration. Preserve both sequences. |
| Bus survives | `phase02-world-state/applyCityDynamics.js:1310-1312` folds only six named initiative fields. `:1541-1546` explicitly leaves the bus alive after engine.250. A housing-specific numeric field can survive to Phase 5 without becoming a city sentiment/retail field. |
| Approval bus is different | `applyCityDynamics.js:1292-1304` reads approvalNeighborhoodEffects from the immediately prior Cycle. Do not put rent relief on this delayed political-consequence bus or create a feedback loop where approval pays rent. |
| Child resolution | `phase01-config/canonNeighborhoodLoader.js:441-452` resolves parents/children through sheet-seeded S.canonHoods and throws if unseeded. Use it on both initiative hoods and household Neighborhood, deduplicate parents, reject unknown targets explicitly. |
| Household live objects | `phase05-citizens/householdFormationEngine.js:524-555` loads MonthlyRent, HouseholdIncome, HousingType, Status, Members and HouseholdSavings. `:175-214` loads/reconciles/forms households and refreshes income; `:216-221` evaluates stress and dissolution. Relief must update Sheet values AND the household objects before stress. Reload after criteria formation so newly appended households are not missed. |
| Existing direct household Writer | `householdFormationEngine.js:1035-1036` writes income/savings vectors immediately. `:1098-1105` reads monthly obligation for annual burden and savings buffer. This is an existing own-tracking Sheet exception; a Phase-10-only rent Intent would be too late for same-Cycle readers. |
| Money consequence | `phase05-citizens/generationalWealthEngine.js:311-326` reads net monthly housing cost into crisis state. `:1454-1525` contains a fresh-read, full-row household wealth writer; preserve added columns if it runs. Its HouseholdWealth-column guard at `:1484` currently makes that writer dormant on the observed 13-column schema; do not assume it runs in C108. |
| Home conversion | `generationalWealthEngine.js:1654-1657` prices using max(hood market rent, own lease); `:1733` passes MonthlyRent as that lease floor. `:1771-1773` changes HousingType to owned, MonthlyRent to mortgage and HousingCost to purchase price. Pass gross lease into market pricing after this design; clear rent-relief state on purchase without changing mortgage. |
| Relocation | `phase05-citizens/migrationTrackingEngine.js:205-224,253-265` reads household rent and current member incomes for displacement; `:348-368` builds the housing map from the Sheet. `updateHouseholdLedgerMove_` at `:801-823` writes destination hood/rent directly. Rebase gross rent to the destination lease and recompute destination relief there, not next Cycle. |
| New lease writers | `householdFormationEngine.js:395-396,428-429,798-800` initializes rent/income; `estimateRent_` at `:904-918` uses the hood's market median. `phase05-citizens/bondEngine.js:2275-2276` and `processAdvancementIntake.js:2198` also create rented households. They must initialize gross and net consistently, not copy a discounted prior lease. |
| Counter | `scripts/civicPetitions.js:180-198` selects active renters and computes MonthlyRent*12/HouseholdIncome with explicit invalid/zero/missing counters. It writes nothing and currently refuses housing playability. |
| Vote and approval | `civicInitiativeEngine.js:308-336` resolves the vote; parent Task 4 adds stage/baseline persistence. `updateCivicApprovalRatings.js:592-595` currently scores mayor/faction ownership; parent Task 5 adds sponsor ownership. Rent relief must not directly write approval. |
| Persistence boundary | `godWorldEngine2.js:593-595,2330` commits the citizen ledger/executes Intents; household direct writes have already happened. `utilities/rippleLedger.js:40-74` queues attribution through recordRipple_, but its fail-soft log at `:95` cannot be the sole proof of a rent write. |

## Proposed schema and state ownership

Existing Household_Ledger: **A HouseholdId, D Members, E Neighborhood, F HousingType, G MonthlyRent, H HousingCost, I HouseholdIncome, L Status, M HouseholdSavings** (`schemas/SCHEMA_HEADERS.md:860-872`). Resolve columns by header, never assume appended positions remain fixed.

Append these **proposed** household columns through an explicit engine-sheet migration:

| Proposed header | Meaning and Writer |
|---|---|
| GrossMonthlyRent | Undiscounted current rental lease, nonnegative currency; initialized from the observed current MonthlyRent before activation, then changed only by a real lease/relocation writer. Not a hood median overwrite. Blank for owned households. |
| HousingReliefMonthly | Current discount in monthly currency, recomputed by the relief Writer; zero for no service. |
| HousingReliefCycle | Cycle for which net/gross/discount were reconciled; engine Writer only. Not a once-ever discount flag. |
| HousingReliefInitiativeID | Single winning InitiativeID that produced the effective discount; blank when none. Never a model-selected identifier. |

Keep existing MonthlyRent as the **tenant's effective monthly obligation** for rented rows; for owned rows it remains the monthly mortgage. That is an explicit schema-contract change requiring docs and reader review. HouseholdIncome remains annual earned/household income. HousingCost remains a purchase price where already used; do not repurpose it as gross rent.

Migration copies only valid observed rental amounts, with invalid rows printed for repair. It must be idempotent and make **no change to MonthlyRent on initialization**. Rows added after migration initialize these fields via lease helpers. An owned row's stale gross/relief fields must never be restored over its mortgage. A failure to load the initiative input is not proof a service ended: leave persisted net obligations intact, mark relief refresh unavailable and prohibit new delivery evidence; a valid empty service set, by contrast, restores G and clears the discount.

## Bus and service qualification

Propose `S.initiativeNeighborhoodEffects[canonicalHood].rentReliefRate` as the numeric housing channel, plus `S.initiativeImplementationEffects.housing` as the per-initiative source slice (InitiativeID, folded hoods, qualified phase, configured rate). The slice follows the existing transit shape in `applyInitiativeImplementationEffects.js:509-515`; it is provenance for the rate, not a second independent source of benefit. Build both from the same validated source list.

- Use a separate explicit housing aggregation step: **maximum qualified rate per hood**, never the generic sum at `:525-527`. Tie-break equal rates deterministically by InitiativeID; one winner per household. A second identical program cannot get delivery credit for a discount already supplied by another. Retain all programs in source metadata so a withdrawn winner can reveal the next eligible program.
- Qualify housing only with a valid passed/enacted Task-4 vote state and Stage Standing or Delivering plus a permitted service phase: recommended `disbursement-active` for Standing, `operational` for Delivering. Draft/announced/vote-ready/Funded, construction, stalled, blocked, suspended and defunded pay zero. Do not infer passage from a populated VoteCycle or nonzero generic intensity. The producer currently reads Status without enforcing it; add housing-specific qualification instead of inheriting that permissiveness.
- `complete` should **not** deliver this recurring discount: closed service restores gross rent. Keep a delivering housing program operational while it supplies relief. Construction requires a future distinct catalog intervention.
- No negative rate on a stall: withdrawing a discount restores the real gross obligation; it does not add punitive rent. Existing stalled political costs still apply through Task 5.
- Do not re-run the entire Phase-2 producer after a Phase-5 vote/work change: it would duplicate other effects. Service eligibility uses the persisted start-of-Cycle tracker state. A stage/stall/revival written during Cycle N affects rents in N+1. State that latency in the pack; it is the existing phase-order boundary, not an accidental delay.

The primary relief call belongs in `processHouseholdFormation_` after reconciliation/formation and income refresh but before detectHouseholdStress_. It uses a fresh household read plus current source slice, writes only owned relief columns and MonthlyRent, then refreshes the objects stress consumes. Lease/move/purchase helpers keep this invariant later in the Cycle. A same-Cycle rerun sets the same values; it never subtracts another discount. A Cycle receipt is diagnostic, not permission to ignore a later genuine move in the same Cycle.

## Catalog and stage-3 metric

Retain the closed key `housing-program`, PolicyDomain housing, **Type vote** (current catalog ruling `2f92c778` applies to every proposed entry). Stage mapping for this lever: vote passed → Funded with no benefit; qualified work → Standing/disbursement-active; observed delivery → Delivering/operational. The benefit starts at Standing, so the metric gate can fire under SIM_DOCTRINE §15.

After implementation and proof, the catalog entry becomes:

```js
{
  label: 'Tenant rent discount', policyDomain: 'housing', type: 'vote',
  playable: true,
  effectChannel: 'S.initiativeNeighborhoodEffects.rentReliefRate -> Household_Ledger.MonthlyRent',
  stage3Metric: {
    tab: 'Household_Ledger', column: 'MonthlyRent*12/HouseholdIncome',
    direction: 'down', scope: 'hood'
  }
}
```

This is a **derived expression identifier**, not a literal header and not text to eval. Add a closed metric reader in the shared Apps-Script-compatible stage helper and a parity-tested Node mirror; both parse the two named numeric columns and annualize once. Do not store a mutable RentBurden column alongside two changing inputs.

Use the parent Task-4 **StageBaseline** column as versioned JSON, captured at the vote before service starts: metric identifier, baseline Cycle, folded target hoods, and an ID-keyed baseline cohort containing each active/rented household's valid positive annual income and valid net MonthlyRent. Also record excluded zero/missing-income and invalid-rent counts. Baseline is immutable across work, stalls and revival. Encode the cohort by stable HouseholdId; never rely on row number or resample to make a struggling program look successful. Verify the payload fits the accepted tracker serialization; if it does not, stop and design an indexed child ledger rather than truncate it.

Stage-3 evaluation:

1. Re-read persisted household facts; calculate current and baseline ratios for comparable original-cohort households still active/rented in the target. Report moved/dissolved/owned/missing/invalid rows separately. They contribute **no claimed improvement**, and never become fabricated zero-burden households.
2. Define cohort burden change as `sum(currentRatio - baselineRatio for comparable households) / originalEvaluableCount`. Attrition contributes zero change to this analytic comparison, explicitly labelled as such; it is not a claim of their current burden. Print current comparable mean and coverage beside it. Count-of-hardship-households remains separate from this continuous stage metric.
3. Require a strictly negative burden change (floating-point comparison tolerance only), at least one real beneficiary, and verified current service provenance from this InitiativeID. A changed denominator, a wage rise alone, or another initiative's existing discount cannot be the delivery proof. For overlapping programs, only the winning source can claim the discount; compare its additional relief against any discount already present in the vote baseline.
4. Stage evaluation currently runs before household relief. It consumes the last completed Cycle's persisted HousingReliefCycle and requires that receipt precede the present Cycle. Do not promote from a promised same-Cycle write. Expected trace: vote N → work stored later → Standing N+1 → first service N+2 → earliest measured Delivering N+3, assuming work timing permits the first transition.

This plan proposes an observable negative change without inventing a separate numeric delivery target. Activation of petition support is a **separate unresolved parent decision**: 0.30 is hardship, not a support fraction. Keep civicPetitions housing `support.cleared=false` and cron support bands unset until a reviewed household-versus-population signature rule is implemented. A playable intervention does not by itself authorize scheduling a vote.

## Traced defects and failure cases

- **Non-commuting writers:** direct household writes precede Phase 10, and later ownership/move writers overwrite MonthlyRent. A queued end-of-Cycle discount alone gives stress the old value and can overwrite a move. Solve with the shared lease invariant at every writer, not an extra blind end-of-Cycle patch.
- **Stale formation objects:** `formCriteriaHouseholds_` appends rows after the current households array is loaded (`householdFormationEngine.js:175-197`). Reload before the new relief/stress pass so a newly formed renter is not invisible to the program.
- **Income disagreement:** formation includes off-camera salaries (`:1004-1024`); the conditional wealth writer sums tracked citizens only (`generationalWealthEngine.js:1498-1510`), and migration prefers tracked live income (`migrationTrackingEngine.js:257`). These ratios can disagree. Keep the catalog metric on the explicitly chosen HouseholdIncome; capture the income-drift defect for engine-sheet without silently rewriting salary rules here.
- **Market-price contamination:** `homeMarketRent_` takes the larger of market median and the household lease. Pass GrossMonthlyRent as its lease floor after relief; otherwise an expensive lease discount can lower the inferred house price. `estimateRent_` remains an undiscounted market quote.
- **New key arithmetic:** the bus merge presently adds every incoming key. Explicit max handling is required; objects must never be concatenated or coerced into NaN. Do not add rentReliefRate to applyCityDynamics' six field fold or to approval carry.
- **Silent failure:** formation catches broad errors (`householdFormationEngine.js:250`), migration housing reads return {} on errors (`migrationTrackingEngine.js:373-375`), and ripple recording is fail-soft. The relief writer must expose an unsuccessful refresh and stage evaluation must refuse stale proof even if a whole Cycle reports complete. Missing source must not withdraw previously verified aid as if policy changed.
- **Sparse cohorts:** zero-baseline rows cannot satisfy a housing metric with current data. Surface this as a concrete proposal limitation; no synthetic canon households or random signature scaling.
- **No approval shortcut:** lower net rent changes household life; Task 5 supplies sponsor credit and stalled cost. Retain tests against repeated-stage and stall/revive farming. Do not inject approval points from the rent writer.

## Tasks

Each edit below is a bounded function/contract change; engine-sheet sequences the causal bench after the implementation tasks.

### Task 1: Register the reviewed policy and household schema
- **Files:** `phase01-config/engine94SheetContract.js`, `phase01-config/godWorldEngine2.js`, `phase05-citizens/householdFormationEngine.js`, `scripts/migrations/civic38_housing_relief.js` (new, proposed), `docs/SPREADSHEET.md`, `schemas/SCHEMA_HEADERS.md`.
- **Steps:** Add reviewed enable/rate keys using the config seed pattern (`engine94SheetContract.js:95-109`) and loadConfig_ (`godWorldEngine2.js:661-677`); parse the enable flag explicitly, never rely on truthiness of the string false. Implement explicit dry-run-first migration of the four proposed columns with gross copied only from valid rental amounts. No automatic live backfill.
- **Verify:** isolated migration fixture twice → identical columns/values, MonthlyRent unchanged; owned/invalid rows printed and preserved.
- **Status:** Cut 2026-09-22 (engine-sheet), off by default; bench proof pending.

### Task 2: Implement the net-rent calculation and lease invariant
- **Files:** `phase05-citizens/householdFormationEngine.js`; `scripts/civicHousingRelief.test.js` (new, proposed).
- **Steps:** Add pure gross/rate→net helper and header-resolved lease initialization/update helper; reject invalid money, preserve owned mortgage, carry relief source/Cycle. Use deterministic cent rounding.
- **Verify:** rates 0/0.10/1; duplicate application; missing/negative gross; missing income; owner exclusion; no caller-input mutation.
- **Status:** Cut 2026-09-22 (engine-sheet), off by default; bench proof pending.

### Task 3: Publish qualified housing programs on the initiative bus
- **Files:** `phase02-world-state/applyInitiativeImplementationEffects.js`; proposed test above.
- **Steps:** Read Task-4 passage/Stage fields; canonicalize both sides; populate housing source slice and max rentReliefRate with stable winner. Keep generic sentiment and other fields intact. Missing source is distinct from a valid empty list.
- **Verify:** all pre-deployment/failing phases pay zero; Standing/Delivering pay constant configured rate; duplicate child/parent and overlapping initiatives never double it; Phase-2 city fold preserves the field.
- **Status:** Cut 2026-09-22 (engine-sheet), off by default; bench proof pending.

### Task 4: Apply rent relief before household stress
- **Files:** `phase05-citizens/householdFormationEngine.js`.
- **Steps:** Refresh households after criteria formation and income update; apply qualified relief in one owned-column write; refresh objects for detectHouseholdStress_; publish refresh result. Do not queue a late stale rent write.
- **Verify:** same synthetic household has reduced Sheet and in-memory obligation before stress; off-hood household unchanged; no sources restores gross; unavailable source preserves state and reports unavailable.
- **Status:** Cut 2026-09-22 (engine-sheet), off by default; bench proof pending.

### Task 5: Preserve the lease invariant at all formation writers
- **Files:** `phase05-citizens/householdFormationEngine.js`, `phase05-citizens/bondEngine.js`, `phase05-citizens/processAdvancementIntake.js`.
- **Steps:** Route the identified rented-household initializations through the shared helper; estimated rent is gross, service uses destination hood. Do not change family formation rules.
- **Verify:** existing formation tests plus new synthetic rows enter with consistent gross/net/relief fields; subsequent income/stress pass sees the new household.
- **Status:** Cut 2026-09-22 (engine-sheet), off by default; bench proof pending.

### Task 6: Handle relocation and purchase
- **Files:** `phase05-citizens/migrationTrackingEngine.js`, `phase05-citizens/generationalWealthEngine.js`.
- **Steps:** In updateHouseholdLedgerMove_, replace gross lease with destRent and compute destination discount in the same write. In trackHomeOwnership_, use gross lease for the positive-rent eligibility check as well as market pricing (100% relief must not disable purchasing), then clear rental relief fields when mortgage replaces rent. Preserve any added columns through the conditional full-row wealth write.
- **Verify:** moves into/out of relief hoods, same-Cycle move after discount, purchase after discount, and two-Cycle rerun; mortgage and inferred market price match no-discount controls where gross/market values are identical.
- **Status:** Cut 2026-09-22 (engine-sheet), off by default; bench proof pending.

### Task 7: Add the derived metric and immutable baseline
- **Files:** `phase05-citizens/civicInitiativeEngine.js`, `lib/initiativePhaseContract.js`, `lib/initiativePhaseContract.test.js`, proposed housing test.
- **Steps:** Implement the versioned StageBaseline cohort and closed ratio reader in the engine-compatible helper plus Node parity; preserve original cohort/receipt attribution through stalls. Add next-requirement text for the pack to consume, addressing review F7.
- **Verify:** frozen denominator, child folding, zero/missing incomes, dropout/ownership/migration, overlapping source, wage-only change, bad receipt, repeated work and revival do not manufacture Delivering. Real own-source net reduction can clear on the next eligible Cycle.
- **Status:** Not started — coordinate helper ownership with parent Task 4.

### Task 8: Add persistence and causal acceptance probes
- **Files:** `scripts/civicHousingRelief.test.js`, `scripts/civicPetitions.test.js`, existing sandbox proving harness.
- **Steps:** Test engine producer→city fold→household Writer→stress/money/migration→persisted reread. Run matching sandbox control/treatment Cycles with the same household cohort and random inputs. Use the actual civicPetitions reader for after-state, not a hand-written ratio-only substitute.
- **Verify:** treatment moves the actual ratio; control does not get relief; repeated service remains flat; stall withdraws discount once; revival restores it once; observed receipts name the correct InitiativeID; unrelated effect buses retain identical values.
- **Status:** Not started. Sandbox proof is implementation acceptance; no live deployment or live Cycle requested here.

### Task 9: Enable the catalog only with proof and publish its contract
- **Files:** `lib/initiativePhaseContract.js`, engine catalog mirror from Task 4, `docs/SIMULATION_LEDGER.md` (downstream citizen effects pointer), `docs/SPREADSHEET.md`, `schemas/SCHEMA_HEADERS.md`, `docs/index.md`, parent civic.38 plan.
- **Steps:** After schema/writer/helper and bench acceptance, set housing-program playable true and narrow its label; publish the four columns, net/gross semantics, stage latency, observability and review evidence. Update correlated Markdown through the cheap documentation subagent under AGENTS.md; engine-sheet reviews that diff. Keep safety false and petition support disabled pending its separate parent ruling.
- **Verify:** catalog mirror parity, targeted suites, syntax checks, doc-loop lint, and exact proposed deployment diff; activation recorded separately from installed code and bench evidence.
- **Status:** Not started — final implementation gate.

## Engine-sheet rulings before the first cut (2026-09-22)

Measured on live C108, active rented households per canon hood: 11 hoods carry 26–47 (Lake Merritt 47, Uptown 45, Fruitvale 41, Chinatown 39, Downtown 34, Rockridge 33, West Oakland 31, Temescal 29, Laurel 27, Jack London 27, Piedmont Ave 26); KONO 5; Adams Point, Brooklyn, Baylight District and East Oakland 1 each; Grand Lake and San Antonio 2; Eastlake, Glenview, Dimond and Ivy Hill 0. Every renter carries a positive rent and a positive income (0 invalid, 0 missing). City median of hood medians 0.215; West Oakland 0.311, Lake Merritt 0.342 sit highest. The tracked ledger is the sample, never the denominator (SIM_DOCTRINE, ~0.25% tracked).

1. **Stage-3 reader = the built hood comparator, aggregated at read time, nothing stored.** `stageBaselineFrom` / `deliveryEdge` consume only `{available, tab, cycle, rows}`; a branch in `freezeCivicStageCohort_` for `tab: Household_Ledger` reads the household rows at Phase 2 (fire N sees Phase-5-of-N−1 rents, so the observation is N−1 by phase order — no stamp column), computes per-hood **median of MonthlyRent×12/HouseholdIncome over active rented households**, and returns the same cohort shape. No second comparator, no mutable RentBurden cell (codex's objection honoured), baseline/hold/regress/margin/`StageHold` retry-safety all reused. The lib mirrors the aggregation for the pack's display evidence, parity-tested like `tendFactor`. This supersedes Task 7's frozen-HouseholdId cohort. **Carried confound, recorded:** `dissolveStressedHouseholds_` removes the highest-burden renters each Cycle, lowering a hood median by itself; relief keeps them, so the bias runs against treatment (can hide delivery, cannot manufacture it). The bench control pair sizes it.
2. **City membership by minimum tracked renters.** A hood joins the housing cohort only with ≥ `civicHousingCohortMinRenters` (seed 10) active rented households; the freezer emits rows for members only, so the baseline's `city` list freezes at 11 hoods today and `deliveryEdge` reports `city-membership-changed` (hold restarts, per ruling 11) if a member thins out. A housing initiative whose target hood is not a member is `blocked: thin-cohort` — reported, no clock, like an unplayable domain. Thin hoods are a sample-size fact, not a world fact.
3. **Margin:** seed `civicDeliverMargin_housing` 0.20 (the unmeasured default, ruling (a)) until the bench control pair measures the noise floor of hood-median burden ÷ city median; re-rule after, as health was.
4. **Upkeep applies.** Ruling (c) landed after this plan: `rentReliefRate` scales by the tend factor like every Standing service (an untended program's discount fades to the floor, tending restores it). The plan's "do not scale by PHASE_INTENSITY" stands — that is a different multiplier.
5. **Columns self-arm, no migration script.** The house pattern for the stage columns: the household engine arms `GrossMonthlyRent`, `HousingReliefMonthly`, `HousingReliefCycle`, `HousingReliefInitiativeID` on the cycle path and, on first sight of a rented row with a blank gross, copies its current `MonthlyRent` (a valid positive amount only; owned rows stay blank). Idempotent, one fewer artifact to keep true. The builder approved a script; this keeps the approval's intent with the smaller footprint.
6. **Order:** Tasks 1–6 first, off by default (`civicHousingReliefEnabled` false), benched; the reader (ruling 1) after the control pair; catalog flips playable only on a bench pair (Task 9).

## Open questions

**RULED 2026-09-22 (builder):** tenant rent discount (not income), flat 10% (`civicHousingReliefRate` 0.10, `civicHousingReliefEnabled` false until bench acceptance), the four Household_Ledger columns and the migration script — build as designed; engine-sheet executes. The design offers concrete recommendations above. ~~Builder/engine-sheet acceptance of the tenant-discount semantics and proposed 10% rate is required before changing simulation behavior; the current request authorizes this design only.~~ The existing parent question about a housing **support** band and signature units remains open and does not block deterministic relief or causal bench development. No numeric support threshold is proposed by this document.

## Changelog

- 2026-09-22 (engine-sheet) — **Bench proof, disabled path.** 0908 re-synced from live C108 → @88 (7bb4fc3a) fire C109 died at cycle open in 9s (`reading '0'`, no Engine_Errors row): bisected by pinning the deployment back to @87 on the same sheet (ran clean, C109) — the cause was a missing trailing comma after `civicTendFloor`, which made the first housing seed an index expression and left a hole in `ENGINE213_CONFIG_SEEDS`; fixed `61eba9fa`, test pins every seed as a 6-tuple. @89 (61eba9fa) fire C110 `ok` 148s: four dials seeded (enabled 0, rate 0.1, min renters 10, margin 0.2), Household_Ledger 13 → 17 cols, all 416 active renters `GrossMonthlyRent == MonthlyRent`, relief cells blank, 0 Engine_Errors. Fourteen rows with a relief cell explained: nine movers (gross = destination lease, relief 0), three purchases (gross cleared), one dissolved after the copy — and one OWNED mover stamped with a gross: the migration engine moves owners and rewrites their mortgage as rent (pre-existing, filed G-EC87); the relief writer now touches rented movers only (test pins it). Node-side `housingBurdenCohort` landed (`a3bd3343`, contract 255/255) — feeds `stageBaselineFrom` unchanged. Next: fixture INIT-951 (West Oakland, Standing, signed, operational) + `civicHousingReliefEnabled` 1 on the bench, fire, then the control run for the margin.
- 2026-09-22 (engine-sheet) — **Tasks 1–6 cut, off by default, bench next.** Four dials seeded in `engine94SheetContract.js` (`civicHousingReliefEnabled` 0, `civicHousingReliefRate` 0.10, `civicHousingCohortMinRenters` 10, `civicDeliverMargin_housing` 0.20). Producer (`applyInitiativeImplementationEffects.js`): `S.initiativeHousingRelief` published every fire — `available:false` on an unreadable tracker, a valid empty slice when no program stands; a housing row qualifies only voted (passed+signed / override-passed), Stage Standing or Delivering, phase `operational` / `disbursement-active` / `implementation-active`; rate × upkeep tend factor; max per folded hood, tie-break by InitiativeID; all programs kept in `sources`. Household engine: `HOUSING_RELIEF_COLUMNS_` self-arm (ruling 5), `netRentFromGross_` (cents, clamped rate, null on invalid money), `housingReliefForHood_` (folds the household hood), `applyHousingRelief_` after the income pass and before stress with a reload so stress reads net rents and this Cycle's formed rows — loud-not-fatal (a bad dial reaches `Engine_Errors` as `Phase5-HousingRelief`, households still live). Move writer: destination lease is the new gross, destination discount in the same write. Purchase: gross prices and gates, relief cleared under the mortgage. Test `scripts/civicHousingRelief.test.js` 31/31 (producer qualification matrix, tie-break, upkeep, unavailable-vs-empty, helper boundaries, arm+copy idempotent, disabled/enabled/restore/unavailable paths, move in/out, purchase pins, seeds). Existing suites green (reconcile 105, maneuver 47, illness, transit, business, contract 247, game 54). Tasks 1–6 done; Task 7 = the freezer branch (ruling 1) after the control pair; Task 8 bench; Task 9 flip.
- 2026-09-22 (engine-sheet) — Builder accepted the design's sim calls as recommended; engine.251 moves blocked → in-progress. Wiring card + pre-mortem before the first cut.
- 2026-09-20 (codex) — Authored design only: preserved gross lease plus net rent relief, verified engine.250 bus/order card, C108 baseline and static sensitivity, stage metric, failure inventory and engine-sheet acceptance tasks.
