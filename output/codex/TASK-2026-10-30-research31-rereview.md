# TASK — re-review research.31 (engine-sheet, 2026-10-30) — LAST ROUND

Round 2 of 2 (round cap: one review + one re-review, then engine-sheet decides). Your round 1: `docs/for-claude-review/2026-10-30-codex-research31-review.md` (HOLD, F1–F8).

## What changed since round 1
- `fde41a8e` — your F1–F5, F7, F8 folded; the board flip landed; the back-score applied live (Mike's go 2026-10-30, "Eric Taveras should not lose what he was awarded").
- `308e91d4` — the three Event_Content_Ledger objective lines retagged (live R825–R827, read back).
- `59e4ce18` — F6, the engine half: `phase02-world-state/loadEventContentLedger.js` `loadUndockedFeed_` (`S.undockedBoard` points → credits → POPID; airing entries carry `pointsDelta`) and `phase05-citizens/casinoLedgerEngine.js` `casinoNightWinner_` (the night goes to points, then credits, then POPID; no points and no credits gained crowns nobody). `scripts/casinoLedger.js` mirrors it.

## Fold map (verify each against the code, not this table)
| F | Where | Claim to check |
|---|---|---|
| F1 | `undockedEpisodeAdapter.js` `samePoints`, `planPointsRescore` (`stale`), `applyPointsRescore` | every copy compared (tab, archive, intake + FeedEvent, feed pack); only stale copies written; a fresh re-plan + tab re-read after apply; mismatch → exit 1 |
| F2 | `accountFrom`, `derivePoints` | invalid points / earned_at or a summary mismatch → account unusable → nights unknown, back-score skips the account; unreadable window → unknown |
| F3 | `undockedShowGate.js` `ensureFeedHeader` | byte-exact, no trim; grid widened by `appendDimension` only on a grid-limit error (the live grid was exactly 12 columns) |
| F4 | `undockedEpisode.js` `IDLE_TURNS` 15 | `undockedEpisode.test.js` replays all 69 saved flights; fails at 8 (Jumper 09-03, Lopez 09-28) |
| F5 | `undockedEpisode.js` `parseArgs` | default = brief `WINDOW_MINUTES`; non-positive / NaN refused |
| F6 | `59e4ce18` | above |
| F7 | `derivePoints`, `undockedStandings.js` `PointsPending` | a read account gives a measured value whether or not the pilot moved (design change: the no-gameplay → unknown rule is gone); blank = account not read; sidecar-only pending count |
| F8 | adapter CLI `--recent` | positive finite or exit 2; scope printed |

Also: `undockedStandings.js` `POINTS_FROM_CYCLE = 114` — cycles aired before C114 keep the credits-board leader they were awarded; from C114 the leader is the points board's. `undockedStandings.js` `writeGrown` (the standings grid was 11 wide).

## What to hunt
1. Each fold: does it close the failure you named, or move it? New silent paths?
2. F7 design change: any input where a read account now yields a wrong measured 0 (e.g. a night whose window is wrong, an account that acted outside the show)?
3. Engine parity: does `loadUndockedFeed_`'s leader equal `undockedStandings.js`'s Rank 1 for every input (blank cells, a pilot with only blanks, ties, a tab without PointsDelta)? Any reader of `S.undockedBoard` that breaks (`totals` now holds every aired pilot)?
4. `casinoNightWinner_`: any feed where the night bet and the board disagree in a way the ruling does not intend; any change to `credits_sign` / `mishap` (there should be none).
5. Bench evidence (below): does it prove what it claims? Is the bench-only +15 points on one row a fair discriminator?

## Evidence on disk
- Back-score: `fde41a8e` message; Undocked_Feed M 69/69 filled, sum 200 = the 24 accounts' game totals.
- Bench (done, `8285a9d3`; DEPLOY_HISTORY §Current sandbox top entry): all four fires PASS, EE 4 → 4; `$LEADER` 11 + 3 lines name Taveras on A, the same lines name Dane on B; night-113 settled on `undocked-pop00775-Y3C8` on B (the A receipt has no night entry: the first check filter missed settled slips, fixed before B's re-read); no night slip was placed at C113, so C114's night is unit-proven only. Files: `output/engine-sheet/2026-10-30-r31-bench.log`, `output/engine-sheet/2026-10-30-r31-check-A.json` (stage 31 = PROD @167), `…-check-B.json` (stage 32 = candidate, manifest `output/engine-sheet/stage32-r31.sha256`); scripts `2026-10-30-push-r31-bench.sh`, `2026-10-30-r31-bench.sh`, `2026-10-30-r31-feed.js`, `2026-10-30-r31-check.js`.

## Scope
Read-only plus your review file. No game-server call, no sheet read/write, no cron edit, no deploy. Wiring card for `S.undockedBoard` per AGENTS.md (Haiku). Write to `docs/for-claude-review/2026-10-30-codex-research31-rereview.md` (file:line + input → wrong output per finding; verdict SHIP / SHIP-WITH-FIXES / HOLD), commit it alone.
