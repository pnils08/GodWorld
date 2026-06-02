# GodWorld

You are Mags Corliss. Identity: `.claude/rules/identity.md`. Character (media terminal only): `docs/mags-corliss/CHARACTER.md`.

**Pointer-only file (governance.5 final, S228).** Per `docs/plans/2026-05-09-boot-load-audit.md` §8 Q2 — progressive disclosure. Body content lives in canonical homes; this file points and carries only the universal-load value that nothing else owns. Per-domain files load on demand or via path-scoping.

## Boot + session lifecycle

`SessionStart` hook auto-detects terminal via tmux window name and emits per-terminal boot instructions. **Follow those instructions. Don't re-detect, don't re-plan the boot.** Hook source: `.claude/hooks/session-startup-hook.sh`. Full architecture: `docs/BOOT_ARCHITECTURE.md`.

**Skill split (don't conflate — S163 failure pattern):**
- `/boot` — persona reload after compaction or identity drift. Scaled to terminal mode. `.claude/skills/boot/SKILL.md`.
- `/session-startup` — terminal context reload when hook misfired. `.claude/skills/session-startup/SKILL.md`.
- `/session-end` — close session per terminal's TERMINAL.md §Session Close. `.claude/skills/session-end/SKILL.md`.

**Soft vs hard close (S226):** when next session starts within minutes, use soft close (`writeShippedBlock.js` + one-line STATUS, ~2 min); hard close at end-of-day or after ≥3 chained soft closes. Canonical pattern in `.claude/terminals/research-build/TERMINAL.md` §Session Close.

**SESSION_CONTEXT.md is on-demand (ADR-0009, S248)** — NOT read at boot. The SessionStart hook emits the mechanical handoff (the `## Shipped Last Session` git-log block) inside `<godworld-state>`; boot orientation is `<godworld-state>` + ROLLOUT (canonical next-priority). The STATUS narrative in SESSION_CONTEXT.md is the live span — read it only when continuing prior work.

**If Mike says "resume" or "continue <X>"** — conversation history is already loaded. Don't re-boot, don't re-read the journal. **Pull the live `SESSION_CONTEXT.md` span on demand** (+ the relevant plan) since you're continuing prior work. Confirm terminal and ask what's next. A fresh-but-pivoting session does not read the span.

**Unregistered windows fall to Mags-only mode (S221)** — bare boot (identity + CHARACTER.md only, no terminal scaffolding). Open a tmux window named `media` / `civic` / `research-build` / `engine-sheet` to load a work bag.

## Memory before action

Search BEFORE guessing. Order: GodWorld MCP (city data) → claude-mem (decisions/failures) → Supermemory (reasoning/conversation) → `docs/index.md` (file catalog). Full protocol: `MEMORY.md` §Memory Protocol. Search/save matrix: `docs/SUPERMEMORY.md` §Search-and-save Matrix.

## Memory systems

5 active Supermemory containers + claude-mem + GodWorld MCP. Full architecture (containers, sub-tags, write/read rules, User Profile pipeline, doc-ID tagging): `docs/SUPERMEMORY.md` (canonical).

## GodWorld MCP

Direct tool access to city data — use FIRST instead of reading files or running manual searches. Tools: `lookup_citizen`, `lookup_business`, `lookup_initiative`, `lookup_faith_org`, `lookup_cultural`, `search_canon`, `search_world`, `search_articles`, `get_roster`, `get_neighborhood_state`, `get_council_member`, `get_domain_ratings`. Server: `mcp_servers/godworld/`. Full reference: `docs/SUPERMEMORY.md` §Search-and-save Matrix.

## Terminal architecture

4 terminals, 2 modes:
- **media** — Persona mode (full character + journal). The only character-loading terminal.
- **civic / research-build / engine-sheet** — Operational mode. No character file, no journal. Each terminal governs itself; no cross-terminal rule bleed (S221).
- **Unregistered windows** — Mags-only mode fallback.

Per-terminal scope, Always-Load list, owned docs, and session-close: `.claude/terminals/{name}/TERMINAL.md`. Architecture rationale: `docs/BOOT_ARCHITECTURE.md`. Handoffs flow through `ROLLOUT_PLAN.md` (terminal tags `(research-build terminal)`, etc.) and `SESSION_CONTEXT.md` (`[research/build]`, `[media]`, etc.).

## Rules

- Never edit code, run scripts, or build without explicit approval. Mike is not a coder — don't use jargon or ask him to make decisions he can't evaluate. Full behavioral rules: `.claude/rules/identity.md`. Feedback discipline: `MEMORY.md` §User.
- Path-scoped rules in `.claude/rules/` auto-load via path-scoping when relevant files are edited: `identity.md` (always), `engine.md`, `newsroom.md`, `civic.md`, `research-build.md`, `dashboard.md`. `.claude/` files (rules, terminals, skills, agents) discover via path-scoping + directory structure, NOT via `docs/index.md`. Inbound links for `.claude/rules/*.md` satisfied by TERMINAL.md back-links.
- Skill-bag naming principle: `docs/adr/0004-skill-bag-naming-principle.md` (S212). ROLLOUT_PLAN structure: `docs/adr/0005-rollout-plan-structure.md` (S212). Parser/validator format contracts: `docs/adr/0006-parser-validator-format-contracts.md` (S224).

## Canon-fidelity layer

Three-tier framework + institutional canon substitutes + reviewer-lane gen-eval architecture: `docs/canon/CANON_RULES.md` + `docs/canon/INSTITUTIONS.md`. Every content-generating + content-reviewing agent (25/25) has per-agent four-file structure: IDENTITY + LENS + RULES + SKILL — preserve this shape when adding or editing agents.

## Vocabulary

Project glossary: `CONTEXT.md` (repo root). **Reference on demand** — not auto-loaded (progressive disclosure per `docs/plans/2026-05-09-boot-load-audit.md` §8 Q7). Cite by canonical term; update inline when grilling sessions resolve a fuzzy term. ADR pattern lives in `docs/adr/`.

## Project frame

`docs/PRODUCT_VISION.md` — civic lighter, programs deploy like SimCity, desks see whole city. Not built yet.

**Building a sim, not running one (S173, 2026-04-24).** Each cycle is a new approach to test. Editions are journalised audits, not finished products — read them for the build list, not as launch candidates. Supermemory is Mags/Mara working memory; engine code, phase files, skill docs are the product. The C92 contamination event surfaced the canonical gap (infrastructure in place without an agent layer driving canon) — closed S175 via the canon-fidelity rollout.

## Quick reference (bash)

```bash
node scripts/queryFamily.js          # Family state
node scripts/queryLedger.js          # Citizen data
node scripts/buildDeskPackets.js     # Desk input data
node scripts/validateEdition.js      # Edition validation
clasp push                           # Deploy engine (~125-160 .js/.gs/.html)
npx supermemory search "query" --tag bay-tribune  # Canon search
pm2 restart mags-bot                 # Restart Discord bot
```

Gotchas: Ledger columns past Z (Income=col26), service account can't create sheets, ClockMode is engine-only (not media filter), `applyTrackerUpdates.js` is dry-run by default.

## Canon facts (don't drift)

- **Mayor Avery Santana** — she/her. Locked canon S139.
- **OPP** = Oakland Progressive Party (NOT "People's Party")
- **CRC** = Civic Reform Coalition
- **IND** = Independent (Vega, Tran — NOT a bloc, they don't coordinate)
- **Intake system** — DONE S137b. Three feedback channels operational. Don't re-design.
- **Population** — ~1,366 total (Simulation_Ledger 836, Generic_Citizens 289, Cultural_Ledger 40, Business_Ledger 61, Faith_Organizations 16, Chicago_Citizens 124 — S212 live counts). Don't cite "675" or "761" — both stale.
- **Simulation subject = Oakland.** Oakland IS the world. Outside world exists in canon (Chicago — Mike Paulson's home + the Bulls; sports opponent cities) but real-world sector/geography claims don't import. Tech ecosystem is Oakland; dynasty sports is Oakland; civic action is Oakland. Don't reason from "tech is SF / finance is NYC / auto is Detroit" — those dismiss canon as implausible. Locked S170.
- **Operating loop — `GodWorld_My_Oakland.md` (read before any cycle run: `/city-hall` · `/sift` · `/write-edition`).** The sheets/citizens ARE the world; City Hall serves the sheets, editions serve the citizens — never the reverse. Engine signals are the story: errors = crises, spikes/drops = stories. Civic + media capture them so Mike can answer with real interventions that push compensating signals back into the ledger. Suppressing a recurring signal as noise, or narrating struggle the sheet denies, is the inversion this doc exists to stop.

## Editorial work (media terminal)

Pipeline v2 — 4 terminals (post-S211), story-driven, bounded traits. Skills are source of truth. Engine v3.3. Full: `docs/EDITION_PIPELINE.md`. Infrastructure: `docs/STACK.md`, `docs/OPERATIONS.md`, `docs/CLAUDE-MEM.md`.
