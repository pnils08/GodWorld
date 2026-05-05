---
title: Disk Inventory and Dead-File Detection Plan
created: 2026-05-05
updated: 2026-05-05
type: plan
tags: [architecture, infrastructure, draft]
sources:
  - SESSION_CONTEXT.md S202 — droplet hygiene pass, 88%→81% via prescrub-backup + projects-backup + pre-May log cleanup
  - scripts/scanDeadCode.js — function-level dead-code scan (engine + scripts + skills + lib)
  - scripts/mdStalenessDetector.js — MD orphan + git-mtime staleness (docs/ scoped)
  - .claude/skills/md-audit/SKILL.md — current MD audit skill, docs/ only
  - .claude/skills/context-budget/SKILL.md — uses claude-batch MCP (precedent for batch invocation)
  - docs/plans/2026-04-21-md-audit-skill.md — prior staleness-detector plan as shape reference
pointers:
  - "[[engine/ROLLOUT_PLAN]] — parent rollout"
  - "[[SCHEMA]] — doc conventions"
  - "[[index]] — register in same commit"
  - "[[plans/2026-04-21-md-audit-skill]] — sibling plan, narrower scope (docs/ only)"
---

# Disk Inventory and Dead-File Detection Plan

**Goal:** A standing two-phase job that inventories every file under `/root` (excluding ignorelist) and classifies each as load-bearing / reference-only / orphan / regenerable, so the droplet's bloat surface can be triaged on a known cadence instead of discovered at 88% disk.

**Architecture:** Phase 1 is a pure-Node walker that produces a single JSON manifest of paths + size + extension + git-tracked + last-mtime + sha1. Phase 2 takes that manifest plus a basename reference scan and submits batch classification jobs via the existing `claude-batch` MCP (50% cost, async overnight) to bucket each file. Phase 3 renders the triage report. All read-only — no file ever moves or deletes from this pipeline; archival is human-gated, like `/md-audit`.

**Terminal:** research-build (Phases 1 + 3 design and skill); engine-sheet may execute the batch submission in Phase 2 if research-build doesn't have headroom.

**Pointers:**
- Sibling tool — `scripts/mdStalenessDetector.js` covers `docs/` only at the file layer; `scripts/scanDeadCode.js` covers code only at the function layer. Neither sees `/root/.claude-mem/`, `/root/.claude/projects/`, `/root/GodWorld/output/`, `/root/GodWorld/legacy/`, `/root/GodWorld/archive/`, scattered `.sh` scripts, or config JSONs.
- Triggering case — S202 droplet at 88% required ad-hoc audit of prescrub backups, claude-mem logs, WAL state. Audit took ~10 minutes manually. A standing inventory makes the same triage one bash command.
- Batch precedent — `.claude/skills/context-budget/SKILL.md` lists `claude-batch` as an available MCP server; deferred-tool list in this session confirms `mcp__claude-batch__send_to_batch` + `batch_status` + `batch_fetch` exist.
- Companion to — `[[plans/2026-04-21-md-audit-skill]]` (docs scope, file existence) + `scripts/scanDeadCode.js` (code scope, function reachability). This plan unions their patterns at filesystem scope.

**Acceptance criteria:**
1. `node scripts/diskInventory.js` produces `output/disk_inventory_<DATE>.json` listing every file under `/root` minus the ignorelist; manifest includes path, size, ext, git-tracked, mtime, sha1; runs in under 2 minutes.
2. `node scripts/diskRefScan.js` reads the manifest + scans `/root/GodWorld` and `/root/.claude` for basename references; outputs `output/disk_refscan_<DATE>.json` with per-file `refCount` + `refSites[]`.
3. A `/disk-audit` skill orchestrates the two scripts + a batch classification pass via `mcp__claude-batch__send_to_batch`; triage report at `output/disk_audit_<DATE>.md` lists per-bucket counts (load-bearing / reference-only / orphan / regenerable) + top-10 by-size in each bucket.
4. First run on the live droplet: total file count printed, total size printed, orphan-bucket size estimate printed. No files moved, no files deleted, no destructive operations anywhere in the pipeline.
5. Plan-doc rule — every script in this plan is read-only or batch-API; nothing rms or mvs. Archival decisions are human-gated downstream, same shape as `/md-audit` Phase 3.

---

## Phase 1 — Inventory Walker (research-build)

### Task 1.1: Define the ignorelist

- **Files:**
  - `scripts/diskInventory.js` — create
- **Steps:**
  1. Define `IGNORE_PREFIXES` constant: `node_modules/`, `.git/`, `.claude-mem/chroma/`, `.cache/`, `dist/`, `build/`, `coverage/`, `.next/`, `.bun/install/cache/`, `.local/share/uv/`.
  2. Define `IGNORE_EXTENSIONS` constant: `.lock`, `.sqlite-shm`, `.sqlite-wal`, `.db-shm`, `.db-wal`, `.tmp`, `.pyc`.
  3. Document each entry inline with one-line rationale (why excluded).
