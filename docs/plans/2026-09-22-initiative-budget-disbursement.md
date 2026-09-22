---
title: Initiative Budget Disbursement — the housing lever, rebuilt as money onto rows
created: 2026-09-22
updated: 2026-09-22
type: plan
tags: [civic, engine, citizens, draft]
sources:
  - Builder direction 2026-09-22 15:10–15:27 (captured in plans/2026-09-19-civic-wake-game-loop.md §Builder direction 2026-09-22)
  - docs/SIM_DOCTRINE.md §3, §7, §14, §15, §16, §The test
  - docs/plans/2026-09-20-housing-lever.md (superseded lever — what it built, what it measured)
  - docs/plans/2026-09-19-civic-wake-game-loop.md §Task 4 engine rulings, §Matched-control measurement, §Rulings after the matched-control measurement
  - .claude/agents/civic-project-stabilization-fund/{IDENTITY,LENS,RULES}.md — the Fund's canon
  - phase05-citizens/householdFormationEngine.js detectHouseholdStress_ / dissolveStressedHouseholds_
  - phase05-citizens/civicInitiativeEngine.js checkMayoralVeto_ (the one Budget reader), createInitiative mint, CIVIC_STAGE_CATALOG_, civicStageStep_
  - phase02-world-state/applyInitiativeImplementationEffects.js (tend factor, per-initiative slices)
pointers:
  - "[[engine/ROLLOUT_PLAN]] — row engine.255"
  - "[[plans/2026-09-19-civic-wake-game-loop]] — parent game loop; stages, upkeep, Delivering, losing clock"
  - "[[plans/2026-09-20-housing-lever]] — superseded; its columns and dials fold or go under Task 8"
  - "[[SIM_DOCTRINE]] — §15 chain: start → peak → end → aftermath → referenced"
  - "[[index]] — registered with this design"
---

# Initiative Budget Disbursement

**Goal:** A voted initiative spends a real, depleting budget onto specific flagged rows in its hoods, one director's work-week at a time, so that a citizen's row changes because a seat played the game — and the service ends when the money is gone.

**Architecture:** `Budget` on Initiative_Tracker becomes a number the engine spends (`BudgetTotal` / `BudgetRemaining`, self-armed). Each Cycle a tended Standing/Delivering row pays a tranche onto the worst-flagged eligible rows in its folded hoods; for housing the grant lands in `Household_Ledger.HouseholdSavings`, the household engine's own stress logic reacts (a buffer dial replaces two hardcoded 12s), and the head of household gets a LifeHistory line. The stage-3 measurable is the household engine's existing stressed-renter share per hood against the city middle. The West Oakland Stabilization Fund (INIT-001, $28M, 295 applicants, $0 disbursed) is the first wire and the template; economic and workforce follow the same shape onto business and citizen rows under engine.252.

**Terminal:** engine-sheet designs and cuts; sim calls → builder (listed under §Builder calls). kimi + agy adversarial review before the first cut.

**Pointers:**
- What the superseded lever measured (reuse, do not redo): hood rent-burden medians C108 (`plans/2026-09-20-housing-lever` §Engine-sheet rulings), untreated hood-vs-city wobble 0.04–0.06 per step, luck max 0.126 over five Cycles.
- Stage machine already live: `civicStageStep_`, upkeep tend factor (grace 6 / decay 0.15 / floor 0.3), Delivering comparator `stageBaselineFrom` / `deliveryEdge`, losing clock, sponsor credit/drain — none of it changes here.
- Doctrine test: does this make a row drive a fate the builder didn't choose? Beverly Hayes (POP-00772, West Oakland, home health aide, approved C81, waiting) is the row.

