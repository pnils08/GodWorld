---
title: Show-Your-Work — engine-fidelity in editions (live-run research)
created: 2026-06-02
updated: 2026-06-02
type: reference
tags: [research, media, civic, engine, active]
sources:
  - Live C96 edition run, civic + media terminals — Mike-observed S252 (the run IS the source)
  - lib/neighborhoodSlice.js — the S245 shared slicer (committed, in git)
  - project_edition-engine-fidelity-seam (MEMORY) — S245 reframe + what was built
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — pending-state home"
  - "[[index]] — register here, same commit"
  - "[[../plans/2026-06-02-show-your-work-build]] — the plan this ignites (to be written)"
---

# Show-Your-Work — engine-fidelity in editions (live-run research)

**Source:** The live C96 edition run, civic (`/city-hall`) + media (`/sift` → `/write-edition`) terminals, observed by Mike during S252. The "source" being mined is the run's own behavior — what the stories did vs. what the engine reported. Mike-shared, live.

**What this addresses:** The recurring seam — **stories are not built from engine output.** Mike has been stuck in both civic and media "for the same reasons." This is the S245 engine-fidelity seam reopened: editions import struggle/framing the engine never reported instead of rendering the city the engine actually computed.

**What it does (current behavior):**

The S245 fix LANDED and is the floor we build from — do not re-solve it:
- `lib/neighborhoodSlice.js` — shared slicer (bounded K-resident notable-first + metrics + cycle deltas + displacement/income). In git, one source so brief + voice paths can't drift.
- `/sift` SKILL carries `neighborhoodState`/`neighborhoodResidents` into enrichment; Step 7 emits a `## NEIGHBORHOOD STATE` block with the data-fidelity guard + anti-pattern #9 ("no asserting a condition the engine didn't report").
- `scripts/buildVoiceWorkspaces.js` — voice path on the shared slicer; the hardcoded `neighborhoodEconomies:'struggling'` OPP filter is **killed**.

**The reframe (Mike S252, confirmed — supersedes the S252 "enforcement-only" hypothesis):** The model **cannot read the engine as a world raw.** "Crime 1, retail 5" is a *coordinate, not a story.* Handed a coordinate and told to write a world, the model does one of two bad things: **invents the world** (West Oakland deprivation against an empty field — the S245 failure) or **hands the coordinate back as a headline** ("retail is 5" — meaningless). Same root both times. The fix is to **present the engine AS a world** — and then both failure modes close.

A world is **arc + cause.** "Retail 5" is dead. "Retail 5, was 3, four-cycle avg 3.4, +2 this cycle because the Stabilization Fund disbursements landed" is a story with a reason and a stake. That is the **Mags_Ledger**: per signal — current, prior, average, delta, and *the engine element that moved it.*

**Two sides, one pipe, two handoffs** (Mike's framing):
1. **Engine-sheet side — Mags_Ledger.** arc+cause computed at the engine, per signal. This is a Mike + engine-sheet build. *(My half does not touch this.)*
2. **Media side — show-your-work brief sections.** The arc+cause rides straight into the brief's show-your-work section, so the agent gets the same traced world — no re-fabrication at either hop. *(This half is mine.)*
They meet at the handoff.

**show-your-work is gate AND fuel** (both jobs, one section):
- **Gate** — stops the model lying. Everything a voice gets must truly tie to engine output; a story with no engine signal behind it doesn't ship. (Positive check, complementary to the existing anti-pattern #9 negative check.)
- **Fuel** — "this jumped because X, so Y is now in play" hands the writer a *cause and a stake.* The agent understands why the story was presented, so the copy reads **lived, not formulaic.** The traced world is what makes a citizen's story feel inhabited.

**KONO is the deliberate exception — error-anchored, not metric-anchored.** A *measured* signal gets tight work: value, arc, cause, no latitude. An **engine error is open by nature** — we don't know what's happening in KONO, so *the crisis IS the not-knowing.* There the work you show is the error itself (blank row, multi-cycle crash, N tracked, population field dark) and the prompt is "this is the issue, make it the crisis, go." Hallucination is *licensed by the error* because the anchor is the documented error, not invented conditions. Don't over-frame an error-crisis.

**Extraction — what's usable** *(each finding → the sim-area / fix it points to. Verified facts tagged ✓.)*

- **Present engine AS a world, never as raw coordinates** → the whole architecture. Root cause of both edition failure modes (invent / parrot). The deliverable on the media side is the show-your-work brief section; on the engine side, Mags_Ledger.
- **Mags_Ledger = per-signal arc+cause record** → engine-sheet build. Each signal carries {current, prior, 4-cycle avg, delta, causing engine element}. Replaces the bare value the brief currently sees.
- **The running per-signal spine is missing — `measurementHistory: []` (✓ verified empty, `engine_audit_c96.json` len 0)** → engine-sheet half. The series isn't captured cycle-to-cycle, so arc can't be computed downstream. Populating this array is the foundational engine-sheet task.
- **Half the arc/cause is ALREADY in `engine_audit` — build on it, don't rebuild** (✓ verified c96): `patterns[]` ships 26 this cycle (21 `improvement` w/ deltas + `stuck-initiative` w/ `cyclesInState` + `evidence` cause + `affectedEntities`); `detectAnomalies.js` emits `historicalContext.priorCycles` + z-score when anomalies fire (0 fired c96). The arc/cause capability exists per-event; what's absent is the *running per-signal* series (the empty `measurementHistory`). Mags_Ledger assembles the spine from these existing emitters.
- **show-your-work brief section = the positive enforcement check** → media build (mine). New section on the brief document that names the engine signal + arc + cause the story is built on. Both gate (no signal → no story) and fuel (cause+stake → lived copy).
- **KONO error-crisis = error-anchored prompt variant** → media build (mine), brief-section special case. For an errored signal, the show-your-work section carries the documented error itself as the anchor; prompt frames the not-knowing as the crisis, hands the agent latitude. Distinct from the tight metric-anchored variant.

**Not applicable / hazard:**
- Not a canon-wording rule. Mike rejected the "ascended-city / deprivation-prohibition" standing-rule approach at S245 (*"the rules already exist"*). The lever is data-fidelity + enforcement, not more prose rules.
- Hazard: don't re-solve S245 (slice already exists). Build the enforcement layer ON the slice, not a second data path.

**Verdict:** `adopt` — ignites the Show-Your-Work build plan. (Provisional until the Extraction section is populated from the run; the failures observed shape the plan's task list.)

**Ignited plans:** `[[../plans/2026-06-02-show-your-work-build]]` (to be written after Extraction is populated).

---

## Applications (living)

- 2026-06-02 — Created during the C96 run; ignites the Show-Your-Work build plan.

---

## Changelog

- 2026-06-02 — Initial scaffold (S252). Live-run research: the run is the source. Seeded with the S245 seam anchor + the enforcement hypothesis. Extraction section open for Mike's run observations.
