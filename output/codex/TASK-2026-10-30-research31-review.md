# TASK — review research.31 (engine-sheet, 2026-10-30)

Adversarial review of commit `d583d421` plus the uncommitted `scripts/undockedStandings.js` + `scripts/undockedStandings.test.js` (held — see below). One review round, one re-review, then engine-sheet decides.

## Builder rulings this implements (2026-10-30)
- UNDOCKED board ranks the game's own achievement points first, credits alongside and as tie-break ("C").
- Night window 20 minutes (was 10).
- Your 2026-10-29 agency proposal §1–2 approved: brief gives the show, the board rule and the window, then lets the pilot play; the log is not a stop token. Not taken: editing the commander clone (clean upstream v0.4.0, untracked in this repo).

## What to hunt
1. `scripts/undockedEpisodeAdapter.js` — `derivePoints` attribution: an unlock belongs to the pilot's latest night with `startedAt <= earned_at` (`until` = that pilot's next night's start). Is there an input where points land on the wrong night, double-count, or a measured 0 should be unknown? `planPointsRescore` / `applyPointsRescore`: tab-then-disk order, `changed` filter, applied-only tab writes. `--recent N` scope.
2. `scripts/undockedShowGate.js` `ensureFeedHeader` — the push is positional (`appendRows` in `TAB_HEADERS` order). Any header state where a value lands under the wrong column?
3. `scripts/undockedEpisode.js` — new stop rule (idle turns or window). Any path where a flight that is still playing gets cut, or a dead flight runs the full 20 minutes?
4. `scripts/undockedMissionBrief.js` `UNDOCKED-BRIEF/4` — does any line still coach strategy (route, risk, what to do)? Does it still pass the runner preflight (`/never.*(register|login)/`, `/refuel/`)?
5. Held: `scripts/undockedStandings.js` ranks PointsTotal → CreditsTotal → POPID, CyclesLed replay on the same order. It lands only after the past-night back-score is applied (otherwise veterans read 0 and tonight's pilot leads).
6. Readers not yet updated, by design for a second commit: phase02 `loadUndockedFeed_` `S.undockedBoard` (credits leader → `$LEADER` slot), `buildNiaSlice.standingsNote`, `cron-saturday-run.js:1187`, `docs/media/NIA_ROOK_UNDOCKED_BAG.md` §What the show is, three live Event_Content_Ledger objective lines. Flag any other reader of the board or `CreditsTotal` / `completedCleanly` / `stall` that this commit breaks.

## Evidence on disk
- Back-score dry run (read-only, 2026-10-30): `node scripts/undockedEpisodeAdapter.js --rescore-points` — needs pilot credentials and a network call; do NOT run it. Its result: 24 accounts, each pilot's attributed nights sum to the account's game total, 0 unplaced (Taveras 20 = First Steps 5 + Maiden Jump 5 + Wanderer 10).
- Runs: `output/spacemolt-show/staged/archive/`, `output/spacemolt-show/episodes/`.

## Scope
Read-only plus your review file. No game-server call, no sheet read/write, no cron edit, no deploy. Write to `docs/for-claude-review/2026-10-30-codex-research31-review.md` (file:line + input → wrong output per finding; verdict SHIP / SHIP-WITH-FIXES / HOLD), commit it alone.
