---
title: "ADR-0007: Cross-layer canon authority precedence — Sim_Ledger / bay-tribune / wd-citizens reconciliation contract"
created: 2026-05-24
updated: 2026-05-24
type: reference
tags: [architecture, canon, decision, active]
sources:
  - "[[../plans/2026-05-22-c94-gap-log-triage]] §3 C7 — gap-log cluster that surfaced the pattern"
  - "output/production_log_edition_c94_sift_gaps.md G-S15 / G-S16 / G-S18 / G-S19 / G-S20 — scaffold + layer-divergence instances"
  - "output/production_log_edition_c94_post_publish_gaps.md G-P32 / G-P34 / G-P38 — ingest-side instances"
  - "[[../canon/CANON_RULES]] §Corrections-Forward Maps (canon.2 S218 precedent)"
  - "[[../canon/INSTITUTIONS]] §Faith Corrections Forward (S218 reference implementation)"
  - "[[../archive/plans/2026-05-12-canon-2-faith-scrub]] — paper-of-record principle established"
  - "[[adr/0001-adopt-context-and-adrs]] — ADR bar"
  - "[[adr/0006-parser-validator-format-contracts]] — sibling reviewer-stack contract"
pointers:
  - "[[../plans/2026-05-24-canon-3-cross-layer-citizen-drift]] — implementation plan"
  - "[[../engine/ROLLOUT_PLAN]] — canon.3 row implements this ADR"
  - "[[../canon/CANON_RULES]] — references this ADR from §Cross-Layer Lookup"
  - "[[../../MEMORY.md]] — Memory Protocol search order references this precedence"
  - "[[index]] — ADR registered same commit"
---

# ADR-0007: Cross-layer canon authority precedence — Sim_Ledger / bay-tribune / wd-citizens reconciliation contract

**Status:** Accepted
**Date:** 2026-05-24 (S230)
**Deciders:** Mike (the Maker) + Mags

## Context

GodWorld holds citizen + business canon across three layers that drift independently:

- **Simulation_Ledger** — engine source-of-truth row per POPID. Carries BirthYear, canonical Name form, Neighborhood, Occupation, Employer (BIZID), and ~40 other structured fields. Written by engine phases + post-publish Step 5 ingest (`ingestPublishedEntities.js`).
- **bay-tribune wiki** — Supermemory `wd-bay-tribune` + `bay-tribune` containers. The paper-of-record layer: every published edition's prose + named entities lands here at /post-publish Step 1a/1b (`ingestEditionWiki.js` + `ingestEdition.js`). Queryable via MCP `search_canon` + `lookup_citizen`.
- **wd-citizens** — Supermemory derived-card layer. One doc per POPID built by `buildCitizenCards.js` at /post-publish Step 2a. Enriches the Sim_Ledger row with appearance history pulled from bay-tribune. Queryable via MCP `lookup_citizen`.

C94's gap log cluster C7 surfaced five drift modes across these layers:

- **Bay-tribune-only citizens (G-S18, G-P38).** Carmen Solis (E93 Mam-language community advocate) + Roberto Iglesias (E93 Fruitvale taquería owner) appeared in published canon but never landed in Simulation_Ledger → `buildCitizenCards.js` never built wd-cards for them → MCP `lookup_citizen` returns wrong/no matches. /sift Step 5 then treats them as NEW candidates on the next cycle they're referenced.
- **POPID drift in scaffold (G-S15).** S221 production-log scaffold referenced Beverly Hayes as POP-00576; canon is POP-00772 (the only Beverly Hayes in Sim_Ledger). POP-00576 doesn't exist as Beverly Hayes anywhere — it was a scaffold-time fabrication that carried forward into NEWSROOM_MEMORY without verification.
- **Name canonicalization drift (G-S16, G-S19).** JR Rosado canon-spelled "Rosado" but scaffold used "Rosada" three cycles running. Soria Dominguez has three forms in active use: wd-card "Eloise Soria-Dominguez" (POP-00791); bay-tribune E93 published "Elena Soria Dominguez"; S221 sift slate used "Soria Dominguez" last-name-only.
- **POPID aliasing (G-S20).** Mark Aitken carried as POP-00003 in wd-card + Sim_Ledger; player-truesource layer has POP-00020 with legacy POP-00003 documented. Two POPIDs for one citizen across layers.
- **Step 2a Sim_Ledger-only card lag (G-P32).** `buildCitizenCards.js` iterates Sim_Ledger; new-this-cycle citizens (appended to Sim_Ledger by Step 5 ingest) have no card built until the NEXT cycle's Step 2a runs. Card lag = one full cycle. /sift Step 4 enrichment + Mara audit lookups + future-cycle continuity checks all return empty for genuinely-new citizens.

