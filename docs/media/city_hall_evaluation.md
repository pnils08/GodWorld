---
title: City-Hall Evaluation Criteria
created: 2026-05-12
updated: 2026-05-12
type: reference
tags: [civic, media, evaluation, active]
sources:
  - "[[../archive/plans/2026-05-10-skill-eval-expansion]] — parent plan (governance.2)"
  - "[[../archive/plans/skill-eval-framework]] — framework parent"
  - "[[story_evaluation]] — sibling assertion file (write-edition + sift)"
  - "[[../../.claude/rules/civic]] — civic cascade discipline + faction architecture"
  - "[[../canon/CANON_RULES]] — Tier 2 canon-substitute rule"
pointers:
  - "[[../../.claude/skills/skill-check/SKILL]] — grader that reads this file"
  - "[[../../.claude/skills/city-hall/SKILL]] — the skill this evaluates"
  - "[[../../.claude/skills/city-hall-prep/SKILL]] — prep skill (separate assertion file pending)"
---

# City-Hall Evaluation Criteria

**Read this before running /city-hall. Updated after each cycle based on what worked.**

Last Updated: S216 (initial — refine after first /skill-check run)

---

## Goals

`/city-hall` produces structured civic source material — the cycle's official voices speaking (Mayor + Chief + DA + faction spokespersons + project agents + Clerk verification), captured as `output/civic-voice/*_c<XX>.json` + `output/production_log_city_hall_c<XX>.md`. The newsroom downstream evaluates and refines that source material into journalism.

A good /city-hall run produces source material the newsroom can build an edition from without filling gaps. A weak run forces the newsroom to invent — fabricated faction positions, made-up vote splits, citizens speaking that City Hall didn't surface.

---

## Criteria

Testable assertions for `/skill-check city-hall <cycle>`. Each must be verifiable from files on disk.

1. **Pending decisions all resolved.** Every pending decision in the cycle has a corresponding outcome written in the production log. No decision deferred without explicit "tabled until C{XX+1}" with reason.
2. **Outcomes have engine-reachable effects.** Every outcome references an engine-reachable effect: initiative state advance, approval delta, tracker update, faction position shift. No decisions decided in a vacuum.
3. **Council identification accurate.** The 9-member council is correctly identified — no fabricated names; faction-bloc per Civic_Office_Ledger (OPP 4 / CRC 3 / IND 2). IND members (Vega, Tran) are NOT a bloc — each speaks for themselves.
4. **Vote math reconciles.** Every recorded vote: all 9 members listed YES/NO/ABSENT; totals add up; ABSENT members have stated reason (recovering, scheduled travel, etc.).
5. **No real-world Oakland institutions.** Per Tier 2 canon-substitute rule. Real-world Oakland orgs that operate in canon (PG&E, BART, etc.) are excluded; canon-substitutes used instead.
6. **Cascade order canonical.** Mayor speaks first → factions react → projects report → Clerk verifies last. No faction position before Mayor's; no project report without cycle decisions known; no Clerk verification before all voices have spoken.
7. **Production log at canonical path.** Emitted at `output/production_log_city_hall_c<XX>.md`. Civic voice JSONs at `output/civic-voice/<voice>_c<XX>.json`.
8. **Voice coverage complete or noted.** Each active voice (Mayor + Chief Montez + DA Dane + OPP/CRC/IND spokespersons + 5 project agents — Stab Fund / OARI / Health Center / Transit Hub / Baylight + Deputy Mayor Okoro) either speaks OR has absence-of-statement noted with reason (per civic-office-okoro RULES precedent: absence-of-statement is meaningful and explicit).

---

## What this skill is NOT graded against

- **Edition prose quality.** That's `/write-edition`'s job (graded against `story_evaluation.md`).
- **Citizen voice selection in stories.** That's the newsroom evaluating source material; not /city-hall's responsibility.
- **Three-layer coverage threading.** That's an edition-level criterion (story_evaluation.md), not source-material-production criterion.

---

## Changelog

_Updated by `/post-publish` Step 10 after each cycle. What changed and why._

