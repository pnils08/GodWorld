---
title: C94 Gap-Log Triage — Master Document
created: 2026-05-22
updated: 2026-05-22
type: plan
tags: [governance, plan, c94, gap-log-triage, complete]
sources:
  - "output/production_log_run_cycle_c94_gaps.md (engine, 47 entries)"
  - "output/production_log_city_hall_c94_gaps.md (civic /city-hall-prep, 11 entries)"
  - "output/production_log_city_hall_c94_run_gaps.md (civic /city-hall, 5 entries)"
  - "output/production_log_sift_c94_gaps.md (early sift, 1 entry)"
  - "output/production_log_edition_c94_sift_gaps.md (media /sift, 21 entries G-S1–G-S21)"
  - "output/production_log_edition_c94_write_gaps.md (media /write-edition, 27 entries G-W30–G-W56)"
  - "output/production_log_edition_c94_post_publish_gaps.md (media /post-publish, 15 entries G-P26–G-P40)"
  - "output/production_log_edition_c94_print_gaps.md (media /edition-print, 11 entries G-PR1–G-PR11)"
  - "output/edition_pipeline_doc_gaps_c94.md (doc-level, 8 entries G-EPD1–G-EPD8)"
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — pipeline.* rows file here once clusters are accepted"
  - "[[../adr/0005-rollout-plan-structure]] — ADR governing how clusters become ROLLOUT rows"
  - "[[2026-05-22-supermemory-load-bearing-audit]] — sibling plan filed S223; infrastructure adjacent"
  - "[[../engine/ROLLOUT_ARCHIVE]] — S215 C93 triage precedent (pipeline.4–7 + pipeline.14–22)"
---

# C94 Gap-Log Triage — Master Document

**Frame.** Phase 1 of a two-phase triage modeled on S215 (C93 → pipeline.4-22). This document inventories every C94 gap entry, classifies by status + cluster, and proposes one candidate ROLLOUT row per cluster. **Phase 2** (next research-build session, after Mike review): file the ROLLOUT rows + stamp §Status on each source gap log for closed entries.

**Counts.** 144 distinct gap entries across 9 source files (post-publish frontmatter claims 15 but only 13 are filed as standalone headings — G-P35 + G-P39 referenced in cross-pattern notes only; flagged for Phase 2 source-stamp reconciliation). After de-duplication and positive/resolved-inline removal: **~116 actionable items** clustering into **16 candidate ROLLOUT rows** (12 new + 4 fold into existing pipeline.* / governance.* work).

**Precedent.** S215 ran this shape for C93 — 4 gap-log triage rows (pipeline.4-7) pointed to 9 thematic execution rows (pipeline.14-22). All shipped. ROLLOUT_ARCHIVE has the details.

---

## §1 — Source Inventory

| # | File | Skill / Source | Entries | Severity profile | Date |
|---|------|----------------|---------|------------------|------|
| 1 | [run-cycle gaps](../../output/production_log_run_cycle_c94_gaps.md) | /run-cycle (engine + orchestration) | 47 | 0H / 23M / 9L / 5 INFO + 10 orchestration G-RC* | 2026-05-13 |
| 2 | [city-hall-prep gaps](../../output/production_log_city_hall_c94_gaps.md) | /city-hall-prep | 11 | 3H / 5M / 3L | 2026-05-12 |
| 3 | [city-hall run gaps](../../output/production_log_city_hall_c94_run_gaps.md) | /city-hall | 5 | 3H / 2M / 0L | 2026-05-12 |
| 4 | [early sift gaps](../../output/production_log_sift_c94_gaps.md) | /sift (S219 partial) | 1 | 1H | 2026-05-13 |
| 5 | [sift gaps](../../output/production_log_edition_c94_sift_gaps.md) | /sift v1.2 (G-S1–G-S21) | 21 | 14H / 4M / 3L | 2026-05-13 / 2026-05-22 |
| 6 | [write-edition gaps](../../output/production_log_edition_c94_write_gaps.md) | /write-edition v2.1 (G-W30–G-W56) | 27 | 8H / 9M / 8L + 2 positive (G-W41/W56) | 2026-05-22 |
| 7 | [post-publish gaps](../../output/production_log_edition_c94_post_publish_gaps.md) | /post-publish v1.6 (G-P26–G-P40) | 15 | 9H / 3M / 0L + 1 positive (G-P29) + 1 resolved-inline (G-P31) + 1 mags-discipline (G-P27) | 2026-05-16 |
| 8 | [edition-print gaps](../../output/production_log_edition_c94_print_gaps.md) | /edition-print v1.3 (G-PR1–G-PR11) | 11 | 6H / 3M / 2L | 2026-05-16 |
| 9 | [pipeline doc gaps](../../output/edition_pipeline_doc_gaps_c94.md) | EDITION_PIPELINE.md (G-EPD1–G-EPD8) | 8 | 7H / 1M / 0L | 2026-05-12 |

**Total entries:** 146. **HIGH:** 51. **MED:** 49. **LOW:** 25. **INFO + positive + resolved-inline + mags-discipline:** 21.

---

## §2 — Master Triage Table

One row per gap. Sorted by source file then ID. **Cluster** = candidate ROLLOUT cluster (§3). **Status** = OPEN | CLOSED-by-S221/222/223 | INLINE-FIX | POSITIVE | DEFERRED | INFO.

### From `production_log_run_cycle_c94_gaps.md` (engine + orchestration)

