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
- **Status:** [x] DONE 2026-05-28 (S241) — see §Breaking-change scan below.

#### Breaking-change scan (S241 finding)

**Verdict: SAFE-TO-UPGRADE.** No blocking migrations. Per-version surface from claude-mem CHANGELOG fetch:

| Version | Breaking item | Migration |
|---------|---------------|-----------|
| 10.5.5 | Removed `CLAUDE_MEM_CONTEXT_OBSERVATION_TYPES` + `..._CONCEPTS` env vars | Remove from config if present (project: not used) |
| 10.6.0 | OpenClaw context injection moved from `MEMORY.md` to system prompt | Update OpenClaw agent config (project: doesn't use OpenClaw — N/A) |
| 10.6.1 | Removed `dump_to_file` parameter from context API | Remove from scripts using this param (project: not used) |
| 10.7.0 | Install command delegates to native Claude plugin system | Re-run installer for Claude Code |
| 11.0.0 | Strict observer response contract: prose-style skips no longer accepted | Observer returns `<observation>` XML or empty response (auto via plugin) |
| 12.0.0 | `platform_source` column added to `sdk_sessions` (Migration 25) | **Auto-migrates on startup** |
| 12.2.0 | Worktree observations consolidated via auto-adoption | Run `npx claude-mem adopt` if merged worktrees exist |
| 12.3.0 | Removed bearer-token authentication from worker API | Remove `Authorization` headers from hook clients (project: not used) |
| 12.4.0 | Removed retry-counter and per-message FIFO tracking | **Auto-migrates** (schema v31→v32 drop dead columns) |
| 12.4.3 | One-shot DB cleanup removes observer-sessions + stuck pending msgs | **Auto-runs at startup** (opt-out via `CLAUDE_MEM_SKIP_CLEANUP_V12_4_3=1`) |
| 12.5.0 | Observation pipeline simplified; `kind`/`skipped` enums removed | Parser auto-returns binary valid/invalid |
| 13.0.0 | Relicense AGPL-3.0 → Apache-2.0; Server Beta opt-in | Review license; Server Beta disabled by default (project: not enabling) |
| 13.1.0 | Server Beta event pipeline (Postgres + BullMQ) | Only affects `CLAUDE_MEM_QUEUE_ENGINE=bullmq` users (project: N/A) |

**Recommended upgrade steps (when engine-sheet picks up Task 4):**
1. Upgrade npm package or re-run installer.
2. Restart Claude Code / worker daemon once.
3. Optional: `npx claude-mem adopt` if merged worktrees exist (project: no current merged worktrees per S241 check).
4. Smoke test: `/mem-search` returns existing observations.

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
- **Status:** [x] DONE 2026-05-28 (S241) — see §oh-my-issues verdict below.

#### oh-my-issues verdict (S241 finding)

**Verdict: SKIP.** Skill assumes GitHub-issues-as-source-of-truth; project uses files-as-tracking.

Per skill body fetched from `https://github.com/thedotmack/claude-mem/blob/main/plugin/skills/oh-my-issues/SKILL.md`:
- **Inputs:** GitHub issues from a repository's open backlog accessed via GitHub CLI (`gh issue list`, `gh issue view`). NOT claude-mem observations, NOT arbitrary text input, NOT file paths.
- **Outputs:** plan-master issues (one per architectural defect cluster) + `plans/0X-<slug>.md` design docs + standardized redirect comments closing child issues. Goal: "open issues == open plans, 1:1."
- **Method:** semantic/architectural reasoning by Claude. "Clustering by root cause, not by surface" + "does one architectural change retire all of these?"
- **Prerequisites:** GitHub CLI + `plans/` directory + repo willingness to adopt issue-as-plan pattern.

**Project mismatch:** GodWorld tracks defects in three filesystem surfaces, none of them GitHub Issues:
- Gap logs → `output/production_log_*_gaps.md`
- ENGINE_REPAIR → `docs/engine/ENGINE_REPAIR.md` rows
- ROLLOUT → `docs/engine/ROLLOUT_PLAN.md` rows

Adapting would require either porting to GitHub Issues (breaks ADR-0005, massive migration, no value) or a brittle wrapper that fakes issue-shaped text from file rows. Neither pays back.

**The architectural pattern is portable; the skill isn't.** Root-cause-clustering → plan-master design docs is exactly what the project already does via ADR-0005 + ROLLOUT triage cadence + governance.10 archive sweeps. Adopting the skill would pay installation cost to do a thing the project already does.

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
- **Status:** [x] DONE 2026-05-28 (S241) — see §design-is verdict below.

#### design-is verdict (S241 finding)

**Verdict: SKIP for `/edition-print` PDF QA (wrong design lineage). DEFER for dashboard QA until concrete need.**

Per skill body fetched from `https://github.com/thedotmack/claude-mem/blob/main/plugin/skills/design-is/SKILL.md`:
- **Inputs:** Live URLs, running dev servers (via `agent-browser` subagent), repo paths, Figma frames, screenshots. Adaptive.
- **Audit standard:** Dieter Rams' ten principles verbatim, in exact order. Non-negotiable scoring anchors.
- **Output:** Per-principle 0–3 score + total /30 + verdict (NEW / REFINE / REDESIGN).
- **Prerequisites:** `agent-browser` subagent for live URLs; five parallel evidence-gathering subagents (Structural, Visual, Copy & Honesty, Weight & Friction, Accessibility) before orchestrator scoring.

**`/edition-print` mismatch:** Tribune edition layout follows newspaper-design lineage (masthead typography, column grids, hierarchy, byline conventions, dateline format) — Tufte / Vignelli typographic discipline. Consumer-product Dieter Rams ("innovative," "as little design as possible," "long-lasting") is the wrong scoring axis. A 30-point Rams scorecard for a Tribune edition would optimize toward Braun-radio minimalism instead of what makes a newspaper page work. Technically computable, editorially useless.

**Possible alternative — dashboard QA — DEFER:** The Express + React dashboard at port 3001 IS a digital product where Rams principles apply. But the dashboard isn't a current pain point; `agent-browser` dependency needs separate investigation; this wasn't the proposed use. Re-evaluate when a concrete dashboard-quality concern surfaces.

**Net:** the skill targets a real design discipline, but the project's two visual surfaces (Tribune editions + internal dashboard) either don't fit the discipline or don't currently need it.

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
- **Status:** [x] DONE 2026-05-28 (S241) — see §Multi-provider verdict below.

#### Multi-provider verdict (S241 finding)

**Verdict: DEFER. Multi-provider is server-beta-only; server-beta is itself deferred. Governance.21 Gemini-offload thesis is unaffected.**

Per v13.1.0 changelog:
- **Operation supported:** observation generation (the pipeline that converts `agent_event` → `observation_generation_jobs`).
- **Providers:** Anthropic, OpenAI, Google. Per-team-project scope enforcement.
- **Gating:** routing lives inside the server-beta infrastructure (Postgres + BullMQ + Docker). Local-mode claude-mem does NOT expose provider selection.
- **Config:** team/project-scope at deployment time, not per-user CLI flags.

**The chain that doesn't materialize:**
1. Multi-provider requires server-beta runtime.
2. Server-beta is already DEFERRED in this plan (overkill for single-user; Supermemory already covers centralized memory).
3. Therefore multi-provider is also deferred, by transitive dependency.

**Governance.21 unaffected.** That plan's three offload paths are external (Apps Script side panel, Sheets sidebar, Drive Docs for tier-4). They don't rely on plugin-internal routing. The "invisible offload via plugin-internal multi-provider" hypothesis was a bonus path that doesn't materialize here; the primary offload thesis stands.

**Re-evaluate when:** (a) server-beta becomes viable (concrete cross-machine need), OR (b) multi-provider ships in local-mode in a future claude-mem version. Until either: watch-list, not active work.

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
- **Status:** [~] EXECUTED-STAGED 2026-05-28 (S241, engine-sheet) — `claude plugin update claude-mem@thedotmack --scope user` ran clean (10.5.2 → 13.3.0; "Restart to apply changes"). New cache dir `13.3.0` present, old `10.5.2` retained for rollback; `installed_plugins.json` points at 13.3.0. **Gate reframed — maintenance upgrade (S241, Mike-confirmed).** The plan's stated Task 4 gate was "Task 1 SAFE + ≥1 ADOPT from Tasks 2a/2b/3." With 2a/2b/3 now closed (oh-my-issues SKIP, design-is SKIP, multi-provider DEFER), that gate returned **zero ADOPT** — none of the new surface pays back for GodWorld. The ADOPT-gate is therefore **superseded, not met**: the upgrade proceeds on pure stay-current/maintenance grounds (a 3-major lag on the cross-session-memory substrate is its own liability; the v11–v13 changelog deltas are reliability fixes — dead-column drops, DB cleanup, observer-contract hardening). Mike's reasoning (S241): no point pinning an old version when the new one is staged and backed up. **Crucially, "SAFE-TO-UPGRADE" is a changelog read, not a test result — nothing here is verified until the post-restart smoke test, which is the real gate now.** The mechanism forces stage → restart → smoke (can't verify pre-restart). Acceptance moved from "did a skill prove out" (no) to "does memory survive the migration" (pending). **Pre-upgrade insurance:** full 2.2 GB local store backed up to `/root/.claude-mem.bak-S241/` (`claude-mem.db` byte-identical) BEFORE update — guards the forward-only v11/v12/v13 migrations (Migration 25 / schema v31→v32 / one-shot cleanup) that fire on first restart and cannot be un-migrated by reinstalling 10.5.2. **PENDING (next session, restart-gated):** (1) Mike restarts Claude Code → claude-mem runs migrations; (2) smoke test `/mem-search "boot-burn"` returns existing observations with no index regression; (3) rewrite `docs/CLAUDE-MEM.md` to post-upgrade state. If smoke test regresses: stop worker, restore `/root/.claude-mem.bak-S241/` over `/root/.claude-mem/`, reinstall 10.5.2 from retained cache.

---

## Open questions

- [ ] Should `oh-my-issues` (if Task 2a verdict is ADOPT) be wired into a regular `/cycle-close` / `/session-end` step (auto-cluster gap-log entries from the closing cycle), or remain on-demand (Mike runs it during triage sessions)? — *Defer to Task 2a verdict.* Auto-wiring is the higher-value pattern but requires the skill's output to be deterministic + stable across runs; on-demand is safer for first adoption.
- [ ] If Task 3 verdict is ADOPT (claude-mem routes summarization through Gemini), does that count as Task 1 of governance.21 (Gemini offload)? — *Provisional yes.* Cross-link into governance.21 plan's task list as Path 4 (in addition to the existing three offload paths). Path 4 = invisible offload via plugin-level multi-provider config; doesn't change the project's manual workflow.

---

## Changelog

- 2026-05-28 — Initial draft (S241). Mike S241 directive: *"anything new here https://github.com/thedotmack/claude-mem"* → survey of v13.0.0–v13.3.0 releases → version-gap check (`10.5.2` installed vs `13.3.0` latest = three majors) → plan files the evaluation work without committing to upgrade. Nothing crucial-now per honest read; gated on breaking-change scan (Task 1) before any execution. Cross-link surface: Task 3 (multi-provider) feeds governance.21 (Gemini offload) thesis from the plugin-internal angle.
- 2026-05-28 — Task 4 EXECUTED-STAGED (S241, engine-sheet, /remote-control). Mike "Proceed" on engine-sheet handoff. Measure-twice surfaced the step neither plan owned: claude-mem holds a 2.2 GB local store (`/root/.claude-mem/`) with forward-only auto-migrations on first restart — "SAFE-TO-UPGRADE" (Task 1) was a changelog read, never a live-DB assessment. Backed up the full store to `/root/.claude-mem.bak-S241/` before updating. Also surfaced: user-scope (affects all projects, not just GodWorld) + stated gate (ADOPT from 2a/2b/3) was never met — proceeded on stay-current rationale per Mike. `claude plugin marketplace update thedotmack` (stale Feb-25 clone → v13.3.0 visible) → `claude plugin update claude-mem@thedotmack --scope user` → 10.5.2 → 13.3.0 staged, restart-gated. Old `10.5.2` cache retained. Smoke test + `docs/CLAUDE-MEM.md` rewrite deferred to post-restart next session. Pattern: feedback_measure-twice-cascading-effects.
