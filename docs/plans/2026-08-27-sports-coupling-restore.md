---
title: Sports Coupling Restore — the city responds to a real postseason
created: 2026-08-27
updated: 2026-08-27
type: plan
tags: [engine, sports, ripples, citizens, economy, active]
rollout: engine.131
sources:
  - Mike-direct 2026-08-27 — A's first then Oaks; seasons never overlap, the deeper phase takes the city's attention; both stadiums sit in the Baylight District
  - phase02-world-state/applySportsSeason.js:77 — the sentinel
  - docs/research/2026-07-07-simulation-narrative-open-items.md §2 — the S302 prescription (9 named guards)
  - docs/PRODUCT_VISION.md §The Game — "you play a game, then the city reacted"
  - live Neighborhood_Map C104, live Oakland_Sports_Feed (206 rows)
pointers:
  - "[[../OAKLAND_SPORTS_FEED]] — the twenty-column feed contract and its ripple map"
  - "[[../research/2026-07-07-simulation-narrative-open-items]] §2 — origin of the S302 gate"
  - "[[../engine/ROLLOUT_PLAN]] — engine.131"
  - "[[../canon/INSTITUTIONS]] §Baylight District — stadium-site canon"
  - "[[2026-08-02-sports-stat-event-intake]] — engine.40/.77, the intake side (archived complete)"
  - "[[2026-07-30-oakland-sports-workspace]] — engine.89, the workspace side (archived complete)"
---

# Sports Coupling Restore

The intake side is built and archived (engine.40, .77, .89): Mike writes a game
into `Oakland_Sports_Feed`, and the row lands safely. This plan is the
**consequence side** — what the city does with it.

## The law this builds on

