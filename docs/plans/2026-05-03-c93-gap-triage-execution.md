---
title: C93 Gap Triage Execution Plan
created: 2026-05-03
updated: 2026-05-03
type: plan
tags: [media, civic, infrastructure, architecture, active]
sources:
  - output/production_log_city_hall_c93_gaps.md (16 entries, S192)
  - output/production_log_city_hall_c93_run_gaps.md (15 entries, S193)
  - output/production_log_edition_c93_sift_gaps.md (14 entries, S194)
  - output/production_log_edition_c93_write_gaps.md (25 entries, S195)
  - output/production_log_edition_c93_post_publish_gaps.md (25 entries, S195)
  - output/production_log_edition_c93_print_gaps.md (20 entries, S196)
  - docs/engine/ROLLOUT_PLAN.md §Edition Post-Publish
pointers:
  - "[[engine/ROLLOUT_PLAN]] — parent rollout; gap-log entries already filed under §Edition Post-Publish"
  - "[[SCHEMA]] — doc conventions"
  - "[[index]] — registered in same commit"
  - "[[plans/TEMPLATE]] — shape this follows"
---

# C93 Gap Triage Execution Plan

**Goal:** Close the 115 C93 gaps in 5 staged waves, marking each gap's status on its sidecar log as it's resolved or handed off.

**Architecture:** Six gap-log sidecars surfaced 115 entries across the C93 cycle. Cross-cutting analysis groups them into five clusters: DOC-drift skill-vs-code (~30 gaps, cheap text edits), canon-RULES hardening for agents (~6 gaps, recurrence pattern), engine-sheet handoff bundles (~25 gaps, code changes), architectural design (~3 gaps, plan files first), and FLUX research (~3 gaps, expensive). Waves 1, 2, 4, 5 execute on research-build; Wave 3 hands off to engine-sheet via ROLLOUT bundle entries.

**Terminal:** research-build (waves 1, 2, 4, 5) + engine-sheet (wave 3 handoff)

**Pointers:**
- Gap log inventory: see `sources:` frontmatter (six absolute paths)
- Cross-cycle pattern (DOC drift dominates, HIGHs sit on shelf): write-edition G-W16 meta-pattern entry
- Canon-RULES recurrence: city-hall G-R6/R7/R10 → write-edition G-W12/W14 (same failure class, two cycles)

**Acceptance criteria:**
1. Every gap entry across all 6 sidecars has a `Status:` line ending in `DONE S<n> — <fix>` (research-build resolution), `WAVE 3 HANDOFF S<n> — <bundle name>` (engine-sheet pickup), `WAVE 4 DESIGN S<n> — <plan path>` (design pending), or `WAVE 5 RESEARCH S<n>` (FLUX cluster).
2. ROLLOUT_PLAN §Edition Post-Publish points at this plan + all 6 gap logs.
3. docs/index.md registers this plan in same commit.

---

## Wave 1 — DOC-drift reconciliation (research-build)

Edit SKILL.md text to match real script behavior. ~15 gaps closed. Pure text edits, no code.

### Task 1.1: /edition-print SKILL.md DOC fixes

- **Files:**
  - `.claude/skills/edition-print/SKILL.md` — modify
- **Steps:**
  1. Step 0 → reference consolidated `output/production_log_c<XX>.md` + `## Print Pipeline (<type>)` append section (G-PR1)
  2. Step 1b slug example → snake_case to match validator (G-PR8)
  3. Step 1b word band → 100-220 to match validator constants (G-PR9)
  4. Step 4 → drop "photos also upload" claim OR caveat as PDF-only (G-PR18)
- **Verify:** `grep -c production_log_edition_c .claude/skills/edition-print/SKILL.md` → 0
- **Status:** [ ] not started

### Task 1.2: /edition-print DJ-agent slug examples

- **Files:**
  - `.claude/agents/dj-hartley/SKILL.md` — modify
- **Steps:**
  1. Update slug examples in DJ subagent prompt to snake_case (G-PR8 second touch)
- **Verify:** `grep -c "[a-z]\+-[a-z]\+" .claude/agents/dj-hartley/SKILL.md` returns no slug-pattern matches
- **Status:** [ ] not started

### Task 1.3: /sift brief template DOC fix

- **Files:**
  - `docs/media/brief_template.md` — modify
- **Steps:**
  1. Update word-count target 300-500 → 800-1,200 per single-story brief, with multi-story note (G-S14)
  2. Add changelog entry
- **Verify:** `grep -c "300-500" docs/media/brief_template.md` → 0
- **Status:** [ ] not started

### Task 1.4: /write-edition SKILL.md compile-template DOC fix

- **Files:**
  - `.claude/skills/write-edition/SKILL.md` — modify
