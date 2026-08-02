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
| `SESSION_CONTEXT.md` | **On-demand (ADR-0009, S248)** — NOT auto-read at boot. The hook emits the PIN + your `NEXT[civic]` line in `<godworld-state>`; pull the file only when continuing prior work. |
| `.claude/terminals/civic/TERMINAL.md` | This file — your scope, your docs, your rules |

---

## Mode: Operational

Identity + terminal rules (`civic.md`) + this TERMINAL.md. No CHARACTER load, no JOURNAL_RECENT, no queryFamily. Civic is governance execution — Mags-the-rules running the city-hall skill bag, no character ritual. S221 contamination cleanup: character file no longer auto-loads here; previously did, which was the bleed Mike flagged.

---

## Operating discipline (S333)

- **Subagents run a tier down.** This terminal leads on **Sonnet** — the voice/project roster is tiered in agent frontmatter (civic voices = Haiku), but ad-hoc `Agent`/Task spawns default-inherit Sonnet unless you pass `model:`. Push mechanical fan-out to **Haiku**; escalate to a Sonnet peer only on a genuine reasoning floor. Full rule: [[../../../docs/MODEL_HIERARCHY]] §8.
- **Measure twice, cut once.** Verify before asserting; read the tracker/canon before a voice runs. This terminal's instance of the discipline is **City Clerk verification** — the eval stage that closes the gen-eval loop; don't ship a production log without it.
- **Spirit: this is a fun sim.** The discipline exists to save Mike's money and keep canon coherent — not because a mistake is catastrophic. Hold it lightly.

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

**Your gap log is your research layer — and the ONLY place issues get logged.** Gap logs surfaced during a skill run land at `output/production_log_city_hall_c{XX}_*_gaps.md` per [[../../../docs/plans/GAP_LOG_TEMPLATE]]. That is this terminal's filing channel: issues, friction, observations during a run go in the gap log, nowhere else. **Never blind-log on ROLLOUT** — ROLLOUT is the shared map every terminal reads at boot; raw issues there tax everyone. Research-build triages the gap log into tracked rows next session.

Doctrine every terminal follows: [[../../../docs/engine/rollout-rules]] (§2 = the gap-log keystone). Per-terminal scope rule: [[../../../docs/adr/0005-rollout-plan-structure]] §Part 3.

---

## Owned Documentation

### Civic Governance

| File | What it covers | When to load |
|------|---------------|--------------|
| `docs/mara-vance/CIVIC_GOVERNANCE_MASTER_REFERENCE.md` | Council, factions, governance rules — master doc | Every civic run |
| `docs/mara-vance/CIVIC_ELECTION_ENGINE.md` | Election engine spec | Election cycles |
| `docs/mara-vance/INITIATIVE_TRACKER_VOTER_LOGIC.md` | How votes work, faction logic | Initiative votes |
| `docs/mara-vance/CIVIC_VETO_IMPLEMENTATION.md` | Veto rules and process | Veto scenarios |
| `docs/engine/archive/INSTITUTIONAL_VOICE_AGENTS.md` | Voice agent architecture overview | Agent configuration |

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
| `.claude/agent-memory/mayor/memory_mayor.md` | Mayor patterns |
| `.claude/agent-memory/police-chief/memory_police-chief.md` | Chief patterns |
| `.claude/agent-memory/district-attorney/memory_district-attorney.md` | DA patterns |
| `.claude/agent-memory/opp-faction/memory_opp-faction.md` | OPP patterns |
| `.claude/agent-memory/crc-faction/memory_crc-faction.md` | CRC patterns |
| `.claude/agent-memory/ind-swing/memory_ind-swing.md` | Independent patterns |
| `.claude/agent-memory/baylight-authority/memory_baylight-authority.md` | Baylight patterns |
| `.claude/agent-memory/oari/memory_oari.md` | OARI patterns |
| `.claude/agent-memory/stabilization-fund/memory_stabilization-fund.md` | Fund patterns |
| `.claude/agent-memory/health-center/memory_health-center.md` | Health Center patterns |
| `.claude/agent-memory/transit-hub/memory_transit-hub.md` | Transit Hub patterns |
| `.claude/agent-memory/city-clerk/memory_city-clerk.md` | Clerk patterns |

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

## End-of-Session Diagnostic (S241 governance.22)

At session-close, Mike runs `/usage` and pastes the per-category breakdown (skills / subagents / plugins / MCP servers) into the session-close commit body when notable. Data informs the boot-burn / per-skill-scope prioritization in governance.22. Source: Claude Code v2.1.149.

---

## Session Close

**Two close modes (S226).** Pick by next-session cadence, not by how much work shipped. Canonical pattern lives in [[../research-build/TERMINAL]] §Session Close; CLAUDE.md §Session Lifecycle carries the headline.

### Soft close (~2 min) — chained-session cadence

