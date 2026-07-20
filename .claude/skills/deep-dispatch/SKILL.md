---
name: deep-dispatch
description: Fork-path desk writer (pipeline.44). One desk at a time, DEEP — charge assembled from the desk's slice, cheap propose→OK gate, bounded source-search with orchestrator reconcile, supplied citizen voices (pipeline.43), artifact to the desk's own corpus. Production ends at artifacts-on-disk; review is a separate decoupled flow. Run after /desk-slice.
version: "2.0"
updated: 2026-07-11
tags: [media, pipeline-44, fork, deep-dispatch, active]
effort: medium
argument-hint: "<desk> [cycle-number]"
disable-model-invocation: true
related_skills: [desk-slice, post-publish]
sources:
  - "docs/research/2026-07-11-desk-slice-fork.md — the one-doc (fork design + Task 1 charge-format rules)"
  - "docs/adr/0012-autonomous-deep-dispatch-write-edition.md — the decision (+ S289 side-fork addendum)"
  - "docs/media/charge_brief_template.md + docs/media/examples/charge_brief_c100_civic_exemplar.md — charge contract + the A-graded worked shape"
---

# /deep-dispatch — One Desk, Deep (fork path)

## What this is

`/deep-dispatch {desk} [{XX}]` runs ONE desk deep against its slice from `/desk-slice`. It is the fork's writer stage (pipeline.44) — it does NOT hand back to `/write-edition` compile. The frozen edition path keeps the monolith; this path ends at per-desk artifacts on disk, and the decoupled review flow picks them up after.

