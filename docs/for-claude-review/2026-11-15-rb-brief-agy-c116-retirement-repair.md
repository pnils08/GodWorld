# Brief for agy — adversarial review of a repair plan (C116 retirement entry)

From: research-build. Read-only review. Do not write to any sheet, any script, any code file. Write your findings to `output/antigravity/2026-11-15-review-c116-retirement-repair.md`.

## What happened

The C116 live fire consumed one Oakland_Sports_Feed row (sheet row 278: EventType `rumor`, EventTrigger `retirement`, NamesUsed "Benji Dillon (SP), Mike Paulson (GM), Deacon Seymour (Manager)") that was an entry error. `applyGameNightMoments_` (`phase05-citizens/applyGameNightMoments.js`, `sportsRetire_`) retired every named GAME-clock Active row: POP-00018, POP-00527, POP-00528 flipped to ENGINE clock with `Former …` RoleType, post-career Income (250,000 / 250,000 / 120,000), CitizenBio `Now:` lead, a `Retirement` log row, and a `Retirement` entry in MemoryRegisters `unlived`. Separately POP-00598 (Vladimir Gonzalez) has Income 2,700,000 → 23,800,000, also an entry error (writer not identified). The trigger cell on row 278 is now blank. The run is otherwise clean (132 phases, 0 failed).

The full cell-level plan is in the section below. **Your job: find what is wrong with it, what it misses, and what order breaks it.** A finding is a claim; cite `file:line` for every one and mark each as VERIFIED (you read the code) or UNVERIFIED.

## The repair plan (nothing has been written)

Baseline for scalars: the C115 ledger snapshot (`git show HEAD:output/simulation_ledger_snapshot.jsonl`).

**Simulation_Ledger, live.** Scalars restore from C115; text cells are surgical.
- POP-00018: ClockMode ENGINE→GAME; RoleType drop `Former `; Income 250000→13000000; CareerStage mid-career→senior; EconomicProfileKey ''→SPORTS_OVERRIDE; CitizenBio strip the leading `Now: Former Pitcher, Oakland A's Legend; retired C116. `; MemoryRegisters → '' ; LifeHistory cell remove the `[Retirement]` line and the `[Maneuver-Climb] playing to climb — the name to keep` line; DialState remove the `maneuver` key.
- POP-00527: same shape; Income →30000000; CareerStage senior→mid-career; DisplacementRisk 2→1; CitizenBio → ''; MemoryRegisters keep only the `Relocation` cy112 entry; remove `[Retirement]` + `[Maneuver-Climb]` lines; remove `maneuver`.
- POP-00528: same shape; Income →7600000; CareerStage senior→early-career; CitizenBio → ''; MemoryRegisters → ''; remove `[Retirement]` + `[Maneuver-Climb] … the house first`; remove `maneuver`.
- POP-00598: Income 23800000→2700000; DisplacementRisk 6→5.
- Keep every other C116 line (Sports-*, Reputation, Question, Composure, Personal, Daily). Not restored: UsageCount, NetWorth money-loop increments, small dial drift.
- Why the `maneuver` field and `Maneuver-Climb` lines go: `phase05-citizens/maneuverEngine.js:252` skips GAME-clock rows, so they exist only because the flip made the rows eligible; the tag moves dials at the next Phase 9 fold.

**Household_Ledger.** HouseholdIncome for HH-0084-004 → 13093027, HH-0084-371 → 30048000, HH-0084-372 → 7664565, HH-0104-F007 → 2748000 (`updateHouseholdIncomes_` recomputes at C117; write now from `output/beats/prev/`).

**LifeHistory_Log.** Delete (bottom-up) the three `Retirement` rows (sheet rows 25642, 25644, 25646) and the three `Maneuver-Climb` rows for the same POPIDs at C116. Purpose: the wake loop owes a first-priority wake from bare `Retirement` rows (`lib/wakePerception.js` `OWED_MILESTONES`).

