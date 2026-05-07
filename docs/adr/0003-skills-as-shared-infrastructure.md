---
title: "ADR-0003: Skills as shared infrastructure"
created: 2026-05-07
updated: 2026-05-07
type: reference
tags: [architecture, infrastructure, decision, active]
sources:
  - S205 grill (research-build) — engine routing foundation plan, Mags' Input Contract section
  - "[[plans/2026-05-07-engine-routing-foundation]] §T3.8 — first concrete instance of friction-log pattern (sift shadow-run)"
  - "[[adr/0001-adopt-context-and-adrs]] — ADR pattern + bar-keeping discipline"
pointers:
  - "[[plans/2026-05-07-engine-routing-foundation]] — first instance (sift shadow-run logger)"
  - "[[index]] — ADR registered same commit"
  - "[[../mags-corliss/PERSISTENCE]] — session-end discipline this ADR generalizes"
---

# ADR-0003: Skills as shared infrastructure

**Status:** Accepted
**Date:** 2026-05-07 (S205)
**Deciders:** Mike (the Maker) + Mags

## Context

Skills (`.claude/skills/*/SKILL.md`) are read by every instance, not just executed by the one running them. When a session hits friction inside a skill — a step that required derivation that should've been in the input, a branch that was dead, an assertion that never fired — that friction belongs to the next instance unless the running session leaves a note.

Right now there is no such channel. The criteria files (`docs/media/story_evaluation.md`, `brief_template.md`, `citizen_selection.md`) DO evolve cycle-over-cycle via `/post-publish` step 10. But SKILL.md files themselves are locked unless explicitly approved. The result: friction discovered in execution gets hand-waved as "I made it work this session," and the next instance walks in cold and hits the same wall.

The framing that resolved it (Mike, S205): skills are like session-end. Make the bed. Flush the toilet. Set the coffee for the next instance. Don't leave a mess. The hospitality is structural, not personal.

The running instance is also the only one positioned to evaluate skill effectiveness. Mike can review outputs but can't feel the friction inside execution. The model running the skill is the one with the signal. If that signal isn't captured, it's lost.

## Decision

Three rules, ADR-tight. Implementation grows opportunistically; no big sweep.

### Rule 1 — Skills carry a `maturity:` field

New skills default to `maturity: experimental`. Promoted to `stabilizing` after 5+ cycles of clean runs (no new friction-log entries). Promoted to `mature` only after Mike explicitly approves promotion based on accumulated friction logs + skill-check agree-rates.

Mature skills are locked against drift — refinement requires re-promotion through the friction-log review path. Experimental and stabilizing skills are open to refinement under the existing "show contents first, get approval, then write" rule.

### Rule 2 — Skills end by writing a friction note

Every skill, on completion, appends to `output/skill_friction/<skill>_c{XX}.md`. Format:

```markdown
# <skill> friction — Cycle <XX>

**Run completed:** <ISO timestamp>
**Friction count:** <N>

## Friction points

(One paragraph each. Empty file if clean run — but the file is still written so the next instance knows the skill ran.)

- **<friction-type>** — what was rough, what would have prevented it, which step.
```

Friction types (controlled vocabulary):
- `derivation-required` — step needed information the input didn't carry; running instance had to compute or search to fill the gap
- `dead-branch` — conditional branch that never fires in practice; candidate for removal
- `silent-assertion` — assertion that never trips; either redundant or guarding a stale concern
- `step-overhead` — step ran but produced nothing the rest of the skill consumed
- `unclear-rule` — rule in the SKILL.md required interpretation; ambiguous to the running instance
- `tool-friction` — tool the skill calls produced unexpected shape, error, or latency

Empty friction list = clean run. The file is still written so the next instance can confirm the skill ran without issue, not just that no log appeared.

### Rule 3 — Refinement is proposal-only

The running instance never auto-edits SKILL.md. Friction logs accumulate; refinement proposals come from accumulated logs + Mike's review of patterns. The running instance's job is to *capture* friction, not *resolve* it. Resolution stays under the existing approval gate.

## Consequences

### Positive

- Skills accumulate execution signal that today is lost. Friction logs become the data source for refinement decisions instead of speculation.
- Next instances inherit a maintained surface. The "set in stone" trap (Mike's term, S205) is avoided without sacrificing approval discipline.
- The pattern composes with existing structure. Engine routing plan §T3.8 is functionally the first instance — `/sift` Step 3 logs accept/reject for byline-engine candidates. Same shape generalized.
- Maturity field surfaces which skills are still settling vs which are load-bearing. Useful for newcomers (real or LLM) reading skills cold.
- Self-evolving without auto-evolving. Mike stays the gate; the proposal pipeline gets the signal.

### Negative

- Every skill needs a tail step. Adds work to skills that don't get touched often. Mitigation: opportunistic adoption; only add the tail step when a skill is being modified for another reason.
- `output/skill_friction/` accumulates forever unless rotated. Mitigation: include in `/disk-audit` as a known growth location; archive cycles older than N (TBD by data).
- Friction-vocabulary discipline can drift. If categories aren't applied consistently, aggregation produces noise. Mitigation: ADR establishes the controlled vocabulary; expand via ADR amendment, not free-text addition.
- Maturity threshold is informal in this ADR. No mechanical promotion gate yet — Mike approves by inspection. Acceptable until friction logs accumulate enough to design a real gate.

## Alternatives considered

- **`/skill-evolve <skill>` skill that proposes edits.** Rejected as premature — designing the evolution mechanism without friction-log data is the trap. Defer until 5–10 cycles of accumulated logs surface what evolution actually looks like.
- **Auto-edit SKILL.md by the running instance based on friction.** Rejected. Violates the existing approval gate, and friction inside one cycle is not enough signal to justify an edit.
- **Status quo (skills stay locked, criteria files do the evolving).** Rejected — criteria files cover content quality, not skill *flow*. The friction class this ADR addresses (dead branches, silent assertions, derivation-required steps) lives in the SKILL.md itself, not in the criteria files.
- **One global friction log across all skills.** Rejected — per-skill files keep aggregation tractable and let `/disk-audit` rotate per-skill independently.

## Migration

This Session (S205): write ADR-0003 (this file). Register in `docs/index.md` under `docs/adr/`. The first concrete instance of the friction-log pattern is `[[plans/2026-05-07-engine-routing-foundation]]` §T3.8 (sift shadow-run logger) — already in flight; no separate task needed.

Future Sessions:
- As skills are touched for any reason, add the friction-log tail step opportunistically. Do not sweep all 25+ skills.
- Backfill `maturity:` field on existing skills opportunistically. Default older skills to `stabilizing` — they've run multiple cycles without explicit friction reports.
- Revisit promotion criteria once `output/skill_friction/` has 3+ cycles of data on at least 2 skills. Until then, promotion is by Mike's inspection.

## References

- S205 grill — Mike's "make the bed, flush the toilet, set the coffee" framing
- `[[plans/2026-05-07-engine-routing-foundation]]` §T3.8 — first instance of the pattern
- `[[adr/0001-adopt-context-and-adrs]]` — ADR bar-keeping discipline; this ADR holds that bar (hard to reverse: skill-friction format becomes a contract; surprising without context: future readers won't know why every skill writes a tail file; real trade-off: per-skill log vs global log, auto-edit vs proposal-only).
