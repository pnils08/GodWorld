---
title: Non-Edition Publishing Pipeline Plan
created: 2026-04-26
updated: 2026-04-26
type: plan
tags: [media, infrastructure, active]
sources:
  - docs/engine/ROLLOUT_PLAN.md §Edition Post-Publish — "NON-EDITION PUBLISHING PIPELINE: bundled script-shape gaps"
  - S178 first /interview run findings (Mayor Santana on OARI, C92)
  - .claude/skills/interview/SKILL.md S179 Step 8 rewrite (DONE)
  - editions/cycle_pulse_edition_92.txt — masthead + section pattern reference
  - "Supermemory mags doc bm8sccZCRzdCsX6VWAZ2iS — full S179 architecture + grill outcomes (the WHY behind every decision in this plan; fetch when judgment-call context needed)"
pointers:
  - "[[engine/ROLLOUT_PLAN]] — parent rollout"
  - "[[EDITION_PIPELINE]] — workflow doc the .txt schema extends"
  - "[[SCHEMA]] — doc conventions"
  - "[[index]] — added in same commit"
---

# Non-Edition Publishing Pipeline Plan

**Goal:** Build a unified publish pipeline so interview, supplemental, and dispatch artifacts move through the same `/post-publish` and `/edition-print` paths as compiled editions, with no manual workarounds and no per-type forks.

**Architecture:** Format contract is the keystone. All published artifacts land as `editions/cycle_pulse_<type>_<cycle>_<slug>.txt` carrying the Bay Tribune masthead and the same structural sections — header block, body, Names Index, Citizen Usage Log, Article Table — differing only by type label. The `.txt` is canon; reporter `.md` is intermediate. Every type runs through one `/post-publish --type` skill with deterministic per-substep verification gates and one `/edition-print --type` flag. Existing scripts get minimal `--type` + `--cycle` flags for path/regex edge cases; their internal parsing is unchanged because every type emits the standardized shape.

**Terminal:** Three-way split.
- **research-build** — all skill `.md` edits: T1 (schema doc), T2 (compile-to-`.txt` steps in authoring skills), T3 (`/post-publish` restructure), T4 (`/edition-print` flag), T5 (call-site updates).
- **engine-sheet** — all script `.js` edits: T6 (`ingestEdition.js`), T7 (`ingestEditionWiki.js`), T8 (`rateEditionCoverage.js`), T9 (print scripts).
- **media** — T10 validation run only (executes the pipeline against the C92 Mayor interview fixture; reports back).

**Pointers:**
- Prior work: S179 `/interview` Step 8 rewrite to `/save-to-bay-tribune` direct (`.claude/skills/interview/SKILL.md` v1.1)
- C93 observation task gating T8: `docs/engine/ROLLOUT_PLAN.md` §Edition Post-Publish — "C93 OBSERVATION TASK"
- Format reference: `editions/cycle_pulse_edition_92.txt:1-7` (masthead pattern)
- Affected scripts: `scripts/ingestEdition.js`, `scripts/ingestEditionWiki.js`, `scripts/rateEditionCoverage.js`, `scripts/generate-edition-photos.js`, `scripts/photoQA.js`, `scripts/generate-edition-pdf.js`, `scripts/saveToDrive.js`
- Affected skills: `.claude/skills/post-publish/SKILL.md`, `.claude/skills/edition-print/SKILL.md`, `.claude/skills/interview/SKILL.md`, `.claude/skills/dispatch/SKILL.md`, `.claude/skills/write-supplemental/SKILL.md`

**Acceptance criteria:**
1. The C92 Mayor Santana interview re-runs end-to-end through `/post-publish --type interview` and `/edition-print --type interview` with no manual workarounds — `.txt` artifact lands in `editions/`, bay-tribune ingest doc IDs returned, citizen cards refreshed, PDF rendered, Drive uploaded.
2. `/post-publish` SKILL.md grades each substep against a deterministic verification gate; any skipped substep requires an explicit `--skip-<name>` flag, not silent omission.
3. Names Index and Citizen Usage Log appear as separate sections AFTER the article body in every type's `.txt` — never inline in the article body (S172 metadata-leak constraint encoded as format law).
4. `ingestEditionWiki.js` parses the standardized sections from interview/supplemental/dispatch `.txt` without code changes beyond the `--type` flag — proves the format contract works.
5. Coverage ratings path stays gated on the C93 observation task — built only if voice agents fail to pick up interview canon at C93 city-hall.

