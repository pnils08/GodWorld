---
title: "Gap-Log Triage — C100"
created: 2026-07-05
updated: 2026-07-05
type: plan
tags: [governance, plan, gap-log-triage, active]
sources:
  - "output/production_log_c100_post_publish_gaps.md (post-publish, 4 gaps + 1 obs + 4 structural findings)"
  - "output/production_log_c100_print_gaps.md (edition-print, 5 gaps)"
  - "output/production_log_run_cycle_c100_gaps.md (run-cycle mechanical + judgment + all LEGs: G-EC/G-PREP/G-R/G-S/G-W, 34+11 entries)"
pointers:
  - "[[GAP_LOG_TRIAGE_PLAYBOOK]] — THE METHOD (8 steps)"
  - "[[TEMPLATE]] — generic plan shape this specializes"
  - "[[archive/plans/2026-05-29-c95-gap-log-triage]] — canonical worked example"
  - "[[../engine/ROLLOUT_PLAN]] — governance.46 pointer row lands here"
---

# Triage — C100 gap logs

Three gap logs from the S271 C100 production run (post-publish, edition-print, run-cycle — the latter carrying every heavy-skill LEG: engine audit, city-hall-prep, city-hall, sift, write-edition). Never triaged into ROLLOUT before this session — C96/C99 got rows (pipeline.36/37/39); C100 sat on disk since 2026-06-24.

**Cluster Map — gaps → theme → track → folds**

| Theme | Sev | Constituent gaps | Track | Folds ROLLOUT |
|---|---|---|---|---|
| T1 — Autonomy-blocking stdout gaps | MED | G-P-C100-1, G-P-C100-3, G-PR-C100-3 | B (ES-1) | — |
| T2 — Exemplar extractor desk-key mismatch | MED | G-P-C100-2 | B (ES-2) | — |
| T3 — DJ/photo pipeline contract + FLUX cost waste | MED | G-PR-C100-1, G-PR-C100-2 | — | pipeline.13 (photo pipeline rebuild, in-progress) |
| T4 — Header-drift Type-2, new C100 batch | MED×~20 | G-EC2–G-EC26 | — | engine.8 (header-drift triage, blocked) |
| T5 — Chaos-cars fires, nothing reads it | HIGH | (post-publish structural finding) | B (ES-3) | — |
| T6 — Real-world clock stamped into generated docs (systemic) | HIGH | G-R1 (systemic half — sheet-cell half already closed by engine.44 Class 1) | B (ES-4) | — |
| T7 — Reviewer lanes self-score; grading floor doesn't track real quality | HIGH | G-W-C100-GRADE, "grader rewards avoidance" (post-publish structural) | A (RB-1) | — |
| T8 — Manual-step log, 48 steps vs target ~3 | HIGH | G-W-C100, "automation readiness" (post-publish structural) | — | pipeline.35 (cycle-init admin skill, ready) + pipeline.2 (non-edition pipeline, in-progress) |
| T9 — Brief-led starves canon, produces surface writing | HIGH | G-W-C100-DEPTH, "depth never injected" (post-publish structural) | — | research.20 (deep-dispatch, in-progress — this IS the fix, C100 is another data point for it) |
| T10 — Freshness rule excludes Tier-1/pillar characters | MED | "freshness rule suppresses central characters" (post-publish structural) | — | pipeline.24 (sift v2 rebuild, in-progress) |
| T11 — non-canonical ImplementationPhase vocab at write time | MED | G-R3 | — | civic.14 (Initiative_Tracker contract Phase 3, in-progress) |
| T12 — Sentiment lockstep (dominant open engine defect) | HIGH | G-EC33 | — | engine.38 (Living City, in-progress) — already tracked, no new row |
| T13 — Small bounded fixes, batched | LOW-MED | G-P-C100-4, G-S1, G-PREP1, G-R2, G-PR-C100-5, G-EC34, G-EC1 | B (ES-5) | — |

---

## Track A — research-build (apparatus: rubrics, skill contracts)

