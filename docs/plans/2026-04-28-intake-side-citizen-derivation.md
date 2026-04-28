---
title: Intake-Side Citizen Derivation
created: 2026-04-28
updated: 2026-04-28
type: plan
tags: [engine, citizens, architecture, draft]
sources:
  - docs/engine/ROLLOUT_PLAN.md §Open Work Items ("DESIGN: Lifecycle defaults..." line 66 + "DESIGN: RoleType preferred upon intake" line 67)
  - docs/engine/ENGINE_REPAIR.md Row 4 (lifecycle defaults DONE S184) + Row 17 (RoleType sentinel DONE S184)
  - phase05-citizens/processAdvancementIntake.js (Path B fallback shipped S184)
  - phase07-evening-media/mediaRoomIntake.js (upstream writer with 'Citizen' literal)
  - scripts/backfillLifecycleDefaults.js (djb2 + CDF reference implementation)
  - data/economic_parameters.json (S69 — 198-entry profile pool)
pointers:
  - "[[engine/ROLLOUT_PLAN]] — parent rollout"
  - "[[engine/ENGINE_REPAIR]] — Rows 4 + 17 are the prequel"
  - "[[SCHEMA]] — doc conventions"
  - "[[index]] — register in same commit"
---

# Intake-Side Citizen Derivation

**Goal:** Specify where + how citizen demographic fields (RoleType, EducationLevel, Gender) and lifecycle defaults (YearsInCareer, DebtLevel, NetWorth, MaritalStatus, NumChildren) get computed at intake time, so new citizens land with realistic values instead of empty cells or hardcoded sentinels. The demographic-voice fallback in `processAdvancementIntake.js` (Path B, S184) stays as defense-in-depth; this plan moves the work upstream where it belongs.

**Architecture:** Three-step pattern — **(1)** audit upstream intake writers for where each field is currently set / hardcoded / missed, **(2)** choose canonical computation source per field type (`data/economic_parameters.json` 198-entry profile pool vs live-ledger frequency draws vs agent-curated assignment, possibly hybrid), **(3)** specify intake-side derivation logic — neighborhood-aware where applicable, deterministic per-(first,last,popId) via djb2 hash (matches Path B pattern). The `scripts/backfillLifecycleDefaults.js` djb2 + age-bracket CDF approach is the reference implementation; this plan ports its logic to Apps Script intake-side. The S184 Path B fallback in `processAdvancementIntake.js` is preserved unchanged — it catches anything that slips past upstream computation.

**Terminal:** research-build (this plan + spec + canonical source decisions); engine-sheet (intake-writer changes per spec).

**Pointers:**
- S184 Row 4 close (lifecycle backfill): one-time backfill across 600+ existing citizens via `scripts/backfillLifecycleDefaults.js`. Top-value share dropped 95-99% → 2.6-49.6%. Forward-looking gap remains.
- S184 Row 17 close (RoleType sentinel): `phase05-citizens/processAdvancementIntake.js` Path B — 65-role `DEMOGRAPHIC_VOICE_ROLES` pool, deterministic per-(first,last,popId) djb2 hash, fires only when `rawRole` is empty.
- **Upstream sentinel finding:** `phase07-evening-media/mediaRoomIntake.js:591` hardcodes `'Citizen'` literal for new media-introduced citizens routed to Intake sheet. Since `'Citizen'` is truthy, the Path B fallback in `processAdvancementIntake.js` would NOT fire on this path — `rawRole || pickDemographicVoiceRole_(...)` short-circuits on truthy value. This means the literal `'Citizen'` could still flow to ledger via this path. Phase 1 inventory confirms whether this path is live or dormant.
- Reference impl `scripts/backfillLifecycleDefaults.js`: djb2 hash on POPID; rand01 stable per POPID + salt; pickFromCDF + ageBracket pattern. Five derivation functions (deriveYearsInCareer, deriveDebtLevel, deriveNetWorth, deriveMaritalStatus, deriveNumChildren).
- `data/economic_parameters.json`: list with 198 entries (S69 — confirmed S184 plan-prep). Whether entries carry neighborhood metadata is a Phase 2 question.

