---
title: Education lane — engine routing cuts + school-table drift proposal
created: 2026-09-14
updated: 2026-09-14
type: reference
tags: [research, education, newsroom, pipeline68, active]
sources:
  - S441 kimi session — education-lane audit (captured in the pipeline.68 plan Changelog 2026-09-10 after the session quota-walled; roster defect filed engine.191)
  - S443+ kimi session — scripts-side fix landed; builder rulings 2026-09-10 (this conversation): desk question SKIP (domain routing covers it), school table PROPOSE DRIFT ENGINE, scope FULL COURSE
  - docs/plans/2026-09-07-beat-slices-from-sheets-plan.md — pipeline.68
  - docs/research/2026-09-10-kimi-faith-lane-routing.md — same storyHook deskMap machinery, wiring card attached there
pointers:
  - "[[../plans/2026-09-07-beat-slices-from-sheets-plan]] — the plan this extends"
  - "[[../SIM_DOCTRINE]] §13 — gate the facts, not the color"
---

# Education lane — engine routing cuts + school-table drift proposal

**Verdict: adopt.** Two hook-routing cuts (same class as engine.189/190) and
one design question the builder ruled on 2026-09-10: **propose a drift engine
for the school table** — options below.

## What landed scripts-side (kimi, this session)

`scripts/buildSchoolsSlice.js` v SCHOOLS-SLICE-2, verified against the live
C107 dump:

- **Enrollment movement leads.** `Students` is the one education number the
  engine drifts every cycle; the slice now opens with per-hood enrollment
  deltas vs `prev/` (live at C107: "Fruitvale +11, East Oakland +10, San
  Antonio +10, Glenview +10, Brooklyn +9, Laurel +9").
- **The frozen table says so.** When `prev/` exists and no SchoolQualityIndex
  moved, the slice states "the quality table is unchanged since C<N>" — a true
  fact that self-retires the day a drift engine lands.
- **District card.** `BIZ-00016` (by ID — canon.5 holds the OUSD rename):
  headcount citywide + the per-hood Funding total joined for the first time.
  The `Annual_Revenue: "-15"` artifact is deliberately not printed (a school
  district has no revenue line; engine.191 territory).
- **Domain hooks.** EDUCATION + DROPOUT_WAVE + SCHOOL_QUALITY_CRISIS rows
  reach her by domain (the by-name match is empty by construction — see cuts).
- **People pool widened.** When the lead hood has no students/educators on the
  ledger, up to 5 educators citywide are named as such ("educator on the
  ledger in Rockridge — none in KONO"), never presented as locals.
- Builder ruling recorded: the `desk: 'civic'` (slice) vs `culture`
  (rosterLookup) mismatch needs no reconciliation — hooks route by domain now.

## Proposed engine cuts (gated — phase*/utilities land through engine-sheet)

**Cut 1 — EDUCATION hooks route to a desk that doesn't exist, then get stolen.**
`phase07-evening-media/storyHook.js:107` maps `'EDUCATION' → 'Education Desk'`
— no such desk in `utilities/rosterLookup.js:343-352`. And because these hooks
are `hookType: 'demographic'`, `mapHookTypeToSignal_` (storyHook.js:145) maps
them to the `'community'` signal BEFORE the domain fallback — so from C84 they
carry `SuggestedJournalist: "Sharon Okafor"` (culture generalist), never Angela
Reyes. Live evidence: 20 EDUCATION rows C79→C106, all "Education Desk", C84+
all Sharon Okafor. Proposed: desk `'EDUCATION' → 'Culture Desk'` (where Angela
actually sits per rosterLookup) and let the domain signal fire before the
hookType signal for EDUCATION — or add an explicit education-signal match for
`'Angela Reyes'` in the roster signal map.

**Cut 2 — DROPOUT_WAVE bypasses makeHook entirely.**
`phase05-citizens/educationCareerEngine.js:1367-1378` pushes raw
`{hookType, description, severity}` objects; the Phase-7 carry-over
normalization (`storyHook.js:1384-1394`) sets text/priority/domain but never
`suggestedDesks`/`suggestedJournalist`. These 4 rows carry no desk and no
journalist — they reach nobody — and they re-alert identically every cycle
because the column they read never changes. Proposed: give the normalization a
desk/journalist fallback (`domain → deskMap → roster`), and gate re-alerting
(cooldown or on-change only). Note the canon guard
(`educationCareerEngine.js:660-662`): quality < 3 is off-canon, so
SCHOOL_QUALITY_CRISIS never fires; DROPOUT_WAVE fires on any backfilled hood
under 65%.

**Cut 3 — the school-drift engine (builder ruled 2026-09-10: propose it).**
Nothing drifts `SchoolQualityIndex / GraduationRate / CollegeReadinessRate /
TeacherQuality / Funding` on Neighborhood_Demographics — backfilled once by
`scripts/backfillNeighborhoodEducation.js`, no phase touches them
(`ensureNeighborhoodDemographics.js:290-299` explicitly does not manage them).
Options for engine-sheet's design:
- (a) **Slow pressure-coupled drift**: quality moves a fraction of a point per
  cycle toward an equilibrium set by hood pressure (crime, rent burden),
  Funding, and active education-tagged initiatives. Graduation/readiness lag
  quality by several cycles. Funding moves with civic initiatives only.
- (b) **Dial-coupled**: hood school quality responds to the dials of its
  students/educators (engine.176+ machinery) — richer, more coupling, more
  risk.
- (c) Event-driven only: quality moves only on discrete events (initiative
  passes, scandal, closure) — smallest change, still mostly static.
Recommendation: (a) with a hard ±0.1/cycle cap and bounds 1–10, so the table
breathes without whipsawing; the DROPOUT_WAVE alert then becomes honest
movement news instead of a permanent fixture.

## Already filed elsewhere

- engine.191 — OUSD/school-district roster mis-mapping (12 of 29 off-role
  workers, SkillTags `Education` placing non-educators).
- canon.5 — BIZ-00016 rename (OUSD → Oakland City Schools).

## Wiring

No new sheet tab and no engine function touched by the scripts-side change
(all three tabs read were already in the beat dump). The storyHook deskMap
machinery is carded in `docs/research/2026-09-10-kimi-faith-lane-routing.md`
(engine.189) — same lines, same cut shape.

## Review — research-build, 2026-09-19 (S467)

Accepted. The scripts-side slice work stands. All three engine cuts have since shipped (ROLLOUT_ARCHIVE, S463):
- **Cut 1 (phantom Education Desk; hooks taken by Sharon):** engine.232 — one desk table, with EDUCATION on the culture desk and the `education` domain seat scored before the hookType signal (`storyHook.js:117`, `:185`).
- **Cut 2 (DROPOUT_WAVE reaches nobody):** engine.231 — Phase-5 raw hooks now go through makeHook's own desk/journalist match path.
- **Cut 3 (school-table drift):** engine.192 (`0a8013fc`, PROD @96) — the five education columns drift every Cycle. Its re-alerts now report movement, not a fixed backfill.
