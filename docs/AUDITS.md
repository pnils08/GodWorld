---
title: Audit Run Registry
created: 2026-05-06
updated: 2026-05-06
type: reference
tags: [architecture, infrastructure, active]
sources:
  - .claude/skills/disk-audit/SKILL.md
  - .claude/skills/disk-rotate/SKILL.md
  - .claude/skills/md-audit/SKILL.md
  - .claude/skills/doc-audit/SKILL.md
pointers:
  - "[[engine/ROLLOUT_PLAN]] — open work; this file is for *standing* maintenance jobs"
  - "[[index]] — registers each audit skill's plan file"
---

# Audit Run Registry

**The single index of when each maintenance audit was run, what it found, and what (if anything) was acted on.**

Standing maintenance jobs (`/disk-audit`, `/disk-rotate`, `/md-audit`, `/doc-audit`) are NOT rollout items — they're recurring health checks. This registry tracks their cadence + outcomes so any session can answer "when did we last sweep X?" without grepping commit history.

**Update protocol:** every audit-skill run that produces a report (or executes an action) appends a row to the table below. Inline at the end of the skill's last step. Format: one row per run.

---

## Run history

| Date | Skill | Findings (1-line) | Action taken | Commit / artifact |
|---|---|---|---|---|
| 2026-05-06 | `/disk-audit` | 7,195 files / 1.95 GB → 912 orphans / 270 MB; headline: 263 MB stale claude-mem logs | report only | `output/disk_audit_2026-05-06.md` (commit `20790e1`) |
| 2026-05-06 | `/disk-rotate` (manual) | claude-mem logs 5/01–5/03 (247 MB), bun cache (899 MB), claude versions .126+.128 (497 MB) | deleted; uv cache (1.1 GB) deferred — locked by active MCPs | manual S203; ~1.2 GB recovered, disk 84% → 79% |
| 2026-05-07 | `/doc-audit boot` | 14 docs audited (full v2.0 scope, closes S176 partial); 3 stale, 0 inconsistent, 0 dead refs | report only — all 3 stale findings owned by /session-end ritual (PERSISTENCE session counter, SESSION_CONTEXT 821-line bloat, CLAUDE.md population stamp) | S205 session note |
| 2026-05-08 | `/doc-audit engine` | 25 engine + engine-sheet-handoff docs surveyed; 6 stale, 1 inconsistent, 1 dead ref, 10 healthy | fixes applied: 7 (ENGINE_MAP S185→S206 stamp + Phase5-GenericCitizens disable annotations; ROLLOUT_PLAN Last Updated bump; engine.md rule annotations for disabled/deleted exception writers; SHEETS_MANIFEST staleness header; PHASE_42_INVENTORY snapshot-frozen header; ROLLOUT_PLAN_backup_S147 → docs/archive/; tracker row) | S206 commit (this) |
| 2026-05-08 | `/doc-audit media` | 28 media docs re-audited (~26 sessions after S180/S181 baseline); 3 research-build fixes + 4 prior-flagged handoffs still pending media-terminal | fixes applied: 3 (EDITION_PIPELINE.md S206 routing-foundation entry + Four-terminals → Five-terminals correction; AGENT_NEWSROOM.md S156→S206 stamp + content-verified note; output/DISK_MAP.md S180/181→S206 with new S206 artifact families catalogued) | S206 session-end commit |
| 2026-05-09 | `/doc-audit plans` | 31 plan files (10 new since S186 baseline); 7 frontmatter tag drifts (all changelog-says-shipped-but-tag-didn't-follow); 0 inconsistent / 0 dead refs / 24 healthy | fixes applied: 7 frontmatter tag flips (engine-routing-foundation + chaos-cars-engine draft→active; disk-inventory + phase-40-3-credential-audit + md-audit-skill active→complete; vote-trigger-mechanism + run-cycle-gap-log-surface draft→active) + meta-pattern followup filed in ROLLOUT (post-execution gate to catch tag drift between changelog status verbs and frontmatter tags) | S212 plans-audit commit |

---

## Cadence guidance

| Skill | When to run | Trigger heuristic |
|---|---|---|
| `/disk-audit` | On demand | Droplet >85% disk OR after large `output/` accumulation |
| `/disk-rotate` | Per-target on demand | Always after `/disk-audit` flags a recoverable bucket; never schedule |
| `/md-audit` | Monthly-ish | Or after large doc churn (post-archive sweep, post-plan retirement wave) |
| `/doc-audit` | Per-group on demand | Quarterly per group; or after architectural shifts touch a group's surface |

No skill in this registry runs on a schedule. All are manually invoked. Each gets verification gates before destructive action.

---

## Pattern — every audit skill MUST

1. **Produce a dated artifact** — either an MD report (`output/<skill>_<DATE>.md`) or a JSON manifest. Never log results only to stdout.
2. **Append a row to this file** — at the end of the skill's run, before declaring done. Mike-readable summary in 1 line.
3. **Never auto-delete** — destructive actions in `/disk-rotate` etc. require explicit `--apply --target X` per-target invocation.

---

## Changelog

- 2026-05-06 — Initial registry (S203, research-build). Pattern adopted to give standing maintenance jobs a home outside ROLLOUT_PLAN (which is for in-progress / open work). Bootstrapped with the `/disk-audit` first-run record + the manual `/disk-rotate` cleanup of S203.
