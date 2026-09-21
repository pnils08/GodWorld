---
title: Batch inference options — research
created: 2026-09-21
updated: 2026-09-21
type: reference
tags: [research, infrastructure, civic, cost, active]
sources:
  - https://platform.claude.com/docs/en/build-with-claude/batch-processing.md — Anthropic Message Batches API (fetched 2026-09-21)
  - https://platform.claude.com/docs/en/about-claude/pricing.md — model, cache and batch pricing (fetched 2026-09-21)
  - https://openrouter.ai/docs/batch-quickstart — OpenRouter Batch API (fetched 2026-09-21)
  - scripts/cron-civic-run.js:839-870 (callOpenRouter), :1320-1375 (FALLBACK_MODELS, modelChainFor, callVoice), :2600-2650 (datawake loop, max_tokens 1500)
  - scripts/cron-work-wake.js:205-229 (generateVoice, max_tokens 260)
  - Builder direction 2026-09-21 — the sim is heading to batch runs with a ~24h window; strong Claude models at batch price are of interest
pointers:
  - "[[../plans/2026-09-19-civic-wake-game-loop]] — Sunday realignment open question (stage machine, batch window)"
  - "[[../reference/CIVIC_GAME_LOOP]] — current civic shape"
  - "[[../engine/ROLLOUT_PLAN]] — pending-state home"
  - "[[index]] — registered same commit"
---

# Batch inference options — research

**Source:** Anthropic Message Batches API docs and pricing page; OpenRouter Batch API quickstart; the two civic scripts that call models today. All web facts fetched 2026-09-21; anything not on a fetched page is marked **not verified**.

**What this addresses:** The builder wants the civic wakes (and later the whole sim) to run on batch: same accuracy, a fraction of the cost, ~24 hours to complete, nothing landing the moment the engine runs. Question: is batch available where we already call models (OpenRouter), and if not, what does Anthropic offer for strong Claude models?

**What it does:** Both providers offer a submit-then-collect batch API at about half of standard per-token price with a 24-hour window. Anthropic's is native (`POST /v1/messages/batches`); OpenRouter's is a GA wrapper (`POST /v1/batches`) that routes to a provider's batch endpoint.

## Findings

**OpenRouter (verified from its quickstart)**
- Batch API exists and is GA: `POST /v1/batches`, `GET /v1/batches/:id`, list, delete. Bearer auth with the same `OPENROUTER_API_KEY` we already use.
- Request shape: `endpoint` (`/v1/chat/completions`, `/v1/responses`, `/v1/messages`, `/v1/embeddings`), `model`, and a `requests` array of `{custom_id, body}`. Only `completion_window: "24h"` is accepted. Results kept 30 days.
- "Typically billed at 50%" of the model's standard price. Anthropic is listed as supported and `/v1/messages` works with Claude models.
- Availability is **per model**: filter the models page by the batch variant; a model without a `:batch` endpoint returns 400.
- **Not verified:** whether the models we use today (deepseek-chat, kimi-k2, gemini-3.7-flash, llama-3.3-70b, qwen3-235b) or the Claude 5 models have a batch variant; max batch size; caching behavior. The models API (`/api/v1/models`) returned no pricing fields and no batch variants in my fetch, so this needs a check of the models page itself.

**Anthropic Message Batches (verified)**
- Discount: 50% on input and output. Batch price per MTok (input / output): Fable 5.1 $5 / $25; Opus 5 $2.50 / $12.50; Sonnet 5 $1 / $5; Haiku 4.5 $0.50 / $2.50. Standard: Fable 5.1 $10/$50, Opus 5 $5/$25, Sonnet 5 $2/$10, Haiku 4.5 $1/$5.
- Models: "All active models support the Message Batches API" (includes all four above).
- Window: most batches finish within 1 hour; results available when all done or at 24 hours, whichever first; requests not finished in 24h expire (not billed). Slow demand can mean more expiries.
- Limits: 100,000 requests or 256 MB per batch. Results kept 29 days. Batches are workspace-scoped. Batches may slightly overshoot the workspace spend limit.
- Requests: any Messages parameters except `stream`, `speed` (fast mode) and `max_tokens: 0`; `max_tokens` >= 1. Tools, thinking and system messages supported. Results return in any order, keyed by `custom_id`.
- Prompt caching stacks with batch (docs say the multipliers stack). Cache hits in a batch are best-effort; the docs recommend the 1-hour cache TTL since batches can exceed five minutes. Cache read is 0.1x base input (0.025x on Fable 5.1).
- Auth: an Anthropic API key (SDK default reads `ANTHROPIC_API_KEY`). **Not verified** whether that key exists in this environment; I did not read `.env`.
- Not available for Managed Agents sessions.
- From the bundled Claude API skill (not the docs page): the server-side `fallbacks` (refusal) parameter is rejected on the Batches API, so refusals arrive as `stop_reason: "refusal"` in the result and have to be handled by our own collect step.

## What a batch step replaces in the civic scripts (read locally)

