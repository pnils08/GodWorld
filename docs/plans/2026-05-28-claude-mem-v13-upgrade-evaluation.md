---
title: claude-mem v10.5.2 → v13.x Upgrade Evaluation
created: 2026-05-28
updated: 2026-05-28
type: plan
tags: [governance, infrastructure, memory, claude-mem, active]
sources:
  - "GitHub: https://github.com/thedotmack/claude-mem/releases (v13.0.0–v13.3.0 fetched S241)"
  - "Installed: /root/.claude/plugins/cache/thedotmack/claude-mem/10.5.2/package.json (3-major-version gap behind latest)"
  - "S241 conversation — Mike: 'pull all useful tools onto the rollout for future session builds, if something is crucial for us do it now'"
pointers:
  - "[[engine/ROLLOUT_PLAN]] — parent rollout (governance.23)"
  - "[[SCHEMA]] — doc conventions"
  - "[[index]] — register in same commit"
  - "[[../CLAUDE-MEM]] — claude-mem usage reference doc; will need rewrite after upgrade lands"
  - "[[2026-05-28-gemini-offload-pattern]] — sibling S241 plan, governance.21 — Task 3 below (multi-provider eval) cross-links into Gemini-offload pathway"
  - "[[2026-05-28-claude-code-2-1-149-153-feature-adoption]] — sibling S241 plan, governance.22"
---

# claude-mem v10.5.2 → v13.x Upgrade Evaluation

**Goal:** Evaluate whether to upgrade claude-mem from v10.5.2 (installed) to v13.3.0 (current). Surface the genuinely useful new surface (two skills + multi-provider support), the deferrable surface (server-beta runtime), and the breaking-change risk across v11/v12/v13 majors.

**Architecture:** Three-major-version gap means breaking-change scan is the gate. Once the breaking surface is mapped, two new skills (`oh-my-issues` root-cause clustering + `design-is` Dieter Rams audit) get fit-check evaluations against project use cases (gap-log triage + edition-print PDF QA). Multi-provider support (v13.1.0) is a separate evaluation that cross-links into governance.21 (Gemini offload — claude-mem could route its own generation through Gemini, invisible offload).

**Terminal:** research-build (evaluation + decision + plan-doc updates). Engine-sheet picks up the actual upgrade execution if/when scoped (npm install + smoke test + observation-format-migration check).

**Pointers:**
- Companion sibling plans (S241): [[2026-05-28-gemini-offload-pattern]] (governance.21 — Gemini offload triage; Task 3 below feeds into the same offload thesis from a different angle); [[2026-05-28-claude-code-2-1-149-153-feature-adoption]] (governance.22 — Claude Code feature adoption).
- claude-mem reference doc: [[../CLAUDE-MEM]] — current state pre-upgrade; will need rewrite once upgrade decision lands.
- Adjacent investigation: project's gap-log triage discipline + ENGINE_REPAIR row tracking + ROLLOUT-PLAN-as-living-doc — these are the surfaces `oh-my-issues` (Task 2a) would cluster across.

**Acceptance criteria:**
1. Each of the three tasks below outputs a clear decision: UPGRADE / DEFER / SKIP, with reasoning.
2. If UPGRADE decision lands on any task, that decision either ships its execution (if small) or files a follow-up engine-sheet ROLLOUT row.
3. No claude-mem operation regressions during evaluation — current v10.5.2 stays installed until execution.

---

## Survey findings (S241 fetch, pre-evaluation)

**Version gap:** v10.5.2 → v13.3.0 = three majors (v11, v12, v13 spans not yet read).

**Useful surface in v13.3.0 (May 21, latest):**
- `oh-my-issues` skill — root-cause issue clustering. Project has 100+ gap-log entries across cycles + dozens of ENGINE_REPAIR rows + dozens of ROLLOUT items. Clustering pass could surface root-cause patterns (e.g., "N gap-log entries trace to identity.md always-load") = corroborating evidence from a different angle for S241 boot-burn gap log G-SS1.
- `design-is` skill — audits designs against Dieter Rams principles. Possibly useful for `/edition-print` PDF QA layer. Project has `photoQA.js` for image checks; whole-edition visual-design QA is a gap.

