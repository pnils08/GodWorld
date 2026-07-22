---
title: Citizen Lifecycle & Fame System Plan
created: 2026-05-30
updated: 2026-05-30
type: plan
tags: [engine, citizens, ledger, fame, lifecycle, active]
sources:
  - docs/engine/archive/ROLLOUT_PLAN.md §engine.* (engine.5 expansion)
  - S248 Mike-direct design session (engine-sheet) — death-by-age, ClockMode authority, fame decay + ascension, Cultural_Ledger correction
  - "[[../engine/LEDGER_REPAIR_HOUSEHOLDS]] — Representative Sample model (1 tracked : 438 real); engine life-event simulation"
  - "[[../engine/ENGINE_REPAIR]] Row 23 (citizen lives frozen / simYear), Row 24 (career drift-freeze)"
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — parent rollout (engine.5)"
  - "[[../engine/LEDGER_REPAIR_HOUSEHOLDS]] — sibling plan (households + the Representative Sample model this builds on)"
  - "[[../engine/ENGINE_REPAIR]] — Row 23/24/25 tactical tracker"
  - "[[SCHEMA]] — doc conventions"
  - "[[index]] — registered in same commit"
---

# Citizen Lifecycle & Fame System Plan

**Goal:** Close the four half-wired pieces of the citizen lifecycle so a tracked citizen's prominence is *earned and lost* over time: (1) death arrives by age, gated by ClockMode authority; (2) Simulation_Ledger tier **decays** without appearances and rises with them; (3) sustained fame **ascends** a citizen onto the Cultural_Ledger; (4) Cultural_Ledger figure generation mints a **full SL citizen** (POPID), so famous figures are real tracked people whose engine output (shows, documentaries) feeds the loop.

**Architecture:** A two-layer ascension+decay model over the Representative Sample (1 tracked : ~438 real Oaklanders). The `Simulation_Ledger` tier (4→3→2→1) is the prominence climb — appearance-fed, decaying each cycle. When fame crosses a threshold (`UsageCount ≥ 30`) a citizen ascends to the `Cultural_Ledger` (the Local→Iconic CityTier layer, which already decays via TrendTrajectory). The two ledgers are **disjoint today** (Cultural_Ledger has no POPID, zero SL overlap) — the bridge between them is the central new build. Death is age-driven (85+ escalating) and ClockMode-gated. None of this ships until C96 verifies the S244 simYear fix + S248 Track 1 mutations; each phase is its own deliberate post-C96 fire.

**Terminal:** engine/sheet (substrate) — Phase D cultural-gen correction may need a research-build canon pass on the 42 legacy figures.

**Pointers:**
- Prior work: [[../engine/LEDGER_REPAIR_HOUSEHOLDS]] (Phase 2b Track 1 shipped S248, commit `d173310`, deploy-held for C96); [[../engine/ENGINE_REPAIR]] Row 23 (simYear fix), Row 24 (career drift-freeze), Row 25 (this plan, lifecycle/fame).
- Related: the appearance counter (`UsageCount`) + tier ladder live in `phase05-citizens/processAdvancementIntake.js` (3/6/9 thresholds); fed by `phase07-evening-media/mediaRoomIntake.js` routing.
- Research basis: S248 Mike-direct design session.

