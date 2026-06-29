---
title: Emergent Bio Engine — the R→AT earned-story step (closes the citizen-essence loop)
created: 2026-05-31
updated: 2026-06-09
type: plan
tags: [engine, citizens, autonomy, draft]
sources:
  - "[[2026-05-31-citizen-autonomous-poc]] §Ledger connectivity loop — the O→R→AT loop; this builds the missing R→AT arc (research.13)"
  - "[[2026-05-31-autonomy-roadmap]] — Layer 3 citizen-essence; deploy = load R + AT"
  - "S249 Mike-direct: 'AT = CitizenBio is the earned background through the simulation, the story that emerges' + 'spec the R→AT emergent-story step as its own engine task'"
  - "utilities/compressLifeHistory.js — the live O→R compressor (Phase 9); this is its sibling R→AT step"
  - "scripts/enrichCitizenProfiles.js — editions → O feeder (the newsroom-feeds-essence arc)"
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — engine.30"
  - "[[index]] — register here in same commit"
  - "[[2026-05-31-compression-tag-triage]] (engine.31) — supplies the locking rule (milestone triggers) + clean O this step depends on"
  - "[[2026-05-30-citizen-lifecycle-fame-system]] (engine.29) — milestone events (Wedding/Birth/Death) that trigger AT accretion"
---

# Emergent Bio Engine — the R→AT earned-story step

> **⚠ SUPERSEDED S254 (Mike-direct) — this plan's mechanism is killed; engine.30 repurposed.** The whole approach (an engine that writes an *earned narrative* into the sheet — first to AT, then revised to a bay-tribune harvest) was a fool's errand: the citizen **card already reconstitutes a person** (`buildCitizenCards` = ledger facts + bay-tribune prose via `lookup_citizen`), so writing prose back to the sheet duplicated facts (columns), prose (Supermemory), and assembly (the card). What survives is **engine.30 = citizen-card full-life enrichment** — add the structured life facts already on the ledger (MaritalStatus/NumChildren/Income/LastPromotionCycle + dated milestones) to `buildCard`; a deterministic formatter, no engine, no new column, no prose. **AT stays the human-authored essence spot** (never machine-written). Dials = essence (engine.31), fact-summary = life, prose stays in editions/Supermemory. Current framing lives in the ROLLOUT engine.30 row + the §S254 changelog below; the body beneath is retained as lineage only. The traits→events / city-event fan-out work moved to engine.32 (T5/T6/T8).

## Context

The citizen-essence loop is **O (LifeHistory, raw events) → R (TraitProfile / dials, live compression) → AT (CitizenBio, earned story)**. The S249 review (research.13 §Ledger connectivity loop) verified that **O→R is built and live** (`compressLifeHistory.js`, Phase 9, every 5 cycles) — but **R→AT is the unbuilt third.** AT is populated on only **32 of 904** citizens, and where present it's a *copy of the seed bio*, not earned.

AT is the piece Mike's "any citizen drawn up and deployed instantly steps back into their being" needs: **R gives voice + memory the moment they wake (built); AT gives the story of who they've *become* (missing).** Deploy = load R + AT.

**Intended outcome:** every covered citizen accretes a coherent, canon-true CitizenBio — the emergent story — so the loop closes and a citizen is fully reconstitutable from its row.

### ⟐ S254 finding — the source is the durable archive, and it's already aggregated (supersedes the O-only assumption)

The original spec assumed AT would be composed from O's `[E#]` edition entries. **The live data killed that assumption and surfaced a better source.** Measured S254 (engine-sheet, Mike-direct discussion):

- **O is a poor source for earned bio.** Only **61 of 904** citizens have *any* `[E#]` edition prose in O, from just **7 harvested editions** (78, 80–84, 86). `enrichCitizenProfiles.js` was run a handful of times, never swept the archive.
- **Tier (print count) and prose-in-O have drifted apart.** 17/21 T1 and 56/64 T2 — the *most-covered* citizens — have **zero** prose in O, because they earned their usage-count ascensions (`processAdvancementIntake.js`: 3→T3, 6→T2, 9→T1) in editions *older than the 7 that got harvested*. The counter tracked the appearances; the prose was never pulled back.
- **The earned essence lives — richly — in bay-tribune Supermemory, which is durable (never cleared).** Verified on Elias Varek (POP-00789, empty AT, zero prose in O): the full essence is intact in the archive — Ed 92/94/95 + Supp 94 appearances, the Civis Systems founder bio, the open Paulson-GM-call continuity, cycle-summary facts.
- **`buildCitizenCards.js` already does the hard half.** It reads the ledger (incl. R and AT as columns) + searches bay-tribune for each citizen's appearance history + compiles a per-citizen card *with an APPEARANCES digest* — today writing that card **to** world-data Supermemory. That digest is an earned-bio draft in all but name.

