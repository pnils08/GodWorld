---
name: capability-review
description: Phase 39.1 capability reviewer wrapper. Runs the deterministic editorial assertions against a compiled edition, surfaces blocking failures that should halt publish, and writes a markdown summary alongside the JSON.
version: "1.1"
updated: 2026-06-20
tags: [media, active]
effort: low
disable-model-invocation: true
---

# /capability-review — Editorial Capability Verification

**Phase 39.1.** Plugs into `/write-edition` as Step 3.5 (between Compile and Validation+Rhea). Catches structural editorial gaps — front page missing the highest-severity ailment, citizen names that don't resolve to canon, engine metrics leaking into journalism — before publish, not after.

## What this skill is

A thin wrapper around `scripts/capabilityReviewer.js`. The script does the deterministic work (9 of 11 assertions, 2 deferred to the Haiku grader). The skill is responsible for:

1. Running the script against the current cycle.
2. Showing the user a tight summary of what passed and what failed.
3. **Enforcing the publish gate** on blocking failures.
4. Writing a markdown companion to the JSON output for human reading.

## Step 1 — Run the script

```bash
node scripts/capabilityReviewer.js {CYCLE}
```

Fail loudly if exit code is non-zero. Required inputs (the script will error if missing):
- `editions/cycle_pulse_edition_{CYCLE}.txt` — compiled edition from write-edition Step 3
- `output/engine_audit_c{CYCLE}.json` — produced by `scripts/engineAuditor.js` (Phase 38.1)
- `scripts/capability-reviewer/assertions.json` — declarative rubric

## Step 2 — Read the JSON

`output/capability_review_c{CYCLE}.json` contains `results[]` (one entry per assertion) and `summary` with `blockingFailures[]` and `advisoryFailures[]`.

Each result has `id`, `category`, `tier`, `pass`, `confidence`, `reason`, `evidence`, `rubricSource`.

## Step 3 — Show the summary

Format for the user:

```
Capability Review — Cycle {N}

5/9 passed in 0.82s
  category breakdown: coverage 1, three-layer 2, freshness 1, rubric-fidelity 3, representation 1
  deferred (need Haiku key): 2

BLOCKING (would halt publish):
  ✗ front-page-leads-with-highest-severity-ailment
    Temescal Community Health Center (cyclesInState=88) not covered.
    rubric: story_evaluation.md §Priority Signals + §Varek Anti-Example
  ✗ no-engine-metrics-in-journalism
    3 articles use forbidden tokens (e.g., "cycles" in narrative copy).
    rubric: .claude/rules/newsroom.md

ADVISORY (ships with flag):
  ✗ canon-names-not-invented (Nn unresolved candidates — likely needs MCP get_roster wiring)
  ✗ at-least-three-female-citizens-non-official (Nn non-official; target 3)
```

## Step 4 — Enforce the publish gate

For every entry in `summary.blockingFailures`:

- **Stop.** Show the failure to the user. Show the relevant `evidence` and `rubricSource`.
- Ask the user to choose one of three responses:
  1. **Fix and re-run** — go back to the relevant reporter (or to `/sift` if the failure is structural like a missing front-page topic). Re-run capability review after the fix.
  2. **Override and proceed** — publish anyway with the failure logged. Use sparingly; the failure goes into the next cycle's editorial notes.
  3. **Defer publish** — write the failure summary into the production log and stop the chain entirely.

Advisory failures don't gate publish. They get logged into the production log so the next sift session sees them.

### Known advisory false-positives (RB-4, C98 G-W reviewer-handoff)

Three advisory assertions recur as false-positives every cycle — they are **known non-blocking noise, not findings.** Acknowledge and move past them; do not send a reporter back or re-run on their account. They are advisory (they never gate publish), but each reads as a finding every cycle and costs a re-investigation it doesn't warrant:

