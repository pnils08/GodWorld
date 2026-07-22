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
**Status:** DONE S147–S148. All Phase 39 sub-phases (39.1–39.10) shipped: 39.1 capability reviewer + 39.2 Rhea Sourcing Lane + 39.3 two-pass hallucination + 39.4 cycle-review Reasoning Lane + 39.5 Mara Result Validity Lane + 39.6 Reviewer Lane Schema (four-field contract — see [[engine/REVIEWER_LANE_SCHEMA]]) + 39.7 Final Arbiter + 39.8 reward-hacking scans + 39.9 tiered review + 39.10 adversarial review. Plan file retained for design intent + implementation reference. Operational-run gap remains (Final Arbiter never run end-to-end over real C93 production output) — tracked in [[engine/ROLLOUT_PLAN]] §Active C93 priorities.

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

1. **The compiled edition** at `editions/cycle_pulse_edition_{XX}.txt` — produced by write-edition Step 3 (Compile). All articles concatenated.
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

## 11. Open questions — RESOLVED S146

- **Edition file path convention. ✅** Confirmed: `editions/cycle_pulse_edition_{XX}.txt` (not `output/editions/`). E89, E90, E91 all on disk locally.
- **Citizen gender source. ✅** Gender = Simulation_Ledger column AU. Not yet ingested to world-data citizen cards (see Open Items "ADD: Ingest gender column AU to world-data"). Capability reviewer reads the sheet directly via `lib/sheets.js` for assertion #9 — same pattern `scripts/engineAuditor.js` uses. Confidence: high when gender resolves.
- **Haiku grader access. PENDING.** Anthropic API key wiring not yet confirmed. **Build path:** ship the 9 non-grader assertions first (7 deterministic + 2 mixed). Mark the 2 grader-only assertions as TODO until Mike confirms the key. 9 of 11 assertions still produces a meaningful capability review against E91.
- **Replay edition path. ✅** `editions/cycle_pulse_edition_91.txt` exists locally. Replay test against E91 ready.

---

## 12. Spine step 6 + 7 navigation

Step 6 (39.2–39.7 three-lane redesign) is fully specified in §§13–19 below — written S146 after 39.1 shipped and the reviewer-output JSON shape became concrete.

Step 7 (39.8 reward-hacking + 39.9 tiered review + 39.10 adversarial review) still gets readiness-only notes here — those interlock with 39.6 (process/outcome) and 39.7 (Final Arbiter) outputs, so deferring full specs until step 6 ships avoids guessing the shape.

**Step 7 readiness notes:**
- **39.8 reward-hacking scans** — code-only, scans per-reporter citizen reuse rate, regeneration counts, rubric-signal density. One module per pattern. Builds on the reviewer infrastructure from 39.1 + the lane outputs from 39.2–39.5.
- **39.9 tiered review** — sift-time classifier that assigns Tier A/B/C per article using ailment severity + anomaly flag + Tier-1-citizen check + contested-vote flag. Routes the existing reviewers based on tier. Big lever for cost + attention allocation. Direct dependency on §17 process/outcome scoring being live.
- **39.10 adversarial review skill** — `/adversarial-edition-review`. Independent, can build anytime, low-medium priority.

Each gets its own plan-doc when its turn arrives.

---

## 13. Phase 39.2 — Rhea scope tightening (Sourcing Lane only)

**Source:** MIA paper (`docs/research/papers/Memory_intelligenceAgent.pdf` p.33, "Prompt for Information Sourcing and Credibility Evaluator") + ROLLOUT_PLAN §Phase 39 §39.2.

**MIA lane definition (verbatim):** *"Information Understanding: Did the agent correctly understand the content retrieved in the trajectory? Is there any misinterpretation, misreading, or misattribution of the original text? Faithfulness and Hallucination: Can all facts, data, and details in the final output find clear basis in the retrieval results in the trajectory? Is there any fabrication or hallucination?"* Weight: **0.3**.

