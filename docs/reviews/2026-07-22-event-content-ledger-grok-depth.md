---
title: Event_Content_Ledger — Grok-depth review
created: 2026-07-22
updated: 2026-07-22
type: review
tags: [engine, content-ledger, citizens, review]
status: doc-drift patched 2026-07-22 (SPREADSHEET / event-pools §D / CODEBASE_MAP / SHEETS_MANIFEST / ENGINE_STUB_REVERSE); depth backlog still awaiting Mike go
sources:
  - phase02-world-state/loadEventContentLedger.js
  - phase05-citizens/generateCitizensEvents.js (composer + injection + life-state gate)
  - phase05-citizens/citizenContextBuilder.js (deriveLifeState_)
  - scripts/draftContentRows.js
  - docs/plans/2026-07-01-persistence-seams-content-ledger.md (Design A)
  - docs/plans/2026-07-06-content-ledger-auto-authoring.md (engine.49)
  - docs/plans/2026-07-18-event-pools-design.md §D
  - docs/research/2026-07-06-city-citizen-seam-audit.md
  - schemas/SCHEMA_HEADERS.md (Event_Content_Ledger — 253 rows, 9 cols)
pointers:
  - "[[../plans/2026-07-01-persistence-seams-content-ledger]] — parent Design A"
  - "[[../plans/2026-07-06-content-ledger-auto-authoring]] — auto-authoring (engine.49)"
  - "[[../research/2026-07-06-city-citizen-seam-audit]] — three event layers; Layer 1 is the volume"
---

# Event_Content_Ledger — Grok-depth review

**Session note:** Review only — no code, schema, or ledger rows were added in the review session. This file is the saved deliverable.

**Verdict:** This is one of the better seams in GodWorld. It solves the right problem (content as data, not deploys), fails closed correctly, and already closed the operator bottleneck with auto-authoring. Depth is still thin in a few places that matter more than more rows.

---

## What it actually is

Not a “content spreadsheet.” It is a **fail-closed content CMS** with three layers:

| Layer | Job |
|---|---|
| **Tab** | Authorable surface: `line` skeletons + `fragment` fillers, conditions, weights, kill switch |
| **Loader** | Compile once, reject bad rows, never widen eligibility on typo |
| **Injection + composer** | Per-citizen eligibility → pool dump → draw → `$SLOT` fill → LifeHistory |

That matches the north star: **engine emits lived events; ledgers adapt the vocabulary.** Atmosphere is ~70% of citizen events (seam audit). This tab is the volume layer’s authoring surface. If Layer 1 is flat, wake voice and editions inherit flatness.

---

## What is strong (and why it is strong)

### 1. Fail-closed as a product philosophy, not a comment

Unknown DSL field, bad enum (`ageband=elder`), unrecognized `source:` tag, unfillable `$SLOT` → **skip / drop**, never emit broken text. That is the correct safety model for a sheet operators (and now models) touch.

The important second-order effect: **auto-authoring only works because of this.** Without fail-closed, `auth:auto` would be a pollution hose. With it, cheap helpers are allowed to be wrong; the loader is the immune system.

### 2. Parity-by-execution (drafter)

`draftContentRows.js` does not reimplement validation — it `eval`s the real loader and only writes rows that load with `skipped=0`. That is the adult version of “don’t let the schema and the writer drift.” Dead-hood gate (`hood=D7` parses, matches nobody) is the kind of production scar that proves the system is being used for real.

### 3. Additive rollout + empty-tab fallback

Missing/empty tab → empty `S.contentLedger` → hardcoded pools, byte-identical cycles. That is how you ship content infrastructure in a live sim without a flag day.

### 4. Life-state hard gate as a second fence

DSL conditions aim content; `isEventEligible_` kills impossible class×life-state combos (child + work/money, etc.). Two independent narrowers is better than one clever author. Impossible ≠ improbable: hard gate vs dials/weights is the right split.

### 5. Compile-once conditions

Parse at load into predicate objects; evaluate per citizen. Correct for 900+ citizens × many rows. String re-parse in the hot loop would have been a quiet tax forever.

---

## Where depth is missing (Grok lens)

### A. PoolKey is a filing cabinet, not a routing graph

At inject time, **every eligible line from every `poolKey` dumps into one citizen pool**. `PoolKey` organizes authoring (`baylight.construction`, `baseDaily.family`) but does not:

- replace a hardcoded block
- set draw priority by domain
- express “this pool only competes within itself”

So “ledger-native first” content still competes as one more weighted entry among dozens of hardcoded lines. **Additive-only is safe; it is also why migration never finishes.** Without a retirement path for hardcoded blocks, the ledger is forever a side channel, not the library.

**Depth add:** treat `PoolKey` as a **namespace with policy**:

- `mode: additive` (current default)
- `mode: exclusive` (hardcoded block disabled when ledger has ≥N active lines for that key)
- optional **bucket weight** so `baylight.*` cannot be drowned by ambient Daily mass

That is how you get “ledgers adapt” without a big-bang rewrite.

### B. The seam audit’s real gap is only half-closed

City → state works (DisplacementRisk on the row). State → experience was missing. Hardcoded displacement lines exist at `displRisk >= 7`, and the ledger can gate `displacement>=N`. Good.

Still thin:

- Risk is continuous 0–10; texture is mostly cliff-at-7.
- No arc language: “this cycle’s risk rose / fell / stuck.”
- Auto-drafter reads Neighborhood_Map pressure, but conditions resolve **citizen row** `DisplacementRisk` (S289 intentional). Authors who write `displacement>=7` thinking “hood pressure” will get citizen-score semantics. Document that in the tab header row or a one-line authoring note — doc/code mismatch is an authoring landmine.

