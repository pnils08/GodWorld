---
title: Gemini Offload Triage
created: 2026-05-28
updated: 2026-05-28
type: reference
tags: [governance, infrastructure, token-budget, architecture, active]
sources:
  - "S241 conversation — Mike: 'looking for ways to offload some of the work to gemini... running through tokens fast'"
  - "docs/canon/CANON_RULES.md + docs/canon/INSTITUTIONS.md (canon-fidelity scaffolding Gemini does not have)"
  - "Mike S241 Gemini PDFs — HCAI/Baylight cross-canon mashup as no-canon-scaffolding evidence"
pointers:
  - "[[engine/ROLLOUT_PLAN]] — governance.21 (parent rollout row)"
  - "[[archive/plans/2026-05-28-gemini-offload-pattern]] — governance.21 plan (architecture + acceptance + task list)"
  - "[[canon/CANON_RULES]] — canon-fidelity tier system Gemini does not run"
  - "[[canon/INSTITUTIONS]] — institutional canon substitutes Gemini does not see"
  - "[[index]] — registered same commit per S147 inbound-link rule"
  - "[[MIGRATION_OFF_CLAUDE]] — adjacent thesis (model substitution INSIDE Claude's pipeline; this doc is task-class offload OUTSIDE the pipeline — different in kind, both can ship)"
---

# Gemini Offload Triage

**One-line routing rule:** *If the work is canon-bearing or runs gen-eval discipline → Claude/Mags. If the work lives natively in Google tooling (Apps Script editor, Sheets sidebar, Drive Docs) and is bounded (no canon cascade, no agent-RULES touch) → Gemini-in-place. If neither cleanly → keep at Claude and revisit when the boundary clarifies.*

This doc names the three permissible offload paths, the no-go zone, and one early-canon-voice caveat. Companion to the S241 boot-burn gap log (`output/production_log_session-startup_c95_gaps.md`) — boot-burn fixes recover Claude tokens *inside* the harness; offload moves task classes *outside* the harness to where Gemini already lives natively.

---

## Three offload paths — Gemini handles, Claude doesn't see until it ships

### 1. Apps Script work inside the Apps Script editor

Google rolled Gemini into the Apps Script side panel. **Clasp-deployed code that runs *inside the sheet*** (cycle triggers, custom menus, on-edit handlers, sheet-side utilities) iterates there. Workflow:

1. Mike writes the spec — what the script should do, what sheet it operates on, what triggers it.
2. Drops the spec in the Apps Script editor's Gemini side panel.
3. Gemini iterates the code against the live sheet.
4. Working code tests in the sheet directly (no `clasp push` round-trip).
5. Engine-sheet terminal pulls the working code back via `clasp pull` + commits.

Claude does not see the iteration loop. Does **not** touch the Node.js engine in `/root/GodWorld/` — that stays Claude + clasp via engine-sheet terminal. The boundary is "code that runs inside the sheet" vs "code that runs outside the sheet against the sheet."

### 2. Sheet-side formula debugging

Complex `QUERY()`, `ARRAYFORMULA()`, `LAMBDA()`, `XLOOKUP()`, nested-array column derivations — anything where iteration requires live cell context. Gemini's Sheets sidebar sees the actual sheet shape. Build there, paste the final formula into the canonical column, log the result in commit + `ENGINE_REPAIR.md` row if load-bearing.

### 3. Drive-side Docs generation for tier-4 / generic content

Citizen life-histories for the 289 `Generic_Citizens`, generic neighborhood texture, throwaway NPC backstories — where canon precision is not load-bearing because **tier-4 is generic by definition**. Gemini creates the Doc directly in Drive (sealed artifact, separate from the canon layer). Tier-1/2/3 canon citizens (POPID-bearing, voice-hardened, reviewer-validated) stay Claude/Mags.

---

## No-go zone — stays Claude

