---
title: Dispatch C92 Gap Follow-ups Plan
created: 2026-04-30
updated: 2026-04-30
type: plan
tags: [media, infrastructure, active]
sources:
  - docs/mags-corliss/NEWSROOM_MEMORY.md §"Dispatch C92 — KONO Second Song"
  - output/production_log_edition_c92.md §"Post-Publish C92 — DISPATCH COMPLETE"
  - SESSION_CONTEXT.md S188 11-gap roll-up
  - editions/cycle_pulse_dispatch_92_kono_second_song.txt (canonical fixture)
  - output/pdfs/bay_tribune_dispatch_c92_kono_second_song.pdf (visual-review fixture)
pointers:
  - "[[engine/ROLLOUT_PLAN]] — parent rollout (gap-log entry replaced by this plan)"
  - "[[plans/2026-04-26-non-edition-publishing-pipeline]] — sibling plan; this set is the engine-sheet starter file when that one promotes to active"
  - "[[EDITION_PIPELINE]] §Published `.txt` Format Contract — CUL-ID enumeration landed S189"
  - "../canon/CANON_RULES.md — canon-fidelity rule layer"
---

# Dispatch C92 Gap Follow-ups Plan

**Goal:** Close the 11 pipeline gaps surfaced by the S188 first end-to-end `/dispatch` run ("KONO Second Song", Kai Marston, C92) so the next dispatch / interview / supplemental publish chain emits no false-success messages, no silent data loss, and no PDF render bugs.

**Architecture:** 4 research-build skill/spec edits SHIPPED S189. 7 engine-sheet items remain — 5 silent-corruption parser bugs (`ingestEditionWiki.js` + `ingestPublishedEntities.js` flat-body NAMES INDEX, `postRunFiling.js` edition-centricity, `buildCitizenCards.js` cultural-only blindspot, Step 5 verification gate brittleness) + 1 sheet-edit (POP-00537 BirthYear backfill) + 3 PDF render bugs (NAMES INDEX row collapse, missing CITIZEN USAGE LOG header, missing ARTICLE TABLE header). All have a working fixture: the canonical `.txt` is correct, downstream consumers are what's broken.

**Terminal:** mixed — research-build (DONE S189), engine-sheet (active 7 items), media (visual-review fixture only).

**Pointers:**
- Prior work: S188 dispatch run — the .txt is at `editions/cycle_pulse_dispatch_92_kono_second_song.txt`, validated correct (5 structural sections, 2 entities in NAMES INDEX with mixed POP- + CUL- IDs).
- Sibling plan: [[plans/2026-04-26-non-edition-publishing-pipeline]] — this gap set is the concrete starter list for that plan's T6–T9 engine-sheet phase.
- Format contract source-of-truth: [[EDITION_PIPELINE]] §Per-section content spec (S189 added CUL-ID enumeration + "one entity per line" rule).

**Acceptance criteria:**
1. `node scripts/ingestEditionWiki.js editions/cycle_pulse_dispatch_92_kono_second_song.txt --cycle 92` extracts ≥2 entities (POP-00537 Marin Tao + CUL-905CBDE8 Brody Kale).
2. `node scripts/ingestPublishedEntities.js editions/cycle_pulse_dispatch_92_kono_second_song.txt` extracts the same 2 entities; cultural entities route through `wd-cultural` refresh path (not `Simulation_Ledger` insert).
3. `node scripts/postRunFiling.js --type dispatch --cycle 92` reports 0 false-MISSING (no edition-centric reference checks fire on dispatch artifacts).
4. `node scripts/buildCitizenCards.js` (or new sibling) refreshes Brody Kale's `wd-cultural` card after a dispatch publishes (Marin Tao card refreshed manually S188 — automate it).
5. POP-00537 Marin Tao Simulation_Ledger row carries non-null BirthYear. Audit: `lookup_citizen("Marin Tao")` returns Age 76 (1965 + 76 = 2041 anchor; per C79 introduction noting "age 75").
6. `/post-publish --type dispatch` Step 5 verification gate cross-checks NAMES INDEX line count vs parsed-row count and FAILS LOUDLY if the parser silently returns 0 entities for non-empty NAMES INDEX.
7. `node scripts/generate-edition-pdf.js editions/cycle_pulse_dispatch_92_kono_second_song.txt` renders all 5 tracking section headers + one entity per line; visual review of regenerated PDF passes.