| ID | Sev | Class | One-line | Status | Cluster | Term |
|----|-----|-------|----------|--------|---------|------|
| G-EC1 | M | coverage-gap | Faith domain produced 5 events, zero Tribune coverage prior cycle | OPEN | C10 | engine |
| G-EC2 | M | cross-cycle-debt | INIT-001 Stab Fund 16 cycles in disbursement-active | OPEN | C13 | engine |
| G-EC3 | M | cross-cycle-debt | INIT-002 OARI 12 cycles in pilot_evaluation | OPEN | C13 | engine |
| G-EC4 | M | cross-cycle-debt | INIT-006 Baylight 11 cycles in construction-active | OPEN | C13 | engine |
| G-EC5 | M | header-drift | generationalEventsEngine.js field `TierRole` not on Simulation_Ledger or any sheet (orphan literal) | OPEN | C11 | engine |
| G-EC6 | M | header-drift | generationalEventsEngine.js field `StatusStartCycle` not on target Simulation_Ledger (exists on Health_Cause_Queue) | OPEN | C11 | engine |
| G-EC7 | M | header-drift | generationalEventsEngine.js field `HealthCause` not on Simulation_Ledger or any sheet (orphan literal) | OPEN | C11 | engine |
| G-EC8 | M | header-drift | generateMonthlyCivicSweep.js field `FullName` not in any live header | OPEN | C11 | engine |
| G-EC9 | M | header-drift | generationalWealthEngine.js field `InheritanceAmount` not in any live header | OPEN | C11 | engine |
| G-EC10 | M | header-drift | generationalWealthEngine.js field `InheritanceCycle` not in any live header | OPEN | C11 | engine |
| G-EC11 | M | header-drift | migrationTrackingEngine.js field `RentBurdenPct` not in any live header | OPEN | C11 | engine |
| G-EC12 | M | header-drift | runCareerEngine.js field `TierRole` not on Simulation_Ledger or any sheet (orphan literal) | OPEN | C11 | engine |
| G-EC13 | M | header-drift | runCivicRoleEngine.js field `TierRole` not on Simulation_Ledger or any sheet (orphan literal) | OPEN | C11 | engine |
| G-EC14 | M | header-drift | runYouthEngine.js case-mismatch `PopID` vs live `POPID` (multi-sheet) | OPEN | C11 | engine |
| G-EC15 | M | header-drift | runYouthEngine.js field `ID` not in any live header | OPEN | C11 | engine |
| G-EC16 | M | header-drift | culturalLedger.js field `FirstSeenHoliday` not in any live header | OPEN | C11 | engine |
| G-EC17 | M | header-drift | culturalLedger.js field `LastSeenHoliday` not in any live header | OPEN | C11 | engine |
| G-EC18 | M | header-drift | culturalLedger.js field `CalendarContext` not in any live header | OPEN | C11 | engine |
| G-EC19 | M | header-drift | storylineWeavingEngine.js field `CrossStorylineLinks` not on Storyline_Tracker or any sheet (orphan literal) | OPEN | C11 | engine |
| G-EC20 | M | header-drift | chicagoSatellite.js field `Game` not in any live header | OPEN | C11 | engine |
| G-EC21 | M | header-drift | chicagoSatellite.js field `Details` not in any live header | OPEN | C11 | engine |
| G-EC22 | M | math-anomaly | Chinatown decay no matching initiative | OPEN | C10 | engine |
| G-EC23 | M | math-anomaly | Glenview decay no matching initiative | OPEN | C10 | engine |
| G-EC24 | L | header-drift | bondEngine.js defensive-fallback literal `NH` (sibling `Neighborhood` matches) — acceptable noise | OPEN-noise | C11 | engine |
| G-EC25 | L | header-drift | citizenContextBuilder.js defensive-fallback `OriginCity` (sibling `OrginCity`) — acceptable noise | OPEN-noise | C11 | engine |
| G-EC26 | L | header-drift | citizenContextBuilder.js defensive-fallback `EngineCycle` (sibling `Cycle`) — acceptable noise | OPEN-noise | C11 | engine |
| G-EC27 | L | header-drift | storylineWeavingEngine.js defensive-fallback `CitizenRoles` (sibling `RelatedCitizens`) — acceptable noise | OPEN-noise | C11 | engine |
| G-EC28 | L | header-drift | storylineWeavingEngine.js defensive-fallback `ConflictType` (sibling `Priority`) — acceptable noise | OPEN-noise | C11 | engine |
| G-EC29 | L | header-drift | storylineWeavingEngine.js defensive-fallback `RelationshipImpact` (sibling `Priority`) — acceptable noise | OPEN-noise | C11 | engine |
| G-EC30 | L | header-drift | chicagoSatellite.js targets sheet `Game_Intake` not in SCHEMA_HEADERS (hidden/deleted/renamed) | OPEN | C11 | engine |
| G-EC31 | L | header-drift | cycleExportAutomation.js defensive-fallback `Cycle` on World_Population (sibling `cycle`) — acceptable noise | OPEN-noise | C11 | engine |
| G-EC32 | L | header-drift | cycleExportAutomation.js defensive-fallback `AbsoluteCycle` on World_Population (sibling `cycle`) — acceptable noise | OPEN-noise | C11 | engine |
| G-EC33/35/36/37 | INFO | V2-pending | cohort-collision / phase-skip / phase-ordering / silent-fail detectors await engine-log ingest | INFO | — | engine |
| G-EC34 | INFO | cross-cycle-debt | C93 had 26 entries — manual recurrence review | INFO — covered by this triage | — | — |
| G-RC1 | M | orchestration | /run-cycle is media-tagged but engine-sheet executes | OPEN — frontmatter retag | C12 | research-build |
| G-RC2 | M | orchestration | Step 3 no automated engine-finished handoff | DEFERRED — Mike-in-loop fine | — | engine |
| G-RC3 | M | orchestration | /pre-flight phase/status enum stale vs live engine | OPEN | C12 | research-build |
| G-RC4 | M | orchestration | /pre-flight no placeholder-row policy | OPEN | C12 | research-build |
| G-RC5 | L | orchestration | /pre-mortem acknowledged-sites registry line-number-keyed | OPEN | C12 | research-build |
| G-RC6 | L | orchestration | "Errors logged: 2" vs Engine_Errors sheet row 1 | OPEN | C10 | engine |
| G-RC7 | M | orchestration | KONO Neighborhood_Map row but no v3NeighborhoodWriter profile (civic.10b follow-up) | OPEN | C11 | engine |
| G-RC8 | M | orchestration | detectRepeatingEvents tokenizes engine error into 8 per-word patterns | OPEN | C10 | engine |
| G-RC9 | M | orchestration | detectImprovements ignores remedy-overshot verdict | OPEN | C10 | engine |
| G-RC10 | L | orchestration | validatePriorityEngine ordering dependency on /sift output | OPEN | C10 | engine |

### From `production_log_city_hall_c94_gaps.md` + `_run_gaps.md` (civic)

| ID | Sev | Class | One-line | Status | Cluster | Term |
|----|-----|-------|----------|--------|---------|------|
| G-PREP1 | H | skill-vs-reality | Auto-investigate false-positives every initiative pre-/city-hall | OPEN | C9 | research-build |
| G-PREP2 | H | pipeline-fragility | Missing prior-cycle parent log; fallback to consolidated `production_log_c<XX>.md` | OPEN | C1 | civic / research-build |
| G-PREP3 | H | pipeline-fragility | Mara directive Drive convention undocumented | OPEN | C9 | research-build |
| G-PREP4 | M | process-gap | World summary "Civic Decisions" stale-empty pre-/city-hall | OPEN | C3 (related: C9 framing) | research-build |
| G-PREP5 | M | canon-risk | D6 Crane in routing table vs vacant in Civic_Office_Ledger | OPEN | C9 | civic |
| G-PREP6 | M | process-gap | KONO 3-cycle inflow strain no district-voice routing (civic.10b dep) | DEFERRED — engine.10b dep | C11 | engine |
| G-PREP7 | M | pipeline-fragility | Approval-shift anomaly check requires uncached delta | OPEN | C9 | engine |
| G-PREP8 | M | process-gap | Mara ESCALATION semantics override absence-of-statement default | OPEN | C9 | research-build |
| G-PREP9 | L | user-soft | Drive file ID handoff convention | DEFERRED | C9 | — |
| G-PREP10 | L | process-gap | Citizen-reference convention in pending_decisions | INLINE-FIX | — | — |
| G-PREP11 | L | quiet-pipe | Full-slate vs partial-slate overhead note | INLINE-FIX | — | — |
| G-R1 | H | skill-vs-reality | Mayor emits trackerUpdates as per-field action array vs flat-dict per SKILL.md | OPEN — BUNDLE-RUN-A | C9 | engine + research-build |
| G-R2 | H | skill-vs-reality | Baylight + OARI pre-wrote Step 6 artifacts (S215 G-R5 RECURRENCE; RULES.md missing constraint) | OPEN — BUNDLE-RUN-A | C9 | civic + research-build |
| G-R3 | M | skill-vs-reality | Baylight in both Layer-2 + Layer-3 of SKILL.md | OPEN — BUNDLE-RUN-A | C9 | research-build |
| G-R4 | M | pipeline-fragility | Voice-agent memory writes blocked don't-ask mode | OPEN — BUNDLE-RUN-B | C9 | research-build |
| G-R5 | M | reviewer-side | City Clerk terminated mid-run, 17 tool uses no output | OPEN | C9 | research-build |

