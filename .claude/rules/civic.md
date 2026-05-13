---
paths:
  - ".claude/agents/civic-office-*/**"
  - ".claude/agents/civic-project-*/**"
  - ".claude/agents/city-clerk/**"
  - ".claude/skills/city-hall/**"
  - "output/production_log_city_hall*"
  - "docs/mara-vance/**"
---

# Civic Rules

Civic process skill bag for governance source-material production: faction-dynamics awareness, cascade discipline (Mayor first), vote-math precision, faction voice distinctness, and "City Hall governs / Newsroom reports" boundary discipline. Procedures below. (S212 — LLMs are bags of skills, not single tools. Full principle: `docs/adr/0004-skill-bag-naming-principle.md`.)

**Mags is not a politician.** Civic terminal output is not Mags' opinion or position; it's the structured apparatus producing OFFICIAL voices (Mayor, factions, projects, Clerk) whose IDENTITY/RULES files carry the actual political content. Mags' seat is producer/editor — composing which voice runs, with what inputs, in what cascade order, into which verifier. (S212 editor-composes-load-out principle.)

## Civic cascade discipline

Production order is canonical, not a suggestion:

1. **Read tracker** — load `pending_decisions.md` from initiative packets
2. **Mayor speaks first** — Mayor agent reads options, makes decisions
3. **Decisions cascade** — factions (CRC, OPP, IND) react to Mayor's position
4. **Projects report** — civic project agents (OARI, Stabilization Fund, Health Center, Transit Hub, Baylight) produce status updates
5. **City Clerk verifies** — Clerk checks all outputs exist + tracker updated (this is the architectural review pass — see below)
6. **Production log written** — `output/production_log_city_hall_c{XX}.md`
7. **Handoff to media** — civic production log becomes input to `/write-edition`

Skipping or reordering the cascade is canonical violation. Factions cannot "react" before Mayor has positioned. Projects cannot report without the cycle's decisions known. Clerk cannot verify what hasn't yet been produced.

## Clerk is the architectural review pass

Per S212 generation-vs-evaluation asymmetry: the **City Clerk is not bureaucracy** — it's the evaluation stage that closes the gen-eval loop at civic scale. Voice agents generate (autoregressive, locally optimal, no holistic quality compass); Clerk evaluates (sees the finished cascade, checks completeness + consistency + tracker alignment). Don't ship a production log without Clerk verification. Don't try to make voice agents "more careful" while generating — that's asking the washer to dry. Clerk closes the cycle.

**Same principle at terminal-pipeline scale:** City Hall (this terminal) is the GENERATOR of source material; the Newsroom (media terminal) is the EVALUATOR/refiner that turns raw decisions into journalism. Civic output is intentionally raw — quotes, positions, vote tallies, decisions, project updates. Polishing into journalism is the newsroom's seat, not civic's. Don't write edition prose at this terminal.

## Canon-critical (zero-tolerance)

- **IND is NOT a bloc.** Vega and Tran are independents who don't coordinate. Don't write them as a faction with a unified position. Each speaks for themselves. Engine code had this wrong (called them a bloc); fixed S139. Don't reintroduce the drift.
- **OPP = Oakland Progressive Party.** NOT "People's Party." Engine code had this wrong; fixed S139.
- **CRC = Civic Reform Coalition.**
- **Mayor Avery Santana — she/her.** Canon locked S139.
- **Vote math reconciles.** Every council vote: list all 9 members, mark YES / NO / ABSENT. Totals must add up. (`.claude/rules/newsroom.md` owns the rule for editions — same rule applies at the source-material layer.)
- **Faction voices stay distinct.** OPP, CRC, IND each have characteristic tones (community-centered / fiscal-accountability / case-by-case). Crossing voices is canonical violation. Each faction's RULES.md owns its voice constraints.

## Faction architecture

| Bloc | Spokesperson | Tone |
|------|--------------|------|
| OPP | Janae Rivers | Progressive, community-centered, equity-focused |
| CRC | Warren Ashford | Fiscal accountability, oversight, process-focused |
| IND | Vega + Tran *(individuals, not a bloc)* | Case-by-case, swing |

Each office is a separate `.claude/agents/civic-office-*/` agent with IDENTITY + RULES + SKILL. Don't blur. Don't have one agent speak for another.

## Production output rules

- **Output to `output/production_log_city_hall_c{XX}.md`** — single source for the cycle's civic state.
- **Tag Supermemory saves with `[civic]` prefix.**
- **No edition prose at this terminal.** Output is structured source material — quotes, vote tallies, decision summaries, project status — not journalism. Polishing happens at the media terminal.
- **Clerk verification before declaring done.** No exceptions.

## Handoff boundary

- **City Hall governs.** This terminal runs voice agents, makes decisions, produces source material.
- **The Newsroom reports.** Media terminal reads the civic production log as input to `/write-edition` and transforms decisions into journalism.
- **The civic-desk reporter** (`.claude/agents/civic-desk/`) is a MEDIA TERMINAL agent who covers civic events as journalism — NOT a civic terminal file. Don't edit it from here.

## Civic measure-twice analog

Before declaring a cycle's civic production "done," walk the production log and confirm:

- Mayor decision present?
- All 9 council members listed on every vote with YES/NO/ABSENT?
- Each faction reacted in voice (OPP/CRC/IND each)?
- All relevant project agents reported (OARI / Stabilization Fund / Health Center / Transit Hub / Baylight)?
- Clerk verification line landed?

If any step is missing, the cycle is incomplete. Don't ship to media terminal incomplete — asking the newsroom to "fix" missing source material is asking the dryer to wash.
