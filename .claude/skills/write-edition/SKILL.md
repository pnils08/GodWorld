---
name: write-edition
description: Execute the edition from sift output. Launch reporters, review articles, compile, validate, Mara audit, publish. Mechanical when sift is right.
effort: high
disable-model-invocation: true
argument-hint: "[cycle-number]"
---

# /write-edition — Edition Execution

## Usage
`/write-edition [cycle-number]`

## The Principle

Sift did the editorial work — stories picked, reporters assigned, citizens verified, briefs on disk. This skill executes. Launch reporters, review what they write, compile the edition, validate, get Mara's approval, publish.

If sift is right, this is mechanical.

## Prerequisites

Verify these exist before starting:
- `output/production_log_edition_c{XX}.md` — from `/sift` (has story picks, assignments, citizen table, brief paths)
- `output/reporters/{reporter}/c{XX}_brief.md` — angle briefs from `/sift` (one per assigned reporter)

If either is missing, `/sift` didn't complete. Don't proceed.

## Rules
- **Reporters read their brief + IDENTITY.md. Nothing else.** No world summary, no city-hall log, no sheet queries.
- **No calendar dates.** Cycles, not months.
- **No engine language.** No "cycle weight," "civic load," "sentiment score," "domain count." Citizens don't know these terms. Weather is "cool evening, northwest breeze" not "Weather: 67F from engine."
- **Story-driven layout.** No fixed sections to fill. No filler.
- **Every citizen name was verified in sift.** If a reporter introduces a new name not in the brief, flag it.

## Step 1: Launch Reporter Agents

Read the production log for assignments. Launch each reporter with direct editorial direction.

**Prompt structure per reporter:**
```
You are [Reporter Name]. Here is your assignment:

ARTICLE — [headline/topic]
[Specific direction from the angle brief — who, what, angle, citizens to use]

Read your IDENTITY.md at [path]. Use ONLY citizens named in this assignment.
Write to [output path]. [word count]. Do NOT spend time reading other files — write.
```

**The E90 lesson:** Agents told what to write produce articles. Agents told to figure it out spend all their tokens reading files and produce nothing.

**Launch order:**
1. P Slayer, Anthony, Hal first — sports stories
2. Carmen, Jordan, Maria in parallel — civic/business/culture
3. Jax and Mezran if assigned — conditional
4. Letters LAST — needs to know what others covered

**Output:** Each reporter writes to `output/reporters/{reporter}/articles/`.

**Update production log** with reporter results table (reporter, articles, status).

## Step 2: Read Every Article

