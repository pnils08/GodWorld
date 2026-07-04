---
title: "ADR-0012: Autonomous deep-dispatch for write-edition — one-desk-deep, raw-data charge, recalibrated floor"
created: 2026-06-25
updated: 2026-06-25
type: reference
tags: [architecture, newsroom, write-edition, dispatch, autonomy, canon, decision, active]
sources:
  - "[[../RESEARCH]] — S272 finding (the concept proof + C100 failure trace + both floor results) is the evidence base for this ADR"
  - "[[../EDITION_PIPELINE]] — the write-edition stage this ADR retools (structure upstream of it is unchanged)"
  - "[[0007-cross-layer-canon-authority-precedence]] — canon authority precedence; bug-is-event extends it (engine output is canon the citizens lived)"
  - "[[0004-skill-bag-naming-principle]] — generators generate / reviewers review; the recalibrated floor is the reviewer lane, kept"
  - "[[0001-adopt-context-and-adrs]] — ADR bar"
pointers:
  - "[[../RESEARCH]] — S272 entry: deltas list, test artifacts, cost-measurement gate"
  - "[[../engine/ROLLOUT_PLAN]] — build rows land here (engine-sheet substrate deltas)"
  - "[[index]] — ADR registered same commit"
  - "[[../plans/2026-06-25-deep-dispatch-write-edition-build]] — the phased build plan executing this ADR"
  - "test artifacts: output/desk-test/sports_c100_deep_hal.md, output/desk-test/civic_c100_deep_carmen.md"
---

# ADR-0012: Autonomous deep-dispatch for write-edition — one-desk-deep, raw-data charge, recalibrated floor

**Status:** Accepted (decision); implementation phased + cost-gated (see Rollout)
**Date:** 2026-06-25 (S272)
**Deciders:** Mags Corliss (research-build), Mike (directed the design; proceed on two converging proofs)

## Context

`/write-edition` runs all desks **in parallel** against pre-filtered **desk packets** — a citizen reference-card list, prescribed story priorities, "use ONLY packet data, invent nothing." The output is cookie-cutter, it is the most expensive operation in the project, and — proven at C100 — it **misses the cycle's largest events**.

The C100 proof (RESEARCH.md S272, traced): the engine flagged a **Coliseum violent-crime spike (+4.95σ)** on the doorstep of the Cycle-100 Celebration footprint and a **citywide sentiment-uniformity anomaly**, both triaged `cover-as-story`. The edition covered neither. The signal was *caught* at `/sift` and then **lost downstream** — the crime spike dissolved into a "crowd-safety framework" (softer civic-voice framing), and the sentiment anomaly was **actively scrubbed** as a "G-EC33 artifact." The packet that reaches a desk is, in Mike's words, "filtered to a bone." This is two failure modes: **dilution** across the summarize-each-stage chain, and a **suppress-the-artifact reflex** that treats engine anomalies as bugs to hide rather than events the citizens lived.

The alternative shape already exists as the **supplemental** (search-and-write with MCP source access; the C89 existence proof; the deeper Gemini runs). Two S272 tests proved the inverted shape end-to-end:

- **Sports** — "The Threshold Season" (Hal Richmond): external review ranked it **Tier-1 / A, above both shipped E100 sports pieces**, classified *permanent canon*.
- **Civic (the floor test)** — "The Coliseum Corridor" (Carmen Delaine): given all material evenhandedly + latitude, she **independently surfaced the buried story** the production pipeline suppressed; external review ranked it the **best civic article from GodWorld, #2 overall**, and independently flagged emergent **lane differentiation** ("a voice Anthony or Richmond couldn't convincingly write") — the differentiated voice is the moat ([[../RESEARCH]] §S272; cf. mags-bleed proprietary element).

Prior research settles three things so we don't re-derive them: the depth lever is **dispatch-shape + why-context, not tool access alone** (RESEARCH.md:1589); subagent **over-spawn** is a real failure mode (RESEARCH.md:1146); and **costuming the 25 agent files does not add depth** — writers don't need persona files, they need the charge + the canon map (S256). Writing is work; the persona/life layer (24/7 loop, dials, identity) is separate and stays.

## Decision

Adopt **autonomous deep-dispatch** for the `/write-edition` stage. Upstream structure is unchanged (engine-review → build-world-summary → city-hall → interviews → the verification floor). Seven moves:

