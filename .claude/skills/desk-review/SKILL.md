---
name: desk-review
description: Fork-path decoupled review flow (pipeline.44). Picks up unreviewed /deep-dispatch artifacts (~2 at a time), runs the EIC read + reviewer floor (ADR-0012 recalibrated), packages passing artifacts into the dispatch .txt format contract, and hands to /post-publish --type dispatch. Same lanes as the edition path, decoupled cadence.
version: "1.0"
updated: 2026-07-11
tags: [media, pipeline-44, fork, review, active]
effort: medium
disable-model-invocation: true
argument-hint: "<desk|all> [cycle-number]"
related_skills: [deep-dispatch, post-publish]
sources:
  - docs/research/2026-07-11-desk-slice-fork.md — the one-doc (fork design; review decoupled per Mike-direct S313)
  - docs/adr/0012-autonomous-deep-dispatch-write-edition.md — the recalibrated floor this flow applies
---

# /desk-review — Decoupled Review Flow (fork path)

## The Principle

Production and review are separate flows on the fork (Mike-direct S313): `/deep-dispatch` ends at artifacts-on-disk; this skill reviews and publishes them on its own cadence. Same floor as the edition path — nothing about autonomy weakened verification — but it works **~2 artifacts at a time instead of 9 at once**, which is where the review gets easier and more effective.

**The recalibrated floor (ADR-0012):** catch modern-Oakland civic invention + specific-fact errors (vote math, program scope, dates). Do NOT police journalistic reach, real-entity sports comps, or angle. Bug-is-event: an engine anomaly covered as an event is correct journalism, not an error to flag.

## Usage

`/desk-review <desk|all> [cycle-number]` — batches of ≤2 artifacts. Input: rows in `output/production_log_c{XX}.md` `## /deep-dispatch` with status complete and no `## /desk-review` verdict yet.

## Pass A — EIC read (Mags)

A real read, not a scan. Per artifact:

- **Lane + slice fit** — is this the desk's LANE? Does it write a storyline from the slice (or a defensible seam between slice storylines)?
- **Names** — every citizen against canon (MCP `lookup_citizen` for any name you don't recognize); names not traceable to the slice, sourcing, or canon are hallucination flags.
- **Quotes** — check attributed quotes against `output/voices/voices_c{XX}_{desk}.json` FIRST (verbatim or front/back-trim; paraphrase-then-attribute of a supplied line is fabrication), reconciled sourcing second.
- **REAL ASKS** — any claimed interview/query/"did not respond" must trace to a supplied line or recorded no-response in the run materials. A performed query that never occurred is cut or rewritten as plain absence.
- **Specific facts** — vote math (all 9, totals proven), program scope/districts, dates, dollars — spot-check against `world_summary_c{XX}` first, MCP second.
- **Craft screens** — calendar dates (cycles only; day-of-week OK), engine language (none), voice match to the journalist.

Fix what's fixable, cut what's broken. Log the read per artifact.

## Pass B — Reviewer floor

Launch `rhea-morgan` on the batch (sourcing verification — her lane, recalibrated per ADR-0012: verify specifics, don't strangle reach; the floor rules are already wired in `docs/media/story_evaluation.md` + her RULES). Record her findings per artifact. The heavier lanes (cycle-review reasoning, Mara result validity, capability, arbiter) run on this same decoupled cadence when invoked — same process as the edition path, just not inside production. Findings route back: fixable → fix and note; fabrication/canon-break → artifact fails.

## Pass C — Verdict + publish packaging

Per artifact: **PASS / FIXED-PASS / FAIL** logged to `output/production_log_c{XX}.md` `## /desk-review` (`| Desk | Artifact | EIC read | Rhea | Verdict | Published path |`). FAILs stay in the desk corpus unpublished — record why; the desk's next run can answer it.

For passing artifacts:
1. Package into the dispatch format contract: `editions/cycle_pulse_dispatch_{XX}_{slug}.txt` — masthead frame, the article, then the format-contract footers (NAMES INDEX / BUSINESSES NAMED / CITIZEN USAGE LOG) assembled from the artifact + voice packet, per [[../../../docs/media/EDITION_FORMAT_TEMPLATE]] sub-formats. The footers are what make ingest work — per-article, wiki-taggable (the fork's whole query gain).
2. **USER APPROVAL GATE (unchanged):** Mike OKs before anything saves to Drive / publishes. Queue passing artifacts and surface them; batch OK is fine.
3. On OK: `/post-publish --type dispatch --cycle {XX} --source editions/cycle_pulse_dispatch_{XX}_{slug}.txt` — the existing convergence point; per-type matrix already covers dispatch (wiki ingest, cards, intake, NotebookLM source push).

## Measurement (rides every run)

Note per batch: review wall-time + anything the 2-at-a-time cadence caught that the 9-at-once cadence historically missed. This feeds the fork's proof criteria (quality parity + reviewer effectiveness).

---

## Changelog

- 2026-07-11 — v1.0 (S313, pipeline.44 Task 4, Mike-approved name). Decoupled floor: EIC read (quotes-vs-packet, REAL-ASKS, recalibrated fact checks) → Rhea → verdict → dispatch-contract packaging → approval gate → /post-publish --type dispatch.
