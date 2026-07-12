---
title: Desk-Slice Fork — new sift + deep-dispatch skills (research → plan, one doc)
created: 2026-07-11
updated: 2026-07-11
type: reference
tags: [research, media, pipeline, deep-dispatch, sift, active]
sources:
  - S313 grill-me interview with Mike (2026-07-11, this doc's design decisions — Mike-direct)
  - docs/adr/0012-autonomous-deep-dispatch-write-edition.md — the accepted decision + S289 side-fork addendum this build executes
  - docs/plans/2026-06-25-deep-dispatch-write-edition-build.md — research.20 phased build (Phase 1 substrate DONE S311)
  - docs/media/charge_brief_template.md + docs/media/examples/charge_brief_c100_civic_exemplar.md — the charge contract (S274)
  - output/desk-test/sports_c100_deep_hal.md + output/desk-test/civic_c100_deep_carmen.md — S272 proof artifacts (Task 1 forensic subjects)
  - docs/plans/2026-07-11-citizen-voice-quote-supply.md — pipeline.43 quote machinery (T1–2 built S312, T3–5 wired S313)
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — pending-state home (pipeline.44)"
  - "[[index]] — registered same commit"
  - "[[../plans/2026-07-11-agent-exchange-engine]] — engine.53, the cron growth path for quotes"
---

# Desk-Slice Fork — new sift + deep-dispatch skills

**One-doc note (Mike-direct S313):** this file deliberately fuses the research and plan layers — it starts as the research record (grill decisions + S272 forensics) and matures into the plan in place, so the project has one source-of-truth doc. ROLLOUT points here. Precedent: pipeline.42.

**What this addresses:** The next flagship build. The current `/sift` → `/write-edition` monolith is the most expensive operation in the project, takes ~2 days per edition, buries desk output inside full-edition artifacts (bad wiki queries), and was proven at C100 to lose the cycle's largest events (ADR-0012). The project has become semi-autonomous crons and agents; the edition path forks to match — more room for what the desks want, less gating everything.

**What it does (the fork, end to end):**
1. **Upstream unchanged** — engine-review → world-summary → city-hall. Fork begins after city-hall.
2. **New sift (new skill, NOT an edit of `/sift`).** Mags-as-EIC reads world summary + city-hall output (world summary doesn't carry city-hall — that's why sift still has a job). She picks the cycle's stories and builds one **desk slice** per desk: top storylines/headlines for that desk, attached citizens, storyline context, assigned journalist. Curation, not authoring — no full briefs, no citizen tables, no monolith story-building.
3. **New deep-dispatch skill.** One desk at a time, deep (ADR-0012). Desk receives its slice as a charge with **subject latitude within the slice + angle latitude** (charge-brief LOCKED line stands). Desk proposes pick + angle in 1–2 lines → Mags cheap OK → deep write with bounded source-search. Quotes: write-time batch via `citizenVoice.js --batch --record` (pipeline.43, built); engine.53 cron exchange is the designed growth path.
4. **Production skill ends at artifacts-on-disk**, per desk — civic readable in isolation from sports; Mike reads and paces desk by desk.
5. **Review decoupled into its own flow, after.** Same lanes (Mags EIC read, Rhea, cycle-review, Mara, arbiter), not in the production flow, working ~2 articles at a time instead of 9. Publish + post-publish reuse existing machinery (handles all artifact formats); supermemory-inject fix rides along.

## Locked decisions (grill, S313)

- **Old path frozen, not retired.** Stays runnable; no new investment (pipeline.24 folds to frozen with it). The fork proves itself on four criteria: (1) quality parity with shipped editions, (2) token burn down, (3) moves the world, (4) per-article wiki taggability (articles queryable directly, not buried in full editions).
- **Per-desk artifacts are the output.** Whether cycle-close also compiles them into a paper is an **open discussion — parked, not decided**.
- **Slate authority:** Mags picks what enters each slice (her newsroom); desk keeps subject latitude *within* the slice + full angle latitude; cheap propose→OK gate before the deep write.
- **Journalist assigned per desk in the slice.**
- **Quote timing:** write-time batch now (proven, pennies); cron exchange (engine.53) later.
- **Storylines:** no register build — research.17 stays parked. Mags assembles slice storyline context from world summary + city-hall at sift time.
- **Skill-build method is forensic-first:** the S272 tests ran with no sift skill — the desks got "less format" and it worked. Task 1 studies what they were given, where they veered too much, and what about the structure allowed the failure; the new charge format is built from that evidence, not theory.

**Extraction — what's usable:** *(Task 1 fills this section — per-finding: structure element → veer/hold observed → charge-format rule.)*

**Not applicable / hazard:**
- Don't chase the current edition setup — the fork is not a v2 of `/write-edition`; reusing its compile/format contract is explicitly out of scope until the cycle-close-combine discussion happens.
- Source-search freshness remains the known poison path (ADR-0012 risk — the civic OARI-scope error); the charge keeps the freshness backstop.
- Cost gate stands: ADR-0012 Phase 3 measurement before any full-cycle rollout.

**Verdict:** `adopt` — ignites the task list below (this doc IS the plan; ROLLOUT row pipeline.44).

**Ignited plans:** none separate — plan lives in §Tasks below (one-doc ruling, Mike-direct S313).

---

## Tasks

### Task 1: S272 forensic pass *(research-build)*
Read the two proof artifacts (`output/desk-test/*.md`), the RESEARCH.md §S272 entry, and the charges the test desks were given. Document: what each desk received, where output veered (the civic OARI-scope error, all-analysis cadence, anything else), and which structural element allowed each veer. Findings land in §Extraction above as charge-format rules.
**Status:** [ ] not started

### Task 2: New-sift skill — desk-slice prep *(research-build)*
New SKILL.md (name TBD at build — working name `/desk-slice`). Steps: read `world_summary_c{XX}` + the unified production log's city-hall section → Mags picks stories → write one slice file per desk (top storylines, context lines, attached citizens with POP ids, assigned journalist). Slice format spec defined in this task, informed by Task 1. Cheap by design — curation only.
**Status:** [ ] not started

### Task 3: New deep-dispatch skill — one desk deep *(research-build)*
New SKILL.md. Charge assembly from slice + `charge_brief_template` (amended per Task 1), one-desk-deep with bounded source-search cap, propose→cheap-OK gate, pipeline.43 quote batch call, artifacts to per-desk output paths with byline/desk ingest tags (engine.46 substrate). Production run ends at artifacts-on-disk.
**Status:** [ ] not started

### Task 4: Decoupled review-flow skill *(research-build)*
New SKILL.md (or amended `/capability-review` chain): Mags EIC read + existing reviewer lanes over a desk's artifacts (~2 at a time), verdict → publish handoff. Same lanes, new decoupled cadence.
**Status:** [ ] not started

### Task 5: Post-publish fit *(engine-sheet + research-build)*
Verify `/post-publish` handles per-desk artifacts as-is (it handles all formats today); apply the supermemory-inject fix (current process wrong per Mike S313 — scope at build); confirm engine.46 byline/desk tags cover fork artifacts.
**Status:** [ ] not started

### Task 6: Pilot + measurement *(media, after T1–5)*
Run the fork on a live cycle (civic + sports first — the proof desks). Measure the four frozen-path proof criteria + ADR-0012 cost gate vs the last shipped edition.
**Status:** [ ] not started

## Open questions

- [ ] Cycle-close combine — do per-desk artifacts also compile into a paper at cycle end? (Mike: "a discussion to have." Parked.)
- [ ] Skill names (`/desk-slice`, `/deep-dispatch` final naming at build).
- [ ] Photos/print on the fork — per-desk artifacts have no print path; decide with the combine question.

---

## Applications (living)

- 2026-07-11 — Ignition: pipeline.44 ROLLOUT row (this doc is its plan).

---

## Changelog

- 2026-07-11 — Initial capture (S313, research-build). Design grilled with Mike same session (3 rounds); one-doc research→plan ruling recorded; Tasks 1–6 filed; §Extraction awaits Task 1 forensics.
