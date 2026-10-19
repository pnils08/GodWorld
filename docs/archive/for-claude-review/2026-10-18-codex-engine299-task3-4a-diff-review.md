---
title: Codex review — engine.299 Task 3 fixes and Task 4 wave A
created: 2026-10-18
updated: 2026-10-18
type: reference
tags: [engine, citizens, research]
sources:
  - commit b578a6b707645667bd3bd67184986dce5c33a5dd
  - docs/for-claude-review/2026-10-18-codex-engine299-task3-diff-review.md
pointers:
  - "[[plans/2026-10-18-event-engines-move-dials]]"
---

# FIX — Task 3 regression proof/docs; Task 4 signs, Weather admission and reader compatibility

Read `git show b578a6b7`; HEAD and reviewed files match that commit. Review only: no source edits, commit, push, Sheet operation, model, cron or bench fire. GAME/MEDIA/CIVIC mode writers and tier1Essence seeds remain explicitly open and are not blockers attributed to this wave.

## A. Task 3 re-review — runtime F1 CLOSED; overall FIX

**Original F1 runtime fix SHIP.** `phase05-citizens/runNeighborhoodEngine.js:531-535` now adds the neutral city-events line with d:null. An independent real-writer probe used one synthetic citizen, steady/low-pressure hood, a positive cleanup-day world event, and RNG sequence **0 then 0.99**. The drift branch and city-event entry were selected: zero cell/log lines, `noDial=1`, `noDialBySource['runNeighborhoodEngine:Neighborhood:steady']=1`, two draws. The neutral line no longer produces Down. Prior trajectory and pressure findings remain closed.

**A1 — Medium: the added regression never reaches the repaired branch.** `scripts/dialWave2Seams.test.js:162` sets every RNG result to **0.99**. Neighborhood drift is capped at 0.12 (`runNeighborhoodEngine.js:478-483`), so neither citizen enters the pool. The empty result passes `got.every(...)` at test :168 without proving rejection or counting a skip.

Negative control: ran the current seam test with only its neighborhood source read substituted by `git show b578a6b7^:phase05-citizens/runNeighborhoodEngine.js`. **All 27 assertions still pass**, including the new positive-world-event assertion, on the version known to emit Down. Fix the fixture to enter drift, select the unsigned entry, assert a positive skip count and no matching cell/log write; require failure on that parent. No repository code was modified for substitution.

**A2 — Low: original F2 documentation is only partly closed.** The event map :58 and registry's graded-form row :49 now describe this writer. But `docs/engine/TAG_REGISTRY.md:47` still states in present tense that its ordinary hood line is a **plain Neighborhood line**; :48 retains the associated middle-band/housing-pressure qualification. Mark that description as historical or replace it with the trajectory rule while preserving S451's no-rank rule and inert historical tags. Also correct `docs/engine/EVENT_SYSTEM_MAP.md:47`'s new “every line graded” claim: generic Community/Cultural intentionally remain bare with deltas.

## B. Task 4 wave A — FIX

### B1 — Medium: youth sports assigns Up from category, including a negative result

`phase05-citizens/runYouthEngine.js:1020` maps **every sports entry** to Team-Fandom-Up-S. The actual child pool at :179 includes “lost the pickup game on the blacktop and argued the last call all the way home”; the teen pool at :236 includes an injured player watching a game they were not in. Category membership is not the direction of each entry's fact.

Reproduction through the actual `recordYouthLifeHistory_` writer (:1055-1078), using the exact existing pickup-loss text and a synthetic citizen, writes **`[Team-Fandom-Up-S] lost the pickup game on the blacktop and argued the last call all the way home`**, with the same primary tag in the log. The changed education test accepts the new tag vocabulary; it does not check that each selected text supports its sign.

Give these varied sports entries their own supported dial/sign, or skip entries without one. Do not derive the sign solely from sports, civic or safety category membership. The demonstrated blocker is the sports loss; this review does not infer that every other youth entry needs reversal.

### B2 — Medium: the relationship writer still emits a new bare Weather line

The calendar replacements at `phase05-citizens/runRelationshipEngine.js:505-510` resolve correctly. But weather injection at :470-480 is subsequently retagged **Weather** at :533-540, then written without admission at :547-568. Weather remains `{}` in the resolver. This is inside a writer covered by the requested no-new-bare-line hunt, not one of the explicitly deferred mode writers.

