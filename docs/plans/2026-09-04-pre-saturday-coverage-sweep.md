---
title: Pre-Saturday Coverage Sweep Plan
created: 2026-09-04
updated: 2026-09-04
type: plan
tags: [pipeline, newsroom, active]
sources:
  - scripts/preSaturdayCoverageSweep.js (S417, Mike-direct)
  - scripts/preSaturdayCoverageSweep.test.js
  - scripts/reconcileRheaDisposition.js
  - claude-mem observation 60114 (S417 rollout review — flagged as unregistered)
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — parent rollout, pipeline.64"
  - "[[../SCHEMA]] — doc conventions"
  - "[[../index]] — added same commit"
---

# Pre-Saturday Coverage Sweep Plan

**Goal:** No reporter's piece silently misses the Saturday compile because a write-stage subprocess crashed or a Rhea verdict never got filed — an automated retry + reconcile pass runs before the 16:00 compile locks the cycle, and a persona still uncovered after that is visible (not just mentioned) to whoever reviews the run.

**Architecture:** `scripts/preSaturdayCoverageSweep.js` runs Saturday 12:00 via cron, ahead of the 16:00 compile. It first runs `reconcileRheaDisposition.js` for the live cycle (files any standalone Rhea verdict that crashed or was hand-reviewed but never filed into staged/flagged). It then scans `output/cron-compare/` for personas with a finished report/angle artifact but no `.staged.*` pair and no output younger than `--min-age-hours` (default 8h, clears the normal ~5h report→write gap without preempting a persona's own still-to-come scheduled wake), and re-runs the existing one-off recovery (`cron-desk-run.js --stage=write --desk <D> --persona <P>`) for each. An attempted-list file makes both passes idempotent within a cycle — safe to re-run by hand.

**Terminal:** research-build

**Pointers:**
- Cron entry: `crontab -l` → `0 12 * * 6 … preSaturdayCoverageSweep.js` (tagged `pipeline.64` inline)
- Tests: `scripts/preSaturdayCoverageSweep.test.js`
- Related: `scripts/reconcileRheaDisposition.js` (existed pre-S417, was on no schedule — this cron is its first)

**Acceptance criteria:**
1. Saturday 12:00 cron fires unattended and exits without error.
2. A persona whose write crashed after report but before staging gets retried automatically and lands a `.staged.*` pair before 16:00.
3. A persona still uncovered after retry shows up in the status file (not just a Discord ping) so it's inspectable after the fact.

---

## Tasks

All tasks shipped S417 — none open. Left as `## Status log` below for a fresh session to verify without reconstructing history.

---

## Status log

### S417 — built + first live run (2026-09-04)

Built `scripts/preSaturdayCoverageSweep.js` + `.test.js`, wired `reconcileRheaDisposition.js` into it as the first pass, installed the Saturday 12:00 cron entry. First live run against the real cycle: fixed real drift (Hal Richmond, Nia Rook retried and staged clean). 2 pieces (Trevor Shimizu, Mason Ortega) stayed flagged — traced to a nested-session gate-parse artifact in how the run's own status file was read, not a defect in the sweep or in either reporter's actual write. The session's attempted-marker was cleared afterward so tomorrow's real Saturday firing gets a clean, unbiased first pass rather than replaying the traced artifact.

### S418 — registered in ROLLOUT_PLAN (2026-09-04)

Filed as `pipeline.64`, `in-progress` (not `done-pending-archive`): the fix landed and one live run confirmed the core retry mechanism, but acceptance per [[feedback_no-manual-pipeline-demos]] is the next *unattended* Saturday firing, not this hand-observed one. Close the row once a Saturday cron run confirms clean without the traced gate-parse artifact recurring.

---

## Open questions

None — the S417 build is complete; the only remaining step is passive (watch the next unattended Saturday run).

---

## Changelog

- 2026-09-04 — Initial plan filed retroactively (S418, research-build). Work itself shipped S417; this doc + the ROLLOUT_PLAN row were the missing registration, blocked at the time by the rollout lint's then-292 non-conforming legacy rows (cleared same session — see [[../engine/ROLLOUT_PLAN]] S418 archive pass).