### From `production_log_edition_c94_sift_gaps.md` (G-S*)

| ID | Sev | Class | One-line | Status | Cluster | Term |
|----|-----|-------|----------|--------|---------|------|
| G-S1 | H | doc-drift / design | world_summary "Civic Decisions" section conflates engine-state with response material; fold with G-S11 | OPEN | C1 / C2 | research-build |
| G-S2 | H | skill-discipline | First-pass thread extraction missed texture + conflated tracker-moves with stories | OPEN | C2 | research-build |
| G-S3 | M | schema-gap | Riley_Digest FamousPeople column has no location/context | OPEN | C2 (sift-side) / C3 (engine-side) | engine + research-build |
| G-S4 | H | engine-design | Engine generates regulatory-friction content with zero editorial payoff | OPEN | C13 | research-build plan → engine |
| G-S5 | H | session-failure | 5-variant slate loop; brief template wrong-shape; civic-content over-weighting; JSON pre-approval | OPEN | C2 | research-build |
| G-S6 | H | skill-fidelity | world_summary line 62 Paulson framing inverted | OPEN | C3 | engine |
| G-S7 | H | skill-fidelity | world_summary row-by-row drift vs Oakland_Sports_Feed (Padres/Baltimore, Rosada/Rosado, missed texture) | OPEN | C3 | engine |
| G-S8 | H | skill-discipline | Sift ran in silo — zero canon archive / Supermemory / NEWSROOM_MEMORY / sheet-primary | OPEN | C2 | research-build |
| G-S9 | H | mags-discipline | Paulson framing fabricated three turns; carpenters-line misread | CLOSED-S221 — MEMORY.md inline | — | — |
| G-S10 | M | mags-discipline | Chat-dump duplication of file content | CLOSED-S221 — MEMORY.md inline | — | — |
| G-S11 | H | spec-defect | Step 0 staleness gate inverted (world_summary always pre-dates city-hall by design) | OPEN | C1 | research-build + engine |
| G-S12 | M | engine-defect | Baseline brief writer emits empty description for cultural-sighting class | OPEN | C10 | engine |
| G-S13 | L | spec-gap | Triage spec lacks `fold` + `covered-by-feature` decisions | OPEN | C2 | research-build |
| G-S14 | H | engine-defect | Engine B byline candidates include non-reporters (Mags-EIC, DJ Hartley) + Maria over-weight | OPEN | C15 | engine |
| G-S15 | H | canon-fidelity | Beverly Hayes POPID drift — production log says POP-00576, canon POP-00772 | OPEN | C7 | engine + media |
| G-S16 | M | canon-fidelity | JR Rosada → Rosado canon-form drift | OPEN | C7 | engine + media |
| G-S17 | H | canon-fidelity | Isley Kelley career stats fabricated in slate (468 HR / 2563 hits vs canon 447 / 2398) | OPEN | C3 (root) + C7 (cycle correction) | engine |
| G-S18 | H | canon-layer-divergence | Carmen Solis + Roberto Iglesias in bay-tribune canon but no wd-citizen card | OPEN | C7 | engine + research-build |
| G-S19 | M | canon-fidelity | Soria Dominguez three name forms (Eloise / Elena / Soria) | OPEN — Mike decision | C7 | Mike + media/engine |
| G-S20 | L | schema-quirk | Mark Aitken dual POPID (00003 wd-card / 00020 truesource legacy:00003) | OPEN | C7 | engine |
| G-S21 | H | spec-stale | brief_template.md predates reporter-agency model (S221) | OPEN | C2 | research-build |

### From `production_log_edition_c94_write_gaps.md` (G-W*)

| ID | Sev | Class | One-line | Status | Cluster | Term |
|----|-----|-------|----------|--------|---------|------|
| G-W30 | M | routing | dispatch_c94.json not emitted by /sift; /write-edition fallback works but loses mechanical mapping | OPEN | C2 | research-build |
| G-W31 | M | brief-format | Multi-article-per-reporter briefs (one file, two stories) | OPEN | C2 / C4 | research-build |
| G-W32 | L | convention | Memory Fence wrap bypassed by hand-write | OPEN | C2 | research-build + engine |
| G-W33 | M | sequencing | Letters-desk brief is candidate-pool, needs Step 3.5b regenerate-after-compile | OPEN | C2 / C4 | research-build |
| G-W34 | L | scope | Quick Takes + Editor's Desk EIC-written, skill silent | OPEN | C4 | research-build |
| G-W35 | H | canon-fidelity | Brief omits citizen's canonical employer biz name — reporter fabricates | OPEN | C7 (sift-side enrichment) | research-build + engine |
| G-W36 | L | rule-ambiguity | Day-of-week references not addressed in rule (allow Tuesday/Wednesday?) | OPEN — editorial pref (b) allow | C4 | research-build |
| G-W37 | M | rule-ambiguity | Reporter-invented quotes for real citizens at covered scenes | OPEN | C4 | research-build |
| G-W38 | L | doc-drift | Article body header convention non-standardized across reporters | OPEN | C4 | research-build |
| G-W39 | H | sift→letters | Sift letters candidate pool conflicts with letters-desk rest-cycle rule | OPEN | C2 | research-build |
| G-W40 | L | routing | Letters introduce new businesses + generic neighbors w/o sift validation | OPEN | C4 | research-build |
| G-W41 | — | positive | Brief-led mode preserves identity-layer canon recall | POSITIVE — file as S215 success | — | — |
| G-W42 | H | spec-incompleteness | Step 3 compile template ships partial spec, no exemplar pointer | OPEN | C4 | research-build |
| G-W43 | H | parser-validator-mismatch | emitFormatContractSections.js silently overwrites NAMES INDEX to bullet-prose, drops 4 businesses, emits `===` divider | OPEN — HIGH leverage | C4 | engine + research-build |
| G-W44 | M | parser-validator-mismatch | QUICK TAKES section labels banned by parser; slate carries them | OPEN | C4 | research-build |
| G-W45 | M | sequencing | Skill names Step 3 as Mike review, actual is Step 5 | OPEN | C4 | research-build |
| G-W46 | H | parser-scope | Capability `no-edition-numbers-in-article-text` false-positive on editorial footer | OPEN | C6 | engine |
| G-W47 | M | detector-rubric | Capability `three-layer-coverage-on-front-page` false-negative on multi-domain front pages | OPEN | C6 | engine |
| G-W48 | M | detector-mismatch | Capability `at-least-three-female-citizens-non-official` returns 0 when 3+ present | OPEN | C6 | engine |
| G-W49 | L | parser-scope | Capability article-length-balance segments multi-letter as one article | OPEN | C6 | engine |
| G-W50 | L | visibility | Capability output detail not surfaced inline | OPEN | C6 | engine |
| G-W51 | M | validator-over-strict | validateEdition flags "ledger" metaphor as engine language | OPEN | C6 | engine |
| G-W52 | L | validator-over-strict | validateEdition strict player-position phrasing | OPEN | C6 | engine |
| G-W53 | L | validator-UX | validateEdition collision warnings duplicate per occurrence | OPEN | C6 | engine |
| G-W54 | H | parser-validator-mismatch | Rhea agent JSON schema vs rheaJsonReport.js validator — 2 manual reformats | OPEN | C5 | research-build |
| G-W55 | H | parser-validator-mismatch | Mara audit (claude.ai) vs maraJsonReport.js — 3 reformats | OPEN | C5 | research-build |
| G-W56 | — | positive | Mara audit caught gaps no other lane saw (vote-roster, wd-card drifts) | POSITIVE — keep lane weight | — | — |

