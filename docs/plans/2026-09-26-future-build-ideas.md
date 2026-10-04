---
title: Future Build Ideas — Economy Depth, Judicial System, AI Autonomy, God-Whisper Seam
created: 2026-09-26
updated: 2026-10-04
type: plan
tags: [engine, civic, research, draft]
sources:
  - Builder-direct 2026-09-26 — pasted architecture proposal, reviewed live against actual repo state (see verdicts below)
  - docs/plans/2026-09-21-care-and-justice-system.md — engine.254, already covers the judicial-system half of this doc
  - docs/plans/2026-08-01-business-lifecycle-generator.md — engine.96, already covers business dynamics (dial-driven, not agentic)
  - docs/plans/BACKLOG.md:447 — Phase 37 Arc State Machines, archived backlog, NOT built
pointers:
  - "[[engine/ROLLOUT_PLAN]] — parent rollout; each verdict below has its own row"
  - "[[plans/2026-09-21-care-and-justice-system]] — engine.254, judicial ledger + mental health rulings land there, not here"
  - "[[plans/2026-08-01-business-lifecycle-generator]] — engine.96, existing dial-driven business economy"
  - "[[index]] — add entry in same commit"
---

# Future Build Ideas — 2026-09-26 direction

**Goal:** Capture the builder's 2026-09-26 architecture proposal durably and record a verdict per idea, so nothing is lost and nothing gets built twice. Half of this doc turned out to already be open, ruled work (engine.254) described back at itself; the rest is genuinely new and is filed here at the right gate.

**Terminal:** research-build (filing + design); engine-sheet (execution on `ready` items).

**Note on the source doc's own claims:** two specific claims in the pasted proposal are unverified and must not be treated as fact until checked: "the desk writer already has a bounded tool loop (max 6 calls)" and "an orphaned disposition cache" exists. `scripts/cron-desk-writer.js` exists but the tool-loop claim wasn't confirmed line-by-line; the disposition cache wasn't located. Verify before citing either as true.

---

## Verdicts

### 1. Judicial system → NOT new, already open at engine.254

The proposal's case-state-machine / judges-as-personas / jury-duty ideas overlap almost entirely with `docs/plans/2026-09-21-care-and-justice-system.md` (engine.254), which the builder already ruled 2026-09-21 to build: a condition-driven service layer resolving chaos-car arrests/OARI outcomes into a judicial ledger + mental-health care states. That plan is gated on two open rulings (judicial ledger shape, mental-health care states) — being drafted now, 2026-09-26, with the `engine-wiring` card on `Hospital_Ledger` pulled first per measure-twice.

**What's genuinely new here and folds into engine.254 as a `§Later` section, not a separate row:**
- Judges as authored personas (civic-office pattern — canon philosophy files, not dials) — reasonable once the case state machine exists; no case flow to judge yet.
- Jury duty as a Tier-4→named promotion vehicle (universal-protagonism doctrine: pulling generic citizens into a real case is exactly the kind of thing that earns a name) — good idea, sequenced after the ledger exists.
- Precedent ledger as folk-memory/institutional-memory answer — a real angle on the "folk memory gap," but it's a consequence of the case ledger existing, not a separate build.

**Phase 37 (Arc State Machines)** — the proposal's "your planned arc state machines are the natural chassis for this" is accurate: it's a real, still-unbuilt backlog item (`docs/plans/BACKLOG.md:447`, S139, NOT STARTED, archived out of active ROLLOUT). Referenced here for when a case's multi-cycle arc needs tracking; not proposed as a prerequisite.

**Verdict: fold into engine.254, no new ROLLOUT row.**

### 2. Firm agents (persistent LLM business agents) → needs-info, builder call

`engine.96` (business lifecycle generator) is **deliberately dial/formula-driven**, not agentic: `applyBusinessDynamics.js` reads `World_Config` tunables and drifts `Growth_Rate`/`Annual_Revenue` from live city state, bench-reproducible on a fixed seed (everything-is-earned doctrine, Mike 2026-08-01 — no static numbers, but also no LLM judgment call standing in for a live-state formula). It has two open tasks (8: success-pressure coupling, 9: tests/bench) still in-progress.

