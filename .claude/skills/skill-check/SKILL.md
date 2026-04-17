---
name: skill-check
description: Grade a production skill's run against its assertion file. Catches structural drift (skill ran but didn't do its job) that edition-level review misses. Runs during post-publish for the cycle that just shipped. Usage — `/skill-check write-edition 91` grades `/write-edition` on cycle 91 against `docs/media/story_evaluation.md`, produces `output/skill_check_<skill>_c<cycle>.json`. First target: write-edition. Expands to sift, dispatch, city-hall as assertion files appear.
---

# skill-check

Automated grader for GodWorld production skills. One skill, one cycle, one assertion file, one grading JSON out. Pattern lifted from Anthropic's skill-creator plugin (`grader.md`), narrowed to GodWorld's already-built assertion layer (`docs/media/story_evaluation.md`, `brief_template.md`, `citizen_selection.md` — S144).

## When to run

- **Automatic:** `/post-publish` calls this after each edition ships. Result feeds next-cycle `/sift` so drift carries forward as a signal.
- **Manual:** Run after a skill edit to regression-check against a prior cycle.
- **Retroactive:** Grade old cycles to spot drift patterns across editions.

## Inputs

- `$1` — skill name (e.g. `write-edition`)
- `$2` — cycle number (e.g. `91`)

## Skill → assertion file map

| Skill | Assertion source | Transcript | Outputs |
|-------|------------------|------------|---------|
| `write-edition` | `docs/media/story_evaluation.md` | `output/production_log_edition_c<N>.md` | `output/reporters/*/articles/c<N>_*.md`, `output/engine_audit_c<N>.json` (for signal cross-ref) |
| `sift` | `docs/media/story_evaluation.md` (priority signals + three-layer test) | `output/sift_proposals_c<N>.json` (proposal set — written by sift Step 2 before Mike picks) + `output/production_log_edition_c<N>.md` Step 2 (picks) | `output/engine_audit_c<N>.json`, `output/baseline_briefs_c<N>.json`, `output/reporters/*/c<N>_brief.md` |
| `city-hall` | TBD — create `docs/civic/decision_evaluation.md` first | `output/production_log_city_hall_c<N>.md` | `output/civic-voice/*_c<N>.json` |
| `dispatch` | TBD — create `docs/media/scene_evaluation.md` first | reporter production log | reporter article |

Only `write-edition` is live at first. Extend the map as assertion files land.

## Process

### Step 1: Load assertion file

Read the skill's assertion file. Extract the rules that can be graded structurally — statements like "front page leads with highest-severity engine signal" or "all sift-picked stories make it to compile." Skip prose.

### Step 2: Derive 3–6 assertions

Convert rules to boolean-checkable statements. Example for `/write-edition`:

- **A1** — All stories picked in Step 2 of production log appear in Step 5 compile OR are explicitly marked cut with reason.
- **A2** — Front page story links to the highest-severity engine signal from `engine_audit_c<N>.json` (stuck-initiative or trend pattern with severity >= medium, cyclesInState >= 3) OR the production log documents a deliberate editorial override.
- **A3** — Coverage-domain mix matches cycle-signal weight. If engine audit flagged 3+ civic patterns and 0–1 sports patterns, edition should not be majority-sports.
- **A4** — No reporter article cites a citizen not verified in Step 3 of the production log.
- **A5** — Every `ESTABLISHED CANON:` line in a reporter brief appears unmodified in the shipped article (no contradiction).

Each assertion must be verifiable from files on disk. No LLM judgment.

### Step 3: Grade each assertion

For each assertion:
1. Identify the file(s) needed.
2. Check the claim.
3. Record verdict + evidence quote.

### Step 4: Cross-reference against Mara / Rhea / cycle-review

Read `output/mara_report_c<N>.json`, `output/rhea_report_c<N>.json`, `output/cycle_review_c<N>.json` if they exist. For each skill-check fail, note whether any reviewer lane caught the same issue. For each reviewer fail, note whether a skill-check assertion would have caught it (if not, that's a gap to flag in `eval_feedback`).

### Step 5: Write result

Output `output/skill_check_<skill>_c<cycle>.json`:

```json
{
  "skill": "write-edition",
  "cycle": 91,
  "assertionSource": "docs/media/story_evaluation.md",
  "generatedAt": "<ISO>",
  "assertions": [
    { "id": "A1", "text": "...", "passed": false, "evidence": "Step 2 lists 8 stories, Temescal missing" }
  ],
  "summary": { "total": 5, "passed": 2, "failed": 3, "passRate": 0.4 },
  "reviewerOverlap": {
    "caughtByMara": ["A1", "A3"],
    "caughtByRhea": [],
    "skillCheckOnly": ["A2"]
  },
  "evalFeedback": {
    "suggestions": [],
    "overall": "Assertion set catches both Mara-documented fails plus one structural catch (front page vs engine signal)."
  }
}
```

### Step 6: Update the assertion file's changelog

Append to the assertion file's Changelog section a one-liner with cycle number, pass rate, and any `evalFeedback` overall note. Keeps the loop closed — every grading pass either confirms the rules or flags where they need to sharpen.

## Proof-of-concept result (c91, write-edition, S156)

Inline grading on c91 produced 3/3 fails matching Mara's findings:
- A1 — Temescal dropped (matches Mara completeness fail)
- A2 — Front page = NBA Expansion, not Temescal health (structural catch not in Mara's JSON)
- A3 — Sports-heavy on civic-heavy cycle (matches Mara coverage-breadth fail)

This confirms the checker would have flagged the same drift Mara caught post-publish — but at Step 4.5 Editorial Review, before publish, avoiding the A- errata rounds.

## What this skill is NOT

- Not a reviewer lane. Rhea/cycle-review/Mara grade editions post-compile for quality. This grades the skill's run — did the production tool do its job.
- Not a replacement for `/capability-review`. Capability review checks the compiled edition against 9 fixed assertions. This checks one skill's run against its own assertion file.
- Not an auto-fixer. Output is advisory — Mags reads and decides.

## Extension plan

- Once live for `/write-edition`: wire into `/post-publish` Step 10 changelog.
- Add `/sift` assertions next (easiest — same file, different lens).
- Create `docs/civic/decision_evaluation.md` before adding `/city-hall` target.
- Create `docs/media/scene_evaluation.md` before adding `/dispatch` target.
