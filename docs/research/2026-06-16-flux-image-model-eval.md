---
title: FLUX vs current text-to-image field — research
created: 2026-06-16
updated: 2026-06-16
type: reference
tags: [research, media, active]
sources:
  - "lib/photoGenerator.js:12 — live provider: Together AI, FLUX.1 schnell (free tier)"
  - "docs/RESEARCH.md §S197 — FLUX text-suppression ceiling (C93 evidence, prior entry)"
  - ".claude/agents/dj-hartley/RULES.md §Named-Subject Canon Appearance (S258, the shipped mitigation)"
  - "Artificial Analysis Text-to-Image leaderboard — artificialanalysis.ai/image/leaderboard/text-to-image (web, S263)"
  - "MindStudio: Ideogram 4 / Recraft 2 / GPT Image 2 comparison — mindstudio.ai/blog (web, S263)"
  - "Atlas Cloud + tooldirectory.ai 2026 model guides (web, S263)"
  - "ROLLOUT research.11 (text-suppression) + research.15 (attribute fidelity) — the two folded rows"
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — pending-state home (research.11 + research.15 → Watch List)"
  - "[[index]] — registered here, same commit"
  - "[[../SCHEMA]] — doc conventions"
---

# FLUX vs current text-to-image field — research

**Source:** The current text-to-image landscape (mid-2026), surveyed against GodWorld's two standing FLUX canon-fidelity ceilings. Live pipeline = `lib/photoGenerator.js` calling **Together AI / FLUX.1 schnell (free tier)**. Web survey S263 + the two prior in-house records (RESEARCH §S197 text-suppression; DJ RULES §Named-Subject Canon Appearance).

**What this addresses:** Operator directive C97 G-PR-C97-2 — FLUX forced a Black man onto canonically-white **Isley Kelley** across three generations; Mike asked to **scope a model swap, not execute one.** Folds the sibling text-suppression ceiling (research.11, C93: 4-of-6 photos leaked real/gibberish signage). Both are the same root failure: **FLUX treats hard constraints — a negative ("no text") or a positive attribute ("white, 60s") — as soft weights it deprioritizes under composition pressure.**

**What it does:** Surveyed the 2026 field (GPT Image 2/1.5, Ideogram 3/4, Imagen 4, Recraft V3, Nano Banana 2 / Gemini Flash Image, FLUX.2, SDXL) on the two axes that matter here — *named-subject attribute fidelity* and *text control* — plus API/provider reality and cost.

**Extraction — what's usable:**
- **The ceiling was measured on the WEAKEST FLUX variant → cheapest fix is a variant bump, not a swap.** The pipeline runs FLUX.1 **schnell** — the free, 4-step *distilled* model, the worst FLUX on prompt + negative-prompt adherence. The S197 entry assumed "FLUX 1.1 pro." So an unknown share of the "FLUX ceiling" is the *schnell distillation* ceiling. → cheapest experiment = run FLUX.1 **dev** or **1.1 pro** (or **FLUX.2**) on the *same* Together AI provider, a `options.model` config change, before evaluating any swap.
- **GPT Image 2 / 1.5 directly attacks the root cause → strongest swap candidate on BOTH axes.** Reviewers describe it as turning spatial/attribute instructions into "actual controls rather than suggestions the model might honor" — that *is* the FLUX failure described in inverse. Leads the Artificial Analysis text arena (Elo ~1340) and is rated best-in-class for complex multi-attribute instructions. → best single bet for the named-subject (Isley) ceiling AND text. → DJ named-subject canon-appearance front-loading.
- **Ideogram 3.0 = the text-control specialist (~90% text accuracy, dedicated text mechanism); Recraft V3 = long-form text.** Control over text rendering implies control over text *omission* → the suppression ceiling. → text-leak cases (mesa stadium walls, baylight signage).
- **Nano Banana 2 (Gemini Flash Image) ranks top-5 and Gemini CLI is already installed (gov.38 roster).** → a swap candidate with an in-stack access path, no new vendor.
- **Provider is swap-by-design** (`photoGenerator.js:13` — "Swap to fal.ai, Replicate, or OpenAI by changing the provider function"). → integration cost is a provider-function swap, not a pipeline rebuild.

**Not applicable / hazard:**
- **Cost flips from $0.** schnell is free; GPT Image / Ideogram / Imagen are paid per-image. A swap trades zero marginal cost for per-image cost — must be weighed against per-cycle photo volume (~5–8/edition). Not prohibitive, but no longer free.
- **The two-axis trap (S197, load-bearing).** Any candidate must clear BOTH text-suppression AND subject-fidelity. The C93 mesa case proved single-axis wins buy nothing (the text fix rendered the wrong player). Score both or don't score.
- **Don't attribute schnell's weakness to "FLUX."** Evaluating a swap without the variant-bump baseline first confounds "distilled free model" with "FLUX the architecture" — you could pay for a swap that a free config change would have matched.
- **GPT Image content moderation.** Stricter policy may refuse crime/OPD/disaster news scenes — a real photojournalism hazard for a city paper; test on a Darrin-Davis-class safety spec before trusting it.
- **Leaderboard ≠ our gauntlet.** Elo arenas score generic aesthetics, not named-canon-subject fidelity. The verdict here is landscape-level; only an in-fixture bake-off on our own specs is decisive.

**Verdict:** `watch`. The apparatus mitigations (DJ canon front-loading S258, djDirect composition rule S197, editorialFlag + 3-strike gate) already make the ceiling a *managed cost*, so nothing is on fire. But the schnell confound means there is real, cheap headroom unexploited.
- **Adopt-trigger (when image-fidelity bandwidth opens):** run a one-cycle bake-off on the standing fixture (mesa / baylight / transit_hub text cases + one named-subject case e.g. Isley Kelley), two axes each: **(a)** FLUX.1 dev/1.1 pro/FLUX.2 variant bump on Together AI (config-only baseline); **(b)** GPT Image 2 + Ideogram 3 on the same fixture. Outcomes route the rollout: variant bump clears it → *take-nothing on the swap*, just change `options.model`; a paid model clears what the bump can't → *adopt* with named cost-per-cycle; nothing clears both axes → FLUX ceiling is the field ceiling, double down on OCR-post-check + prompt-rewrite-on-retry (RESEARCH §S197 paths 1–2).

**Ignited plans:** none yet (watch — graduates to a `ready` row when the bake-off trigger fires).

---

## Applications (living)

- 2026-06-16 — Initial extraction (S263). Folds ROLLOUT research.11 + research.15 → Watch List.

---

## Changelog

- 2026-06-16 — Initial extraction (S263). Folded the two FLUX ceiling rows (text-suppression research.11 + attribute-fidelity research.15) into one source-mining record. Headline finding: live provider is FLUX.1 schnell (free distilled), not the 1.1 pro the S197 entry assumed — variant bump is the cheap untested baseline before any swap. Verdict watch.