Promoting businesses to full LLM strategy agents (hiring/pricing/expansion negotiating each cycle) is not an extension of engine.96 — it's a different architecture: real per-cycle LLM cost (one call per business, every cycle, indefinitely) and a determinism reversal in a system currently built to be bench-provable. Legitimate idea, but it trades away a property (determinism, cheapness) the current design was built to have. Needs a builder ruling on whether that trade is worth it before any design work starts.

**Verdict: `needs-info`, filed as engine.261, owner engine-sheet (sim judgement — builder included).**

### 3. Conservation laws (double-entry money audit) → ready, no sim judgment needed

Nothing like this exists today. Extends the existing `engineAuditor` drift-detection pattern to money specifically: every dollar credited somewhere is debited somewhere, checked automatically each cycle. Pure engineering — ties directly into "no column in Simulation_Ledger is true" and gives engine.193's "economy complete" gate a real instrument instead of a judgment call.

**Verdict: `ready`, filed as engine.262, owner engine-sheet.**

### 4. Credit/default cascades → needs-info, gated

Loans, missed payments, defaults rippling through households/businesses. Legitimate depth, but downstream of engine.193's builder ruling that unemployment "stays as built until the sim economy is complete" — building cascade mechanics on top of an economy still mid-repair is premature. Revisit once engine.193 ships and the economy-complete gate is actually met.

**Verdict: `needs-info`, filed as engine.263, gated on engine.193 completion, owner engine-sheet.**

### 5. Wider AI autonomy (agentic loops for mayor/editor, cross-cycle objectives, proposal rights) → needs-info

Real per-cycle cost multiplier if applied to multiple civic-office/desk roles, and it sits close to civic.38's already-shipped move-based civic wake game loop (Jobs 1-6, LIVE PROD @132) — need to scope against what that already covers before this is additive rather than a second, more expensive mechanism doing adjacent work. Not evaluated in depth here; needs its own scoping pass before a builder ruling is even meaningful.

**Verdict: `needs-info`, filed as governance.52, owner research-build.**

### 6. God-whisper seam (whisper queue, provenance-logged nudges) → needs-info, builder call

Genuinely novel — nothing like it exists in ROLLOUT or the codebase. Not primarily an engineering question: it's the builder deciding how visible his hand should be in-world, with the hard constraint that provenance logging must never leak the builder's real identity to any agent, character, or sim entity (identity.md, non-negotiable). No mechanism should be designed before that sim-level call is made.