- S216 — Initial version (governance.2 close). 8 criteria covering decision resolution, engine-effect linkage, council identification, vote math, canon-substitute compliance, cascade order, canonical paths, and voice coverage. Baseline before first /skill-check run; refine criteria after first run reveals what's verifiable vs what needs sharpening.
- **S241 (C95): 11-agent civic cascade ran end-to-end under S239 Mike-framing "play on drama, district accountability, create news" — civic layer produced 44 statement/decision records ingested via Step 3 (baylight 3 + crc 5 + DA 1 + health-center 5 + ind-swing 3 + mayor 6 + oari 1 + okoro 3 + opp 5 + chief 2 + stab-fund 6). All 8 criteria held at civic source layer including vote math (Vega flip C82-NO→C95 YES-renewal + CONDITIONAL-YES expansion correctly logged across Mayor + IND + voice JSONs with Crane D6 named ABSENT per Mara hard-rule from S222). City Clerk 8/8 pass per civic terminal report; no pre-write violations (S229 G-R3 structural close held). Tracker apply WRITTEN 2 rows (INIT-002 OARI MilestoneNotes wk3 vote-architecture-locked + INIT-006 Baylight Phase II RFP-closed 8 bidders); 2 rows assembler-skipped (INIT-001 + INIT-005 — G-R1 deprecation pattern, now 2-cycle persistent). Civic Voice Sentiment 0.650. **Editorial layer carried vote math correctly into FP1 Carmen piece** — Tran D2 sponsor + Vega flip + Chen D8 first-speak-as-CRC voting NO fiscal-frame + projected 6-2-1 with Crane absent + all 9 council positions named. Cross-criterion (write-edition vote-math) finally HELD in editorial cycle, after C94 dropping. Brief-led mode + roster injection in FP1 brief did the work. **G-R1 INIT-001 + INIT-005 assembler-skip 2-cycle persistent flag:** if INIT-005 produces no civic-voice + no decision for a third consecutive cycle, retire from active rotation (avoid silent INIT stall). **No civic forward errata C96 except sports-beat sift cross-check** (which is sift-side, not city-hall-side). Evidence: output/civic-voice/*_c95.json + output/city-civic-database/initiatives/{oari,baylight}/decisions_c95.json + bay-tribune wiki ingest 44 memories via Step 3.
- **S222-S223 (C94 first post-publish update): all 8 criteria held at civic source layer; editorial layer dropped one (vote math).** /city-hall ran May 12 23:10; produced 37 wiki memories ingested via Step 3 (Mayor 5 statements + OPP 7 + CRC 3 + IND 4 + DA 1 + Chief 2 + Okoro 3 + OARI 2 + Health Center 1 + Stab Fund 3 + Transit Hub 2 + Baylight 2). All 12 expected offices spoke. Cascade order canonical. Two decision files emitted (baylight + oari). Canonical paths matched. **Criterion 4 (vote math) HELD at source but DROPPED at edition:** Transit Hub 8-0 vote was correctly logged in Civic_Office_Ledger / Initiative_Tracker / civic-voice JSONs with all 9 council positions named + Crane D6 absent; Carmen C1 in E94 reported "8-0 with one absent" without listing the 9 individual votes or naming Crane. Mara caught it (G-W56). **New cross-criterion (write-edition side):** every vote-coverage piece must ship the full 9-member roster + named absentee from the underlying city_hall civic-voice JSON — not just the X-Y tally. Criterion 4 is verifiable AT SOURCE; reinforcement criterion needed AT EDITION (codified in story_evaluation.md S222-S223 entry + brief_template.md S222-S223 entry). **OARI INIT-002 12-cycles-stuck signal:** OARI civic source produced 2 statements + 0 decisions this cycle (Project lead and Mayor referenced it); editorial layer chose not to ship a dedicated OARI piece. **Forward signal for C95:** Mara forward guidance names OARI vote architecture as front-section spine — if /city-hall continues producing OARI-stuck source-material, the editorial layer should not skip again. Skill-check formal pass: BLOCKED (G-P40, /skill-check has `disable-model-invocation: true`); criteria update from direct evidence. Evidence: output/civic-voice/*_c94.json + output/city-civic-database/initiatives/{baylight,oari}/decisions_c94.json + output/production_log_city_hall_c94.md + bay-tribune wiki ingest 37 memories.