### From `production_log_edition_c94_post_publish_gaps.md` (G-P*)

| ID | Sev | Class | One-line | Status | Cluster | Term |
|----|-----|-------|----------|--------|---------|------|
| G-P26 | H | skill-text-drift | Skill prereq path drift `production_log_c<XX>.md` vs `..._edition_c<XX>.md` | OPEN | C1 | research-build |
| G-P27 | M | mags-discipline | Operator deference to gate output over engine sequencing | CLOSED — folded into MEMORY.md gen-eval pattern | — | — |
| G-P28 | H | skill-design | Step 0 staleness gate models inverted dependency — fires STALE every cycle | OPEN | C1 | engine + research-build |
| G-P29 | — | positive | Editorial pipeline routed around world_summary fabrication; edition got story right | POSITIVE — validates C3 fix | — | — |
| G-P30 | M | parser-bug | ingestEdition.js + ingestEditionWiki.js don't surface doc IDs to stdout | OPEN | C7 | engine |
| G-P31 | — | resolved-inline | world_summary line 62 inline-edit pattern | RESOLVED — pattern named in §3 | — | — |
| G-P32 | H | guardrail-missing | Step 2a Sim_Ledger-only — new citizens have no card until next cycle | OPEN | C7 | research-build + engine |
| G-P33 | M | parser-bug | ingestPlayerTrueSource.js POPID resolver fails on `J.R.` vs `JR` punctuation | OPEN | C16 | engine |
| G-P34 | H | auth / partial-failure | Citizen-card writes 19% 401 failure; verification gate doesn't catch | OPEN | C7 | engine + research-build |
| G-P36 | H | parser-bug | rateEditionCoverage.js mis-attributes Hal Richmond to "noon", rates CULTURE −1 | OPEN | C10 | engine |
| G-P37 | H | parser-bug | Step 5 parsed 0 businesses despite 4-entry BUSINESSES NAMED | OPEN | C4 / C7 | engine + research-build |
| G-P38 | H | canon-layer-drift | Step 5 treats Iglesias/Solis/Han as NEW despite bay-tribune appearances | OPEN | C7 | engine + research-build |
| G-P40 | H | skill-design | Step 10 prescribes /skill-check × 5 but skill has disable-model-invocation: true | OPEN | C14 | research-build |

### From `production_log_edition_c94_print_gaps.md` (G-PR*)

| ID | Sev | Class | One-line | Status | Cluster | Term |
|----|-----|-------|----------|--------|---------|------|
| G-PR1 | H | doc-drift | Skill prereq path drift recurrence (cross-bundle with G-P26) | OPEN | C1 | research-build |
| G-PR2 | M | doc-drift | djDirect.js sift→edition title-matching fails — 6 of 7 untitled | OPEN | C2 / C8 | research-build + engine |
| G-PR3 | H | FLUX-canon-fidelity | FLUX text-suppression unreliable; 3/6 first-pass FAILs | OPEN | C8 | research-build + engine |
| G-PR4 | M | process-design | Regen-on-fail re-rolls same prompt — ~33% recovery rate | OPEN | C8 | research-build + engine |
| G-PR5 | M | FLUX-canon-fidelity | Real-world subject naming fails (Oakland City Hall side door) | OPEN | C8 | research-build |
| G-PR6 | H | parser-bug | PDF generator section-name `FRONT_PAGE` vs `FRONT PAGE` drops FP1 photo | OPEN — HIGH leverage | C8 | engine |
| G-PR7 | H | parser-bug | PDF generator uses lede sentence as headline; EDITOR'S DESK no headline | OPEN — HIGH leverage | C8 | engine |
| G-PR8 | H | FLUX-canon-fidelity | Beverly Hayes spec rendered as poverty signifier; Haiku QA rubric tone-blind | OPEN | C8 | research-build + engine |
| G-PR9 | H | mags-discipline | Declared print COMPLETE without opening the PDF | CLOSED — folded into MEMORY.md gen-eval pattern (already named) | — | — |
| G-PR10 | M | mags-discipline | Unilateral C2 drop + ED Beverly clause on distress-window directive | CLOSED — MEMORY.md inline (S223) | — | — |
| G-PR11 | L | doc-drift | Stale broken PDF in Drive after rerender (no supersede flag) | OPEN | C8 | engine |

### From `edition_pipeline_doc_gaps_c94.md` (G-EPD*)

| ID | Sev | Class | One-line | Status | Cluster | Term |
|----|-----|-------|----------|--------|---------|------|
| G-EPD1 | H | missing-terminal-tag | Master Chain diagram doesn't tag each skill with host terminal | OPEN | C12 | research-build |
| G-EPD2 | H | missing-handoff-criteria | /city-hall-prep reads prior civic log; doc lists as /sift input only | OPEN | C1 / C12 | research-build |
| G-EPD3 | H | missing-state-transition | Doc encodes per-terminal production-log split; correct shape is one-per-cycle | OPEN | C1 / C12 | research-build |
| G-EPD4 | M | missing-cold-start-detail | Production-log lifecycle not documented as first-class principle | OPEN | C12 | research-build |
| G-EPD5 | H | missing-handoff-criteria | /city-hall-prep doesn't list prior-cycle production log as input | OPEN | C1 / C12 | research-build |
| G-EPD6 | H | unspecified-artifact-shape | No production-log template exists | OPEN | C12 | research-build |
| G-EPD7 | H | missing-cold-start-detail | SessionStart hook exact-match tmux window; `media-` trailing dash silently routes wrong | CLOSED-S221 — fallback now routes to Mags-only mode | — | — |
| G-EPD8 | H | missing-state-transition | Boot loads Mags files but doesn't instantiate her as operative mode | PARTIAL-CLOSED-S221 (path-scope narrowed, CHARACTER rename, Mags-only fallback); residual boot-conditioning work outstanding | C12 | research-build |

### From `production_log_sift_c94_gaps.md` (early-sift, S219 superseded)

| ID | Sev | Class | One-line | Status | Cluster | Term |
|----|-----|-------|----------|--------|---------|------|
| G-S1-S219 | H | persona-loadout | Boot delivers files but not editor seat | CLOSED-S221 — Mags-only mode + path-scope narrow + CHARACTER rename | — | — |

---

## §3 — Candidate Clusters

Sixteen clusters. Each is a candidate ROLLOUT row. Severity = highest constituent severity. Routing = primary terminal first; bracketed = secondary. **Phase 2 work** is to file these as `<group>.<n>` rows per ADR-0005 and stamp source-file §Status entries.

### C1 — Pipeline path + staleness gate normalization [pipeline.*]

