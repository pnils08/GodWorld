---
title: Civic solo seats Plan
created: 2026-08-07
updated: 2026-08-07
type: plan
tags: [media, civic, active]
sources:
  - Mike-direct 2026-08-07 — same shape as sports solo seats; multi-voice desk wrong by design
  - .claude/agents/civic-desk/IDENTITY.md — five-reporter source
  - docs/plans/2026-08-07-anthony-hal-solo-sports-seats.md — sibling pattern
  - docs/plans/2026-08-06-jax-sim-stink-audit.md — persona solo-seat architecture
pointers:
  - "[[engine/ROLLOUT_PLAN]]"
  - "[[media/CARMEN_ACCRETION_BAG]]"
  - "[[media/LUIS_INVESTIGATION_BAG]]"
  - "[[media/TREVOR_SYSTEMS_BAG]]"
  - "[[media/TORRES_SAFETY_BAG]]"
  - "[[media/MEZRAN_HEALTH_BAG]]"
---

# Civic solo seats Plan

**Goal:** Civic desk five bylines run as **solo persona seats** on M–F crons — each with own MD stack + concept bag — not soft multi-voice civic-desk average. Legacy `civic-desk` remains for edition/deep multi-reporter work.

| Seat | Slug | POPID | Domain | Bag |
|------|------|-------|--------|-----|
| Civic ledger | `carmen-delaine` | POP-00011 | CIVIC | Accretion |
| Investigations | `luis-navarro` | POP-00636 | CIVIC | Investigation |
| Transit / infra | `trevor-shimizu` | POP-00155 | INFRASTRUCTURE | Systems |
| Public safety | `rachel-torres` | POP-00057 | SAFETY | Safety |
| Health | `lila-mezran` | POP-00154 | HEALTH | Health |
| (prior) Stink | `freelance-firebrand` | POP-00799 | ACCOUNTABILITY | Jax (already solo) |

**Architecture:** persona slug → IDENTITY/LENS/RULES + wall + bag hard-inject. Fanout reverse-maps POPID → persona when assigned.

**Terminal:** scripts + docs (grok). Control-plane agent packages land via Claude `CLAUDE_CTL=1`.

**Acceptance criteria:**
1. `persona-map.json` maps all five slugs.
2. `desk-model-map.json` routes (DeepSeek default).
3. Writer stance + bag inject per persona.
4. Lane stance in `cron-desk-run.js`.
5. Five bags registered in `docs/index.md`.
6. Agent packages on disk; Claude lands control plane.
7. `civic-desk/` multi-voice **not deleted**.

---

## Tasks

### Task 1: Maps + bags + writer inject
- **Status:** [x] done (grok 2026-08-07)

### Task 2: Solo agent packages on disk
- **Status:** [x] on disk; [ ] Claude land commit

### Task 3: Live observe
- Fanout assigns civic POPIDs with `[persona: …]` + single-voice draft
- **Status:** [ ] open

### Task 4: civic-desk legacy note (media)
- Headless path = personas; multi-voice edition-only until migrated
- **Status:** [ ] media terminal

---

## Status log

- 2026-08-07 (grok) — Five solo seats + bags + maps + hard inject; agent packages on disk for Claude.

## Changelog

- 2026-08-07 (grok) — Initial plan; Tasks 1–2 scripts/docs shipped.
