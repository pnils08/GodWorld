---
name: context-budget
description: Audit token overhead across .claude/agents/, .claude/skills/, .mcp.json, .claude/rules/, CLAUDE.md, MEMORY.md, CONTEXT.md. Identify bloat, redundancy, optimization targets. Run after adding components or when context feels heavy.
version: "1.0"
updated: 2026-04-29
tags: [meta, infrastructure, active]
effort: medium
sources:
  - https://github.com/affaan-m/everything-claude-code/blob/main/skills/context-budget/SKILL.md (MIT, Affaan Mustafa 2026)
related_skills: [doc-audit, tech-debt-audit, skill-audit]
---

# /context-budget — Token-overhead audit

Surface the token cost of every loaded component and rank what to trim. Token burn surfaces every few sessions (S141 Gemini autodream switch, S156 briefing-bloat audit, S180 Discord-bot edition currency). This skill makes the audit routine, not crisis-driven.

Distinct from `/doc-audit` (content staleness) and `/tech-debt-audit` (engine code health). This is purely about token economics.

---

## When to use

- Session feels sluggish or output quality is degrading
- Just added agents, skills, or MCP servers
- Want to know how much context headroom is left
- Planning to add components and need to know if there's room
- Periodic maintenance — every 5–10 sessions

## When NOT to use

- Routine work in progress — wait for a maintenance window
- Recent additions are still being evaluated — don't audit before they prove out
- Mid-cycle (between sift and post-publish) — wait until cycle closes

---

## What to scan

### Agents (`.claude/agents/<name>/`)

Each canon-fidelity agent carries four files: IDENTITY.md + LENS.md + RULES.md + SKILL.md. Token cost per agent = sum across all four. **Description-field cost is special** — loaded into every Task tool spawn even if the agent is never invoked.

Surface: 25 canon-fidelity agents × 4 = 100 files. Plus engine-validator (code-only, scope-noted N/A).

Flag patterns:
- Agent description > 30 words (Pocock/affaan-m bloat threshold)
- IDENTITY.md > 80 lines
- RULES.md > 200 lines (canon-fidelity rules bulk fast if not pruned)
- LENS.md duplicates IDENTITY.md content
- Agents not invoked in 20+ sessions (deprecate candidates)

### Skills (`.claude/skills/<name>/SKILL.md`)

Single SKILL.md per skill (some have supporting files). Description loads with skill registration. Body loads only when invoked.

Surface: ~80+ skills currently.

Flag patterns:
- SKILL.md > 400 lines
- Description > 30 words
- Two skills with overlapping triggers (one will fire when the other should)
- Skills not invoked in 20+ sessions

### MCP servers (`.mcp.json` + plugin MCPs)

Each tool schema costs ~500 tokens. Always loaded into context regardless of whether tool fires.

Surface: `godworld` (10 tools) + `claude-mem` + `claude-in-chrome` + `figma` + `gmail` + `calendar` + `drive` + `mara` + `slack` + `context7` + `discord` + `playwright` + `supermemory` + `claude-batch`.

Flag patterns:
- Servers with > 20 tools (multiplier risk)
- Servers wrapping CLI tools available for free (e.g. `gh` shell vs gh-MCP)
- Servers never invoked across 20+ sessions

### Rules (`.claude/rules/*.md`)

Path-scoped per CLAUDE.md: `identity.md` (always), `engine.md`, `newsroom.md`, `dashboard.md`.

- Always-loaded: `identity.md`
- Path-scoped: others (only load when working in that path)

Flag patterns:
- identity.md > 200 lines (always-loaded — every line is a tax)
- path-scoped rule duplicating identity.md content
- path-scoped rule that could be merged into identity.md to drop a file

### Top-level instruction files

| File | Always? | Notes |
|------|---------|-------|
| CLAUDE.md | yes | Project rules, auto-loaded |
| MEMORY.md | yes | Persistent-memory index, auto-loaded |
| CONTEXT.md | recommended at boot | Project glossary (S187 ADR-0001) |
| SCHEMA.md | on-demand | Doc conventions |

Flag patterns:
- CLAUDE.md > 300 lines
- MEMORY.md over 24.4KB warning threshold (we hit 25.9KB on S187)
- CONTEXT.md duplicates content in CANON_RULES / INSTITUTIONS / SCHEMA (per ADR-0001 it should pointer, not duplicate)

---

## Process

### Phase 1 — Inventory

For each surface above, count files + tokens (`words × 1.3` for prose, `chars / 4` for code-heavy).

Capture per-component:
- File path
- Line count
- Token estimate
- Description length (for agents / skills / MCP tools)
- Always-loaded? (yes / per-terminal / per-invocation)

### Phase 2 — Classify

Bucket every component:

| Bucket | Criteria | Action |
|--------|----------|--------|
| Always needed | Referenced from CLAUDE.md, backs an active skill, or matches active terminal scope | Keep |
| Sometimes needed | Domain-specific (one of N terminals, specific cycle phase) | Consider lazy-load or path-scope |
| Rarely needed | No active reference, overlapping content, no apparent home | Remove or archive |