**Common shape across all five:** No layer has a documented authority over any other for any field class. When two layers disagree, the operator picks ad-hoc (usually whichever surfaced first), and the disagreement persists. No reconciliation contract means each cycle's drift compounds.

**Mike-named principle** (canon.2 S218 corrections-forward map, `[[../canon/CANON_RULES]]` §Corrections-Forward Maps): **bay-tribune is paper-of-record**. Once a published edition canonizes a citizen by name, that name exists in canon regardless of structured-layer state. The corrections-forward map pattern handles substitution when a canon name turns out to be a real-world institution that needs swapping — bay-tribune is never edited backward; structured layers correct forward.

This ADR extends that principle to a layered precedence contract that applies cycle-after-cycle, not just on discrete scrub batches.

## Decision

**Three-layer authority precedence by field class:**

### Simulation_Ledger — authoritative for structured citizen identity

| Field | Why Sim_Ledger wins |
|---|---|
| **POPID** | Engine row primary key. Assigned once at ingest; permanent. |
| **BirthYear** | Engine state — drives age computation (2041 − BirthYear) per CLAUDE.md canon facts. |
| **Name (canonical form)** | Sim_Ledger row's `Name` column is the canonical spelling. wd-card + bay-tribune refs reconciled-forward to match. |
| **Neighborhood** | Engine state — drives neighborhood-coverage + routing. |
| **Occupation / RoleType** | Engine state — drives initiative + voice routing. |
| **Employer (BIZID)** | Engine state — links citizen row to Business_Ledger row. |
| **LifeHistory** | Engine state — narrative anchor for biographical references. |

### bay-tribune wiki — authoritative for published canon

| Field | Why bay-tribune wins |
|---|---|
| **Appearance history** | Once an edition publishes a citizen, that appearance is canon. Sim_Ledger doesn't track edition appearances. |
| **Narrative role in published prose** | E93 published Carmen Solis as "Mam-language community advocate" — bay-tribune is the source for what Tribune readers know about her. |
| **Named relationships** | "Roberto Iglesias, member of Fruitvale Transit Hub Oversight Committee" — bay-tribune carries the relationship; Sim_Ledger doesn't structurally model committee membership at row level. |
| **What was published** | The paper-of-record principle. Never edit bay-tribune backward; correct structured layers forward. |

### wd-citizens — derived view, never authoritative

wd-citizens cards mirror Sim_Ledger rows enriched with bay-tribune appearance summaries. Rebuilt from Sim_Ledger by `buildCitizenCards.js`. **If wd-card disagrees with Sim_Ledger, the rebuild wins.** Use wd-citizens for fast MCP `lookup_citizen` queries during reporter work, but treat it as a cache — the underlying truth is Sim_Ledger (for structured fields) + bay-tribune (for narrative fields).

### Lookup precedence (reporter / sift / agent query order)

When any agent needs to verify a citizen reference:

1. **Sim_Ledger row by POPID** — most specific. If POPID is known, this is canonical for all structured fields.
2. **wd-citizens card by name** — fast structured lookup with appearance enrichment. Use when name is known but POPID isn't.
3. **bay-tribune `search_canon` / `lookup_citizen` MCP** — appearance + narrative verification. Always run for citizens who have published appearances.
4. **If bay-tribune has the citizen but Sim_Ledger doesn't** → canon-layer-drift hit. Route to engine-sheet via `output/canon_drift_c<XX>.json` for backfill. Do not classify as NEW without this check.

### Reconciliation rules

1. **Bay-tribune is paper-of-record.** Citizens who appeared in published editions exist in canon even when structured layers don't carry their row. Editing bay-tribune backward is forbidden except for real-world-institution scrubs governed by `[[../canon/CANON_RULES]]` §Corrections-Forward Maps.
2. **Sim_Ledger gets corrected forward when bay-tribune publishes a different name form.** Per canon.2 S218 precedent. When E93 published "Elena Soria Dominguez" but wd-card carries "Eloise Soria-Dominguez," Mike's call sets the canonical form (S230 ruling: Eloise Soria-Dominguez wins, bay-tribune E93 reference gets corrections-forward entry).
3. **wd-citizens rebuilt from Sim_Ledger wins on disagreement.** If a wd-card says "Eloise" but Sim_Ledger says "Elena," next rebuild writes "Elena" and the disagreement closes. wd-citizens is downstream; the lookup is fast but the source is upstream.
4. **POPIDs are permanent once assigned.** Aliases (legacy POP-00003 ↔ truesource POP-00020 for Aitken) documented in NEWSROOM_MEMORY + `ingestPublishedEntities.js` alias map, not migrated. Migration breaks every past-cycle bay-tribune reference.