**Acceptance criteria:**
1. On a bench pair from live-synced C108 (treatment: INIT-001 retagged housing with `BudgetTotal` 28,000,000; control: untouched), the treatment arm writes grants onto named West Oakland households each tended Cycle, `BudgetRemaining` falls by exactly the sum of grants, and every granted head of household carries a LifeHistory line naming the initiative and the Cycle.
2. A granted household's stress severity is lower than its control-arm twin's for as long as its savings hold; when savings are spent down by the money loop, it re-enters the flagged pool. No grant is ever paid to an owned, dissolved or unflagged row, and no household is granted twice inside the cooldown.
3. West Oakland's stressed-renter share vs the city middle drops past the measured margin within the hold window and the row reaches Delivering by the built comparator; the control arm does not.
4. An untended row (tend factor below 1) pays a proportionally smaller tranche; at the floor it still pays, so a neglected fund drips rather than stops — and `BudgetRemaining` reaching 0 ends the service (phase `complete`, no further grants, the row's Delivering can regress) with no code path that refills it.
5. `Number(Budget)` is read nowhere. A row whose `Budget` string cannot be parsed to money is `blocked: no-budget` on the board, pays nothing and runs no clock, exactly like an unplayable domain.
6. After Task 8 no engine.251 relief column, dial or writer remains on main or on live; `civicHousingRelief.test.js` is retired; G-EC70 (owned households anchored) stays.

---

## The shape, in one Cycle

```
Phase 2  applyInitiativeImplementationEffects_
         ├─ reads tracker: Stage, phase, BudgetRemaining, tend (already computed)
         └─ S.initiativeDisbursement[initId] = { domain, hoods[], tranche, remaining, tend }
                tranche = min(remaining, civicDisburseTranche_<domain> × tend)
Phase 5  processHouseholdFormation_  (after updateHouseholdIncomes_, before detectHouseholdStress_)
         ├─ applyHousingDisbursement_: for each housing slice
         │    eligible = active rented households in folded hoods, flagged by the engine's own stress
         │               formula, not granted by this initiative within civicGrantCooldownCycles
         │    order    = rentBurden desc, tie-break HouseholdId
         │    grant    = min(GrantMonths × MonthlyRent, tranche left)   until tranche is spent
         │    writes   = HouseholdSavings += grant; LastGrantCycle; LastGrantInitiativeID   (own-tab, same class as casinoLedgerEngine)
         │               ctx.ledger LifeHistory line on the head of household (Phase 10 commits)
         │               S.initiativeDisbursement[initId].paid += grant; .grants.push({hh, amount})
         └─ detectHouseholdStress_ reads savings against dialSavingsBufferMonths (was 12, hardcoded twice)
Phase 5  civicInitiativeEngine (stage step, later in the phase)
         ├─ BudgetRemaining -= paid  (tracker write, same class as the stage columns)
         └─ remaining <= 0 → ImplementationPhase 'complete', MilestoneNotes 'budget exhausted C<n>'
Phase 2 (next fire)  stage-3 observation: stressed-renter share per hood vs city middle
```

The §15 chain: **start** (vote → Funded → work → Standing, first grants) → **peak** (hood share drops, Delivering) → **end** (budget out, phase complete; or untended, tranche fades) → **aftermath** (savings spend down through the money loop, households re-flag, the row regresses, the seat's clock runs) → **referenced** (LifeHistory lines, `BudgetRemaining` 0, MilestoneNotes, the board). Both directions.

## What is a flag (housing)

The engine already raises it — `detectHouseholdStress_`: `MonthlyRent × 12 / HouseholdIncome ≥ 0.40` warning, `≥ 0.50` crisis, skipped when `HouseholdSavings ≥ MonthlyRent × SAVINGS_BUFFER_MONTHS`. Crisis rows roll a 10% dissolution each Cycle. This plan adds no new flag. It makes savings matter in proportion instead of all-or-nothing (Task 3), so a grant that does not fill the whole 12-month buffer still lowers severity.

The tracked ledger is the sample, never the denominator (SIM_DOCTRINE, ~0.25%). Grants land on tracked households because those are the rows the world has; the count of grants is the count of tracked rows helped, and the pack says so.

## Money

`Budget` today is a display string (`"$28M"`); `Number()` of it is 0, so the one engine reader (`checkMayoralVeto_`) has never seen a budget. Two engine-armed tracker columns, parsed once:

| Column | Writer | Meaning |
|---|---|---|
| `BudgetTotal` | engine, once, from `Budget` via `parseBudgetMoney_` (`$28M` → 28000000, `$12.5M` → 12500000, `$230M`, `$2.1B`; blank/unparseable → blank) | the authorized amount |
| `BudgetRemaining` | engine, `BudgetTotal` on arm, then `-= paid` each Cycle | what is left to spend |

No city treasury. A row's own number is a fix to an existing column; a treasury is a new system and the builder called it tricky — it waits until two or three funds are spending and the question is real.

Live seed for INIT-001: `BudgetTotal` 28,000,000; `BudgetRemaining` 28,000,000 (canon: $0 disbursed as of C86 — Webb's arc). The seat-proposed mint (`createInitiative`) sets `Budget` from `spec.budget`; a proposal without one is a valid row that cannot stand up (`blocked: no-budget`) until a `work` move with a budget or an amended proposal supplies it — ruling below.

## Builder calls (sim — decide before Task 1)

1. **Retag INIT-001 `economic` → `housing`.** Canon says household anti-displacement fund; the catalog keys by domain. Live tracker cell edit, MilestoneNotes line. Recommendation: yes.
2. **Grant size.** `civicHousingGrantMonths` — months of the household's own rent per grant. Recommendation: 6 (half the buffer; lowers a crisis to warning under Task 3, does not erase the flag).
3. **Tranche per Cycle.** `civicDisburseTranche_housing` in dollars per tended Cycle. At 6-month grants on West Oakland's ~$1,500–3,600 leases (median rent-burden hoods, C108), a $400,000 tranche pays roughly 25–40 households a Cycle; $28M lasts ~70 Cycles at full tend. Recommendation: 400,000 — measure on the bench, re-rule.
4. **Cooldown.** `civicGrantCooldownCycles` — Cycles before the same initiative can grant the same household again. Recommendation: 26 (half a year).
5. **Budget exhausted = service ends.** Phase → `complete`; the seat re-proposes a new row for more money. No refill path. Recommendation: yes.
6. **Seat proposals carry a budget.** The `propose` move gets a `budget` field the seat must fill from a closed band per domain (pack lists the band); missing → the row stands as `blocked: no-budget`. Recommendation: yes, bands per domain seeded in World_Config (`civicBudgetBand_housing` etc.), builder sets the numbers.
7. **Fold vs remove the engine.251 discount code.** Recommendation: remove (Task 8); nothing of the flat discount survives into the disbursement shape except the C108 measurements.

## Tasks

### Task 1: Budget parse + the two tracker columns
- **Files:** `phase05-citizens/civicInitiativeEngine.js` (modify: `INITIATIVE_STAGE_COLUMNS_` gains `BudgetTotal`, `BudgetRemaining`; `parseBudgetMoney_` pure; `ensureInitiativeStageColumns_` arms and back-fills `BudgetTotal`/`BudgetRemaining` from `Budget` once — never re-parses a row that already carries `BudgetTotal`); `lib/initiativePhaseContract.js` (mirror `parseBudgetMoney`, parity test); `scripts/regenSchemaHeaders.js` run after the live arm.
- **Steps:** parse `$`, `M`, `B`, `K`, commas; blank/NaN → blank; test the six live strings; arm on the cycle path like the stage columns.
- **Verify:** `node lib/initiativePhaseContract.test.js` parity ≥ 6 fixtures; bench fire arms two columns, INIT-001 28000000 / 28000000, INIT-006 2100000000, INIT-007 12500000.

### Task 2: Disbursement slice (Phase 2)
- **Files:** `phase02-world-state/applyInitiativeImplementationEffects.js` (modify: `S.initiativeDisbursement` built beside the transit/housing slices — one entry per Standing/Delivering row with `BudgetRemaining > 0` and a playable disbursing domain; tranche = `min(remaining, civicDisburseTranche_<domain> × tend)`); `phase01-config/engine94SheetContract.js` (seeds: `civicDisburseTranche_housing`, `civicHousingGrantMonths`, `civicGrantCooldownCycles`, `dialSavingsBufferMonths` 12).
- **Verify:** unit test: no budget → no slice; untended → tranche × floor; remaining < tranche → remaining.

### Task 3: Savings buffer becomes a dial, severity proportional
- **Files:** `phase05-citizens/householdFormationEngine.js` `detectHouseholdStress_` (modify), `phase05-citizens/migrationTrackingEngine.js` (the second hardcoded 12).
- **Steps:** `bufferMonths = dialSavingsBufferMonths`; savings ≥ full buffer → skip (unchanged); savings ≥ half → crisis capped at warning; below → unchanged. Read the dial through `ctx.config` with the fail-loud pattern.
- **Verify:** `scripts/householdStress.test.js` (new, small): four fixtures across the three bands. Bench: dissolution count per Cycle unchanged on the control arm (no grants → no behaviour change).

### Task 4: The housing grant writer (Phase 5)
- **Files:** `phase05-citizens/householdFormationEngine.js` (modify: `applyHousingDisbursement_` called from `processHouseholdFormation_` after the income pass and before stress, replacing the `applyHousingRelief_` call site; arms `LastGrantCycle`, `LastGrantInitiativeID` on Household_Ledger the first time a grant is paid — not before); `docs/engine/SHEETS_MANIFEST.md` §9 row.
- **Steps:** eligible/order/grant as in §The shape; write `HouseholdSavings` + the two receipt columns as column vectors (the `casinoLedgerEngine` class); LifeHistory line on the head via `ctx.ledger` (`"received a $<amount> stabilization grant from <Name> (<InitiativeID>)"`, tag `Relief`); `S.initiativeDisbursement[id].paid` / `.grants`; reload household objects so stress reads the new savings. Loud-not-fatal like the relief writer was.
- **Verify:** `scripts/civicDisbursement.test.js` (new): eligibility matrix (owned, dissolved, unflagged, off-hood, cooldown), order, tranche exhaustion mid-list, receipt columns, ledger line, idempotent rerun pays nothing twice in one Cycle.

### Task 5: Spend and end (Phase 5, stage step)
- **Files:** `phase05-citizens/civicInitiativeEngine.js` (modify: after the stage step, `BudgetRemaining -= paid` for every slice with `paid > 0`; `remaining <= 0` → `ImplementationPhase = 'complete'`, MilestoneNotes `budget exhausted C<n>`; the existing stall/regress logic then applies).
- **Verify:** contract test: remaining 100, paid 100 → complete; paid 0 → unchanged. Bench: `BudgetRemaining` falls by the exact grant sum each Cycle.

### Task 6: Stage-3 measurable = stressed-renter share
- **Files:** `phase05-citizens/civicInitiativeEngine.js` `freezeCivicStageCohort_` Household_Ledger branch (modify: per-hood **share of active rented households flagged warning-or-crisis** — the same formula as `detectHouseholdStress_` including the buffer dial — in place of the rent-burden median); `lib/initiativePhaseContract.js` `housingBurdenCohort` → `housingStressCohort` (mirror, parity); `CIVIC_STAGE_CATALOG_.housing` + catalog `stage3Metric` → `{ tab: 'Household_Ledger', column: 'stressedRenterShare', direction: 'down', scope: 'hood' }`; `civicHousingCohortMinRenters` stays as the membership bar.
- **Verify:** parity over 7 fixtures; the comparator consumes it unchanged.

### Task 7: Bench pair, margin, playable
- **Steps:** re-sync 0908 from live; treatment arm: INIT-001 retagged housing + `BudgetTotal` seeded; control arm: untouched; four fires each from C109. Measure West Oakland stressed share vs city middle per Cycle on both arms; the untreated wobble from the ten other member hoods is the noise floor; seed `civicDeliverMargin_housing` at ~60% of the treated effect above the worst luck, as health and the superseded lever were. Flip `housing` `playable:true` both sides only after the treated arm reaches Delivering and the control does not. Re-pin the five test files.
- **Verify:** `output/engine-sheet/2026-09-2X-disbursement-pair-c108-c112.json`; DEPLOY_HISTORY entry.

### Task 8: Remove the engine.251 discount lever
- **Files:** `householdFormationEngine.js` (`HOUSING_RELIEF_COLUMNS_`, `ensureHousingReliefColumns_`, `netRentFromGross_`, `housingReliefForHood_`, `applyHousingRelief_` / `Body_`), `migrationTrackingEngine.js` (the gross/relief branch in the move writer — G-EC70's owned-row refusal stays), `generationalWealthEngine.js` (gross pricing branch), `applyInitiativeImplementationEffects.js` (`S.initiativeHousingRelief`, `buildHousingReliefSlice_`, `getCivicHousingDials_` → replaced by the disbursement dial reader), `engine94SheetContract.js` (retire `civicHousingReliefEnabled`, `civicHousingReliefRate`; keep `civicHousingCohortMinRenters`, `civicDeliverMargin_housing`), `scripts/civicHousingRelief.test.js` (retire), live World_Config (delete the two retired keys, read back), `docs/engine/ENGINE_STUB_MAP.md` (`/stub-engine`), SHEETS_MANIFEST §9.
- **Verify:** `grep -rn "HousingRelief\|GrossMonthlyRent" phase*/ lib/ scripts/` → only the G-EC70 comment trail; suites green; bench fire clean.

### Task 9: Seat proposals carry a budget (scripts lane)
- **Files:** `scripts/cron-civic-run.js` (`propose` move shape + validator: `budget` required, inside `civicBudgetBand_<domain>`), `scripts/buildCivicOfficeSlice.js` (pack lists the band, the board shows `BudgetRemaining` and last Cycle's grants), `scripts/createInitiative.js` (`spec.budget` → `Budget` string the parser accepts), tests.
- **Owner:** research-build or kimi after Tasks 1–5 land; one owner per file per the game-loop plan.

## Out of scope (own rows)

- Economic / workforce disbursement onto business and citizen rows — engine.252 takes this shape; the household writer is the template.
- A city treasury / revenue that caps open budgets.
- The petition support band for housing (parent open question; unchanged).
- Transit as a system — engine.253.

## Open questions

None invented. The seven builder calls above are the open items; each has a recommendation.

## Changelog

- 2026-09-22 16:20 (engine-sheet) — Drafted from the builder's direction (15:10–15:27) after engine.255 step 1 (lever off) went live at PROD @120. Sent to kimi and agy for adversarial review before the first cut.
