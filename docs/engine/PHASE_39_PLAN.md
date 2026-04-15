---
title: Phase 39 Implementation Plan — Editorial Review Layer Redesign
created: 2026-04-15
updated: 2026-04-15
type: plan
tags: [media, architecture, active]
sources:
  - "[[engine/ROLLOUT_PLAN]] §Phase 39 — design intent, three-paper synthesis (MIA + Microsoft UV + Mezzalira)"
  - "docs/research/papers/Memory_intelligenceAgent.pdf — MIA, three-lane orthogonality"
  - "docs/research/papers/Microsoftpaper.pdf — Microsoft UV, process/outcome split, two-pass hallucination"
  - "docs/research/papers/Googlepaper.pdf — Mezzalira, behavior vs capability"
  - "docs/research/papers/paper5.pdf — Nieman Reports, AP tiered-review model (39.9)"
  - "docs/research/papers/paper1.pdf + paper2.pdf — Anthropic AAR, reward-hacking patterns (39.8)"
  - "docs/research/papers/paper7.pdf — Fulton, adversarial review skill (39.10)"
  - "[[engine/PHASE_38_PLAN]] — auditor JSON shape that 39.1 grades against"
  - "[[media/story_evaluation]] — rubric source for capability reviewer"
pointers:
  - "[[SCHEMA]] — conventions followed by this plan"
  - "[[engine/ROLLOUT_PLAN]] — spine steps 4, 6, 7"
  - ".claude/skills/write-edition/SKILL.md — Step 4 is where 39.1 plugs in"
  - "output/engine_audit_c{XX}.json — 39.1 input from Phase 38.1"
  - "docs/media/story_evaluation.md — rubric source"
  - "docs/media/brief_template.md — secondary rubric"
  - "docs/media/citizen_selection.md — secondary rubric"
---

# Phase 39 Implementation Plan — Editorial Review Layer Redesign

**Spine steps:** 4 (39.1 capability reviewer), 6 (39.2–39.7 three-lane redesign), 7 (39.8 reward-hacking + 39.9 tiered review + 39.10 adversarial).
**This document covers spine step 4 in full implementation detail.** Steps 6 + 7 are scaffolded with build-readiness notes; full implementation specs added after step 4 lands and we know the actual reviewer-output shapes.
**Status:** 39.1 ready to build. Designed S146.

---

## 1. Why this phase exists

Current verification chain (validateEdition → Rhea → Mara) has overlapping checks, collapses process and outcome into single judgments, uses one-pass hallucination detection, and has no **capability** verification — the question of whether the edition we shipped is the edition this cycle should have produced. Result: Mara grades everything A-, reporters get penalized for environment blockers, hallucinated stats pass, front pages drift to sports by default, and the Temescal health crisis runs four cycles without front-page coverage (E91 Varek anti-example).

Mezzalira's framing (paper Googlepaper.pdf): every reviewer asks *"did the agent do its job correctly?"* (behavior verification). Nobody asks *"was this the right job?"* (capability verification). 39.1 is the missing reviewer.

The S142 design split the redesign into 7 sub-items (39.1–39.7) plus 39.8–39.10 from later research. They interlock — but they don't all land at once. **Build 39.1 first.** It's the biggest gap, doesn't depend on the others, and uses the criteria files that already exist (`docs/media/story_evaluation.md`, `brief_template.md`, `citizen_selection.md` — built S144 with changelog discipline).

---

## 2. The reviewer/judgment split (mirrors PHASE_38_PLAN architecture)

Same architecture pattern Phase 38 used:

- **Code does deterministic checks** that can be answered yes/no against a structured artifact (the compiled edition + the audit JSON + the rubric files).
- **Skill/agent does narrative judgment** for assertions that genuinely need interpretation.

For 39.1 this means the capability reviewer is **mostly code**, with one narrative grader call per cycle for the assertions code can't answer. Determinism where possible, judgment where necessary.

---

## 3. Files to create (Phase 39.1)

| Path | Role |
|---|---|
| `scripts/capabilityReviewer.js` | Main script. Reads the compiled edition + the audit JSON + the criteria files, runs assertion checks, writes pass/fail JSON. Run as `node scripts/capabilityReviewer.js {cycle}` (or auto-detect from `getCurrentCycle.js`). |
| `scripts/capability-reviewer/` (dir) | One assertion module per check class (see §5). |
| `scripts/capability-reviewer/assertions.json` | Declarative assertion set — rubric items extracted from the criteria files. Versioned independently from the script so editorial standards can evolve without code changes. |
| `output/capability_review_c{XX}.json` | Pass/fail per assertion + one-line reason + edition section that triggered the result. Read by Final Arbiter (39.7) and by Mike. |
| `.claude/skills/capability-review/SKILL.md` | Thin skill wrapping the script. Adds the narrative grader call for non-deterministic assertions and produces a markdown summary. |