### Phase RB-1: Grading-floor honesty pass (Theme T7)
- **Source gaps:** G-W-C100-GRADE + post-publish "grader rewards avoidance" finding
- **Absorbs ROLLOUT:** none (adjacent to but distinct from ADR-0012's floor recalibration, which targets sourcing depth not scoring formula)
- **What:** `gradeEdition.js` scores `10 − criticals×2 − warnings×0.75` — zero errata scores A regardless of whether the edition covered the cycle's real events with the characters that matter. Rhea (0.91)/cycle-review (0.97) are checklist-pass lanes that always clear; only Mara (0.833, prose critique) tracked reality on C100, and even she under-scored her own text ("a third reverted to C96 machinery pattern" got a B+).
- **Steps:** Add an "aliveness / actual-events-covered" dimension to `docs/media/story_evaluation.md` (selection-side, Mara-style qualitative check, not another checklist gate) that can pull a clean-but-dead edition's grade down. Document that Rhea/cycle-review are necessary-not-sufficient (process/checklist lanes) and Mara is the reality-check lane — the Final Arbiter weighting (0.5/0.3/0.2 per REVIEWER_LANE_SCHEMA) already leans Rhea-heavy; flag whether that weighting needs revisiting once the new dimension exists (open question below, not blocking this phase).
- **Verify:** `grep -n "aliveness\|actual-events-covered" docs/media/story_evaluation.md` returns the new criterion.
- **Status:** [x] done S298 — §Aliveness added (top-3-events check, B-cap for clean-but-dead, lane roles documented, Arbiter re-weighting left as the Mike-gated open question)

---

## Track B — engine-sheet (substrate: scripts, engine code)

### Phase ES-1: Autonomy-blocking stdout fixes (Theme T1)
- **Source gaps:** G-P-C100-1, G-P-C100-3, G-PR-C100-3
- **Absorbs ROLLOUT:** none
- **Steps:**
  - `scripts/ingestEdition.js` (Step 1b) — print the returned bay-tribune doc `id` on its own log line (mirror `ingestPlayerTrueSource.js`'s `doc <id>` shape).
  - `reward_hacking_scan` script — scope `productionLogsScanned` to the current run cycle only (or exclude `production_log_edition_c*.md` older than the run cycle) so it stops re-flagging C94's stale regen markers every cycle (fired identically on C98 and C100).
  - `scripts/generate-edition-pdf.js` — the "rendered N but manifest has M" parity warning should name the orphaned slug + its section, not just the count mismatch.
- **Verify:** re-run each script against C100 fixtures; confirm doc ID prints, reward-hacking scan returns clean on C100-only corpus, parity warning (if triggered on a fixture) names the slug.
- **Status:** [ ] not started

### Phase ES-2: Exemplar extractor desk-key reconciliation (Theme T2)
- **Source gaps:** G-P-C100-2
- **Steps:** `scripts/extractExemplars.js` reported "no articles found" for civic + letters despite A-grade civic articles (4) and letters (3) existing in `grades_c<XX>.json`. Reconcile the desk-name keys the extractor uses against the actual byline/section labels ("Bay Tribune Civic" / section CIVIC; LETTERS).
- **Verify:** re-run against C100 grades file; civic + letters both extract their A-grade pieces.
- **Status:** [ ] not started

### Phase ES-3: Wire Chaos_Cars into the read side (Theme T5)
- **Source gaps:** post-publish structural finding ("Chaos-cars orphaned")
- **Steps:** `Chaos_Cars` holds 6 live C100 events (engine.11 fired correctly) but `buildWorldSummary.js` + sift inputs never ingest it — grep of engine_audit/world_summary/sift/anomalies for "chaos" returns zero. Wire `Chaos_Cars` into `buildWorldSummary.js` output and sift's input set.
- **Verify:** `grep -i chaos output/world_summary_c<XX>.md` returns a hit on a cycle with live Chaos_Cars rows.
- **Status:** [ ] not started

### Phase ES-4: Strip real-world date stamps from generated docs (Theme T6, HIGH)
- **Source gaps:** G-R1 (systemic half — engine.44 Class 1 already closed the sheet-CELL half of this; this phase is the DOC-GENERATION half, still open)
- **Steps:** `engine_review_c{XX}.md`, `engine_audit_c{XX}.json`, `baseline_briefs_c{XX}.json`, and `civic_initiatives_c{XX}_mara.md` all stamp a literal Gregorian date in their header (e.g. `Date: 2026-06-23`) at generation time via `buildWorldSummary.js` / engine-review scripts. Replace with Session/Cycle provenance refs (no `YYYY-MM-DD`) per the same convention `docs/plans/2026-07-03-sheet-walk-audit-triage.md` Class 1 used for sheet cells.
- **Verify:** `grep -E "20[0-9]{2}-[0-9]{2}-[0-9]{2}" output/engine_review_c<XX>.md output/engine_audit_c<XX>.json output/baseline_briefs_c<XX>.json` returns zero on the next generated cycle.
- **Status:** [ ] not started

### Phase ES-5: Small bounded fixes, batched (Theme T13)
- **Source gaps:** G-P-C100-4, G-S1, G-PREP1, G-R2, G-PR-C100-5, G-EC34, G-EC1
- **Steps (each independent, bundle into one session):**
  - G-P-C100-4: `ingestPlayerTrueSource.js` — 8/27 POPIDs unresolved every sweep; backfill ledger POPIDs or add a resolution alias for the 8 (dump already lands in `intake_player_truesource.json`).
  - G-S1: confirm whether Story_Seed_Deck `SeedText` is intentionally hashed in the export; if intentional, document the domain→slot mapping path so sift stops attempting text-match against it.
  - G-PREP1: wire `buildInitiativePackets.js` into `/run-cycle` so `initiative_tracker.json` refreshes each cycle instead of lagging the live sheet.
  - G-R2: add a deterministic length-lint on assembled tracker `MilestoneNotes` (mirror the existing packet telemetry lint) so the ≤~200-char cap stops needing manual trim every cycle.
  - G-PR-C100-5: confirm whether letters need per-letter `###` sub-headline rendering in the PDF; if yes, promote the sub-heads in the LETTERS-block parser.
  - G-EC34: trace the `EveningTraffic` NaN leak (likely phase02 cityDynamics or phase08 fold aggregate); guard the operand.
  - G-EC1: document/enforce the run-order dependency (`/engine-review` must complete before `/engineCycleAudit` reads `engine_audit_c{XX}.json`) so this doesn't fire as a false HIGH every time the audit runs first.
- **Verify:** each fix verified independently per its own one-line check above; no single verify command covers the batch.
- **Status:** [ ] not started

---

## §Already-Addressed / Folded / Out-of-Scope

- **G-PR-C100-1, G-PR-C100-2** → fold into pipeline.13 (photo pipeline rebuild, in-progress) as concrete C100 evidence for the DJ output-contract + renderable-section-bounding work already scoped there.
- **G-EC2–G-EC26 (header-drift, ~20 entries)** → fold into engine.8 (header-drift triage, blocked) as the C100 batch, same recurring class as the C93/C94 clusters already tracked there. Absorb, don't re-file.
- **G-W-C100 (48-step manual log) + post-publish "automation readiness" section** → fold into pipeline.35 (cycle-init admin skill, ready) + pipeline.2 (non-edition publish pipeline, in-progress). The C100 step-count is the concrete spec for what the deterministic runner (compile→emit→seal→validate→arbiter) needs to automate — cite it there, don't duplicate the list.
- **G-W-C100-DEPTH + post-publish "depth never injected"** → this IS what research.20 (deep-dispatch) already fixes — two A-graded floor proofs exist from S272 including a civic piece that independently surfaced the C100 Coliseum anomaly the live pipeline suppressed. C100's surface-writing outcome is further evidence for shipping engine.46 (Phase 1 substrate) to unblock the Phase 3 pilot. No new work; cited as supporting data.
- **G-R3 (non-canonical ImplementationPhase vocab)** → fold into civic.14 Phase 3 (emit/enforce still owed) — already the exact scope.
- **"Freshness rule suppresses central characters" (post-publish structural)** → fold into pipeline.24 (sift v2 rebuild, in-progress). Concrete fix: Tier-1/pillar citizens in active arcs (Vinnie Keane farewell season, etc.) should be pull-targets, not freshness-exclusions.
- **G-EC33 (sentiment lockstep)** → already tracked as the dominant open defect on engine.38 (Living City, in-progress). No new row; not restated here beyond the citation.
- **G-EC31, G-EC32 (chaos-cars CycleId + header)** → RESOLVED S271 already (code fix `3263c5bf` + live header rename). No action.
- **G-EC18–G-EC26 defensive-fallback siblings (LOW)** → the gap log itself marks these "acceptable noise" (sibling literal exact-matches the live header). No fix needed.
- **G-EC27–G-EC30 (cohort-collision/phase-ordering/phase-skip/silent-fail, INFO, V2-PENDING)** → blocked on the Apps-Script execution-log ingest path not existing yet. Not actionable until that infra lands (separate, larger item — not scoped here).
- **OBS-C100-A (two players tagged same position)** → low-priority backlog item for a future roster role-collision check at wiki-extraction time. Not a phase; noted for whoever next touches the wiki extractor.
- **G-PR-C100-4 (FLUX jersey-back text ceiling)** → standing, known, recurring FLUX limitation (C98/C99/C100). No fix available at this layer; the spec-craft lesson (front-facing/hands-tight over dugout-bench angles) is already documented in the gap log itself for future DJ prompts.
- **G-PREP2, G-S2, G-R4** → informational / non-gaps / minor-no-tracker-delta. No action.

---

## §ROLLOUT row (the output — ONE row)

`governance.46 | C100 gap-log triage — 3 logs / ~50 entries → 13 themes → 6 new phases (1 RB + 5 ES) + 6 folds into existing rows | in-progress | research-build / engine-sheet | this plan`

---

## Open questions

- [ ] RB-1's new grading dimension may argue for revisiting the Final Arbiter's 0.5/0.3/0.2 lane weighting (REVIEWER_LANE_SCHEMA) once it exists — Mike-gated, not blocking RB-1 itself.
- [ ] ES-4's doc-stamp fix and engine.44's sheet-cell fix are the same convention applied to two different surfaces (docs vs cells) — confirm no third surface (e.g. Drive-uploaded PDFs) still carries a stamp once both land.

---

## Changelog

- 2026-07-05 (S295, research-build) — Initial triage. 13 themes, 6 new phases, 6 folds, 1 citation-only. ROLLOUT row governance.46 filed.