- **Verify:** read the file, confirm both constants present and commented.
- **Status:** [ ] not started

### Task 1.2: Implement the walker

- **Files:**
  - `scripts/diskInventory.js` — modify
- **Steps:**
  1. Recursive walk starting from `/root`. Use `fs.readdirSync(path, { withFileTypes: true })` to avoid extra stat calls.
  2. Skip any directory whose relative path matches a prefix in `IGNORE_PREFIXES`. Skip files with extensions in `IGNORE_EXTENSIONS`.
  3. For each surviving file, capture: `{ path, size, ext, mtime, sha1, gitTracked }`. `gitTracked` is `true` only when the file is under `/root/GodWorld` AND `git ls-files --error-unmatch <path>` exits 0.
  4. sha1 is truncated to first 12 chars (collision-safe at this scale, faster I/O than full hash).
- **Verify:** `node scripts/diskInventory.js --dry-run` prints file count + total size to stdout, exits 0.
- **Status:** [ ] not started

### Task 1.3: Manifest output + run time budget

- **Files:**
  - `scripts/diskInventory.js` — modify
- **Steps:**
  1. Write manifest to `output/disk_inventory_<YYYY-MM-DD>.json`. Top-level shape: `{ generatedAt, root, fileCount, totalBytes, ignored: { dirs, files }, entries: [...] }`.
  2. Add `--max-seconds N` flag (default 120). If walk exceeds, abort + print "BUDGET EXCEEDED: walked N files in Ns" and exit 1.
  3. Print summary line on success: `Inventory: N files, M GB, written to <path>`.
- **Verify:** `node scripts/diskInventory.js` produces a JSON file with `fileCount > 1000`, completes in under 2 min on the live droplet.
- **Status:** [ ] not started

---

## Phase 2 — Reference Scan + Batch Classification (research-build → engine-sheet for batch execution)

### Task 2.1: Implement basename reference scan

- **Files:**
  - `scripts/diskRefScan.js` — create
- **Steps:**
  1. Read latest `output/disk_inventory_<DATE>.json` (newest by mtime).
  2. For each entry in the manifest, run `grep -rln --binary-files=without-match "<basename>" /root/GodWorld /root/.claude` excluding the file's own path.
  3. Capture `refCount` (line count) + `refSites[]` (top 5 referencing files) per manifest entry.
  4. Write to `output/disk_refscan_<YYYY-MM-DD>.json`.
- **Verify:** `node scripts/diskRefScan.js` completes; sample-check 5 known-load-bearing files (e.g. `scripts/queryFamily.js`) have `refCount > 0`.
- **Status:** [ ] not started

### Task 2.2: Define classification buckets

- **Files:**
  - `docs/plans/2026-05-05-disk-inventory-and-dead-file-detection.md` — modify (this section, replace with locked taxonomy)
- **Steps:**
  1. Lock the four buckets:
     - **load-bearing** — `refCount > 0` AND `mtime` within 30 days
     - **reference-only** — `refCount > 0` AND `mtime` older than 30 days
     - **orphan** — `refCount == 0` AND not in regenerable allowlist
     - **regenerable** — matches a known regen pattern (e.g. `output/desk-packets/*`, `output/world_summary_*.md`, `output/photos/*`, `editions/cycle_pulse_*.txt` — these are rebuilt every cycle by their owning skill)
  2. Document the regenerable allowlist as a `REGENERABLE_PATTERNS` constant in `scripts/diskRefScan.js`.
- **Verify:** the four buckets are mutually exclusive and exhaustive — every file lands in exactly one.
- **Status:** [ ] not started

### Task 2.3: Batch classification job

- **Files:**
  - `scripts/diskBatchClassify.js` — create
- **Steps:**
  1. Read `disk_inventory_<DATE>.json` + `disk_refscan_<DATE>.json`. Mechanically classify by the four-bucket rules.
  2. For files where mechanical classification is ambiguous (e.g. `refCount == 0` but path matches a regen pattern only weakly, or git-tracked file with zero refs that might be load-bearing through dynamic dispatch), submit to `mcp__claude-batch__send_to_batch` with a prompt that includes the file's path + first 200 lines + the four-bucket definitions. Ask for bucket assignment + one-line reason.
  3. Persist the batch ID to `output/disk_batch_<DATE>.json` so Phase 3 can fetch results.
- **Verify:** batch submission returns a job ID; mechanical classification covers >80% of files (batch handles only the ambiguous tail).
- **Status:** [ ] not started

### Task 2.4: Result fetch + manifest enrichment

- **Files:**
  - `scripts/diskBatchClassify.js` — modify
