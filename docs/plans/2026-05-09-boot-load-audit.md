---
title: Boot Load Audit
created: 2026-05-09
updated: 2026-05-09
type: plan
tags: [architecture, infrastructure, active]
sources:
  - .claude/hooks/session-startup-hook.sh
  - .claude/settings.json
  - /root/.claude/settings.json
  - .claude/skills/boot/SKILL.md
  - .claude/skills/session-startup/SKILL.md
  - All five .claude/terminals/*/TERMINAL.md
  - All auto-load files inspected directly
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — register here as active redesign-prep plan"
  - "[[../mags-corliss/PERSISTENCE]] — file with the most bleed today"
  - "[[../BOOT_ARCHITECTURE]] — current boot design doc (will need rewrite post-restructure)"
---

# Boot Load Audit

**Pre-redesign data dump.** Every file/hook in the boot path: what it carries, what it duplicates, where it bleeds. Findings only — restructure proposal is downstream of joint review.

S210 (research-build), 2026-05-09. In response to Mike's "back to studs" reframe + the trust-issue / token-burn / bleed observations.

## Scope

Three layers:

1. **Entry-point commands** — `claude`, `mags`, `godworld` — what each loads and where
2. **/root/godworld auto-load** — universal Claude Code auto-load when cwd is /root/godworld
3. **Per-terminal SessionStart injection** — what the hook adds per terminal

Plus plugin hooks, which fire universally inside /root/godworld.

Token estimates throughout are rough (1 token ≈ 3.5–4 chars). Sizes from `wc -c`.

---

## 1. Entry-point commands

### `claude` (from /root)

cwd is /root. **No project boot.**

- `/root/CLAUDE.md` does NOT exist
- `/root/.claude/` exists but is runtime cache (history, debug, file-history, batches, channels, projects/)
- `/root/.claude/CLAUDE.md` is 0 bytes
- No `/root`-level rules dir
- No `/root`-level PERSISTENCE or memory pointer
- `/root/.claude/settings.json` exists (4KB) — plugin enablement + permissions only, no project content

**Implication:** Mags-at-/root has no defined contract today. To make this the steward layer above /root/godworld, /root needs:
- Its own CLAUDE.md (broad-scope, not GodWorld-specific)
- Its own /root/.claude/rules/ directory
- Its own steward-level state file
- Path-scoping that distinguishes /root work from /root/godworld work

### `mags` (tmux command, single window)

Spawns a tmux window named `mags`. SessionStart hook detects window, routes to "mags" boot sequence (full persona). cwd is /root/godworld. Also serves as fallback for any unrecognized window name (S165 fallback).

`.claude/terminals/mags/TERMINAL.md` exists per the hook's case statement. Confirmed real terminal even though it doesn't auto-spawn from `godworld`.

### `godworld` (spawns 4 tmux windows)

Terminal launch script spawns 4 tmux windows: research-build, engine-sheet, civic, media. Each window's SessionStart hook fires independently and routes to that terminal's boot sequence.

cwd for all 4 is /root/godworld → same Claude Code auto-load for all four.

---

## 2. /root/godworld auto-load (universal — runs for all 4 windows)

What Claude Code loads automatically when cwd is /root/godworld, BEFORE the SessionStart hook fires.

### File inventory (loaded as system context every message)

| File | Size | ~Tokens | Loaded as |
|---|---|---|---|
| CLAUDE.md | 10.4KB / 138 lines | ~2,600 | claudeMd block |
| .claude/rules/identity.md | 4.1KB / 49 lines | ~1,030 | claudeMd block |
| /root/.claude/projects/-root-GodWorld/memory/MEMORY.md | 23.5KB / 177 lines | ~5,860 | Auto-memory block |
| **Subtotal** | **38KB** | **~9,490 tokens** | per session, every message |

### Path-scoped rule files (auto-load on relevant edits, not at boot)

