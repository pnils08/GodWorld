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

**Architecture:** `Budget` on Initiative_Tracker becomes a number the engine spends (`BudgetTotal` / `BudgetRemaining`, self-armed). Each Cycle a tended Standing/Delivering row spends its tranche — the money leaves `BudgetRemaining` whether or not tracked rows qualify (the tracked ledger is ~0.25% of the world; the rest of the tranche is the director's off-camera disbursement, §13 color) — and, inside that tranche, pays grants onto the worst-flagged eligible tracked rows in its folded hoods. For housing a grant fills a household's savings up to the engine's own 12-month buffer (capped by a dial), so the engine's existing stress logic unflags it with no change to the physics for anyone else, and the head of household gets a LifeHistory line. The stage-3 measurable is the flagged-at-vote household cohort, relieved-or-kept against the city's flagged rows (Task 6 — a hood share would open for the control arm). The West Oakland Stabilization Fund (INIT-001, $28M, 295 applicants, $0 disbursed) is the first wire and the template; economic and workforce follow the same shape onto business and citizen rows under engine.252.

**Terminal:** engine-sheet designs and cuts; sim calls → builder (listed under §Builder calls). kimi + agy adversarial review before the first cut.

**Pointers:**
- What the superseded lever measured (reuse, do not redo): hood rent-burden medians C108 (`plans/2026-09-20-housing-lever` §Engine-sheet rulings), untreated hood-vs-city wobble 0.04–0.06 per step, luck max 0.126 over five Cycles.
- Stage machine already live: `civicStageStep_`, upkeep tend factor (grace 6 / decay 0.15 / floor 0.3), Delivering comparator `stageBaselineFrom` / `deliveryEdge`, losing clock, sponsor credit/drain — none of it changes here.
- Doctrine test: does this make a row drive a fate the builder didn't choose? the head of `HH-0102-F027` (West Oakland, rent $3,625, income $81,430, burden 0.534, savings $12,776 — crisis, rolling 10% dissolution every Cycle today) is the row. Beverly Hayes (POP-00772), the Fund's canon face, has no household row and the ledger lists a different occupation from the agent's identity file — reconcile in the civic lane before she is written as a grantee (agy F4).

**Acceptance criteria:**
1. On a bench pair from live-synced C108 (treatment: INIT-001 retagged housing with `BudgetTotal` 28,000,000; control: untouched), the treatment arm writes grants onto named West Oakland households each tended Cycle, `BudgetRemaining` falls by exactly the tranche (tend-scaled) each tended Cycle and tracked grants sum to at most that, and every granted head of household carries a LifeHistory line naming the initiative and the Cycle.
2. A granted household's stress severity is lower than its control-arm twin's from the grant on (savings do not spend down on live — see §Data reality — so the aftermath comes from the cooldown, the budget end and newly flagged rows, not from re-flagging the same household). No grant is ever paid to an owned, dissolved or unflagged row, and no household is granted twice inside the cooldown by any initiative (the cooldown is per household, not per initiative — two Standing housing rows over one hood would otherwise both pay the same worst-off row in one Cycle).
3. Of the households flagged in the target hoods at the vote baseline (cohort by HouseholdId), the treatment arm relieves or keeps more of them than the control arm by the measured margin within the hold window, and the row reaches Delivering; the control arm — where crisis rows dissolve at 10% a Cycle and leave the tab — does not. A hood where flagged households lose their homes does not count as improved (§3, §8).
4. An untended row (tend factor below 1) drains a proportionally smaller tranche and can pay fewer grants; at the floor it still pays, so a neglected fund drips rather than stops (agy F3: with the tranche as the drain, tend throttles the money even when the tracked pool is smaller than the tranche) — and `BudgetRemaining` reaching 0 ends the service (phase `complete`, no further grants, the row's Delivering can regress) with no code path that refills it.
5. `Number(Budget)` is read nowhere — `checkMayoralVeto_` (`civicInitiativeEngine.js:2388`, the `> 50,000,000` scrutiny term at `:2432`, dead since it was written because `Number('$28M')` is 0) reads `BudgetTotal` instead (builder call 9). A row whose `Budget` string cannot be parsed to money is `blocked: no-budget` on the board, pays nothing and runs no clock, exactly like an unplayable domain.
6. After Task 8 no engine.251 relief column, dial or writer remains on main or on live; `civicHousingRelief.test.js` is retired; G-EC70 (owned households anchored) stays.

---

## The shape, in one Cycle

```
Phase 2  applyInitiativeImplementationEffects_
         ├─ reads tracker: Stage, phase, BudgetRemaining, tend (already computed)
         └─ S.initiativeDisbursement[initId] = { domain, hoods[], tranche, remaining, tend }
                tranche = min(remaining, civicDisburseTranche_<domain> × tend)
Phase 5  runCivicInitiativeEngine_ (Phase5-Initiatives, godWorldEngine2.js:358 — runs 31 slots BEFORE the household engine)
         └─ stage step as today; reads BudgetRemaining for the board; writes nothing about spend
Phase 5  processHouseholdFormation_  (Phase5-HouseholdFormation, :389; after updateHouseholdIncomes_, before detectHouseholdStress_)
         ├─ applyHousingDisbursement_: for each housing slice
         │    eligible = ACTIVE + RENTED households (explicit filter — the stress detector has none, owned
         │               buyers are flagged on mortgage burden by design) in the slice's folded hoods
         │               (fold through resolveHoodOrChild_ only when canonHoods is seeded, else refuse),
         │               flagged warning/crisis by the engine's own formula, LastGrantCycle older than
         │               civicGrantCooldownCycles (per HOUSEHOLD, any initiative)
         │    order    = rentBurden desc, tie-break HouseholdId
         │    grant    = min(max(0, 12 × MonthlyRent − HouseholdSavings), GrantCapMonths × MonthlyRent, tranche left)
         │               — fill to the engine's own buffer so the row UNFLAGS; nothing else about stress changes
         │    writes   = (durable) head of household NetWorth += grant via ctx.ledger — Phase 10 commits;
         │                         HouseholdSavings is DERIVED from member NetWorth every Cycle
         │                         (updateHouseholdIncomes_ :1013/:1043/:1047), so a direct savings write is wiped next fire
         │               (same-Cycle) HouseholdSavings += grant on the row object + column vector so THIS
         │                         Cycle's stress read, dissolution roll and migration `buffered` see it
         │               LastGrantCycle; LastGrantInitiativeID; LastGrantAmount  (receipt columns, own-tab)
         │               ctx.ledger LifeHistory line on the head (tag Relief)
         │               Initiative_Tracker.BudgetRemaining -= TRANCHE (not just grants: the money leaves the fund;
         │                         tracked grants ≤ tranche, the remainder is off-camera disbursement), SAME function, one write per slice
         │                         (the household engine already owns a cross-tab tracker cell? — no: this is
         │                         a NEW direct write class, filed in SHEETS_MANIFEST §9 as engine.255;
         │                         idempotent: paid is recomputed from receipt rows stamped this Cycle, so a
         │                         re-run after a crash between the two writes debits once)
         │               remaining <= 0 → ImplementationPhase 'complete', MilestoneNotes 'budget exhausted C<n>'
         └─ detectHouseholdStress_ UNCHANGED (12-month buffer; the migration engine's `buffered` reads the same 12)
Phase 2 (next fire)  stage-3 observation: flagged-at-vote cohort — relieved / kept / lost per hood vs the city's flagged rows
```

The §15 chain: **start** (vote → Funded → work → Standing, first grants) → **peak** (hood share drops, Delivering) → **end** (budget out, phase complete; or untended, tranche fades) → **aftermath** (the cooldown expires and new rows flag while the budget is gone, the cohort's losses mount, the row regresses, the seat's clock runs — savings do not spend down on live, see §Data reality) → **referenced** (LifeHistory lines, `BudgetRemaining` 0, MilestoneNotes, the board). Both directions.

## What is a flag (housing)

The engine already raises it — `detectHouseholdStress_`: `MonthlyRent × 12 / HouseholdIncome ≥ 0.40` warning, `≥ 0.50` crisis, skipped when `HouseholdSavings ≥ MonthlyRent × SAVINGS_BUFFER_MONTHS`. Crisis rows roll a 10% dissolution each Cycle. This plan adds no new flag. It makes savings matter in proportion instead of all-or-nothing (Task 3), so a grant that does not fill the whole 12-month buffer still lowers severity.

The tracked ledger is the sample, never the denominator (SIM_DOCTRINE, ~0.25%). Grants land on tracked households because those are the rows the world has; the count of grants is the count of tracked rows helped, and the pack says so.

## Data reality on live C108 — read before the builder calls

Measured from the C108 dumps (`output/beats/Household_Ledger.jsonl`, `output/simulation_ledger_snapshot.jsonl`), 392 active rented households:

| | citywide | West Oakland |
|---|---|---|
| rent burden ≥ 0.30 | 106 | — |
| ≥ 0.40 (warning) | 37 | 7 of 31 |
| ≥ 0.50 (crisis) | 13 | 1 |
| **flagged after the savings buffer** (≥ 0.40 and savings < 12 months of rent) | **7** | **2** |
| savings in months of rent, p10 / p50 / p90 | 20 / 165 / 852 | — |
| renters at or over the 12-month buffer | 363 of 392 | — |

`HouseholdSavings` is the sum of the members' `NetWorth` (`householdFormationEngine.js` `updateHouseholdIncomes_`, the `totalSavings` vector); citizen NetWorth p50 is $369k on income p50 $98k. Nothing debits it except a casino loss. Beverly Hayes (POP-00772, the Fund's canon face, "approved, waiting") has Income $58k, NetWorth $939,915 and no Household_Ledger row.

Also seen: every active West Oakland lease is $3,621 or $3,625 — `MonthlyRent` is a hood-median stamp at formation (`estimateRent_`), so within a hood the burden differs only by income. A §16 column that never moves per row; filed to the gap log as its own item, not this plan's.

What this means for the mechanism:
- The flag the engine already raises is real but nearly silent — 7 rows citywide — because a household's whole net worth counts as a rent buffer. That is not a hardship import; it is a prosperity world. It is also a gate whose input rarely crosses it (§15), so a lever aimed at it has almost nothing to move and no bench pair can measure a hood share on 2 rows.
- Savings never spend down, so a grant onto savings is permanent, and the aftermath half of the chain (§15) does not exist through savings. Criterion 2 as first written is withdrawn.
- The tracked ledger is the sample (~0.25%). The Fund's 295 applicants are almost all untracked; Webb's disbursements to them are color (§13), the money leaving the budget is the fact.

**Builder call 8 (the one that decides the shape):** which number is the sim's to move?
- (a) **The buffer.** `dialSavingsBufferMonths` measured against *liquid* savings, not net worth — a new citizen field the wealth engine would have to carry, or a share of NetWorth ruled liquid (e.g. 10% → p50 buffer 16 months, still high). Re-dial until the flag fires for a world-sized share, then the Fund has rows to pay. Rate and severity are the dials, not the gate.
- (b) **Money out is the fact; rows are the few.** The tranche leaves `BudgetRemaining` every tended Cycle whether or not tracked rows qualify; tracked flagged rows are paid first and get their LifeHistory line; the untracked remainder is Webb's color. Delivering is judged on the flagged-at-vote cohort (Task 6 as rewritten), not a hood share. Honest, small-n, and the Fund's canon arc (money stuck) resolves through the game either way.
- (c) Both — (b) now, (a) as its own engine row on the wealth layer.

Recommendation: **(c)** — and (b) is now the plan's mechanism (tranche drains the fund, tracked grants inside it, fill-to-buffer grants); (a) is the engine number that is actually off and gets its own row with the wealth engine as owner.

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
2. **Grant cap.** `civicHousingGrantCapMonths` — most months of a household's own rent one grant may pay; the grant fills to the 12-month buffer within it. Recommendation: 12 (the two flagged West Oakland rows today need $30.7k and $43.5k to clear). **Depends on call 8:** the fill target is whatever buffer the engine uses — if call 8(a) makes the buffer a liquid share of net worth, the grant fills to that share instead of 12 months, and this cap is re-read against it.
3. **Tranche per Cycle.** `civicDisburseTranche_housing` in dollars per tended Cycle — this is the fund's burn rate, on and off camera. West Oakland has 31 active tracked renters (every lease $3,621–3,625) and 2 flagged; tracked demand is ~$74k once, then cooldown (agy F2). So the tranche sets how long $28M lasts, not how many rows get paid: $400k → 70 Cycles tended, ~230 at the tend floor. Recommendation: 400,000 — the Fund should be able to end inside a season or two of neglect-free play.
4. **Cooldown.** `civicGrantCooldownCycles` — Cycles before the same initiative can grant the same household again. Recommendation: 26 (half a year).
5. **Budget exhausted = service ends.** Phase → `complete`; the seat re-proposes a new row for more money. No refill path. Recommendation: yes.
6. **Seat proposals carry a budget.** The `propose` move gets a `budget` field the seat must fill from a closed band per domain (pack lists the band); missing → the row stands as `blocked: no-budget`. Recommendation: yes, bands per domain seeded in World_Config (`civicBudgetBand_housing` etc.), builder sets the numbers.
9. **The mayoral veto reads the real budget.** Today `> $50M` adds veto probability and has never fired (`Number('$28M')` = 0). Rewired to `BudgetTotal`, INIT-006's $2.1B and INIT-003's $230M would draw scrutiny at their next vote. Recommendation: rewire; it was always meant to.
10. **Cohort floor.** `civicHousingCohortMinFlagged` — least flagged rows a target hood needs at the vote for its Delivering gate to run. West Oakland has 2 today, the city 7. Recommendation: 5 — which means, on live C108, no hood can stage a housing row to Delivering until call 8 moves the flag; the fund still pays and drains, the board says why it cannot score, and that is the honest state.
7. **Fold vs remove the engine.251 discount code.** Recommendation: remove (Task 8); nothing of the flat discount survives into the disbursement shape except the C108 measurements.

## Tasks

### Task 1: Budget parse + the two tracker columns
- **Files:** `phase05-citizens/civicInitiativeEngine.js` (modify: `INITIATIVE_STAGE_COLUMNS_` gains `BudgetTotal`, `BudgetRemaining`; `parseBudgetMoney_` pure; `ensureInitiativeStageColumns_` arms and back-fills `BudgetTotal`/`BudgetRemaining` from `Budget`; re-parses whenever `BudgetTotal` is blank and `Budget` is non-blank, so an amended no-budget row recovers — never clobbers a row that already carries a parsed number); `lib/initiativePhaseContract.js` (mirror `parseBudgetMoney`, parity test); `scripts/regenSchemaHeaders.js` run after the live arm.
- **Steps:** parse `$`, `M`, `B`, `K`, commas; blank/NaN → blank; test the six live strings; arm on the cycle path like the stage columns.
- **Verify:** `node lib/initiativePhaseContract.test.js` parity ≥ 6 fixtures; bench fire arms two columns, INIT-001 28000000 / 28000000, INIT-006 2100000000, INIT-007 12500000.

### Task 2: Disbursement slice (Phase 2)
- **Files:** `phase02-world-state/applyInitiativeImplementationEffects.js` (modify: `S.initiativeDisbursement` built beside the transit/housing slices — one entry per Standing/Delivering row with `BudgetRemaining > 0` whose catalog entry carries `disburses: true` (a new catalog flag — health and transit are playable with budgets and no writer, so `playable` cannot key this); tranche = `min(remaining, civicDisburseTranche_<domain> × tend)`); `phase01-config/engine94SheetContract.js` (seeds: `civicDisburseTranche_housing`, `civicHousingGrantMonths`, `civicGrantCooldownCycles`, `dialSavingsBufferMonths` 12).
- **Verify:** unit test: no budget → no slice; untended → tranche × floor; remaining < tranche → remaining.

### Task 3: WITHDRAWN (agy F5, kimi F3) — the buffer stays 12 months, hardcoded in both engines
A half-buffer band would have made 7 ungranted households (6–11 months of savings today) immune to the dissolution roll — a physics change for rows the lever never touched. Instead the grant fills to the buffer the engine already has (Task 4), so a granted row unflags by the existing rule and the migration engine's `buffered` (`migrationTrackingEngine.js:256`, same 12) agrees. `dialSavingsBufferMonths` is not seeded.

### Task 4: The housing grant writer (Phase 5)
- **Files:** `phase05-citizens/householdFormationEngine.js` (modify: `applyHousingDisbursement_` called from `processHouseholdFormation_` after the income pass and before stress, replacing the `applyHousingRelief_` call site; arms `LastGrantCycle`, `LastGrantInitiativeID` on Household_Ledger the first time a grant is paid — not before); `docs/engine/SHEETS_MANIFEST.md` §9 row.
- **Steps:** eligible/order/grant as in §The shape (explicit `Status active` + `HousingType rented` filter; cooldown per household). Grant = `min(max(0, 12 × MonthlyRent − HouseholdSavings), civicHousingGrantCapMonths × MonthlyRent, tranche left)` — a row at the cap that still sits under the buffer stays flagged and is eligible again after the cooldown (the honest partial). Durable money: head of household `NetWorth += grant` through `ctx.ledger` (Phase 10 commits; `HouseholdSavings` derives from it next Cycle). Same-Cycle visibility: `HouseholdSavings += grant` on the row object and the column vector (the `casinoLedgerEngine` class) so this fire's stress read and dissolution roll see it. Receipts `LastGrantCycle` / `LastGrantInitiativeID` / `LastGrantAmount` in the same vector batch. LifeHistory line on the head via `ctx.ledger` (`"received a $<amount> stabilization grant from <Name> (<InitiativeID>)"`, tag `Relief`). Then, in the same function, `Initiative_Tracker.BudgetRemaining -= tranche` per slice (the whole tranche leaves the fund — tracked grants are the on-camera part, the pack reports both `$paid to N tracked households` and `$tranche disbursed`; idempotent against a `LastDisburseCycle` tracker column) and `remaining <= 0` → phase `complete` + MilestoneNotes. Loud-not-fatal like the relief writer was.
- **Verify:** `scripts/civicDisbursement.test.js` (new): eligibility matrix (owned, dissolved, unflagged, off-hood, cooldown), order, tranche exhaustion mid-list, receipt columns, ledger line, idempotent rerun pays nothing twice in one Cycle.

### Task 5: (folded into Task 4 — kimi F1)
The stage step runs 31 slots before the household engine (`godWorldEngine2.js:358` vs `:389`), so a decrement there would always read `paid` = 0 and `BudgetRemaining` would never move (§16 scenery). Spend and end live in the grant writer. `civicInitiativeEngine.js` only reads `BudgetRemaining` for the board and refuses to stage a row with blank `BudgetTotal` (`blocked: no-budget`).
- **Carried limit (F1 class):** the household-tab grant vectors and the tracker decrement are two writes; a crash between them pays once and does not debit. The next fire recomputes `paid` from receipts stamped that Cycle and debits once — never twice.

### Task 6: Stage-3 measurable = flagged-at-vote cohort, relieved-or-kept
- **Files:** `phase05-citizens/civicInitiativeEngine.js` `freezeCivicStageCohort_` Household_Ledger branch (modify); `lib/initiativePhaseContract.js` `housingBurdenCohort` → `housingFlaggedCohort` (mirror, parity); `CIVIC_STAGE_CATALOG_.housing` + catalog `stage3Metric` → `{ tab: 'Household_Ledger', column: 'flaggedRelievedShare', direction: 'up', scope: 'hood' }`.
- **Why not a hood share:** a hood share counts warning-or-crisis, a grant leaves a household at warning (Task 3), and the control arm's crisis rows dissolve out of both numerator and denominator — the share would open for the control and not the treatment (§15 in mirror image; the superseded plan already named the dissolution confound). With 7 flagged rows citywide a hood-vs-city median is noise anyway.
- **Steps:** at the vote baseline, freeze the set of flagged active rented HouseholdIds per target hood (the engine's own stress formula). Each observation: `relieved` = cohort rows now active and unflagged; `kept` = cohort rows still active (flagged or not); `lost` = cohort rows dissolved or moved out; metric per hood = `(relieved + kept − lost) / cohortSize` (a dissolved household is a loss, not an improvement); city reference = the same over the flagged rows in every member hood. The comparator consumes it unchanged as `direction: 'up'`. A target hood with fewer flagged rows at the vote than `civicHousingCohortMinFlagged` (builder call 10) is `blocked: thin-cohort` — reported, no clock, the pattern at `civicInitiativeEngine.js:3551`; zero rows is the same block. Without a floor a two-row cohort moves 50% per event and any margin is noise.
- **F3 (kimi), recorded:** a 6-month grant never lifts a household past the 12-month skip and never changes its burden, so `relieved` stays near zero at the recommended dials; the signal is `kept` vs `lost` (treatment keeps crisis rows from the 10% dissolution roll, control does not). Builder call 8 decides whether the buffer moves; if it does not, the margin is measured on kept-vs-lost and the pack says so.
- **Verify:** parity over 7 fixtures including a dissolved cohort row and a moved-out row; the comparator consumes it unchanged. Plus a three-way parity test (agy F6): `detectHouseholdStress_` (engine), `civicHousingFlaggedCohort_` (engine) and `housingFlaggedCohort` (lib) flag identical fixture households identically.

### Task 7: Bench pair, margin, playable
- **Steps:** re-sync 0908 from live; treatment arm: INIT-001 retagged housing + `BudgetTotal` seeded; control arm: untouched; four fires each from C109. Nothing files `work` moves on the bench, so INIT-001's tend factor decays past grace 6 — four fires fit inside grace; a longer run hand-stamps `LastWorkCycle` before each fire and says so in the log. Measure the flagged-at-vote cohort per Cycle on both arms (relieved / kept / lost); record which bound the spend each Cycle — the tranche or the eligible pool (kimi F7: with tens of tracked renters per hood the pool binds, so $400k/Cycle and "~70 Cycles" are upper bounds, not forecasts); note grants paid in a folded hood under `civicHousingCohortMinRenters` (money the board cannot score); the untreated wobble from the ten other member hoods is the noise floor; seed `civicDeliverMargin_housing` at ~60% of the treated effect above the worst luck, as health and the superseded lever were. Flip `housing` `playable:true` both sides only after the treated arm reaches Delivering and the control does not. Re-pin the five test files.
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

- 2026-09-22 17:30 (engine-sheet) — call 2 tied to call 8 (fill target follows the buffer); Task 6 gets a cohort floor, builder call 10 (`civicHousingCohortMinFlagged`, recommend 5).
- 2026-09-22 17:15 (engine-sheet) — **agy review folded** (`output/antigravity/2026-09-22-review-engine255-disbursement.md`): F2/F3 the tranche is the drain (`BudgetRemaining -= tranche`, tracked grants inside it) so $28M can end and tend throttles; F5 Task 3 withdrawn — grants fill to the engine's own 12-month buffer (cap dial), no physics change for ungranted rows, migration `buffered` agrees; F4 doctrine row → head of `HH-0102-F027`, Beverly Hayes canon mismatch flagged to the civic lane; F6 three-way stress parity test; F1 was against the 16:20 share metric (superseded 16:45). Uniform West Oakland leases noted for the gap log.
- 2026-09-22 17:00 (engine-sheet) — **kimi review folded** (`output/kimi/2026-09-22-review-engine255-disbursement.md`, verified F1/F2/F5 against the files): F1 the stage step runs before the household engine, so spend + end move into the grant writer (Task 5 folded into Task 4); F2 `HouseholdSavings` is derived from member NetWorth every Cycle, so the durable grant is the head's NetWorth via `ctx.ledger` with a same-Cycle savings write for this fire's stress read; F3 recorded under Task 6 (kept-vs-lost is the signal at 6-month grants); F4 cooldown per household; F5 veto term → `BudgetTotal` (builder call 9); F6 re-parse blank `BudgetTotal`; F7 bench records the binding constraint; F8 explicit rented+active filter and seeded-only hood fold. kimi reviewed the 16:20 draft; the 16:45 measurable rewrite already addressed the share-vs-control inversion.
- 2026-09-22 16:45 (engine-sheet, advisor pass + live data) — §Data reality added (7 flagged renters citywide, savings = net worth, nothing debits it, Beverly Hayes NetWorth $939,915 with no household row) and builder call 8 opened with recommendation (c). Task 6 measurable rewritten to the flagged-at-vote cohort (the hood share would have opened for the control arm); criteria 2–3 rewritten; Task 2 keys on a `disburses` catalog flag; Task 5 carries the F1-class limit; Task 7 names the bench tend trap.
- 2026-09-22 16:20 (engine-sheet) — Drafted from the builder's direction (15:10–15:27) after engine.255 step 1 (lever off) went live at PROD @120. Sent to kimi and agy for adversarial review before the first cut.
