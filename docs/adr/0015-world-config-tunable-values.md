---
title: "ADR-0015: World_Config is the house for engine-tunable values — migrate on touch, not as a project"
created: 2026-08-01
updated: 2026-08-01
type: reference
tags: [architecture, engine, economy, decision, active]
sources:
  - "Mike rulings 2026-08-01 (this session): 'editing code for this is too much work when a world config can have every variable' / 'I wouldn't make a whole project out of it — as code is worked it should happen at that time' / 'no one gets anything for free in the sim, everything is earned'"
  - "docs/research/2026-08-01-simulation-realism-audit.md — findings 1–2: the 0.91 employment fallback and the uniform static 8% Growth_Rate are the canonical free-numbers violations"
  - "phase01-config/godWorldEngine2.js:591-608 — loadConfig_ loads every World_Config key→value row into ctx.config with numeric auto-parsing"
  - "phase05-citizens/processAdvancementIntake.js:220 — precedent for a standalone script reading World_Config directly"
  - "docs/SPREADSHEET.md — World_Config row (11 rows, ENGINE-owned; renamed from Simulation_Config)"
pointers:
  - "[[../plans/2026-08-01-business-lifecycle-generator]] — engine.96, first design built under this ADR (Task 3)"
  - "[[../research/2026-08-01-simulation-realism-audit]] — the audit that surfaced the free-numbers disease"
  - "[[../SPREADSHEET]] — World_Config tab contract; row-shape changes land same-commit"
  - "[[0016-data-ledgers-are-the-truth-source]] — sibling doctrine: this ADR governs tunable VALUES, that one governs canonical ENTITY SETS (data ledgers)"
  - "[[../index]] — registered same commit"
---

# ADR-0015: World_Config is the house for engine-tunable values — migrate on touch, not as a project

**Status:** Accepted (decision); application is opportunistic, not scheduled
**Date:** 2026-08-01
**Deciders:** Mike (direct rulings this session), Kimi CLI (drafted)

## Context

The simulation realism audit (2026-08-01) found that the sim's unrealistic-data complaints trace to **free numbers**: `updateNeighborhoodDemographics.js:68` hardcodes `demographicDrift.employmentRate || 0.91` (nothing ever writes a real rate, so it is always 0.91), and every sampled business carries an identical static 8% `Growth_Rate` seeded at mint and never written again. Tunables that do exist are scattered: a ~2,180-line static JSON salary table (`data/economic_parameters.json`), constants embedded in scripts, and one-off config files. Changing any of them requires a code edit and a deploy.

Meanwhile `World_Config` already exists and already does the job: an ENGINE-owned key→value sheet (11 rows today — `cycleCount`, `lastRun`, `sportsState_Oakland`, …) that `loadConfig_` (`phase01-config/godWorldEngine2.js:591-608`) reads every cycle into `ctx.config` with numeric auto-parsing. A value in World_Config is tunable by cell edit, live next cycle, with no code change and no deploy.

Mike's rulings this session:

- **"Editing code for this is too much work when a world config can have every variable here so they are easily changed."**
- **"I wouldn't make a whole project out of it — it'll require pointing the code at world config, so as code is worked it should happen at that time."**
- Companion doctrine: **"In a deterministic sim, static numbers are getting things for free. Strict rule: no one gets anything for free in the sim — everything is earned."**

## Decision

1. **World_Config is the canonical home for engine-tunable values.** New systems put their tunables there as key→value rows, namespaced by domain prefix (e.g. `bizDriftBound_*`, `bizClosureThreshold`). Engine phases read them from `ctx.config` via the existing `loadConfig_` — no new read path. Standalone scripts that need tunables read the sheet directly (`processAdvancementIntake.js:220` precedent).
2. **Migration is opportunistic, never a project.** When code is touched for any reason, hardcoded tunables in that code move to World_Config in the same change. There is no migration sweep, no dedicated row, no deadline. Values that are never touched stay where they are.
3. **Everything is earned.** A World_Config value is *starting calibration*, not a permanent constant. In operation, modifiers must derive from live sim state (retail vitality, approval trends, coverage, competitive density) — the config sets bounds and windows, the sim earns the values. This rules out new static fallbacks of the 0.91/8% class.
4. **Missing keys fail loud, never silently default.** A silent default is the 0.91 disease in a new home. Consumers assert required keys at bench/startup and raise on absence.
5. **Doc propagation rides the existing rule.** World_Config row-shape changes update `docs/SPREADSHEET.md` in the same commit; per the 2026-08-01 doc-propagation ruling (AGENTS.md §Subagent cost discipline), the mechanical correlating-MD updates are subagent-tier work, lead reviews.

**What this decision does NOT do:** it does not mandate touching `data/economic_parameters.json` or any other existing config that no current work crosses; it does not add a runtime dependency for paths that never tune; it does not change `loadConfig_` itself.

## Consequences

**Positive.**
- Mike tunes the sim by editing a cell; the change is live next cycle. No code edit, no clasp push, no deploy gate.
- One visible, greppable home for "what can I tune" — the sheet itself is the inventory.
- Determinism is preserved: config is read once at cycle start; all downstream draws stay seeded.
- The everything-is-earned rule gives the realism build order (engine.83→96) a single testable standard: a value that never moves is a bug class, not a design choice.

**Risks / costs.**
- **Two homes during transition.** Constants stay in code until touched; a reader must check both. Accepted — bounded by the migrate-on-touch rule and by namespacing (`World_Config` keys are prefixed, so "is this tunable?" is answerable by one lookup).
- **World_Config grows without bounds.** Mitigated by domain prefixes and by the fact that only *tunable* values belong — structural constants (schema shapes, column maps) stay in code where their consumers can fail fast on drift.
- **`loadConfig_` itself is silent** when the sheet is missing (`if (!cached.exists) return;`). The fail-loud requirement therefore sits on the *consumers* of each key, not the loader — bench tests must assert presence.
- Sheet-edit mistakes (typos, wrong types) bypass code review. Mitigated by numeric auto-parsing, fail-loud consumers, and the SPREADSHEET.md same-commit documentation rule.

**Rejected alternatives.**
- **Big-bang migration project.** Rejected by Mike directly: "I wouldn't make a whole project out of it." A sweep would touch dozens of working code paths for zero behavioral gain and maximum regression surface.
- **New code config files per system** (the dropped `utilities/businessDynamicsConfig.js` design). Contradicts the ruling — every new file is another thing Mike can't tune without a deploy.
- **JSON config for new tunables** (the `economic_parameters.json` pattern). Editable without a code change but not without a deploy, invisible from the sim's operating surface, and historically a place static numbers go to be forgotten (the 8% Growth_Rate lived exactly this way).

## Changelog

- 2026-08-01 — Initial draft (Kimi CLI, Mike rulings this session). First application: engine.96 Task 3 (business-dynamics thresholds as `World_Config` keys).