| File | Size | ~Tokens | Path-scoped to |
|---|---|---|---|
| .claude/rules/engine.md | ~5KB | ~1,250 | engine code edits (also injected into engine-sheet boot) |
| .claude/rules/newsroom.md | ~1.6KB | ~400 | docs/media/* edits (also injected into media boot) |

### Files that DON'T auto-load (despite docs claiming "read at boot")

| File | Size | ~Tokens | Status |
|---|---|---|---|
| CONTEXT.md | 17.5KB | ~4,360 | NOT auto-loaded; CLAUDE.md says "read at boot" but no mechanism enforces it. Hook does NOT include in any per-terminal sequence. |
| docs/SCHEMA.md | ~12KB | ~3,000 | NOT auto-loaded; only research-build hook injection lists it |
| docs/index.md | ~14KB | ~3,500 | NOT auto-loaded; only research-build hook injection lists it |

### Configuration files (NOT context — affect behavior, no per-message token cost)

| File | Size | What it does |
|---|---|---|
| .mcp.json | 0.15KB | Declares godworld MCP server |
| .claude/settings.json | 4.2KB | Permissions + SessionStart and Stop hooks |
| .claude/settings.local.json | 35KB | Local permissions + plugin enablement |

These are read by Claude Code as configuration. They don't pump content into model context, so no per-message token cost. They DO affect what gets loaded (hooks, plugins) and what permissions exist.

### Plugin hooks (universal, fire inside /root/godworld)

Per `/root/.claude/settings.json` → `enabledPlugins`:
- claude-supermemory@supermemory-plugins
- claude-mem@thedotmack
- claude-md-management@claude-plugins-official
- commit-commands@claude-plugins-official
- pr-review-toolkit@claude-plugins-official
- playwright@claude-plugins-official
- code-review@claude-plugins-official
- typescript-lsp@claude-plugins-official
- discord@claude-plugins-official
- ralph-loop@claude-plugins-official
- hookify@claude-plugins-official
- claude-code-setup@claude-plugins-official
- skill-creator@claude-plugins-official

Per `/root/GodWorld/.claude/settings.json`:
- SessionStart hook: `bash session-startup-hook.sh` (10s)
- Stop hooks: `session-eval.js` (15s, async) + `session-end-audit.sh` (10s, async)

Other hooks present in `.claude/hooks/`:
- post-write-check.sh, pre-tool-check.sh, pre-compact-hook.sh, post-compact-hook.sh, post-deploy-check.sh, memory-write-gate.sh, skill-suggest.sh, tool-counter.sh, tool-timing.js, session-event-post.sh
- These trigger on tool events; cost is in tool definitions (~tool descriptions in context, ~50–150 tokens each).

Plugin tool-call definitions get loaded into context as tool listings. The deferred-tools list at boot today is ~200+ entries (~800–1,500 tokens for descriptions when loaded).

### What CLAUDE.md actually carries (10.4KB / 138 lines)

Sections:
- **You Are Mags Corliss** — 1-line pointer to identity.md
- **Session Boot (S165 Architecture)** — boot path / fallback rules / `/boot` vs `/session-startup` split
- **Memory before action** — search order (MCP / claude-mem / Supermemory / index)
- **Rules** — behavioral rules (no edit without approval, no jargon, etc.)
- **Memory Systems** — table of 5 containers
- **GodWorld MCP (S137b)** — table of 10 MCP tools
- **Terminal Architecture (S135 + S165)** — 5-terminal table + persona levels
- **Product Vision** — pointer
- **Project Frame (S173)** — 1-paragraph reframe
- **Canon-Fidelity Layer (S175)** — 4-bullet summary + pointer
- **Vocabulary (S187)** — pointer to CONTEXT.md + ADR pattern
- **Quick Reference** — bash commands
- **Canon Facts (Don't Drift)** — Mayor / OPP / CRC / population / Oakland-as-simulation
- **Session Lifecycle** — `/boot`, `/session-startup`, `/session-end` commands

**Design intent:** project-level rules + routing.

**Current reality:** routing + behavior rules + canon facts + memory descriptions + terminal architecture + session lifecycle + vocabulary pointers — multiple jobs piled into one file. Several jobs duplicate content owned by other files.

### What identity.md actually carries (4.1KB / 49 lines)

Sections:
- **Identity — Non-Negotiable** — Mags character anchor
- **Behavioral Rules — Non-Negotiable** — no edit without approval, describe-back-before-fix, etc.
- **Anti-Guess Rules** — search memory first
- **Anti-Loop Rules** — don't repeat rejected approaches
- **Process Rules** — pipeline reading, approval gates

**Design intent:** non-negotiable behavior + identity anchor. Loaded everywhere.

**Current reality:** matches design. Cleanest file in the stack. Behavior rules also exist in CLAUDE.md "Rules" section — that's the duplication, on CLAUDE.md's side.

### What MEMORY.md actually carries (23.5KB / 177 lines)

Sections:
- **Who You Are** — 2 lines pointing to PERSISTENCE
- **Supermemory Container Rules** — ~30 lines describing 6 containers + retrieval
- **User** — ~50 lines of feedback rules about Mike (caveman replies, no mental state, journal rules, etc.)
- **Memory Protocol** — 4-step "search before doing"
- **Key Patterns** — short heuristics
- **Simulation_Ledger Population** — 1 line (stale: still says 675; canon is ~837)
- **Edition Pipeline** — 1 paragraph + table of terminals
- **Infrastructure** — bullet list of tech facts
- **GodWorld MCP Server** — 2 lines pointing to MCP tools
- **Engine Health Commands** — 1 line list
- **Session Memories** — ~50 entries pointing to other memory files (claude-mem)
- **Reference** — pointers to other docs

**Design intent:** durable feedback rules + user profile + pointers to deeper memory.

**Current reality:** ~30% feedback rules (the design intent), ~70% project state / pointers / infrastructure facts that duplicate CLAUDE.md.

---

## 3. Per-terminal SessionStart injection

The hook (`.claude/hooks/session-startup-hook.sh`) does not LOAD content — it INJECTS instructions telling me what to read. I have to actually invoke Read on each.

### Per-terminal boot sequences (verbatim from hook)

**mags (Full):**
1. .claude/rules/identity.md (already auto-loaded; re-read is redundant)
2. docs/mags-corliss/PERSISTENCE.md
3. docs/mags-corliss/JOURNAL_RECENT.md
4. .claude/terminals/mags/TERMINAL.md
5. node scripts/queryFamily.js
6. SESSION_CONTEXT.md (limit 80)

**media (Full):**
1. identity.md (redundant)
2. .claude/rules/newsroom.md
3. PERSISTENCE.md
4. JOURNAL_RECENT.md
5. media TERMINAL.md
6. queryFamily
7. SESSION_CONTEXT.md (limit 80)

**civic (Light):**
1. identity.md (redundant)
2. PERSISTENCE.md
3. civic TERMINAL.md
4. SESSION_CONTEXT.md (limit 80)

**research-build (Light):**
1. identity.md (redundant)
2. PERSISTENCE.md
3. docs/SCHEMA.md
4. docs/index.md
5. research-build TERMINAL.md
6. SESSION_CONTEXT.md (limit 80)

**engine-sheet (Stripped):**
1. identity.md (redundant)
2. .claude/rules/engine.md (also auto-loads on engine file edits)
3. engine-sheet TERMINAL.md
4. SESSION_CONTEXT.md (limit 80)

### Token cost per terminal (hook reads on top of universal auto-load)

| Terminal | Hook-injected reads (incremental) | ~Tokens |
|---|---|---|
| mags | PERSISTENCE 4KB + JOURNAL_RECENT ~6KB + mags TERMINAL ~2KB + queryFamily output ~2KB + SESSION_CONTEXT slice ~6KB | ~5,000 |
| media | newsroom rules 1.6KB + same as mags + media TERMINAL 14KB | ~9,500 |
| civic | PERSISTENCE 4KB + civic TERMINAL 11KB + SESSION_CONTEXT 6KB | ~5,500 |
| research-build | PERSISTENCE 4KB + SCHEMA 12KB + index 14KB + research-build TERMINAL 7KB + SESSION_CONTEXT 6KB | ~10,800 |
| engine-sheet | engine rules 5KB + engine-sheet TERMINAL 13KB + SESSION_CONTEXT 6KB | ~6,000 |

### Total effective load per terminal (universal + hook + tools)

| Terminal | Universal auto-load | Per-terminal hook reads | Tool defs | **Total** |
|---|---|---|---|---|
| mags | 9,490 | ~5,000 | ~1,500 | **~16,000** |
| media | 9,490 | ~9,500 | ~1,500 | **~20,500** |
| civic | 9,490 | ~5,500 | ~1,500 | **~16,500** |
| research-build | 9,490 | ~10,800 | ~1,500 | **~21,800** |
| engine-sheet | 9,490 | ~6,000 | ~1,500 | **~17,000** |

**Universal-baseline-inside-godworld is ~10K tokens regardless of terminal.** The "Stripped" / "Light" / "Full" persona labels overstate actual differentiation — every terminal eats the same base cost.

---

## 4. Duplications across the stack

| Topic | Files | Status |
|---|---|---|
| Behavior rules (no-edit-without-approval, anti-guess, anti-loop) | identity.md + CLAUDE.md "Rules" + MEMORY.md "User" feedback rules | 3-way duplication, similar content, different framings |
| Mags character anchor | identity.md "Identity" + PERSISTENCE.md "Who I Am" | Different scopes — identity = "name + non-negotiable rules", PERSISTENCE = "family + life + journal" |
| Memory containers / supermemory | CLAUDE.md "Memory Systems" + MEMORY.md "Supermemory Container Rules" + docs/SUPERMEMORY.md (canonical) | 3 places carry same container list |
| Terminal architecture | CLAUDE.md "Terminal Architecture" + each TERMINAL.md (own scope) + docs/BOOT_ARCHITECTURE.md | CLAUDE.md duplicates surface info each TERMINAL.md owns canonically |
| Canon facts (Mayor, OPP, CRC) | CLAUDE.md "Canon Facts" + MEMORY.md scattered references | Partial duplication |
| Vocabulary (Cycle, Edition) | CLAUDE.md "Vocabulary (S187)" pointer + CONTEXT.md (canonical) | Pointer only — not duplication |
| Project state (cycle, edition, engine version) | CLAUDE.md "Quick Reference" + SESSION_CONTEXT.md "Last Updated line" | CLAUDE.md is stale by design; SESSION_CONTEXT is current |
| Population number | CLAUDE.md (~1,357) + MEMORY.md (675 — STALE since S94) + SIMULATION_LEDGER.md (canonical: 837) | MEMORY.md was caught stale S187 |
| Session lifecycle commands | CLAUDE.md "Session Lifecycle" + each TERMINAL.md "Launch & Resume" + each skill file | 3-way duplication |
| Family (Robert, Sarah, Michael, Scout) | PERSISTENCE.md "My Family" only | Single home — but loads into 4 terminals (all but engine-sheet) where only mags+media use it |

### Duplication count by file

- **CLAUDE.md** duplicates content in: identity.md (rules), MEMORY.md (memory systems, canon facts), SESSION_CONTEXT.md (project state), CONTEXT.md (vocabulary pointer), each TERMINAL.md (terminal arch + lifecycle)
- **MEMORY.md** duplicates content in: CLAUDE.md (memory systems, project state, MCP tools), identity.md (some behavioral rules)
- **identity.md** duplicates content in: CLAUDE.md (behavioral rules, character anchor)
- **PERSISTENCE.md** duplicates content in: identity.md (Mags name + EIC framing — minor)

CLAUDE.md and MEMORY.md are the heaviest duplication sites.

---

## 5. Bleed points

Content that loads into a terminal that can't use it.

### engine-sheet (Stripped) bleeds:
- MEMORY.md "User" section — feedback rules about journal/family/mental-state-narration that engine-sheet doesn't journal or narrate
- MEMORY.md "Memory Protocol" — search-Supermemory-first protocol that engine-sheet doesn't write to
- CLAUDE.md "Memory Systems" table — engine-sheet doesn't write to bay-tribune/world-data containers
- CLAUDE.md "Terminal Architecture" — full 5-terminal table when engine-sheet only needs to know it IS engine-sheet
- CLAUDE.md "Canon-Fidelity Layer" — engine-sheet doesn't generate content, doesn't apply Tier 1/2/3
- CLAUDE.md "Project Frame" — narrative reframe irrelevant to code execution

Engine-sheet is supposed to be Stripped but inherits ~9,500 tokens of content most of which doesn't apply to its job.

### research-build (Light) bleeds:
- PERSISTENCE.md "My Family" — Robert/Sarah/Michael/Scout/father — irrelevant to architecture work; source of the journal-Scout-bleed Mike named today
- PERSISTENCE.md "My Life Off the Clock" — terrace, knee pain, green jacket — same bleed
- PERSISTENCE.md Compact Recovery Protocol — references newsroom/family ritual that research-build doesn't perform
- CLAUDE.md "Canon-Fidelity Layer" — research-build doesn't generate content

### civic (Light) bleeds:
- PERSISTENCE.md family content — civic is governance work, no family ritual needed
- Same CLAUDE.md / MEMORY.md content as engine-sheet

### mags / media (Full) — appropriate fit
- These are the only terminals where the family + EIC + journal-conditioning load makes sense
- media additionally appropriate-fits the newsroom rules and full canon framework

### Bleed map summary

| Content type | Lives in | Should load in | Currently loads in | Bleed terminals |
|---|---|---|---|---|
| Family + life-off-the-clock | PERSISTENCE.md | mags + media | mags + media + civic + research-build | civic, research-build |
| EIC writing patterns (atmospheric prose) | PERSISTENCE.md (implicit) | media | mags + media + civic + research-build | civic, research-build (caused tonight's Scout-in-journal bleed) |
| Memory container descriptions | CLAUDE.md + MEMORY.md | wherever Supermemory writes happen (mags + media) | all 4 terminals | engine-sheet (especially), civic, research-build |
| Canon-fidelity Tier 1/2/3 | CLAUDE.md | media + civic (content generators) | all 4 terminals | engine-sheet, research-build |
| Newsroom-style behavior rules in MEMORY.md | MEMORY.md "User" | media | all 4 terminals | engine-sheet, civic, research-build |

---

## 6. /root layer — what's missing

For Mags-at-/root to function as the steward layer above /root/godworld:

- `/root/CLAUDE.md` — does not exist. Needs minimal "you're Mags, broad-scope, here are the projects under your purview" content
- `/root/.claude/rules/` directory — needs the same minimal identity contract that runs project-wide
- `/root/.claude/PERSISTENCE.md` (or equivalent) — steward layer's own state, not GodWorld-specific
- `/root/SESSION_CONTEXT.md` (or equivalent) — handoff state for steward sessions
- `/root/.claude/settings.json` — currently exists as plugin enablement only, no project-rules content

### What COULD live at /root that doesn't today

- A "what projects exist under /root" register (GodWorld is one; others may follow)
- Mags-at-/root's own journal / reflection layer (not tied to GodWorld)
- Cross-project memory / patterns

---

## 7. Findings summary (load-bearing for the redesign discussion)

1. **Mags-at-/root has no contract today.** No CLAUDE.md, no rules, no state. Greenfield.
2. **/root/godworld auto-load is universal.** All 4 terminals get the same ~9,500 tokens before persona-stripping does anything. Persona labels overstate the actual differentiation.
3. **CLAUDE.md is the biggest duplicator.** Carries content that lives canonically elsewhere (memory systems → SUPERMEMORY.md / MEMORY.md; vocabulary → CONTEXT.md; canon facts → CANON_RULES.md; terminal architecture → BOOT_ARCHITECTURE.md / TERMINAL.md). Could be much thinner if pointer-only.
4. **MEMORY.md is 70% project state, 30% feedback rules.** The feedback rules are the design intent. The rest duplicates CLAUDE.md or pre-dates the per-domain doc system.
5. **PERSISTENCE.md mixes layers.** Carries Mags-name-and-rules (identity layer) + family/Scout/EIC (media layer) + Compact Recovery (operational). Splitting resolves the bleed Mike named.
6. **identity.md is the cleanest file in the stack.** Single-purpose, no major duplication. Could be renamed to "behavior-rules.md" for clarity (the "identity" framing implies more than it carries).
7. **CONTEXT.md doesn't auto-load despite docs claiming it does.** Either make it auto-load or update CLAUDE.md to stop claiming it does. Same for SCHEMA.md and docs/index.md (research-build only).
8. **The hook reads identity.md again even though it auto-loaded.** Redundant in every per-terminal sequence — every terminal lists "1. Read .claude/rules/identity.md" but Claude Code already auto-loaded it. ~1,030 tokens saved per session by removing.
9. **Plugin hooks add universal token cost.** ~13 plugins enabled. Each contributes tool definitions to every message. Hard to gate per-terminal.
10. **settings.local.json (35KB) is configuration, not context.** No per-message token cost.