**So engine.30 = `buildCitizenCards`' aggregation run in reverse:** take the assembled bay-tribune appearance history → distill a bounded earned-bio line → **write it back into AT on the sheet.** The aggregation-from-the-deep-archive (the part feared missing) is already built and proven; engine.30 is the write-to-sheet half, sharing the exact same bay-tribune source.

## Scope

**In:** an engine step that reads R (+ milestone/[Compressed] events in O) and **accretes** an earned narrative into AT, preserving any authored seed-bio, bounded in length.

**Out:** the tag-routing / locking / category work (that's engine.31, a dependency); the life-loop agent (research.13); overwriting authored canon.

## The build

### Where + cadence
Two surfaces, because the source is offline-aggregatable (bay-tribune), not just in-cycle ctx:

- **Primary — a Node sweep, sibling to `buildCitizenCards.js`** (e.g. `scripts/buildEmergentBio.js`, or an `--earned-bio` mode on the card-builder since it already assembles the digest). Reads ledger + bay-tribune, distills the appearance history to AT, writes AT via the service account (read-back-verified, `--apply`-gated, copy-guarded like the seed). This is where the real work happens because the rich source is the durable archive, not the live cycle.
- **Secondary — a thin Phase 9 step** for in-cycle freshness: when a milestone fires this cycle (Wedding / Birth / Promotion / Retirement / Death / Graduation / Divorce — the engine.31 "lock" events), stamp a one-line earned note to AT via `ctx.ledger` write-intents (Phase 10 commit). Keeps AT current between sweeps without re-querying the archive every cycle.

**Cadence:** the sweep runs on demand / after edition harvest (where the new prose actually appears); the Phase 9 step is event-triggered only. The earned story should not churn — it grows when coverage or a milestone gives it something new to say.

### Mechanism — accrete, don't overwrite
1. **Trigger** — (sweep) a citizen whose bay-tribune appearance set grew since last AT write; (Phase 9) a milestone event this cycle.
2. **Inputs** — the bay-tribune **APPEARANCES digest** (the `buildCitizenCards` aggregation), the citizen's **dial state** (R / DialState — *which dials hardened*, post-engine.31), and the current AT.
3. **Emit** — append a sentence / short paragraph to AT capturing what was *earned*, anchored to a **real appearance or a hardened dial** ("After the promotion her Drive hardened high — she carried herself differently…"). A hardened dial *is* an earned fact about who they became, so it is the natural anchor. **Never overwrite** prior AT.
4. **Bound length** — when AT exceeds a cap, summarize its oldest portion into a "background" prefix (mirrors O's `[Compressed]` trim pattern) so it grows without unbounding.

### Generation tier = citizen tier (it falls out; default cheap)
The tier ladder already measures coverage depth, so generation richness gates on it for free — no separate dial to set:
- **(a) Deterministic template assembly** from the appearance digest + hardened dials — cheap (search-and-concatenate, no LLM), runs for every covered citizen, flat-but-true prose. **Default.** Citizens with no bay-tribune coverage have no card material → no earned bio, which is **correct** (you can't earn a story you were never in).
- **(b) LLM polish** — richer prose, per-citizen cost; reserve for the **heavily-covered handful** (T1/T2, the established backgrounds). The expensive step (writing the prose) already ran *inside the edition* — engine.30 is composition, which is why the default is cheap. **Tie-in:** the research.13 life-loop narration could *also* feed AT for run citizens — same target field, distinct provenance.

### Earned vs seed — keep them distinct
Authored seed-bio (created at intake, e.g. Lucia's "Saint Lucia in human form" canon) must be **preserved and distinguishable** from the accreted earned-story — either a labelled prefix in AT (`[Seed] … [Earned] …`) or seed moves to its own field. Never let accretion clobber authored canon (self-preservation of canon).

### ⚠ Canon-safety fence (non-negotiable — C92-contamination guard)
**CitizenBio (AT) is a canon-facing, publication-eligible field** — desks read it into editions. An autonomous step writing prose into it is exactly the C92 shape (engine-generated text leaking into publication without a review gate). So:
- Earned accretion is **structurally fenced** — written into a marked `[Earned]` section or a separate `EarnedStory` field, **never** silently merged into the authored canon bio.
- Earned text is **NOT publication-eligible until it passes a review pass** (reviewer-lane / Rhea-class gate), same discipline as every other generated-content surface. Desks consume the *authored* bio + *fenced, reviewed* earned story — not raw accretion.
- "Canon-true, never invented" is necessary but **not sufficient** — a deterministic template can still emit something a desk prints as fact. The fence + review gate is the actual protection, not the prompt instruction.

## Acceptance criteria
1. A citizen with milestone/event history gains a non-empty, canon-true AT that **references real events** (not invented).
2. AT **accretes** across cycles — grows on triggers, does not churn or overwrite on every run.
3. Authored seed-bio is preserved and distinguishable from earned accretion.
4. Loading **R + AT** for an arbitrary citizen reads as a coherent person (the deploy/essence test).
5. Runs inside Phase 9 via `ctx.ledger` write-intents; no direct sheet writes; dry-run safe.
6. **Canon-safety fence holds:** earned accretion is structurally separated from authored bio and is not publication-eligible without a review pass (C92-contamination guard).

**Build order: engine.31 before engine.30** — this step consumes engine.31's locking rule (milestone triggers) and clean O.

## Dependencies
- **engine.31 (compression-tag triage)** — supplies (a) the **locking rule** / dial-hardening that the Phase 9 step anchors to, and (b) the **dial state** (R / DialState) that is input #2. engine.31 is copy-complete (S254); its **live deploy clears O**.
- **engine.29** milestone events (Wedding/Birth/Death) are the Phase 9 accretion triggers.

### Sequencing vs the .31 deploy — narrowed by the S254 finding
The original gate ("preserve everything in O before .31 clears it") was scoped on the wrong assumption. **Edition prose is safe — it lives in bay-tribune, which .31's deploy does not touch.** The *only* thing that vanishes when O clears is **engine-generated milestones that were never published** (a Wedding/Birth/Promotion stamped into O but not yet covered by a desk). So the pre-clear obligation shrinks to: run the engine.30 sweep (or at minimum a milestone-capture pass) so unpublished milestones land in AT before .31 deploys. Much smaller than re-harvesting all of O. The documented build order (engine.31 copy-complete → **engine.30** → deploy .31 live) still holds.

## Files
- **New (primary):** `scripts/buildEmergentBio.js` — the bay-tribune→AT sweep. **Or** an `--earned-bio` mode on `scripts/buildCitizenCards.js`, which already assembles the APPEARANCES digest + reads/writes the ledger incl. AT (col AT) and R (col R). Service-account write, read-back-verified, `--apply`-gated, copy-guarded.
- **New (secondary):** `phase09-digest/buildEmergentBio.js` — thin in-cycle milestone-capture step; reads dial state + `ctx.summary` milestone signals, writes AT via `ctx.ledger` (Phase 10 commit).
- **Source of truth for content:** bay-tribune Supermemory appearance history (durable) — *not* O.
- **Reuses:** `buildCitizenCards.js` aggregation logic; `enrichCitizenProfiles.js` is the complementary editions→O feeder (run `--all` to backfill O for any consumer that still reads it).
- Engine-sheet builds. Gated on Mike's go-ahead.

## Verification
- Run a cycle (dry-run then live) over a sample with known milestones; confirm AT accreted a true line per milestone, seed preserved, length bounded.
- Spot-check 5 citizens: does R + AT read as a coherent reconstitutable person?

## Status log

### engine.30 — status (drained from ROLLOUT, 2026-06-26 / S274)

**Citizen card full-life enrichment** (S254 Mike-direct — REPLACES the killed "emergent bio / R→AT prose-accretion" framing; plan doc SUPERSEDED). **The premise that drove the old design was wrong:** the citizen card already reconstitutes a person (`buildCitizenCards.buildCard` = ledger facts + bay-tribune appearance prose via `lookup_citizen`), so an engine to *write earned prose into the sheet* duplicated facts (columns), prose (Supermemory), and assembly (the card). Killed. **The real gap is tiny:** `buildCard` omits the structured life facts that already live on the ledger — MaritalStatus(21), NumChildren(22)/ParentIds(23)/ChildrenIds(24), Income(26)/WealthLevel(25)/NetWorth(28), CareerStage(33), LastPromotionCycle(36), EmployerBizId(44) + the dated `[Wedding]`/`[Retirement]`/etc. milestones in LifeHistory(14). Add them so the card states the life ("married, 2 kids, works at Civis $142k, promoted C88"). **NOT an engine, NOT a new column, NOT prose** — a deterministic formatter over existing columns (~card improvement). **AT (CitizenBio) stays the human-authored essence spot** — nothing machine-writes it; authored seed-bios ("Saint Lucia in human form") are never clobbered. Dials = essence, fact-summary = life, prose stays in editions/Supermemory (RAG). **Dependency on .31 deploy:** the milestone *dates* with no dedicated column (marriage/divorce/birth/death/retirement — only LastPromotionCycle is columned) live only in LifeHistory(O), which .31's deploy clears; capture them into the card (or column them) before the clear, else end-state survives but the *when* is lost. **S255: BUILT + verified (Mike "make it excellent").** 4 card pieces in `buildCitizenCards.buildCard`: **Life line** (marital + children, POP-00595 inherited-count guard) · **Work line** (career stage + promoted C{N} + education + income + wealth band + net worth; employer by Business_Ledger NAME — live quant 658 employed → 496 name-mapped / 155 Self-employed / 7 sports / 0 broken IDs) · **Essence line** (dial-aware via `utilities/citizenMemory.deserialize_→describe_`; activates automatically when .31's DialState column lands — header-resolved, range A:BZ) · **Fame line** (Cultural_Ledger threading for the 9 POPID-linked figures — answers the dead-ledger concern; ledger itself confirmed alive, `culturalLedger.js` v2.5 writes per cycle) · **MILESTONES block** (dated `[Wedding]`/`[Death]`/etc. from LifeHistory(O), both newline styles, captured BEFORE .31's clear per the dependency above; quality gate fixed so milestone-bearing thin cards still write — POP-00360). Unit tests green; 904-citizen dry-run clean (0 errors). Surfaced ENGINE_REPAIR Row 27 (POP-00331 double-death — upstream generator bug, card renders honestly). **Remaining: full `--apply` rebuild on Mike's go (bulk Supermemory write), then .31+.32 deploy.**

## Changelog
- 2026-06-09 (S254, engine-sheet) — **SUPERSEDED (Mike-direct, same session, later in the discussion).** Walking the design through, Mike landed it: the citizen card already reconstitutes a person, so an engine that writes earned prose to the sheet is a fool's errand — it duplicates the columns (facts), Supermemory (prose), and the card (assembly). The whole R→AT prose-accretion idea is killed (both the original AT-write and the same-session bay-tribune-harvest revision below). **engine.30 repurposed → citizen-card full-life enrichment:** add the structured life facts already on the ledger to `buildCard` (deterministic formatter; no engine, no new column, no prose). AT stays human-authored essence. The traits→events / dial-driven generation / city-event fan-out moved to engine.32 (T5 dials→event-prob, T6 coherence, T8 city-event→citizen-event via Out-and-About). See ROLLOUT engine.30 + engine.32. Body below retained as lineage.
- 2026-06-09 (S254, engine-sheet) — **Design revision from live data (Mike-direct discussion).** Superseded the O-only source assumption. Measured: only 61/904 citizens carry any `[E#]` prose in O (7 harvested editions); tier and prose-in-O have drifted apart (17/21 T1, 56/64 T2 have zero O-prose despite high usage-count ascensions). Verified on Varek (POP-00789) that the earned essence is fully intact in **bay-tribune Supermemory (durable)** and already aggregated by `buildCitizenCards.js` into an APPEARANCES digest. Reframed engine.30 as **buildCitizenCards' aggregation run in reverse** — distill bay-tribune appearance history → write back to AT — primary surface a Node sweep, secondary a thin Phase 9 milestone-capture step. Reconciled to the engine.31 dial pivot (anchor = hardened dial + real appearance, not legacy "trait shift"). Generation tier resolved to *citizen tier* (template default; LLM polish for the covered handful; no-coverage→no-bio is correct). Narrowed the .31-deploy gate: edition prose is safe in bay-tribune, so the only pre-clear obligation is capturing **unpublished engine-generated milestones** out of O. Canon-safety fence unchanged (non-negotiable). No code — design only.
- 2026-05-31 (S249, research-build) — Initial spec. Mike-direct: "spec the R→AT emergent-story step as its own engine task." Closes the citizen-essence loop verified built-except-this-arc in research.13. Filed engine.30. Depends on engine.31 (locking rule + clean O). Building gated on Mike's go-ahead.
