---
title: Sunday city-hall invite and hearing shape — research
created: 2026-08-16
updated: 2026-08-16
type: reference
tags: [research, civic, architecture, active]
sources:
  - scripts/cron-civic-run.js — runDirective / runPrep / runDecide / runVoices / runProjects / runClose / runChain
  - scripts/civic-office-map.json — 35 offices + 4 project seats, 12 agentDirs
  - .claude/rules/civic.md — Mayor first, IND not a bloc, Clerk is closer
  - .claude/skills/city-hall/SKILL.md v2.2 — live-session cascade the cron ports
  - docs/plans/2026-07-28-civic-cron-city-hall.md — civic.15
  - docs/plans/2026-08-15-civic-office-lived-packets.md — civic.17 week-carry (Task 5 shipped)
  - docs/research/2026-08-14-civic-process-install.md — Sunday = expression, Mon–Thu = absorb
  - docs/engine/CRON_PIPELINE_MAP.md — Sunday 14:30 + 21:00, dry, no --apply
  - output/cron-civic/close_c103.json — C103 already closed, applied:false
  - Mike-direct 2026-08-16 — research Sunday invite / mayor first-and-last / round-table vs 1-at-a-time, given weekday heat + wiki
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — Watch List; civic.15 / civic.17"
  - "[[index]] — register here, same change"
  - "[[2026-08-14-civic-process-install]] — parent week"
  - "[[../plans/2026-07-28-civic-cron-city-hall]] — Sunday chain"
  - "[[../plans/2026-08-15-civic-office-lived-packets]] — weekday pack + Sunday week block"
---

# Sunday city-hall invite and hearing shape — research

**Source:** The running Sunday chain in `scripts/cron-civic-run.js`, the civic.15/civic.17 plans, civic.md, and `/city-hall` SKILL v2.2. Not an external paper. Mike 2026-08-16 asked how packets and directives are presented, who is allowed in the room, whether the Mayor should run first and last, and whether Sunday should be a round table now that Mon–Thu heat packs and wiki lines accumulate.

**What this addresses:** civic.17 closed the weekday absorb path (district pack + wiki) and spliced that week onto Sunday packets. Tomorrow is city-hall day. The chain is already a dry cron. This file records what the room actually is, so a hearing-shape change is a ruling, not a guess.

**What it does:** Sunday is a staged cascade, not a conversation. Mara writes optional directives. Prep writes one markdown packet per invited agentDir. The Mayor decides alone. Layer 2 reacts in parallel to the Mayor only. Layer 3 project seats run only if a Layer 1/2 statement touched their INIT. Clerk closes. Tracker `--apply` stays off.

---

## What they are handed

Four different documents. They are not the same object.

| Piece | Who writes it | What it is | Who reads it |
|---|---|---|---|
| Mara directive (`output/mara-directives/mara_directive_c{N}_AUTO.txt`) | `--stage=directive` (Gemini by default) | Up to 12 addressed blocks: Agent, Address, Why, Acceptance, Silence. Optional. | Prep copies an office's section into its packet if the agentDir string matches |
| City-hall packet (`output/cron-civic/packets/{agentDir}_pending_decisions_c{N}.md`) | `--stage=prep` | Prose desk: roster (blocs only), city/turf pulse, last-cycle continuity, Mara slice, **This week on the wall** (civic.17), DECISION n, then after decide: Mayor cascade | The voice model as the user prompt body |
| District pack (`output/cron-civic/packs/{officeId}_c{N}.json`) | weekday datawake / builder | OFFICE/1 JSON: actor, task.goal, pulse, named subjects, facts | Sunday packet **points at the file** and copies the lever line. It does not dump the JSON (lint) |
| Office wiki (cp-POP, daypart CIVIC) | civic.16 on every good wake | `datawake:` and `stated:` lines | Injected into the Sunday packet as the week block, and injected again at call time via `positionWallInject` |

Sunday output contract is **not** the weekday datawake shape. Weekday is `{statement, action, numberMoved}`. Sunday is `{cascadeSummary, statements[{decision, quote, fullStatement, trackerUpdates}]}`. Persona RULES.md still teach the Sunday object; that is why a weekday wake will emit a statement-object unless the user prompt forbids it (civic.17 Task 4).

---

## Who is allowed in the room

`civic-office-map.json` has **35 offices + 4 project directors**. Only **12 agentDirs** have a voice file. The other ~24 (PD, fire chief, COS, most staff) cannot be invited: no IDENTITY/RULES, no packet, no model.

