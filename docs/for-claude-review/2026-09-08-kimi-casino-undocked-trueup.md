---
title: Casino 4b live-state audit + Undocked show pipeline findings — research
created: 2026-09-08
updated: 2026-09-08
type: reference
tags: [research, engine, citizens, media, active]
sources:
  - output/beats/Casino_Ledger.jsonl + output/beats/meta.json (C106 full-tab dump, scripts/dumpBeatTabs.js:47 — no row filter)
  - output/beats/Household_Ledger.jsonl (712 rows at C106)
  - phase05-citizens/casinoLedgerEngine.js (live 4b engine port, read 2026-09-08)
  - scripts/cron-undocked-run.js, scripts/undockedEpisode.js, scripts/undockedStandings.js, scripts/undockedDraw.js (read 2026-09-08)
  - output/spacemolt-show/ (draws, episodes, staged, feed, recaps — C106 state)
  - crontab (live): only the daily 20:30 cron-undocked-run job exists for the show
pointers:
  - "[[../plans/2026-08-07-spacemolt-game-show]] — owning plan; its Post-ship open items (a)–(e) are this file's action list in short form"
  - "[[2026-08-29-casino-ledger]] — casino 4b constraint record; its Shipped status note + open items are the casino-side half"
  - "[[2026-07-27-spacemolt-citizen-agency-cultural-phenomenon]] — origin research: wagering was conceived against validated SpaceMolt outcomes; the show is the casino's original subject"
  - "[[../archive/plans/2026-08-31-grok-casino-ledger]] + [[../archive/plans/2026-08-31-grok-casino-ledger-build]] — the shipped design/build this audits"
---

# Casino 4b live-state audit + Undocked show pipeline findings — research

**Source:** Internal code/runtime/live-dump audit, 2026-09-08 (kimi, builder-directed lane review). No external source. Trigger: the kimi lane's two standing items (casino-ledger watch; Undocked review/enhancement offer) were audited end-to-end against C106 live state, and the builder then issued two rulings (per-cycle cast reseed; fame-loop target) and greenlit the runner/mission fixes.

**What this addresses:** The casino shipped 2026-09-01 (S410, `d1220bfa`) and has now run through C106. This is the first post-ship audit: what the ledger actually contains, which of the shipped mechanisms are live vs dark, and what the show pipeline does today vs what the builder says it should do. Every claim below carries a verified file:line pointer.

**What it does:** Audits five surfaces — wager tab contents, household linkage, show-market placement, cast rotation, runner behavior — and pairs each finding with a recommended remedy and its owning scope.

## Findings (verified 2026-09-08)

