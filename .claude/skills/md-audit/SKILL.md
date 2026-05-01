---
name: md-audit
description: Detect stale + orphan MD files in docs/. Mechanical scan of git mtime + inbound links; classifies every doc into 5 buckets. Read-only — never moves or deletes. Complement to /doc-audit (content staleness vs existence staleness).
version: "1.0"
updated: 2026-04-30
tags: [architecture, active]
effort: low
disable-model-invocation: true
---

# /md-audit — Existence-Staleness Audit

## Usage

```bash
node scripts/mdStalenessDetector.js                   # default 90/30
node scripts/mdStalenessDetector.js --stale-days 60   # tighter staleness
node scripts/mdStalenessDetector.js --active-days 14  # tighter active window
```

Writes report to `output/md_audit_<YYYY-MM-DD>.md`.

## What it does

Walks `docs/` (excludes `docs/archive/`, `docs/drive-files/`, `docs/research/papers/`). For each `.md`:

1. Git mtime via `git log -1 --format=%ct` — falls back to filesystem mtime if not in git.
2. Counts inbound references across `docs/**/*.md`, `.claude/**/*.md`, `CLAUDE.md`, `MEMORY.md`, `CONTEXT.md`, `SESSION_CONTEXT.md`, `README.md`. Matches both wikilinks (`[[engine/ROLLOUT_PLAN]]`) and literal paths (`docs/engine/ROLLOUT_PLAN.md`).
3. Marks referrers as "active" if they were touched in the last `--active-days` window (default 30).

Then classifies each doc into one of five buckets (first-match-wins):

| Bucket | Rule |
|--------|------|
| `reference-stable` | frontmatter `stable: true` — explicitly durable |
| `fresh` | not stale (≤ `--stale-days`) |
| `orphan-candidate` | stale + zero inbound refs — strongest archive candidate |
| `stable-by-reference` | stale + at least one **active** referrer — load-bearing dormant |
| `stale-but-linked` | stale + inbound exists but no active referrer — human judgment |

## What it does NOT do

- Does **not** archive, move, delete, or rewrite anything.
- Does **not** read content for accuracy. That's `/doc-audit` — the sibling skill.
- Does **not** schedule itself. Run on demand; cron gating deferred per the plan.

## Companion skills

- **`/doc-audit`** — content staleness audit on 7 named groups. Reads each doc, verifies claims against actual codebase state. Targeted + thorough.
- **`/md-audit`** (this) — existence staleness across the whole tree. Catches orphans `/doc-audit` doesn't know about.

Both are needed. `/doc-audit` checks whether the docs you decided to keep are still accurate. `/md-audit` finds the docs you forgot.

## Plan + acceptance

Plan file: `docs/plans/2026-04-21-md-audit-skill.md` (S170, drafted research-build).

Phase 3 (gated archival via `scripts/archiveStaleMd.js`) intentionally not built — first run informs whether the classifier needs tuning before destructive action enters the loop.

## Tuning notes

- **90-day threshold** — starting point. If first run produces zero orphans, tighten to 60. If it produces >50, tighten the active window or seed `stable: true` on known durables.
- **`docs/plans/`** — not excluded. Old completed plans archiving is a feature, not a bug.
- **False positives** — top-level reference docs (`SCHEMA.md`, `STACK.md`, `SIMULATION_LEDGER.md`, `SPREADSHEET.md`, `reference/V3_ARCHITECTURE.md`, `reference/DEPLOY.md`) are candidates for `stable: true` frontmatter after first review.