**Acceptance criteria:**
1. Phase 1 inventory document produced — every intake/generator path catalogued, every field's current write behavior classified (set / hardcoded sentinel / omitted / fallback-only).
2. Per-field canonical source locked in this plan (RoleType, EducationLevel, Gender, 5 lifecycle fields).
3. Per-field derivation pseudocode in this plan, Apps Script-safe (no Math.random, no crypto, no Buffer; djb2 hash + CDF only).
4. Engine-sheet has executable task specs per affected intake path — `mediaRoomIntake.js`, `processAdvancementIntake.js`, any others surfaced by Phase 1.
5. Validation fixture passes — simulated new citizen routed through full intake chain lands with all 8 fields populated, realistic, deterministic per-(first,last,popId).

**Scope explicitly excluded** (engine-sheet-owned from S184 Row 4 close-out, separate ROLLOUT items if pursued):
- POP-00004 Lucia Polito column-misalignment ('Aura' in RoleType + 'Wellness Practitioner' in DebtLevel — looks like split write).
- 137-165 empty-cell rows (no value at all in column, lacks BirthYear or row shorter than schema).
- `recordWorldEventsv3.deriveDomain` keyword coverage (Row 6 polish — separate ROLLOUT followup logged in Row 6 close-out).

---

## Tasks

### Phase 1 — Inventory (research-build)

#### Task 1.1: Audit intake / generator paths
- **Files:** `phase05-citizens/processAdvancementIntake.js`, `phase05-citizens/generateGenericCitizens.js`, `phase07-evening-media/mediaRoomIntake.js`, `scripts/ingestPublishedEntities.js`, plus any path surfaced by grepping `Simulation_Ledger`/`Generic_Citizens`/`Advancement_Intake` write call sites.
- **Steps:**
  1. For each path: identify the row-creation code site (where new citizens get appended).
  2. For each of 8 target fields (RoleType, EducationLevel, Gender, YearsInCareer, DebtLevel, NetWorth, MaritalStatus, NumChildren): record whether the path **sets a real value** / **hardcodes a sentinel** (e.g., `'Citizen'`, `12.5`, `'single'`) / **leaves empty** / **defers to downstream fallback**.
  3. Map intake → ledger column flow: which intake sheet row column → which ledger column (per `phase05-citizens/processAdvancementIntake.js` mapping).
  4. Output `output/intake_path_inventory.md` — table per path, classification per field.
- **Verify:** every intake path has a row in the inventory; every field has a classification per path.
- **Status:** **DONE S184** (research-build). Output: `output/intake_path_inventory.md`. 9 paths audited (3 live MUST FIX, 4 ALIGN/out-of-scope, 2 dormant one-time integrations). Reference pattern found: `integrateFaithLeaders.js:deriveRoleType()`.

