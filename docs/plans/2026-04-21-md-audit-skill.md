---
title: /md-audit Skill Plan
created: 2026-04-21
updated: 2026-04-21
type: plan
tags: [architecture, active]
sources:
  - docs/RESEARCH.md §"S170 — Autogenesis Self-Evolving Agent Protocol" (retirement-as-lifecycle framing)
  - .claude/skills/doc-audit/SKILL.md (adjacent skill — content staleness, not existence staleness)
  - MEMORY.md — S156 "No isolated MDs" rule (this plan operationalizes it as a scheduled check)
pointers:
  - "[[engine/ROLLOUT_PLAN]] — parent rollout"
  - "[[SCHEMA]] — doc conventions, frontmatter, stability signals"
  - "[[index]] — register in same commit"
  - "[[RESEARCH]] §S170 Autogenesis — origin framing"
---

# /md-audit Skill Plan

**Goal:** Ship a `/md-audit` skill that flags MD files stale for ≥90 days with no active inbound references, classifies them by staleness reason, and proposes archival (never auto-deletes). Human review gates every destructive action.

**Architecture:** Three-signal detector (mtime + inbound-link count + active-reference check) → four-bucket classifier (reference-stable / orphan-candidate / stale-but-linked / fresh) → audit report at `output/md_audit_{YYYY-MM-DD}.md` → human gate → archival move via `git mv` to `docs/archive/` with inbound links rewritten. Runs on demand initially; cron cadence deferred. Complementary to `/doc-audit`, which checks content drift against codebase state — this skill checks existence staleness against usage.

**Terminal:** research-build (design + build), execution local.

**Pointers:**
- Adjacent skill: `.claude/skills/doc-audit/SKILL.md` — content staleness on 5 doc groups, not existence
- Origin frame: Autogenesis paper (lifecycle framing) + Mike's S170 observation that retirement is the missing half of versioning
- Enforced rule: `MEMORY.md` S156 no-isolated-MD — this audit is that rule on a schedule instead of at write-time

**Acceptance criteria:**
1. `/md-audit` produces `output/md_audit_{YYYY-MM-DD}.md` classifying every `.md` in `docs/` (excluding known binary/reference-material folders) into one of four buckets, with rationale per file.
2. Files classified `orphan-candidate` include the exact `git mv` command to archive them. **Nothing executes without explicit approval per-file or per-batch.**
3. Docs carrying `stable: true` in frontmatter are filtered into the `reference-stable` bucket and skipped — listed briefly in the report for visibility, not flagged.

---

## Tasks

### Phase 1 — Detector

#### Task 1.1: Scanner

- **Files:**
  - `scripts/mdStalenessDetector.js` — create
- **Steps:**
  1. Walk `docs/` recursively. Exclude: `docs/archive/`, `docs/drive-files/`, `docs/research/papers/`.
  2. For each `.md` collect: path, last-modified (git log `--format=%ct -1 -- <path>` preferred over filesystem mtime to survive clone), frontmatter (parse YAML head block for `stable`, `type`, `tags`).
  3. Build inbound-reference index: grep each scanned filename across `docs/**/*.md`, `.claude/**/*.md`, `CLAUDE.md`, `README.md`, `SESSION_CONTEXT.md`. Count matches per target.
  4. Build active-edit set: `git log --since="30 days ago" --name-only --pretty=format:""` → set of paths edited recently.
  5. For each scanned doc, compute: `is_stale_mtime` (>90 days since last commit), `inbound_count`, `inbound_from_active` (any inbound-linker in active set), `has_stable_flag`.
- **Verify:** Run on current tree, print JSON summary (total files, stale count, zero-inbound count, stable-flagged count).

#### Task 1.2: Classifier

- **Files:**
  - `scripts/mdStalenessDetector.js` — append `classify(doc)` function
