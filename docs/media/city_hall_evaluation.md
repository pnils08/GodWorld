---
title: City-Hall Evaluation Criteria
created: 2026-05-12
updated: 2026-05-12
type: reference
tags: [civic, media, evaluation, active]
sources:
  - "[[../plans/2026-05-10-skill-eval-expansion]] — parent plan (governance.2)"
  - "[[../plans/skill-eval-framework]] — framework parent"
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