### 13.1 What Rhea does today vs what she should do

Rhea today (`.claude/agents/rhea-morgan/`) runs 21 checks split across Data Accuracy, Canon Compliance, Format, Voice Consistency, Engine Language, Reality Anchors, etc. — overlapping with capability reviewer (§5 of this plan), cycle-review, and Mara.

Rhea after 39.2: **Sourcing Lane only.** Five checks survive:
1. Citizen Name Verification (current Check 1) — every name resolves to canon
2. Vote & Civic Verification (current Check 2) — vote tallies, council positions, OARI/Baylight project state match Initiative_Tracker + Civic_Office_Ledger
3. Sports Record Verification (current Check 3) — A's roster, scores, contracts match As_Roster + truesource
4. Canon Continuity (subset of current Check 14 + Check 17) — claimed history matches bay-tribune Supermemory
5. Quote Attribution — every quoted citizen is attributable to the right person + the right context

Drop everything else. Format issues → capability reviewer. Voice consistency → cycle-review. Engine language → capability reviewer assertion #7. Headlines → cycle-review. New citizen authorization → capability reviewer assertion #5.

### 13.2 Output shape change

Rhea today produces a free-form numbered error list plus a score `/100`. After 39.2, structured JSON:

```json
{
  "lane": "sourcing",
  "weight": 0.3,
  "score": 0.85,
  "verdict": "PASS | REVISE | FAIL",
  "checks": {
    "citizen-name-verification": { "pass": true, "issues": [] },
    "vote-civic-verification": { "pass": false, "issues": [{ "article": "X", "claim": "...", "canonValue": "..." }] },
    "sports-record-verification": { "pass": true, "issues": [] },
    "canon-continuity": { "pass": true, "issues": [] },
    "quote-attribution": { "pass": true, "issues": [] }
  },
  "process": 0.85,
  "outcome": 1,
  "controllableFailures": ["vote-civic-verification"],
  "uncontrollableFailures": []
}
```

Output to `output/rhea_report_c{XX}.json` (replacing the current `.txt` free-form). Backwards-compat for current consumers via auto-generated `.txt` summary derived from the JSON.

### 13.3 Files to edit

| Path | Change |
|---|---|
| `.claude/agents/rhea-morgan/RULES.md` | Cut to 5 checks. Keep agent-memory + canon-source sections intact. |
| `.claude/agents/rhea-morgan/IDENTITY.md` | Add explicit "Sourcing Lane only" framing — Rhea is the verifier of where information came from, not what it says about reasoning or whether it covers the right story. |
| `scripts/rheaJsonReport.js` (new) | Parses Rhea's structured output into the JSON shape above. Wraps current free-form output until Rhea fully migrates to JSON. |

### 13.4 Acceptance criteria for 39.2

1. Rhea runs in under 60s on E91 (current target; tighter scope shouldn't slow her).
2. Output JSON validates against §13.2 schema.
3. Replay against E91: Rhea catches the same vote/citizen-name issues the current version catches (no regressions on real verification).
4. Rhea no longer flags items that capability reviewer or cycle-review now own (no double-counting in summary stats).

---

## 14. Phase 39.3 — Two-pass hallucination detection inside Rhea

**Source:** Microsoft UV (`docs/research/papers/Microsoftpaper.pdf` §3.4 verbatim p.5): *"Our main contribution is a verifier designed to combat hallucinations through better management of visual screenshot evidence... we explicitly score each screenshot against every rubric criterion to produce a relevance matrix."* Plus §3.1 Hallucination Detection: *"We score the whole rubric in two passes—with and without evidence from the relevant screenshots—to surface discrepancies."*

### 14.1 The pattern adapted to GodWorld

Microsoft's two passes use screenshots as evidence; ours use **canon data** (world-data citizen cards, bay-tribune editions, sheets) as evidence. For each article Rhea reviews:

- **Pass A — text-only.** Read the article alone. Extract every checkable claim (numerical stat, citizen quote, vote tally, contract figure). Score Rhea's checks based only on what the article says internally.
- **Pass B — text + canon.** Same checks, but with full access to canon sources (MCP `lookup_citizen`, `search_canon`, sheet snapshots, dashboard API).

**Divergence = hallucination flag.** If Pass A says "Beverly Hayes received $18,500" and Pass B finds no record of a $18,500 disbursement to POP-00412, that's a fabricated stat. The article passed internal consistency (Pass A) but failed external grounding (Pass B).

### 14.2 Implementation

Two grader calls per article inside Rhea's workflow. **Defers on Anthropic API key** (same dependency as Phase 39.1's grader-only assertions — flagged in PHASE_39_PLAN.md §11.3). Until then, Rhea's existing single-pass verification stays.