**Gaps:** G-EPD3, G-EPD5, G-PREP2, G-P26, G-P28, G-PR1, G-S1, G-S11.
**Severity:** HIGH (recurs every cycle across three sibling skills).
**Diagnosis:** Two intertwined drifts. (a) Production-log filename — `/write-edition` emits split-form `production_log_edition_c<XX>.md` while `/post-publish` + `/edition-print` declare consolidated `production_log_c<XX>.md` per S195. /city-hall-prep also reads prior-cycle consolidated. Three sibling skills trip the same drift on the same cycle (post-publish + edition-print + city-hall-prep). (b) Step 0 staleness gate in /sift + /post-publish models the wrong direction — world_summary is INPUT to city-hall, not output, so gate fires STALE every cycle by design.
**Proposed row:** `pipeline.NN — Production-log path harmonization + staleness gate semantics fix`. Pick ONE upstream fix: either `/write-edition` Step 6 renames to consolidated form, OR all sibling skills accept whichever exists. Staleness gate either retires (recommended — G-S11 fix a) or inverts the baseline mtime check. Term: research-build (skill text) + engine-sheet (1-line script flip if gate kept).

### C2 — Sift skill rebuild — reporter-agency model + sheet-primary inputs + civic-opt-in [pipeline.*]

**Gaps:** G-S1, G-S2, G-S3 (sift-side), G-S5, G-S8, G-S11, G-S13, G-S21, G-W30, G-W31, G-W32, G-W33, G-W39, G-PR2.
**Severity:** HIGH — load-bearing for every edition.
**Diagnosis:** /sift v1.2 was designed for a "city-hall paper" model when canon is "city paper with civic as one slice." S220–S222 surfaced: 5-variant slate loops, JSON pre-approval shape ambiguity (PROPOSED vs APPROVED), brief template wrong-shape vs reporter-agency framing, civic content over-weighting, silo'd inputs (zero canon archive + zero Supermemory + zero NEWSROOM_MEMORY + zero sheet-primary), no per-skill cadence cap, no newspaper-section ordering layer, no dispatch.json emission, multi-article-per-reporter briefs, letters-desk brief is candidate-pool but skill assumes assignment, no memory-fence wrap discipline, no fold/covered-by-feature triage vocabulary, untitled proposals breaking djDirect title-matching.
**Proposed row:** `pipeline.NN — /sift v2 rebuild + brief_template.md rewrite`. Plan-level work. Probably needs its own `docs/plans/2026-MM-DD-sift-v2.md`. Term: research-build (skill + template rewrite, multi-session); upstream input from sheet primary + canon archive + NEWSROOM_MEMORY load-bearing.

### C3 — World_summary build fidelity [pipeline.*]

