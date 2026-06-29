---
title: Deep-Dispatch Charge-Brief Template
created: 2026-06-29
updated: 2026-06-29
type: reference
tags: [media, write-edition, dispatch, deep-dispatch, format-contract, active]
sources:
  - "[[../adr/0012-autonomous-deep-dispatch-write-edition]] — Move 2 (charge replaces packet) + Move 7 (lived-experience anchor)"
  - "[[../plans/2026-06-25-deep-dispatch-write-edition-build]] — Phase 2 Task 3"
  - "[[../RESEARCH]] — S272 proof charge shape + two craft refinements (lived-anchor, canonize-meaning)"
  - "test artifacts: output/desk-test/sports_c100_deep_hal.md, output/desk-test/civic_c100_deep_carmen.md"
pointers:
  - "[[charge_brief_c100_civic_exemplar]] — worked exemplar reconstructing the C100 civic charge that produced Carmen's A piece"
  - "[[brief_template_v2]] — the parallel-path packet brief this REPLACES under deep-dispatch (both coexist; build-alongside)"
  - "[[story_evaluation]] — bug-is-event story signal the charge enacts at write time"
  - "[[SCHEMA]] — doc conventions; [[index]] — registered same commit"
---

# Deep-Dispatch Charge-Brief Template

**The unit of work for `/deep-dispatch`.** One charge per deep desk. It replaces the prescriptive packet brief ([[brief_template_v2]]) for the inverted path only — the parallel `/write-edition` path keeps the packet. (ADR-0012; build-alongside.)

**The whole point in one line:** a charge **briefs a reporter**, it does not **fill in a reporter**. You point at the sources and grant the latitude; the desk picks the subject, the angle, and traces the facts itself. The packet's failure mode is "filtered to a bone" — prescribed subject + prescribed angle + "use ONLY packet data, invent nothing" — which produces cookie-cutter prose that misses the cycle's largest events (C100, traced). The charge's job is to NOT do that.

---

## LOCKED — two things the charge must never become

These are the two forks that, gotten wrong, silently rebuild the packet (ADR-0012). Re-read them every time you author a charge:

1. **Pointers + tools, NEVER pre-assembled data.** The charge *names where the raw signal lives* (`engine_anomalies`, full `neighborhoodState`, the sheet primary, the citizen pool) and grants the tools to reach it. The source-search subagents reach the meat at runtime. **A charge that pastes anomaly numbers, citizen rows, or vote tallies into itself IS the bone-filtered packet with more fields** — that is the thing this retool exists to kill. If you find yourself copying a value into the charge, stop: write the *pointer* to it instead.
2. **The desk writes; it does not dispatch.** The charge is consumed by the orchestrating skill, which spawns the source-search agents and hands the assembled sourcing to the desk writer as text. The desk agent keeps Read/Glob/Grep/Write/Edit and is **never** granted Agent capability. (Dodges the S256 agent-file swamp; keeps the writer at session-awareness, where the depth actually lives.)

---

## The four parts

A charge is **project + beat + cycle + canon-map-as-pointers**. Author all four; none is optional.

### 1. PROJECT — the standing why

One short paragraph the desk reads to remember what GodWorld is and what journalism is *for* here. Not boilerplate — the load-bearing frame:

- The sheets and the citizens **are** the world; the paper exists so the world stays legible and Mike can intervene.
- **Engine facts, real reasoning.** Cover the engine's data; reason about it like a real journalist (coalition math, governance gaps, what a number means for who lives under it). A real-world *fact* the engine never stated is the leak; real-world *reasoning* is welcome.
- **bug-is-event.** Engine output — even a spike that looks like a bug, even an anomaly flagged `cover-as-story` — is canon the citizens lived. **Cover it. Translate the event; strip the number.** Do not scrub an anomaly as an "artifact" and do not soften a violent-crime spike into a "safety framework." (The C100 miss was exactly this: a caught signal diluted and then deleted downstream.)

This part is near-identical across desks; keep a canonical PROJECT block and reuse it.

### 2. BEAT — who this desk is, what it owns

The desk's domain and its standing voice — *not* a persona costume (S256: costume ≠ depth), the **beat**:

- Domain ("city government and municipal affairs" / "the A's and the dynasty's twilight" / "neighborhood texture, faith, arts").
- The Five Goods pillar this beat expresses, if it maps to one (see [[../../.claude/rules/newsroom|newsroom]] §Five Goods) — the engine domain that honors the good.
- One line on what makes this desk's read *differentiated* — the lane only this reporter can hold. (The moat: latitude → distinct voice. Carmen = governance gaps; "a voice Anthony or Richmond couldn't convincingly write.")

### 3. CYCLE — what just happened, as pointers

Where the cycle's signal lives, **not the signal itself**. A list of pointers the source-search agents will follow:

