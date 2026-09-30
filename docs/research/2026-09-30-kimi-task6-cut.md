---
title: Task 6 cut — adversarial review (detained gates, custody carried by the case)
created: 2026-09-30
type: research
tags: [engine, care-justice, review, kimi]
sources:
  - docs/plans/2026-09-21-care-and-justice-system.md §Task 6 cut (commits 9404cf2c, 992892b8), §Task 5 cut, §Judicial_Ledger schema, §R4 precedence
  - phase04-events/chaosCarsEngine.js, phase04-events/generationalEventsEngine.js, phase05-citizens/judicialLifecycle.js, phase10-persistence/buildCyclePacket.js, phase01-config/godWorldEngine2.js — all read in full for this review
  - Full-corpus Status read-site sweep (phase*/, utilities/, lib/, scripts/, dashboard/) and a 17-claim line-citation verification, both run for this review
pointers:
  - "[[plans/2026-09-21-care-and-justice-system]] — the plan under review"
  - "[[research/2026-09-29-kimi-care-justice-task5-diff]] — prior lane review in this series"
---

# Task 6 cut — adversarial review

**Verdict: REVISE — do not build as written.** The lifecycle mechanics (seeded decisions, monotone clocks, R4 by construction) are sound and the read-before is mostly accurate, but the cut has two critical holes, one internal contradiction, one deploy/schema collision, and a participation-gate list that is materially incomplete — including misses inside files the cut already touches. Twelve findings, each verified against code.

## Critical

### F1 — CONFIRMED: `detained` with no case is terminal, and the cut breaks the F7 handoff promise

Task 5's cut stated: a `writeChaosCarsRow_` throw after receipt build leaves "no receipt and no case … no judicial reconcile is built (no Status flip exists to reconcile from until Task 6, which revisits it)". **Task 6 does not revisit it.** Mechanism 3's custody re-assert only goes case → Status; nothing goes Status → case.

Two reachable windows strand a citizen in `detained` with no case row:

1. **Lost receipt.** Mechanism 1 flips Status inside `writeCitizenEvent_` (`chaosCarsEngine.js:452-473`, receipt built :464-472). The caller draws the payload `eventId` (:658), calls `writeChaosCarsRow_` (:670 — can throw), and only then stamps and pushes the receipt (:673-677). A throw between flip and push propagates out of `runChaosCarsEngine_`, `safePhaseCall_` catches it (`godWorldEngine2.js:159`), the Cycle continues, and Phase10-CommitLedger (`godWorldEngine2.js:575`) persists `detained` with no receipt and no case. The same window exists for `queueAppendIntent_` at :488 if the flip lands before it.
2. **Asymmetric Phase-10 failure.** The judicial writer lives inside Phase10-CyclePacket (`godWorldEngine2.js:556`; `persistHospitalLedger_` is called at `buildCyclePacket.js:79`). If `persistJudicialLedger_` throws (`requireTab_`, `utilities/utilityFunctions.js:84-88`), the phase fails but CommitLedger still runs — Status `detained` persists, the case row never does.

Why terminal: Phase5-Judicial iterates open cases only; the health lifecycle only advances health states (`generationalEventsEngine.js:390-391`); the ghost-bed reconcile only scans Hospital_Ledger rows (`buildCyclePacket.js:941-959`); chaos targets will exclude `detained`; career/household skip them. No writer ever restores a case-less `detained` citizen. The only exits left are age-based death (`checkDeath_`, `generationalEventsEngine.js:597-608`) — and, per F4, birth and graduation while stranded. The fix must name a reconcile (mirror the missed-admission pattern, `buildCyclePacket.js:963-988`) and face the hard part honestly: a stranded `detained` has no surviving PriorStatus, so the restore target is a sim call, not a mechanical default.

### F2 — CONFIRMED: custody re-assert resurrects `traded` / `inactive` citizens

Mechanism 3's re-assert condition exempts only health states, `deceased`, and `detained`. `traded` and `inactive` are not exempted. A citizen with an open `pending`/`held` case who is traded (sports) or inactivated gets flipped **back** to `detained` — undoing the "left the city" semantics those states carry everywhere else (`generationalEventsEngine.js:379-382`; `Phase11-CitizenArchive` archives deceased/traded rows, `godWorldEngine2.js:586`). There is also no rule closing the case on trade/inactivation — death is the only non-decision close the cut offers. And once Phase 11 archives the row, the re-assert's Status lookup finds no row at all; that behavior is unspecified (the hospital ghost-bed reconcile answers this exact case with `if (gStatus === undefined) continue;` at `buildCyclePacket.js:944` — the judicial side needs the same sentence).

