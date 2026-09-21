---
title: Which model does an in-world agent actually benefit from — test plan
created: 2026-09-21
updated: 2026-09-21
type: plan
tags: [research, civic, architecture, draft]
sources:
  - Builder direction 2026-09-21 — test whether a frontier model helps agents like Elias Varek (the sim's most powerful billionaire) or Mags (city media) versus current cheap models; builder adds Anthropic credit 2026-09-22
  - Builder observation 2026-09-21 — a stronger model tends to mean more reasoning, not better output; the prompt is what matters
  - docs/research/2026-09-21-batch-cost-and-model-variety.md — current spend (~$0.18/week civic), OpenRouter prices, failure evidence
pointers:
  - "[[plans/2026-09-21-civic-sunday-stage-machine]] — the model-per-seat ruling this test can revise"
  - "[[research/2026-09-21-batch-cost-and-model-variety]] — prices and provider facts"
  - "[[index]] — registered same commit"
---

# Which model does an in-world agent benefit from

**Goal:** Learn, with evidence, which model class each kind of in-world agent needs — so a seat gets a strong model only where it changes the output, and stays cheap where it does not.

**Hypothesis under test (builder):** for structured, prompt-driven jobs a stronger model adds reasoning tokens and cost but not better output; the prompt is the lever. Counter-hypothesis to give a fair chance: for open-ended character voices with wide latitude (Elias Varek, Mags) a frontier model may produce more distinct, more in-character, more surprising output that justifies its price.

**Terminal:** research-build designs and runs it; kimi/codex/agy help score. No production change comes from this plan; results feed the model-per-seat ruling.

**Status:** Draft, waiting on the builder's Anthropic credit (2026-09-22). Direct Anthropic is needed because the OpenRouter Claude `:batch` route was rejected on 2026-09-21; OpenRouter synchronous calls are the fallback and work today.

## Method — pre-registered so we do not tune the yardstick to the result

**Fixed inputs.** For each agent type below, freeze 3 real prompts/packs from stored C104–C108 material (same pack, same output contract). Only the model changes. No prompt tuning per model.

**Agents (three tiers of latitude):**
1. **Structured decision seat** — a council seat's datawake pack with the closed move set (tight contract, lots of validators).
2. **Semi-open voice** — a civic-desk reporter (Carmen Delaine) on a council story.
3. **Open character voice** — Elias Varek (`citizen-voice-elias-varek`) answering an interview prompt, and Mags's Saturday narration prompt.

**Models (each run with reasoning off AND on/default, so we separate "more reasoning" from "better output"):** the seat's current model (e.g. `deepseek/deepseek-chat`), Gemini flash tier, Sonnet 5, Opus 5, Fable 5.1. Direct Anthropic for the Claude rows; OpenRouter for the rest.

**Measures (computed before anyone reads outputs):**
- *Deterministic:* schema validity, grounding-gate pass rate, move validity against the closed set, character-cap compliance, finish reason, tokens in/out/reasoning, dollars.
- *Verbosity:* words per decision; whether the answer is decisions or prose (the civic requirement is terse).
- *Voice:* distinctiveness between agents (lexical overlap between two seats' outputs from the same model, a low-cost proxy), and consistency with the agent's frozen persona facts (a checklist of 5 facts per agent checked by script or rubric).
- *Blind judgement:* 12 outputs shuffled and unlabeled per tier, scored 1–5 by two scorers (agy and codex) plus, if the builder wishes, a 10-item blind read; scorers see no model names.

**Decision rule (written now):** a stronger model earns a seat only if it beats the current model by at least 1 point on blind score AND passes deterministic checks at least as often, at a cost the builder accepts. If reasoning-on does not beat reasoning-off on blind score, keep reasoning off. Ties go to the cheaper model.

**Cost:** roughly 3 tiers × 3 prompts × 5 models × 2 reasoning arms = 90 calls at a few thousand tokens each — on the order of a few dollars at most, dominated by Fable and Opus with reasoning on. Cap the run at $10 and stop early if a row is clearly dominated.

## Tasks

1. **Freeze inputs** — pick and store 9 packs/prompts under `output/model-fit/inputs/` (kimi lane or codex). Verify: each replays through its existing validators.
2. **Runner** — a scratch script that calls a model with a frozen input, records every measure above to `output/model-fit/runs.jsonl`. Reuses existing call shapes; not a production script. Verify: dry-run with one input and the current model.
3. **Run** — after credit lands; cap $10; log every call.
4. **Score** — deterministic first, then blind scoring by agy and codex (no model names).
5. **Report** — `docs/research/` file with the table, the decision rule applied, and a verdict per agent type: adopt / watch / take-nothing. Feed the model-per-seat ruling in the civic.39 plan.

## Open questions

- [ ] Builder: do you want to do a blind read too, and on which agents (Elias and Mags are the ones your judgement matters most for).
- [ ] Which real Elias Varek and Mags prompts to freeze (persona facts must come from the ledger, never from memory).
- [ ] Whether to include DeepSeek v4 and Kimi K3 as extra rows once their `:batch` prices are known.

## Changelog

- 2026-09-21 (research-build) — Draft filed from builder direction; waiting on credit.
