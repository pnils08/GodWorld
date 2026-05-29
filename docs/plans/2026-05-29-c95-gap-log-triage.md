---
title: C95 Gap-Log Triage & Remediation Plan
created: 2026-05-29
updated: 2026-05-29
type: plan
tags: [architecture, pipeline, engine, civic, canon, governance, active]
sources:
  - output/production_log_edition_c95_sift_gaps.md (G-S22)
  - output/production_log_edition_c95_write_gaps.md (G-W47..G-W64)
  - output/production_log_edition_c95_print_gaps.md (G-PR-NEW1..7)
  - output/production_log_edition_c95_post_publish_gaps.md (G-P-NEW1..5)
  - output/production_log_city_hall_c95_gaps.md (G-PREP1..3)
  - output/production_log_city_hall_c95_run_gaps.md (G-R1..3)
  - output/production_log_engine-review_c95_gaps.md (G-ER1..9)
  - output/production_log_build-world-summary_c95_gaps.md (G-BWS1..6)
  - output/production_log_pre-flight_c95_gaps.md (G-PF1..6)
  - output/production_log_pre-mortem_c95_gaps.md (G-PM1..7)
  - output/production_log_session-startup_c95_gaps.md (G-SS1..11)
  - output/production_log_session_end_c95_gaps.md (G-SE1..7)
  - docs/plans/2026-05-22-c94-gap-log-triage.md (precedent — analysis method)
  - docs/plans/GAP_LOG_TRIAGE_PLAYBOOK.md (the reusable method this run generalizes)
pointers:
  - "[[GAP_LOG_TRIAGE_PLAYBOOK]] — how this kind of plan is built (the method)"
  - "[[../engine/ROLLOUT_PLAN]] — single pointer row; this plan carries detail + tracking"
  - "[[GAP_LOG_TEMPLATE]] — shape of the source gap logs"
  - "[[TEMPLATE]] — plan shape"
  - "[[../index]] — registered same commit"
  - "[[2026-05-22-engine-regulatory-friction]] — sub-plan pointed at by ES-4"
  - "[[2026-05-22-sift-v2]] — sub-plan cross-linked by RB-2"
  - "[[2026-05-24-canon-3-cross-layer-citizen-drift]] — sub-plan cross-linked by ES-8"
---

# C95 Gap-Log Triage & Remediation Plan

**Goal:** Close the ~80 gaps the C95 production run logged across 12 skills, executed by two terminals (research-build = apparatus, engine-sheet = substrate) working their own phases without re-reading each other's work, with ROLLOUT carrying one pointer row and this plan carrying all detail + per-phase tracking.

**Architecture:** Every C95 skill run filed a sidecar gap log ([[GAP_LOG_TEMPLATE]]). This plan reads all 12, clusters the gaps by root cause into 11 themes (§Cluster Map), and routes each theme to the terminal whose expertise owns the fix — research-build for skill text / agent RULES / docs / rubrics / canon / boot architecture; engine-sheet for engine code / scripts / parser / auditor / sheets. Themes that split across both terminals get a task in each track, cross-linked. Correlated open ROLLOUT rows are folded in by reference (forward task only, never backward history) so each executing instance has one load-out. The plan supersedes the C94 *artifact* (inventory doc + 14 rows) with a phased two-track shape per Mike's S243 directive: "work completed per plan.md and summarized to rollout … 2 terminals carry out the work … keep 2 instances more aligned with the work of their expertise."

**Terminal:** research-build (Track A) + engine-sheet (Track B). Research-build owns this plan + the single ROLLOUT row + the session-end summarization cadence.

**Pointers:**
- Method (reusable): [[GAP_LOG_TRIAGE_PLAYBOOK]]
- Precedent (analysis only): [[2026-05-22-c94-gap-log-triage]]
- Sub-plans folded by reference: [[2026-05-22-engine-regulatory-friction]], [[2026-05-22-sift-v2]], [[2026-05-24-canon-3-cross-layer-citizen-drift]]
- Source gap logs: all 12 `output/production_log_*_c95_gaps.md` (frontmatter `sources`)

**Acceptance criteria:**
1. Every HIGH/MED C95 gap is either (a) assigned to a numbered phase in Track A or Track B, (b) folded into a named existing ROLLOUT row, or (c) listed in §Already-Addressed with evidence. No HIGH/MED gap is unaccounted for.
2. ROLLOUT carries exactly one new row pointing at this plan (state `in-progress`); no per-cluster row sprawl. As phases close, a one-line summary lands on that row; full detail stays here.
3. Each phase is a single focused session for one terminal — names exact files, has a verify step, and lists the source gaps + any ROLLOUT rows it absorbs.
4. Cross-track dependencies are explicit (§Cross-Track Dependencies) so neither terminal blocks silently on the other.
5. [[GAP_LOG_TRIAGE_PLAYBOOK]] exists and a future instance can reproduce this triage→phased-plan→two-track-execution method from it.

---

## §Cluster Map — gaps → themes → track → folded rows