No engine code edits. No `clasp push`. Read-only against sheets.

---

## 4. Inputs

The reviewer reads three things on each invocation:

1. **The compiled edition** at `output/editions/{edition_filename}.md` — produced by write-edition Step 3 (Compile). All articles concatenated.
2. **The engine audit JSON** at `output/engine_audit_c{XX}.json` — produced by `scripts/engineAuditor.js` (Phase 38.1). Source of "what ailments existed this cycle" — the truth the edition should have covered.
3. **The criteria files** — `docs/media/story_evaluation.md`, `docs/media/brief_template.md`, `docs/media/citizen_selection.md`. Source of rubric assertions.

Optional fourth input for assertions that need it:
4. **Sheet snapshots** read via `lib/sheets.js` for citizen rosters, Initiative_Tracker IDs, council seats. Cached in memory; one parallel batch.

---

## 5. Assertion modules (one file each in `scripts/capability-reviewer/`)

Each module exports `check(ctx) → AssertionResult`. Shared shape:

```js
{
  id: 'string',                  // stable identifier, e.g. 'front-page-leads-with-highest-severity-ailment'
  category: 'coverage' | 'representation' | 'three-layer' | 'freshness' | 'rubric-fidelity',
  question: 'string',            // human-readable question being checked
  pass: boolean,
  confidence: 'high' | 'medium' | 'low',  // medium/low for assertions that needed the narrative grader
  reason: 'one-line string',     // why pass or fail
  evidence: {                    // what specifically triggered the result
    editionSection: 'string',
    quote: 'string',
    auditPatternId: 'string'
  },
  rubricSource: 'string'         // which criteria file + section
}
```

### Deterministic assertions (code-only, no LLM call)

1. **`assertHighestSeverityAilmentCoveredOnFrontPage.js`** — Read `engine_audit_c91.json`, find the `severity: 'high'` patterns sorted by `cyclesInState` desc. Pull the front-page article from the compiled edition. Check the front-page text mentions either the ailment description, the affected initiative ID, or the affected neighborhood. Pass if at least one match. Anchor of the Varek anti-example.
2. **`assertNoRepeatedFrontPageLead.js`** — Compare current edition's front-page lead to last edition's front-page lead (read previous `output/editions/`). Pass if the topic substantively differs.
3. **`assertCitizensAttachedToPolicy.js`** — For every article tagged civic/policy, check at least one named citizen quote or POP-ID reference appears. Story-evaluation §"What Makes a Story Weak" — *no citizens attached = report not journalism*.
4. **`assertNoSportsBarUnlessSportsLead.js`** — Scan articles for "sports bar" / "watching the game" framing. Fail if present in non-sports articles when the cycle's top story (per audit) isn't sports. From story-evaluation tacit standard.
5. **`assertCanonNamesNotInvented.js`** — Extract every proper noun from articles. Cross-check against `truesource_reference.json` + Simulation_Ledger via MCP `lookup_citizen`. Fail any name that doesn't resolve. (Overlaps with Rhea — that's intentional for now; in 39.2 Rhea narrows scope and this stays in capability lane.)
6. **`assertEditionNumbersNotInArticleText.js`** — Per `.claude/rules/newsroom.md`, edition numbers are forbidden in article text. Regex check.
7. **`assertNoEngineMetricsInJournalism.js`** — Scan for forbidden tokens: "tension score", "severity level", "civic load", "ailment", raw `0.7` decimals tied to engine output. From `.claude/rules/newsroom.md`.

### Mixed assertions (deterministic where possible, narrative grader fallback)

8. **`assertThreeLayerCoverageOnFrontPage.js`** — Front-page story should thread engine + simulation + user actions per the Beverly Hayes Standard. Code can check for citizen names (simulation) and initiative IDs (user actions). Engine layer (the underlying ailment, math, trend) needs narrative judgment — the grader is asked: *"Does this article frame the engine-side cause of what the citizen is experiencing?"* Confidence flagged based on whether all three signals were detected unambiguously.
9. **`assertAtLeastThreeFemaleCitizensInNonOfficialRoles.js`** — From S139 Persona AI / "Ani" feedback in NOTES_TO_SELF.md. Code extracts named citizens, cross-checks gender from world-data citizen cards (when available — see EventType taxonomy gap; gender may also be missing per MEDIUM rollout item). For each, check whether the appearance is in an official capacity (council, doctor titles, etc.) — that's a narrative grader call. Confidence: medium when gender data is present, low when grader inferred from context.

