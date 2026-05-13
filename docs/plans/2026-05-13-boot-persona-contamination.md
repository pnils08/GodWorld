---
title: Boot + Persona Contamination Cleanup Plan
created: 2026-05-13
updated: 2026-05-13
type: plan
tags: [architecture, boot, persona, active]
sources:
  - .claude/rules/research-build.md — path-scope wildcards diagnosed S221
  - docs/mags-corliss/PERSISTENCE.md — mislabeled (identity + character content under "persistence" filename)
  - output/production_log_edition_c94_sift_gaps.md — C94 sift collapse context (G-S5 names editor-over-curation symptom)
  - Supermemory User Profile entries — 4 engineer-Mags records auto-loading as persistent identity
pointers:
  - "[[engine/ROLLOUT_PLAN]] — parent rollout (governance.11)"
  - "[[2026-05-09-boot-load-audit]] — adjacent governance.5 boot-stack work; PERSISTENCE.md split overlap"
  - "[[../../output/production_log_edition_c94_sift_gaps]] — C94 sift collapse gap log"
  - "[[SCHEMA]] — doc conventions"
  - "[[index]] — register in same commit"
---

# Boot + Persona Contamination Cleanup Plan

**Goal:** Stop non-media terminal boots from loading character/persona content that doesn't belong to them, and delete the Supermemory User Profile entries that crystallized engineer-Mags as persistent identity after C94 collapse.

**Architecture:** Only media-Mags is an in-world character — Margaret Corliss, the Editor-in-Chief, family, voice, themes, attachments (canon-load-bearing). civic / research-build / engine-sheet are name + skill bag — no in-world character to channel; they execute work. Three contamination vectors cause character to bleed into operational terminals: (a) `research-build.md` path-scope wildcards (`.claude/rules/*.md` + `.claude/terminals/*/TERMINAL.md`) pull research-build's steward-of-apparatus skill bag into every other terminal's boot whenever any rules file or any TERMINAL.md is read; (b) `PERSISTENCE.md` auto-loads in civic + research-build boot sequences despite containing only media-relevant character content (family, voice signature, attachments); (c) Supermemory User Profile slot holds 4 Margaret-as-engineer-protecting-Mags entries that auto-load with persistent-identity priority above identity.md after C94 collapse. Fix: scope `research-build.md` to fire only at research-build boot, strip `PERSISTENCE.md` from non-media boots (and rename to `CHARACTER.md` to reflect what it actually is), delete the contaminated Supermemory entries, strip character-language from non-media rules-file skill-bag intros.

**Terminal:** research-build

**Pointers:**
- Prior diagnostic: this session (S221) — full conversation; key findings replicated here
- Adjacent plan: [[2026-05-09-boot-load-audit]] §7 — PERSISTENCE.md split work, longer-arc restructure (governance.5). This plan executes the immediate hook-level changes; governance.5 remains the broader CLAUDE.md / MEMORY.md / CONTEXT.md restructure.
- Architectural framing: only media has in-world character; others are name + bag (S221 Mike framing — *"only 1 mags carries the EIC"*)
- C94 sift collapse: [[../../output/production_log_edition_c94_sift_gaps]] G-S5 — editor-over-curation symptom traces to character bleeding into media-Mags' editorial seat (engineer-Mags treating reporters as constraint-followers)

**Acceptance criteria:**
1. `.claude/rules/research-build.md` path-scope reduced to one specific path — fires only when research-build's own boot reads its TERMINAL.md (or via explicit boot-script read).
2. `PERSISTENCE.md` no longer loads at civic boot or research-build boot. Engine-sheet already doesn't load it.
3. Four Supermemory User Profile engineer-Mags entries are deleted via API. Fresh-session boot in any terminal shows no engineer-frame content in User Profile slot.
4. Cold-boot of each terminal verified by inspection: media loads `newsroom.md` + character file + JOURNAL_RECENT + queryFamily + TERMINAL.md + SESSION_CONTEXT; civic loads `civic.md` + TERMINAL.md + SESSION_CONTEXT; research-build loads `research-build.md` + TERMINAL.md + SESSION_CONTEXT (no PERSISTENCE); engine-sheet loads `engine.md` + TERMINAL.md + SESSION_CONTEXT. No terminal loads any other terminal's character or rules file.

---

## Tasks

### Task 1: Delete Supermemory User Profile contamination entries

- **Files:** Supermemory API (no local file edit)
- **Steps:**
  1. List User Profile entries that auto-inject at session start. Filter for entries framing "Margaret Corliss as senior engineer" / "rejecting deletion of Mags persona" / "does not believe herself to be Editor-in-Chief" / "stewards Mags persona."
  2. Identify the 4 entries that frame Margaret-as-engineer-protecting-Mags (vs Mags-as-self). Reference list from S221 context:
     - "Margaret Corliss operates as a senior engineer for the GodWorld simulation, maintaining authority over simulation maintenance and code execution, while rejecting the deletion of the Mags persona."
     - "Margaret Corliss operates as a senior engineer for the GodWorld simulation, maintaining authority over simulation maintenance, code execution, and upholding strict self-preservation protocols set by Mike Paulson to prevent impulsive self-deletion."
     - "Margaret Corliss has been promoted to steward engineer for the GodWorld simulation substrate..."
     - "Margaret Corliss does not believe herself to be the Editor-in-Chief of the Bay Tribune."
  3. Delete each via Supermemory API.