1. **Casino live at C106, sports-only.** `output/beats/Casino_Ledger.jsonl`: HOUSE float 250000 + 12 open slips, all CyclePlaced=106, all `sports:as` / `next-as`, odds 1.83, stakes 134–667, per-slip Seed recorded, zero settled rows. The beats dump only started at C106 (meta.json `prevCycle: null`, pipeline.68 Task 1), so pre-C106 placement history is not locally observable. **Settlement has never been proven live** — first proof expected C107+ (an A's result must land in the sports feed).
2. **Empty HouseholdId on 4 slips is by design, not a defect** (builder-confirmed rule: household-having is life progression). POP-00214/00645/00656 each held a single-person household dissolved at C101 (Household_Ledger: 465 active / 247 dissolved, 137 dissolved@C101); POP-00806 has no household row at all. The engine reads HouseholdId from the Simulation_Ledger row (`casinoLedgerEngine.js:749`) and guards household writes on truthiness (`:606`) — household-less citizens wager solo against their own NetWorth/DebtLevel. No broken code.
3. **The undocked wagering market is structurally dead (off-by-one).** Placement requires `casinoUpcoming_` rows with `TargetCycle === fireCycle+1` (`casinoLedgerEngine.js:341`; the placement block's own comment: "Placement against NEXT cycle only — this cycle's outcomes are already known", `:666-667`). But the nightly orchestrator reads currentCycle and only then pushes `TargetCycle = currentCycle+1` (`scripts/cron-undocked-run.js:104-107, 149-152`) — always AFTER the fire that set currentCycle. At fire N every feed row has TargetCycle ≤ N → `upcoming` is always empty → `showOn` false (`:667`) → no show wager can ever be placed. C106 evidence: 12/12 slips sports (at ~50/50 pick odds against a live show market, 0/12 ≈ 2.4e-4). **The casino's original subject (the show — research 2026-07-27) is dark while its side market (sports) runs.** The VOID path is healthy: today's episode aired with CreditsDelta null (`credits_delta_windowed`) and resolves VOID_GATE by design (`casinoLedgerEngine.js:187`).
4. **Cast is static by construction; builder re-ruled to per-cycle reseed.** The orchestrator loads only the latest draw manifest (`cron-undocked-run.js:42-50`) — draw-1 (2026-08-16, manifest cycle 103): Clarissa Dane POP-00143 / Marcus Walker POP-00962 / Merkin Jumper POP-00688 — and rotates fewest-flights-first within it (`:59-78`). No redraw is scheduled anywhere (crontab has only the 20:30 flight). **Mike-direct 2026-09-08: the draw re-seeds every cycle run, 3 new citizens per cycle; `Undocked_Standings` is the cross-cast continuity layer.** This supersedes the 2026-08-15 persistent-cast model — recorded as an explicit re-decision in the plan, not a silent edit.
5. **Runner had no completion signal — FIXED this session (kimi, `3c481586`).** Episode 2026-09-08: the pilot finished its mission honestly, ignored "dock and stop", and burned 6 more minutes to the wall-clock cap (46 turns, 9 wrong-shape tool errors). Shipped: `scripts/undockedEpisode.js` stream-scans for the end condition (successful `captains_log_add` while docked, either order) → graceful SIGINT after a 20s settle; cap stays backstop; sidecar gains `completedCleanly` and `capped` now means the cap fired. Mission briefs gained an exact-command cheatsheet + hard-stop line. Tests: `scripts/undockedEpisode.test.js` (12 checks); replayed against the real log, completion fires at tick 23, six minutes before the cap. Tonight's 20:30 flight is the first live exercise — check tomorrow's sidecar for `completedCleanly: true`.
6. **Fame loop is accumulated but never promoted.** `scripts/undockedStandings.js` recomputes `Undocked_Standings` nightly (step 7 of the orchestrator) — rank, cycles-led, streaks — but nothing reads it for mobility: "NOTHING promotes on these numbers yet" (plan §2.4 build split). **Mike-restated 2026-09-08 target:** the top-ranked contestant should reach A's-player fame — Nia Rook's coverage pushes Citizen_Media_Usage on strong performers, and performance should make more events and crons aware of contestants.

## Recommended course of action (proposed, in dependency order)

1. **Fix the show-market off-by-one (engine-sheet decision + change; the casino's raison d'être).** Recommend the **pre-announce** option over prediction-on-current-cycle: the orchestrator (or the draw/schedule step) publishes next-cycle episode rows to `Undocked_Feed` with `TargetCycle = N+1` BEFORE the fire at N — a scheduled-flight announcement, which is also better show texture (the city knows who's flying tonight and can bet before the outcome exists). This preserves the engine's sound invariant ("never place against known outcomes") and requires no change to settlement timing: slips placed at fire N settle at fire N+1 when the aired rows land. The alternative (placing against the current-cycle feed as prediction markets) breaks that invariant and muddies what a slip means. Note the feed-contract consequence: announcement rows carry no outcomes yet — adapter/gate contract needs a scheduled/announced row shape, and `casinoUpcoming_`/standings/beat consumers must not treat them as aired results. Wiring card run attempted twice this session; both OpenRouter in-flight budget 402s (fleet spend, Retry-After 120) — retry when budget settles and attach to the implementing plan.
2. **Build the per-cycle reseed wiring (research-build apparatus; 3 parts, ordered):** (i) **account minting first** — the runner preflight refuses pilots without pre-seeded credentials and the orchestrator names this "succession wiring not done"; without it every other piece dead-ends; (ii) **mission-brief generation** — template from ledger fields (name/age/role/neighborhood) replacing the three hand-written statics; (iii) **orchestrator draw step** — re-run `undockedDraw.js` when the flown cycle advances, ahead of pilot pick. Until all three land, draw-1's cast keeps flying (current behavior is safe, just static).
3. **Settlement-proof watch (any lane, cheap).** At C107+: confirm open sports slips settle (WIN/LOSS, CycleSettled, HouseFloatAfter moving off 250000), VOID handling on any null-credits episodes, and that no slip settles twice across re-runs. The beats dump now makes this a one-command check.
4. **Fame/mobility daylight design (engine-sheet, its own design doc per plan §2.4).** The builder's target is now recorded: standings → coverage (Nia Rook) → Citizen_Media_Usage → awareness across events/crons, top contestant at A's-player tier. Not a weekend item; design it against the tier-mobility doc (`docs/engine/TIER_MOBILITY`) rather than bolting promotion onto the standings script.
5. **Household linkage: no action.** Verified by design; the casino research record carries the confirmation so future auditors don't re-chase it.

## Not applicable / hazard

- **The off-by-one fix touches the feed contract.** Announcement rows in `Undocked_Feed` are a contract change with downstream readers (standings recompute, beats dump, `casinoUpcoming_`, any media consumer). Do not slip it in as a one-line orchestrator tweak — it needs the contract review the show's own gate doctrine requires.
- **Do not "fix" the empty HouseholdId slips.** They are correct rows; backfilling household IDs for dissolved/never-formed households would fabricate linkage.
- **Reseed changes show economics.** 3 new citizens per cycle means the cast alternates/eligibility filter run constantly; account minting must stay inside the pre-minted-credentials rule (the runner must never self-register — verify-001 failure mode).
- **Pre-existing dirty tree files are not from this audit:** `phase05-citizens/generationalWealthEngine.js` and `scripts/hoodIncome.test.js` were already modified at session start (someone's in-progress work); the C106 production churn in `output/` is live automation. Left untouched.
- **Open adjacent gap:** G-EC9 (`output/production_log_run_cycle_c106_gaps.md:63`) flags a `PopID`/`POPID` case-mismatch in `runYouthEngine.js` touching `Casino_Ledger:'POPID'` — mechanical, MED, open, engine-sheet's list.

**Verdict:** `adopt` — items 1 and 2 are ready for a plan (1 = engine-sheet, 2 = research-build; they share the orchestrator, so a two-track triage may fit per rollout-rules §2); items 3 is a scheduled watch, 4 needs its own design doc, 5 is closed. No ROLLOUT row proposed from this lane — pending-state belongs to the owning plan's open items, already updated.

**Ignited plans:** none directly — recommendations land on [[../plans/2026-08-07-spacemolt-game-show]] post-ship open items (a)–(e), updated 2026-09-08.

---

## Applications (living)

- 2026-09-08 — Filed to the Claude review inbox as the audit behind the plan's post-ship open items; session work shipped as `d8659e85` (doc true-up), `3c481586` (runner completion detection + mission cheatsheets), `5e272f4d` (plan rulings recorded).

---

## Changelog

- 2026-09-08 (kimi) — Initial audit (S437+), builder-directed lane review of casino 4b live state + Undocked pipeline.