### F3 — CONFIRMED: mechanism 6 (GAME-clock protection) is defeated by mechanism 3 (re-assert) — the cut contradicts itself

M6: a `ClockMode` `GAME` citizen's arrest opens the case but leaves Status alone. M3's re-assert, next Cycle: open `pending` case + Status `active` → `detained`. The protection survives zero Cycles unless re-assert exempts GAME citizens, which the cut never says. Once flipped, the sports feed's stat capture rejects the athlete — `scripts/sportsFeedWriter.js:457` and `dashboard/sportsRoutes.js:766` both require `active`/`recovering` (`sports_participant_state_invalid`) — the exact downstream break M6 exists to prevent. Second layer: ClockMode is independent of Status (`GAME`/`MEDIA`/`CIVIC`/`ENGINE`/`LIFE`); an athlete arrested while not on the GAME clock flips immediately and hits the same 422 gate. As written, M6 is dead letter.

### F6 — CONFIRMED: the deploy step collides with the approved schema's column order

The schema fixes Hospital_Ledger L–P as IntakeType, SourceSystem, SourceEventId, TransferFromId, PriorStatus — P is the **16th** column, after L–O. Task 6's deploy step 1 adds "Hospital_Ledger header P" alone. Appended by itself, P lands at column **12**, breaking the approved order with L–O still unwritten (the existing range writes at `buildCyclePacket.js:886/:906/:950` cover columns 7–11 and survive either way, but the schema doesn't). Resolution must be stated: add all five headers L–P at Task 6 and write only P (Task 8 then stamps L–O into existing columns), or re-letter the schema. Related: today's admission rows are 11-wide (`buildCyclePacket.js:893-895`); the cut states "rows 21 wide" for Judicial_Ledger but never states the new hospital row width (16).

## High

### F4 — CONFIRMED: the participation-gate list is materially incomplete

Mechanism 5 gates 7 surfaces. The corpus sweep found the `deceased/inactive/traded/pending` exclusion idiom — which silently **includes** a `detained` citizen — at every one of these ungated sites:

- **`generationalEventsEngine.js:381-382` — the cut's own file.** A `detained` citizen passes the skip list and the ENGINE/CIVIC mode gate (:462), then draws births (:516-531, needs married + household — a prisoner has a baby), graduations (:470-485), retirement milestones (:585-595), and age-based death (:597-608). Death is caught downstream by the Phase5-Judicial death clause; births and graduations in custody are a sim decision the cut makes by omission and never names.
- Career split-brain: `runCareerEngine.js:934-935` is gated (cut), but `educationCareerEngine.js:265/:498/:608/:703` (`deceased`-only skips) keeps accruing years-in-career, education fill, and **promotion mobility** for the same detained citizen.
- Daily life: `generateCitizensEvents.js:2146/:2051`, `generateGenericCitizenMicroEvent.js:449`, `runRelationshipEngine.js:376`, `runNeighborhoodEngine.js:442`, `runEducationEngine.js:379`, `runYouthEngine.js:635/:720`, `maneuverEngine.js:251`, `processAdvancementIntake.js:1343`, `commuteFlowEngine.js:159` (a detained citizen commutes), `migrationTrackingEngine.js:220/:234/:415/:650/:959/:1000` (displacement risk and **migration story hooks** — a detained citizen can move).
- Dating: `bondEngine.js:464-465` suitor scan is exclusion-listed (detained citizens get suitors), while the same engine's singles map at :2086 is inclusion-listed (`active` only) — internally inconsistent even before `detained`.
- Sports texture: `generateGameModeMicroEvents.js:489-490` — a detained GAME athlete still draws game-mode micro-events. Note phase order: this runs at `godWorldEngine2.js:340-344`, **before** any Phase5-Judicial placement, so even gated it lags releases by a Cycle.
- Desk/roster: `compileHandoff.js:507` (`loadPlayerRosters_` skips only `inactive/removed`) — a detained athlete stays on the A's roster in desk handoff packets.

The cut also lists `cron-work-wake.js:100`, `lib/wakePerception.js:529`, `scripts/civicPetitions.js:29` in its read-before and then never rules on them. Verified: cron-work-wake :100 and civicPetitions :29 read Hospital_Ledger `StatusNow`, not Simulation_Ledger Status — safe, but the cut should say so; wakePerception :529 is an inclusion regex (health states) — a detained citizen's wake silently carries no custody acknowledgment. If wakes should say "in custody", that is unbuilt and unnamed.

### F5 — CONFIRMED: the P-substitution read-scope vs Phase-10 writer order is unspecified, and the obvious implementations break "P never stores `detained`"