---

## Tasks

### Task 1: Define non-edition `.txt` schema — DONE S179

- **Files:**
  - `docs/EDITION_PIPELINE.md` — modified (new section "Published `.txt` Format Contract" inserted between Master Chain and /write-edition Internal Reviewer Chain)
- **Outcome:** Schema section pre-drafted via `/grill-me` discovery in S179 research-build session. Mike resolved 11 questions across two grill rounds (`.md` lifecycle, masthead pattern, slug discipline, section uniformity, businesses-as-engine-canon trigger, skip logic). New finding promoted to ROLLOUT: standing intake path for citizens + businesses from published artifacts to engine sheets (engine-sheet tagged, MEDIUM-HIGH).
- **Verify:** `grep -n "Published .txt Format Contract" docs/EDITION_PIPELINE.md` → returns one match (line ~50)
- **Status:** [x] DONE — S179, research-build

### Task 2: Add compile-to-`.txt` step in authoring skills

- **Files:**
  - `.claude/skills/interview/SKILL.md` — modify (add Step 4.5)
  - `.claude/skills/dispatch/SKILL.md` — modify (analogous step)
  - `.claude/skills/write-supplemental/SKILL.md` — modify (analogous step)
- **Steps:**
  1. After the article-write step in each skill, add a "Compile to `.txt`" step that wraps the reporter `.md` body in the masthead + structural sections defined in T1.
  2. Names Index, Citizen Usage Log, Article Table are populated from existing tracking artifacts (citizens cited, reporter, cycle, type); never from the article body.
  3. Output path: `editions/cycle_pulse_<type>_<cycle>_<slug>.txt`.
- **Verify:** Run `/interview voice santana` (or replay against C92 fixture); confirm `editions/cycle_pulse_interview_92_santana.txt` exists and matches T1 schema by `grep`-checking section headers.
- **Status:** [x] DONE — S180, research-build. SKILL edits landed in interview (v1.3), dispatch (v1.1), write-supplemental (v1.1). Step 4.5 / 3.4 / 4.5 added with explicit T1 schema reference + `editions/cycle_pulse_<type>_<cycle>_<slug>.txt` path convention. Runtime fixture replay deferred to T10 (media validation).

### Task 3: Restructure `/post-publish` with `--type` flag + verification gates

- **Files:**
  - `.claude/skills/post-publish/SKILL.md` — modify
- **Steps:**
  1. Add `--type` flag accepting `{edition, interview, supplemental, dispatch}`. Default: `edition`.
  2. Each substep (article ingest, wiki ingest, citizen-card refresh, coverage ratings, newsroom-memory update, production-log append, Discord refresh) declares a verification gate: file exists / doc ID returned / sheet row written.
  3. Skipped substeps require explicit `--skip-<name>` flag; silent omission is a skill failure.
  4. Coverage-ratings substep checks the C93 observation task pointer and skips by default for non-edition types.
- **Verify:** `grep -n "verification gate" .claude/skills/post-publish/SKILL.md` → at least 6 matches (one per substep)
- **Status:** [x] DONE — S180, research-build. v1.1 shipped. 16 verification gates declared. Per-type substep matrix encodes default skips; `--skip-<name>` required only for matrix-✓ opt-outs. Coverage ratings (Step 4) explicitly C93-gated for non-edition.

### Task 4: Add `--type` flag to `/edition-print`

- **Files:**
  - `.claude/skills/edition-print/SKILL.md` — modify
- **Steps:**
  1. Add `--type` flag. Default: `edition` (back-compat).
  2. Trigger lines updated: skill is invocable from `/interview`, `/dispatch`, `/write-supplemental` post-publish chain.
  3. Photo selection budget per type — edition keeps 5–8 (DJ four-file structure unchanged); interview/supplemental/dispatch take 1–3.
- **Verify:** `grep -n "type" .claude/skills/edition-print/SKILL.md` → flag documented in Usage section
- **Status:** [x] DONE — S180, research-build. v1.1 shipped. `--type` flag in Usage. Per-type photo budget table (1–3 for non-edition; 5–8 unchanged for edition). Skill triggerable from `/interview`, `/dispatch`, `/write-supplemental` plus the existing `/write-edition` chain.