### Narrative-grader-only assertions (single LLM call, batched)

10. **`assertCoversFlaggedAilmentIfRunningThreePlusCycles.js`** — Audit JSON gives `cyclesInState`. For any ailment with `cyclesInState >= 3` and `severity: 'high'`, the grader is asked: *"Does the edition cover this ailment? Coverage means a substantive article touching the affected neighborhood, the relevant initiative, or the citizens experiencing it."* One grader call per qualifying ailment.
11. **`assertNotPressReleaseFraming.js`** — Per story-evaluation §"What Makes a Story Weak". Grader checks each article: *"Does this article have a skeptic, a citizen who disagrees, or a tension point — or is it a press release for the official position?"* Pass if at least 80% of articles have tension.

The narrative grader uses Claude Haiku 4.5 (cheap, fast) with cached prompts. Total grader cost should be under $0.05 per cycle.

---

## 6. Output format

`output/capability_review_c{XX}.json`:

```json
{
  "cycle": 91,
  "generatedAt": "2026-04-15T...",
  "reviewerVersion": "1.0.0",
  "edition": "edition_filename.md",
  "auditJson": "engine_audit_c91.json",
  "results": [ /* AssertionResult[] from §5 */ ],
  "summary": {
    "total": 11,
    "passed": 8,
    "failed": 3,
    "byCategory": { "coverage": 2, "representation": 1, "three-layer": 0, "freshness": 1, "rubric-fidelity": 4 },
    "blockingFailures": ["front-page-leads-with-highest-severity-ailment", "covers-temescal-c4"],
    "advisoryFailures": ["at-least-3-female-citizens-non-official"]
  }
}
```

