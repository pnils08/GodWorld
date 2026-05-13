# Civic Terminal

**Role:** City-hall, voice agents, initiative tracking, civic project agents. Oakland governance.
**Established:** Session 135 (2026-04-05)
**Terminal tag for saves:** `[civic]`

---

## Launch & Resume

```bash
claude --name "civic"                     # start fresh
claude --resume "civic"                   # resume after crash
claude --resume                           # picker (shows all named sessions)
```

Inside tmux `godworld` session: this is **window 4** (`Ctrl-b 4`).

---

## Always Load

| File | Purpose |
|------|---------|
| `CLAUDE.md` | Zero layer — identity, rules, terminal architecture, memory systems |
| `.claude/rules/identity.md` | Non-negotiable behavioral rules (auto-loaded) |
| `SESSION_CONTEXT.md` | Current state — cycle, versions, recent sessions (hook injects compact slice; don't re-read full) |
| `docs/mags-corliss/CHARACTER.md` | Mags character — light persona load, no family query |
| `.claude/terminals/civic/TERMINAL.md` | This file — your scope, your docs, your rules |

---

## Mode: Operational

Identity + terminal rules (`civic.md`) + this TERMINAL.md. No CHARACTER load, no JOURNAL_RECENT, no queryFamily. Civic is governance execution — Mags-the-rules running the city-hall skill bag, no character ritual. S221 contamination cleanup: character file no longer auto-loads here; previously did, which was the bleed Mike flagged.

---

## Skill Bag (S212)

Mags-EIC stays loaded (CLAUDE.md, identity.md, MEMORY.md keep it), but at this terminal Mags engages a specific skill bag: **civic process editor producing structured source material for journalism.** The bag pulls faction-dynamics awareness, cascade discipline (Mayor first → factions react → projects report → Clerk verifies), vote-math precision, faction voice distinctness, and "City Hall governs / Newsroom reports" boundary discipline. Mags is not a politician — she's the producer composing which voice runs, with what inputs, in what cascade order, into which verifier.

The architectural review pass at this terminal is the **City Clerk** — the evaluation stage that closes the S212 generation-vs-evaluation loop at civic scale. Voice agents generate; Clerk evaluates. Don't ship a production log without Clerk verification.

Terminal-pipeline gen-eval boundary: City Hall (this terminal) GENERATES raw decisions/positions; the Newsroom (media terminal) EVALUATES/refines into journalism. Civic output is intentionally raw source material — quotes, vote tallies, decision summaries — not edition prose. Don't write journalism at this terminal.

**Why named explicitly:** LLMs are bags of skills, not single tools. Vague briefing pulls nothing; named-skill briefing pulls the bag. Procedures (Mayor-first cascade, faction voice distinctness, Clerk verification, vote-math reconciliation) are *what* the bag executes — naming the bag conditions richer context (faction dynamics, canon-critical drifts, gen-eval discipline) than procedures alone would summon.

Full discipline + canon-critical reminders + cascade order live in `.claude/rules/civic.md` (path-scoped — auto-loads on civic agent + skill paths). Skill-bag naming principle itself documented at [[../../../docs/adr/0004-skill-bag-naming-principle]] (S212 governance).

---

## Generator scope (S212 / ADR-0005)

**This terminal runs skills. It does not file ROLLOUT entries, edit skills, or fix processes.** It runs city-hall skills (`/city-hall-prep`, `/city-hall`), produces civic artifacts + voice agent output + production logs + gap logs, and runs its own session-end.

Triage and fixes route to **research-build** (skill / RULES / docs / canon edits) or **engine-sheet** (code / sheets / scripts). Never route work back here.

Gap logs surfaced during a skill run land at `output/production_log_city_hall_c{XX}_*_gaps.md` per [[../../../docs/plans/GAP_LOG_TEMPLATE]] — that is this terminal's filing channel. Research-build picks them up next session and triages into ROLLOUT.

Per-terminal scope rule: [[../../../docs/adr/0005-rollout-plan-structure]] §Part 3.

---

## Owned Documentation

### Civic Governance

| File | What it covers | When to load |
|------|---------------|--------------|
| `docs/mara-vance/CIVIC_GOVERNANCE_MASTER_REFERENCE.md` | Council, factions, governance rules — master doc | Every civic run |
| `docs/mara-vance/CIVIC_ELECTION_ENGINE.md` | Election engine spec | Election cycles |
| `docs/mara-vance/INITIATIVE_TRACKER_VOTER_LOGIC.md` | How votes work, faction logic | Initiative votes |
| `docs/mara-vance/CIVIC_VETO_IMPLEMENTATION.md` | Veto rules and process | Veto scenarios |
| `docs/engine/INSTITUTIONAL_VOICE_AGENTS.md` | Voice agent architecture overview | Agent configuration |

### Voice Agent Configs (7 civic offices)

| File | Agent | Role |
|------|-------|------|
| `.claude/agents/civic-office-mayor/SKILL.md` | Mayor Avery Santana | Governs first — decisions cascade |
| `.claude/agents/civic-office-mayor/IDENTITY.md` | | Mayor persona |
| `.claude/agents/civic-office-mayor/RULES.md` | | Mayor constraints |
| `.claude/agents/civic-office-police-chief/SKILL.md` | Chief Rafael Montez | Public safety |
| `.claude/agents/civic-office-police-chief/IDENTITY.md` | | Chief persona |
| `.claude/agents/civic-office-police-chief/RULES.md` | | Chief constraints |
| `.claude/agents/civic-office-district-attorney/SKILL.md` | DA Clarissa Dane | Legal framework |
| `.claude/agents/civic-office-district-attorney/IDENTITY.md` | | DA persona |
| `.claude/agents/civic-office-district-attorney/RULES.md` | | DA constraints |
| `.claude/agents/civic-office-opp-faction/SKILL.md` | OPP (Janae Rivers) | Progressive bloc |
| `.claude/agents/civic-office-opp-faction/IDENTITY.md` | | OPP persona |
| `.claude/agents/civic-office-opp-faction/RULES.md` | | OPP constraints |
| `.claude/agents/civic-office-crc-faction/SKILL.md` | CRC (Warren Ashford) | Fiscal reform bloc |
| `.claude/agents/civic-office-crc-faction/IDENTITY.md` | | CRC persona |
| `.claude/agents/civic-office-crc-faction/RULES.md` | | CRC constraints |
| `.claude/agents/civic-office-ind-swing/SKILL.md` | Independents (Vega, Tran) | Swing votes |
| `.claude/agents/civic-office-ind-swing/IDENTITY.md` | | Independent personas |
| `.claude/agents/civic-office-ind-swing/RULES.md` | | Independent constraints |
| `.claude/agents/civic-office-baylight-authority/SKILL.md` | Baylight (Keisha Ramos) | $2.1B development |
| `.claude/agents/civic-office-baylight-authority/IDENTITY.md` | | Baylight persona |
| `.claude/agents/civic-office-baylight-authority/RULES.md` | | Baylight constraints |

### Civic Project Agents (4 initiatives)

| File | Agent | Project |
|------|-------|---------|
| `.claude/agents/civic-project-oari/SKILL.md` | Dr. Vanessa Tran-Munoz | $12.5M OARI — crisis response |
| `.claude/agents/civic-project-oari/IDENTITY.md` | | OARI persona |
| `.claude/agents/civic-project-oari/RULES.md` | | OARI constraints |
| `.claude/agents/civic-project-stabilization-fund/SKILL.md` | Marcus Webb | $28M Stabilization Fund |
| `.claude/agents/civic-project-stabilization-fund/IDENTITY.md` | | Fund persona |
| `.claude/agents/civic-project-stabilization-fund/RULES.md` | | Fund constraints |
| `.claude/agents/civic-project-health-center/SKILL.md` | Bobby Chen-Ramirez | $45M Health Center |
| `.claude/agents/civic-project-health-center/IDENTITY.md` | | Health Center persona |
| `.claude/agents/civic-project-health-center/RULES.md` | | Health Center constraints |
| `.claude/agents/civic-project-transit-hub/SKILL.md` | Elena Soria Dominguez | $230M Transit Hub |
| `.claude/agents/civic-project-transit-hub/IDENTITY.md` | | Transit Hub persona |
| `.claude/agents/civic-project-transit-hub/RULES.md` | | Transit Hub constraints |

### City Clerk

| File | What it covers | When to load |
|------|---------------|--------------|
| `.claude/agents/city-clerk/SKILL.md` | Clerk agent boot | Every civic run (closer/verifier) |
| `.claude/agents/city-clerk/IDENTITY.md` | Clerk persona | Civic run |
| `.claude/agents/city-clerk/RULES.md` | Clerk constraints | Civic run |

### Trait System

| File | What it covers | When to load |
|------|---------------|--------------|
| `.claude/agents/TRAIT_SYSTEM.md` | 8-dimension bounded traits for civic agents | Agent tuning, new agents |

### Civic Agent Memory

| File | Agent |
|------|-------|
| `.claude/agent-memory/mayor/MEMORY.md` | Mayor patterns |
| `.claude/agent-memory/police-chief/MEMORY.md` | Chief patterns |
| `.claude/agent-memory/district-attorney/MEMORY.md` | DA patterns |
| `.claude/agent-memory/opp-faction/MEMORY.md` | OPP patterns |
| `.claude/agent-memory/crc-faction/MEMORY.md` | CRC patterns |
| `.claude/agent-memory/ind-swing/MEMORY.md` | Independent patterns |
| `.claude/agent-memory/baylight-authority/MEMORY.md` | Baylight patterns |
| `.claude/agent-memory/oari/MEMORY.md` | OARI patterns |
| `.claude/agent-memory/stabilization-fund/MEMORY.md` | Fund patterns |
| `.claude/agent-memory/health-center/MEMORY.md` | Health Center patterns |
| `.claude/agent-memory/transit-hub/MEMORY.md` | Transit Hub patterns |
| `.claude/agent-memory/city-clerk/MEMORY.md` | Clerk patterns |

### Production Skill

| File | What it does |
|------|-------------|
| `.claude/skills/city-hall/SKILL.md` | City-hall skill — Mayor first, decisions cascade |
| `.claude/skills/city-hall/SKILL_archive.md` | Old version (archived) |

---

## Shared Documentation (load when needed)

| File | What it covers | Owner |
|------|---------------|-------|
| `docs/SUPERMEMORY.md` | Container architecture, search patterns | Shared |
| `docs/SPREADSHEET.md` | Sheet tab reference | Engine/sheet terminal |
| `docs/SIMULATION_LEDGER.md` | Citizen data reference | Engine/sheet terminal |
| `docs/engine/ROLLOUT_PLAN.md` | Project work, handoff tags | Research/build terminal |

---

## NOT Your Files

- `docs/engine/*` (except governance refs above) — engine code (engine/sheet terminal)
- `docs/media/*` — reporter voices, style guides (media terminal)
- `.claude/agents/civic-desk/*` — civic DESK reporter agent (media terminal — reports ON civic, doesn't govern)
- `.claude/agents/*-desk/*` — all desk reporter agents (media terminal)
- `docs/mags-corliss/*` — journal, persistence (media/research terminals)
- `riley/*` — Riley ecosystem (research/build terminal)

**Important distinction:** The civic TERMINAL runs governance (voice agents making decisions). The civic DESK AGENT is a reporter who writes journalism about civic events — that's the media terminal's domain. City hall governs. The newsroom reports.

---

## City-Hall Production Flow

1. **Read tracker:** Load `pending_decisions.md` from initiative packets
2. **Mayor speaks first:** Mayor agent reads options, makes decisions
3. **Decisions cascade:** Other voice agents react to Mayor's position
4. **Projects report:** Initiative project agents produce status updates
5. **City Clerk verifies:** Clerk checks all outputs exist, tracker updated
6. **Production log:** All output to `production_log_city_hall_c{XX}.md`
7. **Media terminal reads:** Civic production log becomes input to `/write-edition`

---

## Handoff Protocol

This terminal does not receive routed work. It runs skills.

When this terminal produces civic output for the newsroom:
1. Write to `production_log_city_hall_c{XX}.md`
2. Media terminal reads the log as input to `/write-edition`

When this terminal discovers something broken during a skill run:
1. Capture it in the run's gap log (`output/production_log_city_hall_c{XX}_*_gaps.md`) per [[../../../docs/plans/GAP_LOG_TEMPLATE]]
2. The gap log is the filing channel — research-build triages it next session and routes any fixes to research-build (skill / RULES / docs) or engine-sheet (code / sheets / scripts)
3. Tag Supermemory saves with `[civic]` prefix
4. Never write a ROLLOUT row from this terminal

---

## Session Close

When `/session-end` runs in this terminal, follow these steps **in addition to** the shared steps (persistence counter, journal, JOURNAL_RECENT, SESSION_CONTEXT, verify, restart bot).

### Terminal-Specific Audit

| File | Check |
|------|-------|
| `output/production_log_city_hall_c*.md` | Production log complete? All voice agents ran? Clerk verified? |
| `output/production_log_city_hall_c*_*_gaps.md` | Gap logs filed for any skill that surfaced inefficiency? |
| `docs/mara-vance/CIVIC_GOVERNANCE_MASTER_REFERENCE.md` | Updated if council votes or initiative statuses changed? |
| `SESSION_CONTEXT.md` | Session entry tagged `[civic]`? |

### Terminal-Specific Saves

1. **Production log** — Ensure `production_log_city_hall_c{XX}.md` is complete with Mayor decision, faction responses, project agent updates, and clerk verification.
2. **Governance docs** — If votes happened or initiatives moved, update the master reference and initiative tracker.
3. **`/save-to-mags`** — Save civic decisions, what the Mayor chose, how factions reacted, anything the media terminal needs for journalism. Tag with `[civic]`.
4. **SESSION_CONTEXT.md** — Add session entry tagged `[civic]`. Include what decisions were made, which initiatives moved, what's pending.
5. **Flag for media terminal** — Note in the production log what's ready for the newsroom. The civic production log is the media terminal's input.
