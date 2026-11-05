---
title: Sandbox Generic Feeds Plan
created: 2026-11-04
updated: 2026-11-05
type: plan
tags: [engine, sandbox, active]
sources:
  - docs/reference/DEPLOY.md §The bench runs cold (measured at bench C130)
  - phase02-world-state/applyEditionCoverageEffects.js
  - phase05-citizens/processAdvancementIntake.js
  - phase07-evening-media/mediaRoomIntake.js
  - phase02-world-state/applySportsSeason.js
  - Explore code map of the four feeds (es, 2026-11-04)
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — engine.330"
  - "[[../reference/DEPLOY]] — §The bench runs cold, §Groundhog proving loop, §Node scripts against the sandbox"
---

# Sandbox Generic Feeds Plan

**Builder's words (2026-11-04):** "so the goal here is when you run sandbox runs these all are missing in the runs for current entries , and given what you may be looking for these entries drive events and code behavior. so the idea is that when running a sandbox these should have generic entries so the sandbox isnt running missing some of the behavior" — on the three generic-row rules (ratings, media usage, sports): "yes thats fine with me, idk what seat work means"

**Goal:** a sandbox fire runs with current-Cycle rows in the ratings, media-usage and sports feeds, so the behavior those feeds drive runs as it does on live.

**Rows:** engine.330 · **Owner:** engine-sheet

## Feed facts

Code read 2026-11-04. Spot-checked by es: ratings Cycle filter, usage Processed gate, decay guard, sports Cycle filter + empty branch, business deviation. No reader of the four branches on sheet ID or environment.

| Feed | Row is read when | Drives | Empty feed | Live writer |
|---|---|---|---|---|
| `Edition_Coverage_Ratings` | Cycle = N or N-1, Processed not TRUE (`applyEditionCoverageEffects.js:80-87`); marked TRUE at `:368-379`. Also read for Cycles N-3..N-1 regardless of Processed by the story-seed coverage multiplier (`applyStorySeeds.js:199`, `priorityEngine.js:128-233`) | city sentiment boost, clamped ±0.20 then compounded with civic voice to ±0.25 (`applyEditionCoverageEffects.js:297-318`, read at `applyCityDynamics.js:1805`); six city metrics (`:1739-1747`); \|rating\|≥3 → media-feedback story seeds (`applyStorySeeds.js:1307-1320`); approval press term (`updateCivicApprovalRatings.js:523`); Tone column read (`applyEditionCoverageEffects.js:95`) | early return, boost 0; business engine compares 0 to the mean of the last six carried values → false dip (`applyBusinessDynamics.js:238-254`) | `scripts/rateEditionCoverage.js:620-712`, Cycle = the edition's, after publish (`cron-saturday-run.js:1648`) |
| `Citizen_Media_Usage` | no Cycle gate; Processed ≠ Y (`processAdvancementIntake.js:476`), Routed ≠ Y (`mediaRoomIntake.js:477`); every `byline-published` row ever counts toward earned citations (`processAdvancementIntake.js:1364-1393`) | UsageCount, fame, tiers at 3/6/9, Famous at 25, route to intake (Notes from Context via `describeUsageContext_`, `mediaRoomIntake.js:577-584`) | no data rows → return (`processAdvancementIntake.js:377`); `decayMediaAttention_` still fades a named citizen −1 UsageCount per Cycle once Cycle − last named > 10 | `cron-saturday-run.js:546-599`, `cron-desk-run.js:302-335`, `scripts/ingestPublishedEntities.js:965-1069`, `lib/citizenPage.js:87-135` (`family-own-words`, mid-week) |
| `Advancement_Intake1` | no Cycle column; every row with a First or Last, then cleared (`processAdvancementIntake.js:825`, `:1232`) | tier lift; mints a citizen from a new name | nothing runs | engine itself (`godWorldEngine2.js:1577`, emergence/family/owner promotions) plus hand rows and the media route (`mediaRoomIntake.js:507`) |
| `Oakland_Sports_Feed` | Cycle = N for the week (`applySportsSeason.js:237`); all prior rows feed the weekly history and trailing baselines (`:219-236`); re-read every fire, no Processed flag. WeekRecord must pair with EventType: games → `game-result`, `none` → `season-state`, else the week is dropped to Engine_Errors (`sportsWeekForEntry_`, `sportsWeekRecord.js:35-43`; `applySportsSeason.js:295-306`) | season state, sentiment boost, game-night LifeHistory lines (`applyGameNightMoments.js:171`; bucket from Streak and PlayerMood, mood first, `:64-72`), household pool (`runHouseholdEngine.js:408`), casino settlement on the first game result (`sportsWeekRecord.js`, `casinoLedgerEngine.js:154`); EventTrigger fires one-shot triggers (`applySportsSeason.js:1015`) | `off-season`, pools empty (`applySportsSeason.js:138-150`) | hand entry; dashboard append (`dashboard/sportsRoutes.js:1254-1258`) |

