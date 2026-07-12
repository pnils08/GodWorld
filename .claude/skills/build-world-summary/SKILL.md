---
name: build-world-summary
description: Wrapper around scripts/buildWorldSummary.js — deterministic Node writer that assembles output/world_summary_c{XX}.md from sheets + engine_audit JSON. No LLM in the writer loop. Run after /engine-review, before /city-hall + /sift.
version: "2.0.1"
updated: 2026-05-30
tags: [engine, active]
effort: low
argument-hint: "[cycle-number]"
---

# /build-world-summary — World Summary Assembly (wrapper, v2.0)

## What's new in v2.0 (S230, pipeline.31 closure)

v2.0 collapses the skill to a thin wrapper around `scripts/buildWorldSummary.js` v1.0.0 (pipeline.25 S231). The script is the deterministic Node writer — reads sheets via `lib/sheets.js` + `output/engine_audit_c{XX}.json` + the `## /city-hall` section of `output/production_log_c{XX}.md`, emits `output/world_summary_c{XX}.md` with verbatim column rendering and zero LLM judgment. v1.x's model-assembled body retired — every fabrication vector (G-S6/G-S7/G-S17/G-PREP4) closed structurally because the model is no longer in the writer loop.

The `disable-model-invocation: true` flag from v1.0 dropped — model invocation IS the call to the script; autonomous flow (e.g., /run-cycle) can fire this skill without operator gate.

## Purpose

Assemble `output/world_summary_c{XX}.md` from engine output. Mechanical data assembly, no editorial judgment. The script is authoritative for content; this skill is the invocation contract + operator-facing documentation.

## Usage

```bash
node scripts/buildWorldSummary.js <cycle>
```

For dry-run inspection (writes to stdout, not disk):

```bash
node scripts/buildWorldSummary.js <cycle> --dry-run
```

For custom output path:

```bash
node scripts/buildWorldSummary.js <cycle> --output <path>
```

Default output path: `output/world_summary_c{XX}.md`.

## What the script reads

Sheets via `lib/sheets.js` (service account):

- **Riley_Digest** — current cycle + previous 2 cycles (trend detection, world events, city state)
- **Oakland_Sports_Feed** — current cycle + previous 2 cycles. Sports section emits the `StoryAngle` column **verbatim per row** — no paraphrasing, no fabrication, no career-stat lookup. (Closes G-S6 / G-S7 / G-S17 root cause.)
- **Civic_Office_Ledger** — Mayor + Council approval ratings
- **Neighborhood_Map** — neighborhood table (sorted by RetailVitality desc, ties by name asc)
- **World_Population** — population aggregate
- **Simulation_Calendar** — cycle calendar state

Disk:

- **Engine audit JSON** — `output/engine_audit_c{XX}.json` (output of `/engine-review`). **FAIL LOUD** if missing — script exits non-zero with diagnostic pointing at the file path. Run `/engine-review {XX}` first.
- **City-hall production log** — the `## /city-hall` section of `output/production_log_c{XX}.md` (if present). Civic Decisions section becomes a **pointer to this log** rather than LLM-extracted content (closes G-PREP4). Since this skill runs before `/city-hall` in the chain, the section is normally a forward pointer (log not yet written); if absent it says so explicitly — does NOT gate the rest of the run. (pipeline.35 may make this skill the log-opener; for now the path is just unified per pipeline.32.)

## What the script emits

Single Markdown file with these sections (codified in `scripts/buildWorldSummary.js` section emitters):

1. Header (cycle / season / weather / cycle weight / civic load / pattern + shock flags)
1b. Snapshot line (v1.2.0, S313) — single `Snapshot: Cycle {XX} | Pop … | Illness … | …` line after the header divider; `/post-publish` Step 2c grep-extracts it into a standalone `wd-snapshot` Supermemory memory
2. City State (population / employment / economy / sentiment / domain counts / neighborhood table)
3. Civic Decisions (pointer to the `## /city-hall` section of `output/production_log_c{XX}.md`)
4. Sports (per-row `StoryAngle` verbatim from `Oakland_Sports_Feed`)
5. Evening Texture (famous people / restaurants / nightlife / streaming from Riley_Digest)
6. World Events (severity + neighborhood from Riley_Digest)
7. Three-Cycle Trends (current vs prev 2 cycles)
8. Engine Review Findings (structured pattern fields from engine_audit JSON; no editorial gloss)
9. Approval Ratings (filtered to MAYOR-* + COUNCIL-D* rows, sorted by OfficeId)
10. Footer (script version + source citation)

Section structure is owned by the script. If a section format needs changing, edit the emitter function in `scripts/buildWorldSummary.js` (and its test in `scripts/buildWorldSummary.test.js`) — do NOT edit prose in this skill or hand-edit the generated `.md`.

## Verification gate

Script exits 0 on success with `Wrote N bytes to <output-path>` to stdout. Script exits non-zero on:

- Missing `output/engine_audit_c{XX}.json`
- Sheet read failures (auth / network)
- Required column absent from source sheet

Operator confirms file exists at expected path + has non-zero size. No deeper editorial verification needed at this step — content fidelity is enforced by the script's verbatim-column-render rules, not by post-hoc inspection.

## Where this sits

Step 5 in the run-cycle chain (canonical order per `.claude/skills/run-cycle/SKILL.md`):

1. `/engine-review` (Step 4) writes `output/engine_audit_c{XX}.json`
2. **`/build-world-summary` runs this wrapper (Step 5)** → produces `output/world_summary_c{XX}.md`
3. *Downstream* — `/city-hall-prep` + `/city-hall` write the `## /city-hall` section of the unified `output/production_log_c{XX}.md` (pipeline.32). **City-hall runs AFTER this skill** (run-cycle §What Happens After), so the Civic Decisions section is a FORWARD pointer to a not-yet-written civic section, **not** a past input. If the section is absent at run time, it says so explicitly — that's correct chain state, not a missed prereq (G-BWS2). *(The opener-ordering — that this skill precedes the log open — is exactly what pipeline.35's cycle-init redesign addresses.)*
4. `/sift` reads world_summary as orientation-only (per `/sift` v2.0 §What's new — sheet-primary, world_summary is engine numbers + tables, not narrative content)
5. `/write-edition` reads sift output → reporters → compile → publish

`/post-publish` Step 2c handles Supermemory ingest. This skill produces the file; post-publish canonizes it.

## What this skill does NOT do

- Pick stories (`/sift`)
- Judge what matters (`/sift`)
- Frame articles (`/sift` + `/write-edition`)
- Check engine code (`/pre-mortem`)
- Diagnose world state (`/engine-review`)
- Editorialize engine findings — Engine Review Findings section renders structured pattern fields verbatim from `engine_audit_c{XX}.json`; no "editorial pivot" gloss

## Sources

- **Script:** `scripts/buildWorldSummary.js` v1.0.0 (pipeline.25 S231)
- **Test:** `scripts/buildWorldSummary.test.js` (12 groups / 80 assertions)
- **Plan:** [[../../../docs/plans/2026-05-22-c94-gap-log-triage]] §3 C3 (originating gap-log cluster)
- **Companion ROLLOUT row:** pipeline.31 (this skill rewrite) — research-build half of pipeline.25