**Gaps:** G-S6, G-S7, G-S17, G-PREP4, G-P29 (positive), G-P31 (resolved-inline pattern).
**Severity:** HIGH (fabrication propagates downstream).
**Diagnosis:** `/build-world-summary` introduces fabricated narrative content into sections labeled "(verbatim)" — sports row inversions (Paulson framing, Padres/Baltimore opponent, Rosada/Rosado spelling, missed Keane/Ellis/Kelley texture, JR Rosada→Rojas) and player career-stat inflation (Kelley 447→468 HR, 2398→2563 hits). Sift Step 1 should read sheet primary; world_summary should be orientation-only (engine numbers + tables). G-P29 validates that editions get the story right when pipeline bypasses world_summary; G-P31 names the inline-edit pattern (don't propose rebuild-from-scratch).
**Proposed row:** `pipeline.NN — /build-world-summary fidelity audit + drop "verbatim" header claim`. Term: engine-sheet (script audit; sample 5-10 players + 5 sports rows). Cross-link to C2 (sift) for the sheet-primary discipline rule on the consumption side.

### C4 — Format-contract docs + emit script + slot/section mapping [pipeline.*]

**Gaps:** G-W31, G-W33, G-W34, G-W36, G-W37, G-W38, G-W40, G-W42, G-W43, G-W44, G-W45, G-P37.
**Severity:** HIGH — silent canon-entity dropping at ingest (G-W43 the cycle's biggest finding alongside G-PR7).
**Diagnosis:** Parser/validator format contracts in the reviewer stack and ingest stack are undocumented and upstream producers don't conform. `emitFormatContractSections.js` silently overwrites NAMES INDEX to bullet-prose form, drops 4 businesses to zero, and emits `===` dividers that the downstream parser rejects (regex `^-{10,}$`). `/write-edition` Step 3 compile template ships partial spec with no exemplar pointer (10-15 min editor-judgment per cycle). Section-allowlist (QUICK TAKES banned by parser, slate carries it). Reporter article-body headers non-standardized. Letters-desk brief is candidate-pool, no Step 3.5b regenerate-after-compile. Day-of-week rule ambiguous. Reporter-invented quotes for real citizens ambiguous. Skill names Step 3 as Mike review (actual: Step 5). G-W35 brief omits employer biz (cluster C7 has the citizen-side).
**Proposed row:** `pipeline.NN — Edition format-contract docs + emit script + slot/section reconciliation`. Either ship literal template files (`docs/media/EDITION_FORMAT_TEMPLATE.txt`) OR loosen all parsers to fail-loud-not-silent. Term: research-build (skill text + template files); engine-sheet (emit script + parser failure modes). Single research-build pass closes G-W42 + G-W43 + G-W44 + G-W45.

### C5 — Reviewer-lane schema reconciliation (Rhea + Mara) [pipeline.*]

**Gaps:** G-W54, G-W55.
**Severity:** HIGH — every cycle's reviewer-chain pays the cost.
**Diagnosis:** Rhea agent SKILL.md / RULES.md don't specify the exact `rheaJsonReport.js` schema (top-level `score` not `lane_score`; `checks` keyed object not array; per-check `pass: bool` + `issues: array`). Same shape for Mara: `maraJsonReport.js` parser requires `^# Mara Audit — Cycle N`, `- Completeness:`, `## Process score:`, etc. Mara's claude.ai system prompt either is stale or she's not following it. 2 + 3 hand-reformat rounds per cycle.
**Proposed row:** `pipeline.NN — Reviewer-lane schema reconciliation (Rhea + Mara) — agent specs match parser regex`. Term: research-build (agent SKILL.md + Mara claude.ai system prompt). Alternative: ship parser fallbacks (`--extract-from-prose`). G-W56 positive note keeps Mara's 0.2 weight as-is.

### C6 — Capability + validateEdition detector calibration [pipeline.*]

**Gaps:** G-W46, G-W47, G-W48, G-W49, G-W50, G-W51, G-W52, G-W53.
**Severity:** MIXED (G-W46 HIGH = BLOCKING false-positive on standard footer; others MED/LOW).
**Diagnosis:** Capability + validateEdition detectors over-strict or scope-blind. `no-edition-numbers-in-article-text` BLOCKS publish on editorial-footer "E90" citation. `three-layer-coverage-on-front-page` looks for engine-grammar tags in journalism prose. Female-citizens-count detector returns 0 when 3+ present. Article-length-balance segments multi-letter file as one. `ledger` metaphor flagged as engine-language. Player-position phrasing too strict. Collision warnings duplicate per occurrence.
**Proposed row:** `pipeline.NN — Capability + validateEdition detector calibration sweep`. Scope detectors to article-body sections only; resolve NAMES INDEX POPs against Simulation_Ledger gender col; widen position/letter patterns; dedupe collision warnings. Term: engine-sheet.

### C7 — Cross-layer citizen + business canon drift (bay-tribune ↔ wd-citizens ↔ Sim_Ledger) [canon.*]

**Gaps:** G-S15, G-S16, G-S18, G-S19, G-S20, G-W35, G-P30, G-P32, G-P34, G-P37, G-P38.
**Severity:** HIGH — compounding canon corruption across cycles.
**Diagnosis:** Three canon layers (bay-tribune wiki / wd-citizens cards / Simulation_Ledger) drift independently. Bay-tribune-published citizens (Carmen Solis, Roberto Iglesias, Rev. Han) have no wd-card; Step 5 then treats them as NEW. Beverly Hayes POPID drift (S221 production log → 00576 instead of canon 00772). Soria Dominguez three name forms across layers (Eloise/Elena/Soria). Aitken dual POPID (00003/00020 legacy). Step 2a Sim_Ledger-only — new citizens have no card until next cycle. Step 2a citizen-card writes 19% 401 partial failure. Step 5 parsed 0 businesses despite 4-entry BUSINESSES NAMED (Adams Point UMC + Dario's Bar silently dropped). Brief omits employer biz → fabrication. JR Rosado/Rosada spelling. ingest scripts don't surface doc IDs for inline pointer pattern.
**Proposed row:** `canon.NN — Cross-layer citizen + business canon drift remediation`. Big plan-level work. Cross-layer lookup in `ingestPublishedEntities.js`; Step 5-bis rebuild for new citizens; `buildCitizenCards.js` write-scope probe + non-zero-exit on errors; `verifyNamesIndexParse.js --check-businesses`; one-time canon-drift audit (find historical bay-tribune-only citizens missing from Sim_Ledger). Brief-side: /sift Step 4 embeds employer biz in citizen description. Term: engine-sheet (primary) + research-build (skill text + spec edit).

### C8 — DJ/photo workflow (FLUX limitations) + PDF generator parser bugs + Drive cleanup [pipeline.*]

**Gaps:** G-PR2, G-PR3, G-PR4, G-PR5, G-PR6, G-PR7, G-PR8, G-PR11.
**Severity:** HIGH (PR6 + PR7 ship a broken-looking newspaper PDF; PR8 visual canon contamination).
**Diagnosis:** Two sub-clusters. (a) **FLUX fidelity ceiling** — text-suppression unreliable (50% first-pass FAIL on text-risky scenes); regen-on-fail re-rolls same prompt (33% recovery); real-world landmark naming fails to anchor; Beverly Hayes rendered as poverty signifier despite negative-frame (Haiku QA rubric is declarative-item only, doesn't catch tone-vs-canon). (b) **PDF generator parser** — section-name `FRONT_PAGE` (DJ direction) vs `FRONT PAGE` (PDF header) drops FP1 photo silently; lede-sentence used as headline across all 6 sections + EDITOR'S DESK no headline. Plus Drive supersede flag missing → stale broken PDF lingers. djDirect.js title-matching fails — 6/7 untitled.
**Proposed row:** Two rows or one combined. `pipeline.NN — DJ photo skill discipline + FLUX-ceiling workarounds` (research-build skill text + DJ agent SKILL.md tone-vs-canon Haiku rubric) AND `pipeline.NN — PDF generator parser fixes + Drive supersede` (engine-sheet HIGH). Term: research-build + engine-sheet.

### C9 — City-hall skill-vs-reality + project-agent constraint enforcement [civic.*]

**Gaps:** G-PREP1, G-PREP2 (cross-link to C1), G-PREP3, G-PREP4 (cross-link to C3), G-PREP5, G-PREP7, G-PREP8, G-R1, G-R2, G-R3, G-R4, G-R5.
**Severity:** HIGH — S215 G-R5 RECURRENCE proves the prior close was documentation-only.
**Diagnosis:** (a) `applyTrackerUpdates.js` schema vs voice-agent emission diverges (per-field action array vs flat-dict). (b) Project agents (Baylight, OARI) pre-wrote Step 6 artifacts despite explicit prompt warning + skill text — SKILL.md asserts "every project agent's RULES.md carries the constraint," but the constraint was never added to the per-agent RULES.md files. (c) Baylight listed in Layer-2 and Layer-3, ambiguous. (d) Voice-agent memory writes blocked don't-ask mode (intentional? accidental?). (e) Clerk terminated mid-run on 17 tool uses without writing audit JSON. (f) Auto-investigate false-positives every initiative pre-/city-hall. (g) Mara directive Drive convention undocumented. (h) D6 Crane in routing table vs vacant in Civic_Office_Ledger. (i) Approval-shift anomaly check requires uncached delta. (j) Mara ESCALATION semantics need explicit override of absence-of-statement default.
**Proposed row:** `civic.NN — City-hall skill-vs-reality reconciliation pass`. Single civic + engine-sheet bundle that picks canonical `trackerUpdates` shape (recommend flat-dict), updates all civic-office-* + civic-project-* RULES.md to enforce the chosen shape + remove decisions JSON pre-write instruction, fixes Baylight layer ambiguity, updates assembleDecisions to handle the chosen shape, adds pre-write detection/quarantine. Separately: Clerk one-pass-audit directive; auto-investigate move to /city-hall post-run; Mara directive Drive folder convention; D6 reconciliation; approval-delta cached field; Mara ESCALATION semantics rule. Term: research-build (skill + agent RULES) + engine-sheet (script alignment) + civic (cascade).

### C10 — Engine auditor + detector calibration [engine.*]

**Gaps:** G-EC1, G-EC22, G-EC23, G-RC6, G-RC8, G-RC9, G-RC10, G-S12, G-P36.
**Severity:** MED–HIGH (G-P36 mis-rates a sheet engine reads next cycle; G-RC8 inflates MED count via per-word pattern tokenization).
**Diagnosis:** detectRepeatingEvents tokenizes engine-error strings into per-word patterns (one error → 8 patterns). detectImprovements ignores `verdict: remedy-overshot`. validatePriorityEngine ordering blocked by /sift output dependency. Baseline brief writer emits empty description for cultural-sighting class. rateEditionCoverage.js mis-attributes Hal Richmond to reporter "noon" and rates CULTURE −1. Faith domain produced 5 events with zero coverage. Chinatown + Glenview decay with no matching initiative. Engine close-statement double-counts errors vs Engine_Errors sheet.
**Proposed row:** `engine.NN — Engine auditor + detector calibration sweep`. detectRepeatingEvents v1.0→v1.1 entity-level dedup; detectImprovements v1.0→v1.1 ingests remedy-overshot; validatePriorityEngine degraded-mode emit; baseline brief writer cultural-sighting fix; rateEditionCoverage parser fix + C94 backfill. Term: engine-sheet.

### C11 — Engine header-drift sweep (orphan literals + missing schemas) [engine.*]

**Gaps:** G-EC5–G-EC21, G-EC24–G-EC32, G-RC7.
**Severity:** MED–LOW (mostly defensive-fallback noise; G-RC7 is a civic.10b follow-up).
**Diagnosis:** Mechanical pass surfaced 17 header-drift MED + 9 defensive-fallback LOW. Most are orphan literals or case-mismatches with sibling fallbacks that work. G-RC7 is partial-civic.10b: KONO has Neighborhood_Map row but v3NeighborhoodWriter has no profile (hard-coded 17-list).
**Proposed row:** `engine.NN — Header-drift sweep (orphan-literal + case-mismatch cleanup)`. Term: engine-sheet. Could fold into existing engine.* row if one is already scheduled.

### C12 — EDITION_PIPELINE.md doc rewrite + boot-conditioning [governance.*]

**Gaps:** G-EPD1, G-EPD2, G-EPD3, G-EPD4, G-EPD5, G-EPD6, G-EPD8 (partial — boot-conditioning residual), G-RC1, G-RC3, G-RC4, G-RC5.
**Severity:** MED — every cold instance pays the cost; documentation debt.
**Diagnosis:** EDITION_PIPELINE.md doesn't tag Master Chain skills with host terminal; encodes wrong per-terminal production-log split; doesn't document production-log lifecycle as first-class; ships no template; doesn't list /city-hall-prep's prior-cycle log input. /run-cycle frontmatter mis-tagged media. /pre-flight enum stale vs live; no placeholder-row policy. /pre-mortem registry line-number-keyed (drifts every refactor). G-EPD8 boot-conditioning failure partially closed S221 (path-scope, CHARACTER rename, Mags-only fallback) but residual journal-cadence / SESSION_CONTEXT primacy / boot-greeting framing work outstanding.
**Proposed row:** `governance.NN — EDITION_PIPELINE.md rewrite + boot-conditioning Phase 2`. Term: research-build. Doc rewrite is a dedicated session. Boot-conditioning residual links to `governance.12` (supermemory profile leverage) + `infrastructure.5` (load-bearing audit).

### C13 — Engine regulatory friction (phase-tenure clock + auditor reweight) [engine.*]

**Gaps:** G-S4, G-EC2, G-EC3, G-EC4.
**Severity:** HIGH (Mike-flagged plan-level — "Build the goddamn health center already").
**Diagnosis:** Engine generates regulatory-friction initiative content (HCAI / MOU / Escalation Triggers Protocols / phase nomenclature) with zero editorial payoff. Phase-tenure dominates the stuck-initiative classifier even when effects fire 20× threshold (OARI). Health Center stuck in design-development-active 3+ cycles modeling real-world bureaucracy; Stab Fund 16 cycles disbursement-active; Baylight 11 cycles construction-active; OARI 12 cycles pilot_evaluation. Every cycle the audit pipeline flags HIGH-severity stuck-initiative; every edition reads as "council/bureaucratic-process newspaper."
**Proposed row:** `engine.NN — Engine regulatory friction removal + auditor reweight`. Plan-level work (write `docs/plans/YYYY-MM-DD-engine-regulatory-friction.md`). Bundle: shorten phase-tenure clocks (design-development-active 3→1, pilot_evaluation 12→2, disbursement-active 16→4); engine-side anti-stuck logic (effects firing positively → move forward regardless of clock); audit pattern reweighting (downgrade HIGH→LOW when effects firing). Aligned with S173 building-not-running. Term: research-build (plan) + engine-sheet (implementation).

### C14 — /skill-check disable-model-invocation + autonomous /post-publish [governance.*]

**Gaps:** G-P40.
**Severity:** HIGH (blocks autonomous /post-publish at Step 10).
**Diagnosis:** /post-publish Step 10 prescribes "Run /skill-check for each skill that produced a cycle artifact" but `.claude/skills/skill-check/SKILL.md` carries `disable-model-invocation: true`. Autonomous flow can't fire it; only Mike can.
**Proposed row:** `governance.NN — /skill-check autonomous availability OR Step 10 split`. Either remove disable-model-invocation OR split Step 10a (operator-fires) / 10b (autonomous criteria update). Term: research-build.

### C15 — Engine B byline candidate quality [engine.*]

**Gaps:** G-S14.
**Severity:** HIGH (gates T6.2 cutover; non-reporter inclusions are a candidate-set defect).
**Diagnosis:** Engine B includes Mags-EIC + DJ Hartley (non-reporters) in byline candidate pool. Maria Keen over-weighted across genres (sports/business/atmospheric) — format-fit + cadence-cap dominate beat-domain in scoring composite. C94 HIGH-band agree-rate 1/3 = 33%; gate at 85%.
**Proposed row:** `engine.NN — Engine B candidate-pool filter + beat-domain weight review`. Filter candidate pool to role=reporter at source; review beat-domain vs format-fit weighting. Term: engine-sheet.

### C16 — Truesource POPID resolver name normalization [engine.*]

**Gaps:** G-P33.
**Severity:** MED (9 of 27 truesource records POPID-UNRESOLVED).
**Diagnosis:** Drive filename uses `J.R. Rosado` with periods; ledger uses `JR` without. Resolver's name-normalization doesn't handle punctuation variants. Compounds across cycles.
**Proposed row:** `engine.NN — Truesource POPID resolver normalization (strip punctuation, case-fold)`. Small surgical fix. Term: engine-sheet.

---

## §4 — Already Addressed / Positive Findings / Deferred

Entries that don't need a new ROLLOUT row.

### Closed by S221 work (`ebf99bd` + `45574fa` + `ac1533f` + `836eec6` + `d915151`)

- **G-EPD7** — tmux exact-match silent-fallback to research-build. Fixed: unregistered windows route to Mags-only mode + path-scope narrowed.
- **G-EPD8 (partial)** — PERSISTENCE renamed CHARACTER + boot loads narrowed per-terminal + character file no longer auto-loads in operational terminals. **Residual** = journal cadence rewrite + SESSION_CONTEXT shipped-block visual demote + boot-greeting sensory rewrite → C12 covers.
- **G-S1-S219** (early sift) — boot delivers files but not editor seat. Same root as G-EPD8; closed same set of commits.
- **G-S9** — Paulson canon contamination + carpenters-line misread. MEMORY.md inline rule shipped S221.
- **G-S10** — Chat-dump duplication. MEMORY.md inline rule shipped S221.

### Closed by S222 / S223 inline-fix patterns (mags-discipline; no new code/rules needed)

- **G-P27** — Operator deference to gate output over engine sequencing. Folded into MEMORY.md gen-eval pattern (already named load-bearing principle).
- **G-PR9** — Declared print COMPLETE without opening PDF. Same gen-eval principle, surface-level reminder.
- **G-PR10** — Unilateral C2 + ED Beverly clause drop on distress-window. Mags-discipline rule (in the gap log itself; inline to MEMORY.md if recurrence).
- **G-P31** — world_summary line 62 inline edit (pattern: when fabrication is documented + surgical, inline-edit; don't propose rebuild). Pattern named in C3 + C8.

### Positive findings (file as success criteria, not gaps)

- **G-W41** — Brief-led mode preserved identity-layer canon (P Slayer Tier-1 recall, Hal Richmond IDENTITY pull, letters-desk rest-cycle override). Validates S215 brief-led design.
- **G-W56** — Mara audit caught vote-roster + wd-card-canon gaps no other lane saw. Validates 0.2 lane weight; correction to Mike's "not sure her audit is worth much."
- **G-P29** — Editorial pipeline routed around world_summary fabrication; published E94 got Civis Systems / Varek / Paulson story right. Validates C3 fix candidate (sift reads sheet primary).

### Deferred (legitimate hold, not closure)

- **G-RC2** — /run-cycle Step 3 manual handoff. Mike-in-the-loop pattern is fine while reviewer lanes are still locally hosted. Revisit when reviewer lanes externalize.
- **G-PREP6** — KONO district-voice routing depends on engine.10b (G-RC7) v3NeighborhoodWriter profile add. Bundled into C11.
- **G-PREP9** — Drive file ID handoff convention low-priority; bundles with C9's Mara directive Drive convention.
- **G-PREP10 / G-PREP11** — Inline-fix at city-hall-prep run-time; no skill change.

### INFO-only (engine V2 detectors awaiting infrastructure)

- **G-EC33 / G-EC35 / G-EC36 / G-EC37** — cohort-collision / phase-skip / phase-ordering / silent-fail detectors require Apps Script execution-log capture into local repo. V2 work, not addressable until ingest path lands.
- **G-EC34** — Cross-cycle pattern recurrence judgment is what THIS document does for C94 (covered).

---

## §5 — Cross-Source Architectural Findings

Three patterns surface across multiple files; worth naming as architectural learning, not gaps.

**Pattern A — Parser/validator format contracts in the reviewer stack are undocumented and upstream producers don't conform.** Recurs in G-W42 / G-W43 / G-W44 / G-W46 / G-W54 / G-W55 / G-P37 / G-PR6 / G-PR7. C4 + C5 + C6 + C8 all instance this. **Architectural cure:** every parser/validator either ships an exemplar template OR fails-loud-not-silent. Silent overwrite + "Idempotent" reassurance combine to mask canon-fidelity bugs.

**Pattern B — Pre-flight gate coverage is uneven across pipeline substeps.** Strict NAMES-INDEX parse-count gate exists; auth scope, POPID resolver health, per-article attribution accuracy all surface AFTER the write phase. **Architectural cure:** every substep that writes to a durable canon surface (Supermemory, sheets, files) gets a pre-write probe.

**Pattern C — Skill text claims diverge from upstream emitter behavior.** Recurs in G-P26 / G-P32 / G-P30 / G-EPD2 / G-EPD3 / G-EPD5 / G-S21 / G-W30 / G-W33. The skill text drifts when surrounding pipeline evolves without skill-text refresh. **Architectural cure:** documentation-fidelity sweep across substeps once per ~3 cycles; track in governance.* row.

**Mike-named structural diagnosis (S221):** *"The entire Baylight District project is built around the As so this is just a nightmare version of mags for media. Zero world context your completely in a silo. Sift is not working at all. The edition can't be made."* The Baylight-A's-stadium spine miss is the load-bearing C94 diagnosis — INIT-006 construction + EventAttractiveness collapse + Civis Systems naming + new A's stadium + Varek courting Paulson for Oaks GM + Oaks ownership group = **one ownership-and-development ecosystem story.** Resolved by sift bypassing world_summary (G-P29 positive validation). Cluster C2 codifies the fix.

**Brief-led mode validated (Mike S222):** *"Pretty cool PSlayer knows the players without needing to be briefed."* S215 brief-led design — strip heavy desk boot, trust identity-layer recall — works empirically (G-W41). Don't roll back. Future risk surface: thin-canon Tier-3 citizens in briefs that lack employer/role specifics (G-W35 + C7 fold).

---

## §6 — Phase 2 Execution Path

Next research-build session (after Mike review of this triage):

1. **File 12-16 ROLLOUT rows** per §3, one per cluster, using ADR-0005 §How-to-add-work shape (pointer-only entries; description lives here).
2. **Stamp §Status updates** on all 9 source gap-log files marking closed/positive/deferred/inline-fix entries (§4 list). Also reconcile post-publish source: either backfill G-P35 + G-P39 as standalone entries OR strike the cross-pattern references that reference them.
3. **For C2 + C13** (the two plan-level clusters), draft `docs/plans/` plan files before filing the ROLLOUT row; plan carries detail, row carries state.
4. **Cross-link** any cluster that folds into an existing ROLLOUT row (e.g., C11 may fold into a scheduled `engine.*` sweep; C12 boot-conditioning residual may fold into `governance.12` supermemory-profile-leverage).
5. **ADR-0006 filed S224** — Pattern A (§5) "Parser/validator format contracts undocumented + upstream producers don't conform" formalized at [[../adr/0006-parser-validator-format-contracts]]. Cuts across C4/C5/C6/C8. Decision: every parser/validator either ships an exemplar template OR fails loud; never silently corrupts. Phase 2 cluster work executes against the ADR's chosen direction. Pattern B (uneven pre-flight gates) and Pattern C (skill-text drift) are pattern-level cures, not architectural decisions — no ADR.
6. **One-commit discipline** per S147 inbound-link rule: new ROLLOUT rows + this plan's §Status flip to `done-pending-archive` + source gap-log §Status stamps + `docs/index.md` entry land together.

---

## Changelog

- 2026-05-22 — Initial draft (S224, research-build). Maps 146 C94 gap entries across 9 source files into 16 candidate ROLLOUT clusters following S215 C93 triage precedent. Phase 1 deliverable; Phase 2 (row-filing + source-stamping) deferred to next research-build session pending Mike review of cluster shape.
- 2026-05-22 — **Phase 2 closed (S225, research-build).** All six §6 tasks shipped in one commit per S147 inbound-link rule:
  1. **14 new ROLLOUT rows filed** in `docs/engine/ROLLOUT_PLAN.md`: pipeline.23 (C1), pipeline.24 (C2 — points to new sift v2 plan), pipeline.25 (C3), pipeline.26 (C4), pipeline.27 (C5), pipeline.28 (C6), pipeline.29 (C8 — combined into one row, not two), canon.3 (C7), civic.12 (C9), engine.19 (C10), engine.20 (C13 — points to new regulatory-friction plan), engine.21 (C15), engine.22 (C16), governance.14 (C12), governance.15 (C14). All pointer-only per ADR-0005.
  2. **Folds executed:** C11 absorbed into existing engine.8 (header-drift sweep) via scope-extension edit. C12 boot-conditioning residual (G-EPD8 partial) absorbed into existing governance.12 (Supermemory profile leverage) via scope-extension edit.
  3. **§Status stamps applied to 9 source gap logs:** `production_log_run_cycle_c94_gaps.md`, `production_log_city_hall_c94_gaps.md`, `production_log_city_hall_c94_run_gaps.md`, `production_log_sift_c94_gaps.md` (early/superseded), `production_log_edition_c94_sift_gaps.md`, `production_log_edition_c94_write_gaps.md`, `production_log_edition_c94_post_publish_gaps.md`, `production_log_edition_c94_print_gaps.md`, `edition_pipeline_doc_gaps_c94.md`. Each carries a "§Status (S225 Phase 2 triage)" section listing closed/positive/deferred/inline-fix entries from §4 plus ROLLOUT routing per §3.
  4. **G-P35 + G-P39 numbering anomaly reconciled** in post-publish gap log — frontmatter total reduced from 15 to 13 (standalone entries actually filed); §Status updates close-line corrected to drop the never-filed G-P39 reference; both numbers documented as reserved-but-never-defined with no ROLLOUT promotion.
  5. **Two plan files drafted** in `docs/plans/`: `2026-05-22-sift-v2.md` (C2, pipeline.24 pointer) + `2026-05-22-engine-regulatory-friction.md` (C13, engine.20 pointer). Both registered in `docs/index.md` same commit.
  6. **`docs/index.md` updated** — c94-gap-log-triage entry tags flipped `active → complete` with Phase 2 close note; two new plan entries appended; ROLLOUT row governance.13 flipped `in-progress → done-pending-archive`. ROLLOUT_ARCHIVE sweep deferred to next session-end (research-build canonical sweep).