1. **Invert dispatch.** Kill the monolithic all-desks-parallel edition. Run desks **one at a time, deep**; each desk fans **bounded** source-search subagents (hard cap per desk — over-spawn guard, RESEARCH.md:1146).
2. **Charge-brief replaces the packet.** Brief = *project + beat + cycle + canon map*, granting latitude over **angle AND subject selection**. Present the citizen pool; the desk picks who carries the story. "Brief it like a reporter," do not prescribe.
3. **Raw-data access.** Route the desk to raw signal — `engine_anomalies` (`cover-as-story`), full `neighborhoodState`, sheet primary — not the bone-filtered summary. The agent reaches the meat, not the skeleton.
4. **Recalibrate the floor.** The verification floor (Rhea / cycle-review / arbiter) stays and is **more** load-bearing, but its target changes: it catches **modern-Oakland civic invention** + **specific-fact errors** (vote math, program scope, dates) — NOT journalistic reach or real-entity comparison (the A's are a real entity; a Rickey Henderson comp is correct sports journalism). It replaces the suppress-the-artifact reflex with **bug-is-event**: engine output, even when wrong, is canon the citizens lived; cover it, don't scrub it. (Extends [[0007-cross-layer-canon-authority-precedence]].)
5. **Self-knowledge + corpus.** Per-desk / per-citizen corpus + `byline`/`desk` ingest tags so a desk can search "what I've said" (today's bay-tribune ingest tags `cycle`/`type`/`citizen`, not byline/desk). This is the dual-axis growth loop: a citizen grows externally (engine events) + internally (its own accumulating, queryable file). **Canonize meaning, not metrics** — the story-level finding, not the supporting stats.
6. **World-summary reconciliation.** Surface `engine_anomalies` `cover-as-story` items in the desk-facing world summary (today it ingests `engine_audit` only and reports "0 high" while high-severity anomalies silo in `engine_anomalies`).
7. **Lived-experience anchor (craft).** The charge invites **one** human beat (a resident, an officer, one sentence of lived experience) to vary cadence — the deep pieces skew all-analysis ("relentless," per the civic review).

## Consequences

**Positive.** Depth-per-token; voice differentiation (the moat — proven emergent, externally observed); catches buried events; corrects the bug-is-event suppression; reuses the supplemental machinery + keeps the verification floor.

**Risks / costs.**
- **Absolute cost-per-cycle is unmeasured.** Frame the gain as *depth-per-token*, not cheaper. Measure one deep-desk run vs the current desk-slice **before** committing to full-edition rollout (gate below).
- **Source-search freshness** is a new failure mode — a stale subagent return poisons the writer (the civic OARI-scope error traced to exactly this). Mitigate: freshness checks + cross-reconcile contradictory returns before the write.
- **Accuracy floor more load-bearing.** Rhea must verify specific civic facts (vote math, scope, dates). The latitude is kept; the floor catches the slips. Do NOT strangle reach to reduce floor load.
- **Over-spawn.** Cap source-search subagents per desk.

**Lane.** research-build **designs** (this ADR); engine-sheet **builds** the substrate (corpus storage, ingest tags, summary-merge, raw-data routing, freshness guard); media **executes**. "Owns" = uses/executes, not builds.

## Alternatives considered

- **Keep parallel-template.** Rejected — flat, most-expensive, and proven to miss the cycle's largest events (C100).
- **Tool-access only** (give the existing parallel desks MCP/search, keep the dispatch shape). Rejected — RESEARCH.md:1589: the depth lever is dispatch + why-context; tools alone leave desks wide-and-shallow. Tool access is fuel; dispatch shape is the engine.
- **Edit the 25 agent files** to add depth. Rejected — S256: costume ≠ depth; the writers operate at session-awareness, not persona-immersion.

## Rollout (phased; full task breakdown → `docs/plans/`)

- **Phase 0 — done (S272).** Concept proofs (sports, civic), both externally A-graded; this ADR.
- **Phase 1 — engine-sheet substrate.** Per-desk corpus storage (reactivate `output/desks/{desk}/` article store, dead since c90); `byline`/`desk` ingest tags; world-summary ↔ `engine_anomalies` merge; raw-data routing into the charge; source-freshness guard.
- **Phase 2 — research-build + media.** Charge-brief template; dispatch-inversion harness (one-desk-deep + bounded source-search, capped); floor recalibration (Rhea verify-specifics + bug-is-event, drop the suppress-reflex); the lived-experience-anchor charge line.
- **Phase 3 — pilot.** Run on a live cycle (C101+, against the richer chaos-cars + deeper packets substrate); measure depth + cost vs the parallel baseline.
- **Gate.** Cost measurement (Phase 3) before full-edition rollout. Depth is proven; the bill is not.

## Addendum (S289, Mike-direct) — deep-dispatch is where editions are headed; built as a side fork, not a default-path flip

**Correction (S289, same session):** an earlier draft of this addendum said deep-dispatch becomes the default path this cycle and supersedes the Rollout section's cost-gate. That overstated it. Mike's actual direction: **build this as a side skill forking off `/sift`, leave the existing `/sift` → `/write-edition` all-desks-parallel path untouched and live.** The existing pipeline keeps publishing editions. Nothing upstream of sift (engine-review, world-summary, city-hall) changes. The fork starts at sift and builds forward from there.

**Decision.** Stop running all desks in parallel is still the direction — that hasn't changed. What changed is timing: this is a **build-and-test track running alongside the live pipeline**, not an immediate cutover. The cutover gate is **process-completeness, not cost**: the new fork has to actually be able to put out full desk editions end-to-end before it takes over anything. Cost measurement (Phase 3) still rides along with that testing — it isn't the gate, and it isn't skipped either; it's one of the things proven out during the build-and-test phase.

**Why testing this way still has value before cutover:** a piece produced while proving out the new fork is not throwaway — the S272 concept proofs (Hal Richmond's sports piece, Carmen Delaine's civic piece) are the precedent: both were graded above what the live pipeline shipped and both became real canon. Testing the new fork produces canon-worthy output along the way, not just a pass/fail signal.

**What doesn't change.** Both LOCKED forks hold exactly as built: the orchestrator (the deep-dispatch skill / Mags) spawns the ≤3 bounded source-search subagents and reconciles their returns; the desk agent never gets Agent-spawn capability — it receives the charge + reconciled sourcing and picks its own subject, angle, and prose from there (SKILL.md Step 2–4, verbatim). "Orchestrate" is that mechanical scaffolding, not editorial direction — Mags does not pick the angle or write the piece.

**How the new fork operates (design target for the side skill, not yet built):**

1. **A new side skill (working name `/sift-dispatch`) forks off sift's inputs and assigns all potential storylines, not one pick per desk.** Each storyline carries a format tag — feature article, interview, or dispatch — executed inside the same orchestrator-spawns/desk-writes structure. **Supplementals stay outside this run** as a separate artifact; other skills remain independently usable outside deep-dispatch. `/sift` itself is not edited — the fork is a new, separate skill.
2. **Write-gate, not a publish-gate.** A storyline is only written if it clears a "why this story" test at assignment time. Storylines that don't clear it are **not written**, but the assignment itself still saves to that journalist's file/corpus — visible and queryable later even though unused this cycle. (This is the self-knowledge substrate Phase 1 Task 1+2 already targets; the write-gate is what makes an unwritten-but-visible assignment a real state, not just an idea.)
3. **Desks run staggered, not all-at-once**, within the new fork — untested against the live pipeline, which is unaffected.
4. **Combine at cycle's end.** Desk output from the new fork collects into a packet; the strongest piece takes front page. Resolves D1 (below).

**Real build items this creates (not yet done):**

- **A new side skill, not an in-place sift edit.** Scoped as `docs/plans/2026-07-03-sift-deep-dispatch-reconcile.md` — build target changed mid-scoping (S289) from "edit `/sift` SKILL.md" to "new skill forking off sift's inputs, existing sift untouched."
- **Phase 1 substrate is still the blocking dependency**, unchanged from the original ADR: per-desk corpus store + `byline`/`desk` ingest tags (engine-sheet's build, still unstarted per the build plan). Without it the harness still runs, but the self-knowledge/visible-assignment benefit in point 2 above doesn't land.
- **D3 (pilot scope) stays build-and-test, not full-edition-by-default.** The original subset-first recommendation is closer to right than the immediate-full-edition reading this addendum first drafted — cutover happens once the fork proves it puts out complete desk editions, not on a fixed cycle.

Sources: this session's design conversation (S289, research-build); [[../plans/2026-06-25-deep-dispatch-write-edition-build]] status log carries the same update; [[../plans/2026-07-03-sift-deep-dispatch-reconcile]] is the side-skill build plan.