### Task 5: Replace rolled-own Step 8 in authoring skills

- **Files:**
  - `.claude/skills/interview/SKILL.md` — modify (replaces S179 `/save-to-bay-tribune` direct invocations)
  - `.claude/skills/dispatch/SKILL.md` — modify
  - `.claude/skills/write-supplemental/SKILL.md` — modify
- **Steps:**
  1. Remove inline `/save-to-bay-tribune` invocations from each skill's post-publish step.
  2. Replace with single line: `Invoke /post-publish --type <type> --cycle XX --source editions/cycle_pulse_<type>_<cycle>_<slug>.txt`.
  3. Bump skill version + `updated:` date.
- **Verify:** No `save-to-bay-tribune` references remain in `.claude/skills/{interview,dispatch,write-supplemental}/SKILL.md`; each has one `/post-publish --type` invocation.
- **Status:** [x] DONE — S180, research-build. Bundled with T2 in the same edits. `grep -c "save-to-bay-tribune"` → 0 in all three. `grep -c "/post-publish --type"` → 2 each (one in the new step body, one in `/edition-print --type` parallel invocation). Step 8 (interview), Step 5 (dispatch), Step 5 (supplemental) collapsed to a single converging-pipeline block referencing the [[../post-publish/SKILL]] matrix.

### Task 6: `ingestEdition.js` — `--type` + `--cycle` flags

- **Files:**
  - `scripts/ingestEdition.js` — modify
- **Steps:**
  1. Add CLI flags: `--type {edition|interview|supplemental|dispatch}` (default `edition`), `--cycle N` (overrides regex extraction).
  2. When `--type` ≠ `edition`, skip the cycle-from-content fallback (would mistag canon).
  3. Metadata written to bay-tribune includes `type` field from the flag.
- **Verify:** `node scripts/ingestEdition.js editions/cycle_pulse_interview_92_santana.txt --type interview --cycle 92 --dry-run` → prints metadata block with `type: "interview"`, `cycle: 92`
- **Status:** [ ] not started

### Task 7: `ingestEditionWiki.js` — `--type` flag

- **Files:**
  - `scripts/ingestEditionWiki.js` — modify
- **Steps:**
  1. Add `--type` flag for metadata routing only — Names Index / Citizen Usage Log / Article Table parsing unchanged (relies on T1 contract).
  2. Per-entity wiki records tagged with `type` for retrieval filtering.
- **Verify:** `node scripts/ingestEditionWiki.js editions/cycle_pulse_interview_92_santana.txt --type interview --apply` → entity records ingested with `type: "interview"` tag; container search returns them filtered.
- **Status:** [ ] not started

### Task 8: `rateEditionCoverage.js` — `--type` flag, gated

- **Files:**
  - `scripts/rateEditionCoverage.js` — modify (gated on C93 observation outcome)
- **Steps:**
  1. Add `--type` flag.
  2. For non-edition types, write a separate row to `Edition_Coverage_Ratings` tagged by source-type, OR skip entirely if the C93 observation determines bay-tribune retrieval suffices.
  3. **Gating:** Don't build until C93 observation completes. If voice agents reference interview canon at C93 city-hall → drop this task. If they don't → build.
- **Verify:** Conditional on C93 outcome.
- **Status:** [ ] gated on C93 observation task

### Task 9: Print scripts — `--type` flags

- **Files:**
  - `scripts/generate-edition-photos.js` — modify
  - `scripts/photoQA.js` — modify
  - `scripts/generate-edition-pdf.js` — modify
  - `scripts/saveToDrive.js` — modify
- **Steps:**
  1. Each script accepts `--type` and resolves the input path via the standardized filename convention.
  2. Photo budget honors per-type limits from T4.
  3. PDF masthead pulls from the `.txt` header block (already standardized via T1).
  4. Drive folder routing: editions go to existing folder; interviews/supplementals/dispatches go to a non-edition subfolder (or same folder with type-prefixed filename — pick one in implementation).
- **Verify:** Each script runs against `editions/cycle_pulse_interview_92_santana.txt` with `--type interview` and produces expected output without error.
- **Status:** [ ] not started

