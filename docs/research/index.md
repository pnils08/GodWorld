---
title: Research Sub-Catalog
created: 2026-06-01
updated: 2026-06-01
type: reference
tags: [research, architecture, active]
sources:
  - docs/plans/2026-06-01-doc-loop-consolidation.md — the plan that created this sub-catalog (S250)
  - docs/SCHEMA.md §10 (index discipline)
pointers:
  - "[[TEMPLATE]] — the shape every instance below follows"
  - "[[../index]] — top-level catalog; points here rather than listing every instance (boot-burn)"
  - "[[../RESEARCH]] — frozen legacy learning log (pre-S250 research lived there)"
---

# Research Sub-Catalog

**Every deliberate research file in `docs/research/` appears here exactly once.** This sub-catalog exists so the top-level `docs/index.md` — a research-build boot read — doesn't grow per research file. "Research never archives," so the corpus only accretes; keeping instances here keeps boot-burn flat. [[TEMPLATE]] defines the shape; this file lists the instances.

Grep here before grepping the tree. Each row: file · one-line purpose · verdict.

---

## Instances

| File | Purpose | Verdict |
|------|---------|---------|
| **[[2026-06-01-headroom-context-compression]]** | Headroom context-compression toolkit — does it earn a place in the stack? | `take-nothing` (canon needs fidelity not compression; boot-burn already solved by discipline) |
| **[[2026-06-01-initiative-tracker-state]]** | Initiative_Tracker subsystem — read/write graph, the missing ImplementationPhase contract, multi-layer drift | `adopt` (ignites [[../plans/2026-06-01-initiative-tracker-contract]]) |
| **[[2026-06-02-show-your-work-engine-fidelity]]** | Show-Your-Work — present the engine AS a world (arc+cause), not raw coordinates; Mags_Ledger + brief show-your-work sections; KONO error-exception | `adopt` (ignites [[../plans/2026-06-02-show-your-work-build]]) |
| **[[2026-06-04-boot-orientation-cleanup]]** | Boot = mechanical-orientation-only; `CLAUDE.md` sole auto-hook, rest on `/session-startup`; history on-call + terminal-tag-scoped; governing-Mags vs worker-Mags; hook-relocation not redesign | `adopt` (direction; no plan — shape emerges when Mike rolls it out) |
| **[[2026-06-05-anthropic-skills-blog]]** | Anthropic "how we use skills" — Gotchas = highest-signal content (our biggest gap); gotchas+memory live IN the skill not a global file; progressive disclosure works when *triggered*; don't-state-the-obvious; descriptions are triggers | `adopt` (institute Gotchas; skill-local gotchas/memory; corroborates boot md) |
| **[[2026-06-16-flux-image-model-eval]]** | FLUX vs current text-to-image field — folds the two FLUX ceilings (text-suppression + named-subject attribute fidelity); headline: live provider is FLUX.1 **schnell** (free distilled), not 1.1 pro — variant bump is the cheap untested baseline before any swap; GPT Image 2 / Ideogram 3 the swap candidates | `adopt` variant bump (engine.37 ready — schnell→FLUX.2 pro, pennies/cycle) · `watch` outside-vendor swap |
| **[[2026-06-20-layered-memory-architecture]]** | OpenAI E98 feedback (Mike-shared) — token-burn IS an editorial problem; tier memory by narrative-salience not recency: Permanent Canon / Story Memory / Historical Archive (queryable-not-injected). Lever = injection filter not deletion; Tiers 1+3 partially exist (canon/ + Supermemory by-ID); new work = Tier-1/2 boundary + retrospective auto-promotion; chaos-cars (engine.11) is the supply side. Empirically anchored to Mara's E98 A- (OARI cost-figure ding = Archive leaking onto page) | `adopt` (design plan pending — research.17 ready row, Mike-gated dedicated session) |
| **[[2026-06-29-citizen-event-depth-audit]]** | Citizen event depth — per-cycle coverage confirmed solved/live; residual is depth: ~25% of citizen classes structurally excluded from stakes-gates, and events lack consequence/memory/non-recycled phrasing (Mike's 4-part test, S277) | `adopt` (rewire stakes-gates + build missing content layer; plan doc to follow) |
| **[[2026-07-04-ripple-attribution-trace]]** | Ripple attribution — the engine computes cause every cycle and destroys it at the cycle boundary (cause stripped at write, multi-cycle ripple state unserialized, several couplings hollow/dead); Chaos_Cars/Initiative_Tracker/Story_Hook_Deck prove the fix pattern already works elsewhere in the engine | `adopt` (ignites [[../plans/2026-07-04-ripple-ledger-attribution]], filed as engine.45) |
| **[[2026-07-04-voice-dial-sync-contract]]** | Voice-agent ↔ dial sync — one-time canon backfill already closed (research.18, archived S274); dials now drift live for voiced citizens (research.14 loop closed S277) but interview/Discord surfaces read a frozen `IDENTITY.md` prose block instead of live `DialState`; agent-generated interview/Discord content is confirmed NOT captured back into the citizen's ledger | `adopt` (two halves — low-risk live-disposition wiring ready to plan; agent-output→ledger ingest needs a Mike gating decision first) |
| **[[2026-07-04-dial-essence-filter-layer]]** | research.22 — can an LLM read citizen dials raw, or does it need a filter? Verified: every consumer (engine logic via bands, LLM via `citizenDials.js:disposition()`) already filters; exhaustive grep found zero raw-`DialState` reads in any skill/agent file | `adopt` (no new filter needed — confirmed existing pattern is correct; documented the contract explicitly in ENGINE_COUPLING_MAP.md) |
| **[[2026-07-05-desk-dispatch-mechanism]]** | `/desk-dispatch` mechanism — re-typed from a mis-filed plan doc (deleted). Mike-direct: mimics `/deep-dispatch`'s proven mechanism (charge-brief, ≤3 bounded source-search, desk-only-writes — two S272 A-grade floor proofs), no real relationship to `/dispatch` despite the name | `adopt` (mechanism-reuse direction settled; input source, write-gate test, staggering order NOT confirmed — no plan doc until they are) |

---

## Notes

- **Pre-S250 research** lives in [[../RESEARCH]] (the frozen learning log) + [[research4_1]] / [[research4_2]] (deep-research files). Those are not re-catalogued here; they migrate opportunistically if ever touched.
- **Non-`.md` research artifacts** in this folder (PDFs, dry-run captures) are raw source material per SCHEMA §7, not template instances — not catalogued here.

---

## Changelog

- 2026-06-01 — Created (S250). First instance: headroom. Per `docs/plans/2026-06-01-doc-loop-consolidation.md`.