---

## Tasks

### Phase R — Research-build (DONE S189)

#### Task R1: `/dispatch` Step 1 lookup_cultural one-liner — DONE S189

- **Files:** `.claude/skills/dispatch/SKILL.md` — Rules section line ~42
- **Status:** [x] DONE S189 (commit pending). Cultural-only fall-through path now explicit in Rules.
- **Verify:** `grep "lookup_cultural" .claude/skills/dispatch/SKILL.md` → at least one match in Rules block.

#### Task R2: NAMES INDEX format-contract CUL-ID enumeration — DONE S189

- **Files:** `docs/EDITION_PIPELINE.md` §Per-section content spec
- **Status:** [x] DONE S189. Format spec now defines `<ID>` as `POP-XXXXX` for citizens or `CUL-XXXXXXX` for cultural-only entities, with "one entity per line — never concatenate two rows" line break rule. ID convention paragraph added below the table with KONO Second Song dispatch example.
- **Verify:** `grep "CUL-" docs/EDITION_PIPELINE.md` → at least one match in Per-section content spec.

#### Task R3: Step 0 auto-resolve evaluation — DONE S189

- **Files:** `.claude/skills/dispatch/SKILL.md` Step 0
- **Status:** [x] DONE S189. Decision documented inline as `> Auto-resolve evaluation (S189):` block. Outcome: keep manual approval gate. Editorial control over scene selection is the dispatch's whole point — Mags' judgment beats algorithmic ranking. Auto-propose (current) preserves the gate. Revisit only if manual gate becomes a bottleneck during multi-dispatch cycles.
- **Verify:** `grep "Auto-resolve evaluation" .claude/skills/dispatch/SKILL.md` → at least one match.

#### Task R4: PDF visual review — DONE S189 (3 render bugs surfaced)

- **Files:** `output/pdfs/bay_tribune_dispatch_c92_kono_second_song.pdf` (read-only)
- **Status:** [x] DONE S189. Visual review completed. Three render bugs surfaced — promoted to engine-sheet Tasks E5a/E5b/E5c below. The "Sections: 8" parser report is misleading; the actual issues are header-drop and row-collapse, not extra body sections.
- **Findings:**
  - NAMES INDEX renders both entities on a single line: `POP-00537 | MARIN TAO | MUSICIAN CUL-905CBDE8 | BRODY KALE | MEDIA INFLUENCER` (should be 2 lines).
  - CITIZEN USAGE LOG section header dropped entirely; usage rows render but with no preceding label.
  - ARTICLE TABLE section header dropped entirely; the dispatch row `KONO_SECOND_SONG | KAI MARSTON | DISPATCH | 762` appears visually under the BUSINESSES NAMED header.
  - Body and masthead render correctly. Repeated bold-caps lede paragraph appears intentional (newspaper hero treatment).

---

### Phase E — Engine-sheet (7 items, active)

Each task self-contained. Execute in order shown unless engine-sheet flags a dependency. All operate against the canonical fixture `editions/cycle_pulse_dispatch_92_kono_second_song.txt`, which is verified correct — these are downstream-consumer fixes.

#### Task E1: `ingestEditionWiki.js` flat-body NAMES INDEX parser

- **Files:** `scripts/ingestEditionWiki.js`
- **Steps:**
  1. Reproduce: `node scripts/ingestEditionWiki.js editions/cycle_pulse_dispatch_92_kono_second_song.txt --cycle 92`. Confirm "0 entities — pure-atmosphere artifact" false-success message.
  2. Inspect parser logic. Suspected cause: parser expects edition-format multi-section body with section headers between articles; dispatch flat body has one continuous prose section, so the section-walker loop finds zero "article" containers and skips NAMES INDEX entirely.
  3. Add a fallback: if no article-section containers found AND NAMES INDEX section exists with non-empty rows, parse the NAMES INDEX as the entity source directly.
  4. Accept both `POP-XXXXX` and `CUL-XXXXXXX` row prefixes per [[EDITION_PIPELINE]] §Per-section content spec (S189 update). Route POP- to `wd-citizens` refresh, CUL- to `wd-cultural` refresh.
