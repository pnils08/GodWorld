# Hood-canon wave — adversarial final review (kimi, 2026-09-19)

Read-only. Evidence: `output/engine-sheet/2026-09-19-bench-c108-readouts.md` (C108 control PROD @100 vs treatments on live-synced C107), the six commit diffs re-read line-by-line, the current source, and the live Civis Systems canon check. Verdicts: **fixed / partly / not fixed / trick**.

---

## A. NO TRICK CODE

**Verdict: no trick code found. Four real defects/risks, none of them paint-over.**

**A1. Test weakening — killed, with one convention note.** No assertion was loosened in any of the six diffs: no widened thresholds, no deleted asserts, no `>=` replacing `===` on old semantics. The detectIncoherence tests were rewritten because the semantics changed, and the new 2c/2d tests *codify* the blind behavior rather than hide it. The one hit: five source-text assertions in `hoodBlindTables.test.js` T7/T8 (`!/var neighborhoods = {/`, `/buildHoodClusterAssignment_\(ctx, CLUSTERS\)/` etc.). Context: that file's pre-existing contract style is exactly negative presence-guards (T2/T3 do the same for the weather/crime tables), and the same T7 block carries genuine runtime tests (live-canon profile computation, name-carries-nothing deep-equal, throw-on-blank-label). Acceptable as regression canaries; not evidence of gaming. (Immaterial nit: commit says "10 → 17 tests"; the old file had 6 labeled blocks.)

**A2. Silent degradation — two confirmed, one killed.**
- **CONFIRMED — auditor blind states** (`scripts/engine-auditor/detectIncoherence.js:93-98`): no prior audit → no finding, and the output JSON carries no skip-count or warning, so a blind run is indistinguishable from a clean run. Worse: the fallback `prior.find(cycle-1) || prior[0]` measures direction across an *arbitrary-length* audit gap using single-cycle step thresholds (0.05 sentiment etc.) — slow drift under a gap is invisible, and nothing says so. `detectImprovements.js:35` requires strict cycle-1 and has no fallback — the two detectors are inconsistent. This is the wave's closest thing to "looks fixed while blind": the OARI false-positive is fixed, but the new detector can silently see nothing.
- **CONFIRMED — Logger-only fallback** (`applyCityDynamics.js:1877`): if Phase-1 canon seeding fails, `safePhaseCall_` swallows it to Engine_Errors and the cycle continues — and `buildHoodClusterAssignment_` then runs named-members-only with only an execution-log line, silently restoring the exact lockstep bug 239b exists to fix. The failure is recorded one layer up, but this function's own degradation is quiet. Should degrade loud.
- **KILLED — the retailMod clamp hides signal.** Ran live C107 canon through the real code: spread 0.620 (Ivy Hill) → 1.517 (Jack London); the [0.50, 1.60] clamp never binds. It's a decorative guardrail on present data (sized after the spread was computed — the "none at the cap" test is a canary, not a game). City-mean centering does cancel uniform city-wide swings *by construction*, but a separate city-level channel exists (`baseRetail` off `S.cityDynamics`, :375), so this is intended design, not a wash. One oversell: `HOOD_RETAIL_DEPTH_BAND` [0.93, 1.07] saturates at ~1.5× median employees — Downtown, Jack London, Piedmont Ave, Baylight, West Oakland are all pinned at the +7% cap, so "employer depth moves retail" is live for only 17 of 22 hoods.

**A3. HOOD_CHARACTER_MODS — a hand table, but the permissible kind. PARTIAL.** Yes, it's 17 rows of code-author numbers with no external provenance, and I recomputed: it was evidently sized so the retired table's *means* held (old nightlife/noise/event means 0.89/0.88/0.85 vs new 0.85/0.89/0.83). But it is keyed by `Neighborhood_Map.EmployerCharacter` — a sheet-authored canon column (engine.135 B1, no engine writer exists) that many hoods share — no row names a hood, blank/unknown labels throw, and the runtime test proves same-canon ⇒ same-profile. Crucially it is not a paint-over: the *ranking* actually changed (West Oakland retail 22nd → 9th on bench). Under §17's letter ("a hood-name-keyed numeric table on the cycle path is a canon violation") it's legal. Under its spirit, it's the new home of hand-tuning: the numbers are someone's judgment of what "port-industrial" feels like. Recommend a per-label canon rationale comment at minimum, and builder awareness that this layer is authored, not derived.

**A4. growCrimeSeed.js — real code, asserted equilibrium. Mostly killed.** It vm-loads the genuine `updateCrimeMetrics.js` + `ensureCrimeMetrics.js` and stubs only the sheet boundaries — not a copy, so it can't drift from the model. Inputs are live reads. Two honest gaps: (a) **equilibrium is asserted, not measured** — no convergence check, no N-vs-2N comparison; the math is on its side (REVERT_RATE 0.04 ⇒ ~17-cycle half-life, 150 cycles ≈ 9 half-lives) but the seed is one noisy draw grown under frozen weather/season/zero world events — a perpetual-quiet-world equilibrium; (b) the seed JSON shows most hoods' newQol = exactly the 45 median — the recalibration *flattened QoL into the canon record* (see B-still-broken). Application side is clean: `writeCrimeRecalibration.js` wrote levels + rounded indices with read-back; `writeCrimePrevReadings.js` computes exactly "new level + hood's own C107 swing" with a hard refuse-if-drifted guard (:22) and read-back. Corroborated by the readouts (9 all-falling ≥5pt shifts → 2 mixed-direction crossings).

