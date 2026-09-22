# Adversarial review — engine.255 Initiative Budget Disbursement

Reviewer: kimi (engine-sheet request, 2026-09-22). Read-only.
Target: `docs/plans/2026-09-22-initiative-budget-disbursement.md` (the plan), against
`docs/SIM_DOCTRINE.md` §3/§7/§14/§15/§16/§The test and
`docs/plans/2026-09-19-civic-wake-game-loop.md` §Builder direction 2026-09-22.
Every finding verified against the named file and line. Line numbers are main HEAD at review time.

**Verdict (one line):** Right shape, wrong wiring — do not cut Tasks 4–7 until the phase-order inversion (F1), the derived-savings wipe (F2) and the measurable that cannot see its own lever at the recommended dials (F3) are redesigned; F4–F6 are contract drifts that fail acceptance as written.

---

## F1 — CRITICAL: the stage step runs BEFORE the grant writer, so `BudgetRemaining` never falls

The plan's Cycle diagram claims `Phase 5 civicInitiativeEngine (stage step, later in the phase)`
does `BudgetRemaining -= paid` (plan line 64–66; Task 5, plan line 123).

The real Phase 5 order is the reverse:

- `phase01-config/godWorldEngine2.js:358` — `Phase5-Initiatives` → `runCivicInitiativeEngine_(ctx)`
- `phase01-config/godWorldEngine2.js:389` — `Phase5-HouseholdFormation` → `processHouseholdFormation_(ctx)`
- (second call site identical: `:2110` before `:2141`)

The initiative engine runs 31 slots **before** the household engine. When Task 5's subtraction
executes, `S.initiativeDisbursement[id].paid` is still absent/zero — `applyHousingDisbursement_`
has not run. The slice is rebuilt fresh at the next Phase 2 (plan line 51–53), so the decrement
never lands in any Cycle: `BudgetRemaining` never depletes, `remaining <= 0 → complete` never
fires, and acceptance criteria 1, 4 and 5 fail by construction. Under §15 the chain's **end**
link is dead; under §16 `BudgetRemaining` is a column no phase ever rewrites — scenery.

Secondary consequence: the retry story the plan inherits (PIN: "an HTTP 500 on a fire is not
proof the run did not start") becomes a real desync once F1 is fixed — grants are an own-tab
direct write at Phase5-HouseholdFormation while the tracker decrement is a different tab at a
different moment; a crash between them leaves `paid` spent but `BudgetRemaining` intact. The
fix should put spend recording and budget decrement in one writer, or make the decrement
idempotent against `LastGrantCycle`-keyed receipts.

## F2 — CRITICAL: `HouseholdSavings` is a derived column; the grant is overwritten next Cycle

Task 4 writes the grant as `HouseholdSavings += grant` (plan line 60, 119). But
`updateHouseholdIncomes_` recomputes `HouseholdSavings` from scratch every Cycle as the sum of
member `NetWorth` and rewrites the whole column vector:

- `phase05-citizens/householdFormationEngine.js:1013` — `totalSavings += money.netWorth`
- `:1042–1043` — `household.householdSavings = totalSavings`
- `:1046–1047` — full-column `setValues` for income and savings
- called at `:214`, before the relief/disbursement call site (`:219`) the plan replaces

So a grant paid at Phase 5 of fire N is visible exactly twice — fire N's own stress read
(`:223`) and fire N+1's Phase-2 cohort observation (`freezeCivicStageCohort_` reads Phase-5-of-N−1
sheet state, `phase05-citizens/civicInitiativeEngine.js:3604–3605`) — and is then wiped by fire
N+1's income pass before that Cycle's stress read. Acceptance criterion 2 ("severity lower for
as long as its savings hold; when savings are spent down by the money loop, it re-enters the
flagged pool", plan line 39) describes a persistence mechanism that does not exist: nothing
spends savings down; the income pass simply recomputes them. The §15 **aftermath** link
("savings spend down through the money loop, households re-flag", plan line 70) is built on the
same false premise.

Fix direction (for engine-sheet, not this review): the durable write is the head of household's
`NetWorth` in `ctx.ledger` (committed Phase 10, same class as the planned LifeHistory line);
`HouseholdSavings` then derives upward on the next income pass and the aftermath chain becomes
real.

## F3 — HIGH: at the recommended dials the measurable cannot see the lever (§15)

The flag: `rentBurden = MonthlyRent × 12 / HouseholdIncome`, warning ≥ 0.40 / crisis ≥ 0.50
(`householdFormationEngine.js:99–100`, `:1262–1276`), skipped entirely when
`savings ≥ MonthlyRent × 12` (`:106`, `:1269`).

- Task 6's measurable is the share of rented households **flagged warning-or-crisis** (plan line 127).
- Builder call 2 fixes the grant at **6 months** of rent — explicitly "lowers a crisis to
  warning under Task 3, **does not erase the flag**" (plan line 94).
- Task 3's half-buffer band caps crisis at warning (`householdFormationEngine.js:114` of the
  plan) — but warning is still inside the measurable's counted set.

