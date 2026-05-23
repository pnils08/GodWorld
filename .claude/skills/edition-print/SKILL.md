---
name: edition-print
description: Post-publish print pipeline — photos, PDF, Drive upload. Edition-only for now (S188 rebuild); non-edition types await T11 wiring.
version: "1.3"
updated: 2026-05-03
tags: [media, active]
effort: low
disable-model-invocation: true
argument-hint: "[--cycle XX]"
---

# /edition-print — Print Pipeline

## Usage

`/edition-print --type <type> --cycle <XX> --source <path>`

Flags:
- `--type {edition|interview|supplemental|dispatch}` — defaults to `edition` (back-compat).
- `--cycle <XX>` — engine cycle number.
- `--source <path>` — path to the published `.txt`. Defaults to `editions/cycle_pulse_<type>_<cycle>_<slug>.txt` for non-edition; `editions/cycle_pulse_edition_<cycle>.txt` for edition.

Triggerable from: `/write-edition` post-publish chain, `/interview`, `/dispatch`, `/write-supplemental`. The four authoring skills converge here for visual assets the same way they converge on `/post-publish` for canon ingest.

## The Principle

The artifact is published. The text is canon. This skill turns it into something you can hold — photos, a PDF, files on Drive.

**DJ Hartley** is the art director for this step. His identity (`.claude/agents/dj-hartley/IDENTITY.md`) defines how photos are conceived — what's worth shooting, the mood, the composition. His team (Arman Gutiérrez for portraits, Brianna Lee for community) handles assignments. DJ reads the `.txt` and produces art direction; the image generator executes it.

DJ four-file canon-fidelity structure (S175) is LOCKED — the print pipeline wires AROUND DJ; do not modify his agent files.

Runs in its own terminal. Does not touch the artifact text.

## Per-type photo budget

| Type | Photos | Why |
|------|--------|-----|
| edition | 5–8 | Multi-article, full visual layout — DJ's standard workflow |
| supplemental | 1–3 | Topic deep-dive, fewer scenes |
| interview | 1–3 | One subject — typically a portrait + 1–2 supporting scenes |
| dispatch | 1–3 | One scene — single dominant image with optional supporting frames |

Budget is enforced by `generate-edition-photos.js --type` (engine-sheet T9).

## Prerequisites

For edition (the only fully-supported type after S188 rebuild):
- `editions/cycle_pulse_edition_<XX>.txt` exists (compiled edition)
- `output/sift_proposals_c<XX>.json` exists (editorial weight signal — feeds DJ bundler)
- `output/world_summary_c<XX>.md` exists (atmospheric/neighborhood mood for DJ)
- Source uploaded to Drive (handled by `/write-edition` Step 6 for editions)
- Production log exists: `output/production_log_c<XX>.md` (consolidated per-cycle log; S195 convention)

For non-edition types (interview/supplemental/dispatch): **DJ-direction pipeline not wired yet (T11 pending).** Photo gen for these types is temporarily unsupported by this skill until T11 extends the bundler to read alternate-start artifacts. The PDF + Drive steps still work.

## Where This Sits

Runs after the authoring skill (`/write-edition`, `/interview`, `/dispatch`, or `/write-supplemental`). Parallel with `/post-publish`. Both run independently — print produces visual assets, post-publish handles ingest and feedback.

Full chains:
- Edition: `/write-edition` → `/edition-print --type edition` + `/post-publish --type edition`
- Non-edition: `/<authoring-skill>` → `/edition-print --type <type>` + `/post-publish --type <type>`

## Step 0: Production Log

Read the consolidated media production log: `output/production_log_c<XX>.md`. Append a `## Print Pipeline (<type>)` section:

```markdown
## Print Pipeline (<type>)
**Started:** {timestamp}
**Type:** <type>
**Source:** <path>
**Status:** IN PROGRESS

### Photos
[filled in at Step 1-2]

### PDF
[filled in at Step 3]

### Upload
[filled in at Step 4]
```

## Step 1: Art Direction + Photo Generation (DJ-direction pipeline, S188)

Three substeps. DJ Hartley directs (in-session subagent), FLUX executes (via Together AI).

### Step 1a: Bundle DJ inputs

```bash
node scripts/djDirect.js <cycle>
```

`djDirect.js` reads the compiled edition + `sift_proposals_c<XX>.json` (editorial weight) + `world_summary_c<XX>.md` (atmospheric mood), ranks proposals by sift score, pulls top-N article bodies (default 6), and writes a focused bundle to `output/photos/e<XX>/dj_input_bundle.md` (~50 KB). Engine audit JSON is intentionally excluded — not photo-relevant.

### Step 1b: Invoke DJ subagent (in this Claude Code session)

After djDirect.js prints its "next step" instructions:

1. Read the bundle: `output/photos/e<XX>/dj_input_bundle.md`
2. Invoke the Agent tool with `subagent_type="dj-hartley"`, passing the bundle as context
3. DJ produces a JSON array of 5-8 image specs (slug, thesis, mood, motifs, composition, credit, image_prompt with mandatory negative-frame paragraph)
4. Write the returned JSON array to: `output/photos/e<XX>/dj_direction.json`

