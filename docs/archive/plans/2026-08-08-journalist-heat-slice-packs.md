---
title: Journalist heat-slice packs Plan
created: 2026-08-08
updated: 2026-08-11
type: plan
tags: [media, business, pipeline, active]
sources:
  - docs/research/2026-08-08-journalist-heat-slice-architecture.md
  - Mike-direct 2026-08-08 — adopt packs architecture; Hal sports historian; Anthony analytic; evening first
  - scripts/buildJaxSlice.js
  - scripts/buildPSlayerSlice.js
  - docs/media/ANTHONY_ANALYSIS_BAG.md
  - docs/media/HAL_ARCHIVE_BAG.md
pointers:
  - "[[engine/ROLLOUT_PLAN]] — pipeline.52"
  - "[[../research/2026-08-08-journalist-heat-slice-architecture]] — research basis"
  - "[[2026-08-07-p-slayer-fan-heat-seat]] — sibling sports fan heat (shipped Task 3)"
  - "[[2026-08-07-anthony-hal-solo-sports-seats]] — Anthony + Hal personas"
  - "[[2026-08-07-culture-sports-support-solo-seats]] — culture solos + bags"
  - "[[2026-08-06-jax-sim-stink-audit]] — Jax stink pack"
---

# Journalist heat-slice packs Plan

**Goal:** Every headless journalist wake gets a real assignment pack built from sheet/Riley truth — via a few **shared substrate packs** plus **persona charge overlays** — so nightlife, fame, restaurants, TV, storefronts, and sports analytic/archive seats stop going silent.

**Architecture:** Do not clone a full custom scorer per seat. Pattern:

```
shared substrate pack → persona charge overlay → optional heat-force in fanout
```

Shipped exemplars: Jax (stink substrate + firebrand overlay), P Slayer (sports fan pulse + charge bag). Next: **evening life pack** (culture consumers), **economic/storefront pack** (business), **sports substrate shared by Anthony + Hal** with separate bags (analysis vs archive). Legacy multi-voice desks remain skills for deep/edition; crons stay persona-only.

**Terminal:** scripts + docs (grok / kimi writable); media terminal for any control-plane skill notes; engine-sheet only if sheet schema changes (not expected for pack builds).

**Research basis:** [[../research/2026-08-08-journalist-heat-slice-architecture]]

**Acceptance criteria:**
1. Evening pack unpacks named restaurants, nightlife, TV/movies, city events, fame sightings from `world_summary` / Riley into machine-readable JSON + markdown slice; culture fanout/persona inject can load it.
2. Economic pack surfaces real Business_Ledger (or world_summary economic) storefronts / workforce pointers without inventing employees.
3. Anthony and Hal both consume a **shared sports substrate** (feed + player POPIDs + line stats when present); Anthony overlay uses `ANTHONY_ANALYSIS_BAG`; Hal overlay uses `HAL_ARCHIVE_BAG` (historian, not fan heat, not business).
4. Plan + research + rollout row registered; no isolated MDs.
5. Offline tests for each new pack builder (mirror `buildPSlayerSlice.test.js`).

---

## Seat map (locked)

| Seat | Role | Substrate | Overlay bag |
|------|------|-----------|-------------|
| P Slayer | Fan heat | Sports fan pulse (**shipped**) | `P_SLAYER_CHARGE_BAG` |
| Anthony Raines | Analytic | Shared sports substrate | `ANTHONY_ANALYSIS_BAG` |
| Hal Richmond | Sports historian | Shared sports substrate (same players/feed) | `HAL_ARCHIVE_BAG` |
| Jax | Accountability | Stink (**shipped**) | Firebrand approach |
| Mason / Kai / Sharon / Maria | Kitchen / arts / lifestyle / ground | **Evening pack** | Per-seat bags |
| Elliot Graye | Faith | Evening + faith registry | `GRAYE_FAITH_BAG` |
| Business seats | Storefront economy | **Economic pack** | seat stance if any |
| Civic domain family | Council / infra / safety / health / env / education | Civic/engine (extend later) | Per-seat bags |
| Tanya / Simon | Clubhouse / long view | Sports substrate | Their bags |
| Marbury / Ariana | Deep analysis memos | Sports line + TrueSource | Data bags |