- **Steps:**
  1. Compile template section labels → match parseEdition.js allowlist (FRONT PAGE / EDITOR'S DESK / CIVIC / CULTURE / BUSINESS / OPINION / SPORTS / LETTERS) (G-W19, text side)
  2. Divider examples → `^-{10,}$` to match parser regex (G-W19, text side)
  3. Note: parser-side fix lives in Wave 3 BUNDLE-A
- **Verify:** `grep -c '===' .claude/skills/write-edition/SKILL.md` in compile-template section returns 0
- **Status:** [ ] not started

### Task 1.5: /post-publish SKILL.md DOC fixes

- **Files:**
  - `.claude/skills/post-publish/SKILL.md` — modify
- **Steps:**
  1. Audit Step 2a, Step 6, Step 8b bash invocations against actual script signatures (G-P12/13/19, text side)
  2. Add §Time Budget section listing wall time per substep (G-P25)
  3. Drop bot restart from Step 11 — defer to /session-end (G-P23)
  4. Drop /save-to-bay-tribune duplicate at /write-edition close — single canonical home in /post-publish 1b (G-P1, text side)
  5. Update postRunFiling expectation to pipeline-v2 outputs (G-P22, text side; manifest fix is Wave 3)
- **Verify:** `grep -c "pm2 restart mags-bot" .claude/skills/post-publish/SKILL.md` → 0
- **Status:** [ ] not started

### Task 1.6: /city-hall SKILL.md DOC fixes

- **Files:**
  - `.claude/skills/city-hall/SKILL.md` — modify
- **Steps:**
  1. Voice-routing table → show faction-bloc agent topology (3 bloc agents grouping 9 council members), not 11 individual agents (G-10)
  2. Step 1 sheet reads → mark Initiative_Tracker / Civic_Office_Ledger as world_summary-derivative; trust derivative as primary input (G-13)
- **Verify:** Voice-routing table no longer enumerates 9 council members individually; faction-bloc structure described
- **Status:** [ ] not started

### Task 1.7: Mark Wave 1 gap statuses

- **Files:**
  - All 6 sidecars under `output/production_log_*c93*gaps.md` — modify
- **Steps:**
  1. For each closed gap (G-PR1, G-PR8, G-PR9, G-PR18, G-S14, G-W19, G-P1, G-P12, G-P13, G-P19, G-P22, G-P23, G-P25, G-10, G-13): change `Status:` line to `Status: DONE S197 — Wave 1 (skill-text reconciliation)`
- **Verify:** `grep -c "DONE S197" output/production_log_*c93*gaps.md | awk -F: '{s+=$2} END {print s}'` → ≥15
- **Status:** [ ] not started

---

## Wave 2 — Canon RULES hardening (research-build)

Harden agent RULES.md files against fabricated council members + date leakage. ~8 gaps.

### Task 2.1: Project-agent RULES.md — canonical council roster injection

- **Files:**
  - `.claude/agents/civic-project-transit-hub/RULES.md` — modify
  - `.claude/agents/civic-project-stabilization-fund/RULES.md` — modify
  - `.claude/agents/civic-project-oari/RULES.md` — modify
  - `.claude/agents/civic-project-health-center/RULES.md` — modify
  - `.claude/agents/civic-office-baylight-authority/RULES.md` — modify
- **Steps:**
  1. Add §Council Roster (Tier-1 prohibition): list 9 canonical members by district + faction; "NEVER assert any position for a council member who did not produce a voice statement this cycle"
  2. Require `mcp__godworld__get_council_member` lookup as Step 0 for any council reference
- **Verify:** `grep -l "Vega.*D4.*President" .claude/agents/civic-project-*/RULES.md .claude/agents/civic-office-baylight-authority/RULES.md` lists ≥5 files
- **Status:** [ ] not started

### Task 2.2: Project-agent RULES.md — date/year leakage prohibition

- **Files:** Same 5 files as Task 2.1 — modify each
- **Steps:**
  1. Add §Time Convention (Tier-1 prohibition): "No month names. No years. No calendar dates. Cycles only." with examples (G-R8)
- **Verify:** `grep -l "No month names" .claude/agents/civic-project-*/RULES.md .claude/agents/civic-office-baylight-authority/RULES.md` lists ≥5 files
- **Status:** [ ] not started

### Task 2.3: Desk reporter RULES.md — canonical council roster injection

- **Files:**
  - `.claude/agents/civic-desk/RULES.md` — modify
  - `.claude/agents/freelance-firebrand/RULES.md` — modify
- **Steps:**
  1. Same as 2.1 — canonical 9-member roster + lookup requirement (G-W12, G-W14)
- **Verify:** `grep -l "Vega.*D4.*President" .claude/agents/civic-desk/RULES.md .claude/agents/freelance-firebrand/RULES.md` lists 2 files
- **Status:** [ ] not started

### Task 2.4: civic-office-crc-faction RULES.md — Delgado coverage

- **Files:**
  - `.claude/agents/civic-office-crc-faction/RULES.md` — modify
- **Steps:**
  1. Verify Delgado present in canonical-roster list; add if missing (G-W17)
- **Verify:** `grep -c Delgado .claude/agents/civic-office-crc-faction/RULES.md` → ≥1
- **Status:** [ ] not started

### Task 2.5: dj-hartley RULES.md — composition-suppresses-text rule

- **Files:**
  - `.claude/agents/dj-hartley/RULES.md` — modify
- **Steps:**
  1. Add §Canon-Fidelity composition rule: "When the scene has institutional or commercial signage, suppress legibility by composition (DOF, angle, distance, frame crop) — never rely on negative-frame instruction alone." (G-PR13)
- **Verify:** `grep -c "suppress legibility by composition" .claude/agents/dj-hartley/RULES.md` → ≥1
- **Status:** [ ] not started

### Task 2.6: Mark Wave 2 gap statuses

- **Files:** city-hall-run, write-edition, print sidecars — modify
- **Steps:**
  1. For G-R6, G-R7, G-R8, G-R10, G-W12, G-W14, G-W17, G-PR13: change `Status:` to `Status: DONE S<n> — Wave 2 (RULES hardening)`
- **Verify:** `grep -c "DONE.*Wave 2" output/production_log_*c93*gaps.md | awk -F: '{s+=$2} END {print s}'` → ≥8
- **Status:** [ ] not started

---

## Wave 3 — Engine-sheet handoff bundles (research-build writes ROLLOUT entries; engine-sheet executes)

Group ~25 engine-sheet gaps into 8 clean bundles. Each bundle = one ROLLOUT entry under §Data & Pipeline or §Infrastructure.

### Task 3.1: BUNDLE-A — Format contract enforcement

- **Files:**
  - `docs/engine/ROLLOUT_PLAN.md` — modify
- **Bundle:** G-W19 (compile template ↔ parser format), G-P6, G-P8, G-P9 (NAMES INDEX / BUSINESSES NAMED missing → silent intake drops)
- **Status:** [x] DONE S197 — engine-sheet shipped end-to-end. `scripts/emitFormatContractSections.js` (NEW, ~530 LOC) parses CITIZEN USAGE LOG and emits strict NAMES INDEX (POP-/CUL-/FAITH- prefixes) + BUSINESSES NAMED, idempotent `--inject` mode. `/write-edition` Step 3a wires the helper. `ingestPublishedEntities.js` adds CUL fallback when NAMES INDEX absent (backfill replay path). `verifyNamesIndexParse.js` adds `--strict` flag — fail-loud on missing-section, plus CUL fallback count for diagnostic. `/post-publish` Step 5 invokes with `--strict`. C93 fixture dry-run: 3 new citizens (Vivienne Torres / Diane Foster / Thomas Webb) + Atlas Bay Architects + Greater Hope Pentecostal Church all surface — 5/5 acceptance. Note: bundle spec listed `rateEditionCoverage.js` but it parses article bodies (not NAMES INDEX); left untouched. Surfaced 1 unrelated downstream bug in `resolveCitizens` (Calvin Reeves Sr. → "Calvin Sr." — last-name suffix tokenization); flagged for separate gap, outside BUNDLE-A scope.

### Task 3.2: BUNDLE-B — MCP citizen verification + queryLedger env

- **Bundle:** G-S7, G-S8, G-S10, G-S12, G-W15, G-P7
- **Status:** [x] DONE S197 — two distinct roots, six HIGHs closed. Env loader miss in queryLedger.js + rateEditionCoverage.js fixed (`require('lib/env')` added — they were the only two sheets-using scripts missing the loader). MCP server: lookup_citizen / search_world / get_neighborhood switched to hybrid+0.3 (legacy tools used default mode/threshold; wd-* tools shipped S183 already had this fix); get_council_member reads truesource_reference.json directly (was supermemory-only, returned empty on every district); get_roster handles truesource's `{asRoster: list[90]}` shape with team-variant key map (was walking dict expecting flat-list shape). MCP `load_dotenv` path corrected to canonical `/root/.config/godworld/.env`. All 3 acceptance gates pass: lookup_citizen Patricia Nolan returns POP-00729; get_council_member D4 returns Vega; queryLedger POP-00729 succeeds without shell-side env. MCP changes take effect on next Claude Code restart.

### Task 3.3: BUNDLE-C — validateEdition.js collision plague

- **Bundle:** G-W22 (95% false positives, last-name match too noisy)
- **Status:** [x] DONE S197 — C93 fixture: 99 critical → 0 critical (16 warnings, all real). Three fixes: (1) full-name-presence + single-vs-multiple-occurrence severity tier across checkCouncilNames / checkCivicOfficeNames / checkPlayerFirstNames; (2) removed cycle-related ENGINE_TERMS patterns per S146 newsroom reversal (70 of 77 false positives gone); (3) Mayor regex Deputy/Vice/Acting/Former lookbehind + "Member"/"Deputy" added to skipWords. Acceptance ≤10 critical met decisively (0).

### Task 3.4: BUNDLE-D — assembleDecisions.js build

- **Bundle:** G-R14 (15-min hand-assembly per cycle, ~120 LOC build)
- **Status:** [x] DONE S197 — `scripts/assembleDecisions.js` shipped (~210 LOC, larger than estimate due to attribution + tie-break heuristics). C93 dry-run primary-voice picks all 6 match manual reference. /city-hall Step 6 collapses from 15-min hand-assembly to single bash command.

### Task 3.5: BUNDLE-E — PDF respects editorialFlag + 3-strike abort

- **Bundle:** G-PR12, G-PR15
- **Status:** [ ] not started

### Task 3.6: BUNDLE-F — buildCitizenCards.js 401 + retry-on-401 anti-pattern

- **Bundle:** G-P24
- **Status:** [ ] not started

### Task 3.7: BUNDLE-G — gradeEdition.js + gradeHistory.js rebuild

- **Bundle:** G-P14, G-P15, G-P16, G-P17, G-P18 (BUNDLE-C from post-publish log)
- **Status:** [ ] not started

### Task 3.8: BUNDLE-H — postRunFiling.js manifest + saveToDrive photo upload

- **Bundle:** G-P22, G-PR18
- **Status:** [ ] not started

### Task 3.9: Mark Wave 3 gap statuses

- **Steps:** For each bundled gap: change `Status:` to `Status: WAVE 3 HANDOFF S<n> — BUNDLE-<X>`
- **Status:** [ ] not started

---

## Wave 4 — Architectural design (research-build, plan files)

### Task 4.1: Vote-trigger mechanism plan

- **Files:**
  - `docs/plans/2026-05-XX-vote-trigger-mechanism.md` — create
- **Bundle:** G-R11 (Transit Hub vote scheduled but didn't fire — needs /council-vote skill OR /city-hall-prep route-to-9 fix)
- **Status:** [ ] not started

### Task 4.2: /run-cycle observation-surface plan

- **Files:**
  - `docs/plans/2026-05-XX-run-cycle-gap-log-surface.md` — create
- **Bundle:** Meta-gap (engine has no quality observation surface; engine-sheet stripped persona doesn't gap-log)
- **Status:** [ ] not started

### Task 4.3: ROLLOUT triage cadence plan

- **Files:**
  - `docs/plans/2026-05-XX-rollout-triage-cadence.md` — create
- **Bundle:** G-W16 meta-pattern (HIGHs sit on shelf and compound; cycles-on-shelf counter, auto-promotion after N cycles)
- **Status:** [ ] not started

### Task 4.4: Mark Wave 4 gap statuses

- **Steps:** For G-R11, G-W16: change `Status:` to `Status: WAVE 4 DESIGN S<n> — <plan path>`
- **Status:** [ ] not started

---

## Wave 5 — FLUX research (research-build)

### Task 5.1: FLUX text-suppression ceiling research note

- **Files:**
  - `docs/RESEARCH.md` — modify
- **Bundle:** G-PR10, G-PR11, G-PR14
- **Steps:** Log findings on OCR post-check (Tesseract / Vision API), prompt-rewrite-on-retry, ControlNet variants, alternate models with stronger negative-prompt adherence
- **Status:** [ ] not started

### Task 5.2: Mark Wave 5 gap statuses

- **Steps:** For G-PR10, G-PR11, G-PR14: change `Status:` to `Status: WAVE 5 RESEARCH S<n>`
- **Status:** [ ] not started

---

## LOW-severity gaps not in any wave

~30 LOW gaps remain unwaved. These are cosmetic/doc-currency items. Triage approach: opportunistic close during related work, not a dedicated wave. Each LOW gap's `Status:` stays `logged` until naturally addressed.

---

## Open questions

- [ ] Wave 4 plan dates: write all three plans in same session, or stagger? (Affects whether the same date prefix works.)

---

## Changelog

- 2026-05-03 — Initial draft (S197). Five-wave triage frame across 115 C93 gaps. Approved structure-first by Mike before write.
