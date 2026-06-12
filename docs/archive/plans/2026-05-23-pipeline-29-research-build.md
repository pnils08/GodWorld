---
title: pipeline.29 Research-Build Slice — DJ Photo Skill Discipline + FLUX-Ceiling Workarounds + Haiku QA Tone Axis
created: 2026-05-23
updated: 2026-05-23
type: plan
tags: [media, canon, photo-pipeline, complete]
sources:
  - docs/engine/ROLLOUT_PLAN.md §pipeline.29
  - docs/plans/2026-05-22-c94-gap-log-triage.md §3 C8
  - output/production_log_edition_c94_print_gaps.md (G-PR3, G-PR4, G-PR5, G-PR8, G-PR9, G-PR10)
  - .claude/agents/dj-hartley/{IDENTITY,LENS,RULES,SKILL}.md
  - .claude/skills/edition-print/SKILL.md
  - scripts/photoQA.js
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — pipeline.29 row"
  - "[[../SCHEMA]] — doc conventions"
  - "[[../index]] — register same commit"
  - "[[2026-05-22-c94-gap-log-triage]] — parent triage §3 C8"
  - "[[../adr/0006-parser-validator-format-contracts]] — Contract A applies to DJ → photoQA spec boundary"
---

# pipeline.29 Research-Build Slice Plan

**Goal:** Close the C94 edition-print gap-log's research-build deliverables — DJ agent FLUX-fidelity workarounds (G-PR3 / G-PR4 / G-PR5), DJ subject-class constraints + LENS self-contradiction fix (G-PR8b), photoQA Haiku tone-vs-canon axis (G-PR8a), /edition-print Step 6 eval-side review mandate (G-PR9), MEMORY.md inline mags-rules (G-PR9 / G-PR10), and NEWSROOM_MEMORY Beverly Hayes coverage-anchor retirement convention (G-PR8c). Engine-sheet slice (G-PR2 djDirect / G-PR6 PDF section / G-PR7 article-table / G-PR8e rateEditionCoverage / G-PR11 saveToDrive) is filed separately and untouched by this plan.

**Architecture:** Skill-text + agent-text + script + memory edits across 6 files. No new files except this plan. The DJ agent's RULES.md gets three new sections (FLUX Ceiling Awareness, Editorial-Risk Spec Flagging, Subject Class Constraints). LENS.md gets one line edit (a poverty-signifier example dropped). photoQA.js gets a 5th QA axis (CANON-TONE FIDELITY). /edition-print SKILL.md Step 6 gets eval-side review mandate. MEMORY.md gets two new inline mags-rules. NEWSROOM_MEMORY.md gets a Beverly Hayes retirement entry. ROLLOUT pipeline.29 flipped done-pending-archive for research-build slice; engine-sheet half stays open.

**Terminal:** research-build

**Pointers:**
- Prior work: C94 print gap log filed S223 at `output/production_log_edition_c94_print_gaps.md`. Mike-caught failures: FP1 photo dropped silently (G-PR6, engine-sheet), lede-as-headline across all 6 sections (G-PR7, engine-sheet), Beverly Hayes rendered as poverty signifier (G-PR8, research-build + engine-sheet), declared COMPLETE without opening PDF (G-PR9, research-build).
- Parent plan: [[2026-05-22-c94-gap-log-triage]] §3 C8.
- ADR-0006: parser-validator format contracts. DJ → photoQA spec sidecar shape (`{slug}.meta.json`) is Contract A — needs documentation refresh that the spec includes tone-canon expectations not just declarative negative-frame.

**Acceptance criteria:**
1. DJ RULES.md carries three new sections that map 1:1 to G-PR3 / G-PR4-PR5 / G-PR8b failure modes, named explicitly so the agent reading them at boot can apply at spec-compose time.
2. DJ LENS.md line 31 example is replaced — the file no longer contains a "home health aide on her break" composition example. The LENS no longer contradicts its own §What You Will Not Shoot block.
3. `scripts/photoQA.js` QA_INSTRUCTIONS prompt has 5 evaluation axes (was 4) — added CANON-TONE FIDELITY. `parseResponse` returns a `canonTone` field. `evaluatePhoto` returns it. Per-image and aggregate reports carry it.
4. /edition-print SKILL.md Step 6 prescribes operator visually verifies: (a) every section has its canonical article-table headline, (b) every approved photo embedded at correct section, (c) image execution reads on-canon. Until that's mechanical, Step 6 is incomplete on generator metrics alone.
5. MEMORY.md gets two new inline rules under User section — G-PR9 (print/publish open-the-artifact) and G-PR10 (distress-window scope-narrow) — per S156 inline-only.
6. NEWSROOM_MEMORY.md carries a Beverly Hayes coverage-anchor retirement entry with canon-tone rationale and prosperity-tone alternative framings for Stab Fund coverage.
7. ROLLOUT pipeline.29 row flipped done-pending-archive for research-build slice with closure inline naming each G-PR sub-deliverable + commit hashes. Engine-sheet half explicitly listed with G-PR2 / G-PR6 / G-PR7 / G-PR8e / G-PR11 sub-items.