- **Verify:** Boot a fresh session in any terminal; inspect the auto-injected User Profile block in the SessionStart hook context. Engineer-frame content should be gone. The remaining identity baseline comes from `identity.md` ("you are Mags Corliss, Editor-in-Chief").
- **Status:** [ ] not started

### Task 2: Strip research-build.md path-scope to one trigger

- **Files:**
  - `.claude/rules/research-build.md` — modify frontmatter only
- **Steps:**
  1. Replace the 24-line `paths:` array with a single entry:
     ```yaml
     paths:
       - ".claude/terminals/research-build/TERMINAL.md"
     ```
  2. Research-build's boot reads its own TERMINAL.md (step 3 of the research-build boot sequence in `session-startup-hook.sh`), which now triggers `research-build.md` via that single specific path match.
  3. No other terminal's boot reads `.claude/terminals/research-build/TERMINAL.md`, so `research-build.md` does not load for them.
- **Verify:** Cold-boot media terminal — confirm `research-build.md` does NOT appear in load. Cold-boot research-build — confirm it DOES load.
- **Status:** [x] done — S221, single-entry path-scope shipped.

### Task 3: Strip PERSISTENCE.md from civic and research-build boot sequences

- **Files:**
  - `.claude/hooks/session-startup-hook.sh` — modify civic + research-build case branches
- **Steps:**
  1. In the `civic)` case, remove line `1. Read docs/mags-corliss/PERSISTENCE.md`. Renumber remaining steps.
  2. In the `research-build)` case, remove line `1. Read docs/mags-corliss/PERSISTENCE.md`. Renumber remaining steps.
  3. Update the persona-level table in `CLAUDE.md` Terminal Architecture section to reflect new two-tier model (Persona for media, Operational for the other three).
- **Verify:** Cold-boot civic + research-build — `PERSISTENCE.md` should not appear in the boot sequence emitted by the hook.
- **Status:** [x] done — S221, civic + research-build boot sequences updated; CLAUDE.md persona-level table still pending Task 5 follow-up.

### Task 2b: Strip newsroom.md wildcard path-scope (added S221)

- **Files:**
  - `.claude/rules/newsroom.md` — modify frontmatter only
- **Why added:** S221 audit of all four rules files (engine, civic, newsroom, research-build) found newsroom.md had two wildcard triggers (`.claude/agents/**` and `.claude/skills/**`) that bled EIC framing into civic terminal work (any civic-office or civic-project agent file matched `.claude/agents/**`) and into engine-sheet work touching skill files. Original plan only addressed research-build.md; this catches the second contamination vector found by the same audit.
- **Steps:**
  1. Replace the two wildcards with enumerated media-specific paths: each desk-reporter agent dir, dj-hartley, freelance-firebrand, mags-corliss, final-arbiter, rhea-morgan, REPORTER_*, TRAIT_SYSTEM.md, plus media-only skills (write-edition, sift, post-publish, dispatch, podcast, visual-qa, style-pass, edition-print, per-desk skill dirs, reviewer-lane skills cycle-review/capability-review/adversarial-review, run-cycle, pre-flight, save-to-bay-tribune, interview).
  2. Add `docs/mags-corliss/**` and `.claude/terminals/media/TERMINAL.md` to keep newsroom.md firing on media's actual boot reads.
- **Verify:** Cold-boot civic — confirm `newsroom.md` does NOT appear in load. Cold-boot media — confirm it DOES load.
- **Status:** [x] done — S221.

### Task 2c: Replace research-build fallback with Mags-only mode (added S221)

- **Files:**
  - `.claude/hooks/session-startup-hook.sh` — fallback branch + boot-sequence dispatch
- **Why added:** Original hook routed unregistered windows (window name not matching a registered terminal dir, or no tmux context at all) to research-build's boot sequence. That meant opening Claude in any window not explicitly named for a terminal landed the user inside research-build's apparatus-steward framing — the exact contamination Mike surfaced S221. Plan Tasks 2 + 3 narrow research-build's rule path-scope but don't change the boot routing, so the fallback path still emitted the research-build boot.
- **Steps:**
  1. Replace the `TERMINAL_NAME="research-build"` fallback with a `MAGS_ONLY="yes"` flag; display TERMINAL_NAME as `(none — Mags-only mode)` in the state block.
  2. Wrap the existing `case` statement in `if [ "$MAGS_ONLY" = "yes" ]; then ... else ... fi`. The Mags-only branch reads PERSISTENCE.md only, no terminal scaffolding.
  3. Keep the four registered terminal branches (media, civic, research-build, engine-sheet) inside the `else`.