**Hal correction:** sports historian journalist only — never treat as business desk. Share substrate with Anthony; **do not** share analysis bag.

---

## Tasks

### Task 1: Evening life pack (P0)

- **Files:**
  - `scripts/buildEveningSlice.js` — create
  - `scripts/buildEveningSlice.test.js` — create
  - `scripts/cron-desk-run.js` — inject for culture personas (mason/kai/sharon/maria/graye)
  - `scripts/newsroom-fanout.js` — optional enrich when culture seat is one of the evening consumers
- **Steps:**
  1. Parse `output/world_summary_c{N}.md` `## Evening Texture` (restaurants, nightlife, TV, movies, city events, famous people, trends) + culture lane fame/sighting entries from `desk_signal`.
  2. Emit scored “life pulses” (quiet nightlife, named restaurant, TV slate, fame sighting, city event) with **named** venues only from sources — never invent.
  3. Write `output/slices/c{N}/evening.md` + `output/cron-compare/evening_slice_c{N}.json`.
  4. Persona overlay: recommend which consumer bag fits top pulse (kitchen vs arts vs lifestyle vs ground) without forcing all four.
- **Verify:** `node scripts/buildEveningSlice.test.js` PASS; `node scripts/buildEveningSlice.js --cycle 102` names venues from C102 summary (e.g. The 44th Table, KONO Cocktails).
- **Status:** [x] done (grok 2026-08-08) — builder + tests + cron inject + fanout enrich

### Task 2: Economic / storefront pack (P0)

- **Files:**
  - `scripts/buildEconomicSlice.js` — create
  - `scripts/buildEconomicSlice.test.js` — create
  - Wire fanout `business` desk + cron inject
- **Steps:**
  1. Prefer disk: world_summary business-ish ripples + any Business_Ledger snapshot/export if present; fail-soft offline.
  2. Surface neighborhood rising/cooling **with** named businesses when available; never invent Employee_Count or Key_Personnel.
  3. Artifacts: `output/slices/c{N}/economic.md` + `output/cron-compare/economic_slice_c{N}.json`.
- **Verify:** offline tests; dry fanout enrich path non-fatal if empty.
- **Status:** [x] done (grok 2026-08-09) — builder + tests + cron/fanout; C102 West Oakland cooling + named ledger/evening businesses

### Task 3: Shared sports substrate module (P1)

- **Files:**
  - `scripts/sportsSubstrate.js` (or fold helpers out of `buildPSlayerSlice.js`) — create/extract
  - Refactor P Slayer to call shared parse of world_summary Sports where safe
- **Steps:**
  1. One parser for Sports section rows (cycle, team, event, StoryAngle, Notes, Stats, record/streak/mood/fan, names→POPID).
  2. Export pure functions used by P Slayer, Anthony, Hal builders.
  3. Keep P Slayer scoring/modes private to fan heat.
- **Verify:** existing `buildPSlayerSlice.test.js` still PASS.
- **Status:** [x] done (grok 2026-08-08) — `scripts/sportsSubstrate.js`; P Slayer consumes shared parse; tests PASS

### Task 4: Anthony analytic pulse (P1)

- **Files:**
  - `scripts/buildAnthonySlice.js` — create
  - `scripts/buildAnthonySlice.test.js` — create
  - `scripts/cron-desk-run.js` + `newsroom-fanout.js` — persona `anthony-raines`
- **Steps:**
  1. Consume sports substrate; score for board-architecture heat (resign, trade, WAR/ERA lines, award board) not bleacher charge.
  2. PREWRITE aligned to `ANTHONY_ANALYSIS_BAG` (one evaluative claim, foil from line stats only).
  3. Artifacts: `output/slices/c{N}/anthony.md` + `pslayer`-style cron-compare JSON name `anthony_slice_c{N}.json`.
- **Verify:** tests PASS; third-person analytic approach string; no fan “we.”
- **Status:** [x] done (grok 2026-08-08) — pulled ahead of economic (Mike); cron+fanout wired

### Task 5: Hal archive pulse (P1)

- **Files:**
  - `scripts/buildHalSlice.js` — create
  - `scripts/buildHalSlice.test.js` — create
  - cron + fanout for `hal-richmond`
