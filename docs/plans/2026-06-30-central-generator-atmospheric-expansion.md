---
title: Central Generator → Atmospheric Layer for All Citizens Plan
created: 2026-06-30
updated: 2026-06-30
type: plan
tags: [engine, citizens, events, coverage, draft]
sources:
  - docs/engine/ENGINE_COUPLING_MAP.md §generateCitizensEvents (FULL-READ verified)
  - "Live baseline S277 (this session): scripts/auditSimulationLedger.js + LifeHistory_Log C100 tally"
  - "Mike directive S277 (2026-06-30): extend central generator to everyone, atmospheric-only, raise per-cycle volume"
  - "Mike directive S280 (2026-07-01): depth step — story-seeding + 24/7-reflection rubric; outside-LLM addition-ideas intake"
  - "Outside-LLM idea folder (Mike, read+graded S280): https://drive.google.com/drive/folders/13S8tW5-0nx4i-kQwsXfDqM-AjrpilWiQ (9 files: GPT×4, DeepSeek, Kimi, Grok×2, Gemini, + synthesis MD)"
pointers:
  - "[[../engine/ROLLOUT_PLAN]] §engine.38 — parent rollout row (this is engine.38 Phase A continuation, NOT a new track)"
  - "[[2026-06-19-living-city-full-population-coverage]] — engine.38 plan (Phase A shipped; this finishes the mode-citizen + volume piece)"
  - "[[../engine/ENGINE_COUPLING_MAP]] — generator behavioral map"
  - "[[SCHEMA]] — doc conventions"
  - "[[index]] — registered same commit"
---

# Central Generator → Atmospheric Layer for All Citizens Plan

**Goal:** `generateCitizensEvents` fires atmospheric (non-canon-altering) events for **every** citizen, a random **1 to N** per citizen per cycle (N≈6–8, perf-gated), so coverage → ~100% and per-citizen life texture deepens — without contradicting canon owned by the stakes engines.

**Architecture:** Today `generateCitizensEvents` is gated to *named (T1/T2 any mode) + ENGINE T3/T4* and capped at ≤1 emit/citizen/cycle. It was gated because its pools include **canon-breaking / structural-implication** flavor (job change, moved out of town, retirement, role change) that collides with non-ENGINE citizens' canon roles and with the engines that actually own those transitions (career / generational / civic). This plan (1) splits the generator's event content into an **atmospheric-safe core** (weather, neighborhood, daily life, community, seasonal, holiday — emits texture, never implies a structural change) vs **structural/role pools** (kept ENGINE-only), (2) extends the atmospheric core to all 922 citizens, and (3) replaces the ≤1/citizen cap with a per-citizen random count 1..N. Atmospheric events should also read as legible, reflectable "fun concepts" for the 24/7 citizen-loop to pick up and mirror.

**Terminal:** engine/sheet (build) — **with a research-build design seam** on the atmospheric-vs-canon taxonomy (Task 2).

**Pointers:**
- Prior work: `docs/engine/ENGINE_COUPLING_MAP.md` (generateCitizensEvents entry — ~20 pool sources, dial-weighted selection, ≤1/citizen, gate `isNamed ∪ ENGINE T3/4`)
- Related: the 6 stakes engines own the structural transitions this layer must NOT emit (career→job, generational→wedding/birth/death/retirement, civic→role)
- 24/7 loop: citizen-loop reads col-O / LifeHistory and reflects it (Five Goods voices)

---

## Baseline (live, C100 — captured so it isn't re-derived)

**Population (922 citizens, `auditSimulationLedger.js` 2026-06-30):**

| | T1 | T2 | T3 | T4 | total |
|---|---|---|---|---|---|
| ENGINE | 4 | 38 | 83 | 612 | 737 |
| GAME | 14 | 5 | 68 | 5 | 92 |
| CIVIC | 1 | 9 | 36 | 4 | 50 |
| MEDIA | 2 | 12 | 26 | 3 | 43 |

Status: Active 874 / pending 37 / Retired 8 / deceased 3. LifeHistory populated 839/922 (91%) → **83 citizens never had an event**.

**C100 fired: 877 events, 784 distinct citizens. Coverage 781/922 = 84.7%. Dark = 141.** ≈0.95 events/citizen (the ≤1/citizen ceiling).