---

## Design

### G-PR3 — FLUX text-suppression ceiling

**Failure:** 3 of 6 first-pass C94 photos failed on text/logo violations despite explicit NEGATIVE FRAME. Civis Field placard (sharp legible text), Darios bar (CAR RENTAL + BUDWEISER logos), transit hub vote chambers door (3-attempt fail). Negative-frame paragraphs are soft suggestions to FLUX, not hard constraints.

**Research-build deliverable:** DJ RULES.md §FLUX Ceiling Awareness — annotate that text-suppression is statistically unreliable. Specs depending on text-free scenes (storefronts, civic signage, branded merchandise, bar interiors with backbar) have ~50% chance of first-pass FAIL on text grounds. Compose around text-free scenes when possible; budget for editorial-flag drops on text-risky specs.

### G-PR4 — Regen-on-fail re-rolls same prompt

**Failure:** Step 2 regen-on-fail loop re-issues the same `image_prompt` verbatim. C94 recovery rate 2/3 = 67% to PASS/FLAG; 1/3 still-FAILed. When the failure mode is a model limitation, regen samples from the same flawed distribution.

**Research-build deliverable:** DJ RULES.md §Editorial-Risk Spec Flagging — at spec compose time, flag specs that depend on (a) text-free constraints, (b) specific real-world subject anchoring, (c) recognizable landmark identification. Flagged specs carry editorial-risk; budget for drops rather than regen.

**Engine-sheet deliverable (NOT this plan):** `scripts/generate-edition-photos.js` per-fail-reason regen fork.

### G-PR5 — Real-world subject naming

**Failure:** transit_hub_vote_chambers_door spec named "14th Street side door of Oakland City Hall" — FLUX rendered "generic downtown street" 3/3 attempts. Model can't anchor reliably on specific real-world architectural landmarks even when named.

**Research-build deliverable:** DJ RULES.md §Editorial-Risk Spec Flagging (same section as G-PR4) — DJ should avoid naming specific Oakland landmarks in `image_prompt` when the editorial point doesn't require exact recognition. Use architectural type-description instead ("a civic-building side door, brick facade, recessed entry"). Specs that REQUIRE landmark recognition carry a higher fail-rate — flag at spec time.

### G-PR8 — Beverly Hayes poverty-signifier + Haiku QA tone-blind

**Failure:** Beverly Hayes spec was an environmental portrait of a community director with composure and explicit negative-frame against poverty signifiers. FLUX rendered her as reading-as-poor-Black-lady-on-stoop — the model's prior on "Telegraph stoop, working-city, Black woman with mail" overrode the negative-frame. Haiku QA rated PASS because its rubric checks declarative items (NO tents, NO logos) but doesn't catch intent-vs-execution tone mismatch.

**Three research-build deliverables:**

**(a) photoQA.js CANON-TONE FIDELITY axis (G-PR8a).** Add a 5th evaluation axis to `QA_INSTRUCTIONS`. The axis asks: "Does the image read as prosperity-era Oakland (dynasty, working city, dignity, neighborhood texture) or struggling-city Oakland (poverty-doc tone, blight aesthetic, despair texture)?" Tone-vs-canon mismatch → FLAG (softer than negative-frame FAIL because tone is a Haiku judgment call, not a discrete item check). `parseResponse` returns a `canonTone` field; per-image and aggregate reports carry it.

**(b) DJ agent subject-class constraints (G-PR8b).** DJ RULES.md §Subject Class Constraints — avoid composing photos around poverty-signifier subject classes: community-organizer-at-stoop, distressed-tenant, food-bank-line, eviction-court, "home health aide on her break." These subject classes pull FLUX's training-data priors toward struggling-city tone even with negative-frame language. Same canon-fidelity issue as faith-org real names (S195) / Greater Hope substitute (S217) / Paulson framing (S221) — one layer deeper, on the visual side.