**Depth add:** condition vocab for **delta**, not only level: `displDelta>=2`, `migrationIntent=considering`. Experience should track trajectory, not only thresholds.

### C. Fragments are compositional; lines are still mostly monologue

Composer + slots (`$SENSORY`, entity slots `$VENUE`/`$CONTACT`/`$INSTITUTION`) is the right generalization of the tone-slotter. Live smoke showed fragments doing real work (MOOD 23×).

Missing depth:

- No **slot role grammar** beyond “lowercase, no period.” One bad fragment style poisons every line that pulls it.
- No **per-slot co-occurrence / cooldown** — same fragment can stamp many citizens in one cycle.
- Entity slots are code-side; content slots are ledger-side — fine, but **no bridge** that says “this line requires a real bond CONTACT or skip” beyond empty-string null compose.

**Depth add:** fragment **role tags** + cycle-level fragment draw budget (e.g. same fragment ≤K times per cycle), and optional `requires:contact` grain so social lines don’t invent “someone familiar” as texture forever.

### D. Auto-authoring closed the bottleneck; it did not define taste

Caps (10/cycle, 3/pool, 2/slot), dedup, `auth:auto`, supervised then auto-active — solid ops. Smoke: 38 draws, some rows never drew (weight/gate, not failure).

Gaps:

1. **Prune is promised, not clearly first-class.** Plan: auto rows gated false for 10+ cycles → `Active=no`. Without measured prune, the tab becomes a museum of once-true conditions.
2. **No quality signal back into drafting.** Draws into LifeHistory are observed in smoke, not fed as “this row drew / never drew / always lost weight.” A drafter that never sees under-draw will keep minting elegant dead rows.
3. **Voice is bounded by weight, not by style model.** Cheap models will mean-regress toward generic Oakland texture. Caps stop flood; they do not stop bland.

**Depth add:** post-cycle **row telemetry** (eligible count, draw count, compose-null count) written to a small log or columns; prune on zero-draw + dead gate; drafter prompt conditioned on “underperforming poolKeys this cycle.”

### E. Determinism and the sheet as mutable RNG table

Documented correctly: replay = seed × ledger content. Same class as Neighborhood_Map. Once auto-active appends every cycle, **historical replay of cycle N is not free** unless you snapshot ledger state per cycle.

For a story engine that cares about audit trails, that is a real depth debt: `Event_Content_Ledger@C118` vs live head.

**Depth add:** optional cycle snapshot (hash + row count, or append-only `auth:auto` with cycle tag and load filter `Active=yes AND (auth:manual OR authoredCycle<=current)`). Even a content hash in engine audit would make “why did C118 say X” answerable.

### F. Doc drift undercuts the seam

| Source | Says | Reality |
|---|---|---|
| `SPREADSHEET.md` | 0 rows, HAND only | Schema: **253 rows**; auto-drafter writes post-cycle |
| `event-pools-design.md` §D | DSL ≈ 8 fields | Loader has **lifestate, band, occupation, tier, heritage, fame, culdomain** |
| Early plan | 5 manual rows | Auto-active live; smoke already proved draws |

The code is ahead of the map. For an authoring surface, **stale docs are operational bugs**: next session will re-derive fields that already exist.

---

## Architecture diagram (mental model)

```
Cycle facts (seeds, hood pressure, season)
        │
        ▼
 draftContentRows (cheap LLM / stub)
        │ validate via REAL loader
        ▼
 Event_Content_Ledger (sheet)
        │ Phase 2 loadEventContentLedger_
        ▼
 S.contentLedger { lines[poolKey], fragments[slot] }
        │ Phase 5 per citizen
        ├─ eval conditions (scopes)
        ├─ slots fillable?
        ├─ push makeEntry (additive)
        ├─ life-state hard gate
        ├─ archetype/dial reweight
        ├─ pickWeighted_
        └─ composeContentLine_ → LifeHistory
```

The missing feedback arrow is **LifeHistory draws → drafter / prune**. Right now the system breathes out; it barely inhales.

---

## Concrete depth backlog (ordered by leverage)

1. **Telemetry + prune** — eligible/draw/null counts per row or poolKey; `Active=no` for auto rows dead 10+ cycles or never drawn N cycles.
2. **Refresh ops docs** — `SPREADSHEET.md` row count + ENGINE+SCRIPT writers; regenerate event-pools DSL table from `CONTENT_LEDGER_DSL_FIELDS`.
3. **PoolKey policy** — exclusive/migrate mode so ledger can retire hardcoded blocks pool-by-pool.
4. **Trajectory conditions** — displacement/mood/intent deltas so state→experience tracks change.
5. **Fragment economy** — cycle draw caps + role discipline; reduce “same MOOD clause everywhere.”
6. **Ledger snapshot / content hash** — replay and audit honesty under auto-active.
7. **Baylight / Tribune as proving grounds** — original parked pools: ledger-native content that *must not* drift hardcoded; use exclusive PoolKey policy here first.

---

## Grok bottom line

Event_Content_Ledger is **the right abstraction**: content as conditioned, composable, kill-switchable data, with an immune system strong enough to let a cheap model write into it. That is rare and good.

What it is not yet: **a closed learning loop**. It can load, gate, compose, and mint rows — but it does not systematically learn which lines *lived*, which died, which should displace hardcoded atmosphere, or how the city’s changing state should rewrite the city’s spoken texture.

Depth from here is less “more columns” and more:

- **measure what draws**
- **retire what doesn’t**
- **let PoolKeys own domains**
- **condition on trajectories**
- **keep the map honest with the sheet**