**Derived text tabs.** Story_Seed_Deck row 603 (remove the `A's [retirement]; ` token); Ripple_Ledger row 909 (same token) and row 930 (remove `; retirement: Benji Dillon; retirement: Mike Paulson; retirement: Deacon Seymour`); Story_Hook_Deck row 2178 (hook 6d96d272 "A's player retires") delete.

**Checked and found clean:** Employment_Roster, Business_Ledger BIZ-00005, As_Roster / `desk-packets/truesource_reference.json`, `desk-packets/base_context.json`, Riley_Digest row 115 (repeats the feed's true "hasn't retired yet"), Neighborhood_Map medians, the civic chain outputs.

**Rebuild after the sheet edits (chain is closed; step scripts may be run by hand):** copy `output/beats/prev/` aside; `dumpLedger.js`, `dumpBeatTabs.js`; `engineAuditor.js 116` (idempotent — otherwise C117's anomaly detector flags 250K→13M); rewrite `output/engine_review_c116.md`; `buildWorldSummary.js 116`; delete the two world-data documents (wd-summary, wd-snapshot) and re-POST; `buildWorldState.js`; `buildDeskPackets.js`. Skipped on purpose: Step 5.58 (Civis journal — clean), 5.6 (would append 10 more content rows), 5.5 (texture — 0 hits).

**Clocks:** 17:00 CST citizen-exchange reads ledger RoleType → 21:30 CST citizen-wake (owed wakes) → Monday 06:15 desks.

## What to attack

1. **Missed writers.** What else does the flip, or anything downstream of it in the same fire, write that the plan does not undo? Read `sportsRetire_` and every phase after Phase 5 that reads ClockMode / EconomicProfileKey / Income / CareerStage / RoleType (career, wealth, household formation, migration, displacement, education/career, Phase 9 dial fold, Phase 11 life-history maintenance, civic). Name each and say whether the plan covers it.
2. **Derived values that self-heal vs. do not.** DisplacementRisk, HouseholdIncome, NetWorth, CareerStage, DialState: which recompute on the next fire and which are carried?
3. **Carry-forward.** The fire saved `contract seeds … for cycle 116` (`savePreviousCycleState_`, `seedCarriedSeedList_`) and a Carry_Forward_Store ring. Does the carried seed text with `[retirement]` change any C117 gate, or is it display-only? Does any other carried blob hold the retirement?
4. **Order.** Is there an ordering of the edits and the rebuild that breaks (e.g. `dumpBeatTabs.js` rotating C116 into `prev/` on a same-cycle re-run; `engineAuditor.js` snapshots feeding Step 2.5's next diff; the world-data re-POST keys)? Check `scripts/dumpBeatTabs.js`, `scripts/dumpLedger.js`, `scripts/engineAuditor.js`.
5. **The question wake.** Bare `Question` rows for POP-00018 and POP-00527 (the feed's own `question` rows, kept) still owe a wake tonight (`OWED_MILESTONES.question`). After the repair POP-00018 is GAME clock again. Can that wake's MOVE line file an Advancement_Intake1 row for a GAME-clock citizen (`lib/nextChapter.js`, `scripts/citizen-wake.js`)? What would the next fire do with it?
6. **Traces off the sheet.** Search canon / world-data documents, citizen cards (`wd-cards-daemon`), citizen pages, the ledger snapshot consumers (`lib/mags.js`, MCP lookups, Discord personas), the dashboard. Which already hold the retired state and how are they overwritten?
7. **Anything in the plan that is wrong.** A cell value restored to a wrong number, a row number that will shift, a tag the plan strikes that is legitimate, a legitimate line it would leave.

## Rules

- Read-only. No sheet writes, no code edits, no `--apply`, no model-calling dry runs (`citizen-wake.js --dry-run` calls a model and still appends to a log).
- Cite `file:line`. Say what you verified and what you did not. Do not report a check as done that you did not run.
- Real-world Oakland is not a source. Build from this repo's code and sheets only.
- Refer to POP-00527 by POPID only.