So a first grant never removes a household from the measurable's numerator: burden is unchanged
(grants touch neither income nor rent) and 6 months of savings never reaches the 12-month skip.
The only paths that move the share are (a) stacked second grants after the 26-Cycle cooldown
(builder call 4, plan line 96) — whose savings must first survive F2's wipe for 26 Cycles — or
(b) households that already held ≥ 6 months of savings before the grant. Both are second-order.

Consequence: Task 7's bench (four fires, C109–C112, plan line 131) is structurally incapable of
showing criterion 3 ("share drops past the measured margin within the hold window", plan line 40)
— Delivering requires a 3-Cycle hold (`civicDeliverHoldCycles`, plan line 34) and the numerator
cannot move within the bench window. Either the bench fails and the lever is misread as dead, or
the margin gets trimmed to noise to make it pass — the §15 tax-that-always-fires outcome. This
must be resolved before Task 7, not discovered by it: re-rule the grant months against the
12-month skip, change the measurable to a severity-weighted share, or accept a ≥26-Cycle bench.

## F4 — MEDIUM: cooldown is per-initiative; criterion 2 says per-household

Mechanism: "not granted **by this initiative** within `civicGrantCooldownCycles`" (plan line 57),
keyed on `LastGrantInitiativeID` (plan line 60). Acceptance criterion 2: "no household is granted
twice inside the cooldown" (plan line 39) — unqualified. With two Standing housing rows folded
over the same hood, both tranches walk the same rentBurden-desc ordering (plan line 58) in one
Phase 5 and both grant the same worst-off household in the same Cycle. Nothing in the eligibility
set changes between the two slices — a 6-month grant does not unflag (F3). Either qualify the
criterion or make the cooldown per-household across initiatives. Related, by design but worth a
builder note: the tranche dial is per-row, so N seat-minted housing funds multiply domain-wide
outflow N×; each fund's own budget bounds it, but there is no domain cap.

## F5 — MEDIUM: criterion 5 has no owning task — `checkMayoralVeto_` still reads `Number(Budget)`

Criterion 5: "`Number(Budget)` is read nowhere" (plan line 42). No task touches
`checkMayoralVeto_`, which reads it today:

- `phase05-citizens/civicInitiativeEngine.js:2388` — `var budget = Number(row[idx('Budget')]) || 0;`
- consumed at `:2432–2434` — `budget > 50000000` adds +0.10 veto probability

Today this is already a §15 dead gate (`Number('$28M')` → NaN → 0, so the >$50M scrutiny term has
never fired — the builder-direction note at game-loop line 466 says the same). After Task 1 arms
`BudgetTotal`, the plan must choose: rewire the veto to `BudgetTotal` (INIT-006's $2.1B would then
draw mayoral scrutiny — a sim call, not a refactor) or delete the term. As drafted, criterion 5
fails its own bench grep.

## F6 — LOW: "never re-parse" strands amended no-budget rows

Task 1 arms `BudgetTotal` once and "never re-parses a row that already carries `BudgetTotal`"
(plan line 104). A row whose `Budget` was blank/unparseable at arm time carries blank
`BudgetTotal` forever; builder call 6's remedy — "an amended proposal supplies it" (plan line 89)
— cannot land, because the amendment changes `Budget` and the parser never re-runs. The
`blocked: no-budget` state becomes unrecoverable by the exact path the plan offers for recovering
it. Re-parse when `BudgetTotal` is blank and `Budget` is non-blank and changed; keep the
no-clobber rule only for rows already carrying a parsed number.