DJ's four agent files at `.claude/agents/dj-hartley/{IDENTITY,LENS,RULES,SKILL}.md` are LOCKED (S175 canon-fidelity Wave A). The bundle's §INSTRUCTION FOR DJ block carries pipeline-level guidance (canon-allowed brands, jersey-number rules, storefront rules) that overlays DJ's locked persona without modifying it.

### Step 1c: Generate photos

```bash
node scripts/generate-edition-photos.js <cycle>
# OR chain QA + regen-on-fail in one pass:
node scripts/generate-edition-photos.js <cycle> --with-qa
```

Reads `dj_direction.json`, calls Together AI / FLUX.1.1-pro with each `image_prompt` verbatim (no synthesis), saves images + per-image sidecar JSONs (`{slug}.meta.json`) + manifest. With `--with-qa`, chains directly into Step 2.

Output: `output/photos/e<XX>/` (image PNGs + `{slug}.meta.json` sidecars + `manifest.json`).

## Step 2: Photo QA + Regen-on-Fail (T7 + T8)

Two flows depending on whether you used `--with-qa` in Step 1c.

### Chained (preferred): `--with-qa` already ran during Step 1c

QA verdicts and regen attempts already executed. Read the report:

- `output/photos/e<XX>/qa_report.json` — aggregate verdicts
- `output/photos/e<XX>/{slug}.qa.json` — per-image verdict + reasoning
- `output/photos/e<XX>/regen_log.md` — regen-on-fail trace

### Standalone QA on existing photos

```bash
node scripts/photoQA.js output/photos/e<XX>
# OR: re-QA + regen-on-fail without re-paying for generation
node scripts/generate-edition-photos.js <cycle> --qa-only
```

`photoQA.js` reads each `{slug}.meta.json`, sends image + DJ spec to Claude Haiku Vision, returns PASS / FLAG / FAIL per the canon-aware rubric (negative-frame compliance, positive-frame compliance, tier-fidelity, tone). Canon-allowed brands (A's branding, Fox Theater, Heinold's, OMCA, etc. per `docs/canon/INSTITUTIONS.md` §Arts, Culture & Landmarks) are recognized.

`--qa-only` re-runs QA + regen-on-fail against existing photos (useful after a rubric change without re-paying for generation).

**Regen-on-fail loop (T8):** Each FAIL verdict triggers one retry with the same prompt (FLUX nondeterminism). If the retry passes or flags → photo updated, sidecar marked `regenAttempt: 1`. If the retry still FAILs → marked `editorialFlag: true`, pipeline continues without halting. All attempts logged to `regen_log.md`.

## Step 3: PDF

```bash
node scripts/generate-edition-pdf.js <source> --type <type>
```

Generates tabloid-format PDF using the masthead block from the `.txt` header (already standardized via T1). Output to `output/pdfs/bay_tribune_<type>_c<XX>.pdf` (edition keeps legacy `output/pdfs/bay_tribune_e<XX>.pdf`).

## Step 4: Upload to Drive

```bash
node scripts/saveToDrive.js output/pdfs/bay_tribune_<type>_c<XX>.pdf <type>
```

Uploads PDF to Drive. Folder routing per `--type`: editions go to existing edition folder; interviews/supplementals/dispatches route to non-edition subfolder OR same folder with type-prefixed filename (engine-sheet T9 picks the implementation).

PDF only — photos remain local. (`saveToDrive.js` does not implement directory upload; see G-PR18 in print gap log.)

## Step 5: Dashboard Update

Edition path only — the dashboard uses the edition PDF for its UI:
- PDF available at `output/pdfs/bay_tribune_e<XX>.pdf` for dashboard to serve
- Edition card reflects current cycle

Non-edition types: skip. Dashboard surfaces editions, not alternate-start formats (yet).

## Step 6: Verify

**Two-pass verification — generator-side checks AND eval-side review. Both required before declaring complete.**

### Generator-side checks (mechanical)

Confirm all outputs exist:
- `output/photos/<type>_c<XX>/` — photos generated, count within budget
- `output/pdfs/bay_tribune_<type>_c<XX>.pdf` — PDF generated
- Drive upload confirmed
- Dashboard reflects current edition (edition only)

### Eval-side review (MANDATORY — G-PR9, S229)

**Open the rendered PDF.** Generator-side metrics are not eval-side review. The S212 LLM-generation-vs-evaluation asymmetry applies inside this skill too: the generator has no holistic quality compass. The eval pass is what catches what the generator can't see.

Visually verify three things:

1. **Headlines match the article table.** Every section's headline reads from the canonical `| Slot | Headline | Reporter | Section | Words |` block at the top of the edition .txt — NOT a lede-sentence extraction. EDITOR'S DESK gets its title from the article-table slot `ED` row. (G-PR7 — C94 PDF rendered all 6 article headlines as run-on lede sentences; the parser used lede extraction instead of article-table parsing.)