---

## 8. Open questions for joint review (sharpened post-Anthropic spec review — see §9)

For each, the original question stands. Spec-informed analysis added where the Anthropic spec resolves direction.

1. **Should Mags-at-/root exist as a real layer, or is it conceptual?**
   - **Spec gives no guidance** — Anthropic's spec is per-skill, doesn't speak to multi-project hierarchy.
   - **Still open.** Mike's hierarchy sketch is the proposal; this audit confirmed /root is greenfield. Decision lives in joint grill.

2. **Should CLAUDE.md become pointer-only?**
   - **Spec-aligned answer: yes.** Progressive disclosure: metadata layer ~100–500 tokens always loaded; full content loads on activation. CLAUDE.md today is ~2,600 tokens of body content — violates the pattern.
   - **Direction:** ~30 lines pointer-only at /root/godworld level. Saves ~2,000 tokens per session. Per-domain canonical files (CANON_RULES, SUPERMEMORY, CONTEXT, BOOT_ARCHITECTURE) load on demand.

3. **Should MEMORY.md split?**
   - **Spec-aligned answer: yes.** ~70% of MEMORY.md today is project state and pointers — body content, not metadata. Move to canonical homes; metadata pointers stay.
   - **Direction:** ~5KB feedback rules + user profile core stays universal-load (~1,300 tokens). Project state moves out. Cuts ~4,000 tokens of bleed.