**Acceptance criteria:**
1. A fired cycle ages an 85+ ENGINE/GAME citizen toward death at a calibrated low rate; MEDIA/CIVIC citizens never die from the engine; GAME citizens never take engine *injury* (Paulson's game owns that).
2. A citizen with no appearances for N cycles loses tier (demotion); appearances maintain or raise it. Verified: tier moves DOWN in the SL after a silent stretch.
3. A citizen crossing `UsageCount ≥ 30` gains a linked `Cultural_Ledger` entry (shared key); engine cultural output about an SL citizen (e.g., a documentary) feeds their `UsageCount`.
4. The Cultural_Ledger figure generator mints a POPID + a full SL row; new famous figures appear on the SL.
5. Determinism preserved (`ctx.rng` only); no direct sheet writes outside Phase 10; canon anchors are protected only where the model says (ClockMode), not by a blanket Tier-1 lock.

---

## Decisions locked (S248, Mike-direct)

**D1 — Death curve.** Escalating chance from age **85** (mirror `checkRetirement_`'s age-laddered curve: e.g. 85→low, 90→higher, 95→higher, ~100 near-certain). NOT a hard final age. Deaths stay **rare and representative**: 1 tracked death = ~438 real deaths, so a sub-85 death is a *major story* (it represents 438 similar), not a routine cull. The 85+ clock is the primary death path; young deaths are rare exceptions (illness escalation), never frequent.

**D2 — ClockMode event-authority matrix.** ClockMode gates what the engine may do to a citizen. **REVISED S255 (Mike-direct): all civilians can die** — MEDIA/CIVIC death protection dropped; protection is expressed as *succession*, not immortality.

| ClockMode | live count | Engine death | Illness | Injury |
|-----------|:--:|:--:|:--:|:--:|
| **ENGINE** | 721 | ✓ 85+ clock | ✓ | ✓ |
| **GAME** | 90 | ✓ **only once Retired** (career gate first, then the 85+ clock) | ✓ | ✗ — Paulson's game injures athletes |
| **MEDIA** | 43 | ✓ — death **prompts a new voice in that job** (agent/voice tie recast) | ✓ (big story) | ✓ (big story) |
| **CIVIC** | 49 | ✓ (all civilians die) — vacancy via existing civic succession/election machinery *(inference: Mike named the MEDIA recast explicitly; CIVIC succession path to confirm)* | ✓ (big story) | ✓ (big story) |

ENGINE is the "fair game" representative population. GAME citizens can't die while active athletes — retirement releases them to the normal mortality clock. MEDIA/CIVIC deaths are big stories AND job-continuity events: the role persists, the person doesn't (a MEDIA death recasts the voice in that job). *(S248 inference still open: GAME illness defaulted to ✓ — only injury was carved to Paulson. Adjust if illness should also be Paulson's.)*

**D3 — Fame-ascension threshold.** `UsageCount ≥ 30` → ascend to Cultural_Ledger. Single factor — verified no second accumulating fame signal exists on the SL (`MediaCount`/`FameScore`/`EmergenceCount` are all absent from Simulation_Ledger; they live on Cultural_Ledger). A second factor would require a new SL column (out of scope unless added).

**D4 — Cultural-gen correction.** When the engine mints a cultural figure, create a **full SL ledger entry** (POPID, Tier, neighborhood, ClockMode, Status). Famous figures are real tracked citizens; their engine output (shows/docs/appearances) feeds the appearance loop like anyone else's.

**Canon lock superseded.** The Tier-1 protection was scaffolding for a broken engine (kept major events off named characters while it was unreliable), NOT a design principle. In the working system, tiers move and life events fire for everyone; protection is expressed through ClockMode (D2), not a blanket Tier-1 freeze. `identity.md`'s "don't delete Tier-1" still holds at the *deletion* level — death is a Status flip + cascade, not a row delete, and is age/ClockMode-gated, so anchors die only of old age in their right mode.

---

## Verified current state (S248 measure-twice — don't re-derive)

- **Death has NO age gate.** `checkDeath_` (generationalEventsEngine) is the only milestone with no `AGE_RANGES` check — it can hit any age. (This is why the lone all-time death fired while age-gated events were frozen by the simYear bug.) `AGE_RANGES` has GRADUATION/WEDDING/BIRTH/PROMOTION/RETIREMENT but no DEATH.
- **ClockMode live split:** ENGINE 721 / GAME 90 / CIVIC 49 / MEDIA 43 (903 total). Default new-row ClockMode = ENGINE.
- **The ledgers are disjoint.** Cultural_Ledger: 42 rows, keyed `CUL-ID` + `Name`, **no POPID column**, zero POPID overlap with SL. Schema carries `FameScore / MediaCount / MediaSpread / TrendTrajectory / CityTier / FirstSeenCycle / LastSeenCycle / UniverseLinks`. It already decays via `updateCityTier_` (TrendTrajectory: cooling −2 / falling −4 / fading −6). `UniverseLinks` is the likely intended SL-link home.
- **Isley Kelley** is a **Simulation_Ledger** citizen (not Cultural_Ledger). Mike's example: the engine generates his documentary + a high-ratings show as evening-media output, but that output **never feeds his `UsageCount` or fame** — the appearance-feed gap, SL side.
- **UsageCount** is the sole SL fame signal (col 18): 97 positive (max 42), 261 zero, 545 blank → ~806 citizens have never accumulated an appearance. Fed by `mediaRoomIntake` → `Citizen_Media_Usage` → `processAdvancementIntake` (`+1`). Tier ladder: `≥3→T3, ≥6→T2, ≥9→T1`, guarded `currentTier > N` (ratchet-up only, **no demotion path anywhere**).
- **Tier dist:** T1=21, T2=64, T3=210, T4=608.

---

## Phases (each its own post-C96 fire — sequence, don't chain)

> **Gate:** nothing here deploys until C96 verifies the S244 simYear fix + S248 Track 1 (commit `d173310`). Each phase is a reactivation across the live ledger — one deliberate fire each, with its own measure-twice + smoke-test, per the S247 attribution discipline (multiple reactivations in one cycle = unreadable).

### Phase A — Death-by-age + ClockMode authority gate

- **Files:** `phase04-events/generationalEventsEngine.js` (modify); `phase04-events/` AGE_RANGES.
- **Steps:**
  1. Add `AGE_RANGES.DEATH = { min: 85 }` (no max). Add an escalating age curve in `checkDeath_` mirroring `checkRetirement_` (85→~0.01, 90→~0.04, 95→~0.12, ~100→near-certain — tune to keep deaths rare/representative).
  2. Add a ClockMode authority helper read in the loop (the loop already reads `mode = row[iClock]`). Gate per D2: death only for `ENGINE`/`GAME`; illness/injury per matrix; GAME injury suppressed (route to Paulson's game, i.e. engine emits no injury for GAME).
  3. Keep the "any death is a 1:438 story" framing — death cascade already exists (`triggerDeathCascade_`); ensure it tags a high-priority story hook so the newsroom surfaces it.
  4. **Health columns (S255 ride-along):** add SL columns `StatusStartCycle` + `HealthCause` — the hospital lifecycle already header-resolves both (`generationalEventsEngine.js:198-199`, `>= 0` guarded) so adding the columns activates the dead duration mechanics with zero code: forced resolution after 5 cycles hospitalized, critical 3+ cycles → 60% resolve, recovery wipes cause. Without them `statusDuration` is always 0 (patients linger on pure dice) and assigned causes have nowhere to persist (`healthCauseIntake.js:308` lazily self-heals HealthCause on first intake run; StatusStartCycle has no self-heal). **Health system verdict (S255):** SL Status IS the illness/injury tracker (hospitalized/critical/recovering/injured/serious-condition arc native); `Health_Cause_Queue` tab = hospital-intake board (engine hospitalizes cause-blind → media assigns cause → writeback), KEEP — 3 stale unprocessed rows to clear on first real run; separate `Health_Civic` spreadsheet = abandoned (empty, untouched since 2025-11), ignore.
  5. **GAME death career-gate (S255 D2 revision):** GAME death checks Retired status first, not just age; MEDIA/CIVIC deaths allowed — emit a succession/recast hook with the death cascade (new voice in that job).
- **Verify:** harness re-trace (`/tmp/trace_generational.js` style) — confirm 0 deaths under 85 from the age path; active GAME citizens produce 0 deaths (retired GAME 85+ produce the normal low rate); MEDIA/CIVIC deaths emit succession hooks; GAME produces 0 engine injuries; a hospitalized fixture citizen force-resolves by cycle 5 once StatusStartCycle exists.
- **Status:** [ ] not started — post-C96.

### Phase B — SL tier fame-decay + appearance feed

- **Files:** likely a small new per-cycle pass (phase05) or extend `processAdvancementIntake`; `phase07-evening-media/*` for the engine-cultural-output → UsageCount wire.
- **Steps:**
  1. **Decay:** each cycle, fade the fame signal (decrement `UsageCount`, or a derived fame score, by a calibrated amount / half-life — D-decay-rate to set with Mike: fast-fickle vs slow-reputation). Re-derive Tier from the faded signal so it can move DOWN (the missing demotion path) — respecting the ladder thresholds in reverse.
  2. **Appearance feed (engine side):** wire engine cultural output that names an SL citizen (documentary/show/appearance from evening-media) into `UsageCount`, so engine output maintains/raises fame — not just media intake. (Isley Kelley's documentary should feed Isley.)
  3. Protect: decay must not violate D2 (no death from decay; it's prominence only) and must not drop a citizen below a sane floor mid-story.
- **Verify:** simulate N silent cycles on a fixture citizen → Tier decreases; an appearance → Tier holds/rises. No `Math.random`; writes via `ctx.ledger`.
- **Open:** decay rate / half-life (Mike's feel call — fast vs slow); whether decay acts on `UsageCount` directly or a separate derived fame score (cleaner: a derived score so the raw appearance count is preserved).
- **Status:** [ ] not started — post-C96, post-Phase-A.

### Phase C — Fame-ascension bridge (SL → Cultural_Ledger)

- **Files:** `phase05-citizens/processAdvancementIntake.js` (ascension trigger — it already owns the UsageCount→tier ladder) or a sibling; `phase07-evening-media/culturalLedger.js` (entry creation); Cultural_Ledger schema (link key).
- **Steps:**
  1. Add the link key: populate `UniverseLinks` (or a new `POPID` column) on Cultural_Ledger so an entry references its SL citizen.
  2. Ascension trigger: on `UsageCount ≥ 30` (D3), create (or link) a Cultural_Ledger entry for that SL citizen — seeding FameScore/MediaCount/CityTier from their SL fame signal. Idempotent (don't double-create).
  3. The Cultural_Ledger decay (`updateCityTier_` TrendTrajectory) then governs the famous-figure layer — already wired; verify it runs for ascended citizens.
- **Verify:** a fixture citizen crossing 30 gains exactly one linked Cultural_Ledger row; re-run is idempotent.
- **Status:** [ ] not started — post-C96, post-Phase-B.

### Phase D — Cultural_Ledger generation correction (mint full SL entry)

- **Scope-first task (don't guess the file):** locate where Cultural_Ledger figures are minted (candidates: `phase07-evening-media/culturalLedger.js`, `buildEveningMedia.js`, `mediaFeedbackEngine.js`). Confirm the mint path for the 42 disjoint figures (Dax Monroe et al.).
- **Steps:**
  1. At the mint site, allocate a POPID (next sequential) + write a **full SL row** (POPID, First/Last from the figure name, Tier per fame, Neighborhood, ClockMode = MEDIA or ENGINE per figure type, Status=Active) in addition to the Cultural_Ledger row, linked by the Phase-C key.
  2. **Reconcile the 42 legacy figures:** back-mint SL rows for the existing disjoint Cultural_Ledger entries (or canon-review which deserve it — research-build canon pass; some may be flavor-only). Dry-run + Mike go (many-row SL add = cross-boundary).
- **Verify:** a freshly-minted cultural figure appears on the SL with a POPID and a linked Cultural_Ledger row; legacy 42 reconciled or explicitly classified flavor-only.
- **Status:** [ ] not started — post-C96, post-Phase-C; Phase-D backfill is operator-gated (`--apply`).

---

## Open questions

- [ ] **Decay rate / half-life** (Phase B) — Mike's feel call: fast-fickle vs slow-reputation-lingers. Blocks Phase B calibration.
- [ ] **GAME illness** (Phase A / D2) — defaulted ✓ (only injury carved to Paulson). Confirm or carve illness to Paulson too.
- [ ] **Decay target** (Phase B) — decay `UsageCount` directly vs a separate derived fame score (lean: separate score, preserve raw count).
- [ ] **CIVIC death succession** (Phase A / D2, S255) — Mike confirmed all civilians die + named the MEDIA recast explicitly; CIVIC vacancy presumably routes through existing civic succession/election machinery. Confirm.
- [ ] **MEDIA recast mechanism** (Phase A, S255) — death "prompts a new voice in that job": engine-side hook only (newsroom/agent layer does the recast), or engine mints the successor row? Lean: hook only.

## Status log

### engine.29 — status (drained from ROLLOUT, 2026-06-26 / S274)

Citizen lifecycle & fame system (engine.5 expansion, S248 Mike-direct design) — 4 half-wired pieces: (A) death-by-age 85+ escalating + ClockMode authority matrix (ENGINE/GAME die at 85+, MEDIA/CIVIC no die-off but illness/injury, GAME injuries=Paulson); (B) SL tier fame-decay + the missing demotion path + engine-cultural-output appearance feed; (C) fame-ascension bridge `UsageCount≥30` → linked Cultural_Ledger entry (ledgers disjoint today, no POPID); (D) Cultural_Ledger figure-gen mints full SL citizen. Canon Tier-1 lock reframed as broken-engine scaffolding → ClockMode gating. Each phase its own post-C96 fire (attribution discipline). Decisions D1–D4 locked. **S255 (Mike-direct): D2 revised — all civilians die (MEDIA death recasts the voice in that job; GAME death gated on Retired first); Phase A ride-along = add SL `StatusStartCycle` + `HealthCause` columns (activates dead hospital-duration timers + cause persistence, zero code — engine header-resolves both). Health audit: SL Status is the native illness tracker; Health_Cause_Queue = hospital intake (keep); Health_Civic spreadsheet abandoned.**

## Changelog

- 2026-05-30 — Initial draft (S248, engine-sheet). Design from Mike-direct session: D1 death-by-age, D2 ClockMode authority matrix, D3 fame threshold 30, D4 full-SL cultural-gen. Verified current state (death no-age-gate, ClockMode dist, disjoint ledgers, Isley example, UsageCount sole signal). Four phases sequenced post-C96. Canon lock reframed as scaffolding (superseded by ClockMode gating). Sibling to [[../engine/LEDGER_REPAIR_HOUSEHOLDS]]; ENGINE_REPAIR Row 25 to be opened pointing here.
- 2026-06-10 — S255 (engine-sheet, Mike-direct via lifecycle Q&A). **D2 REVISED:** all civilians can die — MEDIA/CIVIC death protection dropped, replaced by succession (MEDIA death recasts the voice in that job); GAME death career-gated (only once Retired, then the 85+ clock). **Phase A scope grew:** health columns ride-along — add `StatusStartCycle` + `HealthCause` to SL (engine already header-resolves both; activates dead duration timers + cause persistence, zero code). Health system audited: SL Status is the native illness tracker; `Health_Cause_Queue` = hospital intake (keep); `Health_Civic` spreadsheet abandoned (ignore). Two new open questions (CIVIC succession, recast mechanism). Context: ENGINE_REPAIR Row 27 (Isabelle Louis zombie-row, closed) prompted the lifecycle review.

---

## Relocated ROLLOUT_PLAN row detail — 2026-07-02 (S286 pointer-collapse)

Verbatim rows moved out of ROLLOUT_PLAN.md when it collapsed to pointer-only. This is the working detail for the open job(s); the rollout row is one line pointing here.

### engine.29

| engine.29 | Citizen lifecycle & fame system (engine.5 expansion, S248 Mike-direct design) — 4 half-wired pieces: (A) death-by-age 85+ escalating + ClockMode authority matrix (ENGINE/GAME die at 85+, MEDIA/CIVIC no die-off but illness/injury, GAME injuries=Paulson); (B) SL tier fame-decay + the missing demotion path + engine-cultural-output appearance feed; (C) fame-ascension bridge `UsageCount≥30` → linked Cultural_Ledger entry (ledgers disjoint today, no POPID); (D) Cultural_Ledger figure-gen mints full SL citizen. Canon Tier-1 lock reframed as broken-engine scaffolding → ClockMode gating. Each phase its own post-C96 fire (attribution discipline). Decisions D1–D4 locked. **S255 (Mike-direct): D2 revised — all civilians die (MEDIA death recasts the voice in that job; GAME death gated on Retired first); Phase A ride-along = add SL `StatusStartCycle` + `HealthCause` columns (activates dead hospital-duration timers + cause persistence, zero code — engine header-resolves both). Health audit: SL Status is the native illness tracker; Health_Cause_Queue = hospital intake (keep); Health_Civic spreadsheet abandoned.** | parked | engine-sheet | [[../plans/2026-05-30-citizen-lifecycle-fame-system]]; [[ENGINE_REPAIR]] Row 25 |