When the key lands:

```js
// Per article in rhea-morgan workflow
const passA = await graderCheck(article, { canonAccess: false });
const passB = await graderCheck(article, { canonAccess: true });
const hallucinations = diffClaims(passA.claims, passB.claims);
// Each hallucination = a claim Pass A asserted that Pass B couldn't verify
```

Costs: estimated $0.02–0.04 per cycle (Haiku 4.5, ~9 articles × 2 passes, with prompt caching on the canon-context block).

### 14.3 Acceptance criteria for 39.3

1. Two-pass mechanic adds no more than 2 minutes to Rhea's runtime per cycle.
2. Replay test: synthesize a fake stat in an E91 article ("83% of Temescal residents support X"). Two-pass detection flags it as a Pass A claim with no Pass B grounding.
3. Hallucinations land in the Rhea JSON output as a separate field `hallucinationFlags[]` with `claim`, `passABasis`, `passBSearch`, `verdict`.
4. False-positive rate on real E91 articles under 10% (most "claims" should ground in canon).

---

## 15. Phase 39.4 — Cycle-review scope tightening (Reasoning Lane only)

**Source:** MIA paper (`docs/research/papers/Memory_intelligenceAgent.pdf` p.32, "Prompt for Reasoning and Logical Consistency Evaluator") + ROLLOUT_PLAN §39.4.

**MIA lane definition (verbatim):** *"1. Reasoning Quality: Are the agent's analysis, planning, and deduction processes reasonable? Is there a clear logical progression between steps? 2. Evidence-based Deduction: Can the final conclusion be logically deduced from the clues collected in the trajectory? Are there forced conclusions or logical leaps? 3. Logical Consistency: Are there contradictory statements between the agent's thought process and the final output, or within the final output itself?"* Weight: **0.5** (the heaviest lane).

### 15.1 Cycle-review today vs after 39.4

Cycle-review today runs three passes: structural (article length, names index, headlines, sections), factual (defer to Rhea), editorial (voice, genre, sentence variety, emotional range, openings, closings).

