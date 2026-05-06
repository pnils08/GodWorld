---
name: disk-audit
description: Inventory + classify + triage every authored file under /root. Catches orphan files (recovery candidates), regenerable artifacts, and stale references that fall through /md-audit (docs/ scope) and /tech-debt-audit (function-level scope). Read-only — never moves or deletes. Triggered when droplet hits ~85% disk or after large output/ accumulations.
version: "1.0"
updated: 2026-05-06
tags: [architecture, infrastructure, active]
effort: medium
disable-model-invocation: true
---

# /disk-audit — Filesystem Inventory + Dead-File Detection

## Usage

```bash
node scripts/diskInventory.js                # Phase 1: walk + manifest (~10s)
node scripts/diskRefScan.js                  # Phase 2.1: basename + stem ref scan (~5s)
node scripts/diskClassify.js                 # Phase 2.2/2.3 mechanical: 6-bucket classify (~100ms)
node scripts/diskTriageReport.js             # Phase 3.1: render disk_audit_<DATE>.md (~50ms)
```

Or chain them:

```bash
node scripts/diskInventory.js && \
node scripts/diskRefScan.js && \
node scripts/diskClassify.js && \
node scripts/diskTriageReport.js
```

End-to-end: ~15s on a ~7K-file droplet. Output: `output/disk_audit_<YYYY-MM-DD>.md`.

## What it does

1. **Inventory** — walks `/root` minus an explicit ignorelist (vendor caches, browser state, claude-code per-session JSONLs, build outputs). Captures `path / size / ext / mtime / sha1-12 / git-tracked` per file.
2. **Ref scan** — single-pass tokenize over `/root/GodWorld + /root/.claude` (corpus). For each file in the corpus, find any token that matches a manifest basename OR its extension-stripped stem (wikilinks `[[engine/X]]` and `require('./scripts/Y')` strip extensions). Build inverse `basename → [refSites]` map.
3. **Classify** — apply 6-bucket rules:

   | Bucket | Rule |
   |---|---|
   | `load-bearing` | refCount > 0 AND mtime ≤ 30 days |
   | `reference-only` | refCount > 0 AND mtime > 30 days |
   | `canon` | matches CANON_PATTERNS — frozen reference (editions, archive, papers, journals) |
   | `regenerable` | matches REGEN_PATTERNS — auto-rebuilt by owning skill (per-cycle output/) |
   | `review` | refCount = 0 BUT git-tracked — possible dynamic dispatch (LLM-batch tier) |
   | `orphan` | refCount = 0, not git-tracked, not regen/canon — recovery candidate |

4. **Triage report** — renders `output/disk_audit_<DATE>.md` with summary table + top-N orphans / review / reference-only / orphan-dirs by size.

## What it does NOT do

- Does **not** archive, move, delete, or rewrite anything. Archival is a separate manual step at Mike's discretion.
- Does **not** schedule itself. Run on demand when droplet hits ~85% disk or after large output/ accumulations.
- Does **not** classify the `review` tier via LLM yet. Phase 2.3 batch-API submission deferred — mechanical pass currently classifies >90%; batch tier is the ambiguous tail.

## When to use

- **Droplet disk crosses 85%** — primary trigger. S202 hit 88%, hit a manual audit; this skill replaces that.
- **Post-cycle if output/ feels heavy** — verify regenerables are rotating instead of compounding.
- **Pre-archive sweep** — before manual archival of old plans / completed phases, get the canon/orphan signal.

## Companion skills (don't conflate)

- **`/md-audit`** — existence staleness for `.md` files in `docs/`. Narrower scope (docs/ only); deeper check (git mtime + active-referrer window).
- **`/tech-debt-audit`** — function-level dead-code scan for engine + scripts. Function reachability, not file reachability.
- **`/disk-audit`** (this) — file-level cross-cutting filesystem audit. Catches what the other two don't see.

## Output anatomy

`output/disk_audit_<DATE>.md` sections:

1. **Summary** — per-bucket counts + total size + meaning column.
2. **Top N orphans by size** — recovery candidates with size, age, path, reason.
3. **Top N review candidates** — git-tracked but unreferenced (LLM-batch tier).
4. **Top N reference-only** — stale referenced files (legitimate stable docs usually).
5. **Top N directories by orphan size** — where orphans cluster (batch-review hint).
6. **Regenerable footprint** — per-cycle output/ size signal.

## Tuning

- **Ignorelist** lives in `scripts/diskInventory.js` as `IGNORE_BASENAMES` (basename match anywhere) + `IGNORE_PREFIXES` (path-anchored). Add new entries when a new vendor cache surfaces — first run after a `bun add` or new plugin install will reveal gaps.
- **REGEN_PATTERNS / CANON_PATTERNS** in `scripts/diskClassify.js` — extend when new per-cycle artifact patterns or canonical-frozen folders appear.
- **CORPUS_EXCLUDE_PATTERNS** in `scripts/diskRefScan.js` — extends with any new AI-output transcripts that recapitulate filenames without authoritatively referencing them.
- **Recentness threshold** (default 30 days) — `RECENT_DAYS` in `diskClassify.js`. Tighten if more than ~50% of refCount > 0 entries land in `load-bearing`.

## Plan + acceptance

Plan file: `docs/plans/2026-05-05-disk-inventory-and-dead-file-detection.md` (drafted S202, executed S203).

Phase 2.3 batch-API submission for the `review` tier intentionally not built — first runs will reveal whether the mechanical classifier handles enough of the load. If batch is needed later, the `review` bucket entries are pre-shaped for `mcp__claude-batch__send_to_batch` consumption.

Phase 3.1 (this triage report) is the read-only deliverable. Phase 3 archival (gated `scripts/archiveStaleFiles.js`) intentionally not built — destructive action stays out of the autonomous loop until the classifier is proven across multiple runs.