- **Steps:**
  1. Add `--fetch` flag. When passed, reads the batch-job ID from `output/disk_batch_<DATE>.json` and polls `mcp__claude-batch__batch_status` until complete.
  2. On completion, fetch results via `mcp__claude-batch__batch_fetch`, merge bucket assignments back into the manifest, write `output/disk_classified_<DATE>.json`.
  3. Manifest shape: each entry gets `{ ...originalFields, bucket, bucketReason, classifiedBy: 'mechanical'|'batch' }`.
- **Verify:** `node scripts/diskBatchClassify.js --fetch` completes; resulting manifest has every entry with a `bucket` field.
- **Status:** [ ] not started

---

## Phase 3 — Triage Report + Skill Wrapper (research-build)

### Task 3.1: Build triage report renderer

- **Files:**
  - `scripts/diskTriageReport.js` — create
- **Steps:**
  1. Read latest `disk_classified_<DATE>.json`.
  2. Render `output/disk_audit_<DATE>.md` with sections:
     - **Summary** — total file count, total size, per-bucket counts + per-bucket total size.
     - **Top 10 orphans by size** — table with path / size / mtime / bucketReason.
     - **Top 10 reference-only by size** — same shape.
     - **Regenerable footprint** — total regenerable bytes (informational; these auto-clean if their owning skill rotates).
     - **Top directories by orphan size** — group orphans by parent directory, list top 10.
  3. Print summary line to stdout: `Triage: N orphans (M GB), output at <path>`.
- **Verify:** running on a fixture manifest produces a non-empty MD with all four sections.
- **Status:** [ ] not started

### Task 3.2: Wrap as `/disk-audit` skill

- **Files:**
  - `.claude/skills/disk-audit/SKILL.md` — create
- **Steps:**
  1. Use the same shape as `.claude/skills/md-audit/SKILL.md`: front-matter, Purpose, When to Use, Steps, Output Files.
  2. Steps section orchestrates the three scripts in order: inventory → refscan → batch-classify → fetch → triage report.
  3. Document the human-gated archival pattern: "this skill never deletes. Mike reviews the triage report and decides what to remove. Archival happens via separate manual command outside this skill."
- **Verify:** `/disk-audit` invocation runs end-to-end on the live droplet, produces all four output files.
- **Status:** [ ] not started

### Task 3.3: Register in docs/index.md + ROLLOUT pointer flip

- **Files:**
  - `docs/index.md` — modify
  - `docs/engine/ROLLOUT_PLAN.md` — modify
- **Steps:**
  1. Add an entry under `docs/plans/` listing this plan with a one-line summary + status tag.
  2. Add an entry to ROLLOUT priority list (or under the relevant Open Work Items subsection) pointing at this plan, tagged `(promoted: C<XX>, severity: MEDIUM)`.
- **Verify:** `grep -c "2026-05-05-disk-inventory" docs/index.md` returns 1; same grep against ROLLOUT_PLAN returns ≥1.
- **Status:** [ ] not started

---

## Open questions

Resolve before Phase 2 starts.

- [ ] **Q1 — sha1 cost:** is sha1 per file worth the I/O hit, or is `{path, size, mtime}` sufficient for change-detection? Default recommendation: include sha1 truncated to 12 chars. Cost on 200K files ≈ 60s at modern disk speeds. Worth the dedup signal (catches identical content under different paths — common in `output/` regenerable artifacts).
- [ ] **Q2 — reference scan scope:** does Task 2.1 scan `/root/GodWorld + /root/.claude` only, or also `/root/.claude-mem` and `/root/.bun`? Default recommendation: scope to `/root/GodWorld + /root/.claude` (everything else is plugin/runtime cache, not authored code that would reference our files).
- [ ] **Q3 — batch threshold:** what fraction of files should mechanical classification handle vs the batch tail? Default recommendation: aim for ≥80% mechanical. If under, the bucket rules are too vague; revisit Task 2.2.
- [ ] **Q4 — sibling-script consolidation:** should `scripts/scanDeadCode.js` and `scripts/mdStalenessDetector.js` be folded into the new pipeline as input feeders? Default recommendation: NO — they have narrower scope (function-level / docs-only) and different output shape; the new pipeline complements them, doesn't replace.
- [ ] **Q5 — cadence:** every session-end? Weekly? On-demand? Default recommendation: ON-DEMAND. The disk doesn't change fast enough to justify per-session overhead. The triage report should be re-runnable when the droplet hits a watermark (e.g. >85% disk).

---

## Changelog

- 2026-05-05 — Initial draft (S202). Triggered by S202 droplet hygiene pass — manual audit recovered ~2G but surfaced no standing tool to re-run the same triage. `scripts/scanDeadCode.js` covers code only; `scripts/mdStalenessDetector.js` covers `docs/` only; nothing inventories `/root` as a whole or classifies cross-cuttingly. Plan splits the work into pure-Node walker (Phase 1) + ref-scan + batch-API classification (Phase 2) + skill wrapper (Phase 3). Status: DRAFT — five Phase 1 questions to resolve before tooling starts. Tags: `[architecture, infrastructure, draft]`.