**Dark cohorts (the 141):** T3/GAME 62 (9% covered), T3/CIVIC 24 (33%), T3/MEDIA 22 (15%), + ~9 T4 non-ENGINE + ~24 ENGINE stragglers. All T1/T2 ~100%; ENGINE T3/T4 ~97–98%. **The hole is non-ENGINE T3/T4 served only by thin mode engines (4–20% base).**

---

## Acceptance criteria

1. After deploy, an atmospheric event can fire for **any** citizen regardless of ClockMode/Tier (active, non-deceased) — coverage of the atmospheric layer → ~100% of eligible.
2. A re-run tally shows per-citizen event count is a **random 1..N** (not fixed 1), N tuned to what a cycle run can handle without timeout/quota failure.
3. **Zero canon-breaking emissions for non-ENGINE citizens:** no atmospheric event implies a job change, relocation, retirement, role change, marriage, or death for a citizen those transitions are owned elsewhere. Verified by inspecting emitted tags/text for mode citizens post-run.
4. Atmospheric events are legible to the 24/7 citizen-loop (clean tag + readable text), not raw slotter-metadata noise.
5. Cycle run completes within current runtime/quota envelope at the chosen N (perf gate passed).

---

## Tasks

### Task 1: Audit generateCitizensEvents pools — classify atmospheric vs structural/canon-risk
- **Files:** `phase05-citizens/generateCitizensEvents.js` — read (full)
- **Steps:**
  1. Full-read every pool/template source it assembles (base/seasonal/weather/chaos/sentiment/econ/holiday/firstFriday/creationDay/sports/occupation/fame/age/alliance/rivalry/mentorship/arc/continuity/prevEvening/nbhdState/faith).
  2. Classify each into **atmospheric-safe** (texture, no structural implication) vs **structural/role** (career/occupation transitions, role-specific, anything implying a life change another engine owns).
- **Verify:** classification table written into this plan (or a sibling note); every pool labeled. No code change yet.
- **Status:** [x] DONE S277 — see §Task 1 findings. All pools atmospheric-safe; one guard (occupation pool); de-risked by the existing T1/T2 mode-citizen carve-out.

### Task 2: [research-build design seam] Define the atmospheric-safe rule + canon-safety taxonomy
- **Files:** design note (research-build) → feeds this plan
- **Steps:**
  1. Define the invariant: an atmospheric event may describe what a citizen *does/feels/observes* in a day, never a change to *what they are* (employer, residence, marital status, role, life/death). Those are stakes-engine-owned.
  2. Decide handling of the occupation/career-flavor pools for non-ENGINE citizens (drop vs neutralize to ambient).
  3. Confirm "fun concept" legibility target for the 24/7 loop.
- **Verify:** written rule + per-pool disposition agreed with Mike before code change.
- **Status:** [x] DONE S277 — see §Task 2 findings below.

#### Task 2 findings — invariant + disposition (DONE S277)

**Invariant:** an atmospheric event may describe what a citizen *does/feels/observes* in a day, never imply a change to *what they are* (employer, residence, marital status, role, life/death) — those transitions are stakes-engine-owned (career/generational/migration/civic).

**Occupation pool disposition — the only mode-collision in the file.** Read `occupationPoolFor_` (L1090) + its call site (L1461-1466): currently unconditional on mode, gated only on `if (occupation)`. For ENGINE-mode citizens, the `Occupation` column *is* their canon job — safe, stays. For GAME/CIVIC/MEDIA citizens, work/role identity is owned by their mode engine (athlete career / civic office / journalist), and `Occupation` is the legacy/generic field with no guarantee it's synced to their actual canon role — a civic official whose `Occupation` cell still reads a pre-office service job would draw a contradicting "had a work moment as a [stale job]" event. **Disposition: guard to ENGINE-only** — `if (occupation && mode === "ENGINE")` before the L1461 call. Task 3 implements this as the one pool restriction; no other pool needs a mode branch.

**Sports pool checked, no guard needed.** `sportsSeasonPools` (L1175, called L1454-1459) is generalized city-fandom texture ("followed the late-stage run closely") — not team/role-specific, doesn't claim the citizen plays — safe for every citizen including GAME-mode.

