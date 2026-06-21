---
title: Layered Memory Phase 2 — Lineage Origin-Stamp + Retrospective Promotion Plan
created: 2026-06-20
updated: 2026-06-20
type: plan
tags: [architecture, engine, memory, citizens, token-budget, active]
sources:
  - "[[../research/2026-06-20-layered-memory-architecture]] — verdict adopt; this is the Phase-2 (unsolved-core) ignited plan"
  - "[[2026-06-15-story-seed-deck-engine-emergence]] — engine.35: the engine-EMERGES / Supermemory-MAINTAINS division of labor (Mike S259) that settles where lineage lives"
  - "[[2026-05-07-chaos-cars-engine]] — engine.11: Tier-1 cascade is a new entity-creation + major-event path the origin-stamp hooks; C99-gated"
  - "[[../SUPERMEMORY]] — container architecture; salienceTier metadata field + bt-wiki entity records"
  - "[[../plans/2026-06-20-layered-memory-phase1-injection-filter]] — Phase 1 (the category-rule injection cut, banked S265)"
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — parent rollout (research.17)"
  - "[[../adr/0011-memory-salience-tier-and-origin-stamp]] — the load-bearing schema decision"
  - "[[SCHEMA]] — doc conventions"
  - "[[index]] — registered same commit"
---

# Layered Memory Phase 2 — Lineage Origin-Stamp + Retrospective Promotion Plan

**Goal:** Build the substrate that lets an Archive-tier memory promote to Story/Permanent **only when it later spawns a major character or event** — the unsolved core of the OpenAI-E98 layered-memory adoption. "Done" for *this design session* = the **origin-stamp schema** locked (the irreversible piece) + the promotion-sweep **designed against real major-event shapes** with its build gated. No code this session — design + schema + gates.

**Architecture:** Two mechanisms over one new primitive.
1. **Per-item salience tier** — a `salienceTier` (`permanent` | `story` | `archive`) carried as metadata on each memory item. Mostly exists already: `world-data` is coarse-Archive *by container* (queried via MCP, never boot-injected); the Sim_Ledger `Tier` column + bay-tribune editions are the coarse Permanent/Story end. Phase 2 adds the *per-item refinement field* so individual items can be re-tiered.
2. **Lineage origin-stamp** — a persistent, cross-cycle reference on each created entity pointing back to **what spawned it** (the initiative / permit / seed / institution). This is the genuinely-new build. Written **forward at creation**, read **backward at promotion**.
3. **Retrospective promotion sweep** (deferred) — when an entity is canonized "major," walk its origin-stamp chain and promote the origin Archive items `archive → story`.

**Why lineage lives in the maintenance layer, not the engine (the decisive design call):** engine.35 locked Mike's S259 division of labor — **the engine EMERGES (forward-only, this-cycle signal); Supermemory MAINTAINS continuity (published articles + grades ARE the story history).** The engine deliberately does not persist cross-cycle story continuity. The existing `causalAnchor{kind,driver,confidence}` (engine.35 Phase 3) is a *within-cycle, forward* delta→driver link — NOT a persistent entity→origin lineage. Retrospective promotion needs the cross-cycle persistent link, which is continuity → **a maintenance-layer concern: the bay-tribune wiki entity record (`bt-wiki-*`) + the Sim_Ledger entity row, not a new engine stream.** Building the origin-stamp as an engine stream would duplicate machinery Mike explicitly assigned to Supermemory. (Confirmed by reading engine.35 before designing — caught a near-greenfield-reinvention.)

**Terminal:** research-build (this design + ADR). Build phases route at execution: schema/ledger column → engine-sheet (`engine terminal`); Supermemory metadata + bt-wiki origin field → research-build/infra; the sweep → TBD at sweep-design time.

**Pointers:**
- Research basis: [[../research/2026-06-20-layered-memory-architecture]] §"auto-promotion rule is the unsolved core"
- Division-of-labor source: [[2026-06-15-story-seed-deck-engine-emergence]] §"engine EMERGES, Supermemory MAINTAINS"
- Phase 1 (banked): [[../plans/2026-06-20-layered-memory-phase1-injection-filter]] — the category-rule injection cut. Phase 2 supplies the per-item substrate Phase 1 deliberately skipped; **Phase 1's category rule will be subsumable** once per-item tiers exist (a category default becomes the seed tier).
- ADR: [[../adr/0011-memory-salience-tier-and-origin-stamp]]

**The timing axis (pre-mortem — "what makes this wrong in 3 sessions?"):** the promotion sweep fires on major-event signals — Tier-1 promotion, Storyline arc beats, institution creation, chaos-cars Tier-1 cascade — that are **mostly not live yet** (chaos-cars C99-deploy-gated; autonomy Layer-1 unbuilt). Designing + building the full sweep now means validating against a supply that does not exist. So this plan **splits on the timing axis:**
- **Origin-stamp schema = irreversible, do-the-rigor-now.** You cannot retrofit an origin you never recorded. Get the schema right this session.
- **Stamp instrumentation = gated on C99.** Chaos-cars *adds* the new entity-creation + Tier-1-cascade paths the stamp must hook. Instrument now and you re-instrument after C99. C99 is imminent — wire every creation path once, after.
- **Promotion sweep = deferred** until majors are live, so it is designed against real shapes, not guesses.