Real-writer probe: one synthetic citizen, forced drift/pick, a synthetic special-weather entry and a true heat-wave helper. Both the cell and queued log contain **`[Weather] SYNTHETIC weather encounter`**; `nudgesForEvent_('Weather',1,text)` returns `{}`. This is an inherited path left unclosed by this wave, not a newly introduced Weather assignment. Grade it from its own fact or skip/count it before writing; test that path as well as calendar lines.

### B3 — Medium: relative-temperature shapes default to a positive reaction

`phase04-events/generateGenericCitizenMicroEvent.js:428-429` assigns Outabout-Up to both “running warmer than the rest of the city” and “felt the cool pocket … keeps.” Their construction at :591-595 checks only a relative temperature gap. Neither neutral observation states increased going-out behavior, improved comfort or a positive result.

Real-writer probes forced the last dynamic entry: city/hood temperatures **36/40**, **2/6** and **20/16** all wrote **Background-Outabout-Up-S**, for warmer, warmer and cool-pocket text respectively. A relative difference is not universally beneficial. Require an actually directional fact/reaction, or leave these neutral entries unsigned. A new comfort model is unnecessary; skipping unsupported lines satisfies the rule.

### B4 — Medium: calendar rename changes street-source eligibility

`scripts/newsroomSourcing.js:13-15,313` normalizes **graded** tags with gradedParts_.kind, not calendar suffixes; STREET_TAGS includes Holiday but excludes Relationship. Applying the exact current reader predicate gives **Holiday=true; Relationship-Holiday=false**. Thus the rename at `runRelationshipEngine.js:506` changes the tag admission boundary for these holiday lines. A general statement that baseTag_ preserves every reader is false here; even baseTag_ would return Relationship, not Holiday.

Preserve the intended holiday street eligibility with explicit calendar-aware reader coverage, or obtain/document an intentional exclusion. Add a source-reader regression with a matching highlight. The reproduced change is tag eligibility; this review does not claim an observed published article lost a source.

## Other hunt results and evidence

- **Generic admission / no new inert tags: SHIP for exercised paths.** Admission at `generateGenericCitizenMicroEvent.js:616-628` precedes cell/log writes; :638 now logs the same tag written to the cell. A deterministic 300-run probe across growth/decay/steady, holiday/FirstFriday/CreationDay, previous-evening and unsigned world-event inputs produced **252 written lines, zero inert tags, 48 counted skips**. This proves rejection behavior, not complete pool coverage or correctness of every assigned sign. Community/Cultural have real deltas and may remain bare.
- **Own-hood trajectory: SHIP.** Generic hoodSign_ at :412-415 reads the hood's persisted trajectory, not rank/QoL/citizen context. Task 3's equivalent remains intact. Existing citizen dial multipliers change frequency, not the new sign.
- **Calendar folding: SHIP.** Independently resolved Relationship-Holiday, Relationship-FirstFriday and Relationship-CreationDay: each baseTag_ is Relationship and each yields `{sociability:5,warmth:2}`. These are existing Relationship deltas; they are not graded ±1 tags. B4 is the separate street-reader boundary.
- **Graded readers: SHIP where kind is retained.** citizenDialMap's graded parser/baseTag_ and Phase 9's full-tag resolver remain unchanged. Pulse normalization (`utilities/neighborhoodPulseMap.js:92-97`) retains the base kinds of generic/youth graded tags. Newsroom accepts Neighborhood-Composure-Up-S. No claim is made that renaming a kind to Relationship preserves its old Holiday membership.
- **RNG/persistence/scope: SHIP.** The diff adds no Math.random, sign RNG draw, direct Sheet writer or engine file. Existing seeded RNG and shared ctx.ledger/queued log writes remain. Nine existing files change; no ledger, scheduler or replacement system is added. The fixes above fit the existing writers/readers/tests.
- **Validation:** current dialWave2Seams **27 passed**, educationLoop **120/120**, citizenDials **75 passed**, newsroomSourcing **PASS**. Syntax checks pass for all changed JavaScript files. The new neighborhood assertion's negative control fails to detect its target, as documented in A1. No full-suite rerun; **291/291 is author-reported**, not independently reproduced here.

**Final gate: FIX A1–A2 and B1–B4.** Task 3's neutral-world-event runtime repair is closed. Wave A's admission mechanism and calendar folding are sound, but the requested sign and no-new-inert-line guarantees are not yet met across these three writers. No bench/deployment/live verdict follows from this source review.