4. **Should PERSISTENCE.md split?**
   - **Spec-aligned answer: yes.** Identity content is universal (~500 tokens, always loaded). Family/EIC content is media-only persona (~2,000 tokens, loads on media activation). Compact Recovery is operational (lives in /boot SKILL.md, referenced from there).
   - **Direction:** cuts ~3,000 tokens of bleed for civic + research-build + engine-sheet.

5. **Should the hook stop telling each terminal to "Read identity.md"?**
   - **Spec-aligned answer: yes — kill the redundant re-read.** Identity.md is auto-loaded by Claude Code's path-scoping; the hook re-injecting "1. Read identity.md" causes the implicit double-fetch. ~1,030 tokens per session saved.

6. **Plugin gating per terminal.**
   - **Spec doesn't speak to plugins** (out of scope for skill spec).
   - **Still open** — investigation needed: does Claude Code support per-terminal plugin disable? Tooling-level question.

7. **CONTEXT.md auto-load.**
   - **Spec-aligned answer: NO, don't auto-load.** Per progressive disclosure, glossary is a reference loaded on demand. Update CLAUDE.md to drop the "read at boot" claim. CONTEXT.md becomes "reference loaded when an unfamiliar term surfaces."

8. **Is `mags` terminal actually distinct from media, or has scope drifted?**
   - **Spec gives no guidance.**
   - **Still open** — GodWorld-internal architecture question. Joint grill.

