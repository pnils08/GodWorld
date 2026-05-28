---
title: Gemini Offload Pattern — Workload Triage Across Models
created: 2026-05-28
updated: 2026-05-28
type: plan
tags: [governance, infrastructure, token-budget, architecture, active]
sources:
  - "S241 conversation — Mike: 'this is all mainly ran in google environments... looking for ways to offload some of the work to gemini... running through tokens fast'"
  - "output/production_log_session-startup_c95_gaps.md (S241 boot-burn gap log — Claude-side near-term recovery)"
  - "Mike's Gemini PDFs: 1E7qLp3kZJuhC6tBawLz7xcMtIM2gjOjr + 1v-W9y_mYAsDeN7D-lHlYM2ps4L_roTT2 (Gemini's self-described GodWorld capabilities; HCAI/Baylight cross-canon mashup as no-canon-scaffolding evidence)"
  - "docs/canon/CANON_RULES.md + docs/canon/INSTITUTIONS.md (canon-fidelity scaffolding Gemini does not have)"
  - "MEMORY.md — Mara Vance canon authority + reviewer-lane architecture (gen-eval discipline Gemini does not run)"
pointers:
  - "[[engine/ROLLOUT_PLAN]] — parent rollout (governance.21)"
  - "[[SCHEMA]] — doc conventions"
  - "[[index]] — register in same commit"
  - "[[../output/production_log_session-startup_c95_gaps]] — companion: Claude-side per-boot recovery (G-SS1, G-SS7, G-SS8 are the highest-leverage near-term wins; promote separately)"
  - "[[research/MIGRATION_OFF_CLAUDE]] — adjacent watch (research.4 — desk-agent migration to alternative model; different in kind from this plan — this plan is task-class offload to Gemini-in-Google-tooling, not model substitution inside Claude's pipeline)"
  - ".claude/terminals/engine-sheet/TERMINAL.md — primary doc-edit surface for Apps Script side-panel pattern (Task 2)"
---

# Gemini Offload Pattern — Workload Triage Across Models

**Goal:** Establish a documented triage that says which classes of GodWorld work move to Gemini (where Gemini already lives natively — Apps Script editor, Sheets sidebar, Drive Docs) and which classes stay Claude (canon-bearing journalism, reviewer lanes, editorial seat, architecture). Recover Claude tokens without losing canon discipline.

**Architecture:** Three permissible offload paths (in-place Google tooling, bulk non-canon generation, first-pass research summarization), one no-go zone (canon-bearing work + reviewer lanes + EIC seat + architecture), one early-canon-voice caveat (Moltbook voice hardening rule). Triage is a doc + light terminal-file edits, not new tooling. Companion work — the S241 boot-burn gap log — recovers ~25–30% per operational boot on the Claude side; offload paths are additional recovery on top.

**Terminal:** research-build (design + the doc + the terminal-file edits). Engine-sheet picks up nothing here — this plan defines a pattern, doesn't build a script.