### Cross-layer enforcement at ingest

- **/sift Step 5 (triage):** before classifying a candidate as NEW citizen, run `lookup_citizen` against bay-tribune. Drift hits (bay-tribune match + no wd-card / no Sim_Ledger row) get classified `canon-layer-drift`, dumped to `output/canon_drift_c<XX>.json`. Operator decides per case: backfill existing canonical name (a), append as new (b), skip pending engine-sheet reconciliation (c). Default ≠ "append as new."
- **/post-publish Step 5 (ingest):** `ingestPublishedEntities.js` runs same bay-tribune lookup before appending NEW candidates to Sim_Ledger. Mismatches surface in production log + canon_drift JSON.
- **/post-publish Step 5-bis (new step):** after Step 5 appends new POPIDs to Sim_Ledger, immediately re-run `buildCitizenCards.js --apply --popid-range <newly-appended>` to build wd-cards for the new POPIDs. Closes the one-cycle card lag (G-P32). Uses the `--popid-range` flag shipped S223.
- **/post-publish Step 2a verification gate:** `buildCitizenCards.js` exits non-zero on `Errors > 0`. Failure list dumped to `output/citizen_card_failures_c<XX>.json` for engine-sheet diagnosis. Gate strengthening prevents silent 19% partial-failure recurrence (G-P34 lineage).

## Alternatives rejected

1. **wd-citizens as authoritative.** Rejected: wd-citizens is derived from Sim_Ledger by `buildCitizenCards.js`. Promoting a cache to authority means every Sim_Ledger update has to round-trip through wd-citizens rebuild before anyone can trust the new value. Inverts the data flow.

2. **Sim_Ledger always wins (corrections-backward on bay-tribune).** Rejected: would require editing published editions' wiki entries when canonical name changes (Soria E93 "Elena" → "Eloise"). Violates paper-of-record principle established canon.2 S218. The corrections-forward map pattern exists specifically to avoid this.

3. **Bay-tribune always wins.** Rejected: would require Sim_Ledger backfill on every publish without verification. Reporters can name citizens with typos or non-canonical forms (S221 "JR Rosada"); if bay-tribune wins automatically, every typo gets canonized as a name change. Verification gate is structurally necessary.

4. **No precedence — case-by-case operator judgment.** Status quo before this ADR. Rejected: every drift event becomes a new conversation with Mike. Doesn't scale. Soria's three-form drift was unresolved for 2 cycles; Beverly POPID drift carried for 3+ cycles. Precedence rule means resolution is mechanical except for one-time canonical-form decisions.

## Consequences

### Positive

- **Drift resolution is mechanical except for canonical-form decisions.** Lookup precedence + reconciliation rules close most drift without escalation. Only canonical-name decisions (Soria Eloise vs Elena) + POPID-assignment decisions (Aitken POP-00003 vs POP-00020) need Mike's call — and even then, decision shape is "pick one of the two existing forms," not "design from scratch."
- **/sift and /post-publish gain enforced drift detection.** `canon_drift_c<XX>.json` becomes a per-cycle artifact surfacing bay-tribune ↔ Sim_Ledger gaps; engine-sheet has a queue to work from instead of post-hoc audit each time.
- **Card lag (G-P32) structurally closed.** Step 5-bis runs in same /post-publish pass as Step 5, closing the one-cycle wd-card lag for newly-published citizens.
- **Scaffold-time discipline closes G-S15 / G-S16 recurrence.** NEWSROOM_MEMORY entry (companion to this ADR) prescribes MCP-verify-before-write for every citizen reference; production-log scaffolds stop carrying drifted POPIDs/spellings forward.

### Negative