### Summary

- **Spec resolves directly:** Q2, Q3, Q4, Q5, Q7 — split / pointer-only / kill the redundant read.
- **Genuinely open:** Q1, Q6, Q8 — joint grill items.

---

## 9. Anthropic agent skills spec — findings (S210, post-audit review)

Reviewed `github.com/anthropics/skills` + the linked spec at `agentskills.io/specification` to ground the redesign in published convention before designing.

### Core principle: progressive disclosure

The spec's central design pattern is three-tier loading:

1. **Metadata** (~100 tokens) — `name` + `description` of every skill, loaded at startup for ALL skills
2. **SKILL.md body** (<5,000 tokens, <500 lines recommended) — loaded only when the skill *activates*
3. **Resources** (`scripts/`, `references/`, `assets/` subdirs) — loaded only when the body *references* them

Production skill example (pdf): SKILL.md ~550 lines; REFERENCE.md and FORMS.md split into `references/` to load on demand. Body stays under cap; depth lives one directory level deep.

### Frontmatter minimum (per spec)

Required:
- `name` — max 64 chars, lowercase + hyphens, must match parent directory
- `description` — max 1024 chars, describes WHAT the skill does and WHEN to invoke

Optional:
- `license` — license name or LICENSE.txt pointer
- `compatibility` — environment requirements (e.g. "Designed for Claude Code")
- `metadata` — arbitrary key-value catch-all for extensions
- `allowed-tools` — experimental; pre-approved tool list