- **Steps:**
  1. Same sports substrate as Anthony (players/feed present facts).
  2. Overlay `HAL_ARCHIVE_BAG`: present fact first, then era echo; closing palette; not FO PR, not fan heat.
  3. Prior columns from `output/reporters` / desks for Hal if present; wall at wake remains cron-owned.
- **Verify:** tests PASS; approach names historian/continuity; never assigns business desk.
- **Status:** [x] done (grok code; landed by kimi 2026-08-09, commit 916cccdc, while grok locked out) — builder + test + cron/fanout wiring; smoke vs C102 (Kelley re-signing, score 99 era-door, close=elegy)

### Task 6: Civic family shared domain pack (P2)

- **Files:**
  - `scripts/buildCivicDomainSlice.js` — create
  - `scripts/buildCivicDomainSlice.test.js` — create
  - `scripts/newsroom-fanout.js` + `scripts/cron-desk-run.js` — inject for civic solo personas
- **Steps:**
  1. Build one local-only substrate from `desk_signal` civic entries plus available cycle-matched civic decisions/datawakes. Preserve source labels and refs; never query Sheets or invent a civic fact.
  2. Apply domain overlays for Carmen (civic/initiative), Luis (accountability/anomaly), Trevor (infrastructure/transit), Lila (health), Noah (environment), and Angela (education/youth). Rachel stays on her completed `buildSafetySlice.js` pack and is excluded. Each persona receives only its filtered candidate packet; no civic voice, quota, or control-plane agent change.
  3. Emit `output/slices/c{N}/civic-domain.md` and `output/cron-compare/civic_domain_slice_c{N}.json`. Fanout materializes/reuses the shared file at the angle wake; report/write load the same selected persona packet.
  4. Keep all completed heat builders unchanged.
- **Verify:** targeted offline test covers six persona filters, retained refs, empty/fail-soft input, and deterministic reuse; smoke fixture contains a youth-apprenticeship candidate for Angela and no cross-domain candidate.
- **Status:** [x] done (codex 2026-08-11) — shared builder, offline test, fanout/three-wake injection; Rachel safety slice untouched

### Task 7: Legacy desk skill note (bookkeeping)

- **Files:** optional one-liner in culture-desk / sports-desk / business-desk IDENTITY or plan only
- **Steps:**
  1. **Decision (2026-08-11):** Record this in the plan only. Legacy multi-voice desk skills remain pre-cron/edition context; they are not headless wake behavior.
  2. Headless fanout invokes an individual `--persona` per assignment, and the writer-wake prompt requires one piece rather than a multi-voice desk average. No cron rewrite or control-plane IDENTITY edit is required.
- **Verify:** `cron-desk-run.js` persona/fanout path and `CRON_PIPELINE_MAP.md` describe persona slices per rostered journalist.
- **Status:** [x] done (codex 2026-08-11) — plan-only bookkeeping; legacy desk skills left untouched

---

## Build order (Mike-agreed; revised 2026-08-09)

1. Task 1 Evening — **shipped**  
2. Task 3 Sports substrate extract — **shipped** (with Anthony)  
3. Task 4 Anthony — **shipped** (pulled ahead of economic per Mike)  
4. Task 2 Economic — **shipped**  
5. Task 5 Hal — **shipped** (grok code; landed by kimi 2026-08-09, 916cccdc)  
6. Tasks 6–7 as capacity allows  

---

## Open questions

- [ ] Fanout **culture quota = 1**: after evening pack, should high-heat evening force a second culture seat some days? (quota change = separate Mike call)
- [ ] Business pack: live Sheets `Business_Ledger` vs disk-only until snapshot exists — default disk-first offline, optional Sheets behind explicit approve
- [x] Task 6 civic-domain pack: shared substrate plus six persona filters; no civic voice or quota change

---

## Status log

