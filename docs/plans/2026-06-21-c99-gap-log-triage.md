---
title: C99 Gap-Log Triage & Remediation Plan
created: 2026-06-21
updated: 2026-06-21
type: plan
tags: [governance, architecture, active]
sources:
  - output/production_log_run_cycle_c99_gaps.md (run-cycle: G-EC + G-PREP + G-R + G-S + G-W legs)
  - output/production_log_c99_print_gaps.md (print: G-PR-C99-*)
  - output/production_log_c99_post_publish_gaps.md (post-publish: G-P-C99-*)
  - docs/plans/GAP_LOG_TRIAGE_PLAYBOOK.md (the 8-step method this executes)
  - docs/plans/2026-06-20-c98-gap-log-triage.md (governance.41 — prior cycle, structural template)
pointers:
  - "[[engine/ROLLOUT_PLAN]] — parent rollout (governance.42 single pointer row)"
  - "[[GAP_LOG_TRIAGE_PLAYBOOK]] — method"
  - "[[2026-06-01-initiative-tracker-contract]] — civic.14, where the trackerUpdates cluster folds"
  - "[[SCHEMA]] — doc conventions"
  - "[[index]] — registered same commit"
---

# C99 Gap-Log Triage & Remediation Plan

**Goal:** Convert the C99 production gap logs (~40 gaps across run-cycle / print / post-publish) into one phased, two-track remediation plan that research-build and engine-sheet execute, with every gap routed, folded, watched, or scoped-out — nothing left on the shelf to compound.