The engine never simulates a game. Paulson runs games, athletes and scores;
`runAsUniversePipeline.js` enforces it ("NO random events for active UNI, NO
injuries ever, Maker is the sole controller"). The engine simulates the
**city's response** to a game Mike already played. That is Mike's own spec,
verbatim in `applyGameNightMoments.js`: *"I run their career in game — what
happens when they go home?"*

## Root cause

S302 fixed a real bug. `applySportsSeason_` was publishing the feed's raw
`SeasonType` onto `S.sportsSeason`, and nine generators used it as a licence to
synthesize sports atmosphere that no feed row recorded — the C122 "playoffs"
contamination. The prescribed fix, documented at
[[../research/2026-07-07-simulation-narrative-open-items]] §2, was a
`sportsAtmosphereEnabled` flag plus guards at nine named sites.

That fix shipped and is correct. **A second, unprescribed fix shipped with it**:
a blanket sentinel pinning `S.sportsSeason = "off-season"` on every feed-sourced
cycle (`applySportsSeason.js:77`). Belt and suspenders. The suspenders took out
the city.

## Measured cost (2026-08-27, live)

| Measure | Value |
|---|---|
| Branch sites keyed on a `sportsSeason` value | ~92 across 44 engine files, all permanently inert |
| `Neighborhood_Map.SportsSeason`, C104, all 22 neighborhoods | `off-season` — the sentinel is persisted into the world record |
| A's record at C104 | 126-35 |
| Feed rows carrying real postseason (`post-season` 12, `championship` 2, `world-series` 2, `playoffs` 2) | 18, every one flattened |

`applyCityDynamics.applySportsModifiers_` is a complete, graded sports economy —
preseason `+0.1` sentiment climbing to finals `×1.5` traffic, `×1.5` nightlife,
`×1.3` publicSpaces, `×1.4` communityEngagement, `+0.5` sentiment, plus a
cluster ripple to WATERFRONT_WEST / EAST_OAKLAND / DOWNTOWN_CORE. It has never
run. `economicRippleEngine` carries eight more branches in the same condition.

### Retracted: the Baylight retail claim

This plan opened citing Baylight District's C104 dials — RetailVitality 3.43 and
EventAttractiveness 9, against Jack London 8.54/35.18 and Downtown 10.05/36.08 —
as the symptom of the muzzle. **That was wrong, and the correction is kept here
rather than deleted because it is the more useful fact.**

Baylight is low *by design*. `v3NeighborhoodWriter.js:289` sets it
`retailMod: 0.5, eventMod: 0.6, nightlifeMod: 0.5` with the note
"under-construction remediation zone: quiet retail/nightlife now" — a
Mike-approved S256 profile. `economicRippleEngine.js:348` additionally aliases
Baylight to Jack London for economic-ripple purposes, which is coherent while
the site is a construction zone. Nothing about those numbers is sports-muzzle
damage.

The muzzle's cost stands on the measurements above it — 92 inert sites, five
straight cycles of a false `off-season`, and the sentinel persisted into
`Neighborhood_Map`. It never needed the Baylight number.

## The seam

The distinguishing test is **invent-prose vs. move-dial**, and S302 conflated
them:

- **Prose** — asserting a sports fact into narrative text or lore that no feed
  row recorded ("Sports fans surge (championship fever)" written into
  `World_Population`). This is contamination. It stays gated on
  `sportsAtmosphereEnabled`.
- **Dial** — a probability weight or a metric multiplier moving because of a
  result Mike actually recorded. A 126-35 club in late-season raising nightlife
  and traffic is the city responding to a real fact, not the engine inventing
  one. This must read the true phase.

Two of the nine guarded files are annotated "weights only" in the S302 research
doc itself and were guarded anyway. That is the over-correction in miniature:
probability math guarded as though it were narration.

## Tasks

**T1 — publish the truth.** `applySportsSeason_` sets `S.sportsSeason` to the
real normalized phase. Keep `S.sportsFeedSeasonType` (raw feed label) and
`S.sportsAtmosphereEnabled` exactly as they are — the nine guards stay armed and
untouched in this pass.

**T2 — per-team phase, deepest wins.** Mike-direct: the A's and the Oaks never
run a season at the same time, and whichever is deeper in its postseason takes
the city's attention. Publish `S.sportsSeasonByTeam` and resolve the city-wide
`S.sportsSeason` to the deepest phase across teams. `buildWorldSummary` already
reports per-team (`671c5424`, `10e8c44b`) — reuse that derivation, don't rebuild
it.

**T3 — close the vocabulary gap.** *(Scope reduced during build — recorded here
because the smaller shape is the better one.)* The plan opened intending to
promote `normalizeSportsPhase_` (`applyCityDynamics.js:166`) into a shared
helper. Reading the downstream sites killed that: they branch on Mike's **raw**
feed words (`'championship'`, `'playoffs'`, `'late-season'`), not on that
function's internal tier names (`'finals'`, `'postseason'`). Publishing
normalized tiers would have missed all 43 `=== 'championship'` sites — a
silent no-op dressed as a fix.

Shipped instead: `canonicalSportsPhase_` in `applySportsSeason.js`, alias
resolution only. `world-series` → `championship`, `summer league` → `preseason`,
everything else passes through untouched, unrecognized values fail **closed** to
`off-season` (an unknown string reaching the ~13 `!== "off-season"` sites would
read as in-season and turn the city on). All ~92 existing sites keep working
with zero downstream edits. `applyCityDynamics.normalizeSportsPhase_` stays
private and untouched — it now receives canonical input and already maps it.

**T4 — close the missed guard.** `generateCrisisSpikes.js` was named in the S302
fix list and never received the flag. Its four sites are dial-class
(championship crowds raising safety-incident probability), so they read the true
phase — but the miss is recorded here because the sentinel is what has been
covering for it, and the sentinel is going away.

**T5 — stale sports geography. REVERSED, not built.** The plan called
`economicRippleEngine.js:813` (`isSportsZone: nh === 'Jack London'`) and
`generateCrisisSpikes.js:273` (sports crowds weighted to Jack London and
Downtown) stale, on the strength of canon putting the 35,000-seat stadium on the
former-Coliseum site in the Baylight District with the A's as anchor tenant.

Checking the live sheet before cutting reversed it. `Initiative_Tracker`
INIT-006 at C104: `ImplementationPhase = construction-planning`,
`AffectedNeighborhoods = Jack London, Downtown`. The vote passed at C83 and the
build has not left planning 21 cycles later — while INIT-005 reached
`construction-active` and INIT-001 `disbursement-active`, so the mechanism does
advance; Baylight simply hasn't.

**The stadium is not built at C104.** Jack London and Downtown are where the
sports economy actually is, the engine agrees with the tracker, and the
hardcodes are correct for the current world. Repointing them at Baylight would
have broken a working model to match a state the world has not reached — the
canon destination read as if it were the present.

What survives as a real forward item: **when Baylight completes, the sports zone
has to move with the stadium**, and today nothing would move it — those two
sites are hardcoded strings, and the `v3NeighborhoodWriter` profile comment
promises "profile rises as the build completes" with no code that raises it.
That is a build-completion hook, not a present defect, and it is not this
plan's. Filed as an open question below rather than built.

**T6 — measure the delta.** Dry-run a cycle before and after and diff the
dials. The acceptance question is not "does it run" but "did Baylight wake up."

*Measured 2026-08-27 against the live feed, T1–T4 in place:*

| Cycle | feed rows | per-team | before | after |
|---|---|---|---|---|
| C100 | 7 | Oaks off-season, A's mid-season | off-season | **mid-season** |
| C101 | 5 | Oaks preseason, A's mid-season | off-season | **mid-season** |
| C102 | 7 | Oaks preseason, A's late-season | off-season | **late-season** |
| C103 | 5 | Oaks preseason, A's late-season | off-season | **late-season** |
| C104 | 6 | Oaks preseason, A's late-season | off-season | **late-season** |

Five straight cycles reported as off-season while the A's ran mid- to
late-season. At C104 the new value reaches 18 `=== 'late-season'` sites plus the
~13 `!== 'off-season'` sites that were reading the city as dark.

Cross-check: this derivation lands on "Oaks preseason, A's late-season" for
C104, which is what `buildWorldSummary`'s independent builder-side derivation
already reported (`671c5424`). Two separate code paths, same answer.

## Guardrails

- The nine `sportsAtmosphereEnabled` guards are not relaxed in this pass. Some
  are mis-classified onto dials; correcting that is a **separate, separately
  verifiable change** (S250 — one unverified change in flight at a time).
- No engine file invents a game, a score, an injury, or a roster move. Ever.
- `Neighborhood_Map.SportsSeason` begins recording the true phase from the next
  cycle forward. Historical `off-season` rows are the record of what the engine
  believed at the time and are **not** backfilled — engine output is canon, and a
  wrong value that fired is an event the citizens lived.

## Open questions — for Mike, not decided here

1. **Does a team's phase carry forward across a quiet cycle?** Today it does
   not: no feed row for cycle N means `off-season`, per established feed law
   ("old team state does not speak by itself"). But a club can be mid-postseason
   in the fiction while Mike simply hasn't entered a row that cycle, and the city
   goes dark for a cycle in the middle of a pennant race. Changing this has its
   own blast radius across the same ~92 sites and was deliberately not ridden in
   on this change.
2. **The Baylight completion hook.** When the build finishes, the sports zone
   should move from Jack London to Baylight, and Baylight's neighborhood profile
   should rise off its construction-site values. Neither is wired. Related:
   INIT-006 has sat at `construction-planning` since C83 — whether that is a
   civic-lane stall or intended pacing is Mike's call, not the engine's.
3. **Oaks second.** Everything here is team-agnostic and the Oaks already flow
   through `sportsSeasonByTeam`. What is *not* built is anything that treats a
   7-player expansion roster differently from a 90-player dynasty.

## Acceptance

Next unattended cycle, on real feed data: `Neighborhood_Map.SportsSeason`
carries a real phase; Baylight's RetailVitality and EventAttractiveness move on
a game cycle; `Ripple_Ledger` shows sports cause→effect rows naming the
district; no invented sports prose appears in evening media on a feed-sourced
cycle.