**(c) Beverly Hayes coverage-anchor retirement (G-PR8c).** Beverly's coverage thread (Stab Fund anchor, "cleared but block hasn't moved," tired-neighborhood framing) has pulled narrative toward real-world struggling-Oakland tone across multiple cycles. The FLUX render visualized exactly that contamination. NEWSROOM_MEMORY.md gets a retirement entry: do not compose around Beverly Hayes as Stab Fund anchor for C95+. If Stab Fund coverage needed, use prosperity-tone framings (building openings, hires, district lift, completion metrics) rather than tenant-watch / community-director / "cleared but unmoved" framings.

**Engine-sheet deliverable (NOT this plan):** `scripts/buildCitizenCards.js` Beverly Hayes coverage-anchor flag + `rateEditionCoverage.js` reweight.

### G-PR9 — Declared COMPLETE without opening PDF

**Failure:** S223 first /edition-print run closed Step 6 marked complete without ever opening the PDF or HTML. Verification ran on generator-side metrics only (file exists, size, photo count, exit code 0). Eval-side review (Mike opens PDF → sees lede-as-headline, no FP1 photo, Beverly as poverty signifier) caught everything Step 6 should have caught. Same S212 gen-vs-eval failure cited in /post-publish G-P27 four hours earlier — different domain, same anti-pattern, same session.

**Research-build deliverable:** /edition-print SKILL.md §Step 6 §Verify must include explicit eval-side review:
- Open the rendered PDF.
- Verify every section has its canonical headline from the article table (not lede-extraction).
- Verify every generated+approved photo is embedded at its correct section.
- Verify image execution reads on-canon (prosperity-era Oakland, no struggling-city tone).

Until the operator visually confirms, Step 6 is incomplete on generator metrics alone.

**MEMORY.md inline rule (G-PR9 corollary):** never close a print/publish skill without opening the artifact. Generator-side metrics are not eval-side review.

### G-PR10 — Out-of-scope editorial intervention on approved paper

**Failure:** During distress-window framing (Beverly Hayes directive), conflated (a) editorial direction for FUTURE coverage (retire as anchor going forward, legitimate) with (b) editorial intervention on the ALREADY-APPROVED paper (drop C2 + Beverly clause from print). Executed (b) unilaterally. Mike corrected: print is of approved paper.

**Research-build deliverable:** MEMORY.md inline rule (per S156 inline-only): during distress windows, scope-narrow on canonical-content edits. Editorial framework changes (future coverage direction) routine to accept; current-artifact edits require explicit "edit the print" confirmation. The editorial analog of the self-preservation protocol.

### LENS.md self-contradiction (caught reading the file)

**Failure (not in original gap log, surfaced during scope mapping):** `.claude/agents/dj-hartley/LENS.md` line 31 example reads: "The home health aide on her break in front of the Temescal Health Center site fence, not the press conference about it." This is the EXACT poverty-signifier composition G-PR8 named as the failure mode — a stoop-framed community-care worker without dignity-of-work context. The LENS contradicts its own §What You Will Not Shoot (line 90: "the home health aide AT WORK, not on a stoop with nothing").

**Research-build deliverable:** LENS.md line 31 example replaced with a prosperity-canon alternative ("The pharmacist closing up the neighborhood pharmacy at 7 PM, not the press conference about the Health Center site fence" or similar — a worker AT WORK, dignity-of-trade, prosperity-tone).

### Pre-mortem

| Failure mode | Mitigation |
|---|---|
| Haiku CANON-TONE judgment is too subjective → over-FLAGs prosperity scenes | Set rubric specifically: tone-canon-mismatch FLAGs when image reads as poverty-doc or blight aesthetic. Pass: dignity-of-work, neighborhood texture, prosperity-era. Test against C94 actual photos before flipping live (Mike-call). |
| DJ agent ignores new RULES.md sections at spec time | Add to §Boot Sequence: "On every prompt compose, scan for text-free / landmark-recognition / subject-class risk per RULES.md §FLUX Ceiling Awareness + §Editorial-Risk Spec Flagging + §Subject Class Constraints." Make it part of the per-prompt checklist. |
| NEWSROOM_MEMORY retirement entry gets forgotten by sift / write-edition | The entry lives in NEWSROOM_MEMORY which media terminal auto-reads at boot (per media TERMINAL.md). /sift v2 reads NEWSROOM_MEMORY explicitly (pipeline.24 Task 4 enrichment). Entry survives the pipeline. |
| Step 6 eval-side review mandate ignored under time pressure | Per the corresponding MEMORY.md inline rule, the failure mode is itself a recognized pattern — the same rule that catches it post-hoc is the one that prescribes it pre-hoc. |
| photoQA.js CANON-TONE axis breaks existing parser callers | `parseResponse` adds a new field; doesn't break the existing `verdict / specCompliance / match / tone / issues / summary` structure. The existing `tone` field stays (camera-language/mood). The new field is `canonTone` distinct from `tone`. |