Mechanism 4: for a detained admission, P = the case's Q, "from this Cycle's `S.judicialEvents` or the tab's open row". Reachable break: arrest C110 (case opens, `detained`); C111 ordinary health admits the citizen (the only admission path open to `detained` — heat is guarded at `generationalEventsEngine.js:286`, ambulance at `chaosCarsEngine.js:425`, ordinary health admits any non-excluded status at :614-671, confirmed) **and** the case decides released at DecisionCycle = C111. At Phase 10, if `persistJudicialLedger_` closes the case row **before** `persistHospitalLedger_` reads Q, and the Q lookup scans open rows only (the pattern it copies indexes only blank-DischargeCycle rows, `buildCyclePacket.js:867-873`), the lookup misses. Every fallback lands somewhere bad: P = receipt.from = `detained` (violates the invariant; the later discharge writes Status `detained` on a closed case → F1 stranding) or P = blank → discharge to `active` (resurrects a retired citizen — the exact defect the requirement exists to kill). Pin the writer order (hospital before judicial) or carry Q on the exit receipt. Also unspecified: from = `detained` with no case at all (the F1 state).

### F7 — CONFIRMED: the one-Cycle read lag is real, but asymmetric in a way the cut's framing hides

Phase order verified exact (`godWorldEngine2.js`: Career :366, Household :368, Generational :370, GenerationalWealth :391; second entry point :2081/:2083/:2085/:2106). Placement after Generational is correct — death-close and discharge re-assert both need it. But: (i) arrest (Phase 4) removes participation the **same** Cycle, while care-exit-into-custody leaves career/household treating the citizen as free for one full Cycle — discharge writes P (`:403`) and re-assert lands after both engines ran. A citizen in custody the whole Cycle gets paid and household-counted. For health changes the lag is honest (a discharge genuinely frees the citizen); here it doesn't, and "the same lag every health change has" covers that up. (ii) Engines **after** Phase5-Judicial see the change same-Cycle — HouseholdFormation (:390), GenerationalWealth (:391), EducationCareer (:392) — so a released citizen is skipped by career (:366) but can form a household in the same Cycle. One sentence each in the cut; both are bounded and self-healing.

### F9 — CONFIRMED: council availability goes split-brain

Mechanism 5 gates "council unavailability lists (both paths)"; "Not changed, unruled" says the arrest writes Simulation_Ledger only and a detained council member "still votes through the primary path". Verified: `civicInitiativeEngine.js:787/:803-805` read the **Civic_Office_Ledger** row's Status; :936/:956-958 are the Simulation_Ledger fallback (`getCouncilStateFromSimLedger_`, def :859). Gating only the fallback means a detained official's availability depends on which path served. Gate the primary too (requires an office-Status write — the civic-office rule the cut explicitly declines to build) or drop the fallback gate; as written the two halves contradict.

## Medium / minor

### F8 — CONFIRMED: `S.judicialEvents` is undefined on any no-arrest Cycle; the fail-loud discipline doesn't cover it

`chaosCarsEngine.js:676` initializes the array only when a receipt exists. Mechanism 3 mandates throw-on-missing for the tab/header but is silent on the in-memory array. A naive build applies the same throw to `S.judicialEvents` and fails every no-arrest Cycle — i.e., almost every Cycle (Task 5 measured ~1 arrest per 7 Cycles live; Task 7b lowers it further). State it: absent = no intakes, a named exception.

### F10 — CONFIRMED: death vs decision in the same Cycle has no specified order inside Phase5-Judicial

A `pending` case due this Cycle whose citizen dies in care (`generationalEventsEngine.js:782`) or by age (:603): `advanceCase_` can decide `released`/`diverted` and close the case; the death clause then finds ResolveCycle set and is a no-op (`judicialLifecycle.js:261`) — a dead citizen recorded as released. The schema's Outcome enum includes `deceased`; the cut lists exit before death. One line fixes it: death check first, or death overrides a same-Cycle exit.

### F11 — CONFIRMED: same-Cycle re-arrest transition receipts carry `priorStatus: 'detained'` and no `statusNow`

Second arrest in one Cycle: Status is already `detained` from the M1 flip, so the deduped transition receipt (`admitJudicialReceipt_`, `judicialLifecycle.js:183-198`) carries `priorStatus: 'detained'`. Mechanism 2's transition field set (StatusNow/LastTransitionCycle/HeldUntilCycle) excludes PriorStatus — correct — but the chaos-built receipt has no `statusNow` field, unlike `advanceCase_` events (`judicialLifecycle.js:278-281`). The writer must distinguish the two receipt shapes or it blanks StatusNow. Also: `reArrestEventId` has no column in the 21 — the re-arrest history is receipt-only and dropped at persist. Fine if deliberate; say so.

