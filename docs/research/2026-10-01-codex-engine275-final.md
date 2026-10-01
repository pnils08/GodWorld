---
title: engine.275 final pre-PROD confirm pass
created: 2026-10-01
updated: 2026-10-01
type: reference
tags: [engine, review]
sources:
  - docs/research/2026-10-01-codex-engine275-rereview.md
  - git diff f27f21fe..6367401d -- phase01-config utilities scripts
---

# engine.275 final pre-PROD confirm pass — SHIP

Read-only code review of `f27f21fe..6367401d`. This is a code verdict for the stated single bound PROD project, with `World_Config.cycleCount=109`, `fireGuardMinutes=60`, and no `FIRE_ADMISSION_JSON`; it is not deployment or live-Sheet proof.

| Rereview item | Verdict | Evidence |
| --- | --- | --- |
| 2. Failed AdvanceTime could continue or be called aborted | **CLOSED.** | `safePhaseCall_` returns false on a caught exception (`phase01-config/godWorldEngine2.js:159-169`). The body passes that result to an unwrapped check before the next world phase (`:507-510`); false throws even when `summary.cycleId` was already assigned (`:355-363,926-932`). Close can call it `aborted` only if that summary never reached the admitted Cycle (`:375-382`). |
| 3. `done` over a known failed queued write | **CLOSED.** | The cache reports individual write failures (`utilities/sheetCache.js:199-206`). The body carries partial or thrown flush failure on `fire.commitProblem` (`phase01-config/godWorldEngine2.js:833-852`); close records `failed` and gives the caller a problem after the counter read-back (`:390-405,426-435`). |
| 5. Malformed fire record accepted | **CLOSED for the rereview cases.** | Presence is checked independently of truthiness; Cycle and timestamps must be positive integers, completed states need an ordered finish, and starts more than five minutes ahead are refused, including `aborted` (`phase01-config/godWorldEngine2.js:290-304`). The five-minute future tolerance is deliberate clock slack (`:235,298`), not an unbounded future record. |
| `clearfire` regression | **CLOSED for the stated PROD configuration.** | Token gate (`utilities/webTrigger.js:85-91`), shared fire lock (`:96-100`), guard-zero requirement (`:104-106`), expected record Cycle (`:107-110`), and sheet counter behind that record (`:111-116`) now bound deletion. A PROD sheet at guard 60 cannot use this door even if a token exists. |

**One question — could a normal weekly menu fire be wrongly REFUSED, or one intent run two Cycles?** On the stated inputs, **no to both**. The menu calls `runWorldCycle` (`utilities/godWorldMenu.js:23-28`), which takes one script lock before admission (`phase01-config/godWorldEngine2.js:413-421`). First fire: the reader sees 109 and guard 60; with no record, it admits Cycle 110 and writes `running` (`:246-279,290-305,333-340`), then the body advances once (`:501-510,918-935`). With successful persistence, close reads 110 and writes `done` (`:375-405,426-435`). A second click five minutes later either loses the lock or sees the `done` record: target 111 differs from prior 110, but age five minutes is inside 60, so it is refused before the body (`:307-330,413-421`). Next week's click sees 110 on the sheet, target 111, and an expired window; it is admitted. If 110 did not persist, the same-Cycle refusal is intentional pending reconciliation (`:307-314`). These results depend on the stated single bound PROD project; the lock and property are project scoped, so code alone does not prove deployment inventory (`docs/plans/2026-09-21-care-and-justice-system.md:656-659`).

Validation: `git diff --check f27f21fe..6367401d -- phase01-config utilities scripts` clean. `node scripts/fireGuard.test.js`: **113 passed, 1 failed**; `6b.16` got no phase-order slot count from its child `ctxMap.js` call (`scripts/fireGuard.test.js:324-326`). Its VM stubs the production Cycle body (`:63-75`); no live fire or Sheet verification was run.

**SHIP** for this code under the stated PROD configuration and single-project condition.