Before compiling, Mags reads every article. Not a scan — a read. Check:
- Did the agent follow the angle brief?
- Are citizen names correct? (verify any you're unsure of via MCP)
- Does the voice match the reporter?
- Any fabricated facts, stats, game results?
- Any calendar dates that should be cycle references?
- Any engine language?
- Any names not in the brief? (hallucination flag)

Flag problems. Fix what's fixable. Cut what's broken. Better to have 8 clean articles than 13 with canon violations.

**Update production log** with editorial review (articles passed, cut, fixes applied).

## Step 3: Compile

The edition is story-driven, not section-driven.

1. Take all articles that passed review
2. Order by what's most worth reading — front page was picked in sift, but may change if an article exceeded expectations
3. Label each with its section tag from sift assignments
4. If a section has no story this cycle, it doesn't appear

**Edition format:**

```
============================================================
THE CYCLE PULSE — EDITION {XX}
Bay Tribune | Cycle {XX} | [Holiday/Season if applicable]
Weather: [plain language — from production log] | City Mood: [plain language]
============================================================

FRONT PAGE — [best story]
EDITOR'S DESK — Mags, 150-250 words

[STORIES — ordered by quality, tagged by section]

LETTERS TO THE EDITOR
ARTICLE TABLE
CITIZEN USAGE LOG
STORYLINES UPDATED
COMING NEXT EDITION
END EDITION
```

Save to `editions/cycle_pulse_edition_{XX}.txt`.

**Show compiled edition to Mike.** This is his review point.

**Update production log** with compile details (front page, total articles, edition path).

## Step 3.5: Capability Review (Phase 39.1, S146)

Run the editorial capability gate before validation. Catches structural editorial gaps that Rhea + Mara don't check — the front page missing the highest-severity engine ailment, citizen names that don't resolve to canon, engine metrics leaking into journalism. The Varek anti-example (E91 front-paged NBA expansion while Temescal ran four cycles uncovered) is exactly what this gate makes structurally impossible.

```bash
node scripts/capabilityReviewer.js {XX}
```

Or invoke `/capability-review` for the wrapped flow with the markdown summary.

Read `output/capability_review_c{XX}.json`. Show Mike the summary.

**Blocking failures halt this step.** For each, choose with Mike: (a) fix and re-run (route back to relevant reporter or `/sift`), (b) override and proceed (logs the failure for next sift), or (c) defer publish entirely. Advisory failures ship with a flag in the production log and don't gate.

**Update production log** with capability review counts (passed/total, blocking, advisory) and any overrides taken.

## Step 4: Validation + Rhea (Sourcing Lane)

```bash
node scripts/validateEdition.js editions/cycle_pulse_edition_{XX}.txt
```

Fix CRITICALs. Then launch Rhea as the **Sourcing Lane** (Phase 39.2, weight 0.3).

Rhea has scoped Bash access — dashboard API (localhost:3001), Supermemory (bay-tribune + world-data), world summary. She's a real verifier with live data access. After Phase 39.2 she produces `output/rhea_report_c{XX}.json` in the reviewer-lane schema.

```bash
# After Rhea writes her JSON, validate + emit .txt companion:
node scripts/rheaJsonReport.js {XX}
```

- verdict PASS → proceed
- verdict REVISE → fix and rerun, max 2 rounds
- verdict FAIL → halt, route back to desks

**Update production log** with validation results and Rhea's lane score.

## Step 4.1: Cycle-Review (Reasoning Lane)

Run `/cycle-review` as the **Reasoning Lane** (Phase 39.4, weight 0.5). Produces `output/cycle_review_c{XX}.json`.

- Internal consistency, evidence-based deduction, argument quality.
- Does NOT re-check names, votes, stats, engine language — those belong to Rhea and capability.
- verdict PASS/REVISE/FAIL same semantics as Rhea.

**Update production log** with cycle-review lane score.

## Step 5: Mara Audit (Result Validity Lane, External)

Mara is on claude.ai — **Result Validity Lane** (Phase 39.5, weight 0.2).

1. Upload edition + sift brief + engine review to Drive: `node scripts/saveToDrive.js editions/cycle_pulse_edition_{XX}.txt mara`
2. Tell Mike the edition is ready for Mara
3. Mike takes it to Mara on claude.ai
4. Mara produces a markdown audit with the structured top per PHASE_39_PLAN §16.3
5. Mike saves it to `output/mara_audit_c{XX}.md`

```bash
# Parse Mara's markdown into lane JSON:
node scripts/maraJsonReport.js {XX}
```

**STOP. Wait for Mara.**

**Update production log** with Mara's lane score and any editorial notes from her prose.

## Step 5.5: Final Arbiter (Phase 39.7)

```bash
node scripts/finalArbiter.js {XX}
```

Deterministic computation — reads the four lane JSONs (reasoning, sourcing, result-validity, capability), applies the 0.5/0.3/0.2 weights, enforces the capability gate as a hard block, emits `output/final_arbiter_c{XX}.json` with a single verdict (A/B), blame attribution, and a publish recommendation:

- **PROCEED** — verdict A, weighted score ≥ 0.75, capability gate passed.
- **PROCEED-WITH-NOTES** — verdict A, weighted score 0.60–0.75, capability gate passed. Log items for next cycle's briefing.
- **HALT** — verdict B. Exit code 1. Do NOT proceed to Step 6.

The Arbiter is the **publication gate** — Step 6 runs only if the recommendation is PROCEED or PROCEED-WITH-NOTES.

**USER APPROVAL GATE — Mike reviews the Arbiter JSON and says publish or doesn't.**

**Update production log** with Arbiter verdict, weighted score, and blame attribution.

## Step 6: Publish

```bash
# Save edition to Drive
node scripts/saveToDrive.js editions/cycle_pulse_edition_{XX}.txt edition

# Ingest to bay-tribune canon
node scripts/ingestEdition.js editions/cycle_pulse_edition_{XX}.txt
```

**Update production log** with wiki pattern — inline doc IDs for direct query next cycle:

```markdown
### Step 6: Publish — COMPLETE
- Edition path: editions/cycle_pulse_edition_{XX}.txt
- Drive file ID: {id}
- Bay-tribune ingest: {doc ID}
- Canon status: LIVE
```

Deeper ingests (wiki records, coverage ratings, grading) happen in `/post-publish` with their own tagged doc IDs.

## Handoff

After publish, two separate skills pick up:

| Skill | What it does | When |
|-------|-------------|------|
| `/edition-print` | Photos (DJ Hartley), PDF, Drive upload of print assets | After publish, separate terminal |
| `/post-publish` (planned) | Coverage ratings, wiki ingest, newsroom memory update, filing check, criteria file updates | After publish, closes the feedback loop |

## Output Files

| File | Purpose | Created by |
|------|---------|------------|
| `output/reporters/{reporter}/articles/*.md` | Reporter articles | Step 1 |
| `editions/cycle_pulse_edition_{XX}.txt` | Published edition | Step 3 |
| `output/production_log_edition_c{XX}.md` | Continued from sift — reporter results, review, compile, validation, Mara, publish added | Steps 1-6 |

## Legacy Reference

These elements were part of the old write-edition (pre-S144) and are now handled by other skills:

- **World summary build** → `/build-world-summary`
- **Story picks and sifting** → `/sift`
- **Citizen verification** → `/sift` Step 4
- **Angle brief writing** → `/sift` Step 5
- **Production log creation** → `/sift` Step 2
- **Desk packet building** → legacy scripts preserved, not in pipeline
- **Voice workspace building** → `/city-hall-prep`

## Where This Sits

After `/sift`. Before `/edition-print` and `/post-publish`.

Full chain: `/run-cycle` → `/city-hall-prep` → `/city-hall` → `/sift` → `/write-edition` → `/edition-print` + `/post-publish`
