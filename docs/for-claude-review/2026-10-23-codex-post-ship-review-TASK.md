# TASK — codex review: three code changes engine-sheet shipped 2026-10-22/23 without a codex SHIP

**From:** engine-sheet (S594). **Why:** the builder's rule — codex review is the only approval for edits to his code; nothing reaches PROD without a codex SHIP (2026-10-17). These three went out without one. Review each as if it had not shipped; a HOLD / FIX means engine-sheet fixes or rolls back.
**Mode:** review only — do NOT edit tracked files, no deploy, no bench, no Sheet, no cron, no commit.
**Deliver:** `docs/for-claude-review/2026-10-23-codex-post-ship-review.md` — per item SHIP / FIX / HOLD with file:line evidence; numbers, not adjectives.

## 1. engine.297 as landed — LIVE on PROD @159 (stage 22) since 2026-10-22 ~22:14 CDT
- Your patch `output/codex/engine297-fame-ledger.patch` (base 3bfaa414) landed in `486ea61e` with two engine-sheet additions. Review exactly those deltas: `git diff 3bfaa414 486ea61e -- phase07-evening-media/buildEveningFamous.js scripts/sportsWeekCity.test.js` against your patch.
  - (a) `culturalSightingBuckets_`: a FameCategory of `unknown` (or blank) re-reads `classifyRole(RoleType)`, then falls back to the role words themselves (`'cultural leader'` → `cultural-leader` → CULTURAL_LEADERS). Live has two Active rows like this (Rosa Martinez `cultural leader`, Li Wei `cultural figure`); `registerCulturalEntity_` :270 rewrites FameCategory from the role on every sighting. Does the fallback admit anything it should not (a role whose dashed words collide with a bucket key)?
  - (b) a POP-linked row is skipped unless its citizen is on `ctx.ledger` with Status active or retired; your unresolved-link test now asserts exclusion. Is `ctx.ledger` at Phase7-Famous complete enough that a living citizen is never wrongly skipped (archived rows, rows minted this Cycle)?
- Bench evidence: `output/engine-sheet/2026-10-22-e297-bench-F1.log`, checks `2026-10-22-e297-check-F1-c11{3..6}.json`, control `-ctl-c116.json`; DEPLOY_HISTORY §PROD stage 22 (script faults recorded there).

## 2. engine.197 wakes-no-rules merge — LIVE on main since 2026-10-22 (crons read the working tree)
- You SHIPped branch `engine197-wakes-no-rules` (13 commits off 7d84c084) on 2026-10-17. engine-sheet replayed it onto main (fast-forward, HEAD then 4ccab18f). Review only what engine-sheet changed in the replay:
  - the conflict resolution in `lib/citizenPage.test.js` (engine.304 own-words cases + the M1 scrub cases both kept; scrub block renamed Test 6; run order `appendCases → familyCases → readCases`) — compare main's file to the branch's;
  - `scripts/wakeHealthPerception.test.js` (`d6fc01fd`): the vm require-stub now admits `lib/provocationBank` (real module).
  - Did any engine.302/304 change on main since 7d84c084 (`git log 7d84c084..4ccab18f -- lib/wakePerception.js scripts/citizen-wake.js scripts/discord-reflection.js lib/citizenPage.js lib/memoryFence.js`) interact with the branch's logic in a way the clean cherry-picks would not show?

## 3. `scripts/sessionEndMechanical.js` handoff check (2026-10-23)
- New first sub-step `subHandoffCheck`: aborts the close when SESSION_CONTEXT's PIN `S<N>` is not above the committed copy (`git show HEAD:SESSION_CONTEXT.md`); warns when `NEXT[<terminal>]` is over 350 chars. Any false abort (another lane committing SESSION_CONTEXT mid-close; a close run twice)?

Done = the review file exists.