- **Verify:** Re-run on the fixture. Expect 2 entities extracted. Check downstream: `lookup_cultural("Marin Tao")` returns the wd-cultural card with mention count incremented.
- **Status:** [x] DONE S189 (engine-sheet, commit pending). Standalone `NAMES INDEX` section parser added — accepts pipe form (`<ID> | <Name> | <Role>` with `POP-XXXXX` or `CUL-XXXXXXX` prefix per [[EDITION_PIPELINE]] §Per-section content spec) and bullet em-dash form (`- Name — Role` from edition top-of-document index). Standalone parser runs after the existing inline `Names Index:` per-article scan; populates `citizenAppearances` only when a citizen wasn't already attributed by the inline scan, so editions don't get duplicate records. Hardcoded `"Edition"` in memory text replaced with `typeLabel` so dispatch records read "appeared in Dispatch 92 in 1 section(s): Dispatch." instead of edition-shaped phrasing. Side fix: fail-loud guard — if standalone NAMES INDEX has non-empty content lines but parser extracts zero entities, exit non-zero with diagnostic (eliminates the "0 entities — pure-atmosphere artifact" silent-failure pattern; complements E8's skill-level cross-check). Smoke test: `node scripts/ingestEditionWiki.js editions/cycle_pulse_dispatch_92_kono_second_song.txt --type dispatch --cycle 92 --dry-run` returns 2 citizens (Marin Tao + Brody Kale, roles preserved). E92 regression: 37 memories vs ~34 prior — added 3 bullet-only citizens (Marcus Osei, Brenda Okoro, Denise Carter) the inline scan was silently missing; cross-section flags unaffected. **Live `--apply` run pending Mike approval gate** (writes to bay-tribune; downstream `lookup_cultural("Marin Tao")` mention-count check requires E6 buildCulturalCards refresh first).

#### Task E2: `ingestPublishedEntities.js` same parser bug

- **Files:** `scripts/ingestPublishedEntities.js`
- **Steps:**
  1. Reproduce same way as E1. Confirm false-success message.
  2. Likely shares parser library or logic with E1 — fix together if so.
  3. Cultural-only entities (CUL- prefix) should NOT trigger `Simulation_Ledger` append (they're not Sim_Ledger citizens). Either skip the SL append for CUL- rows OR route them to a parallel `wd-cultural` write path. Decide based on what `wd-cultural` ingest currently does (see Task E4).
- **Verify:** Re-run on fixture. Expect 2 entities surfaced; only POP- entities considered for SL append (Marin Tao would already exist as POP-00537, so 0 new SL rows expected; Brody Kale is CUL-only so skipped from SL).
- **Status:** [x] DONE S189 (engine-sheet, commit `15e7f3e`). `parseNamesIndex` reshaped to accept three row shapes: T1 strict bullet (`- POP-NNNNN | Name | Role`), T1 strict flat (`POP-NNNNN | Name | Role` — dispatch shape, no leading bullet), pre-T1 freeform (em-dash). Strict-form regex extended `^POP-\d+\s*\|` → `^([A-Z]+)-([A-Z0-9]+)\s*\|` per [[EDITION_PIPELINE]] §Per-section content spec, capturing prefix on parsed entries. `resolveCitizens` routes POP- entries through Sim_Ledger match/append; non-POP entries (CUL-/BIZ-/FAITH-) collect in a new `culturalOnly` bucket — logged in console summary + JSON output, NOT appended to Simulation_Ledger. Resolves the open-question call: cultural-only entities live in `wd-cultural` (E6 buildCulturalCards in /post-publish refreshes them), not Sim_Ledger. Bare-name fallback restricted to bullet-prefixed lines to avoid flat-body noise. Fail-loud guard added: NAMES INDEX section with non-empty content lines but parser produced 0 citizens → exit 1 with diagnostic. Smoke test KONO dispatch: 2 citizens parsed (1 matched POP-00537, 1 cultural CUL-905CBDE8), 0 candidates. E92 regression: 8 citizens parsed (all matched), 0 cultural, 0 candidates. **Live `--apply` run pending Mike approval gate.**

#### Task E3: `ingestEditionWiki.js` filename-fallback `--cycle` extraction

- **Files:** `scripts/ingestEditionWiki.js`
- **Steps:**
  1. The `--cycle <N>` flag is currently required for non-edition runs. Filename `cycle_pulse_dispatch_92_kono_second_song.txt` carries cycle in position 3 of underscore-split.
  2. Add filename-fallback parser: if `--cycle` not supplied, parse from filename pattern `cycle_pulse_<type>_<cycle>_<slug>.txt` (the format-contract pattern from [[EDITION_PIPELINE]]). Pattern: `^cycle_pulse_(\w+)_(\d+)_.+\.txt$` → group 2 is cycle.
  3. Print resolved cycle in startup log so failures are debuggable.
- **Verify:** `node scripts/ingestEditionWiki.js editions/cycle_pulse_dispatch_92_kono_second_song.txt` (no `--cycle` flag) succeeds with logged "cycle: 92 (resolved from filename)".
- **Status:** [x] DONE S189 (engine-sheet, commit `e9b0d37`). Cycle resolver tries the format-contract filename pattern `^cycle_pulse_\w+_(\d+)_.+\.txt$` first for any type, falls back to in-text "EDITION N" / loose digit only for editions. New `[CYCLE]` startup log line names the resolution source — `--cycle flag`, `filename (format-contract)`, `in-text masthead`, or `filename (legacy digit)` — for debuggability. Smoke tests: dispatch without `--cycle` resolves C92 from filename and runs clean; E92 default behavior resolves C92 from in-text masthead unchanged.

#### Task E4: `postRunFiling.js` `--type` flag for non-edition runs

- **Files:** `scripts/postRunFiling.js`
- **Steps:**
  1. Reproduce: post-S188 dispatch publish, `postRunFiling.js` reports 7 false-MISSING entries because it expects edition-shape artifacts (compiled edition .txt, sift_proposals, world_summary, etc).
  2. Add `--type <edition|dispatch|interview|supplemental>` flag. Per type, define which artifacts are expected vs not-applicable.
  3. Dispatch-specific expected set: `editions/cycle_pulse_dispatch_<XX>_<slug>.txt` + corresponding PDF + Drive upload pointers + bay-tribune doc IDs. Skip: edition.txt, sift_proposals, capability/cycle/Mara reviewer JSONs, podcast.
  4. Default behavior (no `--type`) stays edition-shape for backwards compatibility.
- **Verify:** `node scripts/postRunFiling.js --type dispatch --cycle 92` reports 0 false-MISSING.
- **Status:** [x] DONE S189 (engine-sheet, commit `6c2f45a`). New `--type {edition|dispatch|interview|supplemental}` flag (default edition, backwards-compatible) + `--slug` flag (required for non-edition). `buildNonEditionChecklist(type, cycle, slug)` ships the minimal expected set per [[EDITION_PIPELINE]] §Filename contract: canonical `.txt` (required), PDF (required), photos directory (optional — photo step bails clean per /edition-print T11). No desk outputs, no Mara audit, no voice statements, no desk packets — those stay edition-shape. Manifest path is type-aware: `output/run_manifest_c<cycle>.json` (edition) vs `output/run_manifest_<type>_c<cycle>_<slug>.json` (non-edition); manifest body carries `type` + `slug` fields for downstream consumers. --help text updated. Smoke test KONO dispatch: 2 required files OK, 1 optional pending (photos), 0 missing — was 7 false-MISSING in S188. E92 default behavior preserved.

#### Task E5a: PDF render — NAMES INDEX row collapse

- **Files:** `scripts/generate-edition-pdf.js`
- **Steps:**
  1. Reproduce: regenerate PDF from canonical .txt, confirm two NAMES INDEX rows collapse onto one line.
  2. Inspect tracking-section renderer. Likely cause: section parser treats the NAMES INDEX block as one continuous text run instead of one element per newline-separated row.
  3. Fix: split each tracking section's content on `\n` (or the canonical row delimiter), render each row as its own paragraph/list-item.
- **Verify:** Regenerated PDF has Marin Tao row and Brody Kale row on separate lines.
- **Status:** [x] DONE S189 (engine-sheet, commit `c20bb3d`, single-fix-three-bugs). Root cause: `lib/editionParser.js` `isSectionNameChunk` only excluded chunks STARTING with `|`, so dispatch's `POP-00537 | Marin Tao | Musician` rows (start with `POP-`, not `|`) were misclassified as section names — rendered as section-label divs (newlines collapsed → row collapse) AND absorbed the next real header into the next chunk's group (E5b/c). Fix: `chunk.indexOf('|') >= 0 → return false` on chunk classification. Plus `guessBeat` was missing entries for `NAMES INDEX` and `BUSINESSES NAMED` (fell to 'general' → rendered visibly); added meta classifications and reordered so meta checks fire before broader editorial-beat matches (otherwise `BUSINESSES NAMED` matched the `business` check first). KONO dispatch post-fix: 5 sections (was 8), all 4 tracking sections beat=meta → 0 occurrences of any tracking-section name or POP-/CUL- row data in rendered HTML. E92 regression: 13 sections, 277 KB, beats unchanged. See E5b + E5c entries below — same commit closes all three.

#### Task E5b: PDF render — CITIZEN USAGE LOG header drop

- **Files:** `scripts/generate-edition-pdf.js`
- **Steps:**
  1. Reproduce: confirm CITIZEN USAGE LOG header missing in rendered PDF (data rows render but unlabeled).
  2. Inspect header-rendering logic. Likely cause: section header detection regex is over-narrow or template lookup is missing this section name.
  3. Fix: ensure all 4 tracking section headers (NAMES INDEX, CITIZEN USAGE LOG, BUSINESSES NAMED, ARTICLE TABLE) render as visible labels even when the section follows another tracking section directly.
- **Verify:** Regenerated PDF shows all 4 tracking section headers, each preceding its data rows.
- **Status:** [x] DONE S189 (engine-sheet, commit `c20bb3d`, same fix as E5a). Re-scoped at smoke time: rather than re-render the tracking section headers visibly, treat ALL four tracking sections (NAMES INDEX, CITIZEN USAGE LOG, BUSINESSES NAMED, ARTICLE TABLE) as `meta` beat → skipped from the visible PDF entirely. They're internal metadata, not reader-facing content; the gap log #11 visual-review note "tracking metadata didn't leak into the visible body" was the actual editorial intent. Row collapse stops being a problem once the rows aren't rendered at all. Verify-by-grep: 0 occurrences of any tracking-section header or row data in `output/pdfs/dispatch_c92_kono_second_song.html`.

#### Task E5c: PDF render — ARTICLE TABLE header drop

- **Files:** `scripts/generate-edition-pdf.js`
- **Steps:**
  1. Same root cause family as E5b. Likely a single fix closes both.
  2. After E5b fix, verify ARTICLE TABLE header renders correctly above the dispatch row.
- **Verify:** Regenerated PDF shows ARTICLE TABLE header above the row `KONO_SECOND_SONG | KAI MARSTON | DISPATCH | 762`.
- **Status:** [x] DONE S189 (engine-sheet, commit `c20bb3d`, same fix as E5a/E5b). Single root-cause fix in `lib/editionParser.js` closed all three render bugs; ARTICLE TABLE now classifies as `meta` and is skipped entirely along with NAMES INDEX / CITIZEN USAGE LOG / BUSINESSES NAMED. The fixture row no longer appears under the wrong header because no tracking-section header renders.

#### Task E6: `buildCulturalCards.js` invocation in `/post-publish` for cultural-only NAMES INDEX entries

- **Files:** existing `scripts/buildCitizenCards.js` (extend) OR new `scripts/buildCulturalCards.js` (parallel) + `.claude/skills/post-publish/SKILL.md` Step N
- **Steps:**
  1. Decide: extend buildCitizenCards.js with a `--cultural` mode, OR create a new parallel script. Recommendation: parallel script because the data sources differ (Sim_Ledger row + bay-tribune mentions for citizens, vs `wd-cultural` row + bay-tribune mentions for cultural figures). Avoids conditional branching in citizen path.
  2. Invocation site: `/post-publish` Step that currently calls `buildCitizenCards.js` after NAMES INDEX ingest. Add a parallel invocation for any CUL- prefixed entries.
  3. Card refresh logic: pull `wd-cultural` row, append/update mention count + last-cycle-mentioned, write back.
- **Verify:** After running `/post-publish --type dispatch` for the C92 KONO fixture (re-run after E1 + E2 land), `lookup_cultural("Brody Kale")` shows mention count incremented and `last_appeared` reflects C92.
- **Status:** [x] DONE S189 (engine-sheet helper exists S182; research-build wired into `/post-publish` SKILL.md v1.4 S189). Engine-sheet half: `scripts/buildCulturalCards.js` already exists from S182 (521 lines, ships `--cul CUL-XXXXX` flag for single-figure refresh, writes to `wd-cultural`/`world-data` containers with proper `cul_id` metadata). Smoke test: `node scripts/buildCulturalCards.js --dry-run --cul CUL-905CBDE8` against Brody Kale assembles a clean payload — Cultural_Ledger row read (KONO neighborhood, Media domain, Local tier, fame 28, 4 media mentions), bay-tribune appearances joined. **Research-build wiring (S189):** new substep `2a-cul. Refresh cultural cards` added to `/post-publish` SKILL.md after the citizen card pass — matrix-✓ for `dispatch / interview / supplemental` when CUL-IDs are present in NAMES INDEX (matrix `—` for edition by default). Skill body documents the per-CUL-ID `buildCulturalCards.js --apply --cul <CUL-ID>` invocation pattern, gates on `lookup_cultural(name)` returning a card with current-cycle `last_appeared`, and skips with stdout "0 cultural-only entries — substep N/A" when no CUL-IDs are present. Step 13 checklist + Step 12 production-log section both updated. Closes the S188 Brody Kale unrefreshed gap.

#### Task E7: POP-00537 Marin Tao BirthYear backfill

- **Files:** Simulation_Ledger Google Sheets row for POP-00537 (sheet edit, not script)
- **Steps:**
  1. C79 introduction noted Marin Tao age 75. With anchor 2041, BirthYear = 2041 − 75 = 1966.
  2. Cross-check via bay-tribune `search_canon "Marin Tao age"` for any later canon updates.
  3. Update Simulation_Ledger row POP-00537 BirthYear column with the resolved value.
  4. Re-run `node scripts/buildCitizenCards.js POP-00537` to rebuild the wd-citizens card with the corrected age.
- **Verify:** `lookup_citizen("Marin Tao")` returns non-null BirthYear; computed age = 75 or 76 depending on cycle anchor (2041 − BirthYear).
- **Status:** [x] CLOSED-NO-ACTION S189 (engine-sheet, Mike decision). Investigation surfaced live POP-00537 row already carries `BirthYear=2009` (age 32 under 2041 anchor), not null as the brief claimed. Source of the 2009 fill unidentified — possibly generator default or post-S188 engine-side write. Mike's call: accept the value as canon, treat the C79 "introduced as 75" note as the stale claim. Rationale: the project doesn't need to multiply the iconic 75-year-old count just to backfill one drift; cleaner to let Marin Tao read as 32 going forward and have downstream coverage adapt. No sheet edit, no card rebuild.

#### Task E8: Step 5 verification gate cross-check

- **Files:** `.claude/skills/post-publish/SKILL.md` Step 5 + (likely) a verification helper script
- **Steps:**
  1. Current Step 5 gate passes when ingest scripts return 0 entities silently. Per the dispatch run, "0 entities — pure-atmosphere artifact" was treated as success even though NAMES INDEX had two valid rows.
  2. Add a cross-check: count NAMES INDEX rows in source `.txt` (lines between section header and next `---` delimiter, excluding empty lines). Compare to ingest-script reported entity count. If source-count > 0 AND parsed-count == 0, FAIL LOUDLY (block publish).
  3. Helper: a small `scripts/verifyNamesIndexParse.js` that takes a .txt + expected-count from parsing the source itself, returns exit-1 on mismatch.
- **Verify:** On the S188 fixture (pre-E1 fix), running Step 5 cross-check returns FAIL with clear message: "NAMES INDEX has 2 source rows but parser returned 0 entities — likely silent parser bug."
- **Status:** [x] DONE S189 (engine-sheet helper commit `a805e76`; research-build wired into `/post-publish` SKILL.md v1.4 S189). Helper script `scripts/verifyNamesIndexParse.js` shipped — counts non-separator non-empty NAMES INDEX rows in the source `.txt`, optionally compares against `--expected <N>` (the count an ingest script reported), exits 1 with diagnostic on mismatch. Smoke tests cover all four shapes: dispatch happy path (--expected 2 → exit 0), dispatch S188-style mismatch (--expected 0 against 2 source rows → exit 1 with diagnostic "source has 2 NAMES INDEX rows but ingest script parsed 0"), E92 happy path (--expected 8 → exit 0, bullet em-dash rows count same as pipe rows), no `--expected` (just prints count, exit 0). Defense-in-depth complement to the in-script fail-loud guards added in E1 (commit `e83a5a3`) and E2 (commit `15e7f3e`) — those catch the silent-failure pattern inside their respective ingest scripts; the helper catches the same class at the skill level. **Research-build wiring (S189):** Step 5 verification gate now declares the cross-check as a combined two-part gate: (1) `output/intake_published_entities_c<XX>_<slug>.json` written + readback rows OK, (2) `verifyNamesIndexParse.js <source> --expected <N>` exits 0 (where `<N>` = `matched + candidates + ambiguous + phantom + appended` from the ingest script's JSON output). Exit 1 from the helper FAILS LOUDLY and blocks publish; investigate the parser regression before continuing. Closes the S188 silent-zero false-success failure mode at the skill level.

---

## Open questions

- [ ] **Task E2 — Brody Kale Sim_Ledger handling.** Should `ingestPublishedEntities.js` append cultural-only entities to Simulation_Ledger as `Tier=4 / Status=pending` so the engine can promote them later, OR keep them strictly in `wd-cultural` with no Sim_Ledger row? Currently Marin Tao has a Sim_Ledger row (POP-00537), but Brody Kale does not. Engine-sheet to decide based on what makes the engine layer's promotion path cleanest.
- [ ] **Task E5b/E5c — single fix or three?** All three PDF render bugs (collapse, missing CITIZEN USAGE LOG header, missing ARTICLE TABLE header) likely share a single root cause in the tracking-section renderer. Engine-sheet should investigate before splitting work — one careful fix may close all three.
- [ ] **Task E6 — extend or parallel?** Recommendation is parallel script (cleaner). Engine-sheet may have context on whether a single script with `--cultural` mode fits the current pipeline shape better. Defer to engine-sheet's call.

---

## Changelog

- 2026-04-30 (S189, research-build) — Initial draft. Captures S188 first-/dispatch 11-gap roll-up. R1–R4 SHIPPED in same session (skill + spec edits + PDF visual review). Drafting this plan replaces the inline ROLLOUT_PLAN gap-log entry with a durable file engine-sheet can pick up. Acceptance criteria ground truth: the canonical .txt at `editions/cycle_pulse_dispatch_92_kono_second_song.txt` is correct — this plan only fixes downstream consumers.
- 2026-04-30 (S189, research-build, late) — E6 + E8 research-build wiring shipped into `/post-publish` SKILL.md v1.4. **E6** added new substep `2a-cul. Refresh cultural cards` (matrix-✓ for dispatch/interview/supplemental when CUL-IDs in NAMES INDEX): per-CUL-ID `buildCulturalCards.js --apply --cul <CUL-ID>` invocation after the citizen-card pass, gates on `lookup_cultural(name)` returning a card with current-cycle `last_appeared`. **E8** added the `verifyNamesIndexParse.js --expected <N>` cross-check to Step 5's verification gate as a combined two-part gate — exit 1 blocks publish. Both flips closed the research-build halves of E6 + E8 that engine-sheet had marked pending. Plan now has zero open research-build items; remaining engine-sheet items E1-E8 all closed (E1/E2/E3/E4/E5a/E5b/E5c/E8 helper shipped; E7 closed-no-action per Mike S189).