### Task 10: Validation — re-run C92 Mayor interview through unified pipeline

- **Files:**
  - `editions/cycle_pulse_interview_92_santana.txt` — created (T2 output)
  - All downstream artifacts (PDF, Drive, bay-tribune docs)
- **Steps:**
  1. Replay the C92 Mayor interview content through the new pipeline as the test fixture (don't re-do the interview itself; reuse the existing `output/interviews/c92_santana_oari_transcript.md` + published article `output/reporters/carmen-delaine/articles/c92_interview_santana_oari.md`).
  2. Run `/post-publish --type interview --cycle 92 --source editions/cycle_pulse_interview_92_santana.txt` end-to-end.
  3. Run `/edition-print --type interview --cycle 92` end-to-end.
  4. Confirm: `.txt` matches T1 schema; bay-tribune doc IDs returned for article + transcript + per-entity wiki records; citizen cards refreshed; PDF rendered with Bay Tribune masthead; Drive upload returned file ID; production log updated.
  5. Compare against the S178 manual workaround run — same canon, no manual steps.
- **Verify:** All outputs present + production log shows zero manual workarounds.
- **Status:** [ ] not started

---

## Open questions

All resolved at draft time per S179 conversation:
- Skill consolidation vs. separate skills → consolidate via `--type` flag (Mike, S179).
- All outputs `.txt` with consistent naming → confirmed (Mike, S179).
- Bay Tribune masthead on every type → confirmed (Mike, S179).
- Wiki ingest path for interviews → solved by T1 format contract — interviews now emit Names Index + Citizen Usage Log natively, so `ingestEditionWiki.js` works without parser changes.
- Coverage ratings → gated on C93 observation; T8 conditional.

---

## Changelog

- 2026-04-26 — Initial draft (S179, research-build). Bug-cluster source: S178 first /interview run findings. Replaces three open ROLLOUT items (bundled non-edition pipeline + Step 8a/8b skill bug DONE-S179 + Step 8d coverage-ratings observation task) with one consolidated plan. Mike resolved skill-consolidation + format-contract questions at draft time per "consolidate where possible, all `.txt`, all Bay Tribune masthead, same structured approaches."
- 2026-04-26 — Terminal retag (S179, research-build). Three-way split corrected per Mike: research-build owns skill `.md` edits (T1–T5), engine-sheet owns script `.js` edits (T6–T9), media runs validation (T10). Earlier draft had collapsed engine-sheet into media — wrong; media doesn't build, that's The Bay Tribune editorial layer.
- 2026-04-26 — T1 schema DONE (S179, research-build). `/grill-me` round (Q1–Q11) surfaced: `.md` post-compile becomes frozen audit-trail, masthead drops month names → `Y<n>C<m>` format (cycle 92 = Y2C40), uniform 5-line masthead across all types, fifth structural section added (BUSINESSES NAMED) maps to Business_Ledger cols A–D, slug is canonical retrieval-token (immutable post-publish, replicated across filename + sift + MCP search + Mara + packets + production log + bay-tribune metadata), interview emits companion `.txt` (`type=interview-transcript`). NEW ROLLOUT ITEM (engine-sheet, MEDIUM-HIGH): "BUILD: Standing intake — published artifact → engine sheets for citizens + businesses" — closes /post-publish Step 5 "not wired" gap; precondition for non-edition types to actually trigger engine canon writes.
- 2026-04-26 — T2/T3/T4/T5 DONE (S180, research-build). All five skill `.md` edits landed in one session per Mike's "T2-T5" instruction. Sequence: T3 first (post-publish v1.1, type-aware, 16 verification gates, per-type matrix); T4 (edition-print v1.1, `--type` flag, per-type photo budget); T2+T5 bundled per skill (interview v1.3, dispatch v1.1, write-supplemental v1.1) — Compile-to-`.txt` step added, ingest substeps collapsed to `/post-publish --type` + `/edition-print --type` parallel invocation. Mike-confirmed call: Mara audits the `.txt`, not the `.md` — Step 5 (supp) / Step 5 (interview) Drive uploads now point at the standardized `.txt` paths. Phase 1 (research-build) of plan COMPLETE. Phase 2 (engine-sheet T6–T9 script edits) and Phase 3 (media T10 validation) remain.
