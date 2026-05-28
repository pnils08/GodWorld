---
title: claude-supermemory v0.0.2 → v0.0.4 Upgrade Evaluation
created: 2026-05-28
updated: 2026-05-28
type: plan
tags: [governance, infrastructure, memory, supermemory, active]
sources:
  - "GitHub: https://github.com/supermemoryai/claude-supermemory/commits/main (fetched S241)"
  - "Installed: /root/.claude/plugins/cache/supermemory-plugins/claude-supermemory/0.0.2/package.json"
  - "S241 conversation — Mike: 'pull all useful tools onto the rollout for future session builds'"
  - "S241 stale-URL scan: 5 project files reference console.supermemory.ai (migrated March 5 to app.supermemory.ai)"
pointers:
  - "[[engine/ROLLOUT_PLAN]] — parent rollout (governance.24)"
  - "[[SCHEMA]] — doc conventions"
  - "[[index]] — register in same commit"
  - "[[../SUPERMEMORY]] — primary Supermemory reference doc; carries stale URL + needs post-upgrade refresh"
  - "[[../STACK]] — stale URL reference"
  - "[[../RESEARCH]] — stale URL reference"
  - "[[engine/ROLLOUT_PLAN]] — itself carries a stale URL reference (one of the 5)"
  - "scripts/migrateSupermemory.js — stale URL reference (script, not doc)"
  - "[[2026-05-28-claude-mem-v13-upgrade-evaluation]] — sibling S241 plan, governance.23 — same plugin-upgrade triage pattern"
---

# claude-supermemory v0.0.2 → v0.0.4 Upgrade Evaluation

**Goal:** Evaluate the 2-minor-version upgrade gap (v0.0.2 installed → v0.0.4 latest). Surface scoped surface for upgrade decision: source attribution feature, kebab-case skill rename (potential breaking change for skill aliases), `console.supermemory.ai` → `app.supermemory.ai` URL migration affecting 5 project files.

**Architecture:** Three small tasks. Task 1 is the breaking-change gate (kebab-case rename — does it preserve skill aliases like `/super-search` + `/super-save`, or rename them and break project references). Task 2 is the source-attribution evaluation (worth adopting? feeds into governance.12 / ADR-0008 speaker-attribution discipline). Task 3 is the stale-URL doc-hygiene pass — independent of upgrade decision, can ship today (5 files).

**Terminal:** research-build (evaluation + doc-hygiene Task 3). Engine-sheet picks up Task 4 (execute upgrade) if the gate passes.

**Pointers:**
- Sibling plan: [[2026-05-28-claude-mem-v13-upgrade-evaluation]] (governance.23) — same plugin-upgrade triage pattern, larger surface (3-major-version gap vs 2-minor-version gap here).
- Sibling plans (S241): governance.21 + governance.22 (token-budget concern from different layers).
- Adjacent: ADR-0008 (speaker-attribution writer-side invariant) — Task 2 (source attribution) is the upstream feature that could complement this discipline.

**Acceptance criteria:**
1. Each task produces a clear decision: UPGRADE / DEFER / SKIP (Tasks 1–2), or ships its artifact (Task 3).
2. No regression in current Supermemory operations during evaluation — current v0.0.2 stays installed until execution.
3. Task 3 (stale URL hygiene) ships independent of upgrade decision; the URL migration is already live regardless of plugin version.

---

## Survey findings (S241 fetch)

**Version gap:** v0.0.2 (Feb 9, 2026 — installed) → v0.0.4 (May 22, 2026 — latest). 2 minor versions.

**Substantive changes between v0.0.2 and v0.0.4:**
- v0.0.3 (May 14, commit `544c927`) — version bump only ("bump plugin.json version to 0.0.3 to match marketplace.json"). No feature delta.
- v0.0.4 (May 22, commit `3a92496`) — "feat: add claude-code source attribution and kebab skills." Two changes in one commit:
  - **Source attribution** — memory writes tagged with source=claude-code (vs other Supermemory write surfaces: web UI, API, mobile, mags-discord-bot, save-to-mags skill, discord-reflection script). Audit-ability improvement.
  - **Kebab skills** — likely renaming of skills to kebab-case convention. Potential breaking change if project uses non-kebab aliases.
- v0.0.4 also includes biome format / lint cleanup (cosmetic).
- Post-v0.0.4 commits: May 25 source-attribution re-application (likely fix-forward).

