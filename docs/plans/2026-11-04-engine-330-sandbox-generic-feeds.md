---
title: Sandbox Generic Feeds Plan
created: 2026-11-04
updated: 2026-11-04
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
| `Edition_Coverage_Ratings` | Cycle = N or N-1, Processed not TRUE (`applyEditionCoverageEffects.js:80-87`); marked TRUE at `:368-379` | city sentiment boost ±0.20 (`applyCityDynamics.js:1805`); six city metrics (`:1739-1747`); \|rating\|≥3 → media-feedback story seeds (`applyStorySeeds.js:1307-1320`); approval press term (`updateCivicApprovalRatings.js:523`) | early return, boost 0; business engine compares 0 to the mean of the last six carried values → false dip (`applyBusinessDynamics.js:238-254`) | `scripts/rateEditionCoverage.js:620-712`, Cycle = the edition's, after publish (`cron-saturday-run.js:1648`) |
| `Citizen_Media_Usage` | no Cycle gate; Processed ≠ Y (`processAdvancementIntake.js:476`), Routed ≠ Y (`mediaRoomIntake.js:477`) | UsageCount, fame, tiers at 3/6/9, Famous at 25, route to intake | fewer than 2 rows → return; `decayMediaAttention_` still fades a named citizen −1 UsageCount per Cycle once Cycle − last named > 10 | `cron-saturday-run.js:546-599`, `cron-desk-run.js:302-335`, `scripts/ingestPublishedEntities.js:946`, `lib/citizenPage.js:87-135` |
| `Advancement_Intake1` | no Cycle column; every row with a First or Last, then cleared (`processAdvancementIntake.js:825`, `:1232`) | tier lift; mints a citizen from a new name | nothing runs | engine itself (`godWorldEngine2.js:1577`, emergence/family/owner promotions) plus hand rows and the media route (`mediaRoomIntake.js:507`) |
| `Oakland_Sports_Feed` | Cycle = N only (`applySportsSeason.js:237`); re-read every fire, no Processed flag | season state, sentiment boost (needs a WeekRecord), game-night LifeHistory lines (`applyGameNightMoments.js:171`), household pool (`runHouseholdEngine.js:408`), casino settlement | `off-season`, pools empty (`applySportsSeason.js:138-150`) | hand entry; dashboard append (`dashboard/sportsRoutes.js:1286`) |

## Tasks

| # | Task | Owner | Status |
|---|------|-------|--------|
| 1 | Plan review: agy against the code; findings reconciled below before the build | es / agy | not started |
| 2 | `scripts/seedSandboxFeeds.js` shell + `scripts/seedSandboxFeeds.test.js`: `--sheet-id` assigned after `require('lib/env')`, resolved ID printed, live ID refused, `--cycle <N>` = the Cycle about to fire, dry-run default, `--apply`, `--check` (exits non-zero when the Cycle's rows are missing); reads live tabs read-only, writes sandbox only; every row carries `SANDBOX-GENERIC`. Verified by tests + a dry-run readback | es | not started |
| 3 | Ratings rows: Cycle N-1, one per domain seen in live's last 8 Cycles, Rating = median of those, ArticleCount 1, Reporter `SANDBOX-GENERIC`, Processed FALSE; a domain with a row for that Cycle is skipped. Verified by tests + rows read back | es | not started |
| 4 | Media-usage rows: the last live Cycle's byline rows (same CitizenName, UsageType), Cycle N, Context `sandbox-generic_c<N>_<slug>`, Processed/Routed/Source/Sentiment blank; written once per fire (no Cycle gate). Names must match one ledger citizen. Verified by tests + rows read back | es | not started |
| 5 | Sports rows: one per team (A's, Oaks), Cycle N, SeasonType = the team's last live one, game-result with WeekRecord `H:W A:L` and Team Record + 1-1, Streak `L1`, other columns copied from the team's last live row; a no-game SeasonType gets season-state / `none`; NamesUsed kept only for living citizens; a team with a row for N is skipped; Notes `SANDBOX-GENERIC NON-CANON`. Verified by tests + rows read back | es | not started |
| 6 | Intake: no rows written. Engine self-feeds it; the media route fills it once task 4 rows exist; authored citizens are not generated | es | not started |
| 7 | `DEPLOY.md`: seed step added before **Fire** in §Groundhog proving loop; §The bench runs cold rewritten to match (drops "seat work", undefined in the repo) | es | not started |
| 8 | Sandbox proof: confirm research-build holds no sandbox proof in flight → resync from live → cold control fire (no seed) → seed → fire. Compare per Acceptance 3 | es | not started |
| 9 | Code review of the script (agy; one re-review of the fold at most); findings reconciled below | es / agy | not started |
| 10 | Close: row → `done-pending-archive`; observations to the gap log | es | not started |

## Acceptance

1. No file under `phase*/`, `utilities/`, `lib/`, `schemas/` changed — proven by the commit diff.
2. The seeder run against the live sheet ID exits with a refusal — proven by test and a dry-run.
3. Seeded fire vs cold control fire on the same resynced state, C<N> — proven by sandbox readback:
   - ratings rows read Processed TRUE after the fire; a non-zero median produces a non-zero city sentiment boost;
   - usage rows read Processed Y and Routed Y; named reporters' UsageCount rises;
   - `S.sportsSeason` is not `off-season` for a team with a game-phase row; game-night LifeHistory lines exist for named living players;
   - `Advancement_Intake1` shows rows routed from the usage rows and none from the seeder.
4. A second `--apply` for the same Cycle adds no ratings or sports rows — proven by row counts.
5. After a resync from live no `SANDBOX-GENERIC` row remains — proven by readback.

## Reviews reconciled

| Review | Lane | Pointer | Result |
|---|---|---|---|
| Advisor, pre-plan | es | in-session, not saved | read-only |
| Feed code map | es (Explore subagent) | §Feed facts | read-only |

### Agreed

| # | Item | Held by | Sources |
|---|---|---|---|
| A1 | The fix is sheet-side rows. No branch on sandbox inside engine code | advisor · es | §Feed facts (no sheet-ID or environment branch in the four readers) |
| A2 | Scope is ratings, media usage and sports; intake writes nothing | builder | builder's words 2026-11-04 |
| A3 | "Generic" = ratings: median of live's last 8 Cycles per domain; usage: last live week's byline pattern; sports: an even week in the team's last live season phase | builder | builder's words 2026-11-04 |
| A4 | Seeder runs right before each sandbox fire; usage and intake have no Cycle gate | es | §Feed facts, `processAdvancementIntake.js:476`, `mediaRoomIntake.js:477` |

### Needs proof

| # | Claim | Held by | Proof that settles it | Sources |
|---|---|---|---|---|
| P1 | A resync from live removes sandbox rows below live's last row | es | read `scripts/syncSandboxFromLive.js` clear behavior; readback after resync (Acceptance 5) | `syncSandboxFromLive.js` |
| P2 | The `SANDBOX-GENERIC` Reporter and the `sandbox-generic_` Context prefix break no reader (Tone use, intake Notes built from Context) | es | code read of the readers' Tone/Context handling before task 3–4 | `applyEditionCoverageEffects.js`, `mediaRoomIntake.js` |
| P3 | Which SeasonTypes carry no games, and that NamesUsed validation matches the engine's living-citizen check | es | read `applySportsSeason.js` season table + `sportsWeekRecord.js` before task 5 | `applySportsSeason.js:290-307`, `sportsWeekRecord.js:38-41` |

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
