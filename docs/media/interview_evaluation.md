---
title: Interview Evaluation Criteria
created: 2026-05-12
updated: 2026-05-12
type: reference
tags: [media, evaluation, active]
sources:
  - "[[../plans/2026-05-10-skill-eval-expansion]] — parent plan (governance.2)"
  - "[[../plans/skill-eval-framework]] — framework parent"
  - "[[story_evaluation]] — sibling assertion file (write-edition + sift)"
  - "[[../EDITION_PIPELINE]] §Published .txt Format Contract — filename + masthead rules"
  - "[[../canon/CANON_RULES]] — Tier 1-2 canon protected entities"
pointers:
  - "[[../../.claude/skills/skill-check/SKILL]] — grader that reads this file"
  - "[[../../.claude/skills/interview/SKILL]] — the skill this evaluates"
---

# Interview Evaluation Criteria

**Read this before running /interview. Updated after each cycle based on what worked.**

Last Updated: S216 (initial — refine after first /skill-check run)

---

## Goals

`/interview` produces theme-driven Q&A grounded in canon — a transcript published as canon. World-altering canon is possible: a subject can commit publicly to a position, reveal a fact, take a stance that becomes their canonical record going forward.

**Capture-only since /interview v2.0 (S233 pipeline.30).** Articles framed off the transcript are produced downstream by `/write-edition` (next cycle, via `/sift` surfacing the transcript as canon source) or `/write-supplemental` (any time, sports-desk subagent dispatch against the canon transcript). This rubric grades the **transcript** as the /interview output; downstream framed articles are graded under the rubrics of their producing skills (`story_evaluation.md` for /write-edition, equivalent for /write-supplemental). Criterion 5 below was updated accordingly.

A good interview reads like a real conversation that happened — questions build on answers, the subject sounds like themselves, the conversation produces something readers didn't know before. A weak interview reads as pre-scripted Q&A where every question was written before the subject answered.

---

## Criteria

Testable assertions for `/skill-check interview <cycle>`. Each must be verifiable from the transcript `.txt` at `editions/cycle_pulse_interview-transcript_c<XX>_<subject>.txt` (sole canonical artifact post /interview v2.0 — the legacy bare article `cycle_pulse_interview_c<XX>_<subject>.txt` is retired since S233 pipeline.30).

1. **Stated theme.** Interview has a stated theme (the why-now of this conversation) — "Mayor Santana on the C93 OARI deadline," "Chen-Ramirez on Atlas Bay's design phase." Not "general check-in" or "catch-up."
2. **Questions ground in canon.** Each question grounds in subject's identity, recent decisions, faction position, or public commitments. No invented backstory; no fictional events attributed to subject.
3. **Questions build on answers.** Transcript shows progression — at least 2 questions reference or react to the subject's prior answer. Not pre-scripted unconditional sequence.
4. **Subject answers from canon.** Subject's answers are consistent with their canon record (Tier 1-2 protected entities have particular voices; their answers must match prior canon they've established or update it explicitly).
5. **Transcript exists at canonical path.** Transcript `.txt` at `editions/cycle_pulse_interview-transcript_c<XX>_<subject>.txt` with `<TYPE>=INTERVIEW-TRANSCRIPT` masthead. Sole canonical artifact post /interview v2.0; no companion article (the article-generation cognitive act lives at the downstream dispatch terminal — /write-edition or /write-supplemental — per pipeline.30 architectural rewrite).
6. **Interviewer archetype-matched.** Interviewer assignment uses `matchCitizenToJournalist_` archetype-match (Mason→civic figures, Maria→cultural/faith, DJ→neighborhood-texture, Kai→youth/education, etc.). Off-archetype assignment requires rationale in /sift transparency.
7. **No real-world Oakland institutions.** Tier 2 canon-substitute rule.
8. **World-altering canon surfaced.** Any new commitment, new fact, or new public position is identifiable in the transcript — a downstream reporter framing an article from this transcript can pull the canon-changing exchange directly. The transcript should make the canon-shift inspectable (the question setting it up + the subject's specific words). If nothing changed, the interview was a check-in, not canon-altering — that's a weakness, not a fail, but should be noted.
9. **Voice differentiation.** Dialogue reads as the SUBJECT speaking — characteristic phrases, sentence rhythm, hedging patterns match their established voice. Not interviewer's prose put in their mouth.

---

## What this skill is NOT graded against

- **Three-layer coverage.** Interviews are intrinsically subject-driven (Tier 1 voice + their recent decisions + what they say). Three-layer threading is a /write-edition criterion.
- **Citizen depth across the edition.** A given interview is one subject; breadth is the edition's job.
- **Vote math reconciliation.** Interviews don't usually report votes; if a vote comes up, it's a /city-hall-side claim the interview surfaces, not the interview's job to verify.

---

## Changelog

_Updated by `/post-publish` Step 10 after each cycle. What changed and why._

- S216 — Initial version (governance.2 close). 9 criteria covering theme statement, canon grounding, question progression, subject canon consistency, file paths, archetype-match, canon-substitute compliance, world-altering canon flagging, and voice differentiation. Voice differentiation (criterion 9) is the most subjective and most likely to need sharpening; the matchCitizenToJournalist_ archetype reference (criterion 6) depends on the helper existing — verify path before first run.
- S233 — pipeline.30 alignment. /interview v2.0 capture-only architectural rewrite removed the article-write step; this rubric grades the transcript as the sole canonical artifact. §Goals updated to capture-only framing with pointer to downstream framing skills' rubrics (story_evaluation.md for /write-edition, equivalent for /write-supplemental). §Criteria header updated to single canonical filename pattern (`cycle_pulse_interview-transcript_*` not legacy bare `cycle_pulse_interview_*`). Criterion 5 rewritten — single artifact path, no companion article. Criterion 8 rewritten — canon-shift identifiable in transcript so downstream framer can pull it directly. Source: [[../plans/2026-05-24-pipeline-30-interview-rewrite]].