**Acceptance criteria (this design session):**
1. ADR-0011 records the `salienceTier` field + the origin-stamp schema decision, names the rejected alternative (engine-stream lineage), and is registered.
2. The origin-stamp schema is fully specified: field name + location (entity row / bt-wiki record), what it references (origin entity-id + origin-kind), and the **enumerated list of entity-creation paths** that must write it (including the chaos-cars paths arriving C99).
3. The entity→Archive-docs **walk** is specified: given a major entity, how its origin resolves to specific Archive items, and the **promotion granularity** (which docs flip `archive→story`).
4. Build sequencing + gates are explicit: schema/column build, stamp instrumentation gated on C99, sweep deferred with its un-gating trigger named.
5. The Phase-1↔Phase-2 relationship is documented (per-item tier subsumes the category rule).

---

## Tasks

### Task 1: Write ADR-0011 (the load-bearing schema decision)

- **Files:**
  - `docs/adr/0011-memory-salience-tier-and-origin-stamp.md` — create
- **Steps:**
  1. Record the decision: per-item `salienceTier` metadata + a persistent entity origin-stamp in the maintenance layer (Supermemory bt-wiki + ledger row).
  2. Name the rejected alternative: lineage as a new **engine** stream — rejected because engine.35's division of labor assigns cross-cycle continuity to Supermemory; an engine origin-stream duplicates it.
  3. Record the non-destructive invariant (demotion/Archive never deletes — [[feedback_self-preservation-rule-1]]) and the layer-boundary invariant (this is context-injection salience, NOT the TAG_REGISTRY 8-slot citizen-memory layer).
- **Verify:** ADR registered in `docs/index.md`; back-linked from this plan + the research file.
- **Status:** [x] DONE S265 — ADR-0011 written + registered.

### Task 2: Specify the origin-stamp schema (the irreversible piece)

- **Files:**
  - this plan — fill the §Origin-Stamp Schema section below
- **Steps:**
  1. Field: name, type (origin-entity-id + origin-kind enum: `initiative` | `permit` | `seed` | `institution` | `chaos-event` | `arc`), where it lives (Sim_Ledger entity row column AND/OR bt-wiki entity record metadata — decide which is source-of-truth vs mirror).
  2. Enumerate **every entity-creation path** that must write the stamp. Audit the creation sites (citizen mint, business creation, institution creation, Storyline arc creation, chaos-cars entity/cascade paths). Flag the chaos-cars paths explicitly as **C99-gated instrumentation**.
  3. Define the back-reference shape for multi-hop lineage (a character from a business from a permit) — single-hop stamp + walk, or stored chain.
- **Verify:** the schema is complete enough that an executor can add the column/field and instrument creation paths without a design question.
- **Status:** [x] DONE S265 — §Origin-Stamp Schema filled (creation-path classes audited; chaos paths flagged C99-gated).

### Task 3: Specify the promotion walk + granularity

- **Files:**
  - this plan — fill the §Promotion Walk section below
- **Steps:**
  1. Define "major" detection signals (enumerate: Tier-1 promotion on the ledger `Tier` column, Storyline arc major-beat, institution creation, chaos-cars Tier-1 cascade) and which are live now vs C99 vs Layer-1.
  2. Define the walk: major entity → resolve origin-stamp → the **set of Archive docs** to promote, and the granularity (the origin initiative/permit card? every doc tagged to it? the specific permit doc?).
  3. Define promotion mechanics: flip `salienceTier archive→story`, non-destructive, idempotent, who runs it (post-cycle Node step vs edition-time).
- **Verify:** the walk is specified against the real major-event shapes (not hypothetical); un-gating trigger for the build is named (sweep builds when ≥1 major-event signal is live in production).
- **Status:** [x] DONE S265 — §Promotion Walk filled; sweep build deferred behind the un-gating trigger.

---

## Origin-Stamp Schema

**Field.** `originStamp = { originId, originKind, bornCycle }`.
- `originId` — the id of the entity that spawned this one (`INIT-###`, `BIZ-#####`, `POP-#####`, arc-id, chaos-event-id).
- `originKind` — enum: `initiative` | `business` | `household` | `intake` | `arc` | `chaos-event` | `seed`. Drives the walk's entity→Archive-docs resolution (below).
- `bornCycle` — cycle the entity was created, for the depth-bounded walk + audit.

