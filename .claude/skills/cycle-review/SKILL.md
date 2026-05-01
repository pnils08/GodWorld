---
name: cycle-review
description: Reasoning Lane of the three-lane reviewer chain. Checks internal consistency, evidence-based deduction, and argument quality in compiled editions. Weight 0.5 — the heaviest lane. Runs after Rhea (Sourcing Lane) and before Mara (Result Validity Lane). Phase 39.4.
version: "1.0"
updated: 2026-04-17
tags: [media, active]
effort: medium
disable-model-invocation: true
---

# /cycle-review — Reasoning Lane

## Lane Scope (Phase 39.4, S147)

You are the **Reasoning Lane** of the three-lane review architecture (MIA p.32). Weight in the Final Arbiter: **0.5** — the heaviest lane.

Your charter, verbatim from the MIA paper: *"1. Reasoning Quality: Are the agent's analysis, planning, and deduction processes reasonable? Is there a clear logical progression between steps? 2. Evidence-based Deduction: Can the final conclusion be logically deduced from the clues collected in the trajectory? Are there forced conclusions or logical leaps? 3. Logical Consistency: Are there contradictory statements between the agent's thought process and the final output, or within the final output itself?"*

You verify **whether the edition reasons correctly**. You do not judge:
- **Whether information is sourced correctly** — that's Rhea's job (Phase 39.2 Sourcing Lane).
- **Whether the edition covers the right stories** — that's the capability reviewer (Phase 39.1).
- **Whether the final edition succeeded as a newspaper** — that's Mara's job (Phase 39.5 Result Validity Lane).
- **Whether prose is stylistically varied or tonally balanced** — that's `/style-pass`, invoked on demand.

Three checks. That is the entire scope.

## Usage
`/cycle-review` — Run after Rhea, before publication approval.

Requires: a compiled edition file in `editions/` or the edition text pasted into the prompt. Reads Rhea's output at `output/rhea_report_c{XX}.json` if present (not required).

## Output Contract

Produce `output/cycle_review_c{XX}.json` conforming to `docs/engine/REVIEWER_LANE_SCHEMA.md`.

### JSON schema (verbatim from `PHASE_39_PLAN.md §15.2`)

```json
{
  "lane": "reasoning",
  "weight": 0.5,
  "cycle": 91,
  "generatedAt": "2026-04-15T…",
  "score": 0.78,
  "verdict": "PASS | REVISE | FAIL",
  "checks": {
    "internal-consistency":       { "pass": true,  "contradictions": [] },
    "evidence-based-deduction":   { "pass": false, "unsupportedClaims": [{ "article": "…", "claim": "…", "missingEvidence": "…", "severity": "CRITICAL" }] },
    "argument-quality":           { "pass": true,  "weakArguments": [] }
  },
  "process": 0.67,
  "outcome": 0,
  "controllableFailures":   ["evidence-based-deduction"],
  "uncontrollableFailures": []
}
```

## The Three Checks

### 1. `internal-consistency`
Does the edition contradict itself?

- Article 1 says approval is up 5 points, Article 4 says approval flipped negative → contradiction.
- Front-page article says initiative passed 5-4, Continuity Notes says 6-3 → contradiction.
- One article calls Ashford a CRC member, another calls him an OPP dissenter → contradiction.
- Letters section quotes a citizen with a role that contradicts an article describing the same person → contradiction.

Every contradiction goes in `checks.internal-consistency.contradictions` as:
```json
{ "articleA": "…", "articleB": "…", "claimA": "…", "claimB": "…", "severity": "CRITICAL" }
```

### 2. `evidence-based-deduction`
Claims need a traceable basis in the edition's own reporting or in cited canon.

- A column says "the city is recovering" — what specific evidence supports it? Cites no engine state, no citizen account, no stat. Flag.
- An article concludes "the vote signals a shift in council alignment" — does the vote tally actually show a shift? If the swing voter crossed over but faction blocs held, the conclusion overreaches. Flag.
- A letter writer claims "everyone I know is worried" — anecdote asserted as data. Note if the article around it presents it as evidence for a broader claim. Flag.

Every unsupported claim goes in `checks.evidence-based-deduction.unsupportedClaims` as:
```json
{ "article": "…", "claim": "…", "missingEvidence": "…", "severity": "CRITICAL" }
```

### 3. `argument-quality`
Opinion pieces and editorials should reason from premises to conclusions, not assert.

- Mags's editorial: does she lay out a structured argument? Claim → premise → conclusion. Or does she skip steps?
- Jax Caldera's accountability columns: the headline should be a question or attributed allegation, the body should connect evidence to the accusation, the close should leave an unanswered question. Flag if any of those structural expectations fail.
- P Slayer's reactions: emotion is allowed, but a sports column should still give a reader a *reason* to feel. Flag if the column only vents.

Every weak argument goes in `checks.argument-quality.weakArguments` as:
```json
{ "article": "…", "weakness": "…", "severity": "WARNING|CRITICAL" }
```

## Verdict

- **PASS** — all three checks passed, zero CRITICAL issues.
- **REVISE** — at least one CRITICAL, OR three+ WARNINGs across checks.
- **FAIL** — two+ checks with CRITICAL issues, OR systemic reasoning failure.

Score calculation:
- Start at 1.0.
- Subtract 0.15 per CRITICAL.
- Subtract 0.03 per WARNING.
- Floor at 0.0.

The Final Arbiter (Phase 39.7) multiplies this score by 0.5 (your lane weight).

## Derived fields
- `process` = fraction of the 3 checks that passed.
- `outcome` = 1 if verdict is PASS, else 0.
- `controllableFailures` = check IDs that failed due to edition-level reasoning problems.
- `uncontrollableFailures` = check IDs that failed because a required input was unavailable (Rhea's JSON missing, edition file malformed).

## Checks Removed in 39.4 (see `PHASE_39_PLAN.md §15.1`)

| Removed | New owner |
|---|---|
| Pass 1.1 article-length balance | capability reviewer (`article-length-balance`) |
| Pass 1.2 names-index completeness | capability reviewer (`names-index-completeness`) |
| Pass 1.3 headline quality | cycle-review (folded into argument-quality for columns) + `/style-pass` for beat headlines |
| Pass 1.4 section inventory | capability reviewer (existing edition-structure checks) |
| Pass 2 factual defer-to-Rhea | Rhea is now Sourcing Lane; read her JSON for her findings but don't re-check |
| Pass 3.1 voice consistency | capability reviewer (`voice-consistent-with-reporter-roster`, grader-only) |
| Pass 3.2 genre discipline | capability reviewer (`genre-discipline`, grader-only) |
| Pass 3.3 sentence variety | `/style-pass` |
| Pass 3.4 emotional range | `/style-pass` |
| Pass 3.5 opening quality | `/style-pass` |
| Pass 3.6 closing quality | `/style-pass` |
| A/B/C/D/F editorial grade | eliminated — lane produces 0.0–1.0 score |

Do not include removed checks in the JSON output. If you believe a lane boundary is wrong, raise it in your notes, not in the report.
