# Brief — engine.333 Task 2a: retirement joins the owed-wake reserve (diff review)

**From:** research-build · **To:** codex-rb · **Date:** 2026-11-07
**Plan:** `docs/plans/2026-11-05-feed-triggers-to-life-history.md` §Design 6, Task 2a
**Diff under review:** commit `c76571cd7` — `lib/wakePerception.js`, `lib/wakePerception.test.js`, `scripts/wakeOwedMilestone.test.js` (the other three files are docs/log).
**Reply file:** `docs/for-claude-review/2026-11-07-codex-engine333-owed-milestone.md`

## What landed

Builder ruling 2026-11-07: "retirement should join the reserve." pipeline.93's owed-wake reserve (`owedFrom`, `OWED_TABS`) reads a fifth tab, LifeHistory_Log: a bare `Retirement` EventTag in the two-Cycle window → owed entry `{ id: 'milestone:retirement:<pop>:c<N>', kind: 'milestone', tier: 1, pin: { stamp: simTag(N), stamps: [simTag(N), 'C'+N], re: /^\[Retirement\]/ } }`. `pinMatches` now accepts `pin.stamps[]` (falls back to `pin.stamp`), because the engine's `applyMilestone_` (`generationalEventsEngine.js:1762`) stamps the ledger line `C<n>` while the log row and every other writer stamp `Y<y>C<c>` (C114 gap G-RB5). This is Node cron code — live for the crons from the commit; not in the clasp push.

Proof so far: `node scripts/wakeOwedMilestone.test.js` (9 checks), `node scripts/run-tests.js` 321/321, and a live dry replay (`citizen-wake.js --dry-run --cycle=114`) that reserved POP-00366 (retired C113, line `C113 — [Retirement] …`) and woke on `route=self event=retirement`.

## Claims to attack (source-only; run the two test files if you like — no Sheets, no network)

1. **No change to the other four classes.** For a pin without `stamps`, `pinMatches` behaves exactly as before (same head check, same body slice). Check the `stamp.length + 3` slice against the old `head.length`.
2. **Absorption contract.** With LifeHistory_Log in `OWED_TABS`, a failed or column-less read of it joins `unknownTabs` and (per `citizen-wake.js:290-292`, everything but Chaos_Cars) holds tier-2 absorption that wake. Intended and accepted in the plan — say if you see a way it changes a wake that previously ran, beyond that hold.
3. **Dedup and identity.** Two log rows for one retirement in one Cycle (two writers, either casing) → one owed id; the id is stable across wakes so the receipts journal (`owedStateFrom`) spends it once. Is there a path where the same retirement owes twice across the window (Cycle N and N+1 rows)? Note the id carries the row's own Cycle.
4. **Pin reach.** `owedCandidates` needs the `[Retirement]` line in `p.lifeLines` (the ledger's full LifeHistory split). A citizen whose LifeHistory was trimmed/compacted so the line is gone is `unshowable` and reported, not reserved — the existing contract for every pinned class. Confirm nothing else (e.g. `lifeTailOf` pinning at `:443`) breaks on a multi-stamp pin.
5. **Sort order.** Milestones are tier 1 beside beds, arrests, big casino, high chaos; within tier 1 the sort is `eventMag` desc then newest. Retirement's dial mag is 8 (`citizenDialMap` family +4, drive −4), so a retiree can outrank a bed. Plan accepts this; flag if you think the reserve of 6 can be starved by milestones (the live log holds 1 `Retirement` row in the current window).
6. **Scope creep check.** The source also owes the engine's senior retirements (`generationalEventsEngine.js:1350`, same bare tag) — within the builder's words ("retirement should join the reserve"), recorded in the plan. Say if you read the ruling narrower.

Verdict format: per claim, holds / breaks (with file:line), plus anything outside the six. No code changes from codex.