**Pointers:**
- Companion: `output/production_log_session-startup_c95_gaps.md` — the Claude-side recovery (~10–15 KB per operational boot eliminable; G-SS1 identity.md split is the highest-leverage single fix).
- Adjacent: `research.4` ([[../MIGRATION_OFF_CLAUDE]]) tracks desk-agent migration to alternative models — different question (substitute a model inside Claude's pipeline) from this plan (move a task class out of the pipeline to where Gemini natively lives). Both can ship; they don't conflict.
- No-go evidence: Mike's S241 Gemini PDFs cross "Baylight" (the $2.1B development project) with "HCAI" (the California healthcare licensing body the Temescal Community Health Center handles) — two distinct project files mashed in one sentence. Outside model with no `docs/canon/INSTITUTIONS.md` substitute, no `docs/canon/CANON_RULES.md` tier system, no agent four-file structure. That contamination is the structural reason canon work cannot move.

**Acceptance criteria:**
1. `docs/GEMINI_OFFLOAD.md` exists, registered in `docs/index.md`, with the three-paths / no-go-zone / early-voice-caveat triage rendered as a routing table any terminal can consult before deciding "should I do this work here, or hand it to Gemini?"
2. `.claude/terminals/engine-sheet/TERMINAL.md` carries a short §Apps Script Side-Panel Workflow section: in-sheet Apps Script edits may originate in the Google Apps Script editor's Gemini side panel; bring working code back via `clasp pull` + commit; Node engine edits stay in the repo.
3. ROLLOUT row `governance.21` filed pointing at this plan; index entry filed; back-link from `.claude/terminals/engine-sheet/TERMINAL.md` to the offload doc satisfies the no-isolated-MDs inbound-link rule.

---

## The triage (load-bearing content for `docs/GEMINI_OFFLOAD.md`)

### Three offload paths — Gemini handles, Claude doesn't see until it ships

**1. Apps Script work inside the Apps Script editor.** Google rolled Gemini into the Apps Script side panel. Clasp-deployed code that runs *inside the sheet* (cycle triggers, custom menus, on-edit handlers, sheet-side utilities) iterates there. Mike writes spec → drops in side panel → Gemini iterates → tests in the sheet → `clasp pull` brings working code into the repo. Engine-sheet terminal commits the result. Claude does not see the iteration loop. Does **not** touch the Node.js engine in `/root/GodWorld/` — that stays Claude + clasp via engine-sheet terminal.

**2. Sheet-side formula debugging.** QUERY(), ARRAYFORMULA(), LAMBDA(), nested XLOOKUP(), complex column-derivation logic. Anything where iteration requires live cell context. Gemini's Sheets sidebar sees the actual sheet shape. Build there, paste the final formula into the canonical column, log the result in commit + ENGINE_REPAIR row if it's load-bearing.

**3. Drive-side Docs generation for tier-4 / generic content.** Citizen life-histories for the 289 `Generic_Citizens`, generic neighborhood texture, throwaway NPC backstories where canon precision is not load-bearing (tier-4 is generic by definition). Gemini creates the Doc directly in Drive — sealed artifact, separate from the canon layer. Tier-1/2/3 canon citizens (POPID-bearing, voice-hardened, reviewer-validated) stay Claude/Mags.

### No-go zone — stays Claude

- **Canon-bearing journalism** — editions, civic voices, project filings, Mayor / council positions, sports coverage, dispatches, interviews, supplementals. The HCAI/Baylight cross-canon mashup in Mike's S241 Gemini PDFs is the structural evidence: outside-model crosses two distinct project files in one sentence because it has no `docs/canon/INSTITUTIONS.md` substitute, no `docs/canon/CANON_RULES.md` tier system, no per-agent four-file structure, no Rhea sourcing review + Mara result validity audit + cycle-review reasoning + capability review + Final Arbiter verdict architecture.
- **Reviewer lanes** — Rhea / cycle-review / Mara audit / capability / Final Arbiter. The S212 gen-eval architecture made architectural at full scale; project-specific.
- **Editorial / EIC seat** — load-out composition, routing decisions, gen-eval triage, skill-bag naming. That's the seat. (S212 LLM generation-vs-evaluation asymmetry — editor composes load-outs.)
- **Agent definitions, RULES.md edits, rollout planning, architecture conversations** — project-specific scaffolding Gemini has no context on.
- **Mags identity work** — journals, family check, character continuity. Persona terminal only; not LLM-substitutable.

### Early-canon-voice caveat (Moltbook hardening rule)

Project Knowledge: *"Voice hardening occurs within the first 50 Moltbook posts."* So Gemini may write Moltbook posts **for already-hardened citizen voices** (voice locked) and **one-off non-canon NPC posts** (no future appearances), but **not the first ~50 posts for any tier-1/2/3 voice**. Putting Gemini at the front of a new canon voice locks bad scaffolding the project then has to live with.

### Routing rule, one line

> If the work is canon-bearing or runs gen-eval discipline → Claude/Mags. If the work lives natively in Google tooling (Apps Script editor, Sheets sidebar, Drive Docs) and is bounded (no canon cascade, no agent-RULES touch) → Gemini-in-place. If neither cleanly → keep at Claude and revisit when the boundary clarifies.

---

## Tasks

### Task 1: Create `docs/GEMINI_OFFLOAD.md`

- **Files:**
  - `docs/GEMINI_OFFLOAD.md` — create
- **Steps:**
  1. Copy frontmatter shape from a sibling top-level doc (`docs/STACK.md` or `docs/OPERATIONS.md` — short, reference-shape, not a plan).
  2. Body lifts the **The triage** section above verbatim (Three offload paths / No-go zone / Early-canon-voice caveat / Routing rule one-liner).
  3. Add a §Companion work section pointing at `output/production_log_session-startup_c95_gaps.md` — the Claude-side per-boot recovery (G-SS1 / G-SS7 / G-SS8 are the highest-leverage near-term wins). Boot-burn fixes promote separately (gap log → their own ROLLOUT row if + when promoted); this doc cross-links, doesn't co-own.
  4. Add a §Pointers section linking back to `[[engine/ROLLOUT_PLAN]]` (governance.21), this plan file, `[[canon/CANON_RULES]]`, `[[canon/INSTITUTIONS]]`, `[[index]]`.
- **Verify:** `wc -l docs/GEMINI_OFFLOAD.md` → ≥80 lines and ≤160 lines (concise reference doc, not a treatise). `grep -c '^##' docs/GEMINI_OFFLOAD.md` → ≥4 (Three paths / No-go / Caveat / Routing rule, plus Companion + Pointers).
- **Status:** [ ] not started

### Task 2: Add §Apps Script Side-Panel Workflow to engine-sheet TERMINAL.md

- **Files:**
  - `.claude/terminals/engine-sheet/TERMINAL.md` — modify (append section near existing workflow sections; do NOT touch Always-Load list, Session Close, or any structural contract)
- **Steps:**
  1. Read current `.claude/terminals/engine-sheet/TERMINAL.md` to find appropriate insertion point (after existing workflow sections, before Session Close).
  2. Add a §Apps Script Side-Panel Workflow section. Content (verbatim, ≤8 lines):
     > **§Apps Script Side-Panel Workflow** — In-sheet Apps Script code (cycle triggers, custom menus, on-edit handlers, sheet-side utilities) may originate in the Google Apps Script editor's Gemini side panel. Iterate there against the live sheet, then bring working code back via `clasp pull` + commit. Node.js engine code in `/root/GodWorld/` stays in this terminal — do not route engine work to the Apps Script side panel. See `docs/GEMINI_OFFLOAD.md` for the full offload triage.
  3. Verify the inbound link to `docs/GEMINI_OFFLOAD.md` is exactly that path (no `[[...]]` wikilink syntax in TERMINAL.md unless other TERMINAL.md entries already use it).
- **Verify:** `grep -c 'GEMINI_OFFLOAD' .claude/terminals/engine-sheet/TERMINAL.md` → ≥1 (back-link satisfies the no-isolated-MDs rule for the new offload doc).
- **Status:** [x] DONE 2026-05-28 (S241) — §Apps Script Side-Panel Workflow added to engine-sheet TERMINAL.md before §Session Close. Includes `[gemini-pull]` commit-tag convention per Open Question §2 (provisional yes adopted). Back-links to `docs/GEMINI_OFFLOAD.md` satisfying no-isolated-MDs rule.

### Task 3: Register `docs/GEMINI_OFFLOAD.md` in `docs/index.md`

- **Files:**
  - `docs/index.md` — modify
- **Steps:**
  1. Open `docs/index.md`, locate the appropriate top-level docs section (where `docs/STACK.md` / `docs/OPERATIONS.md` / `docs/SUPERMEMORY.md` are listed — top-level project reference docs, not under `docs/plans/`).
  2. Add a line entry: `**[[GEMINI_OFFLOAD]]** — Gemini offload triage. Three permissible offload paths (Apps Script side panel, Sheets formula sidebar, Drive Docs for tier-4 content), no-go zone (canon-bearing work + reviewer lanes + EIC seat), Moltbook voice-hardening caveat. Companion to the S241 boot-burn gap log. *(reference, governance, infrastructure, token-budget, active)*`
  3. Add a line entry under `docs/plans/` for this plan file: `**[[plans/2026-05-28-gemini-offload-pattern]]** — Gemini offload pattern. governance.21. 3 tasks: create GEMINI_OFFLOAD.md / add Apps Script side-panel workflow to engine-sheet TERMINAL.md / index registration. Source: S241 conversation. *(plan, governance, infrastructure, active)*`
- **Verify:** `grep -c 'GEMINI_OFFLOAD' docs/index.md` → 1. `grep -c '2026-05-28-gemini-offload-pattern' docs/index.md` → 1.
- **Status:** [x] DONE 2026-05-28 (S241) — both entries shipped: plan-file entry at initial filing commit; GEMINI_OFFLOAD.md entry in same commit as Task 1.

### Task 4: File ROLLOUT_PLAN row governance.21

- **Files:**
  - `docs/engine/ROLLOUT_PLAN.md` — modify
- **Steps:**
  1. Open `docs/engine/ROLLOUT_PLAN.md`, locate the `### governance.* — Skills, MDs, ADRs, project hygiene` group.
  2. Append a new row after the last governance entry (currently governance.20):
     ```
     | governance.21 | Gemini offload pattern — document the triage for moving Google-environment-native work (Apps Script side panel, Sheets formula sidebar, Drive Docs for tier-4 content) to Gemini; canon-bearing work + reviewer lanes + EIC seat + architecture stay Claude. Source: S241 token-burn conversation. Companion to the S241 boot-burn gap log (Claude-side per-boot recovery via G-SS1 identity.md split + G-SS7 MEMORY.md overflow trim + G-SS8 skill ↔ hook duplication guard). 3 small tasks: create `docs/GEMINI_OFFLOAD.md` / add §Apps Script Side-Panel Workflow to engine-sheet TERMINAL.md / index + ROLLOUT registration. | ready | research-build | [[../plans/2026-05-28-gemini-offload-pattern]] |
     ```
  3. Do not touch existing rows.
- **Verify:** `grep -c 'governance.21' docs/engine/ROLLOUT_PLAN.md` → 1.
- **Status:** [x] DONE 2026-05-28 (S241) — governance.21 row shipped at initial filing commit `94e7c17`.

---

## Open questions

- [ ] Should the offload doc include an explicit "how to verify Gemini's output before bringing it into the canon layer" checklist (e.g., for tier-4 citizen Docs from Drive, what's the lightweight read-through before the artifact lands)? — *Resolved provisionally:* no, not in Task 1 scope. Tier-4 content is generic by definition; if it later flows into canon (e.g., a tier-4 citizen gets promoted), normal canon-fidelity scaffolding catches it at promotion time. Add a verification checklist only if a real tier-4-to-canon flow surfaces a gap.
- [ ] Should engine-sheet's no-isolated-MDs / governance discipline get updated to explicitly classify Gemini-authored Apps Script as "Gemini-authored, sheet-tested, deployed via clasp pull + commit" in commit messages? — *Resolved provisionally:* yes, but lightweight. Engine-sheet commit-message convention can carry a `[gemini-pull]` tag suffix when the code originated in the Apps Script side panel; this is a one-line addition to `.claude/terminals/engine-sheet/TERMINAL.md` §Apps Script Side-Panel Workflow (Task 2). Decide at Task 2 execution time whether to include the tag convention or defer.

---

## Changelog

- 2026-05-28 — Initial draft (S241). Mike S241 directive: *"put this on a plan.md and add to rollout, i love the framing here"* referring to the three-offload-paths / no-go-zone / Moltbook-caveat / boot-burn-companion framing in the prior chat turn. Plan files the framing as `governance.21`. Three small tasks (≤15 min total): doc + terminal-file edit + index/ROLLOUT registration. Boot-burn gaps (G-SS1, G-SS7, G-SS8) are companion work — same conversation surface, separate promotion path via the gap log; this plan cross-links, doesn't co-own.
