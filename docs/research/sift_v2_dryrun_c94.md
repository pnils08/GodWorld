---
title: /sift v2 Dry-Run on C94 Inputs — Regression Report
created: 2026-05-23
updated: 2026-05-23
type: reference
tags: [media, pipeline, sift, research, active]
sources:
  - "[[../plans/2026-05-22-sift-v2]] §Task 7"
  - "[[../../.claude/skills/sift/SKILL.md]] v2.0 (commit 0d2879f)"
  - "output/sift_proposals_c94.json (S221 locked slate)"
  - "output/production_log_edition_c94_sift_gaps.md (G-S1..G-S21)"
pointers:
  - "[[../plans/2026-05-22-sift-v2]] — parent plan"
  - "[[../media/brief_template_v2]] / [[../media/dispatch_schema]] / [[../media/sift_triage_vocabulary]] — v2 contracts walked"
  - "[[index]] — registered same commit"
---

# /sift v2 Dry-Run on C94 Inputs — Regression Report

**Created:** 2026-05-23 (S228, research-build)
**Plan task:** [[../plans/2026-05-22-sift-v2]] §Task 7
**SKILL.md version walked:** v2.0 (shipped commit `0d2879f`)
**Inputs walked against:** C94 sheet primary + S221 hand-run derived artifacts (`output/sift_proposals_c94.json` + `output/world_summary_c94.md` + `output/production_log_edition_c94_sift_gaps.md`)

**Purpose.** Walk v2.0's eleven steps against the C94 inputs that produced the broken C94 sift (S220-S222). Confirm v2 would have caught the four named failures from plan §Task 7 verify list. List remaining failure modes v2 does NOT close — those file as follow-up.

**Bottom line.** All four named C94 failures are STRUCTURALLY blocked by v2.0. Three additional C94 failures were closed end-to-end (G-S5 cadence loop, G-S13 triage vocab, G-S21 template shape). Six C94 failures remain partially or fully OUT of v2 scope — five route to other ROLLOUT rows (pipeline.25 engine, canon.3 cross-layer, civic.12 city-hall, pipeline.28 detector calibration, pipeline.29 PDF). One (G-S4 NEWSROOM_MEMORY ranged-read prescription) is documented in v2 but not mechanically enforced — relies on operator discipline.

---

## Four named C94 failures — v2 coverage

### Failure 1 — Paulson framing fabrication (G-S6, HIGH)

**What happened C94 (v1.2 hand-run):**
- `world_summary_c94.md` line 62 fabricated a "Paulson leaning toward not returning for a second Oaks year" framing.
- `Oakland_Sports_Feed` row 147 actual canon: Varek courts Paulson at tech-expo panel — `"I will absolutely be making that phone call."` Opposite story shape.
- S221 hand-run partially substituted sheet primary mid-execution; would have shipped Paulson-not-returning framing if not caught.

**v2.0 coverage:** **STRUCTURALLY BLOCKED at Step 1.**

- Step 1 §Sheet-primary read: `lib/sheets.getSheetData('Oakland_Sports_Feed')` returns row 147 directly. Canon content source is the sheet, not world_summary.
- Step 1 §Probe log: "If you find yourself quoting world_summary narrative into a candidate proposal, STOP — cross-check the claim against sheet primary first."
- Step 1 fail-loud rule: "Fail loud if sheet primary unavailable" — if Oakland_Sports_Feed read fails, /sift aborts rather than substituting world_summary narrative.
- v2 inputs section explicitly marks world_summary as ORIENTATION ONLY — "If a thread's content comes from world_summary narrative section, cross-check against sheet primary BEFORE proposing. Fail loud on world_summary-only thread proposals."

**Verdict:** v2 closes this failure mode at the input layer. The Paulson fabrication cannot propagate into a v2 candidate proposal — sheet primary IS the source.

