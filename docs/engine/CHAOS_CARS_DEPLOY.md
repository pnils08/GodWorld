---
title: Chaos-Cars (engine.11) — C99-Gated Deploy Runbook
created: 2026-06-20
updated: 2026-06-20
type: runbook
tags: [engine, deploy, chaos-cars, active]
sources:
  - "[[plans/2026-05-07-chaos-cars-engine]] §S265 — design + cross-terminal build split (parent spec)"
  - "[[ROLLOUT_PLAN]] engine.11 row — rollout pointer"
pointers:
  - "[[plans/2026-05-07-chaos-cars-engine]] — parent plan; this runbook stages its deploy"
  - "[[ROLLOUT_PLAN]] — engine.11 row points here for the deploy procedure"
  - "[[../../SESSION_CONTEXT]] NEXT[engine-sheet] — deploy-gate status line"
---

# Chaos-Cars (engine.11) — C99-Gated Deploy Runbook

**Status (S265):** ✅ **CLASP-DEPLOYED LIVE S265 (Mike go-call).** Gate cleared — engine.38 Phase A smoke-tested CLEAN 5/5 at C99 (deploy-attribution discipline honored, S250). Pre-deploy gates re-verified green on tree (323/323 tests, 0 collisions, single config source, `.test.js` excluded), `clasp push` exit 0, 5 new + 5 modified files verified in Tracked scope / test files in Untracked. **SMOKE PENDING C100** (first chaos cycle — see §Post-deploy smoke). Built on 8 commits `486d070a`→`8822e6b5` (origin/main).

---

## ⛔ GATE — must clear FIRST (do not push until this passes)

**engine.38 Phase A must smoke-test clean at C99.** Pass criteria:

- `node scripts/coverageReport.js 1` (post-C99 ledger) → ~60–80% distinct-citizen coverage
- B3 regime-shift guard **fires once by design** (52→600 event jump) and self-clears C100 — *not a bug*
- `LifeHistory_Log` archiver dormant until >12k rows
- Riley_Digest patternFlag **not** pinned to strain (B2 relative thresholds)
- Named citizens (Vinnie/Mags etc.) appear in coverage

Only after engine.38 C99 verdict = clean → proceed.

---

## ✅ Pre-deploy gates (re-run on tree before push)

- [ ] **Tests green** — 323 assertions across 6 suites (re-run; were green S265):
  - `phase04-events/chaosCarsEngine.test.js` (30) · `phase05-citizens/applyChaosDecay.test.js` (8) · `phase10-persistence/saveChaosCars.test.js` (10) · `utilities/chaosCarsConfig.test.js` (236) · `utilities/chaosCarsDecay.test.js` (25) · `phase07-evening-media/storylineWeavingEngine.chaos.test.js` (14)
- [ ] **Collisions clean** — `node scripts/auditFunctionCollisions.js` → 0
- [ ] **Single config source** — only `utilities/chaosCarsConfig.js` exists (the old `lib/` copy was relocated, not duplicated; no dual-sync hazard)
- [ ] **`.claspignore` excludes all `*.test.js`** — the S257 `require`-at-load crash lesson; confirm no test file rides the push

---

## 📦 Deploy surface — 10 Apps Script files clasp pushes

| File | Role |
|---|---|
| `phase04-events/chaosCarsEngine.js` | **NEW** — producer / generator |
| `phase10-persistence/saveChaosCars.js` | **NEW** — ledger writer |
| `phase05-citizens/applyChaosDecay.js` | **NEW** — decay applier |
| `utilities/chaosCarsConfig.js` | **NEW** — vehicle config (clasped dual-use) |
| `utilities/chaosCarsDecay.js` | **NEW** — decay lib |
| `phase01-config/godWorldEngine2.js` | T3.13 wiring (both entry blocks) |
| `phase05-citizens/gentrificationEngine.js` | T1.5 gentrification NM-writeback clobber fix |
| `phase08-v3-chicago/v3NeighborhoodWriter.js` | neighborhood-fold verify-fix |
| `phase07-evening-media/storylineWeavingEngine.js` | T5.x cascade |
| `phase07-evening-media/applyStorySeeds.js` | cascade |

**NOT pushed (claspignored, correctly):** all 6 `*.test.js`, `scripts/auditFunctionCollisions.js`, all `docs/*.md`.

**No orphan deletes from engine.11** — every file is new or modified, none removed → clean push, no manual editor delete owed *for chaos-cars*.

*(Separate, pre-existing owed cleanup — natural to do in the same editor window: the 2 manual deletes `generateNamedCitizensEvents.gs` [engine.38 A3 orphan] + `applyCycleWeightForLatestCycle.gs` [S238]. Both dead code, harmless if left. Not chaos-cars.)*

---

## 🚀 Deploy

1. Re-run the pre-deploy gates above.
2. `/deploy` (clasp push + verify) — or manual `clasp push`.
3. Expect idempotent confirm on a clean re-push: *"Script is already up to date."*
4. Record in SESSION_CONTEXT PIN: engine.11 deployed live + smoke-test pending next cycle.

---

## 🔬 Post-deploy smoke (first cycle AFTER engine.11 lands)

- `Chaos_Cars` tab **lazy-creates on first run** (ensure-tab intent) — verify it appears
- 3–15 chaos events/cycle (variable bounded)
- Sentiment/CrimeIndex swings on **live 0–1 scale** (Mike-approved scale fix)
- Asymmetric decay applies (positive fast, negative slow)
- Neighborhood fold **consumes, not accumulates** (the verify-fix — PropertiesService residual, T8 pattern) — check NM writeback
- Tier-1 hit → `createChaosArcs_` seeds a cascade arc
- **WATCH Q3:** chaos-arc ↔ arcLifecycle interaction (StaleAfterCycles=6 mitigation — observe)
- **Known caveat** (pre-existing, NOT introduced by engine.11): `weaveStorylines_` wired in the production block only, not cycle-phases (`applyStorySeeds_` is in both)

---

## 🔓 Unblocks (cross-terminal — research-build)

Once the producer is live, research-build authors **T5.2** (build-world-summary `## Chaos Events` emitter) / **T5.3** (city-hall-prep chaos-cascade rule) / **T6.1–6.3** (dry-run / magnitude / frequency validators) against the first real synthetic Tier-1 event. The Cascade Hard-Constraint ("all four outputs live") closes across both terminals.
