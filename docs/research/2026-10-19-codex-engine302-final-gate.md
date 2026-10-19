---
title: engine.302 cuts 1–3 final PROD gate — codex
created: 2026-10-19
updated: 2026-10-19
type: reference
tags: [engine, review]
sources:
  - docs/archive/for-claude-review/2026-10-19-engine302-final-gate-TASK.md
  - docs/plans/2026-10-08-engine-286-game-of-life-events.md
pointers:
  - docs/research/2026-10-19-codex-engine302-cut3-recheck.md
---

# engine.302 final gate — codex

Scope: `5ee334ed` against the cut-3 recheck and plan §Bench soak “Cut 3 — codex recheck”; `git diff 0125b59a^ 5ee334ed -- phase*/ utilities/ lib/`. Source review and `node scripts/engine302Marital.test.js` (103/103); no Sheet, bench, cron, model, canon, deployment, commit or push.

- **A1 SHIP:** refused intake spouse is removed before household formation (`phase05-citizens/processAdvancementIntake.js:2385-2395`).
- **A2 SHIP with declared residual:** GC wedding requires its stamped Courting row (`phase05-citizens/bondEngine.js:2545-2563`); same-row lookalike after row movement remains documented (`docs/plans/2026-10-08-engine-286-game-of-life-events.md:406`).
- **B1/B2/B7 SHIP:** whole-Cycle crisis stamps, three distinct kinds with a major loss, and no random divorce die (`phase05-citizens/householdFormationEngine.js:983-1009,1055-1059`).
- **B3 FIX:** a SpouseId naming a POPID absent from the ledger now reaches the off-camera divorce branch, and an on-ledger nonreciprocal link still skips (`phase05-citizens/householdFormationEngine.js:1043-1051`). Absence is not proof of archive: a malformed/unknown POPID also divorces. Check the named POPID against the existing `Citizen_Archive` view and fail closed on an unproven nonblank link (`utilities/archiveCitizenExits.js:61-91`).
- **B3 HOLD:** an archived spouse's romantic bond can remain active: bond resolution is only in the `couple` branch; the absent-spouse branch clears SpouseId without resolving it (`phase05-citizens/householdFormationEngine.js:1130-1147`). Active romance counts as a prospect and blocks the divorced citizen's GC courtship (`phase05-citizens/bondEngine.js:2633-2654`). Resolve the identified bond for a proven archived pair.
- **B4 SHIP, narrow:** the wrong HouseholdId and a throwing row write leave the in-memory marriage unchanged; the row is read and written once (`phase05-citizens/householdFormationEngine.js:1106-1133`; `scripts/engine302Marital.test.js:466-477`).
- **B4 HOLD, row integrity:** the checked Household_Ledger row is written before the Simulation_Ledger intent executes (`phase05-citizens/householdFormationEngine.js:1102-1127`; `phase01-config/godWorldEngine2.js:854-867`). If that later commit fails, Members is rebuilt next Cycle but a new HeadOfHousehold who remains a member is retained, so the pre-divorce head is not restored (`phase05-citizens/householdFormationEngine.js:719-725`). The new ordering closes a direct-write failure, not this cross-tab partial commit.
- **B4 HOLD, bond replace:** I do not accept the shared Phase-10 error-class answer for PROD. The bond save can return without queueing (`phase05-citizens/bondPersistence.js:281-303`); a queued replace can fail while ledger updates continue (`phase10-persistence/persistenceExecutor.js:97-143`). `persist.errors` marks an execution failure (`phase01-config/godWorldEngine2.js:1023-1042`), but supplies no paired readback or replay after a failed replace; the checkpoint handles a time wall, not this partial commit (`phase01-config/godWorldEngine2.js:858-867`). Minimum: a durable per-divorce intent/receipt, typed readback of bond and marital/household fields, and idempotent reconciliation until both agree, including a skipped bond save.
- **B5 SHIP for successful writes:** recorded-parent/tie selection and off-camera retype remain (`phase05-citizens/householdFormationEngine.js:1064-1099,1125-1127`); failure cases above qualify this.
- **B6 FIX:** 103/103 focused assertions pass, including wrong-row, row-write failure and absent-spouse cases (`scripts/engine302Marital.test.js:463-477`). They do not exercise archived bond state, a failed Phase-10 commit, or two-tab recovery.
- **Additional HOLD in cuts 1–3 diff:** remarriage now moves children in the in-memory ledger, then writes the old household's Members before the destination's Members (`phase05-citizens/bondEngine.js:2361-2393`). Either direct write can fail after the marital and child changes (`:2322-2329,2371-2388`); there is no row identity check or paired recovery. A failed destination write leaves the old home pruned and the new home unchanged. Make both household writes identity-checked and recoverable against a recorded transfer before PROD.
- **Other diff:** no further independent PROD blocker established in the changed derivation, perception, intake, and bond formation paths (`lib/citizenDerivation.js:335-376`; `lib/wakePerception.js:238-246`; `phase05-citizens/bondEngine.js:1135-1496`). Focused tests do not establish live Sheet or bench behavior.

**Gate: HOLD for PROD.**
