# TASK — codex: plan review of engine.304 D11 (the dead keep their family), one round

Read-only; no cron, model, Sheet write, bench or canon run. Do not commit, do not push. Write to `docs/for-claude-review/2026-10-19-codex-engine304-d11-plan-review.md`, SHIP / FIX / HOLD per hunt, file:line evidence, under ~70 lines. Report in one line when done.

Plan: `docs/plans/2026-10-08-engine-286-game-of-life-events.md` — builder statement 13 (verbatim) and **D11** (just before the Changelog). The ruling is fixed; attack the mechanism.

1. **Death facts.** Every path that kills a citizen and what it leaves: ledger Status `deceased` until Phase 11, then `archiveCitizenExits_` (only when `citizenArchiveEnabled` is 1 — what if it is 0 on live?). Is `citizenArchiveLatestByPop_` safe to call from Phase 5 (cache on ctx, a Cycle where the archive tab is absent)? Any other exit reason that should count as dead?
2. **D11a/b — persistence.** The release test, the dead's spot test on a ledger-or-archive row, the draw staying Active-only. Anything in widowing (`generationalEventsEngine.js` death → spouse widowed) or engine.302 that changes the dead's MaritalStatus / SpouseId / ChildrenIds at or after death and would close or open a spot wrongly?
3. **D11c — arrival.** A new `wireFamilyToDeceased_` writing only the arriving row (widowed + SpouseId = the dead; child ParentIds; parent ChildrenIds). Is writing nothing to the dead row safe for every reader (heritage, inheritance, the wake's `livedEventsFrom` death path, citizen cards, Family_Relationships)? Household join rule. Any reader that treats a SpouseId / ParentIds pointing at an archived POPID as an error?
4. **D11d — households.** The dead-parent test in `formCriteriaHouseholds_` and the income pass (`householdFormationEngine.js:403,1246-1262`): every reader of the orphan/off-camera assumption; the reconciler; stress dissolution at 0 income (a child of two dead parents).
5. **Scope.** Anything past statement 13; anything on the do-not-touch list (divorce, widowing, custody, the 18th-year flip) this touches.

Done = the md exists.