**Legibility (step 3):** the existing `primaryTag` extractor (L545-571) already derives a clean category (`Work`/`Sports`/`Weather`/etc.) separate from the full slotter-metadata tag string — a clean-tag path for the 24/7 loop already exists structurally. Whether the wake-reader consumes `primaryTag` vs the raw tag string is a Task 7/AC4 implementation question for engine-sheet, not a Task 2 blocker.

**Net: Task 3 is now a one-pool guard, not a taxonomy rebuild.**

### Task 3: Gate the structural pools ENGINE-only; expose atmospheric core to all
- **Files:** `phase05-citizens/generateCitizensEvents.js` — modify
- **Steps:**
  1. Branch pool assembly: atmospheric core available to all eligible citizens; structural/role pools restricted to ENGINE (preserve current ENGINE richness).
  2. Keep ctx.rng (no Math.random), write-intents discipline, recordPulse couplings intact.
- **Verify:** dry-run / test fixture shows mode citizens draw only atmospheric pools.
- **Status:** [x] DONE S277 — occupation pool guarded `occupation && mode === "ENGINE"` (the one Task-2 collision). No other pool needed a mode branch. Syntax-clean; functional verify = the Task-6/7 cycle run.

### Task 4: Remove the mode/tier eligibility gate for the atmospheric layer
- **Files:** `phase05-citizens/generateCitizensEvents.js` — modify (gate `isNamed ∪ ENGINE T3/4`)
- **Steps:**
  1. Open eligibility to all active non-deceased citizens for the atmospheric core (retain exclusions: deceased, and any class that must stay out).
- **Verify:** re-run tally → dark cohorts (T3 GAME/CIVIC/MEDIA) now covered.
- **Status:** [x] DONE S277 — removed `if (!isNamed && mode !== "ENGINE") continue;` (kept the T1–4 restriction). Added `iStatus` index + a deceased skip. **Measure-twice finding:** live read shows **every non-Active citizen is ENGINE** (pending 37 / Retired 8 / deceased 3, all ENGINE) — so opening the mode gate admits *only Active non-ENGINE* citizens (zero resurrection risk), and the deceased guard also closes a pre-existing latent inclusion of deceased ENGINE citizens. **RESOLVED (Mike, S278):** pending (37) + Retired (8) both keep drawing atmospheric events — confirms shipped behavior (occupation/work-texture pool separately guarded off for retired via `status!=="retired"`, S277 commit `4d86ace1`; the atmospheric core stays for both cohorts).

### Task 5: Replace ≤1/citizen cap with random 1..N per citizen
- **Files:** `phase05-citizens/generateCitizensEvents.js` — modify
- **Steps:**
  1. Per citizen, draw event count = random integer 1..N via ctx.rng (N from Open Questions, perf-tuned). Anti-repeat filter must still apply across the multiple draws.