### Phase 3 — Detect issues

- **Bloated agent descriptions** — > 30 words in frontmatter
- **Heavy agents** — combined four-file count > 600 lines
- **Redundant components** — skill duplicates agent logic, rule duplicates CLAUDE.md, two skills overlap
- **MCP over-subscription** — > 10 active servers, or wrappers around free CLI
- **CLAUDE.md bloat** — verbose explanations, outdated sections, instructions that should be path-scoped rules
- **MEMORY.md over threshold** — index entries too long (S147 wiki-not-recall rule); detail belongs in topic files
- **Stale tools** — MCP servers / skills / agents not invoked in 20+ sessions

### Phase 4 — Report

Produce the budget report:

```
GodWorld Context Budget Report
═══════════════════════════════════════

Always-loaded baseline:        ~XX,XXX tokens
Per-terminal additional (Full): ~X,XXX tokens
Per-cycle additional:          ~XX,XXX tokens

Component Breakdown:
┌──────────────────┬────────┬───────────┬─────────────┐
│ Component        │ Count  │ Tokens    │ Always?     │
├──────────────────┼────────┼───────────┼─────────────┤
│ CLAUDE.md        │ 1      │ ~X,XXX    │ yes         │
│ MEMORY.md        │ 1      │ ~XX,XXX   │ yes         │
│ identity.md      │ 1      │ ~X,XXX    │ yes         │
│ Agent descs      │ 25     │ ~X,XXX    │ yes (Task)  │
│ Skill descs      │ 80+    │ ~X,XXX    │ yes (reg)   │
│ MCP schemas      │ N tools│ ~XX,XXX   │ yes         │
│ Path-scoped rules│ 4      │ ~X,XXX    │ on-path     │
└──────────────────┴────────┴───────────┴─────────────┘

Issues found (N):
  [ranked by token savings]

Top 3 optimizations:
  1. [action] → save ~X,XXX tokens
  2. [action] → save ~X,XXX tokens
  3. [action] → save ~X,XXX tokens

Potential savings: ~XX,XXX tokens (XX% of current overhead)
```

Verbose mode: per-file token counts, per-agent breakdown across IDENTITY+LENS+RULES+SKILL, full MCP tool list with per-tool schema size.

---

## Examples

**Basic audit**

```
User: /context-budget
Skill: Scans setup → 25 agents (~30K agent files, ~12K Task-context descriptions),
       80+ skills (~12K registration descriptions), 14 MCP servers w/ ~80 tools (~40K),
       CLAUDE.md (~5K), MEMORY.md (~24K, at threshold).
       Flags: 3 agents with descriptions > 30 words; 2 MCP servers wrapping git/gh;
       MEMORY.md index entries too long (per S147 wiki-not-recall rule).
       Top saving: trim MEMORY.md index → -2K; trim 3 agent descriptions → -300;
       replace gh/git MCP with bash → -8K.
```

**Verbose mode**

```
User: /context-budget --verbose
Skill: Full report + per-file breakdown, per-agent IDENTITY+LENS+RULES+SKILL line counts,
       every MCP tool with per-tool schema size estimate.
```

**Pre-expansion check**

```
User: I want to add a new MCP server. Do I have headroom?
Skill: Current always-loaded baseline ~85K tokens (~42% of 200K). Adding 30-tool server
       = ~15K. New baseline ~50%. Recommendation: trim 2 unused MCP servers first to
       stay under 45%.
```

---

## Best practices

- **Token estimation:** `words × 1.3` for prose, `chars / 4` for code-heavy files
- **MCP is the biggest lever:** each tool schema costs ~500 tokens; a 30-tool server costs more than all our skills combined
- **Agent descriptions are loaded always (Task context):** even if the agent is never invoked, the description field is present in every Task tool spawn
- **Skill descriptions are loaded at registration:** the available-skills list ships at every system-reminder; descriptions tax that surface
- **Verbose mode for debugging:** use when pinpointing exact files driving overhead, not for regular audits
- **Audit after changes:** run after adding any agent, skill, or MCP server

---

## Integration

- After audit, if a finding becomes a recurring rule: update `.claude/rules/identity.md` or a topic-specific MEMORY.md feedback file
- Pair with `/skill-audit` (skill drift) and `/doc-audit` (content staleness) for full health picture
- Re-run after each major addition (new agent, MCP server, skill batch)
- Token-burn investigations should start here — before guessing, audit

---

## Changelog

- 2026-04-29 — Initial draft (S187, research-build). Adapted from MIT-licensed `affaan-m/everything-claude-code/skills/context-budget/SKILL.md` (Affaan Mustafa 2026). Localized to GodWorld component shape: 25-agent canon-fidelity stack with four files each (IDENTITY+LENS+RULES+SKILL), path-scoped rules in `.claude/rules/`, MEMORY.md as separate persistent layer with size threshold, CONTEXT.md as ADR-0001 vocabulary primitive, terminal-scoped persona levels (Full / Light / Stripped) factored into baseline math.