After 39.4: **Reasoning Lane only.** Cut to three checks:
1. **Internal consistency** — does the edition contradict itself? (Article 1 says approval is up 5pts, Article 4 says approval flipped negative — flag.)
2. **Evidence-based deduction** — claims need traceable basis. (A column says "the city is recovering" — what specific evidence supports it? If none, flag.)
3. **Argument quality** — opinion pieces and editorials should reason from premises to conclusions, not assert. (Mags's editorial, Jax's accountability columns, P Slayer's reactions.)

Drop:
- Pass 1 structural (article length, names index, headlines, sections) → moves to capability reviewer. Add corresponding assertions in `assertions.json`.
- Pass 3.1 voice consistency → kept but moves to a sub-lane of capability reviewer (new assertion: `voice-consistent-with-reporter-roster`).
- Pass 3.2 genre discipline → capability reviewer (new assertion: `genre-discipline`).
- Pass 3.3 sentence variety, 3.4 emotional range, 3.5 openings, 3.6 closings → these are stylistic flags. Move to a new optional skill `/style-pass` that sift can invoke per-article on demand. Not part of the three-lane reviewer chain.

### 15.2 Output shape

```json
{
  "lane": "reasoning",
  "weight": 0.5,
  "score": 0.78,
  "verdict": "PASS | REVISE | FAIL",
  "checks": {
    "internal-consistency": { "pass": true, "contradictions": [] },
    "evidence-based-deduction": { "pass": false, "unsupportedClaims": [{ "article": "X", "claim": "...", "missingEvidence": "..." }] },
    "argument-quality": { "pass": true, "weakArguments": [] }
  },
  "process": 0.78,
  "outcome": 1,
  "controllableFailures": ["evidence-based-deduction"]
}
```

### 15.3 Files to edit

| Path | Change |
|---|---|
| `.claude/skills/cycle-review/SKILL.md` | Cut to 3 checks. Pass 1 + Pass 3 (most subsections) deleted. JSON output replacing markdown. |
| `.claude/skills/style-pass/SKILL.md` (new) | Holds the orphaned Pass 3.3–3.6 stylistic flags. Sift-invocable. |
| `scripts/capability-reviewer/assertions.json` | Add 4 new assertions: article-length-balance, names-index-completeness, voice-consistent-with-reporter-roster, genre-discipline. |
| `scripts/capability-reviewer/assert*.js` (new × 4) | One module per new assertion. |

### 15.4 Acceptance criteria for 39.4

1. Cycle-review runs in under 90s on E91 (current target; tighter scope should improve).
2. The 4 new capability assertions catch what cycle-review used to catch in Pass 1 + Pass 3.1/3.2 (no regression on existing finding types).
3. Replay against E91: cycle-review catches at least one contradiction or unsupported claim if any exist; otherwise PASS cleanly.
4. Output JSON validates against §15.2 schema.

---

## 16. Phase 39.5 — Mara scope tightening (Result Validity Lane)

**Source:** MIA paper (`docs/research/papers/Memory_intelligenceAgent.pdf` p.33, "Prompt for Result Validity Evaluator") + ROLLOUT_PLAN §39.5.

**MIA lane definition (verbatim):** *"1. Response Status: Did the agent successfully generate a substantive final answer? Are situations where it gave up halfway, did not attempt to answer, or only replied with 'cannot find the answer/error occurred'?"* Weight: **0.2**.

### 16.1 Adapted to GodWorld

Mara is on claude.ai (external) and we can't directly run her — she's a human-in-the-loop verification agent. Her scope tightens to:

1. **Completeness** — did the edition actually cover what sift said it would? Cross-reference sift's brief output against the published edition. If sift assigned 8 stories and only 6 made it, flag.
2. **Gave-up detection** — articles that say "the data was unclear" or "more reporting needed" without attempting the call. The Mark Aitken contract piece that hand-waved his contract value because the reporter couldn't reach a source.
3. **Coverage breadth** — the edition shouldn't be 80% sports if the cycle had a major civic event. Mara reads the engine review brief and confirms the edition's section weights match the cycle's actual signal weights.

Drop: citizen name verification (Rhea's job now), vote math (Rhea), engine-language sweeps (capability reviewer).

### 16.2 Implementation

Mara is updated via `docs/mara-vance/CLAUDE_AI_SYSTEM_PROMPT.md` (her claude.ai project instructions) + `docs/mara-vance/MEDIA_ROOM_INTRODUCTION.md` (her interface contract). Both get the new scope. The Drive packet sent for each edition includes `output/sift_brief_c{XX}.md`, `output/engine_review_c{XX}.md`, and the published edition — Mara has everything she needs to grade completeness without having to re-derive what the cycle should have produced.

### 16.3 Output shape

Mara's report stays markdown for now (she's human-in-the-loop), but with a structured top section:

```markdown
# Mara Audit — Cycle {XX}

## Lane: Result Validity (weight 0.2)
- Completeness: PASS | REVISE | FAIL — score X/10 — reason
- Gave-up detection: PASS | REVISE | FAIL — N flags — reasons
- Coverage breadth: PASS | REVISE | FAIL — score X/10 — reason

## Process score: 0.X
## Outcome: 0 | 1
## Controllable failures: [...]
## Uncontrollable failures: [...]

(then prose follows — Mara's narrative judgment)
```

The structured top is parseable by `scripts/maraJsonReport.js` (new) into the lane output JSON for Final Arbiter consumption.

### 16.4 Acceptance criteria for 39.5

1. Mara's CLAUDE_AI_SYSTEM_PROMPT.md updated and tested with E92 (or a manual replay packet for E91).
2. Mara's report includes the structured top section per §16.3 — parseable by `maraJsonReport.js`.
3. No regression on Mara's catch rate for citizen errors (because Rhea is now scoped to that — Mara should explicitly defer to Rhea on those checks).
4. Mara grades at least 3 distinct outcome values across the next 3 cycles (avoiding the "everything A-" pattern current Mara falls into).

---

## 17. Phase 39.6 — Process/outcome split applied to all lanes

**Source:** Microsoft UV (`docs/research/papers/Microsoftpaper.pdf` §3.2 + §3.3 verbatim).

### 17.1 The split (verbatim Microsoft framing)

> *"Process reward — a fine-grained rubric whose score reflects execution across sub-goals... Outcome reward — a binary success/failure judgment on whether the goal was achieved."*

Conflating them produces signals that are "either too lenient (crediting agents for apparent effort but the user is left empty-handed) or too harsh (penalizing agents for factors outside their control)." Mara grading every edition A- is the lenient failure mode; reporters getting penalized for environment blockers (a sheet read that timed out) is the harsh failure mode.

### 17.2 Adapted

Every reviewer lane (Rhea, cycle-review, Mara, capability) and every reporter agent gets two scores per output:

- **Process score (0.0–1.0):** how well the article/review/brief executed its sub-goals. From the rubric.
- **Outcome label (binary 0/1):** did the final piece land? "Would a reasonable reader consider this a complete article on the topic?"

Plus the **controllable/uncontrollable** distinction (Microsoft §3.3 verbatim):

- **Uncontrollable failures** (do NOT penalize process): sheet read failed, MCP timeout, citizen card missing because EventType taxonomy hasn't shipped, canon source not yet ingested.
- **Controllable failures** (DO penalize process): hallucination, intent mismatch, reasoning errors, insufficient effort (the "more reporting needed" cop-out), execution errors (forgot the names index).

Four diagnostic quadrants when you cross process × outcome:

| | Outcome PASS | Outcome FAIL |
|---|---|---|
| **High process** | working as designed | environment blocker — fix the system, not the reporter |
| **Low process** | lucky — flag for next cycle | real failure — fix the reporter or the brief |

### 17.3 Implementation

Add three fields to every lane output JSON (§§13.2, 15.2, 16.3 already include them):
- `process: number` (0.0–1.0)
- `outcome: number` (0 | 1)
- `controllableFailures: string[]`
- `uncontrollableFailures: string[]`

Full field contract and four-quadrant interpretation live in `docs/engine/REVIEWER_LANE_SCHEMA.md` (Phase 39.6 scaffolding, S147). Every lane adopts that schema when it produces JSON.

Add same fields to the capability reviewer output (§6 of this plan needs a small update — already has `pass/fail` per assertion; add aggregated `process` + `outcome` at the summary level).

Each reporter agent gets a single per-article output sidecar `output/reporter_outputs/{reporter}_c{XX}.json` with the same fields, populated by the reporter at draft time (self-reported process score, outcome judgement comes from reviewers).

### 17.4 Acceptance criteria for 39.6

1. All 4 reviewer lanes produce process + outcome + controllable/uncontrollable fields per §17.3.
2. Capability reviewer summary updated to aggregate process + outcome.
3. Reporter agent output sidecars exist for at least one cycle (test with E92 or replay).
4. Final Arbiter (§18) consumes the four-quadrant signal correctly — high-process/low-outcome routes to environment-fix path, low-process/low-outcome routes to reporter-fix path.

---

## 18. Phase 39.7 — Final Arbiter agent

**Source:** MIA paper (`docs/research/papers/Memory_intelligenceAgent.pdf` p.33, "Prompt for Final Arbiter" verbatim).

**MIA prompt (verbatim, adapted to our domain):** *"You are the Final Arbiter. In the absence of a ground-truth answer, your one and only task is to determine whether the [edition] generated by the [Bay Tribune newsroom] is correct. The feedback from the three evaluators is provided for your reference. You need [to] make a definitive judgment based on the factual evidence in the trajectory and the logical soundness of the final output... Output A if the answer is Correct. Output B if the answer is Incorrect."*

### 18.1 What the Final Arbiter does

Receives **four** inputs (we have an extra lane vs. MIA's three because of capability):

1. Reasoning lane output (cycle-review JSON) — weight **0.5**
2. Sourcing lane output (Rhea JSON) — weight **0.3**
3. Result validity lane output (Mara JSON) — weight **0.2**
4. Capability reviewer output — separate pass/fail input (not weighted into the 1.0 sum; capability is a gate, not a contributor)

Computes:
- Weighted score = 0.5 × reasoning.score + 0.3 × sourcing.score + 0.2 × result.score
- Capability gate = any blocking failure → halt, regardless of weighted score
- Final verdict = single A (correct) or B (incorrect)

Plus a **blame attribution** — when verdict is B, which lane(s) drove it? The four-quadrant process/outcome signal lets the arbiter say "Rhea's sourcing lane fired with high process and low outcome — environment blocker, not a Rhea failure" vs "cycle-review's reasoning lane fired with low process — actual contradiction in the edition."

### 18.2 Files to create

| Path | Role |
|---|---|
| `.claude/agents/final-arbiter/IDENTITY.md` + `RULES.md` | Adapts MIA's verbatim Final Arbiter prompt to GodWorld. |
| `scripts/finalArbiter.js` | Orchestrator. Reads the four lane outputs + capability output. Computes weighted score. Invokes the agent for the verdict. Writes `output/final_arbiter_c{XX}.json`. |

### 18.3 Output shape

```json
{
  "cycle": 91,
  "verdict": "A | B",
  "weightedScore": 0.81,
  "lanes": {
    "reasoning": { "score": 0.78, "weight": 0.5, "outcome": 1, "process": 0.78 },
    "sourcing": { "score": 0.85, "weight": 0.3, "outcome": 1, "process": 0.85 },
    "resultValidity": { "score": 0.80, "weight": 0.2, "outcome": 1, "process": 0.80 }
  },
  "capabilityGate": {
    "passed": false,
    "blockingFailures": ["front-page-leads-with-highest-severity-ailment"]
  },
  "blameAttribution": [
    { "lane": "capability", "category": "coverage", "controllable": true, "fix": "front-page must cover Temescal — re-route to /sift" }
  ],
  "publishRecommendation": "HALT | PROCEED | PROCEED-WITH-NOTES"
}
```

### 18.4 Pipeline integration

The Final Arbiter runs as the **last** step before publish, after Rhea + cycle-review + capability + Mara. New write-edition step layout:

```
Step 3:    Compile
Step 3.5:  Capability Review
Step 4:    Rhea (Sourcing Lane)
Step 4.1:  Cycle-Review (Reasoning Lane)
Step 5:    Mara Audit (Result Validity Lane) — external
Step 5.5:  Final Arbiter — verdict + blame attribution
Step 6:    Publish (gated by Final Arbiter's PROCEED)
```

### 18.5 Acceptance criteria for 39.7

1. Final Arbiter runs in under 30s on E91 inputs (small JSON parsing + one grader call for the verdict).
2. Replay against E91: verdict = B (Incorrect), blame attribution cites capability gate's Temescal failure, publish recommendation = HALT.
3. Output JSON validates against §18.3 schema.
4. Blame attribution distinguishes controllable vs uncontrollable failures from §17.2.
5. Pipeline integration: write-edition Step 5.5 added, publish at Step 6 gated by `publishRecommendation === 'PROCEED' || === 'PROCEED-WITH-NOTES'`.

---

## 19. Combined acceptance criteria for spine step 6 (39.2–39.7)

After all six land:

1. Three reviewer lanes (Rhea / cycle-review / Mara) each produce structured JSON with the §17.3 process + outcome + controllable/uncontrollable fields.
2. Final Arbiter produces a single verdict per edition with blame attribution.
3. Replay against E91: combined chain catches the same Temescal miss the capability reviewer alone caught (regression test — adding lanes doesn't hide existing failures).
4. New replay test: synthesize a hallucinated stat in an E91 article. Two-pass hallucination (39.3) flags it; sourcing lane outcome = 0; Final Arbiter cites it in blame attribution.
5. Combined runtime under 5 minutes per cycle for the full chain (Rhea + cycle-review + Mara + capability + Final Arbiter).
6. No double-counting in the summary (each issue type owned by exactly one lane).

---

## 20. Build sequence for spine step 6

Recommended order (mostly skill/agent edits; one new agent + two new scripts):

1. **39.6 process/outcome scaffolding first.** Add the four fields to existing reviewer outputs even before scope tightening — gives every subsequent step a place to land structured signals.
2. **39.2 Rhea narrowing.** RULES.md edit + `scripts/rheaJsonReport.js`. Highest-impact single change.
3. **39.4 cycle-review narrowing.** SKILL.md edit + 4 new capability assertions for the moved checks. Slightly bigger because it touches capability reviewer too.
4. **39.5 Mara narrowing.** Update `mara-vance/CLAUDE_AI_SYSTEM_PROMPT.md` + `MEDIA_ROOM_INTRODUCTION.md`. Test with E92 or replay packet.
5. **39.7 Final Arbiter agent + script.** Once 39.2–39.5 produce JSON outputs, the Arbiter has something to consume. Plug into write-edition Step 5.5.
6. **39.3 two-pass hallucination.** Last because it depends on Anthropic API key wiring (Phase 39.1 §11.3 deferred). When the key lands, drop the two-pass mechanism into Rhea's existing scoped flow.

Owner per step: **research/build** for all of 39.2–39.7. No engine code changes — purely skill files, agent files, JSON-shaping scripts. Engine terminal stays focused on Phase 38.x mitigator chain (spine step 5).

---

## Changelog

- 2026-04-15 — Initial plan (S146, research/build terminal). 39.1 fully specified — 11 assertions across 5 categories, deterministic + mixed + narrative-grader split, pipeline integration as write-edition Step 3.5, replay test against E91 as the validating acceptance criterion. Spine steps 6 + 7 scaffolded with readiness notes; full plans deferred until 39.1 ships and reviewer-output shape is known.
- 2026-04-15 — 39.1 shipped (commits ac207cc + cb0c398). Phase 39.1 §11 questions resolved (commit 8b616b3). Skill wired into write-edition Step 3.5. Replay against E91 PASSED — Temescal miss flagged as blocking failure.
- 2026-04-15 — Appended §§13–20 covering spine step 6 in full implementation detail (Phase 39.2 Rhea narrowing, 39.3 two-pass hallucination, 39.4 cycle-review narrowing, 39.5 Mara narrowing, 39.6 process/outcome split, 39.7 Final Arbiter, plus combined acceptance criteria + build sequence). Source extracts verified verbatim: MIA p.32-33 (three lane evaluator prompts + Final Arbiter prompt with weights 0.5/0.3/0.2); Microsoft UV §3.2-3.4 (process/outcome split, controllable vs uncontrollable, two-pass evidence pattern). All work owned by research/build — no engine code changes. Spine step 7 (39.8/9/10) stays in §12 readiness-only until step 6 ships.