- 2026-08-08 (grok) — Plan filed from research; ready to build Task 1 when session continues.
- 2026-08-08 (grok) — Task 1 shipped: `scripts/buildEveningSlice.js` + test; C102 top pulse quiet-nightlife @ KONO Cocktails; recommends Sharon lifestyle; per-seat fit (Mason→44th Table); wired cron-desk-run culture inject + newsroom-fanout enrich. NEXT: Task 2 economic pack.
- 2026-08-08 (grok) — Mike moved Anthony up chain. Task 3 substrate + Task 4 Anthony shipped: `sportsSubstrate.js`, `buildAnthonySlice.js`; C102 pulse roster-architecture (Kelley resign) score 89, bag tools 1+2; P Slayer tests still PASS. Economic remains next P0; Hal after.
- 2026-08-09 (grok) — Task 2 economic pack shipped: `buildEconomicSlice.js`; C102 West Oakland cooling with Oakmesh / WOCC / Crisis Coffee named from ledger+evening; cron business desk + fanout enrich. NEXT: Task 5 Hal.
- 2026-08-09 (kimi) — Task 5 Hal found code-complete but uncommitted in the tree (grok locked out on usage, builder-directed landing). Validated (test PASS, node --check clean, smoke vs C102: Kelley re-signing score 99 era-door, close=elegy, 3 priors, 2 players) and landed as `916cccdc` with grok attribution. Live from the Mon–Fri 06:15 angle wake. NEXT: Tasks 6–7 when grok returns (or builder reassigns).
- 2026-08-10 (codex) — pipeline.54 promoted Jordan Velez as the first business
  wake package. `JORDAN-LEP2-1` reuses the single-reporter `business-desk`
  identity and carries this plan's economic/storefront pack through LEP/2 as
  sourced anchors and bounded creative limits. Local-only; Tasks 6–7 remain open.
- 2026-08-11 (codex) — Task 6 resolved: the existing civic lane already carries
  `EDUCATION`, and Angela already has an education-specific one-piece stance.
  C103 youth-apprenticeship signals remain shared civic/workforce inputs; a
  dedicated education pack waits for a recurring education-specific source stream.
- 2026-08-11 (codex) — Task 7 resolved: current headless fanout is already
  persona-only with one-piece prompt constraints. Legacy multi-voice desk skills
  remain pre-cron/edition context; no control-plane IDENTITY files changed.
- 2026-08-11 (codex) — Builder directed an actual Task 6 civic-domain pack after
  the plan-only decision. Scope is one local shared substrate for Carmen, Luis,
  Trevor, Lila, Noah, and Angela; completed heat builders stay untouched.
- 2026-08-11 (codex) — Task 6 shipped: `buildCivicDomainSlice.js` selects one
  local civic substrate into six domain packets; fanout materializes it at the
  angle wake and all three wakes reuse the selected packet. Offline tests and
  fanout handoff tests pass; Rachel's completed safety slice is untouched.

---

## Changelog

- 2026-08-08 (grok) — Initial plan; pipeline.52; Hal locked as sports historian on shared sports substrate with Anthony; evening + economic P0.
- 2026-08-08 (grok) — Task 1 Evening life pack shipped.
- 2026-08-08 (grok) — Task 3 sports substrate + Task 4 Anthony analytic pack shipped (order revised).
- 2026-08-09 (grok) — Task 2 Economic / storefront pack shipped.
- 2026-08-09 (grok code; landed by kimi) — Task 5 Hal archive pulse shipped, commit 916cccdc.
- 2026-08-10 (codex) — Connected the shipped economic/storefront pack to Jordan
  Velez's JORDAN-LEP2-1 live package; no model or external-state run.
- 2026-08-10 (codex) — Connected the shared evening pack to Kai Marston's
  KAI-LEP2-1 LEP/2 package with an arts seat overlay. The Packet now carries
  Kai's scored pulse, bag authority, named TV/movie/event/place/fame inputs, and
  source pointers; Mason, Maria, Sharon, and Graye remain separate package
  gates. No model or external-state run.
- 2026-08-11 (codex) — Task 6 resolved through the existing civic `EDUCATION`
  filter and Angela's persona stance; no civic voice, quota, or dedicated slice.
- 2026-08-11 (codex) — Task 7 recorded as plan-only bookkeeping: headless fanout
  remains persona-plus-pack; legacy multi-voice desk skills remain untouched.
- 2026-08-11 (codex) — Reopened Task 6 for the builder-directed local civic-domain
  pack: six persona filters on one shared substrate, without a civic voice or
  quota change. Supersedes the prior plan-only Task 6 closure.
- 2026-08-11 (codex) — Task 6 shipped: local civic-domain shared substrate with
  Carmen/Luis/Trevor/Lila/Noah/Angela filters, targeted offline coverage, and
  fanout plus three-wake injection; Rachel safety slice untouched.