- **Steps:**
  1. Rules (first match wins):
     - `has_stable_flag === true` → `reference-stable`
     - `!is_stale_mtime` → `fresh`
     - `is_stale_mtime && inbound_count === 0` → `orphan-candidate`
     - `is_stale_mtime && inbound_from_active > 0` → `stable-by-reference` (active files point here, so it's load-bearing even if dormant)
     - `is_stale_mtime && inbound_count > 0 && inbound_from_active === 0` → `stale-but-linked` (something references it, nothing active — needs human judgment)
  2. Return `{bucket, rationale, inbound_refs, age_days}` per doc.
- **Verify:** Manual spot-check: `docs/SCHEMA.md` → reference-stable-or-stable-by-reference; a hand-picked old plan with no active inbound → orphan-candidate.

#### Task 1.3: Report writer

- **Files:**
  - `scripts/mdStalenessDetector.js` — append `writeReport()`
- **Steps:**
  1. Write `output/md_audit_{YYYY-MM-DD}.md` with sections:
     - Summary (counts per bucket, run metadata: threshold, active-window, exclude list)
     - Orphan candidates (table: path | age | size | suggested `git mv` command)
     - Stale-but-linked (table: path | age | inbound-linkers | human-note-needed)
     - Stable-by-reference (compact list, visibility only)
     - Reference-stable (compact list, visibility only)
     - Fresh (count only — no table; too many)
  2. Report explicitly states: `/md-audit` does not execute destructive actions. Run `scripts/archiveStaleMd.js` with explicit paths after review.
- **Verify:** Run end-to-end on current tree, report is readable and accurate.

### Phase 2 — Skill wrapper

#### Task 2.1: SKILL.md

- **Files:**
  - `.claude/skills/md-audit/SKILL.md` — create
- **Steps:**
  1. Frontmatter: `name: md-audit`, description, version `1.0`, `tags: [architecture, active]`, `effort: low`.
  2. Body: usage line, what it does, what it doesn't do (no deletes, no moves), pointer to `scripts/mdStalenessDetector.js` for implementation, pointer to `scripts/archiveStaleMd.js` for gated action step, cross-reference `/doc-audit` as complementary (content vs existence staleness).
  3. Include run command: `node scripts/mdStalenessDetector.js` → writes report → open report.
- **Verify:** `/md-audit` invocation runs the detector and opens the report.

### Phase 3 — Action layer (destructive, gated)

#### Task 3.1: Archival script

- **Files:**
  - `scripts/archiveStaleMd.js` — create
- **Steps:**
  1. Input: array of paths (positional args or file list). No glob expansion — explicit paths only.
  2. Dry-run flag `--dry-run` default true. Requires `--apply` for real execution.
  3. For each path: confirm file exists, `git mv <path> docs/archive/<basename>`, update frontmatter adding `archived: YYYY-MM-DD` + `archived_reason: "<pass-through from audit>"`.
  4. Find and rewrite inbound links to use archive path. Prefix the rewritten reference with a marker like `<!-- archived -->` so future audits see the retirement.
  5. Emit a summary suitable for commit message.
- **Verify:** Dry-run on one test file prints intended moves. Revert. Apply on same test file, confirm `git log` shows mv, confirm inbound links updated.

#### Task 3.2: Link updater

- **Note:** Fold into Task 3.1 unless link-rewrite logic grows beyond ~30 lines; split into `scripts/updateInboundLinks.js` if so.
- **Status:** [ ] decide at Task 3.1 implementation

### Phase 4 — Retroactive stability tagging (optional, after first real run)

#### Task 4.1: Seed `stable: true` on known-stable docs

- **Files:**
  - `docs/SCHEMA.md`, `docs/SIMULATION_LEDGER.md`, `docs/SPREADSHEET.md`, `docs/STACK.md`, `docs/reference/V3_ARCHITECTURE.md`, `docs/reference/DEPLOY.md` — add `stable: true` to frontmatter where applicable
- **Steps:**
  1. Run `/md-audit` first time.
  2. Review false-positives (reference-stable docs flagged as orphan-candidate because they have few inbound links).
  3. For each confirmed false-positive, add `stable: true`.
  4. Second run should show zero false-positives in that category.
- **Verify:** Second audit has a shorter orphan-candidate list than first.

### Phase 5 — Scheduling

- **Note:** After 2-3 on-demand runs, decide whether to cron-schedule monthly or leave manual. Deferred.
- **Status:** [ ] deferred

---

## Open questions

- [ ] **90-day threshold — right starting point?** Session cadence is ~2-3/week, so 90 days ≈ 30 sessions elapsed without touching a doc. If the first run produces zero orphan-candidates at 90 days, tighten to 60. If it produces >50, the signal is too noisy and we need a tighter "active reference" definition in Task 1.1.
- [ ] **Exclude `docs/plans/`?** Plan files are dated by filename and age fast by design. If plans aren't excluded, old plan files will surface for archival — which may actually be what we want (completed plans should archive). Lean: do not exclude. Old completed plans archiving is a feature, not a bug.
- [ ] **What counts as "active edit" — 30 days or tighter?** Shorter window = more aggressive flagging. Start at 30; revisit after first run.
- [ ] **Skill registration — where?** `docs/index.md` has no `.claude/skills/` section. Options: (a) add a new section to index, (b) rely on CLAUDE.md's skill mentions + harness auto-discovery, (c) register in `docs/engine/ROLLOUT_PLAN.md` Other Ready Work entry only. Lean: (b) — skills aren't docs; harness discovers them. Just add a one-liner to CLAUDE.md §Engine Health Commands.

---

## Changelog

- 2026-04-21 — Initial draft (S170, research-build terminal). Triggered by Autogenesis paper + Mike's retirement-protocol insight. Structure-approved before write, same pattern as `[[plans/2026-04-21-memento-cbr-case-bank]]`.
