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

**Extraction — what's usable (Task 1 forensics, S313):** Per finding: *what the test desk was given → what held or veered → rule for the fork's charge/slice format.* Subjects: `output/desk-test/sports_c100_deep_hal.md` (Tier-1/A, permanent canon) + `civic_c100_deep_carmen.md` (best civic ever, #2 overall), charges per RESEARCH.md §S272 + [[../media/examples/charge_brief_c100_civic_exemplar]].

- **Pointers-not-data → HELD, and is *why* the buried story was found** → slice carries pointers + attached citizens, never figures. Carmen's charge contained zero numbers; she read `engine_anomalies` raw, where the spike was still a spike — the dilution the old pipeline suffers happens in its summarize-each-stage chain, and the charge skips the chain. LOCKED #1 confirmed by both tests.
- **bug-is-event line in PROJECT → HELD — stopped the suppression reflex before it started** → the fork's charge keeps the PROJECT block verbatim-class ("cover it, don't scrub it; translate the event, strip the number"). Carmen covered the sentiment anomaly as "aggregate measurement that doesn't disaggregate" — zero system language — instead of scrubbing it as an artifact like the live pipeline did.
- **BEAT lane-definition sentence → HELD — produced the lane differentiation the external reviewer flagged unprompted** → every slice names the desk's lane in one sentence ("your lane is the governance gap... no sports or culture voice holds it"). This is the moat line; it's also the fork's subject-collision control when multiple desks share an event (Hal and Carmen both wrote the Celebration — different lanes, zero overlap).
- **Minimal structure → HELD — concept proved with almost no scaffolding** → do NOT rebuild the packet inside the slice. Slice = territory + storylines + attached citizens + journalist + pointers; treatment is entirely the desk's. Sports ran on a charge + 3 bounded Explore agents and beat both shipped E100 pieces.
- **Bounded source-search (3 subagents) → sufficient at that cap** → keep a hard per-desk cap in the deep-dispatch skill; over-spawn stays a named risk (RESEARCH.md:1146).
- **Freshness as charge-prose → VEERED — the one real error** → OARI scope error (pilot-districts claim vs citywide-since-~C97 reality) traced to a stale subagent return the writer never reconciled against the contradicting signal already in her own material. Rule: reconcile moves from charge-prose to a **structural orchestrator step** — before the write, contradictory source returns are reconciled against world_summary/MCP (detector-framer split: deterministic where possible), with Rhea's specific-fact lane as backstop. Charge keeps the HARD-STOP line as writer-side belt.
- **Lived-experience anchor → VEERED (all-analysis, "relentless") — and the fork solves it structurally** → the S272 craft gap (charge invited nothing human; Carmen quotes no resident) is closed by machinery that didn't exist then: the slice's attached citizens + pipeline.43 `citizenVoice --batch --record` supply real voiced lines. Charge line flips from "invite one anchor" to "your slice citizens have spoken — their supplied lines are in hand; use at least one."
- **NEW veer class (unflagged in S272): invented reporting interactions** → Carmen wrote "The Mayor's office did not respond to questions" — an interaction that never occurred; a claimed reporting act is fabrication even when no fact is asserted. Rule for the fork: a desk may claim an ask only if the ask was real (civic voice agent or citizenVoice call — both exist now); otherwise state the absence plainly ("no public statement addresses X"), never as a performed query.
- **Over-strict audit causes flatness (the Rickey Henderson lesson)** → the decoupled review flow inherits ADR-0012's recalibrated floor: catch modern-Oakland civic invention + specific-fact errors; never police journalistic range, real-entity sports comps, or angle/reach.
- **One-desk-deep finds seams parallel desks walk past** → Hal's fused thesis ("whose dynasty is this") existed in C100's data but the shipped edition split it across two reporters who each walked past it. The slice should hand a desk its *whole* territory for the cycle, not pre-split angles.

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
**Status:** [x] done S313 — 10 findings in §Extraction (4 held-rules, 3 veer-rules incl. one NEW veer class: invented reporting interactions; 3 structural rules for slice/floor shape)

### Task 2: New-sift skill — desk-slice prep *(research-build)*
New SKILL.md (name TBD at build — working name `/desk-slice`). Steps: read `world_summary_c{XX}` + the unified production log's city-hall section → Mags picks stories → write one slice file per desk (top storylines, context lines, attached citizens with POP ids, assigned journalist). Slice format spec defined in this task, informed by Task 1. Cheap by design — curation only.
**Status:** [x] built S313 — `.claude/skills/desk-slice/SKILL.md` v1.0 (Mike-approved name). Slice format fixed (LANE / STORYLINES+CITIZENS / POINTERS / CARRY); hard rules: no figures, no prescribed angles, MCP-verified POP ids, every cover-as-story anomaly placed; Mags page recall/append kept (EIC moment moves here on the fork lane).

### Task 3: New deep-dispatch skill — one desk deep *(research-build)*
New SKILL.md. Charge assembly from slice + `charge_brief_template` (amended per Task 1), one-desk-deep with bounded source-search cap, propose→cheap-OK gate, pipeline.43 quote batch call, artifacts to per-desk output paths with byline/desk ingest tags (engine.46 substrate). Production run ends at artifacts-on-disk.
**Status:** [x] built S313 — NOT a new file: `/deep-dispatch` v0.1 already existed (research.20 Phase 2, edition-coupled pilot harness); rewritten in place to v2.0 per FIX-don't-ADD. Fork changes: slices in (not sift slate), propose→OK gate, supplied voices (pipeline.43), REAL-ASKS-ONLY, decoupled ending (no hand-back to /write-edition compile). Carried unchanged: two LOCKED forks, ≤3-search cap, reconcile pass, serialize-under-quota. v0.1 in git history.

### Task 4: Decoupled review-flow skill *(research-build)*
New SKILL.md (or amended `/capability-review` chain): Mags EIC read + existing reviewer lanes over a desk's artifacts (~2 at a time), verdict → publish handoff. Same lanes, new decoupled cadence.
**Status:** [x] built S313 — `.claude/skills/desk-review/SKILL.md` v1.0 (Mike-approved name). Pass A EIC read (quotes-vs-packet first, REAL-ASKS trace, recalibrated fact checks) → Pass B Rhea + lanes on decoupled cadence → Pass C verdict + dispatch-contract packaging (format footers = the wiki-query gain) → USER APPROVAL GATE unchanged → `/post-publish --type dispatch` (existing matrix already covers it).

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
- 2026-07-11 — Task 1 forensics done (S313, same session): 10 charge-format rules in §Extraction from the S272 artifacts + reconstructed charges; new veer class found (invented reporting interactions); lived-anchor gap resolved structurally by pipeline.43 machinery.
- 2026-07-11 — Tasks 2+3 built (S313, same session): `/desk-slice` v1.0 new; `/deep-dispatch` rewritten v0.1→v2.0 in place (FIX-don't-ADD — edition-coupled harness already existed). Open: T4 review-flow skill (needs name + green-light), T5 post-publish fit, T6 pilot.
- 2026-07-11 — Task 4 built (S313, same session): `/desk-review` v1.0. Research-build lane complete (T1–T4); open: T5 (engine-sheet), T6 (media pilot).