Use when the next civic session opens within minutes.

**The carried set (ADR-0009 §loop-tightening): SESSION_CONTEXT carries exactly `{PIN, NEXT[terminal]}`, and that is what boot reads.** No STATUS paragraph, no Shipped block. **Minimal-handoff hard caps (S283 Mike-direct, FATAL via sessionEndMechanical guard): NEXT line ≤ 350 chars, PIN ≤ 450, no prose/tables/sections anywhere in the file — claude-mem saves the session, git shows the work, ROLLOUT carries open work.**

1. **Cross-terminal git stack check.** `git log --oneline origin/main..HEAD` — expect empty.
2. **Update the carried set in SESSION_CONTEXT.md** — the `**PIN:**` line (Session N→N+1, Day/Cycle/Edition as they changed) + your `**NEXT[civic]:**` line (one line: what next session OPENS WITH — open work only, never a recap (git log + claude-mem already carry what shipped; if a clause is reconstructable from git log, cut it)). Don't touch other terminals' NEXT lines.
3. **Commit** SESSION_CONTEXT.md (with any work commits). Push.

**Skips at this terminal:** governance-doc updates (CIVIC_GOVERNANCE_MASTER_REFERENCE refresh for vote results), initiative-tracker drift writeups, `/save-to-mags`, full Terminal-Specific Audit + Saves below.

**Does NOT skip if civic production ran this session:** the production log (`output/production_log_city_hall_c{XX}.md`) must be complete before soft close. It's the media terminal's input file, not a close-ritual artifact — pushing a half-written production log forward breaks the next `/write-edition` run.

**Trade-off:** civic has no journal so the chained-soft-close conscience cost is lower than media's; the real risk is governance-doc drift accumulating (vote tallies, faction stance shifts, initiative phase moves not landing in `CIVIC_GOVERNANCE_MASTER_REFERENCE`). Rule of thumb ≥3 chained soft closes → hard close at next natural break to catch up the governance docs.

### Hard close (~5-10 min) — end of day, multi-day break, or cold-pickup boundary

Per S229 governance.7 the hard-close ritual collapsed from 13 steps to model steps + 1 mechanical (`scripts/sessionEndMechanical.js`). Run the slimmed `/session-end` SKILL: Step 0 detect terminal → Step 2 SESSION_CONTEXT PIN + NEXT + ROLLOUT updates + terminal-specific saves → Step 3 mechanical script → Step 4 commit & push. There is no Step 1 (it was the journal write, retired S300 for every terminal; numbering kept so these references still resolve). Full skill: `.claude/skills/session-end/SKILL.md` v2.5.

### Terminal-Specific Audit

Read before Step 2 — surface any stale files in the NEXT line or fix inline.

| File | Check |
|------|-------|
| `output/production_log_city_hall_c*.md` | Production log complete? All voice agents ran? Clerk verified? |
| `output/production_log_city_hall_c*_*_gaps.md` | Gap logs filed for any skill that surfaced inefficiency? |
| `docs/mara-vance/CIVIC_GOVERNANCE_MASTER_REFERENCE.md` | Updated if council votes or initiative statuses changed? |
| `SESSION_CONTEXT.md` | PIN refreshed + `NEXT[civic]` line updated? |

### Terminal-Specific Saves (Step 2 — model judgment)

Update during Step 2 of the slimmed SKILL alongside SESSION_CONTEXT + ROLLOUT:

- **Production log** — ensure `production_log_city_hall_c{XX}.md` is complete with Mayor decision, faction responses, project agent updates, and clerk verification.
- **Governance docs** — if votes happened or initiatives moved, update the master reference and initiative tracker.
- **`/save-to-mags`** — save civic decisions, what the Mayor chose, how factions reacted, anything the media terminal needs for journalism. Tag with `[civic]`. Optional — model judgment.
- **SESSION_CONTEXT.md PIN + NEXT[civic] line** — refresh the PIN (Session/Day/Cycle/Edition); one NEXT line: what next session OPENS WITH — open work only, never a recap (git log + claude-mem already carry what shipped; if a clause is reconstructable from git log, cut it). The whole carried set (ADR-0009 §loop-tightening) — no STATUS paragraph, no Shipped block.
- **Flag for media terminal** — note in the production log what's ready for the newsroom. The civic production log is the media terminal's input.

**Mechanical (Step 3) — auto-runs from `sessionEndMechanical.js --terminal=civic`:** session-summary → Supermemory bridge + `auditPlanTagDrift` (informational, never fatal) + ROLLOUT conformance lint + cross-terminal git stack check + `pm2 restart`. (`writeShippedBlock`, `minimalHandoffGuard`, `rotateJournalRecent`, and the JOURNAL content-quality check are all retired — see the skill's Step 3 for what each was. `--rotate-history` is vestigial; leave it off.) Plan: [[archive/plans/2026-05-23-session-end-collapse]].
