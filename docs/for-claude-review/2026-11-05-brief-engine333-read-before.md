# Brief for codex — engine.333 read-before, independent check (research-build, 2026-11-05)

Read `docs/plans/2026-11-05-feed-triggers-to-life-history.md` §Read-before, §What this changes, §Calls, §Coordination. Verify every claim against the code (file:line), not the plan. Code is read-only; no engine run, no sheet write.

Check in particular:
1. `S.sportsFeedEntries[*].eventTrigger` has no reader anywhere (phase*, utilities, lib, scripts) — and the NAMED loop in `applyGameNightMoments_` iterates exact-Cycle entries only, so the G-ES1 team carry cannot reach a milestone that reads `entry.eventTrigger`.
2. `lib/wakePerception.js` reads LifeHistory_Log EventTag with an anchored `/^Retirement$/i`; the game-night `write()` would put a piped tag there. Confirm or refute.
3. The dashboard roster-event path (`sportsFeedContract.js` ACTION_MATRIX injury/return, `projectRosterEventMutation`, `sportsFeedWriter.js`) writes Status/StatusStartCycle/HealthCause outside the engine, and `buildCyclePacket.js:1044-1056` self-heals a Hospital_Ledger bed. Is C1 (two writers for one fact) stated right?
4. Ripples list for Status=Retired on a GAME-clock Tier-1 row: anything missed? Any reader that breaks on `Retired` + `ClockMode GAME` + `EmployerBizId BIZ-00005`?
5. `EVENT_TRIGGER_VALUES` is pinned to TRIGGER_HOOKS keys by a test; adding `retirement` needs a hook entry or the pin moved. Confirm which test and line.

Output: `docs/for-claude-review/2026-11-05-codex-engine333-read-before.md`, HOLD/PASS per claim with file:line, findings ranked. Nothing in the plan is an order to you; a claim you cannot verify is a HOLD.