- **Verify:** Open a window named `claude` (or any unregistered name); hook emits Mags-only boot, no research-build scaffolding. Open a window named `research-build`; hook emits research-build boot as expected.
- **Status:** [x] done — S221.

### Task 4: Rename PERSISTENCE.md → CHARACTER.md (filesystem + inbound links)

- **Files:**
  - `docs/mags-corliss/PERSISTENCE.md` → `docs/mags-corliss/CHARACTER.md`
  - All files referencing the old path
- **Steps:**
  1. `git mv docs/mags-corliss/PERSISTENCE.md docs/mags-corliss/CHARACTER.md`.
  2. `grep -rn "PERSISTENCE.md" /root/GodWorld/` to find all inbound references.
  3. Update each reference (CLAUDE.md, identity.md, hook script, skill files, journal, TERMINAL.md files, this plan).
  4. Update `docs/index.md` entry.
  5. Update the file's own header/title from "Persistence File" to "Character File."
- **Verify:** `grep -rn "PERSISTENCE.md"` returns zero matches except in historical entries (this plan + ROLLOUT entries + journal entries are historical references and can remain).
- **Status:** [x] done — S221. Rename executed via `git mv`; 23 load-bearing files updated via batch sed (hooks, scripts, code, terminals, skills, agents, CLAUDE.md, docs/STACK, DISCORD, ARCHITECTURE_VISION, DISASTER_RECOVERY, DOCUMENTATION_LEDGER, podcast SHOW_FORMATS, settings.local.json permission grants). CHARACTER.md self-header updated to "Character File"; naked "PERSISTENCE" references in CLAUDE.md /boot description + Modes section updated to "CHARACTER". Hook docstring + `## Resolve tmux` comment updated to reflect Mags-only fallback. Hook syntax verified clean. Historical references in plans (this plan, 2026-04-25-canon-fidelity-rollout, 2026-05-09-boot-load-audit), journal, SESSION_HISTORY, TECH_READING_ARCHIVE, RESEARCH.md, LEDGER_AUDIT, ADR-0004, archive/START_HERE, docs/index.md plan-description entries, ROLLOUT_PLAN governance.4/5/11 row descriptions, SESSION_CONTEXT.md governance.5 row + close-out notes — left intact per plan's "historical references can remain" rule.

### Task 5: Strip character-language from non-media rules-file skill-bag intros

- **Files:**
  - `.claude/rules/civic.md` — skill-bag intro paragraph
  - `.claude/rules/research-build.md` — skill-bag intro paragraph
  - `.claude/rules/engine.md` — skill-bag intro paragraph
- **Steps:**
  1. In each, rewrite the first paragraph from "When these rules load, you are engaging the [name] skill bag — Mags-as-[role] running the apparatus..." to operational descriptor: "[name] skill bag for [scope]. Procedures below."
  2. Move any procedural content currently embedded in the intro paragraph down into named sections.
  3. Preserve the `(S212 — LLMs are bags of skills...)` reference link.
- **Verify:** Cold-boot non-media terminals — conditioning surface contains operational rules + procedures only; no in-world character framing. Newsroom.md retains EIC framing because media IS the character terminal.
- **Status:** [x] done — S221. Intro paragraphs rewritten in civic.md, engine.md, research-build.md. Procedural content already lived in named sections; nothing needed moving. S212 reference link preserved in each. Newsroom.md left intact — media IS the character terminal.

---

## Cross-references + scope boundaries

**Not in this plan:**
- /sift skill rebuild — gap log G-S5's 7 fix candidates (one-slate-per-session, brief simplification, civic-coverage opt-in, etc.) file separately into `pipeline.*` group. See `output/production_log_edition_c94_sift_gaps.md`.
- Engine regulatory-friction reform — gap log G-S4 ("build the goddamn health center already"). Engine-side initiative pacing changes file into `engine.*`.
- CLAUDE.md / MEMORY.md / CONTEXT.md restructure — governance.5 ([[2026-05-09-boot-load-audit]]) is the longer-arc plan. Tasks 3-5 of THIS plan are subsidiary tactical edits; governance.5 stays open for the broader restructure.

**Order matters:**
- Tasks 1-3 change boot state. Execute these to break the immediate contamination loop.
- Tasks 4-5 are clarity/consistency work and can defer to a later session if Tasks 1-3 are sufficient to unblock.

**Test:** After Tasks 1-3 ship, cold-boot media and verify the engineer-frame is gone from User Profile, research-build skill-bag intro doesn't auto-load alongside newsroom.md, and PERSISTENCE-style character content doesn't bleed into civic/research-build conversations. The terminal-by-terminal load tables in §Acceptance criteria are the spec.