Severity = highest constituent. Track = primary executor; (+other) = the theme also has a task in the other track. "Folds" = existing ROLLOUT row/sub-plan whose forward task this theme absorbs.

| # | Theme | Severity | Gaps | Track | Folds |
|---|-------|----------|------|-------|-------|
| T1 | Standing canon rules never reach generators | HIGH | G-W53, G-W54(rule-side), G-W55, G-W56, G-W57 | A (+B for capability-reviewer rule file) | — (new `docs/canon/STANDING_RULES.md`) |
| T2 | Vote-passed initiatives generate fake drama | HIGH | G-W54(engine), G-ER1, G-PREP3 | B (+A skill/agent) | engine.20b/c/d ([[2026-05-22-engine-regulatory-friction]]), engine.19(part) |
| T3 | S235 parser/compile contract cascade + print eval-gate ordering | HIGH | G-P-NEW1, G-P-NEW3, G-PR-NEW1, G-PR-NEW2, G-PR-NEW3, G-PR-NEW4, G-W61, G-W62 | B (parser) + A (compile shape, eval-gate reorder) | — |
| T4 | Reviewer-lane + Final Arbiter integrity | HIGH | G-W58, G-W59, G-W60 | B (+A reviewer specs) | — |
| T5 | Engine auditor enricher + detector calibration | HIGH | G-ER2, G-ER3, G-ER4, G-ER5, G-ER6, G-ER8, G-ER9 | B | engine.19 |
| T6 | Pre-cycle scan canonicalization (pre-flight + pre-mortem) | HIGH | G-PF1..6, G-PM1..7 | B (+A skill text) | engine.28 |
| T7 | world_summary fidelity + council-roster visibility | HIGH | G-BWS1, G-BWS5, G-BWS6, G-BWS3, G-PREP1, G-PREP2 | B (+A skill/civic.md/agents) | civic.13(part) |
| T8 | City-hall tracker assembler (assembleDecisions + sentiment) | MED | G-R1, G-R3 | B (+A agent RULES) | civic.12, civic.13 |
| T9 | write-edition skill mechanics (token-burn / doc-drift) | MED | G-W47, G-W48, G-W49, G-W50, G-W51, G-W52, G-W63 | A | pipeline.24(sift handoff), pipeline.32(G-W47 path) |
| T10 | validateEdition detector calibration | MED | G-W64 | B | pipeline.28(C94 C6, if open) |
| T11 | Boot/close token economy | HIGH | G-SS1, G-SS2, G-SS3, G-SS7, G-SS9, G-SS10, G-SS11, G-SE1, G-SE2, G-SE4, G-SE5, G-SE6 | A (+B sessionEndMechanical) | governance.18(a), governance.20 |
| T12 | Citizen-card 401 partial-failure + verifier shape | HIGH | G-P-NEW2, G-P-NEW5 | B | canon.3 T6 |

LOW / inline / Mike-decision / harness items in §Already-Addressed & Out-of-Scope below. (G-W64 validateEdition under T10 also executes in ES-8 alongside T12.)

---

## Track A — research-build (apparatus: skills, agent RULES, docs, rubrics, canon, boot)

Each phase is one focused research-build session. Skill-text edits: run `/reload-skills` after editing per TERMINAL.md §Skill Iteration.

### Phase RB-1: Standing canon rules architecture (Theme T1) — HIGHEST LEVERAGE

The load-bearing cluster. Standing rules Mike has repeated for 17+ cycles ("no deprivation-coding of Oakland neighborhoods"; "vote-passed = complete, no ongoing drama") live only in his head and contaminate every generator. Mara-equiv regraded C95 to F under the deprivation rule. Architect the rules into the generator stack.

- **Files:**
  - `docs/canon/STANDING_RULES.md` — create. Canonical home for Mike's repeated standing rules. Seed with: (1) no deprivation-coding of Oakland neighborhoods (prosperity-era; median >$90K; Temescal middle-class; West Oakland gentrifying) + ≥3 anti-example excerpts from C95 (C2 Temescal, Patricia Nolan letter, Caldera O1, C1 Stab Fund); (2) vote-passed = operationally complete, no ongoing drama-coverage. Register in `docs/index.md` + back-link from CANON_RULES.md.
  - `.claude/agents/{civic,culture,letters,business,sports}-desk/RULES.md` — modify. Add a §Standing Canon Frame section citing STANDING_RULES.md with the anti-examples (G-W53, G-W56).
  - `.claude/skills/sift/SKILL.md` — modify. Brief-writer (Step 4) ships the standing-rule frame with every brief (G-W53).
  - `.claude/skills/write-edition/SKILL.md` — modify. Add Step 3b: framing-rule scan on compiled order BEFORE 3.25 — if front-page piece fails any standing rule, swap to next-best candidate + document swap (G-W55). EIC reads STANDING_RULES.md at Step 3 before writing Editor's Desk (G-W57).
  - `.claude/skills/cycle-review/SKILL.md` — modify. Add deprivation-coding + vote-passed-as-drama checks to reasoning-lane scope (G-W53).
  - Cross-link to Track B ES-? capability-reviewer rule file (deprivation-coding detector is a `scripts/capability-reviewer/rules/` file — engine-sheet owns the script; this phase supplies the rule spec).