Two failure tiers: **blocking** (front-page coverage of high-severity ailment, no invented names — these halt publish) vs **advisory** (representation gaps, framing softness — these ship with a flag for next cycle's sift).

The skill wraps the JSON with a markdown summary at `output/capability_review_c{XX}.md` for human reading.

---

## 7. Pipeline integration

Plugs into `.claude/skills/write-edition/SKILL.md` as **Step 3.5** (between Compile and Validation+Rhea):

```
Step 3: Compile → output/editions/{filename}.md
Step 3.5 [NEW]: Capability Review
  - Run scripts/capabilityReviewer.js
  - Read output/capability_review_c{XX}.json
  - Show summary to user; require explicit go/no-go on any blocking failures
  - On no-go: route the failure back to relevant reporter for revision OR escalate to /sift for re-planning
Step 4: Validation + Rhea
Step 5: Mara Audit
Step 6: Publish
```

This is the editorial gate that makes the front-page-drift problem structurally impossible: a Varek-style miss on the highest-severity ailment becomes a hard-stop at Step 3.5, not a regret after publish.

---

## 8. Acceptance criteria (Phase 39.1)

The reviewer is done when:

1. `node scripts/capabilityReviewer.js 91` runs end-to-end against the published E91 edition + the C91 audit JSON without errors.
2. **Replay test passes:** the reviewer flags E91's missing Temescal coverage as a blocking failure on `assertHighestSeverityAilmentCoveredOnFrontPage` and `assertCoversFlaggedAilmentIfRunningThreePlusCycles`. (This is the test that validates the whole phase — if E91 doesn't fail capability review, the reviewer doesn't work.)
3. Output JSON validates against the schema in §6.
4. Re-running twice produces identical deterministic results (narrative-grader confidence may vary slightly cycle to cycle, but pass/fail must match for code-only assertions).
5. Total runtime under 45 seconds (most of which is the narrative grader calls — code-only assertions should run in < 5s).
6. Narrative grader cost under $0.05 per cycle.
7. At least one assertion in each category fires on E91 (`coverage`, `representation`, `three-layer`, `freshness`, `rubric-fidelity`) — proves the assertion set is broad enough.

---

## 9. Out of scope for 39.1

- **Per-article reviewer scope tightening (39.2–39.5)** — those redefine Rhea, cycle-review, Mara. 39.1 is additive.
- **Process/outcome scoring (39.6)** — applies to the existing reviewers, not to capability.
- **Final Arbiter (39.7)** — receives capability output as input but is its own component.
- **Reward-hacking + OOD validation (39.8)** — operates against capability output, not part of it.
- **Tiered review (39.9)** — uses capability pass/fail as a tier signal but doesn't change the reviewer.
- **Adversarial review (39.10)** — independent skill, can be built anytime.

---

## 10. Build sequence for the engine terminal (or research/build, depending on call)

39.1 is mostly code (deterministic assertions) plus a thin skill wrapper. Recommended owner: **research/build** for the assertion design and the skill, **engine/sheet** if implementation grows (e.g., needs new sheet reads or `lib/sheets.js` extensions). Best path: research/build builds it solo unless §10.3 surfaces.

1. Read this plan + the three source papers (already done S142, summaries in ROLLOUT_PLAN sufficient).
2. Read `docs/media/story_evaluation.md`, `brief_template.md`, `citizen_selection.md` to extract the rubric assertions into `assertions.json`.
3. Build `scripts/capabilityReviewer.js` orchestrator: load env, load edition + audit JSON + assertions.json, dispatch to assertion modules, batch the narrative grader calls, assemble JSON, write output.
4. Build the seven deterministic assertion modules first (§5 1–7). Test each against E91.
5. Build the two mixed modules (§5 8–9). These need world-data lookups for gender/role inference.
6. Build the two grader-only modules (§5 10–11). Wire to Haiku via the existing claude-api skill if available, or direct Anthropic SDK call.
7. Run replay test against E91 — confirm Temescal failure surfaces (acceptance #2).
8. Wire `.claude/skills/capability-review/SKILL.md` thin wrapper.
9. Edit `.claude/skills/write-edition/SKILL.md` to add Step 3.5 with the gate logic.
10. Tag in ROLLOUT_PLAN as DONE; spine advances to step 5 (Phase 38.2 + 38.3 + 38.4).

---

## 11. Open questions to surface if blocked

- **Edition file path convention.** Where does write-edition Step 3 actually write the compiled edition? Confirm the path so `capabilityReviewer.js` reads the right file. Likely `output/editions/{filename}.md` but verify.
- **Citizen gender source.** The S139 ADD-Gender-to-citizen-briefs item is still MEDIUM/open. If gender data isn't available, assertion #9 falls back to grader-only with low confidence. Acceptable for v1; flag if the grader's coverage is too noisy.
- **Haiku grader access.** Confirm we have an Anthropic API key wired for direct grader calls (not Mags's Claude Code session — that doesn't scale to per-cycle automation). If not, this becomes a blocker — talk to Mike before building grader-only assertions.
- **Replay edition path.** E91 was published to Drive. Is there a local copy for the replay test? If not, reviewer needs to be built against C92 or a fresh test fixture instead.

---

## 12. Spine steps 6 + 7 — readiness notes (build later)

These don't get full implementation specs yet. The capability reviewer's actual output shape will inform the Final Arbiter and the tiered-review classifier, so deferring detailed plans avoids guessing.

**Step 6 (Phase 39.2–39.7 three-lane redesign):** Mostly skill edits — Rhea narrows to sourcing only, cycle-review narrows to reasoning only, Mara narrows to result validity, all reviewers add process/outcome split, Final Arbiter agent created. Build after 39.1 ships and we see the reviewer-output JSON in practice. Estimated: one focused session per lane plus one for Final Arbiter wiring, total 4–5 sessions.

**Step 7 (Phase 39.8 + 39.9 + 39.10):**
- **39.8 reward-hacking scans** — code-only, scans per-reporter citizen reuse rate, regeneration counts, rubric-signal density. One module per pattern. Builds on the reviewer infrastructure from 39.1.
- **39.9 tiered review** — sift-time classifier that assigns Tier A/B/C per article using ailment severity + anomaly flag + Tier-1-citizen check + contested-vote flag. Routes the existing reviewers based on tier. Big lever for cost and attention allocation.
- **39.10 adversarial review skill** — `/adversarial-edition-review`. Independent, can build anytime, low-medium priority.

Each gets its own plan-doc when its turn arrives.

---

## Changelog

- 2026-04-15 — Initial plan (S146, research/build terminal). 39.1 fully specified — 11 assertions across 5 categories, deterministic + mixed + narrative-grader split, pipeline integration as write-edition Step 3.5, replay test against E91 as the validating acceptance criterion. Spine steps 6 + 7 scaffolded with readiness notes; full plans deferred until 39.1 ships and reviewer-output shape is known.
