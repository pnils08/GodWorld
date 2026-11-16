# engine.338b `86174e9db` over `506ca6b28` — final diff rereview

Scope: F1–F10 from the first review plus regressions introduced by the fold. Read at the pinned candidate; source inspection only. No wake, Sheet, model, sandbox, PROD, or deployment run. The prior sports/advancement wiring card remains `output/agent_engine-wiring_2026-11-07T23-48-14.md`; current paths were traced in source.

1. **F1 — OPEN (narrowed), blocks.** `lib/nextChapter.js:49-54,77-83,103-107` gates the ordinary Tier offers and refuses ineligible moves; `scripts/citizen-wake.js:221,488` passes the ledger Tier. But `docs/plans/2026-11-07-former-player-next-chapter.md:126` says an owner can direct their own academy at any Tier, while `rolesFor(4)` always returns `[]` (`scripts/nextChapter.test.js:58`). Input: Tier-4 academy owner answers `Youth Academy Director` → refused; the question frame offers only `none`. The plan's exception and rereview brief's all-Tier-4-none expectation conflict; the builder must settle this gate.

2. **F2 — OPEN, blocks.** `lib/feedPrivacy.js:19-24` filters the beats dump (`scripts/dumpBeatTabs.js:199-200`), world summary (`scripts/buildWorldSummary.js:1526`), and shared wake sports slice (`lib/wakePerception.js:103-109`). The dashboard still reads raw `Oakland_Sports_Feed` into its projection (`dashboard/sportsRoutes.js:392-416`) and returns `projection.events` from overview (`:970-984`); `scripts/sportsWorkspaceProjection.js:160-184` carries a club-tagged question row's Notes/EventTrigger into the event, and `dashboard/src/components/SportsOverview.jsx:95-110` displays both. Input: `TeamsUsed=A's`, `EventTrigger=question`, Notes containing the private question → dashboard viewers see it before the named citizen answers. Blank-team questions are ignored by the team's normalization, but that does not close this path.

3. **F3 — CLOSED.** `phase05-citizens/processAdvancementIntake.js:973-978,1897-1912` adds each re-home to the last pending `Business_Ledger.Employee_Count` cell intent; the two-hire case is asserted at `scripts/intakeExistingRowDoor.test.js:207-217`. `phase05-citizens/applyBusinessDynamics.js:745-752` writes only Annual_Revenue/Growth_Rate ranges, so Phase 10's later range pass (`phase10-persistence/persistenceExecutor.js:378-405`) does not overwrite the count.

4. **F4 — CLOSED by builder disposition, no code change.** `phase05-citizens/processAdvancementIntake.js:965-984` still grows the new tracked employer only. `docs/plans/2026-11-07-former-player-next-chapter.md:168` explicitly accepts that rule and says stated count may exceed tracked workers.

5. **F5 — CLOSED.** `phase05-citizens/processAdvancementIntake.js:990-1003` re-keys on a GAME-clock exit even with the role unchanged, clearing `SPORTS_OVERRIDE` for a non-GAME row. The blank-key money fallback is fill-only (`phase05-citizens/generationalWealthEngine.js:649-660`); no re-roll reader was found in the examined paths.

6. **F6 — CLOSED.** `phase05-citizens/educationCareerEngine.js:928-938` checks trainee mappings before exact catalog titles, preserving `Junior Accountant`/`Nurse Aide` settlement keys; `scripts/intakeExistingRowDoor.test.js:175-177` pins both lookup cases.

7. **F7 — CLOSED for the original append-failure case; see R1/R2.** `scripts/citizen-wake.js:280-287,306-315,507-514` files the move before the page and exits before the owed receipt when Sheet read or intake append fails. Those failures can be retried on a later owed wake.

8. **F8 — CLOSED.** `lib/nextChapter.js:89-95` selects the last MOVE and strips every MOVE line from the stored reflection.

9. **F9 — CLOSED.** `phase05-citizens/processAdvancementIntake.js:821-828` skips existing-name family/household/owner collision rows before the queue-wide cell checks; the body applies the same skip at `:886-895`.

10. **F10 — CLOSED.** `scripts/intakeExistingRowDoor.test.js:202-205` now asserts the exact re-priced Income (81,000) and the Advancement line, so an unchanged value fails.

11. **R1 — NEW, blocks: successful row append can precede a failed page.** `scripts/citizen-wake.js:306-315,507-518` queues the chosen role and records `queued`, then `ensurePagePointer_` can fail before any page or owed receipt. On the next wake, the question is asked again; `:292-295` marks the second answer `held` because the first row exists, but `:511-544` still writes the second reflection and spends the owed mark. Input: first answer Scout, pointer failure, second answer College Coach → intake applies Scout while the page records College Coach. The move ID is cycle/pop/date (`lib/nextChapter.js:172-179`), so a same-day retry also makes last-line-wins report `held` over the already queued move. A page-append error after pending receipt can instead spend the mark without a confirmed page (`lib/wakePerception.js:1145-1168,1188-1193`). Reconcile the queued answer with its page/receipt before accepting a new answer.

12. **R2 — NEW, should-fix: move-ledger failure is swallowed.** The fold's catch in `scripts/citizen-wake.js:260-265` logs an `appendMoveLine` failure and returns success to callers. A queued Sheet row then proceeds as `queued` (`:306-315`) and can spend the owed receipt (`:529-544`) with no durable move-ledger line; a declined/refused answer likewise leaves no status line (`:270-278`). Propagate the failed write or provide a durable repair path before treating the move as recorded.

The new title aliases are bounded to exact slash halves and parenthetical-free titles (`lib/nextChapter.js:39-48`); `analyst` alone is not accepted. Source review does not verify bench, deployed code, live Sheet values, or a live wake.

HOLD

---
**Disposition (research-build, 2026-11-08, round cap reached — TERMINAL §Review 4):** F1 narrowed → fixed in place: Youth Academy Director's gate is 4 (the plan's own "own academy at any tier"; the builder decides who is asked, so a Tier-4 citizen asked about an academy is its owner). F2 → recorded, not changed: the dashboard's sports workspace is the builder's authoring surface for the very row he typed; no desk, cron or citizen reads it (the beats dump, the world summary and the wake slice are patched). R1 → fixed in place: `answeredFor` over the Cycle's move ledger — a citizen already answered (queued / declined, last line wins) is not asked again; the landed row stands. R1's second half (pending receipt counted as spent after a failed page) is pipeline.93's ruling, recorded. R2 → fixed in place: the ledger line lands first and is read back; a failed ledger write files no row and exits before the page and the receipt. Node files only — the stage 44 bench of the six engine files stands. Plan `docs/plans/2026-11-07-former-player-next-chapter.md` §Reviews reconciled.
