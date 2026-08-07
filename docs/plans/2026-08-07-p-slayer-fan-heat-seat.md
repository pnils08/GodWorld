---
title: P Slayer fan-heat seat Plan
created: 2026-08-07
updated: 2026-08-07
type: plan
tags: [media, sports, p-slayer, active]
sources:
  - Mike-direct 2026-08-07 — Paulson gate wrong for M–F crons; multi-voice sports-desk wrong by design; build like Jax
  - docs/media/voices/p_slayer.md
  - docs/media/P_SLAYER_JOURNEY_INDEX.md
  - docs/plans/2026-08-06-jax-sim-stink-audit.md — parallel heat-seat architecture
pointers:
  - "[[engine/ROLLOUT_PLAN]]"
  - "[[2026-08-06-jax-sim-stink-audit]] — sibling heat seat (sim stink vs fan heat)"
  - "[[../media/voices/p_slayer]]"
---

# P Slayer fan-heat seat Plan

**Goal:** P Slayer (POP-00008) runs as a **solo heat seat** on M–F crons like other Tribune writers — die-hard fan charge (hate the signing → I was wrong), not soft multi-voice sports-desk average. Paulson owns long-form interview *depth*, not daily-wake exclusion.

**Architecture:** Parallel to Jax: persona `p-slayer` + IDENTITY/LENS/RULES + wall hard-inject + sports domain in fanout. Legacy `sports-desk` multi-voice remains for edition/deep work until media migrates; **effective headless path is persona-only**.

**Terminal:** scripts (grok) + Claude land for control-plane agent package if commit-gated.

**Acceptance criteria:**
1. `buildBylineRoster` **includes** P Slayer / Anthony / Tanya / sports RoleTypes with `beatDomain: SPORTS` (not excluded Paulson domain).
2. Fanout sports quota draws from `SPORTS` pool (not GENERAL-only fallback).
3. `--persona p-slayer` loads solo agent files + Llama heat model + wall inject.
4. Plan documents three-voice-one-skill failure mode.

---

## Tasks

### Task 1: Unlock sports writers for M–F fanout

- **Files:** `scripts/engine-auditor/bayTribuneRoster.js`, `scripts/newsroom-fanout.js`, `scripts/cron-desk-run.js` LANE_DOMAINS
- **Status:** [x] done (grok 2026-08-07) — SPORTS domain included; DESK_DOMAINS.sports = ['SPORTS']

### Task 2: Solo persona package + map

- **Files:** `.claude/agents/p-slayer/*`, `scripts/persona-map.json`, `scripts/desk-model-map.json`, writer heat block
- **Status:** [x] agent on disk + maps; control-plane commit may need Claude land

### Task 3: Fan-pulse slice (like Jax stink slice)

- **Files:** future `scripts/buildPSlayerSlice.js` or sports-signal pack
- **Steps:** Roster move / loss / quiet win / prospect blocked → charge brief + wall prior takes
- **Status:** [ ] not started — next build

### Task 4: Weekend life wakes

- **Note:** P.Slayer is already a ledger citizen; citizen-wake rotation can include him if not filtered. Verify wake pool includes Tribune POPIDs; no special exclude.
- **Status:** [ ] verify + document

### Task 5: Sports-desk legacy

- **Status:** [ ] media terminal: mark multi-voice sports-desk as legacy for headless; point crons at personas (p-slayer, later anthony if needed)

---

## Status log

- 2026-08-07 (grok) — Paulson cron-exclude reversed; p-slayer persona + agent package; plan filed.
- 2026-08-07 (grok) — Sibling seats filed: [[2026-08-07-anthony-hal-solo-sports-seats]] (Anthony analytic + Hal legacy).

## Changelog

- 2026-08-07 (grok) — Initial plan + Tasks 1–2 shipped in scripts; agent package on disk.
- 2026-08-07 (grok) — Pointed sibling plan for anthony-raines + halsolo seats.