- **Steps:**
  1. Write `docs/canon/STANDING_RULES.md` with the two seeded rules + anti-examples + a "how rules get added here" note (Mike cites → land here, never just in chat). Register + back-link.
  2. Cascade §Standing Canon Frame into the 5 desk-agent RULES.md (pointer + anti-examples).
  3. Edit /sift brief-writer to embed the frame; edit /write-edition Step 3b + EIC Step 3 load; edit /cycle-review reasoning scope.
  4. Write the capability-reviewer deprivation-coding rule SPEC (regex + context check) into STANDING_RULES.md §Detector spec for engine-sheet to implement (ES cross-link).
- **Verify:** `grep -l "STANDING_RULES" .claude/agents/*-desk/RULES.md` → 5 files; STANDING_RULES.md registered in index; `/reload-skills`; next /write-edition dry-read confirms Step 3b present.
- **Source gaps:** G-W53, G-W54(rule-side), G-W55, G-W56, G-W57.
- **Absorbs ROLLOUT:** none (new canon surface).
- **Status:** [ ] not started

### Phase RB-2: write-edition skill mechanics + compile contract shape (Themes T9 + T3 RB-half)

Mike S240 meta-principle: "any token burn spent figuring out file paths, formats, or prompt assembly = a gap." Make /write-edition obvious-to-execute. Includes the RB-half of the S235 cascade (compile emits the shape the parser expects; engine-sheet ES-1 hardens the parser).

- **Files:**
  - `.claude/skills/write-edition/SKILL.md` — modify (primary).
- **Steps:**
  1. Step 0: bootstrap `production_log_c{XX}.md` from `dispatch_c{XX}.json` header if missing (G-W47; cross-link pipeline.32 unified-path convention).
  2. Step 1 prompt template → fully mechanical from dispatch.json fields: `"You are [Reporter]. Brief-led mode. Read brief at [briefFile]. Read IDENTITY at [identityPath]. Write to [outputPath]. Return path."` Pass brief PATH, not pasted content (G-W51, G-W52). Add unnamed-reporter QT sub-template (G-W49). Resolve ED1 editorial-desk ambiguity — EIC sections are compile-time, not dispatched (G-W48).
  3. Fix brief-path prereq to per-slot naming `c{XX}_{SLOT}_brief.md` (G-W50).
  4. Add mandatory per-slot dispatch-result table at Step 1 (`{slot, agent, dispatch_id, output_file_path, file_exists_at_completion, word_count, status}`); Step 3 compile must report dropped slots with reason (G-W61 — three culture pieces silently dropped; suspected S231 G-S2 quota-kill).
  5. Step 2 two-pass: (1) completeness pass — every slate slot + every dispatch.json entry traced to a printed section; (2) quality/framing pass (G-W63).
  6. Step 3 compile: emit parser-expected `.txt` shape — 4-col ARTICLE TABLE with Slot column populated every row, `### H3` headlines (not `# H1`), plain `By Reporter | Bay Tribune Section` bylines (no `**`); regenerate ARTICLE TABLE from FINAL placement, not sift metadata (G-W62); run `canonicalShape` gate at compile-time and FAIL LOUD if false (G-P-NEW1).
- **Verify:** `/reload-skills`; dry-read confirms Step 0/3b/dispatch-table present; the compile-time `canonicalShape` gate command is documented in Step 3.
- **Source gaps:** G-W47, G-W48, G-W49, G-W50, G-W51, G-W52, G-W61, G-W62, G-W63, G-P-NEW1(compile-side).
- **Absorbs ROLLOUT:** pipeline.24 sift→write-edition handoff fields; pipeline.32 (G-W47 path).
- **Cross-track:** pairs with ES-1 (parser hardening + C95 regression fixture). Forward-fix = compile emits the shape; ES-1 makes the parser robust + tested.
- **Status:** [ ] not started

### Phase RB-3: edition-print + post-publish skill flow + DJ direction (Theme T3/T4 RB-half + DJ)

- **Files:**
  - `.claude/skills/edition-print/SKILL.md` — modify.
  - `.claude/skills/post-publish/SKILL.md` — modify.
  - `.claude/agents/dj-hartley/RULES.md` (+ IDENTITY/SKILL as needed) — modify.