**Location (source-of-truth + mirror).** Source-of-truth = the **Sim_Ledger entity row** (a new column on the entity's row — survives Supermemory re-ingest, which the ADR-0011 reversal trigger flags as the risk for metadata-only). Mirror = the **bay-tribune wiki entity record** metadata (`bt-wiki-citizen` / `-business` / `-storyline`), so an edition-time lookup resolves lineage without a ledger round-trip. The ledger value wins on conflict.

**Single-hop stamp + recursive bounded walk** (not a stored chain). Each entity stamps only its **direct** origin. Multi-hop lineage (a character ← the business they founded ← the permit) is reconstructed by walking origin→origin at promotion time, **bounded**: stop at a `permanent`-tier ancestor or at a cycle-depth cap (proposed 30 cycles, matching the research file's "~20 cycles" decay horizon) to avoid promoting an entire genealogy.

**Creation-path classes that must write the stamp** (audited S265 — `phase05-citizens/` + `phase07-evening-media/` + `phase06-analysis/`):

| Class | Where (engine file) | originKind | Live? |
|---|---|---|---|
| Household formation / births | `phase05-citizens/householdFormationEngine.js` | `household` | live |
| Citizen intake / advancement | `processIntakeV3.js` / `processAdvancementIntake.js` | `intake` | live |
| Generic citizen mint | `generateGenericCitizens.js` | `seed` (or none — generic pop is texture, low promote-value) | live |
| Initiative creation | `civicInitiativeEngine.js` | `initiative` | live |
| Business creation (economic ripple) | `phase06-analysis/economicRippleEngine.js`, `runCareerEngine.js` | `business` | live |
| Storyline arc creation | `storylineWeavingEngine.js` / `applyStorySeeds.js` | `arc` / `seed` | live |
| **Chaos-cars entity + Tier-1 cascade paths** | engine.11 producer (C99-gated) | `chaos-event` | **C99-gated** |

**Instrumentation gate:** wire the live paths first; **the chaos-event paths wait for C99** (chaos-cars deploy) so every creation path is instrumented once. Generic-citizen mint may be left unstamped deliberately (generic pop is Tier-4 texture; promote-value ≈ 0) — decide at execution.

## Promotion Walk

**"Major" detection signals** (what fires the sweep):

| Signal | Source | Live? |
|---|---|---|
| Citizen reaches Tier-1 | Sim_Ledger `Tier` col via `checkForPromotions.js` | live |
| Storyline arc hits a major beat | Storyline_Tracker arc state | live (arc state exists; "major beat" threshold = design at sweep-build) |
| Institution / major business creation | `civicInitiativeEngine.js` / economic ripple at scale | live |
| Chaos-cars Tier-1 cascade | engine.11 cascade (world_summary scandal tag + arc creation + voice pending_decisions) | **C99-gated** |

**The walk.** On a major-event signal for entity `E`:
1. Read `E.originStamp` → `(originId, originKind, bornCycle)`.
2. Resolve `originKind` → the **Archive doc set** for `originId`: `initiative` → the `wd-initiative` card + any `bt-*` doc tagged that `INIT-###`; `business` → `wd-business` card + tagged docs; etc. (uses the existing id-content-scoped tagging in [[../SUPERMEMORY]]).
3. Promote that set `salienceTier: archive → story`. Non-destructive, idempotent (re-running on an already-`story` item is a no-op).
4. Recurse to `origin.originStamp`, bounded (stop at `permanent` ancestor or `bornCycle` older than the depth cap).

**Granularity decision:** promote the **direct origin's card + the Archive docs directly tagged to that origin id** — NOT a transitive flood. The bounded recursion handles legitimate multi-hop without promoting unrelated siblings (a permit's *other* never-major children stay Archive).

**Mechanics + cadence.** A post-cycle Node step (sibling to `routePatternSeeds.js`) reads the cycle's new major-event signals and runs the walk. Deferred-build: the step is **not built until ≥1 major-event signal is live in production** (un-gating trigger). Edition-time lookup is the alternative considered; post-cycle is preferred because it keeps the expensive walk off the agent path (mirrors engine.35's engine-does-the-deterministic-compute principle).

---

## Open questions

- [ ] Source-of-truth for the stamp — ledger entity row vs bt-wiki record (Task 2 resolves; both may carry it with one canonical).
- [ ] Multi-hop lineage representation — single-hop + walk vs stored chain (Task 2).
- [ ] Sweep cadence — post-cycle Node step vs edition-time lookup (Task 3; deferred build, but design the shape).

---

## Changelog

- 2026-06-20 — Initial draft + design-session fill (S265, research-build). Phase 2 of research.17 (the unsolved core). ADR-0011 written; §Origin-Stamp Schema + §Promotion Walk filled (creation-path classes audited across phase05/06/07; walk granularity = direct-origin docs + bounded recursion). All three design tasks closed this session; build is C99-gated (stamp instrumentation) + signal-gated (promotion sweep). Decisive design call: lineage lives in the maintenance layer (Supermemory + ledger), NOT a new engine stream — settled by engine.35's engine-EMERGES / Supermemory-MAINTAINS division of labor (Mike S259), caught by reading engine.35 before designing (advisor-flagged near-reinvention). Split on the timing axis: origin-stamp schema = irreversible/now; stamp instrumentation = C99-gated (chaos-cars adds the creation paths); promotion sweep = deferred until majors are live. ADR-0011 carries the schema decision.
