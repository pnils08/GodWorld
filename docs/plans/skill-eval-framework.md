---
title: Skill Eval Framework Plan
created: 2026-04-16
updated: 2026-04-16
type: plan
tags: [architecture, active]
sources:
  - "claude.ai skill-creator plugin (S141 discovery)"
  - "docs/media/story_evaluation.md — assertion layer built S144"
  - "docs/media/brief_template.md — assertion layer built S144"
  - "docs/media/citizen_selection.md — assertion layer built S144"
  - "S140 failure modes Mike flagged — dispatch writing profiles not scenes, write-edition drifting, Mara grading everything A-"
pointers:
  - "[[engine/ROLLOUT_PLAN]] — parent; was embedded in Open Work Items"
  - "[[media/story_evaluation]] — assertion source"
  - "[[media/brief_template]] — assertion source"
  - "[[media/citizen_selection]] — assertion source"
---

# Skill Eval Framework Plan

**Status:** Designed S141, not built. HIGH priority.

Pull Anthropic's skill-creator plugin eval system. Don't mirror the whole plugin — reference canonical versions on claude.ai, build only the GodWorld-specific layer (assertions, eval configs, tie-ins to cycle data and editorial standards).

---

## 1. Core insight

Every failure mode Mike flagged in S140 — dispatch writing profiles instead of scenes, write-edition drifting mid-pipeline, Mara grading everything A- without real verification, editions missing the Temescal health crisis — is a case of "the skill technically ran but didn't do what it was supposed to do." The eval framework catches exactly that gap.

## 2. Source location

These files live on claude.ai as part of the skill-creator plugin. Don't mirror the whole plugin into the GodWorld repo — reference the canonical versions from claude.ai and only build the GodWorld-specific layer. Pull individual files only if we need to customize them.

## 3. Files to reference (minimum useful set)

1. **`agents/grader.md`** — reads transcript + outputs, judges each assertion, explicitly fails "surface-level compliance" (file exists but content is wrong). Extracts implicit claims from outputs and verifies them independently — counters the "performance grading" problem.
2. **`agents/analyzer.md`** — diagnoses WHY a failed eval failed. Not just "assertion X didn't pass" but "here's the pattern of failure across runs."
3. **`scripts/run_eval.py`** — runs one eval cycle: executor produces output, grader judges it, results go to disk.
4. **`scripts/run_loop.py`** — **the killer feature.** Runs eval → analyze → improve skill → re-eval → compare, iterating until the skill passes. This is the closed feedback loop that lets a skill improve itself against real assertions. Set editorial standards once, let it iterate, walk away.
5. **`scripts/quick_validate.py`** — cheap sanity check that a skill folder is structurally valid. Would have caught the S140 dispatch skill being built with bad brief structure.
6. **`references/schemas.md`** — data schemas for transcripts, grading output, eval config. Read before wiring anything.

## 4. Skip (for now)

- `agents/comparator.md` — only useful for A/B testing skill versions
- `assets/eval-viewer`, `assets/eval_review.html`, `scripts/generate_report.py` — HTML visualization
- `scripts/aggregate_benchmark.py` — only useful once many evals exist
- `scripts/improve_description.py` — cosmetic

## 5. Also note

- `scripts/package_skill.py` — turns a skill folder into a distributable `.skill` zip. LOW priority standalone but useful once Mags skills want to be portable across projects.
- The sibling `mcp-builder` plugin helps build MCP servers — we already have `godworld-mcp` working, so this is reference material for the next MCP server, not an urgent tool.

## 6. S144 update

The GodWorld-specific assertion layer exists: [[media/story_evaluation]], [[media/brief_template]], [[media/citizen_selection]]. Each has a changelog section that post-publish Step 10 updates per cycle. The skill-creator eval framework would grade against these assertion files, running `run_eval.py` after each edition and logging pass/fail per criterion.

**Integration path:** wrap post-publish Step 10 with the grader agent so it produces a scored delta instead of free-form review notes.

## 7. First GodWorld evals to write (once framework is pulled in)

- **write-edition:** "front page leads with highest-severity engine signal, not sports by default"; "at least 3 named female citizens in non-official capacities"; "no article set in a sports bar unless sports is the cycle's top story"
- **dispatch:** "scene is one location, no characters introduced with biographical data dumps, ends on an image not a summary"
- **city-hall:** "every pending decision has an outcome written; every outcome references an engine-reachable effect"
- **sift:** assertions on thread extraction completeness, three-layer coverage per proposal, front page scoring accuracy

---

## Changelog

- 2026-04-16 — Extracted from [[engine/ROLLOUT_PLAN]] §Open Work Items (S152). Was a ~35-line embedded design — substantial enough to warrant its own plan file. Content preserved verbatim.
- 2026-04-16 (S156) — **First skill shipped: `/skill-check`** at `.claude/skills/skill-check/SKILL.md`. Covers `/write-edition` against `docs/media/story_evaluation.md` using the pattern from Anthropic skill-creator `grader.md` (plugin on disk at `/root/.claude/plugins/marketplaces/claude-plugins-official/plugins/skill-creator`). Wired into `/post-publish` Step 10 as the first feedback source. Proof-of-concept run on c91 produced 3/5 fails matching Mara's documented failures plus one structural catch (Varek front-page anti-rule). Evidence: `output/skill_check_write-edition_c91.json`. Next: add `/sift` target (same assertion file, different lens), then stand up assertion files for `/city-hall` and `/dispatch`. Closed-loop `run_loop.py` (eval → analyze → edit → re-eval) still un-pulled — adding it makes sense once 2–3 skills are graded and the iteration surface is real.