2. **Every approved photo is embedded at its correct section.** Photo count in HTML `<img>` tags MUST equal `Photos found: N (M dropped)` from manifest line minus dropped count. Section-name normalization (FRONT_PAGE vs FRONT PAGE) is a known parser failure mode — visually confirm FP1, FP2, civic, sports, culture, business, etc. each carry their generated photo. (G-PR6 — C94 PDF dropped FP1 silently to section-name mismatch.)

3. **Image execution reads on-canon.** Open each photo. Does it read as prosperity-era Oakland (dynasty A's, building city, working neighborhoods with dignity) or struggling-city Oakland (poverty-doc aesthetic, blight-as-texture, despair-as-mood)? `photoQA.js` v2.0+ catches tone-vs-canon mismatch at the CANON-TONE axis (5th axis, S229), but tone is a softer signal than NEGATIVE_FRAME — eyeball review remains load-bearing. If any photo reads as struggling-city tone, FLAG and drop. (G-PR8 — C94 Beverly Hayes spec passed declarative items but rendered as poverty signifier; canon contamination only caught at Mike's eyeball review.)

**Until the operator visually confirms all three, Step 6 is incomplete on generator metrics alone.** Generator emits "PDF exists, 580KB, 6 photos, exit code 0" — that tells you the script ran, not that the artifact is usable. Same anti-pattern as /post-publish G-P27 cited in the C94 run four hours before the print pipeline tripped it.

**Mags-discipline (MEMORY.md inline rule, S229):** never close a print/publish skill without opening the artifact.

Done. Print pipeline complete.

## Gap log (S212 — see [[../../docs/plans/GAP_LOG_TEMPLATE]])

At skill close, capture friction observed during the print pipeline as a gap log. /edition-print is a heavy skill at the **media generator terminal**; sidecar gap logs catch inefficiency the skill couldn't catch while running.

**Output path:** `output/production_log_edition_c<XX>_print_gaps.md` (sidecar to consolidated `output/production_log_c<XX>.md` per S195 convention).

**Gap prefix:** **G-PR\*** (e.g., G-PR1, G-PR8, G-PR10).

**Common categories for /edition-print gaps:**
- tier-1-autonomy-blockers (slug-convention mismatch, stale per-skill log filename, single-run-die issues)
- FLUX-canon-fidelity (text-suppression ceiling, regen-on-fail re-rolls same prompt, prompt-engineering tradeoffs)
- silent-defect-risk (PDF generator ignoring `editorialFlag`, manifest vs `qa_report.json` disagreement)
- doc-drift (slug case, word-band, output-path conventions vs script validators)
- process-design (no abort threshold, partial-success silence)

**Discipline:** write the gap log even on clean runs. File a ROLLOUT row in `pipeline.<n>` pointing at the gap log per ADR-0005 §How to add work. Cross-cycle pattern observations are the highest-leverage findings (~30% of gaps across media skills are doc-drift class — single reconciliation pass closes them).

## Changelog

- 2026-04-17 — Initial 6-step skill (S156).
- 2026-04-26 — v1.1 (S180, research-build). Type-aware: `--type {edition|interview|supplemental|dispatch}` flag added. Per-type photo budget table (1–3 for non-edition, 5–8 unchanged for edition). Triggerable from all four authoring skills. Plan [[plans/2026-04-26-non-edition-publishing-pipeline]] T4.
- 2026-04-29 — v1.2 (S188, research-build). Photo pipeline rebuild T5–T8 + T10 closed. Step 1 split into three substeps: `djDirect.js` (bundler) → `dj-hartley` subagent invocation in-session → `generate-edition-photos.js` (FLUX-direct, no internal synthesis). Step 2 documents `--with-qa` chain mode + `--qa-only` standalone QA + the regen-on-fail loop with editorial-flag marking. Prerequisites updated to require `sift_proposals_c<XX>.json` + `world_summary_c<XX>.md`. "Future (Phase 21.3)" note removed — it's current. Non-edition types (interview/supplemental/dispatch) flagged as T11-pending; DJ-direction pipeline doesn't reach them yet. Plan [[plans/2026-04-25-photo-pipeline-rebuild]].
- 2026-05-03 — v1.3 (S197, research-build). Wave 1 DOC-drift sweep per [[plans/2026-05-03-c93-gap-triage-execution]]. Closed G-PR1 (production log filename: `production_log_edition_c<XX>.md` → consolidated `production_log_c<XX>.md` per S195) + G-PR18 (Step 4 "Photos also upload" claim → "PDF only — photos remain local" since `saveToDrive.js` has no directory-upload code). DJ slug-convention G-PR8 + word-band G-PR9 fixes live in dj-hartley agent files (Task 1.2).
- 2026-05-11 — v1.3 verified (S215, research-build). Pipeline.18 sweep audit: G-PR6 (word-band drift between SKILL.md spec and observed working range) verified closed — SKILL.md no longer carries a `120-180 words` band number anywhere in the text; the band lives in `scripts/djDirect.js` INSTRUCTION FOR DJ block (100-220 validator constants, 140-180 working comfort) per S197 G-PR9 closure. No skill-text edit required; the drift surfaced in C93 (G-PR6 logged "logged; proceeding") was already resolved by the S197 work without explicit gap-log closure. Marking closed in §Status updates of `output/production_log_edition_c93_print_gaps.md`.
