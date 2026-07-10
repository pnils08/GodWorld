---
title: v4 Story_Seed_Deck content → /sift candidate-gen — research
created: 2026-07-06
updated: 2026-07-06
type: reference
tags: [research, media, sift, engine, active]
sources:
  - phase10-persistence/saveV3Seeds.js — SEED_DECK_HEADERS (v4 deck schema, 15 cols)
  - phase07-evening-media/buildContractSeeds.js — contract-seed writer (What/Desk/etc.)
  - git 9d96aa24 — "contract seeds wired into buildDeskPackets" (S301, engine-sheet)
  - .claude/skills/sift/SKILL.md §Step 3 (candidate generation) + v2.2 fix (git 4060fe7f)
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — pipeline.42 (pending-state home)"
  - "[[index]] — registered here, same commit"
  - "[[../SCHEMA]] — doc conventions"
---

# v4 Story_Seed_Deck content → /sift candidate-gen — research

**Source:** The v4 `Story_Seed_Deck` schema — `SEED_DECK_HEADERS` in `phase10-persistence/saveV3Seeds.js` + the contract-seed writer `phase07-evening-media/buildContractSeeds.js`, wired into the packet builder in git `9d96aa24` (S301, engine-sheet). Columns: `Cycle, SeedID, Desk, Class, Domain, Neighborhood, What, Why, Citizens, CitizenEvents, Businesses, OtherEntities, Magnitude, Trend, CycleStamp`.

**What this addresses:** `/sift` candidate generation (Step 3) reads only the feeds (`Oakland_Sports_Feed`, `Riley_Digest`, `Initiative_Tracker`, `Simulation_Ledger`). The v4 deck now carries structured, per-row, engine-authored event content the feeds don't — cause, touched citizens, businesses, magnitude/trend — sitting unused by candidate-gen. (/sift only reads the deck for the Engine-A priority *overlay* in Step 6, not as a content source.)

**What it does:** Each v4 deck row is one engine event for the cycle with its real numbers (`What`), the cause the engine applied (`Why`), the exact POPIDs+names it touched (`Citizens`) and their event lines (`CitizenEvents`), affected `Businesses` / `OtherEntities`, signed `Magnitude`, and `Trend` (single-cycle vs carrying + strength remaining). `Class` = major|texture; `Desk` = the desk that owns the row (contract rows self-route).

**Extraction — what's usable:**
- `What` + `Why` per row → candidate seed with cause built in → three-layer threading (engine + why) handed to Step 3 candidate-gen for free, instead of re-deriving cause from feeds
- `Citizens` (POPIDs) + `CitizenEvents` → pre-attached citizen anchors → citizen_selection + provenance fence (still MCP-verify before a name shapes a brief — hint, not bypass)
- `Businesses` + `OtherEntities` → business/cultural anchors → candidate enrichment
- `Magnitude` + `Trend` → severity / carry heuristic → a *labeled* priority proxy before Engine-A is live (Trend "carrying + strength remaining" ≈ arc-active signal); NOT the Engine-A `PriorityScore`
- `Class` (major|texture) → promote vs atmospheric-overlay → Step 5 six-decision triage (texture ≈ `atmosphericOnly`)
- `Desk` → desk-routing hint (contract rows carry their own desk, the T4 purpose)

**Not applicable / hazard:**
- **Dedup is mandatory.** Deck rows overlap feed signals — without a merge key a story gets proposed twice (once from the feed, once from the deck). Reconcile by SeedID / event identity before ranking.
- **Provenance fence still applies (RB-1).** Deck `Citizens` is engine-authored and strong, but MCP `lookup_citizen` verification before a name shapes a brief is non-negotiable — the deck is a hint layer, not a canon bypass.
- **Don't conflate `Magnitude`/`Trend` with priority.** They're a content signal; using them as a ranking proxy is a heuristic that must stay labeled, and it does NOT substitute for Engine-A when it lands.
- **Timing.** Only available once prod is on v4 — read dual-schema (header-name, `What`||`SeedText`) exactly as the v2.2 fix does, so it degrades on legacy.
- **Contract vs organic rows differ.** Contract rows (buildContractSeeds) have no filler/priority concept; texture rows are atmospheric-only. Treat Class-aware.

**Verdict:** `adopt` — low-risk, high-value: the engine already emits richer three-layer material per row than /sift reconstructs from feeds; wiring it as an *additional* Step 3 candidate source (with dedup + Class-awareness) directly serves the three-layer-coverage discipline. Not urgent (feeds still work), so it sits as a `ready` ROLLOUT row until a session picks it up. **This file is the shape-notepad** (Mike-direct S301: research templates as notepads of what the fix becomes) — a separate plan can ignite if the build grows past a Step-3 wiring.

**Ignited plans:** none yet — research file serves as the notepad; pipeline.42 (`ready`) points here.

---

## Applications (living)

- 2026-07-06 — Created S301 as the deeper-context notepad behind ROLLOUT pipeline.42 (Mike-direct).
- 2026-07-10 — Shipped into `/sift` v2.3 (S305) as an **enrichment layer**, not a parallel source: Step 1 reads the deck; Step 3 §3d folds `What/Why/Citizens/CitizenEvents/Businesses` into feed-derived candidates (fold = dedup), stamps `seedId`; a deck row goes standalone only if it clears the S257 citizen-protagonist lens + narrative-weight (guards the deck's known engine-civic noise). `Magnitude`/`Trend` labeled content signal, never priority; provenance fence preserved; degrade-safe on legacy deck. Step 6 T4.1 untouched. Notepad's "plan ignites only past a Step-3 wiring" held — no plan spawned.

---

## Changelog

- 2026-07-06 — Initial extraction (S301). Grew out of the /sift v2.2 v4-deck fix (git 4060fe7f) — while repointing the positional reads, noted the deck's content columns candidate-gen ignores. Filed as the pipeline.42 notepad.