#### Task 1.2: Disposition pass
- **Files:** this plan file (append "Phase 1 findings" subsection).
- **Steps:** read inventory, surface upstream sentinels found, classify each as:
  - **MUST FIX** — sentinel reaches ledger (e.g., `mediaRoomIntake.js:591` 'Citizen' literal IF Phase 1 confirms it's a live path).
  - **DORMANT** — code path not currently invoked; flag for cleanup but don't block.
  - **CORRECT** — already computes a real value; no change.
- **Verify:** plan changelog entry added; `output/intake_path_inventory.md` referenced.
- **Status:** **DONE S184** (this section + changelog).

### Phase 2 — Canonical source decision (research-build)

#### Task 2.1: Inventory `data/economic_parameters.json`
- **Files:** `data/economic_parameters.json` (read-only).
- **Steps:**
  1. Confirm shape: 198 entries, top-level structure (list of profile objects).
  2. Per-entry fields: identify whether each carries neighborhood, age-range, gender, education-level, income-bracket metadata.
  3. Determine whether the file is sufficient as canonical source for RoleType (with neighborhood awareness) or if it needs augmentation.
- **Verify:** inventory captured in this plan §Phase 2 findings.
- **Status:** [ ] not started

#### Task 2.2: Per-field source-of-truth decision
- **Files:** this plan file (lock decisions inline).
- **Steps:** for each of 8 fields, choose:
  - **A:** `data/economic_parameters.json` profile pool (deterministic draw)
  - **B:** live Simulation_Ledger frequency draw (neighborhood-aware via existing rows)
  - **C:** djb2 hash + CDF (pure derivation, ported from backfill script)
  - **D:** hybrid (e.g., RoleType from B, lifecycle from C)
- **Verify:** decision recorded per field with rationale; Mike sign-off on canonical-source map before Phase 3.
- **Status:** [ ] not started

### Phase 3 — Per-field derivation specs (research-build)

Each of 8 fields gets a spec block with: input parameters (seed string, age, neighborhood, dependent fields), output type, derivation logic in Apps Script-safe pseudocode (no Math.random, no crypto, no Buffer; djb2 + CDF only), example outputs for 3 sample citizens.

#### Task 3.1: RoleType derivation spec
- Connects to `processAdvancementIntake.js` Path B (already shipped). Plan adds the upstream-side spec (neighborhood-aware draw).
- Inputs: `(seed, neighborhood, age?)`. Output: role string from canonical source.
- **Status:** [ ] not started

#### Task 3.2: EducationLevel derivation spec
- New territory. Likely live-ledger frequency draw by neighborhood + age-bracket.
- **Status:** [ ] not started

#### Task 3.3: Gender derivation spec
- New territory. Likely neighborhood frequency draw, or canonical 50/50 with variance.
- **Status:** [ ] not started

#### Task 3.4: Lifecycle defaults derivation spec (5 fields together)
- Port `scripts/backfillLifecycleDefaults.js` deriveYearsInCareer / deriveDebtLevel / deriveNetWorth / deriveMaritalStatus / deriveNumChildren to Apps Script-safe pseudocode.
- The reference impl is Node — Apps Script port needs `hashSeed` (already djb2, portable), `rand01` (also portable), `pickFromCDF` (portable), `ageBracket` (portable). All five derive functions translate cleanly.
- **Status:** [ ] not started

### Phase 4 — Engine-sheet handoff (research-build → engine-sheet)

#### Task 4.1: Per-intake-path task specs
- **Files:** this plan file (append §Engine-sheet tasks).
- **Steps:** for each MUST-FIX path from Phase 1 disposition, write a concrete engine-sheet task spec — file, lines to modify, replacement logic per field, rate-limit considerations, verification gate.
- Likely scope: `mediaRoomIntake.js` line 591 (and any others Phase 1 surfaces) — replace literal `'Citizen'` with derivation call; `processAdvancementIntake.js` — extend Path B to populate EducationLevel + Gender + lifecycle fields when blank (one-stop intake derivation block).
- **Status:** [ ] not started

#### Task 4.2: Apps Script library extraction
- **Decision question:** does the derivation logic live as a shared Apps Script utility (e.g., `utilities/citizenDerivation.gs`) imported by both `mediaRoomIntake.js` and `processAdvancementIntake.js`, or is it inlined per-path?
- Shared lib = single source of truth for djb2/CDF/derivation; inlined = simpler diff + fewer dependencies.
- Default: shared lib if Phase 1 surfaces 2+ paths needing the same derivation.
- **Status:** [ ] not started

### Phase 5 — Validation (research-build → engine-sheet)

#### Task 5.1: Validation fixture
- **Files:** ad-hoc test, or `scripts/validateIntakeDerivation.js`.
- **Steps:** simulate routing 3 new citizens through full intake chain (mediaRoomIntake → processAdvancementIntake) with the new derivation. Confirm all 8 fields land with realistic, deterministic values per-(first,last,popId). Spot-check distribution: 100-citizen synthetic batch should produce non-uniform field distributions (matching backfill script's smoke-test pattern).
- **Verify:** zero `'Citizen'` literal RoleTypes; zero empty cells across the 8 target fields; per-citizen determinism (same seed → same values across runs).
- **Status:** [ ] not started

---

## Phase 1 findings

**Source:** `output/intake_path_inventory.md` (Task 1.1, 2026-04-28).

**9 paths audited, 8-field classification matrix per path produced.** Three live cycle paths flagged MUST FIX:

| Path | What's wrong |
|---|---|
| `mediaRoomIntake.js:591` | Hardcodes `'Citizen'` literal as RoleType. Truthy → bypasses S184 Path B fallback when row promotes to ledger. Single-line fix. |
| `processAdvancementIntake.js:405-418` | Path B handles RoleType correctly post-S184; the other 7 target fields ship blank. Extension target — same Path B pattern, 7 more fields. |
| `ingestPublishedEntities.js:399-415` | S180 standing intake. **Largest gap — all 8 target fields ship blank** on every published-artifact intake. Comment acknowledges "engine fills next cycle" but lifecycle engines fire only on triggers, so blanks persist. |

**Reference pattern found:** `integrateFaithLeaders.js:81 deriveRoleType(leaderName, orgCharacter)` — proven intake-side derivation in production, the cleanest example in the codebase. Phase 3 derivation specs should model on this shape + `processAdvancementIntake.js:pickDemographicVoiceRole_()` (djb2 + pool draw) + `scripts/backfillLifecycleDefaults.js` (djb2 + age-bracket CDF).

**Out of scope confirmed:**
- `generateGenericCitizens.js` — different schema (Generic_Citizens uses Occupation, not RoleType; 8 lifecycle fields not in tab). Gap surfaces at promotion via processAdvancementIntake, not at generation.
- `integrateAthletes.js` — updates existing rows, no creation
- `editionIntake.js` — staging tab only

**Dormant (one-time, lower priority):**
- `integrateCelebrities.js` — RoleType already computed externally; lifecycle fields blank but rare-run
- `integrateFaithLeaders.js` — already correct for RoleType; lifecycle fields blank but rare-run

**Architectural recommendation (locks in for Phase 3):** build a shared derivation library, two implementations hitting the same per-field specs:
- **Apps Script side** — `utilities/citizenDerivation.gs` consumed by `processAdvancementIntake.js` + `mediaRoomIntake.js`
- **Node side** — parallel module consumed by `ingestPublishedEntities.js` (or direct port from `backfillLifecycleDefaults.js`)

Phase 3 derivation specs become the single source of truth that both implementations must match. Phase 5 validation runs the synthetic-citizen fixture through ALL three paths to confirm parity.

**Mike's hint context confirmed:** the recently shipped citizen + business intake `ingestPublishedEntities.js` (S180) has the largest 8-field gap. It bypasses both Path B (no `processAdvancementIntake.js` involvement) and the lifecycle engines' trigger-based fill (Status='pending' rows just sit blank).

---

## Open questions

- [ ] **One combined `deriveCitizenProfile(seed, age, neighborhood)` function or per-field functions?** Phase 3 decision. Combined = atomic call site; per-field = composable.
- [ ] **Canonical source cached per-cycle or computed live per intake event?** If live-ledger frequency draws are chosen for any field, the read could be cached at cycle-start to avoid repeated sheet reads during intake bursts. Phase 2 decision.
- [ ] **Does `data/economic_parameters.json` carry neighborhood-aware data?** Task 2.1 confirms.
- [ ] **Gender canonical source.** Live-ledger neighborhood frequency, canonical 50/50 with neighborhood variance, or agent-curated? Task 2.2 decision.
- [ ] **Is `mediaRoomIntake.js:591` a live path or dormant code?** Task 1.1 audit confirms before scoping the fix as MUST FIX vs DORMANT.

---

## Validation fixture

Three synthetic citizens routed through full intake chain with deterministic seeds:

| Test seed | Expected RoleType behavior | Expected lifecycle behavior |
|---|---|---|
| `('Maria','Vega','POP-99001')` Fruitvale, age 34 | Neighborhood-aware draw — Latina-heavy roles plausible (taqueria owner, healthcare aide, etc.) | YearsInCareer 8-15, MaritalStatus weighted toward married/partnered, NumChildren 1-3 |
| `('Tobias','Wing','POP-99002')` Rockridge, age 67 | Neighborhood-aware draw — Rockridge-plausible (AI researcher, creative professional, etc.) | YearsInCareer 30+ or retirement-flagged, NetWorth high-bracket, MaritalStatus weighted married/widowed |
| `('Kevin','Park','POP-99003')` Jack London, age 22 | Neighborhood-aware draw — port/young-professional plausible | YearsInCareer 1-3, MaritalStatus single-weighted, NumChildren 0-1 |

Re-running with same seeds produces identical values (determinism check). 100-citizen batch produces non-uniform distributions (matches backfill smoke-test pattern: YearsInCareer 300+ distinct values, MaritalStatus married 49% / single 22% / divorced 14% / partnered 7% / widowed 7%, NumChildren 0-5 with peak at 0).

---

## Phase order + handoff

Research-build executes in this order:
1. Task 1.1 (audit) → produces `output/intake_path_inventory.md`.
2. Task 1.2 (disposition) → surfaces upstream sentinels for Mike's review.
3. Task 2.1 + 2.2 (canonical source decisions) → Mike sign-off on per-field source map.
4. Tasks 3.1–3.4 (derivation specs) → all locked in this plan.
5. Tasks 4.1–4.2 (engine-sheet handoff) → engine-sheet picks up.
6. Task 5.1 (validation) → fixture passes before declaring DONE.

Engine-sheet executes Tasks 4.1–4.2 from research-build's specs after each Phase 3 spec is signed off.

---

## Connects to

- **ENGINE_REPAIR Row 4** (lifecycle defaults backfill — DONE S184). This plan handles forward-looking path; backfill handled existing citizens.
- **ENGINE_REPAIR Row 17** (RoleType sentinel fallback — DONE S184). This plan handles upstream computation; Path B remains defense-in-depth.
- **ENGINE_REPAIR Row 5** (name clusters — DONE S184). Same intake-time-quality theme: caps applied at generator-side rather than post-hoc cleanup. This plan extends the pattern.
- **BUILD: Standing intake** (`scripts/ingestPublishedEntities.js`). New pending-status citizens currently land with blank demographics — intake-side derivation is the natural place to compute role + education + gender + lifecycle at row creation. Folds into Phase 4 task spec.
- **`/post-publish` Step 5** invokes `ingestPublishedEntities.js` after publish; downstream cycles fill demographics via lifecycle engines on triggers. Faster fill via this plan's intake-side derivation.

---

## Changelog

- 2026-04-28 — Initial draft (S184, research-build). Combines two engine-sheet S184 followups (Row 4 lifecycle defaults forward-looking; Row 17 RoleType upstream computation) under shared architectural theme: intake-side derivation > engine-side fallback. Same pattern as Row 5 name-cluster fix (caps at generator-side). Reference impl: `scripts/backfillLifecycleDefaults.js` (Node) ports to Apps Script. Path B fallback in `processAdvancementIntake.js` preserved as defense-in-depth.
- 2026-04-28 — Phase 1 inventory complete (Tasks 1.1 + 1.2, S184, research-build). Output: `output/intake_path_inventory.md`. 9 paths audited. **3 MUST FIX live cycle paths:** `mediaRoomIntake.js:591` (hardcoded 'Citizen' literal bypasses Path B), `processAdvancementIntake.js:405-418` (extend Path B pattern to 7 more fields), `ingestPublishedEntities.js:399-415` (largest gap — all 8 target fields blank, S180 standing intake). **Reference pattern found:** `integrateFaithLeaders.js:deriveRoleType()`. **Architectural recommendation:** shared derivation library, two implementations (Apps Script `utilities/citizenDerivation.gs` for engine-cycle paths + Node parallel module for `ingestPublishedEntities.js`), both hitting Phase 3 specs as single source of truth.