### F12 — CONFIRMED: "one open row per POPID" is declarative only in the writer

The copied pattern indexes open rows by POPID last-wins (`buildCyclePacket.js:871`), so a stray second open row silently shadows the first. Task 5 explicitly deferred cross-Cycle re-arrest dedup ("an arrest on a POPID with an open row is a transition on it, never a second row") to the persist; Task 6 pulls the persist forward without restating the rule. No live path produces a second open case today (detained excluded from targets; investigations unwired), but the invariant then rests on target-selection side conditions. Restate it in mechanism 2.

## Silent fallbacks and unruled sim decisions

- Named and honest: income while detained (morning list), civic-office Status (named, not built), GAME-clock arrests (builder to confirm — but see F3: the mechanism as written doesn't deliver the protection).
- Blank P → discharge to `active`: a named known-blank; acceptable, covers the 3 pre-column rows.
- **Made by omission, not ruled:** births, graduations, retirement milestones, dating, migration and commute texture while detained (F4); promotion mobility while career-skipped (F4); death-close vs exit precedence (F10); the restore target for a stranded `detained` (F1 — needs a ruling, not a default); wake-perception custody acknowledgment (F4).
- No new silent fallback in the rate path — `loadJudicialRates_` throws naming the key (`judicialLifecycle.js:151-173`); `requireTab_` throws (`utilityFunctions.js:84-88`). Good. (Pre-existing, not this cut's: `hospitalCapacity_` logs and defaults to 100, `buildCyclePacket.js:803-809`.)

## Read-before accuracy (for the build's citation hygiene)

Confirmed exact: phase order (`godWorldEngine2.js:366/:368/:370/:391`, second entry :2081-:2106); career :934-935/:261; household :506-508/:587; approval :322; heat guard :286; heat receipt :306/:321-330; stay-null gates; discharge newStatus at :810/:834; `seededRngFor_` (`cycleModes.js:82`); sheetCache lazy + `exists:false` (`sheetCache.js:38/:46/:51`); `prePublicationValidation` dead branch (`phase06-analysis/prePublicationValidation.js:205-211/:251` — `loadActiveCitizens_` defined nowhere); Task 5 receipt shipped and receipt-then-stamp order (`chaosCarsEngine.js:452-474`, :658/:670/:673-677). Drifted or imprecise: chaos target exclusion is :200-203 (cut cites :184/:321); `pickCareJusticeTarget_` def :324 (its exclusion lives in `careJusticeService.js` `careJusticeResidentIndex_` :114/:129); the generational health gate is :390-391 (cut :382), transition push :418-424 (cut :405-406), block `continue` :457 (cut :442); the discharge **row write** the P change actually touches is :403 — :810/:834 are the newStatus assignments inside the pure function; `civicInitiativeEngine.js`, `generateCivicModeEvents.js`, `generateMediaModeEvents.js` all live in `phase05-citizens/`, `prePublicationValidation.js` in `phase06-analysis/`. SHEETS_MANIFEST (docs/engine/, §9 :115): Hospital_Ledger is class `phase10-loc`, not `own-tab`; Judicial_Ledger appears nowhere — the manifest line the cut promises must say which class the new writer claims.

## What holds

- R4 precedence by construction is real: arrest receipts can't be built on health states (`chaosCarsEngine.js:463`), ambulance (:425) and heat (`generationalEventsEngine.js:286`) can't flip `detained`, and only ordinary health admits a detained citizen (:614) — the cut's claim is confirmed exactly.
- The skipped-Cycle design holds: monotone clocks (`judicialLifecycle.js:94/:103/:106`, `judicialServeHeld_` :69-74), decision rng seeded on DecisionCycle (`cycleModes.js:82`), same-Cycle no-op (:262), closed-case no-op (:261). A missed Cycle catches up with the same decision.
- Same-Cycle admit-then-discharge is impossible (`statusStartCycle === cycle` skip, `generationalEventsEngine.js:396`) — the P read through `ctx.cache` (last Cycle's Phase-10 close) is never stale for a discharging row.
- The death clause is load-bearing and correctly placed: age-based death can kill any non-health-status citizen (`:597-608`), so the case-close must run after Generational.
- Pulling the tab and writer forward from Task 8 is forced and correct — nothing else carries a case across Cycles (`S.judicialEvents` is pushed and dropped; only write site `chaosCarsEngine.js:676-677`, no reader anywhere).