**Directive addressee pool** = unique `agentDir` rows (12). Holder name is whichever row appears **first** in the map for that dir.

**Sunday speakers (C103 packets on disk, matches the last close expected set):**

| Layer | agentDir | Who actually speaks | How they got in |
|---|---|---|---|
| 1 | civic-office-mayor | Avery Santana | Always. Packet even with zero hot topics |
| 2 | civic-office-opp-faction | Janae Rivers (D5) on wake/wall. Directive holder string is Denise Carter (D1) — first map row | Faction routing: any OPP district on a hot INIT or HIGH hood |
| 2 | civic-office-crc-faction | Warren Ashford (D7) on wake/wall. Directive holder string is Elliott Crane (D6) | Same for CRC |
| 2 | civic-office-ind-swing | Ramon Vega (D4) on wake/wall. Directive holder string is Leonard Tran (D2) | Same for IND. Canon: IND is **not** a bloc; this is one agent covering two independents |
| 2 | civic-office-police-chief | Rafael Montez | Crime-flavored HIGH patterns |
| 2 | civic-office-okoro | Brenda Okoro | Stabilization INIT name match |
| 3 | civic-office-baylight-authority | Keisha Ramos | Only if a Layer 1/2 statement touched INIT-006 |
| 3 | civic-project-stabilization-fund | Marcus Webb | INIT-001 touch |
| 3 | civic-project-oari | Vanessa Tran-Muñoz | INIT-002 touch |
| 3 | civic-project-health-center | Bobby Chen-Ramirez | INIT-005 touch |
| 3 | civic-project-transit-hub | Elena Soria Dominguez | INIT-003 touch |

**On the map, not in the C103 room:**

- Clarissa Dane (DA) — has `civic-office-district-attorney`. SKILL says “only if relevant.” No C103 packet. Not in last close expected list.
- All nine council members as themselves. Packs `COUNCIL-D1`…`D9` already exist on disk. Sunday still collapses them into 3 faction agents.
- Caleb Reyes (PD) and the rest of staff — `agentDir: null`.

**Closer, not a seat:** City Clerk. Verifies, does not speak in the cascade. Mara Vance writes the directive; she does not vote.

**Invite is topic-gated, not week-gated.** Prep assigns from hot INITs (due / vote-ready / engine-flagged) and HIGH audit patterns. civic.17 does **not** add “you woke this week, so you sit Sunday.” A district that absorbed all week but intersects no hot INIT still only speaks if its faction agent was routed.

---

## Order as coded (not a round table)

```
directive → prep → Mayor (Layer 1, fatal if she fails)
        → Layer 2 in parallel (Promise.all): factions + chief + Okoro
        → Layer 3 in sequence: project seats whose INIT was named
        → Clerk → assemble → applyTrackerUpdates dry-run → civic.15 gate
        → --apply only if flag + gate pass + clerk pass
```

Layer 2 already runs **together**, not one after another. They do **not** hear each other. Each user prompt is: own packet + Mayor cascade + own wiki + Sunday JSON contract.

That is a one-way cascade, then a simultaneous reaction. It is not a hearing. It is not 1-at-a-time after Layer 1.

civic.md and SKILL Step 3 lock **Mayor first**. Factions cannot position before she has. Clerk last. There is **no Mayor-last / gavel turn**. After Layer 2/3 she does not see the room or stamp.

Cron: Sundays 14:30 + 21:00 `--stage=chain`, **no `--apply`**. Guard: if `close_c{N}.json` exists, exit clean. C103 already has that file (`applied: false`). A Sunday on C103 will not re-open the room.

---

## What the new week changes about those facts

Mon–Thu now does the absorb civic.17 was built for: district pack (people, lever, vs-city heat) + wiki lines that persist. Sunday packet now carries `## This week on the wall` plus `Latest district pack on disk:` and the lever sentence. They are not starting from a cold city report.

The hearing shape did **not** change with that. Sunday is still “react to the Mayor about hot INITs,” not “bring the week to the table.” A D7 week about KONO can sit on Ashford’s wall while the CRC agent’s DECISION 1 is still Temescal Health Center, because prep topics are tracker-driven.

civic.20’s intended causation is member → tracker → outcomes. Sunday as coded is still Mayor/tracker → faction agent. The nine `COUNCIL-D*` packs are unused as Sunday speakers.