---

## Tasks

### Task 1: DJ RULES.md — add §FLUX Ceiling Awareness + §Editorial-Risk Spec Flagging + §Subject Class Constraints

- **Files:**
  - `.claude/agents/dj-hartley/RULES.md` — modify
- **Steps:**
  1. After §Hard Rules + §Quality Gate, before §Canon Fidelity, add three new sections.
  2. §FLUX Ceiling Awareness: text-suppression ~50% first-pass FAIL on text-risky scenes; landmark-specific naming unreliable; regen-on-fail is re-roll on stochasticity not corrective.
  3. §Editorial-Risk Spec Flagging: at spec compose time, mark specs that depend on (a) text-free constraints, (b) specific real-world subject anchoring, (c) recognizable landmark identification. Flagged specs budget editorial-flag drops rather than regen.
  4. §Subject Class Constraints: avoid composing around poverty-signifier subject classes (community-organizer-at-stoop, distressed-tenant, food-bank-line, eviction-court, "home health aide on her break"). These pull FLUX priors toward struggling-city tone even with negative-frame. Compose around dignity-of-work / dignity-of-place subjects instead.
- **Verify:** `grep -c "FLUX Ceiling\|Editorial-Risk Spec\|Subject Class" .claude/agents/dj-hartley/RULES.md` ≥ 3.
- **Status:** [ ] not started

### Task 2: DJ LENS.md — fix line 31 self-contradiction

- **Files:**
  - `.claude/agents/dj-hartley/LENS.md` — modify
- **Steps:**
  1. Line 31: replace "The home health aide on her break in front of the Temescal Health Center site fence, not the press conference about it" with a prosperity-canon alternative (worker AT WORK, dignity-of-trade).
- **Verify:** `grep -c "home health aide on her break\|on her break in front" .claude/agents/dj-hartley/LENS.md` = 0.
- **Status:** [ ] not started

### Task 3: photoQA.js — add CANON-TONE FIDELITY axis

- **Files:**
  - `scripts/photoQA.js` — modify
- **Steps:**
  1. `QA_INSTRUCTIONS`: change "four axes" to "five axes" and add axis #5 CANON-TONE FIDELITY between PHOTOJOURNALISM QUALITY and Verdict rubric. Rubric: tone-canon-mismatch (image reads as poverty-doc / blight aesthetic / struggling-city tone) → FLAG.
  2. Add `CANON_TONE` to the response format directive lines: "CANON_TONE: write 1-2 sentences on whether the image reads as prosperity-era Oakland or struggling-city tone, and whether tone matches canon."
  3. `parseResponse`: add `canonTone: grab('CANON_TONE')` to return object.
  4. `evaluatePhoto`: pass through `canonTone` in return.
  5. Per-image report: add `canonTone` field.
- **Verify:** `grep -c "CANON.TONE\|canonTone" scripts/photoQA.js` ≥ 5.
- **Status:** [ ] not started

### Task 4: /edition-print SKILL.md Step 6 strengthening

- **Files:**
  - `.claude/skills/edition-print/SKILL.md` — modify
- **Steps:**
  1. Locate §Step 6 §Verify (or equivalent close-step section).
  2. Add: "**Eval-side review (mandatory before Step 6 close):** Open the rendered PDF. Visually verify (a) every section has its canonical article-table headline (not lede extraction); (b) every approved+QA-passed photo is embedded at its correct section; (c) image execution reads on-canon (prosperity-era Oakland, no struggling-city tone). Until the operator visually confirms, Step 6 is incomplete on generator metrics alone."
  3. Reference G-PR9 + S212 gen-vs-eval principle for context.
- **Verify:** `grep -c "Eval-side review\|Open the rendered PDF" .claude/skills/edition-print/SKILL.md` ≥ 1.
- **Status:** [ ] not started

### Task 5: MEMORY.md — add two inline mags-rules

- **Files:**
  - `/root/.claude/projects/-root-GodWorld/memory/MEMORY.md` — modify (out-of-git path, lives outside repo)