**Deferrable surface in v13.x:**
- v13.0.0 — server-beta runtime (Postgres + BullMQ + Docker, opt-in). Likely overkill for single-user GodWorld; Supermemory already covers centralized memory. Defer until concrete need.
- v13.1.0 — three-provider support (Anthropic + OpenAI + Google). Cross-links into Gemini offload (governance.21) — claude-mem could route its own memory generation through Gemini, invisible offload. Worth evaluation.
- v13.0.0 — Apache-2.0 relicense, REST API (/v1), outbox pattern for transactional pipelines. Defensive infrastructure; defer unless concrete need.

**Skip surface:**
- v13.2.0 — `wowerpoint` skill (kawaii NotebookLM slide-deck PDFs). Tone-mismatch with Bay Tribune; no slide-deck use case in GodWorld.
- v13.3.0 — `weekly-digests` skill (ISO-week serial project digests). Project cadence is cycles + sessions, not calendar weeks. Project's existing session-end + cycle-close rhythms already cover digest needs.

**Breaking-change risk (unread, gates everything):**
- v11.x changelog — unread
- v12.x changelog — unread
- v13.0.0 changelog — Apache-2.0 relicense + server-beta opt-in + REST API; likely no breaking changes for local-only usage but needs confirmation.

---

## Tasks

### Task 1: Breaking-change scan across v11.x + v12.x + v13.0.0