## Tasks

| # | Task | Owner | Status |
|---|------|-------|--------|
| 1 | Plan review: agy against the code; findings reconciled below before the build | es / agy | done — `output/antigravity/2026-11-05-review-engine330-sandbox-feeds.md`, folded (A7–A12) |
| 2 | `scripts/seedSandboxFeeds.js` shell + `scripts/seedSandboxFeeds.test.js`: `--sheet-id` must equal sandbox 1004 (allowlist of one; live, both baselines `BASELINE-1004-C112` / `-C112b` and anything else refused); `--cycle <N>` = the Cycle about to fire; dry-run default, `--apply`, `--check` (exits non-zero when the Cycle's rows are missing). Order: capture the live ID after `require('lib/env')`, read every live input, then set `process.env.GODWORLD_SHEET_ID` to the sandbox once, print it with the sheet title, read the sandbox tabs for the skip gates and the ledger, then append; never set back. Every row carries the marker `SANDBOX-GENERIC`. Verified by tests + a dry-run readback | es | built — `scripts/seedSandboxFeeds.js`, 39 tests pass, dry run on 1004 read back (C135: 6 ratings, 39 usage from live C113, Oaks game week 7-2, A's off-season) |
| 3 | Ratings rows: Cycle N-1, one per domain that had a row in at least 4 of the 8 highest distinct rated Cycles below N on live, Rating = median of those (half-points round toward zero), ArticleCount 1, Reporter `SANDBOX-GENERIC`, Tone by sign (`positive` / `negative` / `neutral`), Processed FALSE; a domain with a sandbox row for that Cycle is skipped. Verified by tests + rows read back | es | built — `scripts/seedSandboxFeeds.js`, 39 tests pass, dry run on 1004 read back (C135: 6 ratings, 39 usage from live C113, Oaks game week 7-2, A's off-season) |
| 4 | Media-usage rows: the byline rows (`byline-landed`, `byline-published`) of the latest live Cycle with `byline-published` rows (a whole week; live's in-progress week has landed rows only), Cycle N-1, Context `sandbox-generic_c<N-1>_<slug>-<k>` (k = row number in the batch), Reporter `SANDBOX-GENERIC`, Processed/Routed blank. CitizenName written as the ledger's `First Last` and only when exactly one sandbox ledger citizen matches under `normalizeCitizenName_`. Skipped when the sandbox already has byline rows at N-1. Verified by tests + rows read back | es | built — `scripts/seedSandboxFeeds.js`, 39 tests pass, dry run on 1004 read back (C135: 6 ratings, 39 usage from live C113, Oaks game week 7-2, A's off-season) |
| 5 | Sports rows: one per team (A's, Oaks), Cycle N, skipped when the sandbox has that team's row for N. SeasonType = the team's last live one. Game phase: EventType `game-result`, WeekRecord `H:W A:L`, Team Record = the last valid W-L on the team's live rows (W-L text or a Sheets date `M/D/YYYY`) + 1-1, Streak `L1`. `off-season`: EventType `season-state`, WeekRecord `none`, Team Record and Streak blank. Copied from the team's last live row: TeamsUsed, HomeNeighborhood, FanSentiment, FranchiseStability, EconomicFootprint, CommunityInvestment, MediaProfile. Blank: EventTrigger, PlayerMood, StoryAngle, Stats. NamesUsed: the team's latest live row with at least one living sandbox citizen, parsed as `parseNamesUsed_` does, kept to living matches. Notes `SANDBOX-GENERIC NON-CANON`. Verified by tests + rows read back | es | built — `scripts/seedSandboxFeeds.js`, 39 tests pass, dry run on 1004 read back (C135: 6 ratings, 39 usage from live C113, Oaks game week 7-2, A's off-season) |
| 6 | Intake: no rows written. Engine self-feeds it; the media route fills it once task 4 rows exist; authored citizens are not generated | es | done — the script writes no intake rows |
| 7 | `DEPLOY.md`: seed step added before **Fire** in §Groundhog proving loop; §The bench runs cold rewritten to match (drops "seat work", undefined in the repo) | es | done — §Groundhog proving loop step 3b, §The bench runs cold rewritten |
| 8 | Sandbox proof on sandbox 1004 (`1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA`, the `BENCH` constant in `output/engine-sheet/` scripts; dry-run prints the title to confirm): confirm research-build holds no sandbox proof in flight → resync from live → cold control fire (no seed) → seed → fire. Compare per Acceptance 3 | es | done — `output/engine-sheet/2026-11-05-e330-bench-2.log`, reads `2026-11-05-e330-reads.jsonl`; bench code stage 36 @181 unchanged, left synced to live C114 |
| 9 | Code review of the script (agy; one re-review of the fold at most); findings reconciled below | es / agy | done — 5 findings fixed (A13–A16), 48 tests |
| 10 | Close: row → `done-pending-archive`; observations to the gap log | es | done — row `done-pending-archive`; G-ES1, G-ES2 in the C114 gap log |

## Acceptance

1. No file under `phase*/`, `utilities/`, `lib/`, `schemas/` changed — proven by the commit diff.
2. The seeder run against the live sheet ID exits with a refusal — proven by test and a dry-run.
3. Seeded fire vs cold control fire on the same resynced state, C<N> — proven by sandbox readback:
   - ratings rows read Processed TRUE after the fire; a non-zero median produces a non-zero city sentiment boost;
   - usage rows read Processed Y and Routed Y; named reporters' UsageCount rises;
   - `S.sportsSeason` is not `off-season` for a team with a game-phase row; game-night LifeHistory lines exist for named living players;
   - `Advancement_Intake1` shows rows routed from the usage rows and none from the seeder.
4. A second `--apply` for the same Cycle adds no ratings, usage or sports rows — proven by row counts.
5. After a resync from live no row matching `/sandbox-generic/i` remains on the four tabs — proven by readback.

## Reviews reconciled

| Review | Lane | Pointer | Result |
|---|---|---|---|
| Advisor, pre-plan | es | in-session, not saved | read-only |
| Feed code map | es (Explore subagent) | §Feed facts | read-only |
| Plan review | agy | `output/antigravity/2026-11-05-review-engine330-sandbox-feeds.md` | SHIP-WITH-FIXES; 8 findings, all verified against the code by es and folded |
| Code review | agy | `output/antigravity/2026-11-05-review-engine330-seeder-code.md` | SHIP-WITH-FIXES; 5 findings, all verified by es and fixed (A13–A16); tests 39 → 48 |

### Agreed

| # | Item | Held by | Sources |
|---|---|---|---|
| A1 | The fix is sheet-side rows. No branch on sandbox inside engine code | advisor · es | §Feed facts (no sheet-ID or environment branch in the four readers) |
| A2 | Scope is ratings, media usage and sports; intake writes nothing | builder | builder's words 2026-11-04 |
| A3 | "Generic" = ratings: median of live's last 8 Cycles per domain; usage: last live week's byline pattern; sports: an even week in the team's last live season phase | builder | builder's words 2026-11-04 |
| A5 | Usage rows carry Cycle N-1 like live; decay reads the max Cycle per name, so N-1 stops it | advisor · es | `processAdvancementIntake.js:1514-1525` |
| A6 | Ratings rows match live's coverage frequency: live C106–C113 had 47 rows, net rating 77 (9.6 a Cycle), domain rows per 8 Cycles SPORTS 8, CIVIC 7, CULTURE 7, ENVIRONMENT 6, ECONOMIC 5, INFRASTRUCTURE 4, COMMUNITY 3, GENERAL 3, HEALTH 2, EDUCATION 2; all ten every Cycle would write net 18.5 (~1.9x), the six at ≥4 write net 11 | builder ("typical week", 2026-11-04) · es | live `Edition_Coverage_Ratings` pull 2026-11-04 |
| A7 | Sports rows pair EventType with WeekRecord and blank EventTrigger and PlayerMood; a copied trigger re-fires and a copied mood overrides the streak | agy · es | `sportsWeekRecord.js:35-43`, `applySportsSeason.js:295-306`, `:1015`, `applyGameNightMoments.js:64-72` |
| A8 | Team Record from the last valid W-L across the team's rows, Sheets dates read as W/L; written RAW | agy · es | `applySportsSeason.js:407-445`, `:1063-1105`; `lib/sheets` appendRows RAW |
| A9 | NamesUsed parsed as the engine does, living matches only, from the latest row that has one | agy · es | `applyGameNightMoments.js:79-91`, `:189-197` |
| A10 | Usage rows: idempotent per N-1, latest byline Cycle, unique Context, one ledger match under `normalizeCitizenName_`, Reporter marker | agy · es | `processAdvancementIntake.js:476`, `:1364-1393`, `mediaRoomIntake.js:477`, `:577-584` |
| A11 | Ratings rows carry Tone; window = 8 highest distinct rated Cycles | agy · es | `applyEditionCoverageEffects.js:95` |
| A12 | Target allowlist = sandbox 1004 only; live and both baselines refused; live reads before the switch, sandbox reads after | agy · es | `lib/sheets.js:36-42`; DEPLOY.md:61; `output/engine-sheet/2026-10-19-reset-from-baseline-c112.js:6` |
| A13 | EventTrigger `none`, PlayerMood `quiet`: a blank cell carries the last trigger and mood forward and re-fires them | agy · es | `applySportsSeason.js:1018-1051`, `:1098-1099` |
| A14 | Usage gate = a published or seeded week at N-1; an in-progress week's landed rows count against the seed one for one | agy · es | proof run 1 skipped usage on live's in-progress C114 |
| A15 | Sports columns walk back to the last non-blank, non-dash value; phase read as `canonicalSportsPhase_`; a 0-0 record is not played | agy · es | `applySportsSeason.js:533-543`, `:1083-1101`, `:1126-1135` |
| A16 | Name ambiguity counts dead namesakes, as `processMediaUsage_` does; `--check` reads sandbox presence | agy · es | `processAdvancementIntake.js:441`, `:554` |
| A4 | Seeder runs right before each sandbox fire; usage and intake have no Cycle gate | es | §Feed facts, `processAdvancementIntake.js:476`, `mediaRoomIntake.js:477` |

### Needs proof

| # | Claim | Held by | Proof that settles it | Sources |
|---|---|---|---|---|
| P1 | A resync from live removes sandbox rows below live's last row | es | settled true: whole-tab batchClear then write (`syncSandboxFromLive.js:116-133`) | `syncSandboxFromLive.js` |
| P2 | The marker breaks no reader | es | settled: no reader chokes; seeds read "SANDBOX-GENERIC lead" (sandbox only), intake Notes read "a Bay Tribune sandbox-generic desk piece"; Tone added (A11) | `applyEditionCoverageEffects.js:95`, `mediaRoomIntake.js:577-584` |
| P3 | No-game SeasonTypes; NamesUsed check | es | settled: only `off-season` (and blank) has no games; NamesUsed per A9 | `applySportsSeason.js:499-543`, `applyGameNightMoments.js:79-91` |

### New concepts

| # | Concept | Origin | What it adds | Status |
|---|---|---|---|---|
| N1 | Season phase never advances past the team's last live phase on the sandbox | es · builder's rule A3 | a long sandbox run stays in one phase | held for builder |
| N2 | Usage rows repeat bylines only; a citizen named in print on inherited live rows still fades once a run passes 10 Cycles beyond that row | es · audit, `processAdvancementIntake.js` decay guard | partial cover of the decay loss | held for builder |

## Open questions

- none

## Changelog

- 2026-11-04 (engine-sheet) — Created. Scope and generic-row rules ruled by the builder; seat work dropped (undefined).
- 2026-11-04 (engine-sheet) — Audit pass: `--check` mode added to task 2 (pre-mortem: an unseeded fire read as truth); N2 logged.
- 2026-11-04 (engine-sheet) — Advisor fold: usage rows N-1 (task 4, A5); sheet-ID interface fixed in task 2; sandbox 1004 ID in task 8.
- 2026-11-04 (engine-sheet) — Live medians pulled. Ratings frequency settled inside "typical week" (A6, task 3): rows only for domains live covers in ≥4 of 8 Cycles. Open question closed.
- 2026-11-04 (engine-sheet) — Builder: "forget it". Parked; no script written, no review sent; row back to ready.
- 2026-11-05 (engine-sheet) — Builder: "I'm ok with however you want to build it as a benefit to what you would need from it in a bench run". Unparked; row to in-progress; task 1 sent to agy.
- 2026-11-05 (engine-sheet) — agy plan review folded (SHIP-WITH-FIXES, 8 findings verified against the code): tasks 2–5, Feed facts, Acceptance 4–5, A7–A12, P1–P3 settled.
- 2026-11-05 (engine-sheet) — Tasks 2–6 built: seeder + tests (39 pass); live ID refused; dry run against 1004 printed the rows. Usage source = latest live week with published bylines.
- 2026-11-05 (engine-sheet) — Proof run 1 (C115 cold vs seeded): ratings 6/6 processed, coverage 0 → 0.0645, sports rows read with 0 WeekRecord errors, usage skipped on live's in-progress C114 week. agy code review folded (A13–A16). G-ES1, G-ES2 to the C114 gap log. Proof run 2 on the fixed script.
- 2026-11-05 (engine-sheet) — Proof run 2 PASS, C115 cold vs seeded on the same live-synced state, 0 Engine_Errors both: ratings 6/6 processed, coverage 0 → 0.0645; usage 26 rows (39 from live C113 less 13 landed in live's C114 week) 26/26 processed and routed, reporters' UsageCount 305 → 328, intake 15 → 41 (26 routed from usage); sports season off-season → early-season, 0 WeekRecord errors, Oaks player lines 6 → 7; second apply 0 rows; resync leaves 0 marked rows. Citywide-reaction seeds 0 in both legs and on live (G-ES2). Closed.