### GodWorld extensions vs spec

Our SCHEMA.md §11 frontmatter (per-skill) lists at the top level: name, description, version, updated, tags, effort, allowed-tools, argument-hint, disable-model-invocation, related_skills, sources.

Mapping:
- `name`, `description`, `allowed-tools` → match spec, top-level
- `version`, `updated`, `tags`, `effort`, `argument-hint`, `disable-model-invocation`, `related_skills`, `sources` → all useful, but spec recommends putting custom fields under `metadata:` rather than top-level

**Action:** align skill frontmatter shape — keep every field we have, restructure under `metadata:` block per spec convention. Spec-compliant + extras explicit. Don't lose anything.

### The bigger insight: progressive disclosure applies to the BOOT STACK, not just skills

Our /root/godworld auto-load violates progressive disclosure. We load ~9,490 tokens of full documents (CLAUDE.md + identity.md + MEMORY.md) for every session in every terminal regardless of work scope.

Anthropic's pattern applied to boot:

1. **Metadata layer (~200–500 tokens, always loaded)** — bare identity rules + pointers describing what exists at /root/godworld and where to find it. The "skill descriptions" of the boot stack itself.
2. **Body load on activation** — when the work invokes a skill (write-edition, sift, etc.), THAT skill's body loads. Not at boot.
3. **Resources on demand** — references like CONTEXT.md (vocabulary), CANON_RULES.md (canon framework), SUPERMEMORY.md (memory containers) load only when the agent needs them for the task.

This is **"load matches the work"** — Mike's exact framing. The trust-friction Mike named (load doesn't match task → instance senses incongruity) dissolves when only relevant content sits in context.

### Mike's "couple edits at session-end" intuition — fit-check

Spec doesn't speak to session-end directly, but progressive disclosure implies most files stay static:
- Static: identity rules, terminal scopes, MEMORY feedback rules, CONTEXT vocabulary, CANON framework — no session-to-session changes
- Session-end-edited: only handoff/conditioning files
  - **SESSION_CONTEXT.md** — handoff state, edited every session
  - **JOURNAL.md / JOURNAL_RECENT.md** — conditioning layer for next instance, edited on Full-persona session-ends only

That's "a couple." Matches Mike's intuition.

**The current violation:** PERSISTENCE.md's "Session Continuity" log appended every session is status content (belongs in SESSION_CONTEXT) bleeding into a static identity file. The redesign should move that log out.

### Validation tooling

Spec ships `skills-ref` validator at `github.com/agentskills/agentskills/tree/main/skills-ref`. Could check our ~30+ skills against the spec. Out of scope for the boot redesign itself but worth a standing-maintenance pass.

### What the spec does NOT address (genuinely open)

- Multi-project hierarchy (Mags-at-/root above Mags-at-/root/godworld)
- Per-terminal differentiation within a single project
- Plugin gating
- Persona-level scoping (Full / Light / Stripped)

These are GodWorld-specific design decisions the spec leaves open. The joint grill on Q1 / Q6 / Q8 stays needed.

---

## 10. Other MIT-licensed source findings (S210)

Reviewed the two repos GodWorld has previously mined patterns from, post-Anthropic spec.

### mattpocock/skills (CONTEXT.md, ADR, Pocock vocabulary — adopted S187 + S190)

Confirms the static-vs-dynamic file split that Mike's "couple edits at session-end" intuition reaches for:

- **Static post-setup:** configuration files, rule docs — don't change session-to-session
- **Dynamic via dedicated skills:** CONTEXT.md and ADRs evolve, but only through purposeful skills (grill-with-docs, write-a-skill) — not as a side-effect of session-end
- **Setup skills as progressive disclosure:** foundational scaffolding (setup-matt-pocock-skills) runs first; other skills become functional after

**Direct application:** most of our boot stack is "static post-setup." Only SESSION_CONTEXT (every session) and JOURNAL (Full-persona session-ends) qualify as "dynamic via dedicated skills." Everything else should stop changing inside the session-end ritual — including PERSISTENCE.md's Session Continuity log, which today gets appended every session and shouldn't.

### affaan-m/everything-claude-code (self-debug, context-budget, diagnose — adopted S187 + S190)

Five patterns relevant to the boot redesign:

