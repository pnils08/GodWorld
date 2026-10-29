---
title: UNDOCKED brief v3 empty-belts adversarial review
created: 2026-10-29
updated: 2026-10-29
type: reference
tags: [research, active, reference]
sources:
  - output/codex/TASK-2026-10-29-undocked-brief-empty-belts.md
  - scripts/undockedMissionBrief.js
  - scripts/cron-undocked-run.js
  - output/spacemolt-show/episodes/undocked-pop00775-2026-10-26T01-30-05.log
  - output/spacemolt-show/staged/archive/undocked-pop00597-2026-10-16T01-30-04.json
pointers:
  - "[[plans/2026-08-07-spacemolt-game-show]] — owning plan and disputed 2026-10-29 changelog claim"
---

# Verdict: HOLD

Review target: commit `b1402ec3`, the `UNDOCKED-BRIEF/3` diff in `scripts/undockedMissionBrief.js` and three added checks in `scripts/undockedMissionBrief.test.js`. HOLD the brief and its plan explanation for correction before treating this as a proved scoring repair. The new instruction can reach a cron-selected pilot, but the cited high-scoring flight earned its credits **before** leaving Sol, and the new text conflicts with its own contract sequence. This is a source and saved-receipt review, not a game-server, Sheet, cron-flight, or deployment result.

## 1. Does the new instruction reach the pilot? SHIP for the cron path

- `scripts/undockedMissionBrief.js:38,68-70,114-115` replaces the home-space command and bumps the marker. The command reference already includes `find_route` and `jump` at lines 81 and 85. The three draw-1 static briefs on disk are unversioned, and several saved later briefs still say “Stay in home space” (for example `output/spacemolt-show/missions/undocked-pop00775.txt:16`). These are stale disk inputs, not a second active template.
- `scripts/cron-undocked-run.js:183-203,206-223,275-285` regenerates any selected pilot's brief whose first line differs from `UNDOCKED-BRIEF/3`, then passes that file to the episode runner. The runner checks only the register/login and refuel clauses (`scripts/undockedEpisode.js:73-91`); it imposes no home-space rule. A direct `undockedEpisode.js --mission-file` call bypasses `ensureBrief` (`scripts/undockedEpisode.js:82-90,186-191`), so the regeneration claim is specifically about the cron orchestrator. No current flight with a v3 file was inspected.

## 2. Can leaving Sol break the downstream path? FIX the claims and flight plan

- **Contract order is contradictory.** Step 1 says accept a contract while docked, before checking Sol's belts (`scripts/undockedMissionBrief.js:114-115`). The new rule then says to jump and “take your contract from its station” (`:70`), while the original completion rule says to return to the station that posted the accepted contract (`:61-62,117`). If the pilot accepted a Sol station supply contract first, the neighbor instruction does not say whether to abandon it, return to Sol to claim it, or start a second contract. An open contract scores nothing by the brief's own rule (`:62`). Choose the work site before accepting a new mining contract, or give an explicit compatible path for an already-active contract.
- **Feed location is a weak summary, not credit provenance.** `scripts/undockedEpisodeAdapter.js:42-45,216-225` chooses only the first system key in each action-log event. Eric's jump has `from_system=sol` and `to_system=sirius`, but the staged `systems_visited` is only `["sirius"]` (`output/spacemolt-show/staged/archive/undocked-pop00597-2026-10-16T01-30-04.json:63-68,239-253`). `scripts/undockedShowContract.js:78-97` carries that array to the feed; `scripts/undockedStandings.js:51-75,78-92` ranks credits without using Systems; `scripts/buildNiaSlice.js:187-216` prints Systems in Nia's angle. The existing adapter can therefore make an earned-in-Sol night read as Sirius-only to the newsroom. This is not evidence that Sirius produced the credits.
- **Travel does not change runner stops, but it uses the same clock.** Successful `jump` and `travel` calls reset the eight-turn idle counter (`scripts/undockedEpisode.js:129-153`); the captain's-log-plus-dock hard stop and ten-minute wall cap remain (`:197-230,243-249`; `scripts/cron-undocked-run.js:248,283-285`). The 2026-10-26 pilot spent roughly two minutes moving between the three belts after the first zero reading (`output/spacemolt-show/episodes/undocked-pop00775-2026-10-26T01-30-05.log:88-103`). No receipt shows a v3 pilot can scout, jump, mine, return, and settle a contract within that cap. Ship loss still has the brief's starter-hull warning (`scripts/undockedMissionBrief.js:68`), but the adapter fetches no `ship` category despite listing it as an available category (`scripts/undockedEpisodeAdapter.js:25-32`); a ship-category loss is not guaranteed to reach `MishapCount` through the current extraction (`:261-274`, `scripts/undockedShowContract.js:83-96`). This is a pre-existing coverage limit, not a regression proved by this diff.