- **Cost-of-delay:** Gates every other task. Until breaking-change risk is mapped, no upgrade decision is possible.
- **Files:**
  - (research only — no edits this task; output is a note in this plan's body or an addendum file)
- **Steps:**
  1. WebFetch claude-mem release notes for v11.0.0 + each v11.x major (or aggregate v11.x changelog if one exists). Look for: schema migrations on the observation store, Chroma/SQLite format changes, MCP tool name/signature changes, breaking config-file changes, removed CLI commands, removed slash-skills.
  2. Same for v12.x.
  3. Same for v13.0.0 specifically (Apache-2.0 relicense + server-beta launch — confirm local-only path still supported unchanged).
  4. Output: §Breaking-change scan section appended to this plan with per-major findings table (version / breaking item / migration cost / GodWorld exposure).
  5. Verdict line: SAFE-TO-UPGRADE (no migration required) / NEEDS-MIGRATION (one or more steps required, list them) / BREAKING (regression risk too high; pin v10.5.2 and skip).
- **Verify:** §Breaking-change scan section in this plan with verdict line.
- **Status:** [ ] not started — pure investigation, 30-45 min WebFetch + read

### Task 2a: `oh-my-issues` fit-check against project gap-log / ENGINE_REPAIR / ROLLOUT triage

- **Cost-of-delay:** Low absolute; high potential value if it surfaces root-cause patterns the manual triage has missed.
- **Gated on:** Task 1 (need to know whether upgrade is even safe).
- **Files:**
  - (evaluation only this task; output is a note in this plan's body or a follow-up plan if buildable)
- **Steps:**
  1. WebFetch the `oh-my-issues` skill source (likely `.claude/skills/oh-my-issues/SKILL.md` in claude-mem repo) + any usage examples in the changelog.
  2. Determine input shape: does it cluster from claude-mem observations? From arbitrary text input? From a file?
  3. If observation-based: the project has thousands of claude-mem observations across cycles; clustering could surface patterns. If text-input-based: feeding it gap logs + ENGINE_REPAIR rows + ROLLOUT entries could surface cross-cutting root causes.
  4. Fit-check verdict: USE-AS-IS (the skill applies directly to project gap-log triage) / ADAPT (the skill needs project-specific shaping in a wrapper) / SKIP (the skill assumes inputs the project doesn't have).
- **Verify:** Fit-check verdict documented in this plan's §`oh-my-issues` verdict section.
- **Status:** [ ] not started — gated on Task 1

### Task 2b: `design-is` fit-check against `/edition-print` PDF QA layer

- **Cost-of-delay:** Low absolute; medium potential value (whole-edition visual QA is a known gap; current PDF QA is photo-only via `photoQA.js`).
- **Gated on:** Task 1.
- **Files:**
  - (evaluation only this task; output is a note here or a follow-up plan if buildable)
- **Steps:**
  1. WebFetch the `design-is` skill source + any usage examples.
  2. Determine input shape: does it audit a rendered PDF? A design spec? A screenshot? Static design tokens?
  3. Compare against project's PDF-rendering pipeline (`generate-edition-pdf.js`) and current QA gates (`photoQA.js` for images, `validateEdition.js` for text).
  4. Fit-check verdict: USE-AS-IS / ADAPT / SKIP.
- **Verify:** Fit-check verdict documented in this plan's §`design-is` verdict section.
- **Status:** [ ] not started — gated on Task 1

### Task 3: Multi-provider support (v13.1.0) evaluation — claude-mem generation via Gemini

- **Cost-of-delay:** Low absolute; high potential value as invisible offload (cross-links into governance.21 Gemini-offload thesis).
- **Gated on:** Task 1.
- **Files:**
  - (evaluation only this task)
- **Steps:**
  1. WebFetch claude-mem v13.1.0 release notes + any docs on provider selection.
  2. Determine: (a) which claude-mem operations are "AI provider"-backed (observation summarization? embedding? clustering?); (b) is the provider selectable per-operation or global; (c) what's the API-key requirement; (d) does Google = Gemini, and which Gemini model.
  3. If observation summarization is provider-selectable: routing it through Gemini = Claude tokens saved on every session-end claude-mem write. Direct fit with governance.21 Gemini-offload thesis.
  4. Fit-check verdict: ADOPT (route to Gemini for specific ops) / DEFER (provider abstraction in place, but Anthropic-default is fine) / SKIP (multi-provider not actually about offload).
- **Verify:** Fit-check verdict documented in this plan's §Multi-provider verdict section. If ADOPT, file a follow-up plan or piggyback into governance.21 Task 1.
- **Status:** [ ] not started — gated on Task 1

### Task 4 (conditional): Execute upgrade

- **Cost-of-delay:** Zero until Tasks 1–3 produce a UPGRADE verdict on at least one item with safe-or-tractable breaking-change risk.
- **Gated on:** Task 1 verdict + at least one ADOPT verdict from Tasks 2a/2b/3.
- **Files:**
  - `/root/.claude/plugins/cache/thedotmack/claude-mem/` — upgrade target (engine-sheet executes; not research-build)
  - `docs/CLAUDE-MEM.md` — rewrite post-upgrade
- **Steps:**
  1. Engine-sheet picks up: `claude-mem` plugin upgrade via standard Claude Code plugin install path (research-build does NOT execute plugin upgrades — engine-sheet's scope per `.claude/terminals/engine-sheet/TERMINAL.md`).
  2. Smoke test: `/mem-search "boot-burn"` should return existing observations (no index regression).
  3. Run any v11→v12→v13 migration scripts surfaced by Task 1.
  4. Update `docs/CLAUDE-MEM.md` to reflect post-upgrade state (new skills, new tools, multi-provider config if adopted).
  5. File closing changelog entry on this plan.
- **Verify:** `claude-mem --version` → 13.3.0 (or whichever target version). Smoke test passes. `docs/CLAUDE-MEM.md` updated.
- **Status:** [ ] not started — conditional on Tasks 1–3

---

## Open questions

- [ ] Should `oh-my-issues` (if Task 2a verdict is ADOPT) be wired into a regular `/cycle-close` / `/session-end` step (auto-cluster gap-log entries from the closing cycle), or remain on-demand (Mike runs it during triage sessions)? — *Defer to Task 2a verdict.* Auto-wiring is the higher-value pattern but requires the skill's output to be deterministic + stable across runs; on-demand is safer for first adoption.
- [ ] If Task 3 verdict is ADOPT (claude-mem routes summarization through Gemini), does that count as Task 1 of governance.21 (Gemini offload)? — *Provisional yes.* Cross-link into governance.21 plan's task list as Path 4 (in addition to the existing three offload paths). Path 4 = invisible offload via plugin-level multi-provider config; doesn't change the project's manual workflow.

---

## Changelog

- 2026-05-28 — Initial draft (S241). Mike S241 directive: *"anything new here https://github.com/thedotmack/claude-mem"* → survey of v13.0.0–v13.3.0 releases → version-gap check (`10.5.2` installed vs `13.3.0` latest = three majors) → plan files the evaluation work without committing to upgrade. Nothing crucial-now per honest read; gated on breaking-change scan (Task 1) before any execution. Cross-link surface: Task 3 (multi-provider) feeds governance.21 (Gemini offload) thesis from the plugin-internal angle.
