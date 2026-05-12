---
title: Dispatch Evaluation Criteria
created: 2026-05-12
updated: 2026-05-12
type: reference
tags: [media, evaluation, active]
sources:
  - "[[../plans/2026-05-10-skill-eval-expansion]] — parent plan (governance.2)"
  - "[[../plans/skill-eval-framework]] — framework parent"
  - "[[story_evaluation]] — sibling assertion file (write-edition + sift)"
  - "[[../EDITION_PIPELINE]] §Published .txt Format Contract — filename + masthead rules"
  - "[[../canon/CANON_RULES]] — Tier 2 canon-substitute rule"
pointers:
  - "[[../../.claude/skills/skill-check/SKILL]] — grader that reads this file"
  - "[[../../.claude/skills/dispatch/SKILL]] — the skill this evaluates"
---

# Dispatch Evaluation Criteria

**Read this before running /dispatch. Updated after each cycle based on what worked.**

Last Updated: S216 (initial — refine after first /skill-check run)

---

## Goals

`/dispatch` produces immersive scene pieces — one location, one moment, texture-driven journalism that lives outside the council-vote scaffold. The output is a single `editions/cycle_pulse_dispatch_c<XX>_<slug>.txt` file: a reporter at a place watching what happens, ending on an image not a summary.

A good dispatch reads like the reporter actually went there. A weak dispatch reads like a composite of several places, or a "scene" that's really a roundup of citizens explaining the city. The S195 coverage-fatigue rule frames why dispatches matter: they're the neighborhood-texture proposals that don't route through council-vote scaffold.

---

## Criteria

Testable assertions for `/skill-check dispatch <cycle>`. Each must be verifiable from `editions/cycle_pulse_dispatch_c<XX>_<slug>.txt`.

1. **One location.** Scene is one location (specific address, intersection, named place — "First Presbyterian sanctuary," "the corner of 7th and Adeline," "Lake Merritt boathouse"). No multi-location compositing across paragraphs.
2. **No biographical data dumps.** No character introduced with "34-year-old fourth-generation Oakland resident" data bricks. Citizen identity emerges through action, speech, or specific detail — not roster-data narration.
3. **Ends on image, not summary.** Closing paragraph is an image or moment of texture — what the reporter saw last, what the light looked like, what someone said walking away. Not a "the future of [neighborhood] remains uncertain" wrap.
4. **Word count 600-1200.** Refine after 2-3 historical runs reveal the real distribution. Outside band requires rationale in production log.
5. **Reporter from canonical pool.** Tier-1 pool: DJ Hartley / Maria Keen / Mason Russo / Kai Patel. Tier-2 pool: Talia Reeves / Sharon Bryan / Tanya Kim. Off-pool requires explicit rationale in /sift transparency block.
6. **Format-contract compliance.** Filename `cycle_pulse_dispatch_c<XX>_<slug>.txt`; masthead block; byline; body per `EDITION_PIPELINE.md` §Published .txt Format Contract.
7. **No real-world Oakland institutions.** Tier 2 canon-substitute rule. Real-world orgs operating in canon are excluded; canon-substitutes used.
8. **At most 2 named citizens.** Depth over breadth — dispatch is texture, not a citizen roundup. A scene with 6 named citizens is a feature article, not a dispatch.

---

## What this skill is NOT graded against

- **Three-layer coverage threading.** Dispatches are intentionally single-layer (simulation texture). The single-layer-only weak-story rule in `story_evaluation.md` explicitly carves out dispatch-style scene pieces.
- **Front-page worthiness.** Dispatches typically aren't front-page leads — they're texture inside the edition. Front-page scoring is `story_evaluation.md`'s job.
- **Initiative engagement.** A dispatch doesn't need to engage active initiatives. Some of the best dispatches are about the half-built block on 42nd, not council vote outcomes (S195 coverage-fatigue rule).

---

## Changelog

_Updated by `/post-publish` Step 10 after each cycle. What changed and why._

- S216 — Initial version (governance.2 close). 8 criteria covering location specificity, identity-through-action, image-ending, word count, reporter pool, format contract, canon-substitute compliance, and citizen depth. Baseline before first /skill-check run; word-count band (criterion 4) is the most likely to need refinement after historical runs.
