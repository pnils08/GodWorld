---
title: Jax Caldera sim stink-audit Plan
created: 2026-08-06
updated: 2026-08-06
type: plan
tags: [media, architecture, accountability, firebrand, active]
sources:
  - docs/research/2026-08-06-jax-caldera-sim-stink-audit.md — research basis (verdict adopt)
  - docs/plans/2026-07-20-headless-newsroom-pipeline.md — persona path + three-wake already built
  - Mike-direct 2026-08-06 — product is stink-audit→journalism; Jax is Grok character; not civic watchdog
pointers:
  - "[[engine/ROLLOUT_PLAN]] — parent rollout"
  - "[[../research/2026-08-06-jax-caldera-sim-stink-audit]] — research basis"
  - "[[SCHEMA]] — doc conventions"
  - "[[index]] — registered same commit"
---

# Jax Caldera sim stink-audit Plan

**Goal:** When the sim stinks (metric contradictions, unattended crisis signals, implementation gaps), Jax Caldera (`freelance-firebrand`, POP-00799) is force-scheduled at most once per week with firebrand approach text and a stink-seeded story — not buried under civic process timelines.

**Architecture:** Deterministic `scripts/stink-scanner.js` scores `desk_signal` + world_summary illness. `newsroom-fanout.js` applies a **force-slot** after the normal LRU rota when score ≥ threshold and 7-day cooldown is clear. Persona approach key in `desk-approach-map.json` overrides civic framing. Angle wake in `cron-desk-run.js` leads persona+story with the stink seed. **No `.claude/agents/` edits** (control plane) — agent IDENTITY/LENS stay; scripts realize the product.

**Terminal:** research-build design + engine-sheet-adjacent scripts; executed by **grok** (out-of-band) in authorized `scripts/**` + `docs/**`. Media does not own the detector.

**Pointers:**
- Research basis: [[../research/2026-08-06-jax-caldera-sim-stink-audit]]
- Prior machinery: [[2026-07-20-headless-newsroom-pipeline]] Task 2.2 / 2.3
- Related: [[../research/2026-08-04-mags-as-narrator]] (accountability seat required)

**Acceptance criteria:**
1. `node scripts/stink-scanner.js --cycle 102` emits candidates; maxScore ≥ 35 on live c102-like signal; writes `output/cron-compare/stink_c102.json`.
2. Fanout with stink above threshold and clear cooldown produces one assignment with `persona: freelance-firebrand`, `stinkForce: true`, firebrand approach string, story from top stink.
3. Within 7 days of a force, a second day does **not** force again.
4. Non-persona desks unchanged in approach text; scanner failure does not break fanout.
5. Unit tests pass offline (no Sheets required for scanner tests).

---

## Blast radius (measure-twice)

| Surface | Change | Risk if half-built | Mitigation |
|---------|--------|--------------------|------------|
| `scripts/stink-scanner.js` | NEW | none alone | pure + CLI + report write |
| `scripts/newsroom-fanout.js` | force after LRU | civic body loses a slot on force days; wrong force spam | cooldown 7d; threshold 35; try/catch non-fatal |
| `scripts/desk-approach-map.json` | persona key | none if key unused | only when `assignment.persona` set |
| `scripts/cron-desk-run.js` | persona+story angle ask | persona free-digest path changes | roster path untouched |
| `.claude/agents/freelance-firebrand/**` | **not touched** | N/A | control plane |
| Engine bylineIneligible | **not touched** | engine seeds still skip Jax | intentional; force is the override |
| Crontab | **not touched** | fanout already runs 06:15 | force rides existing job |

**Undone-process rule:** force-slot, approach override, and persona angle ask ship together. Scanner-only without fanout wire is not done. Fanout wire without approach override reintroduces stance dilution.

---

## Tasks

### Task 1: Stink scanner module + tests

- **Files:**
  - `scripts/stink-scanner.js` — create
  - `scripts/stink-scanner.test.js` — create
- **Steps:**
  1. Score desk_signal anomalies (math-imbalance, stuck-initiative, repeating-event, …).
  2. Parse world_summary illness %; ≥8% → crisis-unattended candidate.
  3. `FORCE_THRESHOLD = 35`, `FORCE_COOLDOWN_DAYS = 7`.
  4. Offline tests; CLI writes `stink_c{N}.json`.
- **Verify:** `node scripts/stink-scanner.test.js` → PASS; `node --check scripts/stink-scanner.js`
- **Status:** [x] done (grok 2026-08-06)