- **Verify:** tally shows per-citizen counts distributed 1..N; anti-repeat holds (no duplicate text within a citizen's cycle).
- **Status:** [x] DONE S277 — wrapped pick→render→emit→remember in `for (ev=0; ev<eventCount; ev++)` where `eventCount = 1 + floor(roll()*ATMOSPHERIC_MAX_EVENTS)` (1..N, ctx.rng — no Math.random). **Anti-repeat hardened:** the soft `filtered.length>=6 ? filtered : pool` fallback re-admitted `mem.recentTexts`; added a hard `cycleSeen` set so no line repeats *within* a citizen's cycle even on the fallback path (advisor catch — the soft filter did NOT dedup for free). `break` when the fresh pool is exhausted. col-O appends per draw; `recordPulse_`/`activeSetObj`/`count` fire once per citizen; `S.eventsGenerated` per emit. **N=ATMOSPHERIC_MAX_EVENTS=4** (conservative; Task 6 tunes toward 6–8 after perf). Functional verify = Task 6/7 cycle run.

### Task 6: Perf + storage gate
- **Files:** cycle-run harness; `LifeHistory_Log` growth check; compressor (`utilities/compressLifeHistory.js`)
- **Steps:**
  1. Estimate worst-case volume (922 × N) vs current 877; confirm cycle runtime, sheet-write, and quota stay in envelope. Confirm the col-O fold-on-trim compressor + LifeHistory_Log growth are sustainable at N.
  2. Set N to the largest value that passes.
- **Verify:** full cycle run completes clean at chosen N; no timeout/quota fail; LifeHistory_Log growth acceptable.
- **Status:** [ ] not started

### Task 7: Re-baseline + verify acceptance
- **Files:** the C100-style tally (this session's inline read pattern)
- **Steps:**
  1. Re-run the coverage + volume + tag-hygiene tally after deploy.
- **Verify:** AC 1–5 all pass.
- **Status:** [ ] not started

---

## Task 1 findings — pool classification (DONE S277, full-read `generateCitizensEvents.js` v2.8, 1830 lines)

**Headline: this generator is already atmospheric-safe. The canon-breaking events Mike remembers are NOT emitted here.**

- **No structural mutation.** The generator writes *only* col-O `LifeHistory` (L1709) + a `LifeHistory_Log` row (L1712–1722). It never touches `MaritalStatus`/`Status`/`EmployerBizId`/`Neighborhood`/role columns. So "mayor retired / moved out of town / took a new job" **cannot originate here** — those are `generationalEventsEngine` (retirement/death/wedding), `runCareerEngine` (job change), `migrationTrackingEngine` (displacement). This file is texture-only.
- **All ~25 pools are observational atmosphere** — safe to extend to everyone:
  - base/daily, seasonal, weather (weatherPool + weatherV35Pool_), chaos, sentiment, econ, QoL, patrol, prevEvening (incl. city-event fan-out), neighborhoodState (rent/retail/watchful/mood), faith, neighborhoodPools, holiday, firstFriday, creationDay, sports (generalized — no teams), age, alliance/rivalry/mentorship (bond-gated), arc (arc-gated), continuity, fame (recognition), template/tone-slotter. None imply a change to *what the citizen is*.
- **The one canon-risk pool: `occupationPoolFor_` (L1090)** — keyed to the `Occupation` column, draws from 12 hardcoded service jobs (Barista/Server/Cook/… L609–622). For a MEDIA/CIVIC/GAME citizen whose canon role isn't one of those, it could emit mismatched work texture — but it **self-limits** (returns empty unless Occupation matches one of the 12). Guard in Task 3: skip the occupation pool (and the `Work`/`Sports` source tags) for non-ENGINE citizens, whose mode engine already owns their work/role beats.
- **De-risk proof:** the named carve-out (L1230, `isNamed = tier 1||2`) **already feeds this exact atmospheric content to T1/T2 GAME/MEDIA/CIVIC citizens** — journalists, athletes, officials — at ~100% coverage today, with zero canon-break flags. Extending the same core to T3/T4 mode citizens is therefore **proven-safe by the existing path**, not a leap. Task 2 shrinks from "rebuild a taxonomy" to "add the occupation/Work-tag guard for non-ENGINE + confirm no other mode-specific collision."
- **Gate to change (Task 4):** L1229–1232 — specifically `if (!isNamed && mode !== "ENGINE") continue;` (L1232) is the line excluding the 141 dark mode-T3/T4.
- **Volume mechanic (Task 5):** the loop emits exactly ONE `pickWeighted_` per citizen (L1633 → L1705–1722). The ≤1/citizen ceiling is structural (one pass). Lever = wrap pick→render→emit→`remember` in a random 1..N loop; the existing anti-repeat filter (`mem.recentTexts`, L1619–1631) already dedups across draws, so multi-draw needs no new dedup. `recordPulse_` (L1728) would fire per emit — confirm pulse scaling in Task 6.

## Open questions

- [x] **N (max events/citizen/cycle)** — `ATMOSPHERIC_MAX_EVENTS=4`. Mike confirmed S277: "4 is a good start since there are other engines still." Holds at 4; revisit only if depth/coverage demands.
- [x] **Atmospheric-vs-canon taxonomy** — Task 2 done (occupation pool ENGINE-only; all else safe).
- [x] **Lever 2** — NONE. Mike S277: the "2." was a stray digit after "1", not a second directive. Closed.
- [x] **Retired status** — Mike S277: retired citizens still get events, but retirement changes what they get → excluded from the occupation work-texture pool, keep the rest of the atmospheric core. Done. (Retirement-*flavored* leisure content = the depth step, deferred.)
- [ ] **pending status** — 37 ENGINE T4, flagged as Status-*drift* (not a clean lifecycle state), currently drawing events. Not yet ruled on by Mike — left eligible.
- [ ] **Depth ≠ volume (advisor, S277):** Tasks 3–5 raised *coverage + volume* from the **same ~25 pools** — more draws = more repetition of existing content, NOT deeper content. The pool-deepening step Mike named ("this wasn't the deepen-the-pool step yet") is still open and is now *more* pressing.
- [ ] **Volume scope** — coded uniform 1..N for all citizens (no higher floor for previously-dark cohorts). Revisit if dark-cohort depth needs a boost.
- [ ] **EventTag hygiene** — column still stores full slotter-metadata; `primaryTag` extractor already exists for a clean 24/7-loop tag (AC4). Wire the wake-reader to `primaryTag` in Task 7 if needed.

## Inherited constraints from engine.38 (do not re-litigate — carry forward)

- **Convergence risk (advisor, engine.38):** raising event *volume* converges citizens toward the content pole unless *valence* diverges them (engine.38 Phase B). **Mitigant here:** this layer is **atmospheric = composure-neutral**, and engine.38 explicitly states "texture-coverage is composure-neutral (Phase A parallelizes while Phase B lands)." So atmospheric volume scaling is parallel-safe *provided the events stay composure-light* (Task 2 must keep them off the affect/composure-writing path). If any atmospheric event writes composure, it re-enters the convergence problem and is gated on Phase B.
- **G-EC33 sentiment-uniformity watch:** sentiment moved citywide-lockstep through C100; a fix shipped S273 (per-hood base), watch runs to C101 for divergence. engine.38's B3 ordinary-bad emission was HELD so as not to confound that watch. This atmospheric layer is sentiment-neutral (texture, not sentiment-writing), so it should not confound G-EC33 — confirm in Task 1 that no atmospheric pool writes neighborhood sentiment.
- **Compressor capacity:** engine.38 flagged "verify compressor capacity at ~5-6× volume." At N=6–8 we hit ~6–8× — Task 6 must confirm `compressLifeHistory_` fold-on-trim + LifeHistory_Log growth hold at that multiple.

---

## Depth step — pool-deepening (opened S280, Mike-directed)

**Rubric (Mike, S280):** dial folding is depth-indifferent (any event moves a dial), so depth is graded on two downstream consumers: (a) **story seeding** — event text tied to real engine output gives desk agents concrete hooks; (b) **24/7 loop reflection** — a citizen reading their own LifeHistory needs specifics to reflect on *themselves and the city*. The sweet spot is both at once.

### Pool inventory (full-read S280, v2.8 in-tree)

**Tier A — already at the sweet spot (pattern proven, needs siblings):**
- `previousEveningPool_` — names actual city events (attend vs heard-about by outabout band), famous sightings, food/streaming trends, hotspots. Best content in the file.
- `neighborhoodStatePool_` — gentrification/displacement/retail/crime/mood from real Neighborhood_Map values, hood named.
- `faithPool_` — names the actual congregation + event type, same-cycle.
- `weatherV35Pool_` — microclimate divergence naming the hood.
- Tone-slotter templates — real contact name, real venue, citizen motifs, profile-derived tone.

**Tier B — engine data in hand, text throws it away (highest-value fixes, no new wiring):**
- `chaosPool` — holds the cycle's real chaos/world events, emits "reflected briefly on today's city happenings." Name the event. **First fix.**
- `sentimentPool` / `econPool` — 2 vague lines each off real dynamics values; no driver named.
- `qolPoolFor_` / `patrolPoolFor_` — real QoL index + patrol strategy, small banded pools.

**Tier C — real gates, generic payoffs:**
- alliance/rivalry/mentorship/arc pools — fire only on real bonds/arcs but never name the counterpart or the arc. Bond ledger has the names. "Traded words with [rival name]" seeds a story; "felt a flicker of tension" doesn't.
- Static thin pools: baseDaily (6 lines, every citizen every cycle), seasonal (1/season), age (2/group), holiday (3/each), neighborhoodPools (3/hood), sports (3/phase).

**Missing pools (city-reflection gaps):** initiative/council-vote texture (Initiative_Tracker never reaches citizen texture); Tribune-readership events (dial map already routes `E\d+` edition-citation tags → sociability:2 — dial side exists, no emitter); Baylight construction; named business open/close; retirement-flavored leisure (deferred here from the retired refinement).

### Build order (S280, outside-LLM adds folded in)

1. Tier B: name what's already in hand — chaos first, then sentiment/econ drivers.
2. Tier C bonds/arcs: put the real counterpart name + arc reference in the text.
3. **Human-domain moments rebuild of baseDaily** (GPT add) — replace the 6 generic lines with domain pools every citizen can draw: Family / Home / Reflection / Curiosity / Community / **Identity** ("didn't recognize themselves in an old photograph"-class). Moments, not events: what the citizen will *remember* about the day.
4. **Listening-texture pool** (Kimi add, anonymous form) — observed-stranger moments turned inward ("saw someone repairing a fence for an hour; wondered when they last finished anything"). No cross-citizen wiring; pure texture.
5. New engine-tied pools: civic/initiative texture, Tribune readership (dial route `E\d+` exists, no emitter), Baylight construction, **bias-lite opinion texture about named public figures** (rides existing fame data — "formed an opinion about [T1 name]" class; no schema).
6. **Groove/routine texture lines** (Gemini add, content only) — the gravity of autopilot ("realized the week had passed without a single thing worth retelling"). Composure-light.
7. Widen remaining static filler last + retirement leisure content.

**Style rule for all new content (sensory anchors, synthesis-doc add):** write pool text with a sensory grounding where natural — a smell, a sound, a texture. A style discipline, not a system.

All additions stay inside the Task-2 atmospheric invariant (does/feels/observes — never what they are), composure-light per the engine.38 convergence constraint.

### Open design question — shared event-content ledger (Mike, S280)

Hardcoded pools mean deepening = editing many files; the mode engines are thin for exactly this reason. Proposal to evaluate: a sheet-tab content ledger (text, pool/category, weight, eligibility conditions) loaded once per cycle into ctx, drawn by **all** generators — centralizes depth, Mike-editable without deploys. Cost: +1 sheet read/cycle, tab-drift failure mode, schema design. Disposition: this session's deepening lands in code; the ledger is the candidate architecture for the **mode-engine depth-parity block** and wants a research-build design pass before build.

### Outside-LLM idea intake (Mike, S280) — GRADED

**Resource (tagged):** Mike's Drive folder of outside-LLM addition-ideas — https://drive.google.com/drive/folders/13S8tW5-0nx4i-kQwsXfDqM-AjrpilWiQ — 9 files read S280: `Gpt630_.txt`/`_1`/`_2`/`_3`, `Deepseek630.txt`, `Kimi630.txt`, `Grok630_1.txt`/`_2.txt`, `Gemini_630_Additions.md`, + synthesis `GodWorld: Analysis and Strategic Recommendations.md`. Graded add/adapt/skip vs rubric + atmospheric invariant + dial-mechanism invariants.

**ADD (folded into build order above):**
| Idea | Source | Landing |
|---|---|---|
| Moments-over-events + human domains (Family/Home/Reflection/Curiosity/Community/Identity) | GPT `Gpt630_1.txt` | Build item 3 — baseDaily rebuild. Centerpiece of the folder. |
| Listening layer → anonymous observed-stranger texture | Kimi `Kimi630.txt` | Build item 4. Tracked "listening debts" version deferred (needs persistence). |
| Sensory anchors → style rule | synthesis doc §3 | Style rule above (demoted from system to discipline). |
| Groove/routine texture | Gemini §6 | Build item 6, content only. Dial-locking mechanic skipped. |
| Asymmetric bias → bias-lite opinion texture on named public figures | GPT `Gpt630_3.txt` / synthesis §1 | Build item 5. Full bias persistence → research-build seam below. |

**ADAPT — research-build design seams (tagged research-build; NOT engine-sheet work; same design pass as the shared event-content ledger):**
- **Asymmetric bias ledger** (GPT_3/synthesis §1) — per-citizen `biases` records (target/sentiment/origin/reinforced/challenged); history between citizens who never met. Schema + memory design.
- **Tension register** (DeepSeek) — unresolved questions stored alongside memory, resurfaced in wakes; second-order reflection. Persistence design; texture-only version rides build item 3 (Reflection/Identity domains).
- **Unlived-life register** (Kimi) — paths not taken that resurface when the current life rhymes. Caution logged: invented specifics = pseudo-canon; must derive from actual LifeHistory or stay vague.
- **Resonance-weighted recall** (GPT_/_2) — weighted memory resurfacing for the 24/7 wake-reader (resonance × time-since-recall × dial affinity × context match). Loop-side, not generator-side.

**SKIP (with reasons — Mike pre-flagged the dial one):**
- **Identity crisis / forced dial shifts** (Grok_2, synthesis §2) — breaks the core dial invariant: `base` moves only via sustained streak-hardening (0.4/streak≥3); a dissonance-triggered forced shift is a second unearned write-path to identity. Mike's "pretty unrealistic" flag confirmed by mechanism read.
- **Emotional-weather contagion** (Kimi) — parallel mood substrate + citizen-to-citizen contagion = the engine.38 convergence trap (volume/valence work exists to DIVERGE citizens); hood-sentiment pools already deliver the readable version.
- **Memory reconsolidation with new dial effects** (GPT_2) — compressor folds each event exactly once by design; re-firing = double-count. Voice-level reinterpretation already free (loop reads old history through current dials).
- **Engine of Forgetting / semantic phantoms** (Gemini §5) — already built: fold-on-trim IS episodic→semantic conversion. External validation, zero work.
- **Becoming ledger** (Grok_1) — machine-synthesized self-concept prose competes with the earned-essence rule (engine.30 killed machine-written CitizenBio). The O→R→AT loop already carries this shape.
- **Legacy/inheritance pipeline** (synthesis §4) — generationalEventsEngine owns lineage cascades; memory-fragment inheritance deferred with the other persistence seams.

---

## Changelog

- 2026-06-30 — Initial draft (S277). Lever 1 of citizen-event work; baseline captured from live C100 tally. Lever 2 + design taxonomy pending.
- 2026-06-30 — Task 2 DONE (research-build, S277). Atmospheric invariant defined; occupation pool is the only mode-collision (guard to ENGINE-only); sports pool checked safe; legibility path (primaryTag) already exists. Task 3 narrowed to a one-pool guard. Lever 2 still open (Mike's directive).
- 2026-06-30 — Retired refinement (engine-sheet, S277). Occupation work-texture pool now also excludes `Status==="retired"` (Mike: retirement changes what they get) — retired keep the atmospheric core, lose work-shift events. Lever 2 confirmed NONE (stray digit). N=4 confirmed by Mike. Retirement-flavored leisure content deferred to the depth step.
- 2026-06-30 — Tasks 3–5 DONE (engine-sheet, S277). `generateCitizensEvents.js`: occupation pool guarded ENGINE-only; mode gate removed (all active T1–4 eligible); deceased excluded; volume → random 1..`ATMOSPHERIC_MAX_EVENTS`(=4) per citizen with hard within-cycle dedup; `recordPulse_` once-per-citizen. Syntax-clean (`node -c`). Measure-twice: all non-Active citizens are ENGINE (gate-open is resurrection-safe). HELD: N stays 4 until Task 6 perf gate; pending/Retired exclusion + Lever 2 await Mike; functional verify (Tasks 6–7) needs a cycle run (clasp). Advisor flagged volume≠depth — pool-deepening still open.
- 2026-07-01 — Depth step opened (engine-sheet, S280). Rubric defined (story seeding + 24/7-loop reflection); full pool inventory graded into tiers A/B/C + missing-pool list; build order proposed (Tier B name-what-you-hold first); shared event-content ledger logged as open design question (candidate architecture for the mode-engine depth-parity block, research-build seam); outside-LLM idea intake protocol set (grade add/adapt/skip against rubric + invariant).
- 2026-07-01 — Outside-LLM intake GRADED + folded (engine-sheet, S280). 9 Drive files read (source-tagged in frontmatter). 5 adds folded into build order (GPT human-domain moments = centerpiece baseDaily rebuild; Kimi listening-texture anonymous form; sensory-anchor style rule; Gemini groove texture content-only; bias-lite opinion pool). 4 adapts logged as research-build seams (bias ledger, tension register, unlived-life register, resonance recall — same design pass as the content ledger). 6 skips with mechanism reasons — headline: forced dial shifts (Grok identity-crisis) rejected, confirms Mike's flag; breaks streak-hardening invariant. Gemini's "Engine of Forgetting" found to be already-built (fold-on-trim) — external validation.
