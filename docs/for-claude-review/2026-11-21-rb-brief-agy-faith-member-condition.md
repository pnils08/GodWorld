# Brief for agy — adversarial plan review: engine.350 Task 16, faith rows reach the congregation

**From:** research-build · **Date:** 2026-11-21 · **Your output:** `output/antigravity/2026-11-21-review-e350-faith-member-condition.md` · read-only on code. Nothing is built; this is the plan, before the cut.

## The plan (read the code, not this summary)

`docs/plans/2026-11-16-every-saved-word-reaches-the-dials.md` §Task 16 (commit `eac2cd06e`).

## The builder's words (verbatim, 2026-11-21)

"Churches have congregations … it names who belongs"

## Attack these — each claim in §Task 16 against the code

1. Membership: `processFaithJoins_` (`phase05-citizens/bondEngine.js`) is the only writer of `Faith_Organizations.MembersList`; any other writer, reader or clearing path (migration, death, archive, `ensureFaithLedger.js`) the plan missed. A dead or archived member left on a list.
2. Order: `Phase5-CitizenEvents` before `Phase5-Bonds` at BOTH entry points of `godWorldEngine2.js`; any path where the generator runs with a stale or missing `ctx.ss`.
3. The cut: adding `member` (flag) and `congregation` (str) to `CONTENT_LEDGER_DSL_FIELDS` and `condScopes` — any other consumer of the DSL table or of compiled terms that must change in the same candidate (`contentSlotsFillable_`, `balanceContentLedgerPoolWeights_`, `scripts/undockedEclPool.engine.js`, the tab validators, tests that pin the field list).
4. Reach: 11 rows going from every adult to 17 members — the 40-draw row cap, pool balancing between signed up/down rows in `faith.attending` / `faith.volunteering`, a pool left with one side only for a member; whether `source:familyLife` on these rows still routes and folds as before.
5. The join path: confirm non-members' exposure (`faithPool_`, `source:faith`, `S.faithExposures`) is untouched by the cut.
6. Leaders (`LeaderPOPID`) not on `MembersList` — what the code does with them elsewhere.
7. The relative-rows paragraph: `ParentIds` / `ChildrenIds` — who writes them, whether the counts in the plan hold.

Each finding: file:line, the failure scenario, severity. Verify every claim against the code before you write it. Do not propose a different goal.