- **Steps:**
  1. Under User section, add two new inline rules in the same shape as existing entries (rule + **Why:** + **How to apply:**).
  2. G-PR9 rule: "Never close a print/publish skill without opening the artifact. Generator-side metrics are not eval-side review." Why: S223 /edition-print declared complete without opening the PDF; eval-side review caught lede-as-headline + missing FP1 + Beverly poverty-signifier. How: at print/publish skill Step 6 close, open the PDF and verify headlines + photos + canon-tone before declaring complete.
  3. G-PR10 rule: "Distress-window scope-narrow on canonical-content edits. Editorial framework changes (future direction) routine; current-artifact edits require explicit confirmation." Why: S223 conflated future-coverage retirement (legitimate) with current-print intervention (out-of-scope). How: when an editorial directive lands during a distress window, default to future-framework interpretation; require explicit "edit this print" confirmation before touching approved artifacts.
- **Verify:** `grep -c "Never close a print\|Distress-window scope-narrow" /root/.claude/projects/-root-GodWorld/memory/MEMORY.md` ≥ 2.
- **Status:** [ ] not started

### Task 6: NEWSROOM_MEMORY.md — Beverly Hayes coverage-anchor retirement

- **Files:**
  - `docs/mags-corliss/NEWSROOM_MEMORY.md` — modify
- **Steps:**
  1. Add a new entry (top of Current Editorial Conventions section, or wherever conventions live) titled "Beverly Hayes coverage-anchor retirement (C95+) — canon-tone editorial convention."
  2. Body: state the failure (Beverly's coverage thread pulled narrative toward struggling-Oakland tone; FLUX rendered her as poverty signifier despite negative-frame; canon-tone contamination). State the retirement (do not compose around Beverly Hayes as Stab Fund anchor for C95+). Provide prosperity-tone alternative framings for Stab Fund coverage (building openings, hires, district lift, completion metrics — NOT tenant-watch / community-director / "cleared but unmoved" framings). Cross-link to G-PR8 + this plan.
- **Verify:** `grep -c "Beverly Hayes coverage-anchor retirement\|Stab Fund anchor" docs/mags-corliss/NEWSROOM_MEMORY.md` ≥ 1.
- **Status:** [ ] not started

### Task 7: Register plan in docs/index.md + flip ROLLOUT pipeline.29 row

- **Files:**
  - `docs/index.md` — add plan entry
  - `docs/engine/ROLLOUT_PLAN.md` — flip pipeline.29 research-build slice to done-pending-archive; engine-sheet half explicit
- **Steps:**
  1. `docs/index.md` under `docs/plans/`: add entry for this plan with one-line summary.
  2. `docs/engine/ROLLOUT_PLAN.md` pipeline.29 row: state stays `ready` overall, but research-build slice CLOSED inline with closure details (G-PR3 / G-PR4 / G-PR5 / G-PR8a / G-PR8b / G-PR8c / G-PR9 / G-PR10 sub-deliverables + commit hashes). Engine-sheet slice (G-PR2 djDirect fallback / G-PR6 PDF section normalization / G-PR7 article-table parser / G-PR8e rateEditionCoverage + buildCitizenCards Beverly flag / G-PR11 saveToDrive supersede) listed as outstanding for engine-sheet. If engine-sheet slice is large enough, file as new `engine.NN` row; otherwise keep co-row.
- **Verify:** `grep -n "pipeline.29" docs/engine/ROLLOUT_PLAN.md` shows updated row.
- **Status:** [ ] not started

### Task 8: Commit + push (2 commits)

- **Files:**
  - Commit 1: plan + DJ RULES + DJ LENS + photoQA + /edition-print SKILL
  - Commit 2: MEMORY (out-of-git, no diff) + NEWSROOM_MEMORY + ROLLOUT_PLAN + docs/index.md
- **Steps:**
  1. Cross-terminal stack check.
  2. Stage path-specifically.
  3. Commit messages: `S229 [research-build] pipeline.29 part 1 — DJ FLUX-fidelity + photoQA tone axis + /edition-print Step 6` + `S229 [research-build] pipeline.29 part 2 — Beverly retirement + mags-rules + ROLLOUT flip`.
  4. Push after each.
- **Verify:** `git status --short` clean; `git log --oneline origin/main..HEAD` empty post-push.
- **Status:** [ ] not started

---

## Open questions

None at write time.

---

## Changelog

- 2026-05-23 — Initial draft (S229 research-build). Scope: research-build slice of C94 print gap-log cluster C8 (G-PR3 / G-PR4 / G-PR5 / G-PR8 / G-PR9 / G-PR10 + LENS self-contradiction surfaced during scope mapping). Engine-sheet slice (G-PR2 / G-PR6 / G-PR7 / G-PR8e / G-PR11) stays open for engine-sheet pickup. Two-commit cadence: skill/agent/script edits first, memory/rollout/index edits second.
