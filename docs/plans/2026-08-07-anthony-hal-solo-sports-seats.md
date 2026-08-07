---
title: Anthony + Hal solo sports seats Plan
created: 2026-08-07
updated: 2026-08-07
type: plan
tags: [media, sports, anthony-raines, hal-richmond, active]
sources:
  - Mike-direct 2026-08-07 — same pattern as P Slayer; multi-voice sports-desk wrong by design
  - docs/media/voices/anthony.md
  - docs/media/voices/hal_richmond.md
  - docs/plans/2026-08-07-p-slayer-fan-heat-seat.md — sibling sports heat/analytic seats
  - docs/plans/2026-08-06-jax-sim-stink-audit.md — persona solo-seat architecture
pointers:
  - "[[engine/ROLLOUT_PLAN]]"
  - "[[2026-08-07-p-slayer-fan-heat-seat]] — sibling (fan heat)"
  - "[[../media/voices/anthony]]"
  - "[[../media/voices/hal_richmond]]"
---

# Anthony + Hal solo sports seats Plan

**Goal:** Anthony Raines (POP-00017) and Hal Richmond (POP-00007) run as **solo persona seats** on M–F crons — analytic beat and legacy historian — not soft multi-voice sports-desk average. Completes the three-seat sports split with P Slayer (fan heat).

**Architecture:** Same as Jax / P Slayer: persona slug → IDENTITY/LENS/RULES + wall hard-inject + SPORTS domain already unlocked in fanout. Legacy `sports-desk` multi-voice remains for edition/deep work until media migrates; **effective headless path is persona-only** when fanout assigns these POPIDs.

| Seat | Slug | POPID | Product | Model band |
|------|------|-------|---------|------------|
| Fan heat | `p-slayer` | POP-00008 | Die-hard charge | Llama 3.3 70B |
| Analytic | `anthony-raines` | POP-00017 | Roster architecture | DeepSeek |
| Legacy | `hal-richmond` | POP-00007 | Era / dynasty river | DeepSeek |
| (prior) Stink | `freelance-firebrand` | POP-00799 | Sim BS audit | Llama 3.3 70B |

**Terminal:** scripts + docs (grok). Control-plane agent packages (`.claude/agents/{anthony-raines,hal-richmond,p-slayer}/`) land via Claude `CLAUDE_CTL=1`.

**Acceptance criteria:**
1. `persona-map.json` maps both slugs → name + POPID + SPORTS.
2. `desk-model-map.json` routes both (DeepSeek analytic/literary default).
3. `cron-desk-writer.js` stance blocks prevent multi-voice average.
4. `cron-desk-run.js` lane stance for sports personas.
5. Fanout reverse-map tags assignment when byline POPID matches (automatic via persona-map).
6. Agent packages on disk at full solo-seat quality; Claude commits control plane.

---

## Tasks

### Task 1: Persona map + model map

- **Files:** `scripts/persona-map.json`, `scripts/desk-model-map.json`
- **Status:** [x] done (grok 2026-08-07)

### Task 2: Writer + lane stance blocks

- **Files:** `scripts/cron-desk-writer.js`, `scripts/cron-desk-run.js`
- **Status:** [x] done (grok 2026-08-07)

### Task 3: Solo agent packages

- **Files:** `.claude/agents/anthony-raines/*`, `.claude/agents/hal-richmond/*`
- **Status:** [x] done — on disk (grok); landed via CLAUDE_CTL commit `0d2179b4` (S357 design review, 2026-08-07)

### Task 4: Live observe

- **Steps:** Wait for sports fanout to assign Anthony or Hal; confirm `[persona: anthony-raines|hal-richmond]` + wall inject + single-voice draft
- **Status:** [ ] open

### Task 5: Sports-desk legacy note (media)

- **Status:** [ ] media terminal: headless path = personas; multi-voice sports-desk edition-only until migrated

---

## Status log

- 2026-08-07 (grok) — Solo packages + maps + stance wired; control-plane commit needs Claude.
- 2026-08-07 (grok) — Anthony Analysis Bag: `docs/media/ANTHONY_ANALYSIS_BAG.md` + hard inject in cron-desk-writer; voice file remapped to ledger stats.

## Changelog

- 2026-08-07 (grok) — Initial plan; Tasks 1–2 shipped in scripts; Task 3 agent packages on disk.
- 2026-08-07 (grok) — Anthony go-to analysis bag (As_Roster/TrueSource/feed-aligned).
- 2026-08-07 (mags, research-build S357) — Task 3 closed: agent packages design-reviewed and landed, commit `0d2179b4`. Remaining: Tasks 4 (live observe) + 5 (media legacy note).