**Pre-v0.0.2 historical changes since installed (Feb 9):**
- March 5 — `console.supermemory.ai` → `app.supermemory.ai` URL migration. **Independent of plugin upgrade** — the URL is server-side. **5 project files carry the stale URL:** `docs/RESEARCH.md`, `docs/SUPERMEMORY.md`, `docs/STACK.md`, `docs/engine/ROLLOUT_PLAN.md`, `scripts/migrateSupermemory.js`. Likely 301-redirects, but doc hygiene.

**No major architecture changes** — unlike claude-mem v13.x (server-beta runtime, multi-provider), claude-supermemory v0.0.4 is incremental.

**No new MCP tools** identified in commit messages. Project's existing tool surface (`/super-search`, `/super-save`, `/project-config`, `/logout`, `/index`) probably unchanged in capabilities; only renames possible.

---

## Tasks

### Task 1: Verify skill-name backward compatibility — kebab-case rename gate

- **Cost-of-delay:** Gates upgrade execution. If `/super-search` → `/super-search-mem` (or similar kebab rename), project's skill invocations would break silently.
- **Files:**
  - (investigation only — output is verdict in this plan's §Skill-rename verdict section)
- **Steps:**
  1. WebFetch `https://github.com/supermemoryai/claude-supermemory/blob/main/plugin/skills/` (or the equivalent path) — read the current skill file names + frontmatter `name:` fields.
  2. Compare against the 5 skills currently used by the project (per `.claude/skills` enumeration + Available Skills list): `claude-supermemory:super-search`, `claude-supermemory:super-save`, `claude-supermemory:project-config`, `claude-supermemory:logout`, `claude-supermemory:index`.
  3. If names changed (e.g., `super-search` → `mem-super-search`), every project skill reference needs an update. Catalog the diff.
  4. Verdict: BACKWARD-COMPATIBLE (no renames affecting project use) / RENAMED-COMPATIBLE (renames exist but aliases preserved) / RENAMED-BREAKING (project must update references on upgrade).
- **Verify:** §Skill-rename verdict section in this plan with verdict line + (if RENAMED-BREAKING) the per-skill diff catalog.
- **Status:** [ ] not started — investigation, ~15 min

### Task 2: Source attribution evaluation — fit-check against ADR-0008 speaker attribution

- **Cost-of-delay:** Low absolute. Source attribution per memory complements ADR-0008 (speaker-attribution writer-side invariant) by distinguishing claude-code-channel writes from mags-discord-bot / save-to-mags-skill / discord-reflection / web-UI writes. Audit-ability improvement.
- **Gated on:** Task 1 verdict (only matters if upgrade is viable).
- **Files:**
  - (evaluation only this task)
- **Steps:**
  1. WebFetch the v0.0.4 commit `3a92496` source to read the source-attribution implementation: which Supermemory field is tagged, what value claude-code writes vs. other writers, whether other channels write a distinguishing source.
  2. Compare against ADR-0008's speaker-attribution invariant: ADR-0008 enforces speaker labeling in memory content; source attribution would label memory provenance. Different layers — complementary, not redundant.
  3. Verdict: ADOPT (upgrade gains audit-ability; pairs with ADR-0008) / DEFER (feature works but no current audit gap forces it) / SKIP (feature doesn't fit project's actual provenance needs).
- **Verify:** §Source-attribution verdict section in this plan with verdict line.
- **Status:** [ ] not started — investigation, ~15 min

### Task 3: Stale `console.supermemory.ai` URL hygiene pass — CLOSED INVALID (S241)

- **Status:** CLOSED INVALID 2026-05-28 (S241) — survey thesis was wrong; zero references are stale.
- **What was claimed:** 5 project files carry stale `console.supermemory.ai` URL post-March-5 migration; find/replace to `app.supermemory.ai` would close the paper cut.
- **What verification showed:** WebFetch of `https://console.supermemory.ai` resolves live to a page titled "Supermemory Console" (admin interface). The URL did NOT redirect to `app.supermemory.ai`. S177 docs (April 25, post-March-5-migration) carry the correct framing: two URLs, two functions — `app.supermemory.ai` = browse memories, `console.supermemory.ai` = admin (org management, billing, API keys, scoped key creation). The March 5 commit "Migrate console.supermemory.ai to app.supermemory.ai" most likely moved specific features between the two (memory browsing → app while admin stayed on console), not retired console wholesale. The plugin's `openBrowser()` URL change to app per S177 was the only URL-in-code migration; `scripts/migrateSupermemory.js:234` was updated in S177 to distinguish admin/browse and is already correct.
- **All 9 occurrences across the 5 files are intentional admin-URL labels, NOT stale references:**
  - `docs/STACK.md:30` — Supermemory Console row labels the admin URL.
  - `docs/SUPERMEMORY.md:3` — header explicitly labels `Admin: console.supermemory.ai | Browse: app.supermemory.ai`.
  - `docs/SUPERMEMORY.md:445` — "Create at console.supermemory.ai" — scoped API key creation is admin function.
  - `docs/SUPERMEMORY.md:688` — table entry labels console as "Admin — org management, billing, API keys".
  - `docs/SUPERMEMORY.md:727` — S177 changelog entry historical reference.
  - `docs/RESEARCH.md:94` — "Available at console.supermemory.ai" — scoped API key creation admin context.
  - `docs/engine/ROLLOUT_PLAN.md:202` — governance.24 row (this plan's parent — text claims "5 stale files," will be corrected).
  - `docs/engine/ROLLOUT_PLAN.md:288` — S177 changelog entry historical reference.
  - `scripts/migrateSupermemory.js:234` — distinguishes "app.supermemory.ai (browse) / console.supermemory.ai (admin)" — already correct.
- **Lesson:** verification before action caught a measure-twice violation. The survey assumed "console URL deprecated" from a one-line commit message without confirming. WebFetch verification flipped the verdict. Pattern: `feedback_measure-twice-cascading-effects`.
- **What stays open:** governance.24 row text needs correction (claims "5 stale URL references" — that's wrong; will be amended in the same commit that ships this plan update).

### Task 4 (conditional): Execute upgrade

- **Cost-of-delay:** Zero until Tasks 1–2 produce UPGRADE verdicts.
- **Gated on:** Task 1 verdict ≠ RENAMED-BREAKING AND Task 2 verdict = ADOPT (or upgrade has independent value).
- **Files:**
  - `/root/.claude/plugins/cache/supermemory-plugins/claude-supermemory/` — upgrade target (engine-sheet executes)
  - `docs/SUPERMEMORY.md` — update post-upgrade if source attribution adopted
- **Steps:**
  1. Engine-sheet picks up: claude-supermemory plugin upgrade via standard Claude Code plugin install path.
  2. Smoke test: `/super-search "boot-burn"` returns existing memories with no error.
  3. If Task 2 verdict was ADOPT, update `docs/SUPERMEMORY.md` to document source-attribution writer behavior.
  4. File closing changelog entry on this plan.
- **Verify:** Plugin folder reflects v0.0.4 (or whichever target). Smoke test passes. `docs/SUPERMEMORY.md` updated if applicable.
- **Status:** [ ] not started — conditional on Tasks 1–2

---

## Open questions

- [ ] Is the kebab-case rename a one-time refactor in v0.0.4, or part of a broader naming-convention migration across future versions? — *Defer to Task 1 fetch.* If broader migration, evaluating now vs at the next upgrade has similar cost.
- [ ] Should the URL hygiene pass (Task 3) ship in the same session as the plan write, or wait for picker? — *Provisional yes-ship-now if quick* — Mike's directive *"if something is crucial for us do it now"* applies marginally (stale URLs are cosmetic, not blocking). But it's a 10-minute mechanical pass; closing it eliminates a small future paper cut. Lean ship-now if it fits in remaining session window.

---

## Changelog

- 2026-05-28 — Initial draft (S241). Mike S241 directive: *"anything new here https://github.com/supermemoryai/claude-supermemory"* → survey of commits to main (v0.0.2 release page incomplete-load, so commit history used as primary source) → version-gap check (`0.0.2` installed vs `0.0.4` latest = 2 minor versions). 4 tasks; Task 3 (URL hygiene) ships independent of upgrade decision. Nothing crucial-now per honest read; Task 3 is the only "could ship today" item if session window allows.
- 2026-05-28 — Task 3 closed INVALID same session (S241). Mike approved Task 3 ship-now. Pre-execution verification (WebFetch of `console.supermemory.ai`) flipped the verdict: URL is live admin interface, not deprecated. All 9 occurrences across 5 files are intentional admin-URL labels per S177 framing (admin vs browse distinction). Find/replace would have damaged docs. Pattern: `feedback_measure-twice-cascading-effects` — verification before action caught a survey-side wrong assumption. Tasks 1 + 2 + 4 unchanged.
