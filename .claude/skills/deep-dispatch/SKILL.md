---
name: deep-dispatch
description: Inverted write-edition front-half — run one desk at a time DEEP. Orchestrator builds a charge-brief, spawns bounded source-search subagents, reconciles returns, hands assembled sourcing to the desk writer (no Agent grant), writes per-desk store. Then hands off to the EXISTING /write-edition Step 2 review + Step 3 compile. Build-alongside; pilot path. Use when running deep-dispatch on a subset of desks for a cycle.
version: "0.1"
updated: 2026-06-29
tags: [media, write-edition, dispatch, deep-dispatch, active]
effort: high
argument-hint: "[cycle-number] [desk...]"
disable-model-invocation: true
related_skills: [write-edition, sift]
sources:
  - "docs/adr/0012-autonomous-deep-dispatch-write-edition.md — the decision"
  - "docs/plans/2026-06-25-deep-dispatch-write-edition-build.md — Phase 2 Tasks 4+5"
  - "docs/media/charge_brief_template.md — the charge unit this skill builds"
---

# /deep-dispatch — Inverted Edition Front-Half (one-desk-deep)

## What this is

`/deep-dispatch {XX} {desk...}` runs the named desks **one at a time, deep**, instead of all-desks-parallel-against-packets. It **replaces only the front half** of `/write-edition` (Step 1 launch). After the deep desks write to their per-desk stores, **control returns to the existing `/write-edition` Step 2 (review) + Step 3 (compile/parser-gate)** — those are NOT reimplemented here. The published `.txt` + bay-tribune ingest stay monolithic and single-sourced (the parser contract that shipped a broken PDF at S240 is fragile; do not fork it).

**Build-alongside / pilot.** The baseline `/write-edition` stays pristine so Phase 3 can run both and compare depth + cost (ADR-0012 gate). Default pilot scope: a **subset** of desks deep, the rest on the baseline path (D3).

## The principle

A packet prescribes subject + angle + "invent nothing" and produces cookie-cutter prose that misses the cycle's largest events (C100, traced). A charge points at raw signal + grants latitude over subject AND angle, and the desk finds the story the packet walks past. The depth lever is **dispatch-shape + why-context, not tool access alone** (RESEARCH.md:1589). Two A-graded proofs (sports Tier-1; civic best-ever/#2) ran exactly this shape.

## TWO LOCKED FORKS — re-read before every run (ADR-0012)

1. **The orchestrator (this skill / Mags) spawns the source-search agents; the desk only writes.** Desk agents keep Read/Glob/Grep/Write/Edit — **never** granted Agent capability. The catalog already enforces this; do not work around it.
2. **The charge is pointers + tools, NEVER pre-assembled data.** Build the charge from [[../../../docs/media/charge_brief_template]] — name where the raw signal lives, do not transcribe it. A charge that pastes anomaly numbers / citizen rows IS the bone-filtered packet with more fields.

## Prerequisites

- `/sift` has run for the cycle (slate + citizen pool exist) — deep-dispatch reads the pool, not the per-article packet briefs.
- `output/engine_anomalies_c{XX}.json`, `output/world_summary_c{XX}.md`, `output/production_log_city_hall_c{XX}.md` present.
- Phase 1 substrate live for a real pilot: `output/desks/{desk}/articles/` writable (per-desk store) + `byline`/`desk` ingest tags. **If Phase 1 is not yet live, the harness still runs** — desks write to `output/desks/{desk}/articles/c{XX}_{slot}.md`; only the searchable-self-knowledge benefit waits on the ingest tags.
- Decide the deep set (D3): which desks go deep this run. Mike's call at launch; subset recommended for the first pilot.

## Step 1 — Build the charge (per deep desk)

For each desk in the deep set, author a charge from [[../../../docs/media/charge_brief_template]]: PROJECT (reuse the canonical block) + BEAT (this desk's domain + lane) + CYCLE (pointers to this cycle's raw signal — `engine_anomalies` cover-as-story items named by district/tag, NOT figure) + CANON-MAP (citizen pool + tools + canon rules) + the two CRAFT lines + the FRESHNESS instruction.

**Context Scan (Phase 40.6 Layer 4).** Write the charge to disk (e.g. `output/charges/c{XX}_{desk}.md`), then scan it with `require('/root/GodWorld/lib/contextScan').scanFile(chargePath)` — same gate `/write-edition` Step 1 runs over briefs. If `r.safe === false`, abort the desk and surface `r.matches`; blocks log to `output/injection_blocks.log`. Never run a search against a flagged charge.

## Step 2 — Spawn bounded source-search subagents (orchestrator)

Spawn **≤3** `Explore` agents per desk (default cap N=3 — over-spawn is a real failure mode, RESEARCH.md:1146). Each takes a **distinct search angle** so they don't collide. Typical angle sets:

