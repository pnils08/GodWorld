# Codex re-review brief — engine.338b fold, deploy candidate `86174e9db` (research-build, 2026-11-08)

Second and last round (TERMINAL.md §Review: one review, one re-review). Read-only. Write to
`docs/for-claude-review/2026-11-08-codex-engine338b-diff-rereview.md`, under 100 lines: per finding F1–F10 of your review
(`docs/for-claude-review/2026-11-08-codex-engine338b-diff-review.md`) say closed / open / new concern with file:line; add any
NEW finding the fold introduced (R1…); end SHIP / HOLD.

## The fold (one commit)

`git show 86174e9db --stat` and `git diff 506ca6b28 86174e9db -- lib phase05-citizens scripts/citizen-wake.js scripts/buildWorldSummary.js scripts/dumpBeatTabs.js scripts/preflightInputCheck.js scripts/intakeExistingRowDoor.test.js scripts/nextChapter.test.js`

What moved, by finding:
- F1 `lib/nextChapter.js` POOL `tierGate` + `rolesFor(tier)`; `questionFrame(q, tier)`; `parseMove(reply, tier)` refuses `tier-gated(...)`; `scripts/citizen-wake.js` passes `c.record.tier` (the pool row's Tier, `lib/wakePerception.js buildPool`).
- F2 `lib/feedPrivacy.js` (new) `isPrivateFeedRow` / `publicFeedRows`; applied in `scripts/dumpBeatTabs.js` (the beats dump — every desk slice reads it), `scripts/buildWorldSummary.js` (the sheet read), `lib/wakePerception.js loadSportsSlice`; `scripts/preflightInputCheck.js` exempts TeamsUsed on a question row.
- F3 `processAdvancementIntake.js bumpPendingCellIntent_` — scans `ctx.persist.updates` for a pending cell intent on (Business_Ledger, row, col); found → `pending + 1`, else queue tab+1.
- F5 `leftGame` → the key is recomputed on a GAME exit with the role unchanged.
- F6 `educationCareerEngine.js catalogRoleKey_` — trainee tables first, then the exact catalog title.
- F7 `scripts/citizen-wake.js` step 2a: `fileNextChapter` runs before `ensurePagePointer_`; `{status:'held', retry:true}` on a read / append failure → `process.exit(1)` before the page and the receipt; `appendMoveLine` guarded.
- F8 `parseMove` strips every `MOVE:` line.
- F9 the pre-pass `continue`s on an existing name whose row carries MatchPopId / MatchName / HouseholdKey / OwnerOfBizId.
- F10 the test prices `Junior Accountant` deterministically and asserts the line.
- F4 recorded, not changed (plan §Reviews reconciled): the new business grows, the old does not shrink; stated above tracked is legal.
- Bench finding: `ROLE_ALIASES` — each half of a slashed title and a title without its parenthetical name the full title (11 keys, pinned by test); the frame says "copy one title exactly as written".

## Check against the code

1. F3: `bumpPendingCellIntent_` mutates the FIRST matching intent found scanning from the end. Career's write-back and an earlier re-home in the batch are both 'cell' intents on the same address — is there any other writer of that cell with a different `kind` (a range intent spanning Employee_Count, `applyBusinessDynamics_` writes Annual_Revenue..Growth_Rate — does its range include Employee_Count?) that would still land after and erase both? Read `phase05-citizens/applyBusinessDynamics.js` range bounds and `persistenceExecutor.js` order (cells before ranges?).
2. F7: with the row filed before the page, a page failure after a successful append exits 1 with the row landed and the receipt unspent — the next wake asks again, `hasQueuedRow` holds the second answer as `row-already-queued`, the page then lands. Is anything written twice (two ledger lines for one answer — intended as status lines?) and does the owed receipt spend on that second wake?
3. F2: is any remaining Node reader of the feed's Notes outside the three patched points AND outside the beats dump — `lib/personaProvider.js`, `lib/discordLookups.js`, `scripts/cron-work-wake.js`, the dashboard (`dashboard/`) — reading the sheet directly rather than `output/beats/`? (The brief's own grep: they read the beats; confirm the dashboard.)
4. F1: `c.record.tier` is the raw cell (string or number); `rolesFor` folds `Number()`; a Tier of `'1'` → 1. `questionFrame` for a Tier offered nothing says `role=<none …>` — does `parseMove` then accept `none` and refuse everything else for that Tier (yes by construction — confirm no path files a row for a Tier-4 citizen)?
5. F5/F6 interplay: a GAME → ENGINE exit on a row whose RoleType is a trainee title keys to the trained profile — intended. A GAME exit where the role has no key → '' (the money loop's fallback fills Income only when blank/0 — his Income stands). Any reader that treats a blank key + ENGINE clock as "unseeded, re-roll" other than the fill-only path (`generationalWealthEngine.js:649-660`)?
6. The alias list: 'instructor' → Club Coach / Instructor; 'sports analyst' → Front Office. Any alias that is ALSO a substring the voice model would plausibly emit for a different intent (e.g. `role=analyst`)? (`analyst` alone is not a key — confirm.)

Not in scope: Task 2a (live), the `applied` ledger stamp (plan Open questions), the bench results (DEPLOY_HISTORY §Current sandbox; the fold is benching as stage 44 now).