**Residual risk:** if Oakland_Sports_Feed itself drifts (rows added by something other than Mike's typed canon), Step 1 would propagate the drift. Out of v2 scope; sheet data integrity is engine-sheet substrate concern.

---

### Failure 2 — Civis Systems naming as anchor (G-S2, HIGH)

**What happened C94 (v1.2 hand-run):**
- Civis Systems Field — The Town (A's new stadium naming) was load-bearing cycle canon — should anchor FP1.
- v1.2 thread extraction template had only WORLD / SPORTS / CIVIC buckets — no place for ownership-ecosystem cross-source thread that spans Business (Civis Systems) + Sports (A's stadium naming) + Civic (Varek-Paulson recruitment + Baylight construction).
- S221 narrowly recovered by hand-routing FP1 to Jordan Velez (business desk) with multi-domain signal.

**v2.0 coverage:** **STRUCTURALLY ADDRESSED at Steps 2-3.**

- Step 2 §Canon archive: `search_canon("Civis Systems")` + `search_canon("Civis Systems Field")` + `search_canon("Varek")` surface multi-cycle arc (BIZ-00052 Civis Systems canon since S192; Varek Civis founder + Oaks ownership lead; tech-expo panel C94).
- Step 2 §NEWSROOM_MEMORY ranged-read: E93 entry surfaces Civis Systems naming as anchored thread; line range read makes the arc visible.
- Step 3 §Candidate generation buckets: WORLD bucket captures "Civis Systems names A's stadium" as cross-source thread (sheet + canon archive + city-hall log all converge). Cross-source connection annotation marks it: `"crossSourceConnections": [{"toId": "C1-or-civic-baylight", "relation": "echo"}]`.
- Step 3 narrative-weight test: introducesCanon=TRUE (stadium naming is NEW canon), closesOrEscalatesArc=TRUE (E93 ownership-ecosystem arc continues), engineVsActionPuzzle=FALSE, newVoice=FALSE — passes test cleanly.
- Step 4 enrichment: `lookup_business("Civis Systems")` confirms BIZ-00052; `lookup_citizen("Elias Varek")` confirms POP-00789; INIT-006 Baylight phase pulled.
- Step 6 cap enforcement: no civic-default-spine pressure pushes this down — civic ≤ 3 cap leaves room for FP1 ownership-ecosystem feature explicitly.

**Verdict:** v2 closes this failure mode through canon-archive priming + cross-source bucket structure. The Civis Systems thread would surface as a load-bearing FP1 candidate at Step 3, not hand-routed in recovery at S221.

**Residual risk:** if `search_canon` returns empty (canon archive ingest gap), Step 3 might miss the arc continuity. Mitigation: NEWSROOM_MEMORY E93 entry catches it; ranged-read prescription at Step 2 documented. Defense in depth holds.

---

### Failure 3 — Beverly Hayes POPID drift (G-S15, HIGH)

**What happened C94 (v1.2 hand-run):**
- Production log fabricated POP-00412 "home health aide" Beverly Hayes (C90-era brief).
- Actual canon: POP-00772 Beverly Hayes, WOCC Community Director (E94 NAMES INDEX alignment).
- S221 surfaced via S223 wd-card audit; not caught at sift time.

**v2.0 coverage:** **STRUCTURALLY BLOCKED at Step 4.**

- Step 4 §Enrichment: `lookup_citizen("Beverly Hayes")` MUST execute for every named entity. Returns the canonical POP-00772 record.
- Step 4 validation rule: "Every named citizen has POPID confirmed (no fabricated names)." A proposal carrying POP-00412 wouldn't pass — lookup_citizen would return either no match (unverifiable) or the canonical POP-00772 record (proposal corrected before locking).
- Step 11 verification checklist: "All citizens verified via MCP (POPID confirmed for every name)" — sift can't complete with unverified POPIDs.

**Verdict:** v2 closes this failure mode at the enrichment layer. The fabricated POP-00412 can't survive Step 4 lookup.

**Residual risk:** wd-citizens layer drift (canon.3 ROLLOUT row) — if `lookup_citizen` returned the wrong canonical (e.g., world-data card collisions, S223 cleanup state pre-fix), Step 4 would accept the wrong canonical as truth. Closed S223 wd-card dedup (one-doc-per-POPID invariant); ongoing canon.3 cross-layer drift work is upstream scope.

---

### Failure 4 — Letters rest-cycle conflict (G-W39, HIGH)

**What happened C94 (v1.2 hand-run):**
- /sift wrote letters brief naming Hutchins (POP-00727, returning E92/E93) + Iglesias (returning E93) as priority C94 candidates.
- Letters-desk LENS rest-cycle rule blocked both — Hutchins REST through C95 (returns earliest C96), Iglesias REST through C95.
- Letters-desk overrode sift and substituted 3 NEW canon citizens (Keisha Morris West Oakland, Miguel Santos Fruitvale, David Okonkwo Lake Merritt). Brief-led-mode defense in depth saved it.

**v2.0 coverage:** **STRUCTURALLY BLOCKED at Step 10.**

- Step 2 preload: `.claude/agent-memory/letters-desk/MEMORY.md §Rest Cycle Tracking` is loaded at canon-archive step. State of rest-cycle tracker is in operator context BEFORE candidate emission.
- Step 10 §Letters-candidates emission §Rest-cycle filter: "before emit, exclude any citizen with `REST through E{XX-1}` or later in the letters-desk MEMORY tracker. Pre-emission filter."
- Step 10 §Pool shape: "Rest-cycle status" line emits the excluded POPIDs explicitly — visible in the candidate pool brief.
- Pool emission shape per `brief_template_v2` §Letters-desk variant: candidates passed to letters-desk LENS are REST-passed only. LENS still backstops as defense in depth, but sift no longer wastes a brief slot on known-blocked citizens.

**Verdict:** v2 closes this failure mode at the candidate-emission layer. Hutchins + Iglesias cannot enter the C94 pool — pre-emission filter excludes them before letters-desk sees the pool.

**Residual risk:** rest-cycle tracker drift (letters-desk MEMORY file not updated after a cycle) — v2 trusts the tracker. If tracker is stale, blocked citizens could slip through. Mitigation: letters-desk LENS rest-cycle rule remains active as backup; brief-led-mode self-defense pattern (S215 G-W41) preserved as last-line backstop.

---

## Additional C94 failures v2 closes end-to-end

These weren't in the plan's four-named verify list but are closed by the same v2 changes:

| Gap | What v2 closes | Where |
|-----|---------------|-------|
| G-S5 (cadence loop) | ONE slate variant per session + proposalState 2-state + civic ≤ 3 cap + section ordering | Step 6 |
| G-S13 (triage vocab) | Six-decision vocabulary with required fields | Step 5 + sift_triage_vocabulary spec |
| G-S21 (template shape) | brief_template_v2 SIGNAL + VOICE DIRECTION + CANON POINTERS — no prose body | Step 7 + brief_template_v2 spec |
| G-S8 (input pipeline silo) | Step 2 mandatory canon-archive + NEWSROOM_MEMORY load + sheet primary | Steps 1-2 |
| G-S11 (Step 0 staleness gate) | Omitted entirely | Step 0 RETIRED |
| G-S14 (role=reporter byline filter) | Step 3 validation rule | Step 3 + engine.21a cross-link |
| G-W30 (dispatch.json not emitted) | Step 8 mandatory emission per dispatch_schema | Step 8 |
| G-W31 (multi-article packed brief) | Per-slot naming `c{XX}_{SLOT}_brief.md` | Step 7 + brief_template_v2 §filename |
| G-W32 (Memory Fence bypass) | Step 9 verification + Step 7 wrap discipline | Step 9 |
| G-W33 (letters sequencing — sift half) | Candidate pool + /write-edition Step 3.5b cross-skill handoff | Step 10 |
| G-W35 (employer biz omission — sift half) | Step 4 `lookup_business()` mandatory for employer biz | Step 4 |
| G-PR2 (untitled-title break djDirect) | Real-headline emission required, no placeholders | Step 3 + Step 8 |
| G-PR6 (FRONT_PAGE vs FRONT PAGE — cross-link) | Section enum underscored routing form | Step 3 + brief_template_v2 + dispatch_schema |

---

## Failure modes v2 does NOT close

These C94 gaps are partially or fully OUT of v2 scope. Most route to other ROLLOUT rows.

### 1. G-S4 — NEWSROOM_MEMORY ranged-read drift

**State:** PRESCRIPTION DOCUMENTED, MECHANICAL ENFORCEMENT MISSING.

v2 Step 2 documents the ranged-read prescription (S215) — line ranges + grep patterns for finding E{XX-1} entries, Standing Directives, topic-specific lookups. But there is no mechanical gate that the operator actually ran the ranged read; Step 2 verification artifact (`sift_canon_archive_log_c{XX}.json`) records WHICH sections were read by line range, but only as self-report.

**Mitigation in v2:** Step 11 verification checklist requires `newsroomMemorySections[]` to be non-empty in the log. If the operator skips the read, the log records `[]`, verification fails. Defense in depth but not as strong as a mechanical gate.

**Route:** stays inside pipeline.24 — Task 8 live-run on C95 surfaces whether the verification artifact is sufficient or whether a mechanical hook is needed.

### 2. G-S6 / G-S7 / G-S17 — world_summary writer fabrication

**State:** SIFT-SIDE MITIGATED, ENGINE-SIDE OPEN.

v2 inverts the input hierarchy (sheet primary, world_summary orientation-only), so world_summary fabrications can't propagate into v2 candidate proposals. But the world_summary writer itself still fabricates content (Paulson-not-returning, Padres/Baltimore inversion, Rosada misspelling, Kelley stat inflation).

**Route:** **pipeline.25** ROLLOUT row — `/build-world-summary` fidelity audit + drop "verbatim" header claim. Engine-sheet scope.

### 3. G-S15 / G-S16 / G-S18 / G-S19 / G-S20 / G-W35 (cross-layer drift) — canon.3 cluster

**State:** SIFT STEP-4 MITIGATED, CROSS-LAYER OPEN.

v2 Step 4 enrichment via `lookup_citizen` / `lookup_business` / `lookup_initiative` catches most fabrications at sift time. But bay-tribune ↔ wd-citizens ↔ Sim_Ledger cross-layer drift means MCP lookups can return different canonicals depending on which layer is queried. Beverly Hayes POPID drift was caught S223 wd-card cleanup; Carmen Solis / Roberto Iglesias / Rev. Han have published-canon presence with no wd-card so lookup_citizen returns "NEW" treatment incorrectly.

**Route:** **canon.3** ROLLOUT row — cross-layer citizen + business canon drift remediation. Engine-sheet / research-build scope.

### 4. G-PREP1-8 / G-R1-5 — city-hall ↔ voice-agent reconciliation

**State:** OUT OF SIFT SCOPE.

City-hall sources voice-agent statements that sift consumes as input (`output/production_log_city_hall_c{XX}.md`). v2 trusts city-hall's output as one input slice. Schema mismatches, project-agent pre-writing artifacts, Clerk terminated mid-run no-output — all upstream of sift.

**Route:** **civic.12** ROLLOUT row — city-hall skill-vs-reality reconciliation pass. Research-build / engine-sheet scope.

### 5. G-W46-53 — capability + validateEdition detector calibration

**State:** OUT OF SIFT SCOPE.

Capability detectors operate on the compiled edition, not on sift output. Footer scope false positives, gender resolve via Sim_Ledger col AU, position/letter pattern widening, collision warning dedup — all write-edition / reviewer-lane scope.

**Route:** **pipeline.28** ROLLOUT row — detector calibration sweep. Engine-sheet scope.

### 6. G-PR3-PR11 — PDF generator + DJ photo skill

**State:** OUT OF SIFT SCOPE.

PDF generator parser bugs, FLUX text-suppression ceiling, Haiku QA tone-blind, lede-used-as-headline. /sift v2 emits real headlines (closes G-PR2), but downstream PDF / photo pipeline operates on compiled edition.

**Route:** **pipeline.29** ROLLOUT row — DJ photo skill + FLUX workarounds + PDF parser fixes + Drive supersede. Research-build / engine-sheet scope.

### 7. G-W37 — reporter-range quote invention

**State:** NOT IN SIFT SCOPE.

Reporter agents inventing quotes for non-scene citizens. Reviewer-lane (Rhea + Mara) catches at compile review; sift can't enforce this because briefs name canon pointers, not quote constraints. /write-edition skill + reporter SKILL.md updates.

**Route:** closed S227 pipeline.26 residual — G-W37 closed via /write-edition Step skill text (in-scene quotes allowed, off-scene paraphrase only).

### 8. G-W56 — Mara audit catches vote-math drift

**State:** POSITIVE FINDING, PRESERVED.

Mara reviewer lane caught C1 vote-math drift (Carmen reported 8-0+1-absent without naming the 9 individual votes/absentee). Mara's value validated. v2 doesn't close this at sift — it doesn't need to; Mara already catches at compile review.

**Route:** N/A — positive finding documented.

---

## Open question — v2 catches it, but does it catch IN TIME?

For four of the cleanly-closed failures, v2 catches the issue at a specific step. The question is whether catching at that step is early enough — i.e., does the catch save operator effort, or does it merely flag a problem already shipped?

| Failure | v2 catch step | Catches before damage? |
|---------|--------------|------------------------|
| Paulson framing | Step 1 input | YES — wrong content never enters candidate set |
| Civis Systems anchor | Step 3 candidate gen | YES — surfaces in proposal table before Mike approval |
| Beverly Hayes POPID | Step 4 enrichment | YES — fabricated POPID can't pass enrichment |
| Letters rest-cycle | Step 10 emission | YES — blocked citizens filtered before letters-desk launch |

All four are pre-publish catches. v2 saves operator effort across the board for these classes.

---

## What Task 8 live-run should validate

Per plan §Task 8 (C95 live-run): "Compare against C94 gap counts: target <5 HIGH (C94 had 14 HIGH + 4 MED + 3 LOW)."

Dry-run assessment: v2 structurally blocks 8 of C94's HIGH gaps (G-S1, G-S2, G-S5, G-S8, G-S11, G-S14, G-S15, G-S21, G-W39). Six HIGH C94 gaps route to other ROLLOUT rows and won't show up in /sift gap log even pre-v2 in scope: G-S6/S7 (engine), G-W35 (canon.3), G-PREP-class (civic.12), G-PR6 (PDF pipeline.29). That leaves at most 1-2 HIGH gaps possible within C95 sift scope IF v2 introduces no new failure modes.

Realistic C95 target: ≤2 HIGH (vs C94's 14). Plan §Task 8 target of <5 is achievable. If C95 surfaces >2 HIGH within /sift v2 scope, v2 missed something; file as v2-revision item.

---

## Remaining failure modes to monitor at live-run (Task 8)

Items not closed structurally but documented as discipline:

1. **NEWSROOM_MEMORY ranged-read drift (G-S4)** — operator may skip the ranged read; Step 11 verification artifact catches retrospectively. Mechanical gate would be stronger; defer until C95 surfaces actual drift.
2. **dispatch.json schema validator not built** — v2 SKILL.md documents Contract B fail-loud requirements but no `validateDispatch.js` script exists yet. /write-edition Step 1 carries inline validation responsibility at v2 cutover.
3. **Step 7 Memory Fence wrap discipline at write-time** — wrap is the author's responsibility per Step 9 reframe; if the brief author skips wrap, Step 9 grep warns but doesn't hard-abort (excerpts may be POPID-only). Live-run validates whether warnings are acceptable signal or whether stronger enforcement is needed.
4. **Engine A T4.1 priority data availability** — Step 6 reads `Story_Seed_Deck` cols M-R; if Engine A doesn't populate for C95 (warm-up, parser-miss), proposals render with `[engine: silent]` and lose floor-tag discipline. Validate at Task 8 whether engine-silent rate is acceptable or whether v2 needs T4.1 fallback ranking.

---

## Verification artifact for Task 7

- [x] All four named failures from plan §Task 7 verify list walked.
- [x] All four named failures confirmed structurally blocked at named v2 step.
- [x] Cross-walk against C94 gap log surfaces 13 additional gaps closed end-to-end.
- [x] Six failure-mode classes documented as OUT of v2 scope, each routed to its ROLLOUT row.
- [x] Realistic Task 8 target derived (≤2 HIGH within /sift v2 scope, achievable per plan §Task 8 <5 target).

**Task 7 status:** v2.0 dry-run regression PASS. Pipeline.24 ready for Task 8 live-run on C95.

---

## Changelog

- 2026-05-23 (S228, research-build) — Initial dry-run. Walks v2.0 SKILL.md (commit `0d2879f`) against four named C94 failures + 13 additional C94 gap-log entries + 6 OUT-of-scope failure classes. All four named failures structurally blocked at specific v2 steps. Realistic C95 target ≤2 HIGH within sift scope. Pipeline.24 Task 7 complete; Task 8 awaits C95 inputs.