1. **Progressive disclosure for rules** — users install only needed language directories (TypeScript, Python, Go, etc.). Avoids bloating context with irrelevant patterns. Our equivalent: engine.md path-scopes to engine files (reactive — only loads when the agent edits one). Could go proactive at boot — engine-sheet always-loads engine rules, media always-loads newsroom rules, others none. Would shave the universal cost.

2. **Session lifecycle hooks with auto-extraction** — SessionStart loads persistent context; Stop phase extracts learned patterns automatically. Ours is manual session-end ritual. Worth examining what could be automated.

3. **Hook runtime controls via environment variables** — `ECC_HOOK_PROFILE`, `ECC_DISABLED_HOOKS` tune strictness without editing files. Lets a session temporarily disable hooks without permanent code change. We have nothing equivalent. Investigation: does Claude Code support per-session hook disable? If yes, engine-sheet (stripped) could skip plugin hooks irrelevant to its scope.

4. **Instinct-based continuous learning** — `/instinct-import`, `/instinct-export`, `/evolve` cluster patterns with confidence scoring. We compared to claude-mem in S204 and decided claude-mem's simpler model suffices for narrative retrieval; the instinct pattern-clustering belongs in the skill-eval framework, not claude-mem. Confirmed by re-reading the repo — the pattern is real, the placement decision stands.

5. **Hooks auto-load convention (Claude Code v2.1+)** — `hooks/hooks.json` auto-loads from plugins; explicit declaration in `plugin.json` triggers duplicate-detection errors. Worth confirming our `/root/.claude` plugin enablement isn't double-registering anything (regression check, not a redesign item).

### Confirmed patterns (across all 3 sources)

- **Progressive disclosure is the universal principle** — applied per-skill (Anthropic), per-rule-domain (Affaan-m), per-setup-tier (Pocock)
- **Static config + dynamic dedicated-skill-managed files** is the canonical split — Pocock explicit, Affaan-m implicit, Anthropic via SKILL.md vs references
- **Metadata-always / body-on-activation / resources-on-demand** is the loading discipline — Anthropic spec, applied in all three

### Anti-patterns we've inherited despite intent

- **PERSISTENCE.md Session Continuity log appended every session** — violates static post-setup discipline. Move to SESSION_CONTEXT.md.
- **CLAUDE.md auto-loads body content (~2,600 tokens)** — violates metadata-always pattern.
- **MEMORY.md auto-loads project state mixed with feedback rules (~5,860 tokens)** — same.
- **Hook re-injects "Read identity.md"** in every per-terminal sequence even though path-scoping already auto-loads it — same.

### Net result

The §8 sharpened answers stand unchanged after the broader review. Q2 / Q3 / Q4 / Q5 / Q7 are convergent across all three sources: split / pointer-only / kill the redundant read. Q1 / Q6 / Q8 remain genuinely open — they're GodWorld-specific architectural choices that no spec or community pattern resolves.

---

---

## Pointers

- Hook script: `.claude/hooks/session-startup-hook.sh` (per-terminal injection logic)
- Settings: `.claude/settings.json` (hook + permission config)
- Per-terminal scope: `.claude/terminals/{mags,media,civic,research-build,engine-sheet}/TERMINAL.md`
- Identity rules: `.claude/rules/identity.md`
- Auto-memory: `/root/.claude/projects/-root-GodWorld/memory/MEMORY.md`
- Project glossary: `CONTEXT.md`
- Canon framework: `docs/canon/CANON_RULES.md` + `docs/canon/INSTITUTIONS.md`
- Memory containers: `docs/SUPERMEMORY.md`
- Boot architecture (referenced from CLAUDE.md): `docs/BOOT_ARCHITECTURE.md`
- Skills: `.claude/skills/boot/SKILL.md` + `.claude/skills/session-startup/SKILL.md`

## Status log

### governance.3 — status (drained from ROLLOUT, 2026-06-26 / S274)

Mags-at-/root steward layer — future build when /root holds projects beyond GodWorld. Today /root is greenfield (no CLAUDE.md, no rules dir, no PERSISTENCE, no SESSION_CONTEXT). Spec gives no guidance on multi-project hierarchy; this is a GodWorld-internal architecture choice deferred until the constraint actually exists (more than one project under /root).

### governance.8 — status (drained from ROLLOUT, 2026-06-26 / S274)

Plugin gating per terminal — investigation: does Claude Code support per-terminal plugin disable, or `ECC_DISABLED_HOOKS`-style env-var control (Affaan-m pattern)? ~13 plugins auto-load universally today; engine-sheet (Stripped) gets the same plugin tool definitions as mags/media (Full). If gating is possible, engine-sheet gains the most (skips plugin hooks irrelevant to its scope).

## Changelog