### Task 2: Firebrand approach map key

- **Files:**
  - `scripts/desk-approach-map.json` — modify
- **Steps:**
  1. Add `freelance-firebrand` approach (stink-audit, not official timeline).
- **Verify:** JSON parse; fanout unit asserts persona beats desk
- **Status:** [x] done (grok 2026-08-06)

### Task 3: Fanout force-slot

- **Files:**
  - `scripts/newsroom-fanout.js` — modify
  - `scripts/newsroom-fanout-stink.test.js` — create
- **Steps:**
  1. `approachFor(map, desk, persona)` — persona key wins.
  2. `applyStinkForce` after LRU build; upgrade Jax or replace first civic.
  3. Emit `stinkForce` metadata on fanout JSON; write stink report.
  4. Cooldown excludes build date (same-day `--force` re-seed ok).
- **Verify:** `node scripts/newsroom-fanout-stink.test.js`; `node --check scripts/newsroom-fanout.js`
- **Status:** [x] done (grok 2026-08-06)

### Task 4: Persona angle ask uses stink seed

- **Files:**
  - `scripts/cron-desk-run.js` — modify `runAngle`
- **Steps:**
  1. When `persona && story`, ask leads with STINK + class + firebrand approach (not free digest-only, not civic fixed-angle template).
  2. Roster `!persona && story` path unchanged.
- **Verify:** `node --check scripts/cron-desk-run.js`; existing `cronDeskFanoutHandoff.test.js` still PASS
- **Status:** [x] done (grok 2026-08-06)

### Task 5: Docs registration + research pointer

- **Files:**
  - `docs/plans/2026-08-06-jax-sim-stink-audit.md` — this file
  - `docs/index.md` — register plan
  - `docs/research/2026-08-06-jax-caldera-sim-stink-audit.md` — Ignited plans
  - `docs/engine/ROLLOUT_PLAN.md` — pipeline row (pointer only)
- **Status:** [x] in this change (grok 2026-08-06)

### Task 6: Live dry observation (no new cron)

- **Steps:**
  1. `node scripts/stink-scanner.js --cycle 102` on droplet with artifacts.
  2. Optional: `node scripts/newsroom-fanout.js --date YYYY-MM-DD --force` only with builder OK (mutates today's fanout file).
- **Status:** [x] scanner + samples observed; cron schedule never modified

### Task 7: Jax stink slice (Grok-owned — not Mags desk-slice)

- **Files:**
  - `scripts/buildJaxSlice.js` — create
  - `scripts/buildJaxSlice.test.js` — create
  - `scripts/stink-scanner.js` — emit slice after scan
  - `scripts/cron-desk-run.js` — persona loads slice for angle/state
  - `scripts/newsroom-fanout.js` — force-slot enriches from slice
  - `scripts/canon-name-check.js` — richer profiles (employerBiz, skills)
- **Steps:**
  1. Emit `output/slices/c{N}/firebrand.md` + `output/cron-compare/jax_slice_c{N}.json`
  2. Pack: top stink, contradiction A/B, citizens with RoleType, bonds, scene color (weather, neighborhood_texture, Who Lived It, Chaos_Cars)
  3. Document ledger gaps for deeper color (Business name resolve, Cultural venues, Faith, LifeHistory depth, bond export freshness)
  4. Wire persona path to prefer slice over free civic firehose
- **Verify:** `node scripts/buildJaxSlice.test.js`; `node scripts/buildJaxSlice.js --cycle 102`
- **Status:** [x] done (grok 2026-08-07)

---

## Open questions

- Threshold 35 / illness 8% / 7-day cooldown remain knobs.
- Business_Ledger name/address join + Cultural_Ledger venues-by-hood are the top color deepeners.

---

## Status log

- 2026-08-06 (grok) — Plan + Tasks 1–5 implemented in same change. Control plane agent files untouched. Engine bylineIneligible left intentional.
- 2026-08-07 (grok) — Task 7 Jax stink slice + scene pack + gap inventory; heat model Llama 3.3; NEXT[grok] tracking.

---

## Changelog

- 2026-08-06 (grok) — Initial plan + implementation of scanner, force-slot, approach, angle ask. Research basis adopted.
- 2026-08-07 (grok) — Jax-owned slice (not Mags); scene color from texture/weather/chaos/bonds; ledger gap list for color depth.
