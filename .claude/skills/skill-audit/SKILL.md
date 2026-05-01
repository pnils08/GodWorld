---
name: skill-audit
description: Audit skill files for drift — script paths, file references, prerequisites, handoffs, chain position. Skills are behavior, not reference — they need a different audit than doc-audit.
version: "1.0"
updated: 2026-04-17
tags: [engine, active]
effort: medium
disable-model-invocation: true
argument-hint: "[group]"
---

# /skill-audit — Skill File Drift Audit

## Purpose

Skills are the most active documents in the project — they define behavior and change every session. A skill can drift (script path moved, step consolidated, file renamed, handoff broken) without anyone checking.

This is different from `/doc-audit` which audits reference documents for accuracy. Skill-audit checks whether the skills still work — do their scripts exist, do their handoffs connect, do their prerequisites match what the previous skill produces.

## Groups

### cycle-pipeline — The full cycle chain

| Skill | Verify |
|-------|--------|
| `/run-cycle` | Calls /pre-flight, /pre-mortem, /engine-review, /build-world-summary. All referenced skills exist. |
| `/pre-flight` | Sheet names match actual spreadsheet (Oakland_Sports_Feed, Initiative_Tracker, Edition_Coverage_Ratings). Service account lib path current. |
| `/pre-mortem` | Phase folder patterns match actual engine structure. Hook references current. |
| `/engine-review` | Input sheet names match. Output file path `output/engine_review_c{XX}.md` used consistently. |
| `/build-world-summary` | Riley_Digest and Oakland_Sports_Feed reads via service account work. Engine review file path match engine-review output. Output format matches C91 template. |
| `/city-hall-prep` | Prerequisites (world summary, engine review) match build-world-summary and engine-review outputs. Voice routing table matches agent directories at `.claude/agents/`. |
| `/city-hall` | Voice agent paths match actual directories. Tracker update script `applyTrackerUpdates.js` exists. Media handoff format matches what sift expects to read. |
| `/sift` | Prerequisites match outputs from build-world-summary, city-hall, newsroom memory. Criteria file references (story_evaluation, brief_template, citizen_selection) exist. Output path `output/reporters/{reporter}/c{XX}_brief.md` matches what write-edition reads. |
| `/write-edition` | Reads sift's brief output paths. Reporter agent list matches `.claude/agents/`. validateEdition.js + ingestEdition.js scripts exist. |
| `/post-publish` | All 13 steps reference existing scripts. Criteria file paths match. Newsroom memory path current. |

### post-cycle-media — Coverage skills within a cycle

| Skill | Verify |
|-------|--------|
| `/edition-print` | `generate-edition-photos.js`, `photoQA.js`, `generate-edition-pdf.js`, `saveToDrive.js` all exist. DJ Hartley agent path current. |
| `/write-supplemental` | Reads world summary + city-hall log. 24 reporter voice files at `docs/media/voices/` exist. Post-supplemental ingest scripts exist. |
| `/dispatch` | Reporter selection table matches voice files. Brief template path current. Post-dispatch ingest scripts exist. |
| `/interview` | Both modes (voice, paulson) documented. Voice agent paths match. ingestEditionWiki + ingestEdition scripts exist. |
| `/podcast` | Podcast template at `editions/SUPPLEMENTAL_TEMPLATE.md` or similar. podcast-desk agent at `.claude/agents/podcast-desk/` exists. SHOW_FORMATS path current (`docs/media/podcast/SHOW_FORMATS.md`). |

### identity-session — Boot and close

| Skill | Verify |
|-------|--------|
| `/session-startup` | Workflow file references current. PERSISTENCE, JOURNAL_RECENT paths current. |
| `/session-end` | DOCUMENTATION_LEDGER path. Journal, persistence, project state update steps. |
| `/boot` | Identity file references (PERSISTENCE, identity.md, JOURNAL_RECENT) current. Wiki layer step references existing `docs/SCHEMA.md` and `docs/index.md`. |

## How to Audit

### Step 1: Read the skill

Open the skill file. Extract every:
- Script reference (`node scripts/xxx.js`)
- File path reference (`output/`, `docs/`, `editions/`, `.claude/agents/`)
- Skill cross-reference (`/run-cycle`, `/sift`, etc.)
- MCP tool reference (`lookup_citizen`, `search_canon`, etc.)

### Step 2: Verify each reference

- Scripts: does the file exist at the path?
- File paths: does the directory exist? Do recent cycle outputs match the path pattern?
- Skill cross-references: does the referenced skill exist?
- MCP tools: is the tool still in the MCP server?

### Step 3: Verify handoffs

For chain skills, verify the handoff:
- What does this skill produce? (output files section)
- What does the next skill expect to read? (prerequisites section)
- Do they match?

Example: sift produces `output/reporters/{reporter}/c{XX}_brief.md`. Write-edition expects to read the same path. If sift's output changed but write-edition's prerequisite wasn't updated, the handoff is broken.

### Step 4: Check for stale script references

Legacy scripts may still be referenced in skills that got consolidated. Look for:
- `buildDeskPackets.js`, `buildDeskFolders.js`, `buildVoiceWorkspaces.js` — legacy, preserved but not in current pipeline
- `editionIntake.js` — writes to tabs engine doesn't read (intake not wired)
- `truesource_reference.json` — replaced by MCP `get_roster("as")`

If a skill still uses these without marking them legacy, flag it.

## Output Format

```
SKILL AUDIT — [group] — [date]
================================================

BROKEN HANDOFFS (skill A produces X, skill B expects Y):
1. [skill] produces [path], [skill] expects [different path]

DEAD SCRIPTS (referenced but don't exist):
2. [skill] references scripts/xxx.js — not found

STALE REFERENCES (legacy infrastructure still cited):
3. [skill] uses truesource_reference.json — should be get_roster MCP

MISSING AGENTS (skill references .claude/agents/X but X doesn't exist):
4. [skill] references X-desk — directory not found

================================================
Skills audited: N
Handoffs: N broken | Scripts: N dead | References: N stale | Agents: N missing
Next group due: [group name]
```

## Audit Tracker

| Group | Last Audited | Session | Notes |
|-------|-------------|---------|-------|
| cycle-pipeline | — | — | Never audited as group |
| post-cycle-media | — | — | Never audited as group |
| identity-session | — | — | Never audited as group |

## When to Run

- `/skill-audit cycle-pipeline` — after any edition cycle where skills felt off
- `/skill-audit post-cycle-media` — after supplemental/dispatch/interview work
- `/skill-audit identity-session` — rare, only after boot/session changes
- `/skill-audit` (no group) — rotates to oldest

## What This Skill Does NOT Do

- Audit reference docs — that's `/doc-audit`
- Audit engine code — that's `/tech-debt-audit`
- Fix issues — this flags them. Fixing happens in a focused session.