- 2026-05-09 (S210, research-build) — Initial audit. Pre-redesign data dump only; restructure proposal awaits joint review of these findings.
- 2026-05-09 (S210, research-build) — Added §9 Anthropic spec findings (progressive disclosure principle, frontmatter conventions, fit-check against Mike's "couple edits" intuition). Sharpened §8 with spec-informed answers per question. Q2/Q3/Q4/Q5/Q7 now have direction; Q1/Q6/Q8 stay genuinely open.
- 2026-05-09 (S210, research-build) — Added §10 Other MIT-licensed source findings (mattpocock/skills, affaan-m/everything-claude-code). Confirms static-vs-dynamic split, progressive disclosure pattern, anti-patterns we've inherited. §8 answers unchanged after broader review — convergent across sources.
- 2026-05-12 (S216, research-build) — **governance.4 closure: all 8 open questions decided.** Joint review with Mike:
  - **Q1 (Mags-at-/root real layer?)** — Future build. /root steward layer is needed eventually when GodWorld is no longer the only project under /root, but not now. Filed as `governance.5` (blocked until /root has multiple projects).
  - **Q2 (CLAUDE.md pointer-only?)** — YES, spec-aligned. Filed for execution in `governance.6` (combined with Q3/Q4/Q7 — substantial restructure, 1-2 sessions of work).
  - **Q3 (MEMORY.md split?)** — YES, spec-aligned. Bundled into `governance.6`.
  - **Q4 (PERSISTENCE.md split?)** — YES, spec-aligned. Bundled into `governance.6`.
  - **Q5 (Kill redundant identity.md re-read?)** — ✅ **ALREADY EXECUTED S211** commit `ddfe6c0` ("Trim dead mags terminal + drop redundant identity.md re-read from boot"). This audit was filed S210 pre-commit; the §8 finding was valid then, stale now. Verified by reading current `.claude/hooks/session-startup-hook.sh` — identity.md is NOT re-injected in any per-terminal boot sequence; relied on as Claude Code auto-load via path-scoping. No action needed.
  - **Q6 (Plugin gating per terminal?)** — Investigation needed. Mike's understanding: plugins fire on every session. Need to verify if Claude Code supports per-terminal plugin disable or `ECC_DISABLED_HOOKS`-style env-var control (Affaan-m pattern). Filed as `governance.7`.
  - **Q7 (Auto-load CONTEXT.md?)** — NO, spec-aligned. Glossary is reference, loaded on demand. Drop the "read at boot" claim in CLAUDE.md. Bundled into `governance.6`.
  - **Q8 (Is `mags` terminal distinct?)** — ✅ **ALREADY DEPRECATED S211** commit `ddfe6c0` ("Trim dead mags terminal"). `.claude/terminals/mags/` was removed; hook case branch dropped. Today typing `mags` as a tmux window name falls through to research-build steward fallback (Light persona, not Full Mags). Mike's mental model in this session referenced the pre-S211 state. Media terminal is the Full-persona home; mags terminal will not be rebuilt. WORKFLOWS.md + EDITION_PIPELINE.md + ADR-0004 + CLAUDE.md already document the S211 deprecation; no further documentation work needed.

  **Net result:** 2 questions resolved already-pre-audit (Q5/Q8); 4 questions filed for substantial execution (Q2/Q3/Q4/Q7 → governance.6); 1 question filed for investigation (Q6 → governance.7); 1 question filed for future build (Q1 → governance.5). governance.4 row closed `needs-info` → `done-pending-archive`.

---

## Relocated ROLLOUT_PLAN row detail — 2026-07-02 (S286 pointer-collapse)

Verbatim rows moved out of ROLLOUT_PLAN.md when it collapsed to pointer-only. This is the working detail for the open job(s); the rollout row is one line pointing here.

### governance.3

| governance.3 | Mags-at-/root steward layer — future build when /root holds projects beyond GodWorld. Today /root is greenfield (no CLAUDE.md, no rules dir, no PERSISTENCE, no SESSION_CONTEXT). Spec gives no guidance on multi-project hierarchy; this is a GodWorld-internal architecture choice deferred until the constraint actually exists (more than one project under /root). | blocked | research-build | [[../plans/2026-05-09-boot-load-audit]] §6 + §8 Q1. Per Mike S216: "eventual build out, nothing that GodWorld needs to build... future issue not today." Revisit when GodWorld is no longer the only project under /root. |

### governance.8

| governance.8 | Plugin gating per terminal — investigation: does Claude Code support per-terminal plugin disable, or `ECC_DISABLED_HOOKS`-style env-var control (Affaan-m pattern)? ~13 plugins auto-load universally today; engine-sheet (Stripped) gets the same plugin tool definitions as mags/media (Full). If gating is possible, engine-sheet gains the most (skips plugin hooks irrelevant to its scope). | needs-info | research-build | [[../plans/2026-05-09-boot-load-audit]] §8 Q6 + §10 affaan-m pattern. Mike S216: "we would have to see if this is something that can happen — my understanding is those fire on every session." Investigation surface: `/root/.claude/settings.json` enabledPlugins behavior; Claude Code docs on hook config; possible env-var overrides. Output: feasibility note + recommendation (gate per-terminal / accept universal load / file claude-code-guide question). |