**A5. General sweep** — no TODOs, commented-out checks, or dead branches in the six diffs; phase-order swap safety verified (zero `S.neighborhoodState` reads in applyCityDynamics pre-swap); `hoodCrimeBar_` degenerate case safe (Infinity, nothing fires).

---

## B. THE FIX FIXES WHAT WAS BROKEN — verdict per item

**1. West Oakland retail 22/22, Temescal 2nd, against canon → FIXED.**
Control @100: West Oakland 3.42, 22nd of 22; Temescal 8.07, 7th. Treatment @101 (readouts :85-106): West Oakland 7.92, **9th**; Temescal 4.97, 18th; Jack London 10.51 top. The numbers now derive from canon columns (EmployerCharacter × income × BoomIndex × employer depth). Live on PROD @101. Caveat carried from A3: the label→factor layer is authored judgment.

**2. Ten hoods sharing the city mood in lockstep → PARTLY.**
Mechanism verified in code (cluster adoption via sheet adjacency + sentiment floor from persisted canon). At C108 the adopted hoods hold distinct values (T3: Eastlake 0.15, East Oakland 0.19, Dimond 0, Ivy Hill 0.03). But lockstep is a *multi-cycle* property — one bench cycle cannot prove they now move independently. The T2-vs-T3 diff also shows the floor doing real work (without it the first-tracked cycle threw Dimond to −0.24 against a ~0.02 city). Close it with a multi-cycle bench read showing divergent trajectories.

**3. Papered-over storefront lines in 13 hoods → PARTLY.**
The gates are now city-relative in code (pressure bar, retail median ×1.25/×0.75, `hoodCrimeBar_`, mood median ±0.15) and the post-fix retail spread (0.62–1.52) means the bars can genuinely discriminate. But no bench readout shows citizen life-lines per hood — the evidence is mechanism + hoodBlindTables 15/15, not observed output.

**4. OARI called incoherent every morning while its hoods improved → PARTLY.**
The new rule (wrong side of city median AND moving the wrong way, active in both snapshots, streak-counted) is the right one and the false-positive mechanism is gone. But A2's blind states stand, and the real proof is the next live audit run, not the bench. Also noted: the council-approval half of the same detector still uses absolute cuts (approval ≥0.7, sentiment ≤0.35) — untouched by this wave, reachable on live data.

**5. Crime hotspots = the real-Oakland West/East Oakland/Downtown map → FIXED, with seed caveats.**
Treatment 4 (post-recalibration, live C108): property levels 32.7–45.81 with **Temescal highest (45.81)**, Downtown 37.06, West Oakland 37.2 mid-table; violent led by East Oakland (33.31), Downtown 21.04. Hotspots flagged: **none**. Neighborhood_Map CrimeIndex leaders are Dimond/East Oakland (0.66); West Oakland 0.58 sits mid-pack. The real-Oakland map is gone from the live record. Caveats: seed equilibrium asserted not measured, grown under frozen weather/season/no-events (A4), and QoL was flattened by the same seed (below).

**6. Child-area employers invisible to their parent → PARTLY.**
The fold is verified in code (commute matrix + `S.hoodEmployerDepth` both through `resolveHoodOrChild_`; Downtown's 6,739 depth now includes its children) — but the readout table doesn't surface commute/depth numbers, so the bench evidence is indirect (Jack London top-retail at 10.51 is consistent with Brooklyn Basin folding in). Code-verified, bench-unshown.

**7. Civis Systems storyline (Storyline_Intake row 363) → PARTLY.**
The row exists, created C108, priority high, Elias Varek attached — the world reacting to West Oakland's corrected reading, and Civis is confirmed West Oakland canon (BIZ-00052). But the row's `Neighborhood`, `Title`, and `StorylineId` are all **empty** — either downstream fills those, or the intake wrote a sparse row. Worth one look before calling it evidence of life.

---

## Still broken — this wave did not fix

1. **City Sentiment ~0.02 at C108, both control and treatment.** The city-level mood channel is near-zero and nothing in this wave touches it. Whatever pins it there is still in place.
2. **QolLevel flat ~45 — and now canonized.** QoL causes barely differentiate, so the grown seed wrote ~45 for most hoods into the live record. The recalibration made the flatness *legitimate* without making it *true*. QoL needs its own differentiating causes or it stays a scenery column (§16).
3. **Employer-depth band saturation** (A2): the five biggest-employer hoods are capped at +7% — hiring/closing moves retail only in the 17 small-employer hoods.
4. **Auditor blind states** (A2): no-prior = silent blindness; arbitrary-gap fallback reads multi-cycle drift with single-cycle steps; council-approval half still absolute.
5. **The seven hood pins from my earlier review stand** (`output/kimi/2026-09-19-hood-canon-review.md`): FACTORY_CLOSURE → West Oakland, the 8-hood MEDIA_NEIGHBORHOODS exclusion, the recordWorldEventsv3 domain pools, and the texture pins. Highest-value next cuts, in that order.

## Bottom line

No trick code. The wave genuinely changed the world (retail ranking, crime map) rather than the appearance of it, and every mechanism traces to canon columns or city-relative math. The honest gaps are four: two silent-degradation paths (auditor, cluster fallback), an asserted-not-measured crime equilibrium grown in a perpetual-quiet world, and a QoL column whose flatness is now canon-stamped. B-items 2, 3, 4, 6 need one more evidence layer (multi-cycle bench, life-line readout, tomorrow's live audit) before they earn "fixed."

— kimi, 2026-09-19 (read-only; no commits, no engine edits)
