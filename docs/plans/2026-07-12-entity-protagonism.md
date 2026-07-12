---
title: Entity Protagonism — Business/Faith/Program Event Generation Plan
created: 2026-07-12
updated: 2026-07-12
type: plan
tags: [engine, seeds, entities, citizens, active]
sources:
  - docs/engine/ROLLOUT_PLAN.md — research.24 row
  - docs/research/2026-07-12-entity-protagonism-business-faith-programs.md (research basis)
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — parent rollout (research.24)"
  - "[[../research/2026-07-12-entity-protagonism-business-faith-programs]] — research basis"
  - "[[SCHEMA]] — doc conventions"
  - "[[../index]] — registered same commit"
---

# Entity Protagonism — Business/Faith/Program Event Generation Plan

**Goal:** Businesses, faith orgs, and community programs generate their own deck-reaching events — entity rows drive fates instead of only existing (protagonist half of research.24; the backdrop half shipped S313 in `buildContractSeeds.js`).

**Architecture:** No new engines, no new .js files (FIX-don't-ADD). Four existing files gain small cuts: `faithEventsEngine.js` and `buildEveningFamous.js` start emitting `recordRipple_` calls; `economicRippleEngine.js` threads BIZ_IDs it already has into business-scoped ripples; `buildContractSeeds.js` gains a third backdrop pool. One new tab: `Community_Programs`. The deck consumes all of it through paths verified live this session — no deck changes needed beyond two `CONTRACT_SEED_DOMAIN` entries and the pool add.

**Terminal:** All execution → **engine-sheet**. No media/civic tasks exist in this plan — media and civic are runtime orchestrators, never builders; the deck output reaches them through the pipeline they already run.

**Pointers:**
- Research basis: `docs/research/2026-07-12-entity-protagonism-business-faith-programs.md`
- Ripple writer contract: `utilities/rippleLedger.js` — `recordRipple_(ctx, e)`, fail-soft, Phase ≤9 callers only (both touched engines are Phase 4/6/7 — compliant)
- Deck consumption (verified S314): `buildContractSeeds.js` — `targetScope:'business'` → Businesses col with `bizById` name-resolve; any non-enum scope (e.g. `'faith'`) → OtherEntities col; exact targets lead, S313 backdrop fills behind, never displaced
- Phase order (verified S314): `godWorldEngine2.js` L390/L406 + L1929/L1943 — Phase7-Famous runs before Phase7-ContractSeeds at both entry points

**Acceptance criteria:**
1. Sandbox cycle run: `Ripple_Ledger` contains rows with `TargetScope` `business` (from economicRippleEngine and/or buildEveningFamous) and `faith` (from faithEventsEngine), each carrying a real entity id/name in `TargetIds`.
2. Same run: `Story_Seed_Deck` rows carry those entities as exact leads in Businesses/OtherEntities — distinguishable from backdrop fill by matching the cycle's Ripple_Ledger rows.
3. `node phase07-evening-media/buildContractSeeds.test.js` passes, including new §9 program-pool asserts; two runs with the same rng seed produce identical seeds (determinism).
4. `Community_Programs` tab exists with 3 canon rows, values read back and verified per engine.md verify-after-write.

---

## Tasks

### Task 1: Community_Programs tab + canon seed rows

**Gate: Mike's explicit go at execution — this is the schema addition (new tab).**

- **Files:**
  - none (direct sheet op via `lib/sheets.js` service account — no new .js, no script)
- **Steps:**
  1. Resolve canon fields first: Vinnie Keane = POP-00001 (known). Mark Aitken POPID via `queryLedger.js citizen` or MCP `lookup_citizen`. Neighborhoods via MCP `search_canon` ("Vinnie Keane Gala", "firehouse academy", "Aitken youth league") — academy is West Oakland per research.24; confirm the other two, leave Neighborhood blank if canon names none (blank = excluded from hood-keyed backdrop, correct behavior).
  2. Create tab `Community_Programs` with header: `Program_ID | Name | Founder_POPID | Neighborhood | Type | Founded_Cycle | Status`.
  3. Append 3 rows (`PRG-001`..`PRG-003`): Vinnie Keane Gala (type `gala`), Vinnie Keane Firehouse Baseball Academy (West Oakland, type `youth-sports`), Mark Aitken Youth Baseball League (type `youth-sports`). Founded_Cycle: the cycle canon first named them if findable via `search_articles`, else current cycle. Status `active`.
  4. Read the tab back and confirm all values landed.
- **Verify:** re-read via `lib/sheets.js` → 3 rows, no blanks in Program_ID/Name/Status
- **Status:** [ ] not started

### Task 2: Programs backdrop pool in buildContractSeeds.js

- **Files:**
  - `phase07-evening-media/buildContractSeeds.js` — modify
  - `phase07-evening-media/buildContractSeeds.test.js` — modify
- **Steps:**
  1. `contractSeedBackdropIndex_`: add a third fail-soft read — `Community_Programs` → `idx.programsByHood` (cols `Name`/`Neighborhood`/`Status`; skip non-`active` Status, same pattern as the Faith_Organizations inactive filter).
  2. In `buildContractSeeds_`, merge the OtherEntities draw pool: `(faithByHood[hoodKey] || []).concat(programsByHood[hoodKey] || [])`, one shared `usedFaith`-style used-map (rename to `usedOther`). Labels: `name + ' (faith)'` / `name + ' (program)'`. `CONTRACT_SEED_FILL_OTHER` stays 1.
  3. Tests: new §9 — program in seed's hood fills OtherEntities when no faith org competes; inactive program excluded; determinism (two same-seed runs identical); missing tab never throws.
- **Verify:** `node phase07-evening-media/buildContractSeeds.test.js` → all pass, zero regressions in §1–§8
- **Status:** [ ] not started

### Task 3: Faith events emit ripples (faithEventsEngine.js)

- **Files:**
  - `phase04-events/faithEventsEngine.js` — modify
  - `phase07-evening-media/buildContractSeeds.js` — modify (one constant entry)
- **Steps:**
  1. In `runFaithEventsEngine_`, alongside the existing `recordPulse_` loop over the capped events (post-cap, so ≤5 ripples/cycle): guard `typeof recordRipple_ === 'function'`, then per event with a non-empty `neighborhood`:
     ```js
     recordRipple_(ctx, {
       causeType: 'faith-event',
       causeId: ev.organization,
       causeDetail: ev.description || '',
       effectType: ev.eventType,
       targetScope: 'faith',
       targetIds: [ev.organization],
       neighborhood: ev.neighborhood,
       magnitude: ev.eventType === 'crisis_response' ? 0.02 : 0.01,
       duration: 1,
       sourceEngine: 'faithEventsEngine'
     });
     ```
     Magnitudes sit under `CONTRACT_SEED_MAJOR_MAG_FRAC` (0.05) → texture seeds by default; a crisis-response cluster of 3+ merges major via the existing cluster rule, which is correct.
  2. `buildContractSeeds.js`: add `'faith-event': 'COMMUNITY'` to `CONTRACT_SEED_DOMAIN` (routes to culture desk via `CONTRACT_SEED_DESK`). The `'faith'` scope lands in OtherEntities via the existing non-enum branch — no other deck change.
- **Verify:** `node phase07-evening-media/buildContractSeeds.test.js` still passes; sandbox cycle → Ripple_Ledger rows with `SourceEngine=faithEventsEngine`, seed rows with the org leading OtherEntities
- **Status:** [ ] not started

### Task 4: Business-scoped ripples (economicRippleEngine.js)

- **Files:**
  - `phase06-analysis/economicRippleEngine.js` — modify
- **Steps:**
  1. `detectCareerRipples_`, businessDeltas branch: capture `createRipple_`'s return (it returns the ripple or null on dedup); when non-null set `ripple.bizId = bizId; ripple.bizName = biz.name || bizId;` for both BUSINESS_CONTRACTION and BUSINESS_EXPANSION.
  2. Ledger loop (the `recordRipple_` block after `processActiveRipples_`): when `rlr.bizId` is set, emit `targetScope: 'business'`, `targetIds: [rlr.bizId]` instead of the neighborhood/citywide fallback — birth AND carryover rows (bizId survives on the ripple object across the T2 snapshot serializer; verify the serializer round-trips unknown fields, `phase09`/snapshot writer — if it whitelists fields, add bizId/bizName to the whitelist).
  3. Deck consumes with zero changes: `'business'` scope → Businesses col, BIZ_ID name-resolved via `bizById`.
- **Verify:** sandbox cycle with a businessDeltas-emitting career cycle → Ripple_Ledger row `TargetScope=business, TargetIds=BIZ-xxx`; seed Businesses col shows `BIZ-xxx Name` as exact lead
- **Status:** [ ] not started

### Task 5: Lifestyle sightings name a venue + emit business ripple (buildEveningFamous.js)

- **Files:**
  - `phase07-evening-media/buildEveningFamous.js` — modify
  - `phase07-evening-media/buildMediaPacket.js` — modify (display lines)
  - `phase09-digest/finalizeCycleState.js` — modify (snapshot line)
  - `phase07-evening-media/buildContractSeeds.js` — modify (one constant entry)
- **Steps:**
  1. `buildEveningFamous.js`: one fail-soft hood-keyed `Business_Ledger` read (`BIZ_ID`/`Name`/`Neighborhood` — same three-col pattern as `contractSeedBackdropIndex_`). After each sighting's neighborhood is assigned (~L442), if that hood has businesses, draw one via the engine `rng` → `sighting.venue = { bizId, name }`; then `recordRipple_(ctx, { causeType: 'lifestyle-sighting', causeId: ent.name, causeDetail: ent.name + ' spotted at ' + venue.name, effectType: 'sighting', targetScope: 'business', targetIds: [venue.bizId], neighborhood: neighborhood, magnitude: 0.01, duration: 1, sourceEngine: 'buildEveningFamous' })`. Phase 7 runs before ContractSeeds (verified, Pointers) and before the Phase-10 executor — compliant. 2–4 sightings/cycle → bounded volume.
  2. `buildMediaPacket.js` famous lines (L304, L388–390, L438 region): append `' at ' + venue.name` when `sighting.venue` exists. NOTE: L304/L438 read `s.famousPeople` (names only) — thread venue via `S.famousSightings` where the full objects live; only touch lines that already render per-sighting.
  3. `finalizeCycleState.js` L214 `famousNames` push: include venue when present (`s.name + ' at ' + s.venue.name + (s.neighborhood ? ' in ' + s.neighborhood : '')`).
  4. `buildContractSeeds.js`: add `'lifestyle-sighting': 'COMMUNITY'` to `CONTRACT_SEED_DOMAIN`.
- **Verify:** sandbox cycle → sighting text names a real Business_Ledger venue; Ripple_Ledger `SourceEngine=buildEveningFamous` row; seed Businesses col carries the venue as exact lead
- **Status:** [ ] not started

### Task 6 (Phase 2, gated): Youth events reference programs (generationalEventsEngine.js)

Deliberately last and separately gated — touches generational events; research.24 flags a coupling-map read before the cut.

- **Files:**
  - `docs/engine/ENGINE_COUPLING_MAP.md` — read
  - `phase04-events/generationalEventsEngine.js` — read end-to-end, then modify
- **Steps:**
  1. Read ENGINE_COUPLING_MAP §generational + the engine end-to-end (1,193 lines) per engine.md measure-twice.
  2. Cut: where youth-facing event text is drawn, if `Community_Programs` has an `active` row in the citizen's neighborhood, a `ctx.rng` share of youth events names it ("joined the <program> season", "volunteered at <program>"). Reuse one hood-keyed read; no new file.
  3. Emit no ripple here in v1 — the citizen event already reaches the deck through the citizen path; the program gains canon through the named mention. Revisit after C-observation.
- **Verify:** sandbox cycle with a youth event in West Oakland → event text can name the Keane academy; determinism holds
- **Status:** [ ] not started

---

## Sequencing

T1 → T2 (ledger before its consumer) → T3 → T4 → T5 → T6 gated separately. T3–T5 are independent of each other; any subset ships. Single clasp push behind the C102 smoke gate alongside the queued engine.52/45/bond batch — same queue as the S313 backdrop commit (1e4366f4).

## Non-goals

- No new business-event generator beyond the careerSignals `businessDeltas` threading (T4). If observed business-ripple volume is too low after 3 cycles, that's a new research pass, not silent scope growth here.
- No citywide backdrop or citywide entity draw — the S313 boundary holds.
- No `eveningMedia` streaming/tv/food-trend entity hooks — that content names no places; out of scope until it does.

## Open questions

(none)

---

## Changelog

- 2026-07-12 — Initial draft (S314, research-build). Research basis research.24; all file/line claims verified against live source this session.