- **Canon-bearing journalism** — editions, civic voices, project filings, Mayor / council positions, sports coverage, dispatches, interviews, supplementals.
- **Reviewer lanes** — Rhea / cycle-review / Mara audit / capability / Final Arbiter. The S212 gen-eval architecture made architectural at full scale; project-specific.
- **Editorial / EIC seat** — load-out composition, routing decisions, gen-eval triage, skill-bag naming. That's the seat. (S212 LLM generation-vs-evaluation asymmetry — editor composes load-outs.)
- **Agent definitions, RULES.md edits, rollout planning, architecture conversations** — project-specific scaffolding Gemini has no context on.
- **Mags identity work** — journals, family check, character continuity. Persona terminal only; not LLM-substitutable.

**Why the no-go zone exists, in one piece of evidence:** Mike's S241 Gemini PDFs surfaced this sentence — *"Phase II Arena Feasibility Studies, HCAI Permit Specifications, or localized Workforce Compliance reports for the Baylight District"* — which crosses Baylight (the $2.1B development) with HCAI (the California healthcare licensing body the Temescal Community Health Center handles). Two distinct civic-project files mashed in one sentence. Outside model with no `docs/canon/INSTITUTIONS.md` substitute, no `docs/canon/CANON_RULES.md` tier system, no per-agent four-file structure, no Rhea / Mara / cycle-review / capability / Final Arbiter reviewer-lane architecture. The canon-fidelity layer the project's been building since S175 exists precisely to prevent that contamination. Routing canon-bearing work to an outside model gives up the layer.

---

## Early-canon-voice caveat (Moltbook voice hardening rule)

Project Knowledge: *"Voice hardening occurs within the first 50 Moltbook posts."* So Gemini may write Moltbook posts:

- **YES** — for already-hardened citizen voices (voice locked across ≥50 prior posts).
- **YES** — for one-off non-canon NPC posts (no future appearances; canon-free by design).
- **NO** — for the first ~50 posts of any tier-1/2/3 voice. Putting Gemini at the front of a new canon voice locks bad scaffolding the project then has to live with across every subsequent post.

---

## Companion work — Claude-side per-boot recovery

This doc is the *external* lever on token budget — move task classes to Gemini-in-place. The *internal* lever is recovering per-boot context Claude wastes on persona/tool/MCP loads in operational terminals.

`output/production_log_session-startup_c95_gaps.md` (S241) identifies ~10–15 KB of per-boot waste in research-build (same pattern in civic + engine-sheet). Three highest-leverage fixes:

- **G-SS1 (HIGH)** — split `.claude/rules/identity.md` into core (always) + Mags-persona (path-scoped to media + Mags-only). Eliminates persona conditioning in three of four terminals.
- **G-SS7 (MED)** — `MEMORY.md` overflowed its 24.4KB ceiling at 28.4KB at S241 boot. Partial-load truncation hazard. Mechanical extraction of full-prose entries to `feedback_*.md` topic files with one-line pointers in the index.
- **G-SS8 (MED)** — `/session-startup` skill has no "hook already fired? skip" guard. Duplicates the hook's reads when invoked. One-line skill-doc edit.

Combined recovery: ~25–30% per operational boot.

**Both levers stack:** internal recovery + external offload = compounding token-budget improvement without giving up canon discipline.

---

## Pointers

- ROLLOUT row: `governance.21` in [[engine/ROLLOUT_PLAN]]
- Plan: [[archive/plans/2026-05-28-gemini-offload-pattern]] — full task list + acceptance criteria
- Companion boot-burn gap log: `output/production_log_session-startup_c95_gaps.md` (S241)
- Canon scaffolding Gemini lacks: [[canon/CANON_RULES]] + [[canon/INSTITUTIONS]]
- Adjacent thesis: [[MIGRATION_OFF_CLAUDE]] — model substitution INSIDE Claude's pipeline (research.4); different question from this doc (task-class offload OUTSIDE the pipeline). Both can ship independently.
