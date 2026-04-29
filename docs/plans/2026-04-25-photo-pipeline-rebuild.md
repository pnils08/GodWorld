---
title: Photo Pipeline Rebuild Plan
created: 2026-04-25
updated: 2026-04-25
type: plan
tags: [media, research, active]
sources:
  - docs/engine/ROLLOUT_PLAN.md §Edition Production (REBUILD entry, S170 + S172 confirmation)
  - docs/EDITION_PIPELINE.md §Post-Edition Add-Ons §/edition-print
  - .claude/skills/edition-print/SKILL.md §Step 1 (current note + "Phase 21.3 future state")
  - .claude/agents/dj-hartley/* (IDENTITY + LENS + RULES + SKILL — canon-fidelity Wave A pilot S174; S175 rollout-complete)
  - S170 Mike feedback (C92 photos) — "the photos should literally capture my world..." / "zero creativity and drags down the publication"
  - "Supermemory mags doc hzvGaG7nh7A8nszmLzzAtF — S176 context save, photo pipeline rebuild plan reasoning. Retrieve: curl -s 'https://api.supermemory.ai/v3/documents/hzvGaG7nh7A8nszmLzzAtF' -H 'Authorization: Bearer $SUPERMEMORY_CC_API_KEY'"
pointers:
  - "[[engine/ROLLOUT_PLAN]] — parent rollout"
  - "[[EDITION_PIPELINE]] — pipeline map"
  - "[[plans/2026-04-25-canon-fidelity-rollout]] — DJ four-file structure source (S174/S175)"
  - "[[SCHEMA]] — doc conventions"
  - "[[index]] — register here in same commit"
---

# Photo Pipeline Rebuild Plan

**Goal:** Restore `/edition-print` Step 1 to DJ-as-art-director with 5–8 storyline-tied prompts (120–180 words each) per journalism-skill output, killing the FLUX-defaults-to-blight pattern.

**Architecture:** Today, `generate-edition-photos.js` synthesizes its own one-line prompts from the first sentence of two section headers and hands them to FLUX; DJ's IDENTITY/LENS never enter the loop. The rebuild splits Step 1 into two: `djDirect.js` invokes `subagent_type=dj-hartley` with the full edition + engine audit + world summary, DJ produces 5–8 specs as JSON, then `generate-edition-photos.js` consumes that JSON and executes each prompt verbatim. `photoQA.js` returns real Haiku verdicts (currently ships template strings); a 1-retry regen loop runs on QA fail, then escalates to editorial. `/edition-print` already exists as a post-edition skill — this rebuild changes only its Step 1 internals and extends its trigger surface to all four journalism skills.

**Terminal:** research-build (builds + executes the photo pipeline). Per S188 scope correction, photo pipeline rebuild is research-build owned — media doesn't build.

**Pointers:**
- Parent rollout entry: [[engine/ROLLOUT_PLAN]] §Edition Production → REBUILD: Photo pipeline (HIGH)
- Pipeline map: [[EDITION_PIPELINE]] §Post-Edition Add-Ons
- DJ agent files (LOCKED — see Guardrail): `.claude/agents/dj-hartley/{IDENTITY,LENS,RULES,SKILL}.md`
- Canon-fidelity rollout (DJ source): [[plans/2026-04-25-canon-fidelity-rollout]]
- S170 feedback: `docs/mags-corliss/NEWSROOM_MEMORY.md` E92 entry

**Acceptance criteria:**
1. `djDirect.js` invokes `dj-hartley` subagent with edition + audit + summary; writes `output/photos/e{XX}/dj_direction.json` with 5–8 specs (thesis, mood, motifs, composition, 120–180-word image_prompt, photo credit assignment).
2. `generate-edition-photos.js` consumes `dj_direction.json`; no internal prompt synthesis remains.
3. `photoQA.js` returns real Haiku verdicts (no `[assessment]` literals); pass/flag/fail are real classifications.
4. Regen-on-fail: max 1 retry per photo; second QA fail → marked `editorial-flag`, pipeline continues.
5. `generate-edition-pdf.js` uses dynamic date; no hard-coded "October 2041" in output.
6. `/edition-print` triggers from `/write-edition`, `/write-supplemental`, `/dispatch`, AND `/interview`.
7. A/B test on E92 reprint: same DJ prompts via Together AI/FLUX dev and OpenAI gpt-image-1; comparison report + provider selection produced.

---

## Guardrail (read first)

**DJ Hartley's four agent files are LOCKED.** Files at `.claude/agents/dj-hartley/{IDENTITY,LENS,RULES,SKILL}.md` were finalized in the S174 canon-fidelity pilot and confirmed in S175 rollout completion. This plan does NOT modify those files. The rebuild wires the invocation pipeline AROUND DJ — it does not redesign him.

If a task appears to require editing DJ's agent files, stop and re-read this guardrail. Contract: pass DJ context, consume DJ output.

---

## Tasks

### Task 1: Audit `generate-edition-photos.js`

- **Files:** `scripts/generate-edition-photos.js` — read only
- **Steps:**
  1. Read entire script
  2. Document: input scan method, output count, prompt synthesis path, provider API shape
- **Verify:** can answer (a) input file path, (b) output count, (c) synthesis method, (d) provider call
- **Status:** [x] DONE S176
- **Findings:**
  - 211 lines. Reads compiled `.txt` via `lib/editionParser`. Section assignment via `lib/photoGenerator.assignPhotos` (auto mode) or `[Photo:]` tags (`--credits-only`).
  - Prompt synthesis: `photoGen.extractScene(text.substring(0,800), headline, beat, name)` → `photoGen.buildPhotoPrompt({headline, sceneDescription, neighborhood, weather, beat}, photographer)`. **DJ IDENTITY/LENS never read.** `photographer` arg is a credit-line label only (line 126).
  - Provider: `together / FLUX.1-schnell` (manifest line 188 — cheapest tier). Plan Task 6 specs FLUX dev; consider all three tiers in Task 12 A/B (schnell/dev/pro).
  - Output: `output/photos/e{XX}/` + `manifest.json`. Filename pattern: `{prefix}_{headline-slug}.jpg` (line 150).
  - Refactor target: remove `photoGen.extractScene` + `photoGen.buildPhotoPrompt` calls; replace with `dj_direction.json` consumer that calls provider with DJ's `image_prompt` verbatim.

### Task 2: Audit `photoQA.js`

- **Files:** `scripts/photoQA.js` — read only
- **Steps:**
  1. Read script
  2. Locate template-string bug (rollout entry: returns `[assessment]` / `[1 sentence]` literals)
  3. Assess rubric soundness — what does it ask Haiku to evaluate? Flag rubric issues separately from template bug
- **Verify:** root-cause line numbers for template bug; rubric soundness written down
- **Status:** [x] DONE S176
- **Findings:**
  - 242 lines. Uses Anthropic SDK with `claude-haiku-4-5-20251001`. Reads photos + `manifest.json`, evaluates one image at a time, writes `qa_report.json`.
  - **Template-string bug at lines 46–49.** Prompt instructs Haiku to fill bracketed placeholders (`MATCH: [1-2 sentence assessment]` etc.). Newer models sometimes copy the literal brackets instead of filling them. Fix: replace bracketed placeholders with directive language (`MATCH: write 1–2 sentences assessing whether the photo depicts a scene related to the article`) OR force structured JSON output via response shaping.
  - **Rubric weakness.** Rubric reads only `extractArticleSummary(photo.section)` (line 173). Never reads DJ's spec sidecar. So negative-frame violations ("no tents in frame" ignored by generator) cannot be caught as spec violations — only as general "AESTHETIC" failures. Task 7 should extend rubric to read DJ's `{slug}.meta.json` sidecar and check: (a) negative-frame compliance against DJ's NOT-list, (b) positive-frame elements DJ called for, (c) tier-fidelity (logos/brands/real faces).
  - Output verdict shape: `{verdict, match, tone, issues, summary, rawResponse, tokens}`. Task 7 should extend with `specCompliance: {negativeFramePass, positiveFramePass, tierViolations}`.

### Task 3: Audit `generate-edition-pdf.js`

- **Files:** `scripts/generate-edition-pdf.js` — read only
- **Steps:**
  1. Read script
  2. Locate hard-coded "October 2041"
  3. Pick replacement strategy
- **Verify:** line number + replacement strategy chosen
- **Status:** [x] DONE S176 (scope revised — see findings)
- **Findings:**
  - 626 lines. **No hardcoded "October 2041" in this script.** PDF masthead inherits `parsed.date` from `editionParser` (line 391–396), which extracts via regex from the compiled edition's first line.
  - Cross-edition check confirmed drift, not bug: E87 "August 2041", E88 "September 2041", E90/E91/E92 all "October 2041" — three editions stuck on October. Drift is in journalism-skill emission, not PDF.
  - `lib/editionParser.js:135` regex parses `(January|...|December)\s+\d{4}` — built to read whatever the edition file contains.
  - **Scope revision (Mike S176):** "we don't use months anymore we use cycles." The fix isn't in `generate-edition-pdf.js` AND isn't a date-mapping helper — it's removing month-year from masthead emission entirely. Cycle is canonical per `.claude/rules/newsroom.md`. See revised Task 9.

### Task 4: Lock DJ prompt template (worked example)

- **Files:**
  - `.claude/agents/dj-hartley/IDENTITY.md` — read only (LOCKED)
  - `.claude/agents/dj-hartley/LENS.md` — read only (LOCKED)
  - This plan — append §Worked Example
- **Steps:**
  1. Read DJ IDENTITY + LENS
  2. Pick one E92 storyline (Temescal Health Center site fence is the natural target) and write one 120–180-word DJ prompt in his voice — specific address, time, camera, light, what's in frame, what's explicitly NOT
  3. Append to §Worked Example below
- **Verify:** §Worked Example present; word count 120–180; reads in DJ's voice; explicit negative-frame instructions
- **Status:** [x] DONE S176 — see §Worked Example

### Task 5: Build `djDirect.js`

- **Files:** `scripts/djDirect.js` — create
- **Steps:**
  1. Read `editions/cycle_pulse_edition_{XX}.txt`, `output/engine_audit_c{XX}.json`, `output/world_summary_c{XX}.md`
  2. Invoke `subagent_type=dj-hartley` via Agent tool with the three inputs as context
  3. Pass instruction: "produce 5–8 image specs matching the shape in §Worked Example of `docs/plans/2026-04-25-photo-pipeline-rebuild.md`"
  4. DJ returns spec array; script writes `output/photos/e{XX}/dj_direction.json`
- **Verify:** `node scripts/djDirect.js 92` writes valid JSON with 5–8 specs meeting AC #1
- **Status:** [ ] not started

### Task 6: Refactor `generate-edition-photos.js`

- **Files:** `scripts/generate-edition-photos.js` — modify
- **Steps:**
  1. Remove all internal prompt synthesis logic
  2. Add: read `output/photos/e{XX}/dj_direction.json`
  3. For each spec: call provider (Together AI/FLUX dev as default — `TOGETHER_API_KEY` operational per Mike S176) with `image_prompt` verbatim
  4. Save image to `output/photos/e{XX}/{slug}.png` (slug from DJ spec)
  5. Write per-image metadata sidecar `{slug}.meta.json` (full spec + provider + cost + timestamp)
- **Verify:** `node scripts/generate-edition-photos.js 92` produces 5–8 images named after DJ slugs; sidecar JSONs present; no synthesis code remains
- **Status:** [ ] not started

### Task 7: Fix `photoQA.js`

- **Files:** `scripts/photoQA.js` — modify
- **Steps:**
  1. Apply template-string fix per Task 2 audit
  2. If rubric flagged: rebuild rubric to read DJ's spec sidecar and ask Haiku to verify against spec — specifically negative-frame constraints
  3. Output: per-image verdict `{slug}.qa.json` with pass/flag/fail + reasoning
- **Verify:** `node scripts/photoQA.js output/photos/e92` produces real verdicts; spot-check one fail + one pass
- **Status:** [ ] not started

### Task 8: Add regen-on-fail loop

- **Files:** `scripts/generate-edition-photos.js` — modify
- **Steps:**
  1. After photoQA runs, identify `fail` verdicts
  2. For each fail: regenerate via same provider + same prompt, max 1 retry
  3. Re-run photoQA on regen
  4. If still fails: mark `editorial-flag` in sidecar; continue (do not halt)
  5. Log all regen attempts to print pipeline production log
- **Verify:** simulate a fail; confirm 1 retry fires; second fail flagged + pipeline continues
- **Status:** [ ] not started

### Task 9: Drop month-year from masthead (cycles-only)

- **REVISED S176** per Mike: "we don't use months anymore we use cycles." Task 3 audit confirmed `generate-edition-pdf.js` has no hardcoded date — masthead month-year originates in journalism skills' compile output. Fix removes month-year from the masthead string entirely.
- **Files:** TBD audit — locate masthead emission across journalism skills
  - `.claude/skills/write-edition/SKILL.md` (or its compile step)
  - `.claude/skills/write-supplemental/SKILL.md`
  - `.claude/skills/dispatch/SKILL.md`
  - `.claude/skills/interview/SKILL.md`
  - Possibly `lib/editionParser.js:125-138` (date regex — vestigial after the change)
- **Steps:**
  1. Grep `.claude/skills/` for `Bay Tribune | ` masthead emission patterns + month-name strings
  2. Update each compile step to emit `Bay Tribune | Cycle {N} | {Season}` — drop "Month YYYY" portion
  3. Update `lib/editionParser.js` date-regex section to be a no-op or remove (PDF generator's `parsed.date` line will become empty; masthead-meta join handles missing date gracefully — confirm by re-reading PDF generator lines 393–397)
- **Verify:** generate any test edition; first line reads `Bay Tribune | Cycle {N} | {Season}` with no month-year token
- **Status:** [ ] not started

### Task 10: Update `/edition-print` SKILL.md

- **Files:** `.claude/skills/edition-print/SKILL.md` — modify §Step 1 + §Step 2
- **Steps:**
  1. Update §Step 1 to describe two-stage flow: `djDirect.js` first, then `generate-edition-photos.js`
  2. Update §Step 2 to describe regen-on-fail loop
  3. Remove "Future (Phase 21.3)" note — it's now current
- **Verify:** SKILL.md reflects implemented architecture; no stale "Future" reference
- **Status:** [ ] not started

### Task 11: Wire alternate-start convergence

- **Files:**
  - `.claude/skills/dispatch/SKILL.md` — modify
  - `.claude/skills/interview/SKILL.md` — modify
  - `.claude/skills/write-supplemental/SKILL.md` — modify
- **Steps:**
  1. Add a final step to each: "After publication, run `/edition-print {XX}` if output warrants visual assets"
  2. Document trigger condition (supplementals always; dispatch + interview at editorial discretion)
- **Verify:** all three skills have explicit `/edition-print` trigger language
- **Status:** [ ] not started

### Task 12: A/B test — Together AI vs OpenAI gpt-image-1

- **Files:** `scripts/photoProviderBakeoff.js` — create (one-shot test)
- **Steps:**
  1. Read `output/photos/e92/dj_direction.json` (after Task 5 re-run on E92)
  2. Generate each spec via Together AI/FLUX dev
  3. Generate each spec via OpenAI gpt-image-1
  4. Save both sets to `output/photos/e92_bakeoff/{flux,openai}/`
  5. Run `photoQA.js` against both; produce `output/photos/e92_bakeoff/comparison.md`
  6. Surface: cost per image, QA pass rate, negative-prompt adherence
- **Verify:** comparison report exists; provider winner identified
- **Status:** [ ] not started

### Task 13: Smoke test — E92 reprint

- **Files:** none modified; runs rebuilt pipeline end-to-end
- **Steps:**
  1. Delete `output/photos/e92/`
  2. Run `/edition-print 92`
  3. Verify all acceptance criteria green on real output
- **Verify:** all 7 acceptance criteria pass; Mike review of resulting photos vs original C92 set
- **Status:** [ ] not started

---

## Worked Example

Storyline: Temescal Community Health Center site fence (per DJ LENS §Hierarchy of Sight item 2 — "the home health aide on her break in front of the Temescal Health Center site fence, not the press conference about it").

```json
{
  "slug": "temescal_health_center_morning",
  "thesis": "The clinic-to-be at human scale. A worker on her break at the site fence — the people the building will serve, in front of the building being built for them.",
  "mood": "Working morning. Coffee-cup pause. Hopeful but unspoken — she's already doing the work the clinic will house.",
  "motifs": "site fence, planning sign, coffee cup, oaks across the street, soft overcast",
  "composition": "Mid-frame on the worker, fence behind her at slight angle, planning sign visible but not center-frame. 35mm equivalent. Eye level.",
  "credit": "Arman Gutiérrez / Bay Tribune",
  "image_prompt": "Telegraph Avenue at 47th Street, Temescal, Oakland, 8:15 AM, soft overcast Bay Area morning light. A 50-something Black home health aide in a navy scrub top holds a paper coffee cup in both hands, standing on the sidewalk in front of the chain-link construction fence enclosing the future Temescal Community Health Center site. Behind her: the green planning sign with architect's rendering, a portable construction office trailer, two cranes idle in the distance against pale gray sky. Across the street: oak trees softening the frame. She looks toward the fence — neither posed nor candid, a working person noticing the building that will house her work. Photojournalism, 35mm equivalent, eye-level. NOT in frame: tents, boarded storefronts, barred windows, broken glass, anyone in distress, decorative grit. NO text artifacts, NO logos, NO recognizable real-world brand identification. The neighborhood is alive — not abandoned, not gentrified, working."
}
```

**Word count:** 143 (within 120–180 ceiling).

**Pattern notes for Task 5 (djDirect.js prompt instruction to DJ subagent):**
- Specific cross-street + time-of-day → resists training-data Oakland-as-blight default
- Explicit subject (50-something home health aide, navy scrub top, coffee cup in both hands) → no generic-citizen fill
- Negative-frame paragraph at end → forces generator to skip blight-aesthetic priors (the C92 root cause)
- Tier-1 entity name (Temescal Community Health Center) used directly per [[canon/INSTITUTIONS]] §Health & Medical
- Camera language (35mm equivalent, eye-level) → tells the generator a photo, not a poster
- Credit assigned per LENS team rules (Arman = portraits)

DJ produces 5–8 of these per journalism skill output. Coverage spreads across: front-page lead storyline (1 hero shot), 2–3 secondary article scenes, 1–2 atmospheric Oakland frames (LENS §Vantage Points — Heinold's, ferry terminal, Coliseum tunnel, Lake Merritt pergola), 0–1 portrait if a citizen profile anchors the edition.

---

## Open questions

- [ ] Regen retry count default set at 1 per S176 Mike-deferred decision. After Task 12 A/B + Task 13 smoke test, may revise: if QA pass rate consistently below ~70%, bump to 2; otherwise hold at 1.

---

## Changelog

- 2026-04-25 — Initial draft (S176, research-build terminal). Drafted from ROLLOUT_PLAN §Edition Production REBUILD entry. Incorporates S176 Mike calls: TOGETHER_API_KEY operational; OpenAI gpt-image-1 evaluation deferred to A/B task; regen retry default 1 then editorial flag; DJ four-file canon-fidelity structure (S174/S175) LOCKED. 13 tasks, one open question.
- 2026-04-25 — Tasks 1–4 closed (S176, research-build terminal). Audits done for `generate-edition-photos.js`, `photoQA.js`, `generate-edition-pdf.js`. Task 3 surfaced scope revision: PDF script has no hardcoded date — masthead inherits from journalism-skill compile output. Per Mike "we don't use months anymore we use cycles," Task 9 revised from "fix PDF script" to "drop month-year from masthead emission across journalism skills." Task 4 §Worked Example written (Temescal Health Center site fence, 143 words, in DJ voice). Hand-off ready for media terminal at Task 5.