- **/sift Step 5 gets one more MCP call per NEW candidate.** Marginal — `lookup_citizen` is already in the Step 4 enrichment tool inventory; Step 5 adds the call to candidates not yet enriched. Cost ≤2s per cycle in practice (5-10 NEW candidates × 0.2s each).
- **Step 5-bis adds wall-time to /post-publish.** Estimated 30-60s for typical NEW citizen counts (3-7 per cycle). Acceptable; eliminates the manual re-run workaround.
- **One-time canon-drift audit script (T8 in canon.3 plan) requires a one-time scan.** ~15 min engine-sheet pass; produces a backfill list that gets worked T9. Not recurring.

### Out of scope

- **Mara claude.ai's separate lookup discipline.** Mara has her own Supermemory connector + her own search-blind protocol per `docs/mara-vance/CLAUDE_AI_SYSTEM_PROMPT.md`. This ADR governs the GodWorld-side lookup precedence. Mara's protocol may benefit from the same precedence framing but lands in Mara's terminal, not this ADR's scope.
- **Cultural-figure (CUL-) IDs.** Same multi-layer pattern applies (wd-cultural + bay-tribune + Cultural_Ledger) but with different write surfaces (`refreshCulturalAppearances.js` not `buildCitizenCards.js`). Cultural-canon precedence likely mirrors this ADR but earns its own implementation pass. Flagged for follow-up if drift surfaces; not bundled here.
- **Business-canon precedence (Business_Ledger ↔ bay-tribune ↔ wd-businesses).** Closely related but mechanically separate — `ingestPublishedEntities.js` BUSINESSES NAMED parsing is engine.24-governed (parser-side closure S229). Business-canon drift hasn't surfaced as compounding pattern across cycles yet; this ADR's framework extends naturally when it does.

## Reversal triggers

- **If wd-citizens enrichment becomes load-bearing for gameplay (not just lookup speed).** Today wd-cards are a cache; if engine reads wd-card fields directly (instead of round-tripping through Sim_Ledger), wd-citizens earns shared authority on enrichment fields. Re-open the precedence table.
- **If bay-tribune-source-of-truth conflicts arise with anti-fabrication enforcement.** If Tribune publishes wrong-but-canonized content (a reporter fabrication that lands past reviewers), the paper-of-record principle has to be balanced against canon correction. Today the corrections-forward map pattern covers real-world-institution scrubs; case-by-case extension may be needed.
- **If POPID aliasing migration becomes load-bearing.** Today aliases (Aitken POP-00003 ↔ POP-00020) are doc'd, not migrated. If a script-level need arises to consolidate aliases (e.g., a query joining player-truesource + Sim_Ledger needs single-POPID joins), migration tooling earns a separate ADR.

## How to apply

When you encounter a citizen reference and aren't sure which layer to trust:

1. **POPID known?** → Sim_Ledger row is canonical. Read that row directly.
2. **Name known but POPID unknown?** → wd-citizens card via MCP `lookup_citizen(name)` for fast structured lookup. If multiple matches, narrow by appearance via `search_canon(name)`.
3. **Reference is in production-log scaffold or NEWSROOM_MEMORY?** → Always MCP-verify before writing. Per scaffold-time discipline note (NEWSROOM_MEMORY §Standing Editorial Conventions, S230). Drifted scaffolds are how G-S15 + G-S16 happen.
4. **bay-tribune returns hit but Sim_Ledger doesn't?** → Canon-layer-drift. Don't classify as NEW. Surface in `canon_drift_c<XX>.json`; route to engine-sheet backfill.
5. **Two layers disagree on canonical name?** → Mike's call. Then per Reconciliation rule 2, corrections-forward map handles the bay-tribune-side stability; structured layers update.

This is the order /sift Step 4-5, /post-publish Step 5, and reporter agents follow. Document the lookup chain in `output/canon_drift_c<XX>.json` when it produces a drift hit; the cumulative file is the engine-sheet backfill queue.

---

## Changelog

- 2026-05-24 — Initial draft (S230). Approved structure-first by Mike before write. Authority precedence + lookup chain + reconciliation rules. Sibling to ADR-0006 (parser/validator contracts). Implementation lands as canon.3 plan tasks T1-T13 per `[[../plans/2026-05-24-canon-3-cross-layer-citizen-drift]]`. Mike rulings same session: Soria Dominguez canonical name = Eloise Soria-Dominguez (wd-card form wins, bay-tribune E93 "Elena" → corrections-forward map entry per canon.2 S218 pattern); Mark Aitken canonical POPID = POP-00003 (legacy wd-card form wins, truesource POP-00020 → alias doc).