---

## Extraction — what's usable

- **Four inputs, one speak turn** → Sunday sim-area: do not merge weekday `{statement,action}` into Sunday `statements[]`; the two contracts already fight inside CRC RULES.md.
- **12 agentDirs / 35 offices** → invite list is the voice topology, not the ledger. Expanding the room means new IDENTITY/RULES + a model, not a packet pointer.
- **3 bloc agents for 9 seats** → Sunday “who sits” is a faction microphone. Spokesperson (Rivers / Ashford / Vega) ≠ first map row used on Mara’s addressee line (Carter / Crane / Tran). That drift is load-bearing if Sunday becomes a named hearing.
- **IND is one agentDir** → civic.md “IND is not a bloc” is already violated at the microphone. A round table of persons would have to split Vega and Tran. Faction routing stays unless Mike names that change.
- **Mayor first is locked; Mayor last is unbuilt** → a gavel turn after the room speaks is the only way Sunday “move the world” is *her* stamp instead of assembleDecisions concatenating whoever wrote `trackerUpdates`. Not in civic.15.
- **Layer 2 parallel, deaf to peers** → already cheaper than 1-at-a-time. A round table is a **second** Layer 2 (shared transcript) or a multi-turn loop. Cost scales with seats. SKILL “atomic topic checkout” (one primary owner per INIT) fights a free-for-all table.
- **Week-gated invite is the civic.17-shaped fork** → sit whoever has a new `datawake:` this week, not only who intersects a hot INIT. Uses packs + wiki already on disk. Does not require `--apply`.
- **Person-gated invite is the civic.20-shaped fork** → nine council packets speak as themselves. Breaks current faction agentDir collapse. Not this file’s build; routing lock stands.
- **C103 will not rehearse any of this tomorrow** → close file exists. A new hearing needs a new cycle fire, or an explicit un-close, which civic.15 did not authorize.

**Not applicable / hazard:**

- Do not treat `/city-hall` SKILL “Mayor — his decisions” as canon. Locked: Avery Santana, she/her.
- Do not dump district-pack JSON into Sunday markdown. Lint fails on metric-decimals; civic.17 pointer+lever is the allowed shape.
- Do not flip `--apply` from this research. That is civic.15’s own switch, still dry until two clean dry Sundays are reviewed (CRON_PIPELINE_MAP).
- Do not change faction routing or tracker writes from this file.
- Do not run a round table by launching 9+ models that all emit `trackerUpdates` on the same INIT. assembleDecisions already had to normalize concatenated MilestoneNotes (S344).
- Live interactive `/city-hall` is retired. Cron is the room. Designing for Mags-hand packets in `civic-voice-workspace/` is the old turf.

**Verdict:** `adopt`

**RULED (Mike-direct, 2026-08-16): D + B, combined.** All nine districts speak Sunday as themselves — faction-aware (each voice still carries its faction identity; faction stops being the thing that speaks *for* them, not a concept that's removed) — Mayor goes last with a real closing/gavel turn instead of `assembleDecisions` mechanically concatenating whoever wrote `trackerUpdates` first. Outcomes write to Initiative_Tracker **and** a new City Hall Ledger (schema not yet designed). Named explicitly, so the D-hazard this file flagged (breaks the 3-agentDir faction collapse; the population-imbalance question from civic.21 — Vega represents 1 citizen, Rivers represents 4 — is not separately resolved here, it rides into the ledger design) is accepted, not sidestepped.

Timing: tied to es's live civic.18/civic.21/civic.23 neighborhood + hood-character work, not a later phase — see [[../plans/2026-08-16-city-hall-nine-seat-table]] (to be filed) for the build.

**Ignited plans:** [[../plans/2026-08-16-city-hall-nine-seat-table]] (draft filed 2026-08-16, grok).

---

## Applications (living)

- 2026-08-16 — filed so rb can rule before the next cycle’s Sunday, not C103’s already-closed dry chain.

---

## Changelog

- 2026-08-16 (grok) — Initial extraction from cron-civic-run.js + civic.15/17 + civic.md. No cascade edit.
- 2026-08-16 (research-build) — Ruled: D + B combined (nine-seat faction-aware table, Mayor-last gavel), Mike-direct. Verdict flipped watch → adopt. Tied to es's live neighborhood/hood-character work + a new citizen-population thread (drop a batch into the newly-online neighborhoods, define a real new-life intake). Build plan not yet filed.