## 3. Are the plan's numbers and causal claims backed? FIX

- **Count confirmed:** Parsing the 29 `2026-10-*.log` episode files gives 20 with at least one `tool_error` whose command is `spacemolt/mine`; the 2026-10-13 and 2026-10-14 logs contain 18 and 13 successful mine calls respectively. This counts error *presence*, not 20 wholly failed flights. The plan's `20 of 29` statement is supported (`docs/plans/2026-08-07-spacemolt-game-show.md:328`).
- **Eric is a counterexample to the stated mechanism.** Feed c111 has `undocked-pop00597-Y3C7-e2`, 1,170 credits, Systems `["sirius"]` (`output/spacemolt-show/feed/c111.json:87-97`). The staged credit basis is three sales worth 6, 36, and 128 plus a 1,000-credit mission completion (`output/spacemolt-show/staged/archive/undocked-pop00597-2026-10-16T01-30-04.json:34-61`). The named mission is “Market Participation: Selling” and completed at 01:37:25 (`:191-208`); the Sol-to-Sirius jump is at 01:39:33 (`:239-253`). All 1,170 were earned before that jump. The plan's “which mission paid ... not verified” is also incorrect: the saved typed receipt names it. Leaving Sol did not cause this score.
- **Three zero readings do not prove no work in Sol.** The 2026-10-26 log says `remaining: 0` for Main Belt, Jovian Extraction Zone, and Kuiper Ice Fields (`output/spacemolt-show/episodes/undocked-pop00775-2026-10-26T01-30-05.log:88-97`). Later the saved action log records `mining.yield` of one Copper Ore at Main Belt in Sol (`output/spacemolt-show/staged/archive/undocked-pop00775-2026-10-26T01-30-05.json:99-113`). It also records a 30-credit Sol station sale (`:117-132`). That copper did not satisfy the iron contract, but it contradicts the absolute new assertions that a zero-reading belt “gives nothing” and Sol “has no work” (`scripts/undockedMissionBrief.js:69-70`). The asserted shared, finite belt mechanism remains unverified without game state. The local standings sidecar does show 17 of 24 pilots at 5 credits or below, but also six other pilots above 5 (`output/spacemolt-show/standings.json:19-101`); low aggregate scoring is real, and its sole cause is not established.

## 4. What do the tests prove? SHIP as text guards only

`node scripts/undockedMissionBrief.test.js` and `node scripts/cron-undocked-run.test.js` passed locally. The three new checks at `scripts/undockedMissionBrief.test.js:57-59` assert three string properties: `remaining 0` appears at least three times, the neighboring-system words occur, and the exact old “Stay in home space” sentence is absent. They do not check contract order, belt semantics, stale-file regeneration, pilot decisions, route feasibility, credit extraction, or a scored flight. The existing cron suite tests roster filtering and completion tracking (`scripts/cron-undocked-run.test.js:18-68`), not `ensureBrief` end to end. A passing suite cannot close the production proof gate.

## Gate to clear HOLD

Correct the plan's Eric timeline and replace the universal belt/scoring claim with the bounded observations. Reconcile the brief's contract selection and completion path with travel, and remove or qualify the zero-reading assertion. Then review the revised generated text and tests. A later authorized flight must separately show a v3 brief actually loaded, the pilot's route and contract result, typed credits in the feed, and the standings readback. No sheet, game-server, cron, or deployment action was taken in this review.