**Architecture:** Per [[GAP_LOG_TRIAGE_PLAYBOOK]]: read all three logs in one head, cluster by root cause (not by source skill), route each theme to the terminal whose expertise owns the fix (research-build = skill/agent/doc/canon text; engine-sheet = engine code/scripts/parsers/validators), fold correlated open ROLLOUT rows forward (point, don't restate), and file ONE `governance.42` pointer row. **The marquee finding is a HIGH canon-fidelity cluster (T1):** sift barred a *real* Tribune reporter as a "phantom," a desk reporter ran a fabricated quote through an explicit VERIFY gate, and letters-desk invented a citizen and self-certified it "ledger-backed." All three are the same failure mode — an unverified claim surviving to compile — and all three extend the C98 RB-1 provenance fence rather than introducing a new mechanism. **The recurring civic cluster (T2 = G-R1/R4/R5 + R2/R3) is the SAME class as C98's T1 that folded to civic.14 Phases 2–3** — that fix has not shipped, so these are recurrence, not new themes: fold them forward as additional acceptance cases, don't re-theme.

**Out of scope of this triage:** the **Tier-1 dial-essence backfill** (Mike directive S265 — 13 of 21 Tier-1s read neutral "Drifter" because their authored canon was never logged as LifeHistory) is NOT a C99 gap; it is its own research-build design row (canon-rich-subset scope), handled separately this session. Noted here only so a future reader doesn't fold it in.

**Terminal:** research-build (triage author + RB track) / engine-sheet (ES track)

**Pointers:**
- Prior cycle: [[2026-06-20-c98-gap-log-triage]] (governance.41)
- Folds into: [[2026-06-01-initiative-tracker-contract]] (civic.14 Phases 2–3), [[engine/ENGINE_REPAIR]] / engine.8 / engine.29 / pipeline.13

**Acceptance criteria:**
1. Every C99 gap appears exactly once in this plan — in a phase, a fold, the watch bucket, or out-of-scope. No orphans.
2. Each phase names exact files, concrete steps, a verify command, and `Source gaps:` / `Absorbs ROLLOUT:` lines.
3. One `governance.42` row in ROLLOUT pointing here; plan registered in `docs/index.md` same commit.

---

## Cluster Map

| Theme | Severity | Constituent gaps | Track | Folds / ties |
|-------|----------|------------------|-------|--------------|
| T1 — Sift/edition canon-fidelity: phantom-reporter bar + VERIFY-gate fabrication + invented-citizen self-cert | **HIGH** | G-W1, G-W2, G-W3 | **RB (RB-1)** | extends C98 RB-1 provenance fence; reporter-roster verification |
| T2 — Voice-agent trackerUpdates conformance (RECURRENCE of C98 T1) | HIGH/MED | G-R1, G-R2, G-R3, G-R4, G-R5 | **fold → civic.14** | civic.14 Phase 2 (validator + live-tracker phase read) + Phase 3 (agent RULES: array shape + initiative key + trackerOwner + phase-discipline) |
| T3 — Parser/validator brittleness | MED | G-W4, G-W5, G-W7, G-W9, G-W10, G-W11 | ES (ES-1) + RB (RB-3 sift/template half) | engine.8 lib class |
| T4 — Card-vs-ledger display-name drift (RECURRENCE C98 G-W8) | MED | G-W8 | ES (ES-2) | buildCitizenCards ↔ Simulation_Ledger Name reconcile |
| T5 — Civic source emits real-calendar dates | MED | G-W6 | ES (ES-3) + civic | civic-office-baylight gate-form |
| T6 — photoQA over-filters sports/stadium frames | **HIGH** | G-PR-C99-1 | RB (RB-2 DJ) + ES (ES-4 rubric) | C98 RB-3/ES-5 DJ-photo lineage / pipeline.13 |
| T7 — PDF render section-key drift | MED | G-PR-C99-2 | ES (ES-5) | generate-edition-pdf.js |
| T8 — Sift pipeline fragility + canon screens | LOW/MED | G-S1, G-S3, G-S4, G-S5, G-S6 | RB (RB-4 sift) + ES (G-S4 script half) | candidate-integrity discipline |
| T9 — Canon rule-file error (Davis POPID) | MED | G-S2 | RB (RB-5) | quick fix |
| T10 — Post-publish gate text + stale artifact | MED/LOW | G-P-C99-1, G-P-C99-2 | RB (RB-6) + ES (failures-file half) | pipeline.37 |
| T11 — Operator discipline: out-of-band tool mid-skill | **HIGH** | G-W12 | RB (RB-7 / self) | run documented lanes only |

**Engine header-drift (G-EC2–G-EC26):** fold → engine.8 sweep — identical recurring baseline to C97/C98 (orphan literals + acceptable-noise defensive fallbacks; G-EC11 PopID case-mismatch; G-EC24 hidden `Game_Intake` tab). **Exception:** G-EC3 (`StatusStartCycle`) + G-EC4 (`HealthCause`) are the **engine.29 ride-along columns** referenced-but-not-yet-added to Simulation_Ledger → engine.29 Phase-A deploy-pending signal (carried from C98), route there not engine.8. **engine.38 confirmed it added zero new header-drift (G-EC36)** — all 25 entries are the standing baseline, none in engine.38's touched files.

---

## Research-Build Track

### RB-1: Sift/edition canon-fidelity — verify "phantom"/"barred" flags + VERIFY-gate hard-stop + non-pool cert ban

- **Files:**
  - `.claude/skills/sift/SKILL.md` — modify (phantom/barred-reporter verification + reporter-roster routing)
  - `.claude/agents/REPORTER_DESK_INDEX.md` — read (the byline↔desk roster sift must check against)
  - desk-agent RULES (the writer agents) — modify (VERIFY-before-quoting = hard gate)
  - `.claude/agents/letters-desk/RULES.md` + `IDENTITY.md` — modify (no self-certification of ledger-backing; verified-pool-only)
- **Source gaps:** G-W1 (sift labeled real Tribune reporter **Elliot Graye POP-00012** — "Journalist, Ethics & Faith Journalist," written into culture-desk IDENTITY/RULES — a "phantom, must never appear," reassigned his own faith-convergence beat to Maria Keen; operator compounded across two turns by parroting "phantom" without reading POP-00012), G-W2 (Jordan Velez ran synthesized quote *"These should have been on the record two cycles ago"* attributed to Keisha Ramos despite the B1 brief's explicit *"VERIFY before quoting"* gate; actual filed line was *"The process is clean — and now it's documented."*), G-W3 (letters-desk added **David Kim, Lake Merritt** — not in the locked pool — and returned *"All ledger-backed, first-time voices"*; `verify "David Kim"` = 0 matches; a brief-led agent has no sheet access and structurally cannot certify ledger-backing).
- **Steps:**
  1. Sift rule: any "phantom reporter" / "barred byline" / "must never appear" flag must be checked against `lookup_citizen` + `REPORTER_DESK_INDEX` (the reporter roster) BEFORE it enters a brief. A name tagged `media-reporter` on the ledger is a REAL reporter — route the story to them as a candidate writer, never bar them. Bars apply to real-world-leak names, not to canon reporters.
  2. Desk-agent RULES: a brief line `VERIFY before quoting` is a HARD gate — a synthesized quote surviving to compile is the highest-severity fabrication class. Pull the actual statement from the civic packet / production log; if it can't be verified, paraphrase the action, do not quote.
  3. Letters-desk: scope to the locked verified pool only; a brief-led agent must NOT emit a "ledger-backed" certification it cannot substantiate (no sheet access). Any non-pool writer requires an editor-side `verify` before NAMES INDEX promotion.
- **Verify:** `grep -n "phantom\|barred\|media-reporter\|VERIFY before quoting\|ledger-backed" .claude/skills/sift/SKILL.md .claude/agents/letters-desk/RULES.md` → fence + cert-ban present.
- **Absorbs ROLLOUT:** extends C98 governance.41 RB-1 provenance fence (note forward, don't restate).
- **Status:** [ ] OPEN

### RB-2: DJ photo-direction — sports/stadium frame guidance (pairs ES-4 rubric)

- **Files:**
  - `.claude/agents/dj-hartley/RULES.md` — modify (stadium-frame spec guidance)
- **Source gaps:** G-PR-C99-1 RB-half (both ballpark frames — `dynasty_seven_dugout_steps` FRONT-PAGE hero + `davis_return_left_field` SPORTS — FAILed 3/3 regen on legible jersey numbers + stadium signage; FRONT PAGE + SPORTS ran imageless. Mike directional call: "we are filtering too hard on the sports stuff — none make it through — proceed.").
- **Steps:**
  1. DJ spec guidance: stadium frames are high-risk for the QA rubric. Prefer dugout / equipment / crowd-from-behind / field-action at middle distance; but acknowledge a real ballpark photo inherently carries jersey numbers + outfield-fence signage — the rubric (ES-4) is being retuned to FLAG-not-FAIL those, so DJ should still spec the high-value sports frame rather than self-censor it to zero.
  2. Coordinate with ES-4: the fix is primarily rubric-side (distinguish brand text from stadium-typical numerals); DJ guidance is the secondary half.
- **Verify:** `grep -n "stadium\|jersey\|ballpark" .claude/agents/dj-hartley/RULES.md` → guidance present.
- **Absorbs ROLLOUT:** continues C98 RB-3 DJ-photo lineage + pipeline.13 (note forward).
- **Status:** [ ] OPEN

### RB-3: Parser/validator brittleness — sift/template half (CU→N slot, QT separator)

- **Files:**
  - `.claude/skills/sift/SKILL.md` — modify (emit canonical N-series culture slot)
  - `.claude/skills/write-edition/SKILL.md` — modify (QT sub-template `---` requirement)
- **Source gaps:** G-W10 (dispatch assigned culture slot **"CU1"** — not in the canonical Slot regex; culture = **N-series**; compile remapped CU1→N1, but sift should emit N{n} at source), G-W11 (first QT compile omitted the `---` after-byline separator → parser undercounted 2 bylines vs 3 rows → fail-loud; the Step-1 QT sub-template doesn't state `---` is required).
- **Steps:**
  1. Sift/dispatch: emit culture slots as `N{n}` (parser-canonical), never `CU{n}`.
  2. write-edition QT sub-template: state the `### head / By … / --- / body` block REQUIRES the `---` separator after the byline.
- **Verify:** `grep -n "N-series\|N{n}\|CU" .claude/skills/sift/SKILL.md` + `grep -n "\-\-\-" .claude/skills/write-edition/SKILL.md` → both present.
- **Absorbs ROLLOUT:** none (skill-text hardening).
- **Status:** [ ] OPEN

### RB-4: Sift pipeline fragility + canon screens

- **Files:**
  - `.claude/skills/sift/SKILL.md` — modify (seed column index + 2041 age-anchor in scout-dispatch + retired-anchor + name-collision verify)
- **Source gaps:** G-S1 (Story_Seed_Deck cycle value lives in col **1** header "Cycle", not col 0; col-0 filter returned 0 despite 48 real rows — name the index in Step 6), G-S3 (two research scouts computed citizen ages off **2026** not the **2041 roster anchor** — Varek "23/31" vs correct 38, Ramos "29" vs correct 44; scout-dispatch prompts must state the 2041-anchor rule), G-S5 (Marcus Osei name-collision: MTC senior planner vs canonical Deputy Mayor Marcus Osei — flag verify-at-source, keep generic until confirmed), G-S6 (city-hall handoff anchored **Beverly Hayes POP-00772** — a RETIRED coverage anchor S229; screen civic-named citizens against the retired-anchor list before handoff).
- **Steps:**
  1. Sift Step 6: name the Story_Seed_Deck cycle column index (col 1, header row at 0) so the next run doesn't re-probe.
  2. Scout-dispatch prompt: state the 2041-roster age anchor explicitly (age = 2041 − BirthYear), so scouts don't default to 2026.
  3. Add retired-anchor screen + name-collision verify-at-source to the sift canon pass (Beverly Hayes class + Osei class).
- **Verify:** `grep -n "col 1\|2041\|retired-anchor\|Beverly" .claude/skills/sift/SKILL.md` → screens present.
- **Absorbs ROLLOUT:** none.
- **Status:** [ ] OPEN

### RB-5: Canon rule-file fix — Davis POPID in newsroom.md Five Goods table

- **Files:**
  - `.claude/rules/newsroom.md` — modify (correct POPID)
- **Source gaps:** G-S2 (newsroom.md Five Goods table lists **Darrin Davis as POP-00005** — that is **Mags Corliss**; Davis is **POP-00021**, verified via lookup_citizen). Flagged from media terminal as a rule-file fix to do from research-build, not media.
- **Steps:**
  1. Correct the Five Goods table: Darrin Davis → POP-00021. Confirm no other row in the table mis-attributes POP-00005.
- **Verify:** `grep -n "Davis\|POP-00005\|POP-00021" .claude/rules/newsroom.md` → Davis = POP-00021; POP-00005 = Mags only.
- **Absorbs ROLLOUT:** none.
- **Status:** [ ] OPEN

### RB-6: Post-publish gate text — base_context.json path + Step 2a time budget

- **Files:**
  - `.claude/skills/post-publish/SKILL.md` — modify (Step 5b path + Step 2a budget)
- **Source gaps:** G-P-C99-1 (Step 5b gate reads "`cycle` field matches `<XX>`"; a naive `jq '.cycle'` returns null — the field is nested at `.baseContext.cycle`; caused a false alarm), G-P-C99-2a (Step 2a Time Budget lists "~10 min"; actual C99 was ~36 min due to `buildCitizenCards.js` batch-pause cadence — 60s every 200 writes; bump estimate + note the cadence).
- **Steps:**
  1. Step 5b gate text: specify the path — check `jq '.baseContext.cycle'`, not `jq '.cycle'`.
  2. Step 2a Time Budget: bump to ~30–40 min and note the batch-pause cadence.
- **Verify:** `grep -n "baseContext.cycle\|30-40 min\|batch-pause" .claude/skills/post-publish/SKILL.md` → both present.
- **Absorbs ROLLOUT:** pipeline.37 (note forward).
- **Status:** [ ] OPEN

### RB-7: Operator discipline — run documented lanes only inside a skill

- **Files:**
  - `.claude/skills/write-edition/SKILL.md` — modify (Step 4 boundary note: no out-of-band reviewer)
- **Source gaps:** G-W12 (operator called the non-skill `advisor` tool at the Step-4 boundary and narrated its reasoning into chat — burning Mike's tokens — instead of running the documented lanes Rhea → cycle-review → Mara → capability → Final Arbiter and filing gaps as they surfaced; then freelanced slate decisions. Mike, explicit: "if you aren't running the skill and reporting the gaps this is a complete waste."). **This is operator/self-discipline, not a code defect** — the durable fix is a skill-text guardrail + the discipline itself.
- **Steps:**
  1. write-edition Step 4: add an explicit note — inside a skill run, run ONLY the documented review lanes; capture issues in the gap log as they surface; do not substitute an out-of-band reviewer (`advisor`) or narrate decisions back to the user. (The `advisor` tool is for pre-substantive-work checkpoints in open sessions, not mid-skill.)
- **Verify:** `grep -n "documented lanes\|out-of-band\|advisor" .claude/skills/write-edition/SKILL.md` → guardrail present.
- **Absorbs ROLLOUT:** none.
- **Status:** [ ] OPEN

---

## Engine-Sheet Track

### ES-1: Parser/validator brittleness — faith-org name check, metric-leak blocklist, idiom months, format-contract no-op

- **Files:**
  - `scripts/validateEdition.js` — modify (faith-org institution-name coverage + metric-leak + idiom-month distinction)
  - `scripts/emitFormatContractSections.js` — modify (all-citizen NEW CANON = valid no-op)
- **Source gaps:** G-W4 (CU1 wrote **"Cathedral of the Living World"** ×2; canon is **"Living Word"** — Bishop Vermeer POP-00755; validateEdition's live-name check doesn't cover faith-org institution names), G-W5 (engine-language leak *"The engine's sentiment tracker flagged it: +0.63"* — system noun + raw decimal; add "engine" + "sentiment tracker" to the metric-leak blocklist), G-W7 (FP1/S1 calendar months as baseball idiom — "October-ready composure in July" — validateEdition WARNING; distinguish baseball-idiom months from literal dates), G-W9 (emitFormatContractSections Contract B hard-fails on a `(NEW CANON THIS CYCLE)` subsection of only POP-pending citizens — "0 biz / 0 faith / 0 unclassified → refusing to emit"; treat all-citizen/empty NEW CANON as a valid no-op, not a parse failure — G-W43 class).
- **Steps:**
  1. validateEdition: extend the live-name check to faith-org institution names (canon faith-org registry); add "engine"/"sentiment tracker" to metric-leak blocklist; whitelist baseball-idiom month tokens in sports/idiom context.
  2. emitFormatContractSections: treat an all-citizen / zero-biz-zero-faith NEW CANON subsection as a valid no-op.
- **Verify:** fixture edition with a faith-org name typo + engine-language line + idiom month + all-citizen NEW CANON → validator/emitter pass with correct flags, no false hard-fail.
- **Absorbs ROLLOUT:** engine.8 (parser-alignment class) — note forward.
- **Status:** [ ] OPEN

### ES-2: Card-vs-ledger display-name drift (recurrence C98 G-W8)

- **Files:**
  - `scripts/buildCitizenCards.js` — read/modify (display-name source)
  - Simulation_Ledger `Name` column — reconcile
- **Source gaps:** G-W8 (`queryLedger citizen` returns card `name: "Jiu Wong"` vs ledger `Name: "Jordan Wong"` POP-00349; `Lucy Ferreira` vs `Lucia Ferreira` POP-00618. Sift clears the CARD name; Rhea checks LIVE data and may REVISE on the ledger variant. buildCitizenCards display name has diverged from the Simulation_Ledger `Name` column).
- **Steps:**
  1. Identify why buildCitizenCards display name diverges from the ledger `Name` column (separate source field vs transform). Reconcile to one canonical display name so sift and Rhea see the same string.
  2. Spot-check POP-00349 + POP-00618 + sweep for other drifted pairs.
- **Verify:** card `name` === ledger `Name` for the two known pairs + a sweep report.
- **Absorbs ROLLOUT:** recurrence of C98 G-W8 (unshipped) — note forward.
- **Status:** [ ] OPEN

### ES-3: Civic source emits real-calendar dates

- **Files:**
  - `.claude/agents/civic-office-baylight-authority/*` OR `city-civic-database/initiatives/baylight/decisions_c99.json` source path — modify (cycle-form gate references)
- **Source gaps:** G-W6 (B1 brief + upstream `decisions_c99.json` carry **"shortlist Jan 14 2027 / Feb 18 / Mar 10 2027"**; the reporter faithfully wrote forbidden month tokens, stripped Step 4. Civic-office-baylight authored gate milestones in real-calendar form — the civic source should emit cycle-form gate references so no-calendar-dates isn't pushed onto the reporter).
- **Steps:**
  1. Baylight civic source emits gate milestones as cycle-form references (e.g. "gate 1 @ C{n}"), not real calendar dates. Note: civic-office agent text is civic-terminal-owned — if the fix is in the agent RULES, route the edit to civic; the structural decision (cycle-form, not calendar) lands here.
- **Verify:** baylight decisions JSON / agent output carries no real-calendar month tokens.
- **Absorbs ROLLOUT:** none (cross-routes to civic for the agent-text half).
- **Status:** [ ] OPEN

### ES-4: photoQA rubric — distinguish brand text from stadium-typical numerals (pairs RB-2)

- **Files:**
  - `scripts/photoQA.js` — modify (rubric: brand-text FAIL vs stadium-numeral FLAG)
- **Source gaps:** G-PR-C99-1 ES-half (the rubric treats stadium-typical numerals/signage — jersey numbers, illegible/garbled fence ads, scoreboard glow — as a hard real-world-brand violation, so NO sports photo can ever clear; both ballpark frames FAILed 3/3. Mike: "we are filtering too hard on the sports stuff").
- **Steps:**
  1. Distinguish **legible real-world BRAND text** (true violation — "Toyota", "Coca-Cola") from **stadium-typical generic numerals/signage** (jersey numbers, garbled fence ads, scoreboard glow) → FLAG-not-FAIL when not a recognizable real brand.
  2. Pair with RB-2 DJ guidance: the residual numerals a real ballpark photo always carries must be permitted.
- **Verify:** re-run photoQA against the two C99 stadium frames → FLAG (not FAIL) on stadium numerals; a genuine brand-text frame still FAILs.
- **Absorbs ROLLOUT:** C98 ES-5 DJ-photo lineage + pipeline.13 — note forward.
- **Status:** [ ] OPEN

### ES-5: PDF render section-key drift — EDITOR'S DESK photo silent drop

- **Files:**
  - `scripts/generate-edition-pdf.js` — modify (section-key normalization OR editorial = non-photo)
- **Source gaps:** G-PR-C99-2 (`generate-edition-pdf.js` reported `Photos found: 4` incl. `EDITOR'S DESK → thanksgiving_lake_merritt_dusk.png`, then `[PHOTO PARITY MISMATCH] rendered 3 <img> but manifest has 4`; the editorial atmospheric silently dropped at render — `findPhotosForSection` placement disagrees with manifest-build on the `EDITOR'S DESK` key (apostrophe / editorial-text-only). Non-blocking this cycle but a silent-defect class — a substantive section photo could drop the same way).
- **Steps:**
  1. Either (a) normalize the apostrophe/section key so manifest-build and placement agree, OR (b) make editorial an explicit non-photo-bearing section so DJ doesn't assign a spec there and the manifest doesn't count an unrenderable placement.
- **Verify:** a manifest placement for EDITOR'S DESK either renders or is excluded at manifest-build; no parity mismatch.
- **Absorbs ROLLOUT:** none.
- **Status:** [ ] OPEN

### ES-6: Post-publish stale-artifact — citizen-card failures file

- **Files:**
  - `scripts/buildCitizenCards.js` — modify (truncate/overwrite failures file at run start)
- **Source gaps:** G-P-C99-2b (`output/citizen_card_failures_c99.json` existed from an earlier 00:11 run BEFORE this clean post-publish reported Errors 0; the Step 2a gate points operators at that file on failure — a stale copy from an unrelated run could mislead. Authoritative signal is the run's own `Errors: N` + exit code, not the file's presence).
- **Steps:**
  1. `buildCitizenCards.js`: truncate/overwrite `citizen_card_failures_c<XX>.json` at run start, OR only write it when Errors > 0, so a stale file can't survive a clean run.
- **Verify:** run a clean build → no stale failures file remains.
- **Absorbs ROLLOUT:** none.
- **Status:** [ ] OPEN

---

## Folds (point forward, do not restate)

- **T2 trackerUpdates conformance → [[2026-06-01-initiative-tracker-contract]] (civic.14 Phases 2–3).** These C99 gaps are recurrence of the C98 T1 cluster (unshipped) — additional concrete acceptance cases, not new work:
  - **civic.14 Phase 2** (engine + prep, clasp/script): G-R2 (city-hall-prep must read the LIVE `Initiative_Tracker.ImplementationPhase` per initiative — the C99 OARI `dispatch-live`→`pilot_evaluation` regression came from prep inferring phase off stale engine-review prose; the Step-6 dry-run was the only thing that caught it — make the live-tracker read the source); the pre-assembly validator that rejects non-canonical phase / missing `trackerUpdates.initiative`.
  - **civic.14 Phase 3** (writer-side enforcement): G-R1 (4 of 9 voice agents emitted numeric-keyed `{"0":{},"1":{}}` instead of `{"statements":[...]}` — pin the array shape in okoro/stabilization_fund/transit_hub/health_center output instructions, OR add a post-dispatch normalizer in the schema-capture step), G-R4 (Rivers INIT-007 nested `trackerUpdates:{ "INIT-007":{} }` instead of flat `initiative`/`InitiativeID` — pin flat shape), G-R5 (8 of 11 statements lacked `trackerOwner` — add to output schema OR accept assemble's inference as canonical and retire the warning), G-R3 (Health Center over-advanced construction-planning→construction-active a cycle early — project-agent phase-discipline note: an authorization/permit milestone ≠ the phase it authorizes).
- **Engine header-drift → engine.8** (orphan literals G-EC2/9/10 TierRole, G-EC5–G-EC17 multi-sheet orphans, G-EC18–G-EC26 acceptable-noise defensive fallbacks; G-EC11 PopID case-mismatch; G-EC24 hidden `Game_Intake` tab).
- **engine.29 Phase A deploy-pending signal:** G-EC3 (`StatusStartCycle`) + G-EC4 (`HealthCause`) on `generationalEventsEngine.js` are the S255 ride-along columns referenced-but-not-yet-added to Simulation_Ledger → confirms engine.29 Phase A column-add + deploy still pending (carried from C98 unchanged).

---

## Watch bucket (no phase — verify next cycle / benign)

- **G-EC33** — sentiment uniformity (20/21 hoods +0.38–0.58 into a tight 0.6–0.86 band C98→C99). **C100 check** (already the carried watch item): confirm neighborhood sentiment *diverges* rather than snapping to another uniform high band; if it re-compresses, engine.38's ~600-event flood is degrading discriminative power (not a determinism break).
- **G-EC1** — faith domain produced 5 events with 0 prior-cycle Tribune coverage. Editorial coverage-gap, not an engine defect — surfaces for desk awareness.
- **G-EC27/29/30/31** — cohort-collision / phase-ordering / phase-skip / silent-fail = V2-runtime classes, PENDING the engine-run-log local-ingest path. No action until that path lands.
- **G-EC28** — C98 gap log had 47 entries; cross-cycle repeat review is judgment-layer (this triage IS that review — the header-drift baseline + civic recurrence are the repeats, both routed).
- **G-EC32 / G-EC34 / G-EC35 / G-EC36** — INFO (engine.38 smoke PASS; Riley_Digest raw-vs-normalized expected divergence; chaos-cars in repo not executed at C99 [now deployed]; engine.38 zero new header-drift). No action.

---

## Out-of-scope (Mike-resolved / other domain)

- **G-PREP1** — Mara C99 "World Moves" proposal (File 1) declined at prep per engine-primacy (OakDOT/Chaos-Cars routes to a non-existent seat with zero live engine signal; Oaks zoning ask carries canon errors + Oaks is sports-only). **Mike's call S265:** reference-only, NOT a directive, NOT routed to research-build — Mags' own review governs the assignment surface. No C100 build; chaos-cars civic teeth revisited only when the engine actually emits events. No action.
- **G-S4 letter-eligibility script scope** — `scripts/checkLetterEligibility.js` greps every POPID in the candidates file incl. POPIDs named in an editorial "hard exclusions" line (false-positive HALT on POP-00004 Lucia, *listed as excluded*). Scope POPID extraction to the `## Candidate pool` section only. **Routes to ES** (script fix) — listed here as the ES half of T8; folded into ES backlog (small, bundle with ES-6 window).

---

## Open questions

- [ ] **ES-3 baylight gate-form ownership** — the structural decision (civic source emits cycle-form, not calendar) lands in research-build; the actual agent-text edit may be civic-terminal-owned (civic-office-baylight RULES). Confirm at execution whether the fix is in the agent RULES (→ civic) or the upstream decisions-JSON generator (→ engine-sheet). Tag accordingly when picked up.

---

## Changelog

- 2026-06-21 — Initial draft (S265, research-build). C99 triage per [[GAP_LOG_TRIAGE_PLAYBOOK]]. ~40 gaps → 11 themes; T2 trackerUpdates RECURRENCE folds to civic.14 Phases 2–3 (unshipped C98 fix); HIGH canon-fidelity cluster (T1 phantom-reporter / VERIFY-gate fabrication / invented-citizen) extends C98 RB-1; photoQA sports-filter retune (T6) continues the C98 DJ-photo lineage. Tier-1 dial-essence backfill explicitly held OUT (separate design row). Filed as governance.42.