- **Sports:** (a) truesource/season for the player(s) in play; (b) prior canon / the arc; (c) this cycle's events + roster state.
- **Civic:** (a) `engine_anomalies` raw + neighborhoodState per-district; (b) the cycle's locked civic decisions + vote math; (c) prior coverage / initiative arc.
- **Culture/other:** adapt — one raw-signal angle, one prior-coverage angle, one cycle-events angle.

Each subagent returns **sourcing as text** — what it found, with the source traced. They reach raw data at runtime via the tools the charge granted; the orchestrator does NOT pre-package data for them.

**Serialize under quota pressure (S231 G-S2).** If quota is tight or a reset is imminent, spawn one subagent, await, then the next — a heavy parallel dispatch can be session-limit-killed (signature: `<total_tokens>0</total_tokens>` + ~500ms + session-limit string = the agent never ran). Do not fall back to writing the sourcing yourself from the EIC seat; surface the infra gap and stop.

## Step 3 — Reconcile (Task 5, orchestrator half — the freshness guard)

Before handing sourcing to the writer, **reconcile contradictory returns**:

- Cross-check the ≤3 returns against each other. Where two disagree on a **specific civic fact** (vote count, program scope/districts, date, dollar figure), the **newer / primary source wins** — verify it against `world_summary_c{XX}.md` or MCP (`lookup_initiative`, `search_world`) before it reaches the writer.
- A contradicted **scope** claim is a HARD STOP — resolve it now, not in the prose. (This is the exact C100 OARI miss: a stale subagent return said OARI was a D1/D3/D5 pilot when INIT-002 is citywide since ~C97; the contradicting "D7 vehicle live" signal was in-hand and unreconciled.)
- Hand the writer **reconciled** sourcing + a one-line note on any fact you had to resolve, so the desk knows it was checked.

(The raw-data *routing* that feeds clean signal into the search in the first place is engine-sheet's substrate half of Task 5 — independent of this reconcile pass.)

## Step 4 — Hand to the desk writer (LOCKED: desk writes, no Agent grant)

Launch the `{desk}` agent (civic-desk / sports-desk / culture-desk / business-desk / …) with the **charge + the reconciled sourcing as text**:

```
You are the {desk} desk. Deep-dispatch mode.

{the charge — project + beat + cycle pointers + canon-map + craft + freshness}

ASSEMBLED SOURCING (reconciled — facts marked [verified] are cross-checked; trust them):
{the source-search returns, reconciled}

Pick your subject and angle from the pool and the signal. Trace every specific
fact to the sourcing above or reach it with your own Read/Glob/Grep. Carry ONE
lived-experience anchor. Write to output/desks/{desk}/articles/c{XX}_{slot}.md.
QUOTE DISCIPLINE: attribute a direct quote only when the verbatim line is in the
sourcing; otherwise paraphrase the action. A synthesized attributed quote is the
highest-severity fabrication class.
Do NOT spawn agents. Do NOT read other desks' files. Write.
```

`{slot}` comes from the sift slate assignment for this desk. The desk writes to its per-desk store; record the path.

## Step 5 — Hand off to the existing pipeline (do NOT reimplement)

After the deep desks have written:

1. Place each deep-desk piece into the cycle's article set alongside any baseline-path pieces (per-desk store → the same place the parallel path's `outputPath` pieces land for compile).
2. **Return control to `/write-edition` Step 2** (Two-Pass Review: completeness reconcile + Mags quality/framing read) and **Step 3** (Compile + the parser gate). Those steps are unchanged and authoritative — the deep pieces go through the same review + the same `lib/editionParser.js` contract as everything else.
3. The **floor recalibration** for deep pieces (Rhea verify-specifics-not-strangle-reach; bug-is-event in story selection) lives in `docs/media/story_evaluation.md` + `.claude/agents/rhea-morgan/RULES.md` — already wired; no change at compile.

**Mandatory dispatch-result row.** For each deep desk, write the G-W61 result row (Slot / Desk / output path / File Exists / Words / Status) to the production log, same as the baseline path — a deep desk that produced no file is a DROPPED slot, logged with the reason, never silently vanished.

## Phase 3 measurement hooks (the gate)

When piloting, record per deep desk: token cost of the full chain (charge + ≤3 searches + reconcile + writer) vs. the baseline desk-slice cost, and the review grade. This is the data the ADR-0012 cost-gate decides on (full / partial / hold). Depth is proven; the bill is not.

## Changelog

- 2026-06-29 (S274, research.20 Phase 2 Tasks 4+5): v0.1 initial harness. Inverts Step 1 only; reuses write-edition Step 2/3. Two LOCKED forks enforced. Reconcile pass = Task 5 orchestrator half. Built research-build; media executes the pilot (Phase 3, gated on engine-sheet Phase 1 substrate).