- **`canon-names-not-invented`** — grabs headline fragments and flags them as unresolved citizen candidates. Its name-extraction pass treats capitalized headline tokens as person names, so most "unresolved candidates" it reports are headline fragments, not invented citizens. Real invented-name leaks are caught by Rhea's sourcing lane — trust that lane, not this advisory's candidate count.
- **`article-length-balance`** — reads body-merge concatenation as one over-long article. When two articles compile adjacent without the expected separator, the assertion measures their combined length and flags imbalance; the underlying articles are individually in range. Verify against the compiled section, not the advisory.
- **`names-index-completeness`** — expects a per-article names index, but the edition carries an edition-level NAMES INDEX per [[../../../docs/media/EDITION_FORMAT_TEMPLATE|EDITION_FORMAT_TEMPLATE]]. The per-article expectation is a spec mismatch with the actual format contract; the edition-level index is correct and complete.

Documented here so each cycle's operator recognizes them on sight rather than re-diagnosing. The durable fix (re-scoping the three checks in `scripts/capability-reviewer/assertions.json` so they stop mis-firing) is an engine-sheet assertion-tuning item — file it if the noise ever becomes load-bearing; until then recognition is cheaper than re-tuning advisory-only checks.

## Step 5 — Write the markdown companion

Generate `output/capability_review_c{CYCLE}.md` from the JSON. Format:

```markdown
# Capability Review — Cycle {N}

**Generated:** {timestamp}
**Reviewer version:** {reviewerVersion}
**Edition:** {edition filename}
**Audit JSON:** {audit filename}
**Runtime:** {elapsedSeconds}s

## Summary

- **{passed}/{total}** assertions passed
- **{blockingCount}** blocking failures
- **{advisoryCount}** advisory failures
- Deferred (need Haiku grader): {deferredCount}

## Blocking Failures

### {assertion id}
- **Question:** {question}
- **Reason:** {reason}
- **Rubric:** {rubricSource}
- **Evidence:** {evidence}

(repeat for each blocking failure)

## Advisory Failures

(same format as blocking, lower severity)

## Passed

(brief list, one line per — no need for evidence)

## Deferred Assertions

These need the Anthropic API key wired before they can run:

- {assertion id} — {rubricSource}

(this section explains why N/11 instead of 11/11 pass)
```

## Where this sits

Step 3.5 in `/write-edition`. Order: pre-flight → engine-review → build-world-summary → city-hall-prep → sift → write-edition (steps 1–3 produce the compiled edition) → **/capability-review** (Step 3.5) → write-edition Step 4 (validation+Rhea) → Step 5 (Mara) → Step 6 (publish) → post-publish.

## Outputs

| File | Purpose |
|---|---|
| `output/capability_review_c{XX}.json` | Structured results, consumed by the Final Arbiter agent (Phase 39.7, future). |
| `output/capability_review_c{XX}.md` | Human-readable summary, included in the production log. |

## Why this exists

Per `docs/engine/PHASE_39_PLAN.md` §1, current verification asks "did the agent do its job correctly?" but no reviewer asks "was this the right job?" — capability verification. The Varek anti-example (E91 led with NBA expansion while Temescal ran four cycles uncovered) is the structural failure this catches at Step 3.5 instead of accepting after publish.

## Two assertions are deferred

`scripts/capability-reviewer/assertions.json` lists 2 grader-only assertions under `graderOnlyAssertions` — they need an Anthropic API key wired for direct Haiku 4.5 calls. When that lands, they activate without code changes (the orchestrator already iterates the deferred list and writes them into output for visibility).

The 9 active assertions cover all 5 categories (coverage, representation, three-layer, freshness, rubric-fidelity), which is the §8 acceptance criterion #7 bar.

## Changelog

- 2026-06-20 — v1.1 (S265, research-build closing governance.41 RB-4). Step 4 gains **Known advisory false-positives** — three advisory assertions (`canon-names-not-invented`, `article-length-balance`, `names-index-completeness`) documented as known non-blocking noise so each cycle's operator recognizes them on sight instead of re-diagnosing. Durable assertion re-scope deferred to engine-sheet. Source gap: `output/production_log_c98_post_publish_gaps.md` §G-W reviewer-handoff. Plan: [[../../../docs/plans/2026-06-20-c98-gap-log-triage]] RB-4.
- 2026-04-17 — v1.0 initial (Phase 39.1).