**v0.1 → v2.0 (S313):** v0.1 was the edition-coupled pilot harness (read sift's slate, returned control to `/write-edition` Step 2/3). The fork uncouples it: slices in, artifacts out, review elsewhere. v0.1 in git history.

## The principle

A packet prescribes subject + angle + "invent nothing" and produces cookie-cutter prose that misses the cycle's largest events (C100, traced). A charge points at raw signal + grants latitude, and the desk finds the story the packet walks past. The depth lever is **dispatch-shape + why-context, not tool access alone** (RESEARCH.md:1589). Two A-graded proofs (sports Tier-1; civic best-ever/#2) ran this shape. One desk holding its whole territory finds seams parallel desks walk past.

## TWO LOCKED FORKS — re-read before every run (ADR-0012)

1. **The orchestrator (this skill / Mags) spawns the source-search agents; the desk only writes.** Desk agents keep Read/Glob/Grep/Write/Edit — **never** granted Agent capability. The catalog already enforces this; do not work around it.
2. **The charge is pointers + tools, NEVER pre-assembled data.** Name where the raw signal lives, do not transcribe it. A charge that pastes anomaly numbers / citizen rows IS the bone-filtered packet with more fields.

## Hard caps (over-spawn guard, RESEARCH.md:1146)

≤3 source-search agents per desk run; ≤2 artifacts per desk per cycle.

## Prerequisites

- `output/slices/c{XX}/{desk}.md` — from `/desk-slice`. Missing → stop; do not improvise a slice from the world summary (curation is Mags-at-slice-time, not here).
- `output/engine_anomalies_c{XX}.json` + `output/world_summary_c{XX}.md` present (the slice points into them).
- Per-desk store writable: `output/desks/{desk}/articles/`. `byline`/`desk` ingest tags ride at post-publish (engine.46 substrate, built S311).

## Step 1 — Assemble the charge

Scan the slice first: `require('/root/GodWorld/lib/contextScan').scanFile(slicePath)` — `r.safe === false` → abort, surface `r.matches` (blocks log to `output/injection_blocks.log`).

Build the charge from [[../../../docs/media/charge_brief_template]], written to `output/charges/c{XX}_{desk}.md`:

- **PROJECT** — the canonical block, verbatim-class (Task 1 held-rule): sheets are the world; real-world reasoning welcome, real-world facts the engine never stated are leaks; **bug-is-event** — "Cover it. Translate the event; strip the number. Do not scrub an anomaly as an 'artifact.' Do not soften a crime spike into a safety framework."
- **BEAT** — the slice's LANE sentence, verbatim, + "You are {journalist}."
- **CYCLE** — the slice's POINTERS block, verbatim. Pointers, never figures.
- **STORYLINES** — the slice's STORYLINES block, verbatim, + "YOU pick which one carries your piece — the one that is most true about the city this cycle."
- **CANON-MAP** — attached citizens per storyline + tools (MCP lookup_citizen / search_canon / search_world; dashboard API; Grep over output/) + rules (CANON_RULES.md; names from canon only; any vote lists all 9 with the math proven; ages = 2041 − BirthYear).
- **CRAFT** — (a) supplied-voices anchor: "your storyline's citizens have spoken — supplied lines arrive with your writing charge; use at least one, verbatim or trimmed, never paraphrase-then-attribute"; (b) **REAL ASKS ONLY**: claim an interview/question/"did not respond" ONLY for an ask that actually happened (a supplied line or a recorded no-response in your materials); otherwise state absence plainly — a performed query that never occurred is fabrication (Task 1 new veer class); (c) canonize the finding, not the supporting metrics.
- **FRESHNESS** — reconcile before writing; two sources disagree → newer/primary wins AND verify vs world_summary/MCP; a contradicted scope claim is a HARD STOP. (Writer-side belt; the structural catch is Step 4.)

## Step 2 — Propose → cheap OK (Mike-direct S313 gate)

Launch the `{desk}` agent with the charge and ONLY: *"Read your charge. Return 1–2 lines: which storyline you're taking and the angle. Do not write yet."*

Mags checks territory fit + collision with the cycle's other desk runs — not taste. OK → proceed. Redirect → one line back; desk re-proposes once. Pennies spent here catch subject collisions before the deep spend.

## Step 3 — Spawn bounded source-search subagents (orchestrator)

Spawn **≤3** `source-search` agents (S326 — the Haiku-pinned retrieval agent; proven Sonnet-parity + 0 fabrications on the C100 eval, ~3-4x cheaper per hop; falls back to `Explore` only if the catalog lacks it) scoped to the **picked storyline**, each a distinct angle so they don't collide:

- **Sports:** (a) truesource/season for the player(s) in play; (b) prior canon / the arc; (c) this cycle's events + roster state.
- **Civic:** (a) `engine_anomalies` raw + neighborhoodState per-district; (b) the cycle's locked civic decisions + vote math; (c) prior coverage / initiative arc.
- **Culture/other:** adapt — one raw-signal angle, one prior-coverage angle, one cycle-events angle.

Each subagent returns **sourcing as text** — what it found, each claim traced to its source artifact/tab. They reach raw data at runtime via the tools the charge granted; the orchestrator does NOT pre-package data.

**Serialize under quota pressure (S231 G-S2).** If quota is tight, spawn one, await, then the next — a heavy parallel dispatch can be session-limit-killed (signature: `<total_tokens>0</total_tokens>` + ~500ms + session-limit string). Do not write the sourcing yourself from the EIC seat; surface the infra gap and stop.

## Step 4 — Reconcile (orchestrator — the structural freshness guard)

May be delegated to one `source-search` agent in reconcile mode (S326): hand it the conflicting returns + the ground-truth pointers; it declares the hard stop, rules, and cites. The orchestrator still owns the outcome — read the ruling before passing anything to the writer.

Before the writer sees anything:

- Cross-check the ≤3 returns against each other. Where two disagree on a **specific fact** (vote count, program scope/districts, date, dollar figure), the **newer / primary source wins** — verify against `world_summary_c{XX}.md` or MCP (`lookup_initiative`, `search_world`) before it reaches the writer.
- A contradicted **scope** claim is a HARD STOP — resolve now, not in the prose. (The exact C100 OARI miss: a stale return said OARI was a D1/D3/D5 pilot when INIT-002 was citywide since ~C97; the contradicting signal was in-hand and unreconciled.)
- Hand the writer **reconciled** sourcing + a one-line note per resolved fact; log each reconcile to the run log. *(Structural because charge prose alone did not catch the S272 error; this step is why it can't recur silently.)*

## Step 5 — Voice the citizens (pipeline.43)

Batch for the picked storyline's attached citizens — ask from the storyline context ("The Tribune is writing about <storyline>. What's your honest take, as someone living it?" + the citizen's slice context line), `record: true`:

```bash
node scripts/citizenVoice.js --batch=output/voices/voices_c{XX}_{desk}_batch.json > output/voices/voices_c{XX}_{desk}.json
```

Entries `{pop, name, quote, disp, recorded, fallback}` — recording writes the *speaking* (PRESS page doc + gated intake; dials stay behind the cycle drain). Fallbacks are explicit entries, never silent gaps. Log per-call + total tokens to the run log.

## Step 6 — The deep write (LOCKED: desk writes, no Agent grant)

Launch the `{desk}` agent (routing per `.claude/agents/REPORTER_DESK_INDEX.md`) with the charge + reconciled sourcing + supplied lines:

```
You are {journalist}. Deep-dispatch mode. Your proposal was approved: {the OK'd pick+angle}.

{the charge}

ASSEMBLED SOURCING (reconciled — facts marked [verified] are cross-checked; trust them):
{the source-search returns, reconciled}

SUPPLIED CITIZEN LINES (their own words, fetched from their real state):
{POP-NNNNN | Name | "quote"}   ← non-fallback entries for your storyline

Trace every specific fact to the sourcing above or reach it with your own
Read/Glob/Grep. Use at least one supplied line — verbatim or trimmed from
front/back, never paraphrase-then-attribute. For citizens without a supplied
line: quote only what the sourcing carries verbatim; otherwise paraphrase the
action. REAL ASKS ONLY — never claim a query or "did not respond" for an ask
that didn't happen. Write to output/desks/{desk}/articles/c{XX}_{slug}.md.
Emit: headline, "By {journalist} | Bay Tribune {Desk}", body.
Do NOT spawn agents. Do NOT read other desks' files. Write.
```

## Step 7 — Close the run

Append to `output/production_log_c{XX}.md` `## /deep-dispatch` one row per artifact: `| Desk | Journalist | Storyline | Artifact path | File exists | Words | Searches | Voices ok/fallback | Reconciles | Status |`. A run that produced no file is **DROPPED** with the reason — never a silent gap (G-W61).

**Skill ends here.** The artifact is unreviewed and unpublished. The decoupled review flow (EIC read + reviewer lanes, ~2 artifacts at a time) picks it up; publication happens there via `/post-publish`.

## Measurement hooks (the fork's proof criteria + ADR-0012 cost gate)

Record per desk run: total token cost of the chain (charge + ≤3 searches + reconcile + voices + writer) vs the frozen path's per-desk share, and the review grade. The fork proves itself on: quality parity, token burn down, moves the world, per-article wiki taggability. Depth is proven; the bill is not.

## Changelog

- 2026-06-29 (S274, research.20 Phase 2 Tasks 4+5): v0.1 initial harness. Inverted Step 1 only; reused write-edition Step 2/3. Two LOCKED forks enforced. Reconcile pass = Task 5 orchestrator half.
- 2026-07-11 (S313, pipeline.44 Task 3): v2.0 fork rewrite. Slices in (not sift slate), propose→OK gate (Mike-direct), supplied citizen voices via pipeline.43 batch (machinery didn't exist at v0.1), REAL-ASKS-ONLY rule (Task 1 new veer class), production decoupled from compile/review — ends at artifacts-on-disk. LOCKED forks, ≤3-search cap, reconcile pass, serialize-under-quota carried forward unchanged.