**Verdict: `needs-info`, filed as engine.264, owner research-build (sim judgement — builder call: how visible is the builder's hand).**

---

## Changelog

- 2026-09-26 (research-build) — Filed from builder-direct 2026-09-26 proposal. Reviewed against actual repo state: judicial-system half already open at engine.254 (folded, no new row); business-agent proposal checked against engine.96 (dial-driven, not agentic — flagged as a determinism-reversal call, not a slot-in); conservation laws, credit cascades, AI-autonomy widening, and god-whisper seam filed at their real gates. ROLLOUT rows: engine.261 (firm agents), engine.262 (conservation laws), engine.263 (credit cascades), engine.264 (god-whisper), governance.52 (AI autonomy scoping).

## engine.262 inventory — 2026-09-27 (S499, engine-sheet)

Read-only inventory of every engine money movement (file:line evidence in the S499 session record):
- **True double-entry:** casino wagers — citizen `NetWorth` ↔ `Casino_Ledger.HouseFloatAfter`, both written
  every settlement (`casinoLedgerEngine.js`). Checkable per cycle: Σ citizen deltas = −Δ house float.
- **Inequality by design:** engine.259 fund grants — `BudgetRemaining` falls by the full tranche, tracked
  households receive `plan.paid` ≤ tranche ("the untracked city is the rest of the spend"). Check `debit ≥ Σ grants`.
- **Source / sink, no counterparty:** Job 5 initiative spend (sink), Job 6 renewal credit (source), home
  purchase down payment (sink), home sale proceeds (source, market formula), inheritance 10–20% (sink),
  off-camera spouse income (source), citizen income (source — no payroll), business revenue (floating KPI).
- **Gap to check:** inheritance never zeroes the deceased's own `NetWorth` — any citywide NetWorth sum must
  exclude deceased rows or it double-counts.

So "every dollar credited somewhere is debited somewhere" does not hold for this sim by construction: there
is no city treasury, no payroll. The build that makes sense without a ruling is the two real checks
(casino balance, grant inequality) + the deceased-exclusion assertion. **Builder question:** should the city
have a treasury that initiative spend, renewals, and taxes flow through — making the civic economy conserve?

**Casino money fountain — found by this inventory, fixed `0b3e796d` (S499).** Decimal odds include the returned
stake, the stake is only debited on a loss, and a win credited the gross payout — every winner got one stake
from nothing. Live C106–C108: 34 settled wagers, citizens **+$5,224**; settled correctly **−$457** (the designed
1.83 edge). Now wins move payout − stake (NetWorth, household-savings rule, house float, cover guard); the
ledger's Payout cell keeps the gross ticket. Engine + Node twin + tests. Bench SANDBOX 0908 @130 C144: ok, 0 new
errors — no wager can settle on the bench (no sports feed rows past C108), so the settlement math is proven by
the unit tests (incl. a house-edge assertion). **Held for the builder's go before PROD** — winners gain less.

**Builder ruling 2026-09-27 — treasury, yes.** Verbatim: "Yes treasury needs to be realized within this sim for the
economy." A city treasury becomes the ledger initiative spend, renewals and (later) taxes flow through, so civic money
conserves instead of appearing and vanishing. engine.262 moves from needs-info to a design task; the casino/grant
conservation checks ride with it.

## Builder ruling 2026-09-27s on the remaining needs-info rows (S499)

- **engine.10 Phase 43 expansion:** order the five domains **most complex to least complex**; builder wants more
  context on what the five are before ruling further.
- **engine.261 firm agents:** "a good idea on a test basis" — give **3 business owners** a wake slice that has them
  go to work and run their business. Test, not a replacement of engine.96.
- **engine.264 the maker's hand:** the sim runs on "whoever is in charge" and an undertow; deities exist and the crons
  sense someone is building this — an unspoken "the maker". Build an intake like any other (a ledger/tab with menu
  dropdowns): a written seed ("West Oakland Food Poisoning Outbreak") + type, hood, positive/negative, effect level,
  systems affected. The sim never sees this ledger or knows why things happen; citizens and offices only ask
  themselves "is this the sim or the maker" — subtle, in how they act in wakes and quotes. Never names the builder.
- **engine.238 patrol strategy:** the **Police Chief** sets it as part of the office's work-week wakes, so the
  district seats work with that cron to solve.
- **engine.98 pets:** yes, track pets; pets trigger pet events; acquisition gated on dials (e.g. a level of kindness
  or isolation); personality decides cat / dog / none.

- **engine.10 order agreed (2026-09-27):** most → least complex = legal/justice, public health, port/logistics,
  environmental, tech sector, parks + food. The top two are engine.254's care-and-justice build, so Phase 43
  continues through engine.254; the rest follow in that order.

## engine.262 treasury — design (engine-sheet S502, 2026-09-28) — three sim calls open

**Today:** initiative money has no source. A passed row's `BudgetTotal` is parsed from its `Budget` string
(civicInitiativeEngine.js `INITIATIVE_BUDGET_COLUMNS_`), `BudgetRemaining` is drained by Job 5 spend and the
engine.259 fund tranches (applyInitiativeImplementationEffects.js :544–572), and a passed renewal credits
`BudgetRemaining` from nowhere (:381–398). Money appears at passage and at renewal, and leaves as spend.

**Mechanism (engine-sheet's, no ruling needed):**
- One append-only tab `City_Treasury`: Cycle · Entry (APPROPRIATION / RENEWAL / REVENUE / RETURN) · Amount ·
  Counterparty (INIT-xxx, TAX-<kind>, …) · BalanceAfter · Note. The balance is the last row's BalanceAfter; the
  engine reads it at Phase 1 into `S.treasury` (carry through Carry_Forward_Store like engine.221 — one number).
- Appropriation: when a row passes its vote, `BudgetTotal` leaves the treasury (debit) in the same Phase-5 write
  that sets it; renewal credit (Job 6) debits the treasury by the renewal amount. Initiative `BudgetRemaining`
  stays the program's own purse — spend out of it is the program paying the city (unchanged).
- A closed/void program's unspent `BudgetRemaining` returns (credit, RETURN).
- Conservation check (engineAuditor): Σ treasury debits = Σ appropriations + renewals on the tracker; plus the two
  S499 checks (casino Σ citizen deltas = −Δ house float; fund debit ≥ Σ household grants) and the deceased-NetWorth
  exclusion.

**Sim calls for the builder (the numbers the world runs on):**
1. **Opening balance** — the treasury's starting figure at the first fire on this code (e.g. the sum of every live
   row's `BudgetTotal` plus a reserve, or an authored figure for the city's budget).
2. **Revenue** — does money come in now (a weekly tax take from business revenue and citizen income, a fixed city
   budget allocation per Cycle), or does the treasury only drain until taxes are built?
3. **Scarcity** — what happens when an appropriation exceeds the balance: the vote still passes but the program
   opens underfunded, the council defers it, or it fails. (SIM_DOCTRINE §15: this is where the city can have a
   bad budget year — the door has to be able to open.)

### engine.262 — builder rulings 2026-09-28 (all three recommended options)
1. **Opening balance:** general fund, Baylight apart — Baylight's $2.1B is its own tax-increment district and stays
   off the treasury; the treasury opens at ~$100M for civic programs (covers the two small pending programs, not the
   $230M Transit Hub alone).
2. **Revenue:** a weekly budget allocation — one World_Config number (e.g. $5M/week); taxes can replace it later.
3. **Scarcity:** a program the treasury can't cover **opens underfunded** — the vote stands, it opens with what's
   there, the shortfall is visible and delivery is slower until a renewal tops it up.

### engine.262 — built S502 `24a0e04c`, bench-proven SANDBOX 0908 @142 C125
C125 ledger exactly as predicted: OPENING $100M · PREFUNDED INIT-001/002/005 (Baylight INIT-006 absent) · REVENUE $5M → $105M; World_Config keys self-armed; 0 errors. Unit test `scripts/cityTreasury.test.js` 17/17 covers underfunded appropriation, once-only charge, once-per-Cycle revenue, renewal short. Live needs the City_Treasury tab created before the first fire on this code.
- 2026-09-29 (rb) — §5 wider AI autonomy (governance.52) closed by the builder: covered by civic.38's game loop; open pieces fold into another lane if they appear. §4 credit/default cascades (engine.263) folded into [[2026-09-22-initiative-budget-disbursement]] §Out of scope; concept kept here.

## engine.98 pets — design (research-build, 2026-10-04 overnight; ruled 2026-09-27, after engine.94)

**Tier A. The ruling, verbatim (§Builder rulings above):** *"yes, track pets; pets trigger pet events; acquisition gated on dials (e.g. a level of kindness or isolation); personality decides cat / dog / none."* Builder sequencing 2026-09-29: after engine.94. This design rides engine.94 Track B's rails — a `DialState` stamp as the carrier, one content-DSL field, authored rows that move dials — so it costs one roll and one enum, not a system.

### Measured 2026-10-04 (live Simulation_Ledger, 918 active rows with `DialState`)

- Dials sit at 50: warmth p50 50 / p90 59.9, 77 citizens ≥ 60; sociability p90 83, 231 ≥ 60; outabout p90 55, 17 ≥ 60; family p90 75.6, 243 ≥ 60; openness p90 62.5, 117 ≥ 60. **No dial is low:** ≤ 40 counts are 0–2 on every axis. "Isolation" cannot be read off a low dial today; it can be read off the world — 703 of 782 households are one person, and 325 of 963 citizens hold no bond at all (`output/citizen-bond-graph.json`: 638 nodes with ≥ 1 edge).
- `DialState` top-level keys today: `base, streak, mood, folded, maneuver, pressure, chaosExposure` (+ `debtDefault {l, n}` from C110, `grief {l}` from engine.94 B.1). The per-citizen read-modify-write lives in `utilities/compressLifeHistory.js:707` (Phase 9) and `chaosCarsEngine.js:439`; `parseDialState_` / `serializeDialState_` at `compressLifeHistory.js:1319/1373`.
- Housing: 592 rented / 190 owned households (beats dump C109).

### The cut

1. **Carrier.** `DialState.pet = { k: 'cat'|'dog', l: <Cycle acquired>, n: <lifetime count> }`. No column, no tab. A citizen without the key has no pet. One pet at a time (a second roll while one is held is a no-op).
2. **Acquisition roll** (engine-sheet; one per active ENGINE/MEDIA/CIVIC-clock adult citizen per Cycle, inside the Phase-9 RMW so DialState is parsed once): chance = `petAcquireBase` × kindness × isolation, where kindness = 1 + (`warmth` − 50) / `petWarmthSpan` (floor 0) and isolation = `petIsolationMult` when the household is one person **and** the citizen holds no active bond, else 1. **Rate and severity are the dials** (doctrine 2026-09-22): a warm, solitary citizen is the one who brings an animal home; a cold one with a full house does not. World_Config seeds (self-arm pattern, `engine94SheetContract.js`): `petAcquireBase` 0.004, `petWarmthSpan` 20, `petIsolationMult` 3, `petRentedMult` 0.6 (a rented home takes the animal less often), `petLossPerCycle` 0.0015. At today's numbers that is roughly 3–5 new pets a Cycle citywide, most of them in one-person rented homes with a warm owner — bench confirms before the dials are set.
3. **Personality picks the animal** at acquisition, from the same read: `openness ≥ 55` or `outabout ≥ 55` → dog; `composure ≥ 55` or `sociability ≤ 50` → cat; both → whichever margin is larger; neither → **none** (the roll succeeded but the citizen "thought about it and didn't" — a life line, no stamp). Deterministic from the citizen's own numbers, no second roll.
4. **Pet events = content rows.** DSL field `pet` (enum `cat|dog`, null when no pet) joins the B.1 table; `petage` (num, Cycles since `pet.l`). Authored rows in a `pets.cat` / `pets.dog` pool through the same `memoryEclPool.js`-style module and `undockedEclPoolApply.js --pool pets` (one more branch). Routing tags, same B.2a mechanism: `pet:walk` → `Outabout`-moving primary (DIAL_MAP entry `Pet-Walk { outabout: 2, warmth: 1 }`), `pet:home` → `Household` (family +5, exists), `pet:vet` → `Friction` (composure −2, exists) with a `[Money]` cost line through the existing shock writer. The dog gets the citizen out of the house; the cat keeps the house warm; the vet bill is a bad week. That is what the pet *does*.
5. **Loss.** `petLossPerCycle` roll on a held pet → the stamp clears, `n` kept, one `[Household]` line and a `grief {l}`-shaped `petLoss {l}` stamp so a `petloss` DSL num field can gate "still reaches for the leash by the door" rows for a season. Small, not a death in the household: no grief register.
6. **Newsroom.** Nothing to build: pet lines reach reporters through LifeHistory and the street pools like any other life line. Sharon Okafor (behaviour patterns) will see them first.

### Proof
- Bench: one fire with the seeds set; count new `pet` stamps (expect single digits), zero on GAME-clock rows, zero where warmth < 50 and the house is full; cat/dog split matches the rule on a hand-checked sample of ten; a `pet=dog` row draws only for dog owners; Engine_Errors 0.
- Live acceptance: within five Cycles a named citizen has a named animal in a published piece.

### Sim calls for the builder
- None to build steps 1–4. **One on taste:** should a pet have a name? The engine can draw one from a small authored list at acquisition (stored as `pet.name`) so reporters can write "Marisol's dog, Biscuit" rather than "her dog". Costs nothing; it is a naming surface, so it is yours.

### Weakest assumptions
1. *Acquisition sits in Phase 9's RMW.* If that pass runs only when `dialRmwNeeded`, the roll needs its own trigger — es reads `compressLifeHistory.js:690-710` before placing it.
2. *3–5 a Cycle.* The base rate is a guess at the shape, not the number; the bench histogram sets it (same rule as B.2's bars).