- Today every wake is a synchronous call through `callOpenRouter` (`scripts/cron-civic-run.js:839`): a plain `https.request` to `openrouter.ai/api/v1/chat/completions`, 180s timeout, Bearer `OPENROUTER_API_KEY`. The datawake asks for `max_tokens` 1500 (`:2623`); the work-wake asks 260 (`scripts/cron-work-wake.js:205-229`, its own `fetch` to the same endpoint).
- Per-seat model comes from `scripts/civic-office-map.json`: deepseek/deepseek-chat 27 seats, gemini-3.7-flash 3, kimi-k2 2, llama-3.3-70b 2, qwen3-235b 1. `FALLBACK_MODELS = ['moonshotai/kimi-k2', 'deepseek/deepseek-chat']` (`:1320`); `modelChainFor` drops same-family fallbacks.
- The loop is built around **immediacy**: retry with backoff on a 429, fall back to the next provider, and a validity repair that re-prompts the same model with the rejection reason (two attempts). None of that maps onto a batch: a batch request is single-shot, there is no per-request 429, and a repair is a second submission with its own wait.
- What replaces it: a **submit** stage (build every seat's pack and prompt, one batch, store the batch id), a **collect** stage (poll status with no model, stream results by `custom_id`), then the existing deterministic validation, grounding and gate on each result. A rejected or expired result becomes a resubmit in the next window, not an inline retry.

## Cost estimate (arithmetic is estimate; prices are the cited ones)

Assumptions, all estimates: 11 wakes a day, Mon-Thu = 44 wakes a week. Input about 20,000 characters, about 5,000 tokens at 4 chars/token; the pricing page says Claude 4.7-and-later tokenizers produce about 30% more tokens, so I used 6,500. Output 400 tokens of terse JSON (current cap is 1,500). No caching, no retries, no thinking tokens counted.

| Model | Standard per wake | Batch per wake | Batch per week (44) | Batch per month (about 4.3 weeks) |
|---|---|---|---|---|
| Haiku 4.5 | $0.0085 | $0.0043 | $0.19 | $0.80 |
| Sonnet 5 | $0.0170 | $0.0085 | $0.37 | $1.60 |
| Opus 5 | $0.0425 | $0.0213 | $0.94 | $4.00 |
| Fable 5.1 | $0.0850 | $0.0425 | $1.87 | $8.00 |

The current mixed OpenRouter chain cost is **not verified**: the OpenRouter pages and models API I fetched did not return per-token prices for our models, so no like-for-like comparison is made. The datawake is only the small part of civic spend; the Sunday chain (about 18 voices and hearing) is not counted here.

**Caveat on the table:** Opus 5 runs adaptive thinking by default and Fable 5.1 always thinks; thinking tokens bill as output. A decisions-only job should set low effort (or, on Opus 5, disable thinking at `high` or below) or the output figure is too low. Fable 5.1 also rejects forced `tool_choice`.

## Extraction — what's usable

- Submit/collect stage machine → the Sunday realignment: cheap no-model polling advances stages when results exist; matches the "nothing needs to land at engine time" direction.
- Native Anthropic batch → strong reasoning on decision-only wakes at about Sonnet-5-batch price: 500-800 tokens of structured decision output per seat.
- Existing deterministic gates (grounding, number check, closed-move validation) stay untouched and run on the collected result.
- `custom_id` = seat + cycle → idempotent resubmit: a failed or expired seat is rebuilt from the same pack.
- 1-hour cache TTL on the shared persona prefix → the largest repeated input across the day's wakes.

**Not applicable / hazard:**
- The repair-then-fallback loop cannot be reproduced inline; the plan must decide what "retry" means across a 24-hour window.
- A batch that expires (24h, demand-driven) produces no output for a week's turn; the stage machine needs an explicit retry or skip rule.
- A model switch changes voice and error class (the current chain was tuned around specific models' failures, e.g. kimi-k2 returning empty content, qwen number-gate failures). Any move to Claude needs its own accuracy eval on the grounding gate, not an assumption.
- Fable 5.1 is not available under zero data retention unless authorized; Opus 5 and Sonnet 5 sit outside that limit.
- Batch spend can slightly exceed the workspace spend limit.
- OpenRouter batch coverage for our current non-Claude models is unknown; do not assume it.

**Verdict:** `adopt` — Anthropic's Message Batches API for the civic decision jobs, with Sonnet 5 as the first model to evaluate (Opus 5 as the step-up if the grounding gate needs it), because it is verified, native, all four current models support it, and the price gap versus standard is exactly half. OpenRouter's batch API is `watch`: it exists and is GA, but per-model batch availability for our current models is unverified. Adopt-trigger for OpenRouter: the models page lists a `:batch` endpoint for a model we want to keep.

**Ignited plans:** none yet. Next: fold submit/collect into the Sunday realignment design in [[../plans/2026-09-19-civic-wake-game-loop]]; run a small accuracy eval of Sonnet 5 on last week's civic packs before any cutover.

---

## Applications (living)

- 2026-09-21 — Cited by the civic Sunday-realignment design direction (batch, ~24h window).

---

## Changelog

- 2026-09-21 — Initial extraction (research-build fork).