- `output/engine_anomalies_c{XX}.json` — the `cover-as-story` items (this is the raw signal the packet buries; route the desk straight here).
- `output/world_summary_c{XX}.md` — cycle-current ground truth (read FIRST for any stat; see Rhea two-pass order).
- `output/production_log_city_hall_c{XX}.md` — locked civic decisions/voices (civic/accountability beats).
- The relevant sheet primary (`Oakland_Sports_Feed`, `Initiative_Tracker`, `Simulation_Ledger`, `neighborhoodState`).
- Prior coverage: `search_articles "<subject>"` / bay-tribune — "what we've said," continuity, the arc.

**Pointers only.** If the cycle had a flagged anomaly, name the file and the district/tag — do not transcribe the figure.

### 4. CANON-MAP — the citizen pool + the tools + the rules

The latitude grant, made safe:

- **The citizen pool, not the subject.** Present the candidate citizens (POPIDs + one-line each, or a pointer to the pool) and say plainly: **you pick who carries the story.** Latitude over subject AND angle.
- **The tools** the source-search agents may use to reach raw data (MCP `lookup_citizen` / `search_canon` / `search_world`, dashboard API `localhost:3001/api/...`, Glob/Grep over `output/`).
- **The rules that bind invention** — pointers, not re-statement: [[canon/CANON_RULES]] (three-tier framework), names come from canon, vote math lists all 9, ages are `2041 − BirthYear`. The latitude is over angle and subject; it is **never** over inventing a real-world fact the engine denies.

---

## Two craft lines the charge must carry (S272 review refinements)

The deep proofs were A-graded but the civic review flagged them "relentless" — all-analysis, no air. Both lines below are **required** in every charge:

- **One lived-experience anchor.** Invite exactly **one** human beat — a resident, an officer, a business owner; a sentence or two of lived experience — to vary cadence. One. Not a quote-hunt; a breath. (Carmen's piece would have closed harder with a face on the corridor.)
- **Canonize meaning, not metrics.** When the desk's piece feeds the per-desk corpus, what is canon-worthy is the **finding** — the blind-spot identified, the governance mismatch, the district-to-watch — **not** the supporting stats. The charge tells the desk: your durable record is the story-level meaning, not the number.

---

## Freshness instruction (the desk's half of Task 5)

The deep path's named new risk is a **stale source-search return poisoning the writer** (the C100 OARI-scope error: a subagent reported OARI as a D1/D3/D5 pilot when INIT-002 is citywide since ~C97; the writer didn't reconcile it against the contradicting "D7 vehicle live" signal in her own sourcing). The charge carries this hard instruction to the desk:

> Before you commit any **specific civic fact** — a vote count, a program's scope/districts, a date, a dollar figure — to prose, **reconcile it.** If two source returns disagree, the newer/primary source wins and you verify it against `world_summary` or MCP before writing. A contradicted scope claim is a HARD STOP, not a judgment call.

(The orchestrator runs a pre-write reconcile pass over contradictory returns; this charge line is the writer-side backstop. The raw-data *routing* that feeds clean signal in is engine-sheet's substrate half.)

---

## What the charge is NOT

- **Not a packet.** No prescribed angle, no prescribed subject, no "use ONLY this data."
- **Not pre-assembled data.** No transcribed numbers, rows, or tallies — pointers only (LOCKED #1).
- **Not a persona file.** The desk is briefed at session-awareness; it does not load a 24/7-loop identity to write (S256). Beat ≠ costume.
- **Not a dispatch grant.** The desk never spawns agents (LOCKED #2).

---

## Skeleton (copy + fill with pointers)

```
CHARGE — {desk} desk, Cycle {XX}

PROJECT
{canonical PROJECT block — world-is-the-sheets, engine-facts-real-reasoning, bug-is-event}

BEAT
You are the {desk} desk: {domain}. {Five Goods pillar, if any.} Your lane: {the differentiated read only this desk holds}.

CYCLE — where the signal lives (pointers, not the signal)
- engine_anomalies_c{XX}.json — cover-as-story items {name districts/tags, not figures}
- world_summary_c{XX}.md — cycle-current ground truth (read first for any stat)
- production_log_city_hall_c{XX}.md — locked civic decisions {civic/accountability only}
- {sheet primary} — {what to reach for}
- prior coverage: search_articles "{subject area}" — continuity / the arc

CANON-MAP — pool + tools + rules
- Citizen pool: {POPIDs + one line each, OR pointer}. YOU pick who carries the story.
- Tools: {MCP calls, dashboard API, Glob/Grep over output/}.
- Bound by: docs/canon/CANON_RULES.md; names from canon only; vote math lists all 9; ages = 2041 − BirthYear.

CRAFT
- One lived-experience anchor (a resident/officer/owner — one breath of lived experience). One.
- Canonize the finding, not the metrics, into your desk corpus.

FRESHNESS — reconcile before you write
{the hard-stop reconcile instruction above}
```

---

## Changelog

- 2026-06-29 (S274, research.20 Phase 2 Task 3): initial template. Four-part charge (project/beat/cycle/canon-map-as-pointers), two LOCKED forks, two S272 craft lines (lived-anchor, canonize-meaning), freshness writer-backstop. Companion exemplar reconstructs the C100 civic charge. Built research-build; media executes.