## F7 — LOW: tranche sized against real dollars, not the 1:443 sample

Builder call 3: $400,000/Cycle ≈ 25–40 six-month grants on $1,500–3,600 leases (plan line 95).
The tracked ledger is the whole eligible pool ("the tracked ledger is the sample", plan line 76;
§4's 1:443). A hood's tracked renters number in the tens and its flagged subset is smaller, so
the eligible pool — not the tranche — will bind most Cycles; actual spend lands well under
$400k and $28M lasts far beyond the "~70 Cycles" estimate. Not a defect, but the bench should
measure the binding constraint before the dial is ruled. Adjacent: grants paid in a folded hood
below `civicHousingCohortMinRenters` spend budget with no measurable effect — membership is a
measurable gate (`civicInitiativeEngine.js:3551`), not an eligibility gate. Worth one line in
the pack so a seat can see money going somewhere the board cannot score.

## F8 — LOW: keep the rented/active filter explicit — the stress detector itself has none

`detectHouseholdStress_` (`householdFormationEngine.js:1247–1281`) filters only
`householdIncome === 0`. Owned buyers are flagged on mortgage burden by design — engine.159:
"`MonthlyRent` is the monthly number for BOTH tenures" (`:1255–1261`). The owned/dissolved
protection therefore comes entirely from the eligibility filter the plan states in prose
("active rented households", plan line 57) and from the cohort pattern
(`civicInitiativeEngine.js:3537–3538`), not from the stress formula the plan says to reuse
("flagged by the engine's own stress formula", plan line 57). Task 4/Task 6 should name the
tenure + status filter in the mechanism text, or a future implementer wiring straight to the
detector's output list pays grants to owned rows (G-EC70 breach) and lets unmolvable owned
crisis rows dilute the measurable. Hood matching should likewise inherit `housingReliefForHood_`'s
fold (`householdFormationEngine.js:1147–1153`) with eyes open: when `ctx.summary.canonHoods.set`
is unseeded it silently falls back to the raw string and child-hood rows mismatch off-hood.

## Attack surfaces checked with no finding

- **Farming tend/tranche:** `tendFactor` is capped at 1 (`lib/initiativePhaseContract.js:479–481`)
  and slices require Stage Standing/Delivering (Task 2) — work-spam cannot multiply a tranche,
  unvoted rows pay nothing. Deterministic rentBurden-desc ordering gives seats no targeting
  hand. Sponsor credit/drain unchanged (plan line 34). Residual surface is F4's per-initiative
  cooldown.
- **Twice in one Cycle / rerun:** `LastGrantCycle` is written in the same column-vector batch as
  the savings write (Task 4, plan line 119) and the cooldown blocks a same-Cycle rerun — sound,
  provided F1's decrement is rebuilt on the same receipts.
- **After budget 0:** Phase 2 gates the slice on `BudgetRemaining > 0` and
  `tranche = min(remaining, …)` (plan line 53, 110); the final partial grant is dust but cannot
  overspend. Sound once F1 is fixed.
- **Phase-2 slice → Phase-2 next-fire observation:** `freezeCivicStageCohort_` reads
  Phase-5-of-N−1 sheet state (`civicInitiativeEngine.js:3604–3605`), so grants land in the
  observation with correct causality. Sound (modulo F2's wipe timing).
- **Owned rows at the dissolution roll:** crisis rows roll 10% dissolution after the grant call
  site (`householdFormationEngine.js:1299`), so a same-Cycle grant protects — intended, keep.
- **§14:** grants move savings, never income; the hood-follows-income rule is untouched.
- **§3 / prosperity-era framing:** clean. INIT-001's anti-displacement framing is existing canon
  (295 applicants, $0 disbursed, Webb's arc — plan line 89), not imported real-Oakland texture;
  "the world may have a housing crisis" is the builder's own direction (game-loop line 465); the
  measurable is a band relative to the city's own middle, the §15-preferred shape. No finding.