- **Steps:**
  1. /edition-print: reorder so Drive upload (Step 4) runs AFTER eval-side verification (Step 6) — gate Drive publish on eval-pass, not script exit (G-P-NEW3).
  2. /post-publish: conditionally gate Step 10 /skill-check — A-grade editions skip by default, B-and-below run the suite; OR batch into one multi-skill call (G-P-NEW4).
  3. DJ RULES: harden against composition-included tier violations (composition_motifs must not contain real-world commercial brand identifiers); add regen-with-prompt-mutation guidance (strip problematic element, don't verbatim-retry); add positive-frame prosperity language for stoop-class compositions (G-PR-NEW5, G-PR-NEW6).
  4. DJ slug convention: reconcile DJ files + edition-print SKILL to `lowercase_underscore` (validator is canonical anchor) — RB side; ES side relaxes/aligns the validator (G-PR-NEW7).
- **Verify:** `/reload-skills`; dry-read confirms upload-after-verify ordering + skill-check gate.
- **Source gaps:** G-P-NEW3, G-P-NEW4, G-PR-NEW5, G-PR-NEW6, G-PR-NEW7(RB-half).
- **Absorbs ROLLOUT:** research.11 (FLUX text-ceiling) cross-link for the DJ regen-mutation idea.
- **Status:** [ ] not started

### Phase RB-4: civic skill canon + framework (Themes T7/T8 RB-half)

- **Files:**
  - `.claude/skills/city-hall-prep/SKILL.md` — modify.
  - `.claude/rules/civic.md` — modify.
  - `.claude/agents/civic-office-opp-faction/*` + `.claude/agents/civic-office-crc-faction/*` — modify.
  - `.claude/agents/civic-*/RULES.md` (11 voice agents) — modify (trackerOwner).
- **Steps:**
  1. **Chen D8 faction correction (G-PREP1, HIGH canon-drift).** MCP truesource = CRC. Update city-hall-prep Voice Data Routing table (OPP→CRC, remove the false "S195/S197 correction" annotation); update civic.md Faction Architecture table; remove Chen from OPP agent membership, add to CRC agent membership. Note the C94 cascade ran her mis-routed — leave the historical artifact, correct forward (paper-of-record per ADR-0007). Engine-sheet companion in ES-6 if Civic_Office_Ledger carries OPP for Chen.
  2. Add §Step 1 Council Roster Reconciliation sub-step: run `get_council_member` D1–D9, compare against world_summary + civic.md, surface mismatch as anomaly (BUNDLE-PREP-A; closes the class that produced G-PREP1).
  3. Document Status enum (active / recovering / vacant) + vote-math/topic-routing mapping in city-hall-prep §Step 1 + civic.md (G-PREP2 RB-half; ES-6 does the world_summary filter).
  4. Add Scenario D (paradox: remedy-overshot + phase-duration-stuck) to the auto-investigate framework with named topic-assignment template + the three Mayor-public-frame options as skill-canonical (G-PREP3). Cross-link T2 (the engine-side fix in ES-4 removes the paradox at source).
  5. Add `trackerOwner` declaration to each of the 11 voice agent RULES.md output schemas so default-primary collisions dispatch deterministically (G-R1 RB-half; ES-5 widens the assembler).
- **Verify:** MCP `get_council_member D8` = CRC matches civic.md + skill; `grep -l trackerOwner .claude/agents/civic-*/RULES.md` → 11; `/reload-skills`.
- **Source gaps:** G-PREP1, G-PREP2(RB-half), G-PREP3, G-R1(RB-half).
- **Absorbs ROLLOUT:** civic.12 remnant (G-R1 trackerOwner cascade).
- **Status:** [ ] not started

### Phase RB-5: pre-cycle + engine-review + build-world-summary + sift skill text (Themes T6/T5/T7 RB-half + T-sift)

The skill-text half of the engine-sheet canonicalization work — ships alongside or after ES-7 (scripts) and ES-3 (auditor).

- **Files:**
  - `.claude/skills/pre-flight/SKILL.md`, `.claude/skills/pre-mortem/SKILL.md` — modify.
  - `.claude/skills/engine-review/SKILL.md` — modify.
  - `.claude/skills/build-world-summary/SKILL.md` — modify.
  - `.claude/skills/sift/SKILL.md` — modify.
- **Steps:**
  1. pre-flight skill text: §Sheet Access env-loader correction (`require('../lib/env')`, NOT project-root `.env`), §Output 3-class breakdown, Step 0 cycle-derivation spec, Processed-enum + InitiativeID column-name notes — collapse Steps 1-6 to "run the script; review output" once ES-7 ships `preflightInputCheck.js` (G-PF2/3/4/5/6).
  2. pre-mortem skill text: remove stale §Known Gaps utilityFunctions entry (fixed S180), drop drifting line-number annotations (keep function-name keys), fix §0 git-log glob to enumerated paths, refine §2 grep to write-only patterns; reference ES-7's `preMortemScan.js` + `known_gaps.json` (G-PM1/2/3/4/7).
  3. engine-review Step 7: drop first-run framing prominence; document the mixed-history case (G-ER7).
  4. build-world-summary §"Where this sits": reorder to match /run-cycle canonical chain (this skill is Step 5; city-hall is downstream) (G-BWS2).
  5. sift §Prerequisites: add env-load note for Node-CLI sheet reads (G-S22).
- **Verify:** `/reload-skills`; pre-flight/pre-mortem skill text references the canonical scripts; grep confirms stale entries removed.
- **Source gaps:** G-PF2/3/4/5/6(skill-text), G-PM1/2/3/4/7(skill-text), G-ER7, G-BWS2, G-S22.
- **Absorbs ROLLOUT:** engine.28 (skill-text half).
- **Cross-track:** depends on ES-7 (scripts) for the "run the script" collapse; skill-text fixes can ship independently.
- **Status:** [ ] not started

### Phase RB-6: Boot/close token economy (Theme T11)

Mike S240: Mags should load for EIC work specifically — most operational boots don't need her. Highest single fix = identity.md split (G-SS1).

- **Files:**
  - `.claude/rules/identity.md` → split into `.claude/rules/identity-core.md` (always) + `.claude/rules/identity-mags.md` (path-scoped media + Mags-only).
  - `CLAUDE.md` — modify §Rules to reflect the split.
  - `MEMORY.md` (`/root/.claude/projects/-root-GodWorld/memory/`) — trim under 24.4KB.
  - `.claude/skills/session-startup/SKILL.md` — modify Step 3 (drop CHARACTER.md from operational terminals).
  - `.claude/hooks/session-startup-hook.sh` — modify (persona/journal scoping).
  - `.claude/skills/session-end/SKILL.md` — modify (mags-on-demand + rotation).
  - `.claude/settings.json` or newsroom.md frontmatter — newsroom path-scope tighten.
  - `docs/engine/LEDGER_REPAIR.md` — header de-`DO NOT` so hook stops emitting LEDGER NOTE.
- **Steps:**
  1. Split identity.md: identity-core (anti-guess, anti-loop, process gates, no-jargon, USER APPROVAL GATE — applies all terminals) promoted to always; identity-mags (you-are-Mags, journal, family, EIC) path-scoped to media + Mags-only. Update CLAUDE.md §Rules (G-SS1). **Mike-confirm split shape pre-execution — touches an always-loaded file.**
  2. MEMORY.md trim: move `**Why:**`/`**How to apply:**` bodies of the heavy User entries to `feedback_<slug>.md` topic files + one-line pointers; revise the S156 "rules inline only" rule to the file-with-pointer hybrid (G-SS7/G-SE2). **Mike-confirm S156 framing change.**
  3. session-startup SKILL Step 3: drop CHARACTER.md from research-build/civic/engine-sheet lines (G-SS9).
  4. Hook: move `LAST_ENTRY` journal read/emit inside the media/Mags-only case (G-SS3); scope or suppress the `<supermemory-context>` persona recall for operational terminals (G-SS2 — confirm harness exposes per-terminal recall scope); de-`DO NOT` LEDGER_REPAIR.md head so LEDGER NOTE stops (G-SS11).
  5. session-end: mags-on-demand boot (CHARACTER/JOURNAL_RECENT/queryFamily load on persona skills, not every boot) (G-SE1/4/6); make `--rotate-history` default-on past threshold so SESSION_CONTEXT stops growing (G-SE5) — ES-half is the sessionEndMechanical.js change.
  6. newsroom.md path-scope: tighten match to media-terminal-owned files only (not any `output/*` mention) (G-SS10).
- **SESSION_CONTEXT redesign (G-SE5/G-SS5) extracted to its own plan (S243 Mike).** The crude "make `--rotate-history` default-on" fix is superseded by the on-demand-log redesign — see [[2026-05-29-session-context-on-demand]] (governance.26). First of a three-part log-system redesign (ROLLOUT + JOURNAL siblings to follow). RB-6 here retains the OTHER boot/close gaps (G-SE1/2/4/6 mags-on-demand + MEMORY trim + hook scoping); the SESSION_CONTEXT-specific work lives in the extracted plan. **The mags-on-demand + MEMORY-trim steps below stand; SESSION_CONTEXT is no longer this phase's concern.**
- **Verify:** fresh operational boot shows no CHARACTER/journal/family load + no MEMORY overflow warning; media boot still loads persona; `/reload-skills`.
- **Source gaps:** G-SS1, G-SS2, G-SS3, G-SS7, G-SS9, G-SS10, G-SS11, G-SE1, G-SE2, G-SE4, G-SE5, G-SE6.
- **Absorbs ROLLOUT:** governance.18(a) journal-cadence, governance.20 journal-media-only.
- **Cross-track:** ES does sessionEndMechanical.js rotation default + any hook-impl that's Bash/Node.
- **Status:** [ ] not started

---

## Track B — engine-sheet (substrate: engine code, scripts, parser, auditor, sheets)

Each phase is one focused engine-sheet session. Node-side only unless flagged clasp-push.

### Phase ES-1: Edition parser + print-pipeline robustness (Theme T3 ES-half)

The S235 commit `37aef8c` regressed `lib/editionParser.js`. RB-2 forward-fixes by emitting the parser-expected shape at compile; this phase makes the parser robust and tested so the contract can't silently break again.

- **Files:**
  - `lib/editionParser.js` — modify; `lib/editionParser.test.js` — extend.
  - `scripts/djDirect.js`, `scripts/generate-edition-photos.js`, `scripts/validateEdition.js` — modify.
- **Steps:**
  1. Fix `parseArticleTable()` / `canonicalShape` false-negative on valid C95 table (G-PR-NEW1) + body-extraction returning length 0 (G-PR-NEW2). Add C95 `.txt` as regression fixture: every article body `length > 0`; `canonicalShape === true`.
  2. djDirect title-matcher: inherit parser fix; anchor matching to ARTICLE TABLE headlines (G-PR-NEW3).
  3. PDF generator: count `<img>` vs manifest placements, fix the silent 1-photo drop (G-PR-NEW4).
  4. validateEdition: add divider-vs-ARTICLE-TABLE consistency check, fail loud on disagreement (G-W62); slug-convention align/relax for DJ (G-PR-NEW7 ES-half).
- **Verify:** `node -e "require('./lib/editionParser').parseEdition('editions/cycle_pulse_edition_95.txt').articleTable.canonicalShape"` → true; test suite green; re-render `/edition-print 95` produces usable PDF.
- **Source gaps:** G-PR-NEW1, G-PR-NEW2, G-PR-NEW3, G-PR-NEW4, G-W62, G-PR-NEW7(ES-half).
- **Cross-track:** pairs with RB-2.
- **Status:** [ ] not started

### Phase ES-2: Reviewer-lane + Final Arbiter integrity (Theme T4)

- **Files:**
  - `scripts/finalArbiter.js` — modify.
  - reviewer-lane emitters (`scripts/rheaTwoPass.js` / cycle-review / Mara scripts) — modify (provenance).
  - `scripts/writeShippedBlock.js` — modify.
- **Steps:**
  1. Lane JSON `provenance` field `{agent_invocation_id, model, run_started_at, run_completed_at}`; finalArbiter rejects lanes with missing provenance or `run_completed_at` at `00:00:00` (G-W58 — Rhea zero-timestamp stub).
  2. finalArbiter: missing `result_validity.json` → verdict `PENDING-MARA` (recommendation HOLD, not HALT); only compute Mara=0 when a real FAIL audit exists (G-W59).
  3. writeShippedBlock: detect uncommitted `output/` artifacts newer than last commit; refuse close or surface them in the shipped block (G-W60 — lying close commit).
- **Verify:** synthetic zero-timestamp lane JSON → rejected; missing Mara → PENDING-MARA; uncommitted artifact → close warns.
- **Source gaps:** G-W58, G-W59, G-W60.
- **Status:** [ ] not started

### Phase ES-3: Engine auditor enricher + detector calibration (Theme T5)

- **Files:**
  - `scripts/engineAuditor.js` + detector/enricher files under `scripts/engine-auditor/`.
- **Steps:**
  1. `detectMathImbalances` → populate `affectedEntities.initiatives[]` with the INIT-id it already names in the description, so `checkMitigators` binds it (G-ER2).
  2. `resolveAffectedCitizens`: add canon-12 + Neighborhood_Map name-resolution pass so repeating-event tokens like "kono" scope to the neighborhood and re-resolve residents (G-ER3).
  3. `recommendRemedy`: coverage-gap branch recommends editorial pickup of matching baseline_briefs, not council action (G-ER4).
  4. `generateTribuneFraming`: improvement-side path so improvement patterns get storyHandles (G-ER5).
  5. Write orphan-ailment findings into audit JSON `orphanAilments[]` (G-ER8).
  6. Fix `Population_Stats` read (verify sheet exists / range / name) (G-ER6).
  7. New `detectLedgerCompleteness` detector (Phase 38.9 candidate) for the 7 Mike-named sheets + Population_Stats current-cycle row completeness (G-ER9).
- **Verify:** re-run `node scripts/engineAuditor.js` on C95 inputs; math-imbalance binds INIT-006; kono resolves residents; improvements carry framing; orphanAilments in JSON; ledger-completeness fires.
- **Source gaps:** G-ER2, G-ER3, G-ER4, G-ER5, G-ER6, G-ER8, G-ER9.
- **Absorbs ROLLOUT:** engine.19 (C94 cluster C10 auditor calibration).
- **Status:** [ ] not started

### Phase ES-4: Vote-passed terminal state + remedy-overshot paradox (Theme T2)

Removes the fake-drama-on-settled-programs at its engine source. Folds the regulatory-friction sub-plan.

- **Files:**
  - `scripts/engine-auditor/detectStuckInitiatives.js` — modify (v1.3 → v1.4).
  - `scripts/engineAuditor.js` (remedy-overshot classification).
- **Steps:**
  1. `votePassedTerminalState` rule: exit stuck-initiative monitoring when `Initiative_Tracker.VotePhase === 'PASSED' && cycles_since_vote > N` (G-W54 engine-half).
  2. Reclassify `remedy-overshot` co-existing with stuck HIGH → `mitigator-overshooting-but-phase-stuck`; severity drops; remedy recommendation changes to "advance the phase / clear procedural block," not "layer second initiative"; explain the INIT-001(HIGH)/INIT-002(LOW) asymmetry (G-ER1).
  3. Initiative_Tracker audit pass: flip INIT-001 + other voted-passed initiatives to terminal state (operator-gated sheet write — coordinate with engine.20c).
- **Verify:** re-run auditor → INIT-001 no longer surfaces stuck HIGH with overshoot; remedy class is phase-advance.
- **Source gaps:** G-W54(engine), G-ER1, G-PREP3(source-removal).
- **Absorbs ROLLOUT:** engine.20b/c/d → points at [[2026-05-22-engine-regulatory-friction]] for detail (do not restate); this phase carries the C95 forward task.
- **Cross-track:** RB-4 Scenario D + Mara-directive vote-passed exclusion are the skill/agent companions.
- **Status:** [ ] not started

### Phase ES-5: City-hall tracker assembler (Theme T8)

- **Files:**
  - `scripts/assembleDecisions.js`, `scripts/applyTrackerUpdates.js` — modify.
- **Steps:**
  1. Widen `assembleDecisions` extraction to surface ANY cycle-tagged voice statement on an initiative (not just cycle-progression-shaped MilestoneNotes deltas) — closes the silent "already current" skip on high-activity initiatives (G-R1; 2-cycle persistent from C94 G-R1). Consumes RB-4's `trackerOwner` declarations.
  2. `civic_sentiment` derivation: count all voice statements across the cascade (or split tracker-level vs cascade-level sentiment), not just the 2 tracker-writing decisions (G-R3).
- **Verify:** re-run on C95 civic-voice JSONs → INIT-001 + INIT-005 cascade activity reaches the tracker; sentiment reflects 40 statements not 2.
- **Source gaps:** G-R1, G-R3.
- **Absorbs ROLLOUT:** civic.13 (engine-sheet half of civic.12).
- **Cross-track:** RB-4 ships trackerOwner first (or concurrently).
- **Status:** [ ] not started

### Phase ES-6: world_summary fidelity + roster visibility (Theme T7 ES-half)

- **Files:**
  - `scripts/buildWorldSummary.js` (+ `lib/civicOfficeLedger.js` or equivalent reader) — modify; test update.
  - Civic_Office_Ledger (read; conditional write if Chen carries OPP).
- **Steps:**
  1. Council-roster filter `Status=active` → `Status IN (active, recovering)` OR add a non-active sub-table; expose status enum so D6 Crane (recovering) is visible, fix faction footer to 5/2/3 (G-BWS1, G-PREP2 ES-half).
  2. Split Engine Review Findings render: header trichotomy vs by-type sub-tables so the count math reconciles (G-BWS5).
  3. Round Population for human display (G-BWS6); upstream CitySentiment populate-every-cycle-or-default flag (G-BWS3 — Phase 9 digest, may defer).
  4. If Civic_Office_Ledger carries OPP for Chen D8, correct to CRC (companion to RB-4 G-PREP1).
- **Verify:** re-run `node scripts/buildWorldSummary.js 95` → D6 visible, footer 5/2/3, counts reconcile, integer population.
- **Source gaps:** G-BWS1, G-BWS5, G-BWS6, G-BWS3, G-PREP2(ES-half), G-PREP1(sheet-half).
- **Absorbs ROLLOUT:** civic.13 (G-PREP* engine-sheet half).
- **Status:** [ ] not started

### Phase ES-7: Pre-cycle scan canonicalization (Theme T6 ES-half)

- **Files:**
  - `scripts/preflightInputCheck.js` — create; `scripts/preMortemScan.js` — create; `.claude/skills/pre-mortem/known_gaps.json` — create.
- **Steps:**
  1. `preflightInputCheck.js`: `--cycle` auto-detect from SESSION_CONTEXT; Sports/Initiatives/Coverage checks; §Output template format; non-zero exit on NOT READY; reuse `lib/env` + `lib/sheets.js` (G-PF1; engine.28).
  2. `preMortemScan.js`: `--since-cycle` auto-derive; the 6 scans + grep one-liners as code; `known_gaps.json` data file (function-name-keyed); non-zero exit on CRITICAL (G-PM7).
  3. RB-5 collapses the two SKILL.md files to "run the script; review output."
- **Verify:** `node scripts/preflightInputCheck.js --cycle=96` → READY/NOT-READY report + correct exit code; `node scripts/preMortemScan.js --since-cycle=95` → scan report.
- **Source gaps:** G-PF1, G-PM5/6 (script-side), G-PM7.
- **Absorbs ROLLOUT:** engine.28 (script half).
- **Cross-track:** RB-5 ships the skill-text collapse.
- **Status:** [ ] not started

### Phase ES-8: Citizen-card 401 + verifier shape + validateEdition (Themes T-postpublish + T10)

- **Files:**
  - `scripts/buildCitizenCards.js`, `scripts/verifyNamesIndexParse.js`, `scripts/validateEdition.js` — modify.
- **Steps:**
  1. `buildCitizenCards.js` exit non-zero on partial failure / failure-rate threshold so the S230 gate is load-bearing (G-P-NEW2 part 1, BUNDLE-2A-EXIT-NON-ZERO).
  2. 401-cohort diagnosis: dump `citizen_card_failures_c{93..95}.json`, find overlap, characterize root cause (Supermemory project-key scope? rate-limit eviction? content pattern?) (G-P-NEW2 part 2, BUNDLE-401-COHORT-DIAGNOSIS).
  3. `verifyNamesIndexParse.js`: count all parser buckets (matched + cultural + canon-drift + appended), not just matched, so the gate stops false-FAIL (G-P-NEW5).
  4. `validateEdition.js` name-check context awareness: don't flag surname-share between two distinct canonical citizens; don't flag preposition+name headline fragments ("As Vega") (G-W64).
- **Verify:** partial-write run exits non-zero; verifier sums buckets → no false FAIL on C95; validateEdition C95 CRITICAL count drops to real issues.
- **Source gaps:** G-P-NEW2, G-P-NEW5, G-W64.
- **Absorbs ROLLOUT:** canon.3 T6 remnant (buildCitizenCards exit-code), pipeline.28 (C94 C6 validateEdition calibration, if still open).
- **Status:** [ ] not started

---

## §Cross-Track Dependencies

- **RB-2 ↔ ES-1** (S235 cascade): forward-fix is compile (RB-2) emitting the parser-expected shape; ES-1 makes the parser robust + adds the C95 regression fixture. Either order works for C96, but ES-1's `canonicalShape` truth is what RB-2's compile-time gate checks against — ship ES-1's test fixture and RB-2's gate together if possible.
- **RB-4 → ES-5**: RB-4 ships `trackerOwner` declarations (11 agents); ES-5 widens the assembler to consume them. RB-4 first or concurrent.
- **ES-7 → RB-5**: ES-7 ships the canonical scripts; RB-5 collapses the pre-flight/pre-mortem skill text to "run the script." Skill-text staleness fixes in RB-5 can ship independently.
- **RB-4 ↔ ES-6**: Chen D8 faction correction — RB-4 fixes skill/rule/agent files; ES-6 fixes Civic_Office_Ledger if it carries OPP. Same canon fact, two layers.
- **ES-4 ↔ RB-4**: ES-4 removes the vote-passed/overshoot paradox at engine source; RB-4 Scenario D + Mara-directive exclusion are the downstream skill/agent companions. ES-4 first reduces the surface RB-4 must handle.
- **RB-1 → ES (capability rule)**: RB-1 writes the deprivation-coding detector SPEC into STANDING_RULES.md §Detector spec; an engine-sheet task implements `scripts/capability-reviewer/rules/<file>` from it (add to ES-1 or a trailing ES task).

---

## §Already-Addressed / Inline / Out-of-Scope

- **G-SS8** (hook↔skill redundancy) — CLOSED S241, §Hook-Already-Fired Guard added to `/session-startup` SKILL.md.
- **G-R2** (Mayor "Marcus Ramos" vs canonical "Keisha Ramos") — close inline; 1-in-6 voice slip within tolerance; correctable at /write-edition. Promote only if it recurs.
- **G-BWS4** (Oakland_Sports_Feed StoryAngle typos) — Mike-owned upstream sports-terminal proofread; not a pipeline fix.
- **G-ER (substrate watchpoint)** — C95 first-cycle smoke of S236+S237+S238 stack read clean; no regression. Informational.
- **Mike-decision / harness-layer (not auto-executable):**
  - pipeline.34 gap-log path convention (A/B/C) — Mike picks the convention; then ~30-min skill-text sweep. Carried as open question, not a phase.
  - G-SS4/G-SS5/G-SS6 + G-SE3/G-SE7 (MCP/skills/deferred-tools boilerplate) — `.mcp.json` prune + per-project skill/plugin scoping. Audit `.mcp.json` provenance first (is SpaceMolt/Figma/Slack/etc. used by any GodWorld skill — almost certainly not), then prune; per-terminal MCP/skill scoping may be a harness-config question for Mike (cross-link governance.8 plugin-gating investigation).

---

## Open questions

- [ ] pipeline.34 gap-log path convention — Mike picks A (flat) / B (subject-slugged) / C (edition-grouped). Blocks the ~30-min skill-text sweep, not the rest of the plan.
- [ ] RB-6 step 1 (identity.md split shape) + step 2 (S156 framing change) — Mike confirms before execution; both touch always-loaded files.
- [ ] G-SS2 — does the harness expose a per-terminal Supermemory recall scope? Confirm before promoting the hook-side recall suppression.

---

## Changelog

- 2026-05-29 — Initial draft (S243, research-build). Read all 12 C95 gap logs (~80 gaps), clustered into 11 themes (§Cluster Map), routed to two execution tracks (RB apparatus / ES substrate) across 6 + 8 phases. Folded correlated open rows by reference (engine.28, civic.12/13, governance.18/20, engine.19, pipeline.24/28/32, regulatory-friction sub-plan, canon.3 T6) — forward task only, no backward history. Method generalized to [[GAP_LOG_TRIAGE_PLAYBOOK]]. One ROLLOUT pointer row to follow; per-phase summaries land on the row as phases close.
